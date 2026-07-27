const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app } = require("electron");
const {
  createDatabaseService,
  PILOT_COMPETITION_SEASON_ID
} = require("../electron/database.cjs");

const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "scout-electron-db-")
);
let service;

async function run() {
  const databasePath = path.join(temporaryDirectory, "scoutanalyzer.db");
  const backupPath = path.join(temporaryDirectory, "scoutanalyzer-copia.db");
  service = createDatabaseService(databasePath);
  const now = new Date().toISOString();

  service.syncProject({
    version: 6,
    id: "electron-database-test",
    projectName: "Validación de Electron",
    createdAt: now,
    video: {
      name: "partido-local.mp4",
      path: "/ruta/local/partido-local.mp4",
      duration: 90
    },
    template: { name: "Prueba", tags: [] },
    playbook: { version: 3, folders: [], plays: [] },
    teams: [
      {
        id: "electron-home",
        name: "Equipo Local",
        players: [
          {
            id: "electron-player",
            name: "Jugador Local",
            number: "4",
            position: "Base"
          }
        ]
      },
      {
        id: "electron-away",
        name: "Equipo Visitante",
        players: []
      }
    ],
    match: {
      id: "electron-match",
      competitionSeasonId: PILOT_COMPETITION_SEASON_ID,
      homeTeamId: "electron-home",
      awayTeamId: "electron-away",
      roundName: "Jornada de prueba"
    },
    events: [
      {
        id: "electron-event",
        tagName: "Tiro",
        start: 10,
        end: 15,
        anchor: 12,
        teamId: "electron-home",
        playerId: "electron-player"
      }
    ]
  });

  const snapshot = service.snapshot();
  assert.equal(snapshot.databaseVersion, 1);
  assert.equal(snapshot.totals.teams, 2);
  assert.equal(snapshot.totals.players, 1);
  assert.equal(snapshot.totals.matches, 1);
  assert.equal(snapshot.totals.events, 1);
  assert.equal(snapshot.analyses[0].visibility, "private");

  await service.backupTo(backupPath);
  assert.ok(fs.statSync(backupPath).size > 0);
  console.log(
    `DATABASE_OK version=${snapshot.databaseVersion} teams=${snapshot.totals.teams} players=${snapshot.totals.players} matches=${snapshot.totals.matches} events=${snapshot.totals.events} privacy=${snapshot.analyses[0].visibility}`
  );
}

app
  .whenReady()
  .then(run)
  .then(() => {
    service?.close();
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    service?.close();
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    app.exit(1);
  });
