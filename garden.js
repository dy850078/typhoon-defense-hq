// 公共花園：12 格花圃的狀態，存在 data/garden.json（不用資料庫）
// 時間只在伺服器開著的時候算：每次 tick 把經過的時間加上去，關機那段不會讓植物枯掉
// 每格：kind 植物、by／byKey 誰種的、grown 已經長了多久、wet 土還能濕多久、dry 乾了多久、
//       ripeFor 熟了多久、left 還能收幾次、helpers 幫忙澆過水的人、perfect 從沒乾過
const fs = require('fs');
const path = require('path');
const MAP = require('./shared/map');
const G = require('./shared/garden');

const TICK_MS = 10 * 1000;
const dayOf = (t) => new Date(t + 8 * 3600000).toISOString().slice(0, 10); // 台灣時間的今天

function create(dataDir, opts) {
  opts = opts || {};
  const speed = Math.max(0.01, Number(opts.speed) || 1); // 測試用：時間加速幾倍
  const file = path.join(dataDir, 'garden.json');
  const plots = MAP.PLOTS.map(() => null);
  let daily = {}; // 每天的免費種子：key → 哪一天領過
  try {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    (d.plots || []).forEach((p, i) => { if (i < plots.length && p && G.PLANTS[p.kind]) plots[i] = p; });
    daily = d.daily || {};
  } catch (e) { /* 第一次啟動還沒有檔案 */ }

  let timer = null;
  function flush() {
    clearTimeout(timer); timer = null;
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      const today = dayOf(Date.now());
      Object.keys(daily).forEach(k => { if (daily[k] !== today) delete daily[k]; });
      fs.writeFileSync(file + '.tmp', JSON.stringify({ plots, daily }));
      fs.renameSync(file + '.tmp', file);
    } catch (e) { console.error('花園存檔失敗', e.message); }
  }
  const save = () => { if (!timer) timer = setTimeout(flush, 1000); };

  const total = (p) => G.PLANTS[p.kind].hours * G.H;
  // 第二次以後的收成：從開花開始再長 regrow 小時
  const need = (p) => p.round > 0 ? G.PLANTS[p.kind].regrow * G.H : total(p);
  function stage(p) {
    if (p.dead) return G.DEAD;
    if (p.ripeFor != null) return G.RIPE;
    if (p.round > 0) return 3;
    return Math.min(3, Math.floor(p.grown / total(p) * 4));
  }
  // 給大家看的樣子：只有會改變畫面的欄位（濕度分 0 乾、1 快乾了、2 濕）
  function look(p) {
    if (!p) return null;
    return { kind: p.kind, by: p.by, stage: stage(p), wet: p.wet <= 0 ? 0 : p.wet < G.WET_MS * 0.25 ? 1 : 2 };
  }
  const state = () => plots.map(look);
  const sig = () => JSON.stringify(state());

  // dt 毫秒過去了：長大、變乾、枯萎、爛掉；回傳要通知種的人的事情
  function advance(dt0) {
    const notes = [];
    plots.forEach((p, i) => {
      if (!p || p.dead) return;
      let dt = dt0;
      if (p.ripeFor != null) {
        p.ripeFor += dt;
        if (p.ripeFor >= G.ROT_MS) { p.dead = true; notes.push({ i, key: p.byKey, what: 'rot' }); }
        return;
      }
      if (p.wet > 0) {
        const grow = Math.min(dt, p.wet);
        p.wet -= grow;
        p.grown += grow;
        if (p.wet <= 0) notes.push({ i, key: p.byKey, what: 'dry' });
        if (p.grown >= need(p)) { p.ripeFor = 0; p.wet = 0; p.dry = 0; notes.push({ i, key: p.byKey, what: 'ripe' }); return; }
        dt -= grow;
      }
      if (dt > 0 && p.wet <= 0) {
        p.perfect = false;
        p.dry += dt;
        if (p.dry >= G.WITHER_MS) { p.dead = true; notes.push({ i, key: p.byKey, what: 'dead' }); }
      }
    });
    return notes;
  }

  let last = Date.now();
  // 每 TICK_MS 跑一次；onChange(state) 畫面有變才呼叫，onNote(note) 通知種的人
  function start(onChange, onNote) {
    setInterval(() => {
      const now = Date.now();
      // 電腦睡著之類的大跳躍不算（伺服器沒在跑的時間不讓植物長大或枯萎）
      const dt = Math.min(now - last, TICK_MS * 3) * speed;
      last = now;
      const before = sig();
      const notes = advance(dt);
      notes.forEach(onNote);
      if (sig() !== before) { onChange(state()); save(); }
      else if (plots.some(Boolean)) save();
    }, TICK_MS);
  }

  const err = (error) => ({ error });
  const mine = (key) => plots.filter(p => p && !p.dead && p.byKey === key).length;

  return {
    TICK_MS, speed, state, flush, start,
    // 詳細資料（點開花圃的小卡片用）
    info(i) {
      const p = plots[i];
      if (!p) return { empty: true };
      const st = stage(p), sp = speed;
      const r = Object.assign(look(p), { left: p.left, last: p.last || '', perfect: !!p.perfect });
      if (st < G.RIPE) r.ripeIn = Math.max(0, need(p) - p.grown) / sp;
      if (st < G.RIPE) r.wetFor = Math.max(0, p.wet) / sp;
      if (st < G.RIPE && p.wet <= 0) r.witherIn = Math.max(0, G.WITHER_MS - p.dry) / sp;
      if (st === G.RIPE) r.rotIn = Math.max(0, G.ROT_MS - p.ripeFor) / sp;
      return r;
    },
    plant(i, kind, key, name) {
      if (!MAP.PLOTS[i]) return err('這裡不能種');
      if (plots[i]) return err('這格已經種了東西');
      if (!G.PLANTS[kind]) return err('沒有這種種子');
      if (mine(key) >= G.MAX_MINE) return err(`一個人最多同時種 ${G.MAX_MINE} 格，留一點給別人吧`);
      // 剛種下的時候順便澆一次水
      plots[i] = { kind, by: name, byKey: key, grown: 0, wet: G.WET_MS, dry: 0, ripeFor: null, round: 0,
        left: G.PLANTS[kind].harvests, helpers: {}, perfect: true, last: name };
      save();
      return { ok: true };
    },
    // 回傳 exp：這次澆水拿到的經驗（同一格一小時內只算一次）
    water(i, key, name, now) {
      const p = plots[i];
      if (!p) return err('這格還沒種東西');
      if (p.dead) return err('已經枯掉了，拔掉重種吧');
      if (p.ripeFor != null) return err('已經熟了，可以收成囉');
      if (p.wet >= G.WET_MS * 0.9) return err('土還很濕，晚點再來澆');
      p.wet = G.WET_MS;
      p.dry = 0;
      p.last = name;
      const h = p.helpers[key];
      const exp = !h || now - h.t > 3600 * 1000 ? G.WATER_EXP : 0;
      p.helpers[key] = { name, t: exp ? now : (h ? h.t : now) };
      save();
      return { ok: true, exp };
    },
    // 收成：回傳果實數量、有沒有挖到寶石、要感謝的人；不在這裡加進背包（伺服器先確認背包裝得下）
    peekHarvest(i) {
      const p = plots[i];
      if (!p) return err('這格還沒種東西');
      if (p.dead) return err('已經枯掉了，拔掉重種吧');
      if (p.ripeFor == null) return err('還沒熟喔');
      return { ok: true, kind: p.kind, n: G.PLANTS[p.kind].yield };
    },
    harvest(i) {
      const p = plots[i];
      const gem = Math.random() < G.GEM_RATE ? G.GEMS[Math.floor(Math.random() * G.GEMS.length)] : null;
      const helpers = Object.keys(p.helpers).filter(k => k !== p.byKey);
      p.left--;
      if (p.left > 0) {
        // 還能再收：回到開花，再長 regrow 小時
        Object.assign(p, { ripeFor: null, grown: 0, round: (p.round || 0) + 1, wet: 0, dry: 0, helpers: {}, perfect: true });
      } else plots[i] = null;
      save();
      return { gem, helpers };
    },
    clear(i) {
      const p = plots[i];
      if (!p) return err('這格是空的');
      if (!p.dead) return err('還活著，不能拔');
      plots[i] = null;
      save();
      return { ok: true };
    },
    // 管理員：不管死活直接清掉
    reset(i) {
      if (!MAP.PLOTS[i]) return err('沒有這格');
      plots[i] = null;
      save();
      return { ok: true };
    },
    list() {
      return plots.map((p, i) => p ? { i, kind: p.kind, by: p.by, stage: stage(p) } : { i });
    },
    // 每天的免費種子：今天領過了就回傳 false
    claimDaily(key, now) {
      const today = dayOf(now);
      if (daily[key] === today) return false;
      daily[key] = today;
      save();
      return true;
    },
    hasDaily: (key, now) => daily[key] !== dayOf(now),
  };
}

// 隨機一種種子（鳳梨比較少見）
function rollSeed() {
  const ks = Object.keys(G.PLANTS);
  let n = Math.random() * ks.reduce((s, k) => s + G.PLANTS[k].weight, 0);
  for (const k of ks) { n -= G.PLANTS[k].weight; if (n < 0) return G.seedOf(k); }
  return G.seedOf(ks[0]);
}

module.exports = { create, rollSeed, dayOf };
