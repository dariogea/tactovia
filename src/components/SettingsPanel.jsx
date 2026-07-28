import { useMemo, useState } from "react";
import { defaultPreferences } from "../lib/defaults.js";
import { playbackControls, shortcutActions, eventToShortcut } from "../lib/playback.js";
import { paletteOptions, themeOptions } from "../lib/theme.js";

const workspacePresets = {
  compact: { tagPanelWidth: 360, videoHeight: 430 },
  medium: { tagPanelWidth: 430, videoHeight: 520 },
  large: { tagPanelWidth: 540, videoHeight: 660 }
};

const tagSizePresets = {
  compact: 52,
  medium: 68,
  large: 88
};

const liveModuleOptions = [
  ["score", "Marcador estimado"],
  ["pace", "Ritmo de etiquetado"],
  ["shooting", "Acierto de tiro"],
  ["coverage", "Cobertura de jugadores"],
  ["latest", "Última acción"]
];

function ShortcutButton({ value, onChange }) {
  const [recording, setRecording] = useState(false);
  return (
    <button
      className={`shortcut-key-button ${recording ? "recording" : ""}`}
      onClick={() => setRecording(true)}
      onBlur={() => setRecording(false)}
      onKeyDown={(event) => {
        if (!recording) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Escape") {
          setRecording(false);
          return;
        }
        if (event.key === "Backspace" || event.key === "Delete") {
          onChange("");
          setRecording(false);
          return;
        }
        const shortcut = eventToShortcut(event);
        if (shortcut) {
          onChange(shortcut);
          setRecording(false);
        }
      }}
    >
      {recording ? "Pulsa…" : value || "Añadir"}
    </button>
  );
}

