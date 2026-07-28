export function playerNumberValue(player) {
  const value = Number.parseInt(String(player?.number ?? ""), 10);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

export function sortPlayersByNumber(players = []) {
  return players.slice().sort(
    (left, right) =>
      playerNumberValue(left) - playerNumberValue(right) ||
      String(left.name || "").localeCompare(String(right.name || ""), "es", {
        sensitivity: "base"
      })
  );
}

export function createTeamDraft(name = "Nuevo equipo") {
  return {
    id: crypto.randomUUID(),
    name,
    shortName: "EQU",
    primaryColor: "#2DD4BF",
    secondaryColor: "#0F766E",
    logo: "",
    clubName: "",
    category: "",
    season: "",
    competitionId: "",
    country: "",
    city: "",
    arena: "",
    coach: "",
    assistantCoach: "",
    website: "",
    founded: "",
    notes: "",
    players: []
  };
}

export function createPlayerDraft() {
  return {
    id: crypto.randomUUID(),
    number: "",
    name: "Nuevo jugador",
    photo: "",
    position: "",
    secondaryPosition: "",
    height: "",
    weight: "",
    wingspan: "",
    birthDate: "",
    nationality: "",
    dominantHand: "",
    role: "",
    status: "Activo",
    email: "",
    phone: "",
    notes: ""
  };
}

export function enrichTeam(team) {
  return {
    ...createTeamDraft(team?.name || "Equipo"),
    ...team,
    players: (team?.players || []).map((player) => ({
      ...createPlayerDraft(),
      ...player
    }))
  };
}

const templateNames = [
  ["Plantilla completa", 12, "#08756D", "#BDEB62"],
  ["Rotación principal", 10, "#2563EB", "#DBEAFE"],
  ["Convocatoria corta", 8, "#7C3AED", "#EDE9FE"],
  ["Quinteto inicial", 5, "#EA580C", "#FFEDD5"]
];

const playerNames = [
  "Álex Martín",
  "Hugo Sánchez",
  "Pablo Romero",
  "Leo Navarro",
  "Marcos Vidal",
  "Daniel Ortega",
  "Adrián Molina",
  "Sergio León",
  "Iván Torres",
  "Mario Cano",
  "Lucas Ríos",
  "Javier Costa"
];

export const teamTemplates = templateNames.map(
  ([name, size, primaryColor, secondaryColor], templateIndex) => ({
    id: `team-template-${size}`,
    name,
    size,
    primaryColor,
    secondaryColor,
    create() {
      const team = createTeamDraft(`Equipo ${templateIndex + 1}`);
      return {
        ...team,
        shortName: `EQ${templateIndex + 1}`,
        primaryColor,
        secondaryColor,
        players: Array.from({ length: size }, (_, index) => ({
          ...createPlayerDraft(),
          id: crypto.randomUUID(),
          number: String(index + 4),
          name: playerNames[index],
          position: ["Base", "Escolta", "Alero", "Ala-pívot", "Pívot"][index % 5]
        }))
      };
    }
  })
);

export function createRosterPlayers(count = 5) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    ...createPlayerDraft(),
    id: crypto.randomUUID(),
    number: String(index + 4),
    name: playerNames[index % playerNames.length],
    position: ["Base", "Escolta", "Alero", "Ala-pívot", "Pívot"][index % 5]
  }));
}
