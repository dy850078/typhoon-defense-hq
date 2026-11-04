// npm run serve：開總部伺服器，node 關掉後自動重開
// - 上版時 npm run deploy 會通知這裡「存檔後重開」，不用再 Ctrl+C
// - 伺服器意外當掉也會自己爬起來（30 秒內連續當 3 次就停下來，免得一直重開）
// - Ctrl+C 一樣是存檔後整個關掉
// - .env 有 TUNNEL（npm run tunnel:setup 寫的）就順便開固定網址的 Cloudflare 通道；上版只重開 node，通道不動
require('../env');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
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
  stopTunnel();
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
  stopTunnel();
  if (child) child.kill('SIGTERM'); else bye();
}));

// 固定網址的通道：網址不會變，所以斷了就自己重開；cloudflared 的訊息很多，只印警告和錯誤
const TUNNEL = (process.env.TUNNEL || '').trim();
let tunnel = null, tunnelUp = false;
function startTunnel() {
  const conf = path.join(os.homedir(), '.cloudflared', `${TUNNEL}.yml`);
  const args = ['tunnel'].concat(fs.existsSync(conf) ? ['--config', conf] : [], ['run', TUNNEL]);
  tunnelUp = false;
  tunnel = spawn('cloudflared', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let buf = '';
  const onData = d => {
    buf += d;
    const lines = buf.split('\n'); buf = lines.pop();
    lines.forEach(line => {
      if (!tunnelUp && /Registered tunnel connection/.test(line)) {
        tunnelUp = true;
        console.log(`🌐 通道已連上：${process.env.PUBLIC_URL || `（通道 ${TUNNEL}）`}`);
      } else if (/\b(ERR|WRN|FTL)\b/.test(line)) console.log('[通道] ' + line.replace(/^\S+\s+/, ''));
    });
  };
  tunnel.stdout.on('data', onData); tunnel.stderr.on('data', onData);
  tunnel.on('error', e => {
    tunnel = null;
    if (e.code === 'ENOENT') console.log('⚠️ 找不到 cloudflared，通道沒開（伺服器照常運作）。安裝方法見 README');
    else console.log('⚠️ 通道開不起來：' + e.message);
  });
  tunnel.on('exit', code => {
    if (!tunnel) return;
    tunnel = null;
    if (stopping) return;
    console.log(`⚠️ 通道斷了（${code}），10 秒後重新連線，網址不會變`);
    setTimeout(() => { if (!stopping) startTunnel(); }, 10000);
  });
}
function stopTunnel() {
  if (!tunnel) return;
  const t = tunnel; tunnel = null;
  t.kill('SIGTERM');
}

start();
if (TUNNEL) startTunnel();
