import { useEffect, useMemo, useRef, useState } from "react";
import { EventEditor } from "./components/EventEditor.jsx";
import { ExportClipsModal } from "./components/ExportClipsModal.jsx";
import { MatchSetup } from "./components/MatchSetup.jsx";
import { Playbook } from "./components/Playbook.jsx";
import { RosterManager } from "./components/RosterManager.jsx";
import { SettingsPanel } from "./components/SettingsPanel.jsx";
import { StatsPanel } from "./components/StatsPanel.jsx";
import { TagEditor } from "./components/TagEditor.jsx";
import { Timeline } from "./components/Timeline.jsx";
import {
  clamp,
  createIntervalEvent,
  createPointEvent,
  formatTime,
  projectToCsv,
  reportPayload,
  statisticsFor
} from "./lib/analysis.js";
import {
  createBlankProject,
  defaultPreferences,
  defaultTeams,
  emptyContext
} from "./lib/defaults.js";
import { migratePlaybook } from "./lib/playbook.js";
import { enrichTeam, sortPlayersByNumber } from "./lib/roster.js";
import {
  eventToShortcut,
  nextPlaybackSpeed,
  playbackControls
} from "./lib/playback.js";

const desktop = window.scoutDesktop;
const appVersion = __APP_VERSION__;
const autosaveKey = "scout-analyzer-autosave-v1";
const preferencesKey = "scout-analyzer-preferences-v3";
const teamsLibraryKey = "scout-analyzer-teams-v1";

function migrateProject(project) {
  const teams =
    Array.isArray(project.teams) && project.teams.length > 0
      ? project.teams.map(enrichTeam)
      : defaultTeams.map(enrichTeam);
  const validMatch =
    project.match &&
    project.match.homeTeamId !== project.match.awayTeamId &&
    teams.some((team) => team.id === project.match.homeTeamId) &&
    teams.some((team) => team.id === project.match.awayTeamId)
      ? project.match
      : null;
  return {
    ...project,
    version: 5,
    teams,
    match: validMatch,
    playbook: migratePlaybook(project.playbook),
    events: (project.events || []).map((event) => {
      const { outcome, ...rest } = event;
      return {
        ...rest,
        teamId:
          event.teamId ||
          (event.team === "Rival" ? "team-rival" : event.team ? "team-own" : ""),
        playerId: event.playerId || "",
        notes: event.notes || outcome || ""
      };
    })
  };
}

function readTeamLibrary() {
  try {
    const stored = JSON.parse(localStorage.getItem(teamsLibraryKey));
    if (Array.isArray(stored) && stored.length > 0) return stored.map(enrichTeam);
  } catch {
    // The team library can always be reconstructed from the current project.
  }
  return defaultTeams.map(enrichTeam);
}

function hasValidMatch(project) {
  return Boolean(
    project.match &&
      project.match.homeTeamId !== project.match.awayTeamId &&
      project.teams.some((team) => team.id === project.match.homeTeamId) &&
      project.teams.some((team) => team.id === project.match.awayTeamId)
  );
}

function readAutosave() {
  try {
    const stored = JSON.parse(localStorage.getItem(autosaveKey));
    if (
      [1, 2, 3, 4, 5].includes(stored?.version) &&
      Array.isArray(stored.events) &&
      Array.isArray(stored.template?.tags)
    ) {
      return migrateProject(stored);
    }
  } catch {
    // A damaged autosave should never prevent the application from starting.
  }
  return createBlankProject(readTeamLibrary());
}

function readPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(preferencesKey));
    if (stored?.layout && stored?.playback && stored?.shortcuts) {
      return {
        layout: { ...defaultPreferences.layout, ...stored.layout },
        playback: { ...defaultPreferences.playback, ...stored.playback },
        shortcuts: { ...defaultPreferences.shortcuts, ...stored.shortcuts }
      };
    }
  } catch {
    // Invalid local preferences fall back to the defaults.
  }
  return structuredClone(defaultPreferences);
}

