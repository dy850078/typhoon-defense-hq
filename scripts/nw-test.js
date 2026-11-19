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
  const account = async (save, admin = true) => {
    const name = 'nwt' + (Date.now() % 100000) + (seq++);
    const reg = await post('/api/register', { username: name, password: 'pw123456', email: name + '@example.com', save });
    if (!reg.token) throw new Error('註冊失敗：' + JSON.stringify(reg));
    if (admin) await post('/api/admin/role', { username: name, admin: true }, { 'x-admin-token': ad.token });
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
    await pa.click('.nw-hint'); await pa.waitForFunction(() => document.querySelector('.nw-hint').textContent === '站起來', null, { timeout: 30000 }).catch(() => {});
    ok((await NW(pa, () => HQ_NEWWORLD.acts().pose)) === 'sit' && (await NW(pa, () => HQ_NEWWORLD.net.me().p)) === 1 && (await pa.textContent('.nw-hint')) === '站起來', '點紙條就坐到長椅上（' + JSON.stringify(await NW(pa, () => [HQ_NEWWORLD.acts(), HQ_NEWWORLD.net.me(), HQ_NEWWORLD.near()])) + '）');
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
    await pa.click('.nw-hint'); await pa.waitForTimeout(600);
    ok((await pa.textContent('.nw-tag .nw-bubble')).includes('沒有人點歌') && !(await pa.evaluate(() => NW_MUSIC.state().on)), '點唱機：沒有歌的時候會說一聲');
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
    await pa.click('.nw-hint'); await pa.waitForFunction(() => document.querySelector('.nw-hint').textContent === '站起來', null, { timeout: 30000 }).catch(() => {});
    ok((await NW(pa, () => HQ_NEWWORLD.acts().pose)) === 'sit' && (await pa.textContent('.nw-hint')) === '站起來', '沙發可以坐');
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
    await pa.click('.nw-hint'); await pa.waitForTimeout(600);
    ok((await pa.textContent('.nw-tag .nw-bubble')).includes('沒有人點歌'), '點唱機在客廳，點得到');
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

  if (want === 'all' || want === 'solo') await solo(false);
  if (want === 'all' || want === 'phone') await solo(true);
  if (want === 'all' || want === 'multi') await multi();
  if (want === 'all' || want === 'classes') await classes();
  if (want === 'all' || want === 'live') await live();
  if (want === 'all' || want === 'rider') await rider();
  if (want === 'all' || want === 'lobby') await lobby();
  await browser.close();
  console.log('截圖在 ' + OUT);
  console.log(failed ? failed + ' 項沒過' : '全部通過');
  process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
