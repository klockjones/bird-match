create extension if not exists "pgcrypto";

create type public.app_role as enum ('admin', 'staff');
create type public.event_type as enum ('general', 'blue_white');
create type public.event_status as enum ('draft', 'published', 'closed');
create type public.match_status as enum ('waiting', 'ready', 'playing', 'done');
create type public.staff_role as enum ('owner', 'staff', 'viewer');
create type public.team_side as enum ('A', 'B');
create type public.team_color as enum ('blue', 'white');
create type public.import_type as enum ('players', 'matches');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role public.app_role not null default 'staff',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  public_uuid uuid not null default gen_random_uuid() unique,
  event_type public.event_type not null default 'general',
  status public.event_status not null default 'draft',
  event_date date,
  location text,
  is_public boolean not null default false,
  scoring_rule text not null default 'match_win',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gender text,
  level text,
  phone text,
  memo text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.event_players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  team public.team_color,
  seed integer,
  note text,
  created_at timestamptz not null default now(),
  unique (event_id, player_id)
);

create table public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.staff_role not null default 'staff',
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  round_name text,
  group_name text,
  match_no integer not null,
  court_no text,
  status public.match_status not null default 'waiting',
  team1_score integer not null default 0,
  team2_score integer not null default 0,
  winner_side public.team_side,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  sort_order integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, match_no),
  check (team1_score >= 0),
  check (team2_score >= 0)
);

create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  side public.team_side not null,
  player_id uuid not null references public.players(id) on delete restrict,
  position integer not null check (position in (1, 2)),
  created_at timestamptz not null default now(),
  unique (match_id, side, position),
  unique (match_id, player_id)
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  import_type public.import_type not null,
  file_name text not null,
  row_count integer not null default 0,
  success_count integer not null default 0,
  fail_count integer not null default 0,
  raw_snapshot jsonb,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  uploaded_at timestamptz not null default now()
);

create index idx_events_public_uuid on public.events(public_uuid);
create index idx_event_players_event_id on public.event_players(event_id);
create index idx_event_staff_event_id on public.event_staff(event_id);
create index idx_matches_event_id on public.matches(event_id);
create index idx_matches_event_sort on public.matches(event_id, sort_order);
create index idx_match_players_match_id on public.match_players(match_id);
create index idx_imports_event_id on public.imports(event_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_events_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

create trigger set_matches_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  );
$$;

create or replace function public.is_event_staff(target_event_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.event_staff s
    where s.event_id = target_event_id
      and s.user_id = auth.uid()
      and s.role in ('owner', 'staff')
  );
$$;

create or replace function public.can_view_event(target_event_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and (
        e.is_public = true
        or public.is_admin()
        or exists (
          select 1
          from public.event_staff s
          where s.event_id = e.id
            and s.user_id = auth.uid()
        )
      )
  );
$$;

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.players enable row level security;
alter table public.event_players enable row level security;
alter table public.event_staff enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.imports enable row level security;

create policy "users can read self"
on public.users
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "admin manages users"
on public.users
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "public or staff can read events"
on public.events
for select
to anon, authenticated
using (
  is_public = true
  or public.is_admin()
  or exists (
    select 1 from public.event_staff s
    where s.event_id = id
      and s.user_id = auth.uid()
  )
);

create policy "admin creates events"
on public.events
for insert
to authenticated
with check (public.is_admin());

create policy "staff updates own events"
on public.events
for update
to authenticated
using (public.is_admin() or public.is_event_staff(id))
with check (public.is_admin() or public.is_event_staff(id));

create policy "admin deletes events"
on public.events
for delete
to authenticated
using (public.is_admin());

create policy "authenticated can read players"
on public.players
for select
to authenticated
using (true);

create policy "admin manages players"
on public.players
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "view event players"
on public.event_players
for select
to anon, authenticated
using (public.can_view_event(event_id));

create policy "manage event players"
on public.event_players
for all
to authenticated
using (public.is_admin() or public.is_event_staff(event_id))
with check (public.is_admin() or public.is_event_staff(event_id));

create policy "view event staff"
on public.event_staff
for select
to authenticated
using (public.is_admin() or public.is_event_staff(event_id));

create policy "manage event staff"
on public.event_staff
for all
to authenticated
using (public.is_admin() or public.is_event_staff(event_id))
with check (public.is_admin() or public.is_event_staff(event_id));

create policy "view matches"
on public.matches
for select
to anon, authenticated
using (public.can_view_event(event_id));

create policy "manage matches"
on public.matches
for all
to authenticated
using (public.is_admin() or public.is_event_staff(event_id))
with check (public.is_admin() or public.is_event_staff(event_id));

create policy "view match players"
on public.match_players
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_id
      and public.can_view_event(m.event_id)
  )
);

create policy "manage match players"
on public.match_players
for all
to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_id
      and (public.is_admin() or public.is_event_staff(m.event_id))
  )
)
with check (
  exists (
    select 1
    from public.matches m
    where m.id = match_id
      and (public.is_admin() or public.is_event_staff(m.event_id))
  )
);

create policy "view imports"
on public.imports
for select
to authenticated
using (public.is_admin() or public.is_event_staff(event_id));

create policy "manage imports"
on public.imports
for all
to authenticated
using (public.is_admin() or public.is_event_staff(event_id))
with check (public.is_admin() or public.is_event_staff(event_id));
