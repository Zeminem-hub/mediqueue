# One-time setup: reset database, deploy functions, create the first admin

Do this once per Supabase project (e.g. right after resetting/creating a
fresh project). After this, everything else — clinics, receptionists,
doctors — is managed from the Admin Dashboard in the app; nobody needs to
touch the Supabase dashboard again.

## 1. Run the schema migration

Open the Supabase SQL editor (or use the CLI) and run the full contents of
[`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
It's written to be safe on a brand-new database (drops anything from a prior
install first, then rebuilds everything). No seed data is inserted — you add
the first clinic from the Admin Dashboard after step 3.

## 2. Deploy the Edge Functions

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy invite-staff
supabase functions deploy manage-staff
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your service role key>
```

Find the service role key under Project Settings → API in the Supabase
dashboard. `SUPABASE_URL` is injected automatically — you don't set it.

## 3. Create the first Admin account by hand

This is the **only** account ever created manually, because there's no
"admin invites the first admin" bootstrap problem to solve otherwise.

1. In the Supabase dashboard: **Authentication → Users → Add user**. Enter an
   email and password, and check "Auto Confirm User" (so it behaves like an
   accepted invite).
2. Copy the new user's UUID.
3. In the SQL editor, run:
   ```sql
   insert into public.users (id, role, email, is_active)
   values ('<uuid-from-step-2>', 'admin', '<the email you used>', true);
   ```
4. Sign in at `/admin-login` in the app with that email/password.

From here, use the Admin Dashboard to:
- Add your first clinic.
- Invite receptionists (assign them to a clinic).
- Invite doctors directly, or let receptionists invite doctors into their
  own clinic.

## 4. Configure the invite email redirect (optional but recommended)

By default, Supabase's invite email sends users to your project's configured
"Site URL". In Supabase dashboard → Authentication → URL Configuration, set
this to your deployed app's URL (or `http://localhost:5173` while developing)
so the "set your password" link lands somewhere real.
