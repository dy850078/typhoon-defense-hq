// ===== 「我與機器人」：把繪師的插畫做成 3D，兩種上色共用同一批模型 =====
const V3 = THREE.Vector3;
const K = { // 配色取自繪師那張圖
  olive: '#b7c268', oliveL: '#d6da8a', orange: '#e58a45', peach: '#f0aa72', orangeD: '#cf6f33', brown: '#7b4a2b', cuff: '#9c6b34', pipe: '#f5f2e4', glove: '#a8c97f', gloveD: '#86ad62',
  visor: '#4a2f22', skin: '#f8d9bb', hair: '#23262f', tee: '#fbfaf2', stripe: '#8fb4d8', shorts: '#2c3140', sock: '#f0e7cf', shoe: '#4b4a37', sole: '#3a3a2b',
  locker: '#b4cbbd', lockerD: '#7d9a96', wall: '#e0e190', floor: '#d5d97f', blue: '#5f89bd', plush: '#d9c4e6', cream: '#fbf6e2',
};
scene.background = new THREE.Color('#f4f1e2');
if (STYLE === 'clay') renderer.toneMappingExposure = 1.05;

// ---- 小工具 ----
function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h, rnd(w + h));
  // 每張貼圖都撒一點顆粒，兩種上色都有手繪的質地
  const r = rnd(9); for (let i = 0; i < w * h / 70; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(60,40,30,0.05)'; x.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 1.4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const withMap = (map, o = {}) => ({ ...o, extra: { map, ...(o.extra || {}) } });
// 圓角方塊
function rbox(w, h, d, rad = 0.15) {
  const s = new THREE.Shape(), x = -w / 2 + rad, y = -h / 2 + rad, ww = w - rad * 2, hh = h - rad * 2;
  s.moveTo(x, y - 0); s.lineTo(x + ww, y); s.lineTo(x + ww, y + hh); s.lineTo(x, y + hh); s.lineTo(x, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - rad * 2, bevelEnabled: true, bevelSize: rad, bevelThickness: rad, bevelSegments: 5, curveSegments: 4 });
  g.translate(0, 0, -(d - rad * 2) / 2); g.computeVertexNormals(); return g;
}
// 兩點之間的一段肢體
function seg(parent, a, b, r, color, o = {}) {
  const va = new V3(...a), vb = new V3(...b), d = vb.clone().sub(va), len = d.length();
  const geo = o.flat ? new THREE.CylinderGeometry(o.r2 ?? r, r, len, 24) : new THREE.CapsuleGeometry(r, len, 8, 20);
  const m = part(parent, geo, color, { ...o, pos: va.clone().add(vb).multiplyScalar(0.5).toArray() });
  m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); return m;
}
// 讓一個群組的 +y 朝 fingers、+z 朝 palm
function orient(g, fingers, palm) {
  const y = new V3(...fingers).normalize(), z = new V3(...palm).normalize(), x = new V3().crossVectors(y, z).normalize(); z.crossVectors(x, y);
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}
const SOFT = grainTex(256, 1200, 0.045); const NOMAP = STYLE === 'ink' ? { map: SOFT } : {};
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });

