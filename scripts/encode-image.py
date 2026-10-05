#!/usr/bin/env python3
"""Bir duvar kağıdı görselini, görsel temaların kullandığı küçük veri dosyasına çevirir.

Görsel 320x180'e (ya da --size ile verilen boyuta) küçültülür, 96 renge indirilir ve palet + piksel indeksleri base64 olarak
<dizin>/<id>.data.js dosyasına yazılır (dizin depo köküne göre; varsayılan: packs/hyprland/js/hypr). Temanın
davranışı (efektler, metinler) ayrı tutulur, ör. packs/hyprland/js/hypr.js.

Kullanım: python3 scripts/encode-image.py <görsel> <tema-kimliği> [--dir packs/anime/js/light] [--size 640x360] [--erase x0,y0,x1,y1 ...] [--mask maske.png]
--erase: canlı çizilecek bölgeleri (0..1 oranlarıyla) arka plan rengiyle siler.
--mask: görselle aynı boyutta siyah-beyaz maske; piksel başına bir bit olarak `mask` alanına yazılır (beyaz = 1).
Tema bunu canlı çizilecek bölgeleri ayırmak için kullanır (ör. packs/anime/js/sunny.js).
Gerekenler: pip install pillow
"""
import argparse
import base64
import pathlib
from PIL import Image, ImageDraw, ImageFilter

Image.MAX_IMAGE_PIXELS = None
W, H, COLORS = 320, 180, 96

ap = argparse.ArgumentParser()
ap.add_argument("image")
ap.add_argument("id")
ap.add_argument("--dir", default="packs/hyprland/js/hypr", help="çıktı dizini (depo köküne göre)")
ap.add_argument("--size", default=f"{W}x{H}", help="16:9 hedef boyut, ör. 640x360 (yüzlü görsellerde daha çok ayrıntı)")
ap.add_argument("--erase", action="append", default=[], help="x0,y0,x1,y1 (0..1)")
ap.add_argument("--erase-ring", action="append", default=[], help="cx,cy,r0,r1: halka (merkez 0..1, yarıçap yüksekliğe oranla)")
ap.add_argument("--mask", default=None, help="görselle aynı boyutta siyah-beyaz maske (beyaz = 1)")
ap.add_argument("--fill", default=None, help="silinen bölgenin rengi, ör. 0e0f12 (varsayılan: sol üst köşe)")
args = ap.parse_args()
W, H = (int(v) for v in args.size.lower().split("x"))

src = Image.open(args.image)
if src.mode not in ("RGB", "RGBA"):
    src = src.convert("RGBA")
if src.mode == "RGBA":
    flat = Image.new("RGB", src.size, (0, 0, 0))
    flat.paste(src, mask=src.split()[3])
    src = flat
img = src.convert("RGB")

# 16:9'a ortadan kırp
def fit(im, resample):
    ratio = W / H
    if im.width / im.height > ratio:
        nw = round(im.height * ratio)
        im = im.crop(((im.width - nw) // 2, 0, (im.width - nw) // 2 + nw, im.height))
    else:
        nh = round(im.width / ratio)
        im = im.crop((0, (im.height - nh) // 2, im.width, (im.height - nh) // 2 + nh))
    return im.resize((W, H), resample)


img = fit(img, Image.LANCZOS)
# Karakterlere dönüşünce kaybolan ayrıntıyı biraz öne çıkar
img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=2))

if args.erase or args.erase_ring:
    fill = tuple(int(args.fill[i:i + 2], 16) for i in (0, 2, 4)) if args.fill else img.getpixel((2, 2))
    draw = ImageDraw.Draw(img)
    for box in args.erase:
        x0, y0, x1, y1 = (float(v) for v in box.split(","))
        draw.rectangle((x0 * W, y0 * H, x1 * W, y1 * H), fill=fill)
    for spec in args.erase_ring:
        cx, cy, r0, r1 = (float(v) for v in spec.split(","))
        cx, cy, r0, r1 = cx * W, cy * H, r0 * H, r1 * H
        for y in range(H):
            for x in range(W):
                if r0 <= ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2) ** 0.5 <= r1:
                    img.putpixel((x, y), fill)

q = img.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
pal = q.getpalette()[: COLORS * 3]
palette = "".join(f"{v:02x}" for v in pal)
pixels = base64.b64encode(q.tobytes()).decode()
mask = ""
if args.mask:
    m = fit(Image.open(args.mask).convert("L"), Image.BILINEAR).point(lambda v: 255 if v >= 128 else 0).convert("1")
    mask = f'  mask: "{base64.b64encode(m.tobytes()).decode()}",\n'

out = pathlib.Path(__file__).resolve().parent.parent / args.dir / f"{args.id}.data.js"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(
    "// Otomatik üretildi: scripts/encode-image.py — elle düzenleme\n"
    f'(globalThis.AW.imageData = globalThis.AW.imageData || {{}})["{args.id}"] = {{\n'
    f"  w: {W}, h: {H},\n"
    f'  palette: "{palette}",\n'
    f'  pixels: "{pixels}",\n'
    f"{mask}"
    "};\n"
)
print(f"{out} ({out.stat().st_size // 1024} KB)")
