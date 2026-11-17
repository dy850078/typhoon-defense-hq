# 冰龍之翼 3D 模型（右翼）。用法：python build_wing.py <繪師 PNG> <輸出 glb>
# 座標：以繪師那張 302x259 的圖為準，支點 (18,164)，100px = 1 單位；X 往外、Z 往上、Y 是前後厚度。
import sys, math
import numpy as np
import bpy, bmesh
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt
from PIL import Image, ImageFilter

ART, OUT = [a for a in sys.argv if not a.startswith('--')][-2:]
P = lambda x, y: ((x - 18) / 100.0, (164 - y) / 100.0)

# ---- 輪廓與骨頭（圖上的像素座標）----
ARM = [(8, 162), (40, 150), (66, 136), (86, 116), (100, 86), (109, 55), (117, 32)]          # 翅根 → 頂點
LEAD = [(117, 32), (150, 33), (190, 52), (225, 86), (254, 130), (277, 172), (288, 200)]     # 頂點 → 翅尖（最粗的主骨）
F1 = [(122, 38), (136, 80), (158, 135), (180, 182), (204, 240)]                             # 指骨
F2 = [(96, 120), (112, 160), (128, 198), (136, 217)]
F3 = [(88, 127), (100, 158), (117, 192)]
F0 = [(132, 36), (168, 78), (205, 128), (240, 176), (262, 200)]                             # 靠主骨的細指骨
BOTTOM = [(288, 200), (262, 200), (236, 190), (212, 182), (204, 240), (196, 205), (178, 180), (150, 178),
          (136, 217), (128, 196), (124, 183), (117, 192), (100, 188), (86, 186), (75, 200), (66, 186), (46, 183), (31, 191), (22, 172), (8, 162)]
OUTLINE = [P(*p) for p in ARM + LEAD[1:] + BOTTOM[1:-1]]
BONES = {'arm': ARM, 'lead': LEAD, 'f1': F1, 'f2': F2, 'f3': F3, 'f0': F0}
PEAK = np.array(P(117, 32))

def smooth(pts, n=40):  # Catmull-Rom 把折線變圓滑
    p = np.array([P(*q) for q in pts], float); p = np.vstack([2 * p[0] - p[1], p, 2 * p[-1] - p[-2]]); out = []
    seg = len(p) - 3
    for i in range(n + 1):
        u = i / n * seg; k = min(int(u), seg - 1); t = u - k; a, b, c, d = p[k], p[k + 1], p[k + 2], p[k + 3]
        out.append(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3))
    return np.array(out)
CURVES = {k: smooth(v) for k, v in BONES.items()}
ALLB = np.vstack(list(CURVES.values()))

def bone_dist(x, z):
    return float(np.min(np.hypot(ALLB[:, 0] - x, ALLB[:, 1] - z)))

def depth(x, z, d=None):
    """翼膜的前後起伏：整片往後彎、骨頭之間鼓起來、從頂點放射出去的皺褶。"""
    if d is None: d = bone_dist(x, z)
    cup = -0.10 * (x / 2.7) ** 2 * 2.7 + 0.05 * math.sin(max(z, -0.8) * 1.2)          # 整體弧度
    k = min(d / 0.26, 1.0); billow = -0.2 * (k * k * (3 - 2 * k))                      # 指骨之間往後鼓
    ang = math.atan2(z - PEAK[1], x - PEAK[0]); r = math.hypot(x - PEAK[0], z - PEAK[1])
    pw = math.sin(ang * 26.0) * min(r / 0.6, 1.0) * (0.3 + 0.7 * k); pleat = 0.075 * pw   # 放射狀皺褶
    sag = 0.03 * math.sin(r * 9.0 + ang * 3.0) * k                                      # 橫向的小波
    depth.pw = pw
    return cup + billow + pleat + sag

# ---- 顏色：取繪師原圖，把米白邊和白線濾掉後抹勻 ----
img = Image.open(ART).convert('RGBA'); A = np.asarray(img).astype(float) / 255.0
rgb, al = A[..., :3], A[..., 3]
mx, mn = rgb.max(-1), rgb.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-3)
mask = ((al > 0.9) & (sat > 0.3) & (mx > 0.18) & ~((mx > 0.8) & (sat < 0.5))).astype(float)   # 淡色的骨頭和白線也濾掉                         # 只留有顏色的翼膜
def blur(a, r): return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float) / 255.0
bm_ = np.maximum(blur(mask, 5), 1e-3); col = np.stack([blur(rgb[..., i] * mask, 5) / bm_ for i in range(3)], -1)
def art_col(x, z):
    px = int(round(np.clip(x * 100 + 18, 0, 301))); py = int(round(np.clip(164 - z * 100, 0, 258))); c = col[py, px]
    c = np.clip((c - 0.5) * 1.15 + 0.5, 0, 1) * np.array([0.92, 0.95, 1.06]); c = np.clip(c, 0, 1); return [c[0] ** 2.2, c[1] ** 2.2, c[2] ** 2.2, 1.0]   # 轉線性色

