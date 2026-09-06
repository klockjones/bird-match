# Bird Match Supabase Connection Runbook

This is the fastest safe path to connect the current project to a real Supabase instance.

## 1. Prepare the Supabase project

In Supabase:

1. Create a new project
2. Wait for database initialization
3. Open **Authentication > Providers**
4. Ensure **Email** sign-in is enabled

Collect these two values:

- Project URL
- Project anon/public key

---

## 2. Apply database SQL

Open **SQL Editor** and run these files in order.

### Step 1

Run:

`supabase/migrations/20260903143000_init_matchboard.sql`

This creates:

- enums
- users/events/players/event_players/event_staff/matches/match_players/imports
- indexes
- RLS functions/policies

### Step 2

Run:

`supabase/migrations/20260903150000_auth_bootstrap.sql`

This adds:

- `auth.users -> public.users` sync trigger
- first-user admin bootstrap
- email/name sync on auth update

---

## 3. Create local env file

In this repo root, create `.env.local` from `.env.local.template`.

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Do **not** add service role credentials here.

---

## 4. Start the local app

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Expected behavior:

- `/` redirects to `/login`
- sign up works
- first signed-up user becomes `admin`

---

## 5. Verify auth bootstrap

After first signup, confirm in Supabase Table Editor:

### `auth.users`

- one auth user exists

### `public.users`

- matching `id`
- correct email
- generated name or supplied name
- `role = admin`

If this row is not created, the auth bootstrap SQL was not applied correctly.

---

## 6. Verify application flow

### Event flow

1. Create one event in `/dashboard`
2. Open the event detail page
3. Confirm a `public_uuid` exists

### Player flow

1. Go to `/dashboard/players`
2. Add 2-4 sample players manually
3. Add them to the event

### Match flow

1. Create at least one match
2. Update score and status
3. Confirm match edits save correctly

### Public flow

1. Set event to public
2. Open `/bracket/{public_uuid}`
3. Confirm public page renders
4. Update score in dashboard
5. Confirm public page auto-refreshes

### Import flow

1. Use files under `templates/`
2. Upload roster template
3. Upload matches template
4. Test one broken row and confirm error details appear

---

## 7. If something fails

### Login works but dashboard insert fails

Likely cause:

- `public.users` bootstrap trigger missing
- RLS blocked because the user profile row does not exist

Check:

- `public.users` has a row for the signed-in user

### Public page 404s

Check:

- event `is_public = true`
- correct `public_uuid`

### Match import fails with unknown names

Check:

- roster import happened first
- event participants were added before match import

### Event creation fails with permission error

Check:

- first signup actually became `admin`

---

## 8. Production handoff notes

When local checks pass:

1. Add the same two env vars to Vercel
2. Deploy the project
3. Repeat the smoke test in production

---

## 9. Current caution

File parsing is intentionally limited to CSV files only.

Recommended short-term operational rule:

- use CSV templates for production imports
