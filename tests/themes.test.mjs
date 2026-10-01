// Temaları tarayıcı olmadan çalıştırır: her tema farklı ekran boyutlarında yüzlerce kare
// boyunca hatasız çizebilmeli ve ızgarayı geçerli değerlerle doldurmalı.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "web");
const html = readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !s.endsWith("main.js"));

function load() {
  const ctx = vm.createContext({ Math, Date, Array, Object, Uint8Array, Uint16Array, Float32Array, String, Number, console });
  ctx.globalThis = ctx;
  for (const s of scripts) vm.runInContext(readFileSync(path.join(root, s), "utf8"), ctx, { filename: s });
  return ctx.AW;
}

const sample = () => ({
  cpu: 40, ram: 9, ramTotal: 16, battery: 70, charging: false, onBattery: true, down: 5, up: 1,
  cpuHist: Array(40).fill(30), netHist: Array(40).fill(3), track: "Sanatçı — Şarkı", weather: "İstanbul 18°C", live: true,
});

const AW = load();

test("en az 10 tema var ve kimlikleri benzersiz", () => {
  assert.ok(AW.themes.length >= 10, `tema sayısı ${AW.themes.length}`);
  const ids = AW.themes.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const t of AW.themes) {
    assert.ok(t.name && typeof t.frame === "function", `${t.id} eksik alan`);
  }
});

for (const theme of AW.themes) {
  test(`${theme.id} temasi hatasız çiziyor`, () => {
    for (const [cols, rows] of [[160, 48], [90, 30], [240, 70], [12, 6]]) {
      const g = new AW.Grid(cols, rows, 0.5);
      const S = sample();
      const st = theme.init ? theme.init(g, S) || {} : {};
      let drawn = 0;
      for (let f = 0; f < 120; f++) {
        S.cpu = (f * 7) % 100; S.down = (f * 3) % 30;
        g.clear();
        theme.frame(g, f * 0.05, 0.05, S, st);
        AW.drawUI(g, new Date(2026, 9, 1, 20, 30, f % 60), f * 0.05, S, theme.ui, { showPanel: true, toast: "tema", toastUntil: 99 });
        for (let i = 0; i < g.ch.length; i++) {
          const c = g.ch[i];
          assert.equal(typeof c, "string", `${theme.id}: karakter metin değil`);
          assert.ok(c.length >= 1 && c.length <= 2, `${theme.id}: hücrede '${c}'`);
          if (c !== " " && g.fg[i]) drawn++;
        }
      }
      if (cols >= 90) assert.ok(drawn > 0, `${theme.id} ${cols}x${rows} boş kaldı`);
    }
  });
}
