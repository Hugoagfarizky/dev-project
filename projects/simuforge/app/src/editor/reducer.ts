import { createWorldEntity } from '../world/defaults.ts';
import { validateTransform } from '../world/validation.ts';
import { createEmptyProject } from './state.ts';
import type { StudioCommand } from './commands.ts';
import type { StudioState } from './state.ts';

export interface ReducerContext {
  idFactory: () => string;
  clock: () => string;
}

const defaultContext: ReducerContext = {
  idFactory: () => crypto.randomUUID(),
  clock: () => new Date().toISOString()
};

function isValidEntityName(name: string): boolean {
  return name.length >= 1 && name.length <= 128;
}

function cloneState(state: StudioState): StudioState {
  return {
    project: {
      format: state.project.format,
      schemaVersion: state.project.schemaVersion,
      project: { ...state.project.project },
      world: {
        format: state.project.world.format,
        schemaVersion: state.project.world.schemaVersion,
        entities: state.project.world.entities.map((entity) => ({
          id: entity.id,
          name: entity.name,
          type: entity.type,
          transform: {
            position: { ...entity.transform.position },
            rotation: { ...entity.transform.rotation },
            scale: { ...entity.transform.scale }
          },
          metadata: { ...entity.metadata }
        }))
      }
    },
    editor: { ...state.editor, camera: state.editor.camera ? { ...state.editor.camera, target: { ...state.editor.camera.target } } : null },
    persistence: { ...state.persistence, lastError: state.persistence.lastError ? { ...state.persistence.lastError } : null },
    logs: [...state.logs]
  };
}

function markDirty(state: StudioState): StudioState {
  return {
    ...state,
    persistence: {
      ...state.persistence,
      revision: state.persistence.revision + 1,
      status: 'dirty'
    }
  };
}

export function reduceStudioState(
  state: StudioState,
  command: StudioCommand,
  context: ReducerContext = defaultContext
): StudioState {
  switch (command.type) {
    case 'project/new': {
      if (command.name.trim().length < 1) {
        return state;
      }
      const now = context.clock();
      const project = createEmptyProject(context.idFactory(), command.name.trim(), now);
      return {
        project,
        editor: {
          selectedEntityId: null,
          gizmoMode: 'translate',
          gridVisible: true,
          activePreset: 'build',
          camera: null
        },
        persistence: {
          revision: 1,
          savedRevision: 0,
          status: 'dirty',
          lastSavedAt: null,
          lastError: null
        },
        logs: [...state.logs]
      };
    }

    case 'project/open': {
      return {
        project: {
          format: command.document.format,
          schemaVersion: command.document.schemaVersion,
          project: { ...command.document.project },
          world: {
            format: command.document.world.format,
            schemaVersion: command.document.world.schemaVersion,
            entities: command.document.world.entities.map((entity) => ({
              id: entity.id,
              name: entity.name,
              type: entity.type,
              transform: {
                position: { ...entity.transform.position },
                rotation: { ...entity.transform.rotation },
                scale: { ...entity.transform.scale }
              },
              metadata: { ...entity.metadata }
            }))
          }
        },
        editor: {
          selectedEntityId: null,
          gizmoMode: 'translate',
          gridVisible: true,
          activePreset: 'build',
          camera: null
        },
        persistence: {
          revision: 0,
          savedRevision: 0,
          status: 'clean',
          lastSavedAt: null,
          lastError: null
        },
        logs: [...state.logs]
      };
    }

    case 'project/save-started': {
      if (state.persistence.status === 'saving') {
        return state;
      }
      return {
        ...cloneState(state),
        persistence: {
          ...state.persistence,
          status: 'saving',
          lastError: null
        }
      };
    }

    case 'project/save-succeeded': {
      return {
        ...cloneState(state),
        persistence: {
          ...state.persistence,
          savedRevision: command.revision,
          status: 'clean',
          lastSavedAt: command.at,
          lastError: null
        }
      };
    }

    case 'project/save-failed': {
      return {
        ...cloneState(state),
        persistence: {
          ...state.persistence,
          status: 'save-failed',
          lastError: command.error
        }
      };
    }

    case 'entity/create': {
      const id = context.idFactory();
      const entity = createWorldEntity(command.entityType, id, `${command.entityType.charAt(0).toUpperCase()}${command.entityType.slice(1)}`, command.position ? {
        position: { ...command.position },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 }
      } : undefined);

      const next = cloneState(state);
      next.project.world.entities = [...state.project.world.entities, entity];
      return markDirty(next);
    }

    case 'entity/delete': {
      const exists = state.project.world.entities.some((entity) => entity.id === command.id);
      if (!exists) {
        return state;
      }
      const next = cloneState(state);
      next.project.world.entities = state.project.world.entities.filter((entity) => entity.id !== command.id);
      if (state.editor.selectedEntityId === command.id) {
        next.editor.selectedEntityId = null;
      }
      return markDirty(next);
    }

    case 'entity/rename': {
      const entity = state.project.world.entities.find((item) => item.id === command.id);
      if (!entity || !isValidEntityName(command.name)) {
        return state;
      }
      const next = cloneState(state);
      next.project.world.entities = state.project.world.entities.map((item) =>
        item.id === command.id ? { ...item, name: command.name } : item
      );
      return markDirty(next);
    }

    case 'transform/set': {
      const entity = state.project.world.entities.find((item) => item.id === command.id);
      if (!entity) {
        return state;
      }
      const error = validateTransform(command.transform, `entities.${command.id}.transform`);
      if (error) {
        return state;
      }
      const next = cloneState(state);
      next.project.world.entities = state.project.world.entities.map((item) =>
        item.id === command.id
          ? {
              ...item,
              transform: {
                position: { ...command.transform.position },
                rotation: { ...command.transform.rotation },
                scale: { ...command.transform.scale }
              }
            }
          : item
      );
      return markDirty(next);
    }

    case 'selection/set': {
      if (command.id !== null && !state.project.world.entities.some((entity) => entity.id === command.id)) {
        return state;
      }
      if (command.id === state.editor.selectedEntityId) {
        return state;
      }
      const next = cloneState(state);
      next.editor.selectedEntityId = command.id;
      return next;
    }

    case 'gizmo/set-mode': {
      if (command.mode === state.editor.gizmoMode) {
        return state;
      }
      const next = cloneState(state);
      next.editor.gizmoMode = command.mode;
      return next;
    }

    case 'grid/set-visible': {
      if (command.visible === state.editor.gridVisible) {
        return state;
      }
      const next = cloneState(state);
      next.editor.gridVisible = command.visible;
      return next;
    }

    case 'preset/set': {
      if (command.preset === state.editor.activePreset) {
        return state;
      }
      const next = cloneState(state);
      next.editor.activePreset = command.preset;
      return next;
    }

    case 'camera/set': {
      const next = cloneState(state);
      next.editor.camera = command.pose
        ? {
            alpha: command.pose.alpha,
            beta: command.pose.beta,
            radius: command.pose.radius,
            target: { ...command.pose.target }
          }
        : null;
      return next;
    }

    case 'log/append': {
      const next = cloneState(state);
      next.logs = [...state.logs, command.entry].slice(-500);
      return next;
    }

    case 'log/clear': {
      if (state.logs.length === 0) {
        return state;
      }
      const next = cloneState(state);
      next.logs = [];
      return next;
    }

    default:
      return state;
  }
}
