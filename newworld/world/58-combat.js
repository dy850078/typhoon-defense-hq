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
  let MYID = null, MEV = null, SEND = () => {}, onChange = () => {}, onToast = () => {};
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
  const MODEL = {
    slime: (g, lv) => { part(g, sph(0.55, 16, 12), lv > 4 ? '#f2b0a0' : '#8fb7d8', { pos: [0, 0.42, 0], scale: [1, 0.8, 1] }); eyes(g, 0.5, 0.46, 0.19, 0.1); [-1, 1].forEach(k => part(g, sph(0.08, 8, 6), '#f7a8c4', { pos: [0.32 * k, 0.38, 0.4], scale: [1, 0.6, 0.4], noLine: true, shadow: false })); },
    shroom: (g, lv) => { part(g, sph(0.34), '#f3e9d2', { pos: [0, 0.38, 0], scale: [1, 1.15, 1] }); part(g, sph(0.62), lv > 13 ? '#b56bd0' : '#e58a8a', { pos: [0, 0.82, 0], scale: [1, 0.55, 1] });
      [[0.25, 0.98, 0.3], [-0.3, 0.95, 0.15], [0.05, 1.08, -0.2]].forEach(p => part(g, sph(0.1, 8, 6), '#fbf7ee', { pos: p, scale: [1, 0.4, 1], noLine: true, shadow: false })); eyes(g, 0.42, 0.31, 0.13, 0.07); },
    golem: (g, lv) => { const c = lv > 27 ? '#8a8f9c' : '#a8a39a'; part(g, GEO.box, c, { pos: [0, 0.75, 0], scale: [1.0, 0.95, 0.75] }); part(g, GEO.box, c, { pos: [0, 1.45, 0.05], scale: [0.62, 0.5, 0.56] });
      [-1, 1].forEach(k => part(g, GEO.box, '#8d877d', { pos: [0.72 * k, 0.72, 0], scale: [0.36, 0.8, 0.4] })); eyes(g, 1.47, 0.3, 0.15, 0.09, '#ffd76a'); part(g, sph(0.22, 8, 6), '#7fae6a', { pos: [0.3, 1.26, 0.1], scale: [1.2, 0.4, 1], noLine: true }); },
    wisp: (g) => { g.float = 0.5; part(g, sph(0.48, 14, 10), '#3d3552', { pos: [0, 0.6, 0], scale: [1, 1.2, 1] }); part(g, new THREE.ConeGeometry(0.4, 0.8, 8), '#3d3552', { pos: [0, 0.05, 0], rot: [Math.PI, 0, 0] }); eyes(g, 0.68, 0.42, 0.16, 0.08, '#d9f1ff'); },
    boss: (g) => { MODEL.golem(g, 40); part(g, GEO.box, '#7fae6a', { pos: [0, 1.75, 0.05], scale: [0.7, 0.14, 0.62] }); [-1, 1].forEach(k => part(g, new THREE.ConeGeometry(0.14, 0.4, 5), '#e8dcc0', { pos: [0.24 * k, 1.95, 0.05], rot: [0, 0, -0.3 * k] })); g.sc = 2.3; },
  };
  const mkBar = () => { const b = document.createElement('div'), i = document.createElement('i'), n = document.createElement('span'); b.className = 'cb-bar'; b.append(n, i); b.hidden = true; LAB.appendChild(b); return { b, i, n }; };
  function addMob(d) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body); MODEL[d.kind](body, d.lv); const sc = body.sc || 1; body.scale.setScalar(sc); G.add(g);
    const h = (d.kind === 'golem' ? 1.8 : d.kind === 'shroom' ? 1.25 : 1.1) * sc, m = { id: d.id, kind: d.kind, lv: d.lv, x: d.x, z: d.z, tx: d.x, tz: d.z, hp: d.hp, max: d.max, fl: d.hp ? 0 : 256, g, body, h, sc, ph: Math.random() * 6, bar: mkBar(), fxo: {}, show: 0, f: 0, hurtT: 0 };
    m.bar.n.textContent = 'Lv.' + d.lv + ' ' + C3.MOBS[d.kind].name; g.position.set(d.x, FY(d.x, d.z), d.z); g.visible = false; MOBS.set(d.id, m);
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
  function tap(cx, cy) { if (S.lob || !MEV) return false; NDC.set(cx / W * 2 - 1, -(cy / H) * 2 + 1); RAY.setFromCamera(NDC, camera); let best = null, bd = 1e9;
    MOBS.forEach(m => { if (m.fl & 256 || !m.g.visible) return; PV.set(m.x, FY(m.x, m.z) + m.h * 0.5, m.z); const d = RAY.ray.distanceToPoint(PV); if (d < Math.max(0.9, m.h * 0.6) && d < bd) { bd = d; best = m; } });
    if (!best) { if (TARGET && RAY.ray.intersectPlane(GP, HP3)) setTarget(null); return false; } HOLD = false; setTarget(best.id); S.goal = null; return true; }
  const nearest = (r) => { let best = null, bd = r; MOBS.forEach(m => { if (m.fl & 256) return; const d = Math.hypot(m.x - ME.x, m.z - ME.z); if (d < bd) { bd = d; best = m; } }); return best; };

  // ---------- 使魔（繪師的聖誕外星人）和夢魘機甲 ----------
  const FAM = {
    0: (g) => { part(g, GEO.cyl, '#2f5d3a', { pos: [0, 0.45, 0], scale: [0.2, 0.9, 0.2] }); const h = part(g, GEO.star, '#f6a9c0', { pos: [0, 1.12, 0], scale: [0.5, 0.42, 0.26], rot: [0, 0, 0.5] }); h.name = 'head';
      eyes(g, 1.16, 0.2, 0.12, 0.06); part(g, sph(0.05, 6, 6), '#d23a4a', { pos: [0, 1.0, 0.22], scale: [1.4, 0.7, 0.5], noLine: true, shadow: false });
      [-1, 1].forEach(k => part(g, sph(0.3, 10, 8), '#9fdc9a', { pos: [0.3 * k, 0.75, -0.2], scale: [0.55, 1.2, 0.12], rot: [0, 0.5 * k, -0.5 * k], noLine: true })); g.H = 1.5; },
    1: (g) => { part(g, GEO.cyl, '#2f5d3a', { pos: [0, 0.75, 0], scale: [0.3, 1.5, 0.3] }); part(g, sph(0.6, 14, 10), '#8fa38a', { pos: [0, 1.62, 0], scale: [1.15, 0.36, 0.8] });
      [-1, 0, 1].forEach(k => part(g, sph(0.07, 8, 6), '#f2d86a', { pos: [0.16 * k, 1.64, 0.42], scale: [1, 0.8, 0.5], noLine: true, shadow: false, mat: basic('#f2d86a') }));
      [-1, 1].forEach(k => { part(g, GEO.cyl, '#6fbf6a', { pos: [0.16 * k, 1.95, 0], scale: [0.025, 0.4, 0.025], noLine: true }); part(g, GEO.star, '#8fd36a', { pos: [0.16 * k, 2.2, 0], scale: [0.2, 0.2, 0.08], noLine: true }); });
      part(g, GEO.cyl, '#f08aa8', { pos: [0.42, 1.0, 0.25], scale: [0.12, 0.22, 0.12] }); part(g, GEO.star, '#c8323c', { pos: [0.42, 1.36, 0.25], scale: [0.2, 0.2, 0.08], noLine: true }); g.H = 2.3; },
    2: (g) => { part(g, GEO.cyl, '#f3a5b8', { pos: [0, 0.95, 0], scale: [0.46, 1.9, 0.42] }); part(g, GEO.box, '#fbf3e4', { pos: [0, 1.25, 0.34], scale: [0.4, 0.9, 0.12], noLine: true });
      part(g, sph(0.3, 12, 10), '#6fbf6a', { pos: [0, 2.2, 0.05], scale: [1, 1.1, 1] }); part(g, sph(0.2, 10, 8), '#6fbf6a', { pos: [0, 2.12, 0.45], scale: [0.6, 0.45, 2.0] });
      eyes(g, 2.3, 0.26, 0.2, 0.06); part(g, new THREE.TorusGeometry(0.24, 0.07, 6, 14), '#3f8a4f', { pos: [0, 2.72, 0], noLine: true }); part(g, sph(0.07, 6, 6), '#e9c46a', { pos: [0, 2.72, 0], noLine: true });
      [0, 1, 2].forEach(i => part(g, sph(0.05, 6, 6), '#d23a4a', { pos: [Math.cos(i * 2.1) * 0.24, 2.72 + Math.sin(i * 2.1) * 0.24, 0.05], noLine: true, shadow: false })); g.H = 3.0; },
    3: (g) => { FAM[2](g); const halo = flat(mesh(GEO.ring, bm('#ffe9a8', 0.9), g)); halo.position.y = 3.25; halo.scale.setScalar(0.55); [0, 1, 2, 3, 4].forEach(i => { const b = mesh(GEO.star, bm(['#ffd76a', '#f08aa8', '#9fdc9a'][i % 3]), g); b.scale.setScalar(0.09); b.position.set(Math.cos(i * 1.26) * 0.5, 1.2 + i * 0.25, Math.sin(i * 1.26) * 0.5); }); g.scale.setScalar(1.7); g.H = 5.1; },
  };
  const mkMecha = () => { const g = new THREE.Group(), c1 = '#3a3350', c2 = '#57496f';
    part(g, GEO.box, c1, { pos: [0, 1.75, 0], scale: [1.5, 1.3, 1.0] }); part(g, GEO.box, c2, { pos: [0, 2.75, 0.05], scale: [0.85, 0.7, 0.8] }); part(g, GEO.box, '#1d1a2b', { pos: [0, 2.75, 0.42], scale: [0.6, 0.4, 0.1], noLine: true });
    g.eyes = [-1, 1].map(k => part(g, sph(0.07, 8, 6), '#c9a2f2', { pos: [0.16 * k, 2.78, 0.47], noLine: true, shadow: false, mat: new THREE.MeshBasicMaterial({ color: '#c9a2f2' }) }));
    part(g, GEO.box, '#1d1a2b', { pos: [0, 1.8, 0.48], scale: [0.6, 0.6, 0.1], noLine: true }); g.heart = part(g, sph(0.17, 10, 8), '#e2506a', { pos: [0, 1.8, 0.52], noLine: true, shadow: false, mat: new THREE.MeshBasicMaterial({ color: '#e2506a' }) });
    g.arms = [-1, 1].map(k => { const a = new THREE.Group(); a.position.set(1.0 * k, 2.2, 0); part(a, GEO.box, c2, { pos: [0, -0.6, 0], scale: [0.45, 1.3, 0.5] }); part(a, sph(0.4, 10, 8), c1, { pos: [0, -1.4, 0], scale: [1, 1, 1] }); g.add(a); return a; });
    [-1, 1].forEach(k => part(g, GEO.box, c1, { pos: [0.42 * k, 0.55, 0], scale: [0.5, 1.1, 0.6] }));
    g.aura = flat(mesh(GEO.ring, bm('#e2506a', 0.8).clone(), g)); g.aura.position.y = 0.08; g.aura.scale.setScalar(1.6); g.aura.visible = false; return g; };
  const follow = (o, tx, tz, dt, sp) => { const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d > 20) { o.x = tx; o.z = tz; return 0; } const k = Math.min(1, dt * sp); o.x += dx * k; o.z += dz * k; if (d > 0.3) { let df = Math.atan2(dx, dz) - o.f; df = Math.atan2(Math.sin(df), Math.cos(df)); o.f += df * Math.min(1, dt * 8); } return d; };
  function setWho(d) { let w = WHO.get(d.id); if (!w) { w = { id: d.id, fam: [], famG: [], mech: 0 }; WHO.set(d.id, w); } Object.assign(w, { lv: d.lv, school: d.school, spec: d.spec, hp: d.hp, hpMax: d.hpMax });
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
  function late(dt) {
    const t = S.time;
    WHO.forEach(w => { if (w.spec !== 'puppeteer') { HANDS.delete(w.id); return; }
      const c = charOf(w.id), p = posOf(w.id); if (!c || !p) return; const B = bonesOf(c); if (!B.upper_armL || !B.handL) return;
      let h = HANDS.get(w.id); if (!h) { h = { k: 0, up: 0, yank: 0, L: [-0.42, 1.0, 0.1], R: [0.42, 1.0, 0.1] }; HANDS.set(w.id, h); }
      const up = [...ZONES.values()].some(o => o.g.curtain && o.z.id === w.id && o.t < (o.z.dur || 2)) ? 1 : 0, want = up || h.yank > 0 || PULL.get(w.id) ? 1 : 0;
      h.k += (want - h.k) * Math.min(1, dt * 9); h.up += (up - h.up) * Math.min(1, dt * 7); if (h.yank > 0) h.yank -= dt;
      const f = p.face || 0, y = h.yank > 0 ? Math.sin((1 - h.yank / 0.45) * Math.PI) : 0, gy = FY(p.x, p.z);
      [['L', -1], ['R', 1]].forEach(([n, sd]) => { const ua = B['upper_arm' + n], la = B['lower_arm' + n], hd = B['hand' + n];
        if (h.k > 0.02) { const bob = (Math.sin(t * 9 + sd) * 0.1 + (Math.floor(t * 6) % 2 ? 0.1 : -0.1) * sd) * (1 - h.up), sway = h.up * Math.sin(t * 2) * 0.25;   // 一手高一手低，跟著偶一頓一頓
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
    mobAtk: (e) => { const m = MOBS.get(e.m); if (m) m.atkT = 0.3; },
    lvup: (e, p) => { ring(p.x, p.z, 2.4, '#ffd76a', 0.9); rise(p.x, p.z, '#ffe27a', 16, 1, 3.4, 0.14, 1.2, GEO.star); num(p.x, FY(p.x, p.z) + 2.8, p.z, 'Lv.' + e.lv, 'lv'); },
    promote: (e, p) => { circle(p.x, p.z, 3, '#ffe9a8', 1.6); for (let i = 0; i < 3; i++) setTimeout(() => { const q = posOf(e.id) || p; ring(q.x, q.z, 3 + i, '#ffd76a', 0.9); rise(q.x, q.z, '#ffe27a', 14, 1.6, 4, 0.15, 1.3, GEO.star); }, i * 250); },
    down: (e, p) => { ring(p.x, p.z, 1.6, '#9a96a0', 0.8); },
  };
  let SPIN = 0, SHAKE = 0, CUT = 0; const NEEDLE = [];
  function onFx(e) { const p = e.id ? posOf(e.id) : null; if (e.id && !p) return; if (S.lob) return; const k = e.k === 'pact2' ? 'pact2' : e.k; if (ON[k]) ON[k](e, p); }
  function onHits(list) { if (S.lob) return; list.forEach(([id, d, kind]) => { if (id[0] === 'p') { const p = posOf(id.slice(2)); if (p) num(p.x, FY(p.x, p.z) + 2.4, p.z, d < 0 ? '+' + (-d) : String(d), d < 0 ? 'heal' : 'ow'); }
    else { const m = MOBS.get(id); if (m && m.g.visible) num(m.x, FY(m.x, m.z) + m.h + 0.4, m.z, String(d), kind === 'dot' || kind === 'poison' ? 'poison' : kind === 'link' ? 'link' : ''); } }); }

  // ---------- 每一格畫面 ----------
  function tick(dt) {
    const t = S.time, lob = !!S.lob; G.visible = !lob;
    for (let i = NUMS.length - 1; i >= 0; i--) { const n = NUMS[i]; n.t += dt; if (n.t > 0.9 || lob) { n.el.remove(); NUMS.splice(i, 1); continue; } if (put2d(n.el, n.x, n.y + n.t * 1.6, n.z)) n.el.style.opacity = String(Math.min(1, (0.9 - n.t) * 3)); }
    if (lob) { MOBS.forEach(m => { m.bar.b.hidden = true; }); return; }
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
      const hop = held ? 0 : m.kind === 'wisp' ? 0.5 + Math.sin(m.ph * 2) * 0.15 : Math.abs(Math.sin(m.ph * (d > 0.05 ? 6 : 2.4))) * (d > 0.05 ? 0.3 : 0.1);
      m.g.position.set(m.x, FY(m.x, m.z) + (charm ? jerk : hop) + m.lift + (m.air || 0), m.z); m.g.rotation.set(lift ? Math.max(0, Math.sin(t * 5 + m.x)) * 0.55 : 0, lift ? 0 : m.f, tilt);
      const sq = m.hurtT > 0 ? 1 + m.hurtT * 1.2 : 1, at = m.atkT > 0 ? 1 + Math.sin((0.3 - m.atkT) / 0.3 * Math.PI) * 0.25 : 1; m.body.scale.set(m.sc * sq * m.show, m.sc * (2 - sq) * at * m.show, m.sc * sq * m.show);
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
    HANDS.forEach((h, id) => { if (h.k > 0.5) return; const p = posOf(id); if (!p) return; const cf = Math.cos(p.face || 0), sf = Math.sin(p.face || 0);
      [-1, 1].forEach(sd => [-1, 1].forEach(j => { const a = hand(p, sd, id), sw = Math.sin(t * 2.2 + sd + j) * 0.04, x = a[0] + cf * j * 0.04, z = a[2] - sf * j * 0.04; drawThread(x, a[1], z, x + sw, a[1] - 0.3 - (j > 0 ? 0.08 : 0), z + sw * 0.5, 0, 0.018); })); });
    for (let i = thN; i < THREADS.length; i++) THREADS[i].forEach(s => { s.visible = false; });
    if (CUT > 0) CUT -= dt;
    // 持續的東西
    ZONES.forEach((o, id) => { o.t += dt; const dur = o.dur || o.z.dur || 1; if (o.g.tick) o.g.tick(t, Math.min(1, o.t / dur)); if (o.t > dur + 1.5) endZone(id); });
    // 使魔和機甲跟著主人
    WHO.forEach(w => { const p = posOf(w.id); if (!p) return; const f = p.face || 0, tgt = w.id === MYID && TARGET ? MOBS.get(TARGET) : null;
      w.famG.forEach((o, i) => { const side = (i % 2 ? -1 : 1) * (o.tier === 3 ? 3.4 : 2.0); follow(o, p.x - Math.sin(f) * 0.8 + Math.cos(f) * side, p.z - Math.cos(f) * 0.8 - Math.sin(f) * side, dt, 3.5); o.ph += dt; if (o.hit > 0) o.hit -= dt; if (o.bond > 0) o.bond -= dt;
        o.g.position.set(o.x, FY(o.x, o.z) + 0.12 + Math.sin(o.ph * 2.2) * 0.1 + (o.hit > 0 ? Math.sin(o.hit / 0.3 * Math.PI) * 0.35 : 0), o.z); o.g.rotation.set(0, o.f, Math.sin(o.ph * 1.6) * 0.06); if (o.bond > 0 && Math.random() < 0.15) rise(o.x, o.z, '#ff9ec4', 1, 0.5, 2, 0.08, 0.7); });
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
    init: (d, id, send) => { MYID = id; SEND = send; MEV = d.me; MOBS.forEach(m => { G.remove(m.g); m.bar.b.remove(); }); MOBS.clear(); [...WHO.keys()].forEach(dropWho); d.mobs.forEach(addMob); d.who.forEach(setWho); HOLD = false; TARGET = null; onChange(); },
    me: (d) => { const was = MEV; MEV = d; if (d.dead && TARGET) setTarget(null, true); onChange(was); },
    late, mobs: (l) => l.forEach(setMob), who: setWho, drop: dropWho, fx: onFx, hits: onHits,
    back: (p) => { ctx.moveMe(p.x, p.z, true); S.goal = null; },
    target: () => TARGET, setTarget, nearest, view: () => MEV, field: () => ctx.field,
    // 技能鈕：要選怪的招沒有目標就抓最近的一隻
    cast: (i) => { if (!MEV || MEV.dead) return 'dead'; const k = MEV.slots[i], s = C3.SK[k]; if (!s) return 'none'; let m = TARGET;
      if (s.aim && !m) { const n = nearest(s.range + 4); if (n) { m = n.id; setTarget(m); } else return 'far'; }
      SEND('cb:cast', { i, m }); return 'ok'; },
    onChange: (fn) => { onChange = fn; }, onToast: (fn) => { onToast = fn; },
    debug: () => ({ mobs: [...MOBS.values()].map(m => ({ id: m.id, kind: m.kind, lv: m.lv, x: m.x, z: m.z, hp: m.hp, fl: m.fl, tied: m.tied })), who: [...WHO.values()].map(w => ({ id: w.id, fam: w.fam, mech: w.mech, spec: w.spec })), threads: thN, fx: FX.length, zones: [...ZONES.keys()] }),
  };
}
