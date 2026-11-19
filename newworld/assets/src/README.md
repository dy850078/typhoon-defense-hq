# 新世界的 3D 模型原始檔

- `build_char.py`：標準人物（同一個底模＋可換的髮型、上衣、臉、眼鏡），輸出 `char.glb`
- `build_wing.py`：冰龍之翼（照繪師的翅膀圖描出來的立體翅膀），輸出 `wing-ice.glb`

用 Blender 的 Python 模組（`pip install bpy`，Blender 5.3，Python 3.13）執行，例如：

```
NO_RENDER=1 python build_char.py -- <輸出資料夾>
python build_wing.py <繪師的翅膀圖 public/art/wing-ice.png> <輸出資料夾>
```

輸出的 `.glb` 複製到 `newworld/assets/`。這兩個檔只透過 `/api/newworld/<檔名>` 給管理員帳號下載。

骨架、零件命名、掛點和動作片段的規格寫在 `newworld/assets/MOUNTS.md`，新的職業服裝和裝備都照那份做。
