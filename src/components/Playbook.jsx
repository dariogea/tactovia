import { useEffect, useMemo, useRef, useState } from "react";
import { createPlaybookPhase, createPlaybookPlay } from "../lib/defaults.js";
import { sortPlayersByNumber } from "../lib/roster.js";

const tools = [
  { id: "select", label: "Mover" },
  { id: "player", label: "Jugador" },
  { id: "ball", label: "Balón" },
  { id: "arrow", label: "Desplazamiento" },
  { id: "line", label: "Línea" },
  { id: "text", label: "Texto" },
  { id: "eraser", label: "Borrar" }
];

const defaultCourtStyle = {
  background: "#c98f55",
  outOfBounds: "#102133",
  lines: "#ffffff",
  paint: "#b9783e",
  accent: "#ff6b35",
  lineWidth: 3
};

function canvasSize(court) {
  return court === "full" ? { width: 1120, height: 620 } : { width: 720, height: 620 };
}

function drawCourt(ctx, width, height, court, requestedStyle) {
  const style = { ...defaultCourtStyle, ...requestedStyle };
  ctx.fillStyle = style.outOfBounds;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = style.background;
  ctx.fillRect(14, 14, width - 28, height - 28);
  ctx.strokeStyle = style.lines;
  ctx.lineWidth = Number(style.lineWidth) || 3;
  ctx.strokeRect(14, 14, width - 28, height - 28);

  function basketSide(x, direction) {
    const baseline = direction === 1 ? x + 70 : x - 70;
    const laneX = direction === 1 ? x : x - 190;
    ctx.fillStyle = style.paint;
    ctx.fillRect(laneX, height / 2 - 105, 190, 210);
    ctx.strokeStyle = style.lines;
    ctx.beginPath();
    ctx.moveTo(baseline, height / 2 - 45);
    ctx.lineTo(baseline, height / 2 + 45);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(direction === 1 ? baseline + 18 : baseline - 18, height / 2, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(direction === 1 ? x : x - 190, height / 2 - 105, 190, 210);
    ctx.beginPath();
    ctx.arc(direction === 1 ? x + 190 : x - 190, height / 2, 105, -Math.PI / 2, Math.PI / 2, direction !== 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(direction === 1 ? x + 35 : x - 35, height / 2, 245, -1.1, 1.1, direction !== 1);
    ctx.stroke();
  }

  basketSide(14, 1);
  if (court === "full") {
    basketSide(width - 14, -1);
    ctx.beginPath();
    ctx.moveTo(width / 2, 14);
    ctx.lineTo(width / 2, height - 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 76, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(width - 35, 14);
    ctx.lineTo(width - 35, height - 14);
    ctx.stroke();
  }

  ctx.fillStyle = style.accent;
  ctx.beginPath();
  ctx.arc(directionForAccent(court, width), height / 2, 5, 0, Math.PI * 2);
  ctx.fill();
}

function directionForAccent(court, width) {
  return court === "full" ? width / 2 : width - 35;
}

function drawArrow(ctx, object) {
  const color = object.color || "#10243a";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = object.width || 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(object.x1, object.y1);
  ctx.lineTo(object.x2, object.y2);
  ctx.stroke();
  if (object.kind === "arrow") {
    const angle = Math.atan2(object.y2 - object.y1, object.x2 - object.x1);
    ctx.beginPath();
    ctx.moveTo(object.x2, object.y2);
    ctx.lineTo(object.x2 - 24 * Math.cos(angle - Math.PI / 6), object.y2 - 24 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(object.x2 - 24 * Math.cos(angle + Math.PI / 6), object.y2 - 24 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }
}

function drawObject(ctx, object, selected = false) {
  if (object.kind === "arrow" || object.kind === "line") {
    drawArrow(ctx, object);
    if (selected) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.strokeRect(
        Math.min(object.x1, object.x2) - 10,
        Math.min(object.y1, object.y2) - 10,
        Math.abs(object.x2 - object.x1) + 20,
        Math.abs(object.y2 - object.y1) + 20
      );
      ctx.setLineDash([]);
    }
    return;
  }
  if (object.kind === "text") {
    ctx.font = `700 ${object.fontSize || 24}px system-ui`;
    ctx.fillStyle = object.color || "#10243a";
    ctx.fillText(object.text, object.x, object.y);
    if (selected) {
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(object.x - 5, object.y - 28, ctx.measureText(object.text).width + 10, 36);
    }
    return;
  }
  if (object.kind === "ball") {
    ctx.fillStyle = "#f97316";
    ctx.strokeStyle = selected ? "#ffffff" : "#351507";
    ctx.lineWidth = selected ? 5 : 3;
    ctx.beginPath();
    ctx.arc(object.x, object.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(object.x - 16, object.y);
    ctx.lineTo(object.x + 16, object.y);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = object.color || "#0f766e";
  ctx.strokeStyle = selected ? "#ffffff" : object.borderColor || "#10243a";
  ctx.lineWidth = selected ? 6 : 3;
  ctx.beginPath();
  ctx.arc(object.x, object.y, 27, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 18px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(object.label || "P", object.x, object.y);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function renderPlay(play, phase, canvas) {
  const size = canvasSize(play.court);
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  drawCourt(ctx, size.width, size.height, play.court, play.courtStyle);
  phase.objects.forEach((object) => drawObject(ctx, object));
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function hitObject(objects, point) {
  return objects.slice().reverse().find((object) => {
    if (object.kind === "arrow" || object.kind === "line") {
      return distanceToSegment(point, { x: object.x1, y: object.y1 }, { x: object.x2, y: object.y2 }) < 18;
    }
    if (object.kind === "text") return Math.hypot(point.x - object.x, point.y - object.y) < 55;
    return Math.hypot(point.x - object.x, point.y - object.y) < 36;
  });
}

function CourtCanvas({ play, phase, tool, color, playerLabel, onObjectsChange, canvasRef }) {
  const internalRef = useRef(null);
  const [selectedId, setSelectedId] = useState("");
  const gesture = useRef(null);
  const size = canvasSize(play.court);

  useEffect(() => {
    canvasRef.current = internalRef.current;
  }, [canvasRef]);

  useEffect(() => {
    const canvas = internalRef.current;
    const ctx = canvas.getContext("2d");
    drawCourt(ctx, size.width, size.height, play.court, play.courtStyle);
    phase.objects.forEach((object) => drawObject(ctx, object, selectedId === object.id));
  }, [phase.objects, play.court, play.courtStyle, selectedId, size.height, size.width]);

  useEffect(() => {
    function deleteSelected(event) {
      if (!selectedId || (event.key !== "Delete" && event.key !== "Backspace")) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      onObjectsChange(phase.objects.filter((object) => object.id !== selectedId));
      setSelectedId("");
    }
    window.addEventListener("keydown", deleteSelected);
    return () => window.removeEventListener("keydown", deleteSelected);
  }, [onObjectsChange, phase.objects, selectedId]);

  function pointFromEvent(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * size.width,
      y: ((event.clientY - bounds.top) / bounds.height) * size.height
    };
  }

  function pointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    const hit = hitObject(phase.objects, point);
    if (tool === "eraser") {
      if (hit) onObjectsChange(phase.objects.filter((object) => object.id !== hit.id));
      return;
    }
    if (tool === "select") {
      setSelectedId(hit?.id || "");
      if (hit) gesture.current = { type: "move", id: hit.id, start: point, original: { ...hit } };
      return;
    }
    if (tool === "player") {
      const automatic = phase.objects.filter((item) => item.kind === "player").length + 1;
      onObjectsChange([...phase.objects, { id: crypto.randomUUID(), kind: "player", x: point.x, y: point.y, color, label: playerLabel || String(automatic) }]);
      return;
    }
    if (tool === "ball") {
      onObjectsChange([...phase.objects, { id: crypto.randomUUID(), kind: "ball", x: point.x, y: point.y }]);
      return;
    }
    if (tool === "text") {
      const text = window.prompt("Texto sobre la pista");
      if (text?.trim()) onObjectsChange([...phase.objects, { id: crypto.randomUUID(), kind: "text", x: point.x, y: point.y, text: text.trim(), color }]);
      return;
    }
    gesture.current = { type: "draw", kind: tool, start: point };
  }

  function pointerMove(event) {
    if (!gesture.current || gesture.current.type !== "move") return;
    const point = pointFromEvent(event);
    const { original, start, id } = gesture.current;
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    onObjectsChange(phase.objects.map((object) => {
      if (object.id !== id) return object;
      if (object.kind === "arrow" || object.kind === "line") {
        return { ...object, x1: original.x1 + dx, y1: original.y1 + dy, x2: original.x2 + dx, y2: original.y2 + dy };
      }
      return { ...object, x: original.x + dx, y: original.y + dy };
    }));
  }

  function pointerUp(event) {
    if (gesture.current?.type === "draw") {
      const end = pointFromEvent(event);
      const start = gesture.current.start;
      if (Math.hypot(end.x - start.x, end.y - start.y) > 8) {
        onObjectsChange([...phase.objects, { id: crypto.randomUUID(), kind: gesture.current.kind, x1: start.x, y1: start.y, x2: end.x, y2: end.y, color }]);
      }
    }
    gesture.current = null;
  }

  return (
    <canvas
      ref={internalRef}
      width={size.width}
      height={size.height}
      className="playbook-canvas"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      aria-label={`Editor de ${play.court === "full" ? "pista completa" : "media pista"}`}
    />
  );
}

function TeamBadge({ team }) {
  if (!team) return <span className="library-team-badge neutral">Sin equipo</span>;
  return (
    <span className="library-team-badge" style={{ "--badge-color": team.primaryColor }}>
      {team.logo && <img src={team.logo} alt="" />}{team.shortName || team.name}
    </span>
  );
}

export function Playbook({
  playbook,
  teams,
  onChange,
  onExport,
  onNotify = () => {}
}) {
  const [selectedPlayId, setSelectedPlayId] = useState(playbook.plays[0]?.id || "");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [tool, setTool] = useState("select");
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [genericPlayer, setGenericPlayer] = useState("1");
  const [drawingColor, setDrawingColor] = useState("#0f766e");
  const [librarySearch, setLibrarySearch] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderTeamId, setNewFolderTeamId] = useState("");
  const canvasRef = useRef(null);

  const play = playbook.plays.find((item) => item.id === selectedPlayId) || playbook.plays[0];
  const phase = play?.phases.find((item) => item.id === selectedPhaseId) || play?.phases[0];
  const selectedTeam = teams.find((item) => item.id === teamId);
  const selectedPlayer = selectedTeam?.players.find((item) => item.id === playerId);
  const playerLabel = selectedPlayer?.number || genericPlayer;
  const playerColor = selectedTeam?.primaryColor || drawingColor;

  useEffect(() => {
    if (play && !play.phases.some((item) => item.id === selectedPhaseId)) {
      setSelectedPhaseId(play.phases[0]?.id || "");
    }
  }, [play, selectedPhaseId]);

  const folderRows = useMemo(
    () => playbook.folders.map((folder) => ({
      ...folder,
      team: teams.find((team) => team.id === folder.teamId),
      plays: playbook.plays.filter((item) => item.folderId === folder.id && item.name.toLowerCase().includes(librarySearch.toLowerCase()))
    })),
    [librarySearch, playbook.folders, playbook.plays, teams]
  );

  function updatePlay(patch) {
    onChange({
      ...playbook,
      plays: playbook.plays.map((item) =>
        item.id === play.id
          ? { ...item, ...patch, updatedAt: new Date().toISOString() }
          : item
      )
    });
  }

  function updatePhase(patch) {
    updatePlay({ phases: play.phases.map((item) => item.id === phase.id ? { ...item, ...patch } : item) });
  }

  function addFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    onChange({
      ...playbook,
      folders: [...playbook.folders, { id: crypto.randomUUID(), name, teamId: newFolderTeamId }]
    });
    setNewFolderName("");
    setNewFolderTeamId("");
  }

  function renameFolder(folder) {
    const name = window.prompt("Nombre de la carpeta", folder.name)?.trim();
    if (!name) return;
    onChange({
      ...playbook,
      folders: playbook.folders.map((item) =>
        item.id === folder.id ? { ...item, name } : item
      )
    });
  }

  function deleteFolder(folder) {
    if (playbook.folders.length === 1) return;
    const destination = playbook.folders.find((item) => item.id !== folder.id);
    if (!window.confirm(`¿Eliminar la carpeta "${folder.name}"? Sus jugadas pasarán a ${destination.name}.`)) return;
    onChange({
      ...playbook,
      folders: playbook.folders.filter((item) => item.id !== folder.id),
      plays: playbook.plays.map((item) =>
        item.folderId === folder.id ? { ...item, folderId: destination.id } : item
      )
    });
  }

  function addPlay(folderId = playbook.folders[0]?.id) {
    const next = createPlaybookPlay(playbook.plays.length + 1, folderId);
    onChange({ ...playbook, plays: [...playbook.plays, next] });
    setSelectedPlayId(next.id);
    setSelectedPhaseId(next.phases[0].id);
  }

  function duplicatePlay() {
    const copy = {
      ...play,
      id: crypto.randomUUID(),
      name: `${play.name} (copia)`,
      phases: play.phases.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        objects: item.objects.map((object) => ({ ...object, id: crypto.randomUUID() }))
      }))
    };
    onChange({ ...playbook, plays: [...playbook.plays, copy] });
    setSelectedPlayId(copy.id);
    setSelectedPhaseId(copy.phases[0].id);
  }

  function deletePlay() {
    if (playbook.plays.length === 1) return;
    if (!window.confirm(`¿Eliminar la jugada "${play.name}"?`)) return;
    const remaining = playbook.plays.filter((item) => item.id !== play.id);
    onChange({ ...playbook, plays: remaining });
    setSelectedPlayId(remaining[0].id);
  }

  function addPhase() {
    const next = createPlaybookPhase(`Fase ${play.phases.length + 1}`, phase.objects);
    updatePlay({ phases: [...play.phases, next] });
    setSelectedPhaseId(next.id);
  }

  function duplicatePhase() {
    const next = createPlaybookPhase(`${phase.name} (copia)`, phase.objects);
    updatePlay({ phases: [...play.phases, next] });
    setSelectedPhaseId(next.id);
  }

  function deletePhase() {
    if (play.phases.length === 1) return;
    const remaining = play.phases.filter((item) => item.id !== phase.id);
    updatePlay({ phases: remaining });
    setSelectedPhaseId(remaining[0].id);
  }

  function savePlay() {
    updatePlay({ savedAt: new Date().toISOString() });
    onNotify("Jugada guardada en la biblioteca.");
  }

  function exportCurrent(format) {
    if (format === "png") {
      const dataUrl = canvasRef.current?.toDataURL("image/png");
      if (dataUrl) onExport({ format, name: `${play.name}-${phase.name}`, dataUrl });
      return;
    }
    const images = play.phases.map((item) => {
      const canvas = document.createElement("canvas");
      renderPlay(play, item, canvas);
      return { name: item.name, dataUrl: canvas.toDataURL("image/png") };
    });
    onExport({
      format,
      name: play.name,
      description: play.description,
      notes: play.notes,
      teamName: teams.find((team) => team.id === play.teamId)?.name || "",
      images
    });
  }

  if (!play || !phase) return null;

  return (
    <section className="playbook-view professional-playbook">
      <aside className="play-library">
        <div className="section-heading"><div><span className="eyebrow">Playbook</span><h2>Biblioteca</h2></div></div>
        <input className="library-search" value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Buscar jugada…" />
        <div className="folder-list">
          {folderRows.map((folder) => (
            <section className="play-folder" key={folder.id}>
              <header>
                <div><strong>{folder.name}</strong><TeamBadge team={folder.team} /></div>
                <div className="folder-actions">
                  <button className="mini-button" onClick={() => renameFolder(folder)} aria-label={`Renombrar ${folder.name}`}>✎</button>
                  <button className="mini-button danger-text" onClick={() => deleteFolder(folder)} disabled={playbook.folders.length === 1} aria-label={`Eliminar ${folder.name}`}>×</button>
                  <button className="mini-button" onClick={() => addPlay(folder.id)} aria-label={`Añadir jugada a ${folder.name}`}>+</button>
                </div>
              </header>
              <div>
                {folder.plays.map((item) => (
                  <button
                    key={item.id}
                    className={`play-list-item ${item.id === play.id ? "active" : ""}`}
                    style={{ "--play-color": teams.find((team) => team.id === item.teamId)?.primaryColor || "#2dd4bf" }}
                    onClick={() => setSelectedPlayId(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <small>{item.phases.length} {item.phases.length === 1 ? "fase" : "fases"} · {item.court === "full" ? "Pista completa" : "Media pista"}</small>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="new-folder-form">
          <input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Nueva carpeta" />
          <select value={newFolderTeamId} onChange={(event) => setNewFolderTeamId(event.target.value)}><option value="">Carpeta personal</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
          <button className="button ghost" onClick={addFolder} disabled={!newFolderName.trim()}>Crear carpeta</button>
        </div>
      </aside>

      <div className="playbook-workspace">
        <div className="playbook-heading">
          <div className="playbook-title-group">
            <input className="play-title-input" value={play.name} onChange={(event) => updatePlay({ name: event.target.value })} />
            <div className="playbook-meta">
              <select value={play.folderId} onChange={(event) => updatePlay({ folderId: event.target.value })}>{playbook.folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>
              <select value={play.teamId || ""} onChange={(event) => updatePlay({ teamId: event.target.value })}><option value="">Sin equipo asociado</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
            </div>
          </div>
          <div className="playbook-actions">
            <button className="button secondary" onClick={savePlay}>Guardar jugada</button>
            <button className="button ghost" onClick={duplicatePlay}>Duplicar</button>
            <button className="button ghost danger-text" onClick={deletePlay} disabled={playbook.plays.length === 1}>Eliminar</button>
            <button className="button secondary" onClick={() => exportCurrent("png")}>PNG</button>
            <button className="button primary" onClick={() => exportCurrent("pdf")}>PDF</button>
          </div>
        </div>

        <div className="phase-strip">
          {play.phases.map((item, index) => (
            <button key={item.id} className={item.id === phase.id ? "active" : ""} onClick={() => setSelectedPhaseId(item.id)}>
              <span>{index + 1}</span>{item.name}
            </button>
          ))}
          <button className="add-phase" onClick={addPhase}>+ Nueva fase</button>
        </div>

        <div className="phase-heading">
          <input value={phase.name} onChange={(event) => updatePhase({ name: event.target.value })} />
          <span>Al crear una fase se copian los elementos de la anterior para poder moverlos.</span>
          <button className="mini-button" onClick={duplicatePhase}>Duplicar fase</button>
          <button className="mini-button danger-text" onClick={deletePhase} disabled={play.phases.length === 1}>Borrar fase</button>
        </div>

        <div className="playbook-toolbar">
          <div className="tool-group">{tools.map((item) => <button key={item.id} className={`tool-button ${tool === item.id ? "active-tool" : ""}`} onClick={() => setTool(item.id)}>{item.label}</button>)}</div>
          <label className="field inline-field"><span>Pista</span><select value={play.court} onChange={(event) => updatePlay({ court: event.target.value })}><option value="half">Media pista</option><option value="full">Pista completa</option></select></label>
          <input className="playbook-color" type="color" value={drawingColor} onChange={(event) => setDrawingColor(event.target.value)} aria-label="Color de dibujo" />
        </div>

        <div className="player-palette">
          <div><span>Jugadores neutros</span>{["1", "2", "3", "4", "5"].map((number) => <button key={number} className={genericPlayer === number && !teamId ? "active" : ""} onClick={() => { setGenericPlayer(number); setTeamId(""); setPlayerId(""); setTool("player"); }}>{number}</button>)}</div>
          <label><span>Equipo</span><select value={teamId} onChange={(event) => { setTeamId(event.target.value); setPlayerId(""); if (event.target.value) setDrawingColor(teams.find((team) => team.id === event.target.value)?.primaryColor || drawingColor); }}><option value="">Neutro</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
          <label><span>Jugador</span><select value={playerId} onChange={(event) => { setPlayerId(event.target.value); setTool("player"); }} disabled={!selectedTeam}><option value="">Dorsal automático</option>{sortPlayersByNumber(selectedTeam?.players || []).map((player) => <option key={player.id} value={player.id}>#{player.number || "—"} {player.name}</option>)}</select></label>
        </div>

        <div className="playbook-content-grid">
          <div className="canvas-shell">
            <CourtCanvas
              play={play}
              phase={phase}
              tool={tool}
              color={playerColor}
              playerLabel={playerLabel}
              onObjectsChange={(objects) => updatePhase({ objects })}
              canvasRef={canvasRef}
            />
          </div>
          <aside className="playbook-inspector">
            <section>
              <h3>Estilo de pista</h3>
              {[
                ["background", "Parqué"],
                ["outOfBounds", "Exterior"],
                ["lines", "Líneas"],
                ["paint", "Zona"],
                ["accent", "Acento"]
              ].map(([key, label]) => (
                <label className="court-color-row" key={key}><span>{label}</span><input type="color" value={play.courtStyle?.[key] || defaultCourtStyle[key]} onChange={(event) => updatePlay({ courtStyle: { ...defaultCourtStyle, ...play.courtStyle, [key]: event.target.value } })} /></label>
              ))}
              <label className="field"><span>Grosor de líneas</span><select value={play.courtStyle?.lineWidth || 3} onChange={(event) => updatePlay({ courtStyle: { ...defaultCourtStyle, ...play.courtStyle, lineWidth: Number(event.target.value) } })}><option value="2">Fino</option><option value="3">Normal</option><option value="5">Grueso</option></select></label>
            </section>
            <section>
              <h3>Información</h3>
              <label className="field"><span>Descripción</span><textarea value={play.description || ""} onChange={(event) => updatePlay({ description: event.target.value })} placeholder="Objetivo y concepto de la jugada…" /></label>
              <label className="field"><span>Notas del entrenador</span><textarea value={play.notes || ""} onChange={(event) => updatePlay({ notes: event.target.value })} placeholder="Claves, variantes y lecturas…" /></label>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
