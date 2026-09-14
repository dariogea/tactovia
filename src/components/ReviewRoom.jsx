import { useEffect, useMemo, useRef, useState } from "react";
import { filterEvents, periods, periodLabel } from "../lib/basketball.js";
import { formatTime } from "../lib/analysis.js";
import { Icon } from "./Icon.jsx";

export function ReviewRoom({
  project,
  videoUrl,
  selectedIds,
  onSelectIds,
  onFavorite,
  onEdit,
  onPlaylists,
  onExport,
  onRelink,
}) {
  const [filters, setFilters] = useState({
    query: "",
    teamId: "",
    tagId: "",
    period: "",
    favorites: false,
  });
  const [playlistId, setPlaylistId] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(100);
  useEffect(() => setVisibleLimit(100), [playlistId, filters]);
  const [playlistName, setPlaylistName] = useState("");
  const [activeId, setActiveId] = useState(() => [...selectedIds][0] || "");
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const playlist = (project.playlists || []).find((p) => p.id === playlistId);
  const events = useMemo(() => {
    const eventMap = new Map(project.events.map((e) => [e.id, e]));
    const ordered = playlist
      ? playlist.eventIds.map((id) => eventMap.get(id)).filter(Boolean)
      : project.events.slice().sort((a, b) => a.start - b.start);
    return filterEvents(ordered, filters);
  }, [project.events, playlist, filters]);
  const active = events.find((e) => e.id === activeId) || events[0];
  const activeIndex = events.findIndex((e) => e.id === active?.id);
  const selectedVisible = events.filter((e) => selectedIds.has(e.id)).length;
  function cue(play = false) {
    const video = videoRef.current;
    if (!video || !active || video.readyState === 0) return;
    video.currentTime = Math.min(
      active.start,
      Number.isFinite(video.duration) ? video.duration : active.start,
    );
    if (play)
      video.play().catch(() => setError("Pulsa reproducir para comenzar."));
  }
  useEffect(() => {
    cue(autoplay);
    setError("");
  }, [active?.id, videoUrl]);
  function step(direction) {
    const next = events[activeIndex + direction];
    if (next) setActiveId(next.id);
  }
  function toggleVisible() {
    const next = new Set(selectedIds);
    const all = events.length > 0 && selectedVisible === events.length;
    events.forEach((e) => (all ? next.delete(e.id) : next.add(e.id)));
    onSelectIds(next);
  }
  function savePlaylist() {
    if (!playlistName.trim() || !selectedIds.size) return;
    const eventIds = project.events
      .filter((e) => selectedIds.has(e.id))
      .sort((a, b) => a.start - b.start)
      .map((e) => e.id);
    const next = {
      id: crypto.randomUUID(),
      name: playlistName.trim(),
      eventIds,
    };
    onPlaylists([...(project.playlists || []), next]);
    setPlaylistName("");
    setPlaylistId(next.id);
  }
  function moveClip(id, direction) {
    if (!playlist) return;
    const ids = [...playlist.eventIds];
    const index = ids.indexOf(id),
      target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onPlaylists(
      project.playlists.map((p) =>
        p.id === playlist.id ? { ...p, eventIds: ids } : p,
      ),
    );
  }
  return (
    <section className="review-page">
      <header className="page-intro">
        <div>
          <span className="eyebrow">Sala de revisión</span>
          <h1>De las acciones a las ideas.</h1>
          <p>
            Revisa cada clip, destaca lo importante y construye tu sesión de
            vídeo.
          </p>
        </div>
        <div className="review-export-actions">
          {playlist && (
            <button
              className="button secondary"
              disabled={!events.length}
              onClick={() => onExport(playlist.id)}
            >
              Exportar lista
            </button>
          )}
          <button
            className="button primary"
            disabled={!selectedIds.size}
            onClick={() => onExport("")}
          >
            <Icon name="export" size={16} /> Exportar selección ·{" "}
            {selectedIds.size}
          </button>
        </div>
      </header>
      <div className="review-filters">
        <label className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Buscar acciones"
            placeholder="Buscar jugador, acción o nota…"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          />
        </label>
        <select
          aria-label="Filtrar equipo"
          value={filters.teamId}
          onChange={(e) => setFilters({ ...filters, teamId: e.target.value })}
        >
          <option value="">Todos los equipos</option>
          {project.teams
            .filter((t) =>
              [project.match?.homeTeamId, project.match?.awayTeamId].includes(
                t.id,
              ),
            )
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Filtrar etiqueta"
          value={filters.tagId}
          onChange={(e) => setFilters({ ...filters, tagId: e.target.value })}
        >
          <option value="">Todas las etiquetas</option>
          {project.template.tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar periodo"
          value={filters.period}
          onChange={(e) => setFilters({ ...filters, period: e.target.value })}
        >
          <option value="">Todos los periodos</option>
          {[...periods, "unassigned"].map((p) => (
            <option key={p} value={p}>
              {periodLabel(p === "unassigned" ? "" : p)}
            </option>
          ))}
        </select>
        <button
          className={`button ${filters.favorites ? "primary" : "ghost"}`}
          aria-pressed={filters.favorites}
          onClick={() =>
            setFilters({ ...filters, favorites: !filters.favorites })
          }
        >
          <Icon name="star" size={16} /> Destacadas
        </button>
      </div>
      <div className="review-layout">
        <aside className="playlist-panel">
          <header>
            <Icon name="clips" />
            <h2>Mis listas</h2>
          </header>
          <button
            className={!playlistId ? "active" : ""}
            onClick={() => setPlaylistId("")}
          >
            Todas las acciones <b>{project.events.length}</b>
          </button>
          {(project.playlists || []).map((p) => (
            <button
              key={p.id}
              className={playlistId === p.id ? "active" : ""}
              onClick={() => setPlaylistId(p.id)}
            >
              {p.name}
              <b>
                {
                  p.eventIds.filter((id) =>
                    project.events.some((e) => e.id === id),
                  ).length
                }
              </b>
            </button>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              savePlaylist();
            }}
          >
            <label htmlFor="playlist-name">Guardar selección como lista</label>
            <input
              id="playlist-name"
              placeholder="Ej. Defensa del bloqueo"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              maxLength={80}
            />
            <button
              className="button secondary"
              disabled={!selectedIds.size || !playlistName.trim()}
            >
              <Icon name="plus" size={15} /> Crear lista
            </button>
          </form>
          {playlist && (
            <button
              className="text-button danger-text"
              onClick={() => {
                if (
                  window.confirm(
                    `¿Eliminar la lista «${playlist.name}»? Las acciones se conservarán.`,
                  )
                ) {
                  onPlaylists(
                    project.playlists.filter((p) => p.id !== playlist.id),
                  );
                  setPlaylistId("");
                }
              }}
            >
              Eliminar lista
            </button>
          )}
        </aside>
        <div className="review-stage">
          <div className="review-player">
            {videoUrl && active ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                preload="metadata"
                onLoadedMetadata={() => cue(autoplay)}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (
                    active &&
                    v.currentTime >= active.end - 0.03 &&
                    !v.paused
                  ) {
                    if (loop) {
                      v.currentTime = active.start;
                    } else if (autoplay && activeIndex < events.length - 1) {
                      v.pause();
                      step(1);
                    } else {
                      v.pause();
                    }
                  }
                }}
                onError={() =>
                  setError(
                    "No se puede reproducir este archivo. Vuelve a vincular el vídeo.",
                  )
                }
              />
            ) : (
              <div className="calm-empty">
                <Icon name="video" size={42} />
                <h2>
                  {active
                    ? "Vincula el vídeo para revisar clips"
                    : "Tu sala de vídeo"}
                </h2>
                <p>
                  {active
                    ? "Las etiquetas y las listas están disponibles."
                    : "Registra acciones para empezar a construir tu selección."}
                </p>
                {active && (
                  <button className="button primary" onClick={onRelink}>
                    Vincular vídeo
                  </button>
                )}
              </div>
            )}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="clip-inspector">
            <div>
              <span className="eyebrow">
                {active
                  ? `${activeIndex + 1} / ${events.length} · ${periodLabel(active.period)}`
                  : "Sin acciones"}
              </span>
              <h2>{active?.tagName || "Selecciona un clip"}</h2>
              <p>
                {[active?.player, active?.team].filter(Boolean).join(" · ")}
              </p>
            </div>
            {active && (
              <div className="clip-tools">
                <button
                  className="icon-button"
                  aria-label="Destacar clip"
                  aria-pressed={Boolean(active.favorite)}
                  onClick={() => onFavorite(active.id)}
                >
                  <Icon
                    name="star"
                    fill={active.favorite ? "currentColor" : "none"}
                  />
                </button>
                <button
                  className="button secondary"
                  onClick={() => onEdit(active)}
                >
                  Editar
                </button>
              </div>
            )}
          </div>
          {active?.notes && <p className="clip-note">{active.notes}</p>}
          <div className="review-controls">
            <button
              className="button ghost"
              disabled={activeIndex <= 0}
              onClick={() => step(-1)}
            >
              ← Anterior
            </button>
            <label>
              <input
                type="checkbox"
                checked={autoplay}
                onChange={(e) => setAutoplay(e.target.checked)}
              />{" "}
              Reproducción continua
            </label>
            <label>
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
              />{" "}
              Bucle
            </label>
            <button
              className="button ghost"
              disabled={activeIndex >= events.length - 1 || !active}
              onClick={() => step(1)}
            >
              Siguiente →
            </button>
          </div>
          <header className="clip-list-heading">
            <strong>
              {playlist?.name || "Acciones del partido"}
              <small>{events.length} resultados</small>
            </strong>
            <button
              className="text-button"
              onClick={toggleVisible}
              disabled={!events.length}
            >
              {selectedVisible === events.length && events.length
                ? "Deseleccionar resultados"
                : "Seleccionar resultados"}
            </button>
          </header>
          <div className="clip-list">
            {events.slice(0, visibleLimit).map((e) => (
              <article
                className={active?.id === e.id ? "active" : ""}
                key={e.id}
                data-event-id={e.id}
              >
                <input
                  type="checkbox"
                  aria-label={`Seleccionar clip ${e.tagName} ${formatTime(e.start)}`}
                  checked={selectedIds.has(e.id)}
                  onChange={() => {
                    const next = new Set(selectedIds);
                    next.has(e.id) ? next.delete(e.id) : next.add(e.id);
                    onSelectIds(next);
                  }}
                />
                <button
                  className="clip-list-item"
                  onClick={() => setActiveId(e.id)}
                >
                  <i style={{ background: e.color }} />
                  <span>
                    <strong>{e.tagName}</strong>
                    <small>{e.player || e.team || "Sin identificar"}</small>
                  </span>
                  <span>{periodLabel(e.period)}</span>
                  <time>
                    {formatTime(e.start)}{" "}
                    <small>{(e.end - e.start).toFixed(1)} s</small>
                  </time>
                </button>
                {playlist && (
                  <div className="clip-order">
                    <button
                      aria-label="Subir clip"
                      disabled={playlist.eventIds[0] === e.id}
                      onClick={() => moveClip(e.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      aria-label="Bajar clip"
                      disabled={playlist.eventIds.at(-1) === e.id}
                      onClick={() => moveClip(e.id, 1)}
                    >
                      ↓
                    </button>
                  </div>
                )}
                <button
                  className="icon-button"
                  aria-label={`Destacar ${e.tagName}`}
                  aria-pressed={Boolean(e.favorite)}
                  onClick={() => onFavorite(e.id)}
                >
                  <Icon
                    name="star"
                    size={17}
                    fill={e.favorite ? "currentColor" : "none"}
                  />
                </button>
              </article>
            ))}
            {events.length > visibleLimit && (
              <button
                className="button secondary"
                onClick={() => setVisibleLimit((n) => n + 100)}
              >
                Mostrar 100 más · {events.length - visibleLimit} pendientes
              </button>
            )}
            {!events.length && (
              <div className="calm-empty">
                <p>No hay acciones que coincidan con esta selección.</p>
                <button
                  className="text-button"
                  onClick={() =>
                    setFilters({
                      query: "",
                      teamId: "",
                      tagId: "",
                      period: "",
                      favorites: false,
                    })
                  }
                >
                  Restablecer filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
