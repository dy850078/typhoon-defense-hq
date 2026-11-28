// ===== 3D 寵物：貓、狗、小馬的模型（`makePet3D`）和領養畫面裡那個可以轉著看的小預覽（`PETVIEW`） =====
// 領養、重捏的每一個選項（耳朵、花紋、白毛、尾巴、表情、眼型、各種顏色）在這裡都要看得出差別：面板上看到的就是牠在世界裡的樣子
// 花紋是貼著身體和頭的一層薄殼（球面的一小塊），不用貼圖；回傳的 g 有 b（身體）、legs、tail、legY 給走路和搖尾巴用
function makePet3D(pet) {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  const k = pet.kind, cat = k === 'cat', dog = k === 'dog', hs = k === 'horse', fur = pet.fur, mark = pet.mark, WH = '#fbf7ee', PI = Math.PI;
  const pat = pet.pattern, wOn = pet.white !== 'none', socks = pet.white === 'socks', face = pet.face;
  const by = hs ? 0.66 : 0.36, hy = hs ? 1.2 : 0.66, hz = hs ? 0.46 : 0.26;
  const flat = (geo, col, o = {}) => part(b, geo, col, { noLine: true, shadow: false, mat: basic(col), ...o });
  // 貼在 host（身體或頭）表面的一塊：th 是離極點多遠的一圈，rot 把極點轉到要的方向，lv 越大疊在越外面
  const shell = (host, R, col, th0, thL, rot, ph0, phL, lv) => { const m = new THREE.Mesh(new THREE.SphereGeometry(R * (1.018 + (lv || 0) * 0.014), 20, 8, ph0 ?? 0, phL ?? PI * 2, th0, thL), mat(col)); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); m.receiveShadow = true; host.add(m); return m; };
  const body = part(b, sph(0.3), fur, { pos: [0, by, -0.05], scale: hs ? [0.8, 0.82, 1.35] : [0.85, 0.8, 1.15] });
  const head = part(b, sph(0.27), fur, { pos: [0, hy, hz], scale: hs ? [0.82, 0.86, 0.95] : [1.06, 0.96, 1] });
  const two = /^#(d9|e8|f0)/.test(mark) ? '#3d3a3e' : '#e8963f';   // 三花的第二個顏色
  let lidCol = fur, earCol = fur, pawCol = socks ? WH : fur, tailCol = fur, tipCol = null, muzzleCol = wOn ? WH : fur;
  // --- 貓的花紋 ---
  if (cat) {
    const brow = () => [-0.3, 0, 0.3].forEach(d => shell(head, 0.27, mark, PI / 2 + d - 0.05, 0.1, [0, 0, -PI / 2], PI * 2 - 0.55, 1.15));   // 額頭三條
    if (pat === 'mackerel') { [0.72, 1.1, 1.48, 1.86, 2.24].forEach(t => shell(body, 0.3, mark, t, 0.14, [PI / 2, 0, 0], PI + 0.45, PI - 0.9)); brow(); tipCol = mark; }
    else if (pat === 'classic') { shell(body, 0.3, mark, PI / 2 - 0.08, 0.16, [0, 0, -PI / 2], PI * 2 - 1.15, 2.3);
      [-1, 1].forEach(a => { shell(body, 0.3, mark, 0.4, 0.17, [0, 0, -a * 1.25]); shell(body, 0.3, mark, 0, 0.2, [0, 0, -a * 1.25]); }); brow(); tipCol = mark; }
    else if (pat === 'spots') { [[0.55, 0.5], [-0.45, 0.7], [0.1, -0.6], [-0.75, -0.4], [0.85, -0.3], [-0.1, 0.12], [1.15, 0.25], [-1.1, 0.2], [0.35, 1.15], [-0.3, -1.15]].forEach(([x, z], i) => shell(body, 0.3, mark, 0, 0.17 + (i % 3) * 0.03, [x, 0, z]));
      [[-0.25, 0.55], [0.05, -0.5], [-0.75, 0.05]].forEach(([x, z]) => shell(head, 0.27, mark, 0, 0.17, [x, 0, z])); tipCol = mark; }
    else if (pat === 'calico') { shell(body, 0.3, mark, 0, 0.68, [0.55, 0, 0.6]); shell(body, 0.3, two, 0, 0.72, [-0.6, 0, -0.55]); shell(body, 0.3, two, 0, 0.3, [-0.9, 0, 0.9]);
      shell(head, 0.27, mark, 0, 0.72, [0.1, 0, 0.75]); shell(head, 0.27, two, 0, 0.68, [0.05, 0, -0.8]); earCol = null; tailCol = mark; }
    else if (pat === 'tuxedo') { shell(body, 0.3, mark, 0, 1.95); shell(head, 0.27, mark, 0, 1.5, [-0.5, 0, 0]); shell(head, 0.27, WH, 0, 0.8, [PI / 2 + 0.55, 0, 0], 0, PI * 2, 1); shell(head, 0.27, WH, PI / 2 - 0.13, 0.26, [0, 0, -PI / 2], 0.35, 1.3, 1);
      lidCol = earCol = tailCol = mark; muzzleCol = WH; tipCol = WH; pawCol = WH; }
    else if (pat === 'points') { shell(head, 0.27, mark, 0, 0.66, [PI / 2 - 0.12, 0, 0]); lidCol = earCol = tailCol = mark; pawCol = socks ? WH : mark; if (!wOn) muzzleCol = mark; }
  }
  // --- 胸口、肚子的白毛 ---
  if (wOn && !hs || pat === 'tuxedo') part(b, sph(0.2), WH, { pos: [0, by - 0.05, 0.17], scale: [0.92, 0.85, 0.8], noLine: true, shadow: false });
  if (dog && pet.white === 'muzzle') { shell(head, 0.27, WH, 0, 0.9, [PI / 2 + 0.5, 0, 0]); shell(body, 0.3, WH, 0, 1.0, [PI, 0, 0]); [-1, 1].forEach(a => flat(sph(0.024, 8, 6), WH, { pos: [0.1 * a, hy + 0.125, hz + 0.222], scale: [1.2, 1, 0.5] })); }
  if (dog && socks) { shell(head, 0.27, WH, 0, 1.12, [PI / 2 + 0.12, 0, 0]); part(b, sph(0.06, 10, 8), fur, { pos: [0, hy + 0.13, hz + 0.232], scale: [0.75, 1.5, 0.4], rot: [-0.45, 0, 0], noLine: true, shadow: false }); lidCol = WH; }
  // --- 狗的毛型：捲毛是一球一球的，短毛是頭頂一小片 ---
  if (dog) { if (pat === 'curly') { [[0, 0.24, 0.02, 0.12], [0.11, 0.2, 0.06, 0.1], [-0.11, 0.2, 0.06, 0.1], [0.06, 0.21, -0.1, 0.1], [-0.07, 0.2, -0.09, 0.1], [0, 0.17, 0.15, 0.085]].forEach(([x, y, z, r]) => part(b, sph(r, 10, 8), mark, { pos: [x, hy + y, hz + z], line: 0.016 }));
      [[0, 0.2, 0, 0.13], [0.16, 0.12, 0.1, 0.11], [-0.16, 0.12, 0.1, 0.11], [0.17, 0.1, -0.16, 0.11], [-0.17, 0.1, -0.16, 0.11], [0, 0.18, -0.24, 0.12], [0, 0.17, 0.2, 0.1], [0.2, -0.02, -0.03, 0.1], [-0.2, -0.02, -0.03, 0.1]].forEach(([x, y, z, r]) => part(b, sph(r, 10, 8), fur, { pos: [x, by + y, z - 0.05], line: 0.016 })); }
    else shell(head, 0.27, mark, 0, 0.52, [-0.25, 0, 0]); }
  // --- 小馬：脖子、鬃毛、白鼻梁 ---
  if (hs) { part(b, sph(0.17), fur, { pos: [0, 0.95, 0.26], scale: [0.75, 1.6, 0.85], rot: [0.55, 0, 0] });
    const long = pat !== 'short'; for (let i = 0; i < 5; i++) part(b, sph(long ? 0.1 : 0.07, 10, 8), mark, { pos: [0, 1.43 - i * 0.135, 0.3 - i * 0.085], scale: [0.6, 1, 0.95], line: 0.014 });
    part(b, sph(long ? 0.1 : 0.065, 10, 8), mark, { pos: [0, hy + 0.2, hz + 0.1], scale: [0.8, 0.7, 1], rot: [0.5, 0, 0], line: 0.014 });
    if (long) { [0, 1, 2, 3].forEach(i => part(b, sph(0.085, 10, 8), mark, { pos: [0.1, 1.3 - i * 0.14, 0.26 - i * 0.07], scale: [0.5, 1.5, 0.9], rot: [0, 0, 0.25], line: 0.014 })); part(b, sph(0.07, 10, 8), mark, { pos: [0.05, hy + 0.12, hz + 0.2], scale: [0.7, 1.3, 0.5], rot: [0.3, 0, 0.2], line: 0.012 }); }
    if (wOn) shell(head, 0.27, WH, PI / 2 - 0.2, 0.4, [0, 0, -PI / 2], 0.2, 1.5);
    muzzleCol = pet.nose; tailCol = mark; }
  // --- 嘴邊、鼻子 ---
  const mz = hz + (hs ? 0.26 : dog ? 0.21 : 0.2), mf = hz + (hs ? 0.43 : dog ? 0.325 : 0.298), my = hy - (hs ? 0.07 : 0.075);
  part(b, sph(0.1), muzzleCol, { pos: [0, hy - 0.07, mz], scale: hs ? [1.25, 1.2, 1.7] : dog ? [1.3, 0.92, 1.2] : [1.25, 0.8, 1], line: 0.018 });
  if (hs) [-1, 1].forEach(a => flat(sph(0.017, 8, 6), INK, { pos: [0.055 * a, hy - 0.035, mf] }));
  else flat(sph(dog ? 0.05 : 0.036, 10, 8), pet.nose, { pos: [0, hy - 0.035, hz + (dog ? 0.335 : 0.305)], scale: [1.25, 0.8, 0.8] });
  // --- 嘴巴和表情：微笑是 ω 加腮紅，淡定是一條線加壓低的眼皮，吐舌頭多一片舌頭 ---
  if (face === 'calm') flat(new THREE.BoxGeometry(hs ? 0.09 : 0.06, 0.009, 0.01), INK, { pos: [0, my - (hs ? 0.05 : 0.015), mf - (hs ? 0.03 : 0)] });
  else { [-1, 1].forEach(a => flat(new THREE.TorusGeometry(hs ? 0.04 : 0.027, 0.0075, 5, 10, PI), INK, { pos: [(hs ? 0.04 : 0.027) * a, my - (hs ? 0.04 : 0.005), mf - (hs ? 0.035 : 0.002)], rot: [0, 0, PI] }));
    [-1, 1].forEach(a => flat(sph(0.048, 10, 8), '#f4a9a4', { pos: [(hs ? 0.15 : 0.175) * a, hy - 0.055, hz + (hs ? 0.17 : 0.2)], scale: [1, 0.68, 0.3], rot: [0, 0.7 * a, 0], mat: new THREE.MeshBasicMaterial({ color: '#f4a9a4', transparent: true, opacity: 0.75 }) })); }
  if (face === 'tongue') flat(sph(0.034, 10, 8), '#f2879b', { pos: [0, my - 0.05, mf - 0.012], scale: [1, 1.35, 0.5] });
  // --- 眼睛：有顏色的虹膜、黑瞳孔、一點高光；瞇眼笑是兩道彎彎的線 ---
  const ex = hs ? 0.105 : 0.108, ey = hy + 0.04, ez = hz + (hs ? 0.218 : 0.238);
  [-1, 1].forEach(a => { const x = ex * a, col = pet.eyes === 'odd' ? (a < 0 ? '#79b3e3' : '#e3b23c') : pet.eyes, ry = 0.3 * a;
    if (face === 'squint') { flat(new THREE.TorusGeometry(0.045, 0.0095, 5, 12, PI), INK, { pos: [x, ey - 0.015, ez + 0.012], rot: [0, ry, 0] }); return; }
    flat(sph(0.06, 12, 10), INK, { pos: [x, ey, ez - 0.006], scale: [1, 1.12, 0.4], rot: [0, ry, 0] });
    flat(sph(0.051, 12, 10), col, { pos: [x, ey, ez + 0.004], scale: [1, 1.12, 0.4], rot: [0, ry, 0] });
    flat(sph(0.03, 10, 8), INK, { pos: [x, ey, ez + 0.013], scale: [1, 1.2, 0.4], rot: [0, ry, 0] });
    flat(sph(0.013, 8, 6), '#ffffff', { pos: [x + 0.017, ey + 0.024, ez + 0.026] });
    const shape = cat ? pet.eyeshape : 'round', lid = shape === 'half' ? 0.5 : shape === 'lid' ? 0.34 : face === 'calm' ? 0.26 : 0;
    if (lid) { part(b, sph(0.068, 12, 8), lidCol, { pos: [x, ey + 0.085 - lid * 0.075, ez + 0.006], scale: [1.08, 0.62, 0.5], rot: [0, ry, shape === 'lid' ? -0.22 * a : 0], noLine: true, shadow: false });
      flat(new THREE.BoxGeometry(0.115, 0.009, 0.012), INK, { pos: [x, ey + 0.045 - lid * 0.075, ez + 0.03], rot: [0, ry, shape === 'lid' ? -0.22 * a : 0] }); } });
  // --- 耳朵 ---
  [-1, 1].forEach(a => { const ec = earCol || (a < 0 ? mark : two);
    if (dog) { const c = pet.earc || mark;
      if (pet.ears === 'perk') { part(b, sph(0.1), c, { pos: [0.17 * a, hy + 0.27, hz - 0.03], scale: [0.62, 1.35, 0.45], rot: [0, 0, -0.28 * a], line: 0.018 }); flat(sph(0.06, 10, 8), '#f4b6b0', { pos: [0.168 * a, hy + 0.25, hz + 0.012], scale: [0.55, 1.25, 0.3], rot: [0, 0, -0.28 * a] }); }
      else { part(b, sph(0.11), c, { pos: [0.25 * a, hy + 0.04, hz - 0.03], scale: [0.6, 1.45, 0.85], rot: [0, 0, -0.3 * a], line: 0.018 }); if (pat === 'curly') [[0.27, -0.06, 0.03], [0.25, 0.09, -0.02], [0.29, -0.15, -0.04]].forEach(([x, y, z]) => part(b, sph(0.075, 10, 8), c, { pos: [x * a, hy + y, hz + z], line: 0.014 })); } }
    else if (cat && pet.ears === 'fold') part(b, sph(0.095), ec, { pos: [0.18 * a, hy + 0.2, hz + 0.03], scale: [1, 0.5, 0.85], rot: [0.45, 0, -0.45 * a], line: 0.018 });
    else { part(b, new THREE.ConeGeometry(hs ? 0.06 : 0.105, hs ? 0.2 : 0.21, 4), ec, { pos: [(hs ? 0.11 : 0.16) * a, hy + (hs ? 0.28 : 0.25), hz - 0.03], rot: [0, 0.6 * a, -0.2 * a], line: 0.016 });
      flat(new THREE.ConeGeometry(hs ? 0.034 : 0.062, hs ? 0.13 : 0.14, 4), '#f4b6b0', { pos: [(hs ? 0.11 : 0.158) * a, hy + (hs ? 0.265 : 0.236), hz - 0.004], rot: [0, 0.6 * a, -0.2 * a] }); } });
  // --- 腳：白襪子、重點色的深色腳掌、馬蹄 ---
  g.legY = hs ? 0.22 : 0.1;
  g.legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([a, c]) => { const l = part(b, sph(0.09), fur, { pos: [0.15 * a, g.legY, 0.2 * c - 0.05], scale: [1, hs ? 2.6 : 1.3, 1] });
    if (hs) { if (socks) { const s = new THREE.Mesh(sph(0.094, 12, 8, 0), mat(WH)); s.scale.set(1, 0.5, 1); s.position.y = -0.035; l.add(s); } const h = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.022, 10), mat('#5a4636')); h.position.y = -0.08; l.add(h); }
    else if (pawCol !== fur) { const s = new THREE.Mesh(sph(0.093, 12, 8), mat(pawCol)); s.scale.set(1.02, 0.6, 1.06); s.position.set(0, -0.04, 0.008); l.add(s); }
    return l; });
  // --- 尾巴：一節一節的小球排成一條，整條繞著根部搖 ---
  const tail = new THREE.Group(); tail.position.set(0, by + (hs ? 0.1 : 0.12), hs ? -0.42 : -0.36); b.add(tail); g.tail = tail;
  const chain = (n, r0, r1, at, col, tip) => { for (let i = 0; i < n; i++) { const t = n > 1 ? i / (n - 1) : 0, p = at(t); part(tail, sph(r0 + (r1 - r0) * t, 10, 8), tip && i === n - 1 ? tip : col, { pos: p, line: 0.014 }); } };
  const T = pet.tail;
  if (hs) chain(T === 'short' ? 4 : 10, 0.08, 0.06, t => [0, -t * (T === 'short' ? 0.2 : 0.5), -0.03 - Math.sin(t * 2.2) * 0.09], mark);
  else if (dog && T === 'pom') part(tail, sph(0.115, 12, 10), fur, { pos: [0, 0.05, -0.06], line: 0.016 });
  else if (dog && T === 'curl') { const m = part(tail, new THREE.TorusGeometry(0.1, 0.05, 8, 14, 4.6), fur, { pos: [0, 0.14, -0.02], rot: [0, PI / 2, 0], line: 0.014 }); m.rotation.set(0.5, PI / 2, 0); }
  else { const fl = T === 'fluffy', sh = T === 'short', n = sh ? 3 : 10, len = sh ? 0.12 : 0.52;
    chain(n, fl ? 0.09 : 0.066, fl ? 0.125 : 0.056, t => [0, Math.sin(t * 1.5) * len * 0.95, -t * len * 0.55 - (1 - Math.cos(t * 1.5)) * 0.06], tailCol, sh ? null : tipCol); }
  g.b = b; g.scale.setScalar(0.95); return g;
}

