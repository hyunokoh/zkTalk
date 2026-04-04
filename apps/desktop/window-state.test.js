const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeWindowState } = require('./window-state');

const defaultState = {
  width: 1440,
  height: 960,
  x: undefined,
  y: undefined,
  isMaximized: false,
};

const displays = [
  {
    workArea: { x: 0, y: 0, width: 1728, height: 1117 },
  },
];

test('keeps on-screen window state', () => {
  const result = normalizeWindowState(
    {
      x: 120,
      y: 80,
      width: 1200,
      height: 900,
      isMaximized: false,
    },
    displays,
    defaultState,
  );

  assert.equal(result.x, 120);
  assert.equal(result.y, 80);
});

test('resets off-screen window state to default position', () => {
  const result = normalizeWindowState(
    {
      x: -667,
      y: -1652,
      width: 1440,
      height: 1025,
      isMaximized: false,
    },
    displays,
    defaultState,
  );

  assert.equal(result.x, undefined);
  assert.equal(result.y, undefined);
  assert.equal(result.width, 1440);
  assert.equal(result.height, 1025);
});

test('allows undefined position to pass through unchanged', () => {
  const result = normalizeWindowState(
    {
      width: 1440,
      height: 960,
      x: undefined,
      y: undefined,
      isMaximized: true,
    },
    displays,
    defaultState,
  );

  assert.equal(result.x, undefined);
  assert.equal(result.y, undefined);
  assert.equal(result.isMaximized, true);
});
