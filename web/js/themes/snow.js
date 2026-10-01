// Karlı Orman: çam ağaçları, yağan kar, ışığı yanan bir kulübe ve bacadan çıkan duman.
(function (G) {
  const AW = G.AW;

  function tree(h) {
    const lines = [];
    for (let i = 0; i < h; i++) {
      const w = 1 + Math.floor(i * 0.9);
      lines.push(" ".repeat(Math.ceil(h * 0.9) - w + 1) + (i === 0 ? "^" : "/" + (i % 2 ? "*" : "^").repeat(Math.max(0, w * 2 - 1)) + "\\"));
    }
    const trunk = " ".repeat(Math.ceil(h * 0.9)) + "||";
    lines.push(trunk);
    return lines;
  }

  const CABIN = [
    "      ___||___",
    "     /        \\",
    "    /__________\\",
    "    |  _    _  |",
    "    | |#|  | | |",
    "    |______|_|_|",
  ];

  AW.register({
    id: "snow",
    name: "Karlı Orman",
    bg: "#0a1020",
    ui: { accent: "#ffd27a", accent2: "#bfe3ff", frame: "#4b5f86", panel: "rgba(8,14,28,0.86)" },
    init(g) {
      const { cols, rows } = g;
      const ground = rows - 4;
      const trees = [];
      for (let x = -4; x < cols; x += Math.floor(AW.rand(5, 11))) {
        const far = Math.random() < 0.5;
        trees.push({ x, h: Math.floor(AW.rand(far ? 4 : 7, far ? 8 : 14)), far });
      }
      trees.sort((a, b) => (a.far === b.far ? 0 : a.far ? -1 : 1));
      const flakes = Array.from({ length: Math.floor(cols * rows * 0.03) }, () => ({ x: Math.random() * cols, y: Math.random() * rows, v: AW.rand(2, 7), ph: Math.random() * 6 }));
      return { ground, trees, flakes, cabinX: Math.floor(cols * 0.62), smoke: [] };
    },
    frame(g, t, dt, S, st) {
      const { cols, rows } = g, ground = st.ground;
      // Gökyüzü
      for (let y = 0; y < ground; y++) for (let x = 0; x < cols; x++) {
        const h = AW.hash(x, y);
        if (y < ground * 0.5 && h < 0.012) g.set(x, y, h < 0.003 ? "+" : ".", `rgba(220,230,255,${0.4 + 0.5 * Math.sin(t + h * 500) ** 2})`);
      }
      // Ay
      g.sprite(cols - 18, 3, [" .--. ", "(    )", " `--' "], "#f2ecd0");
      // Ağaçlar
      for (const tr of st.trees) {
        const art = tree(tr.h);
        g.sprite(tr.x, ground - art.length + (tr.far ? -1 : 1), art, tr.far ? "#2a4a5a" : "#3f7a5c");
        // ağacın üstündeki kar
        g.sprite(tr.x, ground - art.length + (tr.far ? -1 : 1), art.slice(0, 1).map((l) => l.replace("^", "*")), "#e8f0ff");
      }
      // Kulübe
      const cy = ground - CABIN.length + 1;
      g.sprite(st.cabinX, cy, CABIN, "#a07850");
      const glow = 0.8 + 0.2 * Math.sin(t * 5);
      g.set(st.cabinX + 7, cy + 4, "#", `rgba(255,200,90,${glow})`);
      // Duman
      if (Math.random() < dt * 3) st.smoke.push({ x: st.cabinX + 10, y: cy - 1, life: 0 });
      st.smoke = st.smoke.filter((s) => (s.life += dt) < 4);
      for (const s of st.smoke) {
        s.y -= dt * 2; s.x += Math.sin(s.life * 2 + s.y) * dt * 2 + dt * 1.5;
        g.set(s.x, s.y, s.life < 1.5 ? "o" : s.life < 3 ? "~" : ".", `rgba(200,205,220,${1 - s.life / 4})`);
      }
      // Karlı zemin
      for (let y = ground + 1; y < rows; y++) for (let x = 0; x < cols; x++) {
        const h = AW.hash(x, y);
        g.set(x, y, y === ground + 1 ? (h < 0.5 ? "▄" : "▃") : h < 0.2 ? "." : "░", y === ground + 1 ? "#dfe8f7" : "#9fb0cc");
      }
      // Kar taneleri
      for (const f of st.flakes) {
        f.y += f.v * dt; f.x += Math.sin(t + f.ph) * dt * 1.5;
        if (f.y >= rows) { f.y = -1; f.x = Math.random() * cols; }
        g.set(f.x, f.y, f.v > 5.5 ? "*" : f.v > 3.5 ? "+" : ".", f.v > 5 ? "#ffffff" : "#b9c6de");
      }
    },
  });
})(globalThis);
