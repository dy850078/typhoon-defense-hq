// 背包：分成補品、雜物、裝備三區，每區各自算格數。資料前後端共用
// 補品存在 p.inv（泡麵、水…）、雜物是還沒擺出去的家具 p.furn、裝備是 p.gear（同一件可以有好幾件，一件佔一格）
// p.inv 裡也有花園的東西：果實算補品；種子、枯枝算雜物（MAP.ITEMS 的 bag: 'misc'）；寶石收在寶石袋（bag: 'gem'），不佔格子
(function (root) {
  const SECTIONS = {
    food: { name: '補品', slots: 15, stack: 99 },
    misc: { name: '雜物', slots: 20, stack: 10 },
    gear: { name: '裝備', slots: 30, stack: 1 },
  };
  // 東西的種類（food / decor / gear）放在哪一區
  const SECTION_OF = { food: 'food', decor: 'misc', gear: 'gear' };
  // 某個 kind/k 實際放在哪一區（kind 'food' 是 p.inv 裡的東西，種子、枯枝要算雜物）
  const secOf = (kind, k) => kind === 'food' ? invSec(k) : SECTION_OF[kind];
  const LOOT_MS = 60000; // 地上的東西放多久會消失

  const pos = (n) => Math.max(0, Math.floor(Number(n)) || 0);
  const ITEMS = () => (typeof module !== 'undefined' && module.exports ? require('./map') : root.HQ_MAP).ITEMS;
  // p.inv 裡的某個東西放在哪一區：food／misc／gem
  const invSec = (k) => (ITEMS()[k] && ITEMS()[k].bag) || 'food';
  const stacks = (n) => Math.ceil(pos(n) / SECTIONS.misc.stack);
  // 某一區用了幾格
  function used(p, sec) {
    const inv = p.inv || {};
    if (sec === 'food') return Object.keys(inv).filter(k => inv[k] > 0 && invSec(k) === 'food').length;
    if (sec === 'misc') return Object.values(p.furn || {}).reduce((t, n) => t + stacks(n), 0)
      + Object.keys(inv).filter(k => invSec(k) === 'misc').reduce((t, k) => t + stacks(inv[k]), 0);
    return Object.values(p.gear || {}).reduce((t, n) => t + pos(n), 0);
  }
  // 放不放得下一個 kind/k：同種的那格還沒疊滿就放得下，不然要有空格
  // 舊存檔超過上限的不會被扣，只是要先用掉（或丟掉）到上限以下才放得進新的
  function canAdd(p, kind, k) {
    const sec = secOf(kind, k), S = SECTIONS[sec];
    if (sec === 'gem') return pos((p.inv || {})[k]) < SECTIONS.food.stack;
    if (!S) return false;
    if (sec === 'food') { const n = pos((p.inv || {})[k]); return n > 0 ? n < S.stack : used(p, sec) < S.slots; }
    if (sec === 'misc') { const n = pos(((kind === 'food' ? p.inv : p.furn) || {})[k]); return n % S.stack !== 0 ? true : used(p, sec) < S.slots; }
    return used(p, sec) < S.slots;
  }
  function count(p, kind, k) {
    const box = kind === 'food' ? p.inv : kind === 'decor' ? p.furn : p.gear;
    return pos(box && box[k]);
  }
  // 身上有的裝備（每件至少一件），換裝、套裝都看這個
  const ownedOf = (gear) => Object.keys(gear || {}).filter(id => gear[id] > 0);

  const bag = { SECTIONS, SECTION_OF, LOOT_MS, invSec, secOf, used, canAdd, count, ownedOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = bag;
  else root.HQ_BAG = bag;
})(this);
