// 手繪風 icon：用 crayon.js 畫在 48x48 的小畫布上，取代主要的 emoji（職業徽章、主要按鈕、新手技能）
// 用法：HQ_ICONS.url('cls-staff') 拿到圖片網址；沒有手繪版的 key 回傳 null，呼叫的地方改用 emoji
(function (root) {
  const C = root.HQ_CRAYON;
  const SIZE = 48, SCALE = 3;

  // 每個 icon 一個畫法，座標都在 48x48 裡
  const DRAW = {
    // 防颱職員：反光背心
    'cls-staff'(x, r) {
      x.beginPath(); x.moveTo(15, 7); x.lineTo(33, 7); x.lineTo(41, 14); x.lineTo(40, 42); x.lineTo(8, 42); x.lineTo(7, 14); x.closePath();
      C.fill(x, '#ffb020', r, [7, 7, 34, 35]); C.stroke(x, r, 2.4);
      x.beginPath(); x.moveTo(18, 7); x.quadraticCurveTo(24, 18, 30, 7); C.fill(x, '#fff3d6', r, null); C.stroke(x, r, 2);
      C.rect(x, 8, 27, 32, 5, r, 0.6); C.fill(x, '#eef4f8', r, [8, 27, 32, 5]); C.stroke(x, r, 1.6);
      C.line(x, 24, 18, 24, 42, r, 1.6);
    },
    // 預言家：水晶球
    'cls-prophet'(x, r) {
      C.rect(x, 13, 36, 22, 7, r, 0.6); C.fill(x, '#a0703f', r, [13, 36, 22, 7]); C.stroke(x, r, 2.2);
      C.blob(x, 24, 22, 14, 14, r, 0.04); C.fill(x, '#c9b6ff', r, [10, 8, 28, 28]); C.stroke(x, r, 2.4);
      C.blob(x, 18, 16, 4.5, 3.2, r, 0.1); x.fillStyle = 'rgba(255,255,255,.85)'; x.fill();
      C.dots(x, 16, 18, 16, 12, 5, '#fff', r, 1);
    },
    // 南丁格爾：護士帽
    'cls-nurse'(x, r) {
      x.beginPath(); x.moveTo(6, 34); x.quadraticCurveTo(8, 14, 24, 12); x.quadraticCurveTo(40, 14, 42, 34); x.quadraticCurveTo(24, 29, 6, 34); x.closePath();
      C.fill(x, '#fbfbf8', r, [6, 12, 36, 22]); C.stroke(x, r, 2.4);
      C.rect(x, 21, 16, 6, 14, r, 0.4); C.fill(x, '#ef4b5c', r, null);
      C.rect(x, 17, 20, 14, 6, r, 0.4); C.fill(x, '#ef4b5c', r, null);
      C.line(x, 9, 33, 39, 33, r, 1.4, '#ef4b5c');
    },
    // 精靈射手：弓和箭
    'cls-archer'(x, r) {
      x.beginPath(); x.moveTo(12, 6); x.quadraticCurveTo(42, 10, 38, 40); C.stroke(x, r, 4.2); C.stroke(x, r, 2.6, '#a0703f');
      C.line(x, 12, 6, 38, 40, r, 1.2, '#2b2a33', 0.3);
      C.line(x, 8, 42, 34, 14, r, 2.2);
      x.beginPath(); x.moveTo(37, 11); x.lineTo(29, 13); x.lineTo(35, 19); x.closePath(); C.fill(x, '#c6cbd6', r, null); C.stroke(x, r, 1.8);
      x.beginPath(); x.moveTo(8, 42); x.lineTo(7, 35); x.lineTo(12, 38); x.closePath(); C.fill(x, '#7fd1a8', r, null); C.stroke(x, r, 1.4);
      x.beginPath(); x.moveTo(8, 42); x.lineTo(15, 43); x.lineTo(12, 38); x.closePath(); C.fill(x, '#7fd1a8', r, null); C.stroke(x, r, 1.4);
    },
    // 超能力霸王：槓鈴
    'cls-tank'(x, r) {
      C.rect(x, 4, 22, 40, 4, r, 0.4); C.fill(x, '#c6cbd6', r, null); C.stroke(x, r, 1.8);
      [[8, 12], [14, 16], [34, 16], [40, 12]].forEach(([cx, h], i) => {
        C.rect(x, cx - 3, 24 - h, 6, h * 2, r, 0.6); C.fill(x, i === 1 || i === 2 ? '#4f5d78' : '#2f3b55', r, null); C.stroke(x, r, 2);
      });
    },
    // 陵媒：溜冰鞋
    'cls-skater'(x, r) {
      x.beginPath(); x.moveTo(14, 6); x.lineTo(26, 6); x.lineTo(27, 22); x.quadraticCurveTo(40, 24, 41, 32); x.lineTo(41, 35); x.lineTo(11, 35); x.lineTo(12, 18); x.closePath();
      C.fill(x, '#fbfbf8', r, [11, 6, 30, 29]); C.stroke(x, r, 2.4);
      [12, 16, 20].forEach(yy => C.line(x, 16, yy, 24, yy + 1, r, 1.4, '#ef4b5c'));
      C.line(x, 15, 35, 15, 40, r, 1.8); C.line(x, 36, 35, 36, 40, r, 1.8);
      x.beginPath(); x.moveTo(6, 40); x.lineTo(42, 40); x.quadraticCurveTo(45, 40, 44, 37); C.stroke(x, r, 3, '#8a93a6'); C.stroke(x, r, 1.4);
    },
    // 召喚師：飛碟
    'cls-summoner'(x, r) {
      C.blob(x, 24, 20, 10, 9, r, 0.05); C.fill(x, '#bfe9ff', r, [14, 11, 20, 18]); C.stroke(x, r, 2.2);
      C.blob(x, 24, 28, 20, 7, r, 0.04); C.fill(x, '#8a93a6', r, [4, 21, 40, 14]); C.stroke(x, r, 2.4);
      [12, 20, 28, 36].forEach((cx, i) => { C.blob(x, cx, 29, 2, 1.8, r, 0.1); C.fill(x, ['#ffd23f', '#ff8fab', '#7fd1a8', '#ffd23f'][i], r, null); });
      x.beginPath(); x.moveTo(17, 35); x.lineTo(12, 45); x.lineTo(36, 45); x.lineTo(31, 35); x.closePath(); x.fillStyle = 'rgba(255,240,150,.55)'; x.fill();
    },
    // 靈魂歌姬：麥克風
    'cls-singer'(x, r) {
      x.save(); x.translate(24, 24); x.rotate(-0.5); x.translate(-24, -24);
      C.rect(x, 20, 22, 8, 20, r, 0.6); C.fill(x, '#2f3b55', r, null); C.stroke(x, r, 2.2);
      C.rect(x, 18, 20, 12, 4, r, 0.4); C.fill(x, '#c6cbd6', r, null); C.stroke(x, r, 1.6);
      C.blob(x, 24, 13, 9, 9, r, 0.04); C.fill(x, '#c6cbd6', r, [15, 4, 18, 18]); C.stroke(x, r, 2.4);
      C.line(x, 17, 10, 31, 10, r, 1.1, '#6b7488'); C.line(x, 16, 15, 32, 15, r, 1.1, '#6b7488'); C.line(x, 24, 5, 24, 21, r, 1.1, '#6b7488');
      x.restore();
      C.dots(x, 34, 6, 10, 10, 3, '#ff8fab', r, 1.4);
    },
    // 插畫結界師：調色盤
    'cls-painter'(x, r) {
      C.blob(x, 23, 25, 18, 15, r, 0.06); C.fill(x, '#f3d9a8', r, [5, 10, 36, 30]); C.stroke(x, r, 2.4);
      C.blob(x, 30, 32, 4, 3.5, r, 0.1); x.fillStyle = '#eef1f5'; x.fill(); C.stroke(x, r, 1.8);
      [[14, 20, '#ef4b5c'], [22, 16, '#ffd23f'], [31, 19, '#4f7cc2'], [14, 30, '#7fd1a8']].forEach(([cx, cy, col]) => {
        C.blob(x, cx, cy, 3.6, 3.2, r, 0.1); C.fill(x, col, r, null); C.stroke(x, r, 1.4);
      });
      C.line(x, 34, 6, 42, 15, r, 3.2, '#a0703f'); C.line(x, 33, 5, 36, 8, r, 3.4, '#2b2a33');
    },

    // 背包
    'btn-bag'(x, r) {
      x.beginPath(); x.moveTo(17, 12); x.quadraticCurveTo(24, 2, 31, 12); C.stroke(x, r, 3);
      C.blob(x, 24, 27, 15, 16, r, 0.05); C.fill(x, '#e8733a', r, [9, 11, 30, 32]); C.stroke(x, r, 2.4);
      C.rect(x, 15, 28, 18, 11, r, 0.7); C.fill(x, '#c9562a', r, [15, 28, 18, 11]); C.stroke(x, r, 2);
      C.line(x, 15, 21, 33, 21, r, 1.8);
      C.blob(x, 24, 32, 2.4, 2.4, r, 0.1); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.4);
    },
    // 裝備：小洋裝
    'btn-gear'(x, r) {
      x.beginPath(); x.moveTo(18, 5); x.lineTo(30, 5); x.lineTo(31, 15); x.lineTo(28, 20); x.lineTo(41, 42); x.lineTo(7, 42); x.lineTo(20, 20); x.lineTo(17, 15); x.closePath();
      C.fill(x, '#ff8fab', r, [7, 5, 34, 37]); C.stroke(x, r, 2.4);
      C.line(x, 20, 20, 28, 20, r, 1.8);
      C.dots(x, 12, 26, 24, 14, 7, '#fbfbf8', r, 1.3);
    },
    // 家具：木椅子
    'btn-furn'(x, r) {
      C.rect(x, 12, 5, 24, 18, r, 0.8); C.fill(x, '#c98a4b', r, [12, 5, 24, 18]); C.stroke(x, r, 2.2);
      C.line(x, 18, 9, 18, 20, r, 1.2); C.line(x, 24, 9, 24, 20, r, 1.2); C.line(x, 30, 9, 30, 20, r, 1.2);
      C.rect(x, 9, 24, 30, 6, r, 0.6); C.fill(x, '#a0703f', r, [9, 24, 30, 6]); C.stroke(x, r, 2.2);
      C.line(x, 12, 30, 11, 43, r, 2.6); C.line(x, 36, 30, 37, 43, r, 2.6);
      C.line(x, 12, 37, 36, 37, r, 1.6);
    },
    // 點歌：音符
    'btn-song'(x, r) {
      x.beginPath(); x.moveTo(17, 34); x.lineTo(17, 10); x.lineTo(37, 6); x.lineTo(37, 30); C.stroke(x, r, 2.8);
      C.rect(x, 17, 8, 20, 5, r, 0.4); C.fill(x, '#2b2a33', r, null);
      C.blob(x, 13, 35, 6, 5, r, 0.06); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 2.2);
      C.blob(x, 33, 31, 6, 5, r, 0.06); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 2.2);
    },
    // 工具包：收起背包、裝備、家具、點歌的紅色工具箱
    'btn-kit'(x, r) {
      x.beginPath(); x.moveTo(17, 15); x.lineTo(17, 9); x.quadraticCurveTo(24, 6, 31, 9); x.lineTo(31, 15); C.stroke(x, r, 3);
      C.rect(x, 5, 15, 38, 26, r, 0.8); C.fill(x, '#ef4b5c', r, [5, 15, 38, 26]); C.stroke(x, r, 2.4);
      C.line(x, 6, 24, 42, 24, r, 1.8);
      C.rect(x, 20, 21, 8, 7, r, 0.4); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.6);
    },
    // 戰情室電視牆：有天線的小電視
    'act-tv'(x, r) {
      C.line(x, 24, 13, 15, 3, r, 2); C.line(x, 24, 13, 33, 3, r, 2);
      C.rect(x, 5, 13, 38, 27, r, 0.8); C.fill(x, '#4f7cc2', r, [5, 13, 38, 27]); C.stroke(x, r, 2.4);
      C.rect(x, 10, 17, 22, 18, r, 0.6); C.fill(x, '#bfe6ff', r, [10, 17, 22, 18]); C.stroke(x, r, 1.8);
      C.blob(x, 38, 21, 2.2, 2.2, r, 0.1); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.2);
      C.blob(x, 38, 30, 2.2, 2.2, r, 0.1); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 1.2);
      C.line(x, 12, 40, 10, 45, r, 2.2); C.line(x, 36, 40, 38, 45, r, 2.2);
    },
    // 遊戲室：手把
    'btn-games'(x, r) {
      C.smooth(x, [[8, 18], [20, 15], [28, 15], [40, 18], [44, 32], [40, 38], [33, 34], [24, 31], [15, 34], [8, 38], [4, 32]]);
      C.fill(x, '#8a5cd6', r, [4, 15, 40, 23]); C.stroke(x, r, 2.4);
      C.line(x, 14, 21, 14, 29, r, 2.4, '#fbf6e9'); C.line(x, 10, 25, 18, 25, r, 2.4, '#fbf6e9');
      C.blob(x, 33, 22, 2.4, 2.4, r, 0.1); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.2);
      C.blob(x, 37, 27, 2.4, 2.4, r, 0.1); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 1.2);
    },
    // 放下蛋糕：一塊插蠟燭的草莓蛋糕
    'btn-cake'(x, r) {
      C.line(x, 24, 6, 24, 15, r, 2.4, '#4f7cc2');
      C.blob(x, 24, 4, 2, 3, r, 0.1); C.fill(x, '#ffb020', r, null);
      C.rect(x, 7, 15, 34, 26, r, 0.8); C.fill(x, '#fbf6e9', r, [7, 15, 34, 26]); C.stroke(x, r, 2.4);
      C.rect(x, 7, 26, 34, 5, r, 0.4); C.fill(x, '#ff8fab', r, null); C.stroke(x, r, 1.4);
      [13, 24, 35].forEach(cx => { C.blob(x, cx, 15, 3.2, 3, r, 0.1); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 1.4); });
    },
    // 音量：喇叭，關掉的時候打一個叉
    'btn-vol'(x, r) {
      x.beginPath(); x.moveTo(6, 18); x.lineTo(14, 18); x.lineTo(25, 9); x.lineTo(25, 39); x.lineTo(14, 30); x.lineTo(6, 30); x.closePath();
      C.fill(x, '#ffd23f', r, [6, 9, 19, 30]); C.stroke(x, r, 2.4);
      x.beginPath(); x.arc(27, 24, 8, -0.8, 0.8); C.stroke(x, r, 2.2);
      x.beginPath(); x.arc(27, 24, 14, -0.8, 0.8); C.stroke(x, r, 2.2);
    },
    'btn-mute'(x, r) {
      x.beginPath(); x.moveTo(6, 18); x.lineTo(14, 18); x.lineTo(25, 9); x.lineTo(25, 39); x.lineTo(14, 30); x.lineTo(6, 30); x.closePath();
      C.fill(x, '#cfd5e0', r, [6, 9, 19, 30]); C.stroke(x, r, 2.4);
      C.line(x, 31, 17, 43, 31, r, 2.8, '#ef4b5c'); C.line(x, 43, 17, 31, 31, r, 2.8, '#ef4b5c');
    },
    // ---- 你畫我猜的畫筆工具 ----
    'tool-pen'(x, r) {
      x.save(); x.translate(24, 24); x.rotate(0.8);
      C.rect(x, -5, -18, 10, 26, r, 0.5); C.fill(x, '#ffb020', r, [-5, -18, 10, 26]); C.stroke(x, r, 2.2);
      x.beginPath(); x.moveTo(-5, 8); x.lineTo(0, 18); x.lineTo(5, 8); x.closePath(); C.fill(x, '#f2d9b5', r, null); C.stroke(x, r, 2);
      C.rect(x, -5, -22, 10, 5, r, 0.4); C.fill(x, '#ff8fab', r, null); C.stroke(x, r, 1.8);
      x.restore();
    },
    'tool-circle'(x, r) { C.blob(x, 24, 24, 15, 15, r, 0.05); C.stroke(x, r, 3.2, '#4f7cc2'); },
    'tool-rect'(x, r) { C.rect(x, 9, 11, 30, 26, r, 1.2); C.stroke(x, r, 3.2, '#4f7cc2'); },
    'tool-tri'(x, r) { x.beginPath(); x.moveTo(24, 8); x.lineTo(41, 38); x.lineTo(7, 38); x.closePath(); C.stroke(x, r, 3.2, '#4f7cc2'); },
    'tool-eraser'(x, r) {
      x.save(); x.translate(24, 24); x.rotate(-0.5);
      C.rect(x, -16, -9, 32, 18, r, 0.6); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 2.2);
      C.rect(x, -16, -9, 12, 18, r, 0.4); C.fill(x, '#7fd1ff', r, null); C.stroke(x, r, 2);
      x.restore();
    },
    // ---- 物資：箱子上的貼紙、背包裡的圖 ----
    // 台灣雞排：大大一片、炸得金黃
    'item-chicken'(x, r) {
      C.smooth(x, [[10, 12], [22, 6], [36, 9], [43, 20], [40, 34], [30, 43], [16, 41], [6, 30], [5, 19]]);
      C.fill(x, '#e0a040', r, [5, 6, 38, 37]); C.stroke(x, r, 2.4);
      C.dots(x, 10, 12, 28, 26, 14, '#b8732a', r, 1.4);
      C.dots(x, 12, 14, 24, 22, 8, '#ffd27a', r, 1.2);
    },
    // 泡麵：一杯杯麵
    'item-noodle'(x, r) {
      x.beginPath(); x.moveTo(9, 14); x.lineTo(39, 14); x.lineTo(35, 43); x.lineTo(13, 43); x.closePath();
      C.fill(x, '#fbfbf8', r, [9, 14, 30, 29]); C.stroke(x, r, 2.4);
      C.rect(x, 11, 24, 26, 8, r, 0.4); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 1.4);
      C.rect(x, 6, 9, 36, 6, r, 0.6); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 2.2);
      [17, 25, 32].forEach(sx => { x.beginPath(); x.moveTo(sx, 8); x.quadraticCurveTo(sx - 3, 5, sx, 2); C.stroke(x, r, 1.4, '#9aa3ad'); });
    },
    // 礦泉水：寶特瓶
    'item-water'(x, r) {
      C.rect(x, 20, 3, 8, 6, r, 0.4); C.fill(x, '#4f7cc2', r, null); C.stroke(x, r, 2);
      x.beginPath(); x.moveTo(20, 9); x.lineTo(28, 9); x.quadraticCurveTo(35, 14, 35, 20); x.lineTo(35, 42); x.quadraticCurveTo(24, 45, 13, 42);
      x.lineTo(13, 20); x.quadraticCurveTo(13, 14, 20, 9); x.closePath();
      C.fill(x, '#bfe6ff', r, [13, 9, 22, 35]); C.stroke(x, r, 2.4);
      C.rect(x, 13, 24, 22, 8, r, 0.4); C.fill(x, '#7fd1a8', r, null); C.stroke(x, r, 1.4);
      C.line(x, 17, 15, 17, 21, r, 1.6, 'rgba(255,255,255,.9)');
    },
    // 蔬菜：一顆高麗菜
    'item-veggie'(x, r) {
      C.blob(x, 24, 26, 17, 16, r, 0.08); C.fill(x, '#7fd1a8', r, [7, 10, 34, 32]); C.stroke(x, r, 2.4);
      C.blob(x, 24, 28, 10, 11, r, 0.1); C.fill(x, '#c3ecb5', r, null); C.stroke(x, r, 1.6);
      x.beginPath(); x.moveTo(24, 18); x.quadraticCurveTo(21, 28, 24, 39); C.stroke(x, r, 1.4, '#4c9a6a');
      x.beginPath(); x.moveTo(11, 22); x.quadraticCurveTo(15, 30, 13, 37); C.stroke(x, r, 1.2, '#4c9a6a');
      x.beginPath(); x.moveTo(37, 22); x.quadraticCurveTo(33, 30, 35, 37); C.stroke(x, r, 1.2, '#4c9a6a');
    },
    // 台灣小吃：一杯珍奶
    'item-bubbletea'(x, r) {
      C.line(x, 27, 12, 33, 1, r, 3, '#ef4b5c');
      x.beginPath(); x.moveTo(11, 13); x.lineTo(37, 13); x.lineTo(33, 44); x.lineTo(15, 44); x.closePath();
      C.fill(x, '#e8c9a0', r, [11, 13, 26, 31]); C.stroke(x, r, 2.4);
      C.blob(x, 24, 13, 15, 3.5, r, 0.06); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 2);
      [[18, 39], [23, 40], [29, 39], [20, 35], [26, 35], [31, 34], [17, 34]].forEach(([px, py]) => {
        C.blob(x, px, py, 2.2, 2.2, r, 0.1); C.fill(x, '#3a2a22', r, null);
      });
    },
    // 綜合：上面畫問號的神秘箱
    'item-mix'(x, r) {
      C.rect(x, 8, 14, 32, 28, r, 0.8); C.fill(x, '#ffd23f', r, [8, 14, 32, 28]); C.stroke(x, r, 2.4);
      C.rect(x, 6, 10, 36, 7, r, 0.6); C.fill(x, '#ffb020', r, null); C.stroke(x, r, 2.2);
      x.beginPath(); x.moveTo(19, 24); x.quadraticCurveTo(19, 19, 24, 19); x.quadraticCurveTo(29, 19, 29, 24); x.quadraticCurveTo(29, 27, 24, 29); x.lineTo(24, 32);
      C.stroke(x, r, 2.6);
      C.blob(x, 24, 37, 1.8, 1.8, r, 0.1); C.fill(x, '#2b2a33', r, null);
    },
    // 技能說明：打開的書
    'btn-book'(x, r) {
      x.beginPath(); x.moveTo(24, 12); x.quadraticCurveTo(14, 7, 5, 10); x.lineTo(5, 38); x.quadraticCurveTo(14, 35, 24, 40); x.closePath();
      C.fill(x, '#fbfbf8', r, [5, 7, 19, 33]); C.stroke(x, r, 2.2);
      x.beginPath(); x.moveTo(24, 12); x.quadraticCurveTo(34, 7, 43, 10); x.lineTo(43, 38); x.quadraticCurveTo(34, 35, 24, 40); x.closePath();
      C.fill(x, '#fbfbf8', r, [24, 7, 19, 33]); C.stroke(x, r, 2.2);
      [17, 23, 29].forEach(yy => { C.line(x, 9, yy, 20, yy + 1, r, 1.2, '#8a93a6'); C.line(x, 28, yy + 1, 39, yy, r, 1.2, '#8a93a6'); });
      C.line(x, 24, 40, 24, 44, r, 2.6, '#ef4b5c');
    },
    // 煙火
    'btn-fw'(x, r) {
      const cols = ['#ef4b5c', '#ffd23f', '#4f7cc2', '#7fd1a8', '#ff8fab', '#8a5cd6'];
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2, c = cols[i % cols.length];
        C.line(x, 24 + Math.cos(a) * 6, 22 + Math.sin(a) * 6, 24 + Math.cos(a) * 17, 22 + Math.sin(a) * 17, r, 2.4, c, 0.8);
        C.blob(x, 24 + Math.cos(a) * 19, 22 + Math.sin(a) * 19, 1.6, 1.6, r, 0.1); C.fill(x, c, r, null);
      }
      C.blob(x, 24, 22, 4, 4, r, 0.1); C.fill(x, '#fff3d6', r, null); C.stroke(x, r, 1.6);
    },

    // 普通攻擊：拳頭
    'sk-strike'(x, r) {
      C.rect(x, 18, 32, 14, 12, r, 0.6); C.fill(x, '#ffe0c2', r, null); C.stroke(x, r, 2.2);
      C.blob(x, 24, 22, 15, 12, r, 0.05); C.fill(x, '#ffe0c2', r, [9, 10, 30, 24]); C.stroke(x, r, 2.4);
      [14, 21, 28].forEach(cx => C.line(x, cx + 3, 12, cx + 3, 21, r, 1.4));
      x.beginPath(); x.moveTo(10, 24); x.quadraticCurveTo(22, 22, 28, 28); C.stroke(x, r, 2);
      C.dots(x, 12, 12, 22, 8, 3, 'rgba(255,255,255,.7)', r, 1.2);
      C.rect(x, 17, 36, 16, 6, r, 0.5); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 1.8);
    },
    // 強力一擊：閃電
    'sk-power'(x, r) {
      C.smooth(x, [[25, 3], [27, 3], [10, 27], [21, 27], [21, 27], [15, 45], [17, 45], [39, 19], [28, 19], [28, 19], [36, 3]]);
      C.fill(x, '#ffd23f', r, [12, 3, 26, 42]); C.stroke(x, r, 2.4);
    },
    // 堆沙包：三層疊起來，後面的先畫
    'sk-sandbag'(x, r) {
      const bag = (cx, cy) => { C.blob(x, cx, cy, 9, 5.5, r, 0.06); C.fill(x, '#d9b77e', r, [cx - 9, cy - 6, 18, 12]); C.stroke(x, r, 2.2);
        C.line(x, cx - 2, cy - 4.5, cx - 1, cy + 4.5, r, 1, '#8a6a3a'); };
      bag(24, 16); bag(18, 27); bag(30, 27); bag(12, 38); bag(24, 38); bag(36, 38);
    },
    // ---- 靠近 NPC／物件時頭上提示泡泡用的 icon ----
    // 敲箱子：木槌
    'act-crate'(x, r) {
      x.save(); x.translate(24, 24); x.rotate(-0.6);
      C.rect(x, -3, -4, 6, 24, r, 0.5); C.fill(x, '#c28b52', r, [-3, -4, 6, 24]); C.stroke(x, r, 2.2);
      C.rect(x, -13, -16, 26, 13, r, 0.8); C.fill(x, '#8f5f30', r, [-13, -16, 26, 13]); C.stroke(x, r, 2.4);
      C.line(x, -6, -15, -6, -4, r, 1.2, '#6b4a32');
      x.restore();
      C.line(x, 36, 8, 41, 4, r, 1.8); C.line(x, 39, 13, 45, 12, r, 1.8);
    },
    // 煮泡麵：冒煙的碗
    'act-cook'(x, r) {
      [17, 24, 31].forEach((sx, i) => { x.beginPath(); x.moveTo(sx, 17); x.quadraticCurveTo(sx - 4, 12, sx, 8 - i % 2 * 2); x.quadraticCurveTo(sx + 4, 4, sx, 1);
        C.stroke(x, r, 1.6, '#9aa3ad'); });
      x.beginPath(); x.moveTo(6, 22); x.lineTo(42, 22); x.quadraticCurveTo(40, 40, 24, 41); x.quadraticCurveTo(8, 40, 6, 22); x.closePath();
      C.fill(x, '#ef4b5c', r, [6, 22, 36, 19]); C.stroke(x, r, 2.4);
      C.blob(x, 24, 22, 17, 3.2, r, 0.08); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.8);
      C.line(x, 12, 30, 36, 30, r, 1.4, '#fbf6e9');
      C.line(x, 30, 21, 42, 6, r, 2, '#7a4f2e'); C.line(x, 34, 21, 45, 9, r, 2, '#7a4f2e');
    },
    // 轉職：資料夾
    'act-mentor'(x, r) {
      x.beginPath(); x.moveTo(6, 13); x.lineTo(18, 13); x.lineTo(21, 9); x.lineTo(30, 9); x.lineTo(30, 13); x.lineTo(42, 13); x.lineTo(42, 39); x.lineTo(6, 39); x.closePath();
      C.fill(x, '#e0b84a', r, [6, 9, 36, 30]); C.stroke(x, r, 2.4);
      C.rect(x, 11, 16, 26, 10, r, 0.5); C.fill(x, '#fbf6e9', r, null); C.stroke(x, r, 1.4);
      C.line(x, 14, 20, 32, 20, r, 1.2, '#4f7cc2');
      x.beginPath(); x.moveTo(5, 22); x.lineTo(43, 22); x.lineTo(41, 40); x.lineTo(7, 40); x.closePath();
      C.fill(x, '#f2cc5e', r, [5, 22, 38, 18]); C.stroke(x, r, 2.4);
    },
    // 前往副本：古城門
    'act-guard'(x, r) {
      [8, 18, 28, 36].forEach(cx => { C.rect(x, cx, 7, 5, 6, r, 0.4); C.fill(x, '#8d8577', r, null); C.stroke(x, r, 1.6); });
      C.rect(x, 6, 12, 36, 29, r, 0.8); C.fill(x, '#a89f8f', r, [6, 12, 36, 29]); C.stroke(x, r, 2.4);
      x.beginPath(); x.moveTo(16, 41); x.lineTo(16, 28); x.quadraticCurveTo(24, 17, 32, 28); x.lineTo(32, 41); x.closePath();
      C.fill(x, '#5a3d2a', r, [16, 20, 16, 21]); C.stroke(x, r, 2);
      C.line(x, 24, 22, 24, 41, r, 1.2, '#2b2a33');
      C.line(x, 9, 20, 13, 20, r, 1.2, '#6f675b'); C.line(x, 35, 34, 39, 34, r, 1.2, '#6f675b');
    },

    // 前往 101：台北101 的剪影（一節一節往上疊）
    'act-elevator'(x, r) {
      C.rect(x, 20, 40, 8, 4, r, 0.4); C.fill(x, '#2f5f5c', r, null); C.stroke(x, r, 1.8);
      [[17, 34, 14, 6], [18, 28, 12, 6], [18, 22, 12, 6], [19, 16, 10, 6], [20, 10, 8, 6]].forEach(([a, b, w, h], i) => {
        x.beginPath(); x.moveTo(a, b + h); x.lineTo(a - 1.5, b); x.lineTo(a + w + 1.5, b); x.lineTo(a + w, b + h); x.closePath();
        C.fill(x, i % 2 ? '#7fb3ad' : '#5f8f8c', r, null); C.stroke(x, r, 1.8);
      });
      C.line(x, 24, 10, 24, 3, r, 1.8);
      x.beginPath(); x.moveTo(36, 6); x.lineTo(33, 12); x.lineTo(36, 12); x.lineTo(33, 18); C.stroke(x, r, 1.8, '#ffb020');
    },
    // 進副本傳送門：石框裡一圈一圈轉的漩渦
    'act-portal'(x, r) {
      C.blob(x, 24, 26, 18, 18, r, 0.06); C.fill(x, '#9aa3b5', r, [6, 8, 36, 36]); C.stroke(x, r, 2.4);
      C.blob(x, 24, 26, 13, 13, r, 0.06); C.fill(x, '#2f3b55', r, null); C.stroke(x, r, 1.8);
      x.beginPath();
      for (let i = 0; i <= 40; i++) { const a = i * 0.42, d = 1 + i * 0.27; x[i ? 'lineTo' : 'moveTo'](24 + Math.cos(a) * d, 26 + Math.sin(a) * d); }
      C.stroke(x, r, 2, '#ffb020');
      [[10, 9], [38, 11], [40, 38]].forEach(([a, b]) => { C.blob(x, a, b, 2.4, 2.4, r, 0.1, 8); C.fill(x, '#ffd23f', r, null); });
    },
    // 回總部：小小的總部房子
    'act-home'(x, r) {
      x.beginPath(); x.moveTo(6, 22); x.lineTo(24, 7); x.lineTo(42, 22); x.closePath();
      C.fill(x, '#ff7a2f', r, [6, 7, 36, 15]); C.stroke(x, r, 2.4);
      C.rect(x, 10, 21, 28, 19, r, 0.6); C.fill(x, '#f5ecd9', r, [10, 21, 28, 19]); C.stroke(x, r, 2.4);
      C.rect(x, 20, 28, 8, 12, r, 0.4); C.fill(x, '#5a3d2a', r, null); C.stroke(x, r, 1.8);
      C.rect(x, 13, 25, 5, 5, r, 0.3); C.fill(x, '#bcd4ea', r, null); C.stroke(x, r, 1.4);
      C.rect(x, 31, 25, 5, 5, r, 0.3); C.fill(x, '#bcd4ea', r, null); C.stroke(x, r, 1.4);
    },
    // 跟希臘少女說話：金色橄欖葉冠
    'act-greek'(x, r) {
      x.beginPath(); x.arc(24, 26, 15, Math.PI * 0.75, Math.PI * 2.25); C.stroke(x, r, 2, '#a07a20');
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * (0.8 + i * 0.145), px = 24 + Math.cos(a) * 15, py = 26 + Math.sin(a) * 15;
        x.save(); x.translate(px, py); x.rotate(a + Math.PI / 2 + (i % 2 ? 0.7 : -0.7));
        C.blob(x, 0, -4, 2.6, 5, r, 0.08, 10); C.fill(x, '#e8c04a', r, null); C.stroke(x, r, 1.4);
        x.restore();
      }
    },
    // 許願池：愛心（按讚）
    'wish-heart'(x, r) {
      C.smooth(x, [[24, 42], [8, 28], [6, 16], [12, 9], [20, 9], [24, 15], [28, 9], [36, 9], [42, 16], [40, 28]]);
      C.fill(x, '#ef4b5c', r, [6, 9, 36, 33]); C.stroke(x, r, 2.4);
      C.blob(x, 15, 17, 3.5, 2.5, r, 0.1); x.fillStyle = 'rgba(255,255,255,.75)'; x.fill();
    },
    // 許願池：沒按過的空心愛心
    'wish-heart-off'(x, r) {
      C.smooth(x, [[24, 42], [8, 28], [6, 16], [12, 9], [20, 9], [24, 15], [28, 9], [36, 9], [42, 16], [40, 28]]);
      C.fill(x, '#fbf6e9', r, null); C.stroke(x, r, 2.4);
    },
    // 許願池：丟進去的金幣
    'wish-coin'(x, r) {
      C.blob(x, 24, 24, 17, 17, r, 0.04); C.fill(x, '#ffd23f', r, [7, 7, 34, 34]); C.stroke(x, r, 2.6);
      C.blob(x, 24, 24, 11, 11, r, 0.05); C.stroke(x, r, 1.6, '#c9962a');
      C.line(x, 24, 17, 24, 31, r, 2.2, '#c9962a');
      C.blob(x, 17, 15, 3, 2, r, 0.1); x.fillStyle = 'rgba(255,255,255,.85)'; x.fill();
    },
    // 小樹屋：樹冠上蓋一間有紅屋頂的小木屋，下面是樹幹和梯子
    'btn-tree'(x, r) {
      C.rect(x, 20, 30, 8, 15, r, 0.6); C.fill(x, '#a0703f', r, [20, 30, 8, 15]); C.stroke(x, r, 2.2);
      C.line(x, 33, 30, 35, 45, r, 1.6); C.line(x, 38, 30, 40, 45, r, 1.6);
      [34, 39, 44].forEach(yy => C.line(x, 33.5, yy - 1, 39.5, yy - 1, r, 1.3));
      C.blob(x, 13, 26, 10, 8, r, 0.08); C.fill(x, '#7fd1a8', r, [3, 18, 20, 16]); C.stroke(x, r, 2.2);
      C.blob(x, 35, 25, 10, 8, r, 0.08); C.fill(x, '#7fd1a8', r, [25, 17, 20, 16]); C.stroke(x, r, 2.2);
      C.rect(x, 13, 15, 22, 15, r, 0.6); C.fill(x, '#e8b878', r, [13, 15, 22, 15]); C.stroke(x, r, 2.2);
      x.beginPath(); x.moveTo(10, 16); x.lineTo(24, 4); x.lineTo(38, 16); x.closePath(); C.fill(x, '#ef4b5c', r, [10, 4, 28, 12]); C.stroke(x, r, 2.4);
      C.rect(x, 18, 19, 6, 6, r, 0.4); C.fill(x, '#ffe58a', r, null); C.stroke(x, r, 1.4);
      C.line(x, 18, 22, 24, 22, r, 1); C.line(x, 21, 19, 21, 25, r, 1);
      C.rect(x, 27, 20, 5, 10, r, 0.4); C.fill(x, '#a0703f', r, null); C.stroke(x, r, 1.4);
    },
    // 麥克風開著：圓頭麥克風加聲波
    'btn-mic'(x, r) {
      C.rect(x, 17, 6, 14, 22, r, 0.6); C.fill(x, '#7fd1a8', r, [17, 6, 14, 22]); C.stroke(x, r, 2.4);
      C.line(x, 19, 13, 29, 13, r, 1.2, '#3c8a66'); C.line(x, 19, 19, 29, 19, r, 1.2, '#3c8a66');
      x.beginPath(); x.moveTo(11, 22); x.quadraticCurveTo(12, 34, 24, 34); x.quadraticCurveTo(36, 34, 37, 22); C.stroke(x, r, 2.2);
      C.line(x, 24, 34, 24, 42, r, 2.2); C.line(x, 16, 42, 32, 42, r, 2.4);
      x.beginPath(); x.moveTo(40, 10); x.quadraticCurveTo(44, 16, 40, 22); C.stroke(x, r, 1.8, '#4f7cc2');
      x.beginPath(); x.moveTo(8, 10); x.quadraticCurveTo(4, 16, 8, 22); C.stroke(x, r, 1.8, '#4f7cc2');
    },
    // 麥克風關著：灰色麥克風畫一道紅斜線
    'btn-mic-off'(x, r) {
      C.rect(x, 17, 6, 14, 22, r, 0.6); C.fill(x, '#c6cbd6', r, [17, 6, 14, 22]); C.stroke(x, r, 2.4);
      x.beginPath(); x.moveTo(11, 22); x.quadraticCurveTo(12, 34, 24, 34); x.quadraticCurveTo(36, 34, 37, 22); C.stroke(x, r, 2.2);
      C.line(x, 24, 34, 24, 42, r, 2.2); C.line(x, 16, 42, 32, 42, r, 2.4);
      C.line(x, 8, 6, 40, 40, r, 4.4, '#fbf6e9'); C.line(x, 8, 6, 40, 40, r, 2.8, '#ef4b5c');
    },
    // 視訊：小攝影機，旁邊一個鏡頭
    'btn-cam'(x, r) {
      C.rect(x, 5, 14, 26, 20, r, 0.6); C.fill(x, '#8ec5ff', r, [5, 14, 26, 20]); C.stroke(x, r, 2.4);
      x.beginPath(); x.moveTo(31, 21); x.lineTo(43, 14); x.lineTo(43, 34); x.lineTo(31, 27); x.closePath();
      C.fill(x, '#4f7cc2', r, [31, 14, 12, 20]); C.stroke(x, r, 2.2);
      C.blob(x, 12, 20, 2.6, 2.4, r, 0.1); C.fill(x, '#ef4b5c', r, null); C.stroke(x, r, 1.2);
    },
    'btn-cam-off'(x, r) {
      C.rect(x, 5, 14, 26, 20, r, 0.6); C.fill(x, '#c6cbd6', r, [5, 14, 26, 20]); C.stroke(x, r, 2.4);
      x.beginPath(); x.moveTo(31, 21); x.lineTo(43, 14); x.lineTo(43, 34); x.lineTo(31, 27); x.closePath();
      C.fill(x, '#9aa3b2', r, [31, 14, 12, 20]); C.stroke(x, r, 2.2);
      C.line(x, 7, 6, 41, 42, r, 4.4, '#fbf6e9'); C.line(x, 7, 6, 41, 42, r, 2.8, '#ef4b5c');
    },
    // 分享螢幕：一台螢幕，畫面上一支往上的箭頭
    'btn-screen'(x, r) {
      C.rect(x, 4, 7, 40, 27, r, 0.6); C.fill(x, '#fbf6e9', r, [4, 7, 40, 27]); C.stroke(x, r, 2.4);
      C.line(x, 24, 34, 24, 41, r, 2.2); C.line(x, 14, 42, 34, 42, r, 2.4);
      C.line(x, 24, 29, 24, 13, r, 2.6, '#3c8a66');
      x.beginPath(); x.moveTo(17, 19); x.lineTo(24, 12); x.lineTo(31, 19); C.stroke(x, r, 2.6, '#3c8a66');
    },
    // 大畫面：一個畫面，四個角往外撐
    'btn-stage'(x, r) {
      C.rect(x, 12, 14, 24, 20, r, 0.6); C.fill(x, '#8ec5ff', r, [12, 14, 24, 20]); C.stroke(x, r, 2.2);
      [[4, 6, 1, 1], [44, 6, -1, 1], [4, 42, 1, -1], [44, 42, -1, -1]].forEach(([cx, cy, dx, dy]) => {
        x.beginPath(); x.moveTo(cx, cy + 9 * dy); x.lineTo(cx, cy); x.lineTo(cx + 9 * dx, cy); C.stroke(x, r, 2.8, '#3c8a66');
      });
    },
    // 許願池：「做好了」的紅色印章（字另外疊上去）
    'wish-stamp'(x, r) {
      C.blob(x, 24, 24, 21, 21, r, 0.05, 28); C.stroke(x, r, 3, '#d8323f');
      C.blob(x, 24, 24, 16.5, 16.5, r, 0.06, 26); C.stroke(x, r, 1.4, '#d8323f');
    },
  };

  const cache = {};
  // 畫成一張 144x144 的畫布（遊戲畫面裡要直接貼圖的時候用）
  function canvas(key) {
    if (!DRAW[key] || !C) return null;
    const cv = document.createElement('canvas');
    cv.width = cv.height = SIZE * SCALE;
    const x = cv.getContext('2d');
    x.scale(SCALE, SCALE);
    // 每個 icon 固定種子，每次畫出來都一樣
    DRAW[key](x, C.rng([...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)));
    return cv;
  }
  function url(key) {
    if (cache[key]) return cache[key];
    const cv = canvas(key);
    return cv ? (cache[key] = cv.toDataURL()) : null;
  }
  // 手繪 icon 的 <img>，沒有的話用 emoji 加墨線外框
  function el(key, emoji, cls) {
    const u = url(key);
    if (u) { const i = document.createElement('img'); i.src = u; i.alt = ''; i.className = 'hq-icon' + (cls ? ' ' + cls : ''); return i; }
    const s = document.createElement('span'); s.className = 'em-ol' + (cls ? ' ' + cls : ''); s.textContent = emoji; return s;
  }
  // 其他檔案（icons-more.js）補進來的 icon
  function add(map) { Object.assign(DRAW, map); api.keys = Object.keys(DRAW); }
  const api = root.HQ_ICONS = { url, el, canvas, add, keys: Object.keys(DRAW) };
})(this);
