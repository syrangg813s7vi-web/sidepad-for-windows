const PANEL_WIDTH = 680;
const MIN_PANEL_WIDTH = 520;
const EDGE_WIDTH = 12;
const SHARED_EDGE_HEIGHT = 320;

function calculatePanelBounds(workArea, expanded) {
  const { x, y, width, height } = workArea;
  const panelWidth = Math.min(
    PANEL_WIDTH,
    Math.max(MIN_PANEL_WIDTH, Math.round(width * 0.42)),
  );
  return {
    x: x + width - (expanded ? panelWidth : 0),
    y,
    width: panelWidth,
    height,
  };
}

function hasDisplayOnRight(display, allDisplays) {
  const right = display.bounds.x + display.bounds.width;
  return allDisplays.some((other) => {
    if (other.id === display.id || other.bounds.x !== right) return false;
    const top = Math.max(display.bounds.y, other.bounds.y);
    const bottom = Math.min(
      display.bounds.y + display.bounds.height,
      other.bounds.y + other.bounds.height,
    );
    return bottom > top;
  });
}

function selectPrimaryDisplay(displays, primaryDisplayId) {
  return displays.find((display) => String(display.id) === String(primaryDisplayId))
    || displays[0]
    || null;
}

function calculateTriggerBounds(display, sharedEdge) {
  const handleHeight = sharedEdge
    ? Math.min(SHARED_EDGE_HEIGHT, display.workArea.height)
    : display.workArea.height;
  return {
    x: display.workArea.x + display.workArea.width - EDGE_WIDTH,
    y: sharedEdge
      ? display.workArea.y + Math.round((display.workArea.height - handleHeight) / 2)
      : display.workArea.y,
    width: EDGE_WIDTH,
    height: handleHeight,
  };
}

module.exports = {
  EDGE_WIDTH,
  MIN_PANEL_WIDTH,
  PANEL_WIDTH,
  SHARED_EDGE_HEIGHT,
  calculatePanelBounds,
  calculateTriggerBounds,
  hasDisplayOnRight,
  selectPrimaryDisplay,
};
