// Derlenmiş ekran koruyucuyu macOS'un yaptığı gibi yükler, birkaç temayla ekran dışı çizdirir
// ve görüntünün boş (tek renk) olmadığını kontrol eder. Görüntüleri build/saver-<tema>.png olarak kaydeder.
// Kullanım: swiftc -o build/check-saver scripts/check-saver.swift && build/check-saver "build/ASCII Wallpaper.saver" lake hypr-kath
import AppKit
import ScreenSaver

let args = CommandLine.arguments
guard args.count >= 3 else {
    print("kullanım: check-saver <.saver yolu> <tema>...")
    exit(2)
}
guard let bundle = Bundle(path: args[1]), bundle.load(), let viewType = bundle.principalClass as? ScreenSaverView.Type else {
    print("HATA: ekran koruyucu paketi yüklenemedi ya da ana sınıf ScreenSaverView değil")
    exit(1)
}
let outDir = URL(fileURLWithPath: args[1]).deletingLastPathComponent()
var failed = false

for id in args.dropFirst(2) {
    setenv("AW_SAVER_THEME", id, 1)
    guard let view = viewType.init(frame: NSRect(x: 0, y: 0, width: 1280, height: 800), isPreview: false) else {
        print("HATA \(id): görünüm oluşturulamadı")
        failed = true
        continue
    }
    view.startAnimation()
    for _ in 0..<15 { view.animateOneFrame() }
    guard let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds) else {
        print("HATA \(id): görüntü alınamadı")
        failed = true
        continue
    }
    view.cacheDisplay(in: view.bounds, to: rep)
    view.stopAnimation()

    // En sık renk zemindir; ondan belirgin farklı piksellerin oranı çizilen içeriği gösterir
    var counts: [UInt32: Int] = [:]
    var pixels: [(Int, Int, Int)] = []
    for y in stride(from: 0, to: rep.pixelsHigh, by: 2) {
        for x in stride(from: 0, to: rep.pixelsWide, by: 2) {
            guard let c = rep.colorAt(x: x, y: y)?.usingColorSpace(.sRGB) else { continue }
            let p = (Int(c.redComponent * 255), Int(c.greenComponent * 255), Int(c.blueComponent * 255))
            pixels.append(p)
            counts[UInt32(p.0 >> 3) << 10 | UInt32(p.1 >> 3) << 5 | UInt32(p.2 >> 3), default: 0] += 1
        }
    }
    let bgKey = counts.max { $0.value < $1.value }?.key ?? 0
    let bg = (Int(bgKey >> 10 & 31) << 3, Int(bgKey >> 5 & 31) << 3, Int(bgKey & 31) << 3)
    let drawn = pixels.filter { abs($0.0 - bg.0) + abs($0.1 - bg.1) + abs($0.2 - bg.2) > 40 }.count
    let ratio = Double(drawn) / Double(max(1, pixels.count))
    let ok = ratio > 0.01
    if !ok { failed = true }
    print(String(format: "%@ %@: çizilen piksel oranı %.1f%%", ok ? "TAMAM" : "HATA", id, ratio * 100))

    if let png = rep.representation(using: .png, properties: [:]) {
        try? png.write(to: outDir.appendingPathComponent("saver-\(id).png"))
    }
}
exit(failed ? 1 : 0)
