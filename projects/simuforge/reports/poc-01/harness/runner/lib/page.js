'use strict';

// Page-level session helpers for the SP-05 harness.
//
// Responsibilities:
//   - reload the harness from disk and wait until it is actually ready
//   - capture console output and uncaught exceptions for the evidence record
//   - declare input provenance before any interaction
//   - click harness buttons with genuine CDP mouse input
//   - expose read-only snapshots and the harness input trace
//
// Buttons are clicked with Input.dispatchMouseEvent, never with element.click().
// The only JavaScript writes are the provenance declaration and (optionally) the
// observation note text, neither of which touches a transform.

const { sleep } = require('./cdp');
const gizmo = require('./gizmo');

const MODE_BUTTONS = {
  translate: 'btnTranslate',
  rotate: 'btnRotate',
  scale: 'btnScale'
};

const EXPECTED_SPACE = {
  translate: { key: 'positionSpaceWorld', value: true },
  rotate: { key: 'rotationSpaceWorld', value: true },
  scale: { key: 'scaleSpaceLocal', value: true }
};

class PageSession {
  constructor(cdp, { url, driver, sessionId, consoleAllowlist = [] } = {}) {
    this.cdp = cdp;
    this.url = url || null;
    this.driver = driver || 'simuforge-sp05-cdp-runner';
    this.sessionId = sessionId || null;
    this.consoleAllowlist = consoleAllowlist;
    this.console = [];
    this.exceptions = [];
    this.logEntries = [];
    this._listeners = [];
    this._armed = false;
  }

  async attach() {
    await this.cdp.send('Page.enable');
    await this.cdp.send('Runtime.enable');
    try {
      await this.cdp.send('Log.enable');
    } catch (_) {
      // Log domain is optional.
    }

    this._listeners.push(this.cdp.on('Runtime.consoleAPICalled', (params) => {
      this.console.push({
        kind: 'console',
        type: params.type,
        text: (params.args || []).map((arg) => {
          if (arg.value !== undefined) return String(arg.value);
          if (arg.description) return arg.description;
          return arg.type || '';
        }).join(' '),
        timestamp: new Date().toISOString()
      });
    }));

    this._listeners.push(this.cdp.on('Runtime.exceptionThrown', (params) => {
      const details = params.exceptionDetails || {};
      const exception = details.exception || {};
      this.exceptions.push({
        kind: 'exception',
        text: exception.description || details.text || 'uncaught exception',
        url: details.url || null,
        lineNumber: details.lineNumber,
        columnNumber: details.columnNumber,
        timestamp: new Date().toISOString()
      });
    }));

    this._listeners.push(this.cdp.on('Log.entryAdded', (params) => {
      const entry = params.entry || {};
      this.logEntries.push({
        kind: 'log',
        level: entry.level,
        source: entry.source,
        text: entry.text,
        url: entry.url || null,
        timestamp: new Date().toISOString()
      });
    }));

    this._armed = true;
    return this;
  }

  dispose() {
    for (const off of this._listeners) {
      try { off(); } catch (_) {}
    }
    this._listeners = [];
    this._armed = false;
  }

  async bringToFront() {
    try {
      await this.cdp.send('Page.bringToFront', {}, 8000);
    } catch (_) {
      // Some headless configurations do not support bringToFront.
    }
  }

  async reload({ timeoutMs = 30000 } = {}) {
    this.console = [];
    this.exceptions = [];
    this.logEntries = [];

    const loaded = this.cdp.waitForEvent('Page.loadEventFired', timeoutMs).catch(() => null);
    await this.cdp.send('Page.reload', { ignoreCache: true });
    await loaded;
    await this.waitReady({ timeoutMs });
    await this.bringToFront();
    await this.declareProvenance();
    await this.installLib();
    return this;
  }

