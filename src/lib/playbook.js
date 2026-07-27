export const DEFAULT_COURT_STYLE = {
  background: "#e8bf87",
  outOfBounds: "#e8bf87",
  lines: "#ffffff",
  paint: "#e8bf87",
  accent: "#0f9d8f",
  lineWidth: 3.5
};

const LEGACY_COURT_STYLE = {
  background: "#c98f55",
  outOfBounds: "#102133",
  paint: "#b9783e",
  accent: "#ff6b35",
  lineWidth: 3
};

export const DEFAULT_OUTPUT_SETTINGS = {
  mode: "classic",
  layout: "large-grid",
  showDescription: true,
  showAnimationButton: true,
  showPhaseTitles: true,
  showPhaseDescription: true,
  showNotes: true,
  showAttachments: true,
  courtColor: "",
  outOfBoundsSpacing: 14,
  objectScale: 100,
  blocks: [
    { id: "block-description", type: "description", title: "Descripción" },
    { id: "block-phases", type: "phases", title: "Fases" },
    { id: "block-notes", type: "notes", title: "Notas" }
  ]
};

export const ACTION_TYPES = [
  { id: "dribble", label: "Bote", color: "#f59e0b" },
  { id: "pass", label: "Pase", color: "#38bdf8" },
  { id: "cut", label: "Corte", color: "#22c55e" },
  { id: "screen", label: "Bloqueo", color: "#a78bfa" },
  { id: "shot", label: "Tiro", color: "#fb7185" },
  { id: "handoff", label: "Mano a mano", color: "#f97316" }
];

export const PLAYBOOK_TEMPLATES = [
  { id: "empty", label: "Vacía", group: "General" },
  { id: "traditional", label: "Tradicional", group: "General" },
  { id: "five-out", label: "5 abiertos", group: "Ataque" },
  { id: "princeton", label: "Princeton", group: "Ataque" },
  { id: "box", label: "Box", group: "Ataque" },
  { id: "one-four-low", label: "1-4 bajo", group: "Ataque" },
  { id: "horns", label: "Horns", group: "Ataque" },
  { id: "one-four-high", label: "1-4 alto", group: "Ataque" },
  { id: "flex", label: "Flex", group: "Ataque" },
  { id: "zone-2-3", label: "Zona 2-3", group: "Defensa" },
  { id: "zone-3-2", label: "Zona 3-2", group: "Defensa" },
  { id: "zone-1-3-1", label: "Zona 1-3-1", group: "Defensa" }
];

export function courtDimensions(court = "half") {
  if (court === "full-vertical") return { width: 660, height: 1180 };
  if (court === "full") return { width: 1180, height: 660 };
  return { width: 760, height: 660 };
}

function newId() {
  return crypto.randomUUID();
}

function cloneOutputSettings(settings = {}) {
  return {
    ...DEFAULT_OUTPUT_SETTINGS,
    ...settings,
    blocks: (settings.blocks?.length
      ? settings.blocks
      : DEFAULT_OUTPUT_SETTINGS.blocks
    ).map((block) => ({ ...block, id: block.id || newId() }))
  };
}

function normalizeObject(object = {}) {
  const id = object.id || newId();
  return {
    ...object,
    id,
    trackId: object.trackId || id,
    kind: object.kind || "player",
    role: object.role || "offense",
    hasBall: Boolean(object.hasBall),
    scale: Number(object.scale) || 100
  };
}

function normalizeAction(action = {}, index = 0) {
  const type = ACTION_TYPES.some((item) => item.id === action.kind)
    ? action.kind
    : "cut";
  return {
    ...action,
    id: action.id || newId(),
    kind: type,
    order: Number.isFinite(Number(action.order)) ? Number(action.order) : index,
    delay: Math.max(0, Number(action.delay) || 0),
    duration: Math.max(0.2, Number(action.duration) || 1.2),
    color:
      action.color ||
      ACTION_TYPES.find((item) => item.id === type)?.color ||
      "#22c55e"
  };
}

export function createPlaybookPhase(
  name = "Fase 1",
  objects = [],
  options = {}
) {
  return {
    id: newId(),
    name,
    description: options.description || "",
    duration: Math.max(0.5, Number(options.duration) || 3),
    showTitle: options.showTitle !== false,
    objects: objects.map((object) => ({
      ...normalizeObject(object),
      id: newId(),
      trackId: object.trackId || object.id || newId()
    })),
    actions: (options.actions || []).map(normalizeAction),
    noteBlocks: (options.noteBlocks || []).map((block) => ({
      ...block,
      id: block.id || newId()
    })),
    attachments: (options.attachments || []).map((attachment) => ({
      ...attachment,
      id: attachment.id || newId()
    }))
  };
}

