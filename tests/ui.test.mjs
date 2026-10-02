// Arayüz katmanı ve tema listesi dosyası.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import path from "node:path";
import { manifest, manifestPath } from "../scripts/themes-manifest.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "web");
const ctx = vm.createContext({});
vm.runInContext("globalThis.globalThis = globalThis;", ctx);
for (const s of ["js/util.js", "js/grid.js", "js/ui.js"]) vm.runInContext(readFileSync(path.join(root, s), "utf8"), ctx, { filename: s });
const AW = ctx.AW;

const S = {
  cpu: 40, ram: 9, ramTotal: 16, battery: null, charging: false, onBattery: false, down: 1, up: 1,
  cpuHist: Array(40).fill(30), netHist: Array(40).fill(3), track: "", weather: "", live: true,
};

const rowText = (g, y) => g.ch.slice(y * g.cols, (y + 1) * g.cols).join("");

test("web/themes.tsv güncel (node scripts/themes-manifest.mjs)", () => {
  assert.equal(readFileSync(manifestPath, "utf8"), manifest());
});

test("tema adı sağ alt köşede yazıyor", () => {
  const g = new AW.Grid(120, 40, 0.5);
  AW.drawUI(g, new Date(2026, 9, 2, 12, 0), 0, S, null, { themeName: "Gece Gölü" });
  const line = rowText(g, g.rows - 2);
  const at = line.indexOf("Gece Gölü");
  assert.ok(at > g.cols / 2, `satır: '${line}'`);
  assert.ok(line.slice(at + "Gece Gölü".length).trim() === "", "ad sağ kenara dayalı olmalı");
});

test("tema adı kapatılabiliyor ve küçük ızgarada taşmıyor", () => {
  const g = new AW.Grid(120, 40, 0.5);
  AW.drawUI(g, new Date(2026, 9, 2, 12, 0), 0, S, null, { themeName: "Gece Gölü", showThemeName: false });
  assert.ok(!rowText(g, g.rows - 2).includes("Gece"));

  const small = new AW.Grid(32, 12, 0.5);
  AW.drawUI(small, new Date(2026, 9, 2, 12, 0), 0, S, null, { themeName: "Çok uzun bir tema adı ".repeat(4) });
  assert.ok(rowText(small, small.rows - 2).includes("…"));
});
