// 新世界的介面外殼：所有面板共用的長相（蠟筆描邊的紙、柚木標題列、花磚角）、右上那一排圖示鈕、設定、管理員的「功能測試」
// 長相是畫出來的圖，放進 CSS 變數（--nw-frame、--nw-chip、--nw-chip-on、--nw-wood、--nw-tile），樣式寫在 newworld.html
// 用法：NW_SHELL.start(NW, { token, panels, saveLook, onPet })
(function (root) {
  var CR = root.HQ_CRAYON, IC = root.HQ_ICONS;
  if (!CR || !IC) return;
  var INK = '#2b2a33', PAPER = '#fbf6e9';
  function cv(w, h, s) { var c = document.createElement('canvas'); c.width = w * s; c.height = h * s; var x = c.getContext('2d'); x.scale(s, s); return [c, x]; }
  // 一張蠟筆描邊的紙，給 border-image 切九宮格用：四個角不變形，邊跟著面板拉長
  function frame(seed, paper, line) {
    var a = cv(60, 60, 2), x = a[1], r = CR.rng(seed);
    x.fillStyle = 'rgba(43,42,51,0.26)'; CR.rect(x, 6, 7, 50, 50, r, 0.7); x.fill();
    CR.rect(x, 3.5, 3.5, 50, 50, r, 0.9); x.fillStyle = paper; x.fill(); CR.stroke(x, r, line, INK);
    return a[0].toDataURL();
  }
  // 柚木條：標題列的底。順著長邊走的木紋（深淺交錯的細線）、繞著木節彎過去的山形紋、一點一點的導管孔
  function wood() {
    var W = 480, H = 40, a = cv(W, H, 2), x = a[1], r = CR.rng(71), g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#c08a52'); g.addColorStop(0.45, '#b0763f'); g.addColorStop(1, '#9a6233'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    // 幾條顏色深淺不同的寬帶（木頭一年一年長出來的色差）
    for (var b = 0; b < 5; b++) { var by = r() * H, bh = 4 + r() * 9; x.fillStyle = b % 2 ? 'rgba(122,72,34,.16)' : 'rgba(226,176,116,.16)'; x.beginPath(); x.moveTo(0, by);
      for (var bx = 0; bx <= W; bx += 40) x.lineTo(bx, by + Math.sin(bx * 0.012 + b) * 2.5); for (bx = W; bx >= 0; bx -= 40) x.lineTo(bx, by + bh + Math.sin(bx * 0.012 + b + 1) * 2.5); x.fill(); }
    // 兩個木節：附近的木紋會繞著它鼓起來
    var knots = [{ x: 120 + r() * 60, y: 13 + r() * 6, w: 46, h: 7 }, { x: 330 + r() * 70, y: 24 + r() * 6, w: 60, h: 8 }];
    var bend = function (px, py) { var d = 0; knots.forEach(function (k) { var dx = (px - k.x) / k.w, dy = py - k.y, f = Math.exp(-dx * dx); d += f * k.h * dy / (Math.abs(dy) + 3.5) * Math.exp(-Math.abs(dy) / 16); }); return d; };
    for (var i = 0; i < 34; i++) { var y0 = -2 + i * 1.32 + (r() - 0.5) * 1.2, ph = r() * 6, amp = 0.5 + r() * 1.1, dark = r() < 0.62;
      x.beginPath(); for (var px = -4; px <= W + 4; px += 6) { var py = y0 + Math.sin(px * 0.009 + ph) * amp + Math.sin(px * 0.031 + ph * 2) * 0.35; py += bend(px, py); if (px < 0) x.moveTo(px, py); else x.lineTo(px, py); }
      x.strokeStyle = dark ? 'rgba(98,56,26,' + (0.2 + r() * 0.3).toFixed(2) + ')' : 'rgba(236,190,132,' + (0.16 + r() * 0.22).toFixed(2) + ')'; x.lineWidth = 0.45 + r() * (dark ? 0.9 : 0.6); x.stroke(); }
    knots.forEach(function (k) { x.beginPath(); x.ellipse(k.x, k.y, 5, 1.9, 0, 0, Math.PI * 2); x.fillStyle = 'rgba(92,52,24,.5)'; x.fill(); x.beginPath(); x.ellipse(k.x, k.y, 8.5, 3.3, 0, 0, Math.PI * 2); x.strokeStyle = 'rgba(92,52,24,.35)'; x.lineWidth = 0.7; x.stroke(); });
    // 導管孔：順著木紋方向的小短線
    for (var n = 0; n < 260; n++) { var qx = r() * W, qy = r() * H, ql = 2 + r() * 7; qy += bend(qx, qy); x.beginPath(); x.moveTo(qx, qy); x.lineTo(qx + ql, qy + (r() - 0.5) * 0.5); x.strokeStyle = 'rgba(84,46,20,' + (0.12 + r() * 0.2).toFixed(2) + ')'; x.lineWidth = 0.5; x.stroke(); }
    // 上緣一點亮、下緣一點暗，像一塊有厚度的板子
    x.fillStyle = 'rgba(255,236,200,.22)'; x.fillRect(0, 0, W, 2.2); x.fillStyle = 'rgba(60,32,14,.24)'; x.fillRect(0, H - 2.6, W, 2.6);
    return a[0].toDataURL();
  }
  // 花磚：米白底、綠色格線、紅色四瓣花（跟大廳地上那一款同一個花樣）
  function tile() {
    var a = cv(24, 24, 3), x = a[1], r = CR.rng(5);
    x.fillStyle = '#f7ecd0'; x.fillRect(0, 0, 24, 24);
    CR.line(x, 12, 0, 12, 24, r, 2.2, '#7fa37a', 0.4); CR.line(x, 0, 12, 24, 12, r, 2.2, '#7fa37a', 0.4);
    [[12, 7.4], [12, 16.6], [7.4, 12], [16.6, 12]].forEach(function (p) { CR.blob(x, p[0], p[1], 3, 3, r, 0.08, 10); x.fillStyle = '#d2543f'; x.fill(); });
    CR.blob(x, 12, 12, 1.7, 1.7, r, 0.05, 8); x.fillStyle = '#f2c14e'; x.fill();
    [[0, 0], [24, 0], [0, 24], [24, 24]].forEach(function (p) { CR.blob(x, p[0], p[1], 3.4, 3.4, r, 0.08, 10); x.fillStyle = '#4f7cc2'; x.fill(); });
    return a[0].toDataURL();
  }
  var st = document.documentElement.style;
  st.setProperty('--nw-frame', 'url(' + frame(11, PAPER, 1.8) + ')'); st.setProperty('--nw-chip', 'url(' + frame(23, PAPER, 2) + ')'); st.setProperty('--nw-chip-on', 'url(' + frame(23, '#f3d27a', 2) + ')');
  st.setProperty('--nw-wood', 'url(' + wood() + ')'); st.setProperty('--nw-tile', 'url(' + tile() + ')');

  // 這一排才有的四個圖示：換裝（上衣）、寵物（腳印）、設定（齒輪）、功能測試（燒瓶）
  IC.add({
    'btn-dress': function (x, r) {
      x.beginPath(); [[16, 9], [21, 12], [27, 12], [32, 9], [43, 17], [37, 25], [33, 22], [33, 41], [15, 41], [15, 22], [11, 25], [5, 17]].forEach(function (p, i) { if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); }); x.closePath();
      CR.fill(x, '#4f7cc2', r, [5, 9, 38, 32]); CR.stroke(x, r, 2.4);
      x.beginPath(); x.moveTo(20, 12); x.quadraticCurveTo(24, 18, 28, 12); CR.stroke(x, r, 1.8);
      CR.blob(x, 24, 29, 3.4, 3.4, r, 0.1, 10); CR.fill(x, '#ffd23f', r, null); CR.stroke(x, r, 1.3);
    },
    'btn-paw': function (x, r) {
      CR.blob(x, 24, 31, 11, 9, r, 0.07, 18); CR.fill(x, '#f2a65a', r, [13, 22, 22, 18]); CR.stroke(x, r, 2.3);
      [[10, 20, 4.2, 5], [19, 11, 4.4, 5.4], [29, 11, 4.4, 5.4], [38, 20, 4.2, 5]].forEach(function (p) { CR.blob(x, p[0], p[1], p[2], p[3], r, 0.07, 12); CR.fill(x, '#f2a65a', r, null); CR.stroke(x, r, 2.1); });
    },
    'btn-set': function (x, r) {
      for (var i = 0; i < 8; i++) { x.save(); x.translate(24, 24); x.rotate(i * Math.PI / 4); CR.rect(x, -4.2, -20, 8.4, 9, r, 0.4); CR.fill(x, '#8fa2a4', r, null); CR.stroke(x, r, 2); x.restore(); }
      CR.blob(x, 24, 24, 14, 14, r, 0.04, 20); CR.fill(x, '#a9babb', r, [10, 10, 28, 28]); CR.stroke(x, r, 2.3);
      CR.blob(x, 24, 24, 5.6, 5.6, r, 0.06, 12); CR.fill(x, PAPER, r, null); CR.stroke(x, r, 2);
    },
    'btn-test': function (x, r) {
      var body = function () { x.beginPath(); x.moveTo(20, 7); x.lineTo(28, 7); x.lineTo(28, 19); x.lineTo(40, 38); x.quadraticCurveTo(41, 42, 37, 42); x.lineTo(11, 42); x.quadraticCurveTo(7, 42, 8, 38); x.lineTo(20, 19); x.closePath(); };
      body(); CR.fill(x, '#eaf6ff', r, null);
      x.beginPath(); x.moveTo(14.5, 29); x.lineTo(33.5, 29); x.lineTo(40, 38); x.quadraticCurveTo(41, 42, 37, 42); x.lineTo(11, 42); x.quadraticCurveTo(7, 42, 8, 38); x.closePath(); CR.fill(x, '#f2a65a', r, [8, 29, 32, 13]);
      body(); CR.stroke(x, r, 2.4); CR.line(x, 17, 7, 31, 7, r, 2.6);
      CR.blob(x, 20, 35, 2, 2, r, 0.1, 8); CR.fill(x, '#fff7e6', r, null); CR.blob(x, 27, 37, 1.4, 1.4, r, 0.1, 8); CR.fill(x, '#fff7e6', r, null);
      CR.blob(x, 34, 12, 2.2, 2.2, r, 0.1, 8); CR.stroke(x, r, 1.4); CR.blob(x, 38, 5, 1.4, 1.4, r, 0.1, 8); CR.stroke(x, r, 1.2);
    },
  });

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  root.NW_SHELL = { start: function (NW, o) {
    var C3 = root.HQ_CLS3, panels = o.panels, BOX = $('btns'), SETP = $('set-panel'), TEST = $('test-panel'), DRESS = $('dress');
    var toast = function (t) { if (panels && t) panels.toast(t); };
    [].forEach.call(BOX.querySelectorAll('.hb[data-ic]'), function (b) { var i = el('img'); i.alt = ''; i.src = IC.url(b.getAttribute('data-ic')) || ''; b.insertBefore(i, b.firstChild); });
    // 一次只開一張面板：開這張之前先把別張收起來
    function shut(keep) {
      if (keep !== 'set') SETP.hidden = true; if (keep !== 'test') TEST.hidden = true; if (keep !== 'dress') DRESS.hidden = true;
      if (keep !== 'panel' && panels) panels.close(); if (keep !== 'sk' && root.NW_SK && NW_SK.isOpen()) NW_SK.close();
      BOX.classList.remove('open'); $('b-kit').setAttribute('aria-expanded', 'false');
    }
    $('b-kit').onclick = function () { var on = BOX.classList.toggle('open'); $('b-kit').setAttribute('aria-expanded', on ? 'true' : 'false'); };
    var skMode = '';
    function sk(mode) { return function () { var SK = root.NW_SK; if (!SK) return toast('連線中，等一下再試');
      if (SK.isOpen() && skMode === mode) { shut(); return; } shut('sk'); skMode = mode; if (mode === 'class') SK.openClass(); else SK.openBook(); }; }
    $('b-cls').onclick = sk('class'); $('b-skill').onclick = sk('book');
    function pan(kind) { return function () { if (!panels) return; shut('panel'); panels.open(kind, null, true); }; }
    $('b-gear').onclick = pan('gear'); $('b-bag').onclick = pan('bag'); $('b-pet').onclick = pan('pet'); $('b-song').onclick = pan('juke');
    $('b-dress').onclick = function () { var was = !DRESS.hidden; shut(); if (!was) { DRESS.hidden = false; o.drawDress(); } };
    function own(P, key) { return function () { var was = !P.hidden; shut(); P.hidden = was; }; }
    $('b-set').onclick = own(SETP, 'set'); $('b-test').onclick = own(TEST, 'test');
    document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('#cb-me')) { SETP.hidden = true; TEST.hidden = true; } }, true);   // 點等級卡開技能書的時候
    [].forEach.call(document.querySelectorAll('[data-shut]'), function (b) { b.onclick = function () { shut(); }; });
    // 職業鈕上的圖示跟著現在的職業換
    if (NW.combat) setInterval(function () { var v = NW.combat.view(), k = v ? 'nwc-' + (v.spec || v.school || 'sprout') : ''; var i = $('b-cls').firstChild; if (k && i.dataset.k !== k && IC.url(k)) { i.dataset.k = k; i.src = IC.url(k); } }, 1000);   // （戰鬥那邊的 onChange 只能掛一個，已經給技能介面用了，這裡用問的）

    // ---------- 功能測試：只有管理員帳號看得到，伺服器每個動作都會再檢查一次 ----------
    var ask = function (ev, arg) { return root.NW_SK ? NW_SK.ask(ev, arg) : Promise.resolve({ error: '連線中，等一下再試' }); };
    var said = function (ok) { return function (r) { toast(r && r.error ? r.error : ok); return r; }; };
    function post(body) { return fetch('/api/newworld/test', { method: 'POST', headers: { Authorization: 'Bearer ' + o.token, 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.ok ? r.json() : { ok: false, error: r.status === 403 ? '只有管理員可以' : '連不上伺服器，等等再試' }; }, function () { return { ok: false, error: '連不上伺服器，等等再試' }; }); }
    function btn(box, text, fn, cls) { var b = el('button', 'opt' + (cls ? ' ' + cls : ''), text); b.type = 'button'; b.onclick = fn; $(box).appendChild(b); return b; }
    function icoBtn(box, key, text, fn) { var b = btn(box, '', fn), u = IC.url(key); if (u) { var i = el('img', 'ic'); i.src = u; i.alt = ''; b.appendChild(i); } b.appendChild(document.createTextNode(text)); return b; }
    if (C3) {
      [1, 10, 30, 50].forEach(function (lv) { btn('t-lv', lv + ' 等', function () { ask('cb:dbg', { lv: lv }).then(said('等級調成 ' + lv)); }).dataset.t = 'lv' + lv; });
      btn('t-lv', '熟練度練滿', function () { ask('cb:dbg', { m: C3.GATE.mastery }).then(said('現在學門的熟練度練滿了')); });
      btn('t-lv', '信物補滿', function () { ask('cb:dbg', { quest: 1 }).then(said('試煉的信物補滿了')); });
      btn('t-lv', '血補滿', function () { ask('cb:dbg', { hp: 1 }).then(said('血補滿了')); });
      var sure = 0, rs = btn('t-lv', '全部重來', function () { if (Date.now() - sure > 3000) { sure = Date.now(); rs.textContent = '確定重來？再按一次'; rs.classList.add('warn'); setTimeout(function () { rs.textContent = '全部重來'; rs.classList.remove('warn'); }, 3000); return; }
        sure = 0; ask('cb:dbg', { reset: 1 }).then(said('回到 1 等的芽')); }); rs.dataset.t = 'reset';
      // 直接轉職：照正常的路走一遍（升等 → 進學門 → 練滿 → 接試煉 → 信物補滿 → 轉職），每一步都是伺服器在判斷
      var toSchool = function (k) { return ask('cb:dbg', { lv: 10 }).then(function (r) { return r && r.error ? r : ask('cb:school', k); }); };
      var toSpec = function (sp) { var S = C3.SPECS[sp];
        return ask('cb:dbg', { lv: 50 }).then(function (r) { return r && r.error ? r : ask('cb:school', S.school); })
          .then(function (r) { return r && r.error ? r : ask('cb:dbg', { m: C3.GATE.mastery }); }).then(function (r) { return r && r.error ? r : ask('cb:quest', sp); })
          .then(function () { return ask('cb:dbg', { quest: 1 }); }).then(function () { return ask('cb:spec', sp); }); };
      Object.keys(C3.SCHOOLS).forEach(function (k) { var S = C3.SCHOOLS[k];
        icoBtn('t-cls', 'nwc-' + k, '見習生：' + S.name, function () { toSchool(k).then(said('進了「' + S.name + '」（10 等）')); }).dataset.t = k;
        S.specs.forEach(function (sp) { icoBtn('t-cls', 'nwc-' + sp, C3.SPECS[sp].name, function () { toSpec(sp).then(said('轉職成' + C3.SPECS[sp].name + '了（50 等）')); }).dataset.t = sp; }); });
    }
    var give = function (body, after) { return function () { post(body).then(function (r) { toast(r.ok ? r.text : r.error); if (r.ok && after) after(r); if (r.ok && panels) panels.refresh(); }); }; };
    [['tickets', '扭蛋券 10 張'], ['food', '補品各 5 個'], ['magical', '魔法少女整套'], ['wizard', '小巫師整套']].forEach(function (a) { btn('t-give', a[1], give({ act: 'give', set: a[0] })).dataset.t = a[0]; });
    [['cat', '給一隻貓'], ['dog', '給一隻狗'], ['horse', '給一匹小馬'], ['none', '收走寵物']].forEach(function (a) { btn('t-give', a[1], give({ act: 'pet', kind: a[0] }, function (r) { NW.setPet(r.pet); o.onPet(r.pet); })).dataset.t = 'pet-' + a[0]; });
    btn('t-give', '清空背包和裝備', give({ act: 'clear' }, function () { NW.gear({}); }), 'warn');
    $('b-rand').onclick = function () { var O = NW.options(); if (!O) return; var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
      NW.dress({ hair: pick(O.parts.hair), top: pick(O.parts.top), face: pick(O.parts.face), hairCol: pick(O.swatch.hair), topCol: pick(O.swatch.top), skinCol: pick(O.swatch.skin), glasses: Math.random() < 0.4 }); o.saveLook(); toast('換了一個隨機的外觀'); };
    return { shut: shut, admin: function (on) { document.body.classList.toggle('is-admin', !!on); $('b-test').hidden = !on; if (!on) TEST.hidden = true; } };
  } };
})(this);
