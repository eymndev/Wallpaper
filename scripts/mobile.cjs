// Telefon ve tabletler için tek, evrensel PNG duvar kağıtları üretir (mobile/<tema>.png, 4096x4096).
// Kare görsel her cihazda ekranı doldurur: telefon (~19.5:9) ortadaki dikey şeridi, tablet (4:3, dikey ya
// da yatay) ortadaki geniş kısmı gösterir; iPhone, iPad ve Android için ayrı dosya gerekmez.
// Saat, sistem paneli ve tema adı çizilmez (telefon kendi saatini gösterir). Görsel temalar 16:9 çizilip
// FOCUS'taki yatay konum (0..1) ortada kalacak şekilde kırpılır, ana figür telefonda da görünsün diye.
// Kullanım: node scripts/mobile.cjs [tema-kimliği ...]   (Playwright ve python3 + Pillow gerekir)
// AW_MOBILE_DIR çıktı klasörünü değiştirir.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execSync, execFileSync } = require("node:child_process");

function loadPlaywright() {
  try { return require("playwright"); } catch (e) { /* yerelde yok, global kuruluma bak */ }
  const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  return require(path.join(globalRoot, "playwright"));
}

const root = path.join(__dirname, "..", "web");
const outDir = process.env.AW_MOBILE_DIR || path.join(__dirname, "..", "mobile");
// Klasik temalar web/themes.tsv'de, paketlerinkiler packs/<paket>/themes.tsv'de
const packsDir = path.join(__dirname, "..", "packs");
const dirs = [root, ...fs.readdirSync(packsDir).map((d) => path.join(packsDir, d)).filter((d) => fs.existsSync(path.join(d, "themes.tsv")))];
const home = {};
for (const dir of dirs) for (const l of fs.readFileSync(path.join(dir, "themes.tsv"), "utf8").trim().split("\n")) home[l.split("\t")[0]] = dir;
const all = Object.keys(home);
const wanted = process.argv.slice(2);
const ids = wanted.length ? all.filter((id) => wanted.includes(id)) : all;

const SIZE = 4096, CSS = 1024, DPR = SIZE / CSS; // 1024 CSS pikseli, 4 kat yoğunluk: yazılar telefonda okunur boyutta
// Görsel temalarda ana figürün yatay konumu (16:9 görselde 0..1); yazılmayanlar ortalanır
const FOCUS = {
  "misa-train": 0.27, "light-yagami": 0.68, "thousand-sunny": 0.5,
  "hypr-alba4k": 0.2, "hypr-honkadaloonga": 0.3, "hypr-kath": 0.53,
};

const CROP = `
import sys
from PIL import Image
src, out, size, focus = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
im = Image.open(src).convert("RGB")
w, h = im.size
x = min(max(round(focus * w - size / 2), 0), w - size)
im.crop((x, (h - size) // 2, x + size, (h - size) // 2 + size)).save(out, optimize=True)
`;

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aw-mobile-"));
  for (const id of ids) {
    const image = home[id] !== root;
    const width = image ? Math.round((CSS * 16) / 9) : CSS;
    const page = await browser.newPage({ viewport: { width, height: CSS }, deviceScaleFactor: DPR });
    await page.clock.install({ time: new Date(2026, 9, 4, 21, 30) });
    await page.goto("file://" + path.join(root, "index.html") + `?theme=${id}&panel=0&clock=0&name=0`);
    // Görsel temaların sık ızgarası (fontScale 0.4) telefonda karakter değil piksel gibi görünür;
    // 0.6 ile hücreler prosedürel temalardakiyle aynı boyda olur (telefonda ~80 sütun)
    if (image) await page.evaluate((id) => { AW.findTheme(id).fontScale = 0.6; dispatchEvent(new Event("resize")); }, id);
    await page.clock.runFor(4000); // tema geçiş yazısı kaybolsun, animasyon otursun
    const shot = path.join(tmp, `${id}.png`), file = path.join(outDir, `${id}.png`);
    await page.screenshot({ path: shot });
    if (process.env.AW_MOBILE_RAW) fs.copyFileSync(shot, path.join(process.env.AW_MOBILE_RAW, `${id}.png`));
    await page.close();
    execFileSync("python3", ["-c", CROP, shot, file, String(SIZE), String(FOCUS[id] ?? 0.5)]);
    console.log(`${file} (${(fs.statSync(file).size / 1048576).toFixed(1)} MB)`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
