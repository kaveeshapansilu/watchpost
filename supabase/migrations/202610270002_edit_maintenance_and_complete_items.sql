-- Apply after 202610270001_grouped_maintenance.sql. Safe to re-run.
begin;

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

commit;
