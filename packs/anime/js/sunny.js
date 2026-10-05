// One Piece: Hasır Şapka Korsanları, Thousand Sunny'nin güvertesinde. Mürettebat kullanıcının gönderdiği
// grup görselinden (gökyüzü ayıklandı, kenarları yumuşatıldı); gemi (gövde, aslan başı, direk ve korsan bayraklı
// yelken) görselin üstüne çizildi, sonra hepsi 640x360 kodlandı. Kaynak görsel depoya eklenmedi.
// Görsel verisi sunny/sunny.data.js (bkz. web/js/image.js); verideki `mask` gemiyle mürettebatı (1) gökyüzü ve
// denizden (0) ayırır. Canlı çizilenler: gemi dalgalarla bir iki satır inip kalkar, deniz ve bulutlar geriye
// akar, gövdede köpük, aslan başının önünde serpinti, kıçta dümen suyu, gökyüzünde martılar.
(function (G) {
  const AW = G.AW;

  const HOR = 0.62, WATER = 0.865; // ufuk ve geminin su çizgisi (görselde 0..1)
  const BOW = 0.885, STERN = 0.035; // aslan başının ucu ve kıç
  const BOB = 4.5; // sallanma periyodu (sn)

  const SKY_TOP = [44, 112, 200], SKY_LOW = [150, 202, 240];
  const SEA_FAR = [86, 158, 212], SEA_NEAR = [20, 74, 138];
  const CLOUD = [246, 250, 255], CLOUD_SH = [178, 200, 228];
  const CREST = [150, 210, 244], FOAM = [238, 248, 255], GULL = [250, 252, 255];
  const SEA_CH = ".--~~", SKY_CH = " -%@";

  // Renkleri biraz yuvarla ve önbellekte tut (bkz. deathnote.js)
  const colors = new Map();
  const col = (c, k = 1) => {
    const r = Math.min(255, c[0] * k) >> 2, gg = Math.min(255, c[1] * k) >> 2, b = Math.min(255, c[2] * k) >> 2;
    const key = (r << 12) | (gg << 6) | b;
    let v = colors.get(key);
    if (!v) colors.set(key, (v = `rgb(${r << 2},${gg << 2},${b << 2})`));
    return v;
  };

  AW.imageTheme({
    id: "thousand-sunny",
    name: "Thousand Sunny",
    image: "sunny",
    bg: "#080b12",
    gamma: 0.85,
    floor: 0.05,
    bgDim: 0.7,
    ui: { accent: "#ffcc33", accent2: "#ff5a4a", frame: "#2c5688", panel: "rgba(8,22,44,0.88)" },

    setup(g, st) {
      const m = st.map, d = AW.imageData.sunny;
      if (!m || !d || !d.mask) return;
      const bits = AW.decode64(d.mask), stride = Math.ceil(d.w / 8);
      const { cols, rows } = g, ship = new Uint8Array(cols * rows);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const ix = AW.clamp(Math.floor(m.px(x)), 0, d.w - 1), iy = AW.clamp(Math.floor(m.py(y)), 0, d.h - 1);
        ship[y * cols + x] = (bits[iy * stride + (ix >> 3)] >> (7 - (ix & 7))) & 1;
      }
      const gulls = [];
      for (let i = 0; i < 4; i++) gulls.push({ x: Math.random() * cols, y: m.y(0.04 + Math.random() * 0.4), v: AW.rand(0.6, 1.6), f: Math.random() * 6 });
      // Satır başına deniz ve gökyüzü renkleri (seviyelere göre): karede yalnız gürültü hesaplanır
      const hy = m.y(HOR), seaPal = [], skyPal = [];
      for (let y = 0; y < rows; y++) {
        const z = AW.clamp((y - hy) / Math.max(1, rows - hy), 0, 1), base = AW.mix(SEA_FAR, SEA_NEAR, Math.sqrt(z));
        seaPal.push({
          p: 0.25 + z, v: 0.9 - 0.5 * z,
          fg: [col(base, 1.3), col(base, 1.45), col(AW.mix(base, CREST, 0.55)), col(CREST), col(FOAM, 0.92)],
          bg: [col(base, 0.6), col(base, 0.66), col(base, 0.66), col(base, 0.72), col(base, 0.78)],
        });
        const s = AW.clamp(y / hy, 0, 1), sb = AW.mix(SKY_TOP, SKY_LOW, s * s);
        skyPal.push({
          fg: [col(sb, 1.25), col(AW.mix(sb, CLOUD, 0.6)), col(CLOUD), col(CLOUD)],
          bg: [col(sb, 0.6), col(sb, 0.64), col(AW.mix(sb, CLOUD_SH, 0.6), 0.72), col(AW.mix(sb, CLOUD, 0.85), 0.8)],
        });
      }
      st.extra = {
        ship, gulls, seaPal, skyPal, foam: col(FOAM), spray: [], hy, wy: m.y(WATER), bow: m.x(BOW), stern: m.x(STERN),
        surf: new Float32Array(cols), sky: { ch: new Array(cols * rows), fg: [], bg: [] }, wave: new Array(cols * rows), tick: 0,
      };
    },

    overlay(g, t, dt, S, st) {
      const e = st.extra;
      if (!e.ship) return;
      const { cols, rows, aspect } = g, hs = st.map.hs, run = st.phase;
      const tick = (e.tick = (e.tick + 1) % 3);

      // Gemi dalgalarla tam satır adımlarıyla iner kalkar: sayfa yalnız adım anlarında gemiyi yeniden çizer
      const b = Math.sin((t / BOB) * Math.PI * 2) * 0.8 + Math.sin((t / (BOB * 2.3)) * Math.PI * 2 + 1) * 0.2;
      const dy = Math.round(b * hs * 0.017);

      // Su yüzeyi: sütun başına satır; dalgalar sola akar (gemi sağa gidiyor)
      for (let x = 0; x < cols; x++) {
        const u = (x * aspect) / hs;
        e.surf[x] = e.wy + 0.55 * Math.sin(u * 14 + run * 2.4) + 0.35 * Math.sin(u * 31 + run * 3.3 + 2);
      }

      // Deniz: her hücre iki karede bir hesaplanır
      const sky = e.sky, wave = e.wave, odd = e.tick & 1, sea = (k, x, y) => {
        if (wave[k] !== undefined && (k & 1) !== odd) {
          const P = e.seaPal[y], lv = wave[k];
          g.ch[k] = lv < 0 ? "*" : SEA_CH[lv]; g.fg[k] = lv < 0 ? e.foam : P.fg[lv]; g.bg[k] = P.bg[lv < 0 ? 3 : lv];
          return;
        }
        const P = e.seaPal[y], u = (x * aspect) / hs;
        const n = AW.noise2((u * 3.2) / P.p + run * 0.55, (y - e.hy) * P.v) * 0.7 + AW.noise2((u * 8) / P.p + run * 0.9 + 4, (y - e.hy) * 1.3) * 0.3;
        const lv = n > 0.68 ? 4 : n > 0.58 ? 3 : n > 0.47 ? 2 : n > 0.36 ? 1 : 0;
        g.ch[k] = SEA_CH[lv]; g.fg[k] = P.fg[lv]; g.bg[k] = P.bg[lv];
        wave[k] = lv;
        // Güneş pırıltısı
        if (lv >= 3 && AW.hash(x, y + Math.floor(t * 3)) > 0.985) { g.ch[k] = "*"; g.fg[k] = e.foam; wave[k] = -1; }
      };

      for (let y = 0; y < rows; y++) {
        const sy = y - dy, inImg = sy >= 0 && sy < rows;
        for (let x = 0; x < cols; x++) {
          const k = y * cols + x;
          if (y >= e.surf[x]) {
            sea(k, x, y);
            // Gövdenin değdiği yerde köpük
            const up = sy - 1;
            if (y - 1 < e.surf[x] && up >= 0 && up < rows && e.ship[up * cols + x] && x <= e.bow) {
              g.ch[k] = AW.hash(x, Math.floor(t * 4)) > 0.5 ? "~" : "^"; g.fg[k] = col(FOAM);
            }
            continue;
          }
          if (inImg && e.ship[sy * cols + x]) {
            const s = sy * cols + x;
            g.ch[k] = st.ch[s]; g.fg[k] = st.fg[s]; g.bg[k] = st.bg[s];
            continue;
          }
          if (y >= e.hy) { sea(k, x, y); continue; }

          // Gökyüzü ve uzakta yavaşça akan bulutlar: üç karede bir hesaplanır
          if (!sky.ch[k] || k % 3 === tick) {
            const P = e.skyPal[y], u = (x * aspect) / hs + run * 0.018, v = y / hs;
            const n = AW.noise2(u * 1.7, v * 7) * 0.65 + AW.noise2(u * 4.1 + 5, v * 15) * 0.35;
            const c = (n - 0.5) * 3.2, lv = c > 0.66 ? 3 : c > 0.36 ? 2 : c > 0.08 ? 1 : 0;
            sky.ch[k] = lv ? SKY_CH[lv] : AW.hash(x, y) > 0.9 ? "." : " "; sky.fg[k] = P.fg[lv]; sky.bg[k] = P.bg[lv];
          }
          g.ch[k] = sky.ch[k]; g.fg[k] = sky.fg[k]; g.bg[k] = sky.bg[k];
        }
      }

      // Kıçtan geriye uzanan dümen suyu: su yüzeyinin hemen altında sola akan köpük
      const st0 = Math.floor(e.stern);
      for (let x = Math.min(cols - 1, st0 + 2); x >= 0; x--) {
        const far = (st0 - x) / (hs * 0.6);
        for (let j = 0; j < 3; j++) {
          const y = Math.ceil(e.surf[x]) + j;
          if (y >= rows) break;
          const n = AW.noise2(x * 0.35 + run * 6, y * 1.7 + 3);
          if (n < 0.5 + 0.4 * Math.max(0, far) + j * 0.1) continue;
          const k = y * cols + x;
          g.ch[k] = n > 0.75 ? "*" : "~"; g.fg[k] = col(FOAM, 0.95 - 0.25 * j);
        }
      }

      // Aslan başının önünde serpinti
      const speed = 1 + S.cpu / 60;
      if (e.spray.length < 26 && Math.random() < dt * 30 * speed) {
        e.spray.push({ x: e.bow + AW.rand(-1, 1.5), y: e.surf[Math.min(cols - 1, Math.round(e.bow))] - 0.5, vx: AW.rand(2, 9), vy: -AW.rand(3, 9), age: 0, life: AW.rand(0.5, 1.1) });
      }
      for (let i = e.spray.length - 1; i >= 0; i--) {
        const p = e.spray[i];
        p.age += dt; p.x += (p.vx * dt) / aspect; p.y += p.vy * dt; p.vy += 22 * dt;
        const xi = Math.floor(p.x), yi = Math.floor(p.y);
        if (p.age > p.life || xi >= cols || yi >= rows || yi < 0 || (xi >= 0 && yi > e.surf[xi] + 1)) { e.spray.splice(i, 1); continue; }
        const sy = yi - dy;
        if (xi < 0 || (sy >= 0 && sy < rows && e.ship[sy * cols + xi] && yi < e.surf[xi])) continue;
        const k = yi * cols + xi, a = 1 - p.age / p.life;
        g.ch[k] = a > 0.6 ? "*" : a > 0.3 ? "'" : "."; g.fg[k] = col(FOAM, 0.6 + 0.4 * a);
      }

      // Martılar: gökyüzünde kanat çırparak süzülür, geminin önüne geçmez
      for (const m of e.gulls) {
        m.x -= m.v * dt * 3; m.f += dt * 5;
        if (m.x < -3) Object.assign(m, { x: cols + 3, y: st.map.y(0.04 + Math.random() * 0.4), v: AW.rand(0.6, 1.6) });
        const wing = Math.sin(m.f) > 0 ? "\\v/" : "-v-", y = Math.round(m.y + Math.sin(m.f * 0.3) * 0.6);
        for (let i = 0; i < 3; i++) {
          const x = Math.round(m.x) + i - 1, sy = y - dy;
          if (x < 0 || x >= cols || y < 0 || y >= e.hy) continue;
          if (sy >= 0 && sy < rows && e.ship[sy * cols + x]) continue;
          g.ch[y * cols + x] = wing[i]; g.fg[y * cols + x] = col(GULL);
        }
      }
    },
  });
})(globalThis);
