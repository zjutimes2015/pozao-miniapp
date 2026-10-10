#!/usr/bin/env python3
"""
gen_icons.py — TabBar 图标生成
沿用《猫在家》的 SDF 生成方案，坑位已规避：
  1. 轮廓绘制 min 计算前先取abs
  2. 伪SDF 内部深度不足会变实心 —— 对 rhombus 等形状改用显式距离函数

生成 81×81 PNG（微信 TabBar 标准尺寸），透明背景。
"""
import math
import struct
import zlib
import os

SIZE = 81
SCALE = 4  # 超采样倍数，用于抗锯齿


def write_png(path, pixels, w, h):
    """写 RGBA PNG"""
    raw = b''
    for y in range(h):
        raw += b'\x00'  # filter type 0
        for x in range(w):
            r, g, b, a = pixels[y][x]
            raw += bytes([r, g, b, a])

    def chunk(typ, data):
        c = struct.pack('>I', len(data)) + typ + data
        c += struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff)
        return c

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def sd_circle(px, py, cx, cy, r):
    return math.hypot(px - cx, py - cy) - r


def sd_ring(px, py, cx, cy, r, thickness):
    d = abs(math.hypot(px - cx, py - cy) - r) - thickness / 2
    return d


def sd_line(px, py, x1, y1, x2, y2, thickness):
    """点到线段的距离 —— 先取 abs 再参与 min，规避踩过的坑"""
    dx, dy = x2 - x1, y2 - y1
    L2 = dx * dx + dy * dy
    if L2 == 0:
        return math.hypot(px - x1, py - y1) - thickness / 2
    t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / L2))
    cx, cy = x1 + t * dx, y1 + t * dy
    return math.hypot(px - cx, py - cy) - thickness / 2


def sd_box(px, py, cx, cy, w, h):
    dx = abs(px - cx) - w / 2
    dy = abs(py - cy) - h / 2
    return math.hypot(max(dx, 0), max(dy, 0)) + min(max(dx, dy), 0)


# ============ 各图标形状定义 ============
# 统一坐标系 0-1，基于81px 画布

def shape_solo(x, y):
    """单闯：一条推理链 + 两个节点 + 断点标记"""
    # 上下两个节点
    d1 = sd_circle(x, y, 0.5, 0.26, 0.115)
    d2 = sd_circle(x, y, 0.5, 0.74, 0.115)
    # 连接线
    d3 = sd_line(x, y, 0.5, 0.40, 0.5, 0.60, 0.075)
    # 断点：中间横向短横，强调"在这里断了"
    d4 = sd_line(x, y, 0.36, 0.50, 0.64, 0.50, 0.070)
    d = min(d1, d2, d3, d4)
    return d


def shape_versus(x, y):
    """对攻：两个相向的箭头"""
    # 左侧箭头
    d1 = sd_line(x, y, 0.24, 0.5, 0.44, 0.5, 0.085)
    # 左箭头头部（rhombus，用显式距离避免实心）
    dx = abs(x - 0.40) + abs(y - 0.5) - 0.11
    d2 = math.hypot(max(dx, 0), max(dy_fix := (abs(y - 0.5) - 0.11), 0)) + min(max(dx, dy_fix), 0)
    d = min(d1, d2)
    # 右侧箭头
    d3 = sd_line(x, y, 0.76, 0.5, 0.56, 0.5, 0.085)
    dx2 = abs(x - 0.60) + abs(y - 0.5) - 0.11
    d4 = math.hypot(max(dx2, 0), max(abs(y - 0.5) - 0.11, 0)) + min(max(dx2, abs(y - 0.5) - 0.11), 0)
    d = min(d, d3, d4)
    return d


def shape_train(x, y):
    """训练：刻度线（不做进度条，做能力刻度）"""
    d = sd_line(x, y, 0.5, 0.22, 0.5, 0.78, 0.075)
    # 三根刻度
    d = min(d, sd_line(x, y, 0.30, 0.34, 0.44, 0.34, 0.055))
    d = min(d, sd_line(x, y, 0.30, 0.50, 0.40, 0.50, 0.055))
    d = min(d, sd_line(x, y, 0.30, 0.66, 0.46, 0.66, 0.055))
    return d


def shape_profile(x, y):
    """我的：人形轮廓（头 + 肩），线条式"""
    d1 = sd_ring(x, y, 0.5, 0.34, 0.13, 0.075)
    d = d1
    # 肩部弧线：用两段折线近似
    d2 = sd_line(x, y, 0.26, 0.74, 0.34, 0.60, 0.075)
    d3 = sd_line(x, y, 0.74, 0.74, 0.66, 0.60, 0.075)
    d = min(d, d2, d3)
    return d


SHAPES = {
    'solo': shape_solo,
    'versus': shape_versus,
    'train': shape_train,
    'profile': shape_profile,
}


def render(shape_fn, size=SIZE, ss=SCALE, color=(28, 28, 26)):
    """超采样渲染，返回像素矩阵

    关键修正：每个超采样点只取一个覆盖值，不做累加。
    累加会让重叠区域（如两片卡叠在一起）饱和成实心方块。
    """
    hi = size * ss
    pixels = [[(0, 0, 0, 0)] * size for _ in range(size)]

    for y in range(size):
        for x in range(size):
            hits = 0
            for sy in range(ss):
                py = (y * ss + sy + 0.5) / hi
                for sx in range(ss):
                    px = (x * ss + sx + 0.5) / hi
                    d = shape_fn(px, py) * size
                    # 以 1px 宽度做线性过渡（抗锯齿）
                    if d < 0.5:
                        hits += 1
            if hits > 0:
                alpha = int(hits / (ss * ss) * 255)
                pixels[y][x] = (color[0], color[1], color[2], alpha)

    return pixels


def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons')
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    INACTIVE = (139, 138, 133)   # #8B8A85 未选中灰
    ACTIVE = (28, 28, 26)        # #1C1C1A 选中深

    for name, fn in SHAPES.items():
        pixels_a = render(fn, color=ACTIVE)
        write_png(os.path.join(out_dir, f'{name}-active.png'), pixels_a, SIZE, SIZE)
        print(f'  ✓ {name}-active.png')

        pixels_i = render(fn, color=INACTIVE)
        write_png(os.path.join(out_dir, f'{name}.png'), pixels_i, SIZE, SIZE)
        print(f'  ✓ {name}.png')

    print(f'\n图标已生成至 {out_dir}')
    print(f'尺寸 {SIZE}×{SIZE}，超采样 {SCALE}×')


if __name__ == '__main__':
    main()