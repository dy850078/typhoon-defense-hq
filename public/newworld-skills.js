// 3D 新世界的戰鬥介面：左上的等級血條、四顆技能鈕、技能書（自己組技能、選修欄）、導師那邊的轉職面板
// 畫面上的怪和特效在 newworld/world/58-combat.js，算傷害的是伺服器的 nw-combat.js
(function (root) {
  var C3 = root.HQ_CLS3, IC = root.HQ_ICONS;
  var CSS = [
    '.cb-bar{position:absolute;left:0;top:0;width:54px;height:7px;border:1.5px solid #2b2a33;border-radius:5px;background:#fffaf0;will-change:transform}',
    '.cb-bar i{display:block;height:100%;background:#e2506a;border-radius:3px}.cb-bar span{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);white-space:nowrap;font:700 11px/1 inherit;color:#2b2a33;text-shadow:0 0 2px #fffaf0,0 0 2px #fffaf0;display:none}.cb-bar.on span{display:block}',
    '.cb-num{position:absolute;left:0;top:0;font:900 17px/1 inherit;color:#fff;-webkit-text-stroke:3px #2b2a33;paint-order:stroke fill;will-change:transform;white-space:nowrap}',
    '.cb-num.ow{color:#ff8a7a}.cb-num.heal{color:#9fe7a4}.cb-num.poison{color:#d9b8ff;font-size:14px}.cb-num.link{color:#ffe9a8;font-size:14px}.cb-num.lv{color:#ffe27a;font-size:22px}',
    '#cb-me{position:fixed;left:10px;top:calc(92px + env(safe-area-inset-top));width:168px;padding:7px 9px;z-index:3;display:flex;gap:7px;align-items:center;cursor:pointer;font:inherit;color:#2b2a33;text-align:left}',
    '#cb-me img{width:34px;height:34px;flex:none}#cb-me div{flex:1;min-width:0}#cb-me b{display:block;font-size:12px;line-height:1.2;margin-bottom:3px;white-space:nowrap}',
    '#cb-me u{display:block;position:relative;height:9px;border:1.5px solid #2b2a33;border-radius:5px;background:#fffaf0;margin-top:2px;overflow:hidden;text-decoration:none}#cb-me u i{display:block;height:100%}#cb-me u.hp i{background:#e2506a}#cb-me u.mp i{background:#6ea8e6}#cb-me u.xp{height:5px}#cb-me u.xp i{background:#e8a23c}',
    '#cb-skills{position:fixed;right:calc(16px + env(safe-area-inset-right));bottom:calc(24px + env(safe-area-inset-bottom));display:flex;gap:9px;z-index:3}',
    '@media (max-width:820px){#cb-skills{bottom:calc(178px + env(safe-area-inset-bottom));right:calc(10px + env(safe-area-inset-right));gap:7px}}',
    '@media (min-width:821px){#cb-skills{right:auto;left:max(50%,700px);transform:translateX(-50%);bottom:calc(26px + env(safe-area-inset-bottom));gap:11px}}',
    '#cb-skills.edit{z-index:5}#cb-skills.edit .cb-sk{border-style:dashed;opacity:1}#cb-skills.edit .cb-sk.pick,#cb-skills.edit .cb-sk.drop{background:#f3d27a;border-style:solid;transform:scale(1.1)}',
    '.cb-sk kbd{display:none;position:absolute;right:-5px;top:-7px;min-width:17px;height:17px;box-sizing:border-box;padding:0 4px;border:1.5px solid #2b2a33;border-radius:5px 4px 6px 4px;background:#fffaf0;font:700 11px/14px inherit;font-family:inherit;color:#2b2a33;text-align:center;pointer-events:none}',
    '@media (hover:hover) and (pointer:fine){.cb-sk kbd{display:block}}',
    '#cb-ghost{position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;z-index:9;pointer-events:none;filter:drop-shadow(2px 3px 0 rgba(43,42,51,.3))}',
    '.cb-sk{position:relative;width:56px;height:56px;border-radius:50%;border:2px solid #2b2a33;background:#fbf6e9;box-shadow:2px 3px 0 rgba(43,42,51,.28);padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:none}',
    '.cb-sk img{width:40px;height:40px;display:block;margin:6px auto 0;pointer-events:none}.cb-sk.el{border-style:dashed}.cb-sk.empty{opacity:.45}.cb-sk.ult{background:#fff1cc}.cb-sk.nomp img{filter:grayscale(1);opacity:.5}.cb-sk.next{background:#ffe9a8;animation:cb-pulse .5s ease-in-out infinite alternate}',
    '.cb-sk s{position:absolute;inset:0;border-radius:50%;pointer-events:none;text-decoration:none}.cb-sk em{position:absolute;inset:0;display:grid;place-items:center;font:900 17px/1 inherit;font-style:normal;color:#fff;-webkit-text-stroke:3px #2b2a33;paint-order:stroke fill;pointer-events:none}',
    '.cb-sk:active{transform:translate(1px,2px);box-shadow:1px 1px 0 rgba(43,42,51,.28)}@keyframes cb-pulse{to{transform:scale(1.08)}}',
    '#cb-book{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(400px,calc(100vw - 24px));max-height:74vh;overflow:auto;padding:12px 14px 14px;z-index:4;font-size:13px}',
    '#cb-book h2{font-size:15px;margin:0 0 8px;display:flex;justify-content:space-between;align-items:center;gap:8px}#cb-book h2 button,#cb-book .go{font:700 12px/1 inherit;font-family:inherit;color:#2b2a33;padding:7px 11px;cursor:pointer}',
    '#cb-book.bk{bottom:auto;top:50%;transform:translate(-50%,-50%);max-height:calc(100vh - 250px)}@media (max-width:820px){#cb-book.bk{top:calc(56px + env(safe-area-inset-top));transform:translateX(-50%);max-height:calc(100vh - 320px)}}',
    '#cb-book h2 span{display:flex;gap:6px}#cb-book .tip{display:block;margin:0 0 6px;opacity:.72;font-size:12px}#cb-book .card.sk{cursor:grab;margin:5px 0;padding:6px 9px;touch-action:pan-y;user-select:none;-webkit-user-select:none}#cb-book .card.sk.el{border-style:dashed}#cb-book .card.sk.ult{background:#fff1cc}#cb-book .card.sk.on{background:#f3d27a}',
    '#cb-book .card.sk i{flex:none;font:700 11px/1 inherit;font-style:normal;padding:4px 6px;border:1.5px solid rgba(43,42,51,.5);border-radius:6px 5px 7px 5px;background:#fff6dc}',
    '#cb-book h3{font-size:12px;margin:10px 0 5px;opacity:.75}#cb-book .slots,#cb-book .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}',
    '#cb-book .cell{all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px 5px;border-radius:9px 6px 10px 7px;border:1.5px solid rgba(43,42,51,.45);background:#fff;cursor:pointer;font-size:11px;font-weight:700;text-align:center;min-height:66px}',
    '#cb-book .cell img{width:36px;height:36px}#cb-book .cell.on{background:#f3d27a;border-color:#2b2a33}#cb-book .cell.used{background:#fff6dc}#cb-book .cell.el{border-style:dashed}#cb-book .cell.ult{background:#fff1cc}#cb-book .cell.on.ult{background:#f3d27a}#cb-book .cell:disabled{opacity:.4;cursor:default}',
    '#cb-book .info{min-height:38px;margin:8px 0 0;padding:7px 10px;border-radius:10px 8px 11px 7px;border:1.5px dashed rgba(43,42,51,.5);background:#fffaf0}#cb-book .info b{display:block}#cb-book .info small{opacity:.75}',
    '#cb-book .card{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:9px;width:100%;margin:6px 0;padding:8px 10px;border-radius:9px 6px 10px 7px;border:1.5px solid rgba(43,42,51,.45);background:#fff;cursor:pointer}#cb-book .card.on{background:#f3d27a;border-color:#2b2a33}#cb-book .card:disabled{opacity:.5;cursor:default}',
    '#cb-book .card img{width:34px;height:34px;flex:none}#cb-book .card span{flex:1;display:flex;flex-direction:column}#cb-book .card small{font-size:11px;opacity:.72}',
    '#cb-book .req{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:12px}#cb-book .req u{flex:1;height:9px;border:1.5px solid #2b2a33;border-radius:5px;background:#fffaf0;overflow:hidden;text-decoration:none}#cb-book .req u i{display:block;height:100%;background:#8fd36a}#cb-book .req b{min-width:74px}#cb-book .req.done b::after{content:"　好了";color:#3f8a4f}',
    '#cb-book .dbg{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-top:8px;border-top:1px dashed rgba(43,42,51,.35)}#cb-book .dbg button{font:500 11px/1 inherit;font-family:inherit;padding:6px 8px;border-radius:8px;border:1.5px solid rgba(43,42,51,.45);background:#fff;cursor:pointer}',
    '#cb-dead{position:fixed;inset:0;background:rgba(43,42,51,.45);display:grid;place-items:center;z-index:3;pointer-events:none}#cb-dead div{padding:14px 20px;font-weight:700;font-size:15px}',
  ].join('\n');
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function icon(key) { var i = el('img'); i.alt = ''; var u = IC && IC.url(key); if (u) i.src = u; return i; }
  var clsIcon = function (v) { return 'nwc-' + (v.spec || v.school || 'sprout'); };

  root.NW_SKILLS = { start: function (NW, sock, panels) {
    var CB = NW.combat; if (!CB || !C3 || !sock) return null;
    var st = el('style'); st.textContent = CSS; document.head.appendChild(st);
    var admin = false, off = 0, me = null, toast = function (t) { if (panels) panels.toast(t); };
    // ---- 連線 ----
    sock.on('init', function (d) { admin = !!d.admin; });
    sock.on('cb:init', function (d) { off = Date.now() - d.me.t; CB.init(d, sock.id, function (ev, arg) { sock.emit(ev, arg); }); });
    sock.on('cb:me', function (d) { off = Date.now() - d.t; CB.me(d); });
    sock.on('cb:mobs', function (l) { CB.mobs(l); }); sock.on('cb:who', function (d) { CB.who(d); }); sock.on('cb:fx', function (e) { CB.fx(e); }); sock.on('cb:hit', function (l) { CB.hits(l); });
    sock.on('leave', function (id) { CB.drop(id); }); sock.on('cb:back', function (p) { CB.back(p); }); sock.on('cb:tgt', function () { CB.setTarget(null, true); });
    sock.on('cb:loot', function (o) { toast('拿到 ' + o.name + '（' + o.n + '/' + o.of + '）'); });
    sock.on('cb:no', function () { toast('太遠了，走近一點'); });
    var ask = function (ev, arg) { return new Promise(function (ok) { sock.emit(ev, arg, ok); }); };

    // ---- 左上：職業、等級、血、魔、經驗 ----
    var card = el('button', 'note'); card.id = 'cb-me'; card.type = 'button'; var cIcon = icon('nwc-sprout'), cBody = el('div'), cName = el('b'), bars = {};
    ['hp', 'mp', 'xp'].forEach(function (k) { var u = el('u', k), i = el('i'); u.appendChild(i); bars[k] = i; cBody.appendChild(u); }); cBody.insertBefore(cName, cBody.firstChild); card.append(cIcon, cBody); document.body.appendChild(card);
    card.onclick = function () { if (book.hidden || mode !== 'book') openBook(); else close(); };
    // ---- 右下：四顆技能鈕（第四顆是選修欄，虛線框）----
    var bar = el('div'); bar.id = 'cb-skills'; document.body.appendChild(bar);
    var btns = [0, 1, 2, 3].map(function (i) { var b = el('button', 'cb-sk' + (i === 3 ? ' el' : '')), im = icon(''), s = el('s'), em = el('em'), kb = el('kbd'); b.type = 'button'; b.append(im, s, em, kb); b.dataset.i = i;
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); if (editing()) slotDown(i, e); else press(i); }); bar.appendChild(b); return { b: b, im: im, s: s, em: em, kb: kb, key: null }; });
    function press(i) { var r = CB.cast(i); if (r === 'far') toast('附近沒有怪'); }
    var keysOf = function () { return (me && me.keys) || C3.KEYS; };
    window.addEventListener('keydown', function (e) { if (/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
      if (binding) { e.preventDefault(); e.stopPropagation(); if (e.code === 'Escape') { binding = false; bindSlot = -1; drawBook(); } else if (bindSlot >= 0 && !e.repeat) bind(bindSlot, e.code); return; }
      var i = keysOf().indexOf(e.code); if (i >= 0 && !e.repeat && !editing()) press(i); }, true);
    var dead = el('div'); dead.id = 'cb-dead'; dead.hidden = true; var deadNote = el('div', 'note'); dead.appendChild(deadNote); document.body.appendChild(dead);
    function staged(k) { return !!(me && me.stage && me.stage[k] > Date.now() - off); }
    var stageSig = '';
    function drawHud() {
      me = CB.view(); if (!me) return;
      var ik = clsIcon(me); if (card.dataset.k !== ik) { card.dataset.k = ik; cIcon.src = IC.url(ik) || ''; }
      cName.textContent = 'Lv.' + me.lv + ' ' + C3.clsName(me);
      bars.hp.style.width = (me.hp / me.hpMax * 100).toFixed(0) + '%'; bars.mp.style.width = (me.mp / me.mpMax * 100).toFixed(0) + '%'; bars.xp.style.width = Math.min(100, me.exp / me.need * 100).toFixed(0) + '%';
      btns.forEach(function (o, i) { var k = me.slots[i], s = C3.SK[k], two = s && s.next && staged(k), key = !s ? '' : two ? k + '2' : k;
        if (o.key !== key) { o.key = key; o.im.style.visibility = s ? '' : 'hidden'; if (s) o.im.src = IC.url('nw-' + key) || IC.url('nw-' + k) || ''; o.b.setAttribute('aria-label', s ? (two ? s.next : s.name) : '空的'); o.b.title = s ? (two ? s.next : s.name) : ''; }
        var kl = C3.keyLabel(keysOf()[i]); if (o.kb.textContent !== kl) o.kb.textContent = kl;
        o.b.className = 'cb-sk' + (i === 3 ? ' el' : '') + (!s ? ' empty' : '') + (s && s.ult ? ' ult' : '') + (two ? ' next' : '') + (s && !two && me.mp < s.mp ? ' nomp' : '') + (editing() && (binding ? bindSlot === i : pickSlot === i) ? ' pick' : ''); });
      bar.classList.toggle('edit', editing());
    }
    // 冷卻：一圈轉回來，中間寫剩幾秒
    setInterval(function () { if (!me) return; var now = Date.now() - off;
      var sg = me.slots.map(function (k) { return staged(k) ? 1 : 0; }).join(''); if (sg !== stageSig) { stageSig = sg; drawHud(); }
      btns.forEach(function (o, i) { var k = me.slots[i], s = C3.SK[k], left = s && !staged(k) ? ((me.cd[k] || 0) - now) / 1000 : 0;
        if (left > 0.05) { var p = Math.min(1, left / s.cd) * 360; o.s.style.background = 'conic-gradient(rgba(43,42,51,.55) ' + p.toFixed(0) + 'deg, transparent 0)'; o.em.textContent = left >= 1 ? String(Math.ceil(left)) : ''; } else if (o.em.textContent || o.s.style.background) { o.s.style.background = ''; o.em.textContent = ''; } });
      var d = me.dead ? (me.dead - now) / 1000 : 0; dead.hidden = !(d > 0); if (d > 0) deadNote.textContent = '倒下了，' + Math.ceil(d) + ' 秒後回到練習場入口';
    }, 100);

    // ---- 技能書和轉職面板（同一張紙條）----
    var book = el('div', 'note'); book.id = 'cb-book'; book.hidden = true; document.body.appendChild(book);
    var mode = '', pickSlot = -1, pickSkill = '', binding = false, bindSlot = -1;
    var editing = function () { return !book.hidden && mode === 'book'; };
    var fine = !!(window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches);
    function close() { book.hidden = true; mode = ''; binding = false; bindSlot = -1; pickSlot = -1; pickSkill = ''; book.classList.remove('bk'); drawHud(); }
    function frame(title) { if (panels) panels.close(); var d = document.getElementById('dress'); if (d) d.hidden = true; book.innerHTML = ''; book.hidden = false; book.classList.toggle('bk', mode === 'book');
      var h = el('h2', '', title), bs = el('span'), x = el('button', 'note', '收起來'); x.onclick = close; bs.appendChild(x); h.appendChild(bs); book.appendChild(h); book.tools = bs; return book; }
    function openBook() { mode = 'book'; pickSlot = -1; pickSkill = ''; binding = false; bindSlot = -1; drawBook(); }
    // 技能書只列學會的招式；要帶哪四招，是把招式放到主畫面的快捷列上（滑鼠用拖的，手機點一招再點格子）
    function drawBook() {
      me = CB.view(); if (!me) return; var top = book.scrollTop, body = frame('技能書　' + C3.clsName(me)), mine = C3.learned(me), els = C3.electives(me);
      if (fine) { var kb = el('button', 'note', binding ? '設定好了' : '按鍵設定'); kb.id = 'cb-keys'; kb.onclick = function () { binding = !binding; bindSlot = -1; pickSlot = -1; pickSkill = ''; drawBook(); }; book.tools.insertBefore(kb, book.tools.firstChild); }
      if (binding) { body.appendChild(el('small', 'tip', bindSlot < 0 ? '點快捷列的一格，再按想用的鍵' : '按下想用的鍵'));
        var rs = el('button', 'go note', '恢復成 1 2 3 4'); rs.onclick = function () { setKeys(C3.KEYS.slice()); }; body.appendChild(rs); drawHud(); return; }
      body.appendChild(el('small', 'tip', pickSkill ? '點快捷列的格子放進去' : fine ? '把招式拖到快捷列上' : '點一招，再點快捷列的格子'));
      var row = function (k, elective) { var s = C3.SK[k], at = me.slots.indexOf(k), b = el('div', 'card sk' + (s.ult ? ' ult' : '') + (elective ? ' el' : '') + (pickSkill === k ? ' on' : '')), t = el('span'); b.dataset.sk = k;
        t.append(el('b', '', s.name + (s.next ? '　再按一次：' + s.next : '')), el('small', '', s.line + '　耗魔 ' + s.mp + '　冷卻 ' + s.cd + ' 秒')); b.append(icon('nw-' + k), t); if (at >= 0) b.appendChild(el('i', '', fine ? C3.keyLabel(keysOf()[at]) : '第 ' + (at + 1) + ' 格'));
        var tap = function () { if (pickSlot >= 0) return put(pickSlot, k); pickSkill = pickSkill === k ? '' : k; drawBook(); };
        b.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') return; e.preventDefault(); drag(e, k, -1, tap); });
        b.addEventListener('click', function () { if (lastTouch) tap(); }); return b; };
      mine.forEach(function (k) { body.appendChild(row(k)); });
      if (els.length) { body.appendChild(el('h3', '', '選修（只能放最後一格）')); els.forEach(function (k) { body.appendChild(row(k, true)); }); }
      book.scrollTop = top; drawHud();
    }
    // 快捷列在技能書開著的時候是「編排中」：點格子、拖格子都是換招，不會放招
    var lastTouch = false; window.addEventListener('pointerdown', function (e) { lastTouch = e.pointerType === 'touch'; }, true);
    function slotDown(i, e) {
      if (binding) { bindSlot = i; return drawBook(); }
      var tap = function () { if (pickSkill) return put(i, pickSkill); pickSlot = pickSlot === i ? -1 : i; drawBook(); };
      if (e.pointerType === 'touch' || !me.slots[i]) return tap();
      drag(e, me.slots[i], i, tap);
    }
    function slotAt(x, y) { var t = document.elementFromPoint(x, y); t = t && t.closest ? t.closest('.cb-sk') : null; return t ? +t.dataset.i : -1; }
    function drag(e, k, from, tap) { var x0 = e.clientX, y0 = e.clientY, ghost = null, over = -1;
      var mark = function (i) { if (i === over) return; if (over >= 0) btns[over].b.classList.remove('drop'); over = i; if (over >= 0) btns[over].b.classList.add('drop'); };
      var move = function (ev) { if (!ghost) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 7) return; ghost = icon('nw-' + k); ghost.id = 'cb-ghost'; document.body.appendChild(ghost); }
        ghost.style.transform = 'translate(' + ev.clientX + 'px,' + ev.clientY + 'px)'; mark(slotAt(ev.clientX, ev.clientY)); };
      var up = function (ev) { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); mark(-1);
        if (!ghost) return ev.type === 'pointerup' ? tap() : null; ghost.remove(); if (ev.type !== 'pointerup') return;
        var to = slotAt(ev.clientX, ev.clientY); if (to >= 0) { if (to !== from) put(to, k); return; }
        if (from >= 0) { var next = me.slots.slice(); next[from] = null; send(next); } };   // 從快捷列拖出去 = 拿掉這一招
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); }
    function send(next) { ask('cb:slots', next).then(function (r) { if (r && r.error) toast(r.error); pickSlot = -1; pickSkill = ''; if (mode === 'book') setTimeout(drawBook, 60); }); }
    function setKeys(next) { ask('cb:keys', next).then(function (r) { if (r && r.error) toast(r.error); bindSlot = -1; if (mode === 'book') setTimeout(drawBook, 60); }); }
    function bind(i, code) { if (!C3.keyOk(code)) return toast(/^Key[WASDE]$/.test(code) ? '這個鍵留給走路和互動用，換一個' : '這個鍵不能用，換一個');
      var next = keysOf().slice(), at = next.indexOf(code); if (at >= 0) next[at] = next[i]; next[i] = code; setKeys(next); }
    function put(i, k) { var next = me.slots.slice(), at = next.indexOf(k); if (at >= 0) next[at] = next[i]; next[i] = k;
      if (i !== 3 && C3.learned(me).indexOf(k) < 0) { toast('選修的招只能放在最後一格'); pickSkill = ''; pickSlot = -1; drawBook(); return; }
      if (at >= 0 && at !== 3 && next[at] && C3.learned(me).indexOf(next[at]) < 0) next[at] = null;
      send(next); }
    // 導師：選學門、接三轉任務、交信物
    function openClass() { mode = 'class'; drawClass(); }
    function card2(iconKey, title, sub, on, fn, off2) { var b = el('button', 'card' + (on ? ' on' : '')); b.type = 'button'; var t = el('span'); t.append(el('b', '', title), el('small', '', sub)); b.append(icon(iconKey), t); b.dataset.k = iconKey.slice(4); b.disabled = !!off2; b.onclick = fn; return b; }
    function req(label, have, need) { var r = el('div', 'req' + (have >= need ? ' done' : '')), u = el('u'), i = el('i'); i.style.width = Math.min(100, have / need * 100) + '%'; u.appendChild(i); r.append(el('b', '', label), u, el('span', '', Math.min(have, need) + '/' + need)); return r; }
    function act(ev, arg, msg) { ask(ev, arg).then(function (r) { if (r && r.error) toast(r.error); else if (msg) toast(msg); setTimeout(function () { if (mode === 'class') drawClass(); }, 80); }); }
    function drawClass() {
      me = CB.view(); if (!me) return; var body = frame('職業導師　Lv.' + me.lv + ' ' + C3.clsName(me));
      body.appendChild(el('h3', '', '學門'));
      if (me.lv < C3.GATE.school) body.appendChild(req('等級', me.lv, C3.GATE.school));
      Object.keys(C3.SCHOOLS).forEach(function (k) { var S = C3.SCHOOLS[k], sc = me.schools[k];
        body.appendChild(card2('nwc-' + k, S.name + (me.school === k ? '（現在）' : ''), S.specs.map(function (x) { return C3.SPECS[x].name; }).join('、') + (sc ? '　熟練度 ' + sc.m + '/' + C3.GATE.mastery : ''), me.school === k, function () { act('cb:school', k, '進了「' + S.name + '」'); }, me.lv < C3.GATE.school || me.school === k)); });
      if (!me.school) return dbg(body);
      var sc = me.schools[me.school]; body.appendChild(el('h3', '', '專精'));
      C3.SCHOOLS[me.school].specs.forEach(function (sp) { var P = C3.SPECS[sp], got = sc.got.indexOf(sp) >= 0, q = me.quest && me.quest.spec === sp ? me.quest : null;
        if (got) return body.appendChild(card2('nwc-' + sp, P.name + (me.spec === sp ? '（現在）' : ''), '已經學會', me.spec === sp, function () { act('cb:spec', sp, '專精：' + P.name); }, me.spec === sp));
        if (q) { var items = C3.QUEST[sp], all = items.every(function (it, i) { return q.got[i] >= it[1]; });
          body.appendChild(card2('nwc-' + sp, P.name, all ? '信物收齊了' : '收集信物中', false, function () { act('cb:spec', sp, '轉職成' + P.name + '了'); }, !all));
          items.forEach(function (it, i) { body.appendChild(req(it[0], q.got[i], it[1])); }); return; }
        var ready = me.lv >= C3.GATE.spec && sc.m >= C3.GATE.mastery;
        body.appendChild(card2('nwc-' + sp, P.name, ready ? '接下三轉任務' : '還不能接三轉任務', false, function () { act('cb:quest', sp, '接下了' + P.name + '的三轉任務'); }, !ready || !!me.quest)); });
      if (!sc.got.length || sc.got.length < 2) { body.appendChild(req('等級', me.lv, C3.GATE.spec)); body.appendChild(req('熟練度', sc.m, C3.GATE.mastery)); }
      dbg(body);
    }
    // 管理員測試用：不用真的練就能看每個階段
    function dbg(body) { if (!admin) return; var d = el('div', 'dbg'); d.appendChild(el('small', '', '管理員測試'));
      [['10 等', { lv: 10 }], ['50 等', { lv: 50 }], ['熟練度練滿', { m: C3.GATE.mastery }], ['信物補滿', { quest: 1 }], ['全部重來', { reset: 1 }]].forEach(function (a) { var b = el('button', '', a[0]); b.type = 'button'; b.onclick = function () { act('cb:dbg', a[1]); }; d.appendChild(b); }); body.appendChild(d); }
    var sig = '';
    CB.onChange(function () { drawHud(); var v = CB.view(), k = v ? JSON.stringify([v.lv, v.school, v.spec, v.schools, v.quest]) : ''; if (k !== sig) { sig = k; if (!book.hidden && mode === 'class') drawClass(); if (editing() && !document.getElementById('cb-ghost')) drawBook(); } });
    drawHud();
    return { openClass: openClass, openBook: openBook, close: close, ask: ask, isOpen: function () { return !book.hidden; } };
  } };
})(this);
