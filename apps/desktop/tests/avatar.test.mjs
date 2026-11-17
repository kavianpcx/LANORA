import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { avatars } from '../.test-build/components/avatarData.js';

test('avatar collection preserves saved IDs and includes the new characters', () => {
  for (const legacy of ['fox', 'cat', 'bear', 'dog', 'owl', 'panda', 'rabbit', 'frog', 'tiger', 'penguin']) {
    assert.ok(avatars.includes(legacy), `missing saved avatar ID: ${legacy}`);
  }
  assert.equal(avatars.length, 17);
  assert.ok(avatars.includes('axolotl'));
  assert.ok(avatars.includes('robot'));
});

test('all saved avatar IDs resolve to the existing bundled WebP artwork', () => {
  for (const id of avatars) {
    const file = new URL(`../src/assets/avatars/${id}.webp`, import.meta.url);
    const bytes = readFileSync(file);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${id} is not a RIFF image`);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `${id} is not WebP artwork`);
    assert.ok(bytes.length > 1024, `${id} artwork is unexpectedly small`);
  }
});
