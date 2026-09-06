drop policy if exists "manage event staff" on public.event_staff;

create policy "admin manages event staff"
on public.event_staff
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
