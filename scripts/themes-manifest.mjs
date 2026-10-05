// Tema ve paket listelerini üretir. riceutil ve diğer araçlar bunları JavaScript çalıştırmadan okur.
//   web/themes.tsv           Klasik temalar: "kimlik<TAB>ad"
//   packs/<paket>/themes.tsv paketin temaları, aynı biçim
//   web/packs.tsv            paket kataloğu: "kimlik<TAB>ad<TAB>dahili(1|0)<TAB>tema sayısı<TAB>açıklama"
//   packs/index.js           tarayıcıda depodan açılınca tüm paketleri yükler (bkz. web/js/packs.js)
// Tema ya da paket ekleyince/silince: node scripts/themes-manifest.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadAll, packs, web, packsDir } from "./packs.mjs";

export function manifests() {
  const AW = loadAll().AW;
  const list = (pack) => AW.themes.filter((t) => t.pack === pack).map((t) => `${t.id}\t${t.name}\n`).join("");
  const all = packs();
  const files = {};
  files[path.join(web, "themes.tsv")] = list("klasik");
  let catalog = `klasik\tKlasik\t1\t${AW.themes.filter((t) => t.pack === "klasik").length}\tHer kurulumda gelen temalar: göl, Matrix, şömine, synthwave ...\n`;
  for (const p of all) {
    files[path.join(packsDir, p.id, "themes.tsv")] = list(p.id);
    catalog += `${p.id}\t${p.name}\t0\t${AW.themes.filter((t) => t.pack === p.id).length}\t${p.description || ""}\n`;
  }
  files[path.join(web, "packs.tsv")] = catalog;
  const index = all.map((p) => ({ id: p.id, name: p.name, scripts: p.scripts.map((s) => `${p.id}/${s}`) }));
  files[path.join(packsDir, "index.js")] =
    "// Otomatik üretildi: node scripts/themes-manifest.mjs — elle düzenleme.\n" +
    "// Sayfa tarayıcıda depodan açılınca (geliştirme, önizlemeler, GIF'ler) depodaki tüm paketleri yükler (bkz. web/js/packs.js).\n" +
    "(function (G) {\n" +
    `  const packs = ${JSON.stringify(index)};\n` +
    "  let html = \"\";\n" +
    "  for (const p of packs) {\n" +
    "    html += `<script>AW.beginPack(${JSON.stringify({ id: p.id, name: p.name })})<\\/script>`;\n" +
    "    for (const s of p.scripts) html += `<script src=\"../packs/${s}\"><\\/script>`;\n" +
    "    html += \"<script>AW.endPack()<\\/script>\";\n" +
    "  }\n" +
    "  G.document.write(html);\n" +
    "})(globalThis);\n";
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [file, text] of Object.entries(manifests())) {
    writeFileSync(file, text);
    console.log(`Yazıldı: ${path.relative(path.join(web, ".."), file)}`);
  }
}
