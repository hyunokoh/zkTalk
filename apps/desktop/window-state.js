function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
  );
}

function normalizeWindowState(state, displays, defaultState) {
  const nextState = { ...defaultState, ...state };

  if (!isFiniteNumber(nextState.x) || !isFiniteNumber(nextState.y)) {
    return nextState;
  }

  const windowRect = {
    x: nextState.x,
    y: nextState.y,
    width: isFiniteNumber(nextState.width) ? nextState.width : defaultState.width,
    height: isFiniteNumber(nextState.height) ? nextState.height : defaultState.height,
  };

  const hasVisibleDisplay = displays.some((display) =>
    rectsIntersect(windowRect, display.workArea ?? display.bounds),
  );

  if (hasVisibleDisplay) {
    return nextState;
  }

  return {
    ...defaultState,
    width: windowRect.width,
    height: windowRect.height,
    isMaximized: nextState.isMaximized === true,
  };
}

module.exports = {
  normalizeWindowState,
};
