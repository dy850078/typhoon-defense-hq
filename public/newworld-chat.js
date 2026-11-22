// 新世界的聊天區：手繪圖示鈕、可以收起來、可以往上捲看之前的話、系統訊息開關
//   NW_CHAT.start()            接上按鈕（聊天、系統訊息開關），手機一開始是收著的
//   NW_CHAT.add(name, text, mine)   有人說話
//   NW_CHAT.sys(text)          系統訊息（畫面上方跳出來的提示也會記一份在這裡）
//   NW_CHAT.fold(on)           收起來／打開
// 收著的時候只看得到最後幾句（浮在畫面上、不擋點擊）；打開是一張可以捲的紙，留最近 100 句
(function (root) {
  var CR = root.HQ_CRAYON, IC = root.HQ_ICONS, KEEP = 100;
  var $ = function (id) { return document.getElementById(id); };
  if (CR && IC) IC.add({
    // 聊天：對話框裡三個點
    'btn-chat': function (x, r) {
      x.beginPath(); x.moveTo(6, 8); x.lineTo(42, 8); x.lineTo(42, 33); x.lineTo(24, 33); x.lineTo(13, 42); x.lineTo(15, 33); x.lineTo(6, 33); x.closePath();
      CR.fill(x, '#fbf6e9', r, [6, 8, 36, 34]); CR.stroke(x, r, 2.4);
      [15, 24, 33].forEach(function (cx) { CR.blob(x, cx, 20.5, 2.1, 2.1, r, 0.08, 8); x.fillStyle = '#2b2a33'; x.fill(); });
    },
    // 表情：黃色笑臉
    'btn-emote': function (x, r) {
      CR.blob(x, 24, 24, 17, 16.5, r, 0.05); CR.fill(x, '#ffd23f', r, [7, 7, 34, 34]); CR.stroke(x, r, 2.4);
      CR.blob(x, 17.5, 20, 2, 2.6, r, 0.05, 8); x.fillStyle = '#2b2a33'; x.fill(); CR.blob(x, 30.5, 20, 2, 2.6, r, 0.05, 8); x.fill();
      x.beginPath(); x.moveTo(15.5, 27.5); x.quadraticCurveTo(24, 36.5, 32.5, 27.5); CR.stroke(x, r, 2.2);
      CR.blob(x, 12.5, 26.5, 2.6, 1.7, r, 0.05, 8); x.fillStyle = 'rgba(239,75,92,.55)'; x.fill(); CR.blob(x, 35.5, 26.5, 2.6, 1.7, r, 0.05, 8); x.fill();
    },
    // 動作：舉起來揮的手，旁邊兩道揮動的線
    'btn-act': function (x, r) {
      x.beginPath(); [[17, 42], [15, 27], [11, 19], [14.5, 17], [18.5, 23], [18, 9], [22, 8.5], [23.5, 20], [25, 6.5], [29, 7], [28.5, 20.5], [31.5, 9.5], [35, 10.5], [33, 23], [37, 17.5], [40, 19.5], [35, 32], [32, 42]].forEach(function (p, i) { if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); }); x.closePath();
      CR.fill(x, '#f6c9a0', r, [11, 6, 29, 36]); CR.stroke(x, r, 2.2);
      CR.line(x, 5, 11, 8, 16, r, 2, '#4f7cc2', 0.4); CR.line(x, 43, 9, 41, 14, r, 2, '#4f7cc2', 0.4);
    },
    // 送出：紙飛機
    'btn-send': function (x, r) {
      x.beginPath(); x.moveTo(6, 22); x.lineTo(42, 7); x.lineTo(31, 41); x.lineTo(23, 28); x.closePath(); CR.fill(x, '#ffffff', r, [6, 7, 36, 34]); CR.stroke(x, r, 2.3);
      x.beginPath(); x.moveTo(42, 7); x.lineTo(23, 28); x.lineTo(21, 39); x.lineTo(27, 33); CR.stroke(x, r, 1.9);
      x.beginPath(); x.moveTo(23, 28); x.lineTo(21, 39); x.lineTo(27, 33); x.closePath(); CR.fill(x, '#e8a23c', r, null); CR.stroke(x, r, 1.6);
    },
  });
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var BOX, LOG, started = false, unread = false;
  function ico(b, key, keep) { var u = IC && IC.url(key); if (!b || !u) return; var i = b.querySelector('img') || document.createElement('img'); i.alt = ''; i.src = u; if (!i.parentNode) { if (!keep) b.textContent = ''; b.insertBefore(i, b.firstChild); } }
  function folded() { return BOX.classList.contains('fold'); }
  function bottom() { LOG.scrollTop = LOG.scrollHeight; }
  function fold(on, keep) {
    BOX.classList.toggle('fold', !!on); $('chat-tab').setAttribute('aria-expanded', on ? 'false' : 'true'); $('emotes').hidden = true; $('acts').hidden = true;
    if (!on) { unread = false; $('chat-dot').hidden = true; } if (!keep) set('nw-chat-fold', on ? '1' : '0'); bottom();
  }
  function sysOn(on) { BOX.classList.toggle('nosys', !on); var b = $('chat-sys'); ico(b, on ? 'btn-sys' : 'btn-sys-off'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = on ? '系統訊息：開' : '系統訊息：關'; bottom(); }
  function push(row, mine) {
    if (!LOG) return; var stick = folded() || LOG.scrollHeight - LOG.scrollTop - LOG.clientHeight < 28;   // 自己往上捲在看舊的話，就不要被新的話拉下來
    LOG.appendChild(row); while (LOG.children.length > KEEP) LOG.removeChild(LOG.firstChild);
    if (stick || mine) bottom();
  }
  root.NW_CHAT = {
    start: function () {
      if (started) return; BOX = $('chat'); LOG = $('chat-log'); if (!BOX || !LOG) return; started = true;
      ico($('chat-tab'), 'btn-chat', true); ico($('b-emote'), 'btn-emote'); ico($('b-act'), 'btn-act'); ico($('chat-send'), 'btn-send');
      var saved = get('nw-chat-fold'), phone = root.matchMedia && matchMedia('(max-width: 820px)').matches;
      fold(saved == null ? phone : saved === '1', true); sysOn(get('nw-chat-sys') !== '0');
      $('chat-tab').onclick = function () { fold(!folded()); this.blur(); };
      $('chat-sys').onclick = function () { var on = BOX.classList.contains('nosys'); set('nw-chat-sys', on ? '1' : '0'); sysOn(on); };
      // 在紙上捲、點，不要變成角色走路或鏡頭縮放
      ['pointerdown', 'wheel', 'touchstart'].forEach(function (ev) { LOG.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
      // 電腦按 Enter 直接開始打字
      root.addEventListener('keydown', function (e) { if (e.key !== 'Enter' || e.isComposing || BOX.hidden) return; var t = e.target, tag = t && t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || (t && t.isContentEditable)) return; e.preventDefault(); $('chat-in').focus(); });
    },
    add: function (name, text, mine) {
      if (!LOG) return; var row = document.createElement('div'), b = document.createElement('b'); if (mine) row.className = 'me';
      b.textContent = name + '：'; row.appendChild(b); row.appendChild(document.createTextNode(text)); push(row, mine);
      if (!mine && folded() && root.matchMedia && matchMedia('(max-width: 820px)').matches) { unread = true; $('chat-dot').hidden = false; }
    },
    sys: function (text) { if (!LOG || !text) return; var last = LOG.lastChild; if (last && last.className === 'sys' && last.textContent === text) return;   // 同一句連跳不重複記
      var row = document.createElement('div'); row.className = 'sys'; row.textContent = text; push(row, false); },
    fold: function (on) { if (BOX) fold(on); }, folded: function () { return BOX ? folded() : false; },
  };
})(this);
