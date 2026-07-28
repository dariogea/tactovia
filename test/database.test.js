import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createDatabaseService } = require("../electron/database.cjs");

function sampleProject() {
  const now = new Date().toISOString();
  return {
    version: 9,
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
    competitions: [],
    freeAgents: [],
    teams: [
      {
        id: "home",
        name: "Murcia Local",
        shortName: "MUR",
        primaryColor: "#08756D",
        secondaryColor: "#BDEB62",
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
        secondaryColor: "#FFEDD5",
        players: []
      }
    ],
    match: {
      id: "match-test",
      homeTeamId: "home",
      awayTeamId: "away",
      homeRosterIds: ["player-home"],
      awayRosterIds: [],
      roundName: "Jornada 1",
      scheduledAt: "2026-09-20T18:00:00",
      status: "finished"
    },
    events: [
      {
        id: "event-test",
        tagId: "tag-shot-made-3",
        tagName: "Canasta de 3P",
        color: "#08756D",
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
        notes: "Bloqueo directo",
        createdAt: now
      }
    ]
  };
}

function withDatabase(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tactovia-db-"));
  const service = createDatabaseService(path.join(directory, "tactovia.db"), {
    seedOfficialCatalog: false
  });
  try {
    return run(service, directory);
  } finally {
    service.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("inicializa una biblioteca vacía y sincroniza un análisis por perfil", () => {
  withDatabase((service) => {
    const initial = service.snapshot("profile-a");
    assert.equal(initial.competitions.length, 0);
    assert.equal(initial.gameRecords.length, 0);

    service.syncProject(sampleProject(), "profile-a");
    const snapshot = service.snapshot("profile-a");
    assert.equal(snapshot.totals.teams, 2);
    assert.equal(snapshot.totals.players, 1);
    assert.equal(snapshot.totals.matches, 1);
    assert.equal(snapshot.totals.analyses, 1);
    assert.equal(snapshot.totals.events, 1);
    assert.equal(snapshot.matches[0].homeTeamName, "Murcia Local");
    const owner = service.database
      .prepare("SELECT owner_profile_id FROM analyses WHERE id = ?")
      .get("analysis-test");
    assert.equal(owner.owner_profile_id, "profile-a");
  });
});

test("actualiza eventos sin duplicarlos y mantiene la cola local", () => {
  withDatabase((service) => {
    const project = sampleProject();
    service.syncProject(project, "profile-a");
    service.syncProject(
      {
        ...project,
        events: [
          ...project.events,
          {
            ...project.events[0],
            id: "event-second",
            tagId: "tag-def-rebound",
            tagName: "Rebote defensivo",
            start: 40,
            end: 45
          }
        ]
      },
      "profile-a"
    );
    const snapshot = service.snapshot("profile-a");
    assert.equal(snapshot.totals.events, 2);
    assert.equal(snapshot.totals.pendingSync, 1);
  });
});

test("crea un histórico sin vídeo y lo aísla por perfil", () => {
  withDatabase((service) => {
    const project = sampleProject();
    service.finalizeProject(project, "profile-a");
    const own = service.snapshot("profile-a");
    const other = service.snapshot("profile-b");

    assert.equal(own.gameRecords.length, 1);
    assert.equal(other.gameRecords.length, 0);
    assert.equal(own.gameRecords[0].summary.totalEvents, 1);
    assert.equal(own.gameRecords[0].events[0].tagName, "Canasta de 3P");
    assert.equal("video" in own.gameRecords[0], false);
    assert.equal("start" in own.gameRecords[0].events[0], false);

    service.deleteGameRecord(project.id, "profile-b");
    assert.equal(service.snapshot("profile-a").gameRecords.length, 1);
    service.deleteGameRecord(project.id, "profile-a");
    assert.equal(service.snapshot("profile-a").gameRecords.length, 0);
  });
});

test("crea una copia SQLite que puede volver a abrirse", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tactovia-db-"));
  const service = createDatabaseService(path.join(directory, "tactovia.db"), {
    seedOfficialCatalog: false
  });
  try {
    service.syncProject(sampleProject(), "profile-a");
    const backupPath = path.join(directory, "backup.db");
    await service.backupTo(backupPath);
    assert.equal(fs.existsSync(backupPath), true);
  } finally {
    service.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("limpia equipos genéricos vacíos de versiones anteriores", () => {
  withDatabase((service) => {
    const now = new Date().toISOString();
    service.database.prepare(`
      INSERT INTO teams (
        id, name, short_name, source, profile_json, created_at, updated_at
      )
      VALUES ('team-own', 'Mi equipo', 'PRO', 'local-user', '{}', ?, ?)
    `).run(now, now);
    service.close();
    const reopened = createDatabaseService(service.filePath, {
      seedOfficialCatalog: false
    });
    try {
      const row = reopened.database
        .prepare("SELECT id FROM teams WHERE id = 'team-own'")
        .get();
      assert.equal(row, undefined);
    } finally {
      reopened.close();
    }
  });
});
