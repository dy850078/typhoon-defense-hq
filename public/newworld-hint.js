// 新世界的手繪紙條：跟總部（game.js 的 drawHint）同一種畫法，蠟筆描邊的米白紙條＋手繪小圖示
//   NW_HINT.hint(iconKey, label, touch)  靠近東西時冒出來的動作紙條：圖示＋動作名稱＋小鍵帽（手機是「點我」），底下有小尖角
//   NW_HINT.tag(iconKey, name)           NPC 和地點的名牌：圖示＋名字
//   NW_HINT.talk(text)                   頭上的對話泡泡：蠟筆描邊的小紙片，底下有尖角；字比名牌小，最多四行
// 回傳 { url, w, h }（w、h 是畫面上要顯示的大小）
(function (root) {
  var CR = root.HQ_CRAYON, IC = root.HQ_ICONS;
  if (!CR || !IC) return;
  var PAPER = '#fbf6e9', INK = '#2b2a33', FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif', RES = 2, cache = {};
  // 新世界才有的兩個動作圖示：坐下（小椅子）、進出門（一扇開著的門）
  IC.add({
    'act-sit': function (x, r) {
      CR.rect(x, 12, 8, 6, 22, r, 0.5); CR.fill(x, '#c98a52', r, null); CR.stroke(x, r, 2.2);
      CR.rect(x, 10, 24, 28, 7, r, 0.6); CR.fill(x, '#f2c14e', r, [10, 24, 28, 7]); CR.stroke(x, r, 2.4);
      CR.line(x, 14, 31, 13, 41, r, 2.6); CR.line(x, 34, 31, 35, 41, r, 2.6);
    },
    'act-door': function (x, r) {
      CR.rect(x, 11, 7, 26, 34, r, 0.6); CR.fill(x, '#8a5f3d', r, null); CR.stroke(x, r, 2.4);
      x.beginPath(); x.moveTo(15, 10); x.lineTo(31, 14); x.lineTo(31, 41); x.lineTo(15, 38); x.closePath(); CR.fill(x, '#f2a65a', r, [15, 10, 16, 31]); CR.stroke(x, r, 2.2);
      CR.blob(x, 27, 27, 1.8, 1.8, r, 0.1, 8); CR.fill(x, '#ffd23f', r, null); CR.stroke(x, r, 1.2);
    },
  });
  function strip(key, iconKey, label, cap, capHot, tail) {
    if (cache[key]) return cache[key];
    var ICON = 22, PH = 30, TL = tail ? 7 : 0, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    var font = 'bold 13px ' + FONT, capFont = 'bold 10px ' + FONT, icon = iconKey ? IC.canvas(iconKey) : null;
    ctx.font = font; var tw = ctx.measureText(label).width;
    ctx.font = capFont; var cw = cap ? ctx.measureText(cap).width + 10 : 0;
    var left = 7 + (icon ? ICON + 5 : 2), bw = Math.ceil(left + tw + (cap ? 7 + cw : 0) + 8), ox = 2, oy = 1.5, w = bw + 5, h = PH + 4 + TL;
    cv.width = w * RES; cv.height = h * RES; ctx.scale(RES, RES);
    var r = CR.rng(label.length * 97 + (capHot ? 1 : 0) + label.charCodeAt(0));
    var tri = function (dx, dy) { var m = ox + bw / 2; ctx.beginPath(); ctx.moveTo(m - 7 + dx, oy + PH - 1 + dy); ctx.lineTo(m + dx, oy + PH + TL + dy); ctx.lineTo(m + 7 + dx, oy + PH - 1 + dy); };
    // 影子 → 紙 → 描邊 → 尖角
    ctx.fillStyle = 'rgba(43,42,51,0.28)';
    CR.rect(ctx, ox + 2, oy + 2, bw, PH, r, 0.6); ctx.fill(); if (tail) { tri(2, 2); ctx.closePath(); ctx.fill(); }
    CR.rect(ctx, ox, oy, bw, PH, r, 1.1); ctx.fillStyle = PAPER; ctx.fill(); CR.stroke(ctx, r, 1.6, INK);
    if (tail) { tri(0, 0); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); tri(0, 0); CR.stroke(ctx, r, 1.6, INK); }
    if (icon) ctx.drawImage(icon, ox + 7, oy + (PH - ICON) / 2, ICON, ICON);
    ctx.font = font; ctx.fillStyle = INK; ctx.textBaseline = 'middle'; ctx.fillText(label, ox + left, oy + PH / 2 + 0.5);
    if (cap) { var cx = ox + left + tw + 7, cy = oy + (PH - 17) / 2;
      CR.rect(ctx, cx, cy + 1.5, cw, 17, r, 0.4); ctx.fillStyle = capHot ? '#c9562a' : '#b9b2a2'; ctx.fill();
      CR.rect(ctx, cx, cy, cw, 15.5, r, 0.4); ctx.fillStyle = capHot ? '#ff6a13' : '#ffffff'; ctx.fill(); CR.stroke(ctx, r, 1.3, INK);
      ctx.font = capFont; ctx.fillStyle = capHot ? '#ffffff' : INK; ctx.textAlign = 'center'; ctx.fillText(cap, cx + cw / 2, cy + 8.5); }
    return (cache[key] = { url: cv.toDataURL(), w: w, h: h });
  }
  // 對話泡泡（總部 game.js 的 drawTalk 搬過來，縮小一號）。短句用窄的，長句才放寬；標點不放行首，兩行時盡量在標點後面換行
  var PUNC = '，。！？…、,.!?~）」';
  function talk(text) {
    text = String(text == null ? '' : text).replace(/\s+/g, ' ').trim(); if (!text) return null;
    var key = 'k|' + text; if (cache[key]) return cache[key];
    var TL = 6, PAD = 7, LH = 14, MAXL = 4, cv = document.createElement('canvas'), ctx = cv.getContext('2d'), font = 'bold 11px ' + FONT;
    ctx.font = font; var W = function (t) { return ctx.measureText(t).width; }, chars = Array.from(text), MAXW = W(text) > 230 ? 132 : 114;
    var lines = [], cur = '';
    chars.forEach(function (ch) { if (W(cur + ch) > MAXW && cur && PUNC.indexOf(ch) < 0) { lines.push(cur); cur = ch; } else cur += ch; });
    if (cur) lines.push(cur);
    if (lines.length === 2) { var best = 0, bd = 1e9;
      chars.forEach(function (ch, i) { if (PUNC.indexOf(ch) < 0 || i >= chars.length - 1) return; var a = chars.slice(0, i + 1).join(''), b = chars.slice(i + 1).join('');
        if (W(a) <= MAXW && W(b) <= MAXW && Math.abs(i + 1 - chars.length / 2) < bd) { bd = Math.abs(i + 1 - chars.length / 2); best = i + 1; } });
      if (best) { lines[0] = chars.slice(0, best).join(''); lines[1] = chars.slice(best).join(''); } }
    if (lines.length > MAXL) { lines.length = MAXL; var last = Array.from(lines[MAXL - 1]); while (last.length && W(last.join('') + '…') > MAXW) last.pop(); lines[MAXL - 1] = last.join('') + '…'; }
    var tw = Math.max.apply(null, lines.map(W)), bw = Math.max(26, Math.ceil(tw + PAD * 2)), PH = lines.length * LH + 8, ox = 2, oy = 1.5, w = bw + 5, h = PH + 4 + TL;
    cv.width = w * RES; cv.height = h * RES; ctx.scale(RES, RES);
    var r = CR.rng(text.length * 53 + 11 + text.charCodeAt(0));
    var tri = function (dx, dy) { var m = ox + bw / 2; ctx.beginPath(); ctx.moveTo(m - 5 + dx, oy + PH - 1 + dy); ctx.lineTo(m + dx, oy + PH + TL + dy); ctx.lineTo(m + 5 + dx, oy + PH - 1 + dy); };
    ctx.fillStyle = 'rgba(43,42,51,0.26)';
    CR.rect(ctx, ox + 1.5, oy + 2, bw, PH, r, 0.6); ctx.fill(); tri(1.5, 2); ctx.closePath(); ctx.fill();
    CR.rect(ctx, ox, oy, bw, PH, r, 1); ctx.fillStyle = PAPER; ctx.fill(); CR.stroke(ctx, r, 1.4, INK);
    tri(0, 0); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); tri(0, 0); CR.stroke(ctx, r, 1.4, INK);
    ctx.font = font; ctx.fillStyle = INK; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    lines.forEach(function (l, i) { ctx.fillText(l, ox + bw / 2, oy + 4 + LH * (i + 0.5) + 0.5); });
    var n = 0; for (var k in cache) if (k.charCodeAt(0) === 107 && k.charAt(1) === '|') n++;   // 講過的話不用一直留著
    if (n > 60) for (var k2 in cache) if (k2.charCodeAt(0) === 107 && k2.charAt(1) === '|') delete cache[k2];
    return (cache[key] = { url: cv.toDataURL(), w: w, h: h, lines: lines.length });
  }
  root.NW_HINT = {
    talk: talk,
    hint: function (iconKey, label, touch) { return strip('h|' + iconKey + '|' + label + '|' + (touch ? 1 : 0), iconKey, label, touch ? '點我' : 'E', !!touch, true); },
    tag: function (iconKey, name) { return strip('t|' + iconKey + '|' + name, iconKey, name, '', false, false); },
  };
})(this);
