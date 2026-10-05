// Hyprland duvar kağıdı yarışmasının dokuz kazananı, ASCII olarak.
// Görseller: https://hypr.land/news/contestWinners (her temanın adında sanatçısı yazıyor).
// Görsel verisi hypr/*.data.js içinde; buradaki ayarlar efektleri belirler (bkz. web/js/image.js).
(function (G) {
  const AW = G.AW;

  // Görseldeki bir daireyi ince ASCII çizgiyle çizer (merkez ve yarıçap görsel yüksekliği cinsinden)
  function ring(g, m, nx, ny, r, col) {
    const U = m.x(nx) * g.aspect, V = m.y(ny), R = r * m.hs;
    if (R < 0.8) return g.set(U / g.aspect, V, "o", col);
    for (let y = Math.max(0, Math.floor(V - R - 1)); y <= Math.min(g.rows - 1, V + R + 1); y++) {
      for (let x = Math.max(0, Math.floor((U - R - 1) / g.aspect)); x <= Math.min(g.cols - 1, (U + R + 1) / g.aspect); x++) {
        const du = (x + 0.5) * g.aspect - U, dv = y + 0.5 - V, d = Math.hypot(du, dv);
        if (Math.abs(d - R) > 0.5) continue;
        const a = Math.abs(Math.atan2(dv, du)) / Math.PI; // 0..1
        const c = a < 0.18 || a > 0.82 ? "|" : a > 0.38 && a < 0.62 ? "-" : (du > 0) === (dv > 0) ? "/" : "\\";
        g.set(x, y, c, col);
      }
    }
  }

  // 3 satırlık yedi parçalı rakamlar
  const SEG = {
    0: [" _ ", "| |", "|_|"], 1: ["   ", "  |", "  |"], 2: [" _ ", " _|", "|_ "], 3: [" _ ", " _|", " _|"],
    4: ["   ", "|_|", "  |"], 5: [" _ ", "|_ ", " _|"], 6: [" _ ", "|_ ", "|_|"], 7: [" _ ", "  |", "  |"],
    8: [" _ ", "|_|", "|_|"], 9: [" _ ", "|_|", " _|"],
  };

  AW.imageTheme({
    id: "hypr-honkadaloonga",
    name: "Hypr · Honkadaloonga",
    image: "honkadaloonga",
    bg: "#070707",
    gamma: 0.75,
    shimmer: { amp: 0.45, scale: 0.05 },
    sweep: { period: 12, width: 6, amp: 0.7 },
    ui: { accent: "#3fe0c5", accent2: "#3aa0d8", frame: "#2a4a52", panel: "rgba(8,10,12,0.86)" },
  });

  AW.imageTheme({
    id: "hypr-kath",
    name: "Hypr · Kath",
    image: "kath",
    bg: "#03040f",
    bgDim: 0.55,
    glow: [
      { hue: [185, 215], sat: 0.45, lum: 0.3, amp: 0.35, speed: 1.2 }, // neon kediler
      { hue: [5, 45], sat: 0.4, lum: 0.25, mode: "flicker" }, // pencere ışıkları
    ],
    twinkleContrast: 0.35,
    ui: { accent: "#6fd8ff", accent2: "#ff9d6b", frame: "#3a3f7a", panel: "rgba(6,6,24,0.86)" },
  });

  AW.imageTheme({
    id: "hypr-end4",
    name: "Hypr · end_4",
    image: "end4",
    bg: "#04080e",
    glow: [{ hue: [180, 205], sat: 0.4, lum: 0.35, amp: 0.45, speed: 1, wave: 0.03 }],
    streaks: { count: 26, color: [40, 110, 130], speed: 1 },
    ui: { accent: "#36d6f0", accent2: "#7fb3c9", frame: "#1f4656", panel: "rgba(4,10,16,0.88)" },
  });

  AW.imageTheme({
    id: "hypr-alba4k",
    name: "Hypr · alba4k",
    image: "alba4k",
    bg: "#030405",
    gamma: 0.7,
    glow: [{ hue: [180, 210], sat: 0.4, lum: 0.3, amp: 0.4, speed: 0.8 }],
    ui: { accent: "#3ec6f0", accent2: "#9aa3b5", frame: "#2a3240", panel: "rgba(6,7,9,0.9)", clockBottom: true },
    // Görseldeki metin silindi, burada gerçek yazı olarak çiziliyor; yüzde ilerliyor (69'da biraz bekler)
    overlay(g, t, dt, S, st) {
      const m = st.map, ink = "#e4e7ee", dim = "#7d8594";
      let y = -1;
      const at = (ny) => (y = Math.max(y + 1, Math.round(m.y(ny))));
      const x = Math.max(1, Math.round(m.x(0.107)));
      g.put(x, at(0.385), "Hyprland was so good, your PC couldn't take it. We're", ink);
      g.put(x, at(0.44), "just pretending to collect some error info, then we'll", ink);
      g.put(x, at(0.495), "restart for you.", ink);

      const e = st.extra;
      if (e.pct === undefined) { e.pct = 0; e.wait = 0.5; }
      e.wait -= dt;
      if (e.wait <= 0) {
        if (e.pct >= 100) { e.pct = 0; e.wait = 1; }
        else { e.pct++; e.wait = e.pct === 69 ? 6 : e.pct === 100 ? 2.5 : (0.1 + Math.random() * 0.5) / (1 + S.cpu / 50); }
      }
      g.put(x, at(0.58), `${e.pct}% complete`, ink);

      const x2 = Math.max(1, Math.round(m.x(0.188)));
      g.put(x2, at(0.68), "For more information about this issue and possible fixes, visit https://wiki.hyprland.org", dim);
      g.put(x2, at(0.725), "If you call a support person, give them this info:", dim);
      g.put(x2, at(0.755), "Stop code: HYPRLAND_SO_GOOD", dim);
    },
  });

  AW.imageTheme({
    id: "hypr-corndog",
    name: "Hypr · corndog",
    image: "corndog",
    bg: "#010418",
    bgDim: 0.55,
    glow: [
      { hue: [180, 215], sat: 0.45, lum: 0.45, amp: 0.3, speed: 1 },
      { hue: [330, 30], sat: 0.45, lum: 0.2, mode: "flicker" },
    ],
    twinkleContrast: 0.25,
    ui: { accent: "#7fd8ff", accent2: "#ff7aa8", frame: "#26407a", panel: "rgba(2,6,30,0.86)" },
    // Uzay gemisindeki tabelada gerçek saat
    overlay(g, t, dt, S, st) {
      const m = st.map, now = new Date(), col = "#eef4ff";
      const hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0");
      const cx = m.x(0.6015), cy = m.y(0.352), h = m.y(0.383) - m.y(0.322);
      const colon = now.getSeconds() % 2 === 0;
      const w = m.x(0.64) - m.x(0.564);
      if (h >= 4.4 && w >= 17) {
        // LED tabela: 3x5 bloklu rakamlar
        const F = AW.bigFont, gl = [F[hh[0]], F[hh[1]], colon ? F[":"] : ["   ", "   ", "   ", "   ", "   "], F[mm[0]], F[mm[1]]];
        const lines = [0, 1, 2, 3, 4].map((r) => gl.map((d, i) => (i === 2 ? d[r][1] : d[r])).join(" "));
        g.sprite(Math.round(cx - lines[0].length / 2), Math.round(cy - 2.5), lines, col);
      } else if (h >= 2.6 && w >= 13) {
        const d = [...hh, ...mm].map((c) => SEG[c]);
        const lines = [0, 1, 2].map((r) => d[0][r] + d[1][r] + (r === 0 ? " " : colon ? "." : " ") + d[2][r] + d[3][r]);
        g.sprite(Math.round(cx - 6.5), Math.round(cy - 1.5), lines, col);
      } else {
        g.put(Math.round(cx - 2.5), Math.round(cy), hh + (colon ? ":" : " ") + mm, col);
      }
    },
  });

  AW.imageTheme({
    id: "hypr-meptl",
    name: "Hypr · Meptl",
    image: "meptl",
    bg: "#010101",
    gamma: 0.8,
    glow: [{ hue: [160, 215], sat: 0.25, lum: 0.35, amp: 0.4, speed: 0.7, wave: 0.12 }],
    ripple: [{ x: 0.49, y: 0.575, r: 0.09, rings: 3, speed: 2, amp: 0.5 }],
    motes: { x: 0.49, y: 0.57, spread: 0.08, count: 30, color: [150, 240, 235], rise: 0.8 },
    ui: { accent: "#7ff0e6", accent2: "#b48cff", frame: "#3a2f5a", panel: "rgba(4,3,8,0.88)" },
  });

  AW.imageTheme({
    id: "hypr-sollee",
    name: "Hypr · Sollee",
    image: "sollee",
    bg: "#080808",
    twinkleContrast: 0.2,
    ripple: [{ x: 0.5, y: 0.5, r: 0.16, rings: 7, speed: 2.5, amp: 0.9 }],
    ui: { accent: "#36b6e8", accent2: "#cfd3da", frame: "#3a3d44", panel: "rgba(10,10,10,0.88)" },
    // Büyük yörünge ve üzerinde dönen küçük gezegen (CPU yükseldikçe hızlanır)
    overlay(g, t, dt, S, st) {
      const m = st.map;
      ring(g, m, 0.5, 0.5, 0.3537, "#bfc2c8");
      const a = -2.332 + st.phase * 0.1, R = 0.3537;
      ring(g, m, 0.5 + (Math.cos(a) * R * 9) / 16, 0.5 + Math.sin(a) * R, 0.0544, "#e8eaee");
    },
  });

  AW.imageTheme({
    id: "hypr-srev",
    name: "Hypr · srev",
    image: "srev",
    bg: "#151d1e",
    bgDim: 0.7,
    glow: [
      { hue: [40, 65], sat: 0.5, lum: 0.4, amp: 0.4, speed: 1.3 },
      { hue: [165, 200], sat: 0.4, lum: 0.4, amp: 0.3, speed: 0.9 },
    ],
    sweep: { period: 16, width: 4, amp: 0.5 },
    ui: { accent: "#ffd34d", accent2: "#5fe0d0", frame: "#3c5a5c", panel: "rgba(14,20,21,0.9)" },
  });

  AW.imageTheme({
    id: "hypr-vdawg",
    name: "Hypr · VDawg",
    image: "vdawg",
    bg: "#000208",
    bgDim: 0.55,
    glow: [
      { hue: [185, 215], sat: 0.45, lum: 0.3, mode: "flicker" }, // ekranlar
      { hue: [190, 210], sat: 0.6, lum: 0.6, amp: 0.4, speed: 1.5, wave: 0.15 },
    ],
    motes: { x: 0.5, y: 0.74, spread: 0.06, count: 45, color: [110, 210, 255], rise: 1.4 },
    ui: { accent: "#4fc8ff", accent2: "#9fe8ff", frame: "#1d3c66", panel: "rgba(0,4,14,0.88)" },
  });
})(globalThis);
