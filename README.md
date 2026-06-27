# MediQueue

A clinic queue management app. Patients join a virtual queue from their
phone; doctors and receptionists manage it from a dashboard; admins manage
clinics, receptionists, and doctors.

## Roles

| Role | Access | Account creation |
|---|---|---|
| Patient | their own queue tickets | self-signup (email + password) |
| Doctor | their own queue | invited by admin or their clinic's receptionist |
| Receptionist | their clinic's doctors, walk-ins, queues | invited by admin |
| Admin | all clinics, receptionists, doctors | created once by hand in Supabase |

See [`docs/AUTH.md`](docs/AUTH.md) for the full auth/invite flow and
[`docs/ADMIN_SETUP.md`](docs/ADMIN_SETUP.md) for how to bootstrap the first
admin account.

## Stack

- React 19 + Vite + React Router 7
- Tailwind CSS (utility classes) + a small custom design system in `src/index.css`
- Supabase: Postgres + Auth + Realtime + Edge Functions

## Project layout

```
src/
  pages/        route-level screens, see src/pages/README.md
  components/   shared UI (AppShell, ProtectedRoute, InviteStaffForm, ...)
  services/     all Supabase access lives here, see src/services/README.md
  context/      AuthContext — the single source of truth for who's logged in
  lib/          small framework-free helpers (supabase client, queue formatting)
supabase/
  migrations/   schema, see supabase/SCHEMA.md
  functions/    Edge Functions, see supabase/functions/README.md
docs/           architecture + auth design notes
```

## Local setup

1. Copy `.env.example` to `.env` and fill in your Supabase project URL + anon key.
2. `npm install`
3. `npm run dev`

The app will not do anything useful until the database is set up — see
[`docs/ADMIN_SETUP.md`](docs/ADMIN_SETUP.md) for the one-time steps (run the
migration, deploy the Edge Functions, create the first admin).

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run lint` — ESLint