export function createPlaybookPlay(
  index = 1,
  folderId = "folder-general",
  templateId = "empty",
  court = "half"
) {
  const now = new Date().toISOString();
  const objects = createTemplateObjects(templateId, court);
  return {
    id: newId(),
    name: `Jugada ${index}`,
    folderId,
    teamId: "",
    court,
    templateId,
    description: "",
    notes: "",
    noteBlocks: [],
    attachments: [],
    updatedAt: now,
    savedAt: "",
    courtStyle: { ...DEFAULT_COURT_STYLE },
    outputSettings: cloneOutputSettings(),
    phases: [
      createPlaybookPhase("Fase 1", objects, {
        duration: 3,
        description: ""
      })
    ]
  };
}

export function createBlankPlaybook() {
  return {
    version: 3,
    folders: [
      {
        id: "folder-general",
        name: "General",
        teamId: ""
      }
    ],
    plays: [createPlaybookPlay()]
  };
}

function transposeLegacyHalfCourtItem(item) {
  const { width, height } = courtDimensions("half");
  const next = { ...item };
  if (
    Number.isFinite(Number(next.x)) &&
    Number.isFinite(Number(next.y))
  ) {
    const previousX = Number(next.x);
    const previousY = Number(next.y);
    next.x = (previousY / height) * width;
    next.y = (previousX / width) * height;
  }
  if (
    Number.isFinite(Number(next.x1)) &&
    Number.isFinite(Number(next.y1))
  ) {
    const previousX = Number(next.x1);
    const previousY = Number(next.y1);
    next.x1 = (previousY / height) * width;
    next.y1 = (previousX / width) * height;
  }
  if (
    Number.isFinite(Number(next.x2)) &&
    Number.isFinite(Number(next.y2))
  ) {
    const previousX = Number(next.x2);
    const previousY = Number(next.y2);
    next.x2 = (previousY / height) * width;
    next.y2 = (previousX / width) * height;
  }
  return next;
}

function transposeLegacyHalfCourtPhase(phase) {
  return {
    ...phase,
    objects: (phase.objects || []).map(transposeLegacyHalfCourtItem),
    actions: (phase.actions || []).map(transposeLegacyHalfCourtItem)
  };
}

function migrateCourtStyle(style = {}, updateLegacyDefaults = false) {
  const next = { ...DEFAULT_COURT_STYLE, ...style };
  if (!updateLegacyDefaults) return next;
  for (const key of Object.keys(LEGACY_COURT_STYLE)) {
    if (
      style[key] === undefined ||
      style[key] === LEGACY_COURT_STYLE[key]
    ) {
      next[key] = DEFAULT_COURT_STYLE[key];
    }
  }
  return next;
}

function normalizePhase(phase = {}, index = 0, legacyObjects = []) {
  const objects = (phase.objects || legacyObjects || []).map(normalizeObject);
  const actions = (phase.actions || []).map(normalizeAction);
  const longestAction = actions.reduce(
    (longest, action) => Math.max(longest, action.delay + action.duration),
    0
  );
  return {
    ...phase,
    id: phase.id || newId(),
    name: phase.name || `Fase ${index + 1}`,
    description: phase.description || "",
    duration: Math.max(
      0.5,
      Number(phase.duration) || Math.ceil(longestAction + 0.5) || 3
    ),
    showTitle: phase.showTitle !== false,
    objects,
    actions,
    noteBlocks: (phase.noteBlocks || []).map((block) => ({
      ...block,
      id: block.id || newId()
    })),
    attachments: (phase.attachments || []).map((attachment) => ({
      ...attachment,
      id: attachment.id || newId()
    }))
  };
}

