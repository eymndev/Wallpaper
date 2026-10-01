// Dönen Simit: Andy Sloane'in meşhur donut.c'sinin JavaScript hali. CPU yükü dönüşü hızlandırır.
(function (G) {
  const AW = G.AW;
  const LUM = ".,-~:;=!*#$@";

  AW.register({
    id: "donut",
    name: "Dönen Simit",
    bg: "#0b0710",
    ui: { accent: "#ffb86b", accent2: "#c9a0ff", frame: "#5a3f66", panel: "rgba(11,7,16,0.86)" },
    init(g) {
      return { A: 1, B: 1, z: new Float32Array(g.cols * g.rows) };
    },
    frame(g, t, dt, S, st) {
      const { cols, rows } = g;
      const spin = 0.6 + S.cpu / 60;
      st.A += dt * 1.1 * spin;
      st.B += dt * 0.55 * spin;
      // Arka plan: yavaş akan nokta deseni
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if ((x + y * 3 + Math.floor(t * 2)) % 11 === 0 && AW.hash(x, y) < 0.5) g.set(x, y, "·", "#2a2033");
      }
      const zb = st.z;
      zb.fill(0);
      const size = Math.min(rows * 0.85, cols * g.aspect * 0.6);
      const cx = cols * 0.5, cy = rows * 0.55;
      const Ky = size * 0.6, Kx = Ky / g.aspect; // ekran ölçeği (hücreler dikdörtgen)
      const cA = Math.cos(st.A), sA = Math.sin(st.A), cB = Math.cos(st.B), sB = Math.sin(st.B);
      for (let j = 0; j < 6.28; j += 0.035) {
        const ct = Math.cos(j), stt = Math.sin(j);
        for (let i = 0; i < 6.28; i += 0.015) {
          const sp = Math.sin(i), cp = Math.cos(i);
          const h = ct + 2; // R2 + R1 cos
          const D = 1 / (sp * h * sA + stt * cA + 5);
          const tt = sp * h * cA - stt * sA;
          const x = Math.floor(cx + Kx * D * (cp * h * cB - tt * sB));
          const y = Math.floor(cy + Ky * D * (cp * h * sB + tt * cB));
          const N = 8 * ((stt * sA - sp * ct * cA) * cB - sp * ct * sA - stt * cA - cp * ct * sB);
          if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
          const o = y * cols + x;
          if (D > zb[o]) {
            zb[o] = D;
            const n = AW.clamp(Math.floor(N), 0, 11);
            g.set(x, y, LUM[n], AW.hsl(25 + n * 4, 85, 30 + n * 5));
          }
        }
      }
    },
  });
})(globalThis);
