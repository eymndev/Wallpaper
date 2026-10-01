import AppKit
import WebKit

/// Bir ekranı kaplayan, masaüstü ikonlarının arkasında duran ve tıklamaları geçiren pencere.
final class WallpaperWindow: NSWindow {
    let webView: WKWebView

    init(screen: NSScreen, webDirectory: URL, messageHandler: WKScriptMessageHandler) {
        let config = WKWebViewConfiguration()
        config.userContentController.add(messageHandler, name: "aw")
        config.suppressesIncrementalRendering = true
        webView = WKWebView(frame: CGRect(origin: .zero, size: screen.frame.size), configuration: config)
        webView.setValue(false, forKey: "drawsBackground") // açılışta beyaz parlamayı önler
        webView.autoresizingMask = [.width, .height]

        super.init(contentRect: screen.frame, styleMask: .borderless, backing: .buffered, defer: false)

        level = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.desktopWindow)))
        collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle, .fullScreenAuxiliary]
        ignoresMouseEvents = true
        isOpaque = true
        hasShadow = false
        backgroundColor = .black
        isReleasedWhenClosed = false
        setFrame(screen.frame, display: false)

        contentView = webView
        let index = webDirectory.appendingPathComponent("index.html")
        webView.loadFileURL(index, allowingReadAccessTo: webDirectory)
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }

    func run(_ script: String) {
        webView.evaluateJavaScript(script, completionHandler: nil)
    }
}
