"""
Genera assets/brand/ball-sprite.png: il pallone bianco 3D della schermata di caricamento,
36 fotogrammi di una rotazione completa in una griglia 6x6 (usata da src/components/BallSprite.tsx).

Uso: python3 scripts/ball-sprite.py   (richiede solo Pillow)
"""
import math
from pathlib import Path
from PIL import Image

FRAME = 180          # lato di un fotogramma in px (pallone a ~60pt @3x)
SS = 2               # sovracampionamento per bordi e cuciture lisce
COLS = ROWS = 6
FRAMES = COLS * ROWS
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'brand' / 'ball-sprite.png'

# pallone bianco: lievi differenze di tono tra i pannelli, come la pelle vera
W1, W2, W3 = (246, 244, 238), (238, 236, 229), (242, 240, 233)
# 6 facce (+X, -X, +Y, -Y, +Z, -Z) da 3 pannelli, ognuna perpendicolare alle vicine
FACES = [[W1, W2, W3], [W3, W1, W2], [W2, W3, W1], [W1, W3, W2], [W3, W2, W1], [W2, W1, W3]]
Q, STRIP = math.pi / 4, math.pi / 12


def norm(v):
    l = math.sqrt(sum(c * c for c in v))
    return [c / l for c in v]


def smooth(e, v):
    t = max(0.0, min(1.0, v / e))
    return t * t * (3 - 2 * t)


L = norm([-0.45, -0.6, 0.66])
H = norm([L[0], L[1], L[2] + 1])
AXIS = norm([0.35, 1, 0.25])

# normali e luce: la luce resta ferma, ruota solo il pallone
N = FRAME * SS
pixels = []
for j in range(N):
    for i in range(N):
        x, y = (i + 0.5) / N * 2 - 1, (j + 0.5) / N * 2 - 1
        r2 = x * x + y * y
        if r2 >= 1:
            continue
        z = math.sqrt(1 - r2)
        dif = max(0.0, x * L[0] + y * L[1] + z * L[2])
        spec = max(0.0, x * H[0] + y * H[1] + z * H[2]) ** 70
        edge = min(1.0, (1 - math.sqrt(r2)) * N * 0.5)
        pixels.append((i, j, x, y, z, (0.22 + 0.9 * dif) * (0.7 + 0.3 * z), spec * 0.6 + dif ** 8 * 0.08, edge))


def render(a):
    c, s = math.cos(a), math.sin(a)
    k = 1 - c
    ux, uy, uz = AXIS
    R = [c + ux * ux * k, ux * uy * k - uz * s, ux * uz * k + uy * s,
         uy * ux * k + uz * s, c + uy * uy * k, uy * uz * k - ux * s,
         uz * ux * k - uy * s, uz * uy * k + ux * s, c + uz * uz * k]
    img = Image.new('RGBA', (N, N))
    px = img.load()
    for i, j, x, y, z, lit, spec, edge in pixels:
        X = R[0] * x + R[1] * y + R[2] * z
        Y = R[3] * x + R[4] * y + R[5] * z
        Z = R[6] * x + R[7] * y + R[8] * z
        ax, ay, az = abs(X), abs(Y), abs(Z)
        if ax >= ay and ax >= az:
            f, d, u, v = (0 if X > 0 else 1), ax, Y, Z
        elif ay >= az:
            f, d, u, v = (2 if Y > 0 else 3), ay, Z, X
        else:
            f, d, u, v = (4 if Z > 0 else 5), az, X, Y
        au, av = math.atan2(u, d), math.atan2(v, d)
        strip = 0 if au < -STRIP else 2 if au > STRIP else 1
        # cuciture: bordo della faccia e separazione tra i pannelli
        seam = min(Q - max(abs(au), abs(av)), abs(abs(au) - STRIP))
        groove = 0.45 + 0.55 * smooth(0.045, seam)
        grain = 1 + 0.035 * math.sin(X * 90) * math.sin(Y * 90) * math.sin(Z * 90)
        col = FACES[f][strip]
        m, sp = lit * groove * grain, spec * 255 * groove
        px[i, j] = (min(255, int(col[0] * m + sp)), min(255, int(col[1] * m + sp)), min(255, int(col[2] * m + sp)), int(255 * edge))
    return img.resize((FRAME, FRAME), Image.LANCZOS)


sheet = Image.new('RGBA', (FRAME * COLS, FRAME * ROWS))
for n in range(FRAMES):
    sheet.paste(render(2 * math.pi * n / FRAMES), ((n % COLS) * FRAME, (n // COLS) * FRAME))
# palette a 256 colori: il pallone è quasi monocromo, il file pesa molto meno
sheet = sheet.quantize(256, method=Image.Quantize.LIBIMAGEQUANT, dither=Image.Dither.FLOYDSTEINBERG)
sheet.save(OUT, optimize=True)
print(OUT, sheet.size)
