import Darwin
import Foundation

/// Çalışan Claude Code oturumunu `~/.claude` altındaki dosyalardan izler: ne yaptığı (düşünüyor, araç çalıştırıyor,
/// yazıyor, bekliyor), son düşüncesi ya da yazdığı, harcanan token ve geçen süre.
/// - `sessions/<pid>.json`: açık Claude Code süreçleri (pid, sessionId, cwd, status).
/// - `projects/<cwd>/<sessionId>.jsonl`: oturumun kaydı; dosyanın yalnızca yeni eklenen kısmı okunur.
/// Claude masaüstü uygulamasının Code sekmesindeki oturumlar da aynı dosyaları yazar (`entrypoint: claude-desktop`);
/// klasörsüz başlatılanlar `scratch-workspaces` altında çalışır, onlarda proje adı yerine uygulamanın sohbet başlığı
/// (`Library/Application Support/Claude/claude-code-sessions/*/*/<hostSessionId>.json` `title`) gösterilir.
/// Uygulama ve ekran koruyucu birlikte kullanır. Ekran koruyucu süreci korumalı alanda çalışır ama "/" altını salt
/// okunur okuyabilir; orada `NSHomeDirectory()` kapsayıcıyı gösterdiği için gerçek ev dizini `getpwuid` ile bulunur.
/// Dosya okuma arka planda yapılır; `current()` beklemeden son ölçümü döner.
final class ClaudeMonitor: @unchecked Sendable {
    private let root: URL
    private let desktopSessions: URL
    private let queue = DispatchQueue(label: "dev.eymn.ascii-wallpaper.claude", qos: .utility)
    private let lock = NSLock()
    private var snapshot: [String: Any]?
    private var reading = false
    private var lastRead: TimeInterval = 0
    private var transcript: Transcript? // yalnızca `queue` üzerinde kullanılır
    private var titleFiles: [String: URL] = [:] // hostSessionId -> uygulamanın oturum dosyası; yalnızca `queue` üzerinde

    /// Son etkinlikten bu kadar sonra (ve süreç meşgul değilse) panel gizlenir
    private static let idleLimit: TimeInterval = 15 * 60

    init() {
        let home = getpwuid(getuid()).flatMap { String(validatingCString: $0.pointee.pw_dir) } ?? NSHomeDirectory()
        root = URL(fileURLWithPath: home).appendingPathComponent(".claude")
        desktopSessions = URL(fileURLWithPath: home).appendingPathComponent("Library/Application Support/Claude/claude-code-sessions")
    }

    /// Etkin bir oturum varsa sayfaya gönderilecek veri, yoksa nil. Her çağrı (en çok saniyede bir) yenilemeyi tetikler.
    func current() -> [String: Any]? {
        lock.lock()
        defer { lock.unlock() }
        let now = ProcessInfo.processInfo.systemUptime
        if !reading, now - lastRead >= 1 {
            reading = true
            lastRead = now
            queue.async { [self] in
                let result = read()
                lock.lock()
                snapshot = result
                reading = false
                lock.unlock()
            }
        }
        return snapshot
    }

    // MARK: Oturum seçimi

    private struct Session {
        let id: String
        let cwd: String
        let host: String? // masaüstü uygulamasının oturum kimliği (local_...)
        let busy: Bool?
        let transcript: URL
        let modified: Date
    }

    private func read() -> [String: Any]? {
        guard let session = activeSession() else {
            transcript = nil
            return nil
        }
        if transcript?.url != session.transcript { transcript = Transcript(url: session.transcript) }
        guard let transcript else { return nil }
        transcript.update()

        let now = Date()
        let recent = now.timeIntervalSince(session.modified) < Self.idleLimit
        guard session.busy == true || recent else { return nil }

        var state = transcript.state
        // Sürecin kendi bildirdiği durum kayıttan daha günceldir (izin bekleme, yarıda kesme ...)
        if session.busy == false { state = "waiting" }
        if session.busy == true, state == "waiting" { state = "thinking" }

        var turn: TimeInterval = 0
        if let prompt = transcript.promptAt {
            turn = state == "waiting" ? (transcript.endAt ?? transcript.lastAt ?? prompt).timeIntervalSince(prompt) : now.timeIntervalSince(prompt)
        }
        let start = transcript.start ?? now
        return [
            "project": projectName(session),
            "model": transcript.model.hasPrefix("claude-") ? String(transcript.model.dropFirst(7)) : transcript.model,
            "state": state,
            "thought": transcript.thought,
            "thoughtKind": transcript.thoughtKind,
            "tool": state == "tool" ? transcript.tool : "",
            "lastTool": transcript.tool,
            "tokens": transcript.tokens,
            "output": transcript.output,
            "context": transcript.context,
            "turn": max(0, Int(turn)),
            "session": max(0, Int(now.timeIntervalSince(start))),
        ]
    }