// ---- 貼圖 ----
const stripeTex = tex(256, 256, (x, w, h, r) => { // 白底淺藍條紋，筆觸粗細不一、有斷點
  x.fillStyle = K.tee; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) { const y = 14 + i * 28; for (let s = 0; s < w; s += 6) { if (r() < 0.07) continue; x.fillStyle = K.stripe; x.globalAlpha = 0.65 + r() * 0.35; x.fillRect(s, y + Math.sin(s / 17 + i) * 2.2, 7, 7 + r() * 5); } }
  x.globalAlpha = 1;
}, [2, 1]);
const lockerTex = tex(512, 640, (x, w, h, r) => {
  x.fillStyle = K.locker; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(0, 0, w, 40);
  const slot = (y, x0, x1) => { x.strokeStyle = '#2d3a40'; x.lineWidth = 15; x.lineCap = 'round'; x.beginPath(); x.moveTo(x0, y); for (let s = x0; s <= x1; s += 14) x.lineTo(s, y + (r() - 0.5) * 3); x.stroke(); };
  slot(92, 120, 400); slot(140, 100, 410); slot(188, 110, 405); slot(560, 150, 380);
  // 海豹貼紙
  x.fillStyle = '#f7f6ee'; x.beginPath(); x.ellipse(170, 300, 62, 24, -0.12, 0, 7); x.fill(); x.beginPath(); x.ellipse(222, 286, 26, 22, 0, 0, 7); x.fill();
  x.beginPath(); x.moveTo(112, 300); x.lineTo(84, 284); x.lineTo(92, 316); x.fill();
  x.fillStyle = '#39424a'; x.beginPath(); x.arc(230, 282, 3, 0, 7); x.arc(216, 282, 3, 0, 7); x.fill();
  // 小熊貼紙
  x.fillStyle = '#b07a2e'; x.beginPath(); x.ellipse(350, 300, 56, 26, 0, 0, 7); x.fill(); x.beginPath(); x.arc(302, 284, 22, 0, 7); x.fill();
  x.beginPath(); x.arc(288, 266, 8, 0, 7); x.arc(314, 264, 8, 0, 7); x.fill();
  [318, 348, 378].forEach(a => x.fillRect(a, 318, 14, 16));
  x.fillStyle = '#3a2a16'; x.beginPath(); x.arc(296, 282, 2.6, 0, 7); x.arc(308, 282, 2.6, 0, 7); x.fill();
  x.strokeStyle = '#7a5218'; x.lineWidth = 5; [[330, 290, 345, 312], [352, 288, 366, 312], [374, 290, 388, 310]].forEach(([a, b, c, d]) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); });
  // 便條紙 + 黃膠帶
  x.save(); x.translate(250, 440); x.rotate(-0.16); x.fillStyle = '#f3ead0'; x.fillRect(-78, -52, 156, 104);
  x.strokeStyle = '#8a8672'; x.lineWidth = 4; [[-50, -18, 40, -22], [-52, 4, 20, 0], [-48, 26, 30, 22]].forEach(([a, b, c, d]) => { x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo((a + c) / 2, b - 8, c, d); x.stroke(); });
  x.fillStyle = '#efd35e'; x.save(); x.translate(60, -52); x.rotate(0.5); x.fillRect(-26, -9, 52, 18); x.restore(); x.restore();
});
const chestTex = tex(512, 512, (x, w, h, r) => { // 胸口：橘色愛心形的方格面板＋黃線
  x.fillStyle = K.orange; x.fillRect(0, 0, w, h);
  x.fillStyle = K.orangeD; x.beginPath(); x.moveTo(256, 440); x.bezierCurveTo(60, 300, 80, 90, 256, 170); x.bezierCurveTo(432, 90, 452, 300, 256, 440); x.fill();
  x.save(); x.clip(); for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) if ((i + j) % 2 === 0 && r() < 0.8) { x.fillStyle = 'rgba(245,170,110,0.75)'; x.fillRect(100 + i * 27, 110 + j * 27, 21, 21); } x.restore();
  x.strokeStyle = '#f0cf62'; x.lineWidth = 12; x.lineCap = 'round';
  x.beginPath(); x.moveTo(400, 90); x.quadraticCurveTo(430, 200, 380, 300); x.stroke(); x.beginPath(); x.moveTo(110, 90); x.quadraticCurveTo(84, 180, 118, 262); x.stroke();
  x.strokeStyle = 'rgba(255,240,210,0.7)'; x.lineWidth = 6; x.strokeRect(26, 26, 460, 460);
});
const wallTex = tex(1400, 900, (x, w, h, r) => {
  x.fillStyle = K.wall; x.fillRect(0, 0, w, h); x.fillStyle = '#f7f5e8'; x.fillRect(0, 0, w, 150);
  x.fillStyle = 'rgba(190,200,110,0.22)'; for (let i = 0; i < 40; i++) { x.beginPath(); x.ellipse(r() * w, 150 + r() * 750, 60 + r() * 120, 20 + r() * 40, 0, 0, 7); x.fill(); }
  // 藍色齒輪圓環
  x.strokeStyle = K.blue; x.lineCap = 'butt'; const cx = 330, cy = 640;
  x.lineWidth = 46; x.beginPath(); x.arc(cx, cy, 110, 0, 7); x.stroke();
  x.lineWidth = 34; x.beginPath(); x.arc(cx, cy, 220, Math.PI * 0.75, Math.PI * 1.95); x.stroke();
  x.lineWidth = 9; x.beginPath(); x.arc(cx, cy, 285, Math.PI * 0.6, Math.PI * 1.7); x.stroke();
  for (let i = 0; i < 7; i++) { const a = Math.PI * 0.8 + i * 0.36; x.save(); x.translate(cx + Math.cos(a) * 250, cy + Math.sin(a) * 250); x.rotate(a); x.fillStyle = K.blue; x.fillRect(-12, -22, 44, 44); x.restore(); }
  x.lineWidth = 9; x.beginPath(); x.moveTo(60, 520); x.lineTo(150, 520); x.lineTo(150, 440); x.lineTo(230, 440); x.stroke();
  // 右邊的螢幕面板
  [[1010, 520, 260, 44], [1090, 600, 250, 120], [1150, 470, 180, 30]].forEach(([a, b, c, d]) => { x.fillStyle = K.blue; x.fillRect(a, b, c, d); x.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 5; i++) x.fillRect(a + 14, b + 10 + i * 20, (c - 28) * (0.4 + r() * 0.6), 5); });
  x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 5; x.beginPath(); x.moveTo(1010, 760); x.lineTo(1100, 760); x.lineTo(1100, 730); x.lineTo(1300, 730); x.stroke();
});
const floorTex = tex(512, 512, (x, w, h) => { x.fillStyle = K.floor; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(250,250,210,0.85)'; x.lineWidth = 6; x.strokeRect(0, 0, w, h); }, [10, 10]);
const soleTex = tex(256, 256, (x, w, h) => { x.fillStyle = K.sole; x.fillRect(0, 0, w, h); x.strokeStyle = '#8a8a66'; x.lineWidth = 7; for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(128, 128, 20 + i * 18, 26 + i * 20, 0, 0, 7); x.stroke(); } for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(0, i * 30); x.lineTo(256, i * 30 + 20); x.stroke(); } });

