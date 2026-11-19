// ===== 總部：前院那棟兩層小樓的外觀，和走進門之後的大廳 =====
// 大廳是一個大空間分角落：客廳（中間）、廚房吧台（左）、作戰角（右後，高半層）、導師和扭蛋（後牆）、陽台（右邊）
// 第一期只做空間，沒有接任何功能和存檔。座標：大廳自己的原點在房間正中央，擺在世界的 (0, 0, OZ)

// 前院的小樓外觀（兩層）。門的位置跟原本的小屋一樣，進門的互動點不用動
function hqHouse(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -0.25; scene.add(g);
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), glow = (c) => basic(c);
  part(g, B(3, 1.4, 2.3), '#f4e9d2', { pos: [0, 0.7, 0], line: 0.035 });                          // 一樓：米白牆
  part(g, B(3.04, 0.34, 2.34), '#9fbf9a', { pos: [0, 0.17, 0], noLine: true });                   // 牆腳一圈綠色腰帶
  part(g, B(3.3, 0.12, 2.6), '#a8693f', { pos: [0, 1.46, 0], line: 0.03 });                       // 樓板
  part(g, B(3.16, 1.25, 2.46), '#d9925a', { pos: [0, 2.14, 0], line: 0.035 });                    // 二樓：木板牆，往外凸一點
  const roof = new THREE.Shape(); roof.moveTo(-1.75, 0); roof.lineTo(1.75, 0); roof.lineTo(0, 1.15); roof.lineTo(-1.75, 0);
  const rg = new THREE.ExtrudeGeometry(roof, { depth: 3.7, bevelEnabled: false }); rg.translate(0, 0, -1.85);
  part(g, rg, PAL.roof, { pos: [0, 2.76, 0], rot: [0, Math.PI / 2, 0], scale: [0.86, 1, 1], line: 0.035 });
  part(g, new THREE.CylinderGeometry(0.16, 0.16, 1.0, 12), '#c9ced2', { pos: [-0.95, 3.5, -0.35], line: 0.025 });   // 屋頂的銀色排風管
  part(g, new THREE.CylinderGeometry(0.21, 0.21, 0.1, 12), '#aab1b6', { pos: [-0.95, 4.0, -0.35], line: 0.02 });
  // 門、雨遮、門邊的燈
  part(g, B(0.66, 1.12, 0.08), '#7a4b2e', { pos: [0.5, 0.56, 1.16], line: 0.02 });
  part(g, sph(0.04, 8, 6), '#f0c75a', { pos: [0.72, 0.56, 1.22], noLine: true, shadow: false });
  part(g, B(1.0, 0.07, 0.5), '#e0604a', { pos: [0.5, 1.32, 1.36], rot: [0.32, 0, 0], line: 0.02 });
  part(g, sph(0.09, 10, 8), '#ffe9a8', { pos: [1.05, 1.0, 1.22], line: 0.016, shadow: false, mat: glow('#ffe9a8') });
  // 窗：裡面亮著暖黃的燈
  const win = (wx, wy, w, h) => { part(g, B(w + 0.12, h + 0.12, 0.07), '#5b4636', { pos: [wx, wy, 1.17 + (wy > 1.5 ? 0.08 : 0)], line: 0.018 });
    part(g, B(w, h, 0.08), '#ffe2a0', { pos: [wx, wy, 1.18 + (wy > 1.5 ? 0.08 : 0)], noLine: true, shadow: false, mat: glow('#ffe2a0') });
    part(g, B(0.04, h, 0.1), '#5b4636', { pos: [wx, wy, 1.18 + (wy > 1.5 ? 0.08 : 0)], noLine: true, shadow: false }); };
  win(-0.7, 0.86, 0.8, 0.6); win(-0.75, 2.2, 0.7, 0.62); win(0.6, 2.2, 0.7, 0.62);
  // 窗台的花箱
  part(g, B(0.95, 0.14, 0.2), '#a8693f', { pos: [-0.7, 0.46, 1.26], line: 0.016 });
  [-1.0, -0.7, -0.4].forEach((a, i) => part(g, sph(0.11, 8, 6), ['#8fae5a', '#f6b3c0', '#8fae5a'][i], { pos: [a, 0.58, 1.27], noLine: true, shadow: false }));
  // 門牌：紙條風
  const t = tex(192, 80, (c, w, h) => { c.fillStyle = '#f7ecd0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a8693f'; c.lineWidth = 7; c.strokeRect(4, 4, w - 8, h - 8);
    c.fillStyle = '#5b4636'; c.font = '700 44px "Noto Sans TC", "PingFang TC", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('總部', w / 2, h / 2 + 3); });
  part(g, B(0.5, 0.21, 0.04), '#f7ecd0', { pos: [-0.12, 1.15, 1.18], line: 0.014, shadow: false, mat: [0, 1, 2, 3, 4, 5].map(i => (i === 4 ? new THREE.MeshToonMaterial({ map: t, gradientMap: RAMP }) : mat('#e5cfa0'))) });
}

// 前院的許願池：一口石頭井，有小屋頂和水桶；跟總部的許願池是同一個（同一批願望）
function wishWell(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = 0.35; scene.add(g);
  const STONE = ['#cfc6b4', '#bdb3a0', '#d9d1c0'], r = rnd(61), WOOD = '#a8693f';
  part(g, new THREE.CylinderGeometry(1.5, 1.6, 0.14, 20), '#e3d9bf', { pos: [0, 0.07, 0], line: 0.03, shadow: false });
  part(g, new THREE.LatheGeometry([[0.86, 0], [1.14, 0], [1.2, 0.5], [1.14, 0.98], [1.22, 1.0], [1.22, 1.12], [0.86, 1.12], [0.86, 0]].map(([a, b]) => new THREE.Vector2(a, b)), 20), STONE[0], { pos: [0, 0.1, 0], line: 0.035 });
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + (r() - 0.5) * 0.2, y = 0.3 + (i % 3) * 0.26 + r() * 0.06; part(g, sph(0.2, 7, 5), STONE[1 + (i % 2)], { pos: [Math.sin(a) * 1.13, y, Math.cos(a) * 1.13], scale: [1.2, 0.7, 0.45], rot: [0, a, 0], noLine: true, shadow: false }); }
  part(g, new THREE.CircleGeometry(0.9, 20), '#7fc3d8', { pos: [0, 0.95, 0], rot: [-Math.PI / 2, 0, 0], noLine: true, shadow: false, mat: basic('#8fd0e0') });
  [[0.3, 0.2, 0.2], [-0.35, -0.1, 0.14], [0.05, -0.45, 0.17]].forEach(([a, b, s]) => part(g, new THREE.RingGeometry(s, s + 0.03, 16), '#ffffff', { pos: [a, 0.96, b], rot: [-Math.PI / 2, 0, 0], noLine: true, shadow: false, mat: basic('#e6f7fb') }));
  [[0.45, -0.25], [-0.2, 0.4], [-0.5, -0.3]].forEach(([a, b]) => part(g, new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10), '#f2c14e', { pos: [a, 0.965, b], noLine: true, shadow: false, mat: basic('#ffd86a') }));
  [-1, 1].forEach(k => part(g, new THREE.BoxGeometry(0.16, 2.5, 0.16), WOOD, { pos: [1.2 * k, 1.35, 0], line: 0.026 }));
  part(g, new THREE.CylinderGeometry(0.07, 0.07, 2.5, 8), '#8a5f3d', { pos: [0, 2.2, 0], rot: [0, 0, Math.PI / 2], line: 0.02 });
  part(g, new THREE.CylinderGeometry(0.014, 0.014, 0.8, 4), '#e5d6b4', { pos: [0.2, 1.8, 0], noLine: true, shadow: false });
  part(g, new THREE.CylinderGeometry(0.2, 0.16, 0.3, 10), '#c98a52', { pos: [0.2, 1.3, 0], line: 0.022 }); part(g, new THREE.TorusGeometry(0.19, 0.02, 5, 12), '#8d9aa0', { pos: [0.2, 1.38, 0], rot: [Math.PI / 2, 0, 0], noLine: true, shadow: false });
  [-1, 1].forEach(k => part(g, new THREE.BoxGeometry(3.2, 0.1, 1.2), k > 0 ? '#c9604a' : '#b8433c', { pos: [0, 2.95, 0.48 * k], rot: [0.62 * k, 0, 0], line: 0.03 }));
  part(g, new THREE.BoxGeometry(3.3, 0.12, 0.16), '#8a3a30', { pos: [0, 3.3, 0], noLine: true });
  return g;
}
const LOBBY = TW ? (() => {
  const OZ = -55, HW = 20, HD = 12, WH = 6.4, PH = 1.0, PI = Math.PI, T0 = performance.now();
  const G = new THREE.Group(); G.position.set(0, 0, OZ); G.visible = false; scene.add(G);
  const walls = [], rounds = [], seats = [];
  const wall = (x, z, hx, hz) => walls.push({ x, z: z + OZ, hx, hz, ry: 0 });
  const round = (x, z, r) => rounds.push({ x, z: z + OZ, r });
  // top：椅面離那塊地板多高；fwd：屁股離椅子中心往前多少（要坐在前緣，小腿才會垂在椅子外面，不會插進椅墊）
  const seat = (x, z, f, top, fwd = 0.27) => seats.push({ x: x + Math.sin(f) * fwd, z: z + Math.cos(f) * fwd + OZ, f, h: top - 0.41 });

  // ---- 把同一種畫法的零件併成一塊：整個大廳的家具只要畫幾次，不會因為東西多就變慢 ----
  const mkB = () => ({ p: [], n: [], u: [], c: [], t: [], i: [], nv: 0 }), BK = { cast: mkB(), flat: mkB(), glow: mkB(), pool: mkB(), line: mkB() };
  const st = [new THREE.Matrix4()], top = () => st[st.length - 1], _n = new THREE.Matrix3(), _c = new THREE.Color(), _v = new V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3(), _p = new V3();
  const local = (o) => { _p.set(...(o.pos || [0, 0, 0])); _e.set(...(o.rot || [0, 0, 0])); _q.setFromEuler(_e); const s = o.scale == null ? [1, 1, 1] : Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]; _s.set(...s);
    return new THREE.Matrix4().compose(_p, _q, _s).premultiply(top()); };
  const put = (b, geo, m, color, th) => { const pa = geo.attributes.position, na = geo.attributes.normal, ua = geo.attributes.uv, ix = geo.index; _n.getNormalMatrix(m); _c.set(color);
    for (let i = 0; i < pa.count; i++) { _v.fromBufferAttribute(pa, i).applyMatrix4(m); b.p.push(_v.x, _v.y, _v.z); _v.fromBufferAttribute(na, i).applyMatrix3(_n).normalize(); b.n.push(_v.x, _v.y, _v.z);
      b.u.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0); b.c.push(_c.r, _c.g, _c.b); b.t.push(th || 0); }
    if (ix) for (let k = 0; k < ix.count; k++) b.i.push(ix.getX(k) + b.nv); else for (let k = 0; k < pa.count; k++) b.i.push(k + b.nv); b.nv += pa.count; };
  // p：加一個零件。o: pos, rot, scale, line（外框粗細）, noLine, shadow:false（不投影子）, glow（自己會亮）, pool（地上的光暈）
  const p = (geo, color, o = {}) => { const m = local(o); put(o.glow ? BK.glow : o.pool ? BK.pool : o.shadow === false ? BK.flat : BK.cast, geo, m, color);
    if (!o.noLine && !o.pool && (!o.glow || o.line)) put(BK.line, geo, m, color, (o.line ?? 0.03) * +(Q.lw || 1)); geo.dispose(); };
  const grp = (pos, ry, fn) => { st.push(new THREE.Matrix4().makeRotationY(ry || 0).setPosition(...pos).premultiply(top())); fn(); st.pop(); };
  // T：有貼圖的面（地板、花磚、畫），一張一張獨立畫
  const T = (geo, map, o = {}) => { const m = new THREE.Mesh(geo, o.basic ? new THREE.MeshBasicMaterial({ map, ...(o.extra || {}) }) : new THREE.MeshToonMaterial({ map, gradientMap: RAMP, ...(o.extra || {}) }));
    m.applyMatrix4(local(o)); m.receiveShadow = true; m.castShadow = false; G.add(m); return m; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl = (a, b, h, n = 12) => new THREE.CylinderGeometry(a, b, h, n), plane = (w, h) => new THREE.PlaneGeometry(w, h);
  const FLOOR = [-PI / 2, 0, 0], EAST = [0, PI / 2, 0];   // 平放在地上；貼在西牆上（朝東）

  // ---- 配色 ----
  const CREAM = '#f4e9d2', LINEN = '#efe3cc', PALE = '#e2bd8a', TEAK = '#b8693a', WALNUT = '#8a5a3c', STEEL = '#3b3a40', SILVER = '#c9ced2', BEIGE = '#e6d3ad', BROWN = '#8a5b3a',
    SAGE = '#8fb096', RED = '#d8574f', BLUE = '#9cc3d6', NAVY = '#3d5f86', MUST = '#e2b24a', CARAMEL = '#c98a4f', LEAF = '#6f9a52', LEAF2 = '#8fb565', POT = '#c9764a', WARM = '#ffe9a8';

  // ---- 貼圖 ----
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  // 木地板：一條一條的木板，顏色深淺不一
  const woodTex = (base, rep) => tex(512, 512, (c, w, h, r) => { const rows = 8, rh = h / rows; for (let i = 0; i < rows; i++) { let x = -r() * 200; while (x < w) { const len = 150 + r() * 200, k = r();
      c.fillStyle = base[(k * base.length) | 0]; c.fillRect(x, i * rh, len, rh); c.fillStyle = 'rgba(90,55,30,0.35)'; c.fillRect(x + len - 2, i * rh, 2, rh);
      c.strokeStyle = 'rgba(120,75,40,0.12)'; c.lineWidth = 1.5; for (let j = 0; j < 3; j++) { const yy = i * rh + 8 + r() * (rh - 16); c.beginPath(); c.moveTo(x + 6, yy); c.bezierCurveTo(x + len * 0.3, yy + 4, x + len * 0.6, yy - 4, x + len - 6, yy); c.stroke(); } x += len; }
      c.fillStyle = 'rgba(90,55,30,0.4)'; c.fillRect(0, i * rh, w, 2); } }, rep);
  // 花磚一：米白小方磚、綠色十字線、交叉點一朵紅色四瓣花
  const tileA = (rep) => tex(256, 256, (c, w) => { const n = 4, s = w / n; c.fillStyle = '#f8f2e6'; c.fillRect(0, 0, w, w);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (i === 0 && j === 0) continue; c.fillStyle = i === 0 || j === 0 ? '#b9c873' : '#eedcbc'; rr(c, i * s + 3, j * s + 3, s - 6, s - 6, 7); c.fill(); }
    const cx = s / 2, cy = s / 2; c.fillStyle = '#f8f2e6'; c.fillRect(0, 0, s, s);
    [['#c4473f', 27], ['#dd6a5f', 22]].forEach(([col, rad]) => { c.fillStyle = col; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { c.beginPath(); c.arc(cx + a * 15, cy + b * 15, rad * 0.72, 0, 7); c.fill(); }); c.beginPath(); c.arc(cx, cy, rad * 0.6, 0, 7); c.fill(); }); }, rep);
  // 花磚二：綠葉、米白鬱金香、三顆灰點
  const tileB = (rep) => tex(256, 256, (c, w) => { c.fillStyle = '#d6d0c0'; c.fillRect(0, 0, w, w);
    const motif = (cx, cy) => { c.fillStyle = '#3f9a73'; rr(c, cx - 5, cy + 2, 10, 44, 4); c.fill();
      [-1, 1].forEach(k => { c.save(); c.translate(cx + k * 34, cy + 26); c.rotate(k * -0.75); c.beginPath(); c.ellipse(0, 0, 30, 17, 0, 0, 7); c.fill(); c.restore(); });
      c.fillStyle = '#efe6c8'; c.beginPath(); c.moveTo(cx - 30, cy - 34); c.lineTo(cx - 14, cy - 22); c.lineTo(cx, cy - 36); c.lineTo(cx + 14, cy - 22); c.lineTo(cx + 30, cy - 34); c.bezierCurveTo(cx + 32, cy + 6, cx + 16, cy + 6, cx, cy + 6); c.bezierCurveTo(cx - 16, cy + 6, cx - 32, cy + 6, cx - 30, cy - 34); c.fill();
      c.fillStyle = '#6f7480'; [-20, 0, 20].forEach(a => { c.beginPath(); c.ellipse(cx + a, cy - 52, 8, 5, 0, 0, 7); c.fill(); }); };
    for (let j = -1; j < 3; j++) for (let i = -1; i < 3; i++) motif(i * 128 + (j % 2 ? 0 : 64), j * 128 + 64); }, rep);
  // 淺藍地毯：淺藍底，疊一塊深藍和一塊更淺的
  const rugTex = tex(512, 384, (c, w, h) => { c.fillStyle = '#9cc3d6'; c.fillRect(0, 0, w, h); c.fillStyle = '#c4dde3'; c.fillRect(0, h * 0.58, w * 0.3, h * 0.42);
    c.fillStyle = '#3d5f86'; c.fillRect(w * 0.2, 0, w * 0.5, h * 0.46); c.fillStyle = '#87b3cb'; c.fillRect(w * 0.62, h * 0.3, w * 0.38, h * 0.34); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); });
  // 抽象畫：粉、藍、土黃的色塊
  const paintTex = tex(512, 256, (c, w, h, r) => { c.fillStyle = '#f3ead8'; c.fillRect(0, 0, w, h);
    const blob = (col, x, y, a, b, rot) => { c.fillStyle = col; c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.ellipse(0, 0, a, b, 0, 0, 7); c.fill(); c.restore(); };
    blob('#f2b7b0', 150, 150, 60, 95, 0.1); blob('#7fa9cf', 255, 150, 55, 85, -0.2); blob('#d9b06a', 420, 170, 70, 70, 0); blob('#2f6b4f', 430, 60, 60, 26, -0.3);
    c.fillStyle = '#5d86b5'; c.beginPath(); c.moveTo(40, 230); c.lineTo(95, 110); c.lineTo(150, 230); c.fill(); blob('#33496b', 70, 70, 34, 34, 0); blob('#f3ead8', 70, 70, 20, 20, 0);
    blob('#b5564b', 335, 150, 28, 28, 0); blob('#f3ead8', 335, 150, 16, 16, 0); c.strokeStyle = '#e59a8b'; c.lineWidth = 7; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(480, 120, 30 + i * 16, 1.7, 4.4); c.stroke(); }
    c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.beginPath(); c.moveTo(225, 150); for (let i = 0; i < 6; i++) c.lineTo(235 + i * 9, 140 + (i % 2) * 18); c.stroke(); });
  // 落地窗外：淡淡的天空和雲，黑色鐵窗框
  const winTex = (rep) => tex(256, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bfe0ea'); g.addColorStop(1, '#f8eed6'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.85)'; [[70, 90, 46], [110, 100, 34], [190, 150, 40], [40, 190, 30]].forEach(([x, y, a]) => { c.beginPath(); c.ellipse(x, y, a, a * 0.42, 0, 0, 7); c.fill(); });
    c.fillStyle = '#3b3a40'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10); c.fillRect(0, 0, 8, h); c.fillRect(w - 8, 0, 8, h); c.fillRect(w / 2 - 3, 0, 6, h); c.fillRect(0, h / 2 - 3, w, 6); }, rep);
  // 清水模牆：暖灰色，模板的分割線和小圓孔
  const concTex = tex(512, 512, (c, w, h, r) => { c.fillStyle = '#d3cbbd'; c.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(90,80,70,0.07)'; c.beginPath(); c.ellipse(r() * w, r() * h, 30 + r() * 70, 14 + r() * 30, r() * 3, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(90,80,70,0.35)'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    c.fillStyle = 'rgba(80,70,60,0.5)'; [[60, 60], [w - 60, 60], [60, h - 60], [w - 60, h - 60], [60, h / 2 - 60], [w - 60, h / 2 - 60], [60, h / 2 + 60], [w - 60, h / 2 + 60]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); }); }, [4, 1]);
  // 紅磚地（陽台）
  const brickTex = (rep) => tex(256, 256, (c, w, h, r) => { c.fillStyle = '#e9d6bd'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { c.fillStyle = ['#cf7a55', '#c96f4c', '#d68660', '#c8754f'][(r() * 4) | 0]; rr(c, i * 128 + 4, j * 128 + 4, 120, 120, 6); c.fill(); } }, rep);
  // 紙條風的小牌子
  const signTex = (text) => tex(256, 96, (c, w, h) => { c.fillStyle = '#f7ecd0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a8693f'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    c.fillStyle = '#5b4636'; c.font = '700 ' + (text.length > 3 ? 46 : 52) + 'px "Noto Sans TC", "PingFang TC", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 3); });
  const sign = (text, w, o) => T(plane(w, w * 0.375), signTex(text), { ...o, basic: true });
  // 電視牆的畫面：深藍底，線條畫的地圖和圖表
  const screenTex = (kind) => tex(256, 160, (c, w, h, r) => { c.fillStyle = '#26344d'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8fd0d8'; c.lineWidth = 3;
    if (kind === 0) { c.fillStyle = '#3f6f6a'; c.beginPath(); c.moveTo(150, 14); c.bezierCurveTo(190, 30, 170, 90, 140, 146); c.bezierCurveTo(110, 120, 100, 60, 150, 14); c.fill(); c.stroke();
      c.fillStyle = '#f0c75a'; [[150, 40], [136, 86], [148, 120]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); }); c.setLineDash([6, 6]); c.strokeStyle = '#f7a8a0'; c.beginPath(); c.moveTo(150, 40); c.lineTo(136, 86); c.lineTo(148, 120); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#8fd0d8'; for (let i = 0; i < 4; i++) c.fillRect(16, 24 + i * 22, 50 + r() * 30, 8); }
    else if (kind === 1) { for (let i = 0; i < 6; i++) { const bh = 20 + r() * 90; c.fillStyle = i % 2 ? '#f0c75a' : '#8fd0d8'; c.fillRect(24 + i * 36, h - 20 - bh, 22, bh); } c.fillStyle = '#8fd0d8'; c.fillRect(14, h - 20, w - 28, 3); }
    else { c.beginPath(); c.moveTo(14, 110); for (let i = 1; i < 9; i++) c.lineTo(14 + i * 28, 40 + r() * 80); c.stroke(); c.fillStyle = '#f7a8a0'; c.beginPath(); c.arc(200, 40, 18, 0, 7); c.fill(); } });
  // 任務看板：軟木板上釘著幾張紙
  const boardTex = tex(384, 256, (c, w, h, r) => { c.fillStyle = '#d2a56c'; c.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { c.fillStyle = r() < 0.5 ? 'rgba(120,80,40,0.18)' : 'rgba(255,230,190,0.2)'; c.fillRect(r() * w, r() * h, 3, 3); }
    [[30, 30, 90, 70, '#fffaf0'], [140, 24, 80, 96, '#fde7a8'], [240, 36, 110, 70, '#fffaf0'], [40, 126, 100, 100, '#d6e9ee'], [170, 144, 76, 80, '#f9cfc8'], [268, 130, 86, 100, '#fffaf0']].forEach(([x, y, a, b, col]) => { c.save(); c.translate(x + a / 2, y + b / 2); c.rotate((r() - 0.5) * 0.16);
      c.fillStyle = 'rgba(60,40,20,0.2)'; c.fillRect(-a / 2 + 3, -b / 2 + 4, a, b); c.fillStyle = col; c.fillRect(-a / 2, -b / 2, a, b); c.fillStyle = 'rgba(91,70,54,0.55)'; for (let k = 0; k < 4; k++) c.fillRect(-a / 2 + 10, -b / 2 + 16 + k * 14, (a - 20) * (0.5 + r() * 0.5), 4);
      c.fillStyle = '#d8574f'; c.beginPath(); c.arc(0, -b / 2 + 7, 6, 0, 7); c.fill(); c.restore(); }); });
  // 作戰桌上的地圖
  const mapTex = tex(256, 160, (c, w, h) => { c.fillStyle = '#f6ecd2'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,90,60,0.25)'; c.lineWidth = 1.5; for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.stroke(); } for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(0, i * 32); c.lineTo(w, i * 32); c.stroke(); }
    c.fillStyle = '#b9d19a'; c.strokeStyle = '#6f9a52'; c.lineWidth = 3; c.beginPath(); c.moveTo(150, 14); c.bezierCurveTo(200, 30, 172, 100, 132, 148); c.bezierCurveTo(96, 120, 92, 56, 150, 14); c.fill(); c.stroke();
    c.setLineDash([7, 6]); c.strokeStyle = '#d8574f'; c.beginPath(); c.moveTo(40, 120); c.quadraticCurveTo(90, 40, 146, 60); c.stroke(); c.setLineDash([]); c.fillStyle = '#d8574f'; [[146, 60], [40, 120], [140, 112]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); }); });

  // ---- 常用的小東西 ----
  // 老檯燈：米色方底座、彎彎的金屬軟管、咖啡色燈罩，底下一圈暖光
  const lamp = (x, y, z, ry, s = 1.7) => grp([x, y, z], ry, () => { const k = s;
    p(box(0.3 * k, 0.09 * k, 0.24 * k), BEIGE, { pos: [0, 0.045 * k, 0], line: 0.02 }); p(cyl(0.04 * k, 0.04 * k, 0.03 * k, 10), BROWN, { pos: [0.07 * k, 0.1 * k, 0.04 * k], noLine: true, shadow: false });
    const curve = new THREE.CatmullRomCurve3([[-0.06, 0.08, 0], [-0.07, 0.34, 0], [-0.02, 0.56, 0.02], [0.1, 0.62, 0.08], [0.2, 0.56, 0.14]].map(a => new V3(a[0] * k, a[1] * k, a[2] * k)));
    p(new THREE.TubeGeometry(curve, 12, 0.02 * k, 6), '#c7b489', { line: 0.016 });
    p(cyl(0.06 * k, 0.17 * k, 0.2 * k, 14), '#9a6a45', { pos: [0.24 * k, 0.5 * k, 0.17 * k], rot: [0.5, 0, -0.55], line: 0.02 });
    p(sph(0.07 * k, 10, 8), WARM, { pos: [0.27 * k, 0.45 * k, 0.19 * k], glow: true });
    p(new THREE.CircleGeometry(0.55 * k, 20), '#ffd98a', { pool: true, pos: [0.3 * k, 0.012, 0.22 * k], rot: FLOOR }); });
  // 盆栽：陶盆加幾片大葉子
  const plant = (x, z, s = 1, tall) => grp([x, 0, z], 0, () => { p(cyl(0.36 * s, 0.28 * s, 0.55 * s, 12), POT, { pos: [0, 0.275 * s, 0], line: 0.024 }); p(cyl(0.32 * s, 0.32 * s, 0.04, 12), '#6b4a32', { pos: [0, 0.55 * s, 0], noLine: true, shadow: false });
    if (tall) [[0, 0, 1.5], [0.12, 0.3, 1.2], [-0.13, -0.2, 1.3], [0.05, -0.35, 1.0], [-0.1, 0.25, 0.9]].forEach(([a, b, hh], i) => p(new THREE.ConeGeometry(0.11 * s, hh * s, 6), i % 2 ? LEAF2 : LEAF, { pos: [a * s, (0.55 + hh / 2) * s, a * b * s + b * 0.3 * s], rot: [b * 0.3, 0, -a * 1.2], line: 0.018 }));
    else [[0, 1.25, 0, 0.42], [0.36, 1.0, 0.1, 0.34], [-0.34, 0.95, 0.12, 0.33], [0.1, 0.9, -0.34, 0.3], [-0.05, 0.98, 0.36, 0.32]].forEach(([a, hh, b, rad], i) => p(sph(rad * s, 10, 8), i % 2 ? LEAF2 : LEAF, { pos: [a * s, hh * s, b * s], scale: [1, 0.82, 1], line: 0.022 }));
    round(x, z, 0.4 * s); });
  // 沙發：底座、椅背、兩邊扶手、坐墊、抱枕；n 個位子可以坐
  const sofa = (x, z, ry, w, n, col, pillows) => { grp([x, 0, z], ry, () => {
      p(rbox(w, 0.42, 1.5, 0.14), col, { pos: [0, 0.36, 0] }); p(rbox(w, 0.95, 0.42, 0.16), col, { pos: [0, 0.82, -0.58] });
      [-1, 1].forEach(k => p(rbox(0.42, 0.72, 1.5, 0.16), col, { pos: [k * (w / 2 - 0.12), 0.62, 0] }));
      const cw = (w - 0.7) / n; for (let i = 0; i < n; i++) p(rbox(cw - 0.06, 0.2, 1.08, 0.09), col, { pos: [-(w - 0.7) / 2 + cw * (i + 0.5), 0.63, 0.14], line: 0.02, shadow: false });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => p(cyl(0.06, 0.05, 0.16, 6), WALNUT, { pos: [a * (w / 2 - 0.25), 0.08, b * 0.55], noLine: true }));
      (pillows || []).forEach(([px, pc, rz]) => p(rbox(0.56, 0.56, 0.2, 0.09), pc, { pos: [px, 0.98, -0.3], rot: [-0.28, 0, rz || 0], line: 0.02 })); });
    const cs = Math.cos(ry), sn = Math.sin(ry), cw = (w - 0.7) / n; for (let i = 0; i < n; i++) { const lx = -(w - 0.7) / 2 + cw * (i + 0.5); seat(x + lx * cs, z - lx * sn, ry, 0.74, 0.62); }
    walls.push({ x, z: z + OZ, hx: w / 2, hz: 0.75, ry }); };
  // 旋轉辦公椅
  const officeChair = (x, y, z, ry, col) => { grp([x, y, z], ry, () => { p(cyl(0.05, 0.05, 0.5, 8), STEEL, { pos: [0, 0.36, 0], noLine: true }); for (let i = 0; i < 5; i++) p(box(0.44, 0.05, 0.07), STEEL, { pos: [Math.cos(i * 1.257) * 0.2, 0.09, Math.sin(i * 1.257) * 0.2], rot: [0, -i * 1.257, 0], noLine: true });
      p(rbox(0.86, 0.16, 0.82, 0.07), col, { pos: [0, 0.66, 0], line: 0.022 }); p(rbox(0.8, 0.8, 0.14, 0.06), col, { pos: [0, 1.22, -0.4], rot: [-0.1, 0, 0], line: 0.022 }); p(box(0.08, 0.5, 0.05), STEEL, { pos: [0, 0.86, -0.44], noLine: true }); });
    seat(x, z, ry, 0.74); round(x, z, 0.38); };
  // 鐵欄杆：黑色鐵管，擋得住人
  const rail = (x0, z0, x1, z1, y, hgt = 1.0, col = STEEL) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.6)), ry = -Math.atan2(z1 - z0, x1 - x0);
    grp([(x0 + x1) / 2, y, (z0 + z1) / 2], ry, () => { for (let i = 0; i <= n; i++) p(cyl(0.05, 0.05, hgt, 6), col, { pos: [-len / 2 + len * i / n, hgt / 2, 0], line: 0.018 });
      p(box(len + 0.1, 0.09, 0.09), col, { pos: [0, hgt, 0], line: 0.018 }); p(box(len, 0.05, 0.05), col, { pos: [0, hgt * 0.5, 0], noLine: true }); });
    walls.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2 + OZ, hx: len / 2 + 0.05, hz: 0.1, ry }); };
  const pool = (x, z, r, y = 0.03) => p(new THREE.CircleGeometry(r, 24), '#ffd98a', { pool: true, pos: [x, y, z], rot: FLOOR });

  // ================= 房子本身 =================
  T(plane(HW * 2, HD * 2), woodTex(['#e0b278', '#d9a86c', '#e6ba84', '#d3a067', '#dfb07a'], [10, 6]), { rot: FLOOR });
  p(box(HW * 2 + 0.6, 0.5, HD * 2 + 0.6), '#b89a78', { pos: [-0.3, -0.26, -0.3], shadow: false, line: 0.035 });                        // 樓板的厚度
  p(box(HW * 2 + 0.6, WH, 0.6), CREAM, { pos: [-0.3, WH / 2, -HD - 0.3], shadow: false, line: 0.04 });                                 // 北牆
  p(box(0.6, WH, HD * 2 + 0.6), '#cfc7b9', { pos: [-HW - 0.3, WH / 2, -0.3], shadow: false, line: 0.04 });                             // 西牆
  T(plane(HD * 2, WH), concTex, { pos: [-HW + 0.01, WH / 2, 0], rot: EAST });                                                          // 西牆的清水模
  p(box(27.9, 1.3, 0.08), '#a9c7a5', { pos: [-6.05, 0.65, -HD + 0.04], shadow: false, noLine: true }); p(box(27.9, 0.1, 0.14), PALE, { pos: [-6.05, 1.33, -HD + 0.07], shadow: false, line: 0.016 });   // 北牆下半截的綠色腰牆
  p(box(HW * 2 + 0.9, 0.16, 0.8), WALNUT, { pos: [-0.3, WH + 0.08, -HD - 0.3], shadow: false, line: 0.03 }); p(box(0.8, 0.16, HD * 2 + 0.9), WALNUT, { pos: [-HW - 0.3, WH + 0.08, -0.3], shadow: false, line: 0.03 });
  // 北牆上排的鐵窗（兩層樓的高度）
  T(plane(26.4, 1.75), winTex([8, 1]), { pos: [-6.3, 5.2, -HD + 0.02], basic: true }); T(plane(10.8, 1.75), winTex([3, 1]), { pos: [14.2, 5.2, -HD + 0.02], basic: true });
  p(box(26.6, 0.1, 0.3), STEEL, { pos: [-6.3, 4.28, -HD + 0.15], shadow: false, noLine: true }); p(box(11, 0.1, 0.3), STEEL, { pos: [14.2, 4.28, -HD + 0.15], shadow: false, noLine: true });
  // 南邊和東邊不做牆，只有一道矮矮的邊，鏡頭才看得進來
  [[-11.3, 17.4], [11.3, 17.4]].forEach(([cx, w]) => p(box(w, 0.4, 0.3), CREAM, { pos: [cx, 0.2, HD + 0.15], shadow: false, line: 0.025 }));
  // 天花板的東西：黑鐵樑、軌道燈、紙燈籠、銀色風管
  p(box(HW * 2, 0.26, 0.26), STEEL, { pos: [0, 6.0, -8.5], shadow: false, line: 0.022 });
  [-15.5, -8, -5, 2, 4.4, 10.5, 16].forEach(x => { p(cyl(0.13, 0.17, 0.34, 10), STEEL, { pos: [x, 5.68, -8.3], rot: [0.5, 0, 0], shadow: false, noLine: true }); p(new THREE.CircleGeometry(0.14, 10), WARM, { glow: true, pos: [x, 5.52, -8.2], rot: [PI / 2 + 0.5, 0, 0] }); });
  [[-11, 4.9, 0.8], [-2.2, 4.55, 0.92], [7, 5.0, 0.76]].forEach(([x, y, r]) => { p(cyl(0.012, 0.012, 5.9 - y - r * 0.8, 4), STEEL, { pos: [x, (5.9 + y + r * 0.8) / 2, -8.5], noLine: true, shadow: false });
    p(sph(r, 18, 12), '#fff6dc', { glow: true, line: 0.03, pos: [x, y, -8.5], scale: [1, 0.86, 1] }); [0.5, 0, -0.5].forEach(a => p(new THREE.TorusGeometry(r * Math.cos(a * 1.0) * 1.0, 0.012, 4, 20), '#e8d9b4', { glow: true, pos: [x, y + r * 0.86 * Math.sin(a), -8.5], rot: [PI / 2, 0, 0] }));
    pool(x, -8.3, 2.6); });
  p(cyl(0.42, 0.42, HD * 2 - 0.4, 14), SILVER, { pos: [-HW + 0.75, 5.45, 0], rot: [PI / 2, 0, 0], shadow: false, line: 0.03 });
  for (let z = -10.5; z <= 10.6; z += 3) p(cyl(0.46, 0.46, 0.12, 14), '#aab1b6', { pos: [-HW + 0.75, 5.45, z], rot: [PI / 2, 0, 0], shadow: false, noLine: true });
  [-7, 2, 8].forEach(z => p(box(0.5, 0.3, 0.9), '#aab1b6', { pos: [-HW + 0.95, 5.05, z], shadow: false, line: 0.016 }));

  // ================= 廚房吧台（左） =================
  T(plane(9, 12), tileA([4.5, 6]), { pos: [-15.5, 0.012, -6], rot: FLOOR });
  p(box(1.5, 1.4, 9.4), TEAK, { pos: [-19.05, 0.7, -6.5] }); p(box(1.66, 0.12, 9.6), '#efe6d2', { pos: [-19.0, 1.46, -6.5], line: 0.022 });
  for (let i = 0; i < 6; i++) { p(box(0.04, 1.1, 0.03), '#93502b', { pos: [-18.29, 0.7, -11.2 + 9.4 * (i + 1) / 7 * 1], noLine: true, shadow: false }); p(box(0.06, 0.08, 0.3), PALE, { pos: [-18.27, 1.05, -10.5 + i * 1.55], noLine: true, shadow: false }); }
  T(plane(9.6, 1.8), tileB([8, 1.5]), { pos: [-HW + 0.02, 2.45, -6.5], rot: EAST });                                                    // 鬱金香花磚的牆
  p(box(0.7, 0.1, 7.6), PALE, { pos: [-19.6, 3.85, -6.5], line: 0.02, shadow: false }); [-9.8, -6.5, -3.2].forEach(z => p(box(0.5, 0.36, 0.06), STEEL, { pos: [-19.7, 3.66, z], noLine: true, shadow: false }));
  [[-9.6, '#f4e9d2'], [-9.2, '#f4e9d2'], [-8.7, SAGE], [-7.9, RED], [-7.3, MUST], [-6.4, '#f4e9d2'], [-5.9, BLUE], [-5.2, '#f4e9d2'], [-4.4, TEAK], [-3.6, SAGE]].forEach(([z, c2], i) => p(cyl(0.16, 0.13, i % 3 ? 0.26 : 0.4, 10), c2, { pos: [-19.55, 3.9 + (i % 3 ? 0.13 : 0.2), z], line: 0.014, shadow: false }));
  p(box(0.9, 0.06, 1.3), '#8d9aa0', { pos: [-19.0, 1.53, -9.6], noLine: true, shadow: false }); p(cyl(0.035, 0.035, 0.5, 6), SILVER, { pos: [-19.5, 1.77, -9.6], noLine: true }); p(cyl(0.035, 0.035, 0.36, 6), SILVER, { pos: [-19.33, 2.0, -9.6], rot: [0, 0, PI / 2], noLine: true });   // 水槽
  p(box(1.0, 0.06, 1.5), STEEL, { pos: [-19.0, 1.55, -7.3], noLine: true, shadow: false }); p(cyl(0.34, 0.3, 0.36, 14), RED, { pos: [-19.0, 1.76, -7.7], line: 0.02 }); p(cyl(0.36, 0.36, 0.05, 14), '#b8433c', { pos: [-19.0, 1.96, -7.7], noLine: true }); p(sph(0.06, 8, 6), STEEL, { pos: [-19.0, 2.01, -7.7], noLine: true });   // 爐子和紅鍋子
  p(cyl(0.3, 0.3, 0.42, 14), '#9fc7a4', { pos: [-19.05, 1.73, -5.4], line: 0.02 }); p(cyl(0.31, 0.26, 0.1, 14), SILVER, { pos: [-19.05, 1.99, -5.4], line: 0.016 }); p(sph(0.06, 8, 6), STEEL, { pos: [-19.05, 2.07, -5.4], noLine: true }); p(box(0.1, 0.14, 0.24), '#f4e9d2', { pos: [-18.76, 1.66, -5.4], noLine: true, shadow: false });   // 大同電鍋
  p(cyl(0.2, 0.24, 0.3, 12), SILVER, { pos: [-19.1, 1.67, -3.6], line: 0.018 }); p(new THREE.TorusGeometry(0.16, 0.025, 6, 12, PI), STEEL, { pos: [-19.1, 1.84, -3.6], rot: [0, PI / 2, 0], noLine: true });   // 水壺
  wall(-19.05, -6.5, 0.85, 4.85);
  // 冰箱（靠北牆）
  p(rbox(1.7, 3.3, 1.5, 0.14), '#cfe3d6', { pos: [-16.9, 1.67, -11.15] }); p(box(1.66, 0.04, 0.04), '#9fbba9', { pos: [-16.9, 2.3, -10.4], noLine: true, shadow: false }); [2.6, 1.6].forEach(y => p(box(0.07, 0.5, 0.08), SILVER, { pos: [-16.25, y, -10.36], noLine: true }));
  wall(-16.9, -11.15, 0.9, 0.8);
  // 中島吧台：正面貼花磚，四張吧台椅可以坐
  p(box(1.5, 1.35, 6), SAGE, { pos: [-13.6, 0.675, -6] }); p(box(1.95, 0.12, 6.4), PALE, { pos: [-13.5, 1.41, -6], line: 0.022 });
  T(plane(6, 1.2), tileA([3, 0.6]), { pos: [-12.84, 0.7, -6], rot: EAST });
  [[-13.9, -7.6, '#f4e9d2'], [-13.7, -4.2, MUST]].forEach(([x, z, c2]) => { p(cyl(0.2, 0.14, 0.14, 12), c2, { pos: [x, 1.54, z], line: 0.014 }); });
  p(cyl(0.3, 0.34, 0.06, 14), TEAK, { pos: [-13.6, 1.5, -5.9], noLine: true }); [[0.1, 0.1, RED], [-0.1, 0.05, MUST], [0, -0.12, '#e89a4f']].forEach(([a, b, c2]) => p(sph(0.12, 8, 6), c2, { pos: [-13.6 + a, 1.62, -5.9 + b], noLine: true }));   // 一盤水果
  wall(-13.55, -6, 1.0, 3.2);
  [-8.25, -6.75, -5.25, -3.75].forEach(z => { grp([-11.9, 0, z], 0, () => { p(cyl(0.42, 0.42, 0.13, 14), TEAK, { pos: [0, 1.14, 0], line: 0.022 }); p(cyl(0.045, 0.045, 1.1, 6), STEEL, { pos: [0, 0.55, 0], noLine: true }); p(cyl(0.32, 0.36, 0.06, 12), STEEL, { pos: [0, 0.03, 0], noLine: true }); p(new THREE.TorusGeometry(0.26, 0.025, 5, 14), STEEL, { pos: [0, 0.45, 0], rot: [PI / 2, 0, 0], noLine: true, shadow: false }); });
    seat(-11.9, z, -PI / 2, 1.2); round(-11.9, z, 0.3); });
  // 吧台上方的三盞吊燈
  p(box(0.22, 0.22, 9.2), STEEL, { pos: [-13.5, 6.0, -7.4], shadow: false, line: 0.02 });
  [-8.2, -6, -3.8].forEach(z => { p(cyl(0.012, 0.012, 2.3, 4), STEEL, { pos: [-13.5, 4.75, z], noLine: true, shadow: false }); p(cyl(0.1, 0.46, 0.36, 14), '#5f8f76', { pos: [-13.5, 3.5, z], line: 0.022, shadow: false }); p(sph(0.13, 8, 6), WARM, { glow: true, pos: [-13.5, 3.34, z] }); pool(-13.5, z, 0.8, 1.48); });

  // ================= 職業導師的桌子和扭蛋機（後牆） =================
  p(box(4.2, 3.0, 0.6), PALE, { pos: [-8.6, 1.5, -11.65] });                                                                            // 書櫃
  [0.75, 1.5, 2.25].forEach(y => p(box(4.0, 0.06, 0.5), WALNUT, { pos: [-8.6, y, -11.5], noLine: true, shadow: false }));
  { const r = rnd(31), cols = [RED, NAVY, MUST, SAGE, '#f4e9d2', TEAK, BLUE, '#b98fc0']; [0.12, 0.84, 1.59, 2.34].forEach((y0) => { let x = -10.5; while (x < -6.9) { const w = 0.1 + r() * 0.12, hh = 0.4 + r() * 0.2; if (r() < 0.85) p(box(w, hh, 0.34), cols[(r() * cols.length) | 0], { pos: [x + w / 2, y0 + hh / 2, -11.36], noLine: true, shadow: false }); x += w + 0.015; } }); }
  p(box(3.3, 0.12, 1.5), TEAK, { pos: [-8.6, 1.1, -9.3], line: 0.024 }); p(box(1.0, 1.0, 1.36), TEAK, { pos: [-7.5, 0.54, -9.3] }); p(box(0.1, 1.04, 1.36), TEAK, { pos: [-10.15, 0.52, -9.3] }); p(box(3.0, 0.5, 0.06), '#a65c30', { pos: [-8.6, 0.8, -8.6], noLine: true });
  [0.8, 0.45].forEach(y => p(box(0.3, 0.06, 0.04), PALE, { pos: [-7.5, y, -8.6], noLine: true, shadow: false }));
  grp([-8.7, 0, -10.6], 0, () => { p(box(0.9, 0.1, 0.85), WALNUT, { pos: [0, 0.72, 0], line: 0.02 }); p(rbox(0.8, 0.12, 0.75, 0.05), MUST, { pos: [0, 0.82, 0], noLine: true }); p(box(0.9, 0.9, 0.1), WALNUT, { pos: [0, 1.3, -0.4], line: 0.02 }); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => p(box(0.08, 0.7, 0.08), WALNUT, { pos: [a * 0.38, 0.35, b * 0.36], noLine: true })); });
  lamp(-9.6, 1.16, -9.3, 0.5); { const cs = [RED, NAVY, '#f4e9d2']; cs.forEach((c2, i) => p(box(0.62 - i * 0.05, 0.09, 0.44), c2, { pos: [-7.6, 1.2 + i * 0.09, -9.4], rot: [0, 0.2 * i - 0.2, 0], line: 0.012, shadow: false })); }
  p(cyl(0.1, 0.08, 0.2, 10), '#f4e9d2', { pos: [-8.4, 1.26, -8.95], line: 0.012 }); [[-0.03, RED], [0.04, NAVY], [0, MUST]].forEach(([a, c2], i) => p(cyl(0.012, 0.012, 0.3, 4), c2, { pos: [-8.4 + a, 1.44, -8.95 + (i - 1) * 0.03], rot: [0.15 * (i - 1), 0, a * 4], noLine: true, shadow: false }));   // 筆筒
  sign('職業導師', 1.5, { pos: [-8.6, 0.62, -8.55] });
  wall(-8.6, -10.2, 2.15, 1.75);
  // 扭蛋機：從牆邊搬出來，獨立一角（左前）。玻璃罩是真的透明，裡面一顆一顆的扭蛋（上半有顏色、下半米白）堆在底部
  const GLASS = [];
  [[-10.6, RED, '#b8433c'], [-8.1, MUST, '#c9963a']].forEach(([x, c2, c3], n) => { const gz = 3.6, R = 0.86, gy = 2.32;
    grp([x, 0, gz], n ? -0.12 : 0.12, () => { p(rbox(1.5, 1.45, 1.3, 0.12), c2, { pos: [0, 0.74, 0] }); p(cyl(0.8, 0.8, 0.12, 20), c3, { pos: [0, 1.52, 0], line: 0.02 }); p(cyl(0.7, 0.7, 0.05, 20), '#f4e9d2', { pos: [0, 1.6, 0], noLine: true, shadow: false });
      p(cyl(0.36, 0.52, 0.2, 16), c2, { pos: [0, gy + R - 0.02, 0], line: 0.022 }); p(sph(0.1, 8, 6), c3, { pos: [0, gy + R + 0.12, 0], noLine: true });
      const r = rnd(7 + n * 5), cs = [RED, MUST, BLUE, '#f6b3c0', SAGE, '#b98fc0', '#e89a4f'], put2 = [], cr = 0.17;
      for (let t = 0; t < 900 && put2.length < 26; t++) { const a = r() * 6.283, d = Math.sqrt(r()) * (R - cr - 0.04), y = -0.66 + r() * 0.75, q = [Math.cos(a) * d, y, Math.sin(a) * d];
        if (Math.hypot(q[0], q[1], q[2]) > R - cr - 0.03 || put2.some(o => Math.hypot(o[0] - q[0], o[1] - q[1], o[2] - q[2]) < cr * 1.7)) continue; put2.push(q); }
      put2.forEach((q, k) => { const rot = [r() * 6.283, r() * 6.283, r() * 6.283];
        p(new THREE.SphereGeometry(cr, 12, 5, 0, PI * 2, 0, PI / 2), cs[k % cs.length], { pos: [q[0], gy + q[1], q[2]], rot, noLine: true, shadow: false });
        p(new THREE.SphereGeometry(cr, 12, 5, 0, PI * 2, PI / 2, PI / 2), '#fbf5e6', { pos: [q[0], gy + q[1], q[2]], rot, noLine: true, shadow: false });
        p(cyl(cr * 1.03, cr * 1.03, 0.02, 12), '#e5d6b4', { pos: [q[0], gy + q[1], q[2]], rot, noLine: true, shadow: false }); });
      p(cyl(0.18, 0.18, 0.1, 12), SILVER, { pos: [0.32, 0.98, 0.68], rot: [PI / 2, 0, 0], line: 0.016 }); p(box(0.32, 0.07, 0.06), '#8d9aa0', { pos: [0.32, 0.98, 0.75], noLine: true, shadow: false });
      p(rbox(0.54, 0.4, 0.1, 0.05), STEEL, { pos: [-0.3, 0.42, 0.66], noLine: true, shadow: false }); p(box(0.5, 0.26, 0.04), '#f7ecd0', { pos: [-0.3, 1.05, 0.67], line: 0.012, shadow: false });
      GLASS.push([sph(R, 24, 16), local({ pos: [0, gy, 0] })]);
      p(sph(0.09, 8, 6), '#ffffff', { glow: true, pos: [-0.4, gy + 0.46, 0.63], scale: [1, 2.2, 0.25], rot: [0, 0, 0.6] }); });
    round(x, gz, 0.9); });
  p(new THREE.CircleGeometry(2.5, 32), '#e9d3b0', { pos: [-9.35, 0.014, 3.7], rot: FLOOR, scale: [1, 0.72, 1], noLine: true, shadow: false }); p(new THREE.RingGeometry(2.1, 2.22, 32), SAGE, { pos: [-9.35, 0.018, 3.7], rot: FLOOR, scale: [1, 0.72, 1], noLine: true, shadow: false });
  p(box(0.1, 1.3, 0.1), WALNUT, { pos: [-12.3, 0.65, 4.2], noLine: true }); p(box(1.26, 0.56, 0.08), '#e5cfa0', { pos: [-12.3, 1.5, 4.2], line: 0.02 }); sign('扭蛋', 1.16, { pos: [-12.3, 1.5, 4.25] }); round(-12.3, 4.2, 0.3);
  plant(-4.6, -11.0, 1.25);

  // ================= 客廳（中間） =================
  T(plane(10, 7.5), rugTex, { pos: [1, 0.016, -3.4], rot: FLOOR });
  sofa(1, -7.0, 0, 4.6, 3, LINEN, [[-1.5, BLUE, 0.15], [1.4, MUST, -0.1]]); sofa(-4.4, -3.2, PI / 2, 3.4, 2, CARAMEL, [[-0.9, '#f4e9d2', 0.1]]);
  // 右邊兩張單人椅
  [[6.5, -4.6, SAGE], [6.5, -2.0, MUST]].forEach(([x, z, c2]) => { grp([x, 0, z], -PI / 2, () => { p(rbox(1.5, 0.42, 1.4, 0.14), c2, { pos: [0, 0.36, 0] }); p(rbox(1.5, 0.9, 0.4, 0.16), c2, { pos: [0, 0.8, -0.52] }); [-1, 1].forEach(k => p(rbox(0.34, 0.6, 1.3, 0.14), c2, { pos: [k * 0.62, 0.6, 0.02] })); p(rbox(0.86, 0.18, 1.0, 0.08), LINEN, { pos: [0, 0.62, 0.12], line: 0.02, shadow: false }); });
    seat(x, z, -PI / 2, 0.72, 0.58); walls.push({ x, z: z + OZ, hx: 0.7, hz: 0.75, ry: 0 }); });
  // 前面兩顆矮凳
  [[-0.8, 0.9, NAVY], [2.9, 1.1, '#d98a5c']].forEach(([x, z, c2]) => { p(cyl(0.6, 0.62, 0.46, 18), c2, { pos: [x, 0.23, z], line: 0.026 }); p(cyl(0.61, 0.61, 0.04, 18), LINEN, { pos: [x, 0.3, z], noLine: true, shadow: false }); seat(x, z, PI, 0.48, 0.46); round(x, z, 0.45); });
  // 淺色木頭矮桌，上面一壺茶
  p(rbox(2.9, 0.42, 1.5, 0.08), '#e8c690', { pos: [1, 0.36, -3.4] }); p(box(2.5, 0.16, 1.1), '#c99c62', { pos: [1, 0.08, -3.4], noLine: true });
  p(cyl(0.5, 0.5, 0.04, 16), TEAK, { pos: [0.4, 0.59, -3.4], noLine: true }); p(sph(0.2, 10, 8), '#f4e9d2', { pos: [0.4, 0.78, -3.4], scale: [1, 0.85, 1], line: 0.014 }); p(cyl(0.03, 0.05, 0.2, 6), '#f4e9d2', { pos: [0.62, 0.8, -3.4], rot: [0, 0, -0.9], noLine: true });
  [[0.05, -3.15], [0.7, -3.1]].forEach(([x, z]) => p(cyl(0.08, 0.06, 0.1, 8), BLUE, { pos: [x, 0.66, z], noLine: true })); [[RED, 0], [NAVY, 0.3]].forEach(([c2, a], i) => p(box(0.6, 0.06, 0.44), c2, { pos: [1.9, 0.6 + i * 0.06, -3.5], rot: [0, a, 0], line: 0.012, shadow: false }));
  wall(1, -3.4, 1.45, 0.75);
  // 沙發旁的小邊桌和老檯燈；立燈
  p(cyl(0.5, 0.5, 0.08, 16), TEAK, { pos: [-2.2, 0.9, -7.3], line: 0.02 }); p(cyl(0.06, 0.06, 0.86, 6), STEEL, { pos: [-2.2, 0.45, -7.3], noLine: true }); p(cyl(0.34, 0.36, 0.05, 12), STEEL, { pos: [-2.2, 0.03, -7.3], noLine: true }); lamp(-2.25, 0.94, -7.35, 0.3); round(-2.2, -7.3, 0.5);
  grp([-5.5, 0, -6.2], 0, () => { [0, 2.1, 4.2].forEach(a => p(cyl(0.035, 0.035, 2.5, 5), WALNUT, { pos: [Math.cos(a) * 0.28, 1.2, Math.sin(a) * 0.28], rot: [Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22], noLine: true }));
    p(cyl(0.42, 0.58, 0.8, 16), '#f6e7c0', { glow: true, line: 0.026, pos: [0, 2.75, 0] }); }); pool(-5.5, -6.2, 1.9); round(-5.5, -6.2, 0.4);
  plant(-6.6, -0.3, 1.2); plant(7.2, 0.6, 1.1, true);

  // ================= 音響櫃、唱片、抽象畫、點唱機（後牆中間） =================
  p(box(5, 1.0, 1.1), TEAK, { pos: [1, 0.78, -11.3] }); p(box(4.7, 0.26, 0.9), '#93502b', { pos: [1, 0.15, -11.3], noLine: true });
  [-0.7, 0.9, 2.5].forEach(x => p(box(0.03, 0.9, 0.03), '#93502b', { pos: [x - 0.1, 0.78, -10.74], noLine: true, shadow: false })); [-1, 0.2, 0.2, 0.2, 3.1].forEach((x, i) => p(box(0.14, 0.14, 0.05), PALE, { pos: [x, i > 0 && i < 4 ? 0.48 + (i - 1) * 0.3 : 1.05, -10.73], noLine: true, shadow: false }));
  p(box(1.2, 0.16, 0.9), '#2d2c31', { pos: [0.9, 1.36, -11.3], line: 0.016 }); p(cyl(0.38, 0.38, 0.04, 20), '#1f1e22', { pos: [0.8, 1.46, -11.3], noLine: true }); p(cyl(0.12, 0.12, 0.05, 12), RED, { pos: [0.8, 1.47, -11.3], noLine: true }); p(box(0.04, 0.04, 0.5), SILVER, { pos: [1.36, 1.5, -11.25], rot: [0, 0.3, 0], noLine: true });   // 唱盤
  p(box(1.3, 0.34, 0.8), SILVER, { pos: [2.5, 1.45, -11.3], line: 0.016 }); [2.05, 2.3, 2.55].forEach(x => p(cyl(0.06, 0.06, 0.06, 8), '#8d9aa0', { pos: [x, 1.45, -10.88], rot: [PI / 2, 0, 0], noLine: true })); p(cyl(0.1, 0.1, 0.06, 10), '#8d9aa0', { pos: [2.95, 1.45, -10.88], rot: [PI / 2, 0, 0], noLine: true });   // 擴大機
  p(box(1.0, 0.2, 0.7), '#efe3cc', { pos: [-0.7, 1.38, -11.3], line: 0.016 }); [[RED, 0], ['#f4e9d2', 1], [NAVY, 2]].forEach(([c2, i]) => p(box(0.7, 0.07, 0.5), c2, { pos: [-0.7, 1.52 + i * 0.07, -11.3], rot: [0, 0.15 * i, 0], noLine: true, shadow: false }));
  [-2.2, 4.2].forEach(x => { p(box(1.05, 2.0, 0.95), '#2d2c31', { pos: [x, 1.0, -11.3] }); p(cyl(0.36, 0.36, 0.05, 18), '#4a4950', { pos: [x, 0.62, -10.81], rot: [PI / 2, 0, 0], noLine: true, shadow: false }); p(cyl(0.2, 0.2, 0.06, 14), '#1f1e22', { pos: [x, 0.62, -10.8], rot: [PI / 2, 0, 0], noLine: true, shadow: false }); p(cyl(0.2, 0.2, 0.05, 14), '#4a4950', { pos: [x, 1.5, -10.81], rot: [PI / 2, 0, 0], noLine: true, shadow: false }); });
  [[-0.9, RED], [-0.55, '#f4e9d2'], [0.2, '#2f8f86'], [0.5, MUST], [1.5, '#f6b3c0'], [1.85, NAVY], [2.6, '#f4e9d2'], [2.9, RED]].forEach(([x, c2], i) => { p(box(0.78, 0.78, 0.04), c2, { pos: [x, 0.4, -10.42 + (i % 2) * 0.06], rot: [-0.28, 0, (i % 3 - 1) * 0.03], line: 0.014 });
    if (i % 2 === 0) p(cyl(0.2, 0.2, 0.02, 14), i % 4 ? '#f4e9d2' : MUST, { pos: [x, 0.42, -10.39 + (i % 2) * 0.06], rot: [PI / 2 - 0.28, 0, 0], noLine: true, shadow: false }); });
  p(box(4.5, 2.2, 0.1), PALE, { pos: [1, 3.0, -HD + 0.05], line: 0.022, shadow: false }); T(plane(4.26, 1.96), paintTex, { pos: [1, 3.0, -HD + 0.11] });
  wall(1, -11.1, 3.8, 0.95);
  const JUKE = { x: 6.0, z: -10.9 + OZ, y: 2.6 };
  grp([6.0, 0, -10.9], -0.12, () => { p(box(1.3, 1.6, 0.8), '#e0604a', { pos: [0, 0.8, 0] }); p(new THREE.CylinderGeometry(0.65, 0.65, 0.8, 20, 1, false, 0, PI), '#e0604a', { pos: [0, 1.6, 0], rot: [PI / 2, PI / 2, 0] });
    p(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 20, 1, false, 0, PI), WARM, { glow: true, pos: [0, 1.62, 0.4], rot: [PI / 2, PI / 2, 0] }); p(box(0.92, 0.42, 0.06), '#f7ecd0', { pos: [0, 1.12, 0.4], line: 0.018, shadow: false });
    p(cyl(0.28, 0.28, 0.06, 16), '#39435c', { pos: [0, 0.48, 0.4], rot: [PI / 2, 0, 0], line: 0.018, shadow: false }); [-0.3, 0, 0.3].forEach((a, i) => p(sph(0.055, 8, 6), ['#f0c75a', '#8fe0c0', '#f7a8c4'][i], { glow: true, pos: [a, 1.12, 0.45] })); });
  round(6.0, -10.9, 0.8);

  // ================= 作戰角（右後，高半層） =================
  p(box(12, PH, 9), '#c4bcae', { pos: [14, PH / 2, -7.5], line: 0.035 }); T(plane(12, 9), woodTex(['#b98558', '#ae7a4e', '#c08d60', '#a87348'], [3, 2.25]), { pos: [14, PH + 0.012, -7.5], rot: FLOOR });
  p(box(12.1, 0.14, 0.12), WALNUT, { pos: [14, PH - 0.07, -2.97], noLine: true, shadow: false });
  for (let i = 0; i < 4; i++) p(box(3, 0.25 * (i + 1), 0.6), i % 2 ? '#dcb27c' : PALE, { pos: [11.5, 0.125 * (i + 1), -0.9 - 0.6 * i], line: 0.024 });   // 樓梯
  rail(8, -12, 8, -3, PH); rail(8, -3, 10, -3, PH); rail(13, -3, 20, -3, PH); rail(20, -3, 20, -12, PH);
  wall(10, -1.8, 0.08, 1.2); wall(13, -1.8, 0.08, 1.2); [10, 13].forEach(x => { p(cyl(0.07, 0.07, 1.0, 6), STEEL, { pos: [x, 0.5, -0.6], line: 0.018 }); p(sph(0.1, 8, 6), STEEL, { pos: [x, 1.02, -0.6], noLine: true }); });
  grp([0, PH, 0], 0, () => {
    // 電視牆：一大兩小
    p(box(5.6, 2.5, 0.16), STEEL, { pos: [11.6, 2.25, -HD + 0.1], line: 0.022, shadow: false });
    T(plane(3.3, 2.1), screenTex(0), { pos: [10.6, 2.25, -HD + 0.2], basic: true }); T(plane(1.7, 1.0), screenTex(1), { pos: [13.3, 2.8, -HD + 0.2], basic: true }); T(plane(1.7, 1.0), screenTex(2), { pos: [13.3, 1.7, -HD + 0.2], basic: true });
    // 任務看板，底下一排鐵櫃
    p(box(3.9, 2.3, 0.12), PALE, { pos: [17.1, 2.45, -HD + 0.07], line: 0.022, shadow: false }); T(plane(3.66, 2.06), boardTex, { pos: [17.1, 2.45, -HD + 0.14] }); sign('任務看板', 1.5, { pos: [17.1, 3.95, -HD + 0.04] });
    p(box(3.6, 1.2, 0.9), '#8fa2a4', { pos: [17.1, 0.6, -11.5] }); [15.9, 17.1, 18.3].forEach(x => { [0.85, 0.35].forEach(y => { p(box(1.08, 0.42, 0.03), '#a3b4b5', { pos: [x, y, -11.04], noLine: true, shadow: false }); p(box(0.34, 0.05, 0.05), SILVER, { pos: [x, y + 0.08, -11.02], noLine: true, shadow: false }); }); });
    p(box(0.7, 0.42, 0.36), TEAK, { pos: [16.2, 1.41, -11.5], line: 0.016 }); p(cyl(0.12, 0.12, 0.03, 12), '#efe3cc', { pos: [16.05, 1.42, -11.31], rot: [PI / 2, 0, 0], noLine: true, shadow: false }); p(cyl(0.012, 0.012, 0.6, 4), SILVER, { pos: [16.48, 1.85, -11.5], rot: [0, 0, -0.3], noLine: true, shadow: false });   // 老收音機
    // 作戰桌：黑鐵腳、厚木桌板，上面攤著地圖
    p(box(3.8, 0.14, 2.1), WALNUT, { pos: [12.6, 1.08, -7.3], line: 0.024 }); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => p(box(0.1, 1.0, 0.1), STEEL, { pos: [12.6 + a * 1.7, 0.5, -7.3 + b * 0.9], noLine: true })); p(box(3.4, 0.07, 0.07), STEEL, { pos: [12.6, 0.3, -7.3], noLine: true });
    T(plane(2.2, 1.4), mapTex, { pos: [12.3, 1.162, -7.3], rot: [-PI / 2, 0, 0.06] }); lamp(13.9, 1.15, -7.7, -0.6); p(cyl(0.09, 0.07, 0.14, 8), RED, { pos: [11.2, 1.22, -6.7], line: 0.012 }); p(cyl(0.09, 0.07, 0.14, 8), '#f4e9d2', { pos: [13.6, 1.22, -6.6], line: 0.012 });
    // 靠欄杆的辦公桌：螢幕、鍵盤、老檯燈
    p(box(1.4, 0.1, 3.0), PALE, { pos: [18.9, 1.08, -6.6], line: 0.022 }); [[-1], [1]].forEach(([b]) => p(box(1.2, 1.03, 0.08), STEEL, { pos: [18.9, 0.52, -6.6 + b * 1.4], noLine: true })); p(box(0.5, 0.9, 0.9), '#8fa2a4', { pos: [19.2, 0.5, -5.6], line: 0.02 });
    p(box(0.1, 0.9, 1.4), '#2d2c31', { pos: [19.25, 1.8, -6.9], line: 0.018 }); p(box(0.02, 0.76, 1.26), '#8fd0d8', { glow: true, pos: [19.19, 1.8, -6.9] }); p(box(0.08, 0.3, 0.08), STEEL, { pos: [19.3, 1.25, -6.9], noLine: true }); p(box(0.36, 0.04, 0.9), '#e9e2d2', { pos: [18.6, 1.15, -6.9], noLine: true, shadow: false }); lamp(19.0, 1.13, -5.55, -2.2);
    p(box(0.44, 0.06, 0.6), '#fffaf0', { pos: [18.6, 1.15, -7.9], rot: [0, 0.2, 0], noLine: true, shadow: false });
  });
  officeChair(12.6, PH, -5.6, PI, NAVY); officeChair(12.2, PH, -9.0, 0, '#d98a5c'); officeChair(17.5, PH, -6.9, PI / 2, SAGE);
  wall(12.6, -7.3, 1.9, 1.05); wall(18.9, -6.6, 0.7, 1.5); wall(17.1, -11.5, 1.8, 0.5);
  grp([0, PH, 0], 0, () => plant(9.0, -11.0, 1.1, true));

  // ================= 西牆的展示牆和矮書櫃（左前） =================
  p(box(1.0, 1.1, 7.6), PALE, { pos: [-19.4, 0.55, 5.6] }); [3.1, 5.6, 8.1].forEach(z => p(box(0.03, 0.9, 0.03), '#c99c62', { pos: [-18.89, 0.55, z], noLine: true, shadow: false }));
  { const r = rnd(12), cols = [RED, NAVY, MUST, SAGE, '#f4e9d2', TEAK, BLUE]; let z = 2.1; while (z < 5.2) { const w = 0.1 + r() * 0.12, hh = 0.5 + r() * 0.25; p(box(0.5, hh, w), cols[(r() * cols.length) | 0], { pos: [-19.4, 1.1 + hh / 2, z + w / 2], noLine: true, shadow: false }); z += w + 0.015; } }
  lamp(-19.4, 1.1, 6.3, 1.2); p(box(0.5, 0.5, 0.9), '#d9c9a4', { pos: [-19.4, 1.35, 8.3], line: 0.018 }); p(cyl(0.16, 0.16, 0.04, 12), STEEL, { pos: [-19.14, 1.38, 8.1], rot: [0, 0, PI / 2], noLine: true, shadow: false }); p(cyl(0.05, 0.05, 0.04, 8), BROWN, { pos: [-19.14, 1.38, 8.55], rot: [0, 0, PI / 2], noLine: true, shadow: false });   // 老收音機
  wall(-19.4, 5.6, 0.6, 3.9);
  // 牆上的畫框：有一幅是裱框的花磚
  { const fr = (z, y, w, hh, col, inner) => { p(box(0.08, hh + 0.16, w + 0.16), col, { pos: [-HW + 0.05, y, z], line: 0.018, shadow: false }); p(box(0.04, hh, w), '#fbf5e6', { pos: [-HW + 0.09, y, z], noLine: true, shadow: false }); inner(z, y, w, hh); };
    const X = -HW + 0.12, blk = (z, y, w, hh, c2) => p(box(0.02, hh, w), c2, { pos: [X, y, z], noLine: true, shadow: false }), dot = (z, y, r, c2) => p(cyl(r, r, 0.02, 14), c2, { pos: [X + 0.01, y, z], rot: [0, 0, PI / 2], noLine: true, shadow: false });
    fr(1.6, 3.2, 1.2, 1.6, WALNUT, (z, y) => { blk(z, y - 0.3, 0.9, 0.7, BLUE); dot(z + 0.1, y + 0.35, 0.3, MUST); });
    fr(3.3, 3.7, 1.0, 0.8, STEEL, (z, y) => { blk(z - 0.2, y, 0.4, 0.6, RED); blk(z + 0.22, y, 0.36, 0.6, NAVY); });
    fr(3.3, 2.6, 1.0, 0.9, PALE, (z, y) => { dot(z, y, 0.32, SAGE); dot(z, y, 0.16, '#fbf5e6'); });
    p(box(0.08, 1.86, 1.86), PALE, { pos: [-HW + 0.05, 3.15, 5.4], line: 0.02, shadow: false }); T(plane(1.6, 1.6), tileB([2, 2]), { pos: [-HW + 0.1, 3.15, 5.4], rot: EAST });
    fr(7.5, 3.5, 1.5, 1.1, WALNUT, (z, y) => { blk(z, y - 0.3, 1.5, 0.5, '#d98a5c'); dot(z + 0.3, y + 0.15, 0.22, '#fbf5e6'); blk(z - 0.4, y + 0.05, 0.3, 0.4, LEAF); });
    fr(7.2, 2.3, 0.8, 0.8, STEEL, (z, y) => { blk(z, y, 0.5, 0.5, MUST); });
    fr(9.3, 3.0, 1.0, 1.5, PALE, (z, y) => { blk(z, y + 0.3, 0.7, 0.5, '#f6b3c0'); blk(z, y - 0.35, 0.7, 0.5, NAVY); }); }
  plant(-18.9, 10.6, 1.25);

  // ================= 大長桌（右前）：黑鐵腳的共用工作桌，六張圓凳可以坐 =================
  p(box(7, 0.16, 2.0), '#d9a86c', { pos: [10.5, 1.08, 6.6], line: 0.026 }); [-3, 3].forEach(a => { [-0.8, 0.8].forEach(b => p(box(0.1, 1.0, 0.1), STEEL, { pos: [10.5 + a, 0.5, 6.6 + b], noLine: true })); p(box(0.08, 0.08, 1.6), STEEL, { pos: [10.5 + a, 0.25, 6.6], noLine: true }); }); p(box(6, 0.07, 0.07), STEEL, { pos: [10.5, 0.25, 6.6], noLine: true });
  lamp(8.3, 1.16, 6.3, 0.4); lamp(12.9, 1.16, 6.9, 2.6); p(box(0.9, 0.05, 0.6), SILVER, { pos: [10.2, 1.19, 7.0], rot: [0, 0.1, 0], line: 0.012, shadow: false }); p(box(0.9, 0.56, 0.04), SILVER, { pos: [10.25, 1.45, 6.68], rot: [-0.2, 0.1, 0], line: 0.012 }); p(box(0.8, 0.46, 0.02), '#8fd0d8', { glow: true, pos: [10.25, 1.455, 6.71], rot: [-0.2, 0.1, 0] });
  [[RED, 0], ['#f4e9d2', 0.3], [SAGE, -0.2]].forEach(([c2, a], i) => p(box(0.6, 0.07, 0.44), c2, { pos: [11.8, 1.2 + i * 0.07, 6.3], rot: [0, a, 0], line: 0.012, shadow: false })); p(cyl(0.09, 0.07, 0.14, 8), MUST, { pos: [9.2, 1.23, 6.9], line: 0.012 }); p(cyl(0.09, 0.07, 0.14, 8), BLUE, { pos: [11.2, 1.23, 7.1], line: 0.012 });
  wall(10.5, 6.6, 3.5, 1.0);
  [[8.2, 5.0, 0], [10.5, 5.0, 0], [12.8, 5.0, 0], [8.2, 8.2, PI], [10.5, 8.2, PI], [12.8, 8.2, PI]].forEach(([x, z, f], i) => { p(cyl(0.4, 0.4, 0.12, 14), i % 2 ? TEAK : PALE, { pos: [x, 0.74, z], line: 0.022 }); [0, 2.1, 4.2].forEach(a => p(cyl(0.035, 0.035, 0.72, 5), STEEL, { pos: [x + Math.cos(a) * 0.24, 0.36, z + Math.sin(a) * 0.24], rot: [Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15], noLine: true })); seat(x, z, f, 0.8); round(x, z, 0.3); });
  pool(10.5, 6.6, 3.0);
  // 展示牆前面的閱讀角：一張單人椅和小圓毯
  p(new THREE.CircleGeometry(1.9, 28), '#e9d3b0', { pos: [-16.4, 0.014, 5.6], rot: FLOOR, noLine: true, shadow: false }); p(new THREE.RingGeometry(1.5, 1.62, 28), '#d98a5c', { pos: [-16.4, 0.018, 5.6], rot: FLOOR, noLine: true, shadow: false });
  grp([-16.3, 0, 5.6], PI / 2, () => { p(rbox(1.5, 0.42, 1.4, 0.14), '#d98a5c', { pos: [0, 0.36, 0] }); p(rbox(1.5, 0.9, 0.4, 0.16), '#d98a5c', { pos: [0, 0.8, -0.52] }); [-1, 1].forEach(k => p(rbox(0.34, 0.6, 1.3, 0.14), '#d98a5c', { pos: [k * 0.62, 0.6, 0.02] })); p(rbox(0.86, 0.18, 1.0, 0.08), LINEN, { pos: [0, 0.62, 0.12], line: 0.02, shadow: false }); p(rbox(0.5, 0.5, 0.18, 0.08), BLUE, { pos: [0.1, 0.95, -0.26], rot: [-0.28, 0, 0.12], line: 0.02 }); });
  seat(-16.3, 5.6, PI / 2, 0.72, 0.58); walls.push({ x: -16.3, z: 5.6 + OZ, hx: 0.7, hz: 0.75, ry: 0 });

  // ================= 門口（前面中間） =================
  T(plane(6, 3), tileA([3, 1.5]), { pos: [0, 0.012, 10.5], rot: FLOOR });
  [-2.7, 2.7].forEach(x => { p(box(0.34, 1.3, 0.34), TEAK, { pos: [x, 0.65, HD + 0.15], line: 0.026 }); p(sph(0.2, 10, 8), WARM, { glow: true, line: 0.02, pos: [x, 1.5, HD + 0.15] }); });   // 門口只有兩根矮柱和小燈，不擋鏡頭
  p(box(0.1, 1.5, 0.1), WALNUT, { pos: [-3.9, 0.75, HD - 0.5], noLine: true }); p(box(2.0, 0.84, 0.08), '#e5cfa0', { pos: [-3.9, 1.75, HD - 0.5], line: 0.02 }); sign('總部大廳', 1.84, { pos: [-3.9, 1.75, HD - 0.45] }); round(-3.9, HD - 0.5, 0.3);
  p(box(3.0, 0.9, 0.8), PALE, { pos: [-5.6, 0.45, 11.4] }); [-6.3, -4.9].forEach(x => p(box(0.03, 0.7, 0.03), '#c99c62', { pos: [x + 0.7, 0.45, 10.99], noLine: true, shadow: false })); wall(-5.6, 11.4, 1.5, 0.45);   // 鞋櫃
  p(cyl(0.2, 0.16, 0.3, 10), POT, { pos: [-6.4, 1.05, 11.4], line: 0.016 }); [[0, 0.2], [0.14, 0.12], [-0.13, 0.1]].forEach(([a, b]) => p(sph(0.17, 8, 6), LEAF2, { pos: [-6.4 + a, 1.3 + b, 11.4 + a * 0.5], noLine: true }));
  p(cyl(0.28, 0.24, 0.7, 12), '#8fa2a4', { pos: [4.3, 0.35, 11.3], line: 0.022 }); [[RED, 0.1, 0.15], [NAVY, -0.1, -0.12], [MUST, 0.02, -0.2]].forEach(([c2, a, b]) => { p(cyl(0.05, 0.035, 1.0, 6), c2, { pos: [4.3 + a, 0.85, 11.3 + a], rot: [b, 0, a * 1.4], noLine: true }); p(new THREE.TorusGeometry(0.06, 0.016, 4, 8, PI), WALNUT, { pos: [4.3 + a * 1.7, 1.38, 11.3 + a + b * 0.5], noLine: true, shadow: false }); }); round(4.3, 11.3, 0.4);   // 傘桶
  const EXIT = { x: 0, z: 11.0 + OZ, y: 2.4 }, SPAWN = { x: 0, z: 9.6 + OZ };

  // ================= 陽台（右邊，從中間的鐵框門出去） =================
  p(box(7.3, 0.5, 13.3), '#b89a78', { pos: [23.65, -0.26, 5], shadow: false, line: 0.035 }); T(plane(7, 13), brickTex([7, 13]), { pos: [23.5, 0.012, 5], rot: FLOOR });
  [[0.75, 4.5], [9.25, 4.5]].forEach(([cz, d]) => p(box(0.34, 0.9, d), CREAM, { pos: [HW + 0.02, 0.45, cz], line: 0.025 })); wall(HW + 0.02, 0.75, 0.2, 2.25); wall(HW + 0.02, 9.25, 0.2, 2.25); p(box(0.36, 0.9, 1.5), CREAM, { pos: [HW + 0.02, 0.45, -2.25], line: 0.025 });
  [3, 7].forEach(z => p(box(0.2, 1.3, 0.2), STEEL, { pos: [HW, 0.65, z], line: 0.02 }));
  rail(20.2, -1.5, 27, -1.5, 0, 1.1, WALNUT); rail(27, -1.5, 27, 11.5, 0, 1.1, WALNUT); rail(27, 11.5, 20.2, 11.5, 0, 1.1, WALNUT);
  wall(23.6, -6.9, 3.6, 5.3);   // 陽台北邊（作戰角東邊外面）是空的，擋起來
  // 花箱：公共花園的 12 格（跟總部的公共花園是同一塊，一箱 4 格）。植物是照花園的狀態另外畫的，看下面的 setGarden
  const PLOTS_L = [];
  [[26.2, 1.2], [26.2, 4.4], [26.2, 7.6]].forEach(([x, z]) => { p(box(1.0, 0.6, 2.6), '#c99a66', { pos: [x, 0.3, z], line: 0.024 }); p(box(0.84, 0.05, 2.44), '#6b4a32', { pos: [x, 0.6, z], noLine: true, shadow: false });
    [-0.9, -0.3, 0.3, 0.9].forEach(d => PLOTS_L.push([x, z + d])); wall(x, z, 0.55, 1.35); });
  // 種子認養箱：木箱裡插著幾包種子
  grp([25.5, 0, 10.5], 0.45, () => { p(box(1.0, 0.62, 0.74), '#c98a52', { pos: [0, 0.31, 0], line: 0.024 }); p(box(0.86, 0.04, 0.6), '#5b4636', { pos: [0, 0.6, 0], noLine: true, shadow: false });
    [[-0.26, RED], [0, MUST], [0.26, SAGE]].forEach(([a, c2], i) => { p(box(0.2, 0.34, 0.03), '#f7ecd0', { pos: [a, 0.74, 0.05 - i * 0.07], rot: [-0.2, 0, (i - 1) * 0.12], line: 0.012, shadow: false }); p(sph(0.06, 6, 5), c2, { pos: [a, 0.78, 0.075 - i * 0.07], scale: [1, 1, 0.3], noLine: true, shadow: false }); });
    sign('種子箱', 0.84, { pos: [0, 0.3, 0.376] }); });
  round(25.5, 10.5, 0.65);
  // 大水缸：裝澆花的水（許願池在前院）
  p(new THREE.LatheGeometry([[0, 0], [0.55, 0], [0.92, 0.45], [0.98, 0.8], [0.8, 1.12], [0.86, 1.2], [0.7, 1.2]].map(([a, b]) => new THREE.Vector2(a, b)), 20), '#7d5a44', { pos: [23.3, 0, 9.6] });
  p(cyl(0.74, 0.74, 0.04, 20), '#8fc7d6', { pos: [23.3, 1.1, 9.6], noLine: true, shadow: false }); [[0.25, 0.1], [-0.3, -0.15], [0.05, -0.4]].forEach(([a, b]) => p(cyl(0.17, 0.17, 0.02, 10), LEAF2, { pos: [23.3 + a, 1.13, 9.6 + b], noLine: true, shadow: false })); p(sph(0.07, 6, 5), '#f6b3c0', { pos: [23.05, 1.17, 9.45], noLine: true, shadow: false }); round(23.3, 9.6, 1.0);
  // 寵物的軟墊和碗
  p(cyl(0.8, 0.85, 0.2, 18), MUST, { pos: [21.6, 0.1, 9.9], line: 0.024 }); p(cyl(0.6, 0.6, 0.06, 18), '#f1cf7c', { pos: [21.6, 0.2, 9.9], noLine: true, shadow: false }); p(cyl(0.2, 0.15, 0.12, 10), BLUE, { pos: [21.4, 0.06, 8.6], line: 0.014 });
  // 兩張藤椅和小圓桌
  [[22.3, 0.6, 0.5], [24.7, 0.6, -0.5]].forEach(([x, z, ry]) => { grp([x, 0, z], ry, () => { p(cyl(0.55, 0.42, 0.5, 14), '#d9b27c', { pos: [0, 0.4, 0], line: 0.022 }); p(new THREE.CylinderGeometry(0.6, 0.55, 0.75, 14, 1, true, PI * 0.5, PI), '#d9b27c', { pos: [0, 0.95, 0], line: 0.02 }); p(cyl(0.48, 0.48, 0.08, 14), LINEN, { pos: [0, 0.68, 0], noLine: true, shadow: false }); }); seat(x, z, ry, 0.72, 0.4); round(x, z, 0.5); });
  p(cyl(0.45, 0.45, 0.06, 14), TEAK, { pos: [23.5, 0.7, 1.3], line: 0.018 }); p(cyl(0.05, 0.05, 0.7, 6), STEEL, { pos: [23.5, 0.35, 1.3], noLine: true }); p(cyl(0.12, 0.1, 0.2, 8), POT, { pos: [23.5, 0.83, 1.3], noLine: true }); p(sph(0.16, 8, 6), LEAF, { pos: [23.5, 1.02, 1.3], noLine: true }); round(23.5, 1.3, 0.4);
  plant(20.9, 10.7, 1.1);

  // ---- 併起來 ----
  const geoOf = (b, th) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
    if (th) g.setAttribute('th', new THREE.Float32BufferAttribute(b.t, 1)); g.setIndex(b.i); return g; };
  const toon = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: RAMP, map: GRAIN });
  const add = (b, material, cast, recv, th) => { if (!b.nv) return null; const m = new THREE.Mesh(geoOf(b, th), material); m.castShadow = cast; m.receiveShadow = recv; G.add(m); return m; };
  add(BK.cast, toon, true, true); add(BK.flat, toon, false, true); add(BK.glow, new THREE.MeshBasicMaterial({ vertexColors: true }), false, false);
  const pm = add(BK.pool, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }), false, false); if (pm) pm.renderOrder = 2;
  // 扭蛋機的玻璃罩：透明的，最後才畫
  { const gm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { rim: { value: new THREE.Color(Q.lc ? '#' + Q.lc : INK) } },
      vertexShader: 'varying float f; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vec3 n = normalize(normalMatrix*normal); f = 1.0 - abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 rim; varying float f; void main(){ float e = smoothstep(0.72, 0.8, f); float g = 0.10 + 0.22*f*f; gl_FragColor = vec4(mix(vec3(0.93,0.98,1.0), rim, e), mix(g, 0.95, e)); }' });   // 中間幾乎透明，邊緣一圈跟外框線同色
    GLASS.forEach(([g, m]) => { const me = new THREE.Mesh(g, gm); me.applyMatrix4(m); me.renderOrder = 3; G.add(me); }); }
  add(BK.line, new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { col: { value: new THREE.Color(Q.lc ? '#' + Q.lc : INK) } },
    vertexShader: 'attribute float th; void main(){ float k = 0.75 + 0.45*sin(dot(position, vec3(13.0,17.0,11.0))); vec3 p = position + normalize(normal)*th*k; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
    fragmentShader: 'uniform vec3 col; void main(){ gl_FragColor = vec4(col,1.0); }' }), false, false, true);

  // ---- 公共花園的植物：照花園的狀態（12 格）重畫，全部併成一塊，花園有變才重做 ----
  const FRUIT = { tomato: '#e2503f', guava: '#a9cf6b', apple: '#d8473d', pineapple: '#e5b03a' }, BLOOM = { tomato: '#f6d76a', guava: '#fffdf2', apple: '#f6b3c0', pineapple: '#c98ad0' };
  const lineMat = G.children[G.children.length - 1].material;
  const GARD = new THREE.Group(); G.add(GARD);
  const setGarden = (plots) => {
    GARD.children.slice().forEach(m => { m.geometry.dispose(); GARD.remove(m); });
    const keep = [BK.cast, BK.flat, BK.line]; BK.cast = BK.flat = mkB(); BK.line = mkB();
    PLOTS_L.forEach(([x, z], i) => { const pl = plots && plots[i], r = rnd(90 + i), Y = 0.625;
      p(cyl(0.25, 0.27, 0.05, 10), pl && pl.wet > 0 ? '#4b3324' : '#8a6c4c', { pos: [x, Y, z], noLine: true });   // 土：澆過水顏色比較深
      if (!pl) return; const st = pl.stage, k = pl.kind, dry = pl.wet <= 0, L1 = st === 5 ? '#9a7a52' : dry ? '#b5bd62' : LEAF, L2 = st === 5 ? '#86663f' : dry ? '#a3ab55' : LEAF2, STEM = st === 5 ? '#7a5a3a' : '#6f9a4c';
      grp([x, Y, z], r() * 6.28, () => {
        if (st === 0) { p(sph(0.13, 8, 6), '#6b4a32', { pos: [0, 0.03, 0], scale: [1, 0.5, 1], noLine: true }); p(sph(0.035, 6, 5), '#f4e9d2', { pos: [0.03, 0.1, 0.02], noLine: true, shadow: false }); return; }
        if (st === 1) { p(cyl(0.018, 0.022, 0.2, 5), STEM, { pos: [0, 0.1, 0], noLine: true }); [-1, 1].forEach(a => p(sph(0.07, 7, 5), L1, { pos: [0.07 * a, 0.21, 0], scale: [1.2, 0.35, 0.7], rot: [0, 0, 0.5 * a], line: 0.012 })); return; }
        if (st === 5) { p(cyl(0.02, 0.03, 0.42, 5), STEM, { pos: [0.05, 0.2, 0], rot: [0, 0, -0.25], noLine: true }); [[0.16, 0.36, 0.9], [-0.06, 0.26, -0.8], [0.2, 0.2, 1.3]].forEach(([a, b, c2]) => p(sph(0.09, 7, 5), L1, { pos: [a, b, 0], scale: [1.3, 0.3, 0.7], rot: [0, 0, -c2], line: 0.012 })); p(sph(0.1, 7, 5), L2, { pos: [-0.1, 0.03, 0.08], scale: [1.2, 0.3, 0.9], noLine: true }); return; }
        const big = st >= 3 ? 1.3 : 0.95, dots = (col, n, rad, y0, sp) => { for (let j = 0; j < n; j++) { const a = j / n * 6.28 + 0.5, d = sp * (0.75 + 0.25 * r()); p(sph(rad, 8, 6), col, { pos: [Math.cos(a) * d, y0 + (r() - 0.5) * 0.16, Math.sin(a) * d], line: rad > 0.06 ? 0.012 : 0, noLine: rad <= 0.06, shadow: false }); } };
        if (k === 'pineapple') { for (let j = 0; j < 9; j++) { const a = j / 9 * 6.28, tilt = 0.55 + (j % 2) * 0.3; p(new THREE.ConeGeometry(0.05, 0.5 * big, 4), j % 2 ? L2 : L1, { pos: [Math.sin(a) * 0.13, 0.2 * big, Math.cos(a) * 0.13], rot: [Math.cos(a) * tilt, 0, -Math.sin(a) * tilt], line: 0.012 }); }
          if (st === 3) p(sph(0.07, 8, 6), BLOOM[k], { pos: [0, 0.3, 0], line: 0.012, shadow: false });
          if (st === 4) { p(sph(0.15, 10, 8), FRUIT[k], { pos: [0, 0.42, 0], scale: [1, 1.3, 1], line: 0.016 }); for (let j = 0; j < 5; j++) { const a = j / 5 * 6.28; p(new THREE.ConeGeometry(0.035, 0.2, 4), LEAF2, { pos: [Math.sin(a) * 0.04, 0.68, Math.cos(a) * 0.04], rot: [Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4], noLine: true, shadow: false }); } }
          return; }
        if (k === 'tomato') { p(cyl(0.016, 0.016, 0.8 * big, 4), '#c9a36b', { pos: [0.09, 0.4 * big, -0.06], noLine: true });   // 小番茄：一根支架，旁邊一叢葉子
          p(cyl(0.02, 0.026, 0.5 * big, 5), STEM, { pos: [0, 0.25 * big, 0], noLine: true }); [[0, 0.5, 0, 0.2], [0.12, 0.33, 0.06, 0.15], [-0.12, 0.38, -0.04, 0.15], [0.02, 0.24, -0.12, 0.13]].forEach(([a, b, c2, rr], j) => p(sph(rr * big, 9, 7), j % 2 ? L2 : L1, { pos: [a * big, b * big, c2 * big], scale: [1, 0.85, 1], line: 0.016 }));
          if (st === 3) dots(BLOOM[k], 5, 0.05, 0.56, 0.25); if (st === 4) dots(FRUIT[k], 6, 0.075, 0.46, 0.26); return; }
        // 芭樂、蘋果：一棵小樹
        p(cyl(0.03, 0.045, 0.42 * big, 6), '#8a5f3d', { pos: [0, 0.21 * big, 0], line: 0.012 }); p(sph(0.26 * big, 10, 8), L1, { pos: [0, 0.58 * big, 0], scale: [1, 0.9, 1], line: 0.018 }); p(sph(0.17 * big, 8, 6), L2, { pos: [0.13 * big, 0.72 * big, 0.06], line: 0.016 });
        if (st === 3) dots(BLOOM[k], 6, 0.05, 0.78, 0.32); if (st === 4) dots(FRUIT[k], k === 'guava' ? 4 : 5, 0.085, 0.66, 0.33); });
    });
    const a1 = add(BK.cast, toon, true, true), a2 = add(BK.line, lineMat, false, false, true); [a1, a2].forEach(m => { if (m) GARD.add(m); });
    BK.cast = keep[0]; BK.flat = keep[1]; BK.line = keep[2]; };
  setGarden(null);
  const W3 = (x, z, y) => ({ x, z: z + OZ, y });
  const SPOTS = { mentor: W3(-8.6, -7.7, 2.6), mentorSeat: { x: -8.7, z: -10.4 + OZ, h: 0.47 }, gacha: W3(-9.35, 4.7, 3.5), seedbox: W3(25.5, 10.5, 1.5), plots: PLOTS_L.map(([x, z]) => W3(x, z, 1.7)), petBed: W3(21.6, 9.9, 0.26) };
  // 地板高度：作戰角高一階，樓梯是斜的
  const floorY = (x, z) => { const lz = z - OZ; if (z > -40) return 0; if (x > 8 && lz < -3) return PH; if (x > 10 && x < 13 && lz < -0.6 && lz >= -3) return PH * (-0.6 - lz) / 2.4; return 0; };
  const ms = Math.round(performance.now() - T0);
  return { G, OZ, PH, ms, walls, rounds, seats, floorY, JUKE, EXIT, SPAWN, SPOTS, setGarden, isIn: (z) => z < -40, bg: new THREE.Color('#40343a'),
    min: [-HW + 0.5, OZ - HD + 0.5], max: [26.6, OZ + HD - 0.4], tris: () => Object.values(BK).reduce((a, b) => a + b.i.length / 3, 0) };
})() : null;
