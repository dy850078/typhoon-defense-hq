// 台北101副本的關卡：信義廣場打三波怪 → 101 電梯井答題 → 87 樓阻尼球（照顏色順序點控制台）
// → 91 樓戶外觀景台（強風、落雷、五根避雷針全部點亮）→ 觀景台打天龍王
// 比花蓮難很多：要 Lv.50、怪的血和傷害照 Lv.50 的人調、每一關都有一個人做不到的機制
// 共用的部分（出發、復活、掉武器…）在 dungeon.js，這裡拿到的 a 是它給的工具
const envNum = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
const BOSS_HP = Math.max(1, envNum(process.env.TP_BOSS_HP, 40000));
const BOSS_HP_PER_PLAYER = envNum(process.env.TP_BOSS_HP_PER_PLAYER, 12000);
const MOB_HP_MUL = Math.max(0.001, envNum(process.env.TP_MOB_HP_MUL, 1)); // 測試用：小怪血量倍率
const DMG_MUL = Math.max(0, envNum(process.env.TP_DMG_MUL, 1)); // 測試用：怪打人的傷害倍率

// 關卡編號（0 起算）
const PLAZA = 0, SHAFT = 1, DAMPER = 2, DECK = 3, BOSS_STAGE = 4;

// 101 電梯井的題目：答案都是數字，地上四顆按鈕各寫一個
const QUIZ = [
  { q: '台北101 的外觀有幾節「竹節」？', a: 8, opts: [6, 8, 9, 10] },
  { q: '台北101 地上有幾層樓？', a: 101, opts: [88, 99, 101, 110] },
  { q: '101 的室內觀景台在幾樓？', a: 89, opts: [85, 88, 89, 101] },
  { q: '101 的戶外觀景台在幾樓？', a: 91, opts: [89, 91, 95, 101] },
  { q: '101 大約幾公尺高？', a: 508, opts: [450, 508, 555, 634] },
  { q: '101 是哪一年開幕的？', a: 2004, opts: [1999, 2002, 2004, 2008] },
  { q: '101 的電梯從 5 樓到 89 樓大約幾秒？', a: 37, opts: [37, 58, 75, 120] },
  { q: '台灣有幾個直轄市？', a: 6, opts: [4, 5, 6, 7] },
  { q: '台灣的國際電話國碼是多少？', a: 886, opts: [852, 853, 886, 889] },
  { q: '一年有幾個節氣？', a: 24, opts: [12, 18, 24, 36] },
  { q: '台灣麻將一副（含花牌）有幾張？', a: 144, opts: [108, 136, 144, 152] },
  { q: '玉山主峰大約幾公尺高？', a: 3952, opts: [3492, 3886, 3952, 4101] },
  { q: '台北捷運第一條路線（木柵線）是哪一年通車的？', a: 1996, opts: [1988, 1996, 2000, 2005] },
];
const COLOR_NAMES = ['紅', '黃', '綠', '藍'];

// 信義廣場的三波怪
const WAVES = [
  [['sign', 5]],
  [['sign', 3], ['scooter', 3]],
  [['scooter', 2], ['sign', 2], ['bike', 2]],
];
// 天龍王的招式：sweep 龍尾掃一圈、bolt 在人腳下打雷
const ATK = {
  sweep: { r: 210, delay: 1100, dmg: [110, 150] },
  bolt: { r: 85, delay: 1300, dmg: [90, 120] },
  dash: { len: 380, w: 90, delay: 1000, dmg: [80, 100] }, // 飛天機車的衝撞
};
const PHASE_MUL = [1, 1, 1.15, 1.3];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 地上的機關（掉招牌、阻尼球）不是怪，借一個「環境」當出招的人
const env = (stage) => ({ id: 'tp-env-' + stage, alive: true, frozenUntil: 0, weakUntil: 0, stage, kind: 'sign' });

