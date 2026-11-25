// ===== 寵物草坪：前院西邊一塊矮木柵圍起來的草地（`makePetLawn`，由 `60-play.js` 在長草之前呼叫） =====
// 裡面有一排排小床、狗屋、貓跳台、小土坡、樹、小水池、球；門口站一位照顧員（領養、重捏在他那裡）
// 不放寫字的牌子，靠外型認；柵欄和小床各用一批一起畫，少開描邊，省繪製次數
function makePetLawn(WALLS, ROUNDS) {
  const X0 = -37, X1 = -20, Z0 = 2.5, Z1 = 15.5, GZ0 = 8, GZ1 = 10.6, r = rnd(591), G = new THREE.Group(); scene.add(G);
  const batch = (geo, material, list, shadow) => { const im = new THREE.InstancedMesh(geo, material, list.length), o = new THREE.Object3D(), c = new THREE.Color();
    list.forEach((d, i) => { o.position.set(d.x, d.y || 0, d.z); o.rotation.set(d.rx || 0, d.ry || 0, d.rz || 0); o.scale.set(d.sx || d.s || 1, d.sy || d.s || 1, d.sz || d.s || 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (d.col) im.setColorAt(i, c.set(d.col)); });
    im.castShadow = !!shadow; im.receiveShadow = true; im.frustumCulled = false; G.add(im); return im; };
  // 草地：比前院的草淺一點、修得平平的
  const turf = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 - 0.3, Z1 - Z0 - 0.3), mat('#d3e08c')); turf.rotation.x = -Math.PI / 2; turf.position.set((X0 + X1) / 2, 0.012, (Z0 + Z1) / 2); turf.receiveShadow = true; G.add(turf);
  // 矮木柵：東邊留一個門
  const posts = [], rails = [], side = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.4)), ry = -Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i <= n; i++) posts.push({ x: x0 + (x1 - x0) * i / n, z: z0 + (z1 - z0) * i / n, y: 0.42, rz: (r() - 0.5) * 0.08 });
    [0.34, 0.66].forEach((y, j) => rails.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, y, ry, sx: len + 0.2, col: j ? '#d79a61' : '#c98a52' }));
    WALLS.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: len / 2 + 0.1, hz: 0.12, ry }); };
  side(X0, Z0, X1, Z0); side(X0, Z1, X1, Z1); side(X0, Z0, X0, Z1); side(X1, Z0, X1, GZ0); side(X1, GZ1, X1, Z1);
  batch(new THREE.CylinderGeometry(0.085, 0.1, 0.86, 7), mat('#c98a52'), posts, true); batch(new THREE.BoxGeometry(1, 0.1, 0.06), mat('#ffffff'), rails, false);
  // 門柱高一點，上面各放一顆小球；門口一塊貓腳印踏墊
  [GZ0, GZ1].forEach(z => { part(G, new THREE.CylinderGeometry(0.12, 0.14, 1.25, 8), '#a8693f', { pos: [X1, 0.62, z], line: 0.022 }); part(G, sph(0.15, 10, 8), '#f6d76a', { pos: [X1, 1.32, z], noLine: true }); });
  const mt = tex(128, 96, (c, w, h) => { c.fillStyle = '#e9b98a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a8693f'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, h - 10); c.fillStyle = '#8a5a3a';
    [[44, 54, 1], [86, 40, 0.8]].forEach(([x, y, k]) => { c.beginPath(); c.ellipse(x, y + 6 * k, 11 * k, 9 * k, 0, 0, 7); c.fill(); [[-11, -6], [-4, -13], [4, -13], [11, -6]].forEach(([a, b]) => { c.beginPath(); c.ellipse(x + a * k, y + b * k, 4 * k, 5 * k, 0, 0, 7); c.fill(); }); }); });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshToonMaterial({ map: mt, gradientMap: RAMP })); rug.rotation.set(-Math.PI / 2, 0, Math.PI / 2); rug.position.set(X1 + 0.9, 0.02, (GZ0 + GZ1) / 2); rug.receiveShadow = true; G.add(rug);
  // 小床：北排 9 張、南排 9 張、西邊 6 張，一共 24 張；每張顏色不太一樣
  const BEDS = []; const BW = (X1 - X0 - 2.6) / 8; for (let i = 0; i < 9; i++) BEDS.push({ x: X0 + 1.3 + i * BW, z: Z0 + 1.2, f: 0 });
  for (let i = 0; i < 9; i++) BEDS.push({ x: X0 + 1.3 + i * BW, z: Z1 - 1.2, f: Math.PI });
  for (let i = 0; i < 6; i++) BEDS.push({ x: X0 + 1.3, z: Z0 + 2.9 + i * (Z1 - Z0 - 5.8) / 5, f: Math.PI / 2 });
  const BC = ['#f6b3c0', '#bcd4ea', '#f6d76a', '#cdb6ee', '#a9d9b0', '#f3c19a'];
  batch(new THREE.CylinderGeometry(0.5, 0.56, 0.2, 14), mat('#ffffff'), BEDS.map((b, i) => ({ x: b.x, z: b.z, y: 0.1, col: BC[i % BC.length] })), true);
  batch(sph(0.4, 12, 8), mat('#fffaf0'), BEDS.map(b => ({ x: b.x, z: b.z, y: 0.2, sy: 0.22 })), false);
  BEDS.forEach(b => ROUNDS.push({ x: b.x, z: b.z, r: 0.42 }));
  // 狗屋
  { const g = new THREE.Group(); g.position.set(-33.2, 0, 6.6); g.rotation.y = 0.5; G.add(g);
    part(g, new THREE.BoxGeometry(1.5, 1.0, 1.4), '#f1dcb6', { pos: [0, 0.5, 0], line: 0.024 });
    part(g, new THREE.CylinderGeometry(0.02, 1.2, 0.75, 4), '#d9604a', { pos: [0, 1.36, 0], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.95], line: 0.024 });
    part(g, new THREE.CylinderGeometry(0.36, 0.36, 0.04, 14, 1, false, 0, Math.PI), '#5b4636', { pos: [0, 0.34, 0.705], rot: [Math.PI / 2, Math.PI / 2, 0], noLine: true, shadow: false });
    part(g, new THREE.BoxGeometry(0.72, 0.34, 0.04), '#5b4636', { pos: [0, 0.17, 0.705], noLine: true, shadow: false });
    WALLS.push({ x: -33.2, z: 6.6, hx: 0.85, hz: 0.8, ry: 0.5 }); }
  // 貓跳台：一根纏麻繩的柱子、兩層平台、頂上一顆小球
  { const g = new THREE.Group(); g.position.set(-27.6, 0, 6.2); G.add(g);
    part(g, new THREE.CylinderGeometry(0.62, 0.66, 0.14, 14), '#e9dcb8', { pos: [0, 0.07, 0], line: 0.022 });
    part(g, new THREE.CylinderGeometry(0.13, 0.13, 1.9, 9), '#d8b98a', { pos: [0, 1.0, 0], line: 0.02 });
    part(g, new THREE.CylinderGeometry(0.5, 0.5, 0.12, 14), '#f6b3c0', { pos: [0.28, 1.05, 0.1], line: 0.022 });
    part(g, new THREE.CylinderGeometry(0.44, 0.44, 0.12, 14), '#bcd4ea', { pos: [-0.12, 1.98, -0.05], line: 0.022 });
    part(g, sph(0.09, 8, 6), '#d9604a', { pos: [0.5, 0.78, 0.42], noLine: true }); part(g, new THREE.CylinderGeometry(0.008, 0.008, 0.26, 4), INK, { pos: [0.5, 0.9, 0.42], noLine: true, shadow: false });
    ROUNDS.push({ x: -27.6, z: 6.2, r: 0.66 }); }
  // 小土坡、樹、水池、球、兩個碗
  part(G, sph(1.7, 20, 12), '#c3d77c', { pos: [-26.6, -0.55, 11.3], scale: [1, 0.62, 0.9], noLine: true }); ROUNDS.push({ x: -26.6, z: 11.3, r: 1.25 });
  { const n = scene.children.length; roundTree(-33.0, 11.2, 1.55, '#b9d26c'); for (let i = n; i < scene.children.length; i++) { const o = scene.children[i]; G.add(o); i--; } ROUNDS.push({ x: -33.0, z: 11.2, r: 0.45 }); }
  { const w = new THREE.Mesh(new THREE.CircleGeometry(1.05, 20), basic('#9fd0e6')); w.rotation.x = -Math.PI / 2; w.position.set(-22.9, 0.03, 12.0); G.add(w);
    const st = []; for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283; st.push({ x: -22.9 + Math.cos(a) * 1.12, z: 12.0 + Math.sin(a) * 1.12, y: 0.07, ry: a, sx: 0.9 + r() * 0.5, sy: 0.8 + r() * 0.5, sz: 0.9 + r() * 0.4 }); }
    batch(new THREE.DodecahedronGeometry(0.2, 0), mat('#e2ddd0'), st, true); ROUNDS.push({ x: -22.9, z: 12.0, r: 1.2 }); }
  const ball = part(G, sph(0.2, 12, 9), '#e2506a', { pos: [-29.4, 0.2, 9.0], line: 0.02 }); part(ball, new THREE.TorusGeometry(0.2, 0.035, 6, 16), '#fffaf0', { rot: [0.5, 0.3, 0], noLine: true, shadow: false });
  [['#bcd4ea', '#9fd0e6', -21.3], ['#f6b3c0', '#b98a5e', -22.1]].forEach(([c, f, x]) => { part(G, new THREE.CylinderGeometry(0.24, 0.18, 0.13, 12), c, { pos: [x, 0.07, 5.4], noLine: true }); part(G, new THREE.CylinderGeometry(0.19, 0.19, 0.02, 12), f, { pos: [x, 0.135, 5.4], noLine: true, shadow: false }); });
  return { G, BEDS, bed: (i) => BEDS[((i | 0) % BEDS.length + BEDS.length) % BEDS.length], IN: { x0: X0 + 2.5, x1: X1 - 1.3, z0: Z0 + 2.7, z1: Z1 - 2.7 }, NPC: { x: X1 + 1.3, z: GZ0 - 1.0, f: 1.15, y: 2.75 }, GATE: { x: X1, z: (GZ0 + GZ1) / 2 } };
}
