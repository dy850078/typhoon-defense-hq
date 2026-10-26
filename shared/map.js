// 地圖資料：前後端共用（瀏覽器會掛在 window.HQ_MAP，Node 用 module.exports）
(function (root) {
  // 總部本體 40 格寬；右邊隔兩格空地（走不過去）是花蓮副本區，再隔兩格是古城候位區；
  // 再往右隔兩格是台北101副本區和 101 大廳候位區
  // 副本區和候位區都走不過去，只能找指揮中心的 NPC 傳送
  const MW = 40;
  const DX = 42; // 花蓮副本區最左邊那一格
  const LX = DX + 24; // 古城候位區最左邊那一格
  const TDX = LX + 14; // 台北101副本區最左邊那一格
  const TLX = TDX + 24; // 101 大廳候位區最左邊那一格
  const W = TLX + 12;
  const DH = 46; // 副本區的高度（總部以南的野區比較長，下面的副本區就只是虛空）
  const H = 86;
  const TILE = 48;

  // 圖例
  // ,  草地      .  室內地板   #  牆壁       =  門
  // ~  水窪      T  樹         B  沙包       K  物資箱
  // M  會議桌    P  螢幕牆     S  沙發       V  視訊室地板
  // F  圍欄      :  前線泥地   G  爐台       N  轉職導師
  // W  戰情室電視牆（擋路）     C  會議椅（不擋路）   R  冰箱
  // J  DJ 台（點唱機）     O  副本傳送門（不擋路）     L  許願池（2x2）   I  希臘少女
  // 副本區：(空白) 虛空    Y  峽谷岩壁    Z  深海       y  七星潭礫石灘
  //         u  洞穴地板    x  大理石要推到的凹槽         n  斷崖上的草地
  //         X  關卡之間的石門（關著的時候擋路）          E  七星潭石碑
  // 候位區：Q  古城石牆    q  古城石板地    H  古城守門員（站在指揮中心）
  // 台北101：g  玻璃帷幕牆  k  天空         p  信義廣場地磚  f  阻尼球層的鋼板地
  //         c  控制台（踩上去）            o  觀景台地板    A  觀景台的大柱子
  //         h  101 大廳大理石地            U  101 電梯小姐（站在指揮中心）
  // 野區：  a  下班路上的人行道  l  路燈        s  區域路牌
  //         e  打卡大樓的地毯    D  辦公桌      j  盆栽
  //         r  廟口老街的紅磚    z  香爐        i  燈籠柱
  //         v  分隔兩區的矮樹籬（中間留通道）
  const BLOCKING = new Set(['#', 'T', 'B', 'K', 'M', 'P', 'S', 'F', 'G', 'N', 'W', 'R', 'J', 'L', 'I', ' ', 'Y', 'Z', 'E', 'Q', 'H',
    'g', 'k', 'A', 'U', 'l', 's', 'D', 'j', 'z', 'i', 'v']);

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
  // 101 電梯小姐站在指揮中心左下角，跟她說話就送你去 101 大廳候位區
  const ELEVATOR_TILE = { x: 6, y: 11 };
  set(ELEVATOR_TILE.x, ELEVATOR_TILE.y, 'U');
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
  // 總部門口和前線圍欄中間的草地：許願池，旁邊站著希臘少女
  rect(20, 26, 21, 27, 'L');
  const GREEK_TILE = { x: 22, y: 26 };
  set(GREEK_TILE.x, GREEK_TILE.y, 'I');
  [[2, 2], [37, 2], [1, 12], [38, 10], [2, 26], [37, 27], [12, 27], [18, 28], [36, 18], [1, 19]]
    .forEach(([x, y]) => set(x, y, 'T'));
  [[8, 26], [9, 26], [9, 27], [15, 26], [33, 28], [34, 28], [38, 23], [1, 6], [2, 6]]
    .forEach(([x, y]) => set(x, y, '~'));

  // 野區：圍欄以南，中間留一個出口；往南依序是下班路上 → 打卡大樓 → 廟口老街，每區之間隔一排矮樹籬
  const FIELD = [
    { id: 'walk', name: '下班路上', y1: 31, y2: 46, floor: 'a' },
    { id: 'office', name: '打卡大樓', y1: 48, y2: 64, floor: 'e' },
    { id: 'temple', name: '廟口老街', y1: 66, y2: H - 1, floor: 'r' },
  ];
  FIELD.forEach(z => rect(0, z.y1, MW - 1, z.y2, z.floor));
  rect(0, 30, MW - 1, 30, 'F');
  rect(26, 30, 29, 30, ',');
  [[47, 'a'], [65, 'e']].forEach(([y, c]) => { rect(0, y, MW - 1, y, 'v'); rect(17, y, 22, y, c); });
  // 每區入口的路牌
  set(14, 32, 's'); set(14, 49, 's'); set(14, 67, 's');
  // 下班路上：路燈、水窪、行道樹
  [[4, 33], [35, 33], [9, 41], [30, 41], [20, 44]].forEach(([x, y]) => set(x, y, 'l'));
  [[4, 37], [5, 37], [33, 40], [34, 41], [12, 44], [28, 35]].forEach(([x, y]) => set(x, y, '~'));
  [[1, 33], [38, 33], [2, 45], [37, 45], [17, 36], [24, 39]].forEach(([x, y]) => set(x, y, 'T'));
  // 打卡大樓：一排排辦公桌（兩格寬）和盆栽
  [[4, 51], [10, 51], [26, 51], [32, 51], [4, 56], [10, 56], [26, 56], [32, 56], [6, 61], [30, 61], [14, 59], [22, 54]]
    .forEach(([x, y]) => rect(x, y, x + 1, y, 'D'));
  [[1, 49], [38, 49], [1, 63], [38, 63], [18, 57], [21, 57], [8, 53], [30, 53]].forEach(([x, y]) => set(x, y, 'j'));
  // 廟口老街：中間一座香爐，兩旁燈籠柱，角落有樹
  set(19, 74, 'z');
  [[12, 69], [27, 69], [12, 79], [27, 79], [5, 74], [34, 74], [19, 83]].forEach(([x, y]) => set(x, y, 'i'));
  [[1, 67], [38, 67], [2, 84], [37, 84], [8, 82], [31, 70]].forEach(([x, y]) => set(x, y, 'T'));

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

  // ---------------- 台北101副本 ----------------
  // 一樣一關接一關往下走：信義廣場（打三波怪）→ 87 樓阻尼球（四個控制台）→ 觀景台打天龍王
  const TAIPEI = [
    // 第一關：信義廣場（上面三排是 101 的玻璃帷幕）
    'gggggggggggggggggggggg',
    'gggggggggggggggggggggg',
    'gggggggggggggggggggggg',
    'gppppppppppppppppppppg',
    'gppppppppppppppppppppg',
    'gppppTppppppppppTppppg',
    'gppppppppppppppppppppg',
    'gppppppppppppppppppppg',
    'gppppppppppppppppppppg',
    'gppppTppppppppppTppppg',
    'gppppppppppppppppppppg',
    'gppppppppppppppppppppg',
    'gppppppppppppppppppppg',
    'ggggggggggXXgggggggggg',
    // 第二關：87～92 樓阻尼球（球在中間左右盪，四個角落有控制台）
    'gffffffffffffffffffffg',
    'gfcffffffffffffffffcfg',
    'gffffffffffffffffffffg',
    'gffffffffffffffffffffg',
    'gffffffffffffffffffffg',
    'gffffffffffffffffffffg',
    'gffffffffffffffffffffg',
    'gffffffffffffffffffffg',
    'gffffffffffffffffffffg',
    'gffffffffffffffffffffg',
    'gffffffffffffffffffffg',
    'gffffffffffffffffffffg',
    'gffffffffffffffffffffg',
    'gfcffffffffffffffffcfg',
    'gffffffffffffffffffffg',
    'ggggggggggXXgggggggggg',
    // 第三關：101 樓頂觀景台（右邊是天空，四根大柱子可以躲天龍暴風）
    'gooooooooooooooooookkg',
    'gooooooooooooooooookkg',
    'goooooooooooooooooookg',
    'goooooooooooooooooookg',
    'goooooAoooooooAoooookg',
    'goooooooooooooooooookg',
    'goooooooooooooooooookg',
    'goooooooooooooooooookg',
    'goooooooooooooooooookg',
    'goooooooooooooooooookg',
    'goooooAoooooooAoooookg',
    'goooooooooooooooooookg',
    'goooooooooooooooooookg',
    'gooooooooooooooooookkg',
    'gooooooooooooooooookkg',
    'gggggggggggggggggggggg',
  ];
  TAIPEI.forEach((row, y) => [...row].forEach((c, x) => set(TDX + x, y, c)));

  // ---------------- 候位區 ----------------
  // 古城候位區：四面石牆圍起來的前庭，上面是通往花蓮副本的古城門；站在裡面按「出發」
  rect(LX, 2, LX + 11, 15, 'Q');
  rect(LX + 1, 3, LX + 10, 14, 'q');
  [[LX + 2, 6], [LX + 9, 6], [LX + 2, 11], [LX + 9, 11]].forEach(([x, y]) => set(x, y, 'Q')); // 四根石柱
  const PORTAL_TILE = { x: LX + 5, y: 4 };
  set(PORTAL_TILE.x, PORTAL_TILE.y, 'O');
  const LOBBY = { x1: LX + 1, y1: 3, x2: LX + 10, y2: 14 };
  // 101 大廳候位區：玻璃帷幕牆、大理石地板，上面是直達觀景台的電梯
  rect(TLX, 2, TLX + 11, 15, 'g');
  rect(TLX + 1, 3, TLX + 10, 14, 'h');
  const TPORTAL_TILE = { x: TLX + 5, y: 4 };
  set(TPORTAL_TILE.x, TPORTAL_TILE.y, 'O');
  const TLOBBY = { x1: TLX + 1, y1: 3, x2: TLX + 10, y2: 14 };

  const px = (x) => (DX + x + 0.5) * TILE, py = (y) => (y + 0.5) * TILE;
  const tpx = (x) => (TDX + x + 0.5) * TILE;
  // 三關的範圍都一樣：第 1 關 3～12 排、第 2 關 14～28 排、第 3 關 30～44 排
  const boxes = (dx, w3) => [
    { x1: (dx + 1) * TILE, y1: 3 * TILE, x2: (dx + 21) * TILE, y2: 13 * TILE },
    { x1: (dx + 1) * TILE, y1: 14 * TILE, x2: (dx + 21) * TILE, y2: 29 * TILE },
    { x1: (dx + 1) * TILE, y1: 30 * TILE, x2: (dx + w3) * TILE, y2: 45 * TILE },
  ];
  const gates = (dx) => [[[dx + 10, 13], [dx + 11, 13]], [[dx + 10, 29], [dx + 11, 29]]];
  const hb = boxes(DX, 20), tb = boxes(TDX, 20);
  const DUNGEON = {
    id: 'hualien', name: '花蓮', title: '花蓮・太魯閣峽谷', dx: DX, lx: LX, lobby: LOBBY, npcName: '古城守門員', lobbyName: '古城候位區',
    portalName: '古城門・花蓮副本', minLevel: 0,
    maxPlayers: 6, countdownMs: 10000, timeLimitMs: 20 * 60 * 1000, respawnMs: 10000,
    // 每一關的起點（倒下也是在這裡復活）和範圍（像素）
    stages: [
      { id: 'd1', name: '七星潭', start: { x: px(10.5), y: py(11) }, box: hb[0] },
      { id: 'd2', name: '太魯閣九曲洞', start: { x: px(10.5), y: py(14.6) }, box: hb[1] },
      { id: 'd3', name: '清水斷崖', start: { x: px(10.5), y: py(30.6) }, box: hb[2] },
    ],
    // 關卡之間的石門：第 n 關過了就打開第 n 道
    gates: gates(DX),
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
  const TAIPEI_DG = {
    id: 'taipei', name: '台北101', title: '台北101・天龍之巔', dx: TDX, lx: TLX, lobby: TLOBBY, npcName: '101 電梯小姐', lobbyName: '101 大廳候位區',
    portalName: '101 直達電梯・台北副本', minLevel: 50,
    maxPlayers: 6, countdownMs: 10000, timeLimitMs: 15 * 60 * 1000, respawnMs: 20000,
    stages: [
      { id: 't1', name: '信義廣場', start: { x: tpx(10.5), y: py(4) }, box: tb[0] },
      { id: 't2', name: '87 樓阻尼球', start: { x: tpx(10.5), y: py(14.6) }, box: tb[1] },
      { id: 't3', name: '101 觀景台', start: { x: tpx(10.5), y: py(30.6) }, box: tb[2] },
    ],
    gates: gates(TDX),
    // 阻尼球層四個角落的控制台（像素）
    consoles: [[2, 15], [19, 15], [2, 27], [19, 27]].map(([x, y]) => ({ x: tpx(x), y: py(y) })),
    // 阻尼球在第 21 排左右盪：x 在 x1～x2 之間，period 毫秒來回一次
    ball: { x1: tpx(2.5), x2: tpx(18.5), y: py(21), r: 64, period: 4200 },
    // 觀景台的四根柱子（天龍暴風的時候躲在後面）
    pillars: [[6, 34], [14, 34], [6, 40], [14, 40]].map(([x, y]) => ({ x: tpx(x), y: py(y) })),
    boss: { x: tpx(10), y: py(37) },
  };
  const DUNGEONS = { hualien: DUNGEON, taipei: TAIPEI_DG };
  const DG_LIST = [DUNGEON, TAIPEI_DG];
  DUNGEON.portal = { x: (PORTAL_TILE.x + 0.5) * TILE, y: (PORTAL_TILE.y + 0.5) * TILE };
  TAIPEI_DG.portal = { x: (TPORTAL_TILE.x + 0.5) * TILE, y: (TPORTAL_TILE.y + 0.5) * TILE };
  DUNGEON.npc = { x: (GUARD_TILE.x + 0.5) * TILE, y: (GUARD_TILE.y + 0.5) * TILE };
  TAIPEI_DG.npc = { x: (ELEVATOR_TILE.x + 0.5) * TILE, y: (ELEVATOR_TILE.y + 0.5) * TILE };

  // 物資箱：每一堆會掉出不同的東西
  const ITEMS = {
    noodle: { name: '泡麵', icon: '🍜' },
    water: { name: '礦泉水', icon: '💧' },
    veggie: { name: '蔬菜', icon: '🥬' },
    bubbletea: { name: '台灣珍奶', icon: '🧋' },
    chicken: { name: '台灣雞排', icon: '🍗' },
  };
  const BAG_SLOTS = 25; // 背包格數：一種物資佔一格
  const CRATES = [
    { label: '泡麵', item: 'noodle', x1: 6, y1: 16, x2: 7, y2: 17 },
    { label: '礦泉水', item: 'water', x1: 6, y1: 20, x2: 8, y2: 22 },
    { label: '蔬菜', item: 'veggie', x1: 16, y1: 16, x2: 18, y2: 17 },
    { label: '綜合', item: null, x1: 15, y1: 21, x2: 18, y2: 22 },
    { label: '台灣小吃', item: ['bubbletea', 'chicken'], x1: 10, y1: 16, x2: 12, y2: 17 },
  ];

  const ROOMS = [
    { id: 'command', name: '🗺️ 指揮中心', x1: 5, y1: 4, x2: 19, y2: 13 },
    { id: 'video', name: '🎖️ 戰情室', x1: 21, y1: 4, x2: 34, y2: 13 },
    { id: 'storage', name: '📦 物資倉庫', x1: 5, y1: 15, x2: 19, y2: 23 },
    { id: 'kitchen', name: '🍜 煮泡麵區', x1: 30, y1: 20, x2: 34, y2: 23 },
    { id: 'lounge', name: '🛋️ 休息區', x1: 21, y1: 15, x2: 34, y2: 23 },
    // 野區的三區：field 標記可以打怪、畫城牆、召喚
    ...FIELD.map(z => ({ id: z.id, name: z.name, field: true, x1: 0, y1: z.y1 - (z.id === 'walk' ? 0 : 1), x2: MW - 1, y2: z.y2 })),
    { id: 'lobby', name: '🏯 古城候位區', lobby: 'hualien', ...LOBBY },
    { id: 'd1', name: '🌊 七星潭', dungeon: 'hualien', x1: DX + 1, y1: 3, x2: DX + 20, y2: 12 },
    { id: 'd2', name: '🪨 太魯閣九曲洞', dungeon: 'hualien', x1: DX + 1, y1: 14, x2: DX + 20, y2: 28 },
    { id: 'd3', name: '⚔️ 清水斷崖', dungeon: 'hualien', boss: true, x1: DX + 1, y1: 30, x2: DX + 20, y2: 44 },
    { id: 'tlobby', name: '101 大廳候位區', lobby: 'taipei', ...TLOBBY },
    { id: 't1', name: '信義廣場', dungeon: 'taipei', x1: TDX + 1, y1: 3, x2: TDX + 20, y2: 12 },
    { id: 't2', name: '87 樓阻尼球', dungeon: 'taipei', x1: TDX + 1, y1: 14, x2: TDX + 20, y2: 28 },
    { id: 't3', name: '101 觀景台', dungeon: 'taipei', boss: true, x1: TDX + 1, y1: 30, x2: TDX + 20, y2: 44 },
  ];
  // 颱風怪物活動的範圍（像素）：下班路上那一區
  const MONSTER_ZONE = { x1: 4 * TILE, y1: 34 * TILE, x2: (MW - 4) * TILE, y2: 44 * TILE };
  // 每一區小怪活動的範圍（像素），和整個野區的範圍
  const FIELD_ZONES = {};
  FIELD.forEach(z => { FIELD_ZONES[z.id] = { x1: 2 * TILE, y1: (z.y1 + 1.5) * TILE, x2: (MW - 2) * TILE, y2: (z.y2 - 1) * TILE }; });
  const FIELD_BOX = { x1: 0, y1: 31 * TILE, x2: MW * TILE, y2: H * TILE };

  // 會變動的擋路格子（關著的石門、九曲洞的大理石）：'tx,ty'
  const dyn = new Set();
  const map = {
    W, H, DH, MW, DX, LX, TDX, TLX, TILE, BLOCKING, ROOMS, ITEMS, BAG_SLOTS, CRATES, MONSTER_ZONE, FIELD, FIELD_ZONES, FIELD_BOX, DUNGEON, DUNGEONS, DG_LIST, LOBBY, dyn,
    portal: DUNGEON.portal,
    mentor: { x: (MENTOR_TILE.x + 0.5) * TILE, y: (MENTOR_TILE.y + 0.5) * TILE },
    guard: DUNGEON.npc,
    elevator: TAIPEI_DG.npc,
    tiles: g,
    spawn: { x: 28 * TILE, y: 27 * TILE },
    isBlocked(px, py) {
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(py / TILE);
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
      return BLOCKING.has(g[ty][tx]) || (dyn.size > 0 && dyn.has(tx + ',' + ty));
    },
    // 石門開關：副本 d 的第 i 道（0 起算）
    setGate(d, i, open) {
      d.gates[i].forEach(([x, y]) => { if (open) dyn.delete(x + ',' + y); else dyn.add(x + ',' + y); });
    },
    // 這個 x 屬於哪一個副本（副本區或它的候位區），都不是就是 null
    dungeonAt(px) {
      const tx = px / TILE;
      return DG_LIST.find(d => tx >= d.dx && tx < d.lx + 12) || null;
    },
    // 在副本裡的第幾關（0 起算），不在副本就是 -1
    stageAt(px, py) {
      const d = this.dungeonAt(px);
      return d ? d.stages.findIndex(s => px >= s.box.x1 && px < s.box.x2 && py >= s.box.y1 && py < s.box.y2) : -1;
    },
    // 這個位置在哪一區：總部 hq、副本 dungeon、候位區 lobby（各區之間走不過去，只能傳送）
    zoneOf(px) {
      const d = this.dungeonAt(px);
      return !d ? 'hq' : px < d.lx * TILE ? 'dungeon' : 'lobby';
    },
    // 區域加上是哪個副本，例如 'lobby:taipei'（不同副本的候位區也不能直接走過去）
    areaOf(px) {
      const d = this.dungeonAt(px);
      return d ? this.zoneOf(px) + ':' + d.id : 'hq';
    },
    nearNpc(d, px, py) {
      return Math.hypot(px - d.npc.x, py - d.npc.y) < 2 * TILE;
    },
    nearGuard(px, py) { return this.nearNpc(DUNGEON, px, py); },
    nearElevator(px, py) { return this.nearNpc(TAIPEI_DG, px, py); },
    inLobby(px, py, d) {
      const L = (d || DUNGEON).lobby, tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      return tx >= L.x1 && tx <= L.x2 && ty >= L.y1 && ty <= L.y2;
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
    // 戰情室的電視牆：站到牆前面那兩排就能開視訊或遊戲室
    nearTv(px, py) {
      return px >= 22.5 * TILE && px <= 33.5 * TILE && py >= 4 * TILE && py < 6.8 * TILE;
    },
    dj: { x: 22 * TILE, y: 15.5 * TILE },
    nearDj(px, py) {
      return Math.hypot(px - this.dj.x, py - this.dj.y) < 2 * TILE;
    },
    well: { x: 21 * TILE, y: 27 * TILE },
    greek: { x: (GREEK_TILE.x + 0.5) * TILE, y: (GREEK_TILE.y + 0.5) * TILE },
    nearGreek(px, py) {
      return Math.hypot(px - this.greek.x, py - this.greek.y) < 2 * TILE;
    },
    nearWell(px, py) {
      return Math.hypot(px - this.well.x, py - this.well.y) < 2.4 * TILE;
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
