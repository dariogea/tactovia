const fs = require("node:fs");
const path = require("node:path");

function deliverableNames(version) {
  return new Set([
    `Tactovia-${version}-mac-arm64.dmg`,
    `Tactovia-${version}-win-x64.exe`,
    `Tactovia-${version}-win-x64.zip`
  ]);
}

function assertReleaseDirectory(releaseDirectory) {
  if (path.basename(path.resolve(releaseDirectory)) !== "release") {
    throw new Error("La limpieza solo puede ejecutarse sobre la carpeta release.");
  }
}

function pruneReleaseDirectory(releaseDirectory, version) {
  assertReleaseDirectory(releaseDirectory);
  if (!fs.existsSync(releaseDirectory)) {
    fs.mkdirSync(releaseDirectory, { recursive: true });
    return [];
  }

  const keep = deliverableNames(version);
  const removed = [];
  for (const entry of fs.readdirSync(releaseDirectory)) {
    if (keep.has(entry)) continue;
    fs.rmSync(path.join(releaseDirectory, entry), {
      recursive: true,
      force: true
    });
    removed.push(entry);
  }
  return removed;
}

module.exports = {
  assertReleaseDirectory,
  deliverableNames,
  pruneReleaseDirectory
};
