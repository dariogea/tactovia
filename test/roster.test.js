import test from "node:test";
import assert from "node:assert/strict";
import { sortPlayersByNumber } from "../src/lib/roster.js";

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

