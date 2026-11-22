// 新世界測試頁的自動測試：自己開一個暫時的伺服器（資料寫在暫存資料夾），用無頭瀏覽器跑一遍
//
//   node scripts/nw-test.js            單人（電腦 1280x800）＋手機模擬（iPhone 13）＋雙人同時在線
//   node scripts/nw-test.js solo       只跑單人
//   node scripts/nw-test.js phone      只跑手機模擬
//   node scripts/nw-test.js multi      只跑雙人
//   node scripts/nw-test.js rider      只跑機器人騎士（兩個人，一個當騎士）
//   node scripts/nw-test.js classes    只跑召喚師、陵媒、表情
//   node scripts/nw-test.js live       只跑動作、長椅、徽章、點唱機、假人壓力測試
//   node scripts/nw-test.js lobby      只跑總部大廳（進門、出門、坐沙發、作戰角的高度、點唱機）
//   node scripts/nw-test.js stay       階段一第一批：封測名單、背包、裝備、熟練度徽章、寵物摸和餵、點歌
//   node scripts/nw-test.js home       只跑大廳的功能（導師轉職、扭蛋機、公共花園、種子箱、許願池、寵物）；加 GARDEN_SPEED=600 會連收成一起測
//   node scripts/nw-test.js combat     戰鬥和新職業（芽、學門、專精、每一招、技能書、選修欄）；combat-phone 是手機版面
//   node scripts/nw-test.js hotbar     快捷列和技能書（拖移換招、點選換招、按鍵提示、自訂按鍵）；hotbar-phone 是手機版面
//   node scripts/nw-test.js loot       掉落物（一份、點一下撿、進背包、會消失）、名字前的職業徽章
//   node scripts/nw-test.js puppet     操偶師的手、提線、謝幕（主要是拍圖）；fam 是三隻使魔排在一起拍一張
//   OUT=some/dir 可以指定截圖要放哪裡（預設是系統暫存資料夾）
//
// 需要 playwright（沒有列在 package.json，本機要跑的話先 npm i -D playwright && npx playwright install chromium）
// 無頭瀏覽器用軟體算 3D，每秒張數只有 20 上下，數字不能當真；效能要用實機看
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.NW_TEST_PORT) || 3457, B = 'http://localhost:' + PORT, PW = 'nw-test-pw';
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'nw-shots-'));
const want = process.argv[2] || 'all';
let failed = 0;
const ok = (cond, what) => { console.log((cond ? '  ok   ' : '  FAIL ') + what); if (!cond) failed++; };
const post = async (u, b, h = {}) => (await fetch(B + u, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(b) })).json();