    /// Açık süreçler arasından meşgul olanı, yoksa kaydı en son değişeni seçer.
    /// `sessions` klasörü yoksa (eski sürümler) son iki dakikada değişen kayıt kullanılır.
    private func activeSession() -> Session? {
        let fm = FileManager.default
        let files = (try? fm.contentsOfDirectory(at: root.appendingPathComponent("sessions"), includingPropertiesForKeys: nil)) ?? []
        var sessions: [Session] = []
        for url in files where url.pathExtension == "json" {
            guard let data = try? Data(contentsOf: url),
                  let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
                  let id = o["sessionId"] as? String,
                  let pid = (o["pid"] as? NSNumber)?.int32Value, pid > 0,
                  kill(pid, 0) == 0 || errno == EPERM, // korumalı alanda sinyal izni olmayabilir
                  let file = transcriptURL(id: id, cwd: o["cwd"] as? String ?? "")
            else { continue }
            let status = o["status"] as? String
            sessions.append(Session(id: id, cwd: o["cwd"] as? String ?? "", host: o["hostSessionId"] as? String,
                                    busy: status.map { $0 == "busy" },
                                    transcript: file, modified: modified(file)))
        }
        if let best = sessions.max(by: { ($0.busy == true ? 1 : 0, $0.modified) < ($1.busy == true ? 1 : 0, $1.modified) }) {
            return best
        }

        // Yedek yol: en son değişen kayıt
        let projects = root.appendingPathComponent("projects")
        var newest: (url: URL, date: Date)?
        for dir in (try? fm.contentsOfDirectory(at: projects, includingPropertiesForKeys: nil)) ?? [] {
            for file in (try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.contentModificationDateKey])) ?? []
            where file.pathExtension == "jsonl" {
                let date = modified(file)
                if date > newest?.date ?? .distantPast { newest = (file, date) }
            }
        }
        guard let newest, Date().timeIntervalSince(newest.date) < 120 else { return nil }
        let cwd = Transcript.cwd(of: newest.url) ?? newest.url.deletingLastPathComponent().lastPathComponent
        return Session(id: newest.url.deletingPathExtension().lastPathComponent, cwd: cwd, host: nil, busy: nil,
                       transcript: newest.url, modified: newest.date)
    }

    /// Klasör adı; masaüstü uygulamasında klasörsüz açılan oturumlarda (geçici `scratch-...` klasörü) sohbet başlığı.
    private func projectName(_ session: Session) -> String {
        let folder = (session.cwd as NSString).lastPathComponent
        guard session.cwd.contains("/Claude/scratch-workspaces/") else { return folder }
        return session.host.flatMap(desktopTitle) ?? "Claude"
    }

    /// Başlık uygulamada sonradan değişebildiği için dosya her okumada yeniden okunur; yalnızca yeri önbelleklenir.
    private func desktopTitle(_ host: String) -> String? {
        let fm = FileManager.default
        if titleFiles[host] == nil {
            search: for account in (try? fm.contentsOfDirectory(at: desktopSessions, includingPropertiesForKeys: nil)) ?? [] {
                for org in (try? fm.contentsOfDirectory(at: account, includingPropertiesForKeys: nil)) ?? [] {
                    let file = org.appendingPathComponent(host + ".json")
                    if fm.fileExists(atPath: file.path) {
                        titleFiles[host] = file
                        break search
                    }
                }
            }
        }
        guard let file = titleFiles[host], let data = try? Data(contentsOf: file),
              let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let title = o["title"] as? String
        else { return nil }
        let line = Transcript.oneLine(title)
        return line.isEmpty ? nil : line
    }

    /// Kayıt yolu: proje klasörü adı cwd'deki harf/rakam dışı karakterlerin "-" yapılmış hali.
    /// Bulunamazsa (uzun yollar kısaltılabiliyor) bütün proje klasörlerinde aranır.
    private func transcriptURL(id: String, cwd: String) -> URL? {
        let projects = root.appendingPathComponent("projects")
        let name = String(cwd.map { $0.isASCII && ($0.isLetter || $0.isNumber) ? $0 : "-" })
        let direct = projects.appendingPathComponent(name).appendingPathComponent(id + ".jsonl")
        if FileManager.default.fileExists(atPath: direct.path) { return direct }
        for dir in (try? FileManager.default.contentsOfDirectory(at: projects, includingPropertiesForKeys: nil)) ?? [] {
            let file = dir.appendingPathComponent(id + ".jsonl")
            if FileManager.default.fileExists(atPath: file.path) { return file }
        }
        return nil
    }

    private func modified(_ url: URL) -> Date {
        (try? url.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
    }
}

/// Bir oturum kaydının (JSONL) artımlı okuyucusu.
private final class Transcript {
    let url: URL
    private var offset: UInt64 = 0
    private var partial = Data()
    private var usage: [String: (total: Int, output: Int)] = [:] // aynı mesaj her blokta tekrar yazılır

    private(set) var tokens = 0
    private(set) var output = 0
    private(set) var context = 0
    private(set) var model = ""
    private(set) var state = "waiting"
    private(set) var thought = ""
    private(set) var thoughtKind = ""
    private(set) var tool = ""
    private(set) var start: Date?
    private(set) var promptAt: Date?
    private(set) var endAt: Date?
    private(set) var lastAt: Date?

