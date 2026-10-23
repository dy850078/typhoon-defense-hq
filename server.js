const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const MAP = require('./shared/map');
const AVATAR = require('./shared/avatar');
const STATS = require('./shared/stats');

const PORT = Number(process.env.PORT) || 3000;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 40;
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';
const JITSI_ROOM = process.env.JITSI_ROOM || 'TyphoonDefenseHQ-' + Math.random().toString(36).slice(2, 8);
const HISTORY_SIZE = 50;
const CRATE_HITS = 3; // 敲幾下會掉出東西
// 颱風血量 = 基本血量 + 每位在線玩家再加一些，人多也不會一下就被打死
const MONSTER_HP = Number(process.env.MONSTER_HP) || 8000;
const MONSTER_HP_PER_PLAYER = Number(process.env.MONSTER_HP_PER_PLAYER) || 2000;
const RESPAWN_MS = (Number(process.env.RESPAWN_MINUTES) || 5) * 60 * 1000;
const CRATE_RESTOCK_MS = (Number(process.env.CRATE_RESTOCK_SECONDS) || 60) * 1000;
const COOK_MS = 2500;
// 颱風的三種攻擊：先在地上預警，delay 毫秒後打下來
const ATTACKS = {
  gust: { r: 240, delay: 1200, dmg: [16, 24] }, // 強風：以颱風為中心吹一圈，會把人吹開
  rain: { r: 80, delay: 1500, dmg: [22, 30], max: 4, reach: 650 }, // 暴雨彈：砸向幾個玩家腳下
  bolt: { r: 70, delay: 900, dmg: [30, 40], reach: 520 }, // 落雷：劈一個人，最痛
};
const FIREWORK_MS = 6000; // 每個人放煙火的間隔
const T = MAP.TILE;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));
app.use('/vendor', express.static(path.join(__dirname, 'node_modules/phaser/dist')));
app.get('/config', (req, res) => res.json({ jitsiDomain: JITSI_DOMAIN, jitsiRoom: JITSI_ROOM }));

const server = http.createServer(app);
const io = new Server(server);

const players = new Map(); // socket.id -> player
const history = [];

const clean = (s, max) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// ---------------- 颱風怪物 ----------------
const Z = MAP.MONSTER_ZONE;
const monster = { alive: true, hp: MONSTER_HP, maxHp: MONSTER_HP, x: (Z.x1 + Z.x2) / 2, y: (Z.y1 + Z.y2) / 2,
  tx: 0, ty: 0, respawnAt: 0, nextAttack: Date.now() + 6000, frozenUntil: 0, weakUntil: 0, damage: new Map() };

const rand = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));
const targetHp = () => MONSTER_HP + MONSTER_HP_PER_PLAYER * players.size;

function monsterState() {
  const now = Date.now();
  return { alive: monster.alive, hp: monster.hp, maxHp: monster.maxHp, x: Math.round(monster.x), y: Math.round(monster.y),
    respawnIn: monster.alive ? 0 : Math.max(0, monster.respawnAt - now),
    frozen: Math.max(0, monster.frozenUntil - now), weak: Math.max(0, monster.weakUntil - now) };
}

function spawnMonster() {
  const hp = targetHp();
  Object.assign(monster, { alive: true, hp, maxHp: hp, x: (Z.x1 + Z.x2) / 2, y: (Z.y1 + Z.y2) / 2,
    nextAttack: Date.now() + 6000, frozenUntil: 0, weakUntil: 0 });
  monster.damage.clear();
  pickMonsterTarget();
  io.emit('monster', monsterState());
  pushChat({ system: true, text: `🌀 颱風${STATS.MONSTER.name}又生成了！大家快到颱風前線集合！`, t: Date.now() });
}

// 有新玩家進來時，颱風的血量上限跟著變高（不會變低）
function growMonster() {
  const hp = targetHp();
  if (!monster.alive || hp <= monster.maxHp) return;
  monster.hp += hp - monster.maxHp;
  monster.maxHp = hp;
  io.emit('monster', monsterState());
}

function pickMonsterTarget() {
  monster.tx = Z.x1 + Math.random() * (Z.x2 - Z.x1);
  monster.ty = Z.y1 + Math.random() * (Z.y2 - Z.y1);
}
pickMonsterTarget();

