import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXTENSION_CODES,
  EXTENSION_DOCUMENT_VERSION,
  EXTENSION_FORMAT,
  createEmptyExtensionDocument
} from '../../src/extensions/types.ts';
import type { ExtensionEntry, ExtensionManifest } from '../../src/extensions/types.ts';
import {
  EXTENSION_SOURCE_MAX_CHARS,
  validateExtensionDocument,
  validateExtensionEntry,
  validateManifest
} from '../../src/extensions/validation.ts';
import { hasPermission, permissionsFor } from '../../src/extensions/permissions.ts';
import {
  EXTENSION_PROTOCOL_VERSION,
  sanitizeExtensionOutputs,
  validateWorkerResponse
} from '../../src/extensions/protocol.ts';
import type {
  ExtensionHookPayload,
  ExtensionHookRequest,
  ExtensionWorkerRequest,
  ExtensionWorkerResponse
} from '../../src/extensions/protocol.ts';
import { ExtensionHost } from '../../src/extensions/host.ts';
import type { ExtensionWorkerLike } from '../../src/extensions/host.ts';
import {
  ExtensionRegistry,
  extensionOwnerOfComponentType,
  registerExtensionComponents,
  resetExtensionComponents,
  unregisterExtensionComponents
} from '../../src/extensions/registry.ts';
import {
  getComponentDefinition,
  isDynamicComponentType,
  resetDynamicComponentDefinitions
} from '../../src/world/components.ts';
import { parseProjectDocument } from '../../src/project/serialization.ts';
import { createEmptyWorld, createWorldEntity } from '../../src/world/defaults.ts';
import { buildExecutionPlan, executeChain } from '../../src/runtime/graphExecution.ts';
import type { Graph, GraphNode } from '../../src/graph/types.ts';
import { reduceStudioState, type ReducerContext } from '../../src/editor/reducer.ts';
import {
  createDefaultEditorState,
  createDefaultExtensionState,
  createDefaultPersistenceState,
  createDefaultRuntimeState
} from '../../src/editor/state.ts';
import type { StudioState } from '../../src/editor/state.ts';

const EXT_ID = '3f2a9c1e-8b4d-4f6a-9c2e-1d7b5a3f9e01';
const OTHER_ID = '6b1d8f4a-2c3e-4a5b-8d7f-9e0a1b2c3d4e';
const COMPONENT_ID = '22222222-2222-4222-8222-222222222222';
const ENTITY_ID = '11111111-1111-4111-8111-111111111111';

const BASE_MANIFEST: ExtensionManifest = {
  id: EXT_ID,
  name: 'Test Extension',
  version: '1.0.0',
  apiVersion: 1,
  components: [{ type: 'testComponent', label: 'Test Component', defaultConfig: { gain: 2 } }],
  modules: [{ id: 'module', hooks: ['onTick'] }],
  permissions: ['run:simulation-hooks']
};

function entry(overrides: Partial<ExtensionEntry> = {}): ExtensionEntry {
  return {
    manifest: BASE_MANIFEST,
    source: "registerModule('module', { onTick() { return 1; } });",
    enabled: true,
    ...overrides
  };
}

beforeEach(() => {
  resetDynamicComponentDefinitions();
  resetExtensionComponents();
});

afterEach(() => {
  resetDynamicComponentDefinitions();
  resetExtensionComponents();
});

// --- manifest / document validation ---------------------------------------

test('manifest validation accepts a well-formed extension', () => {
  const result = validateManifest(BASE_MANIFEST);
  assert.equal(result.ok, true);
  assert.equal(result.manifest?.id, EXT_ID);
  assert.equal(result.manifest?.apiVersion, 1);
});

test('manifest validation rejects a non-UUID id and unknown permissions', () => {
  const badId = validateManifest({ ...BASE_MANIFEST, id: 'not-a-uuid' });
  assert.equal(badId.ok, false);
  assert.match(badId.errors.join(' '), /UUID/);

  const badPermission = validateManifest({ ...BASE_MANIFEST, permissions: ['run:simulation-hooks', 'root'] });
  assert.equal(badPermission.ok, false);
  assert.match(badPermission.errors.join(' '), /Unknown permission/);
});

