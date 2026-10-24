// 進副本的過場：蠟筆插畫風的台灣地圖，副本所在的那一塊浮起來、發亮，跳出副本名稱，然後淡出
// 地圖是手描的簡化輪廓（經緯度），不是精準的行政區界
(function (root) {
  const CR = root.HQ_CRAYON;
  // 台灣本島外框（經度, 緯度），從富貴角順時針繞一圈
  const ISLAND = [
    [121.54, 25.30], [121.70, 25.20], [121.92, 25.13], [122.00, 25.01], [121.83, 24.86], [121.80, 24.70], [121.86, 24.58],
    [121.80, 24.45], [121.76, 24.36], [121.69, 24.18], [121.62, 23.98], [121.58, 23.80], [121.53, 23.62], [121.50, 23.45],
    [121.45, 23.32], [121.37, 23.10], [121.20, 22.85], [121.05, 22.65], [120.90, 22.35], [120.87, 22.10], [120.85, 21.90],
    [120.73, 21.93], [120.70, 22.10], [120.60, 22.32], [120.45, 22.46], [120.28, 22.62], [120.18, 22.85], [120.12, 23.05],
    [120.10, 23.25], [120.15, 23.45], [120.20, 23.75], [120.38, 24.05], [120.52, 24.28], [120.65, 24.47], [120.85, 24.70],
    [120.95, 24.86], [121.10, 25.03], [121.30, 25.13], [121.42, 25.18],
  ];
  // 各副本的區塊
  const REGIONS = {
    hualien: {
      name: '花蓮', color: '#ffb020',
      pts: [[121.76, 24.36], [121.69, 24.18], [121.62, 23.98], [121.58, 23.80], [121.53, 23.62], [121.50, 23.45],
        [121.38, 23.26], [121.24, 23.12], [121.12, 23.30], [121.10, 23.60], [121.17, 23.90], [121.22, 24.15], [121.36, 24.34], [121.56, 24.41]],
      label: [121.40, 23.78],
    },
  };
  const LON0 = 119.85, LON1 = 122.25, LAT0 = 21.75, LAT1 = 25.45, KX = Math.cos(23.7 * Math.PI / 180);

  function play(opts) {
    const region = REGIONS[opts.region] || REGIONS.hualien;
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.id = 'tw-intro';
      const cv = document.createElement('canvas');
      wrap.appendChild(cv);
      document.body.appendChild(wrap);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = window.innerWidth, H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      const ctx = cv.getContext('2d');
      // 地圖放在畫面中間，直的手機也看得到整個台灣
      const mw = (LON1 - LON0) * KX, mh = LAT1 - LAT0;
      const s = Math.min(H * 0.72 / mh, W * 0.8 / mw);
      const ox = (W - mw * s) / 2, oy = (H - mh * s) / 2 - H * 0.04;
      const P = ([lon, lat]) => [ox + (lon - LON0) * KX * s, oy + (LAT1 - lat) * s];

      // 先把不會動的部分（海、島、山）畫好
      const base = document.createElement('canvas');
      base.width = cv.width; base.height = cv.height;
      const b = base.getContext('2d');
      b.scale(dpr, dpr);
      const r = CR.rng(23);
      b.fillStyle = '#bfe0f2'; b.fillRect(0, 0, W, H);
      CR.dots(b, 0, 0, W, H, Math.round(W * H / 2500), 'rgba(255,255,255,0.55)', r, 2.4);
      // 海浪
      for (let i = 0; i < 26; i++) {
        const x = r() * W, y = r() * H, w = 14 + r() * 16;
        b.beginPath(); b.arc(x, y, w, Math.PI * 1.1, Math.PI * 1.9); CR.stroke(b, r, 2, 'rgba(79,124,194,0.45)');
      }
      // 島的影子＋本體
      b.save(); b.translate(5, 7); CR.smooth(b, ISLAND.map(P)); b.fillStyle = 'rgba(19,26,40,0.22)'; b.fill(); b.restore();
      CR.smooth(b, ISLAND.map(P)); CR.fill(b, '#bfe0a4', r, [ox, oy, mw * s, mh * s], 1.2); CR.stroke(b, r, 3.2);
      // 中央山脈：一排小山
      [[121.55, 24.75], [121.35, 24.45], [121.20, 24.15], [121.05, 23.85], [120.98, 23.55], [120.92, 23.25], [120.85, 22.95], [120.80, 22.65]]
        .forEach(([lon, lat], i) => {
          const [x, y] = P([lon - 0.12, lat]), hgt = s * (0.11 + (i % 2) * 0.03);
          b.beginPath(); b.moveTo(x - hgt * 0.8, y + hgt * 0.4); b.lineTo(x, y - hgt * 0.6); b.lineTo(x + hgt * 0.8, y + hgt * 0.4); b.closePath();
          CR.fill(b, '#8fbf7a', r, null); CR.stroke(b, r, 2);
          b.beginPath(); b.moveTo(x - hgt * 0.25, y - hgt * 0.25); b.lineTo(x, y - hgt * 0.6); b.lineTo(x + hgt * 0.25, y - hgt * 0.25); b.fillStyle = '#ffffff'; b.fill();
        });
      // 副本那一塊原本的位置：浮起來以後留下一個淡淡的凹洞
      CR.smooth(b, region.pts.map(P)); b.fillStyle = 'rgba(47,59,85,0.28)'; b.fill(); CR.stroke(b, r, 2, 'rgba(43,42,51,0.5)');
      // 角落的小颱風
      const [tx, ty] = [W - Math.min(90, W * 0.14), Math.min(110, H * 0.14)];
      b.save(); b.translate(tx, ty);
      for (let k = 0; k < 3; k++) { b.beginPath(); b.arc(0, 0, 14 + k * 9, k, k + 4.2); CR.stroke(b, r, 3, '#4f7cc2'); }
      b.restore();

      // 會浮起來的那一塊，另外畫一張
      const pts = region.pts.map(P);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const bx = Math.min(...xs) - 20, by = Math.min(...ys) - 20, bw = Math.max(...xs) - bx + 20, bh = Math.max(...ys) - by + 20;
      const piece = document.createElement('canvas');
      piece.width = bw * dpr; piece.height = bh * dpr;
      const pc = piece.getContext('2d');
      pc.scale(dpr, dpr); pc.translate(-bx, -by);
      CR.smooth(pc, pts); CR.fill(pc, region.color, r, [bx, by, bw, bh], 1.4); CR.stroke(pc, r, 3.2);
      CR.dots(pc, bx, by, bw, bh, 0, '#fff', r);
      // 太魯閣的小峽谷線條
      const [lx, ly] = P(region.label);
      pc.save(); CR.smooth(pc, pts); pc.clip();
      for (let k = 0; k < 3; k++) CR.line(pc, lx - 18 + k * 8, ly - 30, lx - 6 + k * 10, ly + 26, r, 1.6, 'rgba(184,67,0,0.45)', 3);
      pc.restore();

      const t0 = performance.now(), TOTAL = 3400;
      const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
      function frame(now) {
        const t = now - t0;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        // 0~400：整張地圖淡入、稍微放大
        const a = ease(t / 400), fade = t > TOTAL - 500 ? Math.max(0, (TOTAL - t) / 500) : 1;
        ctx.globalAlpha = a * fade;
        const zs = 0.94 + 0.06 * a;
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zs, zs); ctx.translate(-W / 2, -H / 2);
        ctx.drawImage(base, 0, 0, W, H);
        // 500~1300：區塊浮起來；之後上下輕輕飄、外面一圈光一亮一暗
        const lift = ease((t - 500) / 800), bob = t > 1300 ? Math.sin((t - 1300) / 260) * 3 : 0;
        const up = lift * Math.min(30, s * 0.32) + bob, grow = 1 + lift * 0.12;
        const cx = bx + bw / 2, cy = by + bh / 2;
        if (lift > 0) {
          ctx.save();
          ctx.globalAlpha = a * fade * lift * (0.55 + 0.35 * Math.sin(t / 180));
          ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 34;
          ctx.translate(cx, cy - up); ctx.scale(grow, grow); ctx.translate(-cx, -cy);
          ctx.drawImage(piece, bx, by, bw, bh);
          ctx.restore();
          // 浮起來的影子
          ctx.save(); ctx.globalAlpha = 0.25 * lift * fade;
          ctx.translate(cx + 6, cy + 10); ctx.scale(grow * 0.95, grow * 0.95); ctx.translate(-cx, -cy);
          CR.smooth(ctx, pts); ctx.fillStyle = '#131a28'; ctx.fill(); ctx.restore();
        }
        ctx.save();
        ctx.translate(cx, cy - up); ctx.scale(grow, grow); ctx.translate(-cx, -cy);
        ctx.drawImage(piece, bx, by, bw, bh);
        ctx.restore();
        ctx.restore();
        // 1100 之後：副本名稱從下面彈出來
        const ta = ease((t - 1100) / 450) * fade;
        if (ta > 0) {
          ctx.globalAlpha = ta;
          const fs = Math.round(Math.min(40, W * 0.075));
          const yT = Math.min(H - 70, oy + mh * s + 30) + (1 - ta) * 20;
          ctx.font = `900 ${fs}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const tw = ctx.measureText(opts.title).width;
          const rr = CR.rng(7);
          CR.rect(ctx, W / 2 - tw / 2 - 22, yT - fs * 0.8, tw + 44, fs * 1.6, rr, 2);
          CR.fill(ctx, '#fffdf6', rr, null); CR.stroke(ctx, rr, 3);
          ctx.fillStyle = '#2b2a33'; ctx.fillText(opts.title, W / 2, yT + 1);
          ctx.font = `700 ${Math.round(fs * 0.42)}px "Space Mono", monospace`;
          ctx.fillStyle = '#2f3b55';
          ctx.fillText(opts.sub || 'DUNGEON', W / 2, yT - fs * 1.25);
          // 名稱旁邊的小標記：指向浮起來的那一塊
          ctx.font = `900 ${Math.round(fs * 0.6)}px sans-serif`;
          ctx.fillText('📍', cx, cy - up - Math.min(60, bh * 0.45));
        }
        ctx.globalAlpha = 1;
        if (t < TOTAL) requestAnimationFrame(frame);
        else { wrap.remove(); resolve(); }
      }
      requestAnimationFrame(frame);
      // 點一下可以跳過
      wrap.addEventListener('pointerdown', () => { wrap.remove(); resolve(); }, { once: true });
    });
  }

  root.HQ_TAIWAN = { play, REGIONS };
})(this);
