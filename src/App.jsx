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
  statisticsFor
} from "./lib/analysis.js";
import {
  createBlankProject,
  defaultTags,
  defaultPreferences,
  defaultTeams,
  emptyContext
} from "./lib/defaults.js";
import { buildAutomaticAnalysis } from "./lib/insights.js";
import { enrichTeam, sortPlayersByNumber } from "./lib/roster.js";
import { accountInitials, readLocalAccount } from "./lib/account.js";
import {
  eventToShortcut,
  nextPlaybackSpeed,
  playbackControls
} from "./lib/playback.js";
import {
  normalizePaletteMode,
  normalizeThemeMode,
  paletteStorageKey,
  resolveThemeMode,
  themeStorageKey
} from "./lib/theme.js";
import { isShotTag, shotTagPoints, shotZoneById } from "./lib/shotZones.js";
import { downloadText, safeDownloadName } from "./lib/webFiles.js";

const desktop = window.scoutDesktop;
const appVersion = __APP_VERSION__;
const autosaveKey = "scout-analyzer-autosave-v1";
const preferencesKey = "scout-analyzer-preferences-v3";
const teamsLibraryKey = "scout-analyzer-teams-v1";
const dataLibraryKey = "tactovia-data-library-v1";

function profileStorageKey(base, accountId) {
  return accountId ? `${base}:${accountId}` : base;
}

function migrateBasketballTags(tags = []) {
  const requiredShotIds = new Set([
    "tag-shot-made-2",
    "tag-shot-missed-2",
    "tag-shot-made-3",
    "tag-shot-missed-3"
  ]);
  const withoutLegacy = tags.filter(
    (tag) => tag.id !== "tag-shot-made" && tag.id !== "tag-shot-missed"
  );
  const byId = new Map(withoutLegacy.map((tag) => [tag.id, tag]));
  const shotTags = defaultTags
    .filter((tag) => requiredShotIds.has(tag.id))
    .map((tag) => byId.get(tag.id) || tag);
  const remaining = withoutLegacy.filter((tag) => !requiredShotIds.has(tag.id));
  return [...shotTags, ...remaining];
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

function migrateProject(project) {
  const projectData = Object.fromEntries(
    Object.entries(project).filter(([key]) => key !== "playbook")
  );
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
    ...projectData,
    version: 10,
    teams,
    match: validMatch,
    competitions: Array.isArray(project.competitions) ? project.competitions : [],
    libraryFolders: Array.isArray(project.libraryFolders) ? project.libraryFolders : [],
    freeAgents: Array.isArray(project.freeAgents) ? project.freeAgents : [],
    template: {
      ...(project.template || {}),
      tags: migrateBasketballTags(project.template?.tags || defaultTags)
    },
    events: (project.events || []).map((event) => {
      const { outcome, ...rest } = event;
      const zonePoints =
        shotZoneById(event.shotZoneId)?.points || Number(event.shotPoints) || 2;
      const migratedTagId =
        event.tagId === "tag-shot-made"
          ? zonePoints === 3
            ? "tag-shot-made-3"
            : "tag-shot-made-2"
          : event.tagId === "tag-shot-missed"
            ? zonePoints === 3
              ? "tag-shot-missed-3"
              : "tag-shot-missed-2"
            : event.tagId;
      const migratedTagName =
        event.tagId === "tag-shot-made" || event.tagName === "Canasta"
          ? `Canasta de ${zonePoints}P`
          : event.tagId === "tag-shot-missed" || event.tagName === "Tiro fallado"
            ? `Tiro fallado de ${zonePoints}P`
            : event.tagName;
      return {
        ...rest,
        teamId:
          event.teamId ||
          (event.team === "Rival" ? "team-rival" : event.team ? "team-own" : ""),
        playerId: event.playerId || "",
        notes: event.notes || outcome || "",
        tagId: migratedTagId,
        tagName: migratedTagName,
        shotZoneId: event.shotZoneId || "",
        shotZoneName: event.shotZoneName || "",
        shotPoints: Number(event.shotPoints) || 0
      };
    })
  };
}

