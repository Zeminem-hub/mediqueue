create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('patient', 'doctor', 'receptionist');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.queue_status as enum ('waiting', 'current', 'completed');
exception when duplicate_object then null;
end $$;

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id),
  role public.user_role not null,
  email text,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_requires_clinic check (role = 'patient' or clinic_id is not null)
);

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id),
  user_id uuid not null unique references public.users(id) on delete restrict,
  name text not null,
  specialization text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patients (
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

create table if not exists public.queue_entries (
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

create index if not exists queue_entries_doctor_day_idx
  on public.queue_entries (doctor_id, service_date, status, token_number)
  where removed_at is null;

create unique index if not exists one_current_token_per_doctor_day
  on public.queue_entries (doctor_id, service_date)
  where status = 'current' and removed_at is null;

create unique index if not exists one_patient_entry_per_doctor_day
  on public.queue_entries (doctor_id, patient_id, service_date)
  where removed_at is null;

create index if not exists doctors_clinic_active_idx
  on public.doctors (clinic_id, is_active, name);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

drop trigger if exists doctors_touch_updated_at on public.doctors;
create trigger doctors_touch_updated_at
before update on public.doctors
for each row execute function public.touch_updated_at();

drop trigger if exists patients_touch_updated_at on public.patients;
create trigger patients_touch_updated_at
before update on public.patients
for each row execute function public.touch_updated_at();

create or replace function public.current_app_user()
returns public.users
language sql
security definer
set search_path = public
stable
as $$
  select * from public.users where id = auth.uid() and is_active = true;
$$;

create or replace function public.is_receptionist_for_clinic(p_clinic_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'receptionist'
      and clinic_id = p_clinic_id
      and is_active = true
  );
$$;

create or replace function public.is_doctor_for_doctor(p_doctor_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
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

create or replace function public.active_service_date()
returns date
language sql
stable
as $$
  select (timezone('Asia/Kolkata', now()))::date;
$$;

create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when p_phone ~ '^\+[1-9][0-9]{9,14}$' then p_phone
    when regexp_replace(p_phone, '\D', '', 'g') ~ '^[6-9][0-9]{9}$'
      then '+91' || regexp_replace(p_phone, '\D', '', 'g')
    when regexp_replace(p_phone, '\D', '', 'g') ~ '^91[6-9][0-9]{9}$'
      then '+' || regexp_replace(p_phone, '\D', '', 'g')
    else p_phone
  end;
$$;

create or replace function public.queue_projection(q public.queue_entries)
returns table (
  id uuid,
  clinic_id uuid,
  doctor_id uuid,
  patient_id uuid,
  token_number integer,
  status public.queue_status,
  service_date date,
  created_at timestamptz,
  called_at timestamptz,
  completed_at timestamptz,
  patient_name text,
  patient_age smallint,
  phone_number text
)
language sql
stable
as $$
  select q.id, q.clinic_id, q.doctor_id, q.patient_id, q.token_number, q.status,
         q.service_date, q.created_at, q.called_at, q.completed_at,
         p.name, p.age, p.phone_number
  from public.patients p
  where p.id = q.patient_id;
$$;

create or replace function public.upsert_patient_profile(
  p_name text,
  p_age smallint,
  p_phone_number text
)
returns public.patients
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_auth_phone text;
  v_confirmed timestamptz;
  v_phone text := public.normalize_phone(p_phone_number);
  v_patient public.patients;
begin
  if v_uid is null then
    raise exception 'Authentication is required.';
  end if;

  select phone, phone_confirmed_at into v_auth_phone, v_confirmed
  from auth.users
  where id = v_uid;

  if v_confirmed is null then
    raise exception 'Phone verification is required.';
  end if;

  if public.normalize_phone(coalesce(v_auth_phone, '')) <> v_phone then
    raise exception 'Verified phone does not match submitted phone.';
  end if;

  insert into public.users (id, role, is_active)
  values (v_uid, 'patient', true)
  on conflict (id) do update set role = 'patient', is_active = true;

  insert into public.patients (user_id, name, age, phone_number, is_walk_in)
  values (v_uid, btrim(p_name), p_age, v_phone, false)
  on conflict (user_id) do update
    set name = excluded.name,
        age = excluded.age,
        phone_number = excluded.phone_number
  returning * into v_patient;

  return v_patient;
end;
$$;

create or replace function public.list_doctors_with_queue_summary(
  p_clinic_id uuid,
  p_service_date date default public.active_service_date()
)
returns table (
  id uuid,
  clinic_id uuid,
  name text,
  specialization text,
  current_token_number integer,
  waiting_patient_count integer
)
language sql
security definer
set search_path = public
stable
as $$
  select d.id,
         d.clinic_id,
         d.name,
         d.specialization,
         max(q.token_number) filter (where q.status = 'current' and q.removed_at is null) as current_token_number,
         count(q.id) filter (where q.status = 'waiting' and q.removed_at is null)::integer as waiting_patient_count
  from public.doctors d
  left join public.queue_entries q
    on q.doctor_id = d.id
   and q.service_date = p_service_date
   and q.removed_at is null
  where d.clinic_id = p_clinic_id
    and d.is_active = true
  group by d.id
  order by d.name;
$$;

create or replace function public.get_queue_for_doctor(
  p_doctor_id uuid,
  p_service_date date default public.active_service_date()
)
returns table (
  id uuid,
  clinic_id uuid,
  doctor_id uuid,
  patient_id uuid,
  token_number integer,
  status public.queue_status,
  service_date date,
  created_at timestamptz,
  called_at timestamptz,
  completed_at timestamptz,
  patient_name text,
  patient_age smallint,
  phone_number text
)
language sql
security definer
set search_path = public
stable
as $$
  select q.id, q.clinic_id, q.doctor_id, q.patient_id, q.token_number, q.status,
         q.service_date, q.created_at, q.called_at, q.completed_at,
         case
           when pu.id = auth.uid()
             or public.is_doctor_for_doctor(q.doctor_id)
             or public.is_receptionist_for_clinic(q.clinic_id)
           then p.name
           else 'Patient'
         end as patient_name,
         case
           when pu.id = auth.uid()
             or public.is_doctor_for_doctor(q.doctor_id)
             or public.is_receptionist_for_clinic(q.clinic_id)
           then p.age
           else null
         end as patient_age,
         case
           when pu.id = auth.uid()
             or public.is_receptionist_for_clinic(q.clinic_id)
           then p.phone_number
           else null
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
    )
  order by q.token_number;
$$;

create or replace function public.join_queue(p_doctor_id uuid)
returns table (
  id uuid,
  clinic_id uuid,
  doctor_id uuid,
  patient_id uuid,
  token_number integer,
  status public.queue_status,
  service_date date,
  created_at timestamptz,
  called_at timestamptz,
  completed_at timestamptz,
  patient_name text,
  patient_age smallint,
  phone_number text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_confirmed timestamptz;
  v_patient public.patients;
  v_doctor public.doctors;
  v_date date := public.active_service_date();
  v_next integer;
  v_entry public.queue_entries;
begin
  if v_uid is null then
    raise exception 'Authentication is required.';
  end if;

  select phone_confirmed_at into v_confirmed from auth.users where id = v_uid;
  if v_confirmed is null then
    raise exception 'Phone verification is required.';
  end if;

  select p.* into v_patient
  from public.patients p
  join public.users u on u.id = p.user_id
  where p.user_id = v_uid and u.role = 'patient' and u.is_active = true;

  if v_patient.id is null then
    raise exception 'Patient profile is required.';
  end if;

  select * into v_doctor from public.doctors where id = p_doctor_id and is_active = true;
  if v_doctor.id is null then
    raise exception 'Doctor is unavailable.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_doctor_id::text || v_date::text, 0));

  select * into v_entry
  from public.queue_entries
  where doctor_id = p_doctor_id
    and patient_id = v_patient.id
    and service_date = v_date
    and removed_at is null;

  if v_entry.id is null then
    select coalesce(max(token_number), 0) + 1 into v_next
    from public.queue_entries
    where doctor_id = p_doctor_id and service_date = v_date;

    insert into public.queue_entries (clinic_id, doctor_id, patient_id, token_number, service_date)
    values (v_doctor.clinic_id, p_doctor_id, v_patient.id, v_next, v_date)
    returning * into v_entry;
  end if;

  return query select * from public.queue_projection(v_entry);
end;
$$;

create or replace function public.call_next_patient(p_doctor_id uuid)
returns table (
  id uuid,
  clinic_id uuid,
  doctor_id uuid,
  patient_id uuid,
  token_number integer,
  status public.queue_status,
  service_date date,
  created_at timestamptz,
  called_at timestamptz,
  completed_at timestamptz,
  patient_name text,
  patient_age smallint,
  phone_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor public.doctors;
  v_date date := public.active_service_date();
  v_entry public.queue_entries;
begin
  select * into v_doctor from public.doctors where id = p_doctor_id;
  if v_doctor.id is null then
    raise exception 'Doctor not found.';
  end if;

  if not (public.is_doctor_for_doctor(p_doctor_id) or public.is_receptionist_for_clinic(v_doctor.clinic_id)) then
    raise exception 'Not authorized.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_doctor_id::text || v_date::text, 0));

  update public.queue_entries
  set status = 'completed', completed_at = coalesce(completed_at, now())
  where doctor_id = p_doctor_id
    and service_date = v_date
    and status = 'current'
    and removed_at is null;

  select * into v_entry
  from public.queue_entries
  where doctor_id = p_doctor_id
    and service_date = v_date
    and status = 'waiting'
    and removed_at is null
  order by token_number
  for update skip locked
  limit 1;

  if v_entry.id is null then
    return;
  end if;

  update public.queue_entries
  set status = 'current', called_at = now()
  where id = v_entry.id
  returning * into v_entry;

  return query select * from public.queue_projection(v_entry);
end;
$$;

create or replace function public.complete_current_patient(p_doctor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor public.doctors;
begin
  select * into v_doctor from public.doctors where id = p_doctor_id;
  if v_doctor.id is null then
    raise exception 'Doctor not found.';
  end if;

  if not (public.is_doctor_for_doctor(p_doctor_id) or public.is_receptionist_for_clinic(v_doctor.clinic_id)) then
    raise exception 'Not authorized.';
  end if;

  update public.queue_entries
  set status = 'completed', completed_at = coalesce(completed_at, now())
  where doctor_id = p_doctor_id
    and service_date = public.active_service_date()
    and status = 'current'
    and removed_at is null;
end;
$$;

create or replace function public.add_walk_in_patient(
  p_doctor_id uuid,
  p_name text,
  p_age smallint,
  p_phone_number text default null
)
returns table (
  id uuid,
  clinic_id uuid,
  doctor_id uuid,
  patient_id uuid,
  token_number integer,
  status public.queue_status,
  service_date date,
  created_at timestamptz,
  called_at timestamptz,
  completed_at timestamptz,
  patient_name text,
  patient_age smallint,
  phone_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor public.doctors;
  v_date date := public.active_service_date();
  v_next integer;
  v_patient public.patients;
  v_entry public.queue_entries;
begin
  select * into v_doctor from public.doctors where id = p_doctor_id and is_active = true;
  if v_doctor.id is null then
    raise exception 'Doctor is unavailable.';
  end if;

  if not public.is_receptionist_for_clinic(v_doctor.clinic_id) then
    raise exception 'Only receptionists can add walk-ins.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_doctor_id::text || v_date::text, 0));

  insert into public.patients (name, age, phone_number, is_walk_in, created_by)
  values (btrim(p_name), p_age, nullif(public.normalize_phone(coalesce(p_phone_number, '')), ''), true, auth.uid())
  returning * into v_patient;

  select coalesce(max(token_number), 0) + 1 into v_next
  from public.queue_entries
  where doctor_id = p_doctor_id and service_date = v_date;

  insert into public.queue_entries (clinic_id, doctor_id, patient_id, token_number, service_date)
  values (v_doctor.clinic_id, p_doctor_id, v_patient.id, v_next, v_date)
  returning * into v_entry;

  return query select * from public.queue_projection(v_entry);
end;
$$;

create or replace function public.remove_queue_entry(p_queue_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.queue_entries;
begin
  select * into v_entry from public.queue_entries where id = p_queue_entry_id;
  if v_entry.id is null then
    raise exception 'Queue entry not found.';
  end if;

  if not public.is_receptionist_for_clinic(v_entry.clinic_id) then
    raise exception 'Only receptionists can remove patients.';
  end if;

  update public.queue_entries
  set removed_at = now(), removed_by = auth.uid()
  where id = p_queue_entry_id;
end;
$$;

alter table public.clinics enable row level security;
alter table public.users enable row level security;
alter table public.doctors enable row level security;
alter table public.patients enable row level security;
alter table public.queue_entries enable row level security;

drop policy if exists "read active clinics" on public.clinics;
create policy "read active clinics" on public.clinics
for select using (
  is_active
  or public.is_receptionist_for_clinic(id)
);

drop policy if exists "read own user profile" on public.users;
create policy "read own user profile" on public.users
for select using (
  id = auth.uid()
  or public.is_receptionist_for_clinic(clinic_id)
);

drop policy if exists "read permitted doctors" on public.doctors;
create policy "read permitted doctors" on public.doctors
for select using (
  is_active
  or user_id = auth.uid()
  or public.is_receptionist_for_clinic(clinic_id)
);

drop policy if exists "read permitted patients" on public.patients;
create policy "read permitted patients" on public.patients
for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.queue_entries q
    where q.patient_id = patients.id
      and q.removed_at is null
      and (public.is_doctor_for_doctor(q.doctor_id) or public.is_receptionist_for_clinic(q.clinic_id))
  )
);

drop policy if exists "read permitted queue entries" on public.queue_entries;
create policy "read permitted queue entries" on public.queue_entries
for select using (
  removed_at is null and (
    public.is_doctor_for_doctor(doctor_id)
    or public.is_receptionist_for_clinic(clinic_id)
    or exists (
      select 1 from public.patients p
      where p.id = patient_id and p.user_id = auth.uid()
    )
  )
);

insert into public.clinics (name)
values ('iQuasar Health')
on conflict (name) do nothing;

grant usage on schema public to authenticated, anon;
grant select on public.clinics to authenticated, anon;
grant select on public.doctors to authenticated, anon;
grant select on public.users, public.patients, public.queue_entries to authenticated;
grant execute on function public.upsert_patient_profile(text, smallint, text) to authenticated;
grant execute on function public.list_doctors_with_queue_summary(uuid, date) to authenticated, anon;
grant execute on function public.get_queue_for_doctor(uuid, date) to authenticated;
grant execute on function public.join_queue(uuid) to authenticated;
grant execute on function public.call_next_patient(uuid) to authenticated;
grant execute on function public.complete_current_patient(uuid) to authenticated;
grant execute on function public.add_walk_in_patient(uuid, text, smallint, text) to authenticated;
grant execute on function public.remove_queue_entry(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.queue_entries;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
