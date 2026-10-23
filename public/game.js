/* global Phaser, io, HQ_MAP, HQ_AVATAR */
(() => {
  const MAP = HQ_MAP;
  const AV = HQ_AVATAR;
  const ST = HQ_STATS;
  const GR = HQ_GEAR;
  // 人物貼圖比 64x80 大一圈，翅膀、氣球、帽子才畫得下；(16,32) 是人物框的左上角，腳底在 y=108
  const FRAME = { w: 96, h: 112, ox: 16, oy: 32 };
  const AV_ORIGIN_Y = (FRAME.oy + 76) / FRAME.h;
  const T = MAP.TILE;
  const SPEED = 220;
  const FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  const $ = (id) => document.getElementById(id);

  // ---------------- 角色創建 ----------------
  const profile = {
    name: localStorage.getItem('hq-name') || '',
    hair: localStorage.getItem('hq-hair') || 'short',
    hairColor: localStorage.getItem('hq-hairColor') || AV.HAIR_COLORS[0],
    skin: localStorage.getItem('hq-skin') || AV.SKINS[0],
    outfit: localStorage.getItem('hq-outfit') || AV.OUTFITS[0],
    glasses: localStorage.getItem('hq-glasses') || '1',
    cls: localStorage.getItem('hq-cls') || 'staff',
  };
  // 舊版存的是動物的顏色，對不上就換回預設
  if (!AV.HAIRS[profile.hair]) profile.hair = 'short';
  if (!AV.OUTFITS.includes(profile.outfit)) profile.outfit = AV.OUTFITS[0];
  if (!ST.CLASSES[profile.cls]) profile.cls = 'staff';

  function renderPreview() {
    const c = $('preview');
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save(); ctx.scale(2, 2); AV.drawAvatar(ctx, profile); ctx.restore();
  }

  function buildPicker(el, items, key, render) {
    el.innerHTML = '';
    items.forEach(([value, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      render(b, value, label);
      if (profile[key] === value) b.classList.add('on');
      b.onclick = () => {
        profile[key] = value;
        [...el.children].forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        renderPreview();
      };
      el.appendChild(b);
    });
  }

  const swatch = (b, v) => { b.style.background = v; };
  buildPicker($('hairs'), Object.entries(AV.HAIRS), 'hair', (b, v, l) => { b.textContent = l; });
  buildPicker($('hair-colors'), AV.HAIR_COLORS.map(c => [c]), 'hairColor', swatch);
  buildPicker($('skins'), AV.SKINS.map(c => [c]), 'skin', swatch);
  buildPicker($('outfits'), AV.OUTFITS.map(c => [c]), 'outfit', swatch);
  buildPicker($('glasses'), [['1', AV.GLASSES[1]], ['0', AV.GLASSES[0]]], 'glasses', (b, v, l) => { b.textContent = l; });
  $('name').value = profile.name;
  renderPreview();

  // ---------------- 連線 ----------------
  const socket = io();
  let config = { jitsiDomain: 'meet.jit.si', jitsiRoom: 'TyphoonDefenseHQ' };
  fetch('/config').then(r => r.json()).then(c => { config = c; }).catch(() => {});

  let me = null;
  let scene = null;
  let joined = false;
  const pending = []; // scene 建好之前收到的事件

  // 等級、經驗存在自己的瀏覽器；報名頁的邀請函也一起帶進總部
  const saved = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const savedJson = (k, d) => { try { return JSON.parse(saved(k) || 'null') || d; } catch (e) { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { /* 無痕模式 */ } };
  // 拿到的裝備、身上穿的裝備也存在瀏覽器
  let myOwned = savedJson('hq-owned', []);
  let myEquip = savedJson('hq-equip', {});
  function doJoin() {
    const vip = savedJson('hq-vip', null);
    const data = Object.assign({}, profile, { level: Number(saved('hq-level')) || 1, exp: Number(saved('hq-exp')) || 0, vip,
      owned: myOwned, equip: myEquip });
    socket.emit('join', data, (res) => {
      if (!res.ok) { $('join-error').textContent = res.error; return; }
      joined = true;
      me = res.you;
      myOwned = res.you.owned || [];
      myEquip = res.you.equip || {};
      $('join').hidden = true;
      $('hud').hidden = false;
      $('messages').innerHTML = '';
      res.history.forEach(addMessage);
      const start = () => scene.setupWorld(res);
      if (scene) start(); else pending.push(start);
    });
  }

  $('join-form').addEventListener('submit', (e) => {
    e.preventDefault();
    profile.name = $('name').value.trim();
    if (!profile.name) { $('join-error').textContent = '請輸入名字'; return; }
    Object.entries(profile).forEach(([k, v]) => localStorage.setItem('hq-' + k, v));
    $('join-error').textContent = '';
    doJoin();
  });

  socket.on('connect', () => { if (joined) doJoin(); });
  socket.on('disconnect', () => { if (joined) addMessage({ system: true, text: '連線中斷，重新連線中…' }); });
  socket.on('playerJoined', (p) => scene && scene.addRemote(p));
  socket.on('playerMoved', (m) => scene && scene.moveRemote(m));
  socket.on('playerLeft', (id) => scene && scene.removeRemote(id));
  socket.on('monster', (m) => scene && scene.setMonster(m));
  socket.on('monsterMove', (m) => scene && scene.moveMonster(m));
  socket.on('monsterHit', (m) => scene && scene.onMonsterHit(m));
  socket.on('mAttack', (a) => scene && scene.onMonsterAttack(a));
  socket.on('mAttackHit', (a) => scene && scene.onMonsterAttackHit(a));
  socket.on('skillFx', (fx) => scene && scene.onSkillFx(fx));
  socket.on('mob', (m) => scene && scene.setMob(m));
  socket.on('mobsMove', (list) => scene && scene.moveMobs(list));
  socket.on('mobHit', (m) => scene && scene.onMobHit(m));
  socket.on('mobAttack', (a) => scene && scene.onMobAttack(a));
  socket.on('levelUp', (l) => scene && scene.onLevelUp(l));
  socket.on('firework', (f) => scene && scene.launchFirework(f));
  socket.on('crateHit', (c) => scene && scene.onCrateHit(c));
  socket.on('itemGot', (g) => scene && scene.onItemGot(g));
  socket.on('crateEmpty', (c) => scene && scene.setCrateEmpty(c.tx, c.ty, true));
  socket.on('crateRestock', (c) => scene && scene.setCrateEmpty(c.tx, c.ty, false));
  socket.on('stats', (st) => scene && scene.onStats(st));
  socket.on('cooking', (c) => scene && scene.onCooking(c));
  socket.on('ate', (a) => toast(`吃了 ${a.food}，血量 +${a.hp} ❤️`));
  socket.on('playerGear', (g) => scene && scene.onGear(g));
  socket.on('gearGot', (g) => {
    myOwned = g.owned;
    store('hq-owned', myOwned);
    const it = GR.GEAR[g.item];
    if (it) toast(`🎁 獲得【${it.rarity}】${it.icon} ${it.name}！到 👗 裝備 穿上看看`);
    if (scene && scene.me) scene.burst(scene.me.x, scene.me.y - 40, 16, 0xffd23f);
    if (modalKind === 'gear') openGear();
  });
  socket.on('cake', (c) => scene && scene.onCake(c.id, c.ms));
  socket.on('drawState', (st) => DRAW.onState(st));
  socket.on('drawLog', (l) => DRAW.log(l));
  socket.on('drawStroke', (st) => DRAW.paint(st));
  socket.on('drawClear', () => DRAW.clear());
  socket.on('chat', (msg) => {
    addMessage(msg);
    if (!msg.system && scene) scene.showBubble(msg.id, msg.text);
  });

  // ---------------- 聊天 ----------------
  const chatInput = $('chat-input');
  function addMessage(msg) {
    const box = $('messages');
    const line = document.createElement('div');
    if (msg.system) { line.className = 'sys'; line.textContent = msg.text; }
    else {
      const b = document.createElement('b');
      b.textContent = msg.name + '：';
      line.appendChild(b);
      line.appendChild(document.createTextNode(msg.text));
    }
    box.appendChild(line);
    while (box.children.length > 100) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
  }
  $('chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = chatInput.value.trim();
    if (t) socket.emit('chat', t);
    chatInput.value = '';
    chatInput.blur();
  });
  window.addEventListener('keydown', (e) => {
    if (!joined) return;
    if (e.key === 'Enter' && !typing()) { e.preventDefault(); chatInput.focus(); }
    else if (e.key === 'Escape') { chatInput.blur(); closeModal(); if (!$('draw').hidden) DRAW.close(); }
  });
  // 正在打字或開著視窗的時候，鍵盤不控制角色
  const typing = () => document.activeElement === chatInput ||
    (document.activeElement && document.activeElement.tagName === 'INPUT') || !$('modal').hidden || !$('draw').hidden;
  $('chat-toggle').addEventListener('click', () => $('chat').classList.toggle('collapsed'));
  if (window.innerWidth < 600) $('chat').classList.add('collapsed');

  // ---------------- 視訊 ----------------
  $('video-btn').addEventListener('click', () => {
    const name = encodeURIComponent(JSON.stringify(me ? me.name : ''));
    const url = `https://${config.jitsiDomain}/${encodeURIComponent(config.jitsiRoom)}` +
      `#userInfo.displayName=${name}&config.prejoinConfig.enabled=false`;
    window.open(url, '_blank', 'noopener');
  });

  // ---------------- 彈出視窗 ----------------
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  let modalKind = null;
  function openModal(kind, title, body) {
    modalKind = kind;
    $('modal').classList.remove('wide');
    $('modal-title').textContent = title;
    const box = $('modal-body');
    box.innerHTML = '';
    box.appendChild(body);
    $('modal').hidden = false;
    chatInput.blur();
  }
  function closeModal() { $('modal').hidden = true; $('modal').classList.remove('wide'); modalKind = null; }
  $('modal-x').addEventListener('click', closeModal);
  $('modal').addEventListener('pointerdown', (e) => { if (e.target === $('modal')) closeModal(); });

  // ---------------- 背包 ----------------
  const ITEM_INFO = {
    noodle: { desc: '到休息區的煮泡麵區，站在爐台旁煮來吃，補 35 血。', use: '去煮泡麵區' },
    water: { desc: '喝了補 25 魔力，在哪裡都能喝。', use: '喝一瓶' },
    veggie: { desc: '煮泡麵時會自動加進去，變成蔬菜泡麵，補 65 血。', use: null },
  };
  let myInv = {};
  function renderInventory(inv) {
    myInv = inv || {};
    const box = $('inventory');
    box.innerHTML = '';
    Object.entries(MAP.ITEMS).forEach(([k, it]) => {
      // 礦泉水可以直接點來喝
      const e = el(k === 'water' ? 'button' : 'span', 'inv-item', `${it.icon} ${myInv[k] || 0}`);
      e.title = k === 'water' ? '點一下喝水，補魔力' : it.name;
      if (k === 'water') e.onclick = drink;
      box.appendChild(e);
    });
    const bag = el('button', 'inv-item bag-btn', '🎒 背包');
    bag.onclick = openBag;
    box.appendChild(bag);
    const gear = el('button', 'inv-item bag-btn', '👗 裝備');
    gear.onclick = openGear;
    box.appendChild(gear);
    if (modalKind === 'bag') openBag();
  }
  function openBag() {
    const list = el('div', 'modal-list');
    Object.entries(MAP.ITEMS).forEach(([k, it]) => {
      const row = el('div', 'modal-row');
      row.appendChild(el('div', 'modal-icon', it.icon));
      const info = el('div', 'modal-info');
      info.appendChild(el('b', null, `${it.name} × ${myInv[k] || 0}`));
      info.appendChild(el('p', null, ITEM_INFO[k].desc));
      row.appendChild(info);
      if (ITEM_INFO[k].use) {
        const b = el('button', 'primary small', ITEM_INFO[k].use);
        b.disabled = !myInv[k];
        b.onclick = () => {
          if (k === 'water') drink();
          else { closeModal(); toast('煮泡麵區在休息區的右下角，站到爐台旁按空白鍵'); }
        };
        row.appendChild(b);
      }
      list.appendChild(row);
    });
    list.appendChild(el('p', 'modal-hint', '到 📦 物資倉庫敲箱子可以拿到更多物資，箱子被拿光後過一陣子會補貨。'));
    openModal('bag', '🎒 背包', list);
  }
  function drink() {
    if (!myInv.water) { toast('沒有礦泉水，去物資倉庫敲箱子'); return; }
    socket.emit('drink', (res) => {
      if (!res || !res.ok) return;
      renderInventory(res.inv);
      toast(`喝了礦泉水，魔力 +${res.mp} 💧`);
    });
  }

  // ---------------- 裝備欄 ----------------
  // 把某個人（套上某些裝備）畫成一張小圖
  function gearPortrait(equip, scale) {
    const c = document.createElement('canvas');
    c.width = FRAME.w * scale; c.height = FRAME.h * scale;
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale); ctx.translate(FRAME.ox, FRAME.oy);
    AV.drawAvatar(ctx, Object.assign({}, profile, { cls: myCls(), equip }));
    return c;
  }
  function equipGear(slot, id) {
    socket.emit('equip', slot, id, (res) => {
      if (!res || !res.ok) return;
      myEquip = res.equip;
      store('hq-equip', myEquip);
      if (modalKind === 'gear') openGear();
    });
  }
  function openGear() {
    const box = el('div', 'gear');
    const top = el('div', 'gear-top');
    const pic = gearPortrait(myEquip, 2);
    pic.className = 'gear-me' + (topRarity(myEquip) ? ' r-' + topRarity(myEquip) : '');
    top.appendChild(pic);
    const slots = el('div', 'gear-slots');
    Object.entries(GR.SLOTS).forEach(([slot, label]) => {
      const id = myEquip[slot], it = GR.GEAR[id];
      const row = el('div', 'gear-slot' + (it ? ' r-' + it.rarity : ''));
      row.appendChild(el('span', 'gear-slot-k', label));
      row.appendChild(el('b', null, it ? `${it.icon} ${it.name}` : '—'));
      if (it) { const off = el('button', 'hud-btn tiny', '脫下'); off.onclick = () => equipGear(slot, null); row.appendChild(off); }
      slots.appendChild(row);
    });
    slots.appendChild(el('p', 'modal-hint', `收集 ${myOwned.length} / ${Object.keys(GR.GEAR).length} 件。到 🎖️ 戰情室玩 🎨 你畫我猜，猜對就會拿到新裝備！`));
    top.appendChild(slots);
    box.appendChild(top);
    Object.entries(GR.SLOTS).forEach(([slot, label]) => {
      box.appendChild(el('h3', 'gear-h', label));
      const grid = el('div', 'gear-grid');
      Object.entries(GR.GEAR).filter(([, g]) => g.slot === slot).forEach(([id, g]) => {
        const have = myOwned.includes(id), on = myEquip[slot] === id;
        const cell = el('button', `gear-item r-${g.rarity}${have ? '' : ' locked'}${on ? ' on' : ''}`);
        cell.type = 'button';
        cell.appendChild(el('span', 'gear-rar', g.rarity));
        if (have) {
          const thumb = gearPortrait({ [slot]: id }, 1);
          thumb.className = 'gear-thumb';
          cell.appendChild(thumb);
          cell.appendChild(el('span', 'gear-name', g.name));
          cell.appendChild(el('span', 'gear-act', on ? '✓ 穿著（點一下脫下）' : '點一下穿上'));
          cell.onclick = () => equipGear(slot, on ? null : id);
        } else {
          cell.appendChild(el('span', 'gear-lock', '？'));
          cell.appendChild(el('span', 'gear-name', '？？？'));
          cell.disabled = true;
        }
        grid.appendChild(cell);
      });
      box.appendChild(grid);
    });
    openModal('gear', '👗 裝備', box);
    $('modal').classList.add('wide');
  }
  // 身上最稀有的裝備等級（決定光芒）
  function topRarity(equip) {
    const order = ['R', 'SR', 'SSR'];
    let best = -1;
    Object.values(equip || {}).forEach(id => { const g = GR.GEAR[id]; if (g) best = Math.max(best, order.indexOf(g.rarity)); });
    return best >= 1 ? order[best] : null;
  }

  // ---------------- 冰箱（隱藏的蛋糕） ----------------
  function openFridge() {
    const box = el('form', 'fw-form');
    const input = el('input');
    input.maxLength = 12; input.autocomplete = 'off';
    box.appendChild(input);
    const go = el('button', 'primary', '確定'); go.type = 'submit';
    box.appendChild(go);
    box.onsubmit = (e) => {
      e.preventDefault();
      socket.emit('cake', input.value, (res) => {
        closeModal();
        if (res && res.ok) toast('🎂 拿到蛋糕了！靠近你的人都會戴上慶祝帽');
        else toast('🧊 冰箱裡只有幾瓶礦泉水…');
      });
    };
    openModal('fridge', '🧊', box);
    setTimeout(() => input.focus(), 30);
  }
  $('cake-btn').addEventListener('click', () => socket.emit('cakeDown'));

  // ---------------- 你畫我猜（戰情室） ----------------
  const DRAW = (() => {
    const cv = $('draw-canvas'), ctx = cv.getContext('2d');
    const COLORS = ['#2b2a33', '#e8384f', '#ff7a2f', '#ffd23f', '#6baf7b', '#4f7cc2', '#7a5cc8', '#a0663e'];
    const SIZES = [4, 10, 22];
    let state = null, answer = '', color = COLORS[0], size = SIZES[1], cur = null, sendTimer = 0;
    const amHost = () => state && me && state.host === me.id;

    function clear() { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height); }
    function paint(st) {
      const k = cv.width / 1000, ky = cv.height / 1000;
      ctx.save(); ctx.strokeStyle = st.c; ctx.fillStyle = st.c; ctx.lineWidth = st.w * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      st.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * ky) : ctx.moveTo(x * k, y * ky)));
      if (st.pts.length === 1) { ctx.arc(st.pts[0][0] * k, st.pts[0][1] * ky, st.w * k / 2, 0, Math.PI * 2); ctx.fill(); } else ctx.stroke();
      ctx.restore();
    }
    function log(l) {
      const box = $('draw-log');
      const line = el('div', 'dl-' + (l.kind || 'sys'), l.text);
      box.appendChild(line);
      while (box.children.length > 80) box.firstChild.remove();
      box.scrollTop = box.scrollHeight;
    }
    function render() {
      if (!state) return;
      const host = amHost();
      $('draw').classList.toggle('is-host', host);
      const guessers = state.members.filter(m => m.id !== state.host);
      const right = guessers.filter(m => state.correct.includes(m.id)).length;
      let info;
      if (!state.host) info = '還沒有主持人，按「🎤 當主持人」來出題！';
      else if (!state.playing) info = host ? '你是主持人：輸入答案、按「出題」，然後開始畫！' : `主持人 ${state.hostName} 正在想題目…`;
      else info = host ? `答案「${answer}」· 已猜對 ${right} / ${guessers.length}` : `${state.hostName} 出題中 · 答案有 ${state.len} 個字 · 已猜對 ${right} / ${guessers.length}`;
      $('draw-info').textContent = info;
      const claim = $('draw-claim');
      claim.hidden = host;
      claim.textContent = state.host ? '🎤 搶主持棒' : '🎤 當主持人';
      const v = state.vote;
      $('draw-vote').hidden = !v;
      if (v) {
        $('draw-vote-text').textContent = `📣 ${v.byName} 想搶主持棒（${v.yes.length} / ${v.need} 人同意）`;
        $('draw-vote-yes').hidden = v.yes.includes(me && me.id);
      }
      const who = $('draw-members');
      who.innerHTML = '';
      state.members.forEach(m => {
        const tag = m.id === state.host ? '🎤 ' : state.correct.includes(m.id) ? '✅ ' : '';
        who.appendChild(el('span', 'chip' + (me && m.id === me.id ? ' me' : ''), tag + m.name));
      });
      $('draw-guess').placeholder = host ? '主持人不能猜喔' : state.playing ? `猜猜看（${state.len} 個字）` : '聊天…';
      $('draw-guess').disabled = host;
    }
    function onState(st) { state = st; if (!amHost()) answer = ''; render(); }

    // 主持人畫畫：座標換成 0~1000，每 60 毫秒送一段
    function pos(e) {
      const b = cv.getBoundingClientRect();
      return [Math.round((e.clientX - b.left) / b.width * 1000), Math.round((e.clientY - b.top) / b.height * 1000)];
    }
    function flush() {
      sendTimer = 0;
      if (!cur || cur.pts.length < 1) return;
      const st = { c: cur.c, w: cur.w, pts: cur.pts };
      socket.emit('drawStroke', st);
      const last = cur.pts[cur.pts.length - 1];
      cur.pts = [last];
    }
    cv.addEventListener('pointerdown', (e) => {
      if (!amHost()) return;
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      cur = { c: color, w: size, pts: [pos(e)] };
      paint(cur);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!cur) return;
      const p = pos(e), last = cur.pts[cur.pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 4) return;
      paint({ c: cur.c, w: cur.w, pts: [last, p] });
      cur.pts.push(p);
      if (cur.pts.length > 150) flush();
      else if (!sendTimer) sendTimer = setTimeout(flush, 60);
    });
    const end = () => { if (!cur) return; clearTimeout(sendTimer); flush(); cur = null; };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);

    // 工具列
    const pal = $('draw-colors');
    COLORS.concat(['#ffffff']).forEach(c => {
      const b = el('button', 'sw' + (c === color ? ' on' : ''));
      b.type = 'button'; b.style.background = c; b.title = c === '#ffffff' ? '橡皮擦' : '';
      if (c === '#ffffff') b.textContent = '🧽';
      b.onclick = () => { color = c; [...pal.children].forEach(x => x.classList.toggle('on', x === b)); };
      pal.appendChild(b);
    });
    const sz = $('draw-sizes');
    SIZES.forEach(w => {
      const b = el('button', 'sz' + (w === size ? ' on' : ''));
      b.type = 'button';
      const d = el('i'); d.style.width = d.style.height = Math.max(4, w * 0.8) + 'px'; b.appendChild(d);
      b.onclick = () => { size = w; [...sz.children].forEach(x => x.classList.toggle('on', x === b)); };
      sz.appendChild(b);
    });
    $('draw-clear').onclick = () => { if (amHost()) { clear(); socket.emit('drawClear'); } };
    $('draw-reveal').onclick = () => socket.emit('drawReveal');
    $('draw-start-form').onsubmit = (e) => {
      e.preventDefault();
      const a = $('draw-answer').value.trim();
      socket.emit('drawStart', a, (res) => {
        if (!res || !res.ok) { if (res && res.error) toast(res.error); return; }
        answer = a; $('draw-answer').value = ''; render();
      });
    };
    $('draw-guess-form').onsubmit = (e) => {
      e.preventDefault();
      const t = $('draw-guess').value.trim();
      if (!t) return;
      $('draw-guess').value = '';
      socket.emit('drawGuess', t, (res) => {
        if (res && res.error) toast(res.error);
        if (res && res.correct) toast(res.item ? '🎉 猜對了！拿到一件新裝備' : '🎉 猜對了！（裝備已經全部收集完了）');
      });
    };
    $('draw-claim').onclick = () => socket.emit('drawClaim', (res) => { if (res && res.error) toast(res.error); });
    $('draw-vote-yes').onclick = () => socket.emit('drawVote');
    $('draw-x').onclick = () => close();

    function open() {
      // 先把目前位置告訴伺服器，它才知道你在戰情室裡
      const m = scene && scene.me;
      if (m) socket.emit('move', { x: Math.round(m.x), y: Math.round(m.y), dir: m.dir, moving: false });
      socket.emit('drawJoin', (res) => {
        if (!res || !res.ok) { if (res && res.error) toast(res.error); return; }
        $('draw-log').innerHTML = '';
        clear();
        res.strokes.forEach(paint);
        answer = res.answer || '';
        $('draw').hidden = false;
        chatInput.blur();
        onState(res.state);
      });
    }
    function close() {
      if ($('draw').hidden) return;
      end();
      $('draw').hidden = true;
      socket.emit('drawLeave');
      state = null;
    }
    clear();
    return { open, close, onState, log, paint, clear };
  })();
  $('draw-btn').addEventListener('click', () => DRAW.open());

  // ---------------- 數值、技能欄 ----------------
  let myStats = null;
  const myCls = () => (myStats && ST.CLASSES[myStats.cls] ? myStats.cls : 'staff');
  const special = () => ST.CLASSES[myCls()].skills[1];
  const cooldowns = {}; // skillId -> 冷卻結束的時間（performance.now）
  function renderStats(st) {
    const clsChanged = !myStats || myStats.cls !== st.cls;
    myStats = st;
    $('hp-fill').style.width = (100 * st.hp / st.maxHp) + '%';
    $('mp-fill').style.width = (100 * st.mp / st.maxMp) + '%';
    $('hp-text').textContent = `${st.hp}/${st.maxHp}`;
    $('mp-text').textContent = `${st.mp}/${st.maxMp}`;
    $('atk-text').textContent = st.atk;
    $('def-text').textContent = st.def + (st.buffMs > 0 ? ' 🛡️' : '');
    $('lv-text').textContent = 'Lv.' + st.level;
    $('exp-fill').style.width = (100 * st.exp / st.expNext) + '%';
    $('exp-text').textContent = `${st.exp}/${st.expNext}`;
    try { localStorage.setItem('hq-level', st.level); localStorage.setItem('hq-exp', st.exp); } catch (e) {}
    const c = ST.CLASSES[myCls()];
    $('cls-text').textContent = `${c.icon} ${c.name}`;
    if (clsChanged) renderSkillbar();
    if (modalKind === 'skills') openSkills();
  }
  function renderSkillbar() {
    const sk = ST.SKILLS[special()];
    const b = $('skill-btn');
    b.innerHTML = '';
    b.appendChild(el('i', 'cd'));
    b.appendChild(document.createTextNode(sk.icon + ' '));
    b.appendChild(el('span', 'sk-name', sk.name + ' '));
    b.appendChild(el('small', null, `${sk.mp} MP · K`));
    b.title = sk.desc;
  }
  function openSkills() {
    const c = ST.CLASSES[myCls()];
    const box = el('div', 'modal-list');
    const head = el('div', 'modal-row cls-head');
    head.appendChild(el('div', 'modal-icon', c.icon));
    const info = el('div', 'modal-info');
    info.appendChild(el('b', null, `${c.name}（${c.role}）`));
    info.appendChild(el('p', null, c.desc));
    if (myStats) info.appendChild(el('p', 'mono', `HP ${myStats.maxHp} · MP ${myStats.maxMp} · ATK ${myStats.atk} · DEF ${myStats.def}`));
    head.appendChild(info);
    box.appendChild(head);
    c.skills.forEach((id, i) => {
      const sk = ST.SKILLS[id];
      const row = el('div', 'modal-row');
      row.appendChild(el('div', 'modal-icon', sk.icon));
      const inf = el('div', 'modal-info');
      inf.appendChild(el('b', null, sk.name));
      inf.appendChild(el('span', 'mono tag', `${i ? 'K' : '空白鍵'} · ${sk.mp} MP · 冷卻 ${sk.cooldown / 1000} 秒` +
        (sk.support ? '' : ` · 射程 ${sk.range}`)));
      inf.appendChild(el('p', null, sk.desc));
      row.appendChild(inf);
      const b = el('button', 'primary small', '使用');
      b.onclick = () => { closeModal(); if (scene) scene.useSkill(id); };
      row.appendChild(b);
      box.appendChild(row);
    });
    box.appendChild(el('p', 'modal-hint', '想換職業？到 🗺️ 指揮中心找 📂 轉職資料沈理員。'));
    openModal('skills', '📖 技能', box);
  }
  // 轉職導師的對話視窗
  function openMentor() {
    const box = el('div', 'modal-list');
    box.appendChild(el('p', 'mentor-say', '「你的資料我都整理好了。颱風天，每個人都要找到自己的位置，想轉成哪一種防衛員？」'));
    Object.entries(ST.CLASSES).forEach(([id, c]) => {
      const st = ST.statsFor(id), sk = ST.SKILLS[c.skills[1]];
      const row = el('div', 'modal-row' + (id === myCls() ? ' on' : ''));
      row.appendChild(el('div', 'modal-icon', c.icon));
      const inf = el('div', 'modal-info');
      inf.appendChild(el('b', null, `${c.name}（${c.role}）`));
      inf.appendChild(el('p', null, c.desc));
      inf.appendChild(el('span', 'mono tag', `HP ${st.maxHp} · MP ${st.maxMp} · ATK ${st.atk} · DEF ${st.def}`));
      inf.appendChild(el('p', null, `${sk.icon} ${sk.name}：${sk.desc}`));
      row.appendChild(inf);
      const b = el('button', 'primary small', id === myCls() ? '目前職業' : '轉職');
      b.disabled = id === myCls();
      b.onclick = () => {
        socket.emit('changeClass', id, (res) => {
          if (!res || !res.ok) { if (res && res.error) toast(res.error); return; }
          profile.cls = id;
          localStorage.setItem('hq-cls', id);
          Object.keys(cooldowns).forEach(k => delete cooldowns[k]);
          closeModal();
          toast(`轉職成功！你現在是 ${c.icon} ${c.name}，按 K 放「${sk.name}」`);
        });
      };
      row.appendChild(b);
      box.appendChild(row);
    });
    openModal('mentor', '📂 轉職資料沈理員', box);
  }
  // 慶祝煙火的輸入視窗
  function openFirework() {
    const box = el('form', 'fw-form');
    const lv = myStats ? myStats.level : 1;
    if (lv < ST.LEVEL.fireworkLv) {
      box.appendChild(el('p', 'mentor-say', `🔒 升到 Lv.${ST.LEVEL.fireworkLv} 才能放煙火，你現在是 Lv.${lv}。`));
      box.appendChild(el('p', 'modal-hint', '打颱風和野外的小怪會拿到經驗；在總部每待 10 分鐘也會自動升一等。'));
      openModal('firework', '🎆 慶祝煙火', box);
      return;
    }
    box.appendChild(el('p', 'modal-hint', '輸入想放的字（最多 8 個字），煙火會在你頭上炸開拼成這幾個字，大家都看得到！'));
    const input = el('input');
    input.maxLength = 8; input.placeholder = '例如：颱風退散';
    input.value = localStorage.getItem('hq-fw') || '';
    box.appendChild(input);
    const chips = el('div', 'chips');
    ['颱風退散', '生日快樂', '乾杯', '防衛成功', '放假囉'].forEach(t => {
      const b = el('button', null, t); b.type = 'button';
      b.onclick = () => { input.value = t; input.focus(); };
      chips.appendChild(b);
    });
    box.appendChild(chips);
    const go = el('button', 'primary', '🎆 發射！'); go.type = 'submit';
    box.appendChild(go);
    box.onsubmit = (e) => {
      e.preventDefault();
      const t = input.value.trim();
      if (!t) { input.focus(); return; }
      socket.emit('firework', t, (res) => {
        if (!res || !res.ok) { if (res && res.error) toast(res.error); return; }
        localStorage.setItem('hq-fw', t);
        closeModal();
      });
    };
    openModal('firework', '🎆 慶祝煙火', box);
    setTimeout(() => input.focus(), 50);
  }

  // ---------------- 個人資料（VIP Pass） ----------------
  // 右鍵選單
  function showMenu(who, cx, cy) {
    const m = $('ctx-menu');
    m.innerHTML = '';
    m.appendChild(el('div', 'ctx-name', who.name_));
    const b = el('button', null, '📇 個人資料');
    b.onclick = () => { hideMenu(); showProfile(who.pid); };
    m.appendChild(b);
    m.hidden = false;
    m.style.left = Math.min(cx, window.innerWidth - 170) + 'px';
    m.style.top = Math.min(cy, window.innerHeight - 90) + 'px';
  }
  function hideMenu() { $('ctx-menu').hidden = true; }
  window.addEventListener('pointerdown', (e) => { if (!$('ctx-menu').contains(e.target) && e.target.tagName !== 'CANVAS') hideMenu(); });

  // 跟報名頁一樣的頭銜、來賓編號、條碼（由名字算出來）
  const TIERS = ['泡麵戰略儲備官', '超市搶菜特派員', '家裡蹲首席執行長', '沙發守護隊長', '追劇值勤員', '零食補給官', '窗戶膠帶工程師', '停班停課等待員', '行動電源備援官', '棉被結界師'];
  function hashOf(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }
  function guestNo(name) {
    let h = 7;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
    return String(h).padStart(3, '0');
  }
  function showProfile(id) {
    socket.emit('profile', id, (res) => {
      if (!res || !res.ok) { toast((res && res.error) || '讀不到這個人的資料'); return; }
      const c = ST.CLASSES[res.cls] || ST.CLASSES.staff;
      const box = el('div', 'modal-list');
      box.appendChild(el('p', 'mono prof-line', `Lv.${res.level} · ${c.icon} ${c.name}`));
      const v = res.vip;
      if (!v) {
        box.appendChild(el('p', 'mentor-say', `${res.name} 還沒有在報名頁生成邀請函，所以沒有 VIP Pass。`));
        const a = el('a', 'primary small', '去報名頁生成邀請函'); a.href = '/'; a.target = '_blank';
        if (me && id === me.id) box.appendChild(a);
        openModal('profile', `📇 ${res.name}`, box);
        return;
      }
      const card = el('div', 'vip' + (v.theme === 's' ? ' silver' : ''));
      const main = el('div', 'vip-main');
      const top = el('div', 'vip-top');
      top.appendChild(el('span', 'vip-brand', 'TYPHOON DAY · VIP PASS'));
      top.appendChild(el('span', 'vip-spark', '✦'));
      main.appendChild(top);
      const idRow = el('div', 'vip-id');
      const ava = el('div', 'vip-ava');
      if (v.photo) { const img = el('img'); img.src = 'data:image/jpeg;base64,' + v.photo; img.alt = v.name + ' 的大頭照'; ava.appendChild(img); }
      idRow.appendChild(ava);
      const who = el('div', 'vip-who');
      const tier = el('span', 'vip-tier');
      tier.appendChild(el('span', 'vip-hq', '防颱總部'));
      tier.appendChild(el('span', null, TIERS[hashOf(v.name) % TIERS.length]));
      who.appendChild(tier);
      who.appendChild(el('span', 'vip-name', v.name));
      who.appendChild(el('span', 'vip-sub', '特約職員・10.23 颱風假開趴'));
      idRow.appendChild(who);
      main.appendChild(idRow);
      const facts = el('div', 'vip-facts');
      [['ON REPEAT', v.song], ["TONIGHT'S POUR", v.drink]].forEach(([k, val]) => {
        const f = el('div', 'vip-fact');
        f.appendChild(el('span', 'vip-k', k));
        f.appendChild(el('span', 'vip-v', val || '—'));
        facts.appendChild(f);
      });
      main.appendChild(facts);
      card.appendChild(main);
      const stub = el('div', 'vip-stub');
      stub.appendChild(el('span', 'vip-k', 'GUEST NO.'));
      stub.appendChild(el('span', 'vip-no', guestNo(v.name)));
      stub.appendChild(el('span', 'vip-k', '2026.10.23 / 20:00'));
      const bar = el('div', 'vip-bar');
      let seed = hashOf(v.name) || 1;
      for (let i = 0; i < 30; i++) {
        seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
        const b = el('i'); b.style.width = (1 + (seed >>> 16) % 4) + 'px';
        if (i % 3 === 2) b.style.marginRight = '2px';
        bar.appendChild(b);
      }
      stub.appendChild(bar);
      stub.appendChild(el('span', 'vip-k', 'ADMIT ONE · ALL ACCESS'));
      card.appendChild(stub);
      box.appendChild(card);
      openModal('profile', `📇 ${res.name} 的個人資料`, box);
      $('modal').classList.add('wide');
    });
  }

  function toast(text) {
    const t = el('div', 'toast', text);
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  $('action-btn').addEventListener('click', () => scene && scene.doAction());
  $('skill-btn').addEventListener('click', () => scene && scene.useSkill(special()));
  $('skills-open').addEventListener('click', openSkills);
  $('fw-btn').addEventListener('click', openFirework);

  // ---------------- 畫颱風怪物（軟綿綿的雲朵怪） ----------------
  const CR = window.HQ_CRAYON;
  // 颱風怪「薔琵」：跟場景人物一樣，粗抖的深色外框＋平塗＋蠟筆顆粒，畫在 240x240 裡，腳底在 y=200
  function drawTyphoonCloud() {
    const S = 240, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    const r = CR.rng(2026);
    const W = 5; // 外框（先描粗線再蓋上顏色，只留外圈一半）
    // 腳底的影子
    ctx.fillStyle = 'rgba(19,26,40,0.22)';
    ctx.beginPath(); ctx.ellipse(120, 204, 80, 9, 0, 0, Math.PI * 2); ctx.fill();
    // 小短腿 + 雨鞋
    [[94, 0.12], [146, -0.12]].forEach(([x, a]) => {
      ctx.save(); ctx.translate(x, 184); ctx.rotate(a);
      CR.rect(ctx, -8, -14, 16, 26, r, 1); CR.fill(ctx, '#2f3b55', r, null); CR.stroke(ctx, r, 3);
      CR.blob(ctx, a > 0 ? -4 : 4, 13, 12, 6.5, r, 0.08, 12); CR.fill(ctx, '#2f3b55', r, null); CR.stroke(ctx, r, 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-6, -4, 12, 3);
      ctx.restore();
    });
    // 一團一團蓬蓬的雲
    const puffs = [
      [120, 112, 66], [70, 122, 42], [170, 122, 42], [88, 76, 38], [152, 74, 40], [120, 52, 34],
      [54, 150, 28], [186, 150, 28], [92, 158, 38], [148, 158, 38], [120, 164, 36], [44, 106, 22], [196, 102, 24],
    ];
    const pr = CR.rng(77);
    const shape = () => puffs.map(([x, y, rad]) => { const q = CR.rng(x * 31 + y); return [x, y, rad, q]; });
    // 1. 外框
    shape().forEach(([x, y, rad, q]) => { CR.blob(ctx, x, y, rad, rad, q, 0.05, 18); CR.stroke(ctx, pr, W * 2); });
    // 2. 平塗的底色
    shape().forEach(([x, y, rad, q]) => { CR.blob(ctx, x, y, rad, rad, q, 0.05, 18); ctx.fillStyle = '#eef2f8'; ctx.fill(); });
    // 3. 只在雲裡面畫：下緣的陰影色塊（平塗，不用漸層）、格紋、顆粒
    ctx.save();
    const clip = new Path2D();
    puffs.forEach(([x, y, rad]) => { clip.moveTo(x + rad, y); clip.arc(x, y, rad - 1, 0, Math.PI * 2); });
    ctx.clip(clip);
    [[120, 186, 96, 30], [62, 168, 30, 14], [178, 168, 30, 14], [132, 150, 50, 12]].forEach(([x, y, rx, ry]) => {
      CR.blob(ctx, x, y, rx, ry, r, 0.08); ctx.fillStyle = '#c9d4e6'; ctx.fill();
    });
    // 每一團雲上面的小亮面
    [[96, 64, 12, 6], [140, 58, 12, 6], [110, 40, 9, 4], [64, 108, 10, 5]].forEach(([x, y, rx, ry]) => {
      CR.blob(ctx, x, y, rx, ry, r, 0.1, 12); ctx.fillStyle = '#ffffff'; ctx.fill();
    });
    CR.dots(ctx, 10, 10, 220, 190, 90, 'rgba(255,255,255,0.8)', r, 1.8);
    CR.dots(ctx, 10, 10, 220, 190, 50, 'rgba(79,124,194,0.16)', r, 1.6);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.4)' : 'rgba(40,30,50,0.06)';
      ctx.fillRect(10 + r() * 220, 10 + r() * 190, 0.6 + r() * 1.6, 0.6);
    }
    ctx.restore();
    // 雲團之間的小皺褶線
    [[70, 122, 42, 0.9, 1.9], [170, 122, 42, 1.25, 2.2], [92, 158, 38, -2.4, -1.4], [148, 158, 38, -1.8, -0.8]].forEach(([x, y, rad, a1, a2]) => {
      ctx.beginPath(); ctx.arc(x, y, rad - 3, a1, a2); CR.stroke(ctx, r, 2.4);
    });
    // 肚子上的颱風眼漩渦
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.03) {
      const rad = 4 + t * 32, a = t * Math.PI * 3.4;
      const x = 120 + Math.cos(a) * rad, y = 150 + Math.sin(a) * rad * 0.7;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    CR.stroke(ctx, r, 3.2, '#4f7cc2');
    // 兩隻小短手
    [[46, 136, -0.5], [194, 136, 0.5]].forEach(([x, y, a]) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      CR.blob(ctx, 0, 0, 9, 14, r, 0.08, 14); CR.fill(ctx, '#eef2f8', r, [-9, -14, 18, 28]); CR.stroke(ctx, r, 3);
      ctx.restore();
    });
    // 被風吹出來的小雲尾巴
    [[26, 70, -0.6], [216, 64, 0.6]].forEach(([x, y, a]) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      [[0, 0, 11], [-12, -9, 7], [-19, -18, 4.5]].forEach(([dx, dy, rad]) => {
        CR.blob(ctx, dx, dy, rad, rad, r, 0.08, 12); CR.fill(ctx, '#eef2f8', r, null); CR.stroke(ctx, r, 2.6);
      });
      ctx.restore();
    });
    // 頭頂的小橘色漩渦
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.04) {
      const rad = 2 + t * 10, a = t * Math.PI * 3;
      const x = 120 + Math.cos(a) * rad, y = 14 + Math.sin(a) * rad * 0.8;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(121, 22);
    CR.stroke(ctx, r, 6, CR.INK);
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.04) {
      const rad = 2 + t * 10, a = t * Math.PI * 3;
      const x = 120 + Math.cos(a) * rad, y = 14 + Math.sin(a) * rad * 0.8;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(121, 22);
    CR.stroke(ctx, r, 3.4, '#ff7a2f');
    return c;
  }
  // 腳邊一圈在轉的風
  function drawTyphoonSwirl() {
    const S = 260, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    const r = CR.rng(7);
    ctx.translate(S / 2, S / 2);
    for (let arm = 0; arm < 3; arm++) {
      ctx.save(); ctx.rotate((arm * Math.PI * 2) / 3);
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.05) {
        const rad = 60 + t * 60, a = t * 1.6;
        const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      CR.stroke(ctx, r, 5, '#ffffff');
      ctx.restore();
    }
    return c;
  }
  // 表情：normal 是插畫風的豆豆眼＋厚嘴唇，hit 是被打到的 >< 臉
  function drawTyphoonFace(mood) {
    const c = document.createElement('canvas');
    c.width = 150; c.height = 90;
    const ctx = c.getContext('2d');
    const r = CR.rng(mood === 'hit' ? 12 : 11);
    // 紅臉頰
    ctx.fillStyle = 'rgba(244,120,140,0.45)';
    [[30, 46], [120, 46]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 14, 9, 0, 0, Math.PI * 2); ctx.fill(); });
    if (mood === 'hit') {
      CR.line(ctx, 48, 22, 60, 30, r, 3.5); CR.line(ctx, 48, 38, 60, 30, r, 3.5);
      CR.line(ctx, 102, 22, 90, 30, r, 3.5); CR.line(ctx, 102, 38, 90, 30, r, 3.5);
      CR.blob(ctx, 75, 60, 11, 12, r, 0.08); CR.fill(ctx, '#e8606a', r, null); CR.stroke(ctx, r, 2.4);
      ctx.fillStyle = '#7a2230'; ctx.beginPath(); ctx.ellipse(75, 61, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
      return c;
    }
    // 小豆豆眼
    ctx.fillStyle = CR.INK;
    [[56, 30], [94, 30]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#ffffff';
    [[57.5, 28], [95.5, 28]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill(); });
    // 有點壞心的小眉毛
    CR.line(ctx, 46, 16, 62, 21, r, 3); CR.line(ctx, 104, 16, 88, 21, r, 3);
    // 厚厚的珊瑚色嘴唇
    ctx.beginPath();
    ctx.moveTo(58, 58); ctx.quadraticCurveTo(66, 50, 75, 55); ctx.quadraticCurveTo(84, 50, 92, 58);
    ctx.quadraticCurveTo(84, 70, 75, 69); ctx.quadraticCurveTo(66, 70, 58, 58); ctx.closePath();
    CR.fill(ctx, '#e8606a', r, null); CR.stroke(ctx, r, 2.4);
    CR.line(ctx, 61, 59, 89, 59, r, 1.8, '#7a2230', 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(68, 55.5, 4, 1.6, -0.2, 0, Math.PI * 2); ctx.fill();
    return c;
  }
  // 小閃電
  function drawBolt() {
    const c = document.createElement('canvas');
    c.width = 40; c.height = 60;
    const ctx = c.getContext('2d');
    const r = CR.rng(5);
    ctx.beginPath(); ctx.moveTo(22, 2); ctx.lineTo(6, 32); ctx.lineTo(18, 32); ctx.lineTo(12, 58); ctx.lineTo(34, 22); ctx.lineTo(21, 22); ctx.lineTo(28, 2); ctx.closePath();
    CR.fill(ctx, '#ffd23f', r, null); CR.stroke(ctx, r, 2.5);
    return c;
  }

  // 特效用的小圖，全部是外框＋平塗的蠟筆風
  function fxCanvas(w, h, seed, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), CR.rng(seed));
    return c;
  }
  const FX = {
    // 爐火
    flame: () => fxCanvas(36, 44, 21, (ctx, r) => {
      ctx.beginPath(); ctx.moveTo(18, 2); ctx.quadraticCurveTo(34, 20, 31, 32); ctx.quadraticCurveTo(28, 42, 18, 42);
      ctx.quadraticCurveTo(6, 42, 5, 32); ctx.quadraticCurveTo(4, 20, 18, 2); ctx.closePath();
      CR.fill(ctx, '#ff7a2f', r, null); CR.stroke(ctx, r, 2.4);
      ctx.beginPath(); ctx.moveTo(18, 16); ctx.quadraticCurveTo(26, 26, 24, 33); ctx.quadraticCurveTo(22, 39, 18, 39);
      ctx.quadraticCurveTo(12, 39, 12, 33); ctx.quadraticCurveTo(11, 26, 18, 16); ctx.closePath();
      CR.fill(ctx, '#ffd23f', r, null);
    }),
    // 蒸氣
    steam: () => fxCanvas(44, 36, 22, (ctx, r) => {
      [[14, 22, 10], [26, 18, 12], [34, 25, 8]].forEach(([x, y, rad]) => { CR.blob(ctx, x, y, rad, rad * 0.85, r, 0.08, 12); CR.stroke(ctx, r, 4, '#9aa3b5'); });
      [[14, 22, 10], [26, 18, 12], [34, 25, 8]].forEach(([x, y, rad]) => { CR.blob(ctx, x, y, rad, rad * 0.85, r, 0.08, 12); ctx.fillStyle = '#ffffff'; ctx.fill(); });
    }),
    // 精靈射手的愛心箭（紅斗篷配色）
    arrow: () => fxCanvas(80, 24, 23, (ctx, r) => {
      CR.line(ctx, 8, 12, 62, 12, r, 3.2, CR.INK, 0.3);
      CR.line(ctx, 8, 12, 62, 12, r, 1.6, '#e8d6ae', 0.3);
      [[4, 5], [4, 19]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.moveTo(14, 12); ctx.lineTo(x, y); ctx.lineTo(x + 10, y); ctx.closePath();
        CR.fill(ctx, '#e8606a', r, null); CR.stroke(ctx, r, 1.8);
      });
      ctx.beginPath(); ctx.moveTo(78, 12); ctx.bezierCurveTo(74, 2, 62, 3, 64, 12); ctx.bezierCurveTo(62, 21, 74, 22, 78, 12); ctx.closePath();
      CR.fill(ctx, '#e8384f', r, null); CR.stroke(ctx, r, 2);
    }),
    // 槓鈴
    barbell: () => fxCanvas(120, 50, 24, (ctx, r) => {
      CR.rect(ctx, 14, 22, 92, 7, r, 0.6); CR.fill(ctx, '#c3c9d3', r, null); CR.stroke(ctx, r, 2.4);
      [[6, 10, 16, 32], [20, 14, 10, 24], [98, 10, 16, 32], [90, 14, 10, 24]].forEach(([x, y, w, h]) => {
        CR.rect(ctx, x, y, w, h, r, 0.8); CR.fill(ctx, '#2f3b55', r, null); CR.stroke(ctx, r, 2.4);
      });
      ctx.fillStyle = '#ff7a2f'; ctx.fillRect(56, 22, 8, 7);
    }),
    // 鮮乳瓶
    milk: () => fxCanvas(44, 64, 25, (ctx, r) => {
      ctx.beginPath(); ctx.moveTo(15, 6); ctx.lineTo(29, 6); ctx.lineTo(29, 16); ctx.lineTo(37, 26); ctx.lineTo(37, 58);
      ctx.lineTo(7, 58); ctx.lineTo(7, 26); ctx.lineTo(15, 16); ctx.closePath();
      CR.fill(ctx, '#ffffff', r, [7, 6, 30, 52]); CR.stroke(ctx, r, 2.6);
      CR.rect(ctx, 7, 32, 30, 16, r, 0.6); CR.fill(ctx, '#6baf7b', r, null); CR.stroke(ctx, r, 2);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('鮮乳', 22, 44);
      CR.rect(ctx, 14, 2, 16, 6, r, 0.5); CR.fill(ctx, '#4f7cc2', r, null); CR.stroke(ctx, r, 2);
    }),
    // 預言家的水晶球
    crystal: () => fxCanvas(64, 70, 26, (ctx, r) => {
      CR.rect(ctx, 14, 50, 36, 14, r, 1); CR.fill(ctx, '#b98457', r, null); CR.stroke(ctx, r, 2.6);
      CR.blob(ctx, 32, 30, 23, 23, r, 0.03); CR.fill(ctx, '#b9a4e8', r, [9, 7, 46, 46]); CR.stroke(ctx, r, 2.8);
      CR.blob(ctx, 25, 22, 7, 5, r, 0.08, 12); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.05) {
        const rad = 2 + t * 12, a = t * Math.PI * 3;
        const x = 34 + Math.cos(a) * rad, y = 33 + Math.sin(a) * rad * 0.8;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      CR.stroke(ctx, r, 2.2, '#6a4fb8');
    }),
    // 冰晶
    ice: () => fxCanvas(60, 70, 27, (ctx, r) => {
      [[18, 66, 6, 30, -0.25], [32, 68, 9, 50, 0], [46, 66, 6, 34, 0.3]].forEach(([x, y, w, h, a]) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.7); ctx.lineTo(0, -h); ctx.lineTo(w, -h * 0.7); ctx.lineTo(w, 0); ctx.closePath();
        CR.fill(ctx, '#bfe6ff', r, null); CR.stroke(ctx, r, 2.4, '#2f5f8f');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-w * 0.5, -h * 0.65, w * 0.4, h * 0.45);
        ctx.restore();
      });
    }),
    // 暴雨彈：一大顆水滴
    drop: () => fxCanvas(50, 66, 28, (ctx, r) => {
      ctx.beginPath(); ctx.moveTo(25, 3); ctx.quadraticCurveTo(46, 32, 44, 44); ctx.quadraticCurveTo(42, 63, 25, 63);
      ctx.quadraticCurveTo(8, 63, 6, 44); ctx.quadraticCurveTo(4, 32, 25, 3); ctx.closePath();
      CR.fill(ctx, '#7fb2e5', r, [4, 3, 42, 60]); CR.stroke(ctx, r, 2.8);
      CR.blob(ctx, 17, 42, 4, 7, r, 0.08, 10); ctx.fillStyle = '#ffffff'; ctx.fill();
    }),
    // 煮麵的小鍋子
    pot: () => fxCanvas(44, 34, 31, (ctx, r) => {
      CR.blob(ctx, 22, 20, 16, 10, r, 0.05); CR.fill(ctx, '#ff7a2f', r, [6, 10, 32, 20]); CR.stroke(ctx, r, 2.4);
      CR.blob(ctx, 22, 14, 14, 4, r, 0.05); CR.fill(ctx, '#f2c14e', r, null); CR.stroke(ctx, r, 1.8);
      CR.line(ctx, 6, 16, 1, 13, r, 2.4); CR.line(ctx, 38, 16, 43, 13, r, 2.4);
    }),
    // 小星星（命中、溜冰的亮晶晶）
    star: () => fxCanvas(30, 30, 29, (ctx, r) => {
      ctx.translate(15, 15); ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 5 : 13; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); CR.fill(ctx, '#ffd23f', r, null); CR.stroke(ctx, r, 2);
    }),
    // 防禦增益的小盾牌
    shield: () => fxCanvas(36, 40, 30, (ctx, r) => {
      ctx.beginPath(); ctx.moveTo(18, 3); ctx.lineTo(33, 8); ctx.quadraticCurveTo(33, 30, 18, 37); ctx.quadraticCurveTo(3, 30, 3, 8); ctx.closePath();
      CR.fill(ctx, '#4f7cc2', r, null); CR.stroke(ctx, r, 2.4);
      ctx.beginPath(); ctx.moveTo(18, 9); ctx.lineTo(27, 12); ctx.quadraticCurveTo(27, 26, 18, 31); ctx.closePath();
      ctx.fillStyle = '#86a8dd'; ctx.fill();
    }),
    // 隱藏蛋糕：兩層草莓鮮奶油蛋糕＋蠟燭（畫成兩倍大，顯示時縮小）
    cake: () => fxCanvas(96, 96, 41, (ctx, r) => {
      ctx.scale(2, 2);
      CR.blob(ctx, 24, 42, 21, 4, r, 0.05); CR.fill(ctx, '#d6dae1', r, null); CR.stroke(ctx, r, 2.2);
      CR.rect(ctx, 7, 26, 34, 15, r, 0.8); CR.fill(ctx, '#fbf3e4', r, [7, 26, 34, 15]); CR.stroke(ctx, r, 2.4);
      CR.rect(ctx, 13, 15, 22, 12, r, 0.8); CR.fill(ctx, '#f7c6d4', r, [13, 15, 22, 12]); CR.stroke(ctx, r, 2.4);
      for (let x = 9; x < 41; x += 5) { CR.blob(ctx, x + 1, 27, 3, 2.4, r, 0.1, 10); CR.fill(ctx, '#ffffff', r, null); }
      [[11, 33], [20, 35], [29, 33], [37, 35]].forEach(([x, y]) => { CR.blob(ctx, x, y, 2.6, 2.4, r, 0.1, 10); CR.fill(ctx, '#e8384f', r, null); CR.stroke(ctx, r, 1.2); });
      [[18, '#4f7cc2'], [24, '#ffd23f'], [30, '#6baf7b']].forEach(([x, c]) => {
        CR.rect(ctx, x - 1.4, 7, 2.8, 8, r, 0.3); CR.fill(ctx, c, r, null); CR.stroke(ctx, r, 1.2);
        CR.blob(ctx, x, 4, 1.8, 3, r, 0.1, 10); CR.fill(ctx, '#ff7a2f', r, null);
        CR.blob(ctx, x, 4.6, 0.8, 1.4, r, 0.1, 8); CR.fill(ctx, '#ffd23f', r, null);
      });
    }),
    // 慶祝帽：條紋三角帽＋頂上的毛球
    partyhat: () => fxCanvas(64, 76, 42, (ctx, r) => {
      ctx.scale(2, 2);
      const path = () => { ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(29, 34); ctx.quadraticCurveTo(16, 38, 3, 34); ctx.closePath(); };
      path(); CR.fill(ctx, '#ff6b81', r, null);
      ctx.save(); path(); ctx.clip();
      [[10, '#ffd23f'], [20, '#7fb2e5'], [30, '#ffd23f']].forEach(([y, c]) => CR.line(ctx, 0, y + 6, 32, y - 4, r, 3.4, c, 0.3));
      ctx.restore();
      path(); CR.stroke(ctx, r, 2.2);
      CR.blob(ctx, 16, 4, 4, 4, r, 0.15, 12); CR.fill(ctx, '#ffffff', r, null); CR.stroke(ctx, r, 1.6);
    }),
  };

  // NPC 和小怪：用一般人物的畫法，再加上手上的道具（畫布比人物寬一點）
  function drawNpc(p, prop) {
    const c = document.createElement('canvas');
    c.width = 96 * 2; c.height = 84 * 2;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    ctx.save(); ctx.translate(16, 4); AV.drawAvatar(ctx, p); ctx.restore();
    const r = CR.rng(prop === 'sign' ? 41 : 42);
    if (prop === 'folder') {
      // 抱著一疊資料夾
      [['#4f7cc2', 0], ['#ff7a2f', -3], ['#f2c14e', -6]].forEach(([col, dy]) => {
        CR.rect(ctx, 48, 56 + dy, 20, 13, r, 0.6); CR.fill(ctx, col, r, null); CR.stroke(ctx, r, 2);
      });
      ctx.fillStyle = '#ffffff'; ctx.fillRect(52, 52, 12, 3);
      ctx.fillStyle = CR.INK; ctx.font = '900 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('資料', 58, 64);
    } else if (prop === 'sign') {
      // 舉著「小心」的警告牌
      CR.line(ctx, 78, 30, 76, 66, r, 2.6, '#8a5a3a', 0.4);
      ctx.beginPath(); ctx.moveTo(78, 6); ctx.lineTo(92, 30); ctx.lineTo(64, 30); ctx.closePath();
      CR.fill(ctx, '#ffd23f', r, null); CR.stroke(ctx, r, 2.4);
      ctx.fillStyle = CR.INK; ctx.font = '900 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', 78, 27);
      CR.rect(ctx, 64, 32, 28, 11, r, 0.6); CR.fill(ctx, '#ffffff', r, null); CR.stroke(ctx, r, 2);
      ctx.fillStyle = '#e8384f'; ctx.font = '900 8px sans-serif'; ctx.fillText('小心', 78, 40.5);
    }
    return c;
  }

  // 慶祝煙火：把文字畫在小畫布上，取樣成一顆顆火花的位置
  function textPoints(text, max) {
    const size = 64;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = `900 ${size}px ${FONT}`;
    c.width = Math.ceil(ctx.measureText(text).width) + 8; c.height = size + 16;
    ctx.font = `900 ${size}px ${FONT}`;
    ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText(text, 4, c.height / 2);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let step = 3, pts = [];
    do {
      pts = [];
      for (let y = 0; y < c.height; y += step) {
        for (let x = 0; x < c.width; x += step) if (data[(y * c.width + x) * 4 + 3] > 128) pts.push([x - c.width / 2, y - c.height / 2]);
      }
      step++;
    } while (pts.length > max && step < 12);
    return { pts, w: c.width };
  }

  // ---------------- 畫地圖（蠟筆手繪風） ----------------
  function drawMap() {
    const c = document.createElement('canvas');
    c.width = MAP.W * T; c.height = MAP.H * T;
    const ctx = c.getContext('2d');
    const at = (x, y) => (x < 0 || y < 0 || x >= MAP.W || y >= MAP.H ? ' ' : MAP.tiles[y][x]);
    const inVideo = (x, y) => y >= 4 && y <= 13 && x >= 21 && x <= 34;
    const kitchen = MAP.ROOMS.find(rm => rm.id === 'kitchen');
    const inKitchen = (x, y) => x >= kitchen.x1 && x <= kitchen.x2 && y >= kitchen.y1 && y <= kitchen.y2;
    const floorOf = (ch, x, y) => {
      if (y > 30 && ':T~'.includes(ch)) return 'mud';
      if (',T~BF'.includes(ch)) return 'grass';
      if (ch === '#') return 'wall';
      if (inKitchen(x, y)) return 'tile';
      return inVideo(x, y) ? 'carpet' : 'wood';
    };

    // 1. 地板
    for (let y = 0; y < MAP.H; y++) {
      for (let x = 0; x < MAP.W; x++) {
        const ch = at(x, y), px = x * T, py = y * T;
        const r = CR.rng(x * 7919 + y * 104729 + 1);
        const base = floorOf(ch, x, y);
        if (base === 'grass') {
          ctx.fillStyle = (x * 3 + y) % 5 ? '#a9d18e' : '#a2cc88'; ctx.fillRect(px, py, T, T);
          CR.dots(ctx, px, py, T, T, 6, 'rgba(255,255,255,0.45)', r, 2.2);
          for (let i = 0; i < 2; i++) {
            const gx = px + 6 + r() * (T - 12), gy = py + 8 + r() * (T - 14);
            CR.line(ctx, gx, gy, gx - 2, gy - 6, r, 1.6, '#6f9c5c', 0.6);
            CR.line(ctx, gx + 3, gy, gx + 4, gy - 5, r, 1.6, '#6f9c5c', 0.6);
          }
        } else if (base === 'mud') {
          ctx.fillStyle = (x + y) % 2 ? '#8494aa' : '#7f8fa5'; ctx.fillRect(px, py, T, T);
          CR.dots(ctx, px, py, T, T, 4, 'rgba(255,255,255,0.5)', r, 2);
          CR.dots(ctx, px, py, T, T, 1, 'rgba(47,59,85,0.3)', r, 3);
        } else if (base === 'carpet') {
          ctx.fillStyle = '#bcd4ea'; ctx.fillRect(px, py, T, T);
          CR.plaid(ctx, px, py, T, T, 24, 'rgba(255,255,255,0.85)', r, 2.2);
          CR.plaid(ctx, px + 12, py + 12, T, T, 24, 'rgba(79,124,194,0.2)', r, 1.2);
        } else if (base === 'tile') {
          // 廚房的白藍磁磚
          ctx.fillStyle = '#f2f4f8'; ctx.fillRect(px, py, T, T);
          ctx.fillStyle = '#d3e0f2';
          ctx.fillRect(px, py, T / 2, T / 2); ctx.fillRect(px + T / 2, py + T / 2, T / 2, T / 2);
          CR.plaid(ctx, px, py, T, T, 24, 'rgba(79,124,194,0.35)', r, 1.2);
        } else if (base === 'wood') {
          ctx.fillStyle = '#f5ecd9'; ctx.fillRect(px, py, T, T);
          CR.plaid(ctx, px, py, T, T, 24, 'rgba(255,122,47,0.18)', r, 2.4);
          CR.plaid(ctx, px + 12, py + 12, T, T, 24, 'rgba(255,255,255,0.9)', r, 1.4);
        }
      }
    }

    // 2. 物件
    for (let y = 0; y < MAP.H; y++) {
      for (let x = 0; x < MAP.W; x++) {
        const ch = at(x, y), px = x * T, py = y * T;
        const r = CR.rng(x * 15485863 + y * 32452843 + 7);
        if (ch === '#') {
          ctx.fillStyle = '#c3c9d3'; ctx.fillRect(px, py, T, T);
          if (at(x, y - 1) !== '#') { ctx.fillStyle = '#dfe3ea'; ctx.fillRect(px, py, T, T * 0.4); }
          CR.dots(ctx, px, py, T, T, 10, 'rgba(255,255,255,0.4)', r, 1.6);
          // 只在牆的外緣描邊，看起來是一整片手畫的牆
          if (at(x, y - 1) !== '#') CR.line(ctx, px - 1, py, px + T + 1, py, r, 3);
          if (at(x, y + 1) !== '#') CR.line(ctx, px - 1, py + T, px + T + 1, py + T, r, 3);
          if (at(x - 1, y) !== '#') CR.line(ctx, px, py - 1, px, py + T + 1, r, 3);
          if (at(x + 1, y) !== '#') CR.line(ctx, px + T, py - 1, px + T, py + T + 1, r, 3);
        } else if (ch === '=') {
          // 門口的腳踏墊
          CR.rect(ctx, px + 5, py + 10, T - 10, T - 20, r, 1.5); CR.fill(ctx, '#2f3b55', r, [px, py + 10, T, T - 20]);
          CR.dots(ctx, px + 6, py + 12, T - 12, T - 24, 6, 'rgba(255,255,255,0.5)', r, 1.6);
          CR.rect(ctx, px + 5, py + 10, T - 10, T - 20, r, 1.5); CR.stroke(ctx, r, 2.2);
        } else if (ch === 'F') {
          CR.line(ctx, px - 2, py + 18, px + T + 2, py + 18, r, 3);
          CR.line(ctx, px - 2, py + 32, px + T + 2, py + 32, r, 3);
          [6, 28].forEach(dx => {
            CR.rect(ctx, px + dx, py + 6, 11, 34, r, 1.2); CR.fill(ctx, '#ff7a2f', r, [px + dx, py + 6, 11, 34]);
            CR.rect(ctx, px + dx, py + 6, 11, 34, r, 1.2); CR.stroke(ctx, r, 2.4);
          });
        } else if (ch === '~') {
          CR.blob(ctx, px + 24, py + 26, 21, 13, r, 0.1); CR.fill(ctx, '#7fb2e5', r, [px, py + 12, T, 28]); CR.stroke(ctx, r, 2.2, '#2f3b55');
          CR.line(ctx, px + 13, py + 22, px + 22, py + 20, r, 2.2, '#ffffff', 0.5);
        } else if (ch === 'T') {
          ctx.fillStyle = 'rgba(19,26,40,0.16)'; ctx.beginPath(); ctx.ellipse(px + 24, py + 44, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
          CR.rect(ctx, px + 18, py + 26, 12, 18, r, 1); CR.fill(ctx, '#2f6b45', r, null);
          CR.plaid(ctx, px + 18, py + 26, 12, 18, 6, 'rgba(255,255,255,0.4)', r, 1);
          CR.rect(ctx, px + 18, py + 26, 12, 18, r, 1); CR.stroke(ctx, r, 2.2);
          CR.blob(ctx, px + 24, py + 16, 20, 18, r, 0.08); CR.fill(ctx, '#bfe0a4', r, [px + 4, py - 2, 40, 36]);
          ctx.save(); CR.blob(ctx, px + 24, py + 16, 20, 18, CR.rng(x + y), 0.08); ctx.clip();
          CR.plaid(ctx, px + 2, py - 4, 44, 40, 7, 'rgba(255,255,255,0.8)', r, 1.4); ctx.restore();
          // 點點虛線外框，像插畫裡的樹
          ctx.save(); ctx.setLineDash([2, 5]);
          CR.blob(ctx, px + 24, py + 16, 20, 18, CR.rng(x + y), 0.08); CR.stroke(ctx, r, 3.2, '#2f6b45'); ctx.restore();
        } else if (ch === 'B') {
          [[12, 34], [36, 34], [24, 20]].forEach(([dx, dy]) => {
            CR.blob(ctx, px + dx, py + dy, 12, 8, r, 0.1, 14); CR.fill(ctx, '#e8d6ae', r, [px + dx - 12, py + dy - 8, 24, 16]); CR.stroke(ctx, r, 2.2);
          });
        } else if (ch === 'K') {
          // 像俄羅斯方塊的橘色箱子
          CR.rect(ctx, px + 3, py + 3, T - 6, T - 6, r, 1.2); CR.fill(ctx, '#ff8a3d', r, [px, py, T, T], 1.3);
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(px + 6, py + 6, T - 12, 6);
          CR.line(ctx, px + T / 2, py + 5, px + T / 2, py + T - 5, r, 1.8, 'rgba(43,42,51,0.6)');
          CR.line(ctx, px + 5, py + T / 2, px + T - 5, py + T / 2, r, 1.8, 'rgba(43,42,51,0.6)');
          CR.rect(ctx, px + 3, py + 3, T - 6, T - 6, r, 1.2); CR.stroke(ctx, r, 2.6);
        } else if (ch === 'M') {
          ctx.fillStyle = '#b98457'; ctx.fillRect(px, py + 3, T, T - 6);
          ctx.fillStyle = '#cf9a6a'; ctx.fillRect(px, py + 3, T, 9);
          CR.dots(ctx, px, py + 3, T, T - 6, 6, 'rgba(255,255,255,0.3)', r, 1.6);
          if (at(x, y - 1) !== 'M') CR.line(ctx, px - 1, py + 3, px + T + 1, py + 3, r, 2.6);
          if (at(x, y + 1) !== 'M') CR.line(ctx, px - 1, py + T - 3, px + T + 1, py + T - 3, r, 2.6);
          if (at(x - 1, y) !== 'M') CR.line(ctx, px, py + 2, px, py + T - 2, r, 2.6);
          if (at(x + 1, y) !== 'M') CR.line(ctx, px + T, py + 2, px + T, py + T - 2, r, 2.6);
        } else if (ch === 'P') {
          CR.rect(ctx, px + 3, py + 4, T - 6, T - 12, r, 1); CR.fill(ctx, '#2f3b55', r, null); CR.stroke(ctx, r, 2.4);
          CR.rect(ctx, px + 8, py + 9, T - 16, T - 22, r, 1); CR.fill(ctx, '#3e6f8f', r, null);
          ctx.save(); ctx.beginPath(); ctx.arc(px + 24, py + 19, 7, 0.3, 5.2);
          CR.stroke(ctx, r, 2.4, '#ff7a2f'); ctx.restore();
        } else if (ch === 'G') {
          // 爐台：銀色檯面 + 瓦斯爐 + 小鍋子
          CR.rect(ctx, px + 1, py + 4, T - 2, T - 8, r, 1); CR.fill(ctx, '#c3c9d3', r, [px, py + 4, T, T - 8]);
          if (at(x - 1, y) !== 'G') CR.line(ctx, px + 1, py + 4, px + 1, py + T - 4, r, 2.6);
          if (at(x + 1, y) !== 'G') CR.line(ctx, px + T - 1, py + 4, px + T - 1, py + T - 4, r, 2.6);
          CR.line(ctx, px - 1, py + 4, px + T + 1, py + 4, r, 2.6);
          CR.line(ctx, px - 1, py + T - 4, px + T + 1, py + T - 4, r, 2.6);
          ctx.beginPath(); ctx.arc(px + 24, py + 24, 12, 0, Math.PI * 2); CR.fill(ctx, '#2f3b55', r, null); CR.stroke(ctx, r, 2);
          ctx.beginPath(); ctx.arc(px + 24, py + 24, 6, 0, Math.PI * 2); CR.stroke(ctx, r, 2, '#ff7a2f');
          if (x % 2) {
            CR.blob(ctx, px + 24, py + 20, 13, 8, r, 0.06); CR.fill(ctx, '#ff7a2f', r, null); CR.stroke(ctx, r, 2.4);
            CR.line(ctx, px + 8, py + 18, px + 2, py + 15, r, 2.4);
          }
        } else if (ch === 'W') {
          // 戰情室的電視牆：颱風路徑圖、雷達、新聞
          CR.rect(ctx, px + 2, py + 2, T - 4, T - 10, r, 0.8); CR.fill(ctx, '#2b2a33', r, null); CR.stroke(ctx, r, 2.4);
          CR.rect(ctx, px + 6, py + 6, T - 12, T - 18, r, 0.6);
          const kind = x % 3;
          CR.fill(ctx, kind === 0 ? '#3e6f8f' : kind === 1 ? '#2f5f4f' : '#4f7cc2', r, null);
          ctx.save();
          if (kind === 0) {
            ctx.beginPath(); ctx.arc(px + 24, py + 19, 7, 0.3, 5.2); CR.stroke(ctx, r, 2.4, '#ff7a2f');
            CR.line(ctx, px + 10, py + 30, px + 22, py + 22, r, 1.4, '#ffd23f', 0.3);
          } else if (kind === 1) {
            ctx.strokeStyle = '#7be08f'; ctx.lineWidth = 1.2;
            [6, 11].forEach(rr => { ctx.beginPath(); ctx.arc(px + 24, py + 19, rr, 0, Math.PI * 2); ctx.stroke(); });
            ctx.beginPath(); ctx.moveTo(px + 24, py + 19); ctx.lineTo(px + 33, py + 13); ctx.stroke();
          } else {
            ctx.fillStyle = '#ffffff'; ctx.fillRect(px + 9, py + 10, 30, 4);
            ctx.fillStyle = '#ff6a13'; ctx.fillRect(px + 9, py + 24, 30, 5);
          }
          ctx.restore();
          CR.line(ctx, px + 18, py + T - 8, px + 30, py + T - 8, r, 2.4);
        } else if (ch === 'C') {
          // 會議椅：靠背朝桌子的反方向
          const up = at(x, y + 1) === 'M';
          CR.blob(ctx, px + 24, py + 26, 13, 10, r, 0.06); CR.fill(ctx, '#2f3b55', r, null); CR.stroke(ctx, r, 2.2);
          CR.rect(ctx, px + 12, up ? py + 6 : py + 34, 24, 8, r, 0.8); CR.fill(ctx, '#4f7cc2', r, null); CR.stroke(ctx, r, 2.2);
        } else if (ch === 'R') {
          // 冰箱（看起來就是一台普通的冰箱）
          CR.rect(ctx, px + 6, py - 14, T - 12, T + 10, r, 0.8); CR.fill(ctx, '#e8edf3', r, [px + 6, py - 14, T - 12, T + 10]); CR.stroke(ctx, r, 2.4);
          CR.line(ctx, px + 7, py + 6, px + T - 7, py + 6, r, 2.2);
          CR.line(ctx, px + T - 13, py - 8, px + T - 13, py + 1, r, 2.6, '#9aa3b5');
          CR.line(ctx, px + T - 13, py + 12, px + T - 13, py + 24, r, 2.6, '#9aa3b5');
          CR.blob(ctx, px + 16, py - 4, 4, 4, r, 0.15, 10); CR.fill(ctx, '#ff7a2f', r, null); CR.stroke(ctx, r, 1.4);
        } else if (ch === 'N') {
          // 轉職導師腳下的星星地毯
          CR.blob(ctx, px + 24, py + 30, 26, 15, r, 0.06); CR.fill(ctx, '#6a4fb8', r, [px - 2, py + 15, T + 4, 30]); CR.stroke(ctx, r, 2.4);
          CR.dots(ctx, px + 4, py + 20, T - 8, 20, 6, '#ffd23f', r, 1.8);
        } else if (ch === 'S') {
          CR.rect(ctx, px + 1, py + 6, T - 2, T - 12, r, 1.2); CR.fill(ctx, '#4f7cc2', r, [px, py + 6, T, T - 12], 1.2);
          CR.rect(ctx, px + 5, py + 10, T - 10, 12, r, 1); CR.fill(ctx, '#86a8dd', r, null);
          if (at(x - 1, y) !== 'S') CR.line(ctx, px + 1, py + 6, px + 1, py + T - 6, r, 2.6);
          if (at(x + 1, y) !== 'S') CR.line(ctx, px + T - 1, py + 6, px + T - 1, py + T - 6, r, 2.6);
          CR.line(ctx, px - 1, py + 6, px + T + 1, py + 6, r, 2.6);
          CR.line(ctx, px - 1, py + T - 6, px + T + 1, py + T - 6, r, 2.6);
        }
      }
    }

    // 3. 物資箱上貼一張畫著內容物的貼紙
    ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    MAP.CRATES.forEach((cr, i) => {
      const r = CR.rng(i + 99);
      const cx = ((cr.x1 + cr.x2 + 1) / 2) * T, cy = ((cr.y1 + cr.y2 + 1) / 2) * T;
      CR.blob(ctx, cx, cy, 17, 17, r, 0.06); CR.fill(ctx, '#fafaf7', r, null); CR.stroke(ctx, r, 2.4);
      ctx.fillText(cr.item ? MAP.ITEMS[cr.item].icon : '❓', cx, cy + 1);
    });
    ctx.textBaseline = 'alphabetic';
    return c;
  }

  // ---------------- Phaser 場景 ----------------
  class HQScene extends Phaser.Scene {
    constructor() { super('hq'); this.remotes = new Map(); this.drops = []; this.told = {}; }

    create() {
      this.textures.addCanvas('map', drawMap());
      this.add.image(0, 0, 'map').setOrigin(0).setDepth(-10);
      this.cameras.main.setBounds(0, 0, MAP.W * T, MAP.H * T);
      this.cameras.main.setBackgroundColor('#131a28');
      this.applyZoom();
      this.scale.on('resize', () => this.applyZoom());

      const kb = this.input.keyboard;
      this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false);
      // 空白鍵 / J：敲箱子或打颱風（按住會因為鍵盤連發而連打）
      const onAct = (e) => { if (!typing()) { e.preventDefault(); this.doAction(); } };
      kb.on('keydown-SPACE', onAct);
      kb.on('keydown-J', onAct);
      // K：職業的招牌技能（花魔力）
      kb.on('keydown-K', (e) => { if (!typing()) { e.preventDefault(); this.useSkill(special()); } });
      // 右鍵點人物（手機長按）可以看個人資料
      this.input.mouse.disableContextMenu();
      this.input.on('pointerup', () => { if (this.pressTimer) { this.pressTimer.remove(); this.pressTimer = null; } });
      this.input.on('pointerdown', (p) => {
        if (!this.me) return;
        chatInput.blur();
        hideMenu();
        const who = this.playerAt(p.worldX, p.worldY);
        if (p.rightButtonDown()) { if (who) showMenu(who, p.event.clientX, p.event.clientY); return; }
        if (who && p.wasTouch) {
          this.pressTimer = this.time.delayedCall(550, () => { this.target = null; showMenu(who, p.event.clientX || p.x, p.event.clientY || p.y); });
        }
        // 點到颱風或箱子、而且夠近，就直接打；否則走過去
        const act = this.actionAt(p.worldX, p.worldY);
        if (act) { this.doAction(act); return; }
        this.target = { x: p.worldX, y: p.worldY };
      });

      // 颱風怪物
      this.textures.addCanvas('typhoon-cloud', drawTyphoonCloud());
      this.textures.addCanvas('typhoon', drawTyphoonSwirl());
      this.textures.addCanvas('typhoon-face', drawTyphoonFace('normal'));
      this.textures.addCanvas('typhoon-face-hit', drawTyphoonFace('hit'));
      const crate = document.createElement('canvas');
      crate.width = T; crate.height = T;
      const cc = crate.getContext('2d');
      cc.fillStyle = '#c28b52'; cc.fillRect(4, 4, T - 8, T - 8);
      cc.strokeStyle = '#8f5f30'; cc.lineWidth = 3; cc.strokeRect(4, 4, T - 8, T - 8);
      cc.beginPath(); cc.moveTo(4, 4); cc.lineTo(T - 4, T - 4); cc.moveTo(T - 4, 4); cc.lineTo(4, T - 4); cc.stroke();
      this.textures.addCanvas('crate', crate);
      // 被拿空的箱子：打開的紙箱
      const empty = document.createElement('canvas');
      empty.width = T; empty.height = T;
      const ec = empty.getContext('2d'), er = CR.rng(3);
      ec.fillStyle = '#f5ecd9'; ec.fillRect(0, 0, T, T);
      CR.rect(ec, 6, 14, T - 12, T - 18, er, 1); CR.fill(ec, '#b9845a', er, null); CR.stroke(ec, er, 2.4);
      CR.rect(ec, 10, 18, T - 20, T - 30, er, 1); CR.fill(ec, '#6b4a32', er, null);
      [[6, 14, 0, 4], [T - 6, 14, T, 4]].forEach(([x1, y1, x2, y2]) => {
        ec.beginPath(); ec.moveTo(x1, y1); ec.lineTo(x2, y2); ec.lineTo(x2 + (x1 < 20 ? 12 : -12), y2 + 2); ec.lineTo(x1 + (x1 < 20 ? 14 : -14), y1);
        ec.closePath(); CR.fill(ec, '#cf9a6a', er, null); CR.stroke(ec, er, 2);
      });
      this.textures.addCanvas('crate-empty', empty);
      this.textures.addCanvas('bolt', drawBolt());
      Object.entries(FX).forEach(([k, f]) => this.textures.addCanvas('fx-' + k, f()));
      // 大閃電（落雷用）
      const big = drawBolt();
      this.textures.addCanvas('bolt-big', big);

      // 指揮中心的轉職資料沈理員：短髮、眼鏡、鬍渣、深藍西裝，抱著一疊資料夾
      this.textures.addCanvas('mentor', drawNpc({ hair: 'short', hairColor: '#2b2a33', skin: AV.SKINS[1], glasses: '1',
        cls: 'suit', suit: '#2f3b55', tie: '#4f7cc2', npc: 'shen' }, 'folder'));
      // 野外小怪
      this.textures.addCanvas('mob-chiang', drawNpc({ hair: 'short', hairColor: '#2b2a33', skin: AV.SKINS[0], glasses: '0',
        cls: 'suit', suit: '#2f3b55', tie: '#e8384f', npc: 'chiang' }));
      this.textures.addCanvas('mob-hsu', drawNpc({ hair: 'long', hairColor: '#3a2a26', skin: AV.SKINS[0], glasses: '0',
        cls: 'suit', suit: '#f2f4f8', tie: '#f2f4f8', npc: 'hsu' }, 'sign'));
      this.mobs = new Map();
      const mx = MAP.mentor.x, my = MAP.mentor.y + 18;
      this.add.image(mx, my, 'mentor').setScale(0.55).setOrigin(0.5, 0.95).setDepth(my);
      this.add.text(mx, my - 92, '📂 轉職資料沈理員', {
        fontSize: '14px', fontStyle: 'bold', color: '#ffd23f', fontFamily: FONT,
        backgroundColor: 'rgba(19,26,40,0.85)', padding: { x: 7, y: 2 },
      }).setOrigin(0.5).setDepth(my);
      const talk = this.add.text(mx + 26, my - 66, '💬', { fontSize: '22px' }).setOrigin(0.5).setDepth(my + 1);
      this.tweens.add({ targets: talk, y: my - 74, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

      // 煙火的火花統一畫在一張 graphics 上
      this.sparks = [];
      this.fw = this.add.graphics().setDepth(3000);
      this.emptyCrates = new Map();

      const Z = MAP.MONSTER_ZONE;
      // 容器原點在颱風腳底；body 會上下彈跳
      this.mSwirl = this.add.image(0, -6, 'typhoon').setScale(1.1, 0.32).setAlpha(0.5);
      this.mBody = this.add.image(0, 0, 'typhoon-cloud').setOrigin(0.5, 200 / 240);
      this.mFace = this.add.image(0, -100, 'typhoon-face');
      this.mBar = this.add.graphics();
      // 楓之谷風格：名牌掛在怪物腳下
      this.mName = this.add.text(0, 22, `Lv.${ST.MONSTER.level} ${ST.MONSTER.name}`, {
        fontSize: '14px', fontStyle: 'bold', color: '#ffd23f', fontFamily: FONT,
        backgroundColor: 'rgba(19,26,40,0.85)', padding: { x: 8, y: 2 },
      }).setOrigin(0.5, 0);
      // 被冰凍、被削弱時腳下的冰晶和狀態文字
      this.mIce = this.add.image(0, 4, 'fx-ice').setOrigin(0.5, 1).setScale(2.4, 1.6).setVisible(false);
      this.mStatus = this.add.text(0, 46, '', {
        fontSize: '13px', fontStyle: 'bold', color: '#ffffff', fontFamily: FONT,
        backgroundColor: 'rgba(79,124,194,0.9)', padding: { x: 6, y: 2 },
      }).setOrigin(0.5, 0).setVisible(false);
      this.monster = this.add.container((Z.x1 + Z.x2) / 2, (Z.y1 + Z.y2) / 2,
        [this.mSwirl, this.mBody, this.mFace, this.mIce, this.mBar, this.mName, this.mStatus]);
      this.frozenUntil = 0; this.weakUntil = 0;
      this.dmgStack = 0;
      document.querySelector('#boss .boss-lv').textContent = 'Lv.' + ST.MONSTER.level;
      document.querySelector('#boss .boss-lv').nextSibling.textContent = ' ' + ST.MONSTER.name + ' ';
      this.monster.tx = this.monster.x; this.monster.ty = this.monster.y;
      this.mState = { alive: true, hp: 1, maxHp: 1 };
      this.mDead = this.add.text((Z.x1 + Z.x2) / 2, (Z.y1 + Z.y2) / 2, '', {
        fontSize: '22px', fontStyle: 'bold', color: '#3a3a3c', fontFamily: FONT, align: 'center',
        backgroundColor: 'rgba(250,250,247,0.92)', padding: { x: 18, y: 12 },
      }).setOrigin(0.5).setDepth(900).setVisible(false);
      // 颱風身邊三不五時劈出小閃電
      this.time.addEvent({ delay: 900, loop: true, callback: () => {
        if (!this.monster.visible || Math.random() < 0.4) return;
        const a = Math.random() * Math.PI * 2;
        const b = this.add.image(this.monster.x + Math.cos(a) * 110, this.monster.y + Math.sin(a) * 90, 'bolt')
          .setDepth(this.monster.depth + 1).setAngle((Math.random() - 0.5) * 40);
        this.tweens.add({ targets: b, alpha: { from: 1, to: 0 }, duration: 380, onComplete: () => b.destroy() });
      } });

      // 雨
      this.rain = this.add.graphics().setScrollFactor(0).setDepth(1000);
      for (let i = 0; i < 160; i++) this.drops.push(this.newDrop(true));
      // 閃電
      this.flash = this.add.rectangle(0, 0, 10, 10, 0xffffff).setOrigin(0).setScrollFactor(0)
        .setDepth(1001).setAlpha(0);
      this.scheduleLightning();

      this.lastSent = 0;
      scene = this;
      pending.splice(0).forEach(f => f());
    }

    applyZoom() {
      const small = Math.min(this.scale.width, this.scale.height) < 600;
      this.cameras.main.setZoom(small ? 0.75 : 1);
    }

    newDrop(anywhere) {
      const w = this.scale.width, h = this.scale.height;
      return { x: Math.random() * (w + 200), y: anywhere ? Math.random() * h : -20, len: 10 + Math.random() * 14,
        v: 600 + Math.random() * 400 };
    }

    scheduleLightning() {
      this.time.delayedCall(12000 + Math.random() * 20000, () => {
        this.flash.setSize(this.scale.width, this.scale.height);
        this.tweens.add({ targets: this.flash, alpha: { from: 0.7, to: 0 }, duration: 450, ease: 'Quad.out' });
        this.cameras.main.shake(200, 0.003);
        this.scheduleLightning();
      });
    }

    makeAvatar(p) {
      const key = this.avatarKey(p);
      const body = this.add.image(0, 0, key).setScale(0.5).setOrigin(0.5, AV_ORIGIN_Y);
      const tag = this.add.text(0, -84, this.tagText(p), {
        fontSize: '14px', fontStyle: 'bold', color: '#f2f4f8', fontFamily: FONT,
        backgroundColor: 'rgba(19,26,40,0.85)', padding: { x: 7, y: 2 },
      }).setOrigin(0.5);
      const bar = this.add.graphics();
      const cont = this.add.container(p.x, p.y, [body, tag, bar]);
      cont.body_ = body;
      cont.bar = bar;
      cont.tag = tag;
      cont.name_ = p.name;
      cont.pid = p.id;
      cont.look = { hair: p.hair, hairColor: p.hairColor, skin: p.skin, outfit: p.outfit, glasses: p.glasses, equip: p.equip || {} };
      cont.texKey = key;
      cont.cakeUntil = 0; cont.hatUntil = 0;
      this.applyGlow(cont);
      if (p.cakeMs > 0) this.onCake(p.id, p.cakeMs, cont);
      this.drawHpBar(cont, p);
      cont.dir = p.dir || 1;
      cont.moving = !!p.moving;
      cont.tx = p.x; cont.ty = p.y;
      body.setFlipX(cont.dir === -1);
      return cont;
    }

    // 外觀＋職業服裝的貼圖，第一次用到才畫
    avatarKey(p) {
      const eq = p.equip || {};
      const gear = Object.keys(GR.SLOTS).map(s => eq[s] || '').join('.');
      const key = `av-${p.hair}-${p.hairColor}-${p.skin}-${p.outfit}-${p.glasses}-${p.cls || 'staff'}-${gear}`;
      if (!this.textures.exists(key)) {
        const c = document.createElement('canvas');
        c.width = FRAME.w * 2; c.height = FRAME.h * 2;
        const ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.translate(FRAME.ox, FRAME.oy); AV.drawAvatar(ctx, p);
        this.textures.addCanvas(key, c);
      }
      return key;
    }

    // 換裝備：重畫貼圖、換光芒
    onGear(g) {
      const who = me && g.id === me.id ? this.me : this.remotes.get(g.id);
      if (!who) return;
      who.look.equip = g.equip || {};
      who.texKey = this.avatarKey(Object.assign({}, who.look, { cls: who.stats ? who.stats.cls : 'staff' }));
      who.body_.setTexture(who.texKey);
      this.applyGlow(who);
      this.burst(who.x, who.y - 40, 8, 0xffffff);
    }

    // SR：一閃一閃的金光；SSR：顏色慢慢流轉的彩虹光，加上一道玻璃般的反光
    applyGlow(c) {
      const img = c.body_;
      if (c.glowTween) { c.glowTween.stop(); c.glowTween = null; }
      c.glowFx = null;
      if (!img.preFX) return; // Canvas 模式沒有特效
      img.preFX.clear();
      const rar = topRarity(c.look.equip);
      if (!rar) return;
      img.preFX.setPadding(8);
      const glow = img.preFX.addGlow(rar === 'SSR' ? 0xffc8f0 : 0xffd23f, 1, 0, false, 0.1, 10);
      c.glowTween = this.tweens.add({ targets: glow, outerStrength: rar === 'SSR' ? 3 : 2.4, duration: rar === 'SSR' ? 1400 : 900,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      if (rar === 'SSR') { c.glowFx = glow; img.preFX.addShine(0.35, 0.25, 4); }
    }

    // 拿蛋糕：手上捧著蛋糕，ms 是 0 就是放下
    onCake(id, ms, who0) {
      const who = who0 || (me && id === me.id ? this.me : this.remotes.get(id));
      if (!who) return;
      who.cakeUntil = ms > 0 ? performance.now() + ms : 0;
      if (ms > 0 && !who.cake) {
        who.cake = this.add.image(0, -6, 'fx-cake').setScale(0.36).setOrigin(0.5, 0.75);
        who.add(who.cake);
        this.burst(who.x, who.y - 40, 12, 0xff6b81);
      } else if (!(ms > 0) && who.cake) { who.cake.destroy(); who.cake = null; }
      // 蛋糕放下了，因為它戴上的帽子也一起拿掉
      if (!(ms > 0)) [this.me, ...this.remotes.values()].forEach(c => { if (c && c.hatBy === id) c.hatUntil = 0; });
      if (who === this.me) $('cake-btn').hidden = !(ms > 0);
    }

    tagText(p) { const c = ST.CLASSES[p.cls] || ST.CLASSES.staff; return `Lv.${p.level || 1} ${c.icon} ${p.name}`; }

    // 世界座標上點到的是哪個人（自己也算）
    playerAt(x, y) {
      let best = null, bd = 34;
      [this.me, ...this.remotes.values()].forEach(c => {
        if (!c) return;
        const d = Math.hypot(x - c.x, y - (c.y - 32));
        if (d < bd) { bd = d; best = c; }
      });
      return best;
    }

    // 名牌上方的小血條
    drawHpBar(c, st) {
      c.stats = st;
      const w = 40, ratio = st.maxHp ? Math.max(0, st.hp) / st.maxHp : 1;
      c.bar.clear();
      c.bar.fillStyle(0x131a28, 0.85); c.bar.fillRoundedRect(-w / 2 - 2, -101, w + 4, 8, 4);
      c.bar.fillStyle(ratio > 0.35 ? 0x6baf7b : 0xff6a13, 1); c.bar.fillRoundedRect(-w / 2, -99, Math.max(2, w * ratio), 4, 2);
      c.body_.setAlpha(st.dead ? 0.45 : 1);
      c.body_.setAngle(st.dead ? 80 : 0);
    }

    onStats(st) {
      const who = me && st.id === me.id ? this.me : this.remotes.get(st.id);
      if (!who) return;
      const prev = who.stats || st;
      if (st.hp < prev.hp) this.floatText(who.x, who.y - 60, '-' + (prev.hp - st.hp), '#ff6a13', 22);
      else if (st.hp > prev.hp && !prev.dead) this.floatText(who.x, who.y - 60, '+' + (st.hp - prev.hp), '#7be08f', 22);
      if (st.cls && st.cls !== prev.cls) {
        who.texKey = this.avatarKey(Object.assign({}, who.look, { cls: st.cls }));
        who.body_.setTexture(who.texKey);
        if (prev.cls) this.burst(who.x, who.y - 40, 10, 0xffd23f);
      }
      if (st.cls !== prev.cls || st.level !== prev.level) who.tag.setText(this.tagText({ cls: st.cls, name: who.name_, level: st.level }));
      this.drawHpBar(who, st);
      // 防禦增益：頭上掛一個小盾牌
      if (st.buffMs > 0) {
        if (!who.shield) { who.shield = this.add.image(26, -70, 'fx-shield').setScale(0.6); who.add(who.shield); }
        who.shieldUntil = performance.now() + st.buffMs;
      }
      if (who === this.me) {
        if (st.dead && !prev.dead) { toast(`你被${ST.MONSTER.name}吹倒了！${ST.RESPAWN_MS / 1000} 秒後回到總部`); this.target = null; }
        renderStats(st);
      }
    }

    // 煮泡麵：最近的爐台冒火、鍋子冒蒸氣
    onCooking(c) {
      const who = me && c.id === me.id ? this.me : this.remotes.get(c.id);
      if (!who) return;
      const t = this.add.text(0, -120, '♨️ 咕嘟咕嘟…', {
        fontSize: '15px', fontStyle: 'bold', color: '#3a3a3c', fontFamily: FONT, backgroundColor: '#ffffff', padding: { x: 8, y: 4 },
      }).setOrigin(0.5);
      who.add(t);
      setTimeout(() => t.destroy(), c.ms);
      let best = null, bd = Infinity;
      const cx = Math.floor(who.x / T), cy = Math.floor(who.y / T);
      for (let ty = cy - 2; ty <= cy + 2; ty++) {
        for (let tx = cx - 2; tx <= cx + 2; tx++) {
          if (!MAP.tiles[ty] || MAP.tiles[ty][tx] !== 'G') continue;
          const d = Math.hypot(who.x - (tx + 0.5) * T, who.y - (ty + 0.5) * T);
          if (d < bd) { bd = d; best = { x: (tx + 0.5) * T, y: (ty + 0.5) * T }; }
        }
      }
      if (!best) return;
      const depth = best.y + T;
      const flames = [-10, 0, 10].map((dx, i) => {
        const f = this.add.image(best.x + dx * 1.4, best.y + 20, 'fx-flame').setOrigin(0.5, 1).setScale(0.8).setDepth(depth);
        this.tweens.add({ targets: f, scaleY: { from: 0.65, to: 1.05 }, scaleX: { from: 0.85, to: 0.7 },
          duration: 120 + i * 30, yoyo: true, repeat: -1 });
        return f;
      });
      const pot = this.add.image(best.x, best.y - 2, 'fx-pot').setDepth(depth + 1);
      this.tweens.add({ targets: pot, y: best.y - 4, duration: 150, yoyo: true, repeat: -1 });
      const steam = this.time.addEvent({ delay: 200, loop: true, callback: () => {
        const sx = best.x + (Math.random() - 0.5) * 18;
        const st = this.add.image(sx, best.y - 14, 'fx-steam').setScale(0.6).setAlpha(0.95).setDepth(depth + 2);
        this.tweens.add({ targets: st, y: best.y - 110, x: sx + (Math.random() - 0.5) * 40, scale: 1.6, alpha: 0,
          duration: 1300, ease: 'Sine.out', onComplete: () => st.destroy() });
      } });
      setTimeout(() => {
        steam.remove();
        flames.forEach(f => { this.tweens.killTweensOf(f); f.destroy(); });
        this.tweens.killTweensOf(pot); pot.destroy();
        this.floatText(best.x, best.y - 50, '🍜 煮好了！', '#ffffff', 18);
      }, c.ms);
    }

    setCrateEmpty(tx, ty, empty) {
      const key = tx + ',' + ty;
      const old = this.emptyCrates.get(key);
      if (old) { old.destroy(); this.emptyCrates.delete(key); }
      if (empty) this.emptyCrates.set(key, this.add.image((tx + 0.5) * T, (ty + 0.5) * T, 'crate-empty').setDepth(-9));
    }

    setupWorld(res) {
      this.remotes.forEach(r => r.destroy());
      this.remotes.clear();
      if (this.me) this.me.destroy();
      this.me = this.makeAvatar(res.you);
      this.cameras.main.startFollow(this.me, true, 0.12, 0.12);
      res.players.forEach(p => { if (p.id !== res.you.id) this.addRemote(p); });
      this.updateOnline();
      this.setMonster(res.monster);
      this.mobs.forEach(m => m.destroy());
      this.mobs.clear();
      (res.mobs || []).forEach(m => this.setMob(m));
      renderInventory(res.you.inv);
      renderStats(res.you);
      this.emptyCrates.forEach(i => i.destroy());
      this.emptyCrates.clear();
      (res.emptyCrates || []).forEach(k => { const [tx, ty] = k.split(',').map(Number); this.setCrateEmpty(tx, ty, true); });
    }

    addRemote(p) {
      if (!this.me || p.id === me.id || this.remotes.has(p.id)) return;
      this.remotes.set(p.id, this.makeAvatar(p));
      this.updateOnline();
    }

    moveRemote(m) {
      // 倒下後被送回總部
      if (me && m.id === me.id) {
        if (m.teleport && this.me) { this.me.x = m.x; this.me.y = m.y; this.target = null; this.push = null; }
        return;
      }
      const r = this.remotes.get(m.id);
      if (!r) return;
      if (m.teleport) { r.x = m.x; r.y = m.y; }
      r.tx = m.x; r.ty = m.y; r.moving = m.moving;
      if (m.dir !== r.dir) { r.dir = m.dir; r.body_.setFlipX(m.dir === -1); }
    }

    removeRemote(id) {
      const r = this.remotes.get(id);
      if (r) { r.destroy(); this.remotes.delete(id); }
      this.updateOnline();
    }

    updateOnline() { $('online').textContent = this.remotes.size + (this.me ? 1 : 0); }

    showBubble(id, text) {
      const who = me && id === me.id ? this.me : this.remotes.get(id);
      if (!who) return;
      if (who.bubble) who.bubble.destroy();
      const b = this.add.text(0, -112, text.length > 40 ? text.slice(0, 40) + '…' : text, {
        fontSize: '15px', color: '#3a3a3c', fontFamily: FONT, backgroundColor: '#ffffff',
        padding: { x: 10, y: 6 }, wordWrap: { width: 200, useAdvancedWrap: true }, align: 'center',
      }).setOrigin(0.5, 1);
      who.add(b);
      who.bubble = b;
      this.time.delayedCall(5000, () => { if (who.bubble === b) { b.destroy(); who.bubble = null; } });
    }

    // ---------- 颱風 ----------
    setMonster(m) {
      if (!m) return;
      const wasAlive = this.mState && this.mState.alive && this.monster.visible;
      this.mState = m;
      const now = performance.now();
      this.frozenUntil = now + (m.frozen || 0);
      this.weakUntil = now + (m.weak || 0);
      if (m.alive && wasAlive) { this.drawMonsterBar(); return; } // 只是狀態更新（冰凍、削弱、血量上限）
      if (m.alive) {
        this.tweens.killTweensOf(this.monster);
        this.monster.setVisible(true).setAlpha(1).setScale(1).setAngle(0);
        this.monster.x = this.monster.tx = m.x; this.monster.y = this.monster.ty = m.y;
        this.mDead.setVisible(false);
        // 出場：從地上彈出來
        this.tweens.add({ targets: this.monster, scale: { from: 0.2, to: 1 }, duration: 500, ease: 'Back.out' });
      } else {
        this.respawnAt = performance.now() + m.respawnIn;
        this.mDead.setVisible(true);
        if (wasAlive) {
          // 倒下：轉一圈縮小消失
          this.mFace.setTexture('typhoon-face-hit');
          this.tweens.add({ targets: this.monster, angle: 360, scale: 0.1, alpha: 0, y: this.monster.y - 60,
            duration: 900, ease: 'Quad.in', onComplete: () => this.monster.setVisible(false) });
        } else this.monster.setVisible(false);
      }
      this.drawMonsterBar();
    }

    moveMonster(m) { this.monster.tx = m.x; this.monster.ty = m.y; }

    // 楓之谷的頭目血條放在畫面上方（DOM），怪物頭上再留一條細的
    drawMonsterBar() {
      const ratio = this.mState.maxHp ? this.mState.hp / this.mState.maxHp : 0;
      $('boss-fill').style.width = (ratio * 100) + '%';
      $('boss-pct').textContent = Math.ceil(ratio * 100) + '%';
      const g = this.mBar, w = 120;
      g.clear();
      g.fillStyle(0x131a28, 0.9); g.fillRoundedRect(-w / 2 - 2, -178, w + 4, 10, 5);
      g.fillStyle(0xff3b3b, 1); g.fillRoundedRect(-w / 2, -176, Math.max(4, w * ratio), 6, 3);
    }

    // 楓之谷風格的傷害數字：連續打會往上疊
    damageNumber(dmg, crit, at) {
      const now = performance.now();
      if (now - (this.lastDmgAt || 0) > 700) this.dmgStack = 0;
      this.lastDmgAt = now;
      const fx = at ? at.x : this.monster.x, fy = at ? at.y : this.monster.y - 150;
      const y = fy - this.dmgStack * 30;
      this.dmgStack = (this.dmgStack + 1) % 5;
      const t = this.add.text(fx + (Math.random() - 0.5) * 30, y, (crit ? '💥' : '') + dmg, {
        fontSize: crit ? '42px' : '34px', fontStyle: '900', fontFamily: '"Space Mono", ' + FONT,
        color: crit ? '#ff5a2a' : '#ffb020', stroke: crit ? '#4a0d00' : '#5a2a00', strokeThickness: 7,
      }).setOrigin(0.5).setDepth(2100);
      t.setShadow(0, 3, 'rgba(0,0,0,0.35)', 0, true, true);
      this.tweens.add({ targets: t, scale: { from: 1.5, to: 1 }, duration: 140, ease: 'Back.out' });
      this.tweens.add({ targets: t, y: y - 50, alpha: 0, delay: 450, duration: 600, onComplete: () => t.destroy() });
    }

    onMonsterHit(m) {
      // 弓箭、槓鈴、溜冰要等特效打到才跳數字
      const delay = { arrow: 240, barbell: 330, skate: 950 }[m.skill] || 0;
      if (delay) { this.time.delayedCall(delay, () => this.showMonsterHit(m)); return; }
      this.showMonsterHit(m);
    }

    showMonsterHit(m) {
      this.mState.hp = Math.min(this.mState.hp, m.hp);
      this.drawMonsterBar();
      const who = me && m.id === me.id ? this.me : this.remotes.get(m.id);
      if (who && (m.skill === 'strike' || m.skill === 'power')) this.lunge(who, this.monster.x);
      if (m.skill === 'power' || m.skill === 'barbell') this.cameras.main.shake(200, m.skill === 'barbell' ? 0.012 : 0.006);
      // 被打：閃白、換成 >< 臉、往後縮一下
      this.mBody.setTintFill(0xffffff);
      this.mFace.setTexture('typhoon-face-hit');
      this.mHitUntil = performance.now() + 260;
      this.time.delayedCall(80, () => this.applyMonsterTint());
      if (who) {
        const dir = this.monster.x < who.x ? -1 : 1;
        this.tweens.add({ targets: [this.mBody, this.mFace], x: dir * 10, duration: 70, yoyo: true });
      }
      this.damageNumber(m.dmg, m.crit);
    }

    applyMonsterTint() {
      const now = performance.now();
      if (now < this.frozenUntil) this.mBody.setTint(0x9fd8ff);
      else if (now < this.weakUntil) this.mBody.setTint(0xd9c4ff);
      else this.mBody.clearTint();
    }

    // 颱風出招前：地上先出現紅圈圈，裡面的圓慢慢長大，滿了就打下來
    onMonsterAttack(a) {
      const color = { gust: 0xffffff, rain: 0x4f7cc2, bolt: 0xffd23f }[a.type];
      a.spots.forEach(sp => {
        const ring = this.add.graphics({ x: sp.x, y: sp.y }).setDepth(-5);
        ring.fillStyle(0xff3b3b, 0.16); ring.fillEllipse(0, 0, a.r * 2, a.r * 1.4);
        ring.lineStyle(3, 0xff3b3b, 0.9); ring.strokeEllipse(0, 0, a.r * 2, a.r * 1.4);
        const fill = this.add.graphics({ x: sp.x, y: sp.y }).setDepth(-5).setScale(0);
        fill.fillStyle(color, 0.35); fill.fillEllipse(0, 0, a.r * 2, a.r * 1.4);
        this.tweens.add({ targets: fill, scale: 1, duration: a.delay, ease: 'Linear' });
        this.tweens.add({ targets: ring, alpha: { from: 1, to: 0.5 }, duration: 160, yoyo: true, repeat: -1 });
        this.time.delayedCall(a.delay + 60, () => { this.tweens.killTweensOf(ring); ring.destroy(); fill.destroy(); });
      });
      const say = { gust: ['🌪️ 強風來了！', '#ffffff'], rain: ['🌧️ 暴雨彈！', '#bfe6ff'], bolt: ['⚡ 落雷！', '#ffd23f'] }[a.type];
      this.floatText(this.monster.x, this.monster.y - 200, say[0], say[1], 20);
      if (this.me && !this.isDead() && this.roomId === 'front' && a.spots.some(sp => Math.hypot(this.me.x - sp.x, this.me.y - sp.y) <= a.r)) {
        toast('⚠️ 快離開紅圈！');
      }
    }

    onMonsterAttackHit(a) {
      a.spots.forEach(sp => {
        if (a.type === 'gust') {
          // 一圈往外捲的風
          [0, 120].forEach(d => {
            const w = this.add.image(sp.x, sp.y - 20, 'typhoon').setDepth(sp.y + 200).setAlpha(0.9).setScale(0.4, 0.15);
            this.tweens.add({ targets: w, scaleX: 2.2, scaleY: 0.8, alpha: 0, angle: -200, delay: d, duration: 650,
              ease: 'Quad.out', onComplete: () => w.destroy() });
          });
          this.burst(sp.x, sp.y - 30, 14, 0xffffff, a.r);
        } else if (a.type === 'rain') {
          const d = this.add.image(sp.x, sp.y - 420, 'fx-drop').setDepth(sp.y + 200).setScale(1.2);
          this.tweens.add({ targets: d, y: sp.y - 20, duration: 180, ease: 'Quad.in', onComplete: () => {
            d.destroy();
            const splash = this.add.graphics({ x: sp.x, y: sp.y }).setDepth(-4);
            splash.fillStyle(0x7fb2e5, 0.7); splash.fillEllipse(0, 0, a.r * 2, a.r * 1.3);
            splash.lineStyle(3, 0x2b2a33, 0.8); splash.strokeEllipse(0, 0, a.r * 2, a.r * 1.3);
            this.tweens.add({ targets: splash, alpha: 0, scale: 1.25, duration: 900, onComplete: () => splash.destroy() });
            this.burst(sp.x, sp.y - 10, 12, 0x7fb2e5, a.r);
          } });
        } else {
          const b = this.add.image(sp.x, sp.y, 'bolt-big').setOrigin(0.5, 1).setScale(2.2, 6).setDepth(sp.y + 200);
          this.tweens.add({ targets: b, alpha: { from: 1, to: 0 }, duration: 420, delay: 120, onComplete: () => b.destroy() });
          const scorch = this.add.graphics({ x: sp.x, y: sp.y }).setDepth(-4);
          scorch.fillStyle(0x2b2a33, 0.45); scorch.fillEllipse(0, 0, a.r * 1.6, a.r);
          this.tweens.add({ targets: scorch, alpha: 0, delay: 600, duration: 1200, onComplete: () => scorch.destroy() });
          this.burst(sp.x, sp.y - 20, 10, 0xffd23f, a.r);
          if (this.me && Math.hypot(this.me.x - sp.x, this.me.y - sp.y) < 600) {
            this.flash.setSize(this.scale.width, this.scale.height);
            this.tweens.add({ targets: this.flash, alpha: { from: 0.5, to: 0 }, duration: 260 });
          }
        }
      });
      if (!this.me || this.isDead()) return;
      const near = a.spots.some(sp => Math.hypot(this.me.x - sp.x, this.me.y - sp.y) < 600);
      if (near) this.cameras.main.shake(260, a.type === 'bolt' ? 0.012 : 0.007);
      if (a.type !== 'gust' || this.roomId !== 'front') return; // 圍欄內是安全區
      const sp = a.spots[0];
      const dx = this.me.x - sp.x, dy = this.me.y - sp.y, d = Math.hypot(dx, dy);
      if (d > a.r) return;
      // 被強風往外吹
      this.push = { x: (dx || 1) / (d || 1) * 620, y: (dy || 0) / (d || 1) * 620, t: 0.35 };
      this.floatText(this.me.x, this.me.y - 100, '💨 被風吹走了！', '#ffffff', 18);
    }

    // 一圈往外噴的小星星
    burst(x, y, n, tint, spread = 80) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
        const st = this.add.image(x, y, 'fx-star').setDepth(2050).setScale(0.6).setTint(tint);
        this.tweens.add({ targets: st, x: x + Math.cos(a) * spread, y: y + Math.sin(a) * spread * 0.6,
          scale: 0.2, alpha: 0, angle: 180, duration: 600, ease: 'Quad.out', onComplete: () => st.destroy() });
      }
    }

    // 職業技能的特效
    onSkillFx(fx) {
      const who = me && fx.id === me.id ? this.me : this.remotes.get(fx.id);
      if (!who) return;
      const sk = ST.SKILLS[fx.skill];
      const foe = this.foePos(fx.target);
      const mx = foe.x, my = foe.mid;
      if (fx.skill !== 'strike') this.floatText(who.x, who.y - 130, `${sk.icon} ${sk.name}！`, '#ffd23f', 20);
      const ring = (r, color) => {
        const g = this.add.graphics({ x: who.x, y: who.y }).setDepth(-4);
        g.fillStyle(color, 0.25); g.fillEllipse(0, 0, r * 2, r * 1.4);
        g.lineStyle(4, color, 0.9); g.strokeEllipse(0, 0, r * 2, r * 1.4);
        this.tweens.add({ targets: g, scale: { from: 0.2, to: 1 }, alpha: { from: 1, to: 0 }, duration: 800,
          ease: 'Quad.out', onComplete: () => g.destroy() });
      };
      if (fx.skill === 'prophecy') {
        const c = this.add.image(who.x, who.y - 90, 'fx-crystal').setDepth(2050).setScale(0.3);
        this.tweens.add({ targets: c, scale: 1, y: who.y - 150, duration: 400, ease: 'Back.out' });
        this.tweens.add({ targets: c, alpha: 0, delay: 1100, duration: 400, onComplete: () => c.destroy() });
        ring(sk.teamDef.r, 0x9b7be8);
        // 一道紫光射向颱風
        const beam = this.add.graphics().setDepth(2040);
        beam.lineStyle(10, 0x9b7be8, 0.7); beam.lineBetween(who.x, who.y - 140, mx, my);
        beam.lineStyle(4, 0xffffff, 0.9); beam.lineBetween(who.x, who.y - 140, mx, my);
        this.tweens.add({ targets: beam, alpha: 0, delay: 300, duration: 500, onComplete: () => beam.destroy() });
        this.floatText(mx, my - 80, '🔮 被削弱了！', '#d9c4ff', 22);
        this.time.delayedCall(80, () => this.refreshFoeTint(fx.target));
      } else if (fx.skill === 'milk') {
        const b = this.add.image(who.x, who.y - 100, 'fx-milk').setDepth(2050).setScale(0.3);
        this.tweens.add({ targets: b, scale: 1, angle: { from: -20, to: 20 }, duration: 350, ease: 'Back.out' });
        this.tweens.add({ targets: b, alpha: 0, y: who.y - 150, delay: 900, duration: 400, onComplete: () => b.destroy() });
        ring(sk.heal.r, 0x7be08f);
        fx.targets.forEach(id => {
          const t = me && id === me.id ? this.me : this.remotes.get(id);
          if (t) this.burst(t.x, t.y - 40, 8, 0x7be08f, 50);
        });
      } else if (fx.skill === 'arrow') {
        const ang = Math.atan2(my - (who.y - 40), mx - who.x);
        const a = this.add.image(who.x, who.y - 40, 'fx-arrow').setDepth(2050).setRotation(ang);
        this.lunge(who, mx);
        this.tweens.add({ targets: a, x: mx, y: my, duration: 240, ease: 'Linear', onComplete: () => {
          a.destroy(); this.burst(mx, my, 8, 0xff6b81, 60);
        } });
      } else if (fx.skill === 'barbell') {
        const b = this.add.image(who.x, who.y - 110, 'fx-barbell').setDepth(2050).setScale(0.8);
        this.lunge(who, mx);
        this.tweens.add({ targets: b, x: mx, y: my - 60, angle: -40, duration: 200, ease: 'Quad.out', onComplete: () => {
          this.tweens.add({ targets: b, y: my + 10, angle: 30, duration: 130, ease: 'Quad.in', onComplete: () => {
            this.burst(mx, my + 10, 12, 0xffd23f, 90);
            this.floatText(mx, my - 40, '咚！！', '#ffffff', 30);
            this.tweens.add({ targets: b, alpha: 0, duration: 300, onComplete: () => b.destroy() });
          } });
        } });
        ring(60, 0x4f7cc2);
      } else if (fx.skill === 'skate') {
        // 本人先藏起來，替身繞著颱風溜一圈，沿路留下冰晶
        const ghost = this.add.image(who.x, who.y, who.texKey).setScale(0.5).setOrigin(0.5, AV_ORIGIN_Y).setDepth(3000);
        who.body_.setAlpha(0);
        const cx = foe.x, cy = foe.y, R = foe.r;
        const start = Math.atan2(who.y - cy, who.x - cx);
        const o = { t: 0 };
        this.tweens.add({ targets: o, t: 1, duration: 900, ease: 'Sine.inOut',
          onUpdate: () => {
            const a = start + o.t * Math.PI * 2;
            ghost.x = cx + Math.cos(a) * R; ghost.y = cy + Math.sin(a) * R * 0.55;
            ghost.setAngle(Math.sin(o.t * Math.PI * 6) * 12).setFlipX(Math.sin(a) > 0);
            if (Math.random() < 0.5) {
              const st = this.add.image(ghost.x, ghost.y - 4, 'fx-star').setScale(0.4).setTint(0xbfe6ff).setDepth(2040);
              this.tweens.add({ targets: st, alpha: 0, scale: 0.1, duration: 700, onComplete: () => st.destroy() });
            }
          },
          onComplete: () => {
            ghost.destroy(); who.body_.setAlpha(who.stats && who.stats.dead ? 0.45 : 1);
            this.burst(cx, cy - 60, 14, 0xbfe6ff, 120);
            this.floatText(cx, cy - (foe.mob ? 120 : 220), '❄️ 冰凍！', '#bfe6ff', 26);
            this.refreshFoeTint(fx.target);
          } });
      }
    }

    // 慶祝煙火：火箭往上衝，炸開後火花飛到文字的位置，停一下再掉下來
    launchFirework(f) {
      const who = me && f.id === me.id ? this.me : this.remotes.get(f.id);
      const x = who ? who.x : f.x, y0 = who ? who.y - 60 : f.y - 60, y1 = y0 - 190;
      const palette = [0xff6a13, 0xffb020, 0x4f7cc2, 0xe8384f, 0x3f9f5a, 0x8a5cd6];
      const main = palette[Math.floor(Math.random() * palette.length)];
      const rocket = { x, y: y0 };
      this.tweens.add({ targets: rocket, y: y1, duration: 700, ease: 'Quad.out',
        onUpdate: () => this.sparks.push({ x: rocket.x + (Math.random() - 0.5) * 4, y: rocket.y, vx: 0, vy: 30,
          color: 0xffd23f, size: 3, born: performance.now(), life: 400, mode: 'fade' }),
        onComplete: () => {
          const { pts, w } = textPoints(f.text, 1100);
          const scale = Math.min(2, 560 / w);
          const now = performance.now();
          pts.forEach(([px, py]) => {
            const color = Math.random() < 0.75 ? main : palette[Math.floor(Math.random() * palette.length)];
            this.sparks.push({ x, y: y1, sx: x, sy: y1, tx: x + px * scale, ty: y1 + py * scale, color,
              size: 2.4 + Math.random() * 1.2, born: now, life: 3200, mode: 'text', vx: 0, vy: 0 });
          });
          // 一圈往外噴的散花
          for (let i = 0; i < 60; i++) {
            const a = Math.random() * Math.PI * 2, v = 200 + Math.random() * 260;
            this.sparks.push({ x, y: y1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color: palette[i % palette.length],
              size: 2.5, born: now, life: 1100, mode: 'fall' });
          }
          if (this.me && Math.hypot(this.me.x - x, this.me.y - y1) < 900) this.cameras.main.shake(150, 0.003);
        } });
    }

    updateSparks(dt) {
      const g = this.fw, now = performance.now();
      g.clear();
      this.sparks = this.sparks.filter(p => now - p.born < p.life);
      this.sparks.forEach(p => {
        const age = now - p.born;
        let alpha = 1;
        if (p.mode === 'text') {
          if (age < 650) {
            // 從中心飛到文字的位置
            const k = 1 - Math.pow(1 - age / 650, 3);
            p.x = p.sx + (p.tx - p.sx) * k; p.y = p.sy + (p.ty - p.sy) * k;
          } else if (age < 2300) {
            alpha = 0.75 + Math.random() * 0.25; // 閃爍
          } else {
            p.vy += 260 * dt; p.y += p.vy * dt;
            alpha = 1 - (age - 2300) / (p.life - 2300);
          }
        } else {
          p.vx *= 0.96; p.vy = p.vy * 0.96 + 240 * dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          alpha = 1 - age / p.life;
        }
        g.fillStyle(p.color, alpha * 0.25); g.fillCircle(p.x, p.y, p.size * 2);
        g.fillStyle(p.color, alpha); g.fillCircle(p.x, p.y, p.size);
      });
    }

    // ---------- 物資箱 ----------
    onCrateHit(c) {
      const img = this.add.image((c.tx + 0.5) * T, (c.ty + 0.5) * T, 'crate').setDepth((c.ty + 1) * T - 1);
      this.tweens.add({ targets: img, angle: { from: -10, to: 10 }, duration: 60, yoyo: true, repeat: 1,
        onComplete: () => img.destroy() });
      const who = me && c.id === me.id ? this.me : this.remotes.get(c.id);
      if (who) this.lunge(who, (c.tx + 0.5) * T);
      this.floatText((c.tx + 0.5) * T, c.ty * T, '咚！', '#3a3a3c', 18);
    }

    onItemGot(g) {
      const who = me && g.id === me.id ? this.me : this.remotes.get(g.id);
      const it = MAP.ITEMS[g.item];
      if (who && it) this.floatText(who.x, who.y - 110, it.icon, '#ffffff', 34);
    }

    // 世界座標 (x, y) 上可以互動的東西，夠近才算
    actionAt(x, y) {
      if (this.mState.alive && this.monster.visible && Math.hypot(x - this.monster.x, y - (this.monster.y - 70)) < 110 &&
        Math.hypot(this.me.x - this.monster.x, this.me.y - this.monster.y) < 130) return { type: 'attack', target: 'boss' };
      for (const m of this.mobs.values()) {
        if (m.state.alive && Math.hypot(x - m.x, y - (m.y - 40)) < 50 && Math.hypot(this.me.x - m.x, this.me.y - m.y) < 130) {
          return { type: 'attack', target: m.state.id };
        }
      }
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (MAP.crateAt(tx, ty) >= 0 && Math.hypot(this.me.x - (tx + 0.5) * T, this.me.y - (ty + 0.5) * T) < 1.7 * T) {
        return { type: 'crate', tx, ty };
      }
      if (MAP.tiles[ty] && MAP.tiles[ty][tx] === 'G' && MAP.nearStove(this.me.x, this.me.y, 1.8 * T)) return { type: 'cook' };
      if (Math.hypot(x - MAP.mentor.x, y - (MAP.mentor.y - 20)) < 50 && MAP.nearMentor(this.me.x, this.me.y)) return { type: 'mentor' };
      if (Math.hypot(x - MAP.fridge.x, y - (MAP.fridge.y - 10)) < 40 && MAP.nearFridge(this.me.x, this.me.y)) return { type: 'fridge' };
      return null;
    }

    isDead() { return !!(myStats && myStats.dead); }

    // 自己身邊可以互動的東西（給按鈕和空白鍵用）
    nearbyAction() {
      if (!this.me) return null;
      const foe = this.nearestFoe(130);
      if (foe) return { type: 'attack', target: foe.id, name: foe.name };
      const cx = Math.floor(this.me.x / T), cy = Math.floor(this.me.y / T);
      let best = null, bd = Infinity;
      for (let ty = cy - 2; ty <= cy + 2; ty++) {
        for (let tx = cx - 2; tx <= cx + 2; tx++) {
          if (MAP.crateAt(tx, ty) < 0 || this.emptyCrates.has(tx + ',' + ty)) continue;
          const d = Math.hypot(this.me.x - (tx + 0.5) * T, this.me.y - (ty + 0.5) * T);
          if (d < 1.7 * T && d < bd) { bd = d; best = { type: 'crate', tx, ty }; }
        }
      }
      if (!best && MAP.nearStove(this.me.x, this.me.y, 1.8 * T)) return { type: 'cook' };
      if (!best && MAP.nearMentor(this.me.x, this.me.y)) return { type: 'mentor' };
      return best;
    }

    doAction(act) {
      if (this.isDead()) return;
      const now = performance.now();
      if (now - (this.lastActTime || 0) < 360) return;
      act = act || this.nearbyAction();
      if (!act) return;
      this.lastActTime = now;
      this.target = null;
      // 先把目前位置告訴伺服器，它才會判斷你夠近
      socket.emit('move', { x: Math.round(this.me.x), y: Math.round(this.me.y), dir: this.me.dir, moving: false });
      if (act.type === 'attack') {
        this.castSkill(act.skill || 'strike', act.target);
      } else if (act.type === 'mentor') {
        openMentor();
      } else if (act.type === 'fridge') {
        openFridge();
      } else if (act.type === 'cook') {
        socket.emit('cook', (res) => {
          if (!res || !res.ok) { if (res && res.error) toast(res.error); return; }
          renderInventory(res.inv);
        });
      } else {
        if (this.emptyCrates.has(act.tx + ',' + act.ty)) { toast('這箱被拿光了，等一下會補貨'); return; }
        socket.emit('hitCrate', { tx: act.tx, ty: act.ty }, (res) => {
          if (!res || !res.item) return;
          renderInventory(res.inv);
          const it = MAP.ITEMS[res.item];
          toast(`獲得 ${it.icon} ${it.name}！`);
        });
      }
    }

    // 技能按鈕、K 鍵、技能視窗的「使用」都走這裡
    useSkill(id) {
      if (!this.me || this.isDead()) return;
      const sk = ST.SKILLS[id];
      let target = 'boss';
      if (!sk.support) {
        const foe = this.nearestFoe(sk.range);
        if (!foe) { toast(`附近沒有怪物，${sk.name}的射程是 ${sk.range}`); return; }
        target = foe.id;
      }
      const now = performance.now();
      if (now - (this.lastActTime || 0) < 360) return;
      this.lastActTime = now;
      this.target = null;
      socket.emit('move', { x: Math.round(this.me.x), y: Math.round(this.me.y), dir: this.me.dir, moving: false });
      this.castSkill(id, target);
    }

    // 射程內最近的敵人（颱風或小怪）
    nearestFoe(range) {
      let best = null, bd = range;
      if (this.mState.alive && this.monster.visible) {
        const d = Math.hypot(this.me.x - this.monster.x, this.me.y - this.monster.y);
        if (d <= bd) { bd = d; best = { id: 'boss', name: ST.MONSTER.name }; }
      }
      this.mobs.forEach(m => {
        if (!m.state.alive) return;
        const d = Math.hypot(this.me.x - m.x, this.me.y - m.y);
        if (d <= bd) { bd = d; best = { id: m.state.id, name: ST.MOBS[m.state.kind].name }; }
      });
      return best;
    }

    // 技能特效要打到的位置：x、腳底 y、身體中間 y、繞圈半徑
    foePos(target) {
      const m = target && target !== 'boss' ? this.mobs.get(target) : null;
      if (m) return { x: m.x, y: m.y, mid: m.y - 40, r: 80, mob: m };
      return { x: this.monster.x, y: this.monster.y, mid: this.monster.y - 90, r: 150, mob: null };
    }

    refreshFoeTint(target) {
      const m = target && target !== 'boss' ? this.mobs.get(target) : null;
      if (!m) { this.applyMonsterTint(); return; }
      const now = performance.now();
      if (now < m.frozenUntil) m.body_.setTint(0x9fd8ff);
      else if (now < m.weakUntil) m.body_.setTint(0xd9c4ff);
      else m.body_.clearTint();
    }

    // ---------- 野外小怪 ----------
    setMob(st) {
      let m = this.mobs.get(st.id);
      const def = ST.MOBS[st.kind];
      if (!m) {
        const body = this.add.image(0, 0, 'mob-' + st.kind).setScale(0.62).setOrigin(0.5, 0.95);
        const tag = this.add.text(0, 10, `Lv.${def.level} ${def.name}`, {
          fontSize: '13px', fontStyle: 'bold', color: '#ffd23f', fontFamily: FONT,
          backgroundColor: 'rgba(19,26,40,0.85)', padding: { x: 6, y: 2 },
        }).setOrigin(0.5, 0);
        const bar = this.add.graphics();
        const ice = this.add.image(0, 4, 'fx-ice').setOrigin(0.5, 1).setScale(1.2, 0.9).setVisible(false);
        m = this.add.container(st.x, st.y, [body, ice, bar, tag]);
        m.body_ = body; m.bar = bar; m.ice = ice;
        m.tx = st.x; m.ty = st.y;
        this.mobs.set(st.id, m);
      }
      const was = m.state;
      m.state = st;
      const now = performance.now();
      m.frozenUntil = now + (st.frozen || 0);
      m.weakUntil = now + (st.weak || 0);
      if (st.alive && (!was || !was.alive)) {
        m.x = m.tx = st.x; m.y = m.ty = st.y;
        this.tweens.killTweensOf(m);
        m.setVisible(true).setAlpha(1).setAngle(0).setScale(1);
        if (was) this.tweens.add({ targets: m, scale: { from: 0.2, to: 1 }, duration: 400, ease: 'Back.out' });
      } else if (!st.alive && was && was.alive) {
        this.tweens.add({ targets: m, angle: 90, alpha: 0, y: m.y - 30, duration: 600, onComplete: () => m.setVisible(false) });
      } else if (!st.alive) m.setVisible(false);
      this.drawMobBar(m);
      this.refreshFoeTint(st.id);
    }

    drawMobBar(m) {
      const w = 54, ratio = m.state.maxHp ? m.state.hp / m.state.maxHp : 0;
      m.bar.clear();
      m.bar.fillStyle(0x131a28, 0.9); m.bar.fillRoundedRect(-w / 2 - 2, -104, w + 4, 8, 4);
      m.bar.fillStyle(0xff3b3b, 1); m.bar.fillRoundedRect(-w / 2, -102, Math.max(3, w * ratio), 4, 2);
    }

    moveMobs(list) {
      list.forEach(([id, x, y]) => {
        const m = this.mobs.get(id);
        if (!m) return;
        if (x !== m.tx) m.body_.setFlipX(x < m.tx);
        m.tx = x; m.ty = y;
      });
    }

    onMobHit(h) {
      const delay = { arrow: 240, barbell: 330, skate: 950 }[h.skill] || 0;
      const show = () => {
        const m = this.mobs.get(h.mid);
        if (!m) return;
        m.state.hp = Math.min(m.state.hp, h.hp);
        this.drawMobBar(m);
        const who = me && h.id === me.id ? this.me : this.remotes.get(h.id);
        if (who && (h.skill === 'strike' || h.skill === 'power')) this.lunge(who, m.x);
        m.body_.setTintFill(0xffffff);
        this.time.delayedCall(80, () => this.refreshFoeTint(h.mid));
        this.tweens.add({ targets: m.body_, x: (who && m.x < who.x ? -8 : 8), duration: 70, yoyo: true });
        this.damageNumber(h.dmg, h.crit, { x: m.x, y: m.y - 100 });
      };
      if (delay) this.time.delayedCall(delay, show); else show();
    }

    onMobAttack(a) {
      const m = this.mobs.get(a.mid);
      const who = me && a.id === me.id ? this.me : this.remotes.get(a.id);
      if (!m || !who) return;
      // 往目標撲一下，頭上冒出台詞
      const dir = who.x < m.x ? -1 : 1;
      this.tweens.add({ targets: m.body_, x: dir * 16, angle: dir * 10, duration: 150, yoyo: true, delay: 250 });
      if (m.say) m.say.destroy();
      m.say = this.add.text(0, -110, a.say, {
        fontSize: '14px', color: '#3a3a3c', fontFamily: FONT, backgroundColor: '#ffffff', padding: { x: 8, y: 4 },
      }).setOrigin(0.5, 1);
      m.add(m.say);
      const say = m.say;
      this.time.delayedCall(1600, () => { if (m.say === say) { say.destroy(); m.say = null; } });
      this.time.delayedCall(450, () => this.burst(who.x, who.y - 40, 6, 0xff6a13, 40));
    }

    onLevelUp(l) {
      const who = me && l.id === me.id ? this.me : this.remotes.get(l.id);
      if (!who) return;
      this.burst(who.x, who.y - 50, 16, 0xffd23f, 90);
      const t = this.add.text(who.x, who.y - 120, `LEVEL UP! Lv.${l.level}`, {
        fontSize: '24px', fontStyle: '900', fontFamily: '"Space Mono", ' + FONT, color: '#ffd23f', stroke: '#5a2a00', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(2100);
      this.tweens.add({ targets: t, y: who.y - 170, alpha: { from: 1, to: 0 }, delay: 600, duration: 900, onComplete: () => t.destroy() });
      if (who === this.me) {
        toast(l.level === ST.LEVEL.fireworkLv ? `⭐ 升到 Lv.${l.level}！可以放慶祝煙火了 🎆` : `⭐ 升到 Lv.${l.level}！`);
        if (l.level === ST.LEVEL.fireworkLv && modalKind === 'firework') openFirework();
      }
    }

    castSkill(id, target) {
      const sk = ST.SKILLS[id];
      const left = (cooldowns[id] || 0) - performance.now();
      if (left > 0) { if (id !== 'strike') toast(`${sk.name}還在冷卻，${Math.ceil(left / 1000)} 秒後可以再用`); return; }
      if (myStats && myStats.mp < sk.mp) { toast(`魔力不夠，${sk.name}要 ${sk.mp} 點，喝礦泉水可以補`); return; }
      socket.emit('attack', id, target || 'boss', (res) => {
        if (res && res.ok) cooldowns[id] = performance.now() + sk.cooldown;
        else if (res && res.error) toast(res.error);
      });
    }

    lunge(who, towardX) {
      const dir = towardX < who.x ? -1 : 1;
      who.dir = dir; who.body_.setFlipX(dir === -1);
      this.tweens.add({ targets: who.body_, x: dir * 10, angle: dir * 12, duration: 70, yoyo: true });
    }

    floatText(x, y, text, color, size) {
      const t = this.add.text(x, y, text, {
        fontSize: size + 'px', fontStyle: 'bold', color, fontFamily: FONT,
        stroke: '#131a28', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(2000);
      this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
    }

    canStand(x, y) {
      // 用腳底的一個小方框判斷碰撞
      return !MAP.isBlocked(x - 12, y - 8) && !MAP.isBlocked(x + 12, y - 8) &&
        !MAP.isBlocked(x - 12, y + 2) && !MAP.isBlocked(x + 12, y + 2);
    }

    update(time) {
      // 用真實時間算位移，電腦或手機掉幀時走路速度也不會變慢
      const now = performance.now();
      const dt = Math.min(0.1, (now - (this.prevNow || now)) / 1000);
      this.prevNow = now;
      this.updateRain(dt);
      if (!this.me) return;

      // 自己的移動
      let dx = 0, dy = 0;
      if (!typing() && !this.isDead()) {
        const k = this.keys;
        if (k.A.isDown || k.LEFT.isDown) dx -= 1;
        if (k.D.isDown || k.RIGHT.isDown) dx += 1;
        if (k.W.isDown || k.UP.isDown) dy -= 1;
        if (k.S.isDown || k.DOWN.isDown) dy += 1;
      }
      if (dx || dy || this.isDead()) this.target = null;
      else if (this.target) {
        const tx = this.target.x - this.me.x, ty = this.target.y - this.me.y;
        const d = Math.hypot(tx, ty);
        if (d < 6) this.target = null; else { dx = tx / d; dy = ty / d; }
      }
      const len = Math.hypot(dx, dy);
      let moving = false;
      if (len > 0) {
        const step = SPEED * dt / len;
        const nx = this.me.x + dx * step, ny = this.me.y + dy * step;
        const ox = this.me.x, oy = this.me.y;
        if (this.canStand(nx, this.me.y)) this.me.x = nx;
        if (this.canStand(this.me.x, ny)) this.me.y = ny;
        moving = this.me.x !== ox || this.me.y !== oy;
        if (!moving) this.target = null;
        if (dx !== 0) { this.me.dir = dx < 0 ? -1 : 1; this.me.body_.setFlipX(this.me.dir === -1); }
      }
      // 被強風吹走
      if (this.push) {
        const px = this.me.x + this.push.x * dt, py = this.me.y + this.push.y * dt;
        if (this.canStand(px, this.me.y)) this.me.x = px;
        if (this.canStand(this.me.x, py)) this.me.y = py;
        this.push.t -= dt;
        moving = true;
        if (this.push.t <= 0) this.push = null;
      }
      this.me.moving = moving;

      // 傳給伺服器（約每秒 15 次）
      const changed = moving !== this.lastMoving || moving;
      if (changed && time - this.lastSent > 66) {
        socket.emit('move', { x: Math.round(this.me.x), y: Math.round(this.me.y), dir: this.me.dir, moving });
        this.lastSent = time;
        this.lastMoving = moving;
      }

      // 小怪：平滑移動、冰凍時停住
      this.mobs.forEach(m => {
        if (!m.visible) return;
        m.x += (m.tx - m.x) * Math.min(1, dt * 8);
        m.y += (m.ty - m.y) * Math.min(1, dt * 8);
        const frozen = performance.now() < m.frozenUntil;
        m.ice.setVisible(frozen);
        if (m.wasFrozen && !frozen) this.refreshFoeTint(m.state.id);
        m.wasFrozen = frozen;
        m.body_.y = frozen ? 0 : -Math.abs(Math.sin(time / 160 + m.tx)) * 4;
        m.setDepth(m.y);
      });

      // 其他玩家：平滑移動
      this.remotes.forEach(r => {
        r.x += (r.tx - r.x) * Math.min(1, dt * 12);
        r.y += (r.ty - r.y) * Math.min(1, dt * 12);
      });

      // 颱風：平滑移動、旋轉
      if (this.monster.visible) {
        this.monster.x += (this.monster.tx - this.monster.x) * Math.min(1, dt * 6);
        this.monster.y += (this.monster.ty - this.monster.y) * Math.min(1, dt * 6);
        const frozen = performance.now() < this.frozenUntil;
        const weak = performance.now() < this.weakUntil;
        if (!frozen) this.mSwirl.rotation -= dt * 2.4;
        this.mIce.setVisible(frozen);
        const status = [frozen && '❄️ 冰凍中', weak && '🔮 被削弱'].filter(Boolean).join(' ');
        if (status !== this.mStatusText) {
          this.mStatusText = status;
          this.mStatus.setText(status).setVisible(!!status);
          this.mStatus.setBackgroundColor(frozen ? 'rgba(79,124,194,0.9)' : 'rgba(106,79,184,0.9)');
          if (!this.mHitUntil) this.applyMonsterTint();
        }
        // 楓之谷式的彈跳：跳起來、落地時壓扁（冰凍時停住）
        const ph = frozen ? 0.5 : (time % 900) / 900;
        const hop = Math.sin(ph * Math.PI);
        const squash = ph < 0.12 || ph > 0.88 ? 0.1 : 0;
        this.mBody.y = -hop * 16;
        this.mBody.setScale(1 + squash, 1 - squash + hop * 0.04);
        this.mFace.y = -100 * (1 - squash) - hop * 16;
        if (this.mHitUntil && performance.now() > this.mHitUntil) { this.mHitUntil = 0; this.mFace.setTexture('typhoon-face'); this.applyMonsterTint(); }
        this.monster.setDepth(this.monster.y);
      }
      // 頭目血條：在前線或看得到颱風的時候才顯示
      const showBoss = this.mState.alive && (this.roomId === 'front' ||
        Math.hypot(this.me.x - this.monster.x, this.me.y - this.monster.y) < 700);
      if (showBoss !== this.showBoss) { this.showBoss = showBoss; $('boss').hidden = !showBoss; }
      if (!this.mState.alive && this.respawnAt) {
        const left = Math.max(0, Math.ceil((this.respawnAt - performance.now()) / 1000));
        this.mDead.setText(`🎉 颱風${ST.MONSTER.name}被擊退了！\n${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} 後重新生成`);
      }

      // 互動按鈕
      const all0 = [this.me, ...this.remotes.values()];
      const near = this.nearbyAction();
      const LABELS = { crate: '🔨 敲箱子', cook: '🍜 煮泡麵', mentor: '💬 找沈理員轉職' };
      const label = !near || this.isDead() ? '' : near.type === 'attack' ? `👊 攻擊${near.name}` : LABELS[near.type];
      if (label !== this.actionLabel) {
        this.actionLabel = label;
        $('action-btn').hidden = !label;
        $('action-btn').textContent = label;
      }
      // 招牌技能的冷卻條
      const sp = special(), cdLeft = Math.max(0, (cooldowns[sp] || 0) - performance.now());
      const pct = cdLeft ? Math.round(100 * cdLeft / ST.SKILLS[sp].cooldown) : 0;
      if (pct !== this.cdPct) {
        this.cdPct = pct;
        const bar = document.querySelector('#skill-btn .cd');
        if (bar) bar.style.width = pct + '%';
        $('skill-btn').classList.toggle('cooling', pct > 0);
      }
      // 防禦增益時間到就拿掉小盾牌
      all0.forEach(c => {
        if (c.shield && performance.now() > c.shieldUntil) { c.shield.destroy(); c.shield = null; }
      });
      this.updateSparks(dt);

      // 拿著蛋糕的人：時間到自動放下；靠近的人（包含自己）戴上慶祝帽，直到那個蛋糕放下
      const holders = all0.filter(c => c.cakeUntil);
      holders.forEach(h => { if (now > h.cakeUntil) this.onCake(h.pid, 0, h); });
      all0.forEach(c => {
        holders.forEach(h => {
          if (h.cakeUntil && Math.hypot(h.x - c.x, h.y - c.y) < 160 && h.cakeUntil > c.hatUntil) { c.hatUntil = h.cakeUntil; c.hatBy = h.pid; }
        });
        const hat = now < c.hatUntil;
        if (hat && !c.hat) { c.hat = this.add.image(4, -60, 'fx-partyhat').setScale(0.5).setOrigin(0.5, 0.9).setAngle(12); c.add(c.hat); }
        else if (!hat && c.hat) { c.hat.destroy(); c.hat = null; }
        const up = c.hat ? -22 : 0;
        if (c.tag.y !== -84 + up) { c.tag.y = -84 + up; c.bar.y = up; }
        if (c.glowFx) c.glowFx.color = Phaser.Display.Color.HSVToRGB((time / 4000) % 1, 0.35, 1).color;
      });
      if (this.me.cakeUntil) {
        const left = Math.max(0, Math.ceil((this.me.cakeUntil - now) / 1000));
        const txt = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
        if (txt !== this.cakeTxt) { this.cakeTxt = txt; $('cake-left').textContent = txt; }
      }

      // 走路彈跳 + 依 y 排深度
      const all = all0;
      all.forEach(c => {
        c.body_.y = c.moving ? -Math.abs(Math.sin(time / 90)) * 5 : 0;
        if (c.hat) c.hat.y = -60 + c.body_.y;
        if (c.cake) c.cake.y = -6 + c.body_.y;
        c.setDepth(c.y);
      });

      // 房間偵測
      const room = MAP.roomAt(this.me.x, this.me.y);
      const rid = room ? room.id : null;
      if (rid !== this.roomId) {
        const first = this.roomId === undefined;
        this.roomId = rid;
        $('room-name').textContent = room ? room.name : '🌧️ 戶外（風雨很大！）';
        $('video-prompt').hidden = rid !== 'video';
        if (rid !== 'video') DRAW.close();
        if (room && !first) toast(`進入 ${room.name}`);
        const tips = {
          front: `野外有颱風${ST.MONSTER.name}和小怪！空白鍵攻擊、K 放技能，看到紅圈快閃開；回到圍欄裡就安全了`,
          command: '找右上角的 📂 轉職資料沈理員，可以換職業',
          storage: '走到箱子旁按空白鍵（或點箱子）敲三下',
          kitchen: '站在爐台旁按空白鍵煮泡麵補血，有蔬菜會自動加進去',
        };
        if (tips[rid] && !this.told[rid]) { this.told[rid] = true; toast(tips[rid]); }
      }
    }

    updateRain(dt) {
      const g = this.rain;
      g.clear();
      g.lineStyle(2, 0xcfe6ff, 0.55);
      const h = this.scale.height;
      this.drops.forEach((d, i) => {
        d.y += d.v * dt; d.x -= d.v * 0.35 * dt;
        if (d.y > h + 20 || d.x < -40) this.drops[i] = d = this.newDrop(false);
        g.lineBetween(d.x, d.y, d.x + d.len * 0.35, d.y - d.len);
      });
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#131a28',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: HQScene,
  });
})();
