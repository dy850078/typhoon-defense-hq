// 手繪 icon 第三批：公共花園（植物每個階段、種子、水果、寶石、澆水壺…），座標都在 48x48 裡
// 植物 'plant-<種類>-<階段 0~4>'、枯掉的 'plant-dead'；也直接拿來當花圃上的貼圖
(function (root) {
  const C = root.HQ_CRAYON;
  if (!C || !root.HQ_ICONS) return;

  const LEAF = '#7fc46a', LEAF2 = '#5fa35a', STEM = '#4c8a4a', WOOD = '#a0703f';
  const shine = (x, r, cx, cy, w, h) => { C.blob(x, cx, cy, w, h, r, 0.1, 12); x.fillStyle = 'rgba(255,255,255,.75)'; x.fill(); };
  function poly(x, pts) { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); }
  // 一片葉子：從 (x0, y0) 往角度 a 長 len
  function leaf(x, r, x0, y0, a, len, col) {
    const w = len * 0.38, ex = x0 + Math.cos(a) * len, ey = y0 + Math.sin(a) * len;
    const nx = -Math.sin(a) * w, ny = Math.cos(a) * w, mx = (x0 + ex) / 2, my = (y0 + ey) / 2;
    x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(mx + nx, my + ny, ex, ey); x.quadraticCurveTo(mx - nx, my - ny, x0, y0); x.closePath();
    C.fill(x, col || LEAF, r, null); C.stroke(x, r, 1.6);
  }
  // 土堆
  function mound(x, r) {
    C.blob(x, 24, 43, 15, 4.5, r, 0.08, 16); C.fill(x, '#8a6440', r, null); C.stroke(x, r, 1.8);
  }

  // ---- 水果（cx, cy 是中心，s 是大小，1 = 背包 icon 那麼大） ----
  const FRUIT = {
    tomato(x, r, cx, cy, s) {
      C.blob(x, cx, cy, 6 * s, 5.4 * s, r, 0.06, 14); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 1.4 + 0.6 * s);
      [-1, 0, 1].forEach(k => C.line(x, cx, cy - 4.6 * s, cx + k * 3 * s, cy - 6.4 * s, r, 1.2 + 0.4 * s, STEM, 0.2));
      shine(x, r, cx - 2.2 * s, cy - 1.6 * s, 1.4 * s, 1 * s);
    },
    guava(x, r, cx, cy, s) {
      C.blob(x, cx, cy, 7.5 * s, 7 * s, r, 0.07, 16); C.fill(x, '#b8de7a', r, [cx - 8 * s, cy - 8 * s, 16 * s, 16 * s]); C.stroke(x, r, 1.4 + 0.6 * s);
      C.blob(x, cx + 2.5 * s, cy + 2 * s, 3 * s, 2.4 * s, r, 0.1, 10); x.fillStyle = 'rgba(255,240,170,.8)'; x.fill();
      C.line(x, cx, cy - 6.6 * s, cx + 1 * s, cy - 8.6 * s, r, 1.2 + 0.4 * s, '#6a4a2a', 0.2);
    },
    apple(x, r, cx, cy, s) {
      C.smooth(x, [[0, -0.55], [0.55, -0.9], [1, -0.4], [0.9, 0.55], [0.4, 1], [0, 0.85], [-0.4, 1], [-0.9, 0.55], [-1, -0.4], [-0.55, -0.9]]
        .map(([a, b]) => [cx + a * 7.5 * s, cy + b * 7 * s]));
      C.fill(x, '#e8384f', r, [cx - 8 * s, cy - 8 * s, 16 * s, 16 * s]); C.stroke(x, r, 1.4 + 0.6 * s);
      C.line(x, cx, cy - 3.6 * s, cx + 1 * s, cy - 8 * s, r, 1.2 + 0.5 * s, '#6a4a2a', 0.2);
      leaf(x, r, cx + 1 * s, cy - 7 * s, -0.5, 6 * s, LEAF);
      shine(x, r, cx - 3.4 * s, cy - 2.2 * s, 1.6 * s, 1.2 * s);
    },
    pineapple(x, r, cx, cy, s) {
      [-0.9, -0.45, 0, 0.45, 0.9].forEach((a, i) => leaf(x, r, cx, cy - 5.5 * s, -Math.PI / 2 + a, (i === 2 ? 9 : 7) * s, i % 2 ? LEAF2 : LEAF));
      C.blob(x, cx, cy + 2 * s, 6.5 * s, 8.5 * s, r, 0.05, 16); C.fill(x, '#ffc93c', r, [cx - 7 * s, cy - 7 * s, 14 * s, 18 * s]);
      x.save(); C.blob(x, cx, cy + 2 * s, 6.5 * s, 8.5 * s, r, 0.05, 16); x.clip();
      for (let k = -3; k <= 3; k++) {
        C.line(x, cx + k * 4 * s - 9 * s, cy - 7 * s, cx + k * 4 * s + 9 * s, cy + 11 * s, r, 0.8 + 0.3 * s, '#c98a1c', 0.3);
        C.line(x, cx + k * 4 * s + 9 * s, cy - 7 * s, cx + k * 4 * s - 9 * s, cy + 11 * s, r, 0.8 + 0.3 * s, '#c98a1c', 0.3);
      }
      x.restore();
      C.blob(x, cx, cy + 2 * s, 6.5 * s, 8.5 * s, r, 0.05, 16); C.stroke(x, r, 1.4 + 0.6 * s);
    },
  };
  const FLOWER = { tomato: '#ffd23f', guava: '#fbfbf8', apple: '#ffd0dc', pineapple: '#c46ad6' };

  // ---- 植物：每種一個畫法，stage 1~4 ----
  function bush(x, r, stage) {
    // 小番茄：一叢矮矮的番茄苗，綁在竹竿上
    const h = [0, 12, 22, 26, 26][stage];
    if (stage >= 2) C.line(x, 31, 44, 31, 44 - h - 4, r, 2.2, WOOD, 0.3);
    C.line(x, 24, 43, 24, 43 - h, r, 2.2, STEM, 0.4);
    const ls = stage === 1 ? [[-2.4, 7], [-0.7, 7]] : [[-2.6, 9], [-0.5, 9], [-2.9, 8], [-0.2, 8], [-2.2, 7], [-0.9, 7]];
    ls.forEach(([a, len], i) => leaf(x, r, 24, 43 - h * (stage === 1 ? 1 : 0.35 + Math.floor(i / 2) * 0.3), a, len, i % 2 ? LEAF2 : LEAF));
    if (stage === 3) [[17, 22], [30, 18], [22, 15]].forEach(([fx, fy]) => flower(x, r, fx, fy, FLOWER.tomato, 1.6));
    if (stage === 4) [[17, 24], [29, 22], [23, 17], [31, 29]].forEach(([fx, fy]) => FRUIT.tomato(x, r, fx, fy, 0.7));
  }
  function tree(x, r, stage, kind) {
    // 芭樂、蘋果：小樹，越長越大
    if (stage === 1) {
      C.line(x, 24, 43, 24, 33, r, 2.2, STEM, 0.3);
      leaf(x, r, 24, 34, -2.5, 8, LEAF); leaf(x, r, 24, 34, -0.6, 8, LEAF2);
      return;
    }
    C.rect(x, 21, 26, 6, 18, r, 0.6); C.fill(x, '#8a5a34', r, null); C.stroke(x, r, 1.8);
    const crown = kind === 'apple' ? '#7fc46a' : '#6fb45f';
    C.blob(x, 24, 18, 17, 14, r, 0.1, 18); C.fill(x, crown, r, [7, 4, 34, 28]); C.stroke(x, r, 2.2);
    C.dots(x, 10, 8, 28, 18, 6, 'rgba(255,255,255,.5)', r, 1.4);
    const spots = [[15, 16], [30, 13], [23, 24], [33, 22], [18, 9]];
    if (stage === 3) spots.forEach(([fx, fy]) => flower(x, r, fx, fy, FLOWER[kind], 2.6));
    if (stage === 4) spots.slice(0, 4).forEach(([fx, fy]) => FRUIT[kind](x, r, fx, fy, kind === 'guava' ? 0.62 : 0.55));
  }
  function rosette(x, r, stage) {
    // 鳳梨：一叢尖尖的葉子，中間長出鳳梨
    const n = stage === 1 ? 3 : 7, len = stage === 1 ? 9 : 15;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * (stage === 1 ? 0.6 : 0.42);
      leaf(x, r, 24, 42, a, len * (i % 2 ? 0.85 : 1), i % 2 ? LEAF2 : '#6fb46a');
    }
    if (stage === 3) { C.blob(x, 24, 26, 4, 5, r, 0.1, 12); C.fill(x, FLOWER.pineapple, r, null); C.stroke(x, r, 1.6); }
    if (stage === 4) FRUIT.pineapple(x, r, 24, 24, 1);
  }
  function flower(x, r, cx, cy, col, s) {
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      C.blob(x, cx + Math.cos(a) * s, cy + Math.sin(a) * s, s * 0.9, s * 0.9, r, 0.1, 8); C.fill(x, col, r, null);
    }
    C.blob(x, cx, cy, s * 2.1, s * 2.1, r, 0.1, 10); C.stroke(x, r, 1);
    C.blob(x, cx, cy, s * 0.6, s * 0.6, r, 0.1, 6); C.fill(x, '#ffb020', r, null);
  }
  function plant(kind, stage) {
    return (x, r) => {
      mound(x, r);
      if (stage === 0) {
        C.blob(x, 24, 39, 3, 2, r, 0.1, 8); C.fill(x, '#f2d8a0', r, null); C.stroke(x, r, 1.2);
        return;
      }
      if (kind === 'tomato') bush(x, r, stage);
      else if (kind === 'pineapple') rosette(x, r, stage);
      else tree(x, r, stage, kind);
    };
  }

  const DRAW = {
    // 枯掉的植物：一根垂頭喪氣的乾草
    'plant-dead'(x, r) {
      mound(x, r);
      x.beginPath(); x.moveTo(24, 43); x.quadraticCurveTo(25, 26, 32, 24); C.stroke(x, r, 2.4, '#9a7a4a');
      leaf(x, r, 24, 36, -2.6, 9, '#c9a66a'); leaf(x, r, 25, 31, 0.6, 8, '#b8925a'); leaf(x, r, 31, 25, 1.4, 7, '#c9a66a');
    },
    // 枯枝（拔掉枯草拿到的雜物）
    'item-twig'(x, r) {
      C.line(x, 8, 40, 40, 10, r, 3.2, '#8a6440', 0.6);
      C.line(x, 20, 29, 16, 16, r, 2.4, '#8a6440', 0.6);
      C.line(x, 30, 19, 40, 22, r, 2.2, '#8a6440', 0.6);
      leaf(x, r, 16, 16, -2, 6, '#c9a66a');
    },
    // 澆水壺
    'act-water'(x, r) {
      x.beginPath(); x.moveTo(30, 24); x.lineTo(44, 13); C.stroke(x, r, 4.2); C.stroke(x, r, 2.4, '#7fb2e5');
      C.rect(x, 9, 20, 24, 20, r, 1); C.fill(x, '#7fb2e5', r, [9, 20, 24, 20]); C.stroke(x, r, 2.4);
      x.beginPath(); x.moveTo(13, 20); x.quadraticCurveTo(21, 6, 29, 20); C.stroke(x, r, 2.4);
      [[44, 18], [41, 23], [46, 25]].forEach(([dx, dy]) => { C.blob(x, dx, dy, 1.6, 2.2, r, 0.1, 8); C.fill(x, '#4f7cc2', r, null); });
      C.line(x, 13, 26, 13, 34, r, 1.6, 'rgba(255,255,255,.85)');
    },
    // 種下：土裡冒出一株小芽
    'act-plant'(x, r) {
      C.blob(x, 24, 38, 18, 7, r, 0.08, 16); C.fill(x, '#8a6440', r, null); C.stroke(x, r, 2.2);
      C.line(x, 24, 36, 24, 20, r, 2.4, STEM, 0.3);
      leaf(x, r, 24, 22, -2.6, 13, LEAF); leaf(x, r, 24, 24, -0.5, 12, LEAF2);
    },
    // 收成：一籃水果
    'act-harvest'(x, r) {
      FRUIT.apple(x, r, 16, 20, 0.8); FRUIT.guava(x, r, 30, 19, 0.8); FRUIT.tomato(x, r, 23, 16, 0.8);
      x.beginPath(); x.moveTo(6, 24); x.lineTo(42, 24); x.lineTo(37, 43); x.lineTo(11, 43); x.closePath();
      C.fill(x, '#d9a05a', r, [6, 24, 36, 19]); C.stroke(x, r, 2.4);
      [30, 36].forEach(yy => C.line(x, 8, yy, 40, yy, r, 1.4, '#8a5a34', 0.4));
      [16, 24, 32].forEach(xx => C.line(x, xx, 25, xx - 1, 42, r, 1.2, '#8a5a34', 0.4));
    },
    // 種子認養箱：木箱上插著一包種子
    'act-seedbox'(x, r) {
      C.rect(x, 18, 4, 14, 18, r, 0.6); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 2);
      FRUIT.tomato(x, r, 25, 13, 0.6);
      C.rect(x, 6, 20, 36, 22, r, 0.8); C.fill(x, '#c98a4a', r, [6, 20, 36, 22]); C.stroke(x, r, 2.4);
      C.line(x, 6, 31, 42, 31, r, 1.6, '#7a5030', 0.4);
      C.rect(x, 4, 18, 40, 5, r, 0.6); C.fill(x, '#a0703f', r, null); C.stroke(x, r, 2);
    },
  };
  ['tomato', 'guava', 'apple', 'pineapple'].forEach((k) => {
    for (let s = 0; s <= 4; s++) DRAW[`plant-${k}-${s}`] = plant(k, s);
    // 背包裡的水果
    DRAW['item-' + k] = k === 'tomato'
      ? (x, r) => { FRUIT.tomato(x, r, 17, 28, 1.3); FRUIT.tomato(x, r, 31, 30, 1.3); FRUIT.tomato(x, r, 24, 18, 1.3); }
      : (x, r) => FRUIT[k](x, r, 24, 26, 2);
    // 種子包：牛皮紙袋，上面畫著會長出來的水果
    DRAW['item-seed' + k[0].toUpperCase() + k.slice(1)] = (x, r) => {
      poly(x, [[11, 6], [37, 6], [38, 43], [10, 43]]); C.fill(x, '#e8d2a6', r, [10, 6, 28, 37]); C.stroke(x, r, 2.4);
      C.line(x, 11, 12, 37, 12, r, 1.4, '#a0703f', 0.4);
      FRUIT[k](x, r, 24, k === 'pineapple' ? 28 : 27, k === 'tomato' ? 1.3 : 1.1);
      [[15, 38], [20, 40], [30, 39], [34, 37]].forEach(([dx, dy]) => { C.blob(x, dx, dy, 1.3, 0.9, r, 0.1, 6); C.fill(x, '#6a4a2a', r, null); });
    };
  });
  // 寶石：切面的寶石，顏色不一樣
  [['gemRuby', '#e8384f', '#ff9aa6'], ['gemSapphire', '#3f6fd6', '#9cc0ff'], ['gemEmerald', '#2fa86a', '#9ae6bc']].forEach(([k, col, hi]) => {
    DRAW['item-' + k] = (x, r) => {
      poly(x, [[14, 10], [34, 10], [43, 20], [24, 43], [5, 20]]); C.fill(x, col, r, [5, 10, 38, 33]); C.stroke(x, r, 2.4);
      poly(x, [[14, 10], [34, 10], [30, 20], [18, 20]]); C.fill(x, hi, r, null); C.stroke(x, r, 1.4);
      [[5, 20, 43, 20], [18, 20, 24, 43], [30, 20, 24, 43], [14, 10, 18, 20], [34, 10, 30, 20]].forEach(([a, b, c, d]) => C.line(x, a, b, c, d, r, 1.2, 'rgba(43,42,51,.7)', 0.2));
      C.blob(x, 20, 14, 2.4, 1.4, r, 0.1, 8); x.fillStyle = 'rgba(255,255,255,.9)'; x.fill();
    };
  });
  root.HQ_ICONS.add(DRAW);
})(this);
