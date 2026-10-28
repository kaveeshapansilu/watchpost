import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { createMonitorHandler } from './handler.ts';

Deno.serve(createMonitorHandler({
  target: Deno.env.get('TARGET_URL') ?? '',
  secret: Deno.env.get('MONITOR_SECRET') ?? '',
  timeoutMs: Number(Deno.env.get('TIMEOUT_MS') ?? 15000),
  region: Deno.env.get('SB_REGION') ?? 'edge',
}, {
  fetch,
  async record(row) {
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error } = await client.from('uptime_checks').insert(row);
    if (error) throw error;
  },
}));
