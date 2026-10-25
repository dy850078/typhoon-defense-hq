// 裝備：服裝、頭飾、披風、武器。資料前後端共用，畫法只在瀏覽器用
// 武器只會在副本打倒最終頭目時掉落，拿在右手上，會把普通攻擊換成武器的打法（basic 對應 stats.js 的技能）
// 每件裝備分成幾層畫，跟人物疊在一起：
//   cape（披風）→ back（服裝在頭後面的部分，例如布偶裝的帽兜）→ front（服裝，取代職業服）→ 頭 → head（頭飾）→ over（蓋在最上面，例如頭盔）
// 畫的座標跟 avatar.js 一樣是 64x80 的人物框，可以畫到框外（上面多 32、左右各多 16）
(function (root) {
  const RARITY = {
    R: { name: 'R', color: '#7fb2e5', weight: 60 },
    SR: { name: 'SR', color: '#ffb020', weight: 30 },
    SSR: { name: 'SSR', color: '#e46bd6', weight: 10 },
  };
  const SLOTS = { outfit: '服裝', head: '頭飾', cape: '披風', weapon: '武器' };
  const LOOK_SLOTS = ['outfit', 'head', 'cape']; // 「穿著Prada的惡魔」只看這三格
  // 系列：裝備欄照系列分組；頭飾、服裝、披風三格都穿同一個系列（而且系列有 fx）就會發動套裝特效，特效只有外觀
  // 排列順序就是裝備欄裡的順序
  const SERIES = {
    zodiac: { name: '生肖', fx: 'redPacket', desc: '穿齊：身邊飄出小紅包和金粉' },
    maid: { name: '女僕咖啡廳', fx: 'heart', desc: '穿齊：站著或走路都會飄出粉色愛心' },
    wedding: { name: '婚禮', fx: 'petal', desc: '穿齊：走到哪裡都飄著花瓣' },
    forest: { name: '森林布偶', fx: 'butterfly', desc: '穿齊：身邊飛出小蝴蝶' },
    typhoon: { name: '防颱', desc: '這個系列沒有披風，純收藏' },
    hualien: { name: '花蓮副本', desc: '打倒花蓮王才會掉的武器' },
    single: { name: '單品', desc: '不成套，隨你搭' },
  };

  const GEAR = {
    // 服裝 10 件：R 4、SR 4、SSR 2
    pajamas: { slot: 'outfit', name: '條紋睡衣', rarity: 'R', series: 'single', icon: '🛌' },
    overalls: { slot: 'outfit', name: '格子吊帶褲', rarity: 'R', series: 'single', icon: '👖' },
    sailor: { slot: 'outfit', name: '水手服', rarity: 'R', series: 'single', icon: '⚓' },
    courier: { slot: 'outfit', name: '外送員雨衣', rarity: 'R', series: 'typhoon', icon: '🛵' },
    bear: { slot: 'outfit', name: '熊熊布偶裝', rarity: 'SR', series: 'forest', icon: '🐻' },
    croc: { slot: 'outfit', name: '鱷魚布偶裝', rarity: 'SR', series: 'forest', icon: '🐊' },
    astronaut: { slot: 'outfit', name: '太空人裝', rarity: 'SR', series: 'single', icon: '🧑‍🚀' },
    bubbletea: { slot: 'outfit', name: '珍珠奶茶裝', rarity: 'SR', series: 'single', icon: '🧋' },
    tuxedo: { slot: 'outfit', name: '婚禮燕尾服', rarity: 'SSR', series: 'wedding', icon: '🤵' },
    gown: { slot: 'outfit', name: '婚禮白紗', rarity: 'SSR', series: 'wedding', icon: '👰' },
    // 頭飾 5 件：R 2、SR 2、SSR 1
    catGray: { slot: 'head', name: '灰色貓咪頭飾', rarity: 'R', series: 'forest', icon: '🐱' },
    catOrange: { slot: 'head', name: '橘色貓咪頭飾', rarity: 'R', series: 'forest', icon: '🐈' },
    apple: { slot: 'head', name: '蘋果帽', rarity: 'SR', series: 'single', icon: '🍎' },
    umbrella: { slot: 'head', name: '小雨傘帽', rarity: 'SR', series: 'typhoon', icon: '☂️' },
    crown: { slot: 'head', name: '星星皇冠', rarity: 'SSR', series: 'wedding', icon: '👑' },
    // 披風 5 件：R 2、SR 2、SSR 1
    heroCape: { slot: 'cape', name: '英雄紅披風', rarity: 'R', series: 'single', icon: '🦸' },
    blanket: { slot: 'cape', name: '格紋毛毯披風', rarity: 'R', series: 'single', icon: '🧣' },
    devil: { slot: 'cape', name: '惡魔翅膀', rarity: 'SR', series: 'single', icon: '😈' },
    pigBalloon: { slot: 'cape', name: '佩佩豬氣球', rarity: 'SR', series: 'single', icon: '🎈' },
    angel: { slot: 'cape', name: '天使翅膀', rarity: 'SSR', series: 'single', icon: '😇' },
    // 第二批：服裝 4、頭飾 3、披風 3
    raincoat: { slot: 'outfit', name: '黃色小雨衣', rarity: 'R', series: 'typhoon', icon: '🧥' },
    chef: { slot: 'outfit', name: '泡麵廚師服', rarity: 'R', series: 'single', icon: '👨‍🍳' },
    tiger: { slot: 'outfit', name: '老虎布偶裝', rarity: 'SR', series: 'zodiac', icon: '🐯' },
    typhoonSuit: { slot: 'outfit', name: '薔琵布偶裝', rarity: 'SSR', series: 'typhoon', icon: '🌀' },
    hardhat: { slot: 'head', name: '防颱安全帽', rarity: 'R', series: 'typhoon', icon: '⛑️' },
    bunny: { slot: 'head', name: '兔兔耳朵', rarity: 'SR', series: 'zodiac', icon: '🐰' },
    unicorn: { slot: 'head', name: '獨角獸角', rarity: 'SSR', series: 'single', icon: '🦄' },
    rainbowCape: { slot: 'cape', name: '彩虹披風', rarity: 'R', series: 'single', icon: '🌈' },
    butterfly: { slot: 'cape', name: '蝴蝶翅膀', rarity: 'SR', series: 'forest', icon: '🦋' },
    phoenix: { slot: 'cape', name: '鳳凰火焰翅膀', rarity: 'SSR', series: 'single', icon: '🔥' },
    bouquet: { slot: 'cape', name: '捧花彩帶', rarity: 'SR', series: 'wedding', icon: '💐' },
    veil: { slot: 'head', name: '新娘頭紗', rarity: 'SR', series: 'wedding', icon: '👰' },
    // 第三批：生肖、女僕咖啡廳（女僕咖啡廳只在廚房煮泡麵時掉，src: 'cook'）
    horse: { slot: 'outfit', name: '小馬布偶裝', rarity: 'SR', series: 'zodiac', icon: '🐴' },
    dragonCape: { slot: 'cape', name: '舞龍披風', rarity: 'SSR', series: 'zodiac', icon: '🐉' },
    maidBand: { slot: 'head', name: '貓耳女僕髮箍', rarity: 'R', series: 'maid', icon: '🎀', src: 'cook' },
    maid: { slot: 'outfit', name: '女僕裝', rarity: 'SR', series: 'maid', icon: '👗', src: 'cook' },
    butler: { slot: 'outfit', name: '執事服', rarity: 'SR', series: 'maid', icon: '🤵', src: 'cook' },
    heartBow: { slot: 'cape', name: '愛心大蝴蝶結', rarity: 'R', series: 'maid', icon: '💗', src: 'cook' },
    // 武器：花蓮副本（打倒花蓮王才會掉）
    lilyDart: { slot: 'weapon', name: '金針花標', rarity: 'R', series: 'hualien', icon: '🌼', basic: 'lilyDart', dungeon: 'hualien' },
    qixingStaff: { slot: 'weapon', name: '七星潭法杖', rarity: 'SR', series: 'hualien', icon: '🔮', basic: 'pebbleOrb', dungeon: 'hualien' },
    tarokoHammer: { slot: 'weapon', name: '太魯閣戰錘', rarity: 'SSR', series: 'hualien', icon: '🔨', basic: 'marbleSmash', dungeon: 'hualien' },
  };

  // 依稀有度抽一件，盡量抽還沒有的；rare 為 true 時只抽 SR、SSR（打倒颱風的獎勵）
  // src 指定來源（例如 'cook' 只抽廚房掉的）；沒指定就只抽一般獎勵池
  function roll(owned, rare, src) {
    const have = new Set(owned || []);
    // 武器只從副本掉，不會從這裡抽到
    const pool = Object.keys(GEAR).filter(id => !have.has(id) && !GEAR[id].dungeon && (GEAR[id].src || null) === (src || null)
      && (!rare || GEAR[id].rarity !== 'R'));
    if (!pool.length) return null;
    const total = pool.reduce((s, id) => s + RARITY[GEAR[id].rarity].weight, 0);
    let x = Math.random() * total;
    for (const id of pool) { x -= RARITY[GEAR[id].rarity].weight; if (x <= 0) return id; }
    return pool[pool.length - 1];
  }

  // ---------------- 畫法（只在瀏覽器） ----------------
  const W = 2.4;
  // 整套衣服的底：腿、鞋、手臂、身體
  function suit(ctx, C, r, p, o) {
    const legs = o.legs || o.body, shoes = o.shoes || '#2f3b55';
    [[23, 30], [34, 41]].forEach(([x1, x2]) => {
      C.rect(ctx, x1, 62, x2 - x1, 11, r, 0.8); C.fill(ctx, legs, r, null); C.stroke(ctx, r, W);
      C.blob(ctx, (x1 + x2) / 2 + (x1 < 30 ? -1 : 1), 74, 6, 3.5, r, 0.06); C.fill(ctx, shoes, r, null); C.stroke(ctx, r, W);
    });
    [[13, -0.5], [51, 0.5]].forEach(([x, tilt]) => {
      C.blob(ctx, x, 54, 5.4, 9.4, r, 0.08); C.fill(ctx, o.sleeve || o.body, r, null); C.stroke(ctx, r, W);
      C.blob(ctx, x + tilt * 2, 63, 3.6, 3.4, r, 0.1); C.fill(ctx, o.hands || p.skin, r, null); C.stroke(ctx, r, 2);
    });
    const hem = o.hem || 67;
    ctx.beginPath();
    ctx.moveTo(18.5, 46.5); ctx.quadraticCurveTo(32, 41.5, 45.5, 46.5);
    ctx.quadraticCurveTo(50, 58, 49 + (hem - 67) * 0.4, hem); ctx.quadraticCurveTo(32, hem + 3, 15 - (hem - 67) * 0.4, hem);
    ctx.quadraticCurveTo(14, 58, 18.5, 46.5); ctx.closePath();
    C.fill(ctx, o.body, r, [12, 41, 40, hem - 38], 1.2); C.stroke(ctx, r, W);
  }
  const dot = (ctx, x, y, rad, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); };
  // 布偶裝的帽兜：頭後面一大圈，加上耳朵之類
  function hood(ctx, C, r, color) {
    C.blob(ctx, 32, 28, 24, 23, r, 0.05); C.fill(ctx, color, r, [8, 5, 48, 46]); C.stroke(ctx, r, W);
  }

  const DRAW = {
    pajamas: { front(ctx, C, r, p) {
      suit(ctx, C, r, p, { body: '#bcd4ea', legs: '#bcd4ea', shoes: '#ffffff' });
      ctx.save(); ctx.beginPath(); ctx.rect(10, 44, 44, 32); ctx.clip();
      for (let x = 16; x < 50; x += 5) C.line(ctx, x, 44, x, 76, r, 1.8, '#ffffff', 0.4);
      ctx.restore();
      [51, 56, 61].forEach(y => dot(ctx, 32, y, 1.6, '#4f7cc2'));
      C.line(ctx, 25, 46, 32, 50, r, 1.6, C.INK, 0.3); C.line(ctx, 39, 46, 32, 50, r, 1.6, C.INK, 0.3);
    } },
    overalls: { front(ctx, C, r, p) {
      suit(ctx, C, r, p, { body: '#fbfbf8', sleeve: '#fbfbf8', legs: '#f2c14e', shoes: '#8a5a3a' });
      C.rect(ctx, 20, 52, 24, 15, r, 0.8); C.fill(ctx, '#f2c14e', r, null);
      C.plaid(ctx, 20, 52, 24, 15, 6, 'rgba(184,67,0,0.45)', r, 1.4);
      C.rect(ctx, 20, 52, 24, 15, r, 0.8); C.stroke(ctx, r, 2);
      C.line(ctx, 22, 46, 23, 53, r, 2.6, '#b84300', 0.3); C.line(ctx, 42, 46, 41, 53, r, 2.6, '#b84300', 0.3);
      [[23, 53], [41, 53]].forEach(([x, y]) => dot(ctx, x, y, 1.5, '#ffffff'));
      C.rect(ctx, 27, 56, 10, 6, r, 0.5); C.stroke(ctx, r, 1.4);
    } },
    sailor: { front(ctx, C, r, p) {
      suit(ctx, C, r, p, { body: '#fbfbf8', legs: '#2f3b55', shoes: '#2b2a33' });
      ctx.beginPath(); ctx.moveTo(19, 46); ctx.lineTo(45, 46); ctx.lineTo(41, 54); ctx.lineTo(32, 58); ctx.lineTo(23, 54); ctx.closePath();
      C.fill(ctx, '#2f3b55', r, null); C.stroke(ctx, r, 2);
      C.line(ctx, 22, 48.5, 32, 55, r, 1.4, '#ffffff', 0.2); C.line(ctx, 42, 48.5, 32, 55, r, 1.4, '#ffffff', 0.2);
      ctx.beginPath(); ctx.moveTo(29, 56); ctx.lineTo(35, 56); ctx.lineTo(33, 62); ctx.lineTo(31, 62); ctx.closePath();
      C.fill(ctx, '#e8384f', r, null); C.stroke(ctx, r, 1.4);
      C.line(ctx, 17, 64.5, 47, 64.5, r, 2, '#2f3b55', 0.3);
    } },
    courier: { front(ctx, C, r, p) {
      suit(ctx, C, r, p, { body: '#9fd36b', legs: '#2f3b55', shoes: '#2b2a33' });
      [52, 60].forEach(y => C.line(ctx, 16, y, 48, y, r, 2.6, '#f2f4f8', 0.3));
      C.rect(ctx, 26, 48, 12, 3, r, 0.3); C.fill(ctx, '#2f3b55', r, null);
      C.line(ctx, 32, 47, 32, 66, r, 1.4, C.INK, 0.3);
    } },
    bear: {
      back(ctx, C, r) {
        [[13, 8], [51, 8]].forEach(([x, y]) => {
          C.blob(ctx, x, y, 8, 8, r, 0.06); C.fill(ctx, '#a0663e', r, null); C.stroke(ctx, r, W);
          C.blob(ctx, x, y, 4, 4, r, 0.1, 12); C.fill(ctx, '#e8c39a', r, null);
        });
        hood(ctx, C, r, '#a0663e');
      },
      front(ctx, C, r, p) {
        suit(ctx, C, r, p, { body: '#a0663e', hands: '#a0663e', legs: '#a0663e', shoes: '#a0663e' });
        C.blob(ctx, 32, 58, 10, 8, r, 0.06); C.fill(ctx, '#e8c39a', r, null); C.stroke(ctx, r, 1.8);
        [[26, 76], [38, 76]].forEach(([x, y]) => dot(ctx, x, y, 1.4, '#e8c39a'));
      },
    },
    croc: {
      back(ctx, C, r) {
        // 尾巴從屁股後面翹出來
        ctx.beginPath(); ctx.moveTo(42, 64); ctx.quadraticCurveTo(62, 70, 70, 58); ctx.quadraticCurveTo(64, 76, 40, 72); ctx.closePath();
        C.fill(ctx, '#5fae6b', r, null); C.stroke(ctx, r, W);
        [[56, 67], [63, 63]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x, y - 4); ctx.lineTo(x + 3, y - 1); ctx.closePath(); C.fill(ctx, '#4a8f55', r, null); });
        hood(ctx, C, r, '#5fae6b');
        // 頭頂上長長的鱷魚嘴和眼睛
        C.blob(ctx, 34, 7, 24, 7, r, 0.05); C.fill(ctx, '#5fae6b', r, null); C.stroke(ctx, r, W);
        [[54, 4.5], [56, 6.5]].forEach(([x, y]) => dot(ctx, x, y, 0.9, C.INK));
        for (let x = 14; x < 56; x += 4) { ctx.beginPath(); ctx.moveTo(x, 11); ctx.lineTo(x + 2, 14.5); ctx.lineTo(x + 4, 11); ctx.fillStyle = '#ffffff'; ctx.fill(); }
        [[24, 0], [40, 0]].forEach(([x, y]) => {
          C.blob(ctx, x, y + 1, 5, 5, r, 0.06, 12); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 2);
          dot(ctx, x, y + 1.5, 2, C.INK);
        });
      },
      front(ctx, C, r, p) {
        suit(ctx, C, r, p, { body: '#5fae6b', hands: '#5fae6b', legs: '#5fae6b', shoes: '#4a8f55' });
        ctx.save(); C.blob(ctx, 32, 58, 9, 10, r, 0.06); C.fill(ctx, '#f4efc4', r, null); C.stroke(ctx, r, 1.8);
        [53, 57, 61].forEach(y => C.line(ctx, 25, y, 39, y, r, 1.2, 'rgba(43,42,51,0.5)', 0.3));
        ctx.restore();
        [[20, 50], [44, 50], [18, 60], [46, 60]].forEach(([x, y]) => dot(ctx, x, y, 1.3, '#4a8f55'));
      },
    },
    astronaut: {
      back(ctx, C, r) { C.rect(ctx, 12, 40, 40, 26, r, 1); C.fill(ctx, '#c3c9d3', r, null); C.stroke(ctx, r, W); },
      front(ctx, C, r, p) {
        suit(ctx, C, r, p, { body: '#f2f4f8', hands: '#c3c9d3', legs: '#f2f4f8', shoes: '#9aa3b5' });
        C.rect(ctx, 25, 51, 14, 9, r, 0.6); C.fill(ctx, '#2f3b55', r, null); C.stroke(ctx, r, 1.6);
        [[28.5, 55.5, '#e8384f'], [32, 55.5, '#ffd23f'], [35.5, 55.5, '#7be08f']].forEach(([x, y, c]) => dot(ctx, x, y, 1.3, c));
        C.line(ctx, 16, 63, 48, 63, r, 2.2, '#ff7a2f', 0.3);
      },
      over(ctx, C, r) {
        // 透明的頭盔
        ctx.save(); ctx.globalAlpha = 0.22;
        C.blob(ctx, 32, 27, 23, 22, r, 0.02); ctx.fillStyle = '#bfe6ff'; ctx.fill(); ctx.restore();
        C.blob(ctx, 32, 27, 23, 22, r, 0.02); C.stroke(ctx, r, W);
        ctx.save(); ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(32, 27, 18, Math.PI * 1.15, Math.PI * 1.45);
        C.stroke(ctx, r, 3, '#ffffff'); ctx.restore();
      },
    },
    bubbletea: { front(ctx, C, r, p) {
      suit(ctx, C, r, p, { body: '#e8c39a', sleeve: '#e8c39a', legs: '#e8c39a', shoes: '#6b4a32', hem: 70 });
      C.rect(ctx, 16, 46, 32, 4, r, 0.4); C.fill(ctx, '#fbfbf8', r, null); C.stroke(ctx, r, 1.6);
      [[21, 64], [27, 66], [33, 64], [39, 66], [44, 64], [24, 60], [36, 61], [30, 68]].forEach(([x, y]) => {
        C.blob(ctx, x, y, 2.6, 2.6, r, 0.1, 10); C.fill(ctx, '#3a2a26', r, null);
      });
      C.line(ctx, 40, 52, 54, 30, r, 3.4, '#e8384f', 0.3);
    } },
    tuxedo: { front(ctx, C, r, p) {
      // 燕尾：身體後面兩條尾巴
      [[24, 1], [40, -1]].forEach(([x]) => {
        ctx.beginPath(); ctx.moveTo(x - 6, 62); ctx.lineTo(x + 6, 62); ctx.lineTo(x + (x < 32 ? -2 : 6), 76); ctx.lineTo(x - (x < 32 ? 8 : 0), 75); ctx.closePath();
        C.fill(ctx, '#2b2a33', r, null); C.stroke(ctx, r, 2);
      });
      suit(ctx, C, r, p, { body: '#2b2a33', legs: '#2b2a33', shoes: '#131a28' });
      ctx.beginPath(); ctx.moveTo(25, 46); ctx.lineTo(39, 46); ctx.lineTo(32, 64); ctx.closePath();
      C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 1.6);
      ctx.beginPath(); ctx.moveTo(27, 47); ctx.lineTo(32, 49.5); ctx.lineTo(27, 52); ctx.closePath(); ctx.moveTo(37, 47); ctx.lineTo(32, 49.5); ctx.lineTo(37, 52); ctx.closePath();
      C.fill(ctx, '#2b2a33', r, null);
      [55, 59].forEach(y => dot(ctx, 32, y, 1.1, '#2b2a33'));
      C.blob(ctx, 23, 51, 2.6, 2.6, r, 0.15, 10); C.fill(ctx, '#e8384f', r, null); C.stroke(ctx, r, 1);
    } },
    gown: {
      // 頭紗另外做成「新娘頭紗」頭飾（veil），白紗本身不帶頭紗
      front(ctx, C, r, p) {
        [[13, -0.5], [51, 0.5]].forEach(([x, tilt]) => {
          C.blob(ctx, x, 54, 5, 9, r, 0.08); C.fill(ctx, '#fbfbf8', r, null); C.stroke(ctx, r, W);
          C.blob(ctx, x + tilt * 2, 63, 3.6, 3.4, r, 0.1); C.fill(ctx, p.skin, r, null); C.stroke(ctx, r, 2);
        });
        // 長到地上的蓬蓬裙
        ctx.beginPath();
        ctx.moveTo(19, 46.5); ctx.quadraticCurveTo(32, 41.5, 45, 46.5); ctx.quadraticCurveTo(47, 55, 44, 58);
        ctx.quadraticCurveTo(56, 68, 56, 78); ctx.quadraticCurveTo(32, 82, 8, 78); ctx.quadraticCurveTo(8, 68, 20, 58);
        ctx.quadraticCurveTo(17, 55, 19, 46.5); ctx.closePath();
        C.fill(ctx, '#fbfbf8', r, [8, 41, 48, 40], 1.2); C.stroke(ctx, r, W);
        C.line(ctx, 20, 58, 44, 58, r, 1.8, '#f4a3c0', 0.3);
        for (let x = 12; x < 54; x += 5) dot(ctx, x, 75, 1.2, '#d6dae1');
        [[24, 66], [38, 70], [30, 72], [42, 64]].forEach(([x, y]) => dot(ctx, x, y, 1.5, '#f4a3c0'));
        C.blob(ctx, 32, 60, 4, 3, r, 0.15, 10); C.fill(ctx, '#f4a3c0', r, null); C.stroke(ctx, r, 1.2);
      },
    },
    catGray: { head(ctx, C, r) { catEars(ctx, C, r, '#9aa3b5', null); } },
    catOrange: { head(ctx, C, r) { catEars(ctx, C, r, '#ff9a4a', '#d9661e'); } },
    apple: { head(ctx, C, r) {
      C.blob(ctx, 32, 6, 17, 10, r, 0.05); C.fill(ctx, '#e8384f', r, [15, -4, 34, 20]); C.stroke(ctx, r, W);
      C.blob(ctx, 26, 2, 4, 2, r, 0.1, 10); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
      C.line(ctx, 32, -3, 33, -10, r, 2.6, '#6b4a32', 0.3);
      ctx.beginPath(); ctx.moveTo(33, -8); ctx.quadraticCurveTo(40, -14, 44, -8); ctx.quadraticCurveTo(39, -5, 33, -8); ctx.closePath();
      C.fill(ctx, '#6baf7b', r, null); C.stroke(ctx, r, 1.6);
    } },
    umbrella: { head(ctx, C, r) {
      C.line(ctx, 32, 9, 32, -6, r, 2, C.INK, 0.2);
      ctx.beginPath(); ctx.moveTo(14, -4); ctx.quadraticCurveTo(32, -26, 50, -4);
      for (let i = 3; i >= 0; i--) ctx.quadraticCurveTo(14 + (i + 0.5) * 9, -7, 14 + i * 9, -4);
      ctx.closePath(); C.fill(ctx, '#4f7cc2', r, null); C.stroke(ctx, r, W);
      ctx.save(); ctx.beginPath(); ctx.moveTo(32, -17); ctx.lineTo(23, -5); ctx.lineTo(32, -5); ctx.closePath(); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.restore();
      dot(ctx, 32, -18, 1.8, C.INK);
    } },
    crown: { head(ctx, C, r) {
      ctx.beginPath(); ctx.moveTo(18, 12); ctx.lineTo(18, -2); ctx.lineTo(24, 5); ctx.lineTo(32, -6); ctx.lineTo(40, 5); ctx.lineTo(46, -2); ctx.lineTo(46, 12); ctx.closePath();
      C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, W);
      [[18, -3], [32, -7], [46, -3]].forEach(([x, y]) => star(ctx, C, r, x, y, 3.6, '#ff6b81'));
      [[25, 8.5, '#4f7cc2'], [32, 8.5, '#e8384f'], [39, 8.5, '#7be08f']].forEach(([x, y, c]) => dot(ctx, x, y, 1.8, c));
    } },
    heroCape: {
      cape(ctx, C, r) {
        ctx.beginPath(); ctx.moveTo(14, 44); ctx.lineTo(50, 44); ctx.quadraticCurveTo(64, 62, 66, 79); ctx.quadraticCurveTo(58, 75, 52, 79); ctx.quadraticCurveTo(32, 75, 12, 79); ctx.quadraticCurveTo(6, 75, -2, 79); ctx.quadraticCurveTo(0, 62, 14, 44); ctx.closePath();
        C.fill(ctx, '#e8384f', r, [-2, 44, 68, 36]); C.stroke(ctx, r, W);
        C.line(ctx, 4, 72, 10, 56, r, 1.4, 'rgba(255,255,255,0.4)', 0.3); C.line(ctx, 60, 72, 54, 56, r, 1.4, 'rgba(120,0,20,0.35)', 0.3);
      },
      clasp(ctx, C, r) {
        [[17, 1], [47, -1]].forEach(([x, k]) => {
          ctx.beginPath(); ctx.moveTo(x - k * 3, 44); ctx.quadraticCurveTo(x + k * 8, 45, 32 - k * 3, 48.5); ctx.lineTo(x, 50); ctx.closePath();
          C.fill(ctx, '#e8384f', r, null); C.stroke(ctx, r, 1.8);
        });
        star(ctx, C, r, 32, 48.5, 4, '#ffd23f');
      },
    },
    blanket: {
      cape(ctx, C, r) {
        const path = () => { ctx.beginPath(); ctx.moveTo(12, 42); ctx.lineTo(52, 42); ctx.lineTo(62, 74); ctx.lineTo(2, 74); ctx.closePath(); };
        path(); C.fill(ctx, '#6baf7b', r, null);
        ctx.save(); ctx.clip(); C.plaid(ctx, 0, 40, 64, 36, 7, 'rgba(255,255,255,0.75)', r, 2); C.plaid(ctx, 3, 43, 64, 36, 14, 'rgba(184,67,0,0.4)', r, 1.4); ctx.restore();
        path(); C.stroke(ctx, r, W);
        for (let x = 4; x < 62; x += 4) C.line(ctx, x, 74, x, 78, r, 1.4, '#6baf7b', 0.3);
      },
      clasp(ctx, C, r) {
        // 毯子圍在脖子上
        C.blob(ctx, 32, 46, 16, 5, r, 0.08); C.fill(ctx, '#6baf7b', r, null);
        ctx.save(); ctx.clip(); C.plaid(ctx, 14, 40, 36, 12, 5, 'rgba(255,255,255,0.75)', r, 1.6); ctx.restore();
        C.blob(ctx, 32, 46, 16, 5, r, 0.08); C.stroke(ctx, r, 2);
      },
    },
    devil: { cape(ctx, C, r) { wings(ctx, C, r, '#5b3a7a', true); } },
    angel: { cape(ctx, C, r) { featherWings(ctx, C, r); } },
    pigBalloon: { cape(ctx, C, r) {
      ctx.beginPath(); ctx.moveTo(54, 60); ctx.quadraticCurveTo(62, 30, 58, 2); C.stroke(ctx, r, 1.4);
      // 粉紅色小豬氣球
      C.blob(ctx, 58, -12, 15, 13, r, 0.04); C.fill(ctx, '#f7a8c4', r, [43, -25, 30, 26]); C.stroke(ctx, r, W);
      [[48, -24], [66, -24]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 4, y + 4); ctx.lineTo(x, y - 3); ctx.lineTo(x + 4, y + 4); ctx.closePath(); C.fill(ctx, '#f7a8c4', r, null); C.stroke(ctx, r, 1.8); });
      C.blob(ctx, 66, -10, 6, 5, r, 0.06, 12); C.fill(ctx, '#f48fb1', r, null); C.stroke(ctx, r, 1.8);
      [[64.5, -10], [67.5, -10]].forEach(([x, y]) => dot(ctx, x, y, 1, '#c2185b'));
      [[52, -15], [58, -16]].forEach(([x, y]) => dot(ctx, x, y, 1.5, C.INK));
      dot(ctx, 52, -7, 2.4, 'rgba(232,56,79,0.35)');
      ctx.beginPath(); ctx.moveTo(56, 1); ctx.lineTo(60, 1); ctx.lineTo(58, -2); ctx.closePath(); C.fill(ctx, '#f48fb1', r, null);
    } },
    raincoat: {
      back(ctx, C, r) { hood(ctx, C, r, '#ffd23f'); },
      front(ctx, C, r, p) {
        suit(ctx, C, r, p, { body: '#ffd23f', sleeve: '#ffd23f', legs: '#4f7cc2', shoes: '#e8384f', hem: 69 });
        C.line(ctx, 32, 47, 32, 68, r, 1.6, C.INK, 0.3);
        [52, 58, 64].forEach(y => dot(ctx, 35, y, 1.5, '#ffffff'));
        C.rect(ctx, 20, 60, 8, 5, r, 0.4); C.stroke(ctx, r, 1.4);
      },
    },
    chef: {
      front(ctx, C, r, p) {
        suit(ctx, C, r, p, { body: '#fbfbf8', sleeve: '#fbfbf8', legs: '#2f3b55', shoes: '#2b2a33' });
        [[28, 52], [36, 52], [28, 58], [36, 58]].forEach(([x, y]) => dot(ctx, x, y, 1.4, '#9aa3b5'));
        ctx.beginPath(); ctx.moveTo(22, 46); ctx.lineTo(32, 51); ctx.lineTo(42, 46); C.stroke(ctx, r, 2, '#e8384f');
      },
      over(ctx, C, r) {
        // 高高的廚師帽
        C.rect(ctx, 20, 2, 24, 9, r, 0.6); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, W);
        [[22, -4, 8], [32, -8, 10], [42, -4, 8]].forEach(([x, y, rr]) => { C.blob(ctx, x, y, rr, rr * 0.85, r, 0.08); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 2); });
        C.rect(ctx, 20, 2, 24, 9, r, 0.6); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, W);
      },
    },
    tiger: {
      back(ctx, C, r) {
        [[14, 8], [50, 8]].forEach(([x, y]) => {
          C.blob(ctx, x, y, 7, 7, r, 0.06); C.fill(ctx, '#ff9a3c', r, null); C.stroke(ctx, r, W);
          C.blob(ctx, x, y, 3.5, 3.5, r, 0.1, 12); C.fill(ctx, '#fbfbf8', r, null);
        });
        hood(ctx, C, r, '#ff9a3c');
        [[20, 10, 26, 16], [44, 10, 38, 16], [32, 5, 32, 12]].forEach(([a, b, c, d]) => C.line(ctx, a, b, c, d, r, 2.6, C.INK, 0.3));
        // 尾巴
        ctx.beginPath(); ctx.moveTo(44, 66); ctx.quadraticCurveTo(62, 66, 60, 50); C.stroke(ctx, r, 6, C.INK); C.stroke(ctx, r, 3.6, '#ff9a3c');
      },
      front(ctx, C, r, p) {
        suit(ctx, C, r, p, { body: '#ff9a3c', hands: '#fbfbf8', legs: '#ff9a3c', shoes: '#fbfbf8' });
        C.blob(ctx, 32, 58, 9, 8, r, 0.06); C.fill(ctx, '#fbfbf8', r, null); C.stroke(ctx, r, 1.8);
        [[17, 50, 22, 52], [47, 50, 42, 52], [16, 58, 21, 59], [48, 58, 43, 59]].forEach(([a, b, c, d]) => C.line(ctx, a, b, c, d, r, 2, C.INK, 0.3));
      },
    },
    typhoonSuit: {
      back(ctx, C, r) {
        // 軟綿綿的雲朵帽兜，頂上一個小漩渦
        [[12, 20, 10], [52, 20, 10], [20, 8, 11], [44, 8, 11], [32, 3, 12]].forEach(([x, y, rr]) => {
          C.blob(ctx, x, y, rr, rr * 0.9, r, 0.08); C.fill(ctx, '#f2f4f8', r, null); C.stroke(ctx, r, W);
        });
        hood(ctx, C, r, '#f2f4f8');
        ctx.beginPath(); ctx.arc(32, -8, 4.5, 0.3, 5.4); C.stroke(ctx, r, 2.4, '#ff7a2f');
      },
      front(ctx, C, r, p) {
        suit(ctx, C, r, p, { body: '#f2f4f8', hands: '#f2f4f8', legs: '#f2f4f8', shoes: '#d6dae1', hem: 70 });
        ctx.beginPath(); ctx.arc(32, 58, 7, 0.2, 5.6); C.stroke(ctx, r, 2.4, '#4f7cc2');
        ctx.beginPath(); ctx.arc(32, 58, 3, 0.6, 5.2); C.stroke(ctx, r, 2, '#4f7cc2');
        [[20, 54], [44, 54]].forEach(([x, y]) => dot(ctx, x, y, 2.6, 'rgba(244,120,140,0.5)'));
      },
    },
    hardhat: { head(ctx, C, r) {
      C.blob(ctx, 32, 8, 19, 11, r, 0.04); C.fill(ctx, '#ffd23f', r, [13, -3, 38, 22]); C.stroke(ctx, r, W);
      C.rect(ctx, 10, 11, 44, 4, r, 0.4); C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, 2);
      C.line(ctx, 32, -2, 32, 10, r, 3, '#f2b800', 0.2);
      ctx.fillStyle = '#e8384f'; ctx.font = '900 7px sans-serif'; ctx.fillText('防颱', 24, 8);
    } },
    bunny: { head(ctx, C, r) {
      [[23, -0.18], [41, 0.18]].forEach(([x, t]) => {
        ctx.save(); ctx.translate(x, 6); ctx.rotate(t);
        C.blob(ctx, 0, -12, 6, 15, r, 0.05); C.fill(ctx, '#fbfbf8', r, null); C.stroke(ctx, r, W);
        C.blob(ctx, 0, -11, 2.8, 10, r, 0.08, 12); ctx.fillStyle = '#f7a8c4'; ctx.fill();
        ctx.restore();
      });
    } },
    unicorn: { head(ctx, C, r) {
      // 彩虹條紋的角，旁邊兩朵小花
      ctx.beginPath(); ctx.moveTo(26, 6); ctx.lineTo(32, -22); ctx.lineTo(38, 6); ctx.closePath();
      C.fill(ctx, '#fff4c9', r, null);
      ctx.save(); ctx.clip(); ['#ff8fab', '#ffd23f', '#7be0a6', '#8fd3ff', '#b39cff'].forEach((c, i) => C.line(ctx, 20, 2 - i * 6, 44, -6 - i * 6, r, 2.4, c, 0.2)); ctx.restore();
      ctx.beginPath(); ctx.moveTo(26, 6); ctx.lineTo(32, -22); ctx.lineTo(38, 6); ctx.closePath(); C.stroke(ctx, r, W);
      [[19, 9, '#ff8fab'], [45, 9, '#b39cff']].forEach(([x, y, c]) => {
        for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; C.blob(ctx, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.6, 2.6, r, 0.1, 8); C.fill(ctx, c, r, null); }
        dot(ctx, x, y, 1.8, '#ffd23f');
      });
    } },
    rainbowCape: {
      cape(ctx, C, r) {
        const path = () => { ctx.beginPath(); ctx.moveTo(14, 44); ctx.lineTo(50, 44); ctx.quadraticCurveTo(62, 62, 64, 78); ctx.quadraticCurveTo(32, 82, 0, 78); ctx.quadraticCurveTo(2, 62, 14, 44); ctx.closePath(); };
        path(); C.fill(ctx, '#ff8fab', r, null);
        ctx.save(); path(); ctx.clip();
        ['#ff8fab', '#ffb27a', '#ffd23f', '#7be0a6', '#8fd3ff', '#b39cff'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(-2, 44 + i * 6.4, 68, 6.6); });
        ctx.restore();
        path(); C.stroke(ctx, r, W);
      },
    },
    butterfly: { cape(ctx, C, r) {
      [-1, 1].forEach(k => {
        C.blob(ctx, 32 + k * 27, 28, 17, 16, r, 0.06); C.fill(ctx, '#8fd3ff', r, null); C.stroke(ctx, r, W);
        C.blob(ctx, 32 + k * 24, 54, 11, 10, r, 0.06); C.fill(ctx, '#b39cff', r, null); C.stroke(ctx, r, W);
        dot(ctx, 32 + k * 33, 24, 4.5, '#ffffff'); dot(ctx, 32 + k * 33, 24, 2.2, '#4f7cc2');
        dot(ctx, 32 + k * 28, 57, 2.6, '#ffd23f');
      });
    } },
    phoenix: { cape(ctx, C, r) {
      [-1, 1].forEach(k => {
        // 一層層的火焰羽毛，外紅內黃
        [[46, '#e8384f'], [38, '#ff7a2f'], [28, '#ffd23f']].forEach(([len, c]) => {
          ctx.beginPath(); ctx.moveTo(32 + k * 6, 54);
          ctx.quadraticCurveTo(32 + k * len * 0.6, 14, 32 + k * len, 10);
          ctx.quadraticCurveTo(32 + k * (len - 6), 24, 32 + k * len * 0.95, 30);
          ctx.quadraticCurveTo(32 + k * (len - 8), 38, 32 + k * len * 0.85, 46);
          ctx.quadraticCurveTo(32 + k * len * 0.5, 50, 32 + k * 10, 62);
          ctx.closePath(); C.fill(ctx, c, r, null); C.stroke(ctx, r, len === 46 ? W : 1.4);
        });
      });
    } },
  };

  // ---------- 第三批：生肖、女僕咖啡廳 ----------
  Object.assign(DRAW, {
    horse: {
      back(ctx, C, r) {
        // 尖尖的馬耳朵
        [[19, -1], [45, 1]].forEach(([x, k]) => {
          ctx.beginPath(); ctx.moveTo(x - 6, 10); ctx.quadraticCurveTo(x - k, -8, x + k * 3, -9); ctx.quadraticCurveTo(x + k * 7, 0, x + 6, 10); ctx.closePath();
          C.fill(ctx, '#c98a52', r, null); C.stroke(ctx, r, W);
        });
        hood(ctx, C, r, '#c98a52');
        // 鬃毛：從頭頂一路垂到後腦
        [[25, 4], [30, 2], [35, 2], [40, 4], [45, 8], [49, 13]].forEach(([x, y]) => {
          C.blob(ctx, x, y, 4.5, 5.5, r, 0.1, 12); C.fill(ctx, '#6b4a32', r, null); C.stroke(ctx, r, 1.6);
        });
        // 一把馬尾巴
        ctx.beginPath(); ctx.moveTo(44, 62); ctx.quadraticCurveTo(64, 58, 63, 77); ctx.quadraticCurveTo(56, 70, 44, 68); ctx.closePath();
        C.fill(ctx, '#6b4a32', r, null); C.stroke(ctx, r, W);
      },
      front(ctx, C, r, p) {
        suit(ctx, C, r, p, { body: '#c98a52', hands: '#6b4a32', legs: '#c98a52', shoes: '#6b4a32' });
        C.blob(ctx, 32, 58, 9, 8, r, 0.06); C.fill(ctx, '#f0d2a8', r, null); C.stroke(ctx, r, 1.8);
        // 胸前一個小小的金色馬蹄鐵
        ctx.beginPath(); ctx.arc(32, 51, 3.2, Math.PI * 0.15, Math.PI * 0.85, true); C.stroke(ctx, r, 2.2, '#ffd23f');
      },
    },
    dragonCape: {
      cape(ctx, C, r) {
        // 舞龍的龍身：紅色披風、金色鱗片、下襬一圈金色流蘇
        const path = () => { ctx.beginPath(); ctx.moveTo(14, 44); ctx.lineTo(50, 44); ctx.quadraticCurveTo(64, 60, 66, 76); ctx.quadraticCurveTo(32, 82, -2, 76); ctx.quadraticCurveTo(0, 60, 14, 44); ctx.closePath(); };
        path(); C.fill(ctx, '#e8384f', r, [-2, 44, 68, 36]);
        ctx.save(); path(); ctx.clip();
        for (let y = 50; y < 80; y += 6) for (let x = -4 + ((y / 6) % 2) * 4; x < 70; x += 8) {
          ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI); C.stroke(ctx, r, 1.4, '#ffd23f');
        }
        ctx.restore();
        path(); C.stroke(ctx, r, W);
        for (let x = 0; x < 66; x += 3.5) C.line(ctx, x, 77 + Math.sin(x) * 0.6, x, 81, r, 1.6, '#ffb020', 0.3);
        // 肩膀後面探出來的小龍頭
        C.blob(ctx, 2, 42, 9, 7, r, 0.06); C.fill(ctx, '#e8384f', r, null); C.stroke(ctx, r, W);
        [[-1, 35], [5, 34]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 2, y + 3); ctx.lineTo(x, y - 4); ctx.lineTo(x + 2, y + 3); ctx.closePath(); C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, 1.4); });
        dot(ctx, 0, 41, 2.2, '#ffffff'); dot(ctx, 0, 41, 1.1, C.INK);
        C.line(ctx, -6, 45, -12, 48, r, 1.4, '#ffd23f', 0.3); C.line(ctx, -6, 43, -12, 41, r, 1.4, '#ffd23f', 0.3);
      },
      clasp(ctx, C, r) {
        // 脖子前面一顆龍珠
        C.blob(ctx, 32, 48.5, 3.6, 3.6, r, 0.1, 12); C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, 1.6);
        dot(ctx, 31, 47.5, 1, '#ffffff');
      },
    },
    veil: {
      back(ctx, C, r) {
        // 頭紗從頭後面垂下來，半透明
        ctx.save(); ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(14, 18); ctx.quadraticCurveTo(32, 2, 50, 18); ctx.lineTo(58, 64); ctx.quadraticCurveTo(32, 70, 6, 64); ctx.closePath();
        C.fill(ctx, '#f6f8fc', r, null); ctx.restore(); C.stroke(ctx, r, 1.8, '#9aa3b5');
        for (let x = 10; x < 56; x += 6) dot(ctx, x, 63 + Math.sin(x) * 1.5, 1, '#d6dae1');
      },
      head(ctx, C, r) {
        // 頭頂一圈小白花和粉紅花苞
        for (let i = 0; i <= 6; i++) {
          const a = Math.PI * (1.18 + i * 0.107), x = 32 + Math.cos(a) * 18.5, y = 26 + Math.sin(a) * 18.5;
          const col = i % 2 ? '#ffd0e2' : '#ffffff';
          for (let k = 0; k < 5; k++) { const b = k * Math.PI * 2 / 5; C.blob(ctx, x + Math.cos(b) * 2.4, y + Math.sin(b) * 2.4, 2.2, 2.2, r, 0.12, 8); C.fill(ctx, col, r, null); }
          C.blob(ctx, x, y, 3.6, 3.6, r, 0.12, 10); C.stroke(ctx, r, 1);
          dot(ctx, x, y, 1.3, '#ffd23f');
        }
        [[17, 15], [47, 15]].forEach(([x, y]) => { C.blob(ctx, x, y, 3.4, 2, r, 0.12, 10); C.fill(ctx, '#7fd1a8', r, null); C.stroke(ctx, r, 1); });
      },
    },
    bouquet: { cape(ctx, C, r) {
      // 背後斜背著一束捧花，從肩膀上探出來；兩條粉色緞帶從後面飄下來
      [[-1, '#ff8fb8'], [1, '#ffc2da']].forEach(([k, col]) => {
        // 緞帶從背後往兩邊飄出去，在身體兩側露出一截波浪
        ctx.beginPath(); ctx.moveTo(32 + k * 6, 46);
        ctx.bezierCurveTo(32 + k * 30, 50, 32 + k * 16, 64, 32 + k * 34, 76);
        ctx.lineTo(32 + k * 30, 80);
        ctx.bezierCurveTo(32 + k * 10, 66, 32 + k * 24, 54, 32 + k * 2, 50); ctx.closePath();
        C.fill(ctx, col, r, null); C.stroke(ctx, r, 1.6);
      });
      ctx.save(); ctx.translate(55, 26); ctx.rotate(0.65); ctx.scale(1.2, 1.2);
      // 花莖和綁花的蝴蝶結
      C.rect(ctx, -3, 6, 6, 16, r, 0.4); C.fill(ctx, '#7fd1a8', r, null); C.stroke(ctx, r, 1.6);
      [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(k * 7, 6); ctx.lineTo(k * 7, 14); ctx.closePath(); C.fill(ctx, '#ff8fb8', r, null); C.stroke(ctx, r, 1.2); });
      // 一團花：白、粉、淡黃的小花，夾幾片葉子
      [[-8, -2], [8, -2]].forEach(([x, y]) => { C.blob(ctx, x, y + 3, 4.5, 2.4, r, 0.1, 10); C.fill(ctx, '#6baf7b', r, null); C.stroke(ctx, r, 1.2); });
      [[0, -4, '#ffffff'], [-6, 0, '#ffd0e2'], [6, 0, '#fff4c9'], [-3, -10, '#ff8fb8'], [4, -9, '#ffffff'], [0, 2, '#ffb3c8']].forEach(([x, y, c]) => {
        C.blob(ctx, x, y, 5, 5, r, 0.14, 10); C.fill(ctx, c, r, null); C.stroke(ctx, r, 1.4);
        dot(ctx, x, y, 1.4, '#ffd23f');
      });
      ctx.restore();
    } },
    maidBand: { head(ctx, C, r) {
      catEars(ctx, C, r, '#2b2a33', null);
      // 白色蕾絲髮箍沿著頭頂一圈
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * (1.15 + i * 0.0875);
        C.blob(ctx, 32 + Math.cos(a) * 19, 26 + Math.sin(a) * 19, 3, 3, r, 0.12, 10); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 1.2);
      }
      // 側邊一個粉紅小蝴蝶結
      [[-1], [1]].forEach(([k]) => { ctx.beginPath(); ctx.moveTo(48, 10); ctx.lineTo(48 + k * 5, 6); ctx.lineTo(48 + k * 5, 14); ctx.closePath(); C.fill(ctx, '#ff8fb8', r, null); C.stroke(ctx, r, 1.2); });
      dot(ctx, 48, 10, 1.6, '#ff6b9a');
    } },
    maid: { front(ctx, C, r, p) {
      suit(ctx, C, r, p, { body: '#2b2a33', sleeve: '#2b2a33', legs: '#fbfbf8', shoes: '#2b2a33', hem: 69 });
      // 裙襬下面一圈白色荷葉邊
      for (let x = 17; x <= 47; x += 5) { C.blob(ctx, x, 70, 3, 2.2, r, 0.12, 10); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 1); }
      // 白色袖口
      [[13, 61], [51, 61]].forEach(([x, y]) => { C.blob(ctx, x, y, 4.6, 1.8, r, 0.1, 10); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 1); });
      // 白圍裙，邊上一圈小荷葉
      ctx.beginPath(); ctx.moveTo(25, 50); ctx.lineTo(39, 50); ctx.lineTo(41, 66); ctx.quadraticCurveTo(32, 69, 23, 66); ctx.closePath();
      C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 1.6);
      for (let x = 24; x <= 40; x += 4) dot(ctx, x, 67, 1, '#d6dae1');
      C.line(ctx, 22, 55, 42, 55, r, 1.4, '#ffffff', 0.2);
      // 圓圓的白領子和粉紅蝴蝶結
      [[27.5, 47.5], [36.5, 47.5]].forEach(([x, y]) => { C.blob(ctx, x, y, 4.4, 2.8, r, 0.1, 10); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 1.2); });
      [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(32, 49.5); ctx.lineTo(32 + k * 4, 47.5); ctx.lineTo(32 + k * 4, 51.5); ctx.closePath(); C.fill(ctx, '#ff8fb8', r, null); C.stroke(ctx, r, 1); });
      dot(ctx, 32, 49.5, 1.4, '#ff6b9a');
    } },
    butler: { front(ctx, C, r, p) {
      suit(ctx, C, r, p, { body: '#2b2a33', legs: '#2b2a33', shoes: '#131a28', hands: '#ffffff' });
      // 灰背心、白襯衫、黑領結
      ctx.beginPath(); ctx.moveTo(25, 47); ctx.lineTo(39, 47); ctx.lineTo(38, 63); ctx.lineTo(32, 65); ctx.lineTo(26, 63); ctx.closePath();
      C.fill(ctx, '#7a8296', r, null); C.stroke(ctx, r, 1.6);
      ctx.beginPath(); ctx.moveTo(28, 46); ctx.lineTo(36, 46); ctx.lineTo(32, 54); ctx.closePath(); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 1.2);
      ctx.beginPath(); ctx.moveTo(28, 46.5); ctx.lineTo(32, 48.5); ctx.lineTo(28, 50.5); ctx.closePath(); ctx.moveTo(36, 46.5); ctx.lineTo(32, 48.5); ctx.lineTo(36, 50.5); ctx.closePath();
      C.fill(ctx, '#2b2a33', r, null);
      [56, 60].forEach(y => dot(ctx, 32, y, 1.1, '#2b2a33'));
      // 懷錶的金鍊子
      ctx.beginPath(); ctx.moveTo(32, 58); ctx.quadraticCurveTo(35, 61, 38, 58); C.stroke(ctx, r, 1.2, '#ffd23f');
      // 外套翻領
      C.line(ctx, 24, 47, 27, 58, r, 1.6, '#4f5d78', 0.3); C.line(ctx, 40, 47, 37, 58, r, 1.6, '#4f5d78', 0.3);
    } },
    heartBow: { cape(ctx, C, r) {
      // 背後一個超大的粉紅蝴蝶結，兩條緞帶垂下來
      [[-1, 0.15], [1, -0.15]].forEach(([k, t]) => {
        ctx.beginPath(); ctx.moveTo(32 + k * 4, 60); ctx.quadraticCurveTo(32 + k * 14, 70, 32 + k * 12 + t * 20, 80);
        ctx.lineTo(32 + k * 6 + t * 20, 78); ctx.quadraticCurveTo(32 + k * 6, 70, 32, 60); ctx.closePath();
        C.fill(ctx, '#ff8fb8', r, null); C.stroke(ctx, r, 1.8);
        // 蝴蝶結的兩個圈，做成愛心的樣子
        ctx.save(); ctx.translate(32 + k * 20, 50); ctx.rotate(k * 0.5);
        ctx.beginPath(); ctx.moveTo(0, 10); ctx.bezierCurveTo(-16, 0, -10, -13, 0, -5); ctx.bezierCurveTo(10, -13, 16, 0, 0, 10); ctx.closePath();
        C.fill(ctx, '#ff8fb8', r, null); C.stroke(ctx, r, W);
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.bezierCurveTo(-7, 0, -5, -7, 0, -3); ctx.bezierCurveTo(5, -7, 7, 0, 0, 5); ctx.closePath();
        ctx.fillStyle = '#ffd0e2'; ctx.fill();
        ctx.restore();
      });
    } },
  });

  function star(ctx, C, r, x, y, rr, color) {
    ctx.save(); ctx.translate(x, y); ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? rr * 0.45 : rr; ctx.lineTo(Math.cos(a) * k, Math.sin(a) * k); }
    ctx.closePath(); C.fill(ctx, color, r, null); C.stroke(ctx, r, 1.2); ctx.restore();
  }
  function catEars(ctx, C, r, color, stripe) {
    ctx.beginPath(); ctx.arc(32, 26, 19, Math.PI * 1.1, Math.PI * 1.9); C.stroke(ctx, r, 3.4, C.INK);
    [[18, -1], [46, 1]].forEach(([x, k]) => {
      ctx.beginPath(); ctx.moveTo(x - 7, 12); ctx.lineTo(x + k * 2, -2); ctx.lineTo(x + 7, 12); ctx.closePath();
      C.fill(ctx, color, r, null); C.stroke(ctx, r, W);
      ctx.beginPath(); ctx.moveTo(x - 3.5, 10.5); ctx.lineTo(x + k * 1.2, 3); ctx.lineTo(x + 3.5, 10.5); ctx.closePath();
      ctx.fillStyle = '#f4a3a0'; ctx.fill();
      if (stripe) C.line(ctx, x - 5, 8, x - 1, 5, r, 1.6, stripe, 0.2);
    });
  }
  // 天使翅膀：上緣一道平順的大圓弧，外下緣一球一球的大圓羽毛往內收成尖角，裡面幾道跟著圓羽走的弧線；頭上一圈光環
  // 右邊的翅膀畫好，左邊用鏡像；人物框左右各只多 16，最外面不要超過 x=79
  // open 為 true 時不畫靠身體那一邊（裡面的小翅膀線只要上緣和圓羽）
  function angelWingPath(ctx, open) {
    ctx.beginPath();
    if (open) ctx.moveTo(42, 30);
    else { ctx.moveTo(44, 49); ctx.quadraticCurveTo(39, 40, 42, 30); }
    ctx.quadraticCurveTo(50, 11, 69, 9);
    ctx.quadraticCurveTo(80, 8, 78, 18);
    const lobes = [[78, 18], [76, 28], [70, 36], [62, 42], [53, 47], [44, 49]];
    for (let i = 1; i < lobes.length; i++) {
      const [x0, y0] = lobes[i - 1], [x1, y1] = lobes[i];
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
      // 往外（線段的左手邊）鼓起來
      ctx.quadraticCurveTo(mx + dy / d * 8, my - dx / d * 8, x1, y1);
    }
    if (!open) ctx.closePath();
  }
  function featherWings(ctx, C, r) {
    [1, -1].forEach(k => {
      ctx.save();
      if (k < 0) { ctx.translate(64, 0); ctx.scale(-1, 1); }
      ctx.translate(-5, 9); // 往下移到背後；外緣的圓羽會往外鼓，往內收一點才不會被人物框切掉
      angelWingPath(ctx); C.fill(ctx, '#fbfdff', r, [41, 6, 38, 48]);
      ctx.save(); angelWingPath(ctx); ctx.clip(); ctx.globalAlpha = 0.4;
      C.blob(ctx, 64, 44, 16, 9, r, 0.08); ctx.fillStyle = '#c4e2f6'; ctx.fill(); ctx.restore();
      angelWingPath(ctx); C.stroke(ctx, r, W);
      // 裡面一個縮小的翅膀輪廓（淡藍線），像一層小羽毛
      [[0.6, 2.8]].forEach(([k2, w]) => {
        ctx.save(); ctx.translate(50, 46); ctx.scale(k2, k2); ctx.translate(-46, -47);
        angelWingPath(ctx, true); C.stroke(ctx, r, w, '#8fb8d8');
        ctx.restore();
      });
      ctx.restore();
    });
    ctx.save(); ctx.beginPath(); ctx.ellipse(32, -2, 12, 3.5, 0, 0, Math.PI * 2); C.stroke(ctx, r, 4.5, C.INK); C.stroke(ctx, r, 2.6, '#ffd23f'); ctx.restore();
  }
  function wings(ctx, C, r, color, bat) {
    [-1, 1].forEach(k => {
      ctx.beginPath(); ctx.moveTo(32 + k * 8, 50);
      if (bat) {
        ctx.quadraticCurveTo(32 + k * 26, 24, 32 + k * 44, 30);
        ctx.quadraticCurveTo(32 + k * 38, 40, 32 + k * 42, 50);
        ctx.quadraticCurveTo(32 + k * 32, 46, 32 + k * 34, 58);
        ctx.quadraticCurveTo(32 + k * 24, 52, 32 + k * 20, 62);
      } else {
        ctx.quadraticCurveTo(32 + k * 30, 20, 32 + k * 46, 28);
        ctx.quadraticCurveTo(32 + k * 40, 38, 32 + k * 44, 44);
        ctx.quadraticCurveTo(32 + k * 36, 50, 32 + k * 38, 56);
        ctx.quadraticCurveTo(32 + k * 26, 60, 32 + k * 16, 62);
      }
      ctx.closePath();
      C.fill(ctx, color, r, null); C.stroke(ctx, r, W);
      if (!bat) [[30, 34], [34, 44], [28, 52]].forEach(([dx, y]) => {
        ctx.beginPath(); ctx.arc(32 + k * dx, y, 5, k > 0 ? Math.PI * 0.6 : Math.PI * 0.4, k > 0 ? Math.PI * 1.2 : Math.PI * -0.2, k < 0);
        C.stroke(ctx, r, 1.4, '#c3c9d3');
      });
      else C.line(ctx, 32 + k * 12, 50, 32 + k * 40, 31, r, 1.4, 'rgba(255,255,255,0.35)', 0.3);
    });
    if (!bat) {
      // 頭上的光環
      ctx.save(); ctx.beginPath(); ctx.ellipse(32, -2, 12, 3.5, 0, 0, Math.PI * 2); C.stroke(ctx, r, 4.5, C.INK); C.stroke(ctx, r, 2.6, '#ffd23f'); ctx.restore();
    }
  }

  // ---------- 武器（hand 層：畫在右手，人物翻面時跟著翻） ----------
  // 右手在 (51, 63)
  Object.assign(DRAW, {
    lilyDart: { hand(ctx, C, r) {
      // 金針花標：只有一朵金針花（花瓣＋花蕊），像飛鏢一樣捏在手上，放低一點不擋到臉
      ctx.save(); ctx.translate(57, 66); ctx.rotate(0.3);
      for (let i = 0; i < 6; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 3);
        C.blob(ctx, 0, -5, 2.6, 5.4, r, 0.1, 12); C.fill(ctx, i % 2 ? '#ff8a3d' : '#ffa53a', r, null); C.stroke(ctx, r, 1.2);
        ctx.restore();
      }
      dot(ctx, 0, 0, 2.4, '#ffd23f'); C.blob(ctx, 0, 0, 2.4, 2.4, r, 0.1, 10); C.stroke(ctx, r, 1);
      ctx.restore();
    } },
    qixingStaff: { hand(ctx, C, r) {
      // 七星潭法杖：漂流木杖身，頂端一圈七顆彩色小石頭圍著一顆藍色的海水球
      C.line(ctx, 55, 76, 56, 18, r, 5, C.INK, 0.4); C.line(ctx, 55, 76, 56, 18, r, 3, '#b98457', 0.4);
      C.line(ctx, 55, 60, 56, 44, r, 1.2, 'rgba(255,255,255,0.45)', 0.3);
      C.blob(ctx, 56, 10, 8, 8, r, 0.06); C.fill(ctx, '#7fb2e5', r, null); C.stroke(ctx, r, 2);
      ctx.save(); ctx.globalAlpha = 0.85; C.line(ctx, 52, 7, 55, 5, r, 1.6, '#ffffff', 0.2); ctx.restore();
      ['#e8384f', '#ff8a3d', '#ffd23f', '#6baf7b', '#4f7cc2', '#8a5cd6', '#fbfbf8'].forEach((col, i) => {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 7;
        C.blob(ctx, 56 + Math.cos(a) * 12, 10 + Math.sin(a) * 12, 2.8, 2.4, r, 0.12, 10); C.fill(ctx, col, r, null); C.stroke(ctx, r, 1.1);
      });
    } },
    tarokoHammer: { hand(ctx, C, r) {
      // 太魯閣戰錘：木柄＋一大塊有灰色紋路的白色大理石錘頭
      ctx.save(); ctx.translate(52, 66); ctx.rotate(0.28);
      C.line(ctx, 0, 6, 0, -40, r, 5, C.INK, 0.3); C.line(ctx, 0, 6, 0, -40, r, 3, '#8a5a3a', 0.3);
      // 錘頭橫在柄的頂端，兩端包鐵片，看起來才像錘子不像旗子
      C.rect(ctx, -22, -60, 44, 22, r, 1.2); C.fill(ctx, '#dedbd2', r, [-22, -60, 44, 22], 0.6); C.stroke(ctx, r, 2.6);
      [-22, 14].forEach(x => { C.rect(ctx, x, -61, 8, 24, r, 0.6); C.fill(ctx, '#5b6577', r, null); C.stroke(ctx, r, 2); });
      // 大理石紋：一條斜斜的灰紋＋一點亮光
      C.line(ctx, -12, -42, 10, -57, r, 1.6, 'rgba(96,104,120,0.7)', 1.2);
      C.line(ctx, -4, -42, 6, -49, r, 1, 'rgba(96,104,120,0.45)', 0.6);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(-11, -57, 6, 3);
      C.rect(ctx, -4, -40, 8, 4, r, 0.4); C.fill(ctx, '#ffb020', r, null); C.stroke(ctx, r, 1.4);
      ctx.restore();
    } },
  });

  // 某件裝備在某一層有沒有東西要畫
  function hasLayer(id, layer) { return !!(DRAW[id] && DRAW[id][layer]); }
  function drawLayer(ctx, id, layer, p) {
    const C = root.HQ_CRAYON;
    const f = DRAW[id] && DRAW[id][layer];
    if (!f) return;
    const seed = [...(id + layer)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    ctx.save(); f(ctx, C, C.rng(seed), p || {}); ctx.restore();
  }

  // 抽副本武器：none 是什麼都沒掉的機率；抽到的稀有度裡選一把（同稀有度只有一把就是它）
  const DROP = { none: 40, R: 35, SR: 18, SSR: 7 };
  function rollWeapon(dungeon) {
    const total = Object.values(DROP).reduce((a, b) => a + b, 0);
    let x = Math.random() * total, rar = 'none';
    for (const [k, w] of Object.entries(DROP)) { x -= w; if (x <= 0) { rar = k; break; } }
    if (rar === 'none') return null;
    const pool = Object.keys(GEAR).filter(id => GEAR[id].dungeon === dungeon && GEAR[id].rarity === rar);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  // 身上穿齊哪個系列（三格同系列、系列有特效），沒有就是 null
  function setOf(equip) {
    const ids = LOOK_SLOTS.map(s => equip && equip[s]);
    if (!ids.every(id => GEAR[id])) return null;
    const sid = GEAR[ids[0]].series;
    return SERIES[sid] && SERIES[sid].fx && ids.every(id => GEAR[id].series === sid) ? sid : null;
  }

  const gear = { RARITY, SLOTS, LOOK_SLOTS, SERIES, GEAR, setOf, DROP, roll, rollWeapon, hasLayer, drawLayer, LAYERS: ['cape', 'back', 'front', 'head', 'over', 'hand'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = gear;
  else root.HQ_GEAR = gear;
})(this);
