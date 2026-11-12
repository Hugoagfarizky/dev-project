import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { GraphEditorNodeData } from '../../graph/adapter.js';
import { getNodePortDefinitions } from '../../graph/nodes.js';
import type { GraphNode } from '../../graph/types.js';

function formatVec3(vector: { x: number; y: number; z: number }): string {
  return `${vector.x}, ${vector.y}, ${vector.z}`;
}

function configSummary(node: GraphNode): string {
  switch (node.config.kind) {
    case 'onStart':
      return 'Runs when the program starts';
    case 'manualTrigger':
      return 'Runs on manual trigger';
    case 'onPlaneContact':
      return `Target: ${node.config.targetEntityId || '(none)'}`;
    case 'applyForce':
      return `Target: ${node.config.targetEntityId || '(none)'} · Force (${formatVec3(node.config.force)})`;
    case 'applyImpulse':
      return `Target: ${node.config.targetEntityId || '(none)'} · Impulse (${formatVec3(node.config.impulse)})`;
    case 'clearForce':
      return `Target: ${node.config.targetEntityId || '(none)'}`;
  }
}

export function GraphNodeRenderer({ data, selected }: NodeProps) {
  const editorData = data as unknown as GraphEditorNodeData;
  const node = editorData.node;
  const hasError = editorData.diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  const ports = getNodePortDefinitions(node.type);

  return (
    <div
      className={`sf-graph-node ${selected ? 'sf-graph-node-selected' : ''} ${hasError ? 'sf-graph-node-error' : ''}`.trim()}
      onClick={() => {
        (editorData.store as { dispatch: (command: unknown) => void } | undefined)?.dispatch({ type: 'graph/select-node', nodeId: editorData.node.id });
      }}
      style={{ pointerEvents: 'all', cursor: 'pointer' }}
    >
      {ports
        .filter((port) => port.direction === 'input')
        .map((port) => (
          <Handle
            key={port.id}
            id={port.id}
            type="target"
            position={Position.Left}
          />
        ))}
      <div className="sf-graph-node-title">{node.type}</div>
      <div className="sf-graph-node-id" title={node.id}>{node.id}</div>
      <div className="sf-graph-node-config">{configSummary(node)}</div>
      {hasError ? (
        <div className="sf-graph-node-diagnostic">{editorData.diagnostics[0]?.message}</div>
      ) : null}
      {ports
        .filter((port) => port.direction === 'output')
        .map((port) => (
          <Handle
            key={port.id}
            id={port.id}
            type="source"
            position={Position.Right}
          />
        ))}
    </div>
  );
}
