// 副本（花蓮）：候場區倒數 → 傳送進去鎖門 → 七星潭踩石頭 → 九曲洞推大理石 → 清水斷崖打花蓮王 → 掉武器
// 同時只有一場；打完、全隊倒下、所有人離開或超過時間就重置，入口重新開放
// server.js 把要用到的東西（io、玩家、扣血…）傳進來，這裡只管副本自己的狀態
module.exports = function createDungeon(ctx) {
  const { io, players, MAP, STATS, GEAR, pushChat, sendStats, gainExp, hurtPlayer, isAway, wallBlocks, behindWall, TICK } = ctx;
  const D = MAP.DUNGEON, T = MAP.TILE;
  const envNum = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
  const BOSS_HP = Math.max(1, envNum(process.env.DG_BOSS_HP, 8000));
  const BOSS_HP_PER_PLAYER = envNum(process.env.DG_BOSS_HP_PER_PLAYER, 3000);
  const CLEAR_SHOW_MS = 20000; // 打倒花蓮王後還能在裡面待多久
  const ROCK_RESPAWN_MS = 25000;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const now0 = () => Date.now();

  const st = {
    phase: 'idle', // idle → countdown → run → clear（打倒王，等一下再重置）
    stage: 0, // 目前打到第幾關（0 起算）
    members: new Set(),
    countdownAt: 0, startedAt: 0, endAt: 0,
    seq: [], progress: 0, lastStone: new Map(),
    blocks: D.blocks.map(b => b.slice()), resetAt: 0, lastPush: new Map(),
    foes: [], foeSeq: 0,
  };
  const targets = [];
  MAP.tiles.forEach((row, y) => row.forEach((c, x) => { if (c === 'x') targets.push([x, y]); }));
  const box = (i) => D.stages[i].box;
  const inBox = (b, x, y) => x >= b.x1 && x < b.x2 && y >= b.y1 && y < b.y2;
  const stageOfFoe = (f) => f.kind === 'rock' ? 1 : 2;

  // ---------------- 狀態 ----------------
  function publicState() {
    const now = now0();
    return {
      phase: st.phase, stage: st.stage, members: [...st.members], max: D.maxPlayers,
      countdown: st.phase === 'countdown' ? Math.max(0, st.countdownAt - now) : 0,
      timeLeft: st.phase === 'run' ? Math.max(0, st.startedAt + D.timeLimitMs - now) : 0,
      clearLeft: st.phase === 'clear' ? Math.max(0, st.endAt - now) : 0,
      seq: st.seq, progress: st.progress, blocks: st.blocks, gates: [st.stage > 0, st.stage > 1],
    };
  }
  const emit = () => io.emit('dungeon', publicState());
  const memberList = () => [...st.members].map(id => players.get(id)).filter(Boolean);
  const activeMembers = () => memberList().filter(p => !p.dead && !isAway(p));
  const say = (text) => pushChat({ system: true, text, t: now0() });
  function teleport(p, x, y) {
    p.x = x; p.y = y;
    io.emit('playerMoved', { id: p.id, x, y, dir: p.dir, moving: false, teleport: true });
  }
  const jitter = (pt, i) => ({ x: pt.x + ((i % 3) - 1) * 40, y: pt.y + Math.floor(i / 3) * 34 });
  const lobbyCx = (MAP.LOBBY.x1 + MAP.LOBBY.x2 + 1) / 2;
  const lobbySpot = (i) => ({ x: (lobbyCx - 0.7 + (i % 3) * 0.7) * T, y: (MAP.LOBBY.y1 + 5 + Math.floor(i / 3) * 0.8) * T });

  function closeAll() {
    D.gates.forEach((g, i) => MAP.setGate(i, false));
    st.blocks.forEach(([x, y]) => MAP.dyn.delete(x + ',' + y));
    st.blocks = D.blocks.map(b => b.slice());
    st.blocks.forEach(([x, y]) => MAP.dyn.add(x + ',' + y));
  }
  closeAll();

  function clearFoes() {
    st.foes.forEach(f => { f.alive = false; io.emit('mob', mobState(f)); });
    st.foes = [];
  }
  function reset() {
    clearFoes();
    closeAll();
    Object.assign(st, { phase: 'idle', stage: 0, countdownAt: 0, startedAt: 0, endAt: 0, seq: [], progress: 0 });
    st.members.clear(); st.lastStone.clear();
    emit();
  }

  // ---------------- 古城守門員：總部 ⇄ 候位區 ----------------
  function go(p) {
    if (p.dead) return { ok: false };
    if (st.members.has(p.id) && st.phase !== 'idle') return { ok: false };
    if (!MAP.nearGuard(p.x, p.y)) return { ok: false, error: '走到古城守門員旁邊再跟他說話' };
    const s = lobbySpot(Math.floor(Math.random() * 6));
    teleport(p, s.x, s.y);
    return { ok: true };
  }
  function home(p) {
    if (p.dead || MAP.zoneOf(p.x) !== 'lobby') return { ok: false };
    teleport(p, MAP.guard.x + T, MAP.guard.y + T * 0.6);
    return { ok: true };
  }

  // ---------------- 出發 ----------------
  function start(p) {
    if (st.phase === 'countdown') return { ok: false, error: '已經在倒數了，站在候場區就會一起出發' };
    if (st.phase !== 'idle') return { ok: false, error: '副本裡面還有人在挑戰，等他們出來' };
    if (!MAP.inLobby(p.x, p.y)) return { ok: false, error: '要站在古城候位區' };
    if (p.dead) return { ok: false };
    st.phase = 'countdown';
    st.countdownAt = now0() + D.countdownMs;
    emit();
    say(`🌀 ${p.name} 按下了出發！${D.countdownMs / 1000} 秒後前往${D.name}副本，想去的人快找指揮中心的古城守門員，到古城候位區集合（最多 ${D.maxPlayers} 人）`);
    return { ok: true };
  }
  function launch() {
    const list = [...players.values()].filter(p => !p.dead && !isAway(p) && MAP.inLobby(p.x, p.y)).slice(0, D.maxPlayers);
    if (!list.length) { st.phase = 'idle'; emit(); say('🌀 候位區沒有人，副本取消出發'); return; }
    closeAll();
    // 七顆石頭裡隨機挑 5 顆排順序
    const order = D.stones.map((s, i) => i).sort(() => Math.random() - 0.5);
    Object.assign(st, { phase: 'run', stage: 0, startedAt: now0(), seq: order.slice(0, D.seqLen), progress: 0 });
    st.members = new Set(list.map(p => p.id));
    st.lastStone.clear();
    clearFoes();
    // 九曲洞裡的落石怪
    [[4, 22], [17, 22], [10, 16]].forEach(([x, y]) => spawnFoe('rock', (MAP.DX + x + 0.5) * T, (y + 0.5) * T));
    list.forEach((p, i) => {
      const s = jitter(D.stages[0].start, i);
      teleport(p, s.x, s.y);
      io.to(p.id).emit('dgEnter', { title: D.title, region: D.id });
    });
    emit();
    say(`🌊 ${list.map(p => p.name).join('、')} 出發前往${D.title}！副本入口鎖上了，限時 ${D.timeLimitMs / 60000} 分鐘`);
  }

  function finish(text) {
    memberList().forEach((p, i) => {
      if (p.dead) { p.dead = false; }
      p.hp = Math.max(p.hp, Math.round(p.maxHp * 0.5));
      const s = lobbySpot(i);
      teleport(p, s.x, s.y);
      sendStats(p);
    });
    if (text) say(text);
    reset();
  }

  function leave(p) {
    if (!st.members.has(p.id)) return { ok: false };
    st.members.delete(p.id);
    st.lastStone.delete(p.id);
    if (p.dead) p.dead = false;
    p.hp = Math.max(p.hp, Math.round(p.maxHp * 0.5));
    const s = lobbySpot(0);
    teleport(p, s.x, s.y);
    sendStats(p);
    if (!st.members.size) finish(`🚪 大家都離開${D.name}副本了，入口重新開放`);
    else { say(`🚪 ${p.name} 離開了${D.name}副本`); emit(); }
    return { ok: true };
  }
  function remove(id) {
    if (!st.members.delete(id)) return;
    st.lastStone.delete(id);
    if (!st.members.size) finish(`🚪 大家都離開${D.name}副本了，入口重新開放`);
    else emit();
  }

  function clearStage(i) {
    MAP.setGate(i, true);
    st.stage = i + 1;
    if (i === 0) say(`✨ 七顆星都對上了！七星潭的石門打開，前往太魯閣九曲洞`);
    if (i === 1) {
      say(`✨ 大理石都推進凹槽了！九曲洞的石門打開……清水斷崖上有一個黑色的身影`);
      st.foes.filter(f => f.kind === 'rock').forEach(f => { f.alive = false; f.respawnAt = 0; io.emit('mob', mobState(f)); });
      spawnBoss();
    }
    io.emit('dgStage', { stage: st.stage });
    emit();
  }

  // ---------------- 倒下、復活 ----------------
  function onDeath(p, by) {
    say(`💫 ${p.name} 在副本裡被${by}打倒了，${D.respawnMs / 1000} 秒後在這一關的起點復活`);
    if (!activeMembers().length) {
      setTimeout(() => { if (st.phase === 'run' && !activeMembers().length) finish(`💀 全隊倒下了……${D.name}副本挑戰失敗，大家被送回入口`); }, 2500);
      return;
    }
    setTimeout(() => {
      if (!players.has(p.id) || !st.members.has(p.id) || !p.dead) return;
      p.dead = false;
      p.hp = p.maxHp;
      const s = jitter(D.stages[Math.min(st.stage, 2)].start, Math.floor(Math.random() * 6));
      teleport(p, s.x, s.y);
      sendStats(p);
    }, D.respawnMs);
  }

  // ---------------- 第一關：七星潭 ----------------
  function tickStones() {
    activeMembers().forEach(p => {
      const i = D.stones.findIndex(s => dist(p.x, p.y, s.x, s.y) < 26);
      if (i < 0) { st.lastStone.delete(p.id); return; }
      if (st.lastStone.get(p.id) === i) return;
      st.lastStone.set(p.id, i);
      if (st.progress > 0 && st.seq[st.progress - 1] === i) return; // 剛踩對的那顆再踩一次不算
      if (st.seq[st.progress] === i) {
        st.progress++;
        io.emit('dgStone', { i, ok: true, id: p.id, progress: st.progress });
        if (st.progress >= st.seq.length) clearStage(0);
        else emit();
        return;
      }
      // 踩錯：浪打上來，踩錯的人被沖回起點，順序重來
      st.progress = 0;
      io.emit('dgStone', { i, ok: false, id: p.id, progress: 0 });
      emit();
      hurtPlayer(p, 8, '七星潭的大浪');
      if (!p.dead) setTimeout(() => {
        if (!st.members.has(p.id) || p.dead) return;
        const s = jitter(D.stages[0].start, Math.floor(Math.random() * 3));
        teleport(p, s.x, s.y);
        st.lastStone.delete(p.id);
      }, 450);
    });
  }

  // ---------------- 第二關：九曲洞推大理石 ----------------
  function push(p, bi, dx, dy) {
    if (st.phase !== 'run' || st.stage !== 1 || !st.members.has(p.id) || p.dead) return { ok: false };
    const now = now0();
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
    if (MAP.isBlocked(ncx, ncy) || !inBox(box(1), ncx, ncy) || MAP.tiles[ny][nx] === 'X') return { ok: false };
    st.lastPush.set(p.id, now);
    MAP.dyn.delete(b[0] + ',' + b[1]);
    b[0] = nx; b[1] = ny;
    MAP.dyn.add(nx + ',' + ny);
    io.emit('dgBlock', { i: bi, tx: nx, ty: ny, id: p.id });
    if (targets.every(([x, y]) => st.blocks.some(q => q[0] === x && q[1] === y))) clearStage(1);
    return { ok: true };
  }
  function resetBlocks(p) {
    if (st.phase !== 'run' || st.stage !== 1 || !st.members.has(p.id)) return { ok: false };
    const now = now0();
    if (now < st.resetAt) return { ok: false, error: '剛剛才重排過，等幾秒' };
    // 有人站在石頭的起點上就先不要排，不然會把人卡在石頭裡
    const busy = D.blocks.some(([x, y]) => [...players.values()].some(q => Math.floor(q.x / T) === x && Math.floor((q.y - 4) / T) === y));
    if (busy) return { ok: false, error: '有人站在大理石原本的位置上，先讓開' };
    st.resetAt = now + 5000;
    st.blocks.forEach(([x, y]) => MAP.dyn.delete(x + ',' + y));
    st.blocks = D.blocks.map(b => b.slice());
    st.blocks.forEach(([x, y]) => MAP.dyn.add(x + ',' + y));
    say(`🔄 ${p.name} 把九曲洞的大理石排回原位了`);
    emit();
    return { ok: true };
  }

  // ---------------- 副本裡的怪 ----------------
  function mobState(m) {
    const now = now0();
    return { id: m.id, kind: m.kind, alive: m.alive, hp: m.hp, maxHp: m.maxHp, x: Math.round(m.x), y: Math.round(m.y),
      frozen: Math.max(0, m.frozenUntil - now), weak: Math.max(0, m.weakUntil - now), phase: m.phase,
      transforming: Math.max(0, (m.transformUntil || 0) - now) };
  }
  function spawnFoe(kind, x, y, extra) {
    const def = STATS.MOBS[kind];
    const f = Object.assign({ id: 'd' + (++st.foeSeq), kind, dg: true, alive: true, hp: def.hp, maxHp: def.hp, x, y, tx: x, ty: y,
      home: { x, y }, nextHit: now0() + 1500, frozenUntil: 0, weakUntil: 0, stunUntil: 0, damage: new Map() }, extra || {});
    st.foes.push(f);
    io.emit('mob', mobState(f));
    return f;
  }
  function spawnBoss() {
    const hp = BOSS_HP + BOSS_HP_PER_PLAYER * st.members.size;
    const f = spawnFoe('fu', D.boss.x, D.boss.y, { hp, maxHp: hp, phase: 1, nextAttack: now0() + 4000, transformUntil: 0, nextHorse: 0 });
    io.emit('dgBoss', { id: f.id });
  }
  const foeBox = (f) => box(stageOfFoe(f));
  // 某一關裡還站著的人（召喚物也算）
  function preyIn(b) {
    return activeMembers().filter(p => inBox(b, p.x, p.y)).concat(ctx.summons().filter(sm => inBox(b, sm.x, sm.y)));
  }
  // 一般小怪：追最近的人，靠近就打
  function tickChaser(m, now) {
    const def = STATS.MOBS[m.kind], b = foeBox(m);
    if (!m.alive) {
      if (m.kind === 'rock' && m.respawnAt && now >= m.respawnAt && st.stage === 1) {
        Object.assign(m, { alive: true, hp: m.maxHp, frozenUntil: 0, weakUntil: 0, x: m.home.x, y: m.home.y, tx: m.home.x, ty: m.home.y });
        m.damage.clear();
        io.emit('mob', mobState(m));
      }
      return;
    }
    if (now < m.frozenUntil || now < m.stunUntil) return;
    let prey = null, pd = 360;
    preyIn(b).forEach(p => { const d = dist(p.x, p.y, m.x, m.y); if (d < pd) { pd = d; prey = p; } });
    if (prey) { m.tx = prey.x; m.ty = prey.y; }
    else if (dist(m.x, m.y, m.tx, m.ty) < 10) {
      m.tx = clamp(m.x + (Math.random() - 0.5) * 300, b.x1 + T, b.x2 - T);
      m.ty = clamp(m.y + (Math.random() - 0.5) * 240, b.y1 + T, b.y2 - T);
    }
    moveFoe(m, def.speed, prey ? def.range * 0.6 : 10);
    if (prey && pd <= def.range && now >= m.nextHit && !behindWall(m.x, m.y, prey.x, prey.y)) {
      m.nextHit = now + 2000 + Math.random() * 800;
      io.emit('mobAttack', { mid: m.id, id: prey.id, say: def.say[Math.floor(Math.random() * def.say.length)] });
      setTimeout(() => {
        if (!m.alive || now0() < m.frozenUntil || dist(prey.x, prey.y, m.x, m.y) > def.range * 1.3) return;
        const dmg = Math.round(rand(def.dmg) * (now0() < m.weakUntil ? STATS.WEAKEN.dmgDealt : 1));
        if (prey.summon) return ctx.hurtSummon(prey, dmg, def.name);
        if (st.members.has(prey.id)) hurtPlayer(prey, dmg, def.name);
      }, 450);
    }
  }
  function moveFoe(m, speed, stop) {
    const b = foeBox(m);
    const d = dist(m.x, m.y, m.tx, m.ty);
    if (d <= stop) return;
    const step = Math.min(d - stop, speed * TICK / 1000);
    const nx = clamp(m.x + (m.tx - m.x) / d * step, b.x1 + 20, b.x2 - 20), ny = clamp(m.y + (m.ty - m.y) / d * step, b.y1 + 30, b.y2 - 10);
    if (MAP.isBlocked(nx, ny) || wallBlocks(m.x, m.y, nx, ny, 26)) { m.tx = m.x; m.ty = m.y; return; }
    m.x = nx; m.y = ny;
  }

  // ---------------- 最終頭目：花蓮王 ----------------
  // 出招前地上先畫出範圍：舉拳之後直線衝鋒、原地揮一圈黑暗劍氣；第二階段多了劍氣波，還會叫出黑馬分身
  const ATK = {
    slash: { r: 190, delay: 1000, dmg: [24, 32] },
    charge: { len: 480, w: 110, delay: 1100, dmg: [30, 40] },
    wave: { r: 85, delay: 1200, dmg: [26, 34], max: 5 },
  };
  function tickBoss(f, now) {
    if (!f.alive || now < f.frozenUntil || now < f.stunUntil || now < f.transformUntil || f.busyUntil > now) return;
    const b = box(2), p2 = f.phase === 2;
    const prey = activeMembers().filter(p => inBox(b, p.x, p.y));
    if (!prey.length) return;
    let near = prey[0], nd = Infinity;
    prey.forEach(p => { const d = dist(p.x, p.y, f.x, f.y); if (d < nd) { nd = d; near = p; } });
    f.tx = near.x; f.ty = near.y;
    moveFoe(f, p2 ? 95 : 70, 90);
    if (p2 && now >= f.nextHorse && st.foes.filter(h => h.kind === 'horse' && h.alive).length < 2) {
      f.nextHorse = now + 16000;
      [-1, 1].forEach(k => spawnFoe('horse', clamp(f.x + k * 120, b.x1 + T, b.x2 - T), f.y + 20));
      io.emit('mobAttack', { mid: f.id, id: near.id, say: '黑馬分身，上！' });
    }
    if (now < f.nextAttack) return;
    f.nextAttack = now + (p2 ? 2200 + Math.random() * 1200 : 3200 + Math.random() * 1400);
    const roll = Math.random();
    const type = p2 ? (roll < 0.35 ? 'charge' : roll < 0.65 ? 'wave' : 'slash') : (roll < 0.5 ? 'charge' : 'slash');
    const a = ATK[type], dmgMul = p2 ? 1.25 : 1;
    const msg = { mid: f.id, type, delay: a.delay };
    let hit;
    if (type === 'slash') {
      Object.assign(msg, { x: Math.round(f.x), y: Math.round(f.y), r: a.r });
      hit = (p) => dist(p.x, p.y, f.x, f.y) <= a.r;
    } else if (type === 'wave') {
      const spots = prey.slice(0, a.max).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
      Object.assign(msg, { r: a.r, spots });
      hit = (p) => spots.some(s => dist(p.x, p.y, s.x, s.y) <= a.r);
    } else {
      // 直線衝鋒：朝目標衝過去，衝到範圍的盡頭（撞到懸崖就停）
      const t = prey[Math.floor(Math.random() * prey.length)];
      const d = Math.max(1, dist(t.x, t.y, f.x, f.y)), ux = (t.x - f.x) / d, uy = (t.y - f.y) / d;
      const x1 = f.x, y1 = f.y;
      let x2 = x1, y2 = y1;
      for (let s = 0; s <= a.len; s += 12) {
        const x = x1 + ux * s, y = y1 + uy * s;
        if (!inBox(b, x, y) || MAP.isBlocked(x, y) || x > b.x2 - 30 || y > b.y2 - 20 || y < b.y1 + 40) break;
        x2 = x; y2 = y;
      }
      Object.assign(msg, { x1: Math.round(x1), y1: Math.round(y1), x2: Math.round(x2), y2: Math.round(y2), w: a.w });
      f.busyUntil = now + a.delay + 300;
      const segD = (p) => {
        const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
        const k = clamp(((p.x - x1) * dx + (p.y - y1) * dy) / l2, 0, 1);
        return dist(p.x, p.y, x1 + dx * k, y1 + dy * k);
      };
      hit = (p) => segD(p) <= a.w / 2;
      msg.end = { x: Math.round(x2), y: Math.round(y2) };
    }
    io.emit('dgAttack', msg);
    setTimeout(() => {
      if (!f.alive || now0() < f.frozenUntil || st.phase !== 'run') return;
      if (type === 'charge') { f.x = f.tx = msg.end.x; f.y = f.ty = msg.end.y; }
      io.emit('dgAttackHit', msg);
      const weak = now0() < f.weakUntil ? STATS.WEAKEN.dmgDealt : 1;
      activeMembers().filter(p => inBox(b, p.x, p.y) && hit(p)).forEach(p => hurtPlayer(p, Math.round(rand(a.dmg) * weak * dmgMul), STATS.MOBS.fu.name));
      ctx.summons().filter(sm => inBox(b, sm.x, sm.y) && hit(sm)).forEach(sm => ctx.hurtSummon(sm, Math.round(rand(a.dmg) * weak), STATS.MOBS.fu.name));
    }, a.delay);
  }

  // 玩家打到副本裡的怪（server.js 的 damageFoe 轉過來）
  function damage(p, f, dmg, crit, skillId, hitBy) {
    const now = now0();
    if (!f.alive || now < (f.transformUntil || 0)) return;
    f.hp = Math.max(0, f.hp - dmg);
    f.damage.set(p.name, (f.damage.get(p.name) || 0) + dmg);
    gainExp(p, dmg);
    io.emit('mobHit', { mid: f.id, id: hitBy || p.id, dmg, crit, hp: f.hp, skill: skillId });
    const def = STATS.MOBS[f.kind];
    // 第二階段：血剩一半時黑化
    if (f.kind === 'fu' && f.phase === 1 && f.hp > 0 && f.hp <= f.maxHp / 2) {
      f.phase = 2;
      f.transformUntil = now + 2200;
      f.nextAttack = now + 3500; f.nextHorse = now + 4000;
      io.emit('mob', mobState(f));
      say(`🌑 ${def.name}黑化了，變成「${def.phase2.name}」！出招更快，還會叫出黑馬分身，小心！`);
      return;
    }
    if (f.hp > 0) return;
    f.alive = false;
    io.emit('mob', mobState(f));
    gainExp(p, def.exp);
    if (f.kind === 'rock') { f.respawnAt = now + ROCK_RESPAWN_MS; return; }
    if (f.kind === 'fu') victory(p, f);
  }

  function victory(p, f) {
    st.foes.filter(h => h.kind === 'horse' && h.alive).forEach(h => { h.alive = false; io.emit('mob', mobState(h)); });
    st.phase = 'clear';
    st.endAt = now0() + CLEAR_SHOW_MS;
    say(`🎉 ${p.name} 打出最後一擊，${STATS.MOBS.fu.name}被擊敗了！${D.title}副本通關！`);
    const drops = [];
    memberList().forEach(q => {
      gainExp(q, 500);
      const id = GEAR.rollWeapon(D.id), g = id && GEAR.GEAR[id];
      if (!g) { drops.push({ id: q.id, name: q.name, item: null }); say(`🍃 ${q.name} 什麼都沒撿到……下次再來！`); return; }
      if (q.owned.includes(id)) {
        gainExp(q, 600);
        drops.push({ id: q.id, name: q.name, item: id, dup: true });
        say(`🔁 ${q.name} 又撿到了【${g.rarity}】${g.icon} ${g.name}，已經有了，換成 600 經驗`);
        return;
      }
      q.owned.push(id);
      io.to(q.id).emit('gearGot', { item: id, owned: q.owned });
      drops.push({ id: q.id, name: q.name, item: id });
      say(`⚔️ ${q.name} 獲得了武器【${g.rarity}】${g.icon} ${g.name}！`);
    });
    const top = [...f.damage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) say('🏅 輸出排行：' + top.map(([n, d], i) => `${i + 1}. ${n} ${d}`).join('、'));
    io.emit('dgClear', { drops, ms: CLEAR_SHOW_MS });
    emit();
  }

  // ---------------- 每 100 毫秒 ----------------
  function tick(now) {
    if (st.phase === 'countdown') { if (now >= st.countdownAt) launch(); return; }
    if (st.phase === 'clear') { if (now >= st.endAt) finish(`🏁 ${D.title}副本結束，入口重新開放`); return; }
    if (st.phase !== 'run') return;
    if (now >= st.startedAt + D.timeLimitMs) { finish(`⏰ 時間到！${D.name}副本挑戰失敗，大家被送回入口`); return; }
    if (st.stage === 0) tickStones();
    st.foes.forEach(f => { if (f.kind === 'fu') tickBoss(f, now); else tickChaser(f, now); });
  }

  return {
    state: publicState,
    go, home, start, leave, remove, push, resetBlocks, onDeath, damage, tick, mobState,
    isMember: (p) => st.members.has(p.id) && st.phase !== 'idle',
    // 現在在副本裡、可以打怪放技能的人
    // 自己回報的位置：總部、副本、候位區之間只能靠傳送，不能自己走過去；
    // 隊員不能跑出副本，也不能跳到還沒開門的關卡
    allowMove: (p, x, y) => {
      const member = st.members.has(p.id) && st.phase !== 'idle';
      const zone = MAP.zoneOf(x);
      if (!member) return zone !== 'dungeon' && zone === MAP.zoneOf(p.x);
      if (zone !== 'dungeon') return false;
      // 門所在的那一排算進前一關
      return y < D.stages[Math.max(0, st.stage)].box.y2 + MAP.TILE;
    },
    inFight: (p) => st.members.has(p.id) && MAP.stageAt(p.x, p.y) >= 0,
    foes: () => st.foes.filter(f => f.alive),
    foe: (id) => st.foes.find(f => f.id === id) || null,
    allFoes: () => st.foes,
    boxAt: (x, y) => { const i = MAP.stageAt(x, y); return i >= 0 ? box(i) : null; },
    boundsOf: (f) => foeBox(f),
  };
};
