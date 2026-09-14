import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createBlankProject, defaultPreferences } from "../src/lib/defaults.js";

test("la pista comienza oculta y el reproductor muestra solo los controles esenciales", () => {
  assert.equal(defaultPreferences.layout.shotCourtVisible, false);
  assert.deepEqual(defaultPreferences.playback.visibleControls, [
    "backMedium",
    "playPause",
    "forwardMedium",
  ]);
});

test("los proyectos nuevos ya no incluyen datos del Playbook", () => {
  const project = createBlankProject();
  assert.equal(project.version, 11);
  assert.equal("playbook" in project, false);
  assert.deepEqual(project.libraryFolders, []);
});

test("la compilación web declara una PWA instalable y su caché sin conexión", () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      new URL("../public/manifest.webmanifest", import.meta.url),
      "utf8",
    ),
  );
  const worker = fs.readFileSync(
    new URL("../public/sw.js", import.meta.url),
    "utf8",
  );
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.short_name, "Tactovia");
  assert.match(worker, /tactovia-shell-v0\.13\.0/);
  assert.match(worker, /caches\.match/);
});
