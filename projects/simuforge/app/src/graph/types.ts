import type { Vec3 } from '../world/types.ts';

export const GRAPH_FORMAT = 'simuforge.graph';
export const GRAPH_SCHEMA_VERSION = 1;

export type GraphId = string;
export type GraphNodeId = string;
export type GraphEdgeId = string;
export type GraphPortId = string;

export type GraphNodeType =
  | 'onStart'
  | 'manualTrigger'
  | 'onPlaneContact'
  | 'applyForce'
  | 'applyImpulse'
  | 'clearForce'
  | 'runPython'
  | 'setSwitch'
  | 'setSourceVoltage'
  | 'setActuator'
  | 'readSensor'
  | 'setExtensionValue'
  | 'readExtensionValue';

export type GraphPortDirection = 'input' | 'output';
export type GraphPortKind = 'execution';

export interface GraphPort {
  id: GraphPortId;
  nodeId: GraphNodeId;
  direction: GraphPortDirection;
  kind: GraphPortKind;
}

export interface GraphPosition {
  x: number;
  y: number;
}

export interface GraphNodeBase {
  id: GraphNodeId;
  type: GraphNodeType;
  position?: GraphPosition;
}

export interface OnStartNodeConfig {
  kind: 'onStart';
}

export interface ManualTriggerNodeConfig {
  kind: 'manualTrigger';
}

export interface OnPlaneContactNodeConfig {
  kind: 'onPlaneContact';
  targetEntityId: string;
}

export interface ApplyForceNodeConfig {
  kind: 'applyForce';
  targetEntityId: string;
  force: Vec3;
}

export interface ApplyImpulseNodeConfig {
  kind: 'applyImpulse';
  targetEntityId: string;
  impulse: Vec3;
}

export interface ClearForceNodeConfig {
  kind: 'clearForce';
  targetEntityId: string;
}

/**
 * Phase 07: runs a project Python script. The node stores only a reference; the
 * source lives in the project's Python section so the two authoring surfaces
 * stay separate and the source is never duplicated.
 */
export interface RunPythonNodeConfig {
  kind: 'runPython';
  scriptId: string;
}

/**
 * Phase 08: opens or closes an authored switch during simulation. The runtime
 * override is transient; the authored component value is never rewritten
 * (D-P08-03, D-P08-04).
 */
export interface SetSwitchNodeConfig {
  kind: 'setSwitch';
  targetEntityId: string;
  targetComponentId: string;
  closed: boolean;
}

/** Phase 08: sets a runtime source voltage without rewriting the authored value. */
export interface SetSourceVoltageNodeConfig {
  kind: 'setSourceVoltage';
  targetEntityId: string;
  targetComponentId: string;
  voltage: number;
}

export interface SetActuatorNodeConfig {
  kind: 'setActuator';
  targetEntityId: string;
  targetComponentId: string;
  value: number;
}

export interface ReadSensorNodeConfig {
  kind: 'readSensor';
  targetEntityId: string;
  targetComponentId: string;
}

/**
 * Phase 10: writes a transient value to an extension-provided component. The
 * extension must declare `write:components`; the authored component is never
 * mutated.
 */
export interface SetExtensionValueNodeConfig {
  kind: 'setExtensionValue';
  targetEntityId: string;
  targetComponentId: string;
  value: number;
}

/** Phase 10: reads an extension component value as a pass-through action. */
export interface ReadExtensionValueNodeConfig {
  kind: 'readExtensionValue';
  targetEntityId: string;
  targetComponentId: string;
}

export type GraphNodeConfig =
  | OnStartNodeConfig
  | ManualTriggerNodeConfig
  | OnPlaneContactNodeConfig
  | ApplyForceNodeConfig
  | ApplyImpulseNodeConfig
  | ClearForceNodeConfig
  | RunPythonNodeConfig
  | SetSwitchNodeConfig
  | SetSourceVoltageNodeConfig
  | SetActuatorNodeConfig
  | ReadSensorNodeConfig
  | SetExtensionValueNodeConfig
  | ReadExtensionValueNodeConfig;

export interface GraphNode extends GraphNodeBase {
  config: GraphNodeConfig;
}

export interface GraphEdge {
  id: GraphEdgeId;
  sourceNodeId: GraphNodeId;
  sourcePortId: GraphPortId;
  targetNodeId: GraphNodeId;
  targetPortId: GraphPortId;
}

export interface Graph {
  id: GraphId;
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphDocument {
  format: typeof GRAPH_FORMAT;
  schemaVersion: typeof GRAPH_SCHEMA_VERSION;
  graph: Graph;
}

export type GraphDiagnosticSeverity = 'error' | 'warning';

export interface GraphDiagnostic {
  code: string;
  severity: GraphDiagnosticSeverity;
  message: string;
  nodeId?: GraphNodeId;
  edgeId?: GraphEdgeId;
  field?: string;
}

export interface GraphValidationResult {
  valid: boolean;
  diagnostics: GraphDiagnostic[];
}

export interface GraphValidationContext {
  entities: readonly {
    id: string;
    components: readonly {
      id: string;
      type: string;
      enabled: boolean;
      collider?: { kind: string };
    }[];
  }[];
  /**
   * Ids of the project's Python scripts. When provided, a `runPython` node must
   * reference one of them. When omitted (graph-only validation), only the
   * presence of a non-empty reference is checked.
   */
  scriptIds?: readonly string[];
  /**
   * Phase 10: component types declared by the project's extensions. When
   * provided, extension graph nodes may target them even before the dynamic
   * registry is populated.
   */
  extensionComponentTypes?: readonly string[];
}

export interface GraphParseResult {
  ok: boolean;
  value?: GraphDocument;
  error?: { code: string; message: string };
}