// 領養畫面的預覽：另外開一個小畫布畫同一個模型（跟世界裡的是同一份程式），可以拖著轉；面板關掉就整個收掉
const PETVIEW = (() => { let R = null, cv = null, pg = null, sc = null, cam = null, yaw = 0.5, t = 0, drag = null, kind = '';
  const wipe = () => { if (!pg) return; sc.remove(pg); pg.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); pg = null; };
  const close = () => { wipe(); if (R) { R.dispose(); R.forceContextLoss(); R = null; } cv = null; };
  const init = () => { sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff6e0, 0xd9d39a, 1.9)); const d = new THREE.DirectionalLight(0xffe9c4, 1.8); d.position.set(-3, 6, 5); sc.add(d);
    cam = new THREE.PerspectiveCamera(24, 1, 0.1, 30);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28), new THREE.MeshBasicMaterial({ color: '#6b5a3a', transparent: true, opacity: 0.16 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; sh.scale.set(1, 1.25, 1); sc.add(sh); };
  const show = (canvas, look) => { if (!canvas || !look) return close(); if (!sc) init();
    if (canvas !== cv) { if (R) { R.dispose(); R.forceContextLoss(); } cv = canvas; R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); yaw = 0.5;
      canvas.style.touchAction = 'none'; canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: yaw }; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 沒差 */ } });
      canvas.addEventListener('pointermove', e => { if (drag) yaw = drag.y + (e.clientX - drag.x) * 0.012; }); const up = () => { drag = null; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); }
    wipe(); pg = makePet3D(look); kind = look.kind; sc.add(pg); };
  const tick = (dt) => { if (!R) return; if (!cv.isConnected) return close(); const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    const pr = R.getPixelRatio(); if (cv.width !== Math.round(w * pr) || cv.height !== Math.round(h * pr)) R.setSize(w, h, false);
    const hs = kind === 'horse', cy = hs ? 0.74 : 0.44, dist = (hs ? 4.7 : 3.7) * Math.max(1, (h / w) * 0.95); cam.aspect = w / h; cam.position.set(0, cy + dist * 0.2, dist); cam.lookAt(0, cy, 0); cam.updateProjectionMatrix();
    t += dt; pg.rotation.y = yaw + (drag ? 0 : Math.sin(t * 0.5) * 0.22); pg.b.scale.y = 1 + Math.sin(t * 2.2) * 0.012; pg.tail.rotation.z = Math.sin(t * 5) * 0.4; R.render(sc, cam); };
  return { show, tick, close, info: () => (R && pg ? { kind, parts: (() => { let n = 0; pg.traverse(m => { if (m.isMesh) n++; }); return n; })(), yaw, w: cv.width, h: cv.height } : null), turn: (v) => { yaw = v; } };
})();
