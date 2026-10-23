// 地圖資料：前後端共用（瀏覽器會掛在 window.HQ_MAP，Node 用 module.exports）
(function (root) {
  const W = 40;
  const H = 30;
  const TILE = 48;

  // 圖例
  // ,  草地      .  室內地板   #  牆壁       =  門
  // ~  水窪      T  樹         B  沙包       K  物資箱
  // M  會議桌    P  螢幕牆     S  沙發       V  視訊室地板
  const BLOCKING = new Set(['#', 'T', 'B', 'K', 'M', 'P', 'S']);

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
  // 視訊會議室：長桌
  rect(25, 8, 30, 9, 'M');
  // 物資倉庫：箱子
  rect(6, 16, 7, 17, 'K'); rect(6, 20, 8, 22, 'K');
  rect(16, 16, 18, 17, 'K'); rect(15, 21, 18, 22, 'K');
  // 休息區：沙發
  rect(23, 17, 26, 17, 'S'); rect(30, 17, 33, 17, 'S');
  rect(23, 21, 25, 21, 'S');

  // 戶外：沙包、樹、水窪
  rect(24, 26, 25, 26, 'B'); rect(30, 26, 31, 26, 'B');
  [[2, 2], [37, 2], [1, 12], [38, 10], [2, 26], [37, 27], [12, 27], [18, 28], [36, 18], [1, 19]]
    .forEach(([x, y]) => set(x, y, 'T'));
  [[8, 26], [9, 26], [9, 27], [15, 26], [33, 28], [34, 28], [38, 23], [1, 6], [2, 6]]
    .forEach(([x, y]) => set(x, y, '~'));

  const ROOMS = [
    { id: 'command', name: '🗺️ 指揮中心', x1: 5, y1: 4, x2: 19, y2: 13 },
    { id: 'video', name: '📹 視訊會議室', x1: 21, y1: 4, x2: 34, y2: 13 },
    { id: 'storage', name: '📦 物資倉庫', x1: 5, y1: 15, x2: 19, y2: 23 },
    { id: 'lounge', name: '🛋️ 休息區', x1: 21, y1: 15, x2: 34, y2: 23 },
  ];

  const map = {
    W, H, TILE, BLOCKING, ROOMS,
    tiles: g,
    spawn: { x: 28 * TILE, y: 27 * TILE },
    isBlocked(px, py) {
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(py / TILE);
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
      return BLOCKING.has(g[ty][tx]);
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
