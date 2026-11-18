import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConnectionDiagnostics, serializeSafeDiagnostics } from '../.test-build/diagnostics.js';

const base = {
  checkedAt: '2026-11-18T10:00:00.000Z',
  serverReachable: true,
  authorization: 'approved',
  tunnelRunning: true,
  tunnelFailed: false,
  virtualIpAssigned: true,
  presenceKnown: true,
  presenceFresh: true,
  expectedPeerCount: 3,
  reachablePeerCount: 0,
  observedRelayRouteCount: 0,
  hasFreshPeerObservations: true,
};

test('partial peer reachability is not a full diagnostic pass', () => {
  const result = buildConnectionDiagnostics({ ...base, reachablePeerCount: 1 });
  assert.deepEqual(result.peerRoute, {
    status: 'partial', totalPlayers: 3, reachable: 1, expected: 3,
    awaitingVirtualIp: 0, playersWithVirtualIp: 3, unknown: 2,
  });
});

test('peer routes pass only when every expected peer has fresh route evidence', () => {
  const result = buildConnectionDiagnostics({ ...base, reachablePeerCount: 3 });
  assert.deepEqual(result.peerRoute, {
    status: 'pass', totalPlayers: 3, reachable: 3, expected: 3,
    awaitingVirtualIp: 0, playersWithVirtualIp: 3, unknown: 0,
  });
});

test('unknown and not-checked remain distinct from failure', () => {
  const noEvidence = buildConnectionDiagnostics({ ...base, reachablePeerCount: 0 });
  const noExpectedPeers = buildConnectionDiagnostics({ ...base, expectedPeerCount: 0 });
  assert.equal(noEvidence.peerRoute.status, 'unknown');
  assert.equal(noExpectedPeers.peerRoute.status, 'not_checked');
  assert.equal(noEvidence.playerPresence, 'pass');
});

test('stale player presence is reported as stale, not failed or live', () => {
  const result = buildConnectionDiagnostics({ ...base, presenceFresh: false });
  assert.equal(result.playerPresence, 'stale');
});

test('observed relayed routes are separate from an independent relay test', () => {
  const result = buildConnectionDiagnostics({
    ...base,
    reachablePeerCount: 2,
    observedRelayRouteCount: 1,
  });
  assert.deepEqual(result.observedRelayRoutes, { status: 'observed', count: 1 });
  assert.equal(result.relayReachabilityTest, 'not_checked');
});

test('diagnostic export whitelists fields and omits credentials and private identifiers', () => {
  const result = buildConnectionDiagnostics({ ...base, reachablePeerCount: 1 });
  Object.assign(result, {
    password: 'password-secret',
    accessToken: 'token-secret',
    networkSecret: 'network-secret',
    serverAddress: 'https://private.example.test',
    virtualIp: '10.126.0.9',
  });
  const exported = serializeSafeDiagnostics(result);
  for (const secret of ['password-secret', 'token-secret', 'network-secret', 'private.example.test', '10.126.0.9']) {
    assert.equal(exported.includes(secret), false);
  }
  assert.equal(exported.includes('"peerRoute"'), true);
});

test('a route report cannot pass while an expected player is awaiting an IP', () => {
  const result = buildConnectionDiagnostics({
    ...base,
    expectedPeerCount: 2,
    reachablePeerCount: 1,
    awaitingVirtualIpCount: 1,
    playersWithVirtualIpCount: 1,
    unknownPeerCount: 0,
  });
  assert.equal(result.peerRoute.status, 'partial');
  assert.equal(result.peerRoute.awaitingVirtualIp, 1);
});

test('diagnostics distinguish total players from active route expectations', () => {
  const result = buildConnectionDiagnostics({
    ...base,
    expectedPeerCount: 1,
    totalOtherPlayerCount: 2,
    reachablePeerCount: 1,
  });
  assert.equal(result.peerRoute.totalPlayers, 2);
  assert.equal(result.peerRoute.expected, 1);
});

test('stale presence prevents a full peer-route pass', () => {
  const result = buildConnectionDiagnostics({ ...base, presenceFresh: false, reachablePeerCount: 3 });
  assert.equal(result.peerRoute.status, 'unknown');
});
