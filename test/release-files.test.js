import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  assertReleaseDirectory,
  deliverableNames,
  pruneReleaseDirectory
} = require("../scripts/release-files.cjs");

test("conserva únicamente los tres instaladores útiles de la versión actual", () => {
  assert.deepEqual(
    [...deliverableNames("0.10.0")].sort(),
    [
      "Tactovia-0.10.0-mac-arm64.dmg",
      "Tactovia-0.10.0-win-x64.exe",
      "Tactovia-0.10.0-win-x64.zip"
    ].sort()
  );
});

test("elimina versiones anteriores, blockmaps y carpetas intermedias", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "scout-release-"));
  const release = path.join(parent, "release");
  fs.mkdirSync(path.join(release, "win-unpacked"), { recursive: true });
  [
    "Tactovia-0.9.0-mac-arm64.dmg",
    "Tactovia-0.10.0-mac-arm64.dmg",
    "Tactovia-0.10.0-mac-arm64.dmg.blockmap",
    "builder-debug.yml"
  ].forEach((name) => fs.writeFileSync(path.join(release, name), "test"));

  try {
    const removed = pruneReleaseDirectory(release, "0.10.0");
    assert.ok(removed.includes("Tactovia-0.9.0-mac-arm64.dmg"));
    assert.ok(removed.includes("win-unpacked"));
    assert.deepEqual(fs.readdirSync(release), [
      "Tactovia-0.10.0-mac-arm64.dmg"
    ]);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test("rechaza limpiar cualquier carpeta que no se llame release", () => {
  assert.throws(
    () => assertReleaseDirectory("/private/tmp/Tactovia"),
    /carpeta release/
  );
});
