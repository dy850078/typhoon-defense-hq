// 總部休息中：放在 Cloudflare Workers 上，擋在網域前面
// 伺服器有開 → 原封不動轉給總部（網頁、Socket.IO、WebSocket 都一樣）
// 伺服器沒開（通道沒連上 530、node 沒開 502…）→ 網頁顯示「總部休息中」，其他請求回 503
// 休息頁每 30 秒偷看一次，總部開門就自動重新整理進去，不用一直按 F5
// 設定方法見 README「伺服器沒開時顯示休息頁」

const DOWN = new Set([502, 503, 504, 520, 521, 522, 523, 524, 530]);

export default {
  async fetch(request) {
    let res = null;
    try { res = await fetch(request); } catch (e) { /* 連不上就當作休息中 */ }
    if (res && !DOWN.has(res.status)) return res;
    const wantsPage = request.method === 'GET' && (request.headers.get('Accept') || '').includes('text/html');
    const headers = { 'Cache-Control': 'no-store', 'X-HQ-Offline': '1' };
    if (!wantsPage) return new Response('總部休息中', { status: 503, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' } });
    return new Response(PAGE, { status: 503, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
  },
};

const PAGE = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>總部休息中</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&family=Space+Mono:wght@400;700&display=swap">
<style>
:root {
  --ground: #FAFAF7; --ink: #3A3A3C; --muted: #6E6E73; --soft: #8E8E93; --line: #D9D9DD; --accent: #FF6A13;
  --display: 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  --mono: 'Space Mono', ui-monospace, Menlo, monospace;
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body {
  background: var(--ground); color: var(--ink); font-family: var(--display);
  min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column;
  padding: clamp(20px, 5vw, 56px) clamp(16px, 6vw, 72px);
}
.meta { display: flex; justify-content: space-between; gap: 12px; font: 700 clamp(12px, 1.9vw, 16px)/1.5 var(--mono); letter-spacing: 0.08em; color: var(--soft); }
.meta .left { color: var(--accent); }
main { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: clamp(14px, 3vw, 28px); padding: 40px 0; }
.row { display: flex; flex-direction: column; align-items: flex-start; gap: clamp(18px, 3vw, 32px); }
h1 { margin: 0; font-size: clamp(44px, 12vw, 132px); font-weight: 900; line-height: 1.05; letter-spacing: -0.04em; }
h1 .soft { color: var(--soft); }
h1 .hot { color: var(--accent); }
.icon { width: clamp(72px, 14vw, 128px); height: auto; flex-shrink: 0; margin-left: -6px; }
p { margin: 0; font-size: clamp(16px, 2.2vw, 21px); line-height: 1.7; color: var(--muted); max-width: 30em; }
p b { color: var(--ink); }
.status { display: inline-flex; align-items: center; gap: 10px; font: 400 13px/1.4 var(--mono); color: var(--soft); border-top: 1px solid var(--line); padding-top: 16px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
.status.ok .dot { background: #34C759; }
@media (prefers-reduced-motion: no-preference) {
  .icon .spin { transform-origin: 120px 120px; animation: spin 60s linear infinite; }
  .dot { animation: blink 2s ease-in-out infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes blink { 50% { opacity: 0.25; } }
}
</style>
</head>
<body>
<div class="meta"><span class="left">THIS IS NOT A PARTY</span><span>CLOSED</span></div>
<main>
  <div class="row">
    <svg class="icon" viewBox="0 0 240 240" aria-hidden="true">
      <g class="spin">
        <circle cx="120" cy="120" r="108" fill="none" stroke="#B5B5BA" stroke-width="6" stroke-linecap="round" stroke-dasharray="0 13"></circle>
        <ellipse cx="120" cy="120" rx="104" ry="32" fill="none" stroke="#6E6E73" stroke-width="2.5" transform="rotate(-28 120 120)"></ellipse>
        <ellipse cx="120" cy="120" rx="104" ry="32" fill="none" stroke="#3A3A3C" stroke-width="2.5" stroke-dasharray="4 6" transform="rotate(32 120 120)"></ellipse>
        <circle cx="210" cy="86" r="8" fill="#B5B5BA"></circle>
        <circle cx="34" cy="160" r="5" fill="#6E6E73"></circle>
      </g>
      <path d="M150 70 A56 56 0 1 0 170 150 A44 44 0 1 1 150 70 Z" fill="#FF6A13"></path>
      <path d="M196 28 v24 M184 40 h24" stroke="#3A3A3C" stroke-width="3" stroke-linecap="round"></path>
      <path d="M36 196 v16 M28 204 h16" stroke="#FF6A13" stroke-width="3" stroke-linecap="round"></path>
    </svg>
    <h1><span class="soft">總部</span><span class="hot">休息中</span></h1>
  </div>
  <p>站長的電腦還在睡。<br>這一頁開著就好，總部開門會自動帶你進去。</p>
  <div class="status" id="status" role="status"><span class="dot"></span><span id="status-text">每 30 秒看一次門開了沒</span></div>
</main>
<script>
(function () {
  var text = document.getElementById('status-text'), box = document.getElementById('status');
  function check() {
    fetch(location.href, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
      if (r.ok && !r.headers.get('X-HQ-Offline')) {
        box.className = 'status ok'; text.textContent = '開門了，帶你進去…';
        setTimeout(function () { location.reload(); }, 600);
      } else {
        var t = new Date();
        text.textContent = '還沒開門 · ' + ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2) + ' 看過 · 30 秒後再看一次';
      }
    }).catch(function () {});
  }
  setInterval(check, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
</script>
</body>
</html>`;
