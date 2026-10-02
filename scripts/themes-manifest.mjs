// web/themes.tsv dosyasını üretir: her satırda "kimlik<TAB>ad". riceutil ve diğer araçlar tema listesini
// JavaScript çalıştırmadan buradan okur. Tema ekleyince: node scripts/themes-manifest.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "web");

export function manifest() {
  const html = readFileSync(path.join(root, "index.html"), "utf8");
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !s.endsWith("main.js"));
  const ctx = vm.createContext({});
  vm.runInContext("globalThis.globalThis = globalThis;", ctx);
  for (const s of scripts) vm.runInContext(readFileSync(path.join(root, s), "utf8"), ctx, { filename: s });
  return ctx.AW.themes.map((t) => `${t.id}\t${t.name}\n`).join("");
}

export const manifestPath = path.join(root, "themes.tsv");

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(manifestPath, manifest());
  console.log(`Yazıldı: ${manifestPath}`);
}
