import { useEffect, useMemo, useRef, useState } from "react";
import { AccessFlow } from "./components/AccessFlow.jsx";
import { BrandLogo, BrandSplash } from "./components/Brand.jsx";
import { EventEditor } from "./components/EventEditor.jsx";
import { ExportClipsModal } from "./components/ExportClipsModal.jsx";
import { MatchSetup } from "./components/MatchSetup.jsx";
import { PlayerJersey } from "./components/PlayerJersey.jsx";
import { ProfilePanel } from "./components/ProfilePanel.jsx";
import { ReportCenter } from "./components/ReportCenter.jsx";
import { ScoutingLibrary } from "./components/ScoutingLibrary.jsx";
import { ShotCourtSelector } from "./components/ShotCourt.jsx";
import { StatsPanel } from "./components/StatsPanel.jsx";
import { TagEditor } from "./components/TagEditor.jsx";
import { ThemeSelector } from "./components/ThemeSelector.jsx";
import { Timeline } from "./components/Timeline.jsx";
import { UserGuide } from "./components/UserGuide.jsx";
import {
  clamp,
  createIntervalEvent,
  createPointEvent,
  formatTime,
  projectToCsv,
  reportPayload,
  statisticsFor,
} from "./lib/analysis.js";
import {
  createBlankProject,
  defaultTags,
  defaultPreferences,
  defaultTeams,
  emptyContext,
} from "./lib/defaults.js";
import { migrateProject } from "./lib/project.js";
import {
  boxScore,
  coveredSeconds,
  eventMetric,
  periods,
  periodLabel,
} from "./lib/basketball.js";
import { createExampleProject } from "./lib/demo.js";
import { WorkspaceOverview } from "./components/WorkspaceOverview.jsx";
import { ReviewRoom } from "./components/ReviewRoom.jsx";
import { CommandPalette } from "./components/CommandPalette.jsx";
import { Icon } from "./components/Icon.jsx";
import { buildAutomaticAnalysis } from "./lib/insights.js";
import { enrichTeam, sortPlayersByNumber } from "./lib/roster.js";
import { useDialogAccessibility } from "./lib/useDialogAccessibility.js";
import { accountInitials, readLocalAccount } from "./lib/account.js";
import {
  eventToShortcut,
  nextPlaybackSpeed,
  playbackControls,
} from "./lib/playback.js";
import {
  normalizePaletteMode,
  normalizeThemeMode,
  paletteStorageKey,
  resolveThemeMode,
  themeStorageKey,
} from "./lib/theme.js";
import { isShotTag, shotTagPoints, shotZoneById } from "./lib/shotZones.js";
import { downloadText, safeDownloadName } from "./lib/webFiles.js";

// IPC errors stay visible in the UI instead of becoming unhandled rejections.
const desktop = window.scoutDesktop
  ? Object.fromEntries(
      Object.entries(window.scoutDesktop).map(([key, fn]) => [
        key,
        typeof fn === "function"
          ? (...args) =>
              Promise.resolve()
                .then(() => fn(...args))
                .catch((error) => ({
                  ok: false,
                  error: error.message || "No se pudo completar la operación.",
                }))
          : fn,
      ]),
    )
  : null;
const appVersion = __APP_VERSION__;
const autosaveKey = "scout-analyzer-autosave-v1";
const preferencesKey = "scout-analyzer-preferences-v3";
const teamsLibraryKey = "scout-analyzer-teams-v1";
const dataLibraryKey = "tactovia-data-library-v1";

function profileStorageKey(base, accountId) {
  return accountId ? `${base}:${accountId}` : base;
}

function readThemeMode() {
  try {
    return normalizeThemeMode(localStorage.getItem(themeStorageKey));
  } catch {
    return "system";
  }
}

function readPaletteMode() {
  try {
    return normalizePaletteMode(localStorage.getItem(paletteStorageKey));
  } catch {
    return "tactovia";
  }
}

function systemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
}

function readTeamLibrary(accountId = "") {
  try {
    const stored = JSON.parse(
      localStorage.getItem(profileStorageKey(teamsLibraryKey, accountId)),
    );
    if (Array.isArray(stored) && stored.length > 0)
      return stored.map(enrichTeam);
  } catch {
    // The team library can always be reconstructed from the current project.
  }
  return defaultTeams.map(enrichTeam);
}

function readDataLibrary(accountId = "") {
  try {
    const stored = JSON.parse(
      localStorage.getItem(profileStorageKey(dataLibraryKey, accountId)),
    );
    if (Array.isArray(stored?.teams)) {
      return {
        teams: stored.teams.map(enrichTeam),
        competitions: Array.isArray(stored.competitions)
          ? stored.competitions
          : [],
        freeAgents: Array.isArray(stored.freeAgents) ? stored.freeAgents : [],
        libraryFolders: Array.isArray(stored.libraryFolders)
          ? stored.libraryFolders
          : [],
      };
    }
  } catch {
    // A damaged library falls back to the compatible team storage.
  }
  return {
    teams: readTeamLibrary(accountId),
    competitions: [],
    freeAgents: [],
    libraryFolders: [],
  };
}

function createProjectFromLibrary(accountId = "") {
  const library = readDataLibrary(accountId);
  return {
    ...createBlankProject(library.teams),
    competitions: library.competitions,
    freeAgents: library.freeAgents,
    libraryFolders: library.libraryFolders,
  };
}

function createProjectFromDataLibrary(library) {
  return {
    ...createBlankProject(library.teams),
    competitions: library.competitions || [],
    freeAgents: library.freeAgents || [],
    libraryFolders: library.libraryFolders || [],
  };
}

function hasValidMatch(project) {
  return Boolean(
    project.match &&
      project.match.homeTeamId !== project.match.awayTeamId &&
      project.teams.some((team) => team.id === project.match.homeTeamId) &&
      project.teams.some((team) => team.id === project.match.awayTeamId),
  );
}

function hasMeaningfulAnalysis(project) {
  return Boolean(
    project?.video?.path ||
      project?.video?.name ||
      project?.match?.homeTeamId ||
      project?.match?.awayTeamId ||
      (project?.events || []).length > 0,
  );
}

function readAutosave(accountId = "") {
  try {
    const stored = JSON.parse(
      localStorage.getItem(profileStorageKey(autosaveKey, accountId)),
    );
    if (
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(stored?.version) &&
      Array.isArray(stored.events) &&
      Array.isArray(stored.template?.tags)
    ) {
      return migrateProject(stored);
    }
  } catch {
    // A damaged autosave should never prevent the application from starting.
  }
  return createProjectFromLibrary(accountId);
}

function readPreferences(accountId = "") {
  try {
    const stored = JSON.parse(
      localStorage.getItem(profileStorageKey(preferencesKey, accountId)),
    );
    if (stored?.layout && stored?.playback && stored?.shortcuts) {
      return {
        layout: { ...defaultPreferences.layout, ...stored.layout },
        playback: { ...defaultPreferences.playback, ...stored.playback },
        shortcuts: { ...defaultPreferences.shortcuts, ...stored.shortcuts },
      };
    }
  } catch {
    // Invalid local preferences fall back to the defaults.
  }
  return structuredClone(defaultPreferences);
}

