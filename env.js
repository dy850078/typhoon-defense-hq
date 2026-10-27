// 讀專案資料夾裡的 .env（金鑰、管理員密碼…），這樣啟動時就不用每次打一長串
// 已經在指令上設定的變數優先，.env 不會蓋掉
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '.env');
let text = '';
try { text = fs.readFileSync(file, 'utf8'); } catch (e) { /* 沒有 .env 就算了 */ }
text.split(/\r?\n/).forEach(line => {
  const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (!m || line.trim().startsWith('#')) return;
  let v = m[2];
  if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
  if (process.env[m[1]] === undefined) process.env[m[1]] = v;
});
