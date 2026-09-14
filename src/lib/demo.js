import { createBlankProject, defaultTags } from "./defaults.js";
import { enrichTeam } from "./roster.js";
import { eventMetric } from "./basketball.js";
export function createExampleProject() {
  const names = [
    ["Álex Molina", "Hugo Vidal", "Leo Serrano", "Nico Ríos", "Dani Soler"],
    ["Pablo Torres", "Diego Martín", "Iván Costa", "Mario León", "Adrián Gil"],
  ];
  const teams = ["Costa Basket", "Sierra Club"].map((name, i) =>
    enrichTeam({
      id: `example-team-${i}`,
      name,
      shortName: i ? "SIE" : "COS",
      primaryColor: i ? "#dd884a" : "#168b7b",
      secondaryColor: "#ffffff",
      players: names[i].map((name, j) => ({
        id: `example-player-${i}-${j}`,
        name,
        number: String(j + 4),
        position: ["Base", "Escolta", "Alero", "Ala-pívot", "Pívot"][j],
      })),
    }),
  );
  const project = createBlankProject(teams);
  project.projectName = "Costa Basket · Sierra Club (ejemplo)";
  project.match = {
    homeTeamId: teams[0].id,
    awayTeamId: teams[1].id,
    homeRosterIds: teams[0].players.map((p) => p.id),
    awayRosterIds: teams[1].players.map((p) => p.id),
  };
  project.analysisNotes =
    "Ejemplo ficticio. Observar la selección de tiro y revisar las pérdidas antes del descanso.";
  project.events = Array.from({ length: 64 }, (_, i) => {
    const team = teams[i % 2],
      player = team.players[Math.floor(i / 2) % 5];
    const tag = defaultTags[(i * 7 + (i % 3)) % 8];
    const metric = eventMetric(tag),
      shot = /^(made|missed)[23]$/.test(metric),
      points = shot ? Number(metric.at(-1)) : 0;
    return {
      id: crypto.randomUUID(),
      tagId: tag.id,
      tagName: tag.name,
      color: tag.color,
      metric,
      mode: "point",
      anchor: i * 34 + 5,
      start: i * 34,
      end: i * 34 + 9,
      teamId: team.id,
      team: team.name,
      playerId: player.id,
      player: `#${player.number} ${player.name}`,
      period: String(Math.floor(i / 16) + 1),
      notes: i % 9 === 0 ? "Revisar con el cuerpo técnico" : "",
      shotPoints: points,
      shotZoneId: shot ? (points === 3 ? "top" : "paint") : "",
      shotZoneName: shot ? (points === 3 ? "Triple frontal" : "Pintura") : "",
      favorite: i % 9 === 0,
      createdAt: new Date().toISOString(),
    };
  });
  project.playlists = [
    {
      id: crypto.randomUUID(),
      name: "Para la sesión de vídeo",
      eventIds: project.events.filter((e) => e.favorite).map((e) => e.id),
    },
  ];
  return project;
}
