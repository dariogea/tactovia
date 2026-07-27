import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  FBRM_CATALOG_VERSION,
  createFbrmCatalog
} = require("../electron/catalogs/fbrm-2026-27.cjs");
const { createDatabaseService } = require("../electron/database.cjs");

test("el catálogo FBRM contiene los 16 equipos y una plantilla demo inequívoca", () => {
  const catalog = createFbrmCatalog();
  const teamIds = new Set(catalog.teams.map((team) => team.id));
  const externalIds = new Set(catalog.teams.map((team) => team.externalId));

  assert.equal(catalog.version, FBRM_CATALOG_VERSION);
  assert.equal(catalog.teams.length, 16);
  assert.equal(teamIds.size, 16);
  assert.equal(externalIds.size, 16);
  assert.equal(catalog.matches.length, 8);
  assert.equal(
    catalog.teams.filter((team) => team.logoStatus === "official-bundled").length,
    7
  );

  for (const team of catalog.teams) {
    assert.equal(team.dataStatus, "official-team");
    assert.ok(team.sourceUrl.startsWith("https://www.fbrm.org/"));
    assert.ok(team.clubSourceUrl.startsWith("https://www.fbrm.org/"));
    assert.ok(team.logo.startsWith("data:image/"));
    assert.ok(["official-bundled", "provisional"].includes(team.logoStatus));
    assert.ok(team.city);
    assert.ok(team.arena);
    assert.equal(team.players.length, 12);
    for (const player of team.players) {
      assert.equal(player.isDemo, true);
      assert.equal(player.dataStatus, "demo");
      assert.equal(player.source, "demo-generated");
      assert.match(player.name, /^Jugador demo #\d+$/);
      assert.equal(player.email, undefined);
      assert.equal(player.phone, undefined);
    }
  }

  for (const match of catalog.matches) {
    assert.ok(teamIds.has(match.homeTeamId));
    assert.ok(teamIds.has(match.awayTeamId));
    assert.notEqual(match.homeTeamId, match.awayTeamId);
    assert.equal(match.roundName, "Jornada 1");
  }
});

test("la instalación automática del catálogo es idempotente", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scout-fbrm-db-"));
  const databasePath = path.join(directory, "scoutanalyzer.db");
  const service = createDatabaseService(databasePath);

  try {
    const first = service.snapshot();
    assert.equal(first.catalog.fbrmVersion, FBRM_CATALOG_VERSION);
    assert.equal(first.catalog.fbrmTeamCount, 16);
    assert.equal(first.catalog.officialLogoCount, 7);
    assert.equal(first.catalog.provisionalLogoCount, 9);
    assert.equal(first.totals.teams, 16);
    assert.equal(first.totals.players, 192);
    assert.equal(first.totals.matches, 8);
    assert.equal(first.players.filter((player) => player.isDemo).length, 192);
  } finally {
    service.close();
  }

  const reopened = createDatabaseService(databasePath);
  try {
    const second = reopened.snapshot();
    assert.equal(second.totals.teams, 16);
    assert.equal(second.totals.players, 192);
    assert.equal(second.totals.matches, 8);
  } finally {
    reopened.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
