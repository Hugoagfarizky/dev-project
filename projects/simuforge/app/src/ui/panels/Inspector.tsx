import { useStudioStore } from '../hooks/useStore.js';
import { selectSelectedEntity } from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';
import type { EntityType } from '../../world/types.js';
import { Button } from '../common/Button';
import { createPrimitive } from './primitives.js';
import { TransformSection } from './TransformSection.js';
import { RuntimeControls } from './RuntimeControls.js';
import { GraphNodeInspector } from '../graph/GraphNodeInspector.js';
import { selectSelectedGraphNodeId } from '../../editor/selectors.js';

interface InspectorProps {
  store: StudioStore;
}

const TYPE_LABEL: Record<EntityType, string> = {
  cube: 'Cube',
  sphere: 'Sphere',
  plane: 'Plane'
};

export function Inspector({ store }: InspectorProps) {
  const selected = useStudioStore(store, selectSelectedEntity);
  const selectedGraphNodeId = useStudioStore(store, selectSelectedGraphNodeId);

  if (selectedGraphNodeId) {
    return (
      <div className="sf-inspector">
        <GraphNodeInspector store={store} />
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="sf-inspector-empty">
        <p className="sf-inspector-empty-title">No selection</p>
        <p className="sf-inspector-empty-hint">Select an entity in the viewport or Hierarchy.</p>
        <Button variant="primary" size="sm" onClick={() => createPrimitive(store, 'cube')}>
          Add Cube
        </Button>
      </div>
    );
  }

  return (
    <div className="sf-inspector">
      <section className="sf-inspector-section" aria-labelledby="sf-inspector-identity">
        <h3 className="sf-inspector-heading" id="sf-inspector-identity">Identity</h3>
        <div className="sf-inspector-row">
          <span className="sf-inspector-label">Name</span>
          <span className="sf-inspector-value">{selected.name}</span>
        </div>
        <div className="sf-inspector-row">
          <span className="sf-inspector-label">Type</span>
          <span className="sf-inspector-value">{TYPE_LABEL[selected.type]}</span>
        </div>
        <div className="sf-inspector-row">
          <span className="sf-inspector-label">ID</span>
          <code className="sf-inspector-id" title={selected.id}>{selected.id}</code>
        </div>
      </section>

      <TransformSection entity={selected} store={store} />
      <RuntimeControls store={store} />
    </div>
  );
}
