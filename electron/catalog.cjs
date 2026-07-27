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
  const competitionRows = worksheetRows(workbook.getWorksheet("Competicion"));
  const teamRows = worksheetRows(
    workbook.getWorksheet("Equipos") || workbook.worksheets[0]
  );
  const playerRows = worksheetRows(workbook.getWorksheet("Jugadores"));
  const rosterChangeRows = worksheetRows(
    workbook.getWorksheet("CambiosPlantilla")
  );
  const matchRows = worksheetRows(workbook.getWorksheet("Partidos"));
  const warnings = [];
  const teamByCode = new Map();
  const playerByCode = new Map();
  const importCompetitionName =
    text(competitionRows[0]?.nombre) || "Primera División Masculina GESA";
  const importSeasonLabel = text(competitionRows[0]?.temporada) || "2026/27";
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
      category: importCompetitionName,
      season: importSeasonLabel,
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
    if (externalId) {
      playerByCode.set(externalId.toLowerCase(), {
        id,
        teamId: team.id,
        externalId
      });
    }
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

  const competitionRow = competitionRows[0] || null;
  const competitionExternalId = text(
    competitionRow?.codigo || competitionRow?.codigo_competicion
  );
  const competitionName = text(competitionRow?.nombre);
  const seasonLabel = importSeasonLabel;
  const competitionId = competitionRow
    ? deterministicId(
        "competition",
        competitionExternalId || competitionName || "competition-import"
      )
    : null;
  const seasonId = competitionRow
    ? deterministicId("season", seasonLabel)
    : null;
  const competitionSeasonId = competitionRow
    ? deterministicId("competition-season", `${competitionId}:${seasonId}`)
    : PILOT_COMPETITION_SEASON_ID;
  const competition = competitionRow
    ? {
        id: competitionId,
        externalId: competitionExternalId,
        name: competitionName || "Competición importada",
        shortName: text(competitionRow.abreviatura).slice(0, 14),
        governingBody: text(competitionRow.federacion),
        country: text(competitionRow.pais) || "España",
        region: text(competitionRow.region),
        level: text(competitionRow.nivel),
        gender: text(competitionRow.genero),
        season: {
          id: seasonId,
          label: seasonLabel,
          startsOn: excelDate(competitionRow.fecha_inicio) || null,
          endsOn: excelDate(competitionRow.fecha_fin) || null,
          isCurrent:
            !["no", "0", "false"].includes(
              text(competitionRow.temporada_actual).toLowerCase()
            )
        },
        competitionSeason: {
          id: competitionSeasonId,
          name: `${competitionName || "Competición importada"} ${seasonLabel}`,
          format: text(competitionRow.formato),
          status:
            ["planned", "active", "finished", "archived"].includes(
              text(competitionRow.estado).toLowerCase()
            )
              ? text(competitionRow.estado).toLowerCase()
              : "active"
        }
      }
    : null;

  const rosterChanges = rosterChangeRows.flatMap((row, index) => {
    const teamCode = text(row.codigo_equipo || row.equipo).toLowerCase();
    const playerCode = text(row.codigo_jugador || row.jugador).toLowerCase();
    const team = teamByCode.get(teamCode);
    const player = playerByCode.get(playerCode);
    const action = text(row.accion).toLowerCase().replaceAll(" ", "_");
    if (!team || !player) {
      warnings.push(
        `CambiosPlantilla: revisa el equipo o jugador de la fila ${index + 2}.`
      );
      return [];
    }
    if (
      !["alta", "baja", "cambio_dorsal", "cambio_posicion", "actualizar"].includes(
        action
      )
    ) {
      warnings.push(
        `CambiosPlantilla: la acción "${text(row.accion)}" de la fila ${index + 2} no es válida.`
      );
      return [];
    }
    return [{
      teamId: team.id,
      playerId: player.id,
      action,
      number: text(row.nuevo_dorsal || row.dorsal),
      position: text(row.nueva_posicion || row.posicion),
      status: text(row.estado)
    }];
  });

  return {
    competition,
    competitionSeasonId,
    source: "admin-import",
    teams,
    matches,
    rosterChanges,
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
  workbook.creator = "Tactovia";
  workbook.created = new Date();

  const readme = workbook.addWorksheet("LEEME", {
    views: [{ showGridLines: false }]
  });
  readme.columns = [{ width: 30 }, { width: 92 }];
  readme.addRows([
    ["Plantilla Tactovia", "Importación de competición, equipos y plantillas"],
    ["Cómo utilizarla", "Completa Competicion, Equipos y Jugadores. Usa CambiosPlantilla para altas, bajas y cambios de dorsal o posición. No cambies los nombres de las columnas."],
    ["Códigos", "Usa un código único y estable para cada competición, equipo y jugador. Puede ser el identificador de la Federación o uno creado por ti."],
    ["Fechas", "Formato recomendado: AAAA-MM-DD. La hora se escribe como HH:MM."],
    ["Privacidad", "No incluyas correos, teléfonos ni información personal que no sea necesaria para el análisis deportivo."],
    ["Logos y fotos", "Se incorporarán desde las fichas de Tactovia; esta plantilla no copia imágenes de terceros."]
  ]);
  readme.getCell("A1").font = { bold: true, size: 18, color: { argb: "FF172033" } };
  readme.getCell("B1").font = { bold: true, size: 14, color: { argb: "FF0F766E" } };
  readme.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });

  const competition = workbook.addWorksheet("Competicion", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }]
  });
  competition.columns = [
    { header: "codigo", width: 22 },
    { header: "nombre", width: 38 },
    { header: "abreviatura", width: 16 },
    { header: "federacion", width: 20 },
    { header: "temporada", width: 15 },
    { header: "fecha_inicio", width: 16 },
    { header: "fecha_fin", width: 16 },
    { header: "pais", width: 16 },
    { header: "region", width: 24 },
    { header: "nivel", width: 22 },
    { header: "genero", width: 16 },
    { header: "formato", width: 24 },
    { header: "estado", width: 14 },
    { header: "temporada_actual", width: 19 }
  ];
  styleHeader(competition.getRow(1));
  competition.addRow([
    "FBRM-1DM",
    "Primera División Masculina GESA",
    "1DM GESA",
    "FBRM",
    "2026/27",
    "2026-07-01",
    "2027-06-30",
    "España",
    "Región de Murcia",
    "Regional sénior",
    "Masculina",
    "Liga regular",
    "active",
    "sí"
  ]);
  competition.autoFilter = { from: "A1", to: "N1" };

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

  const rosterChanges = workbook.addWorksheet("CambiosPlantilla", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }]
  });
  rosterChanges.columns = [
    { header: "codigo_equipo", width: 20 },
    { header: "codigo_jugador", width: 22 },
    { header: "accion", width: 20 },
    { header: "nuevo_dorsal", width: 18 },
    { header: "nueva_posicion", width: 20 },
    { header: "estado", width: 16 }
  ];
  styleHeader(rosterChanges.getRow(1));
  rosterChanges.addRow([
    "EQUIPO-01",
    "JUGADOR-01",
    "cambio_dorsal",
    "12",
    "",
    "Activo"
  ]);
  rosterChanges.autoFilter = { from: "A1", to: "F1" };

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
