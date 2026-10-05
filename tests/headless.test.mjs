// Ekran koruyucunun kullandığı tarayıcısız sürücü (js/headless.js): her tema geçerli bir kare
// metni üretmeli ve kareler boş olmamalı.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadAll } from "../scripts/packs.mjs";

// JavaScriptCore'da olduğu gibi: console, tarayıcı nesneleri yok. Paketler ekran koruyucudaki gibi
// (AsciiEngine) index.html'deki betiklerden sonra, tarayıcısız sürücüden önce çalışır.
const AWH = loadAll({ extra: ["js/headless.js"] }).AWH;
const themes = JSON.parse(AWH.themes());

test("tema listesi index.html ile aynı", () => {
  assert.ok(themes.length >= 20);
  assert.ok(themes.every((t) => t.id && t.name && t.pack));
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

test("arayüz katmanı: saat ve panel ayrı ızgaraya çiziliyor", () => {
  AWH.setTheme("misa-train");
  const cols = 300, rows = 94, ucols = 120, urows = 38;
  AWH.resize(cols, rows, 0.5);
  AWH.resizeUI(ucols, urows, 0.5);
  AWH.setOptions(true, true, true);
  const s = AWH.frame(0.05);
  assert.equal(s.length, (cols * rows + ucols * urows) * 5);
  // Arayüz katmanında saatin büyük rakamları var, boş hücreler saydam (renksiz)
  let blocks = 0, empty = 0;
  for (let k = 0; k < ucols * urows; k++) {
    const o = (cols * rows + k) * 5, c = s.charCodeAt(o);
    if (c === 0x2588) blocks++;
    if (c === 32 && !s.charCodeAt(o + 1) && !s.charCodeAt(o + 3)) empty++;
  }
  assert.ok(blocks > 20, `yalnız ${blocks} saat bloğu`);
  assert.ok(empty > ucols * urows * 0.5);
  AWH.resizeUI(0, 0, 0.5);
  assert.equal(AWH.frame(0.05).length, cols * rows * 5);
});
