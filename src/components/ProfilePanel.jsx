import { useState } from "react";
import {
  accountInitials,
  createPasswordSalt,
  passwordDigest,
  saveLocalAccount
} from "../lib/account.js";
import { SettingsPanel } from "./SettingsPanel.jsx";

export function ProfilePanel({
  account,
  onAccountChange,
  onLogout,
  preferences,
  onPreferencesChange,
  tags,
  themeMode,
  resolvedTheme,
  onThemeModeChange
}) {
  const [draft, setDraft] = useState({ ...account });
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);

  async function saveProfile() {
    const next = {
      ...account,
      ...draft,
      name: draft.name.trim() || account.name,
      email: draft.email.trim().toLowerCase() || account.email
    };
    if (password) {
      next.passwordSalt = createPasswordSalt();
      next.passwordHash = await passwordDigest(password, next.passwordSalt);
    }
    saveLocalAccount(next);
    onAccountChange(next);
    setPassword("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <section className="profile-view">
      <div className="profile-hero">
        <div className="profile-avatar">{accountInitials(draft)}</div>
        <div>
          <span className="eyebrow">Perfil y preferencias</span>
          <h1>{draft.name}</h1>
          <p>{draft.club || "Analista independiente"} · {draft.role || "Analista"}</p>
        </div>
        <button className="button ghost" onClick={onLogout}>Cerrar sesión</button>
      </div>

      <article className="settings-section profile-account-card">
        <div className="section-heading">
          <div><span className="eyebrow">Cuenta local</span><h2>Datos del perfil</h2></div>
          {saved && <span className="database-status ready"><i />Cambios guardados</span>}
        </div>
        <div className="settings-grid">
          <label className="field"><span>Nombre</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
          <label className="field"><span>Correo</span><input type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /></label>
          <label className="field"><span>Club u organización</span><input value={draft.club || ""} onChange={(event) => setDraft((current) => ({ ...current, club: event.target.value }))} /></label>
          <label className="field"><span>Rol</span><select value={draft.role || "Analista"} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}><option>Analista</option><option>Entrenador</option><option>Director deportivo</option><option>Jugador</option></select></label>
          <label className="field span-two"><span>Nueva contraseña</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Déjalo vacío para mantener la actual" /></label>
        </div>
        <div className="profile-save-row">
          <button className="button primary" onClick={saveProfile}>Guardar perfil</button>
          <span>La sesión y todos los datos permanecen en este ordenador.</span>
        </div>
      </article>

      <SettingsPanel
        preferences={preferences}
        onChange={onPreferencesChange}
        tags={tags}
        themeMode={themeMode}
        resolvedTheme={resolvedTheme}
        onThemeModeChange={onThemeModeChange}
      />
    </section>
  );
}
