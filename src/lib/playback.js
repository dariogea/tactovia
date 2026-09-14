export const playbackControls = [
  { id: "backLarge", label: "− salto largo" },
  { id: "backMedium", label: "− salto medio" },
  { id: "backSmall", label: "− salto corto" },
  { id: "previousFrame", label: "− fotograma" },
  { id: "playPause", label: "Reproducir / pausar" },
  { id: "nextFrame", label: "+ fotograma" },
  { id: "forwardSmall", label: "+ salto corto" },
  { id: "forwardMedium", label: "+ salto medio" },
  { id: "forwardLarge", label: "+ salto largo" },
  { id: "slower", label: "Reducir velocidad" },
  { id: "normalSpeed", label: "Velocidad normal" },
  { id: "faster", label: "Aumentar velocidad" },
  { id: "speed2", label: "Velocidad ×2" },
  { id: "speed4", label: "Velocidad ×4" },
  { id: "speed8", label: "Velocidad ×8" },
  { id: "speed16", label: "Velocidad ×16" },
  { id: "speedHalf", label: "Velocidad ×0,5" },
  { id: "mute", label: "Silenciar / activar sonido" },
  { id: "volumeDown", label: "Bajar volumen" },
  { id: "volumeUp", label: "Subir volumen" },
  { id: "previousEvent", label: "Evento anterior" },
  { id: "nextEvent", label: "Evento siguiente" },
  { id: "videoStart", label: "Inicio del vídeo" },
  { id: "videoEnd", label: "Final del vídeo" },
];

export const shortcutActions = playbackControls.map((control) => ({
  id: control.id,
  label: control.label,
}));

export const playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.5, 2, 4, 8, 16];

export function displayShortcut(value = "") {
  const names = {
    Meta: "⌘",
    Ctrl: "Ctrl",
    Shift: "Mayús",
    Alt: "Alt",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    Space: "Espacio",
    PageUp: "Re Pág",
    PageDown: "Av Pág",
    Home: "Inicio",
    End: "Fin",
    Escape: "Esc",
    Enter: "Intro",
  };
  return value
    .split("+")
    .map((key) => names[key] || key)
    .join(" + ");
}

export function eventToShortcut(event) {
  const modifiers = [];
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.metaKey) modifiers.push("Meta");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");

  let key = event.key;
  if (key === " ") key = "Space";
  if (key.length === 1 && /[a-z]/i.test(key)) key = key.toUpperCase();
  if (["Control", "Meta", "Alt", "Shift"].includes(key)) return "";
  return [...modifiers, key].join("+");
}

export function shortcutMatches(event, shortcut) {
  return Boolean(shortcut) && eventToShortcut(event) === shortcut;
}

export function nextPlaybackSpeed(current, direction) {
  if (direction > 0) {
    return playbackSpeeds.find((speed) => speed > current + 0.001) || 16;
  }
  return (
    playbackSpeeds
      .slice()
      .reverse()
      .find((speed) => speed < current - 0.001) || 0.25
  );
}
