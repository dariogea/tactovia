const { app, BrowserWindow, protocol } = require("electron");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createMediaResponse } = require("../electron/media.cjs");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "scout-media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true
    }
  }
]);

const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "scout-video-seek-")
);
const videoPath = path.join(temporaryDirectory, "seek-test.mp4");
const ffmpegPath = path.join(
  __dirname,
  "..",
  "vendor",
  "ffmpeg",
  "darwin-arm64",
  "ffmpeg"
);

function createTestVideo() {
  execFileSync(
    ffmpegPath,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=640x360:rate=25",
      "-t",
      "12",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-y",
      videoPath
    ],
    { stdio: "inherit" }
  );
}

function verifyHighlightsExport() {
  const clips = [
    { start: "1.000", duration: "1.200", name: "001-test.mp4" },
    { start: "4.000", duration: "1.200", name: "002-test.mp4" }
  ];
  for (const clip of clips) {
    execFileSync(
      ffmpegPath,
      [
        "-hide_banner", "-loglevel", "error", "-ss", clip.start,
        "-i", videoPath, "-t", clip.duration, "-map", "0:v:0", "-map", "0:a?",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-movflags", "+faststart", "-y",
        path.join(temporaryDirectory, clip.name)
      ],
      { stdio: "inherit" }
    );
  }
  const concatPath = path.join(temporaryDirectory, "clips.txt");
  fs.writeFileSync(
    concatPath,
    clips.map((clip) => `file '${path.join(temporaryDirectory, clip.name)}'`).join("\n"),
    "utf8"
  );
  const highlightsPath = path.join(temporaryDirectory, "highlights.mp4");
  execFileSync(
    ffmpegPath,
    [
      "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
      "-i", concatPath, "-c", "copy", "-movflags", "+faststart", "-y",
      highlightsPath
    ],
    { stdio: "inherit" }
  );
  if (!fs.existsSync(highlightsPath) || fs.statSync(highlightsPath).size < 1000) {
    throw new Error("El reel de highlights no se generó correctamente.");
  }
  return fs.statSync(highlightsPath).size;
}

async function run() {
  createTestVideo();
  const highlightsSize = verifyHighlightsExport();
  const encodedPath = Buffer.from(videoPath, "utf8").toString("base64url");
  protocol.handle("scout-media", (request) =>
    createMediaResponse(request, videoPath)
  );

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      backgroundThrottling: false,
      sandbox: true
    }
  });
  await window.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(
      `<video id="video" preload="auto" src="scout-media://local/${encodedPath}"></video>`
    )}`
  );

  const result = await window.webContents.executeJavaScript(`
    (async () => {
      const video = document.getElementById("video");
      const waitFor = (name, timeout = 10000) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Tiempo agotado esperando " + name)), timeout);
        video.addEventListener(name, () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
        video.addEventListener("error", () => {
          clearTimeout(timer);
          reject(new Error("Error multimedia " + (video.error?.code || "desconocido")));
        }, { once: true });
      });
      if (video.readyState < 1) await waitFor("loadedmetadata");
      const duration = video.duration;
      video.currentTime = 7.25;
      await waitFor("seeked");
      const afterSeek = video.currentTime;
      video.playbackRate = 2;
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 600));
      video.pause();
      return {
        duration,
        afterSeek,
        afterPlayback: video.currentTime,
        playbackRate: video.playbackRate,
        seekableRanges: video.seekable.length
      };
    })()
  `, true);

  if (Math.abs(result.duration - 12) > 0.2) {
    throw new Error(`Duración incorrecta: ${result.duration}`);
  }
  if (Math.abs(result.afterSeek - 7.25) > 0.2) {
    throw new Error(`El salto no llegó a 7,25 s: ${result.afterSeek}`);
  }
  if (result.afterPlayback <= result.afterSeek + 0.5) {
    throw new Error("El vídeo no avanzó después del salto.");
  }
  if (result.playbackRate !== 2 || result.seekableRanges < 1) {
    throw new Error(`Estado multimedia inesperado: ${JSON.stringify(result)}`);
  }

  console.log(
    `VIDEO_SEEK_OK duration=${result.duration.toFixed(2)} seek=${result.afterSeek.toFixed(2)} playback=${result.afterPlayback.toFixed(2)} rate=${result.playbackRate}x ranges=${result.seekableRanges} highlights=${highlightsSize}`
  );
  window.destroy();
}

app.whenReady()
  .then(run)
  .then(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    app.exit(1);
  });
