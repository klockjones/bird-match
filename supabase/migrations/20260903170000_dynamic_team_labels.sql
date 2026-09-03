alter table public.events
  add column if not exists team_label_1 text,
  add column if not exists team_label_2 text;

alter table public.event_players
  alter column team type text using team::text;

drop type if exists public.team_color;
