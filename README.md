# ASCII Wallpaper

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

## Mac'te kurulum

Xcode veya Xcode Command Line Tools (`xcode-select --install`) gerekir, macOS 13 ve sonrası desteklenir.

```bash
git clone https://github.com/eymndev/Wallpaper.git
cd Wallpaper
./scripts/build-app.sh
open "build/ASCII Wallpaper.app"
```

İstersen `build/ASCII Wallpaper.app` dosyasını Uygulamalar klasörüne taşı. Derlemek istemezsen GitHub Actions'taki her başarılı derlemenin "ASCII-Wallpaper" çıktısından hazır paketi indirebilirsin. İmzasız olduğu için ilk açılışta sağ tık → Aç demen gerekir.

Uygulama Dock'ta görünmez. Menü çubuğundaki ızgara simgesinden şunları yapabilirsin:

- Tema seçmek ya da sonraki temaya geçmek
- Temaları 10 dakikada, 30 dakikada ya da saatte bir otomatik değiştirmek
- Sistem panelini ve saati açıp kapatmak
- Oturum açılışında otomatik başlatmak

Çalan şarkıyı ilk kez okurken macOS, Spotify veya Müzik için otomasyon izni ister.

### Hava durumu konumu

Varsayılan konum İstanbul. Değiştirmek için uygulamayı kapatıp şunu çalıştır:

```bash
defaults write dev.eymn.ascii-wallpaper city "Ankara"
defaults write dev.eymn.ascii-wallpaper latitude -float 39.93
defaults write dev.eymn.ascii-wallpaper longitude -float 32.86
```

## Tarayıcıda deneme

`web/index.html` dosyasını tarayıcıda açman yeterli. Uygulama dışında örnek veri gösterilir.

- `←` / `→` ya da tıklama temalar arasında gezer, `p` paneli açıp kapatır
- `index.html?theme=fire` belirli bir temayla açar, `?panel=0` paneli gizler

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

`npm test` her temayı farklı ekran boyutlarında tarayıcı olmadan çalıştırıp hatasız çizdiğini kontrol eder.

## Yapı

```
web/            Duvar kağıdı sayfası (motor, arayüz, temalar)
mac/            Swift uygulaması (masaüstü penceresi, istatistikler, menü)
scripts/        Uygulama paketini derleme betiği
tests/          Tema testleri
```
