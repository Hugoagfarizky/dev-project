import { useStudioStore } from '../hooks/useStore.js';
import { selectIsWorldEmpty } from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';
import { Button } from '../common/Button';
import { PRIMITIVE_ACTIONS, createPrimitive } from '../panels/primitives.js';

interface EmptyWorldOverlayProps {
  store: StudioStore;
}

export function EmptyWorldOverlay({ store }: EmptyWorldOverlayProps) {
  const isEmpty = useStudioStore(store, selectIsWorldEmpty);

  if (!isEmpty) {
    return null;
  }

  return (
    <div className="sf-empty-world-overlay">
      <div className="sf-empty-world-card">
        <h2>Your world is empty</h2>
        <p>Add a primitive to start building.</p>
        <div className="sf-empty-world-actions">
          {PRIMITIVE_ACTIONS.map((action) => (
            <Button
              key={action.type}
              variant="primary"
              size="sm"
              onClick={() => createPrimitive(store, action.type)}
            >
              Add {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
