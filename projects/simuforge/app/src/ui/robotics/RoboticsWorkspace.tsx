import { useStudioStore } from '../hooks/useStore.js';
import type { StudioStore } from '../../editor/store.js';
import { selectEntities, selectRuntimeRobotics, selectRuntimeStatus } from '../../editor/selectors.js';
import { ROBOTICS_COMPONENT_TYPES, componentLabel, createComponent } from '../../world/components.js';
import { Button } from '../common/Button.js';

function addRoboticsComponent(store: StudioStore, type: string): void {
  let entityId = store.getSnapshot().editor.selectedEntityId;
  if (!entityId) {
    const count = store.getSnapshot().project.world.entities.length;
    store.dispatch({ type: 'entity/create', entityType: 'cube', position: { x: (count % 4) * 2, y: 0.5, z: 0 } });
    entityId = store.getSnapshot().editor.selectedEntityId;
    if (!entityId) return;
    store.dispatch({ type: 'entity/rename', id: entityId, name: componentLabel(type) });
  }
  const component = createComponent(type, crypto.randomUUID());
  if (!component) return;
  store.dispatch({ type: 'component/add', entityId, component });
}

export function RoboticsWorkspace({ store }: { store: StudioStore }) {
  const entities = useStudioStore(store, selectEntities);
  const runtimeStatus = useStudioStore(store, selectRuntimeStatus);
  const robotics = useStudioStore(store, selectRuntimeRobotics);
  const locked = runtimeStatus !== 'editing';

  const roboticsComponents = entities.flatMap((entity) =>
    (entity.components ?? [])
      .filter((component) => ROBOTICS_COMPONENT_TYPES.includes(component.type as (typeof ROBOTICS_COMPONENT_TYPES)[number]))
      .map((component) => ({ entity, component }))
  );

  return (
    <div className="sf-robotics-workspace">
      <div className="sf-robotics-palette">
        <span className="sf-circuit-palette-label">Add component</span>
        {ROBOTICS_COMPONENT_TYPES.map((type) => (
          <Button key={type} variant="secondary" size="sm" disabled={locked} onClick={() => addRoboticsComponent(store, type)}>
            {componentLabel(type)}
          </Button>
        ))}
      </div>
      {locked ? (
        <div className="sf-circuit-lock" role="status">Robotics editing is locked while the simulation is running or paused.</div>
      ) : null}
      <div className="sf-robotics-status" data-testid="robotics-status">
        <span>Status: {robotics.status}</span>
        <span> · Joints: {Object.keys(robotics.jointAngles).length}</span>
        <span> · Sensors: {Object.keys(robotics.sensorReadings).length}</span>
        <span> · Actuators: {Object.keys(robotics.actuatorStates).length}</span>
      </div>
      <div className="sf-robotics-list" data-testid="robotics-list">
        {roboticsComponents.length === 0 ? (
          <div className="sf-circuit-empty">No robotics components yet. Add a joint, actuator, or sensor.</div>
        ) : (
          roboticsComponents.map(({ component }) => (
            <div key={component.id} className="sf-electrical-card" data-testid={`robotics-card-${component.id}`}>
              <span className="sf-electrical-card-title">{componentLabel(component.type)}</span>
              <span className="sf-electrical-status">{component.type}</span>
              {component.type === 'sensor' ? (
                <span className="sf-inspector-value">{String(robotics.sensorReadings[component.id] ?? '—')}</span>
              ) : null}
              {component.type === 'actuator' ? (
                <span className="sf-inspector-value">
                  {robotics.actuatorStates[component.id]?.speed?.toFixed(3) ?? '0.000'} rad/s
                </span>
              ) : null}
              {component.type === 'joint' ? (
                <span className="sf-inspector-value">
                  {(robotics.jointAngles[component.id] ?? 0).toFixed(3)} rad
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}