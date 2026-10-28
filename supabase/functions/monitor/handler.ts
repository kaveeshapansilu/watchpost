export interface CheckRow {
  is_up: boolean;
  response_time_ms: number;
  status_code: number | null;
  error: string | null;
  region: string;
}

interface MonitorConfig {
  target: string;
  secret: string;
  timeoutMs?: number;
  region?: string;
}
interface Dependencies {
  fetch: typeof fetch;
  record: (row: CheckRow) => Promise<void>;
}

function matchesSecret(actual: string, expected: string) {
  const a = new TextEncoder().encode(actual);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

export function createMonitorHandler(config: MonitorConfig, dependencies: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (!config.secret || config.secret.length < 32 || !config.target) {
      return Response.json({ ok: false, error: 'Monitor configuration is incomplete.' }, { status: 503 });
    }
    if (!matchesSecret(request.headers.get('authorization') ?? '', `Bearer ${config.secret}`)) {
      return Response.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }
    if (request.method !== 'POST') {
      return Response.json({ ok: false, error: 'Use POST.' }, { status: 405, headers: { Allow: 'POST' } });
    }
    let target: URL;
    try {
      target = new URL(config.target);
      if (target.protocol !== 'https:' || target.username || target.password || target.hash) throw new Error('Invalid target');
    } catch {
      return Response.json({ ok: false, error: 'Configure a valid HTTPS target without credentials.' }, { status: 503 });
    }
    const timeout = Math.min(30000, Math.max(1000, Number.isFinite(config.timeoutMs) ? config.timeoutMs! : 15000));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const started = Date.now();
    let statusCode: number | null = null;
    let isUp = false;
    let error: string | null = null;
    try {
      const response = await dependencies.fetch(target.href, {
        method: 'GET', redirect: 'follow', signal: controller.signal,
        headers: { 'User-Agent': 'Watchpost-Monitor/1.0' },
      });
      statusCode = response.status;
      isUp = response.status >= 200 && response.status < 400;
      if (!isUp) error = `HTTP ${response.status}`;
      try { await response.body?.cancel(); } catch { /* Headers already establish availability. */ }
    } catch (cause) {
      error = cause instanceof Error && cause.name === 'AbortError' ? `Timeout after ${timeout} ms` : 'Network request failed';
    } finally { clearTimeout(timer); }
    const responseTimeMs = Date.now() - started;
    try {
      await dependencies.record({ is_up: isUp, response_time_ms: responseTimeMs, status_code: statusCode, error, region: config.region ?? 'edge' });
    } catch {
      return Response.json({ ok: false, error: 'Could not record the check.' }, { status: 500 });
    }
    return Response.json({ ok: true, isUp, statusCode, responseTimeMs, error });
  };
}
