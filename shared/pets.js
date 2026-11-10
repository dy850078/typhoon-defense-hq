// 寵物：前後端共用的選項清單、存檔檢查，和瀏覽器端的蠟筆畫法
// 每個帳號可以領養一隻，自己捏外觀、取名字，切換「跟在身邊／自由散步／一起打怪」
// 畫在 64x56 的框裡，腳底在 (32, 52)；三種姿勢：stand（側身走路）、sit（正面坐著）、sleep（捲成一團睡覺）
(function (root) {
  const KINDS = { cat: '貓咪' };
  const MODES = { follow: '跟在身邊', wander: '自由散步', fight: '一起打怪' };
  const EARS = { up: '立耳', fold: '折耳' };
  // 毛色：底色
  const FURS = ['#d6d4cf', '#f7f4ee', '#f1dcb2', '#f0a456', '#a7aebb', '#a97850', '#3d3a3e'];
  const FUR_NAMES = ['銀灰', '白', '奶油', '橘', '藍灰', '棕', '黑'];
  const PATTERNS = { none: '素色', mackerel: '條紋虎斑', classic: '漩渦虎斑', spots: '斑點', calico: '三花', tuxedo: '賓士', points: '重點色' };
  // 花紋的顏色
  const MARKS = ['#4a4646', '#2e2b2f', '#8b8a90', '#6e4a30', '#d9772f'];
  const MARK_NAMES = ['深灰', '黑', '灰', '咖啡', '橘'];
  const WHITES = { none: '沒有白毛', muzzle: '白嘴邊白胸口', socks: '再加白襪子' };
  const EYES = ['#8db04b', '#c2c94a', '#e3b23c', '#c97b35', '#79b3e3', 'odd'];
  const EYE_NAMES = ['綠', '黃綠', '金', '銅', '藍', '異色'];
  const NOSES = ['#e39a7c', '#f2a3b0', '#c56a5a', '#3a3436'];
  const NOSE_NAMES = ['粉橘', '粉紅', '磚紅', '黑'];
  const TAILS = { long: '長尾巴', short: '短尾巴', fluffy: '蓬蓬尾' };
  const NAME_MAX = 8;

  const DEFAULT = { kind: 'cat', name: '', ears: 'up', fur: FURS[3], pattern: 'mackerel', mark: MARKS[4], white: 'muzzle',
    eyes: EYES[2], nose: NOSES[1], tail: 'long', mode: 'follow' };

  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const has = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  // 存檔檢查：不對的值換回預設；沒有寵物是 null
  function sanitize(p) {
    if (!p || typeof p !== 'object' || !has(KINDS, p.kind)) return null;
    const name = String(p.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, NAME_MAX);
    return {
      kind: p.kind,
      name: name || KINDS[p.kind],
      ears: has(EARS, p.ears) ? p.ears : DEFAULT.ears,
      fur: pick(p.fur, FURS, DEFAULT.fur),
      pattern: has(PATTERNS, p.pattern) ? p.pattern : DEFAULT.pattern,
      mark: pick(p.mark, MARKS, DEFAULT.mark),
      white: has(WHITES, p.white) ? p.white : DEFAULT.white,
      eyes: pick(p.eyes, EYES, DEFAULT.eyes),
      nose: pick(p.nose, NOSES, DEFAULT.nose),
      tail: has(TAILS, p.tail) ? p.tail : DEFAULT.tail,
      mode: has(MODES, p.mode) ? p.mode : DEFAULT.mode,
    };
  }
  // 外觀相同就共用同一張貼圖
  const lookKey = (p) => [p.kind, p.ears, p.fur, p.pattern, p.mark, p.white, p.eyes, p.nose, p.tail].join('|').replace(/#/g, '');

  // ---------------- 畫法（只在瀏覽器用） ----------------
  const W = 2.1;
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
    if (p.tail === 'fluffy') { // 蓬蓬的毛邊
      [0.35, 0.6, 0.85].forEach(t => { const [x, y] = qpt(a, b, c, t); C.dots(ctx, x - 3, y - 3, 6, 6, 3, 'rgba(255,255,255,0.35)', r, 1.4); });
    }
  }

  // 一隻腳：從 (x, y1) 往下到 (x, y2)，腳掌圓圓的
  function leg(ctx, C, r, p, x, y1, y2, w, far) {
    const main = p.pattern === 'points' ? p.mark : mainOf(p);
    const col = far ? mix(main, -0.12) : main;
    const fn = (q) => C.rect(ctx, x - w / 2, y1, w, y2 - y1, q, 0.5);
    furShape(ctx, C, r, Math.round(x * 7 + y1), fn, col, null, p, () => {
      if (tabby(p)) [0.35, 0.65].forEach(k => stripe(ctx, C, r, x - w, y1 + (y2 - y1) * k, x + w, y1 + (y2 - y1) * k + 0.5, 1.8, p.mark));
      if (p.pattern === 'calico' && x % 3 < 1) dot(ctx, x, y1 + 3, w, 4, ORANGE);
      if (whiteOf(p) === 'socks') dot(ctx, x, y2 - 1, w, 3.4, WHITE);
    });
    if (!far) C.line(ctx, x - 1, y2 - 0.5, x - 1, y2 - 2.5, r, 0.9, 'rgba(43,42,51,0.55)', 0.2);
  }

  // 頭：(cx, cy) 是頭的中心，s 是大小倍率
  function head(ctx, C, r, p, cx, cy, s, closed) {
    const main = mainOf(p), white = whiteOf(p);
    const earCol = p.pattern === 'points' ? p.mark : main;
    const hrx = 14 * s, hry = 12.4 * s;
    // 立耳：畫在頭後面
    if (p.ears === 'up') [-1, 1].forEach(k => {
      const ex = cx + k * 8.6 * s, ey = cy - 7.5 * s;
      ctx.beginPath(); ctx.moveTo(ex - k * 6 * s, ey + 1 * s); ctx.lineTo(ex + k * 3.2 * s, ey - 10.5 * s); ctx.lineTo(ex + k * 6.4 * s, ey + 3 * s); ctx.closePath();
      C.fill(ctx, p.pattern === 'calico' ? (k < 0 ? ORANGE : p.mark) : earCol, r, null); C.stroke(ctx, r, W);
      ctx.beginPath(); ctx.moveTo(ex - k * 2.4 * s, ey + 0.5 * s); ctx.lineTo(ex + k * 2.9 * s, ey - 6.5 * s); ctx.lineTo(ex + k * 4 * s, ey + 1.5 * s); ctx.closePath();
      C.fill(ctx, '#f2b8b8', r, null);
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
    // 折耳：小小的、往前往下折，像兩片小帽簷貼在頭頂兩邊
    if (p.ears === 'fold') [-1, 1].forEach(k => {
      const ex = cx + k * 8.4 * s, ey = cy - 9.2 * s;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(k * 0.62);
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
      C.blob(ctx, ex, ey, 3.1 * s, 3.4 * s, r, 0.05, 14); C.fill(ctx, col, r, null); C.stroke(ctx, r, 1.5);
      dot(ctx, ex + k * 0.2 * s, ey + 0.3 * s, 1.15 * s, 2.5 * s, '#1d1c24');
      dot(ctx, ex - 1 * s, ey - 1.3 * s, 0.9 * s, 0.9 * s, '#ffffff');
    });
    // 腮紅
    [-1, 1].forEach(k => dot(ctx, cx + k * 9.6 * s, cy + 4.2 * s, 2.2 * s, 1.4 * s, 'rgba(244,120,120,0.28)'));
    // 鼻子、嘴巴
    const ny = cy + 3.6 * s;
    ctx.beginPath(); ctx.moveTo(cx - 1.9 * s, ny); ctx.lineTo(cx + 1.9 * s, ny); ctx.lineTo(cx, ny + 2.1 * s); ctx.closePath();
    C.fill(ctx, p.nose, r, null); C.stroke(ctx, r, 1.2);
    ctx.beginPath(); ctx.moveTo(cx - 2.6 * s, ny + 3.1 * s); ctx.quadraticCurveTo(cx - 1.3 * s, ny + 4.4 * s, cx, ny + 2.4 * s);
    ctx.quadraticCurveTo(cx + 1.3 * s, ny + 4.4 * s, cx + 2.6 * s, ny + 3.1 * s); C.stroke(ctx, r, 1.1);
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

  const POSES = {
    // 側身站著（面向右邊，往左走的時候整張左右翻）
    stand(ctx, C, r, p) {
      ctx.fillStyle = 'rgba(19,26,40,0.18)'; ctx.beginPath(); ctx.ellipse(31, 52.5, 19, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      tail(ctx, C, r, p, [17, 38], [5, 36], [9, 20]);
      leg(ctx, C, r, p, 23, 40, 51, 5.2, true); leg(ctx, C, r, p, 39, 40, 51, 5.2, true);
      const bx = 30, by = 38.5, rx = 15.5, ry = 10;
      const bfn = (q) => C.blob(ctx, bx, by, rx, ry, q, 0.04, 18);
      furShape(ctx, C, r, 301, bfn, mainOf(p), [bx - rx, by - ry, rx * 2, ry * 2], p, () => sideMarks(ctx, C, r, p, bx, by, rx, ry));
      leg(ctx, C, r, p, 19, 42, 52.5, 5.6); leg(ctx, C, r, p, 35, 42, 52.5, 5.6);
      head(ctx, C, r, p, 43, 24.5, 1, false);
    },
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
          if (p.pattern === 'classic') [-1, 1].forEach(k => { C.blob(ctx, bx + k * rx * 0.85, by + ry * 0.55, 3.6, 4, r, 0.1, 10); C.stroke(ctx, r, 2.2, m); });
        } else if (p.pattern === 'spots') {
          [[-0.6, 0], [0.6, -0.2], [-0.7, 0.6], [0.7, 0.5]].forEach(([a, b]) => dot(ctx, bx + rx * a, by + ry * b, 2.2, 1.8, m));
        } else if (p.pattern === 'calico') {
          C.blob(ctx, bx - rx * 0.75, by + 2, 5, 7, r, 0.15, 12); ctx.fillStyle = ORANGE; ctx.fill();
          C.blob(ctx, bx + rx * 0.8, by + 4, 4.5, 6, r, 0.15, 12); ctx.fillStyle = m; ctx.fill();
        }
        if (whiteOf(p) !== 'none' || p.pattern === 'calico') { C.blob(ctx, bx, by + 1, rx * 0.5, ry * 0.75, r, 0.1, 14); ctx.fillStyle = WHITE; ctx.fill(); }
      });
      // 兩隻前腳
      leg(ctx, C, r, p, 28, 42, 52.5, 5.4); leg(ctx, C, r, p, 36, 42, 52.5, 5.4);
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
    (POSES[pose] || POSES.stand)(ctx, C, C.rng(lookKey(p).length * 131 + 7), p);
    ctx.restore();
  }
  // 只畫一顆頭（按鈕、清單用）：(cx, cy) 是頭的中心
  function drawHead(ctx, p, cx, cy, s) {
    const C = root.HQ_CRAYON;
    p = sanitize(p) || sanitize(DEFAULT);
    head(ctx, C, C.rng(99), p, cx, cy, s, false);
  }
  // 寵物旅館的小窩：芥末黃的圓坐墊，畫在 48x40 的框裡，中心 (24, 24)
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
    const ICON_CAT = { kind: 'cat', ears: 'fold', fur: FURS[0], pattern: 'classic', mark: MARKS[0], white: 'muzzle', eyes: EYES[0], nose: NOSES[0], tail: 'long' };
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

  const pets = { KINDS, MODES, EARS, FURS, FUR_NAMES, PATTERNS, MARKS, MARK_NAMES, WHITES, EYES, EYE_NAMES, NOSES, NOSE_NAMES, TAILS, NAME_MAX,
    DEFAULT, sanitize, lookKey, drawPet, drawHead, drawBed, WIDTH: 64, HEIGHT: 56 };
  if (typeof module !== 'undefined' && module.exports) module.exports = pets;
  else root.HQ_PETS = pets;
})(this);
