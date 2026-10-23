// 室內設計：打怪掉落的家具，可以擺在總部室內。資料前後端共用，畫法只在瀏覽器用
// 每件家具畫在 48x64 的框裡，底部 (24, 60) 對齊格子的下緣，可以往上長
(function (root) {
  const DECOR = {
    plant: { name: '龜背芋盆栽', icon: '🪴' },
    lamp: { name: '暖暖落地燈', icon: '💡' },
    beanbag: { name: '懶骨頭', icon: '🛋️' },
    rug: { name: '圓圓小地毯', icon: '🟠', flat: true },
    plush: { name: '颱風玩偶', icon: '🌀' },
    fan: { name: '電風扇', icon: '🌬️' },
    shelf: { name: '小書櫃', icon: '📚' },
    fishtank: { name: '金魚缸', icon: '🐠' },
    record: { name: '黑膠唱機', icon: '🎶' },
    ufo: { name: 'UFO 檯燈', icon: '🛸' },
  };
  const MAX_PLACED = 150; // 整個總部最多擺幾件

  const W = 2.2;
  const dot = (ctx, x, y, rad, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); };
  const shadow = (ctx, rx) => { ctx.fillStyle = 'rgba(19,26,40,0.16)'; ctx.beginPath(); ctx.ellipse(24, 60, rx, 3.5, 0, 0, Math.PI * 2); ctx.fill(); };

  const DRAW = {
    plant(ctx, C, r) {
      shadow(ctx, 13);
      [[-1, 22, 14], [1, 22, 14], [-1, 10, 22], [1, 12, 20], [0, 18, 8]].forEach(([k, len, y]) => {
        C.blob(ctx, 24 + k * len * 0.55, y + 10, 10, 7, r, 0.1, 14); C.fill(ctx, '#6baf7b', r, null); C.stroke(ctx, r, W);
        C.line(ctx, 24 + k * len * 0.55 - 4, y + 10, 24 + k * len * 0.55 + 4, y + 9, r, 1.2, '#f4efc4', 0.3);
      });
      C.line(ctx, 24, 44, 24, 26, r, 2, '#4a8f55', 0.3);
      C.rect(ctx, 13, 42, 22, 17, r, 0.8); C.fill(ctx, '#ff8a3d', r, null); C.stroke(ctx, r, W);
      C.line(ctx, 13, 47, 35, 47, r, 2, '#b84300', 0.3);
    },
    lamp(ctx, C, r) {
      shadow(ctx, 10);
      ctx.save(); ctx.globalAlpha = 0.25; dot(ctx, 24, 16, 16, '#ffd23f'); ctx.restore();
      C.line(ctx, 24, 22, 24, 57, r, 2.6, C.INK, 0.2);
      C.blob(ctx, 24, 58, 9, 2.6, r, 0.08, 12); C.fill(ctx, '#2f3b55', r, null); C.stroke(ctx, r, 1.8);
      ctx.beginPath(); ctx.moveTo(15, 22); ctx.lineTo(33, 22); ctx.lineTo(29, 6); ctx.lineTo(19, 6); ctx.closePath();
      C.fill(ctx, '#fbf3e4', r, null); C.stroke(ctx, r, W);
      C.line(ctx, 15, 22, 33, 22, r, 2, '#ffb020', 0.3);
    },
    beanbag(ctx, C, r) {
      shadow(ctx, 20);
      C.blob(ctx, 24, 46, 20, 14, r, 0.06); C.fill(ctx, '#4f7cc2', r, [4, 32, 40, 28]); C.stroke(ctx, r, W);
      C.blob(ctx, 22, 40, 11, 6, r, 0.1, 14); C.fill(ctx, '#86a8dd', r, null);
      C.line(ctx, 30, 36, 36, 50, r, 1.4, 'rgba(19,26,40,0.35)', 0.4);
    },
    rug(ctx, C, r) {
      C.blob(ctx, 24, 48, 23, 12, r, 0.04); C.fill(ctx, '#ffb020', r, [1, 36, 46, 24]); C.stroke(ctx, r, W);
      C.blob(ctx, 24, 48, 15, 7.5, r, 0.05); C.stroke(ctx, r, 2, '#e8384f');
      C.blob(ctx, 24, 48, 7, 3.5, r, 0.06, 12); C.fill(ctx, '#fbf3e4', r, null);
    },
    plush(ctx, C, r) {
      shadow(ctx, 13);
      // 縮小版的颱風薔琵：軟綿綿的雲朵＋小漩渦＋豆豆眼
      [[14, 46, 9], [34, 46, 9], [24, 40, 12], [18, 36, 8], [31, 36, 8]].forEach(([x, y, rr]) => {
        C.blob(ctx, x, y, rr, rr * 0.9, r, 0.1, 14); C.fill(ctx, '#d6dae1', r, null); C.stroke(ctx, r, 2);
      });
      C.blob(ctx, 24, 44, 14, 9, r, 0.06); C.fill(ctx, '#e8edf3', r, null);
      ctx.beginPath(); ctx.arc(24, 44, 5, 0.2, 5); C.stroke(ctx, r, 1.6, '#4f7cc2');
      [[19, 41], [29, 41]].forEach(([x, y]) => dot(ctx, x, y, 1.6, C.INK));
      [[15, 46], [33, 46]].forEach(([x, y]) => dot(ctx, x, y, 2.4, 'rgba(244,120,120,0.45)'));
    },
    fan(ctx, C, r) {
      shadow(ctx, 11);
      C.line(ctx, 24, 36, 24, 57, r, 3, '#9aa3b5', 0.2);
      C.blob(ctx, 24, 58, 11, 3, r, 0.08, 12); C.fill(ctx, '#9aa3b5', r, null); C.stroke(ctx, r, 1.8);
      C.blob(ctx, 24, 22, 16, 16, r, 0.03); C.fill(ctx, '#bfe6ff', r, null); C.stroke(ctx, r, W);
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.translate(24, 22); ctx.rotate(i * Math.PI * 2 / 3);
        C.blob(ctx, 0, -7, 4.5, 7, r, 0.08, 12); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 1.4); ctx.restore();
      }
      dot(ctx, 24, 22, 2.6, '#4f7cc2');
      ctx.save(); ctx.strokeStyle = 'rgba(43,42,51,0.35)'; ctx.lineWidth = 1;
      [-8, 0, 8].forEach(dx => { ctx.beginPath(); ctx.moveTo(24 + dx, 7); ctx.lineTo(24 + dx, 37); ctx.stroke(); }); ctx.restore();
    },
    shelf(ctx, C, r) {
      shadow(ctx, 18);
      C.rect(ctx, 7, 6, 34, 53, r, 0.8); C.fill(ctx, '#b98457', r, [7, 6, 34, 53]); C.stroke(ctx, r, W);
      [22, 40].forEach(y => C.line(ctx, 8, y, 40, y, r, 2.2));
      const colors = ['#e8384f', '#4f7cc2', '#ffd23f', '#6baf7b', '#7a5cc8'];
      [[10, 9], [10, 27], [10, 45]].forEach(([x0, y0], row) => {
        for (let i = 0; i < 5; i++) {
          const x = x0 + i * 5.6, h = 11 + ((i + row) % 3) * 1.5;
          C.rect(ctx, x, y0 + 12 - h, 4.4, h, r, 0.3); C.fill(ctx, colors[(i + row) % 5], r, null); C.stroke(ctx, r, 1);
        }
      });
    },
    fishtank(ctx, C, r) {
      shadow(ctx, 18);
      C.rect(ctx, 8, 46, 32, 13, r, 0.6); C.fill(ctx, '#6b4a32', r, null); C.stroke(ctx, r, W);
      C.rect(ctx, 6, 20, 36, 27, r, 0.6); C.fill(ctx, '#a9d4f0', r, null); C.stroke(ctx, r, W);
      C.line(ctx, 7, 25, 41, 25, r, 1.2, '#ffffff', 0.3);
      C.blob(ctx, 20, 35, 5, 3.4, r, 0.08, 12); C.fill(ctx, '#ff7a2f', r, null); C.stroke(ctx, r, 1.2);
      ctx.beginPath(); ctx.moveTo(15, 35); ctx.lineTo(11, 32); ctx.lineTo(11, 38); ctx.closePath(); C.fill(ctx, '#ff7a2f', r, null);
      dot(ctx, 22, 34.4, 0.9, C.INK);
      [[31, 30, 1.6], [33, 26, 1.1], [28, 38, 1.3]].forEach(([x, y, rr]) => { ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); C.stroke(ctx, r, 1, '#ffffff'); });
      C.line(ctx, 37, 46, 36, 36, r, 2, '#4a8f55', 0.4);
    },
    record(ctx, C, r) {
      shadow(ctx, 18);
      C.rect(ctx, 6, 38, 36, 20, r, 0.6); C.fill(ctx, '#e8c39a', r, null); C.stroke(ctx, r, W);
      C.blob(ctx, 20, 38, 13, 5, r, 0.03); C.fill(ctx, '#2b2a33', r, null); C.stroke(ctx, r, 1.6);
      C.blob(ctx, 20, 38, 4, 1.6, r, 0.05, 10); C.fill(ctx, '#e8384f', r, null);
      C.line(ctx, 37, 34, 27, 39, r, 1.8, '#9aa3b5', 0.2);
      [[14, 48], [24, 48], [34, 48]].forEach(([x, y]) => dot(ctx, x, y, 1.8, '#6b4a32'));
      // 飄出來的音符
      ctx.fillStyle = C.INK; ctx.font = '900 12px sans-serif'; ctx.fillText('♪', 30, 24); ctx.fillText('♫', 12, 18);
    },
    ufo(ctx, C, r) {
      shadow(ctx, 14);
      ctx.save(); ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.moveTo(16, 34); ctx.lineTo(32, 34); ctx.lineTo(38, 58); ctx.lineTo(10, 58); ctx.closePath();
      ctx.fillStyle = '#7be08f'; ctx.fill(); ctx.restore();
      C.blob(ctx, 24, 22, 8, 7, r, 0.06, 14); C.fill(ctx, '#bfe6ff', r, null); C.stroke(ctx, r, 2);
      C.blob(ctx, 24, 30, 20, 6, r, 0.05); C.fill(ctx, '#e8384f', r, null); C.stroke(ctx, r, W);
      [[12, 30], [20, 32], [28, 32], [36, 30]].forEach(([x, y]) => dot(ctx, x, y, 1.8, '#ffd23f'));
      C.blob(ctx, 24, 36, 10, 3, r, 0.08, 12); C.fill(ctx, '#9aa3b5', r, null); C.stroke(ctx, r, 1.6);
    },
  };

  function drawDecor(ctx, kind) {
    const C = root.HQ_CRAYON;
    const f = DRAW[kind];
    if (!f) return;
    const seed = [...kind].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11);
    ctx.save(); f(ctx, C, C.rng(seed)); ctx.restore();
  }
  function roll() {
    const keys = Object.keys(DECOR);
    return keys[Math.floor(Math.random() * keys.length)];
  }

  const decor = { DECOR, MAX_PLACED, drawDecor, roll, WIDTH: 48, HEIGHT: 64 };
  if (typeof module !== 'undefined' && module.exports) module.exports = decor;
  else root.HQ_DECOR = decor;
})(this);
