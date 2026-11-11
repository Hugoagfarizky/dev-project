import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reduceStudioState, type ReducerContext } from '../../src/editor/reducer.ts';
import { createStudioStore } from '../../src/editor/store.ts';
import {
  createDefaultEditorState,
  createDefaultPersistenceState,
  createDefaultRuntimeState
} from '../../src/editor/state.ts';
import type { StudioState } from '../../src/editor/state.ts';
import { selectRenderWorld } from '../../src/editor/selectors.ts';
import { serializeProjectDocument } from '../../src/project/serialization.ts';
import { FIXED_TIMESTEP_SECONDS } from '../../src/runtime/physics.ts';
import type { RigidBodyComponent } from '../../src/world/types.ts';

const BALL_ID = '11111111-1111-4111-8111-111111111111';
const RIGID_BODY_ID = '33333333-3333-4333-8333-333333333333';

function rigidBody(overrides: Partial<RigidBodyComponent> = {}): RigidBodyComponent {
  return {
    id: RIGID_BODY_ID,
    type: 'rigidBody',
    enabled: true,
    mass: 1,
    useGravity: true,
    collider: { kind: 'sphere', size: 0.5 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    ...overrides
  };
}

function initialState(components: RigidBodyComponent[] = [rigidBody()]): StudioState {
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
      world: {
        format: 'simuforge.world',
        schemaVersion: 1,
        entities: [{
          id: BALL_ID,
          name: 'Ball',
          type: 'sphere',
          transform: {
            position: { x: 0, y: 5, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 }
          },
          metadata: {},
          components
        }]
      }
    },
    editor: { ...createDefaultEditorState(), selectedEntityId: BALL_ID },
    persistence: createDefaultPersistenceState(),
    logs: [],
    runtime: createDefaultRuntimeState()
  };
}

function context(): ReducerContext {
  return { idFactory: () => '88888888-8888-4888-8888-888888888888', clock: () => '2026-11-11T00:00:00.000Z' };
}

function play(state: StudioState = initialState()): StudioState {
  return reduceStudioState(state, { type: 'runtime/play' }, context());
}

function step(state: StudioState, deltaSeconds = FIXED_TIMESTEP_SECONDS): StudioState {
  return reduceStudioState(state, { type: 'runtime/step', deltaSeconds }, context());
}

test('runtime/play initializes runtime bodies from enabled rigid bodies', () => {
  const state = play();
  assert.equal(state.runtime.status, 'running');
  assert.ok(state.runtime.snapshot);
  const body = state.runtime.bodies[BALL_ID];
  assert.ok(body);
  assert.equal(body.transform.position.y, 5);
  assert.equal(body.velocity.y, 0);
  assert.equal(body.useGravity, true);
});

test('runtime/step advances runtime bodies without mutating authored state', () => {
  const s1 = play();
  const s2 = step(s1);
  const body = s2.runtime.bodies[BALL_ID];
  assert.ok(body);

  assert.ok(body.transform.position.y < 5);
  assert.ok(body.velocity.y < 0);
  assert.equal(s2.project.world.entities[0]?.transform.position.y, 5);
});

test('runtime/step is a no-op while paused', () => {
  const running = play();
  const paused = reduceStudioState(running, { type: 'runtime/pause' }, context());
  const stepped = step(paused);
  assert.equal(stepped, paused);
});

test('resume continues from the paused runtime position', () => {
  const running = play();
  const afterStep = step(running);
  const paused = reduceStudioState(afterStep, { type: 'runtime/pause' }, context());
  const resumed = reduceStudioState(paused, { type: 'runtime/resume' }, context());
  const afterResume = step(resumed);

  const pausedY = paused.runtime.bodies[BALL_ID]?.transform.position.y;
  const resumedY = afterResume.runtime.bodies[BALL_ID]?.transform.position.y;
  assert.ok(pausedY !== undefined && resumedY !== undefined);
  assert.ok(resumedY < pausedY);
});

