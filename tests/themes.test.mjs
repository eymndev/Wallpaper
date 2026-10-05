// Temaları tarayıcı olmadan çalıştırır: her tema farklı ekran boyutlarında yüzlerce kare
// boyunca hatasız çizebilmeli ve ızgarayı geçerli değerlerle doldurmalı.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadAll } from "../scripts/packs.mjs";

// Klasik temalar ve depodaki tüm paketler
const load = () => loadAll({ globals: { console } }).AW;

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
    assert.ok(AW.packs.some((p) => p.id === t.pack), `${t.id} paketi bilinmiyor: ${t.pack}`);
  }
});

test("Klasik temalar paketsiz de var, görsel temalar paketlerde", () => {
  const core = loadAll({ only: [] }).AW;
  assert.ok(core.themes.length >= 10);
  assert.ok(core.themes.every((t) => t.pack === "klasik"));
  assert.ok(!core.findTheme("hypr-kath") && !core.findTheme("light-yagami"));
  const anime = loadAll({ only: ["anime"] }).AW;
  assert.equal(anime.themes.filter((t) => t.pack === "anime").map((t) => t.id).join(" "), "misa-train light-yagami thousand-sunny");
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
        AW.drawUI(g, new Date(2026, 9, 1, 20, 30, f % 60), f * 0.05, S, theme.ui, { showPanel: true, themeName: theme.name, toast: "tema", toastUntil: 99 });
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
