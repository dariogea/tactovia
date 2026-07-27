import { createBlankPlaybook } from "./playbook.js";

export const tagPalette = [
  "#FF6B35",
  "#2DD4BF",
  "#60A5FA",
  "#FBBF24",
  "#A78BFA",
  "#F472B6",
  "#34D399",
  "#FB7185",
  "#38BDF8",
  "#C084FC"
];

export const defaultTags = [
  {
    id: "tag-shot-made-2",
    name: "Canasta de 2P",
    color: "#2DD4BF",
    mode: "point",
    shortcut: "1",
    before: 5,
    after: 3
  },
  {
    id: "tag-shot-made-3",
    name: "Canasta de 3P",
    color: "#60A5FA",
    mode: "point",
    shortcut: "2",
    before: 5,
    after: 3
  },
  {
    id: "tag-shot-missed",
    name: "Tiro fallado",
    color: "#FF6B35",
    mode: "point",
    shortcut: "3",
    before: 5,
    after: 3
  },
  {
    id: "tag-off-rebound",
    name: "Rebote ofensivo",
    color: "#FBBF24",
    mode: "point",
    shortcut: "4",
    before: 4,
    after: 3
  },
  {
    id: "tag-def-rebound",
    name: "Rebote defensivo",
    color: "#60A5FA",
    mode: "point",
    shortcut: "5",
    before: 4,
    after: 3
  },
  {
    id: "tag-turnover",
    name: "Pérdida",
    color: "#FB7185",
    mode: "point",
    shortcut: "6",
    before: 6,
    after: 3
  },
  {
    id: "tag-steal",
    name: "Recuperación",
    color: "#34D399",
    mode: "point",
    shortcut: "7",
    before: 5,
    after: 3
  },
  {
    id: "tag-pick-roll",
    name: "Pick & Roll",
    color: "#A78BFA",
    mode: "interval",
    shortcut: "8",
    before: 1,
    after: 1
  },
  {
    id: "tag-transition",
    name: "Transición",
    color: "#38BDF8",
    mode: "interval",
    shortcut: "9",
    before: 1,
    after: 1
  },
  {
    id: "tag-possession",
    name: "Posesión",
    color: "#C084FC",
    mode: "interval",
    shortcut: "0",
    before: 0,
    after: 0
  }
];

export const emptyContext = {
  teamId: "",
  playerId: "",
  notes: "",
  shotZoneId: ""
};

export const defaultTeams = [
  {
    id: "team-own",
    name: "Mi equipo",
    shortName: "PRO",
    primaryColor: "#2DD4BF",
    secondaryColor: "#0F766E",
    logo: "",
    clubName: "",
    category: "",
    season: "",
    country: "",
    city: "",
    arena: "",
    coach: "",
    assistantCoach: "",
    website: "",
    founded: "",
    notes: "",
    players: []
  },
  {
    id: "team-rival",
    name: "Rival",
    shortName: "RIV",
    primaryColor: "#FF6B35",
    secondaryColor: "#9A3412",
    logo: "",
    clubName: "",
    category: "",
    season: "",
    country: "",
    city: "",
    arena: "",
    coach: "",
    assistantCoach: "",
    website: "",
    founded: "",
    notes: "",
    players: []
  }
];

export const defaultPreferences = {
  layout: {
    tagPanelWidth: 430,
    videoHeight: 520,
    tagColumns: 2,
    tagButtonHeight: 68,
    workspaceSize: "medium",
    tagButtonSize: "medium"
  },
  playback: {
    smallStep: 1,
    mediumStep: 10,
    largeStep: 15,
    frameRate: 25,
    visibleControls: [
      "backMedium",
      "playPause",
      "forwardMedium"
    ]
  },
  shortcuts: {
    playPause: "Space",
    backMedium: "ArrowLeft",
    forwardMedium: "ArrowRight",
    backLarge: "Shift+ArrowLeft",
    forwardLarge: "Shift+ArrowRight",
    backSmall: "Alt+ArrowLeft",
    forwardSmall: "Alt+ArrowRight",
    previousFrame: ",",
    nextFrame: ".",
    slower: "[",
    faster: "]",
    normalSpeed: "\\",
    speed2: "Q",
    speed4: "W",
    speed8: "E",
    speed16: "R",
    speedHalf: "H",
    mute: "M",
    volumeDown: "-",
    volumeUp: "=",
    previousEvent: "PageUp",
    nextEvent: "PageDown",
    videoStart: "Home",
    videoEnd: "End"
  }
};

export {
  createBlankPlaybook,
  createPlaybookPhase,
  createPlaybookPlay
} from "./playbook.js";

export function createBlankProject(teams = defaultTeams) {
  const now = new Date().toISOString();
  return {
    version: 7,
    id: crypto.randomUUID(),
    projectName: "Nuevo análisis",
    createdAt: now,
    updatedAt: now,
    video: null,
    template: {
      name: "Plantilla de baloncesto",
      tags: defaultTags.map((tag) => ({ ...tag }))
    },
    teams: teams.map((team) => ({
      ...team,
      players: (team.players || []).map((player) => ({ ...player }))
    })),
    match: null,
    playbook: createBlankPlaybook(),
    events: []
  };
}
