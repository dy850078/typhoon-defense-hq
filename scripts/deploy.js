// npm run deploy：一鍵上版
// 1. 確認沒有改到一半的檔案  2. git pull（套件有變就 npm install）
// 3. 收集 changes/ 裡還沒公告過的小紙條，寫進 data/releases.json
// 4. 打版本標籤 vYYYY.MM.DD-N 並推上 GitHub  5. 通知 npm run serve 存檔後用新版本重開
// 加 --force 可以在沒有新東西時也強制重開
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const RELEASES = path.join(DATA, 'releases.json');
const PID_FILE = path.join(DATA, 'serve.pid');
const CHANGES = path.join(ROOT, 'changes');
const force = process.argv.includes('--force');

const sh = (cmd, opts = {}) => execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
const stop = (msg) => { console.log(`\n✋ ${msg}`); process.exit(1); };

// 1. 有改到一半的檔案就先停下來，免得 pull 時被蓋掉或衝突
const dirty = sh('git status --porcelain --untracked-files=no');
if (dirty) stop(`這些檔案在這台電腦上被改過，先處理掉再上版：\n${dirty}`);
const branch = sh('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') stop(`現在在 ${branch} 分支，上版要在 main（git checkout main）`);

// 2. 拉新版本
const before = sh('git rev-parse HEAD');
console.log('⬇️  拉新版本…');
run('git pull --ff-only');
try { sh('git fetch --tags --quiet'); } catch (e) { /* 拿不到別台電腦打的標籤也沒關係 */ }
const after = sh('git rev-parse HEAD');
const changed = before === after ? [] : sh(`git diff --name-only ${before} ${after}`).split('\n');
if (changed.includes('package.json') || changed.includes('package-lock.json')) {
  console.log('📦 套件有更新，npm install…');
  run('npm install');
}

// 3. 收集還沒公告過的小紙條
let db = { releases: [] };
try { db = JSON.parse(fs.readFileSync(RELEASES, 'utf8')); } catch (e) { /* 第一次上版 */ }
const used = new Set(db.releases.flatMap(r => r.files || []));
const files = fs.existsSync(CHANGES)
  ? fs.readdirSync(CHANGES).filter(f => f.endsWith('.md') && f !== 'README.md' && !used.has(f)).sort()
  : [];
const notes = files.flatMap(f => fs.readFileSync(path.join(CHANGES, f), 'utf8').split(/\r?\n/))
  .map(l => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);

if (before === after && !files.length && !force) {
  console.log('\n✅ 已經是最新版了，不用上版（真的要重開伺服器可以加 --force）');
  process.exit(0);
}

// 版本號：日期 + 當天第幾次上版
const d = new Date();
const day = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
const taken = new Set(sh(`git tag -l "v${day}-*"`).split('\n').filter(Boolean).concat(db.releases.map(r => r.version)));
let n = 1;
while (taken.has(`v${day}-${n}`)) n += 1;
const version = `v${day}-${n}`;

db.releases.unshift({ version, at: d.toISOString(), commit: after, notes, files });
fs.mkdirSync(DATA, { recursive: true });
fs.writeFileSync(RELEASES, JSON.stringify(db, null, 2));

console.log(`\n🏷️  ${version}`);
console.log(notes.length ? notes.map(t => `   - ${t}`).join('\n') : '   （這次沒有給玩家看的更新紙條，遊戲裡不會跳公告）');

// 4. 打標籤並推上 GitHub（推不上去不影響上版）
try {
  sh(`git tag -a ${version} -F -`, { input: [version, '', ...notes.map(t => `- ${t}`)].join('\n') + '\n', stdio: ['pipe', 'pipe', 'pipe'] });
  sh(`git push origin ${version}`);
  console.log('   標籤已推上 GitHub');
} catch (e) {
  console.log(`   ⚠️ 標籤沒推上去（${String(e.stderr || e.message).trim().split('\n').pop()}），晚點可以手動 git push origin ${version}`);
}

// 5. 通知 npm run serve 重開
let pid = 0;
try { pid = Number(fs.readFileSync(PID_FILE, 'utf8')); process.kill(pid, 0); } catch (e) { pid = 0; }
if (pid) {
  process.kill(pid, 'SIGUSR2');
  console.log('\n🔁 已通知伺服器存檔後用新版本重開，玩家畫面會跳出「總部更新了」');
} else {
  console.log('\n⚠️ 找不到用 npm run serve 開的伺服器，請自己重開：Ctrl+C 停掉後執行 npm run serve');
}
