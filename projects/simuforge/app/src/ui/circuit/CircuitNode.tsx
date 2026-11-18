import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { CircuitNodeData } from './adapter.js';
import {
  componentTerminals,
  isResistorComponent,
  isSwitchComponent,
  isVoltageSourceComponent
} from '../../world/components.ts';

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.001) {
    return value.toExponential(2);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function authoredSummary(data: CircuitNodeData): string {
  const component = data.component;
  if (isVoltageSourceComponent(component)) {
    return `${formatNumber(component.voltage)} V`;
  }
  if (isResistorComponent(component)) {
    return `${formatNumber(component.resistance)} Ω`;
  }
  if (isSwitchComponent(component)) {
    return component.closed ? 'Closed' : 'Open';
  }
  return '0 V reference';
}

function liveSummary(data: CircuitNodeData): string | null {
  if (data.status === null) {
    return null;
  }
  if (data.status === 'disabled') {
    return 'Disabled';
  }
  if (data.status === 'reference') {
    return '0 V · reference';
  }
  if (data.status === 'open') {
    return `${formatNumber(data.voltage ?? 0)} V · open`;
  }

  const parts = [`${formatNumber(data.voltage ?? 0)} V`];
  if (data.current !== null) {
    parts.push(`${formatNumber(data.current * 1000)} mA`);
  }
  if (data.power !== null) {
    parts.push(`${formatNumber(data.power * 1000)} mW`);
  }
  return parts.join(' · ');
}

function handlePosition(index: number, total: number): Position {
  if (total === 1) {
    return Position.Bottom;
  }
  return index === 0 ? Position.Left : Position.Right;
}

export function CircuitNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as CircuitNodeData;
  const terminals = componentTerminals(nodeData.component.type);
  const live = liveSummary(nodeData);

  return (
    <div
      className={`sf-circuit-node sf-circuit-node-${nodeData.status ?? 'idle'} ${selected ? 'sf-circuit-node-selected' : ''}`.trim()}
      data-testid={`circuit-node-${nodeData.componentId}`}
    >
      {terminals.map((terminal, index) => (
        <Handle
          key={terminal.id}
          id={terminal.id}
          type="source"
          position={handlePosition(index, terminals.length)}
          isConnectable={!nodeData.locked}
          title={terminal.label}
        />
      ))}
      <div className="sf-circuit-node-title">{nodeData.label}</div>
      <div className="sf-circuit-node-value">{authoredSummary(nodeData)}</div>
      {live ? <div className="sf-circuit-node-live">{live}</div> : null}
    </div>
  );
}
