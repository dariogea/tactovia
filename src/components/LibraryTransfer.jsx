import { useRef, useState } from "react";
import {
  libraryDocument,
  mergeLibrary,
  validateLibrary,
} from "../lib/libraryTransfer.js";
import { Icon } from "./Icon.jsx";

export function LibraryTransfer({ library, onChange }) {
  const input = useRef(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(null);
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(libraryDocument(library), null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "Tactovia.library.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Biblioteca exportada, sin vídeos ni análisis.");
  }
  async function read(file) {
    if (!file) return;
    setMessage("");
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error(
          "El archivo supera los 20 MB. Reduce el tamaño de las imágenes.",
        );
      setPending(validateLibrary(JSON.parse(await file.text())));
    } catch (error) {
      setMessage(error.message || "No se pudo leer la biblioteca.");
    }
  }
  return (
    <div className="library-transfer">
      <span>
        <Icon name="shield" size={16} /> Biblioteca personal · independiente del
        análisis
      </span>
      <div>
        <button className="button ghost" onClick={() => input.current?.click()}>
          <Icon name="folder" size={15} /> Importar biblioteca
        </button>
        <button className="button secondary" onClick={download}>
          <Icon name="export" size={15} /> Exportar copia
        </button>
      </div>
      <input
        className="visually-hidden-file"
        ref={input}
        type="file"
        accept=".json"
        onChange={(e) => {
          read(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {message && <p role="status">{message}</p>}
      {pending && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar importación"
          >
            <h2>Importar biblioteca</h2>
            <p>
              {pending.competitions.length} competiciones ·{" "}
              {pending.teams.length} equipos ·{" "}
              {pending.teams.reduce((n, t) => n + t.players.length, 0)}{" "}
              jugadores.
            </p>
            <p>
              Se añadirán los nuevos registros y se actualizarán los que tengan
              el mismo identificador. Se conservarán los demás equipos.
            </p>
            <div className="modal-actions">
              <button className="button ghost" onClick={() => setPending(null)}>
                Cancelar
              </button>
              <button
                className="button primary"
                onClick={() => {
                  onChange(mergeLibrary(library, pending));
                  setPending(null);
                  setMessage("Biblioteca importada correctamente.");
                }}
              >
                Confirmar importación
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
