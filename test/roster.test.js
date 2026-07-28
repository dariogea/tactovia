import test from "node:test";
import assert from "node:assert/strict";
import { sortPlayersByNumber, teamTemplates } from "../src/lib/roster.js";

test("ordena jugadores por dorsal numérico y deja los vacíos al final", () => {
  const players = [
    { id: "a", number: "12", name: "Doce" },
    { id: "b", number: "", name: "Sin dorsal" },
    { id: "c", number: "2", name: "Dos" },
    { id: "d", number: "7", name: "Siete" }
  ];
  assert.deepEqual(sortPlayersByNumber(players).map((player) => player.id), [
    "c",
    "d",
    "a",
    "b"
  ]);
});

test("ofrece exactamente cuatro plantillas con convocatorias útiles", () => {
  assert.deepEqual(teamTemplates.map((template) => template.size), [12, 10, 8, 5]);
  teamTemplates.forEach((template) => {
    const team = template.create();
    assert.equal(team.players.length, template.size);
    assert.equal(new Set(team.players.map((player) => player.id)).size, template.size);
    assert.ok(team.players.every((player) => player.number && player.name));
  });
});