const R = {
  boss: 'tianlong', clearExp: 2000, dmgMul: DMG_MUL,
  bossExtra: (a) => {
    const hp = BOSS_HP + BOSS_HP_PER_PLAYER * a.st.members.size, now = a.now0();
    return { hp, maxHp: hp, phase: 1, nextAttack: now + 4000, transformUntil: 0,
      nextGust: 0, nextShare: 0, nextStorm: 0, nextWhirl: 0 };
  },

  reset(a) {
    Object.assign(a.st, { wave: 0, waveAt: 0, nextDrop: 0, lit: [0, 0, 0, 0], litKey: '', ballT0: 0, ballHit: new Map(), nextBlackout: 0,
      quiz: null, asked: [], qDone: 0, qHold: [0, 0, 0, 0], qLockUntil: 0,
      order: [], onConsole: new Map(), rods: [false, false, false, false, false], onRod: new Map(), nextGustAt: 0, nextBoltAt: 0 });
  },
  publicState(a) {
    const { st, D } = a, now = a.now0(), q = st.quiz;
    return {
      wave: st.wave, waves: WAVES.length,
      lit: st.lit.map(t => Math.max(0, t - now)), litMs: litMs(a),
      // 阻尼球現在盪到哪裡（0～1 是一個來回），畫面自己接著算
      ballPh: st.stage === DAMPER && st.phase === 'run' && st.ballT0 ? ((now - st.ballT0) % D.ball.period) / D.ball.period : null,
      // 電梯井：題目、四個選項、答對幾題；誰站在哪顆按鈕上、站了多久（0～1）
      quiz: q && st.stage === SHAFT ? { q: q.q, opts: q.opts, done: st.qDone, need: D.quiz.need,
        hold: st.qHold.map(t => (t ? Math.min(1, (now - t) / D.quiz.holdMs) : 0)) } : null,
      // 阻尼球身上會照順序閃的顏色（控制台編號）
      order: st.stage === DAMPER ? st.order : [],
      rods: st.rods,
    };
  },
  launch(a) {
    const now = a.now0();
    Object.assign(a.st, { wave: 0, waveAt: now + 3000, nextDrop: now + 6000 });
  },
  leave: (a, id) => { a.st.ballHit.delete(id); a.st.onConsole.delete(id); a.st.onRod.delete(id); },

  onStageClear(a, i) {
    const { st } = a, now = a.now0();
    const kill = (kind) => st.foes.filter(f => f.kind === kind && f.alive).forEach(f => { f.alive = false; a.io.emit('mob', a.mobState(f)); });
    if (i === PLAZA) {
      a.say(`✨ 三波都擋下來了！電梯面板壞掉了……答對 ${a.D.quiz.need} 題，電梯才會往上開`);
      nextQuestion(a);
    }
    if (i === SHAFT) {
      kill('sign');
      a.say('✨ 電梯修好了，往上到 87 樓……阻尼球身上會閃顏色，照那個順序點亮控制台');
      st.ballT0 = now; st.nextBlackout = now + 4000;
      st.order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    }
    if (i === DAMPER) {
      kill('blackout');
      a.say('✨ 阻尼球停下來了！電梯把大家送到 91 樓戶外觀景台……把五根避雷針全部點亮');
      st.ballT0 = 0;
      // 一開始亮兩根（不會全亮）
      const k = Math.floor(Math.random() * 5);
      st.rods = [0, 1, 2, 3, 4].map(j => j === k || j === (k + 2) % 5);
      st.nextGustAt = now + 9000; st.nextBoltAt = now + 6000;
    }
    if (i === DECK) a.say('✨ 五根避雷針都亮了，雷雲散開！觀景台的門打開……天龍王在等你們');
  },

  tick(a, now) {
    const s = a.st.stage;
    if (s === PLAZA) tickPlaza(a, now);
    else if (s === SHAFT) tickShaft(a, now);
    else if (s === DAMPER) tickDamper(a, now);
    else if (s === DECK) tickDeck(a, now);
  },

  // 飛天機車：每隔一陣子在地上畫一條線，衝撞過去
  tickMob(a, m, now, prey) {
    if (m.kind !== 'bike' || !prey || prey.summon || now < (m.nextDash || 0)) return false;
    m.nextDash = now + 6500 + Math.random() * 1500;
    if (!m.nextDash0) { m.nextDash0 = true; return false; } // 剛出來先不要衝
    line(a, m, prey, ATK.dash, '暴衝！');
    return true;
  },

  // 天龍王：血掉到 2/3、1/3 各換一個階段
  onHurt(a, f, now) {
    if (f.kind !== 'tianlong') return;
    const want = f.hp <= f.maxHp / 3 ? 3 : f.hp <= f.maxHp * 2 / 3 ? 2 : 1;
    if (want <= f.phase) return;
    const def = a.STATS.MOBS.tianlong;
    f.phase = want;
    f.transformUntil = now + 2200;
    f.nextAttack = now + 3500;
    if (want === 2) { f.nextGust = now + 4000; f.nextShare = now + 9000; }
    if (want === 3) { f.nextWhirl = now + 3000; f.nextStorm = now + 8000; f.nextGust = Math.max(f.nextGust, now + 12000); }
    a.io.emit('mob', a.mobState(f));
    a.say(want === 2
      ? `🌪️ ${def.name}召來強風，變成「${def.phase2.name}」！紅色區域會被風吹走，頭上有紅圈的人要大家一起分擔`
      : `⚡ ${def.name}暴走成「${def.phase3.name}」！小風窩會讓天龍暴風更痛，暴風來的時候躲到柱子後面`);
  },

  tickBoss(a, f, now) {
    const { st } = a;
    if (now < f.frozenUntil || now < f.stunUntil || now < f.transformUntil || (f.busyUntil || 0) > now) return;
    const b = a.box(BOSS_STAGE), ph = f.phase;
    const prey = a.activeMembers().filter(p => a.inBox(b, p.x, p.y));
    if (!prey.length) return;
    let near = prey[0], nd = Infinity;
    prey.forEach(p => { const d = a.dist(p.x, p.y, f.x, f.y); if (d < nd) { nd = d; near = p; } });
    f.tx = near.x; f.ty = near.y;
    a.moveFoe(f, [0, 75, 90, 110][ph], 100);
    const whirls = st.foes.filter(h => h.kind === 'whirl' && h.alive);
    // 第三階段：小風窩（最多兩隻）
    if (ph >= 3 && now >= f.nextWhirl && whirls.length < 2) {
      f.nextWhirl = now + 20000;
      for (let k = whirls.length; k < 2; k++) {
        const s = spot(a, BOSS_STAGE, 220);
        a.spawnFoe('whirl', s.x, s.y, BOSS_STAGE, mobHp('whirl', a));
      }
      a.io.emit('mobAttack', { mid: f.id, id: near.id, say: '風窩，起來！' });
    }
    // 第三階段：天龍暴風，全場都會被打到，只有躲在柱子後面才安全
    if (ph >= 3 && now >= f.nextStorm) {
      f.nextStorm = now + 30000;
      const D = a.D, bx = f.x, by = f.y, mul = 1 + 0.25 * whirls.length;
      f.busyUntil = now + 4300;
      a.telegraph(f, { type: 'storm', delay: 4000, x: Math.round(bx), y: Math.round(by), mul, box: b, pillars: D.pillars, label: '天龍暴風！躲到柱子後面' }, {
        hit: (p) => !behindPillar(a, bx, by, p), dmg: (p) => (p.maxHp || 300) * 0.7 * mul, by: '天龍暴風',
      });
      return;
    }
    // 第二階段起：強風，一半的觀景台會被吹（右邊那半會直接被吹出去）
    if (ph >= 2 && now >= f.nextGust) {
      f.nextGust = now + 15000;
      const right = Math.random() < 0.5, mid = (b.x1 + b.x2) / 2;
      const rect = right ? { x1: mid, y1: b.y1, x2: b.x2, y2: b.y2 } : { x1: b.x1, y1: b.y1, x2: mid, y2: b.y2 };
      f.busyUntil = now + 1200;
      a.telegraph(f, { type: 'gust', delay: 2600, rect, dir: right ? 1 : -1, label: right ? '強風！會被吹下觀景台' : '強風！會被吹去撞牆' }, {
        hit: (p) => a.inBox(rect, p.x, p.y), dmg: (p) => right ? 99999 : (p.maxHp || 300) * 0.75, by: right ? '強風（被吹下觀景台）' : '強風',
      });
      return;
    }
    // 第二階段起：分攤，頭上的紅圈跟著那個人走，圈裡人越多每個人扣越少
    if (ph >= 2 && now >= f.nextShare) {
      f.nextShare = now + 18000;
      const t = pick(prey), total = ph >= 3 ? 800 : 650, r = 120;
      a.telegraph(f, { type: 'share', delay: 3000, target: t.id, r, total, label: '分攤！大家靠過去' }, {
        hit: (p) => a.dist(p.x, p.y, t.x, t.y) <= r, dmg: (p, victims) => total / Math.max(1, victims.length), by: '天龍分攤',
      });
      return;
    }
    if (now < f.nextAttack) return;
    f.nextAttack = now + (ph === 1 ? 3000 + Math.random() * 1200 : ph === 2 ? 2600 + Math.random() * 1000 : 1900 + Math.random() * 900);
    const mul = PHASE_MUL[ph];
    if (Math.random() < 0.5) {
      const at = ATK.sweep, x = Math.round(f.x), y = Math.round(f.y);
      a.telegraph(f, { type: 'sweep', delay: at.delay, spots: [{ x, y }], r: at.r, label: '龍尾掃！' }, {
        hit: (p) => a.dist(p.x, p.y, x, y) <= at.r, dmg: () => a.rand(at.dmg) * mul,
      });
    } else {
      const at = ATK.bolt, max = ph >= 3 ? 5 : 3;
      const spots = prey.slice().sort(() => Math.random() - 0.5).slice(0, max).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
      a.telegraph(f, { type: 'bolt', delay: at.delay, spots, r: at.r, label: '天龍落雷！' }, {
        hit: (p) => spots.some(s => a.dist(p.x, p.y, s.x, s.y) <= at.r), dmg: () => a.rand(at.dmg) * mul,
      });
    }
  },
};

