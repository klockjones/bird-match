create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_user_count bigint;
  resolved_name text;
begin
  select count(*) into existing_user_count from public.users;

  resolved_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');

  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(resolved_name, split_part(coalesce(new.email, ''), '@', 1), 'member'),
    case when existing_user_count = 0 then 'admin'::public.app_role else 'staff'::public.app_role end
  )
  on conflict (id) do update
  set email = excluded.email,
      name = excluded.name;

  return new;
end;
$$;

create or replace function public.sync_user_email_and_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_name text;
begin
  resolved_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');

  update public.users
  set email = new.email,
      name = coalesce(resolved_name, name),
      created_at = created_at
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row
execute function public.sync_user_email_and_name();

create policy "users can update own name"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (select role from public.users where id = auth.uid())
  and email = (select email from public.users where id = auth.uid())
);
