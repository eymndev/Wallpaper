import Darwin
import Foundation
import SQLite3

/// Codex ve Antigravity'nin yerel kayıtlarını arka planda okur. Kimlik doğrulama dosyaları okunmaz.
/// Belgelenmemiş kayıt alanları değişebilir; eksik/erişilemeyen kaynak panel üretmez.
final class AgentMonitor: @unchecked Sendable {
    enum Provider { case codex, antigravity }
    private let provider: Provider
    private let home: URL
    private let codexRoot: URL
    private let queue = DispatchQueue(label: "dev.eymn.ascii-wallpaper.agents", qos: .utility)
    private let lock = NSLock()
    private var snapshot: [String: Any]?
    private var reading = false
    private var lastRead: TimeInterval = -1
    private var transcripts: [URL: AgentTranscript] = [:]
    static let idleLimit: TimeInterval = 15 * 60

    init(provider: Provider, home: URL? = nil) {
        self.provider = provider
        let path = getpwuid(getuid()).flatMap { String(validatingCString: $0.pointee.pw_dir) } ?? NSHomeDirectory()
        self.home = home ?? URL(fileURLWithPath: path)
        codexRoot = home == nil ? (ProcessInfo.processInfo.environment["CODEX_HOME"].map { URL(fileURLWithPath: $0) }
            ?? URL(fileURLWithPath: path).appendingPathComponent(".codex")) : home!.appendingPathComponent(".codex")
    }

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

    /// Arka plan okuyucusu; testler geçici ev diziniyle aynı yolu kullanır.
    func read(now: Date = Date()) -> [String: Any]? {
        switch provider {
        case .codex: return readCodex(now: now)
        case .antigravity: return readAntigravity(now: now)
        }
    }

    private func readCodex(now: Date) -> [String: Any]? {
        // CODEX_HOME özel kurulumlar için desteklenir; ekran koruyucuda gerçek ev dizinine dönülür.
        let root = codexRoot
        let fm = FileManager.default
        let keys: [URLResourceKey] = [.contentModificationDateKey, .isRegularFileKey]
        guard let files = fm.enumerator(at: root.appendingPathComponent("sessions"), includingPropertiesForKeys: keys,
                                        options: [.skipsHiddenFiles]) else { transcripts = [:]; return nil }
        var candidates: [(URL, Date)] = []
        for case let url as URL in files where url.pathExtension == "jsonl" {
            guard let values = try? url.resourceValues(forKeys: Set(keys)), values.isRegularFile == true,
                  let date = values.contentModificationDate, now.timeIntervalSince(date) < Self.idleLimit else { continue }
            candidates.append((url, date))
        }
        // Sadece yakın zamanda değişen kayıtlar okunur; kapalı/eski oturumlar gösterilmez.
        let urls = Set(candidates.map { $0.0 })
        transcripts = transcripts.filter { urls.contains($0.key) }
        var best: (data: [String: Any], busy: Bool, date: Date)?
        for (url, date) in candidates {
            let transcript = transcripts[url] ?? AgentTranscript(provider: .codex)
            transcripts[url] = transcript
            guard transcript.update(url: url), !transcript.isSubagent, transcript.start != nil else { continue }
            let busy = transcript.state != "waiting"
            if best == nil || (busy && !best!.busy) || (busy == best!.busy && date > best!.date) {
                best = (transcript.payload(now: now), busy, date)
            }
        }
        return best?.data
    }

