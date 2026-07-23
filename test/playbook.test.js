import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlaybookPhase,
  createTemplateObjects,
  generateNextPhase,
  migratePlaybook,
  mirrorPhase,
  phaseMinimumDuration
} from "../src/lib/playbook.js";

test("migra jugadas antiguas sin perder sus objetos ni carpetas", () => {
  const migrated = migratePlaybook({
    folders: [{ id: "ataque", name: "Ataque", teamId: "equipo-1" }],
    plays: [
      {
        id: "play-1",
        name: "Cuernos",
        folderId: "ataque",
        court: "half",
        phases: [
          {
            id: "phase-1",
            name: "Inicio",
            objects: [{ id: "player-1", kind: "player", label: "1", x: 50, y: 80 }]
          }
        ]
      }
    ]
  });

  assert.equal(migrated.version, 2);
  assert.equal(migrated.plays[0].name, "Cuernos");
  assert.equal(migrated.plays[0].phases[0].objects[0].label, "1");
  assert.equal(
    migrated.plays[0].phases[0].objects[0].trackId,
    "player-1"
  );
  assert.deepEqual(migrated.plays[0].phases[0].actions, []);
});

test("las plantillas ofensivas y defensivas crean cinco jugadores", () => {
  const horns = createTemplateObjects("horns", "half");
  const zone = createTemplateObjects("zone-2-3", "full");

  assert.equal(horns.length, 5);
  assert.equal(horns.filter((item) => item.role === "offense").length, 5);
  assert.equal(horns.filter((item) => item.hasBall).length, 1);
  assert.equal(zone.length, 5);
  assert.equal(zone.filter((item) => item.role === "defense").length, 5);
});

test("la fase inteligente aplica desplazamientos y transfiere el balón", () => {
  const phase = createPlaybookPhase("Inicio", [
    {
      id: "one",
      trackId: "one",
      kind: "player",
      label: "1",
      x: 100,
      y: 100,
      hasBall: true
    },
    {
      id: "two",
      trackId: "two",
      kind: "player",
      label: "2",
      x: 300,
      y: 200
    }
  ], {
    actions: [
      {
        kind: "cut",
        actorTrackId: "one",
        x1: 100,
        y1: 100,
        x2: 220,
        y2: 140,
        order: 0
      },
      {
        kind: "pass",
        actorTrackId: "one",
        targetTrackId: "two",
        x1: 220,
        y1: 140,
        x2: 300,
        y2: 200,
        order: 1
      }
    ]
  });

  const next = generateNextPhase(phase);
  const one = next.objects.find((item) => item.trackId === "one");
  const two = next.objects.find((item) => item.trackId === "two");

  assert.equal(one.x, 220);
  assert.equal(one.y, 140);
  assert.equal(one.hasBall, false);
  assert.equal(two.hasBall, true);
  assert.deepEqual(next.actions, []);
});

test("refleja una fase y calcula una duración suficiente para sus acciones", () => {
  const phase = {
    id: "phase",
    name: "Fase",
    objects: [{ id: "p", kind: "player", x: 100, y: 200 }],
    actions: [
      {
        id: "a",
        kind: "cut",
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
        delay: 1,
        duration: 2
      }
    ]
  };

  const mirrored = mirrorPhase(phase, "half");
  assert.equal(mirrored.objects[0].x, 660);
  assert.equal(mirrored.actions[0].x1, 660);
  assert.equal(mirrored.actions[0].x2, 460);
  assert.equal(phaseMinimumDuration(phase), 3.35);
});
