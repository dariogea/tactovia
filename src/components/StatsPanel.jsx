import { useMemo, useState } from "react";
import { formatTime, statisticsFor } from "../lib/analysis.js";
import { sortPlayersByNumber } from "../lib/roster.js";
import { zoneStats } from "../lib/shotZones.js";
import { ShotCourtHeatmap } from "./ShotCourt.jsx";

function teamForEvent(project, event) {
  return project.teams.find(
    (team) => team.id === event.teamId || (!event.teamId && team.name === event.team)
  );
}

function TrendChart({ events, duration, color }) {
  const buckets = Array.from({ length: 12 }, (_, index) => ({ index, count: 0 }));
  const safeDuration = Math.max(
    duration || Math.max(...events.map((event) => event.end || 0), 1),
    1
  );
  events.forEach((event) => {
    const bucket = Math.min(
      buckets.length - 1,
      Math.floor(((event.anchor ?? event.start) / safeDuration) * buckets.length)
    );
    buckets[Math.max(0, bucket)].count += 1;
  });
  const maximum = Math.max(...buckets.map((bucket) => bucket.count), 1);
  const points = buckets.map((bucket, index) => ({
    ...bucket,
    x: 24 + (index / (buckets.length - 1)) * 752,
    y: 190 - (bucket.count / maximum) * 142
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `24,210 ${line} 776,210`;
  return (
    <div className="bi-trend-chart">
      <svg viewBox="0 0 800 220" role="img" aria-label="Evolución temporal de acciones">
        <defs>
          <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".35" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[50, 95, 140, 185].map((y) => (
          <line key={y} x1="24" y1={y} x2="776" y2={y} className="grid-line" />
        ))}
        <polygon points={area} fill="url(#trend-area)" />
        <polyline points={line} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <circle key={point.index} cx={point.x} cy={point.y} r="4.5" fill={color}>
            <title>{point.count} acciones</title>
          </circle>
        ))}
      </svg>
      <div className="trend-axis"><span>Inicio</span><span>1.er cuarto</span><span>Descanso</span><span>3.er cuarto</span><span>Final</span></div>
    </div>
  );
}

function HorizontalBars({ rows }) {
  const maximum = Math.max(...rows.map((row) => row.count), 1);
  return (
    <div className="bi-horizontal-bars">
      {rows.slice(0, 8).map((row) => (
        <div key={row.id}>
          <span>{row.name}</span>
          <div><i style={{ width: `${(row.count / maximum) * 100}%`, background: row.color }} /></div>
          <strong>{row.count}</strong>
        </div>
      ))}
    </div>
  );
}

function CompletenessBars({ rows }) {
  return (
    <div className="bi-completeness-bars">
      {rows.map((row) => (
        <div key={row.id}>
          <header><span>{row.label}</span><strong>{row.value}%</strong></header>
          <div><i style={{ width: `${row.value}%` }} /></div>
          <small>{row.detail}</small>
        </div>
      ))}
    </div>
  );
}

