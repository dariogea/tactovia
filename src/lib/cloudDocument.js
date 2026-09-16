// Explicit fields only. Media, credentials, contact details and unknown extensions
// are deliberately not uploaded. User-authored notes remain part of the analysis.
const fields = new Set(`version id projectName createdAt updatedAt analysisNotes playlists
name eventIds events template tags teams players competitions libraryFolders freeAgents match
playbackPosition duration tagId tagName color mode anchor start end teamId playerId team player
notes shotZoneId shotZoneName shotPoints metric period favorite shortcut before after
shortName primaryColor secondaryColor clubName category season competitionId country city arena
coach assistantCoach founded number position secondaryPosition height weight wingspan birthDate
nationality dominantHand role status homeTeamId awayTeamId homeRosterIds awayRosterIds date
round venue folderId parentId description order scheduledAt`.split(/\s+/));
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).filter(([key]) => fields.has(key)).map(([key, item]) => [key, clean(item)]),
  );
  return value;
}
export function cloudDocument(project) {
  const document = clean(project);
  document.video = project.video ? { name: "Vídeo local", duration: Number(project.video.duration) || 0, path: "" } : null;
  return document;
}

export function cloudLibraryDocument(library) {
  return clean({
    teams: library?.teams || [],
    competitions: library?.competitions || [],
    freeAgents: library?.freeAgents || [],
    libraryFolders: library?.libraryFolders || [],
  });
}
