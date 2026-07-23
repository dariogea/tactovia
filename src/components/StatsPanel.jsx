import { useEffect, useMemo, useState } from "react";
import { formatTime, statisticsFor } from "../lib/analysis.js";
import { sortPlayersByNumber } from "../lib/roster.js";

function teamForEvent(project, event) {
  return project.teams.find(
    (team) => team.id === event.teamId || (!event.teamId && team.name === event.team)
  );
}

const chartPreferencesKey = "scout-analyzer-chart-preferences-v1";

function readChartPreferences() {
  const defaults = {
    chartType: "bar",
    metric: "count",
    colorMode: "team",
    customColor: "#2dd4bf"
  };
  if (typeof window === "undefined") return defaults;
  try {
    return {
      ...defaults,
      ...JSON.parse(localStorage.getItem(chartPreferencesKey))
    };
  } catch {
    return defaults;
  }
}

function ChartLegend({ rows }) {
  return (
    <div className="chart-legend">
      {rows.map((row) => (
        <span key={row.id}><i style={{ background: row.displayColor }} />{row.name}<strong>{row.label}</strong></span>
      ))}
    </div>
  );
}

function BarChart({ rows, maximum }) {
  return (
    <div className="pro-bar-chart">
      {rows.map((row) => (
        <div className="pro-bar-row" key={row.id}>
          <span>{row.name}</span>
          <div><i style={{ width: `${(row.value / maximum) * 100}%`, background: row.displayColor }} /></div>
          <strong>{row.label}</strong>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  let progress = 0;
  const segments = rows.map((row) => {
    const start = (progress / total) * 360;
    progress += row.value;
    const end = (progress / total) * 360;
    return `${row.displayColor} ${start}deg ${end}deg`;
  });
  return (
    <div className="donut-chart-layout">
      <div className="donut-chart" style={{ background: `conic-gradient(${segments.join(",")})` }}>
        <span><strong>{rows.reduce((sum, row) => sum + row.count, 0)}</strong>acciones</span>
      </div>
      <ChartLegend rows={rows} />
    </div>
  );
}

function TrendChart({ events, duration, color }) {
  const buckets = Array.from({ length: 10 }, (_, index) => ({
    index,
    count: 0
  }));
  const safeDuration = Math.max(duration || Math.max(...events.map((event) => event.end || 0), 1), 1);
  events.forEach((event) => {
    const bucket = Math.min(9, Math.floor(((event.anchor ?? event.start) / safeDuration) * 10));
    buckets[Math.max(0, bucket)].count += 1;
  });
  const maximum = Math.max(...buckets.map((bucket) => bucket.count), 1);
  const points = buckets.map((bucket, index) => {
    const x = 25 + (index / 9) * 750;
    const y = 205 - (bucket.count / maximum) * 165;
    return { ...bucket, x, y };
  });
  return (
    <div className="trend-chart">
      <svg viewBox="0 0 800 240" role="img" aria-label="Distribución de acciones a lo largo del vídeo">
        {[40, 95, 150, 205].map((y) => <line key={y} x1="25" y1={y} x2="775" y2={y} className="grid-line" />)}
        <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point) => <circle key={point.index} cx={point.x} cy={point.y} r="6" fill={color}><title>{point.count} acciones</title></circle>)}
      </svg>
      <div className="trend-axis"><span>Inicio</span><span>Mitad</span><span>Final</span></div>
    </div>
  );
}

export function StatsPanel({ project }) {
  const initialChartPreferences = useMemo(readChartPreferences, []);
  const matchTeamIds = [project.match?.homeTeamId, project.match?.awayTeamId].filter(Boolean);
  const initialTeamId = matchTeamIds[0] || project.teams[0]?.id || "";
  const [scope, setScope] = useState("all");
  const [teamId, setTeamId] = useState(initialTeamId);
  const [playerId, setPlayerId] = useState("");
  const [chartType, setChartType] = useState(initialChartPreferences.chartType);
  const [metric, setMetric] = useState(initialChartPreferences.metric);
  const [colorMode, setColorMode] = useState(initialChartPreferences.colorMode);
  const [customColor, setCustomColor] = useState(initialChartPreferences.customColor);

  useEffect(() => {
    localStorage.setItem(
      chartPreferencesKey,
      JSON.stringify({ chartType, metric, colorMode, customColor })
    );
  }, [chartType, colorMode, customColor, metric]);

  const selectedTeam = project.teams.find((team) => team.id === teamId) || project.teams[0];
  const orderedPlayers = sortPlayersByNumber(selectedTeam?.players || []);
  const filteredEvents = useMemo(() => {
    if (scope === "team") return project.events.filter((event) => event.teamId === teamId);
    if (scope === "player") return project.events.filter((event) => event.playerId === playerId);
    return project.events;
  }, [playerId, project.events, scope, teamId]);

  const stats = statisticsFor(project.template.tags, filteredEvents);
  const rows = stats.map((row) => {
    const value = metric === "duration" ? row.duration : row.count;
    return {
      ...row,
      value,
      label: metric === "duration" ? formatTime(row.duration) : String(row.count),
      displayColor:
        colorMode === "custom"
          ? customColor
          : colorMode === "team" && selectedTeam?.primaryColor
          ? selectedTeam.primaryColor
          : row.color
    };
  });
  const maximum = Math.max(...rows.map((row) => row.value), 1);
  const intervalCount = filteredEvents.filter((event) => event.mode === "interval").length;
  const activePlayers = new Set(filteredEvents.map((event) => event.playerId).filter(Boolean)).size;

  const teamRows = project.teams
    .map((team) => {
      const events = project.events.filter((event) => teamForEvent(project, event)?.id === team.id);
      return {
        ...team,
        count: events.length,
        players: new Set(events.map((event) => event.playerId).filter(Boolean)).size
      };
    })
    .filter((team) => team.count > 0 || matchTeamIds.includes(team.id))
    .sort((left, right) => right.count - left.count);

  const playerRows = project.teams
    .flatMap((team) =>
      team.players.map((player) => ({
        ...player,
        team,
        count: project.events.filter((event) => event.playerId === player.id).length
      }))
    )
    .filter((player) => player.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 10);

  const chartColor =
    colorMode === "custom"
      ? customColor
      : colorMode === "team"
        ? selectedTeam?.primaryColor || "#2DD4BF"
        : rows[0]?.color || "#2DD4BF";

  return (
    <section
      className="analytics-view"
      style={{
        "--analytics-primary": chartColor,
        "--analytics-secondary": selectedTeam?.secondaryColor || "#0f766e"
      }}
    >
      <div className="analytics-toolbar">
        <div>
          <span className="eyebrow">Panel estadístico</span>
          <h1>Rendimiento del partido</h1>
        </div>
        <div className="analytics-controls">
          <label><span>Ámbito</span><select value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">Partido completo</option><option value="team">Equipo</option><option value="player">Jugador</option></select></label>
          {(scope === "team" || scope === "player") && <label><span>Equipo</span><select value={teamId} onChange={(event) => { setTeamId(event.target.value); setPlayerId(""); }}><option value="">Seleccionar</option>{project.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
          {scope === "player" && <label><span>Jugador</span><select value={playerId} onChange={(event) => setPlayerId(event.target.value)}><option value="">Seleccionar</option>{orderedPlayers.map((player) => <option key={player.id} value={player.id}>#{player.number || "—"} {player.name}</option>)}</select></label>}
        </div>
      </div>

      <div className="metric-grid">
        <article className="metric-card accent" style={{ "--metric-color": chartColor }}><span>Acciones</span><strong>{filteredEvents.length}</strong><small>en la selección actual</small></article>
        <article className="metric-card" style={{ "--metric-color": chartColor }}><span>Jugadores etiquetados</span><strong>{activePlayers}</strong><small>con al menos una acción</small></article>
        <article className="metric-card" style={{ "--metric-color": chartColor }}><span>Intervalos</span><strong>{intervalCount}</strong><small>{filteredEvents.length ? Math.round((intervalCount / filteredEvents.length) * 100) : 0}% del registro</small></article>
        <article className="metric-card" style={{ "--metric-color": chartColor }}><span>Duración del vídeo</span><strong>{formatTime(project.video?.duration || 0)}</strong><small>{project.video?.name || "Sin vídeo"}</small></article>
      </div>

      <article className="chart-card analytics-main-chart" style={{ "--chart-team": chartColor }}>
        <div className="section-heading">
          <div><span className="eyebrow">Distribución</span><h2>Acciones por etiqueta</h2></div>
          <div className="chart-options">
            <select value={chartType} onChange={(event) => setChartType(event.target.value)}><option value="bar">Barras</option><option value="donut">Anillo</option><option value="trend">Evolución temporal</option></select>
            <select value={metric} onChange={(event) => setMetric(event.target.value)} disabled={chartType === "trend"}><option value="count">Número de acciones</option><option value="duration">Duración acumulada</option></select>
            <select value={colorMode} onChange={(event) => setColorMode(event.target.value)}><option value="team">Color del equipo</option><option value="tag">Color de etiquetas</option><option value="custom">Color personalizado</option></select>
            {colorMode === "custom" && (
              <input
                className="chart-color-picker"
                type="color"
                value={customColor}
                onChange={(event) => setCustomColor(event.target.value)}
                aria-label="Color personalizado del gráfico"
              />
            )}
          </div>
        </div>
        {filteredEvents.length === 0 ? (
          <div className="empty-inline">No hay eventos para esta selección.</div>
        ) : chartType === "bar" ? (
          <BarChart rows={rows} maximum={maximum} />
        ) : chartType === "donut" ? (
          <DonutChart rows={rows} />
        ) : (
          <TrendChart events={filteredEvents} duration={project.video?.duration || 0} color={chartColor} />
        )}
      </article>

      <div className="analytics-detail-grid">
        <article className="chart-card">
          <div className="section-heading"><div><span className="eyebrow">Comparativa</span><h2>Equipos</h2></div></div>
          <div className="team-stat-list">
            {teamRows.length === 0 ? <div className="empty-inline">Aún no hay equipos etiquetados.</div> : teamRows.map((team) => (
              <div key={team.id} style={{ "--team-stat-color": team.primaryColor, "--team-stat-secondary": team.secondaryColor }}>
                {team.logo ? <img src={team.logo} alt="" /> : <span>{team.shortName}</span>}
                <div><strong>{team.name}</strong><small>{team.players} jugadores etiquetados</small></div>
                <b>{team.count}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="chart-card">
          <div className="section-heading"><div><span className="eyebrow">Participación</span><h2>Jugadores</h2></div></div>
          <div className="player-stat-list">
            {playerRows.length === 0 ? <div className="empty-inline">Aún no hay jugadores etiquetados.</div> : playerRows.map((player, index) => (
              <div key={player.id} style={{ "--player-stat-color": player.team.primaryColor }}>
                <em>{index + 1}</em>
                {player.photo ? <img src={player.photo} alt="" /> : <span>#{player.number || "—"}</span>}
                <div><strong>{player.name}</strong><small>{player.team.name}</small></div>
                <b>{player.count}</b>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
