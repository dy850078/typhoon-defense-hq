// 3D 新世界的戰鬥：練習場的怪、點怪自動普攻、四顆技能鈕、等級和職業
// 都在 /newworld 這個頻道裡，跟總部（2D）的戰鬥、等級、職業完全分開
// 存檔放在帳號的 save.nw：lv、exp、school、spec、schools、slots、quest（同一個物件裡別的欄位是背包那邊的，寫回去時要留著）
const C3 = require('./shared/classes3d.js');
const { SK, SPECS, SCHOOLS, LEVEL, GATE, QUEST, QUEST_RATE, MOBS, FAMILIARS } = C3;
const { PARTY, DOWN } = C3;
const NEVER = 8e15;   // 花平常是「倒下」的，等老樹公叫出來

// 練習場在前院的東邊：四塊地，越遠的怪越強；中間是大石偶
const FIELD = { x0: 17, x1: 66, z0: -6, z1: 60, gate: { x: 15, z: 14 } };
// 霧林：苔球、傘菇精、露水靈各一區，中間是老樹公。src 是三轉信物算哪一種怪掉的（沒寫就是怪的種類）
// 霧林深處是三種怪混在一起的高等區，等雲海高原開了就會搬過去
const ZONES = [
  { kind: 'moss', x: 26, z: 12, lv: [1, 1, 2, 2, 3, 4, 5, 6, 7, 8] },
  { kind: 'puff', x: 26, z: 44, lv: [9, 10, 11, 12, 13, 14, 15, 16, 18, 19] },
  { kind: 'dew', x: 54, z: 46, lv: [20, 21, 22, 24, 25, 26, 28, 30] },
  { kinds: ['moss', 'puff', 'dew'], src: 'deep', x: 54, z: 10, lv: [32, 34, 36, 38, 40, 43, 46, 49, 52, 55] },
  { kind: 'elder', src: 'boss', x: 41, z: 28, lv: [30] },
  { kind: 'bloom', x: 41, z: 28, lv: [30, 30, 30] },
];
const TICK = 100, rnd = (a, b) => a + Math.random() * (b - a), dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

