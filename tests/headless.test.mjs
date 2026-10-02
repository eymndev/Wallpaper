// Ekran koruyucunun kullandığı tarayıcısız sürücü (js/headless.js): her tema geçerli bir kare
// metni üretmeli ve kareler boş olmamalı.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "web");
const html = readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !s.endsWith("main.js"));

// JavaScriptCore'da olduğu gibi: console, tarayıcı nesneleri yok
const ctx = vm.createContext({});
vm.runInContext("globalThis.globalThis = globalThis;", ctx);
for (const s of [...scripts, "js/headless.js"]) vm.runInContext(readFileSync(path.join(root, s), "utf8"), ctx, { filename: s });
const AWH = ctx.AWH;
const themes = JSON.parse(AWH.themes());

test("tema listesi index.html ile aynı", () => {
  assert.ok(themes.length >= 20);
  assert.ok(themes.every((t) => t.id && t.name));
});

for (const { id } of themes) {
  test(`${id} tarayıcısız çiziliyor`, () => {
    const info = JSON.parse(AWH.setTheme(id));
    assert.equal(info.id, id);
    assert.equal(info.bg.length, 3);
    const cols = 140, rows = 44;
    AWH.resize(cols, rows, 0.5);
    AWH.setOptions(true, true);
    AWH.update({ cpu: 55, ram: 9, ramTotal: 16, battery: 70, down: 4, up: 1 });
    let s;
    for (let f = 0; f < 10; f++) s = AWH.frame(0.05);
    assert.equal(s.length, cols * rows * 5);
    let visible = 0;
    for (let k = 0; k < cols * rows; k++) {
      const c = s.charCodeAt(k * 5), fh = s.charCodeAt(k * 5 + 1), bh = s.charCodeAt(k * 5 + 3);
      assert.ok(c < 0xd800 || c > 0xdfff);
      assert.ok(fh <= 4096 && bh <= 4096);
      if ((c !== 32 && fh) || bh) visible++;
    }
    assert.ok(visible > cols * rows * 0.05, `${id}: yalnız ${visible} hücre görünür`);
  });
}
