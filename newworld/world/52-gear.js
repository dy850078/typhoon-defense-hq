// ---- 裝備穿在標準人物身上（階段一第二批）----
// 每件裝備是一個小函式，用現成的積木（球、旋轉體、擠出的平面形狀）拼出來，掛在骨頭上跟著動作走。
// 之後要換成美術做的模型，只要把那一件的函式換掉；id 跟總部（shared/gear.js）同一份。
//   GEAR3.apply(c, equip)   equip = { outfit, head, cape, weapon }，沒有 3D 樣子的 id 會被略過
//   GEAR3.has(id)           這件有沒有 3D 樣子
const GEAR3 = (() => {
  if (typeof STD === 'undefined' || !STD) return null;
  const GC = {}, geo = (k, f) => GC[k] || (GC[k] = f());
  const SLOTS = ['outfit', 'head', 'cape', 'weapon'];
  const PINK = '#ff9fc6', ROSE = '#ff7fae', GOLD = '#ffd23f', LAV = '#c9a3f0', WHITE = '#ffffff';
  const ball = (a = 14, b = 10) => geo('ball' + a + b, () => sph(1, a, b));
  // 平面形狀擠出一點厚度（翅膀、星星、愛心）
  const ext = (k, shape, d = 0.05) => geo(k, () => { const g = new THREE.ExtrudeGeometry(shape(), { depth: d, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 12 }); g.translate(0, 0, -d / 2); return g; });
  const starShape = (R) => () => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? R * 0.46 : R; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); return s; };
  const heartShape = (s) => () => { const h = new THREE.Shape(); h.moveTo(0, -s); h.bezierCurveTo(-s * 1.6, 0, -s, s * 1.3, 0, s * 0.4); h.bezierCurveTo(s, s * 1.3, s * 1.6, 0, 0, -s); return h; };
  const tube = (k, pts, r) => geo(k, () => new THREE.TubeGeometry(new THREE.CubicBezierCurve3(...pts.map(p => new V3(p[0], p[1], p[2] || 0))), 14, r, 6, false));

  const BUILD = {
    // 魔法少女蓬蓬裙（SR）：淡紫上身、粉紅蓬蓬裙（裙襬一球一球、底下一圈白襯裙）、泡泡袖、金腰帶、胸前蝴蝶結和愛心寶石
    mgDress({ B, hang, at, top }) {
      top({ top: 'dress', col: LAV });
      hang(B.hips, (g) => {
        const prof = [[0.3, 1.04], [0.36, 1.0], [0.5, 0.92], [0.64, 0.8], [0.72, 0.66], [0.72, 0.56], [0.6, 0.5]];
        part(g, geo('mgSkirt', () => new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 22)), PINK, { line: 0.02 }).material.side = THREE.DoubleSide;
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; part(g, ball(), PINK, { pos: [Math.sin(a) * 0.62, 0.55, Math.cos(a) * 0.62], scale: [0.2, 0.15, 0.2], line: 0.02 }); }
        for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * Math.PI * 2; part(g, ball(10, 8), WHITE, { pos: [Math.sin(a) * 0.55, 0.45, Math.cos(a) * 0.55], scale: [0.14, 0.1, 0.14], line: 0.014, shadow: false }); }
        part(g, geo('mgBand', () => new THREE.TorusGeometry(0.325, 0.034, 6, 22)), GOLD, { pos: [0, 1.02, 0], rot: [Math.PI / 2, 0, 0], line: 0.012, shadow: false });
        [[-0.55, 0.72], [0, 0.66], [0.6, 0.76], [-0.25, 0.86], [0.3, 0.88], [2.2, 0.7], [-2.3, 0.78], [3.1, 0.68]].forEach(([a, y], i) => { const r = 0.5 + (0.92 - y) / 0.36 * 0.24;   // 裙子上的小亮片
          part(g, ext('mgBowStar', starShape(0.07), 0.03), '#fff6c9', { pos: [Math.sin(a) * (r + 0.015), y, Math.cos(a) * (r + 0.015)], rot: [-0.55, a, i * 0.4], scale: i % 2 ? 0.6 : 0.85, noLine: true, shadow: false, extra: { emissive: new THREE.Color('#fff6c9'), emissiveIntensity: 0.5 } }); });
      });
      [B.upper_armL, B.upper_armR].forEach(b => { const p = at(b); hang(b, (g) => part(g, ball(), PINK, { pos: [p.x * 1.04, p.y - 0.03, p.z], scale: [0.17, 0.15, 0.17], line: 0.016 })); });
      hang(B.spine, (g) => { const y = at(B.upper_armL).y - 0.16, z = 0.3;
        [-1, 1].forEach(k => part(g, ball(12, 8), ROSE, { pos: [k * 0.13, y, z], scale: [0.14, 0.1, 0.06], rot: [0, 0, k * 0.25], line: 0.012, shadow: false }));
        part(g, ext('mgHeart', heartShape(0.07), 0.05), '#ff3f7f', { pos: [0, y, z + 0.05], line: 0.01, shadow: false }); });
    },
    // 星月大蝴蝶結（R）：頭頂的粉紅大蝴蝶結，中間金色的釦子，兩條短緞帶往兩邊垂
    mgBow({ B, hang }) {
      hang(B.head, (g) => { const w = new THREE.Group(); w.position.set(0, 2.52, 0.12); w.rotation.x = -0.25; w.scale.setScalar(1.15); g.add(w);
        [-1, 1].forEach(k => {
          part(w, ball(), PINK, { pos: [k * 0.34, 0.1, 0], scale: [0.36, 0.24, 0.13], rot: [0, 0, k * 0.4], line: 0.02 });
          part(w, ball(10, 8), '#ffd3e6', { pos: [k * 0.32, 0.17, 0.11], scale: [0.2, 0.05, 0.03], rot: [0, 0, k * 0.4], noLine: true, shadow: false });   // 蝴蝶結上的亮面
          part(w, ball(10, 8), ROSE, { pos: [k * 0.3, -0.16, -0.06], scale: [0.1, 0.24, 0.06], rot: [0, 0, k * 0.85], line: 0.016 }); });
        part(w, ball(), GOLD, { pos: [0, 0.02, 0.04], scale: 0.13, line: 0.016 });
        part(w, ext('mgBowStar', starShape(0.07), 0.03), '#fff6c9', { pos: [0, 0.02, 0.17], noLine: true, shadow: false }); });
    },
    // 緞帶星星翅膀（SSR）：上面一片淡粉紅的大翅膀、下面一片淡紫的小翅膀，一條粉紅緞帶垂下來，尾巴吊一顆金星星。站著慢慢搧，走路搧快一點
    mgWings({ c, B, hang, tick }) {
      const S = 0.03, P = (x, y) => [x * S, y * S];
      const up = () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(...P(6, 24), ...P(26, 38), ...P(37, 33)); s.bezierCurveTo(...P(42, 22), ...P(28, 6), ...P(2, -4)); s.closePath(); return s; };
      const low = () => { const s = new THREE.Shape(); s.moveTo(...P(2, -4)); s.bezierCurveTo(...P(18, 1), ...P(32, -3), ...P(32, -13)); s.bezierCurveTo(...P(24, -17), ...P(12, -12), ...P(2, -7)); s.closePath(); return s; };
      const sides = [];
      hang(B.spine, (g) => [-1, 1].forEach(k => { const piv = new THREE.Group(), w = new THREE.Group(); piv.position.set(k * 0.12, 1.12, -0.3); piv.scale.x = k; g.add(piv); piv.add(w); w.rotation.z = -0.1;
        part(w, ext('mgWingUp', up, 0.04), '#ffdcee', { line: 0.02, shadow: false, extra: { emissive: new THREE.Color('#ffdcee'), emissiveIntensity: 0.3 } });
        part(w, ext('mgWingLow', low, 0.04), '#dccbff', { pos: [0, 0, -0.02], line: 0.02, shadow: false, extra: { emissive: new THREE.Color('#dccbff'), emissiveIntensity: 0.3 } });
        part(w, tube('mgVein', [[4 * S, 0], [12 * S, 16 * S], [25 * S, 28 * S], [33 * S, 29.5 * S]], 0.034), '#ff6fa5', { noLine: true, shadow: false });
        part(w, tube('mgRibbon', [[3 * S, -6 * S], [14 * S, -16 * S, -0.05], [20 * S, -23 * S, -0.05], [28 * S, -25 * S]], 0.035), '#ff8fb8', { line: 0.012, shadow: false });
        part(w, ext('mgWingStar', starShape(0.17), 0.05), GOLD, { pos: [29.5 * S, -27 * S, 0], rot: [0, 0, 0.3], line: 0.016, shadow: false });
        sides.push({ piv, k }); }));
      let ph = Math.random() * 6;
      tick((dt) => { ph += dt * (2.6 + c.mv * 3); const a = 0.42 + Math.sin(ph) * (0.2 + c.mv * 0.08); sides.forEach(s => { s.piv.rotation.y = s.k * a; }); });
    },
  };

  const _m = new THREE.Matrix4();
  function apply(c, equip) {
    equip = equip || {}; const key = SLOTS.map(s => (BUILD[equip[s]] ? equip[s] : '')).join(',');
    if (c.gearKey === key) return; c.gearKey = key;
    (c.gearPiv || []).forEach(p => { p.traverse(o => { if (o.isMesh && o.material) o.material.dispose(); }); if (p.parent) p.parent.remove(p); });
    c.gearPiv = []; c.gearTop = null; c.gearTick = null; const ticks = [];
    if (key.length > SLOTS.length - 1) {
      // 掛點用「站好不動」的姿勢算，不然走到一半穿上去位置會歪
      const sk = (c.meshes.find(o => o.isSkinnedMesh) || {}).skeleton, B = {}; if (sk) sk.pose();
      c.g.traverse(o => { if (o.isBone && !B[o.name]) B[o.name] = o; }); c.H.updateMatrixWorld(true);
      const hang = (bone, fn) => { const piv = new THREE.Group(); _m.copy(bone.matrixWorld).invert().multiply(c.H.matrixWorld).decompose(piv.position, piv.quaternion, piv.scale); bone.add(piv); fn(piv); c.gearPiv.push(piv); };
      const at = (bone) => c.H.worldToLocal(bone.getWorldPosition(new V3()));
      SLOTS.forEach(s => { const b = BUILD[equip[s]]; if (b) b({ c, B, hang, at, top: (t) => { c.gearTop = t; }, tick: (f) => ticks.push(f) }); });
    }
    if (ticks.length) c.gearTick = (dt) => ticks.forEach(f => f(dt));
    STD.setLook(c);
  }
  return { apply, has: (id) => !!BUILD[id], ids: () => Object.keys(BUILD) };
})();
