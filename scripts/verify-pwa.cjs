const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "tactovia-pwa-qa-"));
app.setPath("userData", path.join(temporary, "profile"));
let server, win;
async function run() {
  const root = path.resolve(__dirname, "../dist");
  server = http.createServer((request, response) => {
    const file = path.resolve(
      root,
      "." +
        decodeURIComponent(new URL(request.url, "http://localhost").pathname),
    );
    const target = file === root ? path.join(root, "index.html") : file;
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".webmanifest": "application/manifest+json",
      }[path.extname(target)] || "application/octet-stream",
    );
    response.end(fs.readFileSync(target));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, backgroundThrottling: false },
  });
  await win.loadURL("http://127.0.0.1:" + server.address().port + "/");
  const cached = await win.webContents.executeJavaScript(`(async()=>{
    await navigator.serviceWorker.ready;
    if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener("controllerchange",resolve,{once:true}));
    const cache=await caches.open((await caches.keys()).find(key=>key.startsWith("tactovia-shell-")));return (await cache.keys()).map(r=>r.url);
  })()`);
  assert.ok(cached.some((url) => url.endsWith(".js")));
  assert.ok(cached.some((url) => url.endsWith(".css")));
  assert.ok(cached.some((url) => url.includes("tactovia-horizontal")));
  await new Promise((resolve) => setTimeout(resolve, 2200));
  win.webContents.debugger.attach("1.3");
  for (const theme of ["dark", "light"]) {
    await win.webContents.debugger.sendCommand("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: theme }],
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(
      await win.webContents.executeJavaScript(
        "document.documentElement.dataset.theme",
      ),
      theme,
    );
    fs.writeFileSync(
      path.join(temporary, `system-${theme}.png`),
      (await win.webContents.capturePage()).toPNG(),
    );
  }
  win.webContents.debugger.detach();
  console.log("THEME_SYSTEM_OK light=true dark=true");
  win.webContents.session.enableNetworkEmulation({ offline: true });
  const loaded = new Promise((resolve) =>
    win.webContents.once("did-finish-load", resolve),
  );
  win.reload();
  await loaded;
  await new Promise((resolve) => setTimeout(resolve, 2200));
  assert.ok(
    await win.webContents.executeJavaScript(
      `Boolean(document.querySelector(".demo-access-button"))`,
    ),
  );
  await win.webContents.executeJavaScript(
    `document.querySelector(".demo-access-button").click()`,
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.ok(
    await win.webContents.executeJavaScript(
      `Boolean(document.querySelector(".session-stage"))`,
    ),
  );
  console.log("PWA_OK offline=true assets=" + cached.length + " demo=true");
}
app
  .whenReady()
  .then(run)
  .then(() => {
    win?.destroy();
    server?.close();
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    win?.destroy();
    server?.close();
    app.exit(1);
  });
