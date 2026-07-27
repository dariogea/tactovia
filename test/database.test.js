import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  createDatabaseService,
  PILOT_COMPETITION_SEASON_ID
} = require("../electron/database.cjs");

function sampleProject() {
  const now = new Date().toISOString();
  return {
    version: 6,
    id: "analysis-test",
    projectName: "Partido de prueba",
    createdAt: now,
    updatedAt: now,
    video: {
      name: "partido.mp4",
      path: "/video/local/partido.mp4",
      duration: 120
    },
    template: { name: "Prueba", tags: [] },
    playbook: { version: 3, folders: [], plays: [] },
    teams: [
      {
        id: "home",
        name: "Murcia Local",
        shortName: "MUR",
        primaryColor: "#2DD4BF",
        secondaryColor: "#0F766E",
        players: [
          {
            id: "player-home",
            name: "Base Local",
            number: "7",
            position: "Base",
            status: "Activo"
          }
        ]
      },
      {
        id: "away",
        name: "Murcia Visitante",
        shortName: "VIS",
        primaryColor: "#F97316",
        secondaryColor: "#9A3412",
        players: []
      }
    ],
    match: {
      id: "match-test",
      competitionSeasonId: PILOT_COMPETITION_SEASON_ID,
      homeTeamId: "home",
      awayTeamId: "away",
      roundName: "Jornada 1",
      scheduledAt: "2026-09-20T18:00:00",
      status: "scheduled"
    },
    events: [
      {
        id: "event-test",
        tagId: "shot",
        tagName: "Tiro",
        color: "#ffffff",
        mode: "point",
        anchor: 20,
        start: 15,
        end: 23,
        teamId: "home",
        playerId: "player-home",
        team: "Murcia Local",
        player: "#7 Base Local",
        shotZoneId: "top",
        shotZoneName: "Triple frontal",
        shotPoints: 3,
        notes: "Esquina",
        createdAt: now
      }
    ]
  };
}

