# MediQueue MVP Architecture and Implementation Plan

## 1. Product Boundary

MediQueue is a mobile-first clinic queue application for three roles:

- Patients authenticate with a verified mobile number and join one doctor's queue.
- Doctors manage only their own queue.
- Receptionists administer the clinic, doctors, walk-ins, and all queues.

The MVP contains one seeded clinic, **iQuasar Health**, but clinic ownership is represented in every authorization and data-access path so additional clinics can be added without redesigning the system.

The frontend remains a React single-page application deployed to Vercel. Supabase owns authentication, PostgreSQL data, transactional queue operations, row-level security (RLS), Edge Functions, and realtime events.

## 2. Architecture

```text
Browser (React/Vite on Vercel)
  |
  |-- Supabase Auth
  |     |-- Patient: phone OTP
  |     `-- Staff: email/password
  |
  |-- Supabase Data API (anon key + user JWT)
  |     |-- Read clinics, doctors, summaries, permitted queue data
  |     `-- Call transactional PostgreSQL RPC functions
  |
  |-- Supabase Realtime
  |     `-- queue_entries changes filtered by doctor_id
  |
  `-- Supabase Edge Functions
        `-- Receptionist-only Auth Admin operations
              create doctor, reset password, disable doctor
```

### Trust boundaries

1. The Vite app contains only `VITE_SUPABASE_URL` and the publishable/anon key.
2. The Supabase service-role key is never placed in Vercel browser variables or frontend code.
3. Every database table has RLS enabled.
4. Queue mutations use PostgreSQL functions, not client-side read-then-write logic.
5. Auth Admin operations run only in Edge Functions after validating the caller's JWT, role, active state, and clinic.
6. UI route guards improve navigation but are not security controls; RLS and server functions are authoritative.

## 3. Data Model

Use `auth.users` as the identity source and `public.users` as the application authorization profile. The requested table names remain intact, with a few operational columns required for secure auth, daily queues, soft removal, and multi-clinic support.

### Enums

```sql
create type public.user_role as enum ('patient', 'doctor', 'receptionist');
create type public.queue_status as enum ('waiting', 'current', 'completed');
```

### Tables

```sql
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name)
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id),
  role public.user_role not null,
  email text,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_requires_clinic check (
    role = 'patient' or clinic_id is not null
  )
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  user_id uuid not null unique references public.users(id) on delete restrict,
  name text not null,
  specialization text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users(id) on delete set null,
  name text not null,
  age smallint not null check (age between 1 and 120),
  phone_number text,
  is_walk_in boolean not null default false,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_identity check (
    (is_walk_in and user_id is null and created_by is not null)
    or
    (not is_walk_in and user_id is not null and phone_number is not null)
  )
);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  doctor_id uuid not null references public.doctors(id),
  patient_id uuid not null references public.patients(id),
  token_number integer not null check (token_number > 0),
  status public.queue_status not null default 'waiting',
  service_date date not null default (timezone('Asia/Kolkata', now()))::date,
  created_at timestamptz not null default now(),
  called_at timestamptz,
  completed_at timestamptz,
  removed_at timestamptz,
  removed_by uuid references public.users(id),
  unique (doctor_id, service_date, token_number)
);
```

`removed_at` implements receptionist removal without destroying the audit trail. Removed entries are excluded from active queue queries and realtime UI. Their status remains one of the three required values.

### Required indexes and invariants

```sql
create index queue_entries_doctor_day_idx
  on public.queue_entries (doctor_id, service_date, status, token_number)
  where removed_at is null;

create unique index one_current_token_per_doctor_day
  on public.queue_entries (doctor_id, service_date)
  where status = 'current' and removed_at is null;

create unique index one_patient_entry_per_doctor_day
  on public.queue_entries (doctor_id, patient_id, service_date)
  where removed_at is null;

create index doctors_clinic_active_idx
  on public.doctors (clinic_id, is_active, name);
