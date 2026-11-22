// 3D 新世界的戰鬥介面：左上的等級血條、四顆技能鈕、技能書（自己組技能、選修欄）、導師那邊的轉職面板
// 畫面上的怪和特效在 newworld/world/58-combat.js，算傷害的是伺服器的 nw-combat.js
(function (root) {
  var C3 = root.HQ_CLS3, IC = root.HQ_ICONS;
  var CSS = [
    '.cb-bar{position:absolute;left:0;top:0;width:54px;height:7px;border:1.5px solid #2b2a33;border-radius:5px;background:#fffaf0;will-change:transform}',
    '.cb-bar i{display:block;height:100%;background:#e2506a;border-radius:3px}.cb-bar.cast{width:84px}.cb-bar.cast i{background:#f2b53a}.cb-bar span{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);white-space:nowrap;font:700 11px/1 inherit;color:#2b2a33;text-shadow:0 0 2px #fffaf0,0 0 2px #fffaf0;display:none}.cb-bar.on span{display:block}',
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
    '#cb-book .tree{position:relative;height:300px;margin:2px 0 4px}#cb-book .tree svg{position:absolute;inset:0;width:100%;height:100%}#cb-book .tree path{fill:none;stroke:rgba(43,42,51,.22);stroke-width:1.6;stroke-dasharray:3 3;vector-effect:non-scaling-stroke}#cb-book .tree path.on{stroke:#2b2a33;stroke-dasharray:none;stroke-width:2}',
    '#cb-book .nd{all:unset;box-sizing:border-box;position:absolute;transform:translateX(-50%);width:62px;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;font-size:11px;font-weight:700;text-align:center;line-height:1.15}',
    '#cb-book .nd img{width:42px;height:42px;padding:3px;box-sizing:border-box;border-radius:50%;border:2px solid #2b2a33;background:#fff}#cb-book .nd.lock img,#cb-book .nd.can img{filter:grayscale(1);opacity:.45;border-style:dashed}#cb-book .nd.can img{opacity:.8}#cb-book .nd.lock span{opacity:.5}',
    '#cb-book .nd.now img{background:#f3d27a;box-shadow:0 0 0 3px #f3d27a,0 0 0 4.5px #2b2a33}#cb-book .nd.quest img{border-style:dashed;background:#fff6dc}#cb-book .nd.sel span{background:#2b2a33;color:#fffaf0;border-radius:6px;padding:1px 5px}',
    '#cb-book .nd u{display:block;width:44px;height:5px;border:1.2px solid #2b2a33;border-radius:4px;background:#fffaf0;overflow:hidden;text-decoration:none}#cb-book .nd u i{display:block;height:100%;background:#8fd36a}',
    '#cb-book .sum{display:block;text-align:center;opacity:.7;margin-bottom:6px}#cb-book .det{padding:9px 11px;border-radius:10px 8px 11px 7px;border:1.5px dashed rgba(43,42,51,.5);background:#fffaf0}#cb-book .det>b{display:block;margin-bottom:5px}#cb-book .det .why{display:block;opacity:.75;margin-top:6px}',
    '#cb-book .sks{display:flex;flex-wrap:wrap;gap:4px 9px;margin-bottom:4px}#cb-book .sks span{display:flex;align-items:center;gap:3px}#cb-book .sks img{width:24px;height:24px}#cb-book .det .go{display:block;width:100%;box-sizing:border-box;margin-top:8px;padding:10px;font-size:13px;text-align:center;background:#f3d27a}#cb-book .det .go.sure{background:#e2506a;color:#fff}',
    '#cb-quest{position:fixed;left:10px;top:calc(160px + env(safe-area-inset-top));width:168px;padding:7px 9px;z-index:3;font:inherit;font-size:12px;color:#2b2a33;text-align:left;cursor:pointer;display:block}#cb-quest[hidden]{display:none}',
    '#cb-quest b{display:flex;justify-content:space-between;gap:6px}#cb-quest b span{font-weight:500;opacity:.75}#cb-quest .qi{display:flex;gap:5px;align-items:baseline;margin-top:3px}#cb-quest .qi span{flex:1;min-width:0}#cb-quest .qi small{opacity:.6;font-size:10px}#cb-quest .qi i{font-style:normal;font-weight:700}#cb-quest .qi.ok{opacity:.45;text-decoration:line-through}',
    '#cb-quest .back{display:block;margin-top:3px}#cb-quest.done{background:#f3d27a}#cb-quest.flash{animation:cb-pulse .25s ease-in-out 4 alternate}',
    '#cb-party{position:fixed;left:10px;top:calc(160px + env(safe-area-inset-top));width:168px;padding:6px 8px;z-index:3;font-size:12px;color:#2b2a33}#cb-party[hidden]{display:none}#cb-party>b{display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:2px}#cb-party>b span{font-weight:400;opacity:.7}',
    '#cb-party .pm{display:flex;gap:6px;align-items:center;padding:3px 0;border-top:1px dashed rgba(43,42,51,.25);cursor:default}#cb-party .pm img{width:22px;height:22px;flex:none}#cb-party .pm div{flex:1;min-width:0}#cb-party .pm em{display:block;font-style:normal;font-weight:700;font-size:11px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#cb-party .pm.lead em{text-decoration:underline;text-underline-offset:2px}',
    '#cb-party .pm u{display:block;height:5px;border:1.2px solid #2b2a33;border-radius:4px;background:#fffaf0;margin-top:2px;overflow:hidden;text-decoration:none}#cb-party .pm u i{display:block;height:100%;background:#e2506a}#cb-party .pm u.mp{height:4px}#cb-party .pm u.mp i{background:#6ea8e6}#cb-party .pm.dead{opacity:.5}#cb-party .pm.out{cursor:pointer}',
    '#cb-party .pf{display:flex;gap:5px;margin-top:4px}#cb-party button,#cb-pop button,#cb-inv button{font:inherit;font-size:11px;font-weight:700;color:#2b2a33;background:#fffaf0;border:1.5px solid #2b2a33;border-radius:8px;padding:3px 7px;cursor:pointer}#cb-party button:disabled{opacity:.6;cursor:default}#cb-party button.sure,#cb-inv button.yes,#cb-pop button{background:#ffe27a}#cb-party .pm button{flex:none;padding:2px 5px}',
    '#cb-pop{position:fixed;z-index:6;padding:5px;transform:translate(-50%,-130%)}#cb-pop[hidden]{display:none}#cb-inv{position:fixed;left:50%;top:calc(96px + env(safe-area-inset-top));transform:translateX(-50%);z-index:7;padding:9px 12px;font-size:13px;color:#2b2a33;text-align:center;max-width:80vw}#cb-inv[hidden]{display:none}#cb-inv div{display:flex;gap:8px;justify-content:center;margin-top:7px}#cb-inv button{font-size:12px;padding:5px 12px}',
    '#cb-dead{position:fixed;inset:0;background:rgba(43,42,51,.45);display:grid;place-items:center;z-index:3;pointer-events:none}#cb-dead div{padding:14px 20px;font-weight:700;font-size:15px}',
  ].join('\n');
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function icon(key) { var i = el('img'); i.alt = ''; var u = IC && IC.url(key); if (u) i.src = u; return i; }
  var clsIcon = function (v) { return 'nwc-' + (v.spec || v.school || 'sprout'); };

  root.NW_SKILLS = { start: function (NW, sock, panels) {
    var CB = NW.combat; if (!CB || !C3 || !sock) return null;
    var st = el('style'); st.textContent = CSS; document.head.appendChild(st);
    var admin = false, off = 0, me = null, party = null, toast = function (t) { if (panels) panels.toast(t); };
    // ---- 連線 ----
    sock.on('init', function (d) { admin = !!d.admin; });
    sock.on('cb:init', function (d) { off = Date.now() - d.me.t; CB.init(d, sock.id, function (ev, arg, fn) { if (fn) sock.emit(ev, arg, fn); else sock.emit(ev, arg); }); });
    sock.on('cb:drop', function (d) { CB.addDrop(d); }); sock.on('cb:dropGone', function (e) { CB.dropGone(e); }); CB.onToast(toast);
    sock.on('cb:me', function (d) { off = Date.now() - d.t; CB.me(d); });
    sock.on('cb:mobs', function (l) { CB.mobs(l); }); sock.on('cb:who', function (d) { CB.who(d); }); sock.on('cb:fams', function (l) { CB.fams(l); }); sock.on('cb:fx', function (e) { CB.fx(e); }); sock.on('cb:hit', function (l) { CB.hits(l); });
    sock.on('leave', function (id) { CB.drop(id); }); sock.on('cb:back', function (p) { CB.back(p); if (p && p.lose > 0) toast('倒下了，少了 ' + p.lose + ' 點經驗'); });
    sock.on('cb:say', function (t) { toast(String(t)); }); sock.on('cb:party', function (v) { party = v; drawParty(); }); sock.on('cb:pinv', function (v) { showInv(v); }); sock.on('cb:tgt', function () { CB.setTarget(null, true); });
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
      var d = me.dead ? (me.dead - now) / 1000 : 0; dead.hidden = !(d > 0); if (d > 0) deadNote.textContent = d > 5 && party ? '倒下了，隊友的補血招可以救你（' + Math.ceil(d) + '）' : '倒下了，' + Math.ceil(d) + ' 秒後回到入口';
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
    // 導師：一張職業樹（芽 → 三個學門 → 六個專精），走到哪裡亮到哪裡；點一格看內容，下面的按鈕寫明會做什麼
    var sel = '', sure = '';
    function openClass() { mode = 'class'; sel = ''; sure = ''; drawClass(); }
    function req(label, have, need) { var r = el('div', 'req' + (have >= need ? ' done' : '')), u = el('u'), i = el('i'); i.style.width = Math.min(100, have / need * 100) + '%'; u.appendChild(i); r.append(el('b', '', label), u, el('span', '', Math.min(have, need) + '/' + need)); return r; }
    function act(ev, arg, msg) { sure = ''; ask(ev, arg).then(function (r) { if (r && r.error) toast(r.error); else if (msg) toast(msg); setTimeout(function () { if (mode === 'class') drawClass(); }, 80); }); }
    var SCH = Object.keys(C3.SCHOOLS), SPX = [8.5, 25.5, 41.5, 58.5, 74.5, 91.5], SCX = [17, 50, 83];
    function questDone(q) { return !!q && C3.QUEST[q.spec].every(function (it, i) { return q.got[i] >= it[1]; }); }
    function drawClass() {
      me = CB.view(); if (!me) return; var body = frame('職業　Lv.' + me.lv + ' ' + C3.clsName(me));
      var cur = me.spec || me.school || 'sprout'; if (!sel) sel = me.quest ? me.quest.spec : cur;
      var tree = el('div', 'tree'), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); tree.appendChild(svg); body.appendChild(tree);
      var line = function (x1, y1, x2, y2, on) { var l = document.createElementNS('http://www.w3.org/2000/svg', 'path'); l.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + (y1 + y2) / 2 + ' ' + x2 + ' ' + (y1 + y2) / 2 + ' ' + x2 + ' ' + y2); if (on) l.setAttribute('class', 'on'); svg.appendChild(l); };
      var node = function (k, name, x, y, state, sub) { var b = el('button', 'nd ' + state + (sel === k ? ' sel' : '')); b.type = 'button'; b.dataset.k = k; b.style.left = x + '%'; b.style.top = y + '%'; b.append(icon('nwc-' + k), el('span', '', name)); if (sub != null) { var u = el('u'), i = el('i'); i.style.width = sub + '%'; u.appendChild(i); b.appendChild(u); }
        b.onclick = function () { sel = k; sure = ''; drawClass(); }; tree.appendChild(b); };
      node('sprout', '芽', 50, 2, me.school ? 'got' : 'now');
      var nSch = 0, nSp = 0;
      SCH.forEach(function (k, i) { var S = C3.SCHOOLS[k], sc = me.schools[k]; if (sc) nSch++; line(50, 21, SCX[i], 36, !!sc);
        node(k, S.name, SCX[i], 36, me.school === k ? (me.spec ? 'got' : 'now') : sc ? 'got' : me.lv >= C3.GATE.school ? 'can' : 'lock', sc ? sc.m / C3.GATE.mastery * 100 : null);
        S.specs.forEach(function (sp, j) { var got = !!sc && sc.got.indexOf(sp) >= 0, q = me.quest && me.quest.spec === sp; if (got) nSp++; line(SCX[i], 58, SPX[i * 2 + j], 72, got);
          node(sp, C3.SPECS[sp].name, SPX[i * 2 + j], 72, me.spec === sp ? 'now' : got ? 'got' : q ? 'quest' : 'lock'); }); });
      body.appendChild(el('small', 'sum', '學門 ' + nSch + '/3　專精 ' + nSp + '/6'));
      // 點到的那一格
      var det = el('div', 'det'); body.appendChild(det);
      var skills = function (list) { var r = el('div', 'sks'); list.forEach(function (k) { var c = el('span'); c.append(icon('nw-' + k), el('small', '', C3.SK[k].name)); r.appendChild(c); }); return r; };
      var go = function (label, ev, arg, msg, warn) { var key = ev + arg, b = el('button', 'go note' + (sure === key ? ' sure' : ''), sure === key ? '確定' + (warn ? '（' + warn + '）' : '') : label); b.dataset.act = ev.slice(3);
        b.onclick = function () { if (sure !== key) { sure = key; return drawClass(); } act(ev, arg, msg); }; det.appendChild(b); };
      if (sel === 'sprout') { det.append(el('b', '', '芽'), skills(['spark', 'blink'])); if (!me.school) det.appendChild(req('選學門', me.lv, C3.GATE.school)); }
      else if (C3.SCHOOLS[sel]) { var S = C3.SCHOOLS[sel], sc = me.schools[sel]; det.append(el('b', '', S.name + (me.school === sel ? '　現在的學門' : '')), skills(S.basics));
        if (sc) det.appendChild(req('熟練度', sc.m, C3.GATE.mastery));
        if (me.lv < C3.GATE.school) det.appendChild(req('等級', me.lv, C3.GATE.school));
        else if (me.school !== sel) go((sc ? '回到「' : '加入「') + S.name + '」', 'cb:school', sel, (sc ? '回到「' : '加入「') + S.name + '」', me.quest ? '會放棄現在的試煉' : ''); }
      else { var P = C3.SPECS[sel], sc2 = me.schools[P.school], got = !!sc2 && sc2.got.indexOf(sel) >= 0, q = me.quest && me.quest.spec === sel ? me.quest : null;
        det.append(el('b', '', P.name + (me.spec === sel ? '　現在的專精' : got ? '　已經學會' : '')), skills(Object.keys(P.swap).map(function (x) { return P.swap[x]; }).concat(P.own)));
        if (got) { if (me.spec !== sel) { if (me.school === P.school) go('切換成' + P.name, 'cb:spec', sel, '專精：' + P.name); else det.appendChild(el('small', 'why', '先回到「' + C3.SCHOOLS[P.school].name + '」')); } }
        else if (me.school !== P.school) det.appendChild(el('small', 'why', '先加入「' + C3.SCHOOLS[P.school].name + '」'));
        else if (q) { if (questDone(q)) go('轉職成' + P.name, 'cb:spec', sel, '轉職成' + P.name + '了'); else { det.appendChild(el('small', 'why', '試煉進行中')); var qb = el('button', 'go note', '看任務'); qb.onclick = openQuest; det.appendChild(qb); } }
        else { det.append(req('等級', me.lv, C3.GATE.spec), req('熟練度', sc2.m, C3.GATE.mastery));
          if (me.quest) det.appendChild(el('small', 'why', '正在進行' + C3.SPECS[me.quest.spec].name + '的試煉'));
          else if (me.lv >= C3.GATE.spec && sc2.m >= C3.GATE.mastery) go('接下' + P.name + '的試煉', 'cb:quest', sel, '接下了' + P.name + '的試煉'); } }
      dbg(body);
    }
    // 任務：自己一塊。左上狀態卡下面一張小紙條列出要收集的信物，點一下可以收合；也可以從職業樹的「看任務」打開
    var qbox = el('button', 'note'); qbox.id = 'cb-quest'; qbox.type = 'button'; qbox.hidden = true; document.body.appendChild(qbox);
    var qFold = false; try { qFold = localStorage.getItem('nw-quest-fold') === '1'; } catch (e) {}
    qbox.onclick = function () { qFold = !qFold; try { localStorage.setItem('nw-quest-fold', qFold ? '1' : '0'); } catch (e) {} drawQuest(); placeParty(); };
    function openQuest() { close(); qFold = false; drawQuest(); qbox.classList.remove('flash'); void qbox.offsetWidth; qbox.classList.add('flash'); }
    var MOBN = function (k) { return C3.SRC[k] || ''; };
    function drawQuest() {
      var q = me && me.quest; qbox.hidden = !q; if (!q) return; var items = C3.QUEST[q.spec], have = 0, need = 0, done = questDone(q); items.forEach(function (it, i) { have += Math.min(q.got[i], it[1]); need += it[1]; });
      qbox.innerHTML = ''; qbox.className = 'note' + (qFold ? ' fold' : '') + (done ? ' done' : ''); var h = el('b', '', C3.SPECS[q.spec].name + '的試煉'); h.appendChild(el('span', '', have + '/' + need)); qbox.appendChild(h);
      if (qFold) return;
      if (done) return qbox.appendChild(el('small', 'back', '信物收齊了，回去找職業導師'));
      items.forEach(function (it, i) { var r = el('div', 'qi' + (q.got[i] >= it[1] ? ' ok' : '')); r.append(el('span', '', it[0]), el('small', '', MOBN(it[2])), el('i', '', Math.min(q.got[i], it[1]) + '/' + it[1])); qbox.appendChild(r); });
    }
    // ---- 隊伍：左邊一張小紙條列出隊友（職業徽章、名字、血量、魔量），下面是經驗怎麼分和離開 ----
    var pbox = el('div', 'note'); pbox.id = 'cb-party'; pbox.hidden = true; document.body.appendChild(pbox); var kickId = '';
    var badgeKey = function (m) { return 'nwc-' + (m.spec || m.school || 'sprout'); };
    function placeParty() { if (pbox.hidden) return; var top = qbox.hidden ? card.offsetTop + card.offsetHeight + 6 : qbox.offsetTop + qbox.offsetHeight + 6; pbox.style.top = top + 'px'; }
    function drawParty() {
      pbox.hidden = !party; if (!party) { kickId = ''; return; } var mine = sock.id, lead = party.leader === mine; pbox.innerHTML = '';
      var h = el('b', '', '隊伍'); h.appendChild(el('span', '', party.m.length + '/' + C3.PARTY.max)); pbox.appendChild(h);
      party.m.forEach(function (m) { if (m.id === mine) return; var r = el('div', 'pm' + (m.id === party.leader ? ' lead' : '') + (m.dead ? ' dead' : '') + (lead ? ' out' : '')), d = el('div'), hp = el('u', 'hp'), mp = el('u', 'mp'), hi = el('i'), mi = el('i'); r.dataset.id = m.id;
        hi.style.width = Math.max(0, Math.min(100, m.hp / m.hpMax * 100)).toFixed(0) + '%'; mi.style.width = Math.max(0, Math.min(100, m.mp / m.mpMax * 100)).toFixed(0) + '%'; hp.appendChild(hi); mp.appendChild(mi);
        d.append(el('em', '', m.name + '　Lv.' + m.lv), hp, mp); r.append(icon(badgeKey(m)), d);
        if (lead && kickId === m.id) { var k = el('button', 'sure', '請離開'); k.type = 'button'; k.onclick = function (e) { e.stopPropagation(); kickId = ''; ask('cb:pkick', m.id).then(function (x) { if (x && x.error) toast(x.error); }); }; r.appendChild(k); }
        if (lead) r.onclick = function () { kickId = kickId === m.id ? '' : m.id; drawParty(); };
        pbox.appendChild(r); });
      var f = el('div', 'pf'), sh = el('button', '', party.share ? '經驗平分' : '經驗各拿'), out = el('button', '', '離開隊伍'); sh.type = out.type = 'button'; sh.disabled = !lead;
      sh.onclick = function () { ask('cb:pshare', party.share ? 0 : 1).then(function (x) { if (x && x.error) toast(x.error); }); }; out.onclick = function () { ask('cb:pleave').then(function () {}); };
      f.append(sh, out); pbox.appendChild(f); placeParty();
    }
    // 點到別的玩家：冒出一顆「邀請組隊」；自己不是隊長、隊伍滿了、對方已經是隊友就不冒
    var pop = el('div', 'note'); pop.id = 'cb-pop'; pop.hidden = true; var popB = el('button', '', '邀請組隊'); popB.type = 'button'; pop.appendChild(popB); document.body.appendChild(pop); var popT = 0, popId = '';
    CB.onPlayer(function (id, x, y) { clearTimeout(popT); var can = id && (!party || (party.leader === sock.id && party.m.length < C3.PARTY.max && !party.m.some(function (m) { return m.id === id; })));
      pop.hidden = !can; if (!can) return; popId = id; pop.style.left = x + 'px'; pop.style.top = y + 'px'; popT = setTimeout(function () { pop.hidden = true; }, 5000); });
    popB.addEventListener('pointerdown', function (e) { e.stopPropagation(); }); popB.onclick = function (e) { e.stopPropagation(); pop.hidden = true; ask('cb:pinvite', popId).then(function (r) { toast(r && r.error ? r.error : '邀請送出去了'); }); };
    // 被邀請：上面一張紙條，加入或不要
    var inv = el('div', 'note'); inv.id = 'cb-inv'; inv.hidden = true; document.body.appendChild(inv); var invT = 0;
    function showInv(v) { clearTimeout(invT); inv.innerHTML = ''; inv.hidden = false; inv.appendChild(el('span', '', (v.name || '有人') + ' 邀請你組隊')); var d = el('div'), y = el('button', 'yes', '加入'), n = el('button', '', '不要'); y.type = n.type = 'button';
      var answer = function (yes) { clearTimeout(invT); inv.hidden = true; ask('cb:panswer', { from: v.from, yes: yes }).then(function (r) { if (r && r.error) toast(r.error); }); };
      y.onclick = function () { answer(1); }; n.onclick = function () { answer(0); }; d.append(y, n); inv.appendChild(d); invT = setTimeout(function () { inv.hidden = true; }, (v.sec || 30) * 1000); }
    // 管理員測試用：不用真的練就能看每個階段
    function dbg(body) { if (!admin) return; var d = el('div', 'dbg'); d.appendChild(el('small', '', '管理員測試'));
      [['10 等', { lv: 10 }], ['50 等', { lv: 50 }], ['熟練度練滿', { m: C3.GATE.mastery }], ['信物補滿', { quest: 1 }], ['全部重來', { reset: 1 }]].forEach(function (a) { var b = el('button', '', a[0]); b.type = 'button'; b.onclick = function () { act('cb:dbg', a[1]); }; d.appendChild(b); }); body.appendChild(d); }
    var sig = '';
    CB.onChange(function () { drawHud(); var v = CB.view(), k = v ? JSON.stringify([v.lv, v.school, v.spec, v.schools, v.quest]) : ''; if (k !== sig) { sig = k; if (!book.hidden && mode === 'class') drawClass(); drawQuest(); placeParty(); if (editing() && !document.getElementById('cb-ghost')) drawBook(); } });
    drawHud(); drawQuest(); drawParty();
    return { openQuest: openQuest, openClass: openClass, openBook: openBook, close: close, ask: ask, isOpen: function () { return !book.hidden; } };
  } };
})(this);
