import { useMemo, useState } from "react";

export function ExportClipsModal({
  events,
  selectedIds,
  onClose,
  onExport
}) {
  const [scope, setScope] = useState(selectedIds.size > 0 ? "selected" : "all");
  const [groupBy, setGroupBy] = useState("none");
  const [sortBy, setSortBy] = useState("time");
  const count = scope === "selected" ? selectedIds.size : events.length;

  const preview = useMemo(() => {
    const labels = {
      none: "Todos los clips en una carpeta",
      tag: "Una carpeta por etiqueta",
      team: "Una carpeta por equipo",
      player: "Una carpeta por jugador",
      tagTeam: "Etiqueta / equipo",
      teamPlayer: "Equipo / jugador"
    };
    return labels[groupBy];
  }, [groupBy]);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal export-modal" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Exportación</span>
            <h2>Preparar clips</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="export-options-grid">
          <div className="clip-preset-row">
            <span>Configuraciones rápidas</span>
            <button onClick={() => { setScope("all"); setGroupBy("player"); setSortBy("player"); }}>
              Por jugador
            </button>
            <button onClick={() => { setScope("all"); setGroupBy("team"); setSortBy("team"); }}>
              Por equipo
            </button>
            <button onClick={() => { setScope("all"); setGroupBy("none"); setSortBy("time"); }}>
              Cronológico
            </button>
          </div>
          <fieldset>
            <legend>Qué acciones exportar</legend>
            <label className="radio-option">
              <input
                type="radio"
                name="scope"
                value="all"
                checked={scope === "all"}
                onChange={() => setScope("all")}
              />
              <span>
                <strong>Todas las acciones</strong>
                <small>{events.length} clips</small>
              </span>
            </label>
            <label className={`radio-option ${selectedIds.size === 0 ? "disabled" : ""}`}>
              <input
                type="radio"
                name="scope"
                value="selected"
                disabled={selectedIds.size === 0}
                checked={scope === "selected"}
                onChange={() => setScope("selected")}
              />
              <span>
                <strong>Solo las seleccionadas</strong>
                <small>{selectedIds.size} clips</small>
              </span>
            </label>
          </fieldset>

          <label className="field">
            <span>Organizar carpetas</span>
            <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
              <option value="none">Sin subcarpetas</option>
              <option value="tag">Por etiqueta</option>
              <option value="team">Por equipo</option>
              <option value="player">Por jugador</option>
              <option value="tagTeam">Por etiqueta y equipo</option>
              <option value="teamPlayer">Por equipo y jugador</option>
            </select>
          </label>

          <label className="field">
            <span>Orden y numeración</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="time">Cronológico</option>
              <option value="tag">Etiqueta</option>
              <option value="team">Equipo</option>
              <option value="player">Jugador</option>
            </select>
          </label>
        </div>

        <div className="export-preview-line">
          <strong>{count}</strong>
          <span>{count === 1 ? "clip" : "clips"} · {preview}</span>
        </div>

        <div className="modal-actions">
          <div className="spacer" />
          <button className="button ghost" onClick={onClose}>Cancelar</button>
          <button
            className="button primary"
            disabled={count === 0}
            onClick={() => onExport({ scope, groupBy, sortBy })}
          >
            Elegir carpeta y exportar
          </button>
        </div>
      </section>
    </div>
  );
}
