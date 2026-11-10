// 寄信：用 Resend（https://resend.com）寄驗證信和重設密碼信
// .env 沒設 RESEND_API_KEY 的話不會真的寄，只把信的內容和連結印在終端機上（本機測試用）
const KEY = process.env.RESEND_API_KEY || '';
const FROM = process.env.MAIL_FROM || 'info@thisisnotahq.com';
const NAME = process.env.MAIL_NAME || '這不是一個單純的派對';

const ready = () => !!KEY;

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 信的樣子：簡單的一張卡片，一段話加一顆按鈕
// lines 裡每一項是一段文字，或是 { html, text }：自己排版的區塊（html 要自己 esc），純文字版用 text
const FOOT_ASKED = '如果不是你本人申請的，不用理會這封信。';
function html(lines, button, link, foot) {
  const body = lines.map(l => typeof l === 'string' ? `<p style="margin:0 0 14px;line-height:1.7">${esc(l)}</p>` : l.html).join('');
  const btn = button ? `<p style="margin:22px 0"><a href="${esc(link)}" style="display:inline-block;background:#FF5A1F;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">${esc(button)}</a></p>
<p style="margin:0 0 14px;font-size:13px;color:#6B7280;line-height:1.6">按鈕點不開的話，把這個網址貼到瀏覽器：<br><span style="word-break:break-all">${esc(link)}</span></p>` : '';
  return `<div style="background:#F4F1EA;padding:28px 12px;font-family:'Noto Sans TC','PingFang TC',sans-serif;color:#141923">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:28px 24px">
<p style="margin:0 0 18px;font:700 12px monospace;letter-spacing:2px;color:#6B7280">THIS IS NOT A HQ</p>
${body}${btn}
<p style="margin:24px 0 0;font-size:12px;color:#9CA3AF">${esc(foot || FOOT_ASKED)}</p>
</div></div>`;
}

// 許願池回覆信的兩個區塊：願望小卡（類別・狀態＋主題），回覆（灰底、左邊橘色邊框）
const CAT_COLOR = { bug: '#B3202F', feature: '#A34400', improve: '#2C5596', other: '#55555C' };
const multi = (s) => esc(s).replace(/\n/g, '<br>');
function wishCard(w) {
  return { text: `你的願望・${w.catName}・${w.statusName}\n${w.title}`,
    html: `<div style="border:1px solid #E5E7EB;border-radius:12px;padding:14px 16px;margin:0 0 14px">
<p style="margin:0 0 6px;font-size:12px;color:#6B7280">你的願望・<span style="color:${CAT_COLOR[w.cat] || CAT_COLOR.other};font-weight:700">${esc(w.catName)}</span>・${esc(w.statusName)}</p>
<p style="margin:0;font-size:17px;font-weight:700;line-height:1.5">${esc(w.title)}</p></div>` };
}
function replyBlock(c) {
  return { text: `管理員 ${c.name}・${c.when}：\n${c.text}`,
    html: `<div style="background:#F3F4F6;border-left:4px solid #FF5A1F;border-radius:4px 10px 10px 4px;padding:12px 16px;margin:0 0 18px">
<p style="margin:0 0 6px;font-size:12px;color:#6B7280"><b style="color:#2C5596">管理員</b> ${esc(c.name)}・${esc(c.when)}</p>
<p style="margin:0;line-height:1.7">${multi(c.text)}</p></div>` };
}

async function send(to, subject, lines, button, link, foot) {
  const text = lines.map(l => typeof l === 'string' ? l : l.text).join('\n\n') + (link ? `\n\n${button}：${link}` : '') + '\n\n' + (foot || FOOT_ASKED);
  if (!KEY) {
    console.log(`✉️ （沒有設定 RESEND_API_KEY，信沒有真的寄出）寄給 ${to}：${subject}\n${text}\n`);
    return { ok: true, dry: true };
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${NAME} <${FROM}>`, to: [to], subject, html: html(lines, button, link, foot), text }),
    });
    if (!r.ok) { console.error('✉️ 寄信失敗', r.status, (await r.text()).slice(0, 300)); return { ok: false }; }
    return { ok: true };
  } catch (e) {
    console.error('✉️ 寄信失敗', e.message);
    return { ok: false };
  }
}

module.exports = {
  ready,
  from: FROM,
  verify: (to, username, link) => send(to, '驗證你的 email', [`嗨 ${username}，`, '點下面的按鈕確認這是你的 email，確認之後就能進總部；以後忘記密碼，也可以用這個信箱自己重設。', '連結 24 小時內有效。'], '驗證 email', link),
  // 管理員在許願池回覆了你的願望
  // w：{ title, cat, catName, statusName }；c：{ name, when, text }
  wishReply: (to, username, w, c, link) => send(to, `管理員回覆了你的願望「${w.title}」`,
    [`嗨 ${username}，管理員回覆了你的願望。`, wishCard(w), replyBlock(c), '想回應的話，到總部的許願池點開這個願望就能留言。'],
    '到總部看看', link, '不想收到這種通知的話，到首頁的「帳號設定」把「願望有管理員回覆時寄信通知我」關掉。'),
  reset: (to, username, link) => send(to, '重設你的密碼', [`嗨，你的帳號是「${username}」。`, '有人（希望是你）申請重設密碼，點下面的按鈕設定新密碼。', '連結 30 分鐘內有效，只能用一次。'], '設定新密碼', link),
};
