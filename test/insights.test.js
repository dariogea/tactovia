import test from "node:test";
import assert from "node:assert/strict";
import { buildAutomaticAnalysis } from "../src/lib/insights.js";

function projectWithEvents(events) {
  return {
    match: { homeTeamId: "home", awayTeamId: "away" },
    teams: [
      { id: "home", name: "Local", shortName: "LOC", primaryColor: "#08756D", players: [{ id: "p1", name: "Ana", number: "7" }] },
      { id: "away", name: "Visitante", shortName: "VIS", primaryColor: "#F97316", players: [] }
    ],
    events
  };
}

test("genera conclusiones de equipo y jugador solo desde las etiquetas", () => {
  const analysis = buildAutomaticAnalysis(projectWithEvents([
    { tagId: "tag-shot-made-3", tagName: "Canasta de 3P", teamId: "home", playerId: "p1", shotPoints: 3, shotZoneId: "top" },
    { tagId: "tag-shot-missed-3", tagName: "Tiro fallado de 3P", teamId: "home", playerId: "p1", shotPoints: 3, shotZoneId: "top" },
    { tagId: "tag-turnover", tagName: "Pérdida", teamId: "home", playerId: "p1" }
  ]));
  assert.equal(analysis.ready, true);
  assert.equal(analysis.teams[0].score, 3);
  assert.equal(analysis.teams[0].shootingPercentage, 50);
  assert.equal(analysis.players[0].actions, 3);
  assert.match(analysis.players[0].conclusion, /1\/2/);
});

test("no presenta como listo un análisis sin acciones", () => {
  const analysis = buildAutomaticAnalysis(projectWithEvents([]));
  assert.equal(analysis.ready, false);
  assert.equal(analysis.totalEvents, 0);
  assert.equal(analysis.dataQuality.teamCoverage, 0);
});
