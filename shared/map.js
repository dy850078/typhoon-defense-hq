// 地圖資料：前後端共用（瀏覽器會掛在 window.HQ_MAP，Node 用 module.exports）
(function (root) {
  const W = 40;
  const H = 46;
  const TILE = 48;

  // 圖例
  // ,  草地      .  室內地板   #  牆壁       =  門
  // ~  水窪      T  樹         B  沙包       K  物資箱
  // M  會議桌    P  螢幕牆     S  沙發       V  視訊室地板
  // F  圍欄      :  前線泥地   G  爐台       N  轉職導師
  // W  戰情室電視牆（擋路）     C  會議椅（不擋路）   R  冰箱
  const BLOCKING = new Set(['#', 'T', 'B', 'K', 'M', 'P', 'S', 'F', 'G', 'N', 'W', 'R']);

  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill(','));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const rect = (x1, y1, x2, y2, c) => {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) set(x, y, c);
  };

  // 建築本體
  rect(4, 3, 35, 24, '#');
  rect(5, 4, 34, 23, '.');
  rect(21, 4, 34, 13, 'V');
  // 內牆
  rect(20, 4, 20, 23, '#');
  rect(5, 14, 34, 14, '#');
  // 門
  set(20, 9, '='); set(20, 19, '=');
  set(12, 14, '='); set(13, 14, '=');
  set(27, 14, '='); set(28, 14, '=');
  rect(26, 24, 29, 24, '=');

  // 指揮中心：會議桌 + 螢幕牆
  rect(9, 8, 15, 9, 'M');
  rect(8, 4, 16, 4, 'P');
  // 轉職導師站在螢幕牆右邊
  const MENTOR_TILE = { x: 17, y: 6 };
  set(MENTOR_TILE.x, MENTOR_TILE.y, 'N');
  // 戰情室：電視牆、長會議桌、兩排椅子
  rect(23, 4, 32, 4, 'W');
  rect(24, 8, 31, 9, 'M');
  rect(24, 7, 31, 7, 'C'); rect(24, 10, 31, 10, 'C');
  // 物資倉庫：箱子
  rect(6, 16, 7, 17, 'K'); rect(6, 20, 8, 22, 'K');
  rect(16, 16, 18, 17, 'K'); rect(15, 21, 18, 22, 'K');
  rect(10, 16, 12, 17, 'K');
  // 休息區：沙發
  rect(23, 17, 26, 17, 'S'); rect(30, 17, 33, 17, 'S');
  rect(23, 21, 25, 21, 'S');
  // 煮泡麵區：休息區右下角的爐台
  rect(31, 22, 33, 22, 'G');
  const FRIDGE_TILE = { x: 34, y: 20 };
  set(FRIDGE_TILE.x, FRIDGE_TILE.y, 'R');

  // 戶外：沙包、樹、水窪
  rect(24, 26, 25, 26, 'B'); rect(30, 26, 31, 26, 'B');
  [[2, 2], [37, 2], [1, 12], [38, 10], [2, 26], [37, 27], [12, 27], [18, 28], [36, 18], [1, 19]]
    .forEach(([x, y]) => set(x, y, 'T'));
  [[8, 26], [9, 26], [9, 27], [15, 26], [33, 28], [34, 28], [38, 23], [1, 6], [2, 6]]
    .forEach(([x, y]) => set(x, y, '~'));

  // 颱風前線：圍欄以南，中間留一個出口
  rect(0, 31, W - 1, H - 1, ':');
  rect(0, 30, W - 1, 30, 'F');
  rect(26, 30, 29, 30, ',');
  [[4, 35], [5, 35], [33, 40], [34, 41], [10, 43], [30, 34]].forEach(([x, y]) => set(x, y, '~'));
  [[1, 33], [38, 33], [2, 44], [37, 44]].forEach(([x, y]) => set(x, y, 'T'));

  // 物資箱：每一堆會掉出不同的東西
  const ITEMS = {
    noodle: { name: '泡麵', icon: '🍜' },
    water: { name: '礦泉水', icon: '💧' },
    veggie: { name: '蔬菜', icon: '🥬' },
    bubbletea: { name: '台灣珍奶', icon: '🧋' },
    chicken: { name: '台灣雞排', icon: '🍗' },
  };
  const CRATES = [
    { label: '泡麵', item: 'noodle', x1: 6, y1: 16, x2: 7, y2: 17 },
    { label: '礦泉水', item: 'water', x1: 6, y1: 20, x2: 8, y2: 22 },
    { label: '蔬菜', item: 'veggie', x1: 16, y1: 16, x2: 18, y2: 17 },
    { label: '綜合', item: null, x1: 15, y1: 21, x2: 18, y2: 22 },
    { label: '台灣小吃', item: ['bubbletea', 'chicken'], icon: '🧋🍗', x1: 10, y1: 16, x2: 12, y2: 17 },
  ];

  const ROOMS = [
    { id: 'command', name: '🗺️ 指揮中心', x1: 5, y1: 4, x2: 19, y2: 13 },
    { id: 'video', name: '🎖️ 戰情室', x1: 21, y1: 4, x2: 34, y2: 13 },
    { id: 'storage', name: '📦 物資倉庫', x1: 5, y1: 15, x2: 19, y2: 23 },
    { id: 'kitchen', name: '🍜 煮泡麵區', x1: 30, y1: 20, x2: 34, y2: 23 },
    { id: 'lounge', name: '🛋️ 休息區', x1: 21, y1: 15, x2: 34, y2: 23 },
    { id: 'front', name: '🌀 颱風前線', x1: 0, y1: 31, x2: W - 1, y2: H - 1 },
  ];
  // 颱風怪物活動的範圍（像素）
  const MONSTER_ZONE = { x1: 4 * TILE, y1: 34 * TILE, x2: (W - 4) * TILE, y2: (H - 3) * TILE };

  const map = {
    W, H, TILE, BLOCKING, ROOMS, ITEMS, CRATES, MONSTER_ZONE,
    mentor: { x: (MENTOR_TILE.x + 0.5) * TILE, y: (MENTOR_TILE.y + 0.5) * TILE },
    tiles: g,
    spawn: { x: 28 * TILE, y: 27 * TILE },
    isBlocked(px, py) {
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(py / TILE);
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
      return BLOCKING.has(g[ty][tx]);
    },
    // 回傳 (tx, ty) 這格所屬的物資箱堆編號，沒有就回傳 -1
    crateAt(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= W || ty >= H || g[ty][tx] !== 'K') return -1;
      return CRATES.findIndex(c => tx >= c.x1 && tx <= c.x2 && ty >= c.y1 && ty <= c.y2);
    },
    // 像素座標 (px, py) 附近 range 內有沒有爐台
    nearStove(px, py, range) {
      const cx = Math.floor(px / TILE), cy = Math.floor(py / TILE);
      for (let ty = cy - 2; ty <= cy + 2; ty++) {
        for (let tx = cx - 2; tx <= cx + 2; tx++) {
          if (ty < 0 || tx < 0 || ty >= H || tx >= W || g[ty][tx] !== 'G') continue;
          if (Math.hypot(px - (tx + 0.5) * TILE, py - (ty + 0.5) * TILE) < range) return true;
        }
      }
      return false;
    },
    fridge: { x: (FRIDGE_TILE.x + 0.5) * TILE, y: (FRIDGE_TILE.y + 0.5) * TILE },
    nearFridge(px, py) {
      return Math.hypot(px - this.fridge.x, py - this.fridge.y) < 2 * TILE;
    },
    nearMentor(px, py) {
      return Math.hypot(px - this.mentor.x, py - this.mentor.y) < 2 * TILE;
    },
    roomAt(px, py) {
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(py / TILE);
      return ROOMS.find(r => tx >= r.x1 && tx <= r.x2 && ty >= r.y1 && ty <= r.y2) || null;
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = map;
  else root.HQ_MAP = map;
})(this);
