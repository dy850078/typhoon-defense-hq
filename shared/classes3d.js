// 3D 新世界的職業：芽 → 見習生（選一個學門，兩邊的基礎招都學）→ 三轉（專精其中一邊）
// 伺服器（nw-combat.js）和畫面（newworld-skills.js、newworld/world/58-combat.js）共用這一份
// 跟總部（2D）的職業、等級完全分開：新世界一律從 1 等的芽開始
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.HQ_CLS3 = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  const SCHOOLS = {
    pm: { name: '毒與藥', specs: ['skater', 'healer'], basics: ['bubble', 'potion'], col: '#9a6fd0' },
    sc: { name: '封印與契約', specs: ['barrier', 'summoner'], basics: ['seal', 'pact'], col: '#4f7cc2' },
    ae: { name: '鍊金與附魔', specs: ['alchemist', 'puppeteer'], basics: ['transmute', 'enchant'], col: '#d9a23a' },
  };
  // swap：專精後直接取代的基礎招；own：專精才有的招（最後一個是大招）；basic：普攻的樣子
  const SPECS = {
    skater: { name: '陵媒', school: 'pm', swap: {}, own: ['scent', 'waltz', 'corrode', 'ball', 'firework'], basic: 'fan' },
    healer: { name: '聖癒者', school: 'pm', swap: { potion: 'heart' }, own: ['lamp', 'meteor'], basic: 'star' },
    barrier: { name: '結界師', school: 'sc', swap: { seal: 'lock' }, own: ['cliff', 'box'], basic: 'cube' },
    summoner: { name: '召喚師', school: 'sc', swap: { pact: 'pact2' }, own: ['bond', 'envoy'], basic: 'orb' },
    alchemist: { name: '鍊金術師', school: 'ae', swap: {}, own: ['shelter', 'exchange', 'fear'], basic: 'mecha' },
    puppeteer: { name: '操偶師', school: 'ae', swap: {}, own: ['stitch', 'string', 'curtain'], basic: 'needle' },
  };
  // 普攻：range 多遠打得到、every 幾秒一下、mul 攻擊力的倍數
  const BASIC = {
    sprout: { range: 6, every: 1.1, mul: 1 }, pm: { range: 7, every: 1.1, mul: 1 }, sc: { range: 7, every: 1.1, mul: 1 }, ae: { range: 6, every: 1.1, mul: 1.05 },
    fan: { range: 6, every: 1.0, mul: 1.05 }, star: { range: 7.5, every: 1.1, mul: 0.95 }, cube: { range: 7, every: 1.1, mul: 1 }, orb: { range: 7.5, every: 1.2, mul: 0.9 },
    mecha: { range: 6.5, every: 1.2, mul: 1.35, slam: 4 }, needle: { range: 8, every: 0.9, mul: 0.95 },
  };
  // 招式：mp 耗魔、cd 冷卻秒數、range 施放距離（0 是放在自己身上）、aim 要不要選一隻怪
  // 其餘的數字給伺服器算效果用；line 是技能書裡的一句話
  const SK = {
    // 芽
    spark: { name: '小火花', mp: 6, cd: 3, range: 8, aim: 1, dmg: 1.8, line: '丟一顆小火球' },
    blink: { name: '歪歪瞬移', mp: 8, cd: 6, range: 0, dist: 5.5, line: '往前閃一小段，落點會歪一點' },
    // 毒與藥
    bubble: { name: '冒泡毒瓶', mp: 10, cd: 6, range: 8, aim: 1, r: 2.6, dmg: 0.8, dot: 0.45, dur: 6, line: '紫色骷髏泡泡，中毒一陣子' },
    potion: { name: '甜甜藥水', mp: 12, cd: 8, range: 0, r: 5, heal: 0.3, one: 1, line: '補自己，或身邊最虛弱的人' },
    scent: { name: '暗香', mp: 14, cd: 12, range: 0, r: 5.5, weak: 0.25, vuln: 0.25, dur: 8, line: '身邊的怪變弱，也更怕痛' },
    waltz: { name: '冰上圓舞', mp: 16, cd: 8, range: 0, r: 4.2, dmg: 2.4, slow: 0.5, dur: 4, line: '轉一圈，冰刀掃過身邊的怪' },
    ball: { name: '永凍舞會', mp: 40, cd: 45, range: 0, r: 7, dmg: 4.5, freeze: 4, ult: 1, line: '整片結冰，怪全部凍住' },
    corrode: { name: '蝕骨', mp: 16, cd: 8, range: 8, aim: 1, dmg: 1.2, dot: 0.9, dur: 8, vuln: 0.2, line: '一隻怪中劇毒，越來越怕痛' },
    firework: { name: '骷髏煙火', mp: 40, cd: 45, range: 9, aim: 1, r: 5, dmg: 5, poisoned: 1.6, ult: 1, line: '骷髏煙火炸開，中毒的怪更痛' },
    heart: { name: '愛心泡泡', mp: 16, cd: 8, range: 0, r: 6, heal: 0.35, line: '身邊的人一起補血' },
    lamp: { name: '星星燈', mp: 20, cd: 16, range: 0, r: 4.5, dur: 8, heal: 0.06, dmg: 0.7, line: '放一盞燈，隊友回血、怪受傷' },
    meteor: { name: '許願流星', mp: 45, cd: 45, range: 9, aim: 1, r: 5.5, dmg: 5.5, heal: 0.5, ult: 1, line: '流星落下，補隊友也打怪' },
    // 封印與契約
    seal: { name: '結界', mp: 10, cd: 7, range: 8, aim: 1, dmg: 0.9, root: 3, line: '框住一隻怪，讓牠動不了' },
    pact: { name: '契約', mp: 14, cd: 20, range: 0, dur: 20, max: 1, tier: [0], line: '叫出一隻小使魔幫忙' },
    lock: { name: '禁錮', next: '崩壞', mp: 18, cd: 9, range: 8, aim: 1, r: 3.6, root: 4, dmg: 0.6, dmg2: 4.2, line: '先框住一群，再按一次壓碎' },
    cliff: { name: '絕壁', mp: 18, cd: 14, range: 0, r: 2.6, dur: 6, dmg: 0.5, line: '立起一道牆，怪進不來' },
    box: { name: '封印之匣', mp: 45, cd: 45, range: 9, aim: 1, r: 4.5, seal: 3, dmg: 7, ult: 1, line: '把怪關進匣子，然後壓扁' },
    pact2: { name: '契約', mp: 18, cd: 12, range: 0, dur: 40, max: 2, tier: [0, 0, 0, 1, 1, 2], line: '叫出使魔，有強有弱，最多兩隻' },
    bond: { name: '同心', mp: 16, cd: 18, range: 0, dur: 10, up: 0.6, guard: 0.3, line: '使魔變強，還替你擋一部分傷害' },
    envoy: { name: '聖誕使者', mp: 45, cd: 50, range: 0, dur: 16, ult: 1, line: '叫出最強的那一位' },
    // 鍊金與附魔
    transmute: { name: '鍊成', mp: 12, cd: 7, range: 7, aim: 1, r: 2.4, dmg: 1.9, stun: 1, line: '鍊出一隻大手，捶下去' },
    enchant: { name: '附魔', mp: 14, cd: 16, range: 0, r: 6, atk: 0.3, dur: 10, line: '自己和隊友的攻擊變強' },
    shelter: { name: '庇護', mp: 16, cd: 16, range: 0, r: 5, guard: 0.6, dur: 5, taunt: 1, line: '機甲擋在前面，大家受傷大減' },
    exchange: { name: '等價交換', mp: 0, cd: 20, range: 0, pay: 0.3, up: 1.0, dur: 12, line: '付出自己的血量，換機甲變強' },
    fear: { name: '恐懼具現', mp: 45, cd: 50, range: 0, dur: 10, up: 1.0, r: 6, dmg: 6, ult: 1, line: '機甲長成兩倍大，最後雙手砸下' },
    stitch: { name: '縫合', mp: 14, cd: 10, range: 8, aim: 1, r: 4, max: 4, share: 0.5, dur: 8, dmg: 0.8, line: '把幾隻怪縫在一起，一起受傷' },
    string: { name: '提線', next: '甩出去', mp: 18, cd: 14, range: 8, aim: 1, dur: 8, dmg2: 3.2, r: 3, line: '控制一隻怪替你打，再按一次甩出去' },
    curtain: { name: '謝幕', mp: 45, cd: 45, range: 0, r: 7, lift: 2, dmg: 6, tied: 1.5, ult: 1, line: '所有的線往上收，一刀剪斷' },
  };
  // 召喚師的使魔（繪師的聖誕外星人）：弱、中、強，還有大招的那一位
  const FAMILIARS = [
    { id: 'star', name: '星星臉', atk: 0.55, every: 1.3 },
    { id: 'bloom', name: '三眼花農', atk: 0.85, every: 1.3 },
    { id: 'wreath', name: '花圈長老', atk: 1.25, every: 1.4 },
    { id: 'envoy', name: '聖誕使者', atk: 2.4, every: 1.2, r: 3 },
  ];
  const LEVEL = { max: 99, expFor: (lv) => Math.round(40 * Math.pow(lv, 1.6)), hp: (lv) => 100 + 25 * lv, mp: (lv) => 50 + 8 * lv, atk: (lv) => 10 + 4 * lv };
  // 轉職門檻：10 等選學門；50 等、見習生熟練度練滿（打怪次數）再加收集信物，才能專精
  const GATE = { school: 10, spec: 50, mastery: 1200 };
  // 三轉任務：每個職業要收集的五樣東西 [名字, 要幾個, 哪一種怪會掉]
  const QUEST = {
    skater: [['冰晶', 10, 'slime'], ['紫菇粉', 10, 'shroom'], ['石苔', 8, 'golem'], ['夜露', 6, 'wisp'], ['空香水瓶', 1, 'boss']],
    healer: [['星星碎片', 10, 'slime'], ['軟菇絨', 10, 'shroom'], ['白石粉', 8, 'golem'], ['微光', 6, 'wisp'], ['玻璃燈罩', 1, 'boss']],
    barrier: [['東方界石', 1, 'slime'], ['南方界石', 1, 'shroom'], ['西方界石', 1, 'golem'], ['北方界石', 1, 'wisp'], ['定界的樁', 1, 'boss']],
    summoner: [['果凍墨', 10, 'slime'], ['菇皮紙', 10, 'shroom'], ['印章石', 8, 'golem'], ['會發光的緞帶', 6, 'wisp'], ['使魔想要的禮物', 1, 'boss']],
    alchemist: [['黏稠的膠', 10, 'slime'], ['菇柄關節', 10, 'shroom'], ['石偶的甲片', 8, 'golem'], ['一小團影子', 6, 'wisp'], ['自己最怕的東西', 1, 'boss']],
    puppeteer: [['果凍線', 10, 'slime'], ['菇絨棉', 10, 'shroom'], ['石針', 8, 'golem'], ['影子剪刀', 6, 'wisp'], ['沒有臉的人偶', 1, 'boss']],
  };
  const QUEST_RATE = { slime: 0.45, shroom: 0.45, golem: 0.4, wisp: 0.4, boss: 1 };
  // 練習場的怪：lv 等級、hp/atk 是同等級玩家的幾倍
  const MOBS = {
    slime: { name: '果凍', hp: 0.5, atk: 0.35, sp: 2.0, r: 0.6 },
    shroom: { name: '香菇怪', hp: 0.7, atk: 0.45, sp: 2.2, r: 0.7 },
    golem: { name: '石偶', hp: 1.1, atk: 0.55, sp: 1.8, r: 0.9 },
    wisp: { name: '影子', hp: 0.8, atk: 0.7, sp: 2.8, r: 0.6 },
    boss: { name: '大石偶', hp: 9, atk: 0.9, sp: 2.0, r: 1.6, boss: 1 },
  };
  const clsName = (s) => (s && s.spec ? SPECS[s.spec].name : s && s.school ? '見習生' : '芽');
  const basicOf = (s) => BASIC[s && s.spec ? SPECS[s.spec].basic : s && s.school ? s.school : 'sprout'];
  const basicKey = (s) => (s && s.spec ? SPECS[s.spec].basic : s && s.school ? s.school : 'sprout');
  // 現在這個職業會的招（照學會的順序）
  function learned(s) {
    const out = ['spark', 'blink'];
    if (!s || !s.school || !SCHOOLS[s.school]) return out;
    const sp = s.spec && SPECS[s.spec] && SPECS[s.spec].school === s.school ? SPECS[s.spec] : null;
    SCHOOLS[s.school].basics.forEach(k => out.push(sp && sp.swap[k] ? sp.swap[k] : k));
    if (sp) sp.own.forEach(k => out.push(k));
    return out;
  }
  // 選修：別的學門學過的基礎招（進過那個學門就算學過）
  function electives(s) {
    const out = [];
    if (!s || !s.school) return out;
    Object.keys(SCHOOLS).forEach(k => { if (k !== s.school && s.schools && s.schools[k]) SCHOOLS[k].basics.forEach(b => out.push(b)); });
    return out;
  }
  // 四顆鈕：前三顆只能放自己會的，第四顆是選修欄（也可以放自己會的）；不合規定的清掉，空的照順序補上
  function cleanSlots(s, slots) {
    const mine = learned(s), el = electives(s), out = [null, null, null, null], used = {};
    for (let i = 0; i < 4; i++) { const k = Array.isArray(slots) ? slots[i] : null;
      if (typeof k === 'string' && !used[k] && (mine.includes(k) || (i === 3 && el.includes(k)))) { out[i] = k; used[k] = 1; } }
    return out;
  }
  function autoSlots(s, slots) {
    const out = cleanSlots(s, slots), free = out.filter(k => !k).length, rest = learned(s).filter(m => !out.includes(m)), add = rest.slice(Math.max(0, rest.length - free));
    for (let i = 0; i < 4; i++) if (!out[i] && add.length) out[i] = add.shift();
    return out;
  }
  return { SCHOOLS, SPECS, BASIC, SK, FAMILIARS, LEVEL, GATE, QUEST, QUEST_RATE, MOBS, clsName, basicOf, basicKey, learned, electives, cleanSlots, autoSlots };
});
