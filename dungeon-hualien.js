// 花蓮副本的關卡：七星潭背顏色 → 九曲洞推大理石 → 燕子口兩塊踏板 → 砂卡礑轉水道 → 清水斷崖打花蓮王
// 共用的部分（出發、復活、掉武器、換欄傳送…）在 dungeon.js，這裡拿到的 a 是它給的工具
const ROCK_RESPAWN_MS = 25000, SWALLOW_RESPAWN_MS = 15000, MONKEY_RESPAWN_MS = 30000;
const envNum = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
const BOSS_HP = Math.max(1, envNum(process.env.DG_BOSS_HP, 8000));
const BOSS_HP_PER_PLAYER = envNum(process.env.DG_BOSS_HP_PER_PLAYER, 3000);
const DMG_MUL = Math.max(0, envNum(process.env.DG_DMG_MUL, 1)); // 測試用：怪打人的傷害倍率
// 關卡編號（0 起算）
const STONES = 0, CAVE = 1, GORGE = 2, TRAIL = 3, BOSS_STAGE = 4;

// 出招前地上先畫出範圍：舉拳之後直線衝鋒、原地揮一圈黑暗劍氣；第二階段多了劍氣波，還會叫出黑馬分身
const ATK = {
  slash: { r: 190, delay: 1000, dmg: [24, 32] },
  charge: { len: 480, w: 110, delay: 1100, dmg: [30, 40] },
  wave: { r: 85, delay: 1200, dmg: [26, 34], max: 5 },
};

// ---------------- 砂卡礑的水道石板 ----------------
// 每塊石板的水道開口：上 1、右 2、下 4、左 8；踩一下順時針轉 90 度
const N = 1, E = 2, S = 4, W = 8;
const DIRS = [[N, 0, -1, S], [E, 1, 0, W], [S, 0, 1, N], [W, -1, 0, E]];
const rot = (m) => ((m << 1) | (m >> 3)) & 15;
const STRAIGHT = N | S, ELBOW = N | E, TEE = N | E | S;
const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
// 從泉水那格開始，水流得到的石板（泉水從左邊進第一欄的 src 那排）
function flow(P, masks) {
  const C = P.xs.length, R = P.ys.length, seen = new Set();
  const first = P.src * C;
  if (!(masks[first] & W)) return { cells: [], done: false };
  const q = [first]; seen.add(first);
  while (q.length) {
    const i = q.shift(), cx = i % C, cy = Math.floor(i / C);
    DIRS.forEach(([bit, dx, dy, opp]) => {
      if (!(masks[i] & bit)) return;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= C || ny >= R) return;
      const j = ny * C + nx;
      if (seen.has(j) || !(masks[j] & opp)) return;
      seen.add(j); q.push(j);
    });
  }
  const last = P.dst * C + C - 1;
  return { cells: [...seen], done: seen.has(last) && !!(masks[last] & E) };
}
// 先隨機走一條從泉水到水車的路，路上放對的石板，其他格隨便放，最後每塊都亂轉
function makePipes(P) {
  const C = P.xs.length, R = P.ys.length;
  let best = null;
  for (let t = 0; t < 40; t++) {
    const path = [[0, P.src]], used = new Set([P.src * C]);
    const walk = () => {
      const [x, y] = path[path.length - 1];
      if (x === C - 1 && y === P.dst) return true;
      for (const [, dx, dy] of shuffle(DIRS.slice())) {
        const nx = x + dx, ny = y + dy, k = ny * C + nx;
        if (nx < 0 || ny < 0 || nx >= C || ny >= R || used.has(k)) continue;
        used.add(k); path.push([nx, ny]);
        if (walk()) return true;
        path.pop(); used.delete(k);
      }
      return false;
    };
    if (walk() && (!best || path.length > best.length)) best = path.slice();
    if (best && best.length >= C + 4) break;
  }
  const masks = new Array(C * R).fill(0);
  const bitTo = (a, b) => DIRS.find(([, dx, dy]) => a[0] + dx === b[0] && a[1] + dy === b[1])[0];
  const opp = (bit) => DIRS.find(d => d[0] === bit)[3];
  best.forEach((c, k) => {
    const into = k === 0 ? W : opp(bitTo(best[k - 1], c));
    const out = k === best.length - 1 ? E : bitTo(c, best[k + 1]);
    masks[c[1] * C + c[0]] = into | out;
  });
  for (let i = 0; i < masks.length; i++) {
    if (!masks[i]) masks[i] = [STRAIGHT, ELBOW, ELBOW, TEE][Math.floor(Math.random() * 4)];
    for (let k = Math.floor(Math.random() * 4); k > 0; k--) masks[i] = rot(masks[i]);
  }
  // 一開始就通的話，把路上的第一塊轉歪
  while (flow(P, masks).done) masks[P.src * C] = rot(masks[P.src * C]);
  return masks;
}