const alivePlayers = () => [...players.values()].filter(p => !p.dead);
// 只有站在颱風前線（圍欄外）的人會被怪物打到，回到圍欄內就安全了
const inField = (p) => { const r = MAP.roomAt(p.x, p.y); return !!r && r.id === 'front'; };
const fieldPlayers = () => alivePlayers().filter(inField);

// 颱風出招：先送預警（地上的圈圈），時間到再判定誰被打到；被冰凍的話這招就取消
function monsterAttack(now) {
  const near = (reach) => fieldPlayers().filter(p => dist(p.x, p.y, monster.x, monster.y) <= reach);
  const roll = Math.random();
  let type = roll < 0.35 ? 'gust' : roll < 0.7 ? 'rain' : 'bolt';
  const a = ATTACKS[type];
  let spots;
  if (type === 'gust') spots = [{ x: Math.round(monster.x), y: Math.round(monster.y) }];
  else {
    const pool = near(a.reach).sort(() => Math.random() - 0.5).slice(0, type === 'rain' ? a.max : 1);
    if (!pool.length) { type = 'gust'; spots = [{ x: Math.round(monster.x), y: Math.round(monster.y) }]; }
    else spots = pool.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  }
  const atk = ATTACKS[type];
  io.emit('mAttack', { type, r: atk.r, delay: atk.delay, spots });
  setTimeout(() => {
    if (!monster.alive || Date.now() < monster.frozenUntil) return;
    io.emit('mAttackHit', { type, r: atk.r, spots });
    const weak = Date.now() < monster.weakUntil ? STATS.WEAKEN.dmgDealt : 1;
    fieldPlayers().forEach(p => {
      if (spots.some(s => dist(p.x, p.y, s.x, s.y) <= atk.r)) hurt(p, Math.round(rand(atk.dmg) * weak), `颱風${STATS.MONSTER.name}`);
    });
  }, atk.delay);
}

// ---------------- 野外小怪 ----------------
// 蔣不聽、徐小心各兩隻：在前線晃，有人靠近就追過去打
const mobs = [];
['chiang', 'chiang', 'hsu', 'hsu'].forEach((kind, i) => {
  const def = STATS.MOBS[kind];
  mobs.push({ id: 'm' + i, kind, alive: true, hp: def.hp, maxHp: def.hp, x: 0, y: 0, tx: 0, ty: 0,
    respawnAt: 0, nextHit: 0, frozenUntil: 0, weakUntil: 0, damage: new Map() });
});
function placeMob(m) {
  m.x = Z.x1 + Math.random() * (Z.x2 - Z.x1);
  m.y = Z.y1 + Math.random() * (Z.y2 - Z.y1);
  m.tx = m.x; m.ty = m.y;
}
mobs.forEach(placeMob);
function mobState(m) {
  const now = Date.now();
  return { id: m.id, kind: m.kind, alive: m.alive, hp: m.hp, maxHp: m.maxHp, x: Math.round(m.x), y: Math.round(m.y),
    frozen: Math.max(0, m.frozenUntil - now), weak: Math.max(0, m.weakUntil - now) };
}
function tickMob(m, now) {
  const def = STATS.MOBS[m.kind];
  if (!m.alive) {
    if (now < m.respawnAt) return;
    Object.assign(m, { alive: true, hp: def.hp, frozenUntil: 0, weakUntil: 0 });
    m.damage.clear();
    placeMob(m);
    io.emit('mob', mobState(m));
    return;
  }
  if (now < m.frozenUntil) return;
  // 追最近的人（只追在前線的）
  let prey = null, pd = 280;
  fieldPlayers().forEach(p => { const d = dist(p.x, p.y, m.x, m.y); if (d < pd) { pd = d; prey = p; } });
  if (prey) { m.tx = prey.x; m.ty = prey.y; }
  else if (dist(m.x, m.y, m.tx, m.ty) < 10) {
    m.tx = clamp(m.x + (Math.random() - 0.5) * 400, Z.x1, Z.x2);
    m.ty = clamp(m.y + (Math.random() - 0.5) * 300, Z.y1, Z.y2);
  }
  const d = dist(m.x, m.y, m.tx, m.ty);
  if (d > (prey ? def.range * 0.6 : 10)) {
    const step = Math.min(d, def.speed * TICK / 1000);
    m.x = clamp(m.x + (m.tx - m.x) / d * step, Z.x1, Z.x2);
    m.y = clamp(m.y + (m.ty - m.y) / d * step, Z.y1, Z.y2);
  }
  if (prey && pd <= def.range && now >= m.nextHit) {
    m.nextHit = now + 2200 + Math.random() * 800;
    io.emit('mobAttack', { mid: m.id, id: prey.id, say: def.say[Math.floor(Math.random() * def.say.length)] });
    setTimeout(() => {
      if (!m.alive || Date.now() < m.frozenUntil || !players.has(prey.id) || !inField(prey)) return;
      if (dist(prey.x, prey.y, m.x, m.y) > def.range * 1.3) return; // 跑掉就沒打到
      const weak = Date.now() < m.weakUntil ? STATS.WEAKEN.dmgDealt : 1;
      hurt(prey, Math.round(rand(def.dmg) * weak), def.name);
    }, 450);
  }
}

