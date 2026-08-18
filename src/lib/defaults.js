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
    color: "#0F9F75",
    mode: "point",
    shortcut: "1",
    before: 5,
    after: 3
  },
  {
    id: "tag-shot-made-3",
    name: "Canasta de 3P",
    color: "#08756D",
    mode: "point",
    shortcut: "2",
    before: 5,
    after: 3
  },
  {
    id: "tag-shot-missed-2",
    name: "Tiro fallado de 2P",
    color: "#F97316",
    mode: "point",
    shortcut: "3",
    before: 5,
    after: 3
  },
  {
    id: "tag-shot-missed-3",
    name: "Tiro fallado de 3P",
    color: "#E5484D",
    mode: "point",
    shortcut: "4",
    before: 5,
    after: 3
  },
  {
    id: "tag-off-rebound",
    name: "Rebote ofensivo",
    color: "#F2B84B",
    mode: "point",
    shortcut: "5",
    before: 4,
    after: 3
  },
  {
    id: "tag-def-rebound",
    name: "Rebote defensivo",
    color: "#3B82F6",
    mode: "point",
    shortcut: "6",
    before: 4,
    after: 3
  },
  {
    id: "tag-turnover",
    name: "Pérdida",
    color: "#E5484D",
    mode: "point",
    shortcut: "7",
    before: 6,
    after: 3
  },
  {
    id: "tag-steal",
    name: "Recuperación",
    color: "#10B981",
    mode: "point",
    shortcut: "8",
    before: 5,
    after: 3
  },
  {
    id: "tag-pick-roll",
    name: "Pick & Roll",
    color: "#8B5CF6",
    mode: "interval",
    shortcut: "9",
    before: 1,
    after: 1
  },
  {
    id: "tag-transition",
    name: "Transición",
    color: "#06B6D4",
    mode: "interval",
    shortcut: "0",
    before: 1,
    after: 1
  },
  {
    id: "tag-possession",
    name: "Posesión",
    color: "#64748B",
    mode: "interval",
    shortcut: "P",
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
    tagButtonSize: "medium",
    shotCourtVisible: false,
    shotCourtLabels: true,
    shotCourtPosition: "above",
    liveModules: ["actions", "tagTypes", "players", "shooting", "latest"]
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

export function createBlankProject(teams = defaultTeams) {
  const now = new Date().toISOString();
  return {
    version: 10,
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
    competitions: [],
    libraryFolders: [],
    freeAgents: [],
    match: null,
    events: []
  };
}
