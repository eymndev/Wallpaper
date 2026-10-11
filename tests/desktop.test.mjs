// Masaüstü için her temanın sabit PNG'si var (uygulama bunu macOS'un masaüstü resmi yapar, kilit ekranında görünür):
// Klasik web/desktop/<tema>.png, paket temaları packs/<paket>/desktop/<tema>.png, 5760x3600.
// Eksikse: node scripts/desktop.cjs <tema-kimliği>
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { web, packsDir, packs } from "../scripts/packs.mjs";

const root = path.join(web, "..");
const ids = (dir) => readFileSync(path.join(dir, "themes.tsv"), "utf8").trim().split("\n").map((l) => l.split("\t")[0]);
const dirs = () => [web, ...packs().map((p) => path.join(packsDir, p.id))];

test("her temanın masaüstü PNG'si var ve 5760x3600", () => {
  for (const dir of dirs()) {
    for (const id of ids(dir)) {
      const file = path.join(dir, "desktop", `${id}.png`);
      const rel = path.relative(root, file);
      assert.ok(existsSync(file), `masaüstü PNG'si eksik: ${rel} (node scripts/desktop.cjs ${id})`);
      // PNG başlığı: imza + IHDR'deki genişlik ve yükseklik
      const head = readFileSync(file).subarray(0, 24);
      assert.deepEqual([...head.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${rel} geçerli bir PNG değil`);
      assert.equal(head.readUInt32BE(16), 5760, `${rel} genişliği 5760 değil`);
      assert.equal(head.readUInt32BE(20), 3600, `${rel} yüksekliği 3600 değil`);
      assert.ok(statSync(file).size < 8_000_000, `${rel} çok büyük`);
    }
  }
});

test("masaüstü klasörlerinde silinmiş temaların PNG'si kalmamış", () => {
  for (const dir of dirs()) {
    const known = new Set(ids(dir));
    for (const name of readdirSync(path.join(dir, "desktop"))) {
      assert.ok(known.has(name.replace(/\.png$/, "")), `${path.relative(root, path.join(dir, "desktop", name))} bir temaya ait değil`);
    }
  }
});
