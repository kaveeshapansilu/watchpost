-- Run in Supabase SQL Editor before deploying the updated frontend. Safe to re-run.
begin;

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

drop trigger if exists trg_maint_tasks_touch on public.maintenance_tasks;
create trigger trg_maint_tasks_touch before update on public.maintenance_tasks
for each row execute function public.touch_updated_at();
alter table public.maintenance_tasks enable row level security;
drop policy if exists "public read maintenance_tasks" on public.maintenance_tasks;
drop policy if exists "admin write maintenance_tasks" on public.maintenance_tasks;
create policy "public read maintenance_tasks" on public.maintenance_tasks for select using (true);
create policy "admin write maintenance_tasks" on public.maintenance_tasks for all using (public.is_admin()) with check (public.is_admin());

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

commit;