async function main() {
  const { chromium, devices } = require('playwright');
  fs.mkdirSync(OUT, { recursive: true });
  // 場景程式是好幾個檔案接起來的，先確認接起來語法沒問題
  { const dir = path.join(__dirname, '..', 'newworld', 'world'), src = fs.readdirSync(dir).filter(n => /\.js$/.test(n)).sort().map(n => fs.readFileSync(path.join(dir, n), 'utf8')).join('');
    try { new (require('vm').Script)(src, { filename: 'newworld/world/*.js' }); } catch (e) { console.log('  FAIL 場景程式語法：' + e.message); process.exit(1); } }
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-data-'));
  const srv = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), ADMIN_PASSWORD: PW, DATA_DIR: data }, stdio: 'ignore' });
  const stop = () => { try { srv.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(data, { recursive: true, force: true, maxRetries: 5 }); } catch (e) {} };
  process.on('exit', stop);
  for (let i = 0; i < 50; i++) { try { await fetch(B + '/config'); break; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }

  const ad = await post('/api/admin/login', { password: PW });
  let seq = 0;
  const account = async (save, admin = true, give = null) => {
    const name = 'nwt' + (Date.now() % 100000) + (seq++);
    const reg = await post('/api/register', { username: name, password: 'pw123456', email: name + '@example.com', save });
    if (!reg.token) throw new Error('註冊失敗：' + JSON.stringify(reg));
    if (admin) await post('/api/admin/role', { username: name, admin: true }, { 'x-admin-token': ad.token });
    // 新世界的背包、裝備、寵物是 3D 自己的存檔，註冊帶不進去，用管理頁的補發接口放進去
    if (give) await post('/api/admin/newworld-give', { username: name, ...give }, { 'x-admin-token': ad.token });
    return { name, token: reg.token };
  };
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const open = async (acc, phone) => {
    const ctx = await browser.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage(); pg.errors = [];
    pg.on('pageerror', e => pg.errors.push(e.message));
    await pg.goto(B + '/'); await pg.evaluate(([t, u]) => { localStorage.setItem('hq-token', t); localStorage.setItem('hq-user', u); }, [acc.token, acc.name]);
    await pg.goto(B + '/newworld.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await pg.waitForFunction(() => document.getElementById('gate').hidden && document.body.dataset.look === '1', null, { timeout: 120000 });   // 等場景載完、帳號的造型也套上
    await pg.waitForTimeout(300); if (pg.errors.length) console.log('  頁面錯誤：' + pg.errors.join(' / '));
    await pg.waitForTimeout(3500); return pg;
  };
  const NW = (pg, fn, arg) => pg.evaluate(fn, arg);
  const zoomIn = (pg) => pg.evaluate(() => document.getElementById('b-zoom').click());   // 兩個分頁同時開時，後面的分頁畫面更新很慢，用一般的點擊會等不到
  const shot = (pg, name) => pg.screenshot({ path: path.join(OUT, name + '.png') });

  // ---- 單人：進場造型、點地面走路、換裝存檔 ----
  const solo = async (phone) => {
    const tag = phone ? 'phone' : 'solo'; console.log(tag);
    const acc = await account({ name: '測試員', hair: 'bob', skin: '#e2a983', hairColor: '#c9772f', outfit: '#4f7cc2', glasses: '0' });
    let pg = await open(acc, phone);
    const L = await NW(pg, () => HQ_NEWWORLD.look());
    ok(L && L.hair === 'bob' && L.hairCol === '#c9772f' && L.skinCol === '#e2a983' && L.topCol === '#4f7cc2' && L.glasses === false, '進場造型照帳號的角色');
    await shot(pg, tag + '-1-start');
    const p0 = await NW(pg, () => HQ_NEWWORLD.net.me());
    const vp = pg.viewportSize(), tx = vp.width * (phone ? 0.45 : 0.7), ty = vp.height * (phone ? 0.72 : 0.6);
    if (phone) await pg.touchscreen.tap(tx, ty); else await pg.mouse.click(tx, ty);
    await pg.waitForTimeout(2500);
    const p1 = await NW(pg, () => HQ_NEWWORLD.net.me());
    ok(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.3, '點地面會走過去');
    await shot(pg, tag + '-2-walk');
    // 碰撞：把人放在小屋南邊，往小屋走，不會走進去
    if (!phone) { await NW(pg, () => HQ_NEWWORLD.debugPlace(-10.5, 1)); await NW(pg, () => HQ_NEWWORLD.key('ArrowUp', true)); await pg.waitForTimeout(6000);
      await NW(pg, () => HQ_NEWWORLD.key('ArrowUp', false)); const pc = await NW(pg, () => HQ_NEWWORLD.net.me());
      const cs = Math.cos(-0.25), sn = Math.sin(-0.25), dx = pc.x + 11.96, dz = pc.z + 5.98, lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      ok(!(Math.abs(lx) < 3.45 + 0.3 && Math.abs(lz) < 2.645 + 0.3), '走不進小屋（停在 ' + pc.x + ', ' + pc.z + '）'); await shot(pg, tag + '-2b-wall'); }
    await pg.click('#b-dress'); await pg.waitForTimeout(300);
    await pg.click('#dress .row:nth-of-type(3) .opt:nth-of-type(3)'); await pg.waitForTimeout(1500);
    await shot(pg, tag + '-3-dress');
    await pg.context().close(); pg = await open(acc, phone);
    ok((await NW(pg, () => HQ_NEWWORLD.look().top)) === 'hoodie', '換裝重新整理後還在');
    const me = await (await fetch(B + '/api/me', { headers: { Authorization: 'Bearer ' + acc.token } })).json();
    ok(me.save && me.save.hair === 'bob' && me.save.outfit === '#4f7cc2', '總部的角色資料沒被改到');
    ok(pg.errors.length === 0, '沒有主控台錯誤' + (pg.errors.length ? '：' + pg.errors.join(' / ') : ''));
    console.log('  ' + (await pg.textContent('#stats')));
    await pg.context().close();
    // 載入：模型檔有壓縮、沒變的話第二次不用重新下載
    if (!phone) { const h = { Authorization: 'Bearer ' + acc.token, 'Accept-Encoding': 'gzip' }, http = require('http');
      const head = (extra) => new Promise(r => http.get(B + '/api/newworld/char.glb', { headers: { ...h, ...extra } }, (res) => { let n = 0; res.on('data', d => { n += d.length; }); res.on('end', () => r({ s: res.statusCode, h: res.headers, n })); }));
      const r1 = await head({}), r2 = await head({ 'If-None-Match': r1.h.etag });
      ok(r1.s === 200 && r1.h['content-encoding'] === 'gzip' && r1.n < +r1.h['x-size'] * 0.5, '模型檔有壓縮（' + (r1.h['x-size'] / 1048576).toFixed(2) + ' MB 變 ' + (r1.n / 1048576).toFixed(2) + ' MB）');
      ok(r2.s === 304 && r2.n === 0, '檔案沒變時第二次不用重新下載'); }
  };

  // ---- 雙人：互相看得到、移動和聊天同步、離線會消失、非管理員連不上 ----
  const multi = async () => {
    console.log('multi');
    const a = await account({ name: '小安', hair: 'short', glasses: '1' }), b = await account({ name: '阿寶', hair: 'buzz', glasses: '0' }), x = await account({ name: '路人' }, false);
    const pa = await open(a), pb = await open(b, true);
    const cnt = (p, n) => p.waitForFunction((k) => HQ_NEWWORLD.net.count() === k, n, { timeout: 30000 }).catch(() => {});
    await cnt(pa, 1); await cnt(pb, 1);
    ok((await NW(pa, () => HQ_NEWWORLD.net.count())) === 1 && (await NW(pb, () => HQ_NEWWORLD.net.count())) === 1, '兩邊都看得到對方');
    await pb.fill('#chat-in', '哈囉'); await pb.press('#chat-in', 'Enter'); await pa.waitForTimeout(1500);
    ok((await pa.textContent('#chat-log')).includes('阿寶：哈囉'), '聊天有傳到對方');
    await shot(pa, 'multi-1-desktop'); await shot(pb, 'multi-2-phone');
    ok(pa.errors.length + pb.errors.length === 0, '沒有主控台錯誤');
    const deny = await pa.evaluate((t) => new Promise(r => { const s = io('/newworld', { auth: { token: t } }); s.on('connect_error', () => { s.close(); r(true); }); s.on('connect', () => { s.close(); r(false); }); }), x.token);
    ok(deny, '非管理員連不上新世界頻道');
    const m1 = await NW(pa, () => HQ_NEWWORLD.mem());
    await pb.context().close(); await pa.waitForTimeout(2000);
    ok((await NW(pa, () => HQ_NEWWORLD.net.count())) === 0, '對方離線後人物消失');
    // 再進出三次，人物數、外框數、貼圖數都要回到只有自己時的數字（沒有越積越多）
    const m0 = await NW(pa, () => HQ_NEWWORLD.mem());
    for (let i = 0; i < 3; i++) { const p = await open(b, true); await cnt(pa, 1); await p.context().close(); await cnt(pa, 0); }
    const m2 = await NW(pa, () => HQ_NEWWORLD.mem());
    ok(m1.chars === m0.chars + 1 && m2.chars === m0.chars && m2.lines === m0.lines && m2.tex <= m0.tex && m2.geo <= m0.geo, '進出三次後記憶體用量沒有增加（' + JSON.stringify(m0) + ' → ' + JSON.stringify(m2) + '）');
    await pa.context().close();
  };

  // ---- 機器人騎士：騎士是自己的標準人物，別人看得到機器人跟著走、換隊形、揮手 ----
  const rider = async () => {
    console.log('rider');
    const a = await account({ name: '騎士', hair: 'bob', hairColor: '#c9772f', outfit: '#6baf7b', glasses: '1' }), b = await account({ name: '觀眾', hair: 'short' });
    const pa = await open(a), pb = await open(b);
    await pa.click('#b-ctrl'); await pa.waitForTimeout(2500);
    ok(await NW(pa, () => HQ_NEWWORLD.isRider()) && !(await pa.isHidden('#b-form')), '切成機器人騎士，隊形和揮手按鈕出現');
    await shot(pa, 'rider-1-carry');
    const p0 = await NW(pa, () => HQ_NEWWORLD.net.me());
    await NW(pa, () => HQ_NEWWORLD.key('d', true)); await pa.waitForTimeout(3000); await NW(pa, () => HQ_NEWWORLD.key('d', false));
    const p1 = await NW(pa, () => HQ_NEWWORLD.net.me());
    ok(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.5, '騎士操控機器人走路');
    await pb.waitForTimeout(2500); await shot(pb, 'rider-2-seen-by-other');
    await pb.waitForFunction(() => /繪製/.test(document.getElementById('stats').textContent), null, { timeout: 60000 }).catch(() => {});
    console.log('  機器人不投影子的小零件：' + (await NW(pa, () => HQ_NEWWORLD.mem().robotShadowCut)));
    console.log('  自己是騎士：' + (await pa.textContent('#stats')) + '　看別人當騎士：' + (await pb.textContent('#stats')));
    await pa.click('#b-form'); await pa.waitForTimeout(2500); await shot(pa, 'rider-3-float');
    await pa.click('#b-form'); await pa.waitForTimeout(2500); await shot(pa, 'rider-4-front');
    await pa.click('#b-gesture'); await pa.waitForTimeout(2200); await shot(pa, 'rider-5-gesture'); await shot(pb, 'rider-6-gesture-seen');
    for (let i = 0; i < 3; i++) await pa.click('#b-ctrl'); await pa.waitForTimeout(1500);
    ok(!(await NW(pa, () => HQ_NEWWORLD.isRider())) && (await pa.isHidden('#b-form')), '切回一般，機器人收起來');
    await shot(pa, 'rider-7-back-to-normal');
    ok(pa.errors.length + pb.errors.length === 0, '沒有主控台錯誤' + (pa.errors.concat(pb.errors).length ? '：' + pa.errors.concat(pb.errors).join(' / ') : ''));
    await pa.context().close(); await pb.context().close();
  };

  // ---- 召喚師、陵媒、表情：換職業換整套衣服，別人看得到；表情 5 秒後變回來 ----
  const classes = async () => {
    console.log('classes');
    const a = await account({ name: '小召', hair: 'long', hairColor: '#6b4a32', glasses: '0', face: 'cat' }), b = await account({ name: '阿陵', hair: 'hime', glasses: '1' });
    const pa = await open(a), pb = await open(b);
    await zoomIn(pa); await zoomIn(pb);   // 鏡頭拉近，截圖才看得清楚
    const vis = (p, n) => NW(p, (n) => { let v = false; const r = HQ_NEWWORLD.debugMe().getObjectByName(n); if (r) r.traverse(o => { if (o.isMesh && o.visible && !o.material.isMeshBasicMaterial) v = true; }); return v; }, n);
    ok((await NW(pa, () => HQ_NEWWORLD.look().hair)) === 'long' && (await NW(pa, () => HQ_NEWWORLD.look().face)) === 'cat', '總部的長髮和表情有帶過來');
    await pa.click('#b-ctrl'); await pa.click('#b-ctrl'); await pa.waitForTimeout(1500);
    ok((await NW(pa, () => HQ_NEWWORLD.look().cls)) === 'summoner' && (await vis(pa, 'Top_space')) && (await vis(pa, 'Acc_antenna')) && !(await vis(pa, 'Top_tee')), '召喚師：換上太空衣和觸角髮箍');
    ok((await NW(pa, () => HQ_NEWWORLD.mem().spirits)) === 1, '召喚師：召喚物出現');
    await NW(pa, () => HQ_NEWWORLD.key('d', true)); await pa.waitForTimeout(2500); await NW(pa, () => HQ_NEWWORLD.key('d', false)); await pa.waitForTimeout(1200);
    await shot(pa, 'class-1-summoner');
    for (let i = 0; i < 3; i++) await pb.click('#b-ctrl'); await pb.waitForTimeout(1500);
    ok((await NW(pb, () => HQ_NEWWORLD.look().cls)) === 'skater' && (await vis(pb, 'Top_qi')) && (await vis(pb, 'Acc_liangbatou')) && (await vis(pb, 'Acc_skates')), '陵媒：換上旗裝、大拉翅、冰刀');
    await NW(pb, () => HQ_NEWWORLD.key('a', true)); await pb.waitForTimeout(1800); await shot(pb, 'class-2-skater-moving'); await NW(pb, () => HQ_NEWWORLD.key('a', false));
    await pb.waitForTimeout(1500); await shot(pb, 'class-3-skater-sees-summoner');
    ok((await NW(pb, () => HQ_NEWWORLD.mem().spirits)) === 1, '別人看得到召喚師的召喚物');
    await pa.click('#b-emote'); await pa.click('#emotes button:nth-of-type(7)'); await pa.waitForTimeout(800);
    ok(await vis(pa, 'Face_love'), '表情：按了換成愛心眼'); await shot(pa, 'class-4-emote');
    await pa.waitForFunction(() => { const r = HQ_NEWWORLD.debugMe().getObjectByName('Face_love'); let v = false; r.traverse(o => { if (o.isMesh && o.visible) v = true; }); return !v; }, null, { timeout: 60000 }).catch(() => {});   // 模擬器跑得慢，等到變回來為止
    ok(!(await vis(pa, 'Face_love')) && (await vis(pa, 'Face_cat')), '表情：時間到變回平常的臉');
    await pa.click('#b-ctrl'); await pa.click('#b-ctrl'); await pa.waitForTimeout(1200);
    ok((await NW(pa, () => HQ_NEWWORLD.look().cls)) === null && (await NW(pa, () => HQ_NEWWORLD.mem().spirits)) === 0 && (await vis(pa, 'Top_tee')), '切回一般：穿回自己的上衣，召喚物收起來');
    ok(pa.errors.length + pb.errors.length === 0, '沒有主控台錯誤' + (pa.errors.concat(pb.errors).length ? '：' + pa.errors.concat(pb.errors).join(' / ') : ''));
    await pa.context().close(); await pb.context().close();
  };

  // ---- 動作、互動、徽章、點唱機、假人壓力測試 ----
  const live = async () => {
    console.log('live');
    const a = await account({ name: '小動', hair: 'airy', glasses: '0' }), b = await account({ name: '觀眾', hair: 'short' });
    const pa = await open(a), pb = await open(b);
    await zoomIn(pa); await zoomIn(pb);
    const cnt = (p, n) => p.waitForFunction((k) => HQ_NEWWORLD.net.count() === k, n, { timeout: 30000 }).catch(() => {});
    await cnt(pb, 1);
    // 跑步比走路快
    const run = async (on) => { const p0 = await NW(pa, () => HQ_NEWWORLD.net.me()); const t0 = await NW(pa, () => HQ_NEWWORLD.state.time);
      await NW(pa, () => HQ_NEWWORLD.key('d', true)); await pa.waitForFunction((t) => HQ_NEWWORLD.state.time > t + 1.2, t0, { timeout: 60000 }); const p1 = await NW(pa, () => HQ_NEWWORLD.net.me()), t1 = await NW(pa, () => HQ_NEWWORLD.state.time);
      await NW(pa, () => HQ_NEWWORLD.key('d', false)); return Math.hypot(p1.x - p0.x, p1.z - p0.z) / (t1 - t0); };
    const v1 = await run(); await pa.click('#b-act'); await pa.click('#acts [data-act=run]'); const v2 = await run();
    ok(v2 > v1 * 1.3, '跑步比走路快（' + v1.toFixed(1) + ' → ' + v2.toFixed(1) + '）');
    await pa.click('#acts [data-act=run]');
    // 走到長椅旁邊，紙條出現，坐下，別人看得到
    await NW(pa, () => HQ_NEWWORLD.debugPlace(-7.5 + 0.479 * -2.5 + 0.878 * 5.2, 9 + 0.878 * -2.5 - 0.479 * 5.2));
    await pa.waitForFunction(() => HQ_NEWWORLD.near() === 'bench', null, { timeout: 30000 }).catch(() => {});
    ok((await NW(pa, () => HQ_NEWWORLD.near())) === 'bench' && !(await pa.isHidden('.nw-hint')) && (await pa.textContent('.nw-hint')) === '坐下', '靠近長椅會冒出「坐下」紙條');
    await shot(pa, 'live-1-bench-hint');
    await pa.waitForFunction(() => HQ_NEWWORLD.hintMini(), null, { timeout: 30000 }).catch(() => {});
    ok((await NW(pa, () => HQ_NEWWORLD.hintMini())) && (await pa.textContent('.nw-hint')) === '坐下' && !!(await pa.$('.nw-hint.mini img')), '過 3 秒紙條縮成小圖示，還是點得到'); await shot(pa, 'live-1b-bench-mini');
    await pa.click('.nw-hint'); await pa.waitForFunction(() => HQ_NEWWORLD.acts().pose === 'sit' && HQ_NEWWORLD.hint() === '', null, { timeout: 30000 }).catch(() => {});
    ok((await NW(pa, () => HQ_NEWWORLD.acts().pose)) === 'sit' && (await NW(pa, () => HQ_NEWWORLD.net.me().p)) === 1 && (await NW(pa, () => HQ_NEWWORLD.hint())) === '', '點圖示就坐到長椅上，坐著的時候頭上沒有紙條（' + JSON.stringify(await NW(pa, () => [HQ_NEWWORLD.acts(), HQ_NEWWORLD.net.me(), HQ_NEWWORLD.near()])) + '）');
    await shot(pa, 'live-2-bench-sit');
    await pb.waitForFunction(() => { let p = 0; HQ_NEWWORLD.net.each((o) => { p = o.p; }); return p === 1; }, null, { timeout: 30000 }).catch(() => {});
    ok(await NW(pb, () => { let p = 0; HQ_NEWWORLD.net.each((o) => { p = o.p; }); return p === 1; }), '別人看得到坐下');
    await NW(pa, () => HQ_NEWWORLD.key('s', true)); await pa.waitForTimeout(1200); await NW(pa, () => HQ_NEWWORLD.key('s', false));
    ok((await NW(pa, () => HQ_NEWWORLD.acts().pose)) === null, '一走動就站起來');
    // 職業徽章
    for (let i = 0; i < 2; i++) await pa.click('#b-ctrl'); await pa.waitForTimeout(1200);
    ok(await pa.evaluate(() => { const i = document.querySelector('.nw-name img'); return !!i && !i.hidden && /^data:image/.test(i.src); }), '名字紙條上有職業徽章');
    await pb.waitForFunction(() => [...document.querySelectorAll('.nw-name img')].some(i => !i.hidden), null, { timeout: 30000 }).catch(() => {});
    ok(await pb.evaluate(() => [...document.querySelectorAll('.nw-name img')].some(i => !i.hidden)), '別人也看得到徽章');
    await shot(pb, 'live-3-badge');
    // 點唱機：總部沒有人點歌時會說一聲
    await NW(pa, () => { const j = HQ_NEWWORLD.lobby().juke; HQ_NEWWORLD.debugPlace(j.x, j.z + 1.6); }); await pa.waitForFunction(() => HQ_NEWWORLD.near() === 'juke', null, { timeout: 30000 }).catch(() => {});
    await pa.click('.nw-hint'); await pa.waitForFunction(() => !!document.getElementById('juke-now'), null, { timeout: 30000 }).catch(() => {});
    ok(/現在沒有歌/.test(await pa.textContent('#panel')) && !(await pa.evaluate(() => NW_MUSIC.state().on)), '點唱機：打開面板，沒有歌的時候會說一聲');
    await shot(pa, 'live-4-jukebox');
    // 假人：放 19 個進來，量張數
    await pa.click('#b-bots'); await pa.click('#b-bots'); await cnt(pa, 20);
    ok((await NW(pa, () => HQ_NEWWORLD.net.count())) === 20, '放 19 個假人進來（加上觀眾共 20 個別人）');
    await NW(pa, () => HQ_NEWWORLD.debugPlace(0, 14)); await pa.waitForFunction(() => HQ_NEWWORLD.zone() === 'yard', null, { timeout: 30000 }).catch(() => {}); await pa.waitForTimeout(8000);
    await pa.waitForFunction(() => /繪製/.test(document.getElementById('stats').textContent), null, { timeout: 60000 }).catch(() => {});
    console.log('  21 人同時在線（模擬器用軟體算圖，數字只能看繪製次數和面數）：' + (await pa.textContent('#stats')));
    await pb.context().close(); await pa.screenshot({ path: path.join(OUT, 'live-5-crowd.png'), timeout: 180000 }).catch(() => console.log('  （21 人的截圖太慢，跳過）'));
    await pa.click('#b-bots'); await cnt(pa, 0);
    ok((await NW(pa, () => HQ_NEWWORLD.net.count())) === 0, '假人收掉');
    ok(pa.errors.length + pb.errors.length === 0, '沒有主控台錯誤' + (pa.errors.concat(pb.errors).length ? '：' + pa.errors.concat(pb.errors).join(' / ') : ''));
    await pa.context().close();
  };

  // ---- 總部大廳：前院和室內是分開的兩區 ----
  const lobby = async () => {
    console.log('lobby');
    const a = await account({ name: '小廳', hair: 'bob', glasses: '0' }), b = await account({ name: '訪客', hair: 'short' });
    const pa = await open(a), pb = await open(b);
    const cnt = (p, n) => p.waitForFunction((k) => HQ_NEWWORLD.net.count() === k, n, { timeout: 30000 }).catch(() => {});
    const zone = (p, z) => p.waitForFunction((k) => HQ_NEWWORLD.zone() === k, z, { timeout: 30000 }).catch(() => {});
    const near = (p, k) => p.waitForFunction((v) => HQ_NEWWORLD.near() === v, k, { timeout: 30000 }).catch(() => {});
    const place = async (p, x, z) => { await NW(p, ([x, z]) => HQ_NEWWORLD.debugPlace(x, z), [x, z]); await p.waitForTimeout(700); };
    const L = await NW(pa, () => HQ_NEWWORLD.lobby()), OZ = -55;
    await cnt(pb, 1);
    // 前院：小樓的門口冒出「進大廳」
    await place(pa, -11.8, -1.6); await near(pa, 'door');
    ok((await pa.textContent('.nw-hint')) === '進大廳', '小樓門口冒出「進大廳」紙條');
    await shot(pa, 'lobby-0-yard-house');
    await pa.click('.nw-hint'); await zone(pa, 'lobby');
    const me0 = await NW(pa, () => HQ_NEWWORLD.net.me());
    ok((await NW(pa, () => HQ_NEWWORLD.zone())) === 'lobby' && Math.abs(me0.z - L.spawn.z) < 0.5, '點紙條就進到大廳門口');
    await pa.waitForTimeout(1200); await shot(pa, 'lobby-1-entry-far');
    // 還在前院的人看不到大廳裡的人；自己也進來就看得到
    await pb.waitForFunction(() => { let z = 0; HQ_NEWWORLD.net.each((o) => { z = o.tz; }); return z < -40; }, null, { timeout: 30000 }).catch(() => {}); await pb.waitForTimeout(800);
    ok(await NW(pb, () => { let v = true; HQ_NEWWORLD.net.each((o) => { v = o.c.H.visible || o.tag.t.style.display !== 'none' || o.tag.n.style.display !== 'none'; }); return v === false; }), '在前院的人看不到大廳裡的人和名字');
    await place(pb, L.spawn.x + 1.5, L.spawn.z); await zone(pb, 'lobby'); await pb.waitForTimeout(800);
    ok(await NW(pb, () => { let v = false; HQ_NEWWORLD.net.each((o) => { v = o.c.H.visible; }); return v; }), '兩個人都在大廳就互相看得到');
    // 往門外走會被擋住，不會掉出去
    await NW(pa, () => HQ_NEWWORLD.key('s', true)); await pa.waitForFunction((t) => HQ_NEWWORLD.state.time > t + 1.5, await NW(pa, () => HQ_NEWWORLD.state.time), { timeout: 60000 }).catch(() => {}); await NW(pa, () => HQ_NEWWORLD.key('s', false));
    const me1 = await NW(pa, () => HQ_NEWWORLD.net.me());
    ok((await NW(pa, () => HQ_NEWWORLD.zone())) === 'lobby' && me1.z <= OZ + 11.7 && me1.z > OZ + 11.3, '走到大廳邊緣會被擋住（z ' + me1.z + '）');
    // 沙發可以坐，別人看得到
    await zoomIn(pa); await place(pa, 1, OZ - 5.2); await near(pa, 'bench');
    await pa.click('.nw-hint'); await pa.waitForFunction(() => HQ_NEWWORLD.acts().pose === 'sit' && HQ_NEWWORLD.hint() === '', null, { timeout: 30000 }).catch(() => {});
    ok((await NW(pa, () => HQ_NEWWORLD.acts().pose)) === 'sit' && (await NW(pa, () => HQ_NEWWORLD.hint())) === '', '沙發可以坐，坐著沒有紙條（' + (await NW(pa, () => JSON.stringify([HQ_NEWWORLD.acts(), HQ_NEWWORLD.hint(), HQ_NEWWORLD.near()]))) + '）');
    await pb.waitForFunction(() => { let p = 0; HQ_NEWWORLD.net.each((o) => { p = o.p; }); return p === 1; }, null, { timeout: 30000 }).catch(() => {});
    ok(await NW(pb, () => { let p = 0; HQ_NEWWORLD.net.each((o) => { p = o.p; }); return p === 1; }), '別人看得到坐在沙發上');
    await place(pb, 3.2, OZ - 0.2); await pb.waitForTimeout(600);
    await shot(pa, 'lobby-2-living-sofa');
    // 吧台椅
    await NW(pa, () => HQ_NEWWORLD.act('sit')); await place(pa, -11.0, OZ - 6.75); await near(pa, 'bench'); await pa.click('.nw-hint'); await pa.waitForFunction(() => HQ_NEWWORLD.height() > 0.6, null, { timeout: 30000 }).catch(() => {});
    ok((await NW(pa, () => HQ_NEWWORLD.acts().pose)) === 'sit' && (await NW(pa, () => HQ_NEWWORLD.height())) > 0.6, '吧台椅可以坐，而且比沙發高（' + (await NW(pa, () => HQ_NEWWORLD.height())).toFixed(2) + '）');
    await shot(pa, 'lobby-3-kitchen-bar');
    await NW(pa, () => HQ_NEWWORLD.act('sit'));
    // 職業導師和扭蛋機那一角
    await place(pa, -6.6, OZ - 6.0); await shot(pa, 'lobby-4-mentor');
    await place(pa, -5.9, OZ + 4.4); await shot(pa, 'lobby-4b-gacha');
    // 作戰角高一階，樓梯在中間
    await place(pa, 11.5, OZ - 1.8); await pa.waitForFunction(() => HQ_NEWWORLD.height() > 0.3, null, { timeout: 30000 }).catch(() => {}); const hs = await NW(pa, () => HQ_NEWWORLD.height());
    await place(pa, 15.2, OZ - 5.0); await pa.waitForFunction(() => HQ_NEWWORLD.height() > 0.9, null, { timeout: 30000 }).catch(() => {}); const hp = await NW(pa, () => HQ_NEWWORLD.height());
    ok(hs > 0.3 && hs < 0.7 && Math.abs(hp - 1) < 0.02, '作戰角高一階、樓梯走到一半是半高（' + hs.toFixed(2) + '、' + hp.toFixed(2) + '）');
    await shot(pa, 'lobby-5-work-corner');
    // 平地上的人走不進高起來的平台側面
    await place(pa, 6.8, OZ - 6); await NW(pa, () => HQ_NEWWORLD.key('d', true)); await pa.waitForFunction((t) => HQ_NEWWORLD.state.time > t + 1.5, await NW(pa, () => HQ_NEWWORLD.state.time), { timeout: 60000 }).catch(() => {}); await NW(pa, () => HQ_NEWWORLD.key('d', false)); await pa.waitForTimeout(500);
    ok((await NW(pa, () => HQ_NEWWORLD.height())) < 0.05 && (await NW(pa, () => HQ_NEWWORLD.net.me().x)) < 8, '平台的側面有欄杆擋住，只能走樓梯上去');
    // 大長桌、陽台
    await place(pa, 10.5, OZ + 9.6); await shot(pa, 'lobby-6-long-table');
    await place(pa, 23.2, OZ + 5.2); await shot(pa, 'lobby-7-balcony');
    await place(pa, -15.0, OZ + 6.2); await shot(pa, 'lobby-8-gallery-wall');
    // 點唱機搬進客廳
    await place(pa, L.juke.x, L.juke.z + 1.6); await near(pa, 'juke');
    await pa.click('.nw-hint'); await pa.waitForFunction(() => !!document.getElementById('juke-now'), null, { timeout: 30000 }).catch(() => {});
    ok(!!(await pa.$('#juke-now')), '點唱機在客廳，點得到'); await NW(pa, () => window.NW_UI.close());
    await pa.waitForFunction(() => /繪製/.test(document.getElementById('stats').textContent), null, { timeout: 60000 }).catch(() => {});
    console.log('  大廳（模擬器用軟體算圖，只看繪製次數和面數）：' + (await pa.textContent('#stats')));
    // 在大廳切成機器人騎士：機器人進不來，會回到前院
    await NW(pa, () => HQ_NEWWORLD.setClass('rider')); await zone(pa, 'yard');
    ok((await NW(pa, () => HQ_NEWWORLD.zone())) === 'yard' && (await NW(pa, () => HQ_NEWWORLD.isRider())), '在大廳切成機器人騎士會回到前院');
    await NW(pa, () => HQ_NEWWORLD.setClass(''));
    // 前院往北走不到大廳那一塊
    await place(pa, 0, -34.5); await NW(pa, () => HQ_NEWWORLD.key('w', true)); await pa.waitForFunction((t) => HQ_NEWWORLD.state.time > t + 1.5, await NW(pa, () => HQ_NEWWORLD.state.time), { timeout: 60000 }).catch(() => {}); await NW(pa, () => HQ_NEWWORLD.key('w', false));
    const me2 = await NW(pa, () => HQ_NEWWORLD.net.me());
    ok((await NW(pa, () => HQ_NEWWORLD.zone())) === 'yard' && me2.z >= -36.5 && me2.z < -35.5, '前院往北走不進大廳（z ' + me2.z + '）');
    // 從大廳走出門回前院
    await place(pb, L.exit.x, L.exit.z - 0.8); await near(pb, 'exit');
    ok((await pb.textContent('.nw-hint')) === '到前院', '大廳門口冒出「到前院」紙條');
    await pb.click('.nw-hint'); await zone(pb, 'yard'); const mb = await NW(pb, () => HQ_NEWWORLD.net.me());
    ok((await NW(pb, () => HQ_NEWWORLD.zone())) === 'yard' && Math.hypot(mb.x + 11.8, mb.z + 1.6) < 1.5, '點紙條就回到小樓門口');
    ok(pa.errors.length + pb.errors.length === 0, '沒有主控台錯誤' + (pa.errors.concat(pb.errors).length ? '：' + pa.errors.concat(pb.errors).join(' / ') : ''));
    await pa.context().close(); await pb.context().close();
    // 手機直式看大廳
    const pp = await open(a, true); await place(pp, L.spawn.x, L.spawn.z); await zone(pp, 'lobby'); await pp.waitForTimeout(1500); await shot(pp, 'lobby-9-phone-entry');
    await zoomIn(pp); await place(pp, 1, OZ - 0.6); await pp.waitForTimeout(1200); await shot(pp, 'lobby-10-phone-living');
    ok(pp.errors.length === 0, '手機沒有主控台錯誤'); await pp.context().close();
  };

  // ---- 大廳第二、三期：導師轉職、扭蛋機、公共花園、種子箱、許願池、寵物（都是讀寫總部同一份資料）----
  const home = async () => {
    console.log('home');
    const a = await account({ name: '阿福', hair: 'bob' }, true, { inv: { gachaTicket: 3, seedTomato: 2, gemRuby: 1 }, pet: { kind: 'cat', name: '麻糬', fur: '#f0a456', pattern: 'mackerel', white: 'socks' } });
    const api = (name, body) => post('/api/newworld/' + name, body, { Authorization: 'Bearer ' + a.token });
    const pa = await open(a), OZ = -55;
    const near = (k) => pa.waitForFunction((v) => HQ_NEWWORLD.near() === v, k, { timeout: 30000 }).catch(() => {});
    const place = async (x, z) => { await NW(pa, ([x, z]) => HQ_NEWWORLD.debugPlace(x, z), [x, z]); await pa.waitForTimeout(900); };
    const panel = (k) => pa.waitForFunction((v) => { const p = document.getElementById('panel'); return !p.hidden && p.dataset.kind === v && !/讀取中/.test(p.textContent); }, k, { timeout: 30000 }).catch(() => {});
    const toast = () => pa.evaluate(() => (document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent));
    const S = await NW(pa, () => HQ_NEWWORLD.spots());
    await zoomIn(pa);
    // 寵物
    const pet = await NW(pa, () => HQ_NEWWORLD.pet());
    ok(pet && pet.name === '麻糬' && pet.kind === 'cat', '帳號的寵物跟在身邊（' + JSON.stringify(pet) + '）');
    await place(2.5, 12); await pa.waitForFunction(() => { const q = HQ_NEWWORLD.pet(); return Math.hypot(q.x - 2.5, q.z - 12) < 2.5; }, null, { timeout: 30000 }).catch(() => {}); const pet2 = await NW(pa, () => HQ_NEWWORLD.pet());
    ok(Math.hypot(pet2.x - 2.5, pet2.z - 12) < 2.5, '人換位置，寵物會跟上來'); await shot(pa, 'home-1-pet');
    // 前院的許願池
    await place(S.well.x - 0.4, S.well.z + 2.7); await near('well');
    ok((await pa.textContent('.nw-hint')) === '許個願' && !!(await pa.$('.nw-hint.art img')), '前院的許願池冒出手繪的「許個願」紙條'); await shot(pa, 'home-2-well');
    ok((await pa.locator('.nw-npc').count()) === 2, '只有人物（導師、希臘少女）有手繪名牌，東西沒有');
    await place(S.greek.x + 4, S.greek.z + 3); await pa.waitForTimeout(700);
    const vis = () => pa.evaluate(() => [...document.querySelectorAll('.nw-npc')].filter(e => e.style.display !== 'none' && e.style.opacity === '1').map(e => e.alt).sort().join(','));
    ok(/希臘少女/.test(await vis()), '走到五步內，名牌淡入（' + (await vis()) + '）'); await shot(pa, 'home-2a-tags-near');
    await place(S.greek.x + 12, S.greek.z + 9); await pa.waitForTimeout(700);
    ok((await vis()) === '', '走遠了名牌淡出');
    await place(S.greek.x + 0.3, S.greek.z + 1.3); await near('greek'); await shot(pa, 'home-2b-greek');
    ok((await pa.textContent('.nw-hint')) === '說話', '希臘少女旁邊冒出「說話」'); await pa.click('.nw-hint'); await panel('well');
    ok(/希臘少女：/.test(await toast()), '跟希臘少女說話，她講一句就打開許願池'); await NW(pa, () => window.NW_UI.close());
    await place(S.well.x - 0.4, S.well.z + 2.7); await near('well');
    await pa.click('.nw-hint'); await panel('well');
    ok(/還沒有人許願/.test(await pa.textContent('#panel')), '許願池面板打開，一開始是空的');
    await pa.click('#wish-add'); await pa.fill('#wish-title', '想要在大廳養魚'); await pa.click('#panel [data-cat="feature"]'); await pa.fill('#wish-body', '陽台的水缸可以放幾隻魚'); await pa.click('#wish-send');
    await pa.waitForFunction(() => /想要在大廳養魚/.test(document.getElementById('panel').textContent) && !!document.querySelector('#panel .wish'), null, { timeout: 30000 }).catch(() => {});
    ok(/想要在大廳養魚/.test(await pa.textContent('#panel')), '許了一個願，清單上看得到'); await shot(pa, 'home-3-well-list');
    await pa.click('#panel .wish'); await pa.waitForSelector('#wish-like', { timeout: 30000 }).catch(() => {}); await pa.click('#wish-like');
    await pa.waitForFunction(() => /收回讚（1）/.test(document.getElementById('panel').textContent), null, { timeout: 30000 }).catch(() => {});
    const wl = await api('wishes', { act: 'list' });
    ok(wl.ok && wl.items.length === 1 && wl.items[0].likes === 1 && wl.items[0].liked, '按讚有記到（跟總部同一個許願池）');
    // 職業導師
    await place(S.mentor.x, S.mentor.z + 0.4); await pa.waitForFunction(() => HQ_NEWWORLD.zone() === 'lobby', null, { timeout: 30000 }).catch(() => {}); await near('mentor');
    ok((await pa.textContent('.nw-hint')) === '轉職' && (await pa.isHidden('#panel')), '進大廳，走遠了許願池面板自己收起來；導師桌前冒出「轉職」');
    await pa.click('.nw-hint'); await pa.waitForSelector('#cb-book:not([hidden])', { timeout: 30000 }).catch(() => {}); await pa.waitForTimeout(600); await shot(pa, 'home-4-mentor');
    ok((await pa.locator('#cb-book .nd').count()) === 10 && (await pa.locator('#cb-book .nd.lock').count()) === 9, '導師開的是職業樹：芽、三個學門、六個專精，1 等只有芽是亮的（細節在 combat 那一輪測）');
    await pa.evaluate(() => window.NW_SK.close());
    // 扭蛋機
    await place(S.gacha.x, S.gacha.z + 0.9); await near('gacha');
    ok((await pa.textContent('.nw-hint')) === '扭蛋', '扭蛋機前冒出「扭蛋」');
    await pa.click('.nw-hint'); await panel('gacha');
    ok((await pa.getAttribute('#gacha-tickets', 'data-tickets')) === '3', '扭蛋機面板讀到帳號的 3 張扭蛋券');
    await pa.click('#gacha-spin'); await pa.waitForSelector('#panel .result', { timeout: 30000 }).catch(() => {}); await pa.waitForTimeout(500); await shot(pa, 'home-5-gacha');
    const g1 = await api('gacha', { act: 'state' });
    ok(g1.tickets === 2 && g1.pity === 1 || (g1.tickets === 2 && g1.pity === 0), '扭一次：券少一張、保底往前算（券 ' + g1.tickets + '、保底 ' + g1.pity + '）');
    ok(!!(await pa.$('#panel .result img')), '扭到的裝備有手繪圖示');
    await pa.click('#panel .acts button:nth-child(3)'); await pa.waitForFunction(() => document.getElementById('gacha-tickets').dataset.tickets === '5', null, { timeout: 30000 }).catch(() => {});
    ok((await api('gacha', { act: 'state' })).tickets === 5, '一顆寶石換三張券');
    // 陽台：種子箱和公共花園
    await place(S.seedbox.x - 1.1, S.seedbox.z - 0.6); await near('seedbox');
    ok((await pa.textContent('.nw-hint')) === '領種子', '種子箱冒出「領種子」'); await pa.click('.nw-hint');
    await pa.waitForFunction(() => /領到一包/.test(document.getElementById('toast').textContent), null, { timeout: 30000 }).catch(() => {});
    ok(/領到一包/.test(await toast()), '種子箱領到今天的種子'); await pa.waitForTimeout(400); await pa.click('.nw-hint'); await pa.waitForFunction(() => /今天已經領過了/.test(document.getElementById('toast').textContent), null, { timeout: 30000 }).catch(() => {});
    ok(/今天已經領過了/.test(await toast()), '一天只能領一次');
    const P0 = S.plots[0]; await place(P0.x - 1.0, P0.z - 0.1); await near('plot');
    ok((await pa.textContent('.nw-hint')) === '種東西', '空的花圃冒出「種東西」'); await pa.click('.nw-hint'); await panel('plot');
    await pa.click('#panel [data-seed="tomato"]'); await pa.waitForFunction(() => { const q = HQ_NEWWORLD.plots()[0]; return q && q.kind === 'tomato'; }, null, { timeout: 30000 }).catch(() => {});
    ok(((await NW(pa, () => HQ_NEWWORLD.plots()))[0] || {}).kind === 'tomato', '種下小番茄，花圃長出東西'); await pa.waitForTimeout(700); await shot(pa, 'home-6-garden-planted');
    if (process.env.GARDEN_SPEED) {   // 花園調快的時候順便測收成（GARDEN_SPEED=600 大約 6 秒就熟）
      await pa.waitForFunction(() => { const q = HQ_NEWWORLD.plots()[0]; return q && q.stage === 4; }, null, { timeout: 90000 }).catch(() => {});
      await pa.waitForFunction(() => HQ_NEWWORLD.hint() === '收成', null, { timeout: 30000 }).catch(() => {});
      ok((await NW(pa, () => HQ_NEWWORLD.hint())) === '收成', '熟了以後紙條變成「收成」'); await shot(pa, 'home-7-garden-ripe');
      await NW(pa, () => window.NW_UI.close()); await pa.click('.nw-hint'); await panel('plot'); await pa.waitForSelector('#plot-harvest', { timeout: 30000 }).catch(() => {}); await pa.click('#plot-harvest');
      await pa.waitForFunction(() => !HQ_NEWWORLD.plots()[0], null, { timeout: 30000 }).catch(() => {});
      ok(!(await NW(pa, () => HQ_NEWWORLD.plots()))[0] && /收成了 3 顆小番茄/.test(await toast()), '收成 3 顆小番茄，花圃空出來');
    }
    await place(22.6, OZ + 5); await pa.waitForTimeout(1200); await shot(pa, 'home-8-balcony');
    ok(pa.errors.length === 0, '沒有主控台錯誤' + (pa.errors.length ? '：' + pa.errors.join(' / ') : ''));
    await pa.context().close();
    const pp = await open(a, true); await NW(pp, ([x, z]) => HQ_NEWWORLD.debugPlace(x, z), [S.gacha.x, S.gacha.z + 0.9]); await pp.waitForFunction(() => HQ_NEWWORLD.near() === 'gacha', null, { timeout: 30000 }).catch(() => {});
    await pp.click('.nw-hint'); await pp.waitForFunction(() => !!document.getElementById('gacha-spin'), null, { timeout: 30000 }).catch(() => {}); await pp.waitForTimeout(800); await shot(pp, 'home-9-phone-gacha');
    ok(pp.errors.length === 0 && !!(await pp.$('#gacha-spin')), '手機也開得了扭蛋機面板'); await pp.context().close();
  };

  // ---- 階段一第一批：封測名單、背包、裝備、熟練度徽章、寵物摸和餵、點歌 ----
  const stay = async () => {
    console.log('stay');
    // 封測名單：不是管理員的帳號預設進不來，開放後才拿得到場景
    const b = await account({ name: '小測' }, false), hb = { Authorization: 'Bearer ' + b.token };
    const code = async () => (await fetch(B + '/api/newworld/world.js', { headers: hb })).status;
    ok((await code()) === 403, '不在封測名單的帳號拿不到新世界');
    const on = await post('/api/admin/newworld', { username: b.name, on: true }, { 'x-admin-token': ad.token });
    ok(on.ok && on.nw && (await code()) === 200, '管理頁開放之後就進得來');
    const list = await (await fetch(B + '/api/admin/accounts', { headers: { 'x-admin-token': ad.token } })).json().catch(() => null);
    const row = list && (list.accounts || list.list || list).find && (list.accounts || list.list || list).find(x => x.username === b.name);
    ok(!row || row.nw === true, '管理頁的帳號清單看得到封測狀態');
    await post('/api/admin/newworld', { username: b.name, on: false }, { 'x-admin-token': ad.token });
    ok((await code()) === 403, '收回之後又進不來');
    await post('/api/admin/newworld', { username: b.name, on: true }, { 'x-admin-token': ad.token });

    // 用封測帳號（不是管理員）開頁面
    const a = await account({ name: '阿福', hair: 'bob', level: 12, inv: { apple: 9 }, gear: { wzHat: 1 } }, false, { inv: { apple: 2, water: 3, gachaTicket: 1 }, gear: { mgDress: 1, mgBow: 2, mgWings: 1 }, pet: { kind: 'dog', name: '麻糬' } });
    await post('/api/admin/newworld', { username: a.name, on: true }, { 'x-admin-token': ad.token });
    const api = (name, body) => post('/api/newworld/' + name, body, { Authorization: 'Bearer ' + a.token });
    await api('look', { look: { hair: 'bob', top: 'tee', face: 'smile', hairCol: '#2b2a33', skinCol: '#fde6d4', topCol: '#ff7a2f', cls: 'summoner' } });
    const pa = await open(a);
    const panel = (k) => pa.waitForFunction((v) => { const p = document.getElementById('panel'); return !p.hidden && p.dataset.kind === v && !/讀取中/.test(p.textContent); }, k, { timeout: 30000 }).catch(() => {});
    const toast = () => pa.evaluate(() => (document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent));
    const place = async (x, z) => { await NW(pa, ([x, z]) => HQ_NEWWORLD.debugPlace(x, z), [x, z]); await pa.waitForTimeout(900); };
    await zoomIn(pa);
    ok(await pa.evaluate(() => document.getElementById('b-bots').hidden), '封測帳號看不到壓力測試按鈕');
    // 名字旁的徽章：新帳號的召喚師熟練度是 0 階（熟練度只能在總部打怪累積，測試帳號灌不進去）；階級變了徽章跟著換
    ok((await NW(pa, () => HQ_NEWWORLD.myTier())) === 0 && !!(await pa.$('.nw-name[data-tier="0"] img')), '名字旁的職業徽章用總部的熟練度徽章（新帳號 0 階）');
    const b0 = await pa.getAttribute('.nw-name[data-tier="0"] img', 'src'); await NW(pa, () => HQ_NEWWORLD.tier(4)); await pa.waitForTimeout(300);
    ok(!!(await pa.$('.nw-name[data-tier="4"] img')) && (await pa.getAttribute('.nw-name[data-tier="4"] img', 'src')) !== b0, '階級升上去，徽章換成那一階的外圈'); await shot(pa, 'stay-1-badge');
    // 背包
    await pa.click('#b-bag'); await panel('bag'); await pa.waitForTimeout(400); await shot(pa, 'stay-2-bag');
    ok(/等級 1$/.test((await pa.textContent('#bag-level')).trim()), '背包面板看得到等級，新世界從 1 等開始（總部的 12 等沒有帶過來）');
    ok(!!(await pa.$('#panel [data-item="apple"] img')) && /×2/.test(await pa.textContent('#panel [data-item="apple"]')), '補品那一頁有 2 顆蘋果，有手繪圖示');
    await pa.click('#panel [data-item="water"]'); await pa.click('#bag-trash'); await pa.waitForFunction(() => /×2/.test((document.querySelector('#panel [data-item="water"]') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
    ok((await api('bag', { act: 'state' })).items.find(x => x.k === 'water').n === 2, '丟掉一瓶水，帳號的背包少一瓶');
    // 裝備
    await pa.click('#panel [data-tab="gear"]'); await pa.waitForSelector('#panel [data-gear="mgDress"]'); await pa.waitForTimeout(300);
    ok((await pa.locator('#panel .grid [data-gear]').count()) === 3 && !!(await pa.$('#panel [data-gear="mgWings"] img')), '裝備那一頁有三件魔法少女裝備');
    ok((await pa.getAttribute('#panel .grid .cell', 'data-gear')) === 'mgWings', '稀有度高的排前面');
    await pa.click('#panel [data-gear="mgDress"]'); await pa.click('#gear-equip'); await pa.waitForFunction(() => (document.querySelector('#panel [data-slot="outfit"]') || { dataset: {} }).dataset.worn === 'mgDress', null, { timeout: 30000 }).catch(() => {});
    const st1 = await api('bag', { act: 'state' });
    ok(st1.equip.outfit === 'mgDress', '穿上蓬蓬裙，帳號記下來了');
    ok(!st1.gear.some(g => g.id === 'wzHat') && st1.items.find(x => x.k === 'apple').n === 2, '總部的裝備和補品沒有帶過來，是 3D 自己的一份');
    ok((await NW(pa, () => HQ_NEWWORLD.gearOn())) === 'mgDress,,,', '蓬蓬裙穿到 3D 身上了'); await pa.waitForTimeout(400); await shot(pa, 'stay-3-gear');
    const bad = await api('bag', { act: 'trash', kind: 'gear', k: 'mgDress' });
    ok(!bad.ok, '正在穿的最後一件不能丟（' + bad.error + '）');
    await new Promise(r => setTimeout(r, 300));
    ok(!(await api('bag', { act: 'equip', slot: 'head', id: 'mgDress' })).ok, '裝備不能穿到別的部位');
    await pa.click('#panel [data-slot="outfit"]'); await pa.click('#gear-equip'); await pa.waitForFunction(() => (document.querySelector('#panel [data-slot="outfit"]') || { dataset: {} }).dataset.worn === '', null, { timeout: 30000 }).catch(() => {});
    ok(!(await api('bag', { act: 'state' })).equip.outfit && (await NW(pa, () => HQ_NEWWORLD.gearOn())) === ',,,', '脫下來也記得，身上也換回來');
    // 寵物
    await pa.click('#b-pet'); await panel('pet');
    ok((await pa.getAttribute('#pet-bond', 'data-bond')) === '0', '寵物面板讀到感情值');
    await pa.click('#pet-pat'); await pa.waitForFunction(() => document.getElementById('pet-bond').dataset.bond === '1', null, { timeout: 30000 }).catch(() => {});
    ok(/感情 \+1/.test(await toast()), '摸一下感情 +1'); await pa.waitForTimeout(300); await shot(pa, 'stay-4-pet');
    await pa.click('#panel [data-food="apple"]'); await pa.waitForFunction(() => document.getElementById('pet-bond').dataset.bond === '5', null, { timeout: 30000 }).catch(() => {});
    const p1 = await api('pet', { act: 'state' });
    ok(p1.pet.bond === 5 && p1.foods.find(f => f.k === 'apple').n === 1 && p1.pet.feedLeft === 2, '餵一顆蘋果：感情 +4、蘋果少一顆、今天還能餵 2 次');
    for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 300)); await api('pet', { act: 'pat' }); }
    const p2 = await api('pet', { act: 'state' });
    ok(p2.pet.bond === 9 && p2.pet.patLeft === 0, '摸的感情一天最多加 5 次（感情 ' + p2.pet.bond + '）');
    await NW(pa, () => window.NW_UI.close());
    // 點唱機
    const j = await NW(pa, () => HQ_NEWWORLD.lobby().juke);
    await place(j.x, j.z + 1.6); await pa.waitForFunction(() => HQ_NEWWORLD.near() === 'juke', null, { timeout: 30000 }).catch(() => {});
    await pa.click('.nw-hint'); await panel('juke');
    ok(/現在沒有歌/.test(await pa.textContent('#juke-now')), '點唱機面板：還沒有歌');
    await pa.fill('#juke-q', 'https://youtu.be/dQw4w9WgXcQ'); await pa.click('#juke-go');
    await pa.waitForFunction(() => !/現在沒有歌/.test(document.getElementById('juke-now').textContent), null, { timeout: 30000 }).catch(() => {});
    const m1 = await api('music', { act: 'state' });
    ok(m1.now && m1.now.vid === 'dQw4w9WgXcQ' && m1.now.mine, '貼連結點歌，馬上開始放（' + (m1.now && m1.now.title) + '）');
    await new Promise(r => setTimeout(r, 300)); await api('music', { act: 'add', vid: 'https://www.youtube.com/watch?v=9bZkp7q19f0' });
    await pa.waitForFunction(() => document.querySelectorAll('#panel .song').length === 1, null, { timeout: 30000 }).catch(() => {}); await pa.waitForTimeout(300); await shot(pa, 'stay-5-jukebox');
    ok((await pa.locator('#panel .song').count()) === 1, '第二首排進歌單，面板自己更新');
    const m2 = await api('music', { act: 'remove', i: 0 });
    ok(m2.ok && m2.queue.length === 0, '可以拿掉自己點的歌');
    const m3 = await api('music', { act: 'skip' });
    ok(m3.ok && !m3.now, '可以切掉自己點的這首');
    ok(!(await api('music', { act: 'add', vid: '不是連結' })).ok, '亂貼的東西點不了歌');
    ok(pa.errors.length === 0, '沒有主控台錯誤' + (pa.errors.length ? '：' + pa.errors.join(' / ') : ''));
    await pa.context().close();
    // 手機
    const pp = await open(a, true); await pp.click('#b-bag'); await pp.waitForFunction(() => !!document.getElementById('bag-level'), null, { timeout: 30000 }).catch(() => {});
    await pp.click('#panel [data-tab="gear"]'); await pp.waitForTimeout(600); await shot(pp, 'stay-6-phone-gear');
    ok(pp.errors.length === 0 && (await pp.locator('#panel .grid [data-gear]').count()) === 3, '手機也開得了背包和裝備'); await pp.context().close();
  };

  // 戰鬥和新職業：等級血條、四顆技能鈕、技能書、選修欄、導師轉職、每個職業的招式都放一遍並截圖
  const combat = async (phone) => {
    console.log('combat' + (phone ? '（手機）' : ''));
    const C3 = require('../shared/classes3d.js');
    const pg = await open(await account({ name: '小芽' }), phone), tag = phone ? 'combat-phone-' : 'combat-';
    const shot = (n) => pg.screenshot({ path: path.join(OUT, tag + n + '.png') });
    const ask = (ev, arg) => pg.evaluate(([e, a]) => window.NW_SK.ask(e, a), [ev, arg]);
    const view = () => pg.evaluate(() => window.HQ_NEWWORLD.combat.view());
    const dbg = () => pg.evaluate(() => window.HQ_NEWWORLD.combat.debug());
    const hud = () => pg.evaluate(() => ({ name: document.querySelector('#cb-me b').textContent, sk: [...document.querySelectorAll('.cb-sk')].map(b => b.getAttribute('aria-label')), nums: document.querySelectorAll('.cb-num').length }));
    const rest = async () => { await pg.evaluate(() => window.HQ_NEWWORLD.debugPlace(8, 14)); await pg.waitForTimeout(400); await ask('cb:dbg', { lv: 60 }); };
    // 找一隻還活著、血最多的怪，站到牠旁邊並選牠
    let reach = 3.2;
    const aim = async (kind) => pg.evaluate(([k, reach]) => { const NW = window.HQ_NEWWORLD, m = NW.combat.debug().mobs.filter(x => (k ? x.kind === k && x.lv <= 30 : x.kind !== 'elder' && x.kind !== 'bloom') && !(x.fl & 256)).sort((a, b) => b.hp - a.hp)[0]; NW.debugPlace(m.x - reach, m.z + 1.5); NW.combat.setTarget(m.id); return m; }, [kind, reach]);
    await pg.waitForFunction(() => window.HQ_NEWWORLD.combat && window.HQ_NEWWORLD.combat.view(), null, { timeout: 20000 });
    let h = await hud();
    ok(h.name === 'Lv.1 芽' && h.sk.join() === '小火花,歪歪瞬移,空的,空的', '一進來是 1 等的芽，帶著兩招：' + h.name + ' / ' + h.sk);
    ok((await dbg()).mobs.length > 30, '練習場有怪');
    await zoomIn(pg);
    const m0 = await aim('moss'); await pg.waitForTimeout(2500); await shot('1-sprout');
    h = await hud(); ok(h.nums > 0, '選了怪會自動普攻，看得到傷害數字');
    await pg.locator('.cb-sk').nth(0).dispatchEvent('pointerdown'); await pg.waitForTimeout(450); await shot('2-spark');
    ok((await view()).cd.spark, '按技能鈕放得出小火花，進入冷卻');
    // 技能書、導師
    await pg.evaluate(() => window.NW_SK.openBook()); await pg.waitForTimeout(200); await shot('3-book-sprout');
    ok(await pg.locator('#cb-book .card.sk').count() === 2, '技能書裡有芽的兩招');
    await pg.evaluate(() => window.NW_SK.openClass()); await pg.waitForTimeout(200); await shot('4-mentor-lv1');
    ok(await pg.locator('#cb-book .nd.lock').count() === 9 && await pg.locator('#cb-book .det .go').count() === 0, '10 等以前三個學門都還不能選');
    const press = async (k) => { await pg.locator('#cb-book .nd[data-k="' + k + '"]').click(); await pg.waitForTimeout(150); await pg.locator('#cb-book .det .go').first().click(); await pg.waitForTimeout(150); await pg.locator('#cb-book .det .go.sure').click(); await pg.waitForTimeout(450); };
    await rest();
    for (const sk of Object.keys(C3.SCHOOLS).filter(k => !process.env.ONLY || process.env.ONLY === k)) {
      await pg.evaluate(() => window.NW_SK.openClass()); await pg.waitForTimeout(150);
      await press(sk);
      let v = await view(); ok(v.school === sk && !v.spec, '在導師那邊進學門：' + C3.SCHOOLS[sk].name);
      if (sk === 'pm') await shot('5-mentor-school');
      await pg.evaluate(() => window.NW_SK.close());
      for (const b of C3.SCHOOLS[sk].basics) { await aim(); await pg.waitForTimeout(500); const i = (await view()).slots.indexOf(b); await pg.locator('.cb-sk').nth(i).dispatchEvent('pointerdown'); await pg.waitForTimeout(550); await shot('6-' + sk + '-' + b); ok((await view()).cd[b], '見習生 ' + C3.SK[b].name); }
      await rest();
      for (const sp of C3.SCHOOLS[sk].specs.filter(x => !process.env.SPEC || process.env.SPEC === x)) {
        await ask('cb:dbg', { m: C3.GATE.mastery }); await pg.evaluate(() => window.NW_SK.openClass()); await pg.waitForTimeout(150);
        await press(sp);
        ok((await view()).quest, C3.SPECS[sp].name + '：接下三轉任務'); if (sp === 'skater') await shot('7-mentor-quest');
        ok(await pg.locator('#cb-quest:not([hidden]) .qi').count() === 5, '任務紙條列出五樣信物'); await ask('cb:dbg', { quest: 1 }); await pg.waitForTimeout(400); if (sp === 'skater') await shot('7-mentor-ready'); await press(sp);
        reach = sp === 'puppeteer' ? 6 : 3.2;
        v = await view(); ok(v.spec === sp, C3.SPECS[sp].name + '：信物收齊，轉職成功'); await pg.evaluate(() => window.NW_SK.close());
        const all = C3.learned(v).filter(k => k !== 'spark' && k !== 'blink');
        for (let i = 0; i < all.length; i += 4) { await rest(); const set = all.slice(i, i + 4); await ask('cb:slots', set); await pg.waitForTimeout(200);
          for (const k of set) { await aim(); await pg.waitForTimeout(700); const j = (await view()).slots.indexOf(k); await pg.locator('.cb-sk').nth(j).dispatchEvent('pointerdown');
            if (C3.SK[k].next) { await pg.waitForTimeout(350); ok((await hud()).sk[j] === C3.SK[k].next, '按鈕變成「' + C3.SK[k].next + '」'); if (k === 'string') { await pg.waitForTimeout(500); const d = await dbg(); ok(d.mobs.some(m => m.fl & 32) && d.threads >= 5, '被提線的怪身上有五條線，從兩隻手出去：' + d.threads); await shot('8-' + sp + '-' + k + '-hold'); } }   // 截圖很慢，先看按鈕再截
            if (k === 'curtain') { await pg.waitForTimeout(500); const d = await dbg(); ok(d.mobs.some(m => m.fl & 512) && d.threads >= 3, '謝幕：怪被線吊起來：' + d.threads); }
            await pg.waitForTimeout(C3.SK[k].ult ? 900 : 550); if (k !== 'string') await shot('8-' + sp + '-' + k);
            ok((await view()).cd[k], C3.SPECS[sp].name + ' ' + C3.SK[k].name);
            if (C3.SK[k].next) { if (k !== 'string') await shot('8-' + sp + '-' + k + '-hold'); await pg.locator('.cb-sk').nth(j).dispatchEvent('pointerdown'); await pg.waitForTimeout(300); await shot('8-' + sp + '-' + k + '2'); }
            if (C3.SK[k].ult) { await pg.waitForTimeout(1500); await shot('8-' + sp + '-' + k + '-b'); } } }
        await rest();
      }
    }
    if (process.env.ONLY) { ok(!pg.errors.length, '沒有頁面錯誤' + (pg.errors.length ? '：' + [...new Set(pg.errors)].slice(0, 3).join(' / ') : '')); await pg.context().close(); return; }
    // 選修欄
    await pg.evaluate(() => window.NW_SK.openBook()); await pg.waitForTimeout(200);
    const pick = async (sk, i) => { const r = pg.locator('#cb-book .card.sk[data-sk="' + sk + '"]'); await r.scrollIntoViewIfNeeded(); if (phone) await r.tap(); else await r.click(); await pg.waitForTimeout(150); if (phone) await pg.locator('.cb-sk').nth(i).tap(); else await pg.locator('.cb-sk').nth(i).click(); await pg.waitForTimeout(500); };
    await pick('potion', 3); await shot('9-book-elective');
    ok((await view()).slots[3] === 'potion', '第四格可以放別的學門的基礎招（選修）');
    await pick('bubble', 0);
    ok((await view()).slots[0] !== 'bubble', '選修的招不能放前三格');
    ok(!pg.errors.length, '沒有頁面錯誤' + (pg.errors.length ? '：' + pg.errors.join(' / ') : ''));
    await pg.context().close();
  };
  // 快捷列和技能書：拖移換招、點選換招、按鍵提示、自訂按鍵
  const hotbar = async (phone) => {
    console.log('hotbar' + (phone ? '（手機）' : ''));
    const acc = await account({ name: '小列' }), pg = await open(acc, phone), tag = phone ? 'hotbar-phone-' : 'hotbar-';
    const shot = (n) => pg.screenshot({ path: path.join(OUT, tag + n + '.png') });
    const ask = (ev, arg) => pg.evaluate(([e, a]) => window.NW_SK.ask(e, a), [ev, arg]);
    const view = () => pg.evaluate(() => window.HQ_NEWWORLD.combat.view());
    const box = async (sel, i) => { const l = pg.locator(sel).nth(i || 0); await l.scrollIntoViewIfNeeded(); const b = await l.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
    const dragTo = async (from, to) => { await pg.mouse.move(from.x, from.y); await pg.mouse.down(); await pg.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 }); await pg.mouse.move(to.x, to.y, { steps: 4 }); await pg.mouse.up(); await pg.waitForTimeout(450); };
    const touch = async (sel, i) => { const l = pg.locator(sel).nth(i || 0); await l.scrollIntoViewIfNeeded(); if (phone) await l.tap(); else await l.click(); await pg.waitForTimeout(350); };
    await pg.waitForFunction(() => window.HQ_NEWWORLD.combat && window.HQ_NEWWORLD.combat.view(), null, { timeout: 20000 });
    await ask('cb:dbg', { lv: 60 }); await ask('cb:school', 'pm'); await ask('cb:school', 'ae'); await pg.waitForTimeout(300);
    await shot('1-main');
    const kb = await pg.evaluate(() => [...document.querySelectorAll('.cb-sk kbd')].map(k => getComputedStyle(k).display === 'none' ? '' : k.textContent).join());
    ok(phone ? kb === ',,,' : kb === '1,2,3,4', phone ? '手機的快捷列不顯示按鍵' : '電腦的快捷列每格都寫著按鍵：' + kb);
    await pg.evaluate(() => window.NW_SK.openBook()); await pg.waitForTimeout(300); await shot('2-book');
    ok(await pg.locator('#cb-book .slots').count() === 0 && await pg.locator('#cb-skills.edit').count() === 1, '技能書只列招式，快捷列留在主畫面並進入編排');
    const hb = await pg.locator('#cb-skills').boundingBox(), bk = await pg.locator('#cb-book').boundingBox();
    ok(hb.y >= bk.y + bk.height || hb.x >= bk.x + bk.width || hb.x + hb.width <= bk.x, '技能書沒有蓋住快捷列');
    const before = (await view()).slots;
    if (!phone) {
      await ask('cb:slots', ['spark', 'blink', null, null]); await pg.waitForTimeout(300);
      await dragTo(await box('#cb-book .card.sk[data-sk="transmute"]'), await box('.cb-sk', 2)); ok((await view()).slots[2] === 'transmute', '把招式從技能書拖到快捷列第三格：' + (await view()).slots);
      await dragTo(await box('.cb-sk', 2), await box('.cb-sk', 0)); let v = await view(); ok(v.slots[0] === 'transmute' && v.slots[2] === 'spark', '快捷列的兩格互拖會交換：' + v.slots);
      await dragTo(await box('.cb-sk', 1), { x: 60, y: 300 }); ok((await view()).slots[1] === null, '把招式拖出快捷列就是拿掉');
      await dragTo(await box('#cb-book .card.sk[data-sk="potion"]'), await box('.cb-sk', 1)); ok((await view()).slots[1] !== 'potion', '選修的招拖不進前三格');
      await dragTo(await box('#cb-book .card.sk[data-sk="potion"]'), await box('.cb-sk', 3)); ok((await view()).slots[3] === 'potion', '選修的招可以拖進最後一格'); await shot('3-dragged');
    } else ok(before.length === 4, '手機不用拖的');
    await touch('#cb-book .card.sk[data-sk="enchant"]'); ok(await pg.locator('#cb-book .card.sk.on').count() === 1, '點一招會選起來'); await shot('4-picked');
    await touch('.cb-sk', 1); ok((await view()).slots[1] === 'enchant', '再點快捷列的格子就放進去：' + (await view()).slots);
    const cd0 = JSON.stringify((await view()).cd); await touch('.cb-sk', 1); await touch('.cb-sk', 1); ok(JSON.stringify((await view()).cd) === cd0, '編排的時候點快捷列不會放招');
    if (!phone) {
      await pg.click('#cb-keys'); await pg.waitForTimeout(200); await pg.locator('.cb-sk').nth(0).click(); await pg.waitForTimeout(200); await shot('5-binding');
      await pg.keyboard.press('KeyW'); await pg.waitForTimeout(300); ok((await view()).keys[0] === 'Digit1', '走路用的鍵不能綁');
      await pg.keyboard.press('KeyQ'); await pg.waitForTimeout(400); ok((await view()).keys[0] === 'KeyQ', '按下 Q 就把第一格綁到 Q：' + (await view()).keys);
      await pg.locator('.cb-sk').nth(1).click(); await pg.waitForTimeout(200); await pg.keyboard.press('KeyQ'); await pg.waitForTimeout(400); let v = await view(); ok(v.keys[1] === 'KeyQ' && v.keys[0] === 'Digit2', '綁到別格用過的鍵，兩格互換：' + v.keys);
      ok(await pg.evaluate(() => document.querySelectorAll('.cb-sk kbd')[1].textContent) === 'Q', '快捷列上的按鍵提示跟著變'); await shot('6-bound');
      await pg.evaluate(() => { window.NW_SK.close(); window.HQ_NEWWORLD.debugPlace(22, 14); }); await pg.waitForTimeout(600);
      await pg.keyboard.press('KeyQ'); await pg.waitForTimeout(500); ok((await view()).cd.enchant, '關掉技能書後按 Q 放得出第二格的招');
      await pg.reload(); await pg.waitForFunction(() => window.HQ_NEWWORLD && window.HQ_NEWWORLD.combat && window.HQ_NEWWORLD.combat.view(), null, { timeout: 60000 }); await pg.waitForTimeout(500);
      ok((await view()).keys[1] === 'KeyQ', '按鍵設定存在帳號裡，重新進來還在');
    }
    ok(!pg.errors.length, '沒有頁面錯誤' + (pg.errors.length ? '：' + pg.errors.join(' / ') : ''));
    await pg.context().close();
  };
  // 操偶師的樣子：手上的線、提線、謝幕（給人看圖用，檢查的項目少）
  const puppet = async () => {
    console.log('puppet');
    const C3 = require('../shared/classes3d.js'), pg = await open(await account({ name: '小偶' }), false);
    const shot = (n) => pg.screenshot({ path: path.join(OUT, 'puppet-' + n + '.png') });
    const ask = (ev, arg) => pg.evaluate(([e, a]) => window.NW_SK.ask(e, a), [ev, arg]);
    const view = () => pg.evaluate(() => window.HQ_NEWWORLD.combat.view()), dbg = () => pg.evaluate(() => window.HQ_NEWWORLD.combat.debug());
    await pg.waitForFunction(() => window.HQ_NEWWORLD.combat && window.HQ_NEWWORLD.combat.view(), null, { timeout: 20000 });
    await ask('cb:dbg', { lv: 60 }); await ask('cb:school', 'ae'); await ask('cb:dbg', { m: C3.GATE.mastery }); await ask('cb:quest', 'puppeteer'); await ask('cb:dbg', { quest: 1 }); await ask('cb:spec', 'puppeteer');
    await ask('cb:slots', ['stitch', 'string', 'curtain', 'spark']); await ask('cb:dbg', { lv: 6 }); await zoomIn(pg);   // 等級調低，怪才不會一下就倒
    const aim = (reach) => pg.evaluate((reach) => { const NW = window.HQ_NEWWORLD, m = NW.combat.debug().mobs.filter(x => x.kind === 'moss' && !(x.fl & 256)).sort((a, b) => a.x - b.x)[0]; NW.debugPlace(m.x + reach, m.z + 0.5); NW.combat.setTarget(m.id); return m; }, reach);
    await pg.evaluate(() => window.HQ_NEWWORLD.debugPlace(19, 14)); await pg.waitForTimeout(600); await shot('1-idle');
    ok((await view()).spec === 'puppeteer' && (await dbg()).threads === 4, '操偶師平常兩隻手各垂著兩條短線');
    await aim(4.5); await pg.waitForTimeout(600); await pg.locator('.cb-sk').nth(1).dispatchEvent('pointerdown'); await pg.waitForTimeout(700);
    ok((await dbg()).threads >= 5, '提線：五條線從兩隻手牽到偶身上'); await shot('2-string');
    await pg.evaluate(() => window.HQ_NEWWORLD.debugPlace(8, 14)); await ask('cb:dbg', { lv: 6 }); await pg.waitForTimeout(300); await zoomIn(pg);
    await aim(3); await pg.waitForTimeout(500); await pg.locator('.cb-sk').nth(2).dispatchEvent('pointerdown'); await pg.waitForTimeout(800);
    ok((await dbg()).zones.length === 1, '謝幕：舞台搭起來'); await shot('3-curtain');
    ok(!pg.errors.length, '沒有頁面錯誤' + (pg.errors.length ? '：' + pg.errors.join(' / ') : ''));
    await pg.context().close();
  };
  // 使魔的樣子：三隻排在一起拍一張大圖，拿來跟繪師的圖對照
  const fam = async () => {
    console.log('fam');
    const pg = await open(await account({ name: '小召' }), false);
    await pg.waitForFunction(() => window.HQ_NEWWORLD.combat && window.HQ_NEWWORLD.combat.view(), null, { timeout: 20000 });
    await pg.setViewportSize({ width: 2400, height: 1500 }); await zoomIn(pg);
    await pg.evaluate(() => { const NW = window.HQ_NEWWORLD; NW.debugPlace(13.8, 20); }); await pg.waitForTimeout(1500);
    const n = await pg.evaluate(() => window.HQ_NEWWORLD.combat.famPreview(9.5, 20).length); await pg.waitForTimeout(1200);
    ok(n === 3, '三隻使魔都做得出來'); await pg.screenshot({ path: path.join(OUT, 'fam-lineup.png'), clip: { x: 700, y: 380, width: 900, height: 640 } });
    ok(!pg.errors.length, '沒有頁面錯誤' + (pg.errors.length ? '：' + pg.errors.join(' / ') : ''));
    await pg.context().close();
  };
  if (want === 'fam') await fam();
  // 掉落物、名字前的職業徽章
  const loot = async () => {
    console.log('loot');
    const accA = await account({ name: '小撿' }), pa = await open(accA, false), pb = await open(await account({ name: '小看' }), false);
    const ask = (pg, ev, arg) => pg.evaluate(([e, a]) => window.NW_SK.ask(e, a), [ev, arg]);
    const dbg = (pg) => pg.evaluate(() => window.HQ_NEWWORLD.combat.debug());
    for (const pg of [pa, pb]) await pg.waitForFunction(() => window.HQ_NEWWORLD.combat && window.HQ_NEWWORLD.combat.view(), null, { timeout: 30000 });
    await ask(pa, 'cb:dbg', { lv: 60 }); await ask(pa, 'cb:school', 'pm'); await pa.waitForTimeout(1800);
    const badge = (pg) => pg.evaluate(() => [...document.querySelectorAll('.nw-name img')].filter(i => !i.hidden).map(i => i.src === window.HQ_ICONS.url('nwc-pm') ? 'pm' : i.src === window.HQ_ICONS.url('nwc-sprout') ? 'sprout' : '?').sort().join());
    ok(await badge(pa) === 'pm,sprout' && await badge(pb) === 'pm,sprout', '名字前面有職業徽章，自己和別人都看得到：' + await badge(pb));
    await pa.evaluate(() => window.HQ_NEWWORLD.debugPlace(22, 14)); await pb.evaluate(() => window.HQ_NEWWORLD.debugPlace(23.5, 15.5)); await pa.waitForTimeout(900);
    const at = (pg, x, z, y) => pg.evaluate(([x, z, y]) => { const NW = window.HQ_NEWWORLD; return NW.debugScreen ? NW.debugScreen(x, y, z) : null; }, [x, z, y == null ? 1.4 : y]);
    // 一份掉落物，兩個人都看得到，先撿先贏
    await pa.evaluate(() => window.HQ_NEWWORLD.debugPlace(22, 14)); await pb.evaluate(() => window.HQ_NEWWORLD.debugPlace(26, 17)); await pa.waitForTimeout(800); await ask(pa, 'cb:dbg', { drop: 'noodle' }); await pa.waitForTimeout(900);
    const da = (await dbg(pa)).drops, db = (await dbg(pb)).drops; ok(da.length === 1 && db.length === 1 && da[0].id === db[0].id, '怪掉的東西在地上，兩個人看到的是同一份'); await pa.screenshot({ path: path.join(OUT, 'loot-2-ground.png') });
    const dp = await at(pa, da[0].x, da[0].z, 0.3); await pa.mouse.click(dp.x, dp.y); await pa.waitForTimeout(900);
    ok((await dbg(pa)).drops.length === 0 && (await dbg(pb)).drops.length === 0, '點一下就撿起來，別人那邊也跟著消失');
    const bag = await post('/api/newworld/bag', { act: 'state' }, { Authorization: 'Bearer ' + accA.token });
    ok(JSON.stringify(bag).includes('noodle'), '撿到的泡麵進了 3D 的背包');
    const r2 = await ask(pb, 'cb:pick', da[0].id); ok(r2 && r2.error, '被撿走的東西別人撿不到：' + (r2 && r2.error));
    await ask(pa, 'cb:dbg', { drop: 'water', ms: 1500 }); await pa.waitForTimeout(5000); ok((await dbg(pa)).drops.length === 0, '沒人撿的東西過一陣子會消失');
    ok(!pa.errors.length && !pb.errors.length, '沒有頁面錯誤' + [...pa.errors, ...pb.errors].slice(0, 3).join(' / '));
    await pa.context().close(); await pb.context().close();
  };
  // 霧林的怪：每一種拍一張，再拍出招的樣子（預告圈、孢子、樹根、毒霧、花）
  const mobsShow = async () => {
    console.log('mobs');
    const pg = await open(await account({ name: '小林' }), false), shot = (n) => pg.screenshot({ path: path.join(OUT, 'mobs-' + n + '.png') });
    const ask = (ev, arg) => pg.evaluate(([e, a]) => window.NW_SK.ask(e, a), [ev, arg]), dbg = () => pg.evaluate(() => window.HQ_NEWWORLD.combat.debug()), view = () => pg.evaluate(() => window.HQ_NEWWORLD.combat.view());
    await pg.waitForFunction(() => window.HQ_NEWWORLD.combat && window.HQ_NEWWORLD.combat.view(), null, { timeout: 20000 });
    const d0 = await dbg(), kinds = [...new Set(d0.mobs.map(m => m.kind))].sort().join(); ok(kinds === 'bloom,dew,elder,moss,puff', '霧林的怪：' + kinds);
    const by = (k, deep) => d0.mobs.filter(m => m.kind === k && (deep ? m.lv > 30 : m.lv <= 30)).sort((a, b) => b.lv - a.lv)[0];
    const go = async (m, dx, dz, tgt) => { await pg.evaluate(([id, dx, dz, tgt]) => { const NW = window.HQ_NEWWORLD, m = NW.combat.debug().mobs.find(x => x.id === id); NW.debugPlace(m.x + dx, m.z + dz); NW.combat.setTarget(tgt ? id : null); }, [m.id, dx, dz, !!tgt]); await pg.waitForTimeout(700); await pg.evaluate(() => window.HQ_NEWWORLD.combat.faceCam()); await pg.waitForTimeout(250); };
    await ask('cb:dbg', { lv: 99 }); await zoomIn(pg);
    for (const k of ['moss', 'puff', 'dew']) { await go(by(k), 2.6, 1.2); await shot('1-' + k); }
    await zoomIn(pg); await go(by('moss', true), 2.6, 1.2); await shot('1-deep');
    const el = d0.mobs.find(m => m.kind === 'elder'); await go(el, 4.5, 5); await shot('2-elder');
    // 出招：等級調低讓怪活久一點
    await ask('cb:dbg', { lv: 14 }); const pu = by('puff'); await go(pu, 1.6, 0.4, true);
    const flag = (id, f) => pg.waitForFunction(([id, f]) => { const m = window.HQ_NEWWORLD.combat.debug().mobs.find(x => x.id === id); return m && (m.fl & f); }, [pu.id, f], { timeout: 15000 }).then(() => true).catch(() => false);
    ok(await flag(pu.id, 4096), '傘菇精開始蓄力（地上有預告圈）');
    ok((await dbg()).zones.length >= 1 || await pg.waitForFunction(() => window.HQ_NEWWORLD.combat.debug().zones.length >= 1, null, { timeout: 4000 }).then(() => true).catch(() => false), '孢子圈畫出來了'); ok(await pg.waitForFunction(() => window.HQ_NEWWORLD.combat.view().slow === 1, null, { timeout: 4000 }).then(() => true).catch(() => false), '站在孢子裡：畫面收到變慢'); await shot('4-spore');
    const pu2 = d0.mobs.filter(m => m.kind === 'puff' && m.lv <= 30 && m.id !== pu.id).sort((a, b) => b.lv - a.lv)[0]; await go(pu2, 1.6, 0.4, true); await pg.waitForFunction(([id]) => { const m = window.HQ_NEWWORLD.combat.debug().mobs.find(x => x.id === id); return m && (m.fl & 4096); }, [pu2.id], { timeout: 15000 }).catch(() => {}); await shot('3-spore-warn');
    // 老樹公：樹根、毒霧、花
    await pg.evaluate(() => { const NW = window.HQ_NEWWORLD; NW.combat.setTarget(null); NW.debugPlace(8, 14); }); await pg.waitForTimeout(5600); await ask('cb:dbg', { lv: 99 });
    const keep = setInterval(() => ask('cb:dbg', { hp: 1 }).catch(() => {}), 1500);
    await go(el, 5, 5.5, true); await pg.waitForTimeout(1500); await pg.evaluate(() => window.HQ_NEWWORLD.combat.setTarget(null)); await ask('cb:dbg', { bossHp: 0.45 });
    ok(await pg.waitForFunction(() => window.HQ_NEWWORLD.combat.debug().fog, null, { timeout: 5000 }).then(() => true).catch(() => false), '毒霧畫出來了');
    ok(await pg.waitForFunction(() => window.HQ_NEWWORLD.combat.debug().mobs.some(m => m.kind === 'bloom' && !(m.fl & 256)), null, { timeout: 15000 }).then(() => true).catch(() => false), '老樹公身邊開了花'); await shot('5-elder-fog');
    await shot('6-elder-fight');
    clearInterval(keep); ok(!pg.errors.length, '沒有頁面錯誤' + (pg.errors.length ? '：' + pg.errors.slice(0, 3).join(' / ') : ''));
    await pg.context().close();
  };
  // 組隊：點人邀請、對方答應、兩邊都看得到隊伍名單、離開
  const partyShow = async (phone) => {
    console.log('party' + (phone ? '（手機）' : ''));
    const pa = await open(await account({ name: '小隊長' }), phone), pb = await open(await account({ name: '小隊員' }), phone), tag = phone ? 'party-phone-' : 'party-';
    const ask = (pg, ev, arg) => pg.evaluate(([e, a]) => window.NW_SK.ask(e, a), [ev, arg]);
    for (const pg of [pa, pb]) await pg.waitForFunction(() => window.HQ_NEWWORLD.combat && window.HQ_NEWWORLD.combat.view(), null, { timeout: 30000 });
    await ask(pa, 'cb:dbg', { lv: 30 }); await ask(pa, 'cb:school', 'pm'); await ask(pb, 'cb:dbg', { lv: 24 }); await ask(pb, 'cb:school', 'sc');
    await pa.evaluate(() => window.HQ_NEWWORLD.debugPlace(22, 14)); await pb.evaluate(() => window.HQ_NEWWORLD.debugPlace(24, 15)); await pa.waitForTimeout(phone ? 6000 : 1500);   // 手機版兩個分頁一起開很慢，等鏡頭跟上
    const tapAt = (x, y) => (phone ? pa.touchscreen.tap(x, y) : pa.mouse.click(x, y));
    const at = await pa.evaluate(() => window.HQ_NEWWORLD.debugScreen(24, 0.9, 15)); await tapAt(at.x, at.y); await pa.waitForTimeout(500);
    ok(await pa.evaluate(() => !document.getElementById('cb-pop').hidden), '點別的玩家會冒出「邀請組隊」'); await pa.screenshot({ path: path.join(OUT, tag + '1-invite.png') });
    await tapAt(at.x, at.y); await pa.waitForTimeout(300); await pa.locator('#cb-pop button').dispatchEvent('click'); ok(await pb.waitForFunction(() => !document.getElementById('cb-inv').hidden, null, { timeout: 5000 }).then(() => true).catch(() => false), '對方收到邀請'); await pb.screenshot({ path: path.join(OUT, tag + '2-asked.png') });
    await pb.locator('#cb-inv button.yes').dispatchEvent('click'); const list = (pg) => pg.evaluate(() => { const b = document.getElementById('cb-party'); return b.hidden ? null : [...b.querySelectorAll('.pm em')].map(e => e.textContent).join(); });
    ok(await pa.waitForFunction(() => !document.getElementById('cb-party').hidden, null, { timeout: 5000 }).then(() => true).catch(() => false) && /小隊員/.test(await list(pa)) && /小隊長/.test(await list(pb)), '兩邊都看得到隊友：' + await list(pa) + ' / ' + await list(pb));
    const box = await pa.evaluate(() => { const r = document.getElementById('cb-party').getBoundingClientRect(), c = document.getElementById('cb-me').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, right: r.right, cb: c.bottom, w: innerWidth, h: innerHeight }; });
    ok(box.top >= box.cb && box.bottom < box.h && box.right < box.w, '隊伍名單在狀態卡下面，沒有超出畫面'); await pa.screenshot({ path: path.join(OUT, tag + '3-list.png') });
    await tapAt(at.x, at.y); await pa.waitForTimeout(400); ok(await pa.evaluate(() => document.getElementById('cb-pop').hidden), '已經是隊友就不會再冒邀請');
    await pb.locator('#cb-party .pf button').nth(1).dispatchEvent('click'); ok(await pa.waitForFunction(() => document.getElementById('cb-party').hidden, null, { timeout: 5000 }).then(() => true).catch(() => false), '隊友離開以後名單收起來');
    ok(!pa.errors.length && !pb.errors.length, '沒有頁面錯誤' + [...pa.errors, ...pb.errors].slice(0, 3).join(' / '));
    await pa.context().close(); await pb.context().close();
  };
  if (want === 'party') await partyShow(false);
  if (want === 'party-phone') await partyShow(true);
  if (want === 'mobs') await mobsShow();
  if (want === 'loot') await loot();
  if (want === 'puppet') await puppet();
  if (want === 'hotbar') await hotbar(false);
  if (want === 'hotbar-phone') await hotbar(true);
  if (want === 'combat') await combat(false);
  if (want === 'combat-phone') await combat(true);
  if (want === 'all' || want === 'stay') await stay();
  if (want === 'all' || want === 'solo') await solo(false);
  if (want === 'all' || want === 'phone') await solo(true);
  if (want === 'all' || want === 'multi') await multi();
  if (want === 'all' || want === 'classes') await classes();
  if (want === 'all' || want === 'live') await live();
  if (want === 'all' || want === 'rider') await rider();
  if (want === 'all' || want === 'lobby') await lobby();
  if (want === 'all' || want === 'home') await home();
  await browser.close();
  console.log('截圖在 ' + OUT);
  console.log(failed ? failed + ' 項沒過' : '全部通過');
  process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
