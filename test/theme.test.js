import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePaletteMode,
  normalizeThemeMode,
  resolveThemeMode
} from "../src/lib/theme.js";

test("normaliza preferencias de tema desconocidas", () => {
  assert.equal(normalizeThemeMode("light"), "light");
  assert.equal(normalizeThemeMode("dark"), "dark");
  assert.equal(normalizeThemeMode("system"), "system");
  assert.equal(normalizeThemeMode("sepia"), "system");
  assert.equal(normalizeThemeMode(null), "system");
});

test("el tema automático sigue la preferencia del sistema", () => {
  assert.equal(resolveThemeMode("system", true), "dark");
  assert.equal(resolveThemeMode("system", false), "light");
  assert.equal(resolveThemeMode("light", true), "light");
  assert.equal(resolveThemeMode("dark", false), "dark");
});

test("normaliza las paletas visuales disponibles", () => {
  assert.equal(normalizePaletteMode("arena"), "arena");
  assert.equal(normalizePaletteMode("ocean"), "ocean");
  assert.equal(normalizePaletteMode("forest"), "forest");
  assert.equal(normalizePaletteMode("violet"), "violet");
  assert.equal(normalizePaletteMode("unknown"), "arena");
});
