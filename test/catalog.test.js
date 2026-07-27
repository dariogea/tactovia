import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ExcelJS = require("exceljs");
const {
  excelDate,
  normalizeHeader,
  parseCatalogWorkbook,
  scheduledAt
} = require("../electron/catalog.cjs");

test("normaliza cabeceras y fechas habituales de Excel", () => {
  assert.equal(normalizeHeader("Código Jugador"), "codigo_jugador");
  assert.equal(excelDate("20/09/2026"), "2026-09-20");
  assert.equal(
    scheduledAt("2026-09-20", "18:30"),
    "2026-09-20T18:30:00"
  );
});

test("relaciona equipos, jugadores y partidos por sus códigos", () => {
  const workbook = new ExcelJS.Workbook();
  const teams = workbook.addWorksheet("Equipos");
  teams.addRow(["codigo", "nombre", "abreviatura"]);
  teams.addRow(["A", "Equipo A", "EQA"]);
  teams.addRow(["B", "Equipo B", "EQB"]);

  const players = workbook.addWorksheet("Jugadores");
  players.addRow([
    "codigo_equipo",
    "codigo_jugador",
    "dorsal",
    "nombre",
    "posicion"
  ]);
  players.addRow(["A", "A-7", "7", "Base A", "Base"]);

  const matches = workbook.addWorksheet("Partidos");
  matches.addRow([
    "codigo_partido",
    "jornada",
    "fecha",
    "hora",
    "codigo_local",
    "codigo_visitante"
  ]);
  matches.addRow(["M1", "Jornada 1", "2026-09-20", "18:00", "A", "B"]);

  const catalog = parseCatalogWorkbook(workbook);
  assert.equal(catalog.teams.length, 2);
  assert.equal(catalog.teams[0].players.length, 1);
  assert.equal(catalog.teams[0].players[0].number, "7");
  assert.equal(catalog.matches.length, 1);
  assert.equal(catalog.matches[0].homeTeamId, catalog.teams[0].id);
  assert.equal(catalog.matches[0].awayTeamId, catalog.teams[1].id);
  assert.deepEqual(catalog.warnings, []);
});

test("avisa y omite códigos duplicados para proteger el histórico", () => {
  const workbook = new ExcelJS.Workbook();
  const teams = workbook.addWorksheet("Equipos");
  teams.addRow(["codigo", "nombre"]);
  teams.addRow(["DUP", "Equipo A"]);
  teams.addRow(["DUP", "Equipo B"]);

  const players = workbook.addWorksheet("Jugadores");
  players.addRow(["codigo_equipo", "codigo_jugador", "nombre"]);
  players.addRow(["DUP", "P-1", "Jugador A"]);
  players.addRow(["DUP", "P-1", "Jugador duplicado"]);

  const matches = workbook.addWorksheet("Partidos");
  matches.addRow(["codigo_partido", "codigo_local", "codigo_visitante"]);

  const catalog = parseCatalogWorkbook(workbook);
  assert.equal(catalog.teams.length, 1);
  assert.equal(catalog.teams[0].players.length, 1);
  assert.ok(
    catalog.warnings.some((warning) => warning.includes("repite el código"))
  );
});
