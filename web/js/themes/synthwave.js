// Synthwave: neon güneş, mor dağlar ve sonsuza akan ızgara yol. İndirme hızı akışı hızlandırır.
(function (G) {
  const AW = G.AW;

  AW.register({
    id: "synthwave",
    name: "Synthwave",
    bg: "#0d0221",
    ui: { accent: "#ff6ad5", accent2: "#26f7fd", frame: "#7a2f8f", dim: "#b07ac8", panel: "rgba(13,2,33,0.86)" },
    init(g) {
      const horizon = Math.floor(g.rows * 0.55);
      const ridge = [];
      for (let x = 0; x <= g.cols; x++) {
        const d = Math.abs(x - g.cols / 2) / (g.cols / 2);
        ridge[x] = horizon - Math.pow(AW.fbm(x * 0.06 + 5), 1.5) * g.rows * 0.22 * (0.3 + d);
      }
      return { horizon, ridge, z: 0 };
    },
    frame(g, t, dt, S, st) {
      const { cols, rows } = g, hz = st.horizon, cx = cols / 2;
      // Gökyüzü ve yıldızlar
      for (let y = 0; y < hz; y++) for (let x = 0; x < cols; x++) {
        const h = AW.hash(x, y);
        if (h < 0.01 && y < hz * 0.6) g.set(x, y, h < 0.003 ? "+" : ".", "#c9b6ff");
        else if (h < 0.05 + (y / hz) * 0.15) g.set(x, y, "-", AW.hsl(300 - (y / hz) * 40, 70, 10 + (y / hz) * 15));
      }
      // Güneş
      const r = rows * 0.24, sy = hz - r * 0.35;
      for (let y = Math.floor(sy - r); y < hz; y++) {
        const v = (y - (sy - r)) / (2 * r);
        const gap = v > 0.35 && Math.floor((y - (sy - r)) * 0.7 + t * 2) % 3 === 0;
        if (gap) continue;
        for (let x = Math.floor(cx - r / g.aspect); x < cx + r / g.aspect; x++) {
          const dx = (x - cx) * g.aspect, dy = y - sy;
          if (dx * dx + dy * dy > r * r) continue;
          g.set(x, y, "█", AW.rgb(AW.mix([255, 230, 90], [255, 40, 150], AW.clamp(v * 1.4, 0, 1))));
        }
      }
      // Dağlar
      for (let x = 0; x < cols; x++) {
        const top = Math.floor(st.ridge[x]);
        for (let y = top; y < hz; y++) {
          const sl = st.ridge[x + 1] - st.ridge[x];
          g.set(x, y, y === top ? (sl < -0.2 ? "/" : sl > 0.2 ? "\\" : "^") : " ", y === top ? "#ff4fd8" : null);
          g.setBg(x, y, "#1a0638");
        }
      }
      // Izgara yol
      st.z += dt * (1.2 + AW.clamp(S.down / 10, 0, 3));
      const depthAt = (y) => 14 / (y - hz + 0.6);
      const lane = (x, y) => Math.floor((((x - cx) * g.aspect) / (y - hz + 0.6)) * 1.6 + 0.5);
      for (let y = hz; y < rows; y++) {
        const lineH = Math.floor(depthAt(y) + st.z) !== Math.floor(depthAt(y + 1) + st.z);
        const glow = AW.clamp((y - hz) / (rows - hz) + 0.25, 0.25, 1);
        for (let x = 0; x < cols; x++) {
          const onV = lane(x, y) !== lane(x + 1, y);
          if (y === hz) g.set(x, y, "=", "#ff6ad5");
          else if (lineH) g.set(x, y, onV ? "+" : "-", AW.hsl(300, 100, 30 + glow * 35));
          else if (onV) g.set(x, y, Math.abs(x - cx) < 1 ? "|" : x < cx ? "/" : "\\", AW.hsl(185, 100, 25 + glow * 35));
        }
      }
    },
  });
})(globalThis);
