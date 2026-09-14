import { enrichTeam } from "./roster.js";

const collections = ["teams", "competitions", "freeAgents", "libraryFolders"];
export function validateLibrary(value) {
  if (!value || value.kind !== "tactovia-library" || value.version !== 1)
    throw new Error("Selecciona una biblioteca de Tactovia (.library.json).");
  for (const key of collections) {
    if (!Array.isArray(value[key]) || value[key].length > 10000)
      throw new Error("La biblioteca contiene una colección no válida.");
    if (
      value[key].some(
        (row) =>
          !row ||
          typeof row.id !== "string" ||
          !row.id.trim() ||
          typeof row.name !== "string" ||
          !row.name.trim(),
      )
    )
      throw new Error(
        "Todos los registros deben tener un identificador y un nombre.",
      );
    if (new Set(value[key].map((row) => row.id)).size !== value[key].length)
      throw new Error("Hay identificadores repetidos en la biblioteca.");
  }
  const playerIds = new Set();
  for (const team of value.teams) {
    if (!Array.isArray(team.players) || team.players.length > 1000)
      throw new Error("Una plantilla contiene datos no válidos.");
    for (const player of team.players) {
      if (!player?.id || !player.name || playerIds.has(player.id))
        throw new Error(
          "Hay jugadores sin identificar o duplicados entre equipos.",
        );
      playerIds.add(player.id);
    }
  }
  for (const player of value.freeAgents) {
    if (playerIds.has(player.id))
      throw new Error("Un agente libre ya figura en una plantilla.");
  }
  return Object.fromEntries(
    collections.map((key) => [
      key,
      key === "teams" ? value.teams.map(enrichTeam) : value[key],
    ]),
  );
}

export function mergeLibrary(current, incoming) {
  const next = Object.fromEntries(
    collections.map((key) => [
      key,
      [
        ...new Map(
          [...(current[key] || []), ...(incoming[key] || [])].map((row) => [
            row.id,
            row,
          ]),
        ).values(),
      ],
    ]),
  );
  // Imported rosters take precedence for transfers. A player belongs to one roster.
  const destinations = new Map(
    incoming.teams.flatMap((team) =>
      team.players.map((player) => [player.id, team.id]),
    ),
  );
  const incomingFree = new Set(incoming.freeAgents.map((player) => player.id));
  next.teams = next.teams.map((team) => ({
    ...team,
    players: team.players.filter(
      (player) =>
        !incomingFree.has(player.id) &&
        (!destinations.has(player.id) ||
          destinations.get(player.id) === team.id),
    ),
  }));
  const assigned = new Set(
    next.teams.flatMap((team) => team.players.map((player) => player.id)),
  );
  next.freeAgents = next.freeAgents.filter(
    (player) => !assigned.has(player.id),
  );
  return next;
}

export function libraryDocument(library) {
  return {
    kind: "tactovia-library",
    version: 1,
    exportedAt: new Date().toISOString(),
    ...Object.fromEntries(collections.map((key) => [key, library[key] || []])),
  };
}
