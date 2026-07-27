const ExcelJS = require("exceljs");
const { deterministicId, PILOT_COMPETITION_SEASON_ID } = require("./database.cjs");

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cellValue(cell) {
  const value = cell?.value;
  if (value instanceof Date) return value;
  if (value && typeof value === "object") {
    if ("result" in value) return value.result;
    if ("text" in value) return value.text;
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
  }
  return value ?? "";
}

function worksheetRows(sheet) {
  if (!sheet || sheet.rowCount < 2) return [];
  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, column) => {
    headers[column] = normalizeHeader(cellValue(cell));
  });
  const rows = [];
  for (let index = 2; index <= sheet.rowCount; index += 1) {
    const source = sheet.getRow(index);
    const row = {};
    let hasValue = false;
    headers.forEach((header, column) => {
      if (!header) return;
      const value = cellValue(source.getCell(column));
      if (String(value ?? "").trim() !== "") hasValue = true;
      row[header] = value;
    });
    if (hasValue) rows.push(row);
  }
  return rows;
}

function text(value) {
  return String(value ?? "").trim();
}

function color(value, fallback) {
  const candidate = text(value).toUpperCase();
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : fallback;
}

function excelDate(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(value));
    return epoch.toISOString().slice(0, 10);
  }
  const candidate = text(value);
  if (!candidate) return "";
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(candidate)
    ? candidate
    : candidate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
      ? `${candidate.slice(-4)}-${candidate.split(/[/-]/)[1].padStart(2, "0")}-${candidate.split(/[/-]/)[0].padStart(2, "0")}`
      : "";
  return iso;
}