let targets = null; // 九曲洞的凹槽（格子座標）
const blocksOf = (a, stage) => a.st.blocks.filter(b => b[2] === stage);
function placeBlocks(a, stage) {
  const { st, D, MAP } = a;
  st.blocks.forEach((b, i) => {
    if (stage != null && b[2] !== stage) return;
    MAP.dyn.delete(b[0] + ',' + b[1]);
    st.blocks[i] = D.blocks[i].slice();
    MAP.dyn.add(st.blocks[i][0] + ',' + st.blocks[i][1]);
  });
}
function respawnAt(a, m) {
  Object.assign(m, { alive: true, hp: m.maxHp, frozenUntil: 0, weakUntil: 0, x: m.home.x, y: m.home.y, tx: m.home.x, ty: m.home.y, respawnAt: 0 });
  m.damage.clear();
  a.io.emit('mob', a.mobState(m));
}
const tileC = (a, [x, y]) => ({ x: (x + 0.5) * a.T, y: (y + 0.5) * a.T });

const R = {
  boss: 'fu', clearExp: 800, dupExp: 600, dmgMul: DMG_MUL,
  bossExtra: (a) => {
    const hp = BOSS_HP + BOSS_HP_PER_PLAYER * a.st.members.size;
    return { hp, maxHp: hp, phase: 1, nextAttack: a.now0() + 4000, transformUntil: 0, nextHorse: 0 };
  },

  reset(a) {
    const { st, D, MAP } = a;
    if (!targets) { targets = []; MAP.tiles.forEach((row, y) => row.forEach((c, x) => { if (c === 'x' && x >= D.dx && x < D.lx) targets.push([x, y]); })); }
    (st.blocks || []).forEach(([x, y]) => MAP.dyn.delete(x + ',' + y));
    st.blocks = D.blocks.map(b => b.slice());
    st.blocks.forEach(([x, y]) => MAP.dyn.add(x + ',' + y));
    Object.assign(st, { seq: [], progress: 0, seqShowUntil: 0, plateOn: [false, false], holdStart: 0, holdEmit: 0,
      pipes: [], pipeFlow: [], flood: 0, nextFlood: 0, resetAt: 0 });
    st.lastStone = new Map(); st.lastPipe = new Map(); st.lastPush = st.lastPush || new Map();
  },
  publicState(a) {
    const { st } = a, now = a.now0(), show = now < st.seqShowUntil;
    return {
      // 七星潭的順序只亮一下，之後只看得到已經踩對的
      seq: st.seq.map((v, k) => (show || k < st.progress ? v : -1)), progress: st.progress,
      seqLeft: show ? st.seqShowUntil - now : 0,
      blocks: st.blocks, plates: st.plateOn,
      hold: st.holdStart ? Math.min(1, (now - st.holdStart) / a.D.holdMs) : 0,
      pipes: st.pipes, pipeFlow: st.pipeFlow, flood: st.flood,
    };
  },
  launch(a) {
    const { st, D, T } = a;
    // 七顆石頭全部排一個順序，石碑只亮一開始那幾秒（還要算進入場的地圖動畫）
    st.seq = D.stones.map((s, i) => i).sort(() => Math.random() - 0.5).slice(0, D.seqLen);
    st.progress = 0;
    st.seqShowUntil = a.now0() + D.seqShowMs + 4000;
    st.lastStone.clear();
    // 九曲洞裡的落石怪
    [[4, 22], [17, 22], [10, 16]].forEach(([x, y]) => a.spawnFoe('rock', (D.dx + x + 0.5) * T, (y + 0.5) * T, CAVE));
  },
  leave: (a, id) => { a.st.lastStone.delete(id); a.st.lastPipe.delete(id); },

  onStageClear(a, i) {
    const { st, D, T } = a, now = a.now0();
    const kill = (kind) => st.foes.filter(f => f.kind === kind).forEach(f => { f.alive = false; f.respawnAt = 0; a.io.emit('mob', a.mobState(f)); });
    if (i === STONES) { kill('crab'); a.say('七顆星都對上了！七星潭的石門打開，前往太魯閣九曲洞'); }
    if (i === CAVE) {
      kill('rock');
      a.say('四顆大理石都推進凹槽了！石門打開，前面是燕子口……兩塊踏板要同時有人踩住');
      [[5, 33], [16, 33], [10, 39]].forEach(([x, y]) => a.spawnFoe('swallow', (D.dx + x + 0.5) * T, (y + 0.5) * T, GORGE));
    }
    if (i === GORGE) {
      kill('swallow');
      a.say('燕子口的石門轟隆隆打開，立霧溪的水把大家沖到了砂卡礑步道！把泉水接到水車');
      st.pipes = makePipes(D.pipes);
      st.pipeFlow = flow(D.pipes, st.pipes).cells;
      st.nextFlood = now + D.flood.every;
      [[3, 6], [18, 21]].forEach(([x, y]) => a.spawnFoe('monkey', (D.dx + 22 + x + 0.5) * T, (y + 0.5) * T, TRAIL));
    }
    if (i === TRAIL) {
      kill('monkey');
      a.say('水車轉起來了！砂卡礑的石門打開……清水斷崖上有一個黑色的身影');
    }
  },

  tick(a, now) {
    const { st } = a;
    if (st.stage === STONES) tickStones(a, now);
    else if (st.stage === GORGE) tickPlates(a, now);
    else if (st.stage === TRAIL) tickTrail(a, now);
  },

  actions: {
    push(a, p, bi, dx, dy) {
      const { st, MAP, T } = a;
      const b = st.blocks[bi];
      if (st.phase !== 'run' || !b || b[2] !== st.stage || p.dead) return { ok: false };
      const now = a.now0();
      if (now - (st.lastPush.get(p.id) || 0) < 200) return { ok: false };
      if (!Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) !== 1) return { ok: false };
      const cx = (b[0] + 0.5) * T, cy = (b[1] + 0.5) * T;
      // 人要站在石頭的另一邊、靠得夠近
      const ax = p.x - cx, ay = (p.y - 6) - cy;
      const along = -(ax * dx + ay * dy), side = Math.abs(ax * dy - ay * dx);
      if (along < T * 0.3 || along > T * 1.35 || side > T * 0.55) return { ok: false };
      const nx = b[0] + dx, ny = b[1] + dy;
      const ncx = (nx + 0.5) * T, ncy = (ny + 0.5) * T;
      if (MAP.isBlocked(ncx, ncy) || !a.inBox(a.box(b[2]), ncx, ncy) || MAP.tiles[ny][nx] === 'X') return { ok: false };
      st.lastPush.set(p.id, now);
      MAP.dyn.delete(b[0] + ',' + b[1]);
      b[0] = nx; b[1] = ny;
      MAP.dyn.add(nx + ',' + ny);
      a.io.emit('dgBlock', { i: bi, tx: nx, ty: ny, id: p.id });
      if (b[2] === CAVE && targets.every(([x, y]) => blocksOf(a, CAVE).some(q => q[0] === x && q[1] === y))) a.clearStage(CAVE);
      return { ok: true };
    },
    resetBlocks(a, p) {
      const { st, D, T } = a;
      if (st.phase !== 'run' || (st.stage !== CAVE && st.stage !== GORGE)) return { ok: false };
      const now = a.now0();
      if (now < st.resetAt) return { ok: false, error: '剛剛才重排過，等幾秒' };
      // 有人站在石頭的起點上就先不要排，不然會把人卡在石頭裡
      const starts = D.blocks.filter(b => b[2] === st.stage);
      const busy = starts.some(([x, y]) => [...a.players.values()].some(q => Math.floor(q.x / T) === x && Math.floor((q.y - 4) / T) === y));
      if (busy) return { ok: false, error: '有人站在大理石原本的位置上，先讓開' };
      st.resetAt = now + 5000;
      placeBlocks(a, st.stage);
      a.say(`${p.name} 把大理石排回原位了`);
      a.emit();
      return { ok: true };
    },
  },

  // 倒下的小怪：還在牠那一關的時候過一陣子在原地重生
  onFoeDead(a, f, now) {
    const ms = { rock: ROCK_RESPAWN_MS, swallow: SWALLOW_RESPAWN_MS, monkey: MONKEY_RESPAWN_MS }[f.kind];
    if (ms) f.respawnAt = now + ms;
  },
  tickDead(a, m, now) {
    if (m.respawnAt && now >= m.respawnAt && a.st.stage === m.stage) respawnAt(a, m);
  },
  // 獼猴：沒人靠近的時候跑去亂轉水道石板
  tickMob(a, m, now, prey) {
    if (m.kind !== 'monkey' || a.st.stage !== TRAIL) return false;
    if (prey && a.dist(prey.x, prey.y, m.x, m.y) < 170) return false;
    const P = a.D.pipes, C = P.xs.length;
    if (m.goal == null || m.goal >= C * P.ys.length) m.goal = Math.floor(Math.random() * C * P.ys.length);
    const g = tileC(a, [P.xs[m.goal % C], P.ys[Math.floor(m.goal / C)]]);
    m.tx = g.x; m.ty = g.y;
    a.moveFoe(m, a.STATS.MOBS.monkey.speed, 6);
    if (a.dist(m.x, m.y, g.x, g.y) < 14 && now >= (m.nextFlip || 0)) {
      m.nextFlip = now + 7000;
      turnPipe(a, m.goal);
      a.io.emit('mobAttack', { mid: m.id, say: '嘻嘻，轉一下～' });
      m.goal = null;
    }
    return true;
  },

  // 第二階段：血剩一半時黑化
  onHurt(a, f, now) {
    if (f.kind !== 'fu' || f.phase !== 1 || f.hp > f.maxHp / 2) return;
    const def = a.STATS.MOBS.fu;
    f.phase = 2;
    f.transformUntil = now + 2200;
    f.nextAttack = now + 3500; f.nextHorse = now + 4000;
    a.io.emit('mob', a.mobState(f));
    a.say(`${def.name}黑化了，變成「${def.phase2.name}」！出招更快，還會叫出黑馬分身，小心！`);
  },

  // ---------------- 最終頭目：花蓮王 ----------------
  tickBoss(a, f, now) {
    const { st, clamp } = a;
    if (now < f.frozenUntil || now < f.stunUntil || now < f.transformUntil || f.busyUntil > now) return;
    const b = a.box(BOSS_STAGE), p2 = f.phase === 2;
    const prey = a.activeMembers().filter(p => a.inBox(b, p.x, p.y));
    if (!prey.length) return;
    let near = prey[0], nd = Infinity;
    prey.forEach(p => { const d = a.dist(p.x, p.y, f.x, f.y); if (d < nd) { nd = d; near = p; } });
    f.tx = near.x; f.ty = near.y;
    a.moveFoe(f, p2 ? 95 : 70, 90);
    if (p2 && now >= f.nextHorse && st.foes.filter(h => h.kind === 'horse' && h.alive).length < 2) {
      f.nextHorse = now + 16000;
      [-1, 1].forEach(k => a.spawnFoe('horse', clamp(f.x + k * 120, b.x1 + a.T, b.x2 - a.T), f.y + 20, BOSS_STAGE));
      a.io.emit('mobAttack', { mid: f.id, id: near.id, say: '黑馬分身，上！' });
    }
    if (now < f.nextAttack) return;
    f.nextAttack = now + (p2 ? 2200 + Math.random() * 1200 : 3200 + Math.random() * 1400);
    const roll = Math.random();
    const type = p2 ? (roll < 0.35 ? 'charge' : roll < 0.65 ? 'wave' : 'slash') : (roll < 0.5 ? 'charge' : 'slash');
    const at = ATK[type], dmgMul = p2 ? 1.25 : 1;
    const msg = { type, delay: at.delay };
    let hit;
    if (type === 'slash') {
      Object.assign(msg, { x: Math.round(f.x), y: Math.round(f.y), r: at.r });
      hit = (p) => a.dist(p.x, p.y, f.x, f.y) <= at.r;
    } else if (type === 'wave') {
      const spots = prey.slice(0, at.max).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
      Object.assign(msg, { r: at.r, spots });
      hit = (p) => spots.some(s => a.dist(p.x, p.y, s.x, s.y) <= at.r);
    } else {
      // 直線衝鋒：朝目標衝過去，衝到範圍的盡頭（撞到懸崖就停）
      const t = prey[Math.floor(Math.random() * prey.length)];
      const d = Math.max(1, a.dist(t.x, t.y, f.x, f.y)), ux = (t.x - f.x) / d, uy = (t.y - f.y) / d;
      const x1 = f.x, y1 = f.y;
      let x2 = x1, y2 = y1;
      for (let s = 0; s <= at.len; s += 12) {
        const x = x1 + ux * s, y = y1 + uy * s;
        if (!a.inBox(b, x, y) || a.MAP.isBlocked(x, y) || x > b.x2 - 30 || y > b.y2 - 20 || y < b.y1 + 40) break;
        x2 = x; y2 = y;
      }
      Object.assign(msg, { x1: Math.round(x1), y1: Math.round(y1), x2: Math.round(x2), y2: Math.round(y2), w: at.w });
      f.busyUntil = now + at.delay + 300;
      hit = (p) => a.segDist(p, x1, y1, x2, y2) <= at.w / 2;
      msg.end = { x: Math.round(x2), y: Math.round(y2) };
    }
    a.telegraph(f, msg, {
      hit, dmg: () => a.rand(at.dmg) * dmgMul,
      after: () => { if (type === 'charge') { f.x = f.tx = msg.end.x; f.y = f.ty = msg.end.y; } },
    });
  },
};
module.exports = R;

