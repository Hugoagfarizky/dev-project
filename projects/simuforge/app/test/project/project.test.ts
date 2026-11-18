import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProjectDocument, serializeProjectDocument } from '../../src/project/serialization.ts';
import { createEmptyWorld, createWorldEntity } from '../../src/world/defaults.ts';
import { createComponent } from '../../src/world/components.ts';

test('validates a valid project envelope', () => {
  const json = JSON.stringify({
    format: 'simuforge.project',
    schemaVersion: 1,
    project: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Test Project',
      createdAt: '2026-11-06T00:00:00.000Z',
      updatedAt: '2026-11-06T00:00:00.000Z'
    },
    world: { format: 'simuforge.world', schemaVersion: 1, entities: [] }
  });
  const result = parseProjectDocument(json);
  assert.equal(result.ok, true);
});

test('rejects wrong format', () => {
  const json = JSON.stringify({
    format: 'wrong',
    schemaVersion: 1,
    project: { id: '11111111-1111-4111-8111-111111111111', name: 'Test', createdAt: '2026-11-06T00:00:00.000Z', updatedAt: '2026-11-06T00:00:00.000Z' },
    world: { format: 'simuforge.world', schemaVersion: 1, entities: [] }
  });
  const result = parseProjectDocument(json);
  assert.equal(result.ok, false);
});

test('rejects missing project fields', () => {
  const json = JSON.stringify({
    format: 'simuforge.project',
    schemaVersion: 1,
    project: { id: '11111111-1111-4111-8111-111111111111', name: 'Test' },
    world: { format: 'simuforge.world', schemaVersion: 1, entities: [] }
  });
  const result = parseProjectDocument(json);
  assert.equal(result.ok, false);
});

test('rejects newer schema', () => {
  const json = JSON.stringify({
    format: 'simuforge.project',
    schemaVersion: 2,
    project: { id: '11111111-1111-4111-8111-111111111111', name: 'Test', createdAt: '2026-11-06T00:00:00.000Z', updatedAt: '2026-11-06T00:00:00.000Z' },
    world: { format: 'simuforge.world', schemaVersion: 1, entities: [] }
  });
  const result = parseProjectDocument(json);
  assert.equal(result.ok, false);
});

test('rejects corrupt JSON', () => {
  const result = parseProjectDocument('{ not json');
  assert.equal(result.ok, false);
});

test('reports nested world failure path', () => {
  const json = JSON.stringify({
    format: 'simuforge.project',
    schemaVersion: 1,
    project: { id: '11111111-1111-4111-8111-111111111111', name: 'Test', createdAt: '2026-11-06T00:00:00.000Z', updatedAt: '2026-11-06T00:00:00.000Z' },
    world: { format: 'simuforge.world', schemaVersion: 1, entities: [{ id: 'bad', name: 'A', type: 'cube', transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }, metadata: {} }] }
  });
  const result = parseProjectDocument(json);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error.path ?? '', /world\.entities\[0\]\.id/);
});

test('rejects updatedAt before createdAt', () => {
  const json = JSON.stringify({
    format: 'simuforge.project',
    schemaVersion: 1,
    project: { id: '11111111-1111-4111-8111-111111111111', name: 'Test', createdAt: '2026-11-06T01:00:00.000Z', updatedAt: '2026-11-06T00:00:00.000Z' },
    world: { format: 'simuforge.world', schemaVersion: 1, entities: [] }
  });
  const result = parseProjectDocument(json);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'INVALID_PROJECT_TIMESTAMP');
});

test('rejects oversized file', () => {
  const big = 'x'.repeat(1024 * 1024 + 10);
  const result = parseProjectDocument(big);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'FILE_TOO_LARGE');
});

test('round-trips a project document', () => {
  const world = createEmptyWorld();
  const project = {
    format: 'simuforge.project' as const,
    schemaVersion: 1 as const,
    project: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Round Trip',
      createdAt: '2026-11-06T00:00:00.000Z',
      updatedAt: '2026-11-06T00:00:00.000Z'
    },
    world
  };
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
});

test('export/import preserves entity components', () => {
  const world = createEmptyWorld();
  const entity = createWorldEntity('cube', '22222222-2222-4222-8222-222222222222', 'Circuit');
  entity.components = [
    createComponent('voltageSource', '33333333-3333-4333-8333-333333333333')!,
    createComponent('ground', '44444444-4444-4444-8444-444444444444')!
  ];
  world.entities.push(entity);
  const project = {
    format: 'simuforge.project' as const,
    schemaVersion: 1 as const,
    project: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Components',
      createdAt: '2026-11-06T00:00:00.000Z',
      updatedAt: '2026-11-06T00:00:00.000Z'
    },
    world
  };

  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.deepEqual(parsed.value.world.entities[0].components, entity.components);
  }
});
