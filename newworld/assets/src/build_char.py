# -*- coding: utf-8 -*-
"""颱風天防衛總部：標準人物底模＋可替換零件（髮型、上衣、臉、眼鏡）

用 Blender 無頭執行：
  blender --background --factory-startup --python build_boy.py -- <輸出資料夾> [<.blend 存檔路徑>]

會產生：boy.glb、preview-front/34/side/back/face.png，並存一份 .blend。
座標：Blender 公尺，Z 朝上，角色面向 -Y（匯出 glTF 後 +Y 朝上、面向 +Z），腳底在 z=0。
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.dirname(os.path.abspath(__file__))
BLEND = argv[1] if len(argv) > 1 else os.path.join(OUT, 'char.blend')
os.makedirs(OUT, exist_ok=True)

# ---------------- 場景清空 ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 24

# ---------------- 配色（取自 newworld/world.js 的 K 色票與 makeBoy） ----------------
def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]

PAL = {
    'skin': '#f8d9bb', 'ear_inner': '#f1b9a4', 'hair': '#23262f', 'stubble': '#cdb6a4',
    'tee': '#fbfaf2', 'stripe': '#8fb4d8', 'shorts': '#2c3140', 'sock': '#f0e7cf',
    'shoe': '#4b4a37', 'sole': '#3a3a2b', 'glasses': '#23262f', 'face_line': '#23262f',
    'nose': '#f3b49a', 'blush': '#f5ad9f', 'dress': '#f6a3b4', 'hoodie': '#f2c86a',
    'trim': '#fff8ec', 'string': '#fbf6e8', 'button': '#fff8ec',
}

def principled(mat):
    if mat.node_tree is None:
        try: mat.use_nodes = True
        except Exception: pass
    nt = mat.node_tree
    p = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if p is None:
        p = nt.nodes.new('ShaderNodeBsdfPrincipled')
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None) or nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(p.outputs[0], out.inputs[0])
    return nt, p

def make_mat(name, hexcol=None, image=None):
    m = bpy.data.materials.new(name)
    nt, p = principled(m)
    p.inputs['Roughness'].default_value = 0.9
    p.inputs['Metallic'].default_value = 0.0
    for k in ('Specular IOR Level', 'Specular'):
        if k in p.inputs: p.inputs[k].default_value = 0.15; break
    if image is not None:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = image; t.interpolation = 'Linear'
        nt.links.new(t.outputs['Color'], p.inputs['Base Color'])
    else:
        p.inputs['Base Color'].default_value = lin(hexcol)
    m.diffuse_color = lin(hexcol or PAL['tee'])
    return m

# 白底淺藍條紋（像 world.js 的 stripeTex：粗細略不一、微微起伏）
def stripe_image():
    W = H = 256
    img = bpy.data.images.new('tee_stripes', W, H, alpha=False)
    bg = [int(PAL['tee'][i:i + 2], 16) / 255 for i in (1, 3, 5)]
    st = [int(PAL['stripe'][i:i + 2], 16) / 255 for i in (1, 3, 5)]
    px = [0.0] * (W * H * 4)
    N = 6  # 每一張貼圖 6 條
    for y in range(H):
        for x in range(W):
            # 條紋只跟 v 有關（u 固定），接縫就不會出現鋸齒；每條粗細略不同
            yy = (y / H * N) % 1.0
            th = 0.16 + 0.035 * math.sin(1.7 * math.floor(y / H * N) + 0.5)
            d = abs(yy - 0.5)
            a = max(0.0, min(1.0, (th / 2 - d) / 0.025 + 0.5))
            c = [bg[i] * (1 - a) + st[i] * a for i in range(3)]
            o = (y * W + x) * 4
            px[o:o + 4] = [c[0], c[1], c[2], 1.0]
    img.pixels[:] = px
    img.pack()
    return img

IMG = stripe_image()
MAT = {k: make_mat(k, v) for k, v in PAL.items() if k not in ('tee', 'stripe')}
MAT['tee'] = make_mat('tee', PAL['tee'], image=IMG)
MAT['stripe'] = make_mat('stripe', PAL['stripe'])

# ---------------- 小幾何工具 ----------------
class Builder:
    """收集多個零件的頂點/面，最後組成一個網格；每個零件記住材質、UV 規則和要綁的骨頭。"""
    def __init__(s):
        s.v, s.f, s.fm, s.fuv, s.vb = [], [], [], [], []
    def add(s, verts, faces, mat, bones, uv=None):
        o = len(s.v); s.v += [Vector(p) for p in verts]
        s.vb += [bones] * len(verts)
        for f in faces:
            s.f.append([i + o for i in f]); s.fm.append(mat if not callable(mat) else mat([verts[i] for i in f]))
            s.fuv.append(uv)
        return o
    def build(s, name, mats):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(p) for p in s.v], [], s.f)
        for m in mats: me.materials.append(MAT[m])
        idx = {m: i for i, m in enumerate(mats)}
        me.polygons.foreach_set('material_index', [idx[m] for m in s.fm])
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        uvl = me.uv_layers.new(name='UVMap')
        for poly, rule in zip(me.polygons, s.fuv):
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                uvl.data[li].uv = rule(co) if rule else (0.5, 0.5)
        me.validate(); me.update()
        # 法線一律朝外（遊戲端是單面材質也不會破）
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        for fa in bm.faces:
            c = fa.calc_center_median()
            if name.startswith(('Hair', 'Face')) and fa.normal.dot(c - HC) < 0: fa.normal_flip()
        bm.to_mesh(me); bm.free(); me.update()
        ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
        return ob

def ellipsoid(c, r, segs=16, rings=10, rot=None):
    """UV 球，r=(rx,ry,rz)，rot 是 3x3 Matrix（先縮放再旋轉）。"""
    c = Vector(c); R = rot or Matrix.Identity(3)
    vs = [(0, 0, -1)]
    for i in range(1, rings):
        ph = -math.pi / 2 + math.pi * i / rings
        for j in range(segs):
            th = 2 * math.pi * j / segs
            vs.append((math.cos(ph) * math.cos(th), math.cos(ph) * math.sin(th), math.sin(ph)))
    vs.append((0, 0, 1))
    out = [c + R @ Vector((x * r[0], y * r[1], z * r[2])) for x, y, z in vs]
    fs = []
    for j in range(segs): fs.append([0, 1 + (j + 1) % segs, 1 + j])
    for i in range(rings - 2):
        a, b = 1 + i * segs, 1 + (i + 1) * segs
        for j in range(segs):
            k = (j + 1) % segs; fs.append([a + j, a + k, b + k, b + j])
    top = len(vs) - 1; a = 1 + (rings - 2) * segs
    for j in range(segs): fs.append([a + j, a + (j + 1) % segs, top])
    return out, fs

def capsule(a, b, ra, rb, segs=12, cap=4, mid=3):
    """從 a 到 b 的膠囊（兩端半徑可不同）。"""
    a, b = Vector(a), Vector(b); ax = (b - a); L = ax.length; ax.normalize()
    up = Vector((0, 0, 1)) if abs(ax.z) < 0.9 else Vector((1, 0, 0))
    u = ax.cross(up).normalized(); w = ax.cross(u).normalized()
    rows = []  # (沿軸位置, 半徑)
    for i in range(cap, 0, -1):
        t = math.pi / 2 * i / cap; rows.append((-ra * math.sin(t) * 0.9 , ra * math.cos(t)))
    for i in range(mid + 1):
        t = i / mid; rows.append((L * t, ra + (rb - ra) * t))
    for i in range(1, cap + 1):
        t = math.pi / 2 * i / cap; rows.append((L + rb * math.sin(t) * 0.9, rb * math.cos(t)))
    vs, fs = [a - ax * (ra * 0.9)], []
    for (h, r) in rows[1:-1]:
        for j in range(segs):
            th = 2 * math.pi * j / segs
            vs.append(a + ax * h + (u * math.cos(th) + w * math.sin(th)) * r)
    vs.append(b + ax * (rb * 0.9))
    n = len(rows) - 2
    for j in range(segs): fs.append([0, 1 + j, 1 + (j + 1) % segs])
    for i in range(n - 1):
        p, q = 1 + i * segs, 1 + (i + 1) * segs
        for j in range(segs):
            k = (j + 1) % segs; fs.append([p + j, q + j, q + k, p + k])
    top = len(vs) - 1; p = 1 + (n - 1) * segs
    for j in range(segs): fs.append([p + (j + 1) % segs, p + j, top])
    return vs, fs

def tube(points, r, sides=6, closed=False):
    """沿著折線的細管（眼鏡框、笑眼、嘴巴）。"""
    P = [Vector(p) for p in points]; n = len(P)
    vs, fs = [], []
    prev_n = None
    for i in range(n):
        if closed: t = (P[(i + 1) % n] - P[i - 1])
        else: t = (P[min(i + 1, n - 1)] - P[max(i - 1, 0)])
        t.normalize()
        if prev_n is None:
            ref = Vector((0, -1, 0)) if abs(t.y) < 0.9 else Vector((0, 0, 1))
            nn = (ref - t * ref.dot(t)).normalized()
        else:
            nn = (prev_n - t * prev_n.dot(t)).normalized()
        prev_n = nn; bn = t.cross(nn)
        for j in range(sides):
            th = 2 * math.pi * j / sides
            vs.append(P[i] + (nn * math.cos(th) + bn * math.sin(th)) * r)
    rng = n if closed else n - 1
    for i in range(rng):
        a, b = i * sides, ((i + 1) % n) * sides
        for j in range(sides):
            k = (j + 1) % sides; fs.append([a + j, a + k, b + k, b + j])
    if not closed:  # 圓頭端點
        for end, base, sgn in ((0, 0, -1), (n - 1, (n - 1) * sides, 1)):
            t = (P[end] - P[end - sgn if 0 <= end - sgn < n else end]).normalized() if n > 1 else Vector((1, 0, 0))
            vs.append(P[end] + t * r * 0.8); c = len(vs) - 1
            for j in range(sides):
                k = (j + 1) % sides
                fs.append([base + k, base + j, c] if sgn < 0 else [base + j, base + k, c])
    return vs, fs

def lathe(profile, segs, sy=1.0, cx=(0, 0)):
    """繞 Z 軸旋轉剖面 [(半徑, z)]，sy 讓身體前後略扁。"""
    vs, fs = [], []
    rows = []
    for (r, z) in profile:
        if r < 1e-6:
            rows.append([len(vs)]); vs.append((cx[0], cx[1], z))
        else:
            row = []
            for j in range(segs):
                th = 2 * math.pi * j / segs
                row.append(len(vs)); vs.append((cx[0] + r * math.sin(th), cx[1] - r * math.cos(th) * sy, z))
            rows.append(row)
    for A, B in zip(rows, rows[1:]):
        if len(A) == 1:
            for j in range(segs): fs.append([A[0], B[(j + 1) % segs], B[j]])
        elif len(B) == 1:
            for j in range(segs): fs.append([A[j], A[(j + 1) % segs], B[0]])
        else:
            for j in range(segs):
                k = (j + 1) % segs; fs.append([A[j], A[k], B[k], B[j]])
    return vs, fs

# ---------------- 頭（解析的橢球，臉上的東西都貼著它放） ----------------
HC = Vector((0, 0, 1.63)); HA, HB, HCc = 0.625, 0.60, 0.60

def head_r(d):
    d = d.normalized(); return 1 / math.sqrt((d.x / HA) ** 2 + (d.y / HB) ** 2 + (d.z / HCc) ** 2)

def head_pt(d, off=0.0):
    d = Vector(d).normalized(); return HC + d * (head_r(d) + off)

def face_pt(x, z, off=0.0):
    """臉正面 (x, 相對頭中心的 z) 投到頭表面，沿法線往外 off。"""
    dz = z
    k = 1 - (x / HA) ** 2 - (dz / HCc) ** 2
    y = -HB * math.sqrt(max(k, 0.0))
    p = Vector((x, y, dz))
    n = Vector((x / HA ** 2, y / HB ** 2, dz / HCc ** 2)).normalized()
    return HC + p + n * off, n

def dir_from(theta, elev):
    """theta：從正前方 (-Y) 往角色左手邊 (+X) 量的方位角；elev：仰角（弧度）。"""
    return Vector((math.sin(theta) * math.cos(elev), -math.cos(theta) * math.cos(elev), math.sin(elev)))

def quad_sphere(n):
    """細分方塊投到橢球上：比 UV 球乾淨，沒有極點。"""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=n - 1, use_grid_fill=True)
    vs = [HC + v.co.normalized() * head_r(v.co) * 1.004 for v in bm.verts]
    fs = [[v.index for v in f.verts] for f in bm.faces]
    bm.free(); return vs, fs

# 髮際線：正面齊瀏海、兩側在耳朵上方、後面蓋到後腦上半；正中間被風吹開一點
D = math.radians
def hairline(th):
    th = (th + math.pi) % (2 * math.pi) - math.pi
    e = 15 + 16 * math.cos(th) - 11 * math.cos(2 * th)
    thd = abs(math.degrees(th))
    if STYLE == 'bob':                                          # 鮑伯頭：兩側和後面蓋到下巴，瀏海齊
        w = max(0.0, min(1.0, (thd - 48) / 22)); w = w * w * (3 - 2 * w)
        e = (20 + 3 * math.cos(3 * th)) * (1 - w) + (-36 + 4 * math.cos(th * 9)) * w
    elif STYLE == 'buns':                                       # 丸子頭：瀏海有點波浪
        e += 3.0 * math.cos(th * 7)
    else:                                                       # 西瓜皮：像西瓜切一半，前後左右一樣高的平切
        e = 17.0 + 8.0 * math.exp(-(math.degrees(th) / 6.5) ** 2)   # 只留正中間的小缺口
    return D(e)
STYLE = 'bowl'

# ---------------- 骨架定義（rest pose，Blender 世界座標） ----------------
BONES = [  # 名稱, 頭, 尾, 父, 是否相連
    ('root', (0, 0, 0), (0, 0.3, 0), None, False),
    ('hips', (0, 0, 0.45), (0, 0, 0.72), 'root', False),
    ('spine', (0, 0, 0.72), (0, 0, 1.06), 'hips', True),
    ('head', (0, 0, 1.06), (0, 0, 1.95), 'spine', True),
]
for s, k in (('L', 1), ('R', -1)):
    BONES += [
        (f'upper_arm.{s}', (0.33 * k, 0.0, 0.99), (0.47 * k, 0.0, 0.80), 'spine', False),
        (f'lower_arm.{s}', (0.47 * k, 0.0, 0.80), (0.58 * k, -0.01, 0.62), f'upper_arm.{s}', True),
        (f'hand.{s}', (0.58 * k, -0.01, 0.62), (0.64 * k, -0.02, 0.49), f'lower_arm.{s}', True),
        (f'leg.{s}', (0.2 * k, 0.0, 0.48), (0.2 * k, -0.004, 0.33), 'hips', False),
        (f'shin.{s}', (0.2 * k, -0.004, 0.33), (0.2 * k, 0.0, 0.19), f'leg.{s}', True),
        (f'foot.{s}', (0.2 * k, 0.0, 0.19), (0.2 * k, -0.2, 0.06), f'shin.{s}', True),
    ]
BMAP = {b[0]: b for b in BONES}

def seg_dist(p, a, b):
    a, b = Vector(a), Vector(b); ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared))
    return (a + ab * t - p).length

# ---------------- 身體（一個網格：頭皮膚+耳朵+軀幹+短褲+四肢+鞋） ----------------
body, top, bottom, shoes, dress, hoodie = Builder(), Builder(), Builder(), Builder(), Builder(), Builder()
# 頭
v, f = quad_sphere(6); body.add(v, f, 'skin', ['head'])
for k in (1, -1):
    R = Matrix.Rotation(D(-12 * k), 3, 'Z')
    v, f = ellipsoid((0.605 * k, 0.04, 1.585), (0.085, 0.06, 0.135), 10, 6, R); body.add(v, f, 'skin', ['head'])
    v, f = ellipsoid((0.672 * k, 0.025, 1.585), (0.028, 0.035, 0.08), 8, 5, R); body.add(v, f, 'ear_inner', ['head'])

# 軀幹：梨形，下半是短褲；T 恤下襬微微蓋住褲頭
TEE_UV = lambda co: (0.5, co.z * 1.35)
prof = [(0, 0.35), (0.26, 0.355), (0.38, 0.40), (0.435, 0.48), (0.445, 0.555),
        (0.46, 0.585), (0.455, 0.60), (0.445, 0.68), (0.42, 0.78), (0.37, 0.88), (0.30, 0.97),
        (0.22, 1.04), (0.15, 1.10), (0, 1.13)]
def torso_mat(fv):
    zc = sum(p[2] for p in fv) / len(fv)
    return 'shorts' if zc < 0.575 else 'tee'
def torso_bones(p):
    t = max(0, min(1, (p.z - 0.6) / 0.25)); return {'hips': 1 - t, 'spine': t}
TOPP = [(0.36, 0.53), (0.455, 0.555), (0.462, 0.585), (0.455, 0.60), (0.445, 0.68), (0.42, 0.78), (0.37, 0.88), (0.30, 0.97), (0.22, 1.04), (0.15, 1.10), (0, 1.13)]
v, f = lathe(TOPP, 16, sy=0.88); top.add(v, f, 'tee', torso_bones, uv=TEE_UV)
v, f = lathe(TOPP, 16, sy=0.88); dress.add(v, f, 'dress', torso_bones)
v, f = lathe([(0.40, 0.62), (0.47, 0.60), (0.55, 0.50), (0.64, 0.40), (0.68, 0.33), (0.66, 0.30), (0.52, 0.33), (0.36, 0.42)], 20, sy=0.92); dress.add(v, f, 'dress', ['hips'])
v, f = lathe([(r * 1.05 + 0.012, z) for r, z in TOPP[:-1]] + [(0, 1.14)], 16, sy=0.92); hoodie.add(v, f, 'hoodie', torso_bones)
v, f = ellipsoid((0, 0.2, 1.06), (0.3, 0.17, 0.16), 12, 7); hoodie.add(v, f, 'hoodie', ['spine'])           # 帽子垂在背後
v, f = ellipsoid((0, -0.36, 0.72), (0.2, 0.06, 0.09), 10, 5); hoodie.add(v, f, 'hoodie', torso_bones)       # 前面的口袋
v, f = lathe([(0, 0.35), (0.26, 0.355), (0.38, 0.40), (0.435, 0.48), (0.445, 0.555), (0.44, 0.60), (0.36, 0.63)], 16, sy=0.88); bottom.add(v, f, 'shorts', torso_bones)

for s, k in (('L', 1), ('R', -1)):
    # 袖子（短袖，袖口比較寬）
    v, f = capsule((0.29 * k, 0.0, 1.02), (0.45 * k, 0.0, 0.84), 0.13, 0.12, 8, 2, 2)
    top.add(v, f, 'tee', [f'upper_arm.{s}'], uv=TEE_UV)
    v, f = ellipsoid((0.38 * k, 0.0, 0.93), (0.17, 0.15, 0.15), 10, 6); dress.add(v, f, 'dress', [f'upper_arm.{s}'])     # 泡泡袖
    v, f = capsule((0.29 * k, 0.0, 1.02), (0.45 * k, 0.0, 0.84), 0.14, 0.125, 8, 2, 2); hoodie.add(v, f, 'hoodie', [f'upper_arm.{s}'])
    v, f = capsule((0.43 * k, 0.0, 0.86), (0.56 * k, -0.01, 0.66), 0.105, 0.11, 8, 2, 2); hoodie.add(v, f, 'hoodie', [f'upper_arm.{s}', f'lower_arm.{s}'])
    # 手臂（皮膚）
    v, f = capsule((0.42 * k, 0.0, 0.86), (0.575 * k, -0.01, 0.63), 0.082, 0.078, 8, 2, 2)
    body.add(v, f, 'skin', [f'upper_arm.{s}', f'lower_arm.{s}'])
    # 連指手套般的手 + 大拇指
    R = Matrix.Rotation(D(30 * k), 3, 'Y')
    v, f = ellipsoid((0.615 * k, -0.015, 0.545), (0.085, 0.075, 0.105), 10, 6, R); body.add(v, f, 'skin', [f'hand.{s}'])
    v, f = ellipsoid((0.585 * k, -0.08, 0.585), (0.036, 0.04, 0.055), 8, 5, R); body.add(v, f, 'skin', [f'hand.{s}'])
    for i in (-1, 0, 1):   # 三個圓圓的指節，看得出是手
        c = Vector((0.615 * k, -0.015, 0.545)) + R @ Vector((0.012 * k, 0.047 * i, -0.078))
        v, f = ellipsoid(c, (0.045, 0.03, 0.052), 8, 5, R); body.add(v, f, 'skin', [f'hand.{s}'])
    # 腿：短褲褲管、一小截腿、襪子、鞋
    x = 0.2 * k
    def hipleg(p, s=s):   # 褲管上緣跟著屁股、下緣跟著大腿，走路時不會穿進身體
        t = max(0.0, min(1.0, (0.53 - p.z) / 0.12)); return {'hips': 1 - t, f'leg.{s}': t}
    v, f = capsule((x, 0.0, 0.52), (x, 0.0, 0.38), 0.17, 0.165, 10, 2, 3); bottom.add(v, f, 'shorts', hipleg)
    v, f = capsule((x, 0.0, 0.40), (x, 0.0, 0.23), 0.1, 0.1, 8, 2, 4); body.add(v, f, 'skin', [f'leg.{s}', f'shin.{s}'])
    v, f = capsule((x, 0.0, 0.27), (x, 0.0, 0.17), 0.112, 0.112, 8, 2, 1); shoes.add(v, f, 'sock', [f'shin.{s}', f'foot.{s}'])
    R = Matrix.Rotation(D(-6 * k), 3, 'Z')
    v, f = ellipsoid((x * 1.02, -0.07, 0.115), (0.15, 0.24, 0.12), 10, 7, R)
    v = [Vector((p.x, p.y, max(p.z, 0.0) if p.z > 0.025 else 0.0)) for p in v]  # 鞋底壓平，貼地
    shoes.add(v, f, lambda fv: 'sole' if max(p[2] for p in fv) < 0.03 else 'shoe', [f'foot.{s}'])

# ---------------- 衣服細節：領口、袖口、下襬、帽T繩子、洋裝領子和鈕扣 ----------------
def prof_r(P, z):
    for (r0, z0), (r1, z1) in zip(P, P[1:]):
        if min(z0, z1) <= z <= max(z0, z1) and z1 != z0: return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return P[-1][0]
def ring(r, z, sy, n=28, cx=0.0):
    return [(cx + r * math.sin(2 * math.pi * i / n), -r * math.cos(2 * math.pi * i / n) * sy, z) for i in range(n)]
def ring_on_axis(a, b, t, r, n=16):
    a, b = Vector(a), Vector(b); ax = (b - a).normalized(); c = a + (b - a) * t
    up = Vector((0, 0, 1)) if abs(ax.z) < 0.9 else Vector((1, 0, 0)); u = ax.cross(up).normalized(); w = ax.cross(u).normalized()
    return [c + (u * math.cos(2 * math.pi * i / n) + w * math.sin(2 * math.pi * i / n)) * r for i in range(n)]
# T 恤：藍色羅紋領口、袖口滾邊、下襬
v, f = tube(ring(0.162, 1.095, 0.88), 0.024, 6, closed=True); top.add(v, f, 'stripe', ['spine'])
v, f = tube(ring(0.466, 0.566, 0.88), 0.02, 6, closed=True); top.add(v, f, 'tee', torso_bones, uv=lambda co: (0.5, 0.02))
# 帽T：下襬、領口、兩條繩子（尾端有小束口）
HP = [(r * 1.05 + 0.012, z) for r, z in TOPP[:-1]]
v, f = tube(ring(0.50, 0.57, 0.92), 0.026, 6, closed=True); hoodie.add(v, f, 'hoodie', torso_bones)
v, f = tube(ring(0.175, 1.10, 0.92), 0.03, 6, closed=True); hoodie.add(v, f, 'hoodie', ['spine'])
for k in (1, -1):
    pts = []
    for i in range(9):
        z = 1.07 - 0.2 * i / 8; x = 0.065 * k + 0.012 * k * i / 8
        pts.append((x, -prof_r(HP, z) * 0.92 - 0.016 + 0.002 * i / 8, z))
    v, f = tube(pts, 0.011, 5); hoodie.add(v, f, 'string', torso_bones)
    v, f = ellipsoid(Vector(pts[-1]) + Vector((0, -0.004, -0.02)), (0.017, 0.017, 0.03), 8, 5); hoodie.add(v, f, 'string', torso_bones)
# 洋裝：白色圓領、裙襬白滾邊、胸前兩顆鈕扣
CP = [(0.15 + 0.035, 1.112), (prof_r(TOPP, 1.06) + 0.04, 1.06), (prof_r(TOPP, 1.0) + 0.035, 0.995), (prof_r(TOPP, 1.0) + 0.012, 0.99), (prof_r(TOPP, 1.06) + 0.012, 1.06), (0.15 + 0.01, 1.105)]
v, f = lathe(CP, 20, sy=0.88); dress.add(v, f, 'trim', ['spine'])
v, f = tube(ring(0.672, 0.318, 0.92), 0.026, 6, closed=True); dress.add(v, f, 'trim', ['hips'])
for z in (0.93, 0.83):
    v, f = ellipsoid((0, -prof_r(TOPP, z) * 0.88 - 0.008, z), (0.026, 0.012, 0.026), 8, 5); dress.add(v, f, 'button', torso_bones)
for s_, k in (('L', 1), ('R', -1)):
    # T 恤袖口、帽T袖口羅紋
    v, f = tube(ring_on_axis((0.29 * k, 0.0, 1.02), (0.45 * k, 0.0, 0.84), 0.97, 0.123), 0.018, 6, closed=True); top.add(v, f, 'stripe', [f'upper_arm.{s_}'])
    v, f = tube(ring_on_axis((0.43 * k, 0.0, 0.86), (0.56 * k, -0.01, 0.66), 0.95, 0.112), 0.022, 6, closed=True); hoodie.add(v, f, 'hoodie', [f'lower_arm.{s_}'])
PARTS = [(body.build('Body', ['skin', 'ear_inner']), body), (top.build('Top_tee', ['tee', 'stripe']), top), (dress.build('Top_dress', ['dress', 'trim', 'button']), dress),
         (hoodie.build('Top_hoodie', ['hoodie', 'string']), hoodie), (bottom.build('Bottom_shorts', ['shorts']), bottom), (shoes.build('Shoes', ['sock', 'shoe', 'sole']), shoes)]
SUBDIV = [p[0] for p in PARTS]

# ---------------- 頭髮：一整片貼著頭的殼，邊緣往內收 ----------------
COLS = 84
def hair_shell(rows_spec, cols, th0=0.0, th1=2 * math.pi, closed=True, pole=True):
    vs, fs = [], []
    ncol = cols if closed else cols + 1
    for c in range(ncol):
        th = th0 + (th1 - th0) * c / cols
        for (fe, off) in rows_spec(th):
            vs.append(head_pt(dir_from(th, fe), off))
    nr = len(rows_spec(0.0))
    for c in range(cols):
        c2 = (c + 1) % ncol if closed else c + 1
        for r in range(nr - 1):
            fs.append([c * nr + r, c2 * nr + r, c2 * nr + r + 1, c * nr + r + 1])
    if pole:
        top_off = rows_spec(0.0)[-1][1]
        vs.append(head_pt(Vector((0, 0, 1)), top_off)); pc = len(vs) - 1
        for c in range(cols):
            c2 = (c + 1) % ncol
            fs.append([c * nr + nr - 1, c2 * nr + nr - 1, pc])
    return vs, fs

def hair_rows(th):
    e = hairline(th)
    thd = math.degrees((th + math.pi) % (2 * math.pi) - math.pi)
    lift = 0.018 * math.exp(-((abs(thd) - 9) / 5.5) ** 2)      # 中分兩邊的髮尾被風吹得翹一點
    rows = [(e + D(3), -0.012), (e - D(0.6), 0.006), (e - D(0.2), 0.026 + lift), (e + D(2.5), 0.042 + lift * 0.6), (e + D(6), 0.05)]
    n = 9
    for i in range(1, n + 1):
        fe = e + D(6) + (D(88) - e - D(6)) * i / n
        rows.append((fe, 0.052))
    if STYLE == 'bob':   # 鮑伯頭在耳朵那裡鼓起來，把耳朵整個包住
        rows = [(fe, off + 0.085 * math.exp(-((abs(thd) - 95) / 26) ** 2) * math.exp(-((math.degrees(fe) + 4) / 24) ** 2)) for fe, off in rows]
    return rows

# 剃短的鬢角和後頸：淡淡的青皮，從頭髮底下露出一圈
def stub_rows(th):
    thd = abs(math.degrees((th + math.pi) % (2 * math.pi) - math.pi))
    band = D(14) * max(0.0, min(1.0, (thd - 40) / 40))
    band *= 1 - 0.45 * math.exp(-((thd - 95) / 18) ** 2)       # 耳朵上方窄一點
    e = hairline(th)
    return [(e - band - D(1.5), -0.006), (e - band, 0.011), (e + D(4), 0.012)]
for STYLE in ('bowl', 'bob', 'buns'):
    hair = Builder()
    v, f = hair_shell(hair_rows, COLS); hair.add(v, f, 'hair', ['head'])
    if STYLE == 'bowl':
        v, f = hair_shell(stub_rows, 80, D(38), D(322), closed=False, pole=False); hair.add(v, f, 'stubble', ['head'])
    if STYLE == 'buns':
        for k in (1, -1):
            v, f = ellipsoid(head_pt(dir_from(D(112 * k), D(52)), 0.1), (0.19, 0.19, 0.18), 14, 9); hair.add(v, f, 'hair', ['head'])
    PARTS.append((hair.build('Hair_' + STYLE, ['hair', 'stubble']), hair))
STYLE = 'bowl'

# ---------------- 眼鏡：細細的圓框 ----------------
gl = Builder()
LX, LZ, LR = 0.215, 0.005, 0.15
GO = 0.028   # 鏡框離臉的距離（貼著臉，側面不會浮出來）
for k in (1, -1):
    # 鏡框：每一點都投到臉上再往外 GO，鏡框跟著臉的弧度彎
    pts = [face_pt(LX * k + LR * math.cos(2 * math.pi * i / 36), LZ + LR * math.sin(2 * math.pi * i / 36), GO)[0] for i in range(36)]
    v, f = tube(pts, 0.011, 6, closed=True); gl.add(v, f, 'glasses', ['head'])
    # 鏡腳：從鏡框外側貼著頭水平往後，收進耳朵
    p0 = face_pt(k * (LX + LR), LZ, GO)[0]; d0 = p0 - HC
    th0 = math.atan2(d0.x, -d0.y); el0 = math.asin(d0.z / d0.length)
    pts = [p0]
    for i in range(1, 11):
        t = i / 10
        th = th0 + (k * D(90) - th0) * t
        pts.append(head_pt(dir_from(th, el0 + D(2) * t), GO + (0.016 - GO) * t))   # 水平往後，收進耳朵
    v, f = tube(pts, 0.01, 5); gl.add(v, f, 'glasses', ['head'])
# 鼻樑
a_, _ = face_pt(0.065, LZ + 0.01, GO); b_, _ = face_pt(-0.065, LZ + 0.01, GO)
mid = (a_ + b_) / 2 + Vector((0, -0.006, 0.014))
v, f = tube([a_, (a_ + mid) / 2 + Vector((0, -0.002, 0.005)), mid, (b_ + mid) / 2 + Vector((0, -0.002, 0.005)), b_], 0.01, 5); gl.add(v, f, 'glasses', ['head'])
ob_gl = gl.build('Glasses', ['glasses']); PARTS.append((ob_gl, gl))

# ---------------- 臉：閉著的笑眼、鼻子、微笑、腮紅 ----------------
fc, fd = Builder(), Builder()
DO = 0.004   # 五官像畫在臉上：貼著臉皮，只浮起一點點避免閃爍
def arc2d(cx, cz, r, a0, a1, n=14, sy=1.0):
    return [(cx + r * math.cos(a), cz + r * math.sin(a) * sy) for a in (a0 + (a1 - a0) * i / n for i in range(n + 1))]
def disc_on_face(cx, cz, rx, rz, off=DO, segs=20, rings=3):
    vs = [face_pt(cx, cz, off)[0]]; fs = []
    for r in range(1, rings + 1):
        f_ = r / rings
        for j in range(segs):
            a = 2 * math.pi * j / segs; vs.append(face_pt(cx + rx * f_ * math.cos(a), cz + rz * f_ * math.sin(a), off)[0])
    for j in range(segs): fs.append([0, 1 + j, 1 + (j + 1) % segs])
    for r in range(rings - 1):
        p, q = 1 + r * segs, 1 + (r + 1) * segs
        for j in range(segs):
            k_ = (j + 1) % segs; fs.append([p + j, q + j, q + k_, p + k_])
    return vs, fs
def ribbon_on_face(pts2d, w, off=DO):
    P = [face_pt(x, z, off) for x, z in pts2d]; vs, fs = [], []
    for i, (p, n) in enumerate(P):
        t = (P[min(i + 1, len(P) - 1)][0] - P[max(i - 1, 0)][0]).normalized()
        sd = n.cross(t).normalized() * (w / 2); vs += [p - sd, p + sd]
    for i in range(len(P) - 1): fs.append([2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2])
    return vs, fs
def line_on_face(B, pts2d, w, mat, off=DO):
    v, f = ribbon_on_face(pts2d, w, off); B.add(v, f, mat, ['head'])
    for x, z in (pts2d[0], pts2d[-1]):   # 圓圓的筆畫頭尾
        v, f = disc_on_face(x, z, w / 2, w / 2, off, 10, 1); B.add(v, f, mat, ['head'])
for k in (1, -1):
    line_on_face(fc, arc2d(LX * k, LZ + 0.01, 0.062, D(200), D(340), sy=0.9), 0.024, 'face_line')    # 閉著的笑眼
    v, f = disc_on_face(0.37 * k, -0.17, 0.095, 0.07); fc.add(v, f, 'blush', ['head']); fd.add(v, f, 'blush', ['head'])
    v, f = disc_on_face(LX * k, LZ, 0.05, 0.062); fd.add(v, f, 'face_line', ['head'])               # 圓圓的黑眼睛
for B in (fc, fd):
    line_on_face(B, arc2d(0.0, -0.205, 0.075, D(205), D(335), sy=0.75), 0.022, 'face_line')        # 微笑
    v, f = disc_on_face(0.0, -0.095, 0.05, 0.042, DO * 1.5); B.add(v, f, 'nose', ['head'])         # 鼻子：一小塊粉紅
PARTS += [(fc.build('Face_smile', ['face_line', 'blush', 'nose']), fc), (fd.build('Face_dot', ['face_line', 'blush', 'nose']), fd)]
for ob in (ob_gl,): ob.visible_shadow = False   # 只影響預覽渲染：細框的影子印在臉上很髒

# ---------------- 骨架 + 權重 ----------------
arm_data = bpy.data.armatures.new('Boy_Rig')
ob_arm = bpy.data.objects.new('Boy_Rig', arm_data); scene.collection.objects.link(ob_arm)
bpy.context.view_layer.objects.active = ob_arm
bpy.ops.object.mode_set(mode='EDIT')
eb = {}
for name, h, t, par, con in BONES:
    b = arm_data.edit_bones.new(name); b.head = h; b.tail = t; b.roll = 0
    if par: b.parent = eb[par]; b.use_connect = con
    eb[name] = b
# 四肢的 roll 讓局部 X 軸都是左右方向，前後擺動 = 繞 X 轉
for name in eb:
    if name not in ('root',):
        eb[name].align_roll(Vector((0, -1, 0)) if name in ('hips', 'spine', 'head') else Vector((0, -1, 0)))
bpy.ops.object.mode_set(mode='OBJECT')

def skin_object(ob, builder):
    for name, *_ in BONES:
        ob.vertex_groups.new(name=name)
    vg = {g.name: g for g in ob.vertex_groups}
    for i, (p, bones) in enumerate(zip(builder.v, builder.vb)):
        if callable(bones):
            ws = bones(p)
        elif len(bones) == 1:
            ws = {bones[0]: 1.0}
        else:
            d = {b: seg_dist(p, BMAP[b][1], BMAP[b][2]) for b in bones}
            ws = {b: 1 / (x ** 4 + 1e-6) for b, x in d.items()}
        tot = sum(ws.values())
        for b, w in ws.items():
            if w / tot > 1e-3: vg[b].add([i], w / tot, 'REPLACE')
    ob.parent = ob_arm
    m = ob.modifiers.new('Armature', 'ARMATURE'); m.object = ob_arm

for ob, bl in PARTS:
    skin_object(ob, bl)
# 身體和衣服加一層細分，再讓骨架變形（細分在骨架之前）
for ob in SUBDIV:
    sub = ob.modifiers.new('Subdivision', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_move_to_index(modifier='Subdivision', index=0)

# ---------------- 動作：idle、walk（24 fps、1 秒循環） ----------------
for pb in ob_arm.pose.bones: pb.rotation_mode = 'XYZ'

def make_action(name, fn):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    ob_arm.animation_data_create(); ob_arm.animation_data.action = act
    for fr in range(1, 26):
        ph = 2 * math.pi * (fr - 1) / 24
        for pb in ob_arm.pose.bones:
            pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
        fn(ph)
        for pb in ob_arm.pose.bones:
            if pb.name == 'root': continue
            pb.keyframe_insert('rotation_euler', frame=fr, group=pb.name)
            if pb.name in ('hips', 'leg.L', 'leg.R'):
                pb.keyframe_insert('location', frame=fr, group=pb.name)
    act.use_frame_range = True; act.frame_start = 1; act.frame_end = 25
    return act

P = ob_arm.pose.bones
def idle(ph):
    s = math.sin(ph)
    P['hips'].location.y = 0.006 * s                     # 上下微微起伏
    P['spine'].rotation_euler.x = D(1.8) * s             # 呼吸
    P['head'].rotation_euler.z = D(3.0) * math.sin(ph + 0.6)
    P['head'].rotation_euler.y = D(2.5) * math.sin(ph)
    P['head'].rotation_euler.x = D(-1.5) * s
    for side, k in (('L', 1), ('R', -1)):
        P[f'upper_arm.{side}'].rotation_euler.y = D(2.5) * s * k
        P[f'lower_arm.{side}'].rotation_euler.x = D(3) * s

SW, AS = D(28), D(24)
def walk(ph):
    s, c = math.sin(ph), math.cos(ph)
    P['hips'].location.y = -0.05 * s * s                           # 兩腳張開時身體往下、交會時回到原高度
    P['hips'].rotation_euler.y = D(6) * s                          # 左右晃
    P['spine'].rotation_euler.y = D(-4) * s
    P['spine'].rotation_euler.x = D(4)                             # 小小前傾
    P['head'].rotation_euler.y = D(-3) * s
    P['head'].rotation_euler.x = D(-4)
    for side, k in (('L', 1), ('R', -1)):
        sw = k * s
        P[f'leg.{side}'].rotation_euler.x = SW * sw                  # 正值 = 腳往前
        lift = max(0.0, k * c)                                       # 往前跨的那隻腳：抬大腿、彎膝蓋
        P[f'leg.{side}'].rotation_euler.x = SW * sw + D(16) * lift
        P[f'shin.{side}'].rotation_euler.x = -D(58) * lift
        P[f'foot.{side}'].rotation_euler.x = -SW * sw * 0.8 + D(34) * lift
        P[f'leg.{side}'].location.y = -0.02 * lift
        P[f'upper_arm.{side}'].rotation_euler.x = -AS * sw
        P[f'lower_arm.{side}'].rotation_euler.x = -D(10) - D(6) * sw

A_IDLE = make_action('idle', idle)
A_WALK = make_action('walk', walk)
# 把兩個動作都擺進 NLA（匯出器會個別輸出），骨架回到 rest pose
for act in (A_IDLE, A_WALK):
    tr = ob_arm.animation_data.nla_tracks.new(); tr.name = act.name
    st = tr.strips.new(act.name, 1, act); tr.mute = True
ob_arm.animation_data.action = None
for pb in ob_arm.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)

# ---------------- 匯出 GLB ----------------
bpy.ops.object.select_all(action='DESELECT')
for ob in [ob_arm] + [p[0] for p in PARTS]: ob.select_set(True)
bpy.context.view_layer.objects.active = ob_arm
glb = os.path.join(OUT, 'char.glb')
kw = dict(filepath=glb, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
          export_animations=True, export_skins=True, export_animation_mode='ACTIONS')
try:
    bpy.ops.export_scene.gltf(**kw)
except TypeError as e:
    print('gltf kw fallback:', e); kw.pop('export_animation_mode'); bpy.ops.export_scene.gltf(**kw)

# 三角形數（套用細分之後）
dg = bpy.context.evaluated_depsgraph_get(); tris = 0
for ob in [p[0] for p in PARTS]:
    me = ob.evaluated_get(dg).to_mesh(); me.calc_loop_triangles(); n = len(me.loop_triangles); tris += n
    print('TRIS', ob.name, n); ob.evaluated_get(dg).to_mesh_clear()
print('TRIS total', tris, 'GLB bytes', os.path.getsize(glb))

if os.environ.get('NO_RENDER'):
    bpy.ops.wm.save_as_mainfile(filepath=BLEND); print('DONE', OUT); sys.exit(0)
# ---------------- 預覽渲染：暖米色背景、柔光 ----------------
for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT', 'BLENDER_WORKBENCH'):
    try: scene.render.engine = eng; break
    except TypeError: pass
print('ENGINE', scene.render.engine)
scene.render.resolution_x = scene.render.resolution_y = 900
scene.render.film_transparent = False
try: scene.view_settings.view_transform = 'Standard'
except TypeError: pass
try: scene.eevee.taa_render_samples = 48
except Exception: pass
for attr in ('use_shadows', 'use_gtao', 'use_soft_shadows'):
    try: setattr(scene.eevee, attr, True)
    except Exception: pass

world = bpy.data.worlds.new('cream'); scene.world = world
try: world.use_nodes = True
except Exception: pass
wn = world.node_tree; wn.nodes.clear()
lp = wn.nodes.new('ShaderNodeLightPath'); mix = wn.nodes.new('ShaderNodeMixShader')
bg_cam = wn.nodes.new('ShaderNodeBackground'); bg_cam.inputs[0].default_value = lin('#f4f1e2'); bg_cam.inputs[1].default_value = 1.0
bg_amb = wn.nodes.new('ShaderNodeBackground'); bg_amb.inputs[0].default_value = lin('#fff6e8'); bg_amb.inputs[1].default_value = 0.75
out = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(lp.outputs['Is Camera Ray'], mix.inputs[0])
wn.links.new(bg_amb.outputs[0], mix.inputs[1]); wn.links.new(bg_cam.outputs[0], mix.inputs[2])
wn.links.new(mix.outputs[0], out.inputs[0])

def light(name, kind, loc, energy, size=None, angle=None, col='#ffffff'):
    ld = bpy.data.lights.new(name, kind); ld.energy = energy; ld.color = lin(col)[:3]
    if size is not None: ld.size = size
    if angle is not None: ld.angle = angle
    lo = bpy.data.objects.new(name, ld); scene.collection.objects.link(lo); lo.location = loc
    d = Vector((0, 0, 1.1)) - Vector(loc); lo.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return lo
light('key', 'SUN', (-4, -6, 7), 2.2, angle=D(25), col='#fff3e0')
light('fill', 'AREA', (6, -4, 3), 250, size=5, col='#eef2ff')
light('rim', 'AREA', (0, 6, 5), 200, size=4)

# 地面：一圈淺一點的米色圓盤，看得到腳底貼地的影子
bpy.ops.mesh.primitive_circle_add(vertices=64, radius=2.2, fill_type='NGON', location=(0, 0, 0))
gnd = bpy.context.active_object; gnd.name = 'ground'
gm = make_mat('ground', '#ece6cf'); gnd.data.materials.append(gm)

cam_d = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_d); scene.collection.objects.link(cam); scene.camera = cam
def shoot(fname, azim, elev, dist, target, lens=70):
    a, e = D(azim), D(elev)
    pos = Vector(target) + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
    cam.location = pos; cam_d.lens = lens
    cam.rotation_euler = (Vector(target) - pos).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(OUT, fname)
    bpy.ops.render.render(write_still=True)

shoot('preview-front.png', 0, 8, 7.2, (0, 0, 1.12))
shoot('preview-34.png', -38, 12, 7.2, (0, 0, 1.12))
shoot('preview-side.png', 90, 6, 7.2, (0, 0, 1.12))
shoot('preview-back.png', 180, 10, 7.2, (0, 0, 1.12))
shoot('preview-face.png', -14, 6, 3.4, (0, 0, 1.6))
# 自己檢查用：走路動作的兩個關鍵影格
if os.environ.get('BOY_WALKCHECK'):
    ob_arm.animation_data.action = A_WALK
    for fr in (4, 7, 13):
        scene.frame_set(fr); shoot(f'check-walk-{fr}.png', 90, 8, 7.2, (0, 0, 1.12))
    ob_arm.animation_data.action = None; scene.frame_set(1)
    for pb in ob_arm.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)

bpy.ops.wm.save_as_mainfile(filepath=BLEND)
print('DONE', OUT)
