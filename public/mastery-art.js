// 職業熟練度的手繪圖：名牌上的職業徽章（框跟著階數變）、5 階腳下的金色光陣
(function (root) {
  const C = root.HQ_CRAYON;
  const INK = C.INK;
  // 0～5 階的框：灰 → 墨線 → 銅 → 銀 → 金黃 → 七彩
  const RINGS = [
    { ring: '#b8b2a3', w: 1.6, bg: '#eee8d8', dim: true },
    { ring: INK, w: 2, bg: '#fbf6e9' },
    { ring: '#b8743a', w: 3.2, bg: '#fbf6e9' },
    { ring: '#9aa6b8', w: 3.4, bg: '#fdfdf8', inner: true },
    { ring: '#e0a92a', w: 4.2, bg: '#fff8df', inner: true },
    { ring: 'rainbow', w: 4.6, bg: '#fffbea', glow: true },
  ];
  const RAINBOW = ['#f26b6b', '#f6a24a', '#f6d64a', '#7fcf7f', '#6fb0ea', '#9b86e6', '#e58ad0', '#f26b6b'];
  function rainbow(x, cx, cy) {
    if (!x.createConicGradient) return '#e0a92a';
    const g = x.createConicGradient(0, cx, cy);
    RAINBOW.forEach((c, i) => g.addColorStop(i / (RAINBOW.length - 1), c));
    return g;
  }
  // 徽章：畫在 size x size 的畫布上（預設 96，貼到名牌上再縮小）
  function badge(cls, tier, size) {
    const S = size || 96, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const x = cv.getContext('2d'), T = RINGS[Math.max(0, Math.min(5, tier || 0))];
    const r = C.rng(7 + (tier || 0) * 13 + cls.length);
    x.scale(S / 48, S / 48);
    if (T.glow) {
      const g = x.createRadialGradient(24, 24, 12, 24, 24, 24);
      g.addColorStop(0, 'rgba(255,240,170,.9)'); g.addColorStop(1, 'rgba(255,240,170,0)');
      x.fillStyle = g; x.beginPath(); x.arc(24, 24, 24, 0, 7); x.fill();
    }
    C.blob(x, 24, 24, 19, 19, r, 0.04, 18);
    C.fill(x, T.bg, r, [5, 5, 38, 38]);
    C.stroke(x, r, T.w, T.ring === 'rainbow' ? rainbow(x, 24, 24) : T.ring);
    if (T.inner) { C.blob(x, 24, 24, 15.5, 15.5, r, 0.04, 16); C.stroke(x, r, 1, T.ring); }
    const ic = root.HQ_ICONS && root.HQ_ICONS.canvas('cls-' + cls);
    if (ic) {
      x.save();
      if (T.dim) x.globalAlpha = 0.6;
      x.drawImage(ic, 11, 11, 26, 26);
      x.restore();
    }
    return cv;
  }
  const urls = {};
  function badgeUrl(cls, tier) {
    const k = cls + tier;
    return urls[k] || (urls[k] = badge(cls, tier, 96).toDataURL());
  }
  function badgeEl(cls, tier, extra) {
    const i = document.createElement('img');
    i.src = badgeUrl(cls, tier); i.alt = ''; i.className = 'hq-icon badge-ic' + (extra ? ' ' + extra : '');
    return i;
  }
  // 5 階的光陣：一個正圓（外面再壓扁成橢圓、慢慢轉），中間不畫花紋
  function footCircle(size) {
    const S = size || 256, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const x = cv.getContext('2d'), r = C.rng(5), c = S / 2, k = S / 160;
    x.translate(c, c); x.scale(k, k);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 78);
    g.addColorStop(0, 'rgba(255,236,150,.75)'); g.addColorStop(0.7, 'rgba(255,214,90,.35)'); g.addColorStop(1, 'rgba(255,214,90,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 78, 0, 7); x.fill();
    x.beginPath(); x.arc(0, 0, 66, 0, 7); C.stroke(x, r, 5, '#d99a1e');
    x.beginPath(); x.arc(0, 0, 57, 0, 7); C.stroke(x, r, 2.2, '#fff1b0');
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      C.line(x, Math.cos(a) * 57, Math.sin(a) * 57, Math.cos(a) * 66, Math.sin(a) * 66, r, 2, '#d99a1e', 0.3);
    }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      x.save(); x.translate(Math.cos(a) * 72, Math.sin(a) * 72); x.fillStyle = '#fff';
      x.beginPath(); x.moveTo(0, -6); x.quadraticCurveTo(1, -1, 6, 0); x.quadraticCurveTo(1, 1, 0, 6); x.quadraticCurveTo(-1, 1, -6, 0); x.quadraticCurveTo(-1, -1, 0, -6); x.fill();
      x.restore();
    }
    return cv;
  }
  // 光柱：一條往上淡掉的光
  function pillar() {
    const cv = document.createElement('canvas');
    cv.width = 12; cv.height = 96;
    const x = cv.getContext('2d'), g = x.createLinearGradient(0, 96, 0, 0);
    g.addColorStop(0, 'rgba(255,232,140,.9)'); g.addColorStop(1, 'rgba(255,244,190,0)');
    x.fillStyle = g; x.fillRect(3, 0, 6, 96);
    return cv;
  }
  root.HQ_MASTERY_ART = { badge, badgeUrl, badgeEl, footCircle, pillar, RINGS };
})(this);
