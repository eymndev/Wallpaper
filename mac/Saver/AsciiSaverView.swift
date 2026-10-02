import AppKit
import ScreenSaver

/// Ekran koruyucu: duvar kağıdıyla aynı temaları çizer ve CPU, RAM, pil ve ağ verisini gösterir.
/// Temalar JavaScriptCore'da çalışır (AsciiEngine), karakterler Core Text ile çizilir (AsciiRenderer).
/// Ekran koruyucu süreci WKWebView'ın içerik sürecini başlatamadığı için web görünümü kullanılmaz.
@objc(AsciiSaverView)
final class AsciiSaverView: ScreenSaverView {
    private let engine: AsciiEngine?
    private let stats = StatsMonitor()
    private var renderer: AsciiRenderer?
    private var info: AsciiEngine.Info?
    private var background = CGColor(gray: 0, alpha: 1)
    private var grid = (cols: 0, rows: 0)
    private var cells: [UInt16] = []
    private var themeID = ""
    private var lastFrame: TimeInterval = 0
    private var lastStats: TimeInterval = 0
    private var options: SaverOptions?

    private static var webDirectory: URL? {
        Bundle(for: AsciiSaverView.self).resourceURL?.appendingPathComponent("web")
    }

    override init?(frame: NSRect, isPreview: Bool) {
        engine = Self.webDirectory.flatMap(AsciiEngine.init(webDirectory:))
        super.init(frame: frame, isPreview: isPreview)
        setUp()
    }

    required init?(coder: NSCoder) {
        engine = Self.webDirectory.flatMap(AsciiEngine.init(webDirectory:))
        super.init(coder: coder)
        setUp()
    }

    private func setUp() {
        animationTimeInterval = 1.0 / 20
        if engine == nil { NSLog("AsciiSaver: temalar yüklenemedi") }
        chooseTheme()

        // macOS 14+ ekran koruyucuyu kapatırken stopAnimation çağırmayabiliyor
        DistributedNotificationCenter.default().addObserver(
            self, selector: #selector(willStop), name: Notification.Name("com.apple.screensaver.willstop"), object: nil)
    }

    deinit {
        DistributedNotificationCenter.default().removeObserver(self)
    }

    /// Ayarlardaki tema ya da rastgele bir tema; AW_SAVER_THEME ortam değişkeni (test için) önceliklidir.
    private func chooseTheme() {
        guard let engine else { return }
        let settings = SaverSettings()
        var id = getenv("AW_SAVER_THEME").map { String(cString: $0) } ?? settings.theme
        if id == SaverSettings.random || !engine.themes.contains(where: { $0.id == id }) {
            id = engine.themes.randomElement()?.id ?? ""
        }
        themeID = id
        engine.setOptions(panel: settings.showPanel, clock: settings.showClock)
        renderer = nil // yazı ölçeği temaya göre değişebilir, ızgara yeniden kurulacak
    }

    private func layoutGrid() {
        guard let engine, bounds.width > 0, bounds.height > 0 else { return }
        let info = engine.setTheme(themeID)
        let renderer = AsciiRenderer(width: bounds.width, fontScale: info.fontScale)
        let size = renderer.gridSize(for: bounds.size)
        engine.resize(cols: size.cols, rows: size.rows, aspect: size.aspect)
        grid = (size.cols, size.rows)
        background = CGColor(srgbRed: info.bg.r / 255, green: info.bg.g / 255, blue: info.bg.b / 255, alpha: 1)
        self.info = info
        self.renderer = renderer
        sendStats()
        cells = engine.frame(dt: 0.05)
    }

    override func setFrameSize(_ newSize: NSSize) {
        super.setFrameSize(newSize)
        renderer = nil
    }

    // MARK: Yaşam döngüsü

    override func startAnimation() {
        super.startAnimation()
        if SaverSettings().theme == SaverSettings.random { chooseTheme() }
        lastFrame = 0
    }

    override func stopAnimation() {
        super.stopAnimation()
    }

    @objc private func willStop() {
        if isAnimating { stopAnimation() }
    }

    override func animateOneFrame() {
        guard let engine else { return }
        if renderer == nil { layoutGrid() }
        let now = ProcessInfo.processInfo.systemUptime
        let dt = lastFrame > 0 ? min(0.25, now - lastFrame) : 0.05
        lastFrame = now
        if now - lastStats >= 1 { sendStats() }
        cells = engine.frame(dt: dt)
        needsDisplay = true
    }

    private func sendStats() {
        lastStats = ProcessInfo.processInfo.systemUptime
        let s = stats.sample()
        var payload: [String: Any] = [
            "cpu": s.cpu, "ram": s.ramUsedGB, "ramTotal": s.ramTotalGB,
            "charging": s.charging, "onBattery": s.onBattery,
            "down": s.downMBps, "up": s.upMBps,
        ]
        payload["battery"] = s.battery ?? NSNull()
        engine?.update(payload)
    }

    override func draw(_ rect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        if renderer == nil { layoutGrid() }
        guard let renderer else {
            ctx.setFillColor(CGColor(gray: 0, alpha: 1))
            ctx.fill(bounds)
            return
        }
        renderer.draw(cells: cells, cols: grid.cols, rows: grid.rows, background: background, in: ctx, height: bounds.height)
    }

    // MARK: Ayarlar penceresi

    override var hasConfigureSheet: Bool { true }

    override var configureSheet: NSWindow? {
        let sheet = SaverOptions(themes: engine?.themes.map { (id: $0.id, name: $0.name) } ?? []) { [weak self] in
            self?.chooseTheme()
        }
        options = sheet
        return sheet.window
    }
}
