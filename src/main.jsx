import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import {
  normalizePaletteMode,
  normalizeThemeMode,
  paletteStorageKey,
  resolveThemeMode,
  themeStorageKey
} from "./lib/theme.js";
import "./styles.css";

try {
  const themeMode = normalizeThemeMode(localStorage.getItem(themeStorageKey));
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
  const resolvedTheme = resolveThemeMode(themeMode, prefersDark);
  const paletteMode = normalizePaletteMode(localStorage.getItem(paletteStorageKey));
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themePreference = themeMode;
  document.documentElement.dataset.palette = paletteMode;
  document.documentElement.style.colorScheme = resolvedTheme;
} catch {
  document.documentElement.dataset.theme = "dark";
  document.documentElement.dataset.palette = "tactovia";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator && !window.scoutDesktop) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // La web sigue funcionando aunque el navegador bloquee el modo sin conexión.
    });
  });
}
