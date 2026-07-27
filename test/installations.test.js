import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  compareVersions,
  findMacAppBundle,
  findPreviousMacApplications,
  legacyUserDataDirectory
} = require("../electron/installations.cjs");

test("compara versiones numéricas sin confundir 0.10 con 0.9", () => {
  assert.ok(compareVersions("0.10.0", "0.9.9") > 0);
  assert.ok(compareVersions("0.4.0", "0.4.1") < 0);
  assert.equal(compareVersions("1.2", "1.2.0"), 0);
});

test("localiza el paquete .app que contiene el ejecutable", () => {
  assert.equal(
    findMacAppBundle(
      "/Applications/Tactovia.app/Contents/MacOS/Tactovia"
    ),
    "/Applications/Tactovia.app"
  );
  assert.equal(findMacAppBundle("/usr/local/bin/scout"), "");
});

test("Tactovia conserva la carpeta de datos de ScoutAnalyzer", () => {
  assert.equal(
    legacyUserDataDirectory("/Users/demo/Library/Application Support"),
    "/Users/demo/Library/Application Support/scout-analyzer"
  );
});

test("solo marca copias del mismo producto con versión igual o anterior", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "scout-apps-"));
  const current = path.join(root, "Tactovia.app");
  const old = path.join(root, "ScoutAnalyzer antigua.app");
  const duplicate = path.join(root, "ScoutAnalyzer copia.app");
  const future = path.join(root, "ScoutAnalyzer futura.app");
  const other = path.join(root, "Otra.app");
  [current, old, duplicate, future, other].forEach((item) =>
    fs.mkdirSync(item, { recursive: true })
  );
  const metadata = new Map([
    [old, { bundleIdentifier: "com.scoutanalyzer.desktop", version: "0.3.0" }],
    [duplicate, { bundleIdentifier: "com.scoutanalyzer.desktop", version: "0.4.1" }],
    [future, { bundleIdentifier: "com.scoutanalyzer.desktop", version: "0.5.0" }],
    [other, { bundleIdentifier: "com.otro.producto", version: "0.1.0" }]
  ]);

  try {
    assert.deepEqual(
      findPreviousMacApplications({
        currentBundlePath: current,
        currentVersion: "0.4.1",
        bundleIdentifier: "com.scoutanalyzer.desktop",
        applicationRoots: [root],
        readBundleInfo: (bundlePath) => metadata.get(bundlePath) || null
      }).sort(),
      [duplicate, old].sort()
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
