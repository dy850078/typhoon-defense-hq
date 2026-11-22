// 新世界大廳的小面板：職業導師（轉職）、扭蛋機、公共花園、種子箱、前院的許願池
// 扭蛋、花園、許願池讀寫的都是跟總部同一份資料（同一個背包、同一塊花園、同一批願望），只是換一個地方操作
// 背包和裝備、寵物的摸和餵、點唱機點歌也在這裡（階段一第一批），一樣是總部同一份資料
// 用法：NW_PANELS(NW, token, { setClass(cls), curClass(), music })，回傳 { open(kind, it), close(), toast(text) }
window.NW_PANELS = function (NW, token, opt) {
  var P = document.getElementById('panel'), TOAST = document.getElementById('toast'), toastT = 0, cur = null, pinned = false;   // pinned：從右上按鈕開的面板，走遠了不會自己收
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function icon(key, size) { var u = window.HQ_ICONS && HQ_ICONS.url(key); if (!u) return null; var i = el('img', 'ic'); i.src = u; i.alt = ''; if (size) i.style.width = i.style.height = size + 'px'; return i; }
  function btn(text, fn, cls) { var b = el('button', 'opt' + (cls ? ' ' + cls : ''), text); b.type = 'button'; b.onclick = fn; return b; }
  function toast(text) { if (!text) return; if (window.NW_CHAT) NW_CHAT.sys(text); TOAST.textContent = text; TOAST.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { TOAST.hidden = true; }, 2600); }
  function post(name, body) {
    return fetch('/api/newworld/' + name, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.ok ? r.json() : { ok: false, error: '連不上伺服器，等等再試' }; }, function () { return { ok: false, error: '連不上伺服器，等等再試' }; });
  }
  function close() { P.hidden = true; P.innerHTML = ''; cur = null; pinned = false; }
  function frame(kind, title, sub) {
    cur = kind; P.hidden = false; P.innerHTML = ''; P.dataset.kind = kind; P.classList.remove('post');
    var h = el('h2', '', title), x = el('button', 'note', '關掉'); x.type = 'button'; x.onclick = close; h.appendChild(x); P.appendChild(h);
    if (sub) P.appendChild(el('p', 'sub', sub));
    var body = el('div', 'body'); P.appendChild(body); return body;
  }
  function wait(body) { body.innerHTML = ''; body.appendChild(el('p', 'sub', '讀取中…')); }
  function fail(body, r) { body.innerHTML = ''; body.appendChild(el('p', 'err', (r && r.error) || '出了點問題，等等再試')); }
  function mins(ms) { var m = Math.ceil(ms / 60000); return m >= 60 ? Math.floor(m / 60) + ' 小時 ' + (m % 60 ? (m % 60) + ' 分' : '') : m + ' 分鐘'; }

  // ---------- 職業導師：轉職 ----------
  var CLS_NOTE = { '': '什麼都不帶，輕鬆走走', rider: '坐在大機器人上，用念力指揮它', summoner: '身邊跟著一隻召喚出來的小外星人', skater: '梳著大拉翅，跟陵寢裡的靈打交道' };
  function mentor() {
    if (window.NW_SK) { close(); return window.NW_SK.openClass(); }   // 新的職業（芽、學門、專精）在 newworld-skills.js
    var body = frame('mentor', '職業導師', '想換什麼職業？選了馬上換，之後隨時可以再來改。');
    var now = opt.curClass();
    NW.CLS.forEach(function (c) {
      var b = btn('', function () { var name = opt.setClass(c); close(); toast(c === 'rider' ? '轉職成' + name + '了。機器人進不了大廳，先送你到前院' : '轉職成' + name + '了'); }, 'big' + (c === now ? ' on' : ''));
      var i = c ? icon('cls-' + c, 26) : null; if (i) b.appendChild(i);
      var t = el('span'); t.appendChild(el('b', '', NW.CLS_NAME[c] + (c === now ? '（現在）' : ''))); t.appendChild(el('small', '', CLS_NOTE[c])); b.appendChild(t); b.dataset.cls = c || 'none';
      body.appendChild(b);
    });
  }

  // ---------- 扭蛋機 ----------
  function gacha(last) {
    var body = frame('gacha', '扭蛋機', '用新世界的扭蛋券，扭到的裝備放進新世界的背包。');
    wait(body);
    post('gacha', { act: 'state' }).then(function (r) { if (cur === 'gacha') drawGacha(body, r, last); });
  }
  function drawGacha(body, r, last) {
    if (!r.ok && r.tickets == null) return fail(body, r);
    body.innerHTML = '';
    var row = el('div', 'line'), ti = icon('item-gachaTicket', 30); if (ti) row.appendChild(ti);
    row.appendChild(el('b', '', '扭蛋券 ' + r.tickets + ' 張')); row.appendChild(el('span', 'dim', '再 ' + (r.pityMax - r.pity) + ' 次內一定有 SSR')); row.dataset.tickets = r.tickets; row.id = 'gacha-tickets'; body.appendChild(row);
    if (last) { var res = el('div', 'result r-' + last.rarity), gi = icon('gear-' + last.item, 44); if (gi) res.appendChild(gi);
      var t = el('span'); t.appendChild(el('b', '', '【' + last.rarity + '】' + last.name)); t.appendChild(el('small', '', (last.fresh ? '第一次拿到！' : '已經有了，多一件') + (last.pityHit ? '（保底）' : ''))); res.appendChild(t); body.appendChild(res); }
    if (r.error) body.appendChild(el('p', 'err', r.error));
    var go = function (act) { return function () { post('gacha', { act: act }).then(function (x) { if (cur !== 'gacha') return;
      if (!x.ok) return post('gacha', { act: 'state' }).then(function (s) { s.error = x.error; drawGacha(body, s, null); });
      if (act === 'recycle') toast('回收了' + x.used.join('、') + '，換到一張扭蛋券'); if (act === 'gem') toast('用一顆' + x.gem + '換了 ' + x.gemTickets + ' 張扭蛋券');
      drawGacha(body, x, act === 'spin' ? x : null); }); }; };
    var acts = el('div', 'acts');
    var b1 = btn('扭一次', go('spin'), 'main'); b1.disabled = r.tickets < 1; b1.id = 'gacha-spin'; acts.appendChild(b1);
    var b2 = btn('回收重複的（' + r.recycle + ' 件換 1 張）', go('recycle')); b2.disabled = r.spares < r.recycle; acts.appendChild(b2);
    var b3 = btn('寶石換券（1 顆換 ' + r.gemTickets + ' 張）', go('gem')); b3.disabled = r.gems < 1; acts.appendChild(b3);
    body.appendChild(acts);
    body.appendChild(el('p', 'dim', '重複的扭蛋裝備 ' + r.spares + ' 件、花園寶石 ' + r.gems + ' 顆。扭蛋券打倒頭目有機會掉。'));
  }

  // ---------- 公共花園 ----------
  function gardenSync(r) { if (r && r.plots) NW.garden(r.plots); }
  var plotI = -1, plotBody = null;
  function plot(i) {
    var body = frame('plot', '公共花園　第 ' + (i + 1) + ' 格', '跟總部的公共花園是同一塊：在這裡種的、澆的，總部也看得到。');
    wait(body); plotI = i; plotBody = body;
    post('garden', { act: 'info', i: i }).then(function (r) { gardenSync(r); if (cur === 'plot') drawPlot(body, i, r); });
  }
  function drawPlot(body, i, r) {
    if (!r.info) return fail(body, r);
    body.innerHTML = ''; var f = r.info;
    var act = function (name, extra) { return function () { post('garden', Object.assign({ act: name, i: i }, extra || {})).then(function (x) { gardenSync(x); if (cur !== 'plot') return;
      if (!x.ok) { return post('garden', { act: 'info', i: i }).then(function (s) { gardenSync(s); s.error = x.error; drawPlot(body, i, s); }); }
      toast(x.text); drawPlot(body, i, x); }); }; };
    if (r.error) body.appendChild(el('p', 'err', r.error));
    if (f.empty) {
      body.appendChild(el('p', '', '這一格空著，選一包種子種下去：'));
      var any = false, acts = el('div', 'acts');
      r.seeds.forEach(function (s) { if (!s.n) return; any = true; var b = btn(s.name + ' ×' + s.n + '（約 ' + s.hours + ' 小時）', act('plant', { kind: s.kind })), ic = icon('item-' + s.item, 24); if (ic) b.insertBefore(ic, b.firstChild); b.dataset.seed = s.kind; acts.appendChild(b); });
      body.appendChild(acts);
      if (!any) body.appendChild(el('p', 'dim', '身上沒有種子。陽台角落的種子箱每天可以領一包。'));
      return;
    }
    var name = (r.seeds.filter(function (s) { return s.kind === f.kind; })[0] || {}).name || f.kind;
    var row = el('div', 'line'), pi = icon(f.stage === 5 ? 'plant-dead' : 'plant-' + f.kind + '-' + f.stage, 40); if (pi) row.appendChild(pi);
    var t = el('span'); t.appendChild(el('b', '', name + '　' + r.stages[f.stage])); t.appendChild(el('small', '', f.by + ' 種的' + (f.last && f.last !== f.by ? '，最近是 ' + f.last + ' 澆的水' : ''))); row.appendChild(t); row.id = 'plot-now'; row.dataset.stage = f.stage; body.appendChild(row);
    var notes = [];
    if (f.ripeIn != null) notes.push('大約再 ' + mins(f.ripeIn) + '結果');
    if (f.wetFor > 0) notes.push('土還濕著，可以撐 ' + mins(f.wetFor)); else if (f.witherIn != null) notes.push('土乾了！再 ' + mins(f.witherIn) + '沒澆水就會枯掉');
    if (f.rotIn != null) notes.push('熟了，大家都可以收；再 ' + mins(f.rotIn) + '沒人收會爛掉');
    if (f.stage === 5) notes.push('枯掉了，清掉才能再種');
    notes.forEach(function (n) { body.appendChild(el('p', 'dim', n)); });
    var acts2 = el('div', 'acts');
    if (f.stage < 4) { var w = btn('澆水', act('water'), 'main'); w.id = 'plot-water'; acts2.appendChild(w); }
    if (f.stage === 4) { var hv = btn('收成', act('harvest'), 'main'); hv.id = 'plot-harvest'; acts2.appendChild(hv); }
    if (f.stage === 5) acts2.appendChild(btn('清掉', act('clear'), 'main'));
    body.appendChild(acts2);
  }
  function seedbox() { post('garden', { act: 'seed' }).then(function (r) { gardenSync(r); toast(r.ok ? r.text + '，找一格空的花圃種下去吧' : r.error); }); }

  // ---------- 許願池：跟總部同一份願望，功能也一樣齊（搜尋、類別、排序、留言、修改、收回、管理員改狀態）----------
  var wishQ = { q: '', cat: '', sort: '', mine: false, page: 1 }, wishSeq = 0, wishDraft = '', wishReload = null;
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function when(at) { var d = new Date(at); return (d.getMonth() + 1) + '/' + d.getDate(); }
  function whenFull(at) { var d = new Date(at); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + two(d.getHours()) + ':' + two(d.getMinutes()); }
  function chip(cls, text) { return el('span', 'chip ' + cls, text); }
  function hearts(w) { var s = el('span', 'likes' + (w.liked ? ' on' : '')), i = icon(w.liked ? 'wish-heart' : 'wish-heart-off', 16); if (i) s.appendChild(i); s.appendChild(document.createTextNode(w.likes)); return s; }
  function well() {
    var body = frame('well', '許願池', '想要什麼功能、哪裡壞了，都可以丟進來，大家可以按愛心和留言。');
    // 上面一排：搜尋、許願；下面：類別分頁、排序、我許的。這幾樣不重畫，只重畫下面的清單（打字才不會被打斷）
    var bar = el('div', 'wbar'), q = el('input'); q.type = 'search'; q.id = 'wish-q'; q.placeholder = '搜尋主題'; q.maxLength = 30; q.value = wishQ.q; q.setAttribute('enterkeyhint', 'search');
    var add = btn('許一個願', function () { if (wishInfo) wishForm(wishInfo, null); }, 'main'); add.id = 'wish-add'; add.disabled = true; var ci = icon('wish-coin', 20); if (ci) add.insertBefore(ci, add.firstChild);
    bar.appendChild(q); bar.appendChild(add); body.appendChild(bar);
    var cats = el('div', 'wtabs'); cats.id = 'wish-cats'; body.appendChild(cats);
    var sorts = el('div', 'wtabs sort'); body.appendChild(sorts);
    var list = el('div', 'wishes'); body.appendChild(list); var nav = el('div', 'acts pager'); body.appendChild(nav);
    var wishInfo = null, t = 0;
    function tabs(r) {
      cats.innerHTML = ''; [['', '全部']].concat(Object.keys(r.cats).map(function (k) { return [k, r.cats[k]]; })).forEach(function (c) {
        var b = el('button', 'wtab' + (wishQ.cat === c[0] ? ' on' : '') + (c[0] ? ' c-' + c[0] : ''), c[1]); b.type = 'button'; b.dataset.cat = c[0]; b.onclick = function () { wishQ.cat = c[0]; wishQ.page = 1; load(); }; cats.appendChild(b); });
      sorts.innerHTML = ''; [['', '最近更新'], ['likes', '最多愛心'], ['new', '最新許願']].forEach(function (c) {
        var b = el('button', 'wtab' + (wishQ.sort === c[0] ? ' on' : ''), c[1]); b.type = 'button'; b.dataset.sort = c[0]; b.onclick = function () { wishQ.sort = c[0]; wishQ.page = 1; load(); }; sorts.appendChild(b); });
      var m = el('button', 'wtab mine' + (wishQ.mine ? ' on' : ''), '我許的'); m.type = 'button'; m.id = 'wish-mine'; m.onclick = function () { wishQ.mine = !wishQ.mine; wishQ.page = 1; load(); }; sorts.appendChild(m);
    }
    function load() {
      var seq = ++wishSeq; if (!list.children.length) list.appendChild(el('p', 'sub', '讀取中…'));
      post('wishes', { act: 'list', page: wishQ.page, sort: wishQ.sort, cat: wishQ.cat, q: wishQ.q, mine: wishQ.mine ? 1 : 0 }).then(function (r) {
        if (cur !== 'well' || seq !== wishSeq || !list.isConnected) return; list.innerHTML = ''; nav.innerHTML = '';
        if (!r.ok) { list.appendChild(el('p', 'err', r.error || '出了點問題，等等再試')); return; }
        wishInfo = r; wishQ.page = r.page; tabs(r); add.disabled = r.left < 1; add.title = r.left < 1 ? '今天已經許了 ' + r.perDay + ' 個願，明天再來' : '今天還能許 ' + r.left + ' 個';
        if (!r.items.length) list.appendChild(el('p', 'dim', !r.all ? '還沒有人許願，來當第一個。' : '找不到符合的願望，換個關鍵字或類別看看。'));
        r.items.forEach(function (w) {
          var b = el('button', 'wish s-' + w.status); b.type = 'button'; b.dataset.id = w.id; b.onclick = function () { wishOne(w.id); };
          var main = el('span', 'wmain'), top = el('span', 'wtop'); top.appendChild(chip('c-' + w.cat, r.cats[w.cat])); top.appendChild(el('b', '', w.title)); if (w.status !== 'new') top.appendChild(chip('s-' + w.status, r.statuses[w.status]));
          main.appendChild(top); main.appendChild(el('small', '', w.name + (w.mine ? '（我）' : '') + '　' + when(w.at) + (w.comments ? '　留言 ' + w.comments : '') + (w.updated > w.at + 60000 ? '　更新 ' + when(w.updated) : '')));
          b.appendChild(main); b.appendChild(hearts(w)); list.appendChild(b);
        });
        if (r.pages > 1) { var a = btn('上一頁', function () { wishQ.page = r.page - 1; load(); }); a.disabled = r.page <= 1; var c = btn('下一頁', function () { wishQ.page = r.page + 1; load(); }); c.disabled = r.page >= r.pages;
          nav.appendChild(a); nav.appendChild(el('span', 'dim', '第 ' + r.page + ' / ' + r.pages + ' 頁，共 ' + r.total + ' 個願望')); nav.appendChild(c); }
        else if (r.total) nav.appendChild(el('span', 'dim', '共 ' + r.total + ' 個願望'));
      });
    }
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { wishQ.q = q.value.trim(); wishQ.page = 1; load(); }, 300); });
    q.addEventListener('keydown', function (e) { e.stopPropagation(); }); q.addEventListener('keyup', function (e) { e.stopPropagation(); });
    wishReload = function () { if (document.activeElement !== q) load(); }; load();
  }
  function wishOne(id, keepDraft) {
    wishReload = null; var body = frame('well', '許願池'); P.classList.add('post'); if (!keepDraft) wishDraft = ''; wait(body);
    post('wishes', { act: 'get', id: id }).then(function (r) { if (cur === 'well' && body.isConnected) drawWish(body, id, r); });
  }
  function drawWish(body, id, r) {
    if (!r.ok) { fail(body, r); var bk = el('div', 'acts'); bk.appendChild(btn('回清單', well)); body.appendChild(bk); return; }
    var w = r.wish, again = function (x) { if (cur !== 'well' || !body.isConnected) return; if (x.ok && x.wish) drawWish(body, id, x); else { if (x.error) toast(x.error); wishOne(id, true); } };
    body.innerHTML = '';
    var back = el('button', 'wback', '← 回清單'); back.type = 'button'; back.id = 'wish-back'; back.onclick = well; body.appendChild(back);
    var cols = el('div', 'wcols'), left = el('div', 'wleft'), right = el('div', 'wright'); cols.appendChild(left); cols.appendChild(right); body.appendChild(cols);
    // 左邊：願望本身，一張紙；完成的蓋一個章
    var paper = el('div', 'wpaper s-' + w.status), top = el('div', 'wtop'); top.appendChild(chip('c-' + w.cat, r.cats[w.cat])); top.appendChild(chip('s-' + w.status, r.statuses[w.status])); paper.appendChild(top);
    paper.appendChild(el('h3', 'wh', w.title)); paper.appendChild(el('p', 'wby', w.name + '　' + whenFull(w.at) + (w.updated > w.at + 60000 ? '　（更新 ' + when(w.updated) + '）' : '')));
    paper.appendChild(el('p', 'text' + (w.body ? '' : ' none'), w.body || '（沒有寫細節）'));
    if (w.status === 'done') { var st = el('div', 'wstamp'), si = icon('wish-stamp'); if (si) st.appendChild(si); st.appendChild(el('span', '', r.statuses.done)); paper.appendChild(st); }
    left.appendChild(paper);
    var acts = el('div', 'acts wacts');
    var like = el('button', 'opt wlike' + (w.liked ? ' on' : '')); like.type = 'button'; like.id = 'wish-like'; var hi = icon(w.liked ? 'wish-heart' : 'wish-heart-off', 20); if (hi) like.appendChild(hi); like.appendChild(document.createTextNode((w.liked ? '已經按愛心' : '我也想要') + '　' + w.likes));
    like.onclick = function () { like.disabled = true; post('wishes', { act: 'like', id: id }).then(function (x) { if (!x.ok) toast(x.error); wishOne(id, true); }); }; acts.appendChild(like);
    if (w.mine) {
      var ed = btn('修改', function () { wishForm(r, w); }); ed.id = 'wish-edit'; acts.appendChild(ed);
      var sure = false, wd = btn('收回', function () { if (!sure) { sure = true; wd.textContent = '確定收回？再按一次'; wd.classList.add('warn'); setTimeout(function () { if (wd.isConnected) { sure = false; wd.textContent = '收回'; wd.classList.remove('warn'); } }, 4000); return; }
        post('wishes', { act: 'withdraw', id: id }).then(function (x) { if (!x.ok) return toast(x.error); toast('願望收回來了'); well(); }); }); wd.id = 'wish-withdraw'; acts.appendChild(wd);
    }
    left.appendChild(acts);
    // 管理員：直接在這裡改狀態（伺服器會再檢查一次）
    if (r.admin) { var ad = el('div', 'wadmin'); ad.appendChild(el('small', '', '管理員：改狀態')); var pick = el('div', 'wtabs'); pick.id = 'wish-status';
      Object.keys(r.statuses).forEach(function (k) { var b = el('button', 'chip s-' + k + (w.status === k ? ' on' : ''), r.statuses[k]); b.type = 'button'; b.dataset.st = k; var ask = false;
        b.onclick = function () { if (w.status === k) return; if (k === 'done' && !ask) { ask = true; b.textContent = '確定已完成？再按一次'; setTimeout(function () { if (b.isConnected) { ask = false; b.textContent = r.statuses[k]; } }, 4000); return; }
          post('wishes', { act: 'status', id: id, status: k }).then(function (x) { if (x.ok) toast('狀態改成' + r.statuses[k] + '了'); again(x); }); }; pick.appendChild(b); });
      ad.appendChild(pick); left.appendChild(ad); }
    // 右邊：留言串和留言框
    right.appendChild(el('h4', 'wch', '留言' + (w.comments.length ? '（' + w.comments.length + '）' : '')));
    var th = el('div', 'wthread'); th.id = 'wish-thread';
    if (!w.comments.length) th.appendChild(el('p', 'dim', '還沒有人留言。'));
    w.comments.forEach(function (c) {
      var row = el('div', 'wc' + (c.admin ? ' admin' : c.author ? ' author' : '')), hd = el('div', 'wc-h'); hd.appendChild(el('b', '', c.name));
      if (c.admin) hd.appendChild(chip('role admin', '管理員')); else if (c.author) hd.appendChild(chip('role author', '許願者'));
      hd.appendChild(el('small', '', whenFull(c.at)));
      if (c.mine || r.admin) { var del = el('button', 'wdel', '刪除'); del.type = 'button'; var ok = false; del.onclick = function () { if (!ok) { ok = true; del.textContent = '確定刪除？'; setTimeout(function () { if (del.isConnected) { ok = false; del.textContent = '刪除'; } }, 4000); return; }
        post('wishes', { act: 'uncomment', id: id, cid: c.id }).then(again); }; hd.appendChild(del); }
      row.appendChild(hd); row.appendChild(el('p', 'wc-t', c.text)); th.appendChild(row);
    });
    right.appendChild(th);
    var form = el('div', 'wsay'), ta = el('textarea'); ta.id = 'wish-say'; ta.rows = 2; ta.maxLength = r.commentLen || 300; ta.placeholder = '留言（最多 ' + (r.commentLen || 300) + ' 個字）'; ta.value = wishDraft;
    ta.addEventListener('input', function () { wishDraft = ta.value; }); ta.addEventListener('keydown', function (e) { e.stopPropagation(); }); ta.addEventListener('keyup', function (e) { e.stopPropagation(); });
    var send = btn('送出留言', function () { var t = ta.value.trim(); if (!t) return; send.disabled = true;
      post('wishes', { act: 'comment', id: id, text: t }).then(function (x) { send.disabled = false; if (!x.ok) return toast(x.error); wishDraft = ''; again(x); }); }, 'main'); send.id = 'wish-say-send';
    form.appendChild(ta); form.appendChild(send); right.appendChild(form);
    th.scrollTop = th.scrollHeight;
  }
  // 許願和修改共用一張表：w 有東西就是修改
  function wishForm(r, w) {
    wishReload = null; var body = frame('well', w ? '修改願望' : '許一個願'), cat = w ? w.cat : '';
    body.appendChild(el('p', 'sub', w ? '改完按儲存，清單上會排到最前面。' : '今天還能許 ' + r.left + ' 個願。主題寫短一點，細節寫在下面。'));
    var title = el('input'); title.type = 'text'; title.maxLength = r.titleLen; title.placeholder = '主題（最多 ' + r.titleLen + ' 個字）'; title.id = 'wish-title'; title.value = w ? w.title : ''; body.appendChild(title);
    var cats = el('div', 'wtabs'); Object.keys(r.cats).forEach(function (k) { var b = el('button', 'wtab c-' + k + (cat === k ? ' on' : ''), r.cats[k]); b.type = 'button'; b.dataset.cat = k;
      b.onclick = function () { cat = k; [].forEach.call(cats.children, function (x) { x.classList.toggle('on', x === b); }); }; cats.appendChild(b); }); body.appendChild(cats);
    var text = el('textarea'); text.maxLength = r.bodyLen; text.rows = 6; text.placeholder = '想說的細節（可以不寫）'; text.id = 'wish-body'; text.value = w ? (w.body || '') : ''; body.appendChild(text);
    [title, text].forEach(function (x) { x.addEventListener('keydown', function (e) { e.stopPropagation(); }); x.addEventListener('keyup', function (e) { e.stopPropagation(); }); });
    var err = el('p', 'err'); err.hidden = true; body.appendChild(err);
    var acts = el('div', 'acts'), back = w ? function () { wishOne(w.id); } : well; var send = btn(w ? '儲存' : '丟進許願池', function () { send.disabled = true;
      post('wishes', w ? { act: 'edit', id: w.id, title: title.value, cat: cat, body: text.value } : { act: 'add', title: title.value, cat: cat, body: text.value }).then(function (x) { send.disabled = false; if (!x.ok) { err.hidden = false; err.textContent = x.error; return; }
        toast(w ? '願望改好了' : '願望丟進許願池了'); if (w) wishOne(w.id); else { wishQ = { q: '', cat: '', sort: '', mine: false, page: 1 }; well(); } }); }, 'main'); send.id = 'wish-send';
    acts.appendChild(send); acts.appendChild(btn('先不要', back)); body.appendChild(acts);
  }

  // ---------- 背包和裝備：跟總部同一個背包 ----------
  var bagTab = 'food', bagSel = null;
  function bag() { var body = eqView ? frame('bag', '裝備') : frame('bag', '背包', '補品現在還不能在新世界吃，先看和整理。'); wait(body); post('bag', { act: 'state' }).then(function (r) { if (cur === 'bag') drawBag(body, r); }); }
  function bagDo(body, req, done) { post('bag', req).then(function (x) { if (cur !== 'bag') return;
    if (!x.ok) return post('bag', { act: 'state' }).then(function (s) { s.error = x.error; if (cur === 'bag') drawBag(body, s); });
    toast(x.text); bagSel = null; if (x.equip) NW.gear(x.equip); if (done) done(x); drawBag(body, x); }); }
  function cell(iconKey, name, n, cls) { var c = el('button', 'cell' + (cls ? ' ' + cls : '')); c.type = 'button'; var i = icon(iconKey, 34); if (i) c.appendChild(i); c.appendChild(el('span', '', name)); if (n > 1) c.appendChild(el('i', '', '×' + n)); return c; }
  function drawBag(body, r) {
    if (!r.sections) return fail(body, r);
    body.innerHTML = '';
    if (eqView) return drawEquip(body, r);
    var lv = el('p', 'dim', '等級 ' + r.level + (r.level >= r.levelMax ? '（滿級）' : '')); lv.id = 'bag-level'; body.appendChild(lv);
    var tabs = el('div', 'tabs');
    ['food', 'misc', 'gear'].forEach(function (s) { var S = r.sections[s], b = btn('', function () { bagTab = s; bagSel = null; drawBag(body, r); }, bagTab === s ? 'on' : ''); b.appendChild(el('b', '', S.name)); b.appendChild(el('small', '', S.used + ' / ' + S.slots + ' 格')); b.dataset.tab = s; tabs.appendChild(b); });
    body.appendChild(tabs);
    if (r.error) body.appendChild(el('p', 'err', r.error));
    if (bagTab === 'gear') return drawGear(body, r);
    var list = r.items.filter(function (x) { return bagTab === 'food' ? x.sec === 'food' : x.sec !== 'food'; });
    if (!list.length) return body.appendChild(el('p', 'dim', bagTab === 'food' ? '沒有補品。花園收成、打怪都會拿到。' : '沒有雜物。'));
    var grid = el('div', 'grid');
    list.forEach(function (x) { var key = x.kind + ':' + x.k, c = cell(x.icon, x.name, x.n, bagSel === key ? 'on' : ''); c.dataset.item = x.k; c.onclick = function () { bagSel = bagSel === key ? null : key; drawBag(body, r); }; grid.appendChild(c); });
    body.appendChild(grid);
    var sel = list.filter(function (x) { return x.kind + ':' + x.k === bagSel; })[0];
    if (sel) { var acts = el('div', 'acts'); acts.appendChild(el('b', '', sel.name + ' ×' + sel.n)); var t = btn('丟掉一個', function () { bagDo(body, { act: 'trash', kind: sel.kind, k: sel.k }); }); t.id = 'bag-trash'; acts.appendChild(t); body.appendChild(acts);
      body.appendChild(el('p', 'dim', '丟掉就不見了，撿不回來。')); }
  }
  // 背包的裝備頁只放「沒穿在身上」的：穿上就從背包拿走，脫下才放回來（同一款有兩件，穿一件，背包還看得到一件）
  function spare(r) { return r.gear.map(function (g) { return Object.assign({}, g, { left: g.n - (g.on ? 1 : 0) }); }).filter(function (g) { return g.left > 0; }); }
  function gearGrid(body, r, list) {
    var grid = el('div', 'grid');
    list.forEach(function (g) { var c = cell('gear-' + g.id, g.name, g.left, 'r-' + g.rarity + (bagSel === g.id ? ' on' : '')); c.dataset.gear = g.id; c.onclick = function () { bagSel = bagSel === g.id ? null : g.id; drawBag(body, r); }; grid.appendChild(c); });
    body.appendChild(grid);
    var g = list.filter(function (x) { return x.id === bagSel; })[0];
    if (g) { var acts = el('div', 'acts'); acts.appendChild(el('b', '', '【' + g.rarity + '】' + g.name + '　' + r.slots[g.slot]));
      var e = btn('穿上', function () { eqSlot = eqView ? g.slot : eqSlot; bagDo(body, { act: 'equip', slot: g.slot, id: g.id }); }, 'main'); e.id = 'gear-equip'; acts.appendChild(e);
      if (!eqView) acts.appendChild(btn('丟掉一件', function () { bagDo(body, { act: 'trash', kind: 'gear', k: g.id }); })); body.appendChild(acts); }
  }
  function drawGear(body, r) {
    var list = spare(r);
    if (!list.length) return body.appendChild(el('p', 'dim', r.gear.length ? '背包裡沒有多的裝備，都穿在身上了。' : '還沒有裝備。大廳的扭蛋機、打怪和副本都會拿到。'));
    gearGrid(body, r, list);
    body.appendChild(el('p', 'dim', '穿在身上的不佔背包，要看或脫下請按右上的「裝備」。'));
  }
  // 裝備面板（右上的「裝備」）：身上四個部位；點一個部位，下面列出背包裡可以換上的
  var eqView = false, eqSlot = null;
  function drawEquip(body, r) {
    var lv = el('p', 'dim', '點一個部位，可以脫下，或換上背包裡的裝備。'); body.appendChild(lv);
    var row = el('div', 'worn-row');
    Object.keys(r.slots).forEach(function (s) { var id = r.equip[s], g = id && r.gear.filter(function (x) { return x.id === id; })[0];
      var c = g ? cell('gear-' + g.id, g.name, 0, 'worn r-' + g.rarity) : el('button', 'cell'); c.type = 'button'; if (!g) c.appendChild(el('small', '', '沒穿')); c.insertBefore(el('small', '', r.slots[s]), c.firstChild); c.dataset.slot = s; c.dataset.worn = id || '';
      if (eqSlot === s) c.classList.add('on'); c.style.cursor = 'pointer'; c.onclick = function () { eqSlot = eqSlot === s ? null : s; bagSel = null; drawBag(body, r); }; row.appendChild(c); });
    body.appendChild(row);
    if (r.error) body.appendChild(el('p', 'err', r.error));
    var worn = eqSlot && r.equip[eqSlot] && r.gear.filter(function (x) { return x.id === r.equip[eqSlot]; })[0];
    var list = spare(r).filter(function (g) { return !eqSlot || g.slot === eqSlot; });
    if (worn && !bagSel) { var acts = el('div', 'acts'); acts.appendChild(el('b', '', '【' + worn.rarity + '】' + worn.name + '　' + r.slots[eqSlot]));
      var e = btn('脫下，放回背包', function () { bagDo(body, { act: 'equip', slot: eqSlot, id: null }); }, 'main'); e.id = 'gear-equip'; acts.appendChild(e); body.appendChild(acts); }
    body.appendChild(el('p', 'sub', eqSlot ? '背包裡的' + r.slots[eqSlot] + '：' : '背包裡的裝備：'));
    if (!list.length) body.appendChild(el('p', 'dim', eqSlot ? '背包裡沒有這個部位的裝備。' : '背包裡沒有裝備。大廳的扭蛋機、打怪都會拿到。')); else gearGrid(body, r, list);
    body.appendChild(el('p', 'dim', '有些裝備的 3D 樣子還在做，穿上去暫時看不出來。'));
  }

  // ---------- 寵物：摸摸和餵點心（感情值跟總部共用）----------
  function pet() { var body = frame('pet', '寵物', '摸摸和餵點心可以加感情，每天有次數上限。'); wait(body); post('pet', { act: 'state' }).then(function (r) { if (cur === 'pet') drawPet(body, r); }); }
  function drawPet(body, r) {
    if (r.pet === undefined) return fail(body, r);
    body.innerHTML = '';
    if (!r.pet) return body.appendChild(el('p', 'dim', '還沒有寵物。新世界的寵物領養還沒開放。'));
    var p = r.pet, go = function (req) { return function () { post('pet', req).then(function (x) { if (cur !== 'pet') return;
      if (!x.ok) return post('pet', { act: 'state' }).then(function (s) { s.error = x.error; if (cur === 'pet') drawPet(body, s); });
      toast(x.text); if (x.happy) NW.petJoy(req.act === 'pat' ? '好舒服' : '好吃'); drawPet(body, x); }); }; };
    var row = el('div', 'line'); var t = el('span'); t.appendChild(el('b', '', p.name + '　' + p.levelName)); t.appendChild(el('small', '', '感情 ' + p.bond + (p.next ? ' / ' + p.next : '（滿了）'))); row.appendChild(t); row.id = 'pet-bond'; row.dataset.bond = p.bond; body.appendChild(row);
    var bar = el('div', 'bar'), fill = el('b'); fill.style.width = (p.next ? Math.min(100, Math.round(p.bond / p.next * 100)) : 100) + '%'; bar.appendChild(fill); body.appendChild(bar);
    if (r.error) body.appendChild(el('p', 'err', r.error));
    var acts = el('div', 'acts'); var pat = btn('摸摸' + (p.patLeft > 0 ? '（今天還能加 ' + p.patLeft + ' 次感情）' : '（今天的感情加滿了）'), go({ act: 'pat' }), 'main'); pat.id = 'pet-pat'; acts.appendChild(pat); body.appendChild(acts);
    body.appendChild(el('p', '', p.feedLeft > 0 ? '餵點心（今天還能餵 ' + p.feedLeft + ' 次）：' : '今天吃飽了，明天再餵。'));
    if (p.feedLeft > 0) { var fs = el('div', 'acts');
      r.foods.forEach(function (f) { var b = btn(f.name + ' ×' + f.n + '（感情 +' + f.gain + '）', go({ act: 'feed', item: f.k })), ic = icon(f.icon, 24); if (ic) b.insertBefore(ic, b.firstChild); b.dataset.food = f.k; fs.appendChild(b); });
      body.appendChild(fs); if (!r.foods.length) body.appendChild(el('p', 'dim', '背包裡沒有牠愛吃的。花園種的水果牠最喜歡。')); }
  }

  // ---------- 點唱機：聽歌、點歌（排進總部同一份歌單）----------
  var jukeBody = null, jukeFound = null;
  function juke() { var body = frame('juke', '點唱機', '跟總部放的是同一份歌單，在這裡點的歌總部也聽得到。'); jukeBody = body; jukeFound = null; wait(body); jukePost({ act: 'state' }); }
  function jukePost(req) { var body = jukeBody; return post('music', req).then(function (r) { if (cur !== 'juke' || body !== jukeBody) return r; if (r.list) jukeFound = r.list; if (r.ok && r.text) { toast(r.text); if (req.act === 'add') jukeFound = null; } drawJuke(body, r); return r; }); }
  function drawJuke(body, r) {
    if (!r.queue) return fail(body, r);
    body.innerHTML = '';
    var on = opt.music.state().on, row = el('div', 'line'), ic = icon('btn-song', 30); if (ic) row.appendChild(ic);
    var t = el('span'); t.appendChild(el('b', '', r.now ? r.now.title : '現在沒有歌')); t.appendChild(el('small', '', r.now ? r.now.byName + ' 點的' : '點一首就會開始放')); row.appendChild(t); row.id = 'juke-now'; body.appendChild(row);
    var acts = el('div', 'acts'); var lis = btn(on ? '先不聽' : '我要聽', function () { opt.music.toggle(); drawJuke(body, r); }, on ? 'on' : 'main'); lis.id = 'juke-listen'; acts.appendChild(lis);
    if (r.now && r.now.mine) acts.appendChild(btn('切掉我點的這首', function () { jukePost({ act: 'skip' }); }));
    body.appendChild(acts);
    if (r.error) body.appendChild(el('p', 'err', r.error));
    var q = el('input'); q.type = 'text'; q.maxLength = 200; q.placeholder = '打歌名搜尋，或貼 YouTube 連結'; q.id = 'juke-q'; body.appendChild(q);
    var a2 = el('div', 'acts'), go = btn('點歌', function () { var v = q.value.trim(); if (!v) return; go.disabled = true; jukePost(/youtu\.?be|^[\w-]{11}$/.test(v) ? { act: 'add', vid: v } : { act: 'search', q: v }); }, 'main'); go.id = 'juke-go'; a2.appendChild(go);
    a2.appendChild(el('span', 'dim', '排隊 ' + r.queue.length + ' / ' + r.max + ' 首')); body.appendChild(a2);
    q.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') go.click(); }); q.addEventListener('keyup', function (e) { e.stopPropagation(); });
    if (jukeFound) { if (!jukeFound.length) body.appendChild(el('p', 'dim', '找不到，換個關鍵字試試。'));
      jukeFound.forEach(function (s) { var li = el('div', 'song found'); li.appendChild(el('span', '', s.title)); li.appendChild(btn('點這首', function () { jukePost({ act: 'add', vid: s.vid, title: s.title }); })); body.appendChild(li); }); }
    if (r.queue.length) body.appendChild(el('p', 'sub', '接下來：'));
    r.queue.forEach(function (s) { var li = el('div', 'song'); li.appendChild(el('span', '', (s.i + 1) + '. ' + s.title + '　' + s.byName)); if (s.mine) li.appendChild(btn('拿掉', function () { jukePost({ act: 'remove', i: s.i }); })); body.appendChild(li); });
  }

  // 走遠了就把面板收起來（背包和寵物是按鈕開的，不會自己收）
  setInterval(function () { if (!cur || pinned || cur === 'bag' || cur === 'pet') return; var k = NW.near(); if (k === 'greek') k = 'well'; if (k !== cur) close(); }, 500);
  // 一進來先拿一次花園的狀態（之後有變伺服器會推過來）
  post('garden', { act: 'state' }).then(gardenSync);
  return { close: close, toast: toast,
    // 有人許願、按愛心、留言：開著的許願池清單跟著更新（正在看某個願望或打字時不動）
    wishes: function () { if (cur === 'well' && wishReload && P.querySelector('.wishes')) wishReload(); },
    // 歌單有變（換歌了、別人點歌了）：開著的點唱機面板跟著更新；輸入框裡正在打字就先不動
    music: function () { if (cur !== 'juke' || (document.activeElement && document.activeElement.id === 'juke-q') || (document.getElementById('juke-q') || {}).value) return; jukePost({ act: 'state' }); },
    // 花園有變（長大了、別人澆水了）：開著的花圃面板跟著更新
    garden: function () { if (cur !== 'plot') return; var i = plotI, body = plotBody; post('garden', { act: 'info', i: i }).then(function (r) { if (cur === 'plot' && plotI === i && r.info) drawPlot(body, i, r); }); },
    cur: function () { return cur; },
    refresh: function () { if (cur === 'bag') bag(); },
    open: function (kind, it, pin) {
      if (pin && cur === (kind === 'gear' ? 'bag' : kind) && (kind !== 'gear' || eqView) && (kind !== 'bag' || !eqView)) return close();   // 右上的按鈕再按一次就是收起來
      if (kind === 'gear' || (pin && kind === 'bag')) { eqView = kind === 'gear'; eqSlot = null; bagSel = null; bag(); pinned = true; return; }
      if (pin && kind === 'pet') { pet(); pinned = true; return; }
      if (pin && kind === 'juke') { juke(); pinned = true; return; }
      pinned = false;
      if (kind === 'mentor') mentor(); else if (kind === 'gacha') gacha(); else if (kind === 'plot') plot(it.i); else if (kind === 'seedbox') seedbox(); else if (kind === 'well') { wishQ.page = 1; well(); } else if (kind === 'juke') juke();
      else if (kind === 'bag') { if (cur === 'bag') close(); else { eqView = false; bag(); } } else if (kind === 'pet') { if (cur === 'pet') close(); else pet(); } else if (cur) close();
    } };
};
