import {
  componentTerminals,
  isElectricalComponentType
} from '../world/components.ts';
import type {
  Component,
  EntityId,
  ResistorComponent,
  SwitchComponent,
  VoltageSourceComponent,
  WorldEntity
} from '../world/types.ts';
import { ELECTRICAL_CODES, terminalKey } from './types.ts';
import type {
  ElectricalDiagnostic,
  ElectricalDocument,
  TerminalRef
} from './types.ts';

const GROUND_KEY = '__simuforge_ground__';

export interface ElectricalComponentInfo {
  entityId: EntityId;
  componentId: string;
  type: string;
  enabled: boolean;
  component: Component;
  terminalKeys: string[];
}

export interface NetlistTerminal {
  key: string;
  entityId: EntityId;
  componentId: string;
  terminalId: string;
  net: number;
}

export interface NetlistBranch {
  kind: 'resistor' | 'voltageSource';
  entityId: EntityId;
  componentId: string;
  fromTerminal: string;
  toTerminal: string;
  fromNet: number;
  toNet: number;
  /** Resistance in ohms for a resistor, voltage in volts for a source. */
  value: number;
}

export interface Netlist {
  /** Terminal keys per net. Net 0 is the reference net. */
  nets: string[][];
  terminals: NetlistTerminal[];
  branches: NetlistBranch[];
  voltageSources: NetlistBranch[];
  components: ElectricalComponentInfo[];
}

export type NetlistResult =
  | { ok: true; netlist: Netlist }
  | { ok: false; diagnostics: ElectricalDiagnostic[] };

class UnionFind {
  private readonly parent = new Map<string, string>();

  ensure(key: string): void {
    if (!this.parent.has(key)) {
      this.parent.set(key, key);
    }
  }

  find(key: string): string {
    this.ensure(key);
    let root = key;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root) as string;
    }
    let current = key;
    while (current !== root) {
      const next = this.parent.get(current) as string;
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  /** Deterministic union: the lexicographically smaller root wins. */
  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) {
      return;
    }
    if (rootA < rootB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootA, rootB);
    }
  }
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function collectComponents(entities: readonly WorldEntity[]): ElectricalComponentInfo[] {
  const result: ElectricalComponentInfo[] = [];
  const sortedEntities = entities.slice().sort((a, b) => compareIds(a.id, b.id));
  for (const entity of sortedEntities) {
    const components = (entity.components ?? []).slice().sort((a, b) => compareIds(a.id, b.id));
    for (const component of components) {
      if (!isElectricalComponentType(component.type)) {
        continue;
      }
      result.push({
        entityId: entity.id,
        componentId: component.id,
        type: component.type,
        enabled: component.enabled,
        component,
        terminalKeys: componentTerminals(component.type).map((terminal) =>
          terminalKey({ entityId: entity.id, componentId: component.id, terminalId: terminal.id })
        )
      });
    }
  }
  return result;
}

function terminalRefKey(ref: TerminalRef): string {
  return terminalKey(ref);
}

function validateComponentValue(component: ElectricalComponentInfo): ElectricalDiagnostic | null {
  if (component.type === 'resistor') {
    const resistance = (component.component as ResistorComponent).resistance;
    if (!Number.isFinite(resistance) || resistance <= 0) {
      return {
        code: ELECTRICAL_CODES.INVALID_COMPONENT,
        severity: 'error',
        message: `Resistor ${component.componentId} has an invalid resistance.`,
        entityId: component.entityId,
        componentId: component.componentId
      };
    }
  }
  if (component.type === 'voltageSource') {
    const voltage = (component.component as VoltageSourceComponent).voltage;
    if (!Number.isFinite(voltage)) {
      return {
        code: ELECTRICAL_CODES.INVALID_COMPONENT,
        severity: 'error',
        message: `Voltage source ${component.componentId} has an invalid voltage.`,
        entityId: component.entityId,
        componentId: component.componentId
      };
    }
  }
  if (component.type === 'switch') {
    if (typeof (component.component as SwitchComponent).closed !== 'boolean') {
      return {
        code: ELECTRICAL_CODES.INVALID_COMPONENT,
        severity: 'error',
        message: `Switch ${component.componentId} has an invalid state.`,
        entityId: component.entityId,
        componentId: component.componentId
      };
    }
  }
  return null;
}