function readTeamLibrary(accountId = "") {
  try {
    const stored = JSON.parse(
      localStorage.getItem(profileStorageKey(teamsLibraryKey, accountId))
    );
    if (Array.isArray(stored) && stored.length > 0) return stored.map(enrichTeam);
  } catch {
    // The team library can always be reconstructed from the current project.
  }
  return defaultTeams.map(enrichTeam);
}

function readDataLibrary(accountId = "") {
  try {
    const stored = JSON.parse(
      localStorage.getItem(profileStorageKey(dataLibraryKey, accountId))
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
          : []
      };
    }
  } catch {
    // A damaged library falls back to the compatible team storage.
  }
  return {
    teams: readTeamLibrary(accountId),
    competitions: [],
    freeAgents: [],
    libraryFolders: []
  };
}

function createProjectFromLibrary(accountId = "") {
  const library = readDataLibrary(accountId);
  return {
    ...createBlankProject(library.teams),
    competitions: library.competitions,
    freeAgents: library.freeAgents,
    libraryFolders: library.libraryFolders
  };
}

function createProjectFromDataLibrary(library) {
  return {
    ...createBlankProject(library.teams),
    competitions: library.competitions || [],
    freeAgents: library.freeAgents || [],
    libraryFolders: library.libraryFolders || []
  };
}

function hasValidMatch(project) {
  return Boolean(
    project.match &&
      project.match.homeTeamId !== project.match.awayTeamId &&
      project.teams.some((team) => team.id === project.match.homeTeamId) &&
      project.teams.some((team) => team.id === project.match.awayTeamId)
  );
}

function hasMeaningfulAnalysis(project) {
  return Boolean(
    project?.video?.path ||
      project?.video?.name ||
      project?.match?.homeTeamId ||
      project?.match?.awayTeamId ||
      (project?.events || []).length > 0
  );
}