function App() {
  const [project, setProject] = useState(readAutosave);
  const [projectFilePath, setProjectFilePath] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [preferences, setPreferences] = useState(readPreferences);
  const [context, setContext] = useState({ ...emptyContext });
  const [activeIntervals, setActiveIntervals] = useState({});
  const [selectedEventIds, setSelectedEventIds] = useState(new Set());
  const [editingEvent, setEditingEvent] = useState(null);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showExportClips, setShowExportClips] = useState(false);
  const [activeView, setActiveView] = useState("tagging");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [dataExportFormat, setDataExportFormat] = useState("xlsx");
  const videoRef = useRef(null);
  const pendingSeekRef = useRef(null);
  const scrubbingRef = useRef(false);
  const noticeTimer = useRef(null);

  const matchTeams = useMemo(
    () =>
      hasValidMatch(project)
        ? [project.match.homeTeamId, project.match.awayTeamId]
            .map((id) => project.teams.find((team) => team.id === id))
            .filter(Boolean)
        : [],
    [project]
  );
  const selectedTeam = useMemo(
    () =>
      matchTeams.find((team) => team.id === context.teamId) ||
      matchTeams[0] ||
      null,
    [context.teamId, matchTeams]
  );
  const selectedPlayer = useMemo(
    () =>
      selectedTeam?.players?.find((player) => player.id === context.playerId) ||
      null,
    [selectedTeam, context.playerId]
  );
  const eventContext = useMemo(
    () => ({
      ...context,
      teamName: selectedTeam?.name || "",
      playerName: selectedPlayer
        ? [selectedPlayer.number ? `#${selectedPlayer.number}` : "", selectedPlayer.name]
            .filter(Boolean)
            .join(" ")
        : ""
    }),
    [context, selectedPlayer, selectedTeam]
  );

  const stats = useMemo(
    () => statisticsFor(project.template.tags, project.events),
    [project.template.tags, project.events]
  );

  function notify(message) {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 3200);
  }

  function updateProject(updater) {
    setProject((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...next, updatedAt: new Date().toISOString() };
    });
  }

  useEffect(() => {
    localStorage.setItem(autosaveKey, JSON.stringify(project));
  }, [project]);

  useEffect(() => {
    localStorage.setItem(teamsLibraryKey, JSON.stringify(project.teams));
  }, [project.teams]);

  useEffect(() => {
    localStorage.setItem(preferencesKey, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (
      hasValidMatch(project) &&
      !matchTeams.some((team) => team.id === context.teamId)
    ) {
      setContext((current) => ({
        ...current,
        teamId: project.match.homeTeamId,
        playerId: ""
      }));
    }
  }, [context.teamId, matchTeams, project]);

  useEffect(() => {
    let active = true;
    async function restoreVideo() {
      if (!project.video?.path || !desktop) return;
      const result = await desktop.authorizeVideo(project.video.path);
      if (!active) return;
      if (result.ok) {
        setVideoUrl(result.video.url);
      } else {
        notify("No se encuentra el vídeo original. Puedes volver a seleccionarlo.");
      }
    }
    restoreVideo();
    return () => {
      active = false;
      window.clearTimeout(noticeTimer.current);
    };
    // This restoration only belongs to initial startup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function seekTo(seconds) {
    const video = videoRef.current;
    if (!video) return;
    const mediaDuration = Number.isFinite(video.duration) ? video.duration : 0;
    const duration = mediaDuration || project.video?.duration || 0;
    if (duration <= 0 || video.readyState === 0) {
      pendingSeekRef.current = Math.max(0, Number(seconds) || 0);
      return;
    }
    const target = clamp(seconds, 0, duration);
    try {
      video.currentTime = target;
      setCurrentTime(target);
      pendingSeekRef.current = null;
    } catch {
      pendingSeekRef.current = target;
      notify("Preparando ese punto del vídeo…");
    }
  }

  function synchronizeVideoDuration(video) {
    const duration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : 0;
    if (
      duration > 0 &&
      Math.abs(duration - (project.video?.duration || 0)) > 0.01
    ) {
      updateProject((current) => ({
        ...current,
        video: current.video ? { ...current.video, duration } : current.video
      }));
    }
    return duration;
  }

  function finishPreparingVideo(video) {
    video.playbackRate = playbackRate;
    const pending = pendingSeekRef.current;
    if (pending !== null) {
      window.setTimeout(() => seekTo(pending), 0);
    }
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => notify("El vídeo no pudo comenzar a reproducirse."));
    } else {
      video.pause();
    }
  }

  function setVideoRate(rate) {
    const safeRate = clamp(rate, 0.25, 16);
    setPlaybackRate(safeRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = safeRate;
      videoRef.current.preservesPitch = safeRate <= 2;
    }
  }

  function executePlaybackAction(action) {
    const { smallStep, mediumStep, largeStep, frameRate } = preferences.playback;
    const video = videoRef.current;
    const position = video && Number.isFinite(video.currentTime) ? video.currentTime : currentTime;
    const orderedEvents = project.events.slice().sort((left, right) => left.start - right.start);
    const previousEvent = orderedEvents.slice().reverse().find((event) => event.start < position - 0.05);
    const nextEvent = orderedEvents.find((event) => event.start > position + 0.05);
    const actions = {
      playPause: togglePlayback,
      backSmall: () => seekTo(position - smallStep),
      forwardSmall: () => seekTo(position + smallStep),
      backMedium: () => seekTo(position - mediumStep),
      forwardMedium: () => seekTo(position + mediumStep),
      backLarge: () => seekTo(position - largeStep),
      forwardLarge: () => seekTo(position + largeStep),
      previousFrame: () => seekTo(position - 1 / Math.max(1, frameRate)),
      nextFrame: () => seekTo(position + 1 / Math.max(1, frameRate)),
      slower: () => setVideoRate(nextPlaybackSpeed(playbackRate, -1)),
      faster: () => setVideoRate(nextPlaybackSpeed(playbackRate, 1)),
      normalSpeed: () => setVideoRate(1),
      speedHalf: () => setVideoRate(0.5),
      speed2: () => setVideoRate(2),
      speed4: () => setVideoRate(4),
      speed8: () => setVideoRate(8),
      speed16: () => setVideoRate(16),
      mute: () => {
        if (video) video.muted = !video.muted;
      },
      volumeDown: () => {
        if (video) video.volume = clamp(video.volume - 0.1, 0, 1);
      },
      volumeUp: () => {
        if (video) video.volume = clamp(video.volume + 0.1, 0, 1);
      },
      previousEvent: () => seekTo(previousEvent?.start ?? 0),
      nextEvent: () => seekTo(nextEvent?.start ?? project.video?.duration ?? 0),
      videoStart: () => seekTo(0),
      videoEnd: () => seekTo(project.video?.duration || 0)
    };
    actions[action]?.();
  }

  function playbackControlLabel(id) {
    const labels = {
      backLarge: `−${preferences.playback.largeStep}s`,
      backMedium: `−${preferences.playback.mediumStep}s`,
      backSmall: `−${preferences.playback.smallStep}s`,
      previousFrame: "− frame",
      playPause: isPlaying ? "Pausar" : "Reproducir",
      nextFrame: "+ frame",
      forwardSmall: `+${preferences.playback.smallStep}s`,
      forwardMedium: `+${preferences.playback.mediumStep}s`,
      forwardLarge: `+${preferences.playback.largeStep}s`,
      slower: "Vel −",
      normalSpeed: "×1",
      faster: "Vel +",
      speed2: "×2",
      speed4: "×4",
      speed8: "×8",
      speed16: "×16",
      speedHalf: "×0,5",
      mute: "Sonido",
      volumeDown: "Vol −",
      volumeUp: "Vol +",
      previousEvent: "Evento ←",
      nextEvent: "Evento →",
      videoStart: "Inicio",
      videoEnd: "Final"
    };
    return labels[id] || playbackControls.find((item) => item.id === id)?.label || id;
  }

  function addEvent(event) {
    updateProject((current) => ({
      ...current,
      events: [...current.events, event]
    }));
    setContext((current) => ({ ...current, notes: "" }));
  }

  function handleTag(tag) {
    const video = videoRef.current;
    if (!video || !project.video) {
      notify("Selecciona un vídeo antes de etiquetar.");
      return;
    }
    if (!hasValidMatch(project)) {
      notify("Selecciona los dos equipos del partido antes de etiquetar.");
      return;
    }
    const time = video.currentTime;
    const duration = video.duration || project.video.duration || 0;

    if (tag.mode === "point") {
      const event = createPointEvent(tag, time, duration, eventContext);
      addEvent(event);
      notify(`${tag.name} registrada en ${formatTime(time, true)}.`);
      return;
    }

    const active = activeIntervals[tag.id];
    if (!active) {
      setActiveIntervals((current) => ({
        ...current,
        [tag.id]: { start: time, context: { ...eventContext } }
      }));
      notify(`${tag.name}: intervalo iniciado.`);
      return;
    }

    const event = createIntervalEvent(
      tag,
      active.start,
      time,
      duration,
      active.context
    );
    addEvent(event);
    setActiveIntervals((current) => {
      const next = { ...current };
      delete next[tag.id];
      return next;
    });
    notify(`${tag.name}: intervalo guardado.`);
  }

  useEffect(() => {
    function handleKeyboard(event) {
      const target = event.target;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (isEditing || showTagEditor || editingEvent || showExportClips) return;

      const pressed = eventToShortcut(event);
      const navigationAction = Object.entries(preferences.shortcuts).find(
        ([, shortcut]) => shortcut && shortcut === pressed
      );
      if (navigationAction) {
        event.preventDefault();
        executePlaybackAction(navigationAction[0]);
        return;
      }
      const matchingTag = project.template.tags.find(
        (tag) => tag.shortcut && tag.shortcut.toUpperCase() === pressed.toUpperCase()
      );
      if (matchingTag) {
        event.preventDefault();
        handleTag(matchingTag);
      }
    }
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  });

  useEffect(() => {
    function handleSaveShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveProject();
      }
    }
    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  });

  async function chooseVideo() {
    if (!desktop) {
      notify("La selección de vídeo está disponible en la aplicación de escritorio.");
      return;
    }
    if (project.events.length > 0 && !window.confirm("Cambiar de vídeo mantendrá las etiquetas actuales. ¿Continuar?")) {
      return;
    }
    const result = await desktop.selectVideo();
    if (result.canceled) return;
    setVideoUrl(result.video.url);
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveIntervals({});
    updateProject((current) => ({
      ...current,
      match: null,
      video: {
        path: result.video.path,
        name: result.video.name,
        duration: 0
      }
    }));
  }

  async function openProject() {
    if (!desktop) return;
    const result = await desktop.openProject();
    if (result.canceled) return;
    if (result.error) {
      notify(result.error);
      return;
    }
    const migrated = migrateProject(result.project);
    setProject(migrated);
    setProjectFilePath(result.filePath);
    setSelectedEventIds(new Set());
    setActiveIntervals({});
    setCurrentTime(0);
    setVideoUrl(result.video?.url || "");
    setContext({
      ...emptyContext,
      teamId: migrated.match?.homeTeamId || ""
    });
    notify(
      result.video
        ? "Análisis abierto."
        : "Análisis abierto, pero falta localizar el vídeo original."
    );
  }

  async function saveProject() {
    if (!desktop) return;
    const result = await desktop.saveProject({
      project,
      filePath: projectFilePath
    });
    if (result.canceled) return;
    setProjectFilePath(result.filePath);
    notify("Análisis guardado.");
  }

  function newProject() {
    if (
      project.events.length > 0 &&
      !window.confirm("¿Crear un análisis nuevo? El análisis actual seguirá en su archivo si lo has guardado.")
    ) {
      return;
    }
    setProject(createBlankProject(readTeamLibrary()));
    setProjectFilePath("");
    setVideoUrl("");
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveIntervals({});
    setSelectedEventIds(new Set());
    setContext({ ...emptyContext });
    setActiveView("tagging");
    notify("Nuevo análisis creado.");
  }

  function undoLastEvent() {
    if (project.events.length === 0) return;
    const last = project.events[project.events.length - 1];
    updateProject((current) => ({
      ...current,
      events: current.events.slice(0, -1)
    }));
    setSelectedEventIds((current) => {
      const next = new Set(current);
      next.delete(last.id);
      return next;
    });
    notify("Última acción deshecha.");
  }

  function deleteEvent(id) {
    updateProject((current) => ({
      ...current,
      events: current.events.filter((event) => event.id !== id)
    }));
    setSelectedEventIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function toggleSelected(id) {
    setSelectedEventIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedEventIds((current) =>
      current.size === project.events.length
        ? new Set()
        : new Set(project.events.map((event) => event.id))
    );
  }

  async function exportCsv() {
    if (!desktop || project.events.length === 0) {
      notify("Todavía no hay acciones para exportar.");
      return;
    }
    const result = await desktop.exportCsv({
      projectName: project.projectName,
      csv: projectToCsv(project)
    });
    if (!result.canceled) {
      notify("Datos CSV exportados.");
      desktop.revealFile(result.filePath);
    }
  }

  async function exportXlsx() {
    if (!desktop) return;
    setBusy("Preparando libro de Excel…");
    try {
      const result = await desktop.exportXlsx({ project });
      if (result.error) {
        notify(result.error);
      } else if (!result.canceled) {
        notify("Libro XLSX exportado.");
        desktop.revealFile(result.filePath);
      }
    } finally {
      setBusy("");
    }
  }

  function exportData() {
    if (dataExportFormat === "csv") return exportCsv();
    return exportXlsx();
  }

  function foldersForEvent(event, groupBy) {
    const values = {
      tag: [event.tagName || "Sin etiqueta"],
      team: [event.team || "Sin equipo"],
      player: [event.player || "Sin jugador"],
      tagTeam: [event.tagName || "Sin etiqueta", event.team || "Sin equipo"],
      teamPlayer: [event.team || "Sin equipo", event.player || "Sin jugador"]
    };
    return values[groupBy] || [];
  }

  async function exportClips(options) {
    if (!desktop || !project.video?.path) {
      notify("Selecciona el vídeo original.");
      return;
    }
    const selected =
      options.scope === "selected"
        ? project.events.filter((event) => selectedEventIds.has(event.id))
        : project.events;
    const events = selected.slice().sort((left, right) => {
      const keys = {
        time: ["start"],
        tag: ["tagName", "start"],
        team: ["team", "start"],
        player: ["player", "start"]
      }[options.sortBy] || ["start"];
      for (const key of keys) {
        const result =
          key === "start"
            ? left.start - right.start
            : String(left[key] || "").localeCompare(String(right[key] || ""), "es", {
                numeric: true
              });
        if (result !== 0) return result;
      }
      return 0;
    });
    if (events.length === 0) {
      notify("Todavía no hay acciones para exportar.");
      return;
    }
    setShowExportClips(false);
    setBusy(`Generando ${events.length} ${events.length === 1 ? "clip" : "clips"}…`);
    try {
      const result = await desktop.exportClips({
        videoPath: project.video.path,
        events: events.map((event) => ({
          start: event.start,
          end: event.end,
          tagName: event.tagName,
          timeLabel: formatTime(event.start).replaceAll(":", "-"),
          folders: foldersForEvent(event, options.groupBy)
        }))
      });
      if (result.error) {
        notify(result.error);
      } else if (!result.canceled) {
        notify(`${result.files.length} ${result.files.length === 1 ? "clip creado" : "clips creados"}.`);
        if (result.files[0]) desktop.revealFile(result.files[0]);
      }
    } finally {
      setBusy("");
    }
  }

  async function exportReport() {
    if (!desktop) return;
    setBusy("Preparando informe…");
    try {
      const result = await desktop.exportReportPdf(reportPayload(project));
      if (!result.canceled) {
        notify("Informe PDF exportado.");
        desktop.revealFile(result.filePath);
      }
    } finally {
      setBusy("");
    }
  }

  async function exportPlaybook(payload) {
    if (!desktop) return;
    const result =
      payload.format === "pdf"
        ? await desktop.exportPlaybookPdf(payload)
        : payload.format === "video"
          ? await desktop.exportPlaybookVideo(payload)
          : await desktop.exportPlaybookPng(payload);
    if (result.error) notify(result.error);
    else if (!result.canceled) {
      notify(
        payload.format === "video"
          ? "Animación del Playbook exportada."
          : `Jugada exportada como ${payload.format.toUpperCase()}.`
      );
      desktop.revealFile(result.filePath);
    }
  }

  function startPanelResize(event) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = preferences.layout.tagPanelWidth;
    function move(moveEvent) {
      const width = clamp(startWidth + startX - moveEvent.clientX, 320, 720);
      setPreferences((current) => ({
        ...current,
        layout: { ...current.layout, tagPanelWidth: width }
      }));
    }
    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  function startVideoResize(event) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = preferences.layout.videoHeight;
    function move(moveEvent) {
      const height = clamp(startHeight + moveEvent.clientY - startY, 320, 900);
      setPreferences((current) => ({
        ...current,
        layout: { ...current.layout, videoHeight: height }
      }));
    }
    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  function startTagResize(event) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = preferences.layout.tagButtonHeight;
    function move(moveEvent) {
      const height = clamp(startHeight + moveEvent.clientY - startY, 48, 110);
      setPreferences((current) => ({
        ...current,
        layout: { ...current.layout, tagButtonHeight: height }
      }));
    }
    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><span /></div>
          <div>
            <strong>ScoutAnalyzer</strong>
            <small>Versión {appVersion}</small>
          </div>
        </div>
        <input
          className="project-title"
          value={project.projectName}
          onChange={(event) =>
            updateProject((current) => ({
              ...current,
              projectName: event.target.value
            }))
          }
          aria-label="Nombre del análisis"
        />
        <div className="top-actions">
          <button className="button ghost" onClick={newProject}>Nuevo</button>
          <button className="button ghost" onClick={openProject}>Abrir</button>
          <button className="button primary" onClick={saveProject}>Guardar</button>
        </div>
      </header>

      <nav className="view-tabs" aria-label="Secciones">
        <button
          className={activeView === "tagging" ? "active" : ""}
          onClick={() => setActiveView("tagging")}
        >
          Etiquetado
        </button>
        <button
          className={activeView === "stats" ? "active" : ""}
          onClick={() => setActiveView("stats")}
        >
          Estadísticas
        </button>
        <button
          className={activeView === "roster" ? "active" : ""}
          onClick={() => setActiveView("roster")}
        >
          Equipos y jugadores
        </button>
        <button
          className={activeView === "playbook" ? "active" : ""}
          onClick={() => setActiveView("playbook")}
        >
          Playbook
        </button>
        <button
          className={activeView === "report" ? "active" : ""}
          onClick={() => setActiveView("report")}
        >
          Informe y exportación
        </button>
        <button
          className={activeView === "settings" ? "active" : ""}
          onClick={() => setActiveView("settings")}
        >
          Ajustes
        </button>
      </nav>

      <main className="main-area">
        {activeView === "tagging" && (
          <>
            <div
              className="workbench"
              style={{
                gridTemplateColumns: `minmax(0, 1fr) 8px ${preferences.layout.tagPanelWidth}px`
              }}
            >
              <section className="video-column">
                {videoUrl && hasValidMatch(project) && (
                  <div className="active-match-strip">
                    {matchTeams.map((team, index) => (
                      <div key={team.id} style={{ "--match-color": team.primaryColor }}>
                        {team.logo ? <img src={team.logo} alt="" /> : <i>{team.shortName}</i>}
                        <strong>{team.name}</strong>
                        {index === 0 && <span>vs</span>}
                      </div>
                    ))}
                    <button className="mini-button" onClick={() => updateProject((current) => ({ ...current, match: null }))}>
                      Cambiar partido
                    </button>
                    <button className="mini-button" onClick={chooseVideo}>Cambiar vídeo</button>
                  </div>
                )}
                <div
                  className="video-card"
                  style={{ height: `${preferences.layout.videoHeight}px` }}
                >
                  {videoUrl ? (
                    <video
                      key={videoUrl}
                      ref={videoRef}
                      src={videoUrl}
                      preload="auto"
                      onClick={togglePlayback}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onTimeUpdate={(event) => {
                        if (!scrubbingRef.current) setCurrentTime(event.currentTarget.currentTime);
                      }}
                      onSeeking={(event) => setCurrentTime(event.currentTarget.currentTime)}
                      onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime)}
                      onError={() => notify("No se pudo leer este vídeo. Comprueba el formato del archivo.")}
                      onLoadedMetadata={(event) => {
                        const duration = synchronizeVideoDuration(event.currentTarget);
                        finishPreparingVideo(event.currentTarget);
                        if (pendingSeekRef.current === null) {
                          setCurrentTime(0);
                        }
                        if (duration === 0) {
                          notify("Leyendo la duración del vídeo…");
                        }
                      }}
                      onDurationChange={(event) => synchronizeVideoDuration(event.currentTarget)}
                      onCanPlay={(event) => finishPreparingVideo(event.currentTarget)}
                    />
                  ) : (
                    <div className="video-empty">
                      <div className="empty-ball">◉</div>
                      <h2>Selecciona un vídeo</h2>
                      <button className="button primary large" onClick={chooseVideo}>
                        Seleccionar vídeo
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className="video-height-resizer"
                  onPointerDown={startVideoResize}
                  aria-label="Arrastrar para cambiar la altura del vídeo"
                />
                <div className="video-toolbar">
                  <div className="scrubber-row">
                    <span>{formatTime(currentTime, true)}</span>
                    <input
                      className="video-scrubber"
                      type="range"
                      min="0"
                      max={Math.max(project.video?.duration || 0, 0.01)}
                      step="0.01"
                      value={clamp(currentTime, 0, project.video?.duration || 0)}
                      onPointerDown={() => {
                        scrubbingRef.current = true;
                      }}
                      onInput={(event) => {
                        const target = Number(event.currentTarget.value);
                        setCurrentTime(target);
                        seekTo(target);
                      }}
                      onChange={(event) => seekTo(Number(event.currentTarget.value))}
                      onPointerUp={(event) => {
                        scrubbingRef.current = false;
                        seekTo(Number(event.currentTarget.value));
                      }}
                      onPointerCancel={() => {
                        scrubbingRef.current = false;
                      }}
                      onBlur={() => {
                        scrubbingRef.current = false;
                      }}
                      aria-label="Posición del vídeo"
                    />
                    <span>{formatTime(project.video?.duration || 0)}</span>
                  </div>
                  <div className="playback-button-row">
                    {preferences.playback.visibleControls.map((controlId) => (
                      <button
                        className={`tool-button ${controlId === "playPause" ? "play" : ""}`}
                        key={controlId}
                        onClick={() => executePlaybackAction(controlId)}
                        title={playbackControls.find((item) => item.id === controlId)?.label}
                      >
                        {playbackControlLabel(controlId)}
                      </button>
                    ))}
                    {playbackRate !== 1 && (
                      <span className="playback-rate-readout" aria-live="polite">
                        Velocidad {playbackRate}×
                      </span>
                    )}
                  </div>
                </div>
              </section>

              <div
                className="panel-resizer"
                onPointerDown={startPanelResize}
                aria-label="Arrastrar para cambiar el ancho del panel de etiquetas"
              />

              <aside
                className="tagging-panel"
                style={{ "--active-team-color": selectedTeam?.primaryColor || "#2dd4bf" }}
              >
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Registro rápido</span>
                    <h2>Etiquetas</h2>
                  </div>
                  <button className="mini-button" onClick={() => setShowTagEditor(true)}>
                    Configurar
                  </button>
                </div>

                <div className="context-grid">
                  <label className="field">
                    <span>Equipo</span>
                    <select
                      value={context.teamId}
                      onChange={(event) =>
                        setContext((current) => ({
                          ...current,
                          teamId: event.target.value,
                          playerId: ""
                        }))
                      }
                    >
                      <option value="">Sin indicar</option>
                      {matchTeams.map((team) => (
                        <option value={team.id} key={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Jugador</span>
                    <select
                      value={context.playerId}
                      onChange={(event) =>
                        setContext((current) => ({ ...current, playerId: event.target.value }))
                      }
                    >
                      <option value="">Sin indicar</option>
                      {sortPlayersByNumber(selectedTeam?.players || []).map((player) => (
                        <option value={player.id} key={player.id}>
                          {player.number ? `#${player.number} ` : ""}{player.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field span-two">
                    <span>Nota rápida</span>
                    <input
                      placeholder="Comentario opcional"
                      value={context.notes}
                      onChange={(event) => setContext((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </label>
                </div>

                <div
                  className="tag-grid"
                  style={{
                    gridTemplateColumns: `repeat(${preferences.layout.tagColumns}, minmax(0, 1fr))`
                  }}
                >
                  {project.template.tags.map((tag) => {
                    const active = activeIntervals[tag.id];
                    return (
                      <button
                        className={`tag-button ${active ? "recording" : ""}`}
                        key={tag.id}
                        style={{
                          "--tag-color": tag.color,
                          minHeight: `${preferences.layout.tagButtonHeight}px`
                        }}
                        onClick={() => handleTag(tag)}
                      >
                        <span className="tag-dot" />
                        <span className="tag-name">{active ? `Finalizar ${tag.name}` : tag.name}</span>
                        <small>
                          {tag.mode === "interval"
                            ? active
                              ? `Desde ${formatTime(active.start, true)}`
                              : "Intervalo"
                            : `−${tag.before}s / +${tag.after}s`}
                        </small>
                        {tag.shortcut && <kbd>{tag.shortcut}</kbd>}
                      </button>
                    );
                  })}
                </div>
                <div
                  className="tag-size-resizer"
                  onPointerDown={startTagResize}
                  aria-label="Arrastrar para cambiar la altura de las etiquetas"
                />

                <div className="tagging-actions">
                  <button className="button ghost" onClick={undoLastEvent} disabled={project.events.length === 0}>
                    Deshacer última
                  </button>
                </div>
              </aside>
            </div>

            <Timeline
              currentTime={currentTime}
              duration={project.video?.duration || 0}
              events={project.events}
              teams={project.teams}
              selectedIds={selectedEventIds}
              onSeek={seekTo}
              onToggleSelected={toggleSelected}
              onEdit={setEditingEvent}
              onDelete={deleteEvent}
            />
          </>
        )}

        {activeView === "stats" && <StatsPanel project={project} />}

        {activeView === "roster" && (
          <RosterManager
            teams={project.teams}
            onChange={(teams) => {
              updateProject((current) => {
                const matchStillValid =
                  current.match &&
                  teams.some((team) => team.id === current.match.homeTeamId) &&
                  teams.some((team) => team.id === current.match.awayTeamId);
                return { ...current, teams, match: matchStillValid ? current.match : null };
              });
              if (!teams.some((team) => team.id === context.teamId)) {
                setContext((current) => ({
                  ...current,
                  teamId: teams[0]?.id || "",
                  playerId: ""
                }));
              }
            }}
          />
        )}

        {activeView === "playbook" && (
          <Playbook
            playbook={project.playbook}
            teams={project.teams}
            onChange={(playbook) =>
              updateProject((current) => ({ ...current, playbook }))
            }
            onExport={exportPlaybook}
            onNotify={notify}
          />
        )}

        {activeView === "settings" && (
          <SettingsPanel
            preferences={preferences}
            onChange={setPreferences}
            tags={project.template.tags}
          />
        )}

        {activeView === "report" && (
          <section className="report-view">
            <div className="report-hero compact-report-hero">
              <div>
                <span className="eyebrow">Entrega</span>
                <h1>Exportar análisis</h1>
              </div>
              <div className="report-number">
                <strong>{project.events.length}</strong>
                <span>acciones disponibles</span>
              </div>
            </div>

            <div className="export-grid">
              <article className="export-card">
                <div className="export-icon">DATA</div>
                <h2>Datos del análisis</h2>
                <p>Exporta los mismos datos en una tabla CSV o en un libro Excel con varias hojas.</p>
                <label className="field export-format-field">
                  <span>Formato</span>
                  <select value={dataExportFormat} onChange={(event) => setDataExportFormat(event.target.value)}>
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                  </select>
                </label>
                <button className="button secondary" onClick={exportData}>
                  Exportar {dataExportFormat.toUpperCase()}
                </button>
              </article>
              <article className="export-card featured">
                <div className="export-icon">▶</div>
                <h2>Clips de vídeo</h2>
                <p>
                  Elige acciones concretas, orden y carpetas por etiqueta, equipo o jugador.
                </p>
                <div className="selection-row">
                  <button className="mini-button" onClick={toggleSelectAll}>
                    {selectedEventIds.size === project.events.length && project.events.length > 0
                      ? "Quitar selección"
                      : "Seleccionar todas"}
                  </button>
                  <span>{selectedEventIds.size} seleccionadas</span>
                </div>
                <button className="button primary" onClick={() => setShowExportClips(true)}>
                  Configurar exportación
                </button>
              </article>
              <article className="export-card">
                <div className="export-icon">PDF</div>
                <h2>Informe completo</h2>
                <p>Resumen general, recuentos por etiqueta y registro cronológico de acciones.</p>
                <button className="button secondary" onClick={exportReport}>Crear informe PDF</button>
              </article>
            </div>

            <article className="report-preview">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Vista previa</span>
                  <h2>{project.projectName}</h2>
                </div>
                <span>{project.video?.name || "Sin vídeo seleccionado"}</span>
              </div>
              <div className="report-stats">
                {stats.length === 0 ? (
                  <div className="empty-inline">Todavía no hay datos que resumir.</div>
                ) : (
                  stats.map((item) => (
                    <div key={item.id}>
                      <i style={{ background: item.color }} />
                      <span>{item.name}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        )}
      </main>

      {activeView === "tagging" && videoUrl && !hasValidMatch(project) && (
        <MatchSetup
          teams={project.teams}
          initialMatch={project.match}
          onTeamsChange={(teams) =>
            updateProject((current) => ({ ...current, teams }))
          }
          onManageTeams={() => setActiveView("roster")}
          onConfirm={(match) => {
            updateProject((current) => ({ ...current, match }));
            setContext((current) => ({
              ...current,
              teamId: match.homeTeamId,
              playerId: ""
            }));
            notify("Partido vinculado al vídeo.");
          }}
        />
      )}

      {showTagEditor && (
        <TagEditor
          tags={project.template.tags}
          onClose={() => setShowTagEditor(false)}
          onSave={(tags) => {
            updateProject((current) => ({
              ...current,
              template: { ...current.template, tags }
            }));
            setActiveIntervals({});
            setShowTagEditor(false);
            notify("Plantilla actualizada.");
          }}
        />
      )}

      {editingEvent && (
        <EventEditor
          event={editingEvent}
          tags={project.template.tags}
          teams={matchTeams.length > 0 ? matchTeams : project.teams}
          duration={project.video?.duration || Number.MAX_SAFE_INTEGER}
          onClose={() => setEditingEvent(null)}
          onSave={(savedEvent) => {
            updateProject((current) => ({
              ...current,
              events: current.events.map((event) =>
                event.id === savedEvent.id ? savedEvent : event
              )
            }));
            setEditingEvent(null);
            notify("Evento actualizado.");
          }}
        />
      )}

      {showExportClips && (
        <ExportClipsModal
          events={project.events}
          selectedIds={selectedEventIds}
          onClose={() => setShowExportClips(false)}
          onExport={exportClips}
        />
      )}

      {notice && <div className="toast">{notice}</div>}
      {busy && (
        <div className="busy-overlay">
          <div className="spinner" />
          <strong>{busy}</strong>
        </div>
      )}
    </div>
  );
}

export default App;
