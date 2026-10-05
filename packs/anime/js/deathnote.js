// Death Note, son bölüm: Misa, Light'ın öldüğünden habersiz, gün batımında boş bir trende tek başına.
// Vagonun kendisi görselden (deathnote/misa.data.js, bkz. web/js/image.js). Kaynak kare kodlanmadan önce
// Misa'nın çevresi aydınlatıldı (parlaklık 1.7, kontrast 1.3, yumuşak maske), sonra tüm kareye renk 1.2 ve
// kontrast 1.2 uygulandı; yoksa koyu saçı ve elbisesi ASCII'de koltuğa karışıyor. Pencerelerdeki gökyüzü
// canlı çiziliyor: bulutlar akıyor, direkler ve teller geçiyor, gün batımının rengi yavaşça değişiyor.
// Tutamaklar trenin sallantısıyla hafifçe sallanıyor.
(function (G) {
  const AW = G.AW;

  // Pencereler, görselde 0..1 köşe noktalarıyla. dir: dışarının akış yönü (sol duvarda vagonun arkasına,
  // yani sağa; sağ duvarda sola). depth: yakın pencerelerde manzara daha hızlı geçer.
  const WINDOWS = [
    { pts: [[0, 0.03], [0.145, 0.15], [0.147, 0.565], [0, 0.565]], dir: 1, depth: 1 },
    { pts: [[0.16, 0.185], [0.25, 0.258], [0.263, 0.565], [0.162, 0.565]], dir: 1, depth: 0.9 },
    { pts: [[0.372, 0.36], [0.395, 0.372], [0.397, 0.575], [0.373, 0.575]], dir: 1, depth: 0.45 },
    { pts: [[0.958, 0], [1, 0], [1, 0.425], [0.966, 0.43]], dir: -1, depth: 1.1 },
  ];
  // Misa'nın başı ikinci pencerenin önünde: oraya gökyüzü çizilmez
  const MISA = [[0.185, 0.53], [0.187, 0.47], [0.196, 0.443], [0.207, 0.43], [0.22, 0.423], [0.235, 0.428], [0.247, 0.448], [0.252, 0.48], [0.252, 0.6], [0.19, 0.6]];
  // Tavandaki tutamak grupları: x0, y0 (asıldığı yer), x1, y1
  const STRAPS = [
    [0.295, 0.025, 0.34, 0.08],
    [0.335, 0.06, 0.39, 0.125],
    [0.365, 0.105, 0.435, 0.205],
    [0.705, 0, 0.765, 0.115],
    [0.69, 0.13, 0.735, 0.225],
    [0.695, 0.26, 0.74, 0.425],
  ];

  function inside(px, py, pts) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }

  // Renkleri biraz yuvarla ve önbellekte tut: hem hızlı, hem ekran koruyucunun renk önbelleği küçük kalır
  const colors = new Map();
  const col = (c, k = 1) => {
    const r = Math.min(255, c[0] * k) >> 2, gg = Math.min(255, c[1] * k) >> 2, b = Math.min(255, c[2] * k) >> 2;
    const key = (r << 12) | (gg << 6) | b;
    let v = colors.get(key);
    if (!v) colors.set(key, (v = `rgb(${r << 2},${gg << 2},${b << 2})`));
    return v;
  };

  AW.imageTheme({
    id: "misa-train",
    name: "Misa Train",
    image: "misa",
    bg: "#100509",
    gamma: 0.75,
    floor: 0.04,
    bgDim: 0.5,
    sweep: { period: 26, width: 9, amp: 0.3 },
    ui: { accent: "#ff7ab0", accent2: "#ffb27a", frame: "#5c2a4c", panel: "rgba(18,5,14,0.88)" },

    setup(g, st) {
      const m = st.map;
      if (!m) return;
      const sky = [], straps = [];
      for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
        const nx = m.px(x) / m.iw, ny = m.py(y) / m.ih;
        if (inside(nx, ny, MISA)) continue;
        for (const w of WINDOWS) {
          if (!inside(nx, ny, w.pts)) continue;
          sky.push({ k: y * g.cols + x, x, y, w, s: AW.clamp(ny / 0.56, 0, 1), h: AW.hash(x, y) });
          break;
        }
      }
      for (const [x0, y0, x1, y1] of STRAPS) {
        const bx0 = Math.max(0, Math.floor(m.x(x0))), bx1 = Math.min(g.cols - 1, Math.ceil(m.x(x1)));
        const by0 = Math.max(0, Math.floor(m.y(y0))), by1 = Math.min(g.rows - 1, Math.ceil(m.y(y1)));
        if (bx1 - bx0 < 2 || by1 - by0 < 2) continue;
        straps.push({ x0: bx0, x1: bx1, y0: by0, y1: by1, amp: AW.clamp((by1 - by0) * 0.3, 0.6, 2.4) });
      }
      st.extra = { sky, straps, ride: 0 };
    },

    overlay(g, t, dt, S, st) {
      const e = st.extra;
      if (!e.sky) return;
      const { cols } = g;
      e.ride += dt;

      // Tutamaklar: tepesi sabit, alt ucu trenin sallantısıyla bir iki hücre kayar
      const sway = Math.sin(e.ride * 1.15) * 0.75 + Math.sin(e.ride * 0.41 + 1.3) * 0.35;
      for (const b of e.straps) {
        for (let y = b.y0; y <= b.y1; y++) {
          const s = Math.round((b.amp * sway * (y - b.y0)) / (b.y1 - b.y0));
          if (!s) continue;
          for (let x = b.x0; x <= b.x1; x++) {
            const sx = AW.clamp(x - s, 0, cols - 1), k = y * cols + x, sk = y * cols + sx;
            g.ch[k] = st.ch[sk]; g.fg[k] = st.fg[sk]; g.bg[k] = st.bg[sk];
          }
        }
      }

      // Gün batımı üç dakikada bir morla turuncu arasında gidip gelir
      const warm = 0.5 + 0.5 * Math.sin((t / 180) * Math.PI * 2);
      const top = AW.mix([84, 24, 92], [128, 36, 98], warm);
      const mid = AW.mix([214, 58, 128], [240, 82, 92], warm);
      const low = AW.mix([255, 126, 120], [255, 182, 104], warm);
      const rim = AW.mix([255, 170, 200], [255, 214, 150], warm);
      const dark = [62, 16, 52];

      const aspect = g.aspect, run = st.phase * 7; // manzara hızı (satır birimi / sn)
      const hs = st.map.hs, span = hs * 5, w0 = st.map.y(0.13), w1 = st.map.y(0.18);
      const tick = (e.tick = (e.tick || 0) + 1) % 3;
      for (let i = 0; i < e.sky.length; i++) {
        const c = e.sky[i], { k, x, y, w } = c;
        const U = x * aspect * w.dir; // dünya koordinatı: akış yönünde

        // Bulutlar: uzakta, yavaş akan yatay şeritler. Yavaş değiştikleri için her hücre üç karede bir hesaplanır.
        if (!c.ch || i % 3 === tick) {
          const s = c.s;
          const base = s < 0.55 ? AW.mix(top, mid, s / 0.55) : AW.mix(mid, low, (s - 0.55) / 0.45);
          const cu = (U - run * 0.35 * w.depth) * 0.045, cv = (y / hs) * 9;
          const n = AW.noise2(cu, cv) * 0.65 + AW.noise2(cu * 2.3 + 7, cv * 2.1) * 0.35;
          const d = AW.clamp((n - 0.44) * 2.6, 0, 1);
          c.bg = col(base, 0.45 + 0.1 * s);
          if (d > 0.6) { c.ch = "="; c.fg = col(AW.mix(dark, base, 0.55)); c.bg = col(AW.mix(dark, base, 0.4), 0.55); }
          else if (d > 0.3) { c.ch = "="; c.fg = col(AW.mix(dark, base, 0.8)); c.bg = col(AW.mix(dark, base, 0.6), 0.55); }
          else if (d > 0.06) { c.ch = "~"; c.fg = col(rim); }
          else { c.ch = c.h < 0.45 ? "-" : c.h < 0.6 ? "~" : c.h < 0.8 ? "." : " "; c.fg = col(base, 1.2); }
        }
        let ch = c.ch, fg = c.fg, bg = c.bg;

        // Direkler ve teller: yakında, hızlı geçer; teller iki direk arasında sarkar
        const q = ((((U - run * 9 * w.depth) % span) + span) % span) / span, sag = hs * 0.07 * (1 - (2 * q - 1) ** 2);
        if (q < 0.008 / w.depth) { ch = "#"; fg = col(dark, 0.8); bg = col(dark, 0.4); }
        else if (Math.abs(y + 0.5 - w0 - sag) < 0.5 || Math.abs(y + 0.5 - w1 - sag) < 0.5) {
          const slope = (2 * q - 1) * w.dir;
          ch = slope > 0.4 ? "\\" : slope < -0.4 ? "/" : "-";
          fg = col(dark, 0.9);
        }

        g.ch[k] = ch; g.fg[k] = fg; g.bg[k] = bg;
      }
    },
  });
})(globalThis);
