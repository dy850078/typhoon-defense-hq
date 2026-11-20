// 產生 PWA 主畫面圖示（public/icon-*.png），和 apple-touch-icon 同一個圖案：深藍底、橘色星星、兩條軌道
// 用法：node scripts/make-icons.js（需要 playwright，雲端環境內建；一般不用重跑，圖檔已經放進 repo）
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function draw(S, pad) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#131A28'; x.fillRect(0, 0, S, S);
  x.translate(S / 2, S / 2); x.scale(S * pad / 180, S * pad / 180);
  // 白色虛線軌道
  x.save(); x.rotate(0.62); x.strokeStyle = '#F2F4F8'; x.lineWidth = 7; x.setLineDash([13, 11]);
  x.beginPath(); x.ellipse(0, 0, 70, 29, 0, 0, Math.PI * 2); x.stroke(); x.restore();
  // 灰色實線軌道 + 兩顆小星球
  x.save(); x.rotate(-0.5); x.strokeStyle = '#9AA3B5'; x.lineWidth = 7;
  x.beginPath(); x.ellipse(0, 0, 80, 25, 0, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#FF6A13'; x.beginPath(); x.arc(78, -6, 15, 0, 7); x.fill();
  x.fillStyle = '#9AA3B5'; x.beginPath(); x.arc(-78, 6, 12, 0, 7); x.fill();
  x.restore();
  // 四角星星
  const k = 124 / 28; x.save(); x.scale(k, k); x.translate(-14, -14); x.fillStyle = '#FF6A13';
  x.beginPath(); x.moveTo(14, 0); x.bezierCurveTo(15.5, 10, 18, 12.5, 28, 14); x.bezierCurveTo(18, 15.5, 15.5, 18, 14, 28);
  x.bezierCurveTo(12.5, 18, 10, 15.5, 0, 14); x.bezierCurveTo(10, 12.5, 12.5, 10, 14, 0); x.fill(); x.restore();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, 10, 0, 7); x.fill();
  return c.toDataURL('image/png');
}

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  // any：和 iPhone 圖示一樣滿版；maskable：Android 會裁成圓形，內容縮到中間 80%
  const list = [['icon-192.png', 192, 0.9], ['icon-512.png', 512, 0.9], ['icon-maskable-192.png', 192, 0.74], ['icon-maskable-512.png', 512, 0.74]];
  for (const [name, S, pad] of list) {
    const d = await pg.evaluate(`(${draw})(${S}, ${pad})`);
    fs.writeFileSync(path.join(__dirname, '..', 'public', name), Buffer.from(d.split(',')[1], 'base64'));
  }
  await b.close();
})();
