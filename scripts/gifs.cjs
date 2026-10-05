// README'deki tema GIF'lerini (docs/gifs/<tema>.gif) üretir: her temayı başsız Chromium'da açar,
// sayfanın saatini Playwright ile adım adım ilerletip kareleri yakalar, Pillow ile GIF'e çevirir.
// Kullanım: node scripts/gifs.cjs [tema-kimliği ...]   (Playwright ve python3 + Pillow gerekir)
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
const outDir = path.join(__dirname, "..", "docs", "gifs");
// Klasik temalar web/themes.tsv'de, paketlerinkiler packs/<paket>/themes.tsv'de
const packsDir = path.join(__dirname, "..", "packs");
const dirs = [root, ...fs.readdirSync(packsDir).map((d) => path.join(packsDir, d)).filter((d) => fs.existsSync(path.join(d, "themes.tsv")))];
const home = {};
for (const dir of dirs) for (const l of fs.readFileSync(path.join(dir, "themes.tsv"), "utf8").trim().split("\n")) home[l.split("\t")[0]] = dir;
const all = Object.keys(home);
const wanted = process.argv.slice(2);
const ids = wanted.length ? all.filter((id) => wanted.includes(id)) : all;
const FRAMES = 24, STEP = 125; // 3 saniye, saniyede 8 kare

const PACK = `
import sys, glob
from PIL import Image
src, out, step, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
frames = [Image.open(p).convert("RGB").resize((w, h), Image.Resampling.LANCZOS) for p in sorted(glob.glob(src + "/*.png"))]
pal = frames[len(frames) // 2].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
q[0].save(out, save_all=True, append_images=q[1:], duration=step, loop=0, optimize=True)
`;

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  // 1440x900 ekranda çizilir, GIF için 720x450'ye küçültülür (yazılar ekrandaki oranıyla kalır)
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  fs.mkdirSync(outDir, { recursive: true });
  for (const id of ids) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aw-gif-"));
    await page.clock.install({ time: new Date(2026, 9, 4, 21, 30) });
    await page.goto("file://" + path.join(root, "index.html") + `?theme=${id}`);
    await page.clock.runFor(3500); // tema geçiş yazısı kaybolsun, animasyon otursun
    for (let f = 0; f < FRAMES; f++) {
      await page.screenshot({ path: path.join(tmp, `${String(f).padStart(3, "0")}.png`) });
      await page.clock.runFor(STEP);
    }
    const file = path.join(outDir, `${id}.gif`);
    execFileSync("python3", ["-c", PACK, tmp, file, String(STEP), "720", "450"]);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`${file} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
