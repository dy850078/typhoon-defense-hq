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
  const S = { ctrl: ME ? 'me' : 'robot', x: 0, z: 0, face: 0, mv: 0, ph: 0, form: 'carry', cw: 1, gt: -1, time: 0, zoom: 0, quality: 1, lines: true, jx: 0, jy: 0, keys: {}, camT: new V3(0, 3.6, 3.2), gn: 0, rp: null };
  const CLS = ['', 'rider', 'summoner', 'skater'], CLS_NAME = { '': '一般', rider: '機器人騎士', summoner: '召喚師', skater: '陵媒' };
  // 召喚師的召喚物：一隻飄在旁邊的小外星人，跟著主人走（每個人的畫面各自算，不用同步）
  const SPIRITS = new Map(), TAG_UP = (c) => (c.look.cls === 'skater' ? 0.75 : c.look.cls === 'summoner' ? 0.45 : 0);   // 頭上有大拉翅或觸角，名字紙條要再高一點
  const makeSpirit = () => { const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
    part(b, sph(0.34, 18, 14), '#8fe0c0', { scale: [1, 0.92, 0.95], line: 0.03 });
    part(b, sph(0.2, 12, 10), '#c9f3e2', { pos: [0, -0.1, 0.2], scale: [1, 0.8, 0.6], noLine: true, shadow: false });
    [-1, 1].forEach(k => { part(b, sph(0.075, 10, 8), INK, { pos: [0.13 * k, 0.06, 0.29], scale: [1, 1.25, 0.5], noLine: true, shadow: false, mat: basic(INK) });
      part(b, sph(0.024, 6, 6), '#ffffff', { pos: [0.115 * k, 0.1, 0.32], noLine: true, shadow: false, mat: basic('#ffffff') });
      part(b, sph(0.1, 10, 8), '#8fe0c0', { pos: [0.3 * k, -0.2, 0], scale: [0.8, 1.2, 0.8], line: 0.03 }); });
    part(b, new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), '#6fc9a6', { pos: [0, 0.44, 0], noLine: true });
    const tip = part(b, sph(0.08, 10, 8), '#f7a8c4', { pos: [0, 0.62, 0], line: 0.025 });
    g.scale.setScalar(1.3); scene.add(g); return { g, b, tip, x: 0, z: 0, f: 0, ph: Math.random() * 6, fresh: true }; };
  const dropSpirit = (c) => { const s = SPIRITS.get(c); if (!s) return; scene.remove(s.g); s.g.traverse(o => { if (o.isMesh) o.material.dispose(); }); SPIRITS.delete(c); };
  const CULL_F = new THREE.Frustum(), CULL_M = new THREE.Matrix4(), CULL_S = new THREE.Sphere(new V3(), 2.6);
  const tickSpirit = (c, dt) => { if (c.look.cls !== 'summoner') return dropSpirit(c);
    let s = SPIRITS.get(c); if (!s) { s = makeSpirit(); SPIRITS.set(c, s); } s.g.visible = c.H.visible; if (!c.H.visible) { s.fresh = true; return; }
    const f = c.H.rotation.y, tx = c.H.position.x - Math.sin(f) * 0.9 + Math.cos(f) * 1.25, tz = c.H.position.z - Math.cos(f) * 0.9 - Math.sin(f) * 1.25;
    if (s.fresh) { s.x = tx; s.z = tz; s.f = f; s.fresh = false; }
    const k = Math.min(1, dt * 3.2), dx = tx - s.x, dz = tz - s.z, d = Math.hypot(dx, dz); s.x += dx * k; s.z += dz * k; s.ph += dt;
    let df = (d > 0.25 ? Math.atan2(dx, dz) : f) - s.f; df = Math.atan2(Math.sin(df), Math.cos(df)); s.f += df * Math.min(1, dt * 6);
    s.g.position.set(s.x, 1.35 + FY(s.x, s.z) + 0.14 * Math.sin(s.ph * 2.4), s.z); s.g.rotation.y = s.f; s.b.rotation.z = 0.12 * Math.sin(s.ph * 1.7); s.b.rotation.x = Math.min(0.35, d * 0.25);
    s.tip.scale.setScalar(1 + 0.18 * Math.sin(s.ph * 5)); };
  // 寵物：帳號在總部領養的那一隻（貓、狗、小馬，毛色照帳號的），在新世界跟在主人腳邊；主人坐下牠也趴下
  let PET = null;
  const makePet3 = (pet) => { const g = new THREE.Group(), b = new THREE.Group(); g.add(b); const k = pet.kind, hs = k === 'horse', fur = pet.fur, mk = pet.pattern !== 'none' ? pet.mark : fur, wh = pet.white !== 'none' ? '#fbf7ee' : fur;
    const by = hs ? 0.66 : 0.36, hy = hs ? 1.2 : 0.66, hz = hs ? 0.46 : 0.26, ink = (r, pos, sc) => part(b, sph(r, 8, 6), INK, { pos, scale: sc, noLine: true, shadow: false, mat: basic(INK) });
    part(b, sph(0.3), fur, { pos: [0, by, -0.05], scale: hs ? [0.8, 0.82, 1.35] : [0.85, 0.8, 1.15] });
    if (pet.white !== 'none') part(b, sph(0.2), wh, { pos: [0, by - 0.07, 0.17], scale: [0.9, 0.8, 0.8], noLine: true, shadow: false });
    if (pet.pattern !== 'none') [[0, 0.21, -0.02, 0.14], [0.1, 0.17, -0.2, 0.1], [-0.11, 0.16, 0.1, 0.09]].forEach(([x, y, z, r]) => part(b, sph(r, 8, 6), mk, { pos: [x, by + y, z], scale: [1, 0.35, 1], noLine: true, shadow: false }));
    if (hs) { part(b, sph(0.17), fur, { pos: [0, 0.95, 0.26], scale: [0.75, 1.6, 0.85], rot: [0.55, 0, 0] }); [0, 1, 2, 3].forEach(i => part(b, sph(0.09, 8, 6), pet.mark, { pos: [0, 1.4 - i * 0.14, 0.26 - i * 0.07], scale: [0.6, 1, 0.9], noLine: true, shadow: false })); }
    part(b, sph(0.27), fur, { pos: [0, hy, hz], scale: hs ? [0.82, 0.86, 0.95] : [1, 1, 1] });
    part(b, sph(0.1), wh, { pos: [0, hy - 0.07, hz + (hs ? 0.26 : 0.22)], scale: hs ? [1.25, 1.2, 1.7] : [1.2, 0.8, 1] });
    part(b, sph(0.04, 8, 6), pet.nose, { pos: [0, hy - 0.03, hz + (hs ? 0.44 : 0.315)], noLine: true, shadow: false, mat: basic(pet.nose) });
    [-1, 1].forEach(a => { ink(0.034, [0.1 * a, hy + 0.04, hz + 0.24], [1, 1.2, 0.6]);
      if (k === 'dog') part(b, sph(0.11), pet.earc || mk, { pos: [0.22 * a, hy + 0.12, hz - 0.06], scale: [0.6, 1.3, 0.8], rot: [0, 0, -0.5 * a] });
      else if (pet.ears === 'fold') part(b, sph(0.09), fur, { pos: [0.17 * a, hy + 0.2, hz + 0.02], scale: [1, 0.5, 0.8], rot: [0.3, 0, -0.4 * a] });
      else part(b, new THREE.ConeGeometry(hs ? 0.06 : 0.1, hs ? 0.18 : 0.2, 4), fur, { pos: [(hs ? 0.11 : 0.15) * a, hy + (hs ? 0.28 : 0.25), hz - 0.03], rot: [0, 0.6 * a, -0.2 * a], line: 0.016 }); });
    g.legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([a, c]) => part(b, sph(0.09), pet.white === 'socks' ? '#fbf7ee' : fur, { pos: [0.15 * a, hs ? 0.22 : 0.1, 0.2 * c - 0.05], scale: [1, hs ? 2.6 : 1.3, 1] }));
    g.tail = part(b, sph(0.08), hs ? pet.mark : fur, { pos: [0, by + (hs ? 0.02 : 0.14), hs ? -0.46 : -0.4], scale: k === 'dog' ? [0.8, 1.5, 0.8] : hs ? [0.8, 2.6, 0.8] : [0.6, 2.6, 0.6], rot: [hs ? 0.25 : -0.6, 0, 0] });
    g.b = b; g.legY = hs ? 0.22 : 0.1; g.scale.setScalar(0.95); scene.add(g); return g; };
  const setPet = (pet) => { if (PET) { scene.remove(PET.g); PET.g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); } }); PET.tag.t.remove(); PET.tag.n.remove(); PET = null; }
    if (!pet || !ME) return; const tag = mkTag(); tag.s.textContent = pet.name; tag.n.hidden = false; tag.n.classList.add('pet'); PET = { g: makePet3(pet), tag, pet, x: ME.x - 1, z: ME.z + 0.6, f: 0, ph: 0, mv: 0, lie: 0 }; };
  const tickPet = (dt) => { if (!PET || !ME) return; const P = PET, f = ME.face, tx = ME.x + Math.sin(f) * 0.25 - Math.cos(f) * 1.3, tz = ME.z + Math.cos(f) * 0.25 + Math.sin(f) * 1.3;   // 走在主人左手邊、稍微前面一點（不會被主人擋住）
    let dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz); if (d > 14) { P.x = tx; P.z = tz; d = 0; }
    const go = d > (P.mv > 0.5 ? 0.25 : 0.9), sp = Math.min(9, 2.2 + d * 2.2); if (go) { P.x += dx / d * Math.min(d, sp * dt); P.z += dz / d * Math.min(d, sp * dt); let df = Math.atan2(dx, dz) - P.f; df = Math.atan2(Math.sin(df), Math.cos(df)); P.f += df * Math.min(1, dt * 10); P.ph += dt * (6 + sp); }
    P.mv += ((go ? 1 : 0) - P.mv) * Math.min(1, dt * 8); P.lie += ((!go && ACT.pose === 'sit' ? 1 : 0) - P.lie) * Math.min(1, dt * 4);
    if (P.joy > 0) P.joy = Math.max(0, P.joy - dt);   // 被摸、被餵：開心地跳幾下
    P.g.position.set(P.x, FY(P.x, P.z) + P.mv * 0.06 * Math.abs(Math.sin(P.ph)) - P.lie * P.g.legY * 0.8 + (P.joy > 0 ? Math.abs(Math.sin(P.joy * 9)) * 0.28 : 0), P.z); P.g.rotation.y = P.f; P.g.b.rotation.x = -P.lie * 0.12;
    P.g.legs.forEach((l, i) => { l.position.y = P.g.legY + P.mv * Math.max(0, Math.sin(P.ph + (i % 3 ? 0 : Math.PI))) * 0.08; }); P.g.tail.rotation.z = Math.sin(S.time * 7) * 0.45;
    placeTag(P.tag, P.x, P.z, -1.2); };
  const FORMS = ['carry', 'float', 'front'], FORM_NAME = { carry: '單手捧著', float: '漂浮操控', front: '走在前面' };
  const CAM = [{ dist: 47, hgt: 17 }, { dist: 30, hgt: 10.5 }], CAM_ME = CAM, ANG = 0.62;
  // 多人：別的玩家的標準人物，還有頭上的名字紙條和聊天泡泡（用網頁元素疊在畫面上，字才清楚）
  const OTH = new Map(), LAB = document.createElement('div'); LAB.id = 'nw-labels'; document.body.appendChild(LAB);
  const mkTag = () => { const t = document.createElement('div'), b = document.createElement('div'), n = document.createElement('div'), i = document.createElement('img'), s = document.createElement('span');
    t.className = 'nw-tag'; b.className = 'nw-bubble'; n.className = 'nw-name'; b.hidden = n.hidden = i.hidden = true; i.alt = ''; n.append(i, s); t.append(b); LAB.append(t, n); return { t, b, n, i, s, until: 0 }; };
  // 名字紙條上的職業徽章：用總部同一套手繪圖示
  // 外圈是那個職業的熟練度階級（跟總部同一套：0 階沒有圈，越高越亮）
  const setBadge = (tag, cls, tier) => { tag.n.dataset.tier = cls ? (tier | 0) : ''; if (tag.cb) return;   // 練習場的新職業有自己的徽章（58-combat.js 交過來的），有的話用那個
    const A = window.HQ_MASTERY_ART, u = !cls || !window.HQ_ICONS ? null : A ? A.badgeUrl(cls, tier | 0) : window.HQ_ICONS.url('cls-' + cls);
    tag.i.hidden = !u; tag.n.dataset.tier = cls ? (tier | 0) : ''; if (u && tag.i.src !== u) tag.i.src = u; };
  let MYTIER = 0;
  const HINT = document.createElement('button'); HINT.className = 'nw-hint'; HINT.type = 'button'; HINT.hidden = true; LAB.appendChild(HINT); HINT.addEventListener('click', (e) => { e.stopPropagation(); NW.use(); });
  const MYTAG = ME ? mkTag() : null, PV = new V3();
  const hideTag = (tag) => { tag.t.style.display = tag.n.style.display = 'none'; };
  // 名字放在腳下（沒有底色和邊框），說話的泡泡在頭上
  const placeTag = (tag, x, z, y) => { PV.set(x, FY(x, z) - 0.12, z).project(camera); const on = PV.z < 1 && Math.abs(PV.x) < 1.15 && Math.abs(PV.y) < 1.15;
    tag.n.style.display = on ? '' : 'none'; if (on) tag.n.style.transform = 'translate(' + ((PV.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-PV.y * 0.5 + 0.5) * H).toFixed(1) + 'px) translate(-50%,0)';
    PV.set(x, 2.5 + (y || 0), z).project(camera);
    tag.t.style.display = on ? '' : 'none'; if (on) tag.t.style.transform = 'translate(' + ((PV.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-PV.y * 0.5 + 0.5) * H).toFixed(1) + 'px) translate(-50%,-100%)';
    if (tag.until && S.time > tag.until) { tag.b.hidden = true; tag.until = 0; } };
  const NET = {
    // 自己要同步出去的狀態：一般職業是人的位置；騎士是機器人的位置、隊形、揮手次數
    me: () => { if (!ME) return null; const r = S.ctrl === 'robot';
      return { x: +(r ? S.x : ME.x).toFixed(2), z: +(r ? S.z : ME.z).toFixed(2), f: +(r ? S.face : ME.face).toFixed(2), mv: (r ? S.mv > 0.5 : S.meMv) ? (!r && ACT.run ? 2 : 1) : 0, fm: FORMS.indexOf(S.form), g: S.gn, p: r ? 0 : POSE_ID[ACT.pose] || 0 }; },
    name: (s) => { if (MYTAG) { MYTAG.s.textContent = s; MYTAG.n.hidden = !s; } },
    put: (id, d) => { if (!STD) return; let o = OTH.get(id);
      if (!o) { o = { c: STD.make(d.look || {}), x: d.x || 0, z: d.z || 0, y: 0, f: d.f || 0, mv: 0, g: d.g || 0, tag: mkTag() }; o.tx = o.x; o.tz = o.z; o.tf = o.f;
        o.rs = { x: o.x, z: o.z, face: o.f, mv: 0, ph: 0, form: FORMS[d.fm] || 'carry', cw: 1, gt: -1, rp: null }; OTH.set(id, o); }
      else if (d.look) STD.setLook(o.c, d.look);
      const rider = o.c.look.cls === 'rider'; if (rider !== o.rider) { o.rider = rider; o.rs.x = o.tx; o.rs.z = o.tz; o.rs.rp = null; if (!rider) { o.x = o.tx; o.z = o.tz; } }
      if (d.tier != null) o.tier = d.tier | 0;
      if (d.gear !== undefined && GEAR3) GEAR3.apply(o.c, d.gear);
      setBadge(o.tag, o.c.look.cls, o.tier);
      if (d.name != null) { o.tag.s.textContent = d.name; o.tag.n.hidden = !d.name; } },
    move: (id, x, z, f, mv, fm, g, p) => { const o = OTH.get(id); if (!o) return; o.tx = x; o.tz = z; o.tf = f; o.mv = mv; o.p = p | 0; o.rs.form = FORMS[fm] || 'carry';
      if (g !== undefined && g !== o.g) { o.g = g; if (o.rs.gt < 0) o.rs.gt = 0; } },
    drop: (id) => { const o = OTH.get(id); if (!o) return; o.tag.t.remove(); o.tag.n.remove(); dropSpirit(o.c); STD.dispose(o.c); OTH.delete(id); },
    each: (fn) => { OTH.forEach(fn); },
    emote: (id, face) => { const o = id ? OTH.get(id) : ME; if (o && STD) STD.emote(o.c, face, 5); },
    clear: () => { [...OTH.keys()].forEach(NET.drop); },
    say: (id, text) => { const tag = id == null ? MYTAG : (OTH.get(id) || {}).tag; if (!tag) return; tag.b.textContent = text; tag.b.hidden = false; tag.until = S.time + 6; },
    count: () => OTH.size,
  };
  // --- 碰撞：小屋是一個轉了角度的方塊，樹和石頭是圓；走到會被推出來，所以會沿著邊滑過去 ---
  // 位置跟上面擺場景的地方對應（那邊的座標乘 2.3）
  const K23 = 2.3, WALLS = [{ x: -5.2 * K23, z: -2.6 * K23, hx: 1.5 * K23, hz: 1.15 * K23, ry: -0.25 }];
  const ROUNDS = [[-2.4, -4.2, 0.5 * 1.2], [-8.2, -3.4, 0.5], [3.6, -4.6, 0.5 * 1.3], [5.6, -3.2, 0.5 * 0.9], [-7.6, 0.6, 0.5], [5.6, -1.4, 0.5 * 1.1], [1.2, -5.2, 0.5], [-6.2, 2.2, 0.55 * 1.2], [5.2, 1.6, 0.55 * 0.9], [-2.5, 1.5, 0.4]]
    .map(([x, z, r]) => ({ x: x * K23, z: z * K23, r: r * K23 }));
  const HITP = { x: 0, z: 0 };
  function collide(x, z, r) {
    for (const c of ROUNDS) { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-4) { x = c.x + dx / d * m; z = c.z + dz / d * m; } }
    for (const b of WALLS) { const cs = Math.cos(b.ry), sn = Math.sin(b.ry), dx = x - b.x, dz = z - b.z, lx = dx * cs - dz * sn, lz = dx * sn + dz * cs, ex = b.hx + r, ez = b.hz + r;
      if (Math.abs(lx) < ex && Math.abs(lz) < ez) { let nx = lx, nz = lz; if (ex - Math.abs(lx) < ez - Math.abs(lz)) nx = Math.sign(lx || 1) * ex; else nz = Math.sign(lz || 1) * ez;
        x = b.x + nx * cs + nz * sn; z = b.z - nx * sn + nz * cs; } }
    HITP.x = x; HITP.z = z; return HITP;
  }
  // ===== 場景細節：草叢、小花、踏腳石（一次畫一整批，不多花繪製次數）、木柵欄、路燈、路牌 =====
  // 小路的中心線：P(s) = (-7.5 + 0.479 s, 9 + 0.878 s)，s 從 -20 到 20；n 是路的右手邊
  const WELL = { x: -1.0, z: 1.5, y: 3.3, reach: 1.2 }, GREEK_AT = { x: 1.7, z: 2.6, y: 3.0, f: 0.25 };
  const DETAIL = TW ? (() => {
    const r = rnd(77), PA = [0.479, 0.878], PN = [0.878, -0.479], P = (s, off) => [-7.5 + PA[0] * s + PN[0] * off, 9 + PA[1] * s + PN[1] * off];
    const offPath = (x, z) => { const dx = x + 7.5, dz = z - 9; return Math.abs(dx * PN[0] + dz * PN[1]); };
    const free = (x, z, m) => offPath(x, z) > 2.1 + m && collide(x, z, m).x === x && Math.hypot(x - 7.6, z - 9.5) > 4.5;   // 不要長在路上、屋子和樹裡面、香菇怪腳下
    const G = new THREE.Group(); scene.add(G);
    if (LOBBY) { ROUNDS.push({ x: WELL.x, z: WELL.z, r: 2.05 }, { x: GREEK_AT.x, z: GREEK_AT.z, r: 0.45 }); wishWell(WELL.x, WELL.z); }   // 許願池在前院（草和花會避開它）
    const batch = (geo, material, list, shadow) => { const im = new THREE.InstancedMesh(geo, material, list.length), o = new THREE.Object3D(), c = new THREE.Color();
      list.forEach((d, i) => { o.position.set(d.x, d.y || 0, d.z); o.rotation.set(d.rx || 0, d.ry || 0, d.rz || 0); o.scale.set(d.sx || d.s || 1, d.sy || d.s || 1, d.sz || d.s || 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (d.col) im.setColorAt(i, c.set(d.col)); });
      im.castShadow = !!shadow; im.receiveShadow = true; im.frustumCulled = false; G.add(im); return im; };
    // 草叢：每叢三片葉子，往外歪
    const blades = [];
    for (let i = 0; i < 400 && blades.length < 330; i++) { const x = (r() - 0.5) * 70, z = (r() - 0.5) * 64 + 6; if (!free(x, z, 0.3)) continue;
      const s = 0.7 + r() * 0.7, a0 = r() * 6.28, col = r() < 0.5 ? '#b9c765' : '#a9bd5c';
      for (let k = 0; k < 3; k++) { const a = a0 + k * 2.1; blades.push({ x: x + Math.cos(a) * 0.09 * s, z: z + Math.sin(a) * 0.09 * s, y: 0.2 * s, rx: Math.sin(a) * 0.38, rz: -Math.cos(a) * 0.38, s, col }); } }
    batch(new THREE.ConeGeometry(0.075, 0.46, 5), mat('#ffffff'), blades, false);
    // 小花：白、粉、黃三種，一小群一小群地長
    const stems = [], heads = [], hearts = [], FC = ['#fffdf2', '#f6b3c0', '#f6d76a', '#fffdf2', '#cdb6ee'];
    for (let i = 0; i < 60 && heads.length < 90; i++) { const cx = (r() - 0.5) * 60, cz = (r() - 0.5) * 54 + 8, col = FC[(r() * FC.length) | 0], n = 2 + ((r() * 4) | 0);
      for (let k = 0; k < n; k++) { const x = cx + (r() - 0.5) * 1.8, z = cz + (r() - 0.5) * 1.8, h = 0.32 + r() * 0.22; if (!free(x, z, 0.3)) continue;
        stems.push({ x, z, y: h / 2, sy: h }); heads.push({ x, z, y: h + 0.03, sy: 0.55, col }); hearts.push({ x, z, y: h + 0.08, s: 0.42 }); } }
    batch(new THREE.CylinderGeometry(0.018, 0.022, 1, 5), mat('#8fae5a'), stems, false);
    batch(sph(0.13, 9, 6), mat('#ffffff'), heads, true); batch(sph(0.13, 7, 5), mat('#f0c75a'), hearts, false);
    // 踏腳石：沿著小路一塊一塊
    const stones = []; for (let s = -15; s <= 19; s += 2.3) { const [x, z] = P(s, (r() - 0.5) * 1.5); stones.push({ x, z, y: 0.035, ry: r() * 3, sx: 0.75 + r() * 0.3, sy: 1, sz: 0.55 + r() * 0.25 }); }
    batch(new THREE.CylinderGeometry(0.7, 0.78, 0.07, 9), mat('#e9dcb8'), stones, false);
    // 木柵欄：一段一段的，中間留缺口可以走過去；每一段都擋得住人
    const WOOD = '#c98a52', fence = (s0, s1, off) => { const [x0, z0] = P(s0, off), [x1, z1] = P(s1, off), len = Math.hypot(x1 - x0, z1 - z0), g = new THREE.Group(), n = Math.round(len / 1.7);
      g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); g.rotation.y = -Math.atan2(z1 - z0, x1 - x0); G.add(g);
      for (let i = 0; i <= n; i++) part(g, new THREE.CylinderGeometry(0.09, 0.1, 1.05, 7), WOOD, { pos: [-len / 2 + len * i / n, 0.52, 0], rot: [0, 0, (r() - 0.5) * 0.08], line: 0.022 });
      [0.42, 0.8].forEach((y, j) => part(g, new THREE.BoxGeometry(len + 0.3, 0.11, 0.07), j ? '#d79a61' : WOOD, { pos: [0, y, 0], rot: [0, 0, (r() - 0.5) * 0.015], line: 0.02 }));
      WALLS.push({ x: g.position.x, z: g.position.z, hx: len / 2 + 0.1, hz: 0.12, ry: g.rotation.y }); };
    fence(-9, -1.5, -3.1); fence(7, 15.5, -3.1); fence(-13, -6.2, 3.1); fence(11, 18, 3.1);
    // 路燈：木柱掛一盞紙燈籠
    const lamp = (s, off, ry) => { const [x, z] = P(s, off), g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; G.add(g);
      part(g, new THREE.CylinderGeometry(0.09, 0.12, 3.3, 8), '#a8693f', { pos: [0, 1.65, 0], line: 0.024 });
      part(g, new THREE.BoxGeometry(0.95, 0.1, 0.1), '#a8693f', { pos: [0.38, 3.15, 0], line: 0.02 });
      part(g, new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), INK, { pos: [0.72, 2.97, 0], noLine: true, shadow: false });
      part(g, sph(0.27, 14, 10), '#ffe9a8', { pos: [0.72, 2.6, 0], scale: [1, 1.15, 1], line: 0.024, shadow: false, mat: basic('#ffe9a8') });
      [2.86, 2.34].forEach(y => part(g, new THREE.CylinderGeometry(0.15, 0.15, 0.07, 10), '#d9604a', { pos: [0.72, y, 0], noLine: true, shadow: false }));
      ROUNDS.push({ x, z, r: 0.2 }); };
    lamp(-11, 2.9, 2.2); lamp(3, -2.9, -1.0); lamp(17, 2.9, 2.2);
    // 路牌：紙條風的木牌，字是畫上去的
    const sign = (s, off, ry, text) => { const [x, z] = P(s, off), g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; G.add(g);
      const t = tex(256, 112, (c, w, h) => { c.fillStyle = '#f7ecd0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a8693f'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
        c.fillStyle = '#5b4636'; c.font = '700 52px "Noto Sans TC", "PingFang TC", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 3); });
      part(g, new THREE.CylinderGeometry(0.08, 0.1, 1.9, 7), '#a8693f', { pos: [0, 0.95, 0], line: 0.022 });
      part(g, new THREE.BoxGeometry(1.5, 0.66, 0.09), '#f7ecd0', { pos: [0, 1.62, 0.07], rot: [0, 0, -0.04], line: 0.024, mat: [0, 1, 2, 3, 4, 5].map(i => (i === 4 ? new THREE.MeshToonMaterial({ map: t, gradientMap: RAMP }) : mat('#e5cfa0'))) });
      ROUNDS.push({ x, z, r: 0.25 }); };
    // 長椅：面向小路，一張可以坐兩個人
    const SEATS = [], bench = (s, off) => { const [x, z] = P(s, off), g = new THREE.Group(), ry = Math.atan2(-PN[0] * Math.sign(off), -PN[1] * Math.sign(off)); g.position.set(x, 0, z); g.rotation.y = ry; G.add(g);
      part(g, new THREE.BoxGeometry(2.3, 0.12, 0.72), '#d79a61', { pos: [0, 0.55, 0], line: 0.022 });
      part(g, new THREE.BoxGeometry(2.3, 0.5, 0.1), WOOD, { pos: [0, 1.0, -0.36], rot: [-0.12, 0, 0], line: 0.022 });
      [[-1, -0.28], [1, -0.28], [-1, 0.28], [1, 0.28]].forEach(([a, b]) => part(g, new THREE.CylinderGeometry(0.06, 0.07, 0.55, 6), '#a8693f', { pos: [a, 0.27, b], line: 0.02 }));
      [-1, 1].forEach(a => part(g, new THREE.BoxGeometry(0.1, 0.6, 0.1), '#a8693f', { pos: [a, 0.85, -0.34], noLine: true }));
      WALLS.push({ x, z, hx: 1.15, hz: 0.36, ry });
      [-0.55, 0.55].forEach(lx => SEATS.push({ x: x + lx * Math.cos(ry) + 0.2 * Math.sin(ry), z: z - lx * Math.sin(ry) + 0.2 * Math.cos(ry), f: ry })); };
    bench(-2.5, 4.0); bench(2.2, -4.2);
    G.userData = { SEATS };
    return G;
  })() : null;
  // 動作：坐下、揮手、跑步；一動就站起來
  const ACT = { pose: null, run: false, until: 0 }, POSE_ID = { sit: 1, wave: 2 }, POSE_OF = [null, 'sit', 'wave'];
  // 大廳（室內）：牆和家具的碰撞、可以坐的位子接進來；地板有高低（作戰角高一階）
  const FY = LOBBY ? LOBBY.floorY : () => 0, inLob = (z) => !!LOBBY && LOBBY.isIn(z);
  if (LOBBY) { WALLS.push(...LOBBY.walls); ROUNDS.push(...LOBBY.rounds); }
  const LIMX = (x, z0) => (inLob(z0) ? Math.max(LOBBY.min[0], Math.min(LOBBY.max[0], x)) : Math.max(-70, Math.min(70, x)));
  const LIMZ = (z, z0) => (inLob(z0) ? Math.max(LOBBY.min[1], Math.min(LOBBY.max[1], z)) : Math.max(-36, Math.min(70, z)));   // 前院往北走不到大廳那一塊，要從門進去
  const SEATS = (DETAIL ? DETAIL.userData.SEATS : []).concat(LOBBY ? LOBBY.seats : []), JUKE = LOBBY ? LOBBY.JUKE : null;
  const sitY = (x, z) => { for (const s of SEATS) if (Math.hypot(x - s.x, z - s.z) < 0.5) return s.h ?? 0.2; return -0.3; };   // 坐椅子或坐地上，屁股的高度不一樣
  // 可以互動的東西：靠近會在上面冒出一張小紙條，點紙條或按 E
  const YARD_DOOR = { x: -11.8, z: -1.6, f: 0.5 };
  const INTER = SEATS.map(s => ({ kind: 'bench', x: s.x, z: s.z, f: s.f, y: 1.3 + (s.h ?? 0.2) + FY(s.x, s.z) })).concat(JUKE ? [{ kind: 'juke', x: JUKE.x, z: JUKE.z, y: JUKE.y }] : [], [{ kind: 'door', x: -12.3, z: -2.7, y: 3.2 }], LOBBY ? [{ kind: 'exit', x: LOBBY.EXIT.x, z: LOBBY.EXIT.z, y: LOBBY.EXIT.y }, { kind: 'well', ...WELL }, { kind: 'greek', ...GREEK_AT }, { kind: 'mentor', ...LOBBY.SPOTS.mentor }, { kind: 'gacha', ...LOBBY.SPOTS.gacha }, { kind: 'seedbox', ...LOBBY.SPOTS.seedbox }, ...LOBBY.SPOTS.plots.map((q, i) => ({ kind: 'plot', i, ...q }))] : []);
  const HINT_TEXT = { bench: '坐下', juke: '聽歌', door: LOBBY ? '進大廳' : '敲門', exit: '到前院', well: '許個願', greek: '說話', mentor: '轉職', gacha: '扭蛋', seedbox: '領種子' }; let NEAR = null, onInteract = null;
  // 公共花園：12 格的狀態（伺服器送來的，跟總部同一塊）；紙條上的字照那一格現在能做什麼
  let PLOTS = [];
  const plotHint = (i) => { const q = PLOTS[i]; return !q ? '種東西' : q.stage === 4 ? '收成' : q.stage === 5 ? '清掉' : q.wet <= 0 ? '澆水' : '看看'; };
  // 紙條上的手繪小圖示（跟總部同一套，另外補了坐下和門）
  const HINT_ICON = { bench: 'act-sit', juke: 'btn-song', door: 'act-home', exit: 'act-door', well: 'wish-coin', greek: 'act-greek', mentor: 'act-mentor', gacha: 'act-gacha', seedbox: 'act-seedbox' },
    PLOT_ICON = { '種東西': 'act-plant', '收成': 'act-harvest', '清掉': 'item-twig', '澆水': 'act-water', '看看': 'act-plant' };
  const TOUCH = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  // 椅子的紙條：走近先完整顯示 3 秒，之後縮成一個小圖示（還是點得到），不擋畫面；走開再回來會重新顯示
  let nearIt = null, nearAt = 0; const SEAT_FULL_MS = 3000;
  const showHint = (it) => { if (it !== nearIt) { nearIt = it; nearAt = performance.now(); }
    const mini = it.kind === 'bench' && performance.now() - nearAt > SEAT_FULL_MS && !!(window.HQ_ICONS && window.HQ_ICONS.url(HINT_ICON.bench));
    const lb = hintOf(it), key = it.kind + lb + (mini ? '-mini' : ''); if (HINT.dataset.k === key) return; HINT.dataset.k = key; HINT.classList.toggle('mini', mini);
    if (mini) { HINT.classList.add('art'); HINT.textContent = ''; const i = document.createElement('img'), sp = document.createElement('span'); i.src = window.HQ_ICONS.url(HINT_ICON.bench); i.width = i.height = 22; i.alt = ''; sp.textContent = lb; HINT.append(i, sp); return; }
    const art = window.NW_HINT ? window.NW_HINT.hint(it.kind === 'plot' ? PLOT_ICON[lb] : HINT_ICON[it.kind], lb, TOUCH) : null;
    HINT.classList.toggle('art', !!art); HINT.textContent = ''; if (!art) { HINT.textContent = lb; return; }
    const i = document.createElement('img'), sp = document.createElement('span'); i.src = art.url; i.width = art.w; i.height = art.h; i.alt = ''; sp.textContent = lb; HINT.append(i, sp); };
  // NPC 和地點的名牌：手繪紙條，飄在頭上
  const NPCS = LOBBY ? [{ name: '職業導師', icon: 'act-mentor', x: LOBBY.SPOTS.mentorSeat.x, z: LOBBY.SPOTS.mentorSeat.z, y: 3.0, lob: true }, { name: '希臘少女', icon: 'act-greek', x: GREEK_AT.x, z: GREEK_AT.z, y: 2.62, lob: false }] : [];
  const NPC_NEAR = 6;
  const placeNpcs = () => NPCS.forEach(n => { if (!n.el) { if (!window.NW_HINT) return; const a = window.NW_HINT.tag(n.icon, n.name); n.el = document.createElement('img'); n.el.className = 'nw-npc'; n.el.src = a.url; n.el.width = Math.round(a.w * 0.6); n.el.height = Math.round(a.h * 0.6); n.el.alt = n.name; n.el.style.opacity = '0'; LAB.appendChild(n.el); }   // 名牌縮成六成大
    PV.set(n.x, n.y, n.z).project(camera); const on = !!S.lob === n.lob && PV.z < 1 && Math.abs(PV.x) < 1.1 && Math.abs(PV.y) < 1.1 && !(NEAR && Math.hypot(NEAR.x - n.x, NEAR.z - n.z) < 1.2);   // 動作紙條冒出來的時候，名牌先讓位
    // 走近（大約五步內）才淡入，走遠淡出，畫面才不會一堆名牌
    const px = S.ctrl === 'me' && ME ? ME.x : S.x, pz = S.ctrl === 'me' && ME ? ME.z : S.z, close = Math.hypot(px - n.x, pz - n.z) < NPC_NEAR;
    n.el.style.display = on ? '' : 'none'; n.el.style.opacity = on && close ? '1' : '0'; if (on) n.el.style.transform = 'translate(' + ((PV.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-PV.y * 0.5 + 0.5) * H).toFixed(1) + 'px) translate(-50%,-100%)'; });
  const hintOf = (it) => (it.kind === 'plot' ? plotHint(it.i) : HINT_TEXT[it.kind]);

  // 點地面走路的目標小圈圈
  const GOAL = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.62, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false }));
  GOAL.add(new THREE.Mesh(new THREE.RingGeometry(0.62, 0.69, 32), new THREE.MeshBasicMaterial({ color: '#b98a5e', transparent: true, opacity: 0.9, depthWrite: false })), new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false })));
  GOAL.rotation.x = -Math.PI / 2; GOAL.visible = false; GOAL.renderOrder = 5; scene.add(GOAL);
  const RAY = new THREE.Raycaster(), NDC = new THREE.Vector2(), GROUND = new THREE.Plane(new V3(0, 1, 0), 0), HIT = new V3(), GROUND_UP = new THREE.Plane(new V3(0, 1, 0), LOBBY ? -LOBBY.PH : 0), HIT2 = new V3();
  const key = (tt, ks) => { for (let i = 0; i < ks.length - 1; i++) if (tt >= ks[i][0] && tt <= ks[i + 1][0]) return ks[i][1] + (ks[i + 1][1] - ks[i][1]) * sm((tt - ks[i][0]) / (ks[i + 1][0] - ks[i][0])); return 0; };
  const U = (tt) => tt < 0 ? 0 : key(tt, [[0, 0], [0.04, 0], [0.13, -1], [0.16, -1], [0.195, 1], [0.3, 1], [0.4, 0], [1, 0]]);   // 揮手：-1 舉高、+1 揮下去
  const Vv = (tt) => tt < 0 ? 0 : key(tt, [[0, 0], [0.46, 0], [0.54, 1], [0.68, 1], [0.8, 0], [1, 0]]);                            // 兩手高舉
  const bp0 = new V3(), tq = new THREE.Quaternion();

  // 把機器人擺成 st 這個騎士的樣子（位置、走路、隊形、揮手）。同一台機器人模型會輪流擺給每個騎士用
  function poseRobot(st, dt, t) {
    R.position.set(st.x, 0, st.z); R.rotation.y = st.face;
    const mv = st.mv, ph = st.ph, bp = ph * 3, FORM = st.form, DL = 0.03, u = U(st.gt), v = Vv(st.gt), ru = U(st.gt - DL), rv = Vv(st.gt - DL);
    // --- 機器人：沉沉的大步 ---
    const Aw = 0.34 * mv;
    WK.legs.forEach((lg, i) => { const p = ph + i * Math.PI, hip = -Aw * Math.sin(p), knee = 0.75 * mv * Math.pow(Math.max(0, Math.cos(p)), 1.3) + 0.5 * rv * (1 - rv); lg.Hp.rotation.x = hip - knee * 0.35; lg.Kn.rotation.x = knee; lg.F.rotation.x = -(hip - knee * 0.35 + knee) * 0.75; });
    WK.arms.forEach((ar, i) => { const p = ph + (1 - i) * Math.PI, uu = i ? ru : 0;
      ar.S.rotation.set(-0.34 * mv * Math.sin(p) + (uu < 0 ? 2.8 * uu : -1.25 * uu) - 2.55 * rv * (i ? 1 : 1 - st.cw), 0, (i ? 1 : -1) * (0.1 + 0.3 * rv));
      ar.E.rotation.set(-0.35 - 0.2 * mv * Math.max(0, Math.sin(p)) + (uu < 0 ? 0.6 * uu : 0.2 * uu) - 0.95 * rv, 0, 0); });
    arm0.S.quaternion.slerp(carry.S, st.cw); arm0.E.quaternion.slerp(carry.E, st.cw); arm0.h.quaternion.copy(carry.h0).slerp(carry.h, st.cw);
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
    if (!st.rp) st.rp = bp0.clone(); st.rp.lerp(bp0, Math.min(1, dt * 9)); g.position.copy(st.rp); g.rotation.set(...rot);
    WK.disc.forEach((d, i) => { d.position.set(g.position.x, g.position.y - 0.12 - i * 0.22, g.position.z); d.scale.setScalar(1 + 0.12 * Math.sin(t * PI2 * 4 + i * 2)); d.material.opacity = 0.75 - i * 0.3; });
    WK.bl.forEach((h, i) => { h.rotation.x = legs(i); }); WK.ba[0].rotation.set(...armR); WK.ba[1].rotation.set(...armL);
    A.bhead.rotation.set(0.02 - 0.15 * v, 0.06 * Math.sin(ph), -0.04 + 0.03 * Math.sin(t * PI2 * 2));
    // 小精靈繞著人
    const a = t * PI2 * 2 + 2.2, cy = g.position.y + 1.36 * 1.25 + 0.35;
    A.plush.scale.setScalar(0.62); A.plush.position.set(g.position.x + Math.sin(a) * 1.05, cy + 0.2 * Math.cos(a) + 0.06 * Math.sin(t * PI2 * 6), g.position.z + Math.cos(a) * 1.05); A.plush.rotation.set(0.15 * Math.sin(t * PI2 * 6), a + Math.PI / 2, 0);
    return { shake, u, v };
  }
  // 騎士坐（或走、飄）在機器人旁邊的位置：把標準人物放過去，回傳世界座標
  const seatV = new V3(), YAX = new V3(0, 1, 0);
  function seat(c, st, dt, info) {
    seatV.copy(st.rp).applyAxisAngle(YAX, st.face); seatV.x += st.x; seatV.z += st.z;
    c.H.position.copy(seatV); c.H.rotation.y = st.face;
    const pose = info.v > 0.2 || Math.abs(info.u) > 0.2 ? 'wave' : st.form === 'carry' ? 'sit' : null;
    STD.tick(c, dt, st.form === 'front' ? st.mv : 0, 1.6, pose); return seatV;
  }
  const stepRS = (st, dt, moving) => { st.mv += ((moving ? 1 : 0) - st.mv) * Math.min(1, dt * 7); st.cw += ((st.form === 'carry' ? 1 : 0) - st.cw) * Math.min(1, dt * 5);
    if (st.gt >= 0) { st.gt += dt / 6; if (st.gt >= 1) st.gt = -1; } };
  // 念力光帶那些直接放在場景裡的東西：自己不是騎士的時候要藏起來
  const RIDER_FX = [...WK.halo, WK.core, ...WK.waves].filter(o => o && o.parent === scene);
  // 前院和大廳是分開的兩區：人在哪一區就只畫那一區（另一區整個藏起來，省效能）
  // 職業導師：坐在大廳後牆的桌子後面（只有在大廳才畫）
  const MENTOR = LOBBY && STD ? STD.make({ hair: 'bun', top: 'hoodie', face: 'smile', glasses: true, hairCol: '#9a96a0', topCol: '#7d6a9c' }) : null, LOBX = [];
  if (MENTOR) { const q = LOBBY.SPOTS.mentorSeat; MENTOR.H.position.set(q.x, q.h, q.z); MENTOR.H.rotation.y = 0; MENTOR.H.visible = false; LOBX.push(MENTOR.H); }
  // 許願池旁邊的希臘少女（照總部 2D 的樣子）：紅棕色長髮、白色長袍、金色腰繩和橄欖葉冠，右手食指比「噓」
  const GREEK = LOBBY && STD ? (() => { const c = STD.make({ hair: 'long', top: 'dress', face: 'smile', glasses: false, hairCol: '#b5532c', topCol: '#fbfbf8' }), B = {};
    c.g.traverse(o => { if (o.isBone && !B[o.name]) B[o.name] = o; }); c.H.updateMatrixWorld(true);
    const hang = (bone, fn) => { const piv = new THREE.Group(); new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(c.H.matrixWorld).decompose(piv.position, piv.quaternion, piv.scale); bone.add(piv); fn(piv); };
    const GOLD = '#e8c04a';
    hang(B.spine, (g) => { const w = new THREE.Group(); w.position.set(0, 1.88, 0); w.rotation.x = -0.12; g.add(w);   // 橄欖葉冠：後面高、前面低，前面留個缺口
      for (let i = 0; i < 15; i++) { const a = (i - 7) / 7 * 2.9, x = Math.sin(a) * 0.66, z = Math.cos(a) * 0.66;
        part(w, sph(0.14, 8, 6), i % 2 ? GOLD : '#f2d36a', { pos: [x, (i % 2) * 0.035, z], scale: [0.55, 0.5, 1.5], rot: [0.5 * (i % 2 ? 1 : -1), a + Math.PI / 2, 0], line: 0.014, shadow: false }); } });
    hang(B.spine, (g) => { part(g, new THREE.TorusGeometry(0.335, 0.028, 6, 22), GOLD, { pos: [0, 0.97, 0.01], rot: [Math.PI / 2, 0, 0], scale: [1, 0.86, 1], line: 0.014, shadow: false });   // 金色腰繩，打結垂下來
      part(g, sph(0.05, 8, 6), GOLD, { pos: [0.12, 0.96, 0.3], noLine: true, shadow: false }); [0.09, 0.15].forEach((x, i) => part(g, new THREE.CylinderGeometry(0.016, 0.016, 0.26 - i * 0.05, 5), GOLD, { pos: [x, 0.83 + i * 0.02, 0.31], rot: [0, 0, 0.12 - i * 0.3], noLine: true, shadow: false })); });
    c.H.position.set(GREEK_AT.x, 0, GREEK_AT.z); c.H.rotation.y = GREEK_AT.f; c.B = B; return c; })() : null;
  // 把一根骨頭轉到朝某個方向（世界座標）：用來擺「噓」的手
  const _a = new V3(), _b = new V3(), _d = new V3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
  const aim = (bone, child, dx, dy, dz, f) => { bone.updateWorldMatrix(true, true); bone.getWorldPosition(_a); child.getWorldPosition(_b); _b.sub(_a).normalize(); _d.set(dx, dy, dz).normalize().applyAxisAngle(V3_UP, f);
    _q1.setFromUnitVectors(_b, _d); bone.getWorldQuaternion(_q2); _q1.multiply(_q2); bone.parent.getWorldQuaternion(_q2).invert(); bone.quaternion.copy(_q2.multiply(_q1)); };
  const V3_UP = new V3(0, 1, 0);
  const tickGreek = (dt) => { if (!GREEK || S.lob) return; STD.tick(GREEK, dt, 0); const B = GREEK.B, f = GREEK.H.rotation.y;
    aim(B.upper_armR, B.lower_armR, 0.12, 0.18, 1, f); aim(B.lower_armR, B.handR, 0.75, 0.62, 0.22, f); };
  const YARD = LOBBY ? scene.children.filter(o => o.visible && !o.isLight && o !== sun.target && o !== R && o !== GOAL && o !== LOBBY.G && !(ME && o === ME.c.H) && !RIDER_FX.includes(o)) : [], SKY = scene.background;
  const setZone = (lob) => { S.lob = lob; YARD.forEach(o => { o.visible = !lob; }); LOBBY.G.visible = lob; LOBX.forEach(o => { o.visible = lob; }); scene.background = lob ? LOBBY.bg : SKY; S.goal = null; S.camT.set(ME.x, 1.3 + FY(ME.x, ME.z), ME.z); };
  A.boy.visible = false;   // 舊的小男孩不再出現：騎士就是玩家自己的標準人物
  // 機器人的小零件不投影子（影子那一輪少畫很多次，地上的影子看不出差別）
  { let cut = 0, all = 0; A.bot.updateMatrixWorld(true); const sc = new V3(); A.bot.traverse(o => { if (!o.isMesh || !o.castShadow) return; all++;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); o.getWorldScale(sc);
      if (o.geometry.boundingSphere.radius * Math.max(Math.abs(sc.x), Math.abs(sc.y), Math.abs(sc.z)) < 0.55) { o.castShadow = false; cut++; } });
    A.bot.userData.shadowCut = cut + '/' + all; }
  // 別的騎士的機器人：主畫面畫完後，把同一台機器人擺成他們的樣子再補畫一次（第 1 層只有機器人和燈）
  R.traverse(o => o.layers.enable(1)); scene.traverse(o => { if (o.isLight) o.layers.enable(1); });
  // 練習場的戰鬥（58-combat.js）：怪、招式特效、使魔；這裡把自己和別人的位置交給它
  const CB = ME && typeof makeCombat === 'function' ? makeCombat({ ME, S, OTH, FY, LAB,
    badge: (mine, id, url) => { const tag = mine ? MYTAG : (OTH.get(id) || {}).tag; if (!tag || tag.cb === url) return; tag.cb = url; tag.i.hidden = false; tag.i.src = url; },
    moveMe: (x, z) => { const c = collide(LIMX(x, ME.z), LIMZ(z, ME.z), 0.4); ME.x = c.x; ME.z = c.z; }, faceMe: (f) => { ME.face = f; },
    moving: () => Math.hypot(S.jx, S.jy) > 0.15 || !!(S.keys.ArrowLeft || S.keys.ArrowRight || S.keys.ArrowUp || S.keys.ArrowDown || S.keys.a || S.keys.d || S.keys.w || S.keys.s) || !!(S.goal && !S.goal.auto) }) : null;
  function update(dt) {
    S.time += dt; const t = S.time / 6; if (CB) CB.tick(dt);
    // --- 移動：搖桿或鍵盤，方向以畫面為準 ---
    let jx = S.jx, jy = S.jy; const K = S.keys;
    if (K.ArrowLeft || K.a) jx -= 1; if (K.ArrowRight || K.d) jx += 1; if (K.ArrowUp || K.w) jy -= 1; if (K.ArrowDown || K.s) jy += 1;
    let jl = Math.hypot(jx, jy), wx = 0, wz = 0;
    if (jl > 0.15) { S.goal = null; const n = Math.min(1, jl) / jl; wx = (Math.cos(ANG) * jx + Math.sin(ANG) * jy) * n; wz = (-Math.sin(ANG) * jx + Math.cos(ANG) * jy) * n; }
    else if (S.goal) { // 點地面走路：朝目標走，到了就停；搖桿或鍵盤一動就取消
      const me = S.ctrl === 'me', dx = S.goal.x - (me ? ME.x : S.x), dz = S.goal.z - (me ? ME.z : S.z), d = Math.hypot(dx, dz), step = (me ? (ACT.run ? 7 : 4.2) * (CB ? CB.slow() : 1) : 6.5) * dt;
      if (d < S.goal.best - 0.01) { S.goal.best = d; S.goal.t = S.time; }   // 被擋住一陣子沒有更靠近，就不走了
      if (d < 0.12 || S.time - S.goal.t > 0.8) S.goal = null; else { const n = Math.min(1, d / step) / d; wx = dx * n; wz = dz * n; jl = 1; } }
    GOAL.visible = !!S.goal; if (S.goal) { GOAL.position.set(S.goal.x, 0.06 + FY(S.goal.x, S.goal.z), S.goal.z); const k = 1 + Math.sin(S.time * 6) * 0.12; GOAL.scale.set(k, k, k); }
    const moving = jl > 0.15 && S.ctrl === 'robot', meMoving = jl > 0.15 && S.ctrl === 'me'; S.meMv = meMoving;
    if (ME) { if (meMoving) { const vx = wx, vz = wz, sp = (ACT.run ? 7 : 4.2) * (CB ? CB.slow() : 1); ACT.pose = null;
        const h = collide(LIMX(ME.x + vx * sp * dt, ME.z), LIMZ(ME.z + vz * sp * dt, ME.z), 0.45); ME.x = h.x; ME.z = h.z;
        let df = Math.atan2(vx, vz) - ME.face; df = Math.atan2(Math.sin(df), Math.cos(df)); ME.face += df * Math.min(1, dt * 9); }
      if (S.ctrl === 'me') { if (ACT.pose === 'wave' && S.time > ACT.until) ACT.pose = null;
        ME.sy = ACT.pose === 'sit' ? sitY(ME.x, ME.z) : 0; ME.c.H.position.set(ME.x, ME.sy + FY(ME.x, ME.z), ME.z); ME.c.H.rotation.y = ME.face;
        STD.tick(ME.c, dt, meMoving ? Math.min(1, jl) : 0, ACT.run ? 2.1 : 1.6, ACT.pose || (ACT.run ? 'run' : null));
        // 最近的可以互動的東西
        let best = null, bd = 2.4; for (const it of INTER) { const d = Math.hypot(it.x - ME.x, it.z - ME.z) - (it.reach || 0); if (d < bd) { bd = d; best = it; } } NEAR = best; } else { NEAR = null; ME.sy = 0; } }
    if (moving) { const vx = wx, vz = wz, sp = 6.5;
      const h = collide(LIMX(S.x + vx * sp * dt, S.z), LIMZ(S.z + vz * sp * dt, S.z), 1.9); S.x = h.x; S.z = h.z;
      let df = Math.atan2(vx, vz) - S.face; df = Math.atan2(Math.sin(df), Math.cos(df)); S.face += df * Math.min(1, dt * 7);
      S.ph += dt * sp * Math.hypot(vx, vz) / 7 * PI2; }
    stepRS(S, dt, moving);
    // 別的騎士：先把機器人擺成他們的樣子，算出他們的人坐在哪（機器人本身等畫面主體畫完再補畫）
    OTH.forEach(o => { if (!o.rider) return; const st = o.rs, k = Math.min(1, dt * 9), dx = o.tx - st.x, dz = o.tz - st.z, far = Math.hypot(dx, dz);
      if (far > 12) { st.x = o.tx; st.z = o.tz; } else { st.x += dx * k; st.z += dz * k; }
      let df = o.tf - st.face; df = Math.atan2(Math.sin(df), Math.cos(df)); st.face += df * k;
      const mvg = o.mv || far > 0.15; if (mvg) st.ph += dt * 6.5 / 7 * PI2; stepRS(st, dt, mvg);
      const w = seat(o.c, st, dt, poseRobot(st, dt, t)); o.x = w.x; o.z = w.z; o.y = w.y; });
    const RID = S.ctrl === 'robot', info = poseRobot(S, dt, t), shake = info.shake, u = info.u, v = info.v, FORM = S.form, ru = U(S.gt - 0.03);
    R.visible = RID; RIDER_FX.forEach(o => { o.visible = RID; });
    if (ME) { if (RID) { const w = seat(ME.c, S, dt, info); ME.x = w.x; ME.z = w.z; ME.y = w.y; ME.face = S.face; } else ME.y = (ME.sy || 0) + FY(ME.x, ME.z);
      const lob = S.ctrl === 'me' && inLob(ME.z); if (lob !== S.lob) setZone(lob); }
    // --- 鏡頭：固定斜角，跟著角色 ---
    const cam = (S.ctrl === 'me' ? CAM_ME : CAM)[S.zoom], asp = W / H, far = asp < 1 ? Math.pow(1 / asp, 0.75) : 1;
    if (S.ctrl === 'me') S.camT.lerp(bp0.set(ME.x, 1.3 + FY(ME.x, ME.z), ME.z), Math.min(1, dt * 5));   // 騎士的鏡頭看整台機器人
    else S.camT.lerp(bp0.set(S.x - 0.8, 3.6 + shake * 0.07, S.z + 3.2), Math.min(1, dt * 5));
    camera.position.set(S.camT.x + Math.sin(ANG) * cam.dist * far, cam.hgt * far, S.camT.z + Math.cos(ANG) * cam.dist * far); camera.lookAt(S.camT);
    if (S.dbgCam) { const d = S.dbgCam; camera.position.set(ME.x + Math.sin(d.ang) * d.dist, d.hgt, ME.z + Math.cos(d.ang) * d.dist); camera.lookAt(ME.x, d.look ?? 1.1, ME.z); }   // 測試截圖用的近鏡頭
    camera.updateMatrixWorld(); if (!NEAR) nearIt = null;
    if (NEAR && ACT.pose !== 'sit') { PV.set(NEAR.x, NEAR.y, NEAR.z).project(camera); HINT.hidden = false; showHint(NEAR);   // 坐著的時候不顯示紙條（走路就會站起來）
      HINT.style.transform = 'translate(' + ((PV.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-PV.y * 0.5 + 0.5) * H).toFixed(1) + 'px) translate(-50%,-100%)'; } else HINT.hidden = true;
    placeNpcs();
    if (MYTAG) placeTag(MYTAG, ME.x, ME.z, ME.y + TAG_UP(ME.c));
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
    CULL_M.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); CULL_F.setFromProjectionMatrix(CULL_M);
    const tagOf = (o) => { if (inLob(o.z) !== S.lob) hideTag(o.tag); else placeTag(o.tag, o.x, o.z, o.y + TAG_UP(o.c)); };   // 不在同一區（前院、大廳）的人不顯示名字
    OTH.forEach(o => { if (o.rider) { o.c.H.visible = !S.lob; tagOf(o); return; } const ps = POSE_OF[o.p] || (o.mv === 2 ? 'run' : null); o.y = (ps === 'sit' ? sitY(o.tx, o.tz) : 0) + FY(o.x, o.z); const k = Math.min(1, dt * 9), dx = o.tx - o.x, dz = o.tz - o.z, far = Math.hypot(dx, dz);
      if (far > 12) { o.x = o.tx; o.z = o.tz; } else { o.x += dx * k; o.z += dz * k; }
      let df = o.tf - o.f; df = Math.atan2(Math.sin(df), Math.cos(df)); o.f += df * k;
      if (ME) STD.far(o.c, Math.hypot(o.x - ME.x, o.z - ME.z) > (o.c.far ? 16 : 18));
      CULL_S.center.set(o.x, 1.3, o.z); o.c.H.visible = inLob(o.z) === S.lob && CULL_F.intersectsSphere(CULL_S);   // 畫面外的人整個不畫（人物的網格關掉了自動剔除，要自己來）
      o.c.H.position.set(o.x, o.y, o.z); o.c.H.rotation.y = o.f; STD.tick(o.c, dt, o.mv || far > 0.08 ? 1 : 0, o.mv === 2 ? 2.1 : 1.6, ps); tagOf(o); });
    if (STD) { if (ME) tickSpirit(ME.c, dt); OTH.forEach(o => tickSpirit(o.c, dt)); }
    if (MENTOR && S.lob) STD.tick(MENTOR, dt, 0, 1, 'sit');
    tickPet(dt); tickGreek(dt);
    if (STD && TW.s1) { const a2 = t * PI2 * 0.5; TW.s1.H.position.set(-7.4 + Math.sin(a2) * 2.2, 0, 6.2 + Math.cos(a2) * 1.8); TW.s1.H.rotation.y = a2 + Math.PI / 2;
      STD.tick(TW.s1, dt, 1, 1.1); STD.tick(TW.s2, dt, 0); STD.tick(TW.s3, dt, 0); }
    TW.pet.pose(t * PI2 * 4); TW.pet.position.y = 0.12 * Math.abs(Math.sin(t * PI2 * 4));
    TW.mobs.forEach((m) => { const h = Math.abs(Math.sin(t * PI2 * 3 + m.ph)); m.g.position.y = h * 0.45; m.g.scale.set(1 + (1 - h) * 0.1, 0.9 + h * 0.16, 1 + (1 - h) * 0.1); });
    if (CB) CB.late(dt);   // 人物的動作都算完之後，才擺操偶師的手
  }

  // --- 畫質：低 = 不開影子、解析度 1 倍；中 = 影子 1024、1.5 倍；高 = 影子 2048、2 倍 ---
  const QUALITY = [{ name: '低', dpr: 1, shadow: 0 }, { name: '中', dpr: 1.5, shadow: 1024 }, { name: '高', dpr: 2, shadow: 2048 }];
  function applyQuality() { const q = QUALITY[S.quality]; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr)); sun.castShadow = !!q.shadow;
    if (q.shadow && sun.shadow.mapSize.x !== q.shadow) { sun.shadow.mapSize.set(q.shadow, q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } }
  function resize() { W = window.innerWidth; H = window.innerHeight; renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize(); applyQuality();

  // --- 迴圈：分頁藏起來就停，回來不補算 ---
  let last = performance.now(), frames = 0, acc = 0, fps = 0, onStats = null, BG = null; renderer.info.autoReset = false;
  function loop(now) { requestAnimationFrame(loop); if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); renderer.info.reset(); renderer.render(scene, camera);
    let extra = false; OTH.forEach(o => { if (!o.rider || S.lob) return;
      if (!extra) { extra = true; BG = scene.background; scene.background = null; renderer.autoClear = false; sun.shadow.autoUpdate = false; camera.layers.set(1); R.visible = true; }
      poseRobot(o.rs, 0, S.time / 6); renderer.render(scene, camera); });
    if (extra) { scene.background = BG; renderer.autoClear = true; sun.shadow.autoUpdate = true; camera.layers.set(0); R.visible = S.ctrl === 'robot'; }
    frames++; acc += dt; if (acc >= 0.5) { fps = Math.round(frames / acc); frames = 0; acc = 0; if (onStats) onStats({ fps, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }); } }
  requestAnimationFrame(loop);

  return {
    state: S, formName: () => FORM_NAME[S.form], qualityName: () => QUALITY[S.quality].name,
    stick: (x, y) => { S.jx = x; S.jy = y; }, key: (k, on) => { if (on && k === 'e' && !S.keys.e) NW.use(); S.keys[k] = on; },
    nextForm: () => { S.form = FORMS[(FORMS.indexOf(S.form) + 1) % FORMS.length]; return FORM_NAME[S.form]; },
    gesture: () => { if (S.gt < 0) { S.gt = 0; S.gn = (S.gn + 1) % 1000; } },
    zoom: () => { S.zoom = 1 - S.zoom; return S.zoom ? '近' : '遠'; },
    nextQuality: () => { S.quality = (S.quality + 1) % QUALITY.length; applyQuality(); return QUALITY[S.quality].name; },
    lines: () => { S.lines = !S.lines; outlines.forEach(o => { o.visible = S.lines; }); if (STD) STD.lines(S.lines); return S.lines ? '開' : '關'; },
    // 標準人物：換操控的角色、換裝
    hasStd: !!ME, ctrlName: () => CLS_NAME[S.ctrl === 'robot' ? 'rider' : ''], isRider: () => S.ctrl === 'robot',
    walkTo: (cx, cy) => { if (CB && S.ctrl === 'me' && CB.tap(cx, cy)) return true; NDC.set(cx / W * 2 - 1, -(cy / H) * 2 + 1); RAY.setFromCamera(NDC, camera);
      if (!RAY.ray.intersectPlane(GROUND, HIT)) return false;
      if (S.lob && RAY.ray.intersectPlane(GROUND_UP, HIT2) && FY(HIT2.x, HIT2.z) > LOBBY.PH - 0.01) HIT.copy(HIT2);   // 點在高起來的作戰角上
      const z0 = S.ctrl === 'me' ? ME.z : S.z; S.goal = { x: LIMX(HIT.x, z0), z: LIMZ(HIT.z, z0), best: 1e9, t: S.time }; return true; },
    // 職業：一般、機器人騎士（之後加召喚師、陵媒）。存在造型的 cls 裡，代號跟總部的職業代號同一套
    setClass: (cls) => { if (!ME) return ''; S.goal = null; const rider = cls === 'rider';
      if (rider && S.ctrl !== 'robot') { if (S.lob) { ME.x = YARD_DOOR.x + 2; ME.z = YARD_DOOR.z + 4; }   // 機器人太大，進不了大廳，回前院再騎
        S.x = ME.x; S.z = ME.z; S.face = ME.face; S.rp = null; }
      S.ctrl = rider ? 'robot' : 'me'; ACT.pose = null; STD.setLook(ME.c, { cls: cls || null }); setBadge(MYTAG, cls, MYTIER); return CLS_NAME[cls || '']; },
    nextCtrl: () => { const i = CLS.indexOf(ME ? ME.c.look.cls || '' : ''); return NW.setClass(CLS[(i + 1) % CLS.length]); },
    look: () => (ME ? Object.assign({}, ME.c.look) : null), dress: (patch) => { if (ME) STD.setLook(ME.c, patch); return ME ? Object.assign({}, ME.c.look) : null; },
    fromAccount: (b) => (STD ? STD.fromAccount(b) : null),
    options: () => (STD ? { parts: STD.PARTS, names: STD.NAMES, swatch: STD.SWATCH } : null),
    // 動作：sit 坐下（再按一次站起來）、wave 揮手 3 秒、run 跑步開關；騎士坐在機器人上，不能用
    act: (name) => { if (!ME || S.ctrl !== 'me') return null; if (name === 'run') ACT.run = !ACT.run; else if (ACT.pose === name) ACT.pose = null; else { ACT.pose = name; ACT.until = S.time + 3; S.goal = null; }
      return { pose: ACT.pose, run: ACT.run }; },
    acts: () => ({ pose: ACT.pose, run: ACT.run }), near: () => (NEAR ? NEAR.kind : null), onInteract: (fn) => { onInteract = fn; },
    use: () => { const it = NEAR; if (!it || !ME || S.ctrl !== 'me') return null;
      if (it.kind === 'bench') { if (ACT.pose === 'sit') ACT.pose = null; else { ME.x = it.x; ME.z = it.z; ME.face = it.f; ACT.pose = 'sit'; S.goal = null; } }
      else if (it.kind === 'door' && LOBBY) { ME.x = LOBBY.SPAWN.x + (Math.random() - 0.5) * 2; ME.z = LOBBY.SPAWN.z; ME.face = Math.PI; ACT.pose = null; S.goal = null; }   // 進門：直接換到大廳的門口
      else if (it.kind === 'exit') { ME.x = YARD_DOOR.x + (Math.random() - 0.5); ME.z = YARD_DOOR.z; ME.face = YARD_DOOR.f; ACT.pose = null; S.goal = null; }
      if (onInteract) onInteract(it.kind, it); return it.kind; },
    net: NET, emote: (face) => { if (ME) STD.emote(ME.c, face, 5); },
    mem: () => ({ robotShadowCut: A.bot.userData.shadowCut, spirits: SPIRITS.size, chars: STD.all.length, lines: STD.lineCount(), geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures }),   // 測試腳本用：看有沒有漏掉沒還的東西
    combat: CB,
    debugMe: () => (ME ? ME.c.g : null), zone: () => (S.lob ? 'lobby' : 'yard'), height: () => (ME ? ME.y : 0), lobby: () => (LOBBY ? { tris: LOBBY.tris(), ms: LOBBY.ms, seats: LOBBY.seats.length, spawn: LOBBY.SPAWN, exit: LOBBY.EXIT, juke: LOBBY.JUKE } : null),
    gear: (equip) => { if (ME && GEAR3) GEAR3.apply(ME.c, equip); }, gearIds: () => (GEAR3 ? GEAR3.ids() : []), gearOn: () => (ME && ME.c.gearKey) || ',,,',
    debugCam: (o) => { S.dbgCam = o || null; }, debugFace: (f) => { if (ME) ME.face = f; },
    debugScreen: (x, y, z) => { PV.set(x, FY(x, z) + y, z).project(camera); return { x: (PV.x * 0.5 + 0.5) * W, y: (-PV.y * 0.5 + 0.5) * H }; },   // 測試腳本用：世界上的一點在畫面的哪裡
    debugPlace: (x, z) => { if (ME && S.ctrl === 'me') { ME.x = x; ME.z = z; S.goal = null; } },   // 測試腳本用：把人直接放到某個位置
    onStats: (fn) => { onStats = fn; },
    // 大廳第二、三期：花園的狀態、寵物、可以互動的點（測試腳本用 spots 找位置）
    tier: (n) => { MYTIER = n | 0; if (MYTAG && ME) setBadge(MYTAG, ME.c.look.cls, MYTIER); }, myTier: () => MYTIER,
    petJoy: (text) => { if (!PET) return; PET.joy = 1.4; if (text) { PET.tag.b.textContent = text; PET.tag.b.hidden = false; PET.tag.until = S.time + 3; } },
    garden: (st) => { PLOTS = Array.isArray(st) ? st : []; if (LOBBY) LOBBY.setGarden(PLOTS); }, plots: () => PLOTS, setPet, pet: () => (PET ? { name: PET.pet.name, kind: PET.pet.kind, x: PET.x, z: PET.z } : null),
    spots: () => (LOBBY ? { well: WELL, greek: GREEK_AT, ...LOBBY.SPOTS } : null), hint: () => (HINT.hidden ? '' : HINT.textContent), hintMini: () => !HINT.hidden && HINT.classList.contains('mini'), CLS, CLS_NAME,
  };
})();
window.HQ_NEWWORLD = NW;

})();
