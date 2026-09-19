import assert from 'node:assert/strict';
import test from 'node:test';
import { accessExpiresAt, isSameOriginPost, parseRefreshCookie, safeReturnTo } from '../src/lib/session-security.ts';
import { SessionSingleFlight } from '../src/lib/session-single-flight.ts';

test('return destinations reject external, encoded and renewal-loop targets', () => {
  for (const path of ['//evil.test', '/%2f%2fevil.test', '/%255cevil.test', '/session/renew', '/api/session/refresh', '/bad%0apath', 'https://evil.test']) assert.equal(safeReturnTo(path), '/');
  assert.equal(safeReturnTo('/account/orders?q=1'), '/account/orders?q=1');
});
test('refresh accepts only same origin POST', () => {
  const request = (origin: string, site: string, method = 'POST') => ({ url: 'https://store.test/api/session/refresh', method, headers: new Headers({ origin, 'sec-fetch-site': site }) });
  assert.equal(isSameOriginPost(request('https://store.test', 'same-origin')), true);
  assert.equal(isSameOriginPost(request('https://evil.test', 'cross-site')), false);
  assert.equal(isSameOriginPost(request('https://store.test', 'same-origin', 'GET')), false);
});
test('malformed expiry and refresh cookies are rejected', () => {
  assert.equal(accessExpiresAt('invalid'), undefined);
  assert.equal(accessExpiresAt(`a.${Buffer.from(JSON.stringify({ exp: '123' })).toString('base64url')}.b`), undefined);
  assert.equal(parseRefreshCookie(new Headers({ 'set-cookie': 'refresh_token=a.b.c; Path=/; Max-Age=3600; HttpOnly' }))?.maxAge, 3600);
  assert.equal(parseRefreshCookie(new Headers({ 'set-cookie': 'refresh_token=a.b.c; Max-Age=0' })), undefined);
});
test('concurrent refreshes share one rotation and bounded retry window', async () => {
  const coordinator = new SessionSingleFlight<number>();
  let calls = 0;
  const rotate = async () => ++calls;
  const result = await Promise.all([coordinator.run('hash', rotate), coordinator.run('hash', rotate)]);
  assert.deepEqual(result, [1, 1]);
  assert.equal(await coordinator.run('hash', rotate), 1);
  assert.equal(calls, 1);
});
test('failed rotations can be retried', async () => {
  const coordinator = new SessionSingleFlight<number>();
  await assert.rejects(coordinator.run('hash', () => Promise.reject(new Error('temporary'))));
  assert.equal(await coordinator.run('hash', () => Promise.resolve(2)), 2);
});
