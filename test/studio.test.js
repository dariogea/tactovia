import test from "node:test";
import assert from "node:assert/strict";
import {
  boxScore,
  coveredSeconds,
  filterEvents,
  eventMetric,
} from "../src/lib/basketball.js";
import { createBlankProject, defaultTags } from "../src/lib/defaults.js";
import { createExampleProject } from "../src/lib/demo.js";
import { migrateProject } from "../src/lib/project.js";
import {
  createPointEvent,
  createIntervalEvent,
  statisticsFor,
  projectToCsv,
} from "../src/lib/analysis.js";
import {
  libraryDocument,
  validateLibrary,
  mergeLibrary,
} from "../src/lib/libraryTransfer.js";

test("el box score incluye tiros sin zona y separa los libres del acierto de campo", () => {
  const box = boxScore(
    [
      "made2",
      "made3",
      "missed2",
      "missed3",
      "made1",
      "missed1",
      "assist",
      "oreb",
    ].map((metric) => ({ metric })),
  );
  assert.equal(box.points, 6);
  assert.equal(box.fga, 4);
  assert.equal(box.fg, 50);
  assert.equal(box.efg, 62.5);
  assert.equal(box.assist, 1);
  assert.equal(box.rebounds, 1);
  assert.equal(boxScore([]).fg, null);
});
test("una etiqueta personalizada conserva su significado aunque cambie de nombre", () => {
  assert.equal(
    eventMetric({ name: "Nuestra acción", metric: "made3" }),
    "made3",
  );
  assert.equal(
    eventMetric({ name: "Canasta de 3P", metric: "custom" }),
    "custom",
  );
  assert.equal(
    boxScore([{ tagId: "tag-shot-made-3", tagName: "Renombrada" }]).points,
    3,
  );
});
test("el tiempo cubierto no duplica clips solapados", () => {
  assert.equal(
    coveredSeconds([
      { start: 0, end: 10 },
      { start: 5, end: 12 },
      { start: 20, end: 25 },
      { start: 0, end: 2 },
    ]),
    17,
  );
});
test("la búsqueda combina palabras, periodo, favoritos y nombres con tilde", () => {
  const events = [
    {
      id: "a",
      player: "Álex Molina",
      teamId: "t",
      tagName: "Canasta 3P",
      notes: "Esquina",
      period: "2",
      favorite: true,
    },
    { id: "b", player: "Álex Molina", period: "1" },
  ];
  assert.deepEqual(
    filterEvents(events, {
      query: "alex esquina",
      teamId: "t",
      period: "2",
      favorites: true,
    }).map((e) => e.id),
    ["a"],
  );
  assert.equal(
    filterEvents([{ period: "" }], { period: "unassigned" }).length,
    1,
  );
});
test("guardar y migrar conserva listas, destacados, cuartos y cuaderno", () => {
  const project = createExampleProject();
  project.playbackPosition = 43;
  const restored = migrateProject(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.events.length, 64);
  assert.equal(restored.playlists[0].eventIds.length, 8);
  assert.equal(restored.events[32].period, "3");
  assert.equal(restored.events[0].favorite, true);
  assert.equal(restored.analysisNotes, project.analysisNotes);
  assert.equal(restored.playbackPosition, 43);
  assert.equal(
    boxScore(restored.events).points,
    boxScore(project.events).points,
  );
});
test("la migración detecta archivos inválidos antes de alterar el análisis", () => {
  const project = createBlankProject();
  assert.throws(() => migrateProject({}), /válido/);
  assert.throws(() => migrateProject({ ...project, version: 99 }), /reciente/);
  assert.throws(
    () =>
      migrateProject({ ...project, events: [{ id: "a", start: 10, end: 1 }] }),
    /tiempos/,
  );
  assert.throws(
    () =>
      migrateProject({
        ...project,
        events: [
          { id: "a", start: 1, end: 2 },
          { id: "a", start: 3, end: 4 },
        ],
      }),
    /duplicadas/,
  );
  assert.throws(
    () => migrateProject({ ...project, template: { tags: [null] } }),
    /etiquetas/,
  );
});
test("el clip registrado al final nunca supera el vídeo ni queda vacío", () => {
  const tag = { ...defaultTags[0], before: 0, after: 0 };
  for (const event of [
    createPointEvent(tag, 12, 12),
    createIntervalEvent(tag, 12, 12, 12),
  ]) {
    assert.ok(event.end <= 12);
    assert.ok(event.end > event.start);
    assert.ok(event.anchor <= event.end);
  }
});
test("borrar una etiqueta de la plantilla no oculta las acciones antiguas", () => {
  const stats = statisticsFor(
    [],
    [{ tagId: "old", tagName: "Antigua", start: 1, end: 3 }],
  );
  assert.equal(stats[0].count, 1);
  assert.equal(stats[0].duration, 2);
});
test("CSV neutraliza fórmulas y exporta periodo y favorito", () => {
  const project = createExampleProject();
  project.events[0].notes = "=HYPERLINK(1)";
  const csv = projectToCsv(project);
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('"Periodo"'));
  assert.ok(csv.includes('"Destacada"'));
});
test("la biblioteca se fusiona sin borrar equipos ajenos y gestiona traspasos", () => {
  const current = {
    teams: [
      { id: "a", name: "A", players: [{ id: "p", name: "Pedro" }] },
      { id: "b", name: "B", players: [] },
    ],
    competitions: [],
    freeAgents: [],
    libraryFolders: [],
  };
  const incoming = validateLibrary(
    libraryDocument({
      ...current,
      teams: [{ id: "b", name: "B", players: [{ id: "p", name: "Pedro" }] }],
    }),
  );
  const next = mergeLibrary(current, incoming);
  assert.equal(next.teams.length, 2);
  assert.equal(next.teams[0].players.length, 0);
  assert.equal(next.teams[1].players[0].id, "p");
  assert.throws(() => validateLibrary({}), /biblioteca/);
  assert.throws(
    () =>
      validateLibrary(
        libraryDocument({
          ...current,
          teams: [current.teams[0], current.teams[0]],
        }),
      ),
    /repetidos/,
  );
});
