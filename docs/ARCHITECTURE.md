# Architecture

## High level

```
Browser (React)
   |  anon key, RLS-enforced
   v
Supabase Postgres  <-- RPCs do queue logic + admin actions that don't touch auth.users
   |
   |  service-role key, only inside Edge Functions
   v
Supabase Auth admin API  <-- inviting/deleting/disabling staff logins
```

The browser only ever holds the **anon key**. Every table read/write goes
through Row Level Security (see [`supabase/SCHEMA.md`](../supabase/SCHEMA.md)).
Anything that needs elevated privilege — inviting a staff member by email,
deleting their login, force-signing them out — goes through one of the two
Edge Functions in `supabase/functions/`, which are the only code that ever
holds the service-role key.

## Frontend structure

- **`src/context/AuthContext.jsx`** — wraps the whole app. On mount it reads
  the current Supabase session, then resolves the matching `public.users` row
  (the "profile") via `authService.getAppProfile`. Every page reads `{ user,
  profile, loading }` from `useAuth()` instead of calling Supabase directly.
- **`src/components/ProtectedRoute.jsx`** — two route guards:
  - `PublicOnly` — login pages. If you're already signed in, it redirects you
    straight to your role's dashboard instead of showing the login form again.
  - `RoleRoute` — dashboard pages. Redirects to the right login page if
    you're signed out, or to `/unauthorized` if your role doesn't match.
- **`src/services/*`** — the only files that import `src/lib/supabase.js`.
  Pages never call `supabase.from(...)` directly; they call a named function
  from a service file. This keeps every query/RPC name in one place.
- **`src/pages/*`** — one file per route. `doctor/`, `patient/`,
  `receptionist/`, and `admin/` subfolders hold each role's dashboard pages.

## Why some writes are RPCs instead of `supabase.from(...).insert(...)`

Queue token assignment must be atomic (two patients should never get the
same token number) and some authorization rules ("only the receptionist of
*this* doctor's clinic") don't map cleanly onto a single RLS policy. Both
problems are solved by writing the logic once as a Postgres function
(`SECURITY DEFINER`) and calling it via `supabase.rpc(...)`. See
[`supabase/SCHEMA.md`](../supabase/SCHEMA.md) for the full list and why.

## Realtime

`queueService.subscribeToDoctorQueue` opens a Supabase Realtime channel
filtered to one doctor's `queue_entries` rows. Both dashboards and the
patient queue board use this instead of polling — see
`src/services/queueService.js`.

## Patient flow

`/` (PatientLogin) → `/clinic` (pick a clinic) → `/doctors` (pick a doctor,
calls `join_queue`) → `/confirmation` (shows the assigned token) → `/queue`
(live position via Realtime).

## Staff flow

`/roles` → role-specific login (`/doctor-login`, `/receptionist-login`,
`/admin-login`) → role-specific dashboard. See
[`docs/AUTH.md`](AUTH.md) for how those accounts get created in the first
place.
