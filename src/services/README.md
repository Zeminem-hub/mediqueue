# Services

Every Supabase call in the app goes through one of these files — pages never
import `src/lib/supabase.js` directly. This keeps every query/RPC/Edge
Function name searchable in one place.

- **authService.js** — sign up/in for patients, sign in for staff
  (doctor/receptionist/admin), resolving a Supabase Auth user to their
  `public.users` profile row.
- **patientService.js** — a patient's own profile (`users` + `patients` rows).
- **doctorService.js** — reading doctor records (list, get-own, queue summary).
- **clinicService.js** — reading clinics (patient-facing, active only).
- **staffService.js** — invite/disable/enable/delete doctors & receptionists
  (calls the `invite-staff`/`manage-staff` Edge Functions), plus admin-only
  clinic management RPCs. Shared by the Receptionist and Admin dashboards.
- **queueService.js** — every queue read/write RPC, plus the Realtime
  subscription helper used by both dashboards and the patient queue board.

See [`docs/AUTH.md`](../../docs/AUTH.md) for why staff accounts go through
Edge Functions instead of direct table writes.