// ---------------- 第一關：信義廣場 ----------------
function tickPlaza(a, now) {
  const { st } = a;
  if (st.waveAt && now >= st.waveAt) {
    st.waveAt = 0;
    WAVES[st.wave].forEach(([kind, n]) => { for (let i = 0; i < n; i++) { const s = spot(a, 0, 240); a.spawnFoe(kind, s.x, s.y, 0, mobHp(kind, a)); } });
    st.wave++;
    a.say(`📢 信義廣場第 ${st.wave} 波！${st.wave === WAVES.length ? '飛天機車來了，看到地上的線快閃開' : '颱風把招牌和機車都吹過來了'}`);
    a.emit();
  }
  if (!st.waveAt && !st.foes.some(f => f.stage === 0 && f.alive)) {
    if (st.wave >= WAVES.length) return a.clearStage(0);
    st.waveAt = now + 3500;
  }
  // 風把招牌吹下來：地上先出現紅圈，1.5 秒後砸下來
  if (now >= st.nextDrop) {
    st.nextDrop = now + (st.wave >= 3 ? 3000 : 4200) + Math.random() * 1200;
    const b = a.box(0), who = a.activeMembers().filter(p => a.inBox(b, p.x, p.y)).sort(() => Math.random() - 0.5).slice(0, 2);
    if (!who.length) return;
    const r = 80, spots = who.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
    a.telegraph(env(0), { type: 'drop', delay: 1500, spots, r, label: '招牌掉下來了！' }, {
      hit: (p) => spots.some(s => a.dist(p.x, p.y, s.x, s.y) <= r), dmg: () => a.rand([70, 95]), by: '被風吹落的招牌',
    });
  }
}

