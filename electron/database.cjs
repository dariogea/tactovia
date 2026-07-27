const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { backup, DatabaseSync } = require("node:sqlite");
const {
  FBRM_CATALOG_VERSION,
  createFbrmCatalog
} = require("./catalogs/fbrm-2026-27.cjs");

const DATABASE_VERSION = 2;
const PILOT_COMPETITION_ID = "competition-fbrm-1dm";
const PILOT_SEASON_ID = "season-2026-27";
const PILOT_COMPETITION_SEASON_ID = "competition-season-fbrm-1dm-2026-27";
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
}

function seedDatabase(database) {
  const now = nowIso();
  database.prepare(`
    INSERT INTO workspaces (id, name, visibility, created_at, updated_at)
    VALUES (?, ?, 'private', ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(LOCAL_WORKSPACE_ID, "Mi espacio de scouting", now, now);

  database.prepare(`
    INSERT INTO competitions (
      id, name, short_name, governing_body, country, region, level, gender,
      source, external_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      short_name = excluded.short_name,
      updated_at = excluded.updated_at
  `).run(
    PILOT_COMPETITION_ID,
    "Primera División Masculina GESA",
    "1DM GESA",
    "FBRM",
    "España",
    "Región de Murcia",
    "Regional sénior",
    "Masculina",
    "official-catalog",
    "fbrm-1dm",
    now,
    now
  );

  database.prepare(`
    INSERT INTO seasons (
      id, label, starts_on, ends_on, is_current, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      label = excluded.label,
      is_current = 1,
      updated_at = excluded.updated_at
  `).run(PILOT_SEASON_ID, "2026/27", "2026-07-01", "2027-06-30", now, now);

  database.prepare(`
    INSERT INTO competition_seasons (
      id, competition_id, season_id, name, format, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'planned', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      updated_at = excluded.updated_at
  `).run(
    PILOT_COMPETITION_SEASON_ID,
    PILOT_COMPETITION_ID,
    PILOT_SEASON_ID,
    "Primera División Masculina GESA 2026/27",
    "Formato FBRM 2026/27",
    now,
    now
  );

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

  function syncProject(project) {
    if (!project?.id) throw new Error("El análisis no tiene un identificador válido.");
    return transaction(() => {
      const competitionSeasonId = project.match?.competitionSeasonId || null;
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
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'private', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          match_id = excluded.match_id,
          project_name = excluded.project_name,
          video_name = excluded.video_name,
          video_path_local = excluded.video_path_local,
          video_duration = excluded.video_duration,
          project_json = excluded.project_json,
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
        now
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

  function snapshot() {
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

    return {
      databaseVersion: DATABASE_VERSION,
      pilotCompetitionSeasonId: PILOT_COMPETITION_SEASON_ID,
      catalog: {
        fbrmVersion:
          database
            .prepare("SELECT value FROM metadata WHERE key = ?")
            .get("catalog_fbrm_2026_27_version")?.value || "",
        fbrmTeamCount: Number(
          database
            .prepare(`
              SELECT COUNT(*) AS total
              FROM competition_teams
              WHERE competition_season_id = ?
            `)
            .get(PILOT_COMPETITION_SEASON_ID).total
        ),
        officialLogoCount: teams.filter(
          (team) =>
            team.source === "official-fbrm-2026-27" &&
            team.logoStatus === "official-bundled"
        ).length,
        provisionalLogoCount: teams.filter(
          (team) =>
            team.source === "official-fbrm-2026-27" &&
            team.logoStatus === "provisional"
        ).length
      },
      cloud: {
        configured: Boolean(
          process.env.SCOUT_SUPABASE_URL && process.env.SCOUT_SUPABASE_ANON_KEY
        ),
        mode: process.env.SCOUT_SUPABASE_URL ? "configured" : "local-cache"
      },
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
      analyses
    };
  }

  function importCatalog(catalog) {
    let competitionSeasonId =
      catalog.competitionSeasonId || PILOT_COMPETITION_SEASON_ID;
    return transaction(() => {
      if (catalog.competition) {
        const now = nowIso();
        const competition = catalog.competition;
        const season = competition.season || {};
        const competitionSeason = competition.competitionSeason || {};
        const existingSeason = season.label
          ? database.prepare("SELECT id FROM seasons WHERE label = ?").get(season.label)
          : null;
        const seasonDatabaseId = existingSeason?.id || season.id;
        database.prepare(`
          INSERT INTO competitions (
            id, name, short_name, governing_body, country, region, level, gender,
            source, external_id, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            short_name = excluded.short_name,
            governing_body = excluded.governing_body,
            country = excluded.country,
            region = excluded.region,
            level = excluded.level,
            gender = excluded.gender,
            external_id = excluded.external_id,
            updated_at = excluded.updated_at
        `).run(
          competition.id,
          competition.name || "Competición importada",
          competition.shortName || "",
          competition.governingBody || "",
          competition.country || "",
          competition.region || "",
          competition.level || "",
          competition.gender || "",
          catalog.source || "admin-import",
          competition.externalId || null,
          now,
          now
        );
        database.prepare(`
          INSERT INTO seasons (
            id, label, starts_on, ends_on, is_current, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            label = excluded.label,
            starts_on = excluded.starts_on,
            ends_on = excluded.ends_on,
            is_current = excluded.is_current,
            updated_at = excluded.updated_at
        `).run(
          seasonDatabaseId,
          season.label || "Temporada importada",
          season.startsOn || null,
          season.endsOn || null,
          season.isCurrent === false ? 0 : 1,
          now,
          now
        );
        database.prepare(`
          INSERT INTO competition_seasons (
            id, competition_id, season_id, name, format, status, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            format = excluded.format,
            status = excluded.status,
            updated_at = excluded.updated_at
        `).run(
          competitionSeason.id || competitionSeasonId,
          competition.id,
          seasonDatabaseId,
          competitionSeason.name ||
            `${competition.name} ${season.label || ""}`.trim(),
          competitionSeason.format || "",
          competitionSeason.status || "active",
          now,
          now
        );
        competitionSeasonId = competitionSeason.id || competitionSeasonId;
      }
      const teamIds = new Set();
      for (const team of catalog.teams || []) {
        saveTeam(team, {
          source: catalog.source || "admin-import",
          externalId: team.externalId || null,
          competitionSeasonId
        });
        teamIds.add(team.id);
        database.prepare(`
          INSERT INTO competition_teams (
            competition_season_id, team_id, group_name, seed
          )
          VALUES (?, ?, ?, ?)
          ON CONFLICT(competition_season_id, team_id) DO UPDATE SET
            group_name = excluded.group_name,
            seed = excluded.seed
        `).run(
          competitionSeasonId,
          team.id,
          team.groupName || "",
          nullableNumber(team.seed)
        );
      }

      for (const match of catalog.matches || []) {
        if (
          !match.homeTeamId ||
          !match.awayTeamId ||
          match.homeTeamId === match.awayTeamId
        ) {
          continue;
        }
        const now = nowIso();
        database.prepare(`
          INSERT INTO matches (
            id, competition_season_id, round_name, scheduled_at, venue,
            home_team_id, away_team_id, home_score, away_score, status,
            source, external_id, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
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
          match.id,
          competitionSeasonId,
          match.roundName || "",
          match.scheduledAt || null,
          match.venue || "",
          match.homeTeamId,
          match.awayTeamId,
          nullableNumber(match.homeScore),
          nullableNumber(match.awayScore),
          match.status || (
            match.homeScore !== null && match.homeScore !== undefined
              ? "finished"
              : "scheduled"
          ),
          catalog.source || "admin-import",
          match.externalId || null,
          now,
          now
        );
      }

      let appliedRosterChanges = 0;
      for (const change of catalog.rosterChanges || []) {
        const current = database.prepare(`
          SELECT id, jersey_number, position, status
          FROM roster_memberships
          WHERE competition_season_id = ? AND team_id = ? AND player_id = ?
        `).get(competitionSeasonId, change.teamId, change.playerId);
        if (!current) continue;
        const status =
          change.action === "baja"
            ? change.status || "Baja"
            : change.action === "alta"
              ? change.status || "Activo"
              : change.status || current.status || "Activo";
        const number =
          change.action === "cambio_dorsal" || change.action === "actualizar"
            ? change.number || current.jersey_number
            : current.jersey_number;
        const position =
          change.action === "cambio_posicion" || change.action === "actualizar"
            ? change.position || current.position
            : current.position;
        database.prepare(`
          UPDATE roster_memberships
          SET jersey_number = ?, position = ?, status = ?, updated_at = ?
          WHERE id = ?
        `).run(number || "", position || "", status, nowIso(), current.id);
        appliedRosterChanges += 1;
      }

      return {
        ok: true,
        competitionSeasonId,
        teams: (catalog.teams || []).length,
        players: (catalog.teams || []).reduce(
          (total, team) => total + (team.players || []).length,
          0
        ),
        matches: (catalog.matches || []).length,
        rosterChanges: appliedRosterChanges
      };
    });
  }

  async function backupTo(destination) {
    database.exec("PRAGMA wal_checkpoint(FULL)");
    await backup(database, destination, { rate: 256 });
    return destination;
  }

  function close() {
    if (database.isOpen) database.close();
  }

  if (options.seedOfficialCatalog !== false) {
    const installedCatalogVersion =
      database
        .prepare("SELECT value FROM metadata WHERE key = ?")
        .get("catalog_fbrm_2026_27_version")?.value || "";
    if (installedCatalogVersion !== FBRM_CATALOG_VERSION) {
      importCatalog(createFbrmCatalog());
      database.prepare(`
        INSERT INTO metadata(key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run("catalog_fbrm_2026_27_version", FBRM_CATALOG_VERSION);
    }
  }

  return {
    backupTo,
    close,
    database,
    filePath,
    importCatalog,
    snapshot,
    syncProject
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
  PILOT_COMPETITION_ID,
  PILOT_COMPETITION_SEASON_ID,
  PILOT_SEASON_ID,
  createDatabaseService,
  deterministicId
};
