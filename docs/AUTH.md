# Authentication & the invite flow

## Patients

Self-signup with email + password (`src/pages/PatientLogin.jsx`, "Register"
tab). `authService.signUpPatientEmail` creates the Supabase Auth user, then
`patientService.upsertPatientProfileEmail` writes the matching `public.users`
(`role = 'patient'`) and `public.patients` rows directly — these are allowed
by the `"patient self-registers"` / `"patient manages own profile"` RLS
policies in [`supabase/SCHEMA.md`](../supabase/SCHEMA.md), no Edge Function
needed since a patient is only ever managing their own row.

## Doctor / Receptionist / Admin — invite only

There is **no public signup form** for these three roles, and nobody ever
manually types a password for someone else. Instead:

1. An admin (for any role) or a receptionist (for a doctor in their own
   clinic) fills out the invite form (`InviteStaffForm.jsx`) with the
   person's name, email, clinic, and specialization (doctors only).
2. The frontend calls the `invite-staff` Edge Function
   (`src/services/staffService.js` → `inviteStaff`).
3. The function checks the caller is actually allowed to invite that role
   into that clinic (see `supabase/functions/README.md`), then calls
   `supabase.auth.admin.inviteUserByEmail(...)` — this is a privileged call
   that requires the service-role key, which only exists inside the Edge
   Function, never in the browser.
4. Supabase sends an email with a link. The recipient clicks it, lands on
   Supabase's hosted "set your password" flow, and chooses a password.
   **Accepting the invite link is what confirms their email** — there is no
   separate verification step.
5. The function also writes the `public.users` row (and `public.doctors` row,
   for doctors) right away, so the account is fully provisioned before the
   person even opens the email.
6. The person can now sign in at `/doctor-login`, `/receptionist-login`, or
   `/admin-login`.

### Why sign-in checks `email_confirmed_at`

`authService.signInStaff` rejects the sign-in if
`data.user.email_confirmed_at` is null, with the message *"Please finish
setting up your account from the invite email before signing in."* Since
doctor/receptionist/admin accounts only ever come from an invite, an
unconfirmed email means the person hasn't clicked the link and set a
password yet — Supabase will actually reject `signInWithPassword` in that
state anyway (no password is set until the invite is accepted), but this
check produces a clearer error message.

### Disabling / re-enabling / deleting a staff account

Also goes through an Edge Function (`manage-staff`), because deleting or
force-signing-out a Supabase Auth user requires the service-role key. See
`supabase/functions/README.md` for the request shape and who's allowed to
call it for which role.

## Role storage

`public.users.role` is the single source of truth for what someone can
access. `authService.getAppProfile` reads this row and
`ProtectedRoute.jsx`'s `RoleRoute` compares it against each route's
`allowedRoles`. There is deliberately no way for a client request to set its
own `role` to anything other than `'patient'` (enforced by the `"patient
self-registers"` RLS policy) — every other role is assigned server-side by
the invite-staff function or by hand for the first admin.
