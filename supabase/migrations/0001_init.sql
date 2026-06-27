-- =============================================================================
-- MediQueue — full schema reset
-- =============================================================================
-- This migration is written to run against a CLEAN (reset) Supabase project.
-- It drops anything from a previous MediQueue install, then rebuilds the
-- schema from scratch with the "admin" role and invite-based staff accounts.
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`) on a
-- fresh project. See supabase/SCHEMA.md for a plain-English explanation of
-- every table, function, and policy below.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 0. Clean slate — drop anything from a previous version of this schema.
--    Safe to run on a brand new database (everything is "if exists").
-- -----------------------------------------------------------------------------
drop table if exists public.queue_entries cascade;
drop table if exists public.patients cascade;
drop table if exists public.doctors cascade;
drop table if exists public.users cascade;
drop table if exists public.clinics cascade;
drop type if exists public.user_role cascade;
drop type if exists public.queue_status cascade;

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('patient', 'doctor', 'receptionist', 'admin');
create type public.queue_status as enum ('waiting', 'current', 'completed');

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------

-- A physical clinic location. Admin creates these from the Admin Dashboard.
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name)
);

-- One row per Supabase auth user, carrying the role used for access control.
-- Patients insert their own row on signup. Doctor/receptionist/admin rows are
-- written by the invite-staff Edge Function using the service-role key, so
-- they are never created by hand and never bypass email verification.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id),
  role public.user_role not null,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Every non-patient role belongs to exactly one clinic.
  constraint staff_requires_clinic check (role = 'patient' or role = 'admin' or clinic_id is not null)
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  user_id uuid not null unique references public.users(id) on delete cascade,
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
  -- A patient is either a self-registered account (has user_id, no creator)
  -- or a walk-in added by reception (no user_id, must have a creator).
  constraint patient_identity check (
    (is_walk_in and user_id is null and created_by is not null)
    or
    (not is_walk_in and user_id is not null)
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

create index queue_entries_doctor_day_idx
  on public.queue_entries (doctor_id, service_date, status, token_number)
  where removed_at is null;

-- Only one patient can be "current" (in the room) per doctor per day.
create unique index one_current_token_per_doctor_day
  on public.queue_entries (doctor_id, service_date)
  where status = 'current' and removed_at is null;

-- A patient cannot hold two active tokens for the same doctor on the same day.
create unique index one_patient_entry_per_doctor_day
  on public.queue_entries (doctor_id, patient_id, service_date)
  where removed_at is null;

create index doctors_clinic_active_idx
  on public.doctors (clinic_id, is_active, name);

-- -----------------------------------------------------------------------------
-- 3. updated_at triggers
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
comment on function public.touch_updated_at() is 'Generic trigger: stamps updated_at = now() on every UPDATE.';

create trigger users_touch_updated_at before update on public.users
  for each row execute function public.touch_updated_at();
create trigger doctors_touch_updated_at before update on public.doctors
  for each row execute function public.touch_updated_at();
create trigger patients_touch_updated_at before update on public.patients
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Role-check helpers used throughout RLS policies and RPCs.
--    SECURITY DEFINER + a fixed search_path so they can read public.users
--    even though the caller's RLS would otherwise hide other people's rows.
-- -----------------------------------------------------------------------------
create or replace function public.current_app_user()
returns public.users
language sql security definer set search_path = public stable
as $$
  select * from public.users where id = auth.uid() and is_active = true;
$$;
comment on function public.current_app_user() is 'The calling user''s own users row, or no row if inactive/unauthenticated.';

create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;
comment on function public.is_admin() is 'True if the caller is an active admin. Admin = global access, not scoped to a clinic.';

create or replace function public.is_receptionist_for_clinic(p_clinic_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'receptionist'
      and clinic_id = p_clinic_id
      and is_active = true
  );
$$;
comment on function public.is_receptionist_for_clinic(uuid) is 'True if the caller is an active receptionist of the given clinic.';

create or replace function public.is_doctor_for_doctor(p_doctor_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1
    from public.doctors d
    join public.users u on u.id = d.user_id
    where d.id = p_doctor_id
      and d.user_id = auth.uid()
      and d.is_active = true
      and u.role = 'doctor'
      and u.is_active = true
  );
$$;
comment on function public.is_doctor_for_doctor(uuid) is 'True if the caller IS the doctor behind this doctors.id row.';

create or replace function public.active_service_date()
returns date
language sql stable
as $$
  select (timezone('Asia/Kolkata', now()))::date;
$$;
comment on function public.active_service_date() is 'Today''s date in the clinic timezone (Asia/Kolkata). Queues reset daily on this boundary.';

create or replace function public.normalize_phone(p_phone text)
returns text
language sql immutable
as $$
  select case
    when p_phone is null or btrim(p_phone) = '' then null
    when p_phone ~ '^\+[1-9][0-9]{9,14}$' then p_phone
    when regexp_replace(p_phone, '\D', '', 'g') ~ '^[6-9][0-9]{9}$'
      then '+91' || regexp_replace(p_phone, '\D', '', 'g')
    when regexp_replace(p_phone, '\D', '', 'g') ~ '^91[6-9][0-9]{9}$'
      then '+' || regexp_replace(p_phone, '\D', '', 'g')
    else p_phone
  end;
$$;
comment on function public.normalize_phone(text) is 'Best-effort normalization of Indian mobile numbers to E.164 (+91...). Returns input unchanged if it does not look like a recognizable number.';

-- -----------------------------------------------------------------------------
-- 5. Queue read helpers
-- -----------------------------------------------------------------------------
create or replace function public.queue_projection(q public.queue_entries)
returns table (
  id uuid, clinic_id uuid, doctor_id uuid, patient_id uuid, token_number integer,
  status public.queue_status, service_date date, created_at timestamptz,
  called_at timestamptz, completed_at timestamptz,
  patient_name text, patient_age smallint, phone_number text
)
language sql stable
as $$
  select q.id, q.clinic_id, q.doctor_id, q.patient_id, q.token_number, q.status,
         q.service_date, q.created_at, q.called_at, q.completed_at,
         p.name, p.age, p.phone_number
  from public.patients p
  where p.id = q.patient_id;
$$;
comment on function public.queue_projection(public.queue_entries) is 'Joins a single queue_entries row with its patient''s name/age/phone for returning from RPCs.';

create or replace function public.list_doctors_with_queue_summary(
  p_clinic_id uuid,
  p_service_date date default public.active_service_date()
)
returns table (
  id uuid, clinic_id uuid, name text, specialization text,
  current_token_number integer, waiting_patient_count integer
)
language sql security definer set search_path = public stable
as $$
  select d.id, d.clinic_id, d.name, d.specialization,
         max(q.token_number) filter (where q.status = 'current' and q.removed_at is null) as current_token_number,
         count(q.id) filter (where q.status = 'waiting' and q.removed_at is null)::integer as waiting_patient_count
  from public.doctors d
  left join public.queue_entries q
    on q.doctor_id = d.id and q.service_date = p_service_date and q.removed_at is null
  where d.clinic_id = p_clinic_id and d.is_active = true
  group by d.id
  order by d.name;
$$;
comment on function public.list_doctors_with_queue_summary(uuid, date) is 'Public-facing doctor picker for patients: active doctors in a clinic plus today''s current token and waiting count.';

create or replace function public.get_queue_for_doctor(
  p_doctor_id uuid,
  p_service_date date default public.active_service_date()
)
returns table (
  id uuid, clinic_id uuid, doctor_id uuid, patient_id uuid, token_number integer,
  status public.queue_status, service_date date, created_at timestamptz,
  called_at timestamptz, completed_at timestamptz,
  patient_name text, patient_age smallint, phone_number text
)
language sql security definer set search_path = public stable
as $$
  -- Patients only ever see their own name in the queue; everyone else sees
  -- "Patient" unless they're the doctor/receptionist running that queue.
  select q.id, q.clinic_id, q.doctor_id, q.patient_id, q.token_number, q.status,
         q.service_date, q.created_at, q.called_at, q.completed_at,
         case
           when pu.id = auth.uid() or public.is_doctor_for_doctor(q.doctor_id) or public.is_receptionist_for_clinic(q.clinic_id) or public.is_admin()
           then p.name else 'Patient'
         end as patient_name,
         case
           when pu.id = auth.uid() or public.is_doctor_for_doctor(q.doctor_id) or public.is_receptionist_for_clinic(q.clinic_id) or public.is_admin()
           then p.age else null
         end as patient_age,
         case
           when pu.id = auth.uid() or public.is_receptionist_for_clinic(q.clinic_id) or public.is_admin()
           then p.phone_number else null
         end as phone_number
  from public.queue_entries q
  join public.patients p on p.id = q.patient_id
  left join public.users pu on pu.id = p.user_id
  where q.doctor_id = p_doctor_id
    and q.service_date = p_service_date
    and q.removed_at is null
    and (
      pu.id = auth.uid()
      or public.is_doctor_for_doctor(q.doctor_id)
      or public.is_receptionist_for_clinic(q.clinic_id)
      or public.is_admin()
    )
  order by q.token_number;
$$;
comment on function public.get_queue_for_doctor(uuid, date) is 'Doctor/receptionist/admin queue view, or a single patient''s own entry. SECURITY DEFINER lets it look across patients/users while still filtering per-caller.';

-- -----------------------------------------------------------------------------
-- 6. Queue write RPCs (the only way queue_entries/patients change after
--    creation — never written to directly from the client).
-- -----------------------------------------------------------------------------

create or replace function public.join_queue(p_doctor_id uuid)
returns table (
  id uuid, clinic_id uuid, doctor_id uuid, patient_id uuid, token_number integer,
  status public.queue_status, service_date date, created_at timestamptz,
  called_at timestamptz, completed_at timestamptz,
  patient_name text, patient_age smallint, phone_number text
)
language plpgsql security definer set search_path = public, auth
as $$
-- The RETURNS TABLE output columns (id, doctor_id, patient_id, ...) share
-- names with real columns used in the queries below. use_column tells
-- plpgsql to always resolve an ambiguous name to the table column.
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_patient public.patients;
  v_doctor public.doctors;
  v_date date := public.active_service_date();
  v_next integer;
  v_entry public.queue_entries;
begin
  if v_uid is null then
    raise exception 'Authentication is required.';
  end if;

  select p.* into v_patient
  from public.patients p
  join public.users u on u.id = p.user_id
  where p.user_id = v_uid and u.role = 'patient' and u.is_active = true;

  if v_patient.id is null then
    raise exception 'Patient profile is required.';
  end if;

  select * into v_doctor from public.doctors where doctors.id = p_doctor_id and is_active = true;
  if v_doctor.id is null then
    raise exception 'Doctor is unavailable.';
  end if;

  -- Serialize token assignment per doctor/day so two patients can never get
  -- the same token number under concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended(p_doctor_id::text || v_date::text, 0));

  select * into v_entry
  from public.queue_entries
  where doctor_id = p_doctor_id and patient_id = v_patient.id and service_date = v_date and removed_at is null;

  if v_entry.id is null then
    select coalesce(max(token_number), 0) + 1 into v_next
    from public.queue_entries where doctor_id = p_doctor_id and service_date = v_date;

    insert into public.queue_entries (clinic_id, doctor_id, patient_id, token_number, service_date)
    values (v_doctor.clinic_id, p_doctor_id, v_patient.id, v_next, v_date)
    returning * into v_entry;
  end if;

  return query select * from public.queue_projection(v_entry);
end;
$$;
comment on function public.join_queue(uuid) is 'Patient joins (or re-fetches today''s existing token for) a doctor''s queue. One token per patient per doctor per day.';

create or replace function public.call_next_patient(p_doctor_id uuid)
returns table (
  id uuid, clinic_id uuid, doctor_id uuid, patient_id uuid, token_number integer,
  status public.queue_status, service_date date, created_at timestamptz,
  called_at timestamptz, completed_at timestamptz,
  patient_name text, patient_age smallint, phone_number text
)
language plpgsql security definer set search_path = public
as $$
-- See note in join_queue: resolve ambiguous names to table columns.
#variable_conflict use_column
declare
  v_doctor public.doctors;
  v_date date := public.active_service_date();
  v_entry public.queue_entries;
begin
  select * into v_doctor from public.doctors where doctors.id = p_doctor_id;
  if v_doctor.id is null then
    raise exception 'Doctor not found.';
  end if;

  if not (public.is_doctor_for_doctor(p_doctor_id) or public.is_receptionist_for_clinic(v_doctor.clinic_id) or public.is_admin()) then
    raise exception 'Not authorized.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_doctor_id::text || v_date::text, 0));

  update public.queue_entries
  set status = 'completed', completed_at = coalesce(completed_at, now())
  where doctor_id = p_doctor_id and service_date = v_date and status = 'current' and removed_at is null;

  select * into v_entry
  from public.queue_entries
  where doctor_id = p_doctor_id and service_date = v_date and status = 'waiting' and removed_at is null
  order by token_number
  for update skip locked
  limit 1;

  if v_entry.id is null then
    return;
  end if;

  update public.queue_entries set status = 'current', called_at = now()
  where id = v_entry.id
  returning * into v_entry;

  return query select * from public.queue_projection(v_entry);
end;
$$;
comment on function public.call_next_patient(uuid) is 'Completes whoever is "current", then promotes the next waiting token to "current". Doctor, their clinic''s receptionist, or admin only.';

create or replace function public.complete_current_patient(p_doctor_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_doctor public.doctors;
begin
  select * into v_doctor from public.doctors where doctors.id = p_doctor_id;
  if v_doctor.id is null then
    raise exception 'Doctor not found.';
  end if;

  if not (public.is_doctor_for_doctor(p_doctor_id) or public.is_receptionist_for_clinic(v_doctor.clinic_id) or public.is_admin()) then
    raise exception 'Not authorized.';
  end if;

  update public.queue_entries
  set status = 'completed', completed_at = coalesce(completed_at, now())
  where doctor_id = p_doctor_id and service_date = public.active_service_date() and status = 'current' and removed_at is null;
end;
$$;
comment on function public.complete_current_patient(uuid) is 'Marks the current patient as completed without calling the next one yet.';

create or replace function public.add_walk_in_patient(
  p_doctor_id uuid, p_name text, p_age smallint, p_phone_number text default null
)
returns table (
  id uuid, clinic_id uuid, doctor_id uuid, patient_id uuid, token_number integer,
  status public.queue_status, service_date date, created_at timestamptz,
  called_at timestamptz, completed_at timestamptz,
  patient_name text, patient_age smallint, phone_number text
)
language plpgsql security definer set search_path = public
as $$
-- See note in join_queue: resolve ambiguous names to table columns.
#variable_conflict use_column
declare
  v_doctor public.doctors;
  v_date date := public.active_service_date();
  v_next integer;
  v_patient public.patients;
  v_entry public.queue_entries;
begin
  select * into v_doctor from public.doctors where doctors.id = p_doctor_id and is_active = true;
  if v_doctor.id is null then
    raise exception 'Doctor is unavailable.';
  end if;

  -- Walk-ins can be registered by the clinic's own receptionist or by admin.
  if not (public.is_receptionist_for_clinic(v_doctor.clinic_id) or public.is_admin()) then
    raise exception 'Only receptionists or admin can add walk-ins.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_doctor_id::text || v_date::text, 0));

  -- Walk-ins have no auth account: no user_id, just a name/age/phone record.
  insert into public.patients (name, age, phone_number, is_walk_in, created_by)
  values (btrim(p_name), p_age, public.normalize_phone(p_phone_number), true, auth.uid())
  returning * into v_patient;

  select coalesce(max(token_number), 0) + 1 into v_next
  from public.queue_entries where doctor_id = p_doctor_id and service_date = v_date;

  insert into public.queue_entries (clinic_id, doctor_id, patient_id, token_number, service_date)
  values (v_doctor.clinic_id, p_doctor_id, v_patient.id, v_next, v_date)
  returning * into v_entry;

  return query select * from public.queue_projection(v_entry);
end;
$$;
comment on function public.add_walk_in_patient(uuid, text, smallint, text) is 'Reception/admin registers a patient with no account and immediately gives them a token.';

create or replace function public.remove_queue_entry(p_queue_entry_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_entry public.queue_entries;
begin
  select * into v_entry from public.queue_entries where id = p_queue_entry_id;
  if v_entry.id is null then
    raise exception 'Queue entry not found.';
  end if;

  if not (public.is_receptionist_for_clinic(v_entry.clinic_id) or public.is_admin()) then
    raise exception 'Only receptionists or admin can remove patients.';
  end if;

  update public.queue_entries set removed_at = now(), removed_by = auth.uid() where id = p_queue_entry_id;
end;
$$;
comment on function public.remove_queue_entry(uuid) is 'Soft-deletes a queue entry (e.g. patient left without being seen). Removed entries are excluded from every read path.';

-- -----------------------------------------------------------------------------
-- 7. Admin RPCs — clinic/receptionist/doctor management that does NOT need
--    auth.users access (those go through Edge Functions with the service
--    role instead, see supabase/functions/).
-- -----------------------------------------------------------------------------

create or replace function public.admin_create_clinic(p_name text)
returns public.clinics
language plpgsql security definer set search_path = public
as $$
declare
  v_clinic public.clinics;
begin
  if not public.is_admin() then
    raise exception 'Only admin can create clinics.';
  end if;

  insert into public.clinics (name) values (btrim(p_name))
  returning * into v_clinic;

  return v_clinic;
end;
$$;
comment on function public.admin_create_clinic(text) is 'Admin-only: register a new clinic location.';

create or replace function public.admin_set_clinic_active(p_clinic_id uuid, p_is_active boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admin can update clinics.';
  end if;

  update public.clinics set is_active = p_is_active where id = p_clinic_id;
end;
$$;
comment on function public.admin_set_clinic_active(uuid, boolean) is 'Admin-only: activate/deactivate a clinic without deleting its history.';

create or replace function public.admin_set_doctor_active(p_doctor_id uuid, p_is_active boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_doctor public.doctors;
begin
  select * into v_doctor from public.doctors where doctors.id = p_doctor_id;
  if v_doctor.id is null then
    raise exception 'Doctor not found.';
  end if;

  if not (public.is_receptionist_for_clinic(v_doctor.clinic_id) or public.is_admin()) then
    raise exception 'Not authorized.';
  end if;

  update public.doctors set is_active = p_is_active where id = p_doctor_id;
  update public.users set is_active = p_is_active where id = v_doctor.user_id;
end;
$$;
comment on function public.admin_set_doctor_active(uuid, boolean) is 'Receptionist (own clinic) or admin: enable/disable a doctor account and their login in one step.';

create or replace function public.admin_update_doctor(p_doctor_id uuid, p_name text, p_specialization text)
returns public.doctors
language plpgsql security definer set search_path = public
as $$
declare
  v_doctor public.doctors;
begin
  select * into v_doctor from public.doctors where doctors.id = p_doctor_id;
  if v_doctor.id is null then
    raise exception 'Doctor not found.';
  end if;

  if not (public.is_receptionist_for_clinic(v_doctor.clinic_id) or public.is_admin()) then
    raise exception 'Not authorized.';
  end if;

  update public.doctors set name = p_name, specialization = p_specialization
  where id = p_doctor_id
  returning * into v_doctor;

  return v_doctor;
end;
$$;
comment on function public.admin_update_doctor(uuid, text, text) is 'Receptionist (own clinic) or admin: edit a doctor''s display name/specialization.';

-- -----------------------------------------------------------------------------
-- 8. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.clinics enable row level security;
alter table public.users enable row level security;
alter table public.doctors enable row level security;
alter table public.patients enable row level security;
alter table public.queue_entries enable row level security;

-- clinics: everyone can see active clinics (needed for the patient clinic
-- picker before login-equivalent context exists); admin/receptionist can see
-- inactive ones too. Only admin can write.
create policy "read clinics" on public.clinics
for select using (
  is_active or public.is_admin() or public.is_receptionist_for_clinic(id)
);

create policy "admin manages clinics" on public.clinics
for all using (public.is_admin()) with check (public.is_admin());

-- users: see your own row, or any row admin/receptionist is allowed to manage.
-- INSERT is restricted to "a patient creating their own row" — staff rows are
-- always created by the invite-staff Edge Function with the service role,
-- which bypasses RLS entirely, so no staff self-signup path exists here.
create policy "read own or managed user profile" on public.users
for select using (
  id = auth.uid() or public.is_admin() or public.is_receptionist_for_clinic(clinic_id)
);

create policy "patient self-registers" on public.users
for insert with check (
  id = auth.uid() and role = 'patient' and clinic_id is null
);

create policy "patient updates own row" on public.users
for update using (id = auth.uid() and role = 'patient')
with check (id = auth.uid() and role = 'patient');

create policy "admin manages users" on public.users
for all using (public.is_admin()) with check (public.is_admin());

-- doctors: visible if active (patients browsing), to the doctor themself, to
-- their clinic's receptionist, or to admin.
create policy "read permitted doctors" on public.doctors
for select using (
  is_active or user_id = auth.uid() or public.is_receptionist_for_clinic(clinic_id) or public.is_admin()
);

create policy "admin manages doctors" on public.doctors
for all using (public.is_admin()) with check (public.is_admin());

-- patients: a patient sees their own row; reception/doctor/admin see rows
-- that show up in a queue they're allowed to manage. Patients can insert and
-- update their own profile (name/age/phone) directly.
create policy "read permitted patients" on public.patients
for select using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.queue_entries q
    where q.patient_id = patients.id
      and q.removed_at is null
      and (public.is_doctor_for_doctor(q.doctor_id) or public.is_receptionist_for_clinic(q.clinic_id))
  )
);

create policy "patient manages own profile" on public.patients
for insert with check (user_id = auth.uid());

create policy "patient updates own profile" on public.patients
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- queue_entries: read-only from the client; all writes happen through the
-- RPCs above (which run as SECURITY DEFINER and do their own auth checks).
create policy "read permitted queue entries" on public.queue_entries
for select using (
  removed_at is null and (
    public.is_doctor_for_doctor(doctor_id)
    or public.is_receptionist_for_clinic(clinic_id)
    or public.is_admin()
    or exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid())
  )
);

-- -----------------------------------------------------------------------------
-- 9. Grants
--    No seed data is inserted — admin adds the first clinic from the UI.
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated, anon;
grant select on public.clinics to authenticated, anon;
grant select on public.doctors to authenticated, anon;
grant select, insert, update on public.users to authenticated;
grant select, insert, update on public.patients to authenticated;
grant select on public.queue_entries to authenticated;

-- The Edge Functions connect as the service role to bypass RLS. On most
-- Supabase projects new tables are auto-granted to service_role via default
-- privileges, but we grant explicitly so this works on every project (and
-- so a fresh reset never hits "permission denied for table users").
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

grant execute on function public.list_doctors_with_queue_summary(uuid, date) to authenticated, anon;
grant execute on function public.get_queue_for_doctor(uuid, date) to authenticated;
grant execute on function public.join_queue(uuid) to authenticated;
grant execute on function public.call_next_patient(uuid) to authenticated;
grant execute on function public.complete_current_patient(uuid) to authenticated;
grant execute on function public.add_walk_in_patient(uuid, text, smallint, text) to authenticated;
grant execute on function public.remove_queue_entry(uuid) to authenticated;
grant execute on function public.admin_create_clinic(text) to authenticated;
grant execute on function public.admin_set_clinic_active(uuid, boolean) to authenticated;
grant execute on function public.admin_set_doctor_active(uuid, boolean) to authenticated;
grant execute on function public.admin_update_doctor(uuid, text, text) to authenticated;

-- Live queue updates power the doctor/receptionist dashboards and patient
-- queue board without polling.
do $$
begin
  alter publication supabase_realtime add table public.queue_entries;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