test('modules require run:simulation-hooks', () => {
  const result = validateManifest({ ...BASE_MANIFEST, permissions: ['read:world'] });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /run:simulation-hooks/);
});

test('manifest validation rejects reserved component types and duplicates', () => {
  const reserved = validateManifest({
    ...BASE_MANIFEST,
    components: [{ type: 'rigidBody', label: 'Fake' }]
  });
  assert.equal(reserved.ok, false);
  assert.match(reserved.errors.join(' '), /reserved/);

  const duplicate = validateManifest({
    ...BASE_MANIFEST,
    components: [
      { type: 'dup', label: 'One' },
      { type: 'dup', label: 'Two' }
    ]
  });
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.errors.join(' '), /more than once/);
});

test('entry validation enforces the source size limit', () => {
  const tooLarge = validateExtensionEntry({
    ...entry(),
    source: 'x'.repeat(EXTENSION_SOURCE_MAX_CHARS + 1)
  });
  assert.equal(tooLarge.ok, false);
  assert.match(tooLarge.errors.join(' '), /limit/);
});

test('document validation strips invalid entries and collects component types', () => {
  const result = validateExtensionDocument({
    format: EXTENSION_FORMAT,
    version: EXTENSION_DOCUMENT_VERSION,
    entries: [
      entry(),
      { manifest: { ...BASE_MANIFEST, id: 'bad' }, source: '', enabled: true },
      entry({ manifest: { ...BASE_MANIFEST, id: OTHER_ID, components: [] } })
    ]
  });
  assert.equal(result.value.entries.length, 2);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0] ?? '', /INVALID_EXTENSION/);
  assert.equal(result.knownComponentTypes.has('testComponent'), true);
});

test('document validation warns when two extensions declare the same component type', () => {
  const result = validateExtensionDocument({
    format: EXTENSION_FORMAT,
    version: EXTENSION_DOCUMENT_VERSION,
    entries: [entry(), entry({ manifest: { ...BASE_MANIFEST, id: OTHER_ID } })]
  });
  assert.equal(result.value.entries.length, 2);
  assert.equal(
    result.warnings.some((warning) => warning.includes('already provided by another extension')),
    true
  );
  assert.equal(result.knownComponentTypes.has('testComponent'), true);
});

test('an absent extension document normalizes to an empty document', () => {
  const result = validateExtensionDocument(undefined);
  assert.deepEqual(result.value, createEmptyExtensionDocument());
});

// --- permissions ----------------------------------------------------------

test('permissions are deduplicated and checked host-side', () => {
  const manifest: ExtensionManifest = {
    ...BASE_MANIFEST,
    permissions: ['read:world', 'read:world', 'run:simulation-hooks']
  };
  assert.deepEqual(permissionsFor(manifest), ['read:world', 'run:simulation-hooks']);
  assert.equal(hasPermission(manifest, 'read:world'), true);
  assert.equal(hasPermission(manifest, 'write:components'), false);
});

// --- protocol -------------------------------------------------------------

test('worker responses are versioned and sanitized', () => {
  const valid = validateWorkerResponse({
    type: 'hook-result',
    protocolVersion: EXTENSION_PROTOCOL_VERSION,
    requestId: 'r1',
    ok: true,
    outputs: { value: 3, nested: { bad: true }, label: 'ok' },
    logs: [{ level: 'info', message: 'hello' }, { level: 'bogus', message: 'drop' }],
    error: null
  });
  assert.ok(valid && valid.type === 'hook-result');
  assert.deepEqual(valid.outputs, { value: 3, label: 'ok' });
  assert.equal(valid.logs.length, 1);

  assert.equal(
    validateWorkerResponse({ type: 'hook-result', protocolVersion: 999, requestId: 'r1', ok: true }),
    null
  );
});

test('non-finite and non-primitive outputs are dropped', () => {
  assert.deepEqual(
    sanitizeExtensionOutputs({ a: Number.POSITIVE_INFINITY, b: null, c: true, d: [1], e: 'x' }),
    { b: null, c: true, e: 'x' }
  );
});

// --- registry -------------------------------------------------------------