// ---------------- 第一關：七星潭（要背順序） ----------------
function tickStones(a, now) {
  const { st, D } = a;
  if (st.seqShown && now >= st.seqShowUntil) { st.seqShown = false; a.emit(); }
  if (now < st.seqShowUntil) st.seqShown = true;
  a.activeMembers().forEach(p => {
    const i = D.stones.findIndex(s => a.dist(p.x, p.y, s.x, s.y) < 26);
    if (i < 0) { st.lastStone.delete(p.id); return; }
    if (st.lastStone.get(p.id) === i) return;
    st.lastStone.set(p.id, i);
    if (st.progress > 0 && st.seq[st.progress - 1] === i) return; // 剛踩對的那顆再踩一次不算
    if (st.seq[st.progress] === i) {
      st.progress++;
      a.io.emit('dgStone', { i, ok: true, id: p.id, progress: st.progress });
      if (st.progress >= st.seq.length) a.clearStage(STONES);
      else a.emit();
      return;
    }
    // 踩錯：浪打上來，順序重來、石碑再亮一次，還會沖上一隻寄居蟹
    st.progress = 0;
    st.seqShowUntil = now + D.seqShowMs;
    a.io.emit('dgStone', { i, ok: false, id: p.id, progress: 0 });
    a.emit();
    a.hurtPlayer(p, 8, '七星潭的大浪');
    if (st.foes.filter(f => f.kind === 'crab' && f.alive).length < 3) a.spawnFoe('crab', D.stones[i].x, D.stones[i].y + 30, STONES);
    if (!p.dead) setTimeout(() => {
      if (!st.members.has(p.id) || p.dead) return;
      const s = a.jitter(D.stages[STONES].start, Math.floor(Math.random() * 3));
      a.teleport(p, s.x, s.y);
      st.lastStone.delete(p.id);
    }, 450);
  });
}

