"""黑潮人魚：從 ZS 畫的設定圖 (mermaid/ref.jpg) 剪出模型要用的小圖，輸出到 public/nw-art/：
  mermaid-face.png   臉上的五官（眉毛、閉著的眼睛、腮紅、嘴），皮膚的部分是透明的，貼在模型的頭上
  mermaid-note1.png / mermaid-note2.png  圖上的音符
用法：python3 newworld/assets/src/build_mermaid.py   （需要 pillow numpy scipy）
座標都是原圖裁切 (700,240)-(1800,1200) 之後的位置。模型本身在 newworld/world/57-mermaid.js。"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', '..', '..', 'public', 'nw-art'); os.makedirs(OUT, exist_ok=True)
a = np.asarray(Image.open(os.path.join(HERE, 'mermaid', 'ref.jpg')).convert('RGB').crop((700, 240, 1800, 1200))).astype(float)
dist = np.sqrt(((a - np.array([255., 243., 221.])) ** 2).sum(2))
# 臉：先找出皮膚的範圍，再把「跟附近膚色差很多」的地方留下來，就是五官
box = (400, 135, 605, 305); c = a[box[1]:box[3], box[0]:box[2]]
skin = (c[..., 0] > 205) & (c[..., 1] > 160) & (c[..., 2] > 120) & (c[..., 0] > c[..., 2] + 25)
lab, n = ndi.label(skin); skin = lab == (int(np.argmax(ndi.sum(skin, lab, range(1, n + 1)))) + 1)
face = ndi.binary_erosion(ndi.binary_fill_holes(ndi.binary_closing(skin, iterations=7)), iterations=3)
w = ndi.gaussian_filter(skin.astype(float), 14) + 1e-6; tone = np.dstack([ndi.gaussian_filter(c[..., k] * skin, 14) / w for k in range(3)])
al = np.clip((np.sqrt(((c - tone) ** 2).sum(2)) - 9) / 22, 0, 1) * face; al[138:] = 0   # 下巴的陰影不要
Image.fromarray(np.dstack([c, al * 255]).astype('uint8')).save(os.path.join(OUT, 'mermaid-face.png'), optimize=True)
for i, b in enumerate([(226, 122, 294, 200), (326, 186, 382, 252)]):
    Image.fromarray(np.dstack([a[b[1]:b[3], b[0]:b[2]], np.clip((dist[b[1]:b[3], b[0]:b[2]] - 18) / 22, 0, 1) * 255]).astype('uint8')).save(os.path.join(OUT, 'mermaid-note%d.png' % (i + 1)), optimize=True)
