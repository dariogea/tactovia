export function PlayerJersey({
  player,
  team,
  selected = false,
  compact = false,
  onClick,
  disabled = false,
  title
}) {
  const Tag = onClick ? "button" : "span";
  const number = String(player?.number || "—");
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={[
        "player-jersey",
        selected ? "selected" : "",
        compact ? "compact" : ""
      ].filter(Boolean).join(" ")}
      style={{
        "--jersey-primary": team?.primaryColor || "#08756D",
        "--jersey-secondary": team?.secondaryColor || "#BDEB62"
      }}
      onClick={onClick}
      disabled={disabled}
      title={title || `${number} · ${player?.name || "Jugador"}`}
      aria-pressed={onClick ? selected : undefined}
    >
      <span className="jersey-shape" aria-hidden="true">
        <i />
        <strong>{number}</strong>
      </span>
      {!compact && (
        <span className="jersey-player-name">
          <strong>{player?.name || "Jugador"}</strong>
          <small>{player?.position || "Sin posición"}</small>
        </span>
      )}
    </Tag>
  );
}