    private func readAntigravity(now: Date) -> [String: Any]? {
        let roots = [".gemini/antigravity", ".gemini/antigravity-cli", ".gemini/antigravity-ide"]
        var best: (data: [String: Any], busy: Bool, date: Date)?
        var activeURLs = Set<URL>()
        for path in roots {
            let root = home.appendingPathComponent(path)
            // Salt okunur bağlantı: uygulamanın kendi DB'sine hiçbir değişiklik yapma.
            guard let db = AgentDatabase(root.appendingPathComponent("conversation_summaries.db")) else { continue }
            let rows = db.rows("""
                SELECT conversation_id, title, preview, workspace_uris, status, not_fully_idle,
                       last_modified_time, last_user_input_time
                FROM conversation_summaries WHERE killed = 0 AND nesting_depth = 0
                ORDER BY last_modified_time DESC
                """)
            for row in rows {
                guard let id = row["conversation_id"], !id.isEmpty, !id.contains("/"), id != "..",
                      let date = AgentTranscript.date(row["last_modified_time"] ?? ""),
                      now.timeIntervalSince(date) < Self.idleLimit else { continue }
                let url = root.appendingPathComponent("brain/\(id)/.system_generated/logs/transcript.jsonl")
                activeURLs.insert(url)
                let transcript = transcripts[url] ?? AgentTranscript(provider: .antigravity)
                transcripts[url] = transcript
                // Antigravity transcript'i aynı adım güncellenince yeniden yazabilir.
                _ = transcript.update(url: url, rewritten: true)
                let status = row["status"] ?? ""
                let busy = row["not_fully_idle"] == "1" || status == "CASCADE_RUN_STATUS_RUNNING"
                var payload = transcript.payload(now: now)
                payload["state"] = busy ? (transcript.state == "waiting" ? "thinking" : transcript.state) : "waiting"
                if transcript.thought.isEmpty { payload["thought"] = AgentTranscript.flatten(row["preview"] ?? row["title"] ?? "") }
                let workspaces = row["workspace_uris"] ?? ""
                let paths = (workspaces.data(using: .utf8).flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String]) ?? [workspaces]
                if let path = paths.first, !path.isEmpty {
                    payload["project"] = ((URL(string: path)?.path ?? path) as NSString).lastPathComponent
                }
                if let prompt = AgentTranscript.date(row["last_user_input_time"] ?? "") {
                    payload["turn"] = max(0, Int((busy ? now : date).timeIntervalSince(prompt)))
                }
                if transcript.start == nil { payload["session"] = NSNull() }
                if best == nil || (busy && !best!.busy) || (busy == best!.busy && date > best!.date) {
                    best = (payload, busy, date)
                }
            }
        }
        transcripts = transcripts.filter { activeURLs.contains($0.key) }
        return best?.data
    }
}

/// Swift'in sistem SQLite modülü; yalnız gerekli sütunlar, kısa bekleme süresi, salt okunur erişim.
private final class AgentDatabase {
    private var db: OpaquePointer?
    init?(_ url: URL) {
        guard sqlite3_open_v2(url.path, &db, SQLITE_OPEN_READONLY | SQLITE_OPEN_NOMUTEX, nil) == SQLITE_OK else {
            if db != nil { sqlite3_close(db) }
            return nil
        }
        sqlite3_busy_timeout(db, 100)
    }
    deinit { sqlite3_close(db) }
    func rows(_ sql: String) -> [[String: String]] {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { return [] }
        defer { sqlite3_finalize(statement) }
        var rows: [[String: String]] = []
        while sqlite3_step(statement) == SQLITE_ROW {
            var row: [String: String] = [:]
            for i in 0..<sqlite3_column_count(statement) {
                if let name = sqlite3_column_name(statement, i), let value = sqlite3_column_text(statement, i) {
                    row[String(cString: name)] = String(cString: value)
                }
            }
            rows.append(row)
        }
        return rows
    }
}

/// İki sağlayıcının kayıtlarını UI'nin ortak şemasına dönüştürür. Token yoksa nil; sıfır uydurulmaz.
final class AgentTranscript {
    private let provider: AgentMonitor.Provider
    private var offset: UInt64 = 0
    private var partial = Data()
    private var modified: Date?
    var state = "waiting"
    var project = ""
    var model = ""
    var thought = ""
    var thoughtKind = "text"
    var tool = ""
    var start: Date?
    var promptAt: Date?
    var endAt: Date?
    var lastAt: Date?
    var isSubagent = false
    private var tokens: Int?
    private var output: Int?
    private var context: Int?
    private var stepUsage: [Int: (Int, Int)] = [:]
    private var pendingTools = Set<String>()

