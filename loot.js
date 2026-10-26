// 地上的掉落物：打倒怪會噴在地上，誰都可以撿（走到旁邊按 Z 或點一下）；背包裡的東西也可以拖到地上丟出去
// 地上的東西 60 秒沒人撿就消失；副本裡掉的東西，副本結束就跟著清掉
// server.js 把要用到的東西傳進來；背包怎麼算格數在 shared/bag.js
module.exports = function createLoot(ctx) {
  const { io, players, MAP, STATS, GEAR, DECOR, BAG } = ctx;
  const T = MAP.TILE;
  const MAX = 60; // 全地圖最多幾個，太多就清掉最舊的
  const REACH = 1.7 * T; // 站多近撿得到
  const items = new Map(); // id -> { id, kind, k, x, y, until, dg }
  let seq = 0;

  const nameOf = (kind, k) => kind === 'food' ? MAP.ITEMS[k].name : kind === 'decor' ? DECOR.DECOR[k].name : GEAR.GEAR[k].name;
  const valid = (kind, k) => kind === 'food' ? !!MAP.ITEMS[k] : kind === 'decor' ? !!DECOR.DECOR[k] : kind === 'gear' && !!GEAR.GEAR[k];
  const state = (l, from) => Object.assign({ id: l.id, kind: l.kind, k: l.k, x: Math.round(l.x), y: Math.round(l.y), ms: l.until - Date.now() },
    from ? { fx: Math.round(from.x), fy: Math.round(from.y), by: from.by } : null);

  function remove(id, by) {
    if (!items.delete(id)) return;
    io.emit('lootGone', { id, by: by || null });
  }
  // 找一個走得到的地方放；試幾次都撞牆就放在起點
  function spot(x, y, r0, r1, dir) {
    for (let i = 0; i < 10; i++) {
      const a = dir == null ? Math.random() * Math.PI * 2 : dir + (Math.random() - 0.5) * 2;
      const d = r0 + Math.random() * (r1 - r0);
      const nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d * 0.7;
      if (!MAP.isBlocked(nx, ny) && MAP.zoneOf(nx) === MAP.zoneOf(x)) return { x: nx, y: ny };
    }
    return { x, y };
  }
  // 放一個東西到地上；from 是從哪裡噴（丟）過來的，畫面用來畫拋物線
  function add(kind, k, at, from, dg) {
    if (!valid(kind, k)) return null;
    while (items.size >= MAX) remove(items.keys().next().value);
    const l = { id: 'l' + (++seq), kind, k, x: at.x, y: at.y, until: Date.now() + BAG.LOOT_MS, dg: dg || null };
    items.set(l.id, l);
    io.emit('loot', [state(l, from)]);
    return l;
  }
  // 一堆東西從 (x, y) 噴出來散在四周
  function scatter(list, x, y, dg, spread) {
    list.forEach(({ kind, k }) => add(kind, k, spot(x, y, 24, spread || 80), { x, y: y - 30 }, dg));
  }

  // 照掉落表抽：n 個裡每一個各自抽是補品、家具、裝備，還是什麼都沒有
  function roll(table) {
    const t = table || STATS.DROPS.field, out = [];
    const [lo, hi] = t.n || [0, 1];
    const n = lo + Math.floor(Math.random() * (hi - lo + 1));
    for (let i = 0; i < n; i++) {
      let x = Math.random() * Math.max(100, (t.food || 0) + (t.decor || 0) + (t.gear || 0));
      if ((x -= t.food || 0) < 0) { const ks = Object.keys(MAP.ITEMS); out.push({ kind: 'food', k: ks[Math.floor(Math.random() * ks.length)] }); continue; }
      if ((x -= t.decor || 0) < 0) { out.push({ kind: 'decor', k: DECOR.roll() }); continue; }
      if ((x -= t.gear || 0) < 0) { const id = GEAR.rollDrop({ rare: t.rare, series: t.series }); if (id) out.push({ kind: 'gear', k: id }); }
    }
    return out;
  }
  // 小怪倒下：照牠自己的掉落表（沒寫的用預設）噴在腳邊
  function fromFoe(foe, dg) {
    const def = STATS.MOBS[foe.kind] || {};
    scatter(roll(def.drops || (dg ? STATS.DROPS.dungeon : STATS.DROPS.field)), foe.x, foe.y, dg);
  }

  // ---------------- 放進背包、從背包拿出來 ----------------
  function sync(p) {
    p.owned = BAG.ownedOf(p.gear);
    io.to(p.id).emit('bagSync', { inv: p.inv, furn: p.furn, gear: p.gear, owned: p.owned, seen: p.seen });
  }
  // 放一個進背包（不檢查格數，要檢查的地方先用 BAG.canAdd）
  function give(p, kind, k, quiet) {
    if (kind === 'food') p.inv[k] = (p.inv[k] || 0) + 1;
    else if (kind === 'decor') p.furn[k] = (p.furn[k] || 0) + 1;
    else {
      p.gear[k] = (p.gear[k] || 0) + 1;
      if (!p.seen.includes(k)) p.seen.push(k);
    }
    if (!quiet) sync(p);
  }
  // 拿一個出來；正在穿的最後一件不能拿
  function take(p, kind, k) {
    if (!valid(kind, k) || BAG.count(p, kind, k) < 1) return '背包裡沒有這個';
    if (kind === 'gear' && p.gear[k] === 1 && Object.values(p.equip).includes(k)) return '正在穿的最後一件不能丟，先脫下來';
    if (kind === 'food') p.inv[k]--;
    else if (kind === 'decor') p.furn[k]--;
    else { p.gear[k]--; if (!p.gear[k]) delete p.gear[k]; }
    sync(p);
    return null;
  }

  // 撿：要站得夠近、那一區還放得下；同時有兩個人撿，先到的拿走
  function pick(p, id) {
    const l = items.get(id);
    if (!l) return { ok: false, error: '被別人撿走了' };
    if (p.dead) return { ok: false };
    if (Math.hypot(p.x - l.x, p.y - l.y) > REACH) return { ok: false, far: true };
    if (!BAG.canAdd(p, l.kind, l.k)) return { ok: false, error: `背包的${BAG.SECTIONS[BAG.SECTION_OF[l.kind]].name}區滿了` };
    remove(id, p.id);
    give(p, l.kind, l.k);
    if (l.kind === 'gear' && GEAR.GEAR[l.k].rarity !== 'R') {
      const g = GEAR.GEAR[l.k];
      ctx.pushChat({ system: true, text: `${p.name} 撿到了【${g.rarity}】${g.name}！`, t: Date.now() });
    }
    return { ok: true, kind: l.kind, k: l.k };
  }
  // 丟：從背包拿一個，往面對的方向丟出去
  function drop(p, kind, k) {
    if (p.dead) return { ok: false };
    const err = take(p, kind, k);
    if (err) return { ok: false, error: err };
    const at = spot(p.x, p.y, 34, 64, p.dir < 0 ? Math.PI : 0);
    add(kind, k, at, { x: p.x, y: p.y - 40, by: p.id }, ctx.dgOf ? ctx.dgOf(p) : null);
    return { ok: true, name: nameOf(kind, k) };
  }
  // 丟掉：直接不見，不會掉在地上
  function trash(p, kind, k) {
    const err = take(p, kind, k);
    return err ? { ok: false, error: err } : { ok: true };
  }
  // 直接給的獎勵（小遊戲、煮泡麵、物資箱以外）背包放不下時，掉在他腳邊
  function giveOrDrop(p, kind, k) {
    if (BAG.canAdd(p, kind, k)) { give(p, kind, k); return true; }
    add(kind, k, spot(p.x, p.y, 20, 50), { x: p.x, y: p.y - 40 }, ctx.dgOf ? ctx.dgOf(p) : null);
    io.to(p.id).emit('bagFull', { kind, name: nameOf(kind, k) });
    return false;
  }

  function tick(now) {
    items.forEach(l => { if (l.until <= now) remove(l.id); });
  }
  function clearDg(dg) {
    items.forEach(l => { if (l.dg === dg) remove(l.id); });
  }
  const list = () => [...items.values()].map(l => state(l));

  return { add, scatter, roll, fromFoe, give, take, sync, pick, drop, trash, giveOrDrop, tick, clearDg, list, nameOf };
};
