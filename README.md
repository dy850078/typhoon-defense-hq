# 🌀 颱風天防衛總部

颱風假出不了門，就來線上總部集合吧！一個小小的多人線上世界：

- 🐱 創建自己的動森風格小動物（6 種動物、毛色、雨衣顏色）
- 🚶 在總部地圖裡走來走去（方向鍵 / WASD，手機可以點地板走路）
- 💬 文字聊天，說的話會冒出對話泡泡
- 📦 到「物資倉庫」敲箱子（空白鍵或點箱子），敲三下會掉出泡麵、礦泉水或蔬菜
- 🌀 走出圍欄到「颱風前線」，大家一起打颱風怪物；它會不時吹強風把人吹開，被打倒後 5 分鐘重新生成
- 📹 走進「視訊會議室」按一下，就能和大家一起進 Jitsi 視訊
- 🌧️ 窗外下著大雨，偶爾還會打雷

技術：Phaser 3（前端 2D 遊戲引擎）+ Node.js + Express + Socket.IO（即時多人同步）。不需要資料庫，也不需要物理引擎。

## 報名頁（首頁）

朋友打開網址會先看到「颱風假開趴」報名頁：上傳大頭照、填暱稱、拿手歌、今晚要喝的酒，選一張 VIP 卡顏色，就會生成：

- 專屬的「防颱總部」VIP 通行證
- 9:16 會動的 IG 限時動態影片（mp4），手機可直接分享到 IG 或存到相簿
- 報名完才會出現「進入颱風天防衛總部」的入口，暱稱會自動帶進遊戲

資料只存在每個人自己的瀏覽器裡，伺服器不收任何報名資料。

## 在自己的電腦啟動

需要先安裝 [Node.js](https://nodejs.org/)（18 版以上）。

```bash
npm install
npm start
```

打開瀏覽器到 <http://localhost:3000> 就能進去了。終端機也會印出這次的 Jitsi 視訊房間網址。

## 讓朋友連進來（不需要 public IP 或網域）

伺服器跑起來之後，再開一個終端機，用下面任一種「通道（tunnel）」把你電腦上的 3000 port 分享出去。它會給你一個公開的 https 網址，把網址傳給朋友就好。

### 方法 A：Cloudflare Tunnel（免費、免註冊）

1. 安裝 cloudflared
   - macOS：`brew install cloudflared`
   - Windows：`winget install --id Cloudflare.cloudflared`
2. 執行：
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
3. 畫面上會出現 `https://xxxx-xxxx.trycloudflare.com`，傳給朋友。

### 方法 B：ngrok

1. 到 <https://ngrok.com/> 註冊並安裝，照網站指示設定 authtoken。
2. 執行：
   ```bash
   ngrok http 3000
   ```
3. 把畫面上 `Forwarding` 那行的 https 網址傳給朋友。

> 注意：關掉終端機或電腦睡眠，大家就會斷線。快速通道的網址每次重開都會變，要重新傳一次。

## 設定（環境變數，可不設）

| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `PORT` | `3000` | 伺服器 port |
| `MAX_PLAYERS` | `40` | 最多同時上線人數 |
| `JITSI_ROOM` | 每次啟動隨機產生 | 視訊房間名稱，想固定的話自己設一個不好猜的名字 |
| `JITSI_DOMAIN` | `meet.jit.si` | 如果有自架 Jitsi 可以換掉 |
| `MONSTER_HP` | `600` | 颱風怪物的血量 |
| `RESPAWN_MINUTES` | `5` | 颱風被打倒後幾分鐘重新生成 |

例如：`JITSI_ROOM=OurTyphoonParty2026 npm start`（Windows PowerShell：`$env:JITSI_ROOM="OurTyphoonParty2026"; npm start`）

## 關於視訊

- meet.jit.si 嵌在別人網頁裡的話，通話 5 分鐘後會被自動切斷，所以這裡是**開新分頁**進 Jitsi，大家會進同一個房間。
- meet.jit.si 現在需要第一個進房的人用 Google / GitHub 等帳號登入當主持人，其他人就可以直接加入。

## 專案結構

```
server.js          伺服器：玩家同步、聊天、設定
shared/map.js      地圖資料（前後端共用）
shared/avatar.js   角色外觀選項與繪圖
public/index.html  首頁：颱風假開趴報名頁（專屬 VIP 邀請函、IG 限時動態影片）
public/hq.html     遊戲頁：角色創建、聊天框
public/game.js     遊戲主程式（Phaser 場景）
public/style.css   介面樣式
```

想改地圖，就改 `shared/map.js` 裡的 `rect(...)` / `set(...)`；房間名稱在 `ROOMS`。
