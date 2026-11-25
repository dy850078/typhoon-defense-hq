# 新世界的場景程式

這個資料夾裡的檔案會照檔名順序接成一支程式（`/api/newworld/world.js`），由伺服器接好、壓縮後送給管理員。
它們共用同一個外層函式，所以單獨一個檔案不是完整的程式，不能各自執行；要檢查語法請跑 `npm run test:newworld`。

| 檔案 | 內容 |
|---|---|
| `10-base.js` | 畫面設定、配色、材質、外框、共用的小工具 |
| `20-robot.js` | 機器人和舊的小男孩模型、貼圖 |
| `30-robot-walk.js` | 機器人的關節、走路、念力光帶 |
| `40-town.js` | 小屋、樹、石頭、示範用的角色和怪 |
| `50-standard-character.js` | 標準人物：換裝、職業服裝、表情、動作混合、釋放記憶體 |
| `55-lobby.js` | 前院兩層小樓的外觀、總部大廳（室內）的格局和家具；家具併成幾塊一起畫 |
| `58-combat.js` | 練習場的戰鬥畫面：怪、血條、傷害數字、招式特效、使魔、夢魘機甲、操偶師的線（`makeCombat`，由 `60-play.js` 呼叫） |
| `58-pet3d.js` | 3D 寵物的模型（`makePet3D`：每個領養選項都看得出差別）和領養畫面的 3D 預覽（`PETVIEW`，另開一個小畫布畫同一個模型） |
| `59-petlawn.js` | 前院西邊的寵物草坪：木柵、遊樂設施（隧道、跳圈、繞桿、沙坑、小山丘、貓跳台、紙箱、戲水池、翹翹板、球池、可以踢的球）、24 個散在各處的睡覺位置、寵物可以做的事（`PLAY`）（`makePetLawn`，由 `60-play.js` 呼叫）；草坪上的寵物和照顧員在 `60-play.js` |
| `60-play.js` | 操作、多人同步、職業、召喚物、場景細節、互動、鏡頭、對外的介面 |

新功能加在最接近的那一個檔案；要加新檔案就取一個排在中間的編號（例如 `55-xxx.js`）。

階段一第一批（封測名單、背包和裝備面板、熟練度徽章、寵物摸和餵、點歌）：面板在 `public/newworld-panels.js`，伺服器在 `server.js` 的 `nwRoute('bag')`、`nwRoute('pet')`、`/api/newworld/music`，測試是 `node scripts/nw-test.js stay`。

大廳的功能（導師轉職、扭蛋機、公共花園、種子箱、前院的許願池、寵物）：3D 的東西在 `55-lobby.js`（花箱、種子箱、`wishWell`、`setGarden`）和 `60-play.js`（可以互動的點、導師、寵物），面板在 `public/newworld-panels.js`，伺服器接口是 `server.js` 的 `/api/newworld/gacha|garden|wishes`。扭蛋、花園、許願池讀寫的是跟總部同一份資料；職業和造型存在帳號的 `look3d`，跟總部分開。測試：`GARDEN_SPEED=600 node scripts/nw-test.js home`。

練習場的戰鬥和新職業（芽、三個學門、六個專精）：職業和招式的資料在 `shared/classes3d.js`，伺服器（怪、普攻、招式效果、等級、轉職、存檔 `save.nw`）在 `nw-combat.js`，3D 畫面在 `58-combat.js`，技能鈕、技能書和轉職面板在 `public/newworld-skills.js`，圖示在 `public/icons-nw.js`。測試：`node scripts/nw-combat-test.js`（只測伺服器，要先 `npm i --no-save socket.io-client`）、`node scripts/nw-test.js combat`（開瀏覽器，每一招都截圖）。

寵物草坪（領養、重捏、三種模式、離線的寵物在草坪上睡）：場景在 `59-petlawn.js`，寵物模型和領養預覽在 `58-pet3d.js`，草坪上的寵物、照顧員在 `60-play.js`（`setLawn`、`tickLawn`、`lawnNext`），面板在 `public/newworld-panels.js` 的 `pet()`、`petcare()`、`patLawn()`，伺服器是 `server.js` 的 `nwRoute('pet')`（`adopt`、`restyle`、`mode`）和 `nwLawn()`（用 `lawn` 事件送給所有人）。模式存 `save.nw.petMode`，床位存 `save.nw.petBed`。測試：`node scripts/nw-test.js petlawn`。
