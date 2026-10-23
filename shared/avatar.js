// 角色外觀：前後端共用的選項清單 + 瀏覽器端的 Canvas 繪圖
// 畫風：蠟筆質感、粗抖的深色外框、大耳朵、圓眼鏡、紅鼻子紅臉頰
(function (root) {
  const HAIRS = { short: '短髮', bob: '鮑伯頭', bun: '包包頭', curly: '捲髮', hat: '尖帽' };
  const SKINS = ['#fde6d4', '#f6cfae', '#e2a983', '#b77a55'];
  const HAIR_COLORS = ['#2b2a33', '#6b4a32', '#c9772f', '#9aa3b5'];
  const OUTFITS = ['#ff7a2f', '#4f7cc2', '#aeb6c4', '#2f3b55', '#f2c14e', '#6baf7b'];
  const GLASSES = { 1: '戴眼鏡', 0: '不戴' };

  function seedOf(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }

  // 在 ctx 上畫一個人，(0,0) 為左上角，大小 64x80
  function drawAvatar(ctx, p) {
    const C = root.HQ_CRAYON;
    const hair = HAIRS[p.hair] ? p.hair : 'short';
    const skin = p.skin || SKINS[0];
    const hairColor = p.hairColor || HAIR_COLORS[0];
    const outfit = p.outfit || OUTFITS[0];
    const r = C.rng(seedOf([hair, skin, hairColor, outfit, p.glasses].join()));
    const W = 2.4; // 外框粗細

    ctx.save();
    // 影子
    ctx.fillStyle = 'rgba(19,26,40,0.18)';
    ctx.beginPath(); ctx.ellipse(32, 77, 17, 3.5, 0, 0, Math.PI * 2); ctx.fill();

    // 腿 + 雨鞋
    [[23, 30], [34, 41]].forEach(([x1, x2]) => {
      C.rect(ctx, x1, 62, x2 - x1, 11, r, 0.8); C.fill(ctx, '#8a5a3a', r, [x1, 62, 10, 11]); C.stroke(ctx, r, W);
      C.blob(ctx, (x1 + x2) / 2 + (x1 < 30 ? -1 : 1), 74, 6, 3.5, r, 0.06); C.fill(ctx, '#2f3b55', r, null); C.stroke(ctx, r, W);
    });

    // 手臂（袖子 + 手）
    [[13, -0.5], [51, 0.5]].forEach(([x, tilt]) => {
      C.blob(ctx, x, 54, 5, 9, r, 0.08); C.fill(ctx, outfit, r, [x - 5, 45, 10, 18]); C.stroke(ctx, r, W);
      C.blob(ctx, x + tilt * 2, 63, 3.6, 3.4, r, 0.1); C.fill(ctx, skin, r, null); C.stroke(ctx, r, 2);
    });

    // 雨衣身體
    ctx.beginPath();
    ctx.moveTo(19, 47); ctx.quadraticCurveTo(32, 41 + r(), 45, 47);
    ctx.quadraticCurveTo(49 + r(), 58, 48, 66); ctx.quadraticCurveTo(32, 69 + r(), 16, 66);
    ctx.quadraticCurveTo(15 + r(), 58, 19, 47); ctx.closePath();
    C.fill(ctx, outfit, r, [14, 41, 36, 28], 1.4); C.stroke(ctx, r, W);
    // 下襬的條紋滾邊
    for (let x = 18; x < 47; x += 4) C.line(ctx, x, 63.5, x + 1.5, 66.5, r, 1.6, x % 8 < 4 ? '#ffffff' : C.INK, 0.4);
    // 扣子
    ctx.fillStyle = '#ffffff';
    [52, 58].forEach(y => { ctx.beginPath(); ctx.arc(32, y, 1.8, 0, Math.PI * 2); ctx.fill(); });

    // 大耳朵（鮑伯頭會把耳朵蓋住）
    if (hair !== 'bob') [[13.5, -1], [50.5, 1]].forEach(([x]) => {
      C.blob(ctx, x, 29, 6.5, 7.5, r, 0.08); C.fill(ctx, skin, r, null); C.stroke(ctx, r, W);
      C.blob(ctx, x, 29.5, 3.2, 4, r, 0.12); C.fill(ctx, '#f4a3a0', r, null);
    });

    if (hair === 'bun') {
      C.blob(ctx, 32, 5.5, 7, 6, r, 0.1); C.fill(ctx, hairColor, r, [25, 0, 14, 12]); C.stroke(ctx, r, W);
    }

    // 大頭
    C.blob(ctx, 32, 28, 17.5, 18, r, 0.05); C.fill(ctx, skin, r, [14, 10, 36, 36], 0.5); C.stroke(ctx, r, W);

    // 頭髮前半
    if (hair === 'short' || hair === 'bun') {
      ctx.beginPath();
      ctx.moveTo(15, 25); ctx.quadraticCurveTo(15, 9, 32, 9.5); ctx.quadraticCurveTo(49, 9, 49, 25);
      ctx.lineTo(45, 20); ctx.lineTo(41, 23); ctx.lineTo(37, 18.5); ctx.lineTo(32, 22); ctx.lineTo(27, 18); ctx.lineTo(22, 22.5); ctx.lineTo(19, 19);
      ctx.closePath();
      C.fill(ctx, hairColor, r, [15, 9, 34, 16]); C.stroke(ctx, r, W);
    } else if (hair === 'bob') {
      // 俐落的齊下巴鮑伯（像蔡英文、超人特攻隊的衣夫人）：頭頂蓬蓬圓圓、側分瀏海往一邊撥、髮尾往內收
      ctx.beginPath();
      ctx.moveTo(23, 12);
      ctx.quadraticCurveTo(34, 22, 47.5, 23); // 斜斜撥到右邊的瀏海
      ctx.quadraticCurveTo(46.5, 33, 47, 39.5); // 右邊臉頰旁的內側
      ctx.quadraticCurveTo(47.5, 43, 43.5, 43.5); // 髮尾往內勾
      ctx.quadraticCurveTo(52.5, 44, 52.5, 32); // 右邊外側往上
      ctx.quadraticCurveTo(53, 6.5, 32, 6.5); // 頭頂
      ctx.quadraticCurveTo(11, 6.5, 11.5, 32); // 左邊外側往下
      ctx.quadraticCurveTo(11.5, 44, 20.5, 43.5); // 左邊髮尾往內勾
      ctx.quadraticCurveTo(16.5, 43, 17, 39.5);
      ctx.quadraticCurveTo(16.5, 21, 23, 12); // 左邊內側回到分線
      ctx.closePath();
      C.fill(ctx, hairColor, r, [11, 6, 42, 38]); C.stroke(ctx, r, W);
      // 髮旋分線和亮亮的光澤
      C.line(ctx, 23, 12, 25.5, 8, r, 1.6);
      ctx.save(); ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.moveTo(36, 10); ctx.quadraticCurveTo(46, 12, 49, 22);
      C.stroke(ctx, r, 2, '#ffffff'); ctx.restore();
    } else if (hair === 'curly') {
      [[18, 17], [24, 12], [31, 10], [38, 11], [45, 16], [21, 21], [43, 21]].forEach(([x, y]) => {
        C.blob(ctx, x, y, 5.5, 5, r, 0.15, 12); C.fill(ctx, hairColor, r, null); C.stroke(ctx, r, 2);
      });
    } else if (hair === 'hat') {
      // 像插畫裡那頂綠色尖帽，這裡用雨衣同色
      C.blob(ctx, 32, 15, 22, 5, r, 0.08); C.fill(ctx, outfit, r, [10, 10, 44, 10]); C.stroke(ctx, r, W);
      ctx.beginPath();
      ctx.moveTo(18, 14); ctx.quadraticCurveTo(22, 2, 36, 3); ctx.quadraticCurveTo(46, 4, 52, 4 + r());
      ctx.quadraticCurveTo(48, 8, 46, 14); ctx.closePath();
      C.fill(ctx, outfit, r, [18, 0, 36, 14]); C.stroke(ctx, r, W);
      // 帽尖的小星星
      ctx.save(); ctx.translate(52, 4.5); ctx.fillStyle = '#ffffff'; ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 1.6 : 4;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill(); C.stroke(ctx, r, 1.2); ctx.restore();
    }

    // 臉頰
    ctx.fillStyle = 'rgba(244,120,120,0.45)';
    [[21, 35], [43, 35]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill(); });

    // 小豆豆眼
    ctx.fillStyle = C.INK;
    [[26, 28.5], [38, 28.5]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 1.7, 2, 0, 0, Math.PI * 2); ctx.fill(); });

    // 圓眼鏡
    if (String(p.glasses) === '1') {
      ctx.save(); ctx.strokeStyle = C.INK; ctx.lineWidth = 1.8;
      [[26, 28.5], [38, 28.5]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(31, 28); ctx.lineTo(33, 28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(21, 27.5); ctx.lineTo(16.5, 26.5); ctx.moveTo(43, 27.5); ctx.lineTo(47.5, 26.5); ctx.stroke();
      ctx.restore();
    }

    // 紅鼻子
    C.blob(ctx, 32, 34, 3.6, 3, r, 0.1, 12); C.fill(ctx, '#f28b82', r, null); C.stroke(ctx, r, 1.6);

    // 抖抖的嘴巴
    ctx.beginPath(); ctx.moveTo(27.5, 40); ctx.quadraticCurveTo(29.5, 39, 31, 40.5);
    ctx.quadraticCurveTo(33, 41.5, 34.5, 40); ctx.quadraticCurveTo(35.5, 39.5, 36.5, 40.5);
    C.stroke(ctx, r, 1.5);

    ctx.restore();
  }

  const avatar = { HAIRS, SKINS, HAIR_COLORS, OUTFITS, GLASSES, drawAvatar, WIDTH: 64, HEIGHT: 80 };
  if (typeof module !== 'undefined' && module.exports) module.exports = avatar;
  else root.HQ_AVATAR = avatar;
})(this);
