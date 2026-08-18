import { useMemo, useState } from "react";
import { sortPlayersByNumber } from "../lib/roster.js";
import { PlayerJersey } from "./PlayerJersey.jsx";

function TeamIdentity({ team }) {
  return (
    <span className="library-team-identity">
      {team?.logo ? (
        <img src={team.logo} alt="" />
      ) : (
        <i style={{ background: team?.primaryColor || "#08756D" }}>
          {(team?.shortName || "EQ").slice(0, 3)}
        </i>
      )}
      <span>
        <strong>{team?.name || "Equipo"}</strong>
        <small>{team?.category || team?.season || "Sin categoría"}</small>
      </span>
    </span>
  );
}

function recordDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-ES", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date)
    : "Fecha no indicada";
}

function RecordModal({ record, onClose }) {
  if (!record) return null;
  const home = record.teams.find((team) => team.id === record.match?.homeTeamId);
  const away = record.teams.find((team) => team.id === record.match?.awayTeamId);
  const byTag = Object.entries(record.summary?.byTag || {}).sort(
    (left, right) => right[1] - left[1]
  );
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal history-record-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button player-modal-close" onClick={onClose}>×</button>
        <span className="eyebrow">Histórico estadístico</span>
        <h2>{record.projectName}</h2>
        <p>{recordDate(record.updatedAt)} · sin vídeo ni clips asociados</p>
        <div className="history-matchup">
          <TeamIdentity team={home} />
          <strong>VS</strong>
          <TeamIdentity team={away} />
        </div>
        <div className="database-summary-grid compact">
          <article><span>Acciones</span><strong>{record.summary?.totalEvents || 0}</strong></article>
          <article><span>Jugadores</span><strong>{record.summary?.uniquePlayers || 0}</strong></article>
          <article><span>Etiquetas</span><strong>{byTag.length}</strong></article>
        </div>
        <div className="history-tag-list">
          {byTag.map(([tagId, count]) => {
            const event = record.events.find((item) => item.tagId === tagId);
            return (
              <span key={tagId}>
                <i style={{ background: event?.color || "#08756D" }} />
                <strong>{event?.tagName || tagId}</strong>
                <b>{count}</b>
              </span>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PlayerRecordModal({ player, gameRecords, onClose, onExport }) {
  if (!player) return null;
  const events = gameRecords.flatMap((record) =>
    record.events.filter((event) => event.playerId === player.id)
  );
  const byTag = Object.values(
    events.reduce((rows, event) => {
      const key = event.tagId || event.tagName;
      rows[key] ||= {
        id: key,
        name: event.tagName || "Acción",
        color: event.color || "#08756D",
        count: 0
      };
      rows[key].count += 1;
      return rows;
    }, {})
  ).sort((left, right) => right.count - left.count);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal history-record-modal player-history-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button player-modal-close" onClick={onClose}>×</button>
        <span className="eyebrow">Ficha estadística global</span>
        <div className="player-history-identity">
          <PlayerJersey player={player} team={player.team} />
          <div>
            <h2>{player.name}</h2>
            <p>
              {player.team?.name || "Agente libre"} · {player.position || "Sin posición"}
            </p>
          </div>
        </div>
        <div className="database-summary-grid compact">
          <article><span>Partidos</span><strong>{player.games}</strong></article>
          <article><span>Acciones</span><strong>{player.events}</strong></article>
          <article><span>Tiros</span><strong>{player.shots}</strong></article>
        </div>
        <div className="history-tag-list">
          {byTag.map((tag) => (
            <span key={tag.id}>
              <i style={{ background: tag.color }} />
              <strong>{tag.name}</strong>
              <b>{tag.count}</b>
            </span>
          ))}
          {byTag.length === 0 && (
            <div className="empty-inline history-empty">Sin acciones históricas.</div>
          )}
        </div>
        <footer className="history-export-footer">
          <strong>Exportar ficha</strong>
          <div>
            <button className="button secondary" onClick={() => onExport("xlsx", { type: "player", id: player.id, name: player.name })}>Excel</button>
            <button className="button secondary" onClick={() => onExport("powerbi", { type: "player", id: player.id, name: player.name })}>Power BI</button>
            <button className="button secondary" onClick={() => onExport("pdf", { type: "player", id: player.id, name: player.name })}>PDF</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export function DatabaseLibrary({
  snapshot,
  teams,
  competitions,
  folders = [],
  freeAgents,
  loading,
  error,
  onRefresh,
  onBackup,
  onManageTeams,
  onDeleteRecord,
  onExportHistory,
  onCompetitionsChange,
  onFoldersChange
}) {
  const [section, setSection] = useState("competitions");
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState("all");
  const normalizedSearch = search.trim().toLocaleLowerCase("es");
  const gameRecords = snapshot?.gameRecords || [];

  const competitionGroups = useMemo(() => {
    const visibleCompetitions = (competitions || []).filter((competition) => {
      if (selectedFolderId === "all") return true;
      if (selectedFolderId === "unfiled") return !competition.folderId;
      return competition.folderId === selectedFolderId;
    });
    const base = [
      ...visibleCompetitions,
      {
        id: "unassigned",
        name: "Sin competición",
        season: "",
        description: "Equipos pendientes de clasificar"
      }
    ];
    return base
      .map((competition) => {
        const competitionTeams = teams.filter((team) =>
          competition.id === "unassigned"
            ? (selectedFolderId === "all" || selectedFolderId === "unfiled") &&
              (!team.competitionId ||
              !(competitions || []).some((item) => item.id === team.competitionId)
              )
            : team.competitionId === competition.id
        );
        return {
          ...competition,
          teams: competitionTeams.filter((team) =>
            !normalizedSearch
              ? true
              : [team.name, team.category, team.season, competition.name].some(
                  (value) =>
                    String(value || "")
                      .toLocaleLowerCase("es")
                      .includes(normalizedSearch)
                )
          )
        };
      })
      .filter(
        (competition) =>
          competition.teams.length > 0 ||
          (!normalizedSearch && competition.id !== "unassigned")
      );
  }, [competitions, normalizedSearch, selectedFolderId, teams]);

  function createFolder() {
    const name = window.prompt("Nombre de la carpeta")?.trim();
    if (!name) return;
    const folder = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
    onFoldersChange?.([...folders, folder]);
    setSelectedFolderId(folder.id);
  }

  function renameSelectedFolder() {
    const folder = folders.find((item) => item.id === selectedFolderId);
    if (!folder) return;
    const name = window.prompt("Nuevo nombre de la carpeta", folder.name)?.trim();
    if (!name) return;
    onFoldersChange?.(folders.map((item) => item.id === folder.id ? { ...item, name } : item));
  }

  function deleteSelectedFolder() {
    const folder = folders.find((item) => item.id === selectedFolderId);
    if (!folder || !window.confirm(`¿Eliminar la carpeta “${folder.name}”? Las competiciones pasarán a Sin carpeta.`)) return;
    onFoldersChange?.(folders.filter((item) => item.id !== folder.id));
    onCompetitionsChange?.(
      competitions.map((competition) =>
        competition.folderId === folder.id ? { ...competition, folderId: "" } : competition
      )
    );
    setSelectedFolderId("all");
  }

  const playerRows = useMemo(() => {
    const teamPlayers = teams.flatMap((team) =>
      team.players.map((player) => ({ ...player, team }))
    );
    const rows = [
      ...teamPlayers,
      ...(freeAgents || []).map((player) => ({ ...player, team: null }))
    ];
    return rows
      .map((player) => {
        const events = gameRecords.flatMap((record) =>
          record.events.filter((event) => event.playerId === player.id)
        );
        return {
          ...player,
          games: gameRecords.filter((record) =>
            record.events.some((event) => event.playerId === player.id)
          ).length,
          events: events.length,
          shots: events.filter((event) => event.shotZoneId).length
        };
      })
      .filter((player) =>
        !normalizedSearch
          ? true
          : [player.name, player.number, player.position, player.team?.name].some(
              (value) =>
                String(value || "")
                  .toLocaleLowerCase("es")
                  .includes(normalizedSearch)
            )
      )
      .sort(
        (left, right) =>
          right.events - left.events ||
          String(left.name).localeCompare(String(right.name), "es")
      );
  }, [freeAgents, gameRecords, normalizedSearch, teams]);

  return (
    <section className="database-view user-database-view">
      <div className="database-hero">
        <div>
          <span className="eyebrow">Datos de tu perfil</span>
          <h1>Biblioteca deportiva</h1>
          <p>
            Competiciones, equipos, jugadores e históricos creados por ti. No
            se añaden calendarios ni catálogos externos automáticamente.
          </p>
        </div>
        <div className="database-status-stack">
          <span className="database-status ready"><i />Perfil aislado</span>
          <span className="database-status ready"><i />Datos locales</span>
        </div>
      </div>

      <div className="database-summary-grid">
        <article><span>Competiciones</span><strong>{competitions.length}</strong></article>
        <article><span>Equipos</span><strong>{teams.length}</strong></article>
        <article><span>Jugadores</span><strong>{playerRows.length}</strong></article>
        <article><span>Agentes libres</span><strong>{freeAgents.length}</strong></article>
        <article className="accent"><span>Partidos guardados</span><strong>{gameRecords.length}</strong></article>
      </div>

      <div className="database-toolbar">
        <div className="segmented-control">
          <button className={section === "competitions" ? "active" : ""} onClick={() => setSection("competitions")}>
            Competiciones
          </button>
          <button className={section === "players" ? "active" : ""} onClick={() => setSection("players")}>
            Jugadores
          </button>
          <button className={section === "matches" ? "active" : ""} onClick={() => setSection("matches")}>
            Partidos guardados
          </button>
        </div>
        <div className="database-search-tools">
          {section !== "matches" && (
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar equipo o jugador"
            />
          )}
          <button className="button ghost" onClick={onRefresh} disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
          <button className="button ghost" onClick={onBackup}>Copia de seguridad</button>
        </div>
      </div>

      {error && <div className="database-error">{error}</div>}

      {section === "competitions" && (
        <div className="library-folder-browser">
          <aside className="library-folder-rail">
            <header>
              <div><span className="eyebrow">Organización</span><h2>Mis carpetas</h2></div>
              <button className="mini-button" onClick={createFolder}>＋</button>
            </header>
            <button
              className={selectedFolderId === "all" ? "active" : ""}
              onClick={() => setSelectedFolderId("all")}
            >
              <i>▦</i><span><strong>Toda la biblioteca</strong><small>{competitions.length} competiciones</small></span>
            </button>
            {folders.map((folder) => {
              const count = competitions.filter((competition) => competition.folderId === folder.id).length;
              return (
                <button
                  className={selectedFolderId === folder.id ? "active" : ""}
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <i>▰</i><span><strong>{folder.name}</strong><small>{count} competiciones</small></span>
                </button>
              );
            })}
            <button
              className={selectedFolderId === "unfiled" ? "active" : ""}
              onClick={() => setSelectedFolderId("unfiled")}
            >
              <i>□</i><span><strong>Sin carpeta</strong><small>Pendientes de ordenar</small></span>
            </button>
            {folders.some((folder) => folder.id === selectedFolderId) && (
              <footer>
                <button onClick={renameSelectedFolder}>Renombrar</button>
                <button className="danger-text" onClick={deleteSelectedFolder}>Eliminar</button>
              </footer>
            )}
          </aside>
          <div className="library-accordion">
          <header className="library-folder-heading">
            <div>
              <span className="eyebrow">Contenido</span>
              <h2>{selectedFolderId === "all" ? "Toda la biblioteca" : selectedFolderId === "unfiled" ? "Sin carpeta" : folders.find((folder) => folder.id === selectedFolderId)?.name}</h2>
            </div>
            <button className="button primary" onClick={onManageTeams}>Crear o editar datos</button>
          </header>
          {competitionGroups.map((competition, competitionIndex) => (
            <details className="library-competition" key={competition.id} open={competitionIndex === 0}>
              <summary>
                <span className="competition-monogram">
                  {(competition.shortName || competition.name || "COMP").slice(0, 4)}
                </span>
                <span>
                  <strong>{competition.name}</strong>
                  <small>{competition.season || "Temporada no indicada"}</small>
                </span>
                <em>{competition.teams.length} equipos</em>
                <i>⌄</i>
              </summary>
              <div className="library-team-accordion">
                {competition.teams.map((team) => (
                  <details
                    className="library-team-details"
                    key={team.id}
                    style={{
                      "--library-team-color": team.primaryColor,
                      "--library-team-secondary": team.secondaryColor
                    }}
                  >
                    <summary>
                      <TeamIdentity team={team} />
                      <span className="library-team-summary">
                        <strong>{team.players.length}</strong>
                        <small>jugadores</small>
                      </span>
                      <span className="library-team-summary">
                        <strong>
                          {gameRecords.filter((record) =>
                            [record.match?.homeTeamId, record.match?.awayTeamId].includes(team.id)
                          ).length}
                        </strong>
                        <small>partidos</small>
                      </span>
                      <i>⌄</i>
                    </summary>
                    <div className="library-roster">
                      <header>
                        <span>
                          <strong>Plantilla</strong>
                          <small>Dorsal, identidad y posición actual.</small>
                        </span>
                        <span className="team-history-export">
                          <button className="mini-button" onClick={() => onExportHistory("xlsx", { type: "team", id: team.id, name: team.name })}>Excel</button>
                          <button className="mini-button" onClick={() => onExportHistory("powerbi", { type: "team", id: team.id, name: team.name })}>Power BI</button>
                          <button className="mini-button" onClick={() => onExportHistory("pdf", { type: "team", id: team.id, name: team.name })}>PDF</button>
                        </span>
                      </header>
                      <div className="library-jersey-roster">
                        {sortPlayersByNumber(team.players).map((player) => (
                          <PlayerJersey key={player.id} player={player} team={team} />
                        ))}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
          <div className="competition-directory-actions">
            {competitionGroups.length === 0 && <span>No hay competiciones o equipos en esta carpeta.</span>}
          </div>
          </div>
        </div>
      )}

      {section === "players" && (
        <div className="player-directory">
          <header className="player-directory-intro">
            <div><span className="eyebrow">Identidades globales</span><h2>Jugadores</h2></div>
            <div className="database-export-actions">
              <button className="button secondary" onClick={() => onExportHistory("xlsx", "players")}>Excel</button>
              <button className="button secondary" onClick={() => onExportHistory("powerbi", "players")}>Power BI</button>
              <button className="button secondary" onClick={() => onExportHistory("pdf", "players")}>PDF</button>
            </div>
          </header>
          <div className="player-directory-grid">
            {playerRows.map((player) => (
              <article
                className="player-directory-card"
                key={`${player.id}-${player.team?.id || "free"}`}
                style={{ "--player-team-color": player.team?.primaryColor || "#64748B" }}
              >
                <PlayerJersey player={player} team={player.team} />
                <span className="player-card-team">
                  {player.team?.name || "Agente libre"}
                </span>
                <span className="player-card-metrics">
                  <span><strong>{player.games}</strong> partidos</span>
                  <span><strong>{player.events}</strong> acciones</span>
                  <span><strong>{player.shots}</strong> tiros</span>
                </span>
                <button className="mini-button" onClick={() => setSelectedPlayer(player)}>
                  Ver ficha y exportar
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {section === "matches" && (
        <div className="database-match-list">
          <header className="player-directory-intro">
            <div><span className="eyebrow">Sin vídeo</span><h2>Histórico estadístico</h2></div>
            <div className="database-export-actions">
              <button className="button secondary" onClick={() => onExportHistory("xlsx", "games")}>Excel</button>
              <button className="button secondary" onClick={() => onExportHistory("powerbi", "games")}>Power BI</button>
              <button className="button secondary" onClick={() => onExportHistory("pdf", "games")}>PDF</button>
            </div>
          </header>
          {gameRecords.map((record) => {
            const home = record.teams.find((team) => team.id === record.match?.homeTeamId);
            const away = record.teams.find((team) => team.id === record.match?.awayTeamId);
            return (
              <article className="database-match-card history-match-card" key={record.id}>
                <div className="database-match-meta">
                  <span>Partido analizado</span>
                  <strong>{record.projectName}</strong>
                  <small>{recordDate(record.updatedAt)}</small>
                </div>
                <div className="database-match-teams">
                  <TeamIdentity team={home} />
                  <span className="database-score">VS</span>
                  <TeamIdentity team={away} />
                </div>
                <div className="database-match-actions">
                  <span>{record.summary?.totalEvents || 0} acciones</span>
                  <button className="button secondary" onClick={() => setSelectedRecord(record)}>
                    Ver estadísticas
                  </button>
                  <button className="button ghost danger-text" onClick={() => onDeleteRecord(record)}>
                    Eliminar
                  </button>
                </div>
              </article>
            );
          })}
          {gameRecords.length === 0 && (
            <div className="database-empty">
              <strong>Todavía no hay partidos guardados</strong>
              <span>Se crearán al guardar un análisis con partido y acciones.</span>
            </div>
          )}
        </div>
      )}
      <RecordModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      <PlayerRecordModal
        player={selectedPlayer}
        gameRecords={gameRecords}
        onClose={() => setSelectedPlayer(null)}
        onExport={onExportHistory}
      />
    </section>
  );
}
