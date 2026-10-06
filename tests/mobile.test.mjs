// Telefon ve tabletler için her temanın tek bir kare PNG duvar kağıdı var: mobile/<tema>.png, 4096x4096.
// Eksikse: node scripts/mobile.cjs <tema-kimliği>
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { web, packsDir, packs } from "../scripts/packs.mjs";

const root = path.join(web, "..");
const ids = (dir) => readFileSync(path.join(dir, "themes.tsv"), "utf8").trim().split("\n").map((l) => l.split("\t")[0]);

test("her temanın mobil duvar kağıdı var ve kare", () => {
  for (const dir of [web, ...packs().map((p) => path.join(packsDir, p.id))]) {
    for (const id of ids(dir)) {
      const file = path.join(root, "mobile", `${id}.png`);
      const rel = path.relative(root, file);
      assert.ok(existsSync(file), `mobil duvar kağıdı eksik: ${rel} (node scripts/mobile.cjs ${id})`);
      // PNG başlığı: imza + IHDR'deki genişlik ve yükseklik
      const head = readFileSync(file, { length: 24 }).subarray(0, 24);
      assert.deepEqual([...head.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${rel} geçerli bir PNG değil`);
      assert.equal(head.readUInt32BE(16), 4096, `${rel} genişliği 4096 değil`);
      assert.equal(head.readUInt32BE(20), 4096, `${rel} yüksekliği 4096 değil`);
      assert.ok(statSync(file).size < 6_000_000, `${rel} çok büyük`);
    }
  }
});
