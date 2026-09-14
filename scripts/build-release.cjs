const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { pruneReleaseDirectory } = require("./release-files.cjs");

const workspaceRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(workspaceRoot, "package.json"), "utf8"),
);
const builderCli = path.join(
  workspaceRoot,
  "node_modules",
  "electron-builder",
  "out",
  "cli",
  "cli.js",
);
const defaultTargets =
  process.platform === "win32"
    ? ["--win", "nsis", "zip", "--x64"]
    : ["--mac", "dmg", "--arm64"];
const targets =
  process.argv.length > 2 ? process.argv.slice(2) : defaultTargets;
const executableSearchPath = [
  path.dirname(process.execPath),
  path.join(workspaceRoot, "node_modules", ".bin"),
  process.env.PATH,
]
  .filter(Boolean)
  .join(path.delimiter);
const releaseDirectory = path.join(workspaceRoot, "release");

const result = spawnSync(process.execPath, [builderCli, ...targets], {
  cwd: workspaceRoot,
  env: {
    ...process.env,
    PATH: executableSearchPath,
    npm_config_user_agent: process.env.npm_config_user_agent || "pnpm/11.9.0",
  },
  stdio: "inherit",
});

if (!result.error && result.status === 0)
  pruneReleaseDirectory(releaseDirectory, packageJson.version);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
