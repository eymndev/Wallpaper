import AppKit
import ServiceManagement

/// Menü çubuğundaki simge: tema seçimi, panel/saat ayarları, girişte başlatma ve çıkış.
@MainActor
final class StatusMenu: NSObject, NSMenuDelegate {
    private let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    private let controller: WallpaperController
    private let menu = NSMenu()

    init(controller: WallpaperController) {
        self.controller = controller
        super.init()
        if let button = item.button {
            button.image = NSImage(systemSymbolName: "square.grid.3x3.fill", accessibilityDescription: "ASCII Wallpaper")
            button.image?.isTemplate = true
        }
        menu.delegate = self
        item.menu = menu
    }

    // Menü her açıldığında güncel durumla yeniden kurulur
    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()

        let themeItem = NSMenuItem(title: "Tema", action: nil, keyEquivalent: "")
        let themeMenu = NSMenu()
        if controller.themes.isEmpty {
            themeMenu.addItem(NSMenuItem(title: "Yükleniyor…", action: nil, keyEquivalent: ""))
        }
        for theme in controller.themes {
            let entry = NSMenuItem(title: theme.name, action: #selector(selectTheme(_:)), keyEquivalent: "")
            entry.target = self
            entry.representedObject = theme.id
            entry.state = theme.id == controller.themeID ? .on : .off
            themeMenu.addItem(entry)
        }
        themeItem.submenu = themeMenu
        menu.addItem(themeItem)
        menu.addItem(action("Sonraki tema", #selector(nextTheme), key: "n"))

        let rotateItem = NSMenuItem(title: "Temaları sırayla değiştir", action: nil, keyEquivalent: "")
        let rotateMenu = NSMenu()
        for (title, minutes) in [("Kapalı", 0), ("Her 10 dakikada", 10), ("Her 30 dakikada", 30), ("Her saat", 60)] {
            let entry = NSMenuItem(title: title, action: #selector(setRotation(_:)), keyEquivalent: "")
            entry.target = self
            entry.tag = minutes
            entry.state = controller.rotateMinutes == minutes ? .on : .off
            rotateMenu.addItem(entry)
        }
        rotateItem.submenu = rotateMenu
        menu.addItem(rotateItem)

        menu.addItem(.separator())
        menu.addItem(toggle("Sistem panelini göster", controller.showPanel, #selector(togglePanel)))
        menu.addItem(toggle("Saati göster", controller.showClock, #selector(toggleClock)))
        menu.addItem(toggle("Oturum açılışında başlat", SMAppService.mainApp.status == .enabled, #selector(toggleLogin)))
        menu.addItem(.separator())
        menu.addItem(action("Çıkış", #selector(quit), key: "q"))
    }

    private func action(_ title: String, _ selector: Selector, key: String = "") -> NSMenuItem {
        let entry = NSMenuItem(title: title, action: selector, keyEquivalent: key)
        entry.target = self
        return entry
    }

    private func toggle(_ title: String, _ on: Bool, _ selector: Selector) -> NSMenuItem {
        let entry = action(title, selector)
        entry.state = on ? .on : .off
        return entry
    }

    @objc private func selectTheme(_ sender: NSMenuItem) {
        if let id = sender.representedObject as? String { controller.setTheme(id) }
    }

    @objc private func nextTheme() { controller.nextTheme() }
    @objc private func setRotation(_ sender: NSMenuItem) { controller.rotateMinutes = sender.tag }
    @objc private func togglePanel() { controller.showPanel.toggle() }
    @objc private func toggleClock() { controller.showClock.toggle() }

    @objc private func toggleLogin() {
        let service = SMAppService.mainApp
        do {
            if service.status == .enabled { try service.unregister() } else { try service.register() }
        } catch {
            let alert = NSAlert()
            alert.messageText = "Oturum açılışı ayarı değiştirilemedi"
            alert.informativeText = "Uygulamayı Uygulamalar klasörüne taşıyıp tekrar dene.\n\(error.localizedDescription)"
            alert.runModal()
        }
    }

    @objc private func quit() { NSApp.terminate(nil) }
}
