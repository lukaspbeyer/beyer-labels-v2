"""Erzeugt die Lärchen-Plattentextur für /holz aus einem Foto gehobelter Lärchenbretter.

Aufruf: python3 scripts/build-larch-texture.py <foto> [--rotate GRAD]

Das Foto wird gedreht, die in CROPS angegebenen Brettbereiche werden ausgeschnitten,
die Beleuchtung wird ausgeglichen und die Bretter werden als Lamellen zu einer Platte
gestapelt (Faser waagerecht). Ausgabe nach static/textures/:
  laerche-farbe.jpg     Farbbild der Platte
  laerche-spaetholz.jpg Spätholzanteil je Pixel (hell = Spätholz)
Größe und Lamellenlage gehören in src/lib/utils/wood/calibration.json (woodTexture).
Benötigt Pillow und NumPy.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# Brettbereiche im gedrehten Foto (x0, y0, x1, y1) und ob die Lamelle um 180° gedreht wird.
# Jedes Brett kommt zweimal vor, die Kopie gedreht und möglichst weit entfernt.
CROPS = [
    ((14, 462, 860, 700), False),  # Brett C: stehende Jahrringe
    ((14, 32, 860, 190), False),   # Brett A: helles Splintholz
    ((14, 238, 860, 362), False),  # Brett B: Fladerung
    ((14, 462, 860, 700), True),
    ((14, 238, 860, 362), True),
    ((14, 32, 860, 190), True),
]
OUT = Path(__file__).resolve().parent.parent / 'static' / 'textures'


def blur(a: np.ndarray, sigma: float) -> np.ndarray:
    """Gaußfilter, getrennt nach Achsen, Ränder gespiegelt."""
    r = int(3 * sigma)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    for axis in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[axis] = (r, r)
        p = np.pad(a, pad, mode='reflect')
        a = np.apply_along_axis(lambda v: np.convolve(v, k, mode='valid'), axis, p)
    return a


def flatten_light(rgb: np.ndarray, sigma: float) -> np.ndarray:
    """Teilt großflächige Helligkeitsverläufe heraus, Farbe und Maserung bleiben."""
    lum = rgb.mean(axis=2)
    low = blur(lum, sigma)
    gain = lum.mean() / np.maximum(low, 1.0)
    return np.clip(rgb * gain[..., None], 0, 255)


def latewood(rgb: np.ndarray) -> np.ndarray:
    """Spätholz ist dunkler als seine Umgebung: lokaler Helligkeitsabfall, 0..1."""
    lum = blur(rgb @ np.array([0.299, 0.587, 0.114]), 1.2)
    local = blur(lum, 14)
    d = (local - lum) / np.maximum(local, 1.0)
    return np.clip(0.5 + d / 0.2, 0, 1)


def main() -> None:
    src = Path(sys.argv[1])
    angle = float(sys.argv[sys.argv.index('--rotate') + 1]) if '--rotate' in sys.argv else -1.6
    photo = Image.open(src).convert('RGB').rotate(angle, resample=Image.BICUBIC)
    lamellae, rows, y = [], [], 0
    for (box, mirror) in CROPS:
        part = np.asarray(photo.crop(box)).astype(np.float64)
        part = flatten_light(part, 60)
        if mirror:
            part = part[::-1, ::-1]
        lamellae.append(part)
        rows.append((y, y + part.shape[0]))
        y += part.shape[0]
    plate = np.concatenate(lamellae, axis=0)
    # Leimfuge: eine Pixelzeile leicht abgedunkelt
    for (start, _end) in rows[1:]:
        plate[start] *= 0.82
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(plate.astype(np.uint8)).save(OUT / 'laerche-farbe.jpg', quality=90)
    Image.fromarray((latewood(plate) * 255).astype(np.uint8), mode='L').save(OUT / 'laerche-spaetholz.jpg', quality=85)
    print('Größe', plate.shape[1], 'x', plate.shape[0], 'px')
    print('Lamellen (y0, y1):', rows)


if __name__ == '__main__':
    main()
