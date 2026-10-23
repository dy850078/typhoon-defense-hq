// 召喚師的奇異生物（參考聖誕外星人插畫）：畫在 72x80 的框裡，腳底在 (36, 76)
(function (root) {
  const W = 2.4;
  const dot = (ctx, x, y, rad, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); };
  const shadow = (ctx, rx) => { ctx.fillStyle = 'rgba(19,26,40,0.18)'; ctx.beginPath(); ctx.ellipse(36, 76, rx, 3.6, 0, 0, Math.PI * 2); ctx.fill(); };
  // 大大的黑眼睛，帶一點反光
  const alienEye = (ctx, C, r, x, y, rx, ry, tilt) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    C.blob(ctx, 0, 0, rx, ry, r, 0.06, 14); C.fill(ctx, '#1d1c24', r, null);
    dot(ctx, -rx * 0.3, -ry * 0.35, Math.max(1, rx * 0.28), '#ffffff');
    ctx.restore();
  };
  const tentacle = (ctx, C, r, x0, y0, x1, y1, color, w) => {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + (x1 - x0) * 0.3, y1 - 2, x1, y1);
    C.stroke(ctx, r, w + 2.4, C.INK); C.stroke(ctx, r, w, color);
  };

  const DRAW = {
    // 灰灰外星人：大頭、大黑眼睛、像章魚一樣的細腳
    gray(ctx, C, r) {
      shadow(ctx, 20);
      const body = '#a9b48f';
      [[30, 62, 14, 75], [34, 64, 26, 76], [38, 64, 48, 76], [42, 62, 58, 74]].forEach(([a, b, c, d]) => tentacle(ctx, C, r, a, b, c, d, body, 4));
      C.blob(ctx, 36, 56, 10, 12, r, 0.06); C.fill(ctx, body, r, [26, 44, 20, 24]); C.stroke(ctx, r, W);
      // 伸出來的手
      tentacle(ctx, C, r, 44, 52, 58, 46, body, 4.5);
      tentacle(ctx, C, r, 28, 52, 16, 46, body, 4.5);
      C.blob(ctx, 36, 28, 17, 19, r, 0.04); C.fill(ctx, body, r, [19, 9, 34, 38], 0.6); C.stroke(ctx, r, W);
      alienEye(ctx, C, r, 29, 30, 4.5, 6.5, 0.35); alienEye(ctx, C, r, 43, 30, 4.5, 6.5, -0.35);
      C.line(ctx, 33, 40, 39, 40, r, 1.4, 'rgba(43,42,51,0.7)', 0.3);
    },
    // 獨眼章魚：圓滾滾的綠色身體、一顆大眼睛、八隻腳
    octo(ctx, C, r) {
      shadow(ctx, 22);
      const body = '#7bc47f';
      for (let i = 0; i < 6; i++) {
        const k = (i - 2.5) / 2.5;
        tentacle(ctx, C, r, 36 + k * 10, 60, 36 + k * 26, 75 - Math.abs(k) * 3, body, 5);
      }
      C.blob(ctx, 36, 46, 19, 18, r, 0.05); C.fill(ctx, body, r, [17, 28, 38, 36], 0.8); C.stroke(ctx, r, W);
      C.blob(ctx, 36, 44, 10, 10, r, 0.04, 16); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 2);
      C.blob(ctx, 37, 45, 6, 6.4, r, 0.05, 14); C.fill(ctx, '#2f5f4f', r, null);
      dot(ctx, 37, 45, 3, '#1d1c24'); dot(ctx, 35, 42.5, 1.6, '#ffffff');
      [[24, 52], [48, 52]].forEach(([x, y]) => dot(ctx, x, y, 2.4, 'rgba(244,120,120,0.45)'));
    },
    // 星星臉姊姊：粉紅色的星星頭、黑眼影、紅嘴唇，身體是長長的深綠色
    star(ctx, C, r) {
      shadow(ctx, 14);
      C.blob(ctx, 36, 60, 9, 16, r, 0.05); C.fill(ctx, '#3f7f4f', r, [27, 44, 18, 32]); C.stroke(ctx, r, W);
      // 背上像葉子的翅膀
      C.blob(ctx, 55, 40, 12, 16, r, 0.06); C.fill(ctx, '#9fe0a8', r, null); C.stroke(ctx, r, W);
      ctx.save(); ctx.translate(36, 28); ctx.rotate(-0.12); ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? 11 : 24;
        ctx.lineTo(Math.cos(a) * k, Math.sin(a) * k);
      }
      ctx.closePath(); C.fill(ctx, '#f7a8c4', r, [-24, -24, 48, 48]); C.stroke(ctx, r, W);
      [[-6, -2, -0.4], [6, -2, 0.4]].forEach(([x, y, t]) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(t); C.blob(ctx, 0, 0, 4.6, 3, r, 0.08, 12); C.fill(ctx, '#1d1c24', r, null); ctx.restore();
        dot(ctx, x, y, 1.2, '#ffffff');
      });
      C.blob(ctx, 0, 8, 4, 2, r, 0.1, 10); C.fill(ctx, '#e8384f', r, null); C.stroke(ctx, r, 1.2);
      ctx.restore();
    },
    // 鹿角毛毛蟲：一節一節的綠色身體，頭上紅色鹿角
    bug(ctx, C, r) {
      shadow(ctx, 30);
      const body = '#8fd19a';
      [62, 52, 42, 32, 22].forEach((x, i) => {
        const y = 62 - (i === 4 ? 4 : 0);
        [-4, 4].forEach(dx => C.line(ctx, x + dx, y + 8, x + dx - 1, 74, r, 2.4, C.INK, 0.3));
        C.blob(ctx, x, y, 9.5, 10, r, 0.06, 16); C.fill(ctx, body, r, [x - 10, y - 10, 20, 20]); C.stroke(ctx, r, W);
        dot(ctx, x - 2, y - 4, 1.6, 'rgba(255,255,255,0.6)');
      });
      // 頭
      C.blob(ctx, 14, 50, 11, 11, r, 0.05, 16); C.fill(ctx, body, r, [3, 39, 22, 22]); C.stroke(ctx, r, W);
      [[10, 41, -1], [18, 40, 1]].forEach(([x, y, k]) => {
        C.line(ctx, x, y, x + k * 3, y - 16, r, 3.4, '#e8384f', 0.3);
        C.line(ctx, x + k * 1.5, y - 8, x + k * 8, y - 13, r, 3, '#e8384f', 0.3);
      });
      [[10, 49], [18, 49]].forEach(([x, y]) => { C.blob(ctx, x, y, 2.6, 3, r, 0.1, 10); C.fill(ctx, '#1d1c24', r, null); dot(ctx, x - 0.6, y - 1, 0.8, '#fff'); });
      C.line(ctx, 11, 55, 17, 55, r, 1.4, C.INK, 0.3);
    },
    // 聖誕樹外星人：三層樹、頭上兩根星星角、黃色眼睛，雙手張開
    tree(ctx, C, r) {
      shadow(ctx, 22);
      [[22, 76, 50, 52], [18, 60, 54, 36], [14, 44, 58, 20]].reverse().forEach(() => {});
      const tier = (y0, y1, w) => {
        ctx.beginPath(); ctx.moveTo(36, y0); ctx.lineTo(36 + w, y1); ctx.quadraticCurveTo(36, y1 + 4, 36 - w, y1); ctx.closePath();
        C.fill(ctx, '#3f9f5a', r, [36 - w, y0, w * 2, y1 - y0 + 4]); C.stroke(ctx, r, W);
      };
      C.rect(ctx, 31, 66, 10, 9, r, 0.5); C.fill(ctx, '#8a5a3a', r, null); C.stroke(ctx, r, 2);
      tier(38, 68, 26); tier(26, 52, 21); tier(12, 36, 15);
      // 星星角
      [[26, 8, -1], [46, 8, 1]].forEach(([x, y, k]) => {
        C.line(ctx, 36 + k * 4, 16, x, y + 4, r, 2.2, '#3f9f5a', 0.3);
        ctx.save(); ctx.translate(x, y); ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, kk = i % 2 ? 2.2 : 5; ctx.lineTo(Math.cos(a) * kk, Math.sin(a) * kk); }
        ctx.closePath(); C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, 1.2); ctx.restore();
      });
      [[31, 26], [41, 26]].forEach(([x, y]) => { C.blob(ctx, x, y, 3.4, 4.2, r, 0.08, 12); C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, 1.4); dot(ctx, x, y + 0.5, 1.3, C.INK); });
      C.line(ctx, 33, 33, 39, 33, r, 1.4, C.INK, 0.3);
      // 張開的手
      [[-1], [1]].forEach(([k]) => {
        C.line(ctx, 36 + k * 18, 46, 36 + k * 32, 38, r, 3, '#3f9f5a', 0.3);
        C.blob(ctx, 36 + k * 33, 37, 3.4, 3.4, r, 0.12, 10); C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, 1.4);
      });
      [[30, 46, '#e8384f'], [44, 58, '#4f7cc2'], [28, 60, '#ffd23f'], [40, 40, '#f7a8c4']].forEach(([x, y, c]) => { dot(ctx, x, y, 2.2, c); });
    },
  };

  function drawCreature(ctx, kind) {
    const C = root.HQ_CRAYON;
    const f = DRAW[kind];
    if (!f) return;
    const seed = [...kind].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 5);
    ctx.save(); f(ctx, C, C.rng(seed)); ctx.restore();
  }
  root.HQ_CREATURES = { drawCreature, WIDTH: 72, HEIGHT: 80 };
})(this);
