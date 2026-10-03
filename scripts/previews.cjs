// web/previews/<tema>.jpg önizlemelerini üretir: her temayı başsız Chromium'da açıp birkaç saniye
// oynatır ve küçük bir ekran görüntüsü alır. riceutil GUI'si tema kartlarında bunları gösterir.
// Kullanım: node scripts/previews.cjs [tema-kimliği ...]   (Playwright gerekir: npm i -g playwright)
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

function loadPlaywright() {
  try { return require("playwright"); } catch (e) { /* yerelde yok, global kuruluma bak */ }
  const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  return require(path.join(globalRoot, "playwright"));
}

const root = path.join(__dirname, "..", "web");
const outDir = path.join(root, "previews");
const all = fs.readFileSync(path.join(root, "themes.tsv"), "utf8").trim().split("\n").map((l) => l.split("\t")[0]);
const wanted = process.argv.slice(2);
const ids = wanted.length ? all.filter((id) => wanted.includes(id)) : all;

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  // 1440x900 ekranın yarı ölçekli hali: 480x300 piksellik bir kare, yazılar ekrandaki oranıyla
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 / 3 });
  fs.mkdirSync(outDir, { recursive: true });
  for (const id of ids) {
    const url = "file://" + path.join(root, "index.html") + `?theme=${id}&panel=0&name=0`;
    await page.goto(url);
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* önemli değil */ } });
    await page.waitForTimeout(4000); // tema geçiş yazısı kaybolsun, animasyon otursun
    const file = path.join(outDir, `${id}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 82 });
    console.log(`${file} (${fs.statSync(file).size} bayt)`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
