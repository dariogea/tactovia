-- ScoutAnalyzer 0.6 · núcleo compartido
-- El vídeo y sus rutas locales nunca se almacenan en esta base.

create extension if not exists pgcrypto;

create type public.scout_role as enum ('user', 'club_admin', 'admin');
create type public.scout_visibility as enum ('private', 'club', 'public');
create type public.scout_membership_role as enum ('viewer', 'analyst', 'manager');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.scout_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id text primary key,
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  visibility public.scout_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.scout_membership_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.competitions (
  id text primary key,
  name text not null,
  short_name text not null default '',
  governing_body text not null default '',
  country text not null default '',
  region text not null default '',
  level text not null default '',
  gender text not null default '',
  source text not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (source, external_id)
);

create table public.seasons (
  id text primary key,
  label text not null unique,
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.competition_seasons (
  id text primary key,
  competition_id text not null references public.competitions(id) on delete cascade,
  season_id text not null references public.seasons(id) on delete cascade,
  name text not null,
  format text not null default '',
  status text not null default 'planned'
    check (status in ('planned', 'active', 'finished', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, season_id)
);

create table public.clubs (
  id text primary key,
  name text not null,
  short_name text not null default '',
  city text not null default '',
  country text not null default '',
  logo_path text not null default '',
  primary_color text not null default '#2DD4BF',
  secondary_color text not null default '#0F766E',
  source text not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (source, external_id)
);

create table public.teams (
  id text primary key,
  club_id text references public.clubs(id) on delete set null,
  name text not null,
  short_name text not null default '',
  primary_color text not null default '#2DD4BF',
  secondary_color text not null default '#0F766E',
  logo_path text not null default '',
  category text not null default '',
  city text not null default '',
  arena text not null default '',
  source text not null default 'manual',
  external_id text,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (source, external_id)
);

create table public.competition_teams (
  competition_season_id text not null
    references public.competition_seasons(id) on delete cascade,
  team_id text not null references public.teams(id) on delete cascade,
  group_name text not null default '',
  seed integer,
  primary key (competition_season_id, team_id)
);

create table public.players (
  id text primary key,
  full_name text not null,
  photo_path text not null default '',
  source text not null default 'manual',
  external_id text,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (source, external_id)
);

create table public.roster_memberships (
  id text primary key,
  competition_season_id text
    references public.competition_seasons(id) on delete cascade,
  team_id text not null references public.teams(id) on delete cascade,
  player_id text not null references public.players(id) on delete cascade,
  jersey_number text not null default '',
  position text not null default '',
  status text not null default 'Activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (competition_season_id, team_id, player_id)
);

create table public.matches (
  id text primary key,
  competition_season_id text
    references public.competition_seasons(id) on delete set null,
  round_name text not null default '',
  scheduled_at timestamptz,
  venue text not null default '',
  home_team_id text not null references public.teams(id) on delete restrict,
  away_team_id text not null references public.teams(id) on delete restrict,
  home_score integer,
  away_score integer,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  source text not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id),
  unique nulls not distinct (source, external_id)
);

create table public.analyses (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  match_id text references public.matches(id) on delete set null,
  project_name text not null,
  video_name text not null default '',
  video_duration double precision not null default 0,
  visibility public.scout_visibility not null default 'private',
  project jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id text primary key,
  analysis_id text not null references public.analyses(id) on delete cascade,
  tag_id text not null default '',
  tag_name text not null,
  color text not null default '',
  mode text not null default 'point' check (mode in ('point', 'interval')),
  anchor double precision not null default 0,
  start_seconds double precision not null,
  end_seconds double precision not null,
  team_id text references public.teams(id) on delete set null,
  player_id text references public.players(id) on delete set null,
  team_name text not null default '',
  player_name text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_seconds >= 0 and end_seconds >= start_seconds)
);

create index events_analysis_time_idx
  on public.events(analysis_id, start_seconds);
create index events_player_tag_idx
  on public.events(player_id, tag_name);
create index events_team_tag_idx
  on public.events(team_id, tag_name);
create index matches_competition_date_idx
  on public.matches(competition_season_id, scheduled_at);
