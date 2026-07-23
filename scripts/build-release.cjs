const { spawnSync } = require("node:child_process");
const path = require("node:path");

const workspaceRoot = path.resolve(__dirname, "..");
const bundledRuntimeRoot =
  "/Users/dariogealopez/.cache/codex-runtimes/codex-primary-runtime/dependencies";
const executableSearchPath = [
  path.join(bundledRuntimeRoot, "node", "bin"),
  path.join(bundledRuntimeRoot, "bin", "fallback"),
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin"
].join(path.delimiter);
const builderCli = path.join(
  workspaceRoot,
  "node_modules",
  "electron-builder",
  "out",
  "cli",
  "cli.js"
);
const targets = process.argv.slice(2);

if (targets.length === 0) {
  throw new Error(
    "Indica los destinos, por ejemplo: --mac dmg zip --arm64"
  );
}

const result = spawnSync(process.execPath, [builderCli, ...targets], {
  cwd: workspaceRoot,
  env: {
    ...process.env,
    PATH: executableSearchPath,
    npm_config_user_agent: "pnpm/11.9.0"
  },
  stdio: "inherit"
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
