// ===== 擺在一起看：機器人職業 + 一般玩家角色 + 寵物 + 怪 + 小屋和樹 =====
const TW = Q.town ? (() => {
  const T = {}, S = 1.25;
  const put = (obj, x, z, ry = 0, s = S) => { const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = ry; h.scale.setScalar(s); h.add(obj); scene.add(h); return h; };
  // 玩家一：眼鏡、天使翅膀和光環
  T.c1 = makeChar({ coat: PAL.coat, hair: PAL.hair, glasses: 1, wings: 1 }); T.h1 = put(T.c1, -6, 6);
  // 玩家二：鮑伯頭、藍雨衣
  T.c2 = makeChar({ coat: PAL.coat2, hair: PAL.hair2, hairStyle: 'bob', hideEars: 1, skin: PAL.skin2 }); T.h2 = put(T.c2, -2.4, 9.8, -0.9);
  // 玩家三：綠雨衣、草帽
  T.c3 = makeChar({ coat: '#8fae5a', hair: '#7a5236', skin: PAL.skin }); T.h3 = put(T.c3, -4.9, 10.6, 1.6);
  part(T.c3.head, new THREE.CylinderGeometry(0.78, 0.8, 0.05, 28), '#f0d58a', { pos: [0, 0.3, 0], rot: [-0.12, 0, 0], line: 0.02 });
  part(T.c3.head, new THREE.SphereGeometry(0.44, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), '#f0d58a', { pos: [0, 0.3, 0], rot: [-0.12, 0, 0], scale: [1, 0.8, 1], line: 0.02 });
  part(T.c3.head, new THREE.CylinderGeometry(0.45, 0.45, 0.1, 24), PAL.scarf, { pos: [0, 0.36, 0], rot: [-0.12, 0, 0], noLine: true });
  T.pet = makePet(); T.hp = put(T.pet, -3.4, 12.0, 0.9);
  // 怪：兩隻果凍、一隻香菇怪
  const slime = (x, z, col, s) => { const g = new THREE.Group();
    const body = part(g, sph(1, 28, 20), col, { pos: [0, 0.8, 0], scale: [1.2, 0.85, 1.2], line: 0.05, extra: NOMAP });
    part(g, sph(0.35, 12, 10), '#fff', { pos: [-0.35, 1.25, 0.55], noLine: true, shadow: false, mat: basic('#fffdf0', { transparent: true, opacity: 0.55 }) });
    [-0.34, 0.34].forEach(k => part(g, sph(0.13, 10, 8), DARK, { pos: [k, 0.85, 1.12], scale: [1, 1.3, 0.6], noLine: true, shadow: false, mat: basic(DARK) }));
    [-0.62, 0.62].forEach(k => part(g, sph(0.16, 10, 8), '#f0a9a6', { pos: [k, 0.62, 1.02], scale: [1, 0.6, 0.4], noLine: true, shadow: false, mat: basic('#ee9a94') }));
    part(g, new THREE.ConeGeometry(0.22, 0.5, 10), '#8fae5a', { pos: [0, 1.75, 0], rot: [0, 0, 0.3], line: 0.03 });
    return { g, h: put(g, x, z, 0.5, s), ph: x }; };
  T.mobs = [slime(6.5, 8.5, '#8fb7d8', 0.8), slime(9.2, 6.2, '#f2b0a0', 0.65)];
  { const g = new THREE.Group(); // 香菇怪
    part(g, new THREE.CylinderGeometry(0.42, 0.55, 0.9, 16), '#fbf3e2', { pos: [0, 0.45, 0], line: 0.04 });
    part(g, new THREE.SphereGeometry(1.0, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), PAL.cap, { pos: [0, 0.75, 0], line: 0.05 });
    [[0.4, 1.5, 0.4], [-0.45, 1.45, 0.2], [0, 1.68, -0.3], [0.1, 1.25, 0.8], [-0.6, 1.1, 0.6]].forEach(a => part(g, sph(0.16, 10, 8), '#fffdf2', { pos: a, scale: [1, 0.6, 1], noLine: true, shadow: false }));
    [-0.17, 0.17].forEach(k => part(g, sph(0.07, 10, 8), DARK, { pos: [k, 0.52, 0.46], scale: [1, 1.3, 0.6], noLine: true, shadow: false, mat: basic(DARK) }));
    [-1, 1].forEach(k => part(g, sph(0.2, 12, 10), '#fbf3e2', { pos: [0.3 * k, 0.1, 0.1], scale: [1, 0.6, 1.3], line: 0.03 }));
    T.mobs.push({ g, h: put(g, 7.6, 11.2, 0.6, 1.0), ph: 2 }); }
  // 小屋、樹、石頭、花：放大到跟機器人比起來合理
  const big = (fn, s) => { const before = scene.children.length; fn(); for (let i = before; i < scene.children.length; i++) { const o = scene.children[i]; o.position.multiplyScalar(s); o.scale.multiplyScalar(s); } };
  big(() => { cabin(-5.2, -2.6); pine(-2.4, -4.2, 1.2); pine(-8.2, -3.4, 1.0); pine(3.6, -4.6, 1.3); pine(5.6, -3.2, 0.9); roundTree(-7.6, 0.6, 1.0); roundTree(5.6, -1.4, 1.1, PAL.leaf2); roundTree(1.2, -5.2, 1.0); rock(-6.2, 2.2, 1.2); rock(5.2, 1.6, 0.9); mushroom(-2.6, 1.4, 1); mushroom(-2.2, 1.7, 0.7); }, 2.3);
  big(() => { [[-3.2, 5.2], [-4.4, 6.3], [-1.6, 6.4], [2.2, 6.1], [3.6, 4.6], [-5.6, 4.2], [0.8, 7.2], [4.8, 6.6], [-2.4, 7.4]].forEach(([x, z]) => flower(x, z)); }, 1.6);
  // 小路
  const path = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 40), STYLE === 'clay' ? new THREE.MeshStandardMaterial({ color: PAL.path, roughness: 1 }) : new THREE.MeshToonMaterial({ color: PAL.path, gradientMap: RAMP, map: GRAIN })); path.rotation.set(-Math.PI / 2, 0, 0.5); path.position.set(-7.5, 0.02, 9); path.receiveShadow = true; scene.add(path);
  WK.props.forEach(p => { p.visible = false; });
  return T;
})() : null;