test('extension registry registers and unregisters component definitions', () => {
  const registered = registerExtensionComponents(BASE_MANIFEST);
  assert.deepEqual(registered, ['testComponent']);
  assert.equal(isDynamicComponentType('testComponent'), true);
  assert.equal(getComponentDefinition('testComponent')?.category, 'extension');
  assert.equal(extensionOwnerOfComponentType('testComponent'), EXT_ID);

  unregisterExtensionComponents(EXT_ID);
  assert.equal(isDynamicComponentType('testComponent'), false);
  assert.equal(extensionOwnerOfComponentType('testComponent'), null);
});

test('registry class tracks extension status and enablement', () => {
  const registry = new ExtensionRegistry();
  const loaded = registry.register(entry());
  assert.equal(loaded.status, 'loaded');
  assert.equal(registry.list().length, 1);
  registry.setEnabled(EXT_ID, false);
  assert.equal(registry.get(EXT_ID)?.enabled, false);
  registry.unregister(EXT_ID);
  assert.equal(registry.list().length, 0);
  assert.equal(isDynamicComponentType('testComponent'), false);
});

// --- worker host ----------------------------------------------------------

type WorkerBehavior = 'ready' | 'init-error' | 'crash' | 'crash-hook' | 'silent' | 'invalid';

class FakeWorker implements ExtensionWorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  terminated = false;
  readonly sent: ExtensionWorkerRequest[] = [];
  private readonly behavior: WorkerBehavior;
  private readonly hookOutputs: Record<string, number>;

  constructor(behavior: WorkerBehavior, hookOutputs: Record<string, number> = {}) {
    this.behavior = behavior;
    this.hookOutputs = hookOutputs;
  }

  postMessage(message: ExtensionWorkerRequest): void {
    this.sent.push(message);
    if (message.type === 'init') {
      if (this.behavior === 'ready' || this.behavior === 'silent' || this.behavior === 'crash-hook') {
        this.reply({
          type: 'ready',
          protocolVersion: EXTENSION_PROTOCOL_VERSION,
          extensionId: message.extensionId,
          modules: message.modules.map((module) => module.id)
        } satisfies ExtensionWorkerResponse);
      } else if (this.behavior === 'init-error') {
        this.reply({
          type: 'init-error',
          protocolVersion: EXTENSION_PROTOCOL_VERSION,
          extensionId: message.extensionId,
          message: 'init failed'
        } satisfies ExtensionWorkerResponse);
      } else if (this.behavior === 'crash') {
        this.onerror?.({ message: 'worker crashed' });
      } else {
        this.reply({ type: 'unexpected' });
      }
      return;
    }
    if (this.behavior === 'crash-hook') {
      this.onerror?.({ message: 'worker crashed during hook' });
      return;
    }
    if (this.behavior === 'silent') {
      return;
    }
    if (this.behavior === 'invalid') {
      this.reply({ type: 'hook-result', protocolVersion: EXTENSION_PROTOCOL_VERSION });
      return;
    }
    this.reply({
      type: 'hook-result',
      protocolVersion: EXTENSION_PROTOCOL_VERSION,
      requestId: message.requestId,
      ok: true,
      outputs: this.hookOutputs,
      logs: [],
      error: null
    } satisfies ExtensionWorkerResponse);
  }

  terminate(): void {
    this.terminated = true;
  }

  private reply(data: unknown): void {
    this.onmessage?.({ data });
  }
}

function hostWith(worker: FakeWorker, diagnostics: string[] = []): ExtensionHost {
  return new ExtensionHost({
    createWorker: () => worker,
    timeoutMs: 50,
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic.code)
  });
}

test('host starts one worker per enabled module extension and runs hooks', async () => {
  const worker = new FakeWorker('ready', { module: 0.5 });
  const host = hostWith(worker);
  try {
    const sync = await host.sync([entry()]);
    assert.equal(sync.states.length, 1);
    assert.equal(sync.states[0]?.status, 'ready');
    assert.deepEqual(sync.states[0]?.modules, ['module']);

    const payload: ExtensionHookPayload = { time: 1, dt: 1 / 60, entities: [], values: {} };
    const result = await host.runHook('onTick', payload);
    assert.equal(result.ran, true);
    assert.deepEqual(result.outputs, { [`${EXT_ID}:module`]: 0.5 });
  } finally {
    host.dispose();
  }
});

