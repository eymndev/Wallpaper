// Hiper Uzay: yıldızların arasından ileri uçuş. İndirme hızı arttıkça hızlanır.
(function (G) {
  const AW = G.AW;

  const spawn = (far) => ({ x: AW.rand(-1, 1), y: AW.rand(-1, 1), z: far ? AW.rand(0.6, 1) : AW.rand(0.05, 1), hue: AW.pick([210, 220, 200, 35, 280]) });

  AW.register({
    id: "starfield",
    name: "Hiper Uzay",
    bg: "#02030a",
    ui: { accent: "#9fb8ff", accent2: "#ffd59a", frame: "#3a4478", panel: "rgba(2,3,12,0.88)" },
    init(g) {
      const n = Math.floor((g.cols * g.rows) / 14);
      return { stars: Array.from({ length: n }, () => spawn(false)) };
    },
    frame(g, t, dt, S, st) {
      const cx = g.cols / 2, cy = g.rows / 2;
      const speed = 0.12 + AW.clamp(S.down / 30, 0, 1) * 0.6;
      const scaleX = g.cols * 0.5, scaleY = g.cols * 0.5 * g.aspect;
      // Hafif nebula
      for (let y = 0; y < g.rows; y += 1) for (let x = 0; x < g.cols; x += 1) {
        const n = AW.noise2(x * 0.04 + t * 0.02, y * 0.08);
        if (n > 0.72 && AW.hash(x, y) < 0.3) g.set(x, y, ".", AW.hsl(260 + n * 60, 40, 18 + (n - 0.72) * 60));
      }
      for (const s of st.stars) {
        const pz = s.z;
        s.z -= speed * dt;
        if (s.z <= 0.02) { Object.assign(s, spawn(true)); continue; }
        const sx = cx + (s.x / s.z) * scaleX, sy = cy + (s.y / s.z) * scaleY;
        if (sx < 0 || sy < 0 || sx >= g.cols || sy >= g.rows) { Object.assign(s, spawn(true)); continue; }
        const px = cx + (s.x / pz) * scaleX, py = cy + (s.y / pz) * scaleY;
        const b = 1 - s.z;
        const light = 30 + b * 65;
        // İz
        const steps = Math.min(6, Math.floor(Math.hypot(sx - px, sy - py) * 2));
        for (let i = 1; i <= steps; i++) {
          const k = i / (steps + 1);
          g.set(sx + (px - sx) * k, sy + (py - sy) * k, Math.abs(sx - px) > Math.abs(sy - py) * 2 ? "-" : Math.abs(sy - py) > Math.abs(sx - px) * 2 ? "|" : (sx - px) * (sy - py) > 0 ? "\\" : "/", AW.hsl(s.hue, 50, light * 0.5));
        }
        g.set(sx, sy, b > 0.85 ? "@" : b > 0.65 ? "*" : b > 0.4 ? "+" : ".", AW.hsl(s.hue, b > 0.6 ? 60 : 30, light));
      }
    },
  });
})(globalThis);
