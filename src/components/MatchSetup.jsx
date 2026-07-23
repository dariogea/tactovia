import { useEffect, useState } from "react";
import { createTeamDraft } from "../lib/roster.js";

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

export function MatchSetup({ teams, initialMatch, onTeamsChange, onConfirm, onManageTeams }) {
  const [homeTeamId, setHomeTeamId] = useState(initialMatch?.homeTeamId || teams[0]?.id || "");
  const [awayTeamId, setAwayTeamId] = useState(initialMatch?.awayTeamId || teams[1]?.id || "");
  const [newTeamName, setNewTeamName] = useState("");

  useEffect(() => {
    if (!teams.some((team) => team.id === homeTeamId)) {
      setHomeTeamId(teams[0]?.id || "");
    }
    if (!teams.some((team) => team.id === awayTeamId)) {
      setAwayTeamId(teams.find((team) => team.id !== homeTeamId)?.id || "");
    }
  }, [awayTeamId, homeTeamId, teams]);

  function addTeam() {
    const name = newTeamName.trim();
    if (!name) return;
    const team = createTeamDraft(name);
    onTeamsChange([...teams, team]);
    setNewTeamName("");
    if (!homeTeamId) setHomeTeamId(team.id);
    else if (!awayTeamId) setAwayTeamId(team.id);
  }

  const valid =
    homeTeamId &&
    awayTeamId &&
    homeTeamId !== awayTeamId &&
    teams.some((team) => team.id === homeTeamId) &&
    teams.some((team) => team.id === awayTeamId);

  return (
    <div className="modal-backdrop match-backdrop">
      <section className="modal match-setup" role="dialog" aria-modal="true">
        <div className="match-heading">
          <span className="eyebrow">Partido</span>
          <h1>Selecciona los dos equipos</h1>
          <p>Es necesario vincular el vídeo a un partido antes de comenzar a etiquetar.</p>
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
            {teams.find((team) => team.id === homeTeamId) && (
              <TeamOption team={teams.find((team) => team.id === homeTeamId)} />
            )}
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
            {teams.find((team) => team.id === awayTeamId) && (
              <TeamOption team={teams.find((team) => team.id === awayTeamId)} />
            )}
          </label>
        </div>

        <div className="quick-team-create">
          <input
            value={newTeamName}
            onChange={(event) => setNewTeamName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addTeam();
            }}
            placeholder="Nombre del nuevo equipo"
          />
          <button className="button ghost" onClick={addTeam} disabled={!newTeamName.trim()}>
            Crear equipo
          </button>
          <button className="button ghost" onClick={onManageTeams}>
            Gestionar fichas
          </button>
        </div>

        <div className="modal-actions">
          <span className="subtle">{teams.length} equipos disponibles</span>
          <div className="spacer" />
          <button
            className="button primary large"
            disabled={!valid}
            onClick={() => onConfirm({ homeTeamId, awayTeamId })}
          >
            Confirmar partido
          </button>
        </div>
      </section>
    </div>
  );
}

