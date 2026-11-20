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


