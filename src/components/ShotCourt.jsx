import { shotZones, zoneStats } from "../lib/shotZones.js";

function CourtLines() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect x="2" y="2" width="96" height="96" rx="2" />
      <path d="M36 2v40h28V2" />
      <path d="M39 42a11 11 0 0 0 22 0" />
      <path d="M41 24a9 9 0 0 0 18 0" />
      <circle cx="50" cy="16" r="2.6" />
      <path d="M44 12h12" />
      <path d="M8 2v39M92 2v39" />
      <path d="M8 41a46 46 0 0 0 84 0" />
      <path d="M34 98a16 16 0 0 1 32 0" />
    </svg>
  );
}

export function ShotCourtSelector({
  value,
  onChange,
  compact = false,
  showLabels = true
}) {
  const selected = shotZones.find((zone) => zone.id === value);
  return (
    <section className={`shot-court-selector ${compact ? "compact" : ""}`}>
      <div className="shot-court-heading">
        <div>
          <strong>Zona de la acción</strong>
          <span>
            {selected
              ? `${selected.name} · ${selected.points} puntos`
              : "Pulsa una zona de la pista"}
          </span>
        </div>
        {selected && (
          <button type="button" className="mini-button" onClick={() => onChange("")}>
            Limpiar
          </button>
        )}
      </div>
      <div className="shot-court">
        <CourtLines />
        {shotZones.map((zone) => (
          <button
            type="button"
            key={zone.id}
            className={`${value === zone.id ? "active" : ""} points-${zone.points}`}
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.width}%`,
              height: `${zone.height}%`
            }}
            onClick={(event) => {
              if (event.detail > 1 && value === zone.id) onChange("");
              else onChange(zone.id);
            }}
            onDoubleClick={(event) => {
              event.preventDefault();
              onChange("");
            }}
            title={`${zone.name} · ${zone.points} puntos`}
            aria-label={
              value === zone.id
                ? `${zone.name} seleccionada. Doble clic para deshacer`
                : `Seleccionar ${zone.name}`
            }
          >
            {showLabels && <span>{zone.shortName}</span>}
          </button>
        ))}
      </div>
      <small className="shot-court-help">
        Un clic selecciona · doble clic sobre la zona activa deshace la selección
      </small>
    </section>
  );
}

export function ShotCourtHeatmap({ events = [] }) {
  const stats = zoneStats(events);
  const maximum = Math.max(...stats.map((zone) => zone.attempts), 1);
  return (
    <div className="shot-heatmap">
      <div className="shot-court heatmap">
        <CourtLines />
        {stats.map((zone) => {
          const intensity = zone.attempts / maximum;
          return (
            <div
              key={zone.id}
              className={`heat-zone points-${zone.points}`}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
                "--heat-opacity": 0.12 + intensity * 0.72
              }}
              title={`${zone.name}: ${zone.made}/${zone.attempts} · ${zone.percentage}%`}
            >
              <strong>{zone.attempts}</strong>
              <span>{zone.attempts ? `${zone.percentage}%` : "—"}</span>
            </div>
          );
        })}
      </div>
      <div className="heatmap-legend">
        <span><i className="points-2" /> Zona de 2 puntos</span>
        <span><i className="points-3" /> Zona de 3 puntos</span>
        <small>Volumen de tiro y acierto estimado por zona</small>
      </div>
    </div>
  );
}
