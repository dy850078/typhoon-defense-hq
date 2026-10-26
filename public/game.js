/* global Phaser, io, HQ_MAP, HQ_AVATAR */
(() => {
  const MAP = HQ_MAP;
  const AV = HQ_AVATAR;
  const ST = HQ_STATS;
  const GR = HQ_GEAR;
  const DC = HQ_DECOR;
  // iOS 不理 viewport 的 user-scalable，手指捏合會放大，這裡擋掉；連點兩下靠 CSS 的 touch-action
  ['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  // 萬一畫面還是被放大了（iPad 的「電腦版網站」模式會忽略禁止縮放），輸入框離開時把縮放拉回原本大小
  const vpMeta = document.querySelector('meta[name=viewport]');
  document.addEventListener('focusout', (e) => {
    if (!vpMeta || !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    const c = vpMeta.content;
    vpMeta.content = c + ', minimum-scale=1';
    setTimeout(() => { vpMeta.content = c; }, 50);
  });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // 分頁切到背景時瀏覽器會停掉畫面更新，這時收到的特效動畫都會卡住排隊，切回來一次全播。
  // 背景時就不產生純視覺的特效，血量、位置這些狀態照樣更新
  const fxOff = () => document.hidden;
  // 近距離的普攻：打到時角色往前撲一下
  const MELEE = ['strike', 'power', 'syringe', 'punch', 'kick', 'marbleSmash', 'spireThrust'];
  // 會飛過去的攻擊：特效打到才跳數字（毫秒）
  const HIT_DELAY = { arrow: 520, barbell: 330, skate: 950, shot: 260, orb: 300, ray: 120,
    defib: 150, arrowRain: 650, roar: 200, icicle: 330, mothership: 600, note: 280, paint: 260, noteBlade: 760,
    lilyDart: 280, pebbleOrb: 330, marbleSmash: 160, cardFlick: 260, damperSwing: 340, spireThrust: 150 };
  // 人物貼圖比 64x80 大一圈，翅膀、氣球、帽子才畫得下；(16,32) 是人物框的左上角，腳底在 y=108
  const FRAME = { w: 96, h: 112, ox: 16, oy: 32 };
  const AV_ORIGIN_Y = (FRAME.oy + 76) / FRAME.h;
  const T = MAP.TILE;
  const SPEED = 220;
  const FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  // 場景裡的文字框統一用米白紙條：Phaser 的 Text 只會畫方方正正的底色，
  // 所以底色設成 PAPER 的文字改成先畫字、再在字的後面補一張蠟筆描邊的紙條
  const PAPER = '#fbf6e9', INK = '#2b2a33';
  (function paperText() {
    const Txt = Phaser.GameObjects.Text.prototype, orig = Txt.updateText;
    Txt.updateText = function () {
      const style = this.style;
      if (style.backgroundColor !== PAPER) return orig.call(this);
      // 留白照字級統一算：字跟紙邊至少隔一截，右下多留一點給影子
      const fs = parseFloat(style.fontSize) || 12, px = Math.round(fs * 0.65), py = Math.round(fs * 0.3);
      Object.assign(this.padding, { left: px + 2, right: px + 3, top: py + 2, bottom: py + 3 });
      style.resolution = Math.max(style.resolution || 1, 2); // 小字用兩倍解析度畫，才不會糊
      style.backgroundColor = null;
      orig.call(this);
      style.backgroundColor = PAPER;
      const cv = this.canvas, ctx = this.context, res = style.resolution || 1;
      const w = cv.width / res, h = cv.height / res;
      if (w < 6 || h < 6) return this;
      let seed = 7; for (const ch of String(this._text)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
      const C = window.HQ_CRAYON, r = C.rng(seed);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.scale(res, res);
      // destination-over：先畫的在上面 → 描邊、紙、影子
      C.rect(ctx, 2, 1.5, w - 5, h - 4.5, r, 1.1); C.stroke(ctx, r, 1.4, INK);
      C.rect(ctx, 2, 1.5, w - 5, h - 4.5, r, 0); ctx.fillStyle = PAPER; ctx.fill();
      C.rect(ctx, 4, 3.5, w - 5, h - 4.5, r, 0.6); ctx.fillStyle = 'rgba(43,42,51,0.28)'; ctx.fill();
      ctx.restore();
      if (this.renderer && this.renderer.gl) this.frame.source.glTexture = this.renderer.canvasToTexture(cv, this.frame.source.glTexture, true);
      return this;
    };
  })();
  const $ = (id) => document.getElementById(id);

  // ---------------- 角色創建 ----------------
  const profile = {};
  function readProfile() {
    Object.assign(profile, {
      name: localStorage.getItem('hq-name') || '',
      hair: localStorage.getItem('hq-hair') || 'short',
      hairColor: localStorage.getItem('hq-hairColor') || AV.HAIR_COLORS[0],
      skin: localStorage.getItem('hq-skin') || AV.SKINS[0],
      outfit: localStorage.getItem('hq-outfit') || AV.OUTFITS[0],
      glasses: localStorage.getItem('hq-glasses') || '1',
      cls: localStorage.getItem('hq-cls') || 'staff',
    });
    // 舊版存的是動物的顏色，對不上就換回預設
    if (!AV.HAIRS[profile.hair]) profile.hair = 'short';
    if (!AV.OUTFITS.includes(profile.outfit)) profile.outfit = AV.OUTFITS[0];
    if (!ST.CLASSES[profile.cls]) profile.cls = 'staff';
  }
  readProfile();

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
  function buildCreate() {
    buildPicker($('hairs'), Object.entries(AV.HAIRS), 'hair', (b, v, l) => { b.textContent = l; });
    buildPicker($('hair-colors'), AV.HAIR_COLORS.map(c => [c]), 'hairColor', swatch);
    buildPicker($('skins'), AV.SKINS.map(c => [c]), 'skin', swatch);
    buildPicker($('outfits'), AV.OUTFITS.map(c => [c]), 'outfit', swatch);
    buildPicker($('glasses'), [['1', AV.GLASSES[1]], ['0', AV.GLASSES[0]]], 'glasses', (b, v, l) => { b.textContent = l; });
    $('name').value = profile.name;
    renderPreview();
  }
  buildCreate();

  // ---------------- 連線 ----------------
  const socket = io();
  // 這個分頁的代號（重新整理也一樣）：斷線太久重新加入時，伺服器用它找到留著的舊角色
  const RK = (() => {
    try {
      let k = sessionStorage.getItem('hq-rk');
      if (!k) { k = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('hq-rk', k); }
      return k;
    } catch (e) { return ''; }
  })();
  let config = { jitsiDomain: 'meet.jit.si', jitsiRoom: 'TyphoonDefenseHQ', party: { md: '10.23', dateDot: '2026.10.23', time: '20:00' } };
  fetch('/config').then(r => r.json()).then(c => { config = c; }).catch(() => {});
  // 管理員改了派對時間
  socket.on('party', (p) => { config.party = p; });

  let me = null;
  let scene = null;
  let joined = false;
  const pending = []; // scene 建好之前收到的事件

  // 等級、經驗存在自己的瀏覽器；報名頁的邀請函也一起帶進總部
  const saved = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const savedJson = (k, d) => { try { return JSON.parse(saved(k) || 'null') || d; } catch (e) { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { /* 無痕模式 */ } };
  // 介面收合：手機直拿或橫拿算「小螢幕」，觸控裝置（手機、平板）的面板預設收起來，各自記住自己的選擇
  const SMALL = () => matchMedia('(max-width: 600px), (max-height: 520px)').matches;
  const TOUCH = matchMedia('(pointer: coarse)').matches;
  const folded = (k, def) => { const v = saved('hq-fold-' + k); return v == null ? def : v === '1'; };
  // 拿到的裝備、身上穿的裝備也存在瀏覽器
  let myOwned = savedJson('hq-owned', []);
  let myEquip = savedJson('hq-equip', {});
  let myFurn = savedJson('hq-furn', {});

  // 有登入的話，先從帳號拿最新的角色（可能在別台裝置玩過）
  const ACC = window.HQ_ACCOUNT;
  const showAcct = () => {
    const u = ACC.user(), box = $('join-acct');
    box.innerHTML = '';
    if (u) {
      box.append('已登入：', Object.assign(document.createElement('b'), { textContent: u }), '・角色會自動存到帳號');
    } else {
      box.append('還沒登入，角色只存在這台裝置上・');
      box.appendChild(Object.assign(document.createElement('a'), { href: './', textContent: '登入或建立帳號' }));
    }
  };
  showAcct();
  const synced = ACC.sync().then((r) => {
    showAcct();
    if (!r || joined) return;
    readProfile(); buildCreate();
    myOwned = savedJson('hq-owned', []); myEquip = savedJson('hq-equip', {}); myFurn = savedJson('hq-furn', {});
  }).catch(() => {});
  function doJoin() {
    const vip = savedJson('hq-vip', null);
    const data = Object.assign({}, profile, { level: Number(saved('hq-level')) || 1, exp: Number(saved('hq-exp')) || 0, vip,
      owned: myOwned, equip: myEquip, furn: myFurn, inv: savedJson('hq-inv', {}), token: ACC.token(), rk: RK });
    // 斷線太久（或伺服器重開）重新加入：從剛剛站的地方繼續，不會被送回出生點
    if (scene && scene.me) Object.assign(data, { x: Math.round(scene.me.x), y: Math.round(scene.me.y) });
    joinedToken = data.token;
    socket.emit('join', data, (res) => {
      if (!res.ok) { $('join-error').textContent = res.error; return; }
      joined = true;
      me = res.you;
      myOwned = res.you.owned || [];
      myEquip = res.you.equip || {};
      myFurn = res.you.furn || {};
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
    synced.then(doJoin);
  });

  // ---------------- 問題回報 ----------------
  // 網頁出錯、或畫面停住好幾秒，把當時的狀況送回伺服器記下來（data/client-errors.log），之後才查得到原因
  let reported = 0;
  function report(kind, msg) {
    if (reported++ >= 20) return;
    const open = [!$('games').hidden && 'games', !$('modal').hidden && $('modal-title').textContent, !$('music').hidden && 'music'].filter(Boolean);
    const body = { kind, msg: String(msg).slice(0, 500), name: (me && me.name) || '', open: open.join(','),
      ua: navigator.userAgent, screen: `${screen.width}x${screen.height}@${devicePixelRatio}`, mem: navigator.deviceMemory || 0, up: Math.round(performance.now() / 1000) };
    try { fetch('/api/client-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }); } catch (e) { /* 送不出去就算了 */ }
  }
  window.addEventListener('error', (e) => report('error', `${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => report('error', 'promise: ' + ((e.reason && e.reason.message) || e.reason)));
  // 每秒打一次卡，看得到畫面時隔了 3 秒以上才打到，就是畫面停住了（切到背景本來就會停，不算）
  let beat = performance.now();
  setInterval(() => {
    const now = performance.now(), gap = now - beat;
    beat = now;
    if (gap > 3000 && document.visibilityState === 'visible') report('freeze', `畫面停住 ${(gap / 1000).toFixed(1)} 秒`);
  }, 1000);
  document.addEventListener('visibilitychange', () => { beat = performance.now(); });

  // 重新連上：網路只是閃斷的話會接回原本的連線（socket.recovered），角色和畫面都不用動，補送一次位置就好
  socket.on('connect', () => {
    netState(false);
    if (!joined) return;
    if (!socket.recovered) return doJoin();
    if (scene && scene.me) socket.emit('move', { x: Math.round(scene.me.x), y: Math.round(scene.me.y), dir: scene.me.dir, moving: false });
  });
  // 連回來時伺服器已經把角色收掉了（斷線太久），重新加入
  socket.on('needJoin', () => { if (joined) doJoin(); });
  // 斷線一秒以上才顯示「重新連線中」，閃一下就好的不用打擾
  let netTimer = null;
  function netState(down) {
    clearTimeout(netTimer);
    if (down) netTimer = setTimeout(() => { $('net-badge').hidden = false; }, 1000);
    else $('net-badge').hidden = true;
  }
  // 關掉或離開頁面就直接離開總部，角色不用留著等
  window.addEventListener('pagehide', () => { if (joined) socket.disconnect(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted && !socket.connected) socket.connect(); });

  // ---------------- 更新提醒 ----------------
  // 伺服器每次啟動版本號都不同；重新連上時版本變了，代表伺服器更新過，請玩家重新整理
  let bootId = null, updateTimer = null, laterTimer = null;
  function showUpdate() {
    clearInterval(updateTimer);
    let sec = 10;
    $('update-sec').textContent = sec;
    $('update').hidden = false;
    updateTimer = setInterval(() => {
      sec -= 1;
      $('update-sec').textContent = sec;
      if (sec <= 0) location.reload();
    }, 1000);
  }
  $('update-now').onclick = () => location.reload();
  // 正在打怪的人可以先按稍後，2 分鐘後再提醒一次
  $('update-later').onclick = () => {
    clearInterval(updateTimer);
    $('update').hidden = true;
    clearTimeout(laterTimer);
    laterTimer = setTimeout(showUpdate, 2 * 60 * 1000);
    renderNotice();
  };
  // 管理員預告：畫面上方倒數
  let notice = null, noticeAt = 0;
  function renderNotice() {
    const bar = $('notice-bar');
    if (bootId && updatePending) {
      bar.hidden = false;
      bar.innerHTML = '';
      bar.append('總部已經更新，');
      const b = el('button', null, '按這裡重新整理'); b.type = 'button'; b.onclick = () => location.reload();
      bar.appendChild(b);
      return;
    }
    if (!notice) { bar.hidden = true; return; }
    const left = Math.max(0, notice.ms - (performance.now() - noticeAt));
    const m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
    bar.hidden = false;
    bar.textContent = notice.ready || left <= 0
      ? `${notice.text}・角色已經存好，總部馬上要重新啟動`
      : `${notice.text}・${m}:${String(s).padStart(2, '0')} 後更新`;
  }
  let updatePending = false;
  setInterval(renderNotice, 1000);
  socket.on('hello', (h) => {
    if (bootId && h.boot !== bootId) {
      updatePending = true;
      notice = null;
      showUpdate();
    } else bootId = h.boot;
    if (!updatePending) { notice = h.notice; noticeAt = performance.now(); }
    renderNotice();
  });
  socket.on('notice', (n) => { notice = n; noticeAt = performance.now(); renderNotice(); });
  // 在別的分頁登入或註冊了：這個分頁的角色也換成帳號的，畫面上才不會同時有兩個自己
  let joinedToken = '';
  window.addEventListener('storage', (e) => {
    if (e.key !== 'hq-token' || !e.newValue || !joined || e.newValue === joinedToken) return;
    joinedToken = e.newValue;
    // 等另一個分頁把角色資料寫完
    setTimeout(() => {
      showAcct();
      readProfile();
      myOwned = savedJson('hq-owned', []); myEquip = savedJson('hq-equip', {}); myFurn = savedJson('hq-furn', {});
      socket.disconnect(); socket.connect();
    }, 500);
  });
  // 同一個帳號在別的地方登入，這裡就停下來，不要自動重連搶回來
  socket.on('kicked', (msg) => {
    joined = false;
    try { sessionStorage.setItem('hq-kicked', msg); } catch (e) { /* 無痕模式 */ }
    location.reload();
  });
  try { $('join-error').textContent = sessionStorage.getItem('hq-kicked') || ''; sessionStorage.removeItem('hq-kicked'); } catch (e) { /* 無痕模式 */ }
  socket.on('disconnect', (reason) => { if (joined && reason !== 'io client disconnect') netState(true); });
  socket.on('playerJoined', (p) => scene && scene.addRemote(p));
  socket.on('playerMoved', (m) => scene && scene.moveRemote(m));
  socket.on('playerLeft', (id) => scene && scene.removeRemote(id));
  socket.on('playerAway', (a) => scene && scene.setAway(a.id, a.away));
  socket.on('monster', (m) => scene && scene.setMonster(m));
  socket.on('world', (w) => {
    if (!scene) return;
    scene.moveMobs(w.mobs);
    if (w.summons.length) scene.moveSummons(w.summons);
    if (w.boss) scene.moveMonster({ x: w.boss[0], y: w.boss[1] });
    if (w.storms) scene.moveStorms(w.storms);
  });
  socket.on('monsterHit', (m) => scene && scene.onMonsterHit(m));
  socket.on('mAttack', (a) => scene && scene.onMonsterAttack(a));
  socket.on('mAttackHit', (a) => scene && scene.onMonsterAttackHit(a));
  socket.on('skillFx', (fx) => scene && scene.onSkillFx(fx));
  socket.on('mob', (m) => scene && scene.setMob(m));
  socket.on('dungeon', (d) => scene && scene.setDungeon(d));
  socket.on('dgEnter', (e) => HQ_TAIWAN.play({ region: e.region, title: e.title, sub: 'DUNGEON · 副本' }));
  socket.on('dgStone', (e) => scene && scene.onStone(e));
  socket.on('dgBlock', (e) => scene && scene.onBlock(e));
  socket.on('dgStage', (e) => scene && scene.onDgStage(e));
  socket.on('dgBallHit', (e) => scene && scene.onBallHit(e));
  socket.on('dgAttack', (a) => scene && scene.onFuAttack(a));
  socket.on('dgAttackHit', (a) => scene && scene.onFuAttackHit(a));
  socket.on('dgClear', (c) => scene && scene.onDgClear(c));
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
  socket.on('ate', (a) => toast(`吃了 ${a.food}，血量 +${a.hp} `));
  socket.on('playerGear', (g) => scene && scene.onGear(g));
  socket.on('gearGot', (g) => {
    myOwned = g.owned;
    store('hq-owned', myOwned);
    const it = GR.GEAR[g.item];
    // 副本掉的武器，通關畫面會自己說
    if (it && !(it.dungeon && g.from !== 'admin')) toast(`${g.from === 'admin' ? '管理員送你' : '獲得'}【${it.rarity}】${it.name}！`, 'gear-' + g.item);
    if (scene && scene.me) scene.burst(scene.me.x, scene.me.y - 40, 16, 0xffd23f);
    if (modalKind === 'gear') openGear();
  });
  socket.on('cake', (c) => scene && scene.onCake(c.id, c.ms));
  socket.on('summon', (sm) => scene && scene.onSummon(sm));
  socket.on('summonHurt', (h) => scene && scene.onSummonHurt(h));
  socket.on('summonGone', (g) => scene && scene.onSummonGone(g));
  socket.on('decor', (d) => scene && scene.setDecor(d));
  socket.on('wall', (w) => scene && scene.onWall(w));
  socket.on('wallGone', (w) => scene && scene.onWallGone(w.id));
  socket.on('storm', (st) => scene && scene.onStorm(st));
  socket.on('stormGone', (st) => scene && scene.onStormGone(st.id));
  socket.on('stormBolt', (b) => scene && scene.onStormBolt(b));
  socket.on('decorGot', (g) => {
    myFurn = g.furn;
    store('hq-furn', myFurn);
    const it = DC.DECOR[g.k];
    if (it) toast(`撿到家具 ${it.name}！`, 'dec-' + g.item);
    if (modalKind === 'furn') openFurn();
  });
  socket.on('furnSync', (g) => {
    myFurn = g.furn;
    store('hq-furn', myFurn);
    if (!me || g.by !== me.id) toast('總部的家具被收乾淨了，你擺的都退回背包了');
    if (modalKind === 'furn') openFurn();
  });
  socket.on('drawState', (st) => DRAW.onState(st));
  socket.on('drawLog', (l) => DRAW.log(l));
  socket.on('drawStroke', (st) => DRAW.paint(st));
  socket.on('drawClear', () => DRAW.wipe());
  socket.on('drawUndo', (id) => DRAW.undo(id));
  socket.on('songState', (st) => SONG.onState(st));
  socket.on('songLog', (l) => SONG.log(l));
  socket.on('chat', (msg) => {
    addMessage(msg);
    if (!msg.system && scene) scene.showBubble(msg.id, msg.text);
  });

  // ---------------- 聊天 ----------------
  const chatInput = $('chat-input');
  function addMessage(msg) {
    const box = $('messages');
    const line = document.createElement('div');
    if (msg.system) { line.className = 'sys'; line.textContent = plain(msg.text); }
    else {
      const b = document.createElement('b');
      b.textContent = msg.name + '：';
      line.appendChild(b);
      line.appendChild(document.createTextNode(msg.text));
    }
    box.appendChild(line);
    while (box.children.length > 100) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
    // 聊天室收著的時候：亮一個小點，最新一句在旁邊浮出來幾秒（手機上才看得到）
    if ($('chat').classList.contains('collapsed') && !msg.system && joined && (!me || msg.id !== me.id)) {
      $('chat-dot').hidden = false;
      const peek = $('chat-peek');
      peek.textContent = msg.name + '：' + msg.text;
      peek.classList.remove('show'); void peek.offsetWidth; peek.classList.add('show');
    }
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
    else if (e.key === 'Escape') { chatInput.blur(); closeModal(); if (!$('games').hidden) ROOM.close(); }
  });
  // 正在打字或開著視窗的時候，鍵盤不控制角色
  // 只有能打字的欄位才算「在打字」；音量條、按鈕這些被點過之後還留著焦點，不該擋住走路
  const isTextField = (a) => !!a && (a.tagName === 'TEXTAREA' || a.isContentEditable ||
    (a.tagName === 'INPUT' && !/^(range|checkbox|radio|button|submit|reset|color|file|image)$/i.test(a.type)));
  const typing = () => isTextField(document.activeElement) || !$('modal').hidden || !$('games').hidden;
  // 剛點過音量條或按鈕的時候按移動 / 攻擊鍵：先把焦點拿掉，不然方向鍵會去調音量、空白鍵會再按一次那顆按鈕
  const GAME_KEYS = /^(w|a|s|d|j|k|l| |arrow(up|down|left|right))$/i;
  window.addEventListener('keydown', (e) => {
    const a = document.activeElement;
    if (!joined || !a || a === document.body || isTextField(a) || !GAME_KEYS.test(e.key)) return;
    if (!$('modal').hidden || !$('games').hidden) return;
    a.blur();  // 不能 preventDefault：Phaser 會跳過被擋掉的按鍵，角色就走不動了
  }, true);
  const setChat = (open) => {
    $('chat').classList.toggle('collapsed', !open);
    if (open) { $('chat-dot').hidden = true; $('chat-peek').classList.remove('show'); }
  };
  $('chat-toggle').addEventListener('click', () => setChat($('chat').classList.contains('collapsed')));
  if (window.innerWidth < 600 || window.innerHeight < 520) $('chat').classList.add('collapsed');

  // ---------------- 視訊 ----------------
  // 按「加入視訊」先打開房間列表：可以開新房間、輸入房號，或直接加入別人開的
  function openJitsi(code) {
    const name = encodeURIComponent(JSON.stringify(me ? me.name : ''));
    const url = `https://${config.jitsiDomain}/${encodeURIComponent(code)}` +
      `#userInfo.displayName=${name}&config.prejoinConfig.enabled=false`;
    window.open(url, '_blank', 'noopener');
  }
  const videoCode = (s) => String(s || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  let videoRooms = [];
  function joinVideo(code) {
    // 先開分頁（要在按下去的當下開，不然會被瀏覽器擋），再告訴伺服器
    openJitsi(code);
    socket.emit('videoJoin', code, (res) => { if (res && res.error) toast(res.error); });
    closeModal();
  }
  function renderVideo() {
    const box = el('div', 'modal-list video-list');
    const mins = (ms) => { const m = Math.floor(ms / 60000); return m < 1 ? '剛開' : m < 60 ? `開了 ${m} 分鐘` : `開了 ${Math.floor(m / 60)} 小時 ${m % 60} 分`; };
    videoRooms.forEach((r, i) => {
      const row = el('div', 'modal-row' + (i === 1 ? ' on' : ''));
      row.appendChild(el('div', 'modal-icon')).appendChild(icon('act-tv', ''));
      const inf = el('div', 'modal-info');
      inf.appendChild(el('b', null, r.name + (i === 1 ? '（最新）' : '')));
      inf.appendChild(el('span', 'mono tag', `房號 ${r.code}`));
      inf.appendChild(el('p', null, [r.by && `${r.by} 開的`, mins(r.ago), `${r.count} 人在裡面`].filter(Boolean).join(' · ')));
      row.appendChild(inf);
      const b = el('button', 'primary small', '加入');
      b.onclick = () => joinVideo(r.code);
      row.appendChild(b);
      box.appendChild(row);
    });
    // 開新房間
    const mk = el('form', 'video-form');
    const nm = el('input'); nm.maxLength = 16; nm.placeholder = '新房間名稱（可以不填）'; nm.autocomplete = 'off';
    mk.appendChild(nm); mk.appendChild(el('button', 'primary small', '＋ 開新房間'));
    mk.onsubmit = (e) => {
      e.preventDefault();
      const code = 'TyphoonHQ-' + Math.random().toString(36).slice(2, 8);
      openJitsi(code);
      socket.emit('videoCreate', { code, name: nm.value.trim() }, (res) => { if (res && res.error) toast(res.error); });
      closeModal();
    };
    // 輸入房號
    const jn = el('form', 'video-form');
    const cd = el('input'); cd.maxLength = 40; cd.placeholder = '輸入房號，例如 TyphoonHQ-ab12cd'; cd.autocomplete = 'off';
    jn.appendChild(cd); jn.appendChild(el('button', 'hud-btn tiny', '用房號加入'));
    jn.onsubmit = (e) => {
      e.preventDefault();
      const code = videoCode(cd.value);
      if (code.length < 3) { toast('房號至少要 3 個英文或數字'); return; }
      joinVideo(code);
    };
    box.appendChild(mk); box.appendChild(jn);
    box.appendChild(el('p', 'modal-hint', '視訊斷掉或會議過期了？開一個新房間，大家就能從這裡看到房號一起換過去。'));
    openModal('video', '視訊房間', box);
  }
  const openVideo = () => socket.emit('videoList', (res) => {
    videoRooms = (res && res.rooms) || [{ code: config.jitsiRoom, name: '總部大廳', by: '', ago: 0, count: 0 }];
    renderVideo();
  });
  // 戰情室的電視牆：選要開視訊還是進遊戲室
  function openWarRoom() {
    const box = el('div', 'modal-list');
    [['act-tv', '視訊會議', '開一個 Jitsi 分頁，大家面對面聊天', '加入視訊', openVideo],
      ['btn-games', '遊戲室', '你畫我猜、金曲猜歌王', '進去玩', () => { closeModal(); ROOM.open(); }]].forEach(([ik, name, desc, label, go]) => {
      const row = el('div', 'modal-row');
      row.appendChild(el('div', 'modal-icon')).appendChild(icon(ik, ''));
      const inf = el('div', 'modal-info');
      inf.appendChild(el('b', null, name));
      inf.appendChild(el('p', null, desc));
      row.appendChild(inf);
      const b = el('button', 'primary small', label);
      b.onclick = go;
      row.appendChild(b);
      box.appendChild(row);
    });
    openModal('warroom', '戰情室', box);
  }
  socket.on('videoRooms', (rooms) => { videoRooms = rooms; if (modalKind === 'video' && !$('modal').hidden) renderVideo(); });

  // ---------------- 小樹屋：同一間的人語音通話（WebRTC，聲音在玩家之間直接傳） ----------------
  // 伺服器只負責記誰在哪間、轉送連線資訊；新進屋的人負責跟屋裡每個人各連一條
  const TREE = (() => {
    let trees = [], myTree = null, stream = null, muted = false, actx = null;
    const peers = new Map(); // id -> { pc, audio, meter }
    const talking = new Set(); // 正在講話的人（只看得到同一間的）
    let meTalk = null, meterTimer = null;
    // 視訊：一次只送一個畫面（攝影機或螢幕），vmode 是 'cam'、'screen' 或 ''
    let vtrack = null, vmode = '';
    // 音量：整體一條＋每個人一條（0～200%），記在這台電腦上；人用帳號（沒登入用名字）認
    let master = Number(saved('hq-tree-master') == null ? 100 : saved('hq-tree-master'));
    const vols = savedJson('hq-tree-vols', {});
    const volKey = (m) => (m.user ? '@' + m.user : m.name);
    const memberOf = (id) => { for (const t of trees) for (const m of t.members) if (m.id === id) return m; return null; };
    const volOf = (id) => { const m = memberOf(id); const v = m && vols[volKey(m)]; return v == null ? 100 : v; };
    function applyVol(id) {
      const pr = peers.get(id);
      if (pr && pr.gain) pr.gain.gain.value = (master / 100) * (volOf(id) / 100);
    }
    const isOpen = () => modalKind === 'tree' && !$('modal').hidden;
    const mine = () => trees.find(t => t.id === myTree);
    // 進屋時伺服器會給一份 ICE 伺服器清單（有設 Cloudflare TURN 的話含中繼通行證）
    let iceList = null;
    const ice = () => ({ iceServers: iceList || config.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }] });
    const retried = new Set(); // 已經重連過一次的人
    const STATE = { connected: ['已接通', 'ok'], failed: ['連不上', 'bad'], closed: ['連不上', 'bad'] };
    const stateOf = (id) => { const pr = peers.get(id); return STATE[pr ? (pr.stuck ? 'failed' : pr.pc.connectionState) : 'new'] || ['連線中…', 'wait']; };
    function showState(id) {
      const chip = document.querySelector(`.tree-mem[data-id="${id}"] .tree-st`);
      if (!chip) return;
      const [t, c] = stateOf(id);
      chip.textContent = t; chip.className = 'tree-st ' + c;
    }

    // 音量計：每 150ms 看一次，超過門檻就算在講話
    // pr 有給的話（別人的聲音）順便接一個音量旋鈕再送到喇叭，才能調到 200%
    function meter(ms, pr) {
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        const an = actx.createAnalyser(); an.fftSize = 512;
        const src = actx.createMediaStreamSource(ms);
        src.connect(an);
        if (pr) { pr.gain = actx.createGain(); src.connect(pr.gain).connect(actx.destination); }
        const buf = new Uint8Array(an.fftSize);
        return () => { an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += (v - 128) * (v - 128); return Math.sqrt(s / buf.length); };
      } catch (e) { if (pr) pr.audio.muted = false; return () => 0; } // 不能用 WebAudio 的話退回直接用 <audio> 播
    }
    function tick() {
      const now = new Set();
      if (meTalk && !muted && meTalk() > 6) now.add(me.id);
      peers.forEach((pr, id) => { if (pr.meter && pr.meter() > 6) now.add(id); });
      const changed = now.size !== talking.size || [...now].some(id => !talking.has(id));
      if (!changed) return;
      talking.clear(); now.forEach(id => talking.add(id));
      marks();
      document.querySelectorAll('.tree-mem[data-id]').forEach(li => li.classList.toggle('talk', talking.has(li.dataset.id)));
      tileEls.forEach((tl, id) => tl.box.classList.toggle('talk', talking.has(id)));
    }

    function peer(id) {
      if (peers.has(id)) return peers.get(id);
      const pc = new RTCPeerConnection(ice());
      const pr = { pc, audio: new Audio(), meter: null };
      pr.audio.autoplay = true; pr.audio.playsInline = true; pr.audio.muted = true; // 聲音走 WebAudio 的音量旋鈕，<audio> 只負責讓瀏覽器收音
      stream.getTracks().forEach(tr => pc.addTrack(tr, stream));
      pc.onicecandidate = (e) => { if (e.candidate) socket.emit('rtc', { to: id, data: { ice: e.candidate } }); };
      pc.ontrack = (e) => {
        if (e.track.kind === 'video') { pr.video = new MediaStream([e.track]); tiles(); return; }
        const ms = e.streams[0] || new MediaStream([e.track]);
        pr.audio.srcObject = ms;
        pr.audio.play().catch(() => {});
        pr.meter = meter(ms, pr);
        applyVol(id);
      };
      // 連不上：重來一次（由 id 比較小的那邊重新打過去，避免兩邊同時打）；還是不行才說
      const fail = () => {
        if (peers.get(id) !== pr || pr.failed) return;
        pr.failed = true;
        showState(id);
        if (!retried.has(id)) {
          retried.add(id);
          if (me && me.id < id) setTimeout(() => { if (peers.get(id) === pr && myTree) { drop(id); call(id).catch(e => console.warn('call', e)); } }, 800);
        } else toast(`跟 ${nameOf(id)} 的語音連不上，可能是網路環境擋住了`);
      };
      // 有些網路連「失敗」都不會回報，一直卡在連線中：15 秒還沒接通就當作連不上
      pr.watch = setTimeout(() => { if (pc.connectionState !== 'connected') { pr.stuck = true; fail(); } }, 15000);
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') { retried.delete(id); clearTimeout(pr.watch); pr.stuck = false; }
        showState(id);
        if (pc.connectionState === 'failed') fail();
      };
      peers.set(id, pr);
      return pr;
    }
    // 每 30 秒算一次有多少聲音是走中繼伺服器的，回報給伺服器統計用量（到上限伺服器就不再發中繼通行證）
    async function relayBytes(pr) {
      try {
        const st = await pr.pc.getStats();
        let pair = null;
        st.forEach(r => { if (r.type === 'transport' && r.selectedCandidatePairId) pair = st.get(r.selectedCandidatePairId); });
        if (!pair) st.forEach(r => { if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') pair = r; });
        if (!pair) return 0;
        const lc = st.get(pair.localCandidateId), rc = st.get(pair.remoteCandidateId);
        const total = (pair.bytesSent || 0) + (pair.bytesReceived || 0);
        const relay = (lc && lc.candidateType === 'relay') || (rc && rc.candidateType === 'relay');
        const delta = relay ? Math.max(0, total - (pr.relayBytes || 0)) : 0;
        pr.relayBytes = total;
        return delta;
      } catch (e) { return 0; }
    }
    setInterval(async () => {
      if (!myTree || !peers.size) return;
      let n = 0;
      for (const pr of peers.values()) n += await relayBytes(pr);
      if (n > 0) socket.emit('turnUsage', n);
    }, 30000);
    function drop(id) {
      const pr = peers.get(id);
      if (!pr) return;
      pr.pc.close(); pr.audio.srcObject = null; clearTimeout(pr.watch);
      if (pr.gain) pr.gain.disconnect();
      peers.delete(id); talking.delete(id);
      tiles();
    }
    // 每條連線一開始就留好一個視訊位置，之後開關攝影機、換成螢幕只是換畫面，不用重新連線
    const vtx = (pc) => pc.getTransceivers().find(t => t.receiver.track && t.receiver.track.kind === 'video');
    const KBPS = { cam: 250, screen: 900 };
    async function sendVideo(pr) {
      const t = vtx(pr.pc);
      if (!t) return;
      try {
        await t.sender.replaceTrack(vtrack);
        if (!vtrack) return;
        const prm = t.sender.getParameters();
        if (!prm.encodings || !prm.encodings.length) return; // 還沒談好，談好之後會再呼叫一次
        prm.encodings[0].maxBitrate = KBPS[vmode] * 1000;
        await t.sender.setParameters(prm);
      } catch (e) { console.warn('video', e); }
    }
    async function call(id) {
      const pr = peer(id), { pc } = pr;
      if (!vtx(pc)) pc.addTransceiver('video', { direction: 'sendrecv' });
      await sendVideo(pr);
      await pc.setLocalDescription(await pc.createOffer());
      socket.emit('rtc', { to: id, data: { sdp: pc.localDescription } });
    }
    // 同一個人的連線資訊要照順序處理（ice 可能比 offer 先處理完），所以每個人排一條隊
    socket.on('rtc', ({ from, data }) => {
      if (!myTree || !stream || !data) return;
      if (!data.sdp && !peers.has(from)) return;
      // 已經連過的人又送 offer 來，代表對方在重連：丟掉舊的重新接
      if (data.sdp && data.sdp.type === 'offer' && peers.has(from) && peers.get(from).pc.remoteDescription) drop(from);
      const pr = peer(from);
      pr.chain = (pr.chain || Promise.resolve()).then(async () => {
        const { pc } = pr;
        if (data.sdp) {
          await pc.setRemoteDescription(data.sdp);
          if (data.sdp.type === 'offer') {
            const t = vtx(pc);
            if (t) t.direction = 'sendrecv';
            await sendVideo(pr);
            await pc.setLocalDescription(await pc.createAnswer());
            socket.emit('rtc', { to: from, data: { sdp: pc.localDescription } });
          }
          sendVideo(pr); // 談好了才能設畫質上限
        } else if (data.ice) await pc.addIceCandidate(data.ice);
      }).catch(e => console.warn('rtc', e));
    });

    const nameOf = (id) => { for (const t of trees) for (const m of t.members) if (m.id === id) return m.name; return '對方'; };
    const members = () => { const s = new Set(); trees.forEach(t => t.members.forEach(m => s.add(m.id))); return s; };
    const mutedSet = () => { const s = new Set(); trees.forEach(t => t.members.forEach(m => { if (m.muted) s.add(m.id); })); return s; };
    const marks = () => { if (scene) scene.treeMarks(members(), talking, mutedSet()); };

    // 麥克風一定要在按下去的當下要，不然手機會擋
    async function mic() {
      if (stream) return true;
      if (!navigator.mediaDevices || !window.RTCPeerConnection) { toast('這個瀏覽器不支援語音通話'); return false; }
      // 瀏覽器在等你回答麥克風權限時會一直卡著，先說一聲，等太久再提醒去看網址列
      toast('正在打開麥克風…');
      const slow = setTimeout(() => toast('麥克風還沒打開，看一下網址列旁邊是不是在問你能不能用麥克風'), 6000);
      // 第一次用回音消除、降噪；打不開（例如藍牙耳機正在切換成可以講話的模式）就等半秒用最基本的設定再試一次
      const get = (audio) => navigator.mediaDevices.getUserMedia({ audio });
      try {
        try { stream = await get({ echoCancellation: true, noiseSuppression: true, autoGainControl: true }); } catch (e) {
          if (e.name === 'NotAllowedError' || e.name === 'SecurityError') throw e;
          await new Promise(r => setTimeout(r, 500));
          stream = await get(true);
        }
      } catch (e) {
        console.warn('mic', e.name, e.message);
        toast({
          NotAllowedError: '沒有拿到麥克風權限，到瀏覽器網址列旁邊打開麥克風再試一次',
          SecurityError: '沒有拿到麥克風權限，到瀏覽器網址列旁邊打開麥克風再試一次',
          NotFoundError: '找不到麥克風，確認耳機或麥克風有接好',
          NotReadableError: '麥克風打不開，可能被別的程式占用（Discord、LINE、會議軟體），或藍牙耳機正在切換，關掉再試一次',
        }[e.name] || `麥克風打不開（${e.name}），再試一次看看`);
        return false;
      } finally { clearTimeout(slow); }
      muted = false;
      meTalk = meter(stream);
      clearInterval(meterTimer); meterTimer = setInterval(tick, 150);
      return true;
    }
    function hangUp() {
      stopVideo();
      [...peers.keys()].forEach(drop);
      if (stream) stream.getTracks().forEach(tr => tr.stop());
      stream = null; meTalk = null; myTree = null; muted = false;
      clearInterval(meterTimer); talking.clear();
      renderBtn();
    }
    function enter(res) {
      if (!res || !res.ok) { toast((res && res.error) || '進不去'); if (!myTree) hangUp(); return; }
      [...peers.keys()].forEach(drop); // 換屋：先跟舊屋的人斷線
      stopVideo(); // 伺服器換屋時已經當作關掉視訊了
      myTree = res.id;
      if (res.ice) iceList = res.ice;
      retried.clear();
      res.peers.forEach(id => call(id).catch(e => console.warn('call', e)));
      renderBtn();
      if (isOpen()) render(); // 名單可能比回應先到，這時卡片還不知道你已經在屋裡
    }
    // 伺服器 8 秒沒回應（通常是更新後 node 還沒重開，不認得這個指令）就說出來，不要安靜沒反應
    let busy = false;
    async function ask(ev, data) {
      if (busy) return;
      busy = true;
      if (!(await mic())) { busy = false; return; }
      socket.timeout(8000).emit(ev, data, (err, res) => {
        busy = false;
        enter(err ? { ok: false, error: '伺服器沒回應，可能伺服器還沒重開，重開之後大家重新整理就好' } : res);
      });
    }
    const create = (name) => ask('treeCreate', { name });
    const join = (id) => ask('treeJoin', id);
    function leave() { socket.emit('treeLeave'); hangUp(); marks(); }
    function toggleMute() {
      if (!stream) return;
      muted = !muted;
      stream.getAudioTracks().forEach(tr => { tr.enabled = !muted; });
      socket.emit('treeMute', muted);
      renderBtn();
      if (isOpen()) render();
    }

    // ---- 視訊、分享螢幕 ----
    const canScreen = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    function stopVideo() {
      if (vtrack) { vtrack.onended = null; vtrack.stop(); }
      vtrack = null; vmode = '';
    }
    let vbusy = false;
    // 按同一顆就關掉；開攝影機時在分享螢幕（或反過來）就直接換過去
    async function setVideo(mode) {
      if (!myTree || vbusy) return;
      if (mode === vmode) mode = '';
      let tr = null;
      if (mode) {
        vbusy = true;
        try {
          const ms = mode === 'cam'
            ? await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15, max: 15 }, facingMode: 'user' } })
            : await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 8, max: 10 } }, audio: false });
          tr = ms.getVideoTracks()[0];
        } catch (e) {
          console.warn('video', e.name, e.message);
          if (e.name !== 'NotAllowedError' || mode === 'cam') toast(mode === 'cam' ? {
            NotAllowedError: '沒有拿到攝影機權限，到瀏覽器網址列旁邊打開攝影機再試一次',
            NotFoundError: '找不到攝影機',
            NotReadableError: '攝影機打不開，可能被別的程式占用（會議軟體、相機 app），關掉再試一次',
          }[e.name] || `攝影機打不開（${e.name}）` : `沒辦法分享螢幕（${e.name}）`);
        } finally { vbusy = false; }
        if (!tr) return;
        if (!myTree) { tr.stop(); return; } // 等權限的時候已經離開了
        if (mode === 'screen') tr.contentHint = 'detail';
      }
      stopVideo();
      vtrack = tr; vmode = tr ? mode : '';
      // 瀏覽器上方的「停止分享」也要算關掉
      if (tr) tr.onended = () => { if (vtrack === tr) setVideo(vmode); };
      peers.forEach(sendVideo);
      socket.emit('treeVideo', vmode);
      renderBtn(); tiles();
      if (isOpen()) render();
    }

    // 視訊小窗：可以拖、可以收起來；點一下畫面放大
    let vbox = null, vfold = false, vstage = false;
    const vpos = savedJson('hq-tree-vpos', null);
    function vpanel() {
      if (vbox) return vbox;
      vbox = el('div', 'tree-video');
      const head = el('div', 'tv-head');
      head.appendChild(el('b', null, '小樹屋視訊'));
      const fb = el('button', 'tv-fold', '▾'); fb.type = 'button'; fb.title = '收起來';
      fb.onclick = () => { vfold = !vfold; vbox.classList.toggle('folded', vfold); fb.textContent = vfold ? '▴' : '▾'; };
      // 大畫面：同一個小窗撐滿畫面，大家排成格子；有人分享螢幕就讓螢幕占大部分
      const sb = el('button', 'tv-stage-btn', '大畫面'); sb.type = 'button';
      sb.onclick = () => stage(!vstage);
      head.append(sb, fb);
      vbox.append(head, el('div', 'tv-grid'));
      if (vpos) { vbox.style.left = vpos.x + 'px'; vbox.style.top = vpos.y + 'px'; vbox.style.right = 'auto'; }
      // 拖標題列移動
      head.addEventListener('pointerdown', (e) => {
        if (e.target === fb || e.target === sb || vstage) return;
        const r = vbox.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
        head.setPointerCapture(e.pointerId);
        const mv = (ev) => {
          const x = Math.max(0, Math.min(innerWidth - r.width, ev.clientX - dx)), y = Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy));
          Object.assign(vbox.style, { left: x + 'px', top: y + 'px', right: 'auto' });
        };
        const up = () => {
          head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up);
          store('hq-tree-vpos', { x: parseInt(vbox.style.left, 10) || 0, y: parseInt(vbox.style.top, 10) || 0 });
        };
        head.addEventListener('pointermove', mv); head.addEventListener('pointerup', up);
      });
      document.body.appendChild(vbox);
      return vbox;
    }
    function stage(on) {
      if (!vbox) return;
      vstage = !!on && !vbox.hidden;
      vbox.classList.toggle('stage', vstage);
      vbox.querySelector('.tv-stage-btn').textContent = vstage ? '✕ 縮小' : '大畫面';
      if (vstage && vfold) vbox.querySelector('.tv-fold').click();
      tiles(); // 大畫面要多放沒開視訊的人的頭像
    }
    addEventListener('keydown', (e) => { if (vstage && e.key === 'Escape') stage(false); });
    addEventListener('resize', () => { if (vstage) layout(); });
    // 大畫面的排法：沒人分享螢幕就排成差不多正方形的格子；有的話螢幕放主畫面，其他人排在旁邊（直的螢幕排在下面）
    function layout() {
      const grid = vbox && vbox.querySelector('.tv-grid');
      if (!grid) return;
      const list = [...tileEls.values()].map(t => t.box);
      list.forEach(b => { b.style.gridRow = b.style.gridColumn = ''; });
      if (!vstage) { grid.style.gridTemplateColumns = grid.style.gridTemplateRows = ''; return; }
      const main = list.find(b => b.classList.contains('screen'));
      const rest = list.filter(b => b !== main);
      const tall = innerHeight > innerWidth;
      if (main) {
        grid.prepend(main);
        const k = Math.max(1, rest.length);
        if (tall) {
          grid.style.gridTemplateColumns = `repeat(${k}, 1fr)`;
          grid.style.gridTemplateRows = rest.length ? '1fr 24%' : '1fr';
          main.style.gridColumn = '1 / -1';
        } else {
          grid.style.gridTemplateColumns = rest.length ? '1fr minmax(140px, 22%)' : '1fr';
          grid.style.gridTemplateRows = `repeat(${k}, 1fr)`;
          main.style.gridRow = '1 / -1';
        }
        return;
      }
      const n = list.length;
      let cols = Math.ceil(Math.sqrt(n));
      if (tall) cols = n <= 3 ? 1 : 2;
      grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      grid.style.gridTemplateRows = `repeat(${Math.ceil(n / cols)}, 1fr)`;
    }
    const tileEls = new Map(); // id -> { box, video }
    function tiles() {
      const want = new Map(); // id -> { ms, mode, name } 或 { face: m }（大畫面裡沒開視訊的人放頭像）
      const t = mine();
      if (myTree && vtrack) want.set(me.id, { ms: new MediaStream([vtrack]), mode: vmode, name: '你', self: true });
      if (t) t.members.forEach(m => {
        const pr = peers.get(m.id);
        if (m.id !== me.id && m.video && pr && pr.video) want.set(m.id, { ms: pr.video, mode: m.video, name: m.name });
      });
      const empty = !want.size;
      if (!empty && vstage && t) t.members.forEach(m => { if (!want.has(m.id)) want.set(m.id, { face: m, name: m.id === me.id ? '你' : m.name }); });
      const kindOf = (w) => (w.face ? 'face' : 'video');
      tileEls.forEach((tl, id) => {
        const w = want.get(id);
        if (!w || kindOf(w) !== tl.kind) { if (tl.video) tl.video.srcObject = null; tl.box.remove(); tileEls.delete(id); }
      });
      if (empty) {
        if (vbox) { vbox.hidden = true; if (vstage) { vstage = false; vbox.classList.remove('stage'); vbox.querySelector('.tv-stage-btn').textContent = '大畫面'; } }
        return;
      }
      const grid = vpanel().querySelector('.tv-grid');
      vbox.hidden = false;
      want.forEach((w, id) => {
        let tl = tileEls.get(id);
        if (!tl) {
          const box = el('div', 'tv-tile');
          let v = null;
          if (w.face) {
            box.classList.add('face');
            const f = el('div', 'tv-face');
            const u = bigFaceOf(id, 320);
            if (u) { const i = document.createElement('img'); i.src = u; i.alt = ''; f.appendChild(i); }
            else f.appendChild(icon('cls-' + (w.face.cls || 'staff'), ''));
            box.appendChild(f);
          } else {
            v = document.createElement('video');
            v.autoplay = true; v.playsInline = true; v.muted = true; // 聲音另外走語音那條
            box.appendChild(v);
            box.onclick = () => box.classList.toggle('big');
          }
          box.appendChild(el('span', 'tv-name'));
          grid.appendChild(box);
          tl = { box, video: v, track: null, kind: kindOf(w) };
          tileEls.set(id, tl);
        }
        if (tl.video) {
          const tr = w.ms.getVideoTracks()[0];
          if (tl.track !== tr) { tl.track = tr; tl.video.srcObject = w.ms; tl.video.play().catch(() => {}); }
        }
        tl.box.classList.toggle('mirror', !!w.self && w.mode === 'cam');
        tl.box.classList.toggle('screen', w.mode === 'screen');
        tl.box.classList.toggle('talk', talking.has(id));
        tl.box.querySelector('.tv-name').textContent = w.mode === 'screen' ? `${w.name} 的螢幕` : w.name;
      });
      layout();
    }

    function set(list) {
      trees = list || [];
      const t = mine();
      // 伺服器那邊已經不在屋裡了（斷線太久被請出去），這邊也掛掉
      if (myTree && (!t || !t.members.some(m => m.id === me.id))) { hangUp(); toast('你離開小樹屋了'); }
      else if (t) [...peers.keys()].forEach(id => { if (!t.members.some(m => m.id === id)) drop(id); else applyVol(id); });
      marks();
      renderBtn();
      tiles();
      if (isOpen() && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('.tree-vol'))) render();
    }
    socket.on('trees', set);
    const refresh = () => socket.emit('treeList', (r) => set(r && r.trees));

    // 工具列上的按鈕：在屋裡的時候多一顆麥克風開關
    // 工具列：小樹屋按鈕跟麥克風、視訊、分享螢幕包成同一顆膠囊，一看就知道是一組
    // 開關（卡片上那排有字的也是）都從這裡做出來，狀態一致
    function tools(withText) {
      const out = [];
      const mk = (cls, on, ic, text, title, fn) => {
        const b = el('button', cls + (on ? ' on' : ' off')); b.type = 'button';
        b.append(icon(ic, ''));
        if (withText) b.append(el('span', null, text));
        b.title = title; b.onclick = fn;
        out.push(b);
      };
      mk('tree-sw', !muted, muted ? 'btn-mic-off' : 'btn-mic', muted ? '麥克風：靜音中' : '麥克風：開著',
        muted ? '麥克風關著，點一下打開' : '麥克風開著，點一下靜音', toggleMute);
      mk('tree-sw', vmode === 'cam', vmode === 'cam' ? 'btn-cam' : 'btn-cam-off', vmode === 'cam' ? '視訊：開著' : '視訊：關著',
        vmode === 'cam' ? '視訊開著，點一下關掉' : '開視訊', () => setVideo('cam'));
      if (canScreen) mk('tree-sw', vmode === 'screen', 'btn-screen', vmode === 'screen' ? '分享中，按一下停止' : '分享螢幕',
        vmode === 'screen' ? '正在分享螢幕，點一下停止' : '分享螢幕', () => setVideo('screen'));
      return out;
    }
    function renderBtn() {
      const box = $('inventory');
      if (!box) return;
      box.querySelectorAll('.tree-group').forEach(b => b.remove());
      const g = el('div', 'tree-group' + (myTree ? ' in tree-tool' : ''));
      const b = el('button', 'inv-item bag-btn tree-btn'); b.type = 'button';
      b.append(icon('btn-tree', ''), el('span', 'tree-btn-t', myTree ? ' 小樹屋中' : ' 小樹屋'));
      b.onclick = open;
      g.appendChild(b);
      if (myTree) tools(false).forEach(x => g.appendChild(x));
      box.insertBefore(g, box.querySelector('.kit-btn'));
    }

    const mins = (ms) => { const m = Math.floor(ms / 60000); return m < 1 ? '剛蓋好' : m < 60 ? `蓋了 ${m} 分鐘` : `蓋了 ${Math.floor(m / 60)} 小時`; };
    function face(m) {
      const f = el('span', 'tree-face');
      const u = faceOf(m.id);
      if (u) { const i = document.createElement('img'); i.src = u; i.alt = ''; f.appendChild(i); }
      else f.appendChild(icon('cls-' + (m.cls || 'staff'), ''));
      return f;
    }
    // 音量條：放開就把焦點還給遊戲，不然方向鍵會去調音量、人走不動
    function slider(val, onSet, label) {
      const w = el('label', 'tree-vol');
      const r = el('input'); r.type = 'range'; r.min = 0; r.max = 200; r.step = 10; r.value = val;
      r.setAttribute('aria-label', label);
      const n = el('small', 'mono', val + '%');
      r.oninput = () => { n.textContent = r.value + '%'; onSet(Number(r.value)); };
      r.onchange = r.onpointerup = () => r.blur();
      w.append(r, n);
      return w;
    }
    function render() {
      const box = el('div', 'tree-list');
      if (myTree) {
        const mv = el('div', 'tree-master');
        mv.append(icon('btn-vol', '', 'tree-vol-ic'), el('b', null, '語音音量'),
          slider(master, (v) => { master = v; store('hq-tree-master', String(v)); peers.forEach((_, id) => applyVol(id)); }, '整體語音音量'));
        box.appendChild(mv);
      }
      if (!trees.length) box.appendChild(el('p', 'tree-empty', '現在還沒有小樹屋，蓋一間邀大家進來聊天吧！'));
      trees.forEach(t => {
        const here = t.id === myTree;
        const card = el('div', 'tree-card' + (here ? ' here' : ''));
        const head = el('div', 'tree-head');
        head.appendChild(icon('btn-tree', '', 'tree-ic'));
        const inf = el('div', 'tree-inf');
        inf.appendChild(el('b', null, t.name));
        inf.appendChild(el('small', null, `屋主 ${t.ownerName} · ${mins(t.ago)} · ${t.members.length}/${t.cap} 人`));
        head.appendChild(inf);
        if (here) {
          const lv = el('button', 'hud-btn tiny', '離開'); lv.type = 'button';
          lv.onclick = () => { leave(); render(); };
          head.appendChild(lv);
        } else {
          const full = t.members.length >= t.cap;
          const go = el('button', 'primary small', full ? '客滿' : '進去'); go.type = 'button';
          go.disabled = full;
          go.onclick = () => join(t.id);
          head.appendChild(go);
        }
        card.appendChild(head);
        if (here) {
          const row = el('div', 'tree-ctrl');
          tools(true).forEach(x => row.appendChild(x));
          const st = el('button', 'tree-sw stage-sw'); st.type = 'button';
          const any = tileEls.size > 0;
          st.append(icon('btn-stage', ''), el('span', null, '大畫面'));
          st.disabled = !any;
          st.title = any ? '把大家的畫面放大' : '有人開視訊或分享螢幕才能用';
          st.onclick = () => { closeModal(); stage(true); };
          row.appendChild(st);
          card.appendChild(row);
        }
        const ul = el('ul', 'tree-mems');
        t.members.forEach(m => {
          const li = el('li', 'tree-mem' + (talking.has(m.id) ? ' talk' : '') + (m.id === (me && me.id) ? ' me' : ''));
          li.dataset.id = m.id;
          li.appendChild(face(m));
          const who = el('div', 'tree-who');
          const nm = el('b', null, m.name);
          // 名字旁邊：靜音、開視訊／分享螢幕的小圖示（放臉上會擋到）
          const line = el('div', 'tree-line');
          line.appendChild(nm);
          if (m.muted) line.appendChild(icon('btn-mic-off', '', 'tree-flag'));
          if (m.video) line.appendChild(icon(m.video === 'screen' ? 'btn-screen' : 'btn-cam', '', 'tree-flag'));
          who.appendChild(line);
          // 同屋的別人：顯示你跟他之間的連線狀態
          if (here && m.id !== (me && me.id)) { const [t2, c2] = stateOf(m.id); nm.appendChild(el('span', 'tree-st ' + c2, t2)); }
          const c = ST.CLASSES[m.cls] || ST.CLASSES.staff;
          who.appendChild(el('small', 'mono', `${m.user ? '@' + m.user : '訪客'} · ${plain(c.name)} Lv.${m.level || 1}`));
          li.appendChild(who);
          // 同一間的別人：可以單獨調他的音量
          if (here && m.id !== (me && me.id)) li.appendChild(slider(volOf(m.id), (v) => { vols[volKey(m)] = v; store('hq-tree-vols', vols); applyVol(m.id); }, `${m.name} 的音量`));
          ul.appendChild(li);
        });
        card.appendChild(ul);
        box.appendChild(card);
      });
      const mk = el('form', 'video-form');
      const nm = el('input'); nm.maxLength = 12; nm.placeholder = '小樹屋名字（可以不填）'; nm.autocomplete = 'off';
      mk.appendChild(nm); mk.appendChild(el('button', 'primary small', myTree ? '蓋一間搬過去' : '蓋一間'));
      mk.onsubmit = (e) => { e.preventDefault(); create(nm.value.trim()); };
      box.appendChild(mk);
      box.appendChild(el('p', 'modal-hint', '同一間小樹屋的人可以直接講話，走到哪都聽得到。一間最多 8 人，第一次進去瀏覽器會問你能不能用麥克風。進去之後工具列上可以開視訊、分享螢幕。'));
      openModal('tree', '小樹屋', box);
    }
    function open() { render(); refresh(); }
    return { open, refresh, renderBtn, hangUp, inTree: () => !!myTree };
  })();

  // ---------------- 彈出視窗 ----------------
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  // 拿掉文字裡的 emoji（遊戲介面不用系統 emoji，要圖就畫手繪的）
  const EMOJI = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D\p{Extended_Pictographic}?|[\u{1F3FB}-\u{1F3FF}])*/gu;
  const plain = (t) => String(t == null ? '' : t).replace(EMOJI, '').replace(/[ \u3000]{2,}/g, ' ').replace(/\s+([，。！？、：」）])/g, '$1').trim();
  // 手繪 icon（public/icons.js）；還沒有手繪版的用 emoji 加墨線外框
  const icon = (key, emoji, cls) => window.HQ_ICONS ? HQ_ICONS.el(key, emoji, cls) : el('span', cls, emoji);
  let modalKind = null;
  function openModal(kind, title, body) {
    modalKind = kind;
    $('modal').classList.remove('wide');
    $('modal-title').textContent = plain(title);
    const box = $('modal-body');
    box.innerHTML = '';
    box.appendChild(body);
    $('modal').hidden = false;
    chatInput.blur();
  }
  function closeModal() { if ($('modal').contains(document.activeElement)) document.activeElement.blur(); $('modal').hidden = true; $('modal').classList.remove('wide'); modalKind = null; }
  $('modal-x').addEventListener('click', closeModal);
  $('modal').addEventListener('pointerdown', (e) => { if (e.target === $('modal')) closeModal(); });

  // ---------------- 背包 ----------------
  const ITEM_INFO = {
    noodle: { desc: '到休息區的煮泡麵區，站在爐台旁煮來吃，補 35 血。', use: '去煮泡麵區' },
    water: { desc: '喝了補 25 魔力，在哪裡都能喝。', use: '喝一瓶' },
    veggie: { desc: '煮泡麵時會自動加進去，變成蔬菜泡麵，補 65 血。', use: null },
    bubbletea: { desc: `全糖去冰！補 ${ST.FOODS.bubbletea.hp} 血、${ST.FOODS.bubbletea.mp} 魔力，在哪裡都能喝。`, use: '喝一杯' },
    chicken: { desc: `大大一片、不要切不要辣。補 ${ST.FOODS.chicken.hp} 血、${ST.FOODS.chicken.mp} 魔力，在哪裡都能吃。`, use: '吃一片' },
  };
  const EDIBLE = ['water', 'bubbletea', 'chicken'];
  let myInv = {};
  let kitFolded = folded('kit', TOUCH);
  function renderInventory(inv) {
    myInv = inv || {};
    store('hq-inv', myInv); // 沒登入的話，重新整理後靠這份把背包帶回來
    const box = $('inventory');
    box.innerHTML = '';
    // 物資都收在背包裡，按鈕上的小數字是總共有幾個
    const total = Object.keys(MAP.ITEMS).reduce((n, k) => n + (myInv[k] || 0), 0);
    const bag = el('button', 'inv-item bag-btn');
    bag.append(icon('btn-bag', '🎒'), ' 背包');
    if (total) bag.appendChild(el('span', 'bag-n', String(total > 99 ? '99+' : total)));
    bag.title = Object.entries(MAP.ITEMS).map(([k, it]) => `${it.name} × ${myInv[k] || 0}`).join('\n');
    bag.onclick = openBag;
    box.appendChild(bag);
    const gear = el('button', 'inv-item bag-btn');
    gear.append(icon('btn-gear', '👗'), ' 裝備');
    gear.onclick = openGear;
    box.appendChild(gear);
    const furn = el('button', 'inv-item bag-btn');
    furn.append(icon('btn-furn', '🪑'), ' 家具');
    furn.onclick = openFurn;
    box.appendChild(furn);
    const song = el('button', 'inv-item bag-btn');
    song.append(icon('btn-song', '🎵'), ' 點歌');
    song.onclick = () => MUSIC.open();
    box.appendChild(song);
    // 工具包：把上面四顆收起來，收著的時候背包數量改標在這顆上
    const kit = el('button', 'inv-item bag-btn kit-btn');
    kit.append(icon('btn-kit', '🧰'), el('span', 'kit-label', ' 工具包'));
    if (total) kit.appendChild(el('span', 'bag-n', String(total > 99 ? '99+' : total)));
    kit.title = '工具包';
    kit.onclick = () => { kitFolded = !kitFolded; store('hq-fold-kit', kitFolded ? '1' : '0'); box.classList.toggle('folded', kitFolded); };
    box.appendChild(kit);
    TREE.renderBtn();
    box.classList.toggle('folded', kitFolded);
    if (modalKind === 'bag') openBag();
  }
  // ---------------- 點唱機：全場一條 YouTube 點歌隊伍，所有人同步聽 ----------------
  const MUSIC = (() => {
    let draft = '', results = null;
    let state = {}, gotAt = 0, area = 'all', player = null, apiP = null, playing = null, startTimer = null;
    let vol = Number(saved('hq-vol') == null ? 60 : saved('hq-vol')), muted = saved('hq-mute') === '1';
    const cur = () => (state[area] && state[area].now) || null;
    // 現在這首應該播到第幾秒
    const pos = () => { const n = cur(); return n ? (n.at + performance.now() - gotAt) / 1000 : 0; };
    function api() {
      if (apiP) return apiP;
      apiP = new Promise((res, rej) => {
        window.onYouTubeIframeAPIReady = res;
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.onerror = () => { apiP = null; rej(); };
        document.head.appendChild(s);
      }).then(() => new Promise((res) => {
        player = new YT.Player('music-yt', {
          width: 192, height: 108,
          playerVars: { playsinline: 1, controls: 0, disablekb: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
          events: { onReady: () => res(), onStateChange: onState, onError },
        });
      }));
      return apiP;
    }
    function onState(e) {
      // 真的有聲音在播的時候，唱片才會轉、唱臂才會放下
      $('music').classList.toggle('playing', e.data === YT.PlayerState.PLAYING);
      if (e.data === YT.PlayerState.PLAYING) $('music-start').hidden = true;
      if (e.data === YT.PlayerState.ENDED && playing) socket.emit('musicEnded', playing);
    }
    function onError() {
      const vid = playing;
      toast('這首播不了，等一下會自動換下一首');
      setTimeout(() => { if (playing === vid) socket.emit('musicEnded', vid); }, 6000);
    }
    function applyVol() {
      $('music-vol').value = vol;
      $('music-mute').replaceChildren(icon(muted || !vol ? 'btn-mute' : 'btn-vol', ''));
      if (!player || !player.setVolume) return;
      player.setVolume(vol);
      if (muted) player.mute(); else player.unMute();
    }
    // 跟伺服器的進度對齊：換歌、跳到對的秒數，播不出聲音就顯示「點一下開始聽」
    function sync() {
      const n = cur();
      $('music').hidden = !n;
      if (!n) {
        $('music').classList.remove('playing');
        playing = null;
        if (player && player.stopVideo) player.stopVideo();
        return;
      }
      $('music-title').textContent = n.title;
      $('music-by').textContent = `DJ ${n.byName}`;
      $('music-art').src = `https://i.ytimg.com/vi/${n.vid}/mqdefault.jpg`;
      if (n.vid === playing) return;
      playing = n.vid;
      api().then(() => {
        if (playing !== n.vid) return;
        const wait = Math.max(0, -pos());
        clearTimeout(startTimer);
        startTimer = setTimeout(() => {
          if (playing !== n.vid) return;
          player.loadVideoById({ videoId: n.vid, startSeconds: Math.max(0, pos()) });
          applyVol();
          // 手機有時候不讓網頁自己出聲，要使用者點一下
          setTimeout(() => {
            if (playing !== n.vid || !player.getPlayerState) return;
            const st = player.getPlayerState();
            $('music-start').hidden = st === YT.PlayerState.PLAYING || st === YT.PlayerState.BUFFERING;
          }, 3000);
        }, wait * 1000);
      }).catch(() => { $('music-title').textContent = '連不到 YouTube，聽不到音樂'; });
    }
    // 每 5 秒檢查一次，差太多就跳到正確的位置
    setInterval(() => {
      if (!player || !playing || !player.getCurrentTime || player.getPlayerState() !== YT.PlayerState.PLAYING) return;
      if (Math.abs(player.getCurrentTime() - pos()) > 3) player.seekTo(pos(), true);
    }, 5000);
    $('music-start').onclick = () => { if (player) { player.seekTo(Math.max(0, pos()), true); player.playVideo(); applyVol(); } };
    // 播放器可以收成一顆小膠囊（歌照樣播），點一下再展開
    const fold = (mini) => {
      $('music').classList.toggle('mini', mini);
      $('music-fold').title = mini ? '展開' : '收起來';
      store('hq-music-mini', mini ? '1' : '0');
    };
    // 沒設定過的話，手機預設收起來，免得蓋住畫面
    fold(saved('hq-music-mini') == null ? matchMedia('(max-width: 600px)').matches : saved('hq-music-mini') === '1');
    $('music-fold').onclick = (e) => { e.stopPropagation(); fold(!$('music').classList.contains('mini')); };
    $('music').addEventListener('click', (e) => { if ($('music').classList.contains('mini') && !e.target.closest('#music-start')) fold(false); });
    $('music-mute').onclick = () => { muted = !muted; store('hq-mute', muted ? '1' : '0'); applyVol(); };
    // 拉完就放掉焦點，方向鍵才不會跑去調音量
    $('music-vol').onchange = $('music-vol').onpointerup = (e) => e.target.blur();
    $('music-vol').oninput = (e) => { vol = Number(e.target.value); muted = false; store('hq-vol', String(vol)); store('hq-mute', '0'); applyVol(); };
    $('music-open').onclick = () => open();
    applyVol();

    // 黑膠唱片：縮圖裁成圓形印在中間當標籤；正在放的那張會轉
    function record(vid, spin) {
      const s = el('div', 'record' + (spin ? ' spin' : ''));
      if (vid) { const img = el('img'); img.src = `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`; img.alt = ''; img.loading = 'lazy'; s.appendChild(img); }
      return s;
    }
    function open() {
      const box = el('div', 'modal-list music-modal');
      const m = state[area] || { now: null, queue: [] };
      box.appendChild(el('p', 'modal-hint', '總部的點唱機：全場的人一起聽同一首，進度大家都一樣。'));
      const n = m.now;
      const nowRow = el('div', 'modal-row dj-now');
      nowRow.appendChild(record(n && n.vid, !!n));
      const info = el('div', 'modal-info');
      info.appendChild(el('b', null, n ? n.title : '現在沒有在放歌'));
      if (n) info.appendChild(el('p', null, `DJ ${n.byName}${n.skips ? `・${n.skips} 人想切歌` : ''}`));
      nowRow.appendChild(info);
      if (n) {
        const mine = me && n.by === me.id;
        const sk = el('button', 'hud-btn tiny', mine ? '⏭ 切歌' : '⏭ 投票切歌');
        sk.onclick = () => socket.emit('musicSkip', (r) => {
          if (!r || !r.ok) { toast((r && r.error) || '切不了'); return; }
          if (r.voted) toast(`已投票，${r.voted}/${r.need} 人同意就切歌`);
        });
        nowRow.appendChild(sk);
      }
      box.appendChild(nowRow);
      if (m.queue.length) {
        box.appendChild(el('p', 'mono prof-line', `唱片箱・接下來 ${m.queue.length} 張`));
        const ol = el('ol', 'music-queue');
        m.queue.forEach((q, i) => {
          const li = el('li');
          li.appendChild(record(q.vid, false));
          const t = el('div', 'music-r-info');
          t.appendChild(el('b', null, q.title));
          t.appendChild(el('small', null, `DJ ${q.byName}`));
          li.appendChild(t);
          if (me && q.by === me.id) {
            const x = el('button', 'music-x', '✕'); x.title = '從隊伍拿掉';
            x.onclick = () => socket.emit('musicRemove', i, () => {});
            li.appendChild(x);
          }
          ol.appendChild(li);
        });
        box.appendChild(ol);
      }
      const form = el('form', 'music-form');
      const input = el('input'); input.placeholder = '打歌名搜尋，或貼 YouTube 連結'; input.maxLength = 200; input.autocomplete = 'off';
      input.value = draft;
      input.oninput = () => { draft = input.value; };
      const btn = el('button', 'primary small', '搜尋'); btn.type = 'submit';
      const err = el('p', 'error');
      form.append(input, btn);
      const add = (req, b) => {
        if (b) b.disabled = true;
        err.textContent = '';
        socket.emit('musicAdd', req, (r) => {
          if (b) b.disabled = false;
          if (!r || !r.ok) { err.textContent = (r && r.error) || '點歌失敗'; return; }
          draft = ''; results = null;
          toast(`已點「${r.title}」`);
          // 點歌那一下就是使用者的點擊，順便讓手機可以出聲
          api().catch(() => {});
          open();
        });
      };
      form.onsubmit = (e) => {
        e.preventDefault();
        const q = input.value.trim();
        if (!q) return;
        // 貼的是連結就直接點，不是就當歌名搜尋
        if (/youtu\.?be|^[A-Za-z0-9_-]{11}$/.test(q)) { add(q, btn); return; }
        btn.disabled = true; err.textContent = '';
        socket.emit('musicSearch', q, (r) => {
          btn.disabled = false;
          if (!r || !r.ok) { err.textContent = (r && r.error) || '搜尋失敗'; return; }
          results = { q, list: r.list };
          open();
        });
      };
      box.append(form, err);
      if (results) {
        if (!results.list.length) box.appendChild(el('p', 'modal-hint', `找不到「${results.q}」，換個關鍵字試試`));
        const ul = el('ul', 'music-results');
        results.list.forEach((v) => {
          const li = el('li');
          const img = record(v.vid, false);
          const txt = el('div', 'music-r-info');
          txt.appendChild(el('b', null, v.title));
          txt.appendChild(el('small', null, [v.channel, v.len].filter(Boolean).join('・')));
          const b = el('button', 'primary small', '點這首');
          b.onclick = () => add({ vid: v.vid, title: v.title }, b);
          li.append(img, txt, b);
          ul.appendChild(li);
        });
        box.appendChild(ul);
      }
      box.appendChild(el('p', 'modal-hint', `最多排 20 首。點歌的人可以直接切歌，其他人要超過一半同意才會切。`));
      const focused = document.activeElement && document.activeElement.closest && document.activeElement.closest('.music-form');
      openModal('music', '點歌', box);
      if (focused || !results) setTimeout(() => input.focus(), 50);
    }
    return {
      set(s) { state = s || {}; gotAt = performance.now(); sync(); if (modalKind === 'music' && !$('modal').hidden) open(); },
      area: () => area,
      // 伺服器說現在有歌在放（DJ 台的唱片會轉）
      playing: () => !!cur() && pos() >= 0,
      open,
    };
  })();
  socket.on('music', (s) => MUSIC.set(s));

  // ---------------- 許願池：大家想要的功能、遇到的 Bug 登記在這裡 ----------------
  // 第一層是一橫條一則的清單（可以搜尋主題、篩類別、排序、分頁），點進去看內文、按讚；作者可以修改或收回
  // 有帳號才能許願；處理狀態由管理員在管理頁改
  const WISH = (() => {
    // 沒登入的人按讚用這台裝置的代號
    let wid = saved('hq-wid');
    if (!wid || !/^[a-z0-9]{8,24}$/.test(wid)) { wid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); store('hq-wid', wid); }
    const CATS = { bug: 'Bug 回報', feature: '新功能', improve: '功能優化', other: '其他' };
    const STATUS = { new: '待處理', review: '評估中', doing: '處理中', done: '已完成', no: '不處理' };
    const SORTS = { updated: '最近更新', likes: '最多讚', new: '最新許願' };
    const query = { q: '', cat: '', sort: saved('hq-wish-sort') in SORTS ? saved('hq-wish-sort') : 'updated', page: 1 };
    let view = 'list'; // list、detail、form
    let detailId = 0, editing = null; // editing：{ id（新許願是 0）, title, cat, body }
    let info = { login: false, left: 0, titleLen: 40, bodyLen: 2000 };
    let results = null, searchTimer = 0;
    const ago = (t) => {
      const m = Math.round((Date.now() - t) / 60000);
      return m < 1 ? '剛剛' : m < 60 ? `${m} 分鐘前` : m < 1440 ? `${Math.round(m / 60)} 小時前` : `${Math.round(m / 1440)} 天前`;
    };
    const isOpen = () => modalKind === 'wish' && !$('modal').hidden;
    const catTag = (c) => el('span', 'wish-cat c-' + c, CATS[c] || '其他');
    const statusTag = (s) => el('span', 'wish-st s-' + s, STATUS[s] || STATUS.new);
    const send = (ev, data, cb) => socket.emit(ev, Object.assign({ wid }, data), (r) => {
      if (!r || !r.ok) { toast((r && r.error) || '沒成功，再試一次'); return; }
      cb(r);
    });
    function show(box) {
      const card = $('modal').querySelector('.modal-card'), top = isOpen() && card ? card.scrollTop : 0;
      openModal('wish', '許願池', box);
      $('modal').classList.add('wide');
      if (card) card.scrollTop = top;
    }

    // ---------- 第一層：清單 ----------
    let shell = null; // 清單畫面（工具列 + 結果），重新整理時只換結果，搜尋框的游標才不會跑掉
    function loadList() {
      send('wishList', query, (r) => {
        info = r; results = r;
        if (view !== 'list') return;
        if (!shell || !isOpen() || !$('modal-body').contains(shell.box)) buildList();
        fillList();
      });
    }
    function buildList() {
      const box = el('div', 'modal-list wish-modal');
      const head = el('div', 'wish-head');
      const hint = el('p', 'modal-hint');
      const add = el('button', 'primary small', '許個願'); add.type = 'button';
      add.prepend(icon('wish-coin', ''));
      add.onclick = () => openForm(null);
      head.append(hint, add);
      // 工具列：搜尋主題、類別、排序
      const bar = el('div', 'wish-bar');
      const search = el('input'); search.type = 'search'; search.placeholder = '搜尋主題'; search.value = query.q; search.maxLength = 40;
      search.oninput = () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { query.q = search.value.trim(); query.page = 1; loadList(); }, 250);
      };
      const sort = el('select');
      Object.entries(SORTS).forEach(([k, v]) => { const o = el('option', null, v); o.value = k; sort.appendChild(o); });
      sort.value = query.sort;
      sort.onchange = () => { query.sort = sort.value; query.page = 1; store('hq-wish-sort', sort.value); loadList(); };
      bar.append(search, sort);
      const cats = el('div', 'wish-cats');
      [['', '全部']].concat(Object.entries(CATS)).forEach(([k, v]) => {
        const b = el('button', 'wish-tab' + (query.cat === k ? ' on' : ''), v); b.type = 'button';
        b.onclick = () => {
          query.cat = k; query.page = 1;
          cats.querySelectorAll('.wish-tab').forEach(x => x.classList.toggle('on', x === b));
          loadList();
        };
        cats.appendChild(b);
      });
      const rows = el('ul', 'wish-rows');
      const pager = el('div', 'wish-pager');
      box.append(head, bar, cats, rows, pager);
      shell = { box, hint, add, rows, pager };
      show(box);
    }
    function fillList() {
      const r = results, s = shell;
      s.hint.textContent = !r.login ? '登入帳號才能許願，沒帳號也可以幫喜歡的願望按讚。'
        : r.left ? `想要什麼功能、遇到什麼 Bug，都可以來這裡許願（今天還可以許 ${r.left} 個）`
        : `今天的 ${r.perDay} 個願都許完了，明天再來。`;
      s.add.hidden = !r.login || !r.left;
      s.rows.innerHTML = '';
      if (!r.items.length) s.rows.appendChild(el('li', 'wish-empty', r.all ? '找不到符合的願望，換個關鍵字或類別試試' : '池子裡還沒有願望，來當第一個許願的人吧！'));
      r.items.forEach((w) => {
        const li = el('li', 'wish-row' + (w.status === 'no' ? ' no' : w.status === 'done' ? ' done' : ''));
        li.tabIndex = 0;
        const main = el('div', 'wish-row-main');
        const top = el('div', 'wish-row-top');
        top.append(catTag(w.cat), el('b', 'wish-title', w.title));
        main.append(top, el('small', null, `${w.name}・${query.sort === 'new' ? ago(w.at) : '更新於 ' + ago(w.updated)}${w.mine ? '・我許的' : ''}`));
        const likes = el('span', 'wish-likes' + (w.liked ? ' on' : ''));
        likes.append(icon(w.liked ? 'wish-heart' : 'wish-heart-off', ''), el('b', null, String(w.likes)));
        li.append(main, statusTag(w.status), likes);
        li.onclick = () => openDetail(w.id);
        li.onkeydown = (e) => { if (e.key === 'Enter') openDetail(w.id); };
        s.rows.appendChild(li);
      });
      s.pager.innerHTML = '';
      s.pager.hidden = r.pages <= 1;
      const go = (n) => { query.page = n; loadList(); };
      const prev = el('button', 'hud-btn tiny', '上一頁'); prev.type = 'button'; prev.disabled = r.page <= 1; prev.onclick = () => go(r.page - 1);
      const next = el('button', 'hud-btn tiny', '下一頁'); next.type = 'button'; next.disabled = r.page >= r.pages; next.onclick = () => go(r.page + 1);
      s.pager.append(prev, el('span', null, `第 ${r.page} / ${r.pages} 頁・共 ${r.total} 則`), next);
    }

    // ---------- 內頁 ----------
    function openDetail(id) {
      send('wishGet', { id }, (r) => {
        view = 'detail'; detailId = id; shell = null;
        const w = r.wish, box = el('div', 'modal-list wish-modal');
        const back = el('button', 'wish-back', '← 回清單'); back.type = 'button';
        back.onclick = backToList;
        const tags = el('div', 'wish-row-top');
        tags.append(catTag(w.cat), statusTag(w.status));
        const paper = el('div', 'wish-paper' + (w.status === 'done' ? ' done' : ''));
        paper.append(tags, el('h3', 'wish-h', w.title),
          el('small', 'wish-by', `${w.name} 許願・${ago(w.at)}${w.updated > w.at + 1000 ? `・更新於 ${ago(w.updated)}` : ''}`),
          w.body ? el('p', 'wish-body', w.body) : el('p', 'wish-body empty', '（沒有寫內文）'));
        if (w.status === 'done') {
          const st = el('div', 'wish-stamp');
          st.append(icon('wish-stamp', ''), el('span', null, STATUS.done));
          paper.appendChild(st);
        }
        const acts = el('div', 'wish-acts');
        const like = el('button', 'wish-like' + (w.liked ? ' on' : '')); like.type = 'button';
        like.append(icon(w.liked ? 'wish-heart' : 'wish-heart-off', ''), el('b', null, w.liked ? `已按讚 ${w.likes}` : `我也想要 ${w.likes}`));
        like.onclick = () => { like.disabled = true; send('wishLike', { id }, () => openDetail(id)); };
        acts.appendChild(like);
        if (w.mine) {
          const edit = el('button', 'hud-btn tiny', '修改'); edit.type = 'button';
          edit.onclick = () => openForm({ id, title: w.title, cat: w.cat, body: w.body });
          const del = el('button', 'hud-btn tiny', '收回'); del.type = 'button';
          del.onclick = () => { if (confirm('要把這個願望收回來嗎？')) send('wishWithdraw', { id }, () => { toast('願望收回來了'); backToList(); }); };
          acts.append(edit, del);
        }
        box.append(back, paper, acts);
        show(box);
      });
    }
    function backToList() { view = 'list'; shell = null; loadList(); }

    // ---------- 許願／修改 ----------
    function openForm(w) {
      view = 'form'; shell = null;
      editing = editing && !w && !editing.id ? editing : Object.assign({ id: 0, title: '', cat: '', body: '' }, w || {});
      const e = editing, box = el('div', 'modal-list wish-modal');
      const back = el('button', 'wish-back', e.id ? '← 回願望' : '← 回清單'); back.type = 'button';
      back.onclick = () => { const id = e.id; if (id) editing = null; if (id) openDetail(id); else backToList(); };
      const form = el('form', 'wish-form');
      form.appendChild(el('div', 'label', '類別'));
      const cats = el('div', 'wish-cats');
      Object.entries(CATS).forEach(([k, v]) => {
        const b = el('button', 'wish-tab c-' + k + (e.cat === k ? ' on' : ''), v); b.type = 'button';
        b.onclick = () => { e.cat = k; cats.querySelectorAll('.wish-tab').forEach(x => x.classList.toggle('on', x === b)); cats.classList.remove('bad'); if (err.dataset.k === 'cat') say(''); };
        cats.appendChild(b);
      });
      const count = (input, max) => { const c = el('small', 'wish-count', `${input.value.length}/${max}`); input.addEventListener('input', () => { c.textContent = `${input.value.length}/${max}`; }); return c; };
      const title = el('input'); title.maxLength = info.titleLen; title.value = e.title; title.placeholder = '一句話說你想要什麼，例如：可以養寵物';
      title.oninput = () => { e.title = title.value; };
      const body = el('textarea'); body.maxLength = info.bodyLen; body.rows = 7; body.value = e.body;
      body.placeholder = '想寫多詳細都可以：怎麼玩、為什麼想要；回報 Bug 的話寫一下在哪裡、做了什麼、發生什麼事（可以不寫）';
      body.oninput = () => { e.body = body.value; };
      const tRow = el('div', 'wish-label'); tRow.append(el('span', 'label', '主題'), count(title, info.titleLen));
      const bRow = el('div', 'wish-label'); bRow.append(el('span', 'label', '內文'), count(body, info.bodyLen));
      const submit = el('button', 'primary small', e.id ? '儲存修改' : '丟硬幣許願'); submit.type = 'submit';
      if (!e.id) submit.prepend(icon('wish-coin', ''));
      // 沒填好或伺服器擋下來的原因，直接寫在送出按鈕上面（提示紙條會被視窗擋住）
      const err = el('p', 'wish-err');
      const say = (text, k) => { err.textContent = text; err.dataset.k = k || ''; };
      const foot = el('div', 'wish-foot'); foot.appendChild(submit);
      form.append(cats, tRow, title, bRow, body, err, foot);
      form.onsubmit = (ev) => {
        ev.preventDefault();
        if (!e.cat) { say('先選一個類別', 'cat'); cats.classList.add('bad'); return; }
        if (e.title.trim().length < 2) { say('主題寫多一點點吧（至少 2 個字）'); title.focus(); return; }
        say('');
        submit.disabled = true;
        socket.emit(e.id ? 'wishEdit' : 'wishAdd', { wid, id: e.id, title: e.title, cat: e.cat, body: e.body }, (r) => {
          submit.disabled = false;
          if (!r || !r.ok) { say((r && r.error) || '沒送出去，網路可能不穩，再按一次試試'); return; }
          toast(e.id ? '改好了' : '願望丟進許願池了');
          editing = null;
          openDetail(r.id);
        });
      };
      box.append(back, form);
      show(box);
      setTimeout(() => { if (isOpen()) (e.title ? body : title).focus(); }, 50);
    }

    // 有人許願、按讚，或管理員改了狀態：開著許願池的人重新拿一次（正在寫願望的不打擾）
    socket.on('wishes', (m) => {
      if (m && m.coin && scene && scene.wishCoin) scene.wishCoin(m.coin);
      if (!isOpen()) return;
      if (view === 'list') loadList();
      else if (view === 'detail') socket.emit('wishGet', { wid, id: detailId }, (r) => { if (r && r.ok) openDetail(detailId); else backToList(); });
    });
    return { open() { view = 'list'; shell = null; loadList(); } };
  })();
  socket.on('toastArea', (t) => { if (joined && t.area === MUSIC.area()) toast(t.text); });

  // 背包：5×5 的小方格，一種物資一格、右下角標數量；點一下看說明，點兩下直接用
  let bagSel = null, bagTap = { k: null, t: 0 };
  function useItem(k) {
    if (!myInv[k]) return;
    if (EDIBLE.includes(k)) eat(k);
    else if (k === 'noodle') { closeModal(); toast('到休息區右下角的爐台煮'); }
    else toast(ITEM_INFO[k].desc);
  }
  function openBag() {
    const box = el('div', 'bag');
    const grid = el('div', 'bag-grid');
    const have = Object.keys(MAP.ITEMS).filter(k => myInv[k] > 0);
    if (!have.includes(bagSel)) bagSel = have[0] || null;
    for (let i = 0; i < MAP.BAG_SLOTS; i++) {
      const k = have[i];
      const cell = el('button', 'bag-cell' + (k ? '' : ' empty') + (k && k === bagSel ? ' on' : ''));
      cell.type = 'button';
      if (k) {
        cell.appendChild(icon('item-' + k, MAP.ITEMS[k].icon));
        cell.appendChild(el('span', 'bag-cnt', String(myInv[k])));
        cell.setAttribute('aria-label', `${MAP.ITEMS[k].name} × ${myInv[k]}`);
        cell.onclick = () => {
          const now = performance.now(), dbl = bagTap.k === k && now - bagTap.t < 400;
          bagTap = dbl ? { k: null, t: 0 } : { k, t: now };
          if (dbl) { useItem(k); return; }
          bagSel = k; openBag();
        };
      } else cell.disabled = true;
      grid.appendChild(cell);
    }
    box.appendChild(grid);
    const info = el('div', 'bag-info');
    if (bagSel) {
      const it = MAP.ITEMS[bagSel];
      info.appendChild(el('b', null, `${it.name} × ${myInv[bagSel]}`));
      info.appendChild(el('p', null, ITEM_INFO[bagSel].desc + (ITEM_INFO[bagSel].use ? '　點兩下使用。' : '')));
    } else info.appendChild(el('p', null, '背包空空的，去物資倉庫敲箱子吧。'));
    box.appendChild(info);
    box.appendChild(el('p', 'bag-slots mono', `${have.length} / ${MAP.BAG_SLOTS} 格`));
    openModal('bag', '背包', box);
  }
  function eat(k) {
    if (k === 'water') return drink();
    if (!myInv[k]) { toast(`沒有${MAP.ITEMS[k].name}了，去物資倉庫敲「台灣小吃」箱子`); return; }
    socket.emit('eat', k, (res) => {
      if (!res || !res.ok) return;
      renderInventory(res.inv);
      toast(`${res.food}：血量 +${res.hp}、魔力 +${res.mp}`, 'item-' + k);
    });
  }
  function drink() {
    if (!myInv.water) { toast('沒有礦泉水，去物資倉庫敲箱子'); return; }
    socket.emit('drink', (res) => {
      if (!res || !res.ok) return;
      renderInventory(res.inv);
      toast(`喝了礦泉水，魔力 +${res.mp} `);
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
  // 裝備欄的大張人物圖：量出人物（含頭飾、翅膀、武器）實際的範圍，放大到填滿 w x h 的框，四周至少留 pad
  // 沒戴什麼的時候人物比較小，最多放大 maxZ 倍，免得大到貼邊
  function gearPortraitFit(equip, w, h, pad, maxZ) {
    // 先畫在比角色框大一圈的畫布上，翅膀和戰錘才不會被切掉
    const S = 4, src = document.createElement('canvas');
    src.width = 160 * S; src.height = 150 * S;
    const sx = src.getContext('2d');
    sx.scale(S, S); sx.translate(48, 50);
    AV.drawAvatar(sx, Object.assign({}, profile, { cls: myCls(), equip }));
    const d = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
    let l = src.width, t = src.height, r = -1, b = -1;
    for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
      if (d[(y * src.width + x) * 4 + 3] > 20) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
    }
    const k = 2, c = document.createElement('canvas');
    c.width = w * k; c.height = h * k;
    if (r < 0) return c;
    const bw = r - l + 1, bh = b - t + 1, z = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, maxZ / S) * k;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, l, t, bw, bh, (c.width - bw * z) / 2, (c.height - bh * z) / 2, bw * z, bh * z);
    return c;
  }
  function equipGear(slot, id) {
    socket.emit('equip', slot, id, (res) => {
      if (!res || !res.ok) return;
      myEquip = res.equip;
      store('hq-equip', myEquip);
      if (slot === 'weapon') {
        renderSkillbar();
        const sk = ST.SKILLS[basic()];
        toast(id ? `普攻變成「${sk.name}」` : `普攻換回「${sk.name}」`, 'sk-' + basic());
      }
      if (modalKind === 'gear') openGear();
    });
  }
  function openGear() {
    const box = el('div', 'gear');
    const top = el('div', 'gear-top');
    const pic = gearPortraitFit(myEquip, 178, 208, 14, 2.1);
    pic.className = 'gear-me' + (topRarity(myEquip) ? ' r-' + topRarity(myEquip) : '');
    top.appendChild(pic);
    const slots = el('div', 'gear-slots');
    Object.entries(GR.SLOTS).forEach(([slot, label]) => {
      const id = myEquip[slot], it = GR.GEAR[id];
      const row = el('div', 'gear-slot' + (it ? ' r-' + it.rarity : ''));
      row.appendChild(el('span', 'gear-slot-k', label));
      const nm = row.appendChild(el('b', null, it ? ' ' + it.name : '—'));
      if (it) nm.prepend(icon('gear-' + id, ''));
      if (it) { const off = el('button', 'hud-btn tiny', '脫下'); off.onclick = () => equipGear(slot, null); row.appendChild(off); }
      slots.appendChild(row);
    });
    const setId = GR.setOf(myEquip);
    top.appendChild(slots);
    box.appendChild(top);
    // 套裝狀態和收集說明放在人物圖和欄位下面，人物圖才能跟四個欄位上下對齊
    if (setId) box.appendChild(el('p', 'gear-set-on', `套裝效果發動中：${GR.SERIES[setId].name}`));
    box.appendChild(el('p', 'modal-hint', `收集 ${myOwned.length} / ${Object.keys(GR.GEAR).length} 件。頭飾、服裝、披風都穿同一個系列，就會發動套裝特效。到 戰情室玩 你畫我猜，猜對就會拿到新裝備；女僕咖啡廳系列要在廚房煮泡麵才會掉。武器要找指揮中心的 古城守門員進副本，打倒最終頭目才會掉。`));
    // 依系列分組，每組可以收合；沒點過的話，只展開身上有穿的系列
    const folds = (() => { try { return JSON.parse(localStorage.getItem('hq-gear-folds')) || {}; } catch (e) { return {}; } })();
    const worn = new Set(Object.values(myEquip).map(id => GR.GEAR[id] && GR.GEAR[id].series));
    Object.entries(GR.SERIES).forEach(([sid, S]) => {
      const items = Object.entries(GR.GEAR).filter(([, g]) => g.series === sid);
      if (!items.length) return;
      const got = items.filter(([id]) => myOwned.includes(id)).length;
      const sec = el('details', 'gear-series' + (sid === setId ? ' set-on' : ''));
      sec.open = sid in folds ? folds[sid] : worn.has(sid);
      const sum = el('summary', 'gear-h');
      sum.appendChild(el('span', 'gear-h-name', S.name));
      sum.appendChild(el('span', 'gear-h-count', `${got} / ${items.length}`));
      if (sid === setId) sum.appendChild(el('span', 'gear-h-on', '發動中'));
      sec.appendChild(sum);
      sec.appendChild(el('p', 'gear-h-desc', S.desc));
      sec.ontoggle = () => { folds[sid] = sec.open; store('hq-gear-folds', folds); };
      const grid = el('div', 'gear-grid');
      items.forEach(([id, g]) => {
        const slot = g.slot;
        const have = myOwned.includes(id), on = myEquip[slot] === id;
        const cell = el('button', `gear-item r-${g.rarity}${have ? '' : ' locked'}${on ? ' on' : ''}`);
        cell.type = 'button';
        cell.appendChild(el('span', 'gear-rar', g.rarity));
        cell.appendChild(el('span', 'gear-part', GR.SLOTS[slot]));
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
      sec.appendChild(grid);
      box.appendChild(sec);
    });
    openModal('gear', '裝備', box);
    $('modal').classList.add('wide');
  }
  // 身上最稀有的裝備等級（決定光芒）
  function topRarity(equip) {
    const order = ['R', 'SR', 'SSR'];
    let best = -1;
    Object.values(equip || {}).forEach(id => { const g = GR.GEAR[id]; if (g) best = Math.max(best, order.indexOf(g.rarity)); });
    return best >= 1 ? order[best] : null;
  }

  // ---------------- 家具（室內設計） ----------------
  function decorPic(k) {
    const c = document.createElement('canvas');
    c.width = DC.WIDTH * 2; c.height = DC.HEIGHT * 2;
    const ctx = c.getContext('2d'); ctx.scale(2, 2); DC.drawDecor(ctx, k);
    c.className = 'furn-pic';
    return c;
  }
  function openFurn() {
    const box = el('div', 'furn');
    box.appendChild(el('p', 'modal-hint', '打倒野外的小怪有機會掉家具，打退颱風每個有出力的人都拿一件。站在總部室內的地板上按「擺在腳下」，大家都看得到！'));
    const grid = el('div', 'gear-grid');
    Object.entries(DC.DECOR).forEach(([k, d]) => {
      const n = myFurn[k] || 0;
      const cell = el('div', 'gear-item furn-item' + (n ? '' : ' locked'));
      cell.appendChild(decorPic(k));
      cell.appendChild(el('span', 'gear-name', `${d.name} × ${n}`));
      const b = el('button', 'primary small', '擺在腳下');
      b.disabled = !n;
      b.onclick = () => {
        if (scene && scene.me) socket.emit('move', { x: Math.round(scene.me.x), y: Math.round(scene.me.y), dir: scene.me.dir, moving: false });
        socket.emit('placeDecor', k, (res) => {
          if (!res || !res.ok) { if (res && res.error) toast(res.error); return; }
          myFurn = res.furn; store('hq-furn', myFurn);
          closeModal(); toast(`擺好了 ${d.name}`, 'dec-' + k);
        });
      };
      cell.appendChild(b);
      grid.appendChild(cell);
    });
    box.appendChild(grid);
    // 附近自己擺的家具可以收回來
    const mine = scene ? scene.nearbyDecor() : [];
    if (mine.length) {
      box.appendChild(el('h3', 'gear-h', '旁邊你擺的家具'));
      const list = el('div', 'modal-list');
      mine.forEach(({ key, k }) => {
        const row = el('div', 'modal-row');
        row.appendChild(el('div', 'modal-icon')).appendChild(icon('dec-' + k, ''));
        row.appendChild(el('div', 'modal-info', DC.DECOR[k].name));
        const b = el('button', 'hud-btn tiny', '收回');
        b.onclick = () => socket.emit('pickDecor', key, (res) => {
          if (!res || !res.ok) { if (res && res.error) toast(res.error); return; }
          myFurn = res.furn; store('hq-furn', myFurn); openFurn();
        });
        row.appendChild(b);
        list.appendChild(row);
      });
      box.appendChild(list);
    }
    openModal('furn', '家具', box);
    $('modal').classList.add('wide');
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
        if (res && res.clean != null) toast(res.clean ? `收掉了 ${res.clean} 件家具，總部回到原本的樣子` : '總部本來就沒有擺家具');
        else if (res && res.ok) toast('拿到蛋糕了！靠近你的人都會戴上慶祝帽');
        else toast('冰箱裡只有幾瓶礦泉水…');
      });
    };
    openModal('fridge', '', box);
    setTimeout(() => input.focus(), 30);
  }
  $('cake-btn').addEventListener('click', () => socket.emit('cakeDown'));

  // ---------------- 遊戲室（戰情室）：兩個遊戲共用的部分 ----------------
  // 遊戲紀錄、主持棒、投票、參加的人、記分板；k 是元素 id 的前綴（draw / song）
  function gameLog(k, l) {
    const box = $(k + '-log');
    const line = el('div', 'dl-' + (l.kind || 'sys'), l.kind === 'guess' || l.kind === 'chat' ? l.text : plain(l.text)); // 玩家自己打的字不動
    box.appendChild(line);
    while (box.children.length > 80) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
  }
  function gameRender(k, state, { info, tag, placeholder }) {
    const host = !!(me && state.host === me.id);
    $(k + '-panel').classList.toggle('is-host', host);
    $(k + '-info').textContent = info;
    const claim = $(k + '-claim');
    claim.hidden = host;
    claim.textContent = state.host ? '搶主持棒' : '當主持人';
    const v = state.vote;
    $(k + '-vote').hidden = !v;
    if (v) {
      $(k + '-vote-text').textContent = `${v.byName} 想搶主持棒（${v.yes.length} / ${v.need} 人同意）`;
      $(k + '-vote-yes').hidden = v.yes.includes(me && me.id);
    }
    const who = $(k + '-members');
    who.innerHTML = '';
    state.members.forEach(m => who.appendChild(el('span', 'chip' + (me && m.id === me.id ? ' me' : ''), (m.id === state.host ? '主持・' : tag(m.id)) + m.name)));
    const g = $(k + '-guess');
    g.placeholder = host ? (state.playing ? '聊天…（不能說出答案喔）' : '聊天…') : placeholder;
    renderScores(k, state.scores);
  }
  // 記分板上的小頭像：從場上那個人的角色貼圖切出臉
  const faceCache = new Map();
  function faceOf(id) {
    const who = scene && (scene.me && me && id === me.id ? scene.me : scene.remotes.get(id));
    if (!who || !who.texKey || !scene.textures.exists(who.texKey)) return '';
    if (faceCache.has(who.texKey)) return faceCache.get(who.texKey);
    const src = scene.textures.get(who.texKey).getSourceImage();
    const c = document.createElement('canvas'); c.width = c.height = 48;
    // 角色貼圖是 2 倍大，頭大約在角色框的 (8, -2) 起 48×48 的範圍
    c.getContext('2d').drawImage(src, (FRAME.ox + 8) * 2, (FRAME.oy - 2) * 2, 96, 96, 0, 0, 48, 48);
    const url = c.toDataURL();
    faceCache.set(who.texKey, url);
    return url;
  }
  // 大一點的頭像（小樹屋大畫面用）：直接用角色資料重畫一張高解析度的，頭放正中間
  function bigFaceOf(id, px) {
    const who = scene && (scene.me && me && id === me.id ? scene.me : scene.remotes.get(id));
    if (!who || !who.look) return faceOf(id);
    const look = Object.assign({}, who.look, { cls: who.stats ? who.stats.cls : 'staff' });
    const key = 'big-' + px + '-' + (who.texKey || JSON.stringify(look));
    if (faceCache.has(key)) return faceCache.get(key);
    const c = document.createElement('canvas'); c.width = c.height = px;
    const x = c.getContext('2d');
    // 頭的中心大約在角色座標 (32, 27)；切 54×54，四周留一點邊，頭髮、帽子不會貼到圓框
    const S = 54, k = px / S;
    x.scale(k, k); x.translate(-(32 - S / 2), -(27 - S / 2));
    try { AV.drawAvatar(x, look); } catch (e) { return faceOf(id); }
    const url = c.toDataURL();
    faceCache.set(key, url);
    return url;
  }
  // 記分板：只列前 5 名（自己在 5 名外也會列出來）；名次往上爬的人會往上滑並閃一下
  const SCORE_TOP = 5;
  const lastRanks = { draw: new Map(), song: new Map() };
  function renderScores(k, scores) {
    const sc = $(k + '-scores'), prev = lastRanks[k];
    const before = new Map([...sc.children].filter(li => li.dataset.name).map(li => [li.dataset.name, li.getBoundingClientRect().top]));
    sc.innerHTML = '';
    if (!scores.length) sc.appendChild(el('li', 'empty', '還沒有人得分'));
    const myName = me && me.name;
    const mine = scores.findIndex(r => r.name === myName);
    const rows = scores.map((r, i) => [r, i]).filter(([, i]) => i < SCORE_TOP || i === mine);
    const now = new Map();
    rows.forEach(([r, i]) => {
      if (i === mine && i > SCORE_TOP) sc.appendChild(el('li', 'gap', '⋯'));
      const li = el('li', r.name === myName ? 'me' : null);
      li.dataset.name = r.name;
      li.appendChild(el('span', 'rk' + (i < 3 ? ' rk' + (i + 1) : ''), String(i + 1)));
      const face = r.id ? faceOf(r.id) : '';
      if (face) { const img = el('img'); img.src = face; img.alt = ''; li.appendChild(img); }
      li.appendChild(el('span', 'nm', r.name));
      const old = prev.get(r.name);
      if (old !== undefined && i < old) li.appendChild(el('span', 'up', '▲' + (old - i)));
      li.appendChild(el('b', null, r.pts));
      sc.appendChild(li);
      // 名次變了：從原本的位置滑到新位置
      const top = before.get(r.name);
      if (top !== undefined) {
        const dy = top - li.getBoundingClientRect().top;
        if (dy && li.animate) li.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 500, easing: 'ease-out' });
      } else if (prev.size && old === undefined) li.animate && li.animate([{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'none' }], { duration: 400 });
      if (old !== undefined && i < old) li.classList.add('rise');
    });
    scores.forEach((r, i) => now.set(r.name, i));
    lastRanks[k] = now;
  }
  function gameWire(k) {
    $(k + '-claim').onclick = () => socket.emit(k + 'Claim', (res) => { if (res && res.error) toast(res.error); });
    $(k + '-vote-yes').onclick = () => socket.emit(k + 'Vote');
    $(k + '-reveal').onclick = () => socket.emit(k + 'Reveal');
    $(k + '-score-reset').onclick = () => socket.emit(k + 'ScoreReset');
    const box = $(k + '-scorebox'), tg = box.querySelector('.gs-toggle');
    tg.onclick = () => { const c = box.classList.toggle('collapsed'); tg.setAttribute('aria-expanded', String(!c)); };
  }
  // 加入某一個遊戲：伺服器回傳目前狀態後，交給 onJoin 畫出來
  function gameJoin(k, onJoin) {
    socket.emit(k + 'Join', (res) => {
      if (!res || !res.ok) { if (res && res.error) toast(res.error); return; }
      $(k + '-log').innerHTML = '';
      onJoin(res);
    });
  }

  // ---------------- 你畫我猜 ----------------
  const DRAW = (() => {
    const cv = $('draw-canvas'), ctx = cv.getContext('2d');
    const COLORS = ['#2b2a33', '#e8384f', '#ff7a2f', '#ffd23f', '#6baf7b', '#4f7cc2', '#7a5cc8', '#a0663e'];
    const SIZES = [4, 10, 22];
    // 筆刷，或是拖一下拉出形狀（圓形、矩形、三角形）
    const TOOLS = [['pen', '筆刷'], ['circle', '圓形'], ['rect', '矩形'], ['tri', '三角形']];
    let state = null, answer = '', color = COLORS[0], size = SIZES[1], tool = 'pen', cur = null, sendTimer = 0, snap = null;
    // strokes：畫布上每一段，上一步時拿來重畫；sid 是每一筆的編號
    let strokes = [], sid = Math.floor(Math.random() * 1e6) * 1000;
    const amHost = () => state && me && state.host === me.id;

    function clear() { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height); }
    function wipe() { strokes = []; clear(); }
    function add(st) { strokes.push(st); paint(st); }
    // 收回最後一筆（同一個 id 的段落一起），再整張重畫
    function undo(id) {
      if (!strokes.length) return;
      do strokes.pop(); while (id != null && strokes.length && strokes[strokes.length - 1].id === id);
      clear(); strokes.forEach(paint);
    }
    function askUndo() { if (amHost() && state.playing && !cur) socket.emit('drawUndo'); }
    // 畫畫的指標：淺灰色圓圈，大小跟筆刷一樣，白底也看得到
    function setCursor() {
      const d = tool === 'pen' ? Math.max(8, Math.min(120, Math.round(size * cv.clientWidth / 1000))) : 18, r = d / 2 + 2, n = d + 4;
      const svg = tool === 'pen'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}"><circle cx="${r}" cy="${r}" r="${d / 2}" fill="none" stroke="#9a9a9a" stroke-width="3"/><circle cx="${r}" cy="${r}" r="${d / 2}" fill="none" stroke="#d6d6d6" stroke-width="1.5"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}"><path d="M${r} 2V${n - 2}M2 ${r}H${n - 2}" stroke="#9a9a9a" stroke-width="3"/><path d="M${r} 2V${n - 2}M2 ${r}H${n - 2}" stroke="#d6d6d6" stroke-width="1.5"/></svg>`;
      cv.style.setProperty('--paint-cursor', `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${Math.round(r)} ${Math.round(r)}, crosshair`);
    }
    function paint(st) {
      const k = cv.width / 1000, ky = cv.height / 1000;
      ctx.save(); ctx.strokeStyle = st.c; ctx.fillStyle = st.c; ctx.lineWidth = st.w * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      if (st.k && st.k !== 'pen') {
        // 形狀：pts 是拖曳的起點和終點，形狀畫在這兩點框出來的範圍裡
        const [[ax, ay], [bx, by]] = st.pts, x0 = Math.min(ax, bx) * k, y0 = Math.min(ay, by) * ky, x1 = Math.max(ax, bx) * k, y1 = Math.max(ay, by) * ky;
        if (st.k === 'circle') ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, 0, 0, Math.PI * 2);
        else if (st.k === 'rect') ctx.rect(x0, y0, x1 - x0, y1 - y0);
        else { ctx.moveTo((x0 + x1) / 2, y0); ctx.lineTo(x1, y1); ctx.lineTo(x0, y1); ctx.closePath(); }
        ctx.stroke(); ctx.restore();
        return;
      }
      st.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * ky) : ctx.moveTo(x * k, y * ky)));
      if (st.pts.length === 1) { ctx.arc(st.pts[0][0] * k, st.pts[0][1] * ky, st.w * k / 2, 0, Math.PI * 2); ctx.fill(); } else ctx.stroke();
      ctx.restore();
    }
    function render() {
      if (!state) return;
      const host = amHost();
      $('draw-panel').classList.toggle('can-paint', host && state.playing);
      // 出題中按鈕變成「改題目」，輸入框留著目前的答案
      $('draw-start-btn').textContent = host && state.playing ? '改題目' : '出題';
      if (!state.playing && answer) { answer = ''; $('draw-answer').value = ''; }
      const guessers = state.members.filter(m => m.id !== state.host);
      const right = guessers.filter(m => state.correct.includes(m.id)).length;
      let info;
      if (!state.host) info = '還沒有主持人，按「當主持人」來出題！';
      else if (!state.playing) info = host ? '你是主持人：先輸入答案、按「出題」，出題後才能開始畫！' : `主持人 ${state.hostName} 正在想題目…`;
      else info = host ? `答案「${answer}」· 已猜對 ${right} / ${guessers.length}` : `${state.hostName} 出題中 · 答案有 ${state.len} 個字 · 已猜對 ${right} / ${guessers.length}`;
      gameRender('draw', state, { info, tag: (id) => (state.correct.includes(id) ? '✓ ' : ''),
        placeholder: state.playing ? `猜猜看（${state.len} 個字）` : '聊天…' });
    }
    function onState(st) { state = st; if (!amHost()) { answer = ''; $('draw-answer').value = ''; } render(); }

    // 主持人畫畫：座標換成 0~1000，每 60 毫秒送一段
    function pos(e) {
      const b = cv.getBoundingClientRect();
      return [Math.round((e.clientX - b.left) / b.width * 1000), Math.round((e.clientY - b.top) / b.height * 1000)];
    }
    function flush() {
      sendTimer = 0;
      if (!cur || cur.pts.length < 1) return;
      const st = { c: cur.c, w: cur.w, pts: cur.pts, id: cur.id };
      strokes.push(st);
      socket.emit('drawStroke', st);
      const last = cur.pts[cur.pts.length - 1];
      cur.pts = [last];
    }
    // 沒出題就想畫：畫布中間跳紙條提醒（一般 toast 會被遊戲室視窗蓋住）
    let tipTimer = 0;
    function boardTip(text) {
      let t = $('draw-tip');
      if (!t) { t = el('div', 'draw-tip'); t.id = 'draw-tip'; t.onclick = () => (t.hidden = true); cv.parentNode.appendChild(t); }
      t.textContent = text; t.hidden = false;
      t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
      clearTimeout(tipTimer); tipTimer = setTimeout(() => (t.hidden = true), 2600);
    }
    function nudgeAnswer() {
      const a = $('draw-answer');
      a.classList.remove('nudge'); void a.offsetWidth; a.classList.add('nudge');
      if (!matchMedia('(pointer: coarse)').matches) a.focus();
    }
    cv.addEventListener('pointerdown', (e) => {
      if (state && !state.host) { e.preventDefault(); boardTip('還沒有主持人喔！\n先按「當主持人」才能出題畫畫'); return; }
      if (!amHost()) return;
      e.preventDefault();
      if (!state.playing) { boardTip('還沒出題喔！\n先在下面輸入答案、按「出題」再開始畫'); nudgeAnswer(); return; }
      cv.setPointerCapture(e.pointerId);
      if (tool !== 'pen') {
        // 拖曳時先記下畫布，每次移動都還原再畫一次預覽
        snap = ctx.getImageData(0, 0, cv.width, cv.height);
        cur = { k: tool, c: color, w: size, pts: [pos(e), pos(e)], id: ++sid };
        return;
      }
      cur = { c: color, w: size, pts: [pos(e)], id: ++sid };
      paint(cur);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!cur) return;
      if (cur.k) { cur.pts[1] = pos(e); ctx.putImageData(snap, 0, 0); paint(cur); return; }
      const p = pos(e), last = cur.pts[cur.pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 4) return;
      paint({ c: cur.c, w: cur.w, pts: [last, p] });
      cur.pts.push(p);
      if (cur.pts.length > 150) flush();
      else if (!sendTimer) sendTimer = setTimeout(flush, 60);
    });
    const end = () => {
      if (!cur) return;
      if (cur.k) {
        const [[ax, ay], [bx, by]] = cur.pts;
        // 只是點一下沒有拉開就不算
        if (Math.abs(ax - bx) > 6 || Math.abs(ay - by) > 6) { strokes.push(cur); socket.emit('drawStroke', cur); }
        else ctx.putImageData(snap, 0, 0);
        cur = null; snap = null;
        return;
      }
      clearTimeout(sendTimer); flush(); cur = null;
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);

    // 工具列
    const pal = $('draw-colors');
    COLORS.concat(['#ffffff']).forEach(c => {
      const b = el('button', 'sw' + (c === color ? ' on' : ''));
      b.type = 'button'; b.style.background = c; b.title = c === '#ffffff' ? '橡皮擦' : '';
      if (c === '#ffffff') b.appendChild(icon('tool-eraser', ''));
      b.onclick = () => { color = c; [...pal.children].forEach(x => x.classList.toggle('on', x === b)); };
      pal.appendChild(b);
    });
    const tl = $('draw-shapes');
    TOOLS.forEach(([k, name]) => {
      const b = el('button', 'tl' + (k === tool ? ' on' : ''));
      b.appendChild(icon('tool-' + k, ''));
      b.type = 'button'; b.title = name; b.setAttribute('aria-label', name);
      b.onclick = () => { tool = k; [...tl.children].forEach(x => x.classList.toggle('on', x === b)); setCursor(); };
      tl.appendChild(b);
    });
    const sz = $('draw-sizes');
    SIZES.forEach(w => {
      const b = el('button', 'sz' + (w === size ? ' on' : ''));
      b.type = 'button';
      const d = el('i'); d.style.width = d.style.height = Math.max(4, w * 0.8) + 'px'; b.appendChild(d);
      b.onclick = () => { size = w; [...sz.children].forEach(x => x.classList.toggle('on', x === b)); setCursor(); };
      sz.appendChild(b);
    });
    $('draw-clear').onclick = () => { if (amHost()) { wipe(); socket.emit('drawClear'); } };
    $('draw-undo').onclick = askUndo;
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !$('games').hidden && !$('draw-panel').hidden
        && !/^(INPUT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName)) { e.preventDefault(); askUndo(); }
    });
    if (window.ResizeObserver) new ResizeObserver(setCursor).observe(cv); else setCursor();
    $('draw-start-form').onsubmit = (e) => {
      e.preventDefault();
      const a = $('draw-answer').value.trim();
      socket.emit('drawStart', a, (res) => {
        if (!res || !res.ok) { if (res && res.error) toast(res.error); return; }
        if (res.edited && answer !== a) toast('題目改好了');
        answer = a; render();
      });
    };
    $('draw-guess-form').onsubmit = (e) => {
      e.preventDefault();
      const t = $('draw-guess').value.trim();
      if (!t) return;
      $('draw-guess').value = '';
      socket.emit('drawGuess', t, (res) => {
        if (res && res.error) toast(res.error);
        if (res && res.correct) toast(res.item ? '猜對了！拿到一件新裝備' : '猜對了！（裝備已經全部收集完了）');
      });
    };
    gameWire('draw');

    function join(done) {
      gameJoin('draw', (res) => {
        wipe();
        res.strokes.forEach(add);
        answer = res.answer || '';
        $('draw-answer').value = answer;
        onState(res.state);
        done();
      });
    }
    function leave() {
      if (!state) return;
      end();
      socket.emit('drawLeave');
      state = null;
    }
    clear();
    return { join, leave, onState, log: (l) => gameLog('draw', l), paint: add, wipe, undo };
  })();

  // ---------------- 金曲猜歌王 ----------------
  // 主持人輸入歌手和歌名，大家分開猜；設定幾個人兩個都答對就結束
  const SONG = (() => {
    let state = null, answer = null; // answer：主持人自己才知道的 { singer, title }
    const amHost = () => state && me && state.host === me.id;
    const blanks = (n) => '＿'.repeat(n);
    function render() {
      if (!state) return;
      const host = amHost(), mine = me && me.id;
      const gotS = state.gotSinger.includes(mine), gotT = state.gotTitle.includes(mine);
      const guessers = state.members.filter(m => m.id !== state.host);
      let info;
      if (!state.host) info = '還沒有主持人，按「當主持人」來出題！';
      else if (!state.playing) info = host ? '你是主持人：輸入歌手、歌名和達標人數，按「出題」開始！' : `主持人 ${state.hostName} 正在選歌…`;
      else info = `${host ? '你' : state.hostName} 出題中 · 全部答對 ${state.done} / ${state.goal} 人就結束`;
      $('song-panel').querySelector('.song-stage').classList.toggle('playing', state.playing);
      const slot = (id, len, got, real) => {
        $(id).textContent = !state.playing ? '？' : host && real ? real : got ? '答對了！' : `${blanks(len)}（${len} 個字）`;
        $(id).parentNode.classList.toggle('got', state.playing && got);
      };
      slot('song-singer-slot', state.singerLen, gotS, answer && answer.singer);
      slot('song-title-slot', state.titleLen, gotT, answer && answer.title);
      $('song-goal-text').textContent = state.playing ? `${state.done} / ${state.goal} 人歌手＋歌名都答對` : '';
      const ptsText = (a) => a.map((n, i) => `第${i + 1}名 ${n}`).join('、') + (a.length > 1 ? `，之後 ${a[a.length - 1]}` : '') + ' 分';
      $('song-pts-text').textContent = state.playing ? `歌手：${ptsText(state.singerPts)}　歌名：${ptsText(state.titlePts)}` : '';
      gameRender('song', state, { info,
        tag: (id) => { const s = state.gotSinger.includes(id), t = state.gotTitle.includes(id); return s && t ? '✓✓ ' : s ? '歌手✓ ' : t ? '歌名✓ ' : ''; },
        placeholder: !state.playing ? '聊天…' : gotS && gotT ? '你全部答對了！' : gotS ? '再猜歌名…' : gotT ? '再猜歌手…' : '猜歌手或歌名…' });
      $('song-guess').disabled = host || (state.playing && gotS && gotT);
    }
    function onState(st) { state = st; if (!amHost() || !st.playing) answer = null; render(); }
    $('song-start-form').onsubmit = (e) => {
      e.preventDefault();
      // 分數用逗號（或空白、頓號）分開，例如 3,2,1
      const pts = (id) => $(id).value.split(/[,，、\s]+/).filter(Boolean).map(Number).filter(n => Number.isFinite(n) && n >= 0);
      const q = { singer: $('song-singer').value.trim(), title: $('song-title').value.trim(), goal: Number($('song-goal').value) || 1,
        singerPts: pts('song-singer-pts'), titlePts: pts('song-title-pts') };
      socket.emit('songStart', q, (res) => {
        if (!res || !res.ok) { if (res && res.error) toast(res.error); return; }
        answer = { singer: q.singer, title: q.title };
        $('song-singer').value = ''; $('song-title').value = '';
        render();
      });
    };
    $('song-guess-form').onsubmit = (e) => {
      e.preventDefault();
      const t = $('song-guess').value.trim();
      if (!t) return;
      $('song-guess').value = '';
      socket.emit('songGuess', t, (res) => {
        if (res && res.error) toast(res.error);
        if (!res || !res.correct) return;
        if (res.both) toast(res.item ? '歌手和歌名都答對了！拿到一件新裝備' : '歌手和歌名都答對了！（裝備已經全部收集完了）');
        else toast(res.singer && res.title ? '歌手和歌名都對了！' : res.singer ? '歌手答對了！再猜歌名' : '歌名答對了！再猜歌手');
      });
    };
    gameWire('song');
    function join(done) {
      gameJoin('song', (res) => {
        answer = res.title ? { singer: res.singer, title: res.title } : null;
        onState(res.state);
        done();
      });
    }
    function leave() {
      if (!state) return;
      socket.emit('songLeave');
      state = null; answer = null;
    }
    return { join, leave, onState, log: (l) => gameLog('song', l) };
  })();

  // ---------------- 遊戲室：分頁切換 ----------------
  const ROOM = (() => {
    const GAMES = { draw: DRAW, song: SONG };
    let tab = 'draw';
    const tabs = [...document.querySelectorAll('.game-tabs button')];
    function show(k) {
      tab = k;
      tabs.forEach(b => b.classList.toggle('on', b.dataset.game === k));
      Object.keys(GAMES).forEach(g => { $(g + '-panel').hidden = g !== k; });
    }
    function open() {
      // 先停下來（點地板後還在走的話，會走出戰情室把遊戲關掉），再把位置告訴伺服器，它才知道你在戰情室裡
      if (scene) scene.target = null;
      const m = scene && scene.me;
      if (m) socket.emit('move', { x: Math.round(m.x), y: Math.round(m.y), dir: m.dir, moving: false });
      GAMES[tab].join(() => { show(tab); $('games').hidden = false; chatInput.blur(); });
    }
    function close() {
      if ($('games').hidden) return;
      if ($('games').contains(document.activeElement)) document.activeElement.blur();
      $('games').hidden = true;
      Object.values(GAMES).forEach(g => g.leave());
    }
    tabs.forEach(b => b.onclick = () => {
      const k = b.dataset.game;
      if (k === tab) return;
      GAMES[tab].leave();
      GAMES[k].join(() => show(k));
    });
    $('games-x').onclick = () => close();
    // 拖曳分隔線調整對話框寬度（兩個遊戲一起變），記在這台裝置上
    const card = document.querySelector('.draw-card');
    const setSide = (w) => card.style.setProperty('--game-side', w + 'px');
    try { const w = Number(localStorage.getItem('hq-game-side')); if (w) setSide(w); } catch (e) {}
    document.querySelectorAll('.game-split').forEach(sp => {
      sp.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        sp.setPointerCapture(e.pointerId);
        sp.classList.add('dragging');
        const main = sp.parentNode.getBoundingClientRect();
        const move = (ev) => {
          const w = Math.round(Math.max(200, Math.min(main.width * 0.7, main.right - ev.clientX)));
          setSide(w);
          try { localStorage.setItem('hq-game-side', w); } catch (err) {}
        };
        const up = () => { sp.classList.remove('dragging'); sp.removeEventListener('pointermove', move); sp.removeEventListener('pointerup', up); sp.removeEventListener('pointercancel', up); };
        sp.addEventListener('pointermove', move);
        sp.addEventListener('pointerup', up);
        sp.addEventListener('pointercancel', up);
      });
    });
    return { open, close };
  })();

  // ---------------- 數值、技能欄 ----------------
  let myStats = null;
  const myCls = () => (myStats && ST.CLASSES[myStats.cls] ? myStats.cls : 'staff');
  const special = () => ST.CLASSES[myCls()].skills[1];
  const basic = () => ST.basicOf(myCls(), myEquip); // 拿武器的話普攻換成武器的打法
  const special2 = () => ST.CLASSES[myCls()].skills[2];
  const cooldowns = {}; // skillId -> 冷卻結束的時間（performance.now）
  function renderStats(st) {
    const clsChanged = !myStats || myStats.cls !== st.cls;
    myStats = st;
    $('hp-fill').style.width = $('hp-mini').style.width = (100 * st.hp / st.maxHp) + '%';
    $('mp-fill').style.width = $('mp-mini').style.width = (100 * st.mp / st.maxMp) + '%';
    $('hp-text').textContent = `${st.hp}/${st.maxHp}`;
    $('mp-text').textContent = `${st.mp}/${st.maxMp}`;
    $('atk-text').textContent = st.atk + (st.atkBuffMs > 0 ? ' ↑' : '');
    $('def-text').textContent = st.def + (st.buffMs > 0 ? ' ↑' : '');
    $('lv-text').textContent = 'Lv.' + st.level;
    $('exp-fill').style.width = (100 * st.exp / st.expNext) + '%';
    $('exp-text').textContent = `${st.exp}/${st.expNext}`;
    try { localStorage.setItem('hq-level', st.level); localStorage.setItem('hq-exp', st.exp); } catch (e) {}
    const c = ST.CLASSES[myCls()];
    $('cls-text').replaceChildren(icon('cls-' + myCls(), c.icon), el('span', 'cls-name', ' ' + c.name));
    if (clsChanged) renderSkillbar();
    if (modalKind === 'skills') openSkills();
  }
  // 角色資料：點一下收成一行（職業圖示、等級、血條、魔力條），手機預設收起
  $('stats').classList.toggle('mini', folded('stats', SMALL()));
  $('stats').addEventListener('click', () => store('hq-fold-stats', $('stats').classList.toggle('mini') ? '1' : '0'));
  // 手機：左邊的面板（角色資料、在線條、預告條、點唱機、副本膠囊）由上往下排，誰收合了下面的就跟著往上補
  function stackLeft() {
    const ids = matchMedia('(max-width: 600px)').matches ? ['stats', 'banner', 'notice-bar', 'music', 'dg-panel']
      : matchMedia('(max-height: 520px)').matches ? ['stats', 'music'] : [];
    ['banner', 'notice-bar', 'music', 'dg-panel'].forEach(id => { $(id).style.top = ''; });
    let y = null;
    ids.forEach(id => {
      const e = $(id);
      if (e.hidden || !e.getClientRects().length) return;
      if (y != null) e.style.top = y + 'px';
      y = e.getBoundingClientRect().bottom + 8;
    });
  }
  let stackRaf = 0;
  const restack = () => { cancelAnimationFrame(stackRaf); stackRaf = requestAnimationFrame(stackLeft); };
  if (window.ResizeObserver) { const ro = new ResizeObserver(restack); ['stats', 'banner', 'notice-bar', 'music', 'dg-panel'].forEach(id => ro.observe($(id))); }
  window.addEventListener('resize', restack);
  // 技能欄：普攻一直都在，其他技能收進摺頁；走進颱風前線、副本自動打開，回到室內自動收起來
  function setSkillFold(f) {
    $('skillbar').classList.toggle('folded', f);
    $('sk-fold').setAttribute('aria-label', f ? '展開技能欄' : '收合技能欄');
  }
  setSkillFold(true);
  $('sk-fold').addEventListener('click', () => setSkillFold(!$('skillbar').classList.contains('folded')));
  // 技能列：一排小方塊，角落標快捷鍵；說明放在滑鼠移上去（手機長按）跳出來的提示框
  function renderSkillbar() {
    [['basic-btn', basic(), '空白'], ['skill-btn', special(), 'K'], ['skill2-btn', special2(), 'L']].forEach(([btn, id, key]) => {
      const sk = ST.SKILLS[id], b = $(btn);
      b.innerHTML = '';
      b.appendChild(el('i', 'cd'));
      b.appendChild(icon('sk-' + id, sk.icon, 'sk-icon'));
      b.appendChild(el('kbd', null, key));
      b.setAttribute('aria-label', sk.name);
      b.tip = () => [sk.name, `${key === '空白' ? '空白鍵' : key} · ${sk.mp ? sk.mp + ' MP · ' : ''}冷卻 ${sk.cooldown / 1000} 秒` +
        (sk.support ? '' : ` · 射程 ${sk.range}`), sk.desc];
    });
  }
  $('skills-open').replaceChildren(icon('btn-book', '📖'));
  $('cake-ic').replaceChildren(icon('btn-cake', ''));
  document.querySelector('.song-disc').replaceChildren(icon('btn-song', ''));
  $('fw-btn').replaceChildren(icon('btn-fw', '🎆'));
  $('skills-open').tip = () => ['技能說明', '', '看你的職業和全部技能'];
  $('fw-btn').tip = () => ['慶祝煙火', '', `Lv.${ST.LEVEL.fireworkLv} 以上可以在天空放一行字的煙火`];
  $('cake-btn').tip = () => ['放下蛋糕', '', '把手上的蛋糕放下來'];
  (() => {
    const tip = $('sk-tip');
    let press = null, longPressed = false;
    const show = (b) => {
      if (!b.tip) return;
      const [name, meta, desc] = b.tip();
      tip.innerHTML = '';
      tip.appendChild(el('b', null, name));
      if (meta) tip.appendChild(el('small', null, meta));
      tip.appendChild(el('p', null, desc));
      tip.hidden = false;
      const r = b.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
      tip.style.top = (r.top - h - 10 < 8 ? r.bottom + 10 : r.top - h - 10) + 'px';
    };
    const hide = () => { tip.hidden = true; };
    document.querySelectorAll('#skillbar .sk-btn').forEach(b => {
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(b); });
      b.addEventListener('pointerleave', (e) => { clearTimeout(press); if (e.pointerType === 'mouse') hide(); });
      // 手機長按看說明，放開後不會觸發技能
      b.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        longPressed = false;
        clearTimeout(press);
        press = setTimeout(() => { longPressed = true; show(b); }, 450);
      });
      b.addEventListener('pointerup', () => { clearTimeout(press); if (longPressed) setTimeout(hide, 1800); });
      b.addEventListener('click', (e) => { if (longPressed) { e.stopImmediatePropagation(); e.preventDefault(); longPressed = false; } }, true);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  })();
  function openSkills() {
    const c = ST.CLASSES[myCls()];
    const box = el('div', 'modal-list');
    const head = el('div', 'modal-row cls-head');
    head.appendChild(el('div', 'modal-icon')).appendChild(icon('cls-' + myCls(), c.icon));
    const info = el('div', 'modal-info');
    info.appendChild(el('b', null, `${c.name}（${c.role}）`));
    info.appendChild(el('p', null, c.desc));
    if (myStats) info.appendChild(el('p', 'mono', `HP ${myStats.maxHp} · MP ${myStats.maxMp} · ATK ${myStats.atk} · DEF ${myStats.def}`));
    head.appendChild(info);
    box.appendChild(head);
    c.skills.forEach((id, i) => {
      const sk = ST.SKILLS[id];
      const row = el('div', 'modal-row');
      row.appendChild(el('div', 'modal-icon')).appendChild(icon('sk-' + id, sk.icon));
      const inf = el('div', 'modal-info');
      inf.appendChild(el('b', null, sk.name));
      inf.appendChild(el('span', 'mono tag', `${['空白鍵', 'K', 'L'][i]} · ${sk.mp} MP · 冷卻 ${sk.cooldown / 1000} 秒` +
        (sk.support ? '' : ` · 射程 ${sk.range}`)));
      inf.appendChild(el('p', null, sk.desc));
      const lv = myStats ? myStats.level : 1, k = ST.boost(lv), plus = ST.bonusDef(lv);
      const now = [];
      if (sk.power && myStats) now.push(`傷害約 ${Math.round(myStats.atk * sk.power * 0.6)}～${Math.round(myStats.atk * sk.power * 1.2)}`);
      if (sk.heal) now.push(`補 ${Math.round(sk.heal.hp * k)} 血、${Math.round(sk.heal.mp * k)} 魔力`);
      if (sk.teamDef) now.push(`隊友防禦 +${sk.teamDef.v + plus}`);
      if (sk.selfDef) now.push(`自己防禦 +${sk.selfDef.v + plus}`);
      if (sk.teamAtk) now.push(`隊友攻擊 +${Math.round(sk.teamAtk.mul * 100)}%`);
      if (sk.summon) now.push(`召喚物攻擊和血量 ×${k.toFixed(2)}`);
      if (now.length) inf.appendChild(el('p', 'mono', `Lv.${lv} 目前效果：${now.join('、')}`));
      row.appendChild(inf);
      const b = el('button', 'primary small', '使用');
      b.onclick = () => { closeModal(); if (scene) scene.useSkill(id); };
      row.appendChild(b);
      box.appendChild(row);
    });
    box.appendChild(el('p', 'modal-hint', '想換職業？到 指揮中心找 轉職資料沈理員。'));
    openModal('skills', '技能', box);
  }
  // 轉職導師的對話視窗
  function openMentor() {
    const box = el('div', 'modal-list');
    box.appendChild(el('p', 'mentor-say', '「你的資料我都整理好了。颱風天，每個人都要找到自己的位置，想轉成哪一種防衛員？」'));
    Object.entries(ST.CLASSES).forEach(([id, c]) => {
      const st = ST.statsFor(id), sk = ST.SKILLS[c.skills[1]];
      const row = el('div', 'modal-row' + (id === myCls() ? ' on' : ''));
      row.appendChild(el('div', 'modal-icon')).appendChild(icon('cls-' + id, c.icon));
      const inf = el('div', 'modal-info');
      inf.appendChild(el('b', null, `${c.name}（${c.role}）`));
      inf.appendChild(el('p', null, c.desc));
      inf.appendChild(el('span', 'mono tag', `HP ${st.maxHp} · MP ${st.maxMp} · ATK ${st.atk} · DEF ${st.def}`));
      c.skills.slice(1).forEach(sid => { const s2 = ST.SKILLS[sid]; inf.appendChild(el('p', null, ` ${s2.name}：${s2.desc}`)).prepend(icon('sk-' + sid, '')); });
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
          toast(`轉職成功，現在是${c.name}！`);
        });
      };
      row.appendChild(b);
      box.appendChild(row);
    });
    openModal('mentor', '轉職資料沈理員', box);
  }
  // 慶祝煙火的輸入視窗
  function openFirework() {
    const box = el('form', 'fw-form');
    const lv = myStats ? myStats.level : 1;
    if (lv < ST.LEVEL.fireworkLv) {
      box.appendChild(el('p', 'mentor-say', `升到 Lv.${ST.LEVEL.fireworkLv} 才能放煙火，你現在是 Lv.${lv}。`));
      box.appendChild(el('p', 'modal-hint', '打颱風和野外的小怪會拿到經驗；在總部每待 10 分鐘也會自動升一等。'));
      openModal('firework', '慶祝煙火', box);
      return;
    }
    box.appendChild(el('p', 'modal-hint', '輸入想放的字（最多 8 個字），煙火會在你頭上炸開拼成這幾個字，大家都看得到！'));
    const input = el('input');
    input.maxLength = 8; input.placeholder = '例如：颱風退散';
    input.value = localStorage.getItem('hq-fw') || '';
    box.appendChild(input);
    const chips = el('div', 'chips');
    ['颱風退散', '天天快樂', '乾杯', '防衛成功', '放假囉'].forEach(t => {
      const b = el('button', null, t); b.type = 'button';
      b.onclick = () => { input.value = t; input.focus(); };
      chips.appendChild(b);
    });
    box.appendChild(chips);
    const go = el('button', 'primary', '發射！'); go.type = 'submit';
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
    openModal('firework', '慶祝煙火', box);
    setTimeout(() => input.focus(), 50);
  }

  // ---------------- 個人資料（VIP Pass） ----------------
  // 右鍵選單
  function showMenu(who, cx, cy) {
    const m = $('ctx-menu');
    m.innerHTML = '';
    m.appendChild(el('div', 'ctx-name', who.name_));
    const b = el('button', null, '個人資料');
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
      const pl = box.appendChild(el('p', 'mono prof-line', `Lv.${res.level} · `));
      pl.append(icon('cls-' + (ST.CLASSES[res.cls] ? res.cls : 'staff'), c.icon), ' ' + c.name);
      const v = res.vip;
      if (!v) {
        box.appendChild(el('p', 'mentor-say', `${res.name} 還沒有在報名頁生成邀請函，所以沒有 VIP Pass。`));
        const a = el('a', 'primary small', '去報名頁生成邀請函'); a.href = '/'; a.target = '_blank';
        if (me && id === me.id) box.appendChild(a);
        openModal('profile', `${res.name}`, box);
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
      if (v.photo) { const img = el('img'); img.src = 'data:image/jpeg;base64,' + (v.hd || v.photo); img.alt = v.name + ' 的大頭照'; ava.appendChild(img); }
      idRow.appendChild(ava);
      const who = el('div', 'vip-who');
      const tier = el('span', 'vip-tier');
      tier.appendChild(el('span', 'vip-hq', '防颱總部'));
      tier.appendChild(el('span', null, TIERS[hashOf(v.name) % TIERS.length]));
      who.appendChild(tier);
      who.appendChild(el('span', 'vip-name', v.name));
      who.appendChild(el('span', 'vip-sub', `特約職員・${config.party.md} 颱風假開趴`));
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
      stub.appendChild(el('span', 'vip-k', `${config.party.dateDot} / ${config.party.time}`));
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
      openModal('profile', `${res.name} 的個人資料`, box);
      $('modal').classList.add('wide');
    });
  }

  // 希臘少女的台詞：說完就幫你打開許願池
  const GREEK_LINES = [
    '噓…願望說出來就不靈了，寫下來吧',
    '把硬幣丟進池子裡，再把願望寫清楚一點',
    '遇到 Bug 也可以來這裡說，我會偷偷轉告管理員',
    '先看看有沒有人許過一樣的願，幫他按個讚吧',
    '颱風天也要記得許願喔',
  ];
  // iconKey：手繪 icon 的 key（public/icons.js、icons-more.js），放在文字前面
  function toast(text, iconKey) {
    const t = el('div', 'toast', plain(text));
    if (iconKey && window.HQ_ICONS && HQ_ICONS.url(iconKey)) t.prepend(icon(iconKey, ''), ' ');
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  $('basic-btn').addEventListener('click', () => {
    if (!scene || !scene.me) return;
    const a = scene.nearbyAction();
    if (a && a.type === 'attack') scene.doAction(a); else toast('附近沒有可以攻擊的目標');
  });
  $('skill-btn').addEventListener('click', () => scene && scene.useSkill(special()));
  $('skill2-btn').addEventListener('click', () => scene && scene.useSkill(special2()));
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
  // 靠近 NPC／物件時，頭上冒出的提示紙條：手繪 icon＋動作名稱＋「空白鍵」（手機是「點我」），底下有小尖角指著它
  const HINTS = {
    crate: ['act-crate', '敲箱子'], cook: ['act-cook', '煮泡麵'], mentor: ['act-mentor', '轉職'],
    guard: ['act-guard', '前往副本'], elevator: ['act-elevator', '前往 101'], dj: ['btn-song', '點歌'], tv: ['act-tv', '視訊／遊戲'], well: ['wish-coin', '許個願'], greek: ['act-greek', '說話'],
  };
  // tail：尖角朝哪邊（down＝紙條在東西上面；left／right＝紙條在旁邊，上面被介面擋住的時候用）
  function drawHint(type, touch, tail) {
    const [iconKey, label] = HINTS[type];
    const RES = 2, ICON = 22, PH = 30, TL = 7;
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    const font = `bold 13px ${FONT}`, capFont = `bold 10px ${FONT}`;
    const cap = touch ? '點我' : '空白鍵';
    ctx.font = font; const tw = ctx.measureText(label).width;
    ctx.font = capFont; const cw = ctx.measureText(cap).width + 10;
    const bw = Math.ceil(7 + ICON + 5 + tw + 7 + cw + 7);
    // 紙條本體的左上角（尖角在左邊就整張往右挪）
    const ox = 2 + (tail === 'left' ? TL : 0), oy = 1.5;
    const w = bw + 5 + (tail === 'down' ? 0 : TL), h = PH + 4 + (tail === 'down' ? TL : 0);
    cv.width = w * RES; cv.height = h * RES;
    ctx.scale(RES, RES);
    const CR = window.HQ_CRAYON, r = CR.rng(label.length * 97 + (touch ? 1 : 0));
    const tri = (dx, dy) => {
      ctx.beginPath();
      if (tail === 'down') { const m = ox + bw / 2; ctx.moveTo(m - 7 + dx, oy + PH - 1 + dy); ctx.lineTo(m + dx, oy + PH + TL + dy); ctx.lineTo(m + 7 + dx, oy + PH - 1 + dy); }
      else if (tail === 'left') { const m = oy + PH / 2; ctx.moveTo(ox + 1 + dx, m - 7 + dy); ctx.lineTo(ox - TL + dx, m + dy); ctx.lineTo(ox + 1 + dx, m + 7 + dy); }
      else { const m = oy + PH / 2, e = ox + bw; ctx.moveTo(e - 1 + dx, m - 7 + dy); ctx.lineTo(e + TL + dx, m + dy); ctx.lineTo(e - 1 + dx, m + 7 + dy); }
    };
    // 影子 → 紙 → 描邊 → 尖角
    ctx.fillStyle = 'rgba(43,42,51,0.28)';
    CR.rect(ctx, ox + 2, oy + 2, bw, PH, r, 0.6); ctx.fill(); tri(2, 2); ctx.closePath(); ctx.fill();
    CR.rect(ctx, ox, oy, bw, PH, r, 1.1); ctx.fillStyle = PAPER; ctx.fill(); CR.stroke(ctx, r, 1.6, INK);
    tri(0, 0); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill();
    tri(0, 0); CR.stroke(ctx, r, 1.6, INK);
    const icon = HQ_ICONS.canvas(iconKey);
    if (icon) ctx.drawImage(icon, ox + 7, oy + (PH - ICON) / 2, ICON, ICON);
    ctx.font = font; ctx.fillStyle = INK; ctx.textBaseline = 'middle';
    ctx.fillText(label, ox + 7 + ICON + 5, oy + PH / 2 + 0.5);
    // 小鍵帽／點我
    const cx = ox + 7 + ICON + 5 + tw + 7, cy = oy + (PH - 17) / 2;
    CR.rect(ctx, cx, cy + 1.5, cw, 17, r, 0.4); ctx.fillStyle = touch ? '#c9562a' : '#b9b2a2'; ctx.fill();
    CR.rect(ctx, cx, cy, cw, 15.5, r, 0.4); ctx.fillStyle = touch ? '#ff6a13' : '#ffffff'; ctx.fill(); CR.stroke(ctx, r, 1.3, INK);
    ctx.font = capFont; ctx.fillStyle = touch ? '#ffffff' : INK; ctx.textAlign = 'center';
    ctx.fillText(cap, cx + cw / 2, cy + 8.5);
    return cv;
  }

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
  // 套裝特效用哪張圖、多久飄一個（key 對應 shared/gear.js 的 SERIES[].fx）
  const SET_FX = {
    heart: { kind: 'heart', every: 420, ring: 0xff7ab0, tint: [0xff8fb8, 0xffb3d1, 0xff6b9a] },
    redPacket: { kind: 'redPacket', every: 700, ring: 0xffb020 },
    petal: { kind: 'petal', every: 260, ring: 0xffd0e2, tint: [0xffffff, 0xffd0e2, 0xffb3c8, 0xfff4f8] },
    butterfly: { kind: 'butterfly', every: 1100, ring: 0x9be7c4, tint: [0xffffff, 0xffe0f0, 0xd8ffe9] },
  };
  const FX = {
    // NPC 頭上的對話泡泡（自己畫，不用系統 emoji）
    talk: () => fxCanvas(34, 30, 91, (ctx, r) => {
      ctx.beginPath(); ctx.moveTo(9, 18); ctx.lineTo(6, 27); ctx.lineTo(16, 20); ctx.closePath();
      CR.fill(ctx, '#fbf6e9', r, null); CR.stroke(ctx, r, 1.8);
      CR.blob(ctx, 17, 12, 14, 9.5, r, 0.06, 14); CR.fill(ctx, '#fbf6e9', r, null); CR.stroke(ctx, r, 1.8);
      [10, 17, 24].forEach(x => { ctx.beginPath(); ctx.arc(x, 12.5, 1.9, 0, Math.PI * 2); ctx.fillStyle = '#2b2a33'; ctx.fill(); });
    }),
    // 金針花標射出去的那朵金針花
    lily: () => fxCanvas(40, 40, 81, (ctx, r) => {
      ctx.translate(20, 20);
      for (let i = 0; i < 6; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 3);
        CR.blob(ctx, 0, -9, 4.4, 9.5, r, 0.1, 12); CR.fill(ctx, i % 2 ? '#ff8a3d' : '#ffa53a', r, null); CR.stroke(ctx, r, 1.6);
        ctx.restore();
      }
      CR.blob(ctx, 0, 0, 4, 4, r, 0.1, 10); CR.fill(ctx, '#ffd23f', r, null); CR.stroke(ctx, r, 1.4);
    }),
    // 九曲洞要推的大理石塊
    marble: () => fxCanvas(52, 60, 82, (ctx, r) => {
      ctx.fillStyle = 'rgba(19,26,40,0.2)'; ctx.beginPath(); ctx.ellipse(26, 54, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
      CR.rect(ctx, 4, 16, 44, 38, r, 1.4); CR.fill(ctx, '#e2e0da', r, [4, 16, 44, 38]); CR.stroke(ctx, r, 2.6);
      CR.rect(ctx, 4, 6, 44, 14, r, 1.2); CR.fill(ctx, '#f7f6f2', r, null); CR.stroke(ctx, r, 2.6);
      CR.line(ctx, 8, 30, 22, 38, r, 1.4, 'rgba(110,118,132,0.7)', 1);
      CR.line(ctx, 22, 38, 30, 28, r, 1.2, 'rgba(110,118,132,0.6)', 1);
      CR.line(ctx, 30, 44, 44, 36, r, 1.4, 'rgba(110,118,132,0.7)', 1);
    }),
    // 悠遊卡飛出去的那張卡（藍色卡片、白色的捷運線）
    card: () => fxCanvas(40, 28, 83, (ctx, r) => {
      CR.rect(ctx, 3, 3, 34, 22, r, 0.8); CR.fill(ctx, '#4f9fd8', r, [3, 3, 34, 22]); CR.stroke(ctx, r, 2);
      CR.line(ctx, 6, 18, 34, 10, r, 2.2, '#ffffff', 0.4);
      CR.blob(ctx, 11, 10, 3.4, 3.4, r, 0.1, 10); CR.fill(ctx, '#ffd23f', r, null); CR.stroke(ctx, r, 1);
    }),
    // 阻尼球流星錘甩出去的金球
    goldball: () => fxCanvas(40, 40, 84, (ctx, r) => {
      CR.blob(ctx, 20, 20, 15, 15, r, 0.04); CR.fill(ctx, '#ffc93c', r, [5, 5, 30, 30]); CR.stroke(ctx, r, 2.4);
      [[20, 6, 20, 34], [7, 14, 33, 14], [7, 26, 33, 26]].forEach(([a, b, c2, d]) => CR.line(ctx, a, b, c2, d, r, 1.2, 'rgba(160,112,40,0.7)', 0.4));
      CR.blob(ctx, 14, 13, 4, 2.6, r, 0.1); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
    }),
    // 87 樓的大阻尼球：金色的大球，一圈一圈的鋼板
    damper: () => fxCanvas(150, 150, 85, (ctx, r) => {
      ctx.fillStyle = 'rgba(19,26,40,0.2)'; ctx.beginPath(); ctx.ellipse(75, 140, 52, 8, 0, 0, Math.PI * 2); ctx.fill();
      CR.blob(ctx, 75, 72, 64, 64, r, 0.02, 30); CR.fill(ctx, '#f2b632', r, [11, 8, 128, 128], 1.4); CR.stroke(ctx, r, 3.2);
      [-40, -20, 0, 20, 40].forEach(dy => {
        const w = Math.sqrt(Math.max(0, 64 * 64 - dy * dy));
        ctx.beginPath(); ctx.ellipse(75, 72 + dy, w, 6, 0, 0, Math.PI); CR.stroke(ctx, r, 1.6, 'rgba(140,96,20,0.6)');
      });
      CR.blob(ctx, 52, 44, 16, 10, r, 0.1); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
    }),
    // 台北101關卡之間的電梯門
    tpgate: () => fxCanvas(96, 144, 86, (ctx, r) => {
      ctx.scale(2, 2);
      CR.rect(ctx, 2, 6, 44, 64, r, 1); CR.fill(ctx, '#c6cbd6', r, [2, 6, 44, 64], 0.8); CR.stroke(ctx, r, 2.6);
      CR.line(ctx, 24, 8, 24, 69, r, 2);
      CR.rect(ctx, 14, 12, 20, 9, r, 0.6); CR.fill(ctx, '#2b2a33', r, null); CR.stroke(ctx, r, 1.4);
      ctx.fillStyle = '#ffb020'; ctx.font = '900 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('101', 24, 19);
    }),
    // 全身 SSR：腳下的彩虹光暈（畫成圓的，遊戲裡壓扁再慢慢轉）、繞著飄的小星星
    aura: () => fxCanvas(120, 120, 61, (ctx, r) => {
      const g = ctx.createRadialGradient(60, 60, 10, 60, 60, 58);
      g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(60, 60, 58, 0, Math.PI * 2); ctx.fill();
      // 一圈一段一段換顏色的蠟筆線，外圈淡、內圈濃
      for (let i = 0; i < 36; i++) {
        const a0 = i / 36 * Math.PI * 2, a1 = (i + 1.15) / 36 * Math.PI * 2, col = `hsl(${i * 10}, 90%, 65%)`;
        ctx.lineCap = 'round';
        [[50, 12, 0.35], [46, 6, 0.95]].forEach(([rad, w, al]) => {
          ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = w + (r() - 0.5) * 1.5;
          ctx.beginPath(); ctx.arc(60, 60, rad + (r() - 0.5) * 2, a0, a1); ctx.stroke();
        });
      }
      ctx.globalAlpha = 1;
    }),
    star: () => fxCanvas(26, 26, 62, (ctx, r) => {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? 4.6 : 11; pts.push([13 + Math.cos(a) * d, 13 + Math.sin(a) * d]); }
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      CR.fill(ctx, '#ffd23f', r, null); CR.stroke(ctx, r, 2);
    }),
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
    // 美麗聖潔弓箭：白金色的箭身、愛心箭頭、天使羽毛箭尾（兩倍大，顯示時縮小）
    holyarrow: () => fxCanvas(220, 64, 47, (ctx, r) => {
      ctx.scale(2, 2);
      CR.line(ctx, 14, 16, 88, 16, r, 4.6, CR.INK, 0.3);
      CR.line(ctx, 14, 16, 88, 16, r, 2.6, '#fff4c9', 0.3);
      [[2, 5], [2, 27], [10, 6], [10, 26]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.moveTo(x + 14, 16); ctx.quadraticCurveTo(x + 2, y, x, y); ctx.quadraticCurveTo(x + 8, 16, x + 14, 16); ctx.closePath();
        CR.fill(ctx, '#ffffff', r, null); CR.stroke(ctx, r, 1.6);
      });
      ctx.save(); ctx.translate(98, 16); ctx.rotate(Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0, 11); ctx.bezierCurveTo(-14, 2, -10, -11, 0, -5); ctx.bezierCurveTo(10, -11, 14, 2, 0, 11); ctx.closePath();
      CR.fill(ctx, '#ff6b9a', r, null); CR.stroke(ctx, r, 2.2); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(96, 12, 2, 0, Math.PI * 2); ctx.fill();
    }),
    // 柔柔的一團光（白色，用的時候再染色，配 ADD 混色看起來會發光）
    glow: () => fxCanvas(64, 64, 55, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    }),
    // 四角的小星光
    sparkle: () => fxCanvas(32, 32, 56, (ctx) => {
      ctx.fillStyle = '#ffffff'; ctx.beginPath();
      ctx.moveTo(16, 0); ctx.quadraticCurveTo(18, 14, 32, 16); ctx.quadraticCurveTo(18, 18, 16, 32); ctx.quadraticCurveTo(14, 18, 0, 16); ctx.quadraticCurveTo(14, 14, 16, 0);
      ctx.fill();
    }),
    // 金幣
    coin: () => fxCanvas(26, 26, 57, (ctx, r) => {
      CR.blob(ctx, 13, 13, 10, 10, r, 0.06, 14); CR.fill(ctx, '#ffd23f', r, null); CR.stroke(ctx, r, 1.8);
      CR.blob(ctx, 13, 13, 5.5, 5.5, r, 0.08, 12); CR.stroke(ctx, r, 1.4, '#e0a400');
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(8, 8, 3, 2);
    }),
    // 套裝特效：小紅包（生肖）、花瓣（婚禮，白色用的時候再染色）、小蝴蝶（森林布偶）
    redpacket: () => fxCanvas(30, 38, 52, (ctx, r) => {
      CR.rect(ctx, 4, 4, 22, 30, r, 0.8); CR.fill(ctx, '#e8384f', r, null); CR.stroke(ctx, r, 2);
      ctx.beginPath(); ctx.moveTo(4, 10); ctx.quadraticCurveTo(15, 18, 26, 10); CR.stroke(ctx, r, 1.6);
      CR.blob(ctx, 15, 15, 3.4, 3.4, r, 0.1, 10); CR.fill(ctx, '#ffd23f', r, null); CR.stroke(ctx, r, 1.2);
      [[9, 26], [21, 28], [14, 30]].forEach(([x, y]) => { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill(); });
    }),
    petal: () => fxCanvas(26, 20, 53, (ctx, r) => {
      ctx.beginPath(); ctx.moveTo(3, 10); ctx.quadraticCurveTo(12, -1, 23, 8); ctx.quadraticCurveTo(14, 21, 3, 10); ctx.closePath();
      CR.fill(ctx, '#ffffff', r, null); CR.stroke(ctx, r, 1.4);
    }),
    butterfly: () => fxCanvas(36, 30, 54, (ctx, r) => {
      [-1, 1].forEach(k => {
        CR.blob(ctx, 18 + k * 8, 11, 7.5, 7, r, 0.08, 12); CR.fill(ctx, '#8fd3ff', r, null); CR.stroke(ctx, r, 1.6);
        CR.blob(ctx, 18 + k * 6, 21, 5, 4.6, r, 0.08, 12); CR.fill(ctx, '#b39cff', r, null); CR.stroke(ctx, r, 1.6);
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(18 + k * 9, 10, 2, 0, Math.PI * 2); ctx.fill();
      });
      CR.blob(ctx, 18, 16, 1.8, 8, r, 0.06, 10); CR.fill(ctx, '#2b2a33', r, null);
    }),
    // 小愛心（白底黑框，用的時候再染色）
    heart: () => fxCanvas(36, 34, 48, (ctx, r) => {
      ctx.beginPath(); ctx.moveTo(18, 30); ctx.bezierCurveTo(-2, 16, 4, 0, 18, 9); ctx.bezierCurveTo(32, 0, 38, 16, 18, 30); ctx.closePath();
      CR.fill(ctx, '#ffffff', r, null); CR.stroke(ctx, r, 2);
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
    // 雷暴圈裡的小龍捲風：上寬下窄的漏斗，一圈一圈的風線
    twister: () => fxCanvas(64, 96, 61, (ctx, r) => {
      for (let i = 0; i < 6; i++) {
        const y = 14 + i * 13, w = 28 - i * 4;
        CR.blob(ctx, 32 + (i % 2 ? 3 : -3), y, w, 7, r, 0.1, 14);
        CR.fill(ctx, i % 2 ? '#d7dde8' : '#eef1f6', r, null); CR.stroke(ctx, r, 2, '#4a5470');
      }
      ctx.beginPath(); ctx.moveTo(30, 84); ctx.quadraticCurveTo(34, 90, 28, 94);
      CR.stroke(ctx, r, 2.4, '#4a5470');
      [[20, 30, 40, 26], [24, 56, 38, 52]].forEach(([x1, y1, x2, y2]) => CR.line(ctx, x1, y1, x2, y2, r, 1.6, '#8a93a8', 0.6));
    }),
    // 音符（歌姬的普攻、靈魂之歌）
    note: () => fxCanvas(34, 40, 41, (ctx, r) => {
      CR.blob(ctx, 11, 31, 8, 6, r, 0.08, 12); CR.fill(ctx, '#8a5cd6', r, null); CR.stroke(ctx, r, 2.2);
      CR.line(ctx, 18, 30, 18, 6, r, 3, CR.INK, 0.2);
      ctx.beginPath(); ctx.moveTo(18, 6); ctx.quadraticCurveTo(30, 10, 30, 20); ctx.quadraticCurveTo(26, 14, 18, 14); ctx.closePath();
      CR.fill(ctx, '#8a5cd6', r, null); CR.stroke(ctx, r, 2);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(8.5, 29, 2.2, 1.4, -0.5, 0, Math.PI * 2); ctx.fill();
    }),
    // 音符變成的小刀：刀尖朝右
    blade: () => fxCanvas(64, 22, 42, (ctx, r) => {
      ctx.beginPath(); ctx.moveTo(18, 4); ctx.lineTo(50, 5); ctx.lineTo(62, 11); ctx.lineTo(50, 17); ctx.lineTo(18, 18); ctx.closePath();
      CR.fill(ctx, '#eef2fb', r, null); CR.stroke(ctx, r, 2, '#5b3f8f');
      CR.line(ctx, 20, 11, 54, 11, r, 1.4, '#b9a3ec', 0.3);
      CR.rect(ctx, 12, 2, 5, 18, r, 0.4); CR.fill(ctx, '#ffd23f', r, null); CR.stroke(ctx, r, 1.6);
      CR.rect(ctx, 2, 8, 10, 6, r, 0.4); CR.fill(ctx, '#8a5cd6', r, null); CR.stroke(ctx, r, 1.6);
    }),
    // 一坨顏料（畫的時候染成別的顏色）
    paint: () => fxCanvas(40, 34, 43, (ctx, r) => {
      CR.blob(ctx, 20, 17, 15, 12, r, 0.22, 14); CR.fill(ctx, '#ffffff', r, null); CR.stroke(ctx, r, 2.2);
      [[6, 6, 3], [34, 28, 2.6], [35, 7, 2]].forEach(([x, y, rad]) => { CR.blob(ctx, x, y, rad, rad, r, 0.2, 10); CR.fill(ctx, '#ffffff', r, null); CR.stroke(ctx, r, 1.4); });
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(14, 12, 4, 2.5, -0.5, 0, Math.PI * 2); ctx.fill();
    }),
    // 冰錐：尖端朝下的一根長冰柱
    icicle: () => fxCanvas(44, 120, 31, (ctx, r) => {
      ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(40, 4); ctx.lineTo(30, 40); ctx.lineTo(22, 116); ctx.lineTo(14, 40); ctx.closePath();
      CR.fill(ctx, '#bfe6ff', r, null); CR.stroke(ctx, r, 2.6, '#2f5f8f');
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(12, 9); ctx.lineTo(19, 9); ctx.lineTo(20, 70); ctx.closePath(); ctx.fill();
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
    // 南丁格爾的大針筒
    syringe: () => fxCanvas(56, 20, 43, (ctx, r) => {
      CR.rect(ctx, 10, 5, 30, 10, r, 0.5); CR.fill(ctx, '#e8f4ff', r, null); CR.stroke(ctx, r, 2);
      ctx.fillStyle = 'rgba(232,56,79,0.7)'; ctx.fillRect(22, 7, 17, 6);
      [16, 22, 28, 34].forEach(x => CR.line(ctx, x, 5, x, 9, r, 1, CR.INK, 0.2));
      CR.line(ctx, 2, 10, 10, 10, r, 2.4, '#9aa3b5', 0.2); CR.line(ctx, 2, 6, 2, 14, r, 2.4, CR.INK, 0.2);
      CR.line(ctx, 40, 10, 54, 10, r, 1.4, '#9aa3b5', 0.1);
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
    // 慶祝時飄出來的音符：白底黑框，顯示時再染成粉彩色（兩倍大，顯示時縮小）
    note: () => fxCanvas(56, 64, 44, (ctx, r) => {
      ctx.scale(2, 2);
      CR.line(ctx, 15, 25, 15, 5, r, 2.4, CR.INK, 0.2);
      ctx.beginPath(); ctx.moveTo(15, 5); ctx.quadraticCurveTo(25, 9, 24, 18); ctx.quadraticCurveTo(22, 12, 15, 11);
      ctx.fillStyle = '#ffffff'; ctx.fill(); CR.stroke(ctx, r, 1.8);
      ctx.save(); ctx.translate(10, 26); ctx.rotate(-0.4);
      CR.blob(ctx, 0, 0, 6, 4.4, r, 0.06, 12); CR.fill(ctx, '#ffffff', r, null); CR.stroke(ctx, r, 2); ctx.restore();
    }),
    notes: () => fxCanvas(64, 64, 45, (ctx, r) => {
      ctx.scale(2, 2);
      CR.line(ctx, 11, 25, 11, 7, r, 2.4, CR.INK, 0.2); CR.line(ctx, 25, 22, 25, 4, r, 2.4, CR.INK, 0.2);
      ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(26, 1); ctx.lineTo(26, 7); ctx.lineTo(10, 11); ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill(); CR.stroke(ctx, r, 1.8);
      [[6, 26], [20, 23]].forEach(([x, y]) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4);
        CR.blob(ctx, 0, 0, 5.6, 4.2, r, 0.06, 12); CR.fill(ctx, '#ffffff', r, null); CR.stroke(ctx, r, 2); ctx.restore();
      });
    }),
    // 彩帶小紙片
    confetti: () => fxCanvas(16, 10, 46, (ctx, r) => {
      CR.rect(ctx, 2, 2, 12, 6, r, 0.4); CR.fill(ctx, '#ffffff', r, null); CR.stroke(ctx, r, 1.2);
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
    } else if (prop === 'spear') {
      // 古城守門員：頭盔＋長矛
      CR.line(ctx, 76, 8, 74, 80, r, 3.4, '#8a5a3a', 0.4);
      ctx.beginPath(); ctx.moveTo(76, -2); ctx.lineTo(82, 12); ctx.lineTo(70, 12); ctx.closePath();
      CR.fill(ctx, '#c9ccd3', r, null); CR.stroke(ctx, r, 2);
      CR.rect(ctx, 70, 12, 12, 4, r, 0.4); CR.fill(ctx, '#e0b84a', r, null); CR.stroke(ctx, r, 1.4);
      ctx.beginPath(); ctx.arc(48, 22, 22, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath();
      CR.fill(ctx, '#9a8f7a', r, null); CR.stroke(ctx, r, 2.4);
      CR.rect(ctx, 25, 20, 46, 6, r, 0.6); CR.fill(ctx, '#e0b84a', r, null); CR.stroke(ctx, r, 2);
      CR.line(ctx, 48, -1, 48, 6, r, 3, '#e8384f', 0.4);
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

  // ---------------- 副本的怪（畫法跟 drawNpc 一樣大：96x84，兩倍解析度） ----------------
  function mobCanvas(seed, draw) {
    const c = document.createElement('canvas');
    c.width = 96 * 2; c.height = 84 * 2;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    draw(ctx, CR.rng(seed));
    return c;
  }
  // 落石怪：一顆生氣的大石頭，長了兩隻小腳
  const drawRockMob = () => mobCanvas(91, (ctx, r) => {
    ctx.fillStyle = 'rgba(19,26,40,0.18)'; ctx.beginPath(); ctx.ellipse(48, 81, 24, 4, 0, 0, Math.PI * 2); ctx.fill();
    [[38, 76], [58, 76]].forEach(([x, y]) => { CR.blob(ctx, x, y, 6, 4, r, 0.08); CR.fill(ctx, '#6e6a64', r, null); CR.stroke(ctx, r, 2.2); });
    CR.blob(ctx, 48, 52, 30, 25, r, 0.12, 14); CR.fill(ctx, '#a39d93', r, [18, 27, 60, 50], 1.2); CR.stroke(ctx, r, 2.8);
    CR.blob(ctx, 40, 40, 12, 7, r, 0.15, 10); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
    CR.line(ctx, 62, 36, 68, 50, r, 1.6, 'rgba(43,42,51,0.55)', 1); CR.line(ctx, 30, 58, 36, 66, r, 1.6, 'rgba(43,42,51,0.55)', 1);
    // 生氣的眉毛和眼睛
    CR.line(ctx, 36, 44, 44, 48, r, 2.6); CR.line(ctx, 60, 44, 52, 48, r, 2.6);
    ctx.fillStyle = CR.INK; [[41, 52], [55, 52]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 2.4, 2.8, 0, 0, Math.PI * 2); ctx.fill(); });
    ctx.beginPath(); ctx.moveTo(42, 62); ctx.quadraticCurveTo(48, 58, 54, 62); CR.stroke(ctx, r, 2);
  });
  // 黑馬分身：黑色的小馬，紫色鬃毛、紅眼睛
  const drawHorseMob = () => mobCanvas(92, (ctx, r) => {
    ctx.fillStyle = 'rgba(19,26,40,0.2)'; ctx.beginPath(); ctx.ellipse(48, 81, 28, 4, 0, 0, Math.PI * 2); ctx.fill();
    [[30, 64], [40, 66], [56, 66], [66, 64]].forEach(([x, y]) => { CR.rect(ctx, x - 3.5, y, 7, 15, r, 0.6); CR.fill(ctx, '#2b2a33', r, null); CR.stroke(ctx, r, 2); });
    CR.blob(ctx, 48, 56, 26, 14, r, 0.06); CR.fill(ctx, '#3a3746', r, [22, 42, 52, 28]); CR.stroke(ctx, r, 2.6);
    // 尾巴
    ctx.beginPath(); ctx.moveTo(24, 50); ctx.quadraticCurveTo(10, 52, 12, 70); ctx.quadraticCurveTo(18, 60, 26, 58); ctx.closePath();
    CR.fill(ctx, '#8a5cd6', r, null); CR.stroke(ctx, r, 2);
    // 脖子＋頭
    ctx.beginPath(); ctx.moveTo(60, 50); ctx.quadraticCurveTo(66, 30, 72, 24); ctx.lineTo(86, 34); ctx.quadraticCurveTo(80, 40, 72, 42); ctx.quadraticCurveTo(70, 52, 70, 58); ctx.closePath();
    CR.fill(ctx, '#3a3746', r, null); CR.stroke(ctx, r, 2.6);
    ctx.beginPath(); ctx.moveTo(64, 46); ctx.quadraticCurveTo(62, 30, 72, 20); ctx.quadraticCurveTo(66, 34, 70, 46); ctx.closePath();
    CR.fill(ctx, '#8a5cd6', r, null); CR.stroke(ctx, r, 1.6);
    ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(77, 29, 2.2, 0, Math.PI * 2); ctx.fill();
  });
  // 花蓮王：黑色披風在後面，前面是 avatar.js 畫的人（npc: 'fu'）
  const drawFuMob = (fist) => mobCanvas(93, (ctx, r) => {
    ctx.beginPath(); ctx.moveTo(28, 50); ctx.quadraticCurveTo(14, 70, 18, 84); ctx.lineTo(78, 84); ctx.quadraticCurveTo(82, 70, 68, 50); ctx.closePath();
    CR.fill(ctx, '#2b2a33', r, null); CR.stroke(ctx, r, 2.4);
    ctx.beginPath(); ctx.moveTo(30, 56); ctx.quadraticCurveTo(24, 72, 26, 84); ctx.lineTo(70, 84); ctx.quadraticCurveTo(72, 72, 66, 56); ctx.closePath();
    ctx.fillStyle = '#5b3f8f'; ctx.fill();
    ctx.save(); ctx.translate(16, 4);
    AV.drawAvatar(ctx, { hair: 'bald', skin: AV.SKINS[1], glasses: '0', cls: 'suit', suit: '#2b2a33', tie: '#8a5cd6', npc: 'fu', fist });
    ctx.restore();
  });
  // ---------- 台北101副本的怪 ----------
  // 飛天招牌：紅色的「大拍賣」招牌長了腳，邊緣被風吹得翹起來
  const drawSignMob = () => mobCanvas(101, (ctx, r) => {
    ctx.fillStyle = 'rgba(19,26,40,0.18)'; ctx.beginPath(); ctx.ellipse(48, 81, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
    [[38, 66], [58, 66]].forEach(([x, y]) => { CR.line(ctx, x, y, x - 1, 78, r, 2.6); CR.blob(ctx, x - 2, 79, 5, 2.6, r, 0.08); CR.fill(ctx, '#2f3b55', r, null); CR.stroke(ctx, r, 2); });
    ctx.save(); ctx.translate(48, 42); ctx.rotate(-0.08);
    CR.rect(ctx, -30, -26, 60, 48, r, 1.4); CR.fill(ctx, '#e8384f', r, [-30, -26, 60, 48], 1.2); CR.stroke(ctx, r, 2.8);
    CR.rect(ctx, -25, -21, 50, 38, r, 1); CR.stroke(ctx, r, 1.6, '#ffd23f');
    ctx.fillStyle = '#ffd23f'; ctx.font = '900 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('大拍賣', 0, -4);
    // 生氣的小臉
    ctx.fillStyle = '#ffffff'; [[-9, 9], [9, 9]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 4, 4.4, 0, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = CR.INK; [[-8, 10], [10, 10]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fill(); });
    CR.line(ctx, -14, 3, -5, 6, r, 2.2); CR.line(ctx, 14, 3, 5, 6, r, 2.2);
    ctx.restore();
    // 上面兩個鐵環被風吹斷了一邊
    CR.line(ctx, 30, 18, 26, 6, r, 1.8, '#5b6577'); CR.line(ctx, 64, 16, 72, 8, r, 1.8, '#5b6577');
    [[16, 30], [80, 26], [84, 40]].forEach(([x, y]) => CR.line(ctx, x, y, x + 8, y - 2, r, 1.6, 'rgba(79,124,194,0.7)', 0.5));
  });
  // 暴衝機車：黃色的小綿羊機車，大燈是眼睛
  const drawScooterMob = (wings) => mobCanvas(wings ? 103 : 102, (ctx, r) => {
    ctx.fillStyle = 'rgba(19,26,40,0.18)'; ctx.beginPath(); ctx.ellipse(48, 81, 30, 4, 0, 0, Math.PI * 2); ctx.fill();
    const body = wings ? '#4f7cc2' : '#ffd23f';
    if (wings) [-1, 1].forEach(k => {
      // 飛天機車：兩邊長出白色翅膀
      ctx.save(); ctx.translate(48 + k * 6, 46); ctx.scale(k, 1);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(26, -30, 44, -26); ctx.quadraticCurveTo(36, -16, 40, -10); ctx.quadraticCurveTo(28, -8, 30, 0); ctx.quadraticCurveTo(14, 4, 0, 0); ctx.closePath();
      CR.fill(ctx, '#fbfbf8', r, null); CR.stroke(ctx, r, 2.2);
      CR.line(ctx, 10, -6, 30, -18, r, 1.2, 'rgba(110,118,132,0.6)', 0.4);
      ctx.restore();
    });
    [[26, 72], [70, 72]].forEach(([x, y]) => { CR.blob(ctx, x, y, 9, 9, r, 0.06); CR.fill(ctx, '#2b2a33', r, null); CR.stroke(ctx, r, 2.2); CR.blob(ctx, x, y, 3.5, 3.5, r, 0.1); CR.fill(ctx, '#c9ccd3', r, null); });
    ctx.beginPath(); ctx.moveTo(22, 64); ctx.quadraticCurveTo(20, 50, 34, 50); ctx.lineTo(56, 50); ctx.quadraticCurveTo(64, 36, 64, 22); ctx.lineTo(72, 22);
    ctx.quadraticCurveTo(76, 48, 76, 64); ctx.closePath(); CR.fill(ctx, body, r, [20, 22, 58, 44], 1.2); CR.stroke(ctx, r, 2.6);
    CR.blob(ctx, 40, 47, 13, 4, r, 0.06); CR.fill(ctx, '#2b2a33', r, null); CR.stroke(ctx, r, 2); // 座墊
    CR.line(ctx, 62, 20, 78, 16, r, 3); // 龍頭
    CR.blob(ctx, 72, 32, 6, 6, r, 0.08); CR.fill(ctx, '#fff7c2', r, null); CR.stroke(ctx, r, 2); // 大燈＝眼睛
    ctx.fillStyle = CR.INK; ctx.beginPath(); ctx.arc(73.5, 32.5, 2.2, 0, Math.PI * 2); ctx.fill();
    CR.line(ctx, 66, 25, 77, 27, r, 2.2); // 生氣的眉毛
    // 排氣管冒煙
    [[14, 62, 5], [8, 56, 4]].forEach(([x, y, s]) => { CR.blob(ctx, x, y, s, s * 0.8, r, 0.12); ctx.fillStyle = 'rgba(154,163,181,0.6)'; ctx.fill(); });
  });
  // 停電小怪：一團黑黑的影子，頭上一顆壞掉的燈泡，身邊冒小火花
  const drawBlackoutMob = () => mobCanvas(104, (ctx, r) => {
    ctx.fillStyle = 'rgba(19,26,40,0.2)'; ctx.beginPath(); ctx.ellipse(48, 81, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
    CR.blob(ctx, 48, 58, 24, 22, r, 0.14, 14); CR.fill(ctx, '#2b2a33', r, [24, 36, 48, 44], 1.2); CR.stroke(ctx, r, 2.6);
    ctx.fillStyle = '#ffd23f'; [[40, 56], [56, 56]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 3.6, 2.4, 0, 0, Math.PI * 2); ctx.fill(); });
    CR.line(ctx, 42, 66, 54, 66, r, 1.6, '#ffd23f', 1.2);
    // 燈泡：玻璃有裂痕
    CR.blob(ctx, 48, 24, 11, 12, r, 0.06); CR.fill(ctx, '#e8edf3', r, null); CR.stroke(ctx, r, 2.2);
    CR.line(ctx, 44, 18, 50, 26, r, 1.2, '#5b6577', 0.6); CR.line(ctx, 50, 26, 47, 30, r, 1.2, '#5b6577', 0.6);
    CR.rect(ctx, 42, 34, 12, 5, r, 0.4); CR.fill(ctx, '#9aa3b5', r, null); CR.stroke(ctx, r, 1.6);
    [[22, 36], [74, 44], [70, 24]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 5, y + 6); ctx.lineTo(x + 1, y + 6); ctx.lineTo(x + 6, y + 13); CR.stroke(ctx, r, 2.2, '#ffd23f');
    });
  });
  // 小風窩：一團灰藍色的小龍捲風，有一雙眼睛
  const drawWhirlMob = () => mobCanvas(105, (ctx, r) => {
    ctx.fillStyle = 'rgba(19,26,40,0.18)'; ctx.beginPath(); ctx.ellipse(48, 81, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
    [[48, 24, 30, 8], [48, 38, 25, 7.5], [48, 51, 19, 7], [48, 63, 13, 6], [49, 74, 7, 4.5]].forEach(([x, y, w, h], i) => {
      CR.blob(ctx, x + (i % 2 ? 3 : -3), y, w, h, r, 0.1, 16); CR.fill(ctx, i % 2 ? '#9ab3d0' : '#b9cde3', r, null); CR.stroke(ctx, r, 2.2);
    });
    ctx.fillStyle = CR.INK; [[41, 37], [55, 37]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 2.2, 2.6, 0, 0, Math.PI * 2); ctx.fill(); });
    CR.line(ctx, 36, 31, 44, 33, r, 2); CR.line(ctx, 60, 31, 52, 33, r, 2);
    [[18, 30], [74, 52]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, Math.PI * 1.1, Math.PI * 1.9); CR.stroke(ctx, r, 1.8, 'rgba(79,124,194,0.7)'); });
  });
  // 天龍王：穿西裝、戴墨鏡和小金冠的都市大亨，騎在一條蠟筆綠龍上（畫布比一般怪大一圈）
  const drawTianlongMob = () => {
    const c = document.createElement('canvas');
    c.width = 120 * 2; c.height = 100 * 2;
    const ctx = c.getContext('2d'), r = CR.rng(106);
    ctx.scale(2, 2);
    ctx.fillStyle = 'rgba(19,26,40,0.2)'; ctx.beginPath(); ctx.ellipse(60, 96, 44, 5, 0, 0, Math.PI * 2); ctx.fill();
    // 龍尾巴從左邊捲上去
    ctx.beginPath(); ctx.moveTo(30, 82); ctx.quadraticCurveTo(4, 80, 8, 58); ctx.quadraticCurveTo(12, 44, 22, 48); ctx.quadraticCurveTo(14, 56, 20, 66); ctx.quadraticCurveTo(26, 74, 36, 72); ctx.closePath();
    CR.fill(ctx, '#5fb37a', r, null); CR.stroke(ctx, r, 2.4);
    [[10, 54], [14, 47]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y - 4); ctx.lineTo(x + 2, y - 2); ctx.closePath(); CR.fill(ctx, '#ffd23f', r, null); CR.stroke(ctx, r, 1.4); });
    // 大亨（avatar.js 畫的人，npc: 'tianlong'）
    ctx.save(); ctx.translate(28, 2);
    AV.drawAvatar(ctx, { hair: 'short', hairColor: '#2b2a33', skin: AV.SKINS[1], glasses: '0', cls: 'suit', suit: '#1f2b4a', tie: '#ffd23f', npc: 'tianlong' });
    ctx.restore();
    // 龍的身體擋住腳：綠色的長身體＋黃色肚子＋背上的鰭
    CR.blob(ctx, 60, 80, 38, 13, r, 0.05, 22); CR.fill(ctx, '#5fb37a', r, [22, 67, 76, 26], 1.2); CR.stroke(ctx, r, 2.6);
    CR.blob(ctx, 60, 86, 30, 6, r, 0.06, 18); CR.fill(ctx, '#f2d27a', r, null); CR.stroke(ctx, r, 1.6);
    [36, 48, 72, 84].forEach(x => { ctx.beginPath(); ctx.moveTo(x - 5, 69); ctx.lineTo(x, 61); ctx.lineTo(x + 5, 69); ctx.closePath(); CR.fill(ctx, '#ffb020', r, null); CR.stroke(ctx, r, 1.6); });
    [[38, 94], [80, 94]].forEach(([x, y]) => { CR.blob(ctx, x, y, 6, 3.4, r, 0.08); CR.fill(ctx, '#4a9a64', r, null); CR.stroke(ctx, r, 2); });
    // 龍頭在右邊：大眼睛、兩根金角、鬍鬚
    CR.blob(ctx, 102, 70, 15, 12, r, 0.06, 16); CR.fill(ctx, '#5fb37a', r, null); CR.stroke(ctx, r, 2.6);
    CR.blob(ctx, 112, 75, 7, 5, r, 0.08); CR.fill(ctx, '#7fcf96', r, null); CR.stroke(ctx, r, 2);
    [[96, 59, 92, 48], [104, 58, 106, 47]].forEach(([x1, y1, x2, y2]) => { CR.line(ctx, x1, y1, x2, y2, r, 4.4, CR.INK, 0.3); CR.line(ctx, x1, y1, x2, y2, r, 2.6, '#ffd23f', 0.3); });
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(103, 67, 4, 4.4, 0, 0, Math.PI * 2); ctx.fill(); CR.stroke(ctx, r, 1.4);
    ctx.fillStyle = CR.INK; ctx.beginPath(); ctx.arc(104, 67.5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(114, 78); ctx.quadraticCurveTo(122, 84, 116, 92); CR.stroke(ctx, r, 1.6, '#c9962a');
    ctx.beginPath(); ctx.moveTo(110, 79); ctx.quadraticCurveTo(112, 90, 104, 94); CR.stroke(ctx, r, 1.6, '#c9962a');
    return c;
  };

  // 關卡之間的石門
  const drawGate = () => {
    const c = document.createElement('canvas');
    c.width = T * 2; c.height = 72 * 2;
    const ctx = c.getContext('2d'), r = CR.rng(94);
    ctx.scale(2, 2);
    CR.rect(ctx, 2, 6, T - 4, 64, r, 1.4); CR.fill(ctx, '#8d867b', r, [2, 6, T - 4, 64], 1.2); CR.stroke(ctx, r, 2.6);
    CR.rect(ctx, 8, 14, T - 16, 46, r, 1); CR.stroke(ctx, r, 1.6, 'rgba(43,42,51,0.5)');
    ctx.font = '900 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,210,63,0.85)';
    ctx.fillText('✦', T / 2, 38);
    return c;
  };

  // 慶祝煙火：把文字畫在小畫布上，取樣成一顆顆火花的位置
  // 煙火會用到的顏色（每個顏色一格火花貼圖）
  const SPARK_COLORS = [0xff6a13, 0xffb020, 0x4f7cc2, 0xe8384f, 0x3f9f5a, 0x8a5cd6, 0xffd23f];
  // 把文字拆成一顆顆火花的位置；同一句話算過就記起來
  const textPtsCache = new Map();
  function textPoints(text, max) {
    const key = text + '|' + max;
    if (textPtsCache.has(key)) return textPtsCache.get(key);
    const size = 64;
    const c = document.createElement('canvas');
    // willReadFrequently：讓這張畫布留在 CPU 上，不然 getImageData 要從顯示卡讀回來，整個畫面會卡住一兩秒
    const ctx = c.getContext('2d', { willReadFrequently: true });
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
    const res = { pts, w: c.width };
    if (textPtsCache.size > 50) textPtsCache.clear();
    textPtsCache.set(key, res);
    return res;
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
      if (ch === ' ') return 'void';
      if (x >= MAP.TLX) return ch === 'h' || ch === 'O' ? 'lobby101' : ch === 'g' ? 'glass' : 'void';
      if (x >= MAP.TDX) {
        if (ch === 'g') return 'glass';
        if (ch === 'k') return 'sky';
        if (y < 13 || (y === 13 && ch === 'X')) return 'plaza';
        return y < 29 || (y === 29 && ch === 'X') ? 'steel' : 'deck';
      }
      if (x >= MAP.LX) return ch === 'q' || ch === 'O' ? 'temple' : ch === 'Q' ? 'templewall' : 'void';
      if (x >= MAP.MW) return ch === 'Z' ? 'sea' : ch === 'Y' ? 'rock' : 'yE'.includes(ch) ? 'sand' : ch === 'n' ? 'cliff' : 'cave';
      if (y > 30 && ':T~'.includes(ch)) return 'mud';
      if (',T~BFOLI'.includes(ch)) return 'grass';
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
        } else if (base === 'void') {
          ctx.fillStyle = '#131a28'; ctx.fillRect(px, py, T, T);
        } else if (base === 'sand') {
          // 七星潭的礫石灘：米色底＋各種顏色的小圓石
          ctx.fillStyle = (x + y) % 2 ? '#ece0c6' : '#e8dbbf'; ctx.fillRect(px, py, T, T);
          ['#c9c3b8', '#9aa3b5', '#d9b38c', '#b8c9d9'].forEach(c => CR.dots(ctx, px, py, T, T, 3, c, r, 3));
          CR.dots(ctx, px, py, T, T, 4, 'rgba(255,255,255,0.6)', r, 1.6);
        } else if (base === 'cave') {
          // 九曲洞的大理石地板：灰白色、細細的紋路
          ctx.fillStyle = (x * 3 + y) % 4 ? '#c9ccd3' : '#c2c6ce'; ctx.fillRect(px, py, T, T);
          CR.line(ctx, px + r() * 20, py + r() * T, px + 28 + r() * 20, py + r() * T, r, 1, 'rgba(110,118,132,0.35)', 6);
          CR.dots(ctx, px, py, T, T, 3, 'rgba(255,255,255,0.5)', r, 1.6);
        } else if (base === 'cliff') {
          // 清水斷崖上的草地
          ctx.fillStyle = (x * 3 + y) % 5 ? '#b5d68f' : '#aed087'; ctx.fillRect(px, py, T, T);
          CR.dots(ctx, px, py, T, T, 5, 'rgba(255,255,255,0.4)', r, 2);
          const gx = px + 8 + r() * (T - 16), gy = py + 10 + r() * (T - 16);
          CR.line(ctx, gx, gy, gx - 2, gy - 6, r, 1.6, '#6f9c5c', 0.6);
        } else if (base === 'sea') {
          // 太平洋：深藍色＋白色浪花
          ctx.fillStyle = (x + y) % 2 ? '#4f86c6' : '#4a80c0'; ctx.fillRect(px, py, T, T);
          ctx.save(); ctx.beginPath(); ctx.arc(px + 10 + r() * 28, py + 14 + r() * 22, 8, Math.PI * 1.1, Math.PI * 1.9);
          CR.stroke(ctx, r, 2, 'rgba(255,255,255,0.7)'); ctx.restore();
        } else if (base === 'rock') {
          ctx.fillStyle = '#b3aca1'; ctx.fillRect(px, py, T, T);
        } else if (base === 'plaza') {
          // 信義廣場：米白和淺灰交錯的大地磚
          ctx.fillStyle = (x + y) % 2 ? '#e9e4da' : '#dcd8d0'; ctx.fillRect(px, py, T, T);
          CR.rect(ctx, px + 1, py + 1, T - 2, T - 2, r, 0.8); CR.stroke(ctx, r, 1.2, 'rgba(110,104,96,0.35)');
          CR.dots(ctx, px, py, T, T, 3, 'rgba(255,255,255,0.6)', r, 1.6);
        } else if (base === 'steel') {
          // 阻尼球層：深灰色鋼板，四個角有鉚釘
          ctx.fillStyle = (x + y) % 2 ? '#8e96a3' : '#89919e'; ctx.fillRect(px, py, T, T);
          CR.rect(ctx, px + 2, py + 2, T - 4, T - 4, r, 0.6); CR.stroke(ctx, r, 1.4, 'rgba(43,42,51,0.45)');
          [[6, 6], [T - 6, 6], [6, T - 6], [T - 6, T - 6]].forEach(([dx, dy]) => { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(px + dx, py + dy, 1.8, 0, Math.PI * 2); ctx.fill(); });
          if (y === 21) { ctx.fillStyle = 'rgba(255,176,32,0.18)'; ctx.fillRect(px, py - 10, T, T + 20); }
        } else if (base === 'deck') {
          // 觀景台：暖色木地板
          ctx.fillStyle = (x * 3 + y) % 4 ? '#d9b98c' : '#d3b284'; ctx.fillRect(px, py, T, T);
          [12, 24, 36].forEach(dy => CR.line(ctx, px, py + dy, px + T, py + dy, r, 1, 'rgba(120,84,48,0.35)', 0.6));
          CR.dots(ctx, px, py, T, T, 3, 'rgba(255,255,255,0.4)', r, 1.4);
        } else if (base === 'sky') {
          // 觀景台外面的天空：淡藍色，飄著一點雲
          ctx.fillStyle = '#9cc8ee'; ctx.fillRect(px, py, T, T);
          if (r() < 0.5) { CR.blob(ctx, px + 10 + r() * 28, py + 14 + r() * 20, 12, 6, r, 0.12); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill(); }
        } else if (base === 'glass') {
          // 101 的玻璃帷幕：藍綠色玻璃格子
          ctx.fillStyle = (x + y) % 2 ? '#5f8f8c' : '#5a8986'; ctx.fillRect(px, py, T, T);
          CR.rect(ctx, px + 3, py + 3, T - 6, T - 6, r, 0.8); CR.fill(ctx, '#7fb3ad', r, null); CR.stroke(ctx, r, 1.6, 'rgba(32,52,50,0.7)');
          CR.line(ctx, px + 8, py + 30, px + 22, py + 10, r, 2, 'rgba(255,255,255,0.45)', 0.5);
        } else if (base === 'lobby101') {
          // 101 大廳：白色大理石，金色的線
          ctx.fillStyle = (x + y) % 2 ? '#f1ede4' : '#ebe6dc'; ctx.fillRect(px, py, T, T);
          CR.line(ctx, px + r() * 20, py + r() * T, px + 28 + r() * 20, py + r() * T, r, 1, 'rgba(140,130,118,0.35)', 6);
          CR.rect(ctx, px + 1, py + 1, T - 2, T - 2, r, 0.6); CR.stroke(ctx, r, 1, 'rgba(201,150,42,0.45)');
        } else if (base === 'temple') {
          // 古城候位區：一塊一塊的米灰色石板，偶爾有裂縫和青苔
          ctx.fillStyle = (x + y) % 2 ? '#c8bea9' : '#c1b6a0'; ctx.fillRect(px, py, T, T);
          CR.rect(ctx, px + 2, py + 2, T - 4, T - 4, r, 1); CR.stroke(ctx, r, 1.4, 'rgba(90,76,58,0.45)');
          if (r() < 0.25) CR.line(ctx, px + 8 + r() * 10, py + 10, px + 22 + r() * 14, py + 30 + r() * 10, r, 1.2, 'rgba(90,76,58,0.5)', 3);
          if (r() < 0.2) CR.dots(ctx, px + 4, py + T - 14, 16, 10, 5, 'rgba(107,175,123,0.7)', r, 2.2);
        } else if (base === 'templewall') {
          // 古城石牆：深一點的大石磚
          ctx.fillStyle = '#7d7262'; ctx.fillRect(px, py, T, T);
          CR.rect(ctx, px + 2, py + 3, T - 4, T / 2 - 4, r, 1); CR.fill(ctx, '#91866f', r, null); CR.stroke(ctx, r, 1.6, 'rgba(40,34,28,0.7)');
          CR.rect(ctx, px + 2, py + T / 2 + 1, T - 4, T / 2 - 4, r, 1); CR.fill(ctx, '#867b66', r, null); CR.stroke(ctx, r, 1.6, 'rgba(40,34,28,0.7)');
          ctx.fillStyle = '#e0b84a'; if ((x + y) % 5 === 0) ctx.fillRect(px + T / 2 - 3, py + T / 2 - 3, 6, 6);
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
        } else if (ch === 'Y') {
          // 峽谷岩壁：灰褐色的大岩石，斜斜的紋路，只描外緣
          ctx.fillStyle = '#c4beb3'; ctx.fillRect(px, py, T, T * 0.45);
          CR.line(ctx, px + 4, py + 30 + r() * 10, px + 40, py + 12 + r() * 10, r, 1.4, 'rgba(90,80,70,0.35)', 3);
          CR.dots(ctx, px, py, T, T, 6, 'rgba(255,255,255,0.35)', r, 1.6);
          const rk = (dx, dy) => at(x + dx, y + dy) === 'Y' || at(x + dx, y + dy) === ' ';
          if (!rk(0, -1)) CR.line(ctx, px - 1, py, px + T + 1, py, r, 3);
          if (!rk(0, 1)) CR.line(ctx, px - 1, py + T, px + T + 1, py + T, r, 3);
          if (!rk(-1, 0)) CR.line(ctx, px, py - 1, px, py + T + 1, r, 3);
          if (!rk(1, 0)) CR.line(ctx, px + T, py - 1, px + T, py + T + 1, r, 3);
        } else if (ch === 'Z' && at(x, y + 1) !== 'Z' || ch === 'Z' && at(x - 1, y) !== 'Z' && at(x - 1, y) !== 'Y') {
          // 浪打到岸邊的白邊
          const down = at(x, y + 1) !== 'Z';
          ctx.save(); ctx.globalAlpha = 0.85;
          if (down) CR.line(ctx, px - 2, py + T - 4, px + T + 2, py + T - 6, r, 5, '#ffffff', 2);
          else CR.line(ctx, px + 4, py - 2, px + 2, py + T + 2, r, 5, '#ffffff', 2);
          ctx.restore();
        } else if (ch === 'x') {
          // 九曲洞地上的凹槽：大理石要推到這裡
          CR.rect(ctx, px + 4, py + 4, T - 8, T - 8, r, 1); CR.fill(ctx, 'rgba(47,59,85,0.28)', r, null);
          ctx.save(); ctx.setLineDash([5, 4]); CR.rect(ctx, px + 4, py + 4, T - 8, T - 8, r, 1); CR.stroke(ctx, r, 2.4, '#ffb020'); ctx.restore();
          // 中間畫一個往下的蠟筆箭頭
          const ax = px + T / 2, ay = py + T / 2;
          CR.line(ctx, ax, ay - 9, ax, ay + 7, r, 3, '#c9962a');
          ctx.beginPath(); ctx.moveTo(ax - 7, ay + 1); ctx.lineTo(ax, ay + 9); ctx.lineTo(ax + 7, ay + 1); CR.stroke(ctx, r, 3, '#c9962a');
        } else if (ch === 'E' && at(x - 1, y) !== 'E') {
          // 七星潭的石碑（兩格寬），上面要踩的顏色順序另外畫
          CR.rect(ctx, px + 4, py - 30, T * 2 - 8, T + 22, r, 1.4); CR.fill(ctx, '#9aa3b5', r, [px, py - 30, T * 2, T + 22]); CR.stroke(ctx, r, 2.8);
          CR.rect(ctx, px + 10, py - 24, T * 2 - 20, T + 8, r, 1); CR.fill(ctx, '#b8c0cc', r, null); CR.stroke(ctx, r, 1.6);
          ctx.font = '900 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#2b2a33'; ctx.fillText('七星潭', px + T, py - 12);
        } else if (ch === 'O') {
          // 副本傳送門的石座（漩渦另外畫，會轉）
          CR.blob(ctx, px + 24, py + 30, 30, 15, r, 0.06); CR.fill(ctx, '#9aa3b5', r, [px - 6, py + 15, T + 12, 30]); CR.stroke(ctx, r, 2.6);
          CR.blob(ctx, px + 24, py + 28, 22, 10, r, 0.08); CR.fill(ctx, '#2f3b55', r, null); CR.stroke(ctx, r, 2);
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
        } else if (ch === 'J') {
          // DJ 台：黑色桌子，兩台唱盤另外畫在上面（播歌時會轉）
          const L = at(x - 1, y) !== 'J', Rr = at(x + 1, y) !== 'J';
          CR.rect(ctx, px + (L ? 2 : 0), py + 8, T - (L ? 2 : 0) - (Rr ? 2 : 0), T - 12, r, 1); CR.fill(ctx, '#2b2a33', r, null);
          CR.line(ctx, px + (L ? 2 : -1), py + 8, px + T + (Rr ? -2 : 1), py + 8, r, 2.6);
          CR.line(ctx, px + (L ? 2 : -1), py + T - 4, px + T + (Rr ? -2 : 1), py + T - 4, r, 2.6);
          if (L) CR.line(ctx, px + 2, py + 8, px + 2, py + T - 4, r, 2.6);
          if (Rr) CR.line(ctx, px + T - 2, py + 8, px + T - 2, py + T - 4, r, 2.6);
          ctx.fillStyle = '#ff6a13'; ctx.fillRect(px + (L ? 6 : 0), py + T - 12, T - (L ? 6 : 0) - (Rr ? 6 : 0), 3);
        } else if (ch === 'L') {
          // 許願池：2x2 格，在左上那格一次畫完；石頭圍一圈，水裡沉著幾枚硬幣
          if (at(x - 1, y) === 'L' || at(x, y - 1) === 'L') continue;
          const cx = px + T, cy = py + T + 6;
          ctx.fillStyle = 'rgba(19,26,40,0.16)'; ctx.beginPath(); ctx.ellipse(cx, cy + 22, 40, 9, 0, 0, Math.PI * 2); ctx.fill();
          CR.blob(ctx, cx, cy + 6, 40, 28, r, 0.05, 26); CR.fill(ctx, '#b9b2a4', r, [cx - 42, cy - 24, 84, 60]); CR.stroke(ctx, r, 2.6);
          CR.blob(ctx, cx, cy, 40, 26, r, 0.05, 26); CR.fill(ctx, '#d6d0c2', r, [cx - 42, cy - 28, 84, 56]); CR.stroke(ctx, r, 2.6);
          // 石頭的縫
          for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2, k = 0.8 + r() * 0.12;
            CR.line(ctx, cx + Math.cos(a) * 31, cy + Math.sin(a) * 19, cx + Math.cos(a) * 40 * k / 0.86, cy + Math.sin(a) * 26 * k / 0.86, r, 1.4, 'rgba(43,42,51,0.45)');
          }
          CR.blob(ctx, cx, cy - 1, 30, 18, r, 0.05, 24); CR.fill(ctx, '#6fb4e0', r, [cx - 32, cy - 20, 64, 38]); CR.stroke(ctx, r, 2.2);
          CR.plaid(ctx, cx - 30, cy - 19, 60, 36, 9, 'rgba(255,255,255,0.35)', r, 1);
          [[-12, 4], [6, -5], [14, 6], [-2, 9]].forEach(([dx, dy], i) => {
            CR.blob(ctx, cx + dx, cy + dy, 4.5, 3, r, 0.1, 10); CR.fill(ctx, i % 2 ? '#ffd23f' : '#f2b632', r, null); CR.stroke(ctx, r, 1.2);
          });
          CR.blob(ctx, cx - 14, cy - 8, 7, 2.5, r, 0.15, 10); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
        } else if (ch === 'g' && x >= MAP.TDX) {
          // 玻璃帷幕只描外緣
          const gl = (dx, dy) => at(x + dx, y + dy) === 'g' || at(x + dx, y + dy) === ' ';
          if (!gl(0, -1)) CR.line(ctx, px - 1, py, px + T + 1, py, r, 3);
          if (!gl(0, 1)) CR.line(ctx, px - 1, py + T, px + T + 1, py + T, r, 3);
          if (!gl(-1, 0)) CR.line(ctx, px, py - 1, px, py + T + 1, r, 3);
          if (!gl(1, 0)) CR.line(ctx, px + T, py - 1, px + T, py + T + 1, r, 3);
        } else if (ch === 'k' && at(x - 1, y) !== 'k') {
          // 觀景台的邊緣：一排玻璃欄杆
          ctx.save(); ctx.globalAlpha = 0.85;
          CR.rect(ctx, px - 6, py, 10, T, r, 0.6); CR.fill(ctx, 'rgba(220,240,255,0.8)', r, null); CR.stroke(ctx, r, 2);
          ctx.restore();
        } else if (ch === 'c') {
          // 阻尼球層的控制台：踩上去會亮（亮燈另外畫）
          CR.rect(ctx, px + 3, py + 6, T - 6, T - 10, r, 1); CR.fill(ctx, '#3b4252', r, null); CR.stroke(ctx, r, 2.6);
          CR.rect(ctx, px + 9, py + 11, T - 18, 12, r, 0.6); CR.fill(ctx, '#1f2937', r, null); CR.stroke(ctx, r, 1.6);
          [14, 24, 34].forEach((bx, i) => { ctx.fillStyle = ['#e8384f', '#ffd23f', '#7be08f'][i]; ctx.beginPath(); ctx.arc(px + bx, py + 33, 3, 0, Math.PI * 2); ctx.fill(); });
        } else if (ch === 'A') {
          // 觀景台的大柱子
          ctx.fillStyle = 'rgba(19,26,40,0.2)'; ctx.beginPath(); ctx.ellipse(px + 24, py + 44, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
          CR.rect(ctx, px + 6, py - 34, T - 12, T + 30, r, 1); CR.fill(ctx, '#e4ddd0', r, [px + 6, py - 34, T - 12, T + 30], 0.6); CR.stroke(ctx, r, 2.6);
          CR.rect(ctx, px + 2, py - 40, T - 4, 10, r, 0.6); CR.fill(ctx, '#c9962a', r, null); CR.stroke(ctx, r, 2);
          CR.line(ctx, px + 16, py - 26, px + 16, py + 36, r, 1.4, 'rgba(120,110,96,0.5)');
        } else if (ch === 'U') {
          // 101 電梯小姐腳下的金色小台子
          CR.blob(ctx, px + 24, py + 30, 26, 15, r, 0.06); CR.fill(ctx, '#2f5f5c', r, [px - 2, py + 15, T + 4, 30]); CR.stroke(ctx, r, 2.4);
          CR.blob(ctx, px + 24, py + 30, 17, 9, r, 0.06); CR.stroke(ctx, r, 1.6, '#ffd23f');
        } else if (ch === 'H') {
          // 古城守門員腳下的石板台座
          CR.blob(ctx, px + 24, py + 30, 26, 15, r, 0.06); CR.fill(ctx, '#9a8f7a', r, [px - 2, py + 15, T + 4, 30]); CR.stroke(ctx, r, 2.4);
          CR.blob(ctx, px + 24, py + 30, 17, 9, r, 0.06); CR.stroke(ctx, r, 1.6, '#e0b84a');
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

    // 3. 物資箱上貼一張手繪的內容物貼紙（台灣小吃畫珍奶，綜合畫問號箱）
    MAP.CRATES.forEach((cr, i) => {
      const r = CR.rng(i + 99);
      const cx = ((cr.x1 + cr.x2 + 1) / 2) * T, cy = ((cr.y1 + cr.y2 + 1) / 2) * T;
      CR.blob(ctx, cx, cy, 17, 17, r, 0.06); CR.fill(ctx, '#fafaf7', r, null); CR.stroke(ctx, r, 2.4);
      const art = window.HQ_ICONS && HQ_ICONS.canvas('item-' + ([].concat(cr.item)[0] || 'mix'));
      if (art) ctx.drawImage(art, cx - 13, cy - 13, 26, 26);
    });

    // 候位區：地上畫一圈金色的框，中間寫「候位區」
    MAP.DG_LIST.forEach((D, i) => {
      const L = D.lobby, lr = CR.rng(77 + i);
      ctx.save(); ctx.setLineDash([10, 8]);
      CR.rect(ctx, (L.x1 + 2) * T + 4, (L.y1 + 4) * T + 4, (L.x2 - L.x1 - 3) * T - 8, 6 * T - 8, lr, 2);
      ctx.fillStyle = 'rgba(224,184,74,0.14)'; ctx.fill(); CR.stroke(ctx, lr, 3, '#c9962a'); ctx.restore();
      ctx.font = '900 17px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#5a4630';
      ctx.fillText('候 位 區', (L.x1 + L.x2 + 1) / 2 * T, (L.y1 + 10) * T - 14);
    });
    return c;
  }

  // ---------------- Phaser 場景 ----------------
  class HQScene extends Phaser.Scene {
    constructor() { super('hq'); this.remotes = new Map(); this.drops = []; this.told = {}; this.walls = new Map(); this.storms = new Map(); this.drawing = null; }

    create() {
      this.textures.addCanvas('map', drawMap());
      this.add.image(0, 0, 'map').setOrigin(0).setDepth(-10);
      this.cameras.main.setBounds(0, 0, MAP.MW * T, MAP.H * T); // 副本區另外設（見 update）
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
      kb.on('keydown-L', (e) => { if (!typing()) { e.preventDefault(); this.useSkill(special2()); } });
      // 右鍵點人物（手機長按）可以看個人資料
      this.input.mouse.disableContextMenu();
      this.input.on('pointerup', () => {
        if (this.pressTimer) { this.pressTimer.remove(); this.pressTimer = null; }
        if (this.drawing && this.drawing.pts.length) this.finishWall();
      });
      // 畫城牆時手指滑到按鈕上才放開，也要算畫完
      this.input.on('pointerupoutside', () => { if (this.drawing && this.drawing.pts.length) this.finishWall(); });
      this.input.on('pointermove', (p) => { if (this.drawing && this.drawing.pts.length && p.isDown) this.extendWall(p.worldX, p.worldY); });
      this.input.on('pointerdown', (p) => {
        if (!this.me || !$('games').hidden) return;
        if (SMALL() && !$('chat').classList.contains('collapsed')) setChat(false); // 手機：點聊天室外面就收起來
        // 插畫結界師畫城牆中：按下去就開始畫，不會走路
        if (this.drawing && !p.rightButtonDown()) { chatInput.blur(); this.target = null; this.drawing.pts = [[p.worldX, p.worldY]]; this.drawing.len = 0; this.drawPreview(); return; }
        chatInput.blur();
        hideMenu();
        const who = this.playerAt(p.worldX, p.worldY);
        if (p.rightButtonDown()) { if (who) showMenu(who, p.event.clientX, p.event.clientY); return; }
        if (who && p.wasTouch) {
          this.pressTimer = this.time.delayedCall(550, () => { this.target = null; showMenu(who, p.event.clientX || p.x, p.event.clientY || p.y); });
        }
        // 點到頭上的提示紙條就直接互動（手機上的主要用法，範圍放大一點比較好按）
        if (this.hint && this.hintAct) {
          const b = this.hint.getBounds(), pad = 12;
          if (p.worldX > b.x - pad && p.worldX < b.right + pad && p.worldY > b.y - pad && p.worldY < b.bottom + pad) { this.doAction(this.hintAct); return; }
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
      // 召喚物、家具（畫成兩倍大）
      Object.keys(ST.SUMMONS).forEach(k => {
        const c = document.createElement('canvas');
        c.width = HQ_CREATURES.WIDTH * 2; c.height = HQ_CREATURES.HEIGHT * 2;
        const ctx = c.getContext('2d'); ctx.scale(2, 2); HQ_CREATURES.drawCreature(ctx, k);
        this.textures.addCanvas('cr-' + k, c);
      });
      Object.keys(DC.DECOR).forEach(k => {
        const c = document.createElement('canvas');
        c.width = DC.WIDTH * 2; c.height = DC.HEIGHT * 2;
        const ctx = c.getContext('2d'); ctx.scale(2, 2); DC.drawDecor(ctx, k);
        this.textures.addCanvas('dc-' + k, c);
      });
      this.summons = new Map();
      this.decor = new Map();
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
      this.textures.addCanvas('mob-rock', drawRockMob());
      this.textures.addCanvas('mob-horse', drawHorseMob());
      this.textures.addCanvas('mob-fu', drawFuMob(false));
      this.textures.addCanvas('mob-fu-fist', drawFuMob(true));
      this.textures.addCanvas('dg-gate', drawGate());
      this.textures.addCanvas('mob-sign', drawSignMob());
      this.textures.addCanvas('mob-scooter', drawScooterMob(false));
      this.textures.addCanvas('mob-bike', drawScooterMob(true));
      this.textures.addCanvas('mob-blackout', drawBlackoutMob());
      this.textures.addCanvas('mob-whirl', drawWhirlMob());
      this.textures.addCanvas('mob-tianlong', drawTianlongMob());
      // 指揮中心的古城守門員：頭盔、石灰色鎧甲、拿著長矛
      this.textures.addCanvas('guard', drawNpc({ hair: 'short', hairColor: '#2b2a33', skin: AV.SKINS[2], glasses: '0',
        cls: 'suit', suit: '#7d7262', tie: '#e0b84a', npc: 'guard' }, 'spear'));
      this.mobs = new Map();
      const mx = MAP.mentor.x, my = MAP.mentor.y + 18;
      this.add.image(mx, my, 'mentor').setScale(0.55).setOrigin(0.5, 0.95).setDepth(my);
      this.add.text(mx, my - 92, '轉職資料沈理員', {
        fontSize: '10px', fontStyle: 'bold', color: INK, fontFamily: FONT,
        backgroundColor: PAPER, padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setDepth(my);
      const talk = this.add.image(mx + 26, my - 66, 'fx-talk').setDepth(my + 1);
      this.tweens.add({ targets: talk, y: my - 74, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      // 古城守門員：跟他說話就傳送到副本的候位區
      const gx = MAP.guard.x, gy = MAP.guard.y + 18;
      this.add.image(gx, gy, 'guard').setScale(0.55).setOrigin(0.5, 0.95).setDepth(gy);
      this.add.text(gx, gy - 96, '古城守門員', {
        fontSize: '10px', fontStyle: 'bold', color: INK, fontFamily: FONT,
        backgroundColor: PAPER, padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setDepth(gy);
      const gTalk = this.add.image(gx + 26, gy - 70, 'fx-talk').setDepth(gy + 1);
      this.tweens.add({ targets: gTalk, y: gy - 78, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      // 101 電梯小姐：包包頭、墨綠色制服、小圓帽；跟她說話就傳送到 101 大廳候位區
      this.textures.addCanvas('elevator', drawNpc({ hair: 'bun', hairColor: '#2b2a33', skin: AV.SKINS[0], glasses: '0',
        cls: 'suit', suit: '#2f5f5c', tie: '#ffd23f', npc: 'elevator' }));
      const ex = MAP.elevator.x, ey = MAP.elevator.y + 18;
      this.add.image(ex, ey, 'elevator').setScale(0.55).setOrigin(0.5, 0.95).setDepth(ey);
      this.add.text(ex, ey - 96, '101 電梯小姐', {
        fontSize: '10px', fontStyle: 'bold', color: INK, fontFamily: FONT,
        backgroundColor: PAPER, padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setDepth(ey);
      const eTalk = this.add.image(ex + 26, ey - 70, 'fx-talk').setDepth(ey + 1);
      this.tweens.add({ targets: eTalk, y: ey - 78, duration: 820, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      // 許願池旁邊的希臘少女：紅棕色長髮、白色單肩長袍、比「噓」；跟她說話會打開許願池
      this.textures.addCanvas('greek', drawNpc({ hair: 'long', hairColor: '#b5532c', skin: AV.SKINS[0], glasses: '0', cls: 'greek', npc: 'greek' }));
      const kx = MAP.greek.x, ky = MAP.greek.y + 18;
      this.add.image(kx, ky, 'greek').setScale(0.55).setOrigin(0.5, 0.95).setDepth(ky);
      this.add.text(kx, ky - 96, '希臘少女', {
        fontSize: '10px', fontStyle: 'bold', color: INK, fontFamily: FONT,
        backgroundColor: PAPER, padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setDepth(ky);
      const kTalk = this.add.image(kx + 26, ky - 70, 'fx-talk').setDepth(ky + 1);
      this.tweens.add({ targets: kTalk, y: ky - 78, duration: 820, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

      // 煙火的火花統一畫在一張 graphics 上
      // 煙火的火花：先把每個顏色的發光小點畫成一張貼圖，再用 Blitter 大量貼上去
      // （以前每一顆都用 graphics 畫兩個圓，幾千顆一起畫會很卡）
      this.sparks = [];
      this.sparkPool = [];
      const sp = this.textures.createCanvas('fx-spark', SPARK_COLORS.length * 16, 16), sctx = sp.getContext();
      SPARK_COLORS.forEach((c, i) => {
        const hex = '#' + c.toString(16).padStart(6, '0'), cx = i * 16 + 8;
        const grd = sctx.createRadialGradient(cx, 8, 0, cx, 8, 8);
        grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.25, hex); grd.addColorStop(0.5, hex + '55'); grd.addColorStop(1, hex + '00');
        sctx.fillStyle = grd; sctx.fillRect(i * 16, 0, 16, 16);
        sp.add('c' + i, 0, i * 16, 0, 16, 16);
      });
      sp.refresh();
      this.fw = this.add.blitter(0, 0, 'fx-spark').setDepth(3000);
      this.emptyCrates = new Map();

      const Z = MAP.MONSTER_ZONE;
      // 容器原點在颱風腳底；body 會上下彈跳
      this.mSwirl = this.add.image(0, -6, 'typhoon').setScale(1.1, 0.32).setAlpha(0.5);
      this.mBody = this.add.image(0, 0, 'typhoon-cloud').setOrigin(0.5, 200 / 240);
      this.mFace = this.add.image(0, -100, 'typhoon-face');
      this.mBar = this.add.graphics();
      // 楓之谷風格：名牌掛在怪物腳下
      this.mName = this.add.text(0, 22, `Lv.${ST.MONSTER.level} ${ST.MONSTER.name}`, {
        fontSize: '10px', fontStyle: 'bold', color: '#b84300', fontFamily: FONT,
        backgroundColor: PAPER, padding: { x: 11, y: 4 },
      }).setOrigin(0.5, 0);
      // 被冰凍、被削弱時腳下的冰晶和狀態文字
      this.mIce = this.add.image(0, 4, 'fx-ice').setOrigin(0.5, 1).setScale(2.4, 1.6).setVisible(false);
      this.mStatus = this.add.text(0, 46, '', {
        fontSize: '10px', fontStyle: 'bold', color: '#2f5fa8', fontFamily: FONT,
        backgroundColor: PAPER, padding: { x: 11, y: 5 },
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
        fontSize: '16px', fontStyle: 'bold', color: '#3a3a3c', fontFamily: FONT, align: 'center',
        backgroundColor: PAPER, padding: { x: 23, y: 16 },
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

      this.initDungeon();
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
      const tag = this.add.text(0, 6, this.tagText(p), {
        fontSize: '10px', fontStyle: 'bold', color: INK, fontFamily: FONT,
        backgroundColor: PAPER, padding: { x: 10, y: 4 },
      }).setOrigin(0.5, 0);
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
      this.treeMark(cont);
      return cont;
    }

    // 小樹屋語音中的人：名牌右邊掛一個麥克風（靜音是斜線麥克風），講話時一圈一圈冒出綠色音波
    treeMarks(inTree, talking, muted) {
      this.treeIn = inTree; this.treeTalk = talking; this.treeMuted = muted;
      if (this.me) this.treeMark(this.me);
      this.remotes.forEach(r => this.treeMark(r));
    }
    treeMark(c) {
      const on = !!(this.treeIn && this.treeIn.has(c.pid));
      const off = on && this.treeMuted.has(c.pid), talk = on && !off && this.treeTalk.has(c.pid);
      if (!on) {
        if (c.treeIc) { if (c.treeIc.waves) c.treeIc.waves.remove(); c.treeIc.destroy(); c.treeIc = null; }
        return;
      }
      const key = off ? 'btn-mic-off' : 'btn-mic', tex = 'mark-' + key;
      if (!this.textures.exists(tex)) {
        const cv = window.HQ_ICONS && HQ_ICONS.canvas(key);
        if (!cv) return;
        this.textures.addCanvas(tex, cv);
      }
      if (!c.treeIc) {
        c.treeIc = this.add.image(0, 0, tex).setOrigin(0.5).setScale(0.18); c.add(c.treeIc);
        c.once('destroy', () => { if (c.treeIc && c.treeIc.waves) c.treeIc.waves.remove(); });
      }
      c.treeIc.setTexture(tex).setPosition(c.tag.width / 2 + 11, 6 + c.tag.height / 2);
      if (talk === !!c.treeIc.waves) return;
      if (!talk) { c.treeIc.waves.remove(); c.treeIc.waves = null; return; }
      const wave = () => {
        if (!c.treeIc || !c.active) return;
        const g = this.add.graphics().lineStyle(4.5, 0xffffff, 0.7).strokeCircle(0, 0, 10).lineStyle(2.5, 0x1f9d55, 1).strokeCircle(0, 0, 10).setPosition(c.treeIc.x, c.treeIc.y);
        c.addAt(g, c.getIndex(c.treeIc));
        this.tweens.add({ targets: g, scale: 2.6, alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => g.destroy() });
      };
      wave();
      c.treeIc.waves = this.time.addEvent({ delay: 330, loop: true, callback: wave });
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
      const was = who.prada, wasSet = who.setId;
      this.applyGlow(who);
      if (who.setId && who.setId !== wasSet) {
        const S = GR.SERIES[who.setId];
        this.floatText(who.x, who.y - 90, `${S.name}套裝`, '#ff6b9a', 18);
        if (who === this.me) toast(`湊齊${S.name}系列，套裝特效發動！`);
      }
      if (who.prada && !was) {
        this.floatText(who.x, who.y - 110, '穿著Prada的惡魔', '#ffd23f', 22);
        this.burst(who.x, who.y - 40, 16, 0xffd23f);
        if (who === this.me) toast('全身都是 SSR，你就是穿著Prada的惡魔！');
      }
      this.burst(who.x, who.y - 40, 8, 0xffffff);
    }

    // SR：一閃一閃的金光；SSR：顏色慢慢流轉的彩虹光，加上一道玻璃般的反光
    applyGlow(c) {
      this.applyPrada(c);
      this.applySet(c);
      const img = c.body_;
      if (c.glowTween) { c.glowTween.stop(); c.glowTween = null; }
      c.glowFx = null;
      if (!img.preFX) return; // Canvas 模式沒有特效
      img.preFX.clear();
      const rar = topRarity(c.look.equip);
      if (!rar) return;
      // 光一亮一暗慢慢呼吸，最亮的時候也只是淡淡一圈，不會刺眼
      img.preFX.setPadding(8);
      const glow = img.preFX.addGlow(rar === 'SSR' ? 0xffd6f4 : 0xffdf80, 0.2, 0, false, 0.1, 8);
      c.glowTween = this.tweens.add({ targets: glow, outerStrength: rar === 'SSR' ? 1.5 : 1.3, duration: rar === 'SSR' ? 1800 : 1300,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      if (rar === 'SSR') { c.glowFx = glow; img.preFX.addShine(0.18, 0.18, 6); }
    }

    // 全身 SSR（三格都穿 SSR）：腳下金色光暈、幾顆星星繞著飄、名字變金色
    // 星星只有 4 顆、只用一個 tween 算位置，平板也跑得動
    applyPrada(c) {
      const eq = c.look.equip || {};
      const on = GR.LOOK_SLOTS.every(s => GR.GEAR[eq[s]] && GR.GEAR[eq[s]].rarity === 'SSR');
      if (on === !!c.prada) return;
      c.prada = on;
      c.tag.setColor(on ? '#b07d10' : INK); // 全身 SSR：名牌字變金色（光芒另外畫）
      c.tag.setY(on ? 16 : 6); // 紙條往下挪到彩虹圈外面，才不會蓋住光環
      if (!on) {
        if (c.pradaTween) c.pradaTween.stop();
        (c.pradaFx || []).forEach(o => o.destroy());
        c.pradaTween = null; c.pradaFx = null;
        return;
      }
      // 外面的容器把圓壓扁成橢圓，裡面的圖慢慢轉，彩虹顏色就會繞著腳下流動
      const ring = this.add.image(0, 0, 'fx-aura').setScale(0.82);
      const aura = this.add.container(0, -2, [ring]).setScale(1, 0.36);
      const stars = [0, 1, 2, 3].map(() => this.add.image(0, 0, 'fx-star'));
      c.addAt(aura, 0);
      stars.forEach(st => c.add(st));
      c.pradaFx = [aura, ...stars];
      const t = { a: 0 };
      c.pradaTween = this.tweens.add({ targets: t, a: Math.PI * 2, duration: 4200, repeat: -1, onUpdate: () => {
        aura.setAlpha(0.75 + Math.sin(t.a * 2) * 0.25);
        ring.rotation = t.a;
        stars.forEach((st, i) => {
          const a = t.a + i * Math.PI / 2, front = Math.sin(a) > 0;
          // 轉到後面就躲到角色身後
          if (st.front !== front) { st.front = front; if (front) c.bringToTop(st); else c.moveTo(st, 1); }
          // 沿著腳下的彩虹圈繞，稍微浮在圈上一點點
          st.setPosition(Math.cos(a) * 38, -6 + Math.sin(a) * 14 - Math.abs(Math.sin(t.a * 3 + i)) * 3);
          st.setScale((front ? 0.48 : 0.36) + Math.max(0, Math.sin(t.a * 5 + i * 2)) * 0.16).setAlpha(front ? 1 : 0.6);
        });
      } });
      c.once('destroy', () => { if (c.pradaTween) c.pradaTween.stop(); });
    }

    // 套裝特效：頭飾、服裝、披風穿同一個系列，腳下一圈系列色的光，身邊一直飄出那個系列的小東西（只有外觀）
    applySet(c) {
      const sid = GR.setOf(c.look.equip);
      if (sid !== c.setId) {
        if (c.setTimer) { c.setTimer.remove(); c.setTimer = null; }
        if (c.setRingTween) { c.setRingTween.stop(); c.setRingTween = null; }
        if (c.setRing) { c.setRing.destroy(); c.setRing = null; }
        c.setId = sid;
        c.setTick = 0;
        const fx = sid && SET_FX[GR.SERIES[sid].fx];
        if (fx) {
          c.setTimer = this.time.addEvent({ delay: fx.every, loop: true, callback: () => this.setPuff(c, fx) });
          // 腳下的光圈：一張柔光圖壓扁成橢圓，慢慢一明一暗
          c.setRing = this.add.image(0, -2, 'fx-glow').setScale(1.5, 0.5).setTint(fx.ring).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
          c.addAt(c.setRing, 0);
          c.setRingTween = this.tweens.add({ targets: c.setRing, alpha: 0.95, scaleX: 1.7, scaleY: 0.56, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          if (!c.setHooked) {
            c.setHooked = true;
            c.once('destroy', () => { if (c.setTimer) c.setTimer.remove(); if (c.setRingTween) c.setRingTween.stop(); });
          }
        }
      }
      // 全身 SSR 已經有彩虹光圈，就不再疊一圈
      if (c.setRing) c.setRing.setVisible(!c.prada);
    }
    // 一個會發光的小東西：後面墊一圈柔光（一明一暗），前面是圖，兩個一起移動、一起淡掉
    setGlowItem(x, y, tex, scale, tint, glowTint, glowScale) {
      const halo = this.add.image(x, y, 'fx-glow').setDepth(2039).setTint(glowTint).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(glowScale).setAlpha(0.7);
      const img = this.add.image(x, y, tex).setDepth(2040).setScale(scale);
      if (tint) img.setTint(tint);
      this.tweens.add({ targets: halo, scale: glowScale * 1.35, alpha: 0.35, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return [halo, img];
    }
    // 一閃即逝的小星光
    setTwinkle(x, y, tint, size = 0.5) {
      const st = this.add.image(x, y, 'fx-sparkle').setDepth(2041).setTint(tint).setScale(0.05).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: st, scale: size, angle: 90, duration: 260, yoyo: true, ease: 'Sine.easeOut', onComplete: () => st.destroy() });
    }
    setPuff(c, fx) {
      // 不在畫面裡、隱身中就不飄，省一點效能
      if (!c.active || !c.visible || c.alpha < 0.5) return;
      if (!this.cameras.main.worldView.contains(c.x, c.y)) return;
      const tick = ++c.setTick;
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      // 從身體兩側冒出來（中間身體那段留空），高度在腳邊到肩膀之間，才不會一直往頭上撒
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = c.x + side * (28 + Math.random() * 32), y = c.y - 4 - Math.random() * 46;
      const sway = side * Math.random() * 18;
      const fade = (objs, dur) => this.tweens.add({ targets: objs, alpha: 0, duration: dur, onComplete: () => objs.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); }) });
      if (fx.kind === 'heart') {
        // 會發光的愛心，有大有小，往上飄
        const sc = 0.32 + Math.random() * 0.34;
        const objs = this.setGlowItem(x, y, 'fx-heart', sc, pick(fx.tint), 0xff7ab0, sc * 1.45);
        this.tweens.add({ targets: objs, y: y - 30 - Math.random() * 16, x: x + sway, duration: 1700, ease: 'Sine.easeOut' });
        this.time.delayedCall(1000, () => fade(objs, 700));
        if (Math.random() < 0.45) this.setTwinkle(c.x + (Math.random() - 0.5) * 130, c.y - Math.random() * 60, pick([0xffffff, 0xffd0e8]));
      } else if (fx.kind === 'redPacket') {
        // 紅包往上飄、後面拖著金粉；每隔幾次噴出一把金幣
        const objs = this.setGlowItem(x, y, 'fx-redpacket', 0.45 + Math.random() * 0.15, null, 0xffc040, 0.9);
        this.tweens.add({ targets: objs, y: y - 34, x: x + sway, duration: 1600, ease: 'Sine.easeOut',
          onUpdate: (tw) => { if (Math.random() < 0.18) this.setTwinkle(objs[1].x + (Math.random() - 0.5) * 10, objs[1].y + 10, 0xffd23f, 0.35); } });
        this.time.delayedCall(1000, () => fade(objs, 600));
        if (tick % 4 === 0) for (let i = 0; i < 6; i++) {
          const coin = this.add.image(c.x, c.y - 40, 'fx-coin').setDepth(2041).setScale(0.4);
          const dx = (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 45);
          this.tweens.add({ targets: coin, x: c.x + dx, duration: 700, ease: 'Linear' });
          this.tweens.add({ targets: coin, y: c.y - 62 - Math.random() * 16, duration: 300, ease: 'Quad.easeOut', yoyo: true, hold: 0,
            onComplete: () => { this.setTwinkle(coin.x, coin.y, 0xffd23f, 0.4); coin.destroy(); } });
        }
      } else if (fx.kind === 'petal') {
        // 花瓣：粉白相間從頭上慢慢飄落、邊轉邊晃，中間夾著金色亮點
        const img = this.add.image(x, c.y - 44 - Math.random() * 12, 'fx-petal').setDepth(2040)
          .setScale(0.4 + Math.random() * 0.25).setTint(pick(fx.tint)).setRotation(Math.random() * Math.PI);
        this.tweens.add({ targets: img, y: c.y + 6, x: x + sway, rotation: img.rotation + (Math.random() < 0.5 ? -2.5 : 2.5),
          alpha: { from: 1, to: 0 }, duration: 2000, ease: 'Sine.easeIn', onComplete: () => img.destroy() });
        if (Math.random() < 0.35) this.setTwinkle(c.x + (Math.random() - 0.5) * 130, c.y - Math.random() * 56, pick([0xffe27a, 0xffffff]));
      } else if (fx.kind === 'butterfly') {
        // 蝴蝶：一上一下拍著翅膀往旁邊飛，飛過的地方留下一串發光的小亮點
        const dir = side; // 往外飛，不會橫越頭頂
        const img = this.add.image(x, y, 'fx-butterfly').setDepth(2040).setScale(0.5).setFlipX(dir < 0).setTint(pick(fx.tint));
        this.tweens.add({ targets: img, x: x + dir * (40 + Math.random() * 30), duration: 2200, ease: 'Sine.easeOut',
          onUpdate: () => {
            if (Math.random() > 0.25) return;
            const d = this.add.image(img.x, img.y + 4, 'fx-glow').setDepth(2039).setScale(0.12).setTint(0xbfe8ff).setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({ targets: d, alpha: 0, scale: 0.04, y: d.y + 8, duration: 700, onComplete: () => d.destroy() });
          } });
        this.tweens.add({ targets: img, y: y - 24, duration: 2200, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: img, scaleY: 0.18, duration: 140, yoyo: true, repeat: 7 });
        this.tweens.add({ targets: img, alpha: 0, delay: 1600, duration: 600, onComplete: () => { this.tweens.killTweensOf(img); img.destroy(); } });
      }
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
        this.cakeParty(who, true);
      } else if (!(ms > 0) && who.cake) {
        who.cake.destroy(); who.cake = null;
        if (who.cakeGlow) { who.cakeGlow.destroy(); who.cakeGlow = null; }
      }
      // 蛋糕放下了，因為它戴上的帽子也一起拿掉
      if (!(ms > 0)) [this.me, ...this.remotes.values()].forEach(c => { if (c && c.hatBy === id) c.hatUntil = 0; });
      if (who === this.me) $('cake-btn').hidden = !(ms > 0);
    }

    // 名牌只寫等級和名字（職業、全身 SSR 點開個人資料看得到）
    tagText(p) { return `Lv.${p.level || 1} ${p.name}`; }

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

    // 頭頂的小血條（名牌在腳下）
    drawHpBar(c, st) {
      c.stats = st;
      const w = 40, ratio = st.maxHp ? Math.max(0, st.hp) / st.maxHp : 1;
      c.bar.clear();
      c.bar.fillStyle(0x131a28, 0.85); c.bar.fillRoundedRect(-w / 2 - 2, -83, w + 4, 8, 4);
      c.bar.fillStyle(ratio > 0.35 ? 0x6baf7b : 0xff6a13, 1); c.bar.fillRoundedRect(-w / 2, -81, Math.max(2, w * ratio), 4, 2);
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
      if (st.cls !== prev.cls || st.level !== prev.level) who.tag.setText(this.tagText({ name: who.name_, level: st.level }));
      this.drawHpBar(who, st);
      // 防禦增益：頭上掛一個小盾牌
      if (st.buffMs > 0) {
        if (!who.shield) { who.shield = this.add.image(26, -70, 'fx-shield').setScale(0.6); who.add(who.shield); }
        who.shieldUntil = performance.now() + st.buffMs;
      }
      // 攻擊增益（靈魂之歌）：頭上另一邊掛一個音符
      if (st.atkBuffMs > 0) {
        if (!who.atkIcon) { who.atkIcon = this.add.image(-26, -70, 'fx-note').setScale(0.55); who.add(who.atkIcon); }
        who.atkUntil = performance.now() + st.atkBuffMs;
      }
      if (who === this.me) {
        if (st.dead && !prev.dead) {
          toast(this.inDg() ? `你倒下了！${MAP.DUNGEONS[this.myDg().id].respawnMs / 1000} 秒後在這一關的起點復活` : `你被${ST.MONSTER.name}吹倒了！${ST.RESPAWN_MS / 1000} 秒後回到總部`);
          this.target = null;
        }
        renderStats(st);
      }
    }

    // 煮泡麵：最近的爐台冒火、鍋子冒蒸氣
    onCooking(c) {
      const who = me && c.id === me.id ? this.me : this.remotes.get(c.id);
      if (!who) return;
      const t = this.bubbleImg(0, -104, '咕嘟咕嘟…');
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
        this.floatText(best.x, best.y - 50, '煮好了！', '#ffffff', 18);
      }, c.ms);
    }

    setCrateEmpty(tx, ty, empty) {
      const key = tx + ',' + ty;
      const old = this.emptyCrates.get(key);
      if (old) { old.destroy(); this.emptyCrates.delete(key); }
      if (empty) this.emptyCrates.set(key, this.add.image((tx + 0.5) * T, (ty + 0.5) * T, 'crate-empty').setDepth(-9));
    }

    // DJ 台上的兩張黑膠：有歌在放就會轉，還會飄出音符
    makeDj() {
      if (this.djParts) return;
      const { x, y } = MAP.dj;
      const disc = (dx) => {
        const g = this.add.graphics();
        g.fillStyle(0x111111, 1).fillCircle(0, 0, 17);
        g.lineStyle(1, 0x3a3a44, 1); [13, 10, 7].forEach(r => g.strokeCircle(0, 0, r));
        g.fillStyle(0xff6a13, 1).fillCircle(0, 0, 5);
        g.fillStyle(0xffffff, 1).fillCircle(0, -11, 1.6);
        return this.add.container(x + dx, y - 4, [g]).setDepth(y + T / 2 - 1);
      };
      const sign = this.add.text(x, y - 38, 'DJ', { fontFamily: FONT, fontSize: '15px', fontStyle: '900', color: '#ffd23f',
        stroke: '#131a28', strokeThickness: 4 }).setOrigin(0.5).setDepth(y + T / 2);
      this.djParts = { discs: [disc(-24), disc(24)], sign, nextNote: 0 };
    }
    tickDj(time, delta) {
      const d = this.djParts;
      if (!d) return;
      const on = MUSIC.playing();
      d.discs.forEach((c, i) => { if (on) c.rotation += (i ? 0.004 : 0.0045) * delta; });
      d.sign.setText(on ? 'DJ ♪' : 'DJ');
      if (on && time > d.nextNote) {
        d.nextNote = time + 650;
        const n = this.add.text(MAP.dj.x + (Math.random() - 0.5) * 60, MAP.dj.y - 20, Math.random() < 0.5 ? '♪' : '♫',
          { fontFamily: FONT, fontSize: '20px', fontStyle: '900', color: ['#ffd23f', '#ff8fab', '#7fd1ff'][Math.floor(Math.random() * 3)],
            stroke: '#131a28', strokeThickness: 3 }).setOrigin(0.5).setDepth(MAP.dj.y + T);
        this.tweens.add({ targets: n, y: n.y - 60, x: n.x + (Math.random() - 0.5) * 30, alpha: 0, duration: 1800, onComplete: () => n.destroy() });
      }
    }

    // 許願池的名牌；有人許願時，從他身上丟一枚硬幣劃進池子，濺起水花
    makeWell() {
      if (this.wellSign) return;
      const { x, y } = MAP.well;
      this.wellSign = this.add.text(x, y - 46, '許願池', {
        fontSize: '10px', fontStyle: 'bold', color: INK, fontFamily: FONT,
        backgroundColor: PAPER, padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setDepth(y + T);
      if (window.HQ_ICONS && !this.textures.exists('wish-coin')) this.textures.addBase64('wish-coin', HQ_ICONS.url('wish-coin'));
    }
    wishCoin(id) {
      const who = id === (me && me.id) ? this.me : this.remotes.get(id);
      const { x, y } = MAP.well;
      const sx = who ? who.x : x - 60, sy = who ? who.y - 40 : y - 60;
      if (Math.hypot(sx - this.cameras.main.midPoint.x, sy - this.cameras.main.midPoint.y) > 900) return;
      const coin = this.textures.exists('wish-coin') ? this.add.image(sx, sy, 'wish-coin').setDisplaySize(22, 22)
        : this.add.circle(sx, sy, 8, 0xffd23f).setStrokeStyle(2, 0x2b2a33);
      coin.setDepth(y + 2 * T);
      const peak = Math.min(sy, y) - 70;
      this.tweens.addCounter({ from: 0, to: 1, duration: 700, ease: 'Sine.in', onUpdate: (tw) => {
        const k = tw.getValue();
        coin.x = sx + (x - sx) * k;
        coin.y = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * peak + k * k * (y + 4);
        coin.rotation = k * 9;
      }, onComplete: () => {
        coin.destroy();
        [0, 160].forEach((delay) => {
          const ring = this.add.ellipse(x, y + 4, 10, 6).setStrokeStyle(2, 0xffffff, 0.9).setDepth(y + T);
          this.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, delay, duration: 700, onComplete: () => ring.destroy() });
        });
      } });
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
      if (res.dungeon) this.setDungeon(res.dungeon);
      this.summons.forEach(sm => sm.destroy());
      this.summons.clear();
      (res.summons || []).forEach(sm => this.onSummon(sm));
      this.decor.forEach(d => d.destroy());
      this.decor.clear();
      (res.decor || []).forEach(d => this.setDecor(d));
      this.makeDj();
      this.makeWell();
      TREE.refresh();
      MUSIC.set(res.music);
      this.walls.forEach((w, id) => this.onWallGone(id, true));
      (res.walls || []).forEach(w => this.onWall(w));
      this.storms.forEach((st, id) => this.onStormGone(id, true));
      (res.storms || []).forEach(st => this.onStorm(st));
      renderStats(res.you);
      this.emptyCrates.forEach(i => i.destroy());
      this.emptyCrates.clear();
      (res.emptyCrates || []).forEach(k => { const [tx, ty] = k.split(',').map(Number); this.setCrateEmpty(tx, ty, true); });
    }

    addRemote(p) {
      if (!this.me || p.id === me.id || this.remotes.has(p.id)) return;
      this.remotes.set(p.id, this.makeAvatar(p));
      if (p.away) this.setAway(p.id, true);
      this.updateOnline();
    }

    // 斷線中的人：變半透明，頭上掛「斷線中」
    setAway(id, away) {
      const r = this.remotes.get(id);
      if (!r) return;
      r.setAlpha(away ? 0.45 : 1);
      if (away && !r.awayTag) {
        r.awayTag = this.add.text(0, -86, '斷線中', { fontSize: '10px', fontStyle: 'bold', color: INK, fontFamily: FONT,
          backgroundColor: PAPER, padding: { x: 11, y: 5 } }).setOrigin(0.5, 1);
        r.add(r.awayTag);
      } else if (!away && r.awayTag) { r.awayTag.destroy(); r.awayTag = null; }
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

    // 頭上的對話框：蠟筆手繪的白色泡泡，下面有小尾巴指向說話的人
    showBubble(id, text) {
      const who = me && id === me.id ? this.me : this.remotes.get(id);
      if (!who) return;
      if (who.bubble) who.bubble.destroy();
      const b = this.bubbleImg(0, -88, text).setScale(0.25);
      who.add(b);
      who.bubble = b;
      this.tweens.add({ targets: b, scale: 0.5, duration: 260, ease: 'Back.easeOut' });
      this.time.delayedCall(4600, () => {
        if (who.bubble !== b) return;
        this.tweens.add({ targets: b, alpha: 0, y: b.y - 8, duration: 400, onComplete: () => { b.destroy(); if (who.bubble === b) who.bubble = null; } });
      });
    }
    // 對話框圖片（底部中間對齊說話的人），被拿掉時順便清掉貼圖
    bubbleImg(x, y, text) {
      const key = 'bubble-' + (this.bubbleN = (this.bubbleN || 0) + 1);
      const b = this.add.image(x, y, this.makeBubble(key, text)).setOrigin(0.5, 1).setScale(0.5);
      b.once('destroy', () => { if (this.textures.exists(key)) this.textures.remove(key); });
      return b;
    }
    makeBubble(key, text) {
      const S = 2, PAD = 10, TAIL = 9, MAXW = 190, LH = 20;
      const font = `500 15px ${FONT}`;
      const m = document.createElement('canvas').getContext('2d');
      m.font = font;
      // 自動換行，最多 3 行
      const lines = [];
      let cur = '';
      for (const ch of [...text]) {
        if (m.measureText(cur + ch).width > MAXW && cur) { lines.push(cur); cur = ''; }
        cur += ch;
      }
      if (cur) lines.push(cur);
      if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].slice(0, -1) + '…'; }
      const tw = Math.max(24, ...lines.map(l => m.measureText(l).width));
      const w = Math.ceil(tw + PAD * 2), h = lines.length * LH + PAD * 1.4;
      const cv = document.createElement('canvas');
      cv.width = (w + 8) * S; cv.height = (h + TAIL + 8) * S;
      const ctx = cv.getContext('2d');
      ctx.scale(S, S); ctx.translate(4, 4);
      const r = CR.rng([...text].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7));
      const J = () => (r() - 0.5) * 1.6;
      // 圓角外框沿著邊取點加一點抖動，底部中間插進尾巴
      const R = Math.min(12, h / 2), pts = [];
      const arc = (cx, cy, a0) => { for (let i = 0; i <= 3; i++) { const a = a0 + i * Math.PI / 6; pts.push([cx + Math.cos(a) * R + J(), cy + Math.sin(a) * R + J()]); } };
      const edge = (x0, y0, x1, y1) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 18)); for (let i = 1; i < n; i++) pts.push([x0 + (x1 - x0) * i / n + J(), y0 + (y1 - y0) * i / n + J()]); };
      arc(R, R, Math.PI); edge(R, 0, w - R, 0);
      arc(w - R, R, -Math.PI / 2); edge(w, R, w, h - R);
      arc(w - R, h - R, 0);
      const tx = w / 2;
      edge(w - R, h, tx + 7, h);
      pts.push([tx + 7, h], [tx + 1, h + TAIL], [tx, h + TAIL], [tx - 6, h]);
      edge(tx - 6, h, R, h);
      arc(R, h - R, Math.PI / 2); edge(0, h - R, 0, R);
      CR.smooth(ctx, pts);
      CR.fill(ctx, '#fffdf6', r, [0, 0, w, h + TAIL], 0.25);
      CR.stroke(ctx, r, 2.2);
      ctx.font = font; ctx.fillStyle = '#3a3a3c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach((l, i) => ctx.fillText(l, w / 2, PAD * 0.7 + LH * (i + 0.5)));
      this.textures.addCanvas(key, cv);
      return key;
    }

    // ---------- 颱風 ----------
    setMonster(m) {
      if (!m) return;
      const wasAlive = this.mState && this.mState.alive && this.monster.visible;
      this.mState = m;
      const now = performance.now();
      this.frozenUntil = now + (m.frozen || 0);
      this.weakUntil = now + (m.weak || 0);
      const phaseUp = m.phase === 2 && this.monster.phase !== 2;
      this.monster.phase = m.phase || 1; // foeGap 用：變身後體型變大
      this.applyMonsterLook();
      if (m.alive && wasAlive) {
        if (phaseUp) this.transformMonster(m);
        this.drawMonsterBar(); return; // 只是狀態更新（冰凍、削弱、血量上限）
      }
      const base = this.monsterScale();
      if (m.alive) {
        this.tweens.killTweensOf(this.monster);
        this.monster.setVisible(true).setAlpha(1).setScale(base).setAngle(0);
        this.monster.x = this.monster.tx = m.x; this.monster.y = this.monster.ty = m.y;
        this.mDead.setVisible(false);
        // 出場：從地上彈出來
        this.tweens.add({ targets: this.monster, scale: { from: 0.2, to: base }, duration: 500, ease: 'Back.out' });
        if (phaseUp) this.transformMonster(m); // 剛連進來就遇到變身中
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

    monsterScale() { return this.monster.phase === 2 ? ST.MONSTER2.scale : 1; }
    // 名字、頭目血條、顏色跟著階段換
    applyMonsterLook() {
      const M = this.monster.phase === 2 ? ST.MONSTER2 : ST.MONSTER;
      const label = `Lv.${M.level} ${M.name}`;
      if (this.mName.text !== label) this.mName.setText(label);
      if (this.bossFor === 'typhoon') {
        document.querySelector('#boss .boss-lv').textContent = 'Lv.' + M.level;
        document.querySelector('#boss .boss-lv').nextSibling.textContent = ' ' + M.name + ' ';
        $('boss').classList.toggle('phase2', this.monster.phase === 2);
      }
      this.mSwirl.setTint(this.monster.phase === 2 ? 0xff5a7a : 0xffffff);
      this.applyMonsterTint();
    }
    // 變身：被打倒的瞬間原地爆出一圈閃光，旋轉著長大，畫面震動
    transformMonster(m) {
      const x = this.monster.x, y = this.monster.y, big = ST.MONSTER2.scale;
      this.tweens.killTweensOf(this.monster);
      this.monster.setAngle(0).setAlpha(1);
      this.mFace.setTexture('typhoon-face-hit');
      this.tweens.add({ targets: this.monster, angle: 720, scale: { from: 0.6, to: big }, duration: Math.min(2600, m.transforming || 2600),
        ease: 'Cubic.inOut', onComplete: () => { this.monster.setAngle(0); this.mFace.setTexture('typhoon-face'); } });
      for (let i = 0; i < 3; i++) this.time.delayedCall(i * 450, () => {
        const g = this.add.graphics({ x, y }).setDepth(-3);
        g.lineStyle(8, i % 2 ? 0xffd23f : 0xff5a7a, 0.9); g.strokeEllipse(0, 0, 220, 130);
        this.tweens.add({ targets: g, scale: 3, alpha: 0, duration: 900, ease: 'Quad.out', onComplete: () => g.destroy() });
        this.burst(x, y - 120, 16, i % 2 ? 0xffd23f : 0xff5a7a, 220);
      });
      if (this.me && Math.hypot(this.me.x - x, this.me.y - y) < 1400) {
        this.cameras.main.shake(1200, 0.008);
        this.flash.setSize(this.scale.width, this.scale.height);
        this.tweens.add({ targets: this.flash, alpha: { from: 0.6, to: 0 }, duration: 600, delay: 2200 });
      }
      this.floatText(x, y - 260, `${ST.MONSTER.name}變身成「${ST.MONSTER2.name}」了！`, '#ff8fab', 28);
    }

    // 楓之谷的頭目血條放在畫面上方（DOM），怪物頭上再留一條細的
    drawMonsterBar() {
      const ratio = this.mState.maxHp ? this.mState.hp / this.mState.maxHp : 0;
      if (this.bossFor === 'typhoon') {
        $('boss-fill').style.width = (ratio * 100) + '%';
        $('boss-pct').textContent = Math.ceil(ratio * 100) + '%';
      }
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

    // 出手的是玩家還是召喚物
    actorOf(id) { return (me && id === me.id ? this.me : this.remotes.get(id)) || this.summons.get(id) || null; }

    onMonsterHit(m) {
      // 弓箭、槓鈴、溜冰要等特效打到才跳數字
      const delay = HIT_DELAY[m.skill] || 0;
      if (delay && !fxOff()) { this.time.delayedCall(delay, () => this.showMonsterHit(m)); return; }
      this.showMonsterHit(m);
    }

    showMonsterHit(m) {
      // 傷害數字會晚一點才跳；變身前打的那一下不要把變身後的新血條歸零
      if (!m.phase || m.phase === this.monster.phase) this.mState.hp = Math.min(this.mState.hp, m.hp);
      this.drawMonsterBar();
      if (fxOff()) return;
      const who = this.actorOf(m.id);
      if (who && (MELEE.includes(m.skill) || m.skill === 'pet')) this.lunge(who, this.monster.x);
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
      else if (now < (this.shockUntil || 0)) this.mBody.setTint(0xfff07a);
      else if (now < this.weakUntil) this.mBody.setTint(0xd9c4ff);
      else if (this.monster.phase === 2) this.mBody.setTint(0xffb3c6); // 第二階段：整隻變成暴怒的粉紅色
      else this.mBody.clearTint();
    }

    // 颱風出招前：地上先出現紅圈圈，裡面的圓慢慢長大，滿了就打下來
    onMonsterAttack(a) {
      if (fxOff()) return;
      const color = { gust: 0xffffff, rain: 0x4f7cc2, bolt: 0xffd23f, tornado: 0xff5a7a, hail: 0xbfe6ff }[a.type];
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
      const say = { gust: ['強風來了！', '#ffffff'], rain: ['暴雨彈！', '#bfe6ff'], bolt: ['落雷！', '#ffd23f'],
        tornado: ['超級龍捲風！', '#ff8fab'], hail: ['冰雹轟炸！', '#bfe6ff'] }[a.type];
      this.floatText(this.monster.x, this.monster.y - 200 * this.monsterScale(), say[0], say[1], a.type === 'tornado' || a.type === 'hail' ? 26 : 20);
      if (this.me && !this.isDead() && this.roomId === 'front' && a.spots.some(sp => Math.hypot(this.me.x - sp.x, this.me.y - sp.y) <= a.r)) {
        toast('快離開紅圈！');
      }
    }

    onMonsterAttackHit(a) {
      if (fxOff()) return;
      a.spots.forEach(sp => {
        if (a.type === 'gust' || a.type === 'tornado') {
          // 一圈往外捲的風；龍捲風捲得更多圈、更大、帶紅色
          const big = a.type === 'tornado';
          (big ? [0, 100, 200, 300] : [0, 120]).forEach(d => {
            const w = this.add.image(sp.x, sp.y - 20, 'typhoon').setDepth(sp.y + 200).setAlpha(0.9).setScale(0.4, 0.15);
            if (big) w.setTint(d % 200 ? 0xff8fab : 0xffffff);
            this.tweens.add({ targets: w, scaleX: big ? 3.2 : 2.2, scaleY: big ? 1.2 : 0.8, alpha: 0, angle: big ? -480 : -200, delay: d,
              duration: big ? 900 : 650, ease: 'Quad.out', onComplete: () => w.destroy() });
          });
          if (big) {
            // 中間拔起一根旋轉的風柱
            const col = this.add.image(sp.x, sp.y, 'typhoon').setOrigin(0.5, 1).setDepth(sp.y + 201).setTint(0xff8fab).setScale(0.6, 0.2);
            this.tweens.add({ targets: col, scaleY: 1.6, angle: 360, alpha: { from: 0.9, to: 0 }, duration: 1000, ease: 'Quad.out', onComplete: () => col.destroy() });
          }
          this.burst(sp.x, sp.y - 30, big ? 22 : 14, big ? 0xff8fab : 0xffffff, a.r);
        } else if (a.type === 'hail') {
          // 一顆冰塊從天上砸下來碎成一地
          const ice = this.add.image(sp.x + 60, sp.y - 460, 'fx-ice').setDepth(sp.y + 200).setScale(0.8).setAngle(-20);
          this.tweens.add({ targets: ice, x: sp.x, y: sp.y - 20, angle: 20, duration: 220 + Math.random() * 120, ease: 'Quad.in', onComplete: () => {
            ice.destroy();
            const crack = this.add.graphics({ x: sp.x, y: sp.y }).setDepth(-4);
            crack.fillStyle(0xbfe6ff, 0.75); crack.fillEllipse(0, 0, a.r * 2, a.r * 1.3);
            crack.lineStyle(3, 0x4f7cc2, 0.8); crack.strokeEllipse(0, 0, a.r * 2, a.r * 1.3);
            this.tweens.add({ targets: crack, alpha: 0, delay: 500, duration: 900, onComplete: () => crack.destroy() });
            this.burst(sp.x, sp.y - 10, 10, 0xffffff, a.r);
          } });
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
      if (near) this.cameras.main.shake(260, a.type === 'bolt' || a.type === 'tornado' ? 0.012 : 0.007);
      if ((a.type !== 'gust' && a.type !== 'tornado') || this.roomId !== 'front') return; // 圍欄內是安全區
      const sp = a.spots[0];
      const dx = this.me.x - sp.x, dy = this.me.y - sp.y, d = Math.hypot(dx, dy);
      if (d > a.r) return;
      // 被強風往外吹
      const f = a.type === 'tornado' ? 820 : 620;
      this.push = { x: (dx || 1) / (d || 1) * f, y: (dy || 0) / (d || 1) * f, t: 0.35 };
      this.floatText(this.me.x, this.me.y - 100, '被風吹走了！', '#ffffff', 18);
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

    // 拿著蛋糕的慶祝氛圍：腳下一圈暖暖的光、音符往上飄、彩帶灑下來，偶爾再噴一圈星星
    cakeParty(who, first) {
      const PASTEL = [0xff8fab, 0xffd23f, 0x8fd3ff, 0xb39cff, 0x7be0a6, 0xffb27a];
      const pick = () => PASTEL[Math.floor(Math.random() * PASTEL.length)];
      if (first) {
        if (!who.cakeGlow) {
          const g = this.add.graphics();
          g.fillStyle(0xffd23f, 0.3); g.fillEllipse(0, 0, 160, 56);
          g.fillStyle(0xff8fab, 0.35); g.fillEllipse(0, 0, 100, 34);
          who.cakeGlow = g; who.addAt(g, 0);
          this.tweens.add({ targets: g, scaleX: 1.12, scaleY: 1.12, alpha: 0.7, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
        for (let i = 0; i < 10; i++) this.time.delayedCall(i * 60, () => who.cakeUntil && this.cakeNote(who, pick()));
        for (let i = 0; i < 30; i++) this.cakeConfetti(who, pick(), true);
        this.burst(who.x, who.y - 50, 16, 0xffd23f, 130);
        who.cakeFx = { note: 0, conf: 0, star: 0 };
        return;
      }
      const now = performance.now(), f = who.cakeFx || (who.cakeFx = { note: 0, conf: 0, star: 0 });
      if (now > f.note) { f.note = now + 240 + Math.random() * 160; this.cakeNote(who, pick()); }
      if (now > f.conf) { f.conf = now + 110 + Math.random() * 80; this.cakeConfetti(who, pick()); }
      if (now > f.star) { f.star = now + 1800 + Math.random() * 900; this.burst(who.x + (Math.random() - 0.5) * 80, who.y - 70 - Math.random() * 40, 8, pick(), 60); }
    }

    cakeNote(who, tint) {
      const a = Math.random() * Math.PI * 2;
      const x = who.x + Math.cos(a) * (30 + Math.random() * 40), y = who.y - 30 + Math.sin(a) * 18;
      const n = this.add.image(x, y, Math.random() < 0.5 ? 'fx-note' : 'fx-notes').setTint(tint)
        .setScale(0.2).setAlpha(0).setAngle((Math.random() - 0.5) * 30).setDepth(2040);
      const rise = 110 + Math.random() * 70, sway = (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 16);
      this.tweens.add({ targets: n, scale: 0.52 + Math.random() * 0.16, alpha: 1, duration: 260, ease: 'Back.out' });
      this.tweens.add({ targets: n, x: x + sway, duration: 520, yoyo: true, repeat: 1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: n, angle: n.angle - sway, duration: 520, yoyo: true, repeat: 1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: n, y: y - rise, duration: 2100, ease: 'Sine.out' });
      this.tweens.add({ targets: n, alpha: 0, delay: 1500, duration: 600, onComplete: () => n.destroy() });
    }

    cakeConfetti(who, tint, pop) {
      const c = this.add.image(who.x + (Math.random() - 0.5) * (pop ? 30 : 180), who.y - (pop ? 60 : 120 + Math.random() * 50), 'fx-confetti')
        .setTint(tint).setScale(0.6 + Math.random() * 0.5).setAngle(Math.random() * 360).setDepth(2030);
      const dx = (Math.random() - 0.5) * (pop ? 260 : 60);
      if (pop) {
        // 一開始往上噴，再慢慢飄下來
        this.tweens.add({ targets: c, y: c.y - 60 - Math.random() * 60, duration: 350, ease: 'Quad.out' });
        this.tweens.add({ targets: c, y: who.y + 10, delay: 350, duration: 1200 + Math.random() * 500, ease: 'Sine.in' });
      } else {
        this.tweens.add({ targets: c, y: who.y + 10 + Math.random() * 20, duration: 1500 + Math.random() * 700, ease: 'Sine.in' });
      }
      this.tweens.add({ targets: c, x: c.x + dx, angle: c.angle + (Math.random() < 0.5 ? -1 : 1) * 540, scaleY: 0.2, duration: 1700, ease: 'Sine.out' });
      this.tweens.add({ targets: c, alpha: 0, delay: 1400, duration: 500, onComplete: () => c.destroy() });
    }

    // 職業技能的特效
    onSkillFx(fx) {
      if (fxOff()) return;
      const who = me && fx.id === me.id ? this.me : this.remotes.get(fx.id);
      if (!who) return;
      const sk = ST.SKILLS[fx.skill];
      const foe = this.foePos(fx.target);
      const mx = foe.x, my = foe.mid;
      if (!sk.basic) this.floatText(who.x, who.y - 130, `${sk.name}！`, '#ffd23f', 20, 'sk-' + fx.skill);
      const ring = (r, color) => {
        const g = this.add.graphics({ x: who.x, y: who.y }).setDepth(-4);
        g.fillStyle(color, 0.25); g.fillEllipse(0, 0, r * 2, r * 1.4);
        g.lineStyle(4, color, 0.9); g.strokeEllipse(0, 0, r * 2, r * 1.4);
        this.tweens.add({ targets: g, scale: { from: 0.2, to: 1 }, alpha: { from: 1, to: 0 }, duration: 800,
          ease: 'Quad.out', onComplete: () => g.destroy() });
      };
      // 飛向怪物的東西：tex 貼圖，ms 飛行時間，打到後炸一圈
      const fly = (tex, ms, tint, opts = {}) => {
        const sx = who.x + (mx < who.x ? -14 : 14), sy = who.y - 44;
        const p = this.add.image(sx, sy, tex).setDepth(2050).setScale(opts.scale || 1).setRotation(Math.atan2(my - sy, mx - sx));
        if (opts.tint) p.setTint(opts.tint);
        this.tweens.add({ targets: p, x: mx, y: my, duration: ms, ease: 'Linear', onComplete: () => { p.destroy(); this.burst(mx, my, 6, tint, 45); } });
      };
      if (fx.skill === 'shot') {
        // 拉弓：人往後仰一下再射出去
        const dir = mx < who.x ? -1 : 1;
        who.body_.setFlipX(dir === -1);
        this.tweens.add({ targets: who.body_, x: -dir * 5, duration: 90, yoyo: true });
        this.time.delayedCall(60, () => fly('fx-arrow', 200, 0xff6b81, { scale: 0.8 }));
      } else if (fx.skill === 'lilyDart') {
        // 金針花標：手上捏著的那朵金針花像飛鏢一樣，轉著圈射出去
        const sx = who.x + (mx < who.x ? -25 : 25), sy = who.y - 10;
        const f = this.add.image(sx, sy, 'fx-lily').setDepth(2050).setScale(0.7);
        this.tweens.add({ targets: f, x: mx, y: my, angle: 900, duration: 270, ease: 'Linear',
          onComplete: () => { f.destroy(); this.burst(mx, my, 7, 0xff8a3d, 45); } });
      } else if (fx.skill === 'pebbleOrb') {
        // 七星潭法杖：一顆藍色的海水球飛過去，炸開成七種顏色的小石頭
        const sx = who.x + (mx < who.x ? -20 : 20), sy = who.y - 92;
        const o = this.add.image(sx, sy, 'fx-crystal').setDepth(2050).setScale(0.26).setTint(0x7fb2e5);
        this.tweens.add({ targets: o, x: mx, y: my, duration: 300, ease: 'Quad.in', onComplete: () => {
          o.destroy();
          const g = this.add.graphics({ x: mx, y: my + 30 }).setDepth(-4);
          g.fillStyle(0x7fb2e5, 0.3); g.fillEllipse(0, 0, 220, 130); g.lineStyle(4, 0x4f7cc2, 0.8); g.strokeEllipse(0, 0, 220, 130);
          this.tweens.add({ targets: g, scale: { from: 0.3, to: 1 }, alpha: { from: 1, to: 0 }, duration: 600, onComplete: () => g.destroy() });
          [0xe8384f, 0xff8a3d, 0xffd23f, 0x6baf7b, 0x4f7cc2, 0x8a5cd6, 0xffffff].forEach(c => this.burst(mx, my, 2, c, 70));
        } });
      } else if (fx.skill === 'marbleSmash') {
        // 太魯閣戰錘：往地上一砸，地面裂開、碎石噴出來
        const dir = mx < who.x ? -1 : 1;
        who.body_.setFlipX(dir === -1);
        this.tweens.add({ targets: who.body_, angle: dir * -18, duration: 90, yoyo: true });
        this.time.delayedCall(120, () => {
          const cx = who.x + dir * 30, cy = who.y;
          ring(sk.aoe, 0xc9ccd3);
          const crack = this.add.graphics({ x: cx, y: cy }).setDepth(-4);
          crack.lineStyle(4, 0x2b2a33, 0.7);
          for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; crack.lineBetween(0, 0, Math.cos(a) * 46, Math.sin(a) * 24); }
          this.tweens.add({ targets: crack, alpha: 0, delay: 300, duration: 600, onComplete: () => crack.destroy() });
          this.burst(cx, cy - 10, 10, 0xe2e0da, 90);
          this.floatText(cx, cy - 60, '轟！', '#ffffff', 26);
          this.cameras.main.shake(140, 0.007);
        });
      } else if (fx.skill === 'cardFlick') {
        // 捷運悠遊卡：卡片轉著飛過去，打中再彈到旁邊的怪
        const sx = who.x + (mx < who.x ? -22 : 22), sy = who.y - 36;
        const c = this.add.image(sx, sy, 'fx-card').setDepth(2050).setScale(0.8);
        this.tweens.add({ targets: c, x: mx, y: my, angle: 720, duration: 250, ease: 'Linear', onComplete: () => {
          this.burst(mx, my, 6, 0x4f9fd8, 40);
          let px = mx, py = my;
          (fx.chain || []).forEach((id, i) => {
            const t = this.foePos(id);
            const fromX = px, fromY = py;
            px = t.x; py = t.mid;
            this.time.delayedCall(i * 140, () => {
              const cc = this.add.image(fromX, fromY, 'fx-card').setDepth(2050).setScale(0.6);
              this.tweens.add({ targets: cc, x: t.x, y: t.mid, angle: 540, duration: 140, onComplete: () => { cc.destroy(); this.burst(t.x, t.mid, 5, 0x4f9fd8, 35); } });
            });
          });
          c.destroy();
        } });
      } else if (fx.skill === 'damperSwing') {
        // 阻尼球流星錘：金球劃一道弧砸過去，砸到的地方一圈金光
        const sx = who.x + (mx < who.x ? -20 : 20), sy = who.y - 50;
        const b = this.add.image(sx, sy, 'fx-goldball').setDepth(2050).setScale(0.9);
        const chain = this.add.graphics().setDepth(2049);
        const t0 = { k: 0 };
        this.tweens.add({ targets: t0, k: 1, duration: 320, ease: 'Quad.in', onUpdate: () => {
          const k = t0.k, x = sx + (mx - sx) * k, y = sy + (my - sy) * k - Math.sin(k * Math.PI) * 70;
          b.setPosition(x, y);
          chain.clear().lineStyle(2, 0x5b6577, 0.9).lineBetween(who.x + (mx < who.x ? -12 : 12), who.y - 40, x, y);
        }, onComplete: () => {
          b.destroy(); chain.destroy();
          const g = this.add.graphics({ x: mx, y: my + 30 }).setDepth(-4);
          g.fillStyle(0xffc93c, 0.3); g.fillEllipse(0, 0, 200, 120); g.lineStyle(4, 0xc9962a, 0.8); g.strokeEllipse(0, 0, 200, 120);
          this.tweens.add({ targets: g, scale: { from: 0.3, to: 1 }, alpha: { from: 1, to: 0 }, duration: 500, onComplete: () => g.destroy() });
          this.burst(mx, my, 10, 0xffc93c, 70);
          this.floatText(mx, my - 50, '咚！', '#ffd23f', 22);
        } });
      } else if (fx.skill === 'spireThrust') {
        // 101 避雷針長槍：往前刺；引雷的時候天上劈下一道閃電，跳到旁邊的怪
        const dir = mx < who.x ? -1 : 1;
        who.body_.setFlipX(dir === -1);
        this.tweens.add({ targets: who.body_, x: dir * 10, duration: 80, yoyo: true });
        const ln = this.add.graphics().setDepth(2050);
        ln.lineStyle(6, 0x5f8f8c, 0.9); ln.lineBetween(who.x + dir * 20, who.y - 40, mx, my);
        ln.lineStyle(2, 0xffffff, 0.9); ln.lineBetween(who.x + dir * 20, who.y - 40, mx, my);
        this.tweens.add({ targets: ln, alpha: 0, duration: 220, onComplete: () => ln.destroy() });
        if (fx.bolt) {
          const strike = (x, y, d) => this.time.delayedCall(d, () => {
            const b = this.add.image(x, y + 30, 'bolt-big').setOrigin(0.5, 1).setDepth(y + 200).setScale(0.6);
            this.tweens.add({ targets: b, alpha: 0, duration: 350, delay: 100, onComplete: () => b.destroy() });
            this.burst(x, y, 8, 0xffd23f, 60);
          });
          strike(mx, my, 60);
          (fx.chain || []).forEach((id, i) => { const t = this.foePos(id); strike(t.x, t.mid, 160 + i * 90); });
          this.floatText(mx, my - 80, '引雷！', '#ffe08a', 22);
        }
      } else if (fx.skill === 'orb') {
        fly('fx-crystal', 260, 0x9b7be8, { scale: 0.32 });
      } else if (fx.skill === 'ray') {
        const beam = this.add.graphics().setDepth(2040);
        beam.lineStyle(9, 0x7be08f, 0.55); beam.lineBetween(who.x, who.y - 44, mx, my);
        beam.lineStyle(3, 0xffffff, 0.9); beam.lineBetween(who.x, who.y - 44, mx, my);
        this.tweens.add({ targets: beam, alpha: 0, duration: 260, onComplete: () => beam.destroy() });
        this.time.delayedCall(100, () => this.burst(mx, my, 6, 0x7be08f, 40));
      } else if (fx.skill === 'syringe') {
        // 拿針筒往前刺
        const dir = mx < who.x ? -1 : 1;
        const n = this.add.image(who.x + dir * 18, who.y - 36, 'fx-syringe').setDepth(2050).setFlipX(dir === -1);
        this.tweens.add({ targets: n, x: who.x + dir * 44, duration: 110, yoyo: true, hold: 120, onComplete: () => n.destroy() });
        this.time.delayedCall(110, () => this.floatText(mx, my - 40, '', '#ffffff', 22, 'sk-syringe'));
      } else if (fx.skill === 'punch') {
        this.time.delayedCall(70, () => { this.burst(mx, my, 8, 0xffb020, 50); this.floatText(mx, my - 40, '碰！', '#ffd23f', 22); });
        this.cameras.main.shake(90, 0.003);
      } else if (fx.skill === 'kick') {
        // 冰刀劃過的一道冰痕
        const dir = mx < who.x ? -1 : 1;
        const arc = this.add.graphics({ x: mx, y: my }).setDepth(2045);
        arc.lineStyle(8, 0xbfe6ff, 0.8); arc.beginPath(); arc.arc(0, 0, 34, dir > 0 ? -2.4 : -0.7, dir > 0 ? 0.6 : 2.4); arc.strokePath();
        arc.lineStyle(3, 0xffffff, 1); arc.beginPath(); arc.arc(0, 0, 34, dir > 0 ? -2.4 : -0.7, dir > 0 ? 0.6 : 2.4); arc.strokePath();
        this.tweens.add({ targets: arc, alpha: 0, scale: 1.3, duration: 320, onComplete: () => arc.destroy() });
      } else if (fx.skill === 'summon') {
        ring(70, 0x7be08f);
      } else if (fx.skill === 'prophecy') {
        const c = this.add.image(who.x, who.y - 90, 'fx-crystal').setDepth(2050).setScale(0.3);
        this.tweens.add({ targets: c, scale: 1, y: who.y - 150, duration: 400, ease: 'Back.out' });
        this.tweens.add({ targets: c, alpha: 0, delay: 1100, duration: 400, onComplete: () => c.destroy() });
        ring(sk.teamDef.r, 0x9b7be8);
        // 一道紫光射向颱風
        const beam = this.add.graphics().setDepth(2040);
        beam.lineStyle(10, 0x9b7be8, 0.7); beam.lineBetween(who.x, who.y - 140, mx, my);
        beam.lineStyle(4, 0xffffff, 0.9); beam.lineBetween(who.x, who.y - 140, mx, my);
        this.tweens.add({ targets: beam, alpha: 0, delay: 300, duration: 500, onComplete: () => beam.destroy() });
        this.floatText(mx, my - 80, '被削弱了！', '#d9c4ff', 22);
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
        // 先蓄力：頭上亮起光環、愛心往身上聚集；再射出一支拖著愛心的聖光箭，打中時炸出一顆大愛心
        const dir = mx < who.x ? -1 : 1;
        who.body_.setFlipX(dir === -1);
        const halo = this.add.graphics({ x: who.x, y: who.y - 118 }).setDepth(2045);
        halo.lineStyle(5, 0xffe27a, 0.95); halo.strokeEllipse(0, 0, 44, 14);
        halo.lineStyle(2, 0xffffff, 0.9); halo.strokeEllipse(0, 0, 44, 14);
        this.tweens.add({ targets: halo, scaleX: { from: 0.2, to: 1 }, scaleY: { from: 0.2, to: 1 }, duration: 220, ease: 'Back.out' });
        this.tweens.add({ targets: halo, alpha: 0, delay: 520, duration: 400, onComplete: () => halo.destroy() });
        const glow = this.add.graphics({ x: who.x, y: who.y - 40 }).setDepth(2040);
        glow.fillStyle(0xffd6e6, 0.45); glow.fillCircle(0, 0, 46);
        glow.fillStyle(0xfff4c9, 0.55); glow.fillCircle(0, 0, 26);
        this.tweens.add({ targets: glow, scale: { from: 0.3, to: 1.1 }, alpha: { from: 1, to: 0 }, duration: 420, onComplete: () => glow.destroy() });
        for (let i = 0; i < 6; i++) {
          const a0 = (i / 6) * Math.PI * 2;
          const h = this.add.image(who.x + Math.cos(a0) * 70, who.y - 40 + Math.sin(a0) * 50, 'fx-heart')
            .setTint(i % 2 ? 0xff8fb8 : 0xffd23f).setScale(0.5).setDepth(2046);
          this.tweens.add({ targets: h, x: who.x, y: who.y - 40, scale: 0.15, alpha: { from: 1, to: 0.2 }, duration: 240, ease: 'Quad.in', onComplete: () => h.destroy() });
        }
        this.tweens.add({ targets: who.body_, x: -dir * 6, duration: 120, yoyo: true, delay: 140 });
        this.time.delayedCall(260, () => {
          const sx = who.x + dir * 18, sy = who.y - 44;
          const ang = Math.atan2(my - sy, mx - sx);
          const a = this.add.image(sx, sy, 'fx-holyarrow').setDepth(2050).setRotation(ang).setScale(0.62);
          // 箭後面拖一道粉紅色的光
          const trail = this.add.graphics().setDepth(2048);
          let last = 0;
          this.tweens.add({ targets: a, x: mx, y: my, duration: 260, ease: 'Quad.in',
            onUpdate: (tw) => {
              trail.clear();
              trail.lineStyle(10, 0xff8fb8, 0.35); trail.lineBetween(sx, sy, a.x, a.y);
              trail.lineStyle(4, 0xfff4c9, 0.8); trail.lineBetween(sx + (a.x - sx) * 0.4, sy + (a.y - sy) * 0.4, a.x, a.y);
              // 沿路掉下愛心和亮晶晶
              if (tw.progress - last < 0.12) return;
              last = tw.progress;
              const h = this.add.image(a.x, a.y, Math.random() < 0.6 ? 'fx-heart' : 'fx-star')
                .setTint(Math.random() < 0.5 ? 0xff8fb8 : 0xfff0a0).setScale(0.35).setDepth(2049);
              this.tweens.add({ targets: h, y: h.y - 16 - Math.random() * 16, x: h.x + (Math.random() - 0.5) * 20, scale: 0.1, alpha: 0,
                duration: 500, onComplete: () => h.destroy() });
            },
            onComplete: () => {
              a.destroy();
              this.tweens.add({ targets: trail, alpha: 0, duration: 300, onComplete: () => trail.destroy() });
              const big = this.add.image(mx, my, 'fx-heart').setTint(0xff6b9a).setDepth(2055).setScale(0.4);
              this.tweens.add({ targets: big, scale: 2.6, alpha: { from: 1, to: 0 }, duration: 520, ease: 'Quad.out', onComplete: () => big.destroy() });
              for (let i = 0; i < 10; i++) {
                const a1 = (i / 10) * Math.PI * 2;
                const h = this.add.image(mx, my, 'fx-heart').setTint(i % 2 ? 0xff8fb8 : 0xffffff).setScale(0.45).setDepth(2054);
                this.tweens.add({ targets: h, x: mx + Math.cos(a1) * 90, y: my + Math.sin(a1) * 60, angle: (Math.random() - 0.5) * 60,
                  scale: 0.15, alpha: 0, duration: 650, ease: 'Quad.out', onComplete: () => h.destroy() });
              }
              this.burst(mx, my, 10, 0xffe27a, 70);
            } });
        });
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
        // 本人先藏起來，替身在自己身邊溜一大圈（就是技能範圍），沿路留下冰晶
        const ghost = this.add.image(who.x, who.y, who.texKey).setScale(0.5).setOrigin(0.5, AV_ORIGIN_Y).setDepth(3000);
        who.body_.setAlpha(0);
        const cx = who.x, cy = who.y, R = sk.aoe || foe.r;
        const ice = this.add.graphics({ x: cx, y: cy }).setDepth(-4);
        ice.fillStyle(0xbfe6ff, 0.28); ice.fillEllipse(0, 0, R * 2, R * 1.1);
        ice.lineStyle(3, 0x9fd8ff, 0.8); ice.strokeEllipse(0, 0, R * 2, R * 1.1);
        this.tweens.add({ targets: ice, alpha: 0, delay: 900, duration: 600, onComplete: () => ice.destroy() });
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
            (fx.hits || [fx.target]).forEach(t => {
              const f = this.foePos(t);
              this.burst(f.x, f.mid, 14, 0xbfe6ff, 120);
              this.floatText(f.x, f.y - (f.mob ? 120 : 220), '冰凍！', '#bfe6ff', 26);
              this.refreshFoeTint(t);
            });
          } });
      } else if (fx.skill === 'sandbag') {
        // 自己身邊疊起一圈沙包牆
        ring(sk.teamDef.r, 0xc9a26b);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2, x = who.x + Math.cos(a) * 64, y = who.y + Math.sin(a) * 30;
          const g = this.add.graphics({ x, y: y - 120 }).setDepth(y + 1);
          g.fillStyle(0xc9a26b, 1); g.fillRoundedRect(-14, -9, 28, 18, 7);
          g.lineStyle(2.5, 0x2b2a33, 1); g.strokeRoundedRect(-14, -9, 28, 18, 7);
          g.lineStyle(2, 0x8a6a3f, 1); g.lineBetween(-6, -3, 6, -3);
          this.tweens.add({ targets: g, y, delay: i * 60, duration: 260, ease: 'Bounce.out' });
          this.tweens.add({ targets: g, alpha: 0, delay: 1600 + i * 30, duration: 400, onComplete: () => g.destroy() });
        }
        fx.targets.forEach(id => {
          const t = me && id === me.id ? this.me : this.remotes.get(id);
          if (t) this.floatText(t.x, t.y - 100, '防禦↑', '#ffe2b0', 18);
        });
      } else if (fx.skill === 'forecast') {
        // 天上出現一顆太陽，灑下陽光
        const sun = this.add.image(who.x, who.y - 170, 'fx-star').setTint(0xffd23f).setDepth(2050).setScale(0.2);
        this.tweens.add({ targets: sun, scale: 1.4, angle: 180, duration: 600, ease: 'Back.out' });
        this.tweens.add({ targets: sun, alpha: 0, delay: 1200, duration: 400, onComplete: () => sun.destroy() });
        ring(sk.heal.r, 0xffd23f);
        fx.targets.forEach(id => {
          const t = me && id === me.id ? this.me : this.remotes.get(id);
          if (!t) return;
          const beam = this.add.graphics().setDepth(2040);
          beam.lineStyle(14, 0xfff0a0, 0.45); beam.lineBetween(who.x, who.y - 170, t.x, t.y - 40);
          this.tweens.add({ targets: beam, alpha: 0, delay: 300, duration: 500, onComplete: () => beam.destroy() });
          this.burst(t.x, t.y - 40, 8, 0xffd23f, 50);
        });
        this.floatText(who.x, who.y - 210, '放晴！', '#fff0a0', 22);
      } else if (fx.skill === 'defib') {
        // 電擊器碰一下，黃色閃電劈到怪物身上
        const dir = mx < who.x ? -1 : 1;
        who.body_.setFlipX(dir === -1);
        this.lunge(who, mx);
        const bolt = this.add.graphics().setDepth(2045);
        const pts = [[who.x + dir * 20, who.y - 44]];
        for (let i = 1; i < 6; i++) pts.push([who.x + dir * 20 + (mx - who.x - dir * 20) * i / 6 + (Math.random() - 0.5) * 10, who.y - 44 + (my - who.y + 44) * i / 6 + (Math.random() - 0.5) * 26]);
        pts.push([mx, my]);
        [[10, 0xffd23f, 0.5], [4, 0xffffff, 1]].forEach(([w, c, a]) => {
          bolt.lineStyle(w, c, a); bolt.beginPath(); bolt.moveTo(pts[0][0], pts[0][1]); pts.forEach(q => bolt.lineTo(q[0], q[1])); bolt.strokePath();
        });
        this.tweens.add({ targets: bolt, alpha: 0, duration: 300, onComplete: () => bolt.destroy() });
        this.time.delayedCall(120, () => {
          this.burst(mx, my, 12, 0xffd23f, 70);
          this.floatText(mx, my - 50, '電擊！', '#ffd23f', 24);
          this.refreshFoeTint(fx.target);
        });
        this.cameras.main.shake(120, 0.005);
      } else if (fx.skill === 'arrowRain' || fx.skill === 'mothership') {
        const rain = fx.skill === 'arrowRain', R = sk.aoeAt;
        const area = this.add.graphics({ x: mx, y: foe.y }).setDepth(-4);
        area.fillStyle(rain ? 0xff8fb8 : 0x7be08f, 0.22); area.fillEllipse(0, 0, R * 2, R * 1.1);
        area.lineStyle(3, rain ? 0xff8fb8 : 0x7be08f, 0.8); area.strokeEllipse(0, 0, R * 2, R * 1.1);
        this.tweens.add({ targets: area, alpha: 0, delay: 900, duration: 500, onComplete: () => area.destroy() });
        if (rain) {
          // 弓往天上射，一片箭雨落在範圍裡
          for (let i = 0; i < 16; i++) {
            const tx = mx + (Math.random() - 0.5) * R * 1.8, ty = foe.y + (Math.random() - 0.5) * R * 0.9;
            const a = this.add.image(tx - 40, ty - 360, 'fx-arrow').setDepth(2050).setScale(0.6).setRotation(Math.atan2(360, 40));
            this.tweens.add({ targets: a, x: tx, y: ty, delay: 150 + i * 25, duration: 320, ease: 'Quad.in',
              onComplete: () => { a.destroy(); this.burst(tx, ty, 3, 0xff8fb8, 25); } });
          }
        } else {
          // 頭上飛來一台幽浮，往下照一道綠光
          const ufo = this.add.graphics({ x: mx - 200, y: my - 220 }).setDepth(2055);
          ufo.fillStyle(0x9fe8c0, 0.9); ufo.fillEllipse(0, -10, 40, 30);
          ufo.fillStyle(0x8a5cd6, 1); ufo.fillEllipse(0, 0, 110, 30);
          ufo.lineStyle(3, 0x2b2a33, 1); ufo.strokeEllipse(0, 0, 110, 30); ufo.strokeEllipse(0, -10, 40, 30);
          [-36, -12, 12, 36].forEach(x => { ufo.fillStyle(0xffd23f, 1); ufo.fillCircle(x, 4, 4); });
          this.tweens.add({ targets: ufo, x: mx, duration: 420, ease: 'Quad.out', onComplete: () => {
            const beam = this.add.graphics().setDepth(2040);
            beam.fillStyle(0x7be08f, 0.35);
            beam.fillTriangle(mx - 30, my - 210, mx + 30, my - 210, mx + R, foe.y);
            beam.fillTriangle(mx - 30, my - 210, mx - R, foe.y, mx + R, foe.y);
            this.tweens.add({ targets: beam, alpha: 0, delay: 300, duration: 400, onComplete: () => beam.destroy() });
            this.tweens.add({ targets: ufo, x: mx + 260, y: my - 300, alpha: 0, delay: 500, duration: 500, onComplete: () => ufo.destroy() });
          } });
        }
        this.time.delayedCall(rain ? 600 : 560, () => (fx.hits || [fx.target]).forEach(t => {
          const f = this.foePos(t);
          this.burst(f.x, f.mid, 8, rain ? 0xff8fb8 : 0x7be08f, 60);
          if (!rain) { this.floatText(f.x, f.y - (f.mob ? 110 : 200), '被削弱了！', '#b8f5cf', 20); this.refreshFoeTint(t); }
        }));
      } else if (fx.skill === 'note') {
        // 飆高音：音符一跳一跳飛過去
        fly('fx-note', 280, 0x8a5cd6, { scale: 0.9 });
      } else if (fx.skill === 'paint') {
        // 甩一坨顏料，打中潑一片
        const colors = [0xff6a13, 0x4f7cc2, 0xe8384f, 0x3f9f5a, 0xffd23f, 0x8a5cd6], c = colors[Math.floor(Math.random() * colors.length)];
        const sx = who.x + (mx < who.x ? -14 : 14), sy = who.y - 44;
        const b = this.add.image(sx, sy, 'fx-paint').setTint(c).setDepth(2050).setScale(0.6);
        this.tweens.add({ targets: b, x: mx, y: my, angle: 360, duration: 260, ease: 'Quad.in', onComplete: () => {
          b.destroy();
          const sp = this.add.image(mx, my, 'fx-paint').setTint(c).setDepth(2050).setScale(0.6);
          this.tweens.add({ targets: sp, scale: 1.8, alpha: 0, duration: 420, ease: 'Quad.out', onComplete: () => sp.destroy() });
          this.burst(mx, my, 8, c, 50);
        } });
      } else if (fx.skill === 'noteBlade') {
        // 先唱出一圈音符，音符一顆顆變成小刀，連續射向目標
        const dir = mx < who.x ? -1 : 1;
        who.body_.setFlipX(dir === -1);
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.55, ox = who.x + Math.cos(a) * 58, oy = who.y - 60 + Math.sin(a) * 40;
          const n = this.add.image(who.x, who.y - 50, 'fx-note').setDepth(2050).setScale(0.3);
          this.tweens.add({ targets: n, x: ox, y: oy, scale: 0.9, duration: 220, delay: i * 50, ease: 'Back.out', onComplete: () => {
            // 音符一閃變成刀
            this.burst(ox, oy, 4, 0xb9a3ec, 24);
            n.destroy();
            const k = this.add.image(ox, oy, 'fx-blade').setDepth(2052).setScale(0.75).setRotation(Math.atan2(my - oy, mx - ox));
            this.time.delayedCall(140 + i * 70, () => {
              this.tweens.add({ targets: k, x: mx + (Math.random() - 0.5) * 30, y: my + (Math.random() - 0.5) * 30, duration: 170, ease: 'Quad.in', onComplete: () => {
                k.destroy();
                const slash = this.add.graphics({ x: mx, y: my }).setDepth(2055).setRotation(Math.random() * Math.PI);
                slash.lineStyle(6, 0xb9a3ec, 0.9); slash.lineBetween(-36, 0, 36, 0);
                slash.lineStyle(2, 0xffffff, 1); slash.lineBetween(-36, 0, 36, 0);
                this.tweens.add({ targets: slash, scaleX: 1.6, alpha: 0, duration: 220, onComplete: () => slash.destroy() });
                if (i === 4) this.floatText(mx, my - 60, '刷刷刷！', '#d9c4ff', 26);
              } });
            });
          } });
        }
      } else if (fx.skill === 'anthem') {
        // 靈魂之歌：腳下一圈紫金色的光，音符從每個被加持的人身上飄起來
        ring(sk.teamAtk.r, 0xb98cff);
        const mic = this.add.text(who.x, who.y - 100, '🎤', { fontSize: '30px' }).setOrigin(0.5).setDepth(2055);
        this.tweens.add({ targets: mic, y: who.y - 140, angle: { from: -15, to: 15 }, duration: 500, yoyo: true, onComplete: () => mic.destroy() });
        fx.targets.forEach(id => {
          const t = me && id === me.id ? this.me : this.remotes.get(id);
          if (!t) return;
          for (let i = 0; i < 4; i++) {
            const n = this.add.image(t.x + (Math.random() - 0.5) * 40, t.y - 30, 'fx-note').setDepth(2050).setScale(0.6)
              .setTint(i % 2 ? 0xffd23f : 0xffffff);
            this.tweens.add({ targets: n, y: t.y - 110 - Math.random() * 40, x: n.x + (Math.random() - 0.5) * 50, alpha: 0, angle: (Math.random() - 0.5) * 60,
              delay: i * 120, duration: 900, onComplete: () => n.destroy() });
          }
          this.floatText(t.x, t.y - 120, '攻擊 +30%', '#ffd23f', 18);
        });
      } else if (fx.skill === 'roar') {
        // 霸王怒吼：先蹲低蓄力，頭上冒出一顆金色獅子頭，接著一圈圈衝擊波＋放射狀的風壓線往外炸，怪全部被震飛
        const dir = mx < who.x ? -1 : 1;
        this.tweens.add({ targets: who.body_, scaleY: 0.42, duration: 140, yoyo: true });
        const lion = this.add.text(who.x, who.y - 90, '🦁', { fontSize: '40px' }).setOrigin(0.5).setDepth(2058).setScale(0.3);
        this.tweens.add({ targets: lion, scale: 2.2, y: who.y - 150, duration: 320, ease: 'Back.out' });
        this.tweens.add({ targets: lion, scale: 3, alpha: 0, delay: 650, duration: 300, onComplete: () => lion.destroy() });
        const aura = this.add.graphics({ x: who.x, y: who.y - 40 }).setDepth(2040);
        aura.fillStyle(0xffd23f, 0.35); aura.fillCircle(0, 0, 60); aura.fillStyle(0xfff4c9, 0.5); aura.fillCircle(0, 0, 32);
        this.tweens.add({ targets: aura, scale: { from: 0.3, to: 1.6 }, alpha: { from: 1, to: 0 }, duration: 500, onComplete: () => aura.destroy() });
        this.time.delayedCall(180, () => {
          this.floatText(who.x, who.y - 190, '吼～～！！', '#ffd23f', 40);
          this.cameras.main.shake(420, 0.016);
          this.cameras.main.flash(160, 255, 210, 120);
          // 三圈衝擊波：外圈金色、中圈橘色、內圈白色
          [[0, 0xffd23f, 10], [110, 0xff9a3c, 7], [220, 0xffffff, 4]].forEach(([d, color, w]) => this.time.delayedCall(d, () => {
            const g = this.add.graphics({ x: who.x, y: who.y - 20 }).setDepth(2045);
            g.lineStyle(w, color, 0.95); g.strokeEllipse(0, 0, sk.aoe * 2, sk.aoe * 1.3);
            g.lineStyle(w * 2.5, color, 0.25); g.strokeEllipse(0, 0, sk.aoe * 2, sk.aoe * 1.3);
            this.tweens.add({ targets: g, scale: { from: 0.15, to: 1.25 }, alpha: { from: 1, to: 0 }, duration: 620, ease: 'Cubic.out', onComplete: () => g.destroy() });
          }));
          ring(sk.aoe, 0xff9a3c);
          // 放射狀的風壓線
          const lines = this.add.graphics({ x: who.x, y: who.y - 30 }).setDepth(2044);
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2 + Math.random() * 0.2, r0 = 40 + Math.random() * 20, r1 = sk.aoe * (0.8 + Math.random() * 0.4);
            lines.lineStyle(i % 2 ? 3 : 5, i % 3 ? 0xffffff : 0xffd23f, 0.9);
            lines.lineBetween(Math.cos(a) * r0, Math.sin(a) * r0 * 0.65, Math.cos(a) * r1, Math.sin(a) * r1 * 0.65);
          }
          this.tweens.add({ targets: lines, scale: { from: 0.4, to: 1.3 }, alpha: { from: 1, to: 0 }, duration: 450, ease: 'Quad.out', onComplete: () => lines.destroy() });
          // 腳下噴出一圈塵土
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            const dust = this.add.graphics({ x: who.x, y: who.y }).setDepth(who.y + 2);
            dust.fillStyle(0xd8c7a8, 0.8); dust.fillCircle(0, 0, 8 + Math.random() * 6);
            this.tweens.add({ targets: dust, x: who.x + Math.cos(a) * 110, y: who.y + Math.sin(a) * 50, scale: 2, alpha: 0, duration: 550, ease: 'Quad.out', onComplete: () => dust.destroy() });
          }
          // 被震飛的怪：往外滑出去、轉一圈，冒出「震飛！」
          (fx.knock || []).forEach(([id, x, y]) => {
            const t = id === 'boss' ? this.monster : this.mobs.get(id);
            if (!t) return;
            t.tx = x; t.ty = y;
            this.tweens.add({ targets: t, x, y, duration: 380, ease: 'Cubic.out' });
            const body = id === 'boss' ? null : t.body_;
            if (body) this.tweens.add({ targets: body, angle: (x < who.x ? -1 : 1) * 360, duration: 420, onComplete: () => body.setAngle(0) });
            this.floatText(x, y - (id === 'boss' ? 200 : 110), '震飛！', '#ff9a3c', 24);
            this.burst(x, y - 30, 10, 0xffd23f, 70);
          });
        });
        who.dir = dir;
      } else if (fx.skill === 'icicle') {
        // 頭頂先出現陰影，一根大冰錐從天上插下來，旁邊再掉兩根小的，砸中後地上結冰
        const gy = foe.y, big = foe.mob ? 1 : 1.6;
        const shadow = this.add.graphics({ x: mx, y: gy }).setDepth(-4);
        shadow.fillStyle(0x2f5f8f, 0.35); shadow.fillEllipse(0, 0, 70 * big, 26 * big);
        shadow.setScale(0.2);
        this.tweens.add({ targets: shadow, scale: 1, duration: 330, ease: 'Quad.in' });
        [[0, 0, 1.3], [-36, 90, 0.6], [32, 150, 0.55]].forEach(([dx, delay, sc], i) => {
          const tipY = gy - (i ? 6 : 24 * big);
          const ic = this.add.image(mx + dx, tipY - 460, 'fx-icicle').setOrigin(0.5, 1).setScale(sc * big).setDepth(2050);
          this.tweens.add({ targets: ic, y: tipY, delay, duration: 330, ease: 'Quad.in', onComplete: () => {
            this.burst(mx + dx, tipY - 10, i ? 6 : 16, i ? 0xffffff : 0xbfe6ff, i ? 40 : 100);
            if (!i) {
              this.cameras.main.shake(140, 0.006);
              shadow.destroy();
              const frost = this.add.graphics({ x: mx, y: gy }).setDepth(-4);
              frost.fillStyle(0xbfe6ff, 0.7); frost.fillEllipse(0, 0, 120 * big, 44 * big);
              frost.lineStyle(3, 0x4f7cc2, 0.8); frost.strokeEllipse(0, 0, 120 * big, 44 * big);
              this.tweens.add({ targets: frost, alpha: 0, delay: (sk.freeze || 1500) - 400, duration: 400, onComplete: () => frost.destroy() });
              this.floatText(mx, my - 50, '凍住了！', '#bfe6ff', 24);
              this.refreshFoeTint(fx.target);
            }
            // 插在地上一下再碎掉
            this.tweens.add({ targets: ic, alpha: 0, scaleX: sc * big * 1.4, delay: i ? 150 : 350, duration: 250, onComplete: () => ic.destroy() });
          } });
        });
      }
    }

    // 慶祝煙火：火箭往上衝，炸開後火花飛到文字的位置，停一下再掉下來
    launchFirework(f) {
      if (fxOff()) return;
      const who = me && f.id === me.id ? this.me : this.remotes.get(f.id);
      const x = who ? who.x : f.x, y0 = who ? who.y - 60 : f.y - 60, y1 = y0 - 190;
      const palette = [0xff6a13, 0xffb020, 0x4f7cc2, 0xe8384f, 0x3f9f5a, 0x8a5cd6];
      const main = palette[Math.floor(Math.random() * palette.length)];
      const rocket = { x, y: y0 };
      this.tweens.add({ targets: rocket, y: y1, duration: 700, ease: 'Quad.out',
        onUpdate: () => this.sparks.push({ x: rocket.x + (Math.random() - 0.5) * 4, y: rocket.y, vx: 0, vy: 30,
          color: 0xffd23f, size: 3, born: performance.now(), life: 400, mode: 'fade' }),
        onComplete: () => {
          const { pts, w } = textPoints(f.text, 700);
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
      const now = performance.now();
      const live = [];
      this.sparks.forEach(p => {
        const age = now - p.born;
        if (age >= p.life) { if (p.bob) { p.bob.setVisible(false); this.sparkPool.push(p.bob); } return; }
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
        if (!p.bob) {
          const frame = 'c' + Math.max(0, SPARK_COLORS.indexOf(p.color));
          p.bob = this.sparkPool.pop();
          if (p.bob) p.bob.reset(p.x - 8, p.y - 8, frame);
          else p.bob = this.fw.create(p.x - 8, p.y - 8, frame);
        }
        p.bob.x = p.x - 8; p.bob.y = p.y - 8; p.bob.setAlpha(alpha);
        live.push(p);
      });
      this.sparks = live;
    }

    // ---------- 物資箱 ----------
    onCrateHit(c) {
      if (fxOff()) return;
      const img = this.add.image((c.tx + 0.5) * T, (c.ty + 0.5) * T, 'crate').setDepth((c.ty + 1) * T - 1);
      this.tweens.add({ targets: img, angle: { from: -10, to: 10 }, duration: 60, yoyo: true, repeat: 1,
        onComplete: () => img.destroy() });
      const who = me && c.id === me.id ? this.me : this.remotes.get(c.id);
      if (who) this.lunge(who, (c.tx + 0.5) * T);
      this.floatText((c.tx + 0.5) * T, c.ty * T, '咚！', '#3a3a3c', 18);
    }

    onItemGot(g) {
      if (fxOff()) return;
      const who = me && g.id === me.id ? this.me : this.remotes.get(g.id);
      const it = MAP.ITEMS[g.item];
      if (who && it) this.floatText(who.x, who.y - 110, '', '#ffffff', 34, 'item-' + g.item);
    }

    // 世界座標 (x, y) 上可以互動的東西，夠近才算
    actionAt(x, y) {
      const reach = Math.max(130, ST.SKILLS[basic()].range);
      if (this.mState.alive && this.monster.visible && Math.hypot(x - this.monster.x, y - (this.monster.y - 70)) < 110 &&
        ST.foeGap(this.me, this.monster, true) < reach) return { type: 'attack', target: 'boss' };
      for (const m of this.mobs.values()) {
        if (m.state.alive && Math.hypot(x - m.x, y - (m.y - 40)) < 50 && ST.foeGap(this.me, m, false) < reach) {
          return { type: 'attack', target: m.state.id };
        }
      }
      const bi = this.inDg() ? this.blockAt(x, y) : -1;
      if (bi >= 0) {
        const [bx, by] = this.blockPos[bi], ddx = (bx + 0.5) * T - this.me.x, ddy = (by + 0.5) * T - (this.me.y - 4);
        if (Math.hypot(ddx, ddy) < 1.5 * T) {
          const hz = Math.abs(ddx) >= Math.abs(ddy);
          return { type: 'push', dx: hz ? Math.sign(ddx) : 0, dy: hz ? 0 : Math.sign(ddy) };
        }
      }
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (MAP.crateAt(tx, ty) >= 0 && Math.hypot(this.me.x - (tx + 0.5) * T, this.me.y - (ty + 0.5) * T) < 1.7 * T) {
        return { type: 'crate', tx, ty };
      }
      if (MAP.tiles[ty] && MAP.tiles[ty][tx] === 'G' && MAP.nearStove(this.me.x, this.me.y, 1.8 * T)) return { type: 'cook' };
      if (Math.hypot(x - MAP.mentor.x, y - (MAP.mentor.y - 20)) < 50 && MAP.nearMentor(this.me.x, this.me.y)) return { type: 'mentor' };
      if (Math.hypot(x - MAP.guard.x, y - (MAP.guard.y - 20)) < 50 && MAP.nearGuard(this.me.x, this.me.y)) return { type: 'guard' };
      if (Math.hypot(x - MAP.elevator.x, y - (MAP.elevator.y - 20)) < 50 && MAP.nearElevator(this.me.x, this.me.y)) return { type: 'elevator' };
      if (Math.hypot(x - MAP.greek.x, y - (MAP.greek.y - 20)) < 50 && MAP.nearGreek(this.me.x, this.me.y)) return { type: 'greek' };
      if (Math.hypot(x - MAP.fridge.x, y - (MAP.fridge.y - 10)) < 40 && MAP.nearFridge(this.me.x, this.me.y)) return { type: 'fridge' };
      if (MAP.tiles[ty] && MAP.tiles[ty][tx] === 'J' && MAP.nearDj(this.me.x, this.me.y)) return { type: 'dj' };
      if (MAP.tiles[ty] && MAP.tiles[ty][tx] === 'L' && MAP.nearWell(this.me.x, this.me.y)) return { type: 'well' };
      return null;
    }

    isDead() { return !!(myStats && myStats.dead); }

    // 提示紙條掛在哪裡（世界座標）：top＝放上面時尖角的位置，y／half＝放旁邊時的高度和東西的半寬
    hintAnchor(act) {
      if (act.type === 'mentor' || act.type === 'guard' || act.type === 'elevator') {
        const n = MAP[act.type], ny = n.y + 18;
        return { x: n.x, top: ny - (act.type === 'mentor' ? 106 : 110), y: ny - 38, half: 30 };
      }
      if (act.type === 'dj') return { x: MAP.dj.x, top: MAP.dj.y - 52, y: MAP.dj.y - 4, half: 50 };
      // 電視牆很長，紙條掛在自己正上方的那一段
      if (act.type === 'tv') return { x: Phaser.Math.Clamp(this.me.x, 23.5 * T, 32.5 * T), top: 4 * T + 6, y: 4.5 * T, half: T / 2 };
      if (act.type === 'greek') { const ny = MAP.greek.y + 18; return { x: MAP.greek.x, top: ny - 110, y: ny - 38, half: 30 }; }
      if (act.type === 'well') return { x: MAP.well.x, top: MAP.well.y - 60, y: MAP.well.y, half: 44 };
      let tx = act.tx, ty = act.ty;
      if (act.type === 'cook') {
        const cx = Math.floor(this.me.x / T), cy = Math.floor(this.me.y / T);
        let bd = Infinity;
        for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) {
          if (!MAP.tiles[y] || MAP.tiles[y][x] !== 'G') continue;
          const d = Math.hypot(this.me.x - (x + 0.5) * T, this.me.y - (y + 0.5) * T);
          if (d < bd) { bd = d; tx = x; ty = y; }
        }
      }
      return { x: (tx + 0.5) * T, top: ty * T - 2, y: (ty + 0.5) * T, half: T / 2 };
    }

    // 上面、右邊、左邊依序試，挑第一個不會被畫面邊緣或介面（狀態欄、背包按鈕…）擋住的位置
    placeHint(a, touch) {
      const cam = this.cameras.main, rect = this.game.canvas.getBoundingClientRect();
      const blocks = ['banner', 'stats', 'inventory', 'boss', 'notice-bar', 'dg-panel', 'music', 'skillbar', 'chat']
        .map(id => $(id) && $(id).getBoundingClientRect()).filter(k => k && k.width > 0);
      const sc = 0.5 / cam.zoom;
      const tries = [['down', a.x, a.top, 0.5, 1], ['left', a.x + a.half, a.y, 0, 0.5], ['right', a.x - a.half, a.y, 1, 0.5]];
      for (let i = 0; i < tries.length; i++) {
        const [tail, x, y, ox, oy] = tries[i], tex = 'hint-' + this.hintAct.type + (touch ? '-t' : '') + '-' + tail;
        if (!this.textures.exists(tex)) this.textures.addCanvas(tex, drawHint(this.hintAct.type, touch, tail));
        const src = this.textures.get(tex).getSourceImage(), w = src.width * sc, h = src.height * sc;
        // 換成螢幕座標，上下多留一點給飄動
        const l = rect.left + (x - w * ox - cam.worldView.x) * cam.zoom, t = rect.top + (y - h * oy - 6 - cam.worldView.y) * cam.zoom;
        const r = l + w * cam.zoom, b = t + (h + 8) * cam.zoom;
        const ok = l >= rect.left + 4 && r <= rect.right - 4 && t >= rect.top + 4 && b <= rect.bottom - 4 &&
          !blocks.some(k => l < k.right && r > k.left && t < k.bottom && b > k.top);
        if (ok || i === tries.length - 1) return { tail, tex, x, y, ox, oy };
      }
    }

    updateHint(act, time) {
      const key = act ? act.type + (act.tx != null ? act.tx + ',' + act.ty : '') : '';
      const touch = matchMedia('(pointer: coarse)').matches;
      if (key !== this.hintKey) {
        this.hintKey = key;
        this.hintAct = act;
        this.hintAt = act ? this.hintAnchor(act) : null;
        this.hintPlace = null;
        this.hintBorn = time;
      }
      if (!act) { if (this.hint) { this.hint.destroy(); this.hint = null; } return; }
      // 鏡頭會動、介面會開關，所以每 0.3 秒重新挑一次位置
      if (!this.hintPlace || time - (this.hintCheck || 0) > 300) {
        this.hintCheck = time;
        const pl = this.placeHint(this.hintAt, touch);
        if (!this.hint || !this.hintPlace || pl.tex !== this.hintPlace.tex) {
          if (this.hint) this.hint.destroy();
          this.hint = this.add.image(pl.x, pl.y, pl.tex).setOrigin(pl.ox, pl.oy).setDepth(1e6);
        }
        this.hintPlace = pl;
      }
      // 跟著鏡頭縮放維持一樣大；剛出現時從小彈出來，之後輕輕飄
      const z = 0.5 / this.cameras.main.zoom, k = Math.min(1, (time - this.hintBorn) / 160);
      const pl = this.hintPlace, wob = Math.sin(time / 320) * 3;
      this.hint.setScale(z * (0.6 + 0.4 * Phaser.Math.Easing.Back.Out(k)));
      if (pl.tail === 'down') this.hint.setPosition(pl.x, pl.y - 3 - wob);
      else this.hint.setPosition(pl.x + (pl.tail === 'left' ? 4 + wob : -4 - wob), pl.y);
    }

    // 自己身邊可以互動的東西（給頭上的提示紙條和空白鍵用）
    nearbyAction() {
      if (!this.me) return null;
      const foe = this.nearestFoe(Math.max(130, ST.SKILLS[basic()].range));
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
      if (!best && MAP.nearGuard(this.me.x, this.me.y)) return { type: 'guard' };
      if (!best && MAP.nearElevator(this.me.x, this.me.y)) return { type: 'elevator' };
      if (!best && MAP.nearDj(this.me.x, this.me.y)) return { type: 'dj' };
      if (!best && MAP.nearTv(this.me.x, this.me.y)) return { type: 'tv' };
      if (!best && MAP.nearGreek(this.me.x, this.me.y)) return { type: 'greek' };
      if (!best && MAP.nearWell(this.me.x, this.me.y)) return { type: 'well' };
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
        this.castSkill(act.skill || basic(), act.target);
      } else if (act.type === 'push') {
        this.tryPush(act.dx, act.dy);
      } else if (act.type === 'mentor') {
        openMentor();
      } else if (act.type === 'guard' || act.type === 'elevator') {
        socket.emit('dgGo', (res) => {
          if (res && res.ok) toast(act.type === 'guard' ? '守門員：「去吧！到候位區按出發。」' : '電梯小姐：「直達觀景台，請到候位區按出發。」');
          else if (res && res.error) toast(res.error);
        });
      } else if (act.type === 'fridge') {
        openFridge();
      } else if (act.type === 'dj') {
        MUSIC.open();
      } else if (act.type === 'tv') {
        openWarRoom();
      } else if (act.type === 'well') {
        WISH.open();
      } else if (act.type === 'greek') {
        toast(`希臘少女：「${GREEK_LINES[Math.floor(Math.random() * GREEK_LINES.length)]}」`);
        WISH.open();
      } else if (act.type === 'cook') {
        socket.emit('cook', (res) => {
          if (!res || !res.ok) { if (res && res.error) toast(res.error); return; }
          renderInventory(res.inv);
        });
      } else {
        if (this.emptyCrates.has(act.tx + ',' + act.ty)) { toast('這箱被拿光了，等一下會補貨'); return; }
        socket.emit('hitCrate', { tx: act.tx, ty: act.ty }, (res) => {
          if (res && res.full) { toast('背包滿了，先用掉一些再來敲'); return; }
          if (!res || !res.item) return;
          renderInventory(res.inv);
          const it = MAP.ITEMS[res.item];
          toast(`獲得 ${it.name}！`, 'item-' + res.item);
        });
      }
    }

    // 技能按鈕、K 鍵、技能視窗的「使用」都走這裡
    useSkill(id) {
      if (!this.me || this.isDead()) return;
      const sk = ST.SKILLS[id];
      if (sk.wall) return this.startWall(id);
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

    // ---------- 插畫結界師的城牆 ----------
    // 按技能進入畫線模式，在地上拖曳畫一條線，放開就變成城牆；再按一次技能取消
    startWall(id) {
      const sk = ST.SKILLS[id];
      if (this.drawing) { const same = this.drawing.id === id; this.cancelWall(); if (same) { toast('取消畫城牆'); return; } }
      const left = (cooldowns[id] || 0) - performance.now();
      if (left > 0) { toast(`${sk.name}還在冷卻，${Math.ceil(left / 1000)} 秒後可以再用`); return; }
      if (myStats && myStats.mp < sk.mp) { toast(`魔力不夠，${sk.name}要 ${sk.mp} 點`); return; }
      const room = MAP.roomAt(this.me.x, this.me.y);
      if (!room || (room.id !== 'front' && !room.dungeon)) { toast('要在 颱風前線或副本裡才能畫城牆'); return; }
      this.target = null;
      this.drawing = { id, pts: [], len: 0, max: sk.wall.len, g: this.add.graphics().setDepth(2060),
        timer: this.time.delayedCall(10000, () => { if (this.drawing) { this.cancelWall(); toast('太久沒畫，取消畫城牆'); } }) };
      toast(`在地上拖曳畫線，放開就變成${sk.name}`);
    }
    extendWall(x, y) {
      const d = this.drawing, [lx, ly] = d.pts[d.pts.length - 1], seg = Math.hypot(x - lx, y - ly);
      if (seg < 10 || d.len >= d.max) return;
      const k = Math.min(1, (d.max - d.len) / seg);
      d.pts.push([lx + (x - lx) * k, ly + (y - ly) * k]);
      d.len += seg * k;
      this.drawPreview();
      if (d.len >= d.max) this.finishWall();
    }
    drawPreview() {
      const d = this.drawing, g = d.g, fire = ST.SKILLS[d.id].wall.kind === 'fire';
      g.clear();
      if (d.pts.length < 2) { g.fillStyle(fire ? 0xff6a13 : 0x7fc4f0, 0.8); g.fillCircle(d.pts[0][0], d.pts[0][1], 6); return; }
      g.lineStyle(14, fire ? 0xff6a13 : 0x7fc4f0, 0.35); g.strokePoints(d.pts.map(([x, y]) => ({ x, y })));
      g.lineStyle(4, 0xffffff, 0.9); g.strokePoints(d.pts.map(([x, y]) => ({ x, y })));
      // 用掉多少長度：線的最後面標一個百分比
      const [ex, ey] = d.pts[d.pts.length - 1];
      g.fillStyle(0x131a28, 0.85); g.fillRoundedRect(ex + 10, ey - 30, 50, 20, 8);
      if (!d.label) d.label = this.add.text(0, 0, '', { fontSize: '12px', fontStyle: 'bold', color: '#ffffff', fontFamily: FONT }).setOrigin(0.5).setDepth(2061);
      d.label.setPosition(ex + 35, ey - 20).setText(Math.round(100 * d.len / d.max) + '%');
    }
    finishWall() {
      const d = this.drawing;
      const pts = d.pts.map(([x, y]) => [Math.round(x), Math.round(y)]);
      this.cancelWall();
      if (pts.length < 2 || d.len < 40) { toast('線太短了，再按一次技能重畫'); return; }
      this.castSkill(d.id, { pts });
    }
    cancelWall() {
      const d = this.drawing;
      if (!d) return;
      d.g.destroy(); if (d.label) d.label.destroy(); d.timer.remove();
      this.drawing = null;
    }
    // 城牆：沿著線排火焰或冰晶，時間快到了會閃爍再消失
    onWall(w) {
      if (this.walls.has(w.id)) return;
      const fire = w.kind === 'fire', pts = w.pts.map(([x, y]) => ({ x, y }));
      const g = this.add.graphics().setDepth(-3);
      g.lineStyle(26, fire ? 0xff6a13 : 0x7fc4f0, 0.28); g.strokePoints(pts);
      g.lineStyle(10, fire ? 0xffb020 : 0xbfe6ff, 0.75); g.strokePoints(pts);
      g.lineStyle(3, 0xffffff, 0.9); g.strokePoints(pts);
      const deco = [];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 28));
        for (let j = 0; j < n; j++) {
          const x = a.x + (b.x - a.x) * (j / n), y = a.y + (b.y - a.y) * (j / n);
          const img = this.add.image(x, y + 4, fire ? 'fx-flame' : 'fx-ice').setOrigin(0.5, 1).setDepth(y + 1)
            .setScale(fire ? 0.9 + Math.random() * 0.4 : 0.55 + Math.random() * 0.25);
          if (!fire) img.setAngle((Math.random() - 0.5) * 16);
          img.setScale(img.scaleX, 0.05);
          this.tweens.add({ targets: img, scaleY: fire ? img.scaleX : img.scaleX, duration: 260, delay: (deco.length % 30) * 18, ease: 'Back.out' });
          if (fire) this.tweens.add({ targets: img, scaleY: { from: img.scaleX * 0.8, to: img.scaleX * 1.15 }, duration: 260 + Math.random() * 200,
            yoyo: true, repeat: -1, delay: 300 + Math.random() * 200 });
          deco.push(img);
        }
      }
      const wall = { g, deco };
      this.walls.set(w.id, wall);
      this.burst(pts[0].x, pts[0].y - 10, 10, fire ? 0xff6a13 : 0xbfe6ff, 60);
      // 最後 2 秒一閃一閃
      wall.blink = this.time.delayedCall(Math.max(0, (w.ms || 10000) - 2000), () => {
        this.tweens.add({ targets: [g, ...deco], alpha: 0.35, duration: 220, yoyo: true, repeat: 4 });
      });
    }
    onWallGone(id, now) {
      const w = this.walls.get(id);
      if (!w) return;
      this.walls.delete(id);
      w.blink.remove();
      const all = [w.g, ...w.deco];
      if (now || fxOff()) { all.forEach(o => o.destroy()); return; }
      all.forEach(o => this.tweens.killTweensOf(o));
      this.tweens.add({ targets: all, alpha: 0, duration: 350, onComplete: () => all.forEach(o => o.destroy()) });
    }
    // 冰火合擊的雷暴圈：地上一個圈，圈裡落雷、兩個龍捲風亂轉
    // 畫面跑不動（每秒不到 35 張）時只留淡淡的圈和小閃電
    stormLite() { return this.game.loop.actualFps < 35; }
    onStorm(st) {
      if (this.storms.has(st.id)) return;
      const lite = this.stormLite();
      const g = this.add.graphics({ x: st.x, y: st.y }).setDepth(-3);
      g.fillStyle(0x5b5f8a, lite ? 0.12 : 0.2); g.fillEllipse(0, 0, st.r * 2, st.r * 1.4);
      g.lineStyle(6, 0xffd23f, lite ? 0.3 : 0.5); g.strokeEllipse(0, 0, st.r * 2, st.r * 1.4);
      g.lineStyle(2, 0x2b2a33, lite ? 0.3 : 0.6); g.strokeEllipse(0, 0, st.r * 2 + 6, st.r * 1.4 + 5);
      const tw = lite ? [] : (st.tw || []).map(([x, y], i) => {
        const img = this.add.image(x, y, 'fx-twister').setOrigin(0.5, 1).setDepth(y).setScale(1.25);
        this.tweens.add({ targets: img, scaleX: { from: 1.05, to: 1.4 }, duration: 180 + i * 40, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: img, angle: { from: -6, to: 6 }, duration: 300, yoyo: true, repeat: -1 });
        return { img, tx: x, ty: y };
      });
      const storm = { g, tw, x: st.x, y: st.y, r: st.r, lite };
      this.storms.set(st.id, storm);
      g.setScale(0.2);
      this.tweens.add({ targets: g, scale: 1, duration: 400, ease: 'Back.out' });
      storm.blink = this.time.delayedCall(Math.max(0, (st.ms || 10000) - 2000), () => {
        this.tweens.add({ targets: [g, ...tw.map(t => t.img)], alpha: 0.35, duration: 220, yoyo: true, repeat: 4 });
      });
    }
    moveStorms(list) {
      list.forEach(([id, ...xy]) => {
        const st = this.storms.get(id);
        if (st) st.tw.forEach((t, i) => { t.tx = xy[i * 2]; t.ty = xy[i * 2 + 1]; });
      });
    }
    // 每幀把龍捲風往 server 給的位置滑過去
    updateStorms(dt) {
      const k = Math.min(1, dt * 10);
      this.storms.forEach(st => st.tw.forEach(t => {
        t.img.x += (t.tx - t.img.x) * k; t.img.y += (t.ty - t.img.y) * k; t.img.setDepth(t.img.y);
      }));
    }
    onStormBolt(b) {
      const st = this.storms.get(b.id);
      if (!st) return;
      // 圈裡的怪全部電暈：身體變黃、抖個不停
      const until = performance.now() + (b.ms || 600);
      (b.foes || []).forEach(id => { const m = this.mobs.get(id); if (m) { m.shockUntil = until; this.refreshFoeTint(id); } });
      if (b.boss) { this.shockUntil = until; this.applyMonsterTint(); }
      if (fxOff()) return;
      if (!st.lite) {
        // 整圈閃一下黃光，被電到的怪身上冒電花
        const fl = this.add.graphics({ x: st.x, y: st.y }).setDepth(-2.8);
        fl.fillStyle(0xffe14d, 0.3); fl.fillEllipse(0, 0, st.r * 2, st.r * 1.4);
        this.tweens.add({ targets: fl, alpha: 0, duration: 320, onComplete: () => fl.destroy() });
        const sparkAt = (x, y, k) => [-1, 1].forEach(dx => {
          const sp = this.add.image(x + dx * 26 * k + (Math.random() - 0.5) * 10, y - (50 + Math.random() * 40) * k, 'bolt')
            .setDepth(y + 150).setScale(0.6 * k).setAngle(dx * 20);
          this.tweens.add({ targets: sp, alpha: { from: 1, to: 0.15 }, duration: 100, yoyo: true, repeat: 2, onComplete: () => sp.destroy() });
        });
        (b.foes || []).forEach(id => { const m = this.mobs.get(id); if (m && m.visible) sparkAt(m.x, m.y, m.k || 1); });
        if (b.boss && this.monster.visible) sparkAt(this.monster.x, this.monster.y, 2.2);
      }
      if (st.lite) {
        // 省電版：小閃電在圈裡閃兩下
        const s = this.add.image(b.x, b.y, 'bolt').setOrigin(0.5, 1).setDepth(b.y + 200).setScale(1.3);
        this.tweens.add({ targets: s, alpha: { from: 1, to: 0.1 }, duration: 90, yoyo: true, repeat: 1, onComplete: () => s.destroy() });
        return;
      }
      const bolt = this.add.image(b.x, b.y, 'bolt-big').setOrigin(0.5, 1).setScale(1.5, 4.5).setDepth(b.y + 200);
      this.tweens.add({ targets: bolt, alpha: { from: 1, to: 0 }, duration: 360, delay: 100, onComplete: () => bolt.destroy() });
      const scorch = this.add.graphics({ x: b.x, y: b.y }).setDepth(-2.5);
      scorch.fillStyle(0x2b2a33, 0.35); scorch.fillEllipse(0, 0, 90, 56);
      this.tweens.add({ targets: scorch, alpha: 0, delay: 300, duration: 700, onComplete: () => scorch.destroy() });
      this.burst(b.x, b.y - 20, 8, 0xffd23f, 60);
    }
    onStormGone(id, now) {
      const st = this.storms.get(id);
      if (!st) return;
      this.storms.delete(id);
      st.blink.remove();
      const all = [st.g, ...st.tw.map(t => t.img)];
      if (now || fxOff()) { all.forEach(o => o.destroy()); return; }
      all.forEach(o => this.tweens.killTweensOf(o));
      this.tweens.add({ targets: all, alpha: 0, duration: 350, onComplete: () => all.forEach(o => o.destroy()) });
    }

    // 射程內最近的敵人（颱風或小怪）
    nearestFoe(range) {
      let best = null, bd = range;
      if (this.mState.alive && this.monster.visible) {
        const d = Math.max(0, ST.foeGap(this.me, this.monster, true));
        if (d <= bd) { bd = d; best = { id: 'boss', name: ST.MONSTER.name }; }
      }
      this.mobs.forEach(m => {
        if (!m.state.alive) return;
        const d = Math.max(0, ST.foeGap(this.me, m, false));
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
      else if (now < (m.shockUntil || 0)) m.body_.setTint(0xfff07a);
      else if (now < m.weakUntil) m.body_.setTint(0xd9c4ff);
      else if (m.state.kind === 'fu' && m.state.phase === 2) m.body_.setTint(0xb8a4e8); // 黑化：整個人偏紫
      else if (m.state.kind === 'tianlong' && m.state.phase >= 2) m.body_.setTint(m.state.phase >= 3 ? 0xffb0a8 : 0xc4dcff); // 狂風偏藍、暴走偏紅
      else m.body_.clearTint();
    }

    // ---------- 野外小怪 ----------
    setMob(st) {
      let m = this.mobs.get(st.id);
      const def = ST.MOBS[st.kind];
      if (!m) {
        // 副本的怪有自己的大小（花蓮王比較大），血條、對話框跟著往上
        const sc = def.scale || 0.62, k = sc / 0.62;
        const body = this.add.image(0, 0, 'mob-' + st.kind).setScale(sc).setOrigin(0.5, 0.95);
        const tag = this.add.text(0, 10, `Lv.${def.level} ${def.name}`, {
          fontSize: '10px', fontStyle: 'bold', color: '#b84300', fontFamily: FONT,
          backgroundColor: PAPER, padding: { x: 9, y: 4 },
        }).setOrigin(0.5, 0);
        const bar = this.add.graphics();
        const ice = this.add.image(0, 4, 'fx-ice').setOrigin(0.5, 1).setScale(1.2 * k, 0.9 * k).setVisible(false);
        m = this.add.container(st.x, st.y, [body, ice, bar, tag]);
        m.body_ = body; m.bar = bar; m.ice = ice; m.k = k; m.tag = tag;
        m.tx = st.x; m.ty = st.y;
        this.mobs.set(st.id, m);
      }
      const was = m.state;
      m.state = st;
      const now = performance.now();
      if (def.boss) this.updateFuLook(m, was);
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
      const w = 54 * Math.sqrt(m.k || 1), ratio = m.state.maxHp ? m.state.hp / m.state.maxHp : 0, y = ST.MOBS[m.state.kind].barY || -104 * (m.k || 1);
      m.bar.clear();
      m.bar.fillStyle(0x131a28, 0.9); m.bar.fillRoundedRect(-w / 2 - 2, y, w + 4, 8, 4);
      m.bar.fillStyle(0xff3b3b, 1); m.bar.fillRoundedRect(-w / 2, y + 2, Math.max(3, w * ratio), 4, 2);
      if (ST.MOBS[m.state.kind].boss && this.bossFor === m.state.kind) this.drawFuBar(m);
    }

    moveMobs(list) {
      list.forEach(([id, x, y]) => {
        const m = this.mobs.get(id);
        if (!m) return;
        if (x !== m.tx && !(m.state && ST.MOBS[m.state.kind].noFlip)) m.body_.setFlipX(x < m.tx);
        m.tx = x; m.ty = y;
      });
    }

    onMobHit(h) {
      const delay = HIT_DELAY[h.skill] || 0;
      const show = () => {
        const m = this.mobs.get(h.mid);
        if (!m) return;
        m.state.hp = Math.min(m.state.hp, h.hp);
        this.drawMobBar(m);
        if (fxOff()) return;
        const who = this.actorOf(h.id);
        if (who && (MELEE.includes(h.skill) || h.skill === 'pet')) this.lunge(who, m.x);
        m.body_.setTintFill(0xffffff);
        this.time.delayedCall(80, () => this.refreshFoeTint(h.mid));
        this.tweens.add({ targets: m.body_, x: (who && m.x < who.x ? -8 : 8), duration: 70, yoyo: true });
        this.damageNumber(h.dmg, h.crit, { x: m.x, y: m.y - 100 });
      };
      if (delay && !fxOff()) this.time.delayedCall(delay, show); else show();
    }

    onMobAttack(a) {
      if (fxOff()) return;
      const m = this.mobs.get(a.mid);
      const who = this.actorOf(a.id);
      if (!m || !who) return;
      // 往目標撲一下，頭上冒出台詞
      const dir = who.x < m.x ? -1 : 1;
      this.tweens.add({ targets: m.body_, x: dir * 16, angle: dir * 10, duration: 150, yoyo: true, delay: 250 });
      if (m.say) m.say.destroy();
      m.say = this.bubbleImg(0, -104 * (m.k || 1), a.say);
      m.add(m.say);
      const say = m.say;
      this.time.delayedCall(1600, () => { if (m.say === say) { say.destroy(); m.say = null; } });
      this.time.delayedCall(450, () => this.burst(who.x, who.y - 40, 6, 0xff6a13, 40));
    }

    // ---------- 召喚物 ----------
    onSummon(st) {
      if (this.summons.has(st.id)) return;
      const def = ST.SUMMONS[st.kind];
      const body = this.add.image(0, 0, 'cr-' + st.kind).setScale(0.62).setOrigin(0.5, 76 / 80);
      const tag = this.add.text(0, 8, `${st.ownerName}的${def.name}`, {
        fontSize: '10px', fontStyle: 'bold', color: '#2f7a45', fontFamily: FONT,
        backgroundColor: PAPER, padding: { x: 8, y: 3 },
      }).setOrigin(0.5, 0);
      const bar = this.add.graphics();
      const c = this.add.container(st.x, st.y, [body, bar, tag]);
      c.body_ = body; c.bar = bar; c.summon_ = true; c.state = st;
      c.tx = st.x; c.ty = st.y; c.dir = 1; c.phase = Math.random() * 6;
      this.summons.set(st.id, c);
      this.drawSummonBar(c);
      if (fxOff()) return;
      c.setScale(0.1);
      this.tweens.add({ targets: c, scale: 1, duration: 450, ease: 'Back.out' });
      this.burst(st.x, st.y - 30, 12, 0x7be08f, 70);
    }
    drawSummonBar(c) {
      const w = 40, ratio = c.state.maxHp ? c.state.hp / c.state.maxHp : 0;
      c.bar.clear();
      c.bar.fillStyle(0x131a28, 0.85); c.bar.fillRoundedRect(-w / 2 - 2, -56, w + 4, 7, 3);
      c.bar.fillStyle(0x7be08f, 1); c.bar.fillRoundedRect(-w / 2, -54.5, Math.max(2, w * ratio), 4, 2);
    }
    moveSummons(list) {
      list.forEach(([id, x, y]) => {
        const c = this.summons.get(id);
        if (!c) return;
        if (Math.abs(x - c.tx) > 1) c.body_.setFlipX(x > c.tx);
        c.tx = x; c.ty = y;
        if (Math.hypot(x - c.x, y - c.y) > 300) { c.x = x; c.y = y; } // 跟著主人瞬移到下一關：直接出現，不滑過整張地圖
      });
    }
    onSummonHurt(h) {
      const c = this.summons.get(h.id);
      if (!c) return;
      c.state.hp = h.hp;
      this.drawSummonBar(c);
      if (fxOff()) return;
      c.body_.setTintFill(0xffffff);
      this.time.delayedCall(90, () => c.body_ && c.body_.clearTint());
      this.floatText(c.x, c.y - 56, '-' + h.dmg, '#ff6a13', 18);
    }
    onSummonGone(g) {
      const c = this.summons.get(g.id);
      if (!c) return;
      this.summons.delete(g.id);
      if (fxOff()) { c.destroy(); return; }
      this.tweens.add({ targets: c, alpha: 0, angle: g.dead ? 90 : 0, y: c.y - 20, duration: 500, onComplete: () => c.destroy() });
      if (g.dead) this.burst(c.x, c.y - 20, 8, 0x9aa3b5, 50);
    }

    // ---------- 家具 ----------
    setDecor(d) {
      const old = this.decor.get(d.key);
      if (old) { old.destroy(); this.decor.delete(d.key); }
      if (d.removed || !DC.DECOR[d.k]) return;
      const [tx, ty] = d.key.split(',').map(Number);
      const img = this.add.image((tx + 0.5) * T, (ty + 1) * T, 'dc-' + d.k).setScale(0.5).setOrigin(0.5, 60 / 64);
      img.setDepth(DC.DECOR[d.k].flat ? -8 : (ty + 1) * T - 6);
      img.k = d.k; img.by = d.by;
      this.decor.set(d.key, img);
      if (old === undefined && this.me) this.tweens.add({ targets: img, scale: { from: 0.2, to: 0.5 }, duration: 300, ease: 'Back.out' });
    }
    // 自己旁邊、自己擺的家具
    nearbyDecor() {
      if (!this.me || !me) return [];
      return [...this.decor.entries()].filter(([key, img]) => {
        const [tx, ty] = key.split(',').map(Number);
        return img.by === me.name && Math.hypot(this.me.x - (tx + 0.5) * T, this.me.y - (ty + 0.5) * T) < 2.6 * T;
      }).map(([key, img]) => ({ key, k: img.k }));
    }

    onLevelUp(l) {
      const who = me && l.id === me.id ? this.me : this.remotes.get(l.id);
      if (!who) return;
      if (!fxOff()) {
        this.burst(who.x, who.y - 50, 16, 0xffd23f, 90);
        const t = this.add.text(who.x, who.y - 120, `LEVEL UP! Lv.${l.level}`, {
          fontSize: '24px', fontStyle: '900', fontFamily: '"Space Mono", ' + FONT, color: '#ffd23f', stroke: '#5a2a00', strokeThickness: 6,
        }).setOrigin(0.5).setDepth(2100);
        this.tweens.add({ targets: t, y: who.y - 170, alpha: { from: 1, to: 0 }, delay: 600, duration: 900, onComplete: () => t.destroy() });
      }
      if (who === this.me) {
        toast(l.level === ST.LEVEL.fireworkLv ? `升到 Lv.${l.level}！可以放慶祝煙火了 ` : `升到 Lv.${l.level}！`);
        if (l.level === ST.LEVEL.fireworkLv && modalKind === 'firework') openFirework();
      }
    }

    castSkill(id, target) {
      const sk = ST.SKILLS[id];
      const left = (cooldowns[id] || 0) - performance.now();
      if (left > 0) { if (!sk.basic) toast(`${sk.name}還在冷卻，${Math.ceil(left / 1000)} 秒後可以再用`); return; }
      if (myStats && myStats.mp < sk.mp) { toast(`魔力不夠，${sk.name}要 ${sk.mp} 點，喝礦泉水可以補`); return; }
      socket.emit('attack', id, target || 'boss', (res) => {
        if (res && res.ok) cooldowns[id] = performance.now() + sk.cooldown;
        else if (res && res.error) toast(res.error);
      });
    }

    lunge(who, towardX) {
      const dir = towardX < who.x ? -1 : 1;
      who.dir = dir; who.body_.setFlipX(who.summon_ ? dir === 1 : dir === -1);
      this.tweens.add({ targets: who.body_, x: dir * 10, angle: dir * 12, duration: 70, yoyo: true });
    }

    // iconKey：文字左邊放一個手繪 icon；只有 icon 沒有字也可以
    floatText(x, y, text, color, size, iconKey) {
      text = plain(text);
      const parts = [];
      const t = text ? this.add.text(0, 0, text, {
        fontSize: size + 'px', fontStyle: 'bold', color, fontFamily: FONT,
        stroke: '#131a28', strokeThickness: 4,
      }).setOrigin(0.5) : null;
      const tex = iconKey && this.iconTexture(iconKey);
      if (tex) {
        const s = Math.round(size * 1.5), img = this.add.image(0, 0, tex).setDisplaySize(s, s);
        if (t) { img.x = -t.width / 2 - 2; t.x = s / 2 + 2; }
        parts.push(img);
      }
      if (t) parts.push(t);
      if (!parts.length) return;
      const box = this.add.container(x, y, parts).setDepth(2000);
      this.tweens.add({ targets: box, y: y - 40, alpha: 0, duration: 900, onComplete: () => box.destroy() });
    }
    // 手繪 icon 轉成 Phaser 貼圖（第一次用到才畫）
    iconTexture(key) {
      const tex = 'icon-' + key;
      if (this.textures.exists(tex)) return tex;
      const cv = window.HQ_ICONS && HQ_ICONS.canvas(key);
      if (!cv) return null;
      this.textures.addCanvas(tex, cv);
      return tex;
    }

    // ---------- 副本 ----------
    initDungeon() {
      const D = MAP.DUNGEONS.hualien, TP = MAP.DUNGEONS.taipei;
      this.dgs = {};
      this.bossFor = 'typhoon';
      // 副本入口的漩渦（一直轉）＋招牌
      this.portals = MAP.DG_LIST.map(d => {
        const pt = d.portal;
        this.add.text(pt.x, pt.y - 58, d.portalName, { fontSize: '11px', fontStyle: '900', color: '#8a5a10', fontFamily: FONT,
          backgroundColor: PAPER, padding: { x: 11, y: 5 } }).setOrigin(0.5).setDepth(pt.y + 60);
        return this.add.image(pt.x, pt.y + 6, 'typhoon').setScale(0.34, 0.14).setTint(d.id === 'taipei' ? 0x7fd1c8 : 0xffb020).setDepth(pt.y - 20);
      });
      // 七星潭的石頭：每顆一個顏色，踩對會亮起來
      this.stoneImgs = D.stones.map((st, i) => {
        const g = this.add.graphics({ x: st.x, y: st.y }).setDepth(-7);
        const glow = this.add.graphics({ x: st.x, y: st.y }).setDepth(-7.5).setVisible(false);
        glow.fillStyle(0xffd23f, 0.45); glow.fillEllipse(0, 0, 70, 40);
        const col = Phaser.Display.Color.HexStringToColor(st.color).color;
        g.fillStyle(0x131a28, 0.18); g.fillEllipse(3, 5, 46, 26);
        g.fillStyle(col, 1); g.fillEllipse(0, 0, 44, 26);
        g.lineStyle(3, 0x2b2a33, 0.9); g.strokeEllipse(0, 0, 44, 26);
        g.fillStyle(0xffffff, 0.45); g.fillEllipse(-8, -5, 14, 6);
        return { g, glow };
      });
      this.steleG = this.add.graphics().setDepth(D.stele.y + 20);
      // 關卡之間的門（花蓮是石門、台北是電梯門）、九曲洞的大理石
      this.gateImgs = {};
      MAP.DG_LIST.forEach(d => {
        this.gateImgs[d.id] = d.gates.map(cells => cells.map(([x, y]) =>
          Object.assign(this.add.image((x + 0.5) * T, (y + 1) * T + 4, d.id === 'taipei' ? 'fx-tpgate' : 'dg-gate').setOrigin(0.5, 1).setScale(0.5).setDepth((y + 1) * T), { baseY: (y + 1) * T + 4 })));
        d.gates.forEach((g, i) => MAP.setGate(d, i, false));
      });
      this.blockImgs = D.blocks.map(([x, y]) => this.add.image((x + 0.5) * T, (y + 1) * T + 2, 'fx-marble').setOrigin(0.5, 1).setDepth((y + 1) * T));
      this.blockPos = D.blocks.map(b => b.slice());
      this.blockPos.forEach(([x, y]) => MAP.dyn.add(x + ',' + y));
      // 87 樓：四個控制台的燈、盪來盪去的阻尼球（球的鋼索每一格重畫）
      this.consoleG = TP.consoles.map(c => this.add.graphics({ x: c.x, y: c.y }).setDepth(c.y - 30));
      this.ballCable = this.add.graphics().setDepth(TP.ball.y - 60);
      this.ball = this.add.image((TP.ball.x1 + TP.ball.x2) / 2, TP.ball.y + 64, 'fx-damper').setOrigin(0.5, 0.95).setDepth(TP.ball.y + 64);
      this.ballPh = 0;
      this.drawConsoles();
      // 副本的面板按鈕
      $('dg-panel').addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) { $('dg-panel').classList.toggle('open'); return; }
        if (b.dataset.act === 'start') socket.emit('dgStart', (res) => { if (res && !res.ok && res.error) toast(res.error); });
        if (b.dataset.act === 'leave') socket.emit('dgLeave', () => {});
        if (b.dataset.act === 'home') socket.emit('dgHome', () => {});
        if (b.dataset.act === 'reset') socket.emit('dgReset', (res) => { if (res && !res.ok && res.error) toast(res.error); });
      });
    }
    // 自己參加中的副本（沒有就是 null）
    myDg() {
      if (!me) return null;
      for (const d of Object.values(this.dgs)) if (d.phase !== 'idle' && d.members.includes(me.id)) return d;
      return null;
    }
    inDg() { return !!this.myDg(); }
    // 自己現在站在哪個副本的區域（副本區或候位區）
    hereDg() { const D = this.me && MAP.dungeonAt(this.me.x); return D ? this.dgs[D.id] || null : null; }

    setDungeon(d) {
      if (Array.isArray(d)) { d.forEach(x => this.setDungeon(x)); return; }
      const first = !this.dgs[d.id], D = MAP.DUNGEONS[d.id];
      this.dgs[d.id] = d;
      d.at = performance.now();
      d.gates.forEach((open, i) => {
        MAP.setGate(D, i, open);
        this.gateImgs[d.id][i].forEach(img => {
          if (open && img.visible && !img.opening) {
            img.opening = true;
            if (first) { img.setVisible(false); return; }
            this.tweens.add({ targets: img, y: img.y + 30, alpha: 0, duration: 900, ease: 'Quad.in', onComplete: () => img.setVisible(false) });
            this.burst(img.x, img.y - 20, 8, 0x9aa3b5, 60);
          } else if (!open && (!img.visible || img.opening)) {
            this.tweens.killTweensOf(img);
            img.opening = false;
            img.setVisible(true).setAlpha(1).setY(img.baseY);
          }
        });
      });
      if (d.id === 'hualien') {
        d.blocks.forEach(([x, y], i) => this.placeBlock(i, x, y, true));
        this.drawStele();
      } else this.drawConsoles();
      if (this.hereDg() === d || this.myDg() === d) this.renderDgPanel(true);
    }

    placeBlock(i, x, y, instant) {
      const [ox, oy] = this.blockPos[i];
      if (ox === x && oy === y) return;
      MAP.dyn.delete(ox + ',' + oy);
      MAP.dyn.add(x + ',' + y);
      this.blockPos[i] = [x, y];
      const img = this.blockImgs[i], tx = (x + 0.5) * T, ty = (y + 1) * T + 2;
      this.tweens.killTweensOf(img);
      if (instant) img.setPosition(tx, ty);
      else this.tweens.add({ targets: img, x: tx, y: ty, duration: 180, ease: 'Quad.out' });
      img.setDepth(ty);
      // 推進凹槽：亮一下
      if (!instant && MAP.tiles[y][x] === 'x') { this.burst(tx, ty - 24, 10, 0xffb020, 60); this.floatText(tx, ty - 70, '喀！', '#ffd23f', 22); }
    }
    onBlock(e) {
      this.placeBlock(e.i, e.tx, e.ty, false);
      const img = this.blockImgs[e.i];
      this.burst(img.x, img.y - 6, 4, 0xc9ccd3, 30);
    }

    // 石碑上畫出要踩的顏色順序，已經踩對的打勾
    drawStele() {
      const g = this.steleG, d = this.dgs.hualien, D = MAP.DUNGEONS.hualien, S = D.stele;
      g.clear();
      this.stoneImgs.forEach(s => s.glow.setVisible(false));
      if (!d || !d.seq || !d.seq.length || d.phase === 'idle') return;
      const n = d.seq.length, gap = 15, x0 = S.x - (n - 1) * gap / 2, y = S.y;
      d.seq.forEach((si, k) => {
        const col = Phaser.Display.Color.HexStringToColor(D.stones[si].color).color, done = k < d.progress;
        g.fillStyle(col, 1); g.fillCircle(x0 + k * gap, y, 6);
        g.lineStyle(2, done ? 0xffd23f : 0x2b2a33, 1); g.strokeCircle(x0 + k * gap, y, done ? 7.5 : 6);
        if (done) this.stoneImgs[si].glow.setVisible(true);
      });
      if (d.stage > 0) { g.lineStyle(3, 0xffd23f, 1); g.strokeRoundedRect(S.x - n * gap / 2 - 6, y - 12, n * gap + 12, 24, 8); }
    }
    onStone(e) {
      const st = MAP.DUNGEONS.hualien.stones[e.i];
      if (this.dgs.hualien) this.dgs.hualien.progress = e.progress;
      this.drawStele();
      if (e.ok) {
        this.burst(st.x, st.y - 10, 10, Phaser.Display.Color.HexStringToColor(st.color).color, 60);
        this.floatText(st.x, st.y - 50, `${st.name} ✓`, '#ffd23f', 20);
        return;
      }
      // 踩錯：一道浪打上來
      const w = this.add.image(st.x, st.y - 120, 'fx-drop').setDepth(st.y + 100).setScale(2.4).setTint(0x7fb2e5);
      this.tweens.add({ targets: w, y: st.y - 10, duration: 220, ease: 'Quad.in', onComplete: () => {
        w.destroy();
        const sp = this.add.graphics({ x: st.x, y: st.y }).setDepth(-4);
        sp.fillStyle(0x7fb2e5, 0.7); sp.fillEllipse(0, 0, 140, 80); sp.lineStyle(3, 0xffffff, 0.9); sp.strokeEllipse(0, 0, 140, 80);
        this.tweens.add({ targets: sp, alpha: 0, scale: 1.4, duration: 800, onComplete: () => sp.destroy() });
        this.burst(st.x, st.y - 10, 12, 0xffffff, 80);
      } });
      this.floatText(st.x, st.y - 60, '踩錯了！', '#bfe6ff', 22);
      if (me && e.id === me.id) toast('踩錯顏色，被浪打回起點了！要從石碑上的第一顆重新踩');
    }

    // 87 樓的控制台：亮著的冒黃光，旁邊一圈倒數
    drawConsoles() {
      const d = this.dgs.taipei, now = performance.now();
      this.consoleG.forEach((g, i) => {
        g.clear();
        const left = !d || d.phase === 'idle' ? 0 : d.phase === 'run' && d.stage === 1 ? d.lit[i] - (now - d.at) : d.stage > 1 ? 1 : 0;
        if (left <= 0) { g.lineStyle(3, 0xe8384f, 0.7); g.strokeEllipse(0, 6, 56, 30); return; }
        g.fillStyle(0xffd23f, 0.35); g.fillEllipse(0, 6, 70, 38);
        g.lineStyle(4, 0xffd23f, 1); g.strokeEllipse(0, 6, 56, 30);
        if (d.stage === 1) {
          const k = Math.min(1, left / (d.litMs || 5000));
          g.lineStyle(5, 0x7be08f, 1); g.beginPath(); g.arc(0, -46, 12, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
        }
      });
    }
    // 阻尼球：伺服器給現在盪到哪裡，這邊自己接著算；過關後停在中間
    tickDamper(dt) {
      const d = this.dgs.taipei, B = MAP.DUNGEONS.taipei.ball, cx = (B.x1 + B.x2) / 2, A = (B.x2 - B.x1) / 2;
      let x = cx;
      if (d && d.ballPh != null && d.phase === 'run' && d.stage === 1) {
        const ph = d.ballPh + (performance.now() - d.at) / B.period;
        x = cx + A * Math.sin(ph * Math.PI * 2);
      }
      this.ball.setPosition(x, B.y + 64);
      const top = 14 * T + 4;
      this.ballCable.clear().lineStyle(3, 0x2b2a33, 0.8);
      [-30, 0, 30].forEach(k => this.ballCable.lineBetween(cx + k * 2, top, x + k, B.y - 50));
      if (d && d.phase === 'run' && d.stage === 1) this.drawConsoles();
    }
    onBallHit(e) {
      this.burst(e.x, e.y - 40, 14, 0xffc93c, 90);
      this.floatText(e.x, e.y - 100, '咚！', '#ffd23f', 26);
      if (me && e.id === me.id) { this.cameras.main.shake(300, 0.012); toast('被阻尼球撞飛了！看準球盪開的時候再過去'); }
    }

    onDgStage(e) {
      const d = this.myDg();
      if (!d || d.id !== e.id) return;
      this.cameras.main.shake(500, 0.006);
      const msg = {
        hualien: ['石門打開了！往下走到太魯閣九曲洞', '石門打開了！往下走到清水斷崖……小心'],
        taipei: ['電梯門開了！往下走到 87 樓，小心阻尼球', '阻尼球停了！電梯直達觀景台……天龍王就在上面'],
      }[e.id];
      toast(msg[Math.min(e.stage, 2) - 1]);
    }
    onDgClear(c) {
      const d = this.myDg();
      if (!d || d.id !== c.id) return;
      const mine = c.drops.find(x => me && x.id === me.id);
      for (let i = 0; i < 4; i++) this.time.delayedCall(i * 300, () => this.burst(this.me.x + (Math.random() - 0.5) * 200, this.me.y - 120 - Math.random() * 80, 16, [0xffd23f, 0xff8fab, 0x7fd1ff, 0x7be08f][i], 120));
      this.floatText(this.me.x, this.me.y - 150, '副本通關！', '#ffd23f', 30);
      if (!mine) return;
      const g = mine.item && GR.GEAR[mine.item];
      if (!g) toast('這次什麼都沒掉……下次再來挑戰！');
      else if (mine.dup) toast(`又是【${g.rarity}】${g.name}，換成 ${mine.exp || 600} 經驗`, 'gear-' + mine.item);
      else toast(`獲得武器【${g.rarity}】${g.name}！`, 'gear-' + mine.item);
      toast(`${Math.round(c.ms / 1000)} 秒後送回${MAP.DUNGEONS[c.id].lobbyName}`);
    }

    // 副本的面板：候位區按出發、副本裡看關卡和時間、離開
    renderDgPanel(force) {
      const box = $('dg-panel');
      const mine = this.myDg(), d = mine || (this.me && MAP.zoneOf(this.me.x) === 'lobby' ? this.hereDg() : null);
      if (!d || !this.me) { box.hidden = true; this.dgKey = null; return; }
      const sec = (ms) => { const t = Math.ceil(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
      const D = MAP.DUNGEONS[d.id], ago = performance.now() - d.at, last = D.stages.length - 1;
      let key, html;
      if (mine) {
        const st = D.stages[Math.min(d.stage, last)];
        const left = d.phase === 'clear' ? d.clearLeft - ago : d.timeLeft - ago;
        const what = d.phase === 'clear' ? `通關！${sec(Math.max(0, left))} 後回入口` : `第 ${Math.min(d.stage, last) + 1} 關 ${st.name} · ${sec(Math.max(0, left))}`;
        let extra = '';
        // 七星潭：面板上也畫出石碑的顏色順序（手機上石碑常常被上面的條擋住）
        if (d.id === 'hualien' && d.stage === 0 && d.phase === 'run') extra = '<span class="dg-seq">' + d.seq.map((si, k) =>
          `<i style="background:${D.stones[si].color}" class="${k < d.progress ? 'on' : ''}"></i>`).join('') + '</span>';
        // 信義廣場：第幾波；87 樓：四個控制台亮了幾個
        if (d.id === 'taipei' && d.phase === 'run' && d.stage === 0) extra = `<span class="dg-note">第 ${Math.max(1, d.wave)}／${d.waves} 波</span>`;
        if (d.id === 'taipei' && d.phase === 'run' && d.stage === 1) extra = '<span class="dg-seq">' + d.lit.map(t =>
          `<i style="background:${t > 0 ? '#ffd23f' : '#5b6577'}" class="${t > 0 ? 'on' : ''}"></i>`).join('') + '</span>';
        // 手機上縮成一顆計時膠囊（只有關卡和時間），點一下才展開按鈕
        const short = d.phase === 'clear' ? `通關 ${sec(Math.max(0, left))}` : `第 ${Math.min(d.stage, last) + 1} 關 ${sec(Math.max(0, left))}`;
        key = 'in|' + d.id + what + d.stage + '|' + d.progress + '|' + d.wave + '|' + (d.lit || []).map(t => t > 0 ? 1 : 0).join('');
        html = `<span class="dg-full">${D.name}副本 · ${what}</span><span class="dg-short">${short}</span>` + extra + '<span class="dg-btns">' +
          (d.id === 'hualien' && d.stage === 1 && d.phase === 'run' ? '<button class="hud-btn tiny" data-act="reset" type="button">重排大理石</button>' : '') +
          '<button class="hud-btn tiny" data-act="leave" type="button">離開</button></span>';
      } else {
        const homeBtn = '<button class="hud-btn tiny" data-act="home" type="button">回總部</button>';
        const lv = D.minLevel ? ` · Lv.${D.minLevel} 以上` : '';
        if (d.phase === 'idle') { key = 'idle' + d.id; html = `<span>${D.title} · 1～${d.max} 人 · 限時 ${D.timeLimitMs / 60000} 分${lv}</span><button class="primary" data-act="start" type="button">出發</button>` + homeBtn; }
        else if (d.phase === 'countdown') {
          const left = d.countdown - ago;
          key = 'cd' + d.id + Math.ceil(left / 1000);
          html = `<span>${Math.max(0, Math.ceil(left / 1000))} 秒後出發！站在候位區就會一起去</span>` + homeBtn;
        } else { key = 'busy' + d.id + d.members.length + d.stage; html = `<span>副本進行中：${d.members.length} 人，打到第 ${Math.min(d.stage, last) + 1} 關，等他們出來</span>` + homeBtn; }
      }
      box.hidden = false;
      box.classList.toggle('in', !!mine);
      if (key === this.dgKey && !force) return;
      this.dgKey = key;
      box.innerHTML = html;
    }

    // 九曲洞：往大理石的方向走（或點石頭）就會推
    tryPush(dx, dy) {
      const d = this.myDg();
      if (!d || d.id !== 'hualien' || d.stage !== 1 || MAP.stageAt(this.me.x, this.me.y) !== 1) return;
      const fx = Math.floor((this.me.x + dx * 26) / T), fy = Math.floor((this.me.y - 4 + dy * 26) / T);
      const i = this.blockPos.findIndex(([x, y]) => x === fx && y === fy);
      if (i < 0) return;
      const now = performance.now();
      if (now - (this.lastPush || 0) < 260) return;
      this.lastPush = now;
      socket.emit('move', { x: Math.round(this.me.x), y: Math.round(this.me.y), dir: this.me.dir, moving: false });
      socket.emit('dgPush', { i, dx, dy });
    }
    blockAt(x, y) {
      const d = this.myDg();
      if (!d || d.id !== 'hualien') return -1;
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      return this.blockPos.findIndex(([bx, by]) => bx === tx && (by === ty || by === ty + 1));
    }

    // ---------- 副本頭目（花蓮王、天龍王） ----------
    bossMob(kind) { for (const m of this.mobs.values()) if (m.state.kind === kind && m.state.alive) return m; return null; }
    fuMob() { return this.bossMob('fu'); }
    // 頭目現在是哪一個階段的名字
    bossLook(m) {
      const def = ST.MOBS[m.state.kind], ph = m.state.phase || 1;
      return ph >= 3 && def.phase3 ? def.phase3 : ph >= 2 && def.phase2 ? def.phase2 : def;
    }
    updateFuLook(m, was) {
      const kind = m.state.kind, ph = m.state.phase || 1, M = this.bossLook(m);
      const COL = kind === 'tianlong' ? [0, 0xffd23f, 0x7fb2e5, 0xff5a5a] : [0, 0x5b3f8f, 0x5b3f8f];
      m.tag.setText(`Lv.${M.level} ${M.name}`).setColor(ph >= 2 ? (kind === 'tianlong' ? (ph >= 3 ? '#b8282f' : '#2f5fa8') : '#5b3fa0') : '#b84300');
      if (!m.aura) {
        m.aura = this.add.graphics();
        m.addAt(m.aura, 0);
        this.tweens.add({ targets: m.aura, scaleX: 1.15, scaleY: 1.15, alpha: 0.6, duration: 800, yoyo: true, repeat: -1 });
      }
      m.aura.clear().fillStyle(COL[ph] || COL[1], 0.35).fillEllipse(0, 0, kind === 'tianlong' ? 190 : 150, 50);
      m.aura.setVisible(ph >= 2 || kind === 'tianlong');
      if (ph >= 2 && was && (was.phase || 1) < ph && m.visible) {
        const c1 = COL[ph] || 0x8a5cd6;
        this.cameras.main.shake(900, 0.008);
        for (let i = 0; i < 3; i++) this.time.delayedCall(i * 350, () => this.burst(m.x, m.y - 80, 16, i % 2 ? c1 : 0x2b2a33, 160));
        this.floatText(m.x, m.y - 190, kind === 'fu' ? `黑化成「${M.name}」了！` : `變成「${M.name}」了！`, kind === 'fu' ? '#d9c4ff' : '#ffe08a', 26);
        this.tweens.add({ targets: m.body_, angle: 360, duration: 1200, ease: 'Cubic.inOut', onComplete: () => m.body_.setAngle(0) });
      }
      if (this.bossFor === kind) this.refreshBossLabel();
    }
    refreshBossLabel() {
      const m = this.bossFor !== 'typhoon' ? this.bossMob(this.bossFor) : null;
      if (m) {
        const M = this.bossLook(m);
        document.querySelector('#boss .boss-lv').textContent = 'Lv.' + M.level;
        document.querySelector('#boss .boss-lv').nextSibling.textContent = ' ' + M.name + ' ';
        $('boss').classList.toggle('phase2', (m.state.phase || 1) >= 2);
        this.drawFuBar(m);
      } else if (this.bossFor === 'typhoon') {
        this.applyMonsterLook();
        this.drawMonsterBar();
      }
    }
    drawFuBar(m) {
      const ratio = m.state.maxHp ? m.state.hp / m.state.maxHp : 0;
      $('boss-fill').style.width = (ratio * 100) + '%';
      $('boss-pct').textContent = Math.ceil(ratio * 100) + '%';
    }
    // 出招預告：地上畫出紅色範圍，裡面的顏色慢慢填滿
    onFuAttack(a) {
      const m = this.mobs.get(a.mid);
      const tele = (g, draw) => {
        draw(g, 0xff3b3b, 0.16, 3);
        this.tweens.add({ targets: g, alpha: { from: 1, to: 0.55 }, duration: 160, yoyo: true, repeat: -1 });
        this.time.delayedCall(a.delay + 60, () => { this.tweens.killTweensOf(g); g.destroy(); });
      };
      const mine = (hit, msg) => { if (this.me && !this.isDead() && this.inDg() && hit(this.me)) toast(msg || '快離開紅色範圍！'); };
      const say = (text, col) => { if (m) this.floatText(m.x, m.y - (m.state.kind === 'fu' ? 200 : 230), text, col, 22); };
      const ellipse = (sp, r, fillCol) => {
        tele(this.add.graphics({ x: sp.x, y: sp.y }).setDepth(-5), (g, c, al, w) => { g.fillStyle(c, al); g.fillEllipse(0, 0, r * 2, r * 1.4); g.lineStyle(w, c, 0.9); g.strokeEllipse(0, 0, r * 2, r * 1.4); });
        const fill = this.add.graphics({ x: sp.x, y: sp.y }).setDepth(-5).setScale(0);
        fill.fillStyle(fillCol, 0.35); fill.fillEllipse(0, 0, r * 2, r * 1.4);
        this.tweens.add({ targets: fill, scale: 1, duration: a.delay, onComplete: () => fill.destroy() });
      };
      if (a.type === 'slash' || a.type === 'wave' || a.type === 'sweep' || a.type === 'bolt' || a.type === 'drop') {
        const spots = a.type === 'slash' ? [{ x: a.x, y: a.y }] : a.spots;
        const col = a.type === 'bolt' ? 0xffd23f : a.type === 'drop' ? 0xff8a3d : a.type === 'sweep' ? 0x5fb37a : 0x8a5cd6;
        spots.forEach(sp => ellipse(sp, a.r, col));
        if (a.type === 'drop') spots.forEach(sp => {
          // 招牌從天上掉下來
          const sign = this.add.image(sp.x, sp.y - 360, 'mob-sign').setScale(0.4).setOrigin(0.5, 0.95).setDepth(sp.y + 100).setAngle(-20);
          this.tweens.add({ targets: sign, y: sp.y, angle: 10, duration: a.delay, ease: 'Quad.in', onComplete: () => {
            this.burst(sp.x, sp.y - 20, 10, 0xe8384f, 70);
            this.tweens.add({ targets: sign, alpha: 0, duration: 300, delay: 200, onComplete: () => sign.destroy() });
          } });
        });
        else say(a.label || (a.type === 'slash' ? '黑暗劍氣！' : '劍氣波！'), a.type === 'bolt' ? '#ffe08a' : a.type === 'sweep' ? '#bfe6c8' : '#d9c4ff');
        if (a.type === 'drop' && a.label && spots.some(sp => this.me && Math.hypot(this.me.x - sp.x, this.me.y - sp.y) < 500)) this.floatText(spots[0].x, spots[0].y - 120, a.label, '#ffb020', 20);
        mine(p => spots.some(sp => Math.hypot(p.x - sp.x, p.y - sp.y) <= a.r));
      } else if (a.type === 'charge') {
        const ang = Math.atan2(a.y2 - a.y1, a.x2 - a.x1), len = Math.max(40, Math.hypot(a.x2 - a.x1, a.y2 - a.y1));
        const g = this.add.graphics({ x: a.x1, y: a.y1 }).setDepth(-5).setRotation(ang);
        tele(g, (gg, c, al, w) => { gg.fillStyle(c, al); gg.fillRect(0, -a.w / 2, len, a.w); gg.lineStyle(w, c, 0.9); gg.strokeRect(0, -a.w / 2, len, a.w); });
        const fill = this.add.graphics({ x: a.x1, y: a.y1 }).setDepth(-5).setRotation(ang).setScale(0, 1);
        fill.fillStyle(0xff8a3d, 0.35); fill.fillRect(0, -a.w / 2, len, a.w);
        this.tweens.add({ targets: fill, scaleX: 1, duration: a.delay, onComplete: () => fill.destroy() });
        if (m) {
          // 花蓮王舉起拳頭：衝鋒前的預告
          if (m.state.kind === 'fu') m.body_.setTexture('mob-fu-fist');
          m.body_.setFlipX(a.x2 < a.x1);
          this.tweens.add({ targets: m.body_, y: -8, duration: 200, yoyo: true, repeat: 1 });
          this.floatText(m.x, m.y - (m.state.kind === 'fu' ? 200 : 130), a.label || '衝鋒！', '#ffb020', 24);
        }
        const segD = (p) => {
          const dx = a.x2 - a.x1, dy = a.y2 - a.y1, l2 = dx * dx + dy * dy || 1;
          const k = Math.max(0, Math.min(1, ((p.x - a.x1) * dx + (p.y - a.y1) * dy) / l2));
          return Math.hypot(p.x - (a.x1 + dx * k), p.y - (a.y1 + dy * k));
        };
        mine(p => segD(p) <= a.w / 2);
      } else if (a.type === 'gust') {
        // 強風：一半的觀景台畫上紅色＋風的箭頭
        const R = a.rect, w = R.x2 - R.x1, h = R.y2 - R.y1;
        const g = this.add.graphics({ x: R.x1, y: R.y1 }).setDepth(-5);
        tele(g, (gg, c, al, lw) => { gg.fillStyle(c, al); gg.fillRect(0, 0, w, h); gg.lineStyle(lw, c, 0.9); gg.strokeRect(0, 0, w, h); });
        for (let i = 0; i < 6; i++) {
          const y = R.y1 + 60 + i * (h - 120) / 5, x0 = a.dir > 0 ? R.x1 + 40 : R.x2 - 40;
          const arrow = this.add.graphics({ x: x0, y }).setDepth(y + 50);
          arrow.lineStyle(6, 0xffffff, 0.85); arrow.lineBetween(0, 0, a.dir * 70, 0);
          arrow.lineBetween(a.dir * 70, 0, a.dir * 52, -14); arrow.lineBetween(a.dir * 70, 0, a.dir * 52, 14);
          this.tweens.add({ targets: arrow, x: x0 + a.dir * (w - 150), alpha: { from: 1, to: 0.2 }, duration: 900, repeat: Math.ceil(a.delay / 900), delay: i * 120, onComplete: () => arrow.destroy() });
        }
        say(a.label || '強風！', '#bfe6ff');
        mine(p => p.x >= R.x1 && p.x < R.x2 && p.y >= R.y1 && p.y < R.y2, a.dir > 0 ? '強風要把你吹下觀景台了！快跑到另一半！' : '強風要把你吹去撞牆！快跑到另一半！');
      } else if (a.type === 'share') {
        // 分攤：紅圈跟著那個人走
        const who = a.target === (me && me.id) ? this.me : this.remotes.get(a.target);
        if (!who) return;
        const g = this.add.graphics().setDepth(-5);
        const born = performance.now();
        const draw = () => {
          if (!g.active) return;
          const k = Math.min(1, (performance.now() - born) / a.delay);
          g.clear().setPosition(who.x, who.y);
          g.fillStyle(0xff3b3b, 0.14 + k * 0.18); g.fillEllipse(0, 0, a.r * 2, a.r * 1.4);
          g.lineStyle(4, 0xffd23f, 0.95); g.strokeEllipse(0, 0, a.r * 2, a.r * 1.4);
          g.lineStyle(6, 0xffd23f, 1); g.beginPath(); g.arc(0, -150, 16, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
        };
        const ev = this.time.addEvent({ delay: 30, loop: true, callback: draw });
        draw();
        this.time.delayedCall(a.delay + 60, () => { ev.remove(); g.destroy(); });
        say(a.label || '分攤！', '#ffe08a');
        if (who === this.me) toast(`你頭上有分攤圈！${a.total} 點傷害由圈裡的人平分，叫大家靠過來`);
        else if (this.inDg()) toast('有人頭上出現分攤圈！靠過去一起分擔傷害');
      } else if (a.type === 'storm') {
        // 天龍暴風：整個觀景台都是紅的，柱子後面畫出安全的影子
        const B = a.box, w = B.x2 - B.x1, h = B.y2 - B.y1;
        const g = this.add.graphics({ x: B.x1, y: B.y1 }).setDepth(-5);
        tele(g, (gg, c, al, lw) => { gg.fillStyle(c, al + 0.06); gg.fillRect(0, 0, w, h); gg.lineStyle(lw, c, 0.9); gg.strokeRect(0, 0, w, h); });
        const safe = this.add.graphics().setDepth(-4.5);
        a.pillars.forEach(c => {
          const py = c.y + 10, d = Math.max(1, Math.hypot(c.x - a.x, py - a.y)), ux = (c.x - a.x) / d, uy = (py - a.y) / d;
          safe.fillStyle(0x7be08f, 0.45); safe.lineStyle(3, 0x3f9f5a, 0.9);
          // 從柱子往外延伸一段的安全影子（跟伺服器判斷一樣：柱子後面 230 以內）
          const len = 220, half = 36, nx = -uy, ny = ux;
          const pts = [[c.x + nx * half, py + ny * half], [c.x + ux * len + nx * half, py + uy * len + ny * half],
            [c.x + ux * len - nx * half, py + uy * len - ny * half], [c.x - nx * half, py - ny * half]];
          safe.beginPath(); safe.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([x, y]) => safe.lineTo(x, y)); safe.closePath(); safe.fillPath(); safe.strokePath();
        });
        this.time.delayedCall(a.delay + 60, () => safe.destroy());
        say(a.label || '天龍暴風！', '#ff8f8f');
        if (this.inDg() && this.roomId === 't3') toast(`天龍暴風要來了！${Math.round(a.delay / 1000)} 秒內躲到柱子後面的綠色影子裡`);
      }
    }
    onFuAttackHit(a) {
      const m = this.mobs.get(a.mid);
      const near = this.me && this.inDg();
      if (a.type === 'charge') {
        if (m) {
          if (m.state.kind === 'fu') m.body_.setTexture('mob-fu');
          this.tweens.add({ targets: m, x: a.x2, y: a.y2, duration: 220, ease: 'Quad.in' });
          m.tx = a.x2; m.ty = a.y2;
          for (let i = 0; i < 5; i++) this.time.delayedCall(i * 40, () => this.burst(a.x1 + (a.x2 - a.x1) * i / 4, a.y1 + (a.y2 - a.y1) * i / 4, 4, 0x9aa3b5, 40));
        }
        if (near) this.cameras.main.shake(260, 0.01);
      } else if (a.type === 'gust') {
        const R = a.rect;
        for (let i = 0; i < 8; i++) this.burst(R.x1 + Math.random() * (R.x2 - R.x1), R.y1 + Math.random() * (R.y2 - R.y1), 6, 0xffffff, 90);
        if (near) this.cameras.main.shake(400, 0.012);
      } else if (a.type === 'share') {
        const who = a.target === (me && me.id) ? this.me : this.remotes.get(a.target);
        if (who) { this.burst(who.x, who.y - 30, 18, 0xffd23f, a.r); this.floatText(who.x, who.y - 140, '分攤！', '#ffd23f', 24); }
        if (near) this.cameras.main.shake(250, 0.008);
      } else if (a.type === 'storm') {
        const B = a.box;
        for (let i = 0; i < 14; i++) this.time.delayedCall(i * 40, () => this.burst(B.x1 + Math.random() * (B.x2 - B.x1), B.y1 + Math.random() * (B.y2 - B.y1), 8, i % 2 ? 0x7fb2e5 : 0xffffff, 120));
        if (near) { this.cameras.main.shake(700, 0.016); this.flash.setSize(this.scale.width, this.scale.height); this.tweens.add({ targets: this.flash, alpha: { from: 0.5, to: 0 }, duration: 500 }); }
      } else {
        const spots = a.type === 'slash' ? [{ x: a.x, y: a.y }] : a.spots;
        const [c1, c2] = a.type === 'bolt' ? [0xffb020, 0xfff07a] : a.type === 'sweep' ? [0x3f8f5a, 0xbfe6c8] : a.type === 'drop' ? [0xe8384f, 0xffd23f] : [0x5b3f8f, 0xd9c4ff];
        spots.forEach(sp => {
          if (a.type === 'bolt') {
            // 落雷：一道閃電從天上劈下來
            const b = this.add.image(sp.x, sp.y, 'bolt-big').setOrigin(0.5, 1).setDepth(sp.y + 100).setScale(0.8);
            this.tweens.add({ targets: b, alpha: 0, duration: 400, delay: 120, onComplete: () => b.destroy() });
          } else if (a.type !== 'drop') {
            const g = this.add.graphics({ x: sp.x, y: sp.y - 30 }).setDepth(sp.y + 100);
            g.lineStyle(10, c1, 0.85); g.beginPath(); g.arc(0, 0, a.r * 0.8, -2.6, 0.5); g.strokePath();
            g.lineStyle(4, c2, 1); g.beginPath(); g.arc(0, 0, a.r * 0.8, -2.6, 0.5); g.strokePath();
            this.tweens.add({ targets: g, scale: 1.3, alpha: 0, angle: 120, duration: 450, onComplete: () => g.destroy() });
          }
          this.burst(sp.x, sp.y - 20, 10, c1, a.r);
        });
        if (near) this.cameras.main.shake(200, 0.007);
      }
    }

    canStand(x, y) {
      // 用腳底的一個小方框判斷碰撞
      return !MAP.isBlocked(x - 12, y - 8) && !MAP.isBlocked(x + 12, y - 8) &&
        !MAP.isBlocked(x - 12, y + 2) && !MAP.isBlocked(x + 12, y + 2);
    }

    update(time, delta) {
      this.tickDj(time, delta || 16);
      // 用真實時間算位移，電腦或手機掉幀時走路速度也不會變慢
      const now = performance.now();
      const dt = Math.min(0.1, (now - (this.prevNow || now)) / 1000);
      this.prevNow = now;
      this.updateRain(dt);
      this.updateStorms(dt);
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
      // 遊戲視窗開著的時候不能走路，才不會不小心走出戰情室
      if (!$('games').hidden) { dx = 0; dy = 0; this.target = null; }
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
        // 九曲洞：往大理石走過去就是推
        const md = this.myDg();
        if (md && md.id === 'hualien' && md.stage === 1) {
          const hz = Math.abs(dx) >= Math.abs(dy), pdx = hz ? Math.sign(dx) : 0, pdy = hz ? 0 : Math.sign(dy);
          if (!this.canStand(this.me.x + pdx * 4, this.me.y + pdy * 4)) this.tryPush(pdx, pdy);
        }
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
      if (changed && time - this.lastSent > 66 && socket.connected) {
        socket.emit('move', { x: Math.round(this.me.x), y: Math.round(this.me.y), dir: this.me.dir, moving });
        this.lastSent = time;
        this.lastMoving = moving;
      }

      // 小怪：平滑移動、冰凍時停住
      this.mobs.forEach(m => {
        if (!m.visible) return;
        m.x += (m.tx - m.x) * Math.min(1, dt * 8);
        m.y += (m.ty - m.y) * Math.min(1, dt * 8);
        const frozen = performance.now() < m.frozenUntil, shock = performance.now() < (m.shockUntil || 0);
        m.ice.setVisible(frozen);
        if ((m.wasFrozen && !frozen) || (m.wasShock && !shock)) this.refreshFoeTint(m.state.id);
        m.wasFrozen = frozen; m.wasShock = shock;
        m.body_.y = frozen || shock ? 0 : -Math.abs(Math.sin(time / 160 + m.tx)) * 4;
        // 電暈：原地左右抖
        if (shock) m.body_.x = (Math.random() - 0.5) * 6; else if (m.wasShockX) m.body_.x = 0;
        m.wasShockX = shock;
        m.setDepth(m.y);
      });

      // 召喚物：平滑移動、一跳一跳
      this.summons.forEach(c => {
        c.x += (c.tx - c.x) * Math.min(1, dt * 8);
        c.y += (c.ty - c.y) * Math.min(1, dt * 8);
        c.body_.y = -Math.abs(Math.sin(time / 140 + c.phase)) * 4;
        c.setDepth(c.y);
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
        const shock = performance.now() < (this.shockUntil || 0);
        if (this.wasShock && !shock && !this.mHitUntil) this.applyMonsterTint();
        this.wasShock = shock;
        if (!frozen && !shock) this.mSwirl.rotation -= dt * 2.4;
        this.mIce.setVisible(frozen);
        const status = [frozen && '冰凍中', shock && '電暈中', weak && '被削弱'].filter(Boolean).join(' ');
        if (status !== this.mStatusText) {
          this.mStatusText = status;
          this.mStatus.setText(status).setVisible(!!status);
          this.mStatus.setColor(frozen ? '#2f5fa8' : shock ? '#b8860b' : '#5b3fa0');
          if (!this.mHitUntil) this.applyMonsterTint();
        }
        // 楓之谷式的彈跳：跳起來、落地時壓扁（冰凍時停住）
        const ph = frozen || shock ? 0.5 : (time % 900) / 900;
        const hop = Math.sin(ph * Math.PI);
        const squash = ph < 0.12 || ph > 0.88 ? 0.1 : 0;
        this.mBody.y = -hop * 16;
        this.mBody.setScale(1 + squash, 1 - squash + hop * 0.04); // 整體大小由 container 的 scale 決定
        this.mFace.y = -100 * (1 - squash) - hop * 16;
        if (this.mHitUntil && performance.now() > this.mHitUntil) { this.mHitUntil = 0; this.mFace.setTexture('typhoon-face'); this.applyMonsterTint(); }
        this.monster.setDepth(this.monster.y);
      }
      // 總部、副本、候位區分開設鏡頭範圍，才不會看到中間的空地；比螢幕窄的區域放在畫面正中間
      const zone = MAP.zoneOf(this.me.x), inD = zone === 'dungeon', zd = MAP.dungeonAt(this.me.x);
      const cam = this.cameras.main, vw = cam.width / cam.zoom, vh = cam.height / cam.zoom;
      const camKey = MAP.areaOf(this.me.x) + '|' + Math.round(vw) + 'x' + Math.round(vh);
      if (camKey !== this.camKey) {
        this.camKey = camKey;
        const [x1, x2, y1, y2] = zone === 'dungeon' ? [zd.dx, zd.dx + 22, 0, MAP.H]
          : zone === 'lobby' ? [zd.lx, zd.lx + 12, 0, 18] : [0, MAP.MW, 0, MAP.H];
        const w = (x2 - x1) * T, h = (y2 - y1) * T;
        const bw = Math.max(w, vw), bh = Math.max(h, vh), bx = x1 * T - (bw - w) / 2, by = y1 * T - (bh - h) / 2;
        cam.setBounds(bx, by, bw, bh);
        // 置中後兩邊會露出隔壁區域，用深色蓋住
        if (!this.zoneMask) this.zoneMask = this.add.graphics().setDepth(100000);
        const m = this.zoneMask.clear().fillStyle(0x131a28, 1);
        if (bw > w) { m.fillRect(bx, by, x1 * T - bx, bh); m.fillRect(x2 * T, by, bx + bw - x2 * T, bh); }
        if (bh > h) { m.fillRect(bx, by, bw, y1 * T - by); m.fillRect(bx, y2 * T, bw, by + bh - y2 * T); }
      }
      this.portals.forEach(pt => { pt.rotation -= dt * 3; });
      this.tickDamper(dt);
      this.renderDgPanel();
      // 頭目血條：在前線或看得到颱風的時候才顯示；在副本最後一關就顯示那個副本頭目的
      const rm = MAP.roomAt(this.me.x, this.me.y);
      const fu = this.inDg() && rm && rm.boss ? this.bossMob(this.myDg().id === 'taipei' ? 'tianlong' : 'fu') : null;
      const bf = fu ? fu.state.kind : 'typhoon';
      if (bf !== this.bossFor) { this.bossFor = bf; this.refreshBossLabel(); }
      const showBoss = !!fu || (!inD && this.mState.alive && (this.roomId === 'front' ||
        Math.hypot(this.me.x - this.monster.x, this.me.y - this.monster.y) < 700));
      if (showBoss !== this.showBoss) { this.showBoss = showBoss; $('boss').hidden = !showBoss; document.body.classList.toggle('boss-on', showBoss); }
      if (!this.mState.alive && this.respawnAt) {
        const left = Math.max(0, Math.ceil((this.respawnAt - performance.now()) / 1000));
        this.mDead.setText(`颱風${ST.MONSTER.name}被擊退了！\n${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} 後重新生成`);
      }

      // 互動提示：攻擊用技能列的普攻鍵，其他互動（敲箱子、點歌…）在那個東西頭上冒紙條
      const all0 = [this.me, ...this.remotes.values()];
      const near = this.nearbyAction();
      const canHit = !!near && !this.isDead() && near.type === 'attack';
      this.updateHint(!near || this.isDead() || canHit || !HINTS[near.type] || !$('games').hidden ? null : near, time);
      if (canHit !== this.canHit) { this.canHit = canHit; $('basic-btn').classList.toggle('ready', canHit); }
      // 技能的冷卻遮罩（從下往上退），魔力不夠就變暗
      this.cdPct = this.cdPct || {};
      [['basic-btn', basic()], ['skill-btn', special()], ['skill2-btn', special2()]].forEach(([btn, sp]) => {
        const cdLeft = Math.max(0, (cooldowns[sp] || 0) - performance.now());
        const pct = cdLeft ? Math.round(100 * cdLeft / ST.SKILLS[sp].cooldown) : 0;
        const low = !!myStats && myStats.mp < ST.SKILLS[sp].mp;
        if (low !== $(btn).classList.contains('low')) $(btn).classList.toggle('low', low);
        if (pct === this.cdPct[btn]) return;
        this.cdPct[btn] = pct;
        const bar = document.querySelector(`#${btn} .cd`);
        if (bar) bar.style.height = pct + '%';
        $(btn).classList.toggle('cooling', pct > 0);
      });
      // 防禦增益時間到就拿掉小盾牌
      all0.forEach(c => {
        if (c.shield && performance.now() > c.shieldUntil) { c.shield.destroy(); c.shield = null; }
        if (c.atkIcon && performance.now() > c.atkUntil) { c.atkIcon.destroy(); c.atkIcon = null; }
      });
      this.updateSparks(dt);

      // 拿著蛋糕的人：時間到自動放下；靠近的人（包含自己）戴上慶祝帽，直到那個蛋糕放下
      const holders = all0.filter(c => c.cakeUntil);
      holders.forEach(h => { if (now > h.cakeUntil) this.onCake(h.pid, 0, h); else if (h.cake) this.cakeParty(h); });
      all0.forEach(c => {
        holders.forEach(h => {
          if (h.cakeUntil && Math.hypot(h.x - c.x, h.y - c.y) < 160 && h.cakeUntil > c.hatUntil) { c.hatUntil = h.cakeUntil; c.hatBy = h.pid; }
        });
        const hat = now < c.hatUntil;
        if (hat && !c.hat) { c.hat = this.add.image(4, -60, 'fx-partyhat').setScale(0.5).setOrigin(0.5, 0.9).setAngle(12); c.add(c.hat); }
        else if (!hat && c.hat) { c.hat.destroy(); c.hat = null; }
        const up = (c.hat ? -22 : 0) + (c.look && c.look.equip && c.look.equip.head ? -12 : 0);
        if (c.bar.y !== up) c.bar.y = up;
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
        $('room-name').textContent = room ? plain(room.name) : '戶外（風雨很大！）';
        if (rid !== 'video' && !$('games').hidden) { ROOM.close(); toast('離開戰情室了，已經退出遊戲'); }
        // 走進戰鬥區技能欄自動打開，回到室內自動收起來（戶外走道維持原樣）
        if (rid === 'front' || (room && room.dungeon)) setSkillFold(false);
        else if (room) setSkillFold(true);
        // 其他地方的玩法交給頭上的提示紙條，只有不講會不知道規則的地方才提醒一句
        const tips = {
          front: '看到紅圈快閃開，回到圍欄裡就安全了',
          d1: '照石碑上的顏色順序踩石頭',
          d2: '把三顆大理石推進地上的凹槽',
          d3: '紅色範圍快閃開，他舉拳就是要衝鋒',
          t1: '撐過三波怪，地上的紅圈是招牌要掉下來了',
          t2: '阻尼球掃到很痛！四個角落的控制台要同時亮',
          t3: '黃圈是分攤要靠過去，暴風來時躲到柱子後面',
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
