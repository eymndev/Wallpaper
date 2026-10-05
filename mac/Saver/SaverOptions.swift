import AppKit
import ScreenSaver

/// Ekran koruyucu ayarları (Sistem Ayarları → Ekran Koruyucu → Seçenekler).
struct SaverSettings {
    static let random = "__random__"
    private static let module = "dev.eymn.ascii-wallpaper.saver"

    private let defaults: UserDefaults = ScreenSaverDefaults(forModuleWithName: SaverSettings.module) ?? .standard

    /// Tema kimliği, rastgele için `random`
    var theme: String {
        get { defaults.string(forKey: "theme") ?? SaverSettings.random }
        nonmutating set { defaults.set(newValue, forKey: "theme"); defaults.synchronize() }
    }

    var showPanel: Bool {
        get { defaults.object(forKey: "showPanel") as? Bool ?? false }
        nonmutating set { defaults.set(newValue, forKey: "showPanel"); defaults.synchronize() }
    }

    var showClock: Bool {
        get { defaults.object(forKey: "showClock") as? Bool ?? true }
        nonmutating set { defaults.set(newValue, forKey: "showClock"); defaults.synchronize() }
    }

    var showThemeName: Bool {
        get { defaults.object(forKey: "showThemeName") as? Bool ?? true }
        nonmutating set { defaults.set(newValue, forKey: "showThemeName"); defaults.synchronize() }
    }

    /// Claude Code çalışırken köşedeki panel
    var showClaude: Bool {
        get { defaults.object(forKey: "showClaude") as? Bool ?? true }
        nonmutating set { defaults.set(newValue, forKey: "showClaude"); defaults.synchronize() }
    }
}

/// Seçenekler penceresi: tema, sistem paneli, saat, tema adı ve Claude Code paneli.
@MainActor
final class SaverOptions: NSObject {
    let window: NSWindow
    private let settings = SaverSettings()
    private let popup = NSPopUpButton()
    private let panelBox = NSButton(checkboxWithTitle: "Sistem panelini göster", target: nil, action: nil)
    private let clockBox = NSButton(checkboxWithTitle: "Saati göster", target: nil, action: nil)
    private let nameBox = NSButton(checkboxWithTitle: "Tema adını köşede göster", target: nil, action: nil)
    private let claudeBox = NSButton(checkboxWithTitle: "Claude Code çalışırken paneli göster", target: nil, action: nil)
    private let themes: [(id: String, name: String)]
    private let onSave: () -> Void

    init(themes: [(id: String, name: String)], onSave: @escaping () -> Void) {
        self.themes = themes
        self.onSave = onSave
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 360, height: 230), styleMask: [.titled], backing: .buffered, defer: true)
        super.init()

        popup.addItem(withTitle: "Rastgele (her açılışta)")
        popup.menu?.addItem(.separator())
        for theme in themes { popup.addItem(withTitle: theme.name) }
        if let index = themes.firstIndex(where: { $0.id == settings.theme }) {
            popup.selectItem(at: index + 2)
        }
        panelBox.state = settings.showPanel ? .on : .off
        clockBox.state = settings.showClock ? .on : .off
        nameBox.state = settings.showThemeName ? .on : .off
        claudeBox.state = settings.showClaude ? .on : .off

        let label = NSTextField(labelWithString: "Tema:")
        let done = NSButton(title: "Tamam", target: self, action: #selector(save))
        done.keyEquivalent = "\r"
        let cancel = NSButton(title: "Vazgeç", target: self, action: #selector(close))
        cancel.keyEquivalent = "\u{1b}"

        let row = NSStackView(views: [label, popup])
        let buttons = NSStackView(views: [cancel, done])
        let stack = NSStackView(views: [row, panelBox, clockBox, nameBox, claudeBox, buttons])
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 12
        stack.edgeInsets = NSEdgeInsets(top: 20, left: 20, bottom: 20, right: 20)
        stack.setCustomSpacing(20, after: claudeBox)
        buttons.translatesAutoresizingMaskIntoConstraints = false
        window.contentView = stack
        NSLayoutConstraint.activate([buttons.trailingAnchor.constraint(equalTo: stack.trailingAnchor, constant: -20)])
    }

    @objc private func save() {
        let index = popup.indexOfSelectedItem
        settings.theme = index >= 2 && index - 2 < themes.count ? themes[index - 2].id : SaverSettings.random
        settings.showPanel = panelBox.state == .on
        settings.showClock = clockBox.state == .on
        settings.showThemeName = nameBox.state == .on
        settings.showClaude = claudeBox.state == .on
        onSave()
        close()
    }

    @objc private func close() {
        if let parent = window.sheetParent {
            parent.endSheet(window)
        } else {
            window.close()
        }
    }
}