function readAutosave(accountId = "") {
  try {
    const stored = JSON.parse(
      localStorage.getItem(profileStorageKey(autosaveKey, accountId))
    );
    if (
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(stored?.version) &&
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
      localStorage.getItem(profileStorageKey(preferencesKey, accountId))
    );
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
  const [account, setAccount] = useState(readLocalAccount);
  const [dataLibrary, setDataLibrary] = useState(() =>
    readDataLibrary(readLocalAccount()?.id || "")
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
  const [preferences, setPreferences] = useState(readPreferences);
  const [context, setContext] = useState({ ...emptyContext });
  const [activeIntervals, setActiveIntervals] = useState({});
  const [selectedEventIds, setSelectedEventIds] = useState(new Set());
  const [editingEvent, setEditingEvent] = useState(null);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showExportClips, setShowExportClips] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [activeView, setActiveView] = useState("tagging");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [dataExportFormat, setDataExportFormat] = useState("xlsx");
  const [databaseSnapshot, setDatabaseSnapshot] = useState(null);
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [databaseError, setDatabaseError] = useState("");
  const [themeMode, setThemeMode] = useState(readThemeMode);
  const [paletteMode, setPaletteMode] = useState(readPaletteMode);
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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
    return (selectedTeam.players || []).filter((player) => allowed.has(player.id));
  }, [project.match, selectedTeam]);
  const eventContext = useMemo(
    () => {
      const zone = shotZoneById(context.shotZoneId);
      return {
        ...context,
        teamName: selectedTeam?.name || "",
        playerName: selectedPlayer
          ? [selectedPlayer.number ? `#${selectedPlayer.number}` : "", selectedPlayer.name]
              .filter(Boolean)
              .join(" ")
          : "",
        shotZoneName: zone?.name || "",
        shotPoints: zone?.points || 0
      };
    },
    [context, selectedPlayer, selectedTeam]
  );

  const stats = useMemo(
    () => statisticsFor(project.template.tags, project.events),
    [project.template.tags, project.events]
  );
  const automaticAnalysis = useMemo(
    () => buildAutomaticAnalysis(project),
    [project]
  );
  const liveTaggingSummary = useMemo(() => {
    const total = project.events.length;
    const latest = total ? project.events[total - 1] : null;
    const identified = project.events.filter(
      (event) => event.playerId || event.player
    ).length;
    const elapsedMinutes = Math.max(currentTime / 60, 1 / 60);
    const teamScores = Object.fromEntries(
      matchTeams.map((team) => [
        team.id,
        project.events
          .filter(
            (event) =>
              event.teamId === team.id &&
              String(event.tagName || "").toLowerCase().includes("canasta")
          )
          .reduce(
            (total, event) =>
              total +
              (Number(event.shotPoints) ||
                (String(event.tagName).includes("3") ? 3 : 2)),
            0
          )
      ])
    );
    const shots = project.events.filter((event) => isShotTag(event)).length;
    const made = project.events.filter((event) =>
      String(event.tagName || "").toLowerCase().includes("canasta")
    ).length;
    const taggedSeconds = project.events.reduce(
      (sum, event) => sum + Math.max(0, Number(event.end) - Number(event.start)),
      0
    );
    return {
      latest,
      leading: stats[0] || null,
      rate: total ? (total / elapsedMinutes).toFixed(1).replace(".", ",") : "0,0",
      identifiedPercentage: total ? Math.round((identified / total) * 100) : 0,
      teamScores,
      shotPercentage: shots ? Math.round((made / shots) * 100) : 0,
      shots,
      tagTypes: stats.length,
      activePlayers: new Set(
        project.events.map((event) => event.playerId).filter(Boolean)
      ).size,
      taggedSeconds,
      activeZones: new Set(
        project.events.map((event) => event.shotZoneId).filter(Boolean)
      ).size
    };
  }, [currentTime, matchTeams, project.events, stats]);

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
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    const timer = window.setTimeout(
      () => setShowBrandSplash(false),
      reducedMotion ? 650 : 1850
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!account || account.isDemo) return;
    localStorage.setItem(
      profileStorageKey(autosaveKey, account.id),
      JSON.stringify(project)
    );
  }, [account, project]);

  useEffect(() => {
    if (!account || account.isDemo) return;
    localStorage.setItem(
      profileStorageKey(teamsLibraryKey, account.id),
      JSON.stringify(dataLibrary.teams)
    );
  }, [account, dataLibrary.teams]);

  useEffect(() => {
    if (!account || account.isDemo) return;
    localStorage.setItem(
      profileStorageKey(dataLibraryKey, account.id),
      JSON.stringify({
        teams: dataLibrary.teams,
        competitions: dataLibrary.competitions || [],
        freeAgents: dataLibrary.freeAgents || [],
        libraryFolders: dataLibrary.libraryFolders || []
      })
    );
  }, [
    account,
    dataLibrary
  ]);

  useEffect(() => {
    if (!account || account.isDemo) return;
    localStorage.setItem(
      profileStorageKey(preferencesKey, account.id),
      JSON.stringify(preferences)
    );
  }, [account, preferences]);

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
    if (!desktop?.initializeDatabase || !authenticated || !account) return undefined;
    let active = true;
    databaseReadyRef.current = false;
    setDatabaseLoading(true);
    desktop
      .initializeDatabase({
        legacyProject:
          !account.isDemo && hasMeaningfulAnalysis(project) ? project : null,
        ownerProfileId: account.id,
        isDemo: Boolean(account.isDemo)
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
                    libraryFolders: libraryResult.library.folders || []
                  });
                } else {
                  const localLibrary = readDataLibrary(account.id);
                  desktop.saveUserLibrary?.({
                    ownerProfileId: account.id,
                    library: {
                      ...localLibrary,
                      folders: localLibrary.libraryFolders || []
                    }
                  });
                }
              });
          }
        } else {
          setDatabaseError(
            result.error || "No se pudo iniciar la biblioteca de scouting."
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
    if (!desktop?.saveUserLibrary || !account?.id || account.isDemo) return undefined;
    window.clearTimeout(librarySyncTimerRef.current);
    librarySyncTimerRef.current = window.setTimeout(async () => {
      const result = await desktop.saveUserLibrary({
        ownerProfileId: account.id,
        isDemo: false,
        library: {
          teams: dataLibrary.teams,
          competitions: dataLibrary.competitions || [],
          freeAgents: dataLibrary.freeAgents || [],
          folders: dataLibrary.libraryFolders || []
        }
      });
      if (!result.ok) {
        setDatabaseError(result.error || "No se pudo guardar la biblioteca del perfil.");
      }
    }, 500);
    return () => window.clearTimeout(librarySyncTimerRef.current);
  }, [account, dataLibrary]);

  useEffect(() => {
    if (
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
        isDemo: false
      });
      if (!result.ok) {
        setDatabaseError(
          result.error || "No se pudo actualizar el histórico local."
        );
        return;
      }
      if (activeView === "database") {
        const refreshed = await desktop.getDatabaseSnapshot({
          ownerProfileId: account.id
        });
        if (refreshed.ok) {
          setDatabaseSnapshot(refreshed.snapshot);
          setDatabaseError("");
        }
      }
    }, 650);
    return () => window.clearTimeout(databaseSyncTimerRef.current);
  }, [account, activeView, project]);

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
  }, [project.video?.path]);

  useEffect(
    () => () => {
      if (webVideoObjectUrlRef.current) {
        URL.revokeObjectURL(webVideoObjectUrlRef.current);
      }
    },
    []
  );

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
      mute: muted ? "Activar sonido" : "Silenciar",
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
    if (isShotTag(tag) && !context.shotZoneId) {
      notify("Selecciona primero la zona de la pista para registrar el tiro.");
      return;
    }
    const selectedZone = shotZoneById(context.shotZoneId);
    const expectedPoints = shotTagPoints(tag);
    if (
      expectedPoints &&
      selectedZone?.points &&
      expectedPoints !== selectedZone.points
    ) {
      notify(
        `Esta etiqueta es de ${expectedPoints} puntos. Selecciona una zona de ${expectedPoints}P.`
      );
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
      webVideoInputRef.current?.click();
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

  function loadWebVideo(file) {
    if (!file) return;
    if (project.events.length > 0 && !window.confirm("Cambiar de vídeo mantendrá las etiquetas actuales. ¿Continuar?")) {
      return;
    }
    if (webVideoObjectUrlRef.current) {
      URL.revokeObjectURL(webVideoObjectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    webVideoObjectUrlRef.current = url;
    setVideoUrl(url);
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveIntervals({});
    updateProject((current) => ({
      ...current,
      match: null,
      video: { path: "", name: file.name, duration: 0, source: "browser-local" }
    }));
  }

  async function openProject() {
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
      setCurrentTime(0);
      setVideoUrl("");
      setContext({ ...emptyContext, teamId: migrated.match?.homeTeamId || "" });
      setWorkspaceReady(true);
      notify("Análisis abierto. Selecciona de nuevo el vídeo local para reproducirlo.");
    } catch (error) {
      notify(error.message || "No se pudo abrir el análisis.");
    }
  }

  async function saveProject() {
    if (!desktop) {
      downloadText(
        `${safeDownloadName(project.projectName)}.scout.json`,
        JSON.stringify(project, null, 2),
        "application/json;charset=utf-8"
      );
      notify("Análisis descargado en este dispositivo.");
      return;
    }
    const result = await desktop.saveProject({
      project,
      filePath: projectFilePath
    });
    if (result.canceled) return;
    if (result.error) {
      notify(result.error);
      return;
    }
    setProjectFilePath(result.filePath);
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
        isDemo: false
      });
      if (!finalized.ok) {
        notify(
          finalized.error ||
            "El archivo se guardó, pero no se pudo actualizar el histórico."
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
        : "Análisis guardado."
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
        ownerProfileId: account?.isDemo ? "" : account?.id || ""
      });
      if (result.ok) {
        setDatabaseSnapshot(result.snapshot);
        setDatabaseError("");
      } else {
        setDatabaseError(result.error || "No se pudo actualizar la biblioteca.");
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
    if (
      project.events.length > 0 &&
      !window.confirm("¿Crear un análisis nuevo? El análisis actual seguirá en su archivo si lo has guardado.")
    ) {
      return;
    }
    setProject(createProjectFromDataLibrary(dataLibrary));
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

  function startNewSession() {
    setProject(createProjectFromDataLibrary(dataLibrary));
    setProjectFilePath("");
    setVideoUrl("");
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveIntervals({});
    setSelectedEventIds(new Set());
    setContext({ ...emptyContext });
    setActiveView("tagging");
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
      isDemo: true
    };
    setAccount(demoAccount);
    setDataLibrary({
      teams: defaultTeams.map(enrichTeam),
      competitions: [],
      freeAgents: [],
      libraryFolders: []
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
    if (account?.isDemo) {
      setAccount(readLocalAccount());
      setProject(createBlankProject());
    }
    setAuthenticated(false);
    setSelectedSport("");
    setWorkspaceReady(false);
    setProfileMenuOpen(false);
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
    if (project.events.length === 0) {
      notify("Todavía no hay acciones para exportar.");
      return;
    }
    if (!desktop) {
      downloadText(
        `${safeDownloadName(project.projectName)}-eventos.csv`,
        `\uFEFF${projectToCsv(project)}`,
        "text/csv;charset=utf-8"
      );
      notify("Datos CSV descargados.");
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
    if (!desktop) {
      notify("Excel y Power BI requieren la aplicación de escritorio; en web puedes exportar CSV.");
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
      notify("La exportación Power BI está disponible en la aplicación de escritorio.");
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
        return [record.match?.homeTeamId, record.match?.awayTeamId].includes(scope.id);
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
              : true
        )
        .forEach((event, eventIndex) => {
          const tag = {
            id: event.tagId,
            name: event.tagName,
            color: event.color || "#08756D",
            mode: event.mode || "point"
          };
          tagMap.set(tag.id, tag);
          events.push({
            ...event,
            id: `${record.id}-${event.id || eventIndex}`,
            anchor: recordIndex,
            start: recordIndex,
            end: recordIndex + 0.1,
            recordName: record.projectName
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
      events
    };
  }

  async function exportHistory(format, scope = {}) {
    const historicalProject = createHistoricalProject(scope);
    if (historicalProject.events.length === 0) {
      notify("Todavía no hay históricos para exportar.");
      return;
    }
    if (format === "powerbi") return exportPowerBi(historicalProject);
    if (format === "pdf") {
      setBusy("Preparando informe histórico…");
      try {
        const result = await desktop.exportReportPdf(
          reportPayload(historicalProject)
        );
        if (!result.canceled) {
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
      if (!result.canceled) {
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
        `¿Eliminar el histórico estadístico “${record.projectName}”? El archivo .scout guardado no se borrará.`
      )
    ) {
      return;
    }
    const result = await desktop.deleteGameRecord({
      recordId: record.id,
      ownerProfileId: account.id
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
      teamPlayer: [event.team || "Sin equipo", event.player || "Sin jugador"]
    };
    return values[groupBy] || [];
  }

  async function exportClips(options) {
    if (!desktop || !project.video?.path) {
      notify("Selecciona el vídeo original.");
      return;
    }
    const scoped =
      options.scope === "selected"
        ? project.events.filter((event) => selectedEventIds.has(event.id))
        : project.events;
    const selected = scoped.filter((event) => {
      if (options.tagId && (event.tagId || event.tagName) !== options.tagId) return false;
      if (options.teamId && (event.teamId || event.team) !== options.teamId) return false;
      if (options.playerId && (event.playerId || event.player) !== options.playerId) return false;
      return true;
    });
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
        })),
        outputMode: options.outputMode || "individual",
        quality: options.quality || "balanced",
        projectName: project.projectName
      });
      if (result.error) {
        notify(result.error);
      } else if (!result.canceled) {
        notify(
          options.outputMode === "highlights"
            ? "Reel de highlights creado."
            : `${result.files.length} ${result.files.length === 1 ? "clip creado" : "clips creados"}.`
        );
        if (result.files[0]) desktop.revealFile(result.files[0]);
      }
    } finally {
      setBusy("");
    }
  }

  async function exportReport(options = {}) {
    if (!desktop) {
      notify("La maquetación PDF está disponible en la aplicación de escritorio.");
      return;
    }
    setBusy("Preparando informe…");
    try {
      const result = await desktop.exportReportPdf(
        reportPayload(project, options)
      );
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
    const home = project.teams.find((team) => team.id === project.match?.homeTeamId);
    const away = project.teams.find((team) => team.id === project.match?.awayTeamId);
    const summary = [
      project.projectName,
      home && away ? `${home.name} vs ${away.name}` : "",
      `${project.events.length} acciones · ${formatTime(project.video?.duration || 0)} analizados`,
      leadingStats,
      ...automaticAnalysis.teams.flatMap((team) => [
        `\n${team.name}`,
        ...team.conclusions.map((conclusion) => `• ${conclusion}`)
      ]),
      `Generado con Tactovia ${appVersion}`
    ].filter(Boolean).join("\n");
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
          account={account}
          authenticated={authenticated}
          sport={selectedSport}
          project={project}
          canContinue={hasMeaningfulAnalysis(project)}
          onAccountChange={setAccount}
          onAuthenticated={(nextAccount) => {
            setAccount(nextAccount);
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
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <BrandLogo
              layout="horizontal"
              surface="adaptive"
              className="topbar-brand-logo"
            />
            <small>Versión {appVersion}</small>
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
          <ThemeSelector value={themeMode} onChange={setThemeMode} compact />
          <button className="button ghost" onClick={newProject}>Nuevo</button>
          <button className="button ghost" onClick={openProject}>Abrir</button>
          <button className="button primary" onClick={saveProject}>Guardar</button>
          <div className="profile-menu-wrap">
            <button
              className={`profile-trigger ${activeView === "profile" ? "active" : ""}`}
              onClick={() => setProfileMenuOpen((current) => !current)}
              aria-label="Abrir perfil"
            >
              <span>{accountInitials(account)}</span>
              <div><strong>{account?.name}</strong><small>{account?.role || "Analista"}</small></div>
              <i>⌄</i>
            </button>
            {profileMenuOpen && (
              <div className="profile-popover">
                <div><span>{accountInitials(account)}</span><strong>{account?.name}</strong><small>{account?.email}</small></div>
                <button onClick={() => { setActiveView("profile"); setProfileMenuOpen(false); }}>Perfil y ajustes</button>
                <button onClick={() => { setShowUserGuide(true); setProfileMenuOpen(false); }}>Guía de usuario</button>
                <button onClick={() => { setWorkspaceReady(false); setProfileMenuOpen(false); }}>Cambiar sesión</button>
                <button className="danger-text" onClick={logout}>Cerrar sesión</button>
              </div>
            )}
          </div>
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
          className={activeView === "database" ? "active" : ""}
          onClick={() => {
            setActiveView("database");
            refreshDatabase();
          }}
        >
          Competiciones y equipos
        </button>
        <button
          className={activeView === "report" ? "active" : ""}
          onClick={() => setActiveView("report")}
        >
          Informe y exportación
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
                    <div className="audio-control">
                      <button
                        className={muted || volume === 0 ? "muted" : ""}
                        onClick={() => executePlaybackAction("mute")}
                        aria-label={muted ? "Activar sonido" : "Silenciar sonido"}
                        title={muted ? "Activar sonido" : "Silenciar sonido"}
                      >
                        <span aria-hidden="true">
                          {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                        </span>
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
                <section className="live-tagging-strip" aria-label="Resumen del etiquetado">
                  {(preferences.layout.liveModules || []).includes("actions") && (
                    <div>
                      <span>Acciones etiquetadas</span>
                      <strong>{project.events.length}</strong>
                      <small>registros de este partido</small>
                    </div>
                  )}
                  {(preferences.layout.liveModules || []).includes("tagTypes") && (
                    <div>
                      <span>Etiquetas utilizadas</span>
                      <strong>{liveTaggingSummary.tagTypes}</strong>
                      <small>tipos con al menos una acción</small>
                    </div>
                  )}
                  {(preferences.layout.liveModules || []).includes("players") && (
                    <div>
                      <span>Jugadores implicados</span>
                      <strong>{liveTaggingSummary.activePlayers}</strong>
                      <small>identificados en las acciones</small>
                    </div>
                  )}
                  {(preferences.layout.liveModules || []).includes("taggedTime") && (
                    <div>
                      <span>Tiempo de clips</span>
                      <strong>{formatTime(liveTaggingSummary.taggedSeconds)}</strong>
                      <small>suma de los intervalos exportables</small>
                    </div>
                  )}
                  {(preferences.layout.liveModules || []).includes("zones") && (
                    <div>
                      <span>Zonas utilizadas</span>
                      <strong>{liveTaggingSummary.activeZones}</strong>
                      <small>áreas con tiros registrados</small>
                    </div>
                  )}
                  {(preferences.layout.liveModules || []).includes("score") && (
                    <div className="live-score-module">
                      <span>Marcador etiquetado</span>
                      <strong>
                        {matchTeams[0]?.shortName || "LOC"}{" "}
                        {liveTaggingSummary.teamScores[matchTeams[0]?.id] || 0}
                        <i>–</i>
                        {liveTaggingSummary.teamScores[matchTeams[1]?.id] || 0}{" "}
                        {matchTeams[1]?.shortName || "VIS"}
                      </strong>
                      <small>calculado desde canastas registradas</small>
                    </div>
                  )}
                  {(preferences.layout.liveModules || []).includes("pace") && (
                    <div>
                      <span>Ritmo</span>
                      <strong>{liveTaggingSummary.rate}</strong>
                      <small>{project.events.length} acciones · por minuto</small>
                    </div>
                  )}
                  {(preferences.layout.liveModules || []).includes("shooting") && (
                    <div>
                      <span>Acierto de tiro</span>
                      <strong>{liveTaggingSummary.shotPercentage}%</strong>
                      <small>{liveTaggingSummary.shots} intentos localizados</small>
                    </div>
                  )}
                  {(preferences.layout.liveModules || []).includes("coverage") && (
                    <div>
                      <span>Cobertura</span>
                      <strong>{liveTaggingSummary.identifiedPercentage}%</strong>
                      <small>acciones con jugador</small>
                    </div>
                  )}
                  {(preferences.layout.liveModules || []).includes("latest") && (
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
                        {liveTaggingSummary.latest?.tagName || "Todavía sin acciones"}
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
                  <label className="field span-two">
                    <span>Nota rápida</span>
                    <input
                      placeholder="Comentario opcional"
                      value={context.notes}
                      onChange={(event) => setContext((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="tagging-player-selector">
                  <header>
                    <span>Jugador</span>
                    <button
                      className={`mini-button ${!context.playerId ? "active" : ""}`}
                      onClick={() =>
                        setContext((current) => ({ ...current, playerId: "" }))
                      }
                    >
                      Sin indicar
                    </button>
                  </header>
                  <div>
                    {sortPlayersByNumber(activeRosterPlayers).map((player) => (
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
                              current.playerId === player.id ? "" : player.id
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                {preferences.layout.shotCourtVisible !== false &&
                  (preferences.layout.shotCourtPosition || "above") === "above" && (
                  <ShotCourtSelector
                    value={context.shotZoneId}
                    events={project.events}
                    onChange={(shotZoneId) =>
                      setContext((current) => ({ ...current, shotZoneId }))
                    }
                    showLabels={preferences.layout.shotCourtLabels !== false}
                    compact
                  />
                )}

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
                {preferences.layout.shotCourtVisible !== false &&
                  preferences.layout.shotCourtPosition === "below" && (
                    <ShotCourtSelector
                      value={context.shotZoneId}
                      events={project.events}
                      onChange={(shotZoneId) =>
                        setContext((current) => ({ ...current, shotZoneId }))
                      }
                      showLabels={preferences.layout.shotCourtLabels !== false}
                      compact
                    />
                  )}
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
              tags={project.template.tags}
              selectedIds={selectedEventIds}
              onSeek={seekTo}
              onToggleSelected={toggleSelected}
              onEdit={setEditingEvent}
              onDelete={deleteEvent}
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
          onTeamsChange={(teams) =>
            {
              updateProject((current) => ({ ...current, teams }));
              setDataLibrary((current) => ({ ...current, teams }));
            }
          }
          onManageTeams={() => setActiveView("database")}
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
          courtOptions={{
            visible: preferences.layout.shotCourtVisible,
            showLabels: preferences.layout.shotCourtLabels,
            position: preferences.layout.shotCourtPosition
          }}
          onClose={() => setShowTagEditor(false)}
          onSave={(tags, courtOptions) => {
            updateProject((current) => ({
              ...current,
              template: { ...current.template, tags }
            }));
            setPreferences((current) => ({
              ...current,
              layout: {
                ...current.layout,
                shotCourtVisible: courtOptions.visible,
                shotCourtLabels: courtOptions.showLabels,
                shotCourtPosition: courtOptions.position
              }
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

      {showUserGuide && (
        <UserGuide
          shortcuts={preferences.shortcuts}
          onClose={() => setShowUserGuide(false)}
        />
      )}

      {notice && <div className="toast">{notice}</div>}
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
