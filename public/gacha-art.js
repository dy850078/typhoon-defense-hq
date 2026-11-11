// 扭蛋機的手繪圖：扭蛋機本體、扭蛋券、扭蛋，還有扭蛋限定裝備的 icon 和套裝特效用的小圖
// 扭蛋機本體的座標是 64x104；icon 都在 48x48 裡
(function (root) {
  const C = root.HQ_CRAYON;
  if (!C) return;
  const dot = (x, cx, cy, s, col) => { x.beginPath(); x.ellipse(cx, cy, s, s, 0, 0, Math.PI * 2); x.fillStyle = col; x.fill(); };
  // 蛋的顏色就是稀有度：藍 R、金 SR、會發光的粉紫 SSR
  const RAR = { R: ['#7fb2e5', '#fbfbf8'], SR: ['#ffb020', '#fff4d6'], SSR: ['#e46bd6', '#ffe0fa'] };
  function sparkle(x, cx, cy, s, col) {
    x.save(); x.fillStyle = col; x.beginPath();
    x.moveTo(cx, cy - s * 2); x.quadraticCurveTo(cx, cy, cx + s * 2, cy); x.quadraticCurveTo(cx, cy, cx, cy + s * 2); x.quadraticCurveTo(cx, cy, cx - s * 2, cy); x.quadraticCurveTo(cx, cy, cx, cy - s * 2);
    x.fill(); x.restore();
  }
  // 一顆扭蛋：上半有顏色、下半白色，中間一條縫；open（0～1）是上蓋掀開多少
  function capsule(x, r, cx, cy, R, rar, lw = 2, open = 0) {
    const [top, bot] = RAR[rar];
    if (rar === 'SSR') {
      const g = x.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 2);
      g.addColorStop(0, 'rgba(255,170,240,0.75)'); g.addColorStop(1, 'rgba(255,170,240,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 2, 0, Math.PI * 2); x.fill();
    }
    // 下半
    x.save(); x.beginPath(); x.rect(cx - R - 3, cy, R * 2 + 6, R + 3); x.clip();
    C.blob(x, cx, cy, R, R, r, 0.04, 16); C.fill(x, bot, r, null); C.stroke(x, r, lw);
    x.restore();
    // 上半：掀開的時候繞著左邊的縫往上翻
    x.save();
    if (open) { x.translate(cx - R, cy); x.rotate(-open * 1.9); x.translate(-(cx - R), -cy - open * R * 0.3); }
    x.beginPath(); x.rect(cx - R - 3, cy - R - 3, R * 2 + 6, R + 3); x.clip();
    C.blob(x, cx, cy, R, R, r, 0.04, 16); C.fill(x, top, r, null); C.stroke(x, r, lw);
    C.blob(x, cx - R * 0.4, cy - R * 0.5, R * 0.25, R * 0.16, r, 0.1, 8); x.fillStyle = 'rgba(255,255,255,0.85)'; x.fill();
    x.restore();
    if (!open) C.line(x, cx - R, cy, cx + R, cy, r, lw * 0.7, '#2b2a33', 0.2);
    if (rar === 'SSR' && !open) { sparkle(x, cx + R * 0.9, cy - R * 0.9, R * 0.22, '#fff6a8'); sparkle(x, cx - R * 1.1, cy + R * 0.5, R * 0.15, '#ffffff'); }
  }
  // 扭蛋機本體：寬 64、高 104（地圖上一格寬、靠著牆往上畫）
  // o.turn 是轉把轉到的角度；o.egg 是出蛋口有一顆什麼顏色的蛋（'R'／'SR'／'SSR'），null 就是空的
  function machine(x, r, o) {
    o = o || {};
    [[16, 100], [48, 100]].forEach(([a, b]) => { C.rect(x, a - 4, b - 6, 8, 7, r, 0.4); C.fill(x, '#2b2a33', r, null); });
    // 紅色機身
    C.rect(x, 8, 56, 48, 44, r, 1); C.fill(x, '#e8384f', r, [8, 56, 48, 44], 1.2); C.stroke(x, r, 2.6);
    C.line(x, 12, 60, 12, 94, r, 1.6, 'rgba(255,255,255,0.35)', 0.3);
    // 投券口＋小牌子
    C.rect(x, 14, 62, 16, 12, r, 0.5); C.fill(x, '#fbf1d6', r, null); C.stroke(x, r, 1.6);
    C.rect(x, 17, 66.5, 10, 2.6, r, 0.2); C.fill(x, '#2b2a33', r, null);
    // 轉把：白色圓盤＋一根把手（會轉）
    C.blob(x, 41, 69, 8, 8, r, 0.05, 16); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 2.2);
    x.save(); x.translate(41, 69); x.rotate(o.turn || 0);
    C.rect(x, -2, -7, 4, 14, r, 0.4); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.6);
    x.restore();
    // 出蛋口
    C.rect(x, 20, 82, 24, 13, r, 0.6); C.fill(x, '#2b2a33', r, null); C.stroke(x, r, 2);
    x.beginPath(); x.moveTo(21, 82); x.quadraticCurveTo(32, 90, 43, 82); x.lineTo(43, 85); x.quadraticCurveTo(32, 93, 21, 85); x.closePath(); C.fill(x, '#ff8fab', r, null); C.stroke(x, r, 1.4);
    if (o.egg) capsule(x, r, 36, 91, 3.4, o.egg, 1.2);
    // 金色頸圈
    C.rect(x, 12, 51, 40, 7, r, 0.5); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 2);
    // 玻璃球罩和裡面的蛋；轉的時候蛋會跟著晃一下
    const sh = o.turn ? Math.sin(o.turn * 3) * 1.2 : 0;
    x.save(); C.blob(x, 32, 30, 25, 24, r, 0.03, 22); x.clip();
    x.fillStyle = 'rgba(214,236,255,0.85)'; x.fillRect(0, 0, 64, 60);
    const pile = [[16, 44, 'R'], [26, 47, 'SR'], [37, 46, 'R'], [47, 43, 'SSR'], [20, 35, 'SR'], [31, 37, 'R'], [42, 35, 'R'], [26, 27, 'SSR'], [37, 27, 'SR'], [14, 26, 'R'], [48, 27, 'SR'], [31, 18, 'R']];
    pile.forEach(([a, b, k], i) => capsule(x, r, a + (i % 2 ? sh : -sh), b, 5.6, k, 1.4));
    x.restore();
    C.blob(x, 32, 30, 25, 24, r, 0.03, 22); C.stroke(x, r, 2.6);
    x.save(); x.globalAlpha = 0.8; x.beginPath(); x.moveTo(15, 22); x.quadraticCurveTo(18, 11, 28, 8); C.stroke(x, r, 3, '#ffffff'); x.restore();
    // 頂蓋
    C.blob(x, 32, 7, 11, 5, r, 0.06, 14); C.fill(x, '#e8384f', r, null); C.stroke(x, r, 2.2);
    dot(x, 32, 2, 2.6, '#ffd23f');
  }
  // 扭蛋券（48x48）：鋸齒邊紙票，中間一顆扭蛋
  function ticket(x, r) {
    x.save(); x.translate(24, 24); x.rotate(-0.18); x.translate(-24, -24);
    x.beginPath(); x.moveTo(5, 13); x.lineTo(43, 13); x.lineTo(43, 20); x.arc(43, 24, 4, -Math.PI / 2, Math.PI / 2, true); x.lineTo(43, 35); x.lineTo(5, 35); x.lineTo(5, 28); x.arc(5, 24, 4, Math.PI / 2, -Math.PI / 2, true); x.closePath();
    C.fill(x, '#fbf1d6', r, [5, 13, 38, 22]); C.stroke(x, r, 2.4);
    x.save(); x.setLineDash([2.2, 2.4]); x.beginPath(); x.moveTo(15, 15.5); x.lineTo(15, 32.5); C.stroke(x, r, 1.4, '#ff8fab'); x.restore();
    capsule(x, r, 29, 24, 6.6, 'SSR', 1.6);
    sparkle(x, 10, 19, 1.4, '#ffb020'); sparkle(x, 10, 29, 1.1, '#7fb2e5');
    x.restore();
  }

  // 套裝特效用的小圖（game.js 會做成 fx-<key> 貼圖）
  function canvas(w, h, seed, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), C.rng(seed)); return c; }
  const fx = {
    // 魔法少女：腳下的魔法陣（兩圈圓＋一顆五角星＋一圈小點），白色，用 tint 染成粉紅
    magic: () => canvas(128, 128, 71, (x) => {
      x.strokeStyle = '#ffffff'; x.fillStyle = '#ffffff'; x.lineWidth = 3;
      x.beginPath(); x.arc(64, 64, 58, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 2; x.beginPath(); x.arc(64, 64, 46, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 2.4; x.beginPath();
      for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 4 / 5; x[i ? 'lineTo' : 'moveTo'](64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); }
      x.stroke();
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; dot(x, 64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52, i % 2 ? 1.6 : 2.6, '#ffffff'); }
    }),
    // 小巫師：一頁發光的小書頁，上面幾行字
    page: () => canvas(30, 34, 72, (x, r) => {
      x.save(); x.translate(15, 17); x.rotate(-0.12); x.translate(-15, -17);
      C.rect(x, 5, 4, 20, 26, r, 0.6); C.fill(x, '#fff8e6', r, null); C.stroke(x, r, 1.6);
      [10, 14, 18, 22].forEach((y, i) => C.line(x, 9, y, i === 3 ? 16 : 21, y, r, 1.1, '#b8a5e8', 0.2));
      x.restore();
    }),
    // 小巫師：一個發光的符文（圓圈裡一個像星星的記號），白色，用 tint 染色
    rune: () => canvas(32, 32, 73, (x) => {
      x.strokeStyle = '#ffffff'; x.lineWidth = 2.2; x.lineCap = 'round';
      x.beginPath(); x.arc(16, 16, 12, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.moveTo(16, 7); x.lineTo(16, 25); x.moveTo(9, 12); x.lineTo(23, 20); x.moveTo(23, 12); x.lineTo(9, 20); x.stroke();
      x.beginPath(); x.arc(16, 16, 3, 0, Math.PI * 2); x.stroke();
    }),
  };

  // icon：扭蛋券、扭蛋機的提示、三種蛋、扭蛋限定裝備（直接拿 gear.js 的畫法縮小）
  function gearIcon(x, id, layer, box) {
    const G = root.HQ_GEAR;
    if (!G) return;
    const [bx, by, bw, bh] = box, k = 44 / Math.max(bw, bh);
    x.save(); x.translate(24 - (bx + bw / 2) * k, 24 - (by + bh / 2) * k); x.scale(k, k);
    if (layer === 'front') G.drawLayer(x, id, 'back', { skin: '#fde6d4' });
    G.drawLayer(x, id, layer, { skin: '#fde6d4' });
    x.restore();
  }
  if (root.HQ_ICONS) root.HQ_ICONS.add({
    'item-gachaTicket'(x, r) { ticket(x, r); },
    'act-gacha'(x, r) { x.save(); x.translate(24 - 32 * 0.44, 1); x.scale(0.44, 0.44); machine(x, r); x.restore(); },
    'gacha-R'(x, r) { capsule(x, r, 24, 24, 15, 'R', 2.2); },
    'gacha-SR'(x, r) { capsule(x, r, 24, 24, 15, 'SR', 2.2); },
    'gacha-SSR'(x, r) { capsule(x, r, 24, 24, 15, 'SSR', 2.2); },
    'gear-mgBow'(x) { gearIcon(x, 'mgBow', 'head', [8, -10, 50, 34]); },
    'gear-mgDress'(x) { gearIcon(x, 'mgDress', 'front', [6, 40, 52, 38]); },
    'gear-mgWings'(x) { gearIcon(x, 'mgWings', 'cape', [-14, 2, 94, 76]); },
    'gear-wzHat'(x) { gearIcon(x, 'wzHat', 'head', [4, -26, 56, 44]); },
    'gear-wzRobe'(x) { gearIcon(x, 'wzRobe', 'front', [6, 40, 52, 38]); },
    'gear-wzWand'(x) { gearIcon(x, 'wzWand', 'cape', [0, 2, 80, 78]); },
  });

  root.HQ_GACHA_ART = { machine, ticket, capsule, fx, RAR };
})(this);
