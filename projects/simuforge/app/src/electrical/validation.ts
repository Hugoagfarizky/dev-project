import { componentTerminals } from '../world/components.ts';
import type { WorldEntity } from '../world/types.ts';
import {
  ELECTRICAL_CODES,
  ELECTRICAL_FORMAT,
  ELECTRICAL_SCHEMA_VERSION,
  layoutKey,
  sortElectricalDocument
} from './types.ts';
import type {
  ElectricalDiagnostic,
  ElectricalDocument,
  ElectricalLayoutEntry,
  TerminalRef,
  Wire
} from './types.ts';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ElectricalValidationResult {
  /** Normalized document, or null when the section is absent or unusable. */
  value: ElectricalDocument | null;
  /** Structural problems that caused data to be dropped. */
  warnings: string[];
  /** Semantic problems that disable electrical solving but keep the data. */
  diagnostics: ElectricalDiagnostic[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

interface ComponentLookup {
  entityId: string;
  componentId: string;
  type: string;
}

function buildLookup(entities: readonly WorldEntity[]): Map<string, Map<string, ComponentLookup>> {
  const byEntity = new Map<string, Map<string, ComponentLookup>>();
  for (const entity of entities) {
    const components = new Map<string, ComponentLookup>();
    for (const component of entity.components ?? []) {
      components.set(component.id, {
        entityId: entity.id,
        componentId: component.id,
        type: component.type
      });
    }
    byEntity.set(entity.id, components);
  }
  return byEntity;
}

function readTerminal(value: unknown): TerminalRef | null {
  if (!isPlainObject(value)) {
    return null;
  }
  if (
    typeof value.entityId !== 'string' ||
    typeof value.componentId !== 'string' ||
    typeof value.terminalId !== 'string'
  ) {
    return null;
  }
  return {
    entityId: value.entityId,
    componentId: value.componentId,
    terminalId: value.terminalId
  };
}

function terminalExists(
  ref: TerminalRef,
  lookup: Map<string, Map<string, ComponentLookup>>
): boolean {
  const component = lookup.get(ref.entityId)?.get(ref.componentId);
  if (!component) {
    return false;
  }
  return componentTerminals(component.type).some((terminal) => terminal.id === ref.terminalId);
}

function sameTerminal(a: TerminalRef, b: TerminalRef): boolean {
  return a.entityId === b.entityId && a.componentId === b.componentId && a.terminalId === b.terminalId;
}

function unorderedWireKey(wire: Wire): string {
  const from = `${wire.from.entityId}/${wire.from.componentId}/${wire.from.terminalId}`;
  const to = `${wire.to.entityId}/${wire.to.componentId}/${wire.to.terminalId}`;
  return from < to ? `${from}|${to}` : `${to}|${from}`;
}

/**
 * Validates the optional `electrical` project section.
 *
 * Structural corruption is dropped with a warning so a project still opens.
 * Semantically invalid connections are retained and reported as diagnostics so
 * the authored circuit is never silently discarded (D-P08-03, D-P08-06).
 */
export function validateElectricalDocument(
  value: unknown,
  entities: readonly WorldEntity[]
): ElectricalValidationResult {
  if (value === undefined || value === null) {
    return { value: null, warnings: [], diagnostics: [] };
  }

  if (!isPlainObject(value)) {
    return {
      value: null,
      warnings: [`${ELECTRICAL_CODES.INVALID_SECTION}: electrical must be an object or null`],
      diagnostics: []
    };
  }

  if (value.format !== ELECTRICAL_FORMAT) {
    return {
      value: null,
      warnings: [`${ELECTRICAL_CODES.INVALID_SECTION}: format must be "${ELECTRICAL_FORMAT}"`],
      diagnostics: []
    };
  }

  if (value.schemaVersion !== ELECTRICAL_SCHEMA_VERSION) {
    return {
      value: null,
      warnings: [`${ELECTRICAL_CODES.INVALID_SECTION}: schemaVersion must be ${ELECTRICAL_SCHEMA_VERSION}`],
      diagnostics: []
    };
  }

  if (!Array.isArray(value.wires)) {
    return {
      value: null,
      warnings: [`${ELECTRICAL_CODES.INVALID_SECTION}: wires must be an array`],
      diagnostics: []
    };
  }

  const lookup = buildLookup(entities);
  const warnings: string[] = [];
  const diagnostics: ElectricalDiagnostic[] = [];
  const wires: Wire[] = [];
  const wireIds = new Set<string>();
  const wirePairs = new Set<string>();

  for (let index = 0; index < value.wires.length; index += 1) {
    const candidate = value.wires[index];
    if (!isPlainObject(candidate)) {
      warnings.push(`${ELECTRICAL_CODES.INVALID_WIRE}: wires[${index}] must be an object`);
      continue;
    }
    if (typeof candidate.id !== 'string' || !UUID_V4_PATTERN.test(candidate.id)) {
      warnings.push(`${ELECTRICAL_CODES.INVALID_WIRE}: wires[${index}].id must be a UUID v4 string`);
      continue;
    }
    if (wireIds.has(candidate.id)) {
      warnings.push(`${ELECTRICAL_CODES.DUPLICATE_WIRE_ID}: wire ${candidate.id} is duplicated`);
      continue;
    }
    const from = readTerminal(candidate.from);
    const to = readTerminal(candidate.to);
    if (!from || !to) {
      warnings.push(`${ELECTRICAL_CODES.INVALID_WIRE}: wire ${candidate.id} has an invalid terminal reference`);
      continue;
    }

    wireIds.add(candidate.id);
    const wire: Wire = { id: candidate.id, from, to };
    wires.push(wire);

    if (!terminalExists(from, lookup)) {
      diagnostics.push({
        code: ELECTRICAL_CODES.UNKNOWN_TERMINAL,
        severity: 'error',
        message: `Wire ${wire.id} references an unknown terminal ${from.entityId}/${from.componentId}/${from.terminalId}.`,
        wireId: wire.id,
        entityId: from.entityId,
        componentId: from.componentId,
        terminalId: from.terminalId
      });
    }
    if (!terminalExists(to, lookup)) {
      diagnostics.push({
        code: ELECTRICAL_CODES.UNKNOWN_TERMINAL,
        severity: 'error',
        message: `Wire ${wire.id} references an unknown terminal ${to.entityId}/${to.componentId}/${to.terminalId}.`,
        wireId: wire.id,
        entityId: to.entityId,
        componentId: to.componentId,
        terminalId: to.terminalId
      });
    }

    if (sameTerminal(from, to)) {
      diagnostics.push({
        code: ELECTRICAL_CODES.SELF_WIRE,
        severity: 'warning',
        message: `Wire ${wire.id} connects a terminal to itself.`,
        wireId: wire.id
      });
    }

    const pairKey = unorderedWireKey(wire);
    if (wirePairs.has(pairKey)) {
      diagnostics.push({
        code: ELECTRICAL_CODES.DUPLICATE_WIRE,
        severity: 'warning',
        message: `Wire ${wire.id} duplicates an existing terminal connection.`,
        wireId: wire.id
      });
    } else {
      wirePairs.add(pairKey);
    }
  }

  const layout: ElectricalLayoutEntry[] = [];
  const layoutKeys = new Set<string>();
  if (value.layout !== undefined && value.layout !== null) {
    if (!Array.isArray(value.layout)) {
      warnings.push(`${ELECTRICAL_CODES.INVALID_LAYOUT}: layout must be an array`);
    } else {
      for (let index = 0; index < value.layout.length; index += 1) {
        const candidate = value.layout[index];
        if (!isPlainObject(candidate)) {
          warnings.push(`${ELECTRICAL_CODES.INVALID_LAYOUT}: layout[${index}] must be an object`);
          continue;
        }
        if (
          typeof candidate.entityId !== 'string' ||
          typeof candidate.componentId !== 'string' ||
          !isFiniteNumber(candidate.x) ||
          !isFiniteNumber(candidate.y)
        ) {
          warnings.push(`${ELECTRICAL_CODES.INVALID_LAYOUT}: layout[${index}] is malformed`);
          continue;
        }
        if (!lookup.get(candidate.entityId)?.has(candidate.componentId)) {
          warnings.push(`${ELECTRICAL_CODES.INVALID_LAYOUT}: layout[${index}] references a missing component`);
          continue;
        }
        const key = layoutKey(candidate.entityId, candidate.componentId);
        if (layoutKeys.has(key)) {
          warnings.push(`${ELECTRICAL_CODES.INVALID_LAYOUT}: layout for ${key} is duplicated`);
          continue;
        }
        layoutKeys.add(key);
        layout.push({
          entityId: candidate.entityId,
          componentId: candidate.componentId,
          x: candidate.x,
          y: candidate.y
        });
      }
    }
  }

  return {
    value: sortElectricalDocument({
      format: ELECTRICAL_FORMAT,
      schemaVersion: ELECTRICAL_SCHEMA_VERSION,
      wires,
      layout
    }),
    warnings,
    diagnostics
  };
}
