import AppKit
import ScreenSaver
import WebKit

/// Ekran koruyucu: duvar kağıdıyla aynı sayfayı (web/) tam ekran gösterir ve
/// CPU, RAM, pil ve ağ verisini saniyede bir sayfaya gönderir.
@objc(AsciiSaverView)
final class AsciiSaverView: ScreenSaverView, WKScriptMessageHandler {
    private var webView: WKWebView?
    private let stats = StatsMonitor()
    private var timer: Timer?
    private var options: SaverOptions?

    private var bundle: Bundle { Bundle(for: AsciiSaverView.self) }
    private var webDirectory: URL? { bundle.resourceURL?.appendingPathComponent("web") }

    override init?(frame: NSRect, isPreview: Bool) {
        super.init(frame: frame, isPreview: isPreview)
        setUp()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setUp()
    }

    private func setUp() {
        animationTimeInterval = 1 // çizim sayfanın kendi döngüsünde, burada sadece istatistik
        wantsLayer = true
        layer?.backgroundColor = NSColor.black.cgColor
        guard let web = webDirectory else { return }

        let config = WKWebViewConfiguration()
        config.userContentController.add(SaverMessageProxy(self), name: "aw")
        config.suppressesIncrementalRendering = true
        let view = WKWebView(frame: bounds, configuration: config)
        view.setValue(false, forKey: "drawsBackground")
        view.autoresizingMask = [.width, .height]
        addSubview(view)
        webView = view
        view.loadFileURL(web.appendingPathComponent("index.html"), allowingReadAccessTo: web)

        // macOS 14+ ekran koruyucuyu kapatırken stopAnimation çağırmayabiliyor
        DistributedNotificationCenter.default().addObserver(
            self, selector: #selector(willStop), name: Notification.Name("com.apple.screensaver.willstop"), object: nil)
    }

    deinit {
        DistributedNotificationCenter.default().removeObserver(self)
    }

    // MARK: Yaşam döngüsü

    override func startAnimation() {
        super.startAnimation()
        run("window.wallpaper && wallpaper.setPaused(false)")
        timer?.invalidate()
        timer = Timer.scheduledTimer(timeInterval: 1, target: self, selector: #selector(tick), userInfo: nil, repeats: true)
    }

    override func stopAnimation() {
        super.stopAnimation()
        pauseAll()
    }

    @objc private func willStop() {
        pauseAll()
    }

    private func pauseAll() {
        timer?.invalidate()
        timer = nil
        run("window.wallpaper && wallpaper.setPaused(true)")
    }

    override func animateOneFrame() {}

    // MARK: Sayfa

    private func run(_ script: String) {
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    @objc private func tick() {
        let s = stats.sample()
        var payload: [String: Any] = [
            "cpu": s.cpu, "ram": s.ramUsedGB, "ramTotal": s.ramTotalGB,
            "charging": s.charging, "onBattery": s.onBattery,
            "down": s.downMBps, "up": s.upMBps, "track": "", "weather": "",
        ]
        payload["battery"] = s.battery ?? NSNull()
        if let data = try? JSONSerialization.data(withJSONObject: payload),
           let json = String(data: data, encoding: .utf8) {
            run("window.wallpaper && wallpaper.update(\(json))")
        }
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], body["type"] as? String == "ready" else { return }
        let settings = SaverSettings()
        var theme = settings.theme
        if theme == SaverSettings.random, let list = body["themes"] as? [[String: Any]] {
            let ids = list.compactMap { $0["id"] as? String }
            theme = ids.randomElement() ?? ""
        }
        var script = "wallpaper.setPanel(\(settings.showPanel)); wallpaper.setClock(\(settings.showClock));"
        if !theme.isEmpty, let data = try? JSONSerialization.data(withJSONObject: [theme]),
           let array = String(data: data, encoding: .utf8) {
            script += "wallpaper.setTheme(\(array.dropFirst().dropLast()));"
        }
        run(script)
        tick()
    }

    // MARK: Ayarlar penceresi

    override var hasConfigureSheet: Bool { true }

    override var configureSheet: NSWindow? {
        let themes = webDirectory.map(SaverSettings.themes(in:)) ?? []
        let sheet = SaverOptions(themes: themes)
        options = sheet
        return sheet.window
    }
}

/// WKUserContentController işleyicisini güçlü tuttuğu için arada zayıf referanslı köprü.
@MainActor
private final class SaverMessageProxy: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?

    init(_ target: WKScriptMessageHandler) {
        self.target = target
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}
