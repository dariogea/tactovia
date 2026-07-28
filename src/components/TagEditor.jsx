import { useMemo, useState } from "react";
import { tagPalette } from "../lib/defaults.js";

export function TagEditor({ tags, courtOptions, onClose, onSave }) {
  const [draft, setDraft] = useState(tags.map((tag) => ({ ...tag })));
  const [courtDraft, setCourtDraft] = useState({
    visible: courtOptions?.visible !== false,
    showLabels: courtOptions?.showLabels !== false,
    position: courtOptions?.position === "below" ? "below" : "above"
  });
  const [error, setError] = useState("");

  const duplicateShortcuts = useMemo(() => {
    const used = new Map();
    draft.forEach((tag) => {
      if (!tag.shortcut) return;
      used.set(tag.shortcut, (used.get(tag.shortcut) || 0) + 1);
    });
    return new Set([...used.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  }, [draft]);

  function updateTag(id, patch) {
    setDraft((current) =>
      current.map((tag) => (tag.id === id ? { ...tag, ...patch } : tag))
    );
  }

  function addTag() {
    const color = tagPalette[draft.length % tagPalette.length];
    setDraft((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "Nueva etiqueta",
        color,
        mode: "point",
        shortcut: "",
        before: 5,
        after: 3
      }
    ]);
  }

  function commit() {
    if (draft.length === 0) {
      setError("La plantilla necesita al menos una etiqueta.");
      return;
    }
    if (draft.some((tag) => !tag.name.trim())) {
      setError("Todas las etiquetas necesitan un nombre.");
      return;
    }
    if (duplicateShortcuts.size > 0) {
      setError("No se puede repetir un atajo de teclado.");
      return;
    }
    onSave(
      draft.map((tag) => ({
        ...tag,
        name: tag.name.trim(),
        before: Math.max(0, Number(tag.before) || 0),
        after: Math.max(0, Number(tag.after) || 0)
      })),
      courtDraft
    );
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal tag-editor" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Plantilla</span>
            <h2>Configurar etiquetas</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <p className="subtle">
          Los márgenes añaden tiempo antes y después de cada acción. En los intervalos
          se aplican al inicio y al final.
        </p>

        <article className="court-editor-card">
          <div>
            <span className="eyebrow">Mapa de tiro</span>
            <strong>Pista y zonas de etiquetado</strong>
            <small>
              Puedes ocultarla cuando no estés analizando tiros. Un doble clic
              sobre la zona activa deshace la selección.
            </small>
          </div>
          <label className="switch-control">
            <input
              type="checkbox"
              checked={courtDraft.visible}
              onChange={(event) =>
                setCourtDraft((current) => ({
                  ...current,
                  visible: event.target.checked
                }))
              }
            />
            <span>Mostrar pista</span>
          </label>
          <label className="switch-control">
            <input
              type="checkbox"
              checked={courtDraft.showLabels}
              disabled={!courtDraft.visible}
              onChange={(event) =>
                setCourtDraft((current) => ({
                  ...current,
                  showLabels: event.target.checked
                }))
              }
            />
            <span>Mostrar nombres de las zonas</span>
          </label>
          <label className="field court-position-field">
            <span>Posición en el panel</span>
            <select
              value={courtDraft.position}
              disabled={!courtDraft.visible}
              onChange={(event) =>
                setCourtDraft((current) => ({
                  ...current,
                  position: event.target.value
                }))
              }
            >
              <option value="above">Encima de las etiquetas</option>
              <option value="below">Debajo de las etiquetas</option>
            </select>
          </label>
        </article>

        <div className="tag-editor-list">
          {draft.map((tag) => (
            <article className="tag-editor-row" key={tag.id}>
              <input
                className="color-input"
                type="color"
                value={tag.color}
                onChange={(event) => updateTag(tag.id, { color: event.target.value })}
                aria-label={`Color de ${tag.name}`}
              />
              <label className="field grow">
                <span>Nombre</span>
                <input
                  value={tag.name}
                  onChange={(event) => updateTag(tag.id, { name: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Comportamiento</span>
                <select
                  value={tag.mode}
                  onChange={(event) => updateTag(tag.id, { mode: event.target.value })}
                >
                  <option value="point">Instante</option>
                  <option value="interval">Intervalo</option>
                </select>
              </label>
              <label className="field compact-field">
                <span>Antes</span>
                <input
                  type="number"
                  min="0"
                  max="120"
                  step="0.5"
                  value={tag.before}
                  onChange={(event) => updateTag(tag.id, { before: event.target.value })}
                />
              </label>
              <label className="field compact-field">
                <span>Después</span>
                <input
                  type="number"
                  min="0"
                  max="120"
                  step="0.5"
                  value={tag.after}
                  onChange={(event) => updateTag(tag.id, { after: event.target.value })}
                />
              </label>
              <label className="field shortcut-field">
                <span>Atajo</span>
                <input
                  className={duplicateShortcuts.has(tag.shortcut) ? "invalid" : ""}
                  maxLength="1"
                  value={tag.shortcut}
                  onChange={(event) =>
                    updateTag(tag.id, { shortcut: event.target.value.toUpperCase() })
                  }
                />
              </label>
              <button
                className="icon-button danger"
                onClick={() =>
                  setDraft((current) => current.filter((item) => item.id !== tag.id))
                }
                aria-label={`Eliminar ${tag.name}`}
              >
                ×
              </button>
            </article>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="button secondary" onClick={addTag}>
            + Añadir etiqueta
          </button>
          <div className="spacer" />
          <button className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" onClick={commit}>
            Guardar plantilla
          </button>
        </div>
      </section>
    </div>
  );
}
