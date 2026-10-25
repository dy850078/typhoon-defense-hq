// 手繪 icon 第二批：技能、裝備、家具（取代 shared/stats.js、gear.js、decor.js 裡的 emoji）
// key 規則：技能 'sk-<技能 id>'、裝備 'gear-<裝備 id>'、家具 'dec-<家具 id>'，座標都在 48x48 裡
(function (root) {
  const C = root.HQ_CRAYON;
  if (!C || !root.HQ_ICONS) return;

  // ---- 共用小零件 ----
  const dot = (x, cx, cy, s, col) => { x.beginPath(); x.ellipse(cx, cy, s, s, 0, 0, Math.PI * 2); x.fillStyle = col; x.fill(); };
  const shine = (x, r, cx, cy, w, h) => { C.blob(x, cx, cy, w, h, r, 0.1, 12); x.fillStyle = 'rgba(255,255,255,.8)'; x.fill(); };
  function poly(x, pts) { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); }
  function star(x, cx, cy, R, k = 0.45) {
    const p = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? R * k : R; p.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); }
    poly(x, p);
  }
  function heart(x, cx, cy, s) {
    C.smooth(x, [[0, 1.1], [-0.75, 0.35], [-0.85, -0.3], [-0.5, -0.65], [-0.1, -0.55], [0, -0.3], [0.1, -0.55], [0.5, -0.65], [0.85, -0.3], [0.75, 0.35]]
      .map(([a, b]) => [cx + a * s, cy + b * s]));
  }
  // 八分音符
  function note(x, r, cx, cy, s, col) {
    C.line(x, cx + s * 0.55, cy, cx + s * 0.55, cy - s * 1.8, r, s * 0.35);
    x.beginPath(); x.moveTo(cx + s * 0.55, cy - s * 1.8); x.quadraticCurveTo(cx + s * 1.4, cy - s * 1.3, cx + s * 1.2, cy - s * 0.7); C.stroke(x, r, s * 0.35);
    C.blob(x, cx, cy, s * 0.7, s * 0.55, r, 0.08, 12); C.fill(x, col, r, null); C.stroke(x, r, s * 0.3);
  }
  // 小火焰
  function flame(x, r, cx, by, w, h, col = '#ff8a3d', inner = '#ffd23f') {
    C.smooth(x, [[cx, by - h], [cx + w * 0.35, by - h * 0.55], [cx + w * 0.55, by - h * 0.3], [cx + w * 0.45, by], [cx - w * 0.45, by], [cx - w * 0.55, by - h * 0.3], [cx - w * 0.2, by - h * 0.6]]);
    C.fill(x, col, r, null); C.stroke(x, r, 1.8);
    C.smooth(x, [[cx, by - h * 0.55], [cx + w * 0.25, by - h * 0.2], [cx + w * 0.2, by - 1], [cx - w * 0.2, by - 1], [cx - w * 0.25, by - h * 0.2]]);
    C.fill(x, inner, r, null);
  }
  // 雪花
  function flake(x, r, cx, cy, R, col = '#4f9fd8', w = 2.2) {
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, ex = cx + Math.cos(a) * R, ey = cy + Math.sin(a) * R;
      C.line(x, cx, cy, ex, ey, r, w, col, 0.4);
      const mx = cx + Math.cos(a) * R * 0.6, my = cy + Math.sin(a) * R * 0.6;
      C.line(x, mx, my, mx + Math.cos(a + 0.8) * R * 0.3, my + Math.sin(a + 0.8) * R * 0.3, r, w * 0.75, col, 0.3);
      C.line(x, mx, my, mx + Math.cos(a - 0.8) * R * 0.3, my + Math.sin(a - 0.8) * R * 0.3, r, w * 0.75, col, 0.3);
    }
  }
  // 飛碟
  function ufo(x, r, cx, cy, s, body = '#8a93a6') {
    C.blob(x, cx, cy - s * 0.35, s * 0.5, s * 0.45, r, 0.05); C.fill(x, '#bfe9ff', r, null); C.stroke(x, r, 2);
    C.blob(x, cx, cy, s, s * 0.34, r, 0.04); C.fill(x, body, r, [cx - s, cy - s * 0.34, s * 2, s * 0.7]); C.stroke(x, r, 2.2);
    [-0.6, -0.2, 0.2, 0.6].forEach((k, i) => dot(x, cx + s * k, cy + 0.5, s * 0.1, ['#ffd23f', '#ff8fab', '#7fd1a8', '#ffd23f'][i]));
  }
  // 箭：從 (x1,y1) 指向 (x2,y2)
  function arrow(x, r, x1, y1, x2, y2, head = '#c6cbd6', fl = '#7fd1a8') {
    const a = Math.atan2(y2 - y1, x2 - x1), c = Math.cos(a), s = Math.sin(a);
    C.line(x, x1, y1, x2 - c * 5, y2 - s * 5, r, 2.2, '#7a4f2e');
    poly(x, [[x2, y2], [x2 - c * 8 - s * 4, y2 - s * 8 + c * 4], [x2 - c * 8 + s * 4, y2 - s * 8 - c * 4]]); C.fill(x, head, r, null); C.stroke(x, r, 1.6);
    [1, 5].forEach(d => {
      const bx = x1 + c * d, by = y1 + s * d;
      poly(x, [[bx, by], [bx - c * 5 - s * 4, by - s * 5 + c * 4], [bx + c * 1 - s * 4, by + s * 1 + c * 4]]); C.fill(x, fl, r, null); C.stroke(x, r, 1.2);
    });
  }
  // 速度線
  const zoom = (x, r, pts, col = '#8a93a6') => pts.forEach(([a, b, c, d]) => C.line(x, a, b, c, d, r, 1.8, col, 0.4));

  // 上衣的外形
  const shirtPath = (x) => poly(x, [[16, 5], [32, 5], [44, 14], [39, 22], [35, 19], [35, 44], [13, 44], [13, 19], [9, 22], [4, 14]]);
  function shirt(x, r, col) { shirtPath(x); C.fill(x, col, r, [4, 5, 40, 39]); C.stroke(x, r, 2.4); }
  // 布偶裝：動物的大頭
  function animal(x, r, col, muzzle, ears) {
    ears.forEach(([a, b, s]) => { C.blob(x, a, b, s, s, r, 0.08); C.fill(x, col, r, null); C.stroke(x, r, 2.2); C.blob(x, a, b, s * 0.5, s * 0.5, r, 0.1, 12); C.fill(x, muzzle, r, null); });
    C.blob(x, 24, 26, 17, 16, r, 0.04); C.fill(x, col, r, [7, 10, 34, 32]); C.stroke(x, r, 2.4);
    C.blob(x, 24, 32, 8, 6, r, 0.06); C.fill(x, muzzle, r, null); C.stroke(x, r, 1.6);
    dot(x, 17, 23, 2, '#2b2a33'); dot(x, 31, 23, 2, '#2b2a33');
    dot(x, 12, 30, 2.6, 'rgba(244,120,120,.45)'); dot(x, 36, 30, 2.6, 'rgba(244,120,120,.45)');
  }
  // 貓耳髮箍
  function catBand(x, r, col) {
    [[12, -0.25], [36, 0.25]].forEach(([cx, rot]) => {
      x.save(); x.translate(cx, 24); x.rotate(rot);
      poly(x, [[-10, 8], [-2, -16], [10, 8]]); C.fill(x, col, r, [-10, -16, 20, 24]); C.stroke(x, r, 2.4);
      poly(x, [[-5, 6], [-1.5, -8], [5, 6]]); C.fill(x, '#ff8fab', r, null);
      x.restore();
    });
    x.beginPath(); x.ellipse(24, 46, 22, 14, 0, Math.PI * 1.05, Math.PI * 1.95); C.stroke(x, r, 4.4); C.stroke(x, r, 2.8, col);
  }
  // 披風
  const capePath = (x) => C.smooth(x, [[15, 6], [33, 6], [37, 20], [44, 44], [34, 41], [24, 45], [14, 41], [4, 44], [11, 20]]);
  function cape(x, r, col) {
    capePath(x); C.fill(x, col, r, [4, 6, 40, 39]); C.stroke(x, r, 2.4);
    C.line(x, 19, 14, 15, 38, r, 1.2, 'rgba(43,42,51,.35)'); C.line(x, 29, 14, 33, 38, r, 1.2, 'rgba(43,42,51,.35)');
    C.rect(x, 15, 4, 18, 5, r, 0.4); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.6);
  }
  // 一對翅膀：bat 蝙蝠、feather 羽毛、fire 火焰
  function wings(x, r, col, kind) {
    [-1, 1].forEach(sd => {
      x.save(); x.translate(24, 24); x.scale(sd, 1);
      if (kind === 'bat') {
        C.smooth(x, [[2, -4], [10, -16], [21, -18], [20, -8], [22, 2], [16, 0], [14, 10], [8, 6], [3, 8]]);
        C.fill(x, col, r, [2, -18, 20, 28]); C.stroke(x, r, 2.2);
        C.line(x, 4, -2, 19, -14, r, 1.2, '#2b2a33');
      } else {
        // 羽毛翅膀：上緣圓滑、下緣一片片羽毛
        C.smooth(x, [[2, -6], [8, -15], [17, -19], [22, -15], [21, -6], [17, -4], [19, 2], [14, 3], [15, 9], [9, 9], [8, 14], [3, 8]]);
        C.fill(x, kind === 'fire' ? '#ff8a3d' : col, r, [2, -19, 21, 33]); C.stroke(x, r, 2.2);
        const ln = kind === 'fire' ? '#ef4b5c' : '#9aa3b5';
        C.line(x, 6, -6, 17, -5, r, 1.3, ln); C.line(x, 6, -1, 15, 3, r, 1.3, ln); C.line(x, 5, 4, 10, 9, r, 1.3, ln);
        if (kind === 'fire') C.dots(x, 6, -16, 18, 30, 4, '#ffd23f', r, 1.4);
      }
      x.restore();
    });
  }

  const DRAW = {
    // ================= 技能：普攻 =================
    // 水晶球彈：發光的小球帶尾巴
    'sk-orb'(x, r) {
      x.save(); x.globalAlpha = 0.35; C.blob(x, 18, 28, 13, 7, r, 0.1); x.fillStyle = '#c9b6ff'; x.fill(); x.restore();
      zoom(x, r, [[4, 22, 14, 22], [3, 30, 13, 31], [6, 37, 15, 35]], '#a98be8');
      C.blob(x, 29, 25, 13, 13, r, 0.04); C.fill(x, '#c9b6ff', r, [16, 12, 26, 26]); C.stroke(x, r, 2.4);
      shine(x, r, 24, 19, 4, 3);
      C.dots(x, 22, 22, 14, 10, 4, '#fff', r, 1);
      star(x, 40, 9, 4); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.2);
    },
    // 打一針：針筒
    'sk-syringe'(x, r) {
      x.save(); x.translate(24, 24); x.rotate(-0.75); x.translate(-24, -24);
      C.line(x, 24, 2, 24, 10, r, 1.6, '#6b7488');
      C.rect(x, 17, 10, 14, 24, r, 0.5); C.fill(x, '#eaf6ff', r, [17, 10, 14, 24]); C.stroke(x, r, 2.2);
      C.rect(x, 18, 20, 12, 13, r, 0.4); C.fill(x, '#7fd1a8', r, null);
      [14, 18, 22, 26].forEach(yy => C.line(x, 17, yy, 21, yy, r, 1.1));
      C.rect(x, 13, 34, 22, 4, r, 0.4); C.fill(x, '#c6cbd6', r, null); C.stroke(x, r, 1.8);
      C.line(x, 24, 38, 24, 43, r, 2.4);
      C.rect(x, 17, 43, 14, 3, r, 0.3); C.fill(x, '#c6cbd6', r, null); C.stroke(x, r, 1.6);
      x.restore();
      dot(x, 6, 40, 2, '#4fb0e8'); dot(x, 10, 45, 1.4, '#4fb0e8');
    },
    // 拉弓射箭：飛出去的箭
    'sk-shot'(x, r) {
      zoom(x, r, [[3, 33, 12, 30], [6, 41, 15, 38], [10, 46, 18, 44]]);
      arrow(x, r, 8, 40, 42, 8);
      C.blob(x, 42, 8, 5, 5, r, 0.2, 10); C.stroke(x, r, 1.4, '#ffd23f');
    },
    // 霸王拳：秀二頭肌
    'sk-punch'(x, r) {
      C.smooth(x, [[6, 42], [5, 30], [12, 24], [20, 26], [22, 16], [18, 10], [22, 5], [30, 7], [33, 14], [30, 22], [36, 18], [43, 24], [42, 36], [32, 43]]);
      C.fill(x, '#ffcfa3', r, [5, 5, 38, 38]); C.stroke(x, r, 2.4);
      x.beginPath(); x.moveTo(26, 22); x.quadraticCurveTo(32, 30, 40, 26); C.stroke(x, r, 1.6);
      C.line(x, 22, 9, 28, 9, r, 1.2); C.line(x, 22, 13, 28, 13, r, 1.2);
      C.rect(x, 3, 36, 14, 8, r, 0.5); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 1.8);
      shine(x, r, 36, 23, 2.4, 1.6);
    },
    // 冰刀踢：冰刀＋冰痕
    'sk-kick'(x, r) {
      x.save(); x.translate(24, 24); x.rotate(-0.35); x.translate(-24, -24);
      x.beginPath(); x.moveTo(17, 6); x.lineTo(28, 6); x.lineTo(29, 19); x.quadraticCurveTo(40, 21, 41, 28); x.lineTo(41, 31); x.lineTo(15, 31); x.lineTo(15, 16); x.closePath();
      C.fill(x, '#fbfbf8', r, [15, 6, 26, 25]); C.stroke(x, r, 2.4);
      [11, 15].forEach(yy => C.line(x, 19, yy, 27, yy + 1, r, 1.3, '#4f9fd8'));
      C.line(x, 18, 31, 18, 35, r, 1.8); C.line(x, 37, 31, 37, 35, r, 1.8);
      x.beginPath(); x.moveTo(11, 35); x.lineTo(42, 35); x.quadraticCurveTo(45, 35, 44, 32); C.stroke(x, r, 3, '#8a93a6'); C.stroke(x, r, 1.4);
      x.restore();
      x.beginPath(); x.moveTo(4, 46); x.quadraticCurveTo(20, 38, 42, 44); C.stroke(x, r, 2.6, '#a8dcf5');
      C.dots(x, 6, 38, 10, 6, 3, '#a8dcf5', r, 1.2);
    },
    // 外星光線：玩具光線槍
    'sk-ray'(x, r) {
      x.save(); x.globalAlpha = 0.5; poly(x, [[30, 18], [46, 10], [46, 26]]); x.fillStyle = '#7be08f'; x.fill(); x.restore();
      C.line(x, 30, 18, 46, 18, r, 2.4, '#3fbf5f');
      C.rect(x, 18, 22, 7, 16, r, 0.5); C.fill(x, '#ff8fab', r, null); C.stroke(x, r, 2.2);
      C.blob(x, 18, 18, 13, 7, r, 0.05); C.fill(x, '#7fd1a8', r, [5, 11, 26, 14]); C.stroke(x, r, 2.4);
      C.rect(x, 28, 15, 5, 6, r, 0.3); C.fill(x, '#c6cbd6', r, null); C.stroke(x, r, 1.6);
      [10, 16, 22].forEach(cx => dot(x, cx, 18, 1.6, '#ffd23f'));
      C.blob(x, 10, 10, 3, 3, r, 0.1); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.4); C.line(x, 11, 13, 13, 12, r, 1.4);
    },
    // 高音音符
    'sk-note'(x, r) {
      note(x, r, 18, 36, 9, '#ff8fab');
      [[36, 10, 40, 6], [38, 17, 44, 16], [35, 24, 40, 27]].forEach(([a, b, c, d]) => C.line(x, a, b, c, d, r, 2, '#ffd23f'));
      star(x, 38, 37, 4); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.2);
    },
    // 顏料彈：畫筆甩出一坨顏料
    'sk-paint'(x, r) {
      C.smooth(x, [[30, 16], [38, 12], [40, 18], [46, 20], [41, 26], [44, 33], [36, 32], [32, 38], [28, 31], [22, 30], [26, 24], [22, 18]]);
      C.fill(x, '#4f7cc2', r, [22, 12, 24, 26]); C.stroke(x, r, 2);
      dot(x, 19, 37, 2.4, '#4f7cc2'); dot(x, 42, 40, 1.8, '#4f7cc2'); dot(x, 24, 8, 1.6, '#4f7cc2');
      x.save(); x.translate(12, 34); x.rotate(-0.8);
      C.rect(x, -3, 0, 6, 16, r, 0.4); C.fill(x, '#c98a4b', r, null); C.stroke(x, r, 1.8);
      C.rect(x, -3.5, -4, 7, 5, r, 0.3); C.fill(x, '#c6cbd6', r, null); C.stroke(x, r, 1.4);
      C.smooth(x, [[0, -16], [3.5, -9], [3.5, -4], [-3.5, -4], [-3.5, -9]]); C.fill(x, '#4f7cc2', r, null); C.stroke(x, r, 1.8);
      x.restore();
    },
    // 金針花鏢：旋轉的金針花
    'sk-lilyDart'(x, r) {
      x.beginPath(); x.arc(24, 24, 20, 0.3, 1.6); C.stroke(x, r, 1.8, '#8a93a6');
      x.beginPath(); x.arc(24, 24, 20, 3.4, 4.7); C.stroke(x, r, 1.8, '#8a93a6');
      for (let i = 0; i < 6; i++) {
        x.save(); x.translate(24, 24); x.rotate(i * Math.PI / 3 + 0.3);
        C.smooth(x, [[0, -2], [4, -9], [0, -16], [-4, -9]]); C.fill(x, '#ff9a2e', r, null); C.stroke(x, r, 1.6);
        C.line(x, 0, -4, 0, -12, r, 1, '#d8642a', 0.2);
        x.restore();
      }
      C.blob(x, 24, 24, 4, 4, r, 0.1); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.4);
    },
    // 七星彩石彈：一顆彩色石頭魔法彈
    'sk-pebbleOrb'(x, r) {
      zoom(x, r, [[3, 20, 13, 22], [3, 30, 12, 30], [5, 39, 14, 36]], '#7fb2e5');
      C.blob(x, 28, 26, 14, 12, r, 0.08); C.fill(x, '#b9d6e8', r, [14, 14, 28, 24]); C.stroke(x, r, 2.4);
      [[22, 22, '#ef4b5c'], [30, 19, '#ffd23f'], [35, 27, '#7fd1a8'], [26, 31, '#8a5cd6'], [20, 29, '#4f7cc2']].forEach(([cx, cy, col]) => {
        C.blob(x, cx, cy, 3, 2.4, r, 0.15, 10); C.fill(x, col, r, null); C.stroke(x, r, 1.1);
      });
      [[40, 10], [44, 16], [38, 42]].forEach(([a, b]) => { star(x, a, b, 3); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1); });
    },
    // 大理石重錘：錘子砸地
    'sk-marbleSmash'(x, r) {
      x.beginPath(); x.moveTo(3, 42); x.lineTo(45, 42); C.stroke(x, r, 2.2);
      [[10, 41, 6, 34], [38, 41, 43, 34], [24, 42, 24, 46]].forEach(([a, b, c, d]) => C.line(x, a, b, c, d, r, 1.6));
      x.save(); x.translate(26, 28); x.rotate(0.5);
      C.rect(x, -2.5, -26, 5, 22, r, 0.4); C.fill(x, '#a0703f', r, null); C.stroke(x, r, 2);
      C.rect(x, -12, -6, 24, 13, r, 0.8); C.fill(x, '#eceae4', r, [-12, -6, 24, 13]); C.stroke(x, r, 2.4);
      C.line(x, -8, -4, -2, 5, r, 1, '#8a93a6'); C.line(x, 3, -5, 8, 3, r, 1, '#8a93a6');
      x.restore();
      C.dots(x, 8, 32, 32, 6, 5, '#c6cbd6', r, 1.4);
    },

    // ================= 技能：大招 =================
    // 任立瑜附體：颱風路徑預報圖
    'sk-prophecy'(x, r) {
      C.rect(x, 4, 6, 40, 34, r, 0.8); C.fill(x, '#bfe3ff', r, [4, 6, 40, 34]); C.stroke(x, r, 2.4);
      C.smooth(x, [[30, 20], [36, 18], [40, 24], [38, 34], [32, 38], [28, 30]]); C.fill(x, '#9ed67f', r, null); C.stroke(x, r, 1.6);
      x.save(); x.globalAlpha = 0.35; poly(x, [[12, 30], [32, 12], [38, 22]]); x.fillStyle = '#ffffff'; x.fill(); x.restore();
      x.save(); x.setLineDash([2.5, 3]); x.beginPath(); x.moveTo(12, 30); x.quadraticCurveTo(22, 18, 35, 16); x.strokeStyle = '#ef4b5c'; x.lineWidth = 2; x.stroke(); x.restore();
      x.beginPath(); for (let i = 0; i < 40; i++) { const a = i * 0.32, d = 0.5 + i * 0.16; x.lineTo(12 + Math.cos(a) * d, 30 + Math.sin(a) * d); } C.stroke(x, r, 2, '#4f5d78');
      C.rect(x, 18, 40, 12, 5, r, 0.4); C.fill(x, '#8a93a6', r, null); C.stroke(x, r, 1.6);
    },
    // 生生好鮮乳：牛奶盒
    'sk-milk'(x, r) {
      x.beginPath(); x.moveTo(12, 16); x.lineTo(24, 6); x.lineTo(36, 16); x.closePath(); C.fill(x, '#eef4f8', r, null); C.stroke(x, r, 2.2);
      C.rect(x, 21, 2, 6, 5, r, 0.3); C.fill(x, '#eef4f8', r, null); C.stroke(x, r, 1.6);
      C.rect(x, 12, 16, 24, 28, r, 0.6); C.fill(x, '#fbfbf8', r, [12, 16, 24, 28]); C.stroke(x, r, 2.4);
      C.rect(x, 12, 26, 24, 9, r, 0.4); C.fill(x, '#4f9fd8', r, null); C.stroke(x, r, 1.4);
      C.blob(x, 24, 30.5, 4, 2.6, r, 0.1); C.fill(x, '#fbfbf8', r, null);
      C.dots(x, 15, 38, 18, 4, 3, '#ff8fab', r, 1.2);
    },
    // 美麗聖潔弓箭：愛心箭
    'sk-arrow'(x, r) {
      arrow(x, r, 6, 42, 41, 7, '#ff8fab', '#ff8fab');
      heart(x, 25, 24, 10); C.fill(x, '#ef4b5c', r, [15, 16, 20, 20]); C.stroke(x, r, 2.2);
      shine(x, r, 21, 21, 2.2, 1.6);
    },
    // 槓鈴老師：舉起來的啞鈴＋汗
    'sk-barbell'(x, r) {
      x.save(); x.translate(24, 22); x.rotate(-0.35);
      C.rect(x, -14, -2, 28, 4, r, 0.4); C.fill(x, '#c6cbd6', r, null); C.stroke(x, r, 1.8);
      [-1, 1].forEach(sd => {
        C.rect(x, sd * 15 - 4, -10, 8, 20, r, 0.5); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 2.2);
        C.rect(x, sd * 15 + (sd > 0 ? 4 : -7), -6, 3, 12, r, 0.3); C.fill(x, '#a8323d', r, null); C.stroke(x, r, 1.4);
      });
      x.restore();
      C.blob(x, 24, 40, 5, 4, r, 0.1); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.6);
      C.line(x, 18, 36, 14, 33, r, 1.6, '#ffb020'); C.line(x, 30, 36, 34, 33, r, 1.6, '#ffb020');
      [[8, 34], [40, 40]].forEach(([a, b]) => { C.smooth(x, [[a, b - 4], [a + 2, b], [a, b + 2], [a - 2, b]]); C.fill(x, '#7fb2e5', r, null); C.stroke(x, r, 1); });
    },
    // 冰嬉：雪花＋溜冰繞圈
    'sk-skate'(x, r) {
      x.beginPath(); x.ellipse(24, 26, 20, 15, -0.2, 0.4, Math.PI * 1.8); C.stroke(x, r, 2.4, '#a8dcf5');
      flake(x, r, 24, 25, 13, '#4f9fd8', 2.6);
      dot(x, 24, 25, 2.6, '#bfe9ff');
      C.dots(x, 4, 4, 40, 40, 6, '#a8dcf5', r, 1.2);
    },
    // 召喚奇異生物：外星小綠人
    'sk-summon'(x, r) {
      C.line(x, 18, 12, 13, 4, r, 1.8); C.line(x, 30, 12, 35, 4, r, 1.8);
      dot(x, 13, 4, 2.4, '#ffd23f'); dot(x, 35, 4, 2.4, '#ffd23f');
      C.smooth(x, [[24, 8], [36, 12], [40, 22], [33, 38], [24, 42], [15, 38], [8, 22], [12, 12]]);
      C.fill(x, '#7be08f', r, [8, 8, 32, 34]); C.stroke(x, r, 2.4);
      [[-1, 17], [1, 31]].forEach(([sd, cx]) => { x.save(); x.translate(cx, 25); x.rotate(sd * 0.45); C.blob(x, 0, 0, 5, 3.4, r, 0.06, 14); C.fill(x, '#2b2a33', r, null); x.restore(); });
      dot(x, 16, 24, 1.1, '#fff'); dot(x, 30, 24, 1.1, '#fff');
      x.beginPath(); x.moveTo(21, 34); x.quadraticCurveTo(24, 36, 27, 34); C.stroke(x, r, 1.4);
    },
    // 放晴預報：太陽從雲後出來
    'sk-forecast'(x, r) {
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; C.line(x, 28 + Math.cos(a) * 12, 18 + Math.sin(a) * 12, 28 + Math.cos(a) * 18, 18 + Math.sin(a) * 18, r, 2.2, '#ffb020'); }
      C.blob(x, 28, 18, 9, 9, r, 0.05); C.fill(x, '#ffd23f', r, [19, 9, 18, 18]); C.stroke(x, r, 2.2);
      [[12, 34, 8], [21, 30, 9], [30, 35, 8], [20, 38, 9]].forEach(([cx, cy, rr]) => { C.blob(x, cx, cy, rr, rr * 0.8, r, 0.08, 14); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 2); });
      C.blob(x, 21, 35, 11, 5, r, 0.06); C.fill(x, '#fbfbf8', r, null);
    },
    // 電擊器：兩個電擊板＋電花
    'sk-defib'(x, r) {
      [[12, -0.3], [36, 0.3]].forEach(([cx, rot]) => {
        x.save(); x.translate(cx, 28); x.rotate(rot);
        C.rect(x, -4, -6, 8, 14, r, 0.4); C.fill(x, '#4f5d78', r, null); C.stroke(x, r, 2);
        C.rect(x, -9, 8, 18, 7, r, 0.5); C.fill(x, '#ffb020', r, null); C.stroke(x, r, 2.2);
        x.restore();
      });
      C.smooth(x, [[21, 4], [25, 4], [18, 16], [24, 16], [24, 16], [19, 28], [21, 28], [31, 13], [26, 13], [26, 13], [30, 4]]);
      C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.8);
      C.line(x, 7, 12, 4, 8, r, 1.6, '#ffb020'); C.line(x, 41, 12, 44, 8, r, 1.6, '#ffb020');
    },
    // 箭雨：雲裡掉下一堆箭
    'sk-arrowRain'(x, r) {
      [[12, 28, 14, 44], [24, 26, 25, 45], [36, 28, 37, 43]].forEach(([a, b, c, d]) => arrow(x, r, a, b, c, d));
      [[12, 13, 9], [22, 9, 10], [33, 12, 9], [24, 16, 13]].forEach(([cx, cy, rr]) => { C.blob(x, cx, cy, rr, rr * 0.75, r, 0.08, 14); C.fill(x, '#9aa3b5', r, null); C.stroke(x, r, 2); });
      C.blob(x, 24, 15, 15, 5, r, 0.06); C.fill(x, '#9aa3b5', r, null);
    },
    // 霸王怒吼：獅子頭＋吼聲
    'sk-roar'(x, r) {
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2;
        C.blob(x, 22 + Math.cos(a) * 12, 25 + Math.sin(a) * 12, 6, 6, r, 0.1, 12); C.fill(x, '#d9822b', r, null); C.stroke(x, r, 1.8); }
      C.blob(x, 22, 25, 12, 11, r, 0.05); C.fill(x, '#ffc75a', r, [10, 14, 24, 22]); C.stroke(x, r, 2.2);
      [[17, 20], [27, 20]].forEach(([a, b]) => { C.line(x, a - 2.5, b - 1, a + 2.5, b + 0.5 - (a > 22 ? 1.5 : 0), r, 1.8); });
      C.blob(x, 22, 31, 5, 4, r, 0.08); C.fill(x, '#a8323d', r, null); C.stroke(x, r, 1.6);
      C.blob(x, 22, 25.5, 2.6, 1.8, r, 0.1); C.fill(x, '#7a4f2e', r, null);
      [[39, 14, 45, 10], [41, 24, 47, 24], [39, 34, 45, 38]].forEach(([a, b, c, d]) => C.line(x, a, b, c, d, r, 2.2, '#ef4b5c'));
    },
    // 冰錐：三根往下的冰柱
    'sk-icicle'(x, r) {
      C.rect(x, 4, 5, 40, 7, r, 0.6); C.fill(x, '#eef6ff', r, null); C.stroke(x, r, 2.2);
      [[12, 6, 30], [24, 8, 44], [36, 6, 34]].forEach(([cx, w, tip]) => {
        x.beginPath(); x.moveTo(cx - w, 11); x.lineTo(cx + w, 11); x.quadraticCurveTo(cx + 2, tip - 8, cx, tip); x.quadraticCurveTo(cx - 2, tip - 8, cx - w, 11); x.closePath();
        C.fill(x, '#a8dcf5', r, [cx - w, 11, w * 2, tip - 11]); C.stroke(x, r, 2.2);
        C.line(x, cx - w / 2.5, 14, cx - 1, tip - 9, r, 1.4, 'rgba(255,255,255,.85)');
      });
    },
    // 音刃狂想曲：音符變成的刀
    'sk-noteBlade'(x, r) {
      x.save(); x.translate(24, 24); x.rotate(0.78);
      C.smooth(x, [[0, -22], [4, -14], [4, 6], [-4, 6], [-4, -14]]); C.fill(x, '#dfe6f0', r, [-4, -22, 8, 28]); C.stroke(x, r, 2.2);
      C.line(x, 0, -18, 0, 4, r, 1.1, '#8a93a6');
      C.rect(x, -10, 6, 20, 4, r, 0.4); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.8);
      C.rect(x, -2.5, 10, 5, 10, r, 0.3); C.fill(x, '#8a5cd6', r, null); C.stroke(x, r, 1.8);
      x.restore();
      note(x, r, 10, 16, 5, '#ff8fab');
      note(x, r, 34, 42, 4.4, '#ff8fab');
    },
    // 靈魂之歌：兩個連在一起的音符＋愛心
    'sk-anthem'(x, r) {
      C.line(x, 18, 36, 18, 11, r, 2.6); C.line(x, 36, 31, 36, 6, r, 2.6);
      poly(x, [[18, 11], [36, 6], [36, 12], [18, 17]]); C.fill(x, '#2b2a33', r, null);
      C.blob(x, 13, 36, 6, 4.6, r, 0.06); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 2.2);
      C.blob(x, 31, 31, 6, 4.6, r, 0.06); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 2.2);
      heart(x, 40, 40, 5); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 1.4);
      heart(x, 7, 14, 4); C.fill(x, '#ff8fab', r, null); C.stroke(x, r, 1.2);
    },
    // 火焰城牆：磚牆上冒火
    'sk-fireWall'(x, r) {
      flame(x, r, 12, 26, 12, 20); flame(x, r, 36, 26, 12, 18); flame(x, r, 24, 26, 14, 24, '#ef4b5c', '#ffb020');
      C.rect(x, 4, 25, 40, 19, r, 0.6); C.fill(x, '#c9673a', r, [4, 25, 40, 19]); C.stroke(x, r, 2.4);
      C.line(x, 5, 34, 43, 34, r, 1.4);
      [[14, 25, 14, 34], [28, 25, 28, 34], [9, 34, 9, 44], [22, 34, 22, 44], [36, 34, 36, 44]].forEach(([a, b, c, d]) => C.line(x, a, b, c, d, r, 1.4));
    },
    // 冰霜城牆：冰塊疊成的牆
    'sk-iceWall'(x, r) {
      [[4, 30, 13], [17, 30, 14], [31, 30, 13], [10, 17, 13], [23, 17, 14], [17, 5, 13]].forEach(([bx, by, w]) => {
        C.rect(x, bx, by, w, 13, r, 0.6); C.fill(x, '#bfe9ff', r, [bx, by, w, 13]); C.stroke(x, r, 2.2);
        C.line(x, bx + 3, by + 3, bx + 6, by + 3, r, 1.4, '#fff', 0.2);
      });
      C.rect(x, 3, 43, 42, 3, r, 0.3); C.fill(x, '#7fb2e5', r, null);
      flake(x, r, 39, 10, 5, '#4f9fd8', 1.4);
    },
    // 母艦光束：大飛碟照光
    'sk-mothership'(x, r) {
      x.save(); x.globalAlpha = 0.5; poly(x, [[17, 20], [31, 20], [42, 46], [6, 46]]); x.fillStyle = '#7be08f'; x.fill(); x.restore();
      [[14, 40], [32, 36], [24, 44]].forEach(([a, b]) => { star(x, a, b, 2.6); C.fill(x, '#fbfbf8', r, null); });
      ufo(x, r, 24, 15, 21, '#4f5d78');
    },
    // ================= 裝備：衣服 =================
    'gear-pajamas'(x, r) {
      shirt(x, r, '#bfe3ff');
      x.save(); shirtPath(x); x.clip(); [10, 18, 26, 34, 42].forEach(xx => C.line(x, xx, 4, xx - 2, 46, r, 2.6, '#7fb2e5', 0.4)); x.restore();
      shirtPath(x); C.stroke(x, r, 2.4);
      [20, 28, 36].forEach(yy => dot(x, 24, yy, 1.6, '#fbfbf8'));
      C.blob(x, 38, 8, 4.5, 4.5, r, 0.1); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.4); C.blob(x, 40, 6.5, 3.6, 3.6, r, 0.1); C.fill(x, '#fbf6e9', r, null);
    },
    'gear-overalls'(x, r) {
      C.line(x, 15, 4, 17, 20, r, 3.2, '#c9562a'); C.line(x, 33, 4, 31, 20, r, 3.2, '#c9562a');
      poly(x, [[12, 18], [36, 18], [38, 44], [26, 44], [24, 34], [22, 44], [10, 44]]);
      C.fill(x, '#ef8a5a', r, [10, 18, 28, 26]);
      x.save(); poly(x, [[12, 18], [36, 18], [38, 44], [26, 44], [24, 34], [22, 44], [10, 44]]); x.clip(); C.plaid(x, 10, 18, 28, 26, 7, '#c9562a', r, 1.6); x.restore();
      poly(x, [[12, 18], [36, 18], [38, 44], [26, 44], [24, 34], [22, 44], [10, 44]]); C.stroke(x, r, 2.4);
      C.rect(x, 18, 22, 12, 7, r, 0.4); C.fill(x, '#ffb38a', r, null); C.stroke(x, r, 1.6);
      dot(x, 17, 20, 2, '#ffd23f'); dot(x, 31, 20, 2, '#ffd23f');
    },
    'gear-sailor'(x, r) {
      shirt(x, r, '#fbfbf8');
      poly(x, [[14, 6], [34, 6], [38, 18], [24, 24], [10, 18]]); C.fill(x, '#2f5fa8', r, null); C.stroke(x, r, 2);
      C.line(x, 12, 16, 22, 21, r, 1.2, '#fbfbf8'); C.line(x, 36, 16, 26, 21, r, 1.2, '#fbfbf8');
      poly(x, [[18, 6], [30, 6], [24, 18]]); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 1.6);
      poly(x, [[24, 22], [19, 32], [24, 29], [29, 32]]); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 1.8);
      C.line(x, 6, 36, 12, 36, r, 1.6, '#2f5fa8'); C.line(x, 36, 36, 42, 36, r, 1.6, '#2f5fa8');
    },
    'gear-courier'(x, r) {
      C.smooth(x, [[24, 4], [32, 7], [35, 15], [44, 40], [36, 44], [12, 44], [4, 40], [13, 15], [16, 7]]);
      C.fill(x, '#3fae7a', r, [4, 4, 40, 40]); C.stroke(x, r, 2.4);
      C.blob(x, 24, 15, 7, 7, r, 0.06); C.fill(x, '#ffe0c2', r, null); C.stroke(x, r, 1.8);
      C.rect(x, 14, 26, 20, 14, r, 0.6); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 2);
      C.line(x, 16, 31, 32, 31, r, 1.2, '#c9962a');
      C.dots(x, 2, 4, 44, 14, 5, '#7fb2e5', r, 1.4);
    },
    'gear-bear'(x, r) {
      animal(x, r, '#b07a4f', '#f0d2a8', [[11, 12, 6], [37, 12, 6]]);
      C.blob(x, 24, 31, 4, 3, r, 0.1); C.fill(x, '#2b2a33', r, null);
    },
    'gear-croc'(x, r) {
      C.blob(x, 24, 22, 16, 14, r, 0.05); C.fill(x, '#5fb37a', r, [8, 8, 32, 28]); C.stroke(x, r, 2.4);
      C.blob(x, 24, 34, 13, 8, r, 0.06); C.fill(x, '#7fd1a8', r, null); C.stroke(x, r, 2.2);
      [17, 21, 25, 29].forEach(xx => { poly(x, [[xx, 38], [xx + 2, 42], [xx + 4, 38]]); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 1); });
      [[17, 12], [31, 12]].forEach(([a, b]) => { C.blob(x, a, b, 5, 5, r, 0.08); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 1.8); dot(x, a, b + 1, 2, '#2b2a33'); });
      dot(x, 20, 30, 1.2, '#2f6b45'); dot(x, 28, 30, 1.2, '#2f6b45');
    },
    'gear-astronaut'(x, r) {
      C.rect(x, 18, 38, 12, 6, r, 0.4); C.fill(x, '#c6cbd6', r, null); C.stroke(x, r, 1.8);
      C.blob(x, 24, 22, 18, 17, r, 0.03); C.fill(x, '#fbfbf8', r, [6, 5, 36, 34]); C.stroke(x, r, 2.4);
      C.blob(x, 24, 23, 12, 10, r, 0.04); C.fill(x, '#2f3b55', r, null); C.stroke(x, r, 2);
      shine(x, r, 19, 19, 4, 2.4); dot(x, 29, 26, 1.2, '#fff');
      C.rect(x, 4, 18, 4, 9, r, 0.3); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 1.4);
      star(x, 41, 7, 3.4); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1);
    },
    // 珍珠奶茶裝：手搖杯
    'gear-bubbletea'(x, r) {
      C.line(x, 28, 2, 25, 18, r, 3.4, '#ef4b5c');
      x.beginPath(); x.moveTo(11, 14); x.lineTo(37, 14); x.lineTo(33, 44); x.lineTo(15, 44); x.closePath();
      C.fill(x, '#e7c49a', r, [11, 14, 26, 30]); C.stroke(x, r, 2.4);
      C.blob(x, 24, 14, 14, 3.4, r, 0.06); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 2);
      for (let i = 0; i < 9; i++) { C.blob(x, 17 + (i % 3) * 7 + (i > 5 ? 1 : 0), 31 + Math.floor(i / 3) * 4.2, 2.4, 2.2, r, 0.1, 10); C.fill(x, '#4a3226', r, null); }
      C.line(x, 14, 23, 34, 23, r, 1.2, 'rgba(255,255,255,.7)');
    },
    'gear-tuxedo'(x, r) {
      shirt(x, r, '#2f3b55');
      poly(x, [[18, 6], [30, 6], [27, 40], [21, 40]]); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 1.6);
      poly(x, [[17, 6], [21, 24], [13, 14]]); C.fill(x, '#4f5d78', r, null); C.stroke(x, r, 1.6);
      poly(x, [[31, 6], [27, 24], [35, 14]]); C.fill(x, '#4f5d78', r, null); C.stroke(x, r, 1.6);
      poly(x, [[17, 8], [24, 11], [31, 8], [31, 15], [24, 12], [17, 15]]); C.fill(x, '#2b2a33', r, null); C.stroke(x, r, 1.4);
      [20, 27, 34].forEach(yy => dot(x, 24, yy, 1.3, '#2b2a33'));
      heart(x, 37, 23, 3); C.fill(x, '#ef4b5c', r, null);
    },
    'gear-gown'(x, r) {
      poly(x, [[18, 8], [30, 8], [29, 20], [38, 44], [10, 44], [19, 20]]); C.fill(x, '#fbfbf8', r, [10, 8, 28, 36]); C.stroke(x, r, 2.4);
      C.line(x, 19, 20, 29, 20, r, 1.8, '#ff8fab');
      [[14, 38], [24, 40], [33, 37], [19, 31], [29, 30]].forEach(([a, b]) => { C.blob(x, a, b, 1.8, 1.8, r, 0.2, 8); C.stroke(x, r, 1, '#ff8fab'); });
      [[16, 6], [24, 4], [32, 6]].forEach(([a, b]) => dot(x, a, b, 1.6, '#ffd23f'));
    },
    'gear-raincoat'(x, r) {
      C.smooth(x, [[24, 3], [33, 6], [36, 16], [42, 42], [6, 42], [12, 16], [15, 6]]);
      C.fill(x, '#ffd23f', r, [6, 3, 36, 39]); C.stroke(x, r, 2.4);
      C.blob(x, 24, 14, 7, 6, r, 0.06); C.fill(x, '#f2b630', r, null); C.stroke(x, r, 1.8);
      C.line(x, 24, 21, 24, 42, r, 1.6);
      [26, 32, 38].forEach(yy => dot(x, 27, yy, 1.4, '#2b2a33'));
      C.rect(x, 12, 30, 7, 6, r, 0.4); C.stroke(x, r, 1.4);
      C.dots(x, 2, 2, 44, 10, 4, '#7fb2e5', r, 1.4);
    },
    'gear-chef'(x, r) {
      [[15, 14, 8], [24, 10, 9], [33, 14, 8]].forEach(([a, b, s]) => { C.blob(x, a, b, s, s * 0.9, r, 0.08, 14); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 2.2); });
      C.blob(x, 24, 15, 13, 6, r, 0.06); C.fill(x, '#fbfbf8', r, null);
      C.rect(x, 12, 20, 24, 14, r, 0.6); C.fill(x, '#fbfbf8', r, [12, 20, 24, 14]); C.stroke(x, r, 2.4);
      C.line(x, 18, 22, 18, 32, r, 1, '#c6cbd6'); C.line(x, 30, 22, 30, 32, r, 1, '#c6cbd6');
      C.rect(x, 11, 33, 26, 5, r, 0.4); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 1.8);
      [17, 24, 31].forEach((sx, i) => { x.beginPath(); x.moveTo(sx, 47); x.quadraticCurveTo(sx - 3, 44, sx, 41); C.stroke(x, r, 1.4, '#9aa3ad'); });
    },
    'gear-tiger'(x, r) {
      animal(x, r, '#ff9a3c', '#fbf3e4', [[11, 12, 5.5], [37, 12, 5.5]]);
      [[24, 9, 24, 15], [20, 10, 21, 14], [28, 10, 27, 14], [9, 22, 14, 23], [9, 27, 14, 27], [39, 22, 34, 23], [39, 27, 34, 27]].forEach(([a, b, c, d]) => C.line(x, a, b, c, d, r, 2, '#2b2a33'));
      poly(x, [[21, 29], [27, 29], [24, 32]]); C.fill(x, '#ef4b5c', r, null);
    },
    'gear-typhoonSuit'(x, r) {
      [[12, 30, 10], [36, 30, 10], [24, 22, 14], [15, 18, 8], [33, 18, 8], [24, 36, 11]].forEach(([a, b, s]) => {
        C.blob(x, a, b, s, s * 0.9, r, 0.1, 14); C.fill(x, '#d6dae1', r, null); C.stroke(x, r, 2.2);
      });
      C.blob(x, 24, 28, 17, 11, r, 0.06); C.fill(x, '#e8edf3', r, null);
      x.beginPath(); for (let i = 0; i < 36; i++) { const a = i * 0.34, d = 0.6 + i * 0.2; x.lineTo(24 + Math.cos(a) * d, 29 + Math.sin(a) * d * 0.8); } C.stroke(x, r, 1.8, '#4f7cc2');
      dot(x, 17, 25, 1.8, '#2b2a33'); dot(x, 31, 25, 1.8, '#2b2a33');
      dot(x, 13, 31, 2.6, 'rgba(244,120,120,.5)'); dot(x, 35, 31, 2.6, 'rgba(244,120,120,.5)');
    },

    // ================= 裝備：頭飾 =================
    'gear-catGray'(x, r) { catBand(x, r, '#9aa3b5'); },
    'gear-catOrange'(x, r) { catBand(x, r, '#ff9a3c'); },
    'gear-apple'(x, r) {
      C.smooth(x, [[24, 14], [31, 10], [40, 14], [42, 28], [36, 40], [28, 42], [24, 40], [20, 42], [12, 40], [6, 28], [8, 14], [17, 10]]);
      C.fill(x, '#ef4b5c', r, [6, 10, 36, 32]); C.stroke(x, r, 2.4);
      C.line(x, 24, 14, 25, 4, r, 2.4, '#7a4f2e');
      x.save(); x.translate(31, 8); x.rotate(-0.4); C.blob(x, 0, 0, 6, 3, r, 0.08, 12); C.fill(x, '#5fb37a', r, null); C.stroke(x, r, 1.6); x.restore();
      shine(x, r, 14, 20, 3, 4.5);
    },
    // 小雨傘帽
    'gear-umbrella'(x, r) {
      x.beginPath(); x.moveTo(4, 26); x.quadraticCurveTo(6, 6, 24, 5); x.quadraticCurveTo(42, 6, 44, 26);
      [36, 28, 20, 12].forEach(px => x.quadraticCurveTo(px + 4, 21, px, 26)); x.closePath();
      C.fill(x, '#ffb020', r, [4, 5, 40, 21]); C.stroke(x, r, 2.4);
      x.beginPath(); x.moveTo(24, 5); x.quadraticCurveTo(18, 14, 20, 26); C.stroke(x, r, 1.3);
      x.beginPath(); x.moveTo(24, 5); x.quadraticCurveTo(30, 14, 28, 26); C.stroke(x, r, 1.3);
      x.beginPath(); x.moveTo(24, 26); x.lineTo(24, 39); x.quadraticCurveTo(24, 44, 29, 44); x.quadraticCurveTo(33, 44, 33, 40); C.stroke(x, r, 2.4, '#7a4f2e');
      C.dots(x, 6, 30, 10, 12, 3, '#7fb2e5', r, 1.6); C.dots(x, 36, 32, 10, 12, 2, '#7fb2e5', r, 1.6);
    },
    // 星星皇冠
    'gear-crown'(x, r) {
      poly(x, [[6, 38], [5, 14], [15, 24], [24, 9], [33, 24], [43, 14], [42, 38]]);
      C.fill(x, '#ffd23f', r, [5, 9, 38, 29]); C.stroke(x, r, 2.4);
      C.rect(x, 6, 34, 36, 7, r, 0.5); C.fill(x, '#f2b630', r, null); C.stroke(x, r, 2);
      star(x, 24, 25, 6); C.fill(x, '#ff8fab', r, null); C.stroke(x, r, 1.6);
      [[5, 13], [43, 13], [24, 8]].forEach(([a, b]) => { C.blob(x, a, b, 2.4, 2.4, r, 0.1); C.fill(x, '#7fd1a8', r, null); C.stroke(x, r, 1.4); });
    },
    'gear-hardhat'(x, r) {
      C.smooth(x, [[24, 8], [36, 12], [40, 26], [8, 26], [12, 12]]); C.fill(x, '#ffd23f', r, [8, 8, 32, 18]); C.stroke(x, r, 2.4);
      C.rect(x, 4, 25, 40, 6, r, 0.5); C.fill(x, '#f2b630', r, null); C.stroke(x, r, 2.2);
      C.blob(x, 24, 17, 5, 5, r, 0.08, 12); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 1.4);
      x.beginPath(); for (let i = 0; i < 20; i++) { const a = i * 0.5, d = 0.4 + i * 0.18; x.lineTo(24 + Math.cos(a) * d, 17 + Math.sin(a) * d); } C.stroke(x, r, 1.2, '#4f7cc2');
      C.dots(x, 4, 34, 40, 10, 5, '#7fb2e5', r, 1.4);
    },
    'gear-bunny'(x, r) {
      [[-0.18, 16], [0.18, 32]].forEach(([rot, cx]) => {
        x.save(); x.translate(cx, 22); x.rotate(rot);
        C.blob(x, 0, -8, 6, 15, r, 0.05); C.fill(x, '#fbfbf8', r, [-6, -23, 12, 30]); C.stroke(x, r, 2.4);
        C.blob(x, 0, -7, 2.8, 10, r, 0.06); C.fill(x, '#ff8fab', r, null);
        x.restore();
      });
      x.beginPath(); x.ellipse(24, 46, 20, 12, 0, Math.PI * 1.08, Math.PI * 1.92); C.stroke(x, r, 4.4); C.stroke(x, r, 2.8, '#ff8fab');
    },
    'gear-unicorn'(x, r) {
      poly(x, [[24, 2], [32, 34], [16, 34]]); C.fill(x, '#ffe58a', r, [16, 2, 16, 32]); C.stroke(x, r, 2.4);
      [[19, 28, 30, 24], [20, 21, 28, 17], [21, 14, 27, 11]].forEach(([a, b, c, d]) => C.line(x, a, b, c, d, r, 1.6, '#e8a33a'));
      x.beginPath(); x.ellipse(24, 46, 20, 12, 0, Math.PI * 1.08, Math.PI * 1.92); C.stroke(x, r, 4.4); C.stroke(x, r, 2.8, '#c9b6ff');
      [[8, 36, '#ff8fab'], [40, 36, '#7fd1a8']].forEach(([a, b, col]) => { C.blob(x, a, b, 4, 4, r, 0.15, 10); C.fill(x, col, r, null); C.stroke(x, r, 1.4); });
      star(x, 40, 10, 3.4); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1);
    },

    // ================= 裝備：背後 =================
    'gear-heroCape'(x, r) {
      cape(x, r, '#ef4b5c');
      star(x, 24, 26, 6); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.6);
    },
    'gear-blanket'(x, r) {
      capePath(x); C.fill(x, '#7fb2e5', r, [4, 4, 40, 40]);
      x.save(); capePath(x); x.clip(); C.plaid(x, 4, 4, 40, 42, 7, '#ef4b5c', r, 1.6); C.plaid(x, 7, 7, 40, 42, 14, '#fbfbf8', r, 1); x.restore();
      capePath(x); C.stroke(x, r, 2.4);
      C.rect(x, 15, 5, 18, 5, r, 0.4); C.fill(x, '#4f7cc2', r, null); C.stroke(x, r, 1.6);
      [10, 16, 22, 28, 34, 40].forEach(xx => C.line(x, xx, 43, xx, 46, r, 1.4));
    },
    'gear-devil'(x, r) { wings(x, r, '#6b4fa8', 'bat'); },
    'gear-pigBalloon'(x, r) {
      x.beginPath(); x.moveTo(24, 36); x.quadraticCurveTo(20, 42, 24, 47); C.stroke(x, r, 1.4);
      C.blob(x, 24, 20, 16, 15, r, 0.04); C.fill(x, '#ffa8c5', r, [8, 5, 32, 30]); C.stroke(x, r, 2.4);
      [[12, 8], [36, 8]].forEach(([a, b]) => { poly(x, [[a - 4, b + 4], [a, b - 4], [a + 4, b + 4]]); C.fill(x, '#ffa8c5', r, null); C.stroke(x, r, 1.6); });
      C.blob(x, 24, 24, 7, 5, r, 0.08); C.fill(x, '#ff8fab', r, null); C.stroke(x, r, 1.6);
      dot(x, 21.5, 24, 1.2, '#a8323d'); dot(x, 26.5, 24, 1.2, '#a8323d');
      dot(x, 17, 16, 1.6, '#2b2a33'); dot(x, 31, 16, 1.6, '#2b2a33');
      poly(x, [[22, 35], [26, 35], [24, 38]]); C.fill(x, '#ff8fab', r, null); C.stroke(x, r, 1);
      shine(x, r, 14, 12, 2.4, 3.4);
    },
    'gear-angel'(x, r) {
      wings(x, r, '#fbfbf8', 'feather');
      x.beginPath(); x.ellipse(24, 8, 8, 3, 0, 0, Math.PI * 2); C.stroke(x, r, 2.6, '#ffd23f');
    },
    'gear-rainbowCape'(x, r) {
      capePath(x); C.fill(x, '#fbfbf8', r, null);
      x.save(); capePath(x); x.clip();
      ['#ef4b5c', '#ff9a3c', '#ffd23f', '#7fd1a8', '#4f9fd8', '#8a5cd6'].forEach((col, i) => { x.fillStyle = col; x.fillRect(4 + i * 6.7, 0, 7, 48); });
      x.restore();
      capePath(x); C.stroke(x, r, 2.4);
      C.rect(x, 15, 5, 18, 5, r, 0.4); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 1.6);
    },
    'gear-butterfly'(x, r) {
      [-1, 1].forEach(sd => {
        C.blob(x, 24 + sd * 11, 16, 11, 11, r, 0.08); C.fill(x, '#7fc8f8', r, null); C.stroke(x, r, 2.2);
        C.blob(x, 24 + sd * 9, 33, 8, 8, r, 0.08); C.fill(x, '#c9b6ff', r, null); C.stroke(x, r, 2.2);
        dot(x, 24 + sd * 12, 15, 3.4, '#ffd23f'); dot(x, 24 + sd * 9, 34, 2.4, '#ff8fab');
      });
      C.blob(x, 24, 25, 2.6, 13, r, 0.06); C.fill(x, '#2b2a33', r, null);
      C.line(x, 23, 12, 18, 4, r, 1.4); C.line(x, 25, 12, 30, 4, r, 1.4);
    },
    'gear-phoenix'(x, r) {
      wings(x, r, '#ff8a3d', 'fire');
      flame(x, r, 9, 12, 7, 11, '#ef4b5c', '#ffd23f'); flame(x, r, 39, 12, 7, 11, '#ef4b5c', '#ffd23f');
      flame(x, r, 24, 30, 10, 18, '#ef4b5c', '#ffd23f');
    },

    // ================= 裝備：生肖、女僕咖啡廳 =================
    'gear-horse'(x, r) {
      [[13, -1], [35, 1]].forEach(([a, k]) => { poly(x, [[a - 5, 16], [a + k * 2, 1], [a + 6, 14]]); C.fill(x, '#c98a52', r, null); C.stroke(x, r, 2.2); });
      C.blob(x, 24, 25, 16, 15, r, 0.04); C.fill(x, '#c98a52', r, [8, 10, 32, 30]); C.stroke(x, r, 2.4);
      [[18, 8], [23, 6], [28, 7], [32, 10]].forEach(([a, b]) => { C.blob(x, a, b, 4, 4.6, r, 0.1, 12); C.fill(x, '#6b4a32', r, null); C.stroke(x, r, 1.4); });
      C.blob(x, 24, 35, 10, 7, r, 0.06); C.fill(x, '#f0d2a8', r, null); C.stroke(x, r, 1.8);
      dot(x, 20, 35, 1.6, '#2b2a33'); dot(x, 28, 35, 1.6, '#2b2a33');
      dot(x, 17, 23, 2, '#2b2a33'); dot(x, 31, 23, 2, '#2b2a33');
      dot(x, 11, 29, 2.4, 'rgba(244,120,120,.45)'); dot(x, 37, 29, 2.4, 'rgba(244,120,120,.45)');
    },
    'gear-dragonCape'(x, r) {
      capePath(x); C.fill(x, '#ef4b5c', r, [4, 6, 40, 39]);
      x.save(); capePath(x); x.clip();
      for (let yy = 14; yy < 46; yy += 6) for (let xx = 2 + ((yy / 6) % 2) * 4; xx < 46; xx += 8) { x.beginPath(); x.arc(xx, yy, 3.4, 0, Math.PI); C.stroke(x, r, 1.3, '#ffd23f'); }
      x.restore();
      capePath(x); C.stroke(x, r, 2.4);
      C.blob(x, 24, 7, 4, 4, r, 0.1, 12); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.6);
      [6, 12, 18, 24, 30, 36, 42].forEach(xx => C.line(x, xx, 42, xx, 47, r, 1.4, '#ffb020'));
    },
    'gear-veil'(x, r) {
      C.smooth(x, [[24, 6], [36, 10], [42, 26], [45, 44], [3, 44], [6, 26], [12, 10]]);
      x.save(); x.globalAlpha = 0.6; x.fillStyle = '#eef4f8'; x.fill(); x.restore(); C.stroke(x, r, 1.6, '#9aa3b5');
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.1 + i * 0.133), cx = 24 + Math.cos(a) * 15, cy = 20 + Math.sin(a) * 11;
        C.blob(x, cx, cy, 3.6, 3.6, r, 0.12, 10); C.fill(x, i % 2 ? '#ffd0e2' : '#ffffff', r, null); C.stroke(x, r, 1.2);
        dot(x, cx, cy, 1.3, '#ffd23f');
      }
    },
    'gear-bouquet'(x, r) {
      [[-1, '#ff8fb8'], [1, '#ffc2da']].forEach(([k, col]) => {
        x.beginPath(); x.moveTo(24, 30); x.bezierCurveTo(24 + k * 14, 36, 24 - k * 6, 40, 24 + k * 14, 46); x.lineTo(24 + k * 17, 44);
        x.bezierCurveTo(24 - k * 2, 38, 24 + k * 18, 34, 24 + k * 3, 29); x.closePath(); C.fill(x, col, r, null); C.stroke(x, r, 1.4);
      });
      poly(x, [[19, 22], [29, 22], [26, 34], [22, 34]]); C.fill(x, '#7fd1a8', r, null); C.stroke(x, r, 1.6);
      [[12, 18], [36, 18]].forEach(([a, b]) => { C.blob(x, a, b, 5, 2.6, r, 0.1, 10); C.fill(x, '#6baf7b', r, null); C.stroke(x, r, 1.2); });
      [[24, 12, '#ffffff'], [16, 16, '#ffd0e2'], [32, 16, '#fff4c9'], [19, 7, '#ff8fb8'], [29, 7, '#ffffff'], [24, 20, '#ffb3c8']].forEach(([a, b, col]) => {
        C.blob(x, a, b, 5.4, 5.4, r, 0.14, 10); C.fill(x, col, r, null); C.stroke(x, r, 1.4); dot(x, a, b, 1.6, '#ffd23f');
      });
    },
    'gear-maidBand'(x, r) {
      catBand(x, r, '#2b2a33');
      for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.1 + i * 0.1); C.blob(x, 24 + Math.cos(a) * 22, 46 + Math.sin(a) * 14, 3, 3, r, 0.12, 10); C.fill(x, '#ffffff', r, null); C.stroke(x, r, 1.2); }
      heart(x, 40, 30, 4); C.fill(x, '#ff8fb8', r, null); C.stroke(x, r, 1.2);
    },
    'gear-maid'(x, r) {
      poly(x, [[16, 5], [32, 5], [42, 14], [38, 20], [35, 17], [42, 44], [6, 44], [13, 17], [10, 20], [6, 14]]);
      C.fill(x, '#2b2a33', r, [6, 5, 36, 39]); C.stroke(x, r, 2.4);
      poly(x, [[17, 16], [31, 16], [34, 40], [14, 40]]); C.fill(x, '#ffffff', r, null); C.stroke(x, r, 1.6);
      for (let xx = 9; xx <= 39; xx += 5) { C.blob(x, xx, 44, 3, 2, r, 0.12, 10); C.fill(x, '#ffffff', r, null); C.stroke(x, r, 1); }
      [[19, 8], [29, 8]].forEach(([a, b]) => { C.blob(x, a, b, 5, 3.2, r, 0.1, 10); C.fill(x, '#ffffff', r, null); C.stroke(x, r, 1.2); });
      heart(x, 24, 10, 3.4); C.fill(x, '#ff8fb8', r, null); C.stroke(x, r, 1.2);
    },
    'gear-butler'(x, r) {
      shirt(x, r, '#2b2a33');
      poly(x, [[17, 7], [31, 7], [30, 34], [24, 37], [18, 34]]); C.fill(x, '#7a8296', r, null); C.stroke(x, r, 1.6);
      poly(x, [[20, 6], [28, 6], [24, 16]]); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 1.4);
      poly(x, [[18, 7], [24, 10], [30, 7], [30, 13], [24, 10], [18, 13]]); C.fill(x, '#2b2a33', r, null); C.stroke(x, r, 1.2);
      [21, 27].forEach(yy => dot(x, 24, yy, 1.3, '#2b2a33'));
      x.beginPath(); x.moveTo(24, 24); x.quadraticCurveTo(28, 29, 31, 25); C.stroke(x, r, 1.3, '#ffd23f');
      [[8, 40], [40, 40]].forEach(([a, b]) => { C.blob(x, a, b, 3.6, 3.2, r, 0.1, 10); C.fill(x, '#ffffff', r, null); C.stroke(x, r, 1.4); });
    },
    'gear-heartBow'(x, r) {
      [[-1, 0.2], [1, -0.2]].forEach(([k, t]) => {
        poly(x, [[24 + k * 2, 26], [24 + k * 10 + t * 10, 46], [24 + k * 4 + t * 10, 46]]); C.fill(x, '#ff8fb8', r, null); C.stroke(x, r, 1.6);
        x.save(); x.translate(24 + k * 12, 20); x.rotate(k * 0.5);
        heart(x, 0, 0, 11); C.fill(x, '#ff8fb8', r, null); C.stroke(x, r, 2.2);
        heart(x, 0, 0, 5); C.fill(x, '#ffd0e2', r, null);
        x.restore();
      });
      C.blob(x, 24, 22, 4.5, 5, r, 0.1, 12); C.fill(x, '#ff6b9a', r, null); C.stroke(x, r, 1.8);
    },

    // ================= 裝備：武器 =================
    'gear-lilyDart'(x, r) {
      C.line(x, 8, 44, 24, 26, r, 2.6, '#5fb37a');
      x.save(); x.translate(13, 39); x.rotate(-0.7); C.blob(x, 0, 0, 7, 2.6, r, 0.1, 12); C.fill(x, '#5fb37a', r, null); C.stroke(x, r, 1.4); x.restore();
      for (let i = 0; i < 6; i++) {
        x.save(); x.translate(28, 21); x.rotate(i * Math.PI / 3 + 0.2);
        C.smooth(x, [[0, -2], [5, -10], [0, -18], [-5, -10]]); C.fill(x, '#ff9a2e', r, null); C.stroke(x, r, 1.8);
        C.line(x, 0, -4, 0, -14, r, 1, '#d8642a', 0.2);
        x.restore();
      }
      C.blob(x, 28, 21, 4.4, 4.4, r, 0.1); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.4);
    },
    'gear-qixingStaff'(x, r) {
      C.line(x, 10, 45, 30, 17, r, 3.4, '#a0703f');
      C.line(x, 26, 22, 34, 22, r, 2, '#c9962a'); 
      C.blob(x, 34, 13, 9, 9, r, 0.04); C.fill(x, '#b9d6e8', r, [25, 4, 18, 18]); C.stroke(x, r, 2.4);
      [[31, 10, '#ef4b5c'], [37, 11, '#ffd23f'], [36, 17, '#7fd1a8'], [31, 16, '#8a5cd6']].forEach(([a, b, col]) => { C.blob(x, a, b, 2.2, 1.8, r, 0.15, 10); C.fill(x, col, r, null); C.stroke(x, r, 0.9); });
      [[6, 8], [14, 4], [44, 30], [40, 38], [20, 10], [10, 16], [44, 22]].forEach(([a, b], i) => { star(x, a, b, i % 2 ? 2 : 2.8); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 0.9); });
    },
    'gear-tarokoHammer'(x, r) {
      x.save(); x.translate(24, 24); x.rotate(-0.6);
      C.rect(x, -2.8, -4, 5.6, 26, r, 0.4); C.fill(x, '#7a4f2e', r, null); C.stroke(x, r, 2.2);
      [4, 10, 16].forEach(yy => C.line(x, -2.8, yy, 2.8, yy + 2, r, 1.2, '#c9962a'));
      C.rect(x, -15, -18, 30, 15, r, 0.8); C.fill(x, '#eceae4', r, [-15, -18, 30, 15]); C.stroke(x, r, 2.6);
      C.line(x, -11, -15, -4, -6, r, 1.1, '#8a93a6'); C.line(x, 2, -16, 6, -10, r, 1.1, '#8a93a6'); C.line(x, 6, -10, 11, -7, r, 1.1, '#8a93a6');
      C.rect(x, -17, -15, 3, 9, r, 0.3); C.fill(x, '#c9962a', r, null); C.stroke(x, r, 1.4);
      C.rect(x, 14, -15, 3, 9, r, 0.3); C.fill(x, '#c9962a', r, null); C.stroke(x, r, 1.4);
      x.restore();
    },

    // ================= 家具 =================
    // 龜背芋盆栽
    'dec-plant'(x, r) {
      const leaf = (cx, cy, rot) => { x.save(); x.translate(cx, cy); x.rotate(rot);
        C.blob(x, 0, 0, 9, 7, r, 0.08); C.fill(x, '#5fb37a', r, [-9, -7, 18, 14]); C.stroke(x, r, 2);
        C.line(x, -7, 0, 7, 0, r, 1.1, '#2f6b45'); C.line(x, -2, -6, -1, -2, r, 1.2, '#fbf6e9'); C.line(x, 3, 6, 3, 2, r, 1.2, '#fbf6e9'); x.restore(); };
      C.line(x, 24, 30, 14, 14, r, 1.8, '#2f6b45'); C.line(x, 24, 30, 34, 12, r, 1.8, '#2f6b45'); C.line(x, 24, 30, 24, 8, r, 1.8, '#2f6b45');
      leaf(13, 15, -0.7); leaf(35, 13, 0.6); leaf(24, 9, -0.1);
      poly(x, [[12, 29], [36, 29], [33, 45], [15, 45]]); C.fill(x, '#d87a4a', r, [12, 29, 24, 16]); C.stroke(x, r, 2.4);
      C.rect(x, 10, 27, 28, 5, r, 0.4); C.fill(x, '#c2643a', r, null); C.stroke(x, r, 2);
    },
    // 暖暖落地燈
    'dec-lamp'(x, r) {
      x.save(); x.globalAlpha = 0.35; C.blob(x, 24, 14, 20, 13, r, 0.1); x.fillStyle = '#ffe58a'; x.fill(); x.restore();
      C.line(x, 24, 20, 24, 42, r, 2.6, '#6b7488');
      C.blob(x, 24, 43, 10, 3, r, 0.08, 12); C.fill(x, '#6b7488', r, null); C.stroke(x, r, 1.8);
      poly(x, [[16, 4], [32, 4], [38, 20], [10, 20]]); C.fill(x, '#ffd9a0', r, [10, 4, 28, 16]); C.stroke(x, r, 2.4);
      C.line(x, 12, 15, 36, 15, r, 1.2, '#e8a33a');
      dot(x, 24, 22, 2.6, '#ffd23f');
    },
    // 懶骨頭
    'dec-beanbag'(x, r) {
      C.blob(x, 24, 30, 20, 14, r, 0.06); C.fill(x, '#4f7cc2', r, [4, 16, 40, 28]); C.stroke(x, r, 2.4);
      C.blob(x, 22, 24, 11, 6, r, 0.1, 14); C.fill(x, '#86a8dd', r, null);
      C.line(x, 30, 21, 36, 36, r, 1.4, 'rgba(19,26,40,0.35)', 0.4);
      C.line(x, 12, 30, 16, 40, r, 1.2, 'rgba(19,26,40,0.3)', 0.4);
    },
    // 圓圓小地毯
    'dec-rug'(x, r) {
      C.blob(x, 24, 26, 21, 15, r, 0.04); C.fill(x, '#ffb020', r, [3, 11, 42, 30]); C.stroke(x, r, 2.4);
      C.blob(x, 24, 26, 14, 9.5, r, 0.05); C.stroke(x, r, 2, '#e8384f');
      C.blob(x, 24, 26, 7, 4.5, r, 0.06, 12); C.fill(x, '#fbf3e4', r, null);
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; C.line(x, 24 + Math.cos(a) * 21, 26 + Math.sin(a) * 15, 24 + Math.cos(a) * 24, 26 + Math.sin(a) * 18, r, 1.2, '#c98a2a', 0.2); }
    },
    // 颱風玩偶（迷你薔琵）
    'dec-plush'(x, r) {
      [[12, 32, 9], [36, 32, 9], [24, 24, 13], [16, 20, 8], [32, 20, 8]].forEach(([a, b, s]) => {
        C.blob(x, a, b, s, s * 0.9, r, 0.1, 14); C.fill(x, '#d6dae1', r, null); C.stroke(x, r, 2.2);
      });
      C.blob(x, 24, 30, 15, 10, r, 0.06); C.fill(x, '#e8edf3', r, null);
      x.beginPath(); x.arc(24, 30, 5, 0.2, 5); C.stroke(x, r, 1.8, '#4f7cc2');
      dot(x, 18, 26, 1.8, '#2b2a33'); dot(x, 30, 26, 1.8, '#2b2a33');
      dot(x, 14, 32, 2.6, 'rgba(244,120,120,.5)'); dot(x, 34, 32, 2.6, 'rgba(244,120,120,.5)');
      C.rect(x, 10, 40, 28, 4, r, 0.4); C.fill(x, '#ff8fab', r, null); C.stroke(x, r, 1.4);
    },
    // 電風扇
    'dec-fan'(x, r) {
      C.line(x, 24, 32, 24, 42, r, 3, '#9aa3b5', 0.2);
      C.blob(x, 24, 43, 11, 3, r, 0.08, 12); C.fill(x, '#9aa3b5', r, null); C.stroke(x, r, 1.8);
      C.blob(x, 24, 19, 16, 16, r, 0.03); C.fill(x, '#bfe6ff', r, null); C.stroke(x, r, 2.4);
      for (let i = 0; i < 3; i++) {
        x.save(); x.translate(24, 19); x.rotate(i * Math.PI * 2 / 3);
        C.blob(x, 0, -7, 4.5, 7, r, 0.08, 12); C.fill(x, '#ffffff', r, null); C.stroke(x, r, 1.4); x.restore();
      }
      dot(x, 24, 19, 2.6, '#4f7cc2');
      [[42, 10, 47, 8], [43, 18, 47, 18], [42, 26, 47, 28]].forEach(([a, b, c, d]) => C.line(x, a, b, c, d, r, 1.6, '#7fb2e5'));
    },
    // 小書櫃
    'dec-shelf'(x, r) {
      C.rect(x, 9, 3, 30, 42, r, 0.8); C.fill(x, '#b98457', r, [9, 3, 30, 42]); C.stroke(x, r, 2.4);
      [17, 31].forEach(y => C.line(x, 10, y, 38, y, r, 2.2));
      const cols = ['#e8384f', '#4f7cc2', '#ffd23f', '#6baf7b', '#7a5cc8'];
      [5, 19, 33].forEach((y0, row) => {
        for (let i = 0; i < 5; i++) {
          const bx = 12 + i * 5, h = 9 + ((i + row) % 3) * 1.4;
          C.rect(x, bx, y0 + 11 - h, 4, h, r, 0.3); C.fill(x, cols[(i + row) % 5], r, null); C.stroke(x, r, 1);
        }
      });
    },
    // 金魚缸
    'dec-fishtank'(x, r) {
      C.blob(x, 24, 27, 19, 17, r, 0.03); C.fill(x, '#cfeefc', r, [5, 10, 38, 34]); C.stroke(x, r, 2.4);
      C.rect(x, 13, 7, 22, 5, r, 0.4); C.fill(x, '#eef6ff', r, null); C.stroke(x, r, 2);
      C.line(x, 7, 22, 41, 22, r, 1.4, '#4f9fd8');
      C.blob(x, 22, 30, 7, 5, r, 0.06); C.fill(x, '#ff8a3d', r, null); C.stroke(x, r, 1.8);
      poly(x, [[29, 30], [36, 25], [35, 35]]); C.fill(x, '#ff8a3d', r, null); C.stroke(x, r, 1.6);
      dot(x, 18, 29, 1.2, '#2b2a33');
      [[14, 24, 1.6], [12, 19, 1.2]].forEach(([a, b, s]) => { C.blob(x, a, b, s, s, r, 0.1); C.stroke(x, r, 1, '#4f9fd8'); });
      C.line(x, 12, 40, 18, 38, r, 2, '#5fb37a'); C.line(x, 32, 41, 34, 36, r, 2, '#5fb37a');
    },
    // 黑膠唱機
    'dec-record'(x, r) {
      C.rect(x, 4, 18, 40, 24, r, 0.6); C.fill(x, '#e8c39a', r, [4, 18, 40, 24]); C.stroke(x, r, 2.4);
      C.blob(x, 20, 29, 13, 9, r, 0.03); C.fill(x, '#2b2a33', r, null); C.stroke(x, r, 1.6);
      C.blob(x, 20, 29, 8, 5.5, r, 0.05); C.stroke(x, r, 0.8, '#6b7488');
      C.blob(x, 20, 29, 3.4, 2.4, r, 0.05, 10); C.fill(x, '#e8384f', r, null);
      C.line(x, 39, 22, 28, 30, r, 2, '#9aa3b5', 0.2); dot(x, 39, 22, 2.4, '#6b7488');
      note(x, r, 32, 13, 3.6, '#ff8fab'); note(x, r, 8, 10, 3, '#7fb2e5');
    },
    // UFO 檯燈
    'dec-ufo'(x, r) {
      x.save(); x.globalAlpha = 0.35; poly(x, [[17, 24], [31, 24], [38, 44], [10, 44]]); x.fillStyle = '#7be08f'; x.fill(); x.restore();
      C.blob(x, 24, 12, 8, 7, r, 0.06, 14); C.fill(x, '#bfe6ff', r, null); C.stroke(x, r, 2);
      C.blob(x, 24, 20, 20, 6, r, 0.05); C.fill(x, '#e8384f', r, [4, 14, 40, 12]); C.stroke(x, r, 2.4);
      [[12, 20], [20, 22], [28, 22], [36, 20]].forEach(([a, b]) => dot(x, a, b, 1.8, '#ffd23f'));
      C.blob(x, 24, 26, 10, 3, r, 0.08, 12); C.fill(x, '#9aa3b5', r, null); C.stroke(x, r, 1.6);
      C.blob(x, 24, 44, 10, 2.4, r, 0.1, 12); C.fill(x, '#6b7488', r, null); C.stroke(x, r, 1.4);
      C.line(x, 24, 28, 24, 43, r, 1.6, '#6b7488');
    },
  };

  root.HQ_ICONS.add(DRAW);
})(this);
