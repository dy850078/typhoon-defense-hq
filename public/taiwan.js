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
  // 縣市分界線（手描的大概位置，畫的時候會裁在島的輪廓裡，所以靠海的那一端可以稍微超出去）
  const BORDERS = [
    [[121.95, 24.99], [121.70, 24.85], [121.50, 24.70]],                     // 新北｜宜蘭
    [[121.10, 25.12], [121.30, 24.95], [121.40, 24.76], [121.50, 24.70]],    // 新北｜桃園
    [[121.50, 24.70], [121.40, 24.52], [121.36, 24.34]],                     // 宜蘭西邊
    [[120.90, 24.92], [121.15, 24.75], [121.30, 24.62], [121.40, 24.52]],    // 桃園｜新竹
    [[120.80, 24.75], [121.05, 24.58], [121.25, 24.46], [121.36, 24.34]],    // 新竹｜苗栗
    [[120.55, 24.45], [120.85, 24.32], [121.10, 24.30], [121.36, 24.34]],    // 苗栗｜台中
    [[120.40, 24.12], [120.62, 24.10], [120.75, 24.02]],                     // 台中｜彰化
    [[120.75, 24.02], [121.00, 24.16], [121.22, 24.15]],                     // 台中｜南投
    [[120.75, 24.02], [120.66, 23.82]],                                      // 彰化｜南投
    [[120.10, 23.80], [120.40, 23.84], [120.66, 23.82]],                     // 彰化｜雲林
    [[120.66, 23.82], [120.70, 23.55]],                                      // 雲林｜南投
    [[120.05, 23.55], [120.40, 23.56], [120.70, 23.55]],                     // 雲林｜嘉義
    [[120.70, 23.55], [120.90, 23.46], [121.10, 23.48]],                     // 南投｜嘉義、高雄
    [[120.05, 23.30], [120.40, 23.30], [120.62, 23.24]],                     // 嘉義｜台南
    [[120.62, 23.24], [120.85, 23.40], [120.92, 23.46]],                     // 嘉義｜高雄
    [[120.12, 22.90], [120.40, 23.05], [120.62, 23.24]],                     // 台南｜高雄
    [[120.42, 22.45], [120.55, 22.70], [120.70, 23.00], [120.88, 23.22]],    // 高雄｜屏東
    [[120.88, 23.22], [121.00, 23.20], [121.12, 23.30]],                     // 高雄｜台東
    [[120.98, 22.25], [120.80, 22.55], [120.82, 22.90], [120.88, 23.22]],    // 屏東｜台東
  ];
  // 台北市：新北裡面的一小塊
  const TAIPEI = [[121.47, 25.21], [121.62, 25.17], [121.66, 25.03], [121.57, 24.97], [121.48, 25.02], [121.45, 25.12]];
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

      // 先把不會動的部分畫好：神廟的石牆、刻著台灣的大石板
      const base = document.createElement('canvas');
      base.width = cv.width; base.height = cv.height;
      const b = base.getContext('2d');
      b.scale(dpr, dpr);
      const r = CR.rng(23);
      const isl = ISLAND.map(P);
      // 石牆：一塊一塊交錯砌起來的大石磚
      b.fillStyle = '#3f3a36'; b.fillRect(0, 0, W, H);
      const bw0 = Math.max(90, W / 9), bh0 = bw0 * 0.5;
      for (let row = 0, y = -bh0 * 0.3; y < H; row++, y += bh0) {
        for (let x = -(row % 2) * bw0 / 2; x < W; x += bw0) {
          CR.rect(b, x + 3, y + 3, bw0 - 6, bh0 - 6, r, 2);
          const v = Math.floor(r() * 3);
          CR.fill(b, ['#4c4641', '#524b45', '#47413c'][v], r, [x, y, bw0, bh0], 0.8);
          CR.stroke(b, r, 2, 'rgba(24,20,18,0.7)');
          if (r() < 0.25) CR.line(b, x + bw0 * 0.2, y + bh0 * 0.3, x + bw0 * 0.45, y + bh0 * 0.6, r, 1.2, 'rgba(24,20,18,0.5)', 2);
        }
      }
      // 兩邊火盆的光
      const glow = (gx, gy, rad) => {
        const g = b.createRadialGradient(gx, gy, 0, gx, gy, rad);
        g.addColorStop(0, 'rgba(255,190,90,0.35)'); g.addColorStop(1, 'rgba(255,190,90,0)');
        b.fillStyle = g; b.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
      };
      const fx = Math.min(W * 0.12, 110), fy = H * 0.5, fr = Math.min(W, H) * 0.35;
      glow(fx, fy, fr); glow(W - fx, fy, fr);
      [fx, W - fx].forEach(x => {
        b.beginPath(); b.moveTo(x - 18, fy + 10); b.lineTo(x + 18, fy + 10); b.lineTo(x + 11, fy + 30); b.lineTo(x - 11, fy + 30); b.closePath();
        CR.fill(b, '#6b5a45', r, null); CR.stroke(b, r, 2.2);
        CR.blob(b, x, fy - 4, 11, 17, r, 0.18, 14); CR.fill(b, '#ff8a3d', r, null); CR.stroke(b, r, 1.8);
        CR.blob(b, x, fy + 1, 5.5, 9, r, 0.15, 12); b.fillStyle = '#ffd23f'; b.fill();
      });
      // 四周暗一點，視線集中在石板上
      const vg = b.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      b.fillStyle = vg; b.fillRect(0, 0, W, H);

      // 大石板（台灣刻在上面）
      const xs0 = isl.map(p => p[0]), ys0 = isl.map(p => p[1]);
      const pad = Math.max(26, s * 0.25);
      const tx0 = Math.min(...xs0) - pad, ty0 = Math.min(...ys0) - pad;
      const tw0 = Math.max(...xs0) + pad - tx0, th0 = Math.max(...ys0) + pad - ty0;
      b.save(); b.translate(8, 10); CR.rect(b, tx0, ty0, tw0, th0, r, 2); b.fillStyle = 'rgba(0,0,0,0.45)'; b.fill(); b.restore();
      CR.rect(b, tx0, ty0, tw0, th0, r, 2); CR.fill(b, '#8a7f70', r, [tx0, ty0, tw0, th0], 1.2); CR.stroke(b, r, 3.4);
      // 邊框：刻一圈，四個角有回紋
      const inset = Math.max(10, pad * 0.35);
      CR.rect(b, tx0 + inset, ty0 + inset, tw0 - inset * 2, th0 - inset * 2, r, 1.2); CR.stroke(b, r, 2, 'rgba(40,34,28,0.65)');
      b.save(); b.translate(1.5, 1.5);
      CR.rect(b, tx0 + inset, ty0 + inset, tw0 - inset * 2, th0 - inset * 2, r, 1.2); CR.stroke(b, r, 1.2, 'rgba(255,240,210,0.3)');
      b.restore();
      const cs = inset * 1.1;
      [[tx0 + inset, ty0 + inset], [tx0 + tw0 - inset - cs, ty0 + inset], [tx0 + inset, ty0 + th0 - inset - cs], [tx0 + tw0 - inset - cs, ty0 + th0 - inset - cs]]
        .forEach(([x, y]) => {
          b.beginPath(); b.moveTo(x + cs * 0.2, y + cs * 0.8); b.lineTo(x + cs * 0.2, y + cs * 0.2); b.lineTo(x + cs * 0.8, y + cs * 0.2);
          b.lineTo(x + cs * 0.8, y + cs * 0.6); b.lineTo(x + cs * 0.45, y + cs * 0.6); b.lineTo(x + cs * 0.45, y + cs * 0.45);
          CR.stroke(b, r, 1.8, 'rgba(40,34,28,0.7)');
        });
      // 石板上的裂痕和斑點
      CR.dots(b, tx0, ty0, tw0, th0, Math.round(tw0 * th0 / 900), 'rgba(40,34,28,0.18)', r, 2.2);
      for (let i = 0; i < 5; i++) {
        const x = tx0 + r() * tw0, y = ty0 + r() * th0;
        CR.line(b, x, y, x + (r() - 0.5) * 40, y + 14 + r() * 20, r, 1.2, 'rgba(40,34,28,0.4)', 3);
      }

      // 台灣：凸起來的浮雕（右下陰影＋左上亮邊）
      b.save(); b.translate(4, 5); CR.smooth(b, isl); b.fillStyle = 'rgba(30,24,20,0.5)'; b.fill(); b.restore();
      b.save(); b.translate(-1.5, -1.5); CR.smooth(b, isl); b.fillStyle = 'rgba(255,244,220,0.45)'; b.fill(); b.restore();
      CR.smooth(b, isl); CR.fill(b, '#b3a78f', r, [ox, oy, mw * s, mh * s], 1.2); CR.stroke(b, r, 3);
      // 縣市分界：刻進去的溝（深色線＋下面一條亮線）
      b.save(); CR.smooth(b, isl); b.clip();
      const groove = (path) => {
        path(); CR.stroke(b, r, 2.2, 'rgba(46,38,30,0.7)');
        b.save(); b.translate(1.2, 1.4); path(); CR.stroke(b, r, 1.1, 'rgba(255,244,220,0.45)'); b.restore();
      };
      BORDERS.forEach(line => groove(() => { b.beginPath(); line.map(P).forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y))); }));
      groove(() => CR.smooth(b, TAIPEI.map(P)));
      b.restore();
      // 中央山脈：刻幾個小山形
      [[121.55, 24.75], [121.35, 24.45], [121.20, 24.15], [121.05, 23.85], [120.98, 23.55], [120.92, 23.25], [120.85, 22.95], [120.80, 22.65]]
        .forEach(([lon, lat], i) => {
          const [x, y] = P([lon - 0.12, lat]), hgt = s * (0.09 + (i % 2) * 0.025);
          const m = () => { b.beginPath(); b.moveTo(x - hgt * 0.8, y + hgt * 0.4); b.lineTo(x, y - hgt * 0.5); b.lineTo(x + hgt * 0.8, y + hgt * 0.4); };
          m(); CR.stroke(b, r, 2.2, 'rgba(46,38,30,0.75)');
          b.save(); b.translate(1.2, 1.4); m(); CR.stroke(b, r, 1, 'rgba(255,244,220,0.45)'); b.restore();
        });
      // 副本那一塊原本的位置：石板升起來以後留下深深的凹槽，邊緣透出一點金光
      CR.smooth(b, region.pts.map(P)); b.fillStyle = 'rgba(22,17,13,0.75)'; b.fill();
      b.save(); b.shadowColor = '#ffd23f'; b.shadowBlur = 12;
      CR.smooth(b, region.pts.map(P)); CR.stroke(b, r, 1.6, 'rgba(255,210,63,0.55)'); b.restore();

      // 會升起來的那一塊石板，另外畫一張（有厚度、刻著颱風的符文）
      const pts = region.pts.map(P);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const TH = Math.max(7, s * 0.07); // 石板厚度
      const bx = Math.min(...xs) - 20, by = Math.min(...ys) - 20, bw = Math.max(...xs) - bx + 20, bh = Math.max(...ys) - by + 20 + TH;
      const piece = document.createElement('canvas');
      piece.width = bw * dpr; piece.height = bh * dpr;
      const pc = piece.getContext('2d');
      pc.scale(dpr, dpr); pc.translate(-bx, -by);
      pc.save(); pc.translate(0, TH); CR.smooth(pc, pts); CR.fill(pc, '#7a6a4e', r, null); CR.stroke(pc, r, 3); pc.restore();
      for (let k = 1; k < TH; k += 2) { pc.save(); pc.translate(0, k); CR.smooth(pc, pts); pc.fillStyle = '#8c7a58'; pc.fill(); pc.restore(); }
      CR.smooth(pc, pts); CR.fill(pc, '#e3d3a8', r, [bx, by, bw, bh], 1.4); CR.stroke(pc, r, 3.2);
      // 金色描邊
      pc.save(); pc.translate(0, 0); CR.smooth(pc, pts); pc.clip();
      CR.smooth(pc, pts); CR.stroke(pc, r, 7, 'rgba(255,200,60,0.55)');
      // 太魯閣峽谷的刻痕＋颱風符文
      const [lx, ly] = P(region.label);
      for (let k = 0; k < 3; k++) CR.line(pc, lx - 18 + k * 8, ly - 4, lx - 6 + k * 10, ly + 40, r, 1.6, 'rgba(120,84,20,0.55)', 3);
      const rr = Math.max(9, s * 0.09);
      pc.save(); pc.translate(lx + 2, ly - rr * 1.6);
      for (let k = 0; k < 3; k++) { pc.beginPath(); pc.arc(0, 0, rr * (0.35 + k * 0.32), k * 1.3, k * 1.3 + 4.2); CR.stroke(pc, r, 2, '#b07d10'); }
      pc.restore();
      pc.restore();

      // 金光先畫好一張（每一格都開 shadowBlur 在大螢幕上很慢）
      const HP = 50;
      const halo = document.createElement('canvas');
      halo.width = (bw + HP * 2) * dpr; halo.height = (bh + HP * 2) * dpr;
      const hc = halo.getContext('2d');
      hc.scale(dpr, dpr); hc.shadowColor = '#ffd23f'; hc.shadowBlur = 34;
      hc.drawImage(piece, HP, HP, bw, bh);

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
          ctx.translate(cx, cy - up); ctx.scale(grow, grow); ctx.translate(-cx, -cy);
          ctx.drawImage(halo, bx - HP, by - HP, bw + HP * 2, bh + HP * 2);
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
          // 石匾：深色石頭＋金框金字
          CR.rect(ctx, W / 2 - tw / 2 - 26, yT - fs * 0.85, tw + 52, fs * 1.7, rr, 2);
          CR.fill(ctx, '#5a5149', rr, null); CR.stroke(ctx, rr, 3.4);
          CR.rect(ctx, W / 2 - tw / 2 - 18, yT - fs * 0.68, tw + 36, fs * 1.36, rr, 1.2); CR.stroke(ctx, rr, 2.2, '#e0b84a');
          ctx.lineWidth = 4; ctx.strokeStyle = '#2b241e'; ctx.strokeText(opts.title, W / 2, yT + 1);
          ctx.fillStyle = '#ffe08a'; ctx.fillText(opts.title, W / 2, yT + 1);
          ctx.font = `700 ${Math.round(fs * 0.42)}px "Space Mono", monospace`;
          ctx.fillStyle = '#e8dcc4';
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
