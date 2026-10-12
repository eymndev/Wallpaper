import Foundation
import SQLite3

@main
struct AgentTests {
    static func main() throws {
        let home = FileManager.default.temporaryDirectory.appendingPathComponent("wallpaper-agent-tests-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: home, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: home) }
        let now = Date()
        let stamp = ISO8601DateFormatter().string(from: now)
        func write(_ url: URL, _ events: [[String: Any]], ending: String = "\n") throws {
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            let text = try events.map { String(data: try JSONSerialization.data(withJSONObject: $0), encoding: .utf8)! }.joined(separator: "\n") + ending
            try text.write(to: url, atomically: false, encoding: .utf8)
        }
        func event(_ type: String, _ payload: [String: Any]) -> [String: Any] {
            ["type": type, "timestamp": stamp, "payload": payload]
        }
        let url = home.appendingPathComponent(".codex/sessions/2026/10/11/rollout-test.jsonl")
        let base = [
            event("session_meta", ["timestamp": stamp, "cwd": "/projects/Wallpaper", "source": "cli"]),
            event("turn_context", ["model": "test-model"]),
            event("event_msg", ["type": "task_started"]),
            event("response_item", ["type": "function_call", "name": "exec_command", "call_id": "a", "arguments": "{\"cmd\":\"npm test\"}"]),
            event("response_item", ["type": "function_call", "name": "read_file", "call_id": "b"]),
            event("response_item", ["type": "function_call_output", "call_id": "a"]),
            event("event_msg", ["type": "token_count", "info": ["total_token_usage": ["input_tokens": 1000, "cached_input_tokens": 400, "output_tokens": 200], "last_token_usage": ["total_tokens": 1200]]]),
            event("token_usage_record", ["thread_token_usage": ["input_tokens": 1000, "cached_input_tokens": 400, "output_tokens": 200], "usage": ["total_tokens": 1200]]),
        ]
        try write(url, base)
        let reader = AgentTranscript(provider: .codex)
        assert(reader.update(url: url))
        var p = reader.payload(now: now)
        assert(p["state"] as? String == "tool", "ikinci araç çalışırken birincinin sonucu durumu kapatmamalı")
        assert(p["tokens"] as? Int == 800 && p["output"] as? Int == 200 && p["context"] as? Int == 1200)
        assert(p["project"] as? String == "Wallpaper" && p["model"] as? String == "test-model")
        // Yarım JSONL satırı tamamlanmadan tüketilmez.
        let completed = event("event_msg", ["type": "task_complete", "last_agent_message": "Tamamlandı"])
        let data = try JSONSerialization.data(withJSONObject: completed)
        let handle = try FileHandle(forWritingTo: url)
        try handle.seekToEnd(); try handle.write(contentsOf: data.prefix(data.count / 2))
        assert(reader.update(url: url)); assert(reader.state == "tool")
        try handle.write(contentsOf: data.suffix(data.count - data.count / 2)); try handle.write(contentsOf: Data([10])); try handle.close()
        assert(reader.update(url: url)); assert(reader.state == "waiting" && reader.thought == "Tamamlandı")
        // Aynı kayıt yeniden okununca token çoğalmaz.
        assert(reader.update(url: url)); assert(reader.payload(now: now)["tokens"] as? Int == 800)
        let monitor = AgentMonitor(provider: .codex, home: home)
        assert(monitor.read(now: now)?["state"] as? String == "waiting")
        assert(monitor.read(now: now.addingTimeInterval(901)) == nil, "eski oturum gizlenmeli")
        // Truncation eski token/model/durum bilgisini temizler; bilinmeyen event ve bozuk satır atlanır.
        try write(url, [event("session_meta", ["timestamp": stamp, "cwd": "/new"]), event("unknown", [:])])
        assert(reader.update(url: url)); p = reader.payload(now: now)
        assert(p["tokens"] is NSNull && p["project"] as? String == "new")
        let subagent = home.appendingPathComponent(".codex/sessions/2026/10/11/subagent.jsonl")
        try write(subagent, [event("session_meta", ["timestamp": stamp, "cwd": "/sub", "source": ["subagent": ["spawn": [:]]]]), event("event_msg", ["type": "task_started"])])
        assert(monitor.read(now: now)?["project"] as? String == "new", "alt ajan ana oturumu örtmemeli")

        // Antigravity: aynı adımın güncellenmiş kaydı iki kez sayılmaz.
        let ag = AgentTranscript(provider: .antigravity)
        ag.consume(["type": "USER_INPUT", "step_index": 0, "created_at": stamp])
        ag.consume(["type": "PLANNER_RESPONSE", "status": "DONE", "step_index": 1, "created_at": stamp, "input_tokens": 100, "cache_read_tokens": 50, "output_tokens": 20, "content": "İlk mesaj"])
        ag.consume(["type": "PLANNER_RESPONSE", "status": "DONE", "step_index": 1, "created_at": stamp, "input_tokens": 100, "cache_read_tokens": 50, "output_tokens": 30, "content": "Son mesaj"])
        p = ag.payload(now: now)
        assert(p["tokens"] as? Int == 130 && p["output"] as? Int == 30 && p["context"] as? Int == 180)
        assert(p["state"] as? String == "waiting" && p["thought"] as? String == "Son mesaj")
        assert(AgentTranscript.date("2026-10-08 07:16:52.249309+00:00") != nil)
        let root = home.appendingPathComponent(".gemini/antigravity")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        var db: OpaquePointer?
        assert(sqlite3_open(root.appendingPathComponent("conversation_summaries.db").path, &db) == SQLITE_OK)
        defer { sqlite3_close(db) }
        func sql(_ statement: String) { assert(sqlite3_exec(db, statement, nil, nil, nil) == SQLITE_OK) }
        sql("CREATE TABLE conversation_summaries(conversation_id TEXT, title TEXT, preview TEXT, workspace_uris TEXT, status TEXT, not_fully_idle INTEGER, killed INTEGER, nesting_depth INTEGER, last_modified_time TEXT, last_user_input_time TEXT)")
        sql("INSERT INTO conversation_summaries VALUES('fixture', 'Test', 'Hazır', '[\"file:///projects/Wallpaper\"]', 'CASCADE_RUN_STATUS_RUNNING', 1, 0, 0, '\(stamp)', '\(stamp)')")
        let log = root.appendingPathComponent("brain/fixture/.system_generated/logs/transcript.jsonl")
        let record: [String: Any] = ["type": "PLANNER_RESPONSE", "status": "DONE", "step_index": 1, "created_at": stamp, "input_tokens": 10, "output_tokens": 2, "content": "fixture text"]
        try write(log, [record])
        let antigravity = AgentMonitor(provider: .antigravity, home: home)
        p = antigravity.read(now: now)!
        assert(p["state"] as? String == "thinking", "DB hâlâ meşgul diyorsa son tamamlanmış mesaj turu kapatmamalı")
        assert(p["project"] as? String == "Wallpaper" && p["tokens"] as? Int == 12)
        sql("UPDATE conversation_summaries SET status='CASCADE_RUN_STATUS_IDLE', not_fully_idle=0")
        assert(antigravity.read(now: now)?["state"] as? String == "waiting")
        assert(antigravity.read(now: now.addingTimeInterval(901)) == nil)
        // Antigravity transcript yeniden yazınca yeni içerik kullanılır, eski token eklenmez.
        var changed = record; changed["content"] = "changed text"; changed["output_tokens"] = 5
        try write(log, [changed]); try FileManager.default.setAttributes([.modificationDate: now.addingTimeInterval(1)], ofItemAtPath: log.path)
        p = antigravity.read(now: now)!
        assert(p["tokens"] as? Int == 15 && p["thought"] as? String == "changed text")
        sql("UPDATE conversation_summaries SET killed=1")
        assert(antigravity.read(now: now) == nil)
        assert(AgentMonitor(provider: .antigravity, home: home.appendingPathComponent("missing")).read(now: now) == nil)
        if CommandLine.arguments.contains("--live") {
            let live = AgentMonitor(provider: .codex).read()
            assert(live != nil && live?["model"] as? String != "")
            print("Canlı Codex: durum=\(live?["state"] ?? ""), token=\(live?["tokens"] ?? ""); içerik yazdırılmadı")
        }
        print("Agent okuyucu testleri geçti (Codex + Antigravity).")
    }
}
