import test from 'node:test';
import assert from 'node:assert/strict';
import { RequestError } from '../.test-build/api.js';
import { discoverPlayerAuth, playerJoinCredentials } from '../.test-build/serverAuth.js';

test('connection info selects passwordless mode only when the server says so', async () => {
  assert.equal(await discoverPlayerAuth('https://server', async () => ({ playerAuth: 'passwordless' })), 'passwordless');
  assert.equal(await discoverPlayerAuth('https://server', async () => ({ playerAuth: 'password_required' })), 'password_required');
});

test('old alpha servers fall back to the existing access-code flow', async () => {
  assert.equal(await discoverPlayerAuth('https://server', async () => {
    throw new RequestError('not_found', 404);
  }), 'legacy_password');
});

test('failed or unknown discovery never assumes passwordless mode', async () => {
  await assert.rejects(
    discoverPlayerAuth('https://server', async () => { throw new RequestError('timeout'); }),
    error => error.code === 'timeout',
  );
  await assert.rejects(
    discoverPlayerAuth('https://server', async () => ({ playerAuth: 'unknown' })),
    error => error.code === 'connection_info_invalid',
  );
});

test('player credentials follow discovered server policy', () => {
  assert.deepEqual(playerJoinCredentials('passwordless', ''), {});
  assert.deepEqual(playerJoinCredentials('password_required', 'secret'), { password: 'secret' });
  assert.deepEqual(playerJoinCredentials('legacy_password', ' old-code '), { code: 'old-code' });
});
