# 標準人物的骨架和掛點規格

職業服裝、裝備、手持物都照這份規格做。只要照規格，模型不管是用 Blender 腳本、Tripo3D 還是繪師做的，都可以直接換檔案，不用改程式。

## 座標和大小

- 模型座標：Z 朝上、角色面向 -Y（Blender 的習慣），匯出 GLB 時轉成 Y 朝上。
- 腳底在 z = 0，頭頂大約 z = 2.23。遊戲裡會把整個人縮放成 2.15 單位高。
- 身體（脖子以下）是 B 身材：比原始比例瘦 18%（`build_char.py` 的 `SLIM = 0.82`）。

## 骨架（18 根骨頭，名稱固定）

`root` → `hips` → `spine` → `head`
`spine` → `upper_arm.L/R` → `lower_arm.L/R` → `hand.L/R`
`hips` → `leg.L/R` → `shin.L/R` → `foot.L/R`

新的衣服和配件要綁在這套骨頭上，骨頭名稱不能改。

## 可以換的零件（網格名稱）

| 種類 | 名稱 | 說明 |
|---|---|---|
| 身體 | `Body` | 一直顯示 |
| 上衣 | `Top_<代號>` | 一次顯示一件，例如 `Top_tee`、`Top_dress`、`Top_hoodie` |
| 下身 | `Bottom_<代號>` | 目前只有 `Bottom_shorts` |
| 鞋子 | `Shoes` | 之後多款時改成 `Shoes_<代號>` |
| 頭髮 | `Hair_<代號>` | `short`、`bowl`、`bob`、`long`、`airy`、`hime`、`bun`、`buns`、`buzz`；光頭（`bald`）就是不顯示頭髮。代號跟總部的髮型代號同一套 |
| 臉 | `Face_<代號>` | 貼在臉上的平面五官：`smile`、`dot`、`grin`、`cat`、`wink`、`wow`、`love`、`star`、`grr`、`cry`（跟總部的表情代號同一套，多一個 `dot`） |
| 眼鏡 | `Glasses` | 開關 |
| 配件 | `Acc_<代號>` | 職業或裝備的配件，可以同時顯示好幾個：`Acc_antenna`（觸角髮箍）、`Acc_liangbatou`（大拉翅）、`Acc_skates`（冰刀） |

材質名稱是 `face_` 開頭的，遊戲會當成平塗、不描邊（表情用）。

可以換色的材質名稱：`skin`、`hair`、上衣跟代號同名（`tee`、`dress`、`hoodie`）、`shorts`、`shoe`、`sock`。遊戲用材質名稱找到要染色的地方。

## 掛點（骨頭底下的空物件，名稱固定）

配件不需要綁骨頭權重，直接掛在掛點底下就會跟著動。

| 掛點 | 跟著哪根骨頭 | 位置 | 用途 |
|---|---|---|---|
| `mount_head` | `head` | 頭頂正中 | 帽子、頭飾、觸角 |
| `mount_face` | `head` | 臉正前方 | 面具、口罩 |
| `mount_back` | `spine` | 背後肩胛之間 | 背包、披風、翅膀 |
| `mount_chest` | `spine` | 胸前 | 徽章、項鍊 |
| `mount_waist` | `hips` | 腰部中心 | 腰帶、尾巴 |
| `mount_hand.L` / `mount_hand.R` | `hand.L/R` | 掌心 | 手持物（法杖、扇子） |
| `mount_foot.L` / `mount_foot.R` | `foot.L/R` | 腳底 | 冰刀、輪子 |

配件模型的原點放在「要貼到掛點的那一點」，面向跟角色一樣（-Y 是前面）。

## 動作片段（名稱固定，都是 1 秒循環）

`idle` 站著、`walk` 走路、`run` 跑步、`sit` 坐著（屁股底大約在模型的 z = 0.36，要坐多高由遊戲擺位置）、`wave` 揮手、`skate` 溜冰（陵媒移動時用，取代走路）。

新動作加在 `build_char.py` 的動作區，名稱用小寫英文。

## 職業的整套服裝

選了職業就換上整套，定義在 `newworld/world/50-standard-character.js` 的 `CLS_KIT`：要穿哪件上衣、顯示哪些配件、藏掉哪些零件、要不要把人墊高。玩家自己選的上衣還記著，換回一般就穿回來。

| 職業代號 | 上衣 | 配件 | 其他 |
|---|---|---|---|
| `rider` 機器人騎士 | 自己的上衣 | 無 | 機器人是另外的模型 |
| `summoner` 召喚師 | `Top_space` 粉紅太空衣（連身，蓋住短褲和鞋子） | `Acc_antenna` | 旁邊跟著一隻召喚物（程式畫的） |
| `skater` 陵媒 | `Top_qi` 清宮旗裝（長袍到腳踝） | `Acc_liangbatou`、`Acc_skates` | 冰刀比鞋底低 0.11，人會墊高；移動用 `skate` 動作 |

## 冰龍之翼、火龍之翼

是未來的傳說裝備，另外規劃，不在這份規格的範圍。測試頁現有的冰龍之翼是管理員測試用。
