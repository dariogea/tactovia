import { shotZones, zoneStats } from "../lib/shotZones.js";

function CourtMarkings() {
  return (
    <g className="court-markings" aria-hidden="true">
      <rect x="10" y="10" width="480" height="448" />
      <path d="M171.6 10V195.6H328.4V10" />
      <path d="M192.4 195.6A57.6 57.6 0 0 0 307.6 195.6" />
      <path className="court-dashed" d="M192.4 195.6A57.6 57.6 0 0 1 307.6 195.6" />
      <path d="M210 48.4V60.4A40 40 0 0 0 290 60.4V48.4" />
      <circle cx="250" cy="60.4" r="7.2" />
      <path d="M221.2 48.4H278.8" />
      <path d="M38.8 10V105.684A216 216 0 0 0 461.2 105.684V10" />
      <path d="M192.4 458A57.6 57.6 0 0 1 307.6 458" />
    </g>
  );
}

function CourtSvg({
  value = "",
  onChange,
  showLabels = true,
  stats = null
}) {
  const statsById = new Map((stats || []).map((zone) => [zone.id, zone]));
  const interactive = typeof onChange === "function";
  const maximum = Math.max(...(stats || []).map((zone) => zone.attempts), 1);
  return (
    <svg
      className="shot-court-svg"
      viewBox="0 0 500 470"
      role={interactive ? "group" : "img"}
      aria-label={interactive ? "Selector de zonas de tiro" : "Mapa de tiro por zonas"}
    >
      <defs>
        <pattern id="court-wood" width="52" height="80" patternUnits="userSpaceOnUse">
          <rect width="52" height="80" fill="#d9a860" />
          <rect width="25" height="80" fill="#e9bd78" opacity=".62" />
          <path d="M0 20H52M0 52H52" stroke="#f3cf94" strokeOpacity=".5" />
          <path d="M13 0V80M39 0V80" stroke="#bf8745" strokeOpacity=".28" />
        </pattern>
        <filter id="zone-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".22" />
        </filter>
      </defs>
      <rect x="0" y="0" width="500" height="470" rx="10" fill="url(#court-wood)" />
      <g className="court-zones">
        {shotZones.map((zone) => {
          const row = statsById.get(zone.id);
          const intensity = row ? row.attempts / maximum : 0;
          return (
            <g
              key={zone.id}
              className={[
                "court-zone",
                `points-${zone.points}`,
                value === zone.id ? "active" : "",
                interactive ? "interactive" : "heat"
              ].filter(Boolean).join(" ")}
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={
                interactive
                  ? `${zone.name}, ${zone.points} puntos`
                  : `${zone.name}: ${row?.made || 0} de ${row?.attempts || 0}`
              }
              onClick={() => interactive && onChange(zone.id)}
              onDoubleClick={(event) => {
                if (!interactive) return;
                event.preventDefault();
                onChange("");
              }}
              onKeyDown={(event) => {
                if (!interactive) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onChange(value === zone.id ? "" : zone.id);
                }
              }}
              style={row ? { "--zone-intensity": 0.12 + intensity * 0.68 } : undefined}
            >
              <path d={zone.path} filter={value === zone.id ? "url(#zone-shadow)" : undefined} />
              {(showLabels || row) && (
                <g className="zone-label" transform={`translate(${zone.labelX} ${zone.labelY})`}>
                  {row ? (
                    <>
                      <text y="-6">{row.made} / {row.attempts}</text>
                      <text className="zone-percentage" y="13">
                        {row.attempts ? `${row.percentage}%` : "—"}
                      </text>
                    </>
                  ) : (
                    <>
                      <text>{zone.shortName}</text>
                      <text className="zone-points" y="15">{zone.points}P</text>
                    </>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </g>
      <CourtMarkings />
    </svg>
  );
}

export function ShotCourtSelector({
  value,
  onChange,
  compact = false,
  showLabels = true,
  events = []
}) {
  const selected = shotZones.find((zone) => zone.id === value);
  const currentStats = events.some((event) => event.shotZoneId)
    ? zoneStats(events)
    : null;
  const selectedStats = currentStats?.find((zone) => zone.id === value);
  return (
    <section className={`shot-court-selector ${compact ? "compact" : ""}`}>
      <div className="shot-court-heading">
        <div>
          <strong>Zona de la acción</strong>
          <span>
            {selected
              ? `${selected.name} · ${selected.points} puntos${selectedStats?.attempts ? ` · ${selectedStats.made}/${selectedStats.attempts}` : ""}`
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
        <CourtSvg
          value={value}
          onChange={onChange}
          showLabels={showLabels}
          stats={currentStats}
        />
      </div>
      {currentStats && (
        <div className="selector-heat-legend">
          <span><i /> Menos volumen</span>
          <span><i /> Más volumen</span>
          <small>Canastas / intentos · acierto</small>
        </div>
      )}
      <small className="shot-court-help">
        Un clic selecciona · doble clic sobre cualquier zona limpia la selección
      </small>
    </section>
  );
}

export function ShotCourtHeatmap({ events = [] }) {
  const stats = zoneStats(events);
  return (
    <div className="shot-heatmap">
      <div className="shot-court heatmap">
        <CourtSvg stats={stats} />
      </div>
      <div className="heatmap-legend">
        <span><i className="points-2" /> Zona de 2 puntos</span>
        <span><i className="points-3" /> Zona de 3 puntos</span>
        <small>Canastas / intentos y porcentaje de acierto por zona</small>
      </div>
    </div>
  );
}