const grassTex = tex(512, 512, (x, w, h) => { const r = rnd(9); x.fillStyle = '#c9d77f'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 12; i++) { x.fillStyle = ['rgba(180,202,106,0.4)', 'rgba(220,226,146,0.45)', 'rgba(168,194,100,0.35)'][i % 3]; x.beginPath(); x.ellipse(r() * w, r() * h, 20 + r() * 50, 12 + r() * 26, r() * 3, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(130,160,80,0.5)'; x.lineWidth = 3; x.lineCap = 'round'; for (let i = 0; i < 12; i++) { const a = r() * w, b = r() * h; x.beginPath(); x.moveTo(a, b); x.lineTo(a - 3, b - 12); x.moveTo(a + 6, b); x.lineTo(a + 8, b - 10); x.stroke(); } }, [25, 25]);
const A = {};
// ---- 場景：牆、地板 ----
{
  const mk = (map) => STYLE === 'clay' ? new THREE.MeshStandardMaterial({ map, roughness: 1 }) : new THREE.MeshToonMaterial({ map, gradientMap: RAMP });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), mk(wallTex)); wall.position.set(0, 5.2, -4.6); wall.receiveShadow = true; if (!Q.battle && !Q.walk) scene.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry((Q.battle || Q.walk) ? 400 : 40, (Q.battle || Q.walk) ? 400 : 40), mk((Q.battle || Q.walk) ? grassTex : floorTex)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor); A.floor = floor;
}

// ---- 機器人的手：手掌 + 四指 + 拇指；curl 越大握得越緊 ----
function makeHand(curl, o = {}) {
  const g = new THREE.Group(), L = 0.04;
  part(g, rbox(1.0, 0.95, 0.5, 0.2), K.glove, { pos: [0, 0, 0], line: L });
  part(g, rbox(0.84, 0.3, 0.52, 0.12), K.gloveD, { pos: [0, 0.3, -0.03], line: L * 0.6 }); // 指節那一排
  [-0.36, -0.12, 0.12, 0.36].forEach((x, i) => {
    const c = o.point && i === 0 ? 0.15 : curl + (i - 1.5) * 0.05;
    const k1 = new THREE.Group(); k1.position.set(x, 0.5, 0.02); k1.rotation.x = c; g.add(k1);
    part(k1, new THREE.CapsuleGeometry(0.115, 0.26, 6, 14), K.glove, { pos: [0, 0.2, 0], line: L });
    const k2 = new THREE.Group(); k2.position.set(0, 0.42, 0); k2.rotation.x = c * 1.15; k1.add(k2);
    part(k2, new THREE.CapsuleGeometry(0.105, 0.22, 6, 14), K.glove, { pos: [0, 0.17, 0], line: L });
    part(k1, sph(0.125, 12, 10), K.cuff, { pos: [0, 0.42, 0], line: L * 0.5 });
  });
  const t1 = new THREE.Group(); t1.position.set(0.52 * (o.side || 1), -0.12, 0.12); t1.rotation.set(curl * 0.6, 0, -0.9 * (o.side || 1)); g.add(t1);
  part(t1, new THREE.CapsuleGeometry(0.13, 0.3, 6, 14), K.glove, { pos: [0, 0.2, 0], line: L });
  // 袖口
  part(g, new THREE.CylinderGeometry(0.5, 0.56, 0.36, 24), K.cuff, { pos: [0, -0.62, 0], line: L });
  return g;
}

