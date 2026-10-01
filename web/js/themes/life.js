// Hayat Oyunu: Conway'in hücre otomatı. Hücreler yaşlandıkça renk değiştirir;
// sistem durağanlaşınca yeniden tohumlanır, CPU sıçramaları planör fırlatır.
(function (G) {
  const AW = G.AW;
  const GLIDER = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];

  function seed(st, cols, rows) {
    for (let i = 0; i < st.cells.length; i++) {
      st.cells[i] = Math.random() < 0.18 ? 1 : 0;
      st.age[i] = 0;
    }
  }

  AW.register({
    id: "life",
    name: "Hayat Oyunu",
    bg: "#05070a",
    ui: { accent: "#7cf0c8", accent2: "#f0a87c", frame: "#2f4a52", panel: "rgba(5,8,10,0.88)" },
    init(g) {
      const st = { cells: new Uint8Array(g.cols * g.rows), next: new Uint8Array(g.cols * g.rows), age: new Uint16Array(g.cols * g.rows), acc: 0, pops: [], lastCpu: 0 };
      seed(st, g.cols, g.rows);
      return st;
    },
    frame(g, t, dt, S, st) {
      const { cols, rows } = g;
      st.acc += dt;
      while (st.acc > 0.12) {
        st.acc -= 0.12;
        let pop = 0;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          let n = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (dx || dy) n += st.cells[((y + dy + rows) % rows) * cols + ((x + dx + cols) % cols)];
          }
          const i = y * cols + x, alive = st.cells[i];
          const v = alive ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
          st.next[i] = v;
          st.age[i] = v ? (alive ? Math.min(st.age[i] + 1, 999) : 0) : 0;
          pop += v;
        }
        [st.cells, st.next] = [st.next, st.cells];
        st.pops.push(pop);
        if (st.pops.length > 60) st.pops.shift();
        const stale = st.pops.length === 60 && Math.max(...st.pops) - Math.min(...st.pops) < cols * rows * 0.002;
        if (stale || pop < cols * rows * 0.01) { seed(st, cols, rows); st.pops = []; }
      }
      // CPU sıçraması: rastgele bir yere planör bırak
      if (S.cpu - st.lastCpu > 15) {
        const ox = Math.floor(Math.random() * (cols - 3)), oy = Math.floor(Math.random() * (rows - 3));
        for (const [dx, dy] of GLIDER) st.cells[(oy + dy) * cols + ox + dx] = 1;
      }
      st.lastCpu = S.cpu;
      for (let i = 0; i < st.cells.length; i++) {
        if (!st.cells[i]) continue;
        const a = st.age[i];
        const x = i % cols, y = (i / cols) | 0;
        g.set(x, y, a < 2 ? "█" : a < 8 ? "▓" : a < 30 ? "▒" : "░", AW.hsl(165 - Math.min(a, 60) * 2.6, 70, a < 2 ? 75 : 55 - Math.min(a, 60) * 0.3));
      }
    },
  });
})(globalThis);
