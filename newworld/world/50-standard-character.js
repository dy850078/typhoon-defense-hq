// ===== 標準人物（Blender 做的同一個底模，換髮型、上衣、臉、眼鏡、顏色）＋冰龍之翼 =====
// 模型檔由 newworld.html 先下載好放在 window.NW_ASSETS；每個角色都複製一份骨架和材質，各自換裝。
const STD = (() => {
  const AS = window.NW_ASSETS, LIB = window.NW_LIB;
  if (!AS || !AS.char || !LIB) return null;
  const LC = new THREE.Color('#' + (Q.lc || 'c2a48a')), LW = +(Q.lw || 1), HEIGHT = 2.15;
  const FLAT = /face_|glasses|blush|nose/, NOLINE = /face_|blush|nose|glasses|ear_inner|sole|stubble|stripe|string|button|gold/;
  const PARTS = { hair: ['short', 'bowl', 'bob', 'long', 'airy', 'hime', 'bun', 'buns', 'buzz', 'bald'], top: ['tee', 'dress', 'hoodie'], face: ['smile', 'dot', 'grin', 'cat', 'wink', 'wow', 'love', 'star', 'grr', 'cry'] };
  // 職業的服裝和配件：選了職業就換上整套（自己選的上衣還記著，換回一般就穿回來）
  const CLS_KIT = { summoner: { top: 'space', acc: ['Acc_antenna'], hide: ['Shoes', 'Bottom_shorts'] }, skater: { top: 'qi', acc: ['Acc_liangbatou', 'Acc_skates'], hide: ['Shoes'], lift: 0.11 } };
  const PART_SET = new Set(); { const R = /^(Body|Shoes|Glasses|Bottom_|Top_|Hair_|Face_|Acc_)/; AS.char.scene.traverse(o => { if (R.test(o.name) && !(o.parent && R.test(o.parent.name))) PART_SET.add(o.name); }); }   // 零件名稱的規則見 newworld/assets/MOUNTS.md
  const NAMES = { short: '短髮', bowl: '西瓜皮', bob: '妹妹頭', buns: '丸子頭', buzz: '平頭', long: '長髮', airy: '空氣瀏海', hime: '公主切', bun: '包包頭', bald: '光頭', tee: '條紋T', dress: '洋裝', hoodie: '帽T',
    smile: '笑眼', dot: '圓眼', grin: '開心笑', cat: '貓咪嘴', wink: '眨眼吐舌', wow: '驚訝', love: '愛心眼', star: '星星眼', grr: '不爽', cry: '哭哭' };
  // 顏色選項（換裝面板用）：key 是 Blender 裡的材質名稱
  const SWATCH = {
    // 前面幾個是總部（2D）創角可以選的顏色，後面是新世界多的
    hair: ['#2b2a33', '#6b4a32', '#c9772f', '#9aa3b5', '#e6b85a', '#c9566b', '#8fb4d8'],
    skin: ['#fde6d4', '#f6cfae', '#e2a983', '#b77a55'],
    top: ['#ff7a2f', '#4f7cc2', '#aeb6c4', '#2f3b55', '#f2c14e', '#6baf7b', '#f6a3b4'],
  };
  // 總部的髮型對應到新世界有的髮型；還沒做的先用最接近的
  const HAIR_FROM_2D = { short: 'short', bob: 'bob', long: 'long', airy: 'airy', hime: 'hime', bun: 'bun', buns: 'buns', buzz: 'buzz', bald: 'bald' };
  const fromAccount = (b) => ({ hair: HAIR_FROM_2D[b.hair] || 'bowl', top: 'tee', face: PARTS.face.indexOf(b.face) >= 0 ? b.face : 'smile', glasses: !!b.glasses, wings: false, hairCol: b.hairColor || null, skinCol: b.skin || null, topCol: b.outfit || null });
  // 鼻子、耳朵內側：比膚色紅一點、深一點
  const skinTint = (hex, k) => { const c = new THREE.Color(hex), h = {}; c.getHSL(h); return '#' + c.setHSL(Math.max(0, h.h - 0.025), Math.min(1, h.s + 0.08), h.l * k).getHexString(); };

  // 冰龍之翼：翼膜蠟筆筆觸＋亮點，骨頭淡顆粒（跟試做的冰翼一樣）
  const RAMP4 = (() => { const t = new THREE.DataTexture(new Uint8Array([120, 175, 225, 255]), 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
  const CRAYON = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'), r = rnd(21); x.fillStyle = '#cfcfcf'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const a = r() * 512, b = r() * 512, l = 8 + r() * 22, th = -0.9 + (r() - 0.5) * 0.5; x.strokeStyle = r() < 0.55 ? `rgba(20,30,90,${0.1 + r() * 0.16})` : `rgba(255,255,255,${0.14 + r() * 0.22})`; x.lineWidth = 1.5 + r() * 3.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(a + Math.cos(th) * l, b + Math.sin(th) * l); x.stroke(); }
    for (let k = 0; k < 12; k++) { const cx = r() * 512, cy = r() * 512, n = 4 + (r() * 4 | 0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (r() < 0.25) continue; x.fillStyle = `rgba(255,255,255,${0.75 + r() * 0.25})`; x.beginPath(); x.arc(cx + i * 15 + j * 5, cy + j * 15 - i * 5, 2.6 + r() * 1.8, 0, 7); x.fill(); } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.2, 2.2); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const BGRAIN = GRAIN.clone(); BGRAIN.repeat.set(6, 6); BGRAIN.needsUpdate = true;
  const outlines = [];
  // 外框：同一份骨架，往外推一點、只畫背面
  function addLine(o, w) {
    const om = new THREE.MeshBasicMaterial({ color: LC, side: THREE.BackSide });
    om.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * ' + (w * LW).toFixed(4) + ';'); };
    const ol = o.clone(); ol.material = om; ol.castShadow = false; ol.frustumCulled = false; ol.bind(o.skeleton, o.bindMatrix); o.parent.add(ol); o.userData.line = ol; outlines.push(ol); return ol;
  }
  const scale0 = (() => { const b = new THREE.Box3().setFromObject(AS.char.scene); return HEIGHT / Math.max(0.01, b.max.y - b.min.y); })();

  function makeWing(g) {   // 一邊的翅膀；回傳兩節骨頭和原本的轉向
    const w = LIB.SkeletonUtils.clone(AS.wing.scene), bones = {};
    w.traverse(o => { if (o.isBone) bones[o.name] = o; if (!o.isMesh) return;
      const src = o.material, vc = src.name === 'membrane';
      o.material = new THREE.MeshToonMaterial({ color: vc ? new THREE.Color(1.3, 1.3, 1.3) : src.color, vertexColors: vc, map: vc ? CRAYON : BGRAIN, gradientMap: RAMP4, side: THREE.DoubleSide });
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; addLine(o, 0.03); });
    const rest = {}; for (const n in bones) rest[n] = bones[n].quaternion.clone();
    return { w, bones, rest };
  }

  function make(look) {
    const g = LIB.SkeletonUtils.clone(AS.char.scene), meshes = [], bones = {};
    g.traverse(o => { if (o.isBone) bones[o.name] = o; if (o.isMesh) meshes.push(o); });
    meshes.forEach(o => {
      let p = o; while (p && !PART_SET.has(p.name) && p.parent) p = p.parent;   // 多材質的零件會拆成好幾個子網格，往上找零件名稱
      o.userData.part = p ? p.name : o.name;
      const src = o.material, nm = src.name;
      o.material = new THREE.MeshToonMaterial({ color: src.color.clone(), map: src.map || (FLAT.test(nm) ? null : GRAIN), gradientMap: RAMP });
      o.material.userData = { name: nm, base: src.color.clone(), hasMap: !!src.map };
      if (/face_line/.test(nm)) o.material.color.set(INK);
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
      if (!NOLINE.test(nm)) addLine(o, 0.02);
    });
    const H = new THREE.Group(), body = new THREE.Group(); body.add(g); g.scale.setScalar(scale0); H.add(body); scene.add(H);
    const mixer = new THREE.AnimationMixer(g), acts = {};
    AS.char.animations.forEach(a => { acts[a.name] = mixer.clipAction(a); acts[a.name].play(); });
    // 翅膀掛在脊椎骨上：先在角色自己的座標裡定好位置，再換算到骨頭底下
    g.updateMatrixWorld(true);
    const spine = bones.spine, wings = [-1, 1].map(k => {
      const piv = new THREE.Group(), W = makeWing(g), holder = new THREE.Group();
      holder.scale.set(k * 0.72 / scale0, 0.72 / scale0, 0.72 / scale0); holder.add(W.w); piv.add(holder);
      const want = new THREE.Matrix4().compose(new THREE.Vector3(0.1 * k, 0.98, -0.3), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      const inv = new THREE.Matrix4().copy(spine.matrixWorld).invert().multiply(g.matrixWorld).multiply(want);
      inv.decompose(piv.position, piv.quaternion, piv.scale); spine.add(piv); return { piv, k, ...W };
    });
    const c = { H, body, g, meshes, mixer, acts, wings, look: {}, ph: Math.random() * 6, mv: 0, flap: Math.random(), wt: { idle: 1, walk: 0, run: 0, sit: 0, wave: 0, skate: 0 }, emote: null, emoteT: 0 };
    for (const n in W_DEFAULT) c.look[n] = W_DEFAULT[n];
    setLook(c, look); return c;
  }
  const W_DEFAULT = { hair: 'bowl', top: 'tee', face: 'smile', glasses: true, wings: false, hairCol: null, skinCol: null, topCol: null, cls: null };

  function setLook(c, patch) {
    Object.assign(c.look, patch || {}); const L = c.look;
    const kit = CLS_KIT[L.cls] || null;
    const want = new Set(['Body', 'Shoes', 'Bottom_shorts', 'Hair_' + L.hair, 'Top_' + (kit ? kit.top : L.top), 'Face_' + (c.emote || L.face)].concat(L.glasses ? ['Glasses'] : [], kit ? kit.acc : []));
    if (kit) kit.hide.forEach(n => want.delete(n));
    c.g.position.y = kit && kit.lift ? kit.lift * HEIGHT / 2.26 : 0;   // 冰刀比鞋底低，人要墊高一點
    c.meshes.forEach(o => { const on = want.has(o.userData.part); o.visible = on; if (o.userData.line) o.userData.line.visible = on && SHOW.lines && !c.far;
      const m = o.material, nm = m.userData.name; let col = null;
      if (nm === 'hair' && L.hairCol) col = L.hairCol;
      if (nm === 'skin' && L.skinCol) col = L.skinCol;
      if (nm === 'nose' && L.skinCol) col = skinTint(L.skinCol, 0.86);
      if (nm === 'ear_inner' && L.skinCol) col = skinTint(L.skinCol, 0.88);
      if (/^(tee|dress|hoodie)$/.test(nm) && L.topCol) col = L.topCol;
      // 條紋T 換顏色：白底藍條紋整件染上那個顏色，條紋還在
      if (col) m.color.set(col); else { m.color.copy(m.userData.base); if (/face_line/.test(nm)) m.color.set(INK); }
    });
    c.wings.forEach(w => { w.piv.visible = !!L.wings; w.w.traverse(o => { if (o.isMesh && o.userData.line) o.userData.line.visible = !!L.wings && SHOW.lines; }); });
  }
  const SHOW = { lines: true };

  // 每一格的動作：mv 0 = 站著、1 = 走路；翅膀上抬慢、下拍快
  const Y = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), pw = new THREE.Quaternion(), pq = new THREE.Quaternion();
  function swing(bone, restQ, piv, a) { bone.quaternion.copy(restQ); bone.parent.updateWorldMatrix(true, false); bone.parent.getWorldQuaternion(pw); piv.getWorldQuaternion(pq);
    q.setFromAxisAngle(Y.clone().applyQuaternion(pq).applyQuaternion(pw.invert()), a); bone.quaternion.premultiply(q); }
  const ease = (u) => u < 0.62 ? 0.5 - 0.5 * Math.cos(u / 0.62 * Math.PI) : 0.5 + 0.5 * Math.cos((u - 0.62) / 0.38 * Math.PI);
  // pose：null 一般（站著或走路）、'sit' 坐著、'wave' 揮手、'run' 用跑的
  function tick(c, dt, mv, speed = 1, pose = null) {
    c.mv += (mv - c.mv) * Math.min(1, dt * 8);
    if (c.emote && performance.now() > c.emoteT) { c.emote = null; setLook(c); }   // 表情照真實時間算，畫面卡也是 5 秒
    const m = c.mv, tg = { idle: 1 - m, walk: m, run: 0, sit: 0, wave: 0, skate: 0 };
    if (pose === 'sit') { tg.idle = tg.walk = 0; tg.sit = 1; }
    else if (pose === 'wave') { tg.wave = tg.idle; tg.idle = 0; }
    else if (pose === 'run') { tg.run = tg.walk; tg.walk = 0; }
    if (c.look.cls === 'skater' && c.acts.skate) { tg.skate = tg.walk + tg.run; tg.walk = tg.run = 0; }   // 陵媒用溜的
    const k = Math.min(1, dt * 9);
    for (const n in tg) { const a = c.acts[n]; if (!a) continue; c.wt[n] += (tg[n] - c.wt[n]) * k; a.setEffectiveWeight(c.wt[n]); }
    c.acts.walk.timeScale = speed; if (c.acts.run) c.acts.run.timeScale = speed * 0.8; if (c.acts.skate) c.acts.skate.timeScale = speed * 0.55; c.mixer.update(dt);
    if (!c.look.wings) return;
    c.flap = (c.flap + dt / (c.mv > 0.5 ? 1.1 : 1.8)) % 1;
    c.H.updateMatrixWorld(true);
    c.wings.forEach(w => { const u = c.flap, u2 = (u - 0.08 + 1) % 1, f = 0.7 + 0.3 * c.mv;
      swing(w.bones.wing_root, w.rest.wing_root, w.piv, 0.15 + 0.55 * ease(u) * f); swing(w.bones.wing_hand, w.rest.wing_hand, w.piv, (0.1 + 0.6 * ease(u2)) * f); });
  }
  function lines(on) { SHOW.lines = on; ALL.forEach(c => setLook(c)); }
  const ALL = [];
  // 有人離開時把這個人物用掉的東西還回去：材質、骨架貼圖、動畫；形狀和共用的貼圖大家一起用，不能丟
  function dispose(c) {
    const i = ALL.indexOf(c); if (i >= 0) ALL.splice(i, 1);
    c.mixer.stopAllAction(); c.mixer.uncacheRoot(c.g);
    const sk = new Set();
    c.H.traverse(o => { if (!o.isMesh) return; const k = outlines.indexOf(o); if (k >= 0) outlines.splice(k, 1);
      if (o.material) o.material.dispose(); if (o.skeleton) sk.add(o.skeleton); });
    sk.forEach(s => s.dispose());
    if (c.H.parent) c.H.parent.remove(c.H);
  }
  return { make: (look) => { const c = make(look); ALL.push(c); return c; }, dispose, lineCount: () => outlines.length, far: (c, far) => { if (!!c.far !== far) { c.far = far; c.meshes.forEach(o => { o.castShadow = !far; }); setLook(c); } },   // 離得遠的人不畫外框、不投影子，面數少一大半
    emote: (c, face, secs) => { c.emote = PARTS.face.indexOf(face) >= 0 ? face : null; c.emoteT = performance.now() + (secs || 5) * 1000; setLook(c); }, setLook, tick, lines, PARTS, NAMES, SWATCH, fromAccount, all: ALL };
})();
// 一般玩家換成標準人物；自己的角色也是標準人物，背上可以開冰龍之翼
if (STD && TW) {
  [TW.h1, TW.h2, TW.h3].forEach(h => { h.visible = false; });
  const at = (c, x, z, ry) => { c.H.position.set(x, 0, z); c.H.rotation.y = ry; return c; };
  TW.s1 = at(STD.make({ hair: 'bowl', top: 'tee', face: 'smile', glasses: true }), -7.4, 6.2, 0);
  TW.s2 = at(STD.make({ hair: 'bob', top: 'dress', face: 'dot', glasses: false, hairCol: '#7a4a2e' }), -2.4, 9.8, -0.9);
  TW.s3 = at(STD.make({ hair: 'buns', top: 'hoodie', face: 'dot', glasses: true, skinCol: '#e9b98f', topCol: '#8fc2a0' }), -4.9, 10.6, 1.6);
  TW.me = at(STD.make({ hair: 'bob', top: 'dress', face: 'smile', glasses: true, wings: true, hairCol: '#e6b85a', topCol: '#b9a6e0' }), 2.5, 14, 0);
}



// ---- 燈光：兩版都用暖光 ----
scene.add(new THREE.HemisphereLight(0xfff6e0, 0xd9d39a, STYLE === 'clay' ? 1.35 : 1.9));
const sun = new THREE.DirectionalLight(0xffe9c4, STYLE === 'clay' ? 2.7 : 1.8); sun.position.set(-6, 11, 9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 12, bottom: -5, near: 1, far: 45 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; sun.shadow.radius = STYLE === 'clay' ? 5 : 1.5;
scene.add(sun);


