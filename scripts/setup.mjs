import { createInterface } from 'node:readline/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { validateSettings } from '../src/lib/settings.ts';
import { publicConnection } from '../src/lib/connection.ts';
import { writeMonitorEnv } from './monitor-env.mjs';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = async (label, fallback = '') => (await rl.question(`${label}${fallback ? ` [${fallback}]` : ''}: `)).trim() || fallback;
try {
  const current = JSON.parse(await readFile('site.config.json', 'utf8'));
  console.log('\nWatchpost setup. one website per independent deployment.\n');
  const name = await ask('Website name', current.name);
  const site = validateSettings({ ...current,
    name,
    url: await ask('Website HTTPS URL', current.url),
    title: await ask('Status page title', `${name} Status`),
    description: await ask('Page description', current.description),
    logo: await ask('Logo path or HTTPS URL (optional)', current.logo),
    contactUrl: await ask('Contact HTTPS or mailto link (optional)', current.contactUrl),
    primaryColor: await ask('Primary colour', current.primaryColor),
    accentColor: await ask('Accent colour', current.accentColor),
    adminPath: await ask('Admin path', current.adminPath),
  });
  let existingEnv = '';
  try { existingEnv = await readFile('.env', 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const configure = await ask('Configure Supabase connection now? (y/n)', existingEnv ? 'n' : 'y');
  let env;
  if (configure.toLowerCase() === 'y') {
    const url = await ask('Supabase project HTTPS URL (blank to configure later)');
    const key = url ? await ask('Supabase publishable or anon key (never a service-role key)') : '';
    publicConnection(url, key);
    env = `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${key}\n`;
  }
  await writeFile('site.config.json', `${JSON.stringify(site, null, 2)}\n`);
  if (env !== undefined) await writeFile('.env', env, { mode: 0o600 });
  await writeMonitorEnv();
  console.log('\nSaved site.config.json and private monitor settings. Next: follow README.md to create the database, admin account, and monitor schedule. Rebuild after configuration changes.');
} catch (error) {
  console.error(`Setup failed: ${error.message}`);
  process.exitCode = 1;
} finally { rl.close(); }
