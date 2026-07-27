import { themeOptions } from "../lib/theme.js";

export function ThemeSelector({ value, onChange, compact = false }) {
  return (
    <div
      className={`theme-selector ${compact ? "compact" : ""}`}
      role="group"
      aria-label="Tema de la aplicación"
    >
      {themeOptions.map((option) => (
        <button
          type="button"
          key={option.id}
          className={value === option.id ? "active" : ""}
          aria-pressed={value === option.id}
          title={option.label}
          onClick={() => onChange(option.id)}
        >
          <span aria-hidden="true">{option.icon}</span>
          <small>{compact ? option.shortLabel : option.label}</small>
        </button>
      ))}
    </div>
  );
}
