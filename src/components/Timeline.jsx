import { useMemo, useRef, useState } from "react";
import { formatTime } from "../lib/analysis.js";
import { shotZoneById } from "../lib/shotZones.js";

const columns = [
  { key: "start", label: "Tiempo" },
  { key: "tagName", label: "Etiqueta" },
  { key: "team", label: "Equipo" },
  { key: "player", label: "Jugador" },
  { key: "notes", label: "Notas" }
];

function compareValues(left, right, key) {
  if (key === "start") return left.start - right.start;
  const leftValue = key === "notes" ? left.notes || "" : left[key] || "";
  const rightValue = key === "notes" ? right.notes || "" : right[key] || "";
  return String(leftValue).localeCompare(String(rightValue), "es", {
    numeric: true,
    sensitivity: "base"
  });
}

function InformationPopup({ detail, onClose }) {
  if (!detail) return null;
  const { type, event, team, player, tag } = detail;
  const zone = shotZoneById(event.shotZoneId);
  const title =
    type === "team"
      ? team?.name || event.team
      : type === "player"
        ? player?.name || event.player
        : tag?.name || event.tagName;
  return (
    <div className="modal-backdrop information-backdrop" onMouseDown={onClose}>
      <section
        className="modal information-popup"
        role="dialog"
        aria-modal="true"
        onMouseDown={(pointerEvent) => pointerEvent.stopPropagation()}
        style={{ "--detail-color": tag?.color || team?.primaryColor || event.color }}
      >
        <div className="information-popup-hero">
          {type === "team" && team?.logo ? (
            <img src={team.logo} alt="" />
          ) : type === "player" && player?.photo ? (
            <img src={player.photo} alt="" />
          ) : (
            <span>
              {type === "player"
                ? `#${player?.number || "—"}`
                : (team?.shortName || tag?.name || event.tagName).slice(0, 3)}
            </span>
          )}
          <div>
            <span className="eyebrow">
              {type === "team" ? "Equipo" : type === "player" ? "Jugador" : "Etiqueta"}
            </span>
            <h2>{title}</h2>
            <p>Acción registrada en {formatTime(event.anchor ?? event.start, true)}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="information-facts">
          {type === "team" && (
            <>
              <div><span>Ciudad</span><strong>{team?.city || "Sin indicar"}</strong></div>
              <div><span>Categoría</span><strong>{team?.category || "Sin indicar"}</strong></div>
              <div><span>Pabellón</span><strong>{team?.arena || "Sin indicar"}</strong></div>
              <div><span>Plantilla</span><strong>{team?.players?.length || 0} jugadores</strong></div>
            </>
          )}
          {type === "player" && (
            <>
              <div><span>Dorsal</span><strong>#{player?.number || "—"}</strong></div>
              <div><span>Posición</span><strong>{player?.position || "Sin indicar"}</strong></div>
              <div><span>Altura</span><strong>{player?.height ? `${player.height} cm` : "Sin indicar"}</strong></div>
              <div><span>Equipo</span><strong>{team?.name || event.team || "Sin indicar"}</strong></div>
            </>
          )}
          {type === "tag" && (
            <>
              <div><span>Tipo</span><strong>{event.mode === "interval" ? "Intervalo" : "Instante"}</strong></div>
              <div><span>Clip</span><strong>{formatTime(event.start, true)} – {formatTime(event.end, true)}</strong></div>
              <div><span>Zona</span><strong>{zone?.name || event.shotZoneName || "Sin registrar"}</strong></div>
              <div><span>Valor</span><strong>{event.shotPoints ? `${event.shotPoints} puntos` : "No aplica"}</strong></div>
            </>
          )}
        </div>
        <div className="information-event-summary">
          <span>Contexto de la acción</span>
          <p>
            {[event.team, event.player, zone?.name || event.shotZoneName, event.notes]
              .filter(Boolean)
              .join(" · ") || "No se añadieron datos adicionales."}
          </p>
        </div>
      </section>
    </div>
  );
}

