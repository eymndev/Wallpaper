// Sahnenin üstüne çizilen arayüz katmanı: büyük saat, sistem paneli, tema adı ve tema bildirimi.
(function (G) {
  const AW = G.AW;

  AW.defaultUI = {
    ink: "#e9e4d6",
    dim: "#8a8fa8",
    accent: "#ffb35c",
    accent2: "#7fd0d9",
    warn: "#ff7a5c",
    frame: "#5d6690",
    panel: "rgba(9,12,26,0.86)",
  };

  const FONT = {
    "0": ["███", "█ █", "█ █", "█ █", "███"],
    "1": [" █ ", "██ ", " █ ", " █ ", "███"],
    "2": ["███", "  █", "███", "█  ", "███"],
    "3": ["███", "  █", "███", "  █", "███"],
    "4": ["█ █", "█ █", "███", "  █", "  █"],
    "5": ["███", "█  ", "███", "  █", "███"],
    "6": ["███", "█  ", "███", "█ █", "███"],
    "7": ["███", "  █", "  █", "  █", "  █"],
    "8": ["███", "█ █", "███", "█ █", "███"],
    "9": ["███", "█ █", "███", "  █", "███"],
    ":": ["   ", " █ ", "   ", " █ ", "   "],
  };

  AW.bigFont = FONT;

  // Büyük rakamlar: her "piksel" iki hücre genişliğinde
  function bigText(g, x, y, s, col, showColon) {
    let cx = x;
    for (const ch of s) {
      const glyph = FONT[ch];
      if (glyph && (ch !== ":" || showColon)) {
        glyph.forEach((ln, i) => {
          for (let j = 0; j < 3; j++) if (ln[j] !== " ") g.put(cx + j * 2, y + i, "██", col);
        });
      }
      cx += ch === ":" ? 6 : 8;
    }
    return cx - x;
  }

  const bar = (v, max, n) => {
    const f = AW.clamp(Math.round((v / max) * n), 0, n);
    return "█".repeat(f) + "░".repeat(n - f);
  };

  const spark = (arr, max) => {
    const r = "▁▂▃▄▅▆▇█";
    return arr.map((v) => r[AW.clamp(Math.floor((v / max) * 7.99), 0, 7)]).join("");
  };

  const fmtRate = (mb) => (mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)) + " MB/s";

  function panel(g, x, y, W, t, S, ui) {
    const lines = [];
    const line = (s, col) => lines.push([s, col]);
    const inner = W - 4;
    const fit = (s) => (s.length > inner ? s.slice(0, inner - 1) + "…" : s + " ".repeat(inner - s.length));
    const bw = Math.max(6, W - 17);

    line(`CPU  ${bar(S.cpu, 100, bw)} ${String(Math.round(S.cpu)).padStart(3)}%`, S.cpu > 85 ? ui.warn : ui.accent);
    line(`     ${spark(S.cpuHist, 100).slice(-bw)}`, ui.dim);
    line(`RAM  ${bar(S.ram, S.ramTotal, bw)} ${S.ram.toFixed(1).padStart(4)}G`, ui.accent2);
    if (S.battery != null) {
      line(`PİL  ${bar(S.battery, 100, bw)} ${String(Math.round(S.battery)).padStart(3)}%`, S.battery < 20 && !S.charging ? ui.warn : ui.ink);
      line(`     ${S.charging ? "şarj oluyor" : S.onBattery ? "pilde" : "prizde"}`, ui.dim);
    }
    line(`AĞ   ↓ ${fmtRate(S.down)}   ↑ ${fmtRate(S.up)}`, ui.ink);
    line(`     ${spark(S.netHist, Math.max(5, ...S.netHist)).slice(-bw)}`, ui.dim);

    if (S.track) {
      line("─", null);
      line("♪ şimdi çalıyor", ui.dim);
      const tr = S.track + "   ·   ";
      if (tr.length - 7 <= inner - 2) line("  " + S.track, ui.accent);
      else {
        const off = Math.floor(t * 4) % tr.length;
        line("  " + (tr + tr).slice(off, off + inner - 2), ui.accent);
      }
    }
    if (S.weather) {
      line("─", null);
      line(S.weather, ui.ink);
    }

    const H = lines.length + 2;
    const title = S.live ? " SİSTEM " : " SİSTEM · örnek veri ";
    g.fillBg(x, y, W, H, ui.panel);
    g.put(x, y, "┌─" + "─".repeat(title.length) + "─".repeat(Math.max(0, W - 3 - title.length)) + "┐", ui.frame);
    g.put(x + 2, y, title, ui.ink);
    lines.forEach(([s, col], i) => {
      const yy = y + 1 + i;
      if (s === "─") return g.put(x, yy, "├" + "─".repeat(W - 2) + "┤", ui.frame);
      g.put(x, yy, "│", ui.frame);
      g.put(x + W - 1, yy, "│", ui.frame);
      g.put(x + 2, yy, fit(s), col);
    });
    g.put(x, y + H - 1, "└" + "─".repeat(W - 2) + "┘", ui.frame);
    return H;
  }

  // opts: { showPanel, showClock, themeName, showThemeName, toast, toastUntil }
  AW.drawUI = (g, now, t, S, ui, opts = {}) => {
    ui = Object.assign({}, AW.defaultUI, ui || {});
    const cx = 4, cy = 2;
    let bottom = cy;

    if (opts.showClock !== false && g.cols >= 40 && g.rows >= 14) {
      // Görselin önemli kısmı sol üstteyse tema saati sol alta alabilir
      const ky = ui.clockBottom && g.rows >= 30 ? g.rows - 14 : cy;
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const blink = opts.reduceMotion || now.getSeconds() % 2 === 0;
      const date = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toLocaleLowerCase("tr-TR");
      const w = Math.max(38, date.length);
      g.fillBg(cx - 2, ky - 1, w + 4, 10, ui.panel);
      bigText(g, cx, ky, hh + ":" + mm, ui.ink, blink);
      g.put(cx, ky + 6, date, ui.dim);
      g.put(cx, ky + 7, "─".repeat(date.length), ui.frame);
      if (ky === cy) bottom = cy + 10;
    }

    if (opts.showPanel !== false && g.cols >= 40 && g.rows >= 20) {
      const W = Math.min(40, g.cols - 6);
      if (g.cols >= 100) panel(g, g.cols - W - 4, cy, W, t, S, ui);
      else panel(g, cx - 2, bottom + 1, W, t, S, ui);
    }

    // Sağ alt köşede etkin temanın adı
    if (opts.themeName && opts.showThemeName !== false && g.cols >= 30 && g.rows >= 10) {
      const max = Math.min(40, g.cols - 8);
      const name = opts.themeName.length > max ? opts.themeName.slice(0, max - 1) + "…" : opts.themeName;
      const w = name.length + 6;
      const x = g.cols - w - 2, y = g.rows - 2;
      g.fillBg(x, y - 1, w, 3, ui.panel);
      g.put(x + 2, y, "◆", ui.accent);
      g.put(x + 4, y, name, ui.ink);
    }

    if (opts.toast && opts.toastUntil > t) {
      const s = `  ${opts.toast}  `;
      const y = g.rows - 3;
      g.fillBg(cx - 2, y - 1, s.length + 2, 3, ui.panel);
      g.put(cx - 1, y, s, ui.accent);
    }
  };
})(globalThis);