/**
 * Builds a deterministic DC netlist from authored entities and wires.
 *
 * Wires, closed switches, and ground terminals are unioned into nets; resistors
 * and ideal voltage sources become branches for Modified Nodal Analysis.
 * Validation diagnostics are returned instead of throwing, so an invalid
 * authored circuit can disable solving without blocking Play (D-P08-06).
 */
export function buildNetlist(
  entities: readonly WorldEntity[],
  electrical: ElectricalDocument | null | undefined
): NetlistResult {
  const components = collectComponents(entities);
  if (components.length === 0) {
    return {
      ok: true,
      netlist: { nets: [], terminals: [], branches: [], voltageSources: [], components }
    };
  }

  const diagnostics: ElectricalDiagnostic[] = [];
  const terminalByKey = new Map<string, { component: ElectricalComponentInfo; terminalId: string }>();
  for (const component of components) {
    for (const key of component.terminalKeys) {
      const terminalId = key.slice(key.lastIndexOf('/') + 1);
      terminalByKey.set(key, { component, terminalId });
    }
  }

  const unionFind = new UnionFind();
  for (const key of terminalByKey.keys()) {
    unionFind.ensure(key);
  }
  unionFind.ensure(GROUND_KEY);

  let groundCount = 0;
  for (const component of components) {
    if (component.enabled && component.type === 'ground') {
      const key = component.terminalKeys[0];
      if (key) {
        unionFind.union(key, GROUND_KEY);
        groundCount += 1;
      }
    }
  }

  for (const wire of electrical?.wires ?? []) {
    const fromKey = terminalRefKey(wire.from);
    const toKey = terminalRefKey(wire.to);
    if (!terminalByKey.has(fromKey) || !terminalByKey.has(toKey)) {
      // Validation already reports unknown terminals; keep this guard so a
      // malformed document can never crash netlist construction.
      continue;
    }
    unionFind.union(fromKey, toKey);
  }

  for (const component of components) {
    if (!component.enabled || component.type !== 'switch') {
      continue;
    }
    if ((component.component as SwitchComponent).closed) {
      const [a, b] = component.terminalKeys;
      if (a && b) {
        unionFind.union(a, b);
      }
    }
  }

  if (groundCount === 0) {
    diagnostics.push({
      code: ELECTRICAL_CODES.NO_GROUND,
      severity: 'error',
      message: 'The circuit has no enabled ground reference.'
    });
    return { ok: false, diagnostics };
  }

  const groups = new Map<string, string[]>();
  for (const key of terminalByKey.keys()) {
    const root = unionFind.find(key);
    const group = groups.get(root);
    if (group) {
      group.push(key);
    } else {
      groups.set(root, [key]);
    }
  }

  const referenceRoot = unionFind.find(GROUND_KEY);
  const referenceGroup = groups.get(referenceRoot) ?? [];
  const otherGroups = [...groups.entries()]
    .filter(([root]) => root !== referenceRoot)
    .map(([, keys]) => keys.slice().sort(compareIds))
    .sort((a, b) => compareIds(a[0] ?? '', b[0] ?? ''));

  const nets: string[][] = [referenceGroup.slice().sort(compareIds), ...otherGroups];
  const netByRoot = new Map<string, number>();
  netByRoot.set(referenceRoot, 0);
  let nextNet = 1;
  for (const [root] of [...groups.entries()]
    .filter(([root]) => root !== referenceRoot)
    .sort((a, b) => compareIds((a[1][0] ?? ''), (b[1][0] ?? '')))) {
    netByRoot.set(root, nextNet);
    nextNet += 1;
  }

  const terminals: NetlistTerminal[] = [];
  for (const [key, terminal] of terminalByKey) {
    terminals.push({
      key,
      entityId: terminal.component.entityId,
      componentId: terminal.component.componentId,
      terminalId: terminal.terminalId,
      net: netByRoot.get(unionFind.find(key)) ?? 0
    });
  }
  terminals.sort((a, b) => compareIds(a.key, b.key));

  const branches: NetlistBranch[] = [];
  const voltageSources: NetlistBranch[] = [];
  const sourcePairs = new Map<string, NetlistBranch[]>();

  for (const component of components) {
    const invalid = validateComponentValue(component);
    if (invalid) {
      diagnostics.push(invalid);
      continue;
    }
    if (!component.enabled) {
      continue;
    }
    if (component.type === 'resistor') {
      const [a, b] = component.terminalKeys;
      if (!a || !b) {
        continue;
      }
      const fromNet = netByRoot.get(unionFind.find(a)) ?? 0;
      const toNet = netByRoot.get(unionFind.find(b)) ?? 0;
      branches.push({
        kind: 'resistor',
        entityId: component.entityId,
        componentId: component.componentId,
        fromTerminal: a,
        toTerminal: b,
        fromNet,
        toNet,
        value: (component.component as ResistorComponent).resistance
      });
    } else if (component.type === 'voltageSource') {
      const [positive, negative] = component.terminalKeys;
      if (!positive || !negative) {
        continue;
      }
      const fromNet = netByRoot.get(unionFind.find(positive)) ?? 0;
      const toNet = netByRoot.get(unionFind.find(negative)) ?? 0;
      if (fromNet === toNet) {
        diagnostics.push({
          code: ELECTRICAL_CODES.SHORTED_SOURCE,
          severity: 'error',
          message: `Voltage source ${component.componentId} is shorted by its own connections.`,
          entityId: component.entityId,
          componentId: component.componentId
        });
        continue;
      }
      const branch: NetlistBranch = {
        kind: 'voltageSource',
        entityId: component.entityId,
        componentId: component.componentId,
        fromTerminal: positive,
        toTerminal: negative,
        fromNet,
        toNet,
        value: (component.component as VoltageSourceComponent).voltage
      };
      branches.push(branch);
      voltageSources.push(branch);
      const pairKey = fromNet < toNet ? `${fromNet}|${toNet}` : `${toNet}|${fromNet}`;
      const pair = sourcePairs.get(pairKey);
      if (pair) {
        pair.push(branch);
      } else {
        sourcePairs.set(pairKey, [branch]);
      }
    }
  }

  for (const pair of sourcePairs.values()) {
    if (pair.length > 1) {
      const first = pair[0] as NetlistBranch;
      diagnostics.push({
        code: ELECTRICAL_CODES.PARALLEL_SOURCES,
        severity: 'error',
        message: `Ideal voltage sources are connected in parallel between nets ${first.fromNet} and ${first.toNet}.`,
        entityId: first.entityId,
        componentId: first.componentId
      });
    }
  }

  // Every net must be reachable from the reference through a resistor or source.
  const adjacency = new Map<number, number[]>();
  for (let index = 0; index < nets.length; index += 1) {
    adjacency.set(index, []);
  }
  for (const branch of branches) {
    if (branch.fromNet === branch.toNet) {
      continue;
    }
    adjacency.get(branch.fromNet)?.push(branch.toNet);
    adjacency.get(branch.toNet)?.push(branch.fromNet);
  }
  const visited = new Set<number>([0]);
  const queue = [0];
  while (queue.length > 0) {
    const current = queue.shift() as number;
    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  for (let index = 0; index < nets.length; index += 1) {
    if (!visited.has(index)) {
      const keys = nets[index] ?? [];
      diagnostics.push({
        code: ELECTRICAL_CODES.FLOATING_NET,
        severity: 'error',
        message: `Net ${index} has no DC path to ground (${keys.length} terminal(s)).`,
        ...(keys[0] ? { terminalId: keys[0] } : {})
      });
    }
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    return { ok: false, diagnostics };
  }

  return {
    ok: true,
    netlist: {
      nets,
      terminals,
      branches,
      voltageSources,
      components
    }
  };
}
