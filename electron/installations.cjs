const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function compareVersions(left, right) {
  const leftParts = String(left || "").split(".").map((part) => Number(part) || 0);
  const rightParts = String(right || "").split(".").map((part) => Number(part) || 0);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function findMacAppBundle(executablePath) {
  let current = path.resolve(executablePath);
  while (path.dirname(current) !== current) {
    if (path.extname(current).toLowerCase() === ".app") return current;
    current = path.dirname(current);
  }
  return "";
}

function readMacBundleInfo(bundlePath) {
  const plistPath = path.join(bundlePath, "Contents", "Info.plist");
  if (!fs.existsSync(plistPath)) return null;
  try {
    const readValue = (key) =>
      execFileSync(
        "/usr/bin/plutil",
        ["-extract", key, "raw", "-o", "-", plistPath],
        { encoding: "utf8" }
      ).trim();
    return {
      bundleIdentifier: readValue("CFBundleIdentifier"),
      version: readValue("CFBundleShortVersionString")
    };
  } catch {
    return null;
  }
}

function findPreviousMacApplications({
  currentBundlePath,
  currentVersion,
  bundleIdentifier,
  applicationRoots,
  readBundleInfo = readMacBundleInfo
}) {
  const resolvedCurrent = path.resolve(currentBundlePath);
  const resolvedRoots = applicationRoots.map((root) => path.resolve(root));
  const currentIsInstalled = resolvedRoots.some(
    (root) => path.dirname(resolvedCurrent) === root
  );
  if (!currentIsInstalled) return [];

  const candidates = [];
  for (const root of resolvedRoots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.toLowerCase().endsWith(".app")) {
        continue;
      }
      const candidatePath = path.join(root, entry.name);
      if (path.resolve(candidatePath) === resolvedCurrent) continue;
      const info = readBundleInfo(candidatePath);
      if (
        info?.bundleIdentifier === bundleIdentifier &&
        compareVersions(info.version, currentVersion) <= 0
      ) {
        candidates.push(candidatePath);
      }
    }
  }
  return candidates;
}

module.exports = {
  compareVersions,
  findMacAppBundle,
  findPreviousMacApplications,
  readMacBundleInfo
};
