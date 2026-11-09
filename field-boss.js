// 野外頭目的招式：目前只有下班路上的「愛放屁的馬」（STATS.MOBS.fart.skills）
// 三招輪流出：屁屁雲（地上先畫綠圈，放完留一團臭氣一直扣血）、乒乒乓乓（敲鍋子的音波，站著不動的人被吵醒扣更多）、
// 鬼打牆（血剩一半以下才會：繞圈圈跑，撞到人會扣血；繞完頭暈，這時候打他傷害加倍）
// 畫面在 game.js 的 onFieldAttack / onFieldAttackHit
module.exports = function createFieldBoss({ io, STATS, fieldPlayers, summons, hurt, hurtSummon, dist, rand, clamp, zoneOf, TICK }) {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const between = ([a, b]) => a + Math.random() * (b - a);
  // 玩家站著不動多久了（乒乒乓乓用）：id -> { x, y, since }
  const still = new Map();
  function trackStill(now) {
    const seen = new Set();
    fieldPlayers().forEach(p => {
      seen.add(p.id);
      const s = still.get(p.id);
      if (!s || Math.abs(s.x - p.x) > 2 || Math.abs(s.y - p.y) > 2) still.set(p.id, { x: p.x, y: p.y, since: now });
    });
    [...still.keys()].forEach(id => { if (!seen.has(id)) still.delete(id); });
  }
  const isStill = (p, now, ms) => { const s = still.get(p.id); return !!s && now - s.since >= ms; };
  // 在圈裡的玩家和召喚物
  const inside = (x, y, r) => fieldPlayers().filter(p => dist(p.x, p.y, x, y) <= r);
  const summonsIn = (x, y, r) => summons.filter(sm => dist(sm.x, sm.y, x, y) <= r);

  function fart(m, def, S, now) {
    const msg = { mid: m.id, type: 'fart', x: Math.round(m.x), y: Math.round(m.y), r: S.r, delay: S.delay, ms: S.ms, say: pick(S.say) };
    io.emit('fieldAttack', msg);
    m.sk.busy = now + S.delay + 300;
    setTimeout(() => {
      if (!m.alive) return;
      io.emit('fieldAttackHit', msg);
      const t = Date.now();
      m.sk.clouds.push({ x: msg.x, y: msg.y, r: S.r, until: t + S.ms, next: t, dmg: S.dmg });
    }, S.delay);
  }
  function bang(m, def, S, now) {
    const msg = { mid: m.id, type: 'bang', x: Math.round(m.x), y: Math.round(m.y), r: S.r, delay: S.delay, say: pick(S.say) };
    io.emit('fieldAttack', msg);
    m.sk.busy = now + S.delay + 300;
    setTimeout(() => {
      if (!m.alive) return;
      const t = Date.now();
      msg.woke = [];
      inside(msg.x, msg.y, S.r).forEach(p => {
        const lazy = isStill(p, t, S.stillMs);
        if (lazy) msg.woke.push(p.id);
        hurt(p, Math.round(rand(S.dmg) * (lazy ? S.stillMul : 1)), def.name);
      });
      summonsIn(msg.x, msg.y, S.r).forEach(sm => hurtSummon(sm, Math.round(rand(S.dmg)), def.name));
      io.emit('fieldAttackHit', msg);
    }, S.delay);
  }
  function startLoop(m, def, S, now) {
    const B = zoneOf(m), rx = S.r, ry = S.r * 0.7;
    // 圓心放在馬的左邊，馬剛好站在圈上；整個圈都要在這一區裡
    const cx = clamp(m.x - rx, B.x1 + rx, B.x2 - rx), cy = clamp(m.y, B.y1 + ry, B.y2 - ry);
    m.sk.loop = { cx, cy, rx, ry, t: -S.delay, a0: Math.atan2((m.y - cy) / ry, (m.x - cx) / rx), hitAt: new Map() };
    m.sk.loopNext = now + S.every;
    io.emit('fieldAttack', { mid: m.id, type: 'loop', x: Math.round(cx), y: Math.round(cy), rx, ry, delay: S.delay, ms: S.ms, say: pick(S.say) });
  }
  function stepLoop(m, def, S, now) {
    const L = m.sk.loop;
    L.t += TICK;
    if (L.t < 0) return; // 預告中：原地發呆
    if (L.t >= S.ms) {
      m.sk.loop = null;
      m.dizzyUntil = now + S.dizzy;
      io.emit('fieldAttackHit', { mid: m.id, type: 'loop', ms: S.dizzy, mul: S.dizzyMul });
      return;
    }
    const a = L.a0 + (L.t / S.ms) * S.laps * Math.PI * 2;
    m.x = L.cx + Math.cos(a) * L.rx; m.y = L.cy + Math.sin(a) * L.ry;
    m.tx = m.x; m.ty = m.y;
    inside(m.x, m.y, S.hitR).forEach(p => {
      if (now < (L.hitAt.get(p.id) || 0)) return;
      L.hitAt.set(p.id, now + 900);
      hurt(p, Math.round(rand(S.dmg)), def.name);
      io.emit('mobAttack', { mid: m.id, id: p.id, say: pick(S.bump) });
    });
  }

  // 每個 tick 從 tickMob 叫（馬活著、沒被冰住的時候）；回傳 true 代表這一下馬在忙，不要照一般的方式走路打人
  function tick(m, now) {
    const def = STATS.MOBS[m.kind], K = def.skills;
    if (!m.sk) m.sk = { fart: now + between(K.fart.first), bang: now + between(K.bang.first), loopNext: 0, busy: 0, loop: null, clouds: [] };
    trackStill(now);
    // 臭氣：每秒扣一次在裡面的人
    m.sk.clouds = m.sk.clouds.filter(c => c.until > now);
    m.sk.clouds.forEach(c => {
      if (now < c.next) return;
      c.next += 1000;
      inside(c.x, c.y, c.r).forEach(p => hurt(p, Math.round(rand(c.dmg)), def.name));
      summonsIn(c.x, c.y, c.r).forEach(sm => hurtSummon(sm, Math.round(rand(c.dmg)), def.name));
    });
    if (now < (m.dizzyUntil || 0)) return true; // 頭暈：站著不動，也不打人
    if (m.sk.loop) { stepLoop(m, def, K.loop, now); return true; }
    if (now < m.sk.busy) return true; // 放招前停一下
    // 附近有人才出招（沒人的時候就自己晃）
    const B = zoneOf(m);
    const near = fieldPlayers().some(p => dist(p.x, p.y, m.x, m.y) < K.reach && p.x >= B.x1 - 96 && p.x <= B.x2 + 96 && p.y >= B.y1 - 96 && p.y <= B.y2 + 96);
    if (!near) return false;
    if (m.hp <= m.maxHp * K.loop.hp && now >= m.sk.loopNext) { startLoop(m, def, K.loop, now); return true; }
    if (now >= m.sk.fart) { m.sk.fart = now + between(K.fart.every); fart(m, def, K.fart, now); return true; }
    if (now >= m.sk.bang) { m.sk.bang = now + between(K.bang.every); bang(m, def, K.bang, now); return true; }
    return false;
  }
  // 打倒或重生：招式全部重來
  function reset(m) { m.sk = null; m.dizzyUntil = 0; }
  // 頭暈的時候打他，傷害加倍
  const dmgMul = (m, now) => (now < (m.dizzyUntil || 0) && STATS.MOBS[m.kind].skills ? STATS.MOBS[m.kind].skills.loop.dizzyMul : 1);
  return { tick, reset, dmgMul };
};
