export const themeStorageKey = "scout-analyzer-theme-v1";
export const paletteStorageKey = "scout-analyzer-palette-v1";

export const themeOptions = [
  { id: "system", label: "Automático", shortLabel: "Auto", icon: "◐" },
  { id: "light", label: "Claro", shortLabel: "Claro", icon: "☼" },
  { id: "dark", label: "Oscuro", shortLabel: "Oscuro", icon: "☾" }
];

export const paletteOptions = [
  {
    id: "arena",
    label: "Arena",
    description: "Naranja competitivo y verde técnico",
    colors: ["#ff6842", "#37cfbe", "#f4b942"]
  },
  {
    id: "ocean",
    label: "Océano",
    description: "Azul profundo y cian para análisis",
    colors: ["#3b82f6", "#22d3ee", "#8b5cf6"]
  },
  {
    id: "forest",
    label: "Bosque",
    description: "Verde deportivo y dorado cálido",
    colors: ["#16a34a", "#d6a329", "#2dd4bf"]
  },
  {
    id: "violet",
    label: "Violeta",
    description: "Morado editorial y rosa de contraste",
    colors: ["#8b5cf6", "#ec4899", "#38bdf8"]
  }
];

export function normalizeThemeMode(value) {
  return themeOptions.some((option) => option.id === value) ? value : "system";
}

export function normalizePaletteMode(value) {
  return paletteOptions.some((option) => option.id === value) ? value : "arena";
}

export function resolveThemeMode(mode, prefersDark) {
  const normalized = normalizeThemeMode(mode);
  return normalized === "system" ? (prefersDark ? "dark" : "light") : normalized;
}
