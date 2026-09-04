-- Event staff need to register a walk-in player on the spot from the event's participant
-- page, not just admins. "admin manages players" still governs update/delete; this adds a
-- narrower policy that opens only INSERT to any authenticated user (public.users.role is
-- either 'admin' or 'staff' -- there is no broader "authenticated" tier to gate against).
create policy "authenticated users can add players"
on public.players
for insert
to authenticated
with check (true);
