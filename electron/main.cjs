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

  if (options.mode === "intelligence") {
    const insight = report.automaticAnalysis || {};
    const teamSections = (insight.teams || []).map((team) => `
      <section class="team" style="--team:${escapeHtml(team.color || "#08756D")}">
        <header><span>${escapeHtml(team.shortName || "EQ")}</span><div><h2>${escapeHtml(team.name)}</h2><p>${escapeHtml(team.actions)} acciones · ${escapeHtml(team.score)} puntos etiquetados · ${escapeHtml(team.shootingPercentage)}% en tiro</p></div></header>
        <ul>${(team.conclusions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>`).join("");
    const playerSections = (insight.players || []).slice(0, 16).map((player) => `
      <div class="player"><strong>#${escapeHtml(player.number || "—")} ${escapeHtml(player.name)}</strong><span>${escapeHtml(player.teamName)}</span><p>${escapeHtml(player.conclusion)}</p></div>`).join("");
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
      @page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#101923;font:12px Arial,sans-serif}body>header{padding:20px 22px;background:#0b1218;color:#fff;border-radius:14px}h1{font-size:27px;margin:5px 0}.badge{color:#bdeb62;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.quality{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:15px 0}.quality div{padding:12px;border:1px solid #dbe3e8;border-radius:10px}.quality strong{display:block;color:#08756d;font-size:22px}.team{border:1px solid #dbe3e8;border-left:6px solid var(--team);border-radius:12px;padding:14px;margin:12px 0;break-inside:avoid}.team header{display:flex;gap:10px;align-items:center}.team header>span{display:grid;place-items:center;width:40px;height:40px;border-radius:10px;background:var(--team);color:#fff;font-weight:800}.team h2,.team p{margin:2px 0}.team li{margin:7px 0;line-height:1.45}.players{display:grid;grid-template-columns:1fr 1fr;gap:8px}.player{border:1px solid #dbe3e8;border-radius:9px;padding:10px;break-inside:avoid}.player strong,.player span{display:block}.player span,.player p,.caveat{color:#60707b}.player p{margin:6px 0 0;line-height:1.4}.caveat{margin-top:18px;padding:10px;background:#f2f5f6;border-radius:8px;font-size:10px}
    </style></head><body><header><span class="badge">Tactovia Local Insights · IA basada en reglas</span><h1>${escapeHtml(report.projectName || "Análisis")}</h1><p>${escapeHtml(report.videoName || "Sin vídeo")} · ${escapeHtml(report.generatedAt)}</p></header><div class="quality"><div><strong>${escapeHtml(insight.dataQuality?.teamCoverage || 0)}%</strong>equipos identificados</div><div><strong>${escapeHtml(insight.dataQuality?.playerCoverage || 0)}%</strong>jugadores identificados</div><div><strong>${escapeHtml(insight.dataQuality?.zoneCoverage || 0)}%</strong>tiros con zona</div></div>${teamSections}<h2>Lectura individual</h2><div class="players">${playerSections || "<p>Sin jugadores identificados.</p>"}</div><p class="caveat">${escapeHtml(insight.caveat || "Conclusiones automáticas basadas únicamente en el etiquetado disponible.")}</p></body></html>`;
  }

  if (options.mode === "visual") {
    const maximum = Math.max(...(report.stats || []).map((row) => Number(row.count) || 0), 1);
    const bars = (report.stats || []).slice(0, 10).map((row) => `<div><span>${escapeHtml(row.name)}</span><i style="width:${Math.round((Number(row.count) / maximum) * 100)}%;background:${escapeHtml(row.color)}"></i><strong>${escapeHtml(row.count)}</strong></div>`).join("");
    const playerBars = (report.players || []).slice(0, 10).map((player) => `<div><span>#${escapeHtml(player.number || "—")} ${escapeHtml(player.name)}</span><i style="width:${Math.round((Number(player.count) / Math.max(Number(report.players?.[0]?.count) || 1, 1)) * 100)}%"></i><strong>${escapeHtml(player.count)}</strong></div>`).join("");
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
      @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#eef2f3;color:#101923;font:11px Arial,sans-serif}header{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}h1{font-size:24px;margin:3px 0}.brand{color:#08756d;font-weight:800;letter-spacing:.12em}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}.kpis div,.panel{background:#fff;border:1px solid #dce4e7;border-radius:12px;padding:12px}.kpis strong{display:block;font-size:25px;color:#08756d}.grid{display:grid;grid-template-columns:1.1fr .9fr 1fr;gap:8px}.panel h2{font-size:14px;margin:0 0 10px}.bars div{display:grid;grid-template-columns:105px 1fr 24px;gap:7px;align-items:center;margin:7px 0}.bars i{display:block;height:11px;border-radius:4px;background:#08756d}.shot-map{display:block;width:78%;max-height:400px;margin:auto;border-radius:10px}.note{text-align:right;color:#64717c;font-size:9px;margin-top:7px}
    </style></head><body><header><div><span class="brand">TACTOVIA · VISUAL REPORT</span><h1>${escapeHtml(report.projectName || "Análisis")}</h1></div><span>${escapeHtml(report.generatedAt)}</span></header><div class="kpis"><div><span>Acciones</span><strong>${escapeHtml(report.totalEvents)}</strong></div><div><span>Etiquetas usadas</span><strong>${escapeHtml(report.totalTags)}</strong></div><div><span>Vídeo analizado</span><strong>${escapeHtml(report.analyzedTime)}</strong></div></div><div class="grid"><section class="panel"><h2>Acciones por etiqueta</h2><div class="bars">${bars}</div></section><section class="panel"><h2>Mapa de tiro</h2><svg class="shot-map" viewBox="0 0 500 470"><rect width="500" height="470" rx="10" fill="#d9a860"/>${shotMap}<g fill="none" stroke="#fff" stroke-width="4"><rect x="10" y="10" width="480" height="450"/><path d="M170 10V235H330V10M170 235A80 80 0 0 0 330 235M205 48A45 45 0 0 0 295 48"/><circle cx="250" cy="70" r="12"/><path d="M35 10V95M465 10V95M35 95A216 216 0 0 0 465 95"/></g></svg></section><section class="panel"><h2>Participación individual</h2><div class="bars">${playerBars || "Sin jugadores identificados"}</div></section></div><p class="note">Visuales generados exclusivamente con las acciones del partido actual.</p></body></html>`;
  }

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
        payload.library
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
    const quality = {
      high: { preset: "slow", crf: "18" },
      compact: { preset: "veryfast", crf: "26" },
      balanced: { preset: "veryfast", crf: "20" }
    }[payload.quality] || { preset: "veryfast", crf: "20" };
    const highlights = payload.outputMode === "highlights";
    const temporaryDirectory = highlights
      ? path.join(outputDirectory, `.tactovia-export-${Date.now()}`)
      : "";
    try {
      if (temporaryDirectory) fs.mkdirSync(temporaryDirectory, { recursive: true });
      for (let index = 0; index < payload.events.length; index += 1) {
        const item = payload.events[index];
        const start = Math.max(0, Number(item.start) || 0);
        const duration = Math.max(0.1, (Number(item.end) || start + 0.1) - start);
        const itemDirectory = highlights
          ? temporaryDirectory
          : path.join(
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
          quality.preset,
          "-crf",
          quality.crf,
          "-c:a",
          "aac",
          "-movflags",
          "+faststart",
          "-y",
          outputPath
        ]);
        if (!highlights) created.push(outputPath);
      }
      if (highlights) {
        const temporaryClips = fs.readdirSync(temporaryDirectory)
          .filter((fileName) => fileName.endsWith(".mp4"))
          .sort()
          .map((fileName) => path.join(temporaryDirectory, fileName));
        const concatList = path.join(temporaryDirectory, "clips.txt");
        fs.writeFileSync(
          concatList,
          temporaryClips
            .map((filePath) => `file '${filePath.replaceAll("'", "'\\''")}'`)
            .join("\n"),
          "utf8"
        );
        const outputPath = path.join(
          outputDirectory,
          `${safeFilePart(payload.projectName || "Tactovia")}-highlights.mp4`
        );
        await runFfmpeg([
          "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
          "-i", concatList, "-c", "copy", "-movflags", "+faststart", "-y", outputPath
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
    const reportSuffix = report.options?.mode === "intelligence"
      ? "analisis-ia"
      : report.options?.mode === "visual"
        ? "graficos"
        : "informe";
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar informe PDF",
      defaultPath: `${safeFilePart(report.projectName)}-${reportSuffix}.pdf`,
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
        pageSize: "A4",
        landscape: report.options?.mode === "visual",
        preferCSSPageSize: true
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