    private static let iso: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    init(url: URL) {
        self.url = url
    }

    /// Kaydın ilk satırlarından cwd'yi bulur (yedek yol için)
    static func cwd(of url: URL) -> String? {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return nil }
        defer { try? handle.close() }
        let head = (try? handle.read(upToCount: 64 * 1024)) ?? Data()
        for line in head.split(separator: 0x0A) {
            if let o = (try? JSONSerialization.jsonObject(with: line)) as? [String: Any], let cwd = o["cwd"] as? String { return cwd }
        }
        return nil
    }

    func update() {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return }
        defer { try? handle.close() }
        let size = (try? handle.seekToEnd()) ?? 0
        if size < offset { reset() } // dosya baştan yazılmış
        guard size > offset else { return }
        try? handle.seek(toOffset: offset)
        guard let data = try? handle.readToEnd() else { return }
        offset += UInt64(data.count)

        var buffer = partial
        buffer.append(data)
        var lines = buffer.split(separator: 0x0A, omittingEmptySubsequences: false)
        partial = buffer.last == 0x0A ? Data() : Data(lines.removeLast())
        for line in lines where !line.isEmpty {
            if let o = (try? JSONSerialization.jsonObject(with: line)) as? [String: Any] { consume(o) }
        }
    }

    private func reset() {
        offset = 0
        partial = Data()
        usage = [:]
        (tokens, output, context, model, state, thought, thoughtKind, tool) = (0, 0, 0, "", "waiting", "", "", "")
        (start, promptAt, endAt, lastAt) = (nil, nil, nil, nil)
    }

    private func consume(_ o: [String: Any]) {
        let type = o["type"] as? String
        guard type == "user" || type == "assistant", let message = o["message"] as? [String: Any] else { return }
        let date = (o["timestamp"] as? String).flatMap { Self.iso.date(from: $0) }
        if let date {
            if start == nil { start = date }
            lastAt = date
        }
        if type == "assistant" { count(message) }
        // Alt ajanların ve sistemin eklediği mesajlar durumu değiştirmez
        if o["isSidechain"] as? Bool == true || o["isMeta"] as? Bool == true { return }

        if type == "user" {
            let content = message["content"]
            let blocks = content as? [[String: Any]] ?? []
            if blocks.contains(where: { $0["type"] as? String == "tool_result" }) {
                state = "thinking" // araç bitti, model sonucu işliyor
                return
            }
            let text = (content as? String) ?? blocks.compactMap { $0["text"] as? String }.joined(separator: " ")
            if text.contains("[Request interrupted") {
                state = "waiting"
                endAt = date
                return
            }
            // Yeni istek: tur başlar
            promptAt = date
            endAt = nil
            state = "thinking"
            tool = ""
            return
        }

        for block in message["content"] as? [[String: Any]] ?? [] {
            switch block["type"] as? String {
            case "thinking":
                state = "thinking"
                if let s = block["thinking"] as? String, !s.isEmpty { setThought(s, kind: "thinking") }
            case "text":
                state = "writing"
                if let s = block["text"] as? String, !s.isEmpty { setThought(s, kind: "text") }
            case "tool_use":
                state = "tool"
                tool = Self.describe(block["name"] as? String ?? "araç", block["input"] as? [String: Any] ?? [:])
            default:
                break
            }
        }
        if message["stop_reason"] as? String == "end_turn" {
            state = "waiting"
            endAt = date
        }
    }

    private func count(_ message: [String: Any]) {
        if let m = message["model"] as? String, !m.isEmpty, !m.hasPrefix("<") { model = m }
        guard let u = message["usage"] as? [String: Any] else { return }
        func n(_ key: String) -> Int { (u[key] as? NSNumber)?.intValue ?? 0 }
        let input = n("input_tokens") + n("cache_creation_input_tokens")
        let out = n("output_tokens")
        context = input + n("cache_read_input_tokens") + out
        let id = message["id"] as? String ?? UUID().uuidString
        let old = usage[id] ?? (0, 0)
        // Önbellekten okunan token her çağrıda tekrar sayılmasın diye toplama girmez
        usage[id] = (input + out, out)
        tokens += input + out - old.total
        output += out - old.output
    }

    private func setThought(_ s: String, kind: String) {
        let flat = Self.oneLine(s)
        thought = flat.count > 400 ? "…" + flat.suffix(400) : flat
        thoughtKind = kind
    }

    static func describe(_ name: String, _ input: [String: Any]) -> String {
        for key in ["description", "command", "file_path", "path", "pattern", "url", "query", "prompt", "skill"] {
            guard let s = input[key] as? String, !s.isEmpty else { continue }
            let value = key == "file_path" || key == "path" ? (s as NSString).lastPathComponent : oneLine(s)
            return "\(name): \(value.prefix(120))"
        }
        return name
    }

    static func oneLine(_ s: String) -> String {
        s.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }
}
