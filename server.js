const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const MAP = require('./shared/map');
const AVATAR = require('./shared/avatar');
const STATS = require('./shared/stats');
const GEAR = require('./shared/gear');
const DECOR = require('./shared/decor');

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
  // 第二階段才有的招式
  tornado: { r: 340, delay: 1600, dmg: [30, 42] }, // 超級龍捲風：比強風更大一圈，一樣會把人吹開
  hail: { r: 75, delay: 1300, dmg: [22, 30], max: 8, reach: 900 }, // 冰雹轟炸：砸在每個人腳下，再隨機多砸幾顆
};
const PHASE2_DMG = 1.4; // 第二階段所有招式的傷害倍率
const FIREWORK_MS = 6000; // 每個人放煙火的間隔
// 隱藏蛋糕：在冰箱前輸入暗號就能拿到，拿在手上 3 分鐘
const CAKE_CODE = String(process.env.CAKE_CODE || 'CAKE');
const CAKE_MS = 3 * 60 * 1000;
const T = MAP.TILE;

const app = express();
// 報名頁：分享連結的預覽圖要用完整網址，quick tunnel 的網址每次都不一樣，所以照請求的網址填進去
const INDEX_FILE = path.join(__dirname, 'public', 'index.html');
app.get(['/', '/index.html'], (req, res) => {
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol).split(',')[0].trim();
  const origin = `${proto}://${req.get('host')}`.replace(/[<>"']/g, '');
  fs.readFile(INDEX_FILE, 'utf8', (err, html) => {
    if (err) return res.status(500).end();
    res.type('html').send(html.split('__ORIGIN__').join(origin));
  });
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));
app.use('/vendor', express.static(path.join(__dirname, 'node_modules/phaser/dist')));
app.get('/config', (req, res) => res.json({ jitsiDomain: JITSI_DOMAIN, jitsiRoom: JITSI_ROOM }));

// ---------------- 視訊房間 ----------------
// Jitsi 的會議開久了可能會斷，所以讓大家自己開新房間、輸入房號加入，不用重開伺服器
// 第一個是啟動時設定的 JITSI_ROOM（總部大廳），其他是玩家開的，最新的排前面
const VIDEO_MAX = 12;
const videoRooms = [{ code: JITSI_ROOM, name: '總部大廳', by: '', at: Date.now() }];
const roomCode = (s) => String(s || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
function videoList() {
  const count = (code) => [...players.values()].filter(p => p.video === code).length;
  return videoRooms.map(r => ({ code: r.code, name: r.name, by: r.by, ago: Date.now() - r.at, count: count(r.code) }));
}
function addVideoRoom(code, name, by) {
  let r = videoRooms.find(x => x.code === code);
  if (r) return r;
  r = { code, name, by, at: Date.now() };
  videoRooms.splice(1, 0, r);
  if (videoRooms.length > VIDEO_MAX) videoRooms.length = VIDEO_MAX;
  return r;
}

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
  tx: 0, ty: 0, respawnAt: 0, nextAttack: Date.now() + 6000, frozenUntil: 0, weakUntil: 0, damage: new Map(),
  phase: 1, transformUntil: 0 };

const rand = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));
const targetHp = () => MONSTER_HP + MONSTER_HP_PER_PLAYER * players.size;

function monsterState() {
  const now = Date.now();
  return { alive: monster.alive, hp: monster.hp, maxHp: monster.maxHp, x: Math.round(monster.x), y: Math.round(monster.y),
    respawnIn: monster.alive ? 0 : Math.max(0, monster.respawnAt - now),
    frozen: Math.max(0, monster.frozenUntil - now), weak: Math.max(0, monster.weakUntil - now),
    phase: monster.phase, transforming: Math.max(0, monster.transformUntil - now) };
}

