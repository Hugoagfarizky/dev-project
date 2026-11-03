'use strict';

// Minimal Chrome DevTools Protocol client. No third-party dependencies.
// Requires Node.js >= 22 (global WebSocket and fetch).

const DEFAULT_TIMEOUT_MS = 20000;

class CdpError extends Error {
  constructor(message, method) {
    super(message);
    this.name = 'CdpError';
    this.method = method || null;
  }
}

class CDP {
  constructor(ws, targetInfo) {
    this.ws = ws;
    this.target = targetInfo || null;
    this._nextId = 1;
    this._pending = new Map();
    this._listeners = new Map();
    this._closed = false;

    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (_) {
        return;
      }
      if (msg.id != null) {
        const pending = this._pending.get(msg.id);
        if (!pending) return;
        this._pending.delete(msg.id);
        clearTimeout(pending.timer);
        if (msg.error) {
          pending.reject(new CdpError(msg.error.message + ' (' + pending.method + ')', pending.method));
        } else {
          pending.resolve(msg.result);
        }
        return;
      }
      if (msg.method) {
        const handlers = this._listeners.get(msg.method);
        if (handlers) {
          for (const handler of handlers) {
            try {
              handler(msg.params, msg);
            } catch (err) {
              // A listener must never break the protocol loop.
              process.emitWarning('CDP listener failed for ' + msg.method + ': ' + err.message);
            }
          }
        }
      }
    });

    ws.addEventListener('close', () => {
      this._closed = true;
      for (const pending of this._pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new CdpError('WebSocket closed', pending.method));
      }
      this._pending.clear();
    });
  }

  get closed() {
    return this._closed;
  }

  send(method, params = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (this._closed) return Promise.reject(new CdpError('WebSocket is closed', method));
    const id = this._nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(new CdpError('Timed out after ' + timeoutMs + ' ms (' + method + ')', method));
      }, timeoutMs);
      this._pending.set(id, { resolve, reject, method, timer });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        this._pending.delete(id);
        reject(new CdpError('Send failed: ' + err.message, method));
      }
    });
  }

  on(method, handler) {
    if (!this._listeners.has(method)) this._listeners.set(method, []);
    this._listeners.get(method).push(handler);
    return () => this.off(method, handler);
  }

  off(method, handler) {
    const handlers = this._listeners.get(method);
    if (!handlers) return;
    const index = handlers.indexOf(handler);
    if (index !== -1) handlers.splice(index, 1);
  }

  async evaluate(expression, { awaitPromise = true, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise,
      userGesture: false
    }, timeoutMs);
    if (result.exceptionDetails) {
      const details = result.exceptionDetails;
      const description = (details.exception && details.exception.description) || details.text || 'unknown evaluation error';
      throw new CdpError('Evaluation failed: ' + description, 'Runtime.evaluate');
    }
    return result.result ? result.result.value : undefined;
  }

  async waitForEvent(method, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(method, onEvent);
        reject(new CdpError('Timed out waiting for ' + method, method));
      }, timeoutMs);
      const onEvent = (params) => {
        clearTimeout(timer);
        this.off(method, onEvent);
        resolve(params);
      };
      this.on(method, onEvent);
    });
  }

  close() {
    try {
      this.ws.close();
    } catch (_) {
      // ignore
    }
  }
}

async function getJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new CdpError('HTTP ' + response.status + ' from ' + url);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getVersion(port) {
  return getJson('http://127.0.0.1:' + port + '/json/version');
}

async function listTargets(port) {
  return getJson('http://127.0.0.1:' + port + '/json/list');
}

async function waitForVersion(port, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      return await getVersion(port);
    } catch (err) {
      lastError = err;
      await sleep(250);
    }
  }
  throw new CdpError('CDP endpoint did not become ready on port ' + port + ': ' + (lastError && lastError.message));
}

async function connectToPage(port, urlMatch, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  let target = null;
  while (Date.now() < deadline) {
    try {
      const targets = await listTargets(port);
      target = targets.find((t) => t.type === 'page' && (t.url || '').includes(urlMatch))
        || targets.find((t) => t.type === 'page');
      if (target && target.webSocketDebuggerUrl) break;
    } catch (_) {
      // endpoint not ready yet
    }
    await sleep(250);
  }
  if (!target || !target.webSocketDebuggerUrl) {
    throw new CdpError('No page target available for "' + urlMatch + '" on port ' + port);
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new CdpError('WebSocket open timed out')), 12000);
    ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    ws.addEventListener('error', (event) => {
      clearTimeout(timer);
      reject(new CdpError('WebSocket error: ' + (event && event.message ? event.message : 'unknown')));
    }, { once: true });
  });
  return new CDP(ws, target);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  CDP,
  CdpError,
  getVersion,
  listTargets,
  waitForVersion,
  connectToPage,
  sleep
};
