import type { NodeProps } from '@xyflow/react';
import type { GraphEditorNodeData } from '../../graph/adapter.js';

export function GraphNodeRenderer({ data, selected }: NodeProps) {
  const editorData = data as unknown as GraphEditorNodeData;
  const node = editorData.node;
  const hasError = editorData.diagnostics.some((diagnostic) => diagnostic.severity === 'error');

  return (
    <div
      className={`sf-graph-node ${selected ? 'sf-graph-node-selected' : ''} ${hasError ? 'sf-graph-node-error' : ''}`.trim()}
      onClick={() => {
        (editorData.store as { dispatch: (command: unknown) => void } | undefined)?.dispatch({ type: 'graph/select-node', nodeId: editorData.node.id });
      }}
      style={{ pointerEvents: 'all', cursor: 'pointer' }}
    >
      <div className="sf-graph-node-title">{node.type}</div>
      <div className="sf-graph-node-id">{node.id}</div>
      {hasError ? (
        <div className="sf-graph-node-diagnostic">{editorData.diagnostics[0]?.message}</div>
      ) : null}
    </div>
  );
}