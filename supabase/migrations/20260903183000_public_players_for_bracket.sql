create policy "anon can read players for public matchboard"
on public.players
for select
to anon
using (true);
