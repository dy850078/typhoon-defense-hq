(function () {
'use strict';
// 新世界測試頁的場景（管理員限定）。模型都是用程式的基本形狀拼出來的，之後會分批換成正式的。
// 這個檔是從試做的幾段程式組起來的，clay / mix 的分支是當時比較用的，這裡固定走 ink（淡黑線版）。
const Q = { style: 'ink', lc: 'c2a48a', lw: '0.8', walk: 1, town: 1 };   // 美術方向：淡黑線版
const STYLE = Q.style || 'clay', MODE = Q.mode || 'scene';
let W = window.innerWidth, H = window.innerHeight; const DPR = 1.5;
const INK = 0x2b2a33;
// 配色：clay 沿用遊戲現在的顏色；ink 用繪師那張的黃綠、橘、藍、米白
const PAL = STYLE === 'clay' ? {
  grass: '#9cc98f', grass2: '#86b97c', path: '#ecd9ae', cliff: '#c08a55', water: '#7fd0d8', pine: '#3f8a63', pine2: '#5aa878', leaf: '#b7d36a', leaf2: '#e79a45',
  trunk: '#8a5a3a', rock: '#d9c9a0', wall: '#b9794d', roof: '#e2bd6c', sky: '#cfe7e4', coat: '#ff7a2f', coat2: '#4f7cc2', skin: '#fde0cc', skin2: '#f6cfae',
  hair: '#2b2a33', hair2: '#6b4a32', boot: '#2f3b55', leg: '#8a5a3a', wing: '#ffffff', pet: '#fff6ea', scarf: '#e5484d', gold: '#f2c14e', cap: '#f2a2b2',
} : {
  grass: '#dfe08e', grass2: '#c3cf73', path: '#f4e7bf', cliff: '#d99a5b', water: '#8fb7d8', pine: '#8fae5a', pine2: '#a9c267', leaf: '#cfd66f', leaf2: '#ec9a52',
  trunk: '#a8693f', rock: '#f0d9a8', wall: '#e39a5c', roof: '#f3d27a', sky: '#f6f1dc', coat: '#ee8a43', coat2: '#5f89bd', skin: '#fbdcc0', skin2: '#f3c8a2',
  hair: '#2f3340', hair2: '#7a5236', boot: '#39435c', leg: '#a8693f', wing: '#fdfbf2', pet: '#fdf6e6', scarf: '#e0604a', gold: '#f0c75a', cap: '#f0a9a6',
};

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(DPR); renderer.setSize(W, H);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if (STYLE === 'clay') { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; }
const scene = new THREE.Scene(); scene.background = new THREE.Color(PAL.sky);
const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 200);

// ---- 貼圖：蠟筆顆粒、漸層階 ----
function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
function grainTex(size = 256, n = 5000, a = 0.10) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); const r = rnd(5);
  x.fillStyle = '#fff'; x.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) { x.fillStyle = r() < 0.5 ? `rgba(60,40,30,${a})` : `rgba(255,255,255,${a * 2})`; x.fillRect(r() * size, r() * size, 1 + r() * 5, 1 + r() * 1.5); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GRAIN = grainTex();
const RAMP = (() => { const t = new THREE.DataTexture(new Uint8Array([150, 215, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
function mat(color, o = {}) {
  if (STYLE === 'clay') return new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.72, metalness: 0, ...(o.extra || {}) });
  return new THREE.MeshToonMaterial({ color, gradientMap: RAMP, map: GRAIN, ...(o.extra || {}) });
}
// 外框：把模型往外推一圈、只畫背面；粗細帶一點抖動，像手畫的線
function outlineMat(th) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { th: { value: th * +(Q.lw || 1) }, col: { value: new THREE.Color(Q.lc ? '#' + Q.lc : INK) } },
    vertexShader: 'uniform float th; void main(){ float k = 0.75 + 0.45*sin(dot(position, vec3(13.0,17.0,11.0))); vec3 p = position + normalize(normal)*th*k; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
    fragmentShader: 'uniform vec3 col; void main(){ gl_FragColor = vec4(col,1.0); }',
  });
}
// 加一個零件；o: pos, scale, rot, noLine, line(外框粗細), shadow
function part(parent, geo, color, o = {}) {
  const m = new THREE.Mesh(geo, o.mat || mat(color, o));
  if (o.pos) m.position.set(...o.pos); if (o.rot) m.rotation.set(...o.rot);
  const s = o.scale ? (Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]) : [1, 1, 1]; m.scale.set(...s);
  m.castShadow = o.shadow !== false; m.receiveShadow = true;
  if (STYLE !== 'clay' && !o.noLine) { const ol = new THREE.Mesh(geo, outlineMat((o.line ?? 0.028) / Math.max(...s.map(Math.abs)))); m.add(ol); }
  parent.add(m); return m;
}
const sph = (r, a = 24, b = 16) => new THREE.SphereGeometry(r, a, b);
// ---- 角色：大頭、大耳朵、圓眼鏡、紅鼻子、紅臉頰、雨衣、雨鞋 ----
function makeChar(p) {
  const g = new THREE.Group(), skin = p.skin || PAL.skin;
  // 腿（從髖部轉動）
  g.legs = [-1, 1].map(k => {
    const hip = new THREE.Group(); hip.position.set(0.14 * k, 0.36, 0); g.add(hip);
    part(hip, new THREE.CylinderGeometry(0.085, 0.085, 0.26, 12), PAL.leg, { pos: [0, -0.14, 0] });
    part(hip, sph(0.13), PAL.boot, { pos: [0, -0.28, 0.04], scale: [1, 0.72, 1.35] });
    return hip;
  });
  // 雨衣
  const body = new THREE.LatheGeometry([[0, 0.34], [0.36, 0.34], [0.41, 0.4], [0.36, 0.56], [0.27, 0.84], [0.17, 0.92], [0, 0.94]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
  part(g, body, p.coat, { scale: [1, 1, 0.86] });
  [0.74, 0.6].forEach(y => part(g, sph(0.035, 10, 8), '#fff8e8', { pos: [0, y, 0.24 + (0.74 - y) * 0.22], noLine: true, shadow: false }));
  // 手（從肩膀轉動）
  g.arms = [-1, 1].map(k => {
    const sh = new THREE.Group(); sh.position.set(0.3 * k, 0.82, 0); sh.rotation.z = 0.28 * k; g.add(sh);
    part(sh, new THREE.CapsuleGeometry(0.095, 0.2, 6, 12), p.coat, { pos: [0, -0.16, 0] });
    part(sh, sph(0.085, 14, 10), skin, { pos: [0, -0.34, 0] });
    return sh;
  });
  // 頭
  const head = new THREE.Group(); head.position.set(0, 1.36, 0); g.add(head); g.head = head;
  part(head, sph(0.5, 32, 24), skin, { scale: [1, 0.97, 0.94] });
  if (!p.hideEars) [-1, 1].forEach(k => {
    part(head, sph(0.17), skin, { pos: [0.5 * k, -0.02, 0], scale: [0.75, 1, 0.55] });
    part(head, sph(0.09, 12, 8), '#f4a3a0', { pos: [0.52 * k, -0.02, 0.07], scale: [0.6, 1, 0.4], noLine: true, shadow: false });
  });
  // 頭髮
  if (p.hairStyle === 'bob') {
    part(head, new THREE.SphereGeometry(0.56, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.6), p.hair, { rot: [-0.75, 0, 0], scale: [1.02, 1, 0.98] });
    [-1, 1].forEach(k => part(head, sph(0.2), p.hair, { pos: [0.4 * k, -0.22, 0.1], scale: [0.6, 1.2, 0.9] }));
  } else {
    part(head, new THREE.SphereGeometry(0.535, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), p.hair, { rot: [-0.42, 0, 0], scale: [1.02, 1, 0.98] });
    // 瀏海：一片一片貼在額頭上的髮片（順著頭的弧度）
    [-0.78, -0.4, 0, 0.4, 0.78].forEach((ax, i) => {
      const e = 0.7 - Math.abs(ax) * 0.12, d = new THREE.Vector3(Math.sin(ax) * Math.cos(e), Math.sin(e), Math.cos(ax) * Math.cos(e));
      const m = part(head, sph(0.15, 16, 12), p.hair, { pos: [d.x * 0.47, d.y * 0.47 - 0.02, d.z * 0.45], scale: [1.05, i % 2 ? 0.85 : 1.05, 0.42], line: 0.02 });
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
    });
  }
  // 臉
  const z = 0.455;
  [-1, 1].forEach(k => {
    part(head, sph(0.042, 10, 8), INK, { pos: [0.17 * k, 0.02, z], scale: [1, 1.2, 0.5], noLine: true, shadow: false, mat: new THREE.MeshBasicMaterial({ color: INK }) });
    part(head, new THREE.CircleGeometry(0.1, 20), '#f47878', { pos: [0.29 * k, -0.14, 0.375], rot: [0.1, 0.62 * k, 0], scale: [1.1, 0.72, 1], noLine: true, shadow: false, mat: new THREE.MeshBasicMaterial({ color: '#f58d86', transparent: true, opacity: 0.6 }) });
    if (p.glasses) part(head, new THREE.TorusGeometry(0.125, 0.017, 8, 28), INK, { pos: [0.17 * k, 0.02, z + 0.02], rot: [0, 0.18 * k, 0], noLine: true, shadow: false, mat: new THREE.MeshBasicMaterial({ color: INK }) });
  });
  if (p.glasses) part(head, new THREE.CylinderGeometry(0.014, 0.014, 0.1, 6), INK, { pos: [0, 0.02, z + 0.035], rot: [0, 0, Math.PI / 2], noLine: true, shadow: false, mat: new THREE.MeshBasicMaterial({ color: INK }) });
  part(head, sph(0.075, 14, 10), '#f28b82', { pos: [0, -0.1, 0.47], line: 0.014 });
  part(head, new THREE.TorusGeometry(0.06, 0.014, 6, 16, Math.PI), INK, { pos: [0, -0.2, 0.44], rot: [0.2, 0, Math.PI], noLine: true, shadow: false, mat: new THREE.MeshBasicMaterial({ color: INK }) });
  // 天使翅膀 + 光環
  if (p.wings) {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(0.15, 0.5, 0.75, 0.62, 0.92, 0.3);
    sh.quadraticCurveTo(0.8, 0.16, 0.86, 0.02); sh.quadraticCurveTo(0.68, -0.06, 0.7, -0.22); sh.quadraticCurveTo(0.46, -0.24, 0.42, -0.4); sh.quadraticCurveTo(0.14, -0.3, 0, 0);
    const wg = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 16 });
    g.wings = [-1, 1].map(k => { const piv = new THREE.Group(); piv.position.set(0.08 * k, 0.8, -0.3); piv.scale.x = k; g.add(piv); part(piv, wg, PAL.wing, { rough: 0.9 }); return piv; });
    part(g, new THREE.TorusGeometry(0.2, 0.035, 10, 28), PAL.gold, { pos: [0, 2.08, 0], rot: [Math.PI / 2 - 0.15, 0, 0], line: 0.018 });
  }
  g.pose = (t) => { // t: 走路相位
    const s = Math.sin(t) * 0.6; g.legs[0].rotation.x = s; g.legs[1].rotation.x = -s; g.arms[0].rotation.x = -s * 0.8; g.arms[1].rotation.x = s * 0.8;
    g.position.y = Math.abs(Math.sin(t)) * 0.05; if (g.wings) g.wings.forEach((w, i) => (w.rotation.y = (i ? -1 : 1) * (0.25 + 0.35 * Math.sin(t * 0.8))));
  };
  g.pose(0); return g;
}
// 寵物：圍巾小狗
function makePet() {
  const g = new THREE.Group();
  part(g, sph(0.3), PAL.pet, { pos: [0, 0.36, -0.05], scale: [0.85, 0.8, 1.15] });
  part(g, sph(0.27), PAL.pet, { pos: [0, 0.66, 0.26] });
  [-1, 1].forEach(k => {
    part(g, sph(0.11), '#c9966a', { pos: [0.22 * k, 0.78, 0.2], scale: [0.6, 1.3, 0.8], rot: [0, 0, -0.5 * k] });
    part(g, sph(0.032, 8, 6), INK, { pos: [0.1 * k, 0.7, 0.5], noLine: true, shadow: false, mat: new THREE.MeshBasicMaterial({ color: INK }) });
  });
  part(g, sph(0.1), PAL.pet, { pos: [0, 0.6, 0.48], scale: [1.2, 0.8, 1] });
  part(g, sph(0.04, 8, 6), INK, { pos: [0, 0.63, 0.575], noLine: true, shadow: false, mat: new THREE.MeshBasicMaterial({ color: INK }) });
  part(g, new THREE.TorusGeometry(0.2, 0.06, 8, 20), PAL.scarf, { pos: [0, 0.5, 0.16], rot: [Math.PI / 2 - 0.5, 0, 0], line: 0.018 });
  g.legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([a, b]) => part(g, sph(0.09), PAL.pet, { pos: [0.15 * a, 0.1, 0.18 * b - 0.05], scale: [1, 1.3, 1] }));
  g.tail = part(g, sph(0.08), PAL.pet, { pos: [0, 0.5, -0.4], scale: [0.8, 1.6, 0.8], rot: [-0.6, 0, 0] });
  g.pose = (t) => { g.legs.forEach((l, i) => (l.position.y = 0.1 + Math.max(0, Math.sin(t * 1.6 + (i % 3 ? 0 : Math.PI))) * 0.07)); g.tail.rotation.z = Math.sin(t * 3) * 0.5; };
  return g;
}

