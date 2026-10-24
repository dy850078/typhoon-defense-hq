// 帳號：存在 data/accounts.json（不用資料庫），密碼用 scrypt 加鹽雜湊，不存明碼
// 每個帳號有一份 save：外觀、職業、等級、裝備、家具、邀請函（VIP Pass）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN_DAYS = 90; // 登入一次可以維持多久

function create(dataDir) {
  const file = path.join(dataDir, 'accounts.json');
  let db = { users: {}, tokens: {} };
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    db = { users: saved.users || {}, tokens: saved.tokens || {} };
  } catch (e) { /* 第一次啟動還沒有檔案 */ }

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

  return {
    register(username, password, data) {
      const bad = validName(username);
      if (bad) return { error: bad };
      if (String(password || '').length < 4) return { error: '密碼至少要 4 個字' };
      const k = key(username);
      if (db.users[k]) return { error: '這個帳號已經有人用了，換一個試試' };
      const salt = crypto.randomBytes(16).toString('hex');
      db.users[k] = { username: String(username).trim(), salt, hash: hashPw(password, salt), created: Date.now(), seen: Date.now(), save: data || {} };
      save();
      return { token: newToken(k), user: db.users[k] };
    },
    login(username, password) {
      const u = db.users[key(username)];
      if (!u || !checkPw(u, password)) return { error: '帳號或密碼不對' };
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
    list() {
      return Object.values(db.users).map(u => ({ username: u.username, name: (u.save && u.save.name) || '', cls: (u.save && u.save.cls) || 'staff',
        level: (u.save && u.save.level) || 1, vip: !!(u.save && u.save.vip), created: u.created, seen: u.seen }));
    },
    remove(username) {
      const k = key(username);
      if (!db.users[k]) return false;
      delete db.users[k];
      Object.keys(db.tokens).forEach(t => { if (db.tokens[t].user === k) delete db.tokens[t]; });
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
      Object.keys(db.tokens).forEach(t => { if (db.tokens[t].user === key(username)) delete db.tokens[t]; });
      save();
      return { ok: true };
    },
    flush,
  };
}

module.exports = { create };