# ---- Blender 場景 ----
bpy.ops.wm.read_factory_settings(use_empty=True)
def new_obj(name, verts, faces, colors=None, smooth_=True):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if colors is not None:
        ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        for i, c in enumerate(colors): ca.data[i].color = c
    for p in me.polygons: p.use_smooth = smooth_
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob); return ob
def material(name, color=None, vcol=False):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.8
    if vcol:
        n = m.node_tree.nodes.new('ShaderNodeVertexColor'); n.layer_name = 'Col'; m.node_tree.links.new(n.outputs['Color'], b.inputs['Base Color'])
    else: b.inputs['Base Color'].default_value = (*[c ** 2.2 for c in color], 1)
    return m

# 翼膜：輪廓內撒點，三角化後依 depth() 推出起伏
def densify(poly, step=0.035):
    out = []
    for i in range(len(poly)):
        a, b = np.array(poly[i]), np.array(poly[(i + 1) % len(poly)]); n = max(1, int(np.linalg.norm(b - a) / step))
        out += [tuple(a + (b - a) * j / n) for j in range(n)]
    return out
edge = densify(OUTLINE)
def inside(x, z, poly=OUTLINE):
    c = False; n = len(poly)
    for i in range(n):
        (x1, z1), (x2, z2) = poly[i], poly[(i + 1) % n]
        if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1) + x1: c = not c
    return c
E = np.array(edge); pts = list(edge); S = 0.04
for i in range(int(3.0 / S)):
    for j in range(int(2.8 / S)):
        x = -0.15 + i * S + (S / 2 if j % 2 else 0); z = -0.9 + j * S * 0.866
        if inside(x, z) and np.min(np.hypot(E[:, 0] - x, E[:, 1] - z)) > S * 0.55: pts.append((x, z))
nE = len(edge)
res = delaunay_2d_cdt([Vector(p) for p in pts], [(i, (i + 1) % nE) for i in range(nE)], [list(range(nE))], 1, 1e-6)
v2, faces = [tuple(v) for v in res[0]], [tuple(f) for f in res[2]]
verts, cols = [], []
for (x, z) in v2:
    d = bone_dist(x, z); verts.append((x, depth(x, z, d), z))
    c = art_col(x, z); sh = (0.78 + 0.22 * min(d / 0.1, 1.0)) * (1.0 + 0.2 * depth.pw); c = [min(c[i] * sh, 1.0) for i in range(3)] + [1.0]   # 貼骨頭處和皺褶谷底暗一點，脊線亮一點
    cols.append(c)
mem = new_obj('Wing_Membrane', verts, faces, cols)
mem.data.materials.append(material('membrane', vcol=True))
so = mem.modifiers.new('thick', 'SOLIDIFY'); so.thickness = 0.035; so.offset = 0


# 骨頭：沿曲線掃出圓管，粗細由根到尖變化；貼在翼膜正面一點
def tube(name, curve, r0, r1, mat, seg=10, lift=0.0, flat=1.0, joints=(), jw=0.035, jk=0.3):
    n = len(curve); vs, fs = [], []
    for i, (x, z) in enumerate(curve):
        t = i / (n - 1); r = (r0 + (r1 - r0) * t) * (1 + sum(jk * math.exp(-((t - j) / jw) ** 2) for j in joints) - 0.06 * bool(joints))
        a, b = curve[max(i - 1, 0)], curve[min(i + 1, n - 1)]; tx, tz = b[0] - a[0], b[1] - a[1]; L = math.hypot(tx, tz) or 1; nx, nz = -tz / L, tx / L
        y = depth(x, z, 0.0) + lift
        for s in range(seg):
            th = 2 * math.pi * s / seg; vs.append((x + nx * r * math.cos(th), y + r * flat * math.sin(th), z + nz * r * math.cos(th)))
    for i in range(n - 1):
        for s in range(seg):
            a = i * seg + s; b = i * seg + (s + 1) % seg; fs.append((a, b, b + seg, a + seg))
    vs.append((curve[0][0], depth(*curve[0], 0.0) + lift, curve[0][1])); vs.append((curve[-1][0], depth(*curve[-1], 0.0) + lift, curve[-1][1]))
    for s in range(seg): fs.append((len(vs) - 2, (s + 1) % seg, s)); fs.append((len(vs) - 1, (n - 1) * seg + s, (n - 1) * seg + (s + 1) % seg))
    ob = new_obj(name, vs, fs); ob.data.materials.append(mat); return ob
