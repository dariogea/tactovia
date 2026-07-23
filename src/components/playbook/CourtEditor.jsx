import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACTION_TYPES,
  actionEndTime,
  courtDimensions
} from "../../lib/playbook.js";
import {
  hitAction,
  hitObject,
  preloadCourtImages,
  renderEditorScene
} from "./CourtRenderer.js";

const actionIds = new Set(ACTION_TYPES.map((item) => item.id));
const dragObjectTools = new Set([
  "line",
  "arrow",
  "rectangle",
  "circle",
  "triangle"
]);

function newId() {
  return crypto.randomUUID();
}

function moveItem(item, deltaX, deltaY) {
  if (Number.isFinite(Number(item.x1))) {
    return {
      ...item,
      x1: item.x1 + deltaX,
      y1: item.y1 + deltaY,
      x2: item.x2 + deltaX,
      y2: item.y2 + deltaY
    };
  }
  return {
    ...item,
    x: item.x + deltaX,
    y: item.y + deltaY
  };
}

function selectedHit(objects, actions, point) {
  const object = hitObject(objects, point);
  if (object) return { type: "object", item: object };
  const action = hitAction(actions, point);
  if (action) return { type: "action", item: action };
  return null;
}

export function CourtEditor({
  play,
  phase,
  tool,
  playerConfig,
  drawingColor,
  selected,
  onSelectedChange,
  onCommit
}) {
  const canvasRef = useRef(null);
  const gestureRef = useRef(null);
  const workingRef = useRef({
    objects: phase.objects || [],
    actions: phase.actions || []
  });
  const [working, setWorking] = useState({
    objects: phase.objects || [],
    actions: phase.actions || []
  });
  const [draft, setDraft] = useState(null);
  const [imageRevision, setImageRevision] = useState(0);

  useEffect(() => {
    const next = {
      objects: phase.objects || [],
      actions: phase.actions || []
    };
    workingRef.current = next;
    setWorking(next);
    setDraft(null);
  }, [phase.id, phase.objects, phase.actions]);

  useEffect(() => {
    preloadCourtImages(working.objects, () =>
      setImageRevision((revision) => revision + 1)
    );
  }, [working.objects]);

  useEffect(() => {
    renderEditorScene(canvasRef.current, play, working, {
      selected,
      draft
    });
  }, [draft, imageRevision, play, selected, working]);

  useEffect(() => {
    function deleteSelected(event) {
      if (
        !selected ||
        !["Delete", "Backspace"].includes(event.key) ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }
      event.preventDefault();
      const next = {
        objects:
          selected.type === "object"
            ? working.objects.filter((object) => object.id !== selected.id)
            : working.objects,
        actions:
          selected.type === "action"
            ? working.actions.filter((action) => action.id !== selected.id)
            : working.actions
      };
      workingRef.current = next;
      setWorking(next);
      onSelectedChange(null);
      onCommit(next);
    }
    window.addEventListener("keydown", deleteSelected);
    return () => window.removeEventListener("keydown", deleteSelected);
  }, [onCommit, onSelectedChange, selected, working]);

  const size = useMemo(() => courtDimensions(play.court), [play.court]);

  function pointFromEvent(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * size.width,
      y: ((event.clientY - bounds.top) / bounds.height) * size.height
    };
  }

  function commit(next, nextSelection = selected) {
    workingRef.current = next;
    setWorking(next);
    onSelectedChange(nextSelection);
    onCommit(next);
  }

  function addPointObject(kind, point) {
    const id = newId();
    const base = {
      id,
      trackId: id,
      kind,
      x: point.x,
      y: point.y,
      color: drawingColor,
      scale: 100
    };
    const object =
      kind === "player"
        ? {
            ...base,
            label: playerConfig.label,
            role: playerConfig.role,
            hasBall: playerConfig.hasBall,
            color: playerConfig.color || drawingColor,
            borderColor: playerConfig.borderColor || "#10243a",
            teamId: playerConfig.teamId || "",
            playerId: playerConfig.playerId || ""
          }
        : base;
    commit(
      { ...working, objects: [...working.objects, object] },
      { type: "object", id }
    );
  }

  function pointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    const hit = selectedHit(working.objects, working.actions, point);

    if (tool === "eraser") {
      if (!hit) return;
      const next = {
        objects:
          hit.type === "object"
            ? working.objects.filter((object) => object.id !== hit.item.id)
            : working.objects,
        actions:
          hit.type === "action"
            ? working.actions.filter((action) => action.id !== hit.item.id)
            : working.actions
      };
      commit(next, null);
      return;
    }

    if (tool === "select") {
      if (!hit) {
        onSelectedChange(null);
        return;
      }
      onSelectedChange({ type: hit.type, id: hit.item.id });
      gestureRef.current = {
        type: "move",
        itemType: hit.type,
        id: hit.item.id,
        start: point,
        original: { ...hit.item }
      };
      return;
    }

    if (["player", "ball", "cone", "hoop"].includes(tool)) {
      addPointObject(tool, point);
      return;
    }

    if (tool === "text") {
      const text = window.prompt("Texto sobre la pista");
      if (!text?.trim()) return;
      const id = newId();
      commit(
        {
          ...working,
          objects: [
            ...working.objects,
            {
              id,
              trackId: id,
              kind: "text",
              text: text.trim(),
              x: point.x,
              y: point.y,
              color: drawingColor,
              fontSize: 24,
              scale: 100
            }
          ]
        },
        { type: "object", id }
      );
      return;
    }

    if (dragObjectTools.has(tool) || actionIds.has(tool)) {
      const actor =
        hit?.type === "object" && hit.item.kind === "player" ? hit.item : null;
      gestureRef.current = {
        type: "draw",
        kind: tool,
        start: actor ? { x: actor.x, y: actor.y } : point,
        actor
      };
      const value = {
        id: "draft",
        kind: tool,
        x1: actor ? actor.x : point.x,
        y1: actor ? actor.y : point.y,
        x2: point.x,
        y2: point.y,
        color:
          ACTION_TYPES.find((item) => item.id === tool)?.color || drawingColor
      };
      setDraft({
        type: actionIds.has(tool) ? "action" : "object",
        value
      });
    }
  }

  function pointerMove(event) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const point = pointFromEvent(event);
    if (gesture.type === "move") {
      const deltaX = point.x - gesture.start.x;
      const deltaY = point.y - gesture.start.y;
      if (gesture.itemType === "object") {
        setWorking((current) => {
          const next = {
            ...current,
            objects: current.objects.map((object) =>
              object.id === gesture.id
                ? moveItem(gesture.original, deltaX, deltaY)
                : object
            )
          };
          workingRef.current = next;
          return next;
        });
      } else {
        setWorking((current) => {
          const next = {
            ...current,
            actions: current.actions.map((action) =>
              action.id === gesture.id
                ? moveItem(gesture.original, deltaX, deltaY)
                : action
            )
          };
          workingRef.current = next;
          return next;
        });
      }
      return;
    }
    setDraft((current) =>
      current
        ? {
            ...current,
            value: {
              ...current.value,
              x2: point.x,
              y2: point.y
            }
          }
        : current
    );
  }

  function pointerUp(event) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const point = pointFromEvent(event);
    if (gesture.type === "move") {
      gestureRef.current = null;
      onCommit(workingRef.current);
      return;
    }

    const start = gesture.start;
    const distance = Math.hypot(point.x - start.x, point.y - start.y);
    gestureRef.current = null;
    setDraft(null);
    if (distance < 8) return;

    const id = newId();
    if (actionIds.has(gesture.kind)) {
      const targetHit = hitObject(working.objects, point);
      const target = targetHit?.kind === "player" ? targetHit : null;
      const lastEnd = working.actions.reduce(
        (maximum, action) => Math.max(maximum, actionEndTime(action)),
        0
      );
      const action = {
        id,
        kind: gesture.kind,
        order: working.actions.length,
        delay: Math.round(lastEnd * 10) / 10,
        duration: 1.2,
        actorId: gesture.actor?.id || "",
        actorTrackId: gesture.actor?.trackId || gesture.actor?.id || "",
        targetId: target?.id || "",
        targetTrackId: target?.trackId || target?.id || "",
        x1: start.x,
        y1: start.y,
        x2: target ? target.x : point.x,
        y2: target ? target.y : point.y,
        color:
          ACTION_TYPES.find((item) => item.id === gesture.kind)?.color ||
          drawingColor
      };
      commit(
        { ...working, actions: [...working.actions, action] },
        { type: "action", id }
      );
      return;
    }

    const object = {
      id,
      trackId: id,
      kind: gesture.kind,
      x1: start.x,
      y1: start.y,
      x2: point.x,
      y2: point.y,
      color: drawingColor,
      fillColor: drawingColor,
      opacity: 0.32,
      width: gesture.kind === "line" || gesture.kind === "arrow" ? 6 : 3,
      scale: 100
    };
    commit(
      { ...working, objects: [...working.objects, object] },
      { type: "object", id }
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size.width}
      height={size.height}
      className={`playbook-canvas playbook-v2-canvas tool-${tool}`}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={() => {
        gestureRef.current = null;
        setDraft(null);
        setWorking({
          objects: phase.objects || [],
          actions: phase.actions || []
        });
        workingRef.current = {
          objects: phase.objects || [],
          actions: phase.actions || []
        };
      }}
      aria-label={`Editor de ${play.court === "half" ? "media pista" : "pista completa"}`}
    />
  );
}
