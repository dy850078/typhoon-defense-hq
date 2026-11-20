// 加到主畫面用的 service worker：什麼都不存快取，每次都向伺服器拿最新版，所以 npm run deploy 之後一樣馬上更新
// 只做一件事：手機完全沒網路時，打開總部會看到一張「連不上網路」的小紙條，不是瀏覽器的錯誤頁
// （筆電關機、伺服器沒開的時候，Cloudflare 會回「總部休息中」那頁，那時候還連得到網路，不會走到這裡）
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

const OFFLINE = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>連不上網路｜這不是一個單純的派對</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#131A28;
font-family:'Noto Sans TC','PingFang TC',sans-serif}.n{background:#FBF6E9;color:#2B2A33;border:2.5px solid #2B2A33;
border-radius:14px 9px 16px 10px/10px 15px 9px 14px;box-shadow:2px 3px 0 rgba(0,0,0,.35);padding:18px 26px;text-align:center;
max-width:80vw}b{display:block;font-size:18px;margin-bottom:6px}button{margin-top:12px;font:inherit;font-weight:700;
background:#FF6A13;color:#fff;border:0;border-radius:999px;padding:8px 22px}</style></head><body><div class="n">
<b>連不上網路</b>手機好像沒有網路，連上之後再試一次<br><button onclick="location.reload()">再試一次</button></div></body></html>`;

self.addEventListener('fetch', (e) => {
  // 只管換頁（打開 hq.html、首頁），圖片、程式、連線都照原本的方式走
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
