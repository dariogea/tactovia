export const accountStorageKey = "scout-analyzer-local-account-v1";

export function readLocalAccount() {
  if (typeof localStorage === "undefined") return null;
  try {
    const account = JSON.parse(localStorage.getItem(accountStorageKey));
    return account?.id && account?.email && account?.passwordHash ? account : null;
  } catch {
    return null;
  }
}

export function saveLocalAccount(account) {
  localStorage.setItem(accountStorageKey, JSON.stringify(account));
  return account;
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
