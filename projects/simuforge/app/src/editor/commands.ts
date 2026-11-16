import type { AppError } from '../world/types.ts';
import type { ProjectDocument } from '../project/types.ts';
import type { Transform, Component, Vec3 } from '../world/types.ts';
import type { Graph } from '../graph/types.ts';
import type { LogEntry } from '../console/types.ts';
import type { CameraPose, GizmoMode, Preset } from './state.ts';
import type { PythonRunOutcome, PythonRuntimeStatus } from '../python/types.ts';

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
  | { type: 'runtime/apply-force'; entityId: string; force: Vec3 }
  | { type: 'runtime/apply-impulse'; entityId: string; impulse: Vec3 }
  | { type: 'runtime/clear-force'; entityId?: string }
  | { type: 'runtime/graph-trigger'; triggerNodeId?: string }
  | { type: 'demo/load-scenario' }
  | { type: 'graph/set'; graph: Graph | null }
  | { type: 'graph/select-node'; nodeId: string | null }
  | { type: 'runtime/error'; error: AppError }
  | { type: 'runtime/python-result'; requestId: string; outcome: PythonRunOutcome }
  | { type: 'python/create-script'; name?: string }
  | { type: 'python/rename-script'; scriptId: string; name: string }
  | { type: 'python/delete-script'; scriptId: string }
  | { type: 'python/set-source'; scriptId: string; source: string }
  | { type: 'python/select-script'; scriptId: string | null }
  | { type: 'python/load-runtime' }
  | { type: 'python/runtime-status'; status: PythonRuntimeStatus; detail: string | null }
  | { type: 'log/append'; entry: LogEntry }
  | { type: 'log/clear' };
