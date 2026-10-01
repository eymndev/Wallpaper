// Gece Gölü: ay ışığı, dağlar ve dalgalanan su. CPU yükseldikçe dalgalar hızlanır.
(function (G) {
  const AW = G.AW;
  const C = {
    skyTop: [11, 14, 34], skyBot: [44, 40, 86], star: [205, 214, 255], moon: [255, 214, 150],
    halo: [150, 120, 90], far: [74, 90, 138], near: [46, 58, 96], ridge: [150, 168, 215],
    water: [28, 70, 98], foam: [120, 190, 215], glint: [255, 196, 120],
  };

  AW.register({
    id: "lake",
    name: "Gece Gölü",
    bg: "#070a16",
    init(g) {
      const st = { far: [], near: [], shoot: null };
      const horizon = Math.floor(g.rows * 0.66);
      for (let x = 0; x <= g.cols; x++) {
        st.far[x] = horizon - 1 - Math.pow(AW.fbm(x * 0.04 + 3), 1.6) * g.rows * 0.5;
        st.near[x] = horizon + 1 - Math.pow(AW.fbm(x * 0.028 + 40), 1.4) * g.rows * 0.3;
      }
      st.horizon = horizon;
      return st;
    },
    frame(g, t, dt, S, st) {
      const { cols, rows } = g, horizon = st.horizon;
      const mx = Math.floor(cols * 0.56), my = Math.floor(rows * 0.2), mr = Math.max(3, rows * 0.085);
      const speed = 0.8 + S.cpu / 40;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const h = AW.hash(x, y);
        let c = " ", col = null;
        if (y < horizon) {
          const v = y / horizon, sky = AW.mix(C.skyTop, C.skyBot, v * v);
          const dx = (x - mx) * g.aspect, dy = y - my, d = Math.sqrt(dx * dx + dy * dy);
          if (d < mr) {
            const cr = AW.noise1(x * 0.7 + y * 1.3);
            c = cr > 0.72 ? "%" : cr > 0.55 ? "#" : "@";
            col = AW.rgb(C.moon, cr > 0.55 ? 0.8 : 1);
          } else if (d < mr * 1.9) {
            const a = 1 - (d - mr) / (mr * 0.9);
            if (h < 0.35 + a * 0.4) { c = a > 0.6 ? ":" : "."; col = AW.rgb(AW.mix(sky, C.halo, a)); }
          } else if (y < horizon * 0.72 && h < 0.018) {
            const tw = 0.55 + 0.45 * Math.sin(t * 1.7 + h * 900);
            c = h < 0.004 ? "*" : h < 0.009 ? "+" : ".";
            col = AW.rgb(C.star, tw);
          } else if (h < 0.08 + v * 0.18) {
            c = v > 0.7 ? "-" : ".";
            col = AW.rgb(sky, 1.35);
          }
          if (y >= st.near[x]) {
            const top = y - Math.floor(st.near[x]) < 1;
            c = top ? (st.near[x + 1] < st.near[x] ? "/" : "\\") : h < 0.5 ? "#" : "=";
            col = AW.rgb(top ? C.ridge : C.near, top ? 0.7 : 1);
          } else if (y >= st.far[x]) {
            const top = y - Math.floor(st.far[x]) < 1;
            const sl = (st.far[x + 1] ?? st.far[x]) - (st.far[x - 1] ?? st.far[x]);
            c = top ? (Math.abs(sl) < 0.4 ? "^" : sl < 0 ? "/" : "\\") : h < 0.45 ? ":" : h < 0.75 ? "." : ";";
            col = AW.rgb(top ? C.ridge : C.far);
          }
        } else {
          const depth = (y - horizon) / (rows - horizon);
          const w = Math.sin(x * 0.22 + t * speed + y * 1.1) + Math.sin(x * 0.061 - t * speed * 0.55 + y * 0.4) * 0.8;
          const spread = 2 + depth * mr * 2.2 + Math.sin(t * 2 + y) * 1.2;
          if (Math.abs(x - mx) < spread && w > -0.4 && h < 0.85 - depth * 0.3) {
            c = w > 0.9 ? "=" : "~";
            col = AW.rgb(C.glint, 0.95 - depth * 0.35);
          } else if (w > 1.1) { c = "~"; col = AW.rgb(C.foam, 0.6 + depth * 0.3); }
          else if (w > 0.35) { c = "-"; col = AW.rgb(C.water, 1.2 + depth * 0.4); }
          else if (h < 0.12) { c = "."; col = AW.rgb(C.water); }
        }
        if (col) g.set(x, y, c, col);
      }

      // Kayan yıldız
      if (!st.shoot && Math.random() < dt * 0.08) st.shoot = { x: Math.random() * cols * 0.6, y: Math.random() * horizon * 0.35, life: 0 };
      if (st.shoot) {
        const s = st.shoot;
        for (let i = 0; i < 6; i++) g.set(s.x - i * 1.6, s.y - i * 0.5, i ? "-" : "*", AW.rgb(C.star, 1 - i / 6));
        s.x += 36 * dt; s.y += 11 * dt;
        if ((s.life += dt) > 1.4) st.shoot = null;
      }
    },
  });
})(globalThis);