export function SettingsPanel({
  preferences,
  onChange,
  tags,
  themeMode,
  resolvedTheme,
  onThemeModeChange,
  paletteMode,
  onPaletteModeChange
}) {
  const shortcutConflicts = useMemo(() => {
    const owners = new Map();
    Object.entries(preferences.shortcuts).forEach(([id, shortcut]) => {
      if (!shortcut) return;
      owners.set(shortcut, [...(owners.get(shortcut) || []), id]);
    });
    tags.forEach((tag) => {
      if (!tag.shortcut) return;
      owners.set(tag.shortcut, [...(owners.get(tag.shortcut) || []), `tag:${tag.id}`]);
    });
    return new Set([...owners.entries()].filter(([, ids]) => ids.length > 1).map(([key]) => key));
  }, [preferences.shortcuts, tags]);

  function updateLayout(patch) {
    onChange({ ...preferences, layout: { ...preferences.layout, ...patch } });
  }

  function updatePlayback(patch) {
    onChange({ ...preferences, playback: { ...preferences.playback, ...patch } });
  }

  function updateShortcut(id, value) {
    onChange({
      ...preferences,
      shortcuts: { ...preferences.shortcuts, [id]: value }
    });
  }

  function toggleControl(id) {
    const current = preferences.playback.visibleControls;
    updatePlayback({
      visibleControls: current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    });
  }

  function setWorkspaceSize(size) {
    updateLayout({ workspaceSize: size, ...workspacePresets[size] });
  }

  function setTagButtonSize(size) {
    updateLayout({ tagButtonSize: size, tagButtonHeight: tagSizePresets[size] });
  }

  function toggleLiveModule(id) {
    const current = preferences.layout.liveModules || [];
    updateLayout({
      liveModules: current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    });
  }

  return (
    <section className="settings-view">
      <article className="settings-section appearance-settings">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Apariencia</span>
            <h2>Un espacio cómodo a cualquier hora</h2>
          </div>
          <span className="theme-current-state">
            Mostrando tema {resolvedTheme === "dark" ? "oscuro" : "claro"}
          </span>
        </div>
        <p className="settings-intro">
          El modo automático sigue el aspecto de Windows o macOS y cambia en
          tiempo real. La elección queda guardada en este ordenador.
        </p>
        <div className="theme-card-grid">
          {themeOptions.map((option) => (
            <button
              type="button"
              key={option.id}
              className={`theme-choice-card ${themeMode === option.id ? "active" : ""}`}
              onClick={() => onThemeModeChange(option.id)}
            >
              <span className={`theme-miniature ${option.id}`}>
                <i />
                <b />
                <em />
                <u />
              </span>
              <span>
                <strong>{option.label}</strong>
                <small>
                  {option.id === "system"
                    ? "Se adapta al sistema"
                    : option.id === "light"
                      ? "Luminoso y limpio"
                      : "Contraste para sesiones largas"}
                </small>
              </span>
              <i className="theme-choice-check" aria-hidden="true">
                {themeMode === option.id ? "✓" : ""}
              </i>
            </button>
          ))}
        </div>
        <div className="palette-heading">
          <div>
            <strong>Paleta de marca</strong>
            <span>
              La interfaz mantiene la identidad Tactovia en ambos modos. El
              lima se reserva para selección, reproducción y atención.
            </span>
          </div>
        </div>
        <div className="palette-card-grid brand-palette-grid">
          {paletteOptions.map((option) => (
            <button
              type="button"
              key={option.id}
              className={`palette-choice-card ${paletteMode === option.id ? "active" : ""}`}
              onClick={() => onPaletteModeChange(option.id)}
            >
              <span className="palette-swatches">
                {option.colors.map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </span>
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              <em>{paletteMode === option.id ? "Identidad activa" : ""}</em>
            </button>
          ))}
        </div>
      </article>

      <article className="settings-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Interfaz</span>
            <h2>Tamaños del espacio de trabajo</h2>
          </div>
        </div>
        <div className="settings-choice-row">
          <div>
            <strong>Vídeo y panel lateral</strong>
            <span>Elige una proporción inicial; también puedes arrastrar los separadores.</span>
          </div>
          <div className="segmented-control">
            {[
              ["compact", "Compacto"],
              ["medium", "Equilibrado"],
              ["large", "Amplio"]
            ].map(([value, label]) => (
              <button
                key={value}
                className={preferences.layout.workspaceSize === value ? "active" : ""}
                onClick={() => setWorkspaceSize(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-choice-row">
          <div>
            <strong>Tamaño de las etiquetas</strong>
            <span>Ajusta la altura visual de los botones sin trabajar con píxeles.</span>
          </div>
          <div className="segmented-control">
            {[
              ["compact", "Pequeñas"],
              ["medium", "Medianas"],
              ["large", "Grandes"]
            ].map(([value, label]) => (
              <button
                key={value}
                className={preferences.layout.tagButtonSize === value ? "active" : ""}
                onClick={() => setTagButtonSize(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-choice-row">
          <div><strong>Columnas de etiquetas</strong><span>Distribución de la botonera de etiquetado.</span></div>
          <div className="segmented-control">
            {[1, 2, 3].map((columns) => (
              <button
                key={columns}
                className={preferences.layout.tagColumns === columns ? "active" : ""}
                onClick={() => updateLayout({ tagColumns: columns })}
              >
                {columns}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-choice-row">
          <div>
            <strong>Mapa de zonas</strong>
            <span>Activa la pista compacta y decide si muestra los nombres.</span>
          </div>
          <div className="settings-inline-toggles">
            <label className="switch-control">
              <input
                type="checkbox"
                checked={preferences.layout.shotCourtVisible !== false}
                onChange={(event) =>
                  updateLayout({ shotCourtVisible: event.target.checked })
                }
              />
              <span>Pista</span>
            </label>
            <label className="switch-control">
              <input
                type="checkbox"
                checked={preferences.layout.shotCourtLabels !== false}
                disabled={preferences.layout.shotCourtVisible === false}
                onChange={(event) =>
                  updateLayout({ shotCourtLabels: event.target.checked })
                }
              />
              <span>Nombres</span>
            </label>
            <select
              value={preferences.layout.shotCourtPosition || "above"}
              disabled={preferences.layout.shotCourtVisible === false}
              onChange={(event) =>
                updateLayout({ shotCourtPosition: event.target.value })
              }
              aria-label="Posición del mapa de tiro"
            >
              <option value="above">Encima</option>
              <option value="below">Debajo</option>
            </select>
          </div>
        </div>
        <div className="settings-choice-row live-module-settings">
          <div>
            <strong>Módulos en tiempo real</strong>
            <span>Elige qué indicadores aparecen bajo el reproductor.</span>
          </div>
          <div className="settings-inline-toggles">
            {liveModuleOptions.map(([id, label]) => (
              <label className="switch-control" key={id}>
                <input
                  type="checkbox"
                  checked={(preferences.layout.liveModules || []).includes(id)}
                  onChange={() => toggleLiveModule(id)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </article>

      <article className="settings-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Reproductor</span>
            <h2>Botones visibles</h2>
          </div>
          <span className="counter">{preferences.playback.visibleControls.length} activos</span>
        </div>
        <div className="control-toggle-grid">
          {playbackControls.map((control) => (
            <label className="control-toggle" key={control.id}>
              <input
                type="checkbox"
                checked={preferences.playback.visibleControls.includes(control.id)}
                onChange={() => toggleControl(control.id)}
              />
              <span>{control.label}</span>
            </label>
          ))}
        </div>
        <div className="settings-grid compact">
          <label className="field"><span>Salto corto (s)</span><input type="number" min="0.25" max="30" step="0.25" value={preferences.playback.smallStep} onChange={(event) => updatePlayback({ smallStep: Number(event.target.value) })} /></label>
          <label className="field"><span>Salto principal (s)</span><input type="number" min="1" max="120" value={preferences.playback.mediumStep} onChange={(event) => updatePlayback({ mediumStep: Number(event.target.value) })} /></label>
          <label className="field"><span>Salto largo (s)</span><input type="number" min="1" max="600" value={preferences.playback.largeStep} onChange={(event) => updatePlayback({ largeStep: Number(event.target.value) })} /></label>
          <label className="field"><span>Fotogramas por segundo</span><input type="number" min="1" max="120" value={preferences.playback.frameRate} onChange={(event) => updatePlayback({ frameRate: Number(event.target.value) })} /></label>
        </div>
      </article>

      <article className="settings-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Teclado</span>
            <h2>Atajos</h2>
          </div>
          <div className="settings-heading-actions">
            {shortcutConflicts.size > 0 && <span className="conflict-badge">Hay atajos repetidos</span>}
            <button
              className="mini-button"
              onClick={() => onChange({
                ...preferences,
                shortcuts: { ...defaultPreferences.shortcuts }
              })}
            >
              Restaurar
            </button>
          </div>
        </div>
        <div className="shortcut-card-grid">
          {shortcutActions.map((action) => {
            const shortcut = preferences.shortcuts[action.id] || "";
            return (
              <div className={`shortcut-card ${shortcutConflicts.has(shortcut) ? "conflict" : ""}`} key={action.id}>
                <span>{action.label}</span>
                <ShortcutButton value={shortcut} onChange={(value) => updateShortcut(action.id, value)} />
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