  async waitReady({ timeoutMs = 30000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let lastError = null;
    while (Date.now() < deadline) {
      try {
        const ready = await this.cdp.evaluate(`(() => {
          if (!window.__simuforgeDiagnostics) return false;
          if (!window.BABYLON || !BABYLON.Engine.Instances.length) return false;
          const el = document.getElementById('iQlen');
          return !!(el && el.textContent && el.textContent !== '-');
        })()`, { timeoutMs: 4000 });
        if (ready) return true;
      } catch (err) {
        lastError = err;
      }
      await sleep(150);
    }
    throw new Error('Harness did not become ready within ' + timeoutMs + ' ms' + (lastError ? ': ' + lastError.message : ''));
  }

  async declareProvenance() {
    const declaration = {
      method: 'cdp_trusted_input',
      driver: this.driver,
      sessionId: this.sessionId,
      declaredAt: new Date().toISOString(),
      note: 'Browser-level trusted input via CDP Input.dispatchMouseEvent'
    };
    await this.cdp.evaluate('window.__simuforgeInputProvenance = ' + JSON.stringify(declaration) + '; true;');
    return declaration;
  }

  async installLib() {
    return gizmo.install(this.cdp);
  }

  async evaluate(expression, options) {
    return this.cdp.evaluate(expression, options);
  }

  // ---- genuine CDP mouse input -------------------------------------------

  async dispatchMouse(type, x, y, { button = 'none', buttons = 0, clickCount = 0, modifiers = 0 } = {}) {
    await this.cdp.send('Input.dispatchMouseEvent', {
      type,
      x,
      y,
      button,
      buttons,
      clickCount,
      modifiers,
      pointerType: 'mouse'
    });
  }

  async elementCenter(id) {
    const center = await this.cdp.evaluate(`(() => {
      const el = document.getElementById(${JSON.stringify(id)});
      if (!el) return null;
      // The panel scrolls: bring the control into view before reading its box.
      // Only the page's own scroll position changes; no input event is faked.
      if (el.scrollIntoView) el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height };
    })()`);
    if (!center) throw new Error('Element #' + id + ' is missing or has no layout box');
    await sleep(60);
    // Re-read after the scroll has been laid out.
    const settled = await this.cdp.evaluate(`(() => {
      const el = document.getElementById(${JSON.stringify(id)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height };
    })()`);
    return settled || center;
  }

  async click(id) {
    await this.bringToFront();
    const center = await this.elementCenter(id);
    await this.dispatchMouse('mouseMoved', center.x, center.y);
    await sleep(20);
    await this.dispatchMouse('mousePressed', center.x, center.y, { button: 'left', buttons: 1, clickCount: 1 });
    await sleep(30);
    await this.dispatchMouse('mouseReleased', center.x, center.y, { button: 'left', buttons: 0, clickCount: 1 });
    return center;
  }

  async typeInto(id, text) {
    await this.click(id);
    await this.cdp.send('Input.insertText', { text });
    return text;
  }

  // ---- harness operations ------------------------------------------------

  async snapshot() {
    return this.cdp.evaluate('window.__simuforgeDiagnostics.getSnapshot()');
  }

  async inputTrace() {
    return this.cdp.evaluate('window.__simuforgeDiagnostics.getInputTrace()');
  }

  // Screenshots should show the Inspector, not wherever the last button click
  // scrolled the panel. This only changes the page's own scroll position.
  async resetPanelScroll() {
    await this.cdp.evaluate("(() => { const p = document.getElementById('panel'); if (p) p.scrollTop = 0; return true; })()");
    await sleep(80);
  }

  async inspectorText() {    return this.cdp.evaluate(`(() => {
      const text = (id) => {
        const el = document.getElementById(id);
        return el ? el.textContent : null;
      };
      return {
        mode: text('iMode'),
        position: [text('iPx'), text('iPy'), text('iPz')],
        quaternion: [text('iQx'), text('iQy'), text('iQz'), text('iQw')],
        euler: [text('iEx'), text('iEy'), text('iEz')],
        scale: [text('iSx'), text('iSy'), text('iSz')],
        quaternionLength: text('iQlen'),
        quaternionValidation: text('qResult'),
        quaternionLengthDisplay: text('qLen'),
        quaternionDiff: text('qDiff'),
        quaternionFinite: text('qFinite'),
        scaleValidation: text('sResult'),
        scaleReason: text('sReason'),
        compare: text('cmpResult'),
        status: text('status')
      };
    })()`);
  }

  async setMode(mode) {
    const buttonId = MODE_BUTTONS[mode];
    if (!buttonId) throw new Error('Unknown mode: ' + mode);
    await this.click(buttonId);
    const deadline = Date.now() + 5000;
    let snap = null;
    while (Date.now() < deadline) {
      snap = await this.snapshot();
      if (snap.mode === mode && snap.gizmos) break;
      await sleep(80);
    }
    if (!snap || snap.mode !== mode) {
      throw new Error('Mode did not become "' + mode + '" after clicking #' + buttonId);
    }
    const expected = EXPECTED_SPACE[mode];
    const value = snap.gizmos[expected.key];
    if (value !== expected.value) {
      throw new Error('Gizmo space policy not applied for mode "' + mode + '": ' + expected.key + '=' + String(value));
    }
    await sleep(120);
    return snap;
  }

  async resetTransform() {
    await this.click('btnReset');
    await sleep(150);
    const snap = await this.snapshot();
    return snap;
  }

  async clearLog() {
    await this.click('btnClearLog');
    await sleep(80);
  }

  async captureState() {
    await this.click('btnCapture');
    await sleep(100);
  }

  async captureBaseline() {
    await this.click('btnBaseline');
    await sleep(100);
  }

  async captureFinal() {
    await this.click('btnFinal');
    await sleep(100);
  }

  async compareT05() {
    await this.click('btnCompare');
    await sleep(120);
    const text = await this.inspectorText();
    return text.compare;
  }

  async recordObservation(note) {
    if (note) await this.typeInto('note', note);
    await this.click('btnRecord');
    await sleep(120);
  }

  async exportJson() {
    await this.click('btnExport');
    const deadline = Date.now() + 5000;
    let status = null;
    while (Date.now() < deadline) {
      status = await this.evaluate("(document.getElementById('status') || {}).textContent || ''");
      if (typeof status === 'string' && status.indexOf('JSON exported') !== -1) return true;
      await sleep(60);
    }
    throw new Error('Export button did not report success; status=' + JSON.stringify(status));
  }

  // Errors that are not covered by the allowlist. A non-empty result must fail
  // the case: unexplained console noise is itself an SP-05 defect.
  unexpectedConsole() {
    const matches = (text) => this.consoleAllowlist.some((pattern) => pattern.test(text));
    const errors = [];
    for (const entry of this.console) {
      if (entry.type === 'error' || entry.type === 'assert') {
        if (!matches(entry.text)) errors.push(entry);
      }
    }
    for (const entry of this.logEntries) {
      if (entry.level === 'error') {
        if (!matches(entry.text)) errors.push(entry);
      }
    }
    for (const entry of this.exceptions) {
      if (!matches(entry.text)) errors.push(entry);
    }
    return errors;
  }

  consoleSummary() {
    const counts = {};
    for (const entry of this.console) counts[entry.type] = (counts[entry.type] || 0) + 1;
    return {
      counts,
      warnings: this.console.filter((entry) => entry.type === 'warning').map((entry) => entry.text),
      errors: this.unexpectedConsole(),
      total: this.console.length
    };
  }
}

async function attach(cdp, options) {
  const session = new PageSession(cdp, options);
  await session.attach();
  return session;
}

module.exports = {
  PageSession,
  attach,
  MODE_BUTTONS,
  EXPECTED_SPACE
};
