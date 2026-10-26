// 副本共用引擎：候位區倒數 → 傳送進去鎖門 → 一關一關打 → 最後的頭目 → 掉武器
// 每個副本同時只有一場；打完、全隊倒下、所有人離開或超過時間就重置，入口重新開放
// 各地區自己的關卡（踩石頭、推大理石、打怪、頭目招式）寫在 dungeon-<地區>.js，這裡只管大家都一樣的部分
// server.js 把要用到的東西（io、玩家、扣血…）傳進來
const REGIONS = { hualien: require('./dungeon-hualien'), taipei: require('./dungeon-taipei') };

function createDungeon(ctx, D, region) {
  const { io, players, MAP, STATS, GEAR, pushChat, sendStats, gainExp, hurtPlayer, isAway, wallBlocks, behindWall, TICK } = ctx;
  const T = MAP.TILE;
  const CLEAR_SHOW_MS = 30000; // 打倒頭目後還能在裡面待多久（撿地上的寶物）
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const now0 = () => Date.now();
  const bossName = STATS.MOBS[region.boss].name;

  const st = {
    phase: 'idle', // idle → countdown → run → clear（打倒王，等一下再重置）
    stage: 0, // 目前打到第幾關（0 起算）
    members: new Set(),
    countdownAt: 0, startedAt: 0, endAt: 0,
    foes: [], foeSeq: 0,
  };
  const box = (i) => D.stages[i].box;
  const inBox = (b, x, y) => x >= b.x1 && x < b.x2 && y >= b.y1 && y < b.y2;

  // ---------------- 狀態 ----------------
  function publicState() {
    const now = now0();
    return Object.assign({
      id: D.id, phase: st.phase, stage: st.stage, members: [...st.members], max: D.maxPlayers,
      countdown: st.phase === 'countdown' ? Math.max(0, st.countdownAt - now) : 0,
      timeLeft: st.phase === 'run' ? Math.max(0, st.startedAt + D.timeLimitMs - now) : 0,
      clearLeft: st.phase === 'clear' ? Math.max(0, st.endAt - now) : 0,
      gates: D.gates.map((g, i) => st.stage > i),
    }, region.publicState(api));
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
  const L = D.lobby, lobbyCx = (L.x1 + L.x2 + 1) / 2;
  const lobbySpot = (i) => ({ x: (lobbyCx - 0.7 + (i % 3) * 0.7) * T, y: (L.y1 + 5 + Math.floor(i / 3) * 0.8) * T });
  const inLobby = (p) => MAP.inLobby(p.x, p.y, D);
  const startOf = (i) => jitter(D.stages[Math.min(i, D.stages.length - 1)].start, Math.floor(Math.random() * 6));

  function closeAll() {
    D.gates.forEach((g, i) => MAP.setGate(D, i, false));
    region.reset(api);
  }

  function clearFoes() {
    st.foes.forEach(f => { f.alive = false; io.emit('mob', mobState(f)); });
    st.foes = [];
  }
  function reset() {
    clearFoes();
    closeAll();
    Object.assign(st, { phase: 'idle', stage: 0, countdownAt: 0, startedAt: 0, endAt: 0 });
    st.members.clear();
    emit();
  }

  // ---------------- NPC：副本大廳 ⇄ 候位區 ----------------
  function go(p) {
    if (p.dead) return { ok: false };
    if (st.members.has(p.id) && st.phase !== 'idle') return { ok: false };
    if (!MAP.nearNpc(D, p.x, p.y)) return { ok: false, error: `先走到${D.npcName}旁邊` };
    if (p.level < D.minLevel) return { ok: false, error: `${D.name}副本要 Lv.${D.minLevel} 以上才能挑戰（你現在 Lv.${p.level}）` };
    const s = lobbySpot(Math.floor(Math.random() * 6));
    teleport(p, s.x, s.y);
    return { ok: true };
  }
  function home(p) {
    if (p.dead || !inLobby(p)) return { ok: false };
    teleport(p, D.npc.x + T, D.npc.y + T * 0.6);
    return { ok: true };
  }

  // ---------------- 出發 ----------------
  function start(p) {
    if (st.phase === 'countdown') return { ok: false, error: '已經在倒數了，站在候位區就會一起出發' };
    if (st.phase !== 'idle') return { ok: false, error: '副本裡面還有人在挑戰，等他們出來' };
    if (!inLobby(p)) return { ok: false, error: `要站在${D.lobbyName}` };
    if (p.dead) return { ok: false };
    if (p.level < D.minLevel) return { ok: false, error: `要 Lv.${D.minLevel} 以上才能出發` };
    st.phase = 'countdown';
    st.countdownAt = now0() + D.countdownMs;
    emit();
    say(`🌀 ${p.name} 按下了出發！${D.countdownMs / 1000} 秒後前往${D.name}副本，想去的人快從指揮中心的副本傳送門到副本大廳找${D.npcName}，到${D.lobbyName}集合（最多 ${D.maxPlayers} 人${D.minLevel ? `，要 Lv.${D.minLevel} 以上` : ''}）`);
    return { ok: true };
  }
  function launch() {
    const list = [...players.values()].filter(p => !p.dead && !isAway(p) && inLobby(p) && p.level >= D.minLevel).slice(0, D.maxPlayers);
    if (!list.length) { st.phase = 'idle'; emit(); say(`🌀 ${D.lobbyName}沒有人，副本取消出發`); return; }
    closeAll();
    Object.assign(st, { phase: 'run', stage: 0, startedAt: now0() });
    st.members = new Set(list.map(p => p.id));
    clearFoes();
    region.launch(api, list);
    list.forEach((p, i) => {
      const s = jitter(D.stages[0].start, i);
      teleport(p, s.x, s.y);
      io.to(p.id).emit('dgEnter', { title: D.title, region: D.id });
    });
    emit();
    say(`🚩 ${list.map(p => p.name).join('、')} 出發前往${D.title}！副本入口鎖上了，限時 ${D.timeLimitMs / 60000} 分鐘`);
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
    ctx.loot().clearDg(D.id);
    reset();
  }

  function leave(p) {
    if (!st.members.has(p.id)) return { ok: false };
    st.members.delete(p.id);
    region.leave && region.leave(api, p.id);
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
    region.leave && region.leave(api, id);
    if (!st.members.size) finish(`🚪 大家都離開${D.name}副本了，入口重新開放`);
    else emit();
  }

  function clearStage(i) {
    MAP.setGate(D, i, true);
    st.stage = i + 1;
    region.onStageClear(api, i);
    if (st.stage === D.stages.length - 1) spawnBoss();
    io.emit('dgStage', { id: D.id, stage: st.stage });
    emit();
    // 下一關在另一欄（中間沒有門）：等一下把大家傳送過去
    const next = D.stages[st.stage];
    if (next && next.warp) {
      const at = st.startedAt;
      setTimeout(() => {
        if (st.phase !== 'run' || st.startedAt !== at || st.stage !== i + 1) return;
        memberList().filter(p => !p.dead).forEach((p, k) => { const s = jitter(next.start, k); teleport(p, s.x, s.y); });
      }, 2500);
    }
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
      const s = startOf(st.stage);
      teleport(p, s.x, s.y);
      sendStats(p);
    }, D.respawnMs);
  }

  // ---------------- 副本裡的怪 ----------------
  function mobState(m) {
    const now = now0();
    return { id: m.id, kind: m.kind, alive: m.alive, hp: m.hp, maxHp: m.maxHp, x: Math.round(m.x), y: Math.round(m.y),
      frozen: Math.max(0, m.frozenUntil - now), weak: Math.max(0, m.weakUntil - now), phase: m.phase,
      transforming: Math.max(0, (m.transformUntil || 0) - now) };
  }
  // stage：這隻怪在第幾關（只在那一關裡活動）
  function spawnFoe(kind, x, y, stage, extra) {
    const def = STATS.MOBS[kind];
    const f = Object.assign({ id: 'd' + D.id[0] + (++st.foeSeq), kind, dg: true, dgId: D.id, stage, alive: true, hp: def.hp, maxHp: def.hp, x, y, tx: x, ty: y,
      home: { x, y }, nextHit: now0() + 1500, frozenUntil: 0, weakUntil: 0, stunUntil: 0, damage: new Map() }, extra || {});
    st.foes.push(f);
    io.emit('mob', mobState(f));
    return f;
  }
  function spawnBoss() {
    const f = spawnFoe(region.boss, D.boss.x, D.boss.y, D.stages.length - 1, region.bossExtra(api));
    io.emit('dgBoss', { id: f.id });
  }
  const foeBox = (f) => box(f.stage);
  // 某一關裡還站著的人（召喚物也算）
  function preyIn(b) {
    return activeMembers().filter(p => inBox(b, p.x, p.y)).concat(ctx.summons().filter(sm => inBox(b, sm.x, sm.y)));
  }
  // 一般小怪：追最近的人，靠近就打
  function tickChaser(m, now) {
    const def = STATS.MOBS[m.kind], b = foeBox(m);
    if (!m.alive) { region.tickDead && region.tickDead(api, m, now); return; }
    if (now < m.frozenUntil || now < m.stunUntil || (m.busyUntil || 0) > now) return;
    let prey = null, pd = def.sight || 360;
    preyIn(b).forEach(p => { const d = dist(p.x, p.y, m.x, m.y); if (d < pd) { pd = d; prey = p; } });
    if (region.tickMob && region.tickMob(api, m, now, prey)) return; // 會特殊招式的怪自己處理
    if (prey) { m.tx = prey.x; m.ty = prey.y; }
    else if (dist(m.x, m.y, m.tx, m.ty) < 10) {
      m.tx = clamp(m.x + (Math.random() - 0.5) * 300, b.x1 + T, b.x2 - T);
      m.ty = clamp(m.y + (Math.random() - 0.5) * 240, b.y1 + T, b.y2 - T);
    }
    moveFoe(m, def.speed, prey ? def.range * 0.6 : 10);
    if (prey && pd <= def.range && now >= m.nextHit && !behindWall(m.x, m.y, prey.x, prey.y)) {
      m.nextHit = now + (def.hitMs || 2000) + Math.random() * 800;
      io.emit('mobAttack', { mid: m.id, id: prey.id, say: def.say[Math.floor(Math.random() * def.say.length)] });
      setTimeout(() => {
        if (!m.alive || now0() < m.frozenUntil || dist(prey.x, prey.y, m.x, m.y) > def.range * 1.3) return;
        const dmg = Math.round(rand(def.dmg) * (now0() < m.weakUntil ? STATS.WEAKEN.dmgDealt : 1) * (region.dmgMul ?? 1));
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

  // 地上先畫出範圍，delay 毫秒後打下去
  // msg：送給畫面的預告（type、delay 和畫範圍要的東西）；hit(p)：誰在範圍裡；dmg(p, victims)：扣多少（沒有就不扣）
  function telegraph(f, msg, { hit, dmg, by, after }) {
    msg = Object.assign({ mid: f.id, dg: D.id }, msg);
    io.emit('dgAttack', msg);
    setTimeout(() => {
      if (!f.alive || now0() < f.frozenUntil || st.phase !== 'run') return;
      io.emit('dgAttackHit', msg);
      const b = foeBox(f), weak = (now0() < f.weakUntil ? STATS.WEAKEN.dmgDealt : 1) * (region.dmgMul ?? 1);
      const victims = activeMembers().filter(p => inBox(b, p.x, p.y) && hit(p));
      if (dmg) {
        victims.forEach(p => hurtPlayer(p, Math.round(dmg(p, victims) * weak), by || STATS.MOBS[f.kind].name));
        ctx.summons().filter(sm => inBox(b, sm.x, sm.y) && hit(sm)).forEach(sm => ctx.hurtSummon(sm, Math.round(dmg(sm, victims) * weak), by || STATS.MOBS[f.kind].name));
      }
      if (after) after(victims);
    }, msg.delay);
    return msg;
  }
  // 從 (x1, y1) 到 (x2, y2) 這段線離 p 多遠
  function segDist(p, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
    const k = clamp(((p.x - x1) * dx + (p.y - y1) * dy) / l2, 0, 1);
    return dist(p.x, p.y, x1 + dx * k, y1 + dy * k);
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
    if (f.hp > 0) { region.onHurt && region.onHurt(api, f, now); return; }
    f.alive = false;
    io.emit('mob', mobState(f));
    gainExp(p, def.exp);
    if (f.kind === region.boss) return victory(p, f);
    ctx.loot().fromFoe(f, D.id);
    region.onFoeDead && region.onFoeDead(api, f, now);
  }

  function victory(p, f) {
    st.foes.filter(h => h !== f && h.alive).forEach(h => { h.alive = false; io.emit('mob', mobState(h)); });
    st.phase = 'clear';
    st.endAt = now0() + CLEAR_SHOW_MS;
    say(`🎉 ${p.name} 打出最後一擊，${bossName}被擊敗了！${D.title}副本通關！`);
    // 寶物噴在頭目倒下的地方，大家搶：隊伍裡每個人各抽一次武器（可能沒有），再加一些補品；離開副本前沒撿就沒了
    const pile = [];
    memberList().forEach(q => {
      gainExp(q, region.clearExp);
      const id = GEAR.rollWeapon(D.id);
      if (id) pile.push({ kind: 'gear', k: id });
      pile.push(...ctx.loot().roll({ n: [1, 2], food: 100 }));
    });
    ctx.loot().scatter(pile, f.x, f.y, D.id, 150);
    const weapons = pile.filter(l => l.kind === 'gear').map(l => `【${GEAR.GEAR[l.k].rarity}】${GEAR.GEAR[l.k].name}`);
    say(weapons.length ? `⚔️ ${bossName}掉了 ${weapons.join('、')}，快去撿！` : `🍃 ${bossName}這次沒有掉武器……下次再來！`);
    const drops = pile.length;
    const top = [...f.damage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) say('🏅 輸出排行：' + top.map(([n, d], i) => `${i + 1}. ${n} ${d}`).join('、'));
    io.emit('dgClear', { id: D.id, drops, ms: CLEAR_SHOW_MS });
    emit();
  }

  // ---------------- 每 100 毫秒 ----------------
  function tick(now) {
    if (st.phase === 'countdown') { if (now >= st.countdownAt) launch(); return; }
    if (st.phase === 'clear') { if (now >= st.endAt) finish(`🏁 ${D.title}副本結束，入口重新開放`); return; }
    if (st.phase !== 'run') return;
    if (now >= st.startedAt + D.timeLimitMs) { finish(`⏰ 時間到！${D.name}副本挑戰失敗，大家被送回入口`); return; }
    region.tick(api, now);
    st.foes.forEach(f => { if (f.kind === region.boss) { if (f.alive) region.tickBoss(api, f, now); } else tickChaser(f, now); });
  }

  // 給地區關卡用的工具
  const api = {
    D, st, ctx, MAP, STATS, T, io, say, emit, dist, clamp, rand, now0, inBox, box, teleport, jitter, startOf,
    memberList, activeMembers, preyIn, spawnFoe, mobState, moveFoe, telegraph, segDist, clearStage, hurtPlayer, players,
  };
  closeAll();

  const isMember = (p) => st.members.has(p.id) && st.phase !== 'idle';
  return {
    D, state: publicState,
    go, home, start, leave, remove, onDeath, damage, tick, mobState, isMember,
    action: (name, p, ...args) => (region.actions && region.actions[name] ? region.actions[name](api, p, ...args) : { ok: false }),
    inLobby, nearNpc: (p) => MAP.nearNpc(D, p.x, p.y),
    // 自己回報的位置：隊員不能跑出副本，也不能跳到還沒打到的關卡
    allowMember: (p, x, y) => MAP.areaOf(x) === 'dungeon:' + D.id && MAP.stageAt(x, y) <= st.stage,
    inFight: (p) => st.members.has(p.id) && MAP.stageAt(p.x, p.y) >= 0,
    foes: () => st.foes.filter(f => f.alive),
    allFoes: () => st.foes,
    boxAt: (x, y) => { const i = MAP.stageAt(x, y); return i >= 0 ? box(i) : null; },
    boundsOf: (f) => foeBox(f),
  };
}

// 所有副本：server.js 只跟這個打交道，依照玩家在哪裡、是哪個副本的隊員轉給對的副本
module.exports = function createDungeons(ctx) {
  const { MAP } = ctx;
  const list = MAP.DG_LIST.map(D => createDungeon(ctx, D, REGIONS[D.id]));
  const byId = (id) => list.find(g => g.D.id === id);
  const mine = (p) => list.find(g => g.isMember(p)) || null;
  const here = (x) => { const D = MAP.dungeonAt(x); return D ? byId(D.id) : null; };
  return {
    state: () => list.map(g => g.state()),
    // 跟哪個 NPC 說話就去哪個副本的候位區
    go: (p) => { const g = list.find(g => g.nearNpc(p)); return g ? g.go(p) : { ok: false, error: '先走到 NPC 旁邊' }; },
    home: (p) => { const g = here(p.x); return g ? g.home(p) : { ok: false }; },
    start: (p) => { const g = here(p.x); return g ? g.start(p) : { ok: false }; },
    leave: (p) => { const g = mine(p); return g ? g.leave(p) : { ok: false }; },
    action: (name, p, ...args) => { const g = mine(p); return g ? g.action(name, p, ...args) : { ok: false }; },
    remove: (id) => list.forEach(g => g.remove(id)),
    onDeath: (p, by) => { const g = mine(p); if (g) g.onDeath(p, by); },
    damage: (p, f, ...args) => { const g = byId(f.dgId); if (g) g.damage(p, f, ...args); },
    tick: (now) => list.forEach(g => g.tick(now)),
    mobState: (f) => byId(f.dgId).mobState(f),
    isMember: (p) => !!mine(p),
    dgOf: (p) => { const g = mine(p); return g ? g.D.id : null; },
    // 總部、副本、候位區之間只能靠傳送，不能自己走過去
    allowMove: (p, x, y) => {
      const g = mine(p);
      if (g) return g.allowMember(p, x, y);
      return MAP.zoneOf(x) !== 'dungeon' && MAP.areaOf(x) === MAP.areaOf(p.x);
    },
    inFight: (p) => { const g = mine(p); return !!g && g.inFight(p); },
    foes: () => list.flatMap(g => g.foes()),
    foe: (id) => list.flatMap(g => g.allFoes()).find(f => f.id === id) || null,
    allFoes: () => list.flatMap(g => g.allFoes()),
    boxAt: (x, y) => { const g = here(x); return g ? g.boxAt(x, y) : null; },
    boundsOf: (f) => byId(f.dgId).boundsOf(f),
  };
};
