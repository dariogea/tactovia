import { useMemo, useState } from "react";

export function ExportClipsModal({
  events,
  selectedIds,
  playlists = [],
  initialPlaylistId = "",
  onClose,
  onExport,
}) {
  const [scope, setScope] = useState(
    initialPlaylistId ? "playlist" : selectedIds.size > 0 ? "selected" : "all",
  );
  const [groupBy, setGroupBy] = useState("none");
  const [sortBy, setSortBy] = useState(initialPlaylistId ? "playlist" : "time");
  const [playlistId, setPlaylistId] = useState(
    initialPlaylistId || playlists[0]?.id || "",
  );
  const playlist = playlists.find((p) => p.id === playlistId);
  const [outputMode, setOutputMode] = useState("individual");
  const [quality, setQuality] = useState("balanced");
  const [tagId, setTagId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");

  const options = useMemo(
    () => ({
      tags: [
        ...new Map(
          events.map((event) => [
            event.tagId || event.tagName,
            { id: event.tagId || event.tagName, name: event.tagName },
          ]),
        ).values(),
      ],
      teams: [
        ...new Map(
          events
            .filter((event) => event.teamId || event.team)
            .map((event) => [
              event.teamId || event.team,
              { id: event.teamId || event.team, name: event.team },
            ]),
        ).values(),
      ],
      players: [
        ...new Map(
          events
            .filter((event) => event.playerId || event.player)
            .map((event) => [
              event.playerId || event.player,
              { id: event.playerId || event.player, name: event.player },
            ]),
        ).values(),
      ],
    }),
    [events],
  );
  const count = events.filter((event) => {
    if (scope === "selected" && !selectedIds.has(event.id)) return false;
    if (scope === "playlist" && !playlist?.eventIds.includes(event.id))
      return false;
    if (tagId && (event.tagId || event.tagName) !== tagId) return false;
    if (teamId && (event.teamId || event.team) !== teamId) return false;
    if (playerId && (event.playerId || event.player) !== playerId) return false;
    return true;
  }).length;
  const preview = {
    none: "una carpeta principal",
    tag: "carpetas por etiqueta",
    team: "carpetas por equipo",
    player: "carpetas por jugador",
    tagTeam: "etiqueta / equipo",
    teamPlayer: "equipo / jugador",
  }[groupBy];

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal export-modal video-export-studio"
        role="dialog"
        aria-modal="true"
        aria-label="Crear una entrega de vídeo"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Video Studio</span>
            <h2>Crear una entrega de vídeo</h2>
            <p>
              Filtra, organiza y decide si quieres clips separados o un único
              reel.
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="clip-preset-row">
          <span>Recetas rápidas</span>
          <button
            onClick={() => {
              setScope("all");
              setOutputMode("individual");
              setGroupBy("player");
              setSortBy("player");
            }}
          >
            Dossier por jugador
          </button>
          <button
            onClick={() => {
              setScope("all");
              setOutputMode("individual");
              setGroupBy("team");
              setSortBy("team");
            }}
          >
            Carpetas por equipo
          </button>
          <button
            onClick={() => {
              setScope(selectedIds.size ? "selected" : "all");
              setOutputMode("highlights");
              setGroupBy("none");
              setSortBy("time");
            }}
          >
            Reel de highlights
          </button>
        </div>
        <div className="video-export-layout">
          <div className="export-options-grid">
            <fieldset>
              <legend>Qué acciones incluir</legend>
              <label className="radio-option">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                />
                <span>
                  <strong>Todas</strong>
                  <small>{events.length} acciones disponibles</small>
                </span>
              </label>
              <label
                className={`radio-option ${selectedIds.size === 0 ? "disabled" : ""}`}
              >
                <input
                  type="radio"
                  name="scope"
                  disabled={!selectedIds.size}
                  checked={scope === "selected"}
                  onChange={() => setScope("selected")}
                />
                <span>
                  <strong>Acciones seleccionadas</strong>
                  <small>
                    {selectedIds.size}{" "}
                    {selectedIds.size === 1
                      ? "acción marcada"
                      : "acciones marcadas"}
                  </small>
                </span>
              </label>
              {playlists.length > 0 && (
                <label className="radio-option">
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === "playlist"}
                    onChange={() => {
                      setScope("playlist");
                      setSortBy("playlist");
                    }}
                  />
                  <span>
                    <strong>Lista guardada</strong>
                    <select
                      aria-label="Lista para exportar"
                      value={playlistId}
                      onChange={(e) => {
                        setPlaylistId(e.target.value);
                        setScope("playlist");
                        setSortBy("playlist");
                      }}
                    >
                      {playlists.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
              )}
            </fieldset>
            <div className="clip-filter-grid">
              <label className="field">
                <span>Etiqueta</span>
                <select
                  value={tagId}
                  onChange={(event) => setTagId(event.target.value)}
                >
                  <option value="">Todas</option>
                  {options.tags.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Equipo</span>
                <select
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                >
                  <option value="">Todos</option>
                  {options.teams.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name || "Sin equipo"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Jugador</span>
                <select
                  value={playerId}
                  onChange={(event) => setPlayerId(event.target.value)}
                >
                  <option value="">Todos</option>
                  {options.players.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name || "Sin jugador"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <aside className="video-output-options">
            <span className="eyebrow">Salida</span>
            <div className="segmented-control">
              <button
                className={outputMode === "individual" ? "active" : ""}
                onClick={() => setOutputMode("individual")}
              >
                Clips separados
              </button>
              <button
                className={outputMode === "highlights" ? "active" : ""}
                onClick={() => {
                  setOutputMode("highlights");
                  setGroupBy("none");
                }}
              >
                Un solo vídeo
              </button>
            </div>
            <label className="field">
              <span>Calidad</span>
              <select
                value={quality}
                onChange={(event) => setQuality(event.target.value)}
              >
                <option value="high">Alta · archivo mayor</option>
                <option value="balanced">Equilibrada · recomendada</option>
                <option value="compact">Compacta · compartir rápido</option>
              </select>
            </label>
            <label className="field">
              <span>Orden</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                {scope === "playlist" && (
                  <option value="playlist">Orden de la lista</option>
                )}
                <option value="time">Cronológico</option>
                <option value="tag">Etiqueta</option>
                <option value="team">Equipo</option>
                <option value="player">Jugador</option>
              </select>
            </label>
            {outputMode === "individual" && (
              <label className="field">
                <span>Carpetas</span>
                <select
                  value={groupBy}
                  onChange={(event) => setGroupBy(event.target.value)}
                >
                  <option value="none">Sin subcarpetas</option>
                  <option value="tag">Por etiqueta</option>
                  <option value="team">Por equipo</option>
                  <option value="player">Por jugador</option>
                  <option value="tagTeam">Etiqueta y equipo</option>
                  <option value="teamPlayer">Equipo y jugador</option>
                </select>
              </label>
            )}
          </aside>
        </div>
        <div className="export-preview-line">
          <strong>{count}</strong>
          <span>
            {count === 1 ? "acción" : "acciones"} ·{" "}
            {outputMode === "highlights"
              ? "1 reel con el orden elegido"
              : `${count} ${count === 1 ? "clip" : "clips"} en ${preview}`}
          </span>
          <em>MP4 · H.264 · audio incluido si existe</em>
        </div>
        <div className="modal-actions">
          <div className="spacer" />
          <button className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="button primary"
            disabled={count === 0}
            onClick={() =>
              onExport({
                scope,
                playlistId,
                groupBy,
                sortBy:
                  scope === "playlist"
                    ? sortBy
                    : sortBy === "playlist"
                      ? "time"
                      : sortBy,
                outputMode,
                quality,
                tagId,
                teamId,
                playerId,
              })
            }
          >
            Elegir destino y exportar
          </button>
        </div>
      </section>
    </div>
  );
}
