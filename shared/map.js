// 地圖資料：前後端共用（瀏覽器會掛在 window.HQ_MAP，Node 用 module.exports）
(function (root) {
  // 總部本體 40 格寬；右邊隔兩格空地（走不過去）是副本區，再隔兩格是古城候位區
  // 副本區和候位區都走不過去，只能找指揮中心的古城守門員傳送
  const MW = 40;
  const DX = 42; // 副本區最左邊那一格
  const LX = DX + 24; // 古城候位區最左邊那一格
  const W = LX + 12;
  const H = 46;
  const TILE = 48;

  // 圖例
  // ,  草地      .  室內地板   #  牆壁       =  門
  // ~  水窪      T  樹         B  沙包       K  物資箱
  // M  會議桌    P  螢幕牆     S  沙發       V  視訊室地板
  // F  圍欄      :  前線泥地   G  爐台       N  轉職導師
  // W  戰情室電視牆（擋路）     C  會議椅（不擋路）   R  冰箱
  // J  DJ 台（點唱機）     O  副本傳送門（不擋路）
  // 副本區：(空白) 虛空    Y  峽谷岩壁    Z  深海       y  七星潭礫石灘
  //         u  洞穴地板    x  大理石要推到的凹槽         n  斷崖上的草地
  //         X  關卡之間的石門（關著的時候擋路）          E  七星潭石碑
  // 候位區：Q  古城石牆    q  古城石板地    H  古城守門員（站在指揮中心）
  const BLOCKING = new Set(['#', 'T', 'B', 'K', 'M', 'P', 'S', 'F', 'G', 'N', 'W', 'R', 'J', ' ', 'Y', 'Z', 'E', 'Q', 'H']);

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
  // 房間之間的門都是兩格寬
  rect(20, 9, 20, 10, '='); rect(20, 19, 20, 20, '=');
  set(12, 14, '='); set(13, 14, '=');
  set(27, 14, '='); set(28, 14, '=');
  rect(26, 24, 29, 24, '=');
  // 物資倉庫直接通到外面的後門
  rect(11, 24, 12, 24, '=');

  // 指揮中心：會議桌 + 螢幕牆
  rect(9, 8, 15, 9, 'M');
  rect(8, 4, 16, 4, 'P');
  // 轉職導師站在螢幕牆右邊
  const MENTOR_TILE = { x: 17, y: 6 };
  set(MENTOR_TILE.x, MENTOR_TILE.y, 'N');
  // 古城守門員站在螢幕牆左邊，跟他說話就送你去副本的候位區
  const GUARD_TILE = { x: 6, y: 6 };
  set(GUARD_TILE.x, GUARD_TILE.y, 'H');
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
  // 休息區左上角的 DJ 台：走過去就能點歌
  rect(21, 15, 22, 15, 'J');

  // 戶外：沙包、樹、水窪
  rect(24, 26, 25, 26, 'B'); rect(30, 26, 31, 26, 'B');
  [[2, 2], [37, 2], [1, 12], [38, 10], [2, 26], [37, 27], [12, 27], [18, 28], [36, 18], [1, 19]]
    .forEach(([x, y]) => set(x, y, 'T'));
  [[8, 26], [9, 26], [9, 27], [15, 26], [33, 28], [34, 28], [38, 23], [1, 6], [2, 6]]
    .forEach(([x, y]) => set(x, y, '~'));

  // 颱風前線：圍欄以南，中間留一個出口
  rect(0, 31, MW - 1, H - 1, ':');
  rect(0, 30, MW - 1, 30, 'F');
  rect(26, 30, 29, 30, ',');
  [[4, 35], [5, 35], [33, 40], [34, 41], [10, 43], [30, 34]].forEach(([x, y]) => set(x, y, '~'));
  [[1, 33], [38, 33], [2, 44], [37, 44]].forEach(([x, y]) => set(x, y, 'T'));

  // ---------------- 花蓮副本 ----------------
  // 一關接一關往下走：七星潭 → 太魯閣九曲洞 → 清水斷崖，關卡之間的石門解開謎題才會打開
  rect(MW, 0, W - 1, H - 1, ' ');
  const HUALIEN = [
    // 第一關：七星潭（上面三排是海）
    'ZZZZZZZZZZZZZZZZZZZZZZ',
    'ZZZZZZZZZZZZZZZZZZZZZZ',
    'ZZZZZZZZZZZZZZZZZZZZZZ',
    'YyyyyyyyyyEEyyyyyyyyyY',
    'YyyyyyyyyyyyyyyyyyyyyY',
    'YyyyyyyyyyyyyyyyyyyyyY',
    'YyyyyyyyyyyyyyyyyyyyyY',
    'YyyyyyyyyyyyyyyyyyyyyY',
    'YyyyyyyyyyyyyyyyyyyyyY',
    'YyyyyyyyyyyyyyyyyyyyyY',
    'YyyyyyyyyyyyyyyyyyyyyY',
    'YyyyyyyyyyyyyyyyyyyyyY',
    'YyyyyyyyyyyyyyyyyyyyyY',
    'YYYYYYYYYYXXYYYYYYYYYY',
    // 第二關：太魯閣九曲洞（把三顆大理石推進凹槽）
    'YuuuuuuuuuuuuuuuuuuuuY',
    'YuuuuuuuuuuuuuuuuuuuuY',
    'YuuuYYuuuuuuuuuuYYuuuY',
    'YuuuYYuuuuuuuuuuYYuuuY',
    'YuuuuuuuuuuuuuuuuuuuuY',
    'YuuuuuuuuuuuuuuuuuuuuY',
    'YYYYYYYuuuuuuuuYYYYYYY',
    'YuuuuuuuuuuuuuuuuuuuuY',
    'YuuuuuuuuuuuuuuuuuuuuY',
    'YuuuYYuuuuuuuuuuYYuuuY',
    'YuuuuuuuuuuuuuuuuuuuuY',
    'YuuuuuuuuuuuuuuuuuuuuY',
    'YuuuxuuuuuxuuuuuuxuuuY',
    'YuuuuuuuuuuuuuuuuuuuuY',
    'YuuuuuuuuuuuuuuuuuuuuY',
    'YYYYYYYYYYXXYYYYYYYYYY',
    // 第三關：清水斷崖（右邊是太平洋）
    'YnnnnnnnnnnnnnnnnnZZZY',
    'YnnnnnnnnnnnnnnnnnnZZY',
    'YnnnnnnnnnnnnnnnnnnZZY',
    'YnnnnnnnnnnnnnnnnnnnZY',
    'YnnnnnnnnnnnnnnnnnnnZY',
    'YnnnnnnnnnnnnnnnnnnnZY',
    'YnnnnnnnnnnnnnnnnnnnZY',
    'YnnnnnnnnnnnnnnnnnnnZY',
    'YnnnnnnnnnnnnnnnnnnnZY',
    'YnnnnnnnnnnnnnnnnnnnZY',
    'YnnnnnnnnnnnnnnnnnnnZY',
    'YnnnnnnnnnnnnnnnnnnZZY',
    'YnnnnnnnnnnnnnnnnnnZZY',
    'YnnnnnnnnnnnnnnnnnZZZY',
    'YnnnnnnnnnnnnnnnnnZZZY',
    'YYYYYYYYYYYYYYYYYYYYYY',
  ];
  HUALIEN.forEach((row, y) => [...row].forEach((c, x) => set(DX + x, y, c)));

  // ---------------- 古城候位區 ----------------
  // 四面石牆圍起來的前庭，上面是通往副本的古城門；站在裡面按「出發」
  rect(LX, 2, LX + 11, 15, 'Q');
  rect(LX + 1, 3, LX + 10, 14, 'q');
  [[LX + 2, 6], [LX + 9, 6], [LX + 2, 11], [LX + 9, 11]].forEach(([x, y]) => set(x, y, 'Q')); // 四根石柱
  const PORTAL_TILE = { x: LX + 5, y: 4 };
  set(PORTAL_TILE.x, PORTAL_TILE.y, 'O');
  const LOBBY = { x1: LX + 1, y1: 3, x2: LX + 10, y2: 14 };
  const px = (x) => (DX + x + 0.5) * TILE, py = (y) => (y + 0.5) * TILE;
  const DUNGEON = {
    id: 'hualien', name: '花蓮', title: '花蓮・太魯閣峽谷',
    maxPlayers: 6, countdownMs: 10000, timeLimitMs: 20 * 60 * 1000, respawnMs: 10000,
    // 每一關的起點（倒下也是在這裡復活）和範圍（像素）
    stages: [
      { id: 'd1', name: '🌊 七星潭', start: { x: px(10.5), y: py(11) },
        box: { x1: (DX + 1) * TILE, y1: 3 * TILE, x2: (DX + 21) * TILE, y2: 13 * TILE } },
      { id: 'd2', name: '🪨 太魯閣九曲洞', start: { x: px(10.5), y: py(14.6) },
        box: { x1: (DX + 1) * TILE, y1: 14 * TILE, x2: (DX + 21) * TILE, y2: 29 * TILE } },
      { id: 'd3', name: '⚔️ 清水斷崖', start: { x: px(10.5), y: py(30.6) },
        box: { x1: (DX + 1) * TILE, y1: 30 * TILE, x2: (DX + 20) * TILE, y2: 45 * TILE } },
    ],
    // 關卡之間的石門：第 n 關過了就打開第 n 道
    gates: [[[DX + 10, 13], [DX + 11, 13]], [[DX + 10, 29], [DX + 11, 29]]],
    // 七星潭的七顆彩色石頭（七種顏色），石碑上會畫出要踩的順序
    stones: [
      { x: px(4), y: py(6), color: '#e8384f', name: '紅' },
      { x: px(8), y: py(5), color: '#ff8a3d', name: '橘' },
      { x: px(13), y: py(5), color: '#ffd23f', name: '黃' },
      { x: px(17), y: py(6), color: '#6baf7b', name: '綠' },
      { x: px(6), y: py(9), color: '#4f7cc2', name: '藍' },
      { x: px(11), y: py(8), color: '#8a5cd6', name: '紫' },
      { x: px(16), y: py(9), color: '#fbfbf8', name: '白' },
    ],
    stele: { x: (DX + 11) * TILE, y: 3 * TILE + 16 }, // 石碑上畫順序的位置
    seqLen: 5,
    // 九曲洞：三顆大理石的起點（格子座標）
    blocks: [[DX + 6, 18], [DX + 15, 18], [DX + 10, 23]],
    boss: { x: px(10), y: py(38) },
  };

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
    { id: 'front', name: '🌀 颱風前線', x1: 0, y1: 31, x2: MW - 1, y2: H - 1 },
    { id: 'lobby', name: '🏯 古城候位區', lobby: true, ...LOBBY },
    { id: 'd1', name: '🌊 七星潭', dungeon: true, x1: DX + 1, y1: 3, x2: DX + 20, y2: 12 },
    { id: 'd2', name: '🪨 太魯閣九曲洞', dungeon: true, x1: DX + 1, y1: 14, x2: DX + 20, y2: 28 },
    { id: 'd3', name: '⚔️ 清水斷崖', dungeon: true, x1: DX + 1, y1: 30, x2: DX + 20, y2: 44 },
  ];
  // 颱風怪物活動的範圍（像素）
  const MONSTER_ZONE = { x1: 4 * TILE, y1: 34 * TILE, x2: (MW - 4) * TILE, y2: (H - 3) * TILE };

  // 會變動的擋路格子（關著的石門、九曲洞的大理石）：'tx,ty'
  const dyn = new Set();
  const map = {
    W, H, MW, DX, LX, TILE, BLOCKING, ROOMS, ITEMS, CRATES, MONSTER_ZONE, DUNGEON, LOBBY, dyn,
    portal: { x: (PORTAL_TILE.x + 0.5) * TILE, y: (PORTAL_TILE.y + 0.5) * TILE },
    mentor: { x: (MENTOR_TILE.x + 0.5) * TILE, y: (MENTOR_TILE.y + 0.5) * TILE },
    guard: { x: (GUARD_TILE.x + 0.5) * TILE, y: (GUARD_TILE.y + 0.5) * TILE },
    tiles: g,
    spawn: { x: 28 * TILE, y: 27 * TILE },
    isBlocked(px, py) {
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(py / TILE);
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
      return BLOCKING.has(g[ty][tx]) || (dyn.size > 0 && dyn.has(tx + ',' + ty));
    },
    // 石門開關：第 i 道（0 起算）
    setGate(i, open) {
      DUNGEON.gates[i].forEach(([x, y]) => { if (open) dyn.delete(x + ',' + y); else dyn.add(x + ',' + y); });
    },
    // 在副本裡的第幾關（0 起算），不在副本就是 -1
    stageAt(px, py) {
      return DUNGEON.stages.findIndex(s => px >= s.box.x1 && px < s.box.x2 && py >= s.box.y1 && py < s.box.y2);
    },
    inDungeon(px) { return px >= DX * TILE && px < (DX + 22) * TILE; },
    // 這個位置在哪一區：總部 hq、副本 dungeon、候位區 lobby（三區之間走不過去，只能傳送）
    zoneOf(px) { return px < MW * TILE ? 'hq' : px < LX * TILE ? 'dungeon' : 'lobby'; },
    nearGuard(px, py) {
      return Math.hypot(px - this.guard.x, py - this.guard.y) < 2 * TILE;
    },
    inLobby(px, py) {
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      return tx >= LOBBY.x1 && tx <= LOBBY.x2 && ty >= LOBBY.y1 && ty <= LOBBY.y2;
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
    dj: { x: 22 * TILE, y: 15.5 * TILE },
    nearDj(px, py) {
      return Math.hypot(px - this.dj.x, py - this.dj.y) < 2 * TILE;
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
