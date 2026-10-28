import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonitorHandler } from '../supabase/functions/monitor/handler.ts';
const secret = 'a'.repeat(64);
const request = (token = secret, method = 'POST') => new Request('https://functions.example.com/monitor', { method, headers: { Authorization: `Bearer ${token}` } });

test('unauthorized requests never probe or write', async () => {
  let calls = 0;
  const handler = createMonitorHandler({ target: 'https://example.com', secret }, { fetch: async () => { calls++; }, record: async () => { calls++; } });
  assert.equal((await handler(request('wrong'))).status, 401);
  assert.equal(calls, 0);
});
test('configured target is used and request-supplied targets are ignored', async () => {
  const rows = [];
  const handler = createMonitorHandler({ target: 'https://example.org/health', secret }, {
    fetch: async (url) => { assert.equal(url, 'https://example.org/health'); return new Response('OK'); },
    record: async row => rows.push(row),
  });
  const response = await handler(new Request('https://functions.example.com/monitor?target=https://untrusted.example', { method: 'POST', headers: { Authorization: `Bearer ${secret}` } }));
  assert.equal(response.status, 200);
  assert.equal(rows[0].is_up, true);
  assert.equal(rows[0].status_code, 200);
});
test('HTTP failures and network failures record downtime', async () => {
  for (const fail of [false, true]) {
    let row;
    const handler = createMonitorHandler({ target: 'https://example.com', secret }, {
      fetch: async () => { if (fail) throw new Error('network failure'); return new Response('Unavailable', { status: 503 }); },
      record: async data => { row = data; },
    });
    assert.equal((await handler(request())).status, 200);
    assert.equal(row.is_up, false);
    assert.equal(row.status_code, fail ? null : 503);
  }
});
test('missing configuration, invalid targets, wrong methods and storage failure return errors', async () => {
  const deps = { fetch: async () => new Response('OK'), record: async () => {} };
  assert.equal((await createMonitorHandler({ target: '', secret }, deps)(request())).status, 503);
  assert.equal((await createMonitorHandler({ target: 'http://example.com', secret }, deps)(request())).status, 503);
  assert.equal((await createMonitorHandler({ target: 'https://example.com', secret }, deps)(request(secret, 'GET'))).status, 405);
  assert.equal((await createMonitorHandler({ target: 'https://example.com', secret }, { ...deps, record: async () => { throw new Error('private error'); } })(request())).status, 500);
});
