export const accountStorageKey = "scout-analyzer-local-account-v1";
export const accountsStorageKey = "tactovia-local-accounts-v2";
export const activeAccountStorageKey = "tactovia-active-account-v2";

function isDiscardedProfile(account) {
  const name = String(account?.name || "").trim().toLowerCase();
  const email = String(account?.email || "").trim().toLowerCase();
  return name === "dghfghfg" || email.startsWith("dghfghfg@");
}

function validAccount(account) {
  return Boolean(
    account?.id &&
      account?.email &&
      account?.passwordHash &&
      !account?.isDemo &&
      !isDiscardedProfile(account)
  );
}

export function readLocalAccounts() {
  if (typeof localStorage === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(accountsStorageKey));
    const accounts = Array.isArray(stored) ? stored.filter(validAccount) : [];
    if (accounts.length > 0) {
      localStorage.setItem(accountsStorageKey, JSON.stringify(accounts));
      return accounts;
    }
  } catch {
    // A damaged registry falls back to the legacy single-profile format.
  }

  try {
    const legacy = JSON.parse(localStorage.getItem(accountStorageKey));
    if (validAccount(legacy)) {
      localStorage.setItem(accountsStorageKey, JSON.stringify([legacy]));
      return [legacy];
    }
    if (isDiscardedProfile(legacy)) {
      localStorage.removeItem(accountStorageKey);
    }
  } catch {
    // Invalid legacy data is intentionally ignored.
  }
  return [];
}

export function readLocalAccount() {
  if (typeof localStorage === "undefined") return null;
  const accounts = readLocalAccounts();
  const activeId = localStorage.getItem(activeAccountStorageKey);
  return accounts.find((account) => account.id === activeId) || accounts[0] || null;
}

export function saveLocalAccount(account) {
  if (!validAccount(account)) return account;
  const accounts = readLocalAccounts();
  const next = [
    ...accounts.filter((candidate) => candidate.id !== account.id),
    account
  ].sort((left, right) =>
    String(left.name || "").localeCompare(String(right.name || ""), "es", {
      sensitivity: "base"
    })
  );
  localStorage.setItem(accountsStorageKey, JSON.stringify(next));
  localStorage.setItem(activeAccountStorageKey, account.id);
  localStorage.setItem(accountStorageKey, JSON.stringify(account));
  return account;
}

export function setActiveLocalAccount(accountId) {
  const account = readLocalAccounts().find((candidate) => candidate.id === accountId);
  if (!account) return null;
  localStorage.setItem(activeAccountStorageKey, account.id);
  localStorage.setItem(accountStorageKey, JSON.stringify(account));
  return account;
}

export function deleteLocalAccount(accountId) {
  const next = readLocalAccounts().filter((account) => account.id !== accountId);
  localStorage.setItem(accountsStorageKey, JSON.stringify(next));
  const current = localStorage.getItem(activeAccountStorageKey);
  if (current === accountId) {
    if (next[0]) {
      setActiveLocalAccount(next[0].id);
    } else {
      localStorage.removeItem(activeAccountStorageKey);
      localStorage.removeItem(accountStorageKey);
    }
  }
  return next;
}

export function createPasswordSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return [...salt].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function passwordDigest(value, salt = "") {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(String(value || "")),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const digest = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt || "scout-analyzer-local"),
      iterations: 120000
    },
    material,
    256
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function accountInitials(account) {
  const source = account?.name || account?.email || "SA";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
