"""黑潮人魚：把 ZS 畫的設定圖 (mermaid/ref.jpg) 變成遊戲用的素材。
輸出到 public/nw-art/：
  mermaid-front.png  正面貼圖（去背，只留人魚本體）
  mermaid-back.png   背面貼圖（上半身蓋上頭髮）
  mermaid-h.png      厚度圖（R = 正面鼓起多少，G = 背面鼓起多少，B = 尾鰭和髮尾這些會飄的地方）
  mermaid-note1.png / mermaid-note2.png  圖上的音符
用法：python3 newworld/assets/src/build_mermaid.py [預覽圖輸出資料夾]   （需要 pillow numpy scipy）
座標都是原圖裁切 (700,240)-(1800,1200) 之後的位置。"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi
from scipy.sparse import lil_matrix, csr_matrix
from scipy.sparse.linalg import spsolve

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', '..', '..', 'public', 'nw-art'); PRE = sys.argv[1] if len(sys.argv) > 1 else None
src = Image.open(os.path.join(HERE, 'mermaid', 'ref.jpg')).convert('RGB').crop((700, 240, 1800, 1200)); W, H = src.size
a = np.asarray(src).astype(float); bg = np.array([255., 243., 221.])
dist = np.sqrt(((a - bg) ** 2).sum(2))

def poly(pts, blur=0):
    im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon(pts, fill=255)
    if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im).astype(float) / 255

# 人魚本體的大概輪廓（手描，故意描寬一點；真正的邊緣靠「不是背景色」來切）
FIG = [(520, 22), (585, 35), (635, 68), (662, 110), (672, 160), (680, 210), (700, 245), (745, 268), (805, 288), (858, 318), (895, 360), (912, 410), (916, 445), (945, 470), (985, 482), (972, 520), (940, 560), (895, 592), (840, 598), (798, 580), (770, 556), (750, 572), (742, 600),
       (722, 622), (722, 655), (704, 660), (700, 640), (650, 640), (640, 640), (628, 600), (606, 600), (598, 650), (580, 720), (556, 790), (542, 828), (566, 852), (612, 850), (652, 786), (694, 724), (738, 672), (760, 620), (772, 622), (782, 650), (850, 622), (900, 594), (896, 628), (868, 662), (940, 682), (996, 688), (960, 722), (908, 754), (878, 770), (940, 800), (980, 806), (940, 834), (888, 854), (830, 866), (890, 876), (910, 900), (888, 932), (820, 948), (740, 940), (660, 926), (608, 916),
       (560, 922), (516, 912), (484, 892), (442, 846), (416, 784), (401, 700), (401, 640), (411, 568), (431, 512), (410, 528), (388, 528), (336, 512), (304, 474), (290, 420), (292, 368), (308, 326), (344, 290), (380, 264), (394, 236), (398, 190), (403, 140), (418, 92), (432, 56), (476, 32)]
HEAD = (530, 178, 132, 168)   # 頭（含頭頂的頭髮）：中心 x, y, 半寬, 半高
TORSO = [(474, 288), (548, 288), (584, 338), (612, 400), (652, 516), (702, 556), (734, 600), (692, 612), (640, 566), (602, 486), (600, 470), (455, 470), (458, 442), (400, 444), (381, 425), (398, 394), (440, 338)]
TAIL = [(455, 462), (600, 462), (604, 560), (592, 640), (572, 720), (547, 790), (532, 830), (562, 858), (616, 856), (612, 910), (560, 917), (518, 907), (488, 887), (448, 842), (423, 780), (408, 700), (408, 640), (418, 570), (438, 510)]
FIN = [(612, 850), (652, 786), (694, 724), (738, 672), (760, 620), (900, 594), (996, 688), (980, 806), (910, 900), (888, 932), (820, 948), (608, 916)]

rough = poly(FIG) > 0.5
m = rough & (dist > 30); m = ndi.binary_closing(m, iterations=2); m = ndi.binary_fill_holes(m)
lab, n = ndi.label(m); sz = ndi.sum(m, lab, range(1, n + 1)); m = lab == (int(np.argmax(sz)) + 1)
soft = np.clip((dist - 16) / 20, 0, 1) * ndi.binary_dilation(m, iterations=2); soft[ndi.binary_erosion(m, iterations=2)] = 1; soft *= ndi.gaussian_filter(rough.astype(float), 1.5) > 0.3
ys, xs = np.where(m); x0, x1, y0, y1 = xs.min() - 6, xs.max() + 7, ys.min() - 6, ys.max() + 7

def inflate(mask, s=3):
    """吹氣：解 ∇²u = -4 再開根號，橫切面會是半圓，寬的地方厚、窄的地方薄。回傳的單位是原圖的像素。"""
    small = np.asarray(Image.fromarray((mask * 255).astype('uint8')).resize((W // s, H // s), Image.BILINEAR)) > 127
    idx = -np.ones(small.shape, int); pts = np.argwhere(small); idx[small] = np.arange(len(pts)); A = lil_matrix((len(pts), len(pts)))
    for k, (y, x) in enumerate(pts):
        A[k, k] = 4
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < small.shape[0] and 0 <= xx < small.shape[1] and idx[yy, xx] >= 0: A[k, idx[yy, xx]] = -1
    u = spsolve(csr_matrix(A), np.full(len(pts), 4.0)); out = np.zeros(small.shape); out[small] = np.sqrt(np.maximum(u, 0)) * s
    return np.asarray(Image.fromarray(out.astype('float32')).resize((W, H), Image.BILINEAR))

def cap(h, c): return c * np.tanh(h / c)   # 太厚的地方壓平

yy, xx = np.mgrid[0:H, 0:W]
lum = a.max(2)
head = ((((xx - HEAD[0]) / HEAD[2]) ** 2 + ((yy - HEAD[1]) / HEAD[3]) ** 2) < 1) & m
tailp = (poly(TAIL) > 0.5) & m
# 身體和手：身體範圍裡「亮的」（皮膚、貝殼、珍珠），線稿的縫補起來；垂在肩膀前面的髮束是暗的，留給頭髮
tor = ndi.binary_dilation(poly(TORSO) > 0.5, iterations=10) & m & (lum > 150) & ~tailp & (yy > 262)
tor = ndi.binary_fill_holes(ndi.binary_closing(tor, iterations=4)); lab, n = ndi.label(tor); sz = ndi.sum(tor, lab, range(1, n + 1)); tor = np.isin(lab, [k + 1 for k, v in enumerate(sz) if v > 400]) & ~(head & (yy < 300))
tailp &= ~tor
finp = (poly(FIN) > 0.5) & m & ~tailp
cover = (head | tor | (tailp & (yy < 590 + 18 * np.sin(xx / 14.0)))) & m & ~((xx > 646) & (yy > 520))   # 背面被長髮蓋住的範圍
hairp = m & ~finp & ~(tailp & ~cover)
# 描邊描不準留下的碎片不要算成頭髮，併回尾巴或尾鰭
hk = ndi.binary_opening(hairp, iterations=5); lab, n = ndi.label(hk); sz = ndi.sum(hk, lab, range(1, n + 1)); hk = ndi.binary_dilation(lab == (int(np.argmax(sz)) + 1), iterations=5) & hairp
rest = hairp & ~hk; hairp = hk; finp |= rest & (yy > 600) & (xx > 600); tailp |= rest & ~finp & (yy > 470)

def taper(h, mask, n=8):
    e = np.clip((ndi.distance_transform_edt(mask) - 1) / n, 0, 1); return h * e * e * (3 - 2 * e)

# 各部位自己吹：頭是球、身體和手是圓筒、尾巴是粗圓筒、尾鰭是薄片
h_head = inflate(head); h_tor = cap(inflate(tor), 44); h_tail = cap(inflate(tailp) * 0.8, 62); h_fin = cap(inflate(finp), 9)
# 頭髮是披在背後的一層：前面貼著身體的背，厚度另外算
bodyback = ndi.gaussian_filter(np.maximum.reduce([h_head * 1.02, h_tor, h_tail * (yy < 640)]), 9)
h_hair = cap(inflate(hairp), 30)
flowf = poly(FIN, 6) * (1 - poly(TAIL, 4)); far = np.clip((ndi.distance_transform_edt(~ndi.binary_dilation(head | tor | tailp, iterations=10)) - 10) / 160, 0, 1)
flow = np.clip(flowf + far * (1 - flowf), 0, 1) * m
parts = {   # 名字: (範圍, 正面 z, 背面 z, 背面用哪張圖)
    'head': (head, taper(h_head * 0.92, head), -taper(h_head * 0.9, head), 'back'),
    'body': (tor, taper(h_tor, tor, 4), -taper(h_tor, tor, 4), 'front'),
    'tail': (tailp, taper(h_tail, tailp), -taper(h_tail, tailp), 'front'),
    'fin': (finp, taper(h_fin, finp, 4), -taper(h_fin, finp, 4), 'front'),
    'hair': (hairp, -bodyback + taper(h_hair * 0.35, hairp), -bodyback - taper(h_hair * 1.5, hairp) - 14 * (bodyback > 3), 'back'),
}

os.makedirs(OUT, exist_ok=True)
# 邊緣那一圈是線稿和背景混在一起的淺色，貼到模型的側面會變成一條白邊：改成用往裡面幾個像素的顏色
soft = np.maximum(soft, np.clip(ndi.gaussian_filter(ndi.binary_dilation(m, iterations=3).astype(float), 1.2) * 1.6, 0, 1))   # 透明的邊往外放一點，側面的接縫才不會透光
src_a = a; inner = ndi.binary_erosion(m, iterations=7); near = ndi.distance_transform_edt(~inner, return_indices=True)[1]; a = a[near[0], near[1]]
Image.fromarray(np.dstack([a, soft * 255]).astype('uint8')[y0:y1, x0:x1]).save(os.path.join(OUT, 'mermaid-front.png'), optimize=True)
# 背面：頭、身體、手臂和上段尾巴都被長髮蓋住
hairc = np.array([24., 22., 44.]); rng = np.random.default_rng(7)
cw = ndi.gaussian_filter(ndi.binary_dilation(cover, iterations=3).astype(float), 3)[..., None]
tex = np.ones((H, W, 3)) * hairc + rng.normal(0, 2.2, (H, W, 1))
for k in range(26):   # 幾條淡淡的髮絲，順著往下、往兩邊散
    px = 420 + k * 9 + rng.normal(0, 3); t = np.arange(40, 600); lx = px + (px - 530) * (t / 600.0) ** 2 * 0.9 + 5 * np.sin(t / 60.0 + k)
    ok = (lx > 1) & (lx < W - 2); tex[t[ok], lx[ok].astype(int)] += (10 if k % 5 else 26) * np.array([0.6, 0.8, 1.6])
tex = ndi.gaussian_filter(tex, (0.8, 0.8, 0))
for k in range(60): tex[int(rng.uniform(120, 580)), int(rng.uniform(380, 680))] = [150, 170, 230]
Image.fromarray(np.dstack([a * (1 - cw) + tex * cw, soft * 255]).astype('uint8')[y0:y1, x0:x1]).save(os.path.join(OUT, 'mermaid-back.png'), optimize=True)
# 厚度圖：每個部位一張。R = 正面 z、G = 背面 z（存成 z / 1.6 + 160）、B = 會飄的程度、A = 這個部位的範圍
S = 4; enc = lambda z: np.clip(z / 1.6 + 160, 0, 255)
for name, (mask, zf, zb, bk) in parts.items():
    mk = ndi.gaussian_filter(ndi.binary_dilation(mask, iterations=3).astype(float), 2); zf = ndi.gaussian_filter(zf, 2); zb = ndi.gaussian_filter(zb, 2)
    hh = np.dstack([enc(zf), enc(zb), flow * 255, mk * 255]).astype('uint8')[y0:y1, x0:x1]
    Image.fromarray(hh).resize(((x1 - x0) // S, (y1 - y0) // S), Image.BILINEAR).save(os.path.join(OUT, 'mermaid-p-%s.png' % name), optimize=True)
for i, box in enumerate([(226, 122, 294, 200), (326, 186, 382, 252)]):
    c = src_a[box[1]:box[3], box[0]:box[2]]; d = dist[box[1]:box[3], box[0]:box[2]]; Image.fromarray(np.dstack([c, np.clip((d - 18) / 22, 0, 1) * 255]).astype('uint8')).save(os.path.join(OUT, 'mermaid-note%d.png' % (i + 1)), optimize=True)
print('size', x1 - x0, y1 - y0, {k: (round(float(v[1].max())), round(float(v[2].min()))) for k, v in parts.items()})
if PRE:
    col = np.zeros((H, W, 3))
    for k, c in (('hair', (90, 60, 120)), ('head', (230, 200, 80)), ('body', (240, 150, 150)), ('tail', (90, 90, 220)), ('fin', (60, 200, 200))): col[parts[k][0]] = c
    Image.fromarray(col.astype('uint8')[y0:y1, x0:x1]).resize(((x1 - x0) // 2, (y1 - y0) // 2)).save(os.path.join(PRE, 'mermaid-parts.png'))
