import AppKit

@main
enum AsciiWallpaperApp {
    @MainActor
    static func main() {
        let app = NSApplication.shared
        let delegate = AppDelegate()
        app.delegate = delegate
        app.setActivationPolicy(.accessory) // Dock'ta görünmez, sadece menü çubuğunda
        app.run()
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var controller: WallpaperController?
    private var statusMenu: StatusMenu?

    func applicationDidFinishLaunching(_ notification: Notification) {
        guard let web = Self.findWebDirectory() else {
            let alert = NSAlert()
            alert.messageText = "web klasörü bulunamadı"
            alert.informativeText = "Uygulamayı scripts/build-app.sh ile derle ya da AW_WEB_DIR ortam değişkenini ayarla."
            alert.runModal()
            NSApp.terminate(nil)
            return
        }
        let controller = WallpaperController(webDirectory: web)
        controller.start()
        self.controller = controller
        statusMenu = StatusMenu(controller: controller)
    }

    /// Sırayla: uygulama paketi içi, AW_WEB_DIR, çalışma dizini ve üstündeki klasörler (`swift run` için).
    static func findWebDirectory() -> URL? {
        var candidates: [URL] = []
        if let resources = Bundle.main.resourceURL {
            candidates.append(resources.appendingPathComponent("web"))
        }
        if let env = ProcessInfo.processInfo.environment["AW_WEB_DIR"] {
            candidates.append(URL(fileURLWithPath: env))
        }
        var dir = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        for _ in 0..<4 {
            candidates.append(dir.appendingPathComponent("web"))
            dir.deleteLastPathComponent()
        }
        return candidates.first {
            FileManager.default.fileExists(atPath: $0.appendingPathComponent("index.html").path)
        }
    }
}
