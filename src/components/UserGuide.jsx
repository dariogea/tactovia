import { playbackControls } from "../lib/playback.js";

const guideSections = [
  {
    id: "start",
    title: "1. Preparar un análisis",
    steps: [
      "Crea o abre tu perfil local y selecciona Baloncesto.",
      "Pulsa Nueva sesión y selecciona un vídeo guardado en el equipo.",
      "Elige dos equipos y una convocatoria de entre 5 y 12 jugadores por equipo.",
      "Guarda el archivo .scout.json para conservar el proyecto editable y crear su histórico estadístico."
    ]
  },
  {
    id: "tag",
    title: "2. Etiquetar el partido",
    steps: [
      "Selecciona equipo, dorsal y, si es un tiro, una zona de la pista.",
      "Añade una nota rápida cuando necesites contexto cualitativo.",
      "Pulsa una etiqueta de instante una vez. En una etiqueta de intervalo, pulsa al inicio y al final.",
      "Usa la línea temporal para revisar, ordenar, editar o seleccionar acciones."
    ]
  },
  {
    id: "data",
    title: "3. Estadísticas e histórico",
    steps: [
      "Los filtros de Estadísticas actualizan todos los gráficos del informe.",
      "Competiciones y equipos conserva únicamente los datos creados por tu perfil.",
      "Los jugadores mantienen el mismo identificador al cambiar de equipo o quedar como agentes libres.",
      "El histórico de partidos no almacena el vídeo ni permite generar clips."
    ]
  },
  {
    id: "deliver",
    title: "4. Informes y entregables",
    steps: [
      "Personaliza las secciones del informe antes de crear el PDF.",
      "Exporta un libro Excel, una tabla CSV o un paquete normalizado para Power BI.",
      "Selecciona clips concretos y ordénalos por jugador, equipo, etiqueta o cronología.",
      "El Playbook permite crear fases, mover jugadores y exportar una jugada como PNG, PDF o vídeo."
    ]
  }
];

export function UserGuide({ shortcuts, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal user-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Guía de usuario"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-heading">
          <div>
            <span className="eyebrow">Centro de ayuda</span>
            <h2>Guía de Tactovia</h2>
            <p>Flujo completo de trabajo y referencia de teclado.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="user-guide-grid">
          <div className="user-guide-sections">
            {guideSections.map((section) => (
              <article key={section.id}>
                <h3>{section.title}</h3>
                <ol>
                  {section.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </article>
            ))}
          </div>
          <aside className="shortcut-reference">
            <span className="eyebrow">Atajos activos</span>
            <h3>Control del vídeo</h3>
            <div>
              {playbackControls.map((control) => (
                <span key={control.id}>
                  <strong>{control.label}</strong>
                  <kbd>{shortcuts?.[control.id] || "Sin asignar"}</kbd>
                </span>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
