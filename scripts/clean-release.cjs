const fs = require("node:fs");
const path = require("node:path");
const { pruneReleaseDirectory } = require("./release-files.cjs");

const workspaceRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(workspaceRoot, "package.json"), "utf8")
);
const removed = pruneReleaseDirectory(
  path.join(workspaceRoot, "release"),
  packageJson.version
);

process.stdout.write(
  removed.length > 0
    ? `Eliminados ${removed.length} archivos o carpetas generados que ya no eran necesarios.\n`
    : "La carpeta de instaladores ya está limpia.\n"
);