create index analyses_workspace_updated_idx
  on public.analyses(workspace_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'workspaces', 'competitions', 'seasons',
    'competition_seasons', 'clubs', 'teams', 'players',
    'roster_memberships', 'matches', 'analyses', 'events'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

create or replace function public.is_scout_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.can_read_workspace(target_workspace text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace
      and (
        w.owner_id = auth.uid()
        or w.visibility = 'public'
        or exists (
          select 1
          from public.workspace_members wm
          where wm.workspace_id = w.id and wm.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_edit_workspace(target_workspace text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace
      and (
        w.owner_id = auth.uid()
        or exists (
          select 1
          from public.workspace_members wm
          where wm.workspace_id = w.id
            and wm.user_id = auth.uid()
            and wm.role in ('analyst', 'manager')
        )
      )
  );
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  );
  return new;
end;
$$;

create trigger auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.competitions enable row level security;
alter table public.seasons enable row level security;
alter table public.competition_seasons enable row level security;
alter table public.clubs enable row level security;
alter table public.teams enable row level security;
alter table public.competition_teams enable row level security;
alter table public.players enable row level security;
alter table public.roster_memberships enable row level security;
alter table public.matches enable row level security;
alter table public.analyses enable row level security;
alter table public.events enable row level security;

create policy profiles_read_own
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_scout_admin());
create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Un usuario puede cambiar su nombre, pero nunca asignarse un rol.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy workspaces_read_allowed
  on public.workspaces for select to authenticated
  using (public.can_read_workspace(id));
create policy workspaces_insert_owner
  on public.workspaces for insert to authenticated
  with check (owner_id = auth.uid());
create policy workspaces_update_manager
  on public.workspaces for update to authenticated
  using (public.can_edit_workspace(id))
  with check (public.can_edit_workspace(id));
create policy workspaces_delete_owner
  on public.workspaces for delete to authenticated
  using (owner_id = auth.uid());

create policy members_read_workspace
  on public.workspace_members for select to authenticated
  using (public.can_read_workspace(workspace_id));
create policy members_manage_workspace
  on public.workspace_members for all to authenticated
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id
        and (w.owner_id = auth.uid() or public.is_scout_admin())
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id
        and (w.owner_id = auth.uid() or public.is_scout_admin())
    )
  );

-- Catálogo oficial: todos los usuarios registrados consultan; solo admins modifican.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'competitions', 'seasons', 'competition_seasons', 'clubs', 'teams',
    'competition_teams', 'players', 'roster_memberships', 'matches'
  ]
  loop
    execute format(
      'create policy %I_catalog_read on public.%I
       for select to authenticated using (true)',
      table_name,
      table_name
    );
    execute format(
      'create policy %I_catalog_admin_write on public.%I
       for all to authenticated using (public.is_scout_admin())
       with check (public.is_scout_admin())',
      table_name,
      table_name
    );
  end loop;
end;
$$;

create policy analyses_read_allowed
  on public.analyses for select to authenticated
  using (
    owner_id = auth.uid()
    or visibility = 'public'
    or (
      visibility = 'club'
      and public.can_read_workspace(workspace_id)
    )
  );
create policy analyses_insert_allowed
  on public.analyses for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.can_edit_workspace(workspace_id)
  );
create policy analyses_update_allowed
  on public.analyses for update to authenticated
  using (
    owner_id = auth.uid()
    or (
      visibility = 'club'
      and public.can_edit_workspace(workspace_id)
    )
  )
  with check (
    owner_id = auth.uid()
    or (
      visibility = 'club'
      and public.can_edit_workspace(workspace_id)
    )
  );
create policy analyses_delete_allowed
  on public.analyses for delete to authenticated
  using (
    owner_id = auth.uid()
    or (
      visibility = 'club'
      and public.can_edit_workspace(workspace_id)
    )
  );

create policy events_read_through_analysis
  on public.events for select to authenticated
  using (
    exists (
      select 1
      from public.analyses a
      where a.id = analysis_id
        and (
          a.owner_id = auth.uid()
          or a.visibility = 'public'
          or (
            a.visibility = 'club'
            and public.can_read_workspace(a.workspace_id)
          )
        )
    )
  );
create policy events_write_through_analysis
  on public.events for all to authenticated
  using (
    exists (
      select 1
      from public.analyses a
      where a.id = analysis_id
        and (
          a.owner_id = auth.uid()
          or (
            a.visibility = 'club'
            and public.can_edit_workspace(a.workspace_id)
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.analyses a
      where a.id = analysis_id
        and (
          a.owner_id = auth.uid()
          or (
            a.visibility = 'club'
            and public.can_edit_workspace(a.workspace_id)
          )
        )
    )
  );

insert into public.competitions (
  id, name, short_name, governing_body, country, region, level, gender,
  source, external_id
)
values (
  'competition-fbrm-1dm',
  'Primera División Masculina GESA',
  '1DM GESA',
  'FBRM',
  'España',
  'Región de Murcia',
  'Regional sénior',
  'Masculina',
  'official-catalog',
  'fbrm-1dm'
)
on conflict (id) do nothing;

insert into public.seasons (
  id, label, starts_on, ends_on, is_current
)
values (
  'season-2026-27',
  '2026/27',
  '2026-07-01',
  '2027-06-30',
  true
)
on conflict (id) do nothing;

insert into public.competition_seasons (
  id, competition_id, season_id, name, format, status
)
values (
  'competition-season-fbrm-1dm-2026-27',
  'competition-fbrm-1dm',
  'season-2026-27',
  'Primera División Masculina GESA 2026/27',
  'Formato FBRM 2026/27',
  'planned'
)
on conflict (id) do nothing;
