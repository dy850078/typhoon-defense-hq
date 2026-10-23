// 角色數值、技能、道具效果：前後端共用
// 之後要加職業，就在 CLASSES 加一筆，覆寫 base 數值、給它自己的技能清單
(function (root) {
  const BASE = { maxHp: 100, maxMp: 50, atk: 10 };

  const CLASSES = {
    // 目前只有一種，之後補職業時照這個格式加
    staff: { name: '防颱職員', base: {}, skills: ['strike', 'power'] },
  };

  // power：傷害倍率；mp：消耗魔力；cooldown：毫秒
  const SKILLS = {
    strike: { name: '普通攻擊', icon: '👊', key: 'SPACE', mp: 0, cooldown: 350, power: 1 },
    power: { name: '強力一擊', icon: '⚡', key: 'K', mp: 15, cooldown: 1500, power: 3 },
  };

  // 吃東西的效果
  const FOODS = {
    noodle: { name: '泡麵', hp: 35 },
    noodleVeggie: { name: '蔬菜泡麵', hp: 65 },
    water: { name: '礦泉水', mp: 25 },
  };

  const REGEN = { mpPerSec: 1, hpPerSec: 0 };

  // 颱風怪的顯示資料（血量在伺服器用 MONSTER_HP 設定），名字跟著現在的颱風
  const MONSTER = { name: '薔琵', level: 30 };
  const RESPAWN_MS = 5000; // 倒下後幾秒回到總部

  function statsFor(cls) {
    const c = CLASSES[cls] || CLASSES.staff;
    return Object.assign({}, BASE, c.base);
  }

  const stats = { BASE, CLASSES, SKILLS, FOODS, REGEN, MONSTER, RESPAWN_MS, statsFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = stats;
  else root.HQ_STATS = stats;
})(this);
