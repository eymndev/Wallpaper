// Tarayıcısız sürücü: ekran koruyucu temaları JavaScriptCore içinde, canvas ve web görünümü
// olmadan çalıştırır. Her kare tek bir metin olarak döner; hücre başına 5 UTF-16 birimi:
// karakter, yazı rengi (2 birim) ve zemin rengi (2 birim). Renk birimleri: üst = 1 + 12 bit,
// alt = 12 bit (r8 g8 b8); üst birim 0 ise renk yok. Yarı saydam renkler temanın zeminiyle
// önceden karıştırılır. index.html'deki betiklerden sonra (main.js hariç) yüklenir.
(function (G) {
  const AW = G.AW;
  const S = {
    cpu: 20, ram: 8, ramTotal: 16, battery: null, charging: false, onBattery: false,
    down: 0, up: 0, cpuHist: Array(40).fill(20), netHist: Array(40).fill(0), track: "", weather: "", live: true,
  };
  const st = { grid: new AW.Grid(10, 10), theme: null, themeState: null, t: 0, showPanel: false, showClock: true, showThemeName: true };
  let base = [0, 0, 0];
  let cache = new Map();

  function parse(c) {
    let m;
    if (c[0] === "#") {
      const h = c.length === 4 ? c.slice(1).split("").map((x) => x + x).join("") : c.slice(1, 7);
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
    }
    if ((m = /^rgba?\(([^)]+)\)/.exec(c))) {
      const p = m[1].split(",").map(Number);
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    if ((m = /^hsla?\(([^)]+)\)/.exec(c))) {
      const p = m[1].split(",").map((x) => parseFloat(x));
      const h = (((p[0] % 360) + 360) % 360) / 360, s = p[1] / 100, l = p[2] / 100;
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
      const f = (t) => {
        t = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
        return 255 * (t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp);
      };
      return [f(h + 1 / 3), f(h), f(h - 1 / 3), p.length > 3 ? p[3] : 1];
    }
    return [255, 255, 255, 1];
  }

  // Rengi iki birime çevirir (önbellekli)
  function code(c) {
    if (!c) return 0;
    let v = cache.get(c);
    if (v === undefined) {
      const [r, g, b, a] = parse(c);
      const mix = (x, y) => AW.clamp(Math.round(x * a + y * (1 - a)), 0, 255);
      v = (mix(r, base[0]) << 16) | (mix(g, base[1]) << 8) | mix(b, base[2]);
      if (cache.size > 50000) cache = new Map();
      cache.set(c, v);
    }
    return v + 1; // 0 = renk yok
  }

  function initTheme() {
    st.themeState = st.theme.init ? st.theme.init(st.grid, S) || {} : {};
  }

  G.AWH = {
    themes: () => JSON.stringify(AW.themes.map((t) => ({ id: t.id, name: t.name }))),
    // Temayı seçer; ızgara boyutu için yazı ölçeği ve zemin rengi döner
    setTheme(id) {
      st.theme = AW.findTheme(id) || AW.themes[0];
      base = parse(st.theme.bg || "#000000").slice(0, 3);
      cache = new Map();
      initTheme();
      return JSON.stringify({ id: st.theme.id, fontScale: st.theme.fontScale || 1, bg: base });
    },
    resize(cols, rows, aspect) {
      st.grid.resize(cols, rows, aspect);
      if (st.theme) initTheme();
    },
    setOptions(panel, clock, name) {
      st.showPanel = !!panel;
      st.showClock = !!clock;
      st.showThemeName = name !== false;
    },
    update(d) {
      Object.assign(S, d);
      S.cpuHist.push(S.cpu); S.cpuHist.shift();
      S.netHist.push(S.down); S.netHist.shift();
    },
    frame(dt) {
      const g = st.grid;
      st.t += dt;
      g.clear();
      st.theme.frame(g, st.t, dt, S, st.themeState);
      AW.drawUI(g, new Date(), st.t, S, st.theme.ui, {
        showPanel: st.showPanel, showClock: st.showClock, themeName: st.theme.name, showThemeName: st.showThemeName,
      });
      const n = g.cols * g.rows, out = new Array(n * 5);
      for (let k = 0, o = 0; k < n; k++, o += 5) {
        let c = g.ch[k].charCodeAt(0) || 32;
        if (c >= 0xd800 && c <= 0xdfff) c = 63; // vekil çiftler tek birime sığmaz
        const f = g.fg[k] && c !== 32 ? code(g.fg[k]) : 0, b = code(g.bg[k]);
        out[o] = c;
        out[o + 1] = f ? 1 + ((f - 1) >> 12) : 0;
        out[o + 2] = f ? (f - 1) & 4095 : 0;
        out[o + 3] = b ? 1 + ((b - 1) >> 12) : 0;
        out[o + 4] = b ? (b - 1) & 4095 : 0;
      }
      let s = "";
      for (let i = 0; i < out.length; i += 8192) s += String.fromCharCode.apply(null, out.slice(i, i + 8192));
      return s;
    },
  };
})(globalThis);
