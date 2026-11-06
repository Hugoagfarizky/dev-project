import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProjectDocument, serializeProjectDocument } from '../../src/project/serialization.ts';
import { createEmptyWorld } from '../../src/world/defaults.ts';

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
