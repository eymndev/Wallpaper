// Death Note: Light Yagami, rüzgarda kravatını gevşetirken. Görsel kare (1977x2004) olduğu için 16:9'a
// yerleştirildi: Light sağda (alt kısmı kırpıldı, sol kenarı karanlığa karışıyor), solda kaynak görseldeki gibi
// koyu, dalgalı rüzgar şeritleri üretildi; kontrast ve renk 1.12. Kaynak görsel depoya eklenmedi.
// Görsel verisi light/light.data.js (bkz. web/js/image.js). Canlı çizilenler: arka planda sağa doğru akan
// rüzgar şeritleri ve arada bir gözlerinde kırmızı bir parıltı.
(function (G) {
  const AW = G.AW;

  // Light'ın silüeti (görselde 0..1): rüzgar yalnız bunun dışındaki karanlık alanda akar
  const FIGURE = [
    [0.565, 0.24], [0.58, 0.12], [0.62, 0.06], [0.68, 0.035], [0.74, 0.045], [0.79, 0.1], [0.815, 0.2], [0.825, 0.3],
    [0.805, 0.4], [0.805, 0.52], [0.835, 0.6], [0.9, 0.655], [1, 0.69], [1, 1], [0.4, 1], [0.4, 0.86], [0.46, 0.76],
    [0.5, 0.665], [0.57, 0.6], [0.62, 0.57], [0.6, 0.48], [0.58, 0.38], [0.565, 0.3],
  ];
  // Gözler: merkez ve yarıçap (görsel yüksekliğine oranla)
  const EYES = [[0.633, 0.365, 0.022], [0.725, 0.33, 0.022]];
  const FLASH_EVERY = 14, FLASH_LEN = 1.8; // sn

  function inside(px, py, pts) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }

  // Renkleri biraz yuvarla ve önbellekte tut (bkz. deathnote.js)
  const colors = new Map();
  const col = (c, k = 1) => {
    const r = Math.min(255, c[0] * k) >> 2, gg = Math.min(255, c[1] * k) >> 2, b = Math.min(255, c[2] * k) >> 2;
    const key = (r << 12) | (gg << 6) | b;
    let v = colors.get(key);
    if (!v) colors.set(key, (v = `rgb(${r << 2},${gg << 2},${b << 2})`));
    return v;
  };

  const WIND = [
    { ch: "-", fg: [44, 56, 56], bg: null },
    { ch: "~", fg: [70, 88, 88], bg: [14, 19, 19] },
    { ch: "=", fg: [104, 124, 122], bg: [20, 27, 27] },
  ];
  const RED = [255, 46, 40];

  AW.imageTheme({
    id: "light-yagami",
    name: "Light Yagami",
    image: "light",
    bg: "#050808",
    gamma: 0.8,
    floor: 0.05,
    bgDim: 0.68,
    sweep: { period: 24, width: 8, amp: 0.25 },
    ui: { accent: "#e8403a", accent2: "#d9b27c", frame: "#4a1e1c", panel: "rgba(6,9,9,0.88)" },

    setup(g, st) {
      const m = st.map;
      if (!m) return;
      const wind = [], eyes = [];
      for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
        const k = y * g.cols + x, nx = m.px(x) / m.iw, ny = m.py(y) / m.ih;
        if (st.v[k] < 0.4 && !inside(nx, ny, FIGURE)) wind.push(k);
      }
      for (const [ex, ey, er] of EYES) {
        const cx = m.x(ex), cy = m.y(ey), R = er * m.hs;
        for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(g.rows - 1, cy + R); y++) {
          for (let x = Math.max(0, Math.floor(cx - R / g.aspect)); x <= Math.min(g.cols - 1, cx + R / g.aspect); x++) {
            const d = Math.hypot((x + 0.5 - cx) * g.aspect, y + 0.5 - cy) / R;
            if (d < 1) eyes.push({ k: y * g.cols + x, w: 1 - d });
          }
        }
      }
      st.extra = { wind, eyes };
    },

    overlay(g, t, dt, S, st) {
      const e = st.extra;
      if (!e.wind) return;
      const { cols } = g, hs = st.map.hs, aspect = g.aspect, drift = st.phase * 0.05;

      // Rüzgar: hafif yukarı eğik, sağa akan uzun şeritler. Seviyeye yuvarlandığı için hücreler yalnız
      // şeridin kenarı geçerken değişir (sayfa yalnız değişen hücreleri çizer).
      for (let i = 0; i < e.wind.length; i++) {
        const k = e.wind[i], x = k % cols, y = (k / cols) | 0;
        const u = (x * aspect) / hs, v = y / hs;
        const w = v + 0.2 * u + 0.035 * Math.sin(u * 3.1 - drift * 7);
        const a = u - drift;
        const n = AW.noise2(a * 2.2, w * 13) * 0.7 + AW.noise2(a * 5.1 + 3, w * 27) * 0.3;
        const lv = n > 0.74 ? 2 : n > 0.66 ? 1 : n > 0.6 ? 0 : -1;
        if (lv < 0) continue;
        const s = WIND[lv];
        g.ch[k] = s.ch; g.fg[k] = col(s.fg); if (s.bg) g.bg[k] = col(s.bg);
      }

      // Gözlerde kırmızı parıltı: birkaç saniyede bir yükselip söner
      const p = (t % FLASH_EVERY) / FLASH_LEN;
      if (p < 1) {
        const f = Math.sin(p * Math.PI) ** 2;
        for (const { k, w } of e.eyes) {
          const a = f * Math.min(1, w * 1.6);
          if (a < 0.04) continue;
          const c = st.col[k];
          g.fg[k] = col(AW.mix(c, RED, a), 1 + 0.6 * a);
          if (st.bg[k]) g.bg[k] = col(AW.mix(c, RED, a * 0.7), 0.5);
        }
      }
    },
  });
})(globalThis);
