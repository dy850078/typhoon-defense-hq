// 野區的怪：職場怪（下班路上、打卡大樓）和台灣民間傳說的怪（廟口老街）
// 畫風參考 ZS 給的插畫：形狀簡單飽滿、霧面的不透明水彩色、色塊裡有深淺變化和乾筆刷痕，
// 臉是小小的點點眼＋嘟嘟的嘴；外框保留深色描邊（跟遊戲裡其他角色一致）
// 小怪畫在 96x84 裡，頭目畫在 120x100 裡，腳底在畫布下緣
(function (root) {
  const INK = '#2a2635';
  let SCALE = 2;
  let RNG = Math.random; // 這次在畫的怪用的亂數（固定種子）

  // ---------- 顏色 ----------
  const rgbOf = (c) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (c, to, k, a = 1) => {
    const p = rgbOf(c), q = typeof to === 'string' ? rgbOf(to) : to;
    return `rgba(${p.map((v, i) => Math.round(v + (q[i] - v) * k)).join(',')},${a})`;
  };
  const CREAM = [255, 246, 226], NIGHT = [36, 34, 72];
  const light = (c, k = 0.35, a = 1) => mix(c, CREAM, k, a);
  const dark = (c, k = 0.3, a = 1) => mix(c, NIGHT, k, a);

  // ---------- 形狀（都回傳 Path2D，才不會互相蓋掉路徑） ----------
  const E = (cx, cy, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); return p; };
  const RR = (x, y, w, h, rad) => { const p = new Path2D(); p.roundRect(x, y, w, h, rad); return p; };
  // 把一串點用二次曲線連成圓滑的封閉形狀
  const S = (pts) => {
    const p = new Path2D(), n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m = mid(pts[n - 1], pts[0]); p.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) { const a = pts[i]; m = mid(a, pts[(i + 1) % n]); p.quadraticCurveTo(a[0], a[1], m[0], m[1]); }
    p.closePath(); return p;
  };
  // 旋轉／平移一個形狀
  const T = (path, x, y, deg = 0, s = 1) => { const p = new Path2D(); p.addPath(path, new DOMMatrix().translate(x, y).rotate(deg).scale(s)); return p; };

  // ---------- 上色：一塊顏色畫成水彩感 ----------
  // box：形狀大概的範圍 [x, y, w, h]；o.hue：第二個顏色（從 o.at 那邊暈開）；o.lw：描邊粗細（0 不描）
  function paint(ctx, r, path, box, base, o = {}) {
    const [x, y, w, h] = box, cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    ctx.clip(path);
    // 1. 整塊先上暗色，再把亮一點的主色往左上偏一點蓋上去：右下就留下一圈影子
    ctx.fillStyle = dark(base, 0.26); ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(0.94, 0.93); ctx.translate(-cx - w * 0.045, -cy - h * 0.06);
    ctx.fillStyle = base; ctx.fill(path); ctx.restore();
    // 2. 第二個顏色暈開（像插畫裡橘色魚身慢慢變粉紅）
    if (o.hue) {
      const [ax, ay] = o.at || [0.5, 1];
      const g = ctx.createRadialGradient(x + w * ax, y + h * ay, 0, x + w * ax, y + h * ay, Math.max(w, h) * 0.75);
      g.addColorStop(0, mix(o.hue, o.hue, 0, 0.7)); g.addColorStop(1, mix(o.hue, o.hue, 0, 0));
      ctx.fillStyle = g; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    }
    // 3. 左上一塊亮面（不規則的形狀）
    if (o.shine !== false) {
      const pts = [];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2, k = 0.75 + r() * 0.5;
        pts.push([x + w * 0.33 + Math.cos(a) * w * 0.2 * k, y + h * 0.26 + Math.sin(a) * h * 0.13 * k]);
      }
      ctx.fillStyle = light(base, 0.4, 0.42); ctx.fill(S(pts));
    }
    // 4. 乾筆刷痕：同一個方向的細細筆觸＋一點一點的顏料
    ctx.lineCap = 'round';
    const n = Math.min(90, Math.round(w * h / 28)), dir = o.dir == null ? -0.5 : o.dir;
    for (let i = 0; i < n; i++) {
      const px = x + r() * w, py = y + r() * h, len = 3 + r() * 7, a = dir + (r() - 0.5) * 0.5;
      ctx.strokeStyle = r() < 0.6 ? light(base, 0.45, 0.16 + r() * 0.14) : dark(base, 0.35, 0.1 + r() * 0.1);
      ctx.lineWidth = 0.6 + r() * 1.6;
      const st = new Path2D(); st.moveTo(px, py); st.quadraticCurveTo(px + Math.cos(a) * len * 0.5 + 0.8, py + Math.sin(a) * len * 0.5 - 0.8, px + Math.cos(a) * len, py + Math.sin(a) * len);
      ctx.stroke(st);
    }
    for (let i = 0; i < n * 2; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(255,248,232,0.16)' : 'rgba(30,24,60,0.07)';
      ctx.fillRect(x + r() * w, y + r() * h, 0.5 + r() * 1.3, 0.5 + r() * 0.9);
    }
    ctx.restore();
    if (o.lw !== 0) outline(ctx, path, o.lw || 2.2, o.over);
    // 疊在身體上的那段改用深一點的同色線，看得出形狀但不是黑線
    if (o.over && o.lw !== 0) { ctx.save(); ctx.clip(o.over); ctx.strokeStyle = dark(base, 0.4, 0.7); ctx.lineWidth = (o.lw || 2.2) * 0.7; ctx.stroke(path); ctx.restore(); }
  }
  // over：疊在哪個形狀上面，那一段不描（關節處不用描黑）
  function outline(ctx, path, lw = 2.2, over) {
    ctx.save();
    if (over) { const m = new Path2D(); m.rect(-300, -300, 800, 800); m.addPath(over); ctx.clip(m, 'evenodd'); }
    ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(path); ctx.restore();
  }
  // 手腳、尾巴、觸手：粗粗的一條（先描深色邊，再上色，再加一條亮線）
  // o.end：末端的手掌或鞋子 [rx, ry, 顏色, dx, dy]，跟手腳一起描邊，接的地方才不會有一圈黑線
  // o.over：疊在哪個形狀上面，那一段不描黑邊（關節處不用描黑）
  function limb(ctx, pts, w, color, o = {}) {
    const p = new Path2D(); p.moveTo(...pts[0]);
    if (pts.length === 2) p.lineTo(...pts[1]);
    else for (let i = 1; i + 1 < pts.length; i += 2) p.quadraticCurveTo(...pts[i], ...pts[i + 1]);
    const last = pts[pts.length - 1], e = o.end;
    const end = e && E(last[0] + (e[3] || 0), last[1] + (e[4] || 0), e[0], e[1]);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.save();
    if (o.over) { const m = new Path2D(); m.rect(-300, -300, 800, 800); m.addPath(o.over); ctx.clip(m, 'evenodd'); }
    ctx.strokeStyle = INK; ctx.lineWidth = w + 2.4; ctx.stroke(p);
    if (end) { ctx.lineWidth = 2.4; ctx.stroke(end); }
    ctx.restore();
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(p);
    ctx.save(); ctx.translate(-w * 0.18, -w * 0.18); ctx.strokeStyle = light(color, 0.4, 0.55); ctx.lineWidth = w * 0.32; ctx.stroke(p); ctx.restore();
    ctx.restore();
    if (end) paint(ctx, RNG, end, [last[0] + (e[3] || 0) - e[0], last[1] + (e[4] || 0) - e[1], e[0] * 2, e[1] * 2], e[2], { lw: 0, shine: false });
  }
  // 小圓球（手、鞋子）
  const ball = (ctx, r, x, y, rx, ry, color, rot = 0) => paint(ctx, r, E(x, y, rx, ry, rot), [x - rx, y - ry, rx * 2, ry * 2], color, { lw: 1.8, shine: false });
  // 畫筆塗的一條線（不描邊，用在圖案、花紋）
  function brush(ctx, pts, w, color) {
    const p = new Path2D(); p.moveTo(...pts[0]);
    for (let i = 1; i < pts.length; i += 2) {
      if (pts[i + 1]) p.quadraticCurveTo(...pts[i], ...pts[i + 1]); else p.lineTo(...pts[i]);
    }
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(p); ctx.restore();
  }
  const dab = (ctx, x, y, rx, ry, color, rot = 0) => { ctx.fillStyle = color; ctx.fill(E(x, y, rx, ry, rot)); };
  const glow = (ctx, x, y, rad, color, a = 0.5) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, mix(color, color, 0, a)); g.addColorStop(1, mix(color, color, 0, 0));
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  const shadow = (ctx, x, y, rx) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.2);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(30,28,60,0.28)'); g.addColorStop(1, 'rgba(30,28,60,0)');
    ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
  };
  const text = (ctx, s, x, y, size, color, rot = 0) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color; ctx.font = `900 ${size}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 0); ctx.restore();
  };

  // ---------- 臉：小點點眼、短短的鼻子、嘟嘟嘴（插畫家那種淡定的表情） ----------
  // o.eyes：dot（點點）、sleepy（半睜）、happy（彎彎）、wink（一隻眨眼）、tired（黑眼圈）
  // o.mouth：預設嘟嘟嘴；line（一條線）、smirk（壞笑）、none（不畫）
  function face(ctx, x, y, s = 1, o = {}) {
    const gap = (o.gap || 7) * s, ec = o.eyeColor || INK;
    ctx.save(); ctx.lineCap = 'round';
    if (o.blush !== false) [-1, 1].forEach(k => glow(ctx, x + k * (gap + 3.5 * s), y + 4 * s, 4.2 * s, '#e88a8a', 0.55));
    const dotEye = (ex) => { ctx.fillStyle = ec; ctx.beginPath(); ctx.ellipse(ex, y, 1.5 * s, 1.75 * s, 0, 0, Math.PI * 2); ctx.fill(); };
    const arcEye = (ex) => { ctx.strokeStyle = ec; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.arc(ex, y + 1 * s, 2.4 * s, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); };
    [-1, 1].forEach(k => {
      const ex = x + k * gap;
      const kind = o.eyes === 'wink' ? (k < 0 ? 'dot' : 'happy') : (o.eyes || 'dot');
      if (kind === 'dot') dotEye(ex);
      else if (kind === 'happy') arcEye(ex);
      else if (kind === 'sleepy') {
        ctx.fillStyle = ec; ctx.beginPath(); ctx.arc(ex, y - 0.3 * s, 2 * s, 0, Math.PI); ctx.fill();
        ctx.strokeStyle = ec; ctx.lineWidth = 1.3 * s; ctx.beginPath(); ctx.moveTo(ex - 2.8 * s, y - 0.4 * s); ctx.lineTo(ex + 2.8 * s, y - 0.4 * s); ctx.stroke();
      } else if (kind === 'tired') {
        dotEye(ex);
        ctx.strokeStyle = 'rgba(140,110,190,0.75)'; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.arc(ex, y + 0.6 * s, 3 * s, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
      }
    });
    if (o.nose) { ctx.strokeStyle = o.nose; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(x, y + 1 * s); ctx.quadraticCurveTo(x + 1.2 * s, y + 3 * s, x - 0.2 * s, y + 3.6 * s); ctx.stroke(); }
    const ly = y + (o.nose ? 6.4 : 5) * s, lw = (o.lipW || 3.4) * s, lc = o.lips || '#c9555e';
    if (o.mouth === 'line') { ctx.strokeStyle = ec; ctx.lineWidth = 1.3 * s; ctx.beginPath(); ctx.moveTo(x - 2.4 * s, ly); ctx.quadraticCurveTo(x, ly - 0.6 * s, x + 2.4 * s, ly + 0.3 * s); ctx.stroke(); }
    else if (o.mouth === 'smirk') {
      ctx.fillStyle = lc; ctx.beginPath(); ctx.moveTo(x - lw, ly); ctx.quadraticCurveTo(x, ly + 3.2 * s, x + lw + 1 * s, ly - 1.4 * s); ctx.quadraticCurveTo(x, ly + 0.8 * s, x - lw, ly); ctx.fill();
    } else if (o.mouth !== 'none') {
      // 嘟嘟嘴：上下兩片
      ctx.fillStyle = lc;
      ctx.beginPath(); ctx.moveTo(x - lw, ly); ctx.quadraticCurveTo(x - lw * 0.5, ly - 1.8 * s, x, ly - 0.7 * s); ctx.quadraticCurveTo(x + lw * 0.5, ly - 1.8 * s, x + lw, ly);
      ctx.quadraticCurveTo(x, ly + 2.6 * s, x - lw, ly); ctx.fill();
      ctx.strokeStyle = dark(lc, 0.45, 0.7); ctx.lineWidth = 0.7 * s; ctx.beginPath(); ctx.moveTo(x - lw * 0.7, ly + 0.1 * s); ctx.quadraticCurveTo(x, ly + 0.6 * s, x + lw * 0.7, ly + 0.1 * s); ctx.stroke();
    }
    ctx.restore();
  }

  function canvas(w, h, seed, draw) {
    const c = document.createElement('canvas');
    c.width = w * SCALE; c.height = h * SCALE;
    const ctx = c.getContext('2d');
    ctx.scale(SCALE, SCALE);
    let s = seed >>> 0;
    const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    RNG = r;
    draw(ctx, r);
    return c;
  }

  const C = {
    navy: '#3c4466', plum: '#5b4a7a', coral: '#d9645a', peach: '#e9967a', mustard: '#e6b94a', cream: '#f3ecdf',
    teal: '#5f9ea6', sage: '#9fb8a8', lav: '#a493c9', pink: '#e3a0aa', wood: '#b98257', skin: '#efc6a6', grass: '#8fb07a',
  };
  // 兩條腿＋鞋子：[[上, 下], ...]
  const legs = (ctx, list, w, color, shoe) => list.forEach(([a, b]) => limb(ctx, [a, b], w, color, { end: [5.2, 3.2, shoe, -1, 2] }));
  // 小火焰
  const flame = (x, y, s) => { const p = new Path2D(); p.moveTo(x, y - 7 * s); p.quadraticCurveTo(x + 5 * s, y - 1 * s, x + 3 * s, y + 2 * s); p.quadraticCurveTo(x, y + 4 * s, x - 3 * s, y + 2 * s); p.quadraticCurveTo(x - 5 * s, y - 1 * s, x, y - 7 * s); p.closePath(); return p; };

  const DRAW = {
    // ---------- 下班路上 ----------
    // 便利貼精：一張黃色便利貼，後面黏著粉紅、藍色兩張，右下角翹起來
    sticky: () => canvas(96, 84, 201, (ctx, r) => {
      shadow(ctx, 48, 79, 24);
      legs(ctx, [[[41, 60], [40, 75]], [[55, 60], [56, 75]]], 4.6, C.navy, C.coral);
      paint(ctx, r, T(RR(-20, -21, 40, 42, 4), 38, 37, -12), [16, 14, 44, 46], C.teal, { hue: '#7fb3c9', at: [0.2, 0.2] });
      paint(ctx, r, T(RR(-20, -21, 40, 42, 4), 59, 39, 10), [37, 16, 44, 46], C.pink, { hue: '#e9b08a', at: [0.8, 0.9] });
      const note = new Path2D();
      note.moveTo(26, 17); note.quadraticCurveTo(48, 13, 71, 17); note.lineTo(71, 47); note.quadraticCurveTo(66, 57, 58, 60);
      note.lineTo(27, 61); note.quadraticCurveTo(24, 40, 26, 17); note.closePath();
      paint(ctx, r, note, [24, 13, 48, 48], '#efc75e', { hue: '#ea9a76', at: [0.6, 1.05] });
      ctx.save(); ctx.clip(note); ctx.fillStyle = 'rgba(255,240,200,0.4)'; ctx.fillRect(22, 13, 52, 8); ctx.restore();
      const curl = new Path2D(); curl.moveTo(71, 47); curl.quadraticCurveTo(62, 49, 58, 60); curl.quadraticCurveTo(67, 57, 71, 47); curl.closePath();
      paint(ctx, r, curl, [58, 47, 13, 13], '#d9a845', { lw: 1.8, shine: false });
      brush(ctx, [[33, 27], [49, 26]], 1.7, 'rgba(79,120,168,0.8)'); brush(ctx, [[33, 33], [44, 32.5]], 1.7, 'rgba(79,120,168,0.8)');
      brush(ctx, [[55, 27], [58, 31], [64, 23]], 2, 'rgba(201,85,94,0.85)');
      face(ctx, 48, 45, 1.05);
      limb(ctx, [[29, 42], [21, 38], [17, 32]], 4, '#efc75e', { over: note, end: [3.2, 3.2, '#efc75e'] });
      limb(ctx, [[68, 38], [76, 35], [80, 29]], 4, '#efc75e', { over: note, end: [3.2, 3.2, '#efc75e'] });
    }),

    // 已讀飄飄：白白的對話泡泡幽靈，睡眼惺忪，角落寫著「已讀」
    seen: () => canvas(96, 84, 202, (ctx, r) => {
      shadow(ctx, 48, 80, 16);
      const b = new Path2D();
      b.moveTo(21, 40); b.quadraticCurveTo(20, 13, 48, 12); b.quadraticCurveTo(76, 13, 75, 40);
      b.quadraticCurveTo(75, 56, 63, 60); b.quadraticCurveTo(62, 69, 55, 73); b.quadraticCurveTo(57, 66, 51, 62);
      b.quadraticCurveTo(44, 68, 36, 66); b.quadraticCurveTo(40, 62, 34, 60); b.quadraticCurveTo(21, 56, 21, 40); b.closePath();
      paint(ctx, r, b, [20, 12, 56, 62], C.cream, { hue: '#b9b3d9', at: [0.6, 1] });
      face(ctx, 48, 38, 1.15, { eyes: 'sleepy', gap: 8, lipW: 2.6 });
      // 像聊天室一樣，「已讀」和時間小小的放在泡泡外面、尾巴旁邊
      text(ctx, '已讀', 20, 66, 6.5, 'rgba(140,144,170,0.95)');
      text(ctx, '23:59', 20, 73, 5.5, 'rgba(140,144,170,0.95)');
      [[12, 30, 8, 36], [84, 36, 88, 42], [80, 20, 84, 25]].forEach(([a, b2, c, d]) => brush(ctx, [[a, b2], [c, d]], 1.6, 'rgba(185,179,217,0.9)'));
    }),

    // 甩鍋鍋：深藍色的小炒鍋，鍋裡還有青菜，把另一支小鍋子丟出去
    wok: () => canvas(96, 84, 203, (ctx, r) => {
      shadow(ctx, 46, 79, 26);
      legs(ctx, [[[39, 62], [38, 74]], [[53, 62], [54, 74]]], 4.6, C.navy, C.coral);
      limb(ctx, [[17, 44], [11, 40], [7, 33]], 4, '#5a6488', { end: [3.2, 3.2, C.cream] });
      const bowl = new Path2D(); bowl.moveTo(14, 34); bowl.quadraticCurveTo(16, 67, 46, 67); bowl.quadraticCurveTo(76, 67, 78, 34); bowl.closePath();
      paint(ctx, r, bowl, [14, 34, 64, 33], '#3f4870', { hue: '#6a5488', at: [0.8, 0.9] });
      // 把手＋丟出去的小鍋子
      paint(ctx, r, T(RR(0, -3.5, 22, 7, 3.5), 75, 38, -32), [74, 24, 20, 16], C.wood, { lw: 1.8, shine: false });
      const pot = new Path2D(); pot.moveTo(-9, -2); pot.quadraticCurveTo(-8, 8, 0, 8); pot.quadraticCurveTo(8, 8, 9, -2); pot.closePath();
      paint(ctx, r, T(pot, 80, 16, 30), [70, 8, 20, 18], '#3f4870', { lw: 1.8, shine: false });
      limb(ctx, [[84, 13], [89, 9]], 2.4, C.wood);
      [[70, 6, 64, 10], [77, 3, 71, 6]].forEach(([a, b2, c, d]) => brush(ctx, [[a, b2], [c, d]], 1.4, 'rgba(150,150,180,0.8)'));
      // 鍋口和鍋裡的青菜
      paint(ctx, r, E(46, 34, 32, 6), [14, 28, 64, 12], '#7b84a6', { lw: 2, shine: false });
      ctx.fillStyle = '#262940'; ctx.fill(E(46, 35, 26, 3.6));
      [[36, 33, '#7fb38a'], [44, 34, '#9cc79a'], [52, 33, '#7fb38a'], [58, 34.5, '#e9967a'], [30, 35, '#e9967a']].forEach(([x, y, c]) => dab(ctx, x, y, 3.4, 1.6, c, -0.3));
      brush(ctx, [[24, 44], [22, 52], [26, 58]], 2.2, 'rgba(200,205,235,0.4)');
      face(ctx, 46, 49, 1.15, { eyeColor: '#f3ecdf', lips: '#e98a84', gap: 8 });
      ctx.fillStyle = '#9fd0d6'; ctx.beginPath(); ctx.moveTo(70, 42); ctx.quadraticCurveTo(66, 48, 70, 50); ctx.quadraticCurveTo(74, 48, 70, 42); ctx.fill();
    }),

    // ---------- 打卡大樓 ----------
    // 會議章魚：薰衣草紫的章魚，戴圓眼鏡打紅領帶，拿著筆電和咖啡
    octo: () => canvas(96, 84, 204, (ctx, r) => {
      shadow(ctx, 48, 79, 30);
      const body = C.lav;
      [[-1, 34, 76], [-0.6, 40, 78], [-0.2, 46, 79], [0.2, 52, 79], [0.6, 58, 78], [1, 64, 76]].forEach(([k, x, y]) =>
        limb(ctx, [[48 + k * 12, 56], [48 + k * 24, 64], [x + k * 8, y]], 5.4, body));
      [[44, 76], [50, 77]].forEach(([x, y]) => dab(ctx, x, y, 1.4, 1, 'rgba(240,200,220,0.9)'));
      limb(ctx, [[30, 48], [20, 50], [14, 42]], 4.6, body);
      limb(ctx, [[66, 48], [76, 50], [80, 42]], 4.6, body);
      limb(ctx, [[62, 54], [74, 62], [80, 60]], 4.2, body);
      paint(ctx, r, S([[48, 12], [66, 16], [73, 34], [68, 52], [48, 58], [28, 52], [23, 34], [30, 16]]), [23, 12, 50, 46], body, { hue: '#d9a0b8', at: [0.5, 1] });
      [[36, 22, 3.4], [58, 26, 2.6], [52, 17, 2]].forEach(([x, y, s]) => dab(ctx, x, y, s, s, 'rgba(240,230,250,0.5)'));
      // 眼鏡
      [[40, 38], [56, 38]].forEach(([x, y]) => { ctx.fillStyle = 'rgba(255,250,240,0.45)'; ctx.fill(E(x, y, 5.6, 5.6)); outline(ctx, E(x, y, 5.6, 5.6), 1.4); });
      brush(ctx, [[45.6, 38], [50.4, 38]], 1.3, INK);
      face(ctx, 48, 38.5, 1, { gap: 8, lipW: 2.6 });
      const tie = new Path2D(); tie.moveTo(45, 55); tie.lineTo(51, 55); tie.lineTo(53, 66); tie.lineTo(48, 70); tie.lineTo(43, 66); tie.closePath();
      paint(ctx, r, tie, [43, 55, 10, 15], C.coral, { lw: 1.6, shine: false });
      // 筆電
      paint(ctx, r, T(RR(-11, -8, 22, 15, 2.5), 13, 36, -12), [1, 27, 24, 18], '#aab3c3', { lw: 1.8, shine: false });
      ctx.save(); ctx.translate(13, 36); ctx.rotate(-0.21); ctx.fillStyle = '#8ec3c9'; ctx.fillRect(-8, -5.5, 16, 10);
      [[-5, 3], [-1, 5], [3, 7]].forEach(([x, h]) => { ctx.fillStyle = '#4f78a8'; ctx.fillRect(x, 3 - h, 2.4, h); }); ctx.restore();
      // 咖啡
      paint(ctx, r, RR(77, 30, 10, 12, 2), [77, 30, 10, 12], C.cream, { lw: 1.8, shine: false });
      ctx.fillStyle = C.wood; ctx.fillRect(77.5, 34, 9, 3);
      [[80, 26], [84, 24]].forEach(([x, y]) => brush(ctx, [[x, y + 3], [x + 2, y], [x, y - 3]], 1.2, 'rgba(160,160,190,0.8)'));
    }),

    // 加班鬧鐘：珊瑚紅的雙鈴鬧鐘，停在快十一點，黑眼圈很重
    clock: () => canvas(96, 84, 205, (ctx, r) => {
      shadow(ctx, 48, 79, 22);
      legs(ctx, [[[38, 64], [36, 74]], [[58, 64], [60, 74]]], 4.6, C.navy, C.cream);
      [[30, 17, -28], [66, 17, 28]].forEach(([x, y, a]) => {
        const p = new Path2D(); p.moveTo(-11, 3); p.quadraticCurveTo(-10, -9, 0, -9); p.quadraticCurveTo(10, -9, 11, 3); p.closePath();
        paint(ctx, r, T(p, x, y, a), [x - 11, y - 10, 22, 14], C.mustard, { lw: 2, hue: '#e9967a', at: [0.5, 1] });
      });
      limb(ctx, [[48, 20], [48, 10]], 2.4, '#5a6488', { end: [3, 3, '#5a6488', 0, -1] });
      limb(ctx, [[25, 46], [19, 42], [15, 34]], 4, C.coral, { end: [3.2, 3.2, C.cream, 0, -1] });
      limb(ctx, [[71, 46], [77, 42], [81, 34]], 4, C.coral, { end: [3.2, 3.2, C.cream, 0, -1] });
      paint(ctx, r, E(48, 44, 25, 24), [23, 20, 50, 48], C.coral, { hue: '#e9967a', at: [0.2, 0.9] });
      paint(ctx, r, E(48, 44, 19, 18), [29, 26, 38, 36], C.cream, { lw: 1.8, hue: '#e8d6c8', at: [0.7, 0.9] });
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; dab(ctx, 48 + Math.cos(a) * 15.5, 44 + Math.sin(a) * 15, i % 3 ? 0.9 : 1.5, i % 3 ? 0.9 : 1.5, '#5a6488'); }
      brush(ctx, [[48, 44], [41, 38]], 2.2, '#3c4466'); brush(ctx, [[48, 44], [46.5, 31]], 1.6, '#3c4466'); dab(ctx, 48, 44, 1.6, 1.6, '#3c4466');
      face(ctx, 48, 49, 1, { eyes: 'tired', gap: 7.5, mouth: 'line' });
      [[14, 12, -1], [82, 12, 1]].forEach(([x, y, k]) => [0, 5].forEach(d => {
        ctx.save(); ctx.strokeStyle = 'rgba(217,100,90,0.7)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(x - k * d, y + 8, 7 + d, k > 0 ? -Math.PI * 0.42 : Math.PI * 1.12, k > 0 ? -Math.PI * 0.12 : Math.PI * 1.42); ctx.stroke(); ctx.restore();
      }));
    }),

    // 急件老闆（頭目）：圓滾滾的老闆，頭頂一撮毛、八字鬍，抱著一疊蓋了「急件」紅章的卷宗
    boss: () => canvas(120, 100, 206, (ctx, r) => {
      shadow(ctx, 60, 95, 36);
      legs(ctx, [[[51, 80], [50, 91]], [[69, 80], [70, 91]]], 6, '#323a58', '#5b4a52');
      const suit = S([[60, 38], [80, 42], [91, 62], [86, 84], [60, 90], [34, 84], [29, 62], [40, 42]]);
      paint(ctx, r, suit, [29, 38, 62, 52], C.navy, { hue: C.plum, at: [0.85, 0.85] });
      const shirt = new Path2D(); shirt.moveTo(50, 41); shirt.lineTo(70, 41); shirt.lineTo(63, 72); shirt.lineTo(57, 72); shirt.closePath();
      paint(ctx, r, shirt, [50, 41, 20, 31], C.cream, { lw: 1.6, shine: false });
      const tie = new Path2D(); tie.moveTo(57, 43); tie.lineTo(63, 43); tie.lineTo(65, 61); tie.lineTo(60, 67); tie.lineTo(55, 61); tie.closePath();
      paint(ctx, r, tie, [55, 43, 10, 24], C.coral, { lw: 1.6, shine: false });
      const sq = new Path2D(); sq.moveTo(73, 52); sq.lineTo(82, 52); sq.lineTo(78, 46); sq.closePath(); paint(ctx, r, sq, [73, 46, 9, 6], C.mustard, { lw: 1.2, shine: false });
      // 頭
      [[42, 28], [78, 28]].forEach(([x, y]) => paint(ctx, r, E(x, y, 4, 7), [x - 4, y - 7, 8, 14], '#7b84a6', { lw: 1.6, shine: false }));
      paint(ctx, r, E(60, 27, 19, 17), [41, 10, 38, 34], C.skin, { hue: '#e9a08a', at: [0.5, 1] });
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(59, 11); ctx.quadraticCurveTo(54, 2, 63, 3); ctx.stroke();
      ctx.strokeStyle = '#7b84a6'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
      brush(ctx, [[48, 21], [56, 23.5]], 2.6, '#3c4466'); brush(ctx, [[72, 21], [64, 23.5]], 2.6, '#3c4466');
      face(ctx, 60, 27, 1.15, { gap: 6.5, nose: 'rgba(170,110,90,0.8)', lipW: 2.8 });
      const ms = new Path2D(); ms.moveTo(60, 33.4); ms.quadraticCurveTo(52, 30.5, 47, 36); ms.quadraticCurveTo(54, 35, 60, 35.6); ms.quadraticCurveTo(66, 35, 73, 36); ms.quadraticCurveTo(68, 30.5, 60, 33.4); ms.closePath();
      paint(ctx, r, ms, [47, 30, 26, 6], '#3c4466', { lw: 1.2, shine: false });
      // 卷宗一疊
      ['#e8cf8a', '#8ec3c9', '#e3a0aa', '#e8cf8a'].forEach((c, i) => paint(ctx, r, T(RR(-16 + (i % 2) * 2, -12 - i * 5, 31, 6, 2), 29, 62, -7), [12, 38, 34, 24], c, { lw: 1.6, shine: false }));
      paint(ctx, r, T(RR(-16, -8, 31, 19, 2.5), 29, 62, -7), [12, 52, 34, 22], '#e8cf8a', { lw: 1.8, hue: '#e9b08a', at: [0.2, 1] });
      ctx.save(); ctx.translate(28, 63); ctx.rotate(-0.32);
      ctx.strokeStyle = 'rgba(201,85,94,0.9)'; ctx.lineWidth = 1.5; ctx.strokeRect(-10, -5.5, 19, 11);
      text(ctx, '急件', -0.5, 0.4, 7.5, 'rgba(201,85,94,0.95)'); ctx.restore();
      limb(ctx, [[37, 56], [38, 66], [44, 70]], 6.4, C.navy, { over: suit, end: [3.6, 3.4, C.skin, 1, 0] });
      limb(ctx, [[104, 39], [108, 35]], 2, C.skin);
      limb(ctx, [[84, 54], [94, 50], [101, 42]], 6.4, C.navy, { over: suit, end: [3.6, 3.6, C.skin, 1, -1] });
    }),

    // ---------- 廟口老街 ----------
    // 燈猴：傳說中幫人間點燈的小猴子，身體是一盞「福」字燈籠，頭上頂著一小簇燈火
    monkey: () => canvas(96, 84, 207, (ctx, r) => {
      glow(ctx, 48, 55, 34, '#f0b060', 0.35);
      shadow(ctx, 48, 79, 20);
      limb(ctx, [[66, 62], [84, 64], [80, 48], [74, 42], [74, 52]], 4.2, '#a8754f');
      legs(ctx, [[[42, 66], [41, 75]], [[54, 66], [55, 75]]], 4.4, '#a8754f', '#8a5f45');
      paint(ctx, r, RR(38, 34, 20, 5, 2), [38, 34, 20, 5], C.mustard, { lw: 1.6, shine: false });
      const lantern = E(48, 54, 18, 15);
      paint(ctx, r, lantern, [30, 39, 36, 30], C.coral, { hue: '#f0b060', at: [0.5, 0.5] });
      [-9, 0, 9].forEach(dx => brush(ctx, [[48 + dx, 41], [48 + dx * 1.6, 54], [48 + dx, 67]], 1.2, 'rgba(150,50,50,0.35)'));
      text(ctx, '福', 48, 55, 10, 'rgba(240,200,110,0.95)');
      paint(ctx, r, RR(39, 67, 18, 5, 2), [39, 67, 18, 5], C.mustard, { lw: 1.6, shine: false });
      limb(ctx, [[33, 50], [24, 46], [18, 38]], 4, '#a8754f', { over: lantern, end: [3, 3, C.skin] });
      glow(ctx, 16, 28, 10, '#f0b060', 0.6);
      paint(ctx, r, E(16, 35, 6, 2.6), [10, 32, 12, 6], '#c49a4a', { lw: 1.4, shine: false });
      paint(ctx, r, flame(16, 29, 0.8), [12, 23, 8, 10], '#f0a24a', { lw: 1.2, shine: false, hue: '#fff0b0', at: [0.5, 0.8] });
      limb(ctx, [[63, 52], [70, 56], [72, 62]], 4, '#a8754f', { over: lantern, end: [3, 3, C.skin] });
      // 頭
      [[31, 24], [65, 24]].forEach(([x, y]) => { paint(ctx, r, E(x, y, 6, 6.4), [x - 6, y - 6, 12, 13], '#a8754f', { lw: 1.8, shine: false }); dab(ctx, x, y, 3.2, 3.4, '#e7b493'); });
      paint(ctx, r, E(48, 23, 17, 15), [31, 8, 34, 30], '#a8754f', { hue: '#c98a5a', at: [0.3, 0.2] });
      const mask = new Path2D(); mask.moveTo(36, 24); mask.quadraticCurveTo(36, 14, 44, 16); mask.quadraticCurveTo(48, 12, 52, 16); mask.quadraticCurveTo(60, 14, 60, 24);
      mask.quadraticCurveTo(60, 35, 48, 35); mask.quadraticCurveTo(36, 35, 36, 24); mask.closePath();
      paint(ctx, r, mask, [36, 13, 24, 22], '#efc6a6', { lw: 1.4, hue: '#e9a08a', at: [0.5, 1] });
      face(ctx, 48, 22, 1, { gap: 5, nose: 'rgba(170,110,90,0.8)', lipW: 2.6 });
      glow(ctx, 48, 6, 7, '#f0b060', 0.7);
      paint(ctx, r, flame(48, 6, 0.9), [43, -1, 10, 12], '#f0a24a', { lw: 1.4, shine: false, hue: '#fff0b0', at: [0.5, 0.8] });
    }),

    // 石獅仔：廟口的小石獅，捲捲的鬃毛、脖子繫紅彩，腳踩繡球，嘴裡含著一顆石珠
    lion: () => canvas(96, 84, 208, (ctx, r) => {
      shadow(ctx, 48, 80, 28);
      const stone = C.sage, mane = '#86a397';
      paint(ctx, r, RR(21, 69, 54, 10, 3), [21, 69, 54, 10], '#97a3b0', { lw: 2, shine: false });
      [[74, 46, 5], [78, 40, 4.2], [74, 35, 3.4]].forEach(([x, y, s]) => paint(ctx, r, E(x, y, s, s), [x - s, y - s, s * 2, s * 2], mane, { lw: 1.6, shine: false }));
      const lb = E(51, 56, 22, 15);
      paint(ctx, r, lb, [29, 41, 44, 30], stone, { hue: '#c7d3c2', at: [0.3, 0.2] });
      paint(ctx, r, RR(56, 58, 9, 13, 3), [56, 58, 9, 13], stone, { lw: 2, shine: false, over: lb });
      paint(ctx, r, E(27, 63, 8, 8), [19, 55, 16, 16], C.coral, { lw: 2, hue: '#e9967a', at: [0.3, 0.3] });
      brush(ctx, [[20, 61], [27, 64], [34, 66]], 1.4, 'rgba(240,200,110,0.9)'); brush(ctx, [[26, 56], [27, 63], [29, 70]], 1.4, 'rgba(240,200,110,0.9)');
      paint(ctx, r, RR(32, 54, 9, 16, 3), [32, 54, 9, 16], stone, { lw: 2, shine: false, over: lb });
      paint(ctx, r, E(34, 56, 6, 4), [28, 52, 12, 8], stone, { lw: 1.8, shine: false, over: RR(32, 54, 9, 16, 3) });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, x = 48 + Math.cos(a) * 18, y = 28 + Math.sin(a) * 16;
        paint(ctx, r, E(x, y, 6, 6), [x - 6, y - 6, 12, 12], mane, { lw: 1.6, shine: false });
        dab(ctx, x - 1, y - 1, 2.2, 2.2, 'rgba(220,235,225,0.45)');
      }
      paint(ctx, r, E(48, 28, 16, 14), [32, 14, 32, 28], stone, { hue: '#c7d3c2', at: [0.3, 0.2] });
      face(ctx, 48, 25, 1.1, { gap: 7, mouth: 'none' });
      ball(ctx, r, 48, 30, 4.4, 3, mane);
      const m = new Path2D(); m.moveTo(42, 35); m.quadraticCurveTo(48, 43, 54, 35); m.closePath();
      paint(ctx, r, m, [42, 35, 12, 7], '#d98a8a', { lw: 1.6, shine: false });
      ball(ctx, r, 48, 38, 2.6, 2.6, C.cream);
      const rb = new Path2D(); rb.moveTo(32, 42); rb.quadraticCurveTo(48, 50, 64, 42); rb.lineTo(64, 46.5); rb.quadraticCurveTo(48, 54.5, 32, 46.5); rb.closePath();
      paint(ctx, r, rb, [32, 42, 32, 12], C.coral, { lw: 1.6, shine: false });
      ball(ctx, r, 48, 52, 3.2, 3.2, C.mustard);
    }),

    // 小魔神仔：山裡愛惡作劇的小傢伙，紅紅的臉，頭頂一片大姑婆芋葉，拿雞腿騙你跟他走
    imp: () => canvas(96, 84, 209, (ctx, r) => {
      shadow(ctx, 46, 80, 20);
      const skin = '#d98466';
      limb(ctx, [[40, 64], [39, 75]], 4.4, skin, { end: [4.6, 2.6, skin, -2, 2] }); limb(ctx, [[52, 64], [53, 75]], 4.4, skin, { end: [4.6, 2.6, skin, 2, 2] });
      limb(ctx, [[34, 50], [28, 54], [26, 60]], 4, skin, { end: [3, 3, skin] });
      const dress = new Path2D(); dress.moveTo(35, 45); dress.lineTo(57, 45); dress.quadraticCurveTo(63, 56, 62, 67); dress.lineTo(30, 67); dress.quadraticCurveTo(29, 56, 35, 45); dress.closePath();
      paint(ctx, r, dress, [29, 45, 34, 22], C.grass, { hue: '#c2c97a', at: [0.5, 1], dir: 1.5 });
      [34, 39, 44, 49, 54, 59].forEach(x => brush(ctx, [[x, 58], [x + 1, 66.5]], 1.2, 'rgba(70,100,60,0.45)'));
      // 頭
      [[31, 32, -1], [61, 32, 1]].forEach(([x, y, k]) => {
        const p = new Path2D(); p.moveTo(x - k * 1, y - 4); p.lineTo(x + k * 8, y - 8); p.quadraticCurveTo(x + k * 4, y + 1, x - k * 1, y + 4); p.closePath();
        paint(ctx, r, p, [Math.min(x - k, x + k * 8), y - 8, 9, 12], skin, { lw: 1.8, shine: false });
      });
      paint(ctx, r, E(46, 34, 15, 13), [31, 21, 30, 26], skin, { hue: '#e9a07a', at: [0.3, 0.3] });
      face(ctx, 46, 34, 1.05, { eyes: 'wink', gap: 6, mouth: 'smirk', lipW: 2.6, lips: '#a8404a' });
      // 姑婆芋葉帽
      const leaf = new Path2D(); leaf.moveTo(-27, 5); leaf.quadraticCurveTo(-22, -17, 0, -17); leaf.quadraticCurveTo(24, -17, 28, 3); leaf.quadraticCurveTo(14, -1, 0, 3); leaf.quadraticCurveTo(-14, -1, -27, 5); leaf.closePath();
      paint(ctx, r, T(leaf, 46, 21, -7), [18, 3, 58, 24], '#4f9a7a', { hue: '#8fc49a', at: [0.3, 0.2], dir: -0.2 });
      ctx.save(); ctx.translate(46, 21); ctx.rotate(-0.12);
      brush(ctx, [[-21, 0], [18, -7]], 1.4, 'rgba(200,235,200,0.55)');
      [-12, -2, 8].forEach(x => brush(ctx, [[x, -3], [x + 5, -12]], 1, 'rgba(200,235,200,0.45)'));
      limb(ctx, [[26, 1], [31, 7]], 2.2, '#3f7f63'); ctx.restore();
      // 拿雞腿
      ctx.save(); ctx.translate(78, 37); ctx.rotate(-0.6);
      limb(ctx, [[-6, 3], [-11, 6]], 2.6, C.cream, { end: [2.2, 2.2, C.cream, -1, 0.6] });
      paint(ctx, r, E(0, 0, 7.4, 5.6), [-7, -6, 15, 12], '#c98a4a', { lw: 1.8, hue: '#a8603a', at: [0.7, 0.9] });
      ctx.restore();
      limb(ctx, [[57, 50], [66, 48], [72, 43]], 4, skin, { over: dress, end: [3, 3, skin] });
      [[84, 26, 88, 23], [87, 31, 91, 28]].forEach(([a, b, c, d]) => brush(ctx, [[a, b], [c, d]], 1.4, 'rgba(150,150,180,0.8)'));
    }),

    // 虎姑婆婆（頭目）：橘色老虎奶奶，頭上包髮髻插髮簪，戴圓眼鏡、披碎花披肩，提著一籃糖果
    tiger: () => canvas(120, 100, 210, (ctx, r) => {
      shadow(ctx, 60, 95, 36);
      const fur = '#ec9a52', stripe = 'rgba(160,80,40,0.85)';
      limb(ctx, [[84, 82], [110, 84], [107, 60]], 6, fur);
      [[103, 82], [109, 74], [108, 66]].forEach(([x, y]) => dab(ctx, x, y, 2.6, 1.2, stripe, 0.4));
      legs(ctx, [[[51, 84], [50, 92]], [[69, 84], [70, 92]]], 5, '#3c4466', '#5b4a52');
      const dress = new Path2D(); dress.moveTo(43, 50); dress.quadraticCurveTo(34, 76, 36, 88); dress.lineTo(84, 88); dress.quadraticCurveTo(86, 76, 77, 50); dress.closePath();
      paint(ctx, r, dress, [34, 50, 52, 38], '#6f5f9e', { hue: '#9b7fb8', at: [0.3, 0.3], dir: 1.4 });
      const sh = new Path2D(); sh.moveTo(37, 52); sh.quadraticCurveTo(60, 76, 83, 52); sh.quadraticCurveTo(76, 43, 60, 43); sh.quadraticCurveTo(44, 43, 37, 52); sh.closePath();
      paint(ctx, r, sh, [37, 43, 46, 24], C.pink, { hue: '#f0c0a0', at: [0.5, 1] });
      [[46, 52], [56, 59], [66, 57], [74, 51], [60, 49], [51, 46]].forEach(([x, y]) => {
        for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; dab(ctx, x + Math.cos(a) * 1.9, y + Math.sin(a) * 1.9, 1.3, 1.3, 'rgba(250,244,230,0.95)'); }
        dab(ctx, x, y, 1, 1, C.mustard);
      });
      // 手：一邊提糖果籃，一邊拿糖招手
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(14, 66); ctx.quadraticCurveTo(26, 50, 37, 66); ctx.stroke();
      ctx.strokeStyle = C.wood; ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
      [[19, 63, C.coral], [26, 61, '#5f9ea6'], [33, 63, C.mustard]].forEach(([x, y, c]) => {
        [-1, 1].forEach(k => { const p = new Path2D(); p.moveTo(x + k * 3, y); p.lineTo(x + k * 6.4, y - 2.2); p.lineTo(x + k * 6.4, y + 2.2); p.closePath(); paint(ctx, r, p, [x - 7, y - 3, 14, 6], c, { lw: 1, shine: false }); });
        ball(ctx, r, x, y, 3.6, 2.8, c);
      });
      const bk = new Path2D(); bk.moveTo(12, 66); bk.lineTo(39, 66); bk.lineTo(35, 81); bk.quadraticCurveTo(25, 83, 16, 81); bk.closePath();
      paint(ctx, r, bk, [12, 66, 27, 16], '#d9a066', { hue: '#b9805a', at: [0.5, 1], dir: 1.5 });
      [17, 23, 29, 34].forEach(x => brush(ctx, [[x, 68], [x - 0.6, 80]], 1.1, 'rgba(140,90,58,0.55)'));
      brush(ctx, [[14, 73], [37, 73]], 1.1, 'rgba(140,90,58,0.55)');
      const top = new Path2D(); top.addPath(dress); top.addPath(sh);
      limb(ctx, [[42, 55], [34, 62], [27, 64]], 5, fur, { over: top, end: [3.6, 3.4, fur, 1, 1] });
      limb(ctx, [[78, 55], [88, 52], [95, 44]], 5, fur, { over: top, end: [3.6, 3.6, fur, 1, -1] });
      [-1, 1].forEach(k => { const p = new Path2D(); p.moveTo(99 + k * 3, 38); p.lineTo(99 + k * 6.4, 35.8); p.lineTo(99 + k * 6.4, 40.2); p.closePath(); paint(ctx, r, p, [92, 35, 14, 6], '#8cc3a0', { lw: 1, shine: false }); });
      ball(ctx, r, 99, 38, 3.6, 2.8, '#8cc3a0');
      // 頭
      [[44, 15], [76, 15]].forEach(([x, y]) => { paint(ctx, r, E(x, y, 6.4, 6.4), [x - 6, y - 6, 13, 13], fur, { lw: 1.8, shine: false }); dab(ctx, x, y + 1, 3, 3, '#f3c8a8'); });
      paint(ctx, r, E(60, 28, 21, 18), [39, 10, 42, 36], fur, { hue: '#f0c27a', at: [0.5, 0.9] });
      // 條紋（用顏色畫，不描黑線）
      [[54, 15, 66, 15], [55, 19, 65, 19]].forEach(([a, b, c, d]) => brush(ctx, [[a, b], [c, d]], 2.2, stripe));
      brush(ctx, [[60, 12.5], [60, 21]], 2.2, stripe);
      [[40, 25, 47, 27], [40, 31, 46, 31], [80, 25, 73, 27], [80, 31, 74, 31]].forEach(([a, b, c, d]) => brush(ctx, [[a, b], [c, d]], 2.4, stripe));
      paint(ctx, r, E(60, 36, 10, 7), [50, 29, 20, 14], '#f6ebd8', { lw: 1.4, shine: false });
      [[51, 27], [69, 27]].forEach(([x, y]) => { ctx.fillStyle = 'rgba(255,250,240,0.35)'; ctx.fill(E(x, y, 6, 6)); ctx.save(); ctx.strokeStyle = '#a07a3a'; ctx.lineWidth = 1.4; ctx.stroke(E(x, y, 6, 6)); ctx.restore(); });
      brush(ctx, [[57, 27], [63, 27]], 1.3, '#a07a3a');
      face(ctx, 60, 27, 1.1, { eyes: 'happy', gap: 8.2, mouth: 'none' });
      ball(ctx, r, 60, 32.6, 2.8, 2, '#c9555e');
      brush(ctx, [[56, 37.5], [58, 39.5], [60, 37.4], [62, 39.5], [64, 37.5]], 1.3, INK);
      // 髮髻＋髮簪
      paint(ctx, r, E(60, 8, 10, 6), [50, 2, 20, 12], '#d8d2c8', { lw: 2 });
      brush(ctx, [[57, 8], [60, 5], [63, 8]], 1.1, 'rgba(110,105,120,0.6)');
      limb(ctx, [[47, 4], [74, 11]], 1.8, '#c49a4a');
      ball(ctx, r, 75, 11.4, 2.4, 2.4, C.coral);
    }),
  };

  // 名字（跟 shared/stats.js 的 MOBS 對應）
  const NAMES = { sticky: '便利貼精', seen: '已讀飄飄', wok: '甩鍋鍋', octo: '會議章魚', clock: '加班鬧鐘', boss: '急件老闆',
    monkey: '燈猴', lion: '石獅仔', imp: '小魔神仔', tiger: '虎姑婆婆' };

  root.HQ_FIELD_MOBS = {
    // scale：畫布解析度（預設兩倍），預覽圖可以畫大一點
    draw(kind, scale) { const s = SCALE; if (scale) SCALE = scale; try { return DRAW[kind] && DRAW[kind](); } finally { SCALE = s; } },
    kinds: Object.keys(DRAW), NAMES,
  };
})(this);
