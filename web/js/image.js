// Görsel temalar: küçültülmüş bir duvar kağıdını karakter ızgarasına çevirir, üstüne hafif
// efektler (parıltı, nabız, ışık süpürmesi, dalga, yükselen zerreler, akan çizgiler) ekler.
// Görsel verisi tema paketlerinin *.data.js dosyalarında (ör. packs/hyprland/js/hypr); scripts/encode-image.py ile üretilir.
(function (G) {
  const AW = G.AW;
  AW.imageData = AW.imageData || {};

  const RAMP = " .:-=+*#%@";
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const LUT = new Uint8Array(128);
  for (let i = 0; i < B64.length; i++) LUT[B64.charCodeAt(i)] = i;

  function decode64(s) {
    let n = s.length;
    while (n && s[n - 1] === "=") n--;
    const out = new Uint8Array((n * 3) >> 2);
    let acc = 0, bits = 0, o = 0;
    for (let i = 0; i < n; i++) {
      acc = ((acc << 6) | LUT[s.charCodeAt(i)]) & 0xffffff;
      bits += 6;
      if (bits >= 8) { bits -= 8; out[o++] = (acc >> bits) & 255; }
    }
    return out;
  }

  const cache = {};
  function load(id) {
    if (cache[id]) return cache[id];
    const d = AW.imageData[id];
    if (!d) return null;
    const pal = [];
    for (let i = 0; i < d.palette.length; i += 6) {
      pal.push([0, 2, 4].map((j) => parseInt(d.palette.substr(i + j, 2), 16)));
    }
    return (cache[id] = { w: d.w, h: d.h, pal, px: decode64(d.pixels) });
  }

  function hsl(c) {
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (d < 1e-4) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
  }

  const inHue = (h, [a, b]) => (a <= b ? h >= a && h <= b : h >= a || h <= b);

  // Renk kanallarını 4'ün katlarına yuvarlar: sık ızgarada farklı renk sayısı (ve ekran koruyucunun
  // renk başına yaptığı çizim çağrısı) azalır, gözle fark edilmez
  const q4 = (v) => (Math.min(255, Math.max(0, v)) >> 2) << 2;

  // Seviyeye (0..1) göre parlaklığı ayarlanmış yazı rengi: ton korunur, karanlık hücreler de seçilir
  function tint(c, v) {
    const mx = Math.max(c[0], c[1], c[2], 1), k = (55 + 200 * Math.sqrt(AW.clamp(v, 0, 1))) / mx;
    return `rgb(${q4(c[0] * k)},${q4(c[1] * k)},${q4(c[2] * k)})`;
  }

  // Hücre ızgarasını görsele "cover" mantığıyla oturtur; nx, ny görselde 0..1 konum
  function makeMap(g, img) {
    const W = g.cols * g.aspect, H = g.rows;
    const s = Math.max(W / img.w, H / img.h); // satır birimi / görsel pikseli
    const ox = (img.w * s - W) / 2, oy = (img.h * s - H) / 2;
    return {
      s, ox, oy, aspect: g.aspect, iw: img.w, ih: img.h, hs: img.h * s,
      x: (nx) => (nx * img.w * s - ox) / g.aspect,
      y: (ny) => ny * img.h * s - oy,
      // hücre merkezinin görsel pikseli cinsinden konumu
      px: (x) => ((x + 0.5) * g.aspect + ox) / s,
      py: (y) => (y + 0.5 + oy) / s,
    };
  }

  function build(g, def) {
    const img = load(def.image);
    const n = g.cols * g.rows;
    const st = {
      n, ch: new Array(n).fill(" "), fg: new Array(n).fill(null), bg: new Array(n).fill(null),
      v: new Float32Array(n), col: new Array(n), edge: new Array(n).fill(null),
      twinkle: [], glow: [], motes: [], streaks: [], extra: {},
    };
    if (!img) return st;
    const map = (st.map = makeMap(g, img));
    const L = new Float32Array(n), gx = new Float32Array(n), gy = new Float32Array(n);
    // Görsel pikselleri arasında doğrusal ara değer: sık ızgarada da yumuşak geçişler
    const pick = (u, v) => {
      const fx = AW.clamp((u + map.ox) / map.s - 0.5, 0, img.w - 1), fy = AW.clamp((v + map.oy) / map.s - 0.5, 0, img.h - 1);
      const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(x0 + 1, img.w - 1), y1 = Math.min(y0 + 1, img.h - 1);
      const tx = fx - x0, ty = fy - y0, P = img.pal, px = img.px;
      const a = P[px[y0 * img.w + x0]], b = P[px[y0 * img.w + x1]], c = P[px[y1 * img.w + x0]], d = P[px[y1 * img.w + x1]];
      const w0 = (1 - tx) * (1 - ty), w1 = tx * (1 - ty), w2 = (1 - tx) * ty, w3 = tx * ty;
      return [a[0] * w0 + b[0] * w1 + c[0] * w2 + d[0] * w3, a[1] * w0 + b[1] * w1 + c[1] * w2 + d[1] * w3, a[2] * w0 + b[2] * w1 + c[2] * w2 + d[2] * w3];
    };
    const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

    for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
      const k = y * g.cols + x;
      let r = 0, gg = 0, b = 0, left = 0, right = 0, top = 0, bot = 0;
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
        const c = pick((x + (i + 0.5) / 3) * g.aspect, y + (j + 0.5) / 3);
        r += c[0]; gg += c[1]; b += c[2];
        const l = lum(c);
        if (i === 0) left += l; else if (i === 2) right += l;
        if (j === 0) top += l; else if (j === 2) bot += l;
      }
      st.col[k] = [r / 9, gg / 9, b / 9];
      L[k] = lum(st.col[k]) / 255;
      gx[k] = (right - left) / 765;
      gy[k] = (bot - top) / 765;
    }

    // Parlaklığı görselin kendi aralığına yay (karanlık duvar kağıtları da dolu görünsün)
    const sorted = Array.from(L).sort((a, b) => a - b);
    const lo = sorted[Math.floor(n * 0.02)] || 0, hi = Math.max(lo + 0.05, sorted[Math.floor(n * 0.997)] || 1);
    const gamma = def.gamma || 0.85, floor = def.floor ?? 0.07, bgDim = def.bgDim ?? 0.6;
    const bgBase = [1, 3, 5].map((i) => parseInt((def.bg || "#000000").substr(i, 2), 16));

    for (let k = 0; k < n; k++) {
      const v = Math.pow(AW.clamp((L[k] - lo) / (hi - lo), 0, 1), gamma);
      st.v[k] = v;
      const c = st.col[k];
      // Zemin rengi hücrenin kendi rengi (karartılmış): tonlar ve yüzler zeminden okunur, karakter dokuyu
      // verir. Yıldız gibi çevresinden çok parlak noktalarda komşuların en karanlığı kullanılır ki kutu gibi
      // görünmesinler. Temanın düz zeminine yakınsa hiç boyanmaz.
      const x = k % g.cols, y = (k / g.cols) | 0;
      let dk = k;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const kk = (y + j) * g.cols + x + i;
        if (x + i >= 0 && x + i < g.cols && y + j >= 0 && y + j < g.rows && L[kk] < L[dk]) dk = kk;
      }
      const d = L[k] - L[dk] < 0.2 ? st.col[k] : st.col[dk], bgc = [d[0] * bgDim, d[1] * bgDim, d[2] * bgDim];
      const dist = Math.abs(bgc[0] - bgBase[0]) + Math.abs(bgc[1] - bgBase[1]) + Math.abs(bgc[2] - bgBase[2]);
      const darker = bgc[0] <= bgBase[0] + 3 && bgc[1] <= bgBase[1] + 3 && bgc[2] <= bgBase[2] + 3;
      st.bg[k] = dist > 10 && !darker ? `rgb(${q4(bgc[0])},${q4(bgc[1])},${q4(bgc[2])})` : null;
      const mag = Math.hypot(gx[k], gy[k]) / (hi - lo);
      // Yalnız belirgin çizgiler kenar karakteri olur; yumuşak geçişler (yüzler) dokuyla kalır
      if (mag > 0.5 && v > 0.12) {
        const ax = Math.abs(gx[k]), ay = Math.abs(gy[k]);
        st.edge[k] = ax > ay * 2.2 ? "|" : ay > ax * 2.2 ? (gy[k] > 0 ? "_" : "-") : gx[k] * gy[k] > 0 ? "/" : "\\";
      }
      st.ch[k] = v < floor ? " " : st.edge[k] || AW.ramp(RAMP, v);
      st.fg[k] = st.ch[k] === " " ? null : tint(c, v);
    }

    // Yıldız gibi tekil parlak noktalar: komşularından belirgin şekilde parlak hücreler
    for (let y = 1; y < g.rows - 1; y++) for (let x = 1; x < g.cols - 1; x++) {
      const k = y * g.cols + x;
      if (st.v[k] < 0.3) continue;
      let sum = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (i || j) sum += st.v[k + j * g.cols + i];
      if (st.v[k] - sum / 8 > (def.twinkleContrast ?? 0.28)) st.twinkle.push(k);
    }

    // Tonuna göre parlayan / titreyen bölgeler
    for (const spec of def.glow || []) {
      const cells = [];
      for (let k = 0; k < n; k++) {
        const [h, s] = hsl(st.col[k]);
        if (st.v[k] >= (spec.lum ?? 0.3) && s >= (spec.sat ?? 0.35) && inHue(h, spec.hue)) cells.push(k);
      }
      st.glow.push({ spec, cells });
    }

    for (let i = 0; i < (def.streaks ? def.streaks.count : 0); i++) st.streaks.push(newStreak(g, def.streaks, true));
    return st;
  }

  function newStreak(g, spec, anywhere) {
    const len = 3 + Math.floor(Math.random() * 14);
    return { x: anywhere ? Math.random() * g.cols : -len, y: Math.floor(Math.random() * g.rows), len, v: AW.rand(4, 14) * (spec.speed || 1) };
  }

  // Hücreyi f katı kadar parlat/karart: karakter yoğunluğu ve renk birlikte değişir
  function light(g, st, k, f, ch) {
    const v = AW.clamp(st.v[k] * f, 0, 1);
    if (v < 0.05 && !ch) { g.ch[k] = " "; return; }
    g.ch[k] = ch || st.edge[k] || AW.ramp(RAMP, Math.max(v, 0.12));
    g.fg[k] = tint(st.col[k], v);
  }

  AW.imageTheme = (def) => {
    AW.register({
      id: def.id,
      name: def.name,
      bg: def.bg,
      ui: def.ui,
      // Sık ızgara: ayrıntı (ve yüzler) okunsun diye küçük yazı
      fontScale: def.fontScale ?? 0.4,
      init(g, S) {
        const st = build(g, def);
        if (def.setup) def.setup(g, st, S);
        return st;
      },
      frame(g, t, dt, S, st) {
        const { cols, rows } = g;
        if (st.n !== cols * rows) return; // ızgara yeniden boyutlanıyor, yeni init bekleniyor
        const speed = 1 + S.cpu / 60;
        for (let k = 0; k < st.n; k++) { g.ch[k] = st.ch[k]; g.fg[k] = st.fg[k]; g.bg[k] = st.bg[k]; }
        st.phase = (st.phase || 0) + dt * speed;

        // Yavaş, gürültüye dayalı ışık dalgalanması
        if (def.shimmer) {
          const a = def.shimmer.amp || 0.35, sc = def.shimmer.scale || 0.06;
          for (let k = 0; k < st.n; k++) {
            if (st.v[k] < 0.15) continue;
            const x = k % cols, y = (k / cols) | 0;
            const w = AW.noise2(x * sc * g.aspect + st.phase * 0.35, y * sc - st.phase * 0.2);
            light(g, st, k, 1 + (w - 0.5) * 2 * a);
          }
        }

        for (const { spec, cells } of st.glow) {
          const sp = (spec.speed || 1) * (spec.cpu === false ? t : st.phase);
          for (const k of cells) {
            const x = k % cols, y = (k / cols) | 0;
            let f;
            if (spec.mode === "flicker") {
              const h = AW.hash(x * 0.37 + Math.floor(sp * 2.5 + AW.hash(x, y) * 7), y);
              f = h < 0.08 ? 0.35 : h > 0.93 ? 1.35 : 1;
            } else {
              f = 1 + (spec.amp || 0.4) * Math.sin(sp * 2 - (x * g.aspect + y) * (spec.wave ?? 0.08));
            }
            light(g, st, k, f);
          }
        }

        for (const k of st.twinkle) {
          const s = 0.5 + 0.5 * Math.sin(t * (1.2 + AW.hash(k, 3) * 2.5) + AW.hash(k, 9) * 50);
          light(g, st, k, 0.45 + 0.75 * s, s > 0.8 ? "*" : s > 0.4 ? "+" : ".");
        }

        // Çapraz ışık süpürmesi
        if (def.sweep) {
          const period = def.sweep.period || 14, bw = def.sweep.width || 5;
          const span = cols * g.aspect + rows + bw * 4;
          const pos = ((st.phase / period) % 1) * span - bw * 2;
          for (let y = 0; y < rows; y++) {
            const x0 = Math.max(0, Math.floor((pos - y - bw) / g.aspect)), x1 = Math.min(cols - 1, Math.ceil((pos - y + bw) / g.aspect));
            for (let x = x0; x <= x1; x++) {
              const k = y * cols + x, d = Math.abs(x * g.aspect + y - pos) / bw;
              if (d < 1 && st.v[k] > 0.08) light(g, st, k, 1 + (def.sweep.amp || 0.6) * (1 - d * d));
            }
          }
        }

        // Bir merkezden yayılan halkalar
        for (const r of def.ripple || []) {
          const cx = st.map.x(r.x), cy = st.map.y(r.y), R = r.r * st.map.hs;
          for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(rows - 1, cy + R); y++) {
            for (let x = Math.max(0, Math.floor(cx - R / g.aspect)); x <= Math.min(cols - 1, cx + R / g.aspect); x++) {
              const d = Math.hypot((x - cx) * g.aspect, y - cy);
              if (d > R) continue;
              const k = y * cols + x;
              const w = Math.max(0, Math.sin((d / R) * (r.rings || 6) * Math.PI - st.phase * (r.speed || 3)));
              if (st.v[k] > 0.05) light(g, st, k, 0.8 + (r.amp || 0.7) * w);
            }
          }
        }

        // Akan çizgiler (yalnız karanlık alanlarda)
        if (def.streaks) {
          for (const s of st.streaks) {
            s.x += s.v * dt * speed;
            if (s.x > cols + 2) Object.assign(s, newStreak(g, def.streaks, false));
            for (let i = 0; i < s.len; i++) {
              const x = Math.floor(s.x) - i, k = s.y * cols + x;
              if (x < 0 || x >= cols || st.v[k] > 0.25) continue;
              const a = 1 - i / s.len;
              g.ch[k] = i === 0 ? "=" : "-";
              g.fg[k] = AW.rgb(def.streaks.color, 0.35 + 0.65 * a);
            }
          }
        }

        // Bir noktadan yükselen zerreler
        if (def.motes) {
          const m = def.motes;
          const want = Math.round((m.count || 40) * Math.min(1.6, speed));
          while (st.motes.length < want) {
            st.motes.push({
              x: st.map.x(m.x + (Math.random() - 0.5) * m.spread), y: st.map.y(m.y + (Math.random() - 0.5) * m.spread * 0.4),
              vy: -AW.rand(1.5, 5) * (m.rise || 1), vx: AW.rand(-0.8, 0.8), life: AW.rand(2, 6), age: 0,
            });
          }
          if (st.motes.length > want) st.motes.length = want;
          for (const p of st.motes) {
            p.age += dt; p.x += p.vx * dt / g.aspect; p.y += p.vy * dt;
            const a = 1 - p.age / p.life;
            if (a <= 0 || p.y < 0) { Object.assign(p, { age: 0, life: AW.rand(2, 6), x: st.map.x(m.x + (Math.random() - 0.5) * m.spread), y: st.map.y(m.y + (Math.random() - 0.5) * m.spread * 0.4) }); continue; }
            g.set(p.x, p.y, a > 0.66 ? "*" : a > 0.33 ? "+" : ".", AW.rgb(m.color, 0.4 + 0.6 * a));
          }
        }

        if (def.overlay) def.overlay(g, t, dt, S, st);
      },
    });
  };

  // Çizimde kullanılmak üzere dışa açılanlar
  AW.imageTint = tint;
  AW.decode64 = decode64;
})(globalThis);