// ---------------- 第三關：阻尼球 ----------------
function litMs(a) { return a.st.members.size >= 4 ? 5000 : 8000; }
function ballPos(a, now) {
  const B = a.D.ball, ph = ((now - a.st.ballT0) % B.period) / B.period;
  return { x: (B.x1 + B.x2) / 2 + (B.x2 - B.x1) / 2 * Math.sin(ph * Math.PI * 2), y: B.y };
}
function tickDamper(a, now) {
  const { st, D } = a;
  // 控制台：要照阻尼球閃的顏色順序踩，踩對就亮，離開後還會亮一下子；四個同時亮著就過關
  // 已經亮著的再踩一次會重新計時；踩到還沒輪到的控制台：全部熄掉，還會冒一隻停電小怪
  const litNow = (i) => st.lit[i] > now;
  let pos = 0; while (pos < 4 && litNow(st.order[pos])) pos++;
  a.activeMembers().forEach(p => {
    const i = D.consoles.findIndex(c => a.dist(p.x, p.y, c.x, c.y) < 40);
    if (i < 0) { st.onConsole.delete(p.id); return; }
    if (litNow(i)) { st.lit[i] = now + litMs(a); st.onConsole.set(p.id, i); return; }
    if (st.onConsole.get(p.id) === i) return;
    st.onConsole.set(p.id, i);
    if (st.order[pos] === i) { st.lit[i] = now + litMs(a); pos++; return; }
    st.lit = [0, 0, 0, 0]; pos = 0;
    a.say(`💥 ${p.name} 踩到${COLOR_NAMES[i]}色控制台，順序錯了！控制台全部熄掉，看清楚阻尼球閃的顏色`);
    if (st.foes.filter(f => f.kind === 'blackout' && f.alive).length < 5) { const s = spot(a, DAMPER, 200); a.spawnFoe('blackout', s.x, s.y, DAMPER, mobHp('blackout', a)); }
  });
  const key = st.lit.map(t => (t > now ? 1 : 0)).join('');
  if (key === '1111') return a.clearStage(DAMPER);
  if (key !== st.litKey) { st.litKey = key; a.emit(); }
  // 被阻尼球掃到：重傷，往上或往下被彈開
  const ball = ballPos(a, now), B = D.ball, box = a.box(DAMPER);
  a.activeMembers().forEach(p => {
    if (!a.inBox(box, p.x, p.y) || a.dist(p.x, p.y - 20, ball.x, ball.y) > B.r + 22) return;
    if (now - (st.ballHit.get(p.id) || 0) < 1200) return;
    st.ballHit.set(p.id, now);
    const dir = p.y < ball.y ? -1 : 1;
    let ny = a.clamp(p.y + dir * 150, box.y1 + 30, box.y2 - 10);
    if (a.MAP.isBlocked(p.x, ny)) ny = p.y;
    a.io.emit('dgBallHit', { id: p.id, x: Math.round(p.x), y: Math.round(p.y) });
    a.hurtPlayer(p, a.rand([150, 190]), '阻尼球');
    if (!p.dead) a.teleport(p, p.x, ny);
  });
  // 停電小怪：每 11 秒冒一隻出來搗亂（最多 4 隻）
  if (now >= st.nextBlackout) {
    st.nextBlackout = now + 11000;
    if (st.foes.filter(f => f.kind === 'blackout' && f.alive).length < 4) {
      const s = spot(a, DAMPER, 200);
      a.spawnFoe('blackout', s.x, s.y, DAMPER, mobHp('blackout', a));
    }
  }
}

