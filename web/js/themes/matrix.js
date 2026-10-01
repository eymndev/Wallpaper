// Matrix yağmuru: düşen karakter sütunları. CPU yükü yağmuru hızlandırır.
(function (G) {
  const AW = G.AW;
  const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:=*+-<>|";

  const newDrop = (rows, fresh) => ({
    y: fresh ? Math.random() * rows : -Math.random() * rows * 0.8,
    speed: AW.rand(6, 22),
    len: Math.floor(AW.rand(6, rows * 0.7)),
  });

  AW.register({
    id: "matrix",
    name: "Matrix",
    bg: "#020604",
    ui: { accent: "#7dff9a", accent2: "#b4ffd0", frame: "#2f6b45", dim: "#5f8f70", panel: "rgba(2,10,5,0.88)" },
    init(g) {
      const st = { drops: [], cells: [] };
      for (let x = 0; x < g.cols; x++) st.drops.push(x % 2 === 0 || Math.random() < 0.3 ? newDrop(g.rows, true) : null);
      for (let i = 0; i < g.cols * g.rows; i++) st.cells.push(AW.pick(GLYPHS));
      return st;
    },
    frame(g, t, dt, S, st) {
      const boost = 0.7 + S.cpu / 60;
      for (let n = 0; n < g.cols * 0.6; n++) st.cells[Math.floor(Math.random() * st.cells.length)] = AW.pick(GLYPHS);
      for (let x = 0; x < g.cols; x++) {
        let d = st.drops[x];
        if (!d) {
          if (Math.random() < dt * 0.3) st.drops[x] = newDrop(g.rows, false);
          continue;
        }
        d.y += d.speed * boost * dt;
        const head = Math.floor(d.y);
        for (let i = 0; i < d.len; i++) {
          const y = head - i;
          if (y < 0 || y >= g.rows) continue;
          const glyph = st.cells[y * g.cols + x];
          if (i === 0) g.set(x, y, glyph, "#e6ffef");
          else {
            const k = 1 - i / d.len;
            g.set(x, y, glyph, `rgb(${Math.round(20 * k)},${Math.round(90 + 165 * k)},${Math.round(60 * k + 20)})`);
          }
        }
        if (head - d.len > g.rows) st.drops[x] = Math.random() < 0.8 ? newDrop(g.rows, false) : null;
      }
    },
  });
})(globalThis);
