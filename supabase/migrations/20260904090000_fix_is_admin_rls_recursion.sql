-- is_admin()/is_event_staff()/can_view_event() ran as SECURITY INVOKER, so their internal
-- queries were themselves subject to RLS. public.users' "admin manages users" policy calls
-- is_admin() for every row it checks, so scanning any row other than the caller's own re-enters
-- is_admin() -> queries public.users -> re-checks RLS -> calls is_admin() again, recursing until
-- Postgres hits "stack depth limit exceeded". Marking these SECURITY DEFINER makes their internal
-- queries run as the function owner (bypassing RLS), breaking the recursion.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
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
