import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveConnectionStatus} from '../.test-build/connectionStatus.js';

const base = {
  serverReachable: true,
  stage: 'idle',
  roomActive: false,
  tunnelRunning: false,
  virtualIp: null,
  reachablePeerCount: 0,
};

test('reachable API is not reported as a ready network', () => {
  assert.equal(deriveConnectionStatus(base), 'server-reachable');
});

test('invalid access code remains an authentication failure', () => {
  assert.equal(deriveConnectionStatus({...base, stage: 'auth-failed'}), 'authentication-failed');
});

test('a virtual IP without peer evidence is explicitly unverified', () => {
  assert.equal(deriveConnectionStatus({
    ...base, roomActive: true, tunnelRunning: true, virtualIp: '10.0.0.2',
  }), 'peer-unverified');
});

test('peer reachability requires actual peer evidence', () => {
  assert.equal(deriveConnectionStatus({
    ...base, roomActive: true, tunnelRunning: true, virtualIp: '10.0.0.2', reachablePeerCount: 1,
  }), 'peer-connected');
});

test('tunnel startup is not presented as connected', () => {
  assert.equal(deriveConnectionStatus({...base, roomActive: true, stage: 'tunnel'}), 'tunnel-starting');
});
