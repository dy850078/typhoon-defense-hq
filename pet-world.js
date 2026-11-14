// 寵物：每個帳號一隻，跟著主人上線、下線
// 三種模式：跟在身邊（主人停下來會坐下、待久了趴著睡）、自由散步（在總部和門口的草地閒晃，
// 主人在可愛生物休息區放了小窩的話，會走回去睡午覺）、一起打怪（在野區和副本打主人附近的怪，不會被打倒）
// 小窩存在 data/petbeds.json；主人不在線上的時候，畫面上牠就睡在自己的小窩裡
// 外觀、選項、畫法在 shared/pets.js；server.js 把要用到的東西傳進來
module.exports = function createPetWorld(ctx) {
  const { io, players, MAP, PETS, DG, fs, path, DATA_DIR, dist, clamp, inField, mobs, monster, damageFoe, snapshot, allowed } = ctx;
  // 寵物功能還沒開放給所有人（allowed：管理員，或管理員介面打開了「開放給所有人」）：寵物的事件只送給看得到的人
  const send = (ev, data) => players.forEach(q => { if (allowed(q)) io.to(q.id).emit(ev, data); });
  const T = MAP.TILE;
  const live = new Map(); // 主人的 socket id -> 寵物
  let seq = 0;
  const ACT = { walk: 0, sit: 1, sleep: 2 };
  // 散步的範圍：總部和門口的草地（圍欄以北），不會走到野區
  const HOME = { x1: 0, y1: 0, x2: MAP.MW - 1, y2: 29 };
  const HOTEL_DOOR = { x: 37 * T, y: 19 * T }; // 可愛生物休息區門口進去那一格
  const keyOf = (p) => (p.account ? p.account.username.toLowerCase() : null);

  // ---------------- 小窩 ----------------
  const BED_FILE = path.join(DATA_DIR, 'petbeds.json');
  // 小窩可以放在可愛生物休息區裡任何地方（x, y 是寵物睡的那一點），每個帳號一個
  const beds = new Map(); // 編號 -> { key, ownerName, pet, x, y }
  let bedSeq = 0;
  try {
    const saved = JSON.parse(fs.readFileSync(BED_FILE, 'utf8'));
    Object.values(saved).forEach((b) => {
      const pet = PETS.sanitize(b && b.pet);
      if (pet && b.key && MAP.inPetRoom(b.x, b.y)) beds.set(++bedSeq, { key: String(b.key), ownerName: String(b.ownerName || ''), pet, x: Math.round(b.x), y: Math.round(b.y) });
    });
  } catch (e) { /* 第一次啟動還沒有檔案 */ }
  let saveTimer = null;
  function saveBeds() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(BED_FILE, JSON.stringify(Object.fromEntries(beds)));
      } catch (e) { console.error('小窩存檔失敗', e.message); }
    }, 1500);
  }
  const bedOf = (key) => { for (const [i, b] of beds) if (b.key === key) return i; return -1; };
  // 主人在線上的話是主人的 socket id（寵物跟著主人，小窩空著）
  const ownerOn = (key) => { for (const pt of live.values()) if (pt.key === key) return pt.owner; return null; };
  const bedList = () => [...beds.entries()].map(([i, b]) => { const pid = ownerOn(b.key); return { i, x: b.x, y: b.y, ownerName: b.ownerName, pet: b.pet, on: !!pid, pid }; });
  const emitBeds = () => send('petBeds', bedList());
  const bedSpot = (i) => ({ x: beds.get(i).x, y: beds.get(i).y });

  // ---------------- 找路（只在散步時用）：總部範圍的格子做 BFS ----------------
  const walkable = (tx, ty) => tx >= HOME.x1 && tx <= HOME.x2 && ty >= HOME.y1 && ty <= HOME.y2 &&
    !MAP.BLOCKING.has(MAP.tiles[ty][tx]) && !MAP.dyn.has(tx + ',' + ty);
  function route(x, y, goal, maxLen) {
    const sx = Math.floor(x / T), sy = Math.floor(y / T);
    if (!walkable(sx, sy)) return null;
    const W = HOME.x2 + 1, prev = new Map([[sy * W + sx, -1]]), q = [[sx, sy, 0]];
    let end = null;
    const cands = [];
    while (q.length) {
      const [cx, cy, d] = q.shift();
      if (goal ? cx === goal.x && cy === goal.y : d >= 3) { if (goal) { end = [cx, cy]; break; } cands.push([cx, cy]); }
      if (d >= maxLen) continue;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const nx = cx + dx, ny = cy + dy, k = ny * W + nx;
        if (prev.has(k) || !walkable(nx, ny)) return;
        prev.set(k, cy * W + cx); q.push([nx, ny, d + 1]);
      });
    }
    if (!goal) end = cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
    if (!end) return null;
    const pts = [];
    for (let k = end[1] * W + end[0]; k !== -1 && k !== sy * W + sx; k = prev.get(k)) {
      pts.unshift({ x: (k % W + 0.3 + Math.random() * 0.4) * T, y: (Math.floor(k / W) + 0.35 + Math.random() * 0.4) * T });
    }
    return pts;
  }

  // ---------------- 感情 ----------------
  // 每種方式（摸、餵、一起走、一起打怪）每天有上限，日期用台灣時間
  const today = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const dayLog = (pet) => { if (!pet.bd || pet.bd.d !== today()) pet.bd = { d: today(), pat: 0, feed: 0, walk: 0, fight: 0 }; return pet.bd; };
  function addBond(p, kind, amt) {
    const pet = p.pet;
    if (!pet) return 0;
    const log = dayLog(pet);
    if (log[kind] >= PETS.BOND_CAPS[kind]) return 0;
    log[kind]++;
    const before = PETS.bondLevel(pet.bond);
    pet.bond = Math.min(PETS.BOND_MAX, (pet.bond || 0) + amt);
    const level = PETS.bondLevel(pet.bond);
    io.to(p.id).emit('petBond', { bond: pet.bond, gain: amt, level, up: level > before });
    return amt;
  }

  // ---------------- 寵物本體 ----------------
  const state = (pt) => ({ id: pt.id, owner: pt.owner, ownerName: pt.ownerName, pet: pt.pet, x: Math.round(pt.x), y: Math.round(pt.y), act: pt.act });
  function spawn(p) {
    if (!p.pet || live.has(p.id) || !allowed(p)) return;
    const pt = { id: 'pt' + (++seq), owner: p.id, ownerName: p.name, key: keyOf(p), pet: p.pet, x: p.x - 40, y: p.y + 6, act: 'walk',
      until: 0, route: null, nextHit: 0, lx: p.x, ly: p.y, still: Date.now(), atBed: false, patUntil: 0, together: 0, hits: 0 };
    if (p.pet.mode === 'wander') placeHome(pt, p);
    live.set(p.id, pt);
    const bi = pt.key ? bedOf(pt.key) : -1;
    if (bi >= 0) { Object.assign(beds.get(bi), { ownerName: p.name, pet: p.pet }); saveBeds(); }
    send('pet', state(pt));
    emitBeds();
  }
  function despawn(id) {
    const pt = live.get(id);
    if (!pt) return;
    live.delete(id);
    send('petGone', { id: pt.id });
    emitBeds();
  }
  // 散步模式的起點：主人在總部附近就從主人旁邊出發，不然從自己的小窩（或旅館門口）
  function placeHome(pt, p) {
    const inHome = walkable(Math.floor(p.x / T), Math.floor(p.y / T));
    const bi = bedOf(pt.key);
    const at = inHome ? { x: p.x - 30, y: p.y + 6 } : bi >= 0 ? bedSpot(bi) : HOTEL_DOOR;
    pt.x = at.x; pt.y = at.y; pt.route = null; pt.act = 'sit'; pt.until = Date.now() + 2000;
  }
  function stepTo(pt, tx, ty, speed, stop) {
    const d = dist(pt.x, pt.y, tx, ty);
    if (d <= stop) return true;
    const s = Math.min(d - stop, speed * ctx.TICK / 1000);
    pt.x += (tx - pt.x) / d * s; pt.y += (ty - pt.y) / d * s;
    return d - s <= stop + 0.5;
  }

  // 跟在主人身邊：主人走就跟，停下來幾秒就坐下，待很久就趴著睡
  function follow(pt, p, now) {
    if (MAP.areaOf(p.x) !== MAP.areaOf(pt.x) || dist(pt.x, pt.y, p.x, p.y) > 520) { pt.x = p.x - (p.dir || 1) * 58; pt.y = p.y - 2; } // 主人傳送走了
    // 站在主人背後那一側，不要擋到名牌
    const tx = p.x - (p.dir || 1) * 58, ty = p.y - 2;
    const d = dist(pt.x, pt.y, tx, ty);
    if (d > 26) {
      pt.act = 'walk';
      stepTo(pt, tx, ty, d > 160 ? 330 : 240, 14);
    } else if (now - pt.still > 45000) pt.act = 'sleep';
    else if (now - pt.still > 4000) pt.act = 'sit';
  }

  // 一起打怪：主人在野區或副本裡就去打主人附近的怪（跟召喚物一樣，主人拿經驗），沒有怪就跟著
  function fight(pt, p, now) {
    const box = DG.boxAt(p.x, p.y);
    if (!box && !inField(p)) return follow(pt, p, now);
    let foe = null, isBoss = false, fd = 420;
    (box ? DG.foes().filter(m => m.x >= box.x1 && m.x < box.x2 && m.y >= box.y1 && m.y < box.y2) : mobs).forEach(m => {
      if (!m.alive) return; const d = dist(m.x, m.y, p.x, p.y); if (d < fd) { fd = d; foe = m; isBoss = false; }
    });
    const M = monster();
    if (M.alive && !box) { const d = dist(M.x, M.y, p.x, p.y); if (d < fd) { fd = d; foe = M; isBoss = true; } }
    if (!foe) return follow(pt, p, now);
    if (MAP.areaOf(p.x) !== MAP.areaOf(pt.x) || dist(pt.x, pt.y, p.x, p.y) > 520) { pt.x = p.x - 40; pt.y = p.y + 6; }
    pt.act = 'walk';
    const stop = isBoss ? 100 : 46;
    const near = stepTo(pt, foe.x + (pt.x < foe.x ? -stop : stop), foe.y + 6, 260, 8);
    if ((near || dist(pt.x, pt.y, foe.x, foe.y) < stop + 30) && now >= pt.nextHit) {
      pt.nextHit = now + 1500;
      const crit = Math.random() < 0.1;
      const dmg = Math.round((6 + (p.level || 1) * 0.45) * (0.8 + Math.random() * 0.4) * (crit ? 2 : 1));
      damageFoe(p, foe, isBoss, dmg, crit, 'pet', pt.id);
      if (++pt.hits % 10 === 0) addBond(p, 'fight', 1); // 一起打怪：每打中十下加一點
    }
  }

  // 自由散步：慢慢走、坐下來理毛、偶爾原地睡一下；有小窩的話常常走回去睡午覺
  function wander(pt, now) {
    if (pt.route && pt.route.length) {
      const w = pt.route[0];
      pt.act = 'walk';
      if (stepTo(pt, w.x, w.y, 70, 2)) pt.route.shift();
      if (!pt.route.length) {
        pt.route = null;
        if (pt.toBed) { pt.toBed = false; pt.atBed = true; pt.act = 'sleep'; pt.until = now + 45000 + Math.random() * 75000; }
        else { pt.act = 'sit'; pt.until = now + 1500 + Math.random() * 2500; }
      }
      return;
    }
    if (now < pt.until) return;
    pt.atBed = false;
    const bi = bedOf(pt.key), r = Math.random();
    if (bi >= 0 && r < 0.3) {
      const b = beds.get(bi);
      const rt = route(pt.x, pt.y, { x: Math.floor(b.x / T), y: Math.floor(b.y / T) }, 80);
      if (rt) { const s = bedSpot(bi); rt.push(s); pt.route = rt; pt.toBed = true; return; }
    }
    if (r < 0.5) { pt.act = 'sit'; pt.until = now + 5000 + Math.random() * 8000; return; }
    if (r < 0.58) { pt.act = 'sleep'; pt.until = now + 20000 + Math.random() * 25000; return; }
    const rt = route(pt.x, pt.y, null, 7);
    if (rt) pt.route = rt;
    else { // 卡在走不出去的地方（例如主人帶進來的牆邊）：回旅館門口
      pt.x = HOTEL_DOOR.x; pt.y = HOTEL_DOOR.y; pt.act = 'sit'; pt.until = now + 3000;
    }
  }

  function tick(now) {
    live.forEach((pt, id) => {
      const p = players.get(id);
      if (!p) return despawn(id);
      if (dist(pt.lx, pt.ly, p.x, p.y) > 2) { pt.still = now; pt.lx = p.x; pt.ly = p.y; }
      if (pt.patUntil > now && pt.act !== 'sleep') { pt.act = 'sit'; return; }
      const mode = pt.pet.mode;
      // 一起走：跟在身邊、主人在走動的時間，累積滿五分鐘加一點
      if (mode !== 'wander' && now - pt.still < 4000) { pt.together += ctx.TICK; if (pt.together >= 300000) { pt.together = 0; addBond(p, 'walk', 1); } }
      if (mode === 'wander') wander(pt, now);
      else if (!p.dead) fight(pt, p, now); // 跟在身邊：主人在野區或副本就一起打怪，不然就跟著
      else follow(pt, p, now);
    });
  }
  // 位置只送給看得到寵物的人，有變才送（沒有寵物、大家都沒動就不送）
  // 不能用 volatile：同一個 tick 裡 server.js 已經送了一則 volatile 的 world，後面這則會被丟掉，寵物就停在原地
  let lastWorld = '';
  function sendWorld() {
    if (!live.size) { lastWorld = ''; return; }
    const list = [...live.values()].map(pt => [pt.id, Math.round(pt.x), Math.round(pt.y), ACT[pt.act] || 0]);
    const sig = JSON.stringify(list);
    if (sig === lastWorld) return;
    lastWorld = sig;
    players.forEach(q => { if (allowed(q)) io.to(q.id).emit('petsWorld', list); });
  }

  // 換外觀、取名字、換模式
  function save(p, data) {
    if (!allowed(p)) return { ok: false, error: '寵物功能還沒開放' };
    const pet = PETS.sanitize(data);
    if (!pet) return { ok: false, error: '寵物的資料不對' };
    const was = p.pet;
    // 個性是天生的：有了就不變，客戶端改不了
    if (was && was.temper) pet.temper = was.temper; else pet.temper = PETS.rollTemper(pet.kind);
    // 感情也是伺服器自己記的
    pet.bond = was ? was.bond || 0 : 0;
    if (was && was.bd) pet.bd = was.bd; else delete pet.bd;
    p.pet = pet;
    snapshot(p);
    const k = keyOf(p), bi = k ? bedOf(k) : -1;
    if (bi >= 0) { beds.get(bi).pet = pet; beds.get(bi).ownerName = p.name; saveBeds(); }
    const pt = live.get(p.id);
    if (!pt) spawn(p);
    else {
      pt.pet = pet;
      if (pet.mode === 'wander' && (!was || was.mode !== 'wander')) placeHome(pt, p);
      if (pet.mode !== 'wander') { pt.route = null; pt.toBed = false; pt.atBed = false; }
      send('pet', state(pt));
      if (bi >= 0) emitBeds();
    }
    return { ok: true, pet };
  }

  // 在可愛生物休息區放小窩：放在自己站的位置（每個人一個；已經有的話搬過來）、收回小窩
  function placeBed(p) {
    if (!allowed(p)) return { ok: false };
    if (!p.pet) return { ok: false, error: '先到「寵物」那裡領養一隻，再來放小窩' };
    const k = keyOf(p);
    if (!k) return { ok: false, error: '要登入帳號才能放小窩' };
    const x = Math.round(p.x), y = Math.round(p.y + 8);
    if (!MAP.inPetRoom(x, y) || MAP.isBlocked(x, y)) return { ok: false, error: '小窩要放在房間裡面' };
    const old = bedOf(k);
    for (const [i, b] of beds) if (i !== old && dist(b.x, b.y, x, y) < 30) return { ok: false, error: '這裡已經有別人的小窩了，往旁邊一點' };
    if (old >= 0) beds.delete(old);
    beds.set(++bedSeq, { key: k, ownerName: p.name, pet: p.pet, x, y });
    saveBeds(); emitBeds();
    return { ok: true, moved: old >= 0 };
  }
  function takeBed(p, i) {
    i = Math.floor(Number(i));
    const b = beds.get(i), k = keyOf(p);
    if (!b || b.key !== k) return { ok: false, error: '這不是你的小窩' };
    beds.delete(i);
    saveBeds(); emitBeds();
    return { ok: true };
  }
  // 摸摸：線上的寵物（id）或睡在小窩裡的（bed）
  function pat(p, m) {
    if (!allowed(p)) return { ok: false };
    if (m && typeof m.id === 'string') {
      const pt = [...live.values()].find(q => q.id === m.id);
      if (!pt || dist(pt.x, pt.y, p.x, p.y) > 2.2 * T) return { ok: false };
      if (pt.act !== 'sleep') pt.patUntil = Date.now() + 2500;
      send('petPat', { id: pt.id, by: p.name });
      if (pt.owner === p.id) addBond(p, 'pat', 1);
      return { ok: true };
    }
    const i = Math.floor(Number(m && m.bed));
    const b = beds.get(i);
    if (!b || dist(p.x, p.y, b.x, b.y) > 2.2 * T) return { ok: false };
    send('petPat', { bed: i, by: p.name });
    return { ok: true };
  }
  // 餵點心：從主人的背包拿一個，牠開心地坐下來吃；一天三次
  function feed(p, item) {
    if (!allowed(p) || !p.pet) return { ok: false };
    const pt = live.get(p.id), gain = PETS.FEED[item];
    if (!pt || !gain) return { ok: false };
    if (!(p.inv[item] >= 1)) return { ok: false, error: '背包裡沒有這個了' };
    if (dayLog(p.pet).feed >= PETS.BOND_CAPS.feed) return { ok: false, error: `${p.pet.name}今天吃飽了，明天再餵` };
    p.inv[item]--;
    addBond(p, 'feed', gain);
    pt.act = 'sit'; pt.patUntil = Date.now() + 3200; // 睡著的也會坐起來吃
    send('petPat', { id: pt.id, by: p.name, feed: item });
    return { ok: true, inv: p.inv, left: PETS.BOND_CAPS.feed - p.pet.bd.feed };
  }
  const list = () => [...live.values()].map(state);
  // 管理員改了帳號名稱：小窩跟著新帳號
  function renameKey(from, to) {
    beds.forEach(b => { if (b.key === from) b.key = to; });
    saveBeds();
  }

  return { spawn, despawn, tick, sendWorld, list, bedList, save, placeBed, takeBed, pat, feed, renameKey };
};
