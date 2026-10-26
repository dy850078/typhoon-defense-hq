// 花蓮副本的關卡：七星潭踩石頭 → 九曲洞推大理石 → 清水斷崖打花蓮王
// 共用的部分（出發、復活、掉武器…）在 dungeon.js，這裡拿到的 a 是它給的工具
const ROCK_RESPAWN_MS = 25000;
const envNum = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
const BOSS_HP = Math.max(1, envNum(process.env.DG_BOSS_HP, 8000));
const BOSS_HP_PER_PLAYER = envNum(process.env.DG_BOSS_HP_PER_PLAYER, 3000);

// 出招前地上先畫出範圍：舉拳之後直線衝鋒、原地揮一圈黑暗劍氣；第二階段多了劍氣波，還會叫出黑馬分身
const ATK = {
  slash: { r: 190, delay: 1000, dmg: [24, 32] },
  charge: { len: 480, w: 110, delay: 1100, dmg: [30, 40] },
  wave: { r: 85, delay: 1200, dmg: [26, 34], max: 5 },
};

let targets = null; // 九曲洞的凹槽（格子座標）
const R = {
  boss: 'fu', clearExp: 500,
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
    st.seq = []; st.progress = 0;
    st.lastStone = new Map(); st.lastPush = st.lastPush || new Map(); st.resetAt = 0;
  },
  publicState: (a) => ({ seq: a.st.seq, progress: a.st.progress, blocks: a.st.blocks }),
  launch(a) {
    const { st, D, MAP, T } = a;
    // 七顆石頭裡隨機挑 5 顆排順序
    const order = D.stones.map((s, i) => i).sort(() => Math.random() - 0.5);
    st.seq = order.slice(0, D.seqLen); st.progress = 0;
    st.lastStone.clear();
    // 九曲洞裡的落石怪
    [[4, 22], [17, 22], [10, 16]].forEach(([x, y]) => a.spawnFoe('rock', (D.dx + x + 0.5) * T, (y + 0.5) * T, 1));
  },
  leave: (a, id) => a.st.lastStone.delete(id),

  onStageClear(a, i) {
    if (i === 0) a.say(`✨ 七顆星都對上了！七星潭的石門打開，前往太魯閣九曲洞`);
    if (i === 1) {
      a.say(`✨ 大理石都推進凹槽了！九曲洞的石門打開……清水斷崖上有一個黑色的身影`);
      a.st.foes.filter(f => f.kind === 'rock').forEach(f => { f.alive = false; f.respawnAt = 0; a.io.emit('mob', a.mobState(f)); });
    }
  },

  // ---------------- 第一關：七星潭 ----------------
  tick(a) {
    const { st, D } = a;
    if (st.stage !== 0) return;
    a.activeMembers().forEach(p => {
      const i = D.stones.findIndex(s => a.dist(p.x, p.y, s.x, s.y) < 26);
      if (i < 0) { st.lastStone.delete(p.id); return; }
      if (st.lastStone.get(p.id) === i) return;
      st.lastStone.set(p.id, i);
      if (st.progress > 0 && st.seq[st.progress - 1] === i) return; // 剛踩對的那顆再踩一次不算
      if (st.seq[st.progress] === i) {
        st.progress++;
        a.io.emit('dgStone', { i, ok: true, id: p.id, progress: st.progress });
        if (st.progress >= st.seq.length) a.clearStage(0);
        else a.emit();
        return;
      }
      // 踩錯：浪打上來，踩錯的人被沖回起點，順序重來
      st.progress = 0;
      a.io.emit('dgStone', { i, ok: false, id: p.id, progress: 0 });
      a.emit();
      a.hurtPlayer(p, 8, '七星潭的大浪');
      if (!p.dead) setTimeout(() => {
        if (!st.members.has(p.id) || p.dead) return;
        const s = a.jitter(D.stages[0].start, Math.floor(Math.random() * 3));
        a.teleport(p, s.x, s.y);
        st.lastStone.delete(p.id);
      }, 450);
    });
  },

  // ---------------- 第二關：九曲洞推大理石 ----------------
  actions: {
    push(a, p, bi, dx, dy) {
      const { st, MAP, T } = a;
      if (st.phase !== 'run' || st.stage !== 1 || p.dead) return { ok: false };
      const now = a.now0();
      if (now - (st.lastPush.get(p.id) || 0) < 200) return { ok: false };
      if (!Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) !== 1) return { ok: false };
      const b = st.blocks[bi];
      if (!b) return { ok: false };
      const cx = (b[0] + 0.5) * T, cy = (b[1] + 0.5) * T;
      // 人要站在石頭的另一邊、靠得夠近
      const ax = p.x - cx, ay = (p.y - 6) - cy;
      const along = -(ax * dx + ay * dy), side = Math.abs(ax * dy - ay * dx);
      if (along < T * 0.3 || along > T * 1.35 || side > T * 0.55) return { ok: false };
      const nx = b[0] + dx, ny = b[1] + dy;
      const ncx = (nx + 0.5) * T, ncy = (ny + 0.5) * T;
      if (MAP.isBlocked(ncx, ncy) || !a.inBox(a.box(1), ncx, ncy) || MAP.tiles[ny][nx] === 'X') return { ok: false };
      st.lastPush.set(p.id, now);
      MAP.dyn.delete(b[0] + ',' + b[1]);
      b[0] = nx; b[1] = ny;
      MAP.dyn.add(nx + ',' + ny);
      a.io.emit('dgBlock', { i: bi, tx: nx, ty: ny, id: p.id });
      if (targets.every(([x, y]) => st.blocks.some(q => q[0] === x && q[1] === y))) a.clearStage(1);
      return { ok: true };
    },
    resetBlocks(a, p) {
      const { st, D, MAP, T } = a;
      if (st.phase !== 'run' || st.stage !== 1) return { ok: false };
      const now = a.now0();
      if (now < st.resetAt) return { ok: false, error: '剛剛才重排過，等幾秒' };
      // 有人站在石頭的起點上就先不要排，不然會把人卡在石頭裡
      const busy = D.blocks.some(([x, y]) => [...a.players.values()].some(q => Math.floor(q.x / T) === x && Math.floor((q.y - 4) / T) === y));
      if (busy) return { ok: false, error: '有人站在大理石原本的位置上，先讓開' };
      st.resetAt = now + 5000;
      st.blocks.forEach(([x, y]) => MAP.dyn.delete(x + ',' + y));
      st.blocks = D.blocks.map(b => b.slice());
      st.blocks.forEach(([x, y]) => MAP.dyn.add(x + ',' + y));
      a.say(`🔄 ${p.name} 把九曲洞的大理石排回原位了`);
      a.emit();
      return { ok: true };
    },
  },

  // 落石怪倒下 25 秒後在原地重生（還在九曲洞的時候）
  onFoeDead(a, f, now) { if (f.kind === 'rock') f.respawnAt = now + ROCK_RESPAWN_MS; },
  tickDead(a, m, now) {
    if (m.kind === 'rock' && m.respawnAt && now >= m.respawnAt && a.st.stage === 1) {
      Object.assign(m, { alive: true, hp: m.maxHp, frozenUntil: 0, weakUntil: 0, x: m.home.x, y: m.home.y, tx: m.home.x, ty: m.home.y });
      m.damage.clear();
      a.io.emit('mob', a.mobState(m));
    }
  },

  // 第二階段：血剩一半時黑化
  onHurt(a, f, now) {
    if (f.kind !== 'fu' || f.phase !== 1 || f.hp > f.maxHp / 2) return;
    const def = a.STATS.MOBS.fu;
    f.phase = 2;
    f.transformUntil = now + 2200;
    f.nextAttack = now + 3500; f.nextHorse = now + 4000;
    a.io.emit('mob', a.mobState(f));
    a.say(`🌑 ${def.name}黑化了，變成「${def.phase2.name}」！出招更快，還會叫出黑馬分身，小心！`);
  },

  // ---------------- 最終頭目：花蓮王 ----------------
  tickBoss(a, f, now) {
    const { st, clamp } = a;
    if (now < f.frozenUntil || now < f.stunUntil || now < f.transformUntil || f.busyUntil > now) return;
    const b = a.box(2), p2 = f.phase === 2;
    const prey = a.activeMembers().filter(p => a.inBox(b, p.x, p.y));
    if (!prey.length) return;
    let near = prey[0], nd = Infinity;
    prey.forEach(p => { const d = a.dist(p.x, p.y, f.x, f.y); if (d < nd) { nd = d; near = p; } });
    f.tx = near.x; f.ty = near.y;
    a.moveFoe(f, p2 ? 95 : 70, 90);
    if (p2 && now >= f.nextHorse && st.foes.filter(h => h.kind === 'horse' && h.alive).length < 2) {
      f.nextHorse = now + 16000;
      [-1, 1].forEach(k => a.spawnFoe('horse', clamp(f.x + k * 120, b.x1 + a.T, b.x2 - a.T), f.y + 20, 2));
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