const TICK = 100;
setInterval(() => {
  const now = Date.now();
  mobs.forEach(m => tickMob(m, now));
  io.volatile.emit('mobsMove', mobs.filter(m => m.alive).map(m => [m.id, Math.round(m.x), Math.round(m.y)]));
  if (!monster.alive) {
    if (now >= monster.respawnAt) spawnMonster();
    return;
  }
  if (now < monster.frozenUntil) return; // 冰凍中：不動也不出招
  // 慢慢在前線飄來飄去
  const d = dist(monster.x, monster.y, monster.tx, monster.ty);
  if (d < 10) pickMonsterTarget();
  else {
    const step = Math.min(d, 70 * TICK / 1000);
    monster.x += (monster.tx - monster.x) / d * step;
    monster.y += (monster.ty - monster.y) / d * step;
  }
  if (now >= monster.nextAttack) {
    monster.nextAttack = now + 3500 + Math.random() * 2500;
    monsterAttack(now);
  }
  io.volatile.emit('monsterMove', { x: Math.round(monster.x), y: Math.round(monster.y) });
}, TICK);

function pushChat(msg) {
  history.push(msg);
  if (history.length > HISTORY_SIZE) history.shift();
  io.emit('chat', msg);
}

// ---------------- 角色數值 ----------------
// 防禦力 = 職業的防禦 + 還沒過期的增益
function defOf(p) {
  const now = Date.now();
  return p.def + Object.values(p.buffs).reduce((s, b) => s + (b.until > now ? b.v : 0), 0);
}
function publicStats(p) {
  const now = Date.now();
  const buff = Math.max(0, ...Object.values(p.buffs).map(b => b.until - now));
  return { id: p.id, cls: p.cls, hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp, atk: p.atk,
    def: defOf(p), buffMs: buff, dead: p.dead,
    level: p.level, exp: p.exp, expNext: STATS.LEVEL.expFor(p.level), onlineLeft: STATS.LEVEL.onlineMs - p.onlineMs };
}
function sendStats(p) { io.emit('stats', publicStats(p)); }

// 經驗值與升等
function gainExp(p, n) {
  if (p.level >= STATS.LEVEL.max) return;
  p.exp += Math.round(n);
  while (p.level < STATS.LEVEL.max && p.exp >= STATS.LEVEL.expFor(p.level)) {
    p.exp -= STATS.LEVEL.expFor(p.level);
    levelUp(p, false);
  }
}
function levelUp(p, byTime) {
  if (p.level >= STATS.LEVEL.max) return;
  p.level++;
  Object.assign(p, STATS.statsFor(p.cls, p.level));
  if (!p.dead) { p.hp = p.maxHp; p.mp = p.maxMp; } // 升等順便補滿
  sendStats(p);
  io.emit('levelUp', { id: p.id, level: p.level });
  const extra = p.level === STATS.LEVEL.fireworkLv ? '，可以放慶祝煙火了 🎆' : '';
  pushChat({ system: true, text: `⭐ ${p.name} 升到 Lv.${p.level}${byTime ? '（陪大家 10 分鐘）' : ''}${extra}`, t: Date.now() });
}

