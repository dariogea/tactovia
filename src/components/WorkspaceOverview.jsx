import { boxScore, coveredSeconds } from "../lib/basketball.js";
import { formatTime } from "../lib/analysis.js";
import { Icon } from "./Icon.jsx";

export function WorkspaceOverview({
  project,
  library,
  onNavigate,
  onVideo,
  onOpen,
  onExample,
  onNotes,
  onSeek,
}) {
  const events = project.events;
  const teams = [project.match?.homeTeamId, project.match?.awayTeamId]
    .map((id) => project.teams.find((t) => t.id === id))
    .filter(Boolean);
  const score = boxScore(events);
  const recent = events.slice(-5).reverse();
  const identified = events.filter((e) => e.playerId).length;
  return (
    <section className="overview-page">
      <header className="page-intro">
        <div>
          <span className="eyebrow">Tu espacio de análisis</span>
          <h1>El partido, en perspectiva.</h1>
          <p>Observa. Encuentra patrones. Prepara la siguiente decisión.</p>
        </div>
        <button className="button secondary" onClick={onOpen}>
          <Icon name="folder" size={16} /> Abrir análisis
        </button>
      </header>
      <div className="overview-grid">
        <article className="match-overview">
          <div className="card-caption">
            <span>
              <i className="status-dot" />{" "}
              {teams.length === 2
                ? "Partido en análisis"
                : "Prepara tu próximo partido"}
            </span>
            <Icon name="court" />
          </div>
          {teams.length === 2 ? (
            <div className="scoreboard">
              {teams.map((t) => (
                <div key={t.id} style={{ "--club-color": t.primaryColor }}>
                  <span className="club-crest">
                    {t.logo ? <img src={t.logo} alt="" /> : t.shortName}
                  </span>
                  <h2>{t.name}</h2>
                  <strong>
                    {boxScore(events.filter((e) => e.teamId === t.id)).points}
                  </strong>
                  <small>Puntos etiquetados</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="match-onboarding">
              <div className="court-outline">
                <Icon name="court" size={96} />
              </div>
              <h2>Todo empieza con un vídeo</h2>
              <p>
                Carga el partido, elige los dos equipos y registra tu primera
                acción.
              </p>
            </div>
          )}
          <footer>
            <span>
              {project.video?.name || "Vídeo local · MP4, MOV o WebM"}
            </span>
            <button
              className="button primary"
              onClick={() =>
                project.video ? onNavigate("tagging") : onVideo()
              }
            >
              {project.video ? "Continuar etiquetando" : "Seleccionar vídeo"}
              <Icon name="arrow" size={16} />
            </button>
          </footer>
        </article>
        <article className="overview-progress">
          <span className="eyebrow">El estado de tu trabajo</span>
          <h2>Listo para avanzar</h2>
          {[
            ["Vídeo vinculado", Boolean(project.video), "tagging"],
            ["Equipos del partido", teams.length === 2, "database"],
            ["Acciones registradas", events.length > 0, "tagging"],
            ["Jugadores identificados", identified > 0, "review"],
          ].map(([label, done, view], i) => (
            <button key={label} onClick={() => onNavigate(view)}>
              <i className={done ? "done" : ""}>
                {done ? <Icon name="check" size={14} /> : i + 1}
              </i>
              <span>{label}</span>
              <Icon name="arrow" size={15} />
            </button>
          ))}
          <button className="example-link" onClick={onExample}>
            Explorar un partido de ejemplo <Icon name="arrow" size={14} />
          </button>
          <small>Datos ficticios para conocer las herramientas.</small>
        </article>
      </div>
      <div className="overview-metrics">
        {[
          ["Acciones", events.length, "Registro del partido", "clips"],
          [
            "Acierto de campo",
            score.fg === null ? "—" : `${score.fg.toFixed(1)}%`,
            `${score.fgm} / ${score.fga} tiros`,
            "court",
          ],
          [
            "Vídeo cubierto",
            formatTime(coveredSeconds(events)),
            "Sin sumar clips superpuestos",
            "clock",
          ],
          [
            "Jugadores",
            new Set(events.map((e) => e.playerId).filter(Boolean)).size,
            "Con acciones identificadas",
            "chart",
          ],
        ].map(([label, value, detail, icon]) => (
          <article key={label}>
            <span>
              {label}
              <Icon name={icon} size={18} />
            </span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>
      <div className="overview-bottom">
        <article className="workspace-card">
          <header>
            <h2>Últimas acciones</h2>
            <button
              className="text-button"
              onClick={() => onNavigate("review")}
            >
              Ver todas <Icon name="arrow" size={14} />
            </button>
          </header>
          {recent.length ? (
            recent.map((e) => (
              <button
                className="recent-event"
                key={e.id}
                onClick={() => onSeek(e)}
              >
                <i style={{ background: e.color }} />
                <div>
                  <strong>{e.tagName}</strong>
                  <small>{e.player || e.team || "Sin identificar"}</small>
                </div>
                <span>{formatTime(e.start)}</span>
                <Icon name="play" size={14} />
              </button>
            ))
          ) : (
            <div className="calm-empty">
              <Icon name="clips" size={30} />
              <p>Tu lectura del partido aparecerá aquí.</p>
            </div>
          )}
        </article>
        <article className="workspace-card">
          <header>
            <h2>Cuaderno del analista</h2>
            <Icon name="court" size={18} />
          </header>
          <textarea
            aria-label="Cuaderno del analista"
            placeholder="¿Qué quieres observar? Objetivos, hipótesis o decisiones para el cuerpo técnico…"
            value={project.analysisNotes || ""}
            onChange={(e) => onNotes(e.target.value)}
          />
          <footer className="notebook-footer">
            <span>Se guarda dentro del análisis</span>
            <button
              className="text-button"
              onClick={() => onNavigate("report")}
            >
              Preparar entrega <Icon name="arrow" size={14} />
            </button>
          </footer>
        </article>
      </div>
      <button
        className="library-callout"
        onClick={() => onNavigate("database")}
      >
        <Icon name="folder" />
        <strong>Tu biblioteca</strong>
        <span>
          {library.competitions.length} competiciones · {library.teams.length}{" "}
          equipos
        </span>
        <Icon name="arrow" />
      </button>
    </section>
  );
}
