// 角色數值、職業、技能、道具效果：前後端共用
// 要加職業就在 CLASSES 加一筆，覆寫 base 數值、指定它的招牌技能（K 鍵）
(function (root) {
  const BASE = { maxHp: 100, maxMp: 50, atk: 10, def: 0 };

  // skills[0] 是職業的普通攻擊（空白鍵），skills[1] 是招牌技能（K 鍵）
  const CLASSES = {
    staff: { name: '防颱職員', icon: '🦺', role: '新手', base: {}, skills: ['strike', 'power'],
      desc: '剛報到的防颱職員，什麼都會一點。到指揮中心找導師就能轉職。' },
    prophet: { name: '預言家', icon: '🔮', role: '輔助增益', base: { maxMp: 90, atk: 8 }, skills: ['orb', 'prophecy'],
      desc: '看得見颱風路徑的人。削弱颱風，讓身邊的隊友防禦力上升。' },
    nurse: { name: '南丁格爾', icon: '🩺', role: '補師', base: { maxHp: 110, maxMp: 100, atk: 7 }, skills: ['syringe', 'milk'],
      desc: '前線最可靠的白衣天使。幫身邊所有人補血、補魔力。' },
    archer: { name: '精靈射手', icon: '🏹', role: '遠距離攻擊', base: { maxHp: 90, atk: 13 }, skills: ['shot', 'arrow'],
      desc: '戴著紅色小斗篷的弓箭手，站得遠遠的也能射中颱風。' },
    tank: { name: '超能力霸王', icon: '🏋️', role: '近戰坦克', base: { maxHp: 220, maxMp: 40, atk: 11, def: 6 }, skills: ['punch', 'barbell'],
      desc: '血超厚、超耐打。扛著槓鈴衝第一線，搥完還會變得更硬。' },
    skater: { name: '陵媒', icon: '⛸️', role: '控場', base: { maxMp: 70, atk: 11 }, skills: ['kick', 'skate'],
      desc: '冰上起舞的嬪妃，繞著颱風溜一圈就能把它凍住。' },
    summoner: { name: '召喚師', icon: '🛸', role: '召喚', base: { maxHp: 95, maxMp: 90, atk: 9 }, skills: ['ray', 'summon'],
      desc: '跟外星朋友很熟的人。在颱風前線召喚奇異生物，牠們會自己去打怪。' },
  };

  // power：傷害倍率；mp：消耗魔力；cooldown：毫秒；range：離颱風多近才能放
  // support：不用打到颱風也能放；basic：普通攻擊；其他效果見 server.js 的 attack
  const SKILLS = {
    // 各職業的普通攻擊
    strike: { name: '普通攻擊', icon: '👊', mp: 0, cooldown: 350, power: 1, range: 130, basic: true,
      desc: '防颱職員的一拳，近距離。' },
    orb: { name: '水晶球彈', icon: '🔮', mp: 0, cooldown: 500, power: 0.85, range: 320, basic: true,
      desc: '丟出一顆會發光的小水晶球，中距離。' },
    syringe: { name: '打一針', icon: '💉', mp: 0, cooldown: 450, power: 0.95, range: 130, basic: true,
      desc: '拿大針筒往怪物身上刺一針，近距離。' },
    shot: { name: '拉弓射箭', icon: '🏹', mp: 0, cooldown: 550, power: 0.9, range: 420, basic: true,
      desc: '拉滿弓射出一支箭，遠距離。' },
    punch: { name: '霸王拳', icon: '💪', mp: 0, cooldown: 500, power: 1.25, range: 130, basic: true,
      desc: '用粗手臂揍下去，近距離但很痛。' },
    kick: { name: '冰刀踢', icon: '⛸️', mp: 0, cooldown: 400, power: 1, range: 160, basic: true,
      desc: '轉一圈用冰刀踢過去，帶出一道冰痕。' },
    ray: { name: '外星光線', icon: '🛸', mp: 0, cooldown: 500, power: 0.8, range: 320, basic: true,
      desc: '用外星玩具槍射出一道綠光，中距離。' },
    // 招牌技能
    power: { name: '強力一擊', icon: '⚡', mp: 15, cooldown: 1000, power: 3, range: 130,
      desc: '用力揍一下，傷害是普攻的 3 倍。' },
    prophecy: { name: '任立瑜附體', icon: '🔮', mp: 30, cooldown: 12000, power: 0.5, range: 500,
      weaken: 10000, teamDef: { v: 8, ms: 15000, r: 500 },
      desc: '預言颱風走向！颱風 10 秒內受到的傷害 +30%、攻擊變弱；身邊隊友防禦 +8，持續 15 秒。' },
    milk: { name: '生生好鮮乳', icon: '🥛', mp: 25, cooldown: 5000, power: 0, support: true,
      heal: { hp: 35, mp: 15, r: 260 },
      desc: '請大家喝鮮奶！身邊所有人（包含自己）補 35 血、15 魔力。哪裡都能用。' },
    arrow: { name: '美麗聖潔弓箭', icon: '💘', mp: 10, cooldown: 700, power: 2.4, range: 480,
      desc: '從遠處射出一支愛心箭，站在颱風打不到的地方也能輸出。' },
    barbell: { name: '槓鈴老師', icon: '🏋️', mp: 18, cooldown: 2000, power: 4, range: 150,
      selfDef: { v: 10, ms: 6000 },
      desc: '掄起槓鈴往颱風頭上搥！傷害是普攻 4 倍，之後 6 秒自己防禦 +10。' },
    skate: { name: '冰嬉', icon: '❄️', mp: 30, cooldown: 9000, power: 3, range: 220, freeze: 4000,
      desc: '繞著颱風溜冰一圈，把它冰凍 4 秒（不會動也不會攻擊），並造成普攻 3 倍傷害。' },
    summon: { name: '召喚奇異生物', icon: '👽', mp: 35, cooldown: 8000, power: 0, support: true, summon: true,
      desc: '在颱風前線召喚一隻隨機的奇異生物（共五種，有強有弱），牠會自己去打怪。最多同時 3 隻，被打倒就不會回來。' },
  };

  // 召喚師叫出來的奇異生物：weight 越大越常出現，越強的越少見
  const SUMMONS = {
    gray: { name: '灰灰外星人', atk: 7, hp: 280, speed: 120, weight: 32 },
    octo: { name: '獨眼章魚', atk: 10, hp: 230, speed: 140, weight: 26 },
    star: { name: '星星臉姊姊', atk: 14, hp: 340, speed: 110, weight: 20 },
    bug: { name: '鹿角毛毛蟲', atk: 19, hp: 460, speed: 85, weight: 14 },
    tree: { name: '聖誕樹外星人', atk: 27, hp: 600, speed: 95, weight: 8 },
  };
  const SUMMON_MAX = 3; // 每個召喚師同時最多幾隻
  const SUMMON_HIT_MS = 1400; // 召喚物攻擊間隔

  // 等級越高，補血、加防禦、召喚物也越強（攻擊力本身每等也會變高）
  const boost = (level) => 1 + 0.06 * ((level || 1) - 1);
  const bonusDef = (level) => Math.floor(((level || 1) - 1) / 2);

  // 吃東西的效果
  const FOODS = {
    noodle: { name: '泡麵', hp: 35 },
    noodleVeggie: { name: '蔬菜泡麵', hp: 65 },
    water: { name: '礦泉水', mp: 25 },
    bubbletea: { name: '台灣珍奶', hp: 25, mp: 35 },
    chicken: { name: '台灣雞排', hp: 70, mp: 10 },
  };

  const REGEN = { mpPerSec: 1, hpPerSec: 0 };

  // 颱風怪的顯示資料（血量在伺服器設定），名字跟著現在的颱風
  const MONSTER = { name: '薔琵', level: 30 };
  const RESPAWN_MS = 5000; // 倒下後幾秒回到總部
  const WEAKEN = { dmgTaken: 1.3, dmgDealt: 0.7 }; // 被預言家削弱時

  // 等級：打怪拿經驗（造成的傷害、補的血都算），每待 10 分鐘也會升一等
  const LEVEL = {
    max: 99,
    expFor: (lv) => 250 * lv, // 從 lv 升到 lv+1 要的經驗
    onlineMs: 10 * 60 * 1000,
    perLevel: { maxHp: 10, maxMp: 4, atk: 2 }, // 每升一等加的數值
    fireworkLv: 5, // 幾等才能放煙火
  };

  // 野外的小怪：在颱風前線晃來晃去，靠太近會被打
  const MOBS = {
    chiang: { name: '蔣不聽', level: 12, hp: 900, dmg: [10, 16], range: 90, speed: 55, exp: 150,
      say: ['我聽不到～', '不聽不聽！', '再說一次？', '🙉'] },
    hsu: { name: '徐小心', level: 15, hp: 1100, dmg: [12, 18], range: 90, speed: 65, exp: 180,
      say: ['小心喔！', '我要查你喔～', '⚠️ 小心！', '你過來一下'] },
  };
  const MOB_RESPAWN_MS = 45000;

  function statsFor(cls, level = 1) {
    const c = CLASSES[cls] || CLASSES.staff;
    const st = Object.assign({}, BASE, c.base);
    Object.entries(LEVEL.perLevel).forEach(([k, v]) => { st[k] += v * (level - 1); });
    return st;
  }

  // 颱風打人：防禦直接扣傷害，但最少還是會吃三成
  function reduce(dmg, def) {
    return Math.max(Math.ceil(dmg * 0.3), Math.round(dmg - def));
  }

  const stats = { BASE, CLASSES, SKILLS, SUMMONS, SUMMON_MAX, SUMMON_HIT_MS, FOODS, REGEN, MONSTER, RESPAWN_MS, WEAKEN, LEVEL,
    MOBS, MOB_RESPAWN_MS, statsFor, reduce, boost, bonusDef };
  if (typeof module !== 'undefined' && module.exports) module.exports = stats;
  else root.HQ_STATS = stats;
})(this);
