// 加到主畫面（PWA）：註冊 service worker，並在報到卡片下面放一張手繪小紙條教大家把總部加到手機主畫面
// iPhone 沒有「安裝」按鈕，只能教他按 Safari 的「分享 → 加入主畫面」；Android 的 Chrome 直接給「安裝」按鈕
// 已經從主畫面打開、按過「不用了」、或是用電腦的人都不顯示
(function (root) {
  if ('serviceWorker' in navigator) {
    root.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  const OFF = 'hq-a2hs-off';
  const get = () => { try { return localStorage.getItem(OFF); } catch (e) { return '1'; } };
  const off = () => { try { localStorage.setItem(OFF, '1'); } catch (e) { /* 私密模式存不了就算了 */ } };
  const standalone = (root.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const touch = root.matchMedia && matchMedia('(pointer: coarse)').matches;
  // LINE、IG、FB 裡面開的網頁沒辦法加到主畫面，要先換到 Safari
  const inApp = /Line\/|FBAN|FBAV|Instagram|MicroMessenger/i.test(ua);
  if (standalone || get() || !touch) return;

  // 手繪小圖：iPhone 的分享鈕（方框加往上的箭頭）、加入主畫面（方框加號）
  const C = root.HQ_CRAYON;
  if (root.HQ_ICONS && C) {
    root.HQ_ICONS.add({
      'ui-share'(x, r) {
        x.beginPath(); x.moveTo(17, 19); x.lineTo(11, 19); x.lineTo(11, 42); x.lineTo(37, 42); x.lineTo(37, 19); x.lineTo(31, 19);
        x.fillStyle = 'rgba(0,0,0,0)'; C.stroke(x, r, 3, '#2f6fd6');
        C.line(x, 24, 31, 24, 6, r, 3, '#2f6fd6');
        x.beginPath(); x.moveTo(16, 13); x.lineTo(24, 5); x.lineTo(32, 13); C.stroke(x, r, 3, '#2f6fd6');
      },
      // 指向 Safari 工具列的箭頭：彎彎的線往下
      'ui-arrow'(x, r) {
        x.beginPath(); x.moveTo(20, 4); x.quadraticCurveTo(32, 18, 24, 40); C.stroke(x, r, 4, '#FF6A13');
        x.beginPath(); x.moveTo(14, 31); x.lineTo(24, 43); x.lineTo(33, 32); C.stroke(x, r, 4, '#FF6A13');
      },
      'ui-addhome'(x, r) {
        C.rect(x, 9, 9, 30, 30, r, 1); C.stroke(x, r, 3, '#2B2A33');
        C.line(x, 24, 16, 24, 32, r, 3); C.line(x, 16, 24, 32, 24, r, 3);
      },
    });
  }
  const ic = (key) => {
    const u = root.HQ_ICONS && root.HQ_ICONS.url(key);
    if (!u) return document.createTextNode('');
    const i = document.createElement('img'); i.src = u; i.alt = ''; i.className = 'a2hs-ic'; return i;
  };

  function show(build) {
    const form = document.getElementById('join-form');
    if (!form || document.getElementById('a2hs')) return;
    const box = document.createElement('div'); box.id = 'a2hs'; box.className = 'a2hs';
    const logo = document.createElement('img'); logo.src = '/apple-touch-icon.png'; logo.alt = ''; logo.className = 'a2hs-logo';
    const body = document.createElement('div'); body.className = 'a2hs-body';
    const t = document.createElement('b'); t.textContent = '把總部加到手機主畫面';
    const p = document.createElement('p');
    body.append(t, p);
    const no = document.createElement('button'); no.type = 'button'; no.className = "link-btn a2hs-x"; no.textContent = '不用了';
    no.onclick = () => { off(); box.remove(); const a = document.getElementById('a2hs-arrow'); if (a) a.remove(); };
    box.append(logo, body, no);
    build(p, body, box);
    form.appendChild(box);
  }

  // iPhone Safari 的工具列在畫面下面：iOS 26 以後分享鈕收進右下角的「⋯」，之前是工具列正中間
  // 網頁讀不到使用者有沒有改過排版（網址列放上面、經典排版），所以只是照預設猜，文字說明還是保留
  // iPad（按鈕在右上角）和 Chrome、Firefox 等其他瀏覽器不放箭頭
  function arrow() {
    const ipad = /iPad/.test(ua) || navigator.platform === 'MacIntel';
    if (ipad || /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return;
    const v = +((ua.match(/Version\/(\d+)/) || [])[1] || 0);
    const right = v >= 26;
    const wrap = document.getElementById('join');
    if (!wrap) return;
    const a = document.createElement('div'); a.id = 'a2hs-arrow'; a.className = 'a2hs-arrow' + (right ? ' right' : '');
    const t = document.createElement('span'); t.textContent = right ? '先點右下角的「⋯」，再點分享' : '點這裡的分享';
    a.append(t, ic('ui-arrow'));
    wrap.appendChild(a);
  }

  if (ios) {
    root.addEventListener('DOMContentLoaded', () => show((p) => {
      if (inApp) {
        p.append('下次一點就進來。先用 Safari 打開這一頁，再按 ', ic('ui-share'), '分享 → ', ic('ui-addhome'), '加入主畫面。');
      } else {
        p.append('下次一點就進來，畫面也比較大。按 Safari 的 ', ic('ui-share'), '分享 → ', ic('ui-addhome'), '加入主畫面。');
      }
      const s = document.createElement('small'); s.textContent = (inApp ? '' : '找不到分享鈕的話，先按右下角的「⋯」。') + '加好之後從圖示打開要再登入一次，角色都還在。';
      p.after(s);
      if (!inApp) arrow();
    }));
    return;
  }

  // Android：Chrome 判斷可以安裝時才會給這個事件，沒有的話就不顯示
  let ask = null;
  root.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); ask = e;
    const go = () => show((p, body, box) => {
      p.textContent = '下次一點就進來，畫面也比較大。';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'primary small a2hs-go'; b.textContent = '安裝';
      b.onclick = () => { if (!ask) return; ask.prompt(); ask.userChoice.then(() => { ask = null; box.remove(); }); };
      body.appendChild(b);
    });
    if (document.readyState === 'loading') root.addEventListener('DOMContentLoaded', go); else go();
  });
  root.addEventListener('appinstalled', () => { const b = document.getElementById('a2hs'); if (b) b.remove(); });
})(this);
