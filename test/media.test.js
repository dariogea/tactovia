import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { createMediaResponse, parseMediaRange, videoMimeType } = require("../electron/media.cjs");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "scout-media-test-"));
const mediaPath = path.join(temporaryDirectory, "partido.mp4");
fs.writeFileSync(mediaPath, Buffer.from("0123456789", "utf8"));

after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

test("sirve el vídeo completo cuando no existe cabecera de rango", () => {
  assert.deepEqual(parseMediaRange(null, 1000), {
    start: 0,
    end: 999,
    partial: false
  });
});

test("interpreta saltos del reproductor como rangos parciales", () => {
  assert.deepEqual(parseMediaRange("bytes=400-699", 1000), {
    start: 400,
    end: 699,
    partial: true
  });
  assert.deepEqual(parseMediaRange("bytes=800-", 1000), {
    start: 800,
    end: 999,
    partial: true
  });
});

test("rechaza rangos fuera del archivo y reconoce formatos de vídeo", () => {
  assert.equal(parseMediaRange("bytes=1200-1400", 1000), null);
  assert.equal(videoMimeType("/video/partido.MP4"), "video/mp4");
  assert.equal(videoMimeType("/video/partido.mov"), "video/quicktime");
});

test("responde a una petición parcial con cabeceras y bytes correctos", async () => {
  const response = createMediaResponse(
    new Request("https://local/video", {
      headers: { range: "bytes=3-6" }
    }),
    mediaPath
  );
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("accept-ranges"), "bytes");
  assert.equal(response.headers.get("content-range"), "bytes 3-6/10");
  assert.equal(response.headers.get("content-length"), "4");
  assert.equal(await response.text(), "3456");
});