```

### Seed

```sql
insert into public.clinics (name)
values ('iQuasar Health')
on conflict (name) do nothing;
```

Do not hardcode the clinic UUID in React. Query the clinic and persist its selected ID. This is what makes the single-clinic MVP multi-clinic ready.

## 4. Database API

All functions below return only fields the calling role may see. Each mutating function must be `security definer`, set a fixed `search_path`, validate `auth.uid()`, and be granted only to `authenticated`.

### `upsert_patient_profile`

Input: `p_name`, `p_age`, `p_phone_number`.

Behavior:

1. Reject if no authenticated user exists.
2. Verify `auth.users.phone_confirmed_at` is present for `auth.uid()`.
3. Verify the submitted normalized phone equals the authenticated phone.
4. Upsert `public.users` with role `patient`.
5. Upsert `public.patients` by `user_id`.
6. Return the patient row.

This is the server-side guarantee that an unverified patient cannot become queue-eligible.

### `list_doctors_with_queue_summary`

Input: `p_clinic_id`, optional `p_service_date`.

Output per active doctor:

- Doctor ID, name, specialization
- Current token number, or `null`
- Waiting patient count

This keeps aggregation logic out of each doctor card and avoids exposing patient details.

### `join_queue`

Input: `p_doctor_id`.

Behavior in one transaction:

1. Require an authenticated, active patient with confirmed phone auth.
2. Resolve the patient's `patients.id` from `auth.uid()`.
3. Resolve the active doctor and clinic.
4. Acquire a transaction-level advisory lock for doctor plus service date.
5. Reject an existing active entry for this patient, doctor, and day.
6. Generate `max(token_number) + 1` for the doctor and day.
7. Insert a waiting queue entry and return its confirmation projection.

The advisory lock and unique index prevent duplicate tokens when patients join simultaneously.

### `call_next_patient`

Input: `p_doctor_id`.

Authorized callers: the doctor assigned to `p_doctor_id`, or an active receptionist in the same clinic.

Behavior in one transaction:

1. Lock the doctor/day queue.
2. Mark the existing `current` entry `completed` with `completed_at = now()`.
3. Select the lowest waiting token with `for update skip locked`.
4. Mark it `current` with `called_at = now()`.
5. Return the new current entry, or `null` when no patient remains.

### `complete_current_patient`

Input: `p_doctor_id`.

Marks only the current active token completed. It does not automatically call the next patient. This preserves the two distinct dashboard actions in the product requirements.

### `add_walk_in_patient`

Input: `p_doctor_id`, `p_name`, `p_age`, optional `p_phone_number`.

Authorized caller: active receptionist in the doctor's clinic. Creates a walk-in patient and queue entry in one transaction using the same locked token allocator as `join_queue`.

### `remove_queue_entry`

Input: `p_queue_entry_id`.

Authorized caller: active receptionist in the entry's clinic. Sets `removed_at` and `removed_by`. A current token can be removed only if the function also advances the queue or returns a result that requires an explicit `Call Next`; choose and test one behavior. For MVP, use explicit `Call Next` to avoid surprising state transitions.

## 5. RLS Authorization Matrix

| Resource | Patient | Doctor | Receptionist |
|---|---|---|---|
| Clinics | Read active clinics | Read own clinic | Read own clinic |
| Users | Read self | Read self | Read active staff in own clinic |
| Doctors | Read active doctors | Read own doctor record | Read own-clinic doctors |
| Patients | Read/update self | Read patients in own queue | Read own-clinic queued patients; create walk-ins through RPC |
| Queue entries | Read own entries | Read own doctor's queue | Read all own-clinic queues |
| Queue mutation | `join_queue` only | Own queue RPCs only | Own-clinic RPCs only |
| Auth Admin | Never | Never | Edge Functions only |

Implementation rules:

- Enable RLS on all five public tables.
- Deny direct queue inserts and status updates to browser roles; expose only RPC execution.
- Never authorize from editable `user_metadata`. Read role, clinic, and active state from `public.users` in policies/functions.
- Doctor policies must join `doctors.user_id = auth.uid()`.
- Receptionist policies must require matching `clinic_id` and `is_active = true`.
- Patient queue reads must join `patients.user_id = auth.uid()`.
- Add RLS tests for cross-clinic access even while only one clinic is seeded.

## 6. Authentication Flows

### Patient phone OTP

1. `/` collects full name, age, and mobile number.
2. Validate age and normalize the number to E.164, for example `+919876543210`.
3. Store only the pending name, age, and normalized phone in `sessionStorage`.
4. Call `supabase.auth.signInWithOtp({ phone })`.
5. Navigate to `/otp` only when the request succeeds.
6. `/otp` accepts the code and calls `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
7. After a valid session is returned, call `upsert_patient_profile`.
8. Clear pending registration data and navigate to `/clinic`.
9. Resend uses the same OTP call with a client countdown and server rate limits.

An existing patient follows the same flow. The profile function updates their supplied name/age after OTP proves ownership of the number.

Route protection checks all of the following before allowing queue access:

- Supabase session exists.
- `public.users.role = 'patient'` and `is_active = true`.
- A `patients` row exists for the authenticated user.
- The auth identity has a confirmed phone.

### Staff email/password

