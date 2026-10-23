// 角色外觀：前後端共用的選項清單 + 瀏覽器端的 Canvas 繪圖
(function (root) {
  const ANIMALS = {
    cat: '貓咪', dog: '狗狗', bear: '小熊', rabbit: '兔兔', fox: '狐狸', frog: '青蛙',
  };
  const COLORS = ['#f6c89f', '#f4a7b9', '#a8d8b9', '#9cc9f0', '#f7e08a', '#c7b3ec', '#d9a57a', '#e8e8e8'];
  const OUTFITS = ['#ffd23f', '#ff6b6b', '#4dabf7', '#51cf66', '#845ef7', '#ff922b'];

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = v => Math.max(0, Math.min(255, v + amt));
    const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // 在 ctx 上畫一隻動森風格的小動物，(0,0) 為左上角，大小 64x80
  function drawAvatar(ctx, { animal, color, outfit }) {
    const dark = shade(color, -45);
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#5a4636';
    ctx.lineJoin = 'round';

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(32, 76, 18, 4, 0, 0, Math.PI * 2); ctx.fill();

    // 腳
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(24, 72, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(40, 72, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 身體（黃色雨衣）
    ctx.fillStyle = outfit;
    ctx.beginPath();
    ctx.moveTo(18, 70); ctx.quadraticCurveTo(14, 50, 32, 48);
    ctx.quadraticCurveTo(50, 50, 46, 70); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 扣子
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(32, 58, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(32, 65, 2, 0, Math.PI * 2); ctx.fill();

    // 耳朵
    ctx.fillStyle = color;
    const ear = (pts) => { ctx.beginPath(); pts(); ctx.fill(); ctx.stroke(); };
    if (animal === 'cat' || animal === 'fox') {
      ear(() => { ctx.moveTo(12, 22); ctx.lineTo(16, 2); ctx.lineTo(28, 14); ctx.closePath(); });
      ear(() => { ctx.moveTo(52, 22); ctx.lineTo(48, 2); ctx.lineTo(36, 14); ctx.closePath(); });
    } else if (animal === 'rabbit') {
      ear(() => ctx.ellipse(22, 6, 6, 16, -0.15, 0, Math.PI * 2));
      ear(() => ctx.ellipse(42, 6, 6, 16, 0.15, 0, Math.PI * 2));
      ctx.fillStyle = '#f9b9c7';
      ctx.beginPath(); ctx.ellipse(22, 6, 3, 11, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(42, 6, 3, 11, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
    } else if (animal === 'bear') {
      ear(() => ctx.arc(14, 14, 8, 0, Math.PI * 2));
      ear(() => ctx.arc(50, 14, 8, 0, Math.PI * 2));
    } else if (animal === 'dog') {
      ear(() => ctx.ellipse(10, 26, 7, 13, 0.4, 0, Math.PI * 2));
      ear(() => ctx.ellipse(54, 26, 7, 13, -0.4, 0, Math.PI * 2));
    } else if (animal === 'frog') {
      ear(() => ctx.arc(19, 12, 9, 0, Math.PI * 2));
      ear(() => ctx.arc(45, 12, 9, 0, Math.PI * 2));
    }

    // 大頭
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(32, 30, 24, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 狐狸白臉頰
    if (animal === 'fox') {
      ctx.fillStyle = '#fff8ef';
      ctx.beginPath(); ctx.ellipse(32, 40, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
    }

    // 眼睛
    const eyeY = animal === 'frog' ? 13 : 29;
    if (animal === 'frog') {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(19, 12, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(45, 12, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.ellipse(22, eyeY, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(42, eyeY, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(23, eyeY - 1.5, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(43, eyeY - 1.5, 1.2, 0, Math.PI * 2); ctx.fill();

    // 腮紅
    ctx.fillStyle = 'rgba(255,120,140,0.45)';
    ctx.beginPath(); ctx.ellipse(16, 37, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(48, 37, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();

    // 鼻子嘴巴
    ctx.fillStyle = '#5a4636';
    if (animal !== 'frog') {
      ctx.beginPath(); ctx.ellipse(32, 35, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(28, 38); ctx.quadraticCurveTo(30, 41, 32, 38);
    ctx.quadraticCurveTo(34, 41, 36, 38);
    ctx.stroke();

    ctx.restore();
  }

  const avatar = { ANIMALS, COLORS, OUTFITS, drawAvatar, WIDTH: 64, HEIGHT: 80 };
  if (typeof module !== 'undefined' && module.exports) module.exports = avatar;
  else root.HQ_AVATAR = avatar;
})(this);
