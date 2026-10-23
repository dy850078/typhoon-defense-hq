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
    hair: localStorage.getItem('hq-hair') || 'short',
    hairColor: localStorage.getItem('hq-hairColor') || AV.HAIR_COLORS[0],
    skin: localStorage.getItem('hq-skin') || AV.SKINS[0],
    outfit: localStorage.getItem('hq-outfit') || AV.OUTFITS[0],
    glasses: localStorage.getItem('hq-glasses') || '1',
  };
  // 舊版存的是動物的顏色，對不上就換回預設
  if (!AV.HAIRS[profile.hair]) profile.hair = 'short';
  if (!AV.OUTFITS.includes(profile.outfit)) profile.outfit = AV.OUTFITS[0];

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

  // ---------------- 畫颱風怪物（軟綿綿的雲朵怪） ----------------
  const CR = window.HQ_CRAYON;
  function drawTyphoonCloud() {
    const S = 240, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    const r = CR.rng(2026);
    ctx.translate(S / 2, S / 2);
    // 一團一團蓬蓬的雲
    const puffs = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      puffs.push([Math.cos(a) * 62, Math.sin(a) * 52, 34 + r() * 12]);
    }
    puffs.push([0, 0, 64]);
    const layer = (shade, dy, alpha) => puffs.forEach(([x, y, rad]) => {
      const g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.4 + dy, rad * 0.1, x, y + dy, rad);
      g.addColorStop(0, shade[0]); g.addColorStop(0.7, shade[1]); g.addColorStop(1, 'rgba(174,182,196,0)');
      ctx.globalAlpha = alpha; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y + dy, rad, 0, Math.PI * 2); ctx.fill();
    });
    layer(['#6f7d93', '#55637a'], 10, 0.9);
    layer(['#ffffff', '#d6dae1'], 0, 1);
    ctx.globalAlpha = 1;
    CR.dots(ctx, -90, -80, 180, 160, 80, 'rgba(255,255,255,0.5)', r, 2);
    return c;
  }
  function drawTyphoonSwirl() {
    const S = 240, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    const r = CR.rng(7);
    ctx.translate(S / 2, S / 2);
    for (let arm = 0; arm < 3; arm++) {
      ctx.save(); ctx.rotate((arm * Math.PI * 2) / 3);
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.05) {
        const rad = 18 + t * 92, a = t * 2.4;
        const x = Math.cos(a) * rad, y = Math.sin(a) * rad * 0.85;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      CR.stroke(ctx, r, 7, '#4f7cc2');
      ctx.restore();
    }
    return c;
  }
  function drawTyphoonFace() {
    const c = document.createElement('canvas');
    c.width = 120; c.height = 70;
    const ctx = c.getContext('2d');
    const r = CR.rng(11);
    // 臉頰
    ctx.fillStyle = 'rgba(244,120,120,0.5)';
    [[24, 42], [96, 42]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 11, 7, 0, 0, Math.PI * 2); ctx.fill(); });
    // 豆豆眼 + 生氣的眉毛
    ctx.fillStyle = CR.INK;
    [[42, 32], [78, 32]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill(); });
    CR.line(ctx, 32, 18, 50, 25, r, 4); CR.line(ctx, 88, 18, 70, 25, r, 4);
    // 橘色鳥嘴
    ctx.beginPath(); ctx.moveTo(52, 42); ctx.quadraticCurveTo(60, 37, 70, 42); ctx.quadraticCurveTo(61, 52, 52, 42); ctx.closePath();
    CR.fill(ctx, '#ff7a2f', r, null); CR.stroke(ctx, r, 2.5);
    return c;
  }

  // ---------------- 畫地圖（蠟筆手繪風） ----------------
  function drawMap() {
    const c = document.createElement('canvas');
    c.width = MAP.W * T; c.height = MAP.H * T;
    const ctx = c.getContext('2d');
    const at = (x, y) => (x < 0 || y < 0 || x >= MAP.W || y >= MAP.H ? ' ' : MAP.tiles[y][x]);
    const inVideo = (x, y) => y >= 4 && y <= 13 && x >= 21 && x <= 34;
    const floorOf = (ch, x, y) => {
      if (y > 30 && ':T~'.includes(ch)) return 'mud';
      if (',T~BF'.includes(ch)) return 'grass';
      if (ch === '#') return 'wall';
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

    // 3. 給物資箱貼上標籤
    ctx.font = '900 15px "Noto Sans TC", sans-serif'; ctx.textAlign = 'center';
    MAP.CRATES.forEach((cr, i) => {
      const r = CR.rng(i + 99);
      const cx = ((cr.x1 + cr.x2 + 1) / 2) * T, cy = ((cr.y1 + cr.y2 + 1) / 2) * T;
      const w = ctx.measureText(cr.label).width + 18;
      CR.rect(ctx, cx - w / 2, cy - 13, w, 26, r, 1.2); CR.fill(ctx, '#fafaf7', r, null); CR.stroke(ctx, r, 2.2);
      ctx.fillStyle = CR.INK; ctx.fillText(cr.label, cx, cy + 5);
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
      this.textures.addCanvas('typhoon-cloud', drawTyphoonCloud());
      this.textures.addCanvas('typhoon', drawTyphoonSwirl());
      this.textures.addCanvas('typhoon-face', drawTyphoonFace());
      const crate = document.createElement('canvas');
      crate.width = T; crate.height = T;
      const cc = crate.getContext('2d');
      cc.fillStyle = '#c28b52'; cc.fillRect(4, 4, T - 8, T - 8);
      cc.strokeStyle = '#8f5f30'; cc.lineWidth = 3; cc.strokeRect(4, 4, T - 8, T - 8);
      cc.beginPath(); cc.moveTo(4, 4); cc.lineTo(T - 4, T - 4); cc.moveTo(T - 4, 4); cc.lineTo(4, T - 4); cc.stroke();
      this.textures.addCanvas('crate', crate);

      const Z = MAP.MONSTER_ZONE;
      this.mBody = this.add.image(0, 0, 'typhoon-cloud');
      this.mSwirl = this.add.image(0, 0, 'typhoon').setAlpha(0.45);
      this.mFace = this.add.image(0, 4, 'typhoon-face');
      this.mBar = this.add.graphics();
      this.mName = this.add.text(0, -144, '颱風怪', {
        fontSize: '16px', fontStyle: 'bold', color: '#ffffff', fontFamily: FONT,
        backgroundColor: '#131a28', padding: { x: 8, y: 3 },
      }).setOrigin(0.5);
      this.monster = this.add.container((Z.x1 + Z.x2) / 2, (Z.y1 + Z.y2) / 2,
        [this.mBody, this.mSwirl, this.mFace, this.mBar, this.mName]);
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
      const key = `av-${p.hair}-${p.hairColor}-${p.skin}-${p.outfit}-${p.glasses}`;
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
      g.fillStyle(0x131a28, 0.9); g.fillRoundedRect(-w / 2 - 3, -126, w + 6, 16, 8);
      g.fillStyle(0xff6a13, 1); g.fillRoundedRect(-w / 2, -123, Math.max(6, w * ratio), 10, 5);
    }

    onMonsterHit(m) {
      this.mState.hp = m.hp;
      this.drawMonsterBar();
      const who = me && m.id === me.id ? this.me : this.remotes.get(m.id);
      if (who) this.lunge(who, this.monster.x);
      this.tweens.add({ targets: this.mBody, scale: { from: 0.9, to: 1 }, duration: 160 });
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
        this.mBody.setScale(1 + Math.sin(time / 420) * 0.03, 1 - Math.sin(time / 420) * 0.03);
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
