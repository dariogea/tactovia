import { useMemo, useState } from "react";
import { ShotCourtHeatmap } from "./ShotCourt.jsx";
import { formatTime } from "../lib/analysis.js";

function TeamBadge({ team }) {
  if (!team) return <span className="report-team-empty">Equipo pendiente</span>;
  return (
    <div
      className="report-team-badge"
      style={{ "--report-team": team.primaryColor }}
    >
      {team.logo ? (
        <img src={team.logo} alt="" />
      ) : (
        <i>{team.shortName || "EQ"}</i>
      )}
      <div>
        <strong>{team.name}</strong>
        <small>{team.category || team.city || "Equipo"}</small>
      </div>
    </div>
  );
}

export function ReportCenter({
  project,
  stats,
  selectedEventIds,
  dataExportFormat,
  onDataExportFormat,
  onExportData,
  onToggleSelectAll,
  onConfigureClips,
  automaticAnalysis,
  onExportAnalysis,
  onExportVisualReport,
  desktopAvailable,
  onCopySummary,
}) {
  const [section, setSection] = useState("insights");
  const home = project.teams.find(
    (team) => team.id === project.match?.homeTeamId,
  );
  const away = project.teams.find(
    (team) => team.id === project.match?.awayTeamId,
  );
  const readyChecks = [
    {
      label: "Vídeo",
      ready: Boolean(project.video?.path || project.video?.name),
    },
    { label: "Partido", ready: Boolean(home && away) },
    { label: "Acciones", ready: project.events.length > 0 },
  ];
  const recentEvents = useMemo(
    () =>
      project.events
        .slice()
        .sort((left, right) => right.start - left.start)
        .slice(0, 5),
    [project.events],
  );
  const allSelected =
    project.events.length > 0 &&
    selectedEventIds.size === project.events.length;

  return (
    <section className="report-center">
      <header className="report-center-hero">
        <div>
          <span className="eyebrow">Centro de entregables</span>
          <h1>Comparte tu lectura del partido.</h1>
          <p>
            Genera conclusiones automáticas, un dossier visual de estadísticas,
            datos estructurados o una entrega de vídeo.
          </p>
        </div>
        <div className="report-readiness">
          {readyChecks.map((check) => (
            <span className={check.ready ? "ready" : ""} key={check.label}>
              <i>{check.ready ? "✓" : "·"}</i>
              {check.label}
            </span>
          ))}
        </div>
      </header>

      <nav className="report-section-tabs" aria-label="Tipos de entrega">
        <button
          className={section === "insights" ? "active" : ""}
          onClick={() => setSection("insights")}
        >
          <span>01</span>
          <strong>Conclusiones</strong>
          <small>Equipo y jugadores</small>
        </button>
        <button
          className={section === "visuals" ? "active" : ""}
          onClick={() => setSection("visuals")}
        >
          <span>02</span>
          <strong>Visuales</strong>
          <small>Gráficos del partido</small>
        </button>
        <button
          className={section === "clips" ? "active" : ""}
          onClick={() => setSection("clips")}
        >
          <span>03</span>
          <strong>Vídeo</strong>
          <small>Clips y highlights</small>
        </button>
        <button
          className={section === "data" ? "active" : ""}
          onClick={() => setSection("data")}
        >
          <span>04</span>
          <strong>Datos</strong>
          <small>Excel, BI o CSV</small>
        </button>
      </nav>

      {section === "insights" && (
        <div className="report-workspace intelligence-workspace">
          <article className="intelligence-report-card">
            <header>
              <div>
                <span className="ai-local-badge">
                  Lectura automática · basada en etiquetas
                </span>
                <h2>Conclusiones automáticas</h2>
              </div>
              <em>{automaticAnalysis?.totalEvents || 0} acciones procesadas</em>
            </header>
            <div className="report-matchup">
              <TeamBadge team={home} />
              <strong>VS</strong>
              <TeamBadge team={away} />
            </div>
            <div className="analysis-quality-strip">
              <span>
                <strong>
                  {automaticAnalysis?.dataQuality.teamCoverage || 0}%
                </strong>{" "}
                equipos identificados
              </span>
              <span>
                <strong>
                  {automaticAnalysis?.dataQuality.playerCoverage || 0}%
                </strong>{" "}
                jugadores identificados
              </span>
              <span>
                <strong>
                  {automaticAnalysis?.dataQuality.zoneCoverage || 0}%
                </strong>{" "}
                tiros con zona
              </span>
            </div>
            <div className="automatic-team-grid">
              {(automaticAnalysis?.teams || []).map((team) => (
                <section
                  key={team.id}
                  style={{ "--analysis-team": team.color }}
                >
                  <header>
                    <i />
                    <div>
                      <strong>{team.name}</strong>
                      <small>
                        {team.actions} acciones · {team.score} puntos
                        etiquetados
                      </small>
                    </div>
                  </header>
                  <ul>
                    {team.conclusions.map((conclusion) => (
                      <li key={conclusion}>{conclusion}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <div className="automatic-player-list">
              <strong>Lectura individual priorizada</strong>
              {(automaticAnalysis?.players || []).map((player) => (
                <span key={player.id}>
                  <b>
                    #{player.number || "—"} {player.name}
                  </b>
                  <small>{player.conclusion}</small>
                </span>
              ))}
            </div>
            {project.analysisNotes && (
              <section className="analyst-note-preview">
                <span className="eyebrow">Notas del analista</span>
                <p>{project.analysisNotes}</p>
              </section>
            )}
            <p className="analysis-caveat">{automaticAnalysis?.caveat}</p>
          </article>
          <aside className="report-action-panel">
            <span className="eyebrow">Informe interpretativo</span>
            <h2>Equipo e individual</h2>
            <p>
              El motor relaciona tiro, zonas, pérdidas, recuperaciones, rebote y
              participación sin inventar acciones que no hayan sido etiquetadas.
            </p>
            <button
              className="button primary"
              onClick={onExportAnalysis}
              disabled={!automaticAnalysis?.ready || !desktopAvailable}
            >
              Exportar análisis PDF
            </button>
            <button
              className="button ghost"
              onClick={onCopySummary}
              disabled={!project.events.length}
            >
              Copiar resumen
            </button>
            {!desktopAvailable && (
              <small>
                La exportación PDF avanzada está disponible en la app de
                escritorio. En web puedes copiar el resumen y exportar CSV.
              </small>
            )}
          </aside>
        </div>
      )}

      {section === "visuals" && (
        <div className="visual-export-workspace">
          <header>
            <div>
              <span className="eyebrow">Dossier visual</span>
              <h2>Estadísticas sin ruido</h2>
              <p>
                Un PDF apaisado con gráficos del partido y el mínimo texto
                imprescindible.
              </p>
            </div>
            <button
              className="button primary"
              onClick={onExportVisualReport}
              disabled={!project.events.length || !desktopAvailable}
            >
              Exportar gráficos PDF
            </button>
          </header>
          <div className="visual-report-preview">
            <article>
              <span>Actividad temporal</span>
              <div className="preview-bars">
                {Array.from({ length: 12 }, (_, i) => {
                  const duration = project.events.reduce(
                    (maximum, event) => Math.max(maximum, event.end || 0),
                    1,
                  );
                  const counts = Array.from(
                    { length: 12 },
                    (_, j) =>
                      project.events.filter(
                        (e) =>
                          Math.min(
                            11,
                            Math.floor((e.start / duration) * 12),
                          ) === j,
                      ).length,
                  );
                  return (
                    <i
                      key={i}
                      title={`${counts[i]} acciones`}
                      style={{
                        height: `${(counts[i] / Math.max(...counts, 1)) * 100}%`,
                        background: "var(--teal)",
                      }}
                    />
                  );
                })}
              </div>
            </article>
            <article>
              <span>Acciones por etiqueta</span>
              <div className="preview-bars">
                {stats.slice(0, 5).map((item) => (
                  <i
                    key={item.id}
                    style={{
                      height: `${Math.max(12, (item.count / Math.max(stats[0]?.count || 1, 1)) * 100)}%`,
                      background: item.color,
                    }}
                  />
                ))}
              </div>
            </article>
            <article>
              <span>Mapa de tiro</span>
              <ShotCourtHeatmap events={project.events} />
            </article>
            <article>
              <span>Participación</span>
              <strong>
                {
                  new Set(
                    project.events
                      .map((event) => event.playerId)
                      .filter(Boolean),
                  ).size
                }
              </strong>
              <small>jugadores etiquetados</small>
            </article>
          </div>
          {!desktopAvailable && (
            <p className="web-capability-note">
              La vista web mantiene el dashboard interactivo; la impresión
              maquetada en PDF requiere la versión de escritorio.
            </p>
          )}
        </div>
      )}

      {section === "data" && (
        <div className="report-workspace data-workspace">
          <article className="report-choice-panel">
            <span className="eyebrow">Formato</span>
            <h2>Datos estructurados</h2>
            <p>Elige el formato según el uso que vayas a darle.</p>
            <div className="report-format-grid">
              <button
                className={dataExportFormat === "xlsx" ? "active" : ""}
                onClick={() => onDataExportFormat("xlsx")}
              >
                <span>XLSX</span>
                <div>
                  <strong>Libro Excel</strong>
                  <small>Resumen, eventos, equipos y jugadores</small>
                </div>
              </button>
              <button
                className={dataExportFormat === "powerbi" ? "active" : ""}
                onClick={() => onDataExportFormat("powerbi")}
              >
                <span>BI</span>
                <div>
                  <strong>Modelo Power BI</strong>
                  <small>
                    Tablas normalizadas en XLSX listas para importar
                  </small>
                </div>
              </button>
              <button
                className={dataExportFormat === "csv" ? "active" : ""}
                onClick={() => onDataExportFormat("csv")}
              >
                <span>CSV</span>
                <div>
                  <strong>Tabla universal</strong>
                  <small>Ligero y compatible con Power BI</small>
                </div>
              </button>
            </div>
            <button
              className="button primary"
              onClick={onExportData}
              disabled={!project.events.length}
            >
              Exportar {dataExportFormat.toUpperCase()}
            </button>
          </article>
          <article className="report-data-preview">
            <header>
              <strong>Vista previa</strong>
              <span>{project.events.length} filas</span>
            </header>
            <div className="report-preview-table">
              <div className="header">
                <span>Tiempo</span>
                <span>Etiqueta</span>
                <span>Jugador</span>
              </div>
              {recentEvents.map((event) => (
                <div key={event.id}>
                  <span>{formatTime(event.start, true)}</span>
                  <span>{event.tagName}</span>
                  <span>{event.player || "Sin jugador"}</span>
                </div>
              ))}
              {recentEvents.length === 0 && <p>No hay filas disponibles.</p>}
            </div>
          </article>
        </div>
      )}

      {section === "clips" && (
        <div className="report-workspace clips-workspace">
          <article className="report-choice-panel">
            <span className="eyebrow">Selección de vídeo</span>
            <h2>Prepara los clips importantes</h2>
            <p>
              Exporta todo el análisis o marca acciones concretas desde la línea
              temporal antes de organizar las carpetas.
            </p>
            <div className="clip-selection-meter">
              <strong>{selectedEventIds.size}</strong>
              <span>de {project.events.length} acciones seleccionadas</span>
              <i
                style={{
                  width: `${project.events.length ? (selectedEventIds.size / project.events.length) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="report-button-row">
              <button
                className="button ghost"
                onClick={onToggleSelectAll}
                disabled={!project.events.length}
              >
                {allSelected ? "Quitar selección" : "Seleccionar todas"}
              </button>
              <button
                className="button primary"
                onClick={onConfigureClips}
                disabled={!project.events.length || !desktopAvailable}
              >
                Configurar clips
              </button>
            </div>
            {!desktopAvailable && (
              <small className="web-capability-note">
                La edición y codificación de vídeo con FFmpeg está disponible en
                la aplicación de escritorio.
              </small>
            )}
          </article>
          <article className="report-delivery-guide">
            <span className="eyebrow">Organización</span>
            <h2>Una carpeta lista para compartir</h2>
            <ul>
              <li>
                <i>1</i>
                <span>
                  <strong>Filtra</strong> las acciones que interesan.
                </span>
              </li>
              <li>
                <i>2</i>
                <span>
                  <strong>Ordena</strong> por tiempo, etiqueta, equipo o
                  jugador.
                </span>
              </li>
              <li>
                <i>3</i>
                <span>
                  <strong>Agrupa</strong> automáticamente en carpetas.
                </span>
              </li>
            </ul>
          </article>
        </div>
      )}
    </section>
  );
}
