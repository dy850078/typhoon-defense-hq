// ===== 寵物草坪：前院西邊一大片矮木柵圍起來的草地（`makePetLawn`，由 `60-play.js` 在長草之前呼叫） =====
// 是給寵物玩的地方，不是寵物舍：中間留一大片空草地可以跑，周圍是遊樂設施（隧道、跳圈、繞桿、沙坑、小山丘、貓跳台和紙箱、戲水池、翹翹板、球池、輪胎鞦韆）
// 睡覺的地方散在各處（野餐墊、樹下、山丘上、石頭上、紙箱裡、乾草堆……），不排一整排的床；要墊子的位置，有寵物睡才會放一個
// 不放寫字的牌子，靠外型認；柵欄、石頭、花、球各用一批一起畫，少開描邊，省繪製次數
function makePetLawn(WALLS, ROUNDS) {
  const X0 = -49, X1 = -21, Z0 = -1, Z1 = 19, GZ0 = 7.6, GZ1 = 10.6, r = rnd(591), G = new THREE.Group(), PI = Math.PI; scene.add(G);
  const batch = (geo, material, list, shadow) => { const im = new THREE.InstancedMesh(geo, material, list.length), o = new THREE.Object3D(), c = new THREE.Color();
    list.forEach((d, i) => { o.position.set(d.x, d.y || 0, d.z); o.rotation.set(d.rx || 0, d.ry || 0, d.rz || 0); o.scale.set(d.sx || d.s || 1, d.sy || d.s || 1, d.sz || d.s || 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (d.col) im.setColorAt(i, c.set(d.col)); });
    im.castShadow = !!shadow; im.receiveShadow = true; im.frustumCulled = false; G.add(im); return im; };
  const grp = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; G.add(g); return g; };
  const disc = (x, z, rad, col, y, sx) => { const m = new THREE.Mesh(new THREE.CircleGeometry(rad, 28), mat(col)); m.rotation.x = -PI / 2; m.position.set(x, y || 0.02, z); if (sx) m.scale.set(sx, 1, 1); m.receiveShadow = true; G.add(m); return m; };
  // 草地：比前院的草淺一點、修得平平的；中間幾塊割草的深淺
  const turf = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 - 0.3, Z1 - Z0 - 0.3), mat('#d3e08c')); turf.rotation.x = -PI / 2; turf.position.set((X0 + X1) / 2, 0.012, (Z0 + Z1) / 2); turf.receiveShadow = true; G.add(turf);
  [[-33, 9.2, 5.2, 0.8], [-29.5, 11.5, 3.2, 1.1], [-37, 6.8, 2.6, 1.3]].forEach(([x, z, rad, sx]) => disc(x, z, rad, '#dbe697', 0.016, sx));
  // 矮木柵：東邊留一個門
  const posts = [], rails = [], side = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.9)), ry = -Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i <= n; i++) posts.push({ x: x0 + (x1 - x0) * i / n, z: z0 + (z1 - z0) * i / n, y: 0.36, rz: (r() - 0.5) * 0.08 });
    [0.3, 0.56].forEach((y, j) => rails.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, y, ry, sx: len + 0.2, col: j ? '#d79a61' : '#c98a52' }));
    WALLS.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: len / 2 + 0.1, hz: 0.12, ry }); };
  side(X0, Z0, X1, Z0); side(X0, Z1, X1, Z1); side(X0, Z0, X0, Z1); side(X1, Z0, X1, GZ0); side(X1, GZ1, X1, Z1);
  batch(new THREE.CylinderGeometry(0.08, 0.095, 0.74, 7), mat('#c98a52'), posts, true); batch(new THREE.BoxGeometry(1, 0.09, 0.055), mat('#ffffff'), rails, false);
  // 門柱高一點，上面各放一顆小球；門口一塊腳印踏墊，往裡面一串踏腳石
  [GZ0, GZ1].forEach(z => { part(G, new THREE.CylinderGeometry(0.12, 0.14, 1.25, 8), '#a8693f', { pos: [X1, 0.62, z], line: 0.022 }); part(G, sph(0.15, 10, 8), '#f6d76a', { pos: [X1, 1.32, z], noLine: true }); });
  const mt = tex(128, 96, (c, w, h) => { c.fillStyle = '#e9b98a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a8693f'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, h - 10); c.fillStyle = '#8a5a3a';
    [[44, 54, 1], [86, 40, 0.8]].forEach(([x, y, k]) => { c.beginPath(); c.ellipse(x, y + 6 * k, 11 * k, 9 * k, 0, 0, 7); c.fill(); [[-11, -6], [-4, -13], [4, -13], [11, -6]].forEach(([a, b]) => { c.beginPath(); c.ellipse(x + a * k, y + b * k, 4 * k, 5 * k, 0, 0, 7); c.fill(); }); }); });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshToonMaterial({ map: mt, gradientMap: RAMP })); rug.rotation.set(-PI / 2, 0, PI / 2); rug.position.set(X1 + 0.9, 0.02, (GZ0 + GZ1) / 2); rug.receiveShadow = true; G.add(rug);
  batch(new THREE.CylinderGeometry(0.34, 0.38, 0.05, 9), mat('#ece4cf'), [[-22.3, 9.2], [-23.5, 9.5], [-24.7, 9.3], [-25.9, 9.8], [-27.1, 9.6], [-28.3, 10.1]].map(([x, z], i) => ({ x, z, y: 0.03, ry: i, sx: 0.9 + r() * 0.3, sz: 0.8 + r() * 0.3 })), false);

  // ---------- 東北角：大樹、輪胎鞦韆、樹下的野餐墊 ----------
  { const n = scene.children.length; roundTree(-26.0, 2.6, 2.0, '#b9d26c'); for (let i = n; i < scene.children.length; i++) { const o = scene.children[i]; G.add(o); i--; } ROUNDS.push({ x: -26.0, z: 2.6, r: 0.55 });
    const g = grp(-26.0, 2.6, -0.5); part(g, new THREE.CylinderGeometry(0.07, 0.09, 2.2, 7), PAL.trunk, { pos: [1.0, 2.25, 0.6], rot: [0, 0, PI / 2 - 0.12], line: 0.018 });
    part(g, new THREE.CylinderGeometry(0.018, 0.018, 1.55, 5), '#e9dcb8', { pos: [1.75, 1.42, 0.6], noLine: true }); part(g, new THREE.TorusGeometry(0.34, 0.13, 8, 18), '#4a4646', { pos: [1.75, 0.56, 0.6], rot: [0, 0.5, 0], line: 0.02 }); }
  const bt = tex(128, 128, (c, w, h) => { c.fillStyle = '#fff6ea'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(226,80,106,.55)'; for (let i = 0; i < 4; i++) { c.fillRect(i * 32, 0, 16, h); c.fillRect(0, i * 32, w, 16); } });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.3), new THREE.MeshToonMaterial({ map: bt, gradientMap: RAMP })); m.rotation.set(-PI / 2, 0, 0.3); m.position.set(-28.9, 0.022, 5.5); m.receiveShadow = true; G.add(m);
    part(G, new THREE.CylinderGeometry(0.22, 0.26, 0.3, 10), '#d8b98a', { pos: [-27.6, 0.17, 6.3], line: 0.018 }); part(G, new THREE.TorusGeometry(0.2, 0.025, 5, 12, PI), '#a8693f', { pos: [-27.6, 0.32, 6.3], noLine: true }); }
  // 乾草堆（小馬愛躺）
  { const g = grp(-23.4, 1.0, 0.3); part(g, new THREE.CylinderGeometry(1.5, 1.6, 0.2, 14), '#ecd58a', { pos: [0, 0.1, 0.4], line: 0.02 }); part(g, new THREE.BoxGeometry(1.5, 0.75, 0.8), '#e6c66e', { pos: [0, 0.38, -0.8], line: 0.022 });
    [-0.3, 0.3].forEach(x => part(g, new THREE.BoxGeometry(0.06, 0.77, 0.82), '#c98a52', { pos: [x, 0.38, -0.8], noLine: true })); WALLS.push({ x: -23.4 - Math.sin(0.3) * 0.8, z: 1.0 - Math.cos(0.3) * 0.8, hx: 0.8, hz: 0.45, ry: 0.3 }); }

  // ---------- 北邊：敏捷訓練（隧道、兩個跳圈、一排繞桿） ----------
  const TUN = { x: -34.5, z: 2.6 };
  { const g = grp(TUN.x, TUN.z); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 2.8, 18, 1, true), mat('#f0a456', { extra: { side: THREE.DoubleSide } })); m.rotation.z = PI / 2; m.position.y = 0.62; m.castShadow = true; g.add(m);
    [-1.4, -0.47, 0.47, 1.4].forEach((x, i) => part(g, new THREE.TorusGeometry(0.68, 0.055, 6, 20), i % 3 ? '#fffaf0' : '#e2506a', { pos: [x, 0.62, 0], rot: [0, PI / 2, 0], noLine: true }));
    WALLS.push({ x: TUN.x, z: TUN.z - 0.7, hx: 1.4, hz: 0.12, ry: 0 }, { x: TUN.x, z: TUN.z + 0.7, hx: 1.4, hz: 0.12, ry: 0 }); }
  const HOOPS = [{ x: -39.6, z: 2.6, c: '#79b3e3' }, { x: -42.6, z: 2.6, c: '#f6d76a' }];
  HOOPS.forEach(h => { const g = grp(h.x, h.z); part(g, new THREE.TorusGeometry(0.62, 0.06, 7, 22), h.c, { pos: [0, 0.86, 0], rot: [0, PI / 2, 0], line: 0.018 });
    [-1, 1].forEach(a => { part(g, new THREE.CylinderGeometry(0.045, 0.055, 0.9, 6), '#fffaf0', { pos: [0, 0.45, 0.66 * a], line: 0.016 }); part(g, new THREE.BoxGeometry(0.5, 0.06, 0.12), '#c98a52', { pos: [0, 0.03, 0.66 * a], noLine: true }); ROUNDS.push({ x: h.x, z: h.z + 0.66 * a, r: 0.12 }); }); });
  const POLES = [0, 1, 2, 3, 4, 5].map(i => ({ x: -41.4 + i * 1.25, z: 5.9 }));
  batch(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 7), mat('#ffffff'), POLES.map((p, i) => ({ x: p.x, z: p.z, y: 0.5, col: i % 2 ? '#e2506a' : '#fffaf0' })), true);
  batch(sph(0.085, 8, 6), mat('#ffffff'), POLES.map((p, i) => ({ x: p.x, z: p.z, y: 1.03, col: i % 2 ? '#fffaf0' : '#e2506a' })), false); POLES.forEach(p => ROUNDS.push({ x: p.x, z: p.z, r: 0.1 }));

  // ---------- 西北角：狗屋、沙坑 ----------
  { const g = grp(-46.2, 1.9, 0.6);
    part(g, new THREE.BoxGeometry(1.7, 1.1, 1.5), '#f1dcb6', { pos: [0, 0.55, 0], line: 0.024 });
    part(g, new THREE.CylinderGeometry(0.02, 1.35, 0.8, 4), '#d9604a', { pos: [0, 1.5, 0], rot: [0, PI / 4, 0], scale: [1, 1, 0.95], line: 0.024 });
    part(g, new THREE.CylinderGeometry(0.4, 0.4, 0.04, 14, 1, false, 0, PI), '#5b4636', { pos: [0, 0.38, 0.755], rot: [PI / 2, PI / 2, 0], noLine: true, shadow: false });
    part(g, new THREE.BoxGeometry(0.8, 0.38, 0.04), '#5b4636', { pos: [0, 0.19, 0.755], noLine: true, shadow: false });
    WALLS.push({ x: -46.2, z: 1.9, hx: 0.95, hz: 0.85, ry: 0.6 }); }
  const SAND = { x: -45.3, z: 7.4, r: 1.9 };
  { disc(SAND.x, SAND.z, SAND.r, '#f3e2b0', 0.03); const logs = []; for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; logs.push({ x: SAND.x + Math.cos(a) * (SAND.r + 0.05), z: SAND.z + Math.sin(a) * (SAND.r + 0.05), y: 0.11, ry: -a, rx: PI / 2, sy: 0.74 }); }
    batch(new THREE.CylinderGeometry(0.12, 0.12, 1, 7), mat('#c98a52'), logs, true);
    part(G, sph(0.45, 12, 8), '#ecd69c', { pos: [SAND.x - 0.7, 0.02, SAND.z - 0.5], scale: [1, 0.5, 1], noLine: true }); part(G, sph(0.3, 10, 8), '#ecd69c', { pos: [SAND.x + 0.8, 0.02, SAND.z + 0.7], scale: [1, 0.45, 1], noLine: true });
    disc(SAND.x + 0.35, SAND.z - 0.75, 0.3, '#d9c488', 0.034);
    const bn = grp(SAND.x + 0.5, SAND.z + 0.1, 0.7); part(bn, new THREE.CylinderGeometry(0.045, 0.045, 0.42, 6), '#fffaf0', { pos: [0, 0.09, 0], rot: [0, 0, PI / 2], noLine: true }); [-1, 1].forEach(a => [-1, 1].forEach(c => part(bn, sph(0.065, 8, 6), '#fffaf0', { pos: [0.22 * a, 0.09, 0.045 * c], noLine: true })));
    part(G, new THREE.CylinderGeometry(0.17, 0.13, 0.26, 10), '#79b3e3', { pos: [SAND.x - 1.0, 0.16, SAND.z + 0.9], rot: [0.2, 0, 0.15], line: 0.016 }); }

  // ---------- 西邊：小山丘（寵物可以走上去） ----------
  const HILL = { x: -40.0, z: 11.4, R: 3.0, sy: 0.62, sz: 0.88, y: -0.75 };
  part(G, sph(HILL.R, 24, 14), '#c3d77c', { pos: [HILL.x, HILL.y, HILL.z], scale: [1, HILL.sy, HILL.sz], noLine: true });
  const H = (x, z) => { const dx = x - HILL.x, dz = (z - HILL.z) / HILL.sz, q = HILL.R * HILL.R - dx * dx - dz * dz; return q > 0 ? Math.max(0, HILL.y + HILL.sy * Math.sqrt(q)) : 0; };
  ROUNDS.push({ x: HILL.x, z: HILL.z, r: 2.6 });

  // ---------- 西南角：貓的角落（兩根貓跳台加一條吊橋、紙箱堆） ----------
  const CT = { x: -46.3, z: 15.9 };
  { const g = grp(CT.x, CT.z); const post = (x, z, h) => { part(g, new THREE.CylinderGeometry(0.62, 0.66, 0.14, 14), '#e9dcb8', { pos: [x, 0.07, z], line: 0.022 }); part(g, new THREE.CylinderGeometry(0.13, 0.13, h, 9), '#d8b98a', { pos: [x, h / 2 + 0.1, z], line: 0.02 }); };
    post(0, 0, 2.0); post(2.1, 0.5, 1.2);
    part(g, new THREE.CylinderGeometry(0.52, 0.52, 0.12, 14), '#f6b3c0', { pos: [0.25, 1.05, 0.1], line: 0.022 }); part(g, new THREE.CylinderGeometry(0.46, 0.46, 0.12, 14), '#bcd4ea', { pos: [-0.1, 2.12, -0.05], line: 0.022 });
    part(g, new THREE.CylinderGeometry(0.5, 0.5, 0.12, 14), '#f6d76a', { pos: [2.1, 1.34, 0.5], line: 0.022 });
    part(g, new THREE.BoxGeometry(1.55, 0.05, 0.36), '#c98a52', { pos: [1.2, 1.2, 0.3], rot: [0, -0.23, 0.18], line: 0.016 });
    part(g, sph(0.09, 8, 6), '#d9604a', { pos: [0.55, 0.72, 0.42], noLine: true }); part(g, new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), INK, { pos: [0.55, 0.86, 0.42], noLine: true, shadow: false });
    ROUNDS.push({ x: CT.x, z: CT.z, r: 0.66 }, { x: CT.x + 2.1, z: CT.z + 0.5, r: 0.66 }); }
  const BOX = [{ x: -42.4, z: 17.2, s: 1.0, ry: 0.3 }, { x: -41.1, z: 16.4, s: 0.8, ry: -0.4 }];
  BOX.forEach(q => { const g = grp(q.x, q.z, q.ry), s = q.s; [[0, -0.5, 0], [0, 0.5, 0], [-0.5, 0, PI / 2], [0.5, 0, PI / 2]].forEach(([x, z, ry]) => part(g, new THREE.BoxGeometry(1.0 * s, 0.6 * s, 0.045), '#d8b98a', { pos: [x * s, 0.3 * s, z * s], rot: [0, ry, 0], line: 0.016 }));
    part(g, new THREE.BoxGeometry(1.0 * s, 0.03, 1.0 * s), '#c9a877', { pos: [0, 0.03, 0], noLine: true }); part(g, new THREE.BoxGeometry(1.0 * s, 0.03, 0.45 * s), '#d8b98a', { pos: [0, 0.66 * s, -0.68 * s], rot: [0.75, 0, 0], line: 0.014 });
    ROUNDS.push({ x: q.x, z: q.z, r: 0.6 * s }); });

  // ---------- 南邊中間：戲水池（淺淺的，可以踩進去）、睡蓮、小黃鴨、旁邊幾顆曬太陽的平石頭 ----------
  const POND = { x: -34.0, z: 15.4, r: 2.3 };
  { const w = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 30), basic('#9fd0e6')); w.rotation.x = -PI / 2; w.position.set(POND.x, 0.03, POND.z); w.scale.set(1.15, 0.85, 1); G.add(w);
    const st = []; for (let i = 0; i < 22; i++) { const a = i / 22 * PI * 2; if (i % 11 === 3) continue; st.push({ x: POND.x + Math.cos(a) * POND.r * 1.18, z: POND.z + Math.sin(a) * POND.r * 0.88, y: 0.07, ry: a, sx: 0.9 + r() * 0.6, sy: 0.7 + r() * 0.5, sz: 0.9 + r() * 0.5 }); }
    batch(new THREE.DodecahedronGeometry(0.2, 0), mat('#e2ddd0'), st, true);
    [[-0.9, 0.5, 0.36], [0.7, -0.6, 0.3], [1.3, 0.5, 0.26]].forEach(([x, z, s]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(s, 14, 0.4, PI * 2 - 0.8), basic('#a9d08a')); m.rotation.x = -PI / 2; m.rotation.z = x * 3; m.position.set(POND.x + x, 0.04, POND.z + z); G.add(m); });
    part(G, sph(0.05, 8, 6), '#f6b3c0', { pos: [POND.x - 0.9, 0.08, POND.z + 0.5], noLine: true });
    const d = grp(POND.x + 0.2, POND.z + 0.2, 0.8); part(d, sph(0.15, 12, 8), '#f6d76a', { pos: [0, 0.12, 0], scale: [1, 0.8, 1.25], line: 0.014 }); part(d, sph(0.1, 10, 8), '#f6d76a', { pos: [0, 0.27, 0.12], line: 0.014 }); part(d, sph(0.04, 8, 6), '#f0a456', { pos: [0, 0.25, 0.23], scale: [1, 0.6, 1.3], noLine: true });
    ROUNDS.push({ x: POND.x, z: POND.z, r: 2.0 }); }
  const ROCKS = [{ x: -30.4, z: 16.7 }, { x: -37.9, z: 16.9 }, { x: -31.0, z: 13.3 }];
  batch(new THREE.DodecahedronGeometry(0.6, 1), mat('#ece4cf'), ROCKS.map((q, i) => ({ x: q.x, z: q.z, y: 0.06, ry: i * 1.3, sx: 1.15, sy: 0.3, sz: 0.95 })), true); ROCKS.forEach(q => ROUNDS.push({ x: q.x, z: q.z, r: 0.5 }));

  // ---------- 東南角：翹翹板、球池 ----------
  { const g = grp(-25.6, 16.2, 0.5); part(g, new THREE.CylinderGeometry(0.2, 0.28, 0.42, 8), '#c98a52', { pos: [0, 0.21, 0], line: 0.02 });
    part(g, new THREE.BoxGeometry(3.2, 0.08, 0.5), '#f6b3c0', { pos: [0, 0.48, 0], rot: [0, 0, 0.2], line: 0.02 });
    [-1, 1].forEach(a => part(g, new THREE.TorusGeometry(0.13, 0.025, 5, 12, PI), '#fffaf0', { pos: [1.15 * a, 0.52 + 0.23 * a, 0], rot: [0, PI / 2, 0], noLine: true }));
    WALLS.push({ x: -25.6, z: 16.2, hx: 1.6, hz: 0.3, ry: 0.5 }); }
  const PIT = { x: -24.4, z: 12.6, r: 1.45 };
  { part(G, new THREE.TorusGeometry(PIT.r, 0.2, 8, 26), '#bcd4ea', { pos: [PIT.x, 0.2, PIT.z], rot: [PI / 2, 0, 0], line: 0.022 }); disc(PIT.x, PIT.z, PIT.r, '#fffaf0', 0.03);
    const C = ['#e2506a', '#f6d76a', '#79b3e3', '#a9d9b0', '#cdb6ee', '#f0a456'], bs = []; for (let i = 0; i < 46; i++) { const a = r() * PI * 2, d = Math.sqrt(r()) * (PIT.r - 0.22); bs.push({ x: PIT.x + Math.cos(a) * d, z: PIT.z + Math.sin(a) * d, y: 0.13 + r() * 0.1, col: C[i % C.length] }); }
    batch(sph(0.13, 10, 7), mat('#ffffff'), bs, false); ROUNDS.push({ x: PIT.x, z: PIT.z, r: PIT.r + 0.1 }); }

  // ---------- 柵欄邊的矮樹叢和花 ----------
  { const bush = [], fl = [], FC = ['#f6b3c0', '#fffaf0', '#f6d76a', '#cdb6ee'];
    [[X0 + 1.0, Z1 - 1.0], [X0 + 1.1, Z0 + 5.2], [X1 - 1.0, Z1 - 1.0], [X1 - 1.0, Z0 + 4.6], [-38, Z1 - 0.8], [-30, Z0 + 0.8], [X0 + 0.9, 11.5]].forEach(([x, z]) => { for (let i = 0; i < 3; i++) bush.push({ x: x + (r() - 0.5) * 1.3, z: z + (r() - 0.5) * 1.0, y: 0.28, s: 0.75 + r() * 0.5, sy: 0.6 + r() * 0.2, col: i % 2 ? '#a9c267' : '#b9d26c' }); });
    for (let i = 0; i < 70; i++) { const e = i % 4, x = e < 2 ? X0 + 0.7 + r() * (X1 - X0 - 1.4) : e === 2 ? X0 + 0.5 + r() * 0.5 : X1 - 0.5 - r() * 0.5, z = e === 0 ? Z0 + 0.4 + r() * 0.5 : e === 1 ? Z1 - 0.4 - r() * 0.5 : Z0 + 0.7 + r() * (Z1 - Z0 - 1.4);
      if (x > X1 - 1.2 && z > GZ0 - 0.5 && z < GZ1 + 0.5) continue; fl.push({ x, z, y: 0.12 + r() * 0.08, s: 0.7 + r() * 0.6, col: FC[i % FC.length] }); }
    for (let i = 0; i < 12; i++) { const a = r() * PI * 2, d = r() * 2.1; fl.push({ x: HILL.x + Math.cos(a) * d, z: HILL.z + Math.sin(a) * d * HILL.sz, y: 0, s: 0.7 + r() * 0.4, col: FC[i % FC.length] }); }
    fl.forEach(f => { if (!f.y) f.y = H(f.x, f.z) + 0.06; });
    batch(sph(0.55, 12, 8), mat('#ffffff'), bush, true); batch(sph(0.09, 7, 5), mat('#ffffff'), fl, false); }

  // ---------- 可以踢的球（寵物跑過去會踢走）：位置由 60-play.js 的 tickLawn 動 ----------
  const BALLS = [[-31.5, 8.6, 0.22, '#e2506a'], [-36.2, 9.4, 0.26, '#79b3e3'], [-43.4, 13.4, 0.3, '#f6b3c0'], [-28.6, 13.4, 0.2, '#f6d76a']].map(([x, z, rad, c]) => { const m = part(G, sph(rad, 14, 10), c, { pos: [x, rad, z], line: 0.02 });
    part(m, new THREE.TorusGeometry(rad, rad * 0.16, 6, 16), '#fffaf0', { rot: [0.5, 0.3, 0], noLine: true, shadow: false }); return { m, r: rad, x, z, vx: 0, vz: 0 }; });

  // ---------- 睡覺的位置：24 個，散在各處。cush＝有寵物睡才放一個墊子；small＝小馬上不去，改睡旁邊地上（alt） ----------
  const BC = ['#f6b3c0', '#bcd4ea', '#f6d76a', '#cdb6ee', '#a9d9b0', '#f3c19a'];
  const BEDS = [
    { x: -29.6, z: 5.1, f: 0.6 }, { x: HILL.x - 0.6, z: HILL.z + 1.2, f: 0.4 }, { x: -30.4, z: 16.7, y: 0.24, f: -0.5 }, { x: -45.0, z: 3.9, f: 0.9, cush: 1 },
    { x: CT.x + 0.25, z: CT.z + 0.1, y: 1.11, f: 0.8, small: 1, alt: { x: CT.x + 1.0, z: CT.z - 1.3 } }, { x: -23.9, z: 1.5, y: 0.2, f: 0.6 }, { x: -28.2, z: 5.2, f: -0.4 }, { x: BOX[0].x, z: BOX[0].z, y: 0.05, f: 0.3, small: 1, alt: { x: BOX[0].x + 0.4, z: BOX[0].z - 1.4 } },
    { x: -37.9, z: 16.9, y: 0.24, f: 0.5 }, { x: SAND.x - 0.2, z: SAND.z + 0.5, f: 1.2 }, { x: -32.4, z: 0.6, f: 0.2, cush: 1 }, { x: HILL.x + 1.3, z: HILL.z + 0.5, f: 1.1 },
    { x: -29.5, z: 6.3, f: 1.0 }, { x: -31.0, z: 13.3, y: 0.24, f: 2.2 }, { x: CT.x + 2.1, z: CT.z + 0.5, y: 1.4, f: -0.3, small: 1, alt: { x: CT.x + 3.2, z: CT.z - 0.6 } }, { x: -22.9, z: 1.7, y: 0.2, f: -0.2 },
    { x: -47.4, z: 4.3, f: 0.6, cush: 1 }, { x: -28.1, z: 6.2, f: 0.1 }, { x: BOX[1].x, z: BOX[1].z, y: 0.05, f: -0.4, small: 1, alt: { x: BOX[1].x + 1.2, z: BOX[1].z - 0.6 } }, { x: -47.6, z: 12.6, f: 1.4, cush: 1 },
    { x: SAND.x + 0.9, z: SAND.z - 0.4, f: 0.4 }, { x: -37.0, z: 0.5, f: 0.1, cush: 1 }, { x: -22.6, z: 17.4, f: -0.8, cush: 1 }, { x: -28.6, z: 17.6, f: 0, cush: 1 }];
  BEDS.forEach((q, i) => { if (!q.y) q.y = H(q.x, q.z); if (q.alt) Object.assign(q.alt, { y: 0, f: q.f, cush: 1, col: BC[i % BC.length] }); q.col = BC[i % BC.length]; });
  const cushion = (q) => { const g = new THREE.Group(); g.position.set(q.x, 0, q.z); part(g, new THREE.CylinderGeometry(0.5, 0.55, 0.14, 14), q.col, { pos: [0, 0.07, 0], line: 0.018 }); part(g, sph(0.4, 12, 8), '#fffaf0', { pos: [0, 0.13, 0], scale: [1, 0.2, 1], noLine: true }); G.add(g); return g; };
  // 寵物在草坪上可以做的事：每一項是一串要走過去的點（hop＝到那一點跳一下；kick＝踢第幾顆球）；small＝小馬不去
  const zig = POLES.map((p, i) => ({ x: p.x, z: p.z + (i % 2 ? 0.55 : -0.55) }));
  const PLAY = [
    { small: 1, pts: [{ x: TUN.x + 2.2, z: TUN.z }, { x: TUN.x - 2.2, z: TUN.z, run: 1 }] }, { small: 1, pts: [{ x: TUN.x - 2.2, z: TUN.z }, { x: TUN.x + 2.2, z: TUN.z, run: 1 }] },
    { pts: [{ x: HOOPS[0].x + 1.5, z: HOOPS[0].z }, { x: HOOPS[0].x - 0.2, z: HOOPS[0].z, run: 1, hop: 1 }, { x: HOOPS[1].x + 1.3, z: HOOPS[1].z, run: 1 }, { x: HOOPS[1].x - 0.2, z: HOOPS[1].z, run: 1, hop: 1 }, { x: HOOPS[1].x - 1.6, z: HOOPS[1].z + 0.6, run: 1 }] },
    { pts: [{ x: zig[0].x - 1.2, z: POLES[0].z }].concat(zig.map(p => ({ x: p.x, z: p.z, run: 1 })), [{ x: zig[5].x + 1.2, z: POLES[0].z, run: 1 }]) },
    { pts: [{ x: HILL.x, z: HILL.z, hop: 1, stay: 4 }] }, { pts: [{ x: HILL.x + 0.9, z: HILL.z - 0.5, stay: 5 }] },
    { pts: [{ x: SAND.x + 0.35, z: SAND.z - 0.75, hop: 1, stay: 3 }] }, { pts: [{ x: SAND.x - 0.5, z: SAND.z + 0.6, stay: 4 }] },
    { pts: [{ x: POND.x - 1.2, z: POND.z - 0.6, hop: 1 }, { x: POND.x + 1.2, z: POND.z + 0.4, stay: 3 }] }, { pts: [{ x: POND.x + 1.7, z: POND.z - 0.9, stay: 4 }] },
    { small: 1, pts: [{ x: PIT.x - 2.0, z: PIT.z }, { x: PIT.x - 0.3, z: PIT.z + 0.1, run: 1, hop: 1, stay: 4 }] },
    { small: 1, pts: [{ x: BOX[1].x + 1.1, z: BOX[1].z - 0.9 }, { x: BOX[1].x, z: BOX[1].z, hop: 1, stay: 5 }] },
    { pts: [{ x: -27.4, z: 4.2, stay: 4 }] }, { pts: [{ x: -26.6, z: 15.0, hop: 1, stay: 2 }] },
    { kick: 0 }, { kick: 1 }, { kick: 2 }, { kick: 3 }, { kick: 0 }, { kick: 1 }];
  return { G, BEDS, bed: (i) => BEDS[((i | 0) % BEDS.length + BEDS.length) % BEDS.length], cushion, H, PLAY, BALLS, has: (x, z) => x > X0 - 0.6 && x < X1 + 0.6 && z > Z0 - 0.6 && z < Z1 + 0.6,
    IN: { x0: X0 + 1.6, x1: X1 - 1.4, z0: Z0 + 1.6, z1: Z1 - 1.6 }, NPC: { x: X1 + 1.3, z: GZ0 - 1.0, f: 1.15, y: 2.75 }, GATE: { x: X1, z: (GZ0 + GZ1) / 2 } };
}
