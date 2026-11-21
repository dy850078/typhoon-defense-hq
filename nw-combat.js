// 3D 新世界的戰鬥：練習場的怪、點怪自動普攻、四顆技能鈕、等級和職業
// 都在 /newworld 這個頻道裡，跟總部（2D）的戰鬥、等級、職業完全分開
// 存檔放在帳號的 save.nw：lv、exp、school、spec、schools、slots、quest（同一個物件裡別的欄位是背包那邊的，寫回去時要留著）
const C3 = require('./shared/classes3d.js');
const { SK, SPECS, SCHOOLS, LEVEL, GATE, QUEST, QUEST_RATE, MOBS, FAMILIARS } = C3;

// 練習場在前院的東邊：四塊地，越遠的怪越強；中間是大石偶
const FIELD = { x0: 17, x1: 66, z0: -6, z1: 60, gate: { x: 15, z: 14 } };
const ZONES = [
  { kind: 'slime', x: 26, z: 12, lv: [1, 1, 2, 2, 3, 4, 5, 6, 7, 8] },
  { kind: 'shroom', x: 26, z: 44, lv: [9, 10, 11, 12, 13, 14, 15, 16, 18, 19] },
  { kind: 'golem', x: 54, z: 46, lv: [20, 22, 24, 26, 28, 30, 32, 34] },
  { kind: 'wisp', x: 54, z: 10, lv: [36, 38, 40, 43, 46, 49, 52, 55] },
  { kind: 'boss', x: 41, z: 28, lv: [45] },
];
const TICK = 100, rnd = (a, b) => a + Math.random() * (b - a), dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

