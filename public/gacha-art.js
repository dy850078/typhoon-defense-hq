// 扭蛋機、扭蛋券、扭蛋的草圖（之後搬進 game.js / icons）
(function (root) {
  const C = root.HQ_CRAYON;
  const dot = (x, cx, cy, s, col) => { x.beginPath(); x.ellipse(cx, cy, s, s, 0, 0, Math.PI * 2); x.fillStyle = col; x.fill(); };
  const RAR = { R: ['#7fb2e5', '#fbfbf8'], SR: ['#ffb020', '#fff4d6'], SSR: ['#e46bd6', '#ffe0fa'] };
  function sparkle(x, cx, cy, s, col) {
    x.save(); x.fillStyle = col; x.beginPath();
    x.moveTo(cx, cy - s * 2); x.quadraticCurveTo(cx, cy, cx + s * 2, cy); x.quadraticCurveTo(cx, cy, cx, cy + s * 2); x.quadraticCurveTo(cx, cy, cx - s * 2, cy); x.quadraticCurveTo(cx, cy, cx, cy - s * 2);
    x.fill(); x.restore();
  }
  // 一顆扭蛋：上半有顏色、下半白色，中間一條縫
  function capsule(x, r, cx, cy, R, rar, lw = 2) {
    const [top, bot] = RAR[rar];
    if (rar === 'SSR') { const g = x.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 2); g.addColorStop(0, 'rgba(255,170,240,0.75)'); g.addColorStop(1, 'rgba(255,170,240,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 2, 0, Math.PI * 2); x.fill(); }
    x.save(); C.blob(x, cx, cy, R, R, r, 0.04, 16); x.clip();
    x.fillStyle = bot; x.fillRect(cx - R - 2, cy - R - 2, R * 2 + 4, R * 2 + 4);
    x.fillStyle = top; x.fillRect(cx - R - 2, cy - R - 2, R * 2 + 4, R + 2);
    x.restore();
    C.blob(x, cx, cy, R, R, r, 0.04, 16); C.stroke(x, r, lw);
    C.line(x, cx - R, cy, cx + R, cy, r, lw * 0.7, '#2b2a33', 0.2);
    C.blob(x, cx - R * 0.4, cy - R * 0.5, R * 0.25, R * 0.16, r, 0.1, 8); x.fillStyle = 'rgba(255,255,255,0.85)'; x.fill();
    if (rar === 'SSR') { sparkle(x, cx + R * 0.9, cy - R * 0.9, R * 0.22, '#fff6a8'); sparkle(x, cx - R * 1.1, cy + R * 0.5, R * 0.15, '#ffffff'); }
  }
  // 扭蛋機本體：寬 64、高 104（地圖上大概 1 格寬、2 格高）
  function machine(x, r) {
    // 小腳
    [[16, 100], [48, 100]].forEach(([a, b]) => { C.rect(x, a - 4, b - 6, 8, 7, r, 0.4); C.fill(x, '#2b2a33', r, null); });
    // 紅色機身
    C.rect(x, 8, 56, 48, 44, r, 1); C.fill(x, '#e8384f', r, [8, 56, 48, 44], 1.2); C.stroke(x, r, 2.6);
    C.line(x, 12, 60, 12, 94, r, 1.6, 'rgba(255,255,255,0.35)', 0.3);
    // 投券口＋小牌子
    C.rect(x, 14, 62, 16, 12, r, 0.5); C.fill(x, '#fbf1d6', r, null); C.stroke(x, r, 1.6);
    C.rect(x, 17, 66.5, 10, 2.6, r, 0.2); C.fill(x, '#2b2a33', r, null);
    // 轉把：白色圓盤＋一根把手
    C.blob(x, 41, 69, 8, 8, r, 0.05, 16); C.fill(x, '#fbfbf8', r, null); C.stroke(x, r, 2.2);
    C.rect(x, 39, 62, 4, 14, r, 0.4); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 1.6);
    // 出蛋口
    C.rect(x, 20, 82, 24, 13, r, 0.6); C.fill(x, '#2b2a33', r, null); C.stroke(x, r, 2);
    x.beginPath(); x.moveTo(21, 82); x.quadraticCurveTo(32, 90, 43, 82); x.lineTo(43, 85); x.quadraticCurveTo(32, 93, 21, 85); x.closePath(); C.fill(x, '#ff8fab', r, null); C.stroke(x, r, 1.4);
    capsule(x, r, 36, 91, 3.4, 'SR', 1.2);
    // 金色頸圈
    C.rect(x, 12, 51, 40, 7, r, 0.5); C.fill(x, '#ffd23f', r, null); C.stroke(x, r, 2);
    // 玻璃球罩和裡面的蛋
    x.save(); C.blob(x, 32, 30, 25, 24, r, 0.03, 22); x.clip();
    x.fillStyle = 'rgba(214,236,255,0.85)'; x.fillRect(0, 0, 64, 60);
    const pile = [[16, 44, 'R'], [26, 47, 'SR'], [37, 46, 'R'], [47, 43, 'SSR'], [20, 35, 'SR'], [31, 37, 'R'], [42, 35, 'R'], [26, 27, 'SSR'], [37, 27, 'SR'], [14, 26, 'R'], [48, 27, 'SR'], [31, 18, 'R']];
    pile.forEach(([a, b, k]) => capsule(x, r, a, b, 5.6, k, 1.4));
    x.restore();
    C.blob(x, 32, 30, 25, 24, r, 0.03, 22); C.stroke(x, r, 2.6);
    x.save(); x.globalAlpha = 0.8; x.beginPath(); x.moveTo(15, 22); x.quadraticCurveTo(18, 11, 28, 8); C.stroke(x, r, 3, '#ffffff'); x.restore();
    // 頂蓋
    C.blob(x, 32, 7, 11, 5, r, 0.06, 14); C.fill(x, '#e8384f', r, null); C.stroke(x, r, 2.2);
    dot(x, 32, 2, 2.6, '#ffd23f');
  }
  // 扭蛋券 icon（48x48）：鋸齒邊紙票，中間一顆扭蛋
  function ticket(x, r) {
    x.save(); x.translate(24, 24); x.rotate(-0.18); x.translate(-24, -24);
    x.beginPath(); x.moveTo(5, 13); x.lineTo(43, 13); x.lineTo(43, 20); x.arc(43, 24, 4, -Math.PI / 2, Math.PI / 2, true); x.lineTo(43, 35); x.lineTo(5, 35); x.lineTo(5, 28); x.arc(5, 24, 4, Math.PI / 2, -Math.PI / 2, true); x.closePath();
    C.fill(x, '#fbf1d6', r, [5, 13, 38, 22]); C.stroke(x, r, 2.4);
    x.save(); x.setLineDash([2.2, 2.4]); x.beginPath(); x.moveTo(15, 15.5); x.lineTo(15, 32.5); C.stroke(x, r, 1.4, '#ff8fab'); x.restore();
    capsule(x, r, 29, 24, 6.6, 'SSR', 1.6);
    sparkle(x, 10, 19, 1.4, '#ffb020'); sparkle(x, 10, 29, 1.1, '#7fb2e5');
    x.restore();
  }
  root.HQ_GACHA_ART = { machine, ticket, capsule };
})(this);
