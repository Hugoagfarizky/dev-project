import type {
  ActuatorComponent,
  AnyComponent,
  Component,
  ComponentId,
  ElectricalComponent,
  GroundComponent,
  JointComponent,
  ResistorComponent,
  RigidBodyComponent,
  SensorComponent,
  SwitchComponent,
  VoltageSourceComponent
} from './types.ts';

export type ComponentCategory = 'physics' | 'electrical' | 'robotics' | 'extension';

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

export const ROBOTICS_COMPONENT_TYPES = [
  'joint',
  'actuator',
  'sensor'
] as const;

export type RoboticsComponentType = (typeof ROBOTICS_COMPONENT_TYPES)[number];

const ROBOTICS_COMPONENT_TYPE_SET: ReadonlySet<string> = new Set(ROBOTICS_COMPONENT_TYPES);

export function isRoboticsComponentType(type: string): type is RoboticsComponentType {
  return ROBOTICS_COMPONENT_TYPE_SET.has(type);
}

export function isRigidBodyComponent(component: Component): component is RigidBodyComponent {
  return component.type === 'rigidBody';
}

export function isElectricalComponent(component: Component): component is ElectricalComponent {
  return isElectricalComponentType(component.type);
}

export function isVoltageSourceComponent(component: Component): component is VoltageSourceComponent {
  return component.type === 'voltageSource';
}

export function isResistorComponent(component: Component): component is ResistorComponent {
  return component.type === 'resistor';
}

export function isSwitchComponent(component: Component): component is SwitchComponent {
  return component.type === 'switch';
}

export function isGroundComponent(component: Component): component is GroundComponent {
  return component.type === 'ground';
}

export function isJointComponent(component: Component): component is JointComponent {
  return component.type === 'joint';
}

export function isActuatorComponent(component: Component): component is ActuatorComponent {
  return component.type === 'actuator';
}

export function isSensorComponent(component: Component): component is SensorComponent {
  return component.type === 'sensor';
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
  },
  {
    type: 'joint',
    label: 'Joint',
    category: 'robotics',
    description: 'Revolute or prismatic joint linking a parent and child entity.',
    terminals: [],
    create: (id) => ({
      id,
      type: 'joint',
      enabled: true,
      kind: 'revolute',
      parentEntityId: '',
      childEntityId: '',
      axis: { x: 0, y: 1, z: 0 },
      limit: { min: -Math.PI, max: Math.PI }
    })
  },
  {
    type: 'actuator',
    label: 'Actuator',
    category: 'robotics',
    description: 'DC motor actuator driving a joint from an electrical input.',
    terminals: [],
    create: (id) => ({
      id,
      type: 'actuator',
      enabled: true,
      kind: 'dcMotor',
      jointId: '',
      mode: 'voltage',
      voltage: 0,
      motor: {
        resistance: 10,
        torqueConstant: 0.1,
        backEmfConstant: 0.1,
        maxSpeed: 100,
        maxTorque: 10,
        inertia: 0.01
      }
    })
  },
  {
    type: 'sensor',
    label: 'Sensor',
    category: 'robotics',
    description: 'Contact, position, or velocity sensor reading simulated state.',
    terminals: [],
    create: (id) => ({
      id,
      type: 'sensor',
      enabled: true,
      kind: 'position',
      targetEntityId: '',
      axis: { x: 0, y: 1, z: 0 },
      threshold: 0
    })
  }
];

const DEFINITION_BY_TYPE = new Map(DEFINITIONS.map((definition) => [definition.type, definition]));

/** Built-in component definitions. Never mutated by extensions. */
export const COMPONENT_DEFINITIONS: readonly ComponentDefinition[] = DEFINITIONS;

/**
 * Phase 10: extension-provided component definitions. The registry lives here so
 * the world layer stays free of extension/UI dependencies; the extension layer
 * registers and unregisters definitions through these functions.
 */
const DYNAMIC_DEFINITIONS = new Map<string, ComponentDefinition>();

export function registerDynamicComponentDefinition(definition: ComponentDefinition): void {
  if (DEFINITION_BY_TYPE.has(definition.type)) {
    throw new Error(`Component type "${definition.type}" is reserved by a built-in component.`);
  }
  DYNAMIC_DEFINITIONS.set(definition.type, definition);
}

export function unregisterDynamicComponentDefinition(type: string): void {
  DYNAMIC_DEFINITIONS.delete(type);
}

export function resetDynamicComponentDefinitions(): void {
  DYNAMIC_DEFINITIONS.clear();
}

/** True when the type is a built-in component type. */
export function isReservedComponentType(type: string): boolean {
  return DEFINITION_BY_TYPE.has(type);
}

/** True when the type is currently registered by an extension. */
export function isDynamicComponentType(type: string): boolean {
  return DYNAMIC_DEFINITIONS.has(type);
}

/**
 * True when the type is known to the registry, optionally including extension
 * types declared by a document that has not been loaded into the registry yet.
 */
export function isKnownComponentType(type: string, extra?: ReadonlySet<string>): boolean {
  return DEFINITION_BY_TYPE.has(type) || DYNAMIC_DEFINITIONS.has(type) || (extra?.has(type) ?? false);
}

export function getComponentDefinition(type: string): ComponentDefinition | null {
  return DEFINITION_BY_TYPE.get(type) ?? DYNAMIC_DEFINITIONS.get(type) ?? null;
}

/** Built-in definitions first, then registered extension definitions. */
export function getComponentDefinitions(): readonly ComponentDefinition[] {
  return [...DEFINITIONS, ...DYNAMIC_DEFINITIONS.values()];
}

export function componentLabel(type: string): string {
  return getComponentDefinition(type)?.label ?? type;
}

export function componentTerminals(type: string): readonly ComponentTerminalDefinition[] {
  return getComponentDefinition(type)?.terminals ?? [];
}

/**
 * Creates a fresh component with stable, explicit defaults.
 *
 * Returns null for an unknown type so callers never author a component that the
 * registry cannot describe.
 */
export function createComponent(type: string, id: ComponentId): AnyComponent | null {
  const definition = getComponentDefinition(type);
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
