import type {
  AnyComponent,
  Component,
  ComponentId,
  ElectricalComponent,
  RigidBodyComponent
} from './types.ts';

export type ComponentCategory = 'physics' | 'electrical';

export interface ComponentTerminalDefinition {
  id: string;
  label: string;
}

export interface ComponentDefinition {
  type: string;
  label: string;
  category: ComponentCategory;
  description: string;
  /** Electrical terminals in stable order. Non-electrical components have none. */
  terminals: readonly ComponentTerminalDefinition[];
  create: (id: ComponentId) => AnyComponent;
}

export const ELECTRICAL_COMPONENT_TYPES = [
  'voltageSource',
  'resistor',
  'switch',
  'ground'
] as const;

export type ElectricalComponentType = (typeof ELECTRICAL_COMPONENT_TYPES)[number];

const ELECTRICAL_COMPONENT_TYPE_SET: ReadonlySet<string> = new Set(ELECTRICAL_COMPONENT_TYPES);

export function isElectricalComponentType(type: string): type is ElectricalComponentType {
  return ELECTRICAL_COMPONENT_TYPE_SET.has(type);
}

export function isRigidBodyComponent(component: Component): component is RigidBodyComponent {
  return component.type === 'rigidBody';
}

export function isElectricalComponent(component: Component): component is ElectricalComponent {
  return isElectricalComponentType(component.type);
}

const DEFINITIONS: readonly ComponentDefinition[] = [
  {
    type: 'rigidBody',
    label: 'Rigid Body',
    category: 'physics',
    description: 'Mass, gravity, and a collision shape driven by the fixed-step physics runtime.',
    terminals: [],
    create: (id) => ({
      id,
      type: 'rigidBody',
      enabled: true,
      mass: 1,
      useGravity: true,
      collider: { kind: 'sphere', size: 0.5 },
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 }
    })
  },
  {
    type: 'voltageSource',
    label: 'Voltage Source',
    category: 'electrical',
    description: 'Ideal DC voltage source between a positive and a negative terminal.',
    terminals: [
      { id: 'positive', label: '+' },
      { id: 'negative', label: '\u2212' }
    ],
    create: (id) => ({ id, type: 'voltageSource', enabled: true, voltage: 5 })
  },
  {
    type: 'resistor',
    label: 'Resistor',
    category: 'electrical',
    description: 'Linear resistor between two terminals.',
    terminals: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' }
    ],
    create: (id) => ({ id, type: 'resistor', enabled: true, resistance: 100 })
  },
  {
    type: 'switch',
    label: 'Switch',
    category: 'electrical',
    description: 'Ideal single-pole switch. Closed joins both terminals into one net.',
    terminals: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' }
    ],
    create: (id) => ({ id, type: 'switch', enabled: true, closed: true })
  },
  {
    type: 'ground',
    label: 'Ground',
    category: 'electrical',
    description: 'Circuit reference node. All ground components share the same net.',
    terminals: [{ id: 'g', label: 'G' }],
    create: (id) => ({ id, type: 'ground', enabled: true })
  }
];

const DEFINITION_BY_TYPE = new Map(DEFINITIONS.map((definition) => [definition.type, definition]));

export const COMPONENT_DEFINITIONS: readonly ComponentDefinition[] = DEFINITIONS;

export function getComponentDefinition(type: string): ComponentDefinition | null {
  return DEFINITION_BY_TYPE.get(type) ?? null;
}

export function componentLabel(type: string): string {
  return DEFINITION_BY_TYPE.get(type)?.label ?? type;
}

export function componentTerminals(type: string): readonly ComponentTerminalDefinition[] {
  return DEFINITION_BY_TYPE.get(type)?.terminals ?? [];
}

/**
 * Creates a fresh component with stable, explicit defaults.
 *
 * Returns null for an unknown type so callers never author a component that the
 * registry cannot describe.
 */
export function createComponent(type: string, id: ComponentId): AnyComponent | null {
  const definition = DEFINITION_BY_TYPE.get(type);
  return definition ? definition.create(id) : null;
}

/**
 * Deep-clones a component. Components are JSON data by contract (ADR 0003), so a
 * JSON round-trip is sufficient and keeps nested collider/velocity values from
 * being shared between authored snapshots and runtime state.
 */
export function cloneComponent(component: Component): Component {
  return JSON.parse(JSON.stringify(component)) as Component;
}

export function cloneComponents(components: readonly Component[] | undefined): Component[] {
  return (components ?? []).map(cloneComponent);
}
