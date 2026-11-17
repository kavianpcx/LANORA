import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarForPlayer, avatars } from '../.test-build/components/avatarData.js';

test('avatar collection preserves saved IDs and includes the new characters', () => {
  for (const legacy of ['fox', 'cat', 'bear', 'dog', 'owl', 'panda', 'rabbit', 'frog', 'tiger', 'penguin']) {
    assert.ok(avatars.includes(legacy), `missing saved avatar ID: ${legacy}`);
  }
  assert.equal(avatars.length, 17);
  assert.ok(avatars.includes('axolotl'));
  assert.ok(avatars.includes('robot'));
});

test('fallback player avatars are stable and valid for backend member IDs', () => {
  for (const id of ['', 'player-a', 'a'.repeat(100), '\u0000\uffff'.repeat(20)]) {
    const avatar = avatarForPlayer(id);
    assert.ok(avatars.includes(avatar));
    assert.equal(avatarForPlayer(id), avatar);
  }
});
