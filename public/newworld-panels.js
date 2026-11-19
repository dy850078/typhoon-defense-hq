// 新世界大廳的小面板：職業導師（轉職）、扭蛋機、公共花園、種子箱、前院的許願池
// 扭蛋、花園、許願池讀寫的都是跟總部同一份資料（同一個背包、同一塊花園、同一批願望），只是換一個地方操作
// 用法：NW_PANELS(NW, token, { setClass(cls), curClass() })，回傳 { open(kind, it), close(), toast(text) }
window.NW_PANELS = function (NW, token, opt) {
  var P = document.getElementById('panel'), TOAST = document.getElementById('toast'), toastT = 0, cur = null;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function icon(key, size) { var u = window.HQ_ICONS && HQ_ICONS.url(key); if (!u) return null; var i = el('img', 'ic'); i.src = u; i.alt = ''; if (size) i.style.width = i.style.height = size + 'px'; return i; }
  function btn(text, fn, cls) { var b = el('button', 'opt' + (cls ? ' ' + cls : ''), text); b.type = 'button'; b.onclick = fn; return b; }
  function toast(text) { if (!text) return; TOAST.textContent = text; TOAST.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { TOAST.hidden = true; }, 2600); }
  function post(name, body) {
    return fetch('/api/newworld/' + name, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.ok ? r.json() : { ok: false, error: '連不上伺服器，等等再試' }; }, function () { return { ok: false, error: '連不上伺服器，等等再試' }; });
  }
  function close() { P.hidden = true; P.innerHTML = ''; cur = null; }
  function frame(kind, title, sub) {
    cur = kind; P.hidden = false; P.innerHTML = ''; P.dataset.kind = kind;
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
    var body = frame('gacha', '扭蛋機', '跟總部的扭蛋機是同一台：同一疊扭蛋券、同一個保底，扭到的裝備放進總部的背包。');
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
      if (!any) body.appendChild(el('p', 'dim', '身上沒有種子。陽台角落的種子箱每天可以領一包，打怪也有機會掉。'));
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

  // ---------- 許願池 ----------
  var wishPage = 1;
  function when(at) { var d = new Date(at); return (d.getMonth() + 1) + '/' + d.getDate(); }
  function well() {
    var body = frame('well', '許願池', '想要什麼功能、哪裡壞了，都可以丟進來。跟總部的許願池是同一個。');
    wait(body);
    post('wishes', { act: 'list', page: wishPage, sort: 'new' }).then(function (r) { if (cur === 'well') drawWishes(body, r); });
  }
  function drawWishes(body, r) {
    if (!r.ok) return fail(body, r);
    body.innerHTML = '';
    var top = el('div', 'acts'); var add = btn('許一個願（今天還能許 ' + r.left + ' 個）', function () { wishForm(r); }, 'main'); add.disabled = r.left < 1; add.id = 'wish-add'; top.appendChild(add); body.appendChild(top);
    if (!r.items.length) body.appendChild(el('p', 'dim', '還沒有人許願，來當第一個。'));
    var list = el('div', 'wishes');
    r.items.forEach(function (w) {
      var b = el('button', 'wish'); b.type = 'button'; b.onclick = function () { wishOne(w.id); };
      b.appendChild(el('b', '', w.title));
      b.appendChild(el('small', '', '【' + r.cats[w.cat] + '】' + r.statuses[w.status] + '　' + w.name + '　' + when(w.at) + '　讚 ' + w.likes + (w.comments ? '　留言 ' + w.comments : '')));
      list.appendChild(b);
    });
    body.appendChild(list);
    if (r.pages > 1) { var nav = el('div', 'acts'); var a = btn('上一頁', function () { wishPage = r.page - 1; well(); }); a.disabled = r.page <= 1; var c = btn('下一頁', function () { wishPage = r.page + 1; well(); }); c.disabled = r.page >= r.pages;
      nav.appendChild(a); nav.appendChild(el('span', 'dim', '第 ' + r.page + ' / ' + r.pages + ' 頁')); nav.appendChild(c); body.appendChild(nav); }
  }
  function wishOne(id) {
    var body = frame('well', '許願池'); wait(body);
    post('wishes', { act: 'get', id: id }).then(function (r) { if (cur !== 'well') return; if (!r.ok) return fail(body, r);
      var w = r.wish; body.innerHTML = '';
      body.appendChild(el('p', 'title', w.title));
      body.appendChild(el('p', 'dim', '【' + r.cats[w.cat] + '】' + r.statuses[w.status] + '　' + w.name + '　' + when(w.at)));
      if (w.body) body.appendChild(el('p', 'text', w.body));
      (w.comments || []).forEach(function (c) { var p = el('p', 'cmt'); p.appendChild(el('b', '', c.name + (c.admin ? '（管理員）' : c.author ? '（許願者）' : '') + '：')); p.appendChild(document.createTextNode(c.text)); body.appendChild(p); });
      var acts = el('div', 'acts');
      var like = btn((w.liked ? '收回讚' : '我也想要') + '（' + w.likes + '）', function () { post('wishes', { act: 'like', id: id }).then(function (x) { if (!x.ok) toast(x.error); wishOne(id); }); }, w.liked ? 'on' : 'main'); like.id = 'wish-like'; acts.appendChild(like);
      acts.appendChild(btn('回清單', well)); body.appendChild(acts);
      body.appendChild(el('p', 'dim', '要留言、修改或收回願望，請到總部的許願池。'));
    });
  }
  function wishForm(r) {
    var body = frame('well', '許一個願'), cat = '';
    var title = el('input'); title.type = 'text'; title.maxLength = r.titleLen; title.placeholder = '主題（最多 ' + r.titleLen + ' 個字）'; title.id = 'wish-title'; body.appendChild(title);
    var cats = el('div', 'acts'); Object.keys(r.cats).forEach(function (k) { var b = btn(r.cats[k], function () { cat = k; [].forEach.call(cats.children, function (x) { x.classList.toggle('on', x === b); }); }); b.dataset.cat = k; cats.appendChild(b); }); body.appendChild(cats);
    var text = el('textarea'); text.maxLength = r.bodyLen; text.rows = 4; text.placeholder = '想說的細節（可以不寫）'; text.id = 'wish-body'; body.appendChild(text);
    var err = el('p', 'err'); err.hidden = true; body.appendChild(err);
    var acts = el('div', 'acts'); var send = btn('丟進許願池', function () { send.disabled = true;
      post('wishes', { act: 'add', title: title.value, cat: cat, body: text.value }).then(function (x) { send.disabled = false; if (!x.ok) { err.hidden = false; err.textContent = x.error; return; } toast('願望丟進許願池了'); wishPage = 1; well(); }); }, 'main'); send.id = 'wish-send';
    acts.appendChild(send); acts.appendChild(btn('先不要', well)); body.appendChild(acts);
  }

  // 走遠了就把面板收起來
  setInterval(function () { if (!cur) return; var k = NW.near(); if (k === 'greek') k = 'well'; if (k !== cur) close(); }, 500);
  // 一進來先拿一次花園的狀態（之後有變伺服器會推過來）
  post('garden', { act: 'state' }).then(gardenSync);
  return { close: close, toast: toast,
    // 花園有變（長大了、別人澆水了）：開著的花圃面板跟著更新
    garden: function () { if (cur !== 'plot') return; var i = plotI, body = plotBody; post('garden', { act: 'info', i: i }).then(function (r) { if (cur === 'plot' && plotI === i && r.info) drawPlot(body, i, r); }); },
    open: function (kind, it) {
      if (kind === 'mentor') mentor(); else if (kind === 'gacha') gacha(); else if (kind === 'plot') plot(it.i); else if (kind === 'seedbox') seedbox(); else if (kind === 'well') { wishPage = 1; well(); } else if (cur) close();
    } };
};
