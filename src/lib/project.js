import { defaultTags, defaultTeams } from "./defaults.js";
import { enrichTeam } from "./roster.js";
import { shotZoneById } from "./shotZones.js";
import { eventMetric } from "./basketball.js";

function migrateBasketballTags(tags = []) {
  const requiredShotIds = new Set([
    "tag-shot-made-2",
    "tag-shot-missed-2",
    "tag-shot-made-3",
    "tag-shot-missed-3",
  ]);
  const withoutLegacy = tags.filter(
    (tag) => tag.id !== "tag-shot-made" && tag.id !== "tag-shot-missed",
  );
  const byId = new Map(withoutLegacy.map((tag) => [tag.id, tag]));
  const shotTags = defaultTags
    .filter((tag) => requiredShotIds.has(tag.id))
    .map((tag) => byId.get(tag.id) || tag);
  const remaining = withoutLegacy.filter((tag) => !requiredShotIds.has(tag.id));
  return [...shotTags, ...remaining];
}

export function migrateProject(project) {
  if (
    !project ||
    typeof project !== "object" ||
    !Array.isArray(project.events) ||
    !Array.isArray(project.template?.tags)
  )
    throw new Error("Este archivo no es un análisis válido de Tactovia.");
  if (Number(project.version) > 11)
    throw new Error(
      "Este análisis requiere una versión más reciente de Tactovia.",
    );
  if (
    project.template.tags.some(
      (tag) =>
        !tag ||
        typeof tag.id !== "string" ||
        typeof tag.name !== "string" ||
        !tag.name.trim(),
    ) ||
    new Set(project.template.tags.map((tag) => tag.id)).size !==
      project.template.tags.length
  )
    throw new Error("La plantilla contiene etiquetas no válidas o duplicadas.");
  if (project.events.length > 200000)
    throw new Error("El archivo supera el límite de acciones admitido.");
  if (
    project.events.some(
      (event) =>
        !event ||
        typeof event !== "object" ||
        !Number.isFinite(Number(event.start)) ||
        !Number.isFinite(Number(event.end)) ||
        Number(event.start) < 0 ||
        Number(event.end) <= Number(event.start),
    )
  )
    throw new Error("El archivo contiene acciones con tiempos no válidos.");
  if (
    new Set(project.events.map((event) => event.id)).size !==
      project.events.length ||
    project.events.some((event) => !event.id)
  )
    throw new Error("El archivo contiene acciones sin identidad o duplicadas.");
  const projectData = Object.fromEntries(
    Object.entries(project).filter(([key]) => key !== "playbook"),
  );
  const teams =
    Array.isArray(project.teams) && project.teams.length > 0
      ? project.teams.map(enrichTeam)
      : defaultTeams.map(enrichTeam);
  const validMatch =
    project.match &&
    project.match.homeTeamId !== project.match.awayTeamId &&
    teams.some((team) => team.id === project.match.homeTeamId) &&
    teams.some((team) => team.id === project.match.awayTeamId)
      ? project.match
      : null;
  return {
    ...projectData,
    version: 11,
    analysisNotes: String(project.analysisNotes || ""),
    playlists: (Array.isArray(project.playlists) ? project.playlists : [])
      .filter((p) => p && p.id && Array.isArray(p.eventIds))
      .map((p) => ({
        id: String(p.id),
        name: String(p.name || "Lista"),
        eventIds: [...new Set(p.eventIds)].filter((id) =>
          project.events.some((e) => e.id === id),
        ),
      })),
    teams,
    match: validMatch,
    competitions: Array.isArray(project.competitions)
      ? project.competitions
      : [],
    libraryFolders: Array.isArray(project.libraryFolders)
      ? project.libraryFolders
      : [],
    freeAgents: Array.isArray(project.freeAgents) ? project.freeAgents : [],
    template: {
      ...(project.template || {}),
      tags: migrateBasketballTags(project.template?.tags || defaultTags),
    },
    events: (project.events || []).map((event) => {
      const { outcome, ...rest } = event;
      const zonePoints =
        shotZoneById(event.shotZoneId)?.points || Number(event.shotPoints) || 2;
      const migratedTagId =
        event.tagId === "tag-shot-made"
          ? zonePoints === 3
            ? "tag-shot-made-3"
            : "tag-shot-made-2"
          : event.tagId === "tag-shot-missed"
            ? zonePoints === 3
              ? "tag-shot-missed-3"
              : "tag-shot-missed-2"
            : event.tagId;
      const migratedTagName =
        event.tagId === "tag-shot-made" || event.tagName === "Canasta"
          ? `Canasta de ${zonePoints}P`
          : event.tagId === "tag-shot-missed" ||
              event.tagName === "Tiro fallado"
            ? `Tiro fallado de ${zonePoints}P`
            : event.tagName;
      return {
        ...rest,
        start: Number(event.start),
        end: Number(event.end),
        anchor: Math.min(
          Number(event.end),
          Math.max(
            Number(event.start),
            Number(event.anchor) || Number(event.start),
          ),
        ),
        period: String(event.period || ""),
        favorite: Boolean(event.favorite),
        metric:
          event.metric ||
          eventMetric({
            ...event,
            tagId: migratedTagId,
            tagName: migratedTagName,
          }),
        teamId:
          event.teamId ||
          (event.team === "Rival"
            ? "team-rival"
            : event.team
              ? "team-own"
              : ""),
        playerId: event.playerId || "",
        notes: event.notes || outcome || "",
        tagId: migratedTagId,
        tagName: migratedTagName,
        shotZoneId: event.shotZoneId || "",
        shotZoneName: event.shotZoneName || "",
        shotPoints: Number(event.shotPoints) || 0,
      };
    }),
  };
}
