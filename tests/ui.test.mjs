// Arayüz katmanı ve tema listesi dosyası.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import path from "node:path";
import { manifests } from "../scripts/themes-manifest.mjs";

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

test("tema ve paket listeleri güncel (node scripts/themes-manifest.mjs)", () => {
  for (const [file, text] of Object.entries(manifests())) assert.equal(readFileSync(file, "utf8"), text, file);
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

const CLAUDE = {
  project: "Wallpaper", model: "opus-5-5", state: "tool", thoughtKind: "text", tool: "Bash: npm test", lastTool: "Bash: npm test",
  thought: "Testleri çalıştırıyorum", tokens: 184200, output: 12400, context: 96100, turn: 74, session: 1520,
};

test("Claude Code paneli yalnızca veri varken sağ altta çiziliyor", () => {
  const g = new AW.Grid(160, 50, 0.5);
  AW.drawUI(g, new Date(2026, 9, 2, 12, 0), 1, { ...S, claude: CLAUDE }, null, { showPanel: true, themeName: "Gece Gölü" });
  const rows = Array.from({ length: g.rows }, (_, y) => rowText(g, y));
  const top = rows.findIndex((r) => r.includes("CLAUDE CODE · Wallpaper"));
  assert.ok(top > 20, `panel başlığı satırı: ${top}`);
  assert.ok(rows[top].indexOf("CLAUDE") > g.cols / 2, "panel sağda olmalı");
  assert.ok(top + AW.claudePanelHeight <= g.rows - 3, "tema adının üstünde kalmalı");
  const body = rows.slice(top, top + AW.claudePanelHeight).join("\n");
  for (const s of ["araç çalıştırıyor", "Bash: npm test", "Testleri çalıştırıyorum", "1dk 14sn", "25dk 20sn", "184.2k token", "▐▛███▜▌"]) {
    assert.ok(body.includes(s), `panelde '${s}' yok:\n${body}`);
  }

  const empty = new AW.Grid(160, 50, 0.5);
  AW.drawUI(empty, new Date(2026, 9, 2, 12, 0), 1, { ...S, claude: null }, null, {});
  assert.ok(!empty.ch.join("").includes("CLAUDE CODE"));
});

test("Claude Code paneli yer yoksa sistem paneliyle çakışmıyor", () => {
  for (const [cols, rows] of [[120, 30], [60, 24], [45, 40]]) {
    const g = new AW.Grid(cols, rows, 0.5);
    AW.drawUI(g, new Date(2026, 9, 2, 12, 0), 1, { ...S, claude: CLAUDE }, null, { showPanel: true });
    const text = Array.from({ length: g.rows }, (_, y) => rowText(g, y)).join("\n");
    assert.ok(text.includes(" SİSTEM "), `${cols}x${rows}: sistem paneli bozulmamalı`);
  }
});

for (const [provider, title, icon] of [["codex", "CODEX", "[ >_ ]"], ["antigravity", "ANTIGRAVITY", " /\\/\\ "]]) {
  test(`${title} kendi adı ve simgesiyle çiziliyor; eksik ölçümler sıfır olmuyor`, () => {
    const g = new AW.Grid(160, 50, 0.5);
    AW.drawUI(g, new Date(), 1, { ...S, [provider]: { ...CLAUDE, model: "", tokens: null, output: null, context: null } }, null, {});
    const text = Array.from({ length: g.rows }, (_, y) => rowText(g, y)).join("\n");
    assert.ok(text.includes(`${title} · Wallpaper`));
    assert.ok(text.includes(icon));
    assert.ok(text.includes("— token  ↓ —  bağlam —"));
    assert.ok(!text.includes("CLAUDE CODE"));
    assert.ok(!text.includes("▐▛███▜▌"));
  });
}

test("üç ajan aynı ekranda birbirini ve saat/sistem panelini örtmüyor", () => {
  const g = new AW.Grid(160, 50, 0.5);
  AW.drawUI(g, new Date(), 1, { ...S, claude: CLAUDE, codex: CLAUDE, antigravity: CLAUDE }, null, { themeName: "Gece Gölü" });
  const rows = Array.from({ length: g.rows }, (_, y) => rowText(g, y));
  const boxes = [];
  for (const title of ["CLAUDE CODE", "CODEX", "ANTIGRAVITY"]) {
    const y = rows.findIndex((r) => r.includes(`${title} ·`));
    assert.ok(y >= 0, `${title} görünmeli`);
    const at = rows[y].indexOf(`${title} ·`);
    const x = rows[y].lastIndexOf("┌", at);
    const end = rows[y].indexOf("┐", at);
    boxes.push({ x, y, end });
    for (let r = y + 1; r < y + AW.claudePanelHeight - 1; r++) {
      assert.ok(["│", "├"].includes(rows[r][x]));
      assert.ok(["│", "┤"].includes(rows[r][end]));
    }
    assert.equal(rows[y + AW.claudePanelHeight - 1][x], "└");
  }
  for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
    const A = boxes[a], B = boxes[b];
    assert.ok(A.end < B.x || B.end < A.x || A.y + 15 <= B.y || B.y + 15 <= A.y);
  }
  assert.ok(rows.join("\n").includes(" SİSTEM "));
  assert.ok(rows[g.rows - 2].includes("Gece Gölü"));
});

test("dar ekranda meşgul ajan öncelikli; boş veri panel çizmez", () => {
  const g = new AW.Grid(100, 36, 0.5);
  AW.drawUI(g, new Date(), 1, { ...S, claude: { ...CLAUDE, state: "waiting" }, codex: CLAUDE, antigravity: null }, null, {});
  assert.ok(g.ch.join("").includes("CODEX · Wallpaper"));
  assert.ok(!g.ch.join("").includes("CLAUDE CODE"));
  const empty = new AW.Grid(160, 50, 0.5);
  AW.drawUI(empty, new Date(), 1, { ...S, codex: null, antigravity: null }, null, {});
  assert.ok(!empty.ch.join("").includes("CODEX"));
  assert.ok(!empty.ch.join("").includes("ANTIGRAVITY"));
});
