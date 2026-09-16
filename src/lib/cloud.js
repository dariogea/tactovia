// Tokens stay in memory: closing/reloading the page requires signing in again.
const env = import.meta.env || {};
const endpoint = String(env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || "");
export const cloudEnabled = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(endpoint) && key.startsWith("sb_publishable_");
let session = null;
let refreshing = null;

async function request(path, { method = "GET", body, token, prefer } = {}) {
  if (!cloudEnabled) throw new Error("El acceso online aún no está configurado.");
  let response;
  try {
    response = await fetch(`${endpoint}${path}`, {
      method, cache: "no-store", signal: AbortSignal.timeout(20000),
      headers: { apikey: key, "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(prefer ? { Prefer: prefer } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new Error("No hay conexión con la nube. Tu copia local sigue disponible."); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 429) throw new Error("Demasiados intentos. Espera un momento.");
    if (response.status === 401 || response.status === 403) throw new Error("Sesión caducada o acceso denegado. Vuelve a iniciar sesión.");
    throw new Error(path.startsWith("/auth/")
      ? "No se pudo completar el acceso. Revisa los datos y confirma tu correo."
      : "No se pudo guardar o recuperar el análisis. Comprueba la configuración de la nube.");
  }
  return data;
}
function acceptSession(data) {
  if (!data?.access_token || !data?.user?.id) throw new Error("La sesión recibida no es válida.");
  session = { ...data, expires_at: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return cloudAccount(data.user);
}
function cloudAccount(user) {
  return { id: user.id, email: user.email, name: user.user_metadata?.name || user.email,
    club: user.user_metadata?.club || "", role: "Analista", avatar: "", isCloud: true };
}
async function token() {
  if (!session) throw new Error("Inicia sesión para acceder a tu espacio privado.");
  if (Date.now() > session.expires_at - 60000) {
    if (!refreshing) {
      const previous = session;
      refreshing = request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST", body: { refresh_token: previous.refresh_token },
      }).then(data => { if (session === previous) acceptSession(data); })
        .finally(() => { refreshing = null; });
    }
    await refreshing;
  }
  if (!session) throw new Error("Sesión cerrada.");
  return session.access_token;
}
export async function cloudLogin(email, password) {
  return acceptSession(await request("/auth/v1/token?grant_type=password", {
    method: "POST", body: { email: email.trim(), password },
  }));
}
export async function cloudRegister(email, password, name) {
  const data = await request("/auth/v1/signup", { method: "POST",
    body: { email: email.trim(), password, data: { name: name.trim() } } });
  return data?.access_token ? acceptSession(data) : null;
}
export async function cloudRecover(email) {
  await request("/auth/v1/recover", { method: "POST", body: { email: email.trim() } });
}
export async function cloudRecoverySession(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const access_token = params.get("access_token");
  if (!access_token || params.get("type") !== "recovery") return false;
  const user = await request("/auth/v1/user", { token: access_token });
  acceptSession({ user, access_token, refresh_token: params.get("refresh_token"), expires_in: params.get("expires_in") });
  return true;
}
export async function cloudChangePassword(password) {
  await request("/auth/v1/user", { method: "PUT", token: await token(), body: { password } });
  await cloudLogout();
}
export async function cloudLogout() {
  const previous = session;
  session = null;
  if (previous) await request("/auth/v1/logout", { method: "POST", token: previous.access_token });
}

export async function listCloudAnalyses() {
  return request("/rest/v1/analyses?select=id,title,revision,updated_at&order=updated_at.desc&limit=100", { token: await token() });
}
export async function readCloudAnalysis(id) {
  const rows = await request(`/rest/v1/analyses?id=eq.${encodeURIComponent(id)}&select=*`, { token: await token() });
  if (!rows?.[0]) throw new Error("Este análisis ya no está disponible.");
  return rows[0];
}
export async function deleteCloudAnalysis(id) {
  await request(`/rest/v1/analyses?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    token: await token(),
    prefer: "return=minimal",
  });
}
export async function writeCloudAnalysis(document, reference) {
  const suffix = reference ? `?id=eq.${encodeURIComponent(reference.id)}&revision=eq.${Number(reference.revision)}` : "";
  const rows = await request(`/rest/v1/analyses${suffix}`, {
    method: reference ? "PATCH" : "POST", token: await token(), prefer: "return=representation",
    body: { title: String(document.projectName || "Análisis").slice(0,240), document },
  });
  if (!rows?.[0]) throw new Error("Otra sesión modificó este análisis. Abre la versión actual o guarda una copia; no se ha sobrescrito nada.");
  return rows[0];
}

export async function readCloudLibrary() {
  const rows = await request(
    "/rest/v1/user_libraries?select=document,revision,updated_at&limit=1",
    { token: await token() },
  );
  return rows?.[0] || null;
}

export async function writeCloudLibrary(document, reference) {
  const suffix = reference
    ? `?revision=eq.${Number(reference.revision)}`
    : "";
  const rows = await request(`/rest/v1/user_libraries${suffix}`, {
    method: reference ? "PATCH" : "POST",
    token: await token(),
    prefer: "return=representation",
    body: { document },
  });
  if (!rows?.[0]) {
    throw new Error(
      "La biblioteca cambió en otro dispositivo. Se conserva tu copia local; vuelve a iniciar sesión para revisar la versión online.",
    );
  }
  return rows[0];
}
