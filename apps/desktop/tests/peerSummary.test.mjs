import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePeerRoutes } from '../.test-build/peerSummary.js';

const fresh = (players, reachable = []) => summarizePeerRoutes(
  players,
  new Set(reachable),
  true,
);

test('no remote players is not checked', () => {
  assert.deepEqual(fresh([]), {
    totalOtherPlayers: 0,
    expectedPlayers: 0,
    awaitingVirtualIp: 0,
    playersWithVirtualIp: 0,
    reachable: 0,
    unknown: 0,
    status: 'not_checked',
  });
});

test('one player with a fresh route is reachable', () => {
  const result = fresh([{ virtualIp: '10.126.0.2', online: true }], ['10.126.0.2']);
  assert.equal(result.status, 'pass');
  assert.equal(result.reachable, 1);
});

test('a player without a virtual IP stays in the expected total', () => {
  const result = fresh([{ online: true }]);
  assert.equal(result.totalOtherPlayers, 1);
  assert.equal(result.awaitingVirtualIp, 1);
  assert.equal(result.status, 'unknown');
});

test('one of two players reachable is partial and reports the other unknown', () => {
  const result = fresh([
    { virtualIp: '10.126.0.2', online: true },
    { virtualIp: '10.126.0.3', online: true },
  ], ['10.126.0.2']);
  assert.equal(result.totalOtherPlayers, 2);
  assert.equal(result.reachable, 1);
  assert.equal(result.unknown, 1);
  assert.equal(result.status, 'partial');
});

test('all players with virtual IPs and fresh routes pass', () => {
  const result = fresh([
    { virtualIp: '10.126.0.2', online: true },
    { virtualIp: '10.126.0.3', online: true },
  ], ['10.126.0.2', '10.126.0.3']);
  assert.equal(result.status, 'pass');
  assert.equal(result.reachable, 2);
});

test('offline players are not expected while presence is fresh', () => {
  const result = fresh([
    { virtualIp: '10.126.0.2', online: false },
    { virtualIp: '10.126.0.3', online: true },
  ], ['10.126.0.3']);
  assert.equal(result.totalOtherPlayers, 2);
  assert.equal(result.expectedPlayers, 1);
  assert.equal(result.status, 'pass');
});

test('stale API presence never reports a full pass', () => {
  const result = summarizePeerRoutes(
    [{ virtualIp: '10.126.0.2', online: true }],
    new Set(['10.126.0.2']),
    false,
  );
  assert.equal(result.status, 'unknown');
});