function FilterRail({
  project,
  scope,
  onScope,
  teamId,
  onTeam,
  playerId,
  onPlayer,
  tagId,
  onTag
}) {
  const team = project.teams.find((item) => item.id === teamId);
  const players = sortPlayersByNumber(team?.players || []);
  return (
    <aside className="bi-filter-rail">
      <div>
        <span className="eyebrow">Filtros</span>
        <h2>Explorar datos</h2>
        <p>Todos los visuales responden a esta selección.</p>
      </div>
      <label>
        <span>Ámbito</span>
        <select value={scope} onChange={(event) => onScope(event.target.value)}>
          <option value="all">Partido completo</option>
          <option value="team">Equipo</option>
          <option value="player">Jugador</option>
        </select>
      </label>
      <label>
        <span>Equipo</span>
        <select
          value={teamId}
          onChange={(event) => {
            onTeam(event.target.value);
            onPlayer("");
          }}
        >
          <option value="">Todos los equipos</option>
          {project.teams.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label>
        <span>Jugador</span>
        <select value={playerId} disabled={!teamId} onChange={(event) => onPlayer(event.target.value)}>
          <option value="">Todos los jugadores</option>
          {players.map((player) => <option value={player.id} key={player.id}>#{player.number || "—"} {player.name}</option>)}
        </select>
      </label>
      <label>
        <span>Etiqueta</span>
        <select value={tagId} onChange={(event) => onTag(event.target.value)}>
          <option value="">Todas las etiquetas</option>
          {project.template.tags.map((tag) => <option value={tag.id} key={tag.id}>{tag.name}</option>)}
        </select>
      </label>
      <button
        className="button ghost"
        onClick={() => {
          onScope("all");
          onTeam("");
          onPlayer("");
          onTag("");
        }}
      >
        Restablecer filtros
      </button>
      <div className="bi-data-status">
        <i />
        <div><strong>Modelo actualizado</strong><span>{project.events.length} registros disponibles</span></div>
      </div>
    </aside>
  );
}

export function StatsPanel({ project }) {
  const matchTeamIds = [project.match?.homeTeamId, project.match?.awayTeamId].filter(Boolean);
  const [scope, setScope] = useState("all");
  const [teamId, setTeamId] = useState(matchTeamIds[0] || "");
  const [playerId, setPlayerId] = useState("");
  const [tagId, setTagId] = useState("");
  const [page, setPage] = useState("overview");

  const selectedTeam = project.teams.find((team) => team.id === teamId);
  const filteredEvents = useMemo(
    () =>
      project.events.filter((event) => {
        if ((scope === "team" || scope === "player") && teamId && event.teamId !== teamId) return false;
        if (scope === "player" && playerId && event.playerId !== playerId) return false;
        if (tagId && event.tagId !== tagId) return false;
        return true;
      }),
    [playerId, project.events, scope, tagId, teamId]
  );
  const stats = statisticsFor(project.template.tags, filteredEvents);
  const chartColor = selectedTeam?.primaryColor || "#ff6b35";
  const intervalCount = filteredEvents.filter((event) => event.mode === "interval").length;
  const activePlayers = new Set(filteredEvents.map((event) => event.playerId).filter(Boolean)).size;
  const shotRows = zoneStats(filteredEvents);
  const shots = shotRows.reduce((total, zone) => total + zone.attempts, 0);
  const madeShots = shotRows.reduce((total, zone) => total + zone.made, 0);
  const shotPercentage = shots ? Math.round((madeShots / shots) * 100) : 0;
  const taggedDuration = filteredEvents.reduce(
    (total, event) => total + Math.max(0, event.end - event.start),
    0
  );
  const dataPercentage = (count, total = filteredEvents.length) =>
    total > 0 ? Math.round((count / total) * 100) : 0;
  const completenessRows = [
    {
      id: "team",
      label: "Equipo identificado",
      value: dataPercentage(filteredEvents.filter((event) => event.teamId).length),
      detail: `${filteredEvents.filter((event) => event.teamId).length} acciones vinculadas`
    },
    {
      id: "player",
      label: "Jugador identificado",
      value: dataPercentage(filteredEvents.filter((event) => event.playerId).length),
      detail: `${filteredEvents.filter((event) => event.playerId).length} acciones con jugador`
    },
    {
      id: "zone",
      label: "Tiros con zona",
      value: dataPercentage(
        filteredEvents.filter((event) => event.shotZoneId).length,
        shots
      ),
      detail: `${filteredEvents.filter((event) => event.shotZoneId).length} de ${shots} tiros`
    },
    {
      id: "notes",
      label: "Acciones con nota",
      value: dataPercentage(filteredEvents.filter((event) => event.notes?.trim()).length),
      detail: "Contexto cualitativo añadido por el analista"
    }
  ];
  const safeDuration = Math.max(
    project.video?.duration || Math.max(...filteredEvents.map((event) => event.end || 0), 0),
    1
  );
  const periodRows = ["1.er cuarto", "2.º cuarto", "3.er cuarto", "4.º cuarto"].map(
    (label, index) => {
      const start = (safeDuration / 4) * index;
      const end = (safeDuration / 4) * (index + 1);
      const events = filteredEvents.filter((event) => {
        const anchor = event.anchor ?? event.start;
        return anchor >= start && (index === 3 ? anchor <= end : anchor < end);
      });
      return {
        label,
        count: events.length,
        players: new Set(events.map((event) => event.playerId).filter(Boolean)).size,
        shots: zoneStats(events).reduce((total, zone) => total + zone.attempts, 0)
      };
    }
  );

  const teamRows = project.teams
    .map((team) => {
      const events = filteredEvents.filter((event) => teamForEvent(project, event)?.id === team.id);
      return {
        ...team,
        count: events.length,
        playersTagged: new Set(events.map((event) => event.playerId).filter(Boolean)).size
      };
    })
    .filter((team) => team.count > 0 || matchTeamIds.includes(team.id))
    .sort((left, right) => right.count - left.count);

  const playerRows = project.teams
    .flatMap((team) =>
      team.players.map((player) => ({
        ...player,
        team,
        count: filteredEvents.filter((event) => event.playerId === player.id).length
      }))
    )
    .filter((player) => player.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 12);

  return (
    <section
      className="analytics-view powerbi-view"
      style={{
        "--analytics-primary": chartColor,
        "--analytics-secondary": selectedTeam?.secondaryColor || "#222b3a"
      }}
    >
      <FilterRail
        project={project}
        scope={scope}
        onScope={setScope}
        teamId={teamId}
        onTeam={setTeamId}
        playerId={playerId}
        onPlayer={setPlayerId}
        tagId={tagId}
        onTag={setTagId}
      />
      <div className="bi-report-canvas">
        <header className="bi-report-header">
          <div>
            <span className="eyebrow">Informe interactivo</span>
            <h1>Inteligencia del partido</h1>
            <p>{selectedTeam?.name || "Todos los equipos"} · {filteredEvents.length} acciones filtradas</p>
          </div>
          <div className="bi-page-tabs">
            <button className={page === "overview" ? "active" : ""} onClick={() => setPage("overview")}>Resumen</button>
            <button className={page === "shooting" ? "active" : ""} onClick={() => setPage("shooting")}>Tiro y zonas</button>
            <button className={page === "quality" ? "active" : ""} onClick={() => setPage("quality")}>Calidad del dato</button>
          </div>
        </header>

        <div className="bi-kpi-grid">
          <article className="bi-kpi primary"><span>Acciones</span><strong>{filteredEvents.length}</strong><small>{stats.length} tipos distintos</small></article>
          <article className="bi-kpi"><span>Jugadores activos</span><strong>{activePlayers}</strong><small>con registro en el filtro</small></article>
          <article className="bi-kpi"><span>Tiempo etiquetado</span><strong>{formatTime(taggedDuration)}</strong><small>{intervalCount} intervalos</small></article>
          <article className="bi-kpi"><span>Acierto registrado</span><strong>{shotPercentage}%</strong><small>{madeShots} de {shots} tiros con zona</small></article>
        </div>

        {page === "overview" ? (
          <>
            <div className="bi-visual-grid">
              <article className="bi-visual wide">
                <header><div><span>Evolución</span><h2>Actividad durante el partido</h2></div><em>12 segmentos</em></header>
                {filteredEvents.length ? (
                  <TrendChart events={filteredEvents} duration={project.video?.duration || 0} color={chartColor} />
                ) : <div className="empty-inline">No hay registros para este filtro.</div>}
              </article>
              <article className="bi-visual">
                <header><div><span>Distribución</span><h2>Acciones por etiqueta</h2></div></header>
                {stats.length ? <HorizontalBars rows={stats} /> : <div className="empty-inline">Sin datos.</div>}
              </article>
              <article className="bi-visual">
                <header><div><span>Comparativa</span><h2>Equipos</h2></div></header>
                <div className="bi-team-table">
                  {teamRows.map((team) => (
                    <div key={team.id} style={{ "--row-color": team.primaryColor }}>
                      {team.logo ? <img src={team.logo} alt="" /> : <span>{team.shortName}</span>}
                      <div><strong>{team.name}</strong><small>{team.playersTagged} jugadores</small></div>
                      <b>{team.count}</b>
                    </div>
                  ))}
                </div>
              </article>
              <article className="bi-visual wide player-ranking-visual">
                <header><div><span>Detalle</span><h2>Participación por jugador</h2></div><em>Top 12</em></header>
                <div className="bi-player-ranking">
                  {playerRows.map((player, index) => (
                    <div key={player.id} style={{ "--row-color": player.team.primaryColor }}>
                      <em>{index + 1}</em>
                      <span className="bi-player-avatar">{player.photo ? <img src={player.photo} alt="" /> : `#${player.number || "—"}`}</span>
                      <div><strong>{player.name}</strong><small>{player.team.name} · {player.position || "Sin posición"}</small></div>
                      <b>{player.count}</b>
                    </div>
                  ))}
                  {playerRows.length === 0 && <div className="empty-inline">Todavía no hay jugadores etiquetados.</div>}
                </div>
              </article>
            </div>
          </>
        ) : page === "shooting" ? (
          <div className="bi-shooting-page">
            <article className="bi-visual shot-map-visual">
              <header><div><span>Mapa espacial</span><h2>Volumen y acierto por zona</h2></div><em>{shots} tiros localizados</em></header>
              <ShotCourtHeatmap events={filteredEvents} />
            </article>
            <article className="bi-visual">
              <header><div><span>Rendimiento</span><h2>Eficiencia por zona</h2></div></header>
              <div className="zone-performance-table">
                <div className="header"><span>Zona</span><span>Tiros</span><span>Acierto</span></div>
                {shotRows.map((zone) => (
                  <div key={zone.id}>
                    <span><i className={`points-${zone.points}`} />{zone.name}</span>
                    <strong>{zone.made}/{zone.attempts}</strong>
                    <b>{zone.attempts ? `${zone.percentage}%` : "—"}</b>
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : (
          <div className="bi-quality-page">
            <article className="bi-visual">
              <header>
                <div><span>Control de calidad</span><h2>Completitud del etiquetado</h2></div>
                <em>{filteredEvents.length} registros</em>
              </header>
              <CompletenessBars rows={completenessRows} />
            </article>
            <article className="bi-visual">
              <header>
                <div><span>Ritmo</span><h2>Actividad por periodo</h2></div>
                <em>División estimada</em>
              </header>
              <div className="bi-period-table">
                <div className="header"><span>Periodo</span><span>Acciones</span><span>Jugadores</span><span>Tiros</span></div>
                {periodRows.map((period) => (
                  <div key={period.label}>
                    <strong>{period.label}</strong>
                    <span>{period.count}</span>
                    <span>{period.players}</span>
                    <span>{period.shots}</span>
                  </div>
                ))}
              </div>
            </article>
            <article className="bi-visual bi-insight-card">
              <header><div><span>Lectura automática</span><h2>Estado del análisis</h2></div></header>
              <strong>
                {filteredEvents.length === 0
                  ? "Añade acciones para generar una lectura."
                  : completenessRows[1].value >= 80
                    ? "La identificación de jugadores es sólida."
                    : "Conviene identificar más jugadores antes de cerrar el informe."}
              </strong>
              <p>
                {shots === 0
                  ? "Todavía no hay tiros localizados."
                  : `${shots} tiros localizados con un ${shotPercentage}% de acierto registrado.`}
              </p>
              <span>
                Partido {project.match ? "vinculado" : "sin vincular"} ·{" "}
                {stats.length} tipos de acción utilizados
              </span>
            </article>
          </div>
        )}
        <footer className="bi-report-footer">
          <span>Tactovia · Modelo local</span>
          <span>Última actualización: {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(project.updatedAt || Date.now()))}</span>
        </footer>
      </div>
    </section>
  );
}