// ---------------- 第二關：101 電梯井 ----------------
function nextQuestion(a) {
  const { st } = a;
  if (st.asked.length >= QUIZ.length) st.asked = [];
  const left = QUIZ.map((q, i) => i).filter(i => !st.asked.includes(i));
  const k = left[Math.floor(Math.random() * left.length)];
  st.asked.push(k);
  st.quiz = QUIZ[k];
  st.qHold = [0, 0, 0, 0];
  st.qLockUntil = a.now0() + 1500;
  a.emit();
}
// 站在答案按鈕上 1.5 秒就算選了那個答案；答錯題目換一題，還會掉兩塊招牌下來
function tickShaft(a, now) {
  const { st, D } = a, Q = D.quiz;
  if (!st.quiz) return;
  const on = Q.buttons.map(b => a.activeMembers().some(p => a.dist(p.x, p.y, b.x, b.y) < 40));
  let changed = false;
  on.forEach((v, i) => {
    if (v && !st.qHold[i] && now >= st.qLockUntil) { st.qHold[i] = now; changed = true; }
    if (!v && st.qHold[i]) { st.qHold[i] = 0; changed = true; }
  });
  const pick = st.qHold.findIndex(t => t && now - t >= Q.holdMs);
  if (pick >= 0) {
    const q = st.quiz, ok = q.opts[pick] === q.a;
    a.io.emit('dgQuiz', { ok, i: pick });
    if (ok) {
      st.qDone++;
      if (st.qDone >= Q.need) { st.quiz = null; return a.clearStage(SHAFT); }
      a.say(`✅ 答對了！「${q.q}」答案是 ${q.a}（${st.qDone}/${Q.need}）`);
    } else {
      a.say(`❌ 答錯了……「${q.q}」不是 ${q.opts[pick]}。電梯晃了一下，招牌掉下來了！換一題`);
      for (let k = 0; k < 2; k++) { const s = spot(a, SHAFT, 200); a.spawnFoe('sign', s.x, s.y, SHAFT, mobHp('sign', a)); }
    }
    return nextQuestion(a);
  }
  if (changed || (st.qHold.some(Boolean) && now - (st.qEmit || 0) > 300)) { st.qEmit = now; a.emit(); }
}

