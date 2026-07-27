export const themeStorageKey = "scout-analyzer-theme-v1";
export const paletteStorageKey = "scout-analyzer-palette-v1";

export const brandColors = {
  gameInk: "#0B1218",
  strategicTeal: "#08756D",
  signalLime: "#BDEB62",
  analysisWhite: "#F4F7F5",
  slate: "#64717C"
};

export const themeOptions = [
  { id: "system", label: "Automático", shortLabel: "Auto", icon: "◐" },
  { id: "light", label: "Claro", shortLabel: "Claro", icon: "☼" },
  { id: "dark", label: "Oscuro", shortLabel: "Oscuro", icon: "☾" }
];

export const paletteOptions = [
  {
    id: "tactovia",
    label: "Tactovia",
    description: "Claridad estratégica con señal lima reservada para la acción",
    colors: [
      brandColors.gameInk,
      brandColors.strategicTeal,
      brandColors.signalLime,
      brandColors.analysisWhite
    ]
  }
];

export function normalizeThemeMode(value) {
  return themeOptions.some((option) => option.id === value) ? value : "system";
}

export function normalizePaletteMode(value) {
  return "tactovia";
}

export function resolveThemeMode(mode, prefersDark) {
  const normalized = normalizeThemeMode(mode);
  return normalized === "system" ? (prefersDark ? "dark" : "light") : normalized;
}
