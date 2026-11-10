import { createWorldEntity } from '../world/defaults.ts';
import { validateTransform, validateComponent } from '../world/validation.ts';
import { transformsEqual } from '../world/transform.ts';
import { createEmptyProject } from './state.ts';
import type { StudioCommand } from './commands.ts';
import type { CameraPose, StudioState } from './state.ts';
import type { EntityType, WorldEntity } from '../world/types.ts';

export interface ReducerContext {
  idFactory: () => string;
  clock: () => string;
}

const defaultContext: ReducerContext = {
  idFactory: () => crypto.randomUUID(),
  clock: () => new Date().toISOString()
};

const DEFAULT_NAME_BASE: Record<EntityType, string> = {
  cube: 'Cube',
  sphere: 'Sphere',
  plane: 'Plane'
};

const MAX_ENTITY_NAME_LENGTH = 128;

function normalizeEntityName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_ENTITY_NAME_LENGTH) {
    return null;
  }
  return trimmed;
}

function defaultEntityName(entities: readonly WorldEntity[], entityType: EntityType): string {
  const base = DEFAULT_NAME_BASE[entityType];
  const used = new Set(entities.map((entity) => entity.name));
  if (!used.has(base)) {
    return base;
  }
  let suffix = 2;
  while (used.has(`${base} ${suffix}`)) {
    suffix += 1;
  }
  return `${base} ${suffix}`;
}

function sameCamera(a: CameraPose | null, b: CameraPose | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.alpha === b.alpha &&
    a.beta === b.beta &&
    a.radius === b.radius &&
    a.target.x === b.target.x &&
    a.target.y === b.target.y &&
    a.target.z === b.target.z
  );
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

function replaceEntity(
  entities: readonly WorldEntity[],
  id: string,
  update: (entity: WorldEntity) => WorldEntity
): WorldEntity[] {
  return entities.map((entity) => (entity.id === id ? update(entity) : entity));
}

const STRUCTURAL_COMMANDS = new Set<string>([
  'entity/create',
  'entity/delete',
  'entity/rename',
  'transform/set',
  'component/add',
  'component/remove',
  'component/set'
]);

function appendRuntimeBlockedLog(state: StudioState): StudioState {
  return {
    ...state,
    logs: [...state.logs, {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      severity: 'warn' as const,
      source: 'RUNTIME' as const,
      code: 'STRUCTURAL_EDIT_BLOCKED',
      message: 'Structural edit blocked while simulation is running or paused.'
    }].slice(-500)
  };
}

