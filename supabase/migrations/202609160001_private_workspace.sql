-- Foundation only: apply to a Supabase development project before connecting UI.
-- No video blobs, local file paths or local profile passwords belong here.
begin;
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 240),
  document jsonb not null default '{}'::jsonb check (jsonb_typeof(document) = 'object'),
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index analyses_owner_updated on public.analyses(owner_id, updated_at desc);
create table public.user_libraries (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  document jsonb not null default '{}'::jsonb check (jsonb_typeof(document) = 'object'),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
create function public.advance_document_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;
create trigger analyses_revision before update on public.analyses
for each row execute function public.advance_document_revision();
create trigger libraries_revision before update on public.user_libraries
for each row execute function public.advance_document_revision();
alter table public.analyses enable row level security;
alter table public.user_libraries enable row level security;
revoke all on public.analyses, public.user_libraries from anon;
grant select, insert, update, delete on public.analyses, public.user_libraries to authenticated;
create policy analyses_private on public.analyses for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy libraries_private on public.user_libraries for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
commit;
