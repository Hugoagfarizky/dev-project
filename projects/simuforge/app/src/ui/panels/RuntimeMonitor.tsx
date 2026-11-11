import { useStudioStore } from '../hooks/useStore.js';
import {
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
    </div>
  );
}