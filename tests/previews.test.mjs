// riceutil GUI'si tema kartlarında web/previews/<tema>.jpg dosyalarını gösterir: her temanın bir önizlemesi olmalı.
// Eksikse: node scripts/previews.cjs <tema-kimliği>
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "web");
const ids = readFileSync(path.join(root, "themes.tsv"), "utf8").trim().split("\n").map((l) => l.split("\t")[0]);

test("her temanın önizleme görseli var", () => {
  for (const id of ids) {
    const file = path.join(root, "previews", `${id}.jpg`);
    assert.ok(existsSync(file), `önizleme eksik: web/previews/${id}.jpg (node scripts/previews.cjs ${id})`);
    const head = readFileSync(file).subarray(0, 3);
    assert.deepEqual([...head], [0xff, 0xd8, 0xff], `${id}.jpg geçerli bir JPEG değil`);
    assert.ok(statSync(file).size < 200_000, `${id}.jpg çok büyük`);
  }
});
