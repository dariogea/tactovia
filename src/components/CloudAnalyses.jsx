import { useEffect, useState } from "react";
import {
  deleteCloudAnalysis,
  listCloudAnalyses,
  readCloudAnalysis,
} from "../lib/cloud.js";

export function CloudAnalyses({ onOpen, onClose, onLocal, onCopy }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    listCloudAnalyses().then(data => { if (active) setRows(data); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);
  async function open(id) {
    setBusy(true); setError("");
    try { await onOpen(await readCloudAnalysis(id)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function remove(row) {
    if (
      !window.confirm(
        `¿Eliminar «${row.title}» de tu espacio online? Esta acción no afecta a los archivos descargados.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await deleteCloudAnalysis(row.id);
      setRows((current) => current.filter((item) => item.id !== row.id));
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }
  return <main className="access-screen"><div className="access-centered"><section className="session-stage">
    <h1>Mis análisis</h1><p>Hasta 100 análisis recientes. El vídeo se selecciona desde este ordenador.</p>
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Cargando…</p>}
    {!busy && !error && !rows.length && <p>Aún no has guardado análisis online.</p>}
    <div className="cloud-analysis-list">{rows.map(row => <article key={row.id}>
      <button className="cloud-analysis-open" disabled={busy} onClick={()=>open(row.id)}>
        <strong>{row.title}</strong><small>{new Date(row.updated_at).toLocaleString("es")}</small>
      </button>
      <button className="button ghost" disabled={busy} onClick={()=>remove(row)} aria-label={`Eliminar ${row.title}`}>Eliminar</button>
    </article>)}</div>
    <div className="cloud-access-actions">
      <button className="button secondary" disabled={busy} onClick={onLocal}>Importar archivo local</button>
      <button className="button secondary" disabled={busy} onClick={onCopy}>Guardar análisis actual como copia</button>
      <button className="button ghost" disabled={busy} onClick={onClose}>Volver</button>
    </div>
  </section></div></main>;
}
