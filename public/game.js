/* global Phaser, io, HQ_MAP, HQ_AVATAR */
(() => {
  const MAP = HQ_MAP;
  const AV = HQ_AVATAR;
  const T = MAP.TILE;
  const SPEED = 220;
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

  // ---------------- 視訊 ----------------
  $('video-btn').addEventListener('click', () => {
    const name = encodeURIComponent(JSON.stringify(me ? me.name : ''));
    const url = `https://${config.jitsiDomain}/${encodeURIComponent(config.jitsiRoom)}` +
      `#userInfo.displayName=${name}&config.prejoinConfig.enabled=false`;
    window.open(url, '_blank', 'noopener');
  });

  // ---------------- 畫地圖 ----------------
  function rand(x, y, s = 0) { // 固定亂數，讓草地花紋每次都一樣
    const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function drawMap() {
    const c = document.createElement('canvas');
    c.width = MAP.W * T; c.height = MAP.H * T;
    const ctx = c.getContext('2d');
    const floorOf = (ch) => (ch === 'V' ? 'carpet' : ',T~B'.includes(ch) ? 'grass' : 'wood');

    for (let y = 0; y < MAP.H; y++) {
      for (let x = 0; x < MAP.W; x++) {
        const ch = MAP.tiles[y][x];
        const px = x * T, py = y * T;
        // 地板
        let base = floorOf(ch);
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
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    [['泡麵', 6, 16], ['礦泉水', 6, 20], ['手電筒', 16, 16], ['電池', 15, 21]].forEach(([t, x, y]) => {
      ctx.fillText(t, x * T + T, y * T + T + 5);
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
          fontSize: '20px', fontStyle: 'bold', color: '#6b5640', fontFamily: 'sans-serif',
          backgroundColor: 'rgba(255,250,240,0.8)', padding: { x: 10, y: 4 },
        }).setOrigin(0.5).setDepth(-5);
      });
      this.cameras.main.setBounds(0, 0, MAP.W * T, MAP.H * T);
      this.cameras.main.setBackgroundColor('#2d3a4a');
      this.applyZoom();
      this.scale.on('resize', () => this.applyZoom());

      const kb = this.input.keyboard;
      this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false);
      this.input.on('pointerdown', (p) => {
        if (!this.me) return;
        this.target = { x: p.worldX, y: p.worldY };
        chatInput.blur();
      });

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
        fontSize: '14px', fontStyle: 'bold', color: '#fff', fontFamily: 'sans-serif',
        backgroundColor: 'rgba(74,59,44,0.75)', padding: { x: 6, y: 2 },
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
        fontSize: '15px', color: '#4a3b2c', fontFamily: 'sans-serif', backgroundColor: '#ffffff',
        padding: { x: 10, y: 6 }, wordWrap: { width: 200, useAdvancedWrap: true }, align: 'center',
      }).setOrigin(0.5, 1);
      who.add(b);
      who.bubble = b;
      this.time.delayedCall(5000, () => { if (who.bubble === b) { b.destroy(); who.bubble = null; } });
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
    backgroundColor: '#2d3a4a',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: HQScene,
  });
})();