    init(provider: AgentMonitor.Provider) { self.provider = provider }

    static func date(_ s: String) -> Date? {
        let normalized = s.replacingOccurrences(of: " ", with: "T")
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let result = formatter.date(from: normalized) { return result }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: normalized)
    }

    static func flatten(_ s: String) -> String {
        String(s.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ").suffix(400))
    }

    @discardableResult
    func update(url: URL, rewritten: Bool = false) -> Bool {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return false }
        defer { try? handle.close() }
        guard let size = try? handle.seekToEnd() else { return false }
        let stamp = try? url.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate
        if size < offset || (rewritten && stamp != modified) { reset() }
        modified = stamp
        guard size > offset else { return true }
        do {
            try handle.seek(toOffset: offset)
            // Kayıtlar büyük olabilir; tek seferde bütün dosyayı belleğe alma.
            while let data = try handle.read(upToCount: 64 * 1024), !data.isEmpty {
                offset += UInt64(data.count)
                partial.append(data)
                while let newline = partial.firstIndex(of: 0x0A) {
                    let line = partial.prefix(upTo: newline)
                    if let object = (try? JSONSerialization.jsonObject(with: line)) as? [String: Any] { consume(object) }
                    partial.removeSubrange(...newline)
                }
            }
            return true
        } catch { return false }
    }

    private func reset() {
        offset = 0; partial = Data(); state = "waiting"; project = ""; model = ""; thought = ""; tool = ""
        thoughtKind = "text"; start = nil; promptAt = nil; endAt = nil; lastAt = nil; isSubagent = false
        tokens = nil; output = nil; context = nil; stepUsage = [:]; pendingTools = []
    }

    func payload(now: Date) -> [String: Any] {
        let end = state == "waiting" ? (endAt ?? lastAt ?? now) : now
        return ["project": project, "model": model, "state": state, "thought": thought, "thoughtKind": thoughtKind,
                "tool": state == "tool" ? tool : "", "lastTool": tool,
                "tokens": tokens.map { $0 as Any } ?? NSNull(), "output": output.map { $0 as Any } ?? NSNull(),
                "context": context.map { $0 as Any } ?? NSNull(),
                "turn": promptAt.map { max(0, Int(end.timeIntervalSince($0))) as Any } ?? NSNull(),
                "session": start.map { max(0, Int(now.timeIntervalSince($0))) as Any } ?? NSNull()]
    }

    func consume(_ o: [String: Any]) {
        switch provider {
        case .codex: consumeCodex(o)
        case .antigravity: consumeAntigravity(o)
        }
    }

    private func setThought(_ text: String, kind: String = "text") {
        guard !text.isEmpty else { return }
        thought = Self.flatten(text); thoughtKind = kind
    }

    private func describe(_ name: String, _ args: Any?) -> String {
        var input = args as? [String: Any]
        if let text = args as? String { input = text.data(using: .utf8).flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any] }
        for key in ["cmd", "command", "file_path", "path", "query", "description"] {
            if let value = input?[key] as? String { return name + ": " + String(Self.flatten(value).prefix(120)) }
        }
        return name
    }

    private func consumeCodex(_ o: [String: Any]) {
        guard let p = o["payload"] as? [String: Any] else { return }
        let date = (o["timestamp"] as? String).flatMap(Self.date)
        let type = o["type"] as? String ?? ""
        switch type {
        case "session_meta":
            start = (p["timestamp"] as? String).flatMap(Self.date) ?? date
            project = ((p["cwd"] as? String ?? "") as NSString).lastPathComponent
            // Alt ajanların kendi penceresi yoktur; ana oturumu göster.
            isSubagent = (p["source"] as? [String: Any])?["subagent"] != nil
                || (p["thread_source"] as? [String: Any])?["subagent"] != nil
        case "turn_context":
            model = p["model"] as? String ?? model
            if let cwd = p["cwd"] as? String { project = (cwd as NSString).lastPathComponent }
        case "event_msg":
            let event = p["type"] as? String ?? ""
            switch event {
            case "task_started", "turn_started", "user_message":
                promptAt = (p["started_at"] as? String).flatMap(Self.date) ?? date
                endAt = nil; state = "thinking"; tool = ""; pendingTools = []
            case "task_complete", "turn_complete", "turn_aborted":
                state = "waiting"; endAt = date; pendingTools = []
                if let text = p["last_agent_message"] as? String { setThought(text) }
            case "agent_message":
                if let text = p["message"] as? String { setThought(text) }
            case "agent_reasoning", "agent_reasoning_raw_content":
                if let text = p["text"] as? String { setThought(text, kind: "thinking") }
                state = "thinking"
            case "token_count":
                if let info = p["info"] as? [String: Any], let total = info["total_token_usage"] as? [String: Any] {
                    setUsage(total)
                    if let last = info["last_token_usage"] as? [String: Any] { context = number(last, "total_tokens") }
                }
            default: break
            }
        case "token_usage_record":
            if let total = p["thread_token_usage"] as? [String: Any] { setUsage(total) }
            if let usage = p["usage"] as? [String: Any] { context = number(usage, "total_tokens") }
        case "response_item":
            switch p["type"] as? String {
            case "function_call", "custom_tool_call":
                pendingTools.insert(p["call_id"] as? String ?? "")
                state = "tool"; tool = describe(p["name"] as? String ?? "araç", p["arguments"] ?? p["input"])
            case "function_call_output", "custom_tool_call_output":
                pendingTools.remove(p["call_id"] as? String ?? "")
                if pendingTools.isEmpty { state = "thinking" }
            case "message":
                if p["role"] as? String == "assistant" {
                    let text = (p["content"] as? [[String: Any]] ?? []).compactMap { $0["text"] as? String }.joined(separator: " ")
                    setThought(text); state = "writing"
                }
            case "reasoning":
                let text = (p["summary"] as? [[String: Any]] ?? []).compactMap { $0["text"] as? String }.joined(separator: " ")
                setThought(text, kind: "thinking"); state = "thinking"
            default: break
            }
        default: return
        }
        if let date { lastAt = date }
    }

    private func number(_ o: [String: Any], _ key: String) -> Int { (o[key] as? NSNumber)?.intValue ?? 0 }
    private func setUsage(_ u: [String: Any]) {
        // Aynı toplam her güncellemede gelir; ekleme yapma. Önbellek okuması Claude ile aynı şekilde hariç.
        tokens = max(0, number(u, "input_tokens") - number(u, "cached_input_tokens")) + number(u, "output_tokens")
        output = number(u, "output_tokens")
    }

    private func consumeAntigravity(_ o: [String: Any]) {
        let date = (o["created_at"] as? String).flatMap(Self.date)
        if start == nil { start = date }
        if let date { lastAt = date }
        if let m = o["model_name"] as? String ?? o["model"] as? String { model = m }
        let type = o["type"] as? String ?? ""
        let done = o["status"] as? String == "DONE"
        switch type {
        case "USER_INPUT": promptAt = date; endAt = nil; state = "thinking"; tool = ""
        case "PLANNER_RESPONSE":
            if let content = o["content"] as? String { setThought(content) }
            state = done ? "waiting" : "writing"
            if done { endAt = date }
        default:
            // Araç ayrıntıları yalnız yapılandırılmış alanlar varsa gösterilir; düz metinden tahmin edilmez.
            if let call = o["tool_call"] as? [String: Any], let name = call["name"] as? String {
                tool = describe(name, call["args"]); state = done ? "thinking" : "tool"
            }
        }
        if let index = o["step_index"] as? Int, o["input_tokens"] is NSNumber || o["output_tokens"] is NSNumber {
            let input = number(o, "input_tokens"), out = number(o, "output_tokens")
            stepUsage[index] = (input, out)
            tokens = stepUsage.values.reduce(0) { $0 + $1.0 + $1.1 }
            output = stepUsage.values.reduce(0) { $0 + $1.1 }
            context = input + number(o, "cache_read_tokens") + out
        }
    }
}
