const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const { reportHtml } = require("../electron/reports.cjs");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tactovia-report-qa-"));
app.setPath("userData", path.join(dir, "profile"));
app.on("window-all-closed", () => {});
async function run() {
  const { createExampleProject } = await import("../src/lib/demo.js");
  const { reportPayload } = await import("../src/lib/analysis.js");
  const { buildAutomaticAnalysis } = await import("../src/lib/insights.js");
  const project = createExampleProject();
  for (const mode of ["intelligence", "visual"]) {
    const report = reportPayload(project, {
      mode,
      automaticAnalysis: buildAutomaticAnalysis(project),
    });
    const html = reportHtml(report);
    assert.ok(!html.includes("IA basada"));
    if (mode === "intelligence")
      assert.ok(html.includes(project.analysisNotes));
    const win = new BrowserWindow({
      show: false,
      width: 1120,
      height: 820,
      webPreferences: { sandbox: true },
    });
    await win.loadURL(
      "data:text/html;charset=utf-8," + encodeURIComponent(html),
    );
    const result = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      landscape: mode === "visual",
      preferCSSPageSize: true,
    });
    assert.ok(result.byteLength > 10000);
    fs.writeFileSync(path.join(dir, mode + ".pdf"), result);
    fs.writeFileSync(
      path.join(dir, mode + ".png"),
      (await win.webContents.capturePage()).toPNG(),
    );
    win.destroy();
  }
  console.log("REPORTS_OK modes=2 dir=" + dir);
}
app
  .whenReady()
  .then(run)
  .then(() => app.quit())
  .catch((error) => {
    console.error(error.message?.slice(0, 1500));
    app.exit(1);
  });
