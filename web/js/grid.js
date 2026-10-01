// Karakter ızgarası: her hücrede bir karakter, bir yazı rengi ve isteğe bağlı bir zemin rengi.
(function (G) {
  const AW = G.AW;

  class Grid {
    constructor(cols, rows, aspect = 0.5) {
      this.resize(cols, rows, aspect);
    }

    resize(cols, rows, aspect = this.aspect || 0.5) {
      this.cols = Math.max(1, cols | 0);
      this.rows = Math.max(1, rows | 0);
      this.aspect = aspect; // hücre genişliği / hücre yüksekliği
      const n = this.cols * this.rows;
      this.ch = new Array(n);
      this.fg = new Array(n);
      this.bg = new Array(n);
      this.clear();
    }

    clear() {
      this.ch.fill(" ");
      this.fg.fill(null);
      this.bg.fill(null);
    }

    inside(x, y) {
      return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
    }

    set(x, y, c, fg) {
      x = Math.floor(x); y = Math.floor(y);
      if (!this.inside(x, y)) return;
      const k = y * this.cols + x;
      this.ch[k] = c;
      this.fg[k] = fg;
    }

    setBg(x, y, bg) {
      x = Math.floor(x); y = Math.floor(y);
      if (this.inside(x, y)) this.bg[y * this.cols + x] = bg;
    }

    get(x, y) {
      x = Math.floor(x); y = Math.floor(y);
      return this.inside(x, y) ? this.ch[y * this.cols + x] : " ";
    }

    put(x, y, s, fg, bg) {
      x = Math.floor(x); y = Math.floor(y);
      for (let i = 0; i < s.length; i++) {
        const xx = x + i;
        if (!this.inside(xx, y)) continue;
        const k = y * this.cols + xx;
        this.ch[k] = s[i];
        this.fg[k] = fg;
        if (bg !== undefined) this.bg[k] = bg;
      }
    }

    // Çok satırlı ASCII çizim; boşluklar saydam sayılır
    sprite(x, y, lines, fg) {
      for (let r = 0; r < lines.length; r++) {
        const ln = lines[r];
        for (let i = 0; i < ln.length; i++) if (ln[i] !== " ") this.set(x + i, y + r, ln[i], fg);
      }
    }

    fillBg(x, y, w, h, bg) {
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
        const xx = Math.floor(x) + c, yy = Math.floor(y) + r;
        if (!this.inside(xx, yy)) continue;
        const k = yy * this.cols + xx;
        this.bg[k] = bg;
        this.ch[k] = " ";
        this.fg[k] = null;
      }
    }
  }

  AW.Grid = Grid;
})(globalThis);
