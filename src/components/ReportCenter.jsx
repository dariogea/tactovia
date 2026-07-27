import { useMemo, useState } from "react";
import { formatTime } from "../lib/analysis.js";

function TeamBadge({ team }) {
  if (!team) return <span className="report-team-empty">Equipo pendiente</span>;
  return (
    <div className="report-team-badge" style={{ "--report-team": team.primaryColor }}>
      {team.logo ? <img src={team.logo} alt="" /> : <i>{team.shortName || "EQ"}</i>}
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
  onExportReport,
  onCopySummary
}) {
  const [section, setSection] = useState("summary");
  const home = project.teams.find((team) => team.id === project.match?.homeTeamId);
  const away = project.teams.find((team) => team.id === project.match?.awayTeamId);
  const readyChecks = [
    { label: "Vídeo", ready: Boolean(project.video?.path || project.video?.name) },
    { label: "Partido", ready: Boolean(home && away) },
    { label: "Acciones", ready: project.events.length > 0 }
  ];
  const recentEvents = useMemo(
    () =>
      project.events
        .slice()
        .sort((left, right) => right.start - left.start)
        .slice(0, 5),
    [project.events]
  );
  const allSelected =
    project.events.length > 0 && selectedEventIds.size === project.events.length;

  return (
    <section className="report-center">
      <header className="report-center-hero">
        <div>
          <span className="eyebrow">Centro de entregables</span>
          <h1>Convierte el análisis en una entrega clara</h1>
          <p>
            Revisa el resumen, elige qué necesitas y exporta únicamente el
            material preparado para cada destinatario.
          </p>
        </div>
        <div className="report-readiness">
          {readyChecks.map((check) => (
            <span className={check.ready ? "ready" : ""} key={check.label}>
              <i>{check.ready ? "✓" : "·"}</i>{check.label}
            </span>
          ))}
        </div>
      </header>

      <nav className="report-section-tabs" aria-label="Tipos de entrega">
        <button className={section === "summary" ? "active" : ""} onClick={() => setSection("summary")}>
          <span>01</span><strong>Informe</strong><small>Lectura técnica</small>
        </button>
        <button className={section === "data" ? "active" : ""} onClick={() => setSection("data")}>
          <span>02</span><strong>Datos</strong><small>Excel o CSV</small>
        </button>
        <button className={section === "clips" ? "active" : ""} onClick={() => setSection("clips")}>
          <span>03</span><strong>Vídeo</strong><small>Clips seleccionados</small>
        </button>
      </nav>

      {section === "summary" && (
        <div className="report-workspace">
          <article className="report-document-card">
            <header>
              <div>
                <span>INFORME DE SCOUTING</span>
                <h2>{project.projectName}</h2>
                <small>{project.video?.name || "Vídeo pendiente"}</small>
              </div>
              <em>{project.events.length} acciones</em>
            </header>
            <div className="report-matchup">
              <TeamBadge team={home} />
              <strong>VS</strong>
              <TeamBadge team={away} />
            </div>
            <div className="report-kpi-row">
              <div><span>Acciones</span><strong>{project.events.length}</strong></div>
              <div><span>Tipos usados</span><strong>{stats.length}</strong></div>
              <div><span>Vídeo</span><strong>{formatTime(project.video?.duration || 0)}</strong></div>
              <div><span>Jugadores</span><strong>{new Set(project.events.map((event) => event.playerId).filter(Boolean)).size}</strong></div>
            </div>
            <div className="report-highlight-list">
              {stats.slice(0, 6).map((item) => (
                <div key={item.id}>
                  <i style={{ background: item.color }} />
                  <span>{item.name}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
              {stats.length === 0 && <p>Todavía no hay acciones que resumir.</p>}
            </div>
          </article>
          <aside className="report-action-panel">
            <span className="eyebrow">Salida recomendada</span>
            <h2>Informe para el cuerpo técnico</h2>
            <p>
              Incluye portada, indicadores, recuentos y cronología detallada
              con equipos, jugadores y zonas de tiro.
            </p>
            <button className="button primary" onClick={onExportReport} disabled={!project.events.length}>
              Crear informe PDF
            </button>
            <button className="button ghost" onClick={onCopySummary} disabled={!project.events.length}>
              Copiar resumen ejecutivo
            </button>
            <small>
              El PDF se genera localmente y no sube el vídeo ni los datos.
            </small>
          </aside>
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
                <div><strong>Libro Excel</strong><small>Resumen, eventos, equipos y jugadores</small></div>
              </button>
              <button
                className={dataExportFormat === "csv" ? "active" : ""}
                onClick={() => onDataExportFormat("csv")}
              >
                <span>CSV</span>
                <div><strong>Tabla universal</strong><small>Ligero y compatible con Power BI</small></div>
              </button>
            </div>
            <button className="button primary" onClick={onExportData} disabled={!project.events.length}>
              Exportar {dataExportFormat.toUpperCase()}
            </button>
          </article>
          <article className="report-data-preview">
            <header><strong>Vista previa</strong><span>{project.events.length} filas</span></header>
            <div className="report-preview-table">
              <div className="header"><span>Tiempo</span><span>Etiqueta</span><span>Jugador</span></div>
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
              Exporta todo el análisis o marca acciones concretas desde la
              línea temporal antes de organizar las carpetas.
            </p>
            <div className="clip-selection-meter">
              <strong>{selectedEventIds.size}</strong>
              <span>de {project.events.length} acciones seleccionadas</span>
              <i style={{ width: `${project.events.length ? (selectedEventIds.size / project.events.length) * 100 : 0}%` }} />
            </div>
            <div className="report-button-row">
              <button className="button ghost" onClick={onToggleSelectAll} disabled={!project.events.length}>
                {allSelected ? "Quitar selección" : "Seleccionar todas"}
              </button>
              <button className="button primary" onClick={onConfigureClips} disabled={!project.events.length}>
                Configurar clips
              </button>
            </div>
          </article>
          <article className="report-delivery-guide">
            <span className="eyebrow">Organización</span>
            <h2>Una carpeta lista para compartir</h2>
            <ul>
              <li><i>1</i><span><strong>Filtra</strong> las acciones que interesan.</span></li>
              <li><i>2</i><span><strong>Ordena</strong> por tiempo, etiqueta, equipo o jugador.</span></li>
              <li><i>3</i><span><strong>Agrupa</strong> automáticamente en carpetas.</span></li>
            </ul>
          </article>
        </div>
      )}
    </section>
  );
}
