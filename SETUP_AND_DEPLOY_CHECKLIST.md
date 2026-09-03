# Bird Match Setup & Deploy Checklist

## 1. Current implementation status

Implemented:

- Next.js App Router scaffold
- Supabase SSR auth wiring
- `users`, `events`, `players`, `event_players`, `event_staff`, `matches`, `match_players`, `imports`
- Event create/list/detail
- Player master + event participants
- Match create/edit/delete/reassign/reorder
- Public bracket page by `public_uuid`
- Staff management
- CSV / XLSX / XLS import
- Import preview before save
- Row-level import error reporting
- Public board auto-refresh

Verified locally:

- `npm run lint`
- `npm run build`
- LSP diagnostics: 0 errors

---

## 2. Supabase project setup

### 2-1. Create project

- Create a new Supabase project
- Enable Email auth
- Confirm project URL and anon key

### 2-2. Apply SQL in this order

1. `supabase/migrations/20260903143000_init_matchboard.sql`
2. `supabase/migrations/20260903150000_auth_bootstrap.sql`

Important:

- The first authenticated signup becomes the first `admin`
- After that, new users default to `staff`

### 2-3. Confirm tables exist

- `users`
- `events`
- `players`
- `event_players`
- `event_staff`
- `matches`
- `match_players`
- `imports`

---

## 3. Local environment setup

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Do not put `service_role` in the frontend env file.

---

## 4. Local run sequence

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Expected first-run flow:

1. Sign up first operator account
2. First account becomes `admin`
3. Create an event
4. Register players or import roster
5. Add event participants
6. Create or import matches
7. Open `/bracket/{public_uuid}`

---

## 5. Recommended smoke test

### Auth

- Sign up first user
- Confirm redirect to `/dashboard`
- Confirm `public.users` row created

### Event

- Create one general event
- Create one blue/white event
- Toggle public visibility

### Players

- Add 4-8 players manually
- Add participants to an event
- Confirm blue/white team assignment works

### Matches

- Create at least 2 matches manually
- Update score and status
- Reassign players
- Delete one match

### Public board

- Open `/bracket/{public_uuid}`
- Confirm current match and queue render
- Confirm auto-refresh updates after operator save

### Imports

- Upload roster CSV
- Upload roster XLSX
- Upload match CSV
- Force one invalid row and confirm row-level error report appears

---

## 6. Vercel deployment checklist

### Vercel project

- Create a new Vercel project for `bird-match`
- Connect the Git repo
- Framework should detect Next.js automatically

### Environment variables in Vercel

Add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Deploy checks

- `/login` loads
- signup/login works
- `/dashboard` works for authenticated user
- `/bracket/{public_uuid}` works for public event
- imports work in production

---

## 7. Operational checklist before real use

- Create at least one admin account
- Add at least one additional event staff user
- Confirm event-level permissions behave correctly
- Create sample event data and rehearse full flow
- Test public board on mobile
- Test public board on large screen / TV / tablet

---

## 8. Known caveats

### XLSX package security warning

Current implementation uses:

- `xlsx@^0.18.5`

`npm audit` reports a high-severity advisory for this package family.

Before production launch, review one of these options:

1. Replace with a safer maintained parser
2. Move spreadsheet parsing to a trusted backend-only environment with stricter file controls
3. Limit accepted files operationally and prefer CSV when possible

### Import behavior

Current import flow is:

- preview first
- then write directly on confirm

It is safer than blind import, but it is not yet a full staged transaction preview system.

### Real-time strategy

Current public board uses client-side auto-refresh every 15 seconds.

That is good enough for MVP. If you need near-instant updates later, add:

- Supabase Realtime
- or a dedicated polling cadence per screen mode

---

## 9. Recommended next improvements

Priority order:

1. Replace or harden XLSX parsing path
2. Normalize dashboard UI/components
3. Add import “predicted changes” summary before commit
4. Add explicit event/member search/filter UI
5. Add match drag-and-drop ordering
6. Add Supabase Realtime instead of timed refresh

---

## 10. Ready-to-use operator scenario

1. Admin logs in
2. Creates event
3. Imports roster file
4. Reviews preview
5. Fixes any row errors
6. Imports bracket file
7. Reviews public link
8. Assigns event staff
9. Staff operate scores in `/dashboard/[eventId]/matches`
10. Audience watches `/bracket/{public_uuid}`