test('host does not start disabled or module-less extensions', async () => {
  const host = hostWith(new FakeWorker('ready'));
  try {
    const sync = await host.sync([
      entry({ enabled: false }),
      entry({ manifest: { ...BASE_MANIFEST, id: OTHER_ID, modules: [] }, enabled: true })
    ]);
    assert.equal(sync.states.length, 0);
    assert.equal((await host.runHook('onTick', { time: 0, dt: 0 })).ran, false);
  } finally {
    host.dispose();
  }
});

test('host enforces read:world by stripping entities from the payload', async () => {
  const worker = new FakeWorker('ready');
  const host = hostWith(worker);
  try {
    await host.sync([entry()]);
    await host.runHook('onTick', {
      time: 1,
      dt: 0.1,
      entities: [{ id: 'e', name: 'E', position: { x: 0, y: 0, z: 0 } }],
      values: { c: 1 }
    });
    const hook = worker.sent.find(
      (message): message is ExtensionHookRequest => message.type === 'hook'
    );
    assert.ok(hook);
    assert.equal(hook.payload.entities, undefined);
    assert.equal(hook.payload.values, undefined);
  } finally {
    host.dispose();
  }
});

test('host passes world data when read:world is declared', async () => {
  const worker = new FakeWorker('ready');
  const host = hostWith(worker);
  const manifest: ExtensionManifest = {
    ...BASE_MANIFEST,
    permissions: ['run:simulation-hooks', 'read:world']
  };
  try {
    await host.sync([entry({ manifest })]);
    await host.runHook('onTick', {
      time: 1,
      dt: 0.1,
      entities: [{ id: 'e', name: 'E', position: { x: 0, y: 0, z: 0 } }]
    });
    const hook = worker.sent.find(
      (message): message is ExtensionHookRequest => message.type === 'hook'
    );
    assert.ok(hook);
    assert.equal(hook.payload.entities?.length, 1);
  } finally {
    host.dispose();
  }
});

test('a hung worker is terminated and reported as a timeout', async () => {
  const worker = new FakeWorker('silent');
  const host = new ExtensionHost({ createWorker: () => worker, timeoutMs: 20 });
  try {
    await host.sync([entry()]);
    const result = await host.runHook('onTick', { time: 0, dt: 0 });
    assert.equal(result.ran, true);
    assert.equal(worker.terminated, true);
    assert.ok(result.diagnostics.some((item) => item.code === EXTENSION_CODES.WORKER_TIMEOUT));
  } finally {
    host.dispose();
  }
});

test('an init error is surfaced and the worker is not used for hooks', async () => {
  const worker = new FakeWorker('init-error');
  const host = hostWith(worker);
  try {
    const sync = await host.sync([entry()]);
    assert.equal(sync.states[0]?.status, 'error');
    assert.ok(sync.diagnostics.some((item) => item.code === EXTENSION_CODES.WORKER_FAILED));
    assert.equal((await host.runHook('onTick', { time: 0, dt: 0 })).ran, false);
  } finally {
    host.dispose();
  }
});

test('a crashed worker is reported and terminated', async () => {
  const worker = new FakeWorker('crash');
  const host = hostWith(worker);
  try {
    const sync = await host.sync([entry()]);
    assert.equal(sync.states[0]?.status, 'error');
    assert.ok(sync.diagnostics.some((item) => item.code === EXTENSION_CODES.WORKER_FAILED));
  } finally {
    host.dispose();
  }
});

test('a worker crash during a hook is a fatal diagnostic, not a warning', async () => {
  const worker = new FakeWorker('crash-hook');
  const host = hostWith(worker);
  try {
    await host.sync([entry()]);
    const result = await host.runHook('onTick', { time: 1, dt: 1 / 60 });
    assert.equal(result.ran, true);
    assert.equal(worker.terminated, true);
    const failure = result.diagnostics.find(
      (item) => item.code === EXTENSION_CODES.WORKER_FAILED
    );
    assert.ok(failure);
    assert.equal(failure.severity, 'error');
  } finally {
    host.dispose();
  }
});

// --- project integration --------------------------------------------------

