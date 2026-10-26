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
    taipei: { name: '台北101副本', desc: '打倒天龍王才會掉的武器' },
    magical: { name: '魔法少女', fx: 'starTrail', desc: '扭蛋限定。穿齊：走路留下一串星星，站著時腳下亮起魔法陣' },
    wizard: { name: '小巫師', fx: 'rune', desc: '扭蛋限定。穿齊：身邊飄著發光的小書頁和符文' },
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
    // 第四批：扭蛋機限定（src: 'gacha'）
    mgBow: { slot: 'head', name: '星月大蝴蝶結', rarity: 'R', series: 'magical', src: 'gacha' },
    mgDress: { slot: 'outfit', name: '魔法少女蓬蓬裙', rarity: 'SR', series: 'magical', src: 'gacha' },
    mgWings: { slot: 'cape', name: '緞帶星星翅膀', rarity: 'SSR', series: 'magical', src: 'gacha' },
    wzHat: { slot: 'head', name: '歪歪巫師帽', rarity: 'R', series: 'wizard', src: 'gacha' },
    wzRobe: { slot: 'outfit', name: '星空巫師袍', rarity: 'SR', series: 'wizard', src: 'gacha' },
    wzWand: { slot: 'cape', name: '古木魔杖', rarity: 'SSR', series: 'wizard', src: 'gacha' },
    // 武器：花蓮副本（打倒花蓮王才會掉）
    lilyDart: { slot: 'weapon', name: '金針花標', rarity: 'R', series: 'hualien', icon: '🌼', basic: 'lilyDart', dungeon: 'hualien' },
    qixingStaff: { slot: 'weapon', name: '七星潭法杖', rarity: 'SR', series: 'hualien', icon: '🔮', basic: 'pebbleOrb', dungeon: 'hualien' },
    tarokoHammer: { slot: 'weapon', name: '太魯閣戰錘', rarity: 'SSR', series: 'hualien', icon: '🔨', basic: 'marbleSmash', dungeon: 'hualien' },
    // 武器：台北101副本（打倒天龍王才會掉）
    easyCard: { slot: 'weapon', name: '捷運悠遊卡', rarity: 'SR', series: 'taipei', basic: 'cardFlick', dungeon: 'taipei' },
    damperFlail: { slot: 'weapon', name: '阻尼球流星錘', rarity: 'SSR', series: 'taipei', basic: 'damperSwing', dungeon: 'taipei' },
    spireSpear: { slot: 'weapon', name: '101 避雷針長槍', rarity: 'SSR', series: 'taipei', basic: 'spireThrust', dungeon: 'taipei' },
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
        C.blob(ctx, 32 + Math.cos(a) * 18, 28 + Math.sin(a) * 18, 3, 3, r, 0.12, 10); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 1.2);
      }
      // 側邊一個粉紅小蝴蝶結
      [[-1], [1]].forEach(([k]) => { ctx.beginPath(); ctx.moveTo(47, 16); ctx.lineTo(47 + k * 5, 12); ctx.lineTo(47 + k * 5, 20); ctx.closePath(); C.fill(ctx, '#ff8fb8', r, null); C.stroke(ctx, r, 1.2); });
      dot(ctx, 47, 16, 1.6, '#ff6b9a');
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

  // 第四批：扭蛋機限定（src: 'gacha'，只有扭蛋扭得到）——魔法少女、小巫師
  Object.assign(DRAW, {
    mgBow: { head(ctx, C, r) {
      // 頭頂一個粉紅大蝴蝶結，兩條緞帶垂在頭的兩邊，中間是金色星星釦
      [-1, 1].forEach(k => {
        ctx.beginPath(); ctx.moveTo(32 + k * 2, 11); ctx.quadraticCurveTo(32 + k * 10, 15, 32 + k * 13, 22);
        ctx.lineTo(32 + k * 8, 21.5); ctx.quadraticCurveTo(32 + k * 6, 16, 32, 12.5); ctx.closePath();
        C.fill(ctx, '#ff7fae', r, null); C.stroke(ctx, r, 1.6);
      });
      [-1, 1].forEach(k => {
        ctx.beginPath(); ctx.moveTo(32, 9);
        ctx.bezierCurveTo(32 + k * 8, -6, 32 + k * 24, -8, 32 + k * 21, 5);
        ctx.bezierCurveTo(32 + k * 19, 14, 32 + k * 8, 14, 32, 9); ctx.closePath();
        C.fill(ctx, '#ff9fc6', r, [8, -8, 48, 24]); C.stroke(ctx, r, W);
        ctx.beginPath(); ctx.moveTo(32 + k * 5, 7); ctx.quadraticCurveTo(32 + k * 13, -1, 32 + k * 17, 5);
        C.stroke(ctx, r, 1.3, 'rgba(255,255,255,0.75)');
      });
      C.blob(ctx, 32, 9, 5.6, 5.2, r, 0.06, 12); C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, 1.8);
      moon(ctx, C, r, 31, 9, 3.2, '#fff6c9');
      [[13, -4, 2.2], [52, -6, 2.6]].forEach(([x, y, s]) => sparkle(ctx, x, y, s, '#ffd23f'));
    } },
    mgDress: { front(ctx, C, r, p) {
      suit(ctx, C, r, p, { body: '#c9a3f0', sleeve: '#fbfbf8', legs: '#fbfbf8', shoes: '#ff7fae', hem: 62 });
      // 裙子底下露出一圈白色襯裙
      for (let x = 12; x <= 52; x += 5) { C.blob(ctx, x, 71, 3.4, 2.4, r, 0.12, 10); C.fill(ctx, '#ffffff', r, null); C.stroke(ctx, r, 1); }
      // 粉紅蓬蓬裙，裙襬一球一球
      ctx.beginPath(); ctx.moveTo(19, 56); ctx.quadraticCurveTo(32, 53, 45, 56); ctx.quadraticCurveTo(54, 62, 56, 70);
      for (let i = 0; i < 6; i++) { const x0 = 56 - i * 8, x1 = x0 - 8; ctx.quadraticCurveTo((x0 + x1) / 2, 75, x1, 70); }
      ctx.quadraticCurveTo(10, 62, 19, 56); ctx.closePath();
      C.fill(ctx, '#ff9fc6', r, [8, 53, 48, 22], 1.2); C.stroke(ctx, r, W);
      [[18, 66], [32, 68], [45, 65], [26, 61], [39, 61]].forEach(([x, y], i) => sparkle(ctx, x, y, i % 2 ? 1.1 : 1.5, '#fff6c9'));
      C.line(ctx, 19, 56.5, 45, 56.5, r, 2.6, '#ffd23f', 0.3);
      // 泡泡袖
      [[15, 48.5], [49, 48.5]].forEach(([x, y]) => { C.blob(ctx, x, y, 6.2, 4.8, r, 0.1, 12); C.fill(ctx, '#ff9fc6', r, null); C.stroke(ctx, r, 1.8); });
      // 胸前的大蝴蝶結和愛心寶石
      [-1, 1].forEach(k => {
        ctx.beginPath(); ctx.moveTo(32, 50); ctx.quadraticCurveTo(32 + k * 9, 43, 32 + k * 10, 50); ctx.quadraticCurveTo(32 + k * 9, 56, 32, 50); ctx.closePath();
        C.fill(ctx, '#ff7fae', r, null); C.stroke(ctx, r, 1.4);
      });
      heart(ctx, 32, 51, 4.4); C.fill(ctx, '#ff3f7f', r, null); C.stroke(ctx, r, 1.4);
      dot(ctx, 30.6, 49.6, 1, 'rgba(255,255,255,0.9)');
    } },
    mgWings: { cape(ctx, C, r) {
      ribbonWing(ctx, C, r);
      ctx.save(); ctx.translate(64, 0); ctx.scale(-1, 1); ribbonWing(ctx, C, r); ctx.restore();
    } },
    wzHat: { head(ctx, C, r) {
      // 寬帽簷、帽尖軟軟地垂向右邊，金色帽帶上一個月亮釦，帽尖吊一顆小星星
      C.blob(ctx, 32, 11, 26, 6, r, 0.05); C.fill(ctx, '#3b4785', r, [6, 5, 52, 12]); C.stroke(ctx, r, W);
      ctx.beginPath(); ctx.moveTo(18, 10); ctx.quadraticCurveTo(23, -6, 33, -16);
      ctx.quadraticCurveTo(41, -24, 49, -20); ctx.quadraticCurveTo(56, -16, 57, -8);
      ctx.quadraticCurveTo(51, -13, 45, -11); ctx.quadraticCurveTo(43, 0, 46, 10); ctx.closePath();
      C.fill(ctx, '#3b4785', r, [18, -24, 40, 34]); C.stroke(ctx, r, W);
      ctx.beginPath(); ctx.moveTo(19.5, 4.5); ctx.quadraticCurveTo(32, 7.5, 45, 4.5); ctx.lineTo(46, 10); ctx.quadraticCurveTo(32, 13, 18, 10); ctx.closePath();
      C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, 1.6);
      moon(ctx, C, r, 32, 8, 3.6, '#fff6c9');
      [[27, -4], [37, -12], [40, 0]].forEach(([x, y], i) => sparkle(ctx, x, y, i ? 1.7 : 2.2, '#ffd23f'));
      C.line(ctx, 57, -8, 57.5, -2, r, 1.2);
      star(ctx, C, r, 57.5, 0.5, 3.6, '#ffd23f');
    } },
    wzRobe: { front(ctx, C, r, p) {
      suit(ctx, C, r, p, { body: '#2c3768', sleeve: '#2c3768', legs: '#2c3768', shoes: '#6b4a32', hem: 73 });
      // 喇叭袖口，鑲金邊
      [[13, -1], [51, 1]].forEach(([x, k]) => {
        ctx.beginPath(); ctx.moveTo(x - 4, 57); ctx.lineTo(x + 4, 57); ctx.lineTo(x + 5 + k, 63); ctx.quadraticCurveTo(x, 64.5, x - 5 + k, 63); ctx.closePath();
        C.fill(ctx, '#2c3768', r, null); C.stroke(ctx, r, 1.8);
        ctx.beginPath(); ctx.moveTo(x - 5 + k, 63); ctx.quadraticCurveTo(x, 64.5, x + 5 + k, 63); C.stroke(ctx, r, 1.6, '#ffd23f');
      });
      // 前面開襟露出淡紫色內襯，腰間一條金色細繩打個結
      ctx.beginPath(); ctx.moveTo(29, 48); ctx.lineTo(35, 48); ctx.lineTo(37, 74); ctx.lineTo(27, 74); ctx.closePath();
      C.fill(ctx, '#8f86d6', r, null); C.stroke(ctx, r, 1.4);
      C.line(ctx, 29, 48, 27, 74, r, 1.4, '#ffd23f', 0.3); C.line(ctx, 35, 48, 37, 74, r, 1.4, '#ffd23f', 0.3);
      ctx.beginPath(); ctx.moveTo(19, 57); ctx.quadraticCurveTo(32, 60, 45, 57); C.stroke(ctx, r, 1.6, '#ffd23f');
      C.blob(ctx, 32, 59, 2.2, 2, r, 0.1, 10); C.fill(ctx, '#ffd23f', r, null); C.stroke(ctx, r, 1);
      C.line(ctx, 31.5, 60.5, 30, 66, r, 1.2, '#ffd23f', 0.3); C.line(ctx, 32.5, 60.5, 34, 66, r, 1.2, '#ffd23f', 0.3);
      // 長袍上的星星和月亮
      [[23, 51], [42, 52], [22, 67], [43, 69]].forEach(([x, y], i) => sparkle(ctx, x, y, i % 2 ? 1.4 : 1.8, '#ffd23f'));
      [[24, 61], [41, 62], [19, 72], [46, 74]].forEach(([x, y]) => dot(ctx, x, y, 0.9, '#ffffff'));
      moon(ctx, C, r, 42, 61, 2.6, '#ffd23f');
      // 白色小立領
      [[28, 47], [36, 47]].forEach(([x, y]) => { C.blob(ctx, x, y, 3.6, 2.2, r, 0.1, 10); C.fill(ctx, '#e9e3ff', r, null); C.stroke(ctx, r, 1.2); });
    } },
    // 披風那一格，但畫成左手握著的古木魔杖（clasp 這層畫在身體和手臂上面）
    wzWand: { clasp(ctx, C, r, p) {
      // 整根往左斜，杖頭在耳朵外面
      ctx.save(); ctx.transform(1, 0, 0.22, 1, -15.8, 0);
      // 杖身：歪歪扭扭的老木頭，有樹瘤和裂紋
      const pts = [[14, 72], [11, 64], [11.5, 56], [8.5, 48], [9, 40], [6, 32]];
      const body = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; ctx.quadraticCurveTo(x0 + (i % 2 ? 2 : -2), (y0 + y1) / 2, x1, y1); } };
      body(); C.stroke(ctx, r, 6.2); body(); C.stroke(ctx, r, 3.8, '#8a5a3a');
      body(); ctx.save(); ctx.translate(-0.8, 0); C.stroke(ctx, r, 1, 'rgba(255,230,190,0.45)'); ctx.restore();
      [[11.2, 52], [9.2, 43]].forEach(([x, y]) => { C.blob(ctx, x, y, 2.6, 2, r, 0.15, 10); C.fill(ctx, '#6b4a32', r, null); C.stroke(ctx, r, 1.2); });
      // 杖頭：三根捲起來的枝條抱著一顆發光的綠水晶
      const g = ctx.createRadialGradient(6, 22, 1, 6, 22, 15); g.addColorStop(0, 'rgba(150,255,210,0.95)'); g.addColorStop(0.5, 'rgba(150,255,210,0.4)'); g.addColorStop(1, 'rgba(150,255,210,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(6, 22, 15, 0, Math.PI * 2); ctx.fill();
      C.blob(ctx, 6, 22, 4.4, 5.4, r, 0.08, 12); C.fill(ctx, '#7be0b8', r, null); C.stroke(ctx, r, 1.6);
      C.blob(ctx, 4.8, 20, 1.3, 1.9, r, 0.1, 8); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
      // 兩根枝條從杖頂繞上來，把水晶包在中間，尾端捲起來
      [[-1, [-0.5, 27], [-1.5, 17], [5, 13.5]], [1, [12.5, 27], [13, 17], [8, 14]]].forEach(([k, c1, c2, end]) => {
        const path = () => { ctx.beginPath(); ctx.moveTo(6, 32); ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1]); };
        path(); C.stroke(ctx, r, 4); path(); C.stroke(ctx, r, 2.2, '#8a5a3a');
        C.blob(ctx, end[0], end[1], 1.6, 1.6, r, 0.1, 8); C.fill(ctx, '#8a5a3a', r, null); C.stroke(ctx, r, 1);
      });
      // 一片小葉子
      ctx.beginPath(); ctx.moveTo(10, 30); ctx.quadraticCurveTo(17, 26, 18, 30); ctx.quadraticCurveTo(14, 33, 10, 30); ctx.closePath(); C.fill(ctx, '#6baf7b', r, null); C.stroke(ctx, r, 1.2);
      ctx.restore();
      [[-12, 12, 1.8], [8, 6, 1.4], [-12, 30, 1.2]].forEach(([x, y, s]) => sparkle(ctx, x, y, s, '#b8ffe0'));
      // 握住杖的左手畫在杖上面
      C.blob(ctx, 12.5, 63, 3.8, 3.6, r, 0.1); C.fill(ctx, p.skin || '#fde6d4', r, null); C.stroke(ctx, r, 2);
    } },
  });
  // 魔法少女的緞帶翅膀（右邊那片，左邊鏡像）：上面一大片、下面一小片，緞帶尾巴吊著星星
  function ribbonWing(ctx, C, r) {
    ctx.beginPath(); ctx.moveTo(38, 46); ctx.bezierCurveTo(44, 22, 64, 8, 75, 13); ctx.bezierCurveTo(80, 24, 66, 40, 40, 50); ctx.closePath();
    C.fill(ctx, '#fde7f3', r, [38, 8, 42, 42]); C.stroke(ctx, r, W);
    ctx.beginPath(); ctx.moveTo(42, 46); ctx.bezierCurveTo(50, 30, 63, 18, 71, 16.5); C.stroke(ctx, r, 1.6, '#ff8fb8');
    ctx.beginPath(); ctx.moveTo(40, 50); ctx.bezierCurveTo(56, 45, 70, 49, 70, 59); ctx.bezierCurveTo(62, 63, 50, 58, 40, 53); ctx.closePath();
    C.fill(ctx, '#e6d6ff', r, null); C.stroke(ctx, r, W);
    ctx.beginPath(); ctx.moveTo(41, 52); ctx.bezierCurveTo(52, 62, 58, 69, 66, 71); C.stroke(ctx, r, 2.4, '#ff8fb8');
    star(ctx, C, r, 67, 72, 4.4, '#ffd23f');
    sparkle(ctx, 76, 6, 2.4, '#ffd23f');
  }
  // 月亮：外圈減掉往右上偏的內圈
  function moon(ctx, C, r, x, y, R, color) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.arc(x + R * 0.55, y - R * 0.3, R * 0.85, 0, Math.PI * 2, true);
    ctx.fillStyle = color; ctx.fill('evenodd'); C.stroke(ctx, r, 1.1); ctx.restore();
  }
  // 四角的小亮光
  function sparkle(ctx, x, y, s, color) {
    ctx.save(); ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(x, y - s * 2); ctx.quadraticCurveTo(x, y, x + s * 2, y); ctx.quadraticCurveTo(x, y, x, y + s * 2); ctx.quadraticCurveTo(x, y, x - s * 2, y); ctx.quadraticCurveTo(x, y, x, y - s * 2);
    ctx.fill(); ctx.restore();
  }
  function heart(ctx, cx, cy, s) {
    ctx.beginPath(); ctx.moveTo(cx, cy + s);
    ctx.bezierCurveTo(cx - s * 1.6, cy, cx - s, cy - s * 1.3, cx, cy - s * 0.4);
    ctx.bezierCurveTo(cx + s, cy - s * 1.3, cx + s * 1.6, cy, cx, cy + s); ctx.closePath();
  }

  function star(ctx, C, r, x, y, rr, color) {
    ctx.save(); ctx.translate(x, y); ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? rr * 0.45 : rr; ctx.lineTo(Math.cos(a) * k, Math.sin(a) * k); }
    ctx.closePath(); C.fill(ctx, color, r, null); C.stroke(ctx, r, 1.2); ctx.restore();
  }
  // 貓耳髮箍：耳朵底部貼在頭頂的弧線上（頭的中心 (32, 28)、半徑約 17.5），往外斜
  function catEars(ctx, C, r, color, stripe) {
    ctx.beginPath(); ctx.arc(32, 28, 17.5, Math.PI * 1.12, Math.PI * 1.88); C.stroke(ctx, r, 3.4, C.INK);
    [-1, 1].forEach(k => {
      const t = k * 0.78; // 從正上方往兩邊轉的角度
      ctx.save(); ctx.translate(32 + Math.sin(t) * 16.5, 28 - Math.cos(t) * 16.5); ctx.rotate(t);
      ctx.beginPath(); ctx.moveTo(-7.5, 3); ctx.lineTo(k * 1.5, -13); ctx.lineTo(7.5, 3); ctx.closePath();
      C.fill(ctx, color, r, null); C.stroke(ctx, r, W);
      ctx.beginPath(); ctx.moveTo(-4, 1.5); ctx.lineTo(k * 1, -8); ctx.lineTo(4, 1.5); ctx.closePath();
      ctx.fillStyle = '#f4a3a0'; ctx.fill();
      if (stripe) C.line(ctx, -k * 5, -1, -k * 2, -5, r, 1.6, stripe, 0.2);
      ctx.restore();
    });
  }
  // 天使翅膀：上緣一道平順的大圓弧，外下緣一球一球的大圓羽毛往內收成尖角，裡面幾道跟著圓羽走的弧線；頭上一圈光環
  // 右邊的翅膀畫好，左邊用鏡像；人物框左右各只多 16，最外面不要超過 x=79
  // 翅尖到第一球圓羽是一條順的大圓弧（不要凹口），從 (73, 28.5) 開始才是一球一球的圓羽
  const ANGEL_LOBES = [[73, 28.5], [65.5, 35.5], [57.5, 41], [50, 45.5], [44, 49]];
  const ANGEL_BULGE = [0, 7.5, 6, 6, 6]; // 每一球圓羽往外鼓多少（第 i 段，從上面數下來）
  function angelWingPath(ctx) {
    ctx.beginPath(); ctx.moveTo(44, 49); ctx.quadraticCurveTo(39, 40, 42, 30);
    ctx.quadraticCurveTo(50, 11, 69, 9);
    ctx.bezierCurveTo(82, 8, 83, 23, 73, 28.5);
    // 圓羽之間的接點往翅膀裡面縮，凹口才會深
    const lobes = ANGEL_LOBES;
    for (let i = 1; i < lobes.length; i++) {
      const [x0, y0] = lobes[i - 1], [x1, y1] = lobes[i];
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
      // 往外（線段的左手邊）鼓起來
      const b = ANGEL_BULGE[i]; ctx.bezierCurveTo(x0 + dy / d * b, y0 - dx / d * b, x1 + dy / d * b, y1 - dx / d * b, x1, y1); // 兩個控制點都往外推，每一球比較圓、接縫比較深
    }
    ctx.closePath();
  }
  function featherWings(ctx, C, r) {
    [1, -1].forEach(k => {
      ctx.save();
      if (k < 0) { ctx.translate(64, 0); ctx.scale(-1, 1); }
      ctx.translate(-4, 18); // 往下移到背後，最高點在耳朵旁邊；往內收一點，外緣的圓羽才不會被人物框切掉
      angelWingPath(ctx); C.fill(ctx, '#fbfdff', r, [41, 6, 38, 48]);
      // 陰影：靠身體那側漸漸變暗；每一球圓羽沿著邊緣內側一道淡淡的灰藍，看起來比較立體
      ctx.save(); angelWingPath(ctx); ctx.clip();
      const g = ctx.createLinearGradient(40, 0, 58, 0);
      g.addColorStop(0, 'rgba(196,212,230,0.75)'); g.addColorStop(1, 'rgba(196,212,230,0)');
      ctx.fillStyle = g; ctx.fillRect(36, 0, 24, 60);
      ANGEL_LOBES.forEach(([x0, y0], i) => {
        if (!i) return;
        const [x1, y1] = ANGEL_LOBES[i], [px, py] = ANGEL_LOBES[i - 1];
        const dx = x1 - px, dy = y1 - py, d = Math.hypot(dx, dy), nx = dy / d, ny = -dx / d;
        ctx.beginPath(); ctx.moveTo(px - nx * 1.5, py - ny * 1.5);
        const b = ANGEL_BULGE[i] - 2.5; ctx.bezierCurveTo(px + nx * b, py + ny * b, x1 + nx * b, y1 + ny * b, x1 - nx * 1.5, y1 - ny * 1.5);
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(190,207,226,0.8)'; ctx.lineCap = 'round'; ctx.stroke();
      });
      ctx.restore();
      angelWingPath(ctx); C.stroke(ctx, r, W);
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
    easyCard: { hand(ctx, C, r) {
      // 捷運悠遊卡：藍色卡片捏在手上，上面一條白色的捷運線
      ctx.save(); ctx.translate(56, 62); ctx.rotate(-0.35);
      C.rect(ctx, -2, -8, 14, 10, r, 0.5); C.fill(ctx, '#4f9fd8', r, null); C.stroke(ctx, r, 1.6);
      C.line(ctx, 0, -1, 10, -6, r, 1.4, '#ffffff', 0.2);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(2.5, -5, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } },
    damperFlail: { hand(ctx, C, r) {
      // 阻尼球流星錘：短木柄＋一條鐵鍊，垂著一顆金色的阻尼球
      C.line(ctx, 51, 66, 56, 52, r, 4.4, C.INK, 0.3); C.line(ctx, 51, 66, 56, 52, r, 2.6, '#8a5a3a', 0.3);
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(57 + i * 1.6, 50 + i * 3.6, 1.6, 2.2, 0.3, 0, Math.PI * 2); C.stroke(ctx, r, 1.2, '#5b6577'); }
      C.blob(ctx, 63, 72, 7.5, 7.5, r, 0.04); C.fill(ctx, '#ffc93c', r, null); C.stroke(ctx, r, 2);
      C.line(ctx, 56, 72, 70, 72, r, 1, 'rgba(160,112,40,0.7)', 0.2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(59, 67, 3, 2);
    } },
    spireSpear: { hand(ctx, C, r) {
      // 101 避雷針長槍：長長的槍身，槍頭像 101 一節一節往上疊，頂端一根避雷針
      C.line(ctx, 54, 80, 58, 12, r, 4.4, C.INK, 0.3); C.line(ctx, 54, 80, 58, 12, r, 2.6, '#7fb3ad', 0.3);
      [[18, 7], [12, 6], [6, 5]].forEach(([y, w]) => {
        ctx.beginPath(); ctx.moveTo(58 - w, y + 6); ctx.lineTo(58 - w - 1.5, y); ctx.lineTo(58 + w + 1.5, y); ctx.lineTo(58 + w, y + 6); ctx.closePath();
        C.fill(ctx, '#5f8f8c', r, null); C.stroke(ctx, r, 1.3);
      });
      C.line(ctx, 58, 6, 58, -6, r, 1.6);
      ctx.beginPath(); ctx.moveTo(63, -4); ctx.lineTo(61, 0); ctx.lineTo(63, 0); ctx.lineTo(61, 4); C.stroke(ctx, r, 1.4, '#ffb020');
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
  // 有些副本直接寫每一把的機率
  const DROP_ITEMS = { taipei: { none: 40, easyCard: 40, damperFlail: 15, spireSpear: 5 } };
  const draw = (table) => {
    const total = Object.values(table).reduce((a, b) => a + b, 0);
    let x = Math.random() * total;
    for (const [k, w] of Object.entries(table)) { x -= w; if (x <= 0) return k; }
    return 'none';
  };
  function rollWeapon(dungeon) {
    if (DROP_ITEMS[dungeon]) { const id = draw(DROP_ITEMS[dungeon]); return GEAR[id] ? id : null; }
    const rar = draw(DROP);
    if (rar === 'none') return null;
    const pool = Object.keys(GEAR).filter(id => GEAR[id].dungeon === dungeon && GEAR[id].rarity === rar);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  // 野外打怪掉的裝備：可以抽到已經有的（掉在地上，不要可以不撿）
  // 不會掉副本武器和指定來源的裝備（女僕咖啡廳只在廚房掉）；series 限定系列，rare 只抽 SR、SSR
  function rollDrop(opt) {
    opt = opt || {};
    const pool = Object.keys(GEAR).filter(id => !GEAR[id].dungeon && !GEAR[id].src && (!opt.rare || GEAR[id].rarity !== 'R') &&
      (!opt.series || opt.series.includes(GEAR[id].series)));
    if (!pool.length) return null;
    const total = pool.reduce((s, id) => s + RARITY[GEAR[id].rarity].weight, 0);
    let x = Math.random() * total;
    for (const id of pool) { x -= RARITY[GEAR[id].rarity].weight; if (x <= 0) return id; }
    return pool[pool.length - 1];
  }

  // 身上穿齊哪個系列（三格同系列、系列有特效），沒有就是 null
  function setOf(equip) {
    const ids = LOOK_SLOTS.map(s => equip && equip[s]);
    if (!ids.every(id => GEAR[id])) return null;
    const sid = GEAR[ids[0]].series;
    return SERIES[sid] && SERIES[sid].fx && ids.every(id => GEAR[id].series === sid) ? sid : null;
  }

  const gear = { RARITY, SLOTS, LOOK_SLOTS, SERIES, GEAR, setOf, DROP, DROP_ITEMS, roll, rollWeapon, rollDrop, hasLayer, drawLayer, LAYERS: ['cape', 'back', 'front', 'head', 'over', 'hand'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = gear;
  else root.HQ_GEAR = gear;
})(this);
