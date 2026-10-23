// 角色外觀：前後端共用的選項清單 + 瀏覽器端的 Canvas 繪圖
// 畫風：蠟筆質感、粗抖的深色外框、大耳朵、圓眼鏡、紅鼻子紅臉頰
(function (root) {
  const HAIRS = { short: '短髮', bob: '鮑伯頭', long: '長髮', bun: '包包頭', curly: '捲髮', hat: '尖帽' };
  // 每個職業的衣服：body 是衣服顏色（防颱職員用自己選的雨衣色）
  const COSTUMES = {
    staff: {},
    prophet: { body: '#7a5cc8', sleeve: '#7a5cc8' }, // 紫色星星長袍＋兜帽
    nurse: { body: '#fbfbf8', sleeve: '#fbfbf8' }, // 白衣＋護士帽
    archer: { body: '#d9384a', sleeve: '#f4efe4' }, // 小紅帽斗篷
    tank: { body: '#2f3b55', sleeve: null }, // 背心＋露出粗手臂＋頭帶
    skater: { body: '#a9d4f0', sleeve: '#a9d4f0' }, // 清宮旗裝＋大拉翅＋冰刀
    suit: { body: '#2f3b55', sleeve: '#2f3b55' }, // NPC 西裝
  };
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
    const cos = COSTUMES[p.cls] ? p.cls : 'staff';
    const body = (cos === 'suit' && p.suit) || COSTUMES[cos].body || outfit;
    const sleeve = cos === 'staff' ? outfit : COSTUMES[cos].sleeve;

    ctx.save();
    // 影子
    ctx.fillStyle = 'rgba(19,26,40,0.18)';
    ctx.beginPath(); ctx.ellipse(32, 77, 17, 3.5, 0, 0, Math.PI * 2); ctx.fill();

    // 腿 + 雨鞋
    [[23, 30], [34, 41]].forEach(([x1, x2]) => {
      C.rect(ctx, x1, 62, x2 - x1, 11, r, 0.8); C.fill(ctx, '#8a5a3a', r, [x1, 62, 10, 11]); C.stroke(ctx, r, W);
      C.blob(ctx, (x1 + x2) / 2 + (x1 < 30 ? -1 : 1), 74, 6, 3.5, r, 0.06); C.fill(ctx, cos === 'skater' ? '#fbfbf8' : '#2f3b55', r, null); C.stroke(ctx, r, W);
      if (cos === 'skater') C.line(ctx, x1 - 2, 78.5, x2 + 1, 78.5, r, 1.8, '#9aa3b5', 0.3); // 冰刀
    });

    // 手臂（袖子 + 手）
    if (p.npc !== 'chiang') [[13, -0.5], [51, 0.5]].forEach(([x, tilt]) => {
      // 超能力霸王露出粗粗的手臂
      if (cos === 'tank') { C.blob(ctx, x + tilt * 2, 55, 6.5, 9.5, r, 0.08); C.fill(ctx, skin, r, null); C.stroke(ctx, r, W); return; }
      C.blob(ctx, x, 54, 5, 9, r, 0.08); C.fill(ctx, sleeve, r, [x - 5, 45, 10, 18]); C.stroke(ctx, r, W);
      C.blob(ctx, x + tilt * 2, 63, 3.6, 3.4, r, 0.1); C.fill(ctx, skin, r, null); C.stroke(ctx, r, 2);
    });

    // 兜帽、斗篷在頭的後面
    if (cos === 'archer' || cos === 'prophet') {
      C.blob(ctx, 32, 30, 23, 23, r, 0.05); C.fill(ctx, body, r, [9, 7, 46, 46]); C.stroke(ctx, r, W);
    }

    // 雨衣身體
    // 長袍、旗裝比較長，蓋住一點腿
    const hem = cos === 'prophet' || cos === 'skater' ? 71 : 66;
    ctx.beginPath();
    ctx.moveTo(19, 47); ctx.quadraticCurveTo(32, 41 + r(), 45, 47);
    ctx.quadraticCurveTo(49 + r(), 58, 48 + (hem - 66) * 0.3, hem); ctx.quadraticCurveTo(32, hem + 3 + r(), 16 - (hem - 66) * 0.3, hem);
    ctx.quadraticCurveTo(15 + r(), 58, 19, 47); ctx.closePath();
    C.fill(ctx, body, r, [14, 41, 36, hem - 38], 1.4); C.stroke(ctx, r, W);
    drawCostume(ctx, C, r, cos, hem, p);

    // 大耳朵（鮑伯頭、長髮會把耳朵蓋住）
    if (hair !== 'bob' && hair !== 'long') [[13.5, -1], [50.5, 1]].forEach(([x]) => {
      C.blob(ctx, x, 29, 6.5, 7.5, r, 0.08); C.fill(ctx, skin, r, null); C.stroke(ctx, r, W);
      C.blob(ctx, x, 29.5, 3.2, 4, r, 0.12); C.fill(ctx, '#f4a3a0', r, null);
    });

    if (hair === 'bun') {
      C.blob(ctx, 32, 5.5, 7, 6, r, 0.1); C.fill(ctx, hairColor, r, [25, 0, 14, 12]); C.stroke(ctx, r, W);
    }
    if (hair === 'long') {
      // 長髮的後半：直直垂到肩膀下面
      ctx.beginPath();
      ctx.moveTo(11.5, 28); ctx.quadraticCurveTo(11, 6.5, 32, 6.5); ctx.quadraticCurveTo(53, 6.5, 52.5, 28);
      ctx.lineTo(54, 55); ctx.quadraticCurveTo(32, 58, 10, 55); ctx.closePath();
      C.fill(ctx, hairColor, r, [10, 6, 44, 52]); C.stroke(ctx, r, W);
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
    } else if (hair === 'long') {
      // 側分瀏海＋兩側垂下來的頭髮
      ctx.beginPath();
      ctx.moveTo(23, 12);
      ctx.quadraticCurveTo(34, 22, 47.5, 23);
      ctx.lineTo(47, 52); ctx.lineTo(53, 52);
      ctx.quadraticCurveTo(53, 6.5, 32, 6.5); ctx.quadraticCurveTo(11, 6.5, 11, 52);
      ctx.lineTo(17, 52); ctx.quadraticCurveTo(16.5, 21, 23, 12);
      ctx.closePath();
      C.fill(ctx, hairColor, r, [11, 6, 42, 46]); C.stroke(ctx, r, W);
      ctx.save(); ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.moveTo(36, 10); ctx.quadraticCurveTo(46, 12, 49, 22);
      C.stroke(ctx, r, 2, '#ffffff'); ctx.restore();
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

    drawHeadwear(ctx, C, r, cos, W);

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

    // NPC 的小特徵
    if (p.npc === 'shen') {
      // 落腮鬍渣
      C.dots(ctx, 22, 38, 20, 8, 26, 'rgba(43,42,51,0.45)', r, 0.9);
      C.line(ctx, 28, 37.5, 36, 37.5, r, 1.6, 'rgba(43,42,51,0.7)', 0.4);
    }
    if (p.npc === 'hsu') {
      // 紅唇、珍珠耳環
      ctx.fillStyle = '#d93a4a'; ctx.beginPath(); ctx.ellipse(32, 40.3, 4.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      [[14.5, 39], [49.5, 39]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); C.stroke(ctx, r, 1.2); });
    }
    if (p.npc === 'chiang') {
      // 摀住耳朵（不聽不聽）
      [[13, 1], [51, -1]].forEach(([x, k]) => {
        ctx.beginPath(); ctx.moveTo(x - 4 * k + (k > 0 ? 6 : -6), 50); ctx.quadraticCurveTo(x - 6 * k, 44, x, 34);
        C.stroke(ctx, r, 7, C.INK); C.stroke(ctx, r, 4.5, body);
        C.blob(ctx, x, 30, 5, 6, r, 0.1); C.fill(ctx, skin, r, null); C.stroke(ctx, r, 2);
      });
    }

    ctx.restore();
  }

  // 衣服上的細節（畫在身體上面）
  function drawCostume(ctx, C, r, cos, hem, p) {
    const dot = (x, y, rad, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); };
    if (cos === 'staff') {
      // 雨衣：下襬的條紋滾邊、扣子
      for (let x = 18; x < 47; x += 4) C.line(ctx, x, 63.5, x + 1.5, 66.5, r, 1.6, x % 8 < 4 ? '#ffffff' : C.INK, 0.4);
      [52, 58].forEach(y => dot(32, y, 1.8, '#ffffff'));
    } else if (cos === 'prophet') {
      // 星星長袍＋金色眼睛墜飾
      [[22, 56], [41, 60], [27, 66], [38, 53], [44, 67]].forEach(([x, y]) => dot(x, y, 1.3, '#ffd23f'));
      C.line(ctx, 24, 47, 32, 53, r, 1.6, '#ffd23f', 0.3); C.line(ctx, 40, 47, 32, 53, r, 1.6, '#ffd23f', 0.3);
      C.blob(ctx, 32, 55.5, 3.6, 3, r, 0.05, 12); C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, 1.4);
      dot(32, 55.5, 1.2, C.INK);
    } else if (cos === 'nurse') {
      // 紅十字＋粉紅滾邊
      ctx.fillStyle = '#e8384f'; ctx.fillRect(30.5, 51, 3, 9); ctx.fillRect(27.5, 54, 9, 3);
      C.line(ctx, 17, hem - 2, 47, hem - 2, r, 2, '#f4a3a0', 0.4);
      C.line(ctx, 26, 46, 32, 50, r, 1.6, C.INK, 0.3); C.line(ctx, 38, 46, 32, 50, r, 1.6, C.INK, 0.3);
    } else if (cos === 'archer') {
      // 斗篷下的白襯衫、蝴蝶結、箭袋背帶
      ctx.beginPath(); ctx.moveTo(26, 47); ctx.lineTo(38, 47); ctx.lineTo(36, 64); ctx.lineTo(28, 64); ctx.closePath();
      C.fill(ctx, '#f4efe4', r, null); C.stroke(ctx, r, 1.6);
      C.blob(ctx, 28.5, 49.5, 3, 2.2, r, 0.1, 10); C.fill(ctx, '#d9384a', r, null); C.stroke(ctx, r, 1.2);
      C.blob(ctx, 35.5, 49.5, 3, 2.2, r, 0.1, 10); C.fill(ctx, '#d9384a', r, null); C.stroke(ctx, r, 1.2);
      C.line(ctx, 20, 49, 44, 63, r, 2.2, '#8a5a3a', 0.4);
    } else if (cos === 'tank') {
      // 背心的肩帶、胸前一個「力」
      C.line(ctx, 24, 44, 24, 50, r, 3, '#2f3b55', 0.2); C.line(ctx, 40, 44, 40, 50, r, 3, '#2f3b55', 0.2);
      ctx.fillStyle = '#ff7a2f'; ctx.font = '900 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('力', 32, 60);
    } else if (cos === 'skater') {
      // 旗裝的高領、斜襟、花紋
      C.rect(ctx, 27, 44, 10, 4, r, 0.4); C.fill(ctx, '#f4a3c0', r, null); C.stroke(ctx, r, 1.4);
      ctx.beginPath(); ctx.moveTo(32, 48); ctx.quadraticCurveTo(40, 50, 44, 56); C.stroke(ctx, r, 1.6);
      [[22, 60], [40, 64], [28, 68]].forEach(([x, y]) => { dot(x, y, 2, '#f4a3c0'); dot(x, y, 0.8, '#ffffff'); });
      C.line(ctx, 17, hem - 2, 47, hem - 2, r, 2.2, '#4f7cc2', 0.4);
    } else if (cos === 'suit') {
      // 白襯衫 V 領＋領帶
      ctx.beginPath(); ctx.moveTo(26, 46); ctx.lineTo(38, 46); ctx.lineTo(32, 56); ctx.closePath();
      C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 1.4);
      ctx.beginPath(); ctx.moveTo(30.5, 47); ctx.lineTo(33.5, 47); ctx.lineTo(34.5, 55); ctx.lineTo(32, 58); ctx.lineTo(29.5, 55); ctx.closePath();
      C.fill(ctx, (p && p.tie) || '#e8384f', r, null); C.stroke(ctx, r, 1.2);
      [59, 63].forEach(y => dot(36, y, 1.3, '#9aa3b5'));
    }
  }

  // 帽子類：畫在頭髮上面
  function drawHeadwear(ctx, C, r, cos, W) {
    if (cos === 'nurse') {
      ctx.beginPath(); ctx.moveTo(21, 12); ctx.lineTo(43, 12); ctx.lineTo(40, 3); ctx.lineTo(24, 3); ctx.closePath();
      C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, W);
      ctx.fillStyle = '#e8384f'; ctx.fillRect(31, 4.5, 2.4, 6); ctx.fillRect(29.2, 6.3, 6, 2.4);
    } else if (cos === 'tank') {
      C.rect(ctx, 14, 15, 36, 5, r, 0.6); C.fill(ctx, '#ff7a2f', r, null); C.stroke(ctx, r, 2);
      C.line(ctx, 49, 17, 55, 22, r, 2.6, '#ff7a2f'); C.line(ctx, 49, 18, 54, 25, r, 2.6, '#ff7a2f');
    } else if (cos === 'archer') {
      // 兜帽的前緣
      ctx.beginPath(); ctx.arc(32, 28, 20.5, Math.PI * 1.08, Math.PI * 1.92); C.stroke(ctx, r, 5, C.INK);
      ctx.beginPath(); ctx.arc(32, 28, 20.5, Math.PI * 1.08, Math.PI * 1.92); C.stroke(ctx, r, 3, '#d9384a');
    } else if (cos === 'prophet') {
      ctx.beginPath(); ctx.arc(32, 28, 20.5, Math.PI * 1.08, Math.PI * 1.92); C.stroke(ctx, r, 5, C.INK);
      ctx.beginPath(); ctx.arc(32, 28, 20.5, Math.PI * 1.08, Math.PI * 1.92); C.stroke(ctx, r, 3, '#7a5cc8');
      C.blob(ctx, 32, 9, 3, 3, r, 0.1, 10); C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, 1.2);
    } else if (cos === 'skater') {
      // 大拉翅：頭上一片黑色扁扁的大板子，插著粉紅花
      C.rect(ctx, 8, 2, 48, 9, r, 0.8); C.fill(ctx, '#2b2a33', r, null); C.stroke(ctx, r, W);
      C.rect(ctx, 22, 9, 20, 5, r, 0.6); C.fill(ctx, '#2b2a33', r, null);
      [[16, 6], [48, 6], [32, 5]].forEach(([x, y], i) => {
        C.blob(ctx, x, y, i === 2 ? 5 : 4, i === 2 ? 4.5 : 3.6, r, 0.15, 10); C.fill(ctx, '#f4a3c0', r, null); C.stroke(ctx, r, 1.4);
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill();
      });
      C.line(ctx, 54, 10, 56, 22, r, 1.8, '#f4a3c0', 0.4); // 流蘇
    }
  }

  const avatar = { HAIRS, SKINS, HAIR_COLORS, OUTFITS, GLASSES, COSTUMES, drawAvatar, WIDTH: 64, HEIGHT: 80 };
  if (typeof module !== 'undefined' && module.exports) module.exports = avatar;
  else root.HQ_AVATAR = avatar;
})(this);
