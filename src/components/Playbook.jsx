import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACTION_TYPES,
  PLAYBOOK_TEMPLATES,
  actionLabel,
  createPlaybookPhase,
  createPlaybookPlay,
  createTemplateObjects,
  generateNextPhase,
  mirrorPhase,
  phaseMinimumDuration
} from "../lib/playbook.js";
import { sortPlayersByNumber } from "../lib/roster.js";
import { CourtEditor } from "./playbook/CourtEditor.jsx";
import {
  renderAnimationScene,
  renderEditorScene,
  renderPhaseToDataUrl
} from "./playbook/CourtRenderer.js";

const modeTabs = [
  { id: "draw", label: "Dibujar", help: "Jugadores, acciones y objetos" },
  { id: "animate", label: "Animar", help: "Movimiento y tiempos" },
  { id: "notes", label: "Notas", help: "Explicación y vídeos" },
  { id: "output", label: "Presentación", help: "Vista final y exportación" }
];

const objectTools = [
  { id: "select", label: "Seleccionar", symbol: "↖" },
  { id: "line", label: "Línea", symbol: "╱" },
  { id: "arrow", label: "Flecha", symbol: "➜" },
  { id: "text", label: "Texto", symbol: "T" },
  { id: "cone", label: "Cono", symbol: "△" },
  { id: "hoop", label: "Aro", symbol: "○" },
  { id: "rectangle", label: "Rectángulo", symbol: "▭" },
  { id: "circle", label: "Círculo", symbol: "◯" },
  { id: "triangle", label: "Triángulo", symbol: "△" },
  { id: "ball", label: "Balón", symbol: "●" },
  { id: "eraser", label: "Borrar", symbol: "⌫" }
];

function newId() {
  return crypto.randomUUID();
}

function cloneState(value) {
  return structuredClone(value);
}

function TeamBadge({ team }) {
  if (!team) {
    return <span className="library-team-badge neutral">Sin equipo</span>;
  }
  return (
    <span
      className="library-team-badge"
      style={{ "--badge-color": team.primaryColor }}
    >
      {team.logo && <img src={team.logo} alt="" />}
      {team.shortName || team.name}
    </span>
  );
}

function ModeNavigation({ mode, onChange }) {
  return (
    <nav className="playbook-mode-tabs" aria-label="Modos del Playbook">
      {modeTabs.map((item, index) => (
        <button
          key={item.id}
          className={mode === item.id ? "active" : ""}
          onClick={() => onChange(item.id)}
        >
          <span>{index + 1}</span>
          <strong>{item.label}</strong>
          <small>{item.help}</small>
        </button>
      ))}
    </nav>
  );
}

function PhaseStrip({
  phases,
  selectedId,
  onSelect,
  onSmartNext,
  onClone,
  onEmpty,
  onMirror,
  onMove,
  onDelete
}) {
  const selectedIndex = phases.findIndex((phase) => phase.id === selectedId);
  return (
    <div className="playbook-phase-area">
      <div className="phase-strip playbook-v2-phase-strip">
        {phases.map((phase, index) => (
          <button
            key={phase.id}
            className={phase.id === selectedId ? "active" : ""}
            onClick={() => onSelect(phase.id)}
          >
            <span>{index + 1}</span>
            <div>
              <strong>{phase.name}</strong>
              <small>
                {phase.actions?.length || 0} acciones · {phase.duration || 3}s
              </small>
            </div>
          </button>
        ))}
      </div>
      <div className="phase-creation-buttons">
        <button className="button primary" onClick={onSmartNext}>
          + Nueva fase
        </button>
        <button className="button ghost" onClick={onClone}>
          Duplicar
        </button>
        <details className="phase-more-menu">
          <summary>Más</summary>
          <div>
            <button onClick={onEmpty}>Crear fase vacía</button>
            <button onClick={onMirror}>Reflejar fase</button>
            <button onClick={() => onMove(-1)} disabled={selectedIndex <= 0}>Mover a la izquierda</button>
            <button onClick={() => onMove(1)} disabled={selectedIndex < 0 || selectedIndex >= phases.length - 1}>Mover a la derecha</button>
            <button className="danger-text" onClick={onDelete} disabled={phases.length === 1}>Eliminar fase</button>
          </div>
        </details>
      </div>
    </div>
  );
}

function TemplatePicker({ folderId, onClose, onCreate }) {
  const [court, setCourt] = useState("half");
  const [templateId, setTemplateId] = useState("empty");
  const groups = [...new Set(PLAYBOOK_TEMPLATES.map((item) => item.group))];
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal-card playbook-template-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Playbook 2.0</span>
            <h2>Nueva jugada</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="template-court-options">
          {[
            ["half", "Media pista"],
            ["full", "Pista completa horizontal"],
            ["full-vertical", "Pista completa vertical"]
          ].map(([id, label]) => (
            <button
              key={id}
              className={court === id ? "active" : ""}
              onClick={() => setCourt(id)}
            >
              <span className={`court-miniature ${id}`} />
              {label}
            </button>
          ))}
        </div>
        <div className="template-groups">
          {groups.map((group) => (
            <section key={group}>
              <h3>{group}</h3>
              <div className="template-card-grid">
                {PLAYBOOK_TEMPLATES.filter((item) => item.group === group).map(
                  (item) => (
                    <button
                      key={item.id}
                      className={templateId === item.id ? "active" : ""}
                      onClick={() => setTemplateId(item.id)}
                    >
                      <span>{item.id.startsWith("zone") ? "DEF" : "PLAY"}</span>
                      <strong>{item.label}</strong>
                    </button>
                  )
                )}
              </div>
            </section>
          ))}
        </div>
        <div className="modal-actions">
          <button className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="button primary"
            onClick={() => onCreate({ folderId, court, templateId })}
          >
            Empezar a dibujar
          </button>
        </div>
      </section>
    </div>
  );
}

