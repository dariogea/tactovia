import { boxScore, coveredSeconds, eventMetric } from "./basketball.js";
import { zoneStats } from "./shotZones.js";

export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(Number(value) || 0, minimum), maximum);
}

export function formatTime(seconds, includeTenths = false) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const wholeSeconds = Math.floor(safe % 60);
  const tenths = Math.floor((safe % 1) * 10);
  const hourPart = hours > 0 ? `${String(hours).padStart(2, "0")}:` : "";
  const value = `${hourPart}${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}`;
  return includeTenths ? `${value}.${tenths}` : value;
}

export function createPointEvent(
  tag,
  currentTime,
  videoDuration,
  context = {},
) {
  const anchor = clamp(
    currentTime,
    0,
    videoDuration || Number.MAX_SAFE_INTEGER,
  );
  const endLimit = videoDuration > 0 ? videoDuration : Number.MAX_SAFE_INTEGER;
  const start = Math.min(
    Math.max(0, endLimit - 0.1),
    Math.max(0, anchor - Math.max(0, Number(tag.before) || 0)),
  );
  const end = Math.min(
    endLimit,
    anchor + Math.max(0.1, Number(tag.after) || 0),
  );

  return {
    id: crypto.randomUUID(),
    tagId: tag.id,
    tagName: tag.name,
    color: tag.color,
    mode: "point",
    anchor,
    start,
    end: Math.max(start + 0.1, end),
    teamId: context.teamId || "",
    playerId: context.playerId || "",
    team: context.teamName || context.team || "",
    player: context.playerName || context.player || "",
    notes: context.notes || "",
    shotZoneId: context.shotZoneId || "",
    shotZoneName: context.shotZoneName || "",
    shotPoints: Number(context.shotPoints) || 0,
    metric: context.metric || eventMetric(tag),
    period: context.period || "",
    favorite: false,
    createdAt: new Date().toISOString(),
  };
}

export function createIntervalEvent(
  tag,
  intervalStart,
  intervalEnd,
  videoDuration,
  context = {},
) {
  const rawStart = Math.min(intervalStart, intervalEnd);
  const rawEnd = Math.max(intervalStart, intervalEnd);
  const start = clamp(
    rawStart - Math.max(0, Number(tag.before) || 0),
    0,
    Math.max(0, (videoDuration || Number.MAX_SAFE_INTEGER) - 0.1),
  );
  const end = clamp(
    rawEnd + Math.max(0, Number(tag.after) || 0),
    start + 0.1,
    videoDuration || Number.MAX_SAFE_INTEGER,
  );

  return {
    id: crypto.randomUUID(),
    tagId: tag.id,
    tagName: tag.name,
    color: tag.color,
    mode: "interval",
    anchor: clamp(intervalStart, start, end),
    start,
    end,
    teamId: context.teamId || "",
    playerId: context.playerId || "",
    team: context.teamName || context.team || "",
    player: context.playerName || context.player || "",
    notes: context.notes || "",
    shotZoneId: context.shotZoneId || "",
    shotZoneName: context.shotZoneName || "",
    shotPoints: Number(context.shotPoints) || 0,
    metric: context.metric || eventMetric(tag),
    period: context.period || "",
    favorite: false,
    createdAt: new Date().toISOString(),
  };
}

export function statisticsFor(tags, events) {
  const labels = new Map(tags.map((tag) => [tag.id, tag]));
  const rows = new Map();
  for (const event of events) {
    const tag = labels.get(event.tagId);
    const row = rows.get(event.tagId) || {
      id: event.tagId,
      name: tag?.name || event.tagName || "Sin etiqueta",
      color: tag?.color || event.color || "#748691",
      count: 0,
      duration: 0,
    };
    row.count++;
    row.duration += Math.max(0, Number(event.end) - Number(event.start)) || 0;
    rows.set(event.tagId, row);
  }
  return [...rows.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"),
  );
}

function csvCell(value) {
  const raw = String(value ?? "");
  const text = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replaceAll('"', '""')}"`;
}

export function projectToCsv(project) {
  const header = [
    "Inicio",
    "Fin",
    "Duración",
    "Etiqueta",
    "Tipo",
    "ID equipo",
    "Equipo",
    "ID jugador",
    "Jugador",
    "Zona de pista",
    "Notas",
    "Periodo",
    "Destacada",
  ];
  const rows = project.events
    .slice()
    .sort((left, right) => left.start - right.start)
    .map((event) => [
      formatTime(event.start, true),
      formatTime(event.end, true),
      (event.end - event.start).toFixed(2),
      event.tagName,
      event.mode === "interval" ? "Intervalo" : "Instante",
      event.teamId,
      event.team,
      event.playerId,
      event.player,
      event.shotZoneName || event.shotZoneId || "",
      event.notes,
      event.period || "",
      event.favorite ? "Sí" : "No",
    ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function reportPayload(project, options = {}) {
  const stats = statisticsFor(project.template.tags, project.events);
  const players = project.teams
    .flatMap((team) =>
      (team.players || []).map((player) => {
        const events = project.events.filter(
          (event) => event.playerId === player.id,
        );
        return {
          id: player.id,
          name: player.name,
          number: player.number || "",
          team: team.name,
          count: events.length,
          shots: boxScore(events).fga,
        };
      }),
    )
    .filter((player) => player.count > 0)
    .sort((left, right) => right.count - left.count);
  return {
    projectName: project.projectName,
    analysisNotes: project.analysisNotes || "",
    boxScore: boxScore(project.events),
    videoName: project.video?.name || "",
    generatedAt: new Intl.DateTimeFormat("es-ES", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date()),
    totalEvents: project.events.length,
    totalTags: stats.length,
    analyzedTime: formatTime(coveredSeconds(project.events)),
    options,
    automaticAnalysis: options.automaticAnalysis || null,
    stats: stats.map((row) => ({
      ...row,
      duration: formatTime(row.duration),
    })),
    shotZones: zoneStats(project.events),
    players,
    events: project.events
      .slice()
      .sort((left, right) => left.start - right.start)
      .map((event) => ({
        time: `${formatTime(event.start)} – ${formatTime(event.end)}`,
        tag: event.tagName,
        team: event.team,
        player: event.player,
        shotZone: event.shotZoneName || event.shotZoneId || "",
        notes: options.notes === false ? "" : event.notes || "",
      })),
  };
}
