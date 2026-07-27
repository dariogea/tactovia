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

export function createPointEvent(tag, currentTime, videoDuration, context = {}) {
  const anchor = clamp(currentTime, 0, videoDuration || Number.MAX_SAFE_INTEGER);
  const start = Math.max(0, anchor - Math.max(0, Number(tag.before) || 0));
  const endLimit = videoDuration > 0 ? videoDuration : Number.MAX_SAFE_INTEGER;
  const end = Math.min(
    endLimit,
    anchor + Math.max(0.1, Number(tag.after) || 0)
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
    createdAt: new Date().toISOString()
  };
}

export function createIntervalEvent(
  tag,
  intervalStart,
  intervalEnd,
  videoDuration,
  context = {}
) {
  const rawStart = Math.min(intervalStart, intervalEnd);
  const rawEnd = Math.max(intervalStart, intervalEnd);
  const start = clamp(
    rawStart - Math.max(0, Number(tag.before) || 0),
    0,
    videoDuration || Number.MAX_SAFE_INTEGER
  );
  const end = clamp(
    rawEnd + Math.max(0, Number(tag.after) || 0),
    start + 0.1,
    videoDuration || Number.MAX_SAFE_INTEGER
  );

  return {
    id: crypto.randomUUID(),
    tagId: tag.id,
    tagName: tag.name,
    color: tag.color,
    mode: "interval",
    anchor: intervalStart,
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
    createdAt: new Date().toISOString()
  };
}

export function statisticsFor(tags, events) {
  return tags
    .map((tag) => {
      const matching = events.filter((event) => event.tagId === tag.id);
      return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        count: matching.length,
        duration: matching.reduce(
          (total, event) => total + Math.max(0, event.end - event.start),
          0
        )
      };
    })
    .filter((row) => row.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function csvCell(value) {
  const text = String(value ?? "");
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
    "Notas"
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
      event.notes
    ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function reportPayload(project) {
  const stats = statisticsFor(project.template.tags, project.events);
  return {
    projectName: project.projectName,
    videoName: project.video?.name || "",
    generatedAt: new Intl.DateTimeFormat("es-ES", {
      dateStyle: "long",
      timeStyle: "short"
    }).format(new Date()),
    totalEvents: project.events.length,
    totalTags: stats.length,
    analyzedTime: formatTime(project.video?.duration || 0),
    stats: stats.map((row) => ({
      ...row,
      duration: formatTime(row.duration)
    })),
    events: project.events
      .slice()
      .sort((left, right) => left.start - right.start)
      .map((event) => ({
        time: `${formatTime(event.start)} – ${formatTime(event.end)}`,
        tag: event.tagName,
        team: event.team,
        player: event.player,
        shotZone: event.shotZoneName || event.shotZoneId || "",
        notes: event.notes || ""
      }))
  };
}
