-- ============================================================================
-- Watchpost. Supabase / PostgreSQL schema
-- One independent status page and monitored website per deployment.
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query → Run.
-- It is idempotent (safe to re-run).
-- ============================================================================

-- ---- Extensions ---------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---- Profiles (links auth.users → role) ------------------------------------
-- NOTE: tables MUST come before the is_admin() helper, because the helper
-- queries public.profiles and Postgres validates the reference at creation.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

-- ---- Helpers ---------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ---- Singleton site status --------------------------------------------------
create table if not exists public.site_status (
  id integer primary key,
  status text not null default 'operational'
    check (status in ('operational','degraded','partial_outage','major_outage','maintenance')),
  message text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint site_status_singleton check (id = 1)
);

insert into public.site_status (id, status, message)
values (1, 'operational', null)
on conflict (id) do nothing;

-- ---- Incidents ---------------------------------------------------------------
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  description text,
  status text not null default 'investigating'
    check (status in ('investigating','identified','monitoring','resolved')),
  severity text not null default 'minor'
    check (severity in ('minor','major','critical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_by uuid references auth.users (id) on delete set null
);
create index if not exists incidents_created_idx on public.incidents (created_at desc);
create index if not exists incidents_status_idx on public.incidents (status);

-- ---- Incident updates ---------------------------------------------------------
create table if not exists public.incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'investigating'
    check (status in ('investigating','identified','monitoring','resolved')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
create index if not exists incident_updates_incident_idx on public.incident_updates (incident_id, created_at desc);

-- ---- Maintenance windows -------------------------------------------------------
create table if not exists public.maintenances (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  description text,
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','completed','cancelled')),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint maint_end_after_start check (scheduled_end > scheduled_start)
);
create index if not exists maint_start_idx on public.maintenances (scheduled_start desc);

-- ---- Maintenance subtasks (multiple titled steps under one maintenance) --------
create table if not exists public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  maintenance_id uuid not null references public.maintenances (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  details text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
create index if not exists maint_tasks_maint_idx on public.maintenance_tasks (maintenance_id, sort_order asc);

-- ---- Automated uptime checks (written by Edge Function monitor) -----------------
create table if not exists public.uptime_checks (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  is_up boolean not null,
  response_time_ms integer,
  status_code integer,
  error text,
  region text
);
create index if not exists uptime_checked_idx on public.uptime_checks (checked_at desc);

-- Keep table lean on shared hosting scale: optional retention (90 days).
-- Uncomment to enable auto-cleanup via pg_cron:
-- select cron.schedule('purge-old-uptime-checks', '0 3 * * *',
--   $$ delete from public.uptime_checks where checked_at < now() - interval '90 days'; $$);

-- ---- updated_at trigger ----------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_incidents_touch on public.incidents;
create trigger trg_incidents_touch before update on public.incidents
for each row execute function public.touch_updated_at();

drop trigger if exists trg_maint_touch on public.maintenances;
create trigger trg_maint_touch before update on public.maintenances
for each row execute function public.touch_updated_at();

drop trigger if exists trg_maint_tasks_touch on public.maintenance_tasks;
create trigger trg_maint_tasks_touch before update on public.maintenance_tasks
for each row execute function public.touch_updated_at();

-- ---- Row Level Security -----------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.site_status enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_updates enable row level security;
alter table public.maintenances enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.uptime_checks enable row level security;

-- Drop old policies if re-running
drop policy if exists "public read site_status" on public.site_status;
drop policy if exists "admin write site_status" on public.site_status;
drop policy if exists "public read incidents" on public.incidents;
drop policy if exists "admin write incidents" on public.incidents;
drop policy if exists "public read incident_updates" on public.incident_updates;
drop policy if exists "admin write incident_updates" on public.incident_updates;
drop policy if exists "public read maintenances" on public.maintenances;
drop policy if exists "admin write maintenances" on public.maintenances;
drop policy if exists "public read maintenance_tasks" on public.maintenance_tasks;
drop policy if exists "admin write maintenance_tasks" on public.maintenance_tasks;
drop policy if exists "public read uptime_checks" on public.uptime_checks;
drop policy if exists "admin write uptime_checks" on public.uptime_checks;
drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
drop policy if exists "admin read all profiles" on public.profiles;
drop policy if exists "admin update profiles" on public.profiles;

-- Public (anon + authenticated) can READ everything except profiles
create policy "public read site_status" on public.site_status for select using (true);
create policy "public read incidents" on public.incidents for select using (true);
create policy "public read incident_updates" on public.incident_updates for select using (true);
create policy "public read maintenances" on public.maintenances for select using (true);
create policy "public read maintenance_tasks" on public.maintenance_tasks for select using (true);
create policy "public read uptime_checks" on public.uptime_checks for select using (true);

-- Only admins can WRITE status content
create policy "admin write site_status" on public.site_status for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write incidents" on public.incidents for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write incident_updates" on public.incident_updates for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write maintenances" on public.maintenances for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write maintenance_tasks" on public.maintenance_tasks for all using (public.is_admin()) with check (public.is_admin());

-- uptime_checks: admins can manage; the Edge Function writes with service_role (bypasses RLS).
create policy "admin write uptime_checks" on public.uptime_checks for all using (public.is_admin()) with check (public.is_admin());

-- Profiles: users manage their own row; admins see/update all
create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id and role = 'viewer');
create policy "admin read all profiles" on public.profiles for select using (public.is_admin());
create policy "admin update profiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- Auto-create a viewer profile row on signup (promote to admin manually)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Grouped maintenance scheduling ------------------------------------------
-- Optional item schedules; existing items inherit their parent window.
alter table public.maintenance_tasks
  add column if not exists scheduled_start timestamptz,
  add column if not exists scheduled_end timestamptz;

alter table public.maintenance_tasks drop constraint if exists maint_task_times_valid;
alter table public.maintenance_tasks add constraint maint_task_times_valid check (
  (scheduled_start is null and scheduled_end is null)
  or (scheduled_start is not null and scheduled_end is not null and scheduled_end > scheduled_start)
);

-- A single transaction publishes the parent and every item, or none of them.
-- SECURITY INVOKER preserves the existing admin-only row-level policies.
create or replace function public.schedule_maintenance(
  p_title text,
  p_description text,
  p_start timestamptz,
  p_end timestamptz,
  p_tasks jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  maintenance_uuid uuid;
  task jsonb;
  task_index integer := 0;
  task_start timestamptz;
  task_end timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Only admins can schedule maintenance.' using errcode = '42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 3 and 140 then
    raise exception 'Main title must be between 3 and 140 characters.';
  end if;
  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'End must be after start.';
  end if;
  if p_tasks is null or jsonb_typeof(p_tasks) <> 'array' then
    raise exception 'Maintenance items must be an array.';
  end if;

  insert into public.maintenances (title, description, scheduled_start, scheduled_end, status, created_by)
  values (btrim(p_title), nullif(btrim(p_description), ''), p_start, p_end, 'scheduled', auth.uid())
  returning id into maintenance_uuid;

  for task in select value from jsonb_array_elements(p_tasks)
  loop
    if jsonb_typeof(task) <> 'object' or task->>'title' is null
      or char_length(btrim(task->>'title')) not between 3 and 140 then
      raise exception 'Item %: title must be between 3 and 140 characters.', task_index + 1;
    end if;
    task_start := nullif(task->>'scheduled_start', '')::timestamptz;
    task_end := nullif(task->>'scheduled_end', '')::timestamptz;
    if (task_start is null) <> (task_end is null) then
      raise exception 'Item %: provide both times or leave both blank.', task_index + 1;
    end if;
    if task_start is not null and (task_end <= task_start or task_start < p_start or task_end > p_end) then
      raise exception 'Item %: times must be ordered and within the overall window.', task_index + 1;
    end if;
    insert into public.maintenance_tasks (maintenance_id, title, details, sort_order, scheduled_start, scheduled_end, created_by)
    values (maintenance_uuid, btrim(task->>'title'), nullif(btrim(task->>'details'), ''), task_index, task_start, task_end, auth.uid());
    task_index := task_index + 1;
  end loop;
  return maintenance_uuid;
end;
$$;

revoke all on function public.schedule_maintenance(text, text, timestamptz, timestamptz, jsonb) from public;
grant execute on function public.schedule_maintenance(text, text, timestamptz, timestamptz, jsonb) to authenticated;

-- ---- Maintenance editing and item completion --------------------------------
alter table public.maintenance_tasks add column if not exists completed_at timestamptz;

-- Preserve existing item IDs, audit fields and completion when editing content.
-- All edits, additions and removals commit together, or none do.
create or replace function public.update_maintenance(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_title text,
  p_description text,
  p_start timestamptz,
  p_end timestamptz,
  p_tasks jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  task jsonb;
  task_id uuid;
  kept_ids uuid[] := '{}';
  task_index integer := 0;
  task_start timestamptz;
  task_end timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Only admins can edit maintenance.' using errcode = '42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 3 and 140 then
    raise exception 'Main title must be between 3 and 140 characters.';
  end if;
  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'End must be after start.';
  end if;
  if p_tasks is null or jsonb_typeof(p_tasks) <> 'array' then
    raise exception 'Maintenance items must be an array.';
  end if;

  update public.maintenances
  set title = btrim(p_title), description = nullif(btrim(p_description), ''),
      scheduled_start = p_start, scheduled_end = p_end
  where id = p_id and updated_at = p_expected_updated_at;
  if not found then
    raise exception 'This maintenance was changed or removed. Cancel editing, refresh the page, and reopen it before saving.';
  end if;

  for task in select value from jsonb_array_elements(p_tasks)
  loop
    if jsonb_typeof(task) <> 'object' or task->>'title' is null
      or char_length(btrim(task->>'title')) not between 3 and 140 then
      raise exception 'Item %: title must be between 3 and 140 characters.', task_index + 1;
    end if;
    task_start := nullif(task->>'scheduled_start', '')::timestamptz;
    task_end := nullif(task->>'scheduled_end', '')::timestamptz;
    if (task_start is null) <> (task_end is null) then
      raise exception 'Item %: provide both times or leave both blank.', task_index + 1;
    end if;
    if task_start is not null and (task_end <= task_start or task_start < p_start or task_end > p_end) then
      raise exception 'Item %: times must be ordered and within the overall window.', task_index + 1;
    end if;
    task_id := nullif(task->>'id', '')::uuid;
    if task_id is not null then
      if task_id = any(kept_ids) then
        raise exception 'The same maintenance item cannot appear twice.';
      end if;
      update public.maintenance_tasks
      set title = btrim(task->>'title'), details = nullif(btrim(task->>'details'), ''),
          scheduled_start = task_start, scheduled_end = task_end, sort_order = task_index
      where id = task_id and maintenance_id = p_id;
      if not found then
        raise exception 'Item % no longer belongs to this maintenance. Refresh and try again.', task_index + 1;
      end if;
    else
      insert into public.maintenance_tasks (maintenance_id, title, details, sort_order, scheduled_start, scheduled_end, created_by)
      values (p_id, btrim(task->>'title'), nullif(btrim(task->>'details'), ''), task_index, task_start, task_end, auth.uid())
      returning id into task_id;
    end if;
    kept_ids := array_append(kept_ids, task_id);
    task_index := task_index + 1;
  end loop;

  delete from public.maintenance_tasks where maintenance_id = p_id and not (id = any(kept_ids));
  return p_id;
end;
$$;

create or replace function public.set_maintenance_task_completed(p_task_id uuid, p_completed boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can update maintenance items.' using errcode = '42501';
  end if;
  if p_completed is null then
    raise exception 'Choose whether the item is completed.';
  end if;
  -- Use the same lock order as editing, without changing the parent's status.
  perform 1 from public.maintenances
  where id = (select maintenance_id from public.maintenance_tasks where id = p_task_id)
  for update;
  update public.maintenance_tasks
  set completed_at = case when p_completed then coalesce(completed_at, now()) else null end
  where id = p_task_id;
  if not found then
    raise exception 'This maintenance item was removed. Refresh the page and try again.';
  end if;
end;
$$;

revoke all on function public.update_maintenance(uuid, timestamptz, text, text, timestamptz, timestamptz, jsonb) from public;
grant execute on function public.update_maintenance(uuid, timestamptz, text, text, timestamptz, timestamptz, jsonb) to authenticated;
revoke all on function public.set_maintenance_task_completed(uuid, boolean) from public;
grant execute on function public.set_maintenance_task_completed(uuid, boolean) to authenticated;


-- Explicit API privileges; RLS still decides which rows may be written.
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.site_status, public.incidents, public.incident_updates,
  public.maintenances, public.maintenance_tasks, public.uptime_checks to anon, authenticated;
grant insert, update, delete on public.site_status, public.incidents, public.incident_updates,
  public.maintenances, public.maintenance_tasks, public.uptime_checks to authenticated;
grant usage, select on sequence public.uptime_checks_id_seq to authenticated;
