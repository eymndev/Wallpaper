// Kuzey Işıkları: dalgalanan aurora perdeleri, karlı dağlar ve donmuş göl yansıması.
(function (G) {
  const AW = G.AW;

  AW.register({
    id: "aurora",
    name: "Kuzey Işıkları",
    bg: "#030812",
    ui: { accent: "#7dffc4", accent2: "#c49bff", frame: "#2f5a66", panel: "rgba(3,8,18,0.86)" },
    init(g) {
      const horizon = Math.floor(g.rows * 0.7);
      const ridge = [];
      for (let x = 0; x <= g.cols; x++) ridge[x] = horizon - Math.pow(AW.fbm(x * 0.035 + 11), 1.5) * g.rows * 0.28;
      return { horizon, ridge };
    },
    frame(g, t, dt, S, st) {
      const { cols, rows } = g, hz = st.horizon;
      // Gökyüzü yoğunluğu ve renk tonu: dikey ışık huzmelerinden oluşan iki perde
      const sky = new Float32Array(cols * hz), hue = new Float32Array(cols * hz);
      for (let x = 0; x < cols; x++) {
        for (let L = 0; L < 2; L++) {
          const center = rows * (0.2 + L * 0.13) + Math.sin(x * 0.04 + t * 0.22 + L * 2) * rows * 0.07 + (AW.noise1(x * 0.05 + t * 0.12, 3 + L) - 0.5) * rows * 0.1;
          const len = rows * (0.14 + 0.12 * AW.noise1(x * 0.07 - t * 0.18, 9 + L));
          const ray = Math.pow(AW.noise1(x * 0.35 + t * 0.4 + L * 50, 31 + L), 2) * 1.6;
          const flick = 0.7 + 0.3 * AW.noise1(x * 0.6 + t * 2, 21 + L);
          for (let y = Math.max(0, Math.floor(center - len * 0.15)); y < center + len && y < hz; y++) {
            const v = y < center ? 1 - (center - y) / (len * 0.15) : Math.pow(1 - (y - center) / len, 1.5);
            const k = y * cols + x, val = AW.clamp(v * ray * flick, 0, 1);
            if (val > sky[k]) {
              sky[k] = val;
              hue[k] = (L ? 285 : 150) - (y < center ? 0 : (y - center) / len) * (L ? 40 : -25) + Math.sin(x * 0.02 + t * 0.1) * 15;
            }
          }
        }
      }
      for (let y = 0; y < hz; y++) for (let x = 0; x < cols; x++) {
        const k = y * cols + x, v = sky[k];
        if (v > 0.12) g.set(x, y, v > 0.7 ? "|" : v > 0.45 ? "!" : v > 0.25 ? ":" : ".", AW.hsl(hue[k], 85, 22 + v * 50));
        else if (AW.hash(x, y) < 0.012) g.set(x, y, ".", "#c8d2f0");
      }
      // Dağlar
      for (let x = 0; x < cols; x++) {
        const top = Math.floor(st.ridge[x]);
        for (let y = top; y < hz; y++) {
          const snowy = y - top < 2 && top < hz - 3;
          const sl = st.ridge[x + 1] - st.ridge[x];
          g.set(x, y, y === top ? (Math.abs(sl) < 0.3 ? "^" : sl < 0 ? "/" : "\\") : snowy ? (AW.hash(x, y) < 0.6 ? "*" : ".") : AW.hash(x, y) < 0.3 ? ":" : " ", snowy || y === top ? "#cfdcef" : "#2a3854");
          g.setBg(x, y, "#0b1222");
        }
      }
      // Göl: gökyüzünün dalgalı yansıması
      for (let y = hz; y < rows; y++) {
        const my = 2 * hz - y - 1;
        for (let x = 0; x < cols; x++) {
          const sx = Math.floor(x + Math.sin(y * 1.3 + t * 2) * 1.5);
          const k = my * cols + AW.clamp(sx, 0, cols - 1);
          const v = my >= 0 ? sky[k] : 0;
          if (v > 0.2 && AW.hash(x, y) < 0.7) g.set(x, y, "~", AW.hsl(hue[k], 60, 12 + v * 25));
          else if (AW.hash(x, y + 7) < 0.15) g.set(x, y, "-", "#1c2a44");
        }
      }
    },
  });
})(globalThis);
