// riceutil GUI'si tema kartlarında önizlemeleri gösterir: Klasik temalar için web/previews/<tema>.jpg, paketteki
// temalar için packs/<paket>/previews/<tema>.jpg. Her temanın bir önizlemesi olmalı.
// Eksikse: node scripts/previews.cjs <tema-kimliği>
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { web, packsDir, packs } from "../scripts/packs.mjs";

const ids = (dir) => readFileSync(path.join(dir, "themes.tsv"), "utf8").trim().split("\n").map((l) => l.split("\t")[0]);

test("her temanın önizleme görseli var", () => {
  for (const dir of [web, ...packs().map((p) => path.join(packsDir, p.id))]) {
    for (const id of ids(dir)) {
      const file = path.join(dir, "previews", `${id}.jpg`);
      const rel = path.relative(path.join(web, ".."), file);
      assert.ok(existsSync(file), `önizleme eksik: ${rel} (node scripts/previews.cjs ${id})`);
      const head = readFileSync(file).subarray(0, 3);
      assert.deepEqual([...head], [0xff, 0xd8, 0xff], `${rel} geçerli bir JPEG değil`);
      assert.ok(statSync(file).size < 200_000, `${rel} çok büyük`);
    }
  }
});
