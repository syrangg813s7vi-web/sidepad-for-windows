const assert = require('node:assert/strict');
const test = require('node:test');
const {
  calculatePanelBounds,
  calculateTriggerBounds,
  hasDisplayOnRight,
  selectPrimaryDisplay,
} = require('../src/window-layout');

test('panel width follows the narrow 42% rule within its min/max limits', () => {
  assert.equal(calculatePanelBounds({ x: 0, y: 0, width: 1024, height: 768 }, true).width, 520);
  assert.equal(calculatePanelBounds({ x: 0, y: 0, width: 1280, height: 800 }, true).width, 538);
  assert.equal(calculatePanelBounds({ x: 0, y: 0, width: 1920, height: 1080 }, true).width, 680);
});

test('150% Windows scaling keeps the same DIP layout and predictable physical width', () => {
  const scaleFactor = 1.5;
  const physicalWorkAreaWidth = 1920;
  const dipWorkAreaWidth = physicalWorkAreaWidth / scaleFactor;
  const bounds = calculatePanelBounds(
    { x: 0, y: 0, width: dipWorkAreaWidth, height: 720 },
    true,
  );

  assert.equal(bounds.width, 538);
  assert.equal(Math.round(bounds.width * scaleFactor), 807);
  assert.equal(bounds.x, 742);
});

test('collapsed bounds move the full panel outside the work area', () => {
  const bounds = calculatePanelBounds({ x: 100, y: 40, width: 1280, height: 760 }, false);
  assert.deepEqual(bounds, { x: 1380, y: 40, width: 538, height: 760 });
});

test('adjacent displays use a centered short trigger on the shared seam', () => {
  const left = {
    id: 1,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1040 },
  };
  const right = {
    id: 2,
    bounds: { x: 1920, y: 0, width: 1920, height: 1080 },
    workArea: { x: 1920, y: 0, width: 1920, height: 1040 },
  };

  assert.equal(hasDisplayOnRight(left, [left, right]), true);
  assert.equal(hasDisplayOnRight(right, [left, right]), false);
  assert.deepEqual(calculateTriggerBounds(left, true), {
    x: 1908,
    y: 360,
    width: 12,
    height: 320,
  });
  assert.deepEqual(calculateTriggerBounds(right, false), {
    x: 3828,
    y: 0,
    width: 12,
    height: 1040,
  });
});

test('only the configured Windows primary display is selected for activation', () => {
  const displays = [
    { id: 10, bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    { id: 20, bounds: { x: 1920, y: 0, width: 1920, height: 1080 } },
  ];

  assert.equal(selectPrimaryDisplay(displays, 20), displays[1]);
  assert.equal(selectPrimaryDisplay(displays, 10), displays[0]);
  assert.equal(selectPrimaryDisplay(displays, 999), displays[0]);
  assert.equal(selectPrimaryDisplay([], 10), null);
});

test('shared-edge activation height is capped at the available work area', () => {
  const compactDisplay = {
    id: 1,
    bounds: { x: 0, y: 0, width: 800, height: 240 },
    workArea: { x: 0, y: 0, width: 800, height: 240 },
  };
  assert.deepEqual(calculateTriggerBounds(compactDisplay, true), {
    x: 788,
    y: 0,
    width: 12,
    height: 240,
  });
});
