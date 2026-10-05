// Ortak yardımcılar ve tema kaydı. Tüm dosyalar global `AW` nesnesini paylaşır
// (file:// üzerinden de çalışsın diye modül yerine klasik script kullanıyoruz).
(function (G) {
  const AW = (G.AW = G.AW || {});
  AW.themes = AW.themes || [];
  // Kaydolan temanın paketi: Klasik temalar sayfanın içinde, ötekiler ayrı indirilen paketlerden (js/packs.js)
  AW.pack = AW.pack || "klasik";

  AW.register = (theme) => {
    if (!AW.themes.some((t) => t.id === theme.id)) AW.themes.push(Object.assign(theme, { pack: AW.pack }));
  };

  // Adı değişen temaların eski kimlikleri: kayıtlı ayarlar ve eski komutlar yeni temayı açsın
  AW.aliases = { "deathnote-misa": "misa-train" };
  AW.findTheme = (id) => AW.themes.find((t) => t.id === (AW.aliases[id] || id));

  AW.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  AW.lerp = (a, b, t) => a + (b - a) * t;
  AW.fract = (v) => v - Math.floor(v);

  // Konuma bağlı, tekrarlanabilir rastgele sayı (0..1)
  AW.hash = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  AW.noise1 = (x, seed = 7) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return AW.hash(i, seed) * (1 - u) + AW.hash(i + 1, seed) * u;
  };

  AW.noise2 = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = AW.hash(ix, iy), b = AW.hash(ix + 1, iy), c = AW.hash(ix, iy + 1), d = AW.hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };

  AW.fbm = (x, seed = 7) => AW.noise1(x, seed) * 0.6 + AW.noise1(x * 2.1, seed) * 0.28 + AW.noise1(x * 4.3, seed) * 0.12;

  // Renkler [r, g, b] dizisi olarak tutulur, çizimde CSS metnine çevrilir
  AW.mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  AW.rgb = (c, k = 1) => {
    const f = (v) => AW.clamp(Math.round(v * k), 0, 255);
    return `rgb(${f(c[0])},${f(c[1])},${f(c[2])})`;
  };
  AW.hsl = (h, s, l) => `hsl(${((h % 360) + 360) % 360},${s}%,${l}%)`;

  // Yoğunluğa göre karakter seçimi (0..1)
  AW.ramp = (chars, v) => chars[AW.clamp(Math.floor(v * chars.length), 0, chars.length - 1)];

  AW.rand = (lo, hi) => lo + Math.random() * (hi - lo);
  AW.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
})(globalThis);
