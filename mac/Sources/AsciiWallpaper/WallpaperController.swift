import AppKit
import WebKit

/// Her ekran için bir duvar kağıdı penceresi açar, istatistikleri toplayıp sayfalara gönderir
/// ve ayarları (tema, panel, sırayla değiştirme) saklar. Ayarlar dışarıdan (riceutil) dağıtık bildirimle de değişir.
@MainActor
final class WallpaperController: NSObject, WKScriptMessageHandler {
    struct Theme {
        let id: String
        let name: String
    }

    private(set) var themes: [Theme] = []
    private var windows: [WallpaperWindow] = []
    private let webDirectory: URL
    private let stats = StatsMonitor()
    private let nowPlaying = NowPlaying()
    private let weather = Weather()
    private let claude = ClaudeMonitor()
    private var track: String?
    private var timers: [Timer] = []
    private var lastRotation = Date()

    private let defaults = UserDefaults.standard

    var themeID: String {
        get { defaults.string(forKey: "theme") ?? "lake" }
        set { defaults.set(newValue, forKey: "theme") }
    }

    var showPanel: Bool {
        get { defaults.object(forKey: "showPanel") as? Bool ?? true }
        set { defaults.set(newValue, forKey: "showPanel"); broadcast("window.wallpaper && wallpaper.setPanel(\(newValue))") }
    }

    var showClock: Bool {
        get { defaults.object(forKey: "showClock") as? Bool ?? true }
        set { defaults.set(newValue, forKey: "showClock"); broadcast("window.wallpaper && wallpaper.setClock(\(newValue))") }
    }

    var showThemeName: Bool {
        get { defaults.object(forKey: "showThemeName") as? Bool ?? true }
        set { defaults.set(newValue, forKey: "showThemeName"); broadcast("window.wallpaper && wallpaper.setThemeName(\(newValue))") }
    }

    /// Claude Code çalışırken köşedeki panel (veri her saniye `update` ile gider)
    var showClaude: Bool {
        get { defaults.object(forKey: "showClaude") as? Bool ?? true }
        set { defaults.set(newValue, forKey: "showClaude"); tick() }
    }

    /// 0 = kapalı, aksi halde dakika cinsinden tema değiştirme aralığı
    var rotateMinutes: Int {
        get { defaults.integer(forKey: "rotateMinutes") }
        set { defaults.set(newValue, forKey: "rotateMinutes"); lastRotation = Date() }
    }

    init(webDirectory: URL) {
        self.webDirectory = webDirectory
        super.init()
    }

