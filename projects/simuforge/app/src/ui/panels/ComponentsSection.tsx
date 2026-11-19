import { useMemo } from 'react';
import type { StudioStore } from '../../editor/store.js';
import { selectProjectExtensions } from '../../editor/selectors.js';
import { useStudioStore } from '../hooks/useStore.js';
import type {
  Component,
  ResistorComponent,
  RigidBodyComponent,
  SwitchComponent,
  VoltageSourceComponent,
  WorldEntity
} from '../../world/types.js';
import {
  componentLabel,
  createComponent,
  getComponentDefinition,
  getComponentDefinitions,
  isDynamicComponentType,
  isElectricalComponent,
  isRigidBodyComponent
} from '../../world/components.js';
import { Button } from '../common/Button.js';
import { NumericField } from '../common/NumericField.js';

interface ComponentsSectionProps {
  entity: WorldEntity;
  store: StudioStore;
}

interface ComponentCardProps {
  entity: WorldEntity;
  component: Component;
  store: StudioStore;
}

interface AddComponentMenuProps {
  entity: WorldEntity;
  store: StudioStore;
}

function updateComponent(store: StudioStore, entity: WorldEntity, component: Component, patch: Record<string, unknown>): void {
  store.dispatch({
    type: 'component/set',
    entityId: entity.id,
    component: { ...component, ...patch } as Component
  });
}

