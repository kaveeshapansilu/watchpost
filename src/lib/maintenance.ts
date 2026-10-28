import type { Maintenance } from './types';

export interface MaintenanceDraft {
  title: string;
  description: string;
  start: string;
  end: string;
}

export interface MaintenanceTaskDraft {
  id: string;
  savedId?: string;
  title: string;
  details: string;
  start: string;
  end: string;
}

export function maintenancePayload(form: MaintenanceDraft, tasks: MaintenanceTaskDraft[]) {
  const title = form.title.trim();
  if (title.length < 3 || title.length > 140) throw new Error('Main title must be between 3 and 140 characters.');
  const start = new Date(form.start).getTime();
  const end = new Date(form.end).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new Error('Choose valid start and end times. End must be after start.');
  }
  return {
    p_title: title,
    p_description: form.description.trim() || null,
    p_start: new Date(start).toISOString(),
    p_end: new Date(end).toISOString(),
    p_tasks: tasks.map((task, index) => {
      const taskTitle = task.title.trim();
      if (taskTitle.length < 3 || taskTitle.length > 140) {
        throw new Error(`Item ${index + 1}: title must be between 3 and 140 characters.`);
      }
      if (Boolean(task.start) !== Boolean(task.end)) {
        throw new Error(`Item ${index + 1}: provide both times or leave both blank to use the overall window.`);
      }
      const taskStart = task.start ? new Date(task.start).getTime() : start;
      const taskEnd = task.end ? new Date(task.end).getTime() : end;
      if (!Number.isFinite(taskStart) || !Number.isFinite(taskEnd) || taskEnd <= taskStart || taskStart < start || taskEnd > end) {
        throw new Error(`Item ${index + 1}: end must be after start and both times must be within the overall window.`);
      }
      return {
        id: task.savedId ?? null,
        title: taskTitle,
        details: task.details.trim() || null,
        scheduled_start: task.start ? new Date(taskStart).toISOString() : null,
        scheduled_end: task.end ? new Date(taskEnd).toISOString() : null,
      };
    }),
  };
}

export function groupMaintenances(maintenances: Maintenance[], now = Date.now()) {
  const isUpcoming = (m: Maintenance) => m.status === 'in_progress'
    || (m.status === 'scheduled' && new Date(m.scheduled_end).getTime() >= now);
  return {
    upcomingMaintenance: maintenances.filter(isUpcoming)
      .sort((a, b) => Number(b.status === 'in_progress') - Number(a.status === 'in_progress')
        || new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()),
    pastMaintenance: maintenances.filter((m) => !isUpcoming(m))
      .sort((a, b) => new Date(b.scheduled_end).getTime() - new Date(a.scheduled_end).getTime()).slice(0, 20),
  };
}
