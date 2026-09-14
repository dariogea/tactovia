import { boxScore, eventMetric } from "./basketball.js";
import { zoneStats } from "./shotZones.js";

function normalized(value) {
  return String(value || "").toLocaleLowerCase("es");
}

function isMadeShot(event) {
  return /^made[23]$/.test(eventMetric(event));
}
function isMissedShot(event) {
  return /^missed[23]$/.test(eventMetric(event));
}

function hasConcept(event, ids, words) {
  const metric = eventMetric(event);
  if (metric !== "custom")
    return ids.some((id) => eventMetric({ tagId: id }) === metric);
  if (event.metric === "custom") return false;
  return (
    ids.includes(event.tagId) ||
    words.some((word) => normalized(event.tagName).includes(word))
  );
}

function percentage(value, total) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function teamMetrics(team, events) {
  const own = events.filter((event) => event.teamId === team.id);
  const made = own.filter(isMadeShot);
  const missed = own.filter(isMissedShot);
  const shots = [...made, ...missed];
  const turnovers = own.filter((event) =>
    hasConcept(event, ["tag-turnover"], ["pérdida", "perdida"]),
  ).length;
  const steals = own.filter((event) =>
    hasConcept(event, ["tag-steal"], ["recuperación", "recuperacion", "robo"]),
  ).length;
  const offensiveRebounds = own.filter((event) =>
    hasConcept(event, ["tag-off-rebound"], ["rebote ofensivo"]),
  ).length;
  const defensiveRebounds = own.filter((event) =>
    hasConcept(event, ["tag-def-rebound"], ["rebote defensivo"]),
  ).length;
  const score = boxScore(own).points;
  const zones = zoneStats(own).filter((zone) => zone.attempts > 0);
  const bestZone = zones
    .slice()
    .sort(
      (left, right) =>
        right.percentage - left.percentage || right.attempts - left.attempts,
    )[0];
  const busiestZone = zones
    .slice()
    .sort(
      (left, right) =>
        right.attempts - left.attempts || right.percentage - left.percentage,
    )[0];
  const players = (team.players || [])
    .map((player) => {
      const playerEvents = own.filter((event) => event.playerId === player.id);
      const playerMade = playerEvents.filter(isMadeShot).length;
      const playerShots = playerEvents.filter(
        (event) => isMadeShot(event) || isMissedShot(event),
      ).length;
      return {
        id: player.id,
        name: player.name,
        number: player.number || "",
        actions: playerEvents.length,
        made: playerMade,
        shots: playerShots,
        shootingPercentage: percentage(playerMade, playerShots),
        turnovers: playerEvents.filter((event) =>
          hasConcept(event, ["tag-turnover"], ["pérdida", "perdida"]),
        ).length,
        rebounds: playerEvents.filter((event) =>
          hasConcept(event, ["tag-off-rebound", "tag-def-rebound"], ["rebote"]),
        ).length,
      };
    })
    .filter((player) => player.actions > 0)
    .sort(
      (left, right) => right.actions - left.actions || right.made - left.made,
    );

  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName || "",
    color: team.primaryColor || "#08756D",
    actions: own.length,
    score,
    made: made.length,
    shots: shots.length,
    shootingPercentage: percentage(made.length, shots.length),
    turnovers,
    steals,
    offensiveRebounds,
    defensiveRebounds,
    bestZone,
    busiestZone,
    players,
  };
}

function buildTeamConclusions(metrics) {
  const conclusions = [];
  if (metrics.shots > 0) {
    conclusions.push(
      `${metrics.name} registra ${metrics.made}/${metrics.shots} en tiros (${metrics.shootingPercentage}%) y ${metrics.score} puntos etiquetados.`,
    );
  }
  if (metrics.busiestZone) {
    conclusions.push(
      `La mayor concentración de lanzamientos aparece en ${metrics.busiestZone.name}: ${metrics.busiestZone.attempts} intentos y ${metrics.busiestZone.percentage}% de acierto.`,
    );
  }
  if (metrics.turnovers || metrics.steals) {
    conclusions.push(
      `El balance de balón etiquetado es de ${metrics.steals} recuperaciones y ${metrics.turnovers} pérdidas.`,
    );
  }
  if (metrics.offensiveRebounds || metrics.defensiveRebounds) {
    conclusions.push(
      `En rebote constan ${metrics.offensiveRebounds} ofensivos y ${metrics.defensiveRebounds} defensivos.`,
    );
  }
  if (metrics.players[0]) {
    conclusions.push(
      `${metrics.players[0].name} es el jugador con más actividad etiquetada (${metrics.players[0].actions} acciones).`,
    );
  }
  if (conclusions.length === 0) {
    conclusions.push(
      `${metrics.name} tiene ${metrics.actions} acciones etiquetadas, todavía sin volumen suficiente para conclusiones específicas.`,
    );
  }
  return conclusions;
}

function buildPlayerConclusion(player) {
  const parts = [`${player.actions} acciones`];
  if (player.shots)
    parts.push(
      `${player.made}/${player.shots} en tiros (${player.shootingPercentage}%)`,
    );
  if (player.rebounds) parts.push(`${player.rebounds} rebotes`);
  if (player.turnovers) parts.push(`${player.turnovers} pérdidas`);
  return `${player.name}: ${parts.join(" · ")}.`;
}

export function buildAutomaticAnalysis(project) {
  const matchTeamIds = [
    project.match?.homeTeamId,
    project.match?.awayTeamId,
  ].filter(Boolean);
  const teams = matchTeamIds
    .map((id) => project.teams.find((team) => team.id === id))
    .filter(Boolean)
    .map((team) => teamMetrics(team, project.events || []))
    .map((metrics) => ({
      ...metrics,
      conclusions: buildTeamConclusions(metrics),
    }));
  const total = (project.events || []).length;
  const withTeam = project.events.filter((event) => event.teamId).length;
  const withPlayer = project.events.filter((event) => event.playerId).length;
  const shots = project.events.filter(
    (event) => isMadeShot(event) || isMissedShot(event),
  );
  const withZone = shots.filter((event) => event.shotZoneId).length;
  const players = teams
    .flatMap((team) =>
      team.players.map((player) => ({
        ...player,
        teamId: team.id,
        teamName: team.name,
        conclusion: buildPlayerConclusion(player),
      })),
    )
    .sort(
      (left, right) => right.actions - left.actions || right.made - left.made,
    );
  const dataQuality = {
    teamCoverage: percentage(withTeam, total),
    playerCoverage: percentage(withPlayer, total),
    zoneCoverage: percentage(withZone, shots.length),
    sufficient: total >= 10 && withTeam >= Math.ceil(total * 0.7),
  };

  return {
    version: 1,
    engine: "Tactovia Local Insights",
    generatedAt: new Date().toISOString(),
    totalEvents: total,
    teams,
    players,
    dataQuality,
    caveat:
      "Conclusiones generadas automáticamente a partir de las etiquetas disponibles. No sustituyen la interpretación del cuerpo técnico y pueden cambiar al corregir o añadir acciones.",
    ready: Boolean(
      teams.length === 2 && teams[0].id !== teams[1].id && total > 0,
    ),
  };
}
