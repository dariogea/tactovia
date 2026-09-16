import { useEffect, useState } from "react";
import { cloudLogin, cloudRegister, cloudRecover, cloudRecoverySession, cloudChangePassword } from "../lib/cloud.js";
import { BrandLogo } from "./Brand.jsx";

export function CloudAccess({ onAuthenticated, onDemo }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const hash = location.hash;
    if (!hash.includes("access_token=")) return;
    history.replaceState(null, "", location.pathname + location.search);
    setBusy(true);
    cloudRecoverySession(hash).then(recovering => {
      if (recovering) setMode("reset");
      else setMessage("Correo confirmado. Ya puedes iniciar sesión.");
    }).catch(error => setMessage(error.message)).finally(() => setBusy(false));
  }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (mode === "recover") {
        await cloudRecover(email); setMessage("Si existe una cuenta, recibirás un correo para recuperar el acceso.");
      } else if (mode === "reset") {
        await cloudChangePassword(password); setPassword(""); setMode("login"); setMessage("Contraseña actualizada. Inicia sesión.");
      } else {
        const account = mode === "register" ? await cloudRegister(email, password, name) : await cloudLogin(email, password);
        if (account) onAuthenticated(account);
        else { setMode("login"); setPassword(""); setMessage("Revisa tu correo para confirmar la cuenta."); }
      }
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <div className="access-centered"><section className="session-stage cloud-access">
    <BrandLogo layout="stacked" surface="light" />
    <h1>{({login:"Tu espacio de análisis",register:"Crea tu cuenta",recover:"Recupera el acceso",reset:"Nueva contraseña"})[mode]}</h1>
    <p>Baloncesto. Datos privados. Vídeos en tu ordenador.</p>
    <form className="access-form" onSubmit={submit}>
      {mode === "register" && <label className="field">Nombre<input required maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} /></label>}
      {mode !== "reset" && <label className="field">Correo<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>}
      {mode !== "recover" && <label className="field">Contraseña<input required type="password" minLength={mode === "login" ? 1 : 10} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e=>setPassword(e.target.value)} /></label>}
      {message && <p role="status">{message}</p>}
      <button className="button primary" disabled={busy}>{busy ? "Un momento…" : mode === "recover" ? "Enviar enlace" : mode === "reset" ? "Actualizar contraseña" : mode === "register" ? "Crear cuenta" : "Entrar"}</button>
    </form>
    {mode !== "reset" && <div className="cloud-access-actions">
      <button className="button ghost" disabled={busy} onClick={()=>{setMode(mode === "login" ? "register" : "login");setMessage("");setPassword("");}}>{mode === "login" ? "Crear cuenta" : "Volver al acceso"}</button>
      <button className="button ghost" disabled={busy} onClick={()=>{setMode("recover");setMessage("");}}>Olvidé mi contraseña</button>
      <button className="button secondary demo-access-button" disabled={busy} onClick={onDemo}>Entrar en la demo</button>
    </div>}
  </section></div>;
}