export function reduceStudioState(
  state: StudioState,
  command: StudioCommand,
  context: ReducerContext = defaultContext
): StudioState {
  if (STRUCTURAL_COMMANDS.has(command.type) && state.runtime.status !== 'editing') {
    return appendRuntimeBlockedLog(state);
  }

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
        logs: [...state.logs],
        runtime: { status: 'editing', snapshot: null, lastError: null }
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
              metadata: { ...entity.metadata },
              components: entity.components ? entity.components.map((c) => ({ ...c })) : []
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
        logs: [...state.logs],
        runtime: { status: 'editing', snapshot: null, lastError: null }
      };
    }

    case 'project/save-started': {
      if (state.persistence.status === 'saving') {
        return state;
      }
      return {
        ...state,
        persistence: {
          ...state.persistence,
          status: 'saving',
          lastError: null
        }
      };
    }

    case 'project/save-succeeded': {
      return {
        ...state,
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
        ...state,
        persistence: {
          ...state.persistence,
          status: 'save-failed',
          lastError: command.error
        }
      };
    }

    case 'entity/create': {
      const id = context.idFactory();
      const name = defaultEntityName(state.project.world.entities, command.entityType);
      const entity = createWorldEntity(command.entityType, id, name, command.position ? {
        position: { ...command.position },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 }
      } : undefined);

      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: [...state.project.world.entities, entity]
          }
        },
        editor: {
          ...state.editor,
          selectedEntityId: id
        }
      });
    }

    case 'entity/delete': {
      const exists = state.project.world.entities.some((entity) => entity.id === command.id);
      if (!exists) {
        return state;
      }
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: state.project.world.entities.filter((entity) => entity.id !== command.id)
          }
        },
        editor: state.editor.selectedEntityId === command.id
          ? { ...state.editor, selectedEntityId: null }
          : state.editor
      });
    }

    case 'entity/rename': {
      const entity = state.project.world.entities.find((item) => item.id === command.id);
      if (!entity) {
        return state;
      }
      const name = normalizeEntityName(command.name);
      if (name === null || name === entity.name) {
        return state;
      }
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: replaceEntity(state.project.world.entities, command.id, (item) => ({ ...item, name }))
          }
        }
      });
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
      if (transformsEqual(entity.transform, command.transform)) {
        return state;
      }
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: replaceEntity(state.project.world.entities, command.id, (item) => ({
              ...item,
              transform: {
                position: { ...command.transform.position },
                rotation: { ...command.transform.rotation },
                scale: { ...command.transform.scale }
              }
            }))
          }
        }
      });
    }

    case 'component/add': {
      const entity = state.project.world.entities.find((item) => item.id === command.entityId);
      if (!entity) {
        return state;
      }
      const error = validateComponent(command.component, `entities.${command.entityId}.components`);
      if (error) {
        return state;
      }
      const existing = entity.components ?? [];
      if (existing.some((component) => component.id === command.component.id)) {
        return state;
      }
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: replaceEntity(state.project.world.entities, command.entityId, (item) => ({
              ...item,
              components: [...(item.components ?? []), { ...command.component }]
            }))
          }
        }
      });
    }

    case 'component/remove': {
      const entity = state.project.world.entities.find((item) => item.id === command.entityId);
      if (!entity) {
        return state;
      }
      const existing = entity.components ?? [];
      if (!existing.some((component) => component.id === command.componentId)) {
        return state;
      }
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: replaceEntity(state.project.world.entities, command.entityId, (item) => ({
              ...item,
              components: (item.components ?? []).filter((component) => component.id !== command.componentId)
            }))
          }
        }
      });
    }

    case 'component/set': {
      const entity = state.project.world.entities.find((item) => item.id === command.entityId);
      if (!entity) {
        return state;
      }
      const error = validateComponent(command.component, `entities.${command.entityId}.components`);
      if (error) {
        return state;
      }
      const existing = entity.components ?? [];
      if (!existing.some((component) => component.id === command.component.id)) {
        return state;
      }
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: replaceEntity(state.project.world.entities, command.entityId, (item) => ({
              ...item,
              components: (item.components ?? []).map((component) =>
                component.id === command.component.id ? { ...command.component } : component
              )
            }))
          }
        }
      });
    }

    case 'selection/set': {
      if (command.id !== null && !state.project.world.entities.some((entity) => entity.id === command.id)) {
        return state;
      }
      if (command.id === state.editor.selectedEntityId) {
        return state;
      }
      return {
        ...state,
        editor: { ...state.editor, selectedEntityId: command.id }
      };
    }

    case 'gizmo/set-mode': {
      if (command.mode === state.editor.gizmoMode) {
        return state;
      }
      return {
        ...state,
        editor: { ...state.editor, gizmoMode: command.mode }
      };
    }

    case 'grid/set-visible': {
      if (command.visible === state.editor.gridVisible) {
        return state;
      }
      return {
        ...state,
        editor: { ...state.editor, gridVisible: command.visible }
      };
    }

    case 'preset/set': {
      if (command.preset === state.editor.activePreset) {
        return state;
      }
      return {
        ...state,
        editor: { ...state.editor, activePreset: command.preset }
      };
    }

    case 'camera/set': {
      if (sameCamera(state.editor.camera, command.pose)) {
        return state;
      }
      return {
        ...state,
        editor: {
          ...state.editor,
          camera: command.pose
            ? {
                alpha: command.pose.alpha,
                beta: command.pose.beta,
                radius: command.pose.radius,
                target: { ...command.pose.target }
              }
            : null
        }
      };
    }

    case 'log/append': {
      return {
        ...state,
        logs: [...state.logs, command.entry].slice(-500)
      };
    }

    case 'log/clear': {
      if (state.logs.length === 0) {
        return state;
      }
      return {
        ...state,
        logs: []
      };
    }

    case 'runtime/play': {
      if (state.runtime.status === 'editing') {
        const snapshot = { entities: state.project.world.entities.map((e) => ({ ...e, transform: { position: { ...e.transform.position }, rotation: { ...e.transform.rotation }, scale: { ...e.transform.scale } }, components: e.components ? e.components.map((c) => ({ ...c })) : [] })) };
        return {
          ...state,
          runtime: { status: 'running', snapshot, lastError: null }
        };
      }
      if (state.runtime.status === 'paused') {
        return {
          ...state,
          runtime: { ...state.runtime, status: 'running' }
        };
      }
      return state;
    }

    case 'runtime/pause': {
      if (state.runtime.status === 'running') {
        return {
          ...state,
          runtime: { ...state.runtime, status: 'paused' }
        };
      }
      return state;
    }

    case 'runtime/resume': {
      if (state.runtime.status === 'paused') {
        return {
          ...state,
          runtime: { ...state.runtime, status: 'running' }
        };
      }
      return state;
    }

    case 'runtime/stop': {
      if (state.runtime.status === 'editing') {
        return state;
      }
      // Reset before leaving runtime
      let next = state;
      if (state.runtime.snapshot) {
        const restored = state.runtime.snapshot.entities.map((e) => ({ ...e, transform: { position: { ...e.transform.position }, rotation: { ...e.transform.rotation }, scale: { ...e.transform.scale } }, components: e.components ? e.components.map((c) => ({ ...c })) : [] }));
        next = {
          ...state,
          project: {
            ...state.project,
            world: { ...state.project.world, entities: restored }
          }
        };
      }
      return {
        ...next,
        runtime: { status: 'editing', snapshot: null, lastError: null }
      };
    }

    case 'runtime/reset': {
      if (state.runtime.status === 'editing' || !state.runtime.snapshot) {
        return state;
      }
      const restored = state.runtime.snapshot.entities.map((e) => ({ ...e, transform: { position: { ...e.transform.position }, rotation: { ...e.transform.rotation }, scale: { ...e.transform.scale } }, components: e.components ? e.components.map((c) => ({ ...c })) : [] }));
      return {
        ...state,
        project: {
          ...state.project,
          world: { ...state.project.world, entities: restored }
        },
        runtime: { ...state.runtime }
      };
    }

    case 'runtime/error': {
      if (state.runtime.status === 'editing') {
        return state;
      }
      return {
        ...state,
        runtime: { ...state.runtime, status: 'paused', lastError: command.error }
      };
    }

    default:
      return state;
  }
}
