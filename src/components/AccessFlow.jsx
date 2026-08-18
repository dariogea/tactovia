import { useState } from "react";
import {
  accountInitials,
  createPasswordSalt,
  passwordDigest,
  readLocalAccounts,
  setActiveLocalAccount,
  saveLocalAccount
} from "../lib/account.js";
import { BrandLogo } from "./Brand.jsx";

const sports = [
  {
    id: "basketball",
    name: "Baloncesto",
    description: "Etiquetado, mapa de tiro y estadísticas avanzadas",
    symbol: "◉",
    available: true
  },
  {
    id: "handball",
    name: "Balonmano",
    description: "Plantillas y campos específicos próximamente",
    symbol: "◆",
    available: false
  },
  {
    id: "football",
    name: "Fútbol",
    description: "Plantillas y campos específicos próximamente",
    symbol: "⬡",
    available: false
  }
];

function AccessBrand({ inverse = false }) {
  return (
    <div className={`access-brand ${inverse ? "inverse" : ""}`}>
      <BrandLogo
        layout="stacked"
        surface={inverse ? "dark" : "light"}
        className="access-brand-logo"
      />
      <span>Plataforma de análisis deportivo</span>
    </div>
  );
}

function AccountStage({ account, onAuthenticated, onAccountChange, onDemo }) {
  const accounts = readLocalAccounts();
  const [mode, setMode] = useState(accounts.length ? "login" : "register");
  const creating = mode === "register";
  const [selectedAccountId, setSelectedAccountId] = useState(
    account?.id || accounts[0]?.id || ""
  );
  const selectedAccount =
    accounts.find((candidate) => candidate.id === selectedAccountId) ||
    account ||
    null;
  const [name, setName] = useState("");
  const [email, setEmail] = useState(selectedAccount?.email || "");
  const [password, setPassword] = useState("");
  const [club, setClub] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!email.trim() || password.length < 6 || (creating && !name.trim())) {
      setError(
        creating
          ? "Indica tu nombre, un correo y una contraseña de al menos 6 caracteres."
          : "Introduce el correo y la contraseña de este perfil."
      );
      return;
    }
    setBusy(true);
    if (creating) {
      if (
        accounts.some(
          (candidate) =>
            candidate.email.toLowerCase() === email.trim().toLowerCase()
        )
      ) {
        setError("Ya existe un perfil local con ese correo.");
        setBusy(false);
        return;
      }
      const passwordSalt = createPasswordSalt();
      const passwordHash = await passwordDigest(password, passwordSalt);
      const next = saveLocalAccount({
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        club: club.trim(),
        role: "Analista",
        avatar: "",
        passwordHash,
        passwordSalt,
        createdAt: new Date().toISOString()
      });
      onAccountChange(next);
      onAuthenticated(next);
    } else {
      if (!selectedAccount) {
        setError("Selecciona un perfil o crea uno nuevo.");
        setBusy(false);
        return;
      }
      const passwordHash = await passwordDigest(
        password,
        selectedAccount.passwordSalt || ""
      );
      if (
        email.trim().toLowerCase() === selectedAccount.email.toLowerCase() &&
        passwordHash === selectedAccount.passwordHash
      ) {
        const next = setActiveLocalAccount(selectedAccount.id);
        onAccountChange(next);
        onAuthenticated(next);
      } else {
        setError("El correo o la contraseña no son correctos.");
      }
    }
    setBusy(false);
  }

  return (
    <div className="access-layout">
      <section className="access-story">
        <AccessBrand inverse />
        <div className="access-story-copy">
          <span className="eyebrow">Del vídeo a la decisión</span>
          <h1>Ve el juego.<br />Decide mejor.</h1>
          <p>
            Etiqueta cada posesión, conecta jugadores y equipos y convierte el
            partido en una biblioteca de conocimiento.
          </p>
          <div className="access-feature-row">
            <span>Vídeo local</span>
            <span>Datos privados</span>
            <span>Trabajo profesional</span>
          </div>
        </div>
        <div className="access-court-art" aria-hidden="true">
          <i /><i /><i />
        </div>
      </section>
      <section className="access-card">
        <div className="access-card-heading">
          <span className="access-step">01</span>
          <div>
            <span className="eyebrow">{creating ? "Primer acceso" : "Bienvenido de nuevo"}</span>
            <h2>{creating ? "Crea tu espacio" : "Accede a tu espacio"}</h2>
            <p>
              {creating
                ? "Este perfil protege la entrada y permanece únicamente en este ordenador."
                : "Inicia sesión para abrir tu espacio de scouting."}
            </p>
          </div>
        </div>
        <div className="access-mode-switch segmented-control">
          <button
            type="button"
            className={!creating ? "active" : ""}
            onClick={() => {
              setMode("login");
              const next = selectedAccount || accounts[0];
              setSelectedAccountId(next?.id || "");
              setEmail(next?.email || "");
              setError("");
            }}
            disabled={accounts.length === 0}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={creating ? "active" : ""}
            onClick={() => {
              setMode("register");
              setName("");
              setEmail("");
              setPassword("");
              setError("");
            }}
          >
            Crear cuenta
          </button>
        </div>
        {!creating && accounts.length > 0 && (
          <div className="account-picker">
            {accounts.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                className={candidate.id === selectedAccount?.id ? "active" : ""}
                onClick={() => {
                  setSelectedAccountId(candidate.id);
                  setEmail(candidate.email);
                  setPassword("");
                }}
              >
                <span>{accountInitials(candidate)}</span>
                <div>
                  <strong>{candidate.name}</strong>
                  <small>{candidate.club || candidate.email}</small>
                </div>
                <i>{candidate.id === selectedAccount?.id ? "✓" : ""}</i>
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="access-form">
          {creating && (
            <>
              <label className="field">
                <span>Nombre</span>
                <input value={name} onChange={(event) => setName(event.target.value)} autoFocus placeholder="Tu nombre completo" />
              </label>
              <label className="field">
                <span>Club u organización</span>
                <input value={club} onChange={(event) => setClub(event.target.value)} placeholder="Opcional" />
              </label>
            </>
          )}
          <label className="field">
            <span>Correo</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus={!creating} placeholder="nombre@club.com" />
          </label>
          <label className="field">
            <span>Contraseña local</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button primary access-submit" disabled={busy}>
            {busy ? "Comprobando…" : creating ? "Crear perfil y continuar" : "Entrar a Tactovia"}
          </button>
        </form>
        <div className="demo-access-divider"><span>probar sin cuenta</span></div>
        <button type="button" className="button demo-access-button" onClick={onDemo}>
          <span>▶</span>
          Entrar en la demo
        </button>
        <small className="demo-access-help">
          Espacio temporal: al salir no conserva perfiles ni históricos.
        </small>
        <small className="access-privacy-note">
          Los perfiles y sus históricos están separados en este dispositivo.
          Tactovia no envía credenciales, vídeos ni análisis a Internet.
        </small>
      </section>
    </div>
  );
}

function SportStage({ account, onSelect }) {
  return (
    <div className="access-centered">
      <AccessBrand />
      <section className="sport-stage">
        <div className="access-card-heading centered">
          <span className="access-step">02</span>
          <div>
            <span className="eyebrow">Configurar espacio</span>
            <h1>¿Qué deporte vas a analizar?</h1>
            <p>Prepararemos las etiquetas, la pista y las métricas adecuadas.</p>
          </div>
        </div>
        <div className="sport-grid">
          {sports.map((sport) => (
            <button
              key={sport.id}
              className={`sport-card ${sport.available ? "" : "disabled"}`}
              disabled={!sport.available}
              onClick={() => onSelect(sport.id)}
            >
              <span>{sport.symbol}</span>
              <div>
                <strong>{sport.name}</strong>
                <small>{sport.description}</small>
              </div>
              <em>{sport.available ? "Seleccionar →" : "Próximamente"}</em>
            </button>
          ))}
        </div>
        <div className="sport-account-line">
          <span>{accountInitials(account)}</span>
          Sesión iniciada como <strong>{account.name}</strong>
        </div>
      </section>
    </div>
  );
}

function SessionStage({ project, canContinue, onNew, onContinue, onOpen }) {
  return (
    <div className="access-centered">
      <AccessBrand />
      <section className="session-stage">
        <div className="access-card-heading centered">
          <span className="access-step">03</span>
          <div>
            <span className="eyebrow">Sesión de trabajo</span>
            <h1>¿Cómo quieres empezar?</h1>
            <p>Crea un análisis o retoma exactamente el punto donde lo dejaste.</p>
          </div>
        </div>
        <div className="session-choice-grid">
          <button className="session-choice featured" onClick={onNew}>
            <span>＋</span>
            <div>
              <strong>Nueva sesión</strong>
              <small>Empieza con un análisis limpio y selecciona el vídeo.</small>
            </div>
            <em>Crear análisis</em>
          </button>
          <button className="session-choice" disabled={!canContinue} onClick={onContinue}>
            <span>↗</span>
            <div>
              <strong>Continuar sesión</strong>
              <small>
                {canContinue
                  ? `${project.projectName} · ${project.events.length} acciones`
                  : "No hay una sesión reciente con contenido."}
              </small>
            </div>
            <em>{canContinue ? "Continuar" : "No disponible"}</em>
          </button>
          <button className="session-choice" onClick={onOpen}>
            <span>⌁</span>
            <div>
              <strong>Abrir archivo guardado</strong>
              <small>Selecciona un análisis .scout guardado en este u otro equipo.</small>
            </div>
            <em>Buscar archivo</em>
          </button>
        </div>
      </section>
    </div>
  );
}

export function AccessFlow({
  account,
  authenticated,
  sport,
  project,
  canContinue,
  onAccountChange,
  onAuthenticated,
  onSelectSport,
  onDemo,
  onNew,
  onContinue,
  onOpen
}) {
  if (!authenticated) {
    return (
      <main className="access-screen">
        <AccountStage
          account={account}
          onAccountChange={onAccountChange}
          onAuthenticated={onAuthenticated}
          onDemo={onDemo}
        />
      </main>
    );
  }
  if (!sport) {
    return (
      <main className="access-screen">
        <SportStage account={account} onSelect={onSelectSport} />
      </main>
    );
  }
  return (
    <main className="access-screen">
      <SessionStage
        project={project}
        canContinue={canContinue}
        onNew={onNew}
        onContinue={onContinue}
        onOpen={onOpen}
      />
    </main>
  );
}