// ---- 場景小物 ----
function pine(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
  part(g, new THREE.CylinderGeometry(0.13, 0.17, 0.7, 10), PAL.trunk, { pos: [0, 0.35, 0] });
  [[0.95, 1.3, 1.1], [0.75, 1.15, 1.85], [0.52, 1.0, 2.55]].forEach(([r, h, y], i) => part(g, new THREE.ConeGeometry(r, h, 14), i % 2 ? PAL.pine2 : PAL.pine, { pos: [0, y, 0] }));
}
function roundTree(x, z, s = 1, col = PAL.leaf) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
  part(g, new THREE.CylinderGeometry(0.15, 0.22, 1.0, 10), PAL.trunk, { pos: [0, 0.5, 0] });
  [[0, 1.75, 0, 0.85], [-0.55, 1.45, 0.2, 0.6], [0.55, 1.5, -0.1, 0.62], [0.1, 1.4, 0.55, 0.58], [0, 2.3, -0.1, 0.55]].forEach(([a, b, c, r]) => part(g, sph(r, 18, 12), col, { pos: [a, b, c] }));
}
function rock(x, z, s = 1) { part(scene, new THREE.DodecahedronGeometry(0.45, 1), PAL.rock, { pos: [x, 0.28 * s, z], scale: [s * 1.2, s * 0.8, s], rot: [0.3, x, 0.2] }); }
function mushroom(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
  part(g, new THREE.CylinderGeometry(0.09, 0.12, 0.34, 10), '#fbf3e2', { pos: [0, 0.17, 0] });
  part(g, new THREE.SphereGeometry(0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), PAL.cap, { pos: [0, 0.3, 0] });
  [[0.12, 0.52, 0.12], [-0.14, 0.5, 0.05], [0, 0.56, -0.1], [0.02, 0.44, 0.24]].forEach(([a, b, c]) => part(g, sph(0.05, 8, 6), '#fff', { pos: [a, b, c], noLine: true, shadow: false }));
}
function flower(x, z) {
  part(scene, sph(0.07, 8, 6), '#fffdf2', { pos: [x, 0.16, z], noLine: true });
  part(scene, sph(0.035, 6, 6), PAL.gold, { pos: [x, 0.2, z + 0.03], noLine: true, shadow: false });
  part(scene, new THREE.CylinderGeometry(0.015, 0.015, 0.16, 5), '#6f9a52', { pos: [x, 0.08, z], noLine: true, shadow: false });
}
function cabin(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -0.25; scene.add(g);
  part(g, new THREE.BoxGeometry(3, 1.7, 2.3), PAL.wall, { pos: [0, 0.85, 0], line: 0.035 });
  const roof = new THREE.Shape(); roof.moveTo(-1.5, 0); roof.lineTo(1.5, 0); roof.lineTo(0, 1.25); roof.lineTo(-1.5, 0);
  const rg = new THREE.ExtrudeGeometry(roof, { depth: 3.5, bevelEnabled: false }); rg.translate(0, 0, -1.75);
  part(g, rg, PAL.roof, { pos: [0, 1.7, 0], rot: [0, Math.PI / 2, 0], scale: [0.92, 1, 1], line: 0.035 });
  part(g, new THREE.BoxGeometry(0.62, 1.1, 0.08), '#6b4026', { pos: [0.5, 0.55, 1.16], line: 0.02 });
  part(g, new THREE.BoxGeometry(0.75, 0.55, 0.08), '#39435c', { pos: [-0.65, 1.0, 1.16], line: 0.02 });
}


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
// ===== 站起來走路：機器人和人都裝上關節；人用念力（淡紫色的光）操控機器人和小精靈 =====
const WK = Q.walk ? (() => {
  const T = {}, L = 0.045, bot = A.bot, TY = 7.25, PSI = '#d9c2f0', PSI2 = '#fbf2ff';
  A.torso.position.set(0, TY, 0); A.torso.rotation.x = 0.05; T.TY = TY;
  const glow = (geo, col, parent, o = {}) => { const m = new THREE.Mesh(geo, basic(col, { transparent: true, depthWrite: false, opacity: 0.9, ...o })); m.renderOrder = 6; parent.add(m); return m; };
  T.rings = [];
  const bracelet = (parent, pos, r) => { const m = glow(new THREE.TorusGeometry(r, 0.07, 8, 36), PSI, parent); m.position.set(...pos); m.rotation.x = Math.PI / 2; T.rings.push(m); const n = glow(new THREE.TorusGeometry(r + 0.16, 0.035, 8, 36), PSI2, parent, { opacity: 0.7 }); n.position.set(...pos); n.rotation.x = Math.PI / 2; T.rings.push(n); };
  // 骨盆
  part(bot, rbox(4.5, 1.5, 2.0, 0.3), K.brown, { pos: [0, TY - 2.05, -0.2], line: L });
  part(bot, rbox(1.5, 1.0, 2.1, 0.2), K.orangeD, { pos: [0, TY - 2.15, -0.15], line: L });
  const arm = (k) => { const S = new THREE.Group(); S.position.set(3.6 * k, 0.95, 0.2); A.torso.add(S);
    seg(S, [0, 0, 0], [0.15 * k, -2.4, 0], 0.78, K.peach, { line: L });
    const E = new THREE.Group(); E.position.set(0.15 * k, -2.4, 0); S.add(E); part(E, sph(0.9), K.brown, { line: L });
    seg(E, [0, 0, 0], [0, -2.0, 0], 0.64, K.pipe, { flat: true, r2: 0.6, line: L });
    const h = makeHand(0.8, { side: -k }); h.position.set(0, -2.9, 0); orient(h, [0, -1, 0], [-k, 0, 0]); h.scale.setScalar(1.5); E.add(h);
    bracelet(E, [0, -1.75, 0], 0.86); return { S, E, h, k }; };
  const leg = (k) => { const Hp = new THREE.Group(); Hp.position.set(1.75 * k, TY - 2.65, -0.1); bot.add(Hp);
    seg(Hp, [0, 0, 0], [0, -2.0, 0], 0.95, K.orange, { line: L });
    const Kn = new THREE.Group(); Kn.position.set(0, -2.0, 0); Hp.add(Kn); part(Kn, sph(1.02), K.brown, { line: L });
    seg(Kn, [0, 0, 0], [0, -1.6, 0], 0.7, K.pipe, { flat: true, r2: 0.66, line: L });
    const F = new THREE.Group(); F.position.set(0, -1.7, 0); Kn.add(F);
    part(F, rbox(1.7, 1.05, 2.2, 0.32), K.glove, { pos: [0, -0.35, 0.45], line: L }); part(F, rbox(1.76, 0.26, 2.26, 0.1), K.cuff, { pos: [0, -0.77, 0.45], line: 0.03 });
    bracelet(Kn, [0, -1.0, 0], 0.92); return { Hp, Kn, F }; };
  T.arms = [arm(-1), arm(1)]; T.legs = [leg(-1), leg(1)];
  // 人：站姿，短短的腿和手
  const g = A.boy, BL = 0.024; T.by = 0.08; T.bz = 5.4; g.position.set(0, T.by, T.bz);
  const bleg = (k) => { const H = new THREE.Group(); H.position.set(0.17 * k, 0.38, 0.02); g.add(H);
    seg(H, [0, 0, 0], [0, -0.1, 0], 0.16, K.shorts, { line: BL }); seg(H, [0, -0.14, 0], [0, -0.2, 0], 0.115, K.skin, { line: BL, extra: NOMAP }); seg(H, [0, -0.2, 0], [0, -0.25, 0], 0.13, K.sock, { flat: true, line: BL });
    part(H, sph(0.2, 18, 12), K.shoe, { pos: [0, -0.3, 0.07], scale: [0.95, 0.72, 1.4], line: BL }); return H; };
  const barm = (k) => { const S = new THREE.Group(); S.position.set(0.39 * k, 0.84, 0.03); g.add(S);
    part(S, new THREE.CapsuleGeometry(0.13, 0.08, 6, 14), '#fff', withMap(stripeTex, { pos: [0, -0.02, 0], rot: [0, 0, 0.25 * k], line: BL }));
    seg(S, [0.03 * k, -0.08, 0], [0.06 * k, -0.36, 0], 0.1, K.skin, { line: BL, extra: NOMAP }); part(S, sph(0.115, 14, 10), K.skin, { extra: NOMAP, pos: [0.07 * k, -0.42, 0], line: BL }); return S; };
  T.bl = [bleg(-1), bleg(1)]; T.ba = [barm(-1), barm(1)];
  // 念力：舉起來的那隻手上的光圈、流向機器人心臟的光點
  T.hand = new THREE.Object3D(); T.hand.position.set(0.07, -0.46, 0); T.ba[1].add(T.hand);
  T.halo = [0.22, 0.34, 0.46].map((r, i) => glow(new THREE.TorusGeometry(r, 0.022, 6, 30), i === 1 ? PSI2 : PSI, scene));
  T.core = glow(sph(0.15, 12, 10), PSI2, scene, { opacity: 0.8 });
  // 海浪狀的念力：幾條會起伏的光帶
  const ribbon = (col, op) => { const N = 56, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 1) * 6), 3)); const idx = []; for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } geo.setIndex(idx);
    const m = glow(geo, col, scene, { opacity: op, side: THREE.DoubleSide }); m.frustumCulled = false; m.N = N; return m; };
  T.setRibbon = (m, fn) => { const a = m.geometry.attributes.position; for (let i = 0; i <= m.N; i++) { const [p, s, w] = fn(i / m.N); a.setXYZ(i * 2, p.x + s.x * w, p.y + s.y * w, p.z + s.z * w); a.setXYZ(i * 2 + 1, p.x - s.x * w, p.y - s.y * w, p.z - s.z * w); } a.needsUpdate = true; };
  T.waves = [ribbon(PSI, 0.5), ribbon('#c4a6ea', 0.6), ribbon(PSI2, 0.8), ribbon('#ffffff', 0.95)];
  T.trail = [ribbon(PSI, 0.6), ribbon(PSI2, 0.9)];
  T.disc = [0.55, 0.8].map((r, i) => { const m = glow(new THREE.TorusGeometry(r, 0.035, 6, 36), i ? PSI2 : PSI, scene); m.rotation.x = Math.PI / 2; m.visible = false; return m; });
  // 隊形「捧著」：兩隻手伸到肚子前面，掌心朝上併在一起
  if (Q.form === 'carry') T.arms.slice(0, 1).forEach(({ S, E, h, k }) => {
    const sp = S.position.clone(), w = new V3(0.35 * k, -2.3, 3.1), a = 2.4, b = 2.9, dv = w.clone().sub(sp), d = Math.min(dv.length(), a + b - 0.01), dir = dv.clone().normalize();
    const x = (a * a - b * b + d * d) / (2 * d), hgt = Math.sqrt(Math.max(0, a * a - x * x)), pole = new V3(k, -0.9, -0.7); pole.addScaledVector(dir, -pole.dot(dir)).normalize();
    const el = sp.clone().addScaledVector(dir, x).addScaledVector(pole, hgt);
    S.quaternion.setFromUnitVectors(new V3(0, -1, 0), el.clone().sub(sp).normalize()); A.torso.updateMatrixWorld(true);
    const wl = S.worldToLocal(A.torso.localToWorld(w.clone())).sub(E.position).normalize(); E.quaternion.setFromUnitVectors(new V3(0, -1, 0), wl); A.torso.updateMatrixWorld(true);
    const tmp = new THREE.Object3D(), fw = new V3(0, -1, 0).applyQuaternion(E.getWorldQuaternion(new THREE.Quaternion())); orient(tmp, [fw.x, fw.y + 0.25, fw.z], [0, 1, 0.1]);
    h.quaternion.copy(E.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(tmp.quaternion)); });
  T.eye = glow(new THREE.TorusGeometry(0.3, 0.04, 6, 30), PSI, A.rhead); T.eye.position.set(A.px, -0.2, 0.95);
  T.puffs = [...Array(12)].map(() => { const m = glow(sph(0.5, 12, 10), '#fffbe8', scene); m.visible = false; return m; });
  // 路邊的草叢、石頭：每 7 單位重複一次，地面往後捲的時候才接得起來
  T.props = []; const r = rnd(12);
  for (let i = 0; i < 7; i++) { const x = (i % 2 ? 14 + r() * 12 : -9 - r() * 14), z0 = r() * 7 * 3, k = 0.7 + r() * 1.0, rock = i % 3 === 0;
    for (let j = -3; j < 3; j++) { const gp = new THREE.Group(); scene.add(gp); gp.userData = { x, z0: z0 + j * 21 };
      if (rock) part(gp, sph(1, 14, 10), '#e9dfc0', { pos: [0, 0.3 * k, 0], scale: [k, 0.6 * k, 0.8 * k], line: 0.04 });
      else { part(gp, sph(1, 16, 12), i % 2 ? '#9fbf63' : '#b4cf6e', { pos: [0, 0.7 * k, 0], scale: [1.3 * k, k, 1.1 * k], line: 0.045 }); part(gp, sph(0.7, 14, 10), '#b4cf6e', { pos: [0.9 * k, 0.5 * k, 0.3], scale: k, line: 0.04 }); }
      T.props.push(gp); } }
  grassTex.repeat.set(400 / 7, 400 / 7);
  return T;
})() : null;

