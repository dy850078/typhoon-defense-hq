// 新世界戰鬥的伺服器測試（不開瀏覽器）：開一個暫時的伺服器，用連線直接走一遍等級、轉職、每一招
//   node scripts/nw-combat-test.js
// 需要 socket.io-client（沒有列在 package.json，本機要跑的話先 npm i --no-save socket.io-client）
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const { io } = require('socket.io-client');
const C3 = require('../shared/classes3d.js');
const ROOT = path.join(__dirname, '..'), PORT = Number(process.env.NW_TEST_PORT) || 3461, B = 'http://localhost:' + PORT, PW = 'nw-test-pw';
let failed = 0;
const ok = (cond, what) => { console.log((cond ? '  ok   ' : '  FAIL ') + what); if (!cond) failed++; };
const post = async (u, b, h = {}) => (await fetch(B + u, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(b) })).json();
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-data-'));
  const srv = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), ADMIN_PASSWORD: PW, DATA_DIR: data }, stdio: ['ignore', 'ignore', process.env.NW_TEST_LOG ? fs.openSync(process.env.NW_TEST_LOG, 'w') : 'ignore'] });
  process.on('exit', () => { try { srv.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(data, { recursive: true, force: true }); } catch (e) {} });
  for (let i = 0; i < 50; i++) { try { await fetch(B + '/config'); break; } catch (e) { await wait(200); } }
  const ad = await post('/api/admin/login', { password: PW });
  let seq = 0;
  const player = async () => {
    const name = 'cbt' + (Date.now() % 100000) + (seq++), reg = await post('/api/register', { username: name, password: 'pw123456', email: name + '@example.com', save: { name: '測試' + seq } });
    await post('/api/admin/role', { username: name, admin: true }, { 'x-admin-token': ad.token });
    const s = io(B + '/newworld', { auth: { token: reg.token }, transports: ['websocket'] }), P = { s, name, token: reg.token, me: null, mobs: new Map(), fx: [], hits: [], loot: [] };
    s.on('cb:init', (d) => { P.me = d.me; d.mobs.forEach(m => P.mobs.set(m.id, m)); P.field = d.field; });
    s.on('cb:me', (d) => { P.me = d; });
    s.on('cb:mobs', (l) => l.forEach(a => { const m = P.mobs.get(a[0]); if (m) Object.assign(m, { x: a[1], z: a[2], hp: a[3], fl: a[4], tied: a[5] }); }));
    s.on('cb:fx', (o) => P.fx.push(o)); s.on('cb:hit', (l) => P.hits.push(...l)); s.on('cb:loot', (o) => P.loot.push(o));
    P.ask = (ev, arg) => new Promise(r => s.emit(ev, arg, r));
    P.at = (x, z, f) => s.emit('move', { x, z, f: f || 0 });
    P.mob = (kind, i) => [...P.mobs.values()].filter(m => m.kind === kind)[i || 0];
    P.cast = async (k, m) => { const i = P.me.slots.indexOf(k); if (i < 0) throw new Error('沒有帶 ' + k + '：' + P.me.slots); P.fx.length = 0; s.emit('cb:cast', { i, m: m ? m.id : null }); await wait(350); return P.fx.find(f => f.k === k || f.k === k + '2'); };
    for (let i = 0; i < 50 && !P.me; i++) await wait(100);
    return P;
  };
  const A = await player();
  ok(A.me && A.me.lv === 1 && !A.me.school && A.me.slots.join() === 'spark,blink,,', '新帳號是 1 等的芽，帶著兩招：' + (A.me && A.me.slots));
  ok(A.mobs.size >= 30, '練習場有怪：' + A.mobs.size + ' 隻');
  ok((await A.ask('cb:school', 'pm')).error, '1 等不能選學門');
  // 芽：打一隻 1 等的果凍
  const s0 = A.mob('slime'); A.at(s0.x + 2, s0.z); await wait(200); A.s.emit('cb:target', s0.id);
  await wait(2600); ok(A.hits.some(h => h[0] === s0.id && h[1] > 0), '點怪會自動普攻');
  ok(await A.cast('spark', s0), '小火花放得出來'); ok(await A.cast('blink'), '歪歪瞬移放得出來');
  for (let i = 0; i < 80 && A.mobs.get(s0.id).hp > 0; i++) await wait(200);
  ok(A.mobs.get(s0.id).hp === 0 && A.me.exp > 0, '打倒果凍拿到經驗：' + A.me.exp);
  if (process.env.QUICK) { A.s.close(); } else {
  // 每個學門、每個專精都走一遍
  await wait(5300); await A.ask('cb:dbg', { lv: 60 });
  const far = () => A.mob('shroom', 3), tgt = (i) => { const m = [...A.mobs.values()].filter(x => x.kind !== 'boss' && x.hp > 0).sort((a, b) => b.hp - a.hp)[i || 0]; A.at(m.x + 2, m.z); return m; };
  const rest = async () => { A.at(0, 10); await wait(300); await A.ask('cb:dbg', { lv: 60 }); };
  await rest();
  for (const sk of Object.keys(C3.SCHOOLS)) {
    const r0 = await A.ask('cb:school', sk); ok(r0.ok && A.me.school === sk && !A.me.spec, (r0.error || '') + '進學門：' + C3.SCHOOLS[sk].name);
    await A.ask('cb:slots', C3.SCHOOLS[sk].basics.concat(['spark', null]));
    for (const b of C3.SCHOOLS[sk].basics) { const m = tgt(); await wait(200); ok(await A.cast(b, m), '見習生 ' + C3.SK[b].name); await wait(300); }
    await rest();
    for (const sp of C3.SCHOOLS[sk].specs) {
      if (!A.me.schools[sk].m) ok((await A.ask('cb:quest', sp)).error, C3.SPECS[sp].name + '：熟練度不夠不能接三轉任務');
      await A.ask('cb:dbg', { m: C3.GATE.mastery }); ok((await A.ask('cb:quest', sp)).ok && A.me.quest, C3.SPECS[sp].name + '：條件夠了可以接任務');
      ok((await A.ask('cb:spec', sp)).error, C3.SPECS[sp].name + '：信物沒收齊不能轉');
      await A.ask('cb:dbg', { quest: 1 }); const rs = await A.ask('cb:spec', sp); ok(rs.ok && A.me.spec === sp, (rs.error || '') + C3.SPECS[sp].name + '：收齊後轉職成功');
      const all = C3.learned(A.me).filter(k => k !== 'spark' && k !== 'blink');
      for (let i = 0; i < all.length; i += 4) { await rest(); await A.ask('cb:dbg', { lv: 60 }); const set = all.slice(i, i + 4); const r = await A.ask('cb:slots', set); if (r.error) { ok(false, '換招失敗：' + r.error); continue; }
        for (const k of set) { const m = tgt(0); await wait(250); const f = await A.cast(k, m); ok(f, C3.SPECS[sp].name + ' ' + C3.SK[k].name);
          if (C3.SK[k].next) { await wait(400); const f2 = await A.cast(k, tgt(1)); ok(f2 && f2.k === k + '2', C3.SPECS[sp].name + ' ' + C3.SK[k].next + '（第二段）'); }
          await wait(300); } }
      await rest();
    }
  }
  // 選修欄：第四顆可以放別的學門的基礎招，前三顆不行
  await A.ask('cb:school', 'ae'); await A.ask('cb:slots', ['bubble', 'enchant', 'transmute', 'potion']);
  ok(A.me.slots[0] === null && A.me.slots[3] === 'potion', '選修只能放在第四顆：' + A.me.slots);
  await A.ask('cb:slots', ['enchant', 'transmute', 'spark', 'scent']); ok(A.me.slots[3] === null, '別的學門的專精招不能選修：' + A.me.slots);
  // 存檔：重新連線還在
  A.s.close(); await wait(500);
  const r = await (await fetch(B + '/api/newworld/look', { headers: { Authorization: 'Bearer ' + A.token } })).json();
  ok(r.ok, '帳號還在');
  const s2 = io(B + '/newworld', { auth: { token: A.token }, transports: ['websocket'] }); const me2 = await new Promise(r2 => s2.on('cb:init', d => r2(d.me)));
  ok(me2.lv === 60 && me2.school === 'ae' && me2.spec === 'puppeteer' && me2.schools.pm.got.length === 2, '重新連線，等級和職業都還在：' + me2.lv + ' 等 ' + C3.clsName(me2));
  s2.close();
  }
  // 被怪打會扣血，倒下後回到入口
  const Bp = await player(); await Bp.ask('cb:dbg', { lv: 2 }); const w = [...Bp.mobs.values()].filter(m => m.kind === 'wisp' && m.hp > 0).pop(); Bp.at(w.x + 1, w.z); await wait(200); Bp.s.emit('cb:target', w.id);
  let back = null; Bp.s.on('cb:back', (p) => { back = p; });
  for (let i = 0; i < 100 && !back; i++) await wait(200);
  if (!back) console.log(JSON.stringify([Bp.me, Bp.hits.slice(0, 5), Bp.fx.slice(0, 5), Bp.mobs.get(w.id)]));
  ok(Bp.fx.some(f => f.k === 'down') && back, '血量歸零會倒下，幾秒後回到練習場入口');
  Bp.s.close();
  console.log(failed ? '\n有 ' + failed + ' 項沒過' : '\n全部通過'); process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