function hurt(p, raw, by) {
  if (p.dead) return;
  p.hp = Math.max(0, p.hp - STATS.reduce(raw, defOf(p)));
  if (p.hp > 0) return sendStats(p);
  p.dead = true;
  sendStats(p);
  pushChat({ system: true, text: `💫 ${p.name} 被${by}打倒了，${STATS.RESPAWN_MS / 1000} 秒後回到總部`, t: Date.now() });
  setTimeout(() => {
    if (!players.has(p.id)) return;
    p.dead = false;
    p.hp = p.maxHp;
    p.x = MAP.spawn.x; p.y = MAP.spawn.y;
    io.emit('playerMoved', { id: p.id, x: p.x, y: p.y, dir: p.dir, moving: false, teleport: true });
    sendStats(p);
  }, STATS.RESPAWN_MS);
}

// 魔力慢慢回復；在線時間滿 10 分鐘升一等
setInterval(() => {
  players.forEach(p => {
    p.onlineMs += 1000;
    if (p.onlineMs >= STATS.LEVEL.onlineMs) { p.onlineMs = 0; levelUp(p, true); }
    if (p.dead || p.mp >= p.maxMp) return;
    p.mp = Math.min(p.maxMp, p.mp + STATS.REGEN.mpPerSec);
    sendStats(p);
  });
}, 1000);

// ---------------- 物資箱 ----------------
// key 'tx,ty' -> { hits, emptyUntil }；被敲開的箱子會空一段時間再補貨
const crates = new Map();
function emptyCrates() {
  const now = Date.now();
  return [...crates.entries()].filter(([, c]) => c.emptyUntil > now).map(([k]) => k);
}

// 傳給別人的玩家資料（不含冷卻、增益這些內部狀態）
function publicPlayer(p) {
  const { cooldowns, buffs, cooking, vip, ...rest } = p;
  return Object.assign(rest, publicStats(p), { hasVip: !!vip });
}