function App() {
  useDialogAccessibility();
  const [project, setProject] = useState(() =>
    readAutosave(readLocalAccount()?.id || ""),
  );
  const [account, setAccount] = useState(readLocalAccount);
  const [dataLibrary, setDataLibrary] = useState(() =>
    readDataLibrary(readLocalAccount()?.id || ""),
  );
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedSport, setSelectedSport] = useState("");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [projectFilePath, setProjectFilePath] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [preferences, setPreferences] = useState(() =>
    readPreferences(readLocalAccount()?.id || ""),
  );
  const [context, setContext] = useState({ ...emptyContext });
  const [activeIntervals, setActiveIntervals] = useState({});
  const [selectedEventIds, setSelectedEventIds] = useState(new Set());
  const [editingEvent, setEditingEvent] = useState(null);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showExportClips, setShowExportClips] = useState(false);
  const [exportPlaylistId, setExportPlaylistId] = useState("");
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [activeView, setActiveView] = useState("overview");
  const [commandOpen, setCommandOpen] = useState(false);
  const [libraryHydrated, setLibraryHydrated] = useState(!desktop);
  const [saveStatus, setSaveStatus] = useState("Sin cambios");
  const [history, setHistory] = useState({ past: [], future: [] });
  const [sessionSaved, setSessionSaved] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [dataExportFormat, setDataExportFormat] = useState("xlsx");
  const [databaseSnapshot, setDatabaseSnapshot] = useState(null);
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [databaseError, setDatabaseError] = useState("");
  const [themeMode, setThemeMode] = useState(readThemeMode);
  const [paletteMode, setPaletteMode] = useState(readPaletteMode);
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);
  const [showBrandSplash, setShowBrandSplash] = useState(true);
  const videoRef = useRef(null);
  const webVideoInputRef = useRef(null);
  const webProjectInputRef = useRef(null);
  const webVideoObjectUrlRef = useRef("");
  const pendingSeekRef = useRef(null);
  const scrubbingRef = useRef(false);
  const noticeTimer = useRef(null);
  const databaseReadyRef = useRef(false);
  const databaseSyncTimerRef = useRef(null);
  const librarySyncTimerRef = useRef(null);

  const matchTeams = useMemo(
    () =>
      hasValidMatch(project)
        ? [project.match.homeTeamId, project.match.awayTeamId]
            .map((id) => project.teams.find((team) => team.id === id))
            .filter(Boolean)
        : [],
    [project.match, project.teams],
  );
  const selectedTeam = useMemo(
    () => matchTeams.find((team) => team.id === context.teamId) || null,
    [context.teamId, matchTeams],
  );
  const selectedPlayer = useMemo(
    () =>
      selectedTeam?.players?.find((player) => player.id === context.playerId) ||
      null,
    [selectedTeam, context.playerId],
  );
  const activeRosterPlayers = useMemo(() => {
    if (!selectedTeam || !project.match) return selectedTeam?.players || [];
    const rosterIds =
      selectedTeam.id === project.match.homeTeamId
        ? project.match.homeRosterIds
        : selectedTeam.id === project.match.awayTeamId
          ? project.match.awayRosterIds
          : null;
    if (!Array.isArray(rosterIds) || rosterIds.length === 0) {
      return selectedTeam.players || [];
    }
    const allowed = new Set(rosterIds);
    return (selectedTeam.players || []).filter((player) =>
      allowed.has(player.id),
    );
  }, [project.match, selectedTeam]);
  const eventContext = useMemo(() => {
    const zone = shotZoneById(context.shotZoneId);
    return {
      ...context,
      teamName: selectedTeam?.name || "",
      playerName: selectedPlayer
        ? [
            selectedPlayer.number ? `#${selectedPlayer.number}` : "",
            selectedPlayer.name,
          ]
            .filter(Boolean)
            .join(" ")
        : "",
      shotZoneName: zone?.name || "",
      shotPoints: zone?.points || 0,
    };
  }, [context, selectedPlayer, selectedTeam]);

  const stats = useMemo(
    () => statisticsFor(project.template.tags, project.events),
    [project.template.tags, project.events],
  );
  const automaticAnalysis = useMemo(
    () => buildAutomaticAnalysis(project),
    [project.events, project.teams, project.match],
  );
  const liveTaggingSummary = useMemo(() => {
    const total = project.events.length;
    const latest = total ? project.events[total - 1] : null;
    const identified = project.events.filter(
      (event) => event.playerId || event.player,
    ).length;
    const elapsedMinutes = Math.max(
      project.events.reduce(
        (maximum, event) =>
          Math.max(maximum, Number(event.anchor ?? event.start) || 0),
        0,
      ) / 60,
      1,
    );
    const teamScores = Object.fromEntries(
      matchTeams.map((team) => [
        team.id,
        boxScore(project.events.filter((e) => e.teamId === team.id)).points,
      ]),
    );
    const summary = boxScore(project.events);
    const shots = summary.fga,
      made = summary.fgm;
    const taggedSeconds = coveredSeconds(project.events);
    return {
      latest,
      leading: stats[0] || null,
      rate: total
        ? (total / elapsedMinutes).toFixed(1).replace(".", ",")
        : "0,0",
      identifiedPercentage: total ? Math.round((identified / total) * 100) : 0,
      teamScores,
      shotPercentage: shots ? Math.round((made / shots) * 100) : 0,
      shots,
      tagTypes: stats.length,
      activePlayers: new Set(
        project.events.map((event) => event.playerId).filter(Boolean),
      ).size,
      taggedSeconds,
      activeZones: new Set(
        project.events.map((event) => event.shotZoneId).filter(Boolean),
      ).size,
    };
  }, [matchTeams, project.events, stats]);

  function notify(message) {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 3200);
  }

  function commitEvents(events) {
    setHistory((current) => ({
      past: [...current.past.slice(-49), project.events],
      future: [],
    }));
    updateProject((current) => ({ ...current, events }));
  }
  function undoEvents() {
    if (!history.past.length) return;
    setHistory({
      past: history.past.slice(0, -1),
      future: [project.events, ...history.future],
    });
    updateProject((current) => ({ ...current, events: history.past.at(-1) }));
    notify("Cambio deshecho.");
  }
  function redoEvents() {
    if (!history.future.length) return;
    setHistory({
      past: [...history.past, project.events],
      future: history.future.slice(1),
    });
    updateProject((current) => ({ ...current, events: history.future[0] }));
    notify("Cambio rehecho.");
  }
  function confirmLeave() {
    return (
      !hasMeaningfulAnalysis(project) ||
      sessionSaved === project.updatedAt ||
      window.confirm(
        "Hay cambios en el análisis. Guarda un archivo si quieres conservar esta versión antes de continuar. ¿Continuar?",
      )
    );
  }
  function openExample() {
    if (!confirmLeave()) return;
    setProject(createExampleProject());
    setProjectFilePath("");
    setVideoUrl("");
    setCurrentTime(0);
    setHistory({ past: [], future: [] });
    setSelectedEventIds(new Set());
    setActiveIntervals({});
    setContext({ ...emptyContext });
    setActiveView("overview");
    setWorkspaceReady(true);
    notify("Ejemplo ficticio cargado. Puedes explorar estadísticas y listas.");
  }
  function updateProject(updater) {
    setProject((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...next, updatedAt: new Date().toISOString() };
    });
  }

  useEffect(() => {
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    const timer = window.setTimeout(
      () => setShowBrandSplash(false),
      reducedMotion ? 650 : 1850,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authenticated || !account || account.isDemo) return;
    setSaveStatus("Guardando…");
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          profileStorageKey(autosaveKey, account.id),
          JSON.stringify({ ...project, playbackPosition: currentTime }),
        );
        setSaveStatus("Recuperación guardada");
      } catch {
        setSaveStatus("No se pudo autoguardar");
        notify(
          "No hay espacio para autoguardar. Guarda el análisis en un archivo.",
        );
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [authenticated, account?.id, account?.isDemo, project]);
  useEffect(() => {
    if (!authenticated || !account || account.isDemo || !libraryHydrated)
      return;
    try {
      localStorage.setItem(
        profileStorageKey(dataLibraryKey, account.id),
        JSON.stringify(dataLibrary),
      );
    } catch {
      setDatabaseError(
        "No hay espacio local para guardar la biblioteca. Exporta una copia.",
      );
    }
  }, [
    authenticated,
    account?.id,
    account?.isDemo,
    dataLibrary,
    libraryHydrated,
  ]);
  useEffect(() => {
    if (!authenticated || !account || account.isDemo) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          profileStorageKey(preferencesKey, account.id),
          JSON.stringify(preferences),
        );
      } catch {
        notify("No se pudieron guardar las preferencias.");
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [authenticated, account?.id, account?.isDemo, preferences]);
  useEffect(() => {
    setHistory({ past: [], future: [] });
    setSessionSaved(project.updatedAt);
  }, [project.id]);
  useEffect(() => {
    setSelectedEventIds(
      (current) =>
        new Set(
          [...current].filter((id) => project.events.some((e) => e.id === id)),
        ),
    );
  }, [project.events]);

  useEffect(() => {
    const protect = (event) => {
      if (
        authenticated &&
        workspaceReady &&
        hasMeaningfulAnalysis(project) &&
        sessionSaved !== project.updatedAt
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [authenticated, workspaceReady, project, sessionSaved]);

  const resolvedTheme = resolveThemeMode(themeMode, prefersDark);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = themeMode;
    document.documentElement.style.colorScheme = resolvedTheme;
    localStorage.setItem(themeStorageKey, themeMode);
  }, [resolvedTheme, themeMode]);

  useEffect(() => {
    document.documentElement.dataset.palette = paletteMode;
    localStorage.setItem(paletteStorageKey, paletteMode);
  }, [paletteMode]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return undefined;
    const handleChange = (event) => setPrefersDark(event.matches);
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  useEffect(() => {
    if (workspaceReady) window.scrollTo({ top: 0, left: 0 });
  }, [workspaceReady]);

  useEffect(() => {
    if (!desktop?.initializeDatabase || !authenticated || !account)
      return undefined;
    let active = true;
    databaseReadyRef.current = false;
    setLibraryHydrated(false);
    setDatabaseLoading(true);
    desktop
      .initializeDatabase({
        legacyProject:
          !account.isDemo && hasMeaningfulAnalysis(project) ? project : null,
        ownerProfileId: account.id,
        isDemo: Boolean(account.isDemo),
      })
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          databaseReadyRef.current = true;
          setDatabaseSnapshot(result.snapshot);
          setDatabaseError("");
          if (desktop.getUserLibrary && !account.isDemo) {
            desktop
              .getUserLibrary({ ownerProfileId: account.id })
              .then((libraryResult) => {
                if (!active || !libraryResult?.ok) return;
                if (libraryResult.library) {
                  setDataLibrary({
                    teams: (libraryResult.library.teams || []).map(enrichTeam),
                    competitions: libraryResult.library.competitions || [],
                    freeAgents: libraryResult.library.freeAgents || [],
                    libraryFolders: libraryResult.library.folders || [],
                  });
                } else {
                  const localLibrary = readDataLibrary(account.id);
                  desktop.saveUserLibrary?.({
                    ownerProfileId: account.id,
                    library: {
                      ...localLibrary,
                      folders: localLibrary.libraryFolders || [],
                    },
                  });
                }
              })
              .catch(() => setDatabaseError("No se pudo abrir la biblioteca."))
              .finally(() => {
                if (active) setLibraryHydrated(true);
              });
          } else {
            setLibraryHydrated(true);
          }
        } else {
          setLibraryHydrated(true);
          setDatabaseError(
            result.error || "No se pudo iniciar la biblioteca de scouting.",
          );
        }
      })
      .finally(() => {
        if (active) setDatabaseLoading(false);
      });
    return () => {
      active = false;
    };
    // La migración de datos anteriores solo se ejecuta al arrancar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, authenticated]);

  useEffect(() => {
    if (
      !authenticated ||
      !libraryHydrated ||
      !desktop?.saveUserLibrary ||
      !account?.id ||
      account.isDemo
    )
      return undefined;
    window.clearTimeout(librarySyncTimerRef.current);
    librarySyncTimerRef.current = window.setTimeout(async () => {
      const result = await desktop.saveUserLibrary({
        ownerProfileId: account.id,
        isDemo: false,
        library: {
          teams: dataLibrary.teams,
          competitions: dataLibrary.competitions || [],
          freeAgents: dataLibrary.freeAgents || [],
          folders: dataLibrary.libraryFolders || [],
        },
      });
      if (!result.ok) {
        setDatabaseError(
          result.error || "No se pudo guardar la biblioteca del perfil.",
        );
      }
    }, 500);
    return () => window.clearTimeout(librarySyncTimerRef.current);
  }, [account, authenticated, dataLibrary, libraryHydrated]);

  useEffect(() => {
    if (
      !authenticated ||
      !databaseReadyRef.current ||
      !desktop?.syncProjectToDatabase ||
      !hasMeaningfulAnalysis(project) ||
      !account ||
      account.isDemo
    ) {
      return undefined;
    }
    window.clearTimeout(databaseSyncTimerRef.current);
    databaseSyncTimerRef.current = window.setTimeout(async () => {
      const result = await desktop.syncProjectToDatabase({
        project,
        ownerProfileId: account.id,
        isDemo: false,
      });
      if (!result.ok) {
        setDatabaseError(
          result.error || "No se pudo actualizar el histórico local.",
        );
        return;
      }
      if (activeView === "database") {
        const refreshed = await desktop.getDatabaseSnapshot({
          ownerProfileId: account.id,
        });
        if (refreshed.ok) {
          setDatabaseSnapshot(refreshed.snapshot);
          setDatabaseError("");
        }
      }
    }, 650);
    return () => window.clearTimeout(databaseSyncTimerRef.current);
  }, [account, authenticated, activeView, project]);

  useEffect(() => {
    if (
      hasValidMatch(project) &&
      !matchTeams.some((team) => team.id === context.teamId)
    ) {
      setContext((current) => ({
        ...current,
        teamId: project.match.homeTeamId,
        playerId: "",
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
        notify(
          "No se encuentra el vídeo original. Puedes volver a seleccionarlo.",
        );
      }
    }
    restoreVideo();
    return () => {
      active = false;
      window.clearTimeout(noticeTimer.current);
    };
  }, [project.video?.path]);

  useEffect(
    () => () => {
      if (webVideoObjectUrlRef.current) {
        URL.revokeObjectURL(webVideoObjectUrlRef.current);
      }
    },
    [],
  );

  function seekTo(seconds) {
    const video = videoRef.current;
    if (!video) {
      pendingSeekRef.current = Math.max(0, Number(seconds) || 0);
      setCurrentTime(Math.max(0, Number(seconds) || 0));
      return;
    }
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
    const duration =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : 0;
    if (
      duration > 0 &&
      Math.abs(duration - (project.video?.duration || 0)) > 0.01
    ) {
      updateProject((current) => ({
        ...current,
        video: current.video ? { ...current.video, duration } : current.video,
      }));
    }
    return duration;
  }

  function finishPreparingVideo(video) {
    video.playbackRate = playbackRate;
    video.volume = volume;
    video.muted = muted;
    const pending = pendingSeekRef.current;
    if (pending !== null) {
      window.setTimeout(() => seekTo(pending), 0);
    }
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video
        .play()
        .catch(() => notify("El vídeo no pudo comenzar a reproducirse."));
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
    const { smallStep, mediumStep, largeStep, frameRate } =
      preferences.playback;
    const video = videoRef.current;
    const position =
      video && Number.isFinite(video.currentTime)
        ? video.currentTime
        : currentTime;
    const orderedEvents = project.events
      .slice()
      .sort((left, right) => left.start - right.start);
    const previousEvent = orderedEvents
      .slice()
      .reverse()
      .find((event) => event.start < position - 0.05);
    const nextEvent = orderedEvents.find(
      (event) => event.start > position + 0.05,
    );
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
        const next = !muted;
        setMuted(next);
        if (video) video.muted = next;
      },
      volumeDown: () => {
        const next = clamp(volume - 0.1, 0, 1);
        setVolume(next);
        setMuted(false);
        if (video) {
          video.volume = next;
          video.muted = false;
        }
      },
      volumeUp: () => {
        const next = clamp(volume + 0.1, 0, 1);
        setVolume(next);
        setMuted(false);
        if (video) {
          video.volume = next;
          video.muted = false;
        }
      },
      previousEvent: () => seekTo(previousEvent?.start ?? 0),
      nextEvent: () => seekTo(nextEvent?.start ?? project.video?.duration ?? 0),
      videoStart: () => seekTo(0),
      videoEnd: () => seekTo(project.video?.duration || 0),
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
      mute: muted ? "Activar sonido" : "Silenciar",
      volumeDown: "Vol −",
      volumeUp: "Vol +",
      previousEvent: "Evento ←",
      nextEvent: "Evento →",
      videoStart: "Inicio",
      videoEnd: "Final",
    };
    return (
      labels[id] || playbackControls.find((item) => item.id === id)?.label || id
    );
  }

  function addEvent(event) {
    commitEvents([...project.events, event]);
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
    const spatialEnabled = preferences.layout.shotCourtVisible !== false;
    const expectedPoints = shotTagPoints(tag);
    const selectedZone = spatialEnabled
      ? shotZoneById(context.shotZoneId)
      : null;
    if (
      selectedZone &&
      expectedPoints &&
      selectedZone.points !== expectedPoints
    ) {
      notify(
        `Selecciona una zona de ${expectedPoints} puntos o desmarca la zona actual.`,
      );
      return;
    }
    const metric = eventMetric(tag);
    const shotContext = {
      ...eventContext,
      metric,
      shotPoints: expectedPoints || (/^(made|missed)1$/.test(metric) ? 1 : 0),
      shotZoneId: isShotTag(tag) && spatialEnabled ? context.shotZoneId : "",
      shotZoneName:
        isShotTag(tag) && spatialEnabled ? selectedZone?.name || "" : "",
    };
    const time = video.currentTime;
    const duration = video.duration || project.video.duration || 0;

    if (tag.mode === "point") {
      const event = createPointEvent(tag, time, duration, shotContext);
      addEvent(event);
      notify(`${tag.name} registrada en ${formatTime(time, true)}.`);
      return;
    }

    const active = activeIntervals[tag.id];
    if (!active) {
      setActiveIntervals((current) => ({
        ...current,
        [tag.id]: { start: time, context: { ...shotContext } },
      }));
      notify(`${tag.name}: intervalo iniciado.`);
      return;
    }

    const event = createIntervalEvent(
      tag,
      active.start,
      time,
      duration,
      active.context,
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
      if (
        document.querySelector('[role="dialog"]') ||
        !authenticated ||
        !workspaceReady ||
        activeView !== "tagging" ||
        isEditing ||
        showTagEditor ||
        editingEvent ||
        showExportClips ||
        showUserGuide ||
        commandOpen ||
        busy ||
        !hasValidMatch(project) ||
        event.repeat
      )
        return;

      const pressed = eventToShortcut(event);
      const navigationAction = Object.entries(preferences.shortcuts).find(
        ([, shortcut]) => shortcut && shortcut === pressed,
      );
      if (navigationAction) {
        event.preventDefault();
        executePlaybackAction(navigationAction[0]);
        return;
      }
      const matchingTag = project.template.tags.find(
        (tag) =>
          tag.shortcut && tag.shortcut.toUpperCase() === pressed.toUpperCase(),
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
      if (!authenticated || !workspaceReady) return;
      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (modifier && key === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
        return;
      }
      if (modifier && key === "s") {
        event.preventDefault();
        saveProject();
        return;
      }
      const editing =
        /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) ||
        event.target.isContentEditable;
      if (
        !editing &&
        !showTagEditor &&
        !editingEvent &&
        !showExportClips &&
        !commandOpen &&
        modifier &&
        key === "z"
      ) {
        event.preventDefault();
        event.shiftKey ? redoEvents() : undoEvents();
      }
    }
    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  });

  async function chooseVideo() {
    setActiveView("tagging");
    if (!desktop) {
      webVideoInputRef.current?.click();
      return;
    }
    if (
      project.events.length > 0 &&
      !window.confirm(
        "Cambiar de vídeo mantendrá las etiquetas actuales. ¿Continuar?",
      )
    ) {
      return;
    }
    const result = await desktop.selectVideo();
    if (result.canceled) return;
    if (result.error || !result.video) {
      notify(result.error || "No se pudo abrir el vídeo.");
      return;
    }
    pendingSeekRef.current = null;
    setVideoUrl(result.video.url);
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveIntervals({});
    updateProject((current) => ({
      ...current,
      video: {
        path: result.video.path,
        name: result.video.name,
        duration: 0,
      },
    }));
  }

  function loadWebVideo(file) {
    if (!file) return;
    if (
      project.events.length > 0 &&
      !window.confirm(
        "Cambiar de vídeo mantendrá las etiquetas actuales. ¿Continuar?",
      )
    ) {
      return;
    }
    if (webVideoObjectUrlRef.current) {
      URL.revokeObjectURL(webVideoObjectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    webVideoObjectUrlRef.current = url;
    pendingSeekRef.current = null;
    setVideoUrl(url);
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveIntervals({});
    updateProject((current) => ({
      ...current,
      video: {
        path: "",
        name: file.name,
        duration: 0,
        source: "browser-local",
      },
    }));
  }

  async function openProject() {
    if (!confirmLeave()) return false;
    if (!desktop) {
      webProjectInputRef.current?.click();
      return false;
    }
    const result = await desktop.openProject();
    if (result.canceled) return false;
    if (result.error) {
      notify(result.error);
      return false;
    }
    let migrated;
    try {
      migrated = migrateProject(result.project);
    } catch (error) {
      notify(error.message);
      return false;
    }
    setProject(migrated);
    setProjectFilePath(result.filePath);
    setSelectedEventIds(new Set());
    setActiveIntervals({});
    setCurrentTime(Number(migrated.playbackPosition) || 0);
    pendingSeekRef.current = Number(migrated.playbackPosition) || 0;
    setSessionSaved(migrated.updatedAt);
    setVideoUrl(result.video?.url || "");
    setContext({
      ...emptyContext,
      teamId: migrated.match?.homeTeamId || "",
    });
    notify(
      result.video
        ? "Análisis abierto."
        : "Análisis abierto, pero falta localizar el vídeo original.",
    );
    return true;
  }

  async function loadWebProject(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || !Array.isArray(parsed.events) || !parsed.template) {
        throw new Error("El archivo no contiene un análisis válido.");
      }
      const migrated = migrateProject(parsed);
      setProject(migrated);
      setProjectFilePath("");
      setSelectedEventIds(new Set());
      setActiveIntervals({});
      setCurrentTime(Number(migrated.playbackPosition) || 0);
      pendingSeekRef.current = Number(migrated.playbackPosition) || 0;
      setSessionSaved(migrated.updatedAt);
      setVideoUrl("");
      setContext({ ...emptyContext, teamId: migrated.match?.homeTeamId || "" });
      setWorkspaceReady(true);
      notify(
        "Análisis abierto. Selecciona de nuevo el vídeo local para reproducirlo.",
      );
    } catch (error) {
      notify(error.message || "No se pudo abrir el análisis.");
    }
  }

  async function saveProject() {
    if (busy) return;
    if (!desktop) {
      downloadText(
        `${safeDownloadName(project.projectName)}.scout.json`,
        JSON.stringify({ ...project, playbackPosition: currentTime }, null, 2),
        "application/json;charset=utf-8",
      );
      setSessionSaved(project.updatedAt);
      notify("Análisis descargado en este dispositivo.");
      return;
    }
    const result = await desktop.saveProject({
      project: { ...project, playbackPosition: currentTime },
      filePath: projectFilePath,
    });
    if (result.canceled) return;
    if (result.error) {
      notify(result.error);
      return;
    }
    setProjectFilePath(result.filePath);
    setSessionSaved(project.updatedAt);
    if (
      !account?.isDemo &&
      account?.id &&
      hasValidMatch(project) &&
      project.events.length > 0 &&
      desktop.finalizeProject
    ) {
      const finalized = await desktop.finalizeProject({
        project,
        ownerProfileId: account.id,
        isDemo: false,
      });
      if (!finalized.ok) {
        notify(
          finalized.error ||
            "El archivo se guardó, pero no se pudo actualizar el histórico.",
        );
        return;
      }
      await refreshDatabase();
      notify("Análisis e histórico estadístico guardados.");
      return;
    }
    notify(
      account?.isDemo
        ? "Análisis guardado. La demo no conserva un histórico de perfil."
        : "Análisis guardado.",
    );
  }

  async function refreshDatabase() {
    if (!desktop?.getDatabaseSnapshot) {
      notify("La biblioteca web ya está actualizada en este dispositivo.");
      return;
    }
    setDatabaseLoading(true);
    try {
      const result = await desktop.getDatabaseSnapshot({
        ownerProfileId: account?.isDemo ? "" : account?.id || "",
      });
      if (result.ok) {
        setDatabaseSnapshot(result.snapshot);
        setDatabaseError("");
      } else {
        setDatabaseError(
          result.error || "No se pudo actualizar la biblioteca.",
        );
      }
    } finally {
      setDatabaseLoading(false);
    }
  }

  async function backupDatabase() {
    if (!desktop?.backupDatabase) {
      notify("La copia SQLite está disponible en la aplicación de escritorio.");
      return;
    }
    const result = await desktop.backupDatabase();
    if (result.error) {
      notify(result.error);
    } else if (!result.canceled) {
      notify("Copia de seguridad creada.");
      desktop.revealFile(result.filePath);
    }
  }

  function newProject() {
    if (!confirmLeave()) return;
    setProject(createProjectFromDataLibrary(dataLibrary));
    setProjectFilePath("");
    setVideoUrl("");
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveIntervals({});
    setSelectedEventIds(new Set());
    setContext({ ...emptyContext });
    setActiveView("overview");
    notify("Nuevo análisis creado.");
  }

  function startNewSession() {
    if (!confirmLeave()) return;
    setProject(createProjectFromDataLibrary(dataLibrary));
    setProjectFilePath("");
    setVideoUrl("");
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveIntervals({});
    setSelectedEventIds(new Set());
    setContext({ ...emptyContext });
    setActiveView("overview");
    setWorkspaceReady(true);
  }

  async function openSessionFromGate() {
    const opened = await openProject();
    if (opened) setWorkspaceReady(true);
  }

  function startDemoSession() {
    const demoAccount = {
      id: "demo-session",
      name: "Analista demo",
      email: "demo@tactovia.local",
      club: "Espacio de demostración",
      role: "Demo",
      avatar: "",
      isDemo: true,
    };
    setAccount(demoAccount);
    setDataLibrary({
      teams: defaultTeams.map(enrichTeam),
      competitions: [],
      freeAgents: [],
      libraryFolders: [],
    });
    setPreferences(structuredClone(defaultPreferences));
    setAuthenticated(true);
    setSelectedSport("");
    setProject(createBlankProject());
    setProjectFilePath("");
    setVideoUrl("");
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveIntervals({});
    setSelectedEventIds(new Set());
    setContext({ ...emptyContext });
    setActiveView("tagging");
    setWorkspaceReady(false);
  }

  function logout() {
    if (!confirmLeave()) return;
    setLibraryHydrated(!desktop);
    if (account?.isDemo) {
      setAccount(readLocalAccount());
      setProject(createBlankProject());
    }
    setAuthenticated(false);
    setSelectedSport("");
    setWorkspaceReady(false);
  }

  function deleteEvent(id) {
    commitEvents(project.events.filter((event) => event.id !== id));
    notify("Acción eliminada. Puedes deshacer el cambio.");
  }
  function toggleFavorite(id) {
    commitEvents(
      project.events.map((event) =>
        event.id === id ? { ...event, favorite: !event.favorite } : event,
      ),
    );
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
        : new Set(project.events.map((event) => event.id)),
    );
  }

  async function exportCsv() {
    if (project.events.length === 0) {
      notify("Todavía no hay acciones para exportar.");
      return;
    }
    if (!desktop) {
      downloadText(
        `${safeDownloadName(project.projectName)}-eventos.csv`,
        `\uFEFF${projectToCsv(project)}`,
        "text/csv;charset=utf-8",
      );
      notify("Datos CSV descargados.");
      return;
    }
    const result = await desktop.exportCsv({
      projectName: project.projectName,
      csv: projectToCsv(project),
    });
    if (!result.canceled) {
      notify("Datos CSV exportados.");
      desktop.revealFile(result.filePath);
    }
  }

  async function exportXlsx() {
    if (!desktop) {
      notify(
        "Excel y Power BI requieren la aplicación de escritorio; en web puedes exportar CSV.",
      );
      return;
    }
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

  async function exportPowerBi(sourceProject = project) {
    if (!desktop?.exportPowerBi) {
      notify(
        "La exportación Power BI está disponible en la aplicación de escritorio.",
      );
      return;
    }
    setBusy("Preparando modelo para Power BI…");
    try {
      const result = await desktop.exportPowerBi({ project: sourceProject });
      if (result.error) {
        notify(result.error);
      } else if (!result.canceled) {
        notify("Modelo normalizado para Power BI exportado.");
        desktop.revealFile(result.filePath);
      }
    } finally {
      setBusy("");
    }
  }

  function exportData() {
    if (dataExportFormat === "csv") return exportCsv();
    if (dataExportFormat === "powerbi") return exportPowerBi();
    return exportXlsx();
  }

  function createHistoricalProject(scope = {}) {
    const allRecords = databaseSnapshot?.gameRecords || [];
    const records = allRecords.filter((record) => {
      if (scope.type === "team") {
        return [record.match?.homeTeamId, record.match?.awayTeamId].includes(
          scope.id,
        );
      }
      if (scope.type === "player") {
        return record.events.some((event) => event.playerId === scope.id);
      }
      return true;
    });
    const teamMap = new Map();
    const events = [];
    const tagMap = new Map();
    records.forEach((record, recordIndex) => {
      record.teams.forEach((team) => teamMap.set(team.id, team));
      record.events
        .filter((event) =>
          scope.type === "team"
            ? event.teamId === scope.id
            : scope.type === "player"
              ? event.playerId === scope.id
              : true,
        )
        .forEach((event, eventIndex) => {
          const tag = {
            id: event.tagId,
            name: event.tagName,
            color: event.color || "#08756D",
            mode: event.mode || "point",
          };
          tagMap.set(tag.id, tag);
          events.push({
            ...event,
            id: `${record.id}-${event.id || eventIndex}`,
            anchor: recordIndex,
            start: recordIndex,
            end: recordIndex + 0.1,
            recordName: record.projectName,
          });
        });
    });
    return {
      ...createBlankProject([...teamMap.values()]),
      id: crypto.randomUUID(),
      projectName: scope.name
        ? `Histórico de ${scope.name}`
        : `Histórico de ${account?.name || "Tactovia"}`,
      template: { name: "Histórico", tags: [...tagMap.values()] },
      events,
    };
  }

  async function exportHistory(format, scope = {}) {
    const historicalProject = createHistoricalProject(scope);
    if (historicalProject.events.length === 0) {
      notify("Todavía no hay históricos para exportar.");
      return;
    }
    if (!desktop) {
      notify("Los informes históricos requieren la aplicación de escritorio.");
      return;
    }
    if (format === "powerbi") return exportPowerBi(historicalProject);
    if (format === "pdf") {
      setBusy("Preparando informe histórico…");
      try {
        const result = await desktop.exportReportPdf(
          reportPayload(historicalProject),
        );
        if (result.error) {
          notify(result.error);
        } else if (!result.canceled) {
          notify("Informe histórico exportado.");
          desktop.revealFile(result.filePath);
        }
      } finally {
        setBusy("");
      }
      return;
    }
    setBusy("Preparando histórico en Excel…");
    try {
      const result = await desktop.exportXlsx({ project: historicalProject });
      if (result.error) {
        notify(result.error);
      } else if (!result.canceled) {
        notify("Histórico Excel exportado.");
        desktop.revealFile(result.filePath);
      }
    } finally {
      setBusy("");
    }
  }

  async function deleteGameRecord(record) {
    if (
      !account?.id ||
      !window.confirm(
        `¿Eliminar el histórico estadístico “${record.projectName}”? El archivo .scout guardado no se borrará.`,
      )
    ) {
      return;
    }
    const result = await desktop.deleteGameRecord({
      recordId: record.id,
      ownerProfileId: account.id,
    });
    if (!result.ok) {
      notify(result.error || "No se pudo eliminar el histórico.");
      return;
    }
    await refreshDatabase();
    notify("Histórico estadístico eliminado.");
  }

  function foldersForEvent(event, groupBy) {
    const values = {
      tag: [event.tagName || "Sin etiqueta"],
      team: [event.team || "Sin equipo"],
      player: [event.player || "Sin jugador"],
      tagTeam: [event.tagName || "Sin etiqueta", event.team || "Sin equipo"],
      teamPlayer: [event.team || "Sin equipo", event.player || "Sin jugador"],
    };
    return values[groupBy] || [];
  }

  async function exportClips(options) {
    if (!desktop || !project.video?.path) {
      notify("Selecciona el vídeo original.");
      return;
    }
    const playlist = (project.playlists || []).find(
      (p) => p.id === options.playlistId,
    );
    const order = new Map(
      (playlist?.eventIds || []).map((id, index) => [id, index]),
    );
    const scoped =
      options.scope === "playlist"
        ? project.events.filter((e) => order.has(e.id))
        : options.scope === "selected"
          ? project.events.filter((event) => selectedEventIds.has(event.id))
          : project.events;
    const selected = scoped.filter((event) => {
      if (options.tagId && (event.tagId || event.tagName) !== options.tagId)
        return false;
      if (options.teamId && (event.teamId || event.team) !== options.teamId)
        return false;
      if (
        options.playerId &&
        (event.playerId || event.player) !== options.playerId
      )
        return false;
      return true;
    });
    const events = selected.slice().sort((left, right) => {
      if (options.sortBy === "playlist")
        return (order.get(left.id) || 0) - (order.get(right.id) || 0);
      const keys = {
        time: ["start"],
        tag: ["tagName", "start"],
        team: ["team", "start"],
        player: ["player", "start"],
      }[options.sortBy] || ["start"];
      for (const key of keys) {
        const result =
          key === "start"
            ? left.start - right.start
            : String(left[key] || "").localeCompare(
                String(right[key] || ""),
                "es",
                {
                  numeric: true,
                },
              );
        if (result !== 0) return result;
      }
      return 0;
    });
    if (events.length === 0) {
      notify("Todavía no hay acciones para exportar.");
      return;
    }
    if (
      project.video?.duration > 0 &&
      events.some((event) => event.start >= project.video.duration)
    ) {
      notify(
        "Hay clips fuera de la duración de este vídeo. Vincula la grabación correcta antes de exportar.",
      );
      return;
    }
    setShowExportClips(false);
    setExportPlaylistId("");
    setBusy(
      `Generando ${events.length} ${events.length === 1 ? "clip" : "clips"}…`,
    );
    try {
      const result = await desktop.exportClips({
        videoPath: project.video.path,
        events: events.map((event) => ({
          start: event.start,
          end:
            project.video?.duration > 0
              ? Math.min(event.end, project.video.duration)
              : event.end,
          tagName: event.tagName,
          timeLabel: formatTime(event.start).replaceAll(":", "-"),
          folders: foldersForEvent(event, options.groupBy),
        })),
        outputMode: options.outputMode || "individual",
        quality: options.quality || "balanced",
        projectName: project.projectName,
      });
      if (result.error) {
        notify(result.error);
      } else if (!result.canceled) {
        notify(
          options.outputMode === "highlights"
            ? "Reel de highlights creado."
            : `${result.files.length} ${result.files.length === 1 ? "clip creado" : "clips creados"}.`,
        );
        if (result.files[0]) desktop.revealFile(result.files[0]);
      }
    } finally {
      setBusy("");
    }
  }

  async function exportReport(options = {}) {
    if (!desktop) {
      notify(
        "La maquetación PDF está disponible en la aplicación de escritorio.",
      );
      return;
    }
    setBusy("Preparando informe…");
    try {
      const result = await desktop.exportReportPdf(
        reportPayload(project, options),
      );
      if (result.error) {
        notify(result.error);
        return;
      }
      if (!result.canceled) {
        notify("Informe PDF exportado.");
        desktop.revealFile(result.filePath);
      }
    } finally {
      setBusy("");
    }
  }

  async function copyExecutiveSummary() {
    const leadingStats = stats
      .slice(0, 6)
      .map((item) => `${item.name}: ${item.count}`)
      .join(" · ");
    const home = project.teams.find(
      (team) => team.id === project.match?.homeTeamId,
    );
    const away = project.teams.find(
      (team) => team.id === project.match?.awayTeamId,
    );
    const summary = [
      project.projectName,
      home && away ? `${home.name} vs ${away.name}` : "",
      `${project.events.length} acciones · ${formatTime(project.video?.duration || 0)} analizados`,
      leadingStats,
      ...automaticAnalysis.teams.flatMap((team) => [
        `\n${team.name}`,
        ...team.conclusions.map((conclusion) => `• ${conclusion}`),
      ]),
      `Generado con Tactovia ${appVersion}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      notify("Resumen copiado. Ya puedes pegarlo en un mensaje o documento.");
    } catch {
      notify("No se pudo copiar el resumen.");
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
        layout: { ...current.layout, tagPanelWidth: width },
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
        layout: { ...current.layout, videoHeight: height },
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
        layout: { ...current.layout, tagButtonHeight: height },
      }));
    }
    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  if (!authenticated || !selectedSport || !workspaceReady) {
    return (
      <>
        {!desktop && (
          <input
            ref={webProjectInputRef}
            className="visually-hidden-file"
            type="file"
            accept=".json,.scout.json,application/json"
            onChange={(event) => {
              loadWebProject(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        )}
        {showBrandSplash && <BrandSplash />}
        <AccessFlow
          onExample={openExample}
          account={account}
          authenticated={authenticated}
          sport={selectedSport}
          project={project}
          canContinue={hasMeaningfulAnalysis(project)}
          onAccountChange={setAccount}
          onAuthenticated={(nextAccount) => {
            setAccount(nextAccount);
            setLibraryHydrated(!desktop);
            setDataLibrary(readDataLibrary(nextAccount.id));
            setProject(readAutosave(nextAccount.id));
            setPreferences(readPreferences(nextAccount.id));
            setProjectFilePath("");
            setVideoUrl("");
            setContext({ ...emptyContext });
            setAuthenticated(true);
          }}
          onDemo={startDemoSession}
          onSelectSport={setSelectedSport}
          onNew={startNewSession}
          onContinue={() => setWorkspaceReady(true)}
          onOpen={openSessionFromGate}
        />
      </>
    );
  }

  return (
    <>
      {showBrandSplash && <BrandSplash />}
      <div
        className={`app-shell studio-shell ${focusMode ? "focus-mode" : ""}`}
      >
        <a className="skip-link" href="#workspace-content">
          Saltar al contenido
        </a>
        <aside className="studio-sidebar">
          <button
            className="studio-brand"
            onClick={() => setActiveView("overview")}
            aria-label="Inicio Tactovia"
          >
            <BrandLogo layout="horizontal" surface="adaptive" />
            <small>STUDIO / {appVersion}</small>
          </button>
          <button
            className="studio-search"
            onClick={() => setCommandOpen(true)}
          >
            <Icon name="search" size={17} />
            <span>Buscar o ir a…</span>
            <kbd>⌘ K</kbd>
          </button>
          <span className="sidebar-label">ESPACIO DE TRABAJO</span>
          <nav aria-label="Secciones">
            {[
              ["overview", "home", "Inicio"],
              ["tagging", "video", "Etiquetado"],
              ["review", "clips", "Sala de revisión"],
              ["stats", "chart", "Estadísticas"],
              ["database", "folder", "Competiciones y equipos"],
              ["report", "export", "Informe y exportación"],
            ].map(([id, icon, label]) => (
              <button
                key={id}
                aria-label={label}
                title={label}
                className={activeView === id ? "active" : ""}
                aria-current={activeView === id ? "page" : undefined}
                onClick={() => {
                  setActiveView(id);
                  if (id === "database" && desktop) refreshDatabase();
                }}
              >
                <Icon name={icon} />
                <span>{label}</span>
                {id === "review" && project.events.length > 0 && (
                  <b>{project.events.length}</b>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-match">
            <span className="sidebar-label">ANÁLISIS ACTIVO</span>
            <strong>{project.projectName}</strong>
            <small>
              {project.events.length}{" "}
              {project.events.length === 1 ? "acción" : "acciones"} ·{" "}
              {(project.playlists || []).length}{" "}
              {(project.playlists || []).length === 1 ? "lista" : "listas"}
            </small>
            <div>
              <i className="status-dot" />
              {account?.isDemo ? "Demo temporal" : saveStatus}
            </div>
          </div>
          <div className="sidebar-bottom">
            <button
              aria-label="Guía y atajos"
              title="Guía y atajos"
              onClick={() => setShowUserGuide(true)}
            >
              <Icon name="help" />
              <span>Guía y atajos</span>
            </button>
            <button
              aria-label="Perfil y ajustes"
              title="Perfil y ajustes"
              className={activeView === "profile" ? "active" : ""}
              onClick={() => setActiveView("profile")}
            >
              <Icon name="settings" />
              <span>Perfil y ajustes</span>
            </button>
            <button
              className="sidebar-account"
              onClick={() => setActiveView("profile")}
            >
              <i>{accountInitials(account)}</i>
              <span>
                <strong>{account?.name}</strong>
                <small>
                  {account?.isDemo
                    ? "Sesión de demostración"
                    : "Espacio personal"}
                </small>
              </span>
            </button>
          </div>
        </aside>
        <header className="studio-topbar">
          <div className="workspace-breadcrumb">
            <span>Baloncesto</span>
            <span>/</span>
            <input
              className="project-title"
              title={project.projectName}
              value={project.projectName}
              onChange={(event) =>
                updateProject((current) => ({
                  ...current,
                  projectName: event.target.value,
                }))
              }
              aria-label="Nombre del análisis"
            />
          </div>
          <div className="studio-top-actions">
            <ThemeSelector value={themeMode} onChange={setThemeMode} compact />
            <button
              aria-label="Nuevo análisis"
              className="button ghost compact-action"
              onClick={newProject}
            >
              <Icon name="plus" size={16} />
              <span>Nuevo</span>
            </button>
            <button
              aria-label="Abrir análisis"
              className="button ghost compact-action"
              onClick={openProject}
            >
              <Icon name="folder" size={16} />
              <span>Abrir</span>
            </button>
            <button
              className="button primary"
              onClick={saveProject}
              disabled={Boolean(busy)}
            >
              <Icon name="check" size={16} />
              {sessionSaved === project.updatedAt ? "Guardado" : "Guardar"}
            </button>
          </div>
        </header>

        <main className="main-area" id="workspace-content">
          {activeView === "overview" && (
            <WorkspaceOverview
              project={project}
              library={dataLibrary}
              onNavigate={setActiveView}
              onVideo={chooseVideo}
              onOpen={openProject}
              onExample={openExample}
              onNotes={(analysisNotes) =>
                updateProject((current) => ({ ...current, analysisNotes }))
              }
              onSeek={(event) => {
                setSelectedEventIds(new Set([event.id]));
                setActiveView("review");
              }}
            />
          )}
          {activeView === "review" && (
            <ReviewRoom
              project={project}
              videoUrl={videoUrl}
              selectedIds={selectedEventIds}
              onSelectIds={setSelectedEventIds}
              onFavorite={toggleFavorite}
              onEdit={setEditingEvent}
              onPlaylists={(playlists) =>
                updateProject((current) => ({ ...current, playlists }))
              }
              onExport={(playlistId) => {
                setExportPlaylistId(playlistId || "");
                setShowExportClips(true);
              }}
              onRelink={chooseVideo}
            />
          )}

          {activeView === "tagging" && (
            <>
              <header className="tagging-page-header">
                <div>
                  <span className="eyebrow">Observación y registro</span>
                  <h1>Etiquetado</h1>
                </div>
                <div>
                  <button
                    className="button ghost"
                    aria-pressed={focusMode}
                    onClick={() => setFocusMode(!focusMode)}
                  >
                    <Icon name="video" size={16} />
                    {focusMode ? "Salir del enfoque" : "Modo enfoque"}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => setActiveView("review")}
                  >
                    Revisar clips <Icon name="arrow" size={15} />
                  </button>
                </div>
              </header>
              <div
                className="workbench"
                style={{
                  gridTemplateColumns: `minmax(0, 1fr) 8px min(${preferences.layout.tagPanelWidth}px, 40vw)`,
                }}
              >
                <section className="video-column">
                  {videoUrl && hasValidMatch(project) && (
                    <div className="active-match-strip">
                      {matchTeams.map((team, index) => (
                        <div
                          key={team.id}
                          style={{ "--match-color": team.primaryColor }}
                        >
                          {team.logo ? (
                            <img src={team.logo} alt="" />
                          ) : (
                            <i>{team.shortName}</i>
                          )}
                          <strong>{team.name}</strong>
                          {index === 0 && <span>vs</span>}
                        </div>
                      ))}
                      <button
                        className="mini-button"
                        onClick={() => {
                          if (project.events.length) {
                            notify(
                              "Crea un nuevo análisis para cambiar los equipos de un partido ya etiquetado.",
                            );
                            return;
                          }
                          updateProject((current) => ({
                            ...current,
                            match: null,
                          }));
                        }}
                      >
                        Configurar partido
                      </button>
                      <button className="mini-button" onClick={chooseVideo}>
                        Cambiar vídeo
                      </button>
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
                          if (!scrubbingRef.current)
                            setCurrentTime(event.currentTarget.currentTime);
                        }}
                        onSeeking={(event) =>
                          setCurrentTime(event.currentTarget.currentTime)
                        }
                        onSeeked={(event) =>
                          setCurrentTime(event.currentTarget.currentTime)
                        }
                        onError={() =>
                          notify(
                            "No se pudo leer este vídeo. Comprueba el formato del archivo.",
                          )
                        }
                        onLoadedMetadata={(event) => {
                          const duration = synchronizeVideoDuration(
                            event.currentTarget,
                          );
                          finishPreparingVideo(event.currentTarget);
                          if (
                            pendingSeekRef.current === null &&
                            currentTime > 0
                          ) {
                            event.currentTarget.currentTime = Math.min(
                              currentTime,
                              duration || currentTime,
                            );
                          }
                          if (duration === 0) {
                            notify("Leyendo la duración del vídeo…");
                          }
                        }}
                        onDurationChange={(event) =>
                          synchronizeVideoDuration(event.currentTarget)
                        }
                        onCanPlay={(event) =>
                          finishPreparingVideo(event.currentTarget)
                        }
                      />
                    ) : (
                      <div className="video-empty">
                        <div className="empty-ball">◉</div>
                        <h2>Selecciona un vídeo</h2>
                        <button
                          className="button primary large"
                          onClick={chooseVideo}
                        >
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
                        value={clamp(
                          currentTime,
                          0,
                          project.video?.duration || 0,
                        )}
                        onPointerDown={() => {
                          scrubbingRef.current = true;
                        }}
                        onInput={(event) => {
                          const target = Number(event.currentTarget.value);
                          setCurrentTime(target);
                          seekTo(target);
                        }}
                        onChange={(event) =>
                          seekTo(Number(event.currentTarget.value))
                        }
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
                          title={
                            playbackControls.find(
                              (item) => item.id === controlId,
                            )?.label
                          }
                        >
                          {playbackControlLabel(controlId)}
                        </button>
                      ))}
                      {playbackRate !== 1 && (
                        <span
                          className="playback-rate-readout"
                          aria-live="polite"
                        >
                          Velocidad {playbackRate}×
                        </span>
                      )}
                      <div className="audio-control">
                        <button
                          className={muted || volume === 0 ? "muted" : ""}
                          onClick={() => executePlaybackAction("mute")}
                          aria-label={
                            muted ? "Activar sonido" : "Silenciar sonido"
                          }
                          title={muted ? "Activar sonido" : "Silenciar sonido"}
                        >
                          <Icon
                            name={muted || volume === 0 ? "muted" : "volume"}
                            size={18}
                          />
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={muted ? 0 : volume}
                          onChange={(event) => {
                            const next = Number(event.currentTarget.value);
                            setVolume(next);
                            setMuted(next === 0);
                            if (videoRef.current) {
                              videoRef.current.volume = next;
                              videoRef.current.muted = next === 0;
                            }
                          }}
                          aria-label="Volumen del vídeo"
                        />
                        <span>{Math.round((muted ? 0 : volume) * 100)}%</span>
                      </div>
                      <button
                        className="shortcut-help-button"
                        onClick={() => setShowUserGuide(true)}
                        title="Ver guía de atajos"
                      >
                        <kbd>?</kbd> Atajos
                      </button>
                    </div>
                  </div>
                  <section
                    className="live-tagging-strip"
                    aria-label="Resumen del etiquetado"
                  >
                    {(preferences.layout.liveModules || []).includes(
                      "actions",
                    ) && (
                      <div>
                        <span>Acciones etiquetadas</span>
                        <strong>{project.events.length}</strong>
                        <small>registros de este partido</small>
                      </div>
                    )}
                    {(preferences.layout.liveModules || []).includes(
                      "tagTypes",
                    ) && (
                      <div>
                        <span>Etiquetas utilizadas</span>
                        <strong>{liveTaggingSummary.tagTypes}</strong>
                        <small>tipos con al menos una acción</small>
                      </div>
                    )}
                    {(preferences.layout.liveModules || []).includes(
                      "players",
                    ) && (
                      <div>
                        <span>Jugadores implicados</span>
                        <strong>{liveTaggingSummary.activePlayers}</strong>
                        <small>identificados en las acciones</small>
                      </div>
                    )}
                    {(preferences.layout.liveModules || []).includes(
                      "taggedTime",
                    ) && (
                      <div>
                        <span>Tiempo de clips</span>
                        <strong>
                          {formatTime(liveTaggingSummary.taggedSeconds)}
                        </strong>
                        <small>tiempo cubierto sin solapamientos</small>
                      </div>
                    )}
                    {(preferences.layout.liveModules || []).includes(
                      "zones",
                    ) && (
                      <div>
                        <span>Zonas utilizadas</span>
                        <strong>{liveTaggingSummary.activeZones}</strong>
                        <small>áreas con tiros registrados</small>
                      </div>
                    )}
                    {(preferences.layout.liveModules || []).includes(
                      "score",
                    ) && (
                      <div className="live-score-module">
                        <span>Marcador etiquetado</span>
                        <strong>
                          {matchTeams[0]?.shortName || "LOC"}{" "}
                          {liveTaggingSummary.teamScores[matchTeams[0]?.id] ||
                            0}
                          <i>–</i>
                          {liveTaggingSummary.teamScores[matchTeams[1]?.id] ||
                            0}{" "}
                          {matchTeams[1]?.shortName || "VIS"}
                        </strong>
                        <small>calculado desde canastas registradas</small>
                      </div>
                    )}
                    {(preferences.layout.liveModules || []).includes(
                      "pace",
                    ) && (
                      <div>
                        <span>Ritmo</span>
                        <strong>{liveTaggingSummary.rate}</strong>
                        <small>
                          {project.events.length} acciones · por minuto
                        </small>
                      </div>
                    )}
                    {(preferences.layout.liveModules || []).includes(
                      "shooting",
                    ) && (
                      <div>
                        <span>Acierto de tiro</span>
                        <strong>{liveTaggingSummary.shotPercentage}%</strong>
                        <small>
                          {liveTaggingSummary.shots} intentos registrados
                        </small>
                      </div>
                    )}
                    {(preferences.layout.liveModules || []).includes(
                      "coverage",
                    ) && (
                      <div>
                        <span>Cobertura</span>
                        <strong>
                          {liveTaggingSummary.identifiedPercentage}%
                        </strong>
                        <small>acciones con jugador</small>
                      </div>
                    )}
                    {(preferences.layout.liveModules || []).includes(
                      "latest",
                    ) && (
                      <button
                        className="live-last-event"
                        disabled={!liveTaggingSummary.latest}
                        onClick={() =>
                          liveTaggingSummary.latest &&
                          seekTo(liveTaggingSummary.latest.start)
                        }
                      >
                        <span>Última acción</span>
                        <strong>
                          {liveTaggingSummary.latest?.tagName ||
                            "Todavía sin acciones"}
                        </strong>
                        <small>
                          {liveTaggingSummary.latest
                            ? `${formatTime(liveTaggingSummary.latest.start, true)} · volver al momento`
                            : "Empieza a etiquetar para verla aquí"}
                        </small>
                      </button>
                    )}
                  </section>
                </section>

                <div
                  className="panel-resizer"
                  onPointerDown={startPanelResize}
                  aria-label="Arrastrar para cambiar el ancho del panel de etiquetas"
                />

                <aside
                  className="tagging-panel"
                  style={{
                    "--active-team-color":
                      selectedTeam?.primaryColor || "#2dd4bf",
                  }}
                >
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">Registro rápido</span>
                      <h2>Etiquetas</h2>
                    </div>
                    <button
                      className="mini-button"
                      onClick={() => setShowTagEditor(true)}
                    >
                      Configurar
                    </button>
                  </div>

                  <div
                    className="period-selector"
                    aria-label="Periodo del partido"
                  >
                    <span>Periodo</span>
                    {periods.map((period) => (
                      <button
                        key={period}
                        className={context.period === period ? "active" : ""}
                        onClick={() =>
                          setContext((current) => ({ ...current, period }))
                        }
                      >
                        {period.startsWith("OT") ? period : `${period}Q`}
                      </button>
                    ))}
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
                            playerId: "",
                          }))
                        }
                      >
                        <option value="">Sin indicar</option>
                        {matchTeams.map((team) => (
                          <option value={team.id} key={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field span-two">
                      <span>Nota rápida</span>
                      <input
                        placeholder="Comentario opcional"
                        value={context.notes}
                        onChange={(event) =>
                          setContext((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="tagging-player-selector">
                    <header>
                      <span>Jugador</span>
                      <button
                        className={`mini-button ${!context.playerId ? "active" : ""}`}
                        onClick={() =>
                          setContext((current) => ({
                            ...current,
                            playerId: "",
                          }))
                        }
                      >
                        Sin indicar
                      </button>
                    </header>
                    <div>
                      {sortPlayersByNumber(activeRosterPlayers).map(
                        (player) => (
                          <PlayerJersey
                            key={player.id}
                            player={player}
                            team={selectedTeam}
                            selected={context.playerId === player.id}
                            compact
                            onClick={() =>
                              setContext((current) => ({
                                ...current,
                                playerId:
                                  current.playerId === player.id
                                    ? ""
                                    : player.id,
                              }))
                            }
                          />
                        ),
                      )}
                    </div>
                  </div>

                  {preferences.layout.shotCourtVisible !== false &&
                    (preferences.layout.shotCourtPosition || "above") ===
                      "above" && (
                      <ShotCourtSelector
                        value={context.shotZoneId}
                        events={project.events}
                        onChange={(shotZoneId) =>
                          setContext((current) => ({ ...current, shotZoneId }))
                        }
                        showLabels={
                          preferences.layout.shotCourtLabels !== false
                        }
                        compact
                      />
                    )}

                  <div
                    className="tag-grid"
                    style={{
                      gridTemplateColumns: `repeat(${preferences.layout.tagColumns}, minmax(0, 1fr))`,
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
                            minHeight: `${preferences.layout.tagButtonHeight}px`,
                          }}
                          onClick={() => handleTag(tag)}
                          disabled={!videoUrl || !hasValidMatch(project)}
                        >
                          <span className="tag-dot" />
                          <span className="tag-name">
                            {active ? `Finalizar ${tag.name}` : tag.name}
                          </span>
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
                  {preferences.layout.shotCourtVisible !== false &&
                    preferences.layout.shotCourtPosition === "below" && (
                      <ShotCourtSelector
                        value={context.shotZoneId}
                        events={project.events}
                        onChange={(shotZoneId) =>
                          setContext((current) => ({ ...current, shotZoneId }))
                        }
                        showLabels={
                          preferences.layout.shotCourtLabels !== false
                        }
                        compact
                      />
                    )}
                  <div
                    className="tag-size-resizer"
                    onPointerDown={startTagResize}
                    aria-label="Arrastrar para cambiar la altura de las etiquetas"
                  />

                  <div className="tagging-actions">
                    <button
                      className="button ghost"
                      aria-label="Deshacer"
                      onClick={undoEvents}
                      disabled={!history.past.length}
                    >
                      <Icon name="undo" size={16} /> Deshacer
                    </button>
                    <button
                      className="button ghost"
                      aria-label="Rehacer"
                      onClick={redoEvents}
                      disabled={!history.future.length}
                    >
                      <Icon name="redo" size={16} /> Rehacer
                    </button>
                  </div>
                </aside>
              </div>

              <Timeline
                currentTime={currentTime}
                duration={project.video?.duration || 0}
                events={project.events}
                teams={project.teams}
                tags={project.template.tags}
                selectedIds={selectedEventIds}
                onSeek={seekTo}
                onToggleSelected={toggleSelected}
                onEdit={setEditingEvent}
                onDelete={deleteEvent}
                onFavorite={toggleFavorite}
              />
            </>
          )}

          {activeView === "stats" && <StatsPanel project={project} />}

          {activeView === "database" && (
            <ScoutingLibrary
              snapshot={databaseSnapshot}
              loading={databaseLoading}
              error={databaseError}
              teams={dataLibrary.teams}
              competitions={dataLibrary.competitions || []}
              folders={dataLibrary.libraryFolders || []}
              freeAgents={dataLibrary.freeAgents || []}
              onTeamsChange={(teams) =>
                setDataLibrary((current) => ({ ...current, teams }))
              }
              onCompetitionsChange={(competitions) =>
                setDataLibrary((current) => ({ ...current, competitions }))
              }
              onFoldersChange={(libraryFolders) =>
                setDataLibrary((current) => ({ ...current, libraryFolders }))
              }
              onFreeAgentsChange={(freeAgents) =>
                setDataLibrary((current) => ({ ...current, freeAgents }))
              }
              onRefresh={refreshDatabase}
              onBackup={backupDatabase}
              onDeleteRecord={deleteGameRecord}
              onExportHistory={exportHistory}
            />
          )}

          {activeView === "profile" && (
            <ProfilePanel
              appVersion={appVersion}
              account={account}
              onAccountChange={setAccount}
              onLogout={logout}
              preferences={preferences}
              onPreferencesChange={setPreferences}
              tags={project.template.tags}
              themeMode={themeMode}
              resolvedTheme={resolvedTheme}
              onThemeModeChange={setThemeMode}
              paletteMode={paletteMode}
              onPaletteModeChange={setPaletteMode}
            />
          )}

          {activeView === "report" && (
            <ReportCenter
              project={project}
              stats={stats}
              selectedEventIds={selectedEventIds}
              dataExportFormat={dataExportFormat}
              onDataExportFormat={setDataExportFormat}
              onExportData={exportData}
              onToggleSelectAll={toggleSelectAll}
              onConfigureClips={() => setShowExportClips(true)}
              automaticAnalysis={automaticAnalysis}
              desktopAvailable={Boolean(desktop)}
              onExportAnalysis={() =>
                exportReport({ mode: "intelligence", automaticAnalysis })
              }
              onExportVisualReport={() =>
                exportReport({ mode: "visual", automaticAnalysis })
              }
              onCopySummary={copyExecutiveSummary}
            />
          )}
        </main>

        {activeView === "tagging" && videoUrl && !hasValidMatch(project) && (
          <MatchSetup
            teams={project.teams}
            initialMatch={project.match}
            onTeamsChange={(teams) => {
              updateProject((current) => ({ ...current, teams }));
              setDataLibrary((current) => ({
                ...current,
                teams: [
                  ...current.teams.filter(
                    (team) => !teams.some((t) => t.id === team.id),
                  ),
                  ...teams,
                ],
              }));
            }}
            onManageTeams={() => setActiveView("database")}
            onConfirm={(match) => {
              updateProject((current) => ({ ...current, match }));
              setContext((current) => ({
                ...current,
                teamId: match.homeTeamId,
                playerId: "",
              }));
              notify("Partido vinculado al vídeo.");
            }}
          />
        )}

        {showTagEditor && (
          <TagEditor
            tags={project.template.tags}
            courtOptions={{
              visible: preferences.layout.shotCourtVisible,
              showLabels: preferences.layout.shotCourtLabels,
              position: preferences.layout.shotCourtPosition,
            }}
            onClose={() => setShowTagEditor(false)}
            onSave={(tags, courtOptions) => {
              updateProject((current) => ({
                ...current,
                template: { ...current.template, tags },
              }));
              setPreferences((current) => ({
                ...current,
                layout: {
                  ...current.layout,
                  shotCourtVisible: courtOptions.visible,
                  shotCourtLabels: courtOptions.showLabels,
                  shotCourtPosition: courtOptions.position,
                },
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
              commitEvents(
                project.events.map((event) =>
                  event.id === savedEvent.id ? savedEvent : event,
                ),
              );
              setEditingEvent(null);
              notify("Evento actualizado.");
            }}
          />
        )}

        {showExportClips && (
          <ExportClipsModal
            events={project.events}
            selectedIds={selectedEventIds}
            playlists={project.playlists || []}
            initialPlaylistId={exportPlaylistId}
            onClose={() => {
              setShowExportClips(false);
              setExportPlaylistId("");
            }}
            onExport={exportClips}
          />
        )}

        {showUserGuide && (
          <UserGuide
            shortcuts={preferences.shortcuts}
            onClose={() => setShowUserGuide(false)}
          />
        )}

        {commandOpen && (
          <CommandPalette
            onClose={() => setCommandOpen(false)}
            commands={[
              ...[
                ["overview", "home", "Abrir inicio"],
                ["tagging", "video", "Ir a etiquetado"],
                ["review", "clips", "Revisar clips"],
                ["stats", "chart", "Ver estadísticas"],
                ["database", "folder", "Abrir biblioteca"],
                ["report", "export", "Preparar informes"],
                ["profile", "settings", "Perfil y ajustes"],
              ].map(([id, icon, label]) => ({
                id,
                icon,
                label,
                action: () => setActiveView(id),
              })),
              {
                id: "save",
                icon: "check",
                label: "Guardar análisis",
                hint: "⌘ S",
                action: saveProject,
              },
              {
                id: "open",
                icon: "folder",
                label: "Abrir archivo guardado",
                action: openProject,
              },
              {
                id: "video",
                icon: "video",
                label: "Vincular vídeo local",
                action: chooseVideo,
              },
              {
                id: "tags",
                icon: "settings",
                label: "Configurar etiquetas",
                action: () => setShowTagEditor(true),
              },
              {
                id: "map",
                icon: "court",
                label: preferences.layout.shotCourtVisible
                  ? "Ocultar mapa de tiro"
                  : "Mostrar mapa de tiro",
                action: () =>
                  setPreferences((current) => ({
                    ...current,
                    layout: {
                      ...current.layout,
                      shotCourtVisible: !current.layout.shotCourtVisible,
                    },
                  })),
              },
              {
                id: "help",
                icon: "help",
                label: "Guía y atajos",
                action: () => setShowUserGuide(true),
              },
              {
                id: "logout",
                icon: "shield",
                label: "Cerrar sesión",
                action: logout,
              },
            ]}
          />
        )}
        {notice && (
          <div className="toast" role="status">
            <Icon name="check" size={18} />
            {notice}
          </div>
        )}
        {busy && (
          <div className="busy-overlay">
            <div className="spinner" />
            <strong>{busy}</strong>
          </div>
        )}
        {!desktop && (
          <>
            <input
              ref={webVideoInputRef}
              className="visually-hidden-file"
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/ogg,video/*"
              onChange={(event) => {
                loadWebVideo(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <input
              ref={webProjectInputRef}
              className="visually-hidden-file"
              type="file"
              accept=".json,.scout.json,application/json"
              onChange={(event) => {
                loadWebProject(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </>
        )}
      </div>
    </>
  );
}

export default App;
