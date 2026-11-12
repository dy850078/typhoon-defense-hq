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
<title>總部休息中｜這不是一個單純的派對</title>
<!-- 伺服器關著時抓不到 /favicon.png，所以圖示直接內嵌 -->
<link rel="icon" type="image/png" sizes="32x32" href="data:image/png;base64,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">
<link rel="apple-touch-icon" href="data:image/png;base64,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">
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
.row { display: flex; align-items: center; gap: clamp(20px, 4vw, 56px); }
h1 { margin: 0; white-space: nowrap; font-size: clamp(44px, 12vw, 132px); font-weight: 900; line-height: 1.05; letter-spacing: -0.04em; }
h1 .soft { color: var(--soft); }
h1 .hot { color: var(--accent); }
.icon { width: clamp(64px, 13vw, 150px); height: auto; flex-shrink: 0; }
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
    <h1><span class="soft">總部</span><span class="hot">休息中</span></h1>
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
