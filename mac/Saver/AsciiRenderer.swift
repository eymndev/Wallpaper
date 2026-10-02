import CoreGraphics
import CoreText
import Foundation

/// AsciiEngine'in ürettiği hücreleri Core Text ile bir CGContext'e çizer.
final class AsciiRenderer {
    let fontSize: CGFloat
    let cellWidth: CGFloat
    let cellHeight: CGFloat
    private let font: CTFont
    private let ascent: CGFloat
    private var glyphs: [UInt16: (font: Int, glyph: CGGlyph)] = [:]
    private var fonts: [CTFont]
    private var colors: [UInt32: CGColor] = [:]

    /// Duvar kağıdı sayfasıyla aynı ölçü: genişliğe göre yazı boyu, satır yüksekliği 1.18 kat
    init(width: CGFloat, fontScale: Double) {
        let scale = CGFloat(fontScale)
        fontSize = min(16, max(max(8, 10 * scale), width / 110 * scale))
        font = CTFontCreateWithName("Menlo-Regular" as CFString, fontSize, nil)
        fonts = [font]
        var m: UniChar = 77 // "M"
        var glyph: CGGlyph = 0
        CTFontGetGlyphsForCharacters(font, &m, &glyph, 1)
        var advance = CGSize.zero
        CTFontGetAdvancesForGlyphs(font, .horizontal, &glyph, &advance, 1)
        cellWidth = advance.width
        cellHeight = (fontSize * 1.18).rounded()
        ascent = CTFontGetAscent(font)
    }

    func gridSize(for size: CGSize) -> (cols: Int, rows: Int, aspect: Double) {
        (max(1, Int((size.width / cellWidth).rounded(.up))), max(1, Int((size.height / cellHeight).rounded(.up))), Double(cellWidth / cellHeight))
    }

    private func color(_ hi: UInt16, _ lo: UInt16) -> CGColor? {
        guard hi > 0 else { return nil }
        let v = UInt32(hi - 1) << 12 | UInt32(lo)
        if let c = colors[v] { return c }
        if colors.count > 20000 { colors.removeAll() }
        let c = CGColor(srgbRed: CGFloat(v >> 16 & 255) / 255, green: CGFloat(v >> 8 & 255) / 255, blue: CGFloat(v & 255) / 255, alpha: 1)
        colors[v] = c
        return c
    }

    private func glyph(for unit: UInt16) -> (font: Int, glyph: CGGlyph)? {
        if let g = glyphs[unit] { return g }
        var ch = unit
        var g: CGGlyph = 0
        var result: (font: Int, glyph: CGGlyph)?
        if CTFontGetGlyphsForCharacters(font, &ch, &g, 1), g != 0 {
            result = (0, g)
        } else {
            // Menlo'da olmayan karakterler için sistemin yedek yazı tipi
            let s = String(utf16CodeUnits: [unit], count: 1) as CFString
            let fallback = CTFontCreateForString(font, s, CFRange(location: 0, length: 1))
            if CTFontGetGlyphsForCharacters(fallback, &ch, &g, 1), g != 0 {
                fonts.append(fallback)
                result = (fonts.count - 1, g)
            }
        }
        if let result { glyphs[unit] = result }
        return result
    }

    /// cells: hücre başına [karakter, yazı üst, yazı alt, zemin üst, zemin alt]
    func draw(cells: [UInt16], cols: Int, rows: Int, background: CGColor, in ctx: CGContext, height: CGFloat) {
        ctx.setFillColor(background)
        ctx.fill(CGRect(x: 0, y: 0, width: CGFloat(cols) * cellWidth + 1, height: height))
        guard cells.count >= cols * rows * 5 else { return }

        // Zeminler: aynı renkli yan yana hücreleri tek dikdörtgende birleştir
        for row in 0..<rows {
            let y = height - CGFloat(row + 1) * cellHeight
            var col = 0
            while col < cols {
                let k = (row * cols + col) * 5
                guard let c = color(cells[k + 3], cells[k + 4]) else { col += 1; continue }
                let start = col
                col += 1
                while col < cols, cells[(row * cols + col) * 5 + 3] == cells[k + 3], cells[(row * cols + col) * 5 + 4] == cells[k + 4] {
                    col += 1
                }
                ctx.setFillColor(c)
                ctx.fill(CGRect(x: CGFloat(start) * cellWidth, y: y - 0.3, width: CGFloat(col - start) * cellWidth + 0.3, height: cellHeight + 0.6))
            }
        }

        // Karakterler: renk ve yazı tipine göre gruplayıp toplu çiz
        struct Batch {
            var glyphs: [CGGlyph] = []
            var positions: [CGPoint] = []
        }
        var batches: [UInt64: Batch] = [:]
        for row in 0..<rows {
            let baseline = height - CGFloat(row) * cellHeight - 1 - ascent
            for col in 0..<cols {
                let k = (row * cols + col) * 5
                let unit = cells[k]
                guard unit != 32, cells[k + 1] > 0, let g = glyph(for: unit) else { continue }
                let key = UInt64(g.font) << 32 | UInt64(cells[k + 1]) << 16 | UInt64(cells[k + 2])
                batches[key, default: Batch()].glyphs.append(g.glyph)
                batches[key, default: Batch()].positions.append(CGPoint(x: CGFloat(col) * cellWidth, y: baseline))
            }
        }
        ctx.textMatrix = .identity
        for (key, batch) in batches {
            guard let c = color(UInt16(key >> 16 & 0xffff), UInt16(key & 0xffff)) else { continue }
            ctx.setFillColor(c)
            CTFontDrawGlyphs(fonts[Int(key >> 32)], batch.glyphs, batch.positions, batch.glyphs.count, ctx)
        }
    }
}