ICE = material('bone_ice', (0.90, 0.96, 1.0)); CREAM = material('bone_cream', (0.97, 0.95, 0.88)); NAVY = material('claw_navy', (0.13, 0.14, 0.42))
parts = [mem,
         tube('Bone_Arm', smooth(ARM, 80), 0.085, 0.10, ICE, seg=12, joints=(0.0, 0.2, 0.42, 0.52, 0.76, 1.0), jw=0.03),
         tube('Bone_Lead', smooth(LEAD, 100), 0.115, 0.07, ICE, seg=12, joints=(0.0, 0.16, 0.32, 0.48, 0.64, 0.8, 0.94), jw=0.022, jk=0.26),
         tube('Bone_F1', smooth(F1, 60), 0.06, 0.034, CREAM, seg=8, joints=(0.0, 0.33, 0.66), jw=0.03),
         tube('Bone_F2', smooth(F2, 50), 0.055, 0.032, CREAM, seg=8, joints=(0.0, 0.5), jw=0.04),
         tube('Bone_F3', smooth(F3, 40), 0.05, 0.03, CREAM, seg=8, joints=(0.0, 0.5), jw=0.04),
         tube('Bone_F0', smooth(F0, 60), 0.048, 0.03, CREAM, seg=8, joints=(0.0, 0.33, 0.66), jw=0.03)]
# 頂點的角、翅尖的爪、主骨上的關節
def cone(name, base, tip, r, mat, bend=0.0):
    b, t = np.array(P(*base)), np.array(P(*tip)); n = 10; cur = []
    for i in range(n + 1):
        u = i / n; p = b + (t - b) * u; perp = np.array([-(t - b)[1], (t - b)[0]]); cur.append(tuple(p + perp * bend * math.sin(u * math.pi)))
    return tube(name, np.array(cur), r, 0.004, mat, seg=10, lift=0.02)
parts.append(cone('Horn', (122, 30), (78, 12), 0.11, NAVY, bend=-0.08))
parts.append(cone('Claw', (280, 196), (268, 250), 0.10, NAVY, bend=0.12))
parts += [cone('Claw_F1', (201, 232), (207, 258), 0.045, NAVY, bend=0.06), cone('Claw_F2', (134, 211), (140, 234), 0.042, NAVY, bend=0.06),
          cone('Claw_F3', (115, 187), (122, 206), 0.038, NAVY, bend=0.06), cone('Claw_F0', (258, 197), (268, 214), 0.036, NAVY, bend=0.06),
          cone('Spur_Elbow', (88, 118), (64, 108), 0.06, NAVY, bend=-0.1), cone('Spur_Lead', (228, 86), (247, 70), 0.05, NAVY, bend=0.12)]
def ball(name, at, r, mat):
    x, z = P(*at); bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=r, location=(x, depth(x, z, 0) + 0.02, z)); ob = bpy.context.object; ob.name = name
    for p in ob.data.polygons: p.use_smooth = True
    ob.data.materials.append(mat); return ob
parts += [ball('Joint_Peak', (118, 32), 0.14, ICE), ball('Joint_Elbow', (92, 122), 0.115, ICE), ball('Joint_Root', (10, 162), 0.09, ICE)]

# 合成一個物件
for o in bpy.context.scene.objects: o.select_set(False)
dg = bpy.context.evaluated_depsgraph_get()
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = mem
for o in parts:
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
bpy.context.view_layer.objects.active = mem
# 骨頭也補上同名的頂點色，合併後才不會掉
for o in parts[1:]:
    if 'Col' not in o.data.color_attributes:
        ca = o.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        for d in ca.data: d.color = (1, 1, 1, 1)
bpy.ops.object.join(); wing = bpy.context.object; wing.name = 'IceWing'

while len(wing.data.uv_layers) > 1: wing.data.uv_layers.remove(wing.data.uv_layers[-1])
uvl = wing.data.uv_layers[0] if wing.data.uv_layers else wing.data.uv_layers.new(name='UVMap')
for lp in wing.data.loops:
    co = wing.data.vertices[lp.vertex_index].co; uvl.data[lp.index].uv = (co.x * 0.33 + 0.08, co.z * 0.33 + 0.35)
# 骨架：翅根一節、外側一節，之後拍動時外側可以多折一點
arm = bpy.data.armatures.new('WingRig'); rig = bpy.data.objects.new('WingRig', arm); bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
b0 = arm.edit_bones.new('wing_root'); b0.head = (0, 0, 0); b0.tail = (1.0, 0, 0.9)
b1 = arm.edit_bones.new('wing_hand'); b1.head = (1.0, 0, 0.9); b1.tail = (2.6, 0, -0.3); b1.parent = b0
bpy.ops.object.mode_set(mode='OBJECT')
g0, g1 = wing.vertex_groups.new(name='wing_root'), wing.vertex_groups.new(name='wing_hand')
for v in wing.data.vertices:
    k = min(max((v.co.x - 0.75) / 0.9, 0), 1); k = k * k * (3 - 2 * k)
    g0.add([v.index], 1 - k, 'REPLACE'); g1.add([v.index], k, 'REPLACE')
wing.parent = rig; md = wing.modifiers.new('rig', 'ARMATURE'); md.object = rig

tris = sum(len(p.vertices) - 2 for p in wing.data.polygons); print('TRIS', tris, 'VERTS', len(wing.data.vertices))
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_vertex_color='ACTIVE', export_all_vertex_colors=True, export_yup=True, export_animations=False)
if '--blend' in sys.argv: bpy.ops.wm.save_as_mainfile(filepath=OUT.replace('.glb', '.blend'))
