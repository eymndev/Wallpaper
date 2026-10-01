// Şömine: klasik "Doom ateşi" algoritması. CPU yükü alevleri büyütür.
(function (G) {
  const AW = G.AW;
  const LEVELS = 36;
  const CHARS = " .,:;-=+*#%@";
  const STOPS = [[7, 7, 7], [70, 12, 8], [150, 30, 10], [215, 70, 15], [240, 130, 30], [250, 190, 70], [255, 235, 160], [255, 255, 235]];
  const color = (v) => {
    const p = (v / LEVELS) * (STOPS.length - 1), i = Math.floor(p);
    return AW.rgb(AW.mix(STOPS[i], STOPS[Math.min(i + 1, STOPS.length - 1)], p - i));
  };
  const PALETTE = Array.from({ length: LEVELS + 1 }, (_, v) => color(v));

  AW.register({
    id: "fire",
    name: "Şömine",
    bg: "#070505",
    ui: { accent: "#ffb347", accent2: "#ffd88a", frame: "#7a3b22", dim: "#a07a66", panel: "rgba(12,6,4,0.88)" },
    init(g) {
      return { heat: new Uint8Array(g.cols * g.rows), acc: 0, sparks: [] };
    },
    frame(g, t, dt, S, st) {
      const { cols, rows } = g, heat = st.heat;
      const height = 0.45 + (S.cpu / 100) * 0.35; // alevin ekran yüksekliğine oranı
      const p = AW.clamp((LEVELS * 0.75) / (height * rows), 0.05, 1);
      st.acc += dt;
      while (st.acc > 1 / 30) {
        st.acc -= 1 / 30;
        for (let x = 0; x < cols; x++) {
          const base = 0.82 + 0.18 * AW.noise1(x * 0.15 + t * 1.2);
          heat[(rows - 1) * cols + x] = Math.floor(LEVELS * base);
        }
        for (let y = 1; y < rows; y++) for (let x = 0; x < cols; x++) {
          const src = y * cols + x;
          const r = Math.random();
          const decay = r < p ? 1 : 0;
          const dx = Math.floor(Math.random() * 3) - 1;
          const dst = src - cols + dx;
          if (dst >= 0) heat[dst] = Math.max(0, heat[src] - decay);
        }
      }
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const v = heat[y * cols + x];
        if (v > 1) g.set(x, y, AW.ramp(CHARS, v / LEVELS), PALETTE[v]);
      }
      // Kıvılcımlar
      if (Math.random() < dt * 8) st.sparks.push({ x: Math.random() * cols, y: rows * (1 - height * 0.8), vx: AW.rand(-3, 3), vy: AW.rand(-12, -5), life: AW.rand(1, 3) });
      st.sparks = st.sparks.filter((s) => (s.life -= dt) > 0);
      for (const s of st.sparks) {
        s.x += s.vx * dt; s.y += s.vy * dt; s.vx += AW.rand(-4, 4) * dt;
        g.set(s.x, s.y, s.life > 1 ? "*" : ".", PALETTE[Math.floor(AW.clamp(s.life / 3, 0, 1) * LEVELS)]);
      }
    },
  });
})(globalThis);
