# 設定 info@thisisnotahq.com 收信和寄信

總部要能「收信」（玩家寫信找管理員）和「寄信」（驗證信、重設密碼信）。
Cloudflare 負責收信，Resend 負責寄信。兩個都是免費方案。

---

## 一、收信：Cloudflare Email Routing（info@ 轉寄到你的 Gmail）

1. 登入 Cloudflare，點進 **thisisnotahq.com**。
2. 左邊選單點 **Email** → **Email Routing**，按 **Get started／開始使用**。
3. 「Custom address」填 `info`，「Destination」填你的 Gmail，按 **Create and continue**。
4. Cloudflare 會寄一封確認信到你的 Gmail，打開信點 **Verify email address**。
5. 回到 Cloudflare，它會說要加幾筆 DNS 紀錄（MX 和 SPF 的 TXT），按 **Add records and enable**，讓它自動加。
6. 完成後，用別的信箱寄一封信到 info@thisisnotahq.com，確認 Gmail 收得到。

> 如果之前已經設過 hq@，在 Email Routing → **Routing rules** 再按 **Create address** 加一個 `info` 就好，DNS 不用重設。

---

## 二、寄信：Resend

1. 到 https://resend.com 註冊（可以用 Google 帳號）。
2. 左邊點 **Domains** → **Add Domain**，填 `thisisnotahq.com`，Region 選 **Tokyo (ap-northeast-1)**（離台灣近）。
3. 下一頁會列出要加的 DNS 紀錄。最簡單的做法：按 **Sign in to Cloudflare／Auto configure**，授權後 Resend 會自己把紀錄加進 Cloudflare。
   要手動加的話，到 Cloudflare → **DNS** → **Records** → **Add record**，照 Resend 畫面上的值一筆一筆貼：
   | 類型 | 名稱 | 內容 |
   |---|---|---|
   | TXT | `resend._domainkey` | Resend 給的一長串 `p=MIGf...`（DKIM） |
   | MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com`，優先順序 10 |
   | TXT | `send` | `v=spf1 include:amazonses.com ~all`（SPF） |
   - Proxy 狀態一律選 **DNS only（灰色雲）**。
   - 這些紀錄都在 `send` 子網域和 `resend._domainkey`，**不會**跟第一步 Email Routing 的 MX／SPF 衝突，兩個可以並存。
4. 建議再加一筆 DMARC（沒有的話 Gmail 比較容易把信丟進垃圾郵件）：
   | TXT | `_dmarc` | `v=DMARC1; p=none;` |
5. 回到 Resend 按 **Verify DNS Records**，通常幾分鐘內就會變成綠色的 **Verified**。
6. 左邊點 **API Keys** → **Create API Key**，權限選 **Sending access**，Domain 選 thisisnotahq.com。複製那串 `re_...`（只會顯示一次）。
7. 打開專案資料夾的 `.env`，加上：
   ```
   RESEND_API_KEY=re_你剛剛複製的那串
   MAIL_FROM=info@thisisnotahq.com
   ```
   存檔後重開伺服器（`npm run serve` 的話，Ctrl+C 再開一次）。

免費方案：每天 100 封、每月 3000 封，總部這個規模很夠用。

---

## 三、（選用）用 Gmail 以 info@ 的名義回信

收到玩家來信時，想讓回信的寄件人也是 info@，而不是你的 Gmail：

1. Gmail → 右上齒輪 → **查看所有設定** → **帳戶和匯入** → **以這個地址寄送郵件** → **新增另一個電子郵件地址**。
2. 名稱填「這不是一個單純的派對」，地址填 `info@thisisnotahq.com`，**取消勾選**「視為別名」，下一步。
3. SMTP 伺服器設定：
   - SMTP 伺服器：`smtp.resend.com`
   - 通訊埠：`465`（選 SSL）
   - 使用者名稱：`resend`
   - 密碼：Resend 的 API key（可以另外建一把專門給 Gmail 用的）
4. Gmail 會寄驗證碼到 info@，因為第一步已經轉寄到你的 Gmail，直接在收件匣找那封信，輸入驗證碼就完成。
5. 之後寫信或回信時，「寄件者」可以選 info@thisisnotahq.com。

---

## 沒設好之前會怎樣

`.env` 沒有 `RESEND_API_KEY` 的時候，伺服器不會真的寄信，只會把信的內容和連結印在終端機上。
這段期間新報到的人收不到驗證信，管理頁會有「設為已驗證」按鈕可以先手動幫他們通過。
