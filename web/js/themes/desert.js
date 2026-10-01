// Çöl Batımı: batan güneş, kum tepeleri, kaktüsler, yuvarlanan çalı ve kuşlar.
(function (G) {
  const AW = G.AW;
  const SKY = [[38, 18, 60], [140, 50, 90], [235, 110, 70], [255, 190, 110]];
  const DUNES = [[150, 78, 70], [190, 104, 70], [222, 140, 84]];
  const CACTUS = [
    ["  _  ", " | | _", "_| || |", "\\_  _/", "  ||  ", "  ||  "],
    [" _ ", "| |", "| |_", "|  _|", "| |", "| |"],
  ];

  const skyAt = (v) => {
    const p = v * (SKY.length - 1), i = Math.floor(p);
    return AW.mix(SKY[i], SKY[Math.min(i + 1, SKY.length - 1)], p - i);
  };

  AW.register({
    id: "desert",
    name: "Çöl Batımı",
    bg: "#1d0f24",
    ui: { accent: "#ffcf7a", accent2: "#ff9a76", frame: "#8a4f6a", dim: "#c79a9a", panel: "rgba(28,12,30,0.86)" },
    init(g) {
      const horizon = Math.floor(g.rows * 0.62);
      const cacti = [
        { x: Math.floor(g.cols * 0.14), art: CACTUS[0] },
        { x: Math.floor(g.cols * 0.78), art: CACTUS[1] },
        { x: Math.floor(g.cols * 0.9), art: CACTUS[0] },
      ];
      return { horizon, cacti, weed: null, birds: [] };
    },
    frame(g, t, dt, S, st) {
      const { cols, rows } = g, hz = st.horizon;
      // Gökyüzü
      for (let y = 0; y < hz; y++) {
        const sky = skyAt(y / hz);
        for (let x = 0; x < cols; x++) {
          const h = AW.hash(x, y);
          if (y < hz * 0.25 && h < 0.01) g.set(x, y, ".", "#e8d8ff");
          else if (h < 0.18) g.set(x, y, AW.noise2(x * 0.05 + t * 0.05, y * 0.4) > 0.6 ? "~" : "-", AW.rgb(sky, 1.15));
        }
      }
      // Güneş: ufukta yavaşça batan yarım daire, yatay şeritlerle
      const sx = cols * 0.5, r = rows * 0.2, sy = hz + r * 0.15 + Math.sin(t * 0.05) * r * 0.2;
      for (let y = Math.floor(sy - r); y < hz; y++) for (let x = Math.floor(sx - r / g.aspect); x < sx + r / g.aspect; x++) {
        const dx = (x - sx) * g.aspect, dy = y - sy;
        if (dx * dx + dy * dy > r * r) continue;
        const v = (y - (sy - r)) / r;
        if (v > 0.55 && (y % 2 === 0)) continue; // şeritler
        g.set(x, y, v < 0.4 ? "@" : "#", AW.rgb(AW.mix([255, 238, 150], [255, 120, 80], AW.clamp(v, 0, 1))));
      }
      // Kum tepeleri (3 katman, farklı hızlarda kayar)
      for (let L = 0; L < 3; L++) {
        const base = hz + L * (rows - hz) * 0.28;
        const amp = (rows - hz) * (0.22 + L * 0.08);
        const off = t * (0.4 + L * 0.6);
        for (let x = 0; x < cols; x++) {
          const top = base - Math.sin(x * (0.05 - L * 0.012) + L * 2 + off * 0.02) * amp * 0.5 - AW.fbm(x * 0.03 + L * 9) * amp * 0.5;
          for (let y = Math.max(0, Math.floor(top)); y < rows; y++) {
            const h = AW.hash(x, y + L * 50);
            const edge = y === Math.floor(top);
            g.set(x, y, edge ? "_" : h < 0.25 ? "." : h < 0.32 ? "," : h < 0.36 ? "`" : " ", AW.rgb(DUNES[L], edge ? 1.1 : 0.85));
            g.setBg(x, y, AW.rgb(DUNES[L], 0.42 + L * 0.06));
          }
        }
      }
      // Kaktüsler
      for (const c of st.cacti) g.sprite(c.x, rows - c.art.length - 2, c.art, "#6fbf73");
      // Yuvarlanan çalı
      if (!st.weed && Math.random() < dt * 0.06) st.weed = { x: -3, v: AW.rand(6, 12), ph: 0 };
      if (st.weed) {
        const w = st.weed;
        w.x += w.v * dt; w.ph += dt * 8;
        const y = rows - 3 - Math.abs(Math.sin(w.ph * 0.5)) * 2;
        g.put(w.x, y, Math.floor(w.ph) % 2 ? "(@)" : "{@}", "#8a6a3a");
        if (w.x > cols + 3) st.weed = null;
      }
      // Kuşlar
      if (st.birds.length < 4 && Math.random() < dt * 0.15) st.birds.push({ x: cols + 2, y: AW.rand(rows * 0.12, hz * 0.6), v: AW.rand(4, 8) });
      st.birds = st.birds.filter((b) => (b.x -= b.v * dt) > -3);
      for (const b of st.birds) g.put(b.x, b.y, Math.floor(t * 4 + b.y) % 2 ? "v" : "-", "#3a1a3a");
    },
  });
})(globalThis);