// ---------------- 第三關：燕子口（兩塊踏板同時踩住 5 秒） ----------------
function tickPlates(a, now) {
  const { st, D, T } = a;
  const standers = a.activeMembers().concat(a.ctx.summons().filter(sm => a.inBox(a.box(GORGE), sm.x, sm.y)));
  const on = D.plates.map(pl => {
    const c = tileC(a, pl);
    return standers.some(p => Math.abs(p.x - c.x) < T * 0.6 && Math.abs(p.y - 6 - c.y) < T * 0.6) ||
      blocksOf(a, GORGE).some(b => b[0] === pl[0] && b[1] === pl[1]);
  });
  const changed = on.some((v, i) => v !== st.plateOn[i]);
  st.plateOn = on;
  if (on.every(Boolean)) {
    if (!st.holdStart) { st.holdStart = now; a.emit(); }
    if (now - st.holdStart >= D.holdMs) { st.holdStart = 0; a.clearStage(GORGE); return; }
    if (now - st.holdEmit > 500) { st.holdEmit = now; a.emit(); }
  } else if (st.holdStart) { st.holdStart = 0; a.emit(); }
  if (changed) a.emit();
}

// ---------------- 第四關：砂卡礑（踩石板轉水道、溪水會漲） ----------------
function turnPipe(a, i) {
  const { st, D } = a;
  st.pipes[i] = rot(st.pipes[i]);
  const f = flow(D.pipes, st.pipes);
  st.pipeFlow = f.cells;
  a.io.emit('dgPipe', { i, m: st.pipes[i] });
  if (f.done) a.clearStage(TRAIL);
  else a.emit();
}
function tickTrail(a, now) {
  const { st, D, T } = a, P = D.pipes, C = P.xs.length;
  if (st.flood < D.flood.max && now >= st.nextFlood) {
    st.flood++; st.nextFlood = now + D.flood.every;
    a.say(st.flood === 1 ? '砂卡礑溪的水開始漲了！泡到水的地方會走得很慢' : `溪水又漲了（${st.flood}/${D.flood.max}）`);
    a.emit();
  }
  a.activeMembers().forEach(p => {
    let hit = -1;
    P.ys.forEach((y, r) => P.xs.forEach((x, c) => {
      const t = tileC(a, [x, y]);
      if (Math.abs(p.x - t.x) < T * 0.45 && Math.abs(p.y - 6 - t.y) < T * 0.45) hit = r * C + c;
    }));
    if (hit < 0) { st.lastPipe.delete(p.id); return; }
    if (st.lastPipe.get(p.id) === hit) return;
    st.lastPipe.set(p.id, hit);
    turnPipe(a, hit);
  });
}