function spawnMonster() {
  const hp = targetHp();
  Object.assign(monster, { alive: true, hp, maxHp: hp, x: (Z.x1 + Z.x2) / 2, y: (Z.y1 + Z.y2) / 2,
    nextAttack: Date.now() + 6000, frozenUntil: 0, weakUntil: 0, phase: 1, transformUntil: 0 });
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
  const roll = Math.random(), p2 = monster.phase === 2;
  let type = !p2 ? (roll < 0.35 ? 'gust' : roll < 0.7 ? 'rain' : 'bolt')
    : roll < 0.25 ? 'tornado' : roll < 0.5 ? 'hail' : roll < 0.65 ? 'gust' : roll < 0.82 ? 'rain' : 'bolt';
  const a = ATTACKS[type];
  const here = () => [{ x: Math.round(monster.x), y: Math.round(monster.y) }];
  let spots;
  if (type === 'gust' || type === 'tornado') spots = here();
  else if (type === 'hail') {
    // 每個人腳下一顆，剩下的隨機砸在颱風附近
    spots = near(a.reach).slice(0, a.max).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
    while (spots.length < a.max) spots.push({ x: Math.round(clamp(monster.x + (Math.random() - 0.5) * 900, Z.x1, Z.x2)),
      y: Math.round(clamp(monster.y + (Math.random() - 0.5) * 600, Z.y1, Z.y2)) });
  } else {
    const max = type === 'rain' ? a.max + (p2 ? 2 : 0) : 1;
    const pool = near(a.reach).sort(() => Math.random() - 0.5).slice(0, max);
    if (!pool.length) { type = 'gust'; spots = here(); }
    else spots = pool.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  }
  const atk = ATTACKS[type];
  io.emit('mAttack', { type, r: atk.r, delay: atk.delay, spots });
  setTimeout(() => {
    if (!monster.alive || Date.now() < monster.frozenUntil) return;
    io.emit('mAttackHit', { type, r: atk.r, spots });
    const weak = (Date.now() < monster.weakUntil ? STATS.WEAKEN.dmgDealt : 1) * (monster.phase === 2 ? PHASE2_DMG : 1);
    fieldPlayers().forEach(p => {
      if (spots.some(s => dist(p.x, p.y, s.x, s.y) <= atk.r)) hurt(p, Math.round(rand(atk.dmg) * weak), `颱風${STATS.MONSTER.name}`);
    });
    summons.slice().forEach(sm => {
      if (spots.some(s => dist(sm.x, sm.y, s.x, s.y) <= atk.r)) hurtSummon(sm, Math.round(rand(atk.dmg) * weak), `颱風${STATS.MONSTER.name}`);
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
  if (now < m.frozenUntil || now < (m.stunUntil || 0)) return;
  // 追最近的人（只追在前線的），召喚物也會被追
  let prey = null, pd = 280;
  fieldPlayers().concat(summons).forEach(p => { const d = dist(p.x, p.y, m.x, m.y); if (d < pd) { pd = d; prey = p; } });
  if (prey) { m.tx = prey.x; m.ty = prey.y; }
  else if (dist(m.x, m.y, m.tx, m.ty) < 10) {
    m.tx = clamp(m.x + (Math.random() - 0.5) * 400, Z.x1, Z.x2);
    m.ty = clamp(m.y + (Math.random() - 0.5) * 300, Z.y1, Z.y2);
  }
  const d = dist(m.x, m.y, m.tx, m.ty);
  if (d > (prey ? def.range * 0.6 : 10)) {
    const step = Math.min(d, def.speed * TICK / 1000);
    const nx = clamp(m.x + (m.tx - m.x) / d * step, Z.x1, Z.x2), ny = clamp(m.y + (m.ty - m.y) / d * step, Z.y1, Z.y2);
    if (wallBlocks(m.x, m.y, nx, ny, WALL_R.mob)) { if (!prey) { m.tx = m.x; m.ty = m.y; } } // 被城牆擋住：原地不動
    else { m.x = nx; m.y = ny; }
  }
  if (prey && pd <= def.range && now >= m.nextHit && !behindWall(m.x, m.y, prey.x, prey.y)) {
    m.nextHit = now + 2200 + Math.random() * 800;
    io.emit('mobAttack', { mid: m.id, id: prey.id, say: def.say[Math.floor(Math.random() * def.say.length)] });
    setTimeout(() => {
      if (!m.alive || Date.now() < m.frozenUntil) return;
      if (dist(prey.x, prey.y, m.x, m.y) > def.range * 1.3) return; // 跑掉就沒打到
      if (behindWall(m.x, m.y, prey.x, prey.y)) return; // 中間多了一道城牆
      const weak = Date.now() < m.weakUntil ? STATS.WEAKEN.dmgDealt : 1;
      const dmg = Math.round(rand(def.dmg) * weak);
      if (prey.summon) return hurtSummon(prey, dmg, def.name);
      if (!players.has(prey.id) || !inField(prey)) return;
      hurt(prey, dmg, def.name);
    }, 450);
  }
}

const TICK = 100;
setInterval(() => {
  const now = Date.now();
  mobs.forEach(m => tickMob(m, now));
  summons.slice().forEach(sm => tickSummon(sm, now));
  tickMonster(now);
  tickWalls(now);
  // 所有會動的東西合成一則送出：volatile 在同一個 tick 連送好幾則時，後面的常常被丟掉（颱風位置就一直沒更新）
  io.volatile.emit('world', {
    mobs: mobs.filter(m => m.alive).map(m => [m.id, Math.round(m.x), Math.round(m.y)]),
    summons: summons.map(sm => [sm.id, Math.round(sm.x), Math.round(sm.y)]),
    boss: monster.alive ? [Math.round(monster.x), Math.round(monster.y)] : null,
  });
}, TICK);

function tickMonster(now) {
  if (!monster.alive) {
    if (now >= monster.respawnAt) spawnMonster();
    return;
  }
  if (now < monster.frozenUntil || now < monster.transformUntil || now < (monster.stunUntil || 0)) return; // 冰凍、暈眩、變身中：不動也不出招
  // 慢慢在前線飄來飄去（變身後飄得比較快）
  const p2 = monster.phase === 2;
  const d = dist(monster.x, monster.y, monster.tx, monster.ty);
  if (d < 10) pickMonsterTarget();
  else {
    const step = Math.min(d, (p2 ? 110 : 70) * TICK / 1000);
    const nx = monster.x + (monster.tx - monster.x) / d * step, ny = monster.y + (monster.ty - monster.y) / d * step;
    if (wallBlocks(monster.x, monster.y, nx, ny, WALL_R.boss)) pickMonsterTarget(); // 被城牆擋住就換個方向
    else { monster.x = nx; monster.y = ny; }
  }
  if (now >= monster.nextAttack) {
    monster.nextAttack = now + (p2 ? 2300 + Math.random() * 1700 : 3500 + Math.random() * 2500);
    monsterAttack(now);
  }
}

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
// 攻擊力 = 職業的攻擊 × 靈魂之歌的加成
const atkBuffMs = (p) => p.atkBuff ? Math.max(0, p.atkBuff.until - Date.now()) : 0;
const atkOf = (p) => p.atk * (atkBuffMs(p) > 0 ? 1 + p.atkBuff.mul : 1);
function publicStats(p) {
  const now = Date.now();
  const buff = Math.max(0, ...Object.values(p.buffs).map(b => b.until - now));
  return { id: p.id, cls: p.cls, hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp, atk: Math.round(atkOf(p)),
    def: defOf(p), buffMs: buff, atkBuffMs: atkBuffMs(p), dead: p.dead,
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

// 魔力慢慢回復、定時自動回一點血；在線時間滿 10 分鐘升一等
setInterval(() => {
  players.forEach(p => {
    p.onlineMs += 1000;
    if (p.onlineMs >= STATS.LEVEL.onlineMs) { p.onlineMs = 0; levelUp(p, true); }
    if (p.dead) return;
    const R = STATS.REGEN, hp0 = p.hp, mp0 = p.mp;
    p.mp = Math.min(p.maxMp, p.mp + R.mpPerSec);
    // 每隔一段時間自動回一點點血和魔力
    p.regenMs = (p.regenMs || 0) + 1000;
    if (p.regenMs >= R.tickMs) {
      p.regenMs = 0;
      p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(p.maxHp * R.hpPct)));
      p.mp = Math.min(p.maxMp, p.mp + Math.max(1, Math.round(p.maxMp * R.mpPct)));
    }
    if (p.hp !== hp0 || p.mp !== mp0) sendStats(p);
  });
}, 1000);

// ---------------- 插畫家的城牆 ----------------
// 畫在前線的一條折線，存活 ms 毫秒；怪物走不過去，火牆會燒、冰牆第一次碰到會凍住
const walls = [];
let wallSeq = 0;
const WALL_R = { mob: 26, boss: 70 }; // 離線多近就算撞到
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return dist(px, py, ax + dx * t, ay + dy * t);
}
const wallDist = (w, x, y) => Math.min(...w.pts.slice(1).map((b, i) => segDist(x, y, w.pts[i][0], w.pts[i][1], b[0], b[1])));
// 從 (x0,y0) 走到 (x1,y1) 會不會撞牆：越來越靠近牆、而且進到 r 以內就擋下（已經卡在牆裡的可以往外走）
function wallBlocks(x0, y0, x1, y1, r) {
  return walls.some(w => { const d1 = wallDist(w, x1, y1); return d1 < r && d1 < wallDist(w, x0, y0); });
}
// 兩點之間有沒有隔著城牆（隔著牆打不到人）
const cross = (ax, ay, bx, by, cx, cy, dx, dy) => {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (!d) return false;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};
const behindWall = (ax, ay, bx, by) => walls.some(w => w.pts.slice(1).some((q, i) => cross(ax, ay, bx, by, w.pts[i][0], w.pts[i][1], q[0], q[1])));
// 檢查玩家畫的線：點要在前線、離自己不太遠，總長度超過上限就截斷
function wallLine(p, pts, maxLen) {
  if (!inField(p) || !Array.isArray(pts) || pts.length < 2) return null;
  const out = [];
  let len = 0;
  for (const q of pts.slice(0, 80)) {
    if (!Array.isArray(q)) return null;
    let x = Number(q[0]), y = Number(q[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    x = clamp(x, Z.x1 - 2 * T, Z.x2 + 2 * T); y = clamp(y, Z.y1 - 2 * T, Z.y2 + 2 * T);
    if (dist(x, y, p.x, p.y) > 700) return null;
    if (out.length) {
      const [lx, ly] = out[out.length - 1], seg = dist(x, y, lx, ly);
      if (seg < 4) continue;
      if (len + seg > maxLen) { const k = (maxLen - len) / seg; out.push([Math.round(lx + (x - lx) * k), Math.round(ly + (y - ly) * k)]); len = maxLen; break; }
      len += seg;
    }
    out.push([Math.round(x), Math.round(y)]);
  }
  return out.length >= 2 && len >= 40 ? out : null;
}
function addWall(p, def, pts, now) {
  const w = { id: 'w' + (++wallSeq), kind: def.kind, owner: p.id, pts, until: now + def.ms, def, frozen: new Set(), nextBurn: now + 1000 };
  walls.push(w);
  io.emit('wall', { id: w.id, kind: w.kind, pts, ms: def.ms, by: p.id });
}
function tickWalls(now) {
  for (let i = walls.length - 1; i >= 0; i--) {
    const w = walls[i];
    if (now >= w.until) { walls.splice(i, 1); io.emit('wallGone', { id: w.id }); continue; }
    const owner = players.get(w.owner);
    const foes = [...(monster.alive ? [[monster, true]] : []), ...mobs.filter(m => m.alive).map(m => [m, false])]
      .filter(([f, b]) => wallDist(w, f.x, f.y) < (b ? WALL_R.boss : WALL_R.mob) + 24);
    if (w.kind === 'ice') {
      foes.forEach(([f, b]) => {
        const key = b ? 'boss' : f.id;
        if (w.frozen.has(key)) return;
        w.frozen.add(key);
        f.frozenUntil = Math.max(f.frozenUntil, now + w.def.freeze);
        io.emit(b ? 'monster' : 'mob', b ? monsterState() : mobState(f));
      });
    } else if (now >= w.nextBurn) {
      w.nextBurn = now + 1000;
      if (owner) foes.forEach(([f, b]) => {
        if (f.alive) damageFoe(owner, f, b, Math.max(1, Math.round(atkOf(owner) * w.def.burn * (0.8 + Math.random() * 0.4))), false, 'fireWall');
      });
    }
  }
}

// ---------------- 物資箱 ----------------
// key 'tx,ty' -> { hits, emptyUntil }；被敲開的箱子會空一段時間再補貨
const crates = new Map();
function emptyCrates() {
  const now = Date.now();
  return [...crates.entries()].filter(([, c]) => c.emptyUntil > now).map(([k]) => k);
}

// ---------------- 打怪：扣血、打倒、掉落 ----------------
// p 是拿到傷害和經驗的玩家，hitBy 是實際出手的人或召喚物（給畫面用）
function damageFoe(p, foe, isBoss, dmg, crit, skillId, hitBy) {
  const now = Date.now();
  if (isBoss && now < monster.transformUntil) return; // 變身中打不動
  foe.hp = Math.max(0, foe.hp - dmg);
  foe.damage.set(p.name, (foe.damage.get(p.name) || 0) + dmg);
  gainExp(p, dmg);
  if (!isBoss) {
    io.emit('mobHit', { mid: foe.id, id: hitBy || p.id, dmg, crit, hp: foe.hp, skill: skillId });
    if (foe.hp > 0) return;
    foe.alive = false;
    foe.respawnAt = now + STATS.MOB_RESPAWN_MS;
    io.emit('mob', mobState(foe));
    gainExp(p, STATS.MOBS[foe.kind].exp);
    pushChat({ system: true, text: `👏 ${p.name} 打倒了${STATS.MOBS[foe.kind].name}！`, t: now });
    if (Math.random() < MOB_DROP_RATE) giveDecor(p);
    return;
  }
  io.emit('monsterHit', { id: hitBy || p.id, dmg, crit, hp: monster.hp, skill: skillId, phase: monster.phase });
  if (monster.hp > 0) return;
  if (monster.phase === 1) return transformMonster(p, now);
  monster.alive = false;
  monster.respawnAt = now + RESPAWN_MS;
  const top = [...monster.damage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  io.emit('monster', monsterState());
  // 有打到颱風的人都多拿一筆經驗，還會掉一件家具；輸出第一名一定拿到稀有裝備，其他人有機會
  players.forEach(q => {
    if (!monster.damage.has(q.name)) return;
    gainExp(q, 400); giveDecor(q);
    if ((top[0] && top[0][0] === q.name) || Math.random() < BOSS_GEAR_RATE) giveGear(q, true);
  });
  const mins = Math.round(RESPAWN_MS / 60000);
  pushChat({ system: true, text: `🎉 ${p.name} 打出最後一擊，${STATS.MONSTER2.name}被擊退了！${mins} 分鐘後會再生成。`, t: now });
  if (top.length) pushChat({ system: true, text: '🏅 輸出排行：' + top.map(([n, d], i) => `${i + 1}. ${n} ${d}`).join('、'), t: now });
}

// 第一次被打倒：原地變身成第二階段，血量重新補滿（而且更多），變身的幾秒內打不動也不出招
function transformMonster(p, now) {
  const M2 = STATS.MONSTER2, hp = Math.round(targetHp() * M2.hpMul);
  Object.assign(monster, { phase: 2, hp, maxHp: hp, transformUntil: now + M2.transformMs, frozenUntil: 0, weakUntil: 0,
    nextAttack: now + M2.transformMs + 1500 });
  io.emit('monster', monsterState());
  pushChat({ system: true, text: `🌪️ ${p.name} 打倒了颱風${STATS.MONSTER.name}……但它變身成「${M2.name}」了！更大、更強，還會放龍捲風和冰雹，小心！`, t: now });
}

// ---------------- 召喚物 ----------------
// 召喚師在前線叫出來的奇異生物：自己找最近的怪去打，有血量，被打倒就不會回來
const summons = [];
let summonSeq = 0;
function summonState(sm) {
  return { id: sm.id, kind: sm.kind, owner: sm.owner, ownerName: sm.ownerName, x: Math.round(sm.x), y: Math.round(sm.y), hp: sm.hp, maxHp: sm.maxHp };
}
function pickSummonKind() {
  const list = Object.entries(STATS.SUMMONS);
  let x = Math.random() * list.reduce((t, [, d]) => t + d.weight, 0);
  for (const [k, d] of list) { x -= d.weight; if (x <= 0) return k; }
  return list[0][0];
}
function removeSummon(sm, dead) {
  const i = summons.indexOf(sm);
  if (i < 0) return;
  summons.splice(i, 1);
  io.emit('summonGone', { id: sm.id, dead: !!dead });
}
function hurtSummon(sm, dmg, by) {
  if (!summons.includes(sm)) return;
  sm.hp = Math.max(0, sm.hp - dmg);
  io.emit('summonHurt', { id: sm.id, hp: sm.hp, dmg });
  if (sm.hp > 0) return;
  removeSummon(sm, true);
  pushChat({ system: true, text: `💫 ${sm.ownerName} 的${STATS.SUMMONS[sm.kind].name}被${by}打倒了`, t: Date.now() });
}
function tickSummon(sm, now) {
  const owner = players.get(sm.owner);
  if (!owner) return removeSummon(sm);
  const def = STATS.SUMMONS[sm.kind];
  // 找最近的敵人：小怪或颱風
  // 整個前線都找得到，離最近的那隻走過去打
  let foe = null, isBoss = false, fd = 1600;
  mobs.forEach(m => { if (!m.alive) return; const d = dist(m.x, m.y, sm.x, sm.y); if (d < fd) { fd = d; foe = m; isBoss = false; } });
  if (monster.alive) { const d = dist(monster.x, monster.y, sm.x, sm.y); if (d < fd) { fd = d; foe = monster; isBoss = true; } }
  let tx, ty, stop;
  if (foe) { tx = foe.x; ty = foe.y; stop = isBoss ? 110 : 60; }
  else if (inField(owner)) { tx = owner.x + 50; ty = owner.y + 10; stop = 40; }
  else { tx = sm.x; ty = sm.y; stop = 1e9; }
  const d = dist(sm.x, sm.y, tx, ty);
  if (d > stop) {
    const step = Math.min(d - stop, def.speed * TICK / 1000);
    sm.x = clamp(sm.x + (tx - sm.x) / d * step, Z.x1 - 3 * T, Z.x2 + 3 * T);
    sm.y = clamp(sm.y + (ty - sm.y) / d * step, 32 * T, Z.y2 + T);
  }
  if (foe && d <= stop + 20 && now >= sm.nextHit) {
    sm.nextHit = now + STATS.SUMMON_HIT_MS;
    const weak = now < foe.weakUntil ? STATS.WEAKEN.dmgTaken : 1;
    const crit = Math.random() < 0.1;
    const dmg = Math.round(sm.atk * (0.8 + Math.random() * 0.4) * (crit ? 2 : 1) * weak);
    damageFoe(owner, foe, isBoss, dmg, crit, 'pet', sm.id);
  }
}

// ---------------- 室內設計：家具 ----------------
// 打怪掉落的家具可以擺在總部室內，擺好的家具存在 data/decor.json，伺服器重開也還在
const MOB_DROP_RATE = 0.5;
const BOSS_GEAR_RATE = 0.35; // 打倒颱風時，輸出第一名以外的人拿到稀有裝備的機率
const DATA_DIR = path.join(__dirname, 'data');
const DECOR_FILE = path.join(DATA_DIR, 'decor.json');
const decor = new Map(); // 'tx,ty' -> { k, by }
try {
  const saved = JSON.parse(fs.readFileSync(DECOR_FILE, 'utf8'));
  Object.entries(saved).forEach(([key, d]) => { if (DECOR.DECOR[d.k]) decor.set(key, { k: d.k, by: String(d.by || '') }); });
} catch (e) { /* 第一次啟動還沒有檔案 */ }
let decorSaveTimer = null;
function saveDecor() {
  clearTimeout(decorSaveTimer);
  decorSaveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DECOR_FILE, JSON.stringify(Object.fromEntries(decor)));
    } catch (e) { console.error('家具存檔失敗', e.message); }
  }, 1500);
}
// 冰箱輸入 clean：收掉總部裡所有家具，在線上的人擺的會退回他的背包
function cleanDecor(p) {
  const n = decor.size;
  if (!n) return { ok: true, clean: 0 };
  const back = new Map(); // name -> { k: 件數 }
  decor.forEach((d, key) => {
    const b = back.get(d.by) || {};
    b[d.k] = (b[d.k] || 0) + 1;
    back.set(d.by, b);
    io.emit('decor', { key, removed: true });
  });
  decor.clear();
  saveDecor();
  players.forEach(q => {
    const b = back.get(q.name);
    if (!b) return;
    Object.entries(b).forEach(([k, c]) => { q.furn[k] = (q.furn[k] || 0) + c; });
    back.delete(q.name);
    io.to(q.id).emit('furnSync', { furn: q.furn, by: p.id });
  });
  pushChat({ system: true, text: `🧹 ${p.name} 把總部的家具都收乾淨了（${n} 件）`, t: Date.now() });
  return { ok: true, clean: n };
}
const decorList = () => [...decor.entries()].map(([key, d]) => ({ key, k: d.k, by: d.by }));
function giveDecor(p) {
  const k = DECOR.roll();
  p.furn[k] = (p.furn[k] || 0) + 1;
  io.to(p.id).emit('decorGot', { k, furn: p.furn });
  pushChat({ system: true, text: `🎁 ${p.name} 撿到了家具 ${DECOR.DECOR[k].icon} ${DECOR.DECOR[k].name}`, t: Date.now() });
}
// 這格能不能擺家具：要在室內、不能是牆或門、不能擋到東西
function canDecorate(tx, ty) {
  const room = MAP.roomAt((tx + 0.5) * T, (ty + 0.5) * T);
  if (!room || room.id === 'front') return false;
  const ch = MAP.tiles[ty] && MAP.tiles[ty][tx];
  return !!ch && !MAP.BLOCKING.has(ch) && ch !== '=' && ch !== ',';
}

// 傳給別人的玩家資料（不含冷卻、增益這些內部狀態）
function publicPlayer(p) {
  const { cooldowns, buffs, atkBuff, regenMs, cooking, vip, owned, cakeUntil, furn, ...rest } = p;
  return Object.assign(rest, publicStats(p), { hasVip: !!vip, cakeMs: Math.max(0, cakeUntil - Date.now()) });
}

// ---------------- 裝備 ----------------
// 抽一件還沒有的裝備送給玩家，全部都有了就回傳 null
function giveGear(p, rare) {
  const id = GEAR.roll(p.owned, rare);
  if (!id) return null;
  p.owned.push(id);
  const g = GEAR.GEAR[id];
  io.to(p.id).emit('gearGot', { item: id, owned: p.owned });
  pushChat({ system: true, text: `🎁 ${p.name} 獲得了【${g.rarity}】${g.icon} ${g.name}！`, t: Date.now() });
  return id;
}

// ---------------- 遊戲室（在戰情室）：你畫我猜、金曲猜歌王 ----------------
// 兩個遊戲共用：參加的人、主持棒（搶主持要過半同意）、遊戲紀錄、記分板
const DRAW_MAX_STROKES = 4000;
const GAME_VOTE_MS = 20000;
const GAME_IDLE_MS = 60000; // 主持人這麼久沒動作，別人可以直接接手
const norm = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
const nameOf = (id) => (players.get(id) || {}).name || '';
function makeGame(key, label, game) {
  const g = Object.assign(game, { key, label, host: null, round: 0, members: new Set(), vote: null,
    hostRewarded: false, lastHostAct: 0, scores: new Map(), scoreIds: new Map() });
  g.pub = () => {
    const v = g.vote;
    return Object.assign({
      host: g.host, hostName: nameOf(g.host), round: g.round, playing: g.playing(),
      members: [...g.members].map(id => ({ id, name: nameOf(id) })),
      vote: v && { by: v.by, byName: nameOf(v.by), yes: [...v.yes], need: Math.floor(g.members.size / 2) + 1, ms: v.until - Date.now() },
      scores: [...g.scores].sort((x, y) => y[1] - x[1]).map(([name, pts]) => ({ name, pts, id: g.scoreIds.get(name) })),
    }, g.extra());
  };
  g.state = () => io.to(key).emit(key + 'State', g.pub());
  g.log = (text, kind) => io.to(key).emit(key + 'Log', { text, kind: kind || 'sys' });
  g.guessers = () => [...g.members].filter(id => id !== g.host);
  // 換主持人，這一題作廢，遊戲重新開始
  g.reset = (host) => {
    g.host = host; g.vote = null; g.lastHostAct = Date.now();
    g.clearRound();
    g.state();
  };
  g.checkVote = () => {
    const v = g.vote;
    if (!v) return;
    v.yes.forEach(id => { if (!g.members.has(id)) v.yes.delete(id); });
    if (!g.members.has(v.by)) { g.vote = null; return g.state(); }
    if (v.yes.size >= Math.floor(g.members.size / 2) + 1) {
      g.log(`🎤 ${nameOf(v.by)} 搶到主持棒了！遊戲重新開始`);
      g.reset(v.by);
    } else g.state();
  };
  g.remove = (id) => {
    if (!g.members.delete(id)) return;
    if (g.host === id) {
      g.log(`${nameOf(id)} 放下了主持棒，誰要來當主持人？`);
      g.reset(null);
    } else if (g.vote) g.checkVote();
    else g.state();
  };
  // 記分板用名字記（重新整理也還在），另外記最後一次的 id，讓畫面找得到這個人的頭像
  g.addScore = (p, n) => { g.scores.set(p.name, (g.scores.get(p.name) || 0) + n); g.scoreIds.set(p.name, p.id); };
  // 發裝備，拿到什麼也寫在遊戲紀錄裡
  const prize = (id) => { const it = id && GEAR.GEAR[id]; return it ? `，獲得【${it.rarity}】${it.icon} ${it.name}` : '（裝備已經全部收集完了）'; };
  g.reward = (p, text, kind) => { const id = giveGear(p); g.log(text + prize(id), kind || 'right'); return id; };
  // 有人答對，主持人每題也拿一件
  g.rewardHost = () => {
    const host = players.get(g.host);
    if (!host || g.hostRewarded) return;
    g.hostRewarded = true;
    const id = giveGear(host);
    if (id) g.log(`🎤 主持人 ${host.name}${prize(id)}`, 'prize');
  };
  return g;
}

const draw = makeGame('draw', '你畫我猜', {
  answer: '', strokes: [], correct: new Set(),
  playing() { return !!this.answer; },
  extra() { return { len: this.answer ? [...norm(this.answer)].length : 0, correct: [...this.correct] }; },
  clearRound() { this.answer = ''; this.strokes = []; this.correct.clear(); io.to('draw').emit('drawClear'); },
  joinData(p) { return { strokes: this.strokes, answer: this.host === p.id ? this.answer : '' }; },
  end(reason) {
    if (!this.answer) return;
    this.log(`${reason}答案是「${this.answer}」`, 'answer');
    this.answer = '';
    this.state();
  },
});

const SONG_GOAL_MAX = 20;
const song = makeGame('song', '金曲猜歌王', {
  singer: '', title: '', goal: 1, gotSinger: new Set(), gotTitle: new Set(), singerPts: [1], titlePts: [1],
  playing() { return !!this.title; },
  done() { return [...this.gotSinger].filter(id => this.gotTitle.has(id)); },
  extra() {
    return { singerLen: [...norm(this.singer)].length, titleLen: [...norm(this.title)].length, goal: this.goal,
      gotSinger: [...this.gotSinger], gotTitle: [...this.gotTitle], done: this.done().length,
      singerPts: this.singerPts, titlePts: this.titlePts };
  },
  clearRound() { this.singer = ''; this.title = ''; this.gotSinger.clear(); this.gotTitle.clear(); },
  joinData(p) { return this.host === p.id ? { singer: this.singer, title: this.title } : {}; },
  end(reason) {
    if (!this.title) return;
    this.log(`${reason}答案是「${this.singer}－${this.title}」`, 'answer');
    this.singer = ''; this.title = '';
    this.state();
  },
});
// 猜的字跟答案一樣就算對；答案兩個字以上時，猜的字裡有包含答案也算（像「周杰倫 晴天」一次猜兩個）
const songHit = (guess, ans) => { const a = norm(ans); return !!a && (guess === a || (a.length >= 2 && guess.includes(a))); };
// 各名次答對的分數，例如 [3, 2, 1]：第 1 個答對 3 分、第 2 個 2 分，之後的人都拿最後一個分數
const SONG_PTS_MAX = 10;
const songPts = (v) => {
  const a = (Array.isArray(v) ? v : []).slice(0, SONG_PTS_MAX).map(n => clamp(Math.round(Number(n)) || 0, 0, 100));
  return a.length ? a : [1];
};
const rankPts = (pts, rank) => pts[Math.min(rank, pts.length - 1)];
const GAMES = [draw, song];

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
      inv: Object.fromEntries(Object.keys(MAP.ITEMS).map(k => [k, 0])),
      // 重新連線時沿用上次的職業
      cls: STATS.CLASSES[data.cls] ? data.cls : 'staff', dead: false, cooldowns: {}, buffs: {},
      // 等級存在玩家自己的瀏覽器，伺服器重開也不會不見
      level: clamp(Math.floor(Number(data.level)) || 1, 1, STATS.LEVEL.max),
      exp: Math.max(0, Math.floor(Number(data.exp)) || 0), onlineMs: 0, vip,
      // 裝備也存在玩家自己的瀏覽器
      owned: [...new Set((Array.isArray(data.owned) ? data.owned : []).filter(id => GEAR.GEAR[id]))],
      equip: {}, cakeUntil: 0,
      // 還沒擺出去的家具
      furn: Object.fromEntries(Object.keys(DECOR.DECOR).map(k => [k, clamp(Math.floor(Number(data.furn && data.furn[k])) || 0, 0, 50)])),
    };
    if (data.equip && typeof data.equip === 'object') Object.keys(GEAR.SLOTS).forEach(slot => {
      const id = data.equip[slot];
      if (p.owned.includes(id) && GEAR.GEAR[id].slot === slot) p.equip[slot] = id;
    });
    Object.assign(p, STATS.statsFor(p.cls, p.level));
    p.hp = p.maxHp; p.mp = p.maxMp;
    players.set(socket.id, p);

    growMonster();
    ack({ ok: true, you: Object.assign(publicPlayer(p), { owned: p.owned, furn: p.furn }), players: [...players.values()].map(publicPlayer), history,
      monster: monsterState(), mobs: mobs.map(mobState), emptyCrates: emptyCrates(),
      summons: summons.map(summonState), decor: decorList(),
      walls: walls.map(w => ({ id: w.id, kind: w.kind, pts: w.pts, ms: w.until - Date.now() })) });
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
    // 停下來的那一則一定要送到，不然別人看到的位置會停在半路
    (p.moving ? socket.volatile.broadcast : socket.broadcast).emit('playerMoved', { id: p.id, x: p.x, y: p.y, dir: p.dir, moving: p.moving });
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
    const pile = MAP.CRATES[ci].item;
    const pool = Array.isArray(pile) ? pile : pile ? [pile] : keys;
    const item = pool[Math.floor(Math.random() * pool.length)];
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
    // 插畫家的城牆：target 是畫出來的線
    const line = skill.wall ? wallLine(p, target && target.pts, skill.wall.len) : null;
    if (skill.wall && !line) return ack({ ok: false, error: '要在 🌀 颱風前線、自己附近畫一條線' });
    if (skill.wall) target = 'boss';
    const isBoss = !target || target === 'boss';
    const foe = isBoss ? monster : mobs.find(m => m.id === target);
    const foeName = isBoss ? `颱風${STATS.MONSTER.name}` : foe ? STATS.MOBS[foe.kind].name : '';
    if (!skill.support) {
      if (!foe || !foe.alive) return ack({ ok: false, error: isBoss ? `颱風${STATS.MONSTER.name}還沒出現` : '它已經被打倒了' });
      if (STATS.foeGap(p, foe, isBoss) > skill.range) return ack({ ok: false, error: `離${foeName}太遠了` });
    }
    if (p.mp < skill.mp) return ack({ ok: false, error: '魔力不夠' });
    let kind = null;
    if (skill.summon) {
      if (!inField(p)) return ack({ ok: false, error: '要在 🌀 颱風前線才能召喚' });
      if (summons.filter(sm => sm.owner === p.id).length >= STATS.SUMMON_MAX) return ack({ ok: false, error: `最多同時召喚 ${STATS.SUMMON_MAX} 隻` });
      kind = pickSummonKind();
    }
    lastAction = now;
    p.cooldowns[skillId] = now + skill.cooldown;
    if (skill.mp) p.mp -= skill.mp;

    // 各種效果
    const fx = { id: p.id, skill: skillId, x: Math.round(p.x), y: Math.round(p.y), target: isBoss || !foe ? 'boss' : foe.id, targets: [] };
    const around = (r) => alivePlayers().filter(q => dist(q.x, q.y, p.x, p.y) <= r);
    let support = 0; // 補血、加防也算經驗
    // 補血、加防的量跟著等級變強
    const boost = STATS.boost(p.level), plusDef = STATS.bonusDef(p.level);
    if (skill.heal) {
      const hp = Math.round(skill.heal.hp * boost), mp = Math.round(skill.heal.mp * boost);
      around(skill.heal.r).forEach(q => {
        support += Math.min(hp, q.maxHp - q.hp);
        q.hp = Math.min(q.maxHp, q.hp + hp);
        q.mp = Math.min(q.maxMp, q.mp + mp);
        fx.targets.push(q.id);
        if (q !== p) sendStats(q);
      });
    }
    if (skill.teamDef) {
      around(skill.teamDef.r).forEach(q => {
        q.buffs.team = { v: skill.teamDef.v + plusDef, until: now + skill.teamDef.ms };
        fx.targets.push(q.id);
        support += 15;
        if (q !== p) sendStats(q);
      });
    }
    if (skill.selfDef) p.buffs.self = { v: skill.selfDef.v + plusDef, until: now + skill.selfDef.ms };
    if (skill.teamAtk) {
      around(skill.teamAtk.r).forEach(q => {
        q.atkBuff = { mul: skill.teamAtk.mul, until: now + skill.teamAtk.ms };
        fx.targets.push(q.id);
        support += 15;
        if (q !== p) sendStats(q);
      });
    }
    if (line) {
      addWall(p, skill.wall, line, now);
      support += 15;
    }
    if (skill.summon) {
      const def = STATS.SUMMONS[kind];
      const sm = { id: 's' + (++summonSeq), summon: true, kind, owner: p.id, ownerName: p.name,
        x: p.x + (Math.random() < 0.5 ? -50 : 50), y: p.y + 10, hp: Math.round(def.hp * boost), maxHp: Math.round(def.hp * boost),
        atk: Math.round(def.atk * boost), nextHit: now + 800 };
      summons.push(sm);
      io.emit('summon', summonState(sm));
      pushChat({ system: true, text: `👽 ${p.name} 召喚了${def.name}！`, t: now });
      support += 20;
    }
    // 範圍技能：身邊範圍內的颱風和小怪全部打到
    // aoe：以自己為中心；aoeAt：以目標為中心（目標一定打得到）
    const center = skill.aoe ? p : skill.aoeAt && foe ? foe : null, reach = skill.aoe || skill.aoeAt;
    const hits = center
      ? [...(monster.alive && (monster === foe || STATS.foeGap(center, monster, true) <= reach) ? [[monster, true]] : []),
         ...mobs.filter(m => m.alive && (m === foe || STATS.foeGap(center, m, false) <= reach)).map(m => [m, false])]
      : foe ? [[foe, isBoss]] : [];
    if (center) fx.hits = hits.map(([f, b]) => b ? 'boss' : f.id);
    if (skill.weaken) hits.forEach(([f]) => { f.weakUntil = now + skill.weaken; });
    if (skill.freeze) hits.forEach(([f]) => { f.frozenUntil = now + skill.freeze; });
    // 震飛：從自己的位置往外推，推到前線的邊邊就停
    if (skill.knock) {
      fx.knock = [];
      hits.forEach(([f, b]) => {
        const d = Math.max(1, dist(f.x, f.y, p.x, p.y)), push = b ? skill.knock.boss : skill.knock.mob;
        const ux = d > 5 ? (f.x - p.x) / d : (Math.random() < 0.5 ? -1 : 1), uy = d > 5 ? (f.y - p.y) / d : 0;
        f.x = clamp(f.x + ux * push, Z.x1, Z.x2); f.y = clamp(f.y + uy * push, Z.y1, Z.y2);
        f.tx = f.x; f.ty = f.y;
        f.stunUntil = now + skill.knock.stun;
        fx.knock.push([b ? 'boss' : f.id, Math.round(f.x), Math.round(f.y)]);
      });
    }
    if (support) gainExp(p, support);
    sendStats(p);
    io.emit('skillFx', fx);
    if (skill.weaken || skill.freeze) hits.forEach(([f, b]) => io.emit(b ? 'monster' : 'mob', b ? monsterState() : mobState(f)));

    if (!skill.power) return ack({ ok: true });
    let total = 0;
    hits.forEach(([f, b]) => {
      if (!f.alive) return;
      const crit = Math.random() < (skill.crit || 0.12);
      const weak = now < f.weakUntil ? STATS.WEAKEN.dmgTaken : 1;
      const dmg = Math.round(atkOf(p) * skill.power * (0.6 + Math.random() * 0.6) * (crit ? 2.5 : 1) * weak);
      total += dmg;
      damageFoe(p, f, b, dmg, crit, skillId);
    });
    ack({ ok: true, dmg: total });
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

  // 台灣珍奶、雞排：在哪裡都能吃，補血也補魔
  socket.on('eat', (item, ack) => {
    const p = players.get(socket.id);
    if (typeof ack !== 'function') return;
    const food = STATS.FOODS[item];
    if (!p || p.dead || !food || !['bubbletea', 'chicken'].includes(item) || p.inv[item] < 1) return ack({ ok: false });
    p.inv[item]--;
    p.hp = Math.min(p.maxHp, p.hp + (food.hp || 0));
    p.mp = Math.min(p.maxMp, p.mp + (food.mp || 0));
    sendStats(p);
    io.emit('itemGot', { id: p.id, item });
    ack({ ok: true, inv: p.inv, food: food.name, hp: food.hp || 0, mp: food.mp || 0 });
  });

  // 擺家具：擺在自己腳下那一格
  socket.on('placeDecor', (k, ack) => {
    const p = players.get(socket.id);
    if (typeof ack !== 'function' || !p) return;
    if (!DECOR.DECOR[k] || !(p.furn[k] > 0)) return ack({ ok: false });
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T), key = tx + ',' + ty;
    if (!canDecorate(tx, ty)) return ack({ ok: false, error: '家具只能擺在總部室內的地板上' });
    if (decor.has(key)) return ack({ ok: false, error: '這格已經有家具了，往旁邊站一點' });
    if (decor.size >= DECOR.MAX_PLACED) return ack({ ok: false, error: '總部已經塞滿家具了' });
    p.furn[k]--;
    decor.set(key, { k, by: p.name });
    io.emit('decor', { key, k, by: p.name });
    saveDecor();
    ack({ ok: true, furn: p.furn });
  });
  // 收回自己擺的家具（要站在旁邊）
  socket.on('pickDecor', (key, ack) => {
    const p = players.get(socket.id);
    if (typeof ack !== 'function' || !p) return;
    const d = decor.get(String(key));
    if (!d) return ack({ ok: false });
    if (d.by !== p.name) return ack({ ok: false, error: `這是 ${d.by} 擺的` });
    const [tx, ty] = String(key).split(',').map(Number);
    if (dist(p.x, p.y, (tx + 0.5) * T, (ty + 0.5) * T) > 2.6 * T) return ack({ ok: false, error: '要走到家具旁邊才能收回' });
    decor.delete(String(key));
    p.furn[d.k] = (p.furn[d.k] || 0) + 1;
    io.emit('decor', { key: String(key), removed: true });
    saveDecor();
    ack({ ok: true, furn: p.furn });
  });

  // 穿上 / 脫下裝備（id 是 null 就是脫掉）
  socket.on('equip', (slot, id, ack) => {
    const p = players.get(socket.id);
    if (!p || !GEAR.SLOTS[slot]) return;
    if (id == null) delete p.equip[slot];
    else if (p.owned.includes(id) && GEAR.GEAR[id].slot === slot) p.equip[slot] = id;
    else return typeof ack === 'function' && ack({ ok: false });
    io.emit('playerGear', { id: p.id, equip: p.equip });
    if (typeof ack === 'function') ack({ ok: true, equip: p.equip });
  });

  // 隱藏的蛋糕：在冰箱前輸入暗號
  socket.on('cake', (code, ack) => {
    const p = players.get(socket.id);
    if (typeof ack !== 'function' || !p) return;
    if (!MAP.nearFridge(p.x, p.y)) return ack({ ok: false });
    if (norm(code) === 'clean') return ack(cleanDecor(p));
    if (norm(code) !== norm(CAKE_CODE)) return ack({ ok: false });
    const fresh = p.cakeUntil < Date.now();
    p.cakeUntil = Date.now() + CAKE_MS;
    io.emit('cake', { id: p.id, ms: CAKE_MS });
    if (fresh) pushChat({ system: true, text: `🎂 ${p.name} 拿出了蛋糕！靠過去一起慶祝吧`, t: Date.now() });
    ack({ ok: true, ms: CAKE_MS });
  });
  socket.on('cakeDown', () => {
    const p = players.get(socket.id);
    if (!p || !p.cakeUntil) return;
    p.cakeUntil = 0;
    io.emit('cake', { id: p.id, ms: 0 });
  });

  // ----- 遊戲室 -----
  GAMES.forEach(g => {
    const k = g.key;
    socket.on(k + 'Join', (ack) => {
      const p = players.get(socket.id);
      if (typeof ack !== 'function' || !p) return;
      const room = MAP.roomAt(p.x, p.y);
      if (!room || room.id !== 'video') return ack({ ok: false, error: `要在戰情室裡才能玩${g.label}` });
      if (!g.members.has(p.id)) {
        g.members.add(p.id);
        socket.join(k);
        g.log(`👋 ${p.name} 加入了${g.label}`);
      }
      ack(Object.assign({ ok: true, state: g.pub() }, g.joinData(p)));
      g.state();
    });
    socket.on(k + 'Leave', () => { socket.leave(k); g.remove(socket.id); });
    // 搶主持棒：沒有主持人（或主持人一直沒動）就直接拿到，不然要過半的參與者同意
    socket.on(k + 'Claim', (ack) => {
      const p = g.members.has(socket.id) && players.get(socket.id);
      if (typeof ack !== 'function' || !p) return;
      if (g.host === p.id) return ack({ ok: false, error: '你已經是主持人了' });
      const now = Date.now();
      if (!g.host || (!g.playing() && now - g.lastHostAct > GAME_IDLE_MS)) {
        g.log(`🎤 ${p.name} 拿起了主持棒`);
        g.reset(p.id);
        return ack({ ok: true, host: true });
      }
      if (g.vote) return ack({ ok: false, error: `${nameOf(g.vote.by)} 正在搶主持棒，先投票吧` });
      const vote = { by: p.id, yes: new Set([p.id]), until: now + GAME_VOTE_MS };
      g.vote = vote;
      g.log(`📣 ${p.name} 想搶主持棒！過半的人同意就換人`);
      setTimeout(() => {
        if (g.vote !== vote) return;
        g.vote = null;
        g.log('投票時間到，主持棒沒有換人');
        g.state();
      }, GAME_VOTE_MS);
      g.checkVote();
      ack({ ok: true });
    });
    socket.on(k + 'Vote', () => {
      if (!g.members.has(socket.id) || !g.vote) return;
      g.vote.yes.add(socket.id);
      g.checkVote();
    });
    socket.on(k + 'Reveal', () => { if (g.members.has(socket.id) && g.host === socket.id) g.end('主持人公布了，'); });
    // 主持人清空記分板，重新計分
    socket.on(k + 'ScoreReset', () => {
      if (!g.members.has(socket.id) || g.host !== socket.id) return;
      g.scores.clear(); g.scoreIds.clear();
      g.log(`🧹 主持人 ${nameOf(socket.id)} 清空了記分板，重新計分！`);
      g.state();
    });
  });

  // ----- 你畫我猜 -----
  const isHost = () => draw.members.has(socket.id) && players.get(socket.id) && draw.host === socket.id;
  socket.on('drawStart', (answer, ack) => {
    if (typeof ack !== 'function') return;
    if (!isHost()) return ack({ ok: false, error: '只有主持人可以出題' });
    const a = clean(answer, 12);
    if (!norm(a)) return ack({ ok: false, error: '請先輸入答案' });
    if (draw.answer) draw.end('換題了，');
    draw.answer = a; draw.strokes = []; draw.correct.clear(); draw.hostRewarded = false;
    draw.round++; draw.lastHostAct = Date.now();
    io.to('draw').emit('drawClear');
    draw.log(`🎨 第 ${draw.round} 題開始！答案有 ${[...norm(a)].length} 個字`);
    draw.state();
    ack({ ok: true });
  });
  socket.on('drawStroke', (st) => {
    // 主持人出題之後才能畫
    if (!isHost() || !draw.answer || !st || !Array.isArray(st.pts)) return;
    if (draw.strokes.length >= DRAW_MAX_STROKES) return;
    const pts = st.pts.slice(0, 200).map(q => Array.isArray(q) ? [clamp(Math.round(q[0]) || 0, 0, 1000), clamp(Math.round(q[1]) || 0, 0, 1000)] : null).filter(Boolean);
    if (!pts.length) return;
    const s2 = { c: /^#[0-9a-f]{6}$/i.test(st.c) ? st.c : '#2b2a33', w: clamp(Number(st.w) || 6, 1, 60), pts };
    // 形狀（圓形、矩形、三角形）只帶起點和終點
    if (['circle', 'rect', 'tri'].includes(st.k)) { if (pts.length !== 2) return; s2.k = st.k; }
    draw.strokes.push(s2);
    draw.lastHostAct = Date.now();
    socket.to('draw').emit('drawStroke', s2);
  });
  socket.on('drawClear', () => {
    if (!isHost()) return;
    draw.strokes = [];
    io.to('draw').emit('drawClear');
  });
  let lastGuess = 0;
  const guessOk = () => { const now = Date.now(); if (now - lastGuess < 600) return false; lastGuess = now; return true; };
  socket.on('drawGuess', (text, ack) => {
    const p = draw.members.has(socket.id) && players.get(socket.id);
    if (typeof ack !== 'function' || !p) return;
    if (!guessOk()) return ack({ ok: false });
    const t = clean(text, 20);
    if (!t) return ack({ ok: false });
    if (draw.host === p.id) return ack({ ok: false, error: '主持人不能猜啦' });
    if (!draw.answer) { draw.log(`${p.name}：${t}`, 'chat'); return ack({ ok: true }); }
    if (draw.correct.has(p.id)) return ack({ ok: false, error: '你已經猜對了，等下一題' });
    if (norm(t) !== norm(draw.answer)) { draw.log(`${p.name}：${t}`, 'guess'); return ack({ ok: true, correct: false }); }
    draw.correct.add(p.id);
    draw.addScore(p, 1);
    const item = draw.reward(p, `✅ ${p.name} 猜對了！+1 分`);
    draw.rewardHost();
    ack({ ok: true, correct: true, item });
    if (draw.guessers().every(id => draw.correct.has(id))) draw.end('大家都猜對了！');
    else draw.state();
  });

  // ----- 金曲猜歌王 -----
  // 主持人出歌手和歌名，大家分開猜；同時猜對兩個的人數到達標人數就結束
  socket.on('songStart', (q, ack) => {
    if (typeof ack !== 'function') return;
    if (!(song.members.has(socket.id) && song.host === socket.id)) return ack({ ok: false, error: '只有主持人可以出題' });
    const singer = clean(q && q.singer, 20), title = clean(q && q.title, 30);
    if (!norm(singer) || !norm(title)) return ack({ ok: false, error: '歌手和歌名都要填' });
    if (song.title) song.end('換題了，');
    song.singer = singer; song.title = title; song.goal = clamp(Math.round(Number(q.goal)) || 1, 1, SONG_GOAL_MAX);
    song.singerPts = songPts(q.singerPts); song.titlePts = songPts(q.titlePts);
    song.gotSinger.clear(); song.gotTitle.clear(); song.hostRewarded = false;
    song.round++; song.lastHostAct = Date.now();
    song.log(`🎤 第 ${song.round} 首開始！歌手 ${[...norm(singer)].length} 個字、歌名 ${[...norm(title)].length} 個字，${song.goal} 人全部答對就結束`);
    song.state();
    ack({ ok: true });
  });
  socket.on('songGuess', (text, ack) => {
    const p = song.members.has(socket.id) && players.get(socket.id);
    if (typeof ack !== 'function' || !p) return;
    if (!guessOk()) return ack({ ok: false });
    const t = clean(text, 40);
    if (!t) return ack({ ok: false });
    if (song.host === p.id) return ack({ ok: false, error: '主持人不能猜啦' });
    if (!song.title) { song.log(`${p.name}：${t}`, 'chat'); return ack({ ok: true }); }
    const hadS = song.gotSinger.has(p.id), hadT = song.gotTitle.has(p.id);
    if (hadS && hadT) return ack({ ok: false, error: '你已經全部答對了，等下一首' });
    const g = norm(t), hitS = !hadS && songHit(g, song.singer), hitT = !hadT && songHit(g, song.title);
    if (!hitS && !hitT) { song.log(`${p.name}：${t}`, 'guess'); return ack({ ok: true, correct: false }); }
    if (hitS) {
      const rank = song.gotSinger.size, pts = rankPts(song.singerPts, rank);
      song.gotSinger.add(p.id); song.addScore(p, pts);
      song.log(`🎙️ ${p.name} 第 ${rank + 1} 個猜對歌手！+${pts} 分`, 'right');
    }
    if (hitT) {
      const rank = song.gotTitle.size, pts = rankPts(song.titlePts, rank);
      song.gotTitle.add(p.id); song.addScore(p, pts);
      song.log(`🎵 ${p.name} 第 ${rank + 1} 個猜對歌名！+${pts} 分`, 'right');
    }
    let item = null;
    const both = song.gotSinger.has(p.id) && song.gotTitle.has(p.id);
    if (both) { item = song.reward(p, `🏆 ${p.name} 歌手和歌名都答對了`, 'both'); song.rewardHost(); }
    ack({ ok: true, correct: true, singer: hitS, title: hitT, both, item });
    const done = song.done().length, guessers = song.guessers();
    if (done >= song.goal) song.end(`已經有 ${done} 人全部答對，達標！`);
    else if (guessers.length && guessers.every(id => song.gotSinger.has(id) && song.gotTitle.has(id))) song.end('大家都答對了！');
    else song.state();
  });

  // ----- 視訊房間 -----
  socket.on('videoList', (ack) => { if (typeof ack === 'function') ack({ rooms: videoList() }); });
  // 開新房間：房號由前端先產生（這樣按下去就能馬上開新分頁，不會被瀏覽器擋）
  socket.on('videoCreate', (data, ack) => {
    const p = players.get(socket.id);
    if (typeof ack !== 'function' || !p) return;
    const code = roomCode(data && data.code);
    if (code.length < 3) return ack({ ok: false, error: '房號至少要 3 個英文或數字' });
    if (videoRooms.some(r => r.code === code)) return ack({ ok: false, error: '這個房號已經有了，直接加入就好' });
    const r = addVideoRoom(code, clean(data && data.name, 16) || `${p.name} 的房間`, p.name);
    p.video = code;
    io.emit('videoRooms', videoList());
    pushChat({ system: true, text: `📹 ${p.name} 開了視訊房間「${r.name}」（房號 ${code}），到戰情室按「加入視訊」就能進去`, t: Date.now() });
    ack({ ok: true, code });
  });
  // 加入房間（也可以直接輸入別人給的房號，沒在列表上就順便加進去）
  socket.on('videoJoin', (raw, ack) => {
    const p = players.get(socket.id);
    if (typeof ack !== 'function' || !p) return;
    const code = roomCode(raw);
    if (code.length < 3) return ack({ ok: false, error: '房號至少要 3 個英文或數字' });
    addVideoRoom(code, code, p.name);
    p.video = code;
    io.emit('videoRooms', videoList());
    ack({ ok: true, code });
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
    GAMES.forEach(g => g.remove(socket.id));
    summons.filter(sm => sm.owner === socket.id).forEach(sm => removeSummon(sm));
    const hadVideo = !!p.video;
    players.delete(socket.id);
    if (hadVideo) io.emit('videoRooms', videoList());
    io.emit('playerLeft', socket.id);
    pushChat({ system: true, text: `${p.name} 離開了總部`, t: Date.now() });
  });
});

server.listen(PORT, () => {
  console.log(`🌀 颱風天防衛總部已啟動：http://localhost:${PORT}`);
  console.log(`📹 視訊房間：https://${JITSI_DOMAIN}/${JITSI_ROOM}`);
});
