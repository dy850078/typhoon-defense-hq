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
    // 許願池：「做好了」的紅色印章（字另外疊上去）
    'wish-stamp'(x, r) {
      C.blob(x, 24, 24, 21, 21, r, 0.05, 28); C.stroke(x, r, 3, '#d8323f');
      C.blob(x, 24, 24, 16.5, 16.5, r, 0.06, 26); C.stroke(x, r, 1.4, '#d8323f');
    },
  };

  const cache = {};
  function url(key) {
    if (!DRAW[key] || !C) return null;
    if (cache[key]) return cache[key];
    const cv = document.createElement('canvas');
    cv.width = cv.height = SIZE * SCALE;
    const x = cv.getContext('2d');
    x.scale(SCALE, SCALE);
    // 每個 icon 固定種子，每次畫出來都一樣
    DRAW[key](x, C.rng([...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)));
    return (cache[key] = cv.toDataURL());
  }
  // 手繪 icon 的 <img>，沒有的話用 emoji 加墨線外框
  function el(key, emoji, cls) {
    const u = url(key);
    if (u) { const i = document.createElement('img'); i.src = u; i.alt = ''; i.className = 'hq-icon' + (cls ? ' ' + cls : ''); return i; }
    const s = document.createElement('span'); s.className = 'em-ol' + (cls ? ' ' + cls : ''); s.textContent = emoji; return s;
  }
  root.HQ_ICONS = { url, el, keys: Object.keys(DRAW) };
})(this);
