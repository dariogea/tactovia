// Exercises the built application in an isolated profile; never opens user data.
const { app, BrowserWindow, ipcMain, protocol } = require("electron");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createMediaResponse } = require("../electron/media.cjs");
const { createDatabaseService } = require("../electron/database.cjs");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tactovia-studio-qa-"));
app.setPath("userData", path.join(dir, "profile"));
protocol.registerSchemesAsPrivileged([
  {
    scheme: "scout-media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);
let win,
  service,
  saved,
  clipsPayload,
  count = 0;
const errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function js(code) {
  return win.webContents.executeJavaScript(code, true);
}
async function click(label, selector = "button") {
  const ok = await js(
    `(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.textContent.trim()===${JSON.stringify(label)});if(!el||el.disabled)return false;el.click();return true;})()`,
  );
  assert.ok(ok, `Botón no encontrado o desactivado: ${label}`);
  await wait(180);
}
async function selectorClick(selector) {
  assert.ok(
    await js(
      `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)return false;el.click();return true;})()`,
    ),
    selector,
  );
  await wait(180);
}
async function screenshot(name) {
  await wait(150);
  fs.writeFileSync(
    path.join(dir, `${name}.png`),
    (await win.webContents.capturePage()).toPNG(),
  );
}
async function check(code, message) {
  assert.ok(await js(code), message);
  count++;
}
async function run() {
  const videoPath = path.join(dir, "test.mp4");
  execFileSync(path.join(__dirname, "../vendor/ffmpeg/darwin-arm64/ffmpeg"), [
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
    videoPath,
  ]);
  const video = {
    path: videoPath,
    name: "test.mp4",
    url: "scout-media://local/qa",
  };
  protocol.handle("scout-media", (request) =>
    createMediaResponse(request, videoPath),
  );
  service = createDatabaseService(path.join(dir, "test.db"), {
    seedOfficialCatalog: false,
  });
  const snapshot = () => service.snapshot("qa");
  ipcMain.handle("database:initialize", () => ({
    ok: true,
    snapshot: snapshot(),
  }));
  ipcMain.handle("database:snapshot", () => ({
    ok: true,
    snapshot: snapshot(),
  }));
  ipcMain.handle("database:user-library", () => ({ ok: true, library: null }));
  ipcMain.handle("database:save-user-library", () => ({ ok: true }));
  ipcMain.handle("database:sync-project", () => ({ ok: true }));
  ipcMain.handle("export:clips", (_event, payload) => {
    clipsPayload = payload;
    return { files: [path.join(dir, "clips.mp4")] };
  });
  ipcMain.handle("file:reveal", () => ({ ok: true }));
  ipcMain.handle("video:select", () => ({ video }));
  ipcMain.handle("video:authorize", () => ({ video }));
  ipcMain.handle("project:save", (_e, payload) => {
    saved = structuredClone(payload.project);
    return { filePath: path.join(dir, "qa.scout.json") };
  });
  ipcMain.handle("project:open", () => ({
    project: saved,
    video,
    filePath: path.join(dir, "qa.scout.json"),
  }));
  win = new BrowserWindow({
    show: false,
    width: 1440,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, "../electron/preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.webContents.on("console-message", (_event, level, message) => {
    if (level >= 3) errors.push(message);
  });
  await win.loadFile(path.join(__dirname, "../dist/index.html"));
  await wait(2100);
  await js(
    `window.confirm=()=>true;document.documentElement.dataset.theme="light";`,
  );
  await screenshot("01-login-light");
  await click("▶Entrar en la demo").catch(() =>
    selectorClick(".demo-access-button"),
  );
  await check(
    `!document.body.innerText.includes('Balonmano')`,
    "Balonmano retirado",
  );
  await screenshot("sports-light");
  await selectorClick(".sport-card:not([disabled])");
  await selectorClick(".session-choice:last-child");
  await check(
    `document.querySelector(".overview-page") && document.querySelectorAll(".recent-event").length===5`,
    "Ejemplo y resumen",
  );
  await selectorClick('.theme-selector button[title="Claro"]');
  await screenshot("02-overview-light");
  for (const [view, name] of [
    ["stats", "04-statistics"],
    ["database", "05-library"],
    ["report", "06-reports"],
    ["review", "07-review"],
  ]) {
    await selectorClick(
      `.studio-sidebar nav button:nth-child(${["overview", "tagging", "review", "stats", "database", "report"].indexOf(view) + 1})`,
    );
    await screenshot(`${name}-light`);
    if (view === "stats") {
      await js(
        `(()=>{const s=document.querySelector(".bi-filter-rail select");Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(s,"example-team-0");s.dispatchEvent(new Event("change",{bubbles:true}));})()`,
      );
      await wait(150);
      await check(
        `document.querySelector(".bi-kpi strong").textContent==="32"`,
        "Filtro de equipo",
      );
      await click("Restablecer filtros");
    }

    await check(
      `!document.body.innerText.includes("Application error") && document.body.scrollWidth<=innerWidth+2`,
      `Vista ${view} sin desbordamiento horizontal`,
    );
  }
  await selectorClick(".sidebar-bottom>button:nth-child(2)");
  await screenshot("08-settings-light");
  await selectorClick(".studio-sidebar nav button:nth-child(2)");
  await click("Seleccionar vídeo").catch(() => click("Cambiar vídeo"));
  await wait(700);
  await check(
    `document.querySelector("video")?.duration===12`,
    "Carga real del vídeo",
  );
  await js(`document.querySelector("video").currentTime=6;`);
  await wait(200);
  await selectorClick(".tag-button");
  await click("Guardar");
  assert.equal(saved.events.length, 65, "Tiro sin mapa oculto registrado");
  count++;
  assert.equal(saved.events.at(-1).period, "1");
  count++;
  await screenshot("03-tagging-light");
  await selectorClick(".studio-sidebar nav button:nth-child(1)");
  await selectorClick(".studio-sidebar nav button:nth-child(2)");
  await wait(400);
  await check(
    `Math.abs(document.querySelector("video").currentTime-6)<.2`,
    "Se conserva la posición al cambiar de vista",
  );
  await selectorClick('button[aria-label="Deshacer"]');
  await click("Guardar");
  assert.equal(saved.events.length, 64);
  count++;
  await selectorClick('button[aria-label="Rehacer"]');
  await click("Guardar");
  assert.equal(saved.events.length, 65);
  count++;
  await click("Abrir");
  await check(
    `document.querySelector(".tagging-page-header")!==null`,
    "Reapertura del análisis",
  );
  await selectorClick(".studio-sidebar nav button:nth-child(3)");
  await selectorClick(
    `.clip-list article[data-event-id="${saved.events.at(-1).id}"] .clip-list-item`,
  );
  await selectorClick('.clip-inspector button[aria-label="Destacar clip"]');
  await selectorClick(
    `.clip-list article[data-event-id="${saved.events.at(-1).id}"] input[type="checkbox"]`,
  );
  await js(
    `(()=>{const el=document.querySelector('#playlist-name');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'Lista de prueba');el.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
  await click("Crear lista");
  await click("Guardar");
  assert.ok(
    saved.playlists.some(
      (p) => p.name === "Lista de prueba" && p.eventIds.length === 1,
    ),
  );
  count++;
  assert.ok(saved.events.at(-1).favorite);
  count++;
  await click("Exportar lista");
  await screenshot("10-export");
  await click("Elegir destino y exportar");
  await wait(150);
  assert.equal(clipsPayload.events.length, 1);
  assert.equal(clipsPayload.events[0].start, 1);
  count++;
  await selectorClick(".studio-search");
  await check(
    `document.querySelector('[role="dialog"]')!==null`,
    "Paleta de comandos",
  );
  await screenshot("09-commands");
  await js(
    `document.querySelector('.command-palette input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));`,
  );
  await wait(100);
  await check(
    `!document.querySelector('.command-palette')`,
    "Escape cierra la paleta",
  );
  for (const [index, name] of [
    [1, "overview"],
    [2, "tagging"],
    [3, "review"],
    [4, "statistics"],
    [5, "library"],
    [6, "reports"],
  ]) {
    await selectorClick('.theme-selector button[title="Oscuro"]');
    await selectorClick(`.studio-sidebar nav button:nth-child(${index})`);
    await screenshot(`${name}-dark`);
  }
  win.setSize(1000, 800);
  await selectorClick(".studio-sidebar nav button:nth-child(2)");
  await screenshot("tagging-compact");
  await check(
    `document.body.scrollWidth<=innerWidth+2`,
    "Etiquetado compacto sin desbordamiento",
  );
  win.setSize(640, 820);
  await selectorClick(".studio-sidebar nav button:nth-child(1)");
  await screenshot("overview-mobile");
  await check(`document.body.scrollWidth<=innerWidth+2`, "Inicio responsive");
  if (process.argv.includes("--visual")) {
    const audit = [];
    const inspect = async (name) => {
      await screenshot(name);
      const issues = await js(`(()=>{
        return [...document.querySelectorAll('button,h1,h2,h3,label,p,small,strong,input,select')].filter(e=>e.getClientRects().length).flatMap(e=>{
          const r=e.getBoundingClientRect(), s=getComputedStyle(e);
          const text=(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,100);
          if(!text || r.width===0) return [];
          const scrollContainer=e.closest('.table-scroll,.event-table-wrap');
          const overflow=!scrollContainer&&(r.right>innerWidth+2||r.left< -2);
          const clipped=e.scrollWidth>e.clientWidth+3&&['hidden','clip'].includes(s.overflowX)&&s.textOverflow!=='ellipsis';
          return overflow||clipped?[{tag:e.tagName,cls:e.className,text,overflow,clipped,width:Math.round(r.width)}]:[];
        });
      })()`);
      audit.push({ name, issues });
      fs.writeFileSync(
        path.join(dir, "visual-audit.json"),
        JSON.stringify(audit, null, 2),
      );
    };
    for (const width of process.argv.includes('--details') ? [] : [1440, 1000, 640]) {
      win.setSize(width, 940);
      for (const theme of ["light", "dark"]) {
        await js(`document.documentElement.dataset.theme='${theme}'`);
        for (let index = 1; index <= 6; index++) {
          await selectorClick(`.studio-sidebar nav button:nth-child(${index})`);
          await inspect(`audit-${width}-${theme}-${index}`);
        }
        await selectorClick(".sidebar-bottom>button:nth-child(2)");
        for (let tab = 1; tab <= 4; tab++) {
          await selectorClick(`.settings-tabs button:nth-child(${tab})`);
          await inspect(`audit-${width}-${theme}-settings-${tab}`);
        }
      }
    }
    win.setSize(1440, 1000);
    await selectorClick(".studio-sidebar nav button:nth-child(4)");
    for (const palette of process.argv.includes('--details') ? [] : ["tactovia", "arena", "ocean", "graphite"]) {
      for (const theme of ["light", "dark"]) {
        await js(
          `document.documentElement.dataset.theme='${theme}';document.documentElement.dataset.palette='${palette}';`,
        );
        await inspect(`palette-${palette}-${theme}`);
      }
    }
    for (const width of [1000, 640]) {
      win.setSize(width, 940);
      for (const theme of ["light", "dark"]) {
        await js(
          `document.documentElement.dataset.theme='${theme}';document.documentElement.dataset.palette='tactovia'`,
        );
        await selectorClick(".studio-sidebar nav button:nth-child(4)");
        for (let tab = 2; tab <= 4; tab++) {
          await selectorClick(`.bi-page-tabs button:nth-child(${tab})`);
          await inspect(`detail-${width}-${theme}-stats-${tab}`);
        }
        await selectorClick(".studio-sidebar nav button:nth-child(6)");
        for (let tab = 2; tab <= 4; tab++) {
          await selectorClick(`.report-section-tabs button:nth-child(${tab})`);
          await inspect(`detail-${width}-${theme}-report-${tab}`);
        }
        await selectorClick(".studio-sidebar nav button:nth-child(2)");
        await click("Configurar");
        await inspect(`dialog-${width}-${theme}-tags`);
        await selectorClick('[role="dialog"] button[aria-label="Cerrar"]');
        await selectorClick(".shortcut-help-button");
        await inspect(`dialog-${width}-${theme}-guide`);
        await selectorClick('[role="dialog"] button[aria-label="Cerrar"]');
        await selectorClick(".studio-sidebar nav button:nth-child(3)");
        await selectorClick(".playlist-panel > button:nth-of-type(2)");
        await click("Exportar lista");
        await inspect(`dialog-${width}-${theme}-export`);
        await selectorClick('[role="dialog"] button[aria-label="Cerrar"]');
      }
    }
    saved.teams[0].name =
      "Club de Baloncesto Universidad Regional de la Costa Mediterránea";
    saved.projectName =
      "Análisis de la final del campeonato regional sénior — temporada 2026/2027";
    await click("Abrir").catch(() =>
      selectorClick('button[title="Abrir análisis"]'),
    );
    for (let index = 1; index <= 6; index++) {
      await selectorClick(`.studio-sidebar nav button:nth-child(${index})`);
      await inspect(`long-names-${index}`);
      await js(
        `window.scrollTo(0,document.body.scrollHeight);document.querySelector('.main-area')?.scrollTo(0,99999);`,
      );
      await inspect(`bottom-${index}`);
      await js(
        `window.scrollTo(0,0);document.querySelector('.main-area')?.scrollTo(0,0);`,
      );
    }
    saved.events = [];
    saved.match = null;
    await click("Abrir").catch(() => selectorClick('button[title="Abrir análisis"]'));
    await selectorClick('.studio-sidebar nav button:nth-child(2)');
    await check(`Boolean(document.querySelector('.match-setup'))`, 'Configurador de partido visible');
    for(const width of [1000,640]) {
      win.setSize(width,940);
      for(const theme of ['light','dark']) {
        await js(`document.documentElement.dataset.theme='${theme}'`);
        await inspect(`dialog-${width}-${theme}-match`);
      }
    }
    fs.writeFileSync(
      path.join(dir, "visual-audit.json"),
      JSON.stringify(audit, null, 2),
    );
    console.log(
      "VISUAL_AUDIT " +
        dir +
        " cases=" +
        audit.length +
        " flagged=" +
        audit.filter((x) => x.issues.length).length,
    );
  }
  assert.deepEqual(errors, [], "Sin errores de consola");
  console.log(
    `STUDIO_OK checks=${count} screenshots=${dir} actions=${saved.events.length} playlists=${saved.playlists.length}`,
  );
}
app
  .whenReady()
  .then(run)
  .then(() => {
    win?.destroy();
    service?.close();
    app.quit();
  })
  .catch(async (error) => {
    console.error(error);
    console.error("QA_DIR=" + dir);
    if (win) await screenshot("failure").catch(() => {});
    win?.destroy();
    service?.close();
    app.exit(1);
  });