// ===== 擺在一起看：機器人職業 + 一般玩家角色 + 寵物 + 怪 + 小屋和樹 =====
const TW = Q.town ? (() => {
  const T = {}, S = 1.25;
  const put = (obj, x, z, ry = 0, s = S) => { const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = ry; h.scale.setScalar(s); h.add(obj); scene.add(h); return h; };
  // 玩家一：眼鏡、天使翅膀和光環
  T.c1 = makeChar({ coat: PAL.coat, hair: PAL.hair, glasses: 1, wings: 1 }); T.h1 = put(T.c1, -6, 6);
  // 玩家二：鮑伯頭、藍雨衣
  T.c2 = makeChar({ coat: PAL.coat2, hair: PAL.hair2, hairStyle: 'bob', hideEars: 1, skin: PAL.skin2 }); T.h2 = put(T.c2, -2.4, 9.8, -0.9);
  // 玩家三：綠雨衣、草帽
  T.c3 = makeChar({ coat: '#8fae5a', hair: '#7a5236', skin: PAL.skin }); T.h3 = put(T.c3, -4.9, 10.6, 1.6);
  part(T.c3.head, new THREE.CylinderGeometry(0.78, 0.8, 0.05, 28), '#f0d58a', { pos: [0, 0.3, 0], rot: [-0.12, 0, 0], line: 0.02 });
  part(T.c3.head, new THREE.SphereGeometry(0.44, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), '#f0d58a', { pos: [0, 0.3, 0], rot: [-0.12, 0, 0], scale: [1, 0.8, 1], line: 0.02 });
  part(T.c3.head, new THREE.CylinderGeometry(0.45, 0.45, 0.1, 24), PAL.scarf, { pos: [0, 0.36, 0], rot: [-0.12, 0, 0], noLine: true });
  T.pet = makePet(); T.hp = put(T.pet, -3.4, 12.0, 0.9);
  // 怪：兩隻果凍、一隻香菇怪
  const slime = (x, z, col, s) => { const g = new THREE.Group();
    const body = part(g, sph(1, 28, 20), col, { pos: [0, 0.8, 0], scale: [1.2, 0.85, 1.2], line: 0.05, extra: NOMAP });
    part(g, sph(0.35, 12, 10), '#fff', { pos: [-0.35, 1.25, 0.55], noLine: true, shadow: false, mat: basic('#fffdf0', { transparent: true, opacity: 0.55 }) });
    [-0.34, 0.34].forEach(k => part(g, sph(0.13, 10, 8), DARK, { pos: [k, 0.85, 1.12], scale: [1, 1.3, 0.6], noLine: true, shadow: false, mat: basic(DARK) }));
    [-0.62, 0.62].forEach(k => part(g, sph(0.16, 10, 8), '#f0a9a6', { pos: [k, 0.62, 1.02], scale: [1, 0.6, 0.4], noLine: true, shadow: false, mat: basic('#ee9a94') }));
    part(g, new THREE.ConeGeometry(0.22, 0.5, 10), '#8fae5a', { pos: [0, 1.75, 0], rot: [0, 0, 0.3], line: 0.03 });
    return { g, h: put(g, x, z, 0.5, s), ph: x }; };
  T.mobs = [slime(6.5, 8.5, '#8fb7d8', 0.8), slime(9.2, 6.2, '#f2b0a0', 0.65)];
  { const g = new THREE.Group(); // 香菇怪
    part(g, new THREE.CylinderGeometry(0.42, 0.55, 0.9, 16), '#fbf3e2', { pos: [0, 0.45, 0], line: 0.04 });
    part(g, new THREE.SphereGeometry(1.0, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), PAL.cap, { pos: [0, 0.75, 0], line: 0.05 });
    [[0.4, 1.5, 0.4], [-0.45, 1.45, 0.2], [0, 1.68, -0.3], [0.1, 1.25, 0.8], [-0.6, 1.1, 0.6]].forEach(a => part(g, sph(0.16, 10, 8), '#fffdf2', { pos: a, scale: [1, 0.6, 1], noLine: true, shadow: false }));
    [-0.17, 0.17].forEach(k => part(g, sph(0.07, 10, 8), DARK, { pos: [k, 0.52, 0.46], scale: [1, 1.3, 0.6], noLine: true, shadow: false, mat: basic(DARK) }));
    [-1, 1].forEach(k => part(g, sph(0.2, 12, 10), '#fbf3e2', { pos: [0.3 * k, 0.1, 0.1], scale: [1, 0.6, 1.3], line: 0.03 }));
    T.mobs.push({ g, h: put(g, 7.6, 11.2, 0.6, 1.0), ph: 2 }); }
  // 小屋、樹、石頭、花：放大到跟機器人比起來合理
  const big = (fn, s) => { const before = scene.children.length; fn(); for (let i = before; i < scene.children.length; i++) { const o = scene.children[i]; o.position.multiplyScalar(s); o.scale.multiplyScalar(s); } };
  big(() => { cabin(-5.2, -2.6); pine(-2.4, -4.2, 1.2); pine(-8.2, -3.4, 1.0); pine(3.6, -4.6, 1.3); pine(5.6, -3.2, 0.9); roundTree(-7.6, 0.6, 1.0); roundTree(5.6, -1.4, 1.1, PAL.leaf2); roundTree(1.2, -5.2, 1.0); rock(-6.2, 2.2, 1.2); rock(5.2, 1.6, 0.9); mushroom(-2.6, 1.4, 1); mushroom(-2.2, 1.7, 0.7); }, 2.3);
  big(() => { [[-3.2, 5.2], [-4.4, 6.3], [-1.6, 6.4], [2.2, 6.1], [3.6, 4.6], [-5.6, 4.2], [0.8, 7.2], [4.8, 6.6], [-2.4, 7.4]].forEach(([x, z]) => flower(x, z)); }, 1.6);
  // 小路
  const path = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 40), STYLE === 'clay' ? new THREE.MeshStandardMaterial({ color: PAL.path, roughness: 1 }) : new THREE.MeshToonMaterial({ color: PAL.path, gradientMap: RAMP, map: GRAIN })); path.rotation.set(-Math.PI / 2, 0, 0.5); path.position.set(-7.5, 0.02, 9); path.receiveShadow = true; scene.add(path);
  WK.props.forEach(p => { p.visible = false; });
  return T;
})() : null;

