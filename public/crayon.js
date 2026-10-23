// 蠟筆手繪風的 Canvas 小工具：抖動的外框、帶顆粒的上色、格紋
(function (root) {
  const INK = '#2b2a33';

  // 固定種子的亂數，同一個東西每次畫出來都一樣
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  }

  // 抖動的橢圓路徑
  function blob(ctx, cx, cy, rx, ry, r, wob = 0.08, n = 22) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 1 + (r() - 0.5) * wob * 2;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    smooth(ctx, pts);
  }

  // 抖動的矩形路徑（四邊各加一個中點）
  function rect(ctx, x, y, w, h, r, j = 1.5) {
    const J = () => (r() - 0.5) * 2 * j;
    const pts = [
      [x + J(), y + J()], [x + w / 2 + J(), y + J()], [x + w + J(), y + J()],
      [x + w + J(), y + h / 2 + J()], [x + w + J(), y + h + J()],
      [x + w / 2 + J(), y + h + J()], [x + J(), y + h + J()], [x + J(), y + h / 2 + J()],
    ];
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
  }

  // 任意多邊形，用二次曲線把點連得圓滑
  function smooth(ctx, pts) {
    ctx.beginPath();
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m = mid(pts[n - 1], pts[0]);
    ctx.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      m = mid(p, q);
      ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.closePath();
  }

  // 在目前的路徑裡上色，再撒上蠟筆顆粒
  function fill(ctx, color, r, box, grain = 1) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fill();
    if (grain > 0 && box) {
      ctx.clip();
      const [x, y, w, h] = box;
      const count = Math.min(400, Math.round((w * h) / 30 * grain));
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(40,30,50,0.07)';
        const px = x + r() * w, py = y + r() * h;
        ctx.fillRect(px, py, 0.6 + r() * 1.6, 0.5 + r() * 0.7);
      }
    }
    ctx.restore();
  }

  // 蠟筆外框：畫兩次、稍微錯開，看起來像手畫的
  function stroke(ctx, r, width = 2.5, color = INK) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = width;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = width * 0.7;
    ctx.translate((r() - 0.5) * 1.2, (r() - 0.5) * 1.2);
    ctx.stroke();
    ctx.restore();
  }

  // 抖動的線段
  function line(ctx, x1, y1, x2, y2, r, width = 2, color = INK, j = 1) {
    ctx.beginPath();
    ctx.moveTo(x1 + (r() - 0.5) * j, y1 + (r() - 0.5) * j);
    ctx.quadraticCurveTo((x1 + x2) / 2 + (r() - 0.5) * j * 2, (y1 + y2) / 2 + (r() - 0.5) * j * 2,
      x2 + (r() - 0.5) * j, y2 + (r() - 0.5) * j);
    stroke(ctx, r, width, color);
  }

  // 格紋（像插畫裡的格子布）
  function plaid(ctx, x, y, w, h, step, color, r, width = 2) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = 0.8;
    for (let gx = x + step / 2; gx < x + w; gx += step) {
      ctx.beginPath(); ctx.moveTo(gx + (r() - 0.5), y); ctx.lineTo(gx + (r() - 0.5), y + h); ctx.stroke();
    }
    for (let gy = y + step / 2; gy < y + h; gy += step) {
      ctx.beginPath(); ctx.moveTo(x, gy + (r() - 0.5)); ctx.lineTo(x + w, gy + (r() - 0.5)); ctx.stroke();
    }
    ctx.restore();
  }

  // 一顆顆的小點點（雨、雪、草地的質感）
  function dots(ctx, x, y, w, h, n, color, r, size = 2) {
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.ellipse(x + r() * w, y + r() * h, size * (0.6 + r() * 0.8), size * (0.5 + r() * 0.5), r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const api = { INK, rng, blob, rect, smooth, fill, stroke, line, plaid, dots };
  root.HQ_CRAYON = api;
})(this);
