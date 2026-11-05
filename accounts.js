// 帳號：存在 data/accounts.json（不用資料庫），密碼用 scrypt 加鹽雜湊，不存明碼
// 每個帳號有一份 save：外觀、職業、等級、裝備、家具、邀請函（VIP Pass）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN_DAYS = 90; // 登入一次可以維持多久

const BACKUPS = 5; // 保留最近幾份備份

// 每次啟動先把帳號檔複製一份到 data/backups，存檔出問題時還能找回來
function backup(dataDir, file) {
  if (!fs.existsSync(file)) return;
  try {
    const dir = path.join(dataDir, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    fs.copyFileSync(file, path.join(dir, `accounts-${stamp}.json`));
    fs.readdirSync(dir).filter(f => /^accounts-.*\.json$/.test(f)).sort().reverse().slice(BACKUPS)
      .forEach(f => fs.unlinkSync(path.join(dir, f)));
  } catch (e) { console.error('帳號備份失敗', e.message); }
}

function create(dataDir) {
  const file = path.join(dataDir, 'accounts.json');
  let db = { users: {}, tokens: {}, mail: {} };
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    db = { users: saved.users || {}, tokens: saved.tokens || {}, mail: saved.mail || {} };
  } catch (e) { /* 第一次啟動還沒有檔案 */ }
  backup(dataDir, file);

  // 寫檔：先寫到暫存檔再改名，寫到一半當機也不會把整個檔案弄壞
  let timer = null;
  function flush() {
    clearTimeout(timer); timer = null;
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(file + '.tmp', JSON.stringify(db));
      fs.renameSync(file + '.tmp', file);
    } catch (e) { console.error('帳號存檔失敗', e.message); }
  }
  const save = () => { if (!timer) timer = setTimeout(flush, 1000); };

  const key = (username) => String(username || '').trim().toLowerCase();
  const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString('hex');
  function checkPw(u, pw) {
    const a = Buffer.from(hashPw(pw, u.salt), 'hex'), b = Buffer.from(u.hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  function newToken(k) {
    const t = crypto.randomBytes(24).toString('hex');
    db.tokens[t] = { user: k, until: Date.now() + TOKEN_DAYS * 86400000 };
    save();
    return t;
  }

  // 帳號名稱：2～20 個字，中英文、數字、底線、點、減號都可以
  function validName(username) {
    const u = String(username || '').trim();
    if (u.length < 2 || u.length > 20) return '帳號要 2～20 個字';
    if (!/^[\p{L}\p{N}_.-]+$/u.test(u)) return '帳號只能用中英文、數字、底線、點和減號';
    return '';
  }

  // Email：存小寫；同一個 email 只能綁一個帳號（忘記帳號時才找得回唯一的那個）
  const mailKey = (email) => String(email || '').trim().toLowerCase();
  function validEmail(email) {
    const e = mailKey(email);
    if (!e) return '請填 email';
    if (e.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'email 格式不對';
    return '';
  }
  const emailTaken = (e, except) => Object.entries(db.users).some(([k, u]) => k !== except && (u.email === e || u.emailNew === e));

  // 寄信用的一次性連結：只存雜湊，就算帳號檔外流也拿不到能用的連結
  const MAIL_TTL = { verify: 24 * 3600000, reset: 30 * 60000 };
  const sha = (t) => crypto.createHash('sha256').update(String(t || '')).digest('hex');
  function cleanMail() {
    const now = Date.now();
    Object.keys(db.mail).forEach(h => { if (db.mail[h].until < now || !db.users[db.mail[h].user]) delete db.mail[h]; });
  }
  function mailToken(k, kind, email) {
    cleanMail();
    // 同一種連結只留最新的一封，舊信裡的連結就失效
    Object.keys(db.mail).forEach(h => { if (db.mail[h].user === k && db.mail[h].kind === kind) delete db.mail[h]; });
    const t = crypto.randomBytes(24).toString('hex');
    db.mail[sha(t)] = { user: k, kind, email: email || '', until: Date.now() + MAIL_TTL[kind] };
    save();
    return t;
  }
  function takeMail(t, kind, keep) {
    const h = sha(t), m = db.mail[h];
    if (!m || m.kind !== kind || m.until < Date.now() || !db.users[m.user]) return null;
    if (!keep) { delete db.mail[h]; save(); }
    return m;
  }
  function killTokens(k) { Object.keys(db.tokens).forEach(t => { if (db.tokens[t].user === k) delete db.tokens[t]; }); }

  return {
    validEmail,
    register(username, password, data, email) {
      const bad = validName(username);
      if (bad) return { error: bad };
      if (String(password || '').length < 4) return { error: '密碼至少要 4 個字' };
      const badMail = validEmail(email);
      if (badMail) return { error: badMail };
      const k = key(username), e = mailKey(email);
      if (db.users[k]) return { error: '這個帳號已經有人用了，換一個試試' };
      if (emailTaken(e)) return { error: '這個 email 已經綁了別的帳號，忘記帳號的話可以用「忘記帳號或密碼？」找回來' };
      const salt = crypto.randomBytes(16).toString('hex');
      db.users[k] = { username: String(username).trim(), salt, hash: hashPw(password, salt), created: Date.now(), seen: Date.now(), save: data || {},
        email: e, emailOk: false };
      save();
      return { token: newToken(k), user: db.users[k], verify: mailToken(k, 'verify', e) };
    },
    // 新的 email 先放在 emailNew，點了驗證信才換掉原本的；還沒驗證過的就直接換
    setEmail(user, email) {
      const badMail = validEmail(email);
      if (badMail) return { error: badMail };
      const k = key(user.username), e = mailKey(email);
      if (emailTaken(e, k)) return { error: '這個 email 已經綁了別的帳號' };
      if (e === user.email && user.emailOk) { delete user.emailNew; save(); return { same: true }; }
      if (user.emailOk) user.emailNew = e; else { user.email = e; delete user.emailNew; }
      save();
      return { verify: mailToken(k, 'verify', e), email: e };
    },
    // 重寄驗證信：寄到還在等驗證的那個 email
    verifyAgain(user) {
      const e = user.emailNew || (!user.emailOk && user.email);
      if (!e) return { error: '沒有要驗證的 email' };
      return { verify: mailToken(key(user.username), 'verify', e), email: e };
    },
    verify(t) {
      const m = takeMail(t, 'verify');
      if (!m) return null;
      const u = db.users[m.user];
      if (emailTaken(m.email, m.user)) return null;
      u.email = m.email; u.emailOk = true; delete u.emailNew;
      save();
      return u;
    },
    // 忘記密碼：只寄給驗證過的 email
    resetToken(user) { return user.email && user.emailOk ? mailToken(key(user.username), 'reset') : ''; },
    checkReset(t) { const m = takeMail(t, 'reset', true); return m ? db.users[m.user] : null; },
    useReset(t, password) {
      if (String(password || '').length < 4) return { error: '密碼至少要 4 個字' };
      const m = takeMail(t, 'reset');
      if (!m) return { error: '這個連結已經用過或過期了，請重新申請一次' };
      const u = db.users[m.user];
      u.salt = crypto.randomBytes(16).toString('hex');
      u.hash = hashPw(password, u.salt);
      killTokens(m.user);
      u.seen = Date.now();
      save();
      return { token: newToken(m.user), user: u };
    },
    byEmail(email) {
      const e = mailKey(email);
      return e ? Object.values(db.users).find(u => u.email === e && u.emailOk) || null : null;
    },
    // 自己改密碼：要先輸入舊密碼；其他裝置會被登出，這台換一張新的登入憑證
    changePassword(user, oldPw, password) {
      if (!checkPw(user, oldPw)) return { error: '舊密碼不對' };
      if (String(password || '').length < 4) return { error: '新密碼至少要 4 個字' };
      const k = key(user.username);
      user.salt = crypto.randomBytes(16).toString('hex');
      user.hash = hashPw(password, user.salt);
      killTokens(k);
      save();
      return { token: newToken(k) };
    },
    checkPassword(user, pw) { return checkPw(user, pw); },
    // 願望有管理員回覆時要不要寄信（預設要，關掉才記 noWishMail）
    setWishMail(user, on) {
      if (on) delete user.noWishMail; else user.noWishMail = true;
      save();
    },
    // 管理員手動標成已驗證（例如寄信還沒設定好的時候）
    markVerified(username) {
      const u = db.users[key(username)];
      if (!u || !(u.emailNew || u.email)) return false;
      if (u.emailNew) { u.email = u.emailNew; delete u.emailNew; }
      u.emailOk = true;
      save();
      return true;
    },
    login(username, password) {
      const u = db.users[key(username)];
      if (!u) return { error: '帳號或密碼不對', why: '找不到這個帳號' };
      if (!checkPw(u, password)) return { error: '帳號或密碼不對', why: '密碼不對' };
      u.seen = Date.now();
      save();
      return { token: newToken(key(username)), user: u };
    },
    // 用登入憑證找帳號（過期的順便清掉）
    byToken(token) {
      const t = db.tokens[String(token || '')];
      if (!t) return null;
      if (t.until < Date.now() || !db.users[t.user]) { delete db.tokens[token]; save(); return null; }
      return db.users[t.user];
    },
    logout(token) { if (db.tokens[token]) { delete db.tokens[token]; save(); } },
    // 更新存檔：只覆蓋有給的欄位
    update(user, patch) {
      user.save = Object.assign({}, user.save, patch);
      user.seen = Date.now();
      save();
    },
    get(username) { return db.users[key(username)] || null; },
    list() {
      return Object.values(db.users).map(u => ({ username: u.username, name: (u.save && u.save.name) || '', cls: (u.save && u.save.cls) || 'staff',
        level: (u.save && u.save.level) || 1, vip: !!(u.save && u.save.vip), admin: !!u.admin, created: u.created, seen: u.seen,
        email: u.email || '', emailOk: !!u.emailOk, emailNew: u.emailNew || '' }));
    },
    // 管理員帳號：在許願池留言會標「管理員」，也能刪別人的留言（存在帳號上，不在 save 裡，玩家改不到）
    setAdmin(username, on) {
      const u = db.users[key(username)];
      if (!u) return { error: '找不到這個帳號' };
      if (on) u.admin = true; else delete u.admin;
      save();
      return { ok: true, admin: !!u.admin };
    },
    remove(username) {
      const k = key(username);
      if (!db.users[k]) return false;
      delete db.users[k];
      killTokens(k);
      cleanMail();
      save();
      return true;
    },
    setPassword(username, password) {
      const u = db.users[key(username)];
      if (!u) return { error: '找不到這個帳號' };
      if (String(password || '').length < 4) return { error: '密碼至少要 4 個字' };
      u.salt = crypto.randomBytes(16).toString('hex');
      u.hash = hashPw(password, u.salt);
      // 改密碼後，其他裝置的登入都要重新登入
      killTokens(key(username));
      save();
      return { ok: true };
    },
    flush,
  };
}

module.exports = { create };
