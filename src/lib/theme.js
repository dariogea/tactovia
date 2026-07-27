export const themeStorageKey = "scout-analyzer-theme-v1";

export const themeOptions = [
  { id: "system", label: "Automático", shortLabel: "Auto", icon: "◐" },
  { id: "light", label: "Claro", shortLabel: "Claro", icon: "☼" },
  { id: "dark", label: "Oscuro", shortLabel: "Oscuro", icon: "☾" }
];

export function normalizeThemeMode(value) {
  return themeOptions.some((option) => option.id === value) ? value : "system";
}

export function resolveThemeMode(mode, prefersDark) {
  const normalized = normalizeThemeMode(mode);
  return normalized === "system" ? (prefersDark ? "dark" : "light") : normalized;
}
