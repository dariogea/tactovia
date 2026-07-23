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

