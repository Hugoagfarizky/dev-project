import { useState } from 'react';
import { useStudioStore } from '../hooks/useStore.js';
import {
  selectRuntimeStatus,
  selectSelectedEntity,
  selectSelectedRuntimeBody
} from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';
import type { RigidBodyComponent, Vec3 } from '../../world/types.js';
import { Button } from '../common/Button';

interface RuntimeControlsProps {
  store: StudioStore;
}

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };

function rigidBodyOf(entity: { components?: unknown[] } | null): RigidBodyComponent | null {
  if (!entity) return null;
  const found = (entity as { components: RigidBodyComponent[] }).components.find(
    (component) => component.type === 'rigidBody' && component.enabled
  );
  return found ?? null;
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function parseVec3(values: { x: string; y: string; z: string }): Vec3 | null {
  const x = Number(values.x);
  const y = Number(values.y);
  const z = Number(values.z);
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) {
    return null;
  }
  return { x, y, z };
}

export function RuntimeControls({ store }: RuntimeControlsProps) {
  const selected = useStudioStore(store, selectSelectedEntity);
  const runtimeStatus = useStudioStore(store, selectRuntimeStatus);
  const runtimeBody = useStudioStore(store, selectSelectedRuntimeBody);

  const body = rigidBodyOf(selected);
  const isDynamicTarget =
    body !== null && body.collider.kind !== 'plane' && runtimeBody !== null;
  const canApply = runtimeStatus !== 'editing' && isDynamicTarget;

  const [force, setForce] = useState({ x: '0', y: '0', z: '0' });
  const [impulse, setImpulse] = useState({ x: '0', y: '0', z: '0' });

  function applyForce() {
    if (!selected || !canApply) return;
    const parsed = parseVec3(force);
    if (parsed === null) return;
    store.dispatch({ type: 'runtime/apply-force', entityId: selected.id, force: parsed });
  }

  function applyImpulse() {
    if (!selected || !canApply) return;
    const parsed = parseVec3(impulse);
    if (parsed === null) return;
    store.dispatch({ type: 'runtime/apply-impulse', entityId: selected.id, impulse: parsed });
  }

  function clearForce() {
    if (!selected || !canApply) return;
    store.dispatch({ type: 'runtime/clear-force', entityId: selected.id });
  }

  const position = runtimeBody?.transform.position ?? selected?.transform.position ?? ZERO;
  const velocity = runtimeBody?.velocity ?? body?.velocity ?? ZERO;

  return (
    <section className="sf-inspector-section" aria-labelledby="sf-runtime-controls">
      <h3 className="sf-inspector-heading" id="sf-runtime-controls">Runtime Controls</h3>

      <div className="sf-inspector-row">
        <span className="sf-inspector-label">Runtime status</span>
        <span className="sf-inspector-value">{runtimeStatus}</span>
      </div>

      {body ? (
        <>
          <div className="sf-inspector-row">
            <span className="sf-inspector-label">Collider</span>
            <span className="sf-inspector-value">{body.collider.kind}</span>
          </div>
          <div className="sf-inspector-row">
            <span className="sf-inspector-label">Mass (kg)</span>
            <span className="sf-inspector-value">{body.mass}</span>
          </div>
          <div className="sf-inspector-row">
            <span className="sf-inspector-label">Position (m)</span>
            <span className="sf-inspector-value">
              {position.x.toFixed(3)}, {position.y.toFixed(3)}, {position.z.toFixed(3)}
            </span>
          </div>
          <div className="sf-inspector-row">
            <span className="sf-inspector-label">Velocity (m/s)</span>
            <span className="sf-inspector-value">
              {velocity.x.toFixed(3)}, {velocity.y.toFixed(3)}, {velocity.z.toFixed(3)}
            </span>
          </div>

          {runtimeBody ? (
            <div className="sf-inspector-row">
              <span className="sf-inspector-label">Force (N)</span>
              <span className="sf-inspector-value">
                {runtimeBody.force.x.toFixed(3)}, {runtimeBody.force.y.toFixed(3)}, {runtimeBody.force.z.toFixed(3)}
              </span>
            </div>
          ) : null}

          <div className="sf-runtime-vector" role="group" aria-label="Force input">
            <span className="sf-inspector-label">Force (N)</span>
            <label>X<input type="number" value={force.x} onChange={(event) => setForce((current) => ({ ...current, x: event.target.value }))} /></label>
            <label>Y<input type="number" value={force.y} onChange={(event) => setForce((current) => ({ ...current, y: event.target.value }))} /></label>
            <label>Z<input type="number" value={force.z} onChange={(event) => setForce((current) => ({ ...current, z: event.target.value }))} /></label>
            <Button variant="primary" size="sm" onClick={applyForce} disabled={!canApply}>Apply Force</Button>
          </div>

          <div className="sf-runtime-vector" role="group" aria-label="Impulse input">
            <span className="sf-inspector-label">Impulse (N·s)</span>
            <label>X<input type="number" value={impulse.x} onChange={(event) => setImpulse((current) => ({ ...current, x: event.target.value }))} /></label>
            <label>Y<input type="number" value={impulse.y} onChange={(event) => setImpulse((current) => ({ ...current, y: event.target.value }))} /></label>
            <label>Z<input type="number" value={impulse.z} onChange={(event) => setImpulse((current) => ({ ...current, z: event.target.value }))} /></label>
            <Button variant="primary" size="sm" onClick={applyImpulse} disabled={!canApply}>Apply Impulse</Button>
          </div>

          <div className="sf-runtime-actions">
            <Button variant="secondary" size="sm" onClick={clearForce} disabled={!canApply}>Clear Force</Button>
          </div>

          {!canApply ? (
            <p className="sf-inspector-empty-hint">
              Runtime controls require a running or paused simulation with a selected dynamic body.
            </p>
          ) : null}
        </>
      ) : (
        <p className="sf-inspector-empty-hint">Select an entity with a rigid body to use runtime controls.</p>
      )}
    </section>
  );
}