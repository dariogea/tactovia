export const themeStorageKey = "scout-analyzer-theme-v1";
export const paletteStorageKey = "scout-analyzer-palette-v1";

export const brandColors = {
  gameInk: "#0B1218",
  strategicTeal: "#08756D",
  signalLime: "#BDEB62",
  analysisWhite: "#F4F7F5",
  slate: "#64717C",
};

export const themeOptions = [
  { id: "system", label: "Automático", shortLabel: "Auto", icon: "◐" },
  { id: "light", label: "Claro", shortLabel: "Claro", icon: "☼" },
  { id: "dark", label: "Oscuro", shortLabel: "Oscuro", icon: "☾" },
];

export const paletteOptions = [
  {
    id: "tactovia",
    label: "Tactovia",
    description: "Contraste sereno con acentos de verde estratégico",
    colors: [
      brandColors.gameInk,
      brandColors.strategicTeal,
      brandColors.signalLime,
      brandColors.analysisWhite,
    ],
  },
  {
    id: "arena",
    label: "Arena",
    description: "Madera cálida, naranja táctico y superficies marfil",
    colors: ["#19130F", "#B45309", "#FDBA74", "#FFF8ED"],
  },
  {
    id: "ocean",
    label: "Océano",
    description: "Azul profundo, turquesa y contraste sereno",
    colors: ["#081624", "#0369A1", "#22D3EE", "#F2F8FC"],
  },
  {
    id: "graphite",
    label: "Grafito",
    description: "Neutros deportivos con acento eléctrico",
    colors: ["#111318", "#4B5563", "#A3E635", "#F5F6F8"],
  },
];

export function normalizeThemeMode(value) {
  return themeOptions.some((option) => option.id === value) ? value : "system";
}

export function normalizePaletteMode(value) {
  return paletteOptions.some((option) => option.id === value)
    ? value
    : "tactovia";
}

export function resolveThemeMode(mode, prefersDark) {
  const normalized = normalizeThemeMode(mode);
  return normalized === "system"
    ? prefersDark
      ? "dark"
      : "light"
    : normalized;
}
