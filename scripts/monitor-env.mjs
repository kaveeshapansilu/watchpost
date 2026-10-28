import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateSettings } from '../src/lib/settings.ts';

export async function writeMonitorEnv(root = process.cwd()) {
  const site = validateSettings(JSON.parse(await readFile(resolve(root, 'site.config.json'), 'utf8')));
  const path = resolve(root, 'supabase/.env.monitor.local');
  let old = '';
  try { old = await readFile(path, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const existing = old.match(/^MONITOR_SECRET=([a-f0-9]{64})$/m)?.[1];
  const secret = existing ?? randomBytes(32).toString('hex');
  await writeFile(path, `# Private server-side settings. Never commit or upload to static hosting.\nTARGET_URL=${site.url}\nMONITOR_SECRET=${secret}\nTIMEOUT_MS=15000\n`, { mode: 0o600 });
  return path;
}
if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await writeMonitorEnv();
  console.log('Updated supabase/.env.monitor.local from site.config.json. Existing monitor secret preserved.');
}