function PlayLibrary({
  playbook,
  teams,
  play,
  search,
  onSearch,
  onSelectPlay,
  onAddPlay,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder
}) {
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderTeamId, setNewFolderTeamId] = useState("");
  const folderRows = useMemo(
    () =>
      playbook.folders.map((folder) => ({
        ...folder,
        team: teams.find((team) => team.id === folder.teamId),
        plays: playbook.plays.filter(
          (item) =>
            item.folderId === folder.id &&
            item.name.toLowerCase().includes(search.toLowerCase())
        )
      })),
    [playbook, search, teams]
  );
  return (
    <aside className="play-library playbook-v2-library">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Playbook 2.0</span>
          <h2>Biblioteca</h2>
        </div>
        <button className="mini-button primary-mini" onClick={() => onAddPlay()}>
          +
        </button>
      </div>
      <input
        className="library-search"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Buscar jugada…"
      />
      <div className="folder-list">
        {folderRows.map((folder) => (
          <section className="play-folder" key={folder.id}>
            <header>
              <div>
                <strong>{folder.name}</strong>
                <TeamBadge team={folder.team} />
              </div>
              <div className="folder-actions">
                <button
                  className="mini-button"
                  onClick={() => onRenameFolder(folder)}
                  aria-label={`Renombrar ${folder.name}`}
                >
                  ✎
                </button>
                <button
                  className="mini-button danger-text"
                  onClick={() => onDeleteFolder(folder)}
                  disabled={playbook.folders.length === 1}
                  aria-label={`Eliminar ${folder.name}`}
                >
                  ×
                </button>
                <button
                  className="mini-button"
                  onClick={() => onAddPlay(folder.id)}
                  aria-label={`Añadir jugada a ${folder.name}`}
                >
                  +
                </button>
              </div>
            </header>
            <div>
              {folder.plays.map((item) => {
                const team = teams.find((candidate) => candidate.id === item.teamId);
                return (
                  <button
                    key={item.id}
                    className={`play-list-item ${item.id === play.id ? "active" : ""}`}
                    style={{
                      "--play-color": team?.primaryColor || "#2dd4bf"
                    }}
                    onClick={() => onSelectPlay(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <small>
                      {item.phases.length}{" "}
                      {item.phases.length === 1 ? "fase" : "fases"} ·{" "}
                      {item.phases.reduce(
                        (total, phase) => total + (phase.actions?.length || 0),
                        0
                      )}{" "}
                      acciones
                    </small>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="new-folder-form playbook-v2-folder-form">
        <input
          value={newFolderName}
          onChange={(event) => setNewFolderName(event.target.value)}
          placeholder="Nueva carpeta"
        />
        <select
          value={newFolderTeamId}
          onChange={(event) => setNewFolderTeamId(event.target.value)}
        >
          <option value="">Carpeta personal</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <button
          className="button ghost library-folder-button"
          disabled={!newFolderName.trim()}
          onClick={() => {
            onAddFolder({
              name: newFolderName.trim(),
              teamId: newFolderTeamId
            });
            setNewFolderName("");
            setNewFolderTeamId("");
          }}
        >
          Crear carpeta
        </button>
      </div>
    </aside>
  );
}

function SectionTitle({ children, detail }) {
  return (
    <div className="playbook-panel-title">
      <strong>{children}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function SelectedInspector({
  selected,
  phase,
  onUpdate,
  onDelete
}) {
  const item =
    selected?.type === "object"
      ? phase.objects.find((object) => object.id === selected.id)
      : phase.actions.find((action) => action.id === selected?.id);
  if (!item) {
    return (
      <aside className="playbook-object-inspector empty">
        <SectionTitle detail="Pulsa un elemento de la pista">
          Inspector
        </SectionTitle>
        <div className="inspector-empty-state">
          <span>↖</span>
          <strong>Selecciona un objeto</strong>
          <p>
            Podrás cambiar su color, nombre, tamaño, tipo y tiempos de animación.
          </p>
        </div>
      </aside>
    );
  }
  const isAction = selected.type === "action";
  return (
    <aside className="playbook-object-inspector">
      <SectionTitle
        detail={isAction ? actionLabel(item.kind) : "Objeto de la pista"}
      >
        Inspector
      </SectionTitle>
      {!isAction && item.kind === "player" && (
        <>
          <label className="field">
            <span>Dorsal o nombre</span>
            <input
              value={item.label || ""}
              onChange={(event) => onUpdate({ label: event.target.value })}
            />
          </label>
          <div className="segmented-control">
            <button
              className={item.role !== "defense" ? "active" : ""}
              onClick={() => onUpdate({ role: "offense" })}
            >
              Ataque
            </button>
            <button
              className={item.role === "defense" ? "active danger" : ""}
              onClick={() => onUpdate({ role: "defense" })}
            >
              Defensa
            </button>
          </div>
          <label className="control-toggle compact-toggle">
            <input
              type="checkbox"
              checked={Boolean(item.hasBall)}
              onChange={(event) => onUpdate({ hasBall: event.target.checked })}
            />
            Tiene el balón
          </label>
        </>
      )}
      {!isAction && item.kind === "text" && (
        <label className="field">
          <span>Texto</span>
          <textarea
            value={item.text || ""}
            onChange={(event) => onUpdate({ text: event.target.value })}
          />
        </label>
      )}
      <label className="court-color-row">
        <span>Color</span>
        <input
          type="color"
          value={item.color || "#0f766e"}
          onChange={(event) => onUpdate({ color: event.target.value })}
        />
      </label>
      {!isAction && (
        <label className="range-field compact-range">
          <span>
            Tamaño <strong>{item.scale || 100}%</strong>
          </span>
          <input
            type="range"
            min="50"
            max="180"
            value={item.scale || 100}
            onChange={(event) => onUpdate({ scale: Number(event.target.value) })}
          />
        </label>
      )}
      {isAction && (
        <>
          <label className="range-field compact-range">
            <span>
              Inicio <strong>{Number(item.delay || 0).toFixed(1)}s</strong>
            </span>
            <input
              type="range"
              min="0"
              max={Math.max(8, phase.duration || 3)}
              step="0.1"
              value={item.delay || 0}
              onChange={(event) => onUpdate({ delay: Number(event.target.value) })}
            />
          </label>
          <label className="range-field compact-range">
            <span>
              Duración <strong>{Number(item.duration || 1.2).toFixed(1)}s</strong>
            </span>
            <input
              type="range"
              min="0.2"
              max="6"
              step="0.1"
              value={item.duration || 1.2}
              onChange={(event) =>
                onUpdate({ duration: Number(event.target.value) })
              }
            />
          </label>
        </>
      )}
      <button className="button ghost danger-text inspector-delete" onClick={onDelete}>
        Eliminar elemento
      </button>
    </aside>
  );
}

function DrawMode({
  play,
  phase,
  teams,
  tool,
  onToolChange,
  onUpdatePlay,
  onUpdatePhase,
  selected,
  onSelectedChange,
  onNotify
}) {
  const [drawingColor, setDrawingColor] = useState("#0f766e");
  const [role, setRole] = useState("offense");
  const [hasBall, setHasBall] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [genericPlayer, setGenericPlayer] = useState("1");
  const [templateId, setTemplateId] = useState(play.templateId || "empty");
  const imageInputRef = useRef(null);
  const selectedTeam = teams.find((team) => team.id === teamId);
  const selectedPlayer = selectedTeam?.players.find(
    (player) => player.id === playerId
  );
  const playerConfig = {
    label:
      selectedPlayer?.number ||
      (role === "defense" ? `X${genericPlayer}` : genericPlayer),
    role,
    hasBall,
    color:
      role === "defense"
        ? selectedTeam?.secondaryColor || "#dc3545"
        : selectedTeam?.primaryColor || drawingColor,
    borderColor: selectedTeam?.secondaryColor || "#10243a",
    teamId,
    playerId
  };

  function applyTemplate() {
    const hasContent = phase.objects.length > 0 || phase.actions.length > 0;
    if (
      hasContent &&
      !window.confirm(
        "Esta plantilla sustituirá los elementos de la fase actual. ¿Continuar?"
      )
    ) {
      return;
    }
    onUpdatePlay({ templateId });
    onUpdatePhase({
      objects: createTemplateObjects(templateId, play.court),
      actions: []
    });
    onSelectedChange(null);
    onNotify("Plantilla aplicada a la fase actual.");
  }

  function addImage(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onNotify("Selecciona un archivo de imagen.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const id = newId();
      onUpdatePhase({
        objects: [
          ...phase.objects,
          {
            id,
            trackId: id,
            kind: "image",
            imageData: reader.result,
            x: play.court === "full" ? 590 : 380,
            y: play.court === "full-vertical" ? 590 : 330,
            width: 160,
            height: 110,
            scale: 100,
            color: "#ffffff"
          }
        ]
      });
      onSelectedChange({ type: "object", id });
    };
    reader.readAsDataURL(file);
  }

  const selectedItem =
    selected?.type === "object"
      ? phase.objects.find((object) => object.id === selected.id)
      : phase.actions.find((action) => action.id === selected?.id);

  function updateSelected(patch) {
    if (!selectedItem) return;
    if (selected.type === "object") {
      onUpdatePhase({
        objects: phase.objects.map((object) =>
          object.id === selected.id ? { ...object, ...patch } : object
        )
      });
    } else {
      onUpdatePhase({
        actions: phase.actions.map((action) =>
          action.id === selected.id ? { ...action, ...patch } : action
        )
      });
    }
  }

  function deleteSelected() {
    if (!selectedItem) return;
    onUpdatePhase({
      objects:
        selected.type === "object"
          ? phase.objects.filter((object) => object.id !== selected.id)
          : phase.objects,
      actions:
        selected.type === "action"
          ? phase.actions.filter((action) => action.id !== selected.id)
          : phase.actions
    });
    onSelectedChange(null);
  }

  return (
    <div className="playbook-v2-draw">
      <div className="draw-configuration-bar">
        <label className="field">
          <span>Pista</span>
          <select
            value={play.court}
            onChange={(event) => onUpdatePlay({ court: event.target.value })}
          >
            <option value="half">Media pista</option>
            <option value="full">Completa horizontal</option>
            <option value="full-vertical">Completa vertical</option>
          </select>
        </label>
        <label className="field template-select">
          <span>Formación inicial</span>
          <select
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
          >
            {PLAYBOOK_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.group} · {template.label}
              </option>
            ))}
          </select>
        </label>
        <button className="button ghost" onClick={applyTemplate}>
          Aplicar plantilla
        </button>
        <div className="current-tool-readout">
          <span>Herramienta</span>
          <strong>
            {ACTION_TYPES.find((item) => item.id === tool)?.label ||
              objectTools.find((item) => item.id === tool)?.label ||
              "Jugador"}
          </strong>
        </div>
      </div>

      <div className="playbook-v2-draw-grid">
        <aside className="playbook-tool-palette">
          <section>
            <SectionTitle detail="Arrastra desde un jugador">
              Añadir acciones
            </SectionTitle>
            <div className="action-tool-grid">
              {ACTION_TYPES.map((action) => (
                <button
                  key={action.id}
                  className={tool === action.id ? "active" : ""}
                  style={{ "--action-color": action.color }}
                  onClick={() => onToolChange(action.id)}
                >
                  <i />
                  {action.label}
                </button>
              ))}
            </div>
          </section>
          <section>
            <SectionTitle detail="Ataque, defensa o con balón">
              Añadir jugadores
            </SectionTitle>
            <div className="segmented-control">
              <button
                className={role === "offense" ? "active" : ""}
                onClick={() => setRole("offense")}
              >
                Ataque
              </button>
              <button
                className={role === "defense" ? "active danger" : ""}
                onClick={() => setRole("defense")}
              >
                Defensa
              </button>
            </div>
            <label className="control-toggle compact-toggle">
              <input
                type="checkbox"
                checked={hasBall}
                onChange={(event) => setHasBall(event.target.checked)}
              />
              Jugador con balón
            </label>
            <div className="generic-player-row">
              {[1, 2, 3, 4, 5].map((number) => (
                <button
                  key={number}
                  className={genericPlayer === String(number) && !teamId ? "active" : ""}
                  onClick={() => {
                    setGenericPlayer(String(number));
                    setTeamId("");
                    setPlayerId("");
                    onToolChange("player");
                  }}
                >
                  {role === "defense" ? `X${number}` : number}
                </button>
              ))}
            </div>
            <label className="field">
              <span>Equipo</span>
              <select
                value={teamId}
                onChange={(event) => {
                  setTeamId(event.target.value);
                  setPlayerId("");
                }}
              >
                <option value="">Jugadores neutros</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Jugador real</span>
              <select
                value={playerId}
                disabled={!selectedTeam}
                onChange={(event) => {
                  setPlayerId(event.target.value);
                  onToolChange("player");
                }}
              >
                <option value="">Dorsal automático</option>
                {sortPlayersByNumber(selectedTeam?.players || []).map((player) => (
                  <option key={player.id} value={player.id}>
                    #{player.number || "—"} {player.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={`button player-add-button ${tool === "player" ? "primary" : "ghost"}`}
              onClick={() => onToolChange("player")}
            >
              Colocar jugador
            </button>
          </section>
          <section>
            <SectionTitle detail="Formas y anotaciones">Objetos</SectionTitle>
            <div className="misc-tool-grid">
              {objectTools.map((item) => (
                <button
                  key={item.id}
                  className={tool === item.id ? "active" : ""}
                  onClick={() => onToolChange(item.id)}
                  title={item.label}
                >
                  <span>{item.symbol}</span>
                  {item.label}
                </button>
              ))}
              <button onClick={() => imageInputRef.current?.click()}>
                <span>▧</span>
                Imagen
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  addImage(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
            <label className="court-color-row drawing-color-row">
              <span>Color de dibujo</span>
              <input
                type="color"
                value={drawingColor}
                onChange={(event) => setDrawingColor(event.target.value)}
              />
            </label>
          </section>
        </aside>

        <div className="playbook-court-column">
          <div className="canvas-shell playbook-v2-canvas-shell">
            <CourtEditor
              play={play}
              phase={phase}
              tool={tool}
              playerConfig={playerConfig}
              drawingColor={drawingColor}
              selected={selected}
              onSelectedChange={onSelectedChange}
              onCommit={(next) =>
                onUpdatePhase({
                  ...next,
                  duration: Math.max(
                    Number(phase.duration) || 3,
                    phaseMinimumDuration(next)
                  )
                })
              }
            />
          </div>
          <div className="canvas-status-bar">
            <span>
              {phase.objects.length} objetos · {phase.actions.length} acciones
            </span>
            <span>
              Selecciona y arrastra para mover · Supr para borrar · Las acciones se
              pueden temporizar en Animar
            </span>
          </div>
        </div>

        <SelectedInspector
          selected={selected}
          phase={phase}
          onUpdate={updateSelected}
          onDelete={deleteSelected}
        />
      </div>
    </div>
  );
}

function locateAnimationPhase(phases, cursor) {
  let elapsed = 0;
  for (let index = 0; index < phases.length; index += 1) {
    const duration = Math.max(0.5, Number(phases[index].duration) || 3);
    if (cursor <= elapsed + duration || index === phases.length - 1) {
      return {
        phase: phases[index],
        index,
        localTime: Math.max(0, cursor - elapsed),
        duration
      };
    }
    elapsed += duration;
  }
  return { phase: phases[0], index: 0, localTime: 0, duration: 3 };
}

function AnimationMode({ play, phase, onSelectPhase, onUpdatePhase }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const previousTimeRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [scope, setScope] = useState("phase");
  const [cursor, setCursor] = useState(0);
  const [speed, setSpeed] = useState(1);
  const sequence = scope === "all" ? play.phases : [phase];
  const totalDuration = sequence.reduce(
    (total, item) => total + Math.max(0.5, Number(item.duration) || 3),
    0
  );
  const animation = locateAnimationPhase(sequence, cursor);

  useEffect(() => {
    renderAnimationScene(
      canvasRef.current,
      play,
      animation.phase,
      animation.localTime,
      {
        showTitle: animation.phase.showTitle !== false
      }
    );
  }, [animation.localTime, animation.phase, play]);

  useEffect(() => {
    if (!playing) return undefined;
    previousTimeRef.current = performance.now();
    function tick(now) {
      const delta = ((now - previousTimeRef.current) / 1000) * speed;
      previousTimeRef.current = now;
      setCursor((current) => {
        const next = current + delta;
        if (next >= totalDuration) {
          setPlaying(false);
          return totalDuration;
        }
        return next;
      });
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, speed, totalDuration]);

  useEffect(() => {
    setCursor(0);
    setPlaying(false);
  }, [phase.id, scope]);

  function updateAction(actionId, patch) {
    onUpdatePhase({
      actions: phase.actions.map((action) =>
        action.id === actionId ? { ...action, ...patch } : action
      )
    });
  }

  function moveAction(actionId, direction) {
    const actions = [...phase.actions].sort((left, right) => left.order - right.order);
    const index = actions.findIndex((action) => action.id === actionId);
    const destination = index + direction;
    if (destination < 0 || destination >= actions.length) return;
    [actions[index], actions[destination]] = [actions[destination], actions[index]];
    onUpdatePhase({
      actions: actions.map((action, order) => ({ ...action, order }))
    });
  }

  return (
    <div className="playbook-animation-mode">
      <div className="animation-stage">
        <div className="canvas-shell animation-canvas-shell">
          <canvas ref={canvasRef} className="playbook-canvas" />
        </div>
        <div className="animation-controls">
          <button
            className="animation-play-button"
            onClick={() => {
              if (cursor >= totalDuration) setCursor(0);
              setPlaying((current) => !current);
            }}
          >
            {playing ? "Pausar" : "Reproducir"}
          </button>
          <button
            className="mini-button"
            onClick={() => {
              setPlaying(false);
              setCursor(0);
            }}
          >
            ↺
          </button>
          <input
            className="animation-scrubber"
            type="range"
            min="0"
            max={totalDuration}
            step="0.01"
            value={Math.min(cursor, totalDuration)}
            onChange={(event) => {
              setPlaying(false);
              setCursor(Number(event.target.value));
            }}
          />
          <strong>
            {cursor.toFixed(1)} / {totalDuration.toFixed(1)}s
          </strong>
          <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            {[0.5, 1, 1.5, 2].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </div>
        <div className="animation-scope-row">
          <div className="segmented-control">
            <button
              className={scope === "phase" ? "active" : ""}
              onClick={() => setScope("phase")}
            >
              Fase actual
            </button>
            <button
              className={scope === "all" ? "active" : ""}
              onClick={() => setScope("all")}
            >
              Jugada completa
            </button>
          </div>
          <span>
            Reproduciendo: <strong>{animation.phase.name}</strong>
          </span>
        </div>
      </div>

      <aside className="animation-timeline-panel">
        <SectionTitle detail="Orden, inicio y duración">
          Línea temporal de acciones
        </SectionTitle>
        <label className="field phase-title-field">
          <span>Título de la fase</span>
          <input
            value={phase.name}
            onChange={(event) => onUpdatePhase({ name: event.target.value })}
          />
        </label>
        <div className="phase-animation-settings">
          <label className="field">
            <span>Duración total</span>
            <input
              type="number"
              min="0.5"
              step="0.1"
              value={phase.duration || 3}
              onChange={(event) =>
                onUpdatePhase({ duration: Math.max(0.5, Number(event.target.value)) })
              }
            />
          </label>
          <label className="control-toggle compact-toggle">
            <input
              type="checkbox"
              checked={phase.showTitle !== false}
              onChange={(event) => onUpdatePhase({ showTitle: event.target.checked })}
            />
            Mostrar título
          </label>
          <button
            className="button ghost"
            onClick={() =>
              onUpdatePhase({ duration: phaseMinimumDuration(phase) })
            }
          >
            Ajustar automáticamente
          </button>
        </div>
        <div className="action-timeline-list">
          {[...phase.actions]
            .sort((left, right) => left.order - right.order)
            .map((action, index) => (
              <article
                key={action.id}
                style={{ "--action-color": action.color }}
              >
                <header>
                  <span>{index + 1}</span>
                  <strong>{actionLabel(action.kind)}</strong>
                  <div>
                    <button
                      className="mini-button"
                      onClick={() => moveAction(action.id, -1)}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      className="mini-button"
                      onClick={() => moveAction(action.id, 1)}
                      disabled={index === phase.actions.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                </header>
                <div className="action-time-fields">
                  <label>
                    <span>Inicio</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={action.delay || 0}
                      onChange={(event) =>
                        updateAction(action.id, {
                          delay: Math.max(0, Number(event.target.value))
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Duración</span>
                    <input
                      type="number"
                      min="0.2"
                      step="0.1"
                      value={action.duration || 1.2}
                      onChange={(event) =>
                        updateAction(action.id, {
                          duration: Math.max(0.2, Number(event.target.value))
                        })
                      }
                    />
                  </label>
                </div>
                <div className="action-track">
                  <i
                    style={{
                      left: `${((action.delay || 0) / Math.max(phase.duration, 0.5)) * 100}%`,
                      width: `${((action.duration || 1.2) / Math.max(phase.duration, 0.5)) * 100}%`
                    }}
                  />
                </div>
              </article>
            ))}
          {phase.actions.length === 0 && (
            <div className="empty-timeline">
              <strong>No hay acciones en esta fase</strong>
              <p>Vuelve a Dibujar y arrastra una acción desde un jugador.</p>
            </div>
          )}
        </div>
        {scope === "all" && (
          <div className="animation-phase-jump">
            {play.phases.map((item, index) => (
              <button key={item.id} onClick={() => onSelectPhase(item.id)}>
                {index + 1}. {item.name}
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function NoteBlocksEditor({ blocks, onChange, title }) {
  function addBlock(type) {
    onChange([
      ...blocks,
      {
        id: newId(),
        type,
        content: "",
        checked: false
      }
    ]);
  }

  function updateBlock(id, patch) {
    onChange(
      blocks.map((block) => (block.id === id ? { ...block, ...patch } : block))
    );
  }

  function moveBlock(id, direction) {
    const next = [...blocks];
    const index = next.findIndex((block) => block.id === id);
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(next);
  }

  return (
    <section className="note-block-editor">
      <SectionTitle detail="Bloques editables">{title}</SectionTitle>
      <div className="note-block-list">
        {blocks.map((block, index) => (
          <article key={block.id} className={`note-block ${block.type}`}>
            <div className="note-block-handle">
              <span>{block.type === "heading" ? "H" : block.type === "check" ? "✓" : "¶"}</span>
              <div>
                <button
                  className="mini-button"
                  onClick={() => moveBlock(block.id, -1)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  className="mini-button"
                  onClick={() => moveBlock(block.id, 1)}
                  disabled={index === blocks.length - 1}
                >
                  ↓
                </button>
                <button
                  className="mini-button danger-text"
                  onClick={() => onChange(blocks.filter((item) => item.id !== block.id))}
                >
                  ×
                </button>
              </div>
            </div>
            {block.type === "check" && (
              <input
                type="checkbox"
                checked={Boolean(block.checked)}
                onChange={(event) =>
                  updateBlock(block.id, { checked: event.target.checked })
                }
              />
            )}
            {block.type === "paragraph" ? (
              <textarea
                value={block.content}
                placeholder="Escribe la explicación…"
                onChange={(event) =>
                  updateBlock(block.id, { content: event.target.value })
                }
              />
            ) : (
              <input
                value={block.content}
                placeholder={
                  block.type === "heading" ? "Título del bloque" : "Punto clave"
                }
                onChange={(event) =>
                  updateBlock(block.id, { content: event.target.value })
                }
              />
            )}
          </article>
        ))}
        {blocks.length === 0 && (
          <div className="notes-empty-state">
            Empieza añadiendo un título, un texto o una lista de comprobación.
          </div>
        )}
      </div>
      <div className="note-add-buttons">
        <button onClick={() => addBlock("heading")}>+ Título</button>
        <button onClick={() => addBlock("paragraph")}>+ Texto</button>
        <button onClick={() => addBlock("check")}>+ Checklist</button>
      </div>
    </section>
  );
}

function AttachmentsEditor({ attachments, onChange, onNotify, title }) {
  async function addLocalAttachment() {
    const desktop = window.scoutDesktop;
    if (!desktop?.selectPlaybookAttachment) {
      onNotify("La selección de archivos estará disponible en la aplicación instalada.");
      return;
    }
    const result = await desktop.selectPlaybookAttachment();
    if (result?.canceled || !result?.item) return;
    onChange([...attachments, { ...result.item, id: newId(), source: "local" }]);
  }

  function addLink() {
    const url = window.prompt("Enlace de YouTube, vídeo o recurso");
    if (!url?.trim()) return;
    if (!/^https?:\/\//i.test(url.trim())) {
      onNotify("El enlace debe empezar por http:// o https://.");
      return;
    }
    const label = window.prompt("Nombre del recurso", "Vídeo de referencia");
    onChange([
      ...attachments,
      {
        id: newId(),
        source: "url",
        type: "link",
        name: label?.trim() || "Recurso",
        url: url.trim()
      }
    ]);
  }

  return (
    <section className="attachment-editor">
      <SectionTitle detail="Vídeos, imágenes, audio o PDF">{title}</SectionTitle>
      <div className="attachment-list">
        {attachments.map((attachment) => (
          <article key={attachment.id}>
            <span>{attachment.type === "video" ? "▶" : attachment.type === "image" ? "▧" : "↗"}</span>
            <div>
              <strong>{attachment.name || "Recurso"}</strong>
              <small>{attachment.url || attachment.path || "Archivo local"}</small>
            </div>
            <button
              className="mini-button danger-text"
              onClick={() =>
                onChange(attachments.filter((item) => item.id !== attachment.id))
              }
            >
              ×
            </button>
          </article>
        ))}
      </div>
      <div className="attachment-actions">
        <button className="button ghost" onClick={addLocalAttachment}>
          + Archivo local
        </button>
        <button className="button ghost" onClick={addLink}>
          + Enlace o YouTube
        </button>
      </div>
    </section>
  );
}

function NotesMode({ play, phase, onUpdatePlay, onUpdatePhase, onNotify }) {
  return (
    <div className="playbook-notes-mode">
      <section className="playbook-notes-overview">
        <div>
          <span className="eyebrow">Descripción general</span>
          <h2>{play.name}</h2>
        </div>
        <label className="field">
          <span>Objetivo y concepto de la jugada</span>
          <textarea
            value={play.description || ""}
            onChange={(event) => onUpdatePlay({ description: event.target.value })}
            placeholder="Qué buscamos, cuándo usarla y qué ventaja genera…"
          />
        </label>
        <label className="field">
          <span>Notas privadas del entrenador</span>
          <textarea
            value={play.notes || ""}
            onChange={(event) => onUpdatePlay({ notes: event.target.value })}
            placeholder="Lecturas, variantes, correcciones y recordatorios…"
          />
        </label>
        <AttachmentsEditor
          title="Recursos de la jugada"
          attachments={play.attachments || []}
          onChange={(attachments) => onUpdatePlay({ attachments })}
          onNotify={onNotify}
        />
      </section>
      <div className="playbook-notes-editors">
        <NoteBlocksEditor
          title="Documento de la jugada"
          blocks={play.noteBlocks || []}
          onChange={(noteBlocks) => onUpdatePlay({ noteBlocks })}
        />
        <section className="phase-notes-card">
          <SectionTitle detail="Información específica de esta fase">
            {phase.name}
          </SectionTitle>
          <label className="field">
            <span>Explicación de la fase</span>
            <textarea
              value={phase.description || ""}
              onChange={(event) =>
                onUpdatePhase({ description: event.target.value })
              }
              placeholder="Posiciones iniciales, timing y decisiones…"
            />
          </label>
          <NoteBlocksEditor
            title="Puntos clave de la fase"
            blocks={phase.noteBlocks || []}
            onChange={(noteBlocks) => onUpdatePhase({ noteBlocks })}
          />
          <AttachmentsEditor
            title="Clips de esta fase"
            attachments={phase.attachments || []}
            onChange={(attachments) => onUpdatePhase({ attachments })}
            onNotify={onNotify}
          />
        </section>
      </div>
    </div>
  );
}

function PhasePreview({ play, phase, outputSettings }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    renderEditorScene(canvasRef.current, play, phase, { outputSettings });
  }, [outputSettings, phase, play]);
  return (
    <article className="output-phase-card">
      <canvas ref={canvasRef} className="playbook-canvas" />
      {outputSettings.showPhaseTitles && <strong>{phase.name}</strong>}
      {outputSettings.showPhaseDescription && phase.description && (
        <p>{phase.description}</p>
      )}
    </article>
  );
}

async function recordAnimation(play, onProgress) {
  if (!window.MediaRecorder) {
    throw new Error("Este equipo no permite grabar la animación.");
  }
  if (!play.phases?.length) {
    throw new Error("Añade al menos una fase antes de exportar la animación.");
  }
  const canvas = document.createElement("canvas");
  renderAnimationScene(canvas, play, play.phases[0], 0, {
    showTitle: play.phases[0].showTitle !== false
  });
  const stream = canvas.captureStream(30);
  const preferredTypes = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];
  const mimeType =
    preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) ||
    "video/webm";
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 6_000_000
  });
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve;
  });
  recorder.start(250);
  const totalDuration = play.phases.reduce(
    (total, phase) => total + Math.max(0.5, Number(phase.duration) || 3),
    0
  );
  const startedAt = performance.now();
  await new Promise((resolve) => {
    function frame(now) {
      const elapsed = Math.min((now - startedAt) / 1000, totalDuration);
      const animation = locateAnimationPhase(play.phases, elapsed);
      renderAnimationScene(
        canvas,
        play,
        animation.phase,
        animation.localTime,
        { showTitle: animation.phase.showTitle !== false }
      );
      onProgress(Math.round((elapsed / totalDuration) * 100));
      if (elapsed >= totalDuration) {
        resolve();
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  const blob = new Blob(chunks, { type: mimeType });
  return { buffer: await blob.arrayBuffer(), mimeType };
}

function OutputBlockEditor({ settings, onChange }) {
  const blocks = settings.blocks || [];
  function moveBlock(id, direction) {
    const next = [...blocks];
    const index = next.findIndex((block) => block.id === id);
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange({ blocks: next });
  }
  return (
    <section className="output-block-editor">
      <SectionTitle detail="Elige el orden del documento">
        Editor avanzado
      </SectionTitle>
      {blocks.map((block, index) => (
        <article key={block.id}>
          <span>{index + 1}</span>
          <select
            value={block.type}
            onChange={(event) =>
              onChange({
                blocks: blocks.map((item) =>
                  item.id === block.id ? { ...item, type: event.target.value } : item
                )
              })
            }
          >
            <option value="description">Descripción</option>
            <option value="phases">Diagramas de fases</option>
            <option value="notes">Notas</option>
            <option value="attachments">Recursos adjuntos</option>
            <option value="custom">Texto personalizado</option>
          </select>
          <input
            value={block.title || ""}
            onChange={(event) =>
              onChange({
                blocks: blocks.map((item) =>
                  item.id === block.id ? { ...item, title: event.target.value } : item
                )
              })
            }
            placeholder="Título"
          />
          <button
            className="mini-button"
            onClick={() => moveBlock(block.id, -1)}
            disabled={index === 0}
          >
            ↑
          </button>
          <button
            className="mini-button"
            onClick={() => moveBlock(block.id, 1)}
            disabled={index === blocks.length - 1}
          >
            ↓
          </button>
          <button
            className="mini-button danger-text"
            onClick={() =>
              onChange({ blocks: blocks.filter((item) => item.id !== block.id) })
            }
          >
            ×
          </button>
        </article>
      ))}
      <button
        className="button ghost"
        onClick={() =>
          onChange({
            blocks: [
              ...blocks,
              { id: newId(), type: "custom", title: "Nuevo bloque", content: "" }
            ]
          })
        }
      >
        + Añadir bloque
      </button>
    </section>
  );
}

function OutputMode({
  play,
  phase,
  team,
  onUpdatePlay,
  onExport,
  onNotify
}) {
  const settings = play.outputSettings;
  const [videoProgress, setVideoProgress] = useState(null);
  const layoutClass =
    settings.layout === "rows"
      ? "rows"
      : settings.layout === "small-grid"
        ? "small-grid"
        : "large-grid";

  function updateSettings(patch) {
    onUpdatePlay({
      outputSettings: { ...settings, ...patch }
    });
  }

  function exportPng() {
    onExport({
      format: "png",
      name: `${play.name}-${phase.name}`,
      dataUrl: renderPhaseToDataUrl(play, phase, {
        outputSettings: settings
      })
    });
  }

  function exportPdf() {
    onExport({
      format: "pdf",
      name: play.name,
      description: play.description,
      notes: play.notes,
      noteBlocks: play.noteBlocks,
      attachments: play.attachments,
      teamName: team?.name || "",
      teamColor: team?.primaryColor || play.courtStyle?.accent || "#0f766e",
      outputSettings: settings,
      images: play.phases.map((item) => ({
        name: item.name,
        description: item.description,
        noteBlocks: item.noteBlocks,
        attachments: item.attachments,
        dataUrl: renderPhaseToDataUrl(play, item, {
          outputSettings: settings
        })
      }))
    });
  }

  async function exportVideo() {
    setVideoProgress(0);
    try {
      const video = await recordAnimation(play, setVideoProgress);
      await onExport({
        format: "video",
        name: `${play.name}-animacion`,
        ...video
      });
    } catch (error) {
      onNotify(error.message);
    } finally {
      setVideoProgress(null);
    }
  }

  async function copySummary() {
    const phases = play.phases
      .map((item, index) => `${index + 1}. ${item.name}: ${item.description || "Sin descripción"}`)
      .join("\n");
    await navigator.clipboard.writeText(
      `${play.name}\n${team?.name || "Sin equipo"}\n\n${play.description || ""}\n\n${phases}`
    );
    onNotify("Resumen de la jugada copiado.");
  }

  return (
    <div className="playbook-output-mode">
      <aside className="output-settings-panel">
        <SectionTitle detail="Documento y exportación">
          Presentación
        </SectionTitle>
        <div className="output-mode-selector">
          <button
            className={settings.mode !== "advanced" ? "active" : ""}
            onClick={() => updateSettings({ mode: "classic" })}
          >
            <strong>Clásica</strong>
            <small>Informe listo para usar</small>
          </button>
          <button
            className={settings.mode === "advanced" ? "active" : ""}
            onClick={() => updateSettings({ mode: "advanced" })}
          >
            <strong>Avanzada</strong>
            <small>Bloques configurables</small>
          </button>
        </div>
        <label className="field">
          <span>Distribución de las fases</span>
          <select
            value={settings.layout}
            onChange={(event) => updateSettings({ layout: event.target.value })}
          >
            <option value="large-grid">Cuadrícula grande</option>
            <option value="small-grid">Cuadrícula compacta</option>
            <option value="rows">Una fase por fila</option>
          </select>
        </label>
        <div className="output-toggle-list">
          {[
            ["showDescription", "Mostrar descripción"],
            ["showPhaseTitles", "Mostrar títulos de fase"],
            ["showPhaseDescription", "Mostrar explicación por fase"],
            ["showNotes", "Mostrar notas"],
            ["showAttachments", "Mostrar recursos adjuntos"]
          ].map(([key, label]) => (
            <label className="control-toggle compact-toggle" key={key}>
              <input
                type="checkbox"
                checked={settings[key] !== false}
                onChange={(event) => updateSettings({ [key]: event.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
        <label className="court-color-row">
          <span>Color de la pista</span>
          <input
            type="color"
            value={settings.courtColor || play.courtStyle.background}
            onChange={(event) => updateSettings({ courtColor: event.target.value })}
          />
        </label>
        <label className="range-field compact-range">
          <span>
            Margen exterior <strong>{settings.outOfBoundsSpacing}px</strong>
          </span>
          <input
            type="range"
            min="8"
            max="40"
            value={settings.outOfBoundsSpacing}
            onChange={(event) =>
              updateSettings({ outOfBoundsSpacing: Number(event.target.value) })
            }
          />
        </label>
        <label className="range-field compact-range">
          <span>
            Escala de objetos <strong>{settings.objectScale}%</strong>
          </span>
          <input
            type="range"
            min="60"
            max="150"
            value={settings.objectScale}
            onChange={(event) =>
              updateSettings({ objectScale: Number(event.target.value) })
            }
          />
        </label>
        {settings.mode === "advanced" && (
          <OutputBlockEditor settings={settings} onChange={updateSettings} />
        )}
      </aside>

      <div className="output-preview-column">
        <div
          className="playbook-document-preview"
          style={{
            "--document-accent": team?.primaryColor || play.courtStyle.accent
          }}
        >
          <header>
            <div>
              <span>PLAYBOOK · {team?.name || "SIN EQUIPO"}</span>
              <h1>{play.name}</h1>
            </div>
            {team?.logo && <img src={team.logo} alt="" />}
          </header>
          {settings.showDescription && play.description && (
            <section className="document-description">
              <strong>Descripción</strong>
              <p>{play.description}</p>
            </section>
          )}
          <div className={`output-phase-grid ${layoutClass}`}>
            {play.phases.map((item) => (
              <PhasePreview
                key={item.id}
                play={play}
                phase={item}
                outputSettings={settings}
              />
            ))}
          </div>
          {settings.showNotes && (play.notes || play.noteBlocks?.length > 0) && (
            <section className="document-notes">
              <strong>Notas del entrenador</strong>
              {play.notes && <p>{play.notes}</p>}
              {play.noteBlocks?.map((block) => (
                <p key={block.id}>
                  {block.type === "check" ? (block.checked ? "☑ " : "☐ ") : ""}
                  {block.content}
                </p>
              ))}
            </section>
          )}
        </div>
      </div>

      <aside className="output-export-panel">
        <SectionTitle detail="Archivos locales">Exportar</SectionTitle>
        <button className="export-format-button" onClick={exportPng}>
          <span>PNG</span>
          <div>
            <strong>Fase actual</strong>
            <small>Imagen de alta calidad</small>
          </div>
        </button>
        <button className="export-format-button" onClick={exportPdf}>
          <span>PDF</span>
          <div>
            <strong>Documento completo</strong>
            <small>Todas las fases y notas</small>
          </div>
        </button>
        <button
          className="export-format-button featured"
          onClick={exportVideo}
          disabled={videoProgress !== null}
        >
          <span>▶</span>
          <div>
            <strong>
              {videoProgress === null
                ? "Vídeo animado"
                : `Grabando… ${videoProgress}%`}
            </strong>
            <small>Animación completa en WebM</small>
          </div>
        </button>
        {videoProgress !== null && (
          <div className="video-export-progress">
            <i style={{ width: `${videoProgress}%` }} />
          </div>
        )}
        <button className="button ghost" onClick={copySummary}>
          Copiar resumen para compartir
        </button>
        <p>
          Los enlaces públicos llegarán cuando Tactovia incorpore cuentas y
          sincronización. Por ahora todo permanece en local.
        </p>
      </aside>
    </div>
  );
}

export function Playbook({
  playbook,
  teams,
  onChange,
  onExport,
  onNotify = () => {}
}) {
  const [selectedPlayId, setSelectedPlayId] = useState(
    playbook.plays[0]?.id || ""
  );
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [mode, setMode] = useState("draw");
  const [tool, setTool] = useState("select");
  const [selected, setSelected] = useState(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [templatePicker, setTemplatePicker] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const historyRef = useRef({ past: [], future: [] });

  const play =
    playbook.plays.find((item) => item.id === selectedPlayId) ||
    playbook.plays[0];
  const phase =
    play?.phases.find((item) => item.id === selectedPhaseId) || play?.phases[0];
  const team = teams.find((item) => item.id === play?.teamId);

  useEffect(() => {
    if (play && !play.phases.some((item) => item.id === selectedPhaseId)) {
      setSelectedPhaseId(play.phases[0]?.id || "");
    }
  }, [play, selectedPhaseId]);

  useEffect(() => {
    setSelected(null);
  }, [mode, phase?.id, play?.id]);

  function commit(next) {
    historyRef.current.past.push(cloneState(playbook));
    if (historyRef.current.past.length > 50) historyRef.current.past.shift();
    historyRef.current.future = [];
    onChange(next);
  }

  function undo() {
    const previous = historyRef.current.past.pop();
    if (!previous) return;
    historyRef.current.future.push(cloneState(playbook));
    onChange(previous);
    onNotify("Cambio deshecho.");
  }

  function redo() {
    const next = historyRef.current.future.pop();
    if (!next) return;
    historyRef.current.past.push(cloneState(playbook));
    onChange(next);
    onNotify("Cambio rehecho.");
  }

  function updatePlay(patch) {
    commit({
      ...playbook,
      plays: playbook.plays.map((item) =>
        item.id === play.id
          ? { ...item, ...patch, updatedAt: new Date().toISOString() }
          : item
      )
    });
  }

  function updatePhase(patch) {
    updatePlay({
      phases: play.phases.map((item) =>
        item.id === phase.id ? { ...item, ...patch } : item
      )
    });
  }

  function addFolder({ name, teamId }) {
    commit({
      ...playbook,
      folders: [
        ...playbook.folders,
        { id: newId(), name, teamId: teamId || "" }
      ]
    });
  }

  function renameFolder(folder) {
    const name = window.prompt("Nombre de la carpeta", folder.name)?.trim();
    if (!name) return;
    commit({
      ...playbook,
      folders: playbook.folders.map((item) =>
        item.id === folder.id ? { ...item, name } : item
      )
    });
  }

  function deleteFolder(folder) {
    if (playbook.folders.length === 1) return;
    const destination = playbook.folders.find((item) => item.id !== folder.id);
    if (
      !window.confirm(
        `¿Eliminar la carpeta "${folder.name}"? Sus jugadas pasarán a ${destination.name}.`
      )
    ) {
      return;
    }
    commit({
      ...playbook,
      folders: playbook.folders.filter((item) => item.id !== folder.id),
      plays: playbook.plays.map((item) =>
        item.folderId === folder.id
          ? { ...item, folderId: destination.id }
          : item
      )
    });
  }

  function createPlay({ folderId, court, templateId }) {
    const next = createPlaybookPlay(
      playbook.plays.length + 1,
      folderId || playbook.folders[0]?.id,
      templateId,
      court
    );
    commit({ ...playbook, plays: [...playbook.plays, next] });
    setSelectedPlayId(next.id);
    setSelectedPhaseId(next.phases[0].id);
    setTemplatePicker(null);
    setMode("draw");
  }

  function duplicatePlay() {
    const copy = cloneState(play);
    copy.id = newId();
    copy.name = `${play.name} (copia)`;
    copy.phases = copy.phases.map((item) => ({
      ...item,
      id: newId(),
      objects: item.objects.map((object) => ({ ...object, id: newId() })),
      actions: item.actions.map((action) => ({ ...action, id: newId() }))
    }));
    commit({ ...playbook, plays: [...playbook.plays, copy] });
    setSelectedPlayId(copy.id);
    setSelectedPhaseId(copy.phases[0].id);
  }

  function deletePlay() {
    if (playbook.plays.length === 1) return;
    if (!window.confirm(`¿Eliminar la jugada "${play.name}"?`)) return;
    const remaining = playbook.plays.filter((item) => item.id !== play.id);
    commit({ ...playbook, plays: remaining });
    setSelectedPlayId(remaining[0].id);
  }

  function savePlay() {
    updatePlay({ savedAt: new Date().toISOString() });
    onNotify("Jugada guardada en la biblioteca.");
  }

  function smartNextPhase() {
    const next = generateNextPhase(
      phase,
      `Fase ${play.phases.length + 1}`
    );
    updatePlay({ phases: [...play.phases, next] });
    setSelectedPhaseId(next.id);
  }

  function clonePhase() {
    const next = createPlaybookPhase(
      `${phase.name} (copia)`,
      phase.objects,
      {
        description: phase.description,
        duration: phase.duration,
        showTitle: phase.showTitle,
        actions: phase.actions,
        noteBlocks: phase.noteBlocks,
        attachments: phase.attachments
      }
    );
    updatePlay({ phases: [...play.phases, next] });
    setSelectedPhaseId(next.id);
  }

  function emptyPhase() {
    const next = createPlaybookPhase(`Fase ${play.phases.length + 1}`);
    updatePlay({ phases: [...play.phases, next] });
    setSelectedPhaseId(next.id);
  }

  function reflectPhase() {
    updatePhase(mirrorPhase(phase, play.court));
    onNotify("Fase reflejada.");
  }

  function movePhase(direction) {
    const phases = [...play.phases];
    const index = phases.findIndex((item) => item.id === phase.id);
    const destination = index + direction;
    if (destination < 0 || destination >= phases.length) return;
    [phases[index], phases[destination]] = [phases[destination], phases[index]];
    updatePlay({ phases });
  }

  function deletePhase() {
    if (play.phases.length === 1) return;
    const remaining = play.phases.filter((item) => item.id !== phase.id);
    updatePlay({ phases: remaining });
    setSelectedPhaseId(remaining[0].id);
  }

  if (!play || !phase) return null;

  return (
    <section className={`playbook-view professional-playbook playbook-v2 ${libraryOpen ? "" : "library-collapsed"}`}>
      {libraryOpen && (
        <PlayLibrary
          playbook={playbook}
          teams={teams}
          play={play}
          search={librarySearch}
          onSearch={setLibrarySearch}
          onSelectPlay={setSelectedPlayId}
          onAddPlay={(folderId = playbook.folders[0]?.id) =>
            setTemplatePicker({ folderId })
          }
          onAddFolder={addFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
        />
      )}

      <div className="playbook-workspace playbook-v2-workspace">
        <header className="playbook-v2-header">
          <button
            className="playbook-library-toggle"
            onClick={() => setLibraryOpen((current) => !current)}
            title={libraryOpen ? "Ocultar biblioteca" : "Mostrar biblioteca"}
          >
            {libraryOpen ? "←" : "☰"}
          </button>
          <div className="playbook-title-group">
            <input
              className="play-title-input"
              value={play.name}
              onChange={(event) => updatePlay({ name: event.target.value })}
            />
            <div className="playbook-meta">
              <select
                value={play.folderId}
                onChange={(event) => updatePlay({ folderId: event.target.value })}
              >
                {playbook.folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <select
                value={play.teamId || ""}
                onChange={(event) => updatePlay({ teamId: event.target.value })}
              >
                <option value="">Sin equipo asociado</option>
                {teams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {team && <TeamBadge team={team} />}
            </div>
          </div>
          <div className="playbook-header-actions">
            <button
              className="mini-button"
              onClick={undo}
              disabled={historyRef.current.past.length === 0}
              title="Deshacer"
            >
              ↶
            </button>
            <button
              className="mini-button"
              onClick={redo}
              disabled={historyRef.current.future.length === 0}
              title="Rehacer"
            >
              ↷
            </button>
            <button className="button primary" onClick={savePlay}>
              Guardar
            </button>
            <button className="button ghost" onClick={duplicatePlay}>
              Duplicar
            </button>
            <button
              className="button ghost danger-text"
              onClick={deletePlay}
              disabled={playbook.plays.length === 1}
            >
              Eliminar
            </button>
          </div>
        </header>

        <ModeNavigation mode={mode} onChange={setMode} />

        <PhaseStrip
          phases={play.phases}
          selectedId={phase.id}
          onSelect={setSelectedPhaseId}
          onSmartNext={smartNextPhase}
          onClone={clonePhase}
          onEmpty={emptyPhase}
          onMirror={reflectPhase}
          onMove={movePhase}
          onDelete={deletePhase}
        />

        <main className="playbook-mode-content">
          {mode === "draw" && (
            <DrawMode
              play={play}
              phase={phase}
              teams={teams}
              tool={tool}
              onToolChange={setTool}
              onUpdatePlay={updatePlay}
              onUpdatePhase={updatePhase}
              selected={selected}
              onSelectedChange={setSelected}
              onNotify={onNotify}
            />
          )}
          {mode === "animate" && (
            <AnimationMode
              play={play}
              phase={phase}
              onSelectPhase={setSelectedPhaseId}
              onUpdatePhase={updatePhase}
            />
          )}
          {mode === "notes" && (
            <NotesMode
              play={play}
              phase={phase}
              onUpdatePlay={updatePlay}
              onUpdatePhase={updatePhase}
              onNotify={onNotify}
            />
          )}
          {mode === "output" && (
            <OutputMode
              play={play}
              phase={phase}
              team={team}
              onUpdatePlay={updatePlay}
              onExport={onExport}
              onNotify={onNotify}
            />
          )}
        </main>
      </div>

      {templatePicker && (
        <TemplatePicker
          folderId={templatePicker.folderId}
          onClose={() => setTemplatePicker(null)}
          onCreate={createPlay}
        />
      )}
    </section>
  );
}