// ---- 機器人（第二版：更厚實、臉是內凹的洞、胸口空洞裡有人造心臟和電纜）----
function cutSphere(inHole) { // 把球面上落在洞裡的三角形拿掉
  const src = new THREE.SphereGeometry(1, 96, 64).toNonIndexed(), p = src.attributes.position, n = src.attributes.normal, P = [], N = [];
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    if (inHole(cx, cy, cz)) continue;
    for (let k = 0; k < 3; k++) { P.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k)); N.push(n.getX(i + k), n.getY(i + k), n.getZ(i + k)); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(P.length / 3 * 2).fill(0.5), 2)); return g;
}
const DARK = '#2e1c14';
// 洞的內壁：只畫裡面那一面，顏色很深，看起來就是凹進去的
function cavity(parent, w, h, d, pos) {
  const m = STYLE === 'clay' ? new THREE.MeshStandardMaterial({ color: DARK, roughness: 1, side: THREE.BackSide }) : new THREE.MeshToonMaterial({ color: DARK, gradientMap: RAMP, side: THREE.BackSide });
  const g = new THREE.BoxGeometry(w, h, d); const mesh = new THREE.Mesh(g, m); mesh.position.set(...pos); mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function makeRobot() {
  const bot = new THREE.Group(); scene.add(bot); const L = 0.045; A.bot = bot;
  const torso = new THREE.Group(); torso.position.set(0, 3.8, -2.05); torso.rotation.x = 0.24; bot.add(torso);
  // 胸甲：後面一整塊，前面四塊圍出一個空洞
  const cx = -0.95, cy = 0.22, cw = 1.95, ch = 1.85, HW = 2.45, HH = 1.5;
  part(torso, rbox(HW * 2, HH * 2, 1.3, 0.3), K.orangeD, { pos: [0, 0, -0.5], line: L });
  const fz = 0.6, fd = 1.1;
  part(torso, rbox(cx - cw / 2 + HW, HH * 2, fd, 0.14), K.orange, { pos: [(-HW + cx - cw / 2) / 2, 0, fz], line: L });
  part(torso, rbox(HW - (cx + cw / 2), HH * 2, fd, 0.14), K.orange, { pos: [(HW + cx + cw / 2) / 2, 0, fz], line: L });
  part(torso, rbox(cw + 0.1, HH - (cy + ch / 2), fd, 0.1), K.orange, { pos: [cx, (HH + cy + ch / 2) / 2, fz], line: L });
  part(torso, rbox(cw + 0.1, HH + (cy - ch / 2), fd, 0.1), K.orange, { pos: [cx, (-HH + cy - ch / 2) / 2, fz], line: L });
  cavity(torso, cw, ch, 1.25, [cx, cy, 0.55]);
  // 洞口的框
  [[cx, cy + ch / 2 + 0.02, cw + 0.3, 0.14], [cx, cy - ch / 2 - 0.02, cw + 0.3, 0.14], [cx - cw / 2 - 0.02, cy, 0.14, ch + 0.3], [cx + cw / 2 + 0.02, cy, 0.14, ch + 0.3]].forEach(([x, y, w, h]) => part(torso, rbox(w, h, 0.2, 0.05), K.oliveL, { pos: [x, y, 1.14], line: 0.025 }));
  // 人造心臟
  const hs = new THREE.Shape(); hs.moveTo(0, -0.48); hs.bezierCurveTo(-0.7, -0.05, -0.55, 0.52, 0, 0.2); hs.bezierCurveTo(0.55, 0.52, 0.7, -0.05, 0, -0.48);
  const hgeo = new THREE.ExtrudeGeometry(hs, { depth: 0.16, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.16, bevelSegments: 6, curveSegments: 24 }); hgeo.translate(0, 0, -0.08);
  const heart = new THREE.Group(); heart.position.set(cx, cy - 0.02, 0.55); heart.rotation.z = 0.12; torso.add(heart); A.heart = heart; A.torso = torso;
  const heartMat = STYLE === 'clay' ? new THREE.MeshStandardMaterial({ color: '#e4513c', roughness: 0.45, emissive: '#a02a18', emissiveIntensity: 0.3 }) : new THREE.MeshToonMaterial({ color: '#ee5a44', gradientMap: RAMP, map: SOFT });
  part(heart, hgeo, '#e4513c', { mat: heartMat, line: 0.03, scale: 1.12 });
  const glow = new THREE.PointLight(0xff9a6a, STYLE === 'clay' ? 1.2 : 0.7, 2.6); glow.position.set(cx, cy, 0.75); torso.add(glow); A.glow = glow; A.glow0 = glow.intensity;
  // 電纜：像血管一樣從心臟接到洞的四周
  const cable = (pts, col, r0 = 0.055) => { const r = r0 * 1.35;
    const c = new THREE.CatmullRomCurve3(pts.map(a => new V3(cx + a[0], cy + a[1], a[2])));
    part(torso, new THREE.TubeGeometry(c, 40, r, 10), col, { line: 0.016, extra: NOMAP });
    const e = pts[pts.length - 1]; part(torso, new THREE.CylinderGeometry(r * 1.9, r * 1.9, 0.12, 10), K.cuff, { pos: [cx + e[0], cy + e[1], e[2]], rot: [Math.PI / 2, 0, 0], line: 0.012 });
  };
  const RED = '#d8483a', BLU = '#4f79b3', YEL = '#f0cf62';
  cable([[-0.22, 0.62, 0.55], [-0.38, 0.85, 0.7], [-0.7, 0.8, 0.6], [-0.86, 0.5, 0.2]], RED, 0.07);
  cable([[0.26, 0.6, 0.55], [0.5, 0.86, 0.72], [0.82, 0.7, 0.55], [0.86, 0.36, 0.2]], BLU, 0.07);
  cable([[-0.42, 0.0, 0.6], [-0.7, 0.08, 0.78], [-0.86, -0.2, 0.6], [-0.84, -0.5, 0.2]], BLU);
  cable([[0.44, -0.04, 0.6], [0.72, -0.1, 0.8], [0.8, -0.45, 0.6], [0.6, -0.78, 0.2]], RED);
  cable([[-0.06, -0.5, 0.58], [-0.2, -0.74, 0.76], [-0.5, -0.78, 0.55], [-0.6, -0.84, 0.2]], YEL, 0.045);
  cable([[0.1, -0.42, 0.6], [0.24, -0.72, 0.72], [0.14, -0.86, 0.4], [0.1, -0.86, 0.2]], YEL, 0.045);
  cable([[-0.3, 0.3, 0.72], [-0.62, 0.42, 0.86], [-0.9, 0.2, 0.7], [-0.9, 0.05, 0.2]], YEL, 0.04);
  cable([[0.34, 0.3, 0.72], [0.6, 0.36, 0.9], [0.9, 0.12, 0.72], [0.9, -0.1, 0.2]], RED, 0.04);
  // 右胸的面板
  part(torso, rbox(1.3, 1.7, 0.14, 0.05), K.peach, { pos: [1.3, 0.05, 1.16], line: 0.03 });
  [0.5, 0.1, -0.3].forEach(y => part(torso, rbox(0.9, 0.12, 0.08, 0.02), K.oliveL, { pos: [1.3, y, 1.25], noLine: true, shadow: false }));
  part(torso, rbox(3.0, 0.75, 2.0, 0.22), K.brown, { pos: [0, 1.75, 0], line: L });      // 領口
  part(torso, rbox(3.4, 1.3, 2.0, 0.28), K.brown, { pos: [0, -2.0, -0.05], line: L });   // 腰
  part(torso, rbox(4.1, 0.6, 2.2, 0.22), K.olive, { pos: [0, -2.7, -0.05], line: L });   // 腰帶
  [-1, 1].forEach(k => { part(torso, rbox(2.2, 1.35, 2.5, 0.38), K.peach, { pos: [3.15 * k, 1.2, 0.0], rot: [0, 0, -0.2 * k], line: L }); part(torso, rbox(1.6, 0.26, 2.56, 0.1), K.oliveL, { pos: [3.1 * k, 0.55, 0.0], rot: [0, 0, -0.2 * k], line: 0.03 }); });
  // 頭：臉上是一個方形的凹洞，眼睛在洞的深處
  part(torso, new THREE.CylinderGeometry(0.68, 0.8, 0.7, 24), K.visor, { pos: [0.05, 2.2, 0.25], line: L });
  const head = new THREE.Group(); head.position.set(0.15, 3.25, 0.62); head.rotation.set(0.24, -0.12, 0.08); head.scale.setScalar(1.2); torso.add(head); A.rhead = head;
  const hx0 = -0.32, hx1 = 0.56, hy0 = -0.58, hy1 = 0.18, SY = 1.2;
  part(head, cutSphere((x, y, z) => z > 0 && x > hx0 && x < hx1 && y * SY > hy0 && y * SY < hy1), K.olive, { scale: [1.0, SY, 1.03], line: L });
  const hw = hx1 - hx0, hh = hy1 - hy0, hcx = (hx0 + hx1) / 2, hcy = (hy0 + hy1) / 2;
  cavity(head, hw, hh, 0.9, [hcx, hcy, 0.56]);
  [[hcx, hy1 + 0.04, hw + 0.26, 0.13], [hcx, hy0 - 0.04, hw + 0.26, 0.13], [hx0 - 0.04, hcy, 0.13, hh + 0.26], [hx1 + 0.04, hcy, 0.13, hh + 0.26]].forEach(([x, y, w, h]) => part(head, rbox(w + 0.08, h + 0.08, 0.46, 0.08), K.olive, { pos: [x, y, 0.75], line: 0.03 }));
  const eyeM = STYLE === 'clay' ? new THREE.MeshStandardMaterial({ color: '#f3f0b8', emissive: '#d8d27a', emissiveIntensity: 0.9 }) : basic('#f6f2b4');
  part(head, sph(0.2, 16, 12), '#f3f0b8', { pos: [hcx, hcy - 0.02, 0.42], mat: eyeM, line: 0.02 });
  A.pupil = part(head, sph(0.085, 10, 8), DARK, { pos: [hcx, hcy - 0.05, 0.6], noLine: true, shadow: false, mat: basic(DARK) }); A.px = hcx;
  part(head, new THREE.TorusGeometry(1.0, 0.05, 8, 48, Math.PI * 1.45), K.visor, { pos: [0, -0.2, 0], rot: [Math.PI / 2, 0, Math.PI * 0.72], scale: [1.01, 1.04, 1], noLine: true });
  [-1, 1].forEach(k => part(head, new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16), K.orange, { pos: [1.0 * k, -0.2, 0], rot: [0, 0, Math.PI / 2], line: 0.03 }));

  if (!Q.walk) {
  // 左手：從旁邊繞到人前面，掌心朝上把人捧住
  const sL = [-3.6, 4.75, -1.4], eL = [-4.15, 2.3, 1.0], wL = [-3.1, 1.4, 2.7];
  seg(bot, sL, eL, 0.78, K.peach, { line: L }); part(bot, sph(0.9), K.brown, { pos: eL, line: L });
  seg(bot, eL, wL, 0.64, K.pipe, { flat: true, r2: 0.6, line: L });
  const hL = makeHand(0.5, { side: 1, point: true }); A.hL = hL; hL.position.set(-2.5, 1.25, 3.1); orient(hL, [1, 0.12, -0.25], [0.15, 0.75, -0.65]); hL.scale.setScalar(1.5); bot.add(hL);
  // 右手：前臂立在人旁邊讓他扶著，拳頭在上面
  const sR = [3.6, 4.75, -1.4], eR = [2.75, 1.15, 1.7], wR = [1.72, 3.55, 1.35];
  seg(bot, sR, eR, 0.78, K.peach, { line: L }); part(bot, sph(0.9), K.brown, { pos: eR, line: L });
  seg(bot, eR, wR, 0.62, K.pipe, { flat: true, r2: 0.58, line: L });
  const hR = makeHand(1.35, { side: -1 }); A.hR = hR; hR.position.set(1.5, 4.55, 1.35); orient(hR, [-0.22, 1, 0], [-0.75, -0.1, -0.5]); hR.scale.setScalar(1.5); bot.add(hR);
  // 雙腿：粗粗的，從後面伸到置物箱兩邊把人圍住
  [-1, 1].forEach(k => {
    const hip = [1.9 * k, 1.15, -2.0], knee = [3.7 * k, 1.3, 1.3], ank = [3.95 * k, 0.72, 3.5];
    seg(bot, hip, knee, 0.95, K.orange, { line: L }); part(bot, sph(1.02), K.brown, { pos: knee, line: L });
    seg(bot, knee, ank, 0.7, K.pipe, { flat: true, r2: 0.66, line: L });
    part(bot, rbox(1.7, 1.05, 2.2, 0.32), K.glove, { pos: [3.95 * k, 0.56, 4.1], rot: [0, 0.12 * k, 0], line: L });
    part(bot, rbox(1.76, 0.26, 2.26, 0.1), K.cuff, { pos: [3.95 * k, 0.14, 4.1], rot: [0, 0.12 * k, 0], line: 0.03 });
  });
  }
  return bot;
}


