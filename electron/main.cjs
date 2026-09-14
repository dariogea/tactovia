const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  protocol,
  shell,
} = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { reportHtml, createAnalysisWorkbook } = require("./reports.cjs");
const { createDatabaseService } = require("./database.cjs");
const {
  findMacAppBundle,
  findPreviousMacApplications,
  legacyUserDataDirectory,
} = require("./installations.cjs");
const { createMediaResponse } = require("./media.cjs");

// The public product is now Tactovia, but the legacy userData directory remains
// authoritative so existing profiles, preferences, autosaves and databases are
// discovered without requiring a risky copy or move.
app.setPath("userData", legacyUserDataDirectory(app.getPath("appData")));
app.setName("Tactovia");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "scout-media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

const allowedVideoExtensions = new Set([
  ".mp4",
  ".m4v",
  ".mov",
  ".webm",
  ".ogv",
]);
const authorizedMedia = new Set();
let mainWindow;
let scoutingDatabase;

function isSupportedVideo(filePath) {
  return (
    typeof filePath === "string" &&
    allowedVideoExtensions.has(path.extname(filePath).toLowerCase()) &&
    fs.existsSync(filePath)
  );
}

function authorizeVideo(filePath) {
  const resolved = path.resolve(filePath);
  if (!isSupportedVideo(resolved)) {
    throw new Error(
      "El vídeo no existe o su formato no es compatible. Usa MP4, MOV, M4V, WebM u OGV.",
    );
  }
  authorizedMedia.add(resolved);
  const encoded = Buffer.from(resolved, "utf8").toString("base64url");
  return {
    path: resolved,
    name: path.basename(resolved),
    url: `scout-media://local/${encoded}`,
  };
}

function registerMediaProtocol() {
  protocol.handle("scout-media", async (request) => {
    try {
      const parsed = new URL(request.url);
      const encoded = parsed.pathname.replace(/^\//, "");
      const filePath = path.resolve(
        Buffer.from(encoded, "base64url").toString("utf8"),
      );

      if (!authorizedMedia.has(filePath) || !isSupportedVideo(filePath)) {
        return new Response("Acceso al vídeo no autorizado", { status: 403 });
      }

      return createMediaResponse(request, filePath);
    } catch {
      return new Response("No se pudo abrir el vídeo", { status: 400 });
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 900,
    minHeight: 720,
    backgroundColor: "#0B1218",
    title: "Tactovia",
    icon: path.join(
      __dirname,
      "..",
      "build",
      "icons",
      "tactovia-app-icon-512.png",
    ),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.on("will-prevent-unload", (event) => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: "warning",
      title: "Guardar el análisis",
      message: "Hay cambios sin guardar en un archivo.",
      detail:
        "Vuelve al análisis y pulsa Guardar para conservar esta versión antes de salir.",
      buttons: ["Seguir trabajando", "Salir sin guardar"],
      defaultId: 0,
      cancelId: 0,
    });
    if (choice === 1) event.preventDefault();
  });

  if (!app.isPackaged) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

async function cleanPreviousMacInstallations() {
  if (process.platform !== "darwin" || !app.isPackaged) return;
  const currentBundlePath = findMacAppBundle(process.execPath);
  if (!currentBundlePath) return;

  const candidates = findPreviousMacApplications({
    currentBundlePath,
    currentVersion: app.getVersion(),
    bundleIdentifier: "com.scoutanalyzer.desktop",
    applicationRoots: [
      "/Applications",
      path.join(app.getPath("home"), "Applications"),
    ],
  });
  const removed = [];
  for (const candidate of candidates) {
    try {
      await shell.trashItem(candidate);
      removed.push(path.basename(candidate));
    } catch {
      // An application without write permissions is left untouched.
    }
  }
  if (removed.length > 0) {
    await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Actualización completada",
      message: "Tactovia se ha actualizado correctamente.",
      detail: `Las copias anteriores se han movido a la Papelera: ${removed.join(", ")}.`,
      buttons: ["Aceptar"],
    });
  }
}

