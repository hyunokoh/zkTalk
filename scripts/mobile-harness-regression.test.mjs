import test from 'node:test';
import assert from 'node:assert/strict';

import { interpretAutoLoginMarker } from './mobile-harness-regression.mjs';

test('interpretAutoLoginMarker treats explicit success states as terminal success', () => {
  assert.deepEqual(interpretAutoLoginMarker({ loggedIn: true }), {
    terminal: true,
    ok: true,
    reason: null,
  });
  assert.deepEqual(interpretAutoLoginMarker({ stage: 'already-logged-in' }), {
    terminal: true,
    ok: true,
    reason: null,
  });
});

test('interpretAutoLoginMarker fails closed for explicit bad-token states', () => {
  assert.equal(
    interpretAutoLoginMarker({ stage: 'failed-needs-new-token' }).reason,
    'Simulator auto-login failed and needs a fresh session token.',
  );
  assert.equal(
    interpretAutoLoginMarker({ stage: 'skipped-retrying-known-bad-token' }).reason,
    'Simulator auto-login skipped because the last seeded session token already failed.',
  );
  assert.equal(
    interpretAutoLoginMarker({ stage: 'no-token' }).reason,
    'Simulator auto-login could not start because no seeded session token was available.',
  );
});

test('interpretAutoLoginMarker treats explicit error payloads as terminal failure', () => {
  assert.deepEqual(interpretAutoLoginMarker({ error: 'session expired' }), {
    terminal: true,
    ok: false,
    reason: 'Simulator auto-login failed: session expired',
  });
});

test('interpretAutoLoginMarker keeps in-flight marker states pending', () => {
  assert.deepEqual(interpretAutoLoginMarker({ stage: 'started' }), {
    terminal: false,
    ok: false,
    reason: null,
  });
  assert.deepEqual(interpretAutoLoginMarker({ stage: 'loading-token' }), {
    terminal: false,
    ok: false,
    reason: null,
  });
});
