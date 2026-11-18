import { useStudioStore } from '../hooks/useStore.js';
import type { StudioStore } from '../../editor/store.js';
import type { WorldEntity } from '../../world/types.js';
import { componentLabel, isElectricalComponent } from '../../world/components.js';
import { selectRuntimeElectrical, selectRuntimeStatus } from '../../editor/selectors.js';

interface ElectricalSectionProps {
  entity: WorldEntity;
  store: StudioStore;
}

function formatNumber(value: number | null, unit: string): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(4)} ${unit}`;
}

/**
 * Phase 08 live electrical read-out for the selected entity. Values come from
 * the transient runtime solution and are never written back to components.
 */
export function ElectricalSection({ entity, store }: ElectricalSectionProps) {
  const components = (entity.components ?? []).filter(isElectricalComponent);
  const runtimeElectrical = useStudioStore(store, selectRuntimeElectrical);
  const runtimeStatus = useStudioStore(store, selectRuntimeStatus);

  if (components.length === 0) {
    return null;
  }

  return (
    <section className="sf-inspector-section" aria-labelledby="sf-inspector-electrical">
      <h3 className="sf-inspector-heading" id="sf-inspector-electrical">Electrical</h3>
      <div className="sf-electrical-list">
        {components.map((component) => {
          const result =
            runtimeElectrical.solution?.components.find(
              (candidate) =>
                candidate.entityId === entity.id && candidate.componentId === component.id
            ) ?? null;
          const status = result?.status ?? (runtimeStatus === 'editing' ? 'idle' : 'not solved');

          return (
            <article
              className="sf-electrical-card"
              key={component.id}
              data-testid={`electrical-card-${component.id}`}
            >
              <header className="sf-electrical-card-header">
                <span className="sf-electrical-card-title">{componentLabel(component.type)}</span>
                <span className={`sf-electrical-status sf-electrical-status-${status}`}>{status}</span>
              </header>
              {result ? (
                <div className="sf-electrical-values">
                  <div className="sf-inspector-row">
                    <span className="sf-inspector-label">Voltage</span>
                    <span className="sf-inspector-value">{formatNumber(result.voltage, 'V')}</span>
                  </div>
                  <div className="sf-inspector-row">
                    <span className="sf-inspector-label">Current</span>
                    <span className="sf-inspector-value">{formatNumber(result.current, 'A')}</span>
                  </div>
                  <div className="sf-inspector-row">
                    <span className="sf-inspector-label">Power</span>
                    <span className="sf-inspector-value">{formatNumber(result.power, 'W')}</span>
                  </div>
                </div>
              ) : (
                <p className="sf-inspector-note">
                  {runtimeStatus === 'editing'
                    ? 'Press Play to solve the circuit.'
                    : 'No solved value for this component.'}
                </p>
              )}
            </article>
          );
        })}
      </div>
      {runtimeElectrical.status === 'invalid' ? (
        <p className="sf-electrical-warning" role="status">
          Circuit is invalid. Electrical solving is disabled; see Console diagnostics.
        </p>
      ) : null}
    </section>
  );
}
