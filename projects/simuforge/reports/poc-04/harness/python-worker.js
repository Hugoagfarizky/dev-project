/* POC 4 worker: loads Pyodide and executes user-authored Python off the main thread. */

let pyodide = null;
let interruptView = null;

const MAX_RESULT_CHARS = 65536;

function truncate(text) {
  const value = String(text ?? '');
  if (value.length <= MAX_RESULT_CHARS) {
    return { value, truncated: false };
  }
  return { value: value.slice(0, MAX_RESULT_CHARS), truncated: true };
}

self.onmessage = async (event) => {
  const message = event.data;

  if (message.type === 'init') {
    try {
      const loadStart = performance.now();
      const pyodideModule = await import(message.pyodideUrl);
      const loadMs = performance.now() - loadStart;

      const initStart = performance.now();
      pyodide = await pyodideModule.loadPyodide({ indexURL: message.indexURL });

      if (message.interruptBuffer) {
        interruptView = new Int32Array(message.interruptBuffer);
        pyodide.setInterruptBuffer(interruptView);
      }

      self.postMessage({
        type: 'ready',
        loadMs,
        initMs: performance.now() - initStart,
        version: pyodide.version,
        crossOriginIsolated: self.crossOriginIsolated,
        interruptBufferAttached: Boolean(interruptView)
      });
    } catch (error) {
      self.postMessage({
        type: 'init-error',
        message: String(error && error.message ? error.message : error)
      });
    }
    return;
  }

  if (message.type === 'lockdown') {
    const blocked = [];
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'indexedDB', 'caches', 'importScripts']) {
      try {
        Object.defineProperty(self, name, { value: undefined, configurable: true, writable: true });
        blocked.push(name);
      } catch {
        // Ignore properties that cannot be shadowed.
      }
    }
    self.postMessage({ type: 'lockdown', blocked });
    return;
  }

  if (message.type === 'run') {
    if (!pyodide) {
      self.postMessage({
        type: 'error',
        id: message.id,
        name: 'RuntimeUnavailable',
        message: 'Python runtime is not initialized.',
        stack: '',
        ms: 0
      });
      return;
    }

    const started = performance.now();
    if (interruptView) {
      Atomics.store(interruptView, 0, 0);
    }
    try {
      const result = await pyodide.runPythonAsync(message.code);
      const { value, truncated } = truncate(result);
      self.postMessage({
        type: 'result',
        id: message.id,
        value,
        truncated,
        ms: performance.now() - started
      });
    } catch (error) {
      const { value: stack } = truncate(error && error.stack ? error.stack : '');
      self.postMessage({
        type: 'error',
        id: message.id,
        name: String(error && error.name ? error.name : 'Error'),
        message: String(error && error.message ? error.message : error),
        stack,
        ms: performance.now() - started
      });
    } finally {
      if (interruptView) {
        Atomics.store(interruptView, 0, 0);
      }
    }
  }
};
