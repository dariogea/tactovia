import { useMemo, useState } from "react";

function TeamIdentity({ team, compact = false }) {
  const label = team?.shortName || team?.name || "EQ";
  return (
    <span className={`library-team-identity ${compact ? "compact" : ""}`}>
      {team?.logo ? (
        <img src={team.logo} alt={`Escudo de ${team.name}`} />
      ) : (
        <i style={{ background: team?.primaryColor || "#2dd4bf" }}>
          {label.slice(0, 3)}
        </i>
      )}
      <span>
        <strong>{team?.name || "Equipo"}</strong>
        {team?.logoStatus === "provisional" && (
          <small className="identity-status">Identidad provisional</small>
        )}
      </span>
    </span>
  );
}

function DataBadge({ type }) {
  if (type === "demo") {
    return <span className="database-data-badge demo">DEMO</span>;
  }
  if (type === "official-team") {
    return <span className="database-data-badge official">FBRM</span>;
  }
  return null;
}

function matchDate(value) {
  if (!value) return "Fecha no indicada";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function playerNumberValue(player) {
  const value = Number.parseInt(String(player.number || ""), 10);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function playerForRoster(snapshot, roster) {
  const player = (snapshot?.players || []).find(
    (item) => item.id === roster.playerId
  );
  return player
    ? {
        ...player,
        teamId: roster.teamId,
        competitionSeasonId: roster.competitionSeasonId,
        number: roster.number || player.number || "",
        position: roster.position || player.position || "",
        status: roster.status || player.status || ""
      }
    : null;
}

function PlayerIdentity({ player }) {
  return (
    <span className="database-player-name">
      {player.photo ? (
        <img src={player.photo} alt={`Foto de ${player.name}`} />
      ) : (
        <i>#{player.number || "—"}</i>
      )}
      <span className="database-player-label">
        <strong>{player.name}</strong>
        <small>
          {player.position || "Posición no indicada"}
          {player.number ? ` · dorsal ${player.number}` : ""}
        </small>
      </span>
    </span>
  );
}

function PlayerModal({ player, team, competition, onClose }) {
  if (!player) return null;
  const details = [
    ["Equipo", team?.name || player.teamName || "Sin equipo"],
    ["Competición", competition?.name || "Sin competición"],
    ["Dorsal", player.number || "Sin indicar"],
    ["Posición", player.position || "Sin indicar"],
    ["Posición secundaria", player.secondaryPosition || "Sin indicar"],
    ["Altura", player.height ? `${player.height} cm` : "Sin indicar"],
    ["Nacionalidad", player.nationality || "Sin indicar"],
    ["Estado", player.status || "Activo"],
    ["Acciones históricas", player.eventCount ?? 0],
    ["Análisis", player.analysisCount ?? 0]
  ];
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal player-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Ficha de ${player.name}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button player-modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <header
          className="player-profile-header"
          style={{ "--player-team-color": team?.primaryColor || "#2dd4bf" }}
        >
          {player.photo ? (
            <img src={player.photo} alt="" />
          ) : (
            <span>#{player.number || "—"}</span>
          )}
          <div>
            <small>Ficha completa</small>
            <h2>{player.name}</h2>
            <p>{team?.name || player.teamName || "Sin plantilla asignada"}</p>
          </div>
          <DataBadge type={player.isDemo ? "demo" : player.dataStatus} />
        </header>
        <div className="player-detail-grid">
          {details.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <article className="player-detail-notes">
          <span>Observaciones</span>
          <p>{player.notes || "Todavía no se han añadido observaciones a esta ficha."}</p>
        </article>
        <footer>
          <span>
            ID de origen: <strong>{player.externalId || "local"}</strong>
          </span>
          <button className="button secondary" onClick={onClose}>Cerrar ficha</button>
        </footer>
      </section>
    </div>
  );
}

export function DatabaseLibrary({
  snapshot,
  loading,
  error,
  importReport,
  onRefresh,
  onImport,
  onCreateTemplate,
  onBackup,
  onUseMatch,
  onManageTeams
}) {
  const [section, setSection] = useState("competitions");
  const [search, setSearch] = useState("");
  const [competitionSeasonId, setCompetitionSeasonId] = useState("all");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const normalizedSearch = search.trim().toLocaleLowerCase("es");
  const totals = snapshot?.totals || {
    teams: 0,
    players: 0,
    matches: 0,
    analyses: 0,
    events: 0
  };

  const teamById = useMemo(
    () => new Map((snapshot?.teams || []).map((team) => [team.id, team])),
    [snapshot?.teams]
  );
  const competitionById = useMemo(
    () =>
      new Map(
        (snapshot?.competitions || []).map((competition) => [
          competition.id,
          competition
        ])
      ),
    [snapshot?.competitions]
  );
  const rosterPlayers = useMemo(
    () =>
      (snapshot?.rosters || [])
        .map((roster) => playerForRoster(snapshot, roster))
        .filter(Boolean),
    [snapshot]
  );
  const searchablePlayers = useMemo(() => {
    const source = rosterPlayers.length ? rosterPlayers : snapshot?.players || [];
    return source
      .filter((player) =>
        !normalizedSearch
          ? true
          : [
              player.name,
              player.teamName,
              player.position,
              player.number,
              teamById.get(player.teamId)?.name
            ].some((value) =>
              String(value || "").toLocaleLowerCase("es").includes(normalizedSearch)
            )
      )
      .sort(
        (left, right) =>
          String(teamById.get(left.teamId)?.name || left.teamName || "").localeCompare(
            String(teamById.get(right.teamId)?.name || right.teamName || ""),
            "es"
          ) ||
          playerNumberValue(left) - playerNumberValue(right) ||
          left.name.localeCompare(right.name, "es")
      );
  }, [normalizedSearch, rosterPlayers, snapshot?.players, teamById]);

  const competitionGroups = useMemo(() => {
    const memberships = snapshot?.competitionTeams || [];
    const competitions = snapshot?.competitions || [];
    return competitions
      .map((competition) => {
        const teams = memberships
          .filter(
            (membership) =>
              membership.competitionSeasonId === competition.id
          )
          .map((membership) => teamById.get(membership.teamId))
          .filter(Boolean)
          .filter((team) => {
            if (!normalizedSearch) return true;
            const teamMatches = [
              team.name,
              team.shortName,
              team.city,
              competition.name
            ].some((value) =>
              String(value || "").toLocaleLowerCase("es").includes(normalizedSearch)
            );
            const rosterMatches = rosterPlayers.some(
              (player) =>
                player.teamId === team.id &&
                player.competitionSeasonId === competition.id &&
                String(player.name || "")
                  .toLocaleLowerCase("es")
                  .includes(normalizedSearch)
            );
            return teamMatches || rosterMatches;
          });
        return { ...competition, teams };
      })
      .filter((competition) => competition.teams.length > 0);
  }, [
    normalizedSearch,
    rosterPlayers,
    snapshot?.competitionTeams,
    snapshot?.competitions,
    teamById
  ]);

  const analyzedMatches = useMemo(
    () =>
      (snapshot?.matches || [])
        .filter((match) => match.analysisCount > 0 || match.eventCount > 0)
        .filter(
          (match) =>
            competitionSeasonId === "all" ||
            match.competitionSeasonId === competitionSeasonId
        )
        .filter((match) =>
          !normalizedSearch
            ? true
            : [
                match.homeTeamName,
                match.awayTeamName,
                match.roundName,
                match.competitionName
              ].some((value) =>
                String(value || "")
                  .toLocaleLowerCase("es")
                  .includes(normalizedSearch)
              )
        ),
    [competitionSeasonId, normalizedSearch, snapshot?.matches]
  );

  const selectedTeam = selectedPlayer
    ? teamById.get(selectedPlayer.teamId) ||
      (snapshot?.teams || []).find((team) => team.name === selectedPlayer.teamName)
    : null;
  const selectedCompetition = selectedPlayer
    ? competitionById.get(selectedPlayer.competitionSeasonId)
    : null;

  return (
    <section className="database-view">
      <div className="database-hero">
        <div>
          <span className="eyebrow">Histórico deportivo</span>
          <h1>Biblioteca de scouting</h1>
          <p>
            Abre una competición, entra en un equipo y consulta su plantilla.
            Solo los partidos que ya contienen un análisis aparecen en el histórico.
          </p>
        </div>
        <div className="database-status-stack">
          <span className="database-status ready"><i />Base local activa</span>
          <span className="database-status ready">
            <i />{snapshot?.catalog?.fbrmTeamCount || 0} equipos FBRM
          </span>
          <span className="database-status pending">
            <i />{snapshot?.catalog?.provisionalLogoCount || 0} identidades provisionales
          </span>
        </div>
      </div>

      <div className="database-summary-grid">
        <article><span>Competiciones</span><strong>{snapshot?.competitions?.length || 0}</strong></article>
        <article><span>Equipos</span><strong>{totals.teams}</strong></article>
        <article><span>Jugadores</span><strong>{totals.players}</strong></article>
        <article><span>Partidos analizados</span><strong>{analyzedMatches.length}</strong></article>
        <article className="accent"><span>Acciones históricas</span><strong>{totals.events}</strong></article>
      </div>

      <div className="database-toolbar">
        <div className="segmented-control">
          <button className={section === "competitions" ? "active" : ""} onClick={() => setSection("competitions")}>
            Biblioteca
          </button>
          <button className={section === "matches" ? "active" : ""} onClick={() => setSection("matches")}>
            Partidos analizados
          </button>
          <button className={section === "players" ? "active" : ""} onClick={() => setSection("players")}>
            Jugadores
          </button>
          <button className={section === "import" ? "active" : ""} onClick={() => setSection("import")}>
            Importar
          </button>
        </div>
        <div className="database-search-tools">
          {section === "matches" && (
            <select
              value={competitionSeasonId}
              onChange={(event) => setCompetitionSeasonId(event.target.value)}
              aria-label="Filtrar por competición"
            >
              <option value="all">Todas las competiciones</option>
              {(snapshot?.competitions || []).map((competition) => (
                <option value={competition.id} key={competition.id}>
                  {competition.shortName || competition.name} · {competition.seasonLabel}
                </option>
              ))}
            </select>
          )}
          {section !== "import" && (
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar competición, equipo o jugador"
            />
          )}
          <button className="button ghost" onClick={onRefresh} disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {error && <div className="database-error">{error}</div>}

      {section === "competitions" && (
        <div className="library-accordion">
          {competitionGroups.map((competition, competitionIndex) => (
            <details
              className="library-competition"
              key={competition.id}
              open={competitionIndex === 0}
            >
              <summary>
                <span className="competition-monogram">
                  {(competition.shortName || "LIGA").slice(0, 4)}
                </span>
                <span>
                  <strong>{competition.name}</strong>
                  <small>
                    {competition.governingBody || "Competición"} · {competition.seasonLabel}
                  </small>
                </span>
                <em>{competition.teams.length} equipos</em>
                <i>⌄</i>
              </summary>
              <div className="library-team-accordion">
                {competition.teams.map((team) => {
                  const teamPlayers = rosterPlayers
                    .filter(
                      (player) =>
                        player.teamId === team.id &&
                        (!player.competitionSeasonId ||
                          player.competitionSeasonId === competition.id)
                    )
                    .sort(
                      (left, right) =>
                        playerNumberValue(left) - playerNumberValue(right) ||
                        left.name.localeCompare(right.name, "es")
                    );
                  return (
                    <details
                      className="library-team-details"
                      key={`${competition.id}-${team.id}`}
                      style={{
                        "--library-team-color": team.primaryColor,
                        "--library-team-secondary": team.secondaryColor
                      }}
                    >
                      <summary>
                        <TeamIdentity team={team} />
                        <span className="library-team-summary">
                          <strong>{teamPlayers.length}</strong>
                          <small>jugadores</small>
                        </span>
                        <span className="library-team-summary">
                          <strong>{team.eventCount || 0}</strong>
                          <small>acciones</small>
                        </span>
                        <DataBadge type={team.dataStatus} />
                        <i>⌄</i>
                      </summary>
                      <div className="library-roster">
                        <header>
                          <strong>Plantilla</strong>
                          <span>Haz clic en un jugador para abrir su ficha completa.</span>
                        </header>
                        {teamPlayers.length > 0 ? (
                          <div className="library-roster-grid">
                            {teamPlayers.map((player) => (
                              <button
                                key={`${team.id}-${player.id}`}
                                onClick={() => setSelectedPlayer(player)}
                              >
                                <PlayerIdentity player={player} />
                                <span className="roster-history">
                                  <strong>{player.eventCount || 0}</strong>
                                  <small>acciones</small>
                                </span>
                                <span aria-hidden="true">→</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="database-empty compact">
                            <strong>Plantilla pendiente</strong>
                            <span>Importa jugadores o añádelos desde el editor.</span>
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          ))}
          {competitionGroups.length === 0 && (
            <div className="database-empty">
              <strong>No hay resultados para esta búsqueda</strong>
              <span>Prueba con otro término o importa una nueva competición.</span>
            </div>
          )}
          <div className="competition-directory-actions">
            <button className="button secondary" onClick={onManageTeams}>
              Crear o editar manualmente
            </button>
          </div>
        </div>
      )}

      {section === "matches" && (
        <div className="database-match-list">
          {analyzedMatches.length === 0 ? (
            <div className="database-empty">
              <strong>Todavía no hay partidos etiquetados</strong>
              <span>
                Los partidos aparecerán aquí automáticamente cuando guardes su
                primer análisis. No se muestran encuentros previstos.
              </span>
            </div>
          ) : (
            analyzedMatches.map((match) => (
              <article className="database-match-card" key={match.id}>
                <div className="database-match-meta">
                  <span>{match.competitionName}</span>
                  <strong>{match.roundName || "Partido analizado"}</strong>
                  <small>{matchDate(match.scheduledAt)}</small>
                </div>
                <div className="database-match-teams">
                  <TeamIdentity team={{
                    name: match.homeTeamName,
                    shortName: match.homeShortName,
                    logo: match.homeLogo,
                    primaryColor: match.homeColor
                  }} compact />
                  <span className="database-score">
                    {match.homeScore !== null && match.awayScore !== null
                      ? `${match.homeScore} – ${match.awayScore}`
                      : "VS"}
                  </span>
                  <TeamIdentity team={{
                    name: match.awayTeamName,
                    shortName: match.awayShortName,
                    logo: match.awayLogo,
                    primaryColor: match.awayColor
                  }} compact />
                </div>
                <div className="database-match-actions">
                  <span>
                    {match.analysisCount} análisis · {match.eventCount} acciones
                  </span>
                  <button className="button secondary" onClick={() => onUseMatch(match)}>
                    Abrir en etiquetado
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {section === "players" && (
        <div className="player-directory">
          <header className="player-directory-intro">
            <div>
              <span className="eyebrow">Directorio</span>
              <h2>Todos los jugadores</h2>
            </div>
            <p>
              Compara su actividad histórica y abre cualquier ficha para consultar
              datos deportivos, plantilla y trazabilidad.
            </p>
          </header>
          <div className="player-directory-grid">
            {searchablePlayers.map((player) => {
              const team = teamById.get(player.teamId);
              return (
                <button
                  className="player-directory-card"
                  key={`${player.id}-${player.teamId}`}
                  onClick={() => setSelectedPlayer(player)}
                  style={{ "--player-team-color": team?.primaryColor || "#2dd4bf" }}
                >
                  <PlayerIdentity player={player} />
                  <span className="player-card-team">{team?.name || player.teamName || "Sin equipo"}</span>
                  <span className="player-card-metrics">
                    <span><strong>{player.eventCount || 0}</strong> acciones</span>
                    <span><strong>{player.analysisCount || 0}</strong> análisis</span>
                  </span>
                  <em>Ver ficha completa →</em>
                </button>
              );
            })}
          </div>
          {searchablePlayers.length === 0 && (
            <div className="database-empty">
              <strong>No hay jugadores para mostrar</strong>
              <span>Importa una plantilla o crea jugadores manualmente.</span>
            </div>
          )}
        </div>
      )}

      {section === "import" && (
        <div className="database-import-workspace">
          <header>
            <span className="eyebrow">Importación guiada</span>
            <h2>Añade una competición completa en tres pasos</h2>
            <p>
              Una sola plantilla permite incorporar la competición, los equipos,
              las plantillas y sus altas, bajas o cambios de dorsal.
            </p>
          </header>
          {importReport && (
            <article className={`database-import-report ${importReport.warnings.length ? "has-warnings" : "success"}`}>
              <div>
                <span className="eyebrow">Última importación</span>
                <strong>
                  {importReport.imported.teams || 0} equipos · {importReport.imported.players || 0} jugadores
                  {importReport.imported.rosterChanges
                    ? ` · ${importReport.imported.rosterChanges} cambios de plantilla`
                    : ""}
                </strong>
              </div>
              {importReport.warnings.length > 0 ? (
                <details>
                  <summary>Revisar {importReport.warnings.length} avisos</summary>
                  <ul>
                    {importReport.warnings.map((warning, index) => (
                      <li key={`${warning}-${index}`}>{warning}</li>
                    ))}
                  </ul>
                </details>
              ) : (
                <span>Todos los registros se incorporaron correctamente.</span>
              )}
            </article>
          )}
          <div className="import-step-grid">
            <article>
              <span>1</span>
              <div>
                <h3>Descarga la plantilla</h3>
                <p>
                  Incluye hojas para Competición, Equipos, Jugadores y
                  CambiosPlantilla con ejemplos listos para sustituir.
                </p>
                <button className="button secondary" onClick={onCreateTemplate}>
                  Guardar plantilla Excel
                </button>
              </div>
            </article>
            <article className="featured">
              <span>2</span>
              <div>
                <h3>Completa e importa</h3>
                <p>
                  ScoutAnalyzer valida los códigos, actualiza fichas existentes y
                  avisa de cualquier dato que necesite revisión.
                </p>
                <button className="button primary" onClick={onImport}>
                  Importar Excel o CSV
                </button>
              </div>
            </article>
            <article>
              <span>3</span>
              <div>
                <h3>Protege la biblioteca</h3>
                <p>
                  Crea una copia de la base local antes de una actualización
                  masiva. Los vídeos no se duplican.
                </p>
                <button className="button ghost" onClick={onBackup}>
                  Crear copia de seguridad
                </button>
              </div>
            </article>
          </div>
          <article className="import-sheet-guide">
            {[
              ["Competición", "Nombre, temporada, federación y estado"],
              ["Equipos", "Identidad, ciudad, sede y colores"],
              ["Jugadores", "Dorsal, posición, altura y nacionalidad"],
              ["CambiosPlantilla", "Altas, bajas, cambios de dorsal o posición"]
            ].map(([name, description]) => (
              <div key={name}><strong>{name}</strong><span>{description}</span></div>
            ))}
          </article>
        </div>
      )}

      <PlayerModal
        player={selectedPlayer}
        team={selectedTeam}
        competition={selectedCompetition}
        onClose={() => setSelectedPlayer(null)}
      />
    </section>
  );
}
