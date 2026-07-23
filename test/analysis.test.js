import test from "node:test";
import assert from "node:assert/strict";
import {
  createIntervalEvent,
  createPointEvent,
  formatTime,
  projectToCsv,
  statisticsFor
} from "../src/lib/analysis.js";

const tag = {
  id: "shot",
  name: "Tiro",
  color: "#ffffff",
  mode: "point",
  before: 5,
  after: 3
};

test("formatTime presenta minutos, horas y décimas", () => {
  assert.equal(formatTime(65.49), "01:05");
  assert.equal(formatTime(3665.49, true), "01:01:05.4");
});

test("un evento puntual respeta el inicio del vídeo", () => {
  const event = createPointEvent(tag, 2, 100, { team: "Propio" });
  assert.equal(event.start, 0);
  assert.equal(event.end, 5);
  assert.equal(event.team, "Propio");
});

test("un intervalo ordena los extremos y aplica márgenes", () => {
  const event = createIntervalEvent(
    { ...tag, before: 1, after: 2 },
    20,
    10,
    100
  );
  assert.equal(event.start, 9);
  assert.equal(event.end, 22);
});

test("las estadísticas agrupan por etiqueta", () => {
  const events = [
    { tagId: "shot", start: 1, end: 4 },
    { tagId: "shot", start: 5, end: 9 }
  ];
  assert.deepEqual(statisticsFor([tag], events)[0], {
    id: "shot",
    name: "Tiro",
    color: "#ffffff",
    count: 2,
    duration: 7
  });
});

test("CSV protege comas y comillas", () => {
  const csv = projectToCsv({
    template: { tags: [tag] },
    events: [
      {
        start: 1,
        end: 2,
        tagName: 'Tiro, "exterior"',
        mode: "point",
        team: "",
        player: "",
        outcome: "",
        notes: ""
      }
    ]
  });
  assert.match(csv, /"Tiro, ""exterior"""/);
  assert.doesNotMatch(csv, /Resultado/);
});