1. `/roles` selects Doctor or Receptionist.
2. `/doctor-login` and `/receptionist-login` use `signInWithPassword`.
3. Fetch `public.users` after authentication.
4. Reject inactive users and role mismatches, sign out, and show a generic error.
5. Redirect doctors to `/doctor-dashboard` and receptionists to `/receptionist-dashboard`.

Use one `AuthProvider` for the Supabase session and application user profile. Do not maintain a separate localStorage staff session.

### Doctor account administration

Create three Edge Functions:

- `create-doctor`: validates receptionist; creates the Auth user through `auth.admin.createUser`; inserts `users` and `doctors`; rolls back the Auth user if database creation fails.
- `reset-doctor-password`: validates same-clinic receptionist; updates the Auth password and sets `must_change_password = true`.
- `disable-doctor`: validates same-clinic receptionist; sets both application records inactive, blocks sign-in through Auth Admin, and revokes sessions where supported.

Edge Function secrets:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The function must derive the caller from the bearer token. It must never accept the receptionist's role or clinic as trusted request-body fields.

## 7. Routing

```jsx
<Route path="/" element={<PublicOnly><PatientLogin /></PublicOnly>} />
<Route path="/otp" element={<OtpPendingRoute><OtpVerification /></OtpPendingRoute>} />
<Route path="/roles" element={<PublicOnly><RoleSelection /></PublicOnly>} />
<Route path="/doctor-login" element={<PublicOnly><DoctorLogin /></PublicOnly>} />
<Route path="/receptionist-login" element={<PublicOnly><ReceptionistLogin /></PublicOnly>} />

<Route element={<RoleRoute allowedRoles={['patient']} />}>
  <Route path="/clinic" element={<ClinicSelection />} />
  <Route path="/doctors" element={<DoctorSelection />} />
  <Route path="/confirmation" element={<QueueConfirmation />} />
  <Route path="/queue" element={<LiveQueueBoard />} />
</Route>

<Route element={<RoleRoute allowedRoles={['doctor']} />}>
  <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
</Route>

<Route element={<RoleRoute allowedRoles={['receptionist']} />}>
  <Route path="/receptionist-dashboard" element={<ReceptionistDashboard />} />
  <Route path="/create-doctor" element={<CreateDoctor />} />
</Route>
```

`RoleRoute` waits for both auth session and application profile. It redirects unauthenticated staff routes to the matching login, unauthenticated patient routes to `/`, and authenticated wrong-role requests to `/unauthorized`.

Selection IDs are persisted in `sessionStorage` only as navigation hints:

- `selectedClinicId`
- `selectedDoctorId`
- `queueEntryId`

Every screen refetches and authorizes data from Supabase. A refresh or manually entered URL must not depend solely on React navigation state.

## 8. Frontend Structure

```text
src/
  app/
    App.jsx
    routes.jsx
  components/
    layout/
      AppShell.jsx
      StaffShell.jsx
    auth/
      RoleRoute.jsx
      PublicOnly.jsx
      OtpInput.jsx
    queue/
      QueueGrid.jsx
      QueueToken.jsx
      QueueStats.jsx
      QueueRoster.jsx
      QueueLegend.jsx
    doctors/
      DoctorCard.jsx
      DoctorForm.jsx
      DoctorActionsMenu.jsx
    feedback/
      LoadingScreen.jsx
      EmptyState.jsx
      ErrorState.jsx
      ConfirmDialog.jsx
  context/
    AuthContext.jsx
    PatientFlowContext.jsx
  hooks/
    useDoctorQueue.js
    useQueueRealtime.js
    usePatientQueue.js
  pages/
    patient/
      PatientLogin.jsx
      OtpVerification.jsx
      ClinicSelection.jsx
      DoctorSelection.jsx
      QueueConfirmation.jsx
      LiveQueueBoard.jsx
    doctor/
      DoctorLogin.jsx
      DoctorDashboard.jsx
    receptionist/
      ReceptionistLogin.jsx
      ReceptionistDashboard.jsx
      CreateDoctor.jsx
    RoleSelection.jsx
    Unauthorized.jsx
  services/
    authService.js
    clinicService.js
    doctorService.js
    patientService.js
    queueService.js
    adminService.js
  lib/
    supabase.js
    phone.js
    validation.js
  styles/
    index.css
```

Keep the current blue healthcare visual language, page composition, card patterns, spacing, and responsive behavior. Consolidate duplicate old/new pages into the structure above rather than redesigning them.

## 9. Screen Behavior

### Patient screens

