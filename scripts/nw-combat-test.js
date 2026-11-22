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
    s.on('cb:fx', (o) => P.fx.push(o)); s.on('cb:hit', (l) => P.hits.push(...l)); s.on('cb:loot', (o) => P.loot.push(o)); P.party = null; P.inv = []; P.say = []; P.back = [];
    s.on('cb:party', (v) => { P.party = v; }); s.on('cb:pinv', (v) => P.inv.push(v)); s.on('cb:say', (v) => P.say.push(v)); s.on('cb:back', (v) => P.back.push(v));
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
  // 芽：打一隻 1 等的苔球
  const s0 = A.mob('moss'); A.at(s0.x + 2, s0.z); await wait(200); A.s.emit('cb:target', s0.id);
  await wait(2600); ok(A.hits.some(h => h[0] === s0.id && h[1] > 0), '點怪會自動普攻');
  ok(await A.cast('spark', s0), '小火花放得出來'); ok(await A.cast('blink'), '歪歪瞬移放得出來');
  for (let i = 0; i < 80 && A.mobs.get(s0.id).hp > 0; i++) await wait(200);
  ok(A.mobs.get(s0.id).hp === 0 && A.me.exp > 0, '打倒苔球拿到經驗：' + A.me.exp);
  if (process.env.QUICK || process.env.ONLY) { A.s.close(); } else {
  // 每個學門、每個專精都走一遍
  await wait(5300); await A.ask('cb:dbg', { lv: 60 });
  const far = () => A.mob('puff', 3), tgt = (i) => { const m = [...A.mobs.values()].filter(x => !C3.MOBS[x.kind].boss && !C3.MOBS[x.kind].add && x.lv <= 60 && x.hp > 0).sort((a, b) => b.hp - a.hp)[i || 0]; A.at(m.x + 2, m.z); return m; };
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
  // ---- 怪的招 ----
  if (!process.env.ONLY || process.env.ONLY === 'moves') {
    const M = await player(); await M.ask('cb:dbg', { lv: 8 }); const seen = (P, k, mk, id) => P.fx.find(f => f.k === k && f.mk === mk && (!id || f.m === id));
    const until = async (fn, ms) => { for (let i = 0; i < ms / 100; i++) { const v = fn(); if (v) return v; await wait(100); } return null; };
    // 苔球：先預告，再滾過來撞人
    const mo = M.mob('moss', 9); M.at(mo.x + 4, mo.z); await wait(200); M.s.emit('cb:target', mo.id); M.fx.length = 0; M.hits.length = 0;
    const t1 = await until(() => seen(M, 'tele', 'roll', mo.id), 9000); ok(t1 && t1.x2 != null && t1.dur > 0, '苔球滾之前有預告（一條線）'); const hp0 = M.me.hp;
    ok(await until(() => seen(M, 'mobMove', 'roll', mo.id), 2500), '預告完才滾'); await wait(700); ok(M.hits.some(h => h[0] === 'p:' + M.s.id && h[1] > 0), '站在線上會被撞到');
    M.s.emit('cb:target', null); M.at(mo.x + 40, mo.z + 10); await wait(5600);
    // 傘菇精：孢子圈讓人變慢，撒完要整理傘
    await M.ask('cb:dbg', { lv: 12 }); await M.ask('cb:school', 'sc'); await M.ask('cb:slots', ['seal', 'pact', 'spark', null]);
    const pu = M.mob('puff', 9); M.at(pu.x + 1.5, pu.z); await wait(200); M.s.emit('cb:target', pu.id); M.fx.length = 0;
    ok(await until(() => seen(M, 'tele', 'spore', pu.id), 12000), '傘菇精撒孢子之前有預告（一個圈）');
    ok(await until(() => M.fx.find(f => f.k === 'zone' && f.zk === 'spore'), 3000), '孢子圈出現'); ok(await until(() => M.me.slow === 1, 2500), '站在孢子裡會變慢');
    ok(M.mobs.get(pu.id).fl & 2048 || await until(() => M.mobs.get(pu.id).fl & 2048, 800), '撒完孢子在整理傘');
    M.at(pu.x + 9, pu.z); ok(await until(() => M.me.slow === 0, 6000), '走出來一下就恢復');
    // 預告中被框住會被打斷
    let cut = false; for (let n = 0; n < 4 && !cut; n++) { const q = M.mob('puff', 5 + n); if (!q || !q.hp) continue; M.at(q.x + 1.5, q.z); await wait(200); M.s.emit('cb:target', q.id); M.fx.length = 0;
      if (await until(() => seen(M, 'tele', 'spore', q.id), 12000)) { M.s.emit('cb:cast', { i: 0, m: q.id }); cut = !!(await until(() => M.fx.find(f => f.k === 'mobStop' && f.m === q.id), 1500)); } M.at(q.x + 12, q.z); await wait(300); }
    ok(cut, '預告中用結界框住，招就放不出來');
    M.s.emit('cb:target', null); await M.ask('cb:dbg', { lv: 25 });
    // 露水靈：遠遠地吐水珠
    const de = M.mob('dew', 3); M.at(de.x + 5, de.z); await wait(200); M.s.emit('cb:target', de.id); M.fx.length = 0;
    const sh = await until(() => M.fx.find(f => f.k === 'mobAtk' && f.m === de.id && f.shot), 8000), dm = M.mobs.get(de.id); ok(sh && Math.hypot(dm.x - (de.x + 5), dm.z - de.z) > 3, '露水靈站得遠遠的吐水珠');
    M.s.emit('cb:target', null); M.at(de.x - 30, de.z - 30); await wait(5600);
    // 老樹公：樹根、毒霧、補血解毒、開花
    await M.ask('cb:school', 'pm'); await M.ask('cb:slots', ['potion', 'bubble', 'spark', null]); await M.ask('cb:dbg', { lv: 99 }); const keep = setInterval(() => M.s.emit('cb:dbg', { hp: 1 }), 1200);
    const el = [...M.mobs.values()].find(m => m.kind === 'elder'); M.at(el.x + 5, el.z); await wait(200); M.s.emit('cb:target', el.id); M.fx.length = 0; await until(() => M.hits.some(h => h[0] === el.id), 3000); M.s.emit('cb:target', null);
    const rt = await until(() => seen(M, 'tele', 'roots'), 9000); ok(rt && rt.spots.length >= 2, '老樹公的樹根有預告：' + (rt && rt.spots.length) + ' 個圈'); ok(await until(() => seen(M, 'mobMove', 'roots'), 2500), '樹根冒出來');
    await M.ask('cb:dbg', { bossHp: 0.45 }); const fog = await until(() => M.fx.find(f => f.k === 'fog' && f.on), 2500); ok(fog, '半血以後起毒霧'); ok(await until(() => M.me.pois === 1, 3000), '站在霧裡會中毒');
    M.hits.length = 0; await wait(1500); ok(M.hits.some(h => h[0] === 'p:' + M.s.id && h[2] === 'pois'), '中毒會一直扣血');
    await M.ask('cb:dbg', { hp: 0.5 }); M.s.emit('cb:cast', { i: 0 }); ok(await until(() => M.me.pois === 0, 1500), '補血招可以解毒'); await wait(2500); ok(M.me.pois === 0, '解毒後有幾秒不會再中');
    ok(await until(() => M.me.pois === 1, 6000), '時間過了又會中毒');
    await M.ask('cb:dbg', { bossHp: 0.45 }); const bl = await until(() => seen(M, 'mobMove', 'bloom'), 12000); ok(bl, '老樹公開花');
    if (bl) { M.hits.length = 0; await wait(1300); ok(M.hits.some(h => h[0] === el.id && h[1] < 0), '花活著的時候老樹公會回血'); M.s.emit('cb:target', bl.m); const b0 = M.mobs.get(bl.m); M.at(b0.x + 1, b0.z);
      ok(await until(() => M.mobs.get(bl.m).hp === 0, 15000), '花打得掉'); }
    clearInterval(keep); M.s.close();
  }
  // ---- 使魔：自己走動打怪、有血量、太遠會回來 ----
  if (!process.env.ONLY || process.env.ONLY === 'fam') {
    const until = async (fn, ms) => { for (let i = 0; i < ms / 100; i++) { const v = fn(); if (v) return v; await wait(100); } return null; };
    const S = await player(); S.who = null; S.fams = new Map(); S.s.on('cb:who', (d) => { if (d.id === S.s.id) S.who = d; }); S.s.on('cb:fams', (l) => l.forEach(a => S.fams.set(a[0], a)));
    let me = { x: 0, z: 0 }; const go = (x, z) => { me = { x, z }; S.at(x, z); }, far = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), fpos = (id) => { const a = S.fams.get(id); return a ? { x: a[1], z: a[2], hp: a[3] } : null; };
    const summon = async () => { await S.ask('cb:dbg', { lv: 12 }); S.who = null; await S.cast('pact'); const w = await until(() => S.who && S.who.fam.length === 1 && S.who, 2000); return w ? w.fam[0] : null; };
    await S.ask('cb:dbg', { lv: 12 }); await S.ask('cb:school', 'sc'); await S.ask('cb:slots', ['seal', 'pact', 'spark', null]);
    // 主人很久沒動作：使魔不主動找怪
    const mo = [...S.mobs.values()].filter(m => m.kind === 'moss' && m.lv <= 8 && m.hp > 0)[2]; go(mo.x + 3, mo.z); await wait(300); await S.ask('cb:dbg', { idle: 1 });
    let f = await summon(); ok(f && f[2] === Math.round(C3.LEVEL.hp(12) * C3.FAMILIARS[f[1]].hp) && f[5] === f[2], '叫出來的使魔有自己的血量：' + (f && f[5] + '/' + f[2]));
    S.fx.length = 0; await wait(3000); ok(!S.fx.some(x => x.k === 'fam'), '主人很久沒動作，使魔不會自己去惹怪');
    await S.ask('cb:dbg', { idle: 0 }); const a1 = await until(() => S.fx.find(x => x.k === 'fam' && x.f === f[0]), 6000); ok(a1, '主人沒鎖定怪，使魔自己去打附近的怪');
    S.hits.length = 0; ok(await until(() => S.hits.find(h => h[0] === 'f:' + f[0] && h[1] > 0), 12000), '使魔惹的怪回頭打使魔，使魔會扣血');
    // 太遠會跑回來；更遠直接出現在身邊
    go(me.x - 15, me.z); const back = await until(() => { const q = fpos(f[0]); return q && far(q, me) < 5; }, 6000); ok(back, '主人走遠，使魔放下怪跑回來');
    go(me.x, me.z + 30); ok(await until(() => { const q = fpos(f[0]); return q && far(q, me) < 3; }, 1500), '離得太遠，使魔直接回到主人身邊');
    // 補血補得到使魔；血量歸零就消失
    const H = await player(); await H.ask('cb:dbg', { lv: 12 }); await H.ask('cb:school', 'pm'); await H.ask('cb:slots', ['bubble', 'potion', 'spark', null]); H.at(me.x + 1, me.z); await wait(300);
    await S.ask('cb:dbg', { famHit: 0.5 }); S.hits.length = 0; await H.cast('potion'); ok(await until(() => S.hits.find(h => h[0] === 'f:' + f[0] && h[1] < 0), 1500), '補血招補得到使魔');
    await S.ask('cb:dbg', { famHit: 3 }); ok(await until(() => S.who && S.who.fam.length === 0, 1500), '使魔血量歸零就消失');
    S.s.close(); H.s.close();
  }
  // ---- 雲海高原：棉雲羊、風鈴鳥、雷角鹿、雲鯨 ----
  if (!process.env.ONLY || process.env.ONLY === 'cloud') {
    const until = async (fn, ms) => { for (let i = 0; i < ms / 100; i++) { const v = fn(); if (v) return v; await wait(100); } return null; };
    const K = await player(); await K.ask('cb:dbg', { lv: 30 }); await K.ask('cb:school', 'sc'); await K.ask('cb:slots', ['seal', 'pact', 'spark', null]);
    const seen = (k, mk, id) => K.fx.find(f => f.k === k && f.mk === mk && f.m === id), keep = setInterval(() => K.s.emit('cb:dbg', { hp: 1 }), 1200), hitMe = () => K.hits.some(h => h[0] === 'p:' + K.s.id && h[1] > 0);
    const kinds = ['sheep', 'bird', 'deer', 'whale'].map(k => [...K.mobs.values()].filter(m => m.kind === k).length).join(); ok(kinds === '10,10,10,1', '雲海高原有棉雲羊、風鈴鳥、雷角鹿各十隻和一隻雲鯨：' + kinds);
    ok(![...K.mobs.values()].some(m => m.lv > 30 && ['moss', 'puff', 'dew'].includes(m.kind)), '暫時的霧林深處搬走了');
    for (const [kind, mk, name] of [['sheep', 'charge', '棉雲羊倒退助跑再衝撞'], ['bird', 'dive', '風鈴鳥俯衝'], ['deer', 'bolt', '雷角鹿放一道雷']]) {
      const mo = K.mob(kind, 9); K.at(mo.x + 4, mo.z); await wait(200); K.fx.length = 0; K.hits.length = 0; K.s.emit('cb:target', mo.id); await until(() => K.mobs.get(mo.id).hp < mo.max, 4000); K.s.emit('cb:target', null);   // 打一下把牠引過來就收手，免得還沒出招就打死
      const t1 = await until(() => seen('tele', mk, mo.id), 14000); ok(t1 && t1.x2 != null && t1.dur > 0, name + '之前有預告'); K.hits.length = 0;
      const mv1 = await until(() => seen('mobMove', mk, mo.id), 3000); ok(mv1, name); if (!mv1) console.log(JSON.stringify([K.mobs.get(mo.id), K.fx.slice(-6)])); await wait(800); ok(hitMe(), '站著不躲會被打到（' + C3.MOBS[kind].name + '）');
      if (kind === 'sheep') ok(K.mobs.get(mo.id).fl & 2048 || await until(() => K.mobs.get(mo.id).fl & 2048, 800), '棉雲羊撞完在喘');
      K.at(mo.x + 60, mo.z - 40); await wait(600); }
    // 雲鯨：打哈欠有預告、會吸人、壓下來會痛；唱歌有讀條，被框住就斷
    await K.ask('cb:dbg', { lv: 99 }); await wait(5200); const wh = K.mob('whale'); K.at(wh.x + 5, wh.z); await wait(200); K.s.emit('cb:target', wh.id); await until(() => K.mobs.get(wh.id).hp < wh.max, 4000);
    K.fx.length = 0; K.hits.length = 0; await K.ask('cb:dbg', { whale: 'yawn' }); const y1 = await until(() => seen('tele', 'yawn', wh.id), 2000); ok(y1 && y1.pull > 0 && y1.r > 0, '雲鯨打哈欠之前有預告，會把人吸過去');
    K.hits.length = 0; ok(await until(() => seen('mobMove', 'yawn', wh.id), 5000), '哈欠打完壓下來'); await wait(300); ok(hitMe(), '站在圈裡會被壓到');
    K.fx.length = 0; await K.ask('cb:dbg', { whale: 'song' }); ok(await until(() => seen('tele', 'song', wh.id), 2000), '雲鯨唱歌有讀條'); await wait(600); await K.cast('seal', wh);
    const st = await until(() => K.fx.find(f => f.k === 'mobStop' && f.m === wh.id && f.mk === 'song'), 2000); ok(st, '唱歌被控場招打中就斷'); ok(K.mobs.get(wh.id).fl & 2048 || await until(() => K.mobs.get(wh.id).fl & 2048, 800), '被打斷會委屈一下');
    await wait(4000); clearInterval(keep); await K.ask('cb:dbg', { lv: 99 }); K.fx.length = 0; await K.ask('cb:dbg', { whale: 'song' }); await until(() => seen('tele', 'song', wh.id), 2000); const hp0 = K.me.hp;
    ok(await until(() => seen('mobMove', 'song', wh.id), 7000), '沒人打斷就會唱完'); await wait(400); ok(K.me.hp <= hp0 - K.me.hpMax * 0.4, '唱完全場重傷：' + hp0 + ' → ' + K.me.hp);
    K.s.emit('cb:target', null); K.s.close();
  }
  // ---- 星砂海岸：螢光水母、寄居寶箱蟹、小海妖、黑潮人魚 ----
  if (!process.env.ONLY || process.env.ONLY === 'coast') {
    const until = async (fn, ms) => { for (let i = 0; i < ms / 100; i++) { const v = fn(); if (v) return v; await wait(100); } return null; };
    const K = await player(); await K.ask('cb:dbg', { lv: 60 }); await K.ask('cb:school', 'pm'); await K.ask('cb:slots', ['bubble', 'potion', 'spark', null]);
    const seen = (k, mk, id) => K.fx.find(f => f.k === k && f.mk === mk && f.m === id), keep = setInterval(() => K.s.emit('cb:dbg', { hp: 1 }), 1200), hitMe = () => K.hits.some(h => h[0] === 'p:' + K.s.id && h[1] > 0);
    const poke = async (mo) => { K.fx.length = 0; K.hits.length = 0; K.s.emit('cb:target', mo.id); await until(() => K.mobs.get(mo.id).hp < mo.max, 5000); K.s.emit('cb:target', null); };
    const kinds = ['jelly', 'crab', 'siren', 'mermaid'].map(k => [...K.mobs.values()].filter(m => m.kind === k).length).join(); ok(kinds === '10,10,10,1', '星砂海岸有螢光水母、寄居寶箱蟹、小海妖各十隻和一隻黑潮人魚：' + kinds);
    // 水母：靠近會放電，被電到變慢
    const je = K.mob('jelly', 9); K.at(je.x + 2, je.z); await wait(200); await poke(je); const z1 = await until(() => seen('tele', 'zap', je.id), 14000); ok(z1 && z1.r > 0, '螢光水母放電之前有預告');
    ok(await until(() => seen('mobMove', 'zap', je.id), 3000), '螢光水母放電'); ok(await until(() => K.me.slow === 1, 1500), '被電到會麻一下（變慢）'); K.at(je.x + 50, je.z - 30); await wait(5600);
    // 寶箱蟹：正面打不動，繞到背後才打得進去
    await K.ask('cb:dbg', { lv: 75 }); const cr = K.mob('crab', 9); K.at(cr.x, cr.z + 5); await wait(200); await poke(cr); await wait(2500); K.hits.length = 0; K.s.emit('cb:target', cr.id);
    const front = await until(() => K.hits.find(h => h[0] === cr.id && h[2] === 'shell'), 5000); ok(front, '從正面打寄居寶箱蟹，幾乎打不動：' + (front && front[1]));
    const s1 = await until(() => seen('tele', 'snap', cr.id), 12000); ok(s1 && s1.x2 != null, '寄居寶箱蟹夾人之前有預告');
    const cp = K.mobs.get(cr.id), dx = cp.x - (cr.x), dz = cp.z - (cr.z + 5), l = Math.hypot(dx, dz) || 1; K.hits.length = 0; K.at(cp.x + dx / l * 3, cp.z + dz / l * 3);   // 趁牠舉螯的時候繞到背後
    const back = await until(() => K.hits.find(h => h[0] === cr.id && h[2] !== 'shell' && h[1] > 0), 3000); ok(back && front && back[1] > front[1] * 2.5, '繞到背後就打得進去：' + (back && back[1]));
    K.s.emit('cb:target', null); K.at(cr.x + 60, cr.z - 60); await wait(5600);
    // 小海妖：泡泡把人包起來，隊友放招可以弄破
    await K.ask('cb:dbg', { lv: 90 }); const H = await player(); await H.ask('cb:dbg', { lv: 90 }); await H.ask('cb:school', 'pm'); await H.ask('cb:slots', ['bubble', 'potion', 'spark', null]);
    const si = K.mob('siren', 9); K.at(si.x + 5, si.z); H.at(si.x + 7, si.z + 2); await wait(200); await poke(si); const b1 = await until(() => seen('tele', 'bub', si.id), 16000); ok(b1 && b1.to === K.s.id, '小海妖吹泡泡之前有預告');
    ok(await until(() => K.me.bub === 1, 3000), '被泡泡包住'); const hp1 = K.mobs.get(si.id).hp; K.s.emit('cb:target', si.id); await wait(1300); ok(K.mobs.get(si.id).hp === hp1, '在泡泡裡不能打');
    await H.cast('potion'); ok(await until(() => K.me.bub === 0, 800), '隊友放招，泡泡就破了'); K.s.emit('cb:target', null); K.at(si.x + 60, si.z - 80); H.at(si.x + 60, si.z - 80); await wait(5600);
    // 黑潮人魚：護身、擱淺、魅惑
    await K.ask('cb:dbg', { lv: 99 }); await H.ask('cb:dbg', { lv: 99 }); const me = K.mob('mermaid'); K.at(me.x + 5, me.z); H.at(me.x + 9, me.z + 3); await wait(200); K.hits.length = 0; K.s.emit('cb:target', me.id);
    const g1 = await until(() => K.hits.find(h => h[0] === me.id && h[1] > 0), 4000); ok(K.mobs.get(me.id).fl & 8192, '黑潮人魚平常有黑潮護身');
    await K.ask('cb:dbg', { mermaid: 'ebb' }); ok(await until(() => seen('mobMove', 'ebb', me.id), 2000), '退潮擱淺'); await wait(300); K.hits.length = 0;
    const g2 = await until(() => K.hits.find(h => h[0] === me.id && h[1] > 0 && h[2] === 'hit'), 3000); ok(g1 && g2 && g2[1] > g1[1] * 4 && !(K.mobs.get(me.id).fl & 8192), '擱淺的時候沒有護身，受傷多很多：' + (g1 && g1[1]) + ' → ' + (g2 && g2[1]));
    await wait(6200); K.fx.length = 0; await K.ask('cb:dbg', { mermaid: 'charm' }); const c1 = await until(() => seen('tele', 'charm', me.id), 2500); ok(c1, '黑潮人魚魅惑之前有預告');
    const who = c1 && c1.to === K.s.id ? K : H, other = who === K ? H : K; ok(await until(() => who.me.charm === 1, 3000), '被魅惑了'); await other.cast('potion'); ok(await until(() => who.me.charm === 0, 800), '隊友放招就叫醒了');
    clearInterval(keep); K.s.emit('cb:target', null); K.s.close(); H.s.close();
  }
  // ---- 組隊、出力、倒下 ----
  if (!process.env.ONLY || process.env.ONLY === 'party') {
    const until = async (fn, ms) => { for (let i = 0; i < ms / 100; i++) { const v = fn(); if (v) return v; await wait(100); } return null; };
    const X = await player(), Y = await player(), Z = await player(); await X.ask('cb:dbg', { lv: 12 }); await Y.ask('cb:dbg', { lv: 12 }); await Y.ask('cb:school', 'pm'); await Y.ask('cb:slots', ['potion', 'bubble', 'spark', null]);
    const mossAt = (i) => X.mob('moss', i), kill = async (P, m) => { P.at(m.x + 3, m.z); await wait(200); P.s.emit('cb:target', m.id); await until(() => P.mobs.get(m.id).hp === 0, 12000); P.s.emit('cb:target', null); await wait(300); };
    ok((await X.ask('cb:pinvite', X.s.id)).error, '不能邀請自己');
    ok((await X.ask('cb:pinvite', Y.s.id)).ok && await until(() => Y.inv.length, 1000), '邀請會送到對方那邊：' + (Y.inv[0] && Y.inv[0].name));
    ok((await Z.ask('cb:pinvite', Y.s.id)).error, '對方正在考慮別人的邀請時不能再邀');
    ok((await Y.ask('cb:panswer', { from: X.s.id, yes: 1 })).ok && await until(() => X.party && Y.party && X.party.m.length === 2, 1500), '答應以後兩個人在同一隊');
    ok(X.party.leader === X.s.id && X.party.share === 1 && X.party.m.every(m => m.name && m.hpMax > 0 && m.mpMax > 0), '隊伍名單有名字、血量、魔量，邀請的人是隊長，預設經驗平分');
    ok((await Z.ask('cb:pinvite', Y.s.id)).error, '已經有隊伍的人不能再被邀');
    ok((await Y.ask('cb:pshare', 0)).error, '只有隊長可以改經驗怎麼分');
    // 均分：沒出手的隊友站在附近也有經驗；人多有加成
    let m = mossAt(3); Y.at(m.x + 6, m.z + 2); await wait(200); let x0 = X.me.exp, y0 = Y.me.exp, ym = Y.me.schools.pm.m; await kill(X, m);
    const dx = X.me.exp - x0, dy = Y.me.exp - y0; ok(dx > 0 && dy > 0 && Math.abs(dx - dy) <= 1, '均分：出手的和沒出手的拿一樣多：' + dx + ' / ' + dy); ok(Y.me.schools.pm.m === ym, '沒出力的人沒有熟練度');
    // 各自：沒出手就沒有；補血算出力，有經驗也有熟練度
    ok((await X.ask('cb:pshare', 0)).ok && await until(() => Y.party.share === 0, 1500), '隊長改成各拿各的'); m = mossAt(4); Y.at(m.x + 6, m.z + 2); await wait(200); y0 = Y.me.exp; await kill(X, m); ok(Y.me.exp === y0, '各自：沒出手的沒有經驗');
    m = mossAt(5); Y.at(m.x + 4, m.z + 1); X.at(m.x + 3, m.z); await wait(200); y0 = Y.me.exp; ym = Y.me.schools.pm.m; X.s.emit('cb:target', m.id); await until(() => X.hits.some(h => h[0] === m.id), 3000); Y.s.emit('cb:cast', { i: 0 });
    await until(() => X.mobs.get(m.id).hp === 0, 12000); await wait(300); X.s.emit('cb:target', null); ok(Y.me.exp > y0 && Y.me.schools.pm.m === ym + 1, '只補血沒打怪也算出力：有經驗、有熟練度');
    // 倒下：附近有隊友就多等一下，隊友補血可以救起來，不扣經驗
    await wait(5500); await X.ask('cb:dbg', { exp: 200 }); const big = [...X.mobs.values()].filter(q => q.kind === 'deer' && q.lv >= 50 && q.hp > 0)[0]; X.at(big.x + 2, big.z); Y.at(big.x + 9, big.z + 9); await wait(200); X.fx.length = 0; X.s.emit('cb:target', big.id);
    ok(await until(() => X.me.dead > 0, 20000), '被打倒了'); const left = X.me.dead - X.me.t; ok(left > 8000, '附近有隊友，倒下後等久一點讓人來救：' + Math.round(left / 1000) + ' 秒');
    Y.at(X.me && big.x + 2.5, big.z + 0.5); await wait(300); Y.s.emit('cb:cast', { i: 0 }); ok(await until(() => X.fx.find(f => f.k === 'rise' && f.id === X.s.id), 2000) && await until(() => X.me.dead === 0 && X.me.hp > 0, 1500), '隊友的補血招把人救起來');
    ok(X.me.exp === 200 && !X.back.length, '被救起來不扣經驗、不用回入口'); X.at(8, 14); Y.at(8, 15); await wait(400);
    // 一個人倒下：幾秒後回入口，扣一成
    ok((await Y.ask('cb:pleave')).ok && await until(() => !X.party && !Y.party, 1500), '剩一個人的時候隊伍就散了'); await wait(5500); await X.ask('cb:dbg', { exp: 200 }); await X.ask('cb:dbg', { hp: 1 });
    X.at(big.x + 2, big.z); await wait(200); X.s.emit('cb:target', big.id); ok(await until(() => X.me.dead > 0, 20000) && X.me.dead - X.me.t < 5000, '自己一個人倒下，等的時間短');
    const bk = await until(() => X.back[0], 7000); ok(bk && bk.lose === 20 && await until(() => X.me.exp === 180, 1500), '回到入口，扣掉這一級累積經驗的一成：' + (bk && bk.lose));
    await X.ask('cb:dbg', { lv: 5 }); await X.ask('cb:dbg', { exp: 50 }); X.back.length = 0; await wait(300); X.at(big.x + 2, big.z); await wait(200); X.s.emit('cb:target', big.id); const b2 = await until(() => X.back[0], 30000); ok(b2 && b2.lose === 0, '10 等以下倒下不扣經驗');
    // 王的血量跟著隊伍人數
    await wait(5500); await X.ask('cb:dbg', { lv: 99 }); await X.ask('cb:pinvite', Y.s.id); await Y.ask('cb:panswer', { from: X.s.id, yes: 1 }); await X.ask('cb:pinvite', Z.s.id); await Z.ask('cb:panswer', { from: X.s.id, yes: 1 }); await until(() => X.party && X.party.m.length === 3, 1500);
    const el = [...X.mobs.values()].find(q => q.kind === 'elder'), keep = setInterval(() => X.s.emit('cb:dbg', { hp: 1 }), 1200); [X, Y, Z].forEach((P, i) => P.at(el.x + 6, el.z + i)); await wait(300); X.fx.length = 0; X.s.emit('cb:target', el.id);
    const mx = await until(() => X.fx.find(f => f.k === 'mobMax' && f.m === el.id), 4000); ok(mx && mx.max === Math.round(el.max * (1 + C3.PARTY.boss * 2)), '三個人一隊去打，老樹公的血變多：' + el.max + ' → ' + (mx && mx.max));
    X.s.emit('cb:target', null); clearInterval(keep); [X, Y, Z].forEach(P => P.s.close());
  }
  // 被怪打會扣血，倒下後回到入口
  const Bp = await player(); await Bp.ask('cb:dbg', { lv: 2 }); const w = [...Bp.mobs.values()].filter(m => m.kind === 'deer' && m.lv >= 50 && m.hp > 0).pop(); Bp.at(w.x + 1, w.z); await wait(200); Bp.s.emit('cb:target', w.id);
  let back = null; Bp.s.on('cb:back', (p) => { back = p; });
  for (let i = 0; i < 100 && !back; i++) await wait(200);
  if (!back) console.log(JSON.stringify([Bp.me, Bp.hits.slice(0, 5), Bp.fx.slice(0, 5), Bp.mobs.get(w.id)]));
  ok(Bp.fx.some(f => f.k === 'down') && back, '血量歸零會倒下，幾秒後回到練習場入口');
  Bp.s.close();
  console.log(failed ? '\n有 ' + failed + ' 項沒過' : '\n全部通過'); process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
