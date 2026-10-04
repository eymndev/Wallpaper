# ASCII Wallpaper

<p>
  <a href="https://digital-strategy.ec.europa.eu/sites/default/files/2026-06/AI%20LABELS_3x2_AI%20GENERATED_black.png">
    AI Generated
  </a>
</p>

Mac masaüstü için ASCII karakterlerle çizilen, hareketli ve canlı sistem istatistikleri gösteren duvar kağıdı.

Görünüşün tamamı `web/` klasöründeki HTML/CSS/JS ile yapılır. `mac/` klasöründeki küçük Swift uygulaması bu sayfayı her ekranda masaüstü ikonlarının arkasına yerleştirir ve CPU, RAM, pil, ağ, çalan şarkı ve hava durumu bilgisini saniyede bir sayfaya gönderir.

## Temalar

| Kimlik | Ad | Sistem verisine tepkisi |
| --- | --- | --- |
| `lake` | Gece Gölü | CPU yükseldikçe dalgalar hızlanır |
| `matrix` | Matrix | CPU yükü yağmuru hızlandırır |
| `fire` | Şömine | CPU yükü alevleri büyütür |
| `city` | Yağmurlu Şehir | İndirme hızı yağmuru yoğunlaştırır |
| `starfield` | Hiper Uzay | İndirme hızı uçuşu hızlandırır |
| `plasma` | Plazma | CPU yükü akışı hızlandırır |
| `desert` | Çöl Batımı | — |
| `snow` | Karlı Orman | — |
| `aurora` | Kuzey Işıkları | — |
| `life` | Hayat Oyunu | CPU sıçramaları planör fırlatır |
| `donut` | Dönen Simit | CPU yükü dönüşü hızlandırır |
| `synthwave` | Synthwave | İndirme hızı yolu hızlandırır |
| `aquarium` | Akvaryum | RAM doldukça kabarcık artar |

### Hyprland yarışma kazananları

