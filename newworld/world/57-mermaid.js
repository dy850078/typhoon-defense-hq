// ===== 黑潮人魚的模型（照 ZS 畫的設定圖建的）=====
// 單位是公尺，她面向 +z；設定圖上看到的「畫面右邊」是 +x。臉上的五官和音符是從設定圖剪下來的（newworld/assets/src/build_mermaid.py）。
// 頭髮、尾巴、尾鰭都是「沿著一條曲線、會慢慢變細的管子」，每一格重新算形狀，所以會飄、會甩。
function buildMermaid(g, H) {
  const { GEO, bm, flat, mesh } = H, V = (x, y, z) => new THREE.Vector3(x, y, z), b = new THREE.Group(); g.add(b);
  const HAIR = '#1a1b38', HAIR2 = '#2b418f', SKIN = '#f9dab4', PEARL = '#fbf6ea', PINK = '#dfa6c4', PINK2 = '#f0c4d8', FINC = '#353b62';
  const SK = () => new THREE.MeshToonMaterial({ color: '#ffe3c6', gradientMap: RAMP }), TL = new THREE.TextureLoader(), tex = (n) => { const t = TL.load('/nw-art/' + n); t.colorSpace = THREE.SRGBColorSpace; return t; };
  // ---- 沿曲線的管子：pts 控制點、rad(t) 回傳 [薄的半徑, 寬的半徑]、ref 是「薄的那一面朝哪裡」----
  const tube = (parent, col, pts, rad, o = {}) => { const n = o.n || 18, m = o.m || 8, cnt = (n + 1) * (m + 1), pos = new Float32Array(cnt * 3), nor = new Float32Array(cnt * 3), uv = new Float32Array(cnt * 2), idx = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const a = i * (m + 1) + j, c = a + m + 1; idx.push(a, a + 1, c, a + 1, c + 1, c); }
    for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) { uv[(i * (m + 1) + j) * 2] = j / m; uv[(i * (m + 1) + j) * 2 + 1] = 1 - i / n; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    const ref = o.ref || V(0, 0, 1), T = V(), B = V(), N = V(), P = V(), curve = new THREE.CatmullRomCurve3(pts.map(p => p.clone()), false, 'catmullrom', 0.5);
    const me = part(parent, geo, col, o); me.frustumCulled = false; if (me.children[0]) me.children[0].frustumCulled = false; me.pts = curve.points; me.base = pts.map(p => p.clone());
    me.update = () => { for (let i = 0; i <= n; i++) { const t = i / n; curve.getPoint(t, P); curve.getTangent(t, T); B.crossVectors(T, ref).normalize(); N.crossVectors(B, T).normalize(); const r = rad(t), ra = Math.max(0.002, r[0]), rb = Math.max(0.002, r[1]);
      for (let j = 0; j <= m; j++) { const a = j / m * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), k = (i * (m + 1) + j) * 3; pos[k] = P.x + N.x * ca * ra + B.x * sa * rb; pos[k + 1] = P.y + N.y * ca * ra + B.y * sa * rb; pos[k + 2] = P.z + N.z * ca * ra + B.z * sa * rb;
        let nx = N.x * ca / ra + B.x * sa / rb, ny = N.y * ca / ra + B.y * sa / rb, nz = N.z * ca / ra + B.z * sa / rb; const l = Math.hypot(nx, ny, nz) || 1; nor[k] = nx / l; nor[k + 1] = ny / l; nor[k + 2] = nz / l; } }
      geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; }; me.update(); return me; };
  const leaf = (t, p = 0.6) => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), p);   // 兩頭尖、中間寬

  // ---- 頭和臉 ----
  const HC = V(0, 2.99, 0), HR = 0.365, hd = new THREE.Group(); b.add(hd); hd.position.copy(HC);
  part(hd, sph(HR, 28, 20), SKIN, { scale: [1, 1.02, 0.97], mat: SK() });
  { const fg = new THREE.SphereGeometry(HR * 1.012, 28, 20, Math.PI / 2 - 1.15, 2.3, 0.35, 2.0), p = fg.attributes.position, u = fg.attributes.uv, FW = 0.828, FH = 0.687;   // 五官照正面平貼上去（不是繞著球貼），從正面看才跟設定圖一樣
    for (let i = 0; i < p.count; i++) u.setXY(i, (p.getX(i) - 0.01) / FW + 0.5, (p.getY(i) * 1.02 + 0.06) / FH + 0.5);
    const f = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: tex('mermaid-face.png'), transparent: true, depthWrite: false })); f.scale.set(1, 1.02, 0.97); hd.add(f); }
  // ---- 頭髮 ----
  part(hd, sph(0.5, 24, 18), HAIR, { pos: [0.03, 0.16, -0.2], scale: [1, 1, 0.98] });   // 包住頭頂和後腦的一大團
  const strands = [], hair = (pts, w, th, col, o = {}) => { const s = tube(b, col || HAIR, pts, (t) => { const k = Math.pow(1 - t, o.p || 0.55) * (0.55 + 0.45 * Math.min(1, t * 5)); return [th * k, w * k]; }, Object.assign({ n: 20, m: 8, ref: V(0, 0, 1) }, o)); s.amp = o.amp === undefined ? 1 : o.amp; s.ph = strands.length * 1.7; strands.push(s); return s; };
  // 瀏海：中分，往兩邊順著額頭下來
  hair([V(0.0, 3.52, 0.16), V(-0.2, 3.44, 0.3), V(-0.4, 3.2, 0.24), V(-0.46, 2.9, 0.12)], 0.14, 0.05, HAIR, { amp: 0.15, ref: V(-0.5, 0.2, 1) });
  hair([V(0.05, 3.52, 0.16), V(0.26, 3.44, 0.28), V(0.44, 3.2, 0.2), V(0.48, 2.9, 0.1)], 0.14, 0.05, HAIR, { amp: 0.15, ref: V(0.5, 0.2, 1) });
  // 臉旁邊垂到胸前的髮束，各夾一束藍色挑染
  [-1, 1].forEach(k => { hair([V(0.46 * k, 3.05, 0.04), V(0.49 * k, 2.7, 0.1), V(0.48 * k, 2.35, 0.1), V(0.5 * k, 2.02, 0.06)], 0.11, 0.07, HAIR, { amp: 0.4 });
    hair([V(0.4 * k, 3.0, 0.16), V(0.42 * k, 2.65, 0.2), V(0.42 * k, 2.3, 0.18), V(0.44 * k, 1.95, 0.12)], 0.045, 0.035, HAIR2, { amp: 0.4, noLine: true }); });
  // 背後的長髮：畫面左邊三束收得比較近，中間兩束垂到尾巴，畫面右邊五束被水帶著往旁邊飄，髮尾微微捲起來
  [[[-0.42, 3.0, -0.1], [-0.64, 2.6, -0.06], [-0.86, 2.15, -0.06], [-0.72, 1.85, 0.0], [-0.5, 1.72, 0.04]], [[-0.38, 2.9, -0.2], [-0.58, 2.45, -0.2], [-0.7, 2.05, -0.18], [-0.56, 1.8, -0.12], [-0.42, 1.9, -0.08]], [[-0.3, 2.9, -0.3], [-0.42, 2.4, -0.32], [-0.5, 1.95, -0.3], [-0.38, 1.6, -0.25]],
    [[-0.12, 2.9, -0.4], [-0.15, 2.3, -0.42], [-0.2, 1.7, -0.4], [-0.12, 1.3, -0.35]], [[0.1, 2.9, -0.42], [0.12, 2.3, -0.45], [0.2, 1.7, -0.42], [0.3, 1.25, -0.36]],
    [[0.45, 3.0, -0.1], [0.78, 2.72, -0.15], [1.25, 2.5, -0.25], [1.55, 2.15, -0.3], [1.6, 1.9, -0.28], [1.84, 1.84, -0.25]], [[0.42, 2.9, -0.2], [0.7, 2.5, -0.25], [1.1, 2.2, -0.33], [1.4, 1.85, -0.35], [1.5, 1.6, -0.3], [1.7, 1.62, -0.28]],
    [[0.38, 2.85, -0.28], [0.6, 2.35, -0.32], [0.9, 1.95, -0.38], [1.15, 1.6, -0.38], [1.3, 1.42, -0.33]], [[0.3, 2.85, -0.35], [0.48, 2.3, -0.38], [0.7, 1.8, -0.42], [0.85, 1.45, -0.4], [0.78, 1.25, -0.35]], [[0.25, 2.9, -0.4], [0.35, 2.3, -0.42], [0.5, 1.75, -0.44], [0.55, 1.3, -0.4]],
  ].forEach((q, n) => hair(q.map(p => V(p[0], p[1], p[2])), 0.3, 0.13, n === 6 ? HAIR : HAIR, { n: 24, line: 0.022 }));
  hair([V(0.4, 2.95, -0.16), V(0.72, 2.6, -0.16), V(1.15, 2.33, -0.24), V(1.45, 2.0, -0.26)], 0.05, 0.03, HAIR2, { noLine: true }); hair([V(-0.36, 2.95, -0.12), V(-0.56, 2.5, -0.1), V(-0.7, 2.1, -0.1)], 0.05, 0.03, HAIR2, { noLine: true });
  for (let i = 0; i < 18; i++) { const s = strands[6 + (i % 10)], t = 0.25 + (i * 0.37) % 0.6, p = new THREE.CatmullRomCurve3(s.base).getPoint(t); const d = new THREE.Mesh(GEO.sph, basic('#c9dcff')); d.scale.setScalar(0.012 + (i % 3) * 0.006); d.position.set(p.x + Math.sin(i * 5) * 0.08, p.y + Math.cos(i * 3) * 0.08, p.z + 0.14); b.add(d); }   // 頭髮上的星點
  // ---- 髮飾：一串大小不一的珍珠斜斜橫過頭頂，畫面右邊一顆粉紅扇貝 ----
  const shell = (pa, px, py, pz, sc, rz, ry = 0) => { const sg = new THREE.Group(); pa.add(sg); sg.position.set(px, py, pz); sg.rotation.set(0, ry, rz); sg.scale.setScalar(sc); for (let r = -3; r <= 3; r++) part(sg, sph(0.1, 8, 6), r % 2 ? PINK2 : PINK, { pos: [r * 0.04, 0.05 - Math.abs(r) * 0.012, -Math.abs(r) * 0.006], scale: [0.36, 1.15 - Math.abs(r) * 0.11, 0.3], rot: [0, 0, -r * 0.27], noLine: true, shadow: false }); part(sg, sph(0.05, 8, 6), PINK, { pos: [0, -0.05, 0], scale: [1.3, 0.7, 0.5], noLine: true }); return sg; };
  { const C = V(0.03, 0.16, -0.2), R = 0.55, pe = (a, e, r, col) => part(hd, sph(r * 1.35, 10, 8), col || PEARL, { pos: [C.x + Math.sin(a) * Math.cos(e) * R, C.y + Math.sin(e) * R, C.z + Math.cos(a) * Math.cos(e) * R], noLine: true, shadow: false, mat: new THREE.MeshToonMaterial({ color: col || PEARL }) });
    [[-0.95, 0.42, 0.05], [-0.8, 0.5, 0.036], [-0.62, 0.52, 0.06], [-0.45, 0.5, 0.034], [-0.3, 0.47, 0.045], [-0.14, 0.46, 0.032, '#f2b8b0'], [0.0, 0.47, 0.04], [0.14, 0.5, 0.03], [0.5, 0.52, 0.034], [0.62, 0.48, 0.048], [0.2, 0.38, 0.03], [0.3, 0.3, 0.034], [0.42, 0.24, 0.05], [0.78, 0.42, 0.04], [-1.05, 0.5, 0.036]].forEach(q => pe(q[0], q[1], q[2], q[3]));
    shell(hd, C.x + Math.sin(0.33) * Math.cos(0.56) * R, C.y + Math.sin(0.56) * R + 0.03, C.z + Math.cos(0.33) * Math.cos(0.56) * R + 0.02, 0.9, -0.35, 0.3); }
  // ---- 身體：脖子、肩膀、胸、腰 ----
  const prof = (ks) => (t) => { const x = t * (ks.length - 1), i = Math.min(ks.length - 2, x | 0), f = x - i, s = f * f * (3 - 2 * f); return [ks[i][0] + (ks[i + 1][0] - ks[i][0]) * s, ks[i][1] + (ks[i + 1][1] - ks[i][1]) * s]; };
  tube(b, SKIN, [V(0, 2.72, 0), V(0, 2.56, 0), V(0, 2.4, 0.01), V(0, 2.2, 0.02), V(0, 2.02, 0.01), V(0, 1.86, 0)], prof([[0.07, 0.075], [0.075, 0.08], [0.12, 0.26], [0.145, 0.22], [0.12, 0.17], [0.17, 0.25]]), { n: 20, m: 12, mat: SK() });
  [-1, 1].forEach(k => shell(b, 0.105 * k, 2.2, 0.15, 1.0, 0.22 * k, 0.25 * k));
  for (let i = -5; i <= 5; i++) part(b, sph(i === 0 ? 0.034 : 0.026, 8, 6), PEARL, { pos: [i * 0.036, 2.5 - Math.cos(i * 0.31) * 0.1, 0.105 + Math.cos(i * 0.31) * 0.03], noLine: true, shadow: false, mat: new THREE.MeshToonMaterial({ color: PEARL }) });
  // 手：她的右手（畫面左邊）彎起來按在胸口，左手自然垂在身邊、手掌微微張開
  const arm = (pts, hand) => { tube(b, SKIN, pts, prof([[0.06, 0.065], [0.055, 0.058], [0.048, 0.05], [0.042, 0.045]]), { n: 14, m: 8, line: 0.02, mat: SK() }); part(b, sph(0.06, 10, 8), SKIN, { pos: hand.p, scale: hand.s, rot: hand.r, line: 0.02, mat: SK() }); };
  arm([V(-0.25, 2.47, 0), V(-0.4, 2.25, 0.02), V(-0.5, 2.06, 0.08), V(-0.34, 2.14, 0.2), V(-0.16, 2.28, 0.24)], { p: [-0.1, 2.32, 0.24], s: [1.25, 0.8, 0.5], r: [0, 0, 0.6] });
  arm([V(0.25, 2.47, 0), V(0.37, 2.2, 0), V(0.5, 1.95, 0.03), V(0.66, 1.7, 0.08), V(0.74, 1.56, 0.1)], { p: [0.78, 1.47, 0.11], s: [0.75, 1.3, 0.5], r: [0, 0, 0.45] });
  // ---- 尾巴：從紫漸層到青綠，一段一段的色帶，中間一排發亮的鱗片 ----
  const tcv = document.createElement('canvas'); tcv.width = 64; tcv.height = 256; { const x = tcv.getContext('2d'), cols = ['#43317f', '#3d3480', '#373c80', '#32497f', '#2f577d', '#2d647a', '#2c7076', '#2a6a6c', '#27585c'];
    cols.forEach((c, i) => { x.fillStyle = c; x.fillRect(0, i * 256 / cols.length, 64, 256 / cols.length + 1); }); x.strokeStyle = 'rgba(150,230,225,0.75)'; x.lineWidth = 1.4; for (let i = 0; i < 9; i++) for (let k = 0; k < 2; k++) { const cx = 18 + k * 5 + (i % 2) * 2, cy = 50 + i * 15 + k * 6; x.beginPath(); x.moveTo(cx - 2.2, cy - 3); x.lineTo(cx, cy + 2); x.lineTo(cx + 2.2, cy - 3); x.stroke(); } }
  const tt = new THREE.CanvasTexture(tcv); tt.colorSpace = THREE.SRGBColorSpace;
  const TP = [V(0, 1.98, 0), V(0, 1.6, 0.03), V(-0.03, 1.15, 0.03), V(0.0, 0.72, 0.0), V(0.14, 0.42, -0.04), V(0.42, 0.3, -0.06), V(0.62, 0.36, -0.06)];
  const tail = tube(b, '#3d3480', TP, prof([[0.2, 0.25], [0.3, 0.38], [0.28, 0.36], [0.24, 0.3], [0.19, 0.23], [0.12, 0.14], [0.07, 0.08], [0.04, 0.05]]), { n: 30, m: 14, mat: new THREE.MeshToonMaterial({ map: tt, gradientMap: RAMP }) });
  tail.geometry.attributes.uv.array.forEach((v, i, arr) => { if (!(i % 2)) arr[i] = (v + 0.5) % 1; });   // 鱗片轉到正面
  const waist = []; for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; waist.push(part(b, sph(0.075, 8, 6), '#43317f', { pos: [Math.sin(a) * 0.235, 1.94, Math.cos(a) * 0.185], scale: [1, 0.9, 0.7], noLine: true })); }
  // 尾鰭：五片深色半透明的長鰭，從尾巴末端像扇子一樣往畫面右上方張開
  const finM = () => new THREE.MeshToonMaterial({ color: FINC, gradientMap: RAMP, transparent: true, opacity: 0.86, side: THREE.DoubleSide }), fins = [[1.2, 1.25, 0.24, 0.06], [0.9, 1.55, 0.27, -0.04], [0.58, 1.75, 0.29, 0.05], [0.26, 1.6, 0.27, -0.05], [-0.05, 1.2, 0.22, 0.04], [-0.4, 0.75, 0.16, -0.03]].map((q, n) => {
    const f = tube(b, FINC, [V(0, 0, 0), V(0.3, 0.1, 0), V(0.6, 0.0, 0), V(1, 0.05, 0)], (t) => [0.012 + 0.012 * leaf(t), q[2] * leaf(t * 0.94 + 0.06, 0.75)], { n: 14, m: 6, ref: V(0, 0, 1), mat: finM(), noLine: true }); f.q = q; f.n = n; return f; });
  // ---- 黑潮、音符、影子 ----
  const sh = flat(mesh(GEO.disc, bm('#3a2f20', 0.16), g)); sh.position.y = 0.04; sh.scale.set(1.1, 0.8, 1);
  const notes = [0, 1, 2, 3, 4].map(n => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(n % 2 ? 'mermaid-note2.png' : 'mermaid-note1.png'), transparent: true, depthWrite: false })); sp.visible = false; g.add(sp); sp.ph = n / 5; sp.sx = (n % 2 ? 1 : -1) * (0.9 + (n % 3) * 0.25); return sp; });
  const tide = new THREE.Group(); g.add(tide); const tm = new THREE.MeshBasicMaterial({ color: '#1b2244', transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false }), tm2 = new THREE.MeshBasicMaterial({ color: '#3a4f8f', transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
  const rings = [[1.95, 0.22, 3.6, 0.2, 0, 1], [1.7, 0.16, 2.6, -0.24, 2.2, 1.3], [2.2, 0.14, 2.9, 0.1, 4.1, 0.8], [1.5, 0.11, 2.2, 0.3, 1.1, 1.6], [2.35, 0.09, 2.0, -0.12, 5.2, 0.9]].map((q, n) => { const o = new THREE.Group(); tide.add(o); o.rotation.x = q[3]; const r = new THREE.Mesh(new THREE.TorusGeometry(q[0], q[1], 6, 40, q[2]), n % 2 ? tm2 : tm); r.rotation.x = Math.PI / 2; r.scale.z = 0.3; o.add(r); o.sp = q[5]; o.a0 = q[4];
    for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(GEO.sph, basic('#bfe9ff')); d.scale.setScalar(0.035 + (i % 2) * 0.02); const a = q[2] * (i + 0.5) / 4; d.position.set(Math.cos(a) * (q[0] + 0.12), (i % 2 ? 0.14 : -0.1), -Math.sin(a) * (q[0] + 0.12)); o.add(d); } return o; });
  const aura = flat(mesh(GEO.disc, bm('#171b38', 0.3), g)); aura.position.y = 0.06; aura.scale.setScalar(2.4);
  const E = new THREE.Euler(), Q = new THREE.Quaternion(), D = V(), TA = V(); let amp = 1;
  g.anim = (m, t) => { const dry = m.fl & 2048, guard = m.fl & 8192, cast = m.castT > 0; aura.visible = tide.visible = !!guard; rings.forEach(o => { o.rotation.y = o.a0 + t * o.sp; }); tide.position.y = 1.5 + Math.sin(t * 1.1) * 0.12; amp += ((dry ? 0.5 : 1) - amp) * 0.1; const tt2 = dry ? t * 5 : t;
    b.position.y += ((dry ? 0.45 : 0.3 + Math.sin(t * 1.1) * 0.14) - b.position.y) * 0.1; b.rotation.x += ((dry ? 1.35 : 0) - b.rotation.x) * 0.12; b.rotation.z = Math.sin(t * 0.7) * 0.03; b.rotation.y = Math.sin(t * 0.5) * 0.06; sh.visible = !dry; hd.rotation.z = 0.08 + Math.sin(t * 0.8) * 0.03; hd.rotation.x = cast ? -0.12 : 0;
    // 尾巴：越下面擺得越多；尾鰭跟著尾巴末端
    tail.pts.forEach((p, i) => { const o = tail.base[i], w = Math.pow(i / (TP.length - 1), 1.6) * amp; p.set(o.x + Math.sin(tt2 * 1.1 - i * 0.5) * 0.1 * w, o.y, o.z + Math.sin(tt2 * 1.5 - i * 0.6) * 0.3 * w); }); tail.update();
    const end = tail.pts[TP.length - 1], pre = tail.pts[TP.length - 2]; TA.subVectors(end, pre).normalize();
    fins.forEach(f => { const a = f.q[0] + Math.sin(tt2 * 1.3 + f.n) * 0.07 * amp, L = f.q[1]; f.position.copy(end); f.pts.forEach((p, i) => { const s = i / 3; p.set(Math.cos(a) * L * s - Math.sin(a) * Math.sin(s * 3 + f.n) * 0.09 * L, Math.sin(a) * L * s + Math.cos(a) * Math.sin(s * 3 + f.n) * 0.09 * L, f.q[3] * 3 * s + TA.z * s * 0.5 + Math.sin(tt2 * 1.7 - s * 3 + f.n) * 0.12 * s * amp); }); f.update(); });
    // 頭髮：髮根不動，越靠髮尾飄得越多
    strands.forEach(s => { s.pts.forEach((p, i) => { const o = s.base[i], w = Math.pow(i / (s.base.length - 1), 1.5) * s.amp * amp; p.set(o.x + Math.sin(tt2 * 0.9 + s.ph - i * 0.7) * 0.06 * w, o.y + Math.sin(tt2 * 1.2 + s.ph - i * 0.6) * 0.05 * w, o.z + Math.cos(tt2 * 0.8 + s.ph - i * 0.5) * 0.08 * w); }); s.update(); });
    notes.forEach((sp, n) => { const on = !dry && (cast || n < 2), q = (t * (cast ? 0.55 : 0.32) + sp.ph) % 1; sp.visible = on; if (!on) return; const s = 0.36 * Math.min(1, q * 5) * (cast ? 1.25 : 1); sp.scale.set(s * (n % 2 ? 0.85 : 1), s, 1); sp.position.set(sp.sx + Math.sin(q * 6 + n) * 0.15, 3.0 + q * 1.5, 0.3); sp.material.opacity = Math.min(1, (1 - q) * 3); sp.material.rotation = Math.sin(q * 5 + n) * 0.25; }); };
}
