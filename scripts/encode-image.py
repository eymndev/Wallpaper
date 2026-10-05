#!/usr/bin/env python3
"""Bir duvar kağıdı görselini, görsel temaların kullandığı küçük veri dosyasına çevirir.

Görsel 320x180'e (ya da --size ile verilen boyuta) küçültülür, 96 renge indirilir ve palet + piksel indeksleri base64 olarak
<dizin>/<id>.data.js dosyasına yazılır (dizin depo köküne göre; varsayılan: packs/hyprland/js/hypr). Temanın
davranışı (efektler, metinler) ayrı tutulur, ör. packs/hyprland/js/hypr.js.

Kullanım: python3 scripts/encode-image.py <görsel> <tema-kimliği> [--dir packs/anime/js/light] [--size 640x360] [--erase x0,y0,x1,y1 ...]
--erase: canlı çizilecek bölgeleri (0..1 oranlarıyla) arka plan rengiyle siler.
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
ratio = W / H
if img.width / img.height > ratio:
    nw = round(img.height * ratio)
    img = img.crop(((img.width - nw) // 2, 0, (img.width - nw) // 2 + nw, img.height))
else:
    nh = round(img.width / ratio)
    img = img.crop((0, (img.height - nh) // 2, img.width, (img.height - nh) // 2 + nh))
img = img.resize((W, H), Image.LANCZOS)
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

out = pathlib.Path(__file__).resolve().parent.parent / args.dir / f"{args.id}.data.js"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(
    "// Otomatik üretildi: scripts/encode-image.py — elle düzenleme\n"
    f'(globalThis.AW.imageData = globalThis.AW.imageData || {{}})["{args.id}"] = {{\n'
    f"  w: {W}, h: {H},\n"
    f'  palette: "{palette}",\n'
    f'  pixels: "{pixels}",\n'
    "};\n"
)
print(f"{out} ({out.stat().st_size // 1024} KB)")