- Patient login validates all required fields and Indian mobile format before requesting OTP.
- OTP has six numeric cells, paste support, backspace navigation, resend state, and server errors.
- Clinic selection queries active clinics and shows only iQuasar Health for MVP.
- Doctor cards use `list_doctors_with_queue_summary`; current token may show `--` before a queue begins.
- Joining displays a loading state and disables repeated submission.
- Confirmation displays token, doctor, clinic, and patients ahead, calculated as active waiting/current entries with a lower token.
- Live board renders only today's non-removed queue. It does not display estimated wait time.

Queue colors:

- Green: completed
- Yellow: current
- Purple: authenticated patient's token
- Blue: waiting

If the patient's token is also current, purple remains the identity color and receives a clear `Now` label/border so the two meanings remain understandable.

### Doctor dashboard

- Resolve the doctor only through `doctors.user_id = auth.uid()`.
- Display current token, completed count, waiting count, and roster.
- `Call Next` invokes `call_next_patient` and never performs multiple browser updates.
- `Mark Completed` invokes `complete_current_patient`.
- No doctor account-management UI or receptionist navigation is rendered.

### Receptionist dashboard

- Show all active and disabled doctors in the receptionist's clinic.
- Switching doctors changes the queue subscription and roster.
- Add walk-in opens a focused form for name, age, optional mobile, and doctor.
- Remove requires confirmation and calls `remove_queue_entry`.
- Doctor actions include create, edit profile, reset password, and disable/enable.
- Create/edit/reset/disable controls call Edge Functions for auth-related operations.

## 10. Realtime Design

1. Add `queue_entries` to the Supabase realtime publication.
2. Subscribe with a unique channel such as `queue:${doctorId}:${serviceDate}`.
3. Filter Postgres changes by `doctor_id=eq.${doctorId}`.
4. On `INSERT` or `UPDATE`, either merge by primary key or invalidate and refetch the day's queue. For MVP reliability, refetch the small queue.
5. Because removal is a soft `UPDATE`, every client receives it consistently.
6. Remove the channel on unmount and before switching doctors.
7. Show a small connection state (`Live`, `Reconnecting`, `Offline`) without blocking existing data.
8. Realtime never replaces authorization; subscription rows remain constrained by RLS.

Use one query normalization function so patient, doctor, and receptionist screens derive completed/current/waiting statistics identically.

## 11. Error and Concurrency Handling

- Map database error codes to user-friendly messages in the service layer.
- Treat unique-entry conflicts as "You are already in this queue" and load the existing entry.
- Disable mutation buttons while a request is pending.
- Keep RPCs idempotent where practical; `join_queue` should return an existing active entry or a stable conflict.
- Never calculate the next token in React.
- Never implement `Call Next` as two browser requests.
- Use server timestamps, not browser clocks, for queue state.
- Normalize phone numbers once and store E.164 format.
- Log Edge Function request IDs and sanitized failures; never log OTPs or passwords.

## 12. Migration From the Current Repository

The current repository has two parallel page sets: an older localStorage/demo flow at `src/pages/*` and an active Supabase flow under role subfolders. It also currently queries `queues`, while the target contract is `queue_entries`.

Migration sequence:

1. Preserve `src/index.css`, `AppShell`, and the current polished active pages as the visual source of truth.
2. Create Supabase migrations for enums, tables, indexes, seed, RLS, RPCs, and realtime publication.
3. Migrate existing `queues` data into `queue_entries`, mapping legacy user/patient columns explicitly.
4. Replace email patient signup in `AuthContext` with phone OTP methods.
5. Replace localStorage patient/staff services with Supabase services.
6. Rename and consolidate routes to the required route contract.
7. Reuse and enhance the existing patient queue, doctor, and receptionist components.
8. Delete the superseded demo pages only after all imports and routes use the consolidated pages.
9. Add Edge Functions and wire receptionist doctor actions.
10. Run role/RLS integration tests before deploying.

Do not rename the production table without a migration. During rollout, either migrate atomically in a maintenance window or temporarily expose a compatibility view named `queues`, then remove it after the frontend deploy.

## 13. Implementation Phases

### Phase 1: Database foundation

- Add schema, constraints, indexes, seed, updated-at triggers, and realtime publication.
- Add RLS helper functions and policies.
- Add queue and patient RPCs.
- Test simultaneous joins and simultaneous `Call Next` requests.

Acceptance: no client can directly forge a token, role, clinic, or queue status.

### Phase 2: Authentication and routes

- Implement phone OTP send, verify, resend, profile upsert, and patient guards.
- Implement separate staff login screens using the same Supabase session.
- Implement exact requested routes and role redirects.
- Remove localStorage auth as a source of truth.

