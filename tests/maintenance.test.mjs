import test from 'node:test';
import assert from 'node:assert/strict';
import { maintenancePayload, groupMaintenances } from '../src/lib/maintenance.ts';

const form = { title: ' Phase 1: Website Enhancements ', description: ' Overview ', start: '2026-11-01T08:00:00Z', end: '2026-11-01T12:00:00Z' };
const task = { id: 'draft-1', title: ' Hero Slider Update ', details: ' Cleaner images. ', start: '', end: '' };

test('single-window maintenance remains supported', () => {
  const payload = maintenancePayload(form, []);
  assert.equal(payload.p_title, form.title.trim());
  assert.deepEqual(payload.p_tasks, []);
});
test('multiple items preserve order, details, and optional schedules', () => {
  const payload = maintenancePayload(form, [task, { ...task, id: 'draft-2', title: 'Degree Programme Marquee', start: '2026-11-01T11:00:00+02:00', end: '2026-11-01T12:00:00+02:00' }]);
  assert.equal(payload.p_tasks[0].title, 'Hero Slider Update');
  assert.equal(payload.p_tasks[0].details, 'Cleaner images.');
  assert.equal(payload.p_tasks[0].scheduled_start, null);
  assert.equal(payload.p_tasks[1].scheduled_start, '2026-11-01T09:00:00.000Z');
  assert.equal(payload.p_tasks[1].scheduled_end, '2026-11-01T10:00:00.000Z');
});
test('invalid titles and overall windows are rejected', () => {
  for (const patch of [{ title: '  ' }, { title: 'x'.repeat(141) }, { start: 'bad' }, { end: form.start }, { end: '' }]) {
    assert.throws(() => maintenancePayload({ ...form, ...patch }, [task]));
  }
  assert.throws(() => maintenancePayload(form, [{ ...task, title: ' ' }]), /Item 1/);
});
test('partial, reversed, invalid, and out-of-window item schedules are rejected', () => {
  for (const patch of [
    { start: form.start }, { end: form.end },
    { start: form.end, end: form.start },
    { start: 'bad', end: form.end },
    { start: '2026-11-01T07:59:00Z', end: form.end },
    { start: form.start, end: '2026-11-01T12:01:00Z' },
  ]) assert.throws(() => maintenancePayload(form, [{ ...task, ...patch }]), /Item 1/);
});
test('current scheduled windows remain visible and active windows never appear twice', () => {
  const base = { scheduled_start: form.start, scheduled_end: form.end, tasks: [] };
  const rows = [
    { ...base, id: 'current', status: 'scheduled' },
    { ...base, id: 'active', status: 'in_progress', scheduled_end: '2026-11-01T09:00:00Z' },
    { ...base, id: 'completed', status: 'completed' },
    { ...base, id: 'cancelled', status: 'cancelled' },
    { ...base, id: 'expired', status: 'scheduled', scheduled_end: '2026-11-01T09:00:00Z' },
    { ...base, id: 'future', status: 'scheduled', scheduled_start: '2026-11-02T08:00:00Z', scheduled_end: '2026-11-02T12:00:00Z' },
  ];
  const grouped = groupMaintenances(rows, Date.parse('2026-11-01T10:00:00Z'));
  assert.deepEqual(grouped.upcomingMaintenance.map((m) => m.id), ['active', 'current', 'future']);
  assert.deepEqual(new Set(grouped.pastMaintenance.map((m) => m.id)), new Set(['completed', 'cancelled', 'expired']));
});

test('edits retain saved item identity; new drafts do not send their temporary IDs', () => {
  const payload = maintenancePayload(form, [{ ...task, savedId: 'saved-task-1' }, task]);
  assert.equal(payload.p_tasks[0].id, 'saved-task-1');
  assert.equal(payload.p_tasks[1].id, null);
  assert.equal('completed_at' in payload.p_tasks[0], false);
});
