// 角色數值、職業、技能、道具效果：前後端共用
// 要加職業就在 CLASSES 加一筆，覆寫 base 數值、指定它的招牌技能（K 鍵）
(function (root) {
  const BASE = { maxHp: 100, maxMp: 50, atk: 10, def: 0 };

  // 每個職業都有普通攻擊 strike，skills[1] 是招牌技能
  const CLASSES = {
    staff: { name: '防颱職員', icon: '🦺', role: '新手', base: {}, skills: ['strike', 'power'],
      desc: '剛報到的防颱職員，什麼都會一點。到指揮中心找導師就能轉職。' },
    prophet: { name: '預言家', icon: '🔮', role: '輔助增益', base: { maxMp: 90, atk: 8 }, skills: ['strike', 'prophecy'],
      desc: '看得見颱風路徑的人。削弱颱風，讓身邊的隊友防禦力上升。' },
    nurse: { name: '南丁格爾', icon: '🩺', role: '補師', base: { maxHp: 110, maxMp: 100, atk: 7 }, skills: ['strike', 'milk'],
      desc: '前線最可靠的白衣天使。幫身邊所有人補血、補魔力。' },
    archer: { name: '精靈射手', icon: '🏹', role: '遠距離攻擊', base: { maxHp: 90, atk: 13 }, skills: ['strike', 'arrow'],
      desc: '戴著紅色小斗篷的弓箭手，站得遠遠的也能射中颱風。' },
    tank: { name: '超能力霸王', icon: '🏋️', role: '近戰坦克', base: { maxHp: 220, maxMp: 40, atk: 11, def: 6 }, skills: ['strike', 'barbell'],
      desc: '血超厚、超耐打。扛著槓鈴衝第一線，搥完還會變得更硬。' },
    skater: { name: '陵媒', icon: '⛸️', role: '控場', base: { maxMp: 70, atk: 11 }, skills: ['strike', 'skate'],
      desc: '冰上起舞的嬪妃，繞著颱風溜一圈就能把它凍住。' },
  };

  // power：傷害倍率；mp：消耗魔力；cooldown：毫秒；range：離颱風多近才能放
  // support：不用打到颱風也能放；其他效果見 server.js 的 useSkill
  const SKILLS = {
    strike: { name: '普通攻擊', icon: '👊', mp: 0, cooldown: 350, power: 1, range: 130,
      desc: '大家都會的一拳。' },
    power: { name: '強力一擊', icon: '⚡', mp: 15, cooldown: 1500, power: 3, range: 130,
      desc: '用力揍一下，傷害是普攻的 3 倍。' },
    prophecy: { name: '任立瑜附體', icon: '🔮', mp: 30, cooldown: 20000, power: 0.5, range: 500,
      weaken: 10000, teamDef: { v: 8, ms: 15000, r: 500 },
      desc: '預言颱風走向！颱風 10 秒內受到的傷害 +30%、攻擊變弱；身邊隊友防禦 +8，持續 15 秒。' },
    milk: { name: '生生好鮮乳', icon: '🥛', mp: 25, cooldown: 8000, power: 0, support: true,
      heal: { hp: 35, mp: 15, r: 260 },
      desc: '請大家喝鮮奶！身邊所有人（包含自己）補 35 血、15 魔力。哪裡都能用。' },
    arrow: { name: '美麗聖潔弓箭', icon: '🏹', mp: 10, cooldown: 1000, power: 2.4, range: 480,
      desc: '從遠處射出一支愛心箭，站在颱風打不到的地方也能輸出。' },
    barbell: { name: '槓鈴老師', icon: '🏋️', mp: 18, cooldown: 3000, power: 4, range: 150,
      selfDef: { v: 10, ms: 6000 },
      desc: '掄起槓鈴往颱風頭上搥！傷害是普攻 4 倍，之後 6 秒自己防禦 +10。' },
    skate: { name: '冰嬉', icon: '⛸️', mp: 30, cooldown: 15000, power: 3, range: 220, freeze: 4000,
      desc: '繞著颱風溜冰一圈，把它冰凍 4 秒（不會動也不會攻擊），並造成普攻 3 倍傷害。' },
  };

  // 吃東西的效果
  const FOODS = {
    noodle: { name: '泡麵', hp: 35 },
    noodleVeggie: { name: '蔬菜泡麵', hp: 65 },
    water: { name: '礦泉水', mp: 25 },
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
    perLevel: { maxHp: 6, maxMp: 3, atk: 1 }, // 每升一等加的數值
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

  const stats = { BASE, CLASSES, SKILLS, FOODS, REGEN, MONSTER, RESPAWN_MS, WEAKEN, LEVEL, MOBS, MOB_RESPAWN_MS, statsFor, reduce };
  if (typeof module !== 'undefined' && module.exports) module.exports = stats;
  else root.HQ_STATS = stats;
})(this);
