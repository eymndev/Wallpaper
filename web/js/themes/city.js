// Yağmurlu Şehir: gece silüeti, yanıp sönen pencereler, yağmur ve caddede akan arabalar.
// Ağ trafiği arttıkça yağmur yoğunlaşır.
(function (G) {
  const AW = G.AW;
  const SKY_TOP = [10, 12, 26], SKY_BOT = [46, 30, 64];
  const WIN_ON = ["#ffd27a", "#ffc861", "#fff0b8", "#9fe3ff"];

  AW.register({
    id: "city",
    name: "Yağmurlu Şehir",
    bg: "#080a14",
    ui: { accent: "#ffc861", accent2: "#9fe3ff", frame: "#51507a", panel: "rgba(8,9,20,0.88)" },
    init(g) {
      const { cols, rows } = g;
      const ground = rows - 3;
      const buildings = [];
      // Arka sıra (soluk) ve ön sıra (koyu) binalar
      for (const layer of [0, 1]) {
        let x = -2;
        while (x < cols) {
          const w = Math.floor(AW.rand(6, 16));
          const h = Math.floor(AW.rand(rows * (layer ? 0.18 : 0.3), rows * (layer ? 0.5 : 0.68)));
          buildings.push({ x, w, h, layer, antenna: Math.random() < 0.25, seed: Math.random() * 1000 });
          x += w + (layer ? Math.floor(AW.rand(0, 3)) : 0);
        }
      }
      const lit = new Uint8Array(cols * rows);
      for (let i = 0; i < lit.length; i++) lit[i] = Math.random() < 0.4 ? 1 : 0;
      const drops = Array.from({ length: Math.floor(cols * rows * 0.02) }, () => ({ x: Math.random() * cols, y: Math.random() * rows, s: AW.rand(18, 32) }));
      const cars = Array.from({ length: Math.max(2, Math.floor(cols / 40)) }, () => ({ x: Math.random() * cols, dir: Math.random() < 0.5 ? 1 : -1, v: AW.rand(8, 20) }));
      return { ground, buildings, lit, drops, cars };
    },
    frame(g, t, dt, S, st) {
      const { cols, rows } = g, ground = st.ground;
      // Gökyüzü
      for (let y = 0; y < ground; y++) {
        const col = AW.rgb(AW.mix(SKY_TOP, SKY_BOT, y / ground), 1.4);
        for (let x = 0; x < cols; x++) {
          const h = AW.hash(x, y);
          if (y < ground * 0.5 && h < 0.006) g.set(x, y, ".", "#8890b8");
          else if (h < 0.03 + (y / ground) * 0.05) g.set(x, y, "·", col);
        }
      }
      // Binalar
      for (const b of st.buildings) {
        const top = ground - b.h;
        const body = b.layer ? "#0d0f1c" : "#151829";
        const edge = b.layer ? "#2c3050" : "#3a3a5c";
        for (let y = top; y < ground; y++) for (let x = b.x; x < b.x + b.w; x++) {
          if (!g.inside(x, y)) continue;
          g.setBg(x, y, body);
          g.set(x, y, " ", null);
          if (y === top) g.set(x, y, "_", edge);
          else if (x === b.x || x === b.x + b.w - 1) g.set(x, y, "|", edge);
          else if ((x - b.x) % 2 === 1 && (y - top) % 2 === 0) {
            const k = y * cols + x;
            if (st.lit[k]) g.set(x, y, b.layer ? "▪" : "■", WIN_ON[Math.floor(AW.hash(x, y) * WIN_ON.length)]);
            else g.set(x, y, "·", edge);
          }
        }
        if (b.antenna && !b.layer) {
          const ax = b.x + Math.floor(b.w / 2);
          g.set(ax, top - 1, "|", edge);
          g.set(ax, top - 2, "|", edge);
          if (Math.sin(t * 3 + b.seed) > 0.3) g.set(ax, top - 3, "•", "#ff4d4d");
        }
      }
      // Pencereler arada bir yanıp söner
      for (let n = 0; n < 3; n++) if (Math.random() < dt * 6) {
        const i = Math.floor(Math.random() * st.lit.length);
        st.lit[i] ^= 1;
      }
      // Cadde
      for (let x = 0; x < cols; x++) {
        g.set(x, ground, "▁", "#3b3d55");
        g.set(x, ground + 1, x % 6 < 3 ? "-" : " ", "#55577a");
        g.set(x, ground + 2, AW.hash(x, 3) < 0.3 ? "." : " ", "#2c2e45");
      }
      for (const c of st.cars) {
        c.x += c.v * c.dir * dt;
        if (c.x > cols + 8) c.x = -8; if (c.x < -8) c.x = cols + 8;
        const y = c.dir > 0 ? ground + 1 : ground + 2;
        const art = c.dir > 0 ? "[==o=o>" : "<o=o==]";
        g.put(c.x, y, art, "#c8cbe0");
        if (c.dir > 0) g.set(c.x + art.length, y, "»", "#fff3b0");
        else { g.set(c.x - 1, y, "«", "#fff3b0"); g.set(c.x + art.length, y, "▪", "#ff4d4d"); }
      }
      // Yağmur
      const density = AW.clamp(0.35 + S.down / 20, 0.35, 1);
      for (let i = 0; i < st.drops.length; i++) {
        const d = st.drops[i];
        d.y += d.s * dt; d.x -= d.s * 0.25 * dt;
        if (d.y >= ground) {
          if (i / st.drops.length < density) g.set(d.x, ground, "o", "#7f9bc7");
          d.y = -Math.random() * 4; d.x = Math.random() * (cols + 10);
        }
        if (i / st.drops.length < density) g.set(d.x, d.y, "/", "#6f86b5");
      }
    },
  });
})(globalThis);