function projectWithExtensions(extensions?: unknown) {
  const world = createEmptyWorld();
  const entity = createWorldEntity('cube', ENTITY_ID, 'Box');
  entity.components = [
    { id: COMPONENT_ID, type: 'testComponent', enabled: true, gain: 2 }
  ] as unknown as typeof entity.components;
  world.entities = [entity];
  return {
    format: 'simuforge.project',
    schemaVersion: 1,
    project: {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Extension Project',
      createdAt: '2026-11-19T00:00:00.000Z',
      updatedAt: '2026-11-19T00:00:00.000Z'
    },
    world,
    ...(extensions === undefined ? {} : { extensions })
  };
}

test('project validation accepts extension components when the extension is present', () => {
  const document = projectWithExtensions({
    format: EXTENSION_FORMAT,
    version: EXTENSION_DOCUMENT_VERSION,
    entries: [entry()]
  });
  const result = parseProjectDocument(JSON.stringify(document));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.extensions?.entries.length, 1);
    assert.equal(
      result.warnings?.some((warning) => warning.includes('UNKNOWN_COMPONENT_TYPE')) ?? false,
      false
    );
  }
});

test('unknown extension component types degrade with a warning, not a failure', () => {
  const document = projectWithExtensions();
  const result = parseProjectDocument(JSON.stringify(document));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.world.entities[0]?.components[0]?.type, 'testComponent');
    assert.equal(
      result.warnings?.some((warning) => warning.includes('UNKNOWN_COMPONENT_TYPE')) ?? false,
      true
    );
  }
});

// --- reducer integration --------------------------------------------------

function studioState(): StudioState {
  return {
    project: {
      format: 'simuforge.project',
      schemaVersion: 1,
      project: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Test',
        createdAt: '2026-11-06T00:00:00.000Z',
        updatedAt: '2026-11-06T00:00:00.000Z'
      },
      world: { format: 'simuforge.world', schemaVersion: 1, entities: [] }
    },
    editor: createDefaultEditorState(),
    persistence: createDefaultPersistenceState(),
    logs: [],
    runtime: createDefaultRuntimeState()
  };
}

function reducerContext(): ReducerContext {
  let index = 0;
  return {
    idFactory: () => `log-${index++}`,
    clock: () => '2026-11-19T00:00:00.000Z'
  };
}

test('reducer installs, disables, and removes an extension', () => {
  const context = reducerContext();
  let state = reduceStudioState(studioState(), { type: 'extension/install', entry: entry() }, context);
  assert.equal(state.project.extensions?.entries.length, 1);
  assert.equal(state.persistence.status, 'dirty');
  assert.equal(state.logs.at(-1)?.source, 'EXTENSION');

  state = reduceStudioState(
    state,
    { type: 'extension/set-enabled', extensionId: EXT_ID, enabled: false },
    context
  );
  assert.equal(state.project.extensions?.entries[0]?.enabled, false);

  state = reduceStudioState(state, { type: 'extension/remove', extensionId: EXT_ID }, context);
  assert.equal(state.project.extensions?.entries.length, 0);
});

test('reducer records extension outputs and diagnostics', () => {
  const context = reducerContext();
  let state = reduceStudioState(studioState(), { type: 'extension/install', entry: entry() }, context);
  state = reduceStudioState(
    state,
    {
      type: 'runtime/extension-output',
      outputs: { [`${EXT_ID}:module`]: 0.25 },
      diagnostics: [],
      lastTickMs: 3
    },
    context
  );
  assert.deepEqual(state.runtime.extensions.moduleOutputs, { [`${EXT_ID}:module`]: 0.25 });
  assert.equal(state.runtime.extensions.tickCount, 1);
  assert.equal(state.runtime.extensions.lastTickMs, 3);
});

// --- graph integration ----------------------------------------------------

function extensionEntity() {
  const entity = createWorldEntity('cube', ENTITY_ID, 'Box');
  entity.components = [
    { id: COMPONENT_ID, type: 'testComponent', enabled: true, gain: 2 }
  ] as unknown as typeof entity.components;
  return entity;
}

