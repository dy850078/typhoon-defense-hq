/* global Phaser, io, HQ_MAP, HQ_AVATAR */
(() => {
  const MAP = HQ_MAP;
  const AV = HQ_AVATAR;
  const T = MAP.TILE;
  const SPEED = 220;
  const FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  const $ = (id) => document.getElementById(id);

  // ---------------- 角色創建 ----------------
  const profile = {
    name: localStorage.getItem('hq-name') || '',
    animal: localStorage.getItem('hq-animal') || 'cat',
    color: localStorage.getItem('hq-color') || AV.COLORS[0],
    outfit: localStorage.getItem('hq-outfit') || AV.OUTFITS[0],
  };

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

  buildPicker($('animals'), Object.entries(AV.ANIMALS), 'animal', (b, v, l) => { b.textContent = l; });
  buildPicker($('colors'), AV.COLORS.map(c => [c]), 'color', (b, v) => { b.style.background = v; });
  buildPicker($('outfits'), AV.OUTFITS.map(c => [c]), 'outfit', (b, v) => { b.style.background = v; });
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

  function doJoin() {
    socket.emit('join', profile, (res) => {
      if (!res.ok) { $('join-error').textContent = res.error; return; }
      joined = true;
      me = res.you;
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
  socket.on('gust', (g) => scene && scene.onGust(g));
  socket.on('crateHit', (c) => scene && scene.onCrateHit(c));
  socket.on('itemGot', (g) => scene && scene.onItemGot(g));
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
    if (e.key === 'Enter' && document.activeElement !== chatInput) { e.preventDefault(); chatInput.focus(); }
    else if (e.key === 'Escape') chatInput.blur();
  });
  const typing = () => document.activeElement === chatInput;
  $('chat-toggle').addEventListener('click', () => $('chat').classList.toggle('collapsed'));
  if (window.innerWidth < 600) $('chat').classList.add('collapsed');

  // ---------------- 視訊 ----------------
  $('video-btn').addEventListener('click', () => {
    const name = encodeURIComponent(JSON.stringify(me ? me.name : ''));
    const url = `https://${config.jitsiDomain}/${encodeURIComponent(config.jitsiRoom)}` +
      `#userInfo.displayName=${name}&config.prejoinConfig.enabled=false`;
    window.open(url, '_blank', 'noopener');
  });

  // ---------------- 背包 ----------------
  function renderInventory(inv) {
    const box = $('inventory');
    box.innerHTML = '';
    Object.entries(MAP.ITEMS).forEach(([k, it]) => {
      const el = document.createElement('span');
      el.className = 'inv-item';
      el.title = it.name;
      el.textContent = `${it.icon} ${(inv && inv[k]) || 0}`;
      box.appendChild(el);
    });
  }
  function toast(text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
  $('action-btn').addEventListener('click', () => scene && scene.doAction());

  // ---------------- 畫颱風怪物 ----------------
  function drawTyphoon() {
    const S = 220, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    ctx.translate(S / 2, S / 2);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 100);
    g.addColorStop(0, 'rgba(242,244,248,1)');
    g.addColorStop(0.55, 'rgba(154,163,181,0.95)');
    g.addColorStop(0.85, 'rgba(42,50,68,0.85)');
    g.addColorStop(1, 'rgba(19,26,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.fill();
    // 螺旋雲帶
    for (let arm = 0; arm < 4; arm++) {
      ctx.save(); ctx.rotate(arm * Math.PI / 2);
      ctx.strokeStyle = arm % 2 ? 'rgba(255,255,255,0.75)' : 'rgba(19,26,40,0.55)';
      ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.05) {
        const r = 20 + t * 80, a = t * 2.6;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.restore();
    }
    // 颱風眼
    ctx.fillStyle = '#131a28'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
    return c;
  }
  function drawTyphoonFace() {
    const c = document.createElement('canvas');
    c.width = 120; c.height = 60;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    [[38, 30], [82, 30]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 14, 12, 0, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#ff6a13';
    [[40, 32], [80, 32]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); });
    // 生氣的眉毛
    ctx.strokeStyle = '#131a28'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(22, 10); ctx.lineTo(50, 20); ctx.moveTo(98, 10); ctx.lineTo(70, 20); ctx.stroke();
    return c;
  }

  // ---------------- 畫地圖 ----------------
  function rand(x, y, s = 0) { // 固定亂數，讓草地花紋每次都一樣
    const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function drawMap() {
    const c = document.createElement('canvas');
    c.width = MAP.W * T; c.height = MAP.H * T;
    const ctx = c.getContext('2d');
    const floorOf = (ch, y) => (y > 30 && ':T~'.includes(ch) ? 'mud'
      : ch === 'V' ? 'carpet' : ',T~BF'.includes(ch) ? 'grass' : 'wood');

    for (let y = 0; y < MAP.H; y++) {
      for (let x = 0; x < MAP.W; x++) {
        const ch = MAP.tiles[y][x];
        const px = x * T, py = y * T;
        // 地板
        let base = floorOf(ch, y);
        if (ch === 'M' || ch === 'S' || ch === 'K' || ch === 'P' || ch === '=') {
          base = (y >= 4 && y <= 13 && x >= 21) ? 'carpet' : 'wood';
        }
        if (base === 'grass') {
          ctx.fillStyle = '#8fcf7a'; ctx.fillRect(px, py, T, T);
          ctx.fillStyle = '#7dbf69';
          for (let i = 0; i < 3; i++) {
            const gx = px + rand(x, y, i) * (T - 8) + 4, gy = py + rand(y, x, i) * (T - 8) + 4;
            ctx.fillRect(gx, gy, 3, 6); ctx.fillRect(gx + 4, gy + 2, 3, 4);
          }
          if (rand(x, y, 9) > 0.93) { ctx.fillStyle = '#fff4a8'; ctx.beginPath(); ctx.arc(px + 24, py + 24, 4, 0, 7); ctx.fill(); }
        } else if (base === 'mud') {
          ctx.fillStyle = (x + y) % 2 ? '#8b96a3' : '#85909d'; ctx.fillRect(px, py, T, T);
          ctx.fillStyle = '#76818e';
          for (let i = 0; i < 2; i++) {
            ctx.beginPath(); ctx.arc(px + rand(x, y, i) * T, py + rand(y, x, i + 3) * T, 3 + rand(x, y, i + 5) * 4, 0, 7); ctx.fill();
          }
        } else if (base === 'carpet') {
          ctx.fillStyle = (x + y) % 2 ? '#cfe3f5' : '#c3dbf0'; ctx.fillRect(px, py, T, T);
        } else {
          ctx.fillStyle = '#f1dcb5'; ctx.fillRect(px, py, T, T);
          ctx.fillStyle = '#e3c99c'; ctx.fillRect(px, py + (y % 2 ? 0 : T / 2), T, 2);
          ctx.fillRect(px + (y % 2 ? T / 3 : (2 * T) / 3), py, 2, T);
        }

        // 物件
        if (ch === '#') {
          ctx.fillStyle = '#c9b294'; ctx.fillRect(px, py, T, T);
          ctx.fillStyle = '#e2d0b4'; ctx.fillRect(px, py, T, T * 0.35);
          ctx.strokeStyle = '#a89275'; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, T - 2, T - 2);
        } else if (ch === 'F') {
          ctx.fillStyle = '#c9ced6'; ctx.fillRect(px, py + 14, T, 6); ctx.fillRect(px, py + 30, T, 6);
          ctx.fillStyle = '#ff6a13'; ctx.fillRect(px + 4, py + 6, 8, 36); ctx.fillRect(px + 28, py + 6, 8, 36);
          ctx.fillStyle = '#3a3a3c'; ctx.fillRect(px + 4, py + 18, 8, 6); ctx.fillRect(px + 28, py + 18, 8, 6);
        } else if (ch === '=') {
          ctx.fillStyle = '#c96b5a'; ctx.fillRect(px + 4, py + 10, T - 8, T - 20);
        } else if (ch === '~') {
          ctx.fillStyle = '#7fb8e6'; ctx.beginPath(); ctx.ellipse(px + 24, py + 24, 22, 14, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#b5daf5'; ctx.beginPath(); ctx.ellipse(px + 18, py + 20, 7, 3, 0, 0, 7); ctx.fill();
        } else if (ch === 'T') {
          ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(px + 24, py + 42, 18, 5, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#8b5e3c'; ctx.fillRect(px + 19, py + 26, 10, 18);
          ctx.fillStyle = '#4f9e4a'; ctx.beginPath(); ctx.arc(px + 24, py + 18, 20, 0, 7); ctx.fill();
          ctx.fillStyle = '#66b85f'; ctx.beginPath(); ctx.arc(px + 18, py + 12, 9, 0, 7); ctx.fill();
        } else if (ch === 'B') {
          ctx.fillStyle = '#d8c08e'; ctx.strokeStyle = '#a58c5c'; ctx.lineWidth = 2;
          [[12, 34], [36, 34], [24, 20]].forEach(([dx, dy]) => {
            ctx.beginPath(); ctx.ellipse(px + dx, py + dy, 12, 8, 0, 0, 7); ctx.fill(); ctx.stroke();
          });
        } else if (ch === 'K') {
          ctx.fillStyle = '#c28b52'; ctx.fillRect(px + 4, py + 4, T - 8, T - 8);
          ctx.strokeStyle = '#8f5f30'; ctx.lineWidth = 3; ctx.strokeRect(px + 4, py + 4, T - 8, T - 8);
          ctx.beginPath(); ctx.moveTo(px + 4, py + 4); ctx.lineTo(px + T - 4, py + T - 4);
          ctx.moveTo(px + T - 4, py + 4); ctx.lineTo(px + 4, py + T - 4); ctx.stroke();
        } else if (ch === 'M') {
          ctx.fillStyle = '#a8794e'; ctx.fillRect(px, py + 2, T, T - 4);
          ctx.fillStyle = '#bf8f62'; ctx.fillRect(px, py + 2, T, 8);
        } else if (ch === 'P') {
          ctx.fillStyle = '#3b4252'; ctx.fillRect(px + 2, py + 4, T - 4, T - 10);
          ctx.fillStyle = '#1f5f3a'; ctx.fillRect(px + 6, py + 8, T - 12, T - 18);
          ctx.strokeStyle = '#7dff9a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(px + 24, py + 19, 7, 0, 5); ctx.stroke();
        } else if (ch === 'S') {
          ctx.fillStyle = '#f29fae'; ctx.beginPath(); ctx.roundRect(px + 1, py + 6, T - 2, T - 12, 10); ctx.fill();
          ctx.fillStyle = '#f7c0ca'; ctx.fillRect(px + 4, py + 10, T - 8, 10);
        }
      }
    }
    // 給物資箱貼上標籤
    ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    MAP.CRATES.forEach(c => {
      const cx = ((c.x1 + c.x2 + 1) / 2) * T, cy = ((c.y1 + c.y2 + 1) / 2) * T;
      const w = ctx.measureText(c.label).width + 16;
      ctx.fillStyle = 'rgba(58,58,60,0.85)'; ctx.fillRect(cx - w / 2, cy - 12, w, 24);
      ctx.fillStyle = '#fff'; ctx.fillText(c.label, cx, cy + 5);
    });
    return c;
  }

  // ---------------- Phaser 場景 ----------------
  class HQScene extends Phaser.Scene {
    constructor() { super('hq'); this.remotes = new Map(); this.drops = []; }

    create() {
      this.textures.addCanvas('map', drawMap());
      this.add.image(0, 0, 'map').setOrigin(0).setDepth(-10);
      MAP.ROOMS.forEach(r => {
        this.add.text(((r.x1 + r.x2 + 1) / 2) * T, (r.y1 + 1.6) * T, r.name, {
          fontSize: '20px', fontStyle: '900', color: '#3a3a3c', fontFamily: FONT,
          backgroundColor: 'rgba(250,250,247,0.9)', padding: { x: 12, y: 5 },
        }).setOrigin(0.5).setDepth(-5);
      });
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
      this.input.on('pointerdown', (p) => {
        if (!this.me) return;
        chatInput.blur();
        // 點到颱風或箱子、而且夠近，就直接打；否則走過去
        const act = this.actionAt(p.worldX, p.worldY);
        if (act) { this.doAction(act); return; }
        this.target = { x: p.worldX, y: p.worldY };
      });

      // 颱風怪物
      this.textures.addCanvas('typhoon', drawTyphoon());
      this.textures.addCanvas('typhoon-face', drawTyphoonFace());
      const crate = document.createElement('canvas');
      crate.width = T; crate.height = T;
      const cc = crate.getContext('2d');
      cc.fillStyle = '#c28b52'; cc.fillRect(4, 4, T - 8, T - 8);
      cc.strokeStyle = '#8f5f30'; cc.lineWidth = 3; cc.strokeRect(4, 4, T - 8, T - 8);
      cc.beginPath(); cc.moveTo(4, 4); cc.lineTo(T - 4, T - 4); cc.moveTo(T - 4, 4); cc.lineTo(4, T - 4); cc.stroke();
      this.textures.addCanvas('crate', crate);

      const Z = MAP.MONSTER_ZONE;
      this.mSwirl = this.add.image(0, 0, 'typhoon');
      this.mFace = this.add.image(0, 4, 'typhoon-face').setScale(0.8);
      this.mBar = this.add.graphics();
      this.mName = this.add.text(0, -132, '颱風怪', {
        fontSize: '16px', fontStyle: 'bold', color: '#ffffff', fontFamily: FONT,
        backgroundColor: '#131a28', padding: { x: 8, y: 3 },
      }).setOrigin(0.5);
      this.monster = this.add.container((Z.x1 + Z.x2) / 2, (Z.y1 + Z.y2) / 2,
        [this.mSwirl, this.mFace, this.mBar, this.mName]);
      this.monster.tx = this.monster.x; this.monster.ty = this.monster.y;
      this.mState = { alive: true, hp: 1, maxHp: 1 };
      this.mDead = this.add.text((Z.x1 + Z.x2) / 2, (Z.y1 + Z.y2) / 2, '', {
        fontSize: '22px', fontStyle: 'bold', color: '#3a3a3c', fontFamily: FONT, align: 'center',
        backgroundColor: 'rgba(250,250,247,0.92)', padding: { x: 18, y: 12 },
      }).setOrigin(0.5).setDepth(900).setVisible(false);
      this.lastAttackKey = false;

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
      const key = `av-${p.animal}-${p.color}-${p.outfit}`;
      if (!this.textures.exists(key)) {
        const c = document.createElement('canvas');
        c.width = AV.WIDTH * 2; c.height = AV.HEIGHT * 2;
        const ctx = c.getContext('2d'); ctx.scale(2, 2); AV.drawAvatar(ctx, p);
        this.textures.addCanvas(key, c);
      }
      const body = this.add.image(0, 0, key).setScale(0.5).setOrigin(0.5, 0.95);
      const tag = this.add.text(0, -84, p.name, {
        fontSize: '14px', fontStyle: 'bold', color: '#f2f4f8', fontFamily: FONT,
        backgroundColor: 'rgba(19,26,40,0.85)', padding: { x: 7, y: 2 },
      }).setOrigin(0.5);
      const cont = this.add.container(p.x, p.y, [body, tag]);
      cont.body_ = body;
      cont.dir = p.dir || 1;
      cont.moving = !!p.moving;
      cont.tx = p.x; cont.ty = p.y;
      body.setFlipX(cont.dir === -1);
      return cont;
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
      renderInventory(res.you.inv);
    }

    addRemote(p) {
      if (!this.me || p.id === me.id || this.remotes.has(p.id)) return;
      this.remotes.set(p.id, this.makeAvatar(p));
      this.updateOnline();
    }

    moveRemote(m) {
      const r = this.remotes.get(m.id);
      if (!r) return;
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
      this.mState = m;
      this.monster.setVisible(m.alive);
      if (m.alive) {
        this.monster.x = this.monster.tx = m.x; this.monster.y = this.monster.ty = m.y;
        this.mDead.setVisible(false);
      } else {
        this.respawnAt = performance.now() + m.respawnIn;
        this.mDead.setVisible(true);
      }
      this.drawMonsterBar();
    }

    moveMonster(m) { this.monster.tx = m.x; this.monster.ty = m.y; }

    drawMonsterBar() {
      const g = this.mBar, w = 160, ratio = this.mState.maxHp ? this.mState.hp / this.mState.maxHp : 0;
      g.clear();
      g.fillStyle(0x131a28, 0.9); g.fillRoundedRect(-w / 2 - 3, -116, w + 6, 16, 8);
      g.fillStyle(0xff6a13, 1); g.fillRoundedRect(-w / 2, -113, Math.max(6, w * ratio), 10, 5);
    }

    onMonsterHit(m) {
      this.mState.hp = m.hp;
      this.drawMonsterBar();
      const who = me && m.id === me.id ? this.me : this.remotes.get(m.id);
      if (who) this.lunge(who, this.monster.x);
      this.tweens.add({ targets: this.mSwirl, scale: { from: 0.9, to: 1 }, duration: 160 });
      this.floatText(this.monster.x + (Math.random() - 0.5) * 80, this.monster.y - 60,
        (m.crit ? '暴擊！' : '') + '-' + m.dmg, m.crit ? '#ff6a13' : '#ffffff', m.crit ? 30 : 22);
    }

    onGust(gst) {
      if (!this.me) return;
      const dx = this.me.x - gst.x, dy = this.me.y - gst.y, d = Math.hypot(dx, dy);
      if (d > gst.r) return;
      // 被強風往外吹
      this.push = { x: (dx || 1) / (d || 1) * 520, y: (dy || 0) / (d || 1) * 520, t: 0.3 };
      this.cameras.main.shake(250, 0.006);
      this.floatText(this.me.x, this.me.y - 100, '💨 被風吹走了！', '#ffffff', 18);
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
      if (this.mState.alive && this.monster.visible && Math.hypot(x - this.monster.x, y - this.monster.y) < 110 &&
        Math.hypot(this.me.x - this.monster.x, this.me.y - this.monster.y) < 130) return { type: 'attack' };
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (MAP.crateAt(tx, ty) >= 0 && Math.hypot(this.me.x - (tx + 0.5) * T, this.me.y - (ty + 0.5) * T) < 1.7 * T) {
        return { type: 'crate', tx, ty };
      }
      return null;
    }

    // 自己身邊可以互動的東西（給按鈕和空白鍵用）
    nearbyAction() {
      if (!this.me) return null;
      if (this.mState.alive && Math.hypot(this.me.x - this.monster.x, this.me.y - this.monster.y) < 130) {
        return { type: 'attack' };
      }
      const cx = Math.floor(this.me.x / T), cy = Math.floor(this.me.y / T);
      let best = null, bd = Infinity;
      for (let ty = cy - 2; ty <= cy + 2; ty++) {
        for (let tx = cx - 2; tx <= cx + 2; tx++) {
          if (MAP.crateAt(tx, ty) < 0) continue;
          const d = Math.hypot(this.me.x - (tx + 0.5) * T, this.me.y - (ty + 0.5) * T);
          if (d < 1.7 * T && d < bd) { bd = d; best = { type: 'crate', tx, ty }; }
        }
      }
      return best;
    }

    doAction(act) {
      const now = performance.now();
      if (now - (this.lastActTime || 0) < 360) return;
      act = act || this.nearbyAction();
      if (!act) return;
      this.lastActTime = now;
      this.target = null;
      // 先把目前位置告訴伺服器，它才會判斷你夠近
      socket.emit('move', { x: Math.round(this.me.x), y: Math.round(this.me.y), dir: this.me.dir, moving: false });
      if (act.type === 'attack') {
        socket.emit('attack', () => {});
      } else {
        socket.emit('hitCrate', { tx: act.tx, ty: act.ty }, (res) => {
          if (!res || !res.item) return;
          renderInventory(res.inv);
          const it = MAP.ITEMS[res.item];
          toast(`獲得 ${it.icon} ${it.name}！`);
        });
      }
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
      if (!typing()) {
        const k = this.keys;
        if (k.A.isDown || k.LEFT.isDown) dx -= 1;
        if (k.D.isDown || k.RIGHT.isDown) dx += 1;
        if (k.W.isDown || k.UP.isDown) dy -= 1;
        if (k.S.isDown || k.DOWN.isDown) dy += 1;
      }
      if (dx || dy) this.target = null;
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

      // 其他玩家：平滑移動
      this.remotes.forEach(r => {
        r.x += (r.tx - r.x) * Math.min(1, dt * 12);
        r.y += (r.ty - r.y) * Math.min(1, dt * 12);
      });

      // 颱風：平滑移動、旋轉
      if (this.monster.visible) {
        this.monster.x += (this.monster.tx - this.monster.x) * Math.min(1, dt * 6);
        this.monster.y += (this.monster.ty - this.monster.y) * Math.min(1, dt * 6);
        this.mSwirl.rotation -= dt * 1.6;
        this.mFace.y = 4 + Math.sin(time / 300) * 3;
        this.monster.setDepth(this.monster.y + 40);
      }
      if (!this.mState.alive && this.respawnAt) {
        const left = Math.max(0, Math.ceil((this.respawnAt - performance.now()) / 1000));
        this.mDead.setText(`🎉 颱風被擊退了！\n${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} 後重新生成`);
      }

      // 互動按鈕
      const near = this.nearbyAction();
      const label = near ? (near.type === 'attack' ? '💥 攻擊颱風' : '🔨 敲箱子') : '';
      if (label !== this.actionLabel) {
        this.actionLabel = label;
        $('action-btn').hidden = !label;
        $('action-btn').textContent = label;
      }

      // 走路彈跳 + 依 y 排深度
      const all = [this.me, ...this.remotes.values()];
      all.forEach(c => {
        c.body_.y = c.moving ? -Math.abs(Math.sin(time / 90)) * 5 : 0;
        c.setDepth(c.y);
      });

      // 房間偵測
      const room = MAP.roomAt(this.me.x, this.me.y);
      const rid = room ? room.id : null;
      if (rid !== this.roomId) {
        this.roomId = rid;
        $('room-name').textContent = room ? room.name : '🌧️ 戶外（風雨很大！）';
        $('video-prompt').hidden = rid !== 'video';
        if (rid === 'front' && !this.toldFront) { this.toldFront = true; toast('靠近颱風按空白鍵（或點它）攻擊！'); }
        if (rid === 'storage' && !this.toldStorage) { this.toldStorage = true; toast('走到箱子旁按空白鍵（或點箱子）敲三下！'); }
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