// ---- 置物箱 ----
function makeLocker() {
  const g = new THREE.Group(); g.position.set(0, 0, 0.55); scene.add(g);
  part(g, rbox(1.75, 1.45, 1.25, 0.06), K.locker, { pos: [0, 0.725, 0], line: 0.04 });
  part(g, new THREE.PlaneGeometry(1.6, 1.36), '#fff', withMap(lockerTex, { pos: [0, 0.72, 0.632], noLine: true, shadow: false }));
  part(g, rbox(0.06, 1.36, 1.1, 0.02), K.lockerD, { pos: [0.88, 0.72, 0], noLine: true });
  // 淡紫色玩偶，趴在箱子後面
  const p = new THREE.Group(); p.position.set(1.25, 1.2, -0.2); scene.add(p); A.plush = p;
  part(p, sph(0.34), K.plush, { scale: [1.1, 0.8, 1], line: 0.025 });
  [[-0.2, -0.22, 0.2], [0.1, -0.26, 0.26], [0.3, -0.2, 0.05]].forEach(a => part(p, sph(0.12, 10, 8), K.plush, { pos: a, scale: [0.8, 1.4, 0.8], line: 0.02 }));
  [-0.1, 0.08].forEach(x => part(p, sph(0.03, 8, 6), K.visor, { pos: [x, 0.04, 0.33], noLine: true, shadow: false, mat: basic(K.visor) }));
  return g;
}

