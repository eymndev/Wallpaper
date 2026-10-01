// Akvaryum: yüzen balıklar, salınan yosunlar, yükselen kabarcıklar. RAM doldukça kabarcık artar.
(function (G) {
  const AW = G.AW;
  const FISH_R = ["><>", "><(((º>", ">=>", "><((('>", "}<(((*>"];
  const FISH_L = ["<><", "<º)))><", "<=<", "<')))><", "<*)))>{"];
  const FISH_COLORS = ["#ffb35c", "#ff7a7a", "#ffe17a", "#8affc1", "#9fb8ff", "#ff9ad5"];

  const newFish = (cols, rows) => {
    const dir = Math.random() < 0.5 ? 1 : -1, kind = Math.floor(Math.random() * FISH_R.length);
    return { x: dir > 0 ? -8 : cols + 8, y: AW.rand(rows * 0.15, rows * 0.82), dir, kind, v: AW.rand(3, 9), ph: Math.random() * 6, col: AW.pick(FISH_COLORS) };
  };

  AW.register({
    id: "aquarium",
    name: "Akvaryum",
    bg: "#021526",
    ui: { accent: "#ffc56b", accent2: "#7fe0ff", frame: "#2b5f80", panel: "rgba(2,18,34,0.86)" },
    init(g) {
      const { cols, rows } = g;
      const fish = Array.from({ length: Math.max(5, Math.floor(cols / 18)) }, () => {
        const f = newFish(cols, rows);
        f.x = Math.random() * cols;
        return f;
      });
      const weeds = [];
      for (let x = 2; x < cols; x += Math.floor(AW.rand(4, 12))) weeds.push({ x, h: Math.floor(AW.rand(rows * 0.1, rows * 0.35)), ph: Math.random() * 6 });
      return { fish, weeds, bubbles: [] };
    },
    frame(g, t, dt, S, st) {
      const { cols, rows } = g, floor = rows - 3;
      // Su: derinleştikçe koyulaşan dalgalı ışık
      for (let y = 0; y < floor; y++) for (let x = 0; x < cols; x++) {
        const n = AW.noise2(x * 0.08 + Math.sin(y * 0.1 + t * 0.4), y * 0.15 - t * 0.3);
        const v = y / floor;
        if (n > 0.66 && AW.hash(x, y) < 0.35) g.set(x, y, n > 0.78 ? "~" : "-", AW.hsl(200, 70, 32 - v * 18));
      }
      // Kum
      for (let y = floor; y < rows; y++) for (let x = 0; x < cols; x++) {
        const h = AW.hash(x, y);
        g.set(x, y, h < 0.3 ? "." : h < 0.45 ? "," : h < 0.5 ? "o" : "_", "#c8a46a");
        g.setBg(x, y, "#3a2e1e");
      }
      // Yosunlar
      for (const w of st.weeds) for (let i = 0; i < w.h; i++) {
        const sway = Math.sin(t * 1.2 + w.ph + i * 0.35) * (i / w.h) * 2;
        g.set(w.x + sway, floor - 1 - i, i % 2 ? "(" : ")", AW.hsl(120 + (i / w.h) * 30, 55, 28 + (i / w.h) * 18));
      }
      // Balıklar
      for (const f of st.fish) {
        f.x += f.v * f.dir * dt;
        const y = f.y + Math.sin(t * 1.5 + f.ph) * 0.8;
        const art = f.dir > 0 ? FISH_R[f.kind] : FISH_L[f.kind];
        g.put(f.x, y, art, f.col);
        if ((f.dir > 0 && f.x > cols + 8) || (f.dir < 0 && f.x < -10)) Object.assign(f, newFish(cols, rows));
        if (Math.random() < dt * 0.4) st.bubbles.push({ x: f.dir > 0 ? f.x + art.length : f.x - 1, y, v: AW.rand(2, 5) });
      }
      // Kabarcıklar
      const rate = 1 + (S.ram / (S.ramTotal || 16)) * 6;
      if (Math.random() < dt * rate) st.bubbles.push({ x: AW.rand(0, cols), y: floor - 1, v: AW.rand(3, 7) });
      st.bubbles = st.bubbles.filter((b) => (b.y -= b.v * dt) > 0);
      for (const b of st.bubbles) {
        b.x += Math.sin(t * 3 + b.v * 10) * dt;
        g.set(b.x, b.y, b.y < rows * 0.3 ? "O" : b.y < rows * 0.6 ? "o" : "°", "#bfe9ff");
      }
    },
  });
})(globalThis);
