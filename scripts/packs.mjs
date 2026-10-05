// Depodaki tema paketleri (packs/<paket>/pack.json) ve betikleri, Node araçları ve testler için.
// loadAll: sayfanın yaptığı gibi önce web/index.html'deki betikleri (main.js hariç), sonra her paketi
// AW.beginPack / AW.endPack arasında bir vm bağlamında çalıştırır.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import path from "node:path";

export const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const web = path.join(repo, "web");
export const packsDir = path.join(repo, "packs");

export function corePaths() {
  const html = readFileSync(path.join(web, "index.html"), "utf8");
  return [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !s.endsWith("main.js"));
}

export function packs() {
  return readdirSync(packsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(packsDir, d.name, "pack.json")))
    .map((d) => JSON.parse(readFileSync(path.join(packsDir, d.name, "pack.json"), "utf8")))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.id.localeCompare(b.id));
}

// globals: vm bağlamına konacak ek nesneler; extra: en sonda çalışacak web/ altındaki betikler (ör. js/headless.js)
export function loadAll({ globals = {}, extra = [], only = null } = {}) {
  const ctx = vm.createContext({ ...globals });
  vm.runInContext("globalThis.globalThis = globalThis;", ctx);
  const run = (file) => vm.runInContext(readFileSync(file, "utf8"), ctx, { filename: path.relative(repo, file) });
  for (const s of corePaths()) run(path.join(web, s));
  for (const p of packs()) {
    if (only && !only.includes(p.id)) continue;
    ctx.AW.beginPack(p);
    for (const s of p.scripts) run(path.join(packsDir, p.id, s));
    ctx.AW.endPack();
  }
  for (const s of extra) run(path.join(web, s));
  return ctx;
}
