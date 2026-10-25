// 角色外觀：前後端共用的選項清單 + 瀏覽器端的 Canvas 繪圖
// 畫風：蠟筆質感、粗抖的深色外框、大耳朵、圓眼鏡、紅鼻子紅臉頰
(function (root) {
  const HAIRS = { short: '短髮', bob: '鮑伯頭', long: '長髮', bun: '包包頭', curly: '捲髮', buzz: '平頭', bald: '光頭', hat: '尖帽' };
  // 每個職業的衣服：body 是衣服顏色（防颱職員用自己選的雨衣色）
  const COSTUMES = {
    staff: {},
    prophet: { body: '#7a5cc8', sleeve: '#7a5cc8' }, // 紫色星星長袍＋兜帽
    nurse: { body: '#fbfbf8', sleeve: '#fbfbf8' }, // 白衣＋護士帽
    archer: { body: '#d9384a', sleeve: '#f4efe4' }, // 小紅帽斗篷
    tank: { body: '#2f3b55', sleeve: null }, // 背心＋露出粗手臂＋頭帶
    skater: { body: '#a9d4f0', sleeve: '#a9d4f0' }, // 清宮旗裝＋大拉翅＋冰刀
    summoner: { body: '#f6c6d6', sleeve: '#f6c6d6' }, // 粉紅太空衣＋外星觸角髮箍
    singer: { body: '#5b3f8f', sleeve: '#5b3f8f' }, // 紫色亮片晚禮服＋耳麥＋音符髮夾
    painter: { body: '#f4efe4', sleeve: '#4f7cc2' }, // 沾滿顏料的畫家圍裙＋條紋袖＋紅色貝雷帽
    suit: { body: '#2f3b55', sleeve: '#2f3b55' }, // NPC 西裝
    greek: { body: '#fbfbf8', sleeve: null }, // NPC 希臘少女：白色單肩長袍＋金色腰繩＋橄欖葉冠
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
    // 裝備（gear.js）：有穿服裝就不畫職業服，有戴頭飾就不畫職業帽
    const G = root.HQ_GEAR, EQ = p.equip || {};
    const has = (slot) => !!(G && EQ[slot] && G.GEAR[EQ[slot]] && G.GEAR[EQ[slot]].slot === slot);
    const gear = (slot, layer) => { if (has(slot)) G.drawLayer(ctx, EQ[slot], layer, { skin }); };
    const dressed = has('outfit'), hatted = has('head');

    ctx.save();
    // 影子
    ctx.fillStyle = 'rgba(19,26,40,0.18)';
    ctx.beginPath(); ctx.ellipse(32, 77, 17, 3.5, 0, 0, Math.PI * 2); ctx.fill();

    gear('cape', 'cape');
    if (hair === 'long') {
      // 長髮的後半：畫在身體後面，從肩膀兩側露出來，不會蓋住衣服
      ctx.beginPath();
      ctx.moveTo(11.5, 28); ctx.quadraticCurveTo(11, 6.5, 32, 6.5); ctx.quadraticCurveTo(53, 6.5, 52.5, 28);
      ctx.lineTo(54, 55); ctx.quadraticCurveTo(32, 58, 10, 55); ctx.closePath();
      C.fill(ctx, hairColor, r, [10, 6, 44, 52]); C.stroke(ctx, r, W);
    }
    gear('outfit', 'back');
    if (dressed) gear('outfit', 'front');
    else {
    // 腿 + 雨鞋
    if (cos === 'greek') [[23, 30], [34, 41]].forEach(([x1, x2]) => {
      // 光腳穿綁帶涼鞋
      C.rect(ctx, x1, 62, x2 - x1, 12, r, 0.8); C.fill(ctx, skin, r, null); C.stroke(ctx, r, W);
      C.blob(ctx, (x1 + x2) / 2 + (x1 < 30 ? -1 : 1), 75, 5.5, 2.6, r, 0.06); C.fill(ctx, '#c08a4a', r, null); C.stroke(ctx, r, 1.8);
      [67, 71].forEach(y => C.line(ctx, x1, y, x2, y + 1, r, 1.4, '#a06a30', 0.3));
    });
    else [[23, 30], [34, 41]].forEach(([x1, x2]) => {
      C.rect(ctx, x1, 62, x2 - x1, 11, r, 0.8); C.fill(ctx, '#8a5a3a', r, [x1, 62, 10, 11]); C.stroke(ctx, r, W);
      C.blob(ctx, (x1 + x2) / 2 + (x1 < 30 ? -1 : 1), 74, 6, 3.5, r, 0.06); C.fill(ctx, cos === 'skater' ? '#fbfbf8' : '#2f3b55', r, null); C.stroke(ctx, r, W);
      if (cos === 'skater') C.line(ctx, x1 - 2, 78.5, x2 + 1, 78.5, r, 1.8, '#9aa3b5', 0.3); // 冰刀
    });

    // 手臂（袖子 + 手）
    if (p.npc !== 'chiang') [[13, -0.5], [51, 0.5]].forEach(([x, tilt]) => {
      if (p.fist && x > 32) return; // 花蓮王舉拳：右手另外畫在上面
      if (p.npc === 'greek' && x > 32) return; // 希臘少女的右手比「噓」，另外畫在上面
      if (cos === 'greek') {
        // 露出手臂，戴金色臂環
        C.blob(ctx, x, 55, 4.2, 9, r, 0.08); C.fill(ctx, skin, r, null); C.stroke(ctx, r, W);
        C.line(ctx, x - 4, 51, x + 4, 50.5, r, 2.6, '#e0b84a', 0.2);
        return;
      }
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
    const hem = cos === 'greek' ? 73 : cos === 'prophet' || cos === 'skater' || cos === 'singer' ? 71 : 66;
    ctx.beginPath();
    ctx.moveTo(19, 47); ctx.quadraticCurveTo(32, 41 + r(), 45, 47);
    ctx.quadraticCurveTo(49 + r(), 58, 48 + (hem - 66) * 0.3, hem); ctx.quadraticCurveTo(32, hem + 3 + r(), 16 - (hem - 66) * 0.3, hem);
    ctx.quadraticCurveTo(15 + r(), 58, 19, 47); ctx.closePath();
    C.fill(ctx, body, r, [14, 41, 36, hem - 38], 1.4); C.stroke(ctx, r, W);
    drawCostume(ctx, C, r, cos, hem, p);
    }
    gear('cape', 'clasp');

    // 大耳朵（鮑伯頭、長髮會把耳朵蓋住）
    if (hair !== 'bob' && hair !== 'long') [[13.5, -1], [50.5, 1]].forEach(([x]) => {
      C.blob(ctx, x, 29, 6.5, 7.5, r, 0.08); C.fill(ctx, skin, r, null); C.stroke(ctx, r, W);
      C.blob(ctx, x, 29.5, 3.2, 4, r, 0.12); C.fill(ctx, '#f4a3a0', r, null);
    });

    if (hair === 'bun') {
      C.blob(ctx, 32, 5.5, 7, 6, r, 0.1); C.fill(ctx, hairColor, r, [25, 0, 14, 12]); C.stroke(ctx, r, W);
    }

    // 大頭
    C.blob(ctx, 32, 28, 17.5, 18, r, 0.05); C.fill(ctx, skin, r, [14, 10, 36, 36], 0.5); C.stroke(ctx, r, W);

    // 頭髮前半
    if (hair === 'short' || hair === 'bun' || (hair === 'hat' && hatted)) {
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
      // 兩側垂下來的頭髮只到肩膀，不蓋到衣服前面
      ctx.lineTo(47.5, 42); ctx.quadraticCurveTo(50.5, 45, 53, 42);
      ctx.quadraticCurveTo(53, 6.5, 32, 6.5); ctx.quadraticCurveTo(11, 6.5, 11, 42);
      ctx.quadraticCurveTo(13.5, 45, 16.5, 42); ctx.quadraticCurveTo(16.5, 21, 23, 12);
      ctx.closePath();
      C.fill(ctx, hairColor, r, [11, 6, 42, 38]); C.stroke(ctx, r, W);
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
    } else if (hair === 'buzz') {
      // 平頭：貼著頭皮的一層短髮，髮際線剪得平平的，點點像刺刺的髮根
      ctx.beginPath();
      ctx.moveTo(15, 24); ctx.quadraticCurveTo(15, 10, 32, 10.5); ctx.quadraticCurveTo(49, 10, 49, 24);
      ctx.quadraticCurveTo(47.5, 18.5, 45, 17.5); ctx.lineTo(19, 17.5); ctx.quadraticCurveTo(16.5, 18.5, 15, 24);
      ctx.closePath();
      C.fill(ctx, hairColor, r, [15, 10, 34, 14]); C.stroke(ctx, r, 2);
      C.dots(ctx, 19, 12, 26, 5, 22, 'rgba(255,255,255,0.35)', r, 0.9);
    } else if (hair === 'bald') {
      // 光頭：亮亮的頭頂反光
      ctx.save(); ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.ellipse(38, 15.5, 5, 2.4, -0.35, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.beginPath(); ctx.arc(30.5, 13.5, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (hair === 'curly') {
      [[18, 17], [24, 12], [31, 10], [38, 11], [45, 16], [21, 21], [43, 21]].forEach(([x, y]) => {
        C.blob(ctx, x, y, 5.5, 5, r, 0.15, 12); C.fill(ctx, hairColor, r, null); C.stroke(ctx, r, 2);
      });
    } else if (hair === 'hat' && !hatted) {
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

    if (!hatted && !(dressed && (cos === 'archer' || cos === 'prophet'))) drawHeadwear(ctx, C, r, cos, W);

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

    if (p.npc === 'fu') drawFu(ctx, C, r, p, W, skin);
    if (p.npc === 'greek') drawGreek(ctx, C, r, W, skin);

    gear('head', 'head');
    gear('outfit', 'over');
    gear('weapon', 'hand'); // 武器拿在右手，畫在最上面

    ctx.restore();
  }

  // 副本頭目花蓮王：往旁邊梳的黑色短髮、圓臉大笑、黑色盔甲；舉拳（p.fist）是衝鋒前的預告
  function drawFu(ctx, C, r, p, W, skin) {
    ctx.beginPath();
    ctx.moveTo(14.5, 28); ctx.quadraticCurveTo(12.5, 7.5, 32, 8); ctx.quadraticCurveTo(51, 7.5, 50.5, 26);
    ctx.quadraticCurveTo(47, 17.5, 38, 16.5); ctx.quadraticCurveTo(27, 15.5, 21.5, 20); ctx.quadraticCurveTo(17.5, 23, 17, 28); ctx.closePath();
    C.fill(ctx, '#1f1d24', r, [13, 8, 38, 20]); C.stroke(ctx, r, W);
    C.line(ctx, 24, 10, 21.5, 17.5, r, 1.3, 'rgba(255,255,255,0.4)', 0.3); // 旁分的分線
    C.line(ctx, 33, 10.5, 44, 14, r, 1.1, 'rgba(255,255,255,0.25)', 0.3);
    // 開口大笑，露出一排白牙
    ctx.beginPath(); ctx.moveTo(25, 38.2); ctx.quadraticCurveTo(32, 47, 39, 38.2); ctx.quadraticCurveTo(32, 39.6, 25, 38.2); ctx.closePath();
    C.fill(ctx, '#8a2f35', r, null); C.stroke(ctx, r, 1.6);
    ctx.beginPath(); ctx.moveTo(26.2, 38.8); ctx.quadraticCurveTo(32, 40.2, 37.8, 38.8); ctx.lineTo(37, 40.6); ctx.quadraticCurveTo(32, 42, 27, 40.6); ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.fill();
    // 黑色盔甲：肩甲、胸前的紫色徽章
    [16, 48].forEach((x) => {
      C.blob(ctx, x, 48.5, 8.5, 5.5, r, 0.06); C.fill(ctx, '#3a3746', r, null); C.stroke(ctx, r, W);
      C.line(ctx, x - 5.5, 47.5, x + 5.5, 47.5, r, 1.4, '#a07be8', 0.3);
    });
    C.blob(ctx, 32, 56, 4.6, 4.6, r, 0.1, 12); C.fill(ctx, '#8a5cd6', r, null); C.stroke(ctx, r, 1.6);
    if (p.fist) {
      // 右手握拳舉到臉旁邊
      ctx.beginPath(); ctx.moveTo(47, 52); ctx.quadraticCurveTo(57, 46, 57, 33);
      C.stroke(ctx, r, 9, C.INK); C.stroke(ctx, r, 6.4, '#3a3746');
      C.blob(ctx, 57, 28, 6, 6.5, r, 0.1, 14); C.fill(ctx, skin, r, null); C.stroke(ctx, r, W);
      [24.5, 27.5, 30.5].forEach(y => C.line(ctx, 53.5, y, 57, y, r, 1, 'rgba(43,42,51,0.6)', 0.2));
    } else {
      // 右手拿一把發紫光的黑劍
      ctx.save(); ctx.globalAlpha = 0.35; C.line(ctx, 52, 62, 62, 16, r, 9, '#a07be8', 0.3); ctx.restore();
      ctx.beginPath(); ctx.moveTo(51, 60); ctx.lineTo(59.5, 18); ctx.lineTo(63, 17); ctx.lineTo(55, 61); ctx.closePath();
      C.fill(ctx, '#2b2a33', r, null); C.stroke(ctx, r, 1.6);
      C.line(ctx, 55, 52, 60, 24, r, 1, 'rgba(255,255,255,0.45)', 0.2);
      C.line(ctx, 46, 60, 58, 63, r, 3.2, '#ffd23f', 0.3);
    }
  }

  // 衣服上的細節（畫在身體上面）
  // 希臘少女：畫眼線的大眼睛、粉紅唇，右手食指比「噓」，手上戴戒指和亮晶晶的手環
  function drawGreek(ctx, C, r, W, skin) {
    [[26, 1], [38, -1]].forEach(([x, k]) => {
      C.blob(ctx, x, 28.3, 2.7, 3.1, r, 0.06, 12); C.fill(ctx, C.INK, r, null);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - 0.8, 27.2, 0.9, 0, Math.PI * 2); ctx.fill();
      // 眼線：上眼皮一道，眼尾輕輕往外勾
      ctx.beginPath(); ctx.moveTo(x + 2.6 * k, 27.4); ctx.quadraticCurveTo(x, 24.6, x - 2.8 * k, 27); ctx.lineTo(x - 4.4 * k, 26.2);
      C.stroke(ctx, r, 1.3);
    });
    ctx.fillStyle = '#e0607a'; ctx.beginPath(); ctx.ellipse(32, 40.4, 3.3, 1.7, 0, 0, Math.PI * 2); ctx.fill();
    // 右手從胸口抬到下巴：握拳，只伸出食指貼在嘴唇正中間
    ctx.beginPath(); ctx.moveTo(48, 56); ctx.quadraticCurveTo(46, 50.5, 38.5, 49);
    C.stroke(ctx, r, 8, C.INK); C.stroke(ctx, r, 5, skin);
    C.line(ctx, 42.6, 52.6, 43.8, 48.6, r, 3, '#cfd6e2', 0.2); // 手環
    [[42, 51], [44.6, 52]].forEach(([x, y]) => { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2); ctx.fill(); });
    // 食指：圓頭的長條，指尖有一點指甲
    ctx.beginPath();
    ctx.moveTo(30.6, 45.5); ctx.lineTo(30.8, 38.6); ctx.quadraticCurveTo(32, 36.6, 33.2, 38.6); ctx.lineTo(33.4, 45.5); ctx.closePath();
    C.fill(ctx, skin, r, null); C.stroke(ctx, r, 1.4);
    ctx.fillStyle = '#f6d3d8'; ctx.beginPath(); ctx.ellipse(32, 38.9, 0.8, 1.1, 0, 0, Math.PI * 2); ctx.fill();
    // 握起來的拳頭，三個指節
    C.blob(ctx, 34.5, 47.8, 5, 3.6, r, 0.06, 14); C.fill(ctx, skin, r, null); C.stroke(ctx, r, 1.6);
    [33.6, 36.2, 38.4].forEach(x => C.line(ctx, x, 45.2, x - 0.2, 47.4, r, 0.9, 'rgba(43,42,51,0.55)', 0.1));
    C.blob(ctx, 34.9, 45.4, 1.2, 0.9, r, 0.1, 8); C.fill(ctx, '#e0b84a', r, null); C.stroke(ctx, r, 0.7); // 戒指
    C.blob(ctx, 37.3, 45.5, 1.2, 0.9, r, 0.1, 8); C.fill(ctx, '#e8edf3', r, null); C.stroke(ctx, r, 0.7);
  }

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
    } else if (cos === 'summoner') {
      // 太空衣：白色胸前面板、小 UFO 徽章、腰帶
      C.rect(ctx, 25, 49, 14, 11, r, 0.6); C.fill(ctx, '#fbfbf8', r, null); C.stroke(ctx, r, 1.6);
      C.blob(ctx, 32, 55, 5, 2, r, 0.08, 12); C.fill(ctx, '#7be08f', r, null); C.stroke(ctx, r, 1.2);
      C.blob(ctx, 32, 53.2, 2.4, 1.8, r, 0.1, 10); C.fill(ctx, '#bfe6ff', r, null); C.stroke(ctx, r, 1);
      C.line(ctx, 17, 62, 47, 62, r, 2.6, '#e8384f', 0.3);
      [[20, 50], [44, 52]].forEach(([x, y]) => dot(x, y, 1.3, '#ffffff'));
    } else if (cos === 'singer') {
      // 晚禮服：亮片、金色腰帶、裙襬一圈星光
      [[22, 55], [41, 52], [27, 64], [38, 62], [44, 68], [20, 68], [33, 58]].forEach(([x, y], i) => dot(x, y, i % 2 ? 1 : 1.5, i % 3 ? '#ffd23f' : '#ffffff'));
      C.line(ctx, 18, 54, 46, 54, r, 2.4, '#ffd23f', 0.3);
      C.blob(ctx, 32, 54, 3, 2.4, r, 0.08, 10); C.fill(ctx, '#f4a3c0', r, null); C.stroke(ctx, r, 1.2);
      C.line(ctx, 16, hem - 2, 48, hem - 2, r, 2.2, '#b9a3ec', 0.4);
    } else if (cos === 'painter') {
      // 圍裙：口袋插著畫筆，到處是顏料點點
      C.rect(ctx, 23, 50, 18, 14, r, 0.6); C.fill(ctx, '#e7dcc6', r, null); C.stroke(ctx, r, 1.4);
      C.line(ctx, 37, 51, 41, 43, r, 2, '#8a5a3a', 0.2); dot(41.5, 42.5, 1.6, '#e8384f');
      C.line(ctx, 34, 51, 35, 44, r, 2, '#8a5a3a', 0.2); dot(35, 43.5, 1.6, '#4f7cc2');
      [[20, 57, '#e8384f'], [44, 60, '#3f9f5a'], [26, 66, '#ffd23f'], [40, 66, '#4f7cc2'], [30, 47, '#ff7a2f']].forEach(([x, y, c]) => dot(x, y, 1.8, c));
    } else if (cos === 'greek') {
      // 單肩長袍：右肩露出來，布從左肩斜斜垂下，金色腰繩打個結，裙襬一圈金邊
      ctx.beginPath(); ctx.moveTo(36, 45); ctx.quadraticCurveTo(43, 44.5, 45.5, 48.5); ctx.lineTo(44, 51); ctx.quadraticCurveTo(40, 47.5, 36, 45); ctx.closePath();
      C.fill(ctx, p && p.skin || '#fde6d4', r, null);
      ctx.beginPath(); ctx.moveTo(20, 46.5); ctx.quadraticCurveTo(33, 47, 44.5, 52); C.stroke(ctx, r, 1.6);
      [[24, 50, 21, 62], [30, 50, 29, 64], [38, 54, 40, 66], [26, 60, 24, 70], [35, 60, 36, 71]].forEach(([x1, y1, x2, y2]) =>
        C.line(ctx, x1, y1, x2, y2, r, 1.1, 'rgba(43,42,51,0.35)', 0.4));
      C.line(ctx, 17.5, 56, 46.5, 56, r, 2.2, '#e0b84a', 0.3);
      C.blob(ctx, 27, 56, 2, 1.6, r, 0.1, 8); C.fill(ctx, '#e0b84a', r, null); C.stroke(ctx, r, 1);
      C.line(ctx, 26.5, 57, 25, 62, r, 1.4, '#e0b84a', 0.3); C.line(ctx, 27.5, 57, 28.5, 61.5, r, 1.4, '#e0b84a', 0.3);
      C.line(ctx, 15.5, hem - 2.5, 48.5, hem - 2.5, r, 2, '#e0b84a', 0.4);
      for (let x = 18; x < 47; x += 5) C.line(ctx, x, hem - 2.5, x, hem - 5, r, 1, '#e0b84a', 0.2);
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
    } else if (cos === 'summoner') {
      // 外星觸角髮箍
      ctx.beginPath(); ctx.arc(32, 26, 19, Math.PI * 1.12, Math.PI * 1.88); C.stroke(ctx, r, 3.2, C.INK);
      [[23, -1], [41, 1]].forEach(([x, k]) => {
        C.line(ctx, x, 10, x + k * 5, -1, r, 2, C.INK, 0.3);
        C.blob(ctx, x + k * 5, -2, 4, 4, r, 0.1, 12); C.fill(ctx, '#7be08f', r, null); C.stroke(ctx, r, 1.8);
        C.blob(ctx, x + k * 5 - 1, -3, 1.2, 1.2, r, 0.1, 8); ctx.fillStyle = '#ffffff'; ctx.fill();
      });
    } else if (cos === 'singer') {
      // 耳麥＋音符髮夾
      ctx.beginPath(); ctx.arc(32, 27, 19.5, Math.PI * 1.05, Math.PI * 1.95); C.stroke(ctx, r, 2.4, C.INK);
      ctx.beginPath(); ctx.moveTo(14, 30); ctx.quadraticCurveTo(16, 40, 25, 40.5); C.stroke(ctx, r, 1.8, C.INK);
      C.blob(ctx, 25.5, 40.5, 2, 1.6, r, 0.1, 8); C.fill(ctx, '#2b2a33', r, null);
      C.blob(ctx, 14, 29, 3, 4, r, 0.1, 10); C.fill(ctx, '#2b2a33', r, null); C.stroke(ctx, r, 1.4);
      C.blob(ctx, 44, 12, 3, 2.4, r, 0.1, 10); C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, 1.2);
      C.line(ctx, 46.5, 12, 46.5, 4, r, 1.6, C.INK, 0.2); C.line(ctx, 46.5, 4, 50, 6, r, 1.6, C.INK, 0.2);
    } else if (cos === 'greek') {
      // 金色橄欖葉冠：沿著頭頂繞一圈的小葉子
      ctx.beginPath(); ctx.arc(32, 25, 18.5, Math.PI * 1.08, Math.PI * 1.92); C.stroke(ctx, r, 1.6, '#a07a20');
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * (1.1 + i * 0.1), x = 32 + Math.cos(a) * 18.5, y = 25 + Math.sin(a) * 18.5;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2 + (i % 2 ? 0.6 : -0.6));
        C.blob(ctx, 0, -2.6, 1.6, 3.2, r, 0.08, 10); C.fill(ctx, '#e8c04a', r, null); C.stroke(ctx, r, 1);
        ctx.restore();
      }
    } else if (cos === 'painter') {
      // 歪戴的紅色貝雷帽，頂端一個小尾巴
      C.blob(ctx, 29, 11, 19, 6.5, r, 0.08, 14); C.fill(ctx, '#d9384a', r, [10, 4, 38, 14]); C.stroke(ctx, r, W);
      C.line(ctx, 30, 5, 31, 1, r, 2.2, C.INK, 0.2);
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
