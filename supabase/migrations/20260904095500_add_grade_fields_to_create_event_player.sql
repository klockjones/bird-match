-- Add affiliation/english_id/national_level/regional_level to the atomic
-- create-player-and-attach-to-event RPC. Function identity in Postgres is
-- name + parameter list, so adding params isn't a like-for-like REPLACE --
-- drop the old 8-arg signature first, then create the new 12-arg one.
drop function if exists public.create_event_player(uuid, text, text, text, text, text, integer, text);

create function public.create_event_player(
  target_event_id uuid,
  player_name text,
  player_gender text,
  player_level text,
  player_phone text,
  player_affiliation text,
  player_english_id text,
  player_national_level text,
  player_regional_level text,
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

  insert into public.players (name, gender, level, phone, affiliation, english_id, national_level, regional_level, is_active)
  values (player_name, player_gender, player_level, player_phone, player_affiliation, player_english_id, player_national_level, player_regional_level, true)
  returning id into new_player_id;

  insert into public.event_players (event_id, player_id, team, seed, note)
  values (target_event_id, new_player_id, participant_team, participant_seed, participant_note);

  return new_player_id;
end;
$$;

grant execute on function public.create_event_player(uuid, text, text, text, text, text, text, text, text, text, integer, text) to authenticated;
