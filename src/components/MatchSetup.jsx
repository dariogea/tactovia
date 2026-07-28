import { useEffect, useMemo, useState } from "react";
import { createRosterPlayers, createTeamDraft, sortPlayersByNumber } from "../lib/roster.js";
import { PlayerJersey } from "./PlayerJersey.jsx";

const MIN_ROSTER = 5;
const MAX_ROSTER = 12;

function TeamOption({ team }) {
  return (
    <span className="match-team-option">
      {team.logo ? (
        <img src={team.logo} alt="" />
      ) : (
        <i style={{ background: team.primaryColor }}>{team.shortName?.slice(0, 3)}</i>
      )}
      <strong>{team.name}</strong>
    </span>
  );
}

function initialRoster(team, storedIds = []) {
  const validStored = storedIds.filter((id) =>
    team?.players?.some((player) => player.id === id)
  );
  if (validStored.length) return validStored.slice(0, MAX_ROSTER);
  return sortPlayersByNumber(team?.players || [])
    .slice(0, MAX_ROSTER)
    .map((player) => player.id);
}

function RosterSelector({ label, team, value, onChange, onComplete }) {
  const players = sortPlayersByNumber(team?.players || []);
  function toggle(playerId) {
    if (value.includes(playerId)) {
      onChange(value.filter((id) => id !== playerId));
    } else if (value.length < MAX_ROSTER) {
      onChange([...value, playerId]);
    }
  }
  return (
    <section className="match-roster-selector">
      <header>
        <div>
          <span>{label}</span>
          <strong>{team?.name || "Equipo pendiente"}</strong>
        </div>
        <em className={value.length >= MIN_ROSTER ? "ready" : ""}>
          {value.length}/{MAX_ROSTER}
        </em>
      </header>
      {players.length < MIN_ROSTER ? (
        <div className="roster-minimum-warning">
          <span>
            Este equipo necesita al menos {MIN_ROSTER} jugadores para preparar
            el partido.
          </span>
          <button className="button secondary" onClick={onComplete}>
            Completar plantilla
          </button>
        </div>
      ) : (
        <div className="match-jersey-grid">
          {players.map((player) => (
            <PlayerJersey
              key={player.id}
              player={player}
              team={team}
              selected={value.includes(player.id)}
              compact
              disabled={!value.includes(player.id) && value.length >= MAX_ROSTER}
              onClick={() => toggle(player.id)}
            />
          ))}
        </div>
      )}
      <small>
        Selecciona entre {MIN_ROSTER} y {MAX_ROSTER} jugadores convocados.
      </small>
    </section>
  );
}

