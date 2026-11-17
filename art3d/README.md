# art3d：用 Blender 腳本做的 3D 角色

每個角色都是一支 Blender Python（bpy）腳本，無頭執行就會重新產生模型、骨架、動作、GLB 和預覽圖。
`.blend` 不進 git（只當作在 Blender 裡打開看的副本）。

## 重新產生（從 WSL 呼叫 Windows 的 Blender 5.3）

```bash
cd art3d/boy
B="/mnt/c/Program Files/Blender Foundation/Blender 5.3/blender.exe"
OUTW='C:\Users\dysia\Documents\typhoon-hq-3d'          # Windows 端的工作資料夾
"$B" --background --factory-startup --python "$(wslpath -w build_boy.py)" -- "$OUTW" "$OUTW\\boy.blend"
cp /mnt/c/Users/dysia/Documents/typhoon-hq-3d/{boy.glb,preview-*.png} .
```

- 腳本路徑要用 `wslpath -w` 轉成 Windows 路徑（`\\wsl.localhost\...` 可以直接讀）。
- 輸出寫到 Windows 端資料夾再複製回來；約 30 秒（含 5 張 Eevee 預覽）。
- 加上 `BOY_WALKCHECK=1 WSLENV=BOY_WALKCHECK` 會多渲染幾張走路影格（`check-walk-*.png`，不進 git）。

## 資料夾

```
art3d/
  README.md
  boy/
    build_boy.py         產生男孩的腳本（唯一的「原始檔」）
    boy.glb              匯出的模型（含骨架、動作、條紋貼圖）
    preview-front/34/side/back/face.png
```

## 約定

- **單位**：Blender 1 單位 = 遊戲 1 單位。男孩總高約 2.3（含頭髮 2.28），頭寬 1.25。
- **方向**：Blender 裡 Z 朝上、角色面向 -Y；匯出 glTF 後 +Y 朝上、面向 +Z。腳底在高度 0，原點在兩腳中間。
- **網格**：`Boy_Body`（頭皮膚、耳朵、軀幹、四肢、鞋，有一層細分）、`Boy_Hair`（頭髮殼 + 剃短的青皮）、`Boy_Glasses`、`Boy_Face`（笑眼、嘴巴、鼻子、腮紅）。約 1.5 萬個三角形。
- **材質名稱**：`skin` `ear_inner` `hair` `stubble` `tee`（白底淺藍條紋貼圖 `tee_stripes`）`shorts` `sock` `shoe` `sole` `glasses` `face_line` `nose` `blush`。全部是 Principled BSDF 平塗色（roughness 0.9、不含金屬、沒有烘焙光影），遊戲端自己上卡通光影和描邊。顏色取自 `newworld/world.js` 的 `K` 色票。
- **骨頭名稱**：`root` `hips` `spine` `head` `upper_arm.L/R` `lower_arm.L/R` `hand.L/R` `leg.L/R` `foot.L/R`（`.L` = 角色自己的左邊 = Blender +X）。權重由腳本依零件指定（例：袖子跟 `upper_arm`、手臂在上臂/下臂之間依距離漸變、軀幹在 `hips`/`spine` 之間依高度漸變），不是自動權重。
- **動作名稱**：`idle`（呼吸、頭輕輕晃）、`walk`（短腿小碎步、手前後擺），24 fps，1 秒循環（影格 1–25，第 25 格 = 第 1 格）。