export function migratePlaybook(playbook) {
  if (!playbook?.plays?.length) return createBlankPlaybook();
  const updateLegacyCourt = (Number(playbook.version) || 1) < 3;
  const folders = playbook.folders?.length
    ? playbook.folders.map((folder) => ({
        id: folder.id || newId(),
        name: folder.name || "Carpeta",
        teamId: folder.teamId || ""
      }))
    : [{ id: "folder-general", name: "General", teamId: "" }];
  return {
    version: 3,
    folders,
    plays: playbook.plays.map((play, index) => {
      const folderId = play.folderId || folders[0].id;
      const base = createPlaybookPlay(index + 1, folderId);
      const sourcePhases = play.phases?.length
        ? play.phases
        : [{ name: "Fase 1", objects: play.objects || [] }];
      const court = ["half", "full", "full-vertical"].includes(play.court)
        ? play.court
        : "half";
      const normalizedPhases = sourcePhases.map((phase, phaseIndex) =>
        normalizePhase(phase, phaseIndex, play.objects)
      );
      return {
        ...base,
        ...play,
        id: play.id || base.id,
        folderId,
        court,
        templateId: play.templateId || "empty",
        description: play.description || "",
        notes: play.notes || "",
        noteBlocks: (play.noteBlocks || []).map((block) => ({
          ...block,
          id: block.id || newId()
        })),
        attachments: (play.attachments || []).map((attachment) => ({
          ...attachment,
          id: attachment.id || newId()
        })),
        courtStyle: migrateCourtStyle(
          play.courtStyle,
          updateLegacyCourt
        ),
        outputSettings: cloneOutputSettings(play.outputSettings),
        phases:
          updateLegacyCourt && court === "half"
            ? normalizedPhases.map(transposeLegacyHalfCourtPhase)
            : normalizedPhases
      };
    })
  };
}

function player(label, x, y, options = {}) {
  const id = newId();
  return {
    id,
    trackId: id,
    kind: "player",
    label,
    x,
    y,
    role: options.role || "offense",
    hasBall: Boolean(options.hasBall),
    color:
      options.color ||
      (options.role === "defense" ? "#ef4444" : "#0f766e"),
    borderColor: options.borderColor || "#10243a",
    scale: 100
  };
}

function templatePositions(templateId) {
  const templates = {
    traditional: [
      [0.78, 0.5],
      [0.62, 0.18],
      [0.62, 0.82],
      [0.36, 0.28],
      [0.36, 0.72]
    ],
    "five-out": [
      [0.82, 0.5],
      [0.64, 0.14],
      [0.64, 0.86],
      [0.36, 0.22],
      [0.36, 0.78]
    ],
    princeton: [
      [0.82, 0.5],
      [0.64, 0.2],
      [0.64, 0.8],
      [0.4, 0.32],
      [0.28, 0.5]
    ],
    box: [
      [0.82, 0.5],
      [0.55, 0.32],
      [0.55, 0.68],
      [0.34, 0.32],
      [0.34, 0.68]
    ],
    "one-four-low": [
      [0.82, 0.5],
      [0.34, 0.16],
      [0.34, 0.38],
      [0.34, 0.62],
      [0.34, 0.84]
    ],
    horns: [
      [0.84, 0.5],
      [0.62, 0.18],
      [0.62, 0.82],
      [0.48, 0.36],
      [0.48, 0.64]
    ],
    "one-four-high": [
      [0.84, 0.5],
      [0.54, 0.14],
      [0.54, 0.38],
      [0.54, 0.62],
      [0.54, 0.86]
    ],
    flex: [
      [0.7, 0.5],
      [0.5, 0.18],
      [0.5, 0.82],
      [0.34, 0.34],
      [0.34, 0.66]
    ]
  };
  return templates[templateId] || templates.traditional;
}

function defensePositions(templateId) {
  const templates = {
    "zone-2-3": [
      [0.58, 0.38],
      [0.58, 0.62],
      [0.34, 0.22],
      [0.3, 0.5],
      [0.34, 0.78]
    ],
    "zone-3-2": [
      [0.58, 0.23],
      [0.62, 0.5],
      [0.58, 0.77],
      [0.33, 0.34],
      [0.33, 0.66]
    ],
    "zone-1-3-1": [
      [0.66, 0.5],
      [0.46, 0.22],
      [0.48, 0.5],
      [0.46, 0.78],
      [0.27, 0.5]
    ]
  };
  return templates[templateId] || [];
}

function mapTemplatePoint(point, court) {
  const { width, height } = courtDimensions(court);
  if (court === "half") {
    return {
      x: 40 + point[1] * (width - 80),
      y: 35 + point[0] * (height - 70)
    };
  }
  const vertical = court === "full-vertical";
  const usableWidth = vertical ? width - 70 : width - 80;
  const usableHeight = vertical ? height / 2 - 50 : height - 70;
  const x = 35 + point[0] * usableWidth;
  const y = vertical
    ? height / 2 + 25 + point[1] * usableHeight
    : 35 + point[1] * usableHeight;
  return { x, y };
}

