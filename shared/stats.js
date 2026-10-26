// 角色數值、職業、技能、道具效果：前後端共用
// 要加職業就在 CLASSES 加一筆，覆寫 base 數值、指定它的招牌技能（K 鍵）
(function (root) {
  const BASE = { maxHp: 100, maxMp: 50, atk: 10, def: 0 };

  // skills[0] 是職業的普通攻擊（空白鍵），skills[1] 是招牌技能（K 鍵），skills[2] 是第二招（L 鍵）
  const CLASSES = {
    staff: { name: '防颱職員', icon: '🦺', role: '新手', base: {}, skills: ['strike', 'power', 'sandbag'],
      desc: '剛報到的防颱職員，什麼都會一點。到指揮中心找導師就能轉職。' },
    prophet: { name: '預言家', icon: '🔮', role: '輔助增益', base: { maxMp: 90, atk: 8 }, skills: ['orb', 'prophecy', 'forecast'],
      desc: '看得見颱風路徑的人。削弱颱風，讓身邊的隊友防禦力上升。' },
    nurse: { name: '南丁格爾', icon: '🩺', role: '補師', base: { maxHp: 110, maxMp: 100, atk: 7 }, skills: ['syringe', 'milk', 'defib'],
      desc: '前線最可靠的白衣天使。幫身邊所有人補血、補魔力。' },
    archer: { name: '精靈射手', icon: '🏹', role: '遠距離攻擊', base: { maxHp: 90, atk: 13 }, skills: ['shot', 'arrow', 'arrowRain'],
      desc: '戴著紅色小斗篷的弓箭手，站得遠遠的也能射中颱風。' },
    tank: { name: '超能力霸王', icon: '🏋️', role: '近戰坦克', base: { maxHp: 220, maxMp: 40, atk: 11, def: 6 }, skills: ['punch', 'barbell', 'roar'],
      desc: '血超厚、超耐打。扛著槓鈴衝第一線，搥完還會變得更硬。' },
    skater: { name: '陵媒', icon: '⛸️', role: '控場', base: { maxMp: 70, atk: 11 }, skills: ['kick', 'skate', 'icicle'],
      desc: '冰上起舞的嬪妃，繞著颱風溜一圈就能把它凍住。' },
    summoner: { name: '召喚師', icon: '🛸', role: '召喚', base: { maxHp: 95, maxMp: 90, atk: 9 }, skills: ['ray', 'summon', 'mothership'],
      desc: '跟外星朋友很熟的人。在颱風前線召喚奇異生物，牠們會自己去打怪。' },
    singer: { name: '靈魂歌姬', icon: '🎤', role: '刺客', base: { maxHp: 85, maxMp: 70, atk: 15 }, skills: ['note', 'noteBlade', 'anthem'],
      desc: '一開口就讓颱風安靜下來的歌姬。唱出來的音符會變成刀，爆擊特別高；也能唱歌幫全隊加攻擊。' },
    painter: { name: '插畫結界師', icon: '🎨', role: '控場', base: { maxHp: 95, maxMp: 90, atk: 10 }, skills: ['paint', 'fireWall', 'iceWall'],
      desc: '畫什麼就具現化成什麼的插畫結界師。在颱風前線畫一條線，就變成擋住怪物的火牆或冰牆。' },
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
    note: { name: '高音音符', icon: '🎵', mp: 0, cooldown: 450, power: 1, range: 300, basic: true, crit: 0.25,
      desc: '飆一個高音，音符飛過去打人，中距離，爆擊率比較高。' },
    paint: { name: '顏料彈', icon: '🖌️', mp: 0, cooldown: 500, power: 0.9, range: 320, basic: true,
      desc: '甩出一坨顏料潑在怪物身上，中距離。' },
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
    skate: { name: '冰嬉', icon: '❄️', mp: 30, cooldown: 9000, power: 2.5, range: 260, aoe: 260, freeze: 4000,
      desc: '在自己身邊溜冰一大圈，範圍裡的颱風和小怪全部冰凍 4 秒（不會動也不會攻擊），每隻都受到普攻 2.5 倍傷害。' },
    summon: { name: '召喚奇異生物', icon: '👽', mp: 35, cooldown: 8000, power: 0, support: true, summon: true,
      desc: '在颱風前線召喚一隻隨機的奇異生物（共五種，有強有弱），牠會自己去打怪。最多同時 3 隻，被打倒就不會回來。' },
  };

  // 第二招（L 鍵）。aoe：以自己為中心的範圍；aoeAt：以目標為中心的範圍
  Object.assign(SKILLS, {
    sandbag: { name: '堆沙包', icon: '🧱', mp: 20, cooldown: 12000, power: 0, support: true,
      teamDef: { v: 6, ms: 10000, r: 240 },
      desc: '在身邊堆起一圈防颱沙包，身邊隊友（包含自己）防禦 +6，持續 10 秒。哪裡都能用。' },
    forecast: { name: '放晴預報', icon: '🌤️', mp: 25, cooldown: 14000, power: 0, support: true,
      heal: { hp: 20, mp: 30, r: 420 },
      desc: '預言明天會放晴！大範圍的隊友回復 20 血、30 魔力，魔力回得特別多。' },
    defib: { name: '電擊器', icon: '⚡', mp: 18, cooldown: 5000, power: 2.6, range: 150, weaken: 6000,
      desc: '拿電擊器往怪物身上電下去！普攻 2.6 倍傷害，並讓它 6 秒內受到的傷害 +30%。' },
    arrowRain: { name: '箭雨', icon: '🌧️', mp: 25, cooldown: 8000, power: 1.6, range: 480, aoeAt: 200,
      desc: '往天上射一把箭，落在目標附近一大片，範圍裡每隻怪都受到普攻 1.6 倍傷害。' },
    roar: { name: '霸王怒吼', icon: '🦁', mp: 25, cooldown: 10000, power: 1.6, range: 220, aoe: 220,
      selfDef: { v: 20, ms: 8000 }, knock: { mob: 260, boss: 140, stun: 1200 },
      desc: '大吼一聲把身邊的怪全部震飛出去（範圍傷害，普攻 1.6 倍），被震飛的怪暈 1.2 秒，自己 8 秒內防禦 +20。' },
    icicle: { name: '冰錐', icon: '🧊', mp: 20, cooldown: 4500, power: 3.4, range: 340, freeze: 1500,
      desc: '召喚一根大冰錐從天上插下來，普攻 3.4 倍傷害，打中的怪凍住 1.5 秒。' },
    noteBlade: { name: '音刃狂想曲', icon: '🗡️', mp: 18, cooldown: 3000, power: 3.8, range: 340, crit: 0.4,
      desc: '唱出一串音符，音符在空中變成五把刀射過去，普攻 3.8 倍傷害，爆擊率 40%。' },
    anthem: { name: '靈魂之歌', icon: '🎶', mp: 30, cooldown: 15000, power: 0, support: true,
      teamAtk: { mul: 0.3, ms: 12000, r: 380 },
      desc: '唱一首振奮人心的歌，身邊隊友（包含自己）攻擊力 +30%，持續 12 秒。哪裡都能用。' },
    fireWall: { name: '火焰城牆', icon: '🔥', mp: 25, cooldown: 9000, power: 0, support: true,
      wall: { kind: 'fire', ms: 10000, len: 700, burn: 0.5 },
      desc: '在颱風前線拖曳畫一條線（最長 700），變成 10 秒的火牆：怪物過不去，碰到還會被燒（每秒普攻 0.5 倍）。跟冰牆交叉圍成一圈，圈裡會落雷、颳龍捲風。' },
    iceWall: { name: '冰霜城牆', icon: '🧊', mp: 25, cooldown: 9000, power: 0, support: true,
      wall: { kind: 'ice', ms: 10000, len: 700, freeze: 2000 },
      desc: '在颱風前線拖曳畫一條線（最長 700），變成 10 秒的冰牆：怪物過不去，第一次碰到會被凍住 2 秒。跟火牆交叉圍成一圈，圈裡會落雷、颳龍捲風。' },
    mothership: { name: '母艦光束', icon: '🛸', mp: 30, cooldown: 10000, power: 1.8, range: 420, aoeAt: 220, weaken: 5000,
      desc: '呼叫外星母艦從天上照下一道光束，目標附近的怪都受到普攻 1.8 倍傷害，並被削弱 5 秒。' },
  });

  // 武器的普通攻擊：裝備武器以後，空白鍵的普攻換成這些（不管什麼職業）
  Object.assign(SKILLS, {
    lilyDart: { name: '金針花鏢', icon: '🌼', mp: 0, cooldown: 450, power: 1.05, range: 420, basic: true, weapon: true,
      desc: '射出一朵旋轉的金針花，遠距離。（金針花標）' },
    pebbleOrb: { name: '七星彩石彈', icon: '🔮', mp: 0, cooldown: 600, power: 1.05, range: 320, aoeAt: 110, basic: true, weapon: true,
      desc: '法杖射出一顆彩石魔法彈，中距離，打到會在一小塊範圍裡炸開。（七星潭法杖）' },
    marbleSmash: { name: '大理石重錘', icon: '🔨', mp: 0, cooldown: 700, power: 1.8, range: 140, aoe: 150, basic: true, weapon: true,
      desc: '掄起大理石錘往地上砸，近距離，身邊的怪全部打到，傷害最高。（太魯閣戰錘）' },
    cardFlick: { name: '悠遊飛卡', mp: 0, cooldown: 450, power: 1.15, range: 440, basic: true, weapon: true,
      chain: { n: 2, r: 200, mul: 0.6 },
      desc: '把悠遊卡甩出去，遠距離，打中以後會彈到旁邊最多 2 隻怪（六成傷害）。（捷運悠遊卡）' },
    damperSwing: { name: '阻尼甩錘', mp: 0, cooldown: 750, power: 1.6, range: 260, aoeAt: 100, basic: true, weapon: true,
      knock: { mob: 60, boss: 0, stun: 300, noBoss: true },
      desc: '甩出金色的阻尼球，中距離，砸到的地方一小圈都打到，小怪會被撞退。（阻尼球流星錘）' },
    spireThrust: { name: '避雷突刺', mp: 0, cooldown: 650, power: 1.9, range: 200, basic: true, weapon: true,
      chain: { n: 3, r: 240, mul: 0.8, chance: 0.3, bolt: true },
      desc: '長槍往前刺，中近距離，傷害很高；有三成機率引來一道雷，劈到附近最多 3 隻怪。（101 避雷針長槍）' },
  });

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

  // 魔力每秒回 1 點；另外每 8 秒自動回一點點血和魔力（最大值的 4%）
  const REGEN = { mpPerSec: 1, tickMs: 8000, hpPct: 0.04, mpPct: 0.04 };

  // 颱風怪的顯示資料（血量在伺服器設定），名字跟著現在的颱風
  const MONSTER = { name: '薔琵', level: 30 };
  // 第一次被打倒會變身成第二階段：更大、更硬、出招更快，還有新招式
  const MONSTER2 = { name: '超級薔琵', level: 45, scale: 1.4, hpMul: 1.5, transformMs: 3000 };
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
  // 副本裡的怪（只在副本出現，不會自己重生）
  // scale：畫多大；gap：打得到的身體範圍（半寬、頭頂多高、腳下多低）
  Object.assign(MOBS, {
    rock: { name: '落石怪', level: 18, hp: 650, dmg: [9, 14], range: 80, speed: 60, exp: 120, dungeon: true,
      say: ['轟隆隆～', '落石注意！', '擋路擋路', '🪨'] },
    crab: { name: '寄居蟹', level: 15, hp: 420, dmg: [6, 10], range: 70, speed: 80, exp: 80, dungeon: true, scale: 0.7,
      say: ['夾夾！', '這是我的殼', '走開走開'] },
    swallow: { name: '燕子口的燕子', level: 22, hp: 320, dmg: [8, 12], range: 75, speed: 150, exp: 70, dungeon: true, scale: 0.7, hitMs: 1400,
      say: ['啾啾！', '這是我家', '俯衝～'] },
    monkey: { name: '台灣獼猴', level: 25, hp: 750, dmg: [10, 15], range: 75, speed: 95, exp: 150, dungeon: true, scale: 0.8,
      say: ['嘰嘰！', '你的東西我拿走囉', '嘻嘻'] },
    horse: { name: '黑馬分身', level: 40, hp: 900, dmg: [14, 20], range: 90, speed: 95, exp: 150, dungeon: true, scale: 0.8,
      say: ['嘶～', '🐴', '衝啊！'] },
    fu: { name: '花蓮王', level: 50, hp: 9000, dmg: [0, 0], range: 0, speed: 70, exp: 800, dungeon: true, boss: true, scale: 1,
      gap: { half: 46, top: 130, bottom: 16 }, phase2: { name: '暗黑花蓮王', level: 60 },
      say: ['花蓮是我的！', '我們一起努力！', '凍蒜！', '這個我不同意', '👊'] },
    // 台北101副本（要 Lv.50）：血和傷害照 Lv.50 的人調
    sign: { name: '飛天招牌', level: 52, hp: 2600, dmg: [35, 50], range: 85, speed: 70, exp: 220, dungeon: true, noFlip: true,
      say: ['大拍賣！', '最後一天！', '吹走啦～', '跳樓大特價'] },
    scooter: { name: '暴衝機車', level: 54, hp: 2200, dmg: [40, 55], range: 90, speed: 115, exp: 220, dungeon: true, hitMs: 1600,
      say: ['叭叭！', '借過借過', '紅燈右轉！', '嗡嗡嗡～'] },
    bike: { name: '飛天機車', level: 60, hp: 7500, dmg: [60, 80], range: 95, speed: 100, exp: 600, dungeon: true, scale: 0.8,
      gap: { half: 40, top: 90, bottom: 12 }, say: ['暴衝囉！', '安全帽呢？', '叭——！'] },
    blackout: { name: '停電小怪', level: 55, hp: 1800, dmg: [35, 45], range: 80, speed: 90, exp: 180, dungeon: true, sight: 600,
      say: ['啪！', '沒電了～', '誰關燈？', '黑漆漆'] },
    whirl: { name: '小風窩', level: 62, hp: 4000, dmg: [40, 55], range: 90, speed: 60, exp: 300, dungeon: true,
      say: ['呼呼～', '轉轉轉', '風好大'] },
    tianlong: { name: '天龍王', level: 70, hp: 40000, dmg: [0, 0], range: 0, speed: 75, exp: 2500, dungeon: true, boss: true, scale: 1, barY: -200,
      gap: { half: 70, top: 170, bottom: 18 }, phase2: { name: '狂風天龍王', level: 75 }, phase3: { name: '暴走天龍王', level: 80 },
      say: ['天龍國是我的！', '你住哪一區？', '這裡不歡迎你', '看我的龍捲風！'] },
  });
  const MOB_RESPAWN_MS = 45000;
  // 打倒怪會在地上噴出掉落物：每隻怪可以寫自己的 drops，沒寫的用這裡的預設
  // n：一次噴幾個（最少、最多）；food / decor / gear：每一個抽到補品、家具、裝備的權重，加起來不到 100 的部分算沒掉
  // series：限定掉哪些裝備系列；rare：裝備只掉 SR、SSR
  const EAT_CD_MS = 1500; // 隨身吃喝（快捷鍵、背包點兩下）共用冷卻，連按不會變成打不死
  const DROPS = {
    field: { n: [0, 2], food: 35, decor: 25, gear: 8 },
    dungeon: { n: [0, 1], food: 50, gear: 4 },
    boss: { n: [3, 5], food: 40, decor: 30, gear: 30, rare: true }, // 颱風（每多一個有出力的人多噴一個）
  };

  // 現在的普通攻擊：有拿武器就用武器的打法
  function basicOf(cls, equip) {
    const G = typeof module !== 'undefined' && module.exports ? require('./gear') : root.HQ_GEAR;
    const w = equip && G && G.GEAR[equip.weapon];
    return w && w.basic && SKILLS[w.basic] ? w.basic : (CLASSES[cls] || CLASSES.staff).skills[0];
  }
  const skillsOf = (cls, equip) => { const c = CLASSES[cls] || CLASSES.staff; return [basicOf(cls, equip), c.skills[1], c.skills[2]]; };

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

  // 攻擊距離量到敵人身體的邊緣，不是量到腳底中心：颱風雲很大，站在雲旁邊也要打得到
  // 再多給一點寬限，抵掉位置同步的延遲（颱風和人都在動）
  function foeGap(p, foe, isBoss) {
    const k = isBoss && foe.phase === 2 ? MONSTER2.scale : 1; // 變身後體型變大，打得到的範圍也跟著變大
    const kind = !isBoss && (foe.kind || (foe.state && foe.state.kind)), g = kind && MOBS[kind] && MOBS[kind].gap;
    const half = g ? g.half : isBoss ? 100 * k : 26, top = g ? g.top : isBoss ? 180 * k : 70, bottom = g ? g.bottom : isBoss ? 30 * k : 10;
    const dx = Math.max(0, Math.abs(p.x - foe.x) - half);
    const dy = Math.max(0, foe.y - top - p.y, p.y - (foe.y + bottom));
    return Math.hypot(dx, dy) - 40;
  }

  const stats = { BASE, CLASSES, SKILLS, SUMMONS, SUMMON_MAX, SUMMON_HIT_MS, FOODS, REGEN, MONSTER, MONSTER2, RESPAWN_MS, WEAKEN, LEVEL,
    MOBS, MOB_RESPAWN_MS, DROPS, EAT_CD_MS, statsFor, reduce, boost, bonusDef, foeGap, basicOf, skillsOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = stats;
  else root.HQ_STATS = stats;
})(this);
