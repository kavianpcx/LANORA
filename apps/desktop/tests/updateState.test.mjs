import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadPercent, reconcilePendingUpdate } from '../.test-build/updateState.js';

test('update confirmation requires the installed version to match the signed target', () => {
  assert.deepEqual(reconcilePendingUpdate('0.3.0-alpha.2', '0.3.0-alpha.2'), {
    status: 'installed',
    version: '0.3.0-alpha.2',
  });
  assert.deepEqual(reconcilePendingUpdate('0.3.0-alpha.2', '0.3.0-alpha.1'), {
    status: 'mismatch',
    expectedVersion: '0.3.0-alpha.2',
    actualVersion: '0.3.0-alpha.1',
  });
  assert.equal(reconcilePendingUpdate(null, '0.3.0-alpha.2'), null);
});

test('known download size produces a bounded percentage', () => {
  assert.equal(downloadPercent(0, 100), 0);
  assert.equal(downloadPercent(45, 100), 45);
  assert.equal(downloadPercent(100, 100), 100);
  assert.equal(downloadPercent(120, 100), 100);
  assert.equal(downloadPercent(-3, 100), 0);
});

test('unknown or unusable download size stays indeterminate', () => {
  assert.equal(downloadPercent(20, null), null);
  assert.equal(downloadPercent(20, 0), null);
  assert.equal(downloadPercent(20, Number.NaN), null);
});
