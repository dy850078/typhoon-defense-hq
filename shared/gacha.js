// 扭蛋機：前後端共用的機率和規則
// 扭蛋券只有打倒頭目才會掉（野區頭目、副本最終頭目、颱風），每個有出力的人各自擲一次，掉在頭目倒下的地方
// 扭一次一定拿到一件扭蛋限定裝備（gear.js 裡 src: 'gacha' 的），先抽稀有度，再在同稀有度裡平均抽
(function (root) {
  const G = () => (typeof module !== 'undefined' && module.exports ? require('./gear') : root.HQ_GEAR);
  const TICKET = 'gachaTicket'; // MAP.ITEMS 裡扭蛋券的 key
  const DROP_RATE = 0.1; // 頭目倒下時，每個有出力的人掉一張的機率
  const RATES = { R: 65, SR: 28, SSR: 7 }; // 百分比
  const PITY = 20; // 連續這麼多抽沒有 SSR，這一抽一定是 SSR（而且盡量是還沒有的）
  const RECYCLE = 2; // 幾件重複的扭蛋裝備換一張券
  const GEM_TICKETS = 3; // 一顆花園寶石換幾張券

  const pool = () => Object.keys(G().GEAR).filter(id => G().GEAR[id].src === 'gacha');

  // pity 是距離上一次 SSR 已經扭了幾次；owned 是身上有的裝備 id
  // 回傳 { id, pity }：pity 是扭完之後的新值
  // ids 有給的話只在那幾件裡面抽（新世界的卡池）；沒給就是整台機器（總部）
  function spin(pity, owned, ids) {
    const all = ids && ids.length ? ids : pool(), have = new Set(owned || []);
    const of = (rar) => all.filter(id => G().GEAR[id].rarity === rar);
    let rar;
    if ((pity || 0) + 1 >= PITY) rar = 'SSR';
    else {
      let x = Math.random() * 100;
      rar = 'R';
      for (const k of ['SSR', 'SR', 'R']) { if ((x -= RATES[k]) < 0) { rar = k; break; } }
    }
    let list = of(rar);
    if (!list.length) list = all;
    // 保底那一抽：給還沒有的 SSR，全部都有了才隨便給
    if ((pity || 0) + 1 >= PITY) { const fresh = list.filter(id => !have.has(id)); if (fresh.length) list = fresh; }
    const id = list[Math.floor(Math.random() * list.length)];
    return { id, pity: G().GEAR[id].rarity === 'SSR' ? 0 : (pity || 0) + 1 };
  }

  // 身上多出來（每件留一件之外）的扭蛋裝備，回收時從便宜的開始拿
  function spares(gear) {
    const order = ['R', 'SR', 'SSR'], out = [];
    pool().sort((a, b) => order.indexOf(G().GEAR[a].rarity) - order.indexOf(G().GEAR[b].rarity))
      .forEach(id => { for (let i = 1; i < ((gear || {})[id] || 0); i++) out.push(id); });
    return out;
  }

  // ---------- 新世界的卡池 ----------
  // 一個卡池是一個扭蛋系列；limited 是期間限定（管理員頁設開關和起訖日），保底次數所有卡池共用
  // 小巫師還在調長相，先不放進新世界的卡池
  const POOLS = { magical: { name: '魔法少女', series: 'magical', limited: true, note: '星星、緞帶和蓬蓬裙' } };
  const poolIds = (key) => POOLS[key] ? pool().filter(id => G().GEAR[id].series === POOLS[key].series) : [];
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const dayOk = (d) => d === '' || (DAY.test(d) && !isNaN(Date.parse(d + 'T00:00:00+08:00')));
  // cfg 是管理員存的 { on, from, to }（日期是台灣時間的 YYYY-MM-DD，to 當天算到 23:59）；沒設過就是一直開著
  // 回傳 { open, soon, over, left }：left 是離結束還有幾毫秒（沒設結束日是 null）
  function poolState(key, cfg, now) {
    const c = cfg || {}, on = c.on !== false, t0 = c.from && dayOk(c.from) ? Date.parse(c.from + 'T00:00:00+08:00') : null, t1 = c.to && dayOk(c.to) ? Date.parse(c.to + 'T00:00:00+08:00') + 86400000 : null;
    const soon = t0 != null && now < t0, over = t1 != null && now >= t1;
    return { open: !!POOLS[key] && on && !soon && !over, on, soon, over, from: c.from || '', to: c.to || '', left: t1 != null && !over ? t1 - now : null };
  }

  const gacha = { TICKET, DROP_RATE, RATES, PITY, RECYCLE, GEM_TICKETS, pool, spin, spares, POOLS, poolIds, poolState, dayOk };
  if (typeof module !== 'undefined' && module.exports) module.exports = gacha;
  else root.HQ_GACHA = gacha;
})(this);