[Hyprland duvar kağıdı yarışmasının](https://hypr.land/news/contestWinners) dokuz kazanan görseli ASCII'ye çevrildi. Her biri görselin kendisinden üretilir ve üstüne hafif bir animasyon eklenir; CPU yükseldikçe animasyon hızlanır. Bu temalar ayrıntı görünsün diye daha küçük yazıyla (daha sık ızgarayla) çizilir.

| Kimlik | Sanatçı | Animasyon |
| --- | --- | --- |
| `hypr-honkadaloonga` | Honkadaloonga | Cam kırıkları parıldar, çapraz ışık geçer |
| `hypr-kath` | Kath | Neon kediler nabız gibi parlar, pencere ışıkları titrer |
| `hypr-end4` | end_4 | Logo parlar, karanlıkta veri çizgileri akar |
| `hypr-alba4k` | alba4k | Hata ekranındaki yüzde ilerler (69'da biraz takılır) |
| `hypr-corndog` | corndog | Gemideki tabelada gerçek saat, ışıklar titrer |
| `hypr-meptl` | Meptl | Avuçlardaki ışık dalgalanır, zerreler yükselir |
| `hypr-sollee` | Sollee | Küçük gezegen yörüngede döner, halkalar dalgalanır |
| `hypr-srev` | srev | Sarı ve turkuaz ayrıntılar parlar, ışık süpürür |
| `hypr-vdawg` | VDawg | Ekranlar titrer, ışık huzmesinden zerreler yükselir |

## Mac'te kurulum

Xcode veya Xcode Command Line Tools (`xcode-select --install`) gerekir, macOS 13 ve sonrası desteklenir.

En kolayı [riceutil](https://github.com/eymndev/riceutil-macos) ile:

```bash
riceutil wallpaper install
```

Elle kurmak için:

```bash
git clone https://github.com/eymndev/Wallpaper.git
cd Wallpaper
./scripts/install.sh
```

`scripts/install.sh` uygulamayı derleyip `~/Applications/ASCII Wallpaper.app` olarak kurar, ekran koruyucuyu kurar ve uygulamayı başlatır. Güncellemek için `git pull` sonrası aynı komutu çalıştırman yeter (çalışan kopyayı kendisi kapatır). Yalnızca derlemek istersen `./scripts/build-app.sh` uygulamayı `build/` içine üretir. Derlemek istemezsen GitHub Actions'taki her başarılı derlemenin "ASCII-Wallpaper" çıktısından hazır paketi indirebilirsin. İmzasız olduğu için ilk açılışta sağ tık → Aç demen gerekir.

Uygulama Dock'ta görünmez. Menü çubuğundaki ızgara simgesinden şunları yapabilirsin:

- Tema seçmek ya da sonraki temaya geçmek
- Temaları 10 dakikada, 30 dakikada ya da saatte bir otomatik değiştirmek
- Sistem panelini, saati ve sağ alt köşedeki tema adını açıp kapatmak
- Oturum açılışında otomatik başlatmak

Çalan şarkıyı ilk kez okurken macOS, Spotify veya Müzik için otomasyon izni ister.

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

Çalışan uygulama bu komutları `dev.eymn.ascii-wallpaper.command` dağıtık bildirimiyle alır. `userInfo` anahtarları metindir: `theme` (tema kimliği), `next`, `panel` / `clock` / `name` (`1` ya da `0`) ve `rotate` (dakika). Tema listesi `web/themes.tsv` dosyasındadır (`kimlik<TAB>ad`).

## Ekran koruyucu

Aynı temalar macOS ekran koruyucusu olarak da var:

```bash
./scripts/build-saver.sh --install
```

Bu komut `build/ASCII Wallpaper.saver` dosyasını derleyip `~/Library/Screen Savers` içine kopyalar. Sonra Sistem Ayarları → Ekran Koruyucu'dan "ASCII Wallpaper"ı seç. "Seçenekler" düğmesinden tema (ya da her açılışta rastgele tema), sistem paneli, saat ve köşedeki tema adı ayarlanır. Ekran koruyucu CPU, RAM, pil ve ağ bilgisini gösterir; çalan şarkı ve hava durumu yalnızca duvar kağıdı uygulamasında var.

Derlemek istemezsen GitHub Actions'taki "ASCII-Wallpaper-Saver" çıktısını indirip `.saver` dosyasına çift tıklayabilirsin. İmzasız olduğu için macOS engellerse önce şunu çalıştır:

```bash
xattr -dr com.apple.quarantine "ASCII Wallpaper.saver"
```

### Hava durumu konumu

Varsayılan konum İstanbul. Değiştirmek için uygulamayı kapatıp şunu çalıştır:

```bash
defaults write dev.eymn.ascii-wallpaper city "Ankara"
defaults write dev.eymn.ascii-wallpaper latitude -float 39.93
defaults write dev.eymn.ascii-wallpaper longitude -float 32.86
```

## Tarayıcıda deneme

`web/index.html` dosyasını tarayıcıda açman yeterli. Uygulama dışında örnek veri gösterilir.

- `←` / `→` ya da tıklama temalar arasında gezer, `p` paneli, `n` tema adını açıp kapatır
- `index.html?theme=fire` belirli bir temayla açar, `?panel=0` paneli, `?name=0` tema adını gizler

## Yeni tema eklemek

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

Bu `web/js/themes/hypr/benim-tema.data.js` dosyasını üretir. Dosyayı `index.html`'e `js/image.js`'ten sonra ekle ve `AW.imageTheme({ id, name, image: "benim-tema", bg, glow, sweep, ... })` ile kaydet; seçeneklerin örnekleri `web/js/themes/hypr.js` içinde.

Tema ekledikten sonra `node scripts/themes-manifest.mjs` ile `web/themes.tsv` listesini güncelle (riceutil temaları buradan okur).

Ardından `node scripts/previews.cjs benim-tema` ile `web/previews/benim-tema.jpg` önizlemesini üret (Playwright gerekir: `npm i -g playwright`). riceutil GUI'si tema kartlarında bu görselleri gösterir.

`npm test` her temayı farklı ekran boyutlarında tarayıcı olmadan çalıştırıp hatasız çizdiğini kontrol eder.

## Yapı

```
web/            Duvar kağıdı sayfası (motor, arayüz, temalar)
mac/            Swift uygulaması (masaüstü penceresi, istatistikler, menü)
mac/Saver/      Ekran koruyucu (.saver)
scripts/        Derleme, kurulum, tema listesi ve görselden tema üretme betikleri
tests/          Tema testleri
```
