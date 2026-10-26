// 野區的怪：職場怪（下班路上、打卡大樓）和台灣民間傳說的怪（廟口老街）
// 小怪畫在 96x84 裡（跟副本的怪一樣大），頭目畫在 120x100 裡，都是兩倍解析度，腳底在畫布下緣
(function (root) {
  const CR = root.HQ_CRAYON;
  const INK = CR.INK;

  function canvas(w, h, seed, draw) {
    const c = document.createElement('canvas');
    c.width = w * 2; c.height = h * 2;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    draw(ctx, CR.rng(seed));
    return c;
  }
  // 參考插畫家的畫法：柔和的霧面配色，色塊裡面有一筆一筆的亮色、暗色筆觸，像不透明水彩疊上去
  const hex = (c) => /^#[0-9a-f]{6}$/i.test(c) ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : null;
  const mix = (rgb, to, k, a) => `rgba(${rgb.map((v, i) => Math.round(v + (to[i] - v) * k)).join(',')},${a})`;
  const LIGHT = [255, 248, 230], DARK = [40, 44, 80];
  function fill(ctx, color, r, box, grain = 1) {
    const rgb = hex(color);
    ctx.save();
    ctx.fillStyle = color; ctx.fill();
    if (rgb) {
      ctx.clip();
      const [x, y, w, h] = box || [0, 0, 120, 100];
      if (box) {
        // 用 Path2D 畫，才不會蓋掉等一下要描邊的路徑
      // 右下暗一點、左上亮一點（平塗的色塊，不用漸層）
        ctx.fillStyle = mix(rgb, DARK, 0.28, 0.35);
        const sh = new Path2D(); sh.ellipse(x + w * 0.62, y + h * 1.02, w * 0.75, h * 0.42, -0.2, 0, Math.PI * 2); ctx.fill(sh);
        ctx.fillStyle = mix(rgb, LIGHT, 0.45, 0.4);
        const hi = new Path2D(); hi.ellipse(x + w * 0.3, y + h * 0.22, w * 0.26, h * 0.16, -0.5, 0, Math.PI * 2); ctx.fill(hi);
      }
      // 短短的筆觸
      const n = box ? Math.min(70, Math.round(w * h / 45)) : 40;
      ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const px = x + r() * w, py = y + r() * h, len = 2 + r() * 5, a = -0.6 + r() * 0.5;
        ctx.strokeStyle = r() < 0.55 ? mix(rgb, LIGHT, 0.4, 0.35) : mix(rgb, DARK, 0.25, 0.25);
        ctx.lineWidth = 0.8 + r() * 1.4;
        const st = new Path2D(); st.moveTo(px, py); st.quadraticCurveTo(px + len * 0.5, py - 1.2, px + Math.cos(a) * len, py + Math.sin(a) * len); ctx.stroke(st);
      }
      // 蠟筆顆粒
      if (grain > 0) for (let i = 0; i < Math.min(300, w * h / 35); i++) {
        ctx.fillStyle = r() < 0.5 ? 'rgba(255,250,235,0.22)' : 'rgba(40,30,50,0.07)';
        ctx.fillRect(x + r() * w, y + r() * h, 0.6 + r() * 1.4, 0.5 + r() * 0.6);
      }
    }
    ctx.restore();
  }
  // 燈火、燈籠周圍淡淡的光暈
  const glow = (ctx, x, y, rad, rgb) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${rgb},0.45)`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  };
  const dot = (ctx, x, y, rad, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); };
  const shadow = (ctx, cx, cy, rx) => {
    ctx.fillStyle = 'rgba(19,26,40,0.18)'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, 4, 0, 0, Math.PI * 2); ctx.fill();
  };
  // 圓圓的黑眼睛，帶一點反光
  const eye = (ctx, x, y, rad) => { rad *= 0.82; dot(ctx, x, y, rad, INK); dot(ctx, x - rad * 0.3, y - rad * 0.35, Math.max(0.5, rad * 0.24), 'rgba(255,250,235,0.9)'); };
  // 瞇瞇眼（彎彎的一條線）
  const squint = (ctx, r, x, y, w, up) => {
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y + (up ? -w : w) * 0.9, x + w, y); CR.stroke(ctx, r, 2);
  };
  const blush = (ctx, pts, rad = 3) => pts.forEach(([x, y]) => { ctx.fillStyle = 'rgba(226,120,120,0.4)'; ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.6, 0, 0, Math.PI * 2); ctx.fill(); });
  const smile = (ctx, r, x, y, w, k = 1) => { ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y + w * 0.8 * k, x + w, y); CR.stroke(ctx, r, 1.8); };
  // 小短腿＋鞋子
  const legs = (ctx, r, xs, y0, y1, shoe) => xs.forEach(x => {
    CR.line(ctx, x, y0, x, y1, r, 2.6, INK, 0.4);
    CR.blob(ctx, x + 1.5, y1 + 1, 5, 2.8, r, 0.08, 10); fill(ctx, shoe, r, null); CR.stroke(ctx, r, 1.8);
  });
  const arm = (ctx, r, x0, y0, x1, y1, hand) => {
    CR.line(ctx, x0, y0, x1, y1, r, 2.4, INK, 0.4);
    if (hand) { CR.blob(ctx, x1, y1, 3, 3, r, 0.1, 10); fill(ctx, hand, r, null); CR.stroke(ctx, r, 1.4); }
  };
  const text = (ctx, s, x, y, size, color, weight = 900) => {
    ctx.save(); ctx.fillStyle = color; ctx.font = `${weight} ${size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y); ctx.restore();
  };

  const DRAW = {
    // ---------- 下班路上 ----------
    // 便利貼精：一張黃色便利貼，右下角翹起來，後面還黏著粉紅、藍色兩張，上面寫著潦草的待辦
    sticky: () => canvas(96, 84, 201, (ctx, r) => {
      shadow(ctx, 48, 81, 22);
      legs(ctx, r, [40, 56], 66, 77, '#d9605a');
      // 後面兩張
      [['#8ec3c9', -0.22, -7, 4], ['#e9a0a8', 0.16, 7, 2]].forEach(([c, a, dx, dy]) => {
        ctx.save(); ctx.translate(48 + dx, 40 + dy); ctx.rotate(a);
        CR.rect(ctx, -22, -22, 44, 44, r, 1); fill(ctx, c, r, [-22, -22, 44, 44]); CR.stroke(ctx, r, 2.2);
        ctx.restore();
      });
      // 最前面的黃色那張，右下角翹起
      ctx.save(); ctx.translate(48, 42); ctx.rotate(-0.04);
      ctx.beginPath(); ctx.moveTo(-24, -24); ctx.lineTo(24, -24); ctx.lineTo(24, 12); ctx.lineTo(12, 24); ctx.lineTo(-24, 24); ctx.closePath();
      fill(ctx, '#f0c95a', r, [-24, -24, 48, 48], 1.2); CR.stroke(ctx, r, 2.6);
      ctx.beginPath(); ctx.moveTo(24, 12); ctx.quadraticCurveTo(15, 12, 12, 24); ctx.quadraticCurveTo(20, 20, 24, 12); ctx.closePath();
      fill(ctx, '#d9a845', r, null); CR.stroke(ctx, r, 1.8);
      // 頂端的黏膠條（顏色深一點）
      CR.rect(ctx, -23, -23, 46, 7, r, 0.4); ctx.fillStyle = 'rgba(242,180,40,0.35)'; ctx.fill();
      // 潦草的待辦
      [[-15, -10, 14], [-15, -4, 10]].forEach(([x, y, w]) => CR.line(ctx, x, y, x + w, y, r, 1.3, 'rgba(79,124,194,0.85)', 1.2));
      ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(9, -8); ctx.lineTo(16, -15); CR.stroke(ctx, r, 1.6, '#d9605a');
      // 臉
      eye(ctx, -8, 7, 2.6); eye(ctx, 8, 7, 2.6);
      blush(ctx, [[-14, 13], [14, 13]]);
      smile(ctx, r, 0, 13, 4);
      ctx.restore();
      // 兩隻小手：一隻舉起來揮
      arm(ctx, r, 20, 50, 10, 40, '#f0c95a');
      arm(ctx, r, 76, 40, 86, 32, '#f0c95a');
    }),

    // 已讀飄飄：一個白白的對話泡泡，下面拖著飄飄的尾巴，睡眼惺忪，角落寫著「已讀」
    seen: () => canvas(96, 84, 202, (ctx, r) => {
      shadow(ctx, 48, 81, 16);
      // 泡泡身體＋飄飄的尾巴
      ctx.beginPath();
      ctx.moveTo(20, 44);
      ctx.quadraticCurveTo(18, 14, 48, 12); ctx.quadraticCurveTo(78, 14, 76, 44);
      ctx.quadraticCurveTo(76, 58, 64, 62);
      ctx.quadraticCurveTo(62, 70, 54, 74); ctx.quadraticCurveTo(56, 68, 50, 64);
      ctx.quadraticCurveTo(44, 70, 36, 68); ctx.quadraticCurveTo(40, 64, 34, 62);
      ctx.quadraticCurveTo(20, 58, 20, 44); ctx.closePath();
      fill(ctx, '#f8f1e4', r, [18, 12, 60, 62], 1); CR.stroke(ctx, r, 2.6);
      // 底部淡淡的陰影
      CR.blob(ctx, 48, 60, 16, 3, r, 0.1); ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#dfe6f0'; ctx.fill(); ctx.restore();
      // 半睜半閉的眼睛
      [[38, 36], [58, 36]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI); ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
        CR.line(ctx, x - 5, y, x + 5, y, r, 2.2, INK, 0.3);
      });
      // 嘟嘴
      CR.blob(ctx, 48, 46, 2.4, 1.8, r, 0.1, 10); fill(ctx, '#d9605a', r, null);
      // 兩個藍色勾勾＋「已讀」
      [[60, 56], [65, 56]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y + 2.5); ctx.lineTo(x + 6, y - 2.5); CR.stroke(ctx, r, 1.6, '#4b7fa3'); });
      text(ctx, '已讀', 36, 56, 7, 'rgba(110,118,132,0.9)', 700);
      // 飄動的小線條
      [[12, 30], [84, 38], [80, 22]].forEach(([x, y]) => CR.line(ctx, x, y, x + (x < 48 ? -4 : 4), y + 6, r, 1.4, 'rgba(110,118,132,0.6)', 0.4));
    }),

    // 甩鍋鍋：一支黑色小炒鍋，木頭把手當手臂，正要把另一支小鍋子丟出去，嘴裡嘻嘻笑
    wok: () => canvas(96, 84, 203, (ctx, r) => {
      shadow(ctx, 44, 81, 24);
      legs(ctx, r, [36, 52], 64, 77, '#5d6b80');
      // 鍋身（側面看是半圓碗）
      ctx.beginPath(); ctx.moveTo(14, 36); ctx.quadraticCurveTo(16, 68, 44, 68); ctx.quadraticCurveTo(72, 68, 74, 36); ctx.closePath();
      fill(ctx, '#3c3f5c', r, [14, 36, 60, 32], 1.2); CR.stroke(ctx, r, 2.6);
      // 鍋口
      CR.blob(ctx, 44, 36, 31, 6, r, 0.04, 20); fill(ctx, '#5d6b80', r, null); CR.stroke(ctx, r, 2.4);
      CR.blob(ctx, 44, 37, 25, 3.6, r, 0.06, 16); ctx.fillStyle = '#2b2a33'; ctx.fill();
      // 鍋子上的亮光
      ctx.beginPath(); ctx.arc(30, 52, 10, Math.PI * 0.75, Math.PI * 1.05); CR.stroke(ctx, r, 2, 'rgba(255,255,255,0.45)');
      // 臉（白白的，畫在鍋身上）
      [[34, 50], [54, 50]].forEach(([x, y]) => { dot(ctx, x, y, 4.2, '#f8f1e4'); eye(ctx, x + 1, y + 0.5, 2.2); });
      ctx.beginPath(); ctx.moveTo(38, 58); ctx.quadraticCurveTo(44, 64, 50, 58); ctx.closePath(); ctx.fillStyle = '#f8f1e4'; ctx.fill(); CR.stroke(ctx, r, 1.4, '#f8f1e4');
      blush(ctx, [[26, 57], [62, 57]], 3.2);
      // 冒汗
      ctx.beginPath(); ctx.moveTo(70, 44); ctx.quadraticCurveTo(66, 50, 70, 52); ctx.quadraticCurveTo(74, 50, 70, 44); ctx.closePath();
      fill(ctx, '#8ec3c9', r, null); CR.stroke(ctx, r, 1.2);
      // 木頭把手往右上伸，抓著另一支小鍋子要丟出去
      ctx.save(); ctx.translate(72, 40); ctx.rotate(-0.55);
      CR.rect(ctx, 0, -3.5, 22, 7, r, 0.6); fill(ctx, '#b07a4a', r, null); CR.stroke(ctx, r, 2);
      ctx.restore();
      ctx.save(); ctx.translate(80, 22); ctx.rotate(0.6);
      ctx.beginPath(); ctx.moveTo(-9, -2); ctx.quadraticCurveTo(-8, 8, 0, 8); ctx.quadraticCurveTo(8, 8, 9, -2); ctx.closePath();
      fill(ctx, '#3c3f5c', r, null); CR.stroke(ctx, r, 2);
      CR.line(ctx, 9, -2, 15, -6, r, 2.4, '#b07a4a', 0.3);
      ctx.restore();
      // 丟出去的動作線
      [[70, 10], [76, 6]].forEach(([x, y]) => CR.line(ctx, x, y, x - 6, y + 4, r, 1.4, 'rgba(110,118,132,0.6)', 0.4));
      // 左手揮揮（不是我喔）
      arm(ctx, r, 16, 46, 6, 38, '#f8f1e4');
    }),

    // ---------- 打卡大樓 ----------
    // 會議章魚：紫色章魚戴著眼鏡、打領帶，觸手拿著筆電、咖啡、雷射筆
    octo: () => canvas(96, 84, 204, (ctx, r) => {
      shadow(ctx, 48, 81, 28);
      const body = '#a493c9';
      // 觸手（底下一圈）
      for (let i = 0; i < 6; i++) {
        const k = (i - 2.5) / 2.5;
        ctx.beginPath(); ctx.moveTo(48 + k * 12, 58); ctx.quadraticCurveTo(48 + k * 22, 70, 48 + k * 26 + k * 4, 77 - Math.abs(k) * 2);
        CR.stroke(ctx, r, 7.6, INK); CR.stroke(ctx, r, 5, body);
      }
      // 拿東西的三隻觸手
      [[30, 50, 14, 40], [66, 50, 82, 42], [62, 54, 80, 62]].forEach(([x0, y0, x1, y1]) => {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, y1 + 8, x1, y1);
        CR.stroke(ctx, r, 7, INK); CR.stroke(ctx, r, 4.6, body);
      });
      // 頭
      CR.blob(ctx, 48, 38, 24, 23, r, 0.04, 20); fill(ctx, body, r, [24, 15, 48, 46], 1); CR.stroke(ctx, r, 2.6);
      [[38, 20, 4], [58, 24, 3], [52, 16, 2.4]].forEach(([x, y, s]) => dot(ctx, x, y, s, 'rgba(255,255,255,0.35)'));
      // 圓眼鏡
      [[39, 40], [57, 40]].forEach(([x, y]) => {
        dot(ctx, x, y, 6.6, 'rgba(255,255,255,0.7)'); ctx.beginPath(); ctx.arc(x, y, 6.6, 0, Math.PI * 2); CR.stroke(ctx, r, 1.8);
        eye(ctx, x, y + 0.5, 2.4);
      });
      CR.line(ctx, 45.6, 40, 50.4, 40, r, 1.6, INK, 0.2);
      smile(ctx, r, 48, 50, 3.6);
      // 領帶
      ctx.beginPath(); ctx.moveTo(45, 58); ctx.lineTo(51, 58); ctx.lineTo(53, 70); ctx.lineTo(48, 74); ctx.lineTo(43, 70); ctx.closePath();
      fill(ctx, '#d9605a', r, null); CR.stroke(ctx, r, 1.8);
      // 筆電（左）
      ctx.save(); ctx.translate(12, 36); ctx.rotate(-0.2);
      CR.rect(ctx, -10, -9, 20, 13, r, 0.5); fill(ctx, '#c3c8cf', r, null); CR.stroke(ctx, r, 1.8);
      CR.rect(ctx, -8, -7, 16, 9, r, 0.3); fill(ctx, '#8ec3c9', r, null);
      // 螢幕上的長條圖
      [[-5, 3], [-1, 5], [3, 7]].forEach(([x, h]) => { ctx.fillStyle = '#4b7fa3'; ctx.fillRect(x, 1 - h, 2.4, h); });
      ctx.restore();
      // 咖啡（右上）
      CR.rect(ctx, 78, 32, 9, 11, r, 0.5); fill(ctx, '#f8f1e4', r, null); CR.stroke(ctx, r, 1.8);
      CR.rect(ctx, 78, 36, 9, 3, r, 0.3); ctx.fillStyle = '#b07a4a'; ctx.fill();
      [[80, 28], [84, 26]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.quadraticCurveTo(x + 2, y, x, y - 3); CR.stroke(ctx, r, 1.2, 'rgba(110,118,132,0.7)'); });
      // 雷射筆（右下）
      CR.line(ctx, 78, 62, 90, 58, r, 2.6, '#5d6b80', 0.3);
      dot(ctx, 91, 57.6, 1.8, '#d9605a');
    }),

    // 加班鬧鐘：紅色的雙鈴鬧鐘，指針停在快十一點，黑眼圈很重，鈴鐺還在響
    clock: () => canvas(96, 84, 205, (ctx, r) => {
      shadow(ctx, 48, 81, 22);
      legs(ctx, r, [36, 60], 66, 77, '#2b2a33');
      // 鈴鐺和中間的小槌
      [[30, 16, -0.5], [66, 16, 0.5]].forEach(([x, y, a]) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.beginPath(); ctx.arc(0, 2, 10, Math.PI, 0); ctx.closePath();
        fill(ctx, '#e9b949', r, null); CR.stroke(ctx, r, 2.2);
        ctx.restore();
      });
      CR.line(ctx, 48, 12, 48, 20, r, 2.4, INK, 0.2); dot(ctx, 48, 11, 2.6, INK);
      // 鬧鐘本體
      CR.blob(ctx, 48, 44, 26, 25, r, 0.03, 22); fill(ctx, '#d9605a', r, [22, 19, 52, 50], 1.2); CR.stroke(ctx, r, 2.8);
      CR.blob(ctx, 48, 44, 20, 19, r, 0.03, 20); fill(ctx, '#f8f1e4', r, null); CR.stroke(ctx, r, 1.8);
      // 刻度
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, rr = i % 3 ? 16.5 : 15;
        CR.line(ctx, 48 + Math.cos(a) * rr, 44 + Math.sin(a) * rr, 48 + Math.cos(a) * 18, 44 + Math.sin(a) * 18, r, i % 3 ? 1 : 1.6, INK, 0.1);
      }
      // 指針：10:55
      CR.line(ctx, 48, 44, 40, 37, r, 2.2, INK, 0.2); CR.line(ctx, 48, 44, 46, 30, r, 1.6, INK, 0.2);
      dot(ctx, 48, 44, 1.6, INK);
      // 累累的臉（畫在鐘面下半）：黑眼圈、下垂的眼睛
      [[40, 50], [56, 50]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y + 1.5, 4, Math.PI * 0.15, Math.PI * 0.85); CR.stroke(ctx, r, 1.6, 'rgba(138,92,214,0.7)');
        eye(ctx, x, y - 0.5, 2);
        CR.line(ctx, x - 3.5, y - 4, x + 3.5, y - 3, r, 1.4, INK, 0.2);
      });
      ctx.beginPath(); ctx.moveTo(44, 58); ctx.quadraticCurveTo(48, 55, 52, 58); CR.stroke(ctx, r, 1.6);
      // 鈴聲
      [[14, 10, -1], [82, 10, 1]].forEach(([x, y, k]) => {
        [0, 6].forEach(d => { ctx.beginPath(); ctx.arc(x - k * d, y + 8, 8 + d, k > 0 ? -Math.PI * 0.4 : Math.PI * 1.1, k > 0 ? -Math.PI * 0.1 : Math.PI * 1.4); CR.stroke(ctx, r, 1.4, 'rgba(232,56,79,0.7)'); });
      });
      // 兩隻小手抓著頭（崩潰）
      arm(ctx, r, 22, 48, 16, 36, '#f8f1e4');
      arm(ctx, r, 74, 48, 80, 36, '#f8f1e4');
    }),

    // 急件老闆（頭目）：圓滾滾的老闆，頭頂一撮毛、八字鬍、吊帶褲，抱著一疊蓋了「急件」紅章的卷宗
    boss: () => canvas(120, 100, 206, (ctx, r) => {
      shadow(ctx, 60, 96, 36);
      legs(ctx, r, [48, 72], 82, 92, '#2b2a33');
      // 西裝外套（蛋形身體）
      CR.blob(ctx, 60, 62, 32, 26, r, 0.03, 24); fill(ctx, '#34405e', r, [28, 36, 64, 52], 1.2); CR.stroke(ctx, r, 2.8);
      // 白襯衫＋領帶
      ctx.beginPath(); ctx.moveTo(50, 40); ctx.lineTo(70, 40); ctx.lineTo(64, 76); ctx.lineTo(56, 76); ctx.closePath(); fill(ctx, '#f8f1e4', r, null); CR.stroke(ctx, r, 1.8);
      ctx.beginPath(); ctx.moveTo(57, 42); ctx.lineTo(63, 42); ctx.lineTo(65, 62); ctx.lineTo(60, 68); ctx.lineTo(55, 62); ctx.closePath(); fill(ctx, '#d9605a', r, null); CR.stroke(ctx, r, 1.6);
      // 頭
      CR.blob(ctx, 60, 28, 20, 18, r, 0.03, 20); fill(ctx, '#f0c9a8', r, [40, 10, 40, 36], 0.8); CR.stroke(ctx, r, 2.6);
      // 頭頂一撮毛、兩邊的頭髮
      ctx.beginPath(); ctx.moveTo(58, 11); ctx.quadraticCurveTo(54, 2, 62, 3); ctx.quadraticCurveTo(58, 6, 61, 11); CR.stroke(ctx, r, 2.4);
      [[41, 26, -1], [79, 26, 1]].forEach(([x, y, k]) => { CR.blob(ctx, x, y, 4, 7, r, 0.1, 12); fill(ctx, '#5d6b80', r, null); CR.stroke(ctx, r, 1.6); });
      // 認真的眉毛＋小眼睛
      CR.line(ctx, 48, 22, 56, 24, r, 2.6); CR.line(ctx, 72, 22, 64, 24, r, 2.6);
      eye(ctx, 53, 28, 2.2); eye(ctx, 67, 28, 2.2);
      blush(ctx, [[46, 34], [74, 34]], 3.4);
      // 八字鬍
      ctx.beginPath(); ctx.moveTo(60, 35); ctx.quadraticCurveTo(52, 32, 47, 38); ctx.quadraticCurveTo(54, 37, 60, 38);
      ctx.quadraticCurveTo(66, 37, 73, 38); ctx.quadraticCurveTo(68, 32, 60, 35); ctx.closePath(); fill(ctx, '#3c3f5c', r, null); CR.stroke(ctx, r, 1.4);
      smile(ctx, r, 60, 41, 3, 0.6);
      // 抱著的一疊卷宗
      ctx.save(); ctx.translate(30, 62); ctx.rotate(-0.12);
      ['#e8cf8a', '#8ec3c9', '#e9a0a8', '#e8cf8a'].forEach((c, i) => {
        CR.rect(ctx, -16 + (i % 2) * 2, -12 - i * 5, 30, 6, r, 0.6); fill(ctx, c, r, null); CR.stroke(ctx, r, 1.6);
      });
      CR.rect(ctx, -16, -8, 30, 18, r, 0.8); fill(ctx, '#e8cf8a', r, null); CR.stroke(ctx, r, 2);
      // 紅色「急件」章
      ctx.save(); ctx.rotate(-0.2);
      CR.rect(ctx, -10, -5, 18, 11, r, 0.6); CR.stroke(ctx, r, 1.6, '#d9605a');
      text(ctx, '急件', -1, 0.6, 7.5, '#d9605a');
      ctx.restore();
      ctx.restore();
      // 手抱住卷宗、另一隻手指著前面
      arm(ctx, r, 38, 70, 45, 72, '#f0c9a8');
      arm(ctx, r, 86, 54, 102, 44, '#f0c9a8');
      CR.line(ctx, 103, 43, 109, 40, r, 2, INK, 0.2);
      // 西裝口袋的手帕
      ctx.beginPath(); ctx.moveTo(74, 52); ctx.lineTo(82, 52); ctx.lineTo(78, 46); ctx.closePath(); fill(ctx, '#e9b949', r, null); CR.stroke(ctx, r, 1.2);
    }),

    // ---------- 廟口老街 ----------
    // 燈猴：傳說中幫人間點燈的小猴子，身體是一盞紅燈籠，頭上頂著一小簇燈火，捲捲的尾巴
    monkey: () => canvas(96, 84, 207, (ctx, r) => {
      shadow(ctx, 48, 81, 20);
      glow(ctx, 48, 54, 34, '240,190,110'); glow(ctx, 48, 7, 7, '240,190,110'); glow(ctx, 16, 32, 12, '240,190,110');
      legs(ctx, r, [40, 56], 68, 77, '#8a5f45');
      // 尾巴捲起來
      ctx.beginPath(); ctx.moveTo(66, 62); ctx.quadraticCurveTo(84, 66, 82, 50); ctx.quadraticCurveTo(80, 40, 72, 44); ctx.quadraticCurveTo(76, 48, 74, 52);
      CR.stroke(ctx, r, 5, INK); CR.stroke(ctx, r, 3, '#b07a4a');
      // 燈籠身體
      CR.rect(ctx, 38, 34, 20, 4, r, 0.4); fill(ctx, '#e9b949', r, null); CR.stroke(ctx, r, 1.6);
      CR.blob(ctx, 48, 54, 18, 15, r, 0.03, 20); fill(ctx, '#d9605a', r, [30, 39, 36, 30], 1.2); CR.stroke(ctx, r, 2.6);
      [-9, 0, 9].forEach(dx => { ctx.beginPath(); ctx.moveTo(48 + dx, 40); ctx.quadraticCurveTo(48 + dx * 1.7, 54, 48 + dx, 68); CR.stroke(ctx, r, 1.2, 'rgba(43,42,51,0.45)'); });
      CR.rect(ctx, 39, 67, 18, 4, r, 0.4); fill(ctx, '#e9b949', r, null); CR.stroke(ctx, r, 1.6);
      // 燈籠裡透出來的光
      CR.blob(ctx, 48, 54, 7, 6, r, 0.1, 12); ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#e9b949'; ctx.fill(); ctx.restore();
      text(ctx, '福', 48, 55, 9, '#e9b949');
      // 頭：咖啡色毛，肉色的臉，大耳朵
      [[30, 24], [66, 24]].forEach(([x, y]) => { CR.blob(ctx, x, y, 6, 6.5, r, 0.06, 12); fill(ctx, '#b07a4a', r, null); CR.stroke(ctx, r, 2); dot(ctx, x, y, 3, '#efc6a6'); });
      CR.blob(ctx, 48, 23, 17, 15, r, 0.04, 18); fill(ctx, '#b07a4a', r, [31, 8, 34, 30], 1); CR.stroke(ctx, r, 2.6);
      ctx.beginPath(); ctx.moveTo(36, 24); ctx.quadraticCurveTo(36, 14, 44, 16); ctx.quadraticCurveTo(48, 12, 52, 16); ctx.quadraticCurveTo(60, 14, 60, 24);
      ctx.quadraticCurveTo(60, 34, 48, 35); ctx.quadraticCurveTo(36, 34, 36, 24); ctx.closePath(); fill(ctx, '#efc6a6', r, null); CR.stroke(ctx, r, 1.6);
      eye(ctx, 43, 22, 2.4); eye(ctx, 53, 22, 2.4);
      blush(ctx, [[39, 28], [57, 28]], 2.6);
      smile(ctx, r, 48, 29, 3.4);
      // 頭頂的小燈火
      ctx.beginPath(); ctx.moveTo(48, 1); ctx.quadraticCurveTo(54, 6, 52, 9); ctx.quadraticCurveTo(48, 12, 44, 9); ctx.quadraticCurveTo(42, 6, 48, 1); ctx.closePath();
      fill(ctx, '#f0a24a', r, null); CR.stroke(ctx, r, 1.6);
      ctx.beginPath(); ctx.moveTo(48, 4); ctx.quadraticCurveTo(51, 8, 48, 10); ctx.quadraticCurveTo(45, 8, 48, 4); ctx.closePath(); ctx.fillStyle = '#fff2a8'; ctx.fill();
      // 一手舉著小油燈
      arm(ctx, r, 31, 50, 18, 40, '#efc6a6');
      CR.blob(ctx, 16, 36, 6, 3, r, 0.08, 10); fill(ctx, '#c49a4a', r, null); CR.stroke(ctx, r, 1.4);
      ctx.beginPath(); ctx.moveTo(16, 26); ctx.quadraticCurveTo(20, 31, 18, 33); ctx.quadraticCurveTo(16, 35, 14, 33); ctx.quadraticCurveTo(12, 31, 16, 26); ctx.closePath();
      fill(ctx, '#f0a24a', r, null); CR.stroke(ctx, r, 1.2);
      arm(ctx, r, 65, 52, 72, 60, '#efc6a6');
    }),

    // 石獅仔：廟口的小石獅，捲捲的鬃毛、脖子繫紅彩，腳下踩著一顆繡球，嘴巴張開含著一顆小石珠
    lion: () => canvas(96, 84, 208, (ctx, r) => {
      shadow(ctx, 48, 81, 26);
      const stone = '#a9bfb4', dark = '#8aa39a';
      // 底座
      CR.rect(ctx, 22, 70, 52, 9, r, 0.8); fill(ctx, '#93a0ac', r, [22, 70, 52, 9]); CR.stroke(ctx, r, 2.2);
      // 身體（坐著）
      CR.blob(ctx, 50, 56, 22, 16, r, 0.05, 18); fill(ctx, stone, r, [28, 40, 44, 32], 1.2); CR.stroke(ctx, r, 2.4);
      // 尾巴（捲捲的一團）
      [[74, 46, 5], [78, 40, 4], [74, 36, 3.4]].forEach(([x, y, s]) => { CR.blob(ctx, x, y, s, s, r, 0.1, 10); fill(ctx, dark, r, null); CR.stroke(ctx, r, 1.6); });
      // 繡球
      CR.blob(ctx, 28, 64, 8, 8, r, 0.05, 14); fill(ctx, '#d9605a', r, null); CR.stroke(ctx, r, 2);
      CR.line(ctx, 21, 62, 35, 66, r, 1.2, '#e9b949', 0.4); CR.line(ctx, 26, 57, 30, 71, r, 1.2, '#e9b949', 0.4);
      // 前腳踩著繡球
      CR.rect(ctx, 32, 54, 8, 16, r, 0.6); fill(ctx, stone, r, null); CR.stroke(ctx, r, 2);
      CR.blob(ctx, 34, 56, 6, 4, r, 0.08, 10); fill(ctx, stone, r, null); CR.stroke(ctx, r, 1.8);
      CR.rect(ctx, 56, 58, 8, 13, r, 0.6); fill(ctx, stone, r, null); CR.stroke(ctx, r, 2);
      // 鬃毛：一圈捲捲
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x = 48 + Math.cos(a) * 18, y = 28 + Math.sin(a) * 16;
        CR.blob(ctx, x, y, 6, 6, r, 0.1, 10); fill(ctx, dark, r, null); CR.stroke(ctx, r, 1.8);
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 1.5); CR.stroke(ctx, r, 1, 'rgba(43,42,51,0.5)');
      }
      // 臉
      CR.blob(ctx, 48, 28, 16, 14, r, 0.05, 18); fill(ctx, stone, r, [32, 14, 32, 28], 1); CR.stroke(ctx, r, 2.4);
      // 大眼睛（突出來的）＋粗眉
      [[41, 24], [55, 24]].forEach(([x, y]) => {
        dot(ctx, x, y, 4.6, '#f8f1e4'); ctx.beginPath(); ctx.arc(x, y, 4.6, 0, Math.PI * 2); CR.stroke(ctx, r, 1.6);
        eye(ctx, x + 0.5, y + 0.5, 2.4);
        ctx.beginPath(); ctx.arc(x, y - 4, 5, Math.PI * 1.15, Math.PI * 1.85); CR.stroke(ctx, r, 2.2);
      });
      // 圓鼻子
      CR.blob(ctx, 48, 31, 4.6, 3, r, 0.08, 12); fill(ctx, dark, r, null); CR.stroke(ctx, r, 1.6);
      // 張開的嘴含著石珠
      ctx.beginPath(); ctx.moveTo(41, 35); ctx.quadraticCurveTo(48, 44, 55, 35); ctx.closePath(); fill(ctx, '#d98a8a', r, null); CR.stroke(ctx, r, 1.8);
      dot(ctx, 48, 38.5, 2.6, '#f8f1e4'); ctx.beginPath(); ctx.arc(48, 38.5, 2.6, 0, Math.PI * 2); CR.stroke(ctx, r, 1);
      blush(ctx, [[36, 32], [60, 32]], 2.8);
      // 脖子上的紅彩＋鈴鐺
      ctx.beginPath(); ctx.moveTo(32, 42); ctx.quadraticCurveTo(48, 50, 64, 42); ctx.lineTo(64, 46); ctx.quadraticCurveTo(48, 54, 32, 46); ctx.closePath();
      fill(ctx, '#d9605a', r, null); CR.stroke(ctx, r, 1.6);
      dot(ctx, 48, 51, 3.2, '#e9b949'); ctx.beginPath(); ctx.arc(48, 51, 3.2, 0, Math.PI * 2); CR.stroke(ctx, r, 1.2);
    }),

    // 小魔神仔：山裡愛惡作劇的小傢伙，紅紅的臉、頭戴一片大姑婆芋葉當帽子，手上拿著雞腿要騙你跟他走
    imp: () => canvas(96, 84, 209, (ctx, r) => {
      shadow(ctx, 46, 81, 18);
      // 赤腳（腳尖朝後，偷偷的傳說小細節）
      [[40, 66], [52, 66]].forEach(([x, y]) => {
        CR.line(ctx, x, y, x, 76, r, 2.6, INK, 0.3);
        CR.blob(ctx, x - 2, 77.5, 4.4, 2.4, r, 0.08, 10); fill(ctx, '#d9785a', r, null); CR.stroke(ctx, r, 1.6);
      });
      // 草編小衣服
      ctx.beginPath(); ctx.moveTo(34, 46); ctx.lineTo(58, 46); ctx.lineTo(62, 68); ctx.lineTo(30, 68); ctx.closePath();
      fill(ctx, '#93b57f', r, [30, 46, 32, 22], 1.2); CR.stroke(ctx, r, 2.4);
      [36, 42, 48, 54].forEach(x => CR.line(ctx, x, 60, x + 1, 68, r, 1.2, 'rgba(43,42,51,0.5)', 0.4));
      // 頭：紅紅的臉
      CR.blob(ctx, 46, 34, 14, 13, r, 0.05, 18); fill(ctx, '#df8a6a', r, [32, 21, 28, 26], 1); CR.stroke(ctx, r, 2.4);
      // 尖尖的耳朵
      [[31, 32, -1], [61, 32, 1]].forEach(([x, y, k]) => {
        ctx.beginPath(); ctx.moveTo(x - k * 1, y - 4); ctx.lineTo(x + k * 7, y - 7); ctx.lineTo(x - k * 1, y + 4); ctx.closePath(); fill(ctx, '#df8a6a', r, null); CR.stroke(ctx, r, 1.8);
      });
      // 調皮的眼睛（一隻眨眼）＋壞笑
      eye(ctx, 40, 34, 2.6);
      squint(ctx, r, 52, 34, 3, true);
      ctx.beginPath(); ctx.moveTo(40, 40); ctx.quadraticCurveTo(47, 46, 53, 39); CR.stroke(ctx, r, 1.8);
      ctx.beginPath(); ctx.moveTo(44, 42.4); ctx.lineTo(45.5, 44.6); ctx.lineTo(47, 42.8); ctx.closePath(); ctx.fillStyle = '#f8f1e4'; ctx.fill();
      blush(ctx, [[36, 39], [56, 39]], 2.8);
      // 頭上的大葉子帽
      ctx.save(); ctx.translate(46, 20); ctx.rotate(-0.12);
      ctx.beginPath(); ctx.moveTo(-26, 4); ctx.quadraticCurveTo(-20, -16, 0, -16); ctx.quadraticCurveTo(22, -16, 26, 2); ctx.quadraticCurveTo(14, -2, 0, 2); ctx.quadraticCurveTo(-14, -2, -26, 4); ctx.closePath();
      fill(ctx, '#4f9a7a', r, [-26, -16, 52, 20], 1.2); CR.stroke(ctx, r, 2.4);
      CR.line(ctx, -20, 0, 18, -6, r, 1.4, '#33735c', 0.6);
      [-10, 0, 10].forEach(x => CR.line(ctx, x, -3, x + 4, -12, r, 1, '#33735c', 0.5));
      CR.line(ctx, 24, 0, 30, 6, r, 2, '#33735c', 0.3); // 葉柄
      ctx.restore();
      // 一手拿雞腿招手，一手藏在背後
      arm(ctx, r, 58, 50, 72, 44, '#df8a6a');
      ctx.save(); ctx.translate(78, 38); ctx.rotate(-0.6);
      CR.blob(ctx, 0, 0, 7, 5.4, r, 0.1, 12); fill(ctx, '#c98a4a', r, null); CR.stroke(ctx, r, 1.8);
      CR.line(ctx, -6, 3, -11, 6, r, 2.4, '#f8f1e4', 0.2);
      dot(ctx, -12, 6.5, 2, '#f8f1e4');
      ctx.restore();
      arm(ctx, r, 34, 50, 28, 58, '#df8a6a');
      // 「來～」的小波浪
      [[84, 26], [88, 30]].forEach(([x, y]) => CR.line(ctx, x, y, x + 4, y - 3, r, 1.2, 'rgba(110,118,132,0.6)', 0.4));
    }),

    // 虎姑婆婆（頭目）：橘色老虎奶奶，頭上包髮髻插髮簪，戴圓眼鏡、披碎花披肩，提著一籃糖果，尾巴有條紋
    tiger: () => canvas(120, 100, 210, (ctx, r) => {
      shadow(ctx, 60, 96, 34);
      const fur = '#ec9a52', stripe = '#8a4a1a';
      // 尾巴
      ctx.beginPath(); ctx.moveTo(84, 82); ctx.quadraticCurveTo(110, 84, 108, 62); ctx.quadraticCurveTo(106, 52, 100, 56);
      CR.stroke(ctx, r, 7.4, INK); CR.stroke(ctx, r, 5, fur);
      [[104, 76], [108, 66]].forEach(([x, y]) => CR.line(ctx, x - 3, y, x + 3, y - 1, r, 2, stripe, 0.3));
      legs(ctx, r, [50, 70], 84, 92, '#2b2a33');
      // 長裙＋碎花披肩
      ctx.beginPath(); ctx.moveTo(42, 50); ctx.quadraticCurveTo(34, 76, 36, 88); ctx.lineTo(84, 88); ctx.quadraticCurveTo(86, 76, 78, 50); ctx.closePath();
      fill(ctx, '#6f5f9e', r, [34, 50, 52, 38], 1.2); CR.stroke(ctx, r, 2.6);
      ctx.beginPath(); ctx.moveTo(38, 52); ctx.quadraticCurveTo(60, 74, 82, 52); ctx.quadraticCurveTo(76, 44, 60, 44); ctx.quadraticCurveTo(44, 44, 38, 52); ctx.closePath();
      fill(ctx, '#e9a0a8', r, [38, 44, 44, 24], 0.8); CR.stroke(ctx, r, 2);
      [[46, 52], [56, 58], [66, 56], [74, 51], [60, 49]].forEach(([x, y]) => {
        [0, 1, 2, 3, 4].forEach(i => { const a = i / 5 * Math.PI * 2; dot(ctx, x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8, 1.2, '#f8f1e4'); });
        dot(ctx, x, y, 1, '#e9b949');
      });
      // 頭：老虎臉
      [[44, 14], [76, 14]].forEach(([x, y]) => { CR.blob(ctx, x, y, 6, 6, r, 0.06, 12); fill(ctx, fur, r, null); CR.stroke(ctx, r, 2); dot(ctx, x, y + 1, 2.8, '#f7c8a8'); });
      CR.blob(ctx, 60, 28, 21, 18, r, 0.04, 22); fill(ctx, fur, r, [39, 10, 42, 36], 1); CR.stroke(ctx, r, 2.6);
      // 額頭的「王」字條紋＋臉頰條紋
      [[54, 15, 66, 15], [55, 19, 65, 19], [60, 13, 60, 22]].forEach(([a, b, c, d]) => CR.line(ctx, a, b, c, d, r, 1.8, stripe, 0.3));
      [[40, 26, 46, 27], [40, 31, 46, 31], [80, 26, 74, 27], [80, 31, 74, 31]].forEach(([a, b, c, d]) => CR.line(ctx, a, b, c, d, r, 1.8, stripe, 0.3));
      // 白白的嘴巴周圍
      CR.blob(ctx, 60, 36, 10, 7, r, 0.06, 14); fill(ctx, '#fbf3e4', r, null); CR.stroke(ctx, r, 1.4);
      CR.blob(ctx, 60, 32.5, 3, 2, r, 0.1, 10); fill(ctx, '#df8a6a', r, null); CR.stroke(ctx, r, 1.2);
      ctx.beginPath(); ctx.moveTo(56, 38); ctx.quadraticCurveTo(58, 40, 60, 37.5); ctx.quadraticCurveTo(62, 40, 64, 38); CR.stroke(ctx, r, 1.4);
      // 圓眼鏡（瞇瞇笑的眼睛）
      [[51, 27], [69, 27]].forEach(([x, y]) => {
        dot(ctx, x, y, 6, 'rgba(255,255,255,0.55)'); ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); CR.stroke(ctx, r, 1.6, '#c49a4a');
        squint(ctx, r, x, y + 1, 3, true);
      });
      CR.line(ctx, 57, 27, 63, 27, r, 1.4, '#c49a4a', 0.2);
      blush(ctx, [[46, 35], [74, 35]], 3);
      // 髮髻＋髮簪
      CR.blob(ctx, 60, 8, 10, 6, r, 0.06, 14); fill(ctx, '#d8d2c8', r, null); CR.stroke(ctx, r, 2.2);
      ctx.beginPath(); ctx.arc(60, 8, 3.4, 0, Math.PI * 1.6); CR.stroke(ctx, r, 1.2, 'rgba(43,42,51,0.5)');
      CR.line(ctx, 47, 5, 74, 12, r, 2.2, '#c49a4a', 0.2);
      dot(ctx, 75, 12.4, 2.4, '#d9605a');
      // 一手提糖果籃
      arm(ctx, r, 40, 56, 26, 66, '#ec9a52');
      ctx.beginPath(); ctx.moveTo(14, 66); ctx.quadraticCurveTo(26, 52, 36, 66); CR.stroke(ctx, r, 2, '#b07a4a');
      ctx.beginPath(); ctx.moveTo(12, 66); ctx.lineTo(38, 66); ctx.lineTo(34, 80); ctx.lineTo(16, 80); ctx.closePath();
      fill(ctx, '#d9a066', r, [12, 66, 26, 14], 1); CR.stroke(ctx, r, 2);
      [16, 22, 28, 34].forEach(x => CR.line(ctx, x, 67, x - 1, 79, r, 1, 'rgba(138,90,58,0.6)', 0.3));
      // 籃子裡冒出來的糖果（包糖果紙的那種）
      [[19, 63, '#d9605a'], [27, 61, '#4b7fa3'], [33, 64, '#e9b949']].forEach(([x, y, c]) => {
        CR.blob(ctx, x, y, 3.4, 2.6, r, 0.08, 10); fill(ctx, c, r, null); CR.stroke(ctx, r, 1.2);
        [[-1], [1]].forEach(([k]) => { ctx.beginPath(); ctx.moveTo(x + k * 3.2, y); ctx.lineTo(x + k * 6, y - 2); ctx.lineTo(x + k * 6, y + 2); ctx.closePath(); fill(ctx, c, r, null); CR.stroke(ctx, r, 1); });
      });
      // 另一手招招手，手上拿一顆糖
      arm(ctx, r, 80, 56, 94, 44, '#ec9a52');
      CR.blob(ctx, 98, 40, 3.4, 2.6, r, 0.08, 10); fill(ctx, '#8cc3a0', r, null); CR.stroke(ctx, r, 1.2);
      [[-1], [1]].forEach(([k]) => { ctx.beginPath(); ctx.moveTo(98 + k * 3.2, 40); ctx.lineTo(98 + k * 6, 38); ctx.lineTo(98 + k * 6, 42); ctx.closePath(); fill(ctx, '#8cc3a0', r, null); CR.stroke(ctx, r, 1); });
    }),
  };

  // 名字（跟 shared/stats.js 的 MOBS 對應）
  const NAMES = { sticky: '便利貼精', seen: '已讀飄飄', wok: '甩鍋鍋', octo: '會議章魚', clock: '加班鬧鐘', boss: '急件老闆',
    monkey: '燈猴', lion: '石獅仔', imp: '小魔神仔', tiger: '虎姑婆婆' };

  root.HQ_FIELD_MOBS = { draw: (kind) => DRAW[kind] && DRAW[kind](), kinds: Object.keys(DRAW), NAMES };
})(this);
