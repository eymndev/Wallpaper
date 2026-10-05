// scripts/pack.sh: paketleri kurar, kaldırır, günceller; seyrek klonda paketin dosyalarını ancak eklenince indirir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, existsSync, readFileSync, writeFileSync, cpSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { repo } from "../scripts/packs.mjs";

const tmp = () => mkdtempSync(path.join(os.tmpdir(), "aw-packs-"));
const pack = (root, dir, ...args) =>
  execFileSync(path.join(root, "scripts", "pack.sh"), args, { encoding: "utf8", env: { ...process.env, AW_PACKS_DIR: dir } });
const states = (root, dir) => Object.fromEntries(pack(root, dir, "list", "--tsv").trim().split("\n").map((l) => l.split("\t")).map((c) => [c[0], c[2]]));

test("list, add, remove, sync", () => {
  const dir = path.join(tmp(), "packs");
  assert.deepEqual(states(repo, dir), { klasik: "builtin", hyprland: "available", anime: "available" });

  pack(repo, dir, "add", "anime");
  assert.ok(existsSync(path.join(dir, "anime", "pack.json")));
  assert.ok(existsSync(path.join(dir, "anime", "js", "light.js")));
  assert.ok(existsSync(path.join(dir, "anime", "previews", "light-yagami.jpg")));
  assert.equal(states(repo, dir).anime, "installed");
  assert.equal(states(repo, dir).hyprland, "available");

  // sync yalnız kurulu paketleri günceller
  writeFileSync(path.join(dir, "anime", "js", "light.js"), "eski");
  pack(repo, dir, "sync");
  assert.equal(readFileSync(path.join(dir, "anime", "js", "light.js"), "utf8"), readFileSync(path.join(repo, "packs", "anime", "js", "light.js"), "utf8"));
  assert.ok(!existsSync(path.join(dir, "hyprland")));

  pack(repo, dir, "remove", "anime");
  assert.ok(!existsSync(path.join(dir, "anime")));
  assert.throws(() => pack(repo, dir, "add", "yok"));
});

test("sync, paket klasörü yokken (eski kurulumdan güncelleme) depodaki tüm paketleri kurar", () => {
  const dir = path.join(tmp(), "packs");
  pack(repo, dir, "sync");
  assert.equal(states(repo, dir).hyprland, "installed");
  assert.equal(states(repo, dir).anime, "installed");
});

test("seyrek klonda paket eklenince indirilir, kaldırılınca çalışma ağacından çıkar", () => {
  // Depo yerine yalnız gereken dosyalarla küçük bir kaynak depo (çalışma ağacındaki hali)
  const src = tmp(), git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  for (const p of ["scripts/pack.sh", "web/packs.tsv", "packs"]) cpSync(path.join(repo, p), path.join(src, p), { recursive: true });
  git(src, "init", "-q");
  git(src, "add", ".");
  git(src, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "paketler");

  const clone = path.join(tmp(), "Wallpaper");
  execFileSync("git", ["clone", "-q", "--no-local", "--sparse", "--filter=blob:none",
    "--upload-pack", "git -c uploadpack.allowFilter=true upload-pack", `file://${src}`, clone], { stdio: "ignore" });
  git(clone, "sparse-checkout", "set", "web", "scripts");
  assert.ok(!existsSync(path.join(clone, "packs", "anime")));

  const dir = path.join(tmp(), "packs");
  pack(clone, dir, "sync");
  assert.equal(states(clone, dir).anime, "available"); // seyrek klonda ilk kurulum yalnız Klasik

  pack(clone, dir, "add", "anime");
  assert.ok(existsSync(path.join(clone, "packs", "anime", "js", "light.js")));
  assert.ok(existsSync(path.join(dir, "anime", "js", "light.js")));
  assert.ok(!existsSync(path.join(clone, "packs", "hyprland")));

  pack(clone, dir, "remove", "anime");
  assert.ok(!existsSync(path.join(clone, "packs", "anime")));
  assert.ok(!existsSync(path.join(dir, "anime")));
  assert.ok(existsSync(path.join(clone, "web", "packs.tsv")));
});
