// 背包：分成補品、雜物、裝備三區，每區各自算格數。資料前後端共用
// 補品存在 p.inv（泡麵、水…）、雜物是還沒擺出去的家具 p.furn、裝備是 p.gear（同一件可以有好幾件，一件佔一格）
(function (root) {
  const SECTIONS = {
    food: { name: '補品', slots: 15, stack: 99 },
    misc: { name: '雜物', slots: 20, stack: 10 },
    gear: { name: '裝備', slots: 30, stack: 1 },
  };
  // 東西的種類（food / decor / gear）放在哪一區
  const SECTION_OF = { food: 'food', decor: 'misc', gear: 'gear' };
  const LOOT_MS = 60000; // 地上的東西放多久會消失

  const pos = (n) => Math.max(0, Math.floor(Number(n)) || 0);
  // 某一區用了幾格
  function used(p, sec) {
    if (sec === 'food') return Object.values(p.inv || {}).filter(n => n > 0).length;
    if (sec === 'misc') return Object.values(p.furn || {}).reduce((t, n) => t + Math.ceil(pos(n) / SECTIONS.misc.stack), 0);
    return Object.values(p.gear || {}).reduce((t, n) => t + pos(n), 0);
  }
  // 放不放得下一個 kind/k：同種的那格還沒疊滿就放得下，不然要有空格
  // 舊存檔超過上限的不會被扣，只是要先用掉（或丟掉）到上限以下才放得進新的
  function canAdd(p, kind, k) {
    const sec = SECTION_OF[kind], S = SECTIONS[sec];
    if (!S) return false;
    if (sec === 'food') { const n = pos((p.inv || {})[k]); return n > 0 ? n < S.stack : used(p, sec) < S.slots; }
    if (sec === 'misc') { const n = pos((p.furn || {})[k]); return n % S.stack !== 0 ? true : used(p, sec) < S.slots; }
    return used(p, sec) < S.slots;
  }
  function count(p, kind, k) {
    const box = kind === 'food' ? p.inv : kind === 'decor' ? p.furn : p.gear;
    return pos(box && box[k]);
  }
  // 身上有的裝備（每件至少一件），換裝、套裝都看這個
  const ownedOf = (gear) => Object.keys(gear || {}).filter(id => gear[id] > 0);

  const bag = { SECTIONS, SECTION_OF, LOOT_MS, used, canAdd, count, ownedOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = bag;
  else root.HQ_BAG = bag;
})(this);