function safeFilePart(value) {
  return String(value || "clip")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function usableFfmpegPath() {
  const executable = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "ffmpeg", executable);
  }
  return path.join(
    __dirname,
    "..",
    "vendor",
    "ffmpeg",
    `${process.platform}-${process.arch}`,
    executable,
  );
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(usableFfmpegPath(), args, {
      windowsHide: true,
    });
    let errorOutput = "";

    child.stderr.on("data", (chunk) => {
      errorOutput += chunk.toString();
      if (errorOutput.length > 12000) {
        errorOutput = errorOutput.slice(-12000);
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `No se pudo generar el clip (código ${code}). ${errorOutput.slice(-500)}`,
          ),
        );
      }
    });
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.scoutanalyzer.desktop");
  app.setAboutPanelOptions({
    applicationName: "Tactovia",
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    credits: "Plataforma de análisis deportivo · Ve el juego. Decide mejor.",
  });
  registerMediaProtocol();
  scoutingDatabase = createDatabaseService(
    path.join(app.getPath("userData"), "scoutanalyzer.db"),
    { seedOfficialCatalog: false },
  );

  ipcMain.handle("database:initialize", async (_event, payload = {}) => {
    try {
      if (payload.legacyProject?.id && !payload.isDemo) {
        scoutingDatabase.syncProject(
          payload.legacyProject,
          payload.ownerProfileId || "legacy-local",
        );
      }
      return {
        ok: true,
        fileName: path.basename(scoutingDatabase.filePath),
        snapshot: scoutingDatabase.snapshot(payload.ownerProfileId || ""),
      };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("database:sync-project", async (_event, payload) => {
    try {
      if (payload?.isDemo) return { ok: true, skipped: true };
      return scoutingDatabase.syncProject(
        payload?.project || payload,
        payload?.ownerProfileId || "legacy-local",
      );
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("database:snapshot", async (_event, payload = {}) => {
    try {
      return {
        ok: true,
        snapshot: scoutingDatabase.snapshot(payload.ownerProfileId || ""),
      };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("database:user-library", async (_event, payload = {}) => {
    try {
      return scoutingDatabase.getUserLibrary(payload.ownerProfileId || "");
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("database:save-user-library", async (_event, payload = {}) => {
    try {
      if (payload.isDemo) return { ok: true, skipped: true };
      return scoutingDatabase.saveUserLibrary(
        payload.ownerProfileId || "",
        payload.library,
      );
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("database:finalize-project", async (_event, payload) => {
    try {
      if (payload?.isDemo) return { ok: true, skipped: true };
      return scoutingDatabase.finalizeProject(
        payload.project,
        payload.ownerProfileId,
      );
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("database:delete-game-record", async (_event, payload) => {
    try {
      return scoutingDatabase.deleteGameRecord(
        payload.recordId,
        payload.ownerProfileId,
      );
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("database:backup", async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Crear copia de seguridad",
      defaultPath: `Tactovia-copia-${stamp}.db`,
      filters: [{ name: "Base de datos Tactovia", extensions: ["db"] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    try {
      await scoutingDatabase.backupTo(result.filePath);
      return { canceled: false, filePath: result.filePath };
    } catch (error) {
      return { canceled: false, error: error.message };
    }
  });

  ipcMain.handle("video:select", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Seleccionar vídeo",
      properties: ["openFile"],
      filters: [
        {
          name: "Vídeos compatibles",
          extensions: ["mp4", "m4v", "mov", "webm", "ogv"],
        },
      ],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    return { canceled: false, video: authorizeVideo(result.filePaths[0]) };
  });

  ipcMain.handle("video:authorize", async (_event, filePath) => {
    try {
      return { ok: true, video: authorizeVideo(filePath) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("project:open", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Abrir análisis",
      properties: ["openFile"],
      filters: [{ name: "Análisis Tactovia", extensions: ["scout.json"] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };

    try {
      const filePath = result.filePaths[0];
      const project = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (!project || !Array.isArray(project.events) || !project.template) {
        throw new Error("El archivo no contiene un análisis válido.");
      }
      let video = null;
      if (project.video?.path && isSupportedVideo(project.video.path)) {
        video = authorizeVideo(project.video.path);
      }
      return { canceled: false, filePath, project, video };
    } catch (error) {
      return { canceled: false, error: error.message };
    }
  });

  ipcMain.handle("project:save", async (_event, payload) => {
    let filePath = payload.filePath;
    if (!filePath) {
      const defaultName = `${safeFilePart(payload.project.projectName)}.scout.json`;
      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Guardar análisis",
        defaultPath: defaultName,
        filters: [{ name: "Análisis Tactovia", extensions: ["scout.json"] }],
      });
      if (result.canceled || !result.filePath) return { canceled: true };
      filePath = result.filePath;
    }
    fs.writeFileSync(
      filePath,
      JSON.stringify(payload.project, null, 2),
      "utf8",
    );
    return { canceled: false, filePath };
  });

  ipcMain.handle("export:csv", async (_event, payload) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar datos",
      defaultPath: `${safeFilePart(payload.projectName)}-eventos.csv`,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    fs.writeFileSync(result.filePath, `\uFEFF${payload.csv}`, "utf8");
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle("export:xlsx", async (_event, payload) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar libro de Excel",
      defaultPath: `${safeFilePart(payload.project.projectName)}-analisis.xlsx`,
      filters: [{ name: "Libro de Excel", extensions: ["xlsx"] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    try {
      const buffer = await createAnalysisWorkbook(payload.project);
      fs.writeFileSync(result.filePath, Buffer.from(buffer));
      return { canceled: false, filePath: result.filePath };
    } catch (error) {
      return { canceled: false, error: error.message };
    }
  });

  ipcMain.handle("export:powerbi", async (_event, payload) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar modelo para Power BI",
      defaultPath: `${safeFilePart(payload.project.projectName)}-power-bi.xlsx`,
      filters: [{ name: "Modelo de datos Power BI", extensions: ["xlsx"] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    try {
      const buffer = await createAnalysisWorkbook(payload.project, {
        powerBi: true,
      });
      fs.writeFileSync(result.filePath, Buffer.from(buffer));
      return { canceled: false, filePath: result.filePath };
    } catch (error) {
      return { canceled: false, error: error.message };
    }
  });

  ipcMain.handle("export:clips", async (_event, payload) => {
    if (!isSupportedVideo(payload.videoPath)) {
      return { canceled: false, error: "No se encuentra el vídeo original." };
    }
    if (!Array.isArray(payload.events) || payload.events.length === 0) {
      return { canceled: false, error: "Selecciona al menos un evento." };
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Carpeta para los clips",
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };

    const outputDirectory = result.filePaths[0];
    const created = [];
    const quality = {
      high: { preset: "slow", crf: "18" },
      compact: { preset: "veryfast", crf: "26" },
      balanced: { preset: "veryfast", crf: "20" },
    }[payload.quality] || { preset: "veryfast", crf: "20" };
    const highlights = payload.outputMode === "highlights";
    const temporaryDirectory = highlights
      ? path.join(outputDirectory, `.tactovia-export-${Date.now()}`)
      : "";
    try {
      if (temporaryDirectory)
        fs.mkdirSync(temporaryDirectory, { recursive: true });
      for (let index = 0; index < payload.events.length; index += 1) {
        const item = payload.events[index];
        const start = Math.max(0, Number(item.start) || 0);
        const duration = Math.max(
          0.1,
          (Number(item.end) || start + 0.1) - start,
        );
        const itemDirectory = highlights
          ? temporaryDirectory
          : path.join(
              outputDirectory,
              ...(Array.isArray(item.folders)
                ? item.folders.map(safeFilePart).filter(Boolean)
                : []),
            );
        fs.mkdirSync(itemDirectory, { recursive: true });
        const fileName = `${String(index + 1).padStart(3, "0")}-${safeFilePart(item.tagName)}-${safeFilePart(item.timeLabel)}.mp4`;
        const outputPath = path.join(itemDirectory, fileName);
        await runFfmpeg([
          "-hide_banner",
          "-loglevel",
          "error",
          "-ss",
          start.toFixed(3),
          "-i",
          payload.videoPath,
          "-t",
          duration.toFixed(3),
          "-map",
          "0:v:0",
          "-map",
          "0:a?",
          "-c:v",
          "libx264",
          "-preset",
          quality.preset,
          "-crf",
          quality.crf,
          "-c:a",
          "aac",
          "-movflags",
          "+faststart",
          "-y",
          outputPath,
        ]);
        if (!highlights) created.push(outputPath);
      }
      if (highlights) {
        const temporaryClips = fs
          .readdirSync(temporaryDirectory)
          .filter((fileName) => fileName.endsWith(".mp4"))
          .sort()
          .map((fileName) => path.join(temporaryDirectory, fileName));
        const concatList = path.join(temporaryDirectory, "clips.txt");
        fs.writeFileSync(
          concatList,
          temporaryClips
            .map((filePath) => `file '${filePath.replaceAll("'", "'\\''")}'`)
            .join("\n"),
          "utf8",
        );
        const outputPath = path.join(
          outputDirectory,
          `${safeFilePart(payload.projectName || "Tactovia")}-highlights.mp4`,
        );
        await runFfmpeg([
          "-hide_banner",
          "-loglevel",
          "error",
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          concatList,
          "-c",
          "copy",
          "-movflags",
          "+faststart",
          "-y",
          outputPath,
        ]);
        created.push(outputPath);
      }
      return { canceled: false, directory: outputDirectory, files: created };
    } catch (error) {
      return { canceled: false, error: error.message, files: created };
    } finally {
      if (temporaryDirectory && fs.existsSync(temporaryDirectory)) {
        fs.rmSync(temporaryDirectory, { recursive: true, force: true });
      }
    }
  });

  ipcMain.handle("export:report-pdf", async (_event, report) => {
    const reportSuffix =
      report.options?.mode === "intelligence"
        ? "analisis-ia"
        : report.options?.mode === "visual"
          ? "graficos"
          : "informe";
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar informe PDF",
      defaultPath: `${safeFilePart(report.projectName)}-${reportSuffix}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };

    const reportWindow = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true },
    });
    try {
      const html = reportHtml(report);
      await reportWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
      );
      const pdf = await reportWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4",
        landscape: report.options?.mode === "visual",
        preferCSSPageSize: true,
      });
      fs.writeFileSync(result.filePath, pdf);
      return { canceled: false, filePath: result.filePath };
    } finally {
      reportWindow.destroy();
    }
  });

  ipcMain.handle("file:reveal", async (_event, filePath) => {
    if (typeof filePath === "string" && fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
      return { ok: true };
    }
    return { ok: false };
  });

  createMainWindow();
  cleanPreviousMacInstallations().catch(() => {});

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  scoutingDatabase?.close();
  scoutingDatabase = null;
});