module.exports = function attach(nw, env) {
  const { accounts, players } = env, now = () => Date.now();
  const mobs = [], zones = [], byId = new Map();
  let hits = [], seq = 1;
  ZONES.forEach((z, zi) => z.lv.forEach((lv, i) => {
    const kind = z.kinds ? z.kinds[i % z.kinds.length] : z.kind, d = MOBS[kind], a = i / z.lv.length * Math.PI * 2 + zi, r = d.boss ? 0 : d.add ? 4.5 : 3 + (i % 3) * 3.2;
    const m = { id: 'm' + (mobs.length + 1), kind, src: z.src || kind, lv, sx: z.x + Math.cos(a) * r, sz: z.z + Math.sin(a) * r, max: Math.round(LEVEL.hp(lv) * d.hp), atk: LEVEL.atk(lv) * d.atk, st: {}, dmgBy: new Map(), dmgAmt: new Map(), helpBy: new Map() }; m.max0 = m.max;
    m.x = m.sx; m.z = m.sz; m.hp = m.max; m.tx = m.x; m.tz = m.z; m.wait = rnd(0, 4); m.next = 0; m.dead = d.add ? NEVER : 0; m.sent = ''; m.mcd = 0;
    mobs.push(m); byId.set(m.id, m);
  }));
  const ELDER = mobs.find(m => m.kind === 'elder'), BLOOMS = mobs.filter(m => m.kind === 'bloom');
  const alive = (m) => m && !m.dead;
  const near = (x, z, r, skip) => mobs.filter(m => alive(m) && m !== skip && Math.hypot(m.x - x, m.z - z) <= r + MOBS[m.kind].r);
  const ctrl = (m, s) => (MOBS[m.kind].boss ? s * 0.3 : s);   // 大石偶被控制的時間只有三成
  const each = (fn) => players.forEach(p => { if (p.cb) fn(p, p.cb); });
  const fx = (o) => nw.emit('cb:fx', o);
  const meView = (c) => ({ lv: c.lv, exp: c.exp, need: LEVEL.expFor(c.lv), hp: Math.round(c.hp), hpMax: c.hpMax, mp: Math.round(c.mp), mpMax: c.mpMax, school: c.school, spec: c.spec, schools: c.schools, slots: c.slots, keys: c.keys, quest: c.quest,
    slow: c.drowsy > now() ? 1 : 0, pois: c.pois > now() ? 1 : 0, cd: c.cd, stage: Object.keys(c.stage).reduce((o, k) => { if (c.stage[k].until > now()) o[k] = c.stage[k].until; return o; }, {}), dead: c.dead > now() ? c.dead : 0, t: now() });
  const who = (p) => ({ id: p.id, lv: p.cb.lv, school: p.cb.school, spec: p.cb.spec, hp: Math.round(p.cb.hp), hpMax: p.cb.hpMax, fam: p.cb.fam.map(f => f.tier), mech: mechOf(p.cb) });
  const mechOf = (c) => (c.spec !== 'alchemist' ? 0 : c.buff.fear > now() ? 3 : c.buff.mech > now() ? 2 : 1);
  const tell = (p) => { p.cb.dirty = true; };
  const whoAll = (p) => nw.emit('cb:who', who(p));
  function stats(c) { c.hpMax = LEVEL.hp(c.lv); c.mpMax = LEVEL.mp(c.lv); c.hp = Math.min(c.hp, c.hpMax); c.mp = Math.min(c.mp, c.mpMax); }
  function save(p) { const c = p.cb, u = p.cbUser; if (!u || !c.changed) return; c.changed = false;
    accounts.update(u, { nw: Object.assign({}, u.save.nw, { lv: c.lv, exp: c.exp, school: c.school, spec: c.spec, schools: c.schools, slots: c.slots, keys: c.keys, quest: c.quest }) }); }

  // ---- 傷害、補血、狀態 ----
  function atkOf(c) { return LEVEL.atk(c.lv) * (1 + (c.buff.atk > now() ? c.buff.atkV : 0)); }
  function hurt(m, amount, p, kind, noShare) {
    if (!alive(m) || m.st.sealed > now() && kind !== 'box') return 0;
    const t = now(); let d = amount * (1 + (m.st.vuln > t ? m.st.vulnV : 0)) * (m.st.tidy > t ? 2 : 1) * rnd(0.92, 1.08); d = Math.max(1, Math.round(d));
    m.hp -= d; hits.push([m.id, d, kind || '']);
    if (p) { m.dmgBy.set(p.id, t); m.dmgAmt.set(p.id, (m.dmgAmt.get(p.id) || 0) + d); if (!m.aggro || !players.get(m.aggro) || m.st.charm) m.aggro = p.id; if (kind !== 'dot') p.cb.fight = t + 5000;
      const B = MOBS[m.kind].bounce; if (B && kind === 'hit' && !m.cast && !m.dash && !(m.st.root > t || m.st.stun > t || m.st.freeze > t)) { const l = Math.hypot(m.x - p.x, m.z - p.z) || 1; m.x += (m.x - p.x) / l * B; m.z += (m.z - p.z) / l * B; } }
    if (!noShare && m.st.link > t) mobs.forEach(o => { if (o !== m && alive(o) && o.st.link > t && o.st.linkG === m.st.linkG) hurt(o, d * (m.st.linkV || 0.5) / (1 + (o.st.vuln > t ? o.st.vulnV : 0)), p, 'link', true); });
    if (m.hp <= 0) die(m);
    return d;
  }
  function die(m) {
    const t = now(), d = MOBS[m.kind]; m.dead = d.add ? NEVER : t + (d.boss ? 90000 : 9000); m.hp = 0; m.st = {}; m.aggro = null; m.cast = null; m.dash = null;
    if (m === ELDER) { m.roots = null; m.sized = 0; if (m.max !== m.max0) { m.max = m.max0; fx({ k: 'mobMax', m: m.id, max: m.max }); } setFog(false); BLOOMS.forEach(b => { if (alive(b)) { b.dead = NEVER; b.hp = 0; b.st = {}; fx({ k: 'die', m: b.id }); } }); }
    if (d.add) { m.dmgBy.clear(); m.dmgAmt.clear(); m.helpBy.clear(); return fx({ k: 'die', m: m.id }); }
    // 有出力的人：打過牠的，加上在旁邊補血、上護盾、控場、挨打的（helpBy）
    const who2 = new Map(); let total = 0;
    m.dmgBy.forEach((at, pid) => { const p = players.get(pid); if (p && p.cb && t - at <= 20000) { const a = m.dmgAmt.get(pid) || 0; who2.set(pid, a); total += a; } });
    m.helpBy.forEach((at, pid) => { const p = players.get(pid); if (p && p.cb && t - at <= 20000 && !who2.has(pid)) who2.set(pid, 0); });
    const base = (c) => { const gap = c.lv - m.lv; return (8 + 3 * m.lv) * (d.boss ? 12 : 1) * (gap > 20 ? 0.1 : gap > 10 ? 0.3 : 1); }, part = (pid) => (total > 0 ? who2.get(pid) / total : 1 / who2.size);
    const exp = new Map(), pools = new Map();
    who2.forEach((a, pid) => { const p = players.get(pid), P = partyOf(p);
      if (P && P.share) pools.set(P, (pools.get(P) || 0) + part(pid)); else exp.set(pid, Math.max(part(pid), who2.size > 1 ? 0.3 : 1)); });   // 各自：照打掉的血量分，只幫忙沒打的也有三成
    // 均分：這一隊打掉的份，加上人多的加成，附近活著的隊友平分（沒出手的也有）
    pools.forEach((sh, P) => { const near = [...P.m].map(id => players.get(id)).filter(q => q && q.cb && q.cb.dead <= t && dist(q, m) <= PARTY.near); if (!near.length) return;
      const each2 = sh * (1 + PARTY.bonus * (near.length - 1)) / near.length; near.forEach(q => exp.set(q.id, (exp.get(q.id) || 0) + each2)); });
    exp.forEach((k, pid) => { const p = players.get(pid); gain(p, Math.max(1, Math.round(base(p.cb) * k))); p.cb.changed = true; tell(p); });
    who2.forEach((a, pid) => { const p = players.get(pid), c = p.cb;
      if (c.school) { const s = c.schools[c.school]; s.m = Math.min(GATE.mastery, (s.m || 0) + (d.boss ? 10 : 1)); }
      if (c.quest && Math.random() < QUEST_RATE[m.src]) { const q = QUEST[c.quest.spec], i = q.findIndex(x => x[2] === m.src);
        if (i >= 0 && c.quest.got[i] < q[i][1]) { c.quest.got[i]++; p.cbSock.emit('cb:loot', { name: q[i][0], n: c.quest.got[i], of: q[i][1] }); } }
      c.changed = true; tell(p); });
    m.dmgBy.clear(); m.dmgAmt.clear(); m.helpBy.clear(); fx({ k: 'die', m: m.id });
    // 掉東西：一隻怪就掉牠那一份，掉在地上，誰先撿就是誰的
    const dr = d.drop; if (dr && Math.random() < dr.p) for (let i = 0; i < (dr.n || 1); i++) { const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * (d.boss ? 1.8 : 0.7);
      const o = { id: 'd' + seq++, k: dr.pool[Math.floor(Math.random() * dr.pool.length)], x: +(m.x + Math.cos(a) * r).toFixed(2), z: +(m.z + Math.sin(a) * r).toFixed(2), until: t + C3.DROP_MS }; drops.set(o.id, o); nw.emit('cb:drop', dropView(o)); }
  }
  const drops = new Map(), dropView = (o) => ({ id: o.id, k: o.k, x: o.x, z: o.z, left: Math.max(0, o.until - now()) });
  function gain(p, n) { const c = p.cb; if (c.lv >= LEVEL.max) return; c.exp += n; let up = false;
    while (c.lv < LEVEL.max && c.exp >= LEVEL.expFor(c.lv)) { c.exp -= LEVEL.expFor(c.lv); c.lv++; up = true; }
    if (up) { stats(c); c.hp = c.hpMax; c.mp = c.mpMax; fx({ k: 'lvup', id: p.id, lv: c.lv }); whoAll(p); } }
  function heal(p, amount) { const c = p.cb; if (c.dead > now()) return; if (c.pois > now()) { c.pois = 0; tell(p); } c.clean = now() + MOBS.elder.fog.clean * 1000; /* 補血招順便解毒，接下來幾秒不會再中 */ const v = Math.round(Math.min(c.hpMax - c.hp, amount)); if (v <= 0) return; c.hp += v; hits.push(['p:' + p.id, -v, 'heal']); tell(p); }
  function allies(x, z, r) { const out = []; each((p, c) => { if (c.dead <= now() && Math.hypot(p.x - x, p.z - z) <= r) out.push(p); }); return out; }
  function hitPlayer(p, amount, m) { const c = p.cb, t = now(); if (c.dead > t) return;
    let d = amount * (1 - (c.buff.guard > t ? c.buff.guardV : 0)) * (c.buff.bond > t && c.fam.length ? 0.7 : 1); d = Math.max(1, Math.round(d * rnd(0.9, 1.1)));
    c.hp -= d; c.fight = t + 5000; hits.push(['p:' + p.id, d, 'ow']); if (m && m.helpBy) m.helpBy.set(p.id, t);
    if (c.hp <= 0) down(p);
    tell(p); }
  function down(p) { const c = p.cb, t = now(), P = partyOf(p), mate = P && [...P.m].some(id => { const q = players.get(id); return q && q !== p && q.cb && q.cb.dead <= t && dist(q, p) <= PARTY.near; });
    c.hp = 0; c.dead = t + (mate ? DOWN.help : DOWN.wait) * 1000; c.target = null; c.fam = []; c.pois = 0; c.drowsy = 0; mobs.forEach(o => { if (o.aggro === p.id) o.aggro = null; }); fx({ k: 'down', id: p.id }); whoAll(p); }
  // 隊友的補血招可以把倒下的人救起來（不用回入口，也不扣經驗）
  function raise(by, x, z, r) { const t = now(); let n = 0; each((q, c) => { if (q !== by && c.dead > t && Math.hypot(q.x - x, q.z - z) <= r) { c.dead = 0; c.hp = Math.round(c.hpMax * DOWN.up); c.fight = t + 3000; n++; fx({ k: 'rise', id: q.id, by: by.id }); whoAll(q); tell(q); } }); return n; }
  // 出力：在還在打的怪旁邊放招（補血、護盾、控場都算），這隻怪倒下時就有份
  function credit(p) { const t = now(); mobs.forEach(m => { if (alive(m) && (m.aggro || m.dmgBy.size) && dist(m, p) <= 16) m.helpBy.set(p.id, t); }); }

  // ---- 組隊 ----
  const parties = new Map(); let pseq = 1;
  const partyOf = (p) => (p && p.cb && p.cb.party ? parties.get(p.cb.party) || null : null);
  const pView = (P) => ({ id: P.id, leader: P.leader, share: P.share ? 1 : 0, m: [...P.m].map(id => { const q = players.get(id), c = q && q.cb; return c ? { id, name: q.name || '', lv: c.lv, school: c.school, spec: c.spec, hp: Math.round(c.hp), hpMax: c.hpMax, mp: Math.round(c.mp), mpMax: c.mpMax, dead: c.dead > now() ? 1 : 0 } : null; }).filter(Boolean) });
  const pSend = (P, force) => { const v = pView(P), k = JSON.stringify(v); if (!force && k === P.sent) return; P.sent = k; P.m.forEach(id => { const q = players.get(id); if (q && q.cbSock) q.cbSock.emit('cb:party', v); }); };
  const say = (p, text) => { if (p && p.cbSock) p.cbSock.emit('cb:say', text); };
  function pLeave(p, why) { const P = partyOf(p); if (!P) return; P.m.delete(p.id); p.cb.party = null; if (p.cbSock) p.cbSock.emit('cb:party', null);
    P.m.forEach(id => say(players.get(id), (p.name || '隊友') + (why || '離開隊伍了')));
    if (P.m.size < 2) { P.m.forEach(id => { const q = players.get(id); if (q && q.cb) { q.cb.party = null; q.cbSock.emit('cb:party', null); } }); parties.delete(P.id); return; }
    if (P.leader === p.id) P.leader = [...P.m][0]; pSend(P, true); }

  // ---- 怪的招：先預告（cb:fx tele），時間到才生效（cb:fx mobMove）----
  const F1 = (v) => +v.toFixed(1);
  const BEGIN = {
    roll: (m, mv, p) => { const l = dist(p, m) || 1, x2 = m.x + (p.x - m.x) / l * mv.len, z2 = m.z + (p.z - m.z) / l * mv.len; return { x2, z2 }; },
    spore: (m) => ({ x: m.x, z: m.z }),
    mend: (m, mv) => { const o = mobs.filter(x => alive(x) && x !== m && !MOBS[x.kind].add && x.hp < x.max * 0.8 && dist(x, m) <= mv.r).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; return o ? { to: o.id } : null; },
  };
  const MOVE = {
    roll: (m, mv, c) => { m.dash = { x0: m.x, z0: m.z, x1: c.x2, z1: c.z2, t0: now(), t1: now() + 450, hit: new Set(), mv }; },
    spore: (m, mv, c) => { zones.push({ k: 'spore', id: 'z' + seq++, x: c.x, z: c.z, r: mv.r, until: now() + mv.dur * 1000, next: 0, atk: m.atk, mv }); m.st.tidy = now() + mv.tidy * 1000; },
    mend: (m, mv, c) => { const o = byId.get(c.to); if (!alive(o)) return; const v = Math.round(Math.min(o.max - o.hp, o.max * mv.heal)); if (v > 0) { o.hp += v; hits.push([o.id, -v, 'heal']); } },
  };
  function tryMove(m, d, p, t) { const mv = d.move; if (!mv || m.mcd > t || dist(p, m) > mv.range) return false; const c = BEGIN[mv.k](m, mv, p); if (!c) { m.mcd = t + 1500; return false; }
    m.cast = Object.assign(c, { k: mv.k, until: t + mv.tele * 1000 }); m.mcd = t + mv.cd * 1000 * rnd(0.85, 1.2);
    fx({ k: 'tele', mk: mv.k, m: m.id, x: F1(m.x), z: F1(m.z), x2: c.x2 != null ? F1(c.x2) : undefined, z2: c.z2 != null ? F1(c.z2) : undefined, r: mv.r, w: mv.w, to: c.to, dur: mv.tele }); return true; }
  // 老樹公：樹根、開花、毒霧
  let FOG = false; const setFog = (on) => { if (FOG === on) return; FOG = on; fx({ k: 'fog', on: on ? 1 : 0, x: ELDER.sx, z: ELDER.sz, r: MOBS.elder.fog.r }); };
  function elder(m, d, t, sec) {
    const R = d.roots, B = d.blooms, near2 = []; each((p, c) => { if (c.dead <= t && dist(p, m) <= R.far) near2.push(p); });
    if (m.roots && m.roots.until <= t) { const g = m.roots; m.roots = null; each((p, c) => { if (c.dead <= t && g.spots.some(s => Math.hypot(p.x - s[0], p.z - s[1]) <= R.r)) hitPlayer(p, m.atk * R.dmg, m); }); fx({ k: 'mobMove', mk: 'roots', m: m.id, spots: g.spots, r: R.r }); }
    // 王的血量跟著來打牠的那一隊人數調整：滿血剛開打的時候定下來，沒人打了就變回原樣
    if (m.aggro && !m.sized) { const P = partyOf(players.get(m.aggro)), n2 = P ? [...P.m].filter(id => { const q = players.get(id); return q && q.cb && dist(q, m) <= PARTY.near; }).length : 1, max = Math.round(m.max0 * (1 + PARTY.boss * (Math.max(1, n2) - 1)));
      m.sized = 1; if (max !== m.max) { m.hp = Math.round(m.hp / m.max * max); m.max = max; m.sent = ''; fx({ k: 'mobMax', m: m.id, max }); } }
    else if (!m.aggro && m.sized && m.hp >= m.max) { m.sized = 0; if (m.max !== m.max0) { m.max = m.max0; m.hp = m.max; m.sent = ''; fx({ k: 'mobMax', m: m.id, max: m.max }); } }
    if (m.aggro && near2.length) {
      if (!m.roots && (m.rcd || 0) <= t) { m.rcd = t + R.cd * 1000; const spots = near2.slice(0, 4).map(p => [F1(p.x), F1(p.z)]); for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28, r = 3 + Math.random() * 5; spots.push([F1(m.x + Math.cos(a) * r), F1(m.z + Math.sin(a) * r)]); }
        m.roots = { until: t + R.tele * 1000, spots }; fx({ k: 'tele', mk: 'roots', m: m.id, spots, r: R.r, dur: R.tele }); }
      if (!m.bcd) m.bcd = t + 8000;
      if (m.bcd <= t) { m.bcd = t + B.cd * 1000; const free = BLOOMS.filter(b => !alive(b)).slice(0, Math.max(0, Math.min(B.n, B.max - BLOOMS.filter(alive).length)));
        free.forEach((b, i) => { const a = Math.random() * 6.28, r = 3.5 + Math.random() * 2; b.x = b.sx = m.x + Math.cos(a) * r; b.z = b.sz = m.z + Math.sin(a) * r; b.tx = b.x; b.tz = b.z; b.dead = 0; b.hp = b.max; b.st = {}; b.sent = ''; fx({ k: 'mobMove', mk: 'bloom', m: b.id, x: F1(b.x), z: F1(b.z) }); }); }
    } else if (!m.aggro) { m.bcd = 0; if (m.hp >= m.max) BLOOMS.forEach(b => { if (alive(b)) { b.dead = NEVER; b.hp = 0; fx({ k: 'die', m: b.id }); } }); }
    if (sec) { const n = BLOOMS.filter(alive).length; if (n && m.hp < m.max) { const v = Math.round(m.max * MOBS.bloom.heal * n); m.hp = Math.min(m.max, m.hp + v); hits.push([m.id, -v, 'heal']); }
      if (m.hp <= m.max * d.fog.at) setFog(true); else if (!m.aggro) setFog(false);   // 起霧以後要等牠沒在打架才會散
      if (FOG) each((p, c) => { if (c.dead <= t && Math.hypot(p.x - m.sx, p.z - m.sz) <= d.fog.r && !(c.clean > t) && !(c.pois > t + 1500)) { const was = c.pois > t; c.pois = t + 3000; if (!was) tell(p); } }); }
  }

  // ---- 招式 ----
  const aoe = (p, x, z, r, mul, kind, each2) => near(x, z, r).forEach(m => { hurt(m, atkOf(p.cb) * mul, p, kind); if (each2 && alive(m)) each2(m); });
  const CAST = {
    spark: (p, c, s, m) => { hurt(m, atkOf(c) * s.dmg, p, 'fire'); },
    blink: () => {},
    bubble: (p, c, s, m) => { const t = now(); near(m.x, m.z, s.r).forEach(o => { hurt(o, atkOf(c) * s.dmg, p, 'poison'); if (alive(o)) o.st.poison = { until: t + s.dur * 1000, dps: atkOf(c) * s.dot, by: p.id }; }); },
    potion: (p, c, s) => { const a = allies(p.x, p.z, s.r).sort((a, b) => a.cb.hp / a.cb.hpMax - b.cb.hp / b.cb.hpMax)[0] || p; heal(a, a.cb.hpMax * s.heal); raise(p, p.x, p.z, s.r); return { to: a.id }; },
    heart: (p, c, s) => { raise(p, p.x, p.z, s.r); allies(p.x, p.z, s.r).forEach(a => heal(a, a.cb.hpMax * s.heal)); },
    scent: (p, c, s) => { const t = now() + s.dur * 1000; near(p.x, p.z, s.r).forEach(m => { m.st.weak = t; m.st.weakV = s.weak; m.st.vuln = t; m.st.vulnV = Math.max(m.st.vulnV || 0, s.vuln); if (!m.aggro) m.aggro = p.id; }); },
    waltz: (p, c, s) => { const t = now() + s.dur * 1000; aoe(p, p.x, p.z, s.r, s.dmg, 'ice', m => { m.st.slow = t; m.st.slowV = s.slow; }); },
    ball: (p, c, s) => { aoe(p, p.x, p.z, s.r, s.dmg, 'ice', m => { m.st.freeze = now() + ctrl(m, s.freeze) * 1000; }); },
    corrode: (p, c, s, m) => { const t = now() + s.dur * 1000; hurt(m, atkOf(c) * s.dmg, p, 'poison'); if (alive(m)) { m.st.poison = { until: t, dps: atkOf(c) * s.dot, by: p.id }; m.st.vuln = t; m.st.vulnV = Math.max(m.st.vulnV || 0, s.vuln); } },
    firework: (p, c, s, m) => { const t = now(); near(m.x, m.z, s.r).forEach(o => hurt(o, atkOf(c) * s.dmg * (o.st.poison && o.st.poison.until > t ? s.poisoned : 1), p, 'poison')); },
    lamp: (p, c, s) => { zones.push({ k: 'lamp', id: 'z' + seq++, x: p.x, z: p.z, r: s.r, until: now() + s.dur * 1000, next: 0, by: p.id, s }); },
    meteor: (p, c, s, m) => { const x = m.x, z = m.z; aoe(p, x, z, s.r, s.dmg, 'star'); raise(p, x, z, s.r + 1); allies(x, z, s.r + 1).concat(allies(p.x, p.z, 0.1)).filter((a, i, l) => l.indexOf(a) === i).forEach(a => heal(a, a.cb.hpMax * s.heal)); },
    seal: (p, c, s, m) => { hurt(m, atkOf(c) * s.dmg, p, 'seal'); if (alive(m)) m.st.root = now() + ctrl(m, s.root) * 1000; },
    lock: (p, c, s, m) => { const ids = []; near(m.x, m.z, s.r).forEach(o => { hurt(o, atkOf(c) * s.dmg, p, 'seal'); if (alive(o)) { o.st.root = now() + ctrl(o, s.root) * 1000; ids.push(o.id); } });
      c.stage.lock = { until: now() + s.root * 1000, ids, x: m.x, z: m.z }; return { r: s.r }; },
    lock2: (p, c, s) => { const g = c.stage.lock; g.until = 0; g.ids.forEach(id => { const o = byId.get(id); if (alive(o)) { o.st.root = 0; hurt(o, atkOf(c) * s.dmg2, p, 'crush'); } }); return { x: g.x, z: g.z, r: s.r }; },
    cliff: (p, c, s) => { const f = p.f || 0; zones.push({ k: 'cliff', id: 'z' + seq++, x: p.x + Math.sin(f) * 3, z: p.z + Math.cos(f) * 3, r: s.r, until: now() + s.dur * 1000, next: 0, by: p.id, s }); },
    box: (p, c, s, m) => { const t = now() + s.seal * 1000, ids = []; near(m.x, m.z, s.r).forEach(o => { o.st.sealed = t; o.st.root = t; ids.push(o.id); });
      zones.push({ k: 'box', id: 'z' + seq++, x: m.x, z: m.z, r: s.r, until: t, by: p.id, s, ids }); },
    pact: (p, c, s) => { const tier = s.tier[Math.floor(Math.random() * s.tier.length)]; c.fam = c.fam.filter(f => f.tier < 3); while (c.fam.length >= s.max) c.fam.shift();
      c.fam.push({ tier, until: now() + s.dur * 1000, next: 0 }); whoAll(p); return { tier }; },
    bond: (p, c, s) => { c.buff.bond = now() + s.dur * 1000; c.buff.bondV = s.up; },
    envoy: (p, c, s) => { c.fam = c.fam.filter(f => f.tier < 3); c.fam.push({ tier: 3, until: now() + s.dur * 1000, next: 0 }); whoAll(p); },
    transmute: (p, c, s, m) => { aoe(p, m.x, m.z, s.r, s.dmg, 'slam', o => { o.st.stun = now() + ctrl(o, s.stun) * 1000; }); },
    enchant: (p, c, s) => { const t = now() + s.dur * 1000; allies(p.x, p.z, s.r).forEach(a => { a.cb.buff.atk = t; a.cb.buff.atkV = s.atk; }); },
    shelter: (p, c, s) => { const t = now() + s.dur * 1000; allies(p.x, p.z, s.r).forEach(a => { a.cb.buff.guard = t; a.cb.buff.guardV = s.guard; }); near(p.x, p.z, s.r + 2).forEach(m => { m.st.taunt = t; }); },
    exchange: (p, c, s) => { const pay = Math.min(c.hp - 1, Math.round(c.hp * s.pay)); if (pay <= 0) return false; c.hp -= pay; hits.push(['p:' + p.id, pay, 'ow']);
      c.buff.mech = now() + s.dur * 1000; c.buff.mechV = s.up * Math.max(0.3, pay / (c.hpMax * s.pay)); whoAll(p); return { pay }; },
    fear: (p, c, s) => { c.buff.fear = now() + s.dur * 1000; c.buff.fearV = s.up; c.fearEnd = c.buff.fear; whoAll(p); },
    stitch: (p, c, s, m) => { const t = now() + s.dur * 1000, g = seq++, ids = []; near(m.x, m.z, s.r).sort((a, b) => dist(a, m) - dist(b, m)).slice(0, s.max).forEach(o => { hurt(o, atkOf(c) * s.dmg, p, 'needle', true); if (alive(o)) { o.st.link = t; o.st.linkG = g; o.st.linkV = s.share; o.st.tied = t; o.st.tiedBy = p.id; ids.push(o.id); } }); return { ids }; },
    string: (p, c, s, m) => { if (MOBS[m.kind].boss) return false; const t = now() + s.dur * 1000; m.st.charm = t; m.st.charmBy = p.id; m.st.tied = t; m.st.tiedBy = p.id; m.aggro = null; c.stage.string = { until: t, id: m.id };
      if (c.target === m.id) { c.target = null; p.cbSock.emit('cb:tgt', null); } },   // 不要繼續打自己的人偶
    string2: (p, c, s, m) => { const g = c.stage.string, o = byId.get(g.id); g.until = 0; if (!alive(o)) return false; const to = m && m !== o ? m : near(o.x, o.z, 9, o)[0] || o;
      o.st.charm = 0; o.st.tied = 0; const x = to.x, z = to.z; o.x = x + 0.6; o.z = z; o.st.stun = now() + 1200; aoe(p, x, z, s.r, s.dmg2, 'slam'); return { m: o.id, x, z }; },
    curtain: (p, c, s) => { const t = now(); near(p.x, p.z, s.r).forEach(m => { m.st.stun = t + ctrl(m, s.lift) * 1000; m.st.lift = t + s.lift * 1000; });
      zones.push({ k: 'curtain', id: 'z' + seq++, x: p.x, z: p.z, r: s.r, until: t + s.lift * 1000, by: p.id, s }); },
  };
  CAST.pact2 = CAST.pact;
  function cast(p, slot, tgt) {
    const c = p.cb, t = now(), k0 = c.slots[slot], s = SK[k0]; if (!s || c.dead > t || !inField(p)) return;
    const two = s.next && c.stage[k0] && c.stage[k0].until > t, k = two ? k0 + '2' : k0;
    if (!two && ((c.cd[k0] || 0) > t || c.mp < s.mp)) return;
    let m = byId.get(tgt); if (!alive(m)) m = null;
    if (s.aim && !two) { if (!m) m = byId.get(c.target); if (!alive(m)) m = near(p.x, p.z, s.range).sort((a, b) => dist(a, p) - dist(b, p))[0]; if (!m || dist(m, p) > s.range + 1.5) return p.cbSock.emit('cb:no', 'far'); }
    const r = CAST[k](p, c, s, m); if (r === false) return;
    if (!two) { c.mp -= s.mp; c.cd[k0] = t + s.cd * 1000; }
    c.fight = t + 5000; credit(p); if (m && s.aim && k !== 'string') c.target = c.target || m.id;
    fx(Object.assign({ k, id: p.id, x: +(m && s.aim ? m.x : p.x).toFixed(1), z: +(m && s.aim ? m.z : p.z).toFixed(1), m: m ? m.id : null }, r || {})); tell(p);
  }
  const inField = (p) => p.x > FIELD.x0 - 4 && p.z > -38;

  // ---- 每 0.1 秒算一次 ----
  let n = 0;
  setInterval(() => {
    if (![...players.values()].some(p => p.cb)) return;
    const t = now(), dt = TICK / 1000, sec = ++n % 10 === 0;
    // 玩家：普攻、使魔、回魔、倒下後回到入口
    each((p, c) => {
      if (c.dead && c.dead <= t) { c.dead = 0; c.hp = c.hpMax; c.mp = c.mpMax; const lose = c.lv >= DOWN.from && c.lv < LEVEL.max ? Math.round(c.exp * DOWN.lose) : 0; if (lose > 0) { c.exp -= lose; c.changed = true; }
        p.cbSock.emit('cb:back', Object.assign({ lose }, FIELD.gate)); whoAll(p); tell(p); }
      if (c.dead) return;
      if (sec) { const rest = c.fight < t; const hp = Math.min(c.hpMax, c.hp + c.hpMax * (rest ? 0.06 : 0.004)), mp = Math.min(c.mpMax, c.mp + c.mpMax * (rest ? 0.08 : 0.025)); if (hp !== c.hp || mp !== c.mp) { c.hp = hp; c.mp = mp; tell(p); } }
      if (sec && c.pois > t) { const v = Math.max(1, Math.round(c.hpMax * MOBS.elder.fog.dps)); c.hp -= v; c.fight = t + 5000; hits.push(['p:' + p.id, v, 'pois']); if (c.hp <= 0) down(p); tell(p); if (c.dead) return; }
      if (c.drowsy && c.drowsy <= t) { c.drowsy = 0; tell(p); } if (c.pois && c.pois <= t) { c.pois = 0; tell(p); }
      const m = byId.get(c.target); if (c.target && !alive(m)) { c.target = null; p.cbSock.emit('cb:tgt', null); }
      const b = C3.basicOf(c), key = C3.basicKey(c);
      if (alive(m) && c.nextAtk <= t && dist(p, m) <= b.range + MOBS[m.kind].r + 0.6 && inField(p)) {
        c.nextAtk = t + b.every * 1000 * (c.drowsy > t ? 1.6 : 1); c.hitN = (c.hitN || 0) + 1;
        const mech = key === 'mecha' ? 1 + (c.buff.mech > t ? c.buff.mechV : 0) + (c.buff.fear > t ? c.buff.fearV : 0) : 1, slam = b.slam && c.hitN % b.slam === 0;
        if (slam) near(m.x, m.z, 2.6).forEach(o => { hurt(o, atkOf(c) * b.mul * mech * 1.3, p, 'slam'); if (alive(o)) o.st.taunt = t + 3000; });
        else hurt(m, atkOf(c) * b.mul * mech, p, 'hit');
        fx({ k: 'atk', id: p.id, b: key, m: m.id, slam: slam ? 1 : 0 });
      }
      if (c.fam.length) { const left = c.fam.filter(f => f.until > t); if (left.length !== c.fam.length) { c.fam = left; whoAll(p); }
        c.fam.forEach((f, i) => { if (f.next > t) return; const F = FAMILIARS[f.tier], o = alive(m) && dist(p, m) < 11 ? m : mobs.find(x => alive(x) && x.aggro === p.id && dist(p, x) < 11); if (!o) return;
          f.next = t + F.every * 1000; const d = atkOf(c) * F.atk * (c.buff.bond > t ? 1 + c.buff.bondV : 1);
          if (F.r) near(o.x, o.z, F.r).forEach(x => hurt(x, d, p, 'fam')); else hurt(o, d, p, 'fam'); fx({ k: 'fam', id: p.id, i, m: o.id }); }); }
      if (c.fearEnd && c.fearEnd <= t) { c.fearEnd = 0; const s = SK.fear; aoe(p, p.x, p.z, s.r, s.dmg, 'slam'); fx({ k: 'fearEnd', id: p.id, x: p.x, z: p.z }); whoAll(p); }
      if (c.mechShown !== mechOf(c)) { c.mechShown = mechOf(c); whoAll(p); }
    });
    // 場上的東西：星星燈、絕壁、封印之匣、謝幕
    for (let i = zones.length - 1; i >= 0; i--) { const z = zones[i], p = players.get(z.by), ok = p && p.cb;
      if (z.k === 'spore' && z.next <= t) { z.next = t + 1000; each((q, c) => { if (c.dead <= t && Math.hypot(q.x - z.x, q.z - z.z) <= z.r) { hitPlayer(q, z.atk * z.mv.dmg); const was = c.drowsy > t; c.drowsy = t + z.mv.drowsy * 1000; if (!was) tell(q); } }); }
      if (z.k === 'lamp' && z.next <= t && ok) { z.next = t + 1000; raise(p, z.x, z.z, z.r); allies(z.x, z.z, z.r).forEach(a => heal(a, a.cb.hpMax * z.s.heal)); aoe(p, z.x, z.z, z.r, z.s.dmg, 'star'); }
      if (z.k === 'cliff') { const hitNow = z.next <= t; if (hitNow) z.next = t + 1000; near(z.x, z.z, z.r).forEach(m => { const d = Math.hypot(m.x - z.x, m.z - z.z) || 0.01, k = (z.r + MOBS[m.kind].r) / d; m.x = z.x + (m.x - z.x) * k; m.z = z.z + (m.z - z.z) * k; if (hitNow && ok) hurt(m, atkOf(p.cb) * z.s.dmg, p, 'seal'); }); }
      if (z.until <= t) { zones.splice(i, 1);
        if (z.k === 'box' && ok) z.ids.forEach(id => { const m = byId.get(id); if (alive(m)) { m.st.sealed = 0; hurt(m, atkOf(p.cb) * z.s.dmg, p, 'box'); } });
        if (z.k === 'curtain' && ok) near(z.x, z.z, z.r + 1).forEach(m => hurt(m, atkOf(p.cb) * z.s.dmg * (m.st.tied > t - 300 ? z.s.tied : 1), p, 'cut'));
        fx({ k: 'zoneEnd', z: z.id, zk: z.k, x: z.x, z2: z.z, r: z.r }); }
      else if (!z.sent) { z.sent = 1; fx({ k: 'zone', z: z.id, zk: z.k, id: z.by, x: +z.x.toFixed(1), z2: +z.z.toFixed(1), r: z.r, dur: (z.until - t) / 1000 }); } }
    // 怪：中毒、亂晃、追人、打人、重生
    const out = [];
    mobs.forEach(m => {
      if (m.dead) { if (m.dead <= t) { m.dead = 0; m.hp = m.max; m.x = m.sx; m.z = m.sz; m.st = {}; m.aggro = null; m.mcd = 0; } }
      else {
        const st = m.st, d = MOBS[m.kind];
        if (sec && st.poison && st.poison.until > t) hurt(m, st.poison.dps, players.get(st.poison.by), 'dot');
        if (!alive(m)) return;
        const held0 = st.root > t || st.stun > t || st.freeze > t || st.sealed > t;
        if (m.cast) { if (held0) { m.cast = null; fx({ k: 'mobStop', m: m.id }); } else if (m.cast.until <= t) { const c = m.cast; m.cast = null; MOVE[c.k](m, d.move, c); fx({ k: 'mobMove', mk: c.k, m: m.id, x: F1(m.x), z: F1(m.z), r: d.move.r, dur: d.move.dur, to: c.to }); } }
        if (m.dash) { const g = m.dash, k = Math.min(1, (t - g.t0) / (g.t1 - g.t0)); if (held0) m.dash = null; else { m.x = g.x0 + (g.x1 - g.x0) * k; m.z = g.z0 + (g.z1 - g.z0) * k;
          each((q, c) => { if (c.dead <= t && !g.hit.has(q.id) && dist(q, m) <= g.mv.w + 0.4) { g.hit.add(q.id); hitPlayer(q, m.atk * g.mv.dmg, m); } }); if (k >= 1) { m.dash = null; m.next = t + 900; } } }
        if (d.boss && m === ELDER) elder(m, d, t, sec);
        const busy = !!(m.cast || m.dash) || st.tidy > t || d.add, held = held0 || busy, sp = d.sp * (st.slow > t ? 1 - st.slowV : 1) * dt;
        const go = (x, z, stop) => { const dx = x - m.x, dz = z - m.z, l = Math.hypot(dx, dz); if (l <= stop) return true; const k = Math.min(sp * (m.aggro || st.charm > t ? 1.6 : 0.6), l - stop) / l; m.x += dx * k; m.z += dz * k; return false; };
        if (st.charm > t) { const o = near(m.x, m.z, 8, m).sort((a, b) => dist(a, m) - dist(b, m))[0], by = players.get(st.charmBy);
          if (o && !held && go(o.x, o.z, d.r + MOBS[o.kind].r + 0.3) && m.next <= t) { m.next = t + 1300; hurt(o, m.atk * 3, by && by.cb ? by : null, 'hit'); fx({ k: 'mobAtk', m: m.id, to: o.id }); } }
        else { let p = m.aggro && players.get(m.aggro);
          if (p && (!p.cb || p.cb.dead > t || dist(p, m) > 22 || Math.hypot(m.x - m.sx, m.z - m.sz) > 26)) { p = null; m.aggro = null; }
          if (p) { if (!held && !(st.taunt > t) && tryMove(m, d, p, t)) { /* 開始出招，這一格不動 */ }
            else if (!held && go(p.x, p.z, d.shoot || d.r + 0.9) && m.next <= t && !(st.taunt > t)) { m.next = t + (d.shoot ? 1900 : 1500); hitPlayer(p, m.atk * (st.weak > t ? 1 - st.weakV : 1), m); fx({ k: 'mobAtk', m: m.id, to: p.id, shot: d.shoot ? 1 : 0 }); }
            else if (st.taunt > t && m.next <= t && !held) { m.next = t + 1500; fx({ k: 'mobAtk', m: m.id, to: p.id, mech: 1 }); } }
          else if (d.add) { /* 花不會動也不會自己回血 */ }
          else if (!held0 && !busy) { if (m.hp < m.max && sec) m.hp = Math.min(m.max, m.hp + m.max * 0.1);
            if (go(m.tx, m.tz, 0.2) && (m.wait -= dt) <= 0) { m.tx = m.sx + rnd(-3, 3); m.tz = m.sz + rnd(-3, 3); m.wait = rnd(2, 6); } } }
      }
      const fl = m.dead ? 256 : (m.st.root > t ? 1 : 0) | (m.st.stun > t ? 2 : 0) | (m.st.freeze > t ? 4 : 0) | (m.st.poison && m.st.poison.until > t ? 8 : 0) | (m.st.link > t ? 16 : 0) | (m.st.charm > t ? 32 : 0) | (m.st.sealed > t ? 64 : 0) | (m.st.weak > t ? 128 : 0) | (m.st.lift > t ? 512 : 0) | (m.st.slow > t ? 1024 : 0) | (m.st.tidy > t ? 2048 : 0) | (m.cast ? 4096 : 0);
      const row = [m.id, +m.x.toFixed(1), +m.z.toFixed(1), Math.max(0, Math.round(m.hp)), fl, m.st.tied > t ? m.st.tiedBy : 0, m.st.link > t ? m.st.linkG : 0], key = row.join(',');
      if (key !== m.sent) { m.sent = key; out.push(row); }
    });
    if (out.length) nw.emit('cb:mobs', out);
    if (hits.length) { nw.emit('cb:hit', hits); hits = []; }
    each((p, c) => { if (c.dirty) { c.dirty = false; p.cbSock.emit('cb:me', meView(c)); } });
    if (n % 10 === 0) { const t2 = now(); drops.forEach(o => { if (o.until <= t2) { drops.delete(o.id); nw.emit('cb:dropGone', { id: o.id }); } }); }
    if (sec) parties.forEach(P => pSend(P));
    if (n % 300 === 0) each(save);
  }, TICK);

  // ---- 進來、離開、轉職、換技能 ----
  function load(u) {
    const d = (u.save && u.save.nw && typeof u.save.nw === 'object') ? u.save.nw : {}, c = { lv: Math.max(1, Math.min(LEVEL.max, d.lv | 0 || 1)), exp: Math.max(0, d.exp | 0), school: SCHOOLS[d.school] ? d.school : null, spec: null, schools: {}, quest: null };
    Object.keys(SCHOOLS).forEach(k => { const s = d.schools && d.schools[k]; if (s && typeof s === 'object') { const got = (Array.isArray(s.got) ? s.got : []).filter(x => SCHOOLS[k].specs.includes(x));
      c.schools[k] = { m: Math.max(0, Math.min(GATE.mastery, s.m | 0)), got, spec: got.includes(s.spec) ? s.spec : null }; } });
    if (c.school && !c.schools[c.school]) c.schools[c.school] = { m: 0, got: [], spec: null };
    if (c.school) c.spec = c.schools[c.school].spec;
    if (d.quest && QUEST[d.quest.spec] && c.school === SPECS[d.quest.spec].school) c.quest = { spec: d.quest.spec, got: QUEST[d.quest.spec].map((q, i) => Math.max(0, Math.min(q[1], (d.quest.got || [])[i] | 0))) };
    c.slots = C3.autoSlots(c, d.slots); c.keys = C3.cleanKeys(d.keys);
    Object.assign(c, { cd: {}, buff: {}, stage: {}, fam: [], target: null, nextAtk: 0, fight: 0, dead: 0 }); stats(c); c.hp = c.hpMax; c.mp = c.mpMax; c.hp = c.hpMax; c.mp = c.mpMax;
    return c;
  }
  const setSchool = (c, k) => { c.school = k; if (!c.schools[k]) c.schools[k] = { m: 0, got: [], spec: null }; c.spec = c.schools[k].spec; c.quest = null; c.fam = []; c.stage = {}; c.slots = C3.autoSlots(c, c.slots); c.changed = true; };
  return {
    FIELD,
    join(socket, u, p) {
      const c = load(u); p.cb = c; p.cbUser = u; p.cbSock = socket;
      const ack = (fn, r) => { if (typeof fn === 'function') fn(r); }, done = (fn) => { c.changed = true; save(p); whoAll(p); socket.emit('cb:me', meView(c)); ack(fn, { ok: true }); };
      const busy = () => c.fight > now() || c.dead > now();
      socket.emit('cb:init', { me: meView(c), field: FIELD, mobs: mobs.map(m => ({ id: m.id, kind: m.kind, lv: m.lv, x: m.x, z: m.z, hp: m.dead ? 0 : Math.round(m.hp), max: m.max })), who: [...players.values()].filter(q => q.cb).map(who), fog: FOG ? { on: 1, x: ELDER.sx, z: ELDER.sz, r: MOBS.elder.fog.r } : null, drops: [...drops.values()].map(dropView) });
      mobs.forEach(m => { m.sent = ''; });
      socket.broadcast.emit('cb:who', who(p));
      socket.on('cb:target', (id) => { const m = byId.get(id); c.target = alive(m) ? m.id : null; });
      socket.on('cb:cast', (d) => { if (d && typeof d === 'object') cast(p, d.i | 0, typeof d.m === 'string' ? d.m : null); });
      socket.on('cb:slots', (arr, fn) => { if (busy()) return ack(fn, { error: '戰鬥中不能換招' }); c.slots = C3.cleanSlots(c, arr); done(fn); });
      socket.on('cb:keys', (arr, fn) => { if (!Array.isArray(arr) || arr.length !== 4 || !arr.every(C3.keyOk)) return ack(fn, { error: '這個鍵留給走路和互動用，換一個' }); if (new Set(arr).size !== 4) return ack(fn, { error: '這個鍵已經用在別格了' }); c.keys = C3.cleanKeys(arr); done(fn); });
      socket.on('cb:school', (k, fn) => { if (!SCHOOLS[k]) return ack(fn, { error: '沒有這個學門' }); if (busy()) return ack(fn, { error: '戰鬥中不能轉職' });
        if (c.lv < GATE.school) return ack(fn, { error: GATE.school + ' 等才能選學門' }); setSchool(c, k); done(fn); });
      socket.on('cb:quest', (sp, fn) => { const S = SPECS[sp]; if (!S || S.school !== c.school) return ack(fn, { error: '要先進這個學門' }); const s = c.schools[c.school];
        if (s.got.includes(sp)) return ack(fn, { error: '已經學會了' }); if (c.lv < GATE.spec || s.m < GATE.mastery) return ack(fn, { error: '還沒達到條件' });
        c.quest = { spec: sp, got: QUEST[sp].map(() => 0) }; done(fn); });
      socket.on('cb:spec', (sp, fn) => { if (busy()) return ack(fn, { error: '戰鬥中不能轉職' }); const S = SPECS[sp]; if (!S || S.school !== c.school) return ack(fn, { error: '要先進這個學門' }); const s = c.schools[c.school];
        if (!s.got.includes(sp)) { const q = c.quest; if (!q || q.spec !== sp || QUEST[sp].some((x, i) => q.got[i] < x[1])) return ack(fn, { error: '信物還沒收齊' }); s.got.push(sp); c.quest = null; fx({ k: 'promote', id: p.id }); }
        s.spec = sp; c.spec = sp; c.fam = []; c.stage = {}; c.slots = C3.autoSlots(c, c.slots); done(fn); });
      // 組隊：邀請、回答、離開、隊長切換經驗怎麼分、隊長請人離開
      socket.on('cb:pinvite', (id, fn) => { const q = players.get(id); if (!q || !q.cb || q === p) return ack(fn, { error: '找不到這個人' }); const P = partyOf(p);
        if (P && P.leader !== p.id) return ack(fn, { error: '只有隊長可以邀請' }); if (P && P.m.size >= PARTY.max) return ack(fn, { error: '隊伍滿了' }); if (partyOf(q)) return ack(fn, { error: '對方已經有隊伍了' });
        if (q.cb.inv && q.cb.inv.until > now() && q.cb.inv.from !== p.id) return ack(fn, { error: '對方正在考慮別人的邀請' });
        q.cb.inv = { from: p.id, until: now() + 30000 }; q.cbSock.emit('cb:pinv', { from: p.id, name: p.name || '', sec: 30 }); ack(fn, { ok: true }); });
      socket.on('cb:panswer', (d, fn) => { const inv = c.inv; c.inv = null; if (!inv || !d || inv.from !== d.from || inv.until < now()) return ack(fn, { error: '邀請過期了' }); const q = players.get(inv.from);
        if (!q || !q.cb) return ack(fn, { error: '對方不在了' }); if (!d.yes) { say(q, (p.name || '對方') + '這次先不組隊'); return ack(fn, { ok: true }); }
        if (partyOf(p)) return ack(fn, { error: '你已經有隊伍了' }); let P = partyOf(q); if (P && (P.leader !== q.id || P.m.size >= PARTY.max)) return ack(fn, { error: '隊伍滿了' });
        if (!P) { P = { id: 'p' + pseq++, leader: q.id, share: true, m: new Set([q.id]), sent: '' }; parties.set(P.id, P); q.cb.party = P.id; }
        P.m.add(p.id); c.party = P.id; P.m.forEach(id => { if (id !== p.id) say(players.get(id), (p.name || '新隊友') + '加入隊伍了'); }); pSend(P, true); ack(fn, { ok: true }); });
      socket.on('cb:pleave', (x, fn) => { pLeave(p); ack(typeof x === 'function' ? x : fn, { ok: true }); });
      socket.on('cb:pshare', (on, fn) => { const P = partyOf(p); if (!P || P.leader !== p.id) return ack(fn, { error: '只有隊長可以改' }); P.share = !!on; P.m.forEach(id => say(players.get(id), P.share ? '經驗改成全隊平分' : '經驗改成各拿各的')); pSend(P, true); ack(fn, { ok: true }); });
      socket.on('cb:pkick', (id, fn) => { const P = partyOf(p), q = players.get(id); if (!P || P.leader !== p.id || !q || q === p || !P.m.has(id)) return ack(fn, { error: '只有隊長可以請人離開' }); pLeave(q, '被請出隊伍了'); say(q, '你被請出隊伍了'); ack(fn, { ok: true }); });
      // 撿地上的東西：要走到旁邊，背包放得下才撿得起來
      socket.on('cb:pick', (id, fn) => { const o = drops.get(id); if (!o) return ack(fn, { error: '被撿走了' }); if (c.dead > now()) return ack(fn, { error: '倒下的時候不能撿' });
        if (Math.hypot(p.x - o.x, p.z - o.z) > C3.PICK_R + 1) return ack(fn, { error: '太遠了，走近一點' });
        const name = env.give ? env.give(u, o.k) : null; if (!name) return ack(fn, { error: '背包滿了' });
        drops.delete(id); nw.emit('cb:dropGone', { id, by: p.id }); ack(fn, { ok: true, name }); });
      // 管理員測試用：直接設定等級、熟練度、補滿信物
      socket.on('cb:dbg', (d, fn) => { if (!u.admin || !d || typeof d !== 'object') return ack(fn, { error: '只有管理員可以' });
        if (d.lv) { c.lv = Math.max(1, Math.min(LEVEL.max, d.lv | 0)); c.exp = 0; stats(c); c.hp = c.hpMax; c.mp = c.mpMax; c.cd = {}; c.fight = 0; }
        if (d.m != null && c.school) c.schools[c.school].m = Math.max(0, Math.min(GATE.mastery, d.m | 0));
        if (d.quest && c.quest) c.quest.got = QUEST[c.quest.spec].map(q => q[1]);
        if (typeof d.drop === 'string') { const o = { id: 'd' + seq++, k: d.drop, x: +(p.x + 1.2).toFixed(2), z: +p.z.toFixed(2), until: now() + (d.ms > 0 ? d.ms : C3.DROP_MS) }; drops.set(o.id, o); nw.emit('cb:drop', dropView(o)); }
        if (d.bossHp > 0) ELDER.hp = Math.max(1, Math.round(ELDER.max * Math.min(1, d.bossHp)));   // 測試老樹公的下半場
        if (d.exp > 0) { c.exp = Math.min(LEVEL.expFor(c.lv) - 1, d.exp | 0); tell(p); }
        if (d.hp > 0) { c.hp = Math.max(1, Math.round(c.hpMax * Math.min(1, d.hp))); tell(p); }
        if (d.reset) { Object.assign(c, { lv: 1, exp: 0, school: null, spec: null, schools: {}, quest: null, fam: [], stage: {} }); stats(c); c.slots = C3.autoSlots(c, []); }
        done(fn); });
    },
    leave(p) { if (!p.cb) return; pLeave(p); p.cb.changed = true; save(p); mobs.forEach(m => { if (m.aggro === p.id) m.aggro = null; }); p.cb = null; },
    // 戰鬥以外拿到的經驗（花園收成、被感謝）：人在線上就直接加，不在線上就加在存檔裡
    gainExp(u, n) { n = Math.round(Number(n) || 0); if (n <= 0 || !u) return;
      const p = [...players.values()].find(q => q.cb && q.cbUser === u); if (p) { gain(p, n); p.cb.changed = true; tell(p); return; }
      const d = Object.assign({}, u.save.nw); let lv = Math.max(1, d.lv | 0 || 1), exp = Math.max(0, d.exp | 0) + n; while (lv < LEVEL.max && exp >= LEVEL.expFor(lv)) { exp -= LEVEL.expFor(lv); lv++; }
      accounts.update(u, { nw: Object.assign(d, { lv, exp }) }); },
    tierOf(u) { const d = u.save && u.save.nw, s = d && d.school && d.schools && d.schools[d.school]; return s && s.spec ? 1 : 0; },
    _mobs: mobs, _drops: drops,
  };
};
