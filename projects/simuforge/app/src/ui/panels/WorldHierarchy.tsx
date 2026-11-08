import { useStudioStore } from '../hooks/useStore.js';
import { selectEntities, selectSelectedEntityId } from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';
import type { EntityType } from '../../world/types.js';
import { InlineRename } from '../common/InlineRename';

interface WorldHierarchyProps {
  store: StudioStore;
  renamingId: string | null;
  onStartRename: (id: string) => void;
  onFinishRename: () => void;
  onRequestDelete: (id: string) => void;
}

const TYPE_GLYPH: Record<EntityType, string> = {
  cube: '■',
  sphere: '●',
  plane: '▬'
};

const TYPE_LABEL: Record<EntityType, string> = {
  cube: 'Cube',
  sphere: 'Sphere',
  plane: 'Plane'
};

export function WorldHierarchy({
  store,
  renamingId,
  onStartRename,
  onFinishRename,
  onRequestDelete
}: WorldHierarchyProps) {
  const entities = useStudioStore(store, selectEntities);
  const selectedId = useStudioStore(store, selectSelectedEntityId);

  if (entities.length === 0) {
    return <div className="sf-panel-empty">No objects yet</div>;
  }

  return (
    <ul className="sf-hierarchy-list" aria-label="World entities">
      {entities.map((entity) => {
        const selected = entity.id === selectedId;
        return (
          <li
            key={entity.id}
            className={`sf-hierarchy-item ${selected ? 'selected' : ''}`.trim()}
          >
            {renamingId === entity.id ? (
              <InlineRename
                initialName={entity.name}
                onCommit={(name) => {
                  store.dispatch({ type: 'entity/rename', id: entity.id, name });
                  onFinishRename();
                }}
                onCancel={onFinishRename}
              />
            ) : (
              <>
                <button
                  type="button"
                  className="sf-hierarchy-row"
                  aria-current={selected ? 'true' : undefined}
                  title={`${entity.name} (${TYPE_LABEL[entity.type]})`}
                  onClick={() => store.dispatch({ type: 'selection/set', id: entity.id })}
                  onDoubleClick={() => onStartRename(entity.id)}
                >
                  <span className="sf-hierarchy-glyph" aria-hidden="true">{TYPE_GLYPH[entity.type]}</span>
                  <span className="sf-hierarchy-name">{entity.name}</span>
                  <span className="sf-hierarchy-type">{TYPE_LABEL[entity.type]}</span>
                </button>
                <span className="sf-hierarchy-actions">
                  <button
                    type="button"
                    className="sf-icon-btn"
                    aria-label={`Rename ${entity.name}`}
                    title="Rename (F2)"
                    onClick={(event) => {
                      event.stopPropagation();
                      onStartRename(entity.id);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="sf-icon-btn danger"
                    aria-label={`Delete ${entity.name}`}
                    title="Delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRequestDelete(entity.id);
                    }}
                  >
                    ✕
                  </button>
                </span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
