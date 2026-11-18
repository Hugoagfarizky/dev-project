import { useStudioStore } from '../hooks/useStore.js';
import {
  selectEntities,
  selectGraph,
  selectSelectedGraphNodeId
} from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';
import type { Graph, GraphNode } from '../../graph/types.js';
import { pythonScripts } from '../../python/validation.js';
import { componentLabel } from '../../world/components.js';

interface GraphNodeInspectorProps {
  store: StudioStore;
}

function updateNode(graph: Graph | null, nodeId: string, updater: (node: GraphNode) => GraphNode): Graph | null {
  if (!graph) return graph;
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === nodeId ? updater(node) : node))
  };
}

export function GraphNodeInspector({ store }: GraphNodeInspectorProps) {
  const graph = useStudioStore(store, selectGraph) as Graph | null;
  const selectedId = useStudioStore(store, selectSelectedGraphNodeId);
  const entities = useStudioStore(store, selectEntities);
  const node = graph?.nodes.find((item) => item.id === selectedId) ?? null;
  const scripts = pythonScripts(store.getSnapshot().project.python);

  if (!node) {
    return <div className="sf-graph-inspector-empty">No graph node selected.</div>;
  }

  const electricalConfig =
    node.config.kind === 'setSwitch' || node.config.kind === 'setSourceVoltage'
      ? node.config
      : null;
  const roboticsConfig =
    node.config.kind === 'setActuator' || node.config.kind === 'readSensor'
      ? node.config
      : null;
  const expectedType = electricalConfig
    ? electricalConfig.kind === 'setSwitch'
      ? 'switch'
      : 'voltageSource'
    : roboticsConfig?.kind === 'setActuator'
      ? 'actuator'
      : 'sensor';
  const targetEntity = roboticsConfig
    ? entities.find((entity) => entity.id === roboticsConfig.targetEntityId) ?? null
    : electricalConfig
      ? entities.find((entity) => entity.id === electricalConfig.targetEntityId) ?? null
      : null;
  const targetComponents = (targetEntity?.components ?? []).filter(
    (component) => component.type === expectedType
  );

  function setConfig(nextConfig: GraphNode['config']) {
    const nextGraph = updateNode(graph, node!.id, (current) => ({ ...current, config: nextConfig }));
    store.dispatch({ type: 'graph/set', graph: nextGraph });
  }

  return (
    <div className="sf-graph-inspector">
      <div className="sf-inspector-row">
        <span className="sf-inspector-label">Node</span>
        <span className="sf-inspector-value">{node.id}</span>
      </div>
      <div className="sf-inspector-row">
        <span className="sf-inspector-label">Type</span>
        <span className="sf-inspector-value">{node.type}</span>
      </div>

      {node.config.kind === 'onPlaneContact' ||
      node.config.kind === 'applyForce' ||
      node.config.kind === 'applyImpulse' ||
      node.config.kind === 'clearForce' ? (
        <label className="sf-inspector-row">
          <span className="sf-inspector-label">Target entity ID</span>
          <input
            type="text"
            value={node.config.targetEntityId}
            onChange={(event) =>
              setConfig({ ...node.config, targetEntityId: event.target.value } as GraphNode['config'])
            }
          />
        </label>
      ) : null}

      {node.config.kind === 'applyForce' ? (
        <>
          {(['x', 'y', 'z'] as const).map((axis) => (
            <label key={axis} className="sf-inspector-row">
              <span className="sf-inspector-label">Force {axis.toUpperCase()}</span>
              <input
                type="number"
                value={(node.config as { force: { x: number; y: number; z: number } }).force[axis]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  const config = node.config as { kind: 'applyForce'; targetEntityId: string; force: { x: number; y: number; z: number } };
                  setConfig({
                    ...config,
                    force: { ...config.force, [axis]: Number.isFinite(value) ? value : 0 }
                  } as any);
                }}
              />
            </label>
          ))}
        </>
      ) : null}

      {node.config.kind === 'runPython' ? (
        <label className="sf-inspector-row">
          <span className="sf-inspector-label">Python script</span>
          <select
            value={(node.config as { scriptId: string }).scriptId}
            onChange={(event) =>
              setConfig({ kind: 'runPython', scriptId: event.target.value } as GraphNode['config'])
            }
          >
            <option value="">(none)</option>
            {scripts.map((script) => (
              <option key={script.id} value={script.id}>
                {script.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {node.config.kind === 'applyImpulse' ? (
        <>
          {(['x', 'y', 'z'] as const).map((axis) => (
            <label key={axis} className="sf-inspector-row">
              <span className="sf-inspector-label">Impulse {axis.toUpperCase()}</span>
              <input
                type="number"
                value={(node.config as { impulse: { x: number; y: number; z: number } }).impulse[axis]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  const config = node.config as { kind: 'applyImpulse'; targetEntityId: string; impulse: { x: number; y: number; z: number } };
                  setConfig({
                    ...config,
                    impulse: { ...config.impulse, [axis]: Number.isFinite(value) ? value : 0 }
                  } as any);
                }}
              />
            </label>
          ))}
        </>
      ) : null}

      {node.config.kind === 'setSwitch' || node.config.kind === 'setSourceVoltage' ? (
        <>
          <label className="sf-inspector-row">
            <span className="sf-inspector-label">Target entity</span>
            <select
              value={node.config.targetEntityId}
              onChange={(event) => {
                const nextEntity = entities.find((entity) => entity.id === event.target.value);
                const nextComponent = (nextEntity?.components ?? []).find(
                  (component) => component.type === expectedType
                );
                setConfig({
                  ...node.config,
                  targetEntityId: event.target.value,
                  targetComponentId: nextComponent?.id ?? ''
                } as GraphNode['config']);
              }}
            >
              <option value="">(none)</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </label>
          <label className="sf-inspector-row">
            <span className="sf-inspector-label">{componentLabel(expectedType)}</span>
            <select
              value={node.config.targetComponentId}
              onChange={(event) =>
                setConfig({ ...node.config, targetComponentId: event.target.value } as GraphNode['config'])
              }
            >
              <option value="">(none)</option>
              {targetComponents.map((component) => (
                <option key={component.id} value={component.id}>
                  {componentLabel(component.type)} · {component.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          {node.config.kind === 'setSwitch' ? (
            <label className="sf-inspector-row">
              <span className="sf-inspector-label">State</span>
              <select
                value={node.config.closed ? 'closed' : 'open'}
                onChange={(event) =>
                  setConfig({ ...node.config, closed: event.target.value === 'closed' } as GraphNode['config'])
                }
              >
                <option value="closed">Close switch</option>
                <option value="open">Open switch</option>
              </select>
            </label>
          ) : (
            <label className="sf-inspector-row">
              <span className="sf-inspector-label">Voltage (V)</span>
              <input
                type="number"
                value={node.config.voltage}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setConfig({
                    ...node.config,
                    voltage: Number.isFinite(value) ? value : 0
                  } as GraphNode['config']);
                }}
              />
            </label>
          )}
        </>
      ) : null}
      {node.config.kind === 'setActuator' || node.config.kind === 'readSensor' ? (
        <>
          <label className="sf-inspector-row">
            <span className="sf-inspector-label">Target entity</span>
            <select
              value={node.config.targetEntityId}
              onChange={(event) => {
                const nextEntity = entities.find((entity) => entity.id === event.target.value);
                const expectedType = node.config.kind === 'setActuator' ? 'actuator' : 'sensor';
                const nextComponent = (nextEntity?.components ?? []).find(
                  (component) => component.type === expectedType
                );
                setConfig({
                  ...node.config,
                  targetEntityId: event.target.value,
                  targetComponentId: nextComponent?.id ?? ''
                } as GraphNode['config']);
              }}
            >
              <option value="">(none)</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </label>
          <label className="sf-inspector-row">
            <span className="sf-inspector-label">
              {node.config.kind === 'setActuator' ? 'Actuator' : 'Sensor'}
            </span>
            <select
              value={node.config.targetComponentId}
              onChange={(event) =>
                setConfig({ ...node.config, targetComponentId: event.target.value } as GraphNode['config'])
              }
            >
              <option value="">(none)</option>
              {(targetEntity?.components ?? [])
                .filter((component) => component.type === (node.config.kind === 'setActuator' ? 'actuator' : 'sensor'))
                .map((component) => (
                  <option key={component.id} value={component.id}>
                    {componentLabel(component.type)} · {component.id.slice(0, 8)}
                  </option>
                ))}
            </select>
          </label>
          {node.config.kind === 'setActuator' ? (
            <label className="sf-inspector-row">
              <span className="sf-inspector-label">Value</span>
              <input
                type="number"
                value={node.config.value}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setConfig({
                    ...node.config,
                    value: Number.isFinite(value) ? value : 0
                  } as GraphNode['config']);
                }}
              />
            </label>
          ) : null}
        </>
      ) : null}
    </div>
  );
}