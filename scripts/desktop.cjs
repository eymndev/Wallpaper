// Masaüstü için sabit PNG duvar kağıtları üretir: Klasik temalar web/desktop/<tema>.png, paket temaları
// packs/<paket>/desktop/<tema>.png (paketle birlikte iner), 5760x3600 (16:10).
// Uygulama etkin temanın PNG'sini macOS'un kendi masaüstü resmi yapar: kilit ekranı, giriş ekranı ve uygulamanın
// çizmediği anlar da aynı temayı gösterir. 16:10 MacBook ekranlarına oturur; 16:9 ekranda macOS "Ekranı doldur" ile
// üstten/alttan biraz kırpar. 1440x900 CSS pikseli 4 kat yoğunlukla çizilir: yazılar ekrandaki boyutunda, keskin.
// Saat, sistem paneli ve tema adı çizilmez (kilit ekranı kendi saatini gösterir; donmuş istatistik yanıltır).
// Kullanım: node scripts/desktop.cjs [tema-kimliği ...]   (Playwright gerekir)
// AW_DESKTOP_DIR verilirse tüm PNG'ler o klasöre yazılır.
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

function loadPlaywright() {
  try { return require("playwright"); } catch (e) { /* yerelde yok, global kuruluma bak */ }
  const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  return require(path.join(globalRoot, "playwright"));
}

const root = path.join(__dirname, "..", "web");
// Klasik temalar web/themes.tsv'de, paketlerinkiler packs/<paket>/themes.tsv'de
const packsDir = path.join(__dirname, "..", "packs");
const dirs = [root, ...fs.readdirSync(packsDir).map((d) => path.join(packsDir, d)).filter((d) => fs.existsSync(path.join(d, "themes.tsv")))];
const home = {};
for (const dir of dirs) for (const l of fs.readFileSync(path.join(dir, "themes.tsv"), "utf8").trim().split("\n")) home[l.split("\t")[0]] = dir;
const all = Object.keys(home);
const wanted = process.argv.slice(2);
const ids = wanted.length ? all.filter((id) => wanted.includes(id)) : all;

const WIDTH = 1440, HEIGHT = 900, DPR = 4; // 5760x3600

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const id of ids) {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: DPR });
    await page.clock.install({ time: new Date(2026, 9, 4, 21, 30) }); // sahnesinde saat çizen temalar için sabit
    await page.goto("file://" + path.join(root, "index.html") + `?theme=${id}&panel=0&clock=0&name=0`);
    await page.clock.runFor(4000); // tema geçiş yazısı kaybolsun, animasyon otursun
    const outDir = process.env.AW_DESKTOP_DIR || path.join(home[id], "desktop");
    fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, `${id}.png`);
    await page.screenshot({ path: file });
    await page.close();
    console.log(`${file} (${(fs.statSync(file).size / 1048576).toFixed(1)} MB)`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
