import { useStudioStore } from '../hooks/useStore.js';
import { selectSelectedEntity } from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';
import type { EntityType } from '../../world/types.js';
import { Button } from '../common/Button';
import { createPrimitive } from './primitives.js';

interface InspectorProps {
  store: StudioStore;
}

const TYPE_LABEL: Record<EntityType, string> = {
  cube: 'Cube',
  sphere: 'Sphere',
  plane: 'Plane'
};

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '—';
}

function formatVec3(vector: { x: number; y: number; z: number }): string {
  return `${formatNumber(vector.x)}, ${formatNumber(vector.y)}, ${formatNumber(vector.z)}`;
}

function formatQuaternion(quaternion: { x: number; y: number; z: number; w: number }): string {
  return `${formatNumber(quaternion.x)}, ${formatNumber(quaternion.y)}, ${formatNumber(quaternion.z)}, ${formatNumber(quaternion.w)}`;
}

export function Inspector({ store }: InspectorProps) {
  const selected = useStudioStore(store, selectSelectedEntity);

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

      <section className="sf-inspector-section" aria-labelledby="sf-inspector-transform">
        <h3 className="sf-inspector-heading" id="sf-inspector-transform">Transform</h3>
        <dl className="sf-inspector-values">
          <div>
            <dt>Position</dt>
            <dd>{formatVec3(selected.transform.position)}</dd>
          </div>
          <div>
            <dt>Rotation</dt>
            <dd>{formatQuaternion(selected.transform.rotation)}</dd>
          </div>
          <div>
            <dt>Scale</dt>
            <dd>{formatVec3(selected.transform.scale)}</dd>
          </div>
        </dl>
        <p className="sf-inspector-note">Read-only placeholder. Transform editing arrives in a later increment.</p>
      </section>
    </div>
  );
}
