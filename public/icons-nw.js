// 手繪 icon 第四批：3D 新世界的職業和招式（職業 'nwc-<代號>'、招式 'nw-<招式代號>'），座標都在 48x48 裡
(function (root) {
  const C = root.HQ_CRAYON;
  if (!C || !root.HQ_ICONS) return;
  // ---- 共用小零件 ----
  const poly = (x, pts) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); };
  const paint = (x, r, col, w) => { C.fill(x, col, r, null); C.stroke(x, r, w || 2.2); };
  const dot = (x, cx, cy, s, col) => { x.beginPath(); x.ellipse(cx, cy, s, s, 0, 0, Math.PI * 2); x.fillStyle = col; x.fill(); };
  const star = (x, cx, cy, R, n, k) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? R * (k || 0.45) : R; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } poly(x, pts); };
  const heart = (x, cx, cy, s) => { x.beginPath(); x.moveTo(cx, cy + s); x.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.8, cy - s * 1.2, cx, cy - s * 0.4); x.bezierCurveTo(cx + s * 0.8, cy - s * 1.2, cx + s * 1.5, cy - s * 0.1, cx, cy + s); x.closePath(); };
  const skull = (x, r, cx, cy, s) => { C.blob(x, cx, cy, s, s * 0.95, r, 0.04); paint(x, r, '#fbf7ee', 1.8); C.rect(x, cx - s * 0.5, cy + s * 0.6, s, s * 0.55, r, 0.3); paint(x, r, '#fbf7ee', 1.6); dot(x, cx - s * 0.38, cy, s * 0.24, C.INK); dot(x, cx + s * 0.38, cy, s * 0.24, C.INK); };
  const bottle = (x, r, cx, cy, col) => { C.rect(x, cx - 4, cy - 15, 8, 7, r, 0.4); paint(x, r, '#e8dcc0', 1.8); C.blob(x, cx, cy + 3, 12, 12, r, 0.04); paint(x, r, col); C.blob(x, cx - 4, cy - 1, 3, 2, r, 0.1); x.fillStyle = 'rgba(255,255,255,.8)'; x.fill(); };
  const box3 = (x, r, cx, cy, s, col) => { poly(x, [[cx - s, cy - s * 0.5], [cx, cy - s], [cx + s, cy - s * 0.5], [cx + s, cy + s * 0.55], [cx, cy + s], [cx - s, cy + s * 0.55]]); paint(x, r, col); C.line(x, cx - s, cy - s * 0.5, cx, cy, r, 1.6); C.line(x, cx + s, cy - s * 0.5, cx, cy, r, 1.6); C.line(x, cx, cy, cx, cy + s, r, 1.6); };
  const ringOf = (x, r, cx, cy, R, col) => { C.blob(x, cx, cy, R, R, r, 0.03); C.stroke(x, r, 2.2, col); };
  const DRAW = {
    // ---- 職業 ----
    'nwc-sprout'(x, r) { C.line(x, 24, 42, 24, 22, r, 3, '#5f9c57'); x.beginPath(); x.moveTo(24, 24); x.quadraticCurveTo(8, 22, 9, 9); x.quadraticCurveTo(24, 10, 24, 24); paint(x, r, '#9fdc9a'); x.beginPath(); x.moveTo(24, 26); x.quadraticCurveTo(40, 26, 40, 13); x.quadraticCurveTo(26, 13, 24, 26); paint(x, r, '#c7ec9a'); },
    'nwc-pm'(x, r) { bottle(x, r, 18, 26, '#b07ae6'); bottle(x, r, 33, 28, '#ff9ec4'); },
    'nwc-sc'(x, r) { box3(x, r, 20, 22, 12, '#9cc4ff'); C.rect(x, 26, 26, 16, 18, r, 0.6); paint(x, r, '#fbf3e4'); C.line(x, 29, 31, 39, 31, r, 1.4); C.line(x, 29, 35, 39, 35, r, 1.4); dot(x, 37, 40, 2.6, '#d23a4a'); },
    'nwc-ae'(x, r) { ringOf(x, r, 24, 24, 17, C.INK); star(x, 24, 24, 15, 3, 0.5); C.stroke(x, r, 1.8, '#d9a23a'); C.rect(x, 17, 17, 14, 14, r, 0.5); paint(x, r, '#ffd76a'); },
    'nwc-skater'(x, r) { star(x, 17, 19, 12, 6, 0.4); paint(x, r, '#cdeeff', 1.8); C.blob(x, 33, 31, 9, 9, r, 0.05); paint(x, r, '#b07ae6'); dot(x, 30, 30, 1.8, C.INK); dot(x, 36, 30, 1.8, C.INK); },
    'nwc-healer'(x, r) { star(x, 24, 22, 17, 5, 0.48); paint(x, r, '#ffe27a'); heart(x, 24, 24, 6); paint(x, r, '#ff9ec4', 1.6); },
    'nwc-barrier'(x, r) { box3(x, r, 24, 24, 16, '#9cc4ff'); },
    'nwc-summoner'(x, r) { star(x, 24, 17, 12, 5, 0.6); paint(x, r, '#f6a9c0'); dot(x, 20, 16, 1.8, C.INK); dot(x, 28, 16, 1.8, C.INK); C.rect(x, 20, 27, 8, 15, r, 0.4); paint(x, r, '#2f5d3a'); },
    'nwc-alchemist'(x, r) { C.rect(x, 9, 8, 30, 32, r, 0.8); paint(x, r, '#57496f'); C.rect(x, 15, 13, 18, 9, r, 0.5); paint(x, r, '#1d1a2b', 1.6); dot(x, 20, 17.5, 2, '#c9a2f2'); dot(x, 28, 17.5, 2, '#c9a2f2'); heart(x, 24, 31, 5.5); paint(x, r, '#e2506a', 1.6); },
    'nwc-puppeteer'(x, r) { C.line(x, 8, 9, 40, 9, r, 3.2, '#8a5a3c'); C.line(x, 14, 9, 17, 26, r, 1.4, '#d9a23a'); C.line(x, 34, 9, 31, 26, r, 1.4, '#d9a23a'); C.line(x, 24, 9, 24, 20, r, 1.4, '#d9a23a'); C.blob(x, 24, 26, 7, 7, r, 0.05); paint(x, r, '#fbf3e4'); C.rect(x, 19, 32, 10, 11, r, 0.5); paint(x, r, '#f08aa8'); },
    // ---- 芽 ----
    'nw-spark'(x, r) { x.beginPath(); x.moveTo(24, 5); x.quadraticCurveTo(40, 22, 34, 34); x.quadraticCurveTo(30, 44, 22, 43); x.quadraticCurveTo(9, 40, 12, 26); x.quadraticCurveTo(15, 28, 17, 22); x.quadraticCurveTo(18, 12, 24, 5); paint(x, r, '#ff9a4a'); C.blob(x, 24, 33, 6, 8, r, 0.06); x.fillStyle = '#ffe27a'; x.fill(); },
    'nw-blink'(x, r) { C.blob(x, 14, 30, 8, 10, r, 0.06); C.stroke(x, r, 1.8, '#b79cf0'); C.blob(x, 32, 22, 9, 11, r, 0.05); paint(x, r, '#d5c2ff'); C.line(x, 16, 14, 24, 12, r, 2, '#b79cf0'); C.line(x, 14, 20, 21, 19, r, 2, '#b79cf0'); star(x, 39, 9, 5, 4, 0.4); paint(x, r, '#fff3c4', 1.4); },
    // ---- 毒與藥 ----
    'nw-bubble'(x, r) { C.blob(x, 24, 24, 18, 18, r, 0.03); paint(x, r, '#c9a2f2'); skull(x, r, 24, 23, 8.5); C.blob(x, 13, 13, 3.5, 2.4, r, 0.1); x.fillStyle = 'rgba(255,255,255,.8)'; x.fill(); },
    'nw-potion'(x, r) { bottle(x, r, 24, 27, '#ff9ec4'); heart(x, 24, 31, 5); x.fillStyle = '#fff'; x.fill(); },
    'nw-scent'(x, r) { bottle(x, r, 22, 30, '#e7d4ff'); [[32, 12, 5], [38, 20, 3.5], [30, 4, 3]].forEach(([a, b, s]) => { C.blob(x, a, b, s, s, r, 0.08); C.stroke(x, r, 1.6, '#9a6fd0'); }); },
    'nw-waltz'(x, r) { ringOf(x, r, 24, 26, 16, '#7fc4e8'); x.beginPath(); x.moveTo(10, 30); x.quadraticCurveTo(24, 40, 40, 26); x.lineTo(40, 31); x.quadraticCurveTo(24, 46, 9, 35); x.closePath(); paint(x, r, '#dff4ff', 1.8); star(x, 24, 18, 9, 6, 0.4); paint(x, r, '#cdeeff', 1.6); },
    'nw-ball'(x, r) { star(x, 24, 24, 19, 6, 0.42); paint(x, r, '#bfe9ff'); star(x, 24, 24, 8, 6, 0.5); paint(x, r, '#ffffff', 1.6); },
    'nw-corrode'(x, r) { x.beginPath(); x.moveTo(24, 5); x.quadraticCurveTo(40, 26, 34, 36); x.quadraticCurveTo(24, 46, 14, 36); x.quadraticCurveTo(8, 26, 24, 5); paint(x, r, '#7fd08a'); skull(x, r, 24, 29, 6.5); },
    'nw-firework'(x, r) { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; C.line(x, 24 + Math.cos(a) * 11, 22 + Math.sin(a) * 11, 24 + Math.cos(a) * 19, 22 + Math.sin(a) * 19, r, 2.4, ['#b07ae6', '#7fd08a', '#ff9ec4'][i % 3]); } skull(x, r, 24, 21, 8); },
    'nw-heart'(x, r) { C.blob(x, 24, 24, 18, 18, r, 0.03); paint(x, r, '#ffd9e8'); heart(x, 24, 25, 10); paint(x, r, '#ff9ec4'); C.blob(x, 13, 13, 3.5, 2.4, r, 0.1); x.fillStyle = 'rgba(255,255,255,.85)'; x.fill(); },
    'nw-lamp'(x, r) { C.line(x, 24, 3, 24, 11, r, 2); C.rect(x, 13, 11, 22, 28, r, 0.8); paint(x, r, '#fff3c4'); star(x, 24, 25, 9, 5, 0.48); paint(x, r, '#ffe27a', 1.8); C.rect(x, 16, 39, 16, 4, r, 0.4); paint(x, r, '#d9a23a', 1.6); },
    'nw-meteor'(x, r) { C.line(x, 6, 8, 22, 22, r, 3, '#ffd76a'); C.line(x, 14, 5, 27, 18, r, 2, '#ffe9a8'); C.line(x, 4, 17, 18, 27, r, 2, '#ffe9a8'); star(x, 30, 30, 13, 5, 0.48); paint(x, r, '#ffe27a'); },
    // ---- 封印與契約 ----
    'nw-seal'(x, r) { box3(x, r, 24, 24, 15, '#cfe2ff'); C.blob(x, 24, 27, 4, 4, r, 0.08); x.fillStyle = '#7fb4ff'; x.fill(); },
    'nw-pact'(x, r) { C.rect(x, 10, 7, 28, 34, r, 0.8); paint(x, r, '#fbf3e4'); C.line(x, 15, 15, 33, 15, r, 1.6); C.line(x, 15, 21, 33, 21, r, 1.6); C.line(x, 15, 27, 26, 27, r, 1.6); C.blob(x, 30, 33, 5, 5, r, 0.08); paint(x, r, '#d23a4a', 1.6); },
    'nw-lock'(x, r) { box3(x, r, 24, 24, 17, '#9cc4ff'); [[16, 22], [24, 30], [32, 22]].forEach(([a, b]) => dot(x, a, b, 2.4, C.INK)); C.line(x, 6, 6, 13, 13, r, 2.4, '#4f7cc2'); C.line(x, 42, 6, 35, 13, r, 2.4, '#4f7cc2'); },
    'nw-lock2'(x, r) { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.3; C.line(x, 24 + Math.cos(a) * 20, 24 + Math.sin(a) * 20, 24 + Math.cos(a) * 12, 24 + Math.sin(a) * 12, r, 2.6, '#4f7cc2'); } box3(x, r, 24, 24, 8, '#ffffff'); },
    'nw-cliff'(x, r) { poly(x, [[8, 42], [8, 14], [16, 6], [24, 12], [32, 6], [40, 14], [40, 42]]); paint(x, r, '#9cc4ff'); C.line(x, 8, 24, 40, 24, r, 1.6); C.line(x, 8, 33, 40, 33, r, 1.6); C.line(x, 20, 12, 20, 24, r, 1.4); C.line(x, 30, 24, 30, 33, r, 1.4); },
    'nw-box'(x, r) { C.rect(x, 8, 18, 32, 24, r, 0.8); paint(x, r, '#57496f'); poly(x, [[6, 18], [12, 8], [36, 8], [42, 18]]); paint(x, r, '#6c5c8c'); C.rect(x, 20, 22, 8, 10, r, 0.4); paint(x, r, '#e9c46a', 1.8); C.line(x, 8, 30, 20, 30, r, 1.6, '#e9c46a'); C.line(x, 28, 30, 40, 30, r, 1.6, '#e9c46a'); },
    'nw-pact2'(x, r) { DRAW['nw-pact'](x, r); star(x, 37, 11, 8, 5, 0.48); paint(x, r, '#9fdc9a', 1.6); },
    'nw-bond'(x, r) { heart(x, 24, 26, 15); paint(x, r, '#ff9ec4'); C.blob(x, 17, 23, 3.4, 3.4, r, 0.08); x.fillStyle = '#fff'; x.fill(); C.blob(x, 31, 23, 3.4, 3.4, r, 0.08); x.fillStyle = '#fff'; x.fill(); C.line(x, 17, 23, 31, 23, r, 1.6, '#fff'); },
    'nw-envoy'(x, r) { ringOf(x, r, 24, 13, 10, '#3f8a4f'); dot(x, 24, 4, 2.4, '#d23a4a'); dot(x, 15, 17, 2.2, '#d23a4a'); dot(x, 33, 17, 2.2, '#d23a4a'); C.blob(x, 24, 22, 7, 8, r, 0.05); paint(x, r, '#6fbf6a'); poly(x, [[14, 44], [17, 29], [31, 29], [34, 44]]); paint(x, r, '#f3a5b8'); },
    // ---- 鍊金與附魔 ----
    'nw-transmute'(x, r) { ringOf(x, r, 24, 30, 16, '#d9a23a'); C.rect(x, 15, 6, 18, 20, r, 0.7); paint(x, r, '#a8a39a'); C.line(x, 21, 16, 21, 26, r, 1.6); C.line(x, 27, 16, 27, 26, r, 1.6); C.line(x, 14, 36, 34, 36, r, 2, '#d9a23a'); },
    'nw-enchant'(x, r) { poly(x, [[22, 6], [30, 6], [30, 20], [38, 20], [26, 44], [28, 28], [18, 28]]); paint(x, r, '#ffd76a'); star(x, 11, 13, 6, 4, 0.4); paint(x, r, '#fff3c4', 1.4); star(x, 39, 36, 5, 4, 0.4); paint(x, r, '#fff3c4', 1.4); },
    'nw-shelter'(x, r) { x.beginPath(); x.moveTo(24, 5); x.quadraticCurveTo(34, 11, 41, 10); x.quadraticCurveTo(42, 34, 24, 44); x.quadraticCurveTo(6, 34, 7, 10); x.quadraticCurveTo(14, 11, 24, 5); paint(x, r, '#8a78b4'); dot(x, 19, 21, 2.4, '#c9a2f2'); dot(x, 29, 21, 2.4, '#c9a2f2'); },
    'nw-exchange'(x, r) { ringOf(x, r, 24, 24, 19, '#b84300'); heart(x, 15, 25, 7); paint(x, r, '#e2506a', 1.8); C.rect(x, 27, 18, 13, 13, r, 0.5); paint(x, r, '#57496f', 1.8); C.line(x, 19, 11, 30, 11, r, 2); C.line(x, 30, 37, 19, 37, r, 2); },
    'nw-fear'(x, r) { x.beginPath(); x.moveTo(8, 42); x.quadraticCurveTo(4, 8, 24, 6); x.quadraticCurveTo(44, 8, 40, 42); x.lineTo(34, 36); x.lineTo(29, 42); x.lineTo(24, 36); x.lineTo(19, 42); x.lineTo(14, 36); x.closePath(); paint(x, r, '#3a3350'); dot(x, 17, 21, 3.4, '#ff5a5a'); dot(x, 31, 21, 3.4, '#ff5a5a'); },
    'nw-stitch'(x, r) { C.line(x, 6, 24, 42, 24, r, 2, '#8d877d'); [[12, 0], [20, 0], [28, 0], [36, 0]].forEach(([a]) => { C.line(x, a - 3, 17, a + 3, 31, r, 2.2, '#d23a4a'); }); C.line(x, 30, 6, 42, 12, r, 2.6, '#c9c4b8'); },
    'nw-string'(x, r) { C.line(x, 8, 7, 40, 7, r, 3.2, '#8a5a3c'); [14, 24, 34].forEach(a => C.line(x, a, 7, a === 24 ? 24 : a + (a < 24 ? 3 : -3), 24, r, 1.4, '#d9a23a')); C.blob(x, 24, 30, 9, 8, r, 0.06); paint(x, r, '#8fb7d8'); dot(x, 21, 29, 1.8, C.INK); dot(x, 27, 29, 1.8, C.INK); },
    'nw-string2'(x, r) { C.blob(x, 31, 17, 9, 8, r, 0.06); paint(x, r, '#8fb7d8'); dot(x, 28, 16, 1.8, C.INK); dot(x, 34, 16, 1.8, C.INK); C.line(x, 6, 40, 20, 26, r, 2.6, '#d9a23a'); C.line(x, 6, 30, 14, 24, r, 2, '#d9a23a'); C.line(x, 16, 42, 24, 34, r, 2, '#d9a23a'); },
    'nw-curtain'(x, r) { poly(x, [[5, 6], [22, 6], [20, 24], [14, 42], [5, 42]]); paint(x, r, '#c8323c'); poly(x, [[43, 6], [26, 6], [28, 24], [34, 42], [43, 42]]); paint(x, r, '#c8323c'); C.line(x, 19, 30, 31, 20, r, 2.4, '#c9c4b8'); C.line(x, 19, 20, 31, 30, r, 2.4, '#c9c4b8'); },
  };
  root.HQ_ICONS.add(DRAW);
})(this);