Acceptance: an unverified phone cannot access or invoke queue joining; wrong-role users cannot access staff screens or data.

### Phase 3: Patient experience

- Connect clinic and doctor selection to live data.
- Connect queue joining and confirmation.
- Convert the current movie-seat board to `queue_entries` data and realtime updates.
- Preserve the existing visual style and verify mobile layouts.

Acceptance: two open patient browsers update after doctor actions without refresh and no wait-time estimate appears.

### Phase 4: Doctor operations

- Resolve doctor identity from the authenticated user.
- Connect queue metrics, roster, call-next, and complete actions.
- Add pending, empty, error, and reconnecting states.

Acceptance: a doctor can operate only their own queue and cannot read another doctor's patient data through the API.

### Phase 5: Receptionist administration

- Connect all-doctor queue monitoring.
- Add walk-in and remove workflows.
- Deploy create/reset/disable doctor Edge Functions.
- Add doctor create/edit/disable UI using the existing card style.

Acceptance: receptionist operations are clinic-scoped, and no service-role secret is present in the Vercel build.

### Phase 6: QA and deployment

- Add unit, integration, RLS, realtime, and end-to-end tests.
- Test desktop and mobile widths with no overlap or horizontal overflow.
- Configure Supabase production auth/SMS and Vercel environment variables.
- Deploy, smoke test all roles, and verify logs.

Acceptance: production build passes, direct route refreshes work, and all critical workflows pass against the production Supabase project.

## 14. Testing Plan

### Unit

- E.164 phone normalization and validation
- Queue status/statistics derivation
- Patients-ahead calculation
- Route destination by role
- Service error mapping

### Database and RLS

- Unauthenticated reads/writes denied
- Patient cannot join before confirmed phone
- Patient sees only their queue identity/details
- Doctor sees and mutates only own queue
- Receptionist sees and mutates only own clinic
- Cross-clinic access denied for every role
- Two concurrent joins receive distinct sequential tokens
- Two concurrent `Call Next` calls leave one current token

### End-to-end

- New patient OTP registration through live queue
- Returning patient OTP login
- OTP error, expiration, and resend
- Doctor login, complete, and call next
- Patient board updates without refresh
- Receptionist walk-in and removal
- Receptionist creates, edits, resets, and disables doctor
- Disabled doctor cannot continue privileged operations
- Direct URL refresh and unauthorized route handling

Use local Supabase plus seeded test users for automated tests. Use the provider's test OTP capability locally; do not automate real SMS in CI.

## 15. Deployment

### Vercel variables

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Add a SPA rewrite so direct navigation to `/queue`, `/doctor-dashboard`, or other routes serves `index.html`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Build settings:

```text
Framework: Vite
Build command: npm run build
Output directory: dist
Node version: current project-supported LTS
```

### Supabase production checklist

- Configure an SMS provider and phone auth.
- Configure OTP expiry and resend/rate limits.
- Set the site URL and allowed redirect URLs to the Vercel domains.
- Deploy migrations before the frontend that requires them.
- Deploy and secret-configure Edge Functions.
- Confirm RLS is enabled on every public table.
- Confirm only `queue_entries` required realtime events are published.
- Seed iQuasar Health and bootstrap one receptionist securely outside the browser.
- Verify database backups and log retention.

## 16. Definition of Done

The MVP is complete when:

- Patient name, age, and mobile are required.
- A real Supabase phone OTP session is mandatory before queue joining.
- iQuasar Health is loaded from the database.
- Doctor cards show name, specialization, current token, and waiting count.
- Queue tokens are generated transactionally by the database.
- Confirmation and live board show the required information and colors.
- No estimated wait time is shown.
- Doctor actions update all connected screens without refresh.
- Doctor permissions are restricted to their own queue.
- Receptionists can manage clinic queues and doctor accounts.
- Auth Admin secrets never reach the browser.
- RLS tests prove role and clinic isolation.
- The existing MediQueue visual language remains recognizable and responsive.
- Vercel direct-route refreshes work in production.

## 17. Primary Technical References

- Supabase phone OTP: https://supabase.com/docs/reference/javascript/auth-signinwithotp
- Supabase OTP verification: https://supabase.com/docs/reference/javascript/auth-verifyotp
- Supabase Auth Admin create user: https://supabase.com/docs/reference/javascript/auth-admin-createuser
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Postgres Changes: https://supabase.com/docs/guides/realtime/postgres-changes
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Vercel Vite deployment: https://vercel.com/docs/frameworks/frontend/vite