function scheduledAt(dateValue, timeValue) {
  const date = excelDate(dateValue);
  if (!date) return null;
  let time = text(timeValue);
  if (typeof timeValue === "number" && timeValue >= 0 && timeValue < 1) {
    const minutes = Math.round(timeValue * 24 * 60);
    time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
  if (!/^\d{1,2}:\d{2}$/.test(time)) time = "00:00";
  const [hours, minutes] = time.split(":");
  return `${date}T${hours.padStart(2, "0")}:${minutes}:00`;
}

function parseCatalogWorkbook(workbook) {
  const teamRows = worksheetRows(
    workbook.getWorksheet("Equipos") || workbook.worksheets[1]
  );
  const playerRows = worksheetRows(
    workbook.getWorksheet("Jugadores") || workbook.worksheets[2]
  );
  const matchRows = worksheetRows(
    workbook.getWorksheet("Partidos") || workbook.worksheets[3]
  );
  const warnings = [];
  const teamByCode = new Map();
  const seenTeamIds = new Set();
  const seenPlayerIds = new Set();
  const seenMatchIds = new Set();

  const teams = teamRows.flatMap((row, index) => {
    const name = text(row.nombre || row.equipo);
    const externalId = text(row.codigo || row.codigo_equipo);
    if (!name) warnings.push(`Equipos: la fila ${index + 2} no tiene nombre.`);
    if (!externalId) {
      warnings.push(
        `Equipos: la fila ${index + 2} no tiene un código estable.`
      );
    }
    const id = deterministicId("team", externalId || name || `row-${index}`);
    if (seenTeamIds.has(id)) {
      warnings.push(
        `Equipos: la fila ${index + 2} repite el código o nombre de otro equipo y no se importó.`
      );
      return [];
    }
    seenTeamIds.add(id);
    const team = {
      id,
      externalId,
      name: name || `Equipo ${index + 1}`,
      shortName: text(row.abreviatura || row.siglas).slice(0, 5).toUpperCase(),
      clubName: text(row.club),
      city: text(row.ciudad),
      arena: text(row.pabellon),
      category: "Primera División Masculina GESA",
      season: "2026/27",
      country: "España",
      primaryColor: color(row.color_principal, "#2DD4BF"),
      secondaryColor: color(row.color_secundario, "#0F766E"),
      groupName: text(row.grupo),
      players: []
    };
    if (externalId) teamByCode.set(externalId.toLowerCase(), team);
    teamByCode.set(name.toLowerCase(), team);
    return [team];
  });

  playerRows.forEach((row, index) => {
    const teamCode = text(row.codigo_equipo || row.equipo).toLowerCase();
    const team = teamByCode.get(teamCode);
    if (!team) {
      warnings.push(
        `Jugadores: no se encontró el equipo "${text(row.codigo_equipo || row.equipo)}" de la fila ${index + 2}.`
      );
      return;
    }
    const name = text(row.nombre || row.jugador);
    if (!name) {
      warnings.push(`Jugadores: la fila ${index + 2} no tiene nombre.`);
      return;
    }
    const externalId = text(row.codigo_jugador || row.codigo);
    if (!externalId) {
      warnings.push(
        `Jugadores: "${name}" no tiene código estable en la fila ${index + 2}.`
      );
    }
    const id = deterministicId("player", externalId || `${team.id}:${name}`);
    if (seenPlayerIds.has(id)) {
      warnings.push(
        `Jugadores: la fila ${index + 2} repite el código de otro jugador y no se importó.`
      );
      return;
    }
    seenPlayerIds.add(id);
    team.players.push({
      id,
      externalId,
      number: text(row.dorsal),
      name,
      position: text(row.posicion),
      height: text(row.altura_cm || row.altura),
      nationality: text(row.nacionalidad),
      status: text(row.estado) || "Activo",
      photo: ""
    });
  });

  const matches = matchRows.flatMap((row, index) => {
    const homeCode = text(row.codigo_local || row.local).toLowerCase();
    const awayCode = text(row.codigo_visitante || row.visitante).toLowerCase();
    const home = teamByCode.get(homeCode);
    const away = teamByCode.get(awayCode);
    if (!home || !away || home.id === away.id) {
      warnings.push(
        `Partidos: revisa los equipos local y visitante de la fila ${index + 2}.`
      );
      return [];
    }
    const externalId = text(row.codigo_partido || row.codigo);
    if (!externalId) {
      warnings.push(
        `Partidos: la fila ${index + 2} no tiene un código estable.`
      );
    }
    const homeScore =
      text(row.puntos_local || row.resultado_local) === ""
        ? null
        : Number(row.puntos_local || row.resultado_local);
    const awayScore =
      text(row.puntos_visitante || row.resultado_visitante) === ""
        ? null
        : Number(row.puntos_visitante || row.resultado_visitante);
    const id = deterministicId(
        "match",
        externalId ||
          `${home.id}:${away.id}:${excelDate(row.fecha)}:${text(row.jornada)}`
      );
    if (seenMatchIds.has(id)) {
      warnings.push(
        `Partidos: la fila ${index + 2} repite el código de otro partido y no se importó.`
      );
      return [];
    }
    seenMatchIds.add(id);
    return [{
      id,
      externalId,
      roundName: text(row.jornada),
      scheduledAt: scheduledAt(row.fecha, row.hora),
      venue: text(row.pabellon),
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: Number.isFinite(homeScore) ? homeScore : null,
      awayScore: Number.isFinite(awayScore) ? awayScore : null,
      status:
        Number.isFinite(homeScore) && Number.isFinite(awayScore)
          ? "finished"
          : "scheduled"
    }];
  });

  return {
    competitionSeasonId: PILOT_COMPETITION_SEASON_ID,
    source: "admin-import",
    teams,
    matches,
    warnings
  };
}

async function readCatalogWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  if (filePath.toLowerCase().endsWith(".csv")) {
    const worksheet = await workbook.csv.readFile(filePath);
    worksheet.name = "Equipos";
  } else {
    await workbook.xlsx.readFile(filePath);
  }
  return parseCatalogWorkbook(workbook);
}

function styleHeader(row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F766E" }
    };
    cell.alignment = { vertical: "middle" };
  });
}

