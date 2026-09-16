import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { cloudDocument } from "../src/lib/cloudDocument.js";
import { createBlankProject } from "../src/lib/defaults.js";
import { migrateProject } from "../src/lib/project.js";

test("cloud documents retain analysis, not media or credentials", () => {
  const project = createBlankProject();
  project.video = { path: "/private/video.mp4", url: "blob:secret", name: "private.mp4", duration: 120 };
  project.passwordHash = "secret";
  project.teams[0].players = [{ id: "p", name: "Test", photo: "data:image/png;base64,secret", email: "private@example.com" }];
  const document = cloudDocument(project);
  assert.equal(document.video.duration, 120);
  assert.equal(document.video.path, "");
  assert.ok(!JSON.stringify(document).includes("secret"));
  assert.ok(!JSON.stringify(document).includes("private"));
  assert.equal(migrateProject(document).id, project.id);
  assert.equal(project.video.path, "/private/video.mp4");
});

test("cloud library excludes images and contact details", async () => {
  const { cloudLibraryDocument } = await import(
    "../src/lib/cloudDocument.js"
  );
  const document = cloudLibraryDocument({
    teams: [
      {
        id: "team",
        name: "Club",
        logo: "data:image/png;base64,secret",
        website: "https://private.example",
        players: [
          {
            id: "player",
            name: "Jugador",
            number: "7",
            photo: "secret-photo",
            email: "private@example.com",
            phone: "600000000",
          },
        ],
      },
    ],
  });
  const serialized = JSON.stringify(document);
  assert.ok(serialized.includes("Jugador"));
  assert.ok(!serialized.includes("secret"));
  assert.ok(!serialized.includes("private@example"));
  assert.ok(!serialized.includes("600000000"));
});

test("cloud requests authenticate, detect conflicts, and clear logout locally", async () => {
  const source = (await readFile(new URL("../src/lib/cloud.js", import.meta.url), "utf8"))
    .replace('const env = import.meta.env || {};', 'const env = { VITE_SUPABASE_URL: "https://test.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" };');
  const api = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({url,options});
    if (url.includes("grant_type=password")) return Response.json({access_token:"token",refresh_token:"refresh",expires_in:3600,user:{id:"user",email:"test@example.com"}});
    if (url.includes("logout")) throw new Error("offline");
    if (options.method === "PATCH") return Response.json([]);
    if (options.method === "DELETE") return new Response(null, { status: 204 });
    return Response.json([{id:"analysis",revision:1}]);
  };
  try {
    const account = await api.cloudLogin("test@example.com", "password");
    assert.equal(account.isCloud, true);
    assert.equal(account.passwordHash, undefined);
    await api.writeCloudAnalysis({projectName:"Test"}, null);
    assert.equal(calls.at(-1).options.headers.Authorization, "Bearer token");
    assert.equal(JSON.parse(calls.at(-1).options.body).owner_id, undefined);
    await assert.rejects(api.writeCloudAnalysis({}, {id:"analysis",revision:2}), /Otra sesión/);
    assert.ok(calls.at(-1).url.includes("revision=eq.2"));
    await api.deleteCloudAnalysis("analysis");
    assert.ok(calls.at(-1).url.endsWith("/rest/v1/analyses?id=eq.analysis"));
    await assert.rejects(api.cloudLogout(), /conexión/);
    await assert.rejects(api.listCloudAnalyses(), /Inicia sesión/);
  } finally { globalThis.fetch = original; }
});
