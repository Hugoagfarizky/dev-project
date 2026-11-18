import { ELECTRICAL_CODES } from './types.ts';
import type { ElectricalDiagnostic } from './types.ts';
import type { Netlist, NetlistBranch } from './netlist.ts';

export interface NodeResult {
  net: number;
  voltage: number;
  terminals: string[];
}

export interface BranchResult {
  kind: 'resistor' | 'voltageSource';
  entityId: string;
  componentId: string;
  fromNet: number;
  toNet: number;
  /** Voltage from the branch's first terminal to its second terminal. */
  voltage: number;
  /** Current from the first terminal to the second terminal through the branch. */
  current: number;
  /** Signed power V * I. A resistor dissipates positive power. */
  power: number;
}

export type ComponentSolutionStatus = 'solved' | 'open' | 'reference' | 'disabled';

export interface ComponentResult {
  entityId: string;
  componentId: string;
  type: string;
  status: ComponentSolutionStatus;
  voltage: number | null;
  current: number | null;
  power: number | null;
}

export interface CircuitSolution {
  nets: NodeResult[];
  branches: BranchResult[];
  components: ComponentResult[];
  /** Number of elimination columns processed; useful for evidence. */
  iterations: number;
}

export type SolveResult =
  | { ok: true; solution: CircuitSolution }
  | { ok: false; diagnostics: ElectricalDiagnostic[] };

interface LinearSolveResult {
  ok: boolean;
  values?: number[];
}

function solveLinearSystem(matrix: number[][], rhs: number[]): LinearSolveResult {
  const size = matrix.length;
  if (size === 0) {
    return { ok: true, values: [] };
  }

  const augmented = matrix.map((row, index) => [...row, rhs[index] as number]);
  let scale = 0;
  for (const row of matrix) {
    for (const value of row) {
      scale = Math.max(scale, Math.abs(value));
    }
  }
  const tolerance = 1e-12 * Math.max(1, scale);

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    let pivotValue = Math.abs(augmented[column]?.[column] ?? 0);
    for (let row = column + 1; row < size; row += 1) {
      const candidate = Math.abs(augmented[row]?.[column] ?? 0);
      if (candidate > pivotValue) {
        pivotValue = candidate;
        pivotRow = row;
      }
    }

    if (!Number.isFinite(pivotValue) || pivotValue <= tolerance) {
      return { ok: false };
    }

    if (pivotRow !== column) {
      const swap = augmented[column] as number[];
      augmented[column] = augmented[pivotRow] as number[];
      augmented[pivotRow] = swap;
    }

    const pivot = augmented[column]?.[column] as number;
    for (let row = column + 1; row < size; row += 1) {
      const factor = (augmented[row]?.[column] as number) / pivot;
      if (factor === 0) {
        continue;
      }
      for (let inner = column; inner <= size; inner += 1) {
        (augmented[row] as number[])[inner] =
          (augmented[row]?.[inner] as number) - factor * (augmented[column]?.[inner] as number);
      }
    }
  }

  const values = new Array<number>(size).fill(0);
  for (let row = size - 1; row >= 0; row -= 1) {
    let sum = augmented[row]?.[size] as number;
    for (let column = row + 1; column < size; column += 1) {
      sum -= (augmented[row]?.[column] as number) * (values[column] as number);
    }
    const diagonal = augmented[row]?.[row] as number;
    if (!Number.isFinite(diagonal) || Math.abs(diagonal) <= tolerance) {
      return { ok: false };
    }
    values[row] = sum / diagonal;
  }

  if (values.some((value) => !Number.isFinite(value))) {
    return { ok: false };
  }
  return { ok: true, values };
}

function sourceBranchIndex(branch: NetlistBranch, sources: readonly NetlistBranch[]): number {
  return sources.findIndex(
    (candidate) =>
      candidate.entityId === branch.entityId && candidate.componentId === branch.componentId
  );
}

/**
 * Solves a DC netlist with Modified Nodal Analysis.
 *
 * Unknowns are the non-reference node voltages followed by one current unknown
 * per ideal voltage source. The solver is deterministic: net order comes from
 * the netlist builder and partial pivoting keeps the lowest row on ties.
 *
 * The source current unknown follows the standard MNA convention: it is the
 * current flowing from the positive terminal to the negative terminal *through*
 * the source. `power = V * I` is therefore negative when a source delivers
 * power and positive when it absorbs power.
 */
