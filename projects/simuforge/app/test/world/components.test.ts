import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPONENT_DEFINITIONS,
  componentTerminals,
  createComponent,
  getComponentDefinition,
  isElectricalComponentType,
  isRigidBodyComponent
} from '../../src/world/components.ts';
import type { RigidBodyComponent } from '../../src/world/types.ts';

const ID = '11111111-1111-4111-8111-111111111111';

test('registry exposes deterministic definitions', () => {
  assert.deepEqual(
    COMPONENT_DEFINITIONS.map((definition) => definition.type),
    ['rigidBody', 'voltageSource', 'resistor', 'switch', 'ground', 'joint', 'actuator', 'sensor']
  );
  assert.equal(COMPONENT_DEFINITIONS.filter((definition) => definition.category === 'electrical').length, 4);
  assert.equal(COMPONENT_DEFINITIONS.filter((definition) => definition.category === 'robotics').length, 3);
});

test('creates valid defaults for every registered component', () => {
  for (const definition of COMPONENT_DEFINITIONS) {
    const component = createComponent(definition.type, ID);
    assert.ok(component, `${definition.type} must be creatable`);
    assert.equal(component?.id, ID);
    assert.equal(component?.type, definition.type);
    assert.equal(component?.enabled, true);
  }
});

test('creates expected electrical defaults', () => {
  assert.deepEqual(createComponent('voltageSource', ID), {
    id: ID,
    type: 'voltageSource',
    enabled: true,
    voltage: 5
  });
  assert.deepEqual(createComponent('resistor', ID), {
    id: ID,
    type: 'resistor',
    enabled: true,
    resistance: 100
  });
  assert.deepEqual(createComponent('switch', ID), {
    id: ID,
    type: 'switch',
    enabled: true,
    closed: true
  });
  assert.deepEqual(createComponent('ground', ID), { id: ID, type: 'ground', enabled: true });
});

test('rejects unknown component types', () => {
  assert.equal(createComponent('diode', ID), null);
  assert.equal(getComponentDefinition('diode'), null);
});

test('identifies electrical components and terminals', () => {
  assert.equal(isElectricalComponentType('resistor'), true);
  assert.equal(isElectricalComponentType('rigidBody'), false);
  assert.deepEqual(componentTerminals('voltageSource').map((terminal) => terminal.id), ['positive', 'negative']);
  assert.deepEqual(componentTerminals('resistor').map((terminal) => terminal.id), ['a', 'b']);
  assert.deepEqual(componentTerminals('ground').map((terminal) => terminal.id), ['g']);
});

test('rigid-body predicate narrows only rigid bodies', () => {
  const rigidBody = createComponent('rigidBody', ID) as RigidBodyComponent;
  assert.equal(isRigidBodyComponent(rigidBody), true);
  assert.equal(isRigidBodyComponent(createComponent('resistor', ID)!), false);
});
