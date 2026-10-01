import AppKit

/// Spotify veya Müzik uygulamasında çalan şarkıyı AppleScript ile sorar.
/// Uygulama açık değilse hiç sormaz (yoksa AppleScript onu başlatırdı).
/// İlk sorguda macOS "otomasyon" izni ister.
final class NowPlaying {
    private let players: [(bundleID: String, appName: String)] = [
        ("com.spotify.client", "Spotify"),
        ("com.apple.Music", "Music"),
    ]

    func current() -> String? {
        let running = Set(NSWorkspace.shared.runningApplications.compactMap(\.bundleIdentifier))
        for player in players where running.contains(player.bundleID) {
            let source = """
            tell application "\(player.appName)"
                if player state is playing then
                    return (artist of current track) & " — " & (name of current track)
                end if
            end tell
            return ""
            """
            var error: NSDictionary?
            guard let script = NSAppleScript(source: source) else { continue }
            let result = script.executeAndReturnError(&error).stringValue ?? ""
            if error == nil, !result.isEmpty { return result }
        }
        return nil
    }
}
