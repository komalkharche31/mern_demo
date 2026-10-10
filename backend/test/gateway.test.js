import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';

test('environment configuration rejects invalid values', () => {
  for (const env of [{ PORT: 'abc' }, { PORT: '0' }, { FRONTEND_ORIGIN: 'https://example.com/path' }, { SERVICE_TARGET: 'file:///tmp' }]) assert.throws(() => readConfig(env));
  assert.equal(readConfig({}).port, 4000);
});
test('health, CORS, errors, body limit and real upstream forwarding', async t => {
  const upstream = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ path: req.url, body })); });
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const server = createApp({ nodeEnv: 'test', frontendOrigin: 'http://localhost:5173', serviceTarget: `http://127.0.0.1:${upstream.address().port}` }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { server.closeAllConnections(); upstream.closeAllConnections(); await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => upstream.close(resolve))]); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/api/health`, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  assert.equal(health.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.ok(health.headers.get('x-content-type-options'));
  assert.ok(health.headers.get('x-request-id'));
  assert.equal((await fetch(`${base}/api/health`, { headers: { Origin: 'http://untrusted.example' } })).status, 403);
  const missing = await fetch(`${base}/missing`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'NOT_FOUND');
  assert.equal((await fetch(`${base}/missing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await fetch(`${base}/missing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'a'.repeat(34000) }) })).status, 413);
  const proxied = await fetch(`${base}/api/service/items?q=1`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":"test"}' });
  assert.deepEqual(await proxied.json(), { path: '/items?q=1', body: '{"name":"test"}' });
  for (let i = 0; i < 100; i++) await fetch(`${base}/api/health`);
  assert.equal((await fetch(`${base}/api/health`)).status, 429);
});
