// 新世界測試頁的自動測試：自己開一個暫時的伺服器（資料寫在暫存資料夾），用無頭瀏覽器跑一遍
//
//   node scripts/nw-test.js            單人（電腦 1280x800）＋手機模擬（iPhone 13）＋雙人同時在線
//   node scripts/nw-test.js solo       只跑單人
//   node scripts/nw-test.js phone      只跑手機模擬
//   node scripts/nw-test.js multi      只跑雙人
//   node scripts/nw-test.js rider      只跑機器人騎士（兩個人，一個當騎士）
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
    await pg.waitForFunction(() => document.getElementById('gate').hidden, null, { timeout: 120000 });
    await pg.waitForTimeout(3500); return pg;
  };
  const NW = (pg, fn, arg) => pg.evaluate(fn, arg);
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
  };

  // ---- 雙人：互相看得到、移動和聊天同步、離線會消失、非管理員連不上 ----
  const multi = async () => {
    console.log('multi');
    const a = await account({ name: '小安', hair: 'short', glasses: '1' }), b = await account({ name: '阿寶', hair: 'buzz', glasses: '0' }), x = await account({ name: '路人' }, false);
    const pa = await open(a), pb = await open(b, true);
    await pa.waitForTimeout(3000);
    ok((await NW(pa, () => HQ_NEWWORLD.net.count())) === 1 && (await NW(pb, () => HQ_NEWWORLD.net.count())) === 1, '兩邊都看得到對方');
    await pb.fill('#chat-in', '哈囉'); await pb.press('#chat-in', 'Enter'); await pa.waitForTimeout(1500);
    ok((await pa.textContent('#chat-log')).includes('阿寶：哈囉'), '聊天有傳到對方');
    await shot(pa, 'multi-1-desktop'); await shot(pb, 'multi-2-phone');
    ok(pa.errors.length + pb.errors.length === 0, '沒有主控台錯誤');
    const deny = await pa.evaluate((t) => new Promise(r => { const s = io('/newworld', { auth: { token: t } }); s.on('connect_error', () => { s.close(); r(true); }); s.on('connect', () => { s.close(); r(false); }); }), x.token);
    ok(deny, '非管理員連不上新世界頻道');
    await pb.context().close(); await pa.waitForTimeout(2000);
    ok((await NW(pa, () => HQ_NEWWORLD.net.count())) === 0, '對方離線後人物消失');
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
    console.log('  自己是騎士：' + (await pa.textContent('#stats')) + '　看別人當騎士：' + (await pb.textContent('#stats')));
    await pa.click('#b-form'); await pa.waitForTimeout(2500); await shot(pa, 'rider-3-float');
    await pa.click('#b-form'); await pa.waitForTimeout(2500); await shot(pa, 'rider-4-front');
    await pa.click('#b-gesture'); await pa.waitForTimeout(2200); await shot(pa, 'rider-5-gesture'); await shot(pb, 'rider-6-gesture-seen');
    await pa.click('#b-ctrl'); await pa.waitForTimeout(1500);
    ok(!(await NW(pa, () => HQ_NEWWORLD.isRider())) && (await pa.isHidden('#b-form')), '切回一般，機器人收起來');
    await shot(pa, 'rider-7-back-to-normal');
    ok(pa.errors.length + pb.errors.length === 0, '沒有主控台錯誤' + (pa.errors.concat(pb.errors).length ? '：' + pa.errors.concat(pb.errors).join(' / ') : ''));
    await pa.context().close(); await pb.context().close();
  };

  if (want === 'all' || want === 'solo') await solo(false);
  if (want === 'all' || want === 'phone') await solo(true);
  if (want === 'all' || want === 'multi') await multi();
  if (want === 'all' || want === 'rider') await rider();
  await browser.close();
  console.log('截圖在 ' + OUT);
  console.log(failed ? failed + ' 項沒過' : '全部通過');
  process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
