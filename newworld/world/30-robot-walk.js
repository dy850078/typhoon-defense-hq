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

