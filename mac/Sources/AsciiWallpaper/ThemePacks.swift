import Foundation

/// Ayrı indirilen tema paketleri (Hyprland, Anime ...). `scripts/pack.sh` her paketi
/// `~/Library/Application Support/ASCII Wallpaper/packs/<paket>/` içine kopyalar; `pack.json` paketin adını,
/// sırasını ve betiklerini (yüklenme sırasıyla) verir. Uygulama ve ekran koruyucu ortak kullanır (build-saver.sh bu
/// dosyayı da derler). Ekran koruyucu sürecinde `NSHomeDirectory()` kapsayıcıyı gösterdiği için ev dizini `getpwuid`
/// ile bulunur (bkz. ClaudeMonitor). AW_PACKS_DIR ortam değişkeni klasörü değiştirir (testler için).
enum ThemePacks {
    struct Pack {
        let id: String
        let name: String
        let order: Int
        let scripts: [URL]
    }

    static var directory: URL {
        if let custom = getenv("AW_PACKS_DIR") { return URL(fileURLWithPath: String(cString: custom)) }
        let home = getpwuid(getuid()).flatMap { String(validatingCString: $0.pointee.pw_dir) } ?? NSHomeDirectory()
        return URL(fileURLWithPath: home).appendingPathComponent("Library/Application Support/ASCII Wallpaper/packs")
    }

    /// Kurulu paketler, sıralarına göre. Okunamayan ya da bozuk paket atlanır.
    static func installed() -> [Pack] {
        let dir = directory
        let names = (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []
        return names.compactMap { name -> Pack? in
            guard !name.hasPrefix(".") else { return nil }
            let root = dir.appendingPathComponent(name)
            guard let data = try? Data(contentsOf: root.appendingPathComponent("pack.json")),
                  let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
                  let id = json["id"] as? String, let scripts = json["scripts"] as? [String]
            else { return nil }
            return Pack(
                id: id,
                name: json["name"] as? String ?? id,
                order: json["order"] as? Int ?? 99,
                scripts: scripts.map { root.appendingPathComponent($0) }
            )
        }.sorted { ($0.order, $0.id) < ($1.order, $1.id) }
    }

    /// Sayfa açılmadan çalışan betik: `globalThis.AW_PACKS = [{id, name, sources}]` (web/js/packs.js yükler)
    static func pageScript() -> String {
        let list: [[String: Any]] = installed().map { pack in
            [
                "id": pack.id,
                "name": pack.name,
                "sources": pack.scripts.compactMap { url in
                    (try? String(contentsOf: url, encoding: .utf8)).map { "\($0)\n//# sourceURL=packs/\(pack.id)/\(url.lastPathComponent)" }
                },
            ]
        }
        let data = (try? JSONSerialization.data(withJSONObject: list)) ?? Data("[]".utf8)
        return "globalThis.AW_PACKS = \(String(data: data, encoding: .utf8) ?? "[]");"
    }
}
