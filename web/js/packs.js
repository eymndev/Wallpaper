// Tema paketleri. Klasik temalar sayfanın kendisinde; Hyprland, Anime gibi paketler ayrı indirilir ve
// ~/Library/Application Support/ASCII Wallpaper/packs/<paket>/ içine kurulur (scripts/pack.sh). Uygulama kurulu
// paketlerin betiklerini sayfa açılmadan AW_PACKS olarak verir (WallpaperWindow), ekran koruyucu ve testler
// AW.beginPack / AW.endPack arasında kendileri çalıştırır. Tarayıcıda depodan açılınca (geliştirme, önizleme
// ve GIF üretimi) depodaki tüm paketler yüklenir (packs/index.js).
(function (G) {
  const AW = G.AW;
  AW.packs = AW.packs || [{ id: "klasik", name: "Klasik" }];

  // Bu ikisinin arasında kaydolan temalar paketin kimliğini taşır
  AW.beginPack = (pack) => {
    if (!AW.packs.some((p) => p.id === pack.id)) AW.packs.push({ id: pack.id, name: pack.name || pack.id });
    AW.pack = pack.id;
  };
  AW.endPack = () => { AW.pack = "klasik"; };

  const native = G.webkit && G.webkit.messageHandlers && G.webkit.messageHandlers.aw;
  if (G.AW_PACKS) {
    for (const p of G.AW_PACKS) {
      AW.beginPack(p);
      // Bozuk bir paket ötekileri ve sayfayı durdurmasın
      for (const src of p.sources) {
        try { (0, eval)(src); } catch (e) { console.error(`tema paketi ${p.id}: ${e}`); }
      }
      AW.endPack();
    }
    delete G.AW_PACKS;
  } else if (!native && G.document && /^(file|https?):$/.test(G.location.protocol)) {
    G.document.write('<script src="../packs/index.js"><\/script>');
  }
})(globalThis);
