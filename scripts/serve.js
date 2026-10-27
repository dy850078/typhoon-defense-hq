// npm run serve：開總部伺服器，node 關掉後自動重開
// - 上版時 npm run deploy 會通知這裡「存檔後重開」，不用再 Ctrl+C
// - 伺服器意外當掉也會自己爬起來（30 秒內連續當 3 次就停下來，免得一直重開）
// - Ctrl+C 一樣是存檔後整個關掉
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PID_FILE = path.join(ROOT, 'data', 'serve.pid');
fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
fs.writeFileSync(PID_FILE, String(process.pid));

let child = null, stopping = false, restarting = false, crashes = [];
function start() {
  restarting = false;
  child = spawn(process.execPath, ['server.js'], { cwd: ROOT, stdio: 'inherit' });
  child.on('exit', (code, signal) => {
    child = null;
    if (stopping) return bye();
    if (restarting) { console.log('🔁 新版本啟動中…'); return start(); }
    if (code === 0) return bye();
    const now = Date.now();
    crashes = crashes.filter(t => now - t < 30000).concat(now);
    if (crashes.length >= 3) { console.log('⚠️ 伺服器 30 秒內當了 3 次，先停下來，看一下上面的錯誤訊息'); return bye(1); }
    console.log(`⚠️ 伺服器意外停止（${signal || code}），2 秒後重新啟動`);
    setTimeout(start, 2000);
  });
}
function bye(code = 0) {
  try { if (fs.readFileSync(PID_FILE, 'utf8') === String(process.pid)) fs.unlinkSync(PID_FILE); } catch (e) { /* 已經沒了 */ }
  process.exit(code);
}
// deploy 送來的訊號：讓 server.js 存檔關掉，再用新程式碼開回來
process.on('SIGUSR2', () => {
  if (!child) return;
  restarting = true;
  child.kill('SIGTERM');
});
['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => {
  stopping = true;
  if (child) child.kill('SIGTERM'); else bye();
}));
start();