export function createTemplateObjects(templateId = "empty", court = "half") {
  if (templateId === "empty") return [];
  const defense = defensePositions(templateId);
  if (defense.length) {
    return defense.map((point, index) => {
      const position = mapTemplatePoint(point, court);
      return player(`X${index + 1}`, position.x, position.y, {
        role: "defense",
        color: "#dc3545"
      });
    });
  }
  const offense = templatePositions(templateId);
  const objects = offense.map((point, index) => {
    const position = mapTemplatePoint(point, court);
    return player(String(index + 1), position.x, position.y, {
      role: "offense",
      hasBall: index === 0
    });
  });
  if (templateId === "traditional") {
    const defenders = offense.map((point, index) => {
      const shifted = [Math.max(0.18, point[0] - 0.08), point[1]];
      const position = mapTemplatePoint(shifted, court);
      return player(`X${index + 1}`, position.x, position.y, {
        role: "defense",
        color: "#dc3545"
      });
    });
    return [...objects, ...defenders];
  }
  return objects;
}

function copyObjectForNextPhase(object) {
  return {
    ...object,
    id: newId(),
    trackId: object.trackId || object.id
  };
}

export function generateNextPhase(phase, name = "") {
  const objects = (phase.objects || []).map(copyObjectForNextPhase);
  const sortedActions = [...(phase.actions || [])].sort(
    (left, right) => left.order - right.order
  );
  for (const action of sortedActions) {
    const actor = objects.find(
      (object) =>
        (object.trackId || object.id) === action.actorTrackId ||
        object.id === action.actorId
    );
    const target = objects.find(
      (object) =>
        (object.trackId || object.id) === action.targetTrackId ||
        object.id === action.targetId
    );
    if (
      actor &&
      ["dribble", "cut", "screen", "handoff"].includes(action.kind)
    ) {
      actor.x = Number(action.x2) || actor.x;
      actor.y = Number(action.y2) || actor.y;
    }
    if (action.kind === "pass" || action.kind === "handoff") {
      if (actor) actor.hasBall = false;
      if (target) target.hasBall = true;
    }
    if (action.kind === "shot" && actor) actor.hasBall = false;
    const looseBall = objects.find((object) => object.kind === "ball");
    if (looseBall && ["pass", "shot"].includes(action.kind)) {
      looseBall.x = Number(action.x2) || looseBall.x;
      looseBall.y = Number(action.y2) || looseBall.y;
    }
  }
  return createPlaybookPhase(name || `${phase.name} · siguiente`, objects, {
    description: "",
    duration: Math.max(2, Number(phase.duration) || 3)
  });
}

function mirrorPoint(value, maximum) {
  return Math.max(0, maximum - Number(value || 0));
}

export function mirrorPhase(phase, court = "half") {
  const { width, height } = courtDimensions(court);
  const vertical = court === "full-vertical";
  const mirrorObject = (object) => {
    const next = { ...object };
    if (vertical) {
      if (Number.isFinite(Number(next.y))) next.y = mirrorPoint(next.y, height);
      if (Number.isFinite(Number(next.y1))) next.y1 = mirrorPoint(next.y1, height);
      if (Number.isFinite(Number(next.y2))) next.y2 = mirrorPoint(next.y2, height);
    } else {
      if (Number.isFinite(Number(next.x))) next.x = mirrorPoint(next.x, width);
      if (Number.isFinite(Number(next.x1))) next.x1 = mirrorPoint(next.x1, width);
      if (Number.isFinite(Number(next.x2))) next.x2 = mirrorPoint(next.x2, width);
    }
    return next;
  };
  return {
    ...phase,
    objects: (phase.objects || []).map(mirrorObject),
    actions: (phase.actions || []).map(mirrorObject)
  };
}

export function actionEndTime(action) {
  return Math.max(0, Number(action.delay) || 0) +
    Math.max(0.2, Number(action.duration) || 1.2);
}

export function phaseMinimumDuration(phase) {
  return Math.max(
    1,
    ...(phase.actions || []).map((action) => actionEndTime(action) + 0.35)
  );
}

export function actionLabel(kind) {
  return ACTION_TYPES.find((item) => item.id === kind)?.label || "Acción";
}
