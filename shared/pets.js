// 寵物：前後端共用的選項清單、存檔檢查，和瀏覽器端的蠟筆畫法
// 每個帳號可以領養一隻（貓咪或狗狗），自己捏外觀、取名字、戴頭套，切換「跟在身邊／自由散步」
// 畫在 64x56 的框裡，腳底在 (32, 52)；三種姿勢：stand（側身走路）、sit（正面坐著）、sleep（捲成一團睡覺）
(function (root) {
  const KINDS = { cat: '貓咪', dog: '狗狗', horse: '小馬' };
  // 跟在身邊：主人走到野區或副本，牠會一起打怪（以前另外有一個「一起打怪」，合併進來了）
  const MODES = { follow: '跟在身邊', wander: '自由散步' };
  // 個性：領養的時候隨機決定，之後不會變（貓比較常高冷，狗比較常熱情）。決定牠對主人講話的口氣
  const TEMPERS = { cool: '高冷', warm: '熱情', clingy: '撒嬌' };
  const TEMPER_ODDS = { cat: { cool: 55, warm: 15, clingy: 30 }, dog: { cool: 10, warm: 60, clingy: 30 }, horse: { cool: 30, warm: 40, clingy: 30 } };
  function rollTemper(kind, rnd) {
    const odds = TEMPER_ODDS[kind] || TEMPER_ODDS.cat;
    let x = (rnd || Math.random)() * 100;
    for (const k of Object.keys(odds)) { x -= odds[k]; if (x < 0) return k; }
    return 'warm';
  }
  // 還沒有個性的寵物補一個
  const withTemper = (pet) => { if (pet && !pet.temper) pet.temper = rollTemper(pet.kind); return pet; };
  // 感情：摸牠、餵點心、一起走、一起打怪會慢慢累積（只增不減，沒上線不會掉）。每種方式每天有上限
  const BOND_LEVELS = [{ at: 0, name: '剛認識' }, { at: 20, name: '熟悉' }, { at: 60, name: '親近' }, { at: 140, name: '很要好' }, { at: 300, name: '最好的夥伴' }];
  const BOND_CAPS = { pat: 5, feed: 3, walk: 6, fight: 3 };
  const BOND_MAX = 9999;
  const bondLevel = (n) => { let i = 0; BOND_LEVELS.forEach((l, k) => { if ((n || 0) >= l.at) i = k; }); return i; };
  // 可以餵的點心和加多少感情：花園種出來的水果牠最喜歡
  const FEED = { tomato: 4, guava: 4, apple: 4, pineapple: 4, chicken: 2, water: 1 };
  const EARS = { up: '立耳', fold: '折耳' };
  // 毛色：底色
  const FURS = ['#d6d4cf', '#f7f4ee', '#f1dcb2', '#f0a456', '#a7aebb', '#a97850', '#3d3a3e'];
  const FUR_NAMES = ['銀灰', '白', '奶油', '橘', '藍灰', '棕', '黑'];
  const PATTERNS = { none: '素色', mackerel: '條紋虎斑', classic: '漩渦虎斑', spots: '斑點', calico: '三花', tuxedo: '賓士', points: '重點色' };
  // 花紋的顏色
  const MARKS = ['#4a4646', '#2e2b2f', '#8b8a90', '#6e4a30', '#d9772f'];
  const MARK_NAMES = ['深灰', '黑', '灰', '咖啡', '橘'];
  const WHITES = { none: '沒有白毛', muzzle: '白嘴邊白胸口', socks: '再加白襪子' };
  const EYES = ['#8db04b', '#a3cc98', '#c2c94a', '#e3b23c', '#c97b35', '#79b3e3', 'odd'];
  const EYE_NAMES = ['綠', '薄荷綠', '黃綠', '金', '銅', '藍', '異色'];
  const NOSES = ['#cf8a68', '#f2a3b0', '#c56a5a', '#3a3436'];
  const NOSE_NAMES = ['橘棕', '粉紅', '磚紅', '黑'];
  // 表情：微笑（ω 嘴、腮紅）或淡定（嘴巴平平、眼皮稍微壓下來）
  const FACES = { smile: '微笑', calm: '淡定' };
  const TAILS = { long: '長尾巴', short: '短尾巴', fluffy: '蓬蓬尾' };
  // 狗狗的選項：存在跟貓咪一樣的欄位裡（pattern 放毛型、mark 放頭頂的毛色、earc 放耳朵的毛色）
  const DOG_EARS = { drop: '捲毛垂耳', perk: '立耳' };
  const DOG_COATS = { curly: '捲毛', short: '短毛' };
  const DOG_TAILS = { pom: '蓬蓬尾', long: '長尾巴', fluffy: '蓬長尾', curl: '捲尾巴' };
  // 狗狗的白毛花紋（存在 white 欄位）：白底＝臉頰、嘴邊、胸口、肚子是白的，眉毛上兩個小白點；面罩＝額頭深色往下一個尖，眼睛周圍到嘴邊、胸口、四隻腳是白的
  const DOG_WHITES = { none: '沒有', muzzle: '白底', socks: '面罩' };
  const DOG_FACES = { smile: '微笑', squint: '瞇眼笑', tongue: '吐舌頭' };
  // 小馬的選項：pattern 放鬃毛的樣子、mark 放鬃毛和尾巴的顏色、nose 放嘴邊的顏色
  const HORSE_EARS = { up: '立耳' };
  const HORSE_MANES = { flow: '長鬃毛', short: '短鬃毛' };
  const HORSE_WHITES = { none: '沒有', muzzle: '白鼻梁', socks: '白鼻梁加白襪' };
  const HORSE_TAILS = { long: '長尾巴', short: '短尾巴' };
  const HORSE_FACES = { smile: '微笑', squint: '瞇眼笑', calm: '淡定' };
  // 頭套：貓狗都能戴
  const HATS = { none: '不戴', frog: '青蛙帽', bear: '小熊帽', bunny: '兔耳帽', berry: '草莓帽', egg: '荷包蛋', duck: '小黃鴨帽' };
  const NAME_MAX = 8;

  const DEFAULT = { kind: 'cat', name: '', ears: 'up', fur: FURS[3], pattern: 'mackerel', mark: MARKS[4], white: 'muzzle',
    eyes: '#e3b23c', nose: NOSES[1], tail: 'long', face: 'smile', hat: 'none', earc: '#f0a456', mode: 'follow' };
  const DOG_DEFAULT = { kind: 'dog', name: '', ears: 'drop', fur: '#d09a70', pattern: 'curly', mark: '#f2ddc0', white: 'none',
    eyes: '#2b2a33', nose: '#4a2c28', tail: 'pom', face: 'smile', hat: 'none', earc: '#c68d62', mode: 'follow' };
  const HORSE_DEFAULT = { kind: 'horse', name: '', ears: 'up', fur: '#b8763f', pattern: 'flow', mark: '#5a3826', white: 'muzzle',
    eyes: '#2b2a33', nose: '#ecd0ad', tail: 'long', face: 'smile', hat: 'none', earc: '#b8763f', mode: 'follow' };
  const DEFAULTS = { cat: DEFAULT, dog: DOG_DEFAULT, horse: HORSE_DEFAULT };
  // 每一種寵物各自有哪些選項
  const OPTS = {
    cat: { ears: EARS, pattern: PATTERNS, white: WHITES, tail: TAILS, face: FACES },
    dog: { ears: DOG_EARS, pattern: DOG_COATS, white: DOG_WHITES, tail: DOG_TAILS, face: DOG_FACES },
    horse: { ears: HORSE_EARS, pattern: HORSE_MANES, white: HORSE_WHITES, tail: HORSE_TAILS, face: HORSE_FACES },
  };

  // 顏色：選單裡的，或自己拉色相調出來的（#rrggbb）
  const pick = (v, list, d) => (list.includes(v) ? v : typeof v === 'string' && /^#[0-9a-f]{6}$/.test(v) ? v : d);
  const has = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  // 存檔檢查：不對的值換回預設；沒有寵物是 null
  function sanitize(p) {
    if (!p || typeof p !== 'object' || !has(KINDS, p.kind)) return null;
    const name = String(p.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, NAME_MAX);
    const O = OPTS[p.kind], D = DEFAULTS[p.kind];
    const eyes = pick(p.eyes, EYES, D.eyes);
    return {
      kind: p.kind,
      name: name || KINDS[p.kind],
      ears: has(O.ears, p.ears) ? p.ears : D.ears,
      fur: pick(p.fur, FURS, D.fur),
      pattern: has(O.pattern, p.pattern) ? p.pattern : D.pattern,
      mark: pick(p.mark, MARKS, D.mark),
      white: has(O.white, p.white) ? p.white : D.white,
      eyes,
      nose: pick(p.nose, NOSES, D.nose),
      tail: has(O.tail, p.tail) ? p.tail : D.tail,
      face: has(O.face, p.face) ? p.face : D.face,
      hat: has(HATS, p.hat) ? p.hat : 'none',
      earc: pick(p.earc, [], D.earc),
      mode: has(MODES, p.mode) ? p.mode : D.mode, // 舊的 fight 會變回 follow
      ...(has(TEMPERS, p.temper) ? { temper: p.temper } : {}),
      // 感情值和今天各種方式已經加了幾次（伺服器自己記，玩家送來的會被蓋掉）
      bond: Math.max(0, Math.min(BOND_MAX, Math.floor(Number(p.bond)) || 0)),
      ...(p.bd && typeof p.bd === 'object' && typeof p.bd.d === 'string' ? { bd: Object.assign({ d: p.bd.d.slice(0, 10) },
        ...Object.keys(BOND_CAPS).map(k => ({ [k]: Math.max(0, Math.min(99, Math.floor(Number(p.bd[k])) || 0)) }))) } : {}),
    };
  }
  // 外觀相同就共用同一張貼圖
  const lookKey = (p) => [p.kind, p.ears, p.fur, p.pattern, p.mark, p.white, p.eyes, p.nose, p.tail, p.face, p.hat, p.kind === 'dog' ? p.earc : ''].join('|').replace(/#/g, '');

  // ---------------- 畫法（只在瀏覽器用） ----------------
  const W = 1.7;
  const WHITE = '#fbf8f2';
  const ORANGE = '#e8913f';
  const tabby = (p) => p.pattern === 'mackerel' || p.pattern === 'classic';
  // 主要的毛色：賓士貓整隻是花紋色，再留白
  const mainOf = (p) => (p.pattern === 'tuxedo' ? p.mark : p.fur);
  const whiteOf = (p) => (p.pattern === 'tuxedo' && p.white === 'none' ? 'muzzle' : p.white);
  const mix = (hex, k) => { // k<0 變暗、k>0 變亮
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
    return '#' + c.map(v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k).toString(16).padStart(2, '0')).join('');
  };

  // 同一個形狀要畫好幾次（上色、剪裁、描邊）：每次用一樣的種子，抖動才會一樣
  function shape(ctx, C, seed, fn) { fn(C.rng(seed)); }
  function clipDo(ctx, C, seed, fn, draw) {
    ctx.save(); shape(ctx, C, seed, fn); ctx.clip(); draw(); ctx.restore();
  }
  function furShape(ctx, C, r, seed, fn, color, box, p, pattern) {
    shape(ctx, C, seed, fn); C.fill(ctx, color, r, box, 0.7);
    if (pattern) clipDo(ctx, C, seed, fn, pattern);
    shape(ctx, C, seed, fn); C.stroke(ctx, r, W);
  }
  const dot = (ctx, x, y, rx, ry, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
  const stripe = (ctx, C, r, x1, y1, x2, y2, w, color) => C.line(ctx, x1, y1, x2, y2, r, w, color, 0.8);

  // 沿著二次曲線取點（尾巴上的環紋用）
  const qpt = (a, b, c, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]];
  function tail(ctx, C, r, p, a, b, c) {
    const w = p.tail === 'fluffy' ? 8.5 : 5.5;
    if (p.tail === 'short') { const m = qpt(a, b, c, 0.45); c = m; b = [(a[0] + m[0]) / 2 + (b[0] - a[0]) * 0.2, (a[1] + m[1]) / 2 + (b[1] - a[1]) * 0.2]; }
    const main = p.pattern === 'points' ? p.mark : p.pattern === 'calico' ? ORANGE : mainOf(p);
    const path = () => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]); };
    path(); C.stroke(ctx, r, w + W * 2, C.INK);
    ctx.save(); path(); ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.strokeStyle = main; ctx.stroke(); ctx.restore();
    if (tabby(p)) {
      // 一圈一圈的環紋，越到尾巴尖越密、最尖端是深色
      [0.3, 0.5, 0.68, 0.84].forEach(t => {
        const [x, y] = qpt(a, b, c, t), [x2, y2] = qpt(a, b, c, t + 0.02);
        const dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w * 0.55, ny = dx / l * w * 0.55;
        stripe(ctx, C, r, x - nx, y - ny, x + nx, y + ny, w * 0.42, p.mark);
      });
      ctx.save(); ctx.beginPath(); const m = qpt(a, b, c, 0.9); ctx.moveTo(m[0], m[1]); ctx.lineTo(c[0], c[1]);
      ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.strokeStyle = p.mark; ctx.stroke(); ctx.restore();
    }
    if (p.kind === 'dog') { // 狗狗有白毛花紋的時候，尾巴尖是白的
      if (p.white !== 'none') { ctx.save(); ctx.beginPath(); const m = qpt(a, b, c, 0.8); ctx.moveTo(m[0], m[1]); ctx.lineTo(c[0], c[1]);
        ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.strokeStyle = WHITE; ctx.stroke(); ctx.restore(); }
    } else if (p.tail === 'fluffy') { // 蓬蓬的毛邊
      [0.35, 0.6, 0.85].forEach(t => { const [x, y] = qpt(a, b, c, t); C.dots(ctx, x - 3, y - 3, 6, 6, 3, 'rgba(255,255,255,0.35)', r, 1.4); });
    }
  }

  // 一隻腳：從 (x, y1) 往下到 (x, y2)，腳掌圓圓的
  // far：後面那一排（顏色暗一點，畫在身體後面）
  // 前面那一排畫在身體上面：上面跟身體連在一起（不描上緣，兩側的線從肚子邊開始），腳掌圓圓的
  function leg(ctx, C, r, p, x, y1, y2, w, far) {
    const main = p.pattern === 'points' ? p.mark : mainOf(p);
    const col = far ? mix(main, -0.12) : main;
    const marks = () => {
      if (tabby(p)) [0.45, 0.72].forEach(k => stripe(ctx, C, r, x - w, y1 + (y2 - y1) * k, x + w, y1 + (y2 - y1) * k + 0.5, 1.8, p.mark));
      if (p.pattern === 'calico' && x % 3 < 1) dot(ctx, x, y1 + 3, w, 4, ORANGE);
      if (whiteOf(p) === 'socks') dot(ctx, x, y2 - 1, w, 3.4, WHITE);
    };
    if (far) {
      const fn = (q) => C.rect(ctx, x - w / 2, y1, w, y2 - y1, q, 0.5);
      furShape(ctx, C, r, Math.round(x * 7 + y1), fn, col, null, p, marks);
      return;
    }
    const h = w / 2, yt = y1 + 3.5; // yt：兩側的線從這裡開始往下畫
    const path = (top) => { ctx.beginPath(); ctx.moveTo(x - h - 0.8, top); ctx.quadraticCurveTo(x - h, top + 2, x - h, y2 - 2.6);
      ctx.quadraticCurveTo(x - h, y2, x + 0.4, y2); ctx.quadraticCurveTo(x + h + 0.8, y2, x + h + 0.6, y2 - 2.6); ctx.quadraticCurveTo(x + h, top + 2, x + h + 0.8, top); };
    path(y1); ctx.closePath(); C.fill(ctx, col, r, null, 0.7);
    ctx.save(); path(y1); ctx.closePath(); ctx.clip(); marks(); ctx.restore();
    path(yt); C.stroke(ctx, r, W);
    C.line(ctx, x + 0.6, y2 - 0.5, x + 0.6, y2 - 2.5, r, 0.9, 'rgba(43,42,51,0.55)', 0.2);
  }

  // 頭：(cx, cy) 是頭的中心，s 是大小倍率
  function catHead(ctx, C, r, p, cx, cy, s, closed) {
    const main = mainOf(p), white = whiteOf(p);
    const ears = HAT_HIDES[p.hat] ? 'hidden' : p.ears; // 戴帽子的時候耳朵收在帽子裡
    const earCol = p.pattern === 'points' ? p.mark : main;
    const hrx = 14 * s, hry = 12.4 * s;
    // 立耳：從頭頂兩邊長出來，跟頭連成一片（耳根沒有線），耳尖圓圓的
    const earOf = (k) => (p.pattern === 'calico' ? (k < 0 ? ORANGE : p.mark) : earCol);
    const earPath = (k, d) => { // d：往裡面縮多少（蓋掉頭的輪廓線用）
      ctx.beginPath(); ctx.moveTo(cx + k * (12.9 - d) * s, cy + (-3.6 + d * 0.4) * s);
      ctx.quadraticCurveTo(cx + k * (13.4 - d) * s, cy - (13.5 - d) * s, cx + k * (10.6 - d * 0.3) * s, cy - (17 - d * 1.2) * s);
      ctx.quadraticCurveTo(cx + k * (8.4 + d * 0.2) * s, cy - (16.8 - d * 1.2) * s, cx + k * (2.6 + d) * s, cy - (11.2 - d * 0.3) * s);
    };
    if (ears === 'up') [-1, 1].forEach(k => {
      earPath(k, 0); ctx.lineTo(cx + k * 6 * s, cy - 4 * s); ctx.closePath(); C.fill(ctx, earOf(k), r, null);
      earPath(k, 0); C.stroke(ctx, r, W);
    });
    const hfn = (q) => C.blob(ctx, cx, cy, hrx, hry, q, 0.035, 20);
    furShape(ctx, C, r, 501, hfn, main, [cx - hrx, cy - hry, hrx * 2, hry * 2], p, () => {
      if (tabby(p) || p.pattern === 'spots') {
        // 額頭上的 M 字和直條紋、臉頰兩側的橫條紋
        [-1, 0, 1].forEach(k => stripe(ctx, C, r, cx + k * 3.6 * s, cy - 12.5 * s, cx + k * 2.4 * s, cy - 6 * s, 1.9 * s, p.mark));
        [-1, 1].forEach(k => {
          stripe(ctx, C, r, cx + k * 7.5 * s, cy - 11 * s, cx + k * 5.8 * s, cy - 6.5 * s, 1.6 * s, p.mark);
          stripe(ctx, C, r, cx + k * 14.5 * s, cy - 0.5 * s, cx + k * 9.5 * s, cy - 1 * s, 1.6 * s, p.mark);
          stripe(ctx, C, r, cx + k * 14.5 * s, cy + 3.5 * s, cx + k * 10 * s, cy + 2.4 * s, 1.4 * s, p.mark);
        });
      }
      if (p.pattern === 'calico') {
        C.blob(ctx, cx - 9 * s, cy - 8 * s, 8 * s, 7 * s, r, 0.12, 12); ctx.fillStyle = ORANGE; ctx.fill();
        C.blob(ctx, cx + 10 * s, cy - 7 * s, 7 * s, 6.5 * s, r, 0.12, 12); ctx.fillStyle = p.mark; ctx.fill();
      }
      if (p.pattern === 'points') { C.blob(ctx, cx, cy + 3 * s, 8 * s, 7 * s, r, 0.1, 14); ctx.fillStyle = p.mark; ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1; }
      if (white !== 'none') {
        // 白嘴邊：鼻子以下、兩邊鬍鬚墊，賓士貓再往上一個倒 V
        C.blob(ctx, cx, cy + 5.5 * s, 7.2 * s, 5.2 * s, r, 0.08, 14); ctx.fillStyle = WHITE; ctx.fill();
        if (p.pattern === 'tuxedo') { ctx.beginPath(); ctx.moveTo(cx - 4.5 * s, cy + 3 * s); ctx.lineTo(cx, cy - 6 * s); ctx.lineTo(cx + 4.5 * s, cy + 3 * s); ctx.closePath(); ctx.fill(); }
      }
    });
    if (ears === 'up') [-1, 1].forEach(k => {
      // 把耳根那段頭的輪廓線蓋掉，再畫粉紅色的耳朵裡面
      earPath(k, 1.5); ctx.lineTo(cx + k * 6.5 * s, cy - 7 * s); ctx.closePath(); ctx.fillStyle = earOf(k); ctx.fill();
      if (tabby(p)) stripe(ctx, C, r, cx + k * 7.5 * s, cy - 11 * s, cx + k * 5.8 * s, cy - 6.5 * s, 1.6 * s, p.mark);
      ctx.beginPath(); ctx.moveTo(cx + k * 11.2 * s, cy - 8.4 * s); ctx.quadraticCurveTo(cx + k * 11.4 * s, cy - 12.6 * s, cx + k * 10.2 * s, cy - 14.4 * s);
      ctx.quadraticCurveTo(cx + k * 8.4 * s, cy - 13 * s, cx + k * 6.4 * s, cy - 10.4 * s); ctx.closePath(); ctx.fillStyle = '#eeb4b8'; ctx.fill();
    });
    // 折耳：小小的、往前往下折，像兩片小帽簷貼在頭頂兩邊
    if (ears === 'fold') [-1, 1].forEach(k => {
      const ex = cx + k * 8.6 * s, ey = cy - 9.4 * s;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(k * 0.62); ctx.scale(1.25, 1.25);
      const efn = (q) => C.smooth(ctx, [[-4.4 * s, -0.4 * s], [-2.6 * s, -2.8 * s], [0, -3.4 * s], [2.6 * s, -2.8 * s], [4.4 * s, -0.4 * s], [k * 1.6 * s, 3.1 * s]]
        .map(([a, b]) => [a + (q() - 0.5) * 0.4, b + (q() - 0.5) * 0.4]));
      furShape(ctx, C, r, 77 + k, efn, p.pattern === 'calico' ? (k < 0 ? ORANGE : p.mark) : earCol, null, p, () => {
        if (tabby(p)) stripe(ctx, C, r, 0, -4 * s, k * 0.6 * s, 1 * s, 1.3 * s, p.mark);
      });
      ctx.beginPath(); ctx.moveTo(-3.4 * s, -0.6 * s); ctx.quadraticCurveTo(0, -2 * s, 3.4 * s, -0.6 * s); C.stroke(ctx, r, 1, 'rgba(43,42,51,0.55)'); // 折起來的那條線
      ctx.restore();
    });
    // 眼睛
    const ey = cy + 0.2 * s;
    [-1, 1].forEach(k => {
      const ex = cx + k * 5.6 * s;
      if (closed) { ctx.beginPath(); ctx.moveTo(ex - 2.6 * s, ey); ctx.quadraticCurveTo(ex, ey + 2.4 * s, ex + 2.6 * s, ey); C.stroke(ctx, r, 1.5); return; }
      const col = p.eyes === 'odd' ? (k < 0 ? '#79b3e3' : '#e3b23c') : p.eyes;
      // 圓圓的眼睛：外圈深色眼線、虹膜中間亮一點、直直的瞳孔
      const efn = (q) => C.blob(ctx, ex, ey, 3.4 * s, 3.4 * s, q, 0.03, 16);
      shape(ctx, C, 600 + k, efn); C.fill(ctx, col, r, null);
      clipDo(ctx, C, 600 + k, efn, () => {
        dot(ctx, ex + 0.6 * s, ey + 0.9 * s, 2 * s, 2 * s, 'rgba(255,255,255,0.28)');
        dot(ctx, ex + k * 0.15 * s, ey + 0.2 * s, 1.6 * s, 2.1 * s, '#1d1c24');
        // 淡定：上眼皮稍微壓下來一點
        if (p.face === 'calm') { ctx.fillStyle = mainOf(p); ctx.fillRect(ex - 4 * s, ey - 4 * s, 8 * s, 1.6 * s); }
      });
      shape(ctx, C, 600 + k, efn); C.stroke(ctx, r, 1.7);
      dot(ctx, ex - 1.1 * s, ey - (p.face === 'calm' ? 0.6 : 1.2) * s, 0.85 * s, 0.85 * s, '#ffffff');
    });
    // 腮紅
    [-1, 1].forEach(k => dot(ctx, cx + k * 9.6 * s, cy + 4.2 * s, 2.2 * s, 1.4 * s, p.face === 'calm' ? 'rgba(246,140,150,0.4)' : 'rgba(246,140,150,0.6)'));
    // 鼻子、嘴巴
    const ny = cy + 3.6 * s;
    ctx.beginPath(); ctx.moveTo(cx - 1.9 * s, ny); ctx.lineTo(cx + 1.9 * s, ny); ctx.lineTo(cx, ny + 2.1 * s); ctx.closePath();
    C.fill(ctx, p.nose, r, null); C.stroke(ctx, r, 1.2);
    if (p.face === 'calm') {
      // 淡定的嘴：鼻子下一小段直線，再分成兩邊（像「人」字），不笑
      ctx.beginPath(); ctx.moveTo(cx, ny + 2.1 * s); ctx.lineTo(cx, ny + 3.1 * s);
      ctx.quadraticCurveTo(cx - 0.8 * s, ny + 3.4 * s, cx - 1.9 * s, ny + 4.3 * s);
      ctx.moveTo(cx, ny + 3.1 * s); ctx.quadraticCurveTo(cx + 0.8 * s, ny + 3.4 * s, cx + 1.9 * s, ny + 4.3 * s); C.stroke(ctx, r, 1);
    } else {
      ctx.beginPath(); ctx.moveTo(cx - 2.6 * s, ny + 3.1 * s); ctx.quadraticCurveTo(cx - 1.3 * s, ny + 4.4 * s, cx, ny + 2.4 * s);
      ctx.quadraticCurveTo(cx + 1.3 * s, ny + 4.4 * s, cx + 2.6 * s, ny + 3.1 * s); C.stroke(ctx, r, 1.1);
    }
    // 鬍鬚
    [-1, 1].forEach(k => {
      C.line(ctx, cx + k * 7 * s, ny + 1.6 * s, cx + k * 15.5 * s, ny + 0.2 * s, r, 0.7, 'rgba(43,42,51,0.55)', 0.3);
      C.line(ctx, cx + k * 7 * s, ny + 2.8 * s, cx + k * 15 * s, ny + 3.8 * s, r, 0.7, 'rgba(43,42,51,0.55)', 0.3);
    });
  }

  // 身體上的花紋（側面）：bx, by 是身體中心
  function sideMarks(ctx, C, r, p, bx, by, rx, ry) {
    const m = p.mark;
    if (p.pattern === 'mackerel') {
      for (let x = bx - rx + 4; x < bx + rx - 3; x += 4.6) stripe(ctx, C, r, x + 1.5, by - ry - 1, x - 0.8, by + ry * 0.35, 2.2, m);
    } else if (p.pattern === 'classic') {
      // 身體側邊一大圈漩渦（像靶心），背上一條深色的背線
      C.blob(ctx, bx - rx * 0.12, by + ry * 0.05, rx * 0.42, ry * 0.5, r, 0.08, 14); C.stroke(ctx, r, 2.8, m);
      C.blob(ctx, bx - rx * 0.12, by + ry * 0.05, rx * 0.15, ry * 0.2, r, 0.12, 10); ctx.fillStyle = m; ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - rx, by - ry * 0.75); ctx.quadraticCurveTo(bx, by - ry * 1.3, bx + rx, by - ry * 0.75); C.stroke(ctx, r, 3.4, m);
      [-0.55, 0.45, 0.7].forEach(k => stripe(ctx, C, r, bx + rx * k, by - ry, bx + rx * k - 1, by - ry * 0.1, 2, m));
    } else if (p.pattern === 'spots') {
      [[-0.5, -0.3], [0, -0.5], [0.4, -0.1], [-0.2, 0.2], [0.55, -0.55]].forEach(([a, b]) => dot(ctx, bx + rx * a, by + ry * b, 2.4, 1.9, m));
    } else if (p.pattern === 'calico') {
      C.blob(ctx, bx - rx * 0.4, by - ry * 0.4, rx * 0.4, ry * 0.55, r, 0.15, 12); ctx.fillStyle = ORANGE; ctx.fill();
      C.blob(ctx, bx + rx * 0.35, by - ry * 0.55, rx * 0.32, ry * 0.45, r, 0.15, 12); ctx.fillStyle = m; ctx.fill();
    }
    // 肚子、胸口留白
    const white = whiteOf(p);
    if (white !== 'none' || p.pattern === 'calico') { C.blob(ctx, bx, by + ry * 0.95, rx * 0.8, ry * 0.42, r, 0.1, 14); ctx.fillStyle = WHITE; ctx.fill(); }
  }

  // 坐著的時候的四隻腳：後腳掌從身體兩邊露出一點，兩隻前腳從胸口長下來
  function sitPaws(ctx, C, r, p, bx, rx) {
    // 後腳掌從身體兩邊露出一點
    const legCol = p.pattern === 'points' ? p.mark : mainOf(p), pawCol = whiteOf(p) === 'socks' ? WHITE : legCol;
    [-1, 1].forEach(k => {
      const hfn2 = (q) => C.blob(ctx, bx + k * rx * 0.78, 51.6, 4.6, 2.5, q, 0.06, 10);
      furShape(ctx, C, r, 310 + k, hfn2, pawCol, null, p, null);
    });
    // 兩隻前腳：從胸口長下來，上面跟身體連在一起（只描兩側和腳掌），不是兩根分開的棍子
    [-1, 1].forEach(k => {
      const x = bx + k * 3.5, w = 7, y1 = 46, y2 = 53.2, xo = x + k * w / 2, xi = x - k * w / 2;
      const fillPath = () => { ctx.beginPath(); ctx.moveTo(xo + k * 0.8, y1 - 2); ctx.lineTo(xo + k * 0.3, y2 - 3);
        ctx.quadraticCurveTo(xo + k * 0.6, y2, x, y2); ctx.quadraticCurveTo(xi - k * 0.2, y2, xi, y2 - 3); ctx.lineTo(xi, y1 - 2); ctx.closePath(); };
      fillPath(); C.fill(ctx, legCol, r, null, 0.7);
      ctx.save(); fillPath(); ctx.clip();
      if (tabby(p)) [46.2, 49].forEach(y => stripe(ctx, C, r, x - w, y, x + w, y + 0.5, 1.8, p.mark));
      if (whiteOf(p) === 'socks') dot(ctx, x, y2 - 1, w, 3.6, WHITE);
      ctx.restore();
      // 外側：從肩膀順著身體下來；腳掌圓圓的；內側只畫下半段（兩腳中間一條短短的線）
      ctx.beginPath(); ctx.moveTo(xo + k * 2.2, 40.5); ctx.quadraticCurveTo(xo + k * 0.9, 45, xo + k * 0.3, y2 - 3);
      ctx.quadraticCurveTo(xo + k * 0.6, y2, x, y2); ctx.quadraticCurveTo(xi - k * 0.2, y2, xi, y2 - 3); ctx.lineTo(xi, y1 + 1.5);
      C.stroke(ctx, r, W);
      [-1.4, 1.4].forEach(d => C.line(ctx, x + d, y2 - 0.6, x + d, y2 - 2.6, r, 0.9, 'rgba(43,42,51,0.55)', 0.2));
    });
  }

  // ---------------- 狗狗 ----------------
  // 捲毛的輪廓：一朵一朵的小毛球繞一圈
  function curl(ctx, cx, cy, rx, ry, q, n, puff) {
    // 每一朵大小不一樣（有寬有窄、有的鼓一點），看起來才毛茸茸的，不會像齒輪
    const at = (a, k) => [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
    const ws = []; let sum = 0;
    for (let i = 0; i < n; i++) { const w = 0.75 + q() * 0.55; ws.push(w); sum += w; }
    let a = -Math.PI / 2 - ws[0] / sum * Math.PI;
    const s0 = at(a, 1);
    ctx.beginPath(); ctx.moveTo(s0[0], s0[1]);
    for (let i = 0; i < n; i++) {
      const da = ws[i] / sum * Math.PI * 2, k = 1 + puff * (0.6 + ws[i] * 0.45) + (q() - 0.5) * 0.04;
      const c1 = at(a + da * 0.22, k), c2 = at(a + da * 0.78, k), e = at(a + da, 1);
      ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], e[0], e[1]);
      a += da;
    }
    ctx.closePath();
  }
  const curly = (p) => p.pattern !== 'short';
  // 毛上面一小撮一小撮的捲捲
  function curls(ctx, C, r, pts, color, s) {
    pts.forEach(([x, y], i) => { ctx.beginPath(); ctx.arc(x, y, 1.7 * (s || 1), Math.PI * (0.2 + (i % 3) * 0.3), Math.PI * (1.3 + (i % 3) * 0.3)); C.stroke(ctx, r, 1, color); });
  }
  // 狗狗的頭：頭頂一大球蓬蓬的毛（比臉還大），圓圓的黑眼睛、腮紅、小小的鼻子，兩邊垂著捲捲的耳朵
  // 毛上面一圈一圈的小捲捲（像寫一個 6）
  function swirls(ctx, C, r, pts, color, s) {
    pts.forEach(([x, y, flip], i) => {
      const k = flip ? -1 : 1, q = 1.7 * (s || 1);
      ctx.beginPath(); ctx.moveTo(x - k * q * 1.5, y + q * 0.5);
      ctx.bezierCurveTo(x - k * q * 1.4, y - q * 1.5, x + k * q * 1.4, y - q * 1.3, x + k * q * 1.1, y + q * 0.2);
      ctx.bezierCurveTo(x + k * q * 0.9, y + q * 1.1, x - k * q * 0.5, y + q * 0.9, x - k * q * 0.2, y + q * 0.1);
      C.stroke(ctx, r, 0.9, color);
    });
  }
  // 狗狗的頭：圓圓的臉，頭頂戴著一頂捲捲的毛（邊緣一朵一朵的），兩邊是捲毛的垂耳，小黑眼睛、腮紅、小鼻子
  // side：側身的時候，靠身體那一邊的耳朵垂在臉的前面，蓋住一點臉頰
  function dogHead(ctx, C, r, p, cx, cy, s, closed, side) {
    const cur = curly(p), hrx = 12.4 * s, hry = 11.1 * s, hy = cy + 1.4 * s;
    const hidden = HAT_HIDES[p.hat], noTop = hidden || !cur;
    // 小立耳：頭頂兩邊的小三角，耳尖圓圓的
    if (p.ears === 'perk' && !hidden) [-1, 1].forEach(k => {
      const path = () => { ctx.beginPath(); ctx.moveTo(cx + k * 12.6 * s, cy - 2.6 * s); ctx.quadraticCurveTo(cx + k * 14.8 * s, cy - 13 * s, cx + k * 12 * s, cy - 17.6 * s);
        ctx.quadraticCurveTo(cx + k * 6.6 * s, cy - 15 * s, cx + k * 2.6 * s, cy - 8.4 * s); ctx.closePath(); };
      path(); C.fill(ctx, p.earc, r, null); path(); C.stroke(ctx, r, W);
      // 耳朵裡面淺一點
      ctx.beginPath(); ctx.moveTo(cx + k * 11.2 * s, cy - 8 * s); ctx.quadraticCurveTo(cx + k * 12.6 * s, cy - 12.4 * s, cx + k * 11.4 * s, cy - 14.6 * s);
      ctx.quadraticCurveTo(cx + k * 8.4 * s, cy - 12.6 * s, cx + k * 6.8 * s, cy - 9.4 * s); ctx.closePath(); ctx.fillStyle = mix(p.earc, 0.4); ctx.fill();
    });
    // 垂耳：在臉的後面，從頭的兩側垂到下巴
    // 耳根藏在頭毛底下，由內往外斜斜垂下來，越往下越寬，下緣是幾朵大大的捲毛
    const ear = (k, front) => {
      const ox = cx + k * (front ? 12 : 10.4) * s, oy = cy - (front ? 3 : 4.6) * s;
      const P = (u, v) => [ox + k * u * s, oy + v * s];
      const efn = (q) => {
        const j = () => (q() - 0.5) * 0.5;
        if (!cur) { C.smooth(ctx, [[0, -1], [4, 0.6], [7, 4.6], [8, 9.4], [5.6, 13.4], [2, 13.6], [0, 9], [-0.6, 3]].map(([u, v]) => { const pt = P(u, v); return [pt[0] + j(), pt[1] + j()]; })); return; }
        const an = [[0.2, -1.2], [4.8, 0.6], [8, 4.4], [9, 9.4], [7, 13.6], [3, 15.2], [0, 13]], mc = [3.4, 7.4];
        const puff = [0.16, 0.3, 0.34, 0.38, 0.4, 0.36];
        let s0 = P(an[0][0], an[0][1]); ctx.beginPath(); ctx.moveTo(s0[0], s0[1]);
        for (let i = 0; i < an.length - 1; i++) {
          const A = an[i], B = an[i + 1], g = puff[i] + (q() - 0.5) * 0.06;
          const c = (w) => { const u = A[0] + (B[0] - A[0]) * w, v = A[1] + (B[1] - A[1]) * w; return P(u + (u - mc[0]) * g, v + (v - mc[1]) * g); };
          const c1 = c(0.2), c2 = c(0.8), e = P(B[0], B[1]);
          ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], e[0], e[1]);
        }
        const m = P(-0.8, 5); ctx.quadraticCurveTo(m[0], m[1], s0[0], s0[1]); ctx.closePath();
      };
      const sw = [P(5.2, 4.6), P(5, 10)];
      furShape(ctx, C, r, 520 + k, efn, p.earc, null, p, cur ? () => swirls(ctx, C, r, [[sw[0][0], sw[0][1], k > 0], [sw[1][0], sw[1][1], k < 0]], mix(p.earc, -0.24), s * 0.85) : null);
    };
    if (p.ears !== 'perk') [-1, 1].forEach(k => { if (!(side && k < 0)) ear(k, false); });
    const hpts = (q) => [[0, -1], [0.62, -0.86], [0.96, -0.3], [1.03, 0.3], [0.8, 0.82], [0.3, 1.02], [-0.3, 1.02], [-0.8, 0.82], [-1.03, 0.3], [-0.96, -0.3], [-0.62, -0.86]]
      .map(([a, b]) => [cx + a * hrx + (q() - 0.5) * 0.5, hy + b * hry + (q() - 0.5) * 0.5]);
    const hfn = (q) => C.smooth(ctx, hpts(q));
    const hfnAdd = () => { // 同一個臉的形狀，接在目前的路徑後面（挖洞用）
      const pts = hpts(C.rng(511)), n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      let m = mid(pts[n - 1], pts[0]); ctx.moveTo(m[0], m[1]);
      for (let i = 0; i < n; i++) { m = mid(pts[i], pts[(i + 1) % n]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
      ctx.closePath();
    };
    const ax = cx, ay = cy - 8 * s;
    // 只有捲毛的頭頂有一球毛；短毛的頭頂是平整的，跟臉同一個顏色
    const afn = (q) => curl(ctx, ax, ay, 11.6 * s, 6.8 * s, q, 11, 0.24);
    // 頭毛的輪廓先畫在臉的後面：這樣只有露在臉外面的那一圈有黑線
    if (!noTop) furShape(ctx, C, r, 505, afn, p.mark, null, p, null);
    furShape(ctx, C, r, 511, hfn, p.fur, [cx - hrx, hy - hry, hrx * 2, hry * 2], p, () => {
      // 白毛花紋（剪在臉的形狀裡）
      if (p.white === 'muzzle') {
        C.blob(ctx, cx, cy + 9 * s, 10.4 * s, 6.6 * s, C.rng(541), 0.04, 16); ctx.fillStyle = WHITE; ctx.fill();
        [-1, 1].forEach(k => dot(ctx, cx + k * 5.3 * s, cy - 2.4 * s, 1.7 * s, 1.15 * s, WHITE));
      } else if (p.white === 'socks') {
        [-1, 1].forEach(k => { C.blob(ctx, cx + k * 6 * s, cy + 1.6 * s, 6.4 * s, 6.8 * s, C.rng(542 + k), 0.04, 14); ctx.fillStyle = WHITE; ctx.fill(); });
        C.blob(ctx, cx, cy + 8.6 * s, 11 * s, 6.6 * s, C.rng(541), 0.04, 16); ctx.fillStyle = WHITE; ctx.fill();
        // 額頭的深色往下一個尖
        ctx.beginPath(); ctx.moveTo(cx - 4.2 * s, cy - 11 * s); ctx.quadraticCurveTo(cx - 1.4 * s, cy - 3 * s, cx, cy + 0.6 * s);
        ctx.quadraticCurveTo(cx + 1.4 * s, cy - 3 * s, cx + 4.2 * s, cy - 11 * s); ctx.closePath(); ctx.fillStyle = p.fur; ctx.fill();
      }
    });
    // 腮紅
    [-1, 1].forEach(k => dot(ctx, cx + k * 8.1 * s, cy + 5.4 * s, 2.3 * s, 1.6 * s, 'rgba(246,140,150,0.8)'));
    if (side && p.ears !== 'perk') ear(-1, true);
    // 頭頂的毛蓋到額頭上：只上色不描邊，跟臉的交界就沒有黑線（像一頂軟軟的捲毛帽）
    if (!noTop) {
      shape(ctx, C, 505, afn); ctx.fillStyle = p.mark; ctx.fill();
      if (cur) swirls(ctx, C, r, [[ax - 6 * s, ay - 0.6 * s, false], [ax + 0.4 * s, ay - 2.8 * s, true], [ax + 6.4 * s, ay + 0.2 * s, false], [ax - 0.6 * s, ay + 2.8 * s, true]], mix(p.mark, -0.22), s);
      // 交界那一圈用深一點的毛色輕輕帶過，看得出一朵一朵的邊
      clipDo(ctx, C, 511, hfn, () => { shape(ctx, C, 505, afn); C.stroke(ctx, r, 0.9, mix(p.mark, -0.2)); });
      // 露在臉外面的那一圈黑線補回來（剛剛被上色蓋掉內側一半）
      ctx.save(); ctx.beginPath(); ctx.rect(cx - 30 * s, cy - 40 * s, 60 * s, 60 * s); hfnAdd(); ctx.clip('evenodd');
      shape(ctx, C, 505, afn); C.stroke(ctx, r, W); ctx.restore();
    }
    // 眼睛：小小圓圓全黑、有一點亮光；瞇眼笑是兩道彎彎的線
    const ey = cy + 1.8 * s;
    [-1, 1].forEach(k => {
      const ex = cx + k * 5.5 * s;
      if (closed) { ctx.beginPath(); ctx.moveTo(ex - 2.2 * s, ey); ctx.quadraticCurveTo(ex, ey + 2 * s, ex + 2.2 * s, ey); C.stroke(ctx, r, 1.3); return; }
      if (p.face === 'squint') { ctx.beginPath(); ctx.moveTo(ex - 2.3 * s, ey + 0.8 * s); ctx.quadraticCurveTo(ex, ey - 2.2 * s, ex + 2.3 * s, ey + 0.8 * s); C.stroke(ctx, r, 1.5); return; }
      const col = p.eyes === 'odd' ? (k < 0 ? '#79b3e3' : '#8a5a34') : p.eyes;
      const n = parseInt(col.slice(1), 16), light = ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) > 95;
      if (light) { // 淺色的眼睛：外面一圈深色，中間一顆瞳孔
        dot(ctx, ex, ey, 2.25 * s, 2.35 * s, C.INK); dot(ctx, ex, ey, 1.65 * s, 1.75 * s, col); dot(ctx, ex, ey + 0.1 * s, 0.85 * s, 0.95 * s, C.INK);
      } else dot(ctx, ex, ey, 1.9 * s, 2 * s, col);
      dot(ctx, ex + 0.5 * s, ey - 0.7 * s, 0.7 * s, 0.7 * s, '#ffffff');
    });
    // 鼻子：小小的倒三角，圓圓的；嘴巴 ω，吐舌頭的時候多一片小舌頭
    const ny = cy + 4.4 * s, my = ny + 2.5 * s;
    if (p.face === 'tongue' && !closed) {
      const tw = 1.5 * s;
      ctx.beginPath(); ctx.moveTo(cx - tw, my); ctx.lineTo(cx - tw, my + 1.5 * s); ctx.quadraticCurveTo(cx, my + 3.8 * s, cx + tw, my + 1.5 * s); ctx.lineTo(cx + tw, my); ctx.closePath();
      ctx.fillStyle = '#f58c9d'; ctx.fill(); C.stroke(ctx, r, 0.9);
    }
    ctx.beginPath(); ctx.moveTo(cx, ny + 1.2 * s); ctx.lineTo(cx, my - 0.2 * s);
    ctx.moveTo(cx - 2.8 * s, my - 0.7 * s); ctx.quadraticCurveTo(cx - 1.4 * s, my + 1.1 * s, cx, my - 0.2 * s);
    ctx.quadraticCurveTo(cx + 1.4 * s, my + 1.1 * s, cx + 2.8 * s, my - 0.7 * s); C.stroke(ctx, r, 1.1);
    const npath = () => { ctx.beginPath(); ctx.moveTo(cx - 1.9 * s, ny - 0.9 * s); ctx.quadraticCurveTo(cx, ny - 1.5 * s, cx + 1.9 * s, ny - 0.9 * s);
      ctx.quadraticCurveTo(cx + 1.9 * s, ny + 0.5 * s, cx, ny + 1.4 * s); ctx.quadraticCurveTo(cx - 1.9 * s, ny + 0.5 * s, cx - 1.9 * s, ny - 0.9 * s); ctx.closePath(); };
    npath(); ctx.fillStyle = p.nose; ctx.fill(); npath(); C.stroke(ctx, r, 0.9);
  }
  // 尾巴：一朵一朵的蓬蓬尾（a 是屁股、c 是尾巴尖），或細細的長尾巴
  function dogTail(ctx, C, r, p, a, b, c) {
    if (p.tail === 'long' || p.tail === 'fluffy') { tail(ctx, C, r, p, a, b, c); return; }
    if (p.tail === 'curl') { // 捲尾巴：捲成一圈貼在屁股上面
      const up = c[1] < a[1] - 8, x = up ? a[0] - 0.5 : a[0] + 3.2, y = up ? a[1] - 7.4 : a[1] - 4.6, rr = up ? 5.6 : 4.8, k = up ? 1 : -1;
      const fn = (q) => C.blob(ctx, x, y, rr, rr, q, 0.04, 14);
      furShape(ctx, C, r, 531, fn, p.fur, null, p, p.white !== 'none' ? () => dot(ctx, x - k * 2.6, y + 1.4, rr * 0.62, rr * 0.8, WHITE) : null);
      ctx.beginPath(); ctx.arc(x + k * 0.4, y + 0.4, rr * 0.5, Math.PI * (k > 0 ? 0.15 : 0.85), Math.PI * (k > 0 ? 1.55 : -0.55), k < 0); C.stroke(ctx, r, 1.1);
      return;
    }
    const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], ang = Math.atan2(c[1] - a[1], c[0] - a[0]) - Math.PI / 2, len = Math.hypot(c[0] - a[0], c[1] - a[1]) / 2;
    ctx.save(); ctx.translate(m[0], m[1]); ctx.rotate(ang);
    const fn = (q) => (curly(p) ? curl(ctx, 0, 0, 3.4, len, q, 7, 0.24) : C.blob(ctx, 0, 0, 3.2, len, q, 0.05, 12));
    furShape(ctx, C, r, 530, fn, p.fur, null, p, null);
    ctx.restore();
  }
  const shadow = (ctx, x, w) => { ctx.fillStyle = 'rgba(19,26,40,0.18)'; ctx.beginPath(); ctx.ellipse(x, 52.5, w, 3.4, 0, 0, Math.PI * 2); ctx.fill(); };
  // 腳趾的小線
  const toes = (ctx, C, r, x, y) => [-1.3, 1.3].forEach(d => C.line(ctx, x + d, y - 0.5, x + d, y - 2.3, r, 0.8, 'rgba(43,42,51,0.6)', 0.2));
  // 脖子上一圈一朵一朵的毛（頭和身體接起來的地方）
  function ruff(ctx, C, r, p, x1, x2, y) {
    if (!curly(p)) return;
    const n = 4, w = (x2 - x1) / n;
    ctx.beginPath(); ctx.moveTo(x1, y);
    for (let i = 0; i < n; i++) ctx.quadraticCurveTo(x1 + w * (i + 0.5), y + 2.6, x1 + w * (i + 1), y);
    C.stroke(ctx, r, 1, mix(p.fur, -0.38));
  }
  const DOG_POSES = {
    // 側身站著：身體圓滑，四隻腳短短的，蓬蓬尾往上翹
    stand(ctx, C, r, p, step) {
      shadow(ctx, 30, 18.5);
      dogTail(ctx, C, r, p, [15.5, 37], step ? [9, 34] : [10, 34], step ? [10.5, 23] : [12.5, 22.5]);
      const far = mix(p.fur, -0.14);
      [[step ? 20 : 23.5], [step ? 40 : 37]].forEach(([x]) => {
        const fn = (q) => C.rect(ctx, x - 2.8, 41, 5.6, 10.4, q, 0.5);
        shape(ctx, C, 331 + Math.round(x), fn); ctx.fillStyle = far; ctx.fill(); shape(ctx, C, 331 + Math.round(x), fn); C.stroke(ctx, r, W);
      });
      const bx = 28.5, by = 39.5, rx = 13.6, ry = 8.4;
      const bfn = (q) => C.blob(ctx, bx, by, rx, ry, q, 0.035, 18);
      furShape(ctx, C, r, 321, bfn, p.fur, [bx - rx, by - ry, rx * 2, ry * 2], p, p.white !== 'none' ? () => {
        // 白肚子和白胸口
        C.blob(ctx, bx + 2, by + 8.6, rx + 2, 5.6, C.rng(551), 0.04, 16); ctx.fillStyle = WHITE; ctx.fill();
        C.blob(ctx, bx + rx - 1, by + 1, 5.4, 7.6, C.rng(552), 0.04, 14); ctx.fillStyle = WHITE; ctx.fill();
      } : null);
      leg(ctx, C, r, p, step ? 23.5 : 20, 42.5, 52.8, 6.2); leg(ctx, C, r, p, step ? 31 : 34.5, 42.5, 52.8, 6.2);
      head(ctx, C, r, p, 41.5, step ? 25.2 : 24.5, 0.98, false);
    },
    walk(ctx, C, r, p) { DOG_POSES.stand(ctx, C, r, p, true); },
    // 正面坐著：身體像一顆圓圓的鈴鐺，前腳直直的，尾巴從旁邊露出來
    sit(ctx, C, r, p) {
      shadow(ctx, 33, 17);
      dogTail(ctx, C, r, p, [42, 49.5], [50, 48], [50.5, 39.5]);
      const bx = 32, by = 41, rx = 12, ry = 11;
      const bfn = (q) => C.smooth(ctx, [[bx - rx * 0.62, by - ry], [bx + rx * 0.62, by - ry], [bx + rx, by + ry * 0.25], [bx + rx * 1.04, by + ry * 0.92], [bx, by + ry * 1.06], [bx - rx * 1.04, by + ry * 0.92], [bx - rx, by + ry * 0.25]]
        .map(([a, b]) => [a + (q() - 0.5) * 0.7, b + (q() - 0.5) * 0.7]));
      furShape(ctx, C, r, 322, bfn, p.fur, [bx - rx, by - ry, rx * 2, ry * 2], p, p.white !== 'none' ? () => {
        C.blob(ctx, bx, by + 1.6, rx * 0.62, ry * 1.05, C.rng(553), 0.04, 16); ctx.fillStyle = WHITE; ctx.fill(); // 白胸口到肚子
      } : null);
      sitPaws(ctx, C, r, p, bx, rx);
      ruff(ctx, C, r, p, bx - 7.6, bx + 7.6, 34.4);
      head(ctx, C, r, p, 32, 22.8, 1.04, false);
    },
    // 捲成一團睡覺
    sleep(ctx, C, r, p) {
      shadow(ctx, 31, 22);
      if (p.tail === 'long' || p.tail === 'fluffy') tail(ctx, C, r, p, [10, 46], [16, 57], [40, 53]);
      const bx = 28, by = 43.5, rx = 18.5, ry = 9;
      const bfn = (q) => C.blob(ctx, bx, by, rx, ry, q, 0.035, 20);
      furShape(ctx, C, r, 323, bfn, p.fur, [bx - rx, by - ry, rx * 2, ry * 2], p, p.white !== 'none' ? () => {
        C.blob(ctx, bx + 6, by + 8, rx * 0.8, 4.6, C.rng(554), 0.04, 16); ctx.fillStyle = WHITE; ctx.fill();
      } : null);
      // 縮起來的後腳：身體上一道彎彎的線，和一隻小腳掌
      ctx.beginPath(); ctx.moveTo(15, 46); ctx.quadraticCurveTo(22, 41.5, 29, 47.5); C.stroke(ctx, r, 1.2);
      const pfn = (q) => C.blob(ctx, 31, 49.6, 4.2, 2.7, q, 0.08, 10);
      furShape(ctx, C, r, 324, pfn, p.fur, null, p, null); toes(ctx, C, r, 31, 51.8);
      ctx.save(); ctx.translate(45, 41.5); ctx.rotate(0.2); head(ctx, C, r, p, 0, 0, 0.84, true); ctx.restore();
    },
  };

  // ---------------- 小馬 ----------------
  // 頭：比貓狗長一點的圓臉，下面一大塊淺色的嘴邊和兩個鼻孔，頭頂兩隻小尖耳，額頭一撮瀏海，鬃毛垂在頭的左邊
  function horseHead(ctx, C, r, p, cx, cy, s, closed) {
    const hrx = 10.8 * s, hry = 12 * s, hy = cy + 0.6 * s, hidden = HAT_HIDES[p.hat], flow = p.pattern !== 'short';
    // 鬃毛：在頭的後面，長的垂到下巴，短的只到耳朵下面
    const mfn = (q) => (flow ? curl(ctx, cx - 9.6 * s, cy + 2.4 * s, 4.6 * s, 10 * s, q, 7, 0.2) : curl(ctx, cx - 9 * s, cy - 3.4 * s, 3.6 * s, 5.4 * s, q, 5, 0.2));
    furShape(ctx, C, r, 701, mfn, p.mark, null, p, null);
    if (!hidden) [-1, 1].forEach(k => {
      const path = () => { ctx.beginPath(); ctx.moveTo(cx + k * 9.6 * s, cy - 6 * s); ctx.quadraticCurveTo(cx + k * 11.4 * s, cy - 13.6 * s, cx + k * 8.6 * s, cy - 17 * s);
        ctx.quadraticCurveTo(cx + k * 4.6 * s, cy - 14.4 * s, cx + k * 3.6 * s, cy - 9.6 * s); ctx.closePath(); };
      path(); C.fill(ctx, p.fur, r, null); path(); C.stroke(ctx, r, W);
      ctx.beginPath(); ctx.moveTo(cx + k * 8.6 * s, cy - 9.6 * s); ctx.quadraticCurveTo(cx + k * 9.6 * s, cy - 13 * s, cx + k * 8.4 * s, cy - 14.8 * s);
      ctx.quadraticCurveTo(cx + k * 6.4 * s, cy - 13 * s, cx + k * 5.8 * s, cy - 10.4 * s); ctx.closePath(); ctx.fillStyle = mix(p.fur, 0.4); ctx.fill();
    });
    const hfn = (q) => C.smooth(ctx, [[0, -1], [0.66, -0.84], [0.98, -0.28], [1, 0.34], [0.84, 0.84], [0.34, 1.02], [-0.34, 1.02], [-0.84, 0.84], [-1, 0.34], [-0.98, -0.28], [-0.66, -0.84]]
      .map(([a, b]) => [cx + a * hrx + (q() - 0.5) * 0.5, hy + b * hry + (q() - 0.5) * 0.5]));
    furShape(ctx, C, r, 711, hfn, p.fur, [cx - hrx, hy - hry, hrx * 2, hry * 2], p, () => {
      // 白鼻梁：額頭往下一條白的，接到嘴邊
      if (p.white !== 'none') { C.blob(ctx, cx, cy - 2 * s, 2.5 * s, 10.5 * s, C.rng(712), 0.05, 14); ctx.fillStyle = WHITE; ctx.fill(); }
      // 嘴邊：下面一大塊淺色
      C.blob(ctx, cx, cy + 10 * s, 10.6 * s, 6 * s, C.rng(713), 0.04, 16); ctx.fillStyle = p.nose; ctx.fill();
    });
    [-1, 1].forEach(k => dot(ctx, cx + k * 8.3 * s, cy + 3 * s, 2.1 * s, 1.4 * s, 'rgba(246,140,150,0.75)'));
    // 瀏海：額頭上一撮往旁邊撥的毛
    if (!hidden) {
      const ffn = () => { ctx.beginPath(); ctx.moveTo(cx - 5.4 * s, cy - 9.6 * s); ctx.quadraticCurveTo(cx - 3 * s, cy - 14.6 * s, cx + 2 * s, cy - 13.6 * s);
        ctx.quadraticCurveTo(cx + 6 * s, cy - 12.4 * s, cx + 6.2 * s, cy - 8.8 * s); ctx.quadraticCurveTo(cx + 3.6 * s, cy - 9.6 * s, cx + 2.6 * s, cy - 4.4 * s);
        ctx.quadraticCurveTo(cx + 0.4 * s, cy - 7.4 * s, cx - 1.4 * s, cy - 5.6 * s); ctx.quadraticCurveTo(cx - 2.6 * s, cy - 8.4 * s, cx - 5.4 * s, cy - 9.6 * s); ctx.closePath(); };
      ffn(); C.fill(ctx, p.mark, r, null); ffn(); C.stroke(ctx, r, W);
    }
    // 眼睛
    const ey = cy + 0.4 * s;
    [-1, 1].forEach(k => {
      const ex = cx + k * 5.6 * s;
      if (closed) { ctx.beginPath(); ctx.moveTo(ex - 2.2 * s, ey); ctx.quadraticCurveTo(ex, ey + 2 * s, ex + 2.2 * s, ey); C.stroke(ctx, r, 1.3); return; }
      if (p.face === 'squint') { ctx.beginPath(); ctx.moveTo(ex - 2.3 * s, ey + 0.8 * s); ctx.quadraticCurveTo(ex, ey - 2.2 * s, ex + 2.3 * s, ey + 0.8 * s); C.stroke(ctx, r, 1.5); return; }
      const col = p.eyes === 'odd' ? (k < 0 ? '#79b3e3' : '#8a5a34') : p.eyes;
      const n = parseInt(col.slice(1), 16), light = ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) > 95;
      if (light) { dot(ctx, ex, ey, 2.25 * s, 2.45 * s, C.INK); dot(ctx, ex, ey, 1.65 * s, 1.85 * s, col); dot(ctx, ex, ey + 0.1 * s, 0.85 * s, 0.95 * s, C.INK); }
      else dot(ctx, ex, ey, 1.9 * s, 2.1 * s, col);
      dot(ctx, ex + 0.5 * s, ey - 0.7 * s, 0.7 * s, 0.7 * s, '#ffffff');
      if (p.face === 'calm') { ctx.beginPath(); ctx.moveTo(ex - 2.6 * s, ey - 1.5 * s); ctx.lineTo(ex + 2.6 * s, ey - 1.5 * s); C.stroke(ctx, r, 1.2); }
    });
    // 鼻孔和嘴巴
    const dark = mix(p.nose, -0.55);
    [-1, 1].forEach(k => dot(ctx, cx + k * 2.7 * s, cy + 8 * s, 0.95 * s, 1.25 * s, dark));
    ctx.beginPath();
    if (p.face === 'calm') { ctx.moveTo(cx - 2.2 * s, cy + 10.8 * s); ctx.lineTo(cx + 2.2 * s, cy + 10.8 * s); }
    else { ctx.moveTo(cx - 3 * s, cy + 10.2 * s); ctx.quadraticCurveTo(cx, cy + 12.2 * s, cx + 3 * s, cy + 10.2 * s); }
    C.stroke(ctx, r, 1.1);
  }
  // 馬尾巴：一束長長的毛，鬃毛的顏色
  function horseTail(ctx, C, r, p, a, b, c) {
    if (p.tail === 'short') { const m = qpt(a, b, c, 0.5); c = m; b = [(a[0] + m[0]) / 2 + (b[0] - a[0]) * 0.25, (a[1] + m[1]) / 2 + (b[1] - a[1]) * 0.25]; }
    const path = () => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]); };
    path(); C.stroke(ctx, r, 6.4 + W * 2, C.INK);
    ctx.save(); path(); ctx.lineCap = 'round'; ctx.lineWidth = 6.4; ctx.strokeStyle = p.mark; ctx.stroke(); ctx.restore();
    const m1 = qpt(a, b, c, 0.45), m2 = qpt(a, b, c, 0.95);
    C.line(ctx, m1[0], m1[1], m2[0], m2[1], r, 0.9, mix(p.mark, -0.3), 0.3);
  }
  // 蹄：腳底一小段深色
  function hoof(ctx, C, r, p, x, y, w) {
    const fn = (q) => C.rect(ctx, x - w / 2, y - 2.7, w, 2.9, q, 0.3);
    shape(ctx, C, 760 + Math.round(x), fn); ctx.fillStyle = mix(p.fur, -0.62); ctx.fill(); shape(ctx, C, 760 + Math.round(x), fn); C.stroke(ctx, r, 1.1);
  }
  const HORSE_POSES = {
    stand(ctx, C, r, p, step) {
      shadow(ctx, 30, 18.5);
      horseTail(ctx, C, r, p, [15.5, 34], step ? [6, 36] : [7.5, 35], step ? [8.5, 48.5] : [10.5, 49]);
      const far = mix(p.fur, -0.14);
      [[step ? 20 : 23.5], [step ? 40 : 37]].forEach(([x]) => {
        const fn = (q) => C.rect(ctx, x - 2.7, 40, 5.4, 12, q, 0.5);
        shape(ctx, C, 731 + Math.round(x), fn); ctx.fillStyle = far; ctx.fill(); shape(ctx, C, 731 + Math.round(x), fn); C.stroke(ctx, r, W);
        hoof(ctx, C, r, p, x, 52.3, 5.4);
      });
      const bx = 28.5, by = 38, rx = 13.6, ry = 8;
      const bfn = (q) => C.blob(ctx, bx, by, rx, ry, q, 0.035, 18);
      furShape(ctx, C, r, 721, bfn, p.fur, [bx - rx, by - ry, rx * 2, ry * 2], p, null);
      [step ? 23.5 : 20, step ? 31 : 34.5].forEach(x => { leg(ctx, C, r, p, x, 41, 52.8, 6); hoof(ctx, C, r, p, x, 53, 6); });
      head(ctx, C, r, p, 41.5, step ? 23.2 : 22.5, 0.94, false);
    },
    walk(ctx, C, r, p) { HORSE_POSES.stand(ctx, C, r, p, true); },
    sit(ctx, C, r, p) {
      shadow(ctx, 33, 17);
      horseTail(ctx, C, r, p, [41, 46], [51, 44], [52, 51]);
      const bx = 32, by = 41, rx = 12, ry = 11;
      const bfn = (q) => C.smooth(ctx, [[bx - rx * 0.62, by - ry], [bx + rx * 0.62, by - ry], [bx + rx, by + ry * 0.25], [bx + rx * 1.04, by + ry * 0.92], [bx, by + ry * 1.06], [bx - rx * 1.04, by + ry * 0.92], [bx - rx, by + ry * 0.25]]
        .map(([a, b]) => [a + (q() - 0.5) * 0.7, b + (q() - 0.5) * 0.7]));
      furShape(ctx, C, r, 722, bfn, p.fur, [bx - rx, by - ry, rx * 2, ry * 2], p, null);
      sitPaws(ctx, C, r, p, bx, rx);
      [-1, 1].forEach(k => hoof(ctx, C, r, p, bx + k * 3.5, 53.3, 6.6));
      head(ctx, C, r, p, 32, 21.6, 1, false);
    },
    sleep(ctx, C, r, p) {
      shadow(ctx, 31, 22);
      horseTail(ctx, C, r, p, [11, 44], [4, 50], [16, 53.5]);
      const bx = 28, by = 43.5, rx = 18.5, ry = 9;
      const bfn = (q) => C.blob(ctx, bx, by, rx, ry, q, 0.035, 20);
      furShape(ctx, C, r, 723, bfn, p.fur, [bx - rx, by - ry, rx * 2, ry * 2], p, null);
      ctx.beginPath(); ctx.moveTo(15, 46); ctx.quadraticCurveTo(22, 41.5, 29, 47.5); C.stroke(ctx, r, 1.2);
      const pfn = (q) => C.blob(ctx, 31, 49.6, 4.2, 2.7, q, 0.08, 10);
      furShape(ctx, C, r, 724, pfn, mix(p.fur, -0.62), null, p, null);
      ctx.save(); ctx.translate(45, 40.5); ctx.rotate(0.2); head(ctx, C, r, p, 0, 0, 0.8, true); ctx.restore();
    },
  };

  // ---------------- 頭套（貓狗共用，畫在頭上面） ----------------
  // 整頂罩住的帽子會把立著的耳朵收進去；荷包蛋只是放在頭頂，耳朵照樣露出來
  const HAT_HIDES = { frog: 1, bear: 1, bunny: 1, berry: 1, duck: 1 };
  function hat(ctx, C, r, p, cx, cy, s) {
    const k = p.hat;
    if (!k || k === 'none') return;
    const hw = (p.kind === 'dog' ? 15.4 : 14.9) * s, by = cy - 4.2 * s;
    // 帽子本體：罩住頭頂的半圓，帽緣在額頭上彎彎的
    const dome = () => { ctx.beginPath(); ctx.moveTo(cx - hw, by); ctx.bezierCurveTo(cx - hw * 1.03, cy - 19.6 * s, cx + hw * 1.03, cy - 19.6 * s, cx + hw, by); ctx.quadraticCurveTo(cx, cy - 9.2 * s, cx - hw, by); ctx.closePath(); };
    const cap = (col, inside) => { dome(); C.fill(ctx, col, r, null, 0.7); if (inside) { ctx.save(); dome(); ctx.clip(); inside(); ctx.restore(); } dome(); C.stroke(ctx, r, W); };
    const ball = (x, y, rx, ry, col, w) => { const fn = (q) => C.blob(ctx, x, y, rx, ry, q, 0.05, 12), sd = 700 + Math.round(rx * 31 + ry * 17);
      shape(ctx, C, sd, fn); C.fill(ctx, col, r, null); shape(ctx, C, sd, fn); C.stroke(ctx, r, w || 1.8); };
    if (k === 'frog') {
      const G = '#8ccb62';
      cap(G, () => dot(ctx, cx, cy - 15 * s, 9 * s, 3 * s, 'rgba(255,255,255,0.16)'));
      [-1, 1].forEach(d => {
        const x = cx + d * 6.8 * s, y = cy - 15 * s;
        ball(x, y, 4.3 * s, 4.3 * s, G); dot(ctx, x, y, 2.9 * s, 2.9 * s, '#ffffff'); dot(ctx, x + d * 0.3 * s, y + 0.3 * s, 1.5 * s, 1.7 * s, '#1d1c24');
      });
      ctx.beginPath(); ctx.moveTo(cx - 4.4 * s, cy - 10.2 * s); ctx.quadraticCurveTo(cx, cy - 8.2 * s, cx + 4.4 * s, cy - 10.2 * s); C.stroke(ctx, r, 1.1, 'rgba(43,42,51,0.7)');
      [-1, 1].forEach(d => dot(ctx, cx + d * 9.6 * s, cy - 8.4 * s, 1.7 * s, 1.1 * s, 'rgba(244,120,120,0.45)'));
    } else if (k === 'bear') {
      const B = '#a8754c';
      [-1, 1].forEach(d => { ball(cx + d * 10 * s, cy - 14 * s, 4.5 * s, 4.5 * s, B); dot(ctx, cx + d * 10 * s, cy - 13.8 * s, 2.3 * s, 2.3 * s, '#e6c39c'); });
      cap(B, () => dot(ctx, cx, cy - 15.4 * s, 9 * s, 2.6 * s, 'rgba(255,255,255,0.14)'));
      // 帽子上的小熊臉：兩顆眼睛、淺色的嘴邊
      dot(ctx, cx, cy - 9.4 * s, 3.2 * s, 2.1 * s, '#e6c39c'); dot(ctx, cx, cy - 10 * s, 1.1 * s, 0.8 * s, '#2b2a33');
      [-1, 1].forEach(d => dot(ctx, cx + d * 4.8 * s, cy - 11.8 * s, 0.9 * s, 0.9 * s, '#2b2a33'));
    } else if (k === 'bunny') {
      // 一隻耳朵立著、一隻垂到旁邊
      [[-5.6, -14.6, -0.12], [9.8, -14.2, 1.12]].forEach(([dx, dy, rot]) => {
        ctx.save(); ctx.translate(cx + dx * s, cy + dy * s); ctx.rotate(rot);
        ball(0, 0, 2.9 * s, 5 * s, WHITE); dot(ctx, 0, 0.3 * s, 1.25 * s, 3.2 * s, '#f6b9c2');
        ctx.restore();
      });
      cap(WHITE);
      [-1, 1].forEach(d => dot(ctx, cx + d * 9.4 * s, cy - 8.2 * s, 1.8 * s, 1.1 * s, 'rgba(244,120,120,0.4)'));
    } else if (k === 'berry') {
      cap('#ea5661', () => {
        [[-9, -8.6], [-4.6, -11.4], [0.2, -9.6], [5, -11.6], [9.4, -8.8], [-7.4, -13], [7.6, -13.4], [-2, -14.4], [2.6, -13.8]].forEach(([a, b]) => dot(ctx, cx + a * s, cy + b * s, 0.65 * s, 0.9 * s, '#ffe7a6'));
      });
      // 頭頂的綠蒂頭：幾片小葉子
      [[-4.6, -15.2, -1.15], [4.6, -15.2, 1.15], [-2.2, -16.6, -0.45], [2.2, -16.6, 0.45]].forEach(([dx, dy, rot]) => {
        ctx.save(); ctx.translate(cx + dx * s, cy + dy * s); ctx.rotate(rot); ball(0, 0, 1.9 * s, 3.4 * s, '#6fb556', 1.5); ctx.restore();
      });
      C.line(ctx, cx, cy - 17 * s, cx + 0.8 * s, cy - 19.6 * s, r, 2 * s, '#4c8a3c', 0.1);
    } else if (k === 'egg') {
      // 一片蛋白軟軟地蓋在頭頂，邊邊垂下來一點
      const kx = p.kind === 'cat' && p.ears === 'up' ? 0.74 : p.kind === 'dog' && p.ears === 'perk' && !curly(p) ? 0.8 : 1; // 立耳的時候蛋窄一點，剛好放在兩隻耳朵中間
      if (p.kind === 'dog') cy -= (curly(p) ? 2.4 : 1) * s;
      if (p.kind === 'horse') cy -= 1.8 * s; // 小馬的蛋放在瀏海上面 // 狗狗頭頂有一大球毛，蛋放在毛上面
      const pts = [[-12.6, -8.6], [-10.4, -13.6], [-4, -16.4], [4.4, -16.2], [10.6, -13.4], [12.8, -8.8], [9.6, -6.4], [6.2, -8.6], [2, -6.6], [-2.8, -9], [-7.8, -6.2]].map(([a, b]) => [cx + a * kx * s, cy + b * s]);
      C.smooth(ctx, pts); C.fill(ctx, WHITE, r, null); C.smooth(ctx, pts); C.stroke(ctx, r, W);
      ball(cx + 0.6 * s, cy - 12.6 * s, 4.6 * s, 3.3 * s, '#f6b73c', 1.6);
      dot(ctx, cx - 1 * s, cy - 13.6 * s, 1.5 * s, 0.7 * s, 'rgba(255,255,255,0.6)');
    } else if (k === 'duck') {
      cap('#f8d54e', () => dot(ctx, cx, cy - 15.2 * s, 9 * s, 2.8 * s, 'rgba(255,255,255,0.22)'));
      [-1, 1].forEach(d => { dot(ctx, cx + d * 5.6 * s, cy - 11.8 * s, 1 * s, 1.1 * s, '#2b2a33'); dot(ctx, cx + d * 9.2 * s, cy - 9 * s, 1.7 * s, 1.1 * s, 'rgba(244,120,120,0.4)'); });
      ball(cx, cy - 8.2 * s, 4.2 * s, 1.9 * s, '#f08a2c', 1.5);
      // 頭頂一小撮毛
      [[-1.6, -18.4], [1.6, -19]].forEach(([a, b]) => C.line(ctx, cx, cy - 15.6 * s, cx + a * s, cy + b * s, r, 1.6 * s, '#e0b52e', 0.1));
    }
  }
  function head(ctx, C, r, p, cx, cy, s, closed, side) {
    (p.kind === 'dog' ? dogHead : p.kind === 'horse' ? horseHead : catHead)(ctx, C, r, p, cx, cy, s, closed, side);
    if (p.kind === 'horse') { // 小馬的頭比較窄、比較高：頭套縮窄一點、往上挪一點才合
      ctx.save(); ctx.translate(cx, cy - 1.6 * s); ctx.scale(0.8, 0.92); hat(ctx, C, r, p, 0, 0, s); ctx.restore();
    } else hat(ctx, C, r, p, cx, cy, s);
  }

  const POSES = {
    // 側身站著（面向右邊，往左走的時候整張左右翻）
    // step：走路的另一格（四隻腳換位置、尾巴擺一下），跟站姿輪流播就是走路
    stand(ctx, C, r, p, step) {
      ctx.fillStyle = 'rgba(19,26,40,0.18)'; ctx.beginPath(); ctx.ellipse(31, 52.5, 19, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      tail(ctx, C, r, p, [17, 38], step ? [3, 33] : [5, 36], step ? [11, 21] : [9, 20]);
      leg(ctx, C, r, p, step ? 19.5 : 23, 40, 51, 5.2, true); leg(ctx, C, r, p, step ? 42 : 39, 40, 51, 5.2, true);
      const bx = 30, by = 38.5, rx = 15.5, ry = 10;
      const bfn = (q) => C.blob(ctx, bx, by, rx, ry, q, 0.04, 18);
      furShape(ctx, C, r, 301, bfn, mainOf(p), [bx - rx, by - ry, rx * 2, ry * 2], p, () => sideMarks(ctx, C, r, p, bx, by, rx, ry));
      leg(ctx, C, r, p, step ? 23.5 : 19.5, 42, 52.8, 6.2); leg(ctx, C, r, p, step ? 31.5 : 35, 42, 52.8, 6.2);
      head(ctx, C, r, p, 43, step ? 25.2 : 24.5, 1, false);
    },
    walk(ctx, C, r, p) { POSES.stand(ctx, C, r, p, true); },
    // 正面坐著
    sit(ctx, C, r, p) {
      ctx.fillStyle = 'rgba(19,26,40,0.18)'; ctx.beginPath(); ctx.ellipse(33, 52.5, 17, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      tail(ctx, C, r, p, [40, 50], [58, 54], [55, 36]);
      const bx = 32, by = 40.5, rx = 12.5, ry = 11.5;
      const bfn = (q) => C.smooth(ctx, [[bx - rx * 0.6, by - ry], [bx + rx * 0.6, by - ry], [bx + rx, by + ry * 0.2], [bx + rx * 1.05, by + ry * 0.9], [bx, by + ry * 1.05], [bx - rx * 1.05, by + ry * 0.9], [bx - rx, by + ry * 0.2]]
        .map(([a, b]) => [a + (q() - 0.5) * 0.8, b + (q() - 0.5) * 0.8]));
      furShape(ctx, C, r, 302, bfn, mainOf(p), [bx - rx, by - ry, rx * 2, ry * 2], p, () => {
        const m = p.mark;
        if (tabby(p)) {
          // 胸口一圈一圈的項鍊紋、身體兩側的條紋
          [-3, 1.5].forEach(dy => { ctx.beginPath(); ctx.moveTo(bx - rx * 0.8, by + dy - 3); ctx.quadraticCurveTo(bx, by + dy + 4, bx + rx * 0.8, by + dy - 3); C.stroke(ctx, r, 2, m); });
          [-1, 1].forEach(k => [0, 4.5].forEach(dy => stripe(ctx, C, r, bx + k * rx * 1.1, by + dy - 2, bx + k * rx * 0.55, by + dy, 2.2, m)));
          if (p.pattern === 'classic') [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(bx + k * rx * 1.05, by + ry * 0.15); ctx.quadraticCurveTo(bx + k * rx * 0.55, by + ry * 0.5, bx + k * rx * 0.95, by + ry * 1); C.stroke(ctx, r, 2.4, m); });
        } else if (p.pattern === 'spots') {
          [[-0.6, 0], [0.6, -0.2], [-0.7, 0.6], [0.7, 0.5]].forEach(([a, b]) => dot(ctx, bx + rx * a, by + ry * b, 2.2, 1.8, m));
        } else if (p.pattern === 'calico') {
          C.blob(ctx, bx - rx * 0.75, by + 2, 5, 7, r, 0.15, 12); ctx.fillStyle = ORANGE; ctx.fill();
          C.blob(ctx, bx + rx * 0.8, by + 4, 4.5, 6, r, 0.15, 12); ctx.fillStyle = m; ctx.fill();
        }
        if (whiteOf(p) !== 'none' || p.pattern === 'calico') { C.blob(ctx, bx, by + 1, rx * 0.5, ry * 0.75, r, 0.1, 14); ctx.fillStyle = WHITE; ctx.fill(); }
      });
      sitPaws(ctx, C, r, p, bx, rx);
      head(ctx, C, r, p, 32, 22.5, 1.05, false);
    },
    // 捲成一團睡覺（尾巴繞到前面）
    sleep(ctx, C, r, p) {
      ctx.fillStyle = 'rgba(19,26,40,0.18)'; ctx.beginPath(); ctx.ellipse(31, 52.5, 22, 3.6, 0, 0, Math.PI * 2); ctx.fill();
      const bx = 28, by = 43, rx = 19, ry = 9.5;
      const bfn = (q) => C.blob(ctx, bx, by, rx, ry, q, 0.04, 20);
      furShape(ctx, C, r, 303, bfn, mainOf(p), [bx - rx, by - ry, rx * 2, ry * 2], p, () => sideMarks(ctx, C, r, p, bx - 2, by - 1, rx * 0.9, ry));
      tail(ctx, C, r, p, [10, 46], [16, 57], [40, 53]);
      // 縮起來的前腳
      const pfn = (q) => C.blob(ctx, 40, 50, 4.6, 3, q, 0.08, 10);
      furShape(ctx, C, r, 304, pfn, whiteOf(p) === 'socks' ? WHITE : p.pattern === 'points' ? p.mark : mainOf(p), null, p, null);
      ctx.save(); ctx.translate(45, 41); ctx.rotate(0.22); head(ctx, C, r, p, 0, 0, 0.82, true); ctx.restore();
    },
  };

  function drawPet(ctx, p, pose) {
    const C = root.HQ_CRAYON;
    p = sanitize(p) || sanitize(DEFAULT);
    ctx.save();
    const set = p.kind === 'dog' ? DOG_POSES : p.kind === 'horse' ? HORSE_POSES : POSES;
    (set[pose] || set.stand)(ctx, C, C.rng(lookKey(p).length * 131 + 7), p);
    ctx.restore();
  }
  // 只畫一顆頭（按鈕、清單用）：(cx, cy) 是頭的中心
  function drawHead(ctx, p, cx, cy, s) {
    const C = root.HQ_CRAYON;
    p = sanitize(p) || sanitize(DEFAULT);
    head(ctx, C, C.rng(99), p, cx, cy, s, false);
  }
  // 可愛生物休息區的小窩：芥末黃的圓坐墊，畫在 48x40 的框裡，中心 (24, 24)
  function drawBed(ctx) {
    const C = root.HQ_CRAYON, r = C.rng(4242);
    ctx.fillStyle = 'rgba(19,26,40,0.16)'; ctx.beginPath(); ctx.ellipse(24, 32, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
    C.blob(ctx, 24, 26, 22, 10, r, 0.05, 18); C.fill(ctx, '#d99a2b', r, [2, 16, 44, 20]); C.stroke(ctx, r, W);
    C.blob(ctx, 24, 24, 17, 6.5, r, 0.05, 16); C.fill(ctx, '#f0bf4c', r, [7, 17, 34, 13]); C.stroke(ctx, r, 1.4, 'rgba(43,42,51,0.55)');
    C.line(ctx, 12, 23, 18, 21, r, 1.2, 'rgba(255,255,255,0.5)', 0.4);
  }

  // 手繪 icon：寵物按鈕（一顆貓頭）、摸摸（小腳印＋愛心）、放小窩
  if (root.HQ_ICONS && root.HQ_CRAYON) {
    const C = root.HQ_CRAYON;
    const ICON_CAT = { kind: 'cat', ears: 'fold', fur: FURS[0], pattern: 'classic', mark: MARKS[0], white: 'muzzle', eyes: EYES[1], nose: NOSES[0], tail: 'long', face: 'calm' };
    const heart = (x, cx, cy, s, col) => {
      x.beginPath(); x.moveTo(cx, cy + s * 0.9);
      x.bezierCurveTo(cx - s * 1.3, cy, cx - s * 0.7, cy - s * 1, cx, cy - s * 0.35);
      x.bezierCurveTo(cx + s * 0.7, cy - s * 1, cx + s * 1.3, cy, cx, cy + s * 0.9); x.closePath();
      x.fillStyle = col; x.fill();
    };
    root.HQ_ICONS.add({
      'btn-pet'(x) { head(x, C, C.rng(99), sanitize(ICON_CAT), 24, 27, 1.22, false); },
      'act-pat'(x, r) {
        [[24, 30, 8, 6.5], [13.5, 19, 3.6, 4.4], [20, 13, 3.6, 4.6], [28, 13, 3.6, 4.6], [34.5, 19, 3.6, 4.4]].forEach(([cx, cy, rx, ry]) => {
          C.blob(x, cx, cy, rx, ry, r, 0.08, 12); C.fill(x, '#f2a3b0', r, null); C.stroke(x, r, 2);
        });
        heart(x, 38, 37, 6, '#ef4b5c');
      },
      'act-bed'(x) { x.save(); x.translate(0, 4); drawBed(x); x.restore(); },
      // 飄起來的小愛心（摸摸的時候）
      'pet-heart'(x, r) { heart(x, 24, 26, 15, '#ff7b95'); x.beginPath(); x.moveTo(24, 39.5); x.bezierCurveTo(4.5, 26, 13.5, 11, 24, 20.75); x.bezierCurveTo(34.5, 11, 43.5, 26, 24, 39.5); C.stroke(x, r, 2.2); },
    });
  }

  const pets = { KINDS, MODES, TEMPERS, rollTemper, withTemper, BOND_LEVELS, BOND_CAPS, BOND_MAX, bondLevel, FEED, EARS, FACES, FURS, FUR_NAMES, PATTERNS, MARKS, MARK_NAMES, WHITES, EYES, EYE_NAMES, NOSES, NOSE_NAMES, TAILS, NAME_MAX,
    DOG_EARS, DOG_COATS, DOG_TAILS, DOG_FACES, DOG_WHITES, HATS, OPTS, DEFAULTS,
    DEFAULT, sanitize, lookKey, drawPet, drawHead, drawBed, WIDTH: 64, HEIGHT: 56 };
  if (typeof module !== 'undefined' && module.exports) module.exports = pets;
  else root.HQ_PETS = pets;
})(this);