export function ComponentCard({ entity, component, store }: ComponentCardProps) {
  const label = componentLabel(component.type);

  function toggleEnabled(enabled: boolean): void {
    updateComponent(store, entity, component, { enabled });
  }

  function remove(): void {
    store.dispatch({ type: 'component/remove', entityId: entity.id, componentId: component.id });
  }

  return (
    <article className="sf-component-card" data-testid={`component-card-${component.type}`}>
      <header className="sf-component-card-header">
        <label className="sf-component-card-title">
          <input
            type="checkbox"
            checked={component.enabled}
            onChange={(event) => toggleEnabled(event.target.checked)}
            aria-label={`Enable ${label}`}
          />
          <span>{label}</span>
        </label>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Remove ${label}`}
          onClick={remove}
        >
          Remove
        </Button>
      </header>

      {isRigidBodyComponent(component) ? <RigidBodyFields entity={entity} component={component} store={store} /> : null}
      {component.type === 'voltageSource' ? (
        <NumericField
          id={`${component.id}-voltage`}
          label="Voltage (V)"
          value={(component as VoltageSourceComponent).voltage}
          onCommit={(value) => updateComponent(store, entity, component, { voltage: value })}
          helpText="Ideal DC source. Negative values invert polarity."
        />
      ) : null}
      {component.type === 'resistor' ? (
        <NumericField
          id={`${component.id}-resistance`}
          label="Resistance (Ω)"
          value={(component as ResistorComponent).resistance}
          min={0.000001}
          onCommit={(value) => updateComponent(store, entity, component, { resistance: value })}
        />
      ) : null}
      {component.type === 'switch' ? (
        <label className="sf-component-toggle">
          <input
            type="checkbox"
            checked={(component as SwitchComponent).closed}
            onChange={(event) => updateComponent(store, entity, component, { closed: event.target.checked })}
          />
          <span>Closed (conducting)</span>
        </label>
      ) : null}
      {component.type === 'ground' ? (
        <p className="sf-inspector-note">Reference node shared by every ground component.</p>
      ) : null}
      {isElectricalComponent(component) ? (
        <p className="sf-component-id" title={component.id}>{component.id}</p>
      ) : null}
      {isDynamicComponentType(component.type) ? (
        <ExtensionComponentFields entity={entity} component={component} store={store} />
      ) : null}
    </article>
  );
}

function ExtensionComponentFields({
  entity,
  component,
  store
}: {
  entity: WorldEntity;
  component: Component;
  store: StudioStore;
}) {
  const definition = getComponentDefinition(component.type);
  const entries = Object.entries(component as unknown as Record<string, unknown>).filter(
    ([key]) => key !== 'id' && key !== 'type' && key !== 'enabled'
  );
  return (
    <>
      <p className="sf-inspector-note">{definition?.description ?? 'Extension-provided component.'}</p>
      {entries.map(([key, value]) => {
        if (typeof value === 'number') {
          return (
            <NumericField
              key={key}
              id={`${component.id}-${key}`}
              label={key}
              value={value}
              onCommit={(next) => updateComponent(store, entity, component, { [key]: next })}
            />
          );
        }
        if (typeof value === 'boolean') {
          return (
            <label className="sf-component-toggle" key={key}>
              <input
                type="checkbox"
                checked={value}
                onChange={(event) =>
                  updateComponent(store, entity, component, { [key]: event.target.checked })
                }
              />
              <span>{key}</span>
            </label>
          );
        }
        if (typeof value === 'string') {
          return (
            <label className="sf-inspector-row" key={key}>
              <span className="sf-inspector-label">{key}</span>
              <input
                type="text"
                value={value}
                onChange={(event) =>
                  updateComponent(store, entity, component, { [key]: event.target.value })
                }
              />
            </label>
          );
        }
        return null;
      })}
    </>
  );
}

function RigidBodyFields({ entity, component, store }: { entity: WorldEntity; component: RigidBodyComponent; store: StudioStore }) {
  return (
    <>
      <NumericField
        id={`${component.id}-mass`}
        label="Mass (kg)"
        value={component.mass}
        min={0.000001}
        onCommit={(value) => updateComponent(store, entity, component, { mass: value })}
      />
      <label className="sf-component-toggle">
        <input
          type="checkbox"
          checked={component.useGravity}
          onChange={(event) => updateComponent(store, entity, component, { useGravity: event.target.checked })}
        />
        <span>Use gravity</span>
      </label>
      <div className="sf-inspector-row">
        <span className="sf-inspector-label">Collider</span>
        <span className="sf-inspector-value">
          {component.collider.kind}
          {component.collider.kind === 'sphere'
            ? ` · r ${String(component.collider.size)}`
            : component.collider.kind === 'box' && typeof component.collider.size === 'object'
              ? ` · ${component.collider.size.x} × ${component.collider.size.y} × ${component.collider.size.z}`
              : ''}
        </span>
      </div>
    </>
  );
}

export function AddComponentMenu({ entity, store }: AddComponentMenuProps) {
  const components = entity.components ?? [];
  const hasRigidBody = components.some(isRigidBodyComponent);
  // Subscribe so a newly installed/removed extension refreshes the menu even
  // when the selected entity itself did not change.
  const extensions = useStudioStore(store, selectProjectExtensions);
  const available = useMemo(
    () =>
      getComponentDefinitions().filter(
        (definition) => !(definition.type === 'rigidBody' && hasRigidBody)
      ),
    [hasRigidBody, extensions]
  );

  function add(type: string): void {
    const component = createComponent(type, crypto.randomUUID());
    if (!component) return;
    store.dispatch({ type: 'component/add', entityId: entity.id, component });
  }

  return (
    <div className="sf-add-component" data-testid="add-component-menu">
      <select
        aria-label="Add component"
        defaultValue=""
        onChange={(event) => {
          const value = event.target.value;
          if (value) {
            add(value);
            event.target.value = '';
          }
        }}
      >
        <option value="" disabled>Add component…</option>
        <optgroup label="Physics">
          {available.filter((definition) => definition.category === 'physics').map((definition) => (
            <option key={definition.type} value={definition.type}>{definition.label}</option>
          ))}
        </optgroup>
        <optgroup label="Electrical">
          {available.filter((definition) => definition.category === 'electrical').map((definition) => (
            <option key={definition.type} value={definition.type}>{definition.label}</option>
          ))}
        </optgroup>
        {available.some((definition) => definition.category === 'extension') ? (
          <optgroup label="Extensions">
            {available.filter((definition) => definition.category === 'extension').map((definition) => (
              <option key={definition.type} value={definition.type}>{definition.label}</option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </div>
  );
}

export function ComponentsSection({ entity, store }: ComponentsSectionProps) {
  const components = entity.components ?? [];

  return (
    <section className="sf-inspector-section" aria-labelledby="sf-inspector-components">
      <h3 className="sf-inspector-heading" id="sf-inspector-components">Components</h3>
      {components.length === 0 ? (
        <p className="sf-inspector-note">No components on this object yet.</p>
      ) : (
        <div className="sf-component-list">
          {components.map((component) => (
            <ComponentCard key={component.id} entity={entity} component={component} store={store} />
          ))}
        </div>
      )}
      <AddComponentMenu entity={entity} store={store} />
    </section>
  );
}
