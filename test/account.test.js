import test from "node:test";
import assert from "node:assert/strict";
import { createPasswordSalt, passwordDigest } from "../src/lib/account.js";

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