module.exports = function attach(nw, env) {
  const { accounts, players } = env, now = () => Date.now();
  const mobs = [], zones = [], byId = new Map();
  let hits = [], seq = 1;
  ZONES.forEach((z, zi) => z.lv.forEach((lv, i) => {
    const a = i / z.lv.length * Math.PI * 2 + zi, r = z.kind === 'boss' ? 0 : 3 + (i % 3) * 3.2, d = MOBS[z.kind];
    const m = { id: 'm' + (mobs.length + 1), kind: z.kind, lv, sx: z.x + Math.cos(a) * r, sz: z.z + Math.sin(a) * r, max: Math.round(LEVEL.hp(lv) * d.hp), atk: LEVEL.atk(lv) * d.atk, st: {}, dmgBy: new Map() };
    m.x = m.sx; m.z = m.sz; m.hp = m.max; m.tx = m.x; m.tz = m.z; m.wait = rnd(0, 4); m.next = 0; m.dead = 0; m.sent = '';
    mobs.push(m); byId.set(m.id, m);
  }));
  const alive = (m) => m && !m.dead;
  const near = (x, z, r, skip) => mobs.filter(m => alive(m) && m !== skip && Math.hypot(m.x - x, m.z - z) <= r + MOBS[m.kind].r);
  const ctrl = (m, s) => (MOBS[m.kind].boss ? s * 0.3 : s);   // 大石偶被控制的時間只有三成
  const each = (fn) => players.forEach(p => { if (p.cb) fn(p, p.cb); });
  const fx = (o) => nw.emit('cb:fx', o);
  const meView = (c) => ({ lv: c.lv, exp: c.exp, need: LEVEL.expFor(c.lv), hp: Math.round(c.hp), hpMax: c.hpMax, mp: Math.round(c.mp), mpMax: c.mpMax, school: c.school, spec: c.spec, schools: c.schools, slots: c.slots, keys: c.keys, quest: c.quest,
    cd: c.cd, stage: Object.keys(c.stage).reduce((o, k) => { if (c.stage[k].until > now()) o[k] = c.stage[k].until; return o; }, {}), dead: c.dead > now() ? c.dead : 0, t: now() });
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
    const t = now(); let d = amount * (1 + (m.st.vuln > t ? m.st.vulnV : 0)) * rnd(0.92, 1.08); d = Math.max(1, Math.round(d));
    m.hp -= d; hits.push([m.id, d, kind || '']);
    if (p) { m.dmgBy.set(p.id, t); if (!m.aggro || !players.get(m.aggro) || m.st.charm) m.aggro = p.id; if (kind !== 'dot') p.cb.fight = t + 5000; }
    if (!noShare && m.st.link > t) mobs.forEach(o => { if (o !== m && alive(o) && o.st.link > t && o.st.linkG === m.st.linkG) hurt(o, d * (m.st.linkV || 0.5) / (1 + (o.st.vuln > t ? o.st.vulnV : 0)), p, 'link', true); });
    if (m.hp <= 0) die(m);
    return d;
  }
  function die(m) {
    const t = now(), d = MOBS[m.kind]; m.dead = t + (d.boss ? 90000 : 9000); m.hp = 0; m.st = {}; m.aggro = null;
    m.dmgBy.forEach((at, pid) => { const p = players.get(pid); if (!p || !p.cb || t - at > 20000) return; const c = p.cb, gap = c.lv - m.lv;
      gain(p, Math.round((8 + 3 * m.lv) * (d.boss ? 12 : 1) * (gap > 20 ? 0.1 : gap > 10 ? 0.3 : 1)));
      if (c.school) { const s = c.schools[c.school]; s.m = Math.min(GATE.mastery, (s.m || 0) + (d.boss ? 10 : 1)); }
      if (c.quest && Math.random() < QUEST_RATE[m.kind]) { const q = QUEST[c.quest.spec], i = q.findIndex(x => x[2] === m.kind);
        if (i >= 0 && c.quest.got[i] < q[i][1]) { c.quest.got[i]++; p.cbSock.emit('cb:loot', { name: q[i][0], n: c.quest.got[i], of: q[i][1] }); } }
      c.changed = true; tell(p); });
    m.dmgBy.clear(); fx({ k: 'die', m: m.id });
    // 掉東西：一隻怪就掉牠那一份，掉在地上，誰先撿就是誰的
    const dr = d.drop; if (dr && Math.random() < dr.p) for (let i = 0; i < (dr.n || 1); i++) { const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * (d.boss ? 1.8 : 0.7);
      const o = { id: 'd' + seq++, k: dr.pool[Math.floor(Math.random() * dr.pool.length)], x: +(m.x + Math.cos(a) * r).toFixed(2), z: +(m.z + Math.sin(a) * r).toFixed(2), until: t + C3.DROP_MS }; drops.set(o.id, o); nw.emit('cb:drop', dropView(o)); }
  }
  const drops = new Map(), dropView = (o) => ({ id: o.id, k: o.k, x: o.x, z: o.z, left: Math.max(0, o.until - now()) });
  function gain(p, n) { const c = p.cb; if (c.lv >= LEVEL.max) return; c.exp += n; let up = false;
    while (c.lv < LEVEL.max && c.exp >= LEVEL.expFor(c.lv)) { c.exp -= LEVEL.expFor(c.lv); c.lv++; up = true; }
    if (up) { stats(c); c.hp = c.hpMax; c.mp = c.mpMax; fx({ k: 'lvup', id: p.id, lv: c.lv }); whoAll(p); } }
  function heal(p, amount) { const c = p.cb; if (c.dead > now()) return; const v = Math.round(Math.min(c.hpMax - c.hp, amount)); if (v <= 0) return; c.hp += v; hits.push(['p:' + p.id, -v, 'heal']); tell(p); }
  function allies(x, z, r) { const out = []; each((p, c) => { if (c.dead <= now() && Math.hypot(p.x - x, p.z - z) <= r) out.push(p); }); return out; }
  function hitPlayer(p, amount, m) { const c = p.cb, t = now(); if (c.dead > t) return;
    let d = amount * (1 - (c.buff.guard > t ? c.buff.guardV : 0)) * (c.buff.bond > t && c.fam.length ? 0.7 : 1); d = Math.max(1, Math.round(d * rnd(0.9, 1.1)));
    c.hp -= d; c.fight = t + 5000; hits.push(['p:' + p.id, d, 'ow']);
    if (c.hp <= 0) { c.hp = 0; c.dead = t + 4000; c.target = null; c.fam = []; mobs.forEach(o => { if (o.aggro === p.id) o.aggro = null; }); fx({ k: 'down', id: p.id }); whoAll(p); }
    tell(p); }

  // ---- 招式 ----
  const aoe = (p, x, z, r, mul, kind, each2) => near(x, z, r).forEach(m => { hurt(m, atkOf(p.cb) * mul, p, kind); if (each2 && alive(m)) each2(m); });
  const CAST = {
    spark: (p, c, s, m) => { hurt(m, atkOf(c) * s.dmg, p, 'fire'); },
    blink: () => {},
    bubble: (p, c, s, m) => { const t = now(); near(m.x, m.z, s.r).forEach(o => { hurt(o, atkOf(c) * s.dmg, p, 'poison'); if (alive(o)) o.st.poison = { until: t + s.dur * 1000, dps: atkOf(c) * s.dot, by: p.id }; }); },
    potion: (p, c, s) => { const a = allies(p.x, p.z, s.r).sort((a, b) => a.cb.hp / a.cb.hpMax - b.cb.hp / b.cb.hpMax)[0] || p; heal(a, a.cb.hpMax * s.heal); return { to: a.id }; },
    heart: (p, c, s) => { allies(p.x, p.z, s.r).forEach(a => heal(a, a.cb.hpMax * s.heal)); },
    scent: (p, c, s) => { const t = now() + s.dur * 1000; near(p.x, p.z, s.r).forEach(m => { m.st.weak = t; m.st.weakV = s.weak; m.st.vuln = t; m.st.vulnV = Math.max(m.st.vulnV || 0, s.vuln); if (!m.aggro) m.aggro = p.id; }); },
    waltz: (p, c, s) => { const t = now() + s.dur * 1000; aoe(p, p.x, p.z, s.r, s.dmg, 'ice', m => { m.st.slow = t; m.st.slowV = s.slow; }); },
    ball: (p, c, s) => { aoe(p, p.x, p.z, s.r, s.dmg, 'ice', m => { m.st.freeze = now() + ctrl(m, s.freeze) * 1000; }); },
    corrode: (p, c, s, m) => { const t = now() + s.dur * 1000; hurt(m, atkOf(c) * s.dmg, p, 'poison'); if (alive(m)) { m.st.poison = { until: t, dps: atkOf(c) * s.dot, by: p.id }; m.st.vuln = t; m.st.vulnV = Math.max(m.st.vulnV || 0, s.vuln); } },
    firework: (p, c, s, m) => { const t = now(); near(m.x, m.z, s.r).forEach(o => hurt(o, atkOf(c) * s.dmg * (o.st.poison && o.st.poison.until > t ? s.poisoned : 1), p, 'poison')); },
    lamp: (p, c, s) => { zones.push({ k: 'lamp', id: 'z' + seq++, x: p.x, z: p.z, r: s.r, until: now() + s.dur * 1000, next: 0, by: p.id, s }); },
    meteor: (p, c, s, m) => { const x = m.x, z = m.z; aoe(p, x, z, s.r, s.dmg, 'star'); allies(x, z, s.r + 1).concat(allies(p.x, p.z, 0.1)).filter((a, i, l) => l.indexOf(a) === i).forEach(a => heal(a, a.cb.hpMax * s.heal)); },
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
    c.fight = t + 5000; if (m && s.aim && k !== 'string') c.target = c.target || m.id;
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
      if (c.dead && c.dead <= t) { c.dead = 0; c.hp = c.hpMax; c.mp = c.mpMax; p.cbSock.emit('cb:back', FIELD.gate); whoAll(p); tell(p); }
      if (c.dead) return;
      if (sec) { const rest = c.fight < t; const hp = Math.min(c.hpMax, c.hp + c.hpMax * (rest ? 0.06 : 0.004)), mp = Math.min(c.mpMax, c.mp + c.mpMax * (rest ? 0.08 : 0.025)); if (hp !== c.hp || mp !== c.mp) { c.hp = hp; c.mp = mp; tell(p); } }
      const m = byId.get(c.target); if (c.target && !alive(m)) { c.target = null; p.cbSock.emit('cb:tgt', null); }
      const b = C3.basicOf(c), key = C3.basicKey(c);
      if (alive(m) && c.nextAtk <= t && dist(p, m) <= b.range + MOBS[m.kind].r + 0.6 && inField(p)) {
        c.nextAtk = t + b.every * 1000; c.hitN = (c.hitN || 0) + 1;
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
      if (z.k === 'lamp' && z.next <= t && ok) { z.next = t + 1000; allies(z.x, z.z, z.r).forEach(a => heal(a, a.cb.hpMax * z.s.heal)); aoe(p, z.x, z.z, z.r, z.s.dmg, 'star'); }
      if (z.k === 'cliff') { const hitNow = z.next <= t; if (hitNow) z.next = t + 1000; near(z.x, z.z, z.r).forEach(m => { const d = Math.hypot(m.x - z.x, m.z - z.z) || 0.01, k = (z.r + MOBS[m.kind].r) / d; m.x = z.x + (m.x - z.x) * k; m.z = z.z + (m.z - z.z) * k; if (hitNow && ok) hurt(m, atkOf(p.cb) * z.s.dmg, p, 'seal'); }); }
      if (z.until <= t) { zones.splice(i, 1);
        if (z.k === 'box' && ok) z.ids.forEach(id => { const m = byId.get(id); if (alive(m)) { m.st.sealed = 0; hurt(m, atkOf(p.cb) * z.s.dmg, p, 'box'); } });
        if (z.k === 'curtain' && ok) near(z.x, z.z, z.r + 1).forEach(m => hurt(m, atkOf(p.cb) * z.s.dmg * (m.st.tied > t - 300 ? z.s.tied : 1), p, 'cut'));
        fx({ k: 'zoneEnd', z: z.id, zk: z.k, x: z.x, z2: z.z, r: z.r }); }
      else if (!z.sent) { z.sent = 1; fx({ k: 'zone', z: z.id, zk: z.k, id: z.by, x: +z.x.toFixed(1), z2: +z.z.toFixed(1), r: z.r, dur: (z.until - t) / 1000 }); } }
    // 怪：中毒、亂晃、追人、打人、重生
    const out = [];
    mobs.forEach(m => {
      if (m.dead) { if (m.dead <= t) { m.dead = 0; m.hp = m.max; m.x = m.sx; m.z = m.sz; m.st = {}; m.aggro = null; } }
      else {
        const st = m.st, d = MOBS[m.kind];
        if (sec && st.poison && st.poison.until > t) hurt(m, st.poison.dps, players.get(st.poison.by), 'dot');
        if (!alive(m)) return;
        const held = st.root > t || st.stun > t || st.freeze > t || st.sealed > t, sp = d.sp * (st.slow > t ? 1 - st.slowV : 1) * dt;
        const go = (x, z, stop) => { const dx = x - m.x, dz = z - m.z, l = Math.hypot(dx, dz); if (l <= stop) return true; const k = Math.min(sp * (m.aggro || st.charm > t ? 1.6 : 0.6), l - stop) / l; m.x += dx * k; m.z += dz * k; return false; };
        if (st.charm > t) { const o = near(m.x, m.z, 8, m).sort((a, b) => dist(a, m) - dist(b, m))[0], by = players.get(st.charmBy);
          if (o && !held && go(o.x, o.z, d.r + MOBS[o.kind].r + 0.3) && m.next <= t) { m.next = t + 1300; hurt(o, m.atk * 3, by && by.cb ? by : null, 'hit'); fx({ k: 'mobAtk', m: m.id, to: o.id }); } }
        else { let p = m.aggro && players.get(m.aggro);
          if (p && (!p.cb || p.cb.dead > t || dist(p, m) > 22 || Math.hypot(m.x - m.sx, m.z - m.sz) > 26)) { p = null; m.aggro = null; }
          if (p) { if (!held && go(p.x, p.z, d.r + 0.9) && m.next <= t && !(st.taunt > t)) { m.next = t + 1500; hitPlayer(p, m.atk * (st.weak > t ? 1 - st.weakV : 1), m); fx({ k: 'mobAtk', m: m.id, to: p.id }); }
            else if (st.taunt > t && m.next <= t && !held) { m.next = t + 1500; fx({ k: 'mobAtk', m: m.id, to: p.id, mech: 1 }); } }
          else if (!held) { if (m.hp < m.max && sec) m.hp = Math.min(m.max, m.hp + m.max * 0.1);
            if (go(m.tx, m.tz, 0.2) && (m.wait -= dt) <= 0) { m.tx = m.sx + rnd(-3, 3); m.tz = m.sz + rnd(-3, 3); m.wait = rnd(2, 6); } } }
      }
      const fl = m.dead ? 256 : (m.st.root > t ? 1 : 0) | (m.st.stun > t ? 2 : 0) | (m.st.freeze > t ? 4 : 0) | (m.st.poison && m.st.poison.until > t ? 8 : 0) | (m.st.link > t ? 16 : 0) | (m.st.charm > t ? 32 : 0) | (m.st.sealed > t ? 64 : 0) | (m.st.weak > t ? 128 : 0) | (m.st.lift > t ? 512 : 0) | (m.st.slow > t ? 1024 : 0);
      const row = [m.id, +m.x.toFixed(1), +m.z.toFixed(1), Math.max(0, Math.round(m.hp)), fl, m.st.tied > t ? m.st.tiedBy : 0, m.st.link > t ? m.st.linkG : 0], key = row.join(',');
      if (key !== m.sent) { m.sent = key; out.push(row); }
    });
    if (out.length) nw.emit('cb:mobs', out);
    if (hits.length) { nw.emit('cb:hit', hits); hits = []; }
    each((p, c) => { if (c.dirty) { c.dirty = false; p.cbSock.emit('cb:me', meView(c)); } });
    if (n % 10 === 0) { const t2 = now(); drops.forEach(o => { if (o.until <= t2) { drops.delete(o.id); nw.emit('cb:dropGone', { id: o.id }); } }); }
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
      socket.emit('cb:init', { me: meView(c), field: FIELD, mobs: mobs.map(m => ({ id: m.id, kind: m.kind, lv: m.lv, x: m.x, z: m.z, hp: m.dead ? 0 : Math.round(m.hp), max: m.max })), who: [...players.values()].filter(q => q.cb).map(who), drops: [...drops.values()].map(dropView) });
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
        if (d.reset) { Object.assign(c, { lv: 1, exp: 0, school: null, spec: null, schools: {}, quest: null, fam: [], stage: {} }); stats(c); c.slots = C3.autoSlots(c, []); }
        done(fn); });
    },
    leave(p) { if (!p.cb) return; p.cb.changed = true; save(p); mobs.forEach(m => { if (m.aggro === p.id) m.aggro = null; }); p.cb = null; },
    // 戰鬥以外拿到的經驗（花園收成、被感謝）：人在線上就直接加，不在線上就加在存檔裡
    gainExp(u, n) { n = Math.round(Number(n) || 0); if (n <= 0 || !u) return;
      const p = [...players.values()].find(q => q.cb && q.cbUser === u); if (p) { gain(p, n); p.cb.changed = true; tell(p); return; }
      const d = Object.assign({}, u.save.nw); let lv = Math.max(1, d.lv | 0 || 1), exp = Math.max(0, d.exp | 0) + n; while (lv < LEVEL.max && exp >= LEVEL.expFor(lv)) { exp -= LEVEL.expFor(lv); lv++; }
      accounts.update(u, { nw: Object.assign(d, { lv, exp }) }); },
    tierOf(u) { const d = u.save && u.save.nw, s = d && d.school && d.schools && d.schools[d.school]; return s && s.spec ? 1 : 0; },
    _mobs: mobs, _drops: drops,
  };
};