io.on('connection', (socket) => {
  let lastChat = 0;

  socket.on('join', (data, ack) => {
    if (typeof ack !== 'function') return;
    if (players.has(socket.id)) return ack({ ok: false, error: '已經加入了' });
    if (players.size >= MAX_PLAYERS) return ack({ ok: false, error: '總部已經擠滿人了，等等再試！' });

    const name = clean(data && data.name, 12);
    if (!name) return ack({ ok: false, error: '請輸入名字' });
    const hair = AVATAR.HAIRS[data.hair] ? data.hair : 'short';
    const skin = AVATAR.SKINS.includes(data.skin) ? data.skin : AVATAR.SKINS[0];
    const hairColor = AVATAR.HAIR_COLORS.includes(data.hairColor) ? data.hairColor : AVATAR.HAIR_COLORS[0];
    const outfit = AVATAR.OUTFITS.includes(data.outfit) ? data.outfit : AVATAR.OUTFITS[0];
    const glasses = String(data.glasses) === '0' ? '0' : '1';
    // 報名頁的邀請函資料（只在別人點「個人資料」時才傳出去）
    let vip = null;
    if (data.vip && typeof data.vip === 'object') {
      const photo = typeof data.vip.photo === 'string' && data.vip.photo.length <= 20000 &&
        /^[A-Za-z0-9+/=]+$/.test(data.vip.photo) ? data.vip.photo : '';
      vip = { name: clean(data.vip.name, 16) || name, song: clean(data.vip.song, 40), drink: clean(data.vip.drink, 24),
        theme: data.vip.theme === 's' ? 's' : 'n', photo };
      if (!vip.song && !vip.drink && !vip.photo) vip = null;
    }

    const p = {
      id: socket.id, name, hair, skin, hairColor, outfit, glasses,
      x: MAP.spawn.x + (Math.random() - 0.5) * 60,
      y: MAP.spawn.y + (Math.random() - 0.5) * 40,
      dir: 1, moving: false,
      inv: { noodle: 0, water: 0, veggie: 0 },
      // 重新連線時沿用上次的職業
      cls: STATS.CLASSES[data.cls] ? data.cls : 'staff', dead: false, cooldowns: {}, buffs: {},
      // 等級存在玩家自己的瀏覽器，伺服器重開也不會不見
      level: clamp(Math.floor(Number(data.level)) || 1, 1, STATS.LEVEL.max),
      exp: Math.max(0, Math.floor(Number(data.exp)) || 0), onlineMs: 0, vip,
    };
    Object.assign(p, STATS.statsFor(p.cls, p.level));
    p.hp = p.maxHp; p.mp = p.maxMp;
    players.set(socket.id, p);

    growMonster();
    ack({ ok: true, you: publicPlayer(p), players: [...players.values()].map(publicPlayer), history,
      monster: monsterState(), mobs: mobs.map(mobState), emptyCrates: emptyCrates() });
    socket.broadcast.emit('playerJoined', publicPlayer(p));
    pushChat({ system: true, text: `${name} 進入了防衛總部 🌀`, t: Date.now() });
  });

  socket.on('move', (m) => {
    const p = players.get(socket.id);
    if (!p || !m || p.dead) return;
    const x = Number(m.x), y = Number(m.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    p.x = clamp(x, 0, MAP.W * MAP.TILE);
    p.y = clamp(y, 0, MAP.H * MAP.TILE);
    p.dir = m.dir === -1 ? -1 : 1;
    p.moving = !!m.moving;
    socket.volatile.broadcast.emit('playerMoved', { id: p.id, x: p.x, y: p.y, dir: p.dir, moving: p.moving });
  });

  // 敲物資箱：大家一起敲，敲滿 CRATE_HITS 下掉出東西，箱子空掉一段時間後補貨
  let lastAction = 0;
  socket.on('hitCrate', (m, ack) => {
    const p = players.get(socket.id);
    if (!p || !m || typeof ack !== 'function' || p.dead) return;
    const now = Date.now();
    if (now - lastAction < 300) return ack({ ok: false });
    const tx = Math.floor(Number(m.tx)), ty = Math.floor(Number(m.ty));
    const ci = MAP.crateAt(tx, ty);
    if (ci < 0 || dist(p.x, p.y, (tx + 0.5) * T, (ty + 0.5) * T) > 1.7 * T) return ack({ ok: false });
    const key = tx + ',' + ty;
    const c = crates.get(key) || { hits: 0, emptyUntil: 0 };
    if (c.emptyUntil > now) return ack({ ok: false, empty: true });
    lastAction = now;
    io.emit('crateHit', { tx, ty, id: p.id });
    c.hits++;
    crates.set(key, c);
    if (c.hits < CRATE_HITS) return ack({ ok: true, hits: c.hits });
    c.hits = 0;
    c.emptyUntil = now + CRATE_RESTOCK_MS;
    const keys = Object.keys(MAP.ITEMS);
    const item = MAP.CRATES[ci].item || keys[Math.floor(Math.random() * keys.length)];
    p.inv[item]++;
    io.emit('itemGot', { id: p.id, item });
    io.emit('crateEmpty', { tx, ty });
    setTimeout(() => io.emit('crateRestock', { tx, ty }), CRATE_RESTOCK_MS);
    ack({ ok: true, item, inv: p.inv });
  });

  // 放技能：skillId 對應 shared/stats.js 的 SKILLS；普通攻擊也走這裡
  // target：'boss'（颱風）或小怪的 id
  socket.on('attack', (skillId, target, ack) => {
    if (typeof target === 'function') { ack = target; target = 'boss'; }
    const p = players.get(socket.id);
    if (typeof ack !== 'function') return;
    if (!p || p.dead) return ack({ ok: false });
    const skill = STATS.SKILLS[skillId];
    if (!skill || !STATS.CLASSES[p.cls].skills.includes(skillId)) return ack({ ok: false });
    const now = Date.now();
    if (now - lastAction < 300 || now < (p.cooldowns[skillId] || 0)) return ack({ ok: false });
    const isBoss = !target || target === 'boss';
    const foe = isBoss ? monster : mobs.find(m => m.id === target);
    const foeName = isBoss ? `颱風${STATS.MONSTER.name}` : foe ? STATS.MOBS[foe.kind].name : '';
    if (!skill.support) {
      if (!foe || !foe.alive) return ack({ ok: false, error: isBoss ? `颱風${STATS.MONSTER.name}還沒出現` : '它已經被打倒了' });
      if (dist(p.x, p.y, foe.x, foe.y) > skill.range) return ack({ ok: false, error: `離${foeName}太遠了` });
    }
    if (p.mp < skill.mp) return ack({ ok: false, error: '魔力不夠' });
    lastAction = now;
    p.cooldowns[skillId] = now + skill.cooldown;
    if (skill.mp) p.mp -= skill.mp;

    // 各種效果
    const fx = { id: p.id, skill: skillId, x: Math.round(p.x), y: Math.round(p.y), target: isBoss ? 'boss' : foe.id, targets: [] };
    const around = (r) => alivePlayers().filter(q => dist(q.x, q.y, p.x, p.y) <= r);
    let support = 0; // 補血、加防也算經驗
    if (skill.heal) {
      around(skill.heal.r).forEach(q => {
        support += Math.min(skill.heal.hp, q.maxHp - q.hp);
        q.hp = Math.min(q.maxHp, q.hp + skill.heal.hp);
        q.mp = Math.min(q.maxMp, q.mp + skill.heal.mp);
        fx.targets.push(q.id);
        if (q !== p) sendStats(q);
      });
    }
    if (skill.teamDef) {
      around(skill.teamDef.r).forEach(q => {
        q.buffs.team = { v: skill.teamDef.v, until: now + skill.teamDef.ms };
        fx.targets.push(q.id);
        support += 15;
        if (q !== p) sendStats(q);
      });
    }
    if (skill.selfDef) p.buffs.self = { v: skill.selfDef.v, until: now + skill.selfDef.ms };
    if (foe && skill.weaken) foe.weakUntil = now + skill.weaken;
    if (foe && skill.freeze) foe.frozenUntil = now + skill.freeze;
    if (support) gainExp(p, support);
    sendStats(p);
    io.emit('skillFx', fx);
    if (foe && (skill.weaken || skill.freeze)) io.emit(isBoss ? 'monster' : 'mob', isBoss ? monsterState() : mobState(foe));

    if (!skill.power) return ack({ ok: true });
    const crit = Math.random() < 0.12;
    const weak = now < foe.weakUntil ? STATS.WEAKEN.dmgTaken : 1;
    const dmg = Math.round(p.atk * skill.power * (0.6 + Math.random() * 0.6) * (crit ? 2.5 : 1) * weak);
    foe.hp = Math.max(0, foe.hp - dmg);
    foe.damage.set(p.name, (foe.damage.get(p.name) || 0) + dmg);
    gainExp(p, dmg);
    ack({ ok: true, dmg });
    if (!isBoss) {
      io.emit('mobHit', { mid: foe.id, id: p.id, dmg, crit, hp: foe.hp, skill: skillId });
      if (foe.hp > 0) return;
      foe.alive = false;
      foe.respawnAt = now + STATS.MOB_RESPAWN_MS;
      io.emit('mob', mobState(foe));
      gainExp(p, STATS.MOBS[foe.kind].exp);
      pushChat({ system: true, text: `👏 ${p.name} 打倒了${foeName}！`, t: now });
      return;
    }
    io.emit('monsterHit', { id: p.id, dmg, crit, hp: monster.hp, skill: skillId });
    if (monster.hp > 0) return;
    monster.alive = false;
    monster.respawnAt = now + RESPAWN_MS;
    const top = [...monster.damage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    io.emit('monster', monsterState());
    // 有打到颱風的人都多拿一筆經驗
    players.forEach(q => { if (monster.damage.has(q.name)) gainExp(q, 400); });
    const mins = Math.round(RESPAWN_MS / 60000);
    pushChat({ system: true, text: `🎉 ${p.name} 打出最後一擊，颱風${STATS.MONSTER.name}被擊退了！${mins} 分鐘後會再生成。`, t: now });
    if (top.length) pushChat({ system: true, text: '🏅 輸出排行：' + top.map(([n, d], i) => `${i + 1}. ${n} ${d}`).join('、'), t: now });
  });

  // 看某個人的個人資料（報名時的 VIP Pass）
  socket.on('profile', (id, ack) => {
    if (typeof ack !== 'function') return;
    const q = players.get(id);
    if (!q) return ack({ ok: false, error: '這個人已經離開了' });
    ack({ ok: true, name: q.name, cls: q.cls, level: q.level, vip: q.vip });
  });

  // 跟指揮中心的導師說話轉職：血量魔力照比例換算，技能冷卻重置
  socket.on('changeClass', (cls, ack) => {
    const p = players.get(socket.id);
    if (typeof ack !== 'function') return;
    if (!p || p.dead || !STATS.CLASSES[cls]) return ack({ ok: false });
    if (!MAP.nearMentor(p.x, p.y)) return ack({ ok: false, error: '要站在導師旁邊才能轉職' });
    if (cls === p.cls) return ack({ ok: false, error: '你已經是這個職業了' });
    const hpRatio = p.hp / p.maxHp, mpRatio = p.mp / p.maxMp;
    p.cls = cls;
    Object.assign(p, STATS.statsFor(cls, p.level));
    p.hp = Math.max(1, Math.round(p.maxHp * hpRatio));
    p.mp = Math.round(p.maxMp * mpRatio);
    p.cooldowns = {};
    sendStats(p);
    ack({ ok: true });
    pushChat({ system: true, text: `✨ ${p.name} 轉職成為 ${STATS.CLASSES[cls].icon} ${STATS.CLASSES[cls].name}！`, t: Date.now() });
  });

  // 慶祝煙火：在自己頭上炸出輸入的文字，大家都看得到
  let lastFirework = 0;
  socket.on('firework', (text, ack) => {
    const p = players.get(socket.id);
    if (typeof ack !== 'function') return;
    if (!p) return ack({ ok: false });
    if (p.level < STATS.LEVEL.fireworkLv) return ack({ ok: false, error: `升到 Lv.${STATS.LEVEL.fireworkLv} 才能放煙火（現在 Lv.${p.level}）` });
    const t = clean(text, 8);
    if (!t) return ack({ ok: false, error: '請輸入煙火的文字' });
    const now = Date.now();
    if (now - lastFirework < FIREWORK_MS) return ack({ ok: false, error: '煙火還在裝填，等幾秒再放' });
    lastFirework = now;
    io.emit('firework', { id: p.id, text: t, x: Math.round(p.x), y: Math.round(p.y) });
    pushChat({ system: true, text: `🎆 ${p.name} 放了煙火：「${t}」`, t: now });
    ack({ ok: true });
  });

  // 煮泡麵：在爐台旁邊、有泡麵才能煮；有蔬菜會自動加進去，補更多血
  socket.on('cook', (ack) => {
    const p = players.get(socket.id);
    if (typeof ack !== 'function') return;
    if (!p || p.dead || p.cooking) return ack({ ok: false });
    if (!MAP.nearStove(p.x, p.y, 1.8 * T)) return ack({ ok: false, error: '要站在爐台旁邊' });
    if (p.inv.noodle < 1) return ack({ ok: false, error: '沒有泡麵，先去物資倉庫敲箱子' });
    const veggie = p.inv.veggie > 0;
    p.inv.noodle--;
    if (veggie) p.inv.veggie--;
    p.cooking = true;
    io.emit('cooking', { id: p.id, ms: COOK_MS });
    ack({ ok: true, ms: COOK_MS, inv: p.inv });
    setTimeout(() => {
      p.cooking = false;
      if (!players.has(p.id)) return;
      const food = STATS.FOODS[veggie ? 'noodleVeggie' : 'noodle'];
      p.hp = Math.min(p.maxHp, p.hp + food.hp);
      sendStats(p);
      socket.emit('ate', { food: food.name, hp: food.hp });
    }, COOK_MS);
  });

  // 喝礦泉水補魔力，在哪裡都可以喝
  socket.on('drink', (ack) => {
    const p = players.get(socket.id);
    if (typeof ack !== 'function') return;
    if (!p || p.dead || p.inv.water < 1) return ack({ ok: false });
    p.inv.water--;
    p.mp = Math.min(p.maxMp, p.mp + STATS.FOODS.water.mp);
    sendStats(p);
    ack({ ok: true, inv: p.inv, mp: STATS.FOODS.water.mp });
  });

  socket.on('chat', (text) => {
    const p = players.get(socket.id);
    if (!p) return;
    const now = Date.now();
    if (now - lastChat < 400) return; // 簡單防洗版
    lastChat = now;
    const t = clean(text, 200);
    if (!t) return;
    pushChat({ id: p.id, name: p.name, text: t, t: now });
  });

  socket.on('disconnect', (reason) => {
    if (process.env.DEBUG) console.log('disconnect', socket.id, reason);
    const p = players.get(socket.id);
    if (!p) return;
    players.delete(socket.id);
    io.emit('playerLeft', socket.id);
    pushChat({ system: true, text: `${p.name} 離開了總部`, t: Date.now() });
  });
});

server.listen(PORT, () => {
  console.log(`🌀 颱風天防衛總部已啟動：http://localhost:${PORT}`);
  console.log(`📹 視訊房間：https://${JITSI_DOMAIN}/${JITSI_ROOM}`);
});
