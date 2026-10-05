# AGENTS.md — ASCII Wallpaper

Bu depoda çalışacak geliştiriciler ve kodlama agent'ları (Codex, Claude vb.) için proje bağlamı, kalıcı kurallar ve önemli çalışma kayıtları. Ayrıntılı kullanım için `README.md`'ye bak.

## Proje özeti

macOS için ASCII karakterlerle çizilen, hareketli ve canlı sistem istatistikleri (CPU, RAM, pil, ağ, çalan şarkı, hava durumu) ve çalışan Claude Code oturumunu gösteren duvar kağıdı ve aynı temalarla çalışan bir ekran koruyucu. 25 tema üç pakette: Klasik (13 özgün tema, uygulamanın içinde), Hyprland (9 yarışma kazananı görselinden `hypr-*`) ve Anime (Death Note'tan `misa-train`, `light-yagami`; One Piece'ten `thousand-sunny`). Hyprland ve Anime ayrı indirilir (bkz. "Tema paketleri"). [riceutil](https://github.com/eymndev/riceutil-macos) bu uygulamayı kurar ve yönetir.

Proje neredeyse tamamen AI (Claude) ile yazıldı; README'de `AI Generated` işareti var.

## Dizin yapısı

- `web/`: Görünüşün tamamı. `index.html`, `js/grid.js` (karakter ızgarası), `js/main.js`, `js/ui.js` (panel, saat, tema adı, Claude Code paneli ve Clawd), `js/image.js` (görselden tema), `js/packs.js` (tema paketlerini yükler), `js/headless.js` (tarayıcısız çizim, ekran koruyucu için).
- `web/js/themes/`: Klasik temalar, her tema bir dosya, `AW.register({...})` ile kaydolur.
- `packs/<paket>/`: Ayrı indirilen tema paketleri (`hyprland`, `anime`). `pack.json` (kimlik, ad, sıra, açıklama, yüklenme sırasıyla betikler), `js/` (temalar ve görselden üretilmiş `*.data.js`), `previews/`, `themes.tsv`. `packs/index.js` tarayıcıda depodan açılınca tüm paketleri yükler (üretilir).
- `web/themes.tsv`: Klasik temaların listesi (`kimlik<TAB>ad`); `packs/<paket>/themes.tsv` paketlerinki; `web/packs.tsv` paket kataloğu (`kimlik<TAB>ad<TAB>dahili<TAB>tema sayısı<TAB>açıklama`). riceutil bunları okur.
- `web/previews/<kimlik>.jpg`, `packs/<paket>/previews/<kimlik>.jpg`: Temaların önizlemesi; riceutil GUI'sinin tema kartları kullanır.
- `mac/Sources/AsciiWallpaper/`: Swift uygulama (SwiftPM). Her ekranda masaüstü seviyesinde bir `WKWebView` penceresi açar, istatistikleri saniyede bir `wallpaper.update(...)` ile sayfaya gönderir, menü çubuğu menüsü burada.
- `mac/Sources/AsciiWallpaper/ClaudeMonitor.swift`: `~/.claude` altından çalışan Claude Code oturumunu okur; uygulama ve ekran koruyucu ortak kullanır (`build-saver.sh` bu dosyayı da derler).
- `mac/Sources/AsciiWallpaper/ThemePacks.swift`: Kurulu tema paketlerini okur; uygulama ve ekran koruyucu ortak kullanır (`build-saver.sh` bunu da derler).
- `mac/Saver/`: Ekran koruyucu (`.saver`). Temaları JavaScriptCore + `web/js/headless.js` ile çalıştırır, Core Text ile çizer.
- `docs/`: README görselleri (`hero.jpg`, `claude-panel.jpg`; Claude paneli `?claude=demo` örnek verisiyle çekildi, gerçek oturum içeriği README'ye girmesin).
- `scripts/`: Derleme, kurulum ve üretim betikleri (aşağıda).
- `docs/gifs/`: README galerisindeki tema GIF'leri.
- `tests/`: Node testleri (`node --test`).

## Komutlar

- `npm test` (= `node --test tests/*.test.mjs`): Tema, tarayıcısız çizim, UI, tema/paket listeleri, önizleme ve `pack.sh` (seyrek klon dahil) testleri. Linux'ta çalışır.
- `./scripts/build-app.sh`: `build/ASCII Wallpaper.app` (yalnızca macOS).
- `./scripts/build-saver.sh [--install]`: `build/ASCII Wallpaper.saver`, `--install` ile `~/Library/Screen Savers` içine (yalnızca macOS).
- `./scripts/install.sh [--no-saver] [--no-open]`: Derler, `~/Applications`'a (ya da `AW_INSTALL_DIR`) kurar, `pack.sh sync` ile paketleri günceller, ekran koruyucuyu kurar, başlatır. `riceutil wallpaper install|update` bunu çağırır.
- `./scripts/pack.sh list [--tsv] | add <paket>... | remove <paket>... | sync`: Tema paketlerini kurar/kaldırır (`AW_PACKS_DIR` ile klasör değişir). `riceutil wallpaper packs|pack` bunu çağırır.
- `node scripts/themes-manifest.mjs`: `web/themes.tsv`, `packs/*/themes.tsv`, `web/packs.tsv` ve `packs/index.js`'yi yeniden üretir. Tema/paket ekleyince/silince çalıştır; bir test bunu denetler.
- `node scripts/previews.cjs [kimlik ...]`: Önizlemeleri temanın yerine (`web/previews` ya da `packs/<paket>/previews`) üretir (Playwright gerekir). Yeni temanın önizlemesi yoksa test başarısız olur.
- `node scripts/gifs.cjs [kimlik ...]`: README galerisindeki `docs/gifs/*.gif` dosyalarını üretir (Playwright + Pillow; sayfanın saatini Playwright ile ilerletir, 3 sn, 8 kare/sn, 720x450).
- `python3 scripts/encode-image.py gorsel.png kimlik [--dir packs/anime/js/light] [--size 640x360] [--mask maske.png]`: Görselden tema verisi üretir (Pillow gerekir); `--dir` depo köküne göre çıktı dizini (varsayılan `packs/hyprland/js/hypr`), `--size` hedef boyut (varsayılan 320x180), `--mask` aynı boyutta siyah-beyaz maskeyi bit dizisi olarak `mask` alanına yazar (tema `AW.decode64` ile okur; ör. `thousand-sunny` gemiyi gökyüzü/denizden ayırır).

## CI

`.github/workflows/ci.yml`: Ubuntu'da sözdizimi kontrolü + Node testleri; `macos-15`'te uygulamayı derler, paketleri kurar, dış komut bildirimini ve paket kaldırınca sayfaların yeniden açılmasını dener, kurulum betiğini dener, ekran koruyucuyu derleyip `scripts/check-saver.swift` ile birkaç temayı ekran dışında çizdirir (boş görüntüde başarısız olur) ve paketleri artifact olarak yükler.

Swift kodu Linux/bulut ortamında derlenemez; Swift değişiklikleri yalnızca macOS CI'da doğrulanır.

## Kalıcı kurallar ve mimari kararlar

- **Ekran koruyucuda web görünümü kullanma.** macOS ekran koruyucuları kısıtlı bir süreçte çalıştırır ve `WKWebView` orada hiçbir şey çizmez (siyah ekran). Ekran koruyucu temaları süreç içinde JavaScriptCore ile çalıştırır. Masaüstü uygulaması `WKWebView` kullanmaya devam eder, orada çalışıyor.
- **Dış komutlar:** Uygulama `dev.eymn.ascii-wallpaper.command` adlı dağıtık bildirimi dinler (userInfo değerleri string: `theme`, `next`, `panel`/`clock`/`name` `1|0`, `rotate` dakika, `packs` `reload`). Kabuktan `osascript -l JavaScript` ile gönderilir; bildirimin `object`'i string olmalı (`"riceutil"`), JXA `null`'u NSNull yapıp çökertir. Bu arayüzü değiştirirsen riceutil'i de güncelle.
- **Ayarlar** `dev.eymn.ascii-wallpaper` UserDefaults alanındadır: `theme`, `showPanel`, `showClock`, `showThemeName`, `showClaude`, `rotateMinutes`, `city`, `latitude`, `longitude`. Ekran koruyucu kendi `dev.eymn.ascii-wallpaper.saver` alanını kullanır (`theme`, `showPanel`, `showClock`, `showThemeName`, `showClaude`).
- **Tema kimliğini değiştirirken** eskisini `web/js/util.js` içindeki `AW.aliases`'a ekle: kayıtlı ayarlar ve eski komutlar yeni temayı açar, uygulama kayıtlı ayarı yenisine çevirir.
- **Görsel temalar** varsayılan olarak sık ızgarayla (`fontScale` 0.4) çizilir; zemin hücrenin kendi rengidir, karakter dokuyu verir. Saat, panel, tema adı ve bildirim bu temalarda normal boyutlu ayrı bir arayüz ızgarasına çizilir (sayfada `main.js` `ui`, ekran koruyucuda `AWH.resizeUI` ve ikinci `AsciiRenderer`); böylece arayüz her temada aynı boyuttadır. Masaüstü sayfası sahnede yalnız değişen hücreleri yeniden çizer (`main.js` `render`), arayüz katmanını her karede üstüne çizer; yeni bir efekt her karede tüm hücreleri değiştirirse bu kazanç kaybolur.
- **Tema paketleri:** Klasik temalar uygulama paketinin içinde (`web/`), diğerleri `packs/<paket>/` altında ve kullanıcıda `~/Library/Application Support/ASCII Wallpaper/packs/<paket>/` içine kopyalanır (`scripts/pack.sh`). Uygulama paketlerin betiklerini `WKUserScript` ile sayfa açılmadan `AW_PACKS` olarak verir, `web/js/packs.js` bunları `AW.beginPack`/`AW.endPack` arasında çalıştırır (temalar `pack` alanını taşır); `packs reload` bildiriminde pencereler yeniden kurulur. Ekran koruyucu paketleri JavaScriptCore'da kendisi çalıştırır, `killall legacyScreenSaver` ile yeni listeyi okur. riceutil Wallpaper'ı seyrek + `--filter=blob:none` klonlar; `pack.sh add` seyrek klonda `git sparse-checkout add packs/<paket>` ile yalnız o paketi indirir. `pack.sh sync`, paket klasörü hiç yoksa (ilk kurulum ya da paketlerden önceki sürümden güncelleme) depoda bulunan tüm paketleri kurar: eski kurulumlar temalarını kaybetmez, riceutil'in seyrek klonundaki yeni kurulum yalnız Klasik'le başlar.
- **Yeni tema eklerken:** Klasik için `web/js/themes/` + `web/index.html` script listesi (`main.js`'ten önce), paket için `packs/<paket>/js/` + `pack.json` `scripts` listesi; sonra `node scripts/themes-manifest.mjs`, `node scripts/previews.cjs <kimlik>` ve `node scripts/gifs.cjs <kimlik>` (README galerisine hücre ekle), ardından `npm test`. Görünüşü değiştiren bir değişiklikten sonra önizlemeleri ve GIF'leri yeniden üret.
- **Claude Code verisi:** `update(...)` verisindeki `claude` alanı (yoksa `null`) panelin tek kaynağıdır; panel yalnızca bu alan doluyken çizilir. Veri `~/.claude/sessions/*.json` + oturum kaydı JSONL'den okunur; bunlar Claude Code'un belgelenmemiş iç dosyalarıdır, biçim değişirse `ClaudeMonitor.swift` güncellenmeli. Ekran koruyucu süreci korumalı alanda ama `/` altını salt okunur okuyabiliyor (legacyScreenSaver yetkisi); orada `NSHomeDirectory()` kapsayıcıyı gösterdiği için ev dizini `getpwuid` ile bulunur. Token toplamı önbellekten okunan tokenları saymaz (her çağrıda tekrar sayılırdı).
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

### 2026-10-04 — misa-train adı ve görsel temalarda ASCII kalitesi

#### Amaç
Kullanıcı isteği: Misa temasının adı `misa-train` olsun; tüm duvar kağıtlarında ASCII kalitesi artsın, çünkü görsel tabanlı temalarda yüzler anlaşılmıyor. Prosedürel temaların görünüşü kapsam dışı (yalnız çizim hızlandırması onları da etkiler).

#### Yapılanlar
- `web/js/themes/deathnote.js`: Kimlik `misa-train`, ad "Misa Train". `web/previews/misa-train.jpg` (eskisi silindi), `web/themes.tsv`, CI ekran koruyucu denetimi güncellendi.
- `web/js/util.js`: `AW.aliases` ve `AW.findTheme`; `deathnote-misa` → `misa-train`. `main.js` ve `headless.js` temayı bununla bulur.
- `mac/Sources/AsciiWallpaper/WallpaperController.swift`: Sayfanın bildirdiği tema kayıtlı ayardan farklıysa (takma ad çevrildiyse) ayar güncellenir.
- `web/js/image.js`: Görsel temalarda varsayılan `fontScale` 0.72 → 0.4; zemin hücrenin kendi rengi (yalnız çevresinden çok parlak noktalarda komşunun en karanlığı); görselden çift doğrusal örnekleme; kenar karakteri eşiği 0.32 → 0.5 (yumuşak geçişler doku olarak kalır); renkler 4'ün katlarına yuvarlanır; varsayılan `bgDim` 0.5 → 0.6.
- `web/js/main.js`: Yalnız değişen hücreler yeniden çizilir; hücre dikdörtgenleri tam piksele oturur. Yazı boyu alt sınırı 8 → 6 px (`mac/Saver/AsciiRenderer.swift` ile aynı).
- `scripts/encode-image.py`: `--size` seçeneği. Misa görseli 640x360'ta yeniden kodlandı (aynı ön işlemeyle).
- Tüm görsel temaların önizlemeleri yeniden üretildi; `README.md` güncellendi.

#### Hedef durumu
- [x] `misa-train` kimliği, eski kimlik takma ad olarak çalışıyor (Node testleri ve tarayıcıda denendi).
- [x] Görsel temalarda daha sık ızgara ve gerçek renkli zemin; önce/sonra karşılaştırması PR'da.
- [ ] Ekran koruyucuda yeni sık ızgaranın akıcılığı: CI yalnız çizildiğini doğrular, gerçek Mac'te `Doğrulanması gerekiyor`.

#### Teknik kararlar
- Yüzlerin okunmasını en çok zemin rengi ve hücre yoğunluğu belirliyor: eski "komşuların en karanlığı" zemini tonları yok ediyordu. Karakter seçimi parlaklık rampası olarak kaldı.
- Hypr görsellerinin kaynakları bu ortamdan indirilemedi (hypr.land ağ politikasıyla engelli), bu yüzden 320x180 verileri aynı kaldı; kazanç yeni çizimden geliyor. Kaynaklar bulunursa `--size 640x360` ile yeniden kodlanabilir.
- Sık ızgarada her kareyi baştan çizmek pahalı olduğu için değişen hücre çizimi eklendi: başsız Chromium'da `hypr-kath` görev süresi saniyede ~924 ms'den (eski ızgara, tam çizim) ~609 ms'ye düştü, `misa-train` ~280 ms. Gerçek Mac'te GPU'lu canvas ile farklı olabilir.

#### Testler
- `npm test`: 52 test geçti.
- Swift değişiklikleri (ayar senkronu, yazı boyu alt sınırı) yalnız macOS CI'da derlenir.

#### Bilinen sorunlar ve sonraki adımlar
- Görsel temalarda saat ve sistem paneli de sık ızgaraya çizildiği için daha küçük görünür (aynı gün sonraki kayıtta düzeltildi).
- Ekran koruyucu ayarında `deathnote-misa` seçiliyse rastgele temaya düşer (ekran koruyucu Swift tarafında takma ad yok).

### 2026-10-04 — Görsel temalarda saat ve panel boyutu

#### Amaç
Kullanıcı geri bildirimi: sık ızgaradan sonra görsel temalarda saat ve CPU paneli çok küçük kaldı. Görsel sık kalsın, arayüz diğer temalardaki boyutuna dönsün; masaüstünde ve ekran koruyucuda.

#### Yapılanlar
- `web/js/main.js`: Temanın `fontScale` değeri 1 değilse arayüz (saat, panel, tema adı, bildirim) normal yazı boyutlu ayrı bir ızgaraya çizilir ve sahnenin üstüne her karede yeniden çizilir. Kaybolan arayüz hücrelerinin altındaki sahne hücreleri yeniden çizilir. Yarı saydam zeminli hücreler önce temanın zeminiyle doldurulur (değişen hücrede eski yazının paneldeki gölgesi kalmasın).
- `web/js/headless.js`: `resizeUI(cols, rows, aspect)`; kurulduysa arayüz oraya çizilir, hücreleri karenin sonuna eklenir.
- `mac/Saver/AsciiSaverView.swift`, `AsciiEngine.swift`, `AsciiRenderer.swift`: Ekran koruyucu aynı şekilde normal boyutlu ikinci bir `AsciiRenderer` ile arayüz katmanını çizer; zeminsiz hücreler saydam kalır.
- `tests/headless.test.mjs`: Arayüz katmanı testi. Görsel temaların önizlemeleri yeniden üretildi.

#### Hedef durumu
- [x] Sayfada görsel temalarda saat ve panel prosedürel temalarla aynı boyutta (başsız Chromium'da 1710x1112 ekran görüntüsüyle denendi).
- [ ] Ekran koruyucuda arayüz katmanı: macOS CI'da derlenir ve `check-saver` ile çizilir; gerçek Mac'te `Doğrulanması gerekiyor`.

#### Teknik kararlar
- Arayüz boyutu prosedürel temalardakiyle aynı (`fontScale` 1) seçildi; PR #7 öncesinde görsel temalarda 0.72 idi, artık tüm temalarda tutarlı.
- Arayüz katmanı her karede baştan çizilir (birkaç yüz hücre); sahnenin değişen hücreleri altına çizilse de üstte kalır, ayrı bir kapanma hesabı gerekmez.

#### Testler
- `npm test`: 53 test geçti.
- Swift değişiklikleri yalnız macOS CI'da derlenir.

#### Bilinen sorunlar ve sonraki adımlar
- Yok.

### 2026-10-04 — README GIF galerisi

#### Amaç
Kullanıcı isteği: saat/panel ölçeklemesi düzeldikten sonra README'yi güncelle, her temanın GIF'ini README'ye koy, varsayılan dala birleştir.

#### Yapılanlar
- `scripts/gifs.cjs`: Her temayı başsız Chromium'da 1440x900 çizer, Playwright saatiyle 24 kare yakalar, Pillow ile 720x450, 128 renkli GIF yapar.
- `docs/gifs/*.gif`: 23 tema (toplam ~11 MB; ateş ve plazma gibi gürültülü temalar 1-1.6 MB).
- `README.md`: Başa tema adı, kimliği ve GIF'iyle "Galeri"; Hypr açıklaması ve yeni tema adımları güncellendi.
- `web/js/main.js`: Hücre dikdörtgenleri ekranın gerçek piksellerine yuvarlanır. Kesirli piksel oranında (sayfa yakınlaştırması, küçültülmüş önizleme) yarı kaplanan kenar pikselleri eski çizimi silmiyordu; kaybolan tema bildiriminin soluk izi kalıyordu. Tüm önizlemeler yeniden üretildi.

#### Hedef durumu
- [x] Her temanın GIF'i README galerisinde.

#### Teknik kararlar
- GIF'ler tam boyutta çizilip küçültülür: doğrudan küçük ölçekte çizmek yazıları okunmaz yapıyordu. 600x375 boyut yalnız %10-30 küçültüyordu, okunurluk için 720x450 seçildi.
- Animasyon gerçek zamanda değil Playwright'ın sahte saatiyle ilerletilir; kareler eşit aralıklı ve tekrarlanabilir (saat 21:30 sabit).

#### Testler
- `npm test`: 53 test geçti.

#### Bilinen sorunlar ve sonraki adımlar
- Görünüş değişince GIF'ler kendiliğinden güncellenmez; `node scripts/gifs.cjs` yeniden çalıştırılmalı.

### 2026-10-04 — Claude Code paneli (duvar kağıdı + ekran koruyucu)

#### Amaç
Claude Code çalışırken duvar kağıdında ve ekran koruyucuda bir kenarda ne yaptığını/düşündüğünü, harcanan token'ı ve süreyi, hareket eden Clawd maskotuyla göstermek. riceutil'e dokunulmadı.

#### Yapılanlar
- `mac/Sources/AsciiWallpaper/ClaudeMonitor.swift`: Yeni. Açık oturumu seçer, kaydı artımlı ve arka planda okur; durum, araç, son düşünce/mesaj, token, süre üretir.
- `mac/Sources/AsciiWallpaper/WallpaperController.swift`, `StatusMenu.swift`: `showClaude` ayarı, menü anahtarı, `update` verisine `claude`.
- `mac/Saver/AsciiSaverView.swift`, `SaverOptions.swift`, `scripts/build-saver.sh`: Ekran koruyucuya aynı veri ve Seçenekler'de anahtar.
- `web/js/ui.js`: Clawd'lı Claude Code paneli (sağ alt; yer yoksa sol alt; o da yoksa çizilmez).
- `web/js/main.js`: Tarayıcıda `?claude=demo`.
- `tests/ui.test.mjs`: Panel içeriği, gizlenme ve çakışmama testleri. `README.md`: "Claude Code paneli" bölümü.

#### Hedef durumu
- [x] Panel duvar kağıdı ve ekran koruyucuda veriyle çiziliyor.
- [x] Ayarlardan kapatılabiliyor.
- [ ] Kurulu uygulamada (gerçek ekran koruyucu oturumunda) gözle doğrulama: kullanıcı yapacak.

#### Teknik kararlar
- Hook/ek kurulum yerine Claude Code'un kendi dosyaları okunur: sıfır yapılandırma. Bedeli: belgelenmemiş biçime bağımlılık.
- Claude Code düşünce metnini kayda boş yazıyor (yalnızca imza); bu durumda panel son mesajı "son mesaj" etiketiyle gösterir.

#### Testler
- `npm test`: 52 test geçti.
- `swift build -c release` (mac/) ve `./scripts/build-saver.sh`: Başarılı (yerel macOS).
- `ClaudeMonitor` canlı oturuma karşı küçük bir test programıyla denendi; ekran koruyucu ekran dışı çizdirilip (check-saver'ın bekleme eklenmiş kopyası) panel görsel olarak kontrol edildi.
- Önizlemeler (`web/previews`) değişmedi; panel yalnızca veri varken çizildiği için etkilenmez.

#### Bilinen sorunlar ve sonraki adımlar
- `scripts/check-saver.swift` kareleri beklemeden çizdiği için CI görüntülerinde Claude paneli çıkmaz (CI'da Claude Code da yok).
- riceutil'den paneli açıp kapatacak dış komut (`claude` anahtarı) eklenmedi; istenirse iki depoda birlikte yapılmalı.

### 2026-10-04 — Duvar kağıdı ara sıra kararıyor

#### Amaç
Kullanıcı duvar kağıdının bazen kararıp "kapanmış gibi" olduğunu bildirdi. Uygulama süreci çalışıyordu ve çökme raporu yoktu.

#### Yapılanlar
- `mac/Sources/AsciiWallpaper/WallpaperWindow.swift`: `WKNavigationDelegate`; `webViewWebContentProcessDidTerminate` sayfayı yeniden yükler (yeni sayfa `ready` gönderince ayarlar yeniden uygulanır).

#### Hedef durumu
- [x] Kurtarma kodu eklendi, derleniyor.
- [ ] Kararmanın bununla bittiğinin doğrulanması (kullanıcı gözlemleyecek).

#### Teknik kararlar
- Pencerenin zemini siyah ve web görünümünün sayfayı çizen ayrı bir süreci var; o süreç kapanınca hiçbir şey çizilmiyordu. Neden: `Belirsiz` (günlüklerde iz bulunamadı), en olası açıklama budur.

#### Testler
- `swift build -c release`: Başarılı. Süreç kapatma senaryosu elle denenmedi (WebContent süreçleri uygulamaya göre ayırt edilemiyor, ötekileri öldürmek başka uygulamaları etkiler).

#### Bilinen sorunlar ve sonraki adımlar
- Kararma sürerse: `log stream --predicate 'eventMessage CONTAINS "AsciiWallpaper"'` ile "WebContent süreci kapandı" mesajı görünüyor mu bakılmalı.

### 2026-10-04 — Vitrin tarzı README

#### Amaç
README'yi GitHub'da vitrin gibi duran bir hale getirmek; içerik korunur.

#### Yapılanlar
- `README.md`: Ortalanmış başlık, rozetler, ana görsel, özellik listesi, `web/previews` ile tema galerisi, Claude Code paneli görseli, açılır bölümler. `AI Generated` işareti tek kopya olarak korundu.
- `docs/hero.jpg`, `docs/claude-panel.jpg`: Helium'un başsız modu (`--headless=new --screenshot`) ile `index.html?claude=demo` çekildi; Playwright kurulu değildi.

#### Hedef durumu
- [x] README yenilendi, görsel yolları doğrulandı.

#### Testler
- `npm test`: 52 test geçti.

#### Bilinen sorunlar ve sonraki adımlar
- Görsellerde sol alttaki "tema:" bildirimi görünüyor (başsız modda sayfa zamanı yavaş ilerliyor); önemsiz.

### 2026-10-05 — Claude Code panelini depoya geri getirme

#### Amaç
Kullanıcı Claude Code panelinin kaybolduğunu bildirdi. Panelin çalışması (yukarıdaki 2026-10-04 kayıtları: panel, kararma düzeltmesi, vitrin README) yalnızca kullanıcının Mac'indeki `~/codeprojects/riceutil-wallpaper/Wallpaper` klonunda commit edilmemiş duruyordu; `riceutil wallpaper update` uygulamayı GitHub'dan yeniden derleyince panel kurulu uygulamadan gitti. Kapsam: o çalışmayı değiştirmeden depoya almak ve #6-#9 ile birleştirmek.

#### Yapılanlar
- Mac'teki 14 dosya, yerel çalışma ağacına dokunmadan (geçici index + `commit-tree`) `claude/project-thread-og59y5` dalına gönderildi, ardından varsayılan dal bu dala birleştirildi.
- `README.md`: Vitrin düzeni korundu; "Temalar" bölümündeki önizleme tabloları #9'un GIF galerisiyle değiştirildi, Misa Train açıklaması ve 23 tema sayısı eklendi, yeni tema adımlarına GIF adımı eklendi.
- `AGENTS.md`: İki tarafın kuralları ve kayıtları birlikte tutuldu.
- `docs/hero.jpg`, `docs/claude-panel.jpg`: Görsel temaların yeni sık ızgarası ve normal boyutlu arayüz katmanıyla Playwright'ta (`?theme=hypr-kath&claude=demo`) yeniden çekildi.

#### Hedef durumu
- [x] Panel kodu depoda ve varsayılan dalla birleşik; sayfada görsel temalarda arayüz katmanında normal boyutta çiziliyor (başsız Chromium'da denendi).
- [ ] Kurulu uygulamada ve ekran koruyucuda gözle doğrulama: kullanıcı güncelleyince.

#### Teknik kararlar
- Claude paneli `ui.js` içinde çizildiği için #8'in ayrı arayüz ızgarasına kendiliğinden girer; ek kod gerekmedi.

#### Testler
- `npm test`: 55 test geçti.
- Swift (uygulama ve ekran koruyucu) yalnız macOS CI'da derlenir.

#### Bilinen sorunlar ve sonraki adımlar
- Mac'teki `~/codeprojects/riceutil-wallpaper/Wallpaper` klonu hâlâ eski dalda ve commit edilmemiş değişikliklerle duruyor; birleştirmeden sonra o klonda çalışılacaksa değişiklikler atılıp güncel dal çekilmeli.

### 2026-10-05 — Light Yagami teması ve tema paketleri

#### Amaç
Kullanıcı isteği: gönderdiği Light Yagami görselinden yeni bir tema; temalar paketlere ayrılsın (Anime, Hyprland ...) ve ayrı ayrı indirilebilsin. Paketler riceutil'den (komut + GUI) indirilip kaldırılır, duvar kağıdında ve ekran koruyucuda çalışır; her şeyi kurmuş kullanıcı bir şey kaybetmez.

#### Yapılanlar
- `packs/anime/js/light.js`, `packs/anime/js/light/light.data.js`: `light-yagami` ("Light Yagami"). Kare görsel 16:9'a yerleştirildi (Light sağa dayalı, alt kısmı kırpık, sol kenarı karanlığa karışıyor; solda üretilmiş koyu rüzgar dokusu; kontrast ve renk 1.12), 640x360 kodlandı. Canlı: arka planda sağa akan rüzgar şeritleri, 14 saniyede bir gözlerde kırmızı parıltı.
- `packs/hyprland/`, `packs/anime/`: Hypr temaları ve Misa Train `web/js/themes`'ten taşındı; her pakette `pack.json`, `themes.tsv`, `previews/`.
- `web/js/packs.js`, `web/js/util.js`: `AW.beginPack`/`AW.endPack`, temalar `pack` alanını taşır; uygulamada `AW_PACKS`, tarayıcıda `packs/index.js`.
- `scripts/pack.sh`: `list|add|remove|sync`; `install.sh` `sync` çağırır.
- `mac/Sources/AsciiWallpaper/ThemePacks.swift`, `WallpaperWindow.swift`, `WallpaperController.swift`, `StatusMenu.swift`: Paket betikleri `WKUserScript` ile verilir, `packs reload` bildirimi, menüde temalar paket başlıklarıyla.
- `mac/Saver/AsciiEngine.swift`, `scripts/build-saver.sh`: Ekran koruyucu kurulu paketleri yükler.
- `scripts/packs.mjs`, `themes-manifest.mjs`, `previews.cjs`, `gifs.cjs`, `encode-image.py`, `tests/*`: Paket yapısına uyarlandı; `tests/packs.test.mjs` yeni (seyrek klon dahil).
- `.github/workflows/ci.yml`: Paketler kurulur; paket kaldırınca sayfaların yeniden açılıp temanın ilk temaya düşmesi denenir; ekran koruyucuda `light-yagami` çizilir.
- `README.md`: Galeri paketlere göre, "Tema paketleri" bölümü, Light Yagami. `docs/gifs/light-yagami.gif`.

#### Hedef durumu
- [x] Light Yagami teması sayfada ve tarayıcısız sürücüde çiziliyor (Node testleri, başsız Chromium).
- [x] Paketler: `pack.sh` testleri (seyrek klonda isteğe bağlı indirme dahil) geçiyor.
- [ ] Uygulama ve ekran koruyucuda paket yükleme: macOS CI'da denenecek; gerçek Mac'te `Doğrulanması gerekiyor`.

#### Teknik kararlar
- İndirme yolu olarak git seyrek klonu seçildi: depo özel olduğu için sürüm eki (release asset) indirmek token isterdi; riceutil'in mevcut git erişimi aynen kullanılır ve paket dosyaları gerçekten ancak istenince iner.
- Paketler uygulama paketinin içine değil `~/Library/Application Support` altına kurulur: eklemek/kaldırmak yeniden derleme ya da yeniden imzalama gerektirmez, uygulama sayfaları yeniden açar.
- Uygulamada paket betikleri dosyadan değil `WKUserScript` ile verilir: `loadFileURL` okuma izni uygulama paketinin `web/` klasörüyle sınırlı.
- Eski kurulumların temaları kaybolmasın diye `sync` paket klasörü hiç yoksa depoda bulunan her paketi kurar; riceutil'in seyrek klonunda bu "hiçbiri" demektir.
- Light görselinde rüzgar yalnız silüet çokgeninin dışındaki karanlık hücrelerde, dört seviyeye yuvarlanarak çizilir; böylece sayfa yalnız şeritlerin kenarındaki hücreleri yeniden çizer.

#### Testler
- `npm test`: 61 test geçti.
- `shellcheck scripts/*.sh`: Temiz.
- Swift değişiklikleri yalnız macOS CI'da derlenir.

#### Bilinen sorunlar ve sonraki adımlar
- Paket eklenince/kaldırılınca ekran koruyucu ancak bir sonraki açılışında yeni listeyi görür (`killall legacyScreenSaver` ile eski örnek kapatılır).

### 2026-10-05 — One Piece · Thousand Sunny teması

#### Amaç
Kullanıcı isteği: gönderdiği Hasır Şapka Korsanları grup görselindeki karakterler bir gemide olsun ve gemi hareket etsin. Anime paketine yeni bir tema; diğer temalar kapsam dışı.

#### Yapılanlar
- `packs/anime/js/sunny.js`, `packs/anime/js/sunny/sunny.data.js`: `thousand-sunny` ("Thousand Sunny"). Sahne Python/Pillow ile kuruldu: grup görselinin gökyüzü (üst kenara bağlı mavi/beyaz bölgeler) ayıklandı, mürettebat sol ve üst kenardan taşacak şekilde yerleştirildi, önüne Thousand Sunny'nin gövdesi, küpeştesi, lumbozları ve ayçiçeği yeleli aslan başı, arkasına korsan bayraklı yelken, sağ kenarını örten ön direk ve Hasır Şapka bayrağı çizildi; 640x360 kodlandı. Canlı: gemi (görsel + maske) dalgalarla tam satır adımlarıyla iner kalkar, ön dalgalar gövdeyi keser; deniz derinliğe göre perspektifli akar, bulutlar ve martılar geçer, gövdede köpük, aslan başında serpinti, kıçta dümen suyu.
- `scripts/encode-image.py`: `--mask` seçeneği (görselle aynı kırpma ve boyutla, piksel başına bir bit).
- `web/js/image.js`: `AW.decode64` dışa açıldı (maskeyi okumak için).
- `packs/anime/pack.json`, `themes.tsv`, `previews/thousand-sunny.jpg`, `packs/index.js`, `web/packs.tsv`, `docs/gifs/thousand-sunny.gif`, `README.md`, `tests/themes.test.mjs`, `.github/workflows/ci.yml` (ekran koruyucu çizim denetimi): Tema kaydı, liste, önizleme, GIF ve belge.

#### Hedef durumu
- [x] Tema sayfada ve tarayıcısız sürücüde çiziliyor (Node testleri, başsız Chromium'da 16:9 ve 16:10).
- [ ] Ekran koruyucuda çizim: macOS CI'da `check-saver` ile; gerçek Mac'te `Doğrulanması gerekiyor`.

#### Teknik kararlar
- Gökyüzü ve deniz görselden değil canlı çizilir; maske (1 = gemi ve mürettebat) hangi hücrenin görselden geleceğini söyler. Gemi kaydırılırken maske de kaydırılır, açılan yerlere gökyüzü/deniz çizilir.
- Sallanma tam satır adımlarıyla: sayfa yalnız değişen hücreleri çizdiği için gemi yalnız adım anlarında baştan çizilir. Eğilme (baş-kıç) eklenmedi: satırları sütuna göre farklı kaydırmak yüzleri bozuyordu.
- Deniz rengi satır başına önceden hesaplanır, her deniz hücresi iki karede, bulutlar üç karede bir hesaplanır: 300x94 ızgarada tarayıcısız sürücüde kare başına ~15 ms (Misa Train ~9 ms).
- Mürettebatın sağ kenarı ön direğin arkasında bırakıldı, sol ve üst kenarı ekran dışında: grup görselinin düz kesik kenarları görünmesin. Kompozisyon betiği ve kaynak görsel depoya eklenmedi (önceki görsel temalarla aynı).

#### Testler
- `npm test`: 63 test geçti.
- Swift değişmedi; ekran koruyucu çizimi macOS CI'da doğrulanır.

#### Bilinen sorunlar ve sonraki adımlar
- Ön direkteki Hasır Şapka bayrağı sistem paneli açıkken panelin altında kalır.
