import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateSettings, hexToRgb } from '../src/lib/settings.ts';
import { publicConnection } from '../src/lib/connection.ts';
import { writeMonitorEnv } from '../scripts/monitor-env.mjs';
const config = JSON.parse(await readFile(new URL('../site.config.json', import.meta.url), 'utf8'));

test('custom website, branding and admin route validate', () => {
  const result = validateSettings({ ...config, name: 'Acme', url: 'https://example.org/service', adminPath: '/console', contactUrl: 'mailto:help@example.org', logo: '/logo.svg' });
  assert.equal(result.url, 'https://example.org/service');
  assert.equal(result.name, 'Acme');
  assert.equal(hexToRgb('#0f766e'), '15 118 110');
});
test('unsafe URLs, invalid colours and conflicting routes are rejected', () => {
  for (const patch of [{ url: 'javascript:alert(1)' }, { url: 'https://user:secret@example.com' }, { logo: '//example.com/logo.svg' }, { contactUrl: 'javascript:alert(1)' }, { primaryColor: 'red' }, { adminPath: '/maintenance' }, { adminPath: '/admin?x=1' }]) {
    assert.throws(() => validateSettings({ ...config, ...patch }));
  }
});
test('frontend rejects privileged keys and accepts public keys', () => {
  assert.equal(publicConnection().configured, false);
  assert.equal(publicConnection('https://project.supabase.co', 'sb_publishable_example').configured, true);
  assert.throws(() => publicConnection('https://project.supabase.co', 'sb_secret_example'));
  const token = `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.sig`;
  assert.throws(() => publicConnection('https://project.supabase.co', token));
  assert.throws(() => publicConnection('https://project.supabase.co'));
});
test('monitor settings use the configured website and preserve the generated secret', async () => {
  const root = await mkdtemp(join(tmpdir(), 'watchpost-test-'));
  try {
    await mkdir(join(root, 'supabase'));
    await writeFile(join(root, 'site.config.json'), JSON.stringify({ ...config, url: 'https://example.org/path' }));
    const file = await writeMonitorEnv(root);
    const original = await readFile(file, 'utf8');
    assert.match(original, /TARGET_URL=https:\/\/example.org\/path/);
    assert.match(original, /MONITOR_SECRET=[a-f0-9]{64}/);
    await writeMonitorEnv(root);
    assert.equal(await readFile(file, 'utf8'), original);
  } finally { await rm(root, { recursive: true, force: true }); }
});
