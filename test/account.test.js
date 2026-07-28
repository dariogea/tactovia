import test from "node:test";
import assert from "node:assert/strict";
import {
  accountsStorageKey,
  activeAccountStorageKey,
  createPasswordSalt,
  readLocalAccount,
  readLocalAccounts,
  saveLocalAccount,
  setActiveLocalAccount,
  passwordDigest
} from "../src/lib/account.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test("la contraseña local usa una sal y una derivación estable", async () => {
  const salt = createPasswordSalt();
  const first = await passwordDigest("clave-segura", salt);
  const second = await passwordDigest("clave-segura", salt);
  const different = await passwordDigest("otra-clave", salt);
  assert.equal(salt.length, 32);
  assert.equal(first, second);
  assert.notEqual(first, different);
  assert.equal(first.length, 64);
});

test("mantiene varios perfiles locales y permite cambiar el activo", () => {
  globalThis.localStorage = memoryStorage();
  const ana = { id: "ana", name: "Ana", email: "ana@test.local", passwordHash: "a" };
  const bruno = { id: "bruno", name: "Bruno", email: "bruno@test.local", passwordHash: "b" };

  saveLocalAccount(bruno);
  saveLocalAccount(ana);
  assert.deepEqual(readLocalAccounts().map((account) => account.id), ["ana", "bruno"]);
  assert.equal(readLocalAccount().id, "ana");
  assert.equal(setActiveLocalAccount("bruno").id, "bruno");
  assert.equal(readLocalAccount().id, "bruno");
  assert.equal(localStorage.getItem(activeAccountStorageKey), "bruno");
  delete globalThis.localStorage;
});

test("descarta la cuenta de prueba solicitada y las demos persistentes", () => {
  globalThis.localStorage = memoryStorage();
  localStorage.setItem(accountsStorageKey, JSON.stringify([
    { id: "bad", name: "dghfghfg", email: "bad@test.local", passwordHash: "x" },
    { id: "demo", name: "Demo", email: "demo@test.local", passwordHash: "x", isDemo: true },
    { id: "real", name: "Real", email: "real@test.local", passwordHash: "x" }
  ]));
  assert.deepEqual(readLocalAccounts().map((account) => account.id), ["real"]);
  delete globalThis.localStorage;
});