export function MatchSetup({ teams, initialMatch, onTeamsChange, onConfirm, onManageTeams }) {
  const [homeTeamId, setHomeTeamId] = useState(initialMatch?.homeTeamId || teams[0]?.id || "");
  const [awayTeamId, setAwayTeamId] = useState(initialMatch?.awayTeamId || teams[1]?.id || "");
  const [homeRosterIds, setHomeRosterIds] = useState([]);
  const [awayRosterIds, setAwayRosterIds] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");
  const homeTeam = teams.find((team) => team.id === homeTeamId);
  const awayTeam = teams.find((team) => team.id === awayTeamId);

  useEffect(() => {
    if (!teams.some((team) => team.id === homeTeamId)) {
      setHomeTeamId(teams[0]?.id || "");
    }
    if (!teams.some((team) => team.id === awayTeamId)) {
      setAwayTeamId(teams.find((team) => team.id !== homeTeamId)?.id || "");
    }
  }, [awayTeamId, homeTeamId, teams]);

  useEffect(() => {
    setHomeRosterIds(
      initialRoster(homeTeam, initialMatch?.homeRosterIds || [])
    );
  }, [homeTeam?.id]);

  useEffect(() => {
    setAwayRosterIds(
      initialRoster(awayTeam, initialMatch?.awayRosterIds || [])
    );
  }, [awayTeam?.id]);

  function addTeam() {
    const name = newTeamName.trim();
    if (!name) return;
    const team = {
      ...createTeamDraft(name),
      players: createRosterPlayers(MIN_ROSTER)
    };
    onTeamsChange([...teams, team]);
    setNewTeamName("");
    if (!homeTeamId) setHomeTeamId(team.id);
    else if (!awayTeamId) setAwayTeamId(team.id);
  }

  function completeTeam(teamId) {
    onTeamsChange(
      teams.map((team) => {
        if (team.id !== teamId || team.players.length >= MIN_ROSTER) return team;
        return {
          ...team,
          players: [
            ...team.players,
            ...createRosterPlayers(MIN_ROSTER - team.players.length)
          ]
        };
      })
    );
  }

  const valid = useMemo(
    () =>
      homeTeamId &&
      awayTeamId &&
      homeTeamId !== awayTeamId &&
      homeRosterIds.length >= MIN_ROSTER &&
      homeRosterIds.length <= MAX_ROSTER &&
      awayRosterIds.length >= MIN_ROSTER &&
      awayRosterIds.length <= MAX_ROSTER,
    [awayRosterIds.length, awayTeamId, homeRosterIds.length, homeTeamId]
  );

  return (
    <div className="modal-backdrop match-backdrop">
      <section className="modal match-setup" role="dialog" aria-modal="true">
        <div className="match-heading">
          <span className="eyebrow">Preparar análisis</span>
          <h1>Partido y convocatorias</h1>
          <p>
            Elige los equipos y los jugadores disponibles. La convocatoria se
            utilizará en el etiquetado y en las estadísticas.
          </p>
        </div>

        <div className="match-selectors">
          <label className="match-selector">
            <span>Equipo local</span>
            <select value={homeTeamId} onChange={(event) => setHomeTeamId(event.target.value)}>
              <option value="">Seleccionar equipo</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id} disabled={team.id === awayTeamId}>
                  {team.name}
                </option>
              ))}
            </select>
            {homeTeam && <TeamOption team={homeTeam} />}
          </label>
          <strong className="match-versus">VS</strong>
          <label className="match-selector">
            <span>Equipo visitante</span>
            <select value={awayTeamId} onChange={(event) => setAwayTeamId(event.target.value)}>
              <option value="">Seleccionar equipo</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id} disabled={team.id === homeTeamId}>
                  {team.name}
                </option>
              ))}
            </select>
            {awayTeam && <TeamOption team={awayTeam} />}
          </label>
        </div>

        <div className="match-rosters-grid">
          <RosterSelector
            label="Convocatoria local"
            team={homeTeam}
            value={homeRosterIds}
            onChange={setHomeRosterIds}
            onComplete={() => completeTeam(homeTeamId)}
          />
          <RosterSelector
            label="Convocatoria visitante"
            team={awayTeam}
            value={awayRosterIds}
            onChange={setAwayRosterIds}
            onComplete={() => completeTeam(awayTeamId)}
          />
        </div>

        <div className="quick-team-create">
          <input
            value={newTeamName}
            onChange={(event) => setNewTeamName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addTeam()}
            placeholder="Nombre del nuevo equipo"
          />
          <button className="button ghost" onClick={addTeam} disabled={!newTeamName.trim()}>
            Crear equipo con 5 jugadores
          </button>
          <button className="button ghost" onClick={onManageTeams}>
            Gestionar fichas
          </button>
        </div>

        <div className="modal-actions">
          <span className="subtle">
            {valid
              ? "Convocatorias preparadas"
              : `Mínimo ${MIN_ROSTER} y máximo ${MAX_ROSTER} jugadores por equipo`}
          </span>
          <div className="spacer" />
          <button
            className="button primary large"
            disabled={!valid}
            onClick={() =>
              onConfirm({
                homeTeamId,
                awayTeamId,
                homeRosterIds,
                awayRosterIds,
                status: "finished",
                scheduledAt: new Date().toISOString()
              })
            }
          >
            Empezar a etiquetar
          </button>
        </div>
      </section>
    </div>
  );
}
