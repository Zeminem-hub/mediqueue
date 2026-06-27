# Database Schema

This describes `supabase/migrations/0001_init.sql` in plain English. Run that
file once against a clean Supabase project — see [`ADMIN_SETUP.md`](../docs/ADMIN_SETUP.md)
for the full bootstrap steps (creating the first Admin, deploying Edge Functions).

## Roles

`public.user_role`: `patient | doctor | receptionist | admin`

| Role | Scope | How the account is created |
|---|---|---|
| `patient` | self only | Self-signup with email + password on the public login page |
| `doctor` | one clinic | Invited by a receptionist or admin (`invite-staff` Edge Function) |
| `receptionist` | one clinic | Invited by admin only (`invite-staff` Edge Function) |
| `admin` | global | Created once by hand in Supabase (see ADMIN_SETUP.md), manages everyone else afterwards |

No role other than `patient` can ever sign itself up — `users` only has an
`insert` policy for `role = 'patient'`. Doctor/receptionist/admin rows are
written by Edge Functions using the **service role key**, which bypasses RLS,
so those accounts are guaranteed to come from an invite, never a public form.

## Tables

- **clinics** — `id, name, is_active`. A physical clinic location. Admin creates these.
- **users** — one row per Supabase Auth user. Carries `role`, `clinic_id` (null for patient/admin), `is_active`.
- **doctors** — one row per doctor, linked 1:1 to a `users` row. Has `name`, `specialization`, belongs to a clinic.
- **patients** — either a self-registered patient (`user_id` set, `is_walk_in = false`) or a walk-in added by reception/admin (`user_id` null, `is_walk_in = true`, `created_by` set).
- **queue_entries** — one token per patient per doctor per day. `status` moves `waiting → current → completed`, or gets soft-deleted via `removed_at`.

`service_date` defaults to "today" in `Asia/Kolkata` — queues reset at local midnight, not UTC midnight.

## Why writes go through RPCs, not raw table inserts

Queue manipulation (`join_queue`, `call_next_patient`, `complete_current_patient`,
`add_walk_in_patient`, `remove_queue_entry`) and the admin actions that don't
need `auth.users` access (`admin_create_clinic`, `admin_set_clinic_active`,
`admin_set_doctor_active`, `admin_update_doctor`) are all Postgres functions
(`SECURITY DEFINER`), not direct table writes from the browser. Two reasons:

1. **Atomicity** — assigning the next token number, or completing one patient
   and promoting the next, has to happen under an advisory lock so two
   concurrent requests never hand out the same token.
2. **Authorization logic that's hard to express as a plain RLS policy** — e.g.
   "only the receptionist of *this specific doctor's clinic*, or admin, may
   call the next patient."

Patients *do* write directly to `users`/`patients` for their own profile
(signup, edit name/age) — that's covered by ordinary RLS `insert`/`update`
policies scoped to `id = auth.uid()` / `user_id = auth.uid()`.

## RLS summary

- `clinics`: anyone can read active clinics; admin can read/write all.
- `users`: read your own row, or rows admin/your-clinic's-receptionist may see; patients can insert/update only their own `role = 'patient'` row; admin can do anything.
- `doctors`: read if active, or you're that doctor, your clinic's receptionist, or admin; only admin writes directly (receptionist edits go through `admin_update_doctor`/`admin_set_doctor_active`).
- `patients`: read your own row, or rows visible through a queue you manage; patients insert/update their own row.
- `queue_entries`: read-only from the client, filtered to what the doctor/receptionist/admin/patient is allowed to see. All writes go through the RPCs above.

## Deleting a doctor or receptionist

Deleting a Supabase Auth user requires the **service role key**, which the
browser never has. That's why "delete doctor" / "delete receptionist" in the
Admin and Receptionist dashboards calls the `manage-staff` Edge Function
instead of a table delete — see [`functions/README.md`](functions/README.md).
