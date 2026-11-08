import { eulerToQuaternion, quaternionToEuler } from '../../world/transform.js';
import type { StudioStore } from '../../editor/store.js';
import type { WorldEntity } from '../../world/types.js';
import { NumericField } from '../common/NumericField.js';

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;
const MIN_SCALE = 0.001;

interface TransformSectionProps {
  entity: WorldEntity;
  store: StudioStore;
}

export function TransformSection({ entity, store }: TransformSectionProps) {
  const transform = entity.transform;
  const euler = quaternionToEuler(transform.rotation);
  const pitchDeg = euler.x * RAD_TO_DEG;
  const yawDeg = euler.y * RAD_TO_DEG;
  const rollDeg = euler.z * RAD_TO_DEG;

  function commitPosition(axis: 'x' | 'y' | 'z', value: number) {
    store.dispatch({
      type: 'transform/set',
      id: entity.id,
      transform: {
        position: { ...transform.position, [axis]: value },
        rotation: { ...transform.rotation },
        scale: { ...transform.scale }
      },
      source: 'inspector'
    });
  }

  function commitRotation(axis: 'x' | 'y' | 'z', degrees: number) {
    const nextEuler = {
      x: axis === 'x' ? degrees * DEG_TO_RAD : pitchDeg * DEG_TO_RAD,
      y: axis === 'y' ? degrees * DEG_TO_RAD : yawDeg * DEG_TO_RAD,
      z: axis === 'z' ? degrees * DEG_TO_RAD : rollDeg * DEG_TO_RAD
    };
    const rotation = eulerToQuaternion(nextEuler.x, nextEuler.y, nextEuler.z);
    store.dispatch({
      type: 'transform/set',
      id: entity.id,
      transform: {
        position: { ...transform.position },
        rotation,
        scale: { ...transform.scale }
      },
      source: 'inspector'
    });
  }

  function commitScale(axis: 'x' | 'y' | 'z', value: number) {
    store.dispatch({
      type: 'transform/set',
      id: entity.id,
      transform: {
        position: { ...transform.position },
        rotation: { ...transform.rotation },
        scale: { ...transform.scale, [axis]: value }
      },
      source: 'inspector'
    });
  }

  return (
    <section className="sf-inspector-section" aria-labelledby="sf-inspector-transform">
      <h3 className="sf-inspector-heading" id="sf-inspector-transform">Transform</h3>
      <div className="sf-transform-group">
        <span className="sf-transform-group-label">Position</span>
        <div className="sf-transform-row">
          <NumericField id={`pos-x-${entity.id}`} label="X" value={transform.position.x} onCommit={(v) => commitPosition('x', v)} />
          <NumericField id={`pos-y-${entity.id}`} label="Y" value={transform.position.y} onCommit={(v) => commitPosition('y', v)} />
          <NumericField id={`pos-z-${entity.id}`} label="Z" value={transform.position.z} onCommit={(v) => commitPosition('z', v)} />
        </div>
      </div>
      <div className="sf-transform-group">
        <span className="sf-transform-group-label">Rotation (deg, YXZ)</span>
        <div className="sf-transform-row">
          <NumericField id={`rot-x-${entity.id}`} label="X" value={pitchDeg} onCommit={(v) => commitRotation('x', v)} helpText="Pitch" />
          <NumericField id={`rot-y-${entity.id}`} label="Y" value={yawDeg} onCommit={(v) => commitRotation('y', v)} helpText="Yaw" />
          <NumericField id={`rot-z-${entity.id}`} label="Z" value={rollDeg} onCommit={(v) => commitRotation('z', v)} helpText="Roll" />
        </div>
        <p className="sf-transform-help" title="Rotation is stored as a quaternion. Values are Euler degrees in YXZ order (yaw Y, pitch X, roll Z).">
          Stored as quaternion; edited as Euler degrees in YXZ order.
        </p>
      </div>
      <div className="sf-transform-group">
        <span className="sf-transform-group-label">Scale</span>
        <div className="sf-transform-row">
          <NumericField id={`scl-x-${entity.id}`} label="X" value={transform.scale.x} min={MIN_SCALE} onCommit={(v) => commitScale('x', v)} />
          <NumericField id={`scl-y-${entity.id}`} label="Y" value={transform.scale.y} min={MIN_SCALE} onCommit={(v) => commitScale('y', v)} />
          <NumericField id={`scl-z-${entity.id}`} label="Z" value={transform.scale.z} min={MIN_SCALE} onCommit={(v) => commitScale('z', v)} />
        </div>
      </div>
    </section>
  );
}