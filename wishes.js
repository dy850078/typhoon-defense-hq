// 許願池：大家想要的新功能登記在這裡，存在 data/wishes.json（不用資料庫）
// 有帳號的人才能許願（每天最多 3 則）；大家都能按讚，每則每人一次；管理員可以標狀態或刪掉
const fs = require('fs');
const path = require('path');

const MAX_LEN = 100;
const PER_DAY = 3;
const STATUSES = ['new', 'thinking', 'done', 'no']; // 新願望、考慮中、做好了、不做

// 台灣時間的今天（YYYY-MM-DD），每天的許願次數用這個算
const dayOf = (t) => new Date(t + 8 * 3600000).toISOString().slice(0, 10);

function create(dataDir) {
  const file = path.join(dataDir, 'wishes.json');
  let list = [];
  try { list = JSON.parse(fs.readFileSync(file, 'utf8')).list || []; } catch (e) { /* 第一次啟動還沒有檔案 */ }
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
  const usedToday = (username) => list.filter(w => owner(w.by) === owner(username) && dayOf(w.at) === dayOf(Date.now())).length;

  return {
    PER_DAY, MAX_LEN, STATUSES,
    // 給玩家看的清單：voter 是看的人（帳號或這台裝置），標出自己按過讚、自己許的願
    view(voter, username) {
      return list.map(w => ({ id: w.id, text: w.text, name: w.name, at: w.at, status: w.status, likes: w.likes.length,
        liked: !!voter && w.likes.includes(voter), mine: !!username && owner(w.by) === owner(username) }));
    },
    left: (username) => username ? Math.max(0, PER_DAY - usedToday(username)) : 0,
    add(username, name, text) {
      const t = String(text || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
      if (!username) return { error: '登入帳號才能許願，沒帳號的話可以幫別人的願望按讚' };
      if (t.length < 2) return { error: '願望寫多一點點吧' };
      if (usedToday(username) >= PER_DAY) return { error: `今天已經許了 ${PER_DAY} 個願，明天再來` };
      const w = { id: nextId++, text: t, by: username, name: String(name || username).slice(0, 12), at: Date.now(), status: 'new', likes: [] };
      list.push(w);
      save();
      return { wish: w };
    },
    // 按讚／收回讚
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
      const i = list.findIndex(x => x.id === id && owner(x.by) === owner(username));
      if (i < 0) return { error: '只能收回自己許的願' };
      list.splice(i, 1);
      save();
      return { ok: true };
    },
    // 管理員用
    all: () => list.map(w => ({ id: w.id, text: w.text, by: w.by, name: w.name, at: w.at, status: w.status, likes: w.likes.length })),
    setStatus(id, status) {
      const w = list.find(x => x.id === id);
      if (!w) return { error: '找不到這個願望' };
      if (!STATUSES.includes(status)) return { error: '狀態不對' };
      const was = w.status;
      w.status = status;
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
