import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PythonRuntime } from '../../src/python/runtime.ts';
import { PYTHON_CODES } from '../../src/python/types.ts';
import type { PythonWorkerResponse } from '../../src/python/protocol.ts';

type Listener = (event: { data: PythonWorkerResponse }) => void;

class FakeWorker {
  onmessage: Listener | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  readonly posted: Array<Record<string, unknown>> = [];
  terminations = 0;

  postMessage(message: Record<string, unknown>): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminations += 1;
  }

  emit(message: PythonWorkerResponse): void {
    this.onmessage?.({ data: message });
  }

  lastOfType(type: string): Record<string, unknown> | undefined {
    return [...this.posted].reverse().find((message) => message.type === type);
  }
}

function readyResponse(): PythonWorkerResponse {
  return { type: 'ready', protocolVersion: 1, version: '314.0.8', loadMs: 1, initMs: 1, hardened: [] };
}

const SNAPSHOT = { entities: [], time: 0, dt: 1 / 60 };

/** Lets the async `run` reach the point where it posts to the worker. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

interface RuntimeOptions {
  timeoutMs?: number;
  interruptGraceMs?: number;
  restartMax?: number;
  restartWindowMs?: number;
  isCrossOriginIsolated?: () => boolean;
}

async function createReadyRuntime(options: RuntimeOptions = {}) {
  const worker = new FakeWorker();
  const statuses: string[] = [];
  let clock = 1_000;
  const runtime = new PythonRuntime({
    createWorker: () => worker as unknown as Worker,
    now: () => clock,
    onStatus: (status) => statuses.push(status),
    isCrossOriginIsolated: () => false,
    ...options
  });
  const ready = runtime.ensureReady();
  worker.emit(readyResponse());
  await ready;
  return {
    runtime,
    worker,
    statuses,
    advance: (ms: number) => {
      clock += ms;
    }
  };
}

function successResponse(requestId: string, actions: unknown, logs: unknown): PythonWorkerResponse {
  return {
    type: 'result',
    protocolVersion: 1,
    requestId,
    ok: true,
    actions,
    logs,
    durationMs: 3,
    truncated: false
  };
}

test('initializes with the pinned self-hosted Pyodide paths', async () => {
  const { worker, statuses } = await createReadyRuntime();
  const init = worker.lastOfType('init');
  assert.ok(init);
  assert.equal(init.pyodideUrl, '/pyodide/pyodide.mjs');
  assert.equal(init.indexUrl, '/pyodide/');
  assert.equal(init.interruptBuffer, null);
  assert.deepEqual(statuses, ['loading', 'ready']);
});

test('runs a script and sanitizes untrusted actions and logs', async () => {
  const { runtime, worker } = await createReadyRuntime();
  const outcomePromise = runtime.run('world.log("x")', SNAPSHOT);
  await tick();
  const run = worker.lastOfType('run');
  assert.ok(run);
  worker.emit(
    successResponse(
      String(run.requestId),
      [
        { type: 'applyImpulse', entityId: 'e1', vector: [1, 2, 3] },
        { type: 'applyForce', entityId: 'e2', vector: [1, 2] },
        { type: 'unknown', entityId: 'e3' }
      ],
      [{ level: 'info', message: 'hello' }]
    )
  );
  const outcome = await outcomePromise;
  assert.ok(outcome.ok);
  assert.deepEqual(outcome.actions, [{ type: 'applyImpulse', entityId: 'e1', vector: { x: 1, y: 2, z: 3 } }]);
  assert.equal(outcome.logs[0]?.message, 'hello');
  assert.equal(runtime.getStatus(), 'ready');
});

test('ignores a worker response for a different request id', async () => {
  const { runtime, worker } = await createReadyRuntime();
  const outcomePromise = runtime.run('world.log("x")', SNAPSHOT);
  await tick();
  const run = worker.lastOfType('run');
  assert.ok(run);

  let settled = false;
  void outcomePromise.then(() => {
    settled = true;
  });
  worker.emit(successResponse('forged-request', [{ type: 'applyImpulse', entityId: 'e1', vector: [1, 0, 0] }], []));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(settled, false);

  worker.emit(successResponse(String(run.requestId), [], []));
  const outcome = await outcomePromise;
  assert.ok(outcome.ok);
  assert.deepEqual(outcome.actions, []);
});

test('enforces the timeout budget by terminating the worker', async () => {
  const { runtime, worker } = await createReadyRuntime({ timeoutMs: 20 });
  const outcome = await runtime.run('while True: pass', SNAPSHOT);
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, PYTHON_CODES.TIMEOUT);
    assert.match(outcome.error.message, /execution budget/);
  }
  assert.equal(worker.terminations, 1);
  assert.equal(runtime.getStatus(), 'timeout');
});

test('budgets hard restarts inside the window', async () => {
  const { runtime, worker } = await createReadyRuntime({ timeoutMs: 10, restartMax: 1 });
  const outcome = await runtime.run('while True: pass', SNAPSHOT);
  assert.equal(outcome.ok, false);
  assert.equal(worker.terminations, 1);

  await assert.rejects(() => runtime.ensureReady(), /restarted 1 times/);
  assert.equal(runtime.getStatus(), 'error');
});

test('cancel terminates the worker and resolves as cancelled', async () => {
  const { runtime, worker } = await createReadyRuntime();
  const outcomePromise = runtime.run('while True: pass', SNAPSHOT);
  await tick();
  runtime.cancel();
  const outcome = await outcomePromise;
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, PYTHON_CODES.CANCELLED);
  }
  assert.equal(worker.terminations, 1);
  assert.equal(runtime.getStatus(), 'ready');
});

test('interrupts through the shared buffer without terminating', async () => {
  const { runtime, worker } = await createReadyRuntime({ isCrossOriginIsolated: () => true });
  const init = worker.lastOfType('init');
  assert.ok(init?.interruptBuffer instanceof SharedArrayBuffer);
  assert.equal(runtime.hasInterruptSupport(), true);

  const outcomePromise = runtime.run('while True: pass', SNAPSHOT);
  await tick();
  const run = worker.lastOfType('run');
  assert.ok(run);
  runtime.cancel();
  worker.emit({
    type: 'result',
    protocolVersion: 1,
    requestId: String(run.requestId),
    ok: false,
    name: 'PythonError',
    message: 'KeyboardInterrupt: cancelled',
    traceback: '',
    durationMs: 1,
    logs: []
  });
  const outcome = await outcomePromise;
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, PYTHON_CODES.CANCELLED);
  }
  assert.equal(worker.terminations, 0);
  assert.equal(runtime.getStatus(), 'ready');
});

test('reports the timeout reason when the interrupt path answers with KeyboardInterrupt', async () => {
  const { runtime, worker } = await createReadyRuntime({ timeoutMs: 10, isCrossOriginIsolated: () => true });
  const outcomePromise = runtime.run('while True: pass', SNAPSHOT);
  await tick();
  const run = worker.lastOfType('run');
  assert.ok(run);

  // Let the runtime's timeout timer fire and request an interrupt.
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(runtime.getStatus(), 'timeout');

  worker.emit({
    type: 'result',
    protocolVersion: 1,
    requestId: String(run.requestId),
    ok: false,
    name: 'KeyboardInterrupt',
    message: 'KeyboardInterrupt',
    traceback: 'KeyboardInterrupt',
    durationMs: 12,
    logs: []
  });

  const outcome = await outcomePromise;
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, PYTHON_CODES.TIMEOUT);
    assert.match(outcome.error.message, /execution budget/);
  }
  assert.equal(worker.terminations, 0);
  assert.equal(runtime.getStatus(), 'timeout');
});

test('dispose terminates the worker and rejects later use', async () => {
  const { runtime, worker } = await createReadyRuntime();
  const outcomePromise = runtime.run('world.log("x")', SNAPSHOT);
  await tick();
  runtime.dispose();
  const outcome = await outcomePromise;
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, PYTHON_CODES.CANCELLED);
  }
  assert.equal(worker.terminations, 1);
  assert.equal(runtime.getStatus(), 'idle');
  await assert.rejects(() => runtime.ensureReady(), /disposed/);
});

test('refuses a concurrent invocation', async () => {
  const { runtime, worker } = await createReadyRuntime();
  const first = runtime.run('world.log("first")', SNAPSHOT);
  const second = await runtime.run('world.log("second")', SNAPSHOT);
  assert.equal(second.ok, false);
  if (!second.ok) {
    assert.equal(second.code, PYTHON_CODES.UNAVAILABLE);
    assert.match(second.error.message, /still running/);
  }
  const run = worker.lastOfType('run');
  assert.ok(run);
  worker.emit(successResponse(String(run.requestId), [], []));
  assert.ok((await first).ok);
});

test('reports a script failure with a parsed error and error status', async () => {
  const { runtime, worker } = await createReadyRuntime();
  const outcomePromise = runtime.run('1/0', SNAPSHOT);
  await tick();
  const run = worker.lastOfType('run');
  assert.ok(run);
  worker.emit({
    type: 'result',
    protocolVersion: 1,
    requestId: String(run.requestId),
    ok: false,
    name: 'ZeroDivisionError',
    message: 'Traceback (most recent call last):\n  File "<exec>", line 3, in <module>\nZeroDivisionError: division by zero',
    traceback: '',
    durationMs: 1,
    logs: []
  });
  const outcome = await outcomePromise;
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.code, PYTHON_CODES.FAILED);
    assert.equal(outcome.error.line, 3);
    assert.match(outcome.error.message, /ZeroDivisionError/);
  }
  assert.equal(runtime.getStatus(), 'error');
});

test('surfaces capability probe results', async () => {
  const { runtime, worker } = await createReadyRuntime();
  const probe = runtime.probeCapabilities();
  await tick();
  const request = worker.lastOfType('probe');
  assert.ok(request);
  worker.emit({
    type: 'probe-result',
    protocolVersion: 1,
    before: { fetch: true, WebSocket: true },
    after: { fetch: false, WebSocket: false }
  });
  assert.deepEqual(await probe, {
    before: { fetch: true, WebSocket: true },
    after: { fetch: false, WebSocket: false }
  });
});

test('rejects initialization when the worker reports an init error', async () => {
  const worker = new FakeWorker();
  const runtime = new PythonRuntime({
    createWorker: () => worker as unknown as Worker,
    isCrossOriginIsolated: () => false
  });
  const ready = runtime.ensureReady();
  worker.emit({ type: 'init-error', message: 'boom-init' });
  await assert.rejects(ready, /boom-init/);
  assert.equal(runtime.getStatus(), 'error');
  assert.equal(worker.terminations, 1);
});
