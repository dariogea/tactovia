import { useState } from "react";
import { formatTime } from "../lib/analysis.js";
import { sortPlayersByNumber } from "../lib/roster.js";
import { eventMetric, periods, periodLabel } from "../lib/basketball.js";
import { shotTagPoints, isShotTag } from "../lib/shotZones.js";
import { shotZoneById } from "../lib/shotZones.js";
import { ShotCourtSelector } from "./ShotCourt.jsx";

export function EventEditor({ event, tags, teams, duration, onClose, onSave }) {
  const [draft, setDraft] = useState({ ...event });
  const [error, setError] = useState("");
  const selectedTeam =
    teams.find((team) => team.id === draft.teamId) ||
    teams.find((team) => team.name === draft.team);

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function commit() {
    const start = Math.max(0, Number(draft.start) || 0);
    const end = Math.min(
      Number(duration) || Number.MAX_SAFE_INTEGER,
      Number(draft.end) || 0,
    );
    if (end <= start) {
      setError("El final debe ser posterior al inicio.");
      return;
    }
    const selectedTag = tags.find((tag) => tag.id === draft.tagId);
    const selectedZone = shotZoneById(draft.shotZoneId);
    if (
      isShotTag(selectedTag) &&
      selectedZone &&
      shotTagPoints(selectedTag) &&
      selectedZone.points !== shotTagPoints(selectedTag)
    ) {
      setError("La zona no coincide con el valor del tiro.");
      return;
    }
    onSave({
      ...draft,
      start,
      end,
      tagName: selectedTag?.name || draft.tagName,
      color: selectedTag?.color || draft.color,
      mode: selectedTag?.mode || draft.mode,
      metric: eventMetric(selectedTag || draft),
      anchor: Math.max(start, Math.min(end, Number(draft.anchor) || start)),
      shotZoneId: isShotTag(selectedTag) ? selectedZone?.id || "" : "",
      shotZoneName: isShotTag(selectedTag) ? selectedZone?.name || "" : "",
      shotPoints:
        shotTagPoints(selectedTag) ||
        (/^(made|missed)1$/.test(eventMetric(selectedTag || draft)) ? 1 : 0),
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal event-editor" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Acción</span>
            <h2>Editar evento</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="form-grid">
          <label className="field span-two">
            <span>Etiqueta</span>
            <select
              value={draft.tagId}
              onChange={(eventValue) =>
                update("tagId", eventValue.target.value)
              }
            >
              {tags.map((tag) => (
                <option value={tag.id} key={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Inicio en segundos · {formatTime(draft.start, true)}</span>
            <input
              type="number"
              min="0"
              max={duration}
              step="0.1"
              value={draft.start}
              onChange={(input) => update("start", input.target.value)}
            />
          </label>
          <label className="field">
            <span>Final en segundos · {formatTime(draft.end, true)}</span>
            <input
              type="number"
              min="0.1"
              max={duration}
              step="0.1"
              value={draft.end}
              onChange={(input) => update("end", input.target.value)}
            />
          </label>
          <label className="field">
            <span>Equipo</span>
            <select
              value={draft.teamId || ""}
              onChange={(input) => {
                const team = teams.find(
                  (item) => item.id === input.target.value,
                );
                setDraft((current) => ({
                  ...current,
                  teamId: team?.id || "",
                  team: team?.name || "",
                  playerId: "",
                  player: "",
                }));
              }}
            >
              <option value="">Sin indicar</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Jugador</span>
            <select
              value={draft.playerId || ""}
              onChange={(input) => {
                const player = selectedTeam?.players.find(
                  (item) => item.id === input.target.value,
                );
                setDraft((current) => ({
                  ...current,
                  playerId: player?.id || "",
                  player: player
                    ? [player.number ? `#${player.number}` : "", player.name]
                        .filter(Boolean)
                        .join(" ")
                    : "",
                }));
              }}
            >
              <option value="">Sin indicar</option>
              {sortPlayersByNumber(selectedTeam?.players || []).map(
                (player) => (
                  <option key={player.id} value={player.id}>
                    {player.number ? `#${player.number} ` : ""}
                    {player.name}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="field">
            <span>Periodo</span>
            <select
              value={draft.period || ""}
              onChange={(e) => update("period", e.target.value)}
            >
              <option value="">Sin periodo</option>
              {periods.map((p) => (
                <option value={p} key={p}>
                  {periodLabel(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="field span-two">
            <span>Notas</span>
            <textarea
              value={draft.notes}
              onChange={(input) => update("notes", input.target.value)}
            />
          </label>
          <div className="span-two">
            <ShotCourtSelector
              value={draft.shotZoneId || ""}
              onChange={(shotZoneId) => update("shotZoneId", shotZoneId)}
              compact
            />
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <div className="spacer" />
          <button className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" onClick={commit}>
            Guardar cambios
          </button>
        </div>
      </section>
    </div>
  );
}
