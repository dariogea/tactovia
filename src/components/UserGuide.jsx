import { playbackControls, displayShortcut } from "../lib/playback.js";

const guideSections = [
  {
    id: "start",
    title: "1. Preparar un análisis",
    steps: [
      "Crea o abre tu perfil local de baloncesto.",
      "Pulsa Nueva sesión y selecciona un vídeo guardado en el equipo.",
      "Elige dos equipos y una convocatoria de entre 5 y 12 jugadores por equipo.",
      "Guarda el archivo .scout.json para conservar el proyecto editable y crear su histórico estadístico.",
    ],
  },
  {
    id: "tag",
    title: "2. Etiquetar el partido",
    steps: [
      "Selecciona el periodo real, equipo y dorsal antes de registrar la acción.",
      "El mapa de tiro es opcional: actívalo desde Perfil y ajustes → Etiquetado. Un doble clic limpia la zona.",
      "Añade una nota rápida cuando necesites contexto cualitativo.",
      "Pulsa una etiqueta de instante una vez. En una etiqueta de intervalo, pulsa al inicio y al final.",
      "Usa la línea temporal para revisar, ordenar, editar o seleccionar acciones.",
    ],
  },
  {
    id: "review",
    title: "3. Construir una sesión de vídeo",
    steps: [
      "Abre Sala de revisión para buscar acciones, filtrar por periodo o ver solo las destacadas.",
      "Marca clips y guarda la selección como una lista. Puedes reordenar una lista sin alterar las etiquetas.",
      "Activa reproducción continua o bucle para preparar la sesión con el equipo.",
      "Las listas, los favoritos y el cuaderno se guardan dentro del archivo del análisis.",
    ],
  },
  {
    id: "data",
    title: "4. Estadísticas e histórico",
    steps: [
      "Los filtros de Estadísticas actualizan todos los gráficos del informe.",
      "Competiciones y equipos conserva únicamente los datos creados por tu perfil.",
      "Los jugadores mantienen el mismo identificador al cambiar de equipo o quedar como agentes libres.",
      "El histórico de partidos no almacena el vídeo ni permite generar clips.",
    ],
  },
  {
    id: "deliver",
    title: "5. Informes y entregables",
    steps: [
      "Elige Conclusiones, Visuales, Vídeo o Datos según el entregable.",
      "Exporta un libro Excel, una tabla CSV o un paquete normalizado para Power BI.",
      "Selecciona clips concretos y ordénalos por jugador, equipo, etiqueta o cronología.",
      "Los informes permiten exportar conclusiones automáticas, gráficos del partido, datos y vídeo.",
    ],
  },
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
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="user-guide-grid">
          <div className="user-guide-sections">
            {guideSections.map((section) => (
              <article key={section.id}>
                <h3>{section.title}</h3>
                <ol>
                  {section.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
          <aside className="shortcut-reference">
            <span className="eyebrow">Atajos activos</span>
            <h3>Acciones generales</h3>
            <div>
              {[
                ["Buscar o navegar", "⌘ / Ctrl + K"],
                ["Guardar análisis", "⌘ / Ctrl + S"],
                ["Deshacer acciones", "⌘ / Ctrl + Z"],
                ["Rehacer acciones", "⌘ / Ctrl + Shift + Z"],
                ["Cerrar ventana", "Esc"],
              ].map(([label, key]) => (
                <span key={label}>
                  <strong>{label}</strong>
                  <kbd>{key}</kbd>
                </span>
              ))}
            </div>
            <h3>Control del vídeo</h3>
            <div>
              {playbackControls.map((control) => (
                <span key={control.id}>
                  <strong>{control.label}</strong>
                  <kbd>
                    {displayShortcut(shortcuts?.[control.id]) || "Sin asignar"}
                  </kbd>
                </span>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
