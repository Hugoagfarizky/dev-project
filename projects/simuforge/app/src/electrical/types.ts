import type { ComponentId, EntityId } from '../world/types.ts';

export const ELECTRICAL_FORMAT = 'simuforge.electrical';
export const ELECTRICAL_SCHEMA_VERSION = 1;

export type TerminalId = string;

/** Stable reference to one terminal of one component on one entity. */
export interface TerminalRef {
  entityId: EntityId;
  componentId: ComponentId;
  terminalId: TerminalId;
}

/** An authored terminal-to-terminal connection. */
export interface Wire {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
}

/** Authored schematic position for one electrical component. */
export interface ElectricalLayoutEntry {
  entityId: EntityId;
  componentId: ComponentId;
  x: number;
  y: number;
}

/**
 * Phase 08 optional project section. Components stay on world entities; only
 * connections and schematic layout live here (D-P08-03).
 */
export interface ElectricalDocument {
  format: typeof ELECTRICAL_FORMAT;
  schemaVersion: typeof ELECTRICAL_SCHEMA_VERSION;
  wires: Wire[];
  layout: ElectricalLayoutEntry[];
}

export type ElectricalDiagnosticSeverity = 'error' | 'warning';

export interface ElectricalDiagnostic {
  code: string;
  severity: ElectricalDiagnosticSeverity;
  message: string;
  wireId?: string;
  entityId?: string;
  componentId?: string;
  terminalId?: string;
}

export const ELECTRICAL_CODES = {
  INVALID_SECTION: 'ELECTRICAL_INVALID_SECTION',
  INVALID_WIRE: 'ELECTRICAL_INVALID_WIRE',
  DUPLICATE_WIRE_ID: 'ELECTRICAL_DUPLICATE_WIRE_ID',
  UNKNOWN_TERMINAL: 'ELECTRICAL_UNKNOWN_TERMINAL',
  SELF_WIRE: 'ELECTRICAL_SELF_WIRE',
  DUPLICATE_WIRE: 'ELECTRICAL_DUPLICATE_WIRE',
  INVALID_LAYOUT: 'ELECTRICAL_INVALID_LAYOUT',
  NO_GROUND: 'ELECTRICAL_NO_GROUND',
  FLOATING_NET: 'ELECTRICAL_FLOATING_NET',
  SHORTED_SOURCE: 'ELECTRICAL_SHORTED_SOURCE',
  PARALLEL_SOURCES: 'ELECTRICAL_PARALLEL_SOURCES',
  INVALID_COMPONENT: 'ELECTRICAL_INVALID_COMPONENT',
  SINGULAR: 'ELECTRICAL_SINGULAR',
  NUMERIC_FAILURE: 'ELECTRICAL_NUMERIC_FAILURE',
  SOLVE_FAILED: 'ELECTRICAL_SOLVE_FAILED',
  INVALID_CIRCUIT: 'ELECTRICAL_INVALID_CIRCUIT',
  SOLVED: 'ELECTRICAL_SOLVED'
} as const;

export function terminalKey(ref: TerminalRef): string {
  return `${ref.entityId}/${ref.componentId}/${ref.terminalId}`;
}

export function layoutKey(entityId: string, componentId: string): string {
  return `${entityId}/${componentId}`;
}

export function createEmptyElectricalDocument(): ElectricalDocument {
  return {
    format: ELECTRICAL_FORMAT,
    schemaVersion: ELECTRICAL_SCHEMA_VERSION,
    wires: [],
    layout: []
  };
}

export function sortElectricalDocument(document: ElectricalDocument): ElectricalDocument {
  return {
    ...document,
    wires: document.wires.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    layout: document.layout
      .slice()
      .sort((a, b) => {
        const left = layoutKey(a.entityId, a.componentId);
        const right = layoutKey(b.entityId, b.componentId);
        return left < right ? -1 : left > right ? 1 : 0;
      })
  };
}
