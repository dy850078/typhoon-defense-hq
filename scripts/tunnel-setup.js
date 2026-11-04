// npm run tunnel:setup -- 你的網域.com：設定固定網址的 Cloudflare 通道（只要做一次）
// 依序：檢查 cloudflared → 沒登入過就登入 → 建立通道 → 把網域指到通道 → 寫通道設定檔 → 記到 .env
// 重跑也沒關係，做過的步驟會跳過；之後 npm run serve 會順便把通道開起來
require('../env');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const CF_DIR = path.join(os.homedir(), '.cloudflared');
const PORT = Number(process.env.PORT) || 3000;

function fail(msg) { console.error(`\n❌ ${msg}\n`); process.exit(1); }
function step(msg) { console.log(`\n▶ ${msg}`); }
function cf(args, opts = {}) {
  const r = spawnSync('cloudflared', args, { encoding: 'utf8', stdio: opts.show ? 'inherit' : 'pipe' });
  if (r.error) fail('找不到 cloudflared，先照 README「第一次架站」第 4 步安裝');
  return r;
}

// 參數：網域（可以帶 https:// 或結尾斜線，這裡會清掉）
const host = String(process.argv[2] || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
const name = String(process.argv[3] || process.env.TUNNEL || 'hq').trim();
if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) {
  fail('要告訴我網域，例如：npm run tunnel:setup -- hq.example.com\n   （通道名稱預設 hq，想換的話接在網域後面：npm run tunnel:setup -- hq.example.com 名稱）');
}
if (!/^[A-Za-z0-9_-]+$/.test(name)) fail(`通道名稱「${name}」只能用英文、數字、- 和 _`);

step('檢查 cloudflared');
const ver = cf(['--version']);
console.log('  ' + (ver.stdout || ver.stderr).trim().split('\n')[0]);

step('登入 Cloudflare');
const cert = process.env.TUNNEL_ORIGIN_CERT || path.join(CF_DIR, 'cert.pem');
if (fs.existsSync(cert)) console.log('  已經登入過，跳過');
else {
  console.log('  會開一個網址，用瀏覽器打開後選你的網域按 Authorize');
  if (cf(['tunnel', 'login'], { show: true }).status !== 0 || !fs.existsSync(cert)) fail('登入沒有完成，再跑一次這個指令');
}

function findTunnel() {
  const r = cf(['tunnel', 'list', '--output', 'json']);
  if (r.status !== 0) fail('讀不到通道清單：\n' + (r.stderr || r.stdout));
  // 只取 JSON 那段（前面偶爾會夾著版本過舊之類的提醒）
  // 注意：沒刪掉的通道 deleted_at 也有值（0001-01-01…），清單本來就不含已刪除的，所以只比名字
  const out = r.stdout.slice(Math.max(0, r.stdout.indexOf('[')));
  try { return (JSON.parse(out) || []).find(t => t.name === name); }
  catch (e) { fail('看不懂通道清單：\n' + r.stdout); }
}

step(`建立通道「${name}」`);
let tunnel = findTunnel();
if (tunnel) console.log(`  已經有了（${tunnel.id}），跳過`);
else {
  if (cf(['tunnel', 'create', name], { show: true }).status !== 0) fail('建立通道失敗，看一下上面的訊息');
  tunnel = findTunnel();
  if (!tunnel) fail('通道建好了卻找不到，再跑一次這個指令');
}

// 通道的金鑰檔：在別台電腦建的通道，這台沒有金鑰，就重新下載一份
const creds = path.join(CF_DIR, `${tunnel.id}.json`);
if (!fs.existsSync(creds)) {
  console.log('  這台電腦沒有通道的金鑰檔，重新下載一份');
  if (cf(['tunnel', 'token', '--cred-file', creds, name]).status !== 0 || !fs.existsSync(creds)) fail('下載金鑰檔失敗');
}

step(`把 ${host} 指到通道`);
const dns = cf(['tunnel', 'route', 'dns', '--overwrite-dns', name, host]);
const dnsOut = (dns.stdout + dns.stderr).trim();
if (dns.status !== 0) fail(`設定網域失敗：\n${dnsOut}\n   確認 ${host} 是在同一個 Cloudflare 帳號底下的網域`);
console.log('  完成');

step('寫通道設定檔');
const conf = path.join(CF_DIR, `${name}.yml`);
fs.writeFileSync(conf, [
  '# 由 npm run tunnel:setup 產生，重跑會覆蓋',
  `tunnel: ${tunnel.id}`,
  `credentials-file: ${creds}`,
  'ingress:',
  `  - hostname: ${host}`,
  `    service: http://localhost:${PORT}`,
  '  - service: http_status:404',
  '',
].join('\n'));
console.log('  ' + conf);

step('記到 .env');
let env = '';
try { env = fs.readFileSync(ENV_FILE, 'utf8'); } catch (e) { /* 還沒有 .env */ }
function setVar(key, val) {
  const re = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, 'm');
  if (re.test(env)) env = env.replace(re, `${key}=${val}`);
  else env += `${env && !env.endsWith('\n') ? '\n' : ''}${key}=${val}\n`;
}
if (!/^\s*(?:export\s+)?TUNNEL\s*=/m.test(env)) env += `${env && !env.endsWith('\n') ? '\n' : ''}\n# 固定網址的通道（npm run tunnel:setup 寫的）\n`;
setVar('TUNNEL', name);
setVar('PUBLIC_URL', `https://${host}`);
fs.writeFileSync(ENV_FILE, env);
console.log(`  TUNNEL=${name}\n  PUBLIC_URL=https://${host}`);

console.log(`\n✅ 設定好了。之後只要 npm run serve，伺服器和通道會一起開，網址固定是 https://${host}\n   （網域剛設定好，DNS 可能要等幾分鐘才生效）\n`);
