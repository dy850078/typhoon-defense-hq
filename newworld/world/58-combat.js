// ===== 練習場的戰鬥畫面：怪、血條、傷害數字、招式特效、使魔、夢魘機甲、操偶師的線 =====
// 算傷害的是伺服器（nw-combat.js），這裡只負責畫；60-play.js 會呼叫 makeCombat，把自己人和別人的位置傳進來
function makeCombat(ctx) {
  const { ME, S, OTH, FY, LAB } = ctx, C3 = window.HQ_CLS3; if (!C3) return null;
  const PI2 = Math.PI * 2, G = new THREE.Group(); scene.add(G);
  const GEO = { sph: sph(1, 12, 8), box: new THREE.BoxGeometry(1, 1, 1), ring: new THREE.RingGeometry(0.86, 1, 40), disc: new THREE.CircleGeometry(1, 32), cyl: new THREE.CylinderGeometry(1, 1, 1, 8), cone: new THREE.ConeGeometry(1, 1, 6), star: new THREE.OctahedronGeometry(1, 0), tube: new THREE.CylinderGeometry(1, 1, 1, 5, 1, true), wire: new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), tri: new THREE.RingGeometry(0.9, 1, 3) };
  const MATS = new Map(), bm = (c, op = 1, add) => { const k = c + '|' + op + '|' + (add ? 1 : 0); let m = MATS.get(k);
    if (!m) { m = new THREE.MeshBasicMaterial({ color: c, transparent: op < 1 || !!add, opacity: op, depthWrite: op >= 1 && !add, side: THREE.DoubleSide, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }); MATS.set(k, m); } return m; };
  const lm = (c) => { const k = 'l' + c; let m = MATS.get(k); if (!m) { m = new THREE.LineBasicMaterial({ color: c }); MATS.set(k, m); } return m; };
  const mesh = (geo, material, parent) => { const m = new THREE.Mesh(geo, material); (parent || G).add(m); return m; };
  const flat = (m) => { m.rotation.x = -Math.PI / 2; return m; };
  const posOf = (id) => { if (id === MYID) return ME; const o = OTH.get(id); return o ? { x: o.x, z: o.z, face: o.f } : null; };
  let MYID = null, MEV = null, SEND = () => {}, onChange = () => {}, onToast = () => {}, onPlayer = () => {};
  const WHO = new Map(), MOBS = new Map(), ZONES = new Map();

  // ---------- 一次性的特效：每個特效是一個物件加一個「照進度擺樣子」的函式 ----------
  const FX = [];
  const fx = (o, dur, step, done) => { FX.push({ o, t: 0, dur, step, done }); step(0, o); return o; };
  const ring = (x, z, r, col, dur = 0.5, from = 0.2) => fx(flat(mesh(GEO.ring, bm(col, 0.9).clone())), dur, (k, o) => { const s = r * (from + (1 - from) * (1 - (1 - k) * (1 - k))); o.position.set(x, FY(x, z) + 0.08, z); o.scale.set(s, s, s); o.material.opacity = 0.9 * (1 - k); }, (o) => o.material.dispose());
  const burst = (x, y, z, col, n = 8, sp = 3, size = 0.14, dur = 0.6, geo = GEO.sph) => { for (let i = 0; i < n; i++) { const a = Math.random() * PI2, u = Math.random() * 0.9 + 0.2, vx = Math.cos(a) * sp * u, vz = Math.sin(a) * sp * u, vy = sp * (0.4 + Math.random());
    fx(mesh(geo, bm(col)), dur * (0.7 + Math.random() * 0.5), (k, o) => { o.position.set(x + vx * k, y + vy * k - 3.5 * k * k, z + vz * k); const s = size * (1 - k * 0.8); o.scale.set(s, s, s); o.rotation.set(k * 5, k * 3, 0); }); } };
  const shot = (a, b, col, dur, size = 0.2, geo = GEO.sph, arc = 0.6, hit) => fx(mesh(geo, bm(col)), dur, (k, o) => { o.position.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * arc, a.z + (b.z - a.z) * k); o.scale.setScalar(size); o.rotation.set(k * 9, k * 7, 0); }, () => { if (hit) hit(); });
  const rise = (x, z, col, n = 6, r = 0.8, h = 2.4, size = 0.12, dur = 0.9, geo = GEO.sph) => { for (let i = 0; i < n; i++) { const a = Math.random() * PI2, d = Math.random() * r, d0 = Math.random() * 0.3;
    fx(mesh(geo, bm(col, 0.9)), dur, (k, o) => { const kk = Math.max(0, (k - d0) / (1 - d0)); o.visible = k >= d0; o.position.set(x + Math.cos(a + kk * 2) * d, FY(x, z) + 0.2 + kk * h, z + Math.sin(a + kk * 2) * d); const s = size * Math.sin(Math.min(1, kk * 1.2) * Math.PI); o.scale.set(s, s, s); }); } };
  const head = (p, h = 1.5) => ({ x: p.x, y: FY(p.x, p.z) + h, z: p.z });
  // 紫色骷髏泡泡：半透明的泡泡裡面一顆小骷髏
  const skullBubble = (x, z, r, big) => { const g = new THREE.Group(); G.add(g); mesh(GEO.sph, bm('#b07ae6', 0.42), g); const sk = mesh(GEO.sph, bm('#fbf7ee'), g); sk.scale.set(0.5, 0.56, 0.5); const jaw = mesh(GEO.box, bm('#fbf7ee'), g); jaw.scale.set(0.42, 0.26, 0.4); jaw.position.y = -0.42;
    [-1, 1].forEach(s => { const e = mesh(GEO.sph, bm('#2b2a33'), g); e.scale.set(0.13, 0.16, 0.08); e.position.set(0.19 * s, 0.05, 0.44); }); const a = Math.random() * PI2, d = Math.random() * r, size = (big || 0.34) * (0.8 + Math.random() * 0.5), d0 = Math.random() * 0.35;
    return fx(g, 1.5, (k, o) => { const kk = Math.max(0, (k - d0) / (1 - d0)); o.visible = k >= d0; o.position.set(x + Math.cos(a) * d + Math.sin(kk * 8 + a) * 0.15, FY(x, z) + 0.3 + kk * 2.6, z + Math.sin(a) * d); const s = size * (kk > 0.9 ? 1 + (kk - 0.9) * 6 : Math.min(1, kk * 5)); o.scale.set(s, s, s); o.rotation.y = Math.atan2(camera.position.x - o.position.x, camera.position.z - o.position.z); },
      (o) => { burst(o.position.x, o.position.y, o.position.z, '#c9a2f2', 4, 1.2, 0.08, 0.35); }); };
  // 鍊成陣：地上一圈加三角形
  const circle = (x, z, r, col, dur) => { const g = new THREE.Group(); G.add(g); flat(g); [1, 0.72].forEach(s => { const m = mesh(GEO.ring, bm(col, 0.9), g); m.scale.setScalar(s); }); [0, Math.PI].forEach(a => { const m = mesh(GEO.tri, bm(col, 0.9), g); m.rotation.z = a; m.scale.setScalar(0.74); });
    return fx(g, dur, (k, o) => { o.position.set(x, FY(x, z) + 0.07, z); const s = r * Math.min(1, k * 6) * (k > 0.8 ? 1 - (k - 0.8) * 5 : 1); o.scale.set(s, s, s); o.rotation.z = k * 2; }); };

  // ---------- 怪 ----------
  const eyes = (g, y, z, dx, r, col) => [-1, 1].forEach(k => { part(g, sph(r, 8, 6), col || INK, { pos: [dx * k, y, z], scale: [1, 1.25, 0.5], noLine: true, shadow: false, mat: basic(col || INK) }); });
  // 霧林的怪。g.anim(m, t)：每一格照狀態擺一下樣子（整理傘、蓄力、睡著）
  const leaf = (g, x, y, z, ry, col, s = 1) => part(g, sph(0.16, 8, 6), col, { pos: [x, y, z], scale: [0.55 * s, 0.22 * s, 1.1 * s], rot: [0.5, ry, 0], noLine: true });
  const MODEL = {
    // 苔球：毛茸茸的綠球，頭上兩片葉子，半瞇著眼（很懶）
    moss: (g, lv) => { const c = lv > 30 ? '#5f9a8a' : lv > 4 ? '#7fb069' : '#9cc77a', d = lv > 30 ? '#4a7d70' : '#5f9655'; part(g, sph(0.56, 16, 12), c, { pos: [0, 0.5, 0], scale: [1, 0.88, 1] });
      for (let i = 0; i < 9; i++) { const a = i * 2.4, y = 0.3 + (i % 3) * 0.22; part(g, sph(0.15, 6, 5), d, { pos: [Math.cos(a) * 0.46, y, Math.sin(a) * 0.46 - 0.08], scale: [1, 0.7, 1], noLine: true, shadow: false }); }
      leaf(g, 0.08, 1.02, 0, 0.5, '#b8dc7a', 1.3); leaf(g, -0.1, 0.98, 0.02, -0.9, '#a5cf6a', 1.1); eyes(g, 0.52, 0.5, 0.18, 0.085); [-1, 1].forEach(k => part(g, GEO.box, c, { pos: [0.18 * k, 0.61, 0.52], scale: [0.2, 0.09, 0.06], noLine: true, shadow: false }));
      part(g, sph(0.06, 6, 5), INK, { pos: [0, 0.38, 0.53], scale: [1.4, 0.5, 0.4], noLine: true, shadow: false, mat: basic(INK) }); },
    // 傘菇精：白白的身體撐著一把菇傘；傘另外放一組，整理的時候會歪掉
    puff: (g, lv) => { const cap = lv > 30 ? '#6a8fd0' : lv > 13 ? '#b56bd0' : '#e58a8a'; part(g, sph(0.33), '#f3e9d2', { pos: [0, 0.36, 0], scale: [1, 1.15, 1] }); eyes(g, 0.42, 0.3, 0.12, 0.07);
      [-1, 1].forEach(k => part(g, sph(0.07, 6, 5), '#f7a8c4', { pos: [0.2 * k, 0.33, 0.27], scale: [1, 0.6, 0.4], noLine: true, shadow: false })); part(g, sph(0.09, 6, 5), '#f3e9d2', { pos: [0.3, 0.5, 0.12], noLine: true });
      const u = new THREE.Group(); g.add(u); u.position.set(0.3, 0.5, 0.12); part(u, GEO.cyl, '#c9b48a', { pos: [0, 0.42, 0], scale: [0.035, 0.85, 0.035], noLine: true }); part(u, sph(0.62, 14, 8), cap, { pos: [-0.26, 0.86, -0.1], scale: [1, 0.5, 1] });
      [[-0.02, 1.1, 0.2], [-0.5, 1.07, 0.05], [-0.22, 1.16, -0.32], [-0.3, 1.02, 0.36]].forEach(p => part(u, sph(0.1, 8, 6), '#fbf7ee', { pos: p, scale: [1, 0.4, 1], noLine: true, shadow: false }));
      g.anim = (m, t) => { const tidy = m.fl & 2048, cast = m.fl & 4096; u.rotation.z = tidy ? -0.7 + Math.sin(t * 14) * 0.12 : cast ? Math.sin(t * 22) * 0.25 : Math.sin(t * 2 + m.ph) * 0.05; u.rotation.x = tidy ? 0.35 : 0; }; },
    // 露水靈：半透明的水滴，飄在半空，眼角永遠掛著一滴淚
    dew: (g, lv) => { g.float = 0.45; const c = lv > 30 ? '#8fb0f0' : '#8fd3ee', mat = new THREE.MeshToonMaterial({ color: c, transparent: true, opacity: 0.82 }); part(g, sph(0.46, 16, 12), c, { pos: [0, 0.5, 0], scale: [1, 1.05, 1], mat }); part(g, GEO.cone, c, { pos: [0, 1.08, 0], scale: [0.3, 0.56, 0.3], mat, noLine: true });
      part(g, sph(0.13, 8, 6), '#ffffff', { pos: [-0.17, 0.72, 0.32], scale: [1, 1.3, 0.5], noLine: true, shadow: false, mat: basic('#ffffff') }); eyes(g, 0.5, 0.42, 0.16, 0.075); part(g, sph(0.05, 6, 5), '#dff6ff', { pos: [0.25, 0.36, 0.42], scale: [1, 1.5, 0.6], noLine: true, shadow: false, mat: basic('#dff6ff') });
      g.anim = (m, t) => { g.rotation.z = Math.sin(t * 1.7 + m.ph) * 0.08; }; },
    // 老樹公的花：一根莖、一圈花瓣、一張笑臉，左右搖
    bloom: (g) => { part(g, GEO.cyl, '#6fa35c', { pos: [0, 0.4, 0], scale: [0.07, 0.8, 0.07], noLine: true }); leaf(g, 0.2, 0.3, 0, 1.2, '#8cc270', 1.5); leaf(g, -0.2, 0.42, 0, -1.2, '#8cc270', 1.4);
      const f = new THREE.Group(); g.add(f); f.position.y = 0.95; for (let i = 0; i < 6; i++) { const a = i / 6 * PI2; part(f, sph(0.2, 8, 6), '#f6a8c8', { pos: [Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0], scale: [1, 1, 0.45], noLine: true }); }
      part(f, sph(0.24, 10, 8), '#ffe27a', { pos: [0, 0, 0.05], scale: [1, 1, 0.6] }); eyes(f, 0.03, 0.2, 0.08, 0.04); g.anim = (m, t) => { f.rotation.z = Math.sin(t * 3 + m.ph) * 0.25; g.rotation.z = Math.sin(t * 3 + m.ph) * 0.1; }; },
    // 霧林老樹公：粗樹幹、一大蓬樹冠、白鬍子、粗眉毛，頭上戴著一圈花（牠的假髮）；常常講到一半就睡著
    elder: (g) => { g.sc = 1.3; const bark = '#8a6a4a', dark = '#6f5238'; part(g, GEO.cyl, bark, { pos: [0, 1.3, 0], scale: [0.95, 2.6, 0.9] }); part(g, GEO.cyl, bark, { pos: [0, 0.3, 0], scale: [1.25, 0.6, 1.2] });
      for (let i = 0; i < 6; i++) { const a = i / 6 * PI2 + 0.4; part(g, GEO.cone, dark, { pos: [Math.cos(a) * 1.25, 0.16, Math.sin(a) * 1.2], scale: [0.3, 1.1, 0.3], rot: [Math.sin(a) * -1.25, 0, Math.cos(a) * 1.25], noLine: true }); }
      [[0, 3.3, 0, 1.75], [1.15, 2.95, 0.2, 1.1], [-1.2, 3.0, -0.1, 1.15], [0.2, 3.1, -1.0, 1.1], [-0.3, 4.15, 0.1, 1.05]].forEach((p, i) => part(g, sph(1, 14, 10), i % 2 ? '#6fa35c' : '#7fb069', { pos: [p[0], p[1], p[2]], scale: [p[3], p[3] * 0.8, p[3]] }));
      const wig = new THREE.Group(); g.add(wig); wig.position.y = 5.05; for (let i = 0; i < 7; i++) { const a = i / 7 * PI2, f = new THREE.Group(); wig.add(f); f.position.set(Math.cos(a) * 0.62, Math.sin(i * 1.3) * 0.06, Math.sin(a) * 0.62); f.scale.setScalar(1.5);
        for (let j = 0; j < 5; j++) { const b = j / 5 * PI2; part(f, sph(0.13, 6, 5), i % 2 ? '#f6a8c8' : '#ffd0e0', { pos: [Math.cos(b) * 0.17, 0, Math.sin(b) * 0.17], scale: [1, 0.5, 1], noLine: true, shadow: false }); } part(f, sph(0.11, 6, 5), '#ffe27a', { pos: [0, 0.04, 0], noLine: true, shadow: false }); }
      const lids = []; [-1, 1].forEach(k => { part(g, sph(0.15, 10, 8), '#fbf7ee', { pos: [0.36 * k, 1.9, 0.86], scale: [1, 1, 0.5], noLine: true, shadow: false, mat: basic('#fbf7ee') }); part(g, sph(0.07, 8, 6), INK, { pos: [0.36 * k, 1.88, 0.94], scale: [1, 1, 0.5], noLine: true, shadow: false, mat: basic(INK) });
        lids.push(part(g, sph(0.17, 10, 8), bark, { pos: [0.36 * k, 1.97, 0.9], scale: [1.05, 0.6, 0.5], noLine: true, shadow: false })); part(g, sph(0.2, 8, 6), '#fbf7ee', { pos: [0.38 * k, 2.2, 0.86], scale: [1.3, 0.36, 0.5], rot: [0, 0, -0.3 * k], noLine: true, shadow: false }); });
      part(g, sph(0.17, 8, 6), dark, { pos: [0, 1.62, 0.98], scale: [0.8, 1.1, 0.8], noLine: true }); part(g, sph(0.5, 12, 8), '#fbf7ee', { pos: [0, 1.0, 0.86], scale: [1, 1.25, 0.45] }); [-1, 1].forEach(k => part(g, sph(0.3, 10, 8), '#fbf7ee', { pos: [0.36 * k, 1.22, 0.84], scale: [1, 1.1, 0.45], noLine: true }));
      const arms = [-1, 1].map(k => { const a = new THREE.Group(); g.add(a); a.position.set(0.9 * k, 1.9, 0); part(a, GEO.cyl, bark, { pos: [0.55 * k, 0.2, 0], scale: [0.16, 1.3, 0.16], rot: [0, 0, -1.1 * k] }); part(a, sph(0.42, 10, 8), '#7fb069', { pos: [1.2 * k, 0.5, 0], scale: [1, 0.8, 1] }); return a; });
      g.anim = (m, t) => { const busy = m.rootT > 0, nod = busy ? 0 : Math.max(0, Math.sin(t * 0.5 + 1)) > 0.86 ? 1 : 0; lids.forEach(l => { l.position.y = 1.97 - (nod ? 0.09 : 0); }); g.rotation.x = nod ? 0.06 : 0; wig.rotation.y = t * 0.3; wig.position.y = 5.05 + (m.hurtT > 0 ? 0.3 : 0);
        arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (busy ? -0.9 + Math.sin(t * 18) * 0.15 : Math.sin(t * 1.2 + i) * 0.08); }); }; },
  };
  const mkBar = () => { const b = document.createElement('div'), i = document.createElement('i'), n = document.createElement('span'); b.className = 'cb-bar'; b.append(n, i); b.hidden = true; LAB.appendChild(b); return { b, i, n }; };
  function addMob(d) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body); MODEL[d.kind](body, d.lv); const sc = body.sc || 1; body.scale.setScalar(sc); G.add(g);
    const h = (C3.MOBS[d.kind].h || 1.1) * sc, m = { id: d.id, kind: d.kind, lv: d.lv, x: d.x, z: d.z, tx: d.x, tz: d.z, hp: d.hp, max: d.max, fl: d.hp ? 0 : 256, g, body, h, sc, ph: Math.random() * 6, bar: mkBar(), fxo: {}, show: 0, f: 0, hurtT: 0 };
    m.bar.n.textContent = C3.MOBS[d.kind].add ? C3.MOBS[d.kind].name : 'Lv.' + d.lv + ' ' + C3.MOBS[d.kind].name; g.position.set(d.x, FY(d.x, d.z), d.z); g.visible = false; MOBS.set(d.id, m);
  }
  // 掛在怪身上的狀態：框住、結冰、中毒、暈、被關進匣子
  const STATE = {
    1: (m) => { const o = new THREE.LineSegments(GEO.wire, lm('#7fb4ff')); o.scale.set(m.sc * 1.5, m.h * 1.05, m.sc * 1.5); o.position.y = m.h * 0.52; const f = mesh(GEO.box, bm('#7fb4ff', 0.14), o); f.scale.setScalar(1); return o; },
    4: (m) => { const o = mesh(new THREE.IcosahedronGeometry(1, 0), bm('#bfe9ff', 0.55), null); o.scale.set(m.sc * 0.95, m.h * 0.62, m.sc * 0.95); o.position.y = m.h * 0.5; return o; },
    8: (m) => { const o = new THREE.Group(); [0, 1, 2].forEach(i => { const b = mesh(GEO.sph, bm('#b07ae6', 0.7), o); b.scale.setScalar(0.11 + i * 0.03); b.position.set(Math.cos(i * 2.1) * 0.35, m.h + 0.15 + i * 0.12, Math.sin(i * 2.1) * 0.35); }); o.spin = 2; return o; },
    2: (m) => { const o = new THREE.Group(); [0, 1, 2].forEach(i => { const b = mesh(GEO.star, bm('#ffd76a'), o); b.scale.setScalar(0.1); b.position.set(Math.cos(i * 2.1) * 0.45, m.h + 0.25, Math.sin(i * 2.1) * 0.45); }); o.spin = 5; return o; },
    64: (m) => { const o = mesh(GEO.box, bm('#e9c46a', 0.5), null); o.scale.set(m.sc * 1.5, m.h * 1.1, m.sc * 1.5); o.position.y = m.h * 0.55; o.add(new THREE.LineSegments(GEO.wire, lm('#fff3c4'))); return o; },
    128: (m) => { const o = flat(mesh(GEO.ring, bm('#c9a2f2', 0.7), null)); o.scale.setScalar(m.sc * 0.9); o.position.y = 0.06; return o; },
    1024: (m) => { const o = flat(mesh(GEO.disc, bm('#bfe9ff', 0.5), null)); o.scale.setScalar(m.sc * 0.8); o.position.y = 0.05; return o; },
  };
  const setMob = (a) => { const m = MOBS.get(a[0]); if (!m) return; m.tx = a[1]; m.tz = a[2]; if (a[3] < m.hp) m.hurtT = 0.25; m.hp = a[3]; const was = m.fl; m.fl = a[4]; m.tied = a[5]; m.link = a[6];
    if ((was & 256) && !(m.fl & 256)) { m.x = m.tx; m.z = m.tz; m.show = 0; }
    Object.keys(STATE).forEach(k => { const on = !!(m.fl & k) && !(m.fl & 256); if (on && !m.fxo[k]) { m.fxo[k] = STATE[k](m); m.g.add(m.fxo[k]); } else if (!on && m.fxo[k]) { m.g.remove(m.fxo[k]); delete m.fxo[k]; } }); };
  const PV = new V3(), put2d = (el, x, y, z) => { PV.set(x, y, z).project(camera); const on = PV.z < 1 && Math.abs(PV.x) < 1.1 && Math.abs(PV.y) < 1.1; el.style.display = on ? '' : 'none'; if (on) el.style.transform = 'translate(' + ((PV.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-PV.y * 0.5 + 0.5) * H).toFixed(1) + 'px) translate(-50%,-100%)'; return on; };
  // 傷害數字
  const NUMS = [];
  const num = (x, y, z, text, cls) => { if (NUMS.length > 28) { const o = NUMS.shift(); o.el.remove(); } const el = document.createElement('div'); el.className = 'cb-num ' + (cls || ''); el.textContent = text; LAB.appendChild(el); NUMS.push({ el, x: x + (Math.random() - 0.5) * 0.6, y, z, t: 0 }); };

  // ---------- 目標 ----------
  let TARGET = null;
  const TRING = flat(mesh(GEO.ring, bm('#ff8a6b', 0.95))); TRING.visible = false; TRING.renderOrder = 4;
  const setTarget = (id, quiet) => { TARGET = id && MOBS.get(id) && !(MOBS.get(id).fl & 256) ? id : null; if (!quiet) SEND('cb:target', TARGET); onChange(); };
  const RAY = new THREE.Raycaster(), NDC = new THREE.Vector2(), GP = new THREE.Plane(new V3(0, 1, 0), 0), HP3 = new V3();
  // 點到怪：選牠當目標（走過去自動打）；回傳有沒有點到
  // 點畫面：怪和地上的東西都可能被點到，挑離手指最近的那一個（地上的東西小，讓它優先一點）
  // 點到別的玩家：跳出「邀請組隊」的小紙條（大廳裡也可以）
  function tap(cx, cy) { if (!MEV) return false; NDC.set(cx / W * 2 - 1, -(cy / H) * 2 + 1); RAY.setFromCamera(NDC, camera); let kind = '', hit = null, bs = 1;
    const see = (k, o, x, y, z, r) => { PV.set(x, y, z); const sc = RAY.ray.distanceToPoint(PV) / r; if (sc < bs) { bs = sc; kind = k; hit = o; } };
    OTH.forEach((o, id) => { if (WHO.has(id)) see('who', id, o.x, FY(o.x, o.z) + 0.9, o.z, 0.8); }); if (kind === 'who') bs *= 0.5;   // 人和怪疊在一起的時候，點到人優先
    if (S.lob) { if (kind === 'who') { onPlayer(hit, cx, cy); return true; } onPlayer(null); return false; }
    MOBS.forEach(m => { if (!(m.fl & 256) && m.g.visible) see('mob', m, m.x, FY(m.x, m.z) + m.h * 0.5, m.z, Math.max(0.9, m.h * 0.6)); }); DROPS.forEach(o => see('drop', o, o.x, FY(o.x, o.z) + 0.3, o.z, 1.1));
    if (kind === 'who') { onPlayer(hit, cx, cy); return true; } onPlayer(null);
    if (kind === 'drop') { WANT = hit.id; if (Math.hypot(hit.x - ME.x, hit.z - ME.z) <= C3.PICK_R) { pick(hit); return true; } return false; }   // 遠的話先讓人走過去，走到旁邊就撿
    WANT = null;
    if (kind !== 'mob') { if (TARGET && RAY.ray.intersectPlane(GP, HP3)) setTarget(null); return false; } HOLD = false; setTarget(hit.id); S.goal = null; return true; }
  // ---------- 地上的掉落物：一個小束口袋（補品粉紅、雜物牛皮色），快消失的時候會閃 ----------
  const DROPS = new Map(); let WANT = null;
  const addDrop = (d) => { if (DROPS.has(d.id)) return; const g = new THREE.Group(), misc = /^(seed|twig)/.test(d.k), c1 = misc ? '#c9a06a' : '#f6a9c0', c2 = misc ? '#8a5a3c' : '#d2364a'; G.add(g);
    part(g, sph(0.26, 10, 8), c1, { pos: [0, 0.24, 0], scale: [1, 0.86, 1] }); part(g, GEO.cyl, c1, { pos: [0, 0.5, 0], scale: [0.1, 0.12, 0.1], noLine: true }); part(g, GEO.cyl, c2, { pos: [0, 0.44, 0], scale: [0.115, 0.04, 0.115], noLine: true });
    const glow = flat(mesh(GEO.ring, bm('#ffe9a8', 0.8).clone(), g)); glow.position.y = 0.05; DROPS.set(d.id, { id: d.id, k: d.k, x: d.x, z: d.z, g, glow, t: 0, left: (d.left || C3.DROP_MS) / 1000, asked: 0 }); };
  const dropGone = (e) => { const o = DROPS.get(e.id); if (!o) return; if (e.by) burst(o.x, FY(o.x, o.z) + 0.4, o.z, '#ffe9a8', 6, 2, 0.08, 0.35, GEO.star); G.remove(o.g); o.glow.material.dispose(); DROPS.delete(e.id); if (WANT === e.id) WANT = null; };
  const pick = (o) => { if (o.asked > S.time) return; o.asked = S.time + 1; WANT = null; SEND('cb:pick', o.id, (r) => { if (r && r.error) onToast(r.error); else if (r && r.name) onToast('撿到 ' + r.name); }); };
  const tickDrops = (dt) => { DROPS.forEach(o => { o.t += dt; o.left -= dt; if (o.left < -3) return dropGone({ id: o.id }); const pop = Math.min(1, o.t * 4), y = FY(o.x, o.z) + Math.sin(Math.min(1, o.t * 2.5) * Math.PI) * 0.7 + Math.abs(Math.sin(o.t * 2.4)) * 0.08;
      o.g.position.set(o.x, y, o.z); o.g.rotation.y = o.t * 1.2; o.g.scale.setScalar(pop * 1.5); o.g.visible = o.left > 10 || Math.floor(o.t * 6) % 2 === 0; const gs = 0.42 + Math.sin(o.t * 4) * 0.05; o.glow.scale.setScalar(gs); o.glow.position.y = 0.05 - (y - FY(o.x, o.z));
      if (WANT === o.id && ME && Math.hypot(o.x - ME.x, o.z - ME.z) <= C3.PICK_R) pick(o); }); };
  const nearest = (r) => { let best = null, bd = r; MOBS.forEach(m => { if (m.fl & 256) return; const d = Math.hypot(m.x - ME.x, m.z - ME.z); if (d < bd) { bd = d; best = m; } }); return best; };

  // ---------- 使魔（繪師的聖誕外星人）和夢魘機甲 ----------
  // ---- 使魔：照繪師的聖誕圖做（星星臉、三眼花農、花圈長老），每一隻有自己的小動作（g.anim）----
  const blob = (pts, depth, bevel) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); sh.splineThru(pts.slice(1).concat([pts[0]]).map(q => new THREE.Vector2(q[0], q[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 }); g.translate(0, 0, -depth / 2); return g; };
  const lathe = (pts, seg = 14) => new THREE.LatheGeometry(pts.map(q => new THREE.Vector2(q[0], q[1])), seg);
  const starPts = (n, tips, dip, rot = 0) => { const o = []; for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? dip : tips[(i / 2) % tips.length]; o.push([Math.sin(a) * r, Math.cos(a) * r]); } return o; };
  const LV = new V3(), LW = new V3();
  const limb = (g, col, a, b, r, o) => { LV.set(...a); LW.set(...b); const m = part(g, GEO.cyl, col, Object.assign({ scale: [r, LV.distanceTo(LW), r] }, o)); m.position.copy(LV).add(LW).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, LW.sub(LV).normalize()); return m; };
  const flatM = (c) => basic(c), dot = (g, col, pos, sc, rot) => part(g, sph(1, 10, 8), col, { pos, scale: sc, rot, noLine: true, shadow: false, mat: flatM(col) });
  const GF = { starHead: blob(starPts(5, [0.62, 0.5, 0.46, 0.5, 0.6], 0.3, 0.35), 0.16, 0.09), leaf: blob([[0, 0], [0.2, 0.25], [0.24, 0.7], [0.14, 1.1], [0, 1.22], [-0.12, 1.05], [-0.2, 0.65], [-0.16, 0.22]], 0.03, 0.02),
    flatHead: blob([[-0.78, 0.1], [-0.4, 0.2], [0, 0.23], [0.4, 0.2], [0.78, 0.1], [0.4, -0.02], [0.17, -0.2], [0.11, -0.62], [-0.11, -0.62], [-0.17, -0.2], [-0.4, -0.02]], 0.24, 0.09),
    star5: blob(starPts(5, [0.2], 0.09), 0.03, 0.02), petal: blob([[0, 0], [0.09, 0.08], [0.1, 0.22], [0, 0.3], [-0.1, 0.22], [-0.09, 0.08]], 0.02, 0.015), holly: blob([[0, 0], [0.07, 0.06], [0.04, 0.12], [0.08, 0.18], [0, 0.26], [-0.08, 0.18], [-0.04, 0.12], [-0.07, 0.06]], 0.015, 0.01),
    pot: new THREE.CylinderGeometry(0.13, 0.085, 0.24, 10), cone: new THREE.ConeGeometry(1, 1, 8), tor: new THREE.TorusGeometry(0.27, 0.085, 7, 18), scarf: new THREE.TorusGeometry(0.26, 0.09, 7, 16) };
  const FAM = {
    // 星星臉：粉紅色歪歪的星星頭、垂垂的黑眼睛和紅嘴唇、細長的深綠身體、背後兩片有條紋的淺綠翅膀
    0: (g) => { const DG = '#2f5d3a', PK = '#f4a6c0';
      part(g, lathe([[0.3, 0], [0.24, 0.12], [0.17, 0.5], [0.12, 0.9], [0.085, 1.12], [0.07, 1.2]]), DG, {}); limb(g, DG, [0.13, 0.86, 0.06], [0.2, 0.52, 0.16], 0.04, {}); limb(g, DG, [-0.13, 0.86, 0.06], [-0.2, 0.56, 0.14], 0.04, {});
      const hd = new THREE.Group(); hd.position.set(0, 1.5, 0.02); hd.rotation.z = -0.12; g.add(hd); part(hd, GF.starHead, PK, { line: 0.03 });
      dot(hd, '#ffc4d6', [-0.16, 0.06, 0.17], [0.2, 0.13, 0.02]); dot(hd, '#ffc4d6', [0.2, -0.12, 0.17], [0.1, 0.07, 0.02]);
      [-1, 1].forEach(k => { dot(hd, INK, [0.15 * k + 0.02, 0.02, 0.19], [0.1, 0.062, 0.03], [0, 0, -0.5 * k]); dot(hd, '#fffaf0', [0.13 * k + 0.02, 0.035, 0.215], [0.028, 0.022, 0.01]);
        [0, 1].forEach(i => limb(hd, INK, [0.22 * k + 0.02, 0.0 + i * 0.03, 0.2], [0.29 * k + 0.02, -0.03 + i * 0.05, 0.19], 0.008, { noLine: true, shadow: false, mat: flatM(INK) })); });
      limb(hd, '#c97f98', [0.02, -0.02, 0.2], [0.035, -0.11, 0.21], 0.008, { noLine: true, shadow: false, mat: flatM('#c97f98') });
      [-1, 1].forEach(k => dot(hd, '#d23a4a', [0.02 + 0.028 * k, -0.165, 0.2], [0.04, 0.026, 0.02])); dot(hd, '#d23a4a', [0.02, -0.195, 0.2], [0.05, 0.026, 0.02]);
      const wings = [-1, 1].map(k => { const w = new THREE.Group(); w.position.set(0.05 * k, 0.92, -0.1); g.add(w); const l = part(w, GF.leaf, '#a9e0a0', { rot: [0.1, 0, -0.95 * k], line: 0.02 });
        [-0.07, 0, 0.07].forEach(x => part(l, GEO.box, '#86cf86', { pos: [x, 0.62, 0.035], scale: [0.02, 0.85 - Math.abs(x) * 3, 0.01], noLine: true, shadow: false, mat: flatM('#86cf86') }));
        const l2 = part(w, GF.leaf, '#bfe9b4', { rot: [0.1, 0, -1.45 * k], scale: [0.8, 0.72, 1], pos: [0, -0.02, -0.02], line: 0.02 }); part(l2, GEO.box, '#86cf86', { pos: [0, 0.62, 0.035], scale: [0.02, 0.8, 0.01], noLine: true, shadow: false, mat: flatM('#86cf86') }); w.k = k; return w; });
      g.anim = (t) => { wings.forEach(w => { w.rotation.y = w.k * (0.25 + Math.sin(t * 7) * 0.3); }); hd.rotation.z = -0.12 + Math.sin(t * 1.7) * 0.08; hd.rotation.y = Math.sin(t * 1.1) * 0.15; hd.rotation.x = -0.22; }; g.scale.setScalar(1.25); g.H = 2.5; },
    // 三眼花農：灰綠色扁扁寬寬的頭、一排三顆黃眼睛、頭上兩朵星星花，深綠的高個子，手上捧著一盆紅色風車花
    1: (g) => { const DG = '#2f5d3a', GY = '#93a58c';
      part(g, lathe([[0.36, 0], [0.3, 0.14], [0.24, 0.7], [0.27, 1.25], [0.25, 1.5], [0.12, 1.62], [0.1, 1.75]]), DG, {});
      limb(g, DG, [-0.27, 1.45, 0], [-0.36, 0.95, 0.04], 0.06, {}); limb(g, DG, [-0.36, 0.95, 0.04], [-0.33, 0.5, 0.1], 0.05, {}); dot(g, DG, [-0.33, 0.46, 0.1], [0.06, 0.08, 0.06]);
      limb(g, DG, [0.27, 1.45, 0], [0.42, 1.08, 0.12], 0.06, {}); limb(g, DG, [0.42, 1.08, 0.12], [0.3, 1.05, 0.42], 0.05, {});
      const hd = new THREE.Group(); hd.position.set(0, 2.25, 0); g.add(hd); part(hd, GF.flatHead, GY, { line: 0.03 }); dot(hd, '#a9b8a2', [0, 0.14, 0.2], [0.5, 0.05, 0.02]);
      [-1, 0, 1].forEach(k => { dot(hd, '#6f8068', [0.23 * k, 0.07, 0.205], [0.125, 0.09, 0.02]); dot(hd, '#f2d86a', [0.23 * k, 0.07, 0.215], [0.1, 0.068, 0.02]); dot(hd, '#fff3b0', [0.23 * k - 0.03, 0.09, 0.228], [0.032, 0.022, 0.01]); });
      const ants = [-1, 1].map(k => { const a = new THREE.Group(); a.position.set(0.2 * k, 0.28, 0); hd.add(a); limb(a, '#6fbf6a', [0, 0, 0], [0.05 * k, 0.26, 0], 0.016, { noLine: true }); limb(a, '#6fbf6a', [0.05 * k, 0.26, 0], [0.14 * k, 0.46, 0], 0.016, { noLine: true });
        const st = part(a, GF.star5, '#7fcf6a', { pos: [0.16 * k, 0.56, 0], rot: [0, 0, 0.3 * k], line: 0.018 }); dot(st, '#e9c46a', [0, 0, 0.035], [0.045, 0.045, 0.02]); a.k = k; return a; });
      const pot = new THREE.Group(); pot.position.set(0.3, 1.02, 0.5); g.add(pot); part(pot, GF.pot, '#f08aa8', { line: 0.02 }); part(pot, GEO.cyl, '#f6a9c0', { pos: [0, 0.12, 0], scale: [0.15, 0.04, 0.15], line: 0.02 }); limb(pot, '#3f8a4f', [0, 0.12, 0], [0, 0.4, 0], 0.018, { noLine: true });
      const fl = new THREE.Group(); fl.position.set(0, 0.5, 0.02); pot.add(fl); for (let i = 0; i < 5; i++) { const pt = part(fl, GF.petal, i % 2 ? '#c8323c' : '#d9434c', { rot: [0, 0, i * PI2 / 5], line: 0.014 }); part(pt, GEO.box, '#8f1f2a', { pos: [0.02, 0.16, 0.02], scale: [0.012, 0.2, 0.008], rot: [0, 0, -0.25], noLine: true, shadow: false, mat: flatM('#8f1f2a') }); }
      dot(fl, '#e9c46a', [0, 0, 0.03], [0.05, 0.05, 0.03]);
      g.anim = (t) => { fl.rotation.z = t * 1.6; pot.rotation.z = Math.sin(t * 1.3) * 0.08; ants.forEach(a => { a.rotation.z = Math.sin(t * 2 + a.k) * 0.14; }); hd.rotation.z = Math.sin(t * 0.9) * 0.05; hd.rotation.x = -0.3; }; g.scale.setScalar(1.25); g.H = 3.75; },
    // 花圈長老：最高的一隻。淺綠的頭有長長的鳥喙和鬚，頭上頂著掛鈴鐺的聖誕花圈，粉紅條紋長袍配白色內襯，手上拿著一串小燈
    2: (g) => { const PK = '#f2a3b6', PD = '#e2869f', LG = '#7fcf7a', MG = '#5fb863';
      part(g, lathe([[0.58, 0], [0.52, 0.1], [0.44, 1.0], [0.4, 1.9], [0.36, 2.2], [0.2, 2.34], [0.16, 2.4]], 18), PK, {});
      part(g, lathe([[0.5, 0.02], [0.45, 1.0], [0.41, 1.9], [0.3, 2.22]], 8).rotateY(-Math.PI / 8), '#fbf3e4', { pos: [0, 0.02, 0.05], scale: [0.62, 1, 1], noLine: true });
      [-1, 1].forEach(k => { [0.3, 0.38].forEach((x, i) => limb(g, PD, [x * k * 1.02, 2.12, 0.3 - i * 0.1], [(x + 0.1) * k, 0.06, 0.4 - i * 0.12], 0.022, { noLine: true, shadow: false }));
        limb(g, PK, [0.38 * k, 2.1, 0], [0.5 * k, 1.5, 0.16], 0.13, {}); limb(g, PK, [0.5 * k, 1.5, 0.16], [0.26 * k, 1.42, 0.52], 0.115, {}); part(g, GEO.cyl, PD, { pos: [0.29 * k, 1.43, 0.47], scale: [0.125, 0.07, 0.125], rot: [1.2, 0, 0.55 * k], noLine: true });
        dot(g, LG, [0.2 * k, 1.42, 0.6], [0.09, 0.075, 0.09]); [-1, 0, 1].forEach(j => limb(g, LG, [0.2 * k, 1.42, 0.62], [0.14 * k + j * 0.03, 1.4 + j * 0.03, 0.74], 0.02, { noLine: true })); });
      part(g, GF.scarf, '#ee8fa8', { pos: [0, 2.3, 0.02], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1.1], line: 0.02 }); limb(g, LG, [0, 2.3, 0], [0, 2.62, 0.02], 0.12, {});
      const sprig = new THREE.Group(); sprig.position.set(0, 1.44, 0.72); g.add(sprig); limb(sprig, '#3f8a4f', [-0.34, -0.02, 0], [0.34, 0.06, 0], 0.02, { noLine: true });
      [[-0.3, '#f2d86a'], [-0.15, '#fffaf0'], [0.02, '#f2d86a'], [0.18, '#fffaf0'], [0.32, '#f2d86a']].forEach((a, i) => { limb(sprig, '#3f8a4f', [a[0], 0.0, 0], [a[0], -0.08, 0], 0.008, { noLine: true }); dot(sprig, a[1], [a[0], -0.12, 0], [0.04, 0.05, 0.04]); });
      const hd = new THREE.Group(); hd.position.set(0, 2.82, 0.04); g.add(hd); part(hd, sph(0.3, 14, 12), LG, { scale: [0.95, 1.12, 1.05] }); part(hd, sph(0.2, 10, 8), LG, { pos: [0, 0.05, -0.26], scale: [0.5, 0.9, 0.9], rot: [0.5, 0, 0] });
      part(hd, GF.cone, LG, { pos: [0, 0.0, 0.62], scale: [0.13, 0.95, 0.1], rot: [Math.PI / 2 + 0.12, 0, 0] }); part(hd, GF.cone, MG, { pos: [0, -0.13, 0.5], scale: [0.1, 0.7, 0.07], rot: [Math.PI / 2 + 0.3, 0, 0] });
      [-0.09, 0, 0.09].forEach((x, i) => part(hd, GF.cone, MG, { pos: [x, -0.42 - (i === 1 ? 0.05 : 0), 0.16 + (i === 1 ? 0.05 : 0)], scale: [0.03, 0.34 + (i === 1 ? 0.1 : 0), 0.03], rot: [Math.PI + 0.15, 0, x * 2], noLine: true }));
      [-1, 1].forEach(k => { dot(hd, '#3f8a4f', [0.2 * k, 0.1, 0.2], [0.07, 0.14, 0.09], [0, 0.6 * k, 0]); dot(hd, '#1f3d26', [0.215 * k, 0.1, 0.225], [0.045, 0.1, 0.07], [0, 0.6 * k, 0]); dot(hd, '#dff5d8', [0.22 * k, 0.15, 0.27], [0.016, 0.03, 0.02]); });
      const wr = new THREE.Group(); wr.position.set(0, 0.6, 0); hd.add(wr); part(wr, GF.tor, '#3f8a4f', { line: 0.024 });
      for (let i = 0; i < 12; i++) { const a = i * PI2 / 12; dot(wr, i % 2 ? '#2f6e3d' : '#57a85f', [Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0.07], [0.07, 0.07, 0.05]); }
      [[-0.24, -0.12], [0.24, -0.12], [0.02, -0.27]].forEach(q => dot(wr, '#e6e6e0', [q[0], q[1], 0.11], [0.05, 0.05, 0.05])); [-1, 0, 1].forEach(k => part(wr, GF.holly, '#c8323c', { pos: [0.02 * k, 0.3, 0.06], rot: [0, 0, -0.75 * k], scale: 0.85, line: 0.012 })); dot(wr, '#e9c46a', [0, 0.31, 0.1], [0.035, 0.035, 0.03]);
      const bell = new THREE.Group(); bell.position.set(0, 0.16, 0.02); wr.add(bell); part(bell, GF.cone, '#e9c46a', { pos: [0, -0.1, 0], scale: [0.1, 0.18, 0.1], line: 0.016 }); dot(bell, '#c99a2e', [0, -0.21, 0], [0.035, 0.035, 0.035]);
      g.anim = (t) => { hd.rotation.x = Math.sin(t * 1.2) * 0.1 - 0.18; hd.rotation.y = Math.sin(t * 0.7) * 0.18; bell.rotation.z = Math.sin(t * 3.2) * 0.4; sprig.rotation.z = Math.sin(t * 1.5) * 0.08; }; g.scale.setScalar(1.25); g.H = 4.6; },
    3: (g) => { FAM[2](g); const halo = flat(mesh(GEO.ring, bm('#ffe9a8', 0.9), g)); halo.position.y = 4.0; halo.scale.setScalar(0.55); [0, 1, 2, 3, 4].forEach(i => { const b = mesh(GEO.star, bm(['#ffd76a', '#f08aa8', '#9fdc9a'][i % 3]), g); b.scale.setScalar(0.09); b.position.set(Math.cos(i * 1.26) * 0.5, 1.2 + i * 0.25, Math.sin(i * 1.26) * 0.5); }); g.scale.setScalar(1.9); g.H = 7.0; },
  };
  const mkMecha = () => { const g = new THREE.Group(), c1 = '#3a3350', c2 = '#57496f';
    part(g, GEO.box, c1, { pos: [0, 1.75, 0], scale: [1.5, 1.3, 1.0] }); part(g, GEO.box, c2, { pos: [0, 2.75, 0.05], scale: [0.85, 0.7, 0.8] }); part(g, GEO.box, '#1d1a2b', { pos: [0, 2.75, 0.42], scale: [0.6, 0.4, 0.1], noLine: true });
    g.eyes = [-1, 1].map(k => part(g, sph(0.07, 8, 6), '#c9a2f2', { pos: [0.16 * k, 2.78, 0.47], noLine: true, shadow: false, mat: new THREE.MeshBasicMaterial({ color: '#c9a2f2' }) }));
    part(g, GEO.box, '#1d1a2b', { pos: [0, 1.8, 0.48], scale: [0.6, 0.6, 0.1], noLine: true }); g.heart = part(g, sph(0.17, 10, 8), '#e2506a', { pos: [0, 1.8, 0.52], noLine: true, shadow: false, mat: new THREE.MeshBasicMaterial({ color: '#e2506a' }) });
    g.arms = [-1, 1].map(k => { const a = new THREE.Group(); a.position.set(1.0 * k, 2.2, 0); part(a, GEO.box, c2, { pos: [0, -0.6, 0], scale: [0.45, 1.3, 0.5] }); part(a, sph(0.4, 10, 8), c1, { pos: [0, -1.4, 0], scale: [1, 1, 1] }); g.add(a); return a; });
    [-1, 1].forEach(k => part(g, GEO.box, c1, { pos: [0.42 * k, 0.55, 0], scale: [0.5, 1.1, 0.6] }));
    g.aura = flat(mesh(GEO.ring, bm('#e2506a', 0.8).clone(), g)); g.aura.position.y = 0.08; g.aura.scale.setScalar(1.6); g.aura.visible = false; return g; };
  const follow = (o, tx, tz, dt, sp) => { const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d > 20) { o.x = tx; o.z = tz; return 0; } const k = Math.min(1, dt * sp); o.x += dx * k; o.z += dz * k; if (d > 0.3) { let df = Math.atan2(dx, dz) - o.f; df = Math.atan2(Math.sin(df), Math.cos(df)); o.f += df * Math.min(1, dt * 8); } return d; };
  // 名字前面的職業徽章（芽、學門、專精各一個手繪圖示）；名牌是 60-play.js 的，這裡只把圖交過去
  const badge = (w) => { const IC = window.HQ_ICONS, u = IC ? IC.url('nwc-' + (w.spec || w.school || 'sprout')) : null; if (u && ctx.badge) ctx.badge(w.id === MYID, w.id, u); };
  let badgeT = 0;
  function setWho(d) { let w = WHO.get(d.id); if (!w) { w = { id: d.id, fam: [], famG: [], mech: 0 }; WHO.set(d.id, w); } Object.assign(w, { lv: d.lv, school: d.school, spec: d.spec, hp: d.hp, hpMax: d.hpMax }); badge(w);
    const p = posOf(d.id) || { x: 0, z: 0 };
    if (d.fam.join() !== w.fam.join()) { w.famG.forEach(f => { burst(f.x, 1, f.z, '#ffe9a8', 6, 1.5, 0.1, 0.4); G.remove(f.g); }); w.fam = d.fam.slice();
      w.famG = d.fam.map((tier) => { const g = new THREE.Group(); FAM[tier](g); G.add(g); circle(p.x, p.z + 1, tier === 3 ? 2.6 : 1.3, '#9fdc9a', 0.9); return { g, tier, x: p.x + 1.6, z: p.z + 1, f: 0, ph: Math.random() * 6, hit: 0 }; }); }
    if (d.mech && !w.mechG) { w.mechG = { g: mkMecha(), x: p.x + 1.5, z: p.z + 1.5, f: 0, hit: 0, sc: 1, arm: 0 }; G.add(w.mechG.g); circle(p.x + 1.5, p.z + 1.5, 2, '#c9a2f2', 0.9); }
    if (!d.mech && w.mechG) { G.remove(w.mechG.g); w.mechG = null; }
    w.mech = d.mech; }
  const dropWho = (id) => { const w = WHO.get(id); if (!w) return; w.famG.forEach(f => G.remove(f.g)); if (w.mechG) G.remove(w.mechG.g); WHO.delete(id); };

  // ---------- 操偶師的線：從手指到怪，會隨距離拉緊、放鬆 ----------
  const THREADS = [], TH_MAT = bm('#ffe9a8', 0.95, true), SEG = 6;
  const thread = (i) => { while (THREADS.length <= i) { const segs = []; for (let k = 0; k < SEG; k++) { const m = mesh(GEO.tube, TH_MAT); m.frustumCulled = false; segs.push(m); } THREADS.push(segs); } return THREADS[i]; };
  const A3 = new V3(), B3 = new V3(), C3v = new V3(), P0 = new V3(), P1 = new V3(), UP = new V3(0, 1, 0);
  let thN = 0;
  const drawThread = (ax, ay, az, bx, by, bz, slack, wd = 0.045) => { const segs = thread(thN++); A3.set(ax, ay, az); B3.set(bx, by, bz); const d = A3.distanceTo(B3); C3v.copy(A3).add(B3).multiplyScalar(0.5); C3v.y -= slack * Math.max(0.05, 1 - d / 9) * 1.6;
    for (let k = 0; k < SEG; k++) { const t0 = k / SEG, t1 = (k + 1) / SEG, q = (t, out) => out.set((1 - t) * (1 - t) * A3.x + 2 * (1 - t) * t * C3v.x + t * t * B3.x, (1 - t) * (1 - t) * A3.y + 2 * (1 - t) * t * C3v.y + t * t * B3.y, (1 - t) * (1 - t) * A3.z + 2 * (1 - t) * t * C3v.z + t * t * B3.z);
      q(t0, P0); q(t1, P1); const m = segs[k], l = P0.distanceTo(P1); m.visible = true; m.position.copy(P0).add(P1).multiplyScalar(0.5); m.scale.set(wd, l, wd); m.quaternion.setFromUnitVectors(UP, P1.sub(P0).normalize()); } };
  // ---- 操偶師的手：手上有線的時候把兩隻手抬到身前，線從指尖出去；謝幕的時候兩手高舉 ----
  const HANDS = new Map(), PULL = new Map(), HQ1 = new THREE.Quaternion(), HQ2 = new THREE.Quaternion(), HA = new V3(), HB = new V3(), HD = new V3();
  const charOf = (id) => id === MYID ? (ME && ME.c) : (OTH.get(id) || {}).c;
  const bonesOf = (c) => { if (!c._cbB) { c._cbB = {}; c.g.traverse(o => { if (o.isBone) c._cbB[o.name] = o; }); } return c._cbB; };
  const aimBone = (bone, child, dx, dy, dz, f, w) => { bone.updateWorldMatrix(true, true); bone.getWorldPosition(HA); child.getWorldPosition(HB); HB.sub(HA).normalize(); HD.set(dx, dy, dz).normalize().applyAxisAngle(UP, f);
    HQ1.setFromUnitVectors(HB, HD); HQ2.identity().slerp(HQ1, w); bone.getWorldQuaternion(HQ1); HQ2.multiply(HQ1); bone.parent.getWorldQuaternion(HQ1).invert(); bone.quaternion.copy(HQ1.multiply(HQ2)); };
  // ---------- 待機動作：站著不動兩秒，每個職業擺自己的小動作（只動手、頭、身體，不加任何道具）----------
  // 方向是角色自己的座標：x 右邊（左手是負的）、y 上、z 前面。arm(哪一邊, 上臂朝哪, 前臂朝哪)
  const IE = new THREE.Euler(), IQ = new THREE.Quaternion(), IQ0 = new THREE.Quaternion();
  const turn = (bone, x, y, z, k) => { if (!bone) return; IQ.setFromEuler(IE.set(x, y, z)); IQ0.identity().slerp(IQ, k); bone.quaternion.multiply(IQ0); };
  const pulse = (t, every, len, off = 0) => { const u = ((t + off) % every) / len; return u < 1 ? Math.sin(u * Math.PI) : 0; };   // 每隔 every 秒做一次、一次 len 秒的小動作（0→1→0）
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const IDLE = {
    // 芽：左看右看，偶爾踮一下腳
    sprout: (I, t) => { I.head(0, Math.sin(t * 0.8) * 0.55, 0); I.lift(pulse(t, 4.2, 0.7) * 0.09); },
    // 毒與藥：一手托著下巴歪頭想事情，另一手在腿邊輕點
    pm: (I, t) => { I.arm(1, [0.3, -0.75, 0.6], [-0.42, 0.88, 0.3]); I.arm(-1, [-0.2, -1, 0.05], [-0.15, -1, 0.12 + Math.sin(t * 7) * 0.1]); I.head(0.05, 0.12, -0.2 + Math.sin(t * 0.7) * 0.05); },
    // 封印與契約：單手豎在胸前，指尖畫小圈；另一手背在身後
    sc: (I, t) => { I.arm(1, [0.32, -0.8, 0.55], [-0.3 + Math.cos(t * 2.4) * 0.12, 0.9, 0.42 + Math.sin(t * 2.4) * 0.12]); I.arm(-1, [-0.3, -0.9, -0.35], [0.5, -0.6, -0.6]); I.head(0.06, 0, 0); },
    // 鍊金與附魔：雙手在身前互搓，隔一陣子甩甩手腕
    ae: (I, t) => { const sh = pulse(t, 5.5, 1.1), rub = Math.sin(t * 9) * 0.1; [-1, 1].forEach(sd => I.arm(sd, [sd * 0.38, -0.75, 0.55], mix([-sd * 0.8, 0.12 + rub * sd, 0.6], [sd * 0.25, -0.5 + Math.sin(t * 26 + sd) * 0.22, 0.85], sh))); I.head(0.12 * (1 - sh), 0, 0); },
    // 陵媒：一手插腰，重心換腳像在冰上滑一小步，偶爾撥一下頭髮
    skater: (I, t) => { const hair = pulse(t, 6.5, 1.5, 2), sw = Math.sin(t * 0.9); I.arm(-1, [-0.9, -0.42, -0.15], [0.8, -0.45, 0.38]); I.arm(1, mix([0.3, -0.95, 0.05], [0.5, 0.15, 0.45], hair), mix([0.1, -1, 0.15], [-0.4, 0.9, 0.05], hair));
      I.hips(0, 0, sw * 0.09); I.slide(sw * 0.14); I.head(0, sw * 0.12, -sw * 0.06 + hair * 0.12); },
    // 聖癒者：雙手交握在胸前，輕輕左右搖
    healer: (I, t) => { const sw = Math.sin(t * 1.3); [-1, 1].forEach(sd => I.arm(sd, [sd * 0.34, -0.82, 0.5], [-sd * 0.82, 0.5, 0.42])); I.hips(0, sw * 0.14, 0); I.head(0.08, -sw * 0.08, sw * 0.07); },
    // 結界師：雙手抱胸站得很穩，偶爾抬手往前推一下
    barrier: (I, t) => { const push = pulse(t, 7, 1.0, 3); I.arm(-1, [-0.34, -0.88, 0.42], [0.96, 0.1, 0.32]); I.arm(1, mix([0.34, -0.88, 0.42], [0.2, -0.05, 1], push), mix([-0.96, 0.18, 0.3], [0, 0.12, 1], push)); I.head(-0.04, 0, 0); },
    // 召喚師：低頭看身邊的使魔，伸手摸一下；沒有使魔的時候朝空中招手
    summoner: (I, t, w) => { if (w.famG && w.famG.length) { I.arm(1, [0.8, -0.55, 0.15], [0.75, -0.6 + Math.sin(t * 4) * 0.16, 0.2]); I.head(0.32, -0.55, 0); I.hips(0, -0.12, -0.05); }
      else { I.arm(1, [0.5, 0.75, 0.3], [Math.sin(t * 5) * 0.5, 1, 0.15]); I.head(-0.28, 0, 0); } },
    // 鍊金術師：雙手叉腰，回頭看機甲，點點頭
    alchemist: (I, t) => { const look = pulse(t, 6, 2.6, 1); [-1, 1].forEach(sd => I.arm(sd, [sd * 0.9, -0.42, -0.15], [-sd * 0.8, -0.45, 0.38])); I.head(look * Math.sin(t * 7) * 0.1, look * 0.85, 0); I.hips(0, look * 0.2, 0); },
  };
  const IDL = new Map();
  function idle(dt, t) {
    WHO.forEach(w => { const c = charOf(w.id), p = posOf(w.id); if (!c || !p) return; let s = IDL.get(w.id); if (!s) { s = { x: p.x, z: p.z, still: 0, k: 0 }; IDL.set(w.id, s); }
      const mine = w.id === MYID, moved = Math.hypot(p.x - s.x, p.z - s.z) > 0.002 || (mine && ctx.moving()); s.x = p.x; s.z = p.z; s.still = moved ? 0 : s.still + dt;
      const key = w.spec || w.school || 'sprout', ok = s.still > 2 && t - (w.actT || -9) > 2.5 && w.hp > 0 && !ctx.posed(mine, w.id) && !(mine && (TARGET || (MEV && MEV.dead)));
      s.k += ((ok ? 1 : 0) - s.k) * Math.min(1, dt * (ok ? 3 : 10)); w.idleK = s.k; if (s.k < 0.02 || key === 'puppeteer') return;   // 操偶師的手在下面另外擺
      const B = bonesOf(c), f = p.face || 0, k = s.k, fn = IDLE[key]; if (!fn || !B.upper_armL || !B.handL) return;
      fn({ arm: (sd, u, l) => { const n = sd < 0 ? 'L' : 'R'; aimBone(B['upper_arm' + n], B['lower_arm' + n], -u[0], u[1], u[2], f, k); aimBone(B['lower_arm' + n], B['hand' + n], -l[0], l[1], l[2], f, k); } /* 模型面向 +z 的時候右手邊是 -x，所以 x 要反過來 */,
        head: (x, y, z) => turn(B.head, x * 1, y, z, k), hips: (x, y, z) => turn(B.spine || B.hips, x, y, z, k), lift: (h) => { c.H.position.y += h * k; }, slide: (d) => { c.H.position.x += Math.cos(f) * d * k; c.H.position.z -= Math.sin(f) * d * k; } }, t + (c.ph || 0), w); });
    IDL.forEach((s, id) => { if (!WHO.has(id)) IDL.delete(id); });
  }
  function late(dt) {
    const t = S.time; idle(dt, t);
    WHO.forEach(w => { if (w.spec !== 'puppeteer') { HANDS.delete(w.id); return; }
      const c = charOf(w.id), p = posOf(w.id); if (!c || !p) return; const B = bonesOf(c); if (!B.upper_armL || !B.handL) return;
      let h = HANDS.get(w.id); if (!h) { h = { k: 0, up: 0, yank: 0, L: [-0.42, 1.0, 0.1], R: [0.42, 1.0, 0.1] }; HANDS.set(w.id, h); }
      const up = [...ZONES.values()].some(o => o.g.curtain && o.z.id === w.id && o.t < (o.z.dur || 2)) ? 1 : 0, idling = (w.idleK || 0) > 0.5 && !up && !(h.yank > 0) && !PULL.get(w.id), want = up || h.yank > 0 || PULL.get(w.id) || idling ? 1 : 0;
      h.idl = idling; h.k += (want - h.k) * Math.min(1, dt * (idling ? 3 : 9)); h.up += (up - h.up) * Math.min(1, dt * 7); if (h.yank > 0) h.yank -= dt;
      const f = p.face || 0, y = h.yank > 0 ? Math.sin((1 - h.yank / 0.45) * Math.PI) : 0, gy = FY(p.x, p.z);
      [['L', -1], ['R', 1]].forEach(([n, sd]) => { const ua = B['upper_arm' + n], la = B['lower_arm' + n], hd = B['hand' + n];
        if (h.k > 0.02) { const bob = (idling ? Math.sin(t * 5 + sd * 1.3) * 0.07 + Math.sin(t * 23 + sd) * 0.015 : Math.sin(t * 9 + sd) * 0.1 + (Math.floor(t * 6) % 2 ? 0.1 : -0.1) * sd) * (1 - h.up), sway = h.up * Math.sin(t * 2) * 0.25;   // 一手高一手低，跟著偶一頓一頓
          aimBone(ua, la, sd * (0.5 + h.up * 0.25) + y * 1.3 + sway, 0.1 + bob + h.up * 1.2, 0.85 - h.up * 0.5 + y * 0.2, f, h.k);
          aimBone(la, hd, sd * (0.18 + h.up * 0.2) + y * 1.6 + sway, 0.5 + bob * 1.5 + h.up * 1.4, 0.8 - h.up * 0.55, f, h.k); }
        la.updateWorldMatrix(true, true); la.getWorldPosition(HA); hd.getWorldPosition(HB); HD.copy(HB).sub(HA).normalize().multiplyScalar(0.1); HB.add(HD);
        h[n] = [HB.x - p.x, HB.y - gy, HB.z - p.z]; }); });
    PULL.clear();
  }
  const hand = (p, side, id) => { const h = id != null ? HANDS.get(id) : null; if (h) { const a = side < 0 ? h.L : h.R; return [p.x + a[0], FY(p.x, p.z) + a[1], p.z + a[2]]; }
    const f = p.face || 0; return [p.x + Math.sin(f) * 0.35 + Math.cos(f) * 0.42 * side, FY(p.x, p.z) + 1.25, p.z + Math.cos(f) * 0.35 - Math.sin(f) * 0.42 * side]; };

  // ---------- 持續一陣子的東西：星星燈、絕壁、禁錮的框、封印之匣、謝幕 ----------
  const ZONE = {
    lamp: (z) => { const g = new THREE.Group(); const s = mesh(GEO.star, bm('#ffe27a'), g); s.scale.set(0.34, 0.5, 0.34); s.position.y = 2.2; const gl = mesh(GEO.sph, bm('#fff3c4', 0.35, true), g); gl.scale.setScalar(0.8); gl.position.y = 2.2; const d = flat(mesh(GEO.disc, bm('#fff3c4', 0.22), g)); d.scale.setScalar(z.r); d.position.y = 0.05; const r = flat(mesh(GEO.ring, bm('#ffd76a', 0.8), g)); r.scale.setScalar(z.r); r.position.y = 0.06;
      g.tick = (t) => { s.rotation.y = t * 2; s.position.y = 2.2 + Math.sin(t * 3) * 0.15; gl.scale.setScalar(0.8 + Math.sin(t * 5) * 0.12); if (Math.random() < 0.12) rise(z.x, z.z2, '#ffe27a', 1, z.r, 1.6, 0.09, 0.8, GEO.star); }; return g; },
    cliff: (z) => { const g = new THREE.Group(); const w = mesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), bm('#7fb4ff', 0.3), g); w.scale.set(z.r, 3.4, z.r); w.position.y = 1.7; const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(1, 1, 1, 6)), lm('#d5e8ff')); e.scale.copy(w.scale); e.position.y = 1.7; g.add(e);
      g.tick = (t, k) => { const s = Math.min(1, k * 12) * (k > 0.9 ? (1 - k) * 10 : 1); g.scale.set(1, s, 1); }; return g; },
    box: (z) => { const g = new THREE.Group(); const b = mesh(GEO.box, bm('#3d2f66', 0.78), g), e = new THREE.LineSegments(GEO.wire, lm('#ffe9a8')); g.add(e); const side = z.r * 1.7;
      g.tick = (t, k) => { const drop = Math.min(1, k * 5), sq = k > 0.86 ? 1 - (k - 0.86) / 0.14 : 1; [b, e].forEach(o => { o.scale.set(side * (0.6 + 0.4 * sq), 3.2 * sq + 0.05, side * (0.6 + 0.4 * sq)); o.position.y = (1 - drop) * 8 + (3.2 * sq + 0.05) / 2; }); }; return g; },
    lock: (z) => { const g = new THREE.Group(); const side = z.r * 1.6, e = new THREE.LineSegments(GEO.wire, lm('#7fb4ff')); e.scale.set(side, 2.6, side); e.position.y = 1.3; g.add(e); const f = mesh(GEO.box, bm('#7fb4ff', 0.12), g); f.scale.copy(e.scale); f.position.y = 1.3;
      g.tick = (t, k) => { const s = Math.min(1, k * 10); g.scale.set(s, 1, s); g.rotation.y = 0; }; return g; },
    // 謝幕：一座小舞台。上面是木頭十字控制桿，兩邊紅布幕、頂上一排布簾，聚光燈打在被吊起來的偶身上
    curtain: (z) => { const g = new THREE.Group(), R = z.r, bar = new THREE.Group(); g.add(bar); bar.position.y = 6.4; g.barY = 6.4;
      [0, Math.PI / 2].forEach(a => { const m = mesh(GEO.box, bm('#8a5a3c'), bar); m.scale.set(R * 1.25, 0.26, 0.36); m.rotation.y = a; const d = mesh(GEO.box, bm('#5e3a22'), bar); d.scale.set(R * 1.25, 0.08, 0.4); d.rotation.y = a; d.position.y = -0.15;
        [-1, 1].forEach(k => { const n = mesh(GEO.sph, bm('#e9c46a'), bar); n.scale.setScalar(0.24); n.position.set(Math.cos(a) * k * R * 0.625, 0, -Math.sin(a) * k * R * 0.625); }); });
      const hub = mesh(GEO.cyl, bm('#5e3a22'), bar); hub.scale.set(0.3, 0.9, 0.3); hub.position.y = 0.45; const knob = mesh(GEO.sph, bm('#e9c46a'), bar); knob.scale.setScalar(0.34); knob.position.y = 0.95;
      const lite = mesh(new THREE.ConeGeometry(1, 1, 20, 1, true), bm('#fff3c4', 0.16, true), g), pool = flat(mesh(GEO.disc, bm('#fff3c4', 0.22, true), g)); pool.position.y = 0.07;
      const drapes = [-1, 1].map(k => { const d = new THREE.Group(); g.add(d); for (let i = 0; i < 6; i++) { const c = mesh(GEO.cyl, bm(i % 2 ? '#b8283c' : '#d2364a'), d); c.scale.set(0.34, 7.4, 0.34); c.position.set(k * i * 0.5, 3.7, (i % 2) * 0.12); }
        const tie = mesh(GEO.box, bm('#e9c46a'), d); tie.scale.set(3.1, 0.16, 0.8); tie.position.set(k * 1.25, 2.6, 0.06); d.k = k; return d; });
      const top = new THREE.Group(); g.add(top); const n = Math.ceil(R * 2 / 0.9) + 2; for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.9, c = mesh(GEO.sph, bm(i % 2 ? '#b8283c' : '#d2364a'), top); c.scale.set(0.55, 0.9, 0.4); c.position.set(x, 0, 0); const f = mesh(GEO.sph, bm('#e9c46a'), top); f.scale.setScalar(0.12); f.position.set(x, -0.9, 0.1); }
      g.tick = (t, k) => { const inn = Math.min(1, k * 6), ea = 1 - (1 - inn) * (1 - inn); bar.rotation.y = Math.sin(t * 2) * 0.22; bar.rotation.z = Math.sin(t * 3.1) * 0.07; g.barY = 6.4 + k * 0.8 + (1 - ea) * 5; bar.position.y = g.barY;
        drapes.forEach(d => { d.position.set(d.k * (R + 0.6 + (1 - ea) * 5), 0, 0.3); d.scale.y = ea; }); top.position.set(0, 7.5 + (1 - ea) * 4, 0.3);
        const lr = R * 0.82 * (0.9 + Math.sin(t * 4) * 0.04); lite.scale.set(lr, 9, lr); lite.position.y = 4.5; lite.material.opacity = 0.16 * ea; pool.scale.setScalar(lr); pool.material.opacity = 0.22 * ea;
        if (Math.random() < 0.3) rise(z.x + (Math.random() - 0.5) * R, z.z2, ['#ffe27a', '#ff9ec4', '#bfe9ff'][Math.random() * 3 | 0], 1, R * 0.5, 3.2, 0.08, 0.9, GEO.star); };
      g.curtain = true; return g; },
  };
  // 瞌睡孢子：一圈淡黃色的霧，裡面一顆一顆孢子慢慢飄
  ZONE.spore = (z) => { const g = new THREE.Group(), d = flat(mesh(GEO.disc, bm('#f3e08a', 0.28), g)); d.scale.setScalar(z.r); d.position.y = 0.05; const r = flat(mesh(GEO.ring, bm('#d9b84a', 0.8), g)); r.scale.setScalar(z.r); r.position.y = 0.06;
    g.tick = (t, k) => { d.material.opacity = 0.28 * (k > 0.8 ? (1 - k) * 5 : 1); if (Math.random() < 0.35) rise(z.x, z.z2, '#f6e9a0', 1, z.r * 0.9, 1.6, 0.09, 1.1); }; return g; };
  // 怪出招前的預告：地上一塊慢慢填滿的橘紅色（圓的或長條的），填滿就是生效
  const warnMat = (op) => new THREE.MeshBasicMaterial({ color: '#ff7a5c', transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
  const warn = (x, z, r, dur) => { const g = new THREE.Group(); G.add(g); g.position.set(x, FY(x, z) + 0.07, z); const a = flat(mesh(GEO.disc, warnMat(0.16), g)), b = flat(mesh(GEO.disc, warnMat(0.42), g)), c = flat(mesh(GEO.ring, warnMat(0.9), g)); a.scale.setScalar(r); c.scale.setScalar(r);
    return fx(g, dur, (k) => { b.scale.setScalar(Math.max(0.01, r * k)); }, () => { [a, b, c].forEach(o => o.material.dispose()); }); };
  const warnLine = (x, z, x2, z2, w, dur) => { const g = new THREE.Group(); G.add(g); const l = Math.hypot(x2 - x, z2 - z); g.position.set(x, FY(x, z) + 0.07, z); g.rotation.y = Math.atan2(x2 - x, z2 - z); const mk = (op) => { const m = mesh(GEO.box, warnMat(op), g); m.scale.set(w * 2, 0.02, l); m.position.z = l / 2; return m; }; const a = mk(0.16), b = mk(0.42);
    return fx(g, dur, (k) => { b.scale.z = Math.max(0.01, l * k); b.position.z = l * k / 2; }, () => { [a, b].forEach(o => o.material.dispose()); }); };
  // 樹根：從地下竄出來的一叢尖刺
  const rootsUp = (x, z, r) => { const g = new THREE.Group(); G.add(g); g.position.set(x, FY(x, z), z); for (let i = 0; i < 6; i++) { const a = i / 6 * PI2 + Math.random(), d = i ? r * (0.3 + Math.random() * 0.5) : 0, c = mesh(GEO.cone, bm(i % 2 ? '#8a6a4a' : '#6f5238'), g); c.scale.set(0.3, 1.6 + Math.random() * 1.2, 0.3); c.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); c.rotation.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5); c.h = c.scale.y; }
    burst(x, FY(x, z) + 0.3, z, '#8a6a4a', 8, 3, 0.12, 0.5); return fx(g, 1.1, (k) => { const u = k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1; g.children.forEach(c => { c.scale.y = Math.max(0.01, c.h * u); c.position.y = c.scale.y / 2; }); }); };
  // 老樹公的毒霧：整片紫綠色的霧，補血招可以解毒
  let FOG = null; const setFog = (e) => { if (FOG) { G.remove(FOG.g); FOG = null; } if (!e.on) return; const g = new THREE.Group(); G.add(g); g.position.set(e.x, FY(e.x, e.z), e.z); const d = flat(mesh(GEO.disc, bm('#9a7fc8', 0.2), g)); d.scale.setScalar(e.r); d.position.y = 0.09;
    const puffs = []; for (let i = 0; i < 26; i++) { const a = Math.random() * PI2, r = Math.sqrt(Math.random()) * e.r, m = mesh(GEO.sph, bm(i % 3 ? '#b59ad8' : '#9fc08a', 0.22), g); m.scale.set(2 + Math.random() * 2, 0.7 + Math.random() * 0.6, 2 + Math.random() * 2); m.position.set(Math.cos(a) * r, 0.5 + Math.random() * 1.2, Math.sin(a) * r); m.ph = Math.random() * 6; m.x0 = m.position.x; puffs.push(m); }
    FOG = { g, puffs, x: e.x, z: e.z, r: e.r }; };
  const addZone = (z) => { if (ZONES.has(z.z) || !ZONE[z.zk]) return; const g = ZONE[z.zk](z); g.position.set(z.x, FY(z.x, z.z2), z.z2); G.add(g); ZONES.set(z.z, { g, z, t: 0 }); };
  const endZone = (id, f) => { const o = ZONES.get(id); if (!o) return; G.remove(o.g); ZONES.delete(id); };

  // ---------- 伺服器送來的事件 ----------
  const mobAt = (id) => { const m = MOBS.get(id); return m ? { x: m.x, y: FY(m.x, m.z) + m.h * 0.6, z: m.z, m } : null; };
  const BASIC_FX = { sprout: ['#fff3c4', GEO.sph, 0.14], pm: ['#b07ae6', GEO.sph, 0.16], sc: ['#7fb4ff', GEO.box, 0.2], ae: ['#d9a23a', GEO.box, 0.26], fan: ['#bfe9ff', GEO.cone, 0.2], star: ['#ffe27a', GEO.star, 0.2], cube: ['#7fb4ff', GEO.box, 0.24], orb: ['#9fdc9a', GEO.sph, 0.18], needle: ['#f4f1ea', GEO.cone, 0.1] };
  const ON = {
    atk: (e, p) => { const b = mobAt(e.m); if (!b) return; const w = WHO.get(e.id);
      if (e.b === 'mecha' && w && w.mechG) { w.mechG.hit = 0.45; w.mechG.tm = e.m; w.mechG.slam = e.slam; if (e.slam) setTimeout(() => { ring(b.x, b.z, 2.8, '#c9a2f2', 0.5); burst(b.x, 0.3, b.z, '#8d877d', 8, 3, 0.14); }, 180); return; }
      const f = BASIC_FX[e.b] || BASIC_FX.sprout, a = head(p, 1.3); shot(a, b, f[0], 0.22, f[2], f[1], 0.25, () => burst(b.x, b.y, b.z, f[0], 3, 1.5, 0.08, 0.3));
      if (e.b === 'needle') NEEDLE.push({ id: e.id, m: e.m, t: 0.32 }); },
    spark: (e, p) => { const b = mobAt(e.m); if (b) shot(head(p), b, '#ff9a4a', 0.28, 0.3, GEO.sph, 0.5, () => { burst(b.x, b.y, b.z, '#ffb347', 10, 3.5, 0.14); ring(b.x, b.z, 1.4, '#ff9a4a', 0.35); }); },
    blink: (e, p) => { rise(p.x, p.z, '#d5c2ff', 8, 0.6, 2, 0.12, 0.5); ring(p.x, p.z, 1.2, '#b79cf0', 0.4); if (e.id === MYID) { const f = ME.face, side = (Math.random() - 0.5) * 3.2, d = C3.SK.blink.dist * (0.85 + Math.random() * 0.3); ctx.moveMe(ME.x + Math.sin(f) * d + Math.cos(f) * side, ME.z + Math.cos(f) * d - Math.sin(f) * side); S.goal = null; setTimeout(() => { rise(ME.x, ME.z, '#d5c2ff', 8, 0.6, 2, 0.12, 0.5); ring(ME.x, ME.z, 1.2, '#b79cf0', 0.4); }, 60); } },
    bubble: (e, p) => { shot(head(p), { x: e.x, y: 0.4, z: e.z }, '#8a55c8', 0.35, 0.24, GEO.sph, 1.6, () => { ring(e.x, e.z, C3.SK.bubble.r, '#b07ae6', 0.6); for (let i = 0; i < 6; i++) skullBubble(e.x, e.z, C3.SK.bubble.r * 0.8); }); },
    potion: (e) => { const t = posOf(e.to) || posOf(e.id); if (t) { rise(t.x, t.z, '#ff9ec4', 10, 0.7, 2.4, 0.13, 0.9); ring(t.x, t.z, 1.3, '#ffb7d2', 0.5); } },
    heart: (e, p) => { ring(p.x, p.z, C3.SK.heart.r, '#ffb7d2', 0.7); for (let i = 0; i < 10; i++) { const a = Math.random() * PI2, d = Math.random() * C3.SK.heart.r * 0.8, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d, o = mesh(GEO.sph, bm('#ffc4dc', 0.5)); fx(o, 1.2, (k, m) => { m.position.set(x, FY(x, z) + 0.3 + k * 2.2, z); m.scale.setScalar(0.3 * Math.sin(Math.min(1, k * 1.15) * Math.PI)); }); } },
    scent: (e, p) => { ring(p.x, p.z, C3.SK.scent.r, '#c9a2f2', 0.9); for (let i = 0; i < 14; i++) { const a0 = Math.random() * PI2, o = mesh(GEO.sph, bm(i % 2 ? '#e7d4ff' : '#f6c1dc', 0.8)); fx(o, 1.3, (k, m) => { const r = C3.SK.scent.r * k, a = a0 + k * 3; m.position.set(p.x + Math.cos(a) * r, FY(p.x, p.z) + 0.6 + Math.sin(k * 6 + a0) * 0.4, p.z + Math.sin(a) * r); m.scale.set(0.16 * (1 - k), 0.05, 0.1 * (1 - k)); m.rotation.y = a; }); } },
    waltz: (e, p) => { const r = C3.SK.waltz.r; ring(p.x, p.z, r, '#bfe9ff', 0.6); for (let i = 0; i < 8; i++) { const a0 = i / 8 * PI2, o = mesh(GEO.cone, bm('#dff4ff', 0.9)); fx(o, 0.7, (k, m) => { const a = a0 + k * PI2, rr = r * (0.4 + 0.6 * k); m.position.set(p.x + Math.cos(a) * rr, FY(p.x, p.z) + 0.7, p.z + Math.sin(a) * rr); m.scale.set(0.12, 0.7 * (1 - k * 0.5), 0.12); m.rotation.set(0, -a, Math.PI / 2); }); } if (e.id === MYID) SPIN = 0.7; },
    ball: (e, p) => { const r = C3.SK.ball.r; ring(p.x, p.z, r, '#bfe9ff', 1.0); const d = flat(mesh(GEO.disc, bm('#dff4ff', 0.45).clone())); fx(d, 4, (k, m) => { m.position.set(p.x, FY(p.x, p.z) + 0.05, p.z); m.scale.setScalar(r * Math.min(1, k * 12)); m.material.opacity = 0.45 * (k > 0.8 ? (1 - k) * 5 : 1); }, (m) => m.material.dispose());
      for (let i = 0; i < 16; i++) { const a = Math.random() * PI2, dd = Math.sqrt(Math.random()) * r, x = p.x + Math.cos(a) * dd, z = p.z + Math.sin(a) * dd, hh = 0.8 + Math.random() * 1.6, o = mesh(GEO.cone, bm('#bfe9ff', 0.8)); fx(o, 4, (k, m) => { const up = Math.min(1, k * 20) * (k > 0.85 ? (1 - k) / 0.15 : 1); m.position.set(x, FY(x, z) + hh * up / 2, z); m.scale.set(0.22, hh * up + 0.01, 0.22); }); }
      for (let i = 0; i < 24; i++) rise(p.x, p.z, '#ffffff', 1, r, 3, 0.07, 1.5 + Math.random()); },
    corrode: (e, p) => { const b = mobAt(e.m); if (b) shot(head(p), b, '#7fd08a', 0.3, 0.22, GEO.sph, 0.4, () => { burst(b.x, b.y, b.z, '#8a55c8', 8, 2, 0.12); skullBubble(b.x, b.z, 0.3); }); },
    firework: (e, p) => { shot(head(p), { x: e.x, y: 5, z: e.z }, '#c9a2f2', 0.5, 0.25, GEO.sph, 2, () => { skullBubble(e.x, e.z, 0.2, 1.3); ['#b07ae6', '#7fd08a', '#ff9ec4'].forEach((c, i) => { burst(e.x, 4.2 - i * 0.5, e.z, c, 14, 5, 0.16, 0.9); }); ring(e.x, e.z, C3.SK.firework.r, '#b07ae6', 0.8); for (let i = 0; i < 5; i++) skullBubble(e.x, e.z, C3.SK.firework.r * 0.7); }); },
    meteor: (e) => { const r = C3.SK.meteor.r; circle(e.x, e.z, r, '#ffe27a', 1.3); for (let i = 0; i < 6; i++) { const a = Math.random() * PI2, d = Math.random() * r * 0.8, x = e.x + Math.cos(a) * d, z = e.z + Math.sin(a) * d; setTimeout(() => shot({ x: x - 5, y: 13, z: z - 3 }, { x, y: 0.3, z }, '#ffe27a', 0.45, 0.42, GEO.star, 0, () => { burst(x, 0.4, z, '#fff3c4', 8, 3.5, 0.14, 0.6, GEO.star); ring(x, z, 1.8, '#ffd76a', 0.4); }), i * 110); }
      setTimeout(() => { ring(e.x, e.z, r, '#ffb7d2', 0.8); rise(e.x, e.z, '#ff9ec4', 14, r, 2.5, 0.12, 1); }, 600); },
    seal: (e) => { const b = mobAt(e.m); if (b) { ring(b.x, b.z, 1.4, '#7fb4ff', 0.35); burst(b.x, b.y, b.z, '#d5e8ff', 6, 2, 0.1, 0.4, GEO.box); } },
    lock: (e) => { addZone({ z: 'lock:' + e.id, zk: 'lock', x: e.x, z2: e.z, r: e.r }); const o = ZONES.get('lock:' + e.id); if (o) o.dur = C3.SK.lock.root; ring(e.x, e.z, e.r, '#7fb4ff', 0.4); },
    lock2: (e) => { endZone('lock:' + e.id); const side = e.r * 1.6, o = new THREE.LineSegments(GEO.wire, lm('#ffffff')); G.add(o); fx(o, 0.28, (k, m) => { const s = side * (1 - k * k); m.scale.set(s + 0.05, 2.6 * (1 - k) + 0.05, s + 0.05); m.position.set(e.x, FY(e.x, e.z) + 1.3 * (1 - k), e.z); }, () => { burst(e.x, 0.6, e.z, '#7fb4ff', 18, 6, 0.18, 0.6, GEO.box); ring(e.x, e.z, e.r * 1.3, '#d5e8ff', 0.5, 0.05); }); },
    pact: (e, p) => { ring(p.x, p.z, 1.6, '#9fdc9a', 0.6); }, pact2: (e, p) => { ring(p.x, p.z, 1.8, '#9fdc9a', 0.6); }, envoy: (e, p) => { circle(p.x, p.z, 4, '#ffe9a8', 1.4); rise(p.x, p.z, '#ffe9a8', 20, 3, 4, 0.14, 1.4, GEO.star); },
    bond: (e, p) => { ring(p.x, p.z, 2.2, '#ff9ec4', 0.6); const w = WHO.get(e.id); if (w) w.famG.forEach(f => { rise(f.x, f.z, '#ff9ec4', 8, 0.6, 2.6, 0.12, 0.9); f.bond = C3.SK.bond.dur; }); },
    fam: (e) => { const w = WHO.get(e.id), f = w && w.famG[e.i], b = mobAt(e.m); if (!f || !b) return; f.hit = 0.3; shot({ x: f.x, y: f.g.H ? f.g.H * 0.7 : 1.2, z: f.z }, b, f.tier === 3 ? '#ffe9a8' : '#9fdc9a', 0.25, f.tier === 3 ? 0.4 : 0.2, GEO.star, 0.4, () => { burst(b.x, b.y, b.z, '#9fdc9a', 4, 2, 0.1, 0.35, GEO.star); if (f.tier === 3) ring(b.x, b.z, 3, '#ffe9a8', 0.4); }); },
    transmute: (e) => { const r = C3.SK.transmute.r; circle(e.x, e.z, r, '#ffd76a', 1.0); const g = new THREE.Group(); G.add(g); const c = '#a8a39a'; const palm = mesh(GEO.box, bm(c), g); palm.scale.set(1.5, 1.5, 1.3); [-0.5, 0, 0.5].forEach(x => { const k = mesh(GEO.box, bm('#8d877d'), g); k.scale.set(0.4, 0.5, 1.2); k.position.set(x, -0.8, 0.1); }); const arm = mesh(GEO.box, bm('#8d877d'), g); arm.scale.set(1.0, 4, 1.0); arm.position.y = 2.6;
      fx(g, 0.75, (k, o) => { const y = k < 0.35 ? 7 : k < 0.5 ? 7 - (k - 0.35) / 0.15 * 6 : 1 + (k > 0.8 ? (k - 0.8) * 30 : 0); o.position.set(e.x, FY(e.x, e.z) + y, e.z); o.visible = k > 0.3; }); setTimeout(() => { ring(e.x, e.z, r * 1.2, '#ffd76a', 0.45, 0.1); burst(e.x, 0.3, e.z, '#8d877d', 10, 4, 0.16); SHAKE = 0.25; }, 370); },
    enchant: (e, p) => { const r = C3.SK.enchant.r; ring(p.x, p.z, r, '#ffd76a', 0.6); [p].concat([...WHO.keys()].filter(id => id !== e.id).map(posOf).filter(q => q && Math.hypot(q.x - p.x, q.z - p.z) <= r)).forEach(q => { circle(q.x, q.z, 1.0, '#ffd76a', 1.0); rise(q.x, q.z, '#ffe27a', 8, 0.6, 2.4, 0.1, 1, GEO.box); }); },
    shelter: (e, p) => { const w = WHO.get(e.id); if (w && w.mechG) w.mechG.guard = C3.SK.shelter.dur; const r = C3.SK.shelter.r, d = mesh(new THREE.SphereGeometry(1, 18, 10, 0, PI2, 0, Math.PI / 2), bm('#c9a2f2', 0.22).clone()); fx(d, C3.SK.shelter.dur, (k, m) => { const q = posOf(e.id) || p; m.position.set(q.x, FY(q.x, q.z), q.z); m.scale.setScalar(r * Math.min(1, k * 15)); m.material.opacity = 0.22 * (k > 0.9 ? (1 - k) * 10 : 1); }, (m) => m.material.dispose()); ring(p.x, p.z, r, '#c9a2f2', 0.5); },
    exchange: (e, p) => { circle(p.x, p.z, 1.6, '#e2506a', 1.2); const w = WHO.get(e.id), g = w && w.mechG; for (let i = 0; i < 10; i++) setTimeout(() => { const q = posOf(e.id) || p; shot(head(q, 1.1), g ? { x: g.x, y: 1.8, z: g.z } : head(q, 3), '#e2506a', 0.4, 0.12, GEO.sph, 0.8); }, i * 60); },
    fear: (e, p) => { circle(p.x, p.z, 3.2, '#57496f', 1.4); const w = WHO.get(e.id), g = w && w.mechG; if (g) rise(g.x, g.z, '#3a3350', 20, 2, 5, 0.2, 1.4); },
    fearEnd: (e) => { ring(e.x, e.z, C3.SK.fear.r, '#57496f', 0.7, 0.05); ring(e.x, e.z, C3.SK.fear.r * 0.7, '#e2506a', 0.5, 0.05); burst(e.x, 0.4, e.z, '#3a3350', 18, 6, 0.22, 0.8, GEO.box); SHAKE = 0.4; },
    stitch: (e, p) => { let prev = head(p, 1.25); (e.ids || []).forEach((id, i) => { const b = mobAt(id); if (!b) return; const a = prev; setTimeout(() => { shot(a, b, '#f4f1ea', 0.14, 0.09, GEO.cone, 0.1, () => burst(b.x, b.y, b.z, '#ffe9a8', 3, 1.2, 0.07, 0.3)); }, i * 110); prev = b; }); },
    string: (e) => { const b = mobAt(e.m); if (b) { ring(b.x, b.z, 1.3, '#ffe9a8', 0.4); rise(b.x, b.z, '#ffe9a8', 6, 0.5, 2.4, 0.08, 0.6); } },
    string2: (e) => { const hh = HANDS.get(e.id); if (hh) hh.yank = 0.45; const m = MOBS.get(e.m); if (m) { const x0 = m.x, z0 = m.z; m.fling = { x0, z0, x1: e.x + 0.6, z1: e.z, t: 0 }; } setTimeout(() => { ring(e.x, e.z, C3.SK.string.r, '#ffe9a8', 0.5, 0.1); burst(e.x, 0.4, e.z, '#f4f1ea', 10, 4, 0.12); SHAKE = 0.2; }, 300); },
    zone: (e) => addZone(e),
    zoneEnd: (e) => { const o = ZONES.get(e.z); endZone(e.z); if (e.zk === 'box') { burst(e.x, 0.5, e.z2, '#e9c46a', 18, 6, 0.2, 0.7, GEO.box); ring(e.x, e.z2, e.r * 1.4, '#ffe9a8', 0.5, 0.05); SHAKE = 0.3; }
      if (e.zk === 'curtain') { const gy = FY(e.x, e.z2); [-1, 1].forEach(k => { const d = new THREE.Group(); G.add(d); for (let i = 0; i < Math.ceil(e.r / 0.5) + 1; i++) { const c = mesh(GEO.cyl, bm(i % 2 ? '#b8283c' : '#d2364a'), d); c.scale.set(0.34, 7.4, 0.34); c.position.set(-k * i * 0.5, 3.7, (i % 2) * 0.12); }
          fx(d, 0.75, (kk, o) => { const cl = Math.min(1, kk * 3.2), dn = kk > 0.6 ? (kk - 0.6) / 0.4 : 0; o.position.set(e.x + k * (e.r + 0.6) * (1 - cl * cl), gy, e.z2 + 0.3); o.scale.y = 1 - dn; }, (o) => G.remove(o)); });
        setTimeout(() => { burst(e.x, gy + 2.5, e.z2, '#ffe27a', 14, 7, 0.16, 0.9, GEO.star); burst(e.x, gy + 2.5, e.z2, '#ff9ec4', 12, 6, 0.14, 0.9, GEO.box); burst(e.x, gy + 2.5, e.z2, '#bfe9ff', 12, 6, 0.14, 0.9, GEO.box); SHAKE = 0.35; }, 240);
        CUT = 0.3; [-1, 1].forEach(k => { const b = mesh(GEO.box, bm('#f4f1ea')); fx(b, 0.3, (kk, m) => { m.position.set(e.x, FY(e.x, e.z2) + 5.2, e.z2); m.scale.set(e.r * 2.2 * Math.min(1, kk * 4), 0.07, 0.3); m.rotation.set(0, 0.4, k * (0.5 - kk * 0.5)); }); }); ring(e.x, e.z2, e.r, '#ffe9a8', 0.6, 0.05); } },
    die: (e) => { const m = MOBS.get(e.m); if (m) { burst(m.x, FY(m.x, m.z) + m.h * 0.5, m.z, '#ffffff', 8, 2.5, 0.16, 0.5); if (TARGET === m.id) setTarget(null, true); } },
    mobAtk: (e) => { const m = MOBS.get(e.m); if (!m) return; m.atkT = 0.3; if (e.shot) { const p = posOf(e.to); if (p) shot({ x: m.x, y: FY(m.x, m.z) + m.h * 0.7, z: m.z }, head(p, 1.1), '#8fd3ee', 0.28, 0.16, GEO.sph, 0.5, () => burst(p.x, FY(p.x, p.z) + 1.1, p.z, '#bfe9ff', 5, 1.6, 0.08, 0.35)); } },
    tele: (e) => { const m = MOBS.get(e.m); if (m) { m.castT = e.dur; if (e.x2 != null) m.f = Math.atan2(e.x2 - m.x, e.z2 - m.z); }
      if (e.mk === 'roll') warnLine(e.x, e.z, e.x2, e.z2, e.w, e.dur); else if (e.mk === 'spore') warn(e.x, e.z, e.r, e.dur); else if (e.mk === 'roots') { e.spots.forEach(s => warn(s[0], s[1], e.r, e.dur)); if (m) m.rootT = e.dur + 0.4; }
      else if (e.mk === 'mend' && m) { const o = MOBS.get(e.to); ring(m.x, m.z, 1.2, '#9fe7a4', e.dur, 0.6); if (o) fx(mesh(GEO.sph, bm('#9fe7a4', 0.9)), e.dur, (k, b) => { b.position.set(m.x + (o.x - m.x) * k, FY(m.x, m.z) + 1 + Math.sin(k * Math.PI) * 1.2, m.z + (o.z - m.z) * k); b.scale.setScalar(0.14 + k * 0.1); }); } },
    mobMove: (e) => { const m = MOBS.get(e.m);
      if (e.mk === 'roots') { e.spots.forEach(s => rootsUp(s[0], s[1], e.r)); SHAKE = Math.max(SHAKE, 0.2); }
      else if (e.mk === 'roll' && m) { m.rollT = 0.45; }
      else if (e.mk === 'spore' && m) { burst(m.x, FY(m.x, m.z) + 1.2, m.z, '#f6e9a0', 14, 3.4, 0.1, 0.7); }
      else if (e.mk === 'mend') { const o = MOBS.get(e.to); if (o) rise(o.x, o.z, '#9fe7a4', 8, 0.7, 2, 0.1, 0.8); }
      else if (e.mk === 'bloom') { ring(e.x, e.z, 1.4, '#f6a8c8', 0.6); rise(e.x, e.z, '#ffd0e0', 8, 0.6, 2, 0.1, 0.8); } },
    rise: (e, p) => { ring(p.x, p.z, 1.8, '#9fe7a4', 0.8); rise(p.x, p.z, '#bff2c2', 12, 0.8, 3, 0.12, 1.1, GEO.star); },
    mobMax: (e) => { const m = MOBS.get(e.m); if (m) m.max = e.max; },
    mobStop: (e) => { const m = MOBS.get(e.m); if (!m) return; m.castT = 0; burst(m.x, FY(m.x, m.z) + m.h, m.z, '#ffd76a', 6, 2, 0.1, 0.5, GEO.star); },
    fog: (e) => setFog(e),
    lvup: (e, p) => { ring(p.x, p.z, 2.4, '#ffd76a', 0.9); rise(p.x, p.z, '#ffe27a', 16, 1, 3.4, 0.14, 1.2, GEO.star); num(p.x, FY(p.x, p.z) + 2.8, p.z, 'Lv.' + e.lv, 'lv'); },
    promote: (e, p) => { circle(p.x, p.z, 3, '#ffe9a8', 1.6); for (let i = 0; i < 3; i++) setTimeout(() => { const q = posOf(e.id) || p; ring(q.x, q.z, 3 + i, '#ffd76a', 0.9); rise(q.x, q.z, '#ffe27a', 14, 1.6, 4, 0.15, 1.3, GEO.star); }, i * 250); },
    down: (e, p) => { ring(p.x, p.z, 1.6, '#9a96a0', 0.8); },
  };
  let SPIN = 0, SHAKE = 0, CUT = 0; const NEEDLE = [];
  function onFx(e) { if (e.k === 'fog') return setFog(e); if (e.id && WHO.has(e.id) && e.k !== 'lvup') WHO.get(e.id).actT = S.time; const p = e.id ? posOf(e.id) : null; if (e.id && !p) return; if (S.lob) return; const k = e.k === 'pact2' ? 'pact2' : e.k; if (ON[k]) ON[k](e, p); }
  function onHits(list) { if (S.lob) return; list.forEach(([id, d, kind]) => { if (id[0] === 'p') { const p = posOf(id.slice(2)); if (p) num(p.x, FY(p.x, p.z) + 2.4, p.z, d < 0 ? '+' + (-d) : String(d), d < 0 ? 'heal' : kind === 'pois' ? 'poison' : 'ow'); }
    else { const m = MOBS.get(id); if (m && m.g.visible) num(m.x, FY(m.x, m.z) + m.h + 0.4, m.z, d < 0 ? '+' + (-d) : String(d), d < 0 ? 'heal' : kind === 'dot' || kind === 'poison' ? 'poison' : kind === 'link' ? 'link' : ''); } }); }

  // ---------- 每一格畫面 ----------
  function tick(dt) {
    const t = S.time, lob = !!S.lob; G.visible = !lob;
    for (let i = NUMS.length - 1; i >= 0; i--) { const n = NUMS[i]; n.t += dt; if (n.t > 0.9 || lob) { n.el.remove(); NUMS.splice(i, 1); continue; } if (put2d(n.el, n.x, n.y + n.t * 1.6, n.z)) n.el.style.opacity = String(Math.min(1, (0.9 - n.t) * 3)); }
    if (lob) { MOBS.forEach(m => { m.bar.b.hidden = true; }); return; }
    tickDrops(dt); badgeT -= dt; if (badgeT < 0) { badgeT = 1.5; WHO.forEach(badge); }   // 別人的名牌可能比職業資料晚到，隔一下再補一次
    for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.t += dt; const k = f.t / f.dur; if (k >= 1) { if (f.o.parent) f.o.parent.remove(f.o); if (f.done) f.done(f.o); FX.splice(i, 1); } else f.step(k, f.o); }
    thN = 0;
    // 怪
    MOBS.forEach(m => { const dead = !!(m.fl & 256), far = Math.hypot(m.x - ME.x, m.z - ME.z) > 46;
      m.show += ((dead ? 0 : 1) - m.show) * Math.min(1, dt * 8); m.g.visible = !far && m.show > 0.02;
      const dx = m.tx - m.x, dz = m.tz - m.z, d = Math.hypot(dx, dz);
      if (m.fling) { m.fling.t += dt / 0.3; const k = Math.min(1, m.fling.t); m.x = m.fling.x0 + (m.fling.x1 - m.fling.x0) * k; m.z = m.fling.z0 + (m.fling.z1 - m.fling.z0) * k; m.air = Math.sin(k * Math.PI) * 3; if (k >= 1) { m.fling = null; m.air = 0; } }
      else if (d > 12) { m.x = m.tx; m.z = m.tz; } else if (d > 0.01) { const k = Math.min(1, dt * 9); m.x += dx * k; m.z += dz * k; if (d > 0.08) { let df = Math.atan2(dx, dz) - m.f; df = Math.atan2(Math.sin(df), Math.cos(df)); m.f += df * Math.min(1, dt * 8); } }
      if (!m.g.visible) { m.bar.b.hidden = true; return; }
      const held = m.fl & (1 | 2 | 4 | 64), charm = m.fl & 32, lift = m.fl & 512; m.ph += dt * (held ? 0 : 1); if (m.hurtT > 0) m.hurtT -= dt; if (m.atkT > 0) m.atkT -= dt;
      m.lift = (m.lift || 0) + ((lift ? 2.6 : 0) - (m.lift || 0)) * Math.min(1, dt * (lift ? 5 : 14));
      // 被提線的怪：像木偶一樣一頓一頓的
      const step = charm || lift ? Math.floor(t * 6) : 0, jerk = charm ? (step % 2 ? 0.28 : 0) : 0, tilt = charm || lift ? ((step * 37) % 7 - 3) * 0.08 : 0;
      const stay = C3.MOBS[m.kind].boss || C3.MOBS[m.kind].add, hop = held || stay ? 0 : m.body.float ? m.body.float + Math.sin(m.ph * 2) * 0.15 : Math.abs(Math.sin(m.ph * (d > 0.05 ? 6 : 2.4))) * (d > 0.05 ? 0.3 : 0.1);
      m.g.position.set(m.x, FY(m.x, m.z) + (charm ? jerk : hop) + m.lift + (m.air || 0), m.z); m.g.rotation.set(lift ? Math.max(0, Math.sin(t * 5 + m.x)) * 0.55 : 0, lift ? 0 : m.f, tilt);
      const sq = m.hurtT > 0 ? 1 + m.hurtT * 1.2 : 1, at = m.atkT > 0 ? 1 + Math.sin((0.3 - m.atkT) / 0.3 * Math.PI) * 0.25 : 1; m.body.scale.set(m.sc * sq * m.show, m.sc * (2 - sq) * at * m.show, m.sc * sq * m.show);
      if (m.castT > 0) m.castT -= dt; if (m.rootT > 0) m.rootT -= dt; if (m.rollT > 0) { m.rollT -= dt; m.body.rotation.x += dt * 22; } else if (m.kind === 'moss') m.body.rotation.x = 0;
      if (m.castT > 0 && !C3.MOBS[m.kind].boss) { const q = 1 + Math.sin(t * 30) * 0.06; m.body.scale.set(m.sc * 1.12 * q, m.sc * 0.8, m.sc * 1.12 * q); }
      if (m.body.anim) m.body.anim(m, t);
      Object.values(m.fxo).forEach(o => { if (o.spin) o.rotation.y = t * o.spin; });
      const showBar = !dead && (m.hp < m.max || TARGET === m.id); m.bar.b.hidden = !showBar; if (showBar) { put2d(m.bar.b, m.x, FY(m.x, m.z) + m.h + 0.35 + m.lift, m.z); m.bar.i.style.width = Math.max(0, m.hp / m.max * 100).toFixed(0) + '%'; m.bar.b.classList.toggle('on', TARGET === m.id); }
      // 線：被縫住、被提線的怪連到操偶師的手上；被提線的有三條（頭和兩邊）
      const top = FY(m.x, m.z) + m.h + m.lift + (charm ? jerk : 0);
      if (lift && !dead) { const z = [...ZONES.values()].find(o => o.g.curtain), bx = z ? z.g.position.x + (m.x - z.g.position.x) * 0.45 : m.x, bz = z ? z.g.position.z + (m.z - z.g.position.z) * 0.45 : m.z, by = FY(m.x, m.z) + (z ? z.g.barY : 6);
        [0, -1, 1].forEach(side => drawThread(m.x + side * 0.4 * m.sc, top - (side ? 0.3 : 0), m.z, bx + side * 0.25, by, bz, 0)); }
      else if (m.tied && !dead) { const p = posOf(m.tied); if (p) { PULL.set(m.tied, 1); const cf = Math.cos(p.face || 0), sf = Math.sin(p.face || 0), hasH = HANDS.has(m.tied);
        // 被提線的：左手兩條、右手三條，分別牽著頭、兩肩、兩側；只是被縫住的：右手一條
        (charm ? [[1, 0, 0, 0], [-1, -1, -0.4, 0.3], [1, 1, 0.4, 0.3], [-1, -2, -0.6, 0.85], [1, 2, 0.6, 0.85]] : [[1, 0, 0, 0.2]]).forEach(a => { const h = hand(p, a[0], m.tied), sp = a[1] * 0.045;
          drawThread(h[0] + cf * sp, h[1] + (hasH ? 0 : charm ? 0.5 : 0), h[2] - sf * sp, m.x + a[2] * m.sc, top - a[3] * Math.min(1, m.h), m.z, charm ? 0.12 : 1, charm ? 0.03 : 0.045); }); } }
    });
    // 被縫在一起的怪：彼此之間也有線
    { const gs = new Map(); MOBS.forEach(m => { if (m.link && !(m.fl & 256) && m.g.visible) { if (!gs.has(m.link)) gs.set(m.link, []); gs.get(m.link).push(m); } });
      gs.forEach(l => { for (let i = 0; i + 1 < l.length; i++) drawThread(l[i].x, FY(l[i].x, l[i].z) + l[i].h * 0.6, l[i].z, l[i + 1].x, FY(l[i + 1].x, l[i + 1].z) + l[i + 1].h * 0.6, l[i + 1].z, 0.6); }); }
    // 操偶師的飛針後面拖著線
    for (let i = NEEDLE.length - 1; i >= 0; i--) { const n = NEEDLE[i]; n.t -= dt; const p = posOf(n.id), b = mobAt(n.m); if (n.t <= 0 || !p || !b) { NEEDLE.splice(i, 1); continue; } const h = hand(p, 1, n.id), k = Math.min(1, (0.32 - n.t) / 0.2); drawThread(h[0], h[1], h[2], h[0] + (b.x - h[0]) * k, h[1] + (b.y - h[1]) * k, h[2] + (b.z - h[2]) * k, 0.2); }
    // 操偶師手上沒牽著東西的時候，指尖垂著幾條短線，一眼看得出是操偶師
    HANDS.forEach((h, id) => { if (h.k > 0.5 && !h.idl) return; const p = posOf(id); if (!p) return; const cf = Math.cos(p.face || 0), sf = Math.sin(p.face || 0);
      [-1, 1].forEach(sd => [-1, 1].forEach(j => { const a = hand(p, sd, id), sw = Math.sin(t * 2.2 + sd + j) * 0.04, x = a[0] + cf * j * 0.04, z = a[2] - sf * j * 0.04; drawThread(x, a[1], z, x + sw, a[1] - 0.3 - (j > 0 ? 0.08 : 0), z + sw * 0.5, 0, 0.018); })); });
    for (let i = thN; i < THREADS.length; i++) THREADS[i].forEach(s => { s.visible = false; });
    if (CUT > 0) CUT -= dt;
    if (FOG) FOG.puffs.forEach(m => { m.position.x = m.x0 + Math.sin(t * 0.4 + m.ph) * 1.5; m.material.opacity = 0.22; });
    // 持續的東西
    ZONES.forEach((o, id) => { o.t += dt; const dur = o.dur || o.z.dur || 1; if (o.g.tick) o.g.tick(t, Math.min(1, o.t / dur)); if (o.t > dur + 1.5) endZone(id); });
    // 使魔和機甲跟著主人
    WHO.forEach(w => { const p = posOf(w.id); if (!p) return; const f = p.face || 0, tgt = w.id === MYID && TARGET ? MOBS.get(TARGET) : null;
      w.famG.forEach((o, i) => { const side = (i % 2 ? -1 : 1) * (o.tier === 3 ? 3.4 : 2.0); follow(o, p.x - Math.sin(f) * 0.8 + Math.cos(f) * side, p.z - Math.cos(f) * 0.8 - Math.sin(f) * side, dt, 3.5); o.ph += dt; if (o.hit > 0) o.hit -= dt; if (o.bond > 0) o.bond -= dt;
        o.g.position.set(o.x, FY(o.x, o.z) + 0.12 + Math.sin(o.ph * 2.2) * 0.1 + (o.hit > 0 ? Math.sin(o.hit / 0.3 * Math.PI) * 0.35 : 0), o.z); o.g.rotation.set(0, o.f, Math.sin(o.ph * 1.6) * 0.04); if (o.g.anim) o.g.anim(o.ph); if (o.bond > 0 && Math.random() < 0.15) rise(o.x, o.z, '#ff9ec4', 1, 0.5, 2, 0.08, 0.7); });
      const M = w.mechG; if (M) { const big = w.mech === 3 ? 2 : 1; M.sc += (big - M.sc) * Math.min(1, dt * 3); const tm = M.hit > 0 ? MOBS.get(M.tm) : null; if (M.hit > 0) M.hit -= dt; if (M.guard > 0) M.guard -= dt;
        const gx = tm ? tm.x - Math.sin(M.f) * (1.6 * M.sc) : M.guard > 0 ? p.x + Math.sin(f) * 1.6 : p.x + Math.sin(f) * 1.2 + Math.cos(f) * 2.0, gz = tm ? tm.z - Math.cos(M.f) * (1.6 * M.sc) : M.guard > 0 ? p.z + Math.cos(f) * 1.6 : p.z + Math.cos(f) * 1.2 - Math.sin(f) * 2.0;
        const d = follow(M, gx, gz, dt, tm ? 12 : 4); if (tm) M.f = Math.atan2(tm.x - M.x, tm.z - M.z); else if (M.guard > 0) M.f = f;
        const sw = M.hit > 0 ? Math.sin((0.45 - M.hit) / 0.45 * Math.PI) : 0, g = M.g; g.position.set(M.x, FY(M.x, M.z) + Math.abs(Math.sin(t * 5)) * (d > 0.4 ? 0.12 : 0.02), M.z); g.rotation.y = M.f; g.scale.setScalar(M.sc * 0.8);
        g.arms.forEach((a, i) => { a.rotation.x = M.guard > 0 ? 0 : -sw * (M.slam || i === 1 ? 2.4 : 0.3) + Math.sin(t * 5 + i * Math.PI) * (d > 0.4 ? 0.35 : 0.04); a.rotation.z = M.guard > 0 ? (i ? 1 : -1) * 1.25 : 0; });
        g.heart.scale.setScalar(1 + Math.sin(t * (w.mech > 1 ? 9 : 4)) * 0.18 + (w.mech > 1 ? 0.5 : 0)); g.aura.visible = w.mech > 1; if (g.aura.visible) { g.aura.rotation.z = t * 2; g.aura.material.color.set(w.mech === 3 ? '#57496f' : '#e2506a'); }
        g.eyes.forEach(e => e.material.color.set(w.mech === 3 ? '#ff5a5a' : w.mech === 2 ? '#ff9ec4' : '#c9a2f2')); if (w.mech === 3 && Math.random() < 0.3) rise(M.x, M.z, '#3a3350', 1, 1.4, 4, 0.16, 0.9); } });
    // 自己的目標：超出距離就自動走過去
    const tm = TARGET ? MOBS.get(TARGET) : null; TRING.visible = !!tm;
    if (tm && MEV) { TRING.position.set(tm.x, FY(tm.x, tm.z) + 0.07, tm.z); const s = tm.sc * 0.95 * (1 + Math.sin(t * 6) * 0.06); TRING.scale.set(s, s, s);
      const range = C3.basicOf(MEV).range + C3.MOBS[tm.kind].r, d = Math.hypot(tm.x - ME.x, tm.z - ME.z), dead = MEV.dead;
      if (!dead && S.ctrl === 'me' && !ctx.moving()) { if (d > range && !HOLD) { const k = (d - range + 0.5) / d; S.goal = { x: ME.x + (tm.x - ME.x) * k, z: ME.z + (tm.z - ME.z) * k, best: 1e9, t: S.time, auto: true }; } else if (d <= range + 0.6) { if (S.goal && S.goal.auto) S.goal = null; if (SPIN <= 0) ctx.faceMe(Math.atan2(tm.x - ME.x, tm.z - ME.z)); } }
      if (ctx.moving() && d > range + 6) HOLD = true; if (!ctx.moving() && d <= range) HOLD = false; }
    if (SPIN > 0) { SPIN -= dt; ctx.faceMe(ME.face + dt * 18); }
    if (SHAKE > 0) { SHAKE -= dt; }
  }
  let HOLD = false;
  return {
    tick, tap, shake: () => (SHAKE > 0 ? SHAKE : 0),
    // 連線那邊接過來的事件
    init: (d, id, send) => { MYID = id; SEND = send; MEV = d.me; MOBS.forEach(m => { G.remove(m.g); m.bar.b.remove(); }); MOBS.clear(); [...WHO.keys()].forEach(dropWho); d.mobs.forEach(addMob); d.who.forEach(setWho); [...DROPS.keys()].forEach(id => dropGone({ id })); (d.drops || []).forEach(addDrop); setFog(d.fog || {}); HOLD = false; TARGET = null; onChange(); },
    me: (d) => { const was = MEV; MEV = d; if (d.dead && TARGET) setTarget(null, true); onChange(was); },
    famPreview: (x, z) => [0, 1, 2].map(i => { const g = new THREE.Group(); FAM[i](g); G.add(g); g.position.set(x + (i - 1) * 1.9, FY(x, z), z); if (g.anim) g.anim(1); return g; }),   // 測試拍照用
    addDrop, dropGone, late, mobs: (l) => l.forEach(setMob), who: setWho, drop: dropWho, fx: onFx, hits: onHits,
    back: (p) => { ctx.moveMe(p.x, p.z, true); S.goal = null; },
    target: () => TARGET, setTarget, nearest, view: () => MEV, field: () => ctx.field,
    // 技能鈕：要選怪的招沒有目標就抓最近的一隻
    cast: (i) => { if (!MEV || MEV.dead) return 'dead'; const k = MEV.slots[i], s = C3.SK[k]; if (!s) return 'none'; let m = TARGET;
      if (s.aim && !m) { const n = nearest(s.range + 4); if (n) { m = n.id; setTarget(m); } else return 'far'; }
      SEND('cb:cast', { i, m }); return 'ok'; },
    onChange: (fn) => { onChange = fn; }, onToast: (fn) => { onToast = fn; }, onPlayer: (fn) => { onPlayer = fn; },
    slow: () => (MEV && MEV.slow ? 0.55 : 1), idleOf: (id) => (WHO.get(id || MYID) || {}).idleK || 0,
    faceCam: () => MOBS.forEach(m => { m.f = Math.atan2(camera.position.x - m.x, camera.position.z - m.z); }),   // 測試拍照用：怪全部轉過來看鏡頭
    debug: () => ({ fog: !!FOG, mobs: [...MOBS.values()].map(m => ({ id: m.id, kind: m.kind, lv: m.lv, x: m.x, z: m.z, hp: m.hp, max: m.max, fl: m.fl, tied: m.tied })), who: [...WHO.values()].map(w => ({ id: w.id, fam: w.fam, mech: w.mech, spec: w.spec })), threads: thN, drops: [...DROPS.values()].map(o => ({ id: o.id, k: o.k, x: o.x, z: o.z })), fx: FX.length, zones: [...ZONES.keys()] }),
  };
}
