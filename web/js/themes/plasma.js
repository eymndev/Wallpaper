// Plazma: 90'ların demo sahnesi efekti. Renkler zamanla döner, CPU yükü akışı hızlandırır.
(function (G) {
  const AW = G.AW;
  const CHARS = " .:-=+*#%@";

  AW.register({
    id: "plasma",
    name: "Plazma",
    bg: "#06040c",
    ui: { accent: "#ff9ad5", accent2: "#8be9fd", frame: "#5b4a86", panel: "rgba(6,4,14,0.86)" },
    init() { return { time: 0 }; },
    frame(g, t, dt, S, st) {
      st.time += dt * (0.5 + S.cpu / 120);
      const T = st.time, a = g.aspect;
      const cx = g.cols / 2, cy = g.rows / 2;
      for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
        const X = x * a, Y = y;
        const dx = (x - cx - Math.sin(T * 0.4) * g.cols * 0.25) * a, dy = y - cy - Math.cos(T * 0.3) * g.rows * 0.25;
        const v = Math.sin(X * 0.16 + T)
          + Math.sin(Y * 0.14 - T * 1.3)
          + Math.sin((X + Y) * 0.09 + T * 0.7)
          + Math.sin(Math.sqrt(dx * dx + dy * dy) * 0.22 - T * 1.6);
        const n = (v + 4) / 8; // 0..1
        const hue = 200 + n * 160 + T * 20;
        g.set(x, y, AW.ramp(CHARS, n * n * 1.15), AW.hsl(hue, 75, 18 + n * 52));
      }
    },
  });
})(globalThis);
