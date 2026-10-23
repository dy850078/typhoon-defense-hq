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
const MONSTER_HP = Number(process.env.MONSTER_HP) || 600;
const RESPAWN_MS = (Number(process.env.RESPAWN_MINUTES) || 5) * 60 * 1000;
const CRATE_RESTOCK_MS = (Number(process.env.CRATE_RESTOCK_SECONDS) || 60) * 1000;
const COOK_MS = 2500;
const GUST_DAMAGE = [8, 14];
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
  tx: 0, ty: 0, respawnAt: 0, nextGust: 0, damage: new Map() };

function monsterState() {
  return { alive: monster.alive, hp: monster.hp, maxHp: monster.maxHp, x: Math.round(monster.x), y: Math.round(monster.y),
    respawnIn: monster.alive ? 0 : Math.max(0, monster.respawnAt - Date.now()) };
}

function spawnMonster() {
  Object.assign(monster, { alive: true, hp: MONSTER_HP, x: (Z.x1 + Z.x2) / 2, y: (Z.y1 + Z.y2) / 2,
    nextGust: Date.now() + 6000 });
  monster.damage.clear();
  pickMonsterTarget();
  io.emit('monster', monsterState());
  pushChat({ system: true, text: `🌀 颱風${STATS.MONSTER.name}又生成了！大家快到颱風前線集合！`, t: Date.now() });
}

function pickMonsterTarget() {
  monster.tx = Z.x1 + Math.random() * (Z.x2 - Z.x1);
  monster.ty = Z.y1 + Math.random() * (Z.y2 - Z.y1);
}
pickMonsterTarget();

const TICK = 100;
setInterval(() => {
  const now = Date.now();
  if (!monster.alive) {
    if (now >= monster.respawnAt) spawnMonster();
    return;
  }
  // 慢慢在前線飄來飄去
  const d = dist(monster.x, monster.y, monster.tx, monster.ty);
  if (d < 10) pickMonsterTarget();
  else {
    const step = Math.min(d, 70 * TICK / 1000);
    monster.x += (monster.tx - monster.x) / d * step;
    monster.y += (monster.ty - monster.y) / d * step;
  }
  // 每隔幾秒吹一陣強風，把附近的人吹開
  if (now >= monster.nextGust) {
    monster.nextGust = now + 6000 + Math.random() * 4000;
    const gust = { x: Math.round(monster.x), y: Math.round(monster.y), r: 230 };
    io.emit('gust', gust);
    players.forEach(p => {
      if (dist(p.x, p.y, gust.x, gust.y) <= gust.r) {
        hurt(p, GUST_DAMAGE[0] + Math.floor(Math.random() * (GUST_DAMAGE[1] - GUST_DAMAGE[0] + 1)));
      }
    });
  }
  io.volatile.emit('monsterMove', { x: Math.round(monster.x), y: Math.round(monster.y) });
}, TICK);

function pushChat(msg) {
  history.push(msg);
  if (history.length > HISTORY_SIZE) history.shift();
  io.emit('chat', msg);
}

// ---------------- 角色數值 ----------------
function publicStats(p) {
  return { id: p.id, hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp, atk: p.atk, dead: p.dead };
}
function sendStats(p) { io.emit('stats', publicStats(p)); }

function hurt(p, dmg) {
  if (p.dead) return;
  p.hp = Math.max(0, p.hp - dmg);
  if (p.hp > 0) return sendStats(p);
  p.dead = true;
  sendStats(p);
  pushChat({ system: true, text: `💫 ${p.name} 被颱風${STATS.MONSTER.name}吹倒了，${STATS.RESPAWN_MS / 1000} 秒後回到總部`, t: Date.now() });
  setTimeout(() => {
    if (!players.has(p.id)) return;
    p.dead = false;
    p.hp = p.maxHp;
    p.x = MAP.spawn.x; p.y = MAP.spawn.y;
    io.emit('playerMoved', { id: p.id, x: p.x, y: p.y, dir: p.dir, moving: false, teleport: true });
    sendStats(p);
  }, STATS.RESPAWN_MS);
}

// 魔力慢慢回復
setInterval(() => {
  players.forEach(p => {
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

    const p = {
      id: socket.id, name, hair, skin, hairColor, outfit, glasses,
      x: MAP.spawn.x + (Math.random() - 0.5) * 60,
      y: MAP.spawn.y + (Math.random() - 0.5) * 40,
      dir: 1, moving: false,
      inv: { noodle: 0, water: 0, veggie: 0 },
      cls: 'staff', dead: false, cooldowns: {},
    };
    Object.assign(p, STATS.statsFor(p.cls));
    p.hp = p.maxHp; p.mp = p.maxMp;
    players.set(socket.id, p);

    ack({ ok: true, you: p, players: [...players.values()], history, monster: monsterState(), emptyCrates: emptyCrates() });
    socket.broadcast.emit('playerJoined', p);
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

  // 打颱風：skill 對應 shared/stats.js 的 SKILLS
  socket.on('attack', (skillId, ack) => {
    const p = players.get(socket.id);
    if (typeof ack !== 'function') return;
    if (!p || p.dead) return ack({ ok: false });
    const cls = STATS.CLASSES[p.cls];
    const skill = STATS.SKILLS[skillId];
    if (!skill || !cls.skills.includes(skillId)) return ack({ ok: false });
    const now = Date.now();
    if (!monster.alive || now - lastAction < 300 || now < (p.cooldowns[skillId] || 0)) return ack({ ok: false });
    if (dist(p.x, p.y, monster.x, monster.y) > 130) return ack({ ok: false });
    if (p.mp < skill.mp) return ack({ ok: false, error: '魔力不夠' });
    lastAction = now;
    p.cooldowns[skillId] = now + skill.cooldown;
    if (skill.mp) { p.mp -= skill.mp; sendStats(p); }
    const crit = Math.random() < 0.12;
    const dmg = Math.round(p.atk * skill.power * (0.6 + Math.random() * 0.6) * (crit ? 2.5 : 1));
    monster.hp = Math.max(0, monster.hp - dmg);
    monster.damage.set(p.name, (monster.damage.get(p.name) || 0) + dmg);
    io.emit('monsterHit', { id: p.id, dmg, crit, hp: monster.hp, skill: skillId });
    ack({ ok: true, dmg });
    if (monster.hp > 0) return;
    monster.alive = false;
    monster.respawnAt = now + RESPAWN_MS;
    const top = [...monster.damage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    io.emit('monster', monsterState());
    const mins = Math.round(RESPAWN_MS / 60000);
    pushChat({ system: true, text: `🎉 ${p.name} 打出最後一擊，颱風${STATS.MONSTER.name}被擊退了！${mins} 分鐘後會再生成。`, t: now });
    if (top.length) pushChat({ system: true, text: '🏅 輸出排行：' + top.map(([n, d], i) => `${i + 1}. ${n} ${d}`).join('、'), t: now });
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
