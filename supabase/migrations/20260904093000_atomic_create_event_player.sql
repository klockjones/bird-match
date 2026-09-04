-- Creating a brand-new player and linking them to an event was two separate inserts from the
-- app. If the second insert failed, the app tried to roll back the first by deleting the
-- player row it had just created -- but DELETE on public.players is admin-only, so that
-- cleanup silently failed for non-admin staff, leaving an orphaned player record. Wrapping both
-- inserts in one SECURITY DEFINER function makes them atomic: if either insert fails, Postgres
-- rolls back the whole function call automatically, no app-level cleanup delete required.
create or replace function public.create_event_player(
  target_event_id uuid,
  player_name text,
  player_gender text,
  player_level text,
  player_phone text,
  participant_team text,
  participant_seed integer,
  participant_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_player_id uuid;
begin
  if not (public.is_admin() or public.is_event_staff(target_event_id)) then
    raise exception 'not authorized to add participants to this event';
  end if;

  insert into public.players (name, gender, level, phone, is_active)
  values (player_name, player_gender, player_level, player_phone, true)
  returning id into new_player_id;

  insert into public.event_players (event_id, player_id, team, seed, note)
  values (target_event_id, new_player_id, participant_team, participant_seed, participant_note);

  return new_player_id;
end;
$$;

grant execute on function public.create_event_player(uuid, text, text, text, text, text, integer, text) to authenticated;
