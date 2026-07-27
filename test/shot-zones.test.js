import test from "node:test";
import assert from "node:assert/strict";
import { isShotTag, shotZoneById, zoneStats } from "../src/lib/shotZones.js";

test("el mapa distingue zonas de dos y tres puntos", () => {
  assert.equal(shotZoneById("restricted").points, 2);
  assert.equal(shotZoneById("top").points, 3);
});

test("detecta etiquetas de tiro y calcula el acierto por zona", () => {
  const events = [
    { tagId: "tag-shot-made-3", tagName: "Canasta de 3P", shotZoneId: "top" },
    { tagId: "tag-shot-missed", tagName: "Tiro fallado", shotZoneId: "top" }
  ];
  assert.equal(isShotTag(events[0]), true);
  const top = zoneStats(events).find((zone) => zone.id === "top");
  assert.deepEqual(
    { attempts: top.attempts, made: top.made, percentage: top.percentage },
    { attempts: 2, made: 1, percentage: 50 }
  );
});