export function solveCircuit(netlist: Netlist): SolveResult {
  const netCount = netlist.nets.length;
  if (netCount === 0) {
    return {
      ok: true,
      solution: { nets: [], branches: [], components: [], iterations: 0 }
    };
  }

  const sources = netlist.voltageSources;
  const size = netCount - 1 + sources.length;
  const matrix: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const rhs = new Array<number>(size).fill(0);

  for (const branch of netlist.branches) {
    if (branch.kind !== 'resistor' || branch.fromNet === branch.toNet) {
      continue;
    }
    const conductance = 1 / branch.value;
    const from = branch.fromNet - 1;
    const to = branch.toNet - 1;
    if (from >= 0) {
      (matrix[from] as number[])[from] = (matrix[from]?.[from] as number) + conductance;
    }
    if (to >= 0) {
      (matrix[to] as number[])[to] = (matrix[to]?.[to] as number) + conductance;
    }
    if (from >= 0 && to >= 0) {
      (matrix[from] as number[])[to] = (matrix[from]?.[to] as number) - conductance;
      (matrix[to] as number[])[from] = (matrix[to]?.[from] as number) - conductance;
    }
  }

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index] as NetlistBranch;
    const row = netCount - 1 + index;
    const positive = source.fromNet - 1;
    const negative = source.toNet - 1;
    if (positive >= 0) {
      (matrix[positive] as number[])[row] = (matrix[positive]?.[row] as number) + 1;
      (matrix[row] as number[])[positive] = (matrix[row]?.[positive] as number) + 1;
    }
    if (negative >= 0) {
      (matrix[negative] as number[])[row] = (matrix[negative]?.[row] as number) - 1;
      (matrix[row] as number[])[negative] = (matrix[row]?.[negative] as number) - 1;
    }
    (rhs as number[])[row] = source.value;
  }

  const linear = solveLinearSystem(matrix, rhs);
  if (!linear.ok || !linear.values) {
    return {
      ok: false,
      diagnostics: [
        {
          code: ELECTRICAL_CODES.SINGULAR,
          severity: 'error',
          message: 'The circuit equations are singular. Check for floating nodes or conflicting ideal sources.'
        }
      ]
    };
  }

  const nodeVoltages = new Array<number>(netCount).fill(0);
  for (let index = 1; index < netCount; index += 1) {
    nodeVoltages[index] = linear.values[index - 1] as number;
  }
  if (nodeVoltages.some((value) => !Number.isFinite(value))) {
    return {
      ok: false,
      diagnostics: [
        {
          code: ELECTRICAL_CODES.NUMERIC_FAILURE,
          severity: 'error',
          message: 'The circuit solution contains non-finite values.'
        }
      ]
    };
  }

  const branchResults: BranchResult[] = [];
  for (const branch of netlist.branches) {
    const fromVoltage = nodeVoltages[branch.fromNet] as number;
    const toVoltage = nodeVoltages[branch.toNet] as number;
    const voltage = fromVoltage - toVoltage;
    let current = 0;
    if (branch.kind === 'resistor') {
      current = branch.fromNet === branch.toNet ? 0 : voltage / branch.value;
    } else {
      const index = sourceBranchIndex(branch, sources);
      current = index >= 0 ? (linear.values[netCount - 1 + index] as number) : 0;
    }
    branchResults.push({
      kind: branch.kind,
      entityId: branch.entityId,
      componentId: branch.componentId,
      fromNet: branch.fromNet,
      toNet: branch.toNet,
      voltage,
      current,
      power: voltage * current
    });
  }

  const terminalNet = new Map<string, number>();
  for (const terminal of netlist.terminals) {
    terminalNet.set(terminal.key, terminal.net);
  }

  const componentResults: ComponentResult[] = [];
  for (const component of netlist.components) {
    const branch = branchResults.find(
      (candidate) =>
        candidate.entityId === component.entityId &&
        candidate.componentId === component.componentId
    );
    if (branch) {
      componentResults.push({
        entityId: component.entityId,
        componentId: component.componentId,
        type: component.type,
        status: 'solved',
        voltage: branch.voltage,
        current: branch.current,
        power: branch.power
      });
      continue;
    }

    if (component.type === 'ground') {
      componentResults.push({
        entityId: component.entityId,
        componentId: component.componentId,
        type: component.type,
        status: component.enabled ? 'reference' : 'disabled',
        voltage: component.enabled ? 0 : null,
        current: component.enabled ? 0 : null,
        power: component.enabled ? 0 : null
      });
      continue;
    }

    if (component.type === 'switch') {
      const [a, b] = component.terminalKeys;
      const aNet = a ? terminalNet.get(a) : undefined;
      const bNet = b ? terminalNet.get(b) : undefined;
      const voltage =
        aNet !== undefined && bNet !== undefined
          ? (nodeVoltages[aNet] as number) - (nodeVoltages[bNet] as number)
          : null;
      const closed = (component.component as { closed?: unknown }).closed === true;
      componentResults.push({
        entityId: component.entityId,
        componentId: component.componentId,
        type: component.type,
        status: component.enabled ? (closed ? 'solved' : 'open') : 'disabled',
        voltage: component.enabled ? voltage : null,
        current: component.enabled ? (closed ? null : 0) : null,
        power: component.enabled ? (closed ? null : 0) : null
      });
      continue;
    }

    componentResults.push({
      entityId: component.entityId,
      componentId: component.componentId,
      type: component.type,
      status: 'disabled',
      voltage: null,
      current: null,
      power: null
    });
  }

  return {
    ok: true,
    solution: {
      nets: netlist.nets.map((terminals, net) => ({
        net,
        voltage: nodeVoltages[net] as number,
        terminals
      })),
      branches: branchResults,
      components: componentResults,
      iterations: size
    }
  };
}
