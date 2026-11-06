import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeWorldDocument, parseWorldDocument } from '../../src/world/serialization.ts';
import { createEmptyWorld, createWorldEntity } from '../../src/world/defaults.ts';

test('round-trips an empty world', () => {
  const world = createEmptyWorld();
  const parsed = parseWorldDocument(serializeWorldDocument(world));
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.value.entities.length, 0);
});

test('round-trips three primitive types', () => {
  const world = createEmptyWorld();
  world.entities.push(createWorldEntity('cube', '11111111-1111-4111-8111-111111111111', 'Cube'));
  world.entities.push(createWorldEntity('sphere', '22222222-2222-4222-8222-222222222222', 'Sphere'));
  world.entities.push(createWorldEntity('plane', '33333333-3333-4333-8333-333333333333', 'Plane'));
  const parsed = parseWorldDocument(serializeWorldDocument(world));
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.value.entities.length, 3);
});

test('ignores unknown fields on read', () => {
  const json = JSON.stringify({
    format: 'simuforge.world',
    schemaVersion: 1,
    entities: [],
    extra: true
  });
  const parsed = parseWorldDocument(json);
  assert.equal(parsed.ok, true);
});

test('rejects a missing required field', () => {
  const json = JSON.stringify({
    schemaVersion: 1,
    entities: []
  });
  const parsed = parseWorldDocument(json);
  assert.equal(parsed.ok, false);
});

test('round-trips transforms within 1e-6', () => {
  const world = createEmptyWorld();
  const entity = createWorldEntity('cube', '11111111-1111-4111-8111-111111111111', 'Cube');
  entity.transform.position = { x: 1.25, y: 2.5, z: -3.75 };
  world.entities.push(entity);
  const parsed = parseWorldDocument(serializeWorldDocument(world));
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.ok(Math.abs(parsed.value.entities[0].transform.position.x - 1.25) <= 1e-6);
  }
});
