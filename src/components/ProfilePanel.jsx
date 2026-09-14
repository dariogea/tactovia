import { useState } from "react";
import {
  accountInitials,
  createPasswordSalt,
  passwordDigest,
  readLocalAccounts,
  saveLocalAccount,
} from "../lib/account.js";
import { BrandAbout } from "./Brand.jsx";
import { SettingsPanel } from "./SettingsPanel.jsx";

export function ProfilePanel({
  appVersion = "",
  account,
  onAccountChange,
  onLogout,
  preferences,
  onPreferencesChange,
  tags,
  themeMode,
  resolvedTheme,
  onThemeModeChange,
  paletteMode,
  onPaletteModeChange,
}) {
  const [draft, setDraft] = useState({ ...account });
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setError("");
    if (
      !draft.name.trim() ||
      !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(draft.email.trim())
    ) {
      setError("Indica un nombre y un correo válidos.");
      return;
    }
    if (password && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (
      readLocalAccounts().some(
        (profile) =>
          profile.id !== account.id &&
          profile.email.toLowerCase() === draft.email.trim().toLowerCase(),
      )
    ) {
      setError("Ese correo ya pertenece a otro perfil local.");
      return;
    }
    setSaving(true);
    try {
      const next = {
        ...account,
        ...draft,
        name: draft.name.trim() || account.name,
        email: draft.email.trim().toLowerCase() || account.email,
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
    } catch {
      setError(
        "No se pudo guardar el perfil. Comprueba el espacio disponible.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-view">
      <div className="profile-hero">
        <div className="profile-avatar">{accountInitials(draft)}</div>
        <div>
          <span className="eyebrow">Perfil y preferencias</span>
          <h1>{draft.name}</h1>
          <p>
            {draft.club || "Analista independiente"} ·{" "}
            {draft.role || "Analista"}
          </p>
        </div>
        <button className="button ghost" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>

      {account.isDemo ? (
        <article className="settings-section demo-profile-card">
          <div>
            <span className="eyebrow">Modo demostración</span>
            <h2>Explora sin crear una cuenta</h2>
            <p>
              Puedes cambiar ajustes y probar el flujo completo. El perfil demo
              no guarda credenciales y desaparece al cerrar la sesión.
            </p>
          </div>
          <button className="button secondary" onClick={onLogout}>
            Salir de la demo
          </button>
        </article>
      ) : (
        <article className="settings-section profile-account-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Cuenta local</span>
              <h2>Datos del perfil</h2>
            </div>
            {saved && (
              <span className="database-status ready">
                <i />
                Cambios guardados
              </span>
            )}
          </div>
          <div className="settings-grid">
            <label className="field">
              <span>Nombre</span>
              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Correo</span>
              <input
                type="email"
                value={draft.email}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Club u organización</span>
              <input
                value={draft.club || ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    club: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Rol</span>
              <select
                value={draft.role || "Analista"}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
              >
                <option>Analista</option>
                <option>Entrenador</option>
                <option>Director deportivo</option>
                <option>Jugador</option>
              </select>
            </label>
            <label className="field span-two">
              <span>Nueva contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Déjalo vacío para mantener la actual"
              />
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="profile-save-row">
            <button
              className="button primary"
              disabled={saving}
              onClick={saveProfile}
            >
              Guardar perfil
            </button>
            <span>
              La sesión y todos los datos permanecen en este ordenador.
            </span>
          </div>
        </article>
      )}

      <SettingsPanel
        preferences={preferences}
        onChange={onPreferencesChange}
        tags={tags}
        themeMode={themeMode}
        resolvedTheme={resolvedTheme}
        onThemeModeChange={onThemeModeChange}
        paletteMode={paletteMode}
        onPaletteModeChange={onPaletteModeChange}
      />
      <BrandAbout version={appVersion} />
    </section>
  );
}
