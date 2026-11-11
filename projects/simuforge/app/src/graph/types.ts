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
  | 'clearForce';

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

export type GraphNodeConfig =
  | OnStartNodeConfig
  | ManualTriggerNodeConfig
  | OnPlaneContactNodeConfig
  | ApplyForceNodeConfig
  | ApplyImpulseNodeConfig
  | ClearForceNodeConfig;

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
    components: readonly { type: string; enabled: boolean; collider?: { kind: string } }[];
  }[];
}

export interface GraphParseResult {
  ok: boolean;
  value?: GraphDocument;
  error?: { code: string; message: string };
}