export function Timeline({
  currentTime,
  duration,
  events,
  teams = [],
  tags = [],
  selectedIds,
  onSeek,
  onToggleSelected,
  onEdit,
  onDelete
}) {
  const [sort, setSort] = useState({ key: "start", direction: "asc" });
  const [detail, setDetail] = useState(null);
  const draggingRef = useRef(false);
  const safeDuration = Math.max(duration || 0, 1);
  const teamsById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams]
  );
  const tagsById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag])),
    [tags]
  );

  function showDetail(type, event) {
    const team = teamsById.get(event.teamId);
    const player =
      team?.players?.find((candidate) => candidate.id === event.playerId) ||
      teams
        .flatMap((candidate) => candidate.players || [])
        .find((candidate) => candidate.id === event.playerId);
    setDetail({
      type,
      event,
      team,
      player,
      tag: tagsById.get(event.tagId)
    });
  }
  const orderedEvents = useMemo(
    () =>
      events.slice().sort((left, right) => {
        const result = compareValues(left, right, sort.key);
        return sort.direction === "asc" ? result : -result;
      }),
    [events, sort]
  );

  function changeSort(key) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }

  function seekFromPointer(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    onSeek(ratio * safeDuration);
  }

  return (
    <section className="timeline-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Base de datos</span>
          <h2>Línea temporal</h2>
        </div>
        <span className="counter">{events.length} acciones</span>
      </div>

      <div
        className="timeline-track"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          draggingRef.current = true;
          seekFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (draggingRef.current && (event.buttons & 1) === 1) seekFromPointer(event);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        onLostPointerCapture={() => {
          draggingRef.current = false;
        }}
        onKeyDown={(event) => {
          const actions = {
            ArrowLeft: currentTime - 5,
            ArrowRight: currentTime + 5,
            Home: 0,
            End: safeDuration
          };
          if (Object.hasOwn(actions, event.key)) {
            event.preventDefault();
            onSeek(actions[event.key]);
          }
        }}
        role="slider"
        aria-label="Línea temporal del vídeo"
        aria-valuemin="0"
        aria-valuemax={safeDuration}
        aria-valuenow={currentTime}
        tabIndex="0"
      >
        <div
          className="timeline-progress"
          style={{ width: `${(currentTime / safeDuration) * 100}%` }}
        />
        {events.map((event) => {
          const left = (event.start / safeDuration) * 100;
          const width = Math.max(((event.end - event.start) / safeDuration) * 100, 0.35);
          return (
            <button
              className="timeline-event"
              key={event.id}
              style={{
                left: `${left}%`,
                width: `${Math.min(width, 100 - left)}%`,
                background: event.color
              }}
              title={`${event.tagName} · ${formatTime(event.start, true)}`}
              onPointerDown={(pointerEvent) => {
                pointerEvent.stopPropagation();
                onSeek(event.start);
              }}
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onSeek(event.start);
              }}
            />
          );
        })}
        <div
          className="timeline-playhead"
          style={{ left: `${(currentTime / safeDuration) * 100}%` }}
        />
      </div>
      <div className="timeline-scale">
        <span>00:00</span>
        <span>{formatTime(safeDuration / 2)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="event-table-wrap">
        {orderedEvents.length === 0 ? (
          <div className="empty-inline">
            Las acciones que etiquetes aparecerán aquí y en la línea temporal.
          </div>
        ) : (
          <table className="event-table">
            <thead>
              <tr>
                <th aria-label="Seleccionar">
                  <input
                    type="checkbox"
                    checked={events.length > 0 && selectedIds.size === events.length}
                    onChange={() => {
                      const selectAll = selectedIds.size !== events.length;
                      events.forEach((event) => {
                        if (selectAll !== selectedIds.has(event.id)) onToggleSelected(event.id);
                      });
                    }}
                    aria-label="Seleccionar todas las acciones"
                  />
                </th>
                {columns.map((column) => (
                  <th key={column.key}>
                    <button className="sort-header" onClick={() => changeSort(column.key)}>
                      {column.label}
                      <span aria-hidden="true">
                        {sort.key === column.key
                          ? sort.direction === "asc"
                            ? " ↑"
                            : " ↓"
                          : " ↕"}
                      </span>
                    </button>
                  </th>
                ))}
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {orderedEvents.map((event) => (
                <tr key={event.id} className={selectedIds.has(event.id) ? "selected" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(event.id)}
                      onChange={() => onToggleSelected(event.id)}
                      aria-label={`Seleccionar ${event.tagName}`}
                    />
                  </td>
                  <td>
                    <button className="time-link" onClick={() => onSeek(event.start)}>
                      {formatTime(event.start, true)}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="tag-pill event-detail-button"
                      onClick={() => showDetail("tag", event)}
                      title="Ver información de la etiqueta"
                    >
                      <i style={{ background: event.color }} />
                      {event.tagName}
                    </button>
                  </td>
                  <td>
                    {event.team ? (
                      <button
                        type="button"
                        className="event-team-pill event-detail-button"
                        style={{
                          "--event-team-color":
                            teamsById.get(event.teamId)?.primaryColor || "#64748b"
                        }}
                        onClick={() => showDetail("team", event)}
                        title="Ver ficha del equipo"
                      >
                        <i />
                        {event.team}
                      </button>
                    ) : "—"}
                  </td>
                  <td>
                    {event.player ? (
                      <button
                        type="button"
                        className="event-player-link event-detail-button"
                        onClick={() => showDetail("player", event)}
                        title="Ver ficha del jugador"
                      >
                        {event.player}
                      </button>
                    ) : "—"}
                  </td>
                  <td className="notes-cell">{event.notes || "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="mini-button" onClick={() => onEdit(event)}>
                        Editar
                      </button>
                      <button
                        className="mini-button danger-text"
                        onClick={() => onDelete(event.id)}
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <InformationPopup detail={detail} onClose={() => setDetail(null)} />
    </section>
  );
}
