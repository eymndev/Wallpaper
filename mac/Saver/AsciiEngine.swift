import Foundation
import JavaScriptCore

/// Temaları web görünümü olmadan, JavaScriptCore içinde çalıştırır (web/js/headless.js).
/// Ekran koruyucu süreci WKWebView'ın ayrı içerik sürecini çalıştıramadığından çizim yerelde yapılır.
final class AsciiEngine {
    struct Theme {
        let id: String
        let name: String
    }

    struct Info {
        let id: String
        let fontScale: Double
        let bg: (r: Double, g: Double, b: Double)
    }

    private let context: JSContext
    private let api: JSValue
    let themes: [Theme]

    init?(webDirectory: URL) {
        guard let context = JSContext(),
              let html = try? String(contentsOf: webDirectory.appendingPathComponent("index.html"), encoding: .utf8)
        else { return nil }
        self.context = context
        context.exceptionHandler = { _, error in
            NSLog("AsciiSaver JS hatası: %@", error?.toString() ?? "?")
        }

        // index.html'deki sırayla (main.js hariç) betikler, sonra tarayıcısız sürücü
        let pattern = try! NSRegularExpression(pattern: #"<script src="([^"]+)""#)
        var scripts = pattern.matches(in: html, range: NSRange(html.startIndex..., in: html)).compactMap { match in
            Range(match.range(at: 1), in: html).map { String(html[$0]) }
        }.filter { !$0.hasSuffix("main.js") }
        scripts.append("js/headless.js")
        for path in scripts {
            let url = webDirectory.appendingPathComponent(path)
            guard let source = try? String(contentsOf: url, encoding: .utf8) else { continue }
            context.evaluateScript(source, withSourceURL: url)
        }

        guard let api = context.objectForKeyedSubscript("AWH"), !api.isUndefined else { return nil }
        self.api = api
        let list = (try? JSONSerialization.jsonObject(with: Data((api.invokeMethod("themes", withArguments: []).toString() ?? "[]").utf8))) as? [[String: String]] ?? []
        themes = list.compactMap { item in
            guard let id = item["id"], let name = item["name"] else { return nil }
            return Theme(id: id, name: name)
        }
        if themes.isEmpty { return nil }
    }

    @discardableResult
    func setTheme(_ id: String) -> Info {
        let json = api.invokeMethod("setTheme", withArguments: [id]).toString() ?? "{}"
        let object = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any] ?? [:]
        let bg = object["bg"] as? [Double] ?? [0, 0, 0]
        return Info(
            id: object["id"] as? String ?? id,
            fontScale: object["fontScale"] as? Double ?? 1,
            bg: (bg.count > 0 ? bg[0] : 0, bg.count > 1 ? bg[1] : 0, bg.count > 2 ? bg[2] : 0)
        )
    }

    func resize(cols: Int, rows: Int, aspect: Double) {
        api.invokeMethod("resize", withArguments: [cols, rows, aspect])
    }

    func setOptions(panel: Bool, clock: Bool, themeName: Bool) {
        api.invokeMethod("setOptions", withArguments: [panel, clock, themeName])
    }

    func update(_ stats: [String: Any]) {
        api.invokeMethod("update", withArguments: [stats])
    }

    /// Bir kare çizer; hücre başına 5 birim (bkz. headless.js)
    func frame(dt: Double) -> [UInt16] {
        guard let s = api.invokeMethod("frame", withArguments: [dt])?.toString() else { return [] }
        return Array(s.utf16)
    }
}