// ---------------- 第四關：91 樓戶外觀景台 ----------------
// 碰一根避雷針：它和左右兩根一起切換亮暗；五根都亮就過關。強風會把一半的人吹走，還會落雷
function tickDeck(a, now) {
  const { st, D } = a, b = a.box(DECK);
  a.activeMembers().forEach(p => {
    const i = D.rods.findIndex(r => a.dist(p.x, p.y, r.x, r.y + 20) < 44);
    if (i < 0) { st.onRod.delete(p.id); return; }
    if (st.onRod.get(p.id) === i) return;
    st.onRod.set(p.id, i);
    [i + 4, i, i + 1].forEach(k => { st.rods[k % 5] = !st.rods[k % 5]; });
    a.io.emit('dgRod', { i, id: p.id });
    if (st.rods.every(Boolean)) return a.clearStage(DECK);
    a.emit();
  });
  if (st.stage !== DECK) return;
  const here = a.activeMembers().filter(p => a.inBox(b, p.x, p.y));
  if (now >= st.nextGustAt) {
    st.nextGustAt = now + 9000 + Math.random() * 3000;
    const right = Math.random() < 0.5, mid = (b.x1 + b.x2) / 2, dir = right ? 1 : -1;
    const rect = right ? { x1: mid, y1: b.y1, x2: b.x2, y2: b.y2 } : { x1: b.x1, y1: b.y1, x2: mid, y2: b.y2 };
    a.telegraph(env(DECK), { type: 'gust', delay: 2400, rect, dir, label: '強風！會被吹走' }, {
      hit: (p) => a.inBox(rect, p.x, p.y), dmg: () => a.rand([40, 60]), by: '91 樓的強風',
      // 被吹的人往風的方向滑 3 格（撞到欄杆就停）
      after: (victims) => victims.forEach(p => {
        if (p.dead) return;
        let x = p.x;
        for (let s = 0; s < 3 * a.T; s += 12) { const nx = p.x + dir * s; if (!a.inBox(b, nx, p.y) || a.MAP.isBlocked(nx, p.y)) break; x = nx; }
        a.teleport(p, Math.round(x), p.y);
        a.st.onRod.delete(p.id);
      }),
    });
  }
  if (now >= st.nextBoltAt && here.length) {
    st.nextBoltAt = now + 5000 + Math.random() * 2000;
    const r = 85, spots = here.slice().sort(() => Math.random() - 0.5).slice(0, 3).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
    a.telegraph(env(DECK), { type: 'bolt', delay: 1400, spots, r, label: '落雷！' }, {
      hit: (p) => spots.some(s => a.dist(p.x, p.y, s.x, s.y) <= r), dmg: () => a.rand([70, 95]), by: '91 樓的落雷',
    });
  }
}

