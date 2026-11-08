import { useStudioStore } from '../hooks/useStore.js';
import { selectEntities } from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';
import { Button } from '../common/Button';
import { PRIMITIVE_ACTIONS, createPrimitive } from './primitives.js';

interface AssetLibraryProps {
  store: StudioStore;
}

export function AssetLibrary({ store }: AssetLibraryProps) {
  const entities = useStudioStore(store, selectEntities);

  return (
    <div className="sf-asset-library">
      {PRIMITIVE_ACTIONS.map((action) => (
        <Button
          key={action.type}
          variant="secondary"
          className="sf-asset-item"
          onClick={() => createPrimitive(store, action.type)}
          aria-label={`Add ${action.label}`}
        >
          <span className="sf-asset-glyph" aria-hidden="true">{action.glyph}</span>
          <span className="sf-asset-label">{action.label}</span>
        </Button>
      ))}
      <span className="sf-asset-count" aria-live="polite">
        {entities.length} {entities.length === 1 ? 'entity' : 'entities'} in world
      </span>
    </div>
  );
}