test("inicializa la competición piloto y migra un análisis completo", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scout-db-"));
  const filePath = path.join(directory, "scoutanalyzer.db");
  const service = createDatabaseService(filePath, { seedOfficialCatalog: false });

  try {
    const initial = service.snapshot();
    assert.equal(initial.competitions[0].seasonLabel, "2026/27");
    assert.equal(initial.competitions[0].governingBody, "FBRM");

    service.syncProject(sampleProject());
    const snapshot = service.snapshot();

    assert.equal(snapshot.totals.teams, 2);
    assert.equal(snapshot.totals.players, 1);
    assert.equal(snapshot.totals.matches, 1);
    assert.equal(snapshot.totals.analyses, 1);
    assert.equal(snapshot.totals.events, 1);
    assert.equal(snapshot.matches[0].homeTeamName, "Murcia Local");
    assert.equal(snapshot.matches[0].eventCount, 1);
    assert.equal(snapshot.players[0].eventCount, 1);
    assert.equal(snapshot.analyses[0].visibility, "private");
    const storedEvent = service.database
      .prepare("SELECT shot_zone_id, shot_zone_name, shot_points FROM events WHERE id = ?")
      .get("event-test");
    assert.equal(storedEvent.shot_zone_id, "top");
    assert.equal(storedEvent.shot_zone_name, "Triple frontal");
    assert.equal(storedEvent.shot_points, 3);
  } finally {
    service.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("actualiza eventos sin duplicarlos y deja la sincronización en cola", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scout-db-"));
  const service = createDatabaseService(path.join(directory, "scoutanalyzer.db"), {
    seedOfficialCatalog: false
  });

  try {
    const project = sampleProject();
    service.syncProject(project);
    service.syncProject({
      ...project,
      events: [
        ...project.events,
        {
          ...project.events[0],
          id: "event-second",
          tagName: "Rebote",
          start: 40,
          end: 45
        }
      ]
    });
    const snapshot = service.snapshot();
    assert.equal(snapshot.totals.events, 2);
    assert.equal(snapshot.totals.pendingSync, 1);
  } finally {
    service.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("importa un catálogo manteniendo identificadores estables", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scout-db-"));
  const service = createDatabaseService(path.join(directory, "scoutanalyzer.db"), {
    seedOfficialCatalog: false
  });

  try {
    const imported = service.importCatalog({
      competitionSeasonId: PILOT_COMPETITION_SEASON_ID,
      source: "admin-import",
      teams: [
        {
          id: "team-one",
          externalId: "ONE",
          name: "Equipo Uno",
          shortName: "UNO",
          primaryColor: "#123456",
          secondaryColor: "#654321",
          players: [
            {
              id: "player-one",
              externalId: "P1",
              name: "Jugador Uno",
              number: "4"
            }
          ]
        },
        {
          id: "team-two",
          externalId: "TWO",
          name: "Equipo Dos",
          shortName: "DOS",
          players: []
        }
      ],
      matches: [
        {
          id: "match-one",
          externalId: "M1",
          homeTeamId: "team-one",
          awayTeamId: "team-two",
          roundName: "Jornada 1"
        }
      ]
    });
    assert.deepEqual(
      {
        teams: imported.teams,
        players: imported.players,
        matches: imported.matches
      },
      { teams: 2, players: 1, matches: 1 }
    );
    const snapshot = service.snapshot();
    assert.equal(snapshot.totals.teams, 2);
    assert.equal(snapshot.totals.players, 1);
    assert.equal(snapshot.matches[0].roundName, "Jornada 1");
  } finally {
    service.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("separa la identidad del jugador de sus plantillas históricas", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scout-db-"));
  const service = createDatabaseService(path.join(directory, "scoutanalyzer.db"), {
    seedOfficialCatalog: false
  });

  try {
    const project = sampleProject();
    service.syncProject({
      ...project,
      match: null
    });
    service.syncProject(project);

    const snapshot = service.snapshot();
    assert.equal(snapshot.players.length, 1);
    assert.equal(snapshot.players[0].competitionSeasonId, PILOT_COMPETITION_SEASON_ID);
    assert.equal(snapshot.rosters.length, 2);
  } finally {
    service.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("crea una copia SQLite que puede volver a abrirse", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scout-db-"));
  const source = path.join(directory, "scoutanalyzer.db");
  const destination = path.join(directory, "scoutanalyzer-copia.db");
  const service = createDatabaseService(source, { seedOfficialCatalog: false });

  try {
    service.syncProject(sampleProject());
    await service.backupTo(destination);
    assert.ok(fs.statSync(destination).size > 0);

    const restored = createDatabaseService(destination, {
      seedOfficialCatalog: false
    });
    try {
      assert.equal(restored.snapshot().totals.events, 1);
    } finally {
      restored.close();
    }
  } finally {
    service.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("limpia los dos equipos vacíos creados por versiones anteriores", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scout-db-"));
  const databasePath = path.join(directory, "scoutanalyzer.db");
  const service = createDatabaseService(databasePath, {
    seedOfficialCatalog: false
  });

  try {
    service.syncProject({
      version: 6,
      id: "blank-analysis",
      projectName: "Nuevo análisis",
      video: null,
      teams: [
        { id: "team-own", name: "Mi equipo", players: [] },
        { id: "team-rival", name: "Rival", players: [] }
      ],
      match: null,
      template: { name: "Prueba", tags: [] },
      playbook: { version: 3, folders: [], plays: [] },
      events: []
    });
    assert.equal(service.snapshot().totals.teams, 2);
  } finally {
    service.close();
  }

  const reopened = createDatabaseService(databasePath, {
    seedOfficialCatalog: false
  });
  try {
    assert.equal(reopened.snapshot().totals.teams, 0);
  } finally {
    reopened.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