// ---------------- 工具 ----------------
function mobHp(kind, a) {
  const hp = Math.max(1, Math.round(a.STATS.MOBS[kind].hp * MOB_HP_MUL));
  return { hp, maxHp: hp };
}
// 第 i 關裡隨便一個能站的地方，盡量離大家遠一點
function spot(a, i, away) {
  const b = a.box(i), T = a.T;
  let best = null;
  for (let k = 0; k < 30; k++) {
    const x = b.x1 + T + Math.random() * (b.x2 - b.x1 - 2 * T), y = b.y1 + 1.5 * T + Math.random() * (b.y2 - b.y1 - 2.5 * T);
    if (a.MAP.isBlocked(x, y) || (i === DAMPER && Math.abs(y - a.D.ball.y) < a.D.ball.r + 40)) continue;
    best = { x, y };
    if (a.activeMembers().every(p => a.dist(p.x, p.y, x, y) > away)) break;
  }
  return best || { x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 };
}
// 直線衝撞：朝目標衝過去，撞到牆就停
function line(a, f, t, at, label) {
  const b = a.box(f.stage), now = a.now0();
  const d = Math.max(1, a.dist(t.x, t.y, f.x, f.y)), ux = (t.x - f.x) / d, uy = (t.y - f.y) / d;
  const x1 = f.x, y1 = f.y;
  let x2 = x1, y2 = y1;
  for (let s = 0; s <= at.len; s += 12) {
    const x = x1 + ux * s, y = y1 + uy * s;
    if (!a.inBox(b, x, y) || a.MAP.isBlocked(x, y) || y < b.y1 + 30) break;
    x2 = x; y2 = y;
  }
  f.busyUntil = now + at.delay + 300;
  const msg = { type: 'charge', delay: at.delay, x1: Math.round(x1), y1: Math.round(y1), x2: Math.round(x2), y2: Math.round(y2), w: at.w, label };
  a.telegraph(f, msg, {
    hit: (p) => a.segDist(p, x1, y1, x2, y2) <= at.w / 2, dmg: () => a.rand(at.dmg),
    after: () => { f.x = f.tx = msg.x2; f.y = f.ty = msg.y2; },
  });
}
// 柱子擋在天龍王和這個人中間（人要在柱子後面、離柱子不太遠）
function behindPillar(a, bx, by, p) {
  const dp = a.dist(p.x, p.y, bx, by);
  return a.D.pillars.some(c => {
    const py = c.y + 10;
    return a.dist(c.x, py, bx, by) < dp && a.dist(p.x, p.y, c.x, py) < 230 && a.segDist({ x: c.x, y: py }, bx, by, p.x, p.y) < 40;
  });
}
R.behindPillar = behindPillar;

module.exports = R;
