'use strict';

// Genuine browser-level drag input.
//
// Every pointer event is produced by Input.dispatchMouseEvent. Nothing here
// writes a transform, calls a gizmo method, or constructs a PointerEvent.
// The returned record is the CDP-side half of the audit; the harness-side
// pointer trace is read separately from window.__simuforgeDiagnostics.

const { sleep } = require('./cdp');

function assertPoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error('Invalid ' + label + ' point: ' + JSON.stringify(point));
  }
}

async function trustedDrag(page, {
  from,
  to,
  label = 'drag',
  target = null,
  steps = 24,
  stepDelayMs = 12,
  hoverDelayMs = 50,
  pressDelayMs = 60,
  settleDelayMs = 120,
  releaseDelayMs = 80
} = {}) {
  assertPoint(from, 'start');
  assertPoint(to, 'end');
  if (!Number.isInteger(steps) || steps < 2) throw new Error('steps must be an integer >= 2');

  const startedAt = new Date();
  const startedMono = Date.now();
  const events = [];
  let index = 0;

  const emit = async (type, x, y, { button = 'none', buttons = 0, clickCount = 0 } = {}) => {
    const sentAt = new Date().toISOString();
    const offset = Date.now() - startedMono;
    await page.dispatchMouse(type, x, y, { button, buttons, clickCount });
    events.push({
      index: index++,
      type,
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      button,
      buttons,
      clickCount,
      sentAt,
      elapsedMs: offset
    });
  };

  // Hover first so the renderer has a current pointer position, then press.
  await emit('mouseMoved', from.x, from.y);
  await sleep(hoverDelayMs);
  await emit('mousePressed', from.x, from.y, { button: 'left', buttons: 1, clickCount: 1 });
  await sleep(pressDelayMs);

  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    await emit('mouseMoved', x, y, { button: 'none', buttons: 1 });
    if (stepDelayMs > 0) await sleep(stepDelayMs);
  }

  await sleep(settleDelayMs);
  await emit('mouseReleased', to.x, to.y, { button: 'left', buttons: 0, clickCount: 1 });
  await sleep(releaseDelayMs);

  const endedAt = new Date();
  return {
    label,
    target,
    from: { x: Number(from.x.toFixed(4)), y: Number(from.y.toFixed(4)) },
    to: { x: Number(to.x.toFixed(4)), y: Number(to.y.toFixed(4)) },
    distancePx: Number(Math.hypot(to.x - from.x, to.y - from.y).toFixed(4)),
    steps,
    stepDelayMs,
    eventCount: events.length,
    events,
    methods: {
      input: 'cdp_trusted_input',
      domain: 'Input',
      method: 'Input.dispatchMouseEvent',
      pointerType: 'mouse'
    },
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    wallClockMs: endedAt.getTime() - startedAt.getTime(),
    monotonicMs: Date.now() - startedMono
  };
}

// Compare the CDP event sequence against the harness-observed pointer trace.
// A mismatch means the browser did not deliver the input we think we sent.
function reconcile(dragRecord, harnessDrag) {
  const issues = [];
  if (!harnessDrag) {
    issues.push('harness recorded no drag for this interaction');
    return { ok: issues.length === 0, issues };
  }
  if (harnessDrag.pointerType !== 'mouse') {
    issues.push('harness pointerType is "' + harnessDrag.pointerType + '", expected "mouse"');
  }
  if (harnessDrag.allTrusted !== true) {
    issues.push('harness observed an untrusted pointer event in the drag');
  }
  if (!(harnessDrag.moveCount > 0)) {
    issues.push('harness observed no pointermove during the drag');
  }
  const dispatchedMoves = dragRecord.events.filter((event) => event.type === 'mouseMoved').length;
  // Chrome may emit additional trusted pointermove events (for example when
  // the button state changes) or coalesce several dispatches into one. Exact
  // one-to-one counts are therefore not required; losing most of the drag is.
  if (harnessDrag.moveCount < Math.floor(dispatchedMoves / 2)) {
    issues.push('harness observed only ' + harnessDrag.moveCount + ' pointermove events for ' + dispatchedMoves + ' dispatched moves');
  }
  const startX = Math.abs(harnessDrag.start.x - dragRecord.from.x);
  const startY = Math.abs(harnessDrag.start.y - dragRecord.from.y);
  if (startX > 2 || startY > 2) {
    issues.push('harness start (' + harnessDrag.start.x + ',' + harnessDrag.start.y + ') differs from dispatched start (' + dragRecord.from.x + ',' + dragRecord.from.y + ')');
  }
  const endX = Math.abs(harnessDrag.end.x - dragRecord.to.x);
  const endY = Math.abs(harnessDrag.end.y - dragRecord.to.y);
  if (endX > 2 || endY > 2) {
    issues.push('harness end (' + harnessDrag.end.x + ',' + harnessDrag.end.y + ') differs from dispatched end (' + dragRecord.to.x + ',' + dragRecord.to.y + ')');
  }
  return {
    ok: issues.length === 0,
    issues,
    observedMoves: harnessDrag.moveCount,
    dispatchedMoves,
    extraObservedMoves: Math.max(0, harnessDrag.moveCount - dispatchedMoves)
  };
}

module.exports = {
  trustedDrag,
  reconcile
};
