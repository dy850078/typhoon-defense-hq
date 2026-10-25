// 許願池：大家想要的新功能、遇到的 Bug 登記在這裡，存在 data/wishes.json（不用資料庫）
// 每則有主題、類別、內文；有帳號的人才能許願（每天最多 PER_DAY 則），作者可以修改或收回
// 大家都能按讚，每則每人一次；處理狀態由管理員在管理頁改
const fs = require('fs');
const path = require('path');

const TITLE_LEN = 40;
const BODY_LEN = 2000;
const PER_DAY = 20;
const PAGE_SIZE = 10;
const CATS = ['bug', 'feature', 'improve', 'other']; // Bug 回報、新功能、功能優化、其他
const STATUSES = ['new', 'review', 'doing', 'done', 'no']; // 待處理、評估中、處理中、已完成、不處理

// 台灣時間的今天（YYYY-MM-DD），每天的許願次數用這個算
const dayOf = (t) => new Date(t + 8 * 3600000).toISOString().slice(0, 10);
const oneLine = (s, max) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
// 內文可以分段：保留換行，最多連續兩個空行
const multiLine = (s, max) => String(s || '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ')
  .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);

// 舊版只有一段 text：太長的話主題放前面一段，全文放內文
function upgrade(w) {
  if (w.title) return w;
  const t = oneLine(w.text, BODY_LEN);
  return { id: w.id, title: t.slice(0, TITLE_LEN), cat: 'feature', body: t.length > TITLE_LEN ? t : '', by: w.by, name: w.name,
    at: w.at, updated: w.at, status: w.status === 'thinking' ? 'review' : STATUSES.includes(w.status) ? w.status : 'new', likes: w.likes || [] };
}

function create(dataDir) {
  const file = path.join(dataDir, 'wishes.json');
  let list = [];
  try { list = (JSON.parse(fs.readFileSync(file, 'utf8')).list || []).map(upgrade); } catch (e) { /* 第一次啟動還沒有檔案 */ }
  let nextId = list.reduce((m, w) => Math.max(m, w.id), 0) + 1;

  let timer = null;
  function flush() {
    clearTimeout(timer); timer = null;
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(file + '.tmp', JSON.stringify({ list }));
      fs.renameSync(file + '.tmp', file);
    } catch (e) { console.error('許願池存檔失敗', e.message); }
  }
  const save = () => { if (!timer) timer = setTimeout(flush, 500); };

  const owner = (username) => String(username || '').toLowerCase();
  const isMine = (w, username) => !!username && owner(w.by) === owner(username);
  const usedToday = (username) => list.filter(w => isMine(w, username) && dayOf(w.at) === dayOf(Date.now())).length;
  function fields(m) {
    const title = oneLine(m && m.title, TITLE_LEN), body = multiLine(m && m.body, BODY_LEN);
    const cat = CATS.includes(m && m.cat) ? m.cat : '';
    if (title.length < 2) return { error: '主題寫多一點點吧' };
    if (!cat) return { error: '選一個類別' };
    return { title, cat, body };
  }
  // 模糊搜尋：不分大小寫、忽略空白，每個關鍵字都要出現在主題裡
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
  const brief = (w, voter, username) => ({ id: w.id, title: w.title, cat: w.cat, status: w.status, name: w.name, at: w.at, updated: w.updated,
    likes: w.likes.length, liked: !!voter && w.likes.includes(voter), mine: isMine(w, username), hasBody: !!w.body });

  return {
    PER_DAY, TITLE_LEN, BODY_LEN, CATS, STATUSES,
    // 給玩家看的一頁清單；voter 是看的人（帳號或這台裝置），用來標出自己按過讚、自己許的願
    query(o, voter, username) {
      o = o || {};
      const words = String(o.q || '').toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5).map(norm);
      let rows = list.filter(w => (!CATS.includes(o.cat) || w.cat === o.cat) && words.every(k => norm(w.title).includes(k)));
      const by = o.sort === 'likes' ? (a, b) => (b.likes.length - a.likes.length) || (b.updated - a.updated)
        : o.sort === 'new' ? (a, b) => b.at - a.at : (a, b) => b.updated - a.updated;
      rows = rows.slice().sort(by);
      const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
      const page = Math.min(pages, Math.max(1, Math.floor(Number(o.page)) || 1));
      return { items: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(w => brief(w, voter, username)),
        total: rows.length, all: list.length, page, pages };
    },
    get(id, voter, username) {
      const w = list.find(x => x.id === id);
      return w ? Object.assign(brief(w, voter, username), { body: w.body }) : null;
    },
    left: (username) => username ? Math.max(0, PER_DAY - usedToday(username)) : 0,
    add(username, name, m) {
      if (!username) return { error: '登入帳號才能許願，沒帳號的話可以幫別人的願望按讚' };
      if (usedToday(username) >= PER_DAY) return { error: `今天已經許了 ${PER_DAY} 個願，明天再來` };
      const f = fields(m);
      if (f.error) return f;
      const now = Date.now();
      const w = Object.assign({ id: nextId++ }, f, { by: username, name: String(name || username).slice(0, 12), at: now, updated: now, status: 'new', likes: [] });
      list.push(w);
      save();
      return { wish: w };
    },
    // 作者自己修改
    edit(id, username, m) {
      const w = list.find(x => x.id === id);
      if (!w || !isMine(w, username)) return { error: '只能修改自己許的願' };
      const f = fields(m);
      if (f.error) return f;
      Object.assign(w, f, { updated: Date.now() });
      save();
      return { wish: w };
    },
    // 按讚／收回讚（不算更新，清單才不會一直跳）
    like(id, voter) {
      const w = list.find(x => x.id === id);
      if (!w || !voter) return { error: '找不到這個願望' };
      const i = w.likes.indexOf(voter);
      if (i >= 0) w.likes.splice(i, 1); else w.likes.push(voter);
      save();
      return { liked: i < 0, likes: w.likes.length };
    },
    // 自己許的願可以收回
    withdraw(id, username) {
      const i = list.findIndex(x => x.id === id && isMine(x, username));
      if (i < 0) return { error: '只能收回自己許的願' };
      list.splice(i, 1);
      save();
      return { ok: true };
    },
    // 管理員用
    all: () => list.map(w => ({ id: w.id, title: w.title, cat: w.cat, body: w.body, by: w.by, name: w.name, at: w.at, updated: w.updated,
      status: w.status, likes: w.likes.length })),
    setStatus(id, status) {
      const w = list.find(x => x.id === id);
      if (!w) return { error: '找不到這個願望' };
      if (!STATUSES.includes(status)) return { error: '狀態不對' };
      const was = w.status;
      w.status = status;
      w.updated = Date.now();
      save();
      return { wish: w, was };
    },
    remove(id) {
      const i = list.findIndex(x => x.id === id);
      if (i < 0) return { error: '找不到這個願望' };
      list.splice(i, 1);
      save();
      return { ok: true };
    },
    flush,
  };
}

module.exports = { create };
