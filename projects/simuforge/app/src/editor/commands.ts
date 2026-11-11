import type { AppError } from '../world/types.ts';
import type { ProjectDocument } from '../project/types.ts';
import type { Transform, Component } from '../world/types.ts';
import type { LogEntry } from '../console/types.ts';
import type { CameraPose, GizmoMode, Preset } from './state.ts';

export type StudioCommand =
  | { type: 'project/new'; name: string }
  | { type: 'project/open'; document: ProjectDocument }
  | { type: 'project/save-started' }
  | { type: 'project/save-succeeded'; at: string; revision: number }
  | { type: 'project/save-failed'; error: AppError }
  | { type: 'entity/create'; entityType: 'cube' | 'sphere' | 'plane'; position?: { x: number; y: number; z: number } }
  | { type: 'entity/delete'; id: string }
  | { type: 'entity/rename'; id: string; name: string }
  | { type: 'transform/set'; id: string; transform: Transform; source: 'inspector' | 'gizmo' }
  | { type: 'component/add'; entityId: string; component: Component }
  | { type: 'component/remove'; entityId: string; componentId: string }
  | { type: 'component/set'; entityId: string; component: Component }
  | { type: 'selection/set'; id: string | null }
  | { type: 'gizmo/set-mode'; mode: GizmoMode }
  | { type: 'grid/set-visible'; visible: boolean }
  | { type: 'preset/set'; preset: Preset }
  | { type: 'camera/set'; pose: CameraPose | null }
  | { type: 'runtime/play' }
  | { type: 'runtime/pause' }
  | { type: 'runtime/resume' }
  | { type: 'runtime/stop' }
  | { type: 'runtime/reset' }
  | { type: 'runtime/step'; deltaSeconds: number }
  | { type: 'runtime/error'; error: AppError }
  | { type: 'log/append'; entry: LogEntry }
  | { type: 'log/clear' };
