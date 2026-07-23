import test from "node:test";
import assert from "node:assert/strict";
import {
  eventToShortcut,
  nextPlaybackSpeed,
  shortcutMatches
} from "../src/lib/playback.js";

function keyboardEvent(key, modifiers = {}) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...modifiers
  };
}

test("normaliza atajos con modificadores", () => {
  assert.equal(
    eventToShortcut(keyboardEvent("ArrowLeft", { shiftKey: true })),
    "Shift+ArrowLeft"
  );
  assert.equal(eventToShortcut(keyboardEvent(" ")), "Space");
  assert.equal(eventToShortcut(keyboardEvent("q")), "Q");
});

test("compara atajos exactos", () => {
  assert.equal(shortcutMatches(keyboardEvent("ArrowRight"), "ArrowRight"), true);
  assert.equal(
    shortcutMatches(keyboardEvent("ArrowRight", { shiftKey: true }), "ArrowRight"),
    false
  );
});

test("limita las velocidades entre 0.25x y 16x", () => {
  assert.equal(nextPlaybackSpeed(1, 1), 1.5);
  assert.equal(nextPlaybackSpeed(16, 1), 16);
  assert.equal(nextPlaybackSpeed(0.25, -1), 0.25);
});
