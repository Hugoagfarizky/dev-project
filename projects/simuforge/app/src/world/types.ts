export type EntityId = string;

export type EntityType = 'cube' | 'sphere' | 'plane';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export type ComponentId = string;

export interface Component {
  id: ComponentId;
  type: string;
  enabled: boolean;
}

export interface RigidBodyComponent extends Component {
  type: 'rigidBody';
  mass: number;
  useGravity: boolean;
  collider: { kind: 'sphere' | 'box' | 'plane'; size: number | Vec3 };
  velocity: Vec3;
  angularVelocity: Vec3;
}

/**
 * Phase 08 ideal DC voltage source. The value is the authored terminal voltage
 * in volts; negative values invert the polarity. Runtime voltage overrides are
 * transient and never written back to this component.
 */
export interface VoltageSourceComponent extends Component {
  type: 'voltageSource';
  voltage: number;
}

/** Phase 08 linear resistor. `resistance` is in ohms and must be positive. */
export interface ResistorComponent extends Component {
  type: 'resistor';
  resistance: number;
}

/**
 * Phase 08 ideal switch. `closed` is the authored initial state. Graph actions
 * and runtime controls use a transient override instead of mutating this value.
 */
export interface SwitchComponent extends Component {
  type: 'switch';
  closed: boolean;
}

/** Phase 08 circuit reference node. All ground components share one net. */
export interface GroundComponent extends Component {
  type: 'ground';
}

/** Phase 09 revolute or prismatic joint linking two entities. */
export interface JointComponent extends Component {
  type: 'joint';
  kind: 'revolute' | 'prismatic';
  parentEntityId: string;
  childEntityId: string;
  axis: Vec3;
  limit: { min: number; max: number };
}

/** Phase 09 DC motor actuator driving a joint from an electrical input. */
export interface ActuatorComponent extends Component {
  type: 'actuator';
  kind: 'dcMotor';
  jointId: string;
  mode: 'voltage' | 'position' | 'velocity';
  electricalSourceEntityId?: string;
  electricalSourceComponentId?: string;
  voltage: number;
  motor: {
    resistance: number;
    torqueConstant: number;
    backEmfConstant: number;
    maxSpeed: number;
    maxTorque: number;
    inertia: number;
  };
}

/** Phase 09 sensor reading a simulated quantity. */
export interface SensorComponent extends Component {
  type: 'sensor';
  kind: 'contact' | 'position' | 'velocity';
  targetEntityId: string;
  axis?: Vec3;
  threshold?: number;
}

export type ElectricalComponent =
  | VoltageSourceComponent
  | ResistorComponent
  | SwitchComponent
  | GroundComponent;

export type RoboticsComponent = JointComponent | ActuatorComponent | SensorComponent;

export type AnyComponent =
  | RigidBodyComponent
  | ElectricalComponent
  | RoboticsComponent
  | Component;

export interface WorldEntity {
  id: EntityId;
  name: string;
  type: EntityType;
  transform: Transform;
  metadata: Record<string, unknown>;
  components?: Component[];
}

export interface WorldDocument {
  format: 'simuforge.world';
  schemaVersion: 1;
  entities: WorldEntity[];
}

export type AppErrorCode =
  | 'VALIDATION_FAILED'
  | 'INVALID_JSON'
  | 'UNSUPPORTED_SCHEMA'
  | 'INVALID_METADATA';

export interface AppError {
  code: AppErrorCode | string;
  message: string;
  path?: string;
  detail?: string;
  cause?: unknown;
}
