import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWorldDocument } from '../../src/world/validation.ts';

test('validates a valid empty world', () => {
  const result = validateWorldDocument({ format: 'simuforge.world', schemaVersion: 1, entities: [] });
  assert.equal(result.ok, true);
});

test('rejects duplicate entity ids', () => {
  const result = validateWorldDocument({
    format: 'simuforge.world',
    schemaVersion: 1,
    entities: [
      { id: '11111111-1111-4111-8111-111111111111', name: 'A', type: 'cube', transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }, metadata: {} },
      { id: '11111111-1111-4111-8111-111111111111', name: 'B', type: 'sphere', transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }, metadata: {} }
    ]
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error.path ?? '', /entities\[1\]\.id/);
});

test('rejects empty names', () => {
  const result = validateWorldDocument({
    format: 'simuforge.world',
    schemaVersion: 1,
    entities: [
      { id: '11111111-1111-4111-8111-111111111111', name: '', type: 'cube', transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }, metadata: {} }
    ]
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error.path ?? '', /entities\[0\]\.name/);
});

test('rejects bad types', () => {
  const result = validateWorldDocument({
    format: 'simuforge.world',
    schemaVersion: 1,
    entities: [
      { id: '11111111-1111-4111-8111-111111111111', name: 'A', type: 'light', transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }, metadata: {} }
    ]
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error.path ?? '', /entities\[0\]\.type/);
});

test('rejects non-finite values', () => {
  const result = validateWorldDocument({
    format: 'simuforge.world',
    schemaVersion: 1,
    entities: [
      { id: '11111111-1111-4111-8111-111111111111', name: 'A', type: 'cube', transform: { position: { x: Infinity, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }, metadata: {} }
    ]
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error.path ?? '', /entities\[0\]\.transform\.position\.x/);
});

test('rejects zero and negative scale', () => {
  const result = validateWorldDocument({
    format: 'simuforge.world',
    schemaVersion: 1,
    entities: [
      { id: '11111111-1111-4111-8111-111111111111', name: 'A', type: 'cube', transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 0, y: 1, z: 1 } }, metadata: {} }
    ]
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error.path ?? '', /entities\[0\]\.transform\.scale\.x/);
});

test('rejects malformed metadata', () => {
  const result = validateWorldDocument({
    format: 'simuforge.world',
    schemaVersion: 1,
    entities: [
      { id: '11111111-1111-4111-8111-111111111111', name: 'A', type: 'cube', transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }, metadata: [] }
    ]
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error.path ?? '', /entities\[0\]\.metadata/);
});
