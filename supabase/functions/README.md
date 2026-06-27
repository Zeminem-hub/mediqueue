# Edge Functions

Both functions use the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`),
which is only available inside the Edge Function runtime, never shipped to
the browser. Everything that touches `auth.users` directly (inviting,
deleting, force sign-out) lives here — nowhere else in the app.

## `invite-staff`

Invites a doctor or receptionist by email. Sends Supabase's built-in invite
email; the user clicks the link, sets their own password, and their email is
marked confirmed in the same step. No temporary passwords exist anywhere in
this app.

```
POST /functions/v1/invite-staff
Authorization: Bearer <caller's access token>
{
  "role": "doctor" | "receptionist",
  "name": "Dr Ahmad Mir",
  "email": "doctor@example.com",
  "clinicId": "<uuid>",
  "specialization": "General Medicine"   // required when role = "doctor"
}
```

Authorization: inviting a **doctor** requires the caller to be admin or the
receptionist of `clinicId`. Inviting a **receptionist** requires admin.

## `manage-staff`

Disable, re-enable, or permanently delete a doctor or receptionist account.

```
POST /functions/v1/manage-staff
Authorization: Bearer <caller's access token>
{
  "action": "disable" | "enable" | "delete",
  "targetRole": "doctor" | "receptionist",
  "targetId": "<doctors.id if doctor, users.id if receptionist>"
}
```

Authorization: acting on a **doctor** requires admin or the receptionist of
that doctor's clinic. Acting on a **receptionist** requires admin.

## Deploying

```bash
supabase functions deploy invite-staff
supabase functions deploy manage-staff
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your service role key>
```

`SUPABASE_URL` is provided automatically by the Supabase platform; only the
service role key needs to be set explicitly as a secret.