// ===== 標準人物（Blender 做的同一個底模，換髮型、上衣、臉、眼鏡、顏色）＋冰龍之翼 =====
// 模型檔由 newworld.html 先下載好放在 window.NW_ASSETS；每個角色都複製一份骨架和材質，各自換裝。
const STD = (() => {
  const AS = window.NW_ASSETS, LIB = window.NW_LIB;
  if (!AS || !AS.char || !LIB) return null;
  const LC = new THREE.Color('#' + (Q.lc || 'c2a48a')), LW = +(Q.lw || 1), HEIGHT = 2.15;
  const FLAT = /face_line|glasses|blush|nose/, NOLINE = /face_line|blush|nose|glasses|ear_inner|sole|stubble|stripe|string|button/;
  const PARTS = { hair: ['short', 'bowl', 'bob', 'buns', 'buzz'], top: ['tee', 'dress', 'hoodie'], face: ['smile', 'dot'] };
  const PART_SET = new Set(['Body', 'Shoes', 'Bottom_shorts', 'Top_tee', 'Top_dress', 'Top_hoodie', 'Hair_bowl', 'Hair_bob', 'Hair_buns', 'Hair_short', 'Hair_buzz', 'Glasses', 'Face_smile', 'Face_dot']);
  const NAMES = { short: '短髮', bowl: '西瓜皮', bob: '妹妹頭', buns: '丸子頭', buzz: '平頭', tee: '條紋T', dress: '洋裝', hoodie: '帽T', smile: '笑眼', dot: '圓眼' };
  // 顏色選項（換裝面板用）：key 是 Blender 裡的材質名稱
  const SWATCH = {
    // 前面幾個是總部（2D）創角可以選的顏色，後面是新世界多的
    hair: ['#2b2a33', '#6b4a32', '#c9772f', '#9aa3b5', '#e6b85a', '#c9566b', '#8fb4d8'],
    skin: ['#fde6d4', '#f6cfae', '#e2a983', '#b77a55'],
    top: ['#ff7a2f', '#4f7cc2', '#aeb6c4', '#2f3b55', '#f2c14e', '#6baf7b', '#f6a3b4'],
  };
  // 總部的髮型對應到新世界有的髮型；還沒做的先用最接近的
  const HAIR_FROM_2D = { short: 'short', bob: 'bob', long: 'bob', airy: 'bob', hime: 'bob', bun: 'buns', buns: 'buns', buzz: 'buzz', bald: 'buzz' };
  const fromAccount = (b) => ({ hair: HAIR_FROM_2D[b.hair] || 'bowl', top: 'tee', face: 'smile', glasses: !!b.glasses, wings: false, hairCol: b.hairColor || null, skinCol: b.skin || null, topCol: b.outfit || null });
  // 鼻子、耳朵內側：比膚色紅一點、深一點
  const skinTint = (hex, k) => { const c = new THREE.Color(hex), h = {}; c.getHSL(h); return '#' + c.setHSL(Math.max(0, h.h - 0.025), Math.min(1, h.s + 0.08), h.l * k).getHexString(); };

  // 冰龍之翼：翼膜蠟筆筆觸＋亮點，骨頭淡顆粒（跟試做的冰翼一樣）
  const RAMP4 = (() => { const t = new THREE.DataTexture(new Uint8Array([120, 175, 225, 255]), 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
  const CRAYON = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'), r = rnd(21); x.fillStyle = '#cfcfcf'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const a = r() * 512, b = r() * 512, l = 8 + r() * 22, th = -0.9 + (r() - 0.5) * 0.5; x.strokeStyle = r() < 0.55 ? `rgba(20,30,90,${0.1 + r() * 0.16})` : `rgba(255,255,255,${0.14 + r() * 0.22})`; x.lineWidth = 1.5 + r() * 3.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(a + Math.cos(th) * l, b + Math.sin(th) * l); x.stroke(); }
    for (let k = 0; k < 12; k++) { const cx = r() * 512, cy = r() * 512, n = 4 + (r() * 4 | 0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (r() < 0.25) continue; x.fillStyle = `rgba(255,255,255,${0.75 + r() * 0.25})`; x.beginPath(); x.arc(cx + i * 15 + j * 5, cy + j * 15 - i * 5, 2.6 + r() * 1.8, 0, 7); x.fill(); } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.2, 2.2); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const BGRAIN = GRAIN.clone(); BGRAIN.repeat.set(6, 6); BGRAIN.needsUpdate = true;
  const outlines = [];
  // 外框：同一份骨架，往外推一點、只畫背面
  function addLine(o, w) {
    const om = new THREE.MeshBasicMaterial({ color: LC, side: THREE.BackSide });
    om.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * ' + (w * LW).toFixed(4) + ';'); };
    const ol = o.clone(); ol.material = om; ol.castShadow = false; ol.frustumCulled = false; ol.bind(o.skeleton, o.bindMatrix); o.parent.add(ol); o.userData.line = ol; outlines.push(ol); return ol;
  }
  const scale0 = (() => { const b = new THREE.Box3().setFromObject(AS.char.scene); return HEIGHT / Math.max(0.01, b.max.y - b.min.y); })();

  function makeWing(g) {   // 一邊的翅膀；回傳兩節骨頭和原本的轉向
    const w = LIB.SkeletonUtils.clone(AS.wing.scene), bones = {};
    w.traverse(o => { if (o.isBone) bones[o.name] = o; if (!o.isMesh) return;
      const src = o.material, vc = src.name === 'membrane';
      o.material = new THREE.MeshToonMaterial({ color: vc ? new THREE.Color(1.3, 1.3, 1.3) : src.color, vertexColors: vc, map: vc ? CRAYON : BGRAIN, gradientMap: RAMP4, side: THREE.DoubleSide });
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; addLine(o, 0.03); });
    const rest = {}; for (const n in bones) rest[n] = bones[n].quaternion.clone();
    return { w, bones, rest };
  }

  function make(look) {
    const g = LIB.SkeletonUtils.clone(AS.char.scene), meshes = [], bones = {};
    g.traverse(o => { if (o.isBone) bones[o.name] = o; if (o.isMesh) meshes.push(o); });
    meshes.forEach(o => {
      let p = o; while (p && !PART_SET.has(p.name) && p.parent) p = p.parent;   // 多材質的零件會拆成好幾個子網格，往上找零件名稱
      o.userData.part = p ? p.name : o.name;
      const src = o.material, nm = src.name;
      o.material = new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map || (FLAT.test(nm) ? null : GRAIN), gradientMap: RAMP });
      o.material.userData = { name: nm, base: src.color.clone(), hasMap: !!src.map };
      if (/face_line/.test(nm)) o.material.color.set(INK);
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
      if (!NOLINE.test(nm)) addLine(o, 0.02);
    });
    const H = new THREE.Group(), body = new THREE.Group(); body.add(g); g.scale.setScalar(scale0); H.add(body); scene.add(H);
    const mixer = new THREE.AnimationMixer(g), acts = {};
    AS.char.animations.forEach(a => { acts[a.name] = mixer.clipAction(a); acts[a.name].play(); });
    // 翅膀掛在脊椎骨上：先在角色自己的座標裡定好位置，再換算到骨頭底下
    g.updateMatrixWorld(true);
    const spine = bones.spine, wings = [-1, 1].map(k => {
      const piv = new THREE.Group(), W = makeWing(g), holder = new THREE.Group();
      holder.scale.set(k * 0.72 / scale0, 0.72 / scale0, 0.72 / scale0); holder.add(W.w); piv.add(holder);
      const want = new THREE.Matrix4().compose(new THREE.Vector3(0.1 * k, 0.98, -0.3), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      const inv = new THREE.Matrix4().copy(spine.matrixWorld).invert().multiply(g.matrixWorld).multiply(want);
      inv.decompose(piv.position, piv.quaternion, piv.scale); spine.add(piv); return { piv, k, ...W };
    });
    const c = { H, body, g, meshes, mixer, acts, wings, look: {}, ph: Math.random() * 6, mv: 0, flap: Math.random() };
    for (const n in W_DEFAULT) c.look[n] = W_DEFAULT[n];
    setLook(c, look); return c;
  }
  const W_DEFAULT = { hair: 'bowl', top: 'tee', face: 'smile', glasses: true, wings: false, hairCol: null, skinCol: null, topCol: null };

  function setLook(c, patch) {
    Object.assign(c.look, patch || {}); const L = c.look;
    const want = new Set(['Body', 'Shoes', 'Bottom_shorts', 'Hair_' + L.hair, 'Top_' + L.top, 'Face_' + L.face].concat(L.glasses ? ['Glasses'] : []));
    c.meshes.forEach(o => { const on = want.has(o.userData.part); o.visible = on; if (o.userData.line) o.userData.line.visible = on && SHOW.lines;
      const m = o.material, nm = m.userData.name; let col = null;
      if (nm === 'hair' && L.hairCol) col = L.hairCol;
      if (nm === 'skin' && L.skinCol) col = L.skinCol;
      if (nm === 'nose' && L.skinCol) col = skinTint(L.skinCol, 0.86);
      if (nm === 'ear_inner' && L.skinCol) col = skinTint(L.skinCol, 0.88);
      if (/^(tee|dress|hoodie)$/.test(nm) && L.topCol) col = L.topCol;
      // 條紋T 換顏色：白底藍條紋整件染上那個顏色，條紋還在
      if (col) m.color.set(col); else { m.color.copy(m.userData.base); if (/face_line/.test(nm)) m.color.set(INK); }
    });
    c.wings.forEach(w => { w.piv.visible = !!L.wings; w.w.traverse(o => { if (o.isMesh && o.userData.line) o.userData.line.visible = !!L.wings && SHOW.lines; }); });
  }
  const SHOW = { lines: true };

  // 每一格的動作：mv 0 = 站著、1 = 走路；翅膀上抬慢、下拍快
  const Y = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), pw = new THREE.Quaternion(), pq = new THREE.Quaternion();
  function swing(bone, restQ, piv, a) { bone.quaternion.copy(restQ); bone.parent.updateWorldMatrix(true, false); bone.parent.getWorldQuaternion(pw); piv.getWorldQuaternion(pq);
    q.setFromAxisAngle(Y.clone().applyQuaternion(pq).applyQuaternion(pw.invert()), a); bone.quaternion.premultiply(q); }
  const ease = (u) => u < 0.62 ? 0.5 - 0.5 * Math.cos(u / 0.62 * Math.PI) : 0.5 + 0.5 * Math.cos((u - 0.62) / 0.38 * Math.PI);
  function tick(c, dt, mv, speed = 1) {
    c.mv += (mv - c.mv) * Math.min(1, dt * 8);
    c.acts.walk.setEffectiveWeight(c.mv); c.acts.idle.setEffectiveWeight(1 - c.mv);
    c.acts.walk.timeScale = speed; c.mixer.update(dt);
    if (!c.look.wings) return;
    c.flap = (c.flap + dt / (c.mv > 0.5 ? 1.1 : 1.8)) % 1;
    c.H.updateMatrixWorld(true);
    c.wings.forEach(w => { const u = c.flap, u2 = (u - 0.08 + 1) % 1, f = 0.7 + 0.3 * c.mv;
      swing(w.bones.wing_root, w.rest.wing_root, w.piv, 0.15 + 0.55 * ease(u) * f); swing(w.bones.wing_hand, w.rest.wing_hand, w.piv, (0.1 + 0.6 * ease(u2)) * f); });
  }
  function lines(on) { SHOW.lines = on; ALL.forEach(c => setLook(c)); }
  const ALL = [];
  return { make: (look) => { const c = make(look); ALL.push(c); return c; }, setLook, tick, lines, PARTS, NAMES, SWATCH, fromAccount, all: ALL };
})();
// 一般玩家換成標準人物；自己的角色也是標準人物，背上可以開冰龍之翼
if (STD && TW) {
  [TW.h1, TW.h2, TW.h3].forEach(h => { h.visible = false; });
  const at = (c, x, z, ry) => { c.H.position.set(x, 0, z); c.H.rotation.y = ry; return c; };
  TW.s1 = at(STD.make({ hair: 'bowl', top: 'tee', face: 'smile', glasses: true }), -7.4, 6.2, 0);
  TW.s2 = at(STD.make({ hair: 'bob', top: 'dress', face: 'dot', glasses: false, hairCol: '#7a4a2e' }), -2.4, 9.8, -0.9);
  TW.s3 = at(STD.make({ hair: 'buns', top: 'hoodie', face: 'dot', glasses: true, skinCol: '#e9b98f', topCol: '#8fc2a0' }), -4.9, 10.6, 1.6);
  TW.me = at(STD.make({ hair: 'bob', top: 'dress', face: 'smile', glasses: true, wings: true, hairCol: '#e6b85a', topCol: '#b9a6e0' }), 2.5, 14, 0);
}



// ---- 燈光：兩版都用暖光 ----
scene.add(new THREE.HemisphereLight(0xfff6e0, 0xd9d39a, STYLE === 'clay' ? 1.35 : 1.9));
const sun = new THREE.DirectionalLight(0xffe9c4, STYLE === 'clay' ? 2.7 : 1.8); sun.position.set(-6, 11, 9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 12, bottom: -5, near: 1, far: 45 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; sun.shadow.radius = STYLE === 'clay' ? 5 : 1.5;
scene.add(sun);


// ===== 即時操作：搖桿走動、鏡頭跟隨、切隊形、手勢、畫質 =====
const NW = (() => {
  const PI2 = Math.PI * 2, cl = (v) => Math.max(0, Math.min(1, v)), sm = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
  document.body.appendChild(renderer.domElement); renderer.domElement.id = 'nw-canvas';
  // 機器人、人、小精靈和跟著他們的特效收進同一個群組，整組在世界裡移動
  const R = new THREE.Group(); scene.add(R);
  [A.bot, A.boy, A.plush, ...WK.disc, ...WK.puffs, ...WK.trail].forEach(o => R.add(o));
  // 單手捧著的手臂姿勢：先算好，之後用權重混進走路的擺手
  const arm0 = WK.arms[0], carry = (() => { const { S, E, h, k } = arm0, keep = [S.quaternion.clone(), E.quaternion.clone(), h.quaternion.clone()];
    S.rotation.set(0, 0, 0); E.rotation.set(0, 0, 0); A.torso.rotation.set(0.06, 0, 0); scene.updateMatrixWorld(true);
    const sp = S.position.clone(), w = new V3(0.35 * k, -2.3, 3.1), a = 2.4, b = 2.9, dv = w.clone().sub(sp), d = Math.min(dv.length(), a + b - 0.01), dir = dv.clone().normalize();
    const x = (a * a - b * b + d * d) / (2 * d), hgt = Math.sqrt(Math.max(0, a * a - x * x)), pole = new V3(k, -0.9, -0.7); pole.addScaledVector(dir, -pole.dot(dir)).normalize();
    const el = sp.clone().addScaledVector(dir, x).addScaledVector(pole, hgt);
    S.quaternion.setFromUnitVectors(new V3(0, -1, 0), el.clone().sub(sp).normalize()); A.torso.updateMatrixWorld(true);
    E.quaternion.setFromUnitVectors(new V3(0, -1, 0), S.worldToLocal(A.torso.localToWorld(w.clone())).sub(E.position).normalize()); A.torso.updateMatrixWorld(true);
    const tq = A.torso.getWorldQuaternion(new THREE.Quaternion()).invert(), eq = tq.clone().multiply(E.getWorldQuaternion(new THREE.Quaternion())), tmp = new THREE.Object3D(), fw = new V3(0, -1, 0).applyQuaternion(eq);
    orient(tmp, [fw.x, fw.y + 0.25, fw.z], [0, 1, 0.1]);
    const out = { S: S.quaternion.clone(), E: E.quaternion.clone(), h: eq.clone().invert().multiply(tmp.quaternion), h0: keep[2] };
    S.quaternion.copy(keep[0]); E.quaternion.copy(keep[1]); h.quaternion.copy(keep[2]); return out; })();
  const outlines = []; scene.traverse(o => { if (o.isMesh && o.material.isShaderMaterial) outlines.push(o); });
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 110 }); sun.shadow.camera.updateProjectionMatrix(); scene.add(sun.target);

  // ME：自己操控的標準人物（有標準人物時預設操控它，按「角色」可以換回機器人騎士）
  const ME = STD && TW && TW.me ? { c: TW.me, x: TW.me.H.position.x + (Math.random() - 0.5) * 3, z: TW.me.H.position.z + (Math.random() - 0.5) * 3, face: 0 } : null;   // 進場位置錯開一點，多人同時進來才不會疊在一起
  const S = { ctrl: ME ? 'me' : 'robot', x: 0, z: 0, face: 0, mv: 0, ph: 0, form: 'carry', cw: 1, gt: -1, time: 0, zoom: 0, quality: 1, lines: true, jx: 0, jy: 0, keys: {}, camT: new V3(0, 3.6, 3.2) };
  const FORMS = ['carry', 'float', 'front'], FORM_NAME = { carry: '單手捧著', float: '漂浮操控', front: '走在前面' };
  const CAM = [{ dist: 47, hgt: 17 }, { dist: 30, hgt: 10.5 }], CAM_ME = CAM, ANG = 0.62;
  // 多人：別的玩家的標準人物，還有頭上的名字紙條和聊天泡泡（用網頁元素疊在畫面上，字才清楚）
  const OTH = new Map(), LAB = document.createElement('div'); LAB.id = 'nw-labels'; document.body.appendChild(LAB);
  const mkTag = () => { const t = document.createElement('div'), b = document.createElement('div'), n = document.createElement('div');
    t.className = 'nw-tag'; b.className = 'nw-bubble'; n.className = 'nw-name'; b.hidden = n.hidden = true; t.append(b, n); LAB.appendChild(t); return { t, b, n, until: 0 }; };
  const MYTAG = ME ? mkTag() : null, PV = new V3();
  const placeTag = (tag, x, z) => { PV.set(x, 2.5, z).project(camera); const on = PV.z < 1 && Math.abs(PV.x) < 1.15 && Math.abs(PV.y) < 1.15;
    tag.t.style.display = on ? '' : 'none'; if (on) tag.t.style.transform = 'translate(' + ((PV.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-PV.y * 0.5 + 0.5) * H).toFixed(1) + 'px) translate(-50%,-100%)';
    if (tag.until && S.time > tag.until) { tag.b.hidden = true; tag.until = 0; } };
  const NET = {
    me: () => (ME ? { x: +ME.x.toFixed(2), z: +ME.z.toFixed(2), f: +ME.face.toFixed(2), mv: S.meMv ? 1 : 0 } : null),
    name: (s) => { if (MYTAG) { MYTAG.n.textContent = s; MYTAG.n.hidden = !s; } },
    put: (id, d) => { if (!STD) return; let o = OTH.get(id);
      if (!o) { o = { c: STD.make(d.look || {}), x: d.x || 0, z: d.z || 0, f: d.f || 0, mv: 0, tag: mkTag() }; o.tx = o.x; o.tz = o.z; o.tf = o.f; OTH.set(id, o); }
      else if (d.look) STD.setLook(o.c, d.look);
      if (d.name != null) { o.tag.n.textContent = d.name; o.tag.n.hidden = !d.name; } },
    move: (id, x, z, f, mv) => { const o = OTH.get(id); if (o) { o.tx = x; o.tz = z; o.tf = f; o.mv = mv; } },
    drop: (id) => { const o = OTH.get(id); if (!o) return; scene.remove(o.c.H); o.tag.t.remove(); const i = STD.all.indexOf(o.c); if (i >= 0) STD.all.splice(i, 1); OTH.delete(id); },
    clear: () => { [...OTH.keys()].forEach(NET.drop); },
    say: (id, text) => { const tag = id == null ? MYTAG : (OTH.get(id) || {}).tag; if (!tag) return; tag.b.textContent = text; tag.b.hidden = false; tag.until = S.time + 6; },
    count: () => OTH.size,
  };
  // 點地面走路的目標小圈圈
  const GOAL = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.62, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false }));
  GOAL.add(new THREE.Mesh(new THREE.RingGeometry(0.62, 0.69, 32), new THREE.MeshBasicMaterial({ color: '#b98a5e', transparent: true, opacity: 0.9, depthWrite: false })), new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false })));
  GOAL.rotation.x = -Math.PI / 2; GOAL.visible = false; GOAL.renderOrder = 5; scene.add(GOAL);
  const RAY = new THREE.Raycaster(), NDC = new THREE.Vector2(), GROUND = new THREE.Plane(new V3(0, 1, 0), 0), HIT = new V3();
  const key = (tt, ks) => { for (let i = 0; i < ks.length - 1; i++) if (tt >= ks[i][0] && tt <= ks[i + 1][0]) return ks[i][1] + (ks[i + 1][1] - ks[i][1]) * sm((tt - ks[i][0]) / (ks[i + 1][0] - ks[i][0])); return 0; };
  const U = (tt) => tt < 0 ? 0 : key(tt, [[0, 0], [0.04, 0], [0.13, -1], [0.16, -1], [0.195, 1], [0.3, 1], [0.4, 0], [1, 0]]);   // 揮手：-1 舉高、+1 揮下去
  const Vv = (tt) => tt < 0 ? 0 : key(tt, [[0, 0], [0.46, 0], [0.54, 1], [0.68, 1], [0.8, 0], [1, 0]]);                            // 兩手高舉
  const bp0 = new V3(), tq = new THREE.Quaternion();

  function update(dt) {
    S.time += dt; const t = S.time / 6;
    // --- 移動：搖桿或鍵盤，方向以畫面為準 ---
    let jx = S.jx, jy = S.jy; const K = S.keys;
    if (K.ArrowLeft || K.a) jx -= 1; if (K.ArrowRight || K.d) jx += 1; if (K.ArrowUp || K.w) jy -= 1; if (K.ArrowDown || K.s) jy += 1;
    let jl = Math.hypot(jx, jy), wx = 0, wz = 0;
    if (jl > 0.15) { S.goal = null; const n = Math.min(1, jl) / jl; wx = (Math.cos(ANG) * jx + Math.sin(ANG) * jy) * n; wz = (-Math.sin(ANG) * jx + Math.cos(ANG) * jy) * n; }
    else if (S.goal) { // 點地面走路：朝目標走，到了就停；搖桿或鍵盤一動就取消
      const me = S.ctrl === 'me', dx = S.goal.x - (me ? ME.x : S.x), dz = S.goal.z - (me ? ME.z : S.z), d = Math.hypot(dx, dz), step = (me ? 4.2 : 6.5) * dt;
      if (d < 0.12) S.goal = null; else { const n = Math.min(1, d / step) / d; wx = dx * n; wz = dz * n; jl = 1; } }
    GOAL.visible = !!S.goal; if (S.goal) { GOAL.position.set(S.goal.x, 0.06, S.goal.z); const k = 1 + Math.sin(S.time * 6) * 0.12; GOAL.scale.set(k, k, k); }
    const moving = jl > 0.15 && S.ctrl === 'robot', meMoving = jl > 0.15 && S.ctrl === 'me'; S.meMv = meMoving;
    if (ME) { if (meMoving) { const vx = wx, vz = wz, sp = 4.2;
        ME.x = Math.max(-70, Math.min(70, ME.x + vx * sp * dt)); ME.z = Math.max(-70, Math.min(70, ME.z + vz * sp * dt));
        let df = Math.atan2(vx, vz) - ME.face; df = Math.atan2(Math.sin(df), Math.cos(df)); ME.face += df * Math.min(1, dt * 9); }
      ME.c.H.position.set(ME.x, 0, ME.z); ME.c.H.rotation.y = ME.face; STD.tick(ME.c, dt, meMoving ? Math.min(1, jl) : 0, 1.6); }
    if (moving) { const vx = wx, vz = wz, sp = 6.5;
      S.x = Math.max(-70, Math.min(70, S.x + vx * sp * dt)); S.z = Math.max(-70, Math.min(70, S.z + vz * sp * dt));
      let df = Math.atan2(vx, vz) - S.face; df = Math.atan2(Math.sin(df), Math.cos(df)); S.face += df * Math.min(1, dt * 7);
      S.ph += dt * sp * Math.hypot(vx, vz) / 7 * PI2; }
    S.mv += ((moving ? 1 : 0) - S.mv) * Math.min(1, dt * 7); S.cw += ((S.form === 'carry' ? 1 : 0) - S.cw) * Math.min(1, dt * 5);
    if (S.gt >= 0) { S.gt += dt / 6; if (S.gt >= 1) S.gt = -1; }
    R.position.set(S.x, 0, S.z); R.rotation.y = S.face;
    const mv = S.mv, ph = S.ph, bp = ph * 3, FORM = S.form, DL = 0.03, u = U(S.gt), v = Vv(S.gt), ru = U(S.gt - DL), rv = Vv(S.gt - DL);
    // --- 機器人：沉沉的大步 ---
    const Aw = 0.34 * mv;
    WK.legs.forEach((lg, i) => { const p = ph + i * Math.PI, hip = -Aw * Math.sin(p), knee = 0.75 * mv * Math.pow(Math.max(0, Math.cos(p)), 1.3) + 0.5 * rv * (1 - rv); lg.Hp.rotation.x = hip - knee * 0.35; lg.Kn.rotation.x = knee; lg.F.rotation.x = -(hip - knee * 0.35 + knee) * 0.75; });
    WK.arms.forEach((ar, i) => { const p = ph + (1 - i) * Math.PI, uu = i ? ru : 0;
      ar.S.rotation.set(-0.34 * mv * Math.sin(p) + (uu < 0 ? 2.8 * uu : -1.25 * uu) - 2.55 * rv * (i ? 1 : 1 - S.cw), 0, (i ? 1 : -1) * (0.1 + 0.3 * rv));
      ar.E.rotation.set(-0.35 - 0.2 * mv * Math.max(0, Math.sin(p)) + (uu < 0 ? 0.6 * uu : 0.2 * uu) - 0.95 * rv, 0, 0); });
    arm0.S.quaternion.slerp(carry.S, S.cw); arm0.E.quaternion.slerp(carry.E, S.cw); arm0.h.quaternion.copy(carry.h0).slerp(carry.h, S.cw);
    const drop = Math.abs(Math.sin(ph)) * mv; A.bot.position.y = -0.22 * drop * drop + 0.05 + (1 - mv) * 0.06 * Math.sin(t * PI2 * 3) + 0.25 * rv - 0.36 * Math.max(0, ru) * (1 - Math.max(0, ru));
    A.torso.rotation.set(0.06 + 0.02 * Math.cos(ph * 2) + (ru < 0 ? 0.12 * ru : 0.22 * ru) - 0.1 * rv, 0.07 * mv * Math.sin(ph) - 0.25 * Math.max(0, ru) + 0.12 * Math.min(0, ru), 0.035 * mv * Math.sin(ph)); A.torso.position.y = WK.TY;
    A.rhead.rotation.set(0.3 + 0.03 * Math.cos(ph * 2), -0.05 * Math.sin(ph), 0.03 * Math.sin(ph + 0.6));
    const beat = Math.exp(-((t * 6) % 1) * 7); A.heart.scale.setScalar(1 + 0.1 * beat + 0.35 * rv + 0.2 * Math.abs(ru)); A.glow.intensity = A.glow0 * (0.9 + 0.8 * beat);
    // 踩地的灰塵
    let shake = 0; const cyc = ph / PI2;
    WK.puffs.forEach((pf, j) => { const foot = j % 2, n = Math.floor(j / 2) % 2, k = (((cyc - (foot ? 0.3 : 0.8)) % 1) + 1) % 1 / 0.33; pf.visible = j < 4 && k < 1 && mv > 0.5; if (k < 0.25 && n === 0 && mv > 0.5) shake += (1 - k * 4) * Math.sin(k * 40);
      if (!pf.visible) return; pf.position.set((foot ? 1 : -1) * 1.75 + (n ? 1.2 : -1.2) * (0.4 + k), 0.3 + k * 0.5, 2.2 - k * 1.2 + n * 0.5); pf.scale.setScalar(0.3 + Math.sin(k * Math.PI) * 0.9); pf.material.opacity = 0.9 - k * 0.7; });
    // --- 人：三種隊形 ---
    const g = A.boy; let armL = [-2.35 + 0.1 * Math.sin(ph * 2) + (u < 0 ? 0.75 * u : 1.25 * u) - 0.55 * v, 0, 0.45 + 0.06 * Math.sin(ph) + 0.1 * v], armR, legs, rot;
    WK.disc.forEach(d => { d.visible = FORM === 'float'; });
    if (FORM === 'carry') { bp0.set(-0.4, 4.84 + A.bot.position.y, 3.25); rot = [-0.05, 0.06 * Math.sin(ph), 0.03 * Math.sin(ph)]; legs = (i) => -1.4 + 0.22 * Math.sin(ph * 2 + t * PI2 * 2 + i * Math.PI); armR = [-0.5 - 2.3 * v, 0, -0.3]; }
    else if (FORM === 'float') { bp0.set(0, 4.3 + 0.28 * Math.sin(t * PI2 * 2), WK.bz); rot = [0.14 + 0.04 * Math.sin(t * PI2 * 2 + 1) + 0.2 * Math.max(0, u), 0.25 * Math.max(0, u), 0.05 * Math.sin(t * PI2)];
      legs = (i) => 0.3 + 0.14 * Math.sin(t * PI2 * 2 + 1.2 + i * 0.9); armR = [-0.35 - 2.5 * v, 0, -0.85 + 0.5 * v + 0.08 * Math.sin(t * PI2 * 2)]; }
    else { bp0.set(0, WK.by + 0.05 * Math.abs(Math.sin(bp)) * mv, WK.bz); rot = [0.05, 0, 0.05 * Math.sin(bp) * mv]; legs = (i) => -0.75 * mv * Math.sin(bp + i * Math.PI); armR = [-0.6 * mv * Math.sin(bp + Math.PI) - 2.5 * v, 0, -0.15]; }
    g.position.lerp(bp0, Math.min(1, dt * 9)); g.rotation.set(...rot);
    WK.disc.forEach((d, i) => { d.position.set(g.position.x, g.position.y - 0.12 - i * 0.22, g.position.z); d.scale.setScalar(1 + 0.12 * Math.sin(t * PI2 * 4 + i * 2)); d.material.opacity = 0.75 - i * 0.3; });
    WK.bl.forEach((h, i) => { h.rotation.x = legs(i); }); WK.ba[0].rotation.set(...armR); WK.ba[1].rotation.set(...armL);
    A.bhead.rotation.set(0.02 - 0.15 * v, 0.06 * Math.sin(ph), -0.04 + 0.03 * Math.sin(t * PI2 * 2));
    // 小精靈繞著人
    const a = t * PI2 * 2 + 2.2, cy = g.position.y + 1.36 * 1.25 + 0.35;
    A.plush.scale.setScalar(0.62); A.plush.position.set(g.position.x + Math.sin(a) * 1.05, cy + 0.2 * Math.cos(a) + 0.06 * Math.sin(t * PI2 * 6), g.position.z + Math.cos(a) * 1.05); A.plush.rotation.set(0.15 * Math.sin(t * PI2 * 6), a + Math.PI / 2, 0);
    // --- 鏡頭：固定斜角，跟著角色 ---
    const cam = (S.ctrl === 'me' ? CAM_ME : CAM)[S.zoom], asp = W / H, far = asp < 1 ? Math.pow(1 / asp, 0.75) : 1;
    if (S.ctrl === 'me') S.camT.lerp(bp0.set(ME.x, 1.3, ME.z), Math.min(1, dt * 5));
    else S.camT.lerp(bp0.set(S.x - 0.8, 3.6 + shake * 0.07, S.z + 3.2), Math.min(1, dt * 5));
    camera.position.set(S.camT.x + Math.sin(ANG) * cam.dist * far, cam.hgt * far, S.camT.z + Math.cos(ANG) * cam.dist * far); camera.lookAt(S.camT);
    camera.updateMatrixWorld(); if (MYTAG) placeTag(MYTAG, ME.x, ME.z); OTH.forEach(o => placeTag(o.tag, o.x, o.z));
    { const fx = S.ctrl === 'me' ? ME.x : S.x, fz = S.ctrl === 'me' ? ME.z : S.z; sun.position.set(fx - 12, 22, fz + 18); sun.target.position.set(fx, 0, fz); }
    // --- 念力：海浪狀的光帶 ---
    scene.updateMatrixWorld(true);
    const hp = WK.hand.getWorldPosition(new V3()), hh = A.heart.getWorldPosition(new V3()).add(new V3(0, 0, 0.7).applyAxisAngle(new V3(0, 1, 0), S.face)), mid = new V3();
    WK.halo.forEach((h, i) => { h.position.copy(hp); h.rotation.set(t * PI2 * (i + 1) + i, t * PI2 * 2 * (i % 2 ? -1 : 1) + i * 2, 0); h.scale.setScalar(1 + 0.12 * Math.sin(t * PI2 * 6 + i)); });
    WK.core.position.copy(hp); WK.core.scale.setScalar(1 + 0.25 * Math.sin(t * PI2 * 6));
    const camP = camera.position, span = hh.clone().sub(hp), sl = span.length(), tan = span.clone().normalize();
    mid.copy(hp).lerp(hh, 0.5).add(new V3(0.9, 1.3, 0.7).multiplyScalar(sl / 7));
    const upv = new V3(0, 1, 0).addScaledVector(tan, -tan.y).normalize(), pw = 1 + 0.8 * Math.max(Math.abs(u), v), sv = new V3(), cv = new V3();
    WK.waves.forEach((m, L) => WK.setRibbon(m, (k) => { const a1 = (1 - k) * (1 - k), b1 = 2 * k * (1 - k), c1 = k * k, env = Math.sin(k * Math.PI), f = L * 1.3;
      const wv = 0.42 * Math.sin(PI2 * (1.5 * k - 3 * t) + f) + 0.2 * Math.sin(PI2 * (3.4 * k - 5 * t) + 2.1 * f) + 0.09 * Math.sin(PI2 * (7 * k - 9 * t) + 3 * f);
      const p = new V3(hp.x * a1 + mid.x * b1 + hh.x * c1, hp.y * a1 + mid.y * b1 + hh.y * c1, hp.z * a1 + mid.z * b1 + hh.z * c1).addScaledVector(upv, env * wv * pw * Math.min(1, sl / 4) + (L === 3 ? 0.1 * env : 0));
      sv.crossVectors(tan, cv.copy(camP).sub(p)).normalize(); const w = L === 3 ? 0.03 + 0.03 * env : (0.05 + [0.5, 0.34, 0.18][L] * env * (0.55 + 0.45 * Math.sin(PI2 * (2 * k - 4 * t) + f))) * pw;
      return [p, sv, w]; }));
    // 揮手時機器人手臂劃過的弧線（畫在跟著機器人的座標裡）
    { const gt = S.gt, sw = gt > 0.16 && gt < 0.26 && ru > -0.98, th = (x) => -(x < 0 ? 2.8 * x : -1.25 * x), fade = 1 - cl((gt - 0.21) / 0.05);
      WK.trail.forEach((m, L) => { m.visible = sw; if (!sw) return; const sh = R.worldToLocal(WK.arms[1].S.getWorldPosition(new V3())), t1 = th(ru), t0 = th(-1), RR = 6.3;
        WK.setRibbon(m, (k) => { const q = t1 + (t0 - t1) * k * 0.85; return [new V3(sh.x + 0.2, sh.y - Math.cos(q) * RR, sh.z + Math.sin(q) * RR), new V3(0, -Math.cos(q), Math.sin(q)), (L ? 0.25 : 0.6) * (1 - k) * fade + 0.01]; }); m.material.opacity = (L ? 0.9 : 0.55) * fade; }); }
    WK.rings.forEach((r, j) => { r.material.opacity = (j % 2 ? 0.45 : 0.8) + 0.2 * Math.sin(t * PI2 * 6 - j); r.scale.setScalar(1 + 0.04 * Math.sin(t * PI2 * 6 + j)); });
    WK.eye.material.opacity = 0.6 + 0.3 * Math.sin(t * PI2 * 6);
    // --- 其他玩家、寵物、怪 ---
    const ta = t * PI2; TW.h1.position.set(-7.4 + Math.sin(ta) * 1.8, 0, 6.2 + Math.cos(ta) * 1.5); TW.h1.rotation.y = ta + Math.PI / 2; TW.c1.pose(t * PI2 * 8);
    TW.c2.position.y = 0.03 * Math.abs(Math.sin(t * PI2 * 3)); TW.c2.arms[1].rotation.x = -2.4 + 0.4 * Math.sin(t * PI2 * 6); TW.c2.head.rotation.z = 0.08 * Math.sin(t * PI2 * 2);
    TW.c3.position.y = 0.03 * Math.abs(Math.sin(t * PI2 * 3 + 1)); TW.c3.head.rotation.y = 0.2 * Math.sin(t * PI2 * 2); TW.c3.arms[0].rotation.x = -0.5 + 0.3 * Math.sin(t * PI2 * 4);
    // 別的玩家：朝伺服器給的位置補間，有在動就播走路
    OTH.forEach(o => { const k = Math.min(1, dt * 9), dx = o.tx - o.x, dz = o.tz - o.z, far = Math.hypot(dx, dz);
      if (far > 12) { o.x = o.tx; o.z = o.tz; } else { o.x += dx * k; o.z += dz * k; }
      let df = o.tf - o.f; df = Math.atan2(Math.sin(df), Math.cos(df)); o.f += df * k;
      o.c.H.position.set(o.x, 0, o.z); o.c.H.rotation.y = o.f; STD.tick(o.c, dt, o.mv || far > 0.08 ? 1 : 0, 1.6); });
    if (STD && TW.s1) { const a2 = t * PI2 * 0.5; TW.s1.H.position.set(-7.4 + Math.sin(a2) * 2.2, 0, 6.2 + Math.cos(a2) * 1.8); TW.s1.H.rotation.y = a2 + Math.PI / 2;
      STD.tick(TW.s1, dt, 1, 1.1); STD.tick(TW.s2, dt, 0); STD.tick(TW.s3, dt, 0); }
    TW.pet.pose(t * PI2 * 4); TW.pet.position.y = 0.12 * Math.abs(Math.sin(t * PI2 * 4));
    TW.mobs.forEach((m) => { const h = Math.abs(Math.sin(t * PI2 * 3 + m.ph)); m.g.position.y = h * 0.45; m.g.scale.set(1 + (1 - h) * 0.1, 0.9 + h * 0.16, 1 + (1 - h) * 0.1); });
  }

  // --- 畫質：低 = 不開影子、解析度 1 倍；中 = 影子 1024、1.5 倍；高 = 影子 2048、2 倍 ---
  const QUALITY = [{ name: '低', dpr: 1, shadow: 0 }, { name: '中', dpr: 1.5, shadow: 1024 }, { name: '高', dpr: 2, shadow: 2048 }];
  function applyQuality() { const q = QUALITY[S.quality]; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr)); sun.castShadow = !!q.shadow;
    if (q.shadow && sun.shadow.mapSize.x !== q.shadow) { sun.shadow.mapSize.set(q.shadow, q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } }
  function resize() { W = window.innerWidth; H = window.innerHeight; renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize(); applyQuality();

  // --- 迴圈：分頁藏起來就停，回來不補算 ---
  let last = performance.now(), frames = 0, acc = 0, fps = 0, onStats = null;
  function loop(now) { requestAnimationFrame(loop); if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); renderer.render(scene, camera);
    frames++; acc += dt; if (acc >= 0.5) { fps = Math.round(frames / acc); frames = 0; acc = 0; if (onStats) onStats({ fps, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }); } }
  requestAnimationFrame(loop);

  return {
    state: S, formName: () => FORM_NAME[S.form], qualityName: () => QUALITY[S.quality].name,
    stick: (x, y) => { S.jx = x; S.jy = y; }, key: (k, on) => { S.keys[k] = on; },
    nextForm: () => { S.form = FORMS[(FORMS.indexOf(S.form) + 1) % FORMS.length]; return FORM_NAME[S.form]; },
    gesture: () => { if (S.gt < 0) S.gt = 0; },
    zoom: () => { S.zoom = 1 - S.zoom; return S.zoom ? '近' : '遠'; },
    nextQuality: () => { S.quality = (S.quality + 1) % QUALITY.length; applyQuality(); return QUALITY[S.quality].name; },
    lines: () => { S.lines = !S.lines; outlines.forEach(o => { o.visible = S.lines; }); if (STD) STD.lines(S.lines); return S.lines ? '開' : '關'; },
    // 標準人物：換操控的角色、換裝
    hasStd: !!ME, ctrlName: () => (S.ctrl === 'me' ? '標準人物' : '機器人騎士'),
    walkTo: (cx, cy) => { NDC.set(cx / W * 2 - 1, -(cy / H) * 2 + 1); RAY.setFromCamera(NDC, camera);
      if (!RAY.ray.intersectPlane(GROUND, HIT)) return false;
      S.goal = { x: Math.max(-70, Math.min(70, HIT.x)), z: Math.max(-70, Math.min(70, HIT.z)) }; return true; },
    nextCtrl: () => { S.goal = null; if (ME) S.ctrl = S.ctrl === 'me' ? 'robot' : 'me'; return S.ctrl === 'me' ? '標準人物' : '機器人騎士'; },
    look: () => (ME ? Object.assign({}, ME.c.look) : null), dress: (patch) => { if (ME) STD.setLook(ME.c, patch); return ME ? Object.assign({}, ME.c.look) : null; },
    fromAccount: (b) => (STD ? STD.fromAccount(b) : null),
    options: () => (STD ? { parts: STD.PARTS, names: STD.NAMES, swatch: STD.SWATCH } : null),
    net: NET,
    onStats: (fn) => { onStats = fn; },
  };
})();
window.HQ_NEWWORLD = NW;

})();
