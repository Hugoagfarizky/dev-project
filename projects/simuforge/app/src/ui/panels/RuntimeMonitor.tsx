import { useStudioStore } from '../hooks/useStore.js';
import {
  selectRuntimeElectrical,
  selectRuntimeStatus,
  selectSelectedEntity,
  selectSelectedRuntimeBody
} from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';

interface RuntimeMonitorProps {
  store: StudioStore;
}

export function RuntimeMonitor({ store }: RuntimeMonitorProps) {
  const runtimeStatus = useStudioStore(store, selectRuntimeStatus);
  const selected = useStudioStore(store, selectSelectedEntity);
  const runtimeBody = useStudioStore(store, selectSelectedRuntimeBody);
  const electrical = useStudioStore(store, selectRuntimeElectrical);

  const position = runtimeBody?.transform.position ?? selected?.transform.position;
  const velocity = runtimeBody?.velocity;

  return (
    <div className="sf-runtime-monitor" aria-label="Runtime monitor">
      <div className="sf-inspector-row">
        <span className="sf-inspector-label">Lifecycle</span>
        <span className="sf-inspector-value">{runtimeStatus}</span>
      </div>
      <div className="sf-inspector-row">
        <span className="sf-inspector-label">Selected</span>
        <span className="sf-inspector-value">{selected?.name ?? 'None'}</span>
      </div>
      <div className="sf-inspector-row">
        <span className="sf-inspector-label">Position (m)</span>
        <span className="sf-inspector-value">
          {position ? `${position.x.toFixed(3)}, ${position.y.toFixed(3)}, ${position.z.toFixed(3)}` : '—'}
        </span>
      </div>
      <div className="sf-inspector-row">
        <span className="sf-inspector-label">Velocity (m/s)</span>
        <span className="sf-inspector-value">
          {velocity ? `${velocity.x.toFixed(3)}, ${velocity.y.toFixed(3)}, ${velocity.z.toFixed(3)}` : '—'}
        </span>
      </div>
      <div className="sf-inspector-row">
        <span className="sf-inspector-label">Circuit</span>
        <span className="sf-inspector-value" data-testid="monitor-circuit-status">
          {electrical.status === 'solved'
            ? `solved · ${electrical.solution?.nets.length ?? 0} net(s) · ${electrical.lastSolveMs.toFixed(1)} ms`
            : electrical.status}
        </span>
      </div>
    </div>
  );
}