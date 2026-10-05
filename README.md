<div align="center">

# ASCII Wallpaper

**Mac masaüstün için yaşayan, nefes alan ASCII sanatı.**

CPU'na göre hızlanan dalgalar, indirme hızıyla yoğunlaşan yağmur, köşede saat ve sistem paneli.<br>
Bir de Claude Code çalışırken köşede yürüyen Clawd.

![macOS 13+](https://img.shields.io/badge/macOS-13%2B-000000?logo=apple&logoColor=white)
![Swift](https://img.shields.io/badge/Swift-5.9-F05138?logo=swift&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?logo=javascript&logoColor=black)
![Temalar](https://img.shields.io/badge/tema-23-8a5cf6)
![Ekran koruyucu](https://img.shields.io/badge/ekran%20koruyucu-var-2ea44f)

<p>
  <a href="https://digital-strategy.ec.europa.eu/sites/default/files/2026-06/AI%20LABELS_3x2_AI%20GENERATED_black.png">
    AI Generated
  </a>
</p>

<img src="docs/hero.jpg" alt="ASCII Wallpaper: Hypr · Kath teması, saat, sistem paneli ve Claude Code paneli" width="100%">

[Kurulum](#kurulum) · [Temalar](#temalar) · [Claude Code paneli](#claude-code-paneli) · [Ekran koruyucu](#ekran-koruyucu) · [riceutil](#riceutil-ile-yönetmek) · [Geliştirme](#geliştirme)

</div>

## Neler var

- 🎨 **23 tema**: 13 özgün sahne, Hyprland duvar kağıdı yarışmasının 9 kazanan görselinden üretilmiş ASCII sürümler ve Death Note'un son sahnesinden Misa Train.
- 📈 **Canlı sistem verisi**: CPU, RAM, pil, ağ, çalan şarkı (Spotify / Müzik) ve hava durumu. Temaların çoğu bu veriye tepki verir.
- 🦀 **Claude Code paneli**: Claude Code çalışırken ne yaptığı, son düşüncesi, süre ve token. Yanında yürüyen Clawd.
- 🌙 **Ekran koruyucu**: Aynı temalar `.saver` olarak, web görünümü olmadan JavaScriptCore + Core Text ile çizilir.
- 🖥️ **Çoklu ekran**, menü çubuğu simgesi, temaları sırayla değiştirme, oturum açılışında başlatma.
- 🔧 **[riceutil](https://github.com/eymndev/riceutil-macos) entegrasyonu**: terminalden ve GUI'den yönetim.

## Kurulum

Xcode veya Xcode Command Line Tools (`xcode-select --install`) gerekir; macOS 13 ve sonrası desteklenir.

En kolayı [riceutil](https://github.com/eymndev/riceutil-macos) ile:

```bash
riceutil wallpaper install
```

Elle kurmak için:

```bash
git clone https://github.com/eymndev/Wallpaper.git ~/Wallpaper
cd ~/Wallpaper
./scripts/install.sh
```

`scripts/install.sh` uygulamayı derleyip `~/Applications/ASCII Wallpaper.app` olarak kurar, ekran koruyucuyu kurar ve uygulamayı başlatır. Güncellemek için `git pull` sonrası aynı komutu çalıştırman yeter; çalışan kopyayı kendisi kapatır.

<details>
<summary>Derlemeden kurmak, yalnızca derlemek</summary>

- `./scripts/build-app.sh` uygulamayı yalnızca `build/` içine üretir.
- GitHub Actions'taki her başarılı derlemenin "ASCII-Wallpaper" çıktısından hazır paketi indirebilirsin. İmzasız olduğu için ilk açılışta sağ tık → Aç demen gerekir.

</details>

### Kullanım

Uygulama Dock'ta görünmez. Menü çubuğundaki ızgara simgesinden şunları yapabilirsin:

- Tema seçmek ya da sonraki temaya geçmek
- Temaları 10 dakikada, 30 dakikada ya da saatte bir otomatik değiştirmek
- Sistem panelini, saati, sağ alt köşedeki tema adını ve Claude Code panelini açıp kapatmak
- Oturum açılışında otomatik başlatmak

Çalan şarkıyı ilk kez okurken macOS, Spotify veya Müzik için otomasyon izni ister.

## Temalar

Her tema saat, sistem paneli (örnek veri) ve köşedeki tema adıyla birlikte, 1440x900 ekranda çizildiği gibi. Temayı kimliğiyle seçebilirsin, örneğin `riceutil wallpaper theme misa-train`.

<table>
  <tr><td align="center" width="50%"><img src="docs/gifs/lake.gif" alt="Gece Gölü" width="360"><br><b>Gece Gölü</b> · <code>lake</code></td><td align="center" width="50%"><img src="docs/gifs/matrix.gif" alt="Matrix" width="360"><br><b>Matrix</b> · <code>matrix</code></td></tr>
  <tr><td align="center" width="50%"><img src="docs/gifs/fire.gif" alt="Şömine" width="360"><br><b>Şömine</b> · <code>fire</code></td><td align="center" width="50%"><img src="docs/gifs/city.gif" alt="Yağmurlu Şehir" width="360"><br><b>Yağmurlu Şehir</b> · <code>city</code></td></tr>
  <tr><td align="center" width="50%"><img src="docs/gifs/starfield.gif" alt="Hiper Uzay" width="360"><br><b>Hiper Uzay</b> · <code>starfield</code></td><td align="center" width="50%"><img src="docs/gifs/plasma.gif" alt="Plazma" width="360"><br><b>Plazma</b> · <code>plasma</code></td></tr>
  <tr><td align="center" width="50%"><img src="docs/gifs/desert.gif" alt="Çöl Batımı" width="360"><br><b>Çöl Batımı</b> · <code>desert</code></td><td align="center" width="50%"><img src="docs/gifs/snow.gif" alt="Karlı Orman" width="360"><br><b>Karlı Orman</b> · <code>snow</code></td></tr>
  <tr><td align="center" width="50%"><img src="docs/gifs/aurora.gif" alt="Kuzey Işıkları" width="360"><br><b>Kuzey Işıkları</b> · <code>aurora</code></td><td align="center" width="50%"><img src="docs/gifs/life.gif" alt="Hayat Oyunu" width="360"><br><b>Hayat Oyunu</b> · <code>life</code></td></tr>
  <tr><td align="center" width="50%"><img src="docs/gifs/donut.gif" alt="Dönen Simit" width="360"><br><b>Dönen Simit</b> · <code>donut</code></td><td align="center" width="50%"><img src="docs/gifs/synthwave.gif" alt="Synthwave" width="360"><br><b>Synthwave</b> · <code>synthwave</code></td></tr>
  <tr><td align="center" width="50%"><img src="docs/gifs/aquarium.gif" alt="Akvaryum" width="360"><br><b>Akvaryum</b> · <code>aquarium</code></td><td align="center" width="50%"><img src="docs/gifs/hypr-honkadaloonga.gif" alt="Hypr · Honkadaloonga" width="360"><br><b>Hypr · Honkadaloonga</b> · <code>hypr-honkadaloonga</code></td></tr>
  <tr><td align="center" width="50%"><img src="docs/gifs/hypr-kath.gif" alt="Hypr · Kath" width="360"><br><b>Hypr · Kath</b> · <code>hypr-kath</code></td><td align="center" width="50%"><img src="docs/gifs/hypr-end4.gif" alt="Hypr · end_4" width="360"><br><b>Hypr · end_4</b> · <code>hypr-end4</code></td></tr>
  <tr><td align="center" width="50%"><img src="docs/gifs/hypr-alba4k.gif" alt="Hypr · alba4k" width="360"><br><b>Hypr · alba4k</b> · <code>hypr-alba4k</code></td><td align="center" width="50%"><img src="docs/gifs/hypr-corndog.gif" alt="Hypr · corndog" width="360"><br><b>Hypr · corndog</b> · <code>hypr-corndog</code></td></tr>
  <tr><td align="center" width="50%"><img src="docs/gifs/hypr-meptl.gif" alt="Hypr · Meptl" width="360"><br><b>Hypr · Meptl</b> · <code>hypr-meptl</code></td><td align="center" width="50%"><img src="docs/gifs/hypr-sollee.gif" alt="Hypr · Sollee" width="360"><br><b>Hypr · Sollee</b> · <code>hypr-sollee</code></td></tr>
  <tr><td align="center" width="50%"><img src="docs/gifs/hypr-srev.gif" alt="Hypr · srev" width="360"><br><b>Hypr · srev</b> · <code>hypr-srev</code></td><td align="center" width="50%"><img src="docs/gifs/hypr-vdawg.gif" alt="Hypr · VDawg" width="360"><br><b>Hypr · VDawg</b> · <code>hypr-vdawg</code></td></tr>
  <tr><td align="center" width="50%"><img src="docs/gifs/misa-train.gif" alt="Misa Train" width="360"><br><b>Misa Train</b> · <code>misa-train</code></td></tr>
</table>

### Hyprland yarışma kazananları

[Hyprland duvar kağıdı yarışmasının](https://hypr.land/news/contestWinners) dokuz kazanan görseli (`hypr-*`) ASCII'ye çevrildi. Her biri görselin kendisinden üretilir ve üstüne hafif bir animasyon eklenir; CPU yükseldikçe animasyon hızlanır. Görsel ayrıntı görünsün diye daha sık ızgarayla (küçük karakterlerle) çizilir; saat ve panel diğer temalardaki boyutta kalır.

### Misa Train

`misa-train` (eski kimliği `deathnote-misa` da çalışır): Death Note'un son bölümünden, Misa'nın Light'ın öldüğünden habersiz gün batımında boş bir trende oturduğu sahne. Vagon görselden üretilir; pencerelerdeki gökyüzü canlı çizilir: bulutlar akar, direkler ve teller geçer, gün batımının rengi birkaç dakikada bir morla turuncu arasında gidip gelir, tavandaki tutamaklar trenin sallantısıyla sallanır. CPU yükseldikçe tren hızlanır.

## Claude Code paneli

<img src="docs/claude-panel.jpg" alt="Claude Code paneli: Clawd, durum, çalışan araç, düşünce, süre ve token" width="440" align="right">

Bilgisayarda [Claude Code](https://claude.com/claude-code) çalışıyorsa hem duvar kağıdında hem ekran koruyucuda sağ altta bir panel çıkar:

- **Clawd** panelde yürür: düşünürken balon, araç çalıştırırken zıplama, beklerken uyuklama
- **Durum**: düşünüyor / araç çalıştırıyor / yazıyor / seni bekliyor, yanında model
- **Çalışan araç** (`Bash: npm test`, `Read: ui.js` …)
- **Son düşüncesi** ya da yazdığı mesaj
- **Süre**: bu tur ve bütün oturum
- **Token**: toplam, çıktı (↓) ve bağlam boyutu

Ağ, API anahtarı veya ek kurulum gerekmez.

<br clear="right">

<details>
<summary>Nasıl çalışıyor?</summary>

Veri `~/.claude/sessions/*.json` (açık oturumlar) ve `~/.claude/projects/<proje>/<oturum>.jsonl` (oturum kaydı) dosyalarından okunur. Birden çok oturum açıksa meşgul olan, yoksa en son değişen gösterilir; 15 dakika hareketsiz kalan oturumun paneli kaybolur. Claude Code düşünce metnini kayda boş yazıyorsa panel son mesajı gösterir. Menü çubuğundan ya da ekran koruyucunun Seçenekler penceresinden kapatılabilir. Tarayıcıda `web/index.html?claude=demo` örnek veriyle gösterir.

</details>

## Ekran koruyucu

Aynı temalar macOS ekran koruyucusu olarak da var (`scripts/install.sh` bunu zaten kurar):

```bash
./scripts/build-saver.sh --install
```

Sonra Sistem Ayarları → Ekran Koruyucu'dan "ASCII Wallpaper"ı seç. "Seçenekler" düğmesinden tema (ya da her açılışta rastgele tema), sistem paneli, saat, köşedeki tema adı ve Claude Code paneli ayarlanır. Ekran koruyucu CPU, RAM, pil, ağ ve Claude Code bilgisini gösterir; çalan şarkı ve hava durumu yalnızca duvar kağıdı uygulamasında var.

Derlemek istemezsen GitHub Actions'taki "ASCII-Wallpaper-Saver" çıktısını indirip `.saver` dosyasına çift tıklayabilirsin. İmzasız olduğu için macOS engellerse önce şunu çalıştır:

```bash
xattr -dr com.apple.quarantine "ASCII Wallpaper.saver"
```

> [!TIP]
> Ekran koruyucu bir süre sonra kararıyorsa bu genelde macOS'un ekranı uyutmasıdır: Sistem Ayarları → Kilit Ekranı → "Etkin değilken ekranı kapat" süresini uzat.

## Ayarlar

### Hava durumu konumu

Varsayılan konum İstanbul. Değiştirmek için uygulamayı kapatıp şunu çalıştır:

```bash
defaults write dev.eymn.ascii-wallpaper city "Ankara"
defaults write dev.eymn.ascii-wallpaper latitude -float 39.93
defaults write dev.eymn.ascii-wallpaper longitude -float 32.86
```

## riceutil ile yönetmek

[riceutil](https://github.com/eymndev/riceutil-macos) duvar kağıdını terminalden ve kendi GUI'sinden yönetir:

```bash
riceutil wallpaper themes          # temaları listeler, etkin olanı işaretler
riceutil wallpaper theme fire      # temayı değiştirir
riceutil wallpaper next            # sonraki tema
riceutil wallpaper name off        # köşedeki tema adını gizler
riceutil wallpaper start | stop    # başlatır / kapatır
riceutil wallpaper update          # depoyu çekip yeniden derler ve kurar
```

<details>
<summary>Dış komut arayüzü</summary>

Çalışan uygulama bu komutları `dev.eymn.ascii-wallpaper.command` dağıtık bildirimiyle alır. `userInfo` anahtarları metindir: `theme` (tema kimliği), `next`, `panel` / `clock` / `name` (`1` ya da `0`) ve `rotate` (dakika). Tema listesi `web/themes.tsv` dosyasındadır (`kimlik<TAB>ad`).

</details>

## Geliştirme

### Tarayıcıda deneme

`web/index.html` dosyasını tarayıcıda açman yeterli. Uygulama dışında örnek veri gösterilir.

- `←` / `→` ya da tıklama temalar arasında gezer, `p` paneli, `n` tema adını açıp kapatır
- `index.html?theme=fire` belirli bir temayla açar, `?panel=0` paneli, `?name=0` tema adını gizler, `?claude=demo` Claude Code panelini örnek veriyle gösterir

### Yeni tema eklemek

`web/js/themes/` içine bir dosya ekle ve `web/index.html` içinde `main.js`'ten önce yükle:

```js
(function (G) {
  const AW = G.AW;
  AW.register({
    id: "ornek",
    name: "Örnek",
    bg: "#000000",
    ui: { accent: "#ffb35c" }, // isteğe bağlı panel renkleri
    init(g, S) { return { /* temaya özel durum */ }; },
    frame(g, t, dt, S, st) {
      // g: karakter ızgarası (g.cols, g.rows, g.aspect, g.set, g.put, g.sprite, g.setBg)
      // t: saniye, dt: kare süresi, S: sistem verisi (S.cpu, S.ram, S.down ...)
      g.put(2, 2, "merhaba", "#ffffff");
    },
  });
})(globalThis);
```

### Görselden tema

Bir görseli tema verisine çevirmek için (Pillow gerekir):

```bash
python3 scripts/encode-image.py gorsel.png benim-tema
```

Bu `web/js/themes/hypr/benim-tema.data.js` dosyasını üretir (`--dir deathnote` gibi bir seçenekle `web/js/themes` altında başka bir dizine yazar). Varsayılan boyut 320x180; yüz gibi ince ayrıntı olan görsellerde `--size 640x360` kullan. Dosyayı `index.html`'e `js/image.js`'ten sonra ekle ve `AW.imageTheme({ id, name, image: "benim-tema", bg, glow, sweep, ... })` ile kaydet; seçeneklerin örnekleri `web/js/themes/hypr.js` içinde.

Tema ekledikten sonra:

1. `node scripts/themes-manifest.mjs`: `web/themes.tsv` listesini günceller (riceutil temaları buradan okur).
2. `node scripts/previews.cjs benim-tema`: `web/previews/benim-tema.jpg` önizlemesini üretir (Playwright gerekir: `npm i -g playwright`). riceutil GUI'si tema kartlarında bu görselleri gösterir.
3. `node scripts/gifs.cjs benim-tema`: README galerisindeki `docs/gifs/benim-tema.gif` dosyasını üretir (Playwright ve Pillow gerekir); galeri tablosuna da bir hücre ekle.
4. `npm test`: her temayı farklı ekran boyutlarında tarayıcı olmadan çalıştırıp hatasız çizdiğini kontrol eder.

### Yapı

```
web/            Duvar kağıdı sayfası (motor, arayüz, temalar)
mac/            Swift uygulaması (masaüstü penceresi, istatistikler, Claude Code izleyici, menü)
mac/Saver/      Ekran koruyucu (.saver)
scripts/        Derleme, kurulum, tema listesi ve görselden tema üretme betikleri
tests/          Node testleri
docs/           README görselleri, docs/gifs/ galeri GIF'leri
```
