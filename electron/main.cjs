const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  protocol,
  shell
} = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const ExcelJS = require("exceljs");
const { createDatabaseService } = require("./database.cjs");
const {
  findMacAppBundle,
  findPreviousMacApplications,
  legacyUserDataDirectory
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
      stream: true
    }
  }
]);

const allowedVideoExtensions = new Set([
  ".mp4",
  ".m4v",
  ".mov",
  ".webm",
  ".ogv"
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
      "El vídeo no existe o su formato no es compatible. Usa MP4, MOV, M4V, WebM u OGV."
    );
  }
  authorizedMedia.add(resolved);
  const encoded = Buffer.from(resolved, "utf8").toString("base64url");
  return {
    path: resolved,
    name: path.basename(resolved),
    url: `scout-media://local/${encoded}`
  };
}

function registerMediaProtocol() {
  protocol.handle("scout-media", async (request) => {
    try {
      const parsed = new URL(request.url);
      const encoded = parsed.pathname.replace(/^\//, "");
      const filePath = path.resolve(
        Buffer.from(encoded, "base64url").toString("utf8")
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
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: "#0B1218",
    title: "Tactovia",
    icon: path.join(
      __dirname,
      "..",
      "build",
      "icons",
      "tactovia-app-icon-512.png"
    ),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
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
      path.join(app.getPath("home"), "Applications")
    ]
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
      buttons: ["Aceptar"]
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
    executable
  );
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(usableFfmpegPath(), args, {
      windowsHide: true
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
            `No se pudo generar el clip (código ${code}). ${errorOutput.slice(-500)}`
          )
        );
      }
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function reportHtml(report) {
  const options = {
    executiveSummary: true,
    tagBreakdown: true,
    shotZones: true,
    playerBreakdown: true,
    chronology: true,
    notes: true,
    ...(report.options || {})
  };
  const rows = (report.stats || [])
    .map(
      (row) => `
        <tr>
          <td><span class="dot" style="background:${escapeHtml(row.color)}"></span>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.count)}</td>
          <td>${escapeHtml(row.duration)}</td>
        </tr>`
    )
    .join("");

  const events = (report.events || [])
    .slice(0, 250)
    .map(
      (event) => `
        <tr>
          <td>${escapeHtml(event.time)}</td>
          <td>${escapeHtml(event.tag)}</td>
          <td>${escapeHtml(event.team)}</td>
          <td>${escapeHtml(event.player)}</td>
          <td>${escapeHtml(event.shotZone)}</td>
          <td>${escapeHtml(event.notes)}</td>
        </tr>`
    )
    .join("");
  const shotZones = (report.shotZones || [])
    .map(
      (zone) => `
        <tr>
          <td>${escapeHtml(zone.name)}</td>
          <td>${escapeHtml(zone.points)}P</td>
          <td>${escapeHtml(zone.made)} / ${escapeHtml(zone.attempts)}</td>
          <td>${escapeHtml(zone.attempts ? `${zone.percentage}%` : "—")}</td>
        </tr>`
    )
    .join("");
  const players = (report.players || [])
    .map(
      (player) => `
        <tr>
          <td>${escapeHtml(player.number ? `#${player.number}` : "—")}</td>
          <td>${escapeHtml(player.name)}</td>
          <td>${escapeHtml(player.team)}</td>
          <td>${escapeHtml(player.count)}</td>
          <td>${escapeHtml(player.shots)}</td>
        </tr>`
    )
    .join("");
  const maximumZoneAttempts = Math.max(
    ...(report.shotZones || []).map((zone) => Number(zone.attempts) || 0),
    1
  );
  const shotMap = (report.shotZones || [])
    .map((zone) => {
      const opacity = 0.12 + ((Number(zone.attempts) || 0) / maximumZoneAttempts) * 0.62;
      return `
        <g>
          <path d="${escapeHtml(zone.path || "")}" fill="#08756D" fill-opacity="${opacity.toFixed(2)}" stroke="#263640" stroke-width="1.5"/>
          <text x="${escapeHtml(zone.labelX)}" y="${escapeHtml(zone.labelY)}" text-anchor="middle" fill="#ffffff" stroke="#0B1218" stroke-width="3" paint-order="stroke" font-size="11" font-weight="700">
            ${escapeHtml(`${zone.made}/${zone.attempts} · ${zone.attempts ? `${zone.percentage}%` : "—"}`)}
          </text>
        </g>`;
    })
    .join("");

  return `<!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #0B1218; font: 12px Arial, sans-serif; }
          header { border-bottom: 3px solid #08756D; margin-bottom: 22px; padding-bottom: 12px; }
          h1 { margin: 0 0 5px; font-size: 26px; }
          h2 { font-size: 16px; margin-top: 24px; }
          p { color: #64717C; }
          .summary { display: flex; gap: 12px; margin: 18px 0; }
          .card { border: 1px solid #d9deea; border-radius: 8px; padding: 12px; min-width: 125px; }
          .card strong { display: block; font-size: 21px; color: #08756D; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th { background: #edf1f6; text-align: left; }
          th, td { border-bottom: 1px solid #dfe3eb; padding: 7px; vertical-align: top; }
          .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 7px; }
          .shot-map { display: block; width: 54%; max-height: 390px; margin: 10px auto 16px; border-radius: 12px; background: #d9a860; }
          footer { color: #64717C; font-size: 10px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(report.projectName || "Análisis")}</h1>
          <p>${escapeHtml(report.videoName || "Sin vídeo")} · ${escapeHtml(report.generatedAt)}</p>
        </header>
        ${options.executiveSummary ? `<div class="summary">
          <div class="card"><strong>${escapeHtml(report.totalEvents || 0)}</strong>eventos</div>
          <div class="card"><strong>${escapeHtml(report.totalTags || 0)}</strong>etiquetas usadas</div>
          <div class="card"><strong>${escapeHtml(report.analyzedTime || "00:00")}</strong>vídeo analizado</div>
        </div>` : ""}
        ${options.tagBreakdown ? `<h2>Resumen por etiqueta</h2>
        <table>
          <thead><tr><th>Etiqueta</th><th>Eventos</th><th>Duración total</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="3">Todavía no hay eventos.</td></tr>'}</tbody>
        </table>` : ""}
        ${options.shotZones ? `<h2>Mapa estadístico de tiro</h2>
        <svg class="shot-map" viewBox="0 0 500 470" aria-label="Mapa de tiro">
          <rect width="500" height="470" rx="10" fill="#d9a860"/>
          ${shotMap}
          <g fill="none" stroke="#ffffff" stroke-width="4">
            <rect x="10" y="10" width="480" height="450"/>
            <path d="M170 10V235H330V10M170 235A80 80 0 0 0 330 235M205 48A45 45 0 0 0 295 48"/>
            <circle cx="250" cy="70" r="12"/><path d="M220 48H280"/>
            <path d="M35 10V95M465 10V95M35 95A216 216 0 0 0 465 95"/>
          </g>
        </svg>
        <table>
          <thead><tr><th>Zona</th><th>Valor</th><th>Canastas / tiros</th><th>Acierto</th></tr></thead>
          <tbody>${shotZones || '<tr><td colspan="4">No hay tiros localizados.</td></tr>'}</tbody>
        </table>` : ""}
        ${options.playerBreakdown ? `<h2>Actividad por jugador</h2>
        <table>
          <thead><tr><th>Dorsal</th><th>Jugador</th><th>Equipo</th><th>Acciones</th><th>Tiros</th></tr></thead>
          <tbody>${players || '<tr><td colspan="5">No hay jugadores identificados.</td></tr>'}</tbody>
        </table>` : ""}
        ${options.chronology ? `<h2>Registro de acciones</h2>
        <table>
          <thead><tr><th>Tiempo</th><th>Etiqueta</th><th>Equipo</th><th>Jugador</th><th>Zona</th><th>Notas</th></tr></thead>
          <tbody>${events || '<tr><td colspan="6">Todavía no hay eventos.</td></tr>'}</tbody>
        </table>` : ""}
        <footer>Generado localmente con Tactovia · Plataforma de análisis deportivo.</footer>
      </body>
    </html>`;
}

function playbookHtml(play) {
  const settings = {
    mode: "classic",
    layout: "large-grid",
    showDescription: true,
    showPhaseTitles: true,
    showPhaseDescription: true,
    showNotes: true,
    showAttachments: true,
    ...(play.outputSettings || {})
  };
  const noteBlocks = (play.noteBlocks || [])
    .filter((block) => block.content)
    .map(
      (block) =>
        `<p class="${escapeHtml(block.type || "paragraph")}">${
          block.type === "check" ? (block.checked ? "☑ " : "☐ ") : ""
        }${escapeHtml(block.content)}</p>`
    )
    .join("");
  const attachments = (play.attachments || [])
    .map(
      (attachment) =>
        `<li>${escapeHtml(attachment.name || "Recurso")}${
          attachment.url ? ` · ${escapeHtml(attachment.url)}` : ""
        }</li>`
    )
    .join("");
  const phases = (play.images || [])
    .filter((item) => /^data:image\/png;base64,/.test(item.dataUrl || ""))
    .map((item, index) => {
      const phaseNotes = (item.noteBlocks || [])
        .filter((block) => block.content)
        .map(
          (block) =>
            `<p class="${escapeHtml(block.type || "paragraph")}">${
              block.type === "check" ? (block.checked ? "☑ " : "☐ ") : ""
            }${escapeHtml(block.content)}</p>`
        )
        .join("");
      const phaseAttachments = (item.attachments || [])
        .map(
          (attachment) =>
            `<li>${escapeHtml(attachment.name || "Recurso")}${
              attachment.url ? ` · ${escapeHtml(attachment.url)}` : ""
            }</li>`
        )
        .join("");
      return `
        <section class="phase">
          ${
            settings.showPhaseTitles
              ? `<h2>${index + 1}. ${escapeHtml(item.name || `Fase ${index + 1}`)}</h2>`
              : ""
          }
          <img src="${item.dataUrl}" alt="">
          ${
            settings.showPhaseDescription && item.description
              ? `<p class="phase-description">${escapeHtml(item.description)}</p>`
              : ""
          }
          ${
            settings.showNotes && phaseNotes
              ? `<div class="phase-notes">${phaseNotes}</div>`
              : ""
          }
          ${
            settings.showAttachments && phaseAttachments
              ? `<div class="phase-resources"><strong>Recursos</strong><ul>${phaseAttachments}</ul></div>`
              : ""
          }
        </section>`
    })
    .join("");
  const descriptionSection =
    settings.showDescription && play.description
      ? `<section class="text-card"><strong>Descripción</strong><p>${escapeHtml(play.description)}</p></section>`
      : "";
  const notesSection =
    settings.showNotes && (play.notes || noteBlocks)
      ? `<section class="text-card"><strong>Notas del entrenador</strong>${
          play.notes ? `<p>${escapeHtml(play.notes)}</p>` : ""
        }${noteBlocks}</section>`
      : "";
  const attachmentsSection =
    settings.showAttachments && attachments
      ? `<section class="text-card"><strong>Recursos adjuntos</strong><ul>${attachments}</ul></section>`
      : "";
  const phaseSection = `<section class="phases ${escapeHtml(settings.layout)}">${phases || "<p>No hay fases para exportar.</p>"}</section>`;
  const classicBody = `${descriptionSection}${notesSection}${phaseSection}${attachmentsSection}`;
  const advancedBody = (settings.blocks || [])
    .map((block) => {
      if (block.type === "description") return descriptionSection;
      if (block.type === "phases") return phaseSection;
      if (block.type === "notes") return notesSection;
      if (block.type === "attachments") return attachmentsSection;
      if (block.type === "custom") {
        return `<section class="text-card"><strong>${escapeHtml(block.title || "Bloque")}</strong><p>${escapeHtml(block.content || "")}</p></section>`;
      }
      return "";
    })
    .join("");
  return `<!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #0B1218; font: 12px Arial, sans-serif; }
          header { border-left: 7px solid ${escapeHtml(play.teamColor || "#08756D")}; padding: 4px 0 4px 14px; margin-bottom: 16px; }
          h1 { margin: 0 0 4px; font-size: 26px; }
          header p { margin: 2px 0; color: #647083; }
          h2 { margin: 0 0 10px; font-size: 17px; }
          .text-card { break-inside: avoid; margin: 0 0 12px; padding: 12px; border: 1px solid #d7dce5; border-radius: 8px; }
          .text-card strong { display: block; margin-bottom: 6px; color: ${escapeHtml(play.teamColor || "#08756D")}; font-size: 10px; text-transform: uppercase; }
          .text-card p { margin: 5px 0; white-space: pre-wrap; }
          .text-card .heading { font-size: 16px; font-weight: 700; }
          .phases { display: grid; gap: 12px; align-items: start; }
          .phases.large-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .phases.small-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .phases.rows { grid-template-columns: 1fr; }
          .phase { break-inside: avoid; padding: 10px; border: 1px solid #d7dce5; border-radius: 8px; }
          .phase h2 { margin-bottom: 8px; font-size: 14px; }
          .phase img { display: block; width: 100%; max-height: 108mm; object-fit: contain; border-radius: 5px; }
          .small-grid .phase img { max-height: 75mm; }
          .rows .phase { display: grid; grid-template-columns: minmax(0, 2fr) minmax(180px, 1fr); gap: 12px; }
          .rows .phase h2 { grid-column: 1 / -1; }
          .phase-description { margin: 8px 0 0; color: #566274; white-space: pre-wrap; }
          .phase-notes, .phase-resources { margin-top: 8px; padding-top: 7px; border-top: 1px solid #e5e8ee; }
          .phase-notes p { margin: 4px 0; }
          .phase-notes .heading { font-size: 14px; font-weight: 700; }
          .phase-resources strong { display: block; margin-bottom: 4px; font-size: 10px; text-transform: uppercase; color: #647083; }
          ul { margin: 0; padding-left: 18px; }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(play.name || "Jugada")}</h1>
          <p>${escapeHtml(play.teamName || "Sin equipo asociado")}</p>
        </header>
        ${settings.mode === "advanced" ? advancedBody || classicBody : classicBody}
      </body>
    </html>`;
}

function styleWorkbookHeader(row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF08756D" }
    };
    cell.alignment = { vertical: "middle" };
  });
}

function styleTitle(cell) {
  cell.font = { bold: true, size: 20, color: { argb: "FF0B1218" } };
}

async function createAnalysisWorkbook(project) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tactovia";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summary = workbook.addWorksheet("Resumen", {
    views: [{ showGridLines: false }]
  });
  summary.columns = [
    { width: 28 },
    { width: 20 },
    { width: 18 },
    { width: 18 }
  ];
  summary.mergeCells("A1:D1");
  summary.getCell("A1").value = project.projectName || "Análisis";
  styleTitle(summary.getCell("A1"));
  summary.getRow(1).height = 34;
  summary.getRow(1).alignment = { vertical: "middle" };
  summary.getCell("A3").value = "Vídeo";
  summary.getCell("B3").value = project.video?.name || "Sin vídeo";
  summary.getCell("A4").value = "Duración";
  summary.getCell("B4").value = (Number(project.video?.duration) || 0) / 86400;
  summary.getCell("B4").numFmt = "[h]:mm:ss";
  const homeTeam = (project.teams || []).find((team) => team.id === project.match?.homeTeamId);
  const awayTeam = (project.teams || []).find((team) => team.id === project.match?.awayTeamId);
  summary.getCell("C3").value = "Equipo local";
  summary.getCell("D3").value = homeTeam?.name || "Sin asignar";
  summary.getCell("C4").value = "Equipo visitante";
  summary.getCell("D4").value = awayTeam?.name || "Sin asignar";
  summary.getCell("A5").value = "Eventos";
  summary.getCell("B5").value = project.events.length;
  summary.getCell("A6").value = "Equipos";
  summary.getCell("B6").value = (project.teams || []).length;
  summary.getCell("A7").value = "Jugadores";
  summary.getCell("B7").value = (project.teams || []).reduce(
    (total, team) => total + (team.players || []).length,
    0
  );
  summary.getRow(9).values = ["Etiqueta", "Eventos", "Duración total", "Color"];
  styleWorkbookHeader(summary.getRow(9));

  const tagRows = (project.template?.tags || []).map((tag) => {
    const matching = project.events.filter((event) => event.tagId === tag.id);
    return [
      tag.name,
      matching.length,
      matching.reduce((total, event) => total + Math.max(0, event.end - event.start), 0) /
        86400,
      tag.color
    ];
  });
  if (tagRows.length > 0) {
    summary.getColumn(3).numFmt = "[h]:mm:ss.0";
    summary.addTable({
      name: "ResumenEtiquetas",
      ref: "A9",
      headerRow: true,
      style: { theme: "TableStyleMedium4", showRowStripes: true },
      columns: [
        { name: "Etiqueta" },
        { name: "Eventos" },
        { name: "Duración total" },
        { name: "Color" }
      ],
      rows: tagRows
    });
  }

  const eventsSheet = workbook.addWorksheet("Eventos", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }]
  });
  eventsSheet.columns = [
    { header: "Inicio", key: "start", width: 14 },
    { header: "Fin", key: "end", width: 14 },
    { header: "Duración", key: "duration", width: 14 },
    { header: "Etiqueta", key: "tag", width: 24 },
    { header: "Tipo", key: "mode", width: 13 },
    { header: "Equipo", key: "team", width: 24 },
    { header: "Jugador", key: "player", width: 25 },
    { header: "Zona de pista", key: "shotZone", width: 27 },
    { header: "Valor de tiro", key: "shotPoints", width: 14 },
    { header: "Notas", key: "notes", width: 42 },
    { header: "ID evento", key: "id", width: 38 }
  ];
  styleWorkbookHeader(eventsSheet.getRow(1));
  project.events
    .slice()
    .sort((left, right) => left.start - right.start)
    .forEach((event) => {
      eventsSheet.addRow({
        start: event.start / 86400,
        end: event.end / 86400,
        duration: Math.max(0, event.end - event.start) / 86400,
        tag: event.tagName,
        mode: event.mode === "interval" ? "Intervalo" : "Instante",
        team: event.team || null,
        player: event.player || null,
        shotZone: event.shotZoneName || event.shotZoneId || null,
        shotPoints: event.shotPoints || null,
        notes: event.notes || null,
        id: event.id
      });
    });
  ["A", "B", "C"].forEach((column) => {
    eventsSheet.getColumn(column).numFmt = "[h]:mm:ss.0";
  });
  eventsSheet.autoFilter = {
    from: "A1",
    to: "K1"
  };

  const teamsSheet = workbook.addWorksheet("Equipos", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }]
  });
  teamsSheet.columns = [
    { header: "Equipo", key: "name", width: 28 },
    { header: "Abreviatura", key: "shortName", width: 14 },
    { header: "Color principal", key: "primaryColor", width: 18 },
    { header: "Color secundario", key: "secondaryColor", width: 18 },
    { header: "Club", key: "clubName", width: 26 },
    { header: "Categoría", key: "category", width: 18 },
    { header: "Temporada", key: "season", width: 14 },
    { header: "País", key: "country", width: 18 },
    { header: "Ciudad", key: "city", width: 18 },
    { header: "Pabellón", key: "arena", width: 24 },
    { header: "Entrenador", key: "coach", width: 24 },
    { header: "Asistente", key: "assistantCoach", width: 24 },
    { header: "Web", key: "website", width: 28 },
    { header: "Fundación", key: "founded", width: 12 },
    { header: "Jugadores", key: "players", width: 12 },
    { header: "Notas", key: "notes", width: 42 },
    { header: "ID equipo", key: "id", width: 38 }
  ];
  styleWorkbookHeader(teamsSheet.getRow(1));
  (project.teams || []).forEach((team) =>
    teamsSheet.addRow({
      name: team.name,
      shortName: team.shortName,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      clubName: team.clubName || null,
      category: team.category || null,
      season: team.season || null,
      country: team.country || null,
      city: team.city || null,
      arena: team.arena || null,
      coach: team.coach || null,
      assistantCoach: team.assistantCoach || null,
      website: team.website || null,
      founded: Number.isFinite(Number(team.founded)) && team.founded !== ""
        ? Number(team.founded)
        : null,
      players: (team.players || []).length,
      notes: team.notes || null,
      id: team.id
    })
  );
  teamsSheet.autoFilter = { from: "A1", to: "Q1" };

  const playersSheet = workbook.addWorksheet("Jugadores", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }]
  });
  playersSheet.columns = [
    { header: "Equipo", key: "team", width: 26 },
    { header: "Dorsal", key: "number", width: 11 },
    { header: "Nombre", key: "name", width: 28 },
    { header: "Posición principal", key: "position", width: 18 },
    { header: "Segunda posición", key: "secondaryPosition", width: 18 },
    { header: "Altura", key: "height", width: 12 },
    { header: "Peso", key: "weight", width: 12 },
    { header: "Envergadura", key: "wingspan", width: 14 },
    { header: "Nacimiento", key: "birthDate", width: 15 },
    { header: "Nacionalidad", key: "nationality", width: 18 },
    { header: "Mano dominante", key: "dominantHand", width: 16 },
    { header: "Rol", key: "role", width: 18 },
    { header: "Estado", key: "status", width: 14 },
    { header: "Email", key: "email", width: 28 },
    { header: "Teléfono", key: "phone", width: 18 },
    { header: "Notas", key: "notes", width: 42 },
    { header: "ID jugador", key: "id", width: 38 }
  ];
  styleWorkbookHeader(playersSheet.getRow(1));
  (project.teams || []).forEach((team) => {
    (team.players || []).forEach((player) => {
      const birthTimestamp = Date.parse(`${player.birthDate || ""}T00:00:00Z`);
      playersSheet.addRow({
        team: team.name,
        number: player.number || null,
        name: player.name,
        position: player.position || null,
        secondaryPosition: player.secondaryPosition || null,
        height: Number.isFinite(Number(player.height)) && player.height !== "" ? Number(player.height) : null,
        weight: Number.isFinite(Number(player.weight)) && player.weight !== "" ? Number(player.weight) : null,
        wingspan: Number.isFinite(Number(player.wingspan)) && player.wingspan !== "" ? Number(player.wingspan) : null,
        birthDate: Number.isFinite(birthTimestamp) ? new Date(birthTimestamp) : null,
        nationality: player.nationality || null,
        dominantHand: player.dominantHand || null,
        role: player.role || null,
        status: player.status || null,
        email: player.email || null,
        phone: player.phone || null,
        notes: player.notes || null,
        id: player.id
      });
    });
  });
  playersSheet.getColumn("birthDate").numFmt = "yyyy-mm-dd";
  ["height", "weight", "wingspan"].forEach((key) => {
    playersSheet.getColumn(key).numFmt = "0";
  });
  playersSheet.autoFilter = { from: "A1", to: "Q1" };

  [summary, eventsSheet, teamsSheet, playersSheet].forEach((sheet) => {
    sheet.eachRow((row) => {
      row.alignment = { vertical: "top", wrapText: false };
    });
  });

  return workbook.xlsx.writeBuffer();
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.scoutanalyzer.desktop");
  app.setAboutPanelOptions({
    applicationName: "Tactovia",
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    credits: "Plataforma de análisis deportivo · Ve el juego. Decide mejor."
  });
  registerMediaProtocol();
  scoutingDatabase = createDatabaseService(
    path.join(app.getPath("userData"), "scoutanalyzer.db"),
    { seedOfficialCatalog: false }
  );

  ipcMain.handle("database:initialize", async (_event, payload = {}) => {
    try {
      if (payload.legacyProject?.id && !payload.isDemo) {
        scoutingDatabase.syncProject(
          payload.legacyProject,
          payload.ownerProfileId || "legacy-local"
        );
      }
      return {
        ok: true,
        fileName: path.basename(scoutingDatabase.filePath),
        snapshot: scoutingDatabase.snapshot(payload.ownerProfileId || "")
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
        payload?.ownerProfileId || "legacy-local"
      );
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("database:snapshot", async (_event, payload = {}) => {
    try {
      return {
        ok: true,
        snapshot: scoutingDatabase.snapshot(payload.ownerProfileId || "")
      };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("database:finalize-project", async (_event, payload) => {
    try {
      if (payload?.isDemo) return { ok: true, skipped: true };
      return scoutingDatabase.finalizeProject(
        payload.project,
        payload.ownerProfileId
      );
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("database:delete-game-record", async (_event, payload) => {
    try {
      return scoutingDatabase.deleteGameRecord(
        payload.recordId,
        payload.ownerProfileId
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
      filters: [{ name: "Base de datos Tactovia", extensions: ["db"] }]
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
          extensions: ["mp4", "m4v", "mov", "webm", "ogv"]
        }
      ]
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

  ipcMain.handle("playbook:select-attachment", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Añadir recurso al Playbook",
      properties: ["openFile"],
      filters: [
        {
          name: "Vídeo, imagen, audio o documento",
          extensions: [
            "mp4",
            "m4v",
            "mov",
            "webm",
            "png",
            "jpg",
            "jpeg",
            "webp",
            "gif",
            "mp3",
            "wav",
            "m4a",
            "pdf"
          ]
        }
      ]
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const filePath = result.filePaths[0];
    const extension = path.extname(filePath).toLowerCase();
    const type = [".mp4", ".m4v", ".mov", ".webm"].includes(extension)
      ? "video"
      : [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extension)
        ? "image"
        : [".mp3", ".wav", ".m4a"].includes(extension)
          ? "audio"
          : "document";
    return {
      canceled: false,
      item: {
        name: path.basename(filePath),
        path: filePath,
        type
      }
    };
  });

  ipcMain.handle("project:open", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Abrir análisis",
      properties: ["openFile"],
      filters: [{ name: "Análisis Tactovia", extensions: ["scout.json"] }]
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
        filters: [{ name: "Análisis Tactovia", extensions: ["scout.json"] }]
      });
      if (result.canceled || !result.filePath) return { canceled: true };
      filePath = result.filePath;
    }
    fs.writeFileSync(filePath, JSON.stringify(payload.project, null, 2), "utf8");
    return { canceled: false, filePath };
  });

  ipcMain.handle("export:csv", async (_event, payload) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar datos",
      defaultPath: `${safeFilePart(payload.projectName)}-eventos.csv`,
      filters: [{ name: "CSV", extensions: ["csv"] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    fs.writeFileSync(result.filePath, `\uFEFF${payload.csv}`, "utf8");
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle("export:xlsx", async (_event, payload) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar libro de Excel",
      defaultPath: `${safeFilePart(payload.project.projectName)}-analisis.xlsx`,
      filters: [{ name: "Libro de Excel", extensions: ["xlsx"] }]
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
      filters: [{ name: "Modelo de datos Power BI", extensions: ["xlsx"] }]
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

  ipcMain.handle("export:clips", async (_event, payload) => {
    if (!isSupportedVideo(payload.videoPath)) {
      return { canceled: false, error: "No se encuentra el vídeo original." };
    }
    if (!Array.isArray(payload.events) || payload.events.length === 0) {
      return { canceled: false, error: "Selecciona al menos un evento." };
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Carpeta para los clips",
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };

    const outputDirectory = result.filePaths[0];
    const created = [];
    try {
      for (let index = 0; index < payload.events.length; index += 1) {
        const item = payload.events[index];
        const start = Math.max(0, Number(item.start) || 0);
        const duration = Math.max(0.1, (Number(item.end) || start + 0.1) - start);
        const itemDirectory = path.join(
          outputDirectory,
          ...(Array.isArray(item.folders) ? item.folders.map(safeFilePart).filter(Boolean) : [])
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
          "veryfast",
          "-crf",
          "20",
          "-c:a",
          "aac",
          "-movflags",
          "+faststart",
          "-y",
          outputPath
        ]);
        created.push(outputPath);
      }
      return { canceled: false, directory: outputDirectory, files: created };
    } catch (error) {
      return { canceled: false, error: error.message, files: created };
    }
  });

  ipcMain.handle("export:report-pdf", async (_event, report) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar informe PDF",
      defaultPath: `${safeFilePart(report.projectName)}-informe.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };

    const reportWindow = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true }
    });
    try {
      const html = reportHtml(report);
      await reportWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
      );
      const pdf = await reportWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4"
      });
      fs.writeFileSync(result.filePath, pdf);
      return { canceled: false, filePath: result.filePath };
    } finally {
      reportWindow.destroy();
    }
  });

  ipcMain.handle("export:playbook-png", async (_event, payload) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar jugada",
      defaultPath: `${safeFilePart(payload.name)}.png`,
      filters: [{ name: "Imagen PNG", extensions: ["png"] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const match = /^data:image\/png;base64,(.+)$/.exec(payload.dataUrl || "");
    if (!match) return { canceled: false, error: "La imagen de la jugada no es válida." };
    fs.writeFileSync(result.filePath, Buffer.from(match[1], "base64"));
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle("export:playbook-pdf", async (_event, payload) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar playbook",
      defaultPath: `${safeFilePart(payload.name)}.pdf`,
      filters: [{ name: "Documento PDF", extensions: ["pdf"] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const exportWindow = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true }
    });
    try {
      await exportWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(playbookHtml(payload))}`
      );
      const pdf = await exportWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4",
        landscape: true
      });
      fs.writeFileSync(result.filePath, pdf);
      return { canceled: false, filePath: result.filePath };
    } catch (error) {
      return { canceled: false, error: error.message };
    } finally {
      exportWindow.destroy();
    }
  });

  ipcMain.handle("export:playbook-video", async (_event, payload) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar animación del Playbook",
      defaultPath: `${safeFilePart(payload.name)}.webm`,
      filters: [{ name: "Vídeo WebM", extensions: ["webm"] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    try {
      const buffer = Buffer.from(payload.buffer || []);
      if (buffer.length === 0) {
        throw new Error("La animación no contiene datos de vídeo.");
      }
      fs.writeFileSync(result.filePath, buffer);
      return { canceled: false, filePath: result.filePath };
    } catch (error) {
      return { canceled: false, error: error.message };
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
