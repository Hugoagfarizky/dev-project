import type {
  ExtensionHookPayload,
  ExtensionHookResultResponse,
  ExtensionLogLine,
  ExtensionModuleSpec,
  ExtensionOutputValue,
  ExtensionWorkerRequest,
  ExtensionWorkerResponse
} from '../protocol.ts';
import { EXTENSION_PROTOCOL_VERSION, sanitizeExtensionOutputs } from '../protocol.ts';
import type { ExtensionHook } from '../types.ts';

/**
 * Dedicated extension worker (D-P10-02).
 *
 * The worker is a defense-in-depth boundary, not a security sandbox. It keeps
 * extension code off the Studio main thread and bounds each hook by the host's
 * timeout. The host never trusts any message produced here.
 */

interface ModuleHooks {
  onPlay?: (payload: ExtensionHookPayload) => unknown;
  onTick?: (payload: ExtensionHookPayload) => unknown;
  onStop?: (payload: ExtensionHookPayload) => unknown;
  onReset?: (payload: ExtensionHookPayload) => unknown;
}

const scope = globalThis as unknown as {
  postMessage: (message: ExtensionWorkerResponse) => void;
  onmessage: ((event: MessageEvent<ExtensionWorkerRequest>) => void) | null;
};

let extensionId = '';
let declared: ExtensionModuleSpec[] = [];
const modules = new Map<string, ModuleHooks>();
let logs: ExtensionLogLine[] = [];
const MAX_LOGS = 20;

function post(message: ExtensionWorkerResponse): void {
  scope.postMessage(message);
}

function pushLog(level: ExtensionLogLine['level'], message: unknown): void {
  if (logs.length >= MAX_LOGS) return;
  logs.push({ level, message: String(message).slice(0, 2000) });
}

const safeConsole = {
  log: (...args: unknown[]) => pushLog('info', args.map(String).join(' ')),
  info: (...args: unknown[]) => pushLog('info', args.map(String).join(' ')),
  warn: (...args: unknown[]) => pushLog('warn', args.map(String).join(' ')),
  error: (...args: unknown[]) => pushLog('error', args.map(String).join(' '))
};

function registerModule(id: unknown, hooks: unknown): void {
  if (typeof id !== 'string' || typeof hooks !== 'object' || hooks === null) {
    throw new Error('registerModule(id, hooks) expects a string id and a hooks object.');
  }
  const spec = declared.find((item) => item.id === id);
  if (!spec) {
    throw new Error(`Module "${id}" was not declared in the extension manifest.`);
  }
  const candidate = hooks as Record<string, unknown>;
  const result: ModuleHooks = {};
  for (const hook of spec.hooks) {
    const fn = candidate[hook];
    if (fn !== undefined && typeof fn !== 'function') {
      throw new Error(`Module "${id}" hook "${hook}" must be a function.`);
    }
    if (typeof fn === 'function') {
      result[hook] = fn as (payload: ExtensionHookPayload) => unknown;
    }
  }
  modules.set(id, result);
}

function handleInit(request: Extract<ExtensionWorkerRequest, { type: 'init' }>): void {
  extensionId = request.extensionId;
  declared = request.modules;
  modules.clear();
  logs = [];
  try {
    const evaluate = new Function('registerModule', 'console', request.source);
    evaluate(registerModule, safeConsole);
    post({
      type: 'ready',
      protocolVersion: EXTENSION_PROTOCOL_VERSION,
      extensionId,
      modules: Array.from(modules.keys())
    });
  } catch (error) {
    post({
      type: 'init-error',
      protocolVersion: EXTENSION_PROTOCOL_VERSION,
      extensionId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

function runHook(hook: ExtensionHook, payload: ExtensionHookPayload): ExtensionHookResultResponse['outputs'] {
  const outputs: Record<string, ExtensionOutputValue> = {};
  for (const [moduleId, hooks] of modules) {
    const fn = hooks[hook];
    if (!fn) continue;
    try {
      const value = fn(payload);
      if (value !== undefined) {
        outputs[moduleId] = value as ExtensionOutputValue;
      }
    } catch (error) {
      pushLog('error', `Module "${moduleId}" ${hook} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return sanitizeExtensionOutputs(outputs);
}

function handleHook(request: Extract<ExtensionWorkerRequest, { type: 'hook' }>): void {
  logs = [];
  const outputs = runHook(request.hook, request.payload);
  post({
    type: 'hook-result',
    protocolVersion: EXTENSION_PROTOCOL_VERSION,
    requestId: request.requestId,
    ok: !logs.some((line) => line.level === 'error'),
    outputs,
    logs,
    error: logs.some((line) => line.level === 'error')
      ? { message: logs.filter((line) => line.level === 'error').map((line) => line.message).join(' ') }
      : null
  });
}

scope.onmessage = (event: MessageEvent<ExtensionWorkerRequest>) => {
  const request = event.data;
  if (!request || request.protocolVersion !== EXTENSION_PROTOCOL_VERSION) return;
  if (request.type === 'init') {
    handleInit(request);
    return;
  }
  if (request.type === 'hook') {
    handleHook(request);
  }
};
