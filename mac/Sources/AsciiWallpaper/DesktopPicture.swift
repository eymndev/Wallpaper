import AppKit

/// Etkin temanın sabit PNG'sini (Klasik: `web/desktop/<tema>.png`, paketler: `<paket>/desktop/<tema>.png`,
/// `scripts/desktop.cjs` üretir) macOS'un kendi masaüstü resmi yapar. Hareketli duvar kağıdı masaüstü seviyesinde bir
/// penceredir; kilit ekranı, giriş ekranı, uygulama kapalıyken ya da sayfa açılırken görünen ise sistemin masaüstü
/// resmidir. Böylece oralarda da aynı tema görünür.
@MainActor
enum DesktopPicture {
    /// Sistemin gösterdiği kopyalar burada durur: uygulama güncellenirken (paket silinip yeniden kopyalanır) ya da
    /// tema paketi kaldırılınca gösterilen dosya kaybolmasın.
    static var directory: URL {
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Application Support")
        return support.appendingPathComponent("ASCII Wallpaper/desktop")
    }

    /// Temanın PNG'si; yoksa (eski paket kurulumu, PNG'si üretilmemiş tema) nil
    static func source(theme: String, pack: String, webDirectory: URL) -> URL? {
        let base = pack == "klasik" ? webDirectory : ThemePacks.directory.appendingPathComponent(pack)
        let url = base.appendingPathComponent("desktop/\(theme).png")
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    /// Temanın PNG'sini tüm ekranlarda (her ekranın o an etkin Space'inde) masaüstü resmi yapar. Zaten oysa dokunmaz;
    /// her tema değişiminde, Space değişiminde ve ekran eklenince çağrılabilir.
    static func show(_ source: URL, theme: String, defaults: UserDefaults) {
        guard let url = copy(source, theme: theme) else { return }
        rememberPrevious(defaults)
        let workspace = NSWorkspace.shared
        let options: [NSWorkspace.DesktopImageOptionKey: Any] = [
            .imageScaling: NSImageScaling.scaleProportionallyUpOrDown.rawValue,
            .allowClipping: true, // "Ekranı doldur": 16:9 ekranda üstten/alttan kırpılır
            .fillColor: NSColor.black,
        ]
        for screen in NSScreen.screens where !isSame(workspace.desktopImageURL(for: screen), url) {
            do {
                try workspace.setDesktopImageURL(url, for: screen, options: options)
            } catch {
                NSLog("AsciiWallpaper: masaüstü resmi ayarlanamadı: \(error.localizedDescription)")
            }
        }
        // Başka temaların eski kopyaları gereksiz (görünmeyen bir Space'te gösteriliyorsa oraya geçince yenilenir)
        let fm = FileManager.default
        for name in (try? fm.contentsOfDirectory(atPath: directory.path)) ?? [] where name != url.lastPathComponent {
            try? fm.removeItem(at: directory.appendingPathComponent(name))
        }
    }

    /// Özellik kapatılınca kullanıcının önceki masaüstü resmine dön
    static func restore(_ defaults: UserDefaults) {
        guard let path = defaults.string(forKey: previousKey) else { return }
        defaults.removeObject(forKey: previousKey)
        guard FileManager.default.fileExists(atPath: path) else { return }
        let url = URL(fileURLWithPath: path)
        for screen in NSScreen.screens {
            try? NSWorkspace.shared.setDesktopImageURL(url, for: screen, options: [:])
        }
    }

    private static let previousKey = "previousDesktopPicture"

    /// Kullanıcının kendi masaüstü resmini (bizim kopyalarımızdan biri değilse) bir kez sakla
    private static func rememberPrevious(_ defaults: UserDefaults) {
        guard defaults.string(forKey: previousKey) == nil, let screen = NSScreen.main,
              let current = NSWorkspace.shared.desktopImageURL(for: screen),
              !current.standardizedFileURL.path.hasPrefix(directory.standardizedFileURL.path)
        else { return }
        defaults.set(current.path, forKey: previousKey)
    }

    /// Kopyanın adında dosya boyutu var: PNG yeniden üretilince adres de değişir, macOS önbellekteki eskisini göstermez.
    private static func copy(_ source: URL, theme: String) -> URL? {
        let fm = FileManager.default
        guard let size = (try? fm.attributesOfItem(atPath: source.path))?[.size] as? NSNumber else { return nil }
        let target = directory.appendingPathComponent("\(theme)-\(size.intValue).png")
        if fm.fileExists(atPath: target.path) { return target }
        do {
            try fm.createDirectory(at: directory, withIntermediateDirectories: true)
            try fm.copyItem(at: source, to: target)
            return target
        } catch {
            NSLog("AsciiWallpaper: masaüstü resmi kopyalanamadı: \(error.localizedDescription)")
            return nil
        }
    }

    private static func isSame(_ a: URL?, _ b: URL) -> Bool {
        a?.standardizedFileURL.path == b.standardizedFileURL.path
    }
}
