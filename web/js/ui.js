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

  // ---- Claude Code paneli ----
  // Clawd: Claude Code'un açılış ekranındaki maskot. Gövde iki satır, bacaklar iki adım karesi.
  const CLAWD = {
    color: "#d97757",
    eyes: " ▐▛███▜▌ ",
    blink: " ▐█▄█▄█▌ ",
    body: "▝▜█████▛▘",
    cheer: "▗▟█████▙▖", // kollar yukarıda: iş bitti
    legs: ["  ▘▘ ▝▝  ", "  ▝▘ ▝▘  "],
    width: 9,
  };
  const SPIN = "·✢✳✶✻✽✻✶✳✢";
  const STATES = {
    thinking: "düşünüyor",
    tool: "araç çalıştırıyor",
    writing: "yazıyor",
    waiting: "seni bekliyor",
  };
  AW.claudePanelHeight = 15;

  const fmtTokens = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(n | 0));
  const fmtDur = (s) => {
    s = Math.max(0, s | 0);
    if (s < 60) return `${s}sn`;
    if (s < 3600) return `${Math.floor(s / 60)}dk ${String(s % 60).padStart(2, "0")}sn`;
    return `${Math.floor(s / 3600)}sa ${String(Math.floor(s / 60) % 60).padStart(2, "0")}dk`;
  };

  // Metni kelime kelime satırlara böler
  function wrap(s, w) {
    const out = [];
    let cur = "";
    for (const word of String(s).split(/\s+/).filter(Boolean)) {
      const piece = word.length > w ? word.slice(0, w - 1) + "…" : word;
      if (!cur) cur = piece;
      else if (cur.length + 1 + piece.length <= w) cur += " " + piece;
      else { out.push(cur); cur = piece; }
    }
    if (cur) out.push(cur);
    return out;
  }

  // Clawd panelin üst kısmında bir uçtan öbür uca yürür; çalışırken hızlanır, beklerken durup el sallar
  function clawd(g, x, y, w, t, C) {
    const busy = C.state !== "waiting";
    const span = Math.max(1, w - CLAWD.width);
    const speed = C.state === "tool" ? 9 : busy ? 5 : 0;
    let px = 0, dir = 1, step = 0;
    if (speed) {
      const pos = (t * speed) % (span * 2);
      dir = pos < span ? 1 : -1;
      px = Math.round(pos < span ? pos : span * 2 - pos);
      step = Math.floor(t * speed / 1.5) % 2;
    } else px = Math.round(span * 0.5);
    const hop = C.state === "tool" && Math.floor(t * 6) % 4 === 0 ? 1 : 0;
    const blink = t % 4 < 0.18;
    const top = y + 1 - hop;
    const cheer = !busy && t % 3 < 1.2;
    g.sprite(x + px, top, [blink ? CLAWD.blink : CLAWD.eyes, cheer ? CLAWD.cheer : CLAWD.body, CLAWD.legs[busy ? step : 0]], CLAWD.color);
    // Başının üstünde durum: düşünce balonu, araç kıvılcımı ya da uyku
    const bx = AW.clamp(dir > 0 ? x + px + CLAWD.width : x + px - 4, x, x + w - 4);
    if (C.state === "thinking") {
      const n = Math.floor(t * 2.5) % 4;
      g.put(bx, y, ["·", "·°", "·°○", "·°○ "][n], "#e9c3b3");
    } else if (C.state === "tool") {
      g.put(x + px + 4, top - 1, SPIN[Math.floor(t * 10) % SPIN.length], "#ffd28a");
    } else if (!busy) {
      g.put(x + px + CLAWD.width, y, "zZ".slice(0, 1 + (Math.floor(t) % 2)), "#8a8fa8");
    }
  }

  function claudePanel(g, x, y, W, t, C, ui) {
    const H = AW.claudePanelHeight, inner = W - 4;
    const fit = (s) => (s.length > inner ? s.slice(0, inner - 1) + "…" : s);
    const title = ` CLAUDE CODE${C.project ? " · " + C.project : ""} `.slice(0, W - 4);

    g.fillBg(x, y, W, H, ui.panel);
    g.put(x, y, "┌─" + "─".repeat(W - 3) + "┐", ui.frame);
    g.put(x + 2, y, title, CLAWD.color);
    for (let i = 1; i < H - 1; i++) { g.put(x, y + i, "│", ui.frame); g.put(x + W - 1, y + i, "│", ui.frame); }
    g.put(x, y + H - 1, "└" + "─".repeat(W - 2) + "┘", ui.frame);

    // Satır 1-4: Clawd
    clawd(g, x + 2, y + 1, inner, t, C);

    // Satır 5: durum
    let r = y + 5;
    const busy = C.state !== "waiting";
    const spin = busy ? SPIN[Math.floor(t * 8) % SPIN.length] : "✻";
    const dots = busy ? ".".repeat(1 + (Math.floor(t * 2) % 3)) : "";
    g.put(x + 2, r, spin, CLAWD.color);
    g.put(x + 4, r, fit((STATES[C.state] || C.state || "") + dots), busy ? ui.ink : ui.dim);
    if (C.model) {
      const m = C.model.slice(0, 16);
      g.put(x + W - 2 - m.length, r, m, ui.dim);
    }

    // Satır 6: araç
    r++;
    const tool = C.tool || (C.lastTool ? "son: " + C.lastTool : "");
    if (tool) g.put(x + 2, r, fit("▸ " + tool), C.tool ? ui.accent2 : ui.dim);

    // Satır 7: ayraç, 8-10: son düşünce ya da yazdığı (son üç satır)
    r++;
    g.put(x, r, "├" + "─".repeat(W - 2) + "┤", ui.frame);
    const label = C.thoughtKind === "thinking" ? " düşünce " : " son mesaj ";
    if (C.thought) g.put(x + 2, r, label, ui.dim);
    const lines = wrap(C.thought || "", inner).slice(-3);
    lines.forEach((ln, i) => g.put(x + 2, r + 1 + i, ln, C.thoughtKind === "thinking" ? "#e9c3b3" : ui.ink));
    r += 4;

    // Satır 11: ayraç, 12-13: süre ve token
    g.put(x, r, "├" + "─".repeat(W - 2) + "┤", ui.frame);
    g.put(x + 2, r + 1, fit(`⏱ tur ${fmtDur(C.turn)}  ·  oturum ${fmtDur(C.session)}`), ui.ink);
    const tok = `◆ ${fmtTokens(C.tokens || 0)} token  ↓ ${fmtTokens(C.output || 0)}  bağlam ${fmtTokens(C.context || 0)}`;
    g.put(x + 2, r + 2, fit(tok), ui.accent);
    return H;
  }

  AW.claudePanel = claudePanel;

  // opts: { showPanel, showClock, themeName, showThemeName, toast, toastUntil }
  AW.drawUI = (g, now, t, S, ui, opts = {}) => {
    ui = Object.assign({}, AW.defaultUI, ui || {});
    const cx = 4, cy = 2;
    let bottom = cy;
    let rightBottom = 0; // sağ üstteki sistem panelinin alt satırı

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
      if (g.cols >= 100) rightBottom = cy + panel(g, g.cols - W - 4, cy, W, t, S, ui);
      else bottom += 1 + panel(g, cx - 2, bottom + 1, W, t, S, ui);
    }

    // Claude Code çalışıyorsa sağ altta (tema adının üstünde); yer yoksa sol altta, o da yoksa hiç
    if (S.claude && g.cols >= 50 && g.rows >= AW.claudePanelHeight + 6) {
      const W = Math.min(48, g.cols - 6), H = AW.claudePanelHeight;
      const y = g.rows - H - 4, xr = g.cols - W - 4;
      // Sol sütun (saat + dar ekranda sistem paneli) en çok ~44 hücre genişliğinde
      if (y > rightBottom && (y > bottom || xr > cx + 44)) claudePanel(g, xr, y, W, t, S.claude, ui);
      else if (y > bottom && g.cols >= W * 2 + 12) claudePanel(g, cx - 2, y, W, t, S.claude, ui);
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
