# AGENTS.md — ASCII Wallpaper

Bu depoda çalışacak geliştiriciler ve kodlama agent'ları (Codex, Claude vb.) için proje bağlamı, kalıcı kurallar ve önemli çalışma kayıtları. Ayrıntılı kullanım için `README.md`'ye bak.

## Proje özeti

macOS için ASCII karakterlerle çizilen, hareketli ve canlı sistem istatistikleri (CPU, RAM, pil, ağ, çalan şarkı, hava durumu) gösteren duvar kağıdı ve aynı temalarla çalışan bir ekran koruyucu. 23 tema var (13 özgün, 9 Hyprland yarışma kazananı görselinden üretilen `hypr-*` ve Death Note'un son sahnesinden `deathnote-misa`). [riceutil](https://github.com/eymndev/riceutil-macos) bu uygulamayı kurar ve yönetir.

Proje neredeyse tamamen AI (Claude) ile yazıldı; README'de `AI Generated` işareti var.

## Dizin yapısı

- `web/`: Görünüşün tamamı. `index.html`, `js/grid.js` (karakter ızgarası), `js/main.js`, `js/ui.js` (panel, saat, tema adı), `js/image.js` (görselden tema), `js/headless.js` (tarayıcısız çizim, ekran koruyucu için).
- `web/js/themes/`: Her tema bir dosya, `AW.register({...})` ile kaydolur. `hypr.js` + `hypr/*.data.js` ve `deathnote.js` + `deathnote/misa.data.js` görselden üretilmiş temalar.
- `web/themes.tsv`: Tema listesi (`kimlik<TAB>ad`); riceutil temaları buradan okur.
- `web/previews/<kimlik>.jpg`: Her temanın önizlemesi; riceutil GUI'sinin tema kartları kullanır.
- `mac/Sources/AsciiWallpaper/`: Swift uygulama (SwiftPM). Her ekranda masaüstü seviyesinde bir `WKWebView` penceresi açar, istatistikleri saniyede bir `wallpaper.update(...)` ile sayfaya gönderir, menü çubuğu menüsü burada.
- `mac/Saver/`: Ekran koruyucu (`.saver`). Temaları JavaScriptCore + `web/js/headless.js` ile çalıştırır, Core Text ile çizer.
- `scripts/`: Derleme, kurulum ve üretim betikleri (aşağıda).
- `tests/`: Node testleri (`node --test`).

## Komutlar

- `npm test` (= `node --test tests/*.test.mjs`): Tema, tarayıcısız çizim, UI, `themes.tsv` ve önizleme testleri. Linux'ta çalışır.
- `./scripts/build-app.sh`: `build/ASCII Wallpaper.app` (yalnızca macOS).
- `./scripts/build-saver.sh [--install]`: `build/ASCII Wallpaper.saver`, `--install` ile `~/Library/Screen Savers` içine (yalnızca macOS).
- `./scripts/install.sh [--no-saver] [--no-open]`: Derler, `~/Applications`'a (ya da `AW_INSTALL_DIR`) kurar, ekran koruyucuyu kurar, başlatır. `riceutil wallpaper install|update` bunu çağırır.
- `node scripts/themes-manifest.mjs`: `web/themes.tsv`'yi yeniden üretir. Tema ekleyince/silince çalıştır; bir test bunu denetler.
- `node scripts/previews.cjs [kimlik ...]`: `web/previews/*.jpg` üretir (Playwright gerekir). Yeni temanın önizlemesi yoksa test başarısız olur.
- `python3 scripts/encode-image.py gorsel.png kimlik [--dir hypr]`: Görselden tema verisi üretir (Pillow gerekir); `--dir` `web/js/themes` altındaki çıktı dizinidir.

## CI

`.github/workflows/ci.yml`: Ubuntu'da sözdizimi kontrolü + Node testleri; `macos-15`'te uygulamayı derler, dış komut bildirimini dener, kurulum betiğini dener, ekran koruyucuyu derleyip `scripts/check-saver.swift` ile birkaç temayı ekran dışında çizdirir (boş görüntüde başarısız olur) ve paketleri artifact olarak yükler.

Swift kodu Linux/bulut ortamında derlenemez; Swift değişiklikleri yalnızca macOS CI'da doğrulanır.

## Kalıcı kurallar ve mimari kararlar

- **Ekran koruyucuda web görünümü kullanma.** macOS ekran koruyucuları kısıtlı bir süreçte çalıştırır ve `WKWebView` orada hiçbir şey çizmez (siyah ekran). Ekran koruyucu temaları süreç içinde JavaScriptCore ile çalıştırır. Masaüstü uygulaması `WKWebView` kullanmaya devam eder, orada çalışıyor.
- **Dış komutlar:** Uygulama `dev.eymn.ascii-wallpaper.command` adlı dağıtık bildirimi dinler (userInfo değerleri string: `theme`, `next`, `panel`/`clock`/`name` `1|0`, `rotate` dakika). Kabuktan `osascript -l JavaScript` ile gönderilir; bildirimin `object`'i string olmalı (`"riceutil"`), JXA `null`'u NSNull yapıp çökertir. Bu arayüzü değiştirirsen riceutil'i de güncelle.
- **Ayarlar** `dev.eymn.ascii-wallpaper` UserDefaults alanındadır: `theme`, `showPanel`, `showClock`, `showThemeName`, `rotateMinutes`, `city`, `latitude`, `longitude`.
- **Yeni tema eklerken:** `web/js/themes/` + `web/index.html` script listesi (`main.js`'ten önce), sonra `node scripts/themes-manifest.mjs` ve `node scripts/previews.cjs <kimlik>`, ardından `npm test`.
- Hava durumu anahtarsız Open-Meteo kullanır; depoya API anahtarı veya sır ekleme.
- **Kullanıcıya verilen terminal komutlarında yer tutucu yol kullanma** (`/klasorunun/yolu` gibi); kullanıcı komutları olduğu gibi yapıştırır. Gerçek yollar ver.
- Varsayılan dal `claude/project-thread-ljkqkv`'dir (`main` değil); PR'lar bu dala açılır.

## Bilinen sorunlar

- Depo şu an özel (private); herkese açık yapmak kullanıcının GitHub ayarlarından yapacağı bir iş. Bu yüzden riceutil CI'ının uçtan uca duvar kağıdı testi atlanıyor. (2026-10-04 itibarıyla, `Doğrulanması gerekiyor`.)

## Çalışma kuralları

Bu kurallar bu depodaki tüm kodlama görevleri için geçerlidir: yeni kod, değişiklik, hata düzeltme, refactor, yeni özellik, test ve yapılandırma.

### 1. Talimat önceliği

1. Kullanıcının mevcut mesajındaki açık istek ve kısıtlamalar.
2. Kullanıcının bu konuşmada mevcut görev için verdiği ek açıklama ve düzeltmeler.
3. Projenin teknik olarak geçerli kuralları ve mevcut mimarisi.
4. Bu `AGENTS.md`.
5. Bu dosyadaki geçmiş çalışma kayıtları.

Mevcut kullanıcı isteği her zaman eski kayıtlardan önceliklidir. Eski hedefleri, TODO'ları ve yarım kalmış işleri kendiliğinden aktif görev sayma; kullanıcı açıkça istemedikçe geçmiş bir görevi yeniden başlatma.

### 2. Bu dosyanın rolü

`AGENTS.md`; proje bağlamı, mimari kararlar, kalıcı kurallar, önemli çalışma kayıtları ve doğrulanmış teknik bilgiler içindir. **Otomatik görev kuyruğu değildir.** `[ ]` olarak duran bir hedef yalnızca geçmiş çalışmanın durumunu gösterir; mevcut isteğin parçası değilse üzerinde çalışma.

Göreve başlamadan önce:

1. Proje yapısını incele, bu dosyayı ve `README.md`'yi oku.
2. Mevcut isteği geçmiş görevlerden ayır; amacını, kabul kriterlerini, kapsamını ve kapsam dışını belirle.
3. Gerekiyorsa mevcut görevin hedeflerini bu dosyaya ekle.

Küçük görevde de bu kontrolü atlama, ama gereksiz günlük veya anlamsız kayıt üretme.

### 3. Kapsam

Yalnızca mevcut isteği yerine getirmek için gereken değişiklikleri yap. Kullanıcı istemedikçe yapma: kapsam dışı refactor, ilgisiz bug düzeltme, mimariyi yeniden tasarlama, gereksiz dependency güncelleme, toplu lint temizliği, ilgisiz testleri düzeltme, dosya yeniden adlandırma, stil değişiklikleri, "hazır buradayken" ek özellikler.

Başka bir sorun fark edersen ve mevcut görevi engellemiyorsa düzeltme; gerekiyorsa aşağıdaki "Bilinen sorunlar" bölümüne ya da çalışma kaydına not et, önemliyse son cevapta belirt. Görevin başarılı olması için tüm projenin kusursuz olması gerekmez.

### 4. Takılıp kalmayı önleme

Bir eylemi tekrar etmeden önce sor: **"Son denemeden beri yeni bir bilgi, kod, durum veya hipotez var mı?"** Yoksa tekrar etme.

- Aynı başarısız yaklaşımı yeni bilgi olmadan ikinci kez deneme; aynı hata için en fazla 3 anlamlı alternatif dene.
- Aynı komutu aynı kod durumunda, aynı testi kod değişmeden tekrar tekrar çalıştırma; dosyaları "emin olmak için" yeniden okuma.
- Aynı permission isteğini tekrar tetikleme; network/tool hatasında sonsuz retry yapma; sınırsız araştırma yapma.

İki ardışık adımda kodda, test sonucunda, repo durumunda veya teşhiste anlamlı ilerleme yoksa bu **no-progress** durumudur: yeni kanıt sağlayacak tek bir farklı yaklaşım varsa onu dene, yoksa blokeri açıkça belirt ve dur.

### 5. Ne zaman bitti

İstenen değişiklik uygulanmış, kabul kriterleri karşılanmış, uygulanabilir doğrulamalar yapılmış, bu dosya gerektiği kadar güncellenmiş ve istenmeyen iş kalmamışsa **daha fazla değişiklik yapma.** Yeni problem arama, genel review başlatma, ek refactor ya da "bir iyileştirme daha" döngüsüne girme, geçmiş TODO'lara geçme; doğrudan final cevabını hazırla.

### 6. Compaction, reconnect, resume

Geçmişi eksik hatırlıyorsan eski görevi sıfırdan başlatma. Durumu şuradan yeniden kur: kullanıcının en güncel mesajı, `git status`, `git diff`, dosyaların gerçek içeriği, en son ilgili kayıt, mevcut test sonuçları. Özet ile repo çelişirse **repo esastır.** Eski bir promptun yeniden görünmesi onu yeniden çalıştırmak gerektiği anlamına gelmez. Uygulanmış işlemi, oluşturulmuş dosyayı veya migration'ı tekrar yapma; repo durumunun doğruladığı `[x]` hedefi yeniden yapma; `[ ]` hedef mevcut isteğin parçası değilse dokunma.

### 7. Kullanıcı düzeltmeleri

"Bunu yapma", "şunu kullan", "X yerine Y", "bu dosyaya dokunma", "bu kapsam dışında" gibi düzeltmeler mevcut görev için güçlü kısıttır; eski plan veya kayıtlarla çelişirse yenisi geçerlidir, compaction sonrasında da korunur. Yasaklanan bir yaklaşımı "alternatif çözüm" diye yeniden uygulama.

### 8. Tool, permission ve environment blokları

Permission, authentication, credential, network, olmayan tool, dış servis veya kullanıcı kararı gerektiren bir engeli kod yazarak ya da sürekli retry ederek aşmaya çalışma. Aynı engel aynı nedenle ikinci kez çıkarsa tekrarları durdur, bağımsız işleri bitir, engeli açıkça raporla. Gerçekleştiğini doğrulayamadığın bir işlemi gerçekleşmiş gibi sunma.

### 9. Review sınırı

Kod bitince ilgili değişiklikler için bir ana review, gerekli düzeltmeler ve bir final verification yeterlidir. Sınırsız `review → fix → review` döngüsü kurma; final verification'dan sonra yeni ve kritik bir sorun yoksa tekrar genel review başlatma. Kapsam dışı iyileştirmeleri yeni görevlere dönüştürme.

### 10. Testler

En ilgili ve en küçük doğrulamayla başla, gerekirse genişlet. Başarısız testin önce nedenini analiz et; kod veya environment değişmeden yeniden çalıştırma. Flaky olduğuna dair gerçek bir neden varsa sınırlı sayıda yeniden dene ve bunu belirt. Çalıştırılmamış, environment yüzünden çalıştırılamamış, yarıda kalmış veya sonucu belirsiz testi başarılı diye kaydetme; gerektiğinde `Doğrulanması gerekiyor`, `Çalıştırılamadı`, `Environment nedeniyle doğrulanamadı`, `Belirsiz`, `Kısmen doğrulandı` ifadelerini kullan.

### 11. Kod değişiklikleri ve belgeleme

Mevcut mimari ve kod stiline uy. Önemli bir teknik kararın ne olduğunu, nedenini ve etkisini bu dosyaya kısaca yaz. Yeni dosya, modül, endpoint, migration/şema değişikliği, dependency, environment variable, CLI komutu, önemli yapılandırma veya kullanım kuralı eklenirse gerektiği ölçüde burada belgele.

### 12. Hedef durumları

Gerçekten tamamlanan hedef `[x]`; kısmen tamamlanmış veya doğrulanmamış hedef `[x]` olmaz. Devam eden veya bekleyen hedef `[ ]` kalabilir, ama bunlar ileride otomatik sürdürülecek işler değil, yalnızca durum kaydıdır.

### 13. Bu dosyayı güncelleme

Dosyayı gereksiz yere silme veya baştan yazma; faydalı bilgiyi koru, yalnızca güncel olmayan, hatalı, eksik veya mevcut çalışmayla doğrudan ilgili yerleri düzenle. Aynı bilgiyi tekrar ekleme, dosyayı kontrolsüz büyütme. Uzun reasoning, geçici düşünce, ham terminal çıktısı, tekrar eden veya doğrulanmamış bilgi ekleme. Normalde görev başında kontrol et, kalıcı bir karar gerektiğinde güncelle, görev sonunda son kez kontrol et.

### 14. Çalışma kaydı biçimi

Anlamlı çalışmalar en alttaki "Çalışma kayıtları" bölümüne şu biçimde eklenir (aynı gün aynı çalışma için tekrar eden kayıt açma, mevcut kaydı güncelle):

```markdown
### YYYY-MM-DD — Kısa çalışma başlığı

#### Amaç
Çözülmek istenen problem ve görevin sınırları.

#### Yapılanlar
- `dosya/yolu`: Değişiklik ve amacı.

#### Hedef durumu
- [x] Gerçekten tamamlanan hedef.
- [ ] Devam eden veya bekleyen hedef.

#### Teknik kararlar
- Karar ve gerekçesi.

#### Testler
- `komut`: Sonuç. Çalıştırılamayan test varsa nedeni.

#### Bilinen sorunlar ve sonraki adımlar
- Kalan sorun, risk veya ileride ele alınabilecek iş.
```

### 15. Belirsizlik ve doğruluk

Sorunları, belirsizlikleri, teknik borçları, riskleri ve doğrulanamayan varsayımları gizleme; ama yalnızca ihtimal olanı kesin problem gibi de sunma. Emin olmadığını `Belirsiz` veya `Doğrulanması gerekiyor` diye işaretle.

### 16. AI Generated şeffaflığı

Proje tamamen veya neredeyse tamamen AI ile ("vibe coding") yazıldıysa README'de görünür bir `AI Generated` işareti bulunur. Bu bir şeffaflık politikasıdır; doğrulanmış bir hukuki gereklilik olmadıkça "EU AI Act zorunlu kılıyor" diye sunma (hukuki uyum istenirse güncel resmi EU kaynaklarından doğrula). Etiket zaten varsa ikincisini ekleme, depoda olmayan bir görsele (ör. `assets/ai-generated.svg`) referans verme. Önemli ölçüde insan tarafından yazılmış projeyi kullanıcı istemedikçe "tamamen AI Generated" diye etiketleme.

### 17. Görev sonu kontrolü

Final cevabından önce: isteği tekrar oku; değişikliklerin isteği karşıladığını doğrula; `git diff` ile gereksiz değişiklik olup olmadığına bak; test durumunu kontrol et; bu dosyayı kontrol edip gerekiyorsa güncelle; tamamlanmış işi yeniden açacak yeni bir döngü başlatma.

### 18. Final cevap

Kısa ve somut: yapılan değişiklikler; `AGENTS.md` güncellendi mi; çalıştırılan testler ve sonuçları; çalıştırılamayan testler; kalan blocker, risk veya gerçekten kullanıcı kararı gereken noktalar. Görev bittiyse bunu açıkça söyle ve kendiliğinden yeni hedef üretme.

### Kaynak kodunu okuma politikası

Bütün kaynak kodunu baştan sona okuma. Önce `README.md`, bu dosya, dizin yapısı, gerekiyorsa dependency/yapılandırma dosyaları ve görevle doğrudan ilgili entry point ve modüllerle bağlamı kur; sonra kodu ihtiyaç oldukça ve seçici oku. Bir dosyayı yalnızca görevin davranışını doğrudan etkiliyorsa, değişmesi gerekebilecekse, çağrı zincirinin parçasıysa, kullanılan bir API/veri modelini tanımlıyorsa, hatayı anlamak ya da test/build davranışını açıklamak için gerekiyorsa oku. Tamamı gerekmiyorsa ilgili fonksiyon, sınıf veya bölümle yetin. Değişmemiş bir dosyayı yeniden okuma; compaction sonrasında projeyi baştan tarama, önce görev durumu, `git diff` ve ilgili dosyalarla bağlamı geri kazan.

**Amaç maksimum kod okumak değil, görevi güvenilir biçimde tamamlamak için gereken minimum yeterli bağlamı toplamaktır.**

## Çalışma kayıtları

### 2026-10-04 — AGENTS.md oluşturuldu

#### Amaç
Kullanıcının "Codex Proje Çalışma Talimatları"na uygun bir `AGENTS.md` oluşturmak (`/init`). Kod davranışı değişmez; kapsam yalnızca belgeler.

#### Yapılanlar
- `AGENTS.md`: Proje özeti, dizin yapısı, komutlar, CI, kalıcı kurallar ve kullanıcının çalışma kuralları.
- `CLAUDE.md`: Claude oturumlarının da bu dosyayı okuması için `@AGENTS.md` yönlendirmesi.
- `README.md`: Başa `AI Generated` işareti (proje neredeyse tamamen Claude ile yazıldı).

#### Hedef durumu
- [x] `AGENTS.md` ve `CLAUDE.md` oluşturuldu.
- [x] README'ye `AI Generated` işareti eklendi.

#### Teknik kararlar
- Kurallar tek kaynak olsun diye `AGENTS.md`'de tutulur; `CLAUDE.md` yalnızca ona yönlendirir.

#### Testler
- `npm test`: 50 test geçti (değişiklikten önce ve sonra).
- Swift tarafı değişmedi; macOS CI PR'da çalışır.

#### Bilinen sorunlar ve sonraki adımlar
- Yok.

### 2026-10-04 — Death Note · Misa teması

#### Amaç
Kullanıcının gönderdiği Death Note son bölüm karesini (Misa, gün batımında boş trende) hareketli bir ASCII temasına çevirmek. Diğer temalar ve uygulama davranışı kapsam dışı.

#### Yapılanlar
- `web/js/themes/deathnote.js`: `deathnote-misa` ("Death Note · Misa") görsel teması. Pencerelerdeki gökyüzü canlı çizilir (akan bulutlar, geçen direk ve sarkan teller, üç dakikalık morla turuncu arası gün batımı döngüsü); tavan tutamakları sarkaç gibi bir iki hücre sallanır; hafif çapraz ışık süpürmesi.
- `web/js/themes/deathnote/misa.data.js`: `encode-image.py` ile üretilen görsel verisi.
- `scripts/encode-image.py`: Çıktı dizini için `--dir` seçeneği (varsayılan `hypr`, eski davranış aynı).
- `web/index.html`, `web/themes.tsv`, `web/previews/deathnote-misa.jpg`, `README.md`: Tema kaydı, liste, önizleme ve belge.
- `.github/workflows/ci.yml`: Ekran koruyucu çizim denetimine `deathnote-misa` eklendi.

#### Hedef durumu
- [x] Tema web görünümünde ve tarayıcısız sürücüde çiziliyor (Node testleri).
- [ ] Ekran koruyucuda çizim: macOS CI'da `check-saver` ile doğrulanacak.

#### Teknik kararlar
- Kaynak kare kodlanmadan önce Misa'nın çevresi aydınlatıldı (parlaklık 1.7, kontrast 1.3, yumuşak maske; ardından tüm kareye renk 1.2, kontrast 1.2). Yoksa koyu saçı ve elbisesi ASCII'de koltuğa karışıyor. Kaynak görsel depoya eklenmedi.
- Pencere bölgeleri görsel koordinatlarında çokgenlerle tanımlı; Misa'nın başı ikinci pencerenin önünde olduğu için ayrı bir çokgenle gökyüzünden hariç tutulur.
- Bulutlar her hücre için üç karede bir hesaplanır, renk metinleri önbelleklenir: 300x94 ızgarada kare başına ~4 ms (Node), diğer görsel temalarla aynı düzeyde.

#### Testler
- `npm test`: 52 test geçti.
- Swift tarafı değişmedi; ekran koruyucu çizimi macOS CI'da doğrulanır.

#### Bilinen sorunlar ve sonraki adımlar
- 16:10 ekranlarda görselin kenarları kırpıldığı için sağ duvardaki pencere görünmez (16:9'da görünür).
