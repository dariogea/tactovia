const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { backup, DatabaseSync } = require("node:sqlite");

const DATABASE_VERSION = 3;
const LEGACY_COMPETITION_ID = "competition-fbrm-1dm";
const LEGACY_SEASON_ID = "season-2026-27";
const LEGACY_COMPETITION_SEASON_ID = "competition-season-fbrm-1dm-2026-27";
const LOCAL_WORKSPACE_ID = "workspace-local-private";

function nowIso() {
  return new Date().toISOString();
}

function json(value, fallback = {}) {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
}

function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function openDatabase(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const database = new DatabaseSync(filePath, {
    enableForeignKeyConstraints: true,
    timeout: 5000
  });
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
  return database;
}

function schemaSql() {
  return `
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private', 'club', 'public')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS competitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL DEFAULT '',
      governing_body TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      region TEXT NOT NULL DEFAULT '',
      level TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      external_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE UNIQUE INDEX IF NOT EXISTS competitions_source_external
      ON competitions(source, external_id)
      WHERE external_id IS NOT NULL AND external_id <> '';

    CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL UNIQUE,
      starts_on TEXT,
      ends_on TEXT,
      is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS competition_seasons (
      id TEXT PRIMARY KEY,
      competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
      season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'active', 'finished', 'archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (competition_id, season_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS clubs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      logo TEXT NOT NULL DEFAULT '',
      primary_color TEXT NOT NULL DEFAULT '#2DD4BF',
      secondary_color TEXT NOT NULL DEFAULT '#0F766E',
      source TEXT NOT NULL DEFAULT 'manual',
      external_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL DEFAULT '',
      primary_color TEXT NOT NULL DEFAULT '#2DD4BF',
      secondary_color TEXT NOT NULL DEFAULT '#0F766E',
      logo TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      arena TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      external_id TEXT,
      profile_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE UNIQUE INDEX IF NOT EXISTS teams_source_external
      ON teams(source, external_id)
      WHERE external_id IS NOT NULL AND external_id <> '';

    CREATE TABLE IF NOT EXISTS competition_teams (
      competition_season_id TEXT NOT NULL
        REFERENCES competition_seasons(id) ON DELETE CASCADE,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      group_name TEXT NOT NULL DEFAULT '',
      seed INTEGER,
      PRIMARY KEY (competition_season_id, team_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      photo TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      external_id TEXT,
      profile_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE UNIQUE INDEX IF NOT EXISTS players_source_external
      ON players(source, external_id)
      WHERE external_id IS NOT NULL AND external_id <> '';

    CREATE TABLE IF NOT EXISTS roster_memberships (
      id TEXT PRIMARY KEY,
      competition_season_id TEXT
        REFERENCES competition_seasons(id) ON DELETE CASCADE,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      jersey_number TEXT NOT NULL DEFAULT '',
      position TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Activo',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (competition_season_id, team_id, player_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      competition_season_id TEXT
        REFERENCES competition_seasons(id) ON DELETE SET NULL,
      round_name TEXT NOT NULL DEFAULT '',
      scheduled_at TEXT,
      venue TEXT NOT NULL DEFAULT '',
      home_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
      away_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
      source TEXT NOT NULL DEFAULT 'manual',
      external_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (home_team_id <> away_team_id)
    ) STRICT;

    CREATE UNIQUE INDEX IF NOT EXISTS matches_source_external
      ON matches(source, external_id)
      WHERE external_id IS NOT NULL AND external_id <> '';

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      match_id TEXT REFERENCES matches(id) ON DELETE SET NULL,
      project_name TEXT NOT NULL,
      video_name TEXT NOT NULL DEFAULT '',
      video_path_local TEXT NOT NULL DEFAULT '',
      video_duration REAL NOT NULL DEFAULT 0,
      visibility TEXT NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private', 'club', 'public')),
      project_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS game_records (
      id TEXT PRIMARY KEY,
      owner_profile_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      match_json TEXT NOT NULL DEFAULT '{}',
      teams_json TEXT NOT NULL DEFAULT '[]',
      events_json TEXT NOT NULL DEFAULT '[]',
      summary_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE INDEX IF NOT EXISTS game_records_owner_updated
      ON game_records(owner_profile_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL DEFAULT '',
      tag_name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '',
      mode TEXT NOT NULL DEFAULT 'point'
        CHECK (mode IN ('point', 'interval')),
      anchor REAL NOT NULL DEFAULT 0,
      start REAL NOT NULL,
      end REAL NOT NULL,
      team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
      player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
      team_name TEXT NOT NULL DEFAULT '',
      player_name TEXT NOT NULL DEFAULT '',
      shot_zone_id TEXT NOT NULL DEFAULT '',
      shot_zone_name TEXT NOT NULL DEFAULT '',
      shot_points INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (start >= 0),
      CHECK (end >= start)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS events_analysis_time
      ON events(analysis_id, start);
    CREATE INDEX IF NOT EXISTS events_player
      ON events(player_id, tag_name);
    CREATE INDEX IF NOT EXISTS events_team
      ON events(team_id, tag_name);
    CREATE INDEX IF NOT EXISTS matches_competition_date
      ON matches(competition_season_id, scheduled_at);

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (entity_type, entity_id, operation)
    ) STRICT;
  `;
}