async function createCatalogTemplate(filePath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ScoutAnalyzer";
  workbook.created = new Date();

  const readme = workbook.addWorksheet("LEEME", {
    views: [{ showGridLines: false }]
  });
  readme.columns = [{ width: 30 }, { width: 92 }];
  readme.addRows([
    ["Plantilla ScoutAnalyzer", "Primera División Masculina GESA FBRM · Temporada 2026/27"],
    ["Cómo utilizarla", "Completa primero Equipos, después Jugadores y finalmente Partidos. No cambies los nombres de las columnas."],
    ["Códigos", "Usa un código único y estable para cada equipo, jugador y partido. Puede ser el identificador proporcionado por la Federación o uno creado por ti."],
    ["Fechas", "Formato recomendado: AAAA-MM-DD. La hora se escribe como HH:MM."],
    ["Privacidad", "No incluyas correos, teléfonos ni información personal que no sea necesaria para el análisis deportivo."],
    ["Logos y fotos", "Se incorporarán desde las fichas de ScoutAnalyzer; esta plantilla no copia imágenes de terceros."]
  ]);
  readme.getCell("A1").font = { bold: true, size: 18, color: { argb: "FF172033" } };
  readme.getCell("B1").font = { bold: true, size: 14, color: { argb: "FF0F766E" } };
  readme.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });

  const teams = workbook.addWorksheet("Equipos", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }]
  });
  teams.columns = [
    { header: "codigo", width: 18 },
    { header: "nombre", width: 34 },
    { header: "abreviatura", width: 14 },
    { header: "club", width: 30 },
    { header: "grupo", width: 16 },
    { header: "ciudad", width: 22 },
    { header: "pabellon", width: 30 },
    { header: "color_principal", width: 19 },
    { header: "color_secundario", width: 19 }
  ];
  styleHeader(teams.getRow(1));
  teams.addRow([
    "EQUIPO-01",
    "Equipo de ejemplo",
    "E01",
    "Club de ejemplo",
    "",
    "Murcia",
    "Pabellón",
    "#2DD4BF",
    "#0F766E"
  ]);
  teams.autoFilter = { from: "A1", to: "I1" };

  const players = workbook.addWorksheet("Jugadores", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }]
  });
  players.columns = [
    { header: "codigo_equipo", width: 18 },
    { header: "codigo_jugador", width: 20 },
    { header: "dorsal", width: 11 },
    { header: "nombre", width: 32 },
    { header: "posicion", width: 18 },
    { header: "altura_cm", width: 14 },
    { header: "nacionalidad", width: 18 },
    { header: "estado", width: 14 }
  ];
  styleHeader(players.getRow(1));
  players.addRow([
    "EQUIPO-01",
    "JUGADOR-01",
    "7",
    "Jugador de ejemplo",
    "Base",
    185,
    "España",
    "Activo"
  ]);
  players.autoFilter = { from: "A1", to: "H1" };

  const matches = workbook.addWorksheet("Partidos", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }]
  });
  matches.columns = [
    { header: "codigo_partido", width: 20 },
    { header: "jornada", width: 15 },
    { header: "fecha", width: 15 },
    { header: "hora", width: 12 },
    { header: "codigo_local", width: 18 },
    { header: "codigo_visitante", width: 20 },
    { header: "pabellon", width: 30 },
    { header: "puntos_local", width: 16 },
    { header: "puntos_visitante", width: 19 }
  ];
  styleHeader(matches.getRow(1));
  matches.addRow([
    "PARTIDO-01",
    "Jornada 1",
    "2026-09-20",
    "18:00",
    "EQUIPO-01",
    "EQUIPO-02",
    "",
    "",
    ""
  ]);
  matches.autoFilter = { from: "A1", to: "I1" };

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

module.exports = {
  createCatalogTemplate,
  excelDate,
  normalizeHeader,
  parseCatalogWorkbook,
  readCatalogWorkbook,
  scheduledAt,
  worksheetRows
};
