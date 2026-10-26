// 公共花園：前後端共用的植物資料（瀏覽器會掛在 window.HQ_GARDEN，Node 用 module.exports）
// 大家共用一片花圃：誰都可以種、澆水、收成；時間只在伺服器開著的時候算
(function (root) {
  const H = 3600 * 1000;
  // hours：從種下到結果要多久；yield：一次收幾顆；harvests：可以收幾次（第二次以後再等 regrow 小時）
  // weight：種子掉落的比重，越大越常見
  const PLANTS = {
    tomato: { name: '小番茄', hours: 1, yield: 3, harvests: 1, weight: 4 },
    guava: { name: '芭樂', hours: 2, yield: 2, harvests: 2, regrow: 1, weight: 3 },
    apple: { name: '蘋果', hours: 3, yield: 2, harvests: 1, weight: 2 },
    pineapple: { name: '鳳梨', hours: 4, yield: 1, harvests: 1, weight: 1 },
  };
  // 背包裡的物品 key：種子 seedTomato、果實 tomato
  const seedOf = (kind) => 'seed' + kind[0].toUpperCase() + kind.slice(1);
  const GEMS = ['gemRuby', 'gemSapphire', 'gemEmerald'];
  // 成長階段：0 種子、1 發芽、2 長大、3 開花、4 結果、5 枯萎
  const STAGES = ['種子', '發芽', '長大', '開花', '結果', '枯萎'];
  const RIPE = 4, DEAD = 5;

  const GARDEN = {
    PLANTS, GEMS, STAGES, RIPE, DEAD, H, seedOf,
    WET_MS: 3 * H, // 澆一次水可以撐多久
    WITHER_MS: 6 * H, // 土乾掉之後再過多久沒人澆就枯萎
    ROT_MS: 12 * H, // 熟了多久沒人收就爛掉
    GEM_RATE: 0.02, // 每次收成挖到寶石的機率
    MAX_MINE: 2, // 一個人同時最多種幾格
    WATER_EXP: 15, // 澆水給的經驗（同一格一小時算一次）
    THANKS_EXP: 30, // 收成時，幫忙澆過水的人都拿到的經驗
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = GARDEN;
  else root.HQ_GARDEN = GARDEN;
})(this);