function migrateSchema(database) {
  const eventColumns = new Set(
    database.prepare("PRAGMA table_info(events)").all().map((column) => column.name)
  );
  if (!eventColumns.has("shot_zone_id")) {
    database.exec("ALTER TABLE events ADD COLUMN shot_zone_id TEXT NOT NULL DEFAULT ''");
  }
  if (!eventColumns.has("shot_zone_name")) {
    database.exec("ALTER TABLE events ADD COLUMN shot_zone_name TEXT NOT NULL DEFAULT ''");
  }
  if (!eventColumns.has("shot_points")) {
    database.exec("ALTER TABLE events ADD COLUMN shot_points INTEGER NOT NULL DEFAULT 0");
  }
  const analysisColumns = new Set(
    database.prepare("PRAGMA table_info(analyses)").all().map((column) => column.name)
  );
  if (!analysisColumns.has("owner_profile_id")) {
    database.exec(
      "ALTER TABLE analyses ADD COLUMN owner_profile_id TEXT NOT NULL DEFAULT 'legacy-local'"
    );
  }
}

function seedDatabase(database) {
  const now = nowIso();
  database.prepare(`
    INSERT INTO workspaces (id, name, visibility, created_at, updated_at)
    VALUES (?, ?, 'private', ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(LOCAL_WORKSPACE_ID, "Mi espacio de scouting", now, now);

  database.prepare(`
    INSERT INTO metadata(key, value) VALUES ('schema_version', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(String(DATABASE_VERSION));

  database.prepare(`
    DELETE FROM teams
    WHERE id IN ('team-own', 'team-rival')
      AND source = 'local-user'
      AND NOT EXISTS (
        SELECT 1 FROM roster_memberships rm WHERE rm.team_id = teams.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM matches m
        WHERE m.home_team_id = teams.id OR m.away_team_id = teams.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM events e WHERE e.team_id = teams.id
      )
  `).run();
}

function mapTeamRow(row) {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    logo: row.logo,
    category: row.category,
    city: row.city,
    arena: row.arena,
    source: row.source,
    externalId: row.external_id || "",
    players: [],
    ...parseJson(row.profile_json, {})
  };
}

function createDatabaseService(filePath, options = {}) {
  const database = openDatabase(filePath);
  database.exec(schemaSql());
  migrateSchema(database);
  seedDatabase(database);

  function cleanupUnusedLegacyCatalog() {
    return transaction(() => {
      const removedTeams = database.prepare(`
        DELETE FROM teams
        WHERE source = 'official-fbrm-2026-27'
          AND NOT EXISTS (
            SELECT 1 FROM matches m
            WHERE m.home_team_id = teams.id OR m.away_team_id = teams.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM events e WHERE e.team_id = teams.id
          )
      `).run().changes;
      database.prepare(`
        DELETE FROM competition_seasons
        WHERE id = ?
          AND NOT EXISTS (
            SELECT 1 FROM competition_teams ct
            WHERE ct.competition_season_id = competition_seasons.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM matches m
            WHERE m.competition_season_id = competition_seasons.id
          )
      `).run(LEGACY_COMPETITION_SEASON_ID);
      database.prepare(`
        DELETE FROM competitions
        WHERE id = ?
          AND NOT EXISTS (
            SELECT 1 FROM competition_seasons cs
            WHERE cs.competition_id = competitions.id
          )
      `).run(LEGACY_COMPETITION_ID);
      database.prepare(`
        DELETE FROM seasons
        WHERE id = ?
          AND NOT EXISTS (
            SELECT 1 FROM competition_seasons cs
            WHERE cs.season_id = seasons.id
          )
      `).run(LEGACY_SEASON_ID);
      return removedTeams;
    });
  }

  const upsertTeam = database.prepare(`
    INSERT INTO teams (
      id, club_id, name, short_name, primary_color, secondary_color, logo,
      category, city, arena, source, external_id, profile_json, created_at, updated_at
    )
    VALUES (
      $id, $clubId, $name, $shortName, $primaryColor, $secondaryColor, $logo,
      $category, $city, $arena, $source, $externalId, $profileJson, $createdAt, $updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      club_id = excluded.club_id,
      name = excluded.name,
      short_name = excluded.short_name,
      primary_color = excluded.primary_color,
      secondary_color = excluded.secondary_color,
      logo = excluded.logo,
      category = excluded.category,
      city = excluded.city,
      arena = excluded.arena,
      source = excluded.source,
      external_id = excluded.external_id,
      profile_json = excluded.profile_json,
      updated_at = excluded.updated_at
  `);

  const upsertPlayer = database.prepare(`
    INSERT INTO players (
      id, full_name, photo, source, external_id, profile_json, created_at, updated_at
    )
    VALUES (
      $id, $fullName, $photo, $source, $externalId, $profileJson, $createdAt, $updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      full_name = excluded.full_name,
      photo = excluded.photo,
      source = excluded.source,
      external_id = excluded.external_id,
      profile_json = excluded.profile_json,
      updated_at = excluded.updated_at
  `);

  function transaction(callback) {
    database.exec("BEGIN IMMEDIATE");
    try {
      const result = callback();
      database.exec("COMMIT");
      return result;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  function saveTeam(team, options = {}) {
    const now = nowIso();
    const source = options.source || team.source || "local-user";
    const profile = {
      clubName: team.clubName || "",
      country: team.country || "",
      municipality: team.municipality || "",
      province: team.province || "",
      arenaAddress: team.arenaAddress || "",
      coach: team.coach || "",
      assistantCoach: team.assistantCoach || "",
      website: team.website || "",
      founded: team.founded || "",
      sponsorName: team.sponsorName || "",
      sourceLabel: team.sourceLabel || "",
      sourceUrl: team.sourceUrl || "",
      clubExternalId: team.clubExternalId || "",
      clubSourceUrl: team.clubSourceUrl || "",
      dataStatus: team.dataStatus || "",
      verifiedAt: team.verifiedAt || "",
      logoStatus: team.logoStatus || "",
      officialLogoUrl: team.officialLogoUrl || "",
      colorStatus: team.colorStatus || "",
      detailSources: Array.isArray(team.detailSources) ? team.detailSources : [],
      notes: team.notes || ""
    };
    upsertTeam.run({
      id: team.id,
      clubId: options.clubId || null,
      name: team.name || "Equipo",
      shortName: team.shortName || "",
      primaryColor: team.primaryColor || "#2DD4BF",
      secondaryColor: team.secondaryColor || "#0F766E",
      logo: team.logo || "",
      category: team.category || "",
      city: team.city || "",
      arena: team.arena || "",
      source,
      externalId: options.externalId || team.externalId || null,
      profileJson: json(profile),
      createdAt: team.createdAt || now,
      updatedAt: now
    });

    for (const player of team.players || []) {
      savePlayer(player, team.id, options.competitionSeasonId || null, {
        source: player.source || source
      });
    }
  }

  function savePlayer(player, teamId, competitionSeasonId = null, options = {}) {
    const now = nowIso();
    const source = options.source || player.source || "local-user";
    const profile = {
      secondaryPosition: player.secondaryPosition || "",
      height: player.height || "",
      weight: player.weight || "",
      wingspan: player.wingspan || "",
      birthDate: player.birthDate || "",
      nationality: player.nationality || "",
      dominantHand: player.dominantHand || "",
      role: player.role || "",
      email: player.email || "",
      phone: player.phone || "",
      isDemo: Boolean(player.isDemo),
      dataStatus: player.dataStatus || "",
      sourceUrl: player.sourceUrl || "",
      verifiedAt: player.verifiedAt || "",
      notes: player.notes || ""
    };
    upsertPlayer.run({
      id: player.id,
      fullName: player.name || "Jugador",
      photo: player.photo || "",
      source,
      externalId: options.externalId || player.externalId || null,
      profileJson: json(profile),
      createdAt: player.createdAt || now,
      updatedAt: now
    });

    const rosterId =
      options.rosterId ||
      `roster-${competitionSeasonId || "unassigned"}-${teamId}-${player.id}`;
    database.prepare(`
      INSERT INTO roster_memberships (
        id, competition_season_id, team_id, player_id, jersey_number,
        position, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        jersey_number = excluded.jersey_number,
        position = excluded.position,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(
      rosterId,
      competitionSeasonId,
      teamId,
      player.id,
      String(player.number || ""),
      player.position || "",
      player.status || "Activo",
      now,
      now
    );
  }

  function syncProject(project, ownerProfileId = "legacy-local") {
    if (!project?.id) throw new Error("El análisis no tiene un identificador válido.");
    return transaction(() => {
      const requestedCompetitionSeasonId =
        project.match?.competitionSeasonId || null;
      const competitionSeasonId =
        requestedCompetitionSeasonId &&
        database
          .prepare("SELECT 1 AS found FROM competition_seasons WHERE id = ?")
          .get(requestedCompetitionSeasonId)
          ? requestedCompetitionSeasonId
          : null;
      for (const team of project.teams || []) {
        saveTeam(team, { competitionSeasonId });
        if (competitionSeasonId) {
          database.prepare(`
            INSERT INTO competition_teams (
              competition_season_id, team_id, group_name, seed
            )
            VALUES (?, ?, '', NULL)
            ON CONFLICT(competition_season_id, team_id) DO NOTHING
          `).run(competitionSeasonId, team.id);
        }
      }

      let matchId = null;
      if (
        project.match?.homeTeamId &&
        project.match?.awayTeamId &&
        project.match.homeTeamId !== project.match.awayTeamId
      ) {
        matchId = project.match.id || `local-match-${project.id}`;
        const now = nowIso();
        database.prepare(`
          INSERT INTO matches (
            id, competition_season_id, round_name, scheduled_at, venue,
            home_team_id, away_team_id, home_score, away_score, status,
            source, external_id, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            competition_season_id = excluded.competition_season_id,
            round_name = excluded.round_name,
            scheduled_at = excluded.scheduled_at,
            venue = excluded.venue,
            home_team_id = excluded.home_team_id,
            away_team_id = excluded.away_team_id,
            home_score = excluded.home_score,
            away_score = excluded.away_score,
            status = excluded.status,
            updated_at = excluded.updated_at
        `).run(
          matchId,
          competitionSeasonId,
          project.match.roundName || "",
          project.match.scheduledAt || null,
          project.match.venue || "",
          project.match.homeTeamId,
          project.match.awayTeamId,
          nullableNumber(project.match.homeScore),
          nullableNumber(project.match.awayScore),
          project.match.status || "scheduled",
          project.match.source || "local-user",
          project.match.externalId || null,
          project.createdAt || now,
          now
        );
      }

      const now = nowIso();
      const projectArchive = {
        version: project.version,
        template: project.template,
        playbook: project.playbook,
        teams: (project.teams || []).map((team) => ({
          id: team.id,
          name: team.name,
          playerIds: (team.players || []).map((player) => player.id)
        })),
        match: project.match
      };
      database.prepare(`
        INSERT INTO analyses (
          id, workspace_id, match_id, project_name, video_name,
          video_path_local, video_duration, visibility, project_json,
          created_at, updated_at, owner_profile_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'private', ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          match_id = excluded.match_id,
          project_name = excluded.project_name,
          video_name = excluded.video_name,
          video_path_local = excluded.video_path_local,
          video_duration = excluded.video_duration,
          project_json = excluded.project_json,
          owner_profile_id = excluded.owner_profile_id,
          updated_at = excluded.updated_at
      `).run(
        project.id,
        LOCAL_WORKSPACE_ID,
        matchId,
        project.projectName || "Análisis",
        project.video?.name || "",
        project.video?.path || "",
        Number(project.video?.duration) || 0,
        json(projectArchive),
        project.createdAt || now,
        now,
        ownerProfileId || "legacy-local"
      );

      database.prepare("DELETE FROM events WHERE analysis_id = ?").run(project.id);
      const insertEvent = database.prepare(`
        INSERT INTO events (
          id, analysis_id, tag_id, tag_name, color, mode, anchor, start, end,
          team_id, player_id, team_name, player_name, shot_zone_id,
          shot_zone_name, shot_points, notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const event of project.events || []) {
        insertEvent.run(
          event.id,
          project.id,
          event.tagId || "",
          event.tagName || "Evento",
          event.color || "",
          event.mode === "interval" ? "interval" : "point",
          Number(event.anchor) || 0,
          Math.max(0, Number(event.start) || 0),
          Math.max(Number(event.start) || 0, Number(event.end) || 0),
          event.teamId || null,
          event.playerId || null,
          event.team || "",
          event.player || "",
          event.shotZoneId || "",
          event.shotZoneName || "",
          Number(event.shotPoints) || 0,
          event.notes || "",
          event.createdAt || now,
          now
        );
      }

      database.prepare(`
        INSERT INTO sync_queue (
          entity_type, entity_id, operation, payload_json,
          attempts, last_error, created_at, updated_at
        )
        VALUES ('analysis', ?, 'upsert', ?, 0, '', ?, ?)
        ON CONFLICT(entity_type, entity_id, operation) DO UPDATE SET
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at
      `).run(project.id, json({ id: project.id, updatedAt: now }), now, now);

      return { ok: true, analysisId: project.id };
    });
  }

  function finalizeProject(project, ownerProfileId) {
    if (!project?.id || !ownerProfileId) {
      throw new Error("No se puede crear el histórico sin proyecto y perfil.");
    }
    const now = nowIso();
    const teams = (project.teams || []).map((team) => ({
      id: team.id,
      name: team.name,
      shortName: team.shortName || "",
      logo: team.logo || "",
      primaryColor: team.primaryColor || "#08756D",
      secondaryColor: team.secondaryColor || "#BDEB62",
      category: team.category || "",
      season: team.season || "",
      competitionId: team.competitionId || "",
      players: (team.players || []).map((player) => ({
        id: player.id,
        name: player.name,
        number: player.number || "",
        position: player.position || "",
        photo: player.photo || ""
      }))
    }));
    const events = (project.events || []).map((event) => ({
      id: event.id,
      tagId: event.tagId || "",
      tagName: event.tagName || "Acción",
      color: event.color || "",
      mode: event.mode === "interval" ? "interval" : "point",
      teamId: event.teamId || "",
      playerId: event.playerId || "",
      team: event.team || "",
      player: event.player || "",
      shotZoneId: event.shotZoneId || "",
      shotZoneName: event.shotZoneName || "",
      shotPoints: Number(event.shotPoints) || 0,
      notes: event.notes || ""
    }));
    const byTag = new Map();
    const byTeam = new Map();
    const byPlayer = new Map();
    for (const event of events) {
      byTag.set(event.tagId, (byTag.get(event.tagId) || 0) + 1);
      if (event.teamId) {
        byTeam.set(event.teamId, (byTeam.get(event.teamId) || 0) + 1);
      }
      if (event.playerId) {
        byPlayer.set(event.playerId, (byPlayer.get(event.playerId) || 0) + 1);
      }
    }
    const summary = {
      totalEvents: events.length,
      uniquePlayers: byPlayer.size,
      byTag: Object.fromEntries(byTag),
      byTeam: Object.fromEntries(byTeam),
      byPlayer: Object.fromEntries(byPlayer)
    };
    const match = {
      ...(project.match || {}),
      videoDuration: Number(project.video?.duration) || 0
    };
    database.prepare(`
      INSERT INTO game_records (
        id, owner_profile_id, project_name, match_json, teams_json,
        events_json, summary_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        owner_profile_id = excluded.owner_profile_id,
        project_name = excluded.project_name,
        match_json = excluded.match_json,
        teams_json = excluded.teams_json,
        events_json = excluded.events_json,
        summary_json = excluded.summary_json,
        updated_at = excluded.updated_at
    `).run(
      project.id,
      ownerProfileId,
      project.projectName || "Partido analizado",
      json(match),
      json(teams, []),
      json(events, []),
      json(summary),
      project.createdAt || now,
      now
    );
    return { ok: true, recordId: project.id };
  }

  function deleteGameRecord(recordId, ownerProfileId) {
    const result = database.prepare(`
      DELETE FROM game_records
      WHERE id = ? AND owner_profile_id = ?
    `).run(recordId, ownerProfileId);
    return { ok: true, deleted: result.changes > 0 };
  }

  function snapshot(ownerProfileId = "") {
    const competitions = database.prepare(`
      SELECT
        cs.id,
        c.id AS competition_id,
        c.name AS competition_name,
        c.short_name,
        c.governing_body,
        s.id AS season_id,
        s.label AS season_label,
        cs.status,
        COUNT(DISTINCT ct.team_id) AS team_count,
        COUNT(DISTINCT m.id) AS match_count
      FROM competition_seasons cs
      JOIN competitions c ON c.id = cs.competition_id
      JOIN seasons s ON s.id = cs.season_id
      LEFT JOIN competition_teams ct ON ct.competition_season_id = cs.id
      LEFT JOIN matches m ON m.competition_season_id = cs.id
      GROUP BY cs.id
      ORDER BY s.starts_on DESC, c.name
    `).all().map((row) => ({
      id: row.id,
      competitionId: row.competition_id,
      name: row.competition_name,
      shortName: row.short_name,
      governingBody: row.governing_body,
      seasonId: row.season_id,
      seasonLabel: row.season_label,
      status: row.status,
      teamCount: Number(row.team_count),
      matchCount: Number(row.match_count)
    }));

    const teamRows = database.prepare(`
      SELECT
        t.*,
        COUNT(DISTINCT rm.player_id) AS player_count,
        COUNT(DISTINCT e.id) AS event_count
      FROM teams t
      LEFT JOIN roster_memberships rm ON rm.team_id = t.id
      LEFT JOIN events e ON e.team_id = t.id
      GROUP BY t.id
      ORDER BY t.name COLLATE NOCASE
    `).all();
    const teams = teamRows.map((row) => ({
      ...mapTeamRow(row),
      playerCount: Number(row.player_count),
      eventCount: Number(row.event_count)
    }));

    const players = database.prepare(`
      WITH event_totals AS (
        SELECT
          player_id,
          COUNT(DISTINCT id) AS event_count,
          COUNT(DISTINCT analysis_id) AS analysis_count
        FROM events
        WHERE player_id IS NOT NULL
        GROUP BY player_id
      ),
      preferred_roster AS (
        SELECT
          rm.*,
          t.name AS team_name,
          ROW_NUMBER() OVER (
            PARTITION BY rm.player_id
            ORDER BY
              COALESCE(s.is_current, 0) DESC,
              CASE WHEN rm.competition_season_id IS NULL THEN 1 ELSE 0 END,
              rm.updated_at DESC
          ) AS roster_rank
        FROM roster_memberships rm
        JOIN teams t ON t.id = rm.team_id
        LEFT JOIN competition_seasons cs ON cs.id = rm.competition_season_id
        LEFT JOIN seasons s ON s.id = cs.season_id
      )
      SELECT
        p.id,
        p.full_name,
        p.photo,
        p.source,
        p.external_id,
        p.profile_json,
        pr.id AS roster_id,
        pr.competition_season_id,
        pr.jersey_number,
        pr.position,
        pr.status,
        pr.team_id,
        pr.team_name,
        COALESCE(et.event_count, 0) AS event_count,
        COALESCE(et.analysis_count, 0) AS analysis_count
      FROM players p
      LEFT JOIN preferred_roster pr
        ON pr.player_id = p.id AND pr.roster_rank = 1
      LEFT JOIN event_totals et ON et.player_id = p.id
      ORDER BY p.full_name COLLATE NOCASE
    `).all().map((row) => ({
      id: row.id,
      name: row.full_name,
      photo: row.photo,
      source: row.source,
      externalId: row.external_id || "",
      rosterId: row.roster_id || "",
      competitionSeasonId: row.competition_season_id || "",
      number: row.jersey_number || "",
      position: row.position || "",
      status: row.status || "",
      teamId: row.team_id || "",
      teamName: row.team_name || "",
      eventCount: Number(row.event_count),
      analysisCount: Number(row.analysis_count),
      ...parseJson(row.profile_json, {})
    }));

    const rosters = database.prepare(`
      SELECT
        rm.id,
        rm.competition_season_id,
        rm.team_id,
        rm.player_id,
        rm.jersey_number,
        rm.position,
        rm.status
      FROM roster_memberships rm
      ORDER BY rm.updated_at DESC
    `).all().map((row) => ({
      id: row.id,
      competitionSeasonId: row.competition_season_id || "",
      teamId: row.team_id,
      playerId: row.player_id,
      number: row.jersey_number || "",
      position: row.position || "",
      status: row.status || ""
    }));

    const competitionTeams = database.prepare(`
      SELECT
        competition_season_id,
        team_id,
        group_name,
        seed
      FROM competition_teams
      ORDER BY competition_season_id, COALESCE(seed, 9999), team_id
    `).all().map((row) => ({
      competitionSeasonId: row.competition_season_id,
      teamId: row.team_id,
      groupName: row.group_name || "",
      seed: row.seed
    }));

    const matches = database.prepare(`
      SELECT
        m.*,
        home.name AS home_team_name,
        home.short_name AS home_short_name,
        home.primary_color AS home_color,
        home.logo AS home_logo,
        away.name AS away_team_name,
        away.short_name AS away_short_name,
        away.primary_color AS away_color,
        away.logo AS away_logo,
        c.name AS competition_name,
        s.label AS season_label,
        COUNT(DISTINCT a.id) AS analysis_count,
        COUNT(DISTINCT e.id) AS event_count
      FROM matches m
      JOIN teams home ON home.id = m.home_team_id
      JOIN teams away ON away.id = m.away_team_id
      LEFT JOIN competition_seasons cs ON cs.id = m.competition_season_id
      LEFT JOIN competitions c ON c.id = cs.competition_id
      LEFT JOIN seasons s ON s.id = cs.season_id
      LEFT JOIN analyses a ON a.match_id = m.id
      LEFT JOIN events e ON e.analysis_id = a.id
      GROUP BY m.id
      ORDER BY
        CASE WHEN m.scheduled_at IS NULL THEN 1 ELSE 0 END,
        m.scheduled_at DESC,
        m.created_at DESC
    `).all().map((row) => ({
      id: row.id,
      competitionSeasonId: row.competition_season_id || "",
      competitionName: row.competition_name || "Partido local",
      seasonLabel: row.season_label || "",
      roundName: row.round_name,
      scheduledAt: row.scheduled_at || "",
      venue: row.venue,
      homeTeamId: row.home_team_id,
      awayTeamId: row.away_team_id,
      homeTeamName: row.home_team_name,
      awayTeamName: row.away_team_name,
      homeShortName: row.home_short_name,
      awayShortName: row.away_short_name,
      homeColor: row.home_color,
      awayColor: row.away_color,
      homeLogo: row.home_logo,
      awayLogo: row.away_logo,
      homeScore: row.home_score,
      awayScore: row.away_score,
      status: row.status,
      source: row.source,
      externalId: row.external_id || "",
      analysisCount: Number(row.analysis_count),
      eventCount: Number(row.event_count)
    }));

    const analyses = database.prepare(`
      SELECT
        a.id,
        a.project_name,
        a.video_name,
        a.video_duration,
        a.visibility,
        a.updated_at,
        a.match_id,
        COUNT(e.id) AS event_count
      FROM analyses a
      LEFT JOIN events e ON e.analysis_id = a.id
      GROUP BY a.id
      ORDER BY a.updated_at DESC
    `).all().map((row) => ({
      id: row.id,
      projectName: row.project_name,
      videoName: row.video_name,
      videoDuration: row.video_duration,
      visibility: row.visibility,
      updatedAt: row.updated_at,
      matchId: row.match_id || "",
      eventCount: Number(row.event_count)
    }));

    const totals = database.prepare(`
      SELECT
        (SELECT COUNT(*) FROM teams) AS teams,
        (SELECT COUNT(*) FROM players) AS players,
        (SELECT COUNT(*) FROM matches) AS matches,
        (SELECT COUNT(*) FROM analyses) AS analyses,
        (SELECT COUNT(*) FROM events) AS events,
        (SELECT COUNT(*) FROM sync_queue) AS pending_sync
    `).get();

    const gameRecords = ownerProfileId
      ? database.prepare(`
          SELECT *
          FROM game_records
          WHERE owner_profile_id = ?
          ORDER BY updated_at DESC
        `).all(ownerProfileId)
      : database.prepare(`
          SELECT *
          FROM game_records
          ORDER BY updated_at DESC
        `).all();
    const mappedGameRecords = gameRecords.map((row) => ({
      id: row.id,
      ownerProfileId: row.owner_profile_id,
      projectName: row.project_name,
      match: parseJson(row.match_json, {}),
      teams: parseJson(row.teams_json, []),
      events: parseJson(row.events_json, []),
      summary: parseJson(row.summary_json, {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return {
      databaseVersion: DATABASE_VERSION,
      totals: {
        teams: Number(totals.teams),
        players: Number(totals.players),
        matches: Number(totals.matches),
        analyses: Number(totals.analyses),
        events: Number(totals.events),
        pendingSync: Number(totals.pending_sync)
      },
      competitions,
      teams,
      players,
      rosters,
      competitionTeams,
      matches,
      analyses,
      gameRecords: mappedGameRecords
    };
  }

  async function backupTo(destination) {
    database.exec("PRAGMA wal_checkpoint(FULL)");
    await backup(database, destination, { rate: 256 });
    return destination;
  }

  function close() {
    if (database.isOpen) database.close();
  }

  cleanupUnusedLegacyCatalog();

  return {
    backupTo,
    close,
    database,
    filePath,
    snapshot,
    syncProject,
    finalizeProject,
    deleteGameRecord,
    cleanupUnusedLegacyCatalog
  };
}

function deterministicId(prefix, value) {
  const digest = crypto
    .createHash("sha256")
    .update(String(value || ""))
    .digest("hex")
    .slice(0, 20);
  return `${prefix}-${digest}`;
}

module.exports = {
  DATABASE_VERSION,
  LOCAL_WORKSPACE_ID,
  createDatabaseService,
  deterministicId
};
