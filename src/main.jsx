import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import {
  normalizeThemeMode,
  resolveThemeMode,
  themeStorageKey
} from "./lib/theme.js";
import "./styles.css";

try {
  const themeMode = normalizeThemeMode(localStorage.getItem(themeStorageKey));
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
  const resolvedTheme = resolveThemeMode(themeMode, prefersDark);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themePreference = themeMode;
  document.documentElement.style.colorScheme = resolvedTheme;
} catch {
  document.documentElement.dataset.theme = "dark";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