function extensionGraph(action: GraphNode): Graph {
  return {
    id: 'graph-1',
    name: 'Extension Graph',
    nodes: [node('trigger', 'onStart'), action],
    edges: [
      {
        id: 'edge-1',
        sourceNodeId: 'trigger',
        sourcePortId: 'out',
        targetNodeId: action.id,
        targetPortId: 'in'
      }
    ]
  };
}

function node(id: string, type: GraphNode['type'], config?: GraphNode['config']): GraphNode {
  return {
    id,
    type,
    config: config ?? ({ kind: 'onStart' } as GraphNode['config'])
  };
}

function runExtensionChain(manifest: ExtensionManifest, action: GraphNode) {
  const graph = extensionGraph(action);
  const plan = buildExecutionPlan(graph, 'trigger');
  assert.ok(plan.plan);
  return executeChain(plan.plan, graph, {}, {
    extension: {
      state: createDefaultExtensionState(),
      manifests: [manifest],
      entities: [extensionEntity()]
    }
  });
}

test('setExtensionValue writes a transient value when write:components is granted', () => {
  const manifest: ExtensionManifest = {
    ...BASE_MANIFEST,
    modules: [],
    permissions: ['write:components']
  };
  const entity = extensionEntity();
  const result = runExtensionChain(
    manifest,
    node('set', 'setExtensionValue', {
      kind: 'setExtensionValue',
      targetEntityId: ENTITY_ID,
      targetComponentId: COMPONENT_ID,
      value: 42
    })
  );
  assert.equal(result.completed, true);
  assert.equal(result.failure, null);
  assert.equal(result.extension?.componentValues[COMPONENT_ID], 42);
  // The authored component is never mutated.
  assert.deepEqual(entity.components[0], {
    id: COMPONENT_ID,
    type: 'testComponent',
    enabled: true,
    gain: 2
  });
});

test('setExtensionValue is rejected without write:components', () => {
  const manifest: ExtensionManifest = { ...BASE_MANIFEST, modules: [], permissions: [] };
  const result = runExtensionChain(
    manifest,
    node('set', 'setExtensionValue', {
      kind: 'setExtensionValue',
      targetEntityId: ENTITY_ID,
      targetComponentId: COMPONENT_ID,
      value: 1
    })
  );
  assert.equal(result.completed, false);
  assert.equal(result.failure?.code, 'GRAPH_EXECUTION_EXTENSION_PERMISSION');
  assert.deepEqual(result.extension?.componentValues, {});
});

test('readExtensionValue requires read:world and never writes values', () => {
  const denied = runExtensionChain(
    { ...BASE_MANIFEST, modules: [], permissions: [] },
    node('read', 'readExtensionValue', {
      kind: 'readExtensionValue',
      targetEntityId: ENTITY_ID,
      targetComponentId: COMPONENT_ID
    })
  );
  assert.equal(denied.completed, false);
  assert.equal(denied.failure?.code, 'GRAPH_EXECUTION_EXTENSION_PERMISSION');

  const allowed = runExtensionChain(
    { ...BASE_MANIFEST, modules: [], permissions: ['read:world'] },
    node('read', 'readExtensionValue', {
      kind: 'readExtensionValue',
      targetEntityId: ENTITY_ID,
      targetComponentId: COMPONENT_ID
    })
  );
  assert.equal(allowed.completed, true);
  assert.deepEqual(allowed.extension?.componentValues, {});
});

test('an extension failure pauses a running simulation and is deduplicated', () => {
  const context = reducerContext();
  const running: StudioState = {
    ...studioState(),
    runtime: { ...createDefaultRuntimeState(), status: 'running' }
  };
  const command = {
    type: 'runtime/extension-failure' as const,
    code: EXTENSION_CODES.WORKER_FAILED,
    message: 'worker died',
    extensionId: EXT_ID
  };
  const paused = reduceStudioState(running, command, context);
  assert.equal(paused.runtime.status, 'paused');
  assert.equal(paused.runtime.extensions.status, 'error');
  assert.equal(paused.runtime.extensions.diagnostics.length, 1);
  assert.equal(paused.logs.at(-1)?.source, 'EXTENSION');

  const duplicate = reduceStudioState(paused, command, context);
  assert.equal(duplicate.runtime.extensions.diagnostics.length, 1);
  assert.equal(duplicate.logs.length, paused.logs.length);
});
