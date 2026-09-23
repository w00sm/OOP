# 로딩 화면 캐릭터 시트 가공 스크립트
# design/character-sheet-original.png(구간 라벨이 있는 원본)에서 15컷을 잘라
# 종이 배경·라벨을 지우고, 발끝 기준으로 정렬한 투명 스프라이트 시트를 만듭니다.
# 실행: python3 scripts/slice-character-sheet.py design/character-sheet-original.png public/loading/character-sheet.png
# (필요: pip install pillow numpy scipy)
# 주의: LABELS·CLIP_ABOVE·ROW/COL_CENTERS 좌표는 현재 원본 이미지 기준이라, 원본을 바꾸면 다시 맞춰야 합니다.

from PIL import Image
import numpy as np
from scipy import ndimage as nd
import sys

src, out = sys.argv[1], sys.argv[2]
g = np.array(Image.open(src).convert("L")).astype(float)
ink = g < 170
lab, n = nd.label(nd.binary_dilation(ink, iterations=6))
objs = nd.find_objects(lab)

LABELS = {(24,60,93,127),(29,59,9,100),(205,249,12,146),(470,508,28,106),
          (626,668,60,169),(634,672,24,61),(808,852,139,176),(816,850,62,144),(817,855,23,62)}
ROW_CENTERS = [140, 340, 540, 730, 920]
COL_CENTERS = [140, 410, 650]

cells = {}
for i, s in enumerate(objs):
    box = (s[0].start, s[0].stop, s[1].start, s[1].stop)
    if box in LABELS: continue
    comp = lab == i + 1
    if (ink & comp).sum() < 15: continue
    cy, cx = (box[0] + box[1]) / 2, (box[2] + box[3]) / 2
    r = int(np.argmin([abs(cy - c) for c in ROW_CENTERS]))
    c = int(np.argmin([abs(cx - c) for c in COL_CENTERS]))
    cells.setdefault((r, c), np.zeros_like(ink))
    cells[(r, c)] |= comp

# 잉크 진하기 → 불투명도 (종이색은 투명, 선은 진하게, 경계는 부드럽게)
PAPER, INK = 232.0, 70.0
alpha_full = np.clip((PAPER - g) / (PAPER - INK), 0, 1)
INK_RGB = (7, 20, 38)  # 앱 글자색 #071426

# 라벨 글씨가 머리와 붙어 한 덩어리로 잡힌 칸: 이 y보다 위는 지움 (41~60% 첫 컷의 "60%")
CLIP_ABOVE = {(2, 0): 504}
for key, y in CLIP_ABOVE.items():
    cells[key][:y, :] = False

frames = {}
for (r, c), mask in cells.items():
    region = nd.binary_dilation(mask, iterations=2)
    if (r, c) in CLIP_ABOVE:
        region[: CLIP_ABOVE[(r, c)], :] = False
    ys, xs = np.where(region & (alpha_full > 0.05))
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    a = (alpha_full * region)[y0:y1, x0:x1]
    rgba = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    rgba[..., :3] = INK_RGB
    rgba[..., 3] = (a * 255).astype(np.uint8)
    frames[(r, c)] = Image.fromarray(rgba, "RGBA")

assert len(frames) == 15, len(frames)
PAD = 10
W = max(f.width for f in frames.values()) + PAD * 2
H = max(f.height for f in frames.values()) + PAD * 2
sheet = Image.new("RGBA", (W * 3, H * 5), (0, 0, 0, 0))
for (r, c), f in frames.items():
    # 벽에 기댄 구간(21~40%)은 벽 모서리(왼쪽 아래) 기준, 나머지는 발끝(가운데 아래) 기준
    x = PAD if r == 1 else (W - f.width) // 2
    y = H - PAD - f.height
    sheet.paste(f, (c * W + x, r * H + y), f)
sheet.save(out, optimize=True)
print("cell", W, H, "sheet", sheet.size)