test('runtime/reset restores the runtime body and preserves running status', () => {
  let state = play();
  for (let index = 0; index < 10; index += 1) {
    state = step(state);
  }
  assert.ok((state.runtime.bodies[BALL_ID]?.transform.position.y ?? 5) < 5);

  const reset = reduceStudioState(state, { type: 'runtime/reset' }, context());
  const body = reset.runtime.bodies[BALL_ID];
  assert.ok(body);
  assert.equal(reset.runtime.status, 'running');
  assert.equal(body.transform.position.y, 5);
  assert.equal(body.velocity.y, 0);
  assert.equal(reset.runtime.accumulatorSeconds, 0);
  assert.equal(reset.project.world.entities[0]?.transform.position.y, 5);
});

test('runtime/stop clears runtime bodies and leaves authored state initial', () => {
  const state = step(play());
  const stopped = reduceStudioState(state, { type: 'runtime/stop' }, context());

  assert.equal(stopped.runtime.status, 'editing');
  assert.equal(stopped.runtime.snapshot, null);
  assert.deepEqual(stopped.runtime.bodies, {});
  assert.equal(stopped.runtime.accumulatorSeconds, 0);
  assert.equal(stopped.project.world.entities[0]?.transform.position.y, 5);
});

test('runtime/step does not mark the project dirty', () => {
  const s1 = play();
  const s2 = step(s1);
  assert.equal(s2.persistence.revision, s1.persistence.revision);
  assert.equal(s2.persistence.status, s1.persistence.status);
});

test('runtime/step is a no-op while editing', () => {
  const state = initialState();
  assert.equal(step(state), state);
});

test('runtime/step is a no-op when no entity has a rigid body', () => {
  const state = play(initialState([]));
  assert.deepEqual(state.runtime.bodies, {});
  assert.equal(step(state), state);
});

test('disabled rigid bodies do not simulate', () => {
  const state = play(initialState([rigidBody({ enabled: false })]));
  assert.deepEqual(state.runtime.bodies, {});
  assert.equal(step(state), state);
});

test('selectRenderWorld overlays runtime transforms only outside editing', () => {
  const editing = initialState();
  assert.equal(selectRenderWorld(editing), editing.project.world);

  const running = step(play());
  const rendered = selectRenderWorld(running);
  assert.notEqual(rendered, running.project.world);
  assert.ok((rendered.entities[0]?.transform.position.y ?? 5) < 5);
  assert.equal(running.project.world.entities[0]?.transform.position.y, 5);

  const stopped = reduceStudioState(running, { type: 'runtime/stop' }, context());
  assert.equal(selectRenderWorld(stopped), stopped.project.world);
});

test('serialized project excludes runtime physics state', () => {
  const state = step(play());
  const json = serializeProjectDocument(state.project);
  assert.equal(json.includes('bodies'), false);
  assert.equal(json.includes('accumulatorSeconds'), false);

  const parsed = JSON.parse(json) as { world: { entities: Array<{ transform: { position: { y: number } } }> } };
  assert.equal(parsed.world.entities[0]?.transform.position.y, 5);
});

test('structural edits remain blocked while running after stepping', () => {
  const state = step(play());
  const blocked = reduceStudioState(state, {
    type: 'transform/set',
    id: BALL_ID,
    transform: {
      position: { x: 9, y: 9, z: 9 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 }
    },
    source: 'inspector'
  }, context());

  assert.equal(blocked.project.world.entities[0]?.transform.position.y, 5);
  assert.equal(blocked.logs.some((entry) => entry.code === 'STRUCTURAL_EDIT_BLOCKED'), true);
});

test('store-driven play and 30 fixed steps make the ball fall deterministically', () => {
  const store = createStudioStore(initialState());
  store.dispatch({ type: 'runtime/play' });
  for (let index = 0; index < 30; index += 1) {
    store.dispatch({ type: 'runtime/step', deltaSeconds: FIXED_TIMESTEP_SECONDS });
  }

  const state = store.getSnapshot();
  const body = state.runtime.bodies[BALL_ID];
  assert.ok(body);
  assert.ok(Math.abs(body.transform.position.y - 3.732875) < 1e-6);
  assert.ok(Math.abs(body.velocity.y + 4.905) < 1e-6);
  assert.equal(state.project.world.entities[0]?.transform.position.y, 5);
  assert.equal(state.persistence.revision, 0);
});
