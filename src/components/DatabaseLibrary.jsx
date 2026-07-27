import { useMemo, useState } from "react";

function TeamIdentity({ name, shortName, color, logo }) {
  return (
    <span className="library-team-identity">
      {logo ? (
        <img src={logo} alt="" />
      ) : (
        <i style={{ background: color || "#2dd4bf" }}>
          {(shortName || name || "—").slice(0, 3)}
        </i>
      )}
      <strong>{name}</strong>
    </span>
  );
}

function matchDate(value) {
  if (!value) return "Fecha pendiente";
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

function DataBadge({ type }) {
  if (type === "demo") {
    return (
      <span className="database-data-badge demo" title="Ficha ficticia para probar el MVP">
        DEMO
      </span>
    );
  }
  if (type === "official-team") {
    return (
      <span
        className="database-data-badge official"
        title="Equipo contrastado con el calendario oficial FBRM 2026/27"
      >
        FBRM
      </span>
    );
  }
  return null;
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
  const normalizedSearch = search.trim().toLocaleLowerCase("es");
  const totals = snapshot?.totals || {
    teams: 0,
    players: 0,
    matches: 0,
    analyses: 0,
    events: 0,
    pendingSync: 0
  };

  const matches = useMemo(
    () =>
      (snapshot?.matches || []).filter((match) => {
        if (
          competitionSeasonId !== "all" &&
          match.competitionSeasonId !== competitionSeasonId
        ) {
          return false;
        }
        if (!normalizedSearch) return true;
        return [
          match.homeTeamName,
          match.awayTeamName,
          match.roundName,
          match.venue,
          match.competitionName
        ].some((value) =>
          String(value || "").toLocaleLowerCase("es").includes(normalizedSearch)
        );
      }),
    [competitionSeasonId, normalizedSearch, snapshot?.matches]
  );

  const teams = useMemo(
    () =>
      (snapshot?.teams || []).filter((team) =>
        !normalizedSearch
          ? true
          : [team.name, team.shortName, team.city, team.clubName].some((value) =>
              String(value || "")
                .toLocaleLowerCase("es")
                .includes(normalizedSearch)
            )
      ),
    [normalizedSearch, snapshot?.teams]
  );

  const players = useMemo(
    () =>
      (snapshot?.players || [])
        .filter((player) =>
          !normalizedSearch
            ? true
            : [player.name, player.teamName, player.position].some((value) =>
                String(value || "")
                  .toLocaleLowerCase("es")
                  .includes(normalizedSearch)
              )
        )
        .sort(
          (left, right) =>
            left.teamName.localeCompare(right.teamName, "es") ||
            playerNumberValue(left) - playerNumberValue(right) ||
            left.name.localeCompare(right.name, "es")
        ),
    [normalizedSearch, snapshot?.players]
  );
  const competitionGroups = useMemo(() => {
    const memberships = snapshot?.competitionTeams || [];
    const competitions = snapshot?.competitions || [];
    const visibleTeamIds = new Set(teams.map((team) => team.id));
    const rows = competitions.map((competition) => ({
      ...competition,
      teams: memberships
        .filter(
          (membership) =>
            membership.competitionSeasonId === competition.id &&
            visibleTeamIds.has(membership.teamId)
        )
        .map((membership) =>
          teams.find((team) => team.id === membership.teamId)
        )
        .filter(Boolean)
    }));
    const assigned = new Set(rows.flatMap((row) => row.teams.map((team) => team.id)));
    const unassigned = teams.filter((team) => !assigned.has(team.id));
    if (unassigned.length > 0) {
      rows.push({
        id: "local-category",
        shortName: "Local",
        name: "Equipos y categorías locales",
        seasonLabel: "Sin competición asignada",
        governingBody: "ScoutAnalyzer",
        teamCount: unassigned.length,
        matchCount: 0,
        teams: unassigned
      });
    }
    return rows.filter((row) => row.teams.length > 0);
  }, [snapshot?.competitionTeams, snapshot?.competitions, teams]);

  return (
    <section className="database-view">
      <div className="database-hero">
        <div>
          <span className="eyebrow">Histórico deportivo</span>
          <h1>Biblioteca de scouting</h1>
          <p>
            Competiciones, partidos y perfiles relacionados en una única base.
            El vídeo continúa guardado únicamente en este ordenador.
          </p>
        </div>
        <div className="database-status-stack">
          <span className="database-status ready">
            <i />
            Caché local activa
          </span>
          <span
            className={`database-status ${snapshot?.cloud?.configured ? "ready" : "pending"}`}
          >
            <i />
            {snapshot?.cloud?.configured
              ? "Conexión en la nube configurada"
              : "Nube pendiente de conectar"}
          </span>
          {snapshot?.catalog?.fbrmTeamCount > 0 && (
            <span className="database-status ready">
              <i />
              Catálogo FBRM · {snapshot.catalog.fbrmTeamCount} equipos
            </span>
          )}
        </div>
      </div>

      <div className="database-summary-grid">
        <article>
          <span>Equipos</span>
          <strong>{totals.teams}</strong>
        </article>
        <article>
          <span>Jugadores</span>
          <strong>{totals.players}</strong>
        </article>
        <article>
          <span>Partidos</span>
          <strong>{totals.matches}</strong>
        </article>
        <article>
          <span>Análisis</span>
          <strong>{totals.analyses}</strong>
        </article>
        <article className="accent">
          <span>Acciones históricas</span>
          <strong>{totals.events}</strong>
        </article>
      </div>

      <div className="database-toolbar">
        <div className="segmented-control">
          <button
            className={section === "competitions" ? "active" : ""}
            onClick={() => setSection("competitions")}
          >
            Competiciones y equipos
          </button>
          <button
            className={section === "matches" ? "active" : ""}
            onClick={() => setSection("matches")}
          >
            Partidos
          </button>
          <button
            className={section === "players" ? "active" : ""}
            onClick={() => setSection("players")}
          >
            Jugadores
          </button>
          <button
            className={section === "admin" ? "active" : ""}
            onClick={() => setSection("admin")}
          >
            Administración
          </button>
        </div>
        <div className="database-search-tools">
          {section === "matches" && (
            <select
              value={competitionSeasonId}
              onChange={(event) => setCompetitionSeasonId(event.target.value)}
              aria-label="Competición y temporada"
            >
              <option value="all">Todas las competiciones</option>
              {(snapshot?.competitions || []).map((competition) => (
                <option value={competition.id} key={competition.id}>
                  {competition.shortName || competition.name} · {competition.seasonLabel}
                </option>
              ))}
            </select>
          )}
          {section !== "admin" && (
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar equipo, jugador o jornada"
            />
          )}
          <button className="button ghost" onClick={onRefresh} disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {error && <div className="database-error">{error}</div>}

      {section === "competitions" && (
        <div className="competition-directory">
          {competitionGroups.map((competition) => (
            <article className="competition-group" key={competition.id}>
              <header>
                <div className="competition-identity">
                  <span>{competition.shortName?.slice(0, 4) || "LIGA"}</span>
                  <div>
                    <strong>{competition.name}</strong>
                    <small>
                      {competition.governingBody || "Competición"} ·{" "}
                      {competition.seasonLabel || "Temporada actual"}
                    </small>
                  </div>
                </div>
                <div className="competition-group-counts">
                  <span><strong>{competition.teams.length}</strong> equipos</span>
                  <span><strong>{competition.matchCount || 0}</strong> partidos</span>
                </div>
              </header>
              <div className="competition-team-grid">
                {competition.teams.map((team) => (
                  <article
                    className="competition-team-card"
                    key={team.id}
                    style={{
                      "--library-team-color": team.primaryColor,
                      "--library-team-secondary": team.secondaryColor
                    }}
                  >
                    <TeamIdentity
                      name={team.name}
                      shortName={team.shortName}
                      color={team.primaryColor}
                      logo={team.logo}
                    />
                    <div className="competition-team-facts">
                      <span><DataBadge type={team.dataStatus} />{team.city || team.category || "Equipo"}</span>
                      <strong>{team.playerCount} jugadores</strong>
                      <small>{team.eventCount} acciones históricas</small>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ))}
          {competitionGroups.length === 0 && (
            <div className="database-empty">
              <strong>Todavía no hay categorías</strong>
              <span>Crea un equipo o importa el catálogo de una competición.</span>
            </div>
          )}
          <div className="competition-directory-actions">
            <button className="button secondary" onClick={onManageTeams}>
              Crear o editar equipos y jugadores
            </button>
          </div>
        </div>
      )}

      {section === "matches" && (
        <div className="database-match-list">
          {matches.length === 0 ? (
            <div className="database-empty">
              <strong>No hay partidos en este filtro</strong>
              <span>
                Puedes incorporarlos desde Administración con la plantilla Excel.
              </span>
            </div>
          ) : (
            matches.map((match) => (
              <article className="database-match-card" key={match.id}>
                <div className="database-match-meta">
                  <span>{match.competitionName}</span>
                  <strong>{match.roundName || "Jornada pendiente"}</strong>
                  <small>{matchDate(match.scheduledAt)}</small>
                </div>
                <div className="database-match-teams">
                  <TeamIdentity
                    name={match.homeTeamName}
                    shortName={match.homeShortName}
                    color={match.homeColor}
                    logo={match.homeLogo}
                  />
                  <span className="database-score">
                    {match.homeScore !== null && match.awayScore !== null
                      ? `${match.homeScore} – ${match.awayScore}`
                      : "VS"}
                  </span>
                  <TeamIdentity
                    name={match.awayTeamName}
                    shortName={match.awayShortName}
                    color={match.awayColor}
                    logo={match.awayLogo}
                  />
                </div>
                <div className="database-match-actions">
                  <span>
                    {match.analysisCount} análisis · {match.eventCount} acciones
                  </span>
                  <button
                    className="button secondary"
                    onClick={() => onUseMatch(match)}
                  >
                    Usar en etiquetado
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {section === "players" && (
        <div className="database-player-table">
          <div className="database-player-row header">
            <span>Jugador</span>
            <span>Equipo</span>
            <span>Posición</span>
            <span>Histórico</span>
          </div>
          {players.map((player) => (
            <div className="database-player-row" key={`${player.id}-${player.teamId}`}>
              <span className="database-player-name">
                {player.photo ? (
                  <img src={player.photo} alt="" />
                ) : (
                  <i>#{player.number || "—"}</i>
                )}
                <span className="database-player-label">
                  <strong>{player.name}</strong>
                  <DataBadge type={player.isDemo ? "demo" : player.dataStatus} />
                </span>
              </span>
              <span>{player.teamName || "Sin plantilla asignada"}</span>
              <span>{player.position || "Sin indicar"}</span>
              <span>
                <strong>{player.eventCount}</strong> acciones ·{" "}
                {player.analysisCount} análisis
              </span>
            </div>
          ))}
          {players.length === 0 && (
            <div className="database-empty">
              <strong>Todavía no hay jugadores</strong>
              <span>Se mostrarán aquí al crear o importar las plantillas.</span>
            </div>
          )}
        </div>
      )}

      {section === "admin" && (
        <>
          {importReport && (
            <article
              className={`database-import-report ${
                importReport.warnings.length > 0 ? "has-warnings" : "success"
              }`}
            >
              <div>
                <span className="eyebrow">Última importación</span>
                <strong>
                  {importReport.imported.teams} equipos ·{" "}
                  {importReport.imported.players} jugadores ·{" "}
                  {importReport.imported.matches} partidos
                </strong>
              </div>
              {importReport.warnings.length > 0 ? (
                <details>
                  <summary>
                    Revisar {importReport.warnings.length}{" "}
                    {importReport.warnings.length === 1 ? "aviso" : "avisos"}
                  </summary>
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
          <div className="database-admin-grid">
            <article className="database-catalog-card">
            <span className="admin-step catalog">✓</span>
            <div>
              <h2>Catálogo FBRM 2026/27</h2>
              <p>
                Incluye los 16 equipos oficiales, sedes, ciudades, colores de
                trabajo y la primera jornada. Las plantillas de prueba están
                marcadas como DEMO y se podrán sustituir sin perder análisis.
              </p>
              <span className="database-admin-state">
                {snapshot?.catalog?.officialLogoCount || 0} escudos oficiales ·{" "}
                {snapshot?.catalog?.provisionalLogoCount || 0} identidades
                provisionales
              </span>
            </div>
            </article>
            <article>
            <span className="admin-step">1</span>
            <div>
              <h2>Descargar plantilla</h2>
              <p>
                Libro Excel preparado para equipos, jugadores, dorsales, jornadas,
                fechas y resultados de Primera División FBRM.
              </p>
              <button className="button secondary" onClick={onCreateTemplate}>
                Guardar plantilla Excel
              </button>
            </div>
            </article>
            <article>
            <span className="admin-step">2</span>
            <div>
              <h2>Importar datos</h2>
              <p>
                Revisa códigos y nombres, evita duplicados y actualiza las fichas
                ya existentes conservando sus análisis.
              </p>
              <button className="button primary" onClick={onImport}>
                Importar Excel o CSV
              </button>
            </div>
            </article>
            <article>
            <span className="admin-step">3</span>
            <div>
              <h2>Copia de seguridad</h2>
              <p>
                Guarda una copia completa de la biblioteca local, incluidos los
                análisis históricos. Los vídeos no se copian.
              </p>
              <button className="button ghost" onClick={onBackup}>
                Crear copia de la base
              </button>
            </div>
            </article>
            <article className="database-cloud-card">
            <span className="admin-step cloud">☁</span>
            <div>
              <h2>Base compartida</h2>
              <p>
                El catálogo será visible para todos; los análisis permanecerán
                privados por usuario o club. La conexión se activará mediante
                cuentas y permisos antes del piloto público.
              </p>
              <span className="database-admin-state">
                {snapshot?.cloud?.configured
                  ? "Configuración recibida"
                  : "Pendiente de crear el proyecto en la nube"}
              </span>
            </div>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