    func start() {
        rebuildWindows()

        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(screensChanged), name: NSApplication.didChangeScreenParametersNotification, object: nil)
        let workspace = NSWorkspace.shared.notificationCenter
        workspace.addObserver(self, selector: #selector(pause), name: NSWorkspace.screensDidSleepNotification, object: nil)
        workspace.addObserver(self, selector: #selector(pause), name: NSWorkspace.sessionDidResignActiveNotification, object: nil)
        workspace.addObserver(self, selector: #selector(resume), name: NSWorkspace.screensDidWakeNotification, object: nil)
        workspace.addObserver(self, selector: #selector(resume), name: NSWorkspace.sessionDidBecomeActiveNotification, object: nil)
        DistributedNotificationCenter.default().addObserver(
            self, selector: #selector(remoteCommand(_:)), name: Self.commandNotification, object: nil,
            suspensionBehavior: .deliverImmediately)

        timers = [
            Timer.scheduledTimer(timeInterval: 1, target: self, selector: #selector(tick), userInfo: nil, repeats: true),
            Timer.scheduledTimer(timeInterval: 5, target: self, selector: #selector(refreshTrack), userInfo: nil, repeats: true),
            Timer.scheduledTimer(timeInterval: 15 * 60, target: self, selector: #selector(refreshWeather), userInfo: nil, repeats: true),
        ]
        refreshWeather()
        refreshTrack()
    }

    // MARK: Pencereler

    @objc private func screensChanged() {
        rebuildWindows()
    }

    private func rebuildWindows() {
        windows.forEach { $0.close() }
        windows = NSScreen.screens.map { screen in
            let window = WallpaperWindow(screen: screen, webDirectory: webDirectory, messageHandler: WeakHandler(self))
            window.orderBack(nil)
            return window
        }
    }

    private func broadcast(_ script: String) {
        windows.forEach { $0.run(script) }
    }

    // MARK: Ayarlar

    func setTheme(_ id: String) {
        themeID = id
        broadcast("window.wallpaper && wallpaper.setTheme(\(jsString(id)))")
    }

    func nextTheme() {
        guard !themes.isEmpty else { return }
        let index = themes.firstIndex { $0.id == themeID } ?? -1
        setTheme(themes[(index + 1) % themes.count].id)
    }

    // MARK: Dışarıdan komutlar

    /// riceutil gibi araçların gönderdiği bildirim. userInfo anahtarları (hepsi isteğe bağlı, değerler metin):
    /// theme = tema kimliği, next = "1", panel / clock / name = "1" | "0", rotate = dakika.
    static let commandNotification = Notification.Name("dev.eymn.ascii-wallpaper.command")

    @objc private func remoteCommand(_ note: Notification) {
        guard let info = note.userInfo else { return }
        func value(_ key: String) -> String? {
            guard let v = info[key] else { return nil }
            return (v as? String) ?? (v as? NSNumber)?.stringValue
        }
        func flag(_ key: String) -> Bool? {
            guard let v = value(key)?.lowercased() else { return nil }
            return ["1", "true", "on", "yes", "açık"].contains(v)
        }
        if let id = value("theme"), themes.isEmpty || themes.contains(where: { $0.id == id }) { setTheme(id) }
        if value("next") != nil { nextTheme() }
        if let on = flag("panel") { showPanel = on }
        if let on = flag("clock") { showClock = on }
        if let on = flag("name") { showThemeName = on }
        if let minutes = value("rotate").flatMap({ Int($0) }) { rotateMinutes = max(0, minutes) }
    }

    @objc func pause() { broadcast("window.wallpaper && wallpaper.setPaused(true)") }
    @objc func resume() { broadcast("window.wallpaper && wallpaper.setPaused(false)") }

    // MARK: Veri

    @objc private func tick() {
        let s = stats.sample()
        var payload: [String: Any] = [
            "cpu": s.cpu,
            "ram": s.ramUsedGB,
            "ramTotal": s.ramTotalGB,
            "charging": s.charging,
            "onBattery": s.onBattery,
            "down": s.downMBps,
            "up": s.upMBps,
            "track": track ?? "",
            "weather": weather.text ?? "",
        ]
        payload["battery"] = s.battery ?? NSNull()
        payload["claude"] = (showClaude ? claude.current() : nil) ?? NSNull()
        if let data = try? JSONSerialization.data(withJSONObject: payload),
           let json = String(data: data, encoding: .utf8) {
            broadcast("window.wallpaper && wallpaper.update(\(json))")
        }

        if rotateMinutes > 0, Date().timeIntervalSince(lastRotation) >= Double(rotateMinutes * 60) {
            lastRotation = Date()
            nextTheme()
        }
    }

    @objc private func refreshTrack() {
        track = nowPlaying.current()
    }

    @objc private func refreshWeather() {
        weather.refresh {}
    }

    // MARK: Sayfadan gelen mesajlar

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        if type == "ready" {
            if let list = body["themes"] as? [[String: Any]] {
                themes = list.compactMap { item in
                    guard let id = item["id"] as? String, let name = item["name"] as? String else { return nil }
                    return Theme(id: id, name: name)
                }
            }
            // Yeni açılan sayfayı kayıtlı ayarlara getir
            message.webView?.evaluateJavaScript("""
            wallpaper.setTheme(\(jsString(themeID)));
            wallpaper.setPanel(\(showPanel));
            wallpaper.setClock(\(showClock));
            wallpaper.setThemeName(\(showThemeName));
            """, completionHandler: nil)
            tick()
        }
    }

    private func jsString(_ s: String) -> String {
        let data = try? JSONSerialization.data(withJSONObject: [s])
        let array = data.flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
        return String(array.dropFirst().dropLast())
    }
}

/// WKUserContentController mesaj işleyicisini güçlü tuttuğu için arada zayıf referanslı bir köprü.
@MainActor
private final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?

    init(_ target: WKScriptMessageHandler) {
        self.target = target
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}