// ---- 人物（第二版）：矮胖的大頭小人，手腳短短粗粗 ----
function makeBoy() {
  const g = new THREE.Group(); g.position.set(0, 1.04, 0.55); g.scale.setScalar(1.25); scene.add(g); const L = 0.024; A.boy = g;
  const body = new THREE.LatheGeometry([[0, 0.34], [0.36, 0.34], [0.42, 0.42], [0.39, 0.6], [0.31, 0.84], [0.19, 0.93], [0, 0.95]].map(([x, y]) => new THREE.Vector2(x, y)), 32);
  part(g, body, '#fff', withMap(stripeTex, { scale: [1.05, 1, 0.9], line: L }));
  part(g, new THREE.TorusGeometry(0.17, 0.035, 8, 24), K.tee, { pos: [0, 0.93, 0], rot: [Math.PI / 2, 0, 0], line: 0.012 });
  part(g, sph(0.42, 24, 16), K.shorts, { pos: [0, 0.37, 0.02], scale: [1.05, 0.48, 0.95], line: L });
  const limb = (a, b, r, c, o = {}) => seg(g, a, b, r, c, { line: L, ...o });
  if (!Q.walk) {
  // 右腿（畫面左）：很短，鞋子直接從身體下面伸出來
  limb([-0.17, 0.42, 0.22], [-0.27, 0.42, 0.46], 0.17, K.shorts);
  limb([-0.29, 0.4, 0.52], [-0.3, 0.33, 0.6], 0.125, K.skin, { extra: NOMAP });
  limb([-0.3, 0.31, 0.6], [-0.3, 0.25, 0.62], 0.14, K.sock, { flat: true });
  part(g, sph(0.2, 18, 12), K.shoe, { pos: [-0.31, 0.17, 0.7], scale: [0.95, 0.72, 1.4], rot: [0.2, -0.15, 0], line: L });
  // 左腿（畫面右）：往前伸，看得到鞋底
  limb([0.17, 0.42, 0.22], [0.27, 0.43, 0.46], 0.17, K.shorts);
  limb([0.29, 0.42, 0.52], [0.33, 0.42, 0.64], 0.125, K.skin, { extra: NOMAP });
  limb([0.33, 0.42, 0.64], [0.35, 0.42, 0.72], 0.14, K.sock, { flat: true });
  const shoe = new THREE.Group(); shoe.position.set(0.37, 0.42, 0.85); shoe.rotation.set(-1.2, 0.2, 0.1); g.add(shoe); A.shoe = shoe;
  part(shoe, sph(0.2, 18, 12), K.shoe, { scale: [0.95, 0.72, 1.4], line: L });
  part(shoe, new THREE.CircleGeometry(0.19, 24), '#fff', withMap(soleTex, { pos: [0, -0.132, 0], rot: [Math.PI / 2, 0, 0], scale: [0.95, 1.4, 1], noLine: true, shadow: false }));
  // 右手（畫面左）：放在腿上
  part(g, new THREE.CapsuleGeometry(0.13, 0.08, 6, 14), '#fff', withMap(stripeTex, { pos: [-0.37, 0.8, 0.03], rot: [0, 0, 0.45], line: L }));
  limb([-0.42, 0.72, 0.06], [-0.36, 0.52, 0.3], 0.1, K.skin, { extra: NOMAP });
  part(g, sph(0.11, 14, 10), K.skin, { extra: NOMAP, pos: [-0.33, 0.46, 0.37], line: L });
  // 左手（畫面右）：舉起來扶著機器人的手臂
  part(g, new THREE.CapsuleGeometry(0.13, 0.08, 6, 14), '#fff', withMap(stripeTex, { pos: [0.39, 0.86, 0.04], rot: [0, 0, -1.0], line: L }));
  limb([0.46, 0.9, 0.06], [0.84, 1.13, 0.5], 0.1, K.skin, { extra: NOMAP });
  part(g, sph(0.12, 14, 10), K.skin, { extra: NOMAP, pos: [0.9, 1.17, 0.56], scale: [1.1, 1, 1.1], line: L });
  }
  // 頭
  const head = new THREE.Group(); head.position.set(0, 1.36, 0); head.rotation.set(0.06, -0.1, -0.1); g.add(head); A.bhead = head;
  part(head, sph(0.5, 36, 26), K.skin, { extra: NOMAP, scale: [1, 0.97, 0.94], line: L });
  [-1, 1].forEach(k => { part(head, sph(0.15), K.skin, { extra: NOMAP, pos: [0.49 * k, -0.04, -0.02], scale: [0.7, 1, 0.5], line: L }); part(head, sph(0.075, 12, 8), '#f1b9a4', { pos: [0.51 * k, -0.04, 0.05], scale: [0.6, 1, 0.4], noLine: true, shadow: false }); });
  // 頭髮：短短的西瓜皮，鬢角和後頸剃光；瀏海齊齊的，只有正中間像被風吹開
  part(head, new THREE.SphereGeometry(0.507, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.66), '#cdb6a4', { rot: [-0.85, 0, 0], scale: [1.0, 0.985, 0.95], noLine: true, extra: NOMAP });   // 剃光的地方：淡淡的青皮
  part(head, new THREE.SphereGeometry(0.535, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.47), K.hair, { rot: [-0.22, 0, 0], scale: [1.03, 1.02, 1.0], line: L });
  const lock = (ax, e, sx, sy, tilt) => { const d = new V3(Math.sin(ax) * Math.cos(e), Math.sin(e), Math.cos(ax) * Math.cos(e)); const m = part(head, sph(0.15, 18, 12), K.hair, { pos: [d.x * 0.475, d.y * 0.47 - 0.02, d.z * 0.455], scale: [sx, sy, 0.4], line: 0.018 }); m.quaternion.setFromUnitVectors(new V3(0, 0, 1), d); m.rotateZ(tilt); return m; };
  [-0.98, -0.72, -0.46].forEach(ax => lock(ax, 0.5, 1.0, 0.92, 0)); [0.38, 0.64, 0.9].forEach(ax => lock(ax, 0.5, 1.0, 0.92, 0));
  lock(-0.25, 0.6, 0.72, 0.9, -0.95); lock(0.17, 0.6, 0.72, 0.9, 0.95);     // 中間兩撮：髮尾往兩邊翹開
  // 臉：細框圓眼鏡、閉著的笑眼、小小的微笑
  const z = 0.46, dark = basic(K.hair);
  [-1, 1].forEach(k => {
    part(head, new THREE.TorusGeometry(0.06, 0.013, 6, 16, Math.PI), K.hair, { pos: [0.17 * k, 0.0, z + 0.005], rot: [0, 0.2 * k, Math.PI], noLine: true, shadow: false, mat: dark });
    part(head, new THREE.TorusGeometry(0.125, 0.012, 8, 32), K.hair, { pos: [0.17 * k, 0.0, z + 0.03], rot: [0, 0.2 * k, 0], noLine: true, shadow: false, mat: dark });
    part(head, new THREE.CylinderGeometry(0.01, 0.01, 0.2, 6), K.hair, { pos: [0.38 * k, 0.02, 0.36], rot: [Math.PI / 2, 0, -0.5 * k], noLine: true, shadow: false, mat: dark });
    part(head, new THREE.CircleGeometry(0.09, 20), '#f58d86', { pos: [0.3 * k, -0.15, 0.37], rot: [0.1, 0.62 * k, 0], scale: [1.1, 0.7, 1], noLine: true, shadow: false, mat: basic('#f3a08f', { transparent: true, opacity: 0.5 }) });
  });
  part(head, new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6), K.hair, { pos: [0, 0.01, z + 0.04], rot: [0, 0, Math.PI / 2], noLine: true, shadow: false, mat: dark });
  part(head, sph(0.06, 14, 10), '#f3b49a', { pos: [0, -0.09, 0.47], line: 0.01 });
  part(head, new THREE.TorusGeometry(0.075, 0.013, 6, 16, Math.PI * 0.8), K.hair, { pos: [0.01, -0.2, 0.44], rot: [0.2, 0, Math.PI * 1.1], noLine: true, shadow: false, mat: dark });
  return g;
}

makeRobot(); { const lk = makeLocker(); if (Q.walk) lk.visible = false; } makeBoy();
