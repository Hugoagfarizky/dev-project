# SimuForge - MVP-0 Architecture Proposal

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 2.0 - Approved architecture |
| Date | 2026-11-06 |
| Status | Approved for planning; no code exists; implementation not authorized |
| Owner role | Engineering Lead, SimuForge |
| Project | simuforge |
| Applies to | [MVP-0 Scaffold Specification](MVP_0_SCAFFOLD_SPECIFICATION.md) |
| Design baseline | `e722c03b1049b9fd34bad15c22693e9865761235` |
| POC baseline | POC-01 CLOSED (GO) |
| Related ADRs | [ADR 0001](../../../docs/decisions/0001-proposed-architecture-direction.md) (proposed), [ADR 0002](../../../docs/decisions/0002-mvp-0-technology-stack.md) (accepted), [ADR 0003](../../../docs/decisions/0003-mvp-0-persistence-and-project-format.md) (accepted) |
| Language | English |

## 1. Purpose and Status

This document defines the internal architecture of the MVP-0 Studio. It is a design artifact. It does not authorize implementation, and it does not claim that any module exists.

The architecture was approved with the scaffold specification and the two accepted ADRs on 2026-11-06. Approval does not start implementation. The first code change requires a separate explicit authorization.

The architecture must satisfy four inputs:

1. [Product Specification](../docs/PRODUCT_SPECIFICATION.md) §7.2: Studio shell, empty project, viewport, primitives, selection, transform, hierarchy, Inspector, save and reopen.
2. [POC-01 World Editor](../docs/POC_01_WORLD_EDITOR.md) §10: renderer-independent world model, command-only mutation, module dependency rules.
3. [POC-01 Implementation Readiness](../docs/POC_01_IMPLEMENTATION_READINESS.md) §3: pinned versions and the custom `useSyncExternalStore` store.
4. Repository [Engineering Standards](../../../docs/development/ENGINEERING_STANDARDS.md): strict TypeScript, explicit errors, boundary validation, no unnecessary dependencies.

ADR 0001 proposes a modular monolith with seven components. MVP-0 implements only three of them and leaves the rest as named seams:

| ADR component | MVP-0 status | Modules |
| --- | --- | --- |
| Studio Application | Implemented | `ui/`, `app/` |
| World Engine | Implemented (editor subset) | `world/`, `renderer/` |
| Project & Data System | Implemented (local only) | `project/`, `persistence/` |
| Programming Engine | Not implemented | Program surface is `Planned` |
| Simulation Core | Not implemented | No runtime |
| Simulation Modules | Not implemented | No physics, robotics, or domains |
| Extension Layer | Not implemented | No extension points beyond module seams |

## 2. Architectural Drivers

| Driver | Consequence |
| --- | --- |
| The world model must survive a future renderer or runtime change | `world/` stays pure and imports no Babylon, React, or DOM API |
| Babylon.js is the only validated renderer | All engine access is isolated behind one adapter interface |
| POC-01 transform and camera behavior is fixed input | Transform math and camera configuration are ported, not redesigned |
| MVP-0 has no simulation runtime | No runtime store, event bus, worker, or scheduler is introduced |
| The app is browser-only with local persistence | Storage is a port with an IndexedDB adapter and an in-memory test adapter |
| Panels rerender often during drag | Selector-based subscriptions and per-frame coalescing are required |
| Phase gating is a product rule | Gated surfaces are absent from the component tree, not disabled shells |
| Reproducibility matters more than novelty | Exact pins, lockfile, no release-day upgrades |

## 3. System Context

```text
+--------------------------- Browser (Chrome 156) ----------------------------+
|                                                                             |
|  React UI  <--- selectors ---  Studio store  --- commands --->  reducers    |
|      |                              |                              |        |
|      | canvas ref                   | snapshots                    | pure   |
|      v                              v                              v        |
|  Renderer adapter  <----------  App composition  ---------->  World domain  |
|      |                                                             |        |
|      v                                                             v        |
|  Babylon.js / WebGL 2                                      Project envelope |
|                                                                    |        |
|                                                                    v        |
|                                                        IndexedDB / file I/O  |
+-----------------------------------------------------------------------------+
```

There is no server, account, cloud sync, worker, or network call in MVP-0. The application is a static bundle served from disk or a local dev server.

### 3.1 Technology choices and rationale

| Concern | Choice | Rationale | Rejected or deferred |
| --- | --- | --- | --- |
| Framework | React 19.3.1 | POC-01 exercised React for panels and the Inspector without viewport desynchronization; `useSyncExternalStore` is built in; the panel model is component-heavy | Vue, Svelte, vanilla UI: no POC evidence; a rewrite invalidates the closure record |
| Language | TypeScript 6.0.3 | Repository standards require `strict` and `noUncheckedIndexedAccess`; typed world and project schemas reduce boundary errors | Plain JavaScript: loses the schema and command typing the domain needs |
| Build tool | Vite 8.3.5 | POC-01 baseline; ESM dev server, React plugin, production bundling, no custom build layer | Webpack, Parcel: more configuration for no MVP-0 gain |
| 3D engine | Babylon.js 9.32.1 | The only engine validated by POC-01 for right-handed picking, ArcRotateCamera, world/local gizmos, and rendering | Three.js: documented alternative, unvalidated here; a second renderer is out of scope |
| State management | Custom store over `useSyncExternalStore`, command-only reducer | Small state shape; no dependency; immutable snapshots and explicit mutation boundary | Zustand, Redux: add API surface without removing code |
| Persistence | IndexedDB for project records, `localStorage` for layout, JSON files for portability | Platform APIs; no wrapper; offline; explicit failure modes | Dexie, idb: one object store does not justify a wrapper; server storage: no backend |
| Testing | `node:test` for pure logic, CDP harness for browser behavior | Zero dependency; matches the POC-01 evidence method; tests domain rules without a DOM | Vitest, Playwright: deferred until component or cross-browser tests are required |
| Styling | CSS custom properties plus authored component CSS | The design system is already token-based; a CSS framework would conflict with the specified geometry | Tailwind, CSS-in-JS, UI kits: duplicate the token system and add build complexity |

The versions are pinned exactly and justified in [MVP_0_DEPENDENCY_AND_LICENSE_INVENTORY.md](MVP_0_DEPENDENCY_AND_LICENSE_INVENTORY.md). This table records the architectural reason; the inventory records the package, license, and compatibility reason.

## 4. Module Boundaries

### 4.1 Modules and responsibilities

| Module | Responsibility | Owns | Must not do |
| --- | --- | --- | --- |
| `world/` | Entity types, transform math, defaults, validation, world serialization | Pure world rules | Import Babylon, React, or DOM APIs; read storage |
| `project/` | Project envelope, project validation, schema version policy | Project document contract | Import Babylon or React; perform I/O |
| `editor/` | Editor state, command union, reducer, selection rules, dirty tracking, store | In-memory authored and editor state | Import Babylon, React, or storage; own camera math |
| `renderer/` | Babylon engine, scene, camera, grid, meshes, picking, gizmos, selection outline | GPU and scene objects | Import React or editor internals; mutate world state |
| `persistence/` | Storage ports, IndexedDB adapter, memory adapter, layout storage, file read/write | Durable local data | Import React or Babylon; decide product behavior |
| `console/` | Log entry model, severity, source, ring buffer, filtering | Log data | Import React or Babylon |
| `ui/` | React shell, panels, dialogs, hooks, accessibility | Rendering and input | Import `@babylonjs/*`; call IndexedDB directly |
| `app/` | Composition root, bootstrap, wiring, error boundary, lifecycle | Object graph and side effects | Contain domain rules |

### 4.2 Dependency rules

| Module | May depend on | Must not depend on |
| --- | --- | --- |
| `world/` | Standard library, `project/` types only if unavoidable | Babylon, React, DOM, `editor/`, `renderer/`, `persistence/`, `ui/`, `app/` |
| `project/` | `world/` | Babylon, React, DOM, `editor/`, `renderer/`, `ui/`, `app/` |
| `editor/` | `world/`, `project/` | Babylon, React, DOM, `persistence/`, `ui/`, `app/` |
| `console/` | Standard library | Babylon, React, DOM, `ui/`, `app/` |
| `renderer/` | `world/` types, Babylon | React, `editor/`, `ui/`, `app/` |
| `persistence/` | `world/`, `project/`, DOM storage APIs | React, Babylon, `ui/`, `app/` |
| `ui/` | `editor/`, `world/` types, `project/` types, `renderer/` port, `console/` types, React | `@babylonjs/*`, `persistence/` adapters |
| `app/` | All modules | Business rules beyond composition |

This preserves the POC-01 rule and adds `project/`, `persistence/`, and `console/` as explicit seams. The rule is enforced by a TypeScript-compiler-API script, not by convention alone. See §5.4.

### 4.3 Proposed directory structure

```text
projects/simuforge/app/
  package.json
  package-lock.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  index.html
  .node-version
  THIRD_PARTY_NOTICES.md
  scripts/
    check-boundaries.mjs
    cdp-smoke.mjs
    check-tokens.mjs
  src/
    main.tsx
    app/
      App.tsx
      bootstrap.ts
      wiring.ts
      ErrorBoundary.tsx
    world/
      types.ts
      defaults.ts
      transform.ts
      validation.ts
      serialization.ts
      commands.ts
    project/
      types.ts
      validation.ts
      serialization.ts
      constants.ts
    editor/
      state.ts
      commands.ts
      reducer.ts
      store.ts
      selectors.ts
      useStore.ts
      dirty.ts
    renderer/
      RendererPort.ts
      BabylonRenderer.ts
      camera.ts
      grid.ts
      selectionOutline.ts
      gizmos.ts
      meshFactory.ts
      diagnostics.ts
    persistence/
      ProjectRepository.ts
      IndexedDbProjectRepository.ts
      MemoryProjectRepository.ts
      LayoutStorage.ts
      fileTransfer.ts
      errors.ts
    console/
      types.ts
      logBuffer.ts
      filters.ts
    ui/
      shell/
        StudioShell.tsx
        TopBar.tsx
        StatusBar.tsx
        Splitter.tsx
      hub/
        ProjectHub.tsx
        ProjectList.tsx
        NewProjectDialog.tsx
        ProjectErrorDialog.tsx
      hierarchy/
        WorldHierarchy.tsx
        HierarchyRow.tsx
      viewport/
        ViewportHost.tsx
        ViewportOverlay.tsx
        WebGlFallback.tsx
      inspector/
        Inspector.tsx
        TransformSection.tsx
        NumericField.tsx
      program/
        ProgramSurface.tsx
        PlannedSurface.tsx
      console/
        ConsoleDrawer.tsx
        ConsoleRow.tsx
        ConsoleFilters.tsx
      common/
        Button.tsx
        Dialog.tsx
        Field.tsx
        Tooltip.tsx
      hooks/
        useKeyboardShortcuts.ts
        useElementSize.ts
        useFocusTrap.ts
    styles/
      tokens.css
      reset.css
      shell.css
      panels.css
  test/
    world/
    project/
    editor/
    console/
    helpers/
```

The directory is named `app/` to separate the runnable application from design and documentation. The exact folder name is an owner decision only if the repository requires a different convention; nothing in the architecture depends on it.

## 5. State Architecture

### 5.1 Store choice

The store is a small custom implementation over `useSyncExternalStore`, as accepted by POC-01. No state library is added.

```ts
interface Store<T> {
  getSnapshot(): T;              // stable object identity until a change
  subscribe(listener: () => void): () => void;
  dispatch(command: StudioCommand): void;
}
```

Rules:

- `getSnapshot` returns a cached immutable object. It is recomputed only when the reducer produces a new state.
- `subscribe` stores listeners in a `Set`; listeners run synchronously after the reducer commits.
- `dispatch` is the only mutation entry point. Components and the renderer call commands; they never assign state.
- A reducer that returns the same state object performs no notification.
- Nested mutations are forbidden. New arrays, objects, and maps are created on change.

### 5.2 State shape

```ts
interface StudioState {
  project: ProjectDocument;        // authored data, serializable
  editor: EditorState;             // never serialized
  persistence: PersistenceState;   // save/open status, dirty flag source
  logs: readonly LogEntry[];       // memory only
}

interface ProjectDocument {
  format: "simuforge.project";
  schemaVersion: 1;
  project: ProjectMetadata;
  world: WorldDocument;
}

interface EditorState {
  selectedEntityId: string | null;
  gizmoMode: "translate" | "rotate" | "scale";
  gridVisible: boolean;
  preset: "build" | "program" | "simulate";
  camera: CameraPose | null;
}

interface PersistenceState {
  revision: number;                // increments only on authored change
  savedRevision: number;
  status: "clean" | "dirty" | "saving" | "save-failed";
  lastSavedAt: string | null;
  lastError: AppError | null;
}
```

Dirty state is `revision !== savedRevision`. This avoids deep comparison and keeps editor-only changes from marking the project dirty.

### 5.3 Commands

```ts
type StudioCommand =
  | { type: "project/new"; name: string }
  | { type: "project/open"; document: ProjectDocument }
  | { type: "project/save-started" }
  | { type: "project/save-succeeded"; at: string; revision: number }
  | { type: "project/save-failed"; error: AppError }
  | { type: "entity/create"; entityType: EntityType; position?: Vec3; source: "user" | "gizmo" }
  | { type: "entity/delete"; id: string }
  | { type: "entity/rename"; id: string; name: string }
  | { type: "transform/set"; id: string; transform: Transform; source: "inspector" | "gizmo" }
  | { type: "selection/set"; id: string | null }
  | { type: "gizmo/set-mode"; mode: GizmoMode }
  | { type: "grid/set-visible"; visible: boolean }
  | { type: "preset/set"; preset: Preset }
  | { type: "camera/set"; pose: CameraPose }
  | { type: "log/append"; entry: LogEntry }
  | { type: "log/clear" };
```

`source` exists for renderer echo suppression, not for analytics.

Reducer invariants:

1. A deleted entity cannot remain selected.
2. A selected ID must exist in the world.
3. `transform/set` with an invalid transform is rejected before the reducer runs; the reducer also guards non-finite values.
4. `project/open` replaces the project atomically and resets selection, camera, and dirty state.
5. Editor commands never bump `revision`.
6. Authored commands bump `revision` exactly once.
7. No command produces a partially updated world.

### 5.4 Derived selectors and React integration

```ts
function useStudio<T>(selector: (state: StudioState) => T): T;
```

`useStudio` wraps `useSyncExternalStore` and applies `Object.is` to the selected value. Selectors are pure and return primitives, stable references, or memoized slices. A selector that allocates a new array on every call must be memoized; the scaffold uses `useMemo`-style cached selectors for lists.

High-frequency paths:

- Gizmo drag dispatches `transform/set` at most once per animation frame.
- The Inspector subscribes to the selected entity and its transform only.
- The Hierarchy subscribes to entity IDs and names only.
- The status bar subscribes to counts and save status only.
- The viewport host subscribes to nothing; `app/wiring.ts` pushes snapshots to the renderer outside React.

### 5.5 Renderer echo suppression

During a gizmo drag the renderer is the source of the transform. The adapter records the active entity ID and drag state. When the store snapshot returns, the adapter skips applying the transform to the mesh under active drag. On drag end it dispatches a final commit and clears the flag. This prevents a feedback loop without introducing a second source of truth.

## 6. Renderer Adapter

The adapter is the production form of the POC-01 spike. It preserves the validated scene setup: right-handed coordinates, +Y up, -Z forward, WebGL 2, ArcRotateCamera with the POC-01 input map, world-space translate/rotate gizmos, local-space scale, and quaternion-backed transforms. It does not re-derive those decisions.

### 6.1 Port

```ts
interface RendererPort {
  mount(canvas: HTMLCanvasElement): Promise<RendererDiagnostics>;
  dispose(): void;
  resize(width: number, height: number): void;
  applyWorld(world: WorldDocument): void;
  applySelection(entityId: string | null): void;
  applyGizmoMode(mode: GizmoMode): void;
  applyGridVisible(visible: boolean): void;
  setEventSink(sink: RendererEventSink): void;
  frameSelection(entityId: string | null): void;
  frameWorld(): void;
  getDiagnostics(): RendererDiagnostics;
}

interface RendererEventSink {
  onPick(entityId: string | null): void;
  onTransformPreview(id: string, transform: Transform): void;
  onTransformCommit(id: string, transform: Transform): void;
  onCameraChange(pose: CameraPose): void;
  onError(error: AppError): void;
}
```

The adapter never imports React, never reads the store, and never mutates the world document. The composition root wires events to commands.

### 6.2 Reconciliation

- `applyWorld` diffs by entity ID: create missing meshes, dispose removed meshes, update changed transforms and names.
- Mesh creation is idempotent per ID.
- A full rebuild is allowed only on `project/open`; it must dispose the previous meshes and materials.
- Disposal is verified by comparing tracked mesh count to world entity count in diagnostics.

### 6.3 Camera

- One `ArcRotateCamera`, right-handed scene, +Y up.
- Target at the world origin on new/open.
- Alt + left drag or middle drag orbits.
- Shift + middle drag or right drag pans.
- Wheel zooms.
- Radius 0.5-500; beta 0.01 to `pi - 0.01`.
- Plain left click selects and never orbits.
- The camera pose is editor state; it is not saved.
- `frameSelection` computes bounds from the selected mesh; `frameWorld` uses all meshes, or a default pose for an empty world.

### 6.4 Picking and selection

- Picking runs on pointer up with a movement threshold; a drag is not a click.
- A hit returns the entity ID from mesh metadata.
- Empty space returns `null`.
- Gizmo handles take precedence; picking is suppressed while a gizmo is active.
- Selection outline is an editor-only scene effect and is not part of the world document.

### 6.5 Lifecycle

- The engine is created once per mounted viewport.
- `ResizeObserver` triggers `resize`; the canvas buffer follows CSS size and device pixel ratio.
- A lost WebGL context logs `RENDER_CONTEXT_LOST`, pauses rendering, and shows the fallback. Restoration recreates scene resources or reloads the viewport.
- Unmount disposes gizmos, meshes, materials, layers, camera, scene, and engine in that order.

## 7. Persistence Architecture

### 7.1 Ports

```ts
interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;             // newest first
  get(id: string): Promise<ProjectDocument>;     // throws AppError
  put(document: ProjectDocument): Promise<void>;
  delete(id: string): Promise<void>;
  getLastOpenedId(): Promise<string | null>;
  setLastOpenedId(id: string | null): Promise<void>;
}

interface LayoutStorage {
  load(): LayoutState | null;
  save(state: LayoutState): void;
  clear(): void;
}

interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  entityCount: number;
}

interface LayoutState {
  preset: "build" | "program" | "simulate";
  leftWidth: number;
  rightWidth: number;
  programHeight: number;
  consoleHeight: number;
  collapsed: Record<"hierarchy" | "assets" | "inspector" | "monitor" | "program" | "console", boolean>;
}
```

Implementations:

- `IndexedDbProjectRepository` for the browser.
- `MemoryProjectRepository` for tests and for a read-only fallback when IndexedDB is unavailable.
- `LocalStorageLayoutStorage` for panel sizes and preset, best effort.

### 7.2 IndexedDB schema

```text
Database: simuforge
Version: 1
Object store: projects
  keyPath: id
  index: updatedAt (non-unique)

localStorage:
  simuforge.layout.v1
  simuforge.last-project.v1
```

The database version is independent of the project `schemaVersion`. A future migration changes the database version; project evolution changes the document version.

### 7.3 Write and read paths

Write:

1. Commit any focused Inspector field. Abort on invalid input.
2. Build the project envelope from the current state.
3. Validate the envelope and nested world.
4. Open one `readwrite` transaction on `projects`.
5. `put` the record, update `updatedAt`, set the last-opened key after the transaction completes.
6. Dispatch `project/save-succeeded` with the revision captured before the write.

Read:

1. Read the record or file.
2. Parse JSON; reject invalid JSON.
3. Validate `format` and `schemaVersion`.
4. Validate the envelope and world.
5. Only then dispatch `project/open`.

The revision captured at step 1 is compared at step 6. If the user edited during the save, the project remains dirty. This prevents a lost-update false clean state.

### 7.4 Error taxonomy

| Code | Cause | Surface |
| --- | --- | --- |
| `STORAGE_UNAVAILABLE` | IndexedDB blocked or unavailable | Banner plus file fallback |
| `STORAGE_QUOTA_EXCEEDED` | Quota error | Banner with Retry and Export Copy |
| `STORAGE_READ_FAILED` | Transaction or read error | Hub error |
| `PROJECT_NOT_FOUND` | Missing ID | Hub error |
| `PROJECT_CORRUPT` | Invalid JSON or schema | Hub error with path |
| `UNSUPPORTED_SCHEMA` | `schemaVersion` newer than 1 | Hub error |
| `FILE_TOO_LARGE` | Over 1 MiB | Open dialog error |
| `FILE_READ_FAILED` | File API failure | Open dialog error |
| `VALIDATION_FAILED` | Domain validation failure | Inline or Hub error with path |

All expected failures are returned as `AppError` values or rejected promises carrying `AppError`. Defects throw and are caught at the React error boundary or global handler.

## 8. Error Handling and Logging

### 8.1 Error model

```ts
interface AppError {
  code: AppErrorCode;
  message: string;        // user-facing, short
  path?: string;          // e.g. entities[2].transform.scale.y
  detail?: string;        // safe diagnostic detail
  cause?: unknown;        // never rendered directly
}
```

- Expected failures are values, not exceptions.
- `catch` exists only to translate a failure into an `AppError` and log it. Empty `catch` blocks are prohibited.
- Domain validation returns the first error with a path.
- User-facing messages do not include stack traces.

### 8.2 Log pipeline

```text
error source -> LogEntry -> console/logBuffer -> store -> Console drawer
                                   |
                                   +-> development console mirror
```

`LogEntry` fields: `id`, `timestamp`, `severity`, `source`, `code`, `message`, `detail`, `entityId?`.

- Sources in MVP-0: `APP`, `EDITOR`, `RENDER`, `IMPORT`.
- Severities: `info`, `warn`, `error`.
- Ring buffer cap: 500 entries. Oldest entries are dropped first. This is an MVP-0 implementation limit, not a product guarantee.
- The Console auto-expands once per session on the first error without stealing focus.
- Logs are not persisted and are not sent anywhere.
- Log payloads never include the full project document. They include IDs, names, paths, and error codes.

### 8.3 Global handlers

- `window.onerror` and `unhandledrejection` append an `APP` error and show a non-blocking toast.
- The React error boundary shows a recovery screen with Reload and Copy Diagnostics. It does not attempt to save a potentially corrupt state.
- A WebGL 2 or engine initialization failure shows the viewport fallback, not a blank canvas.
- Storage failure never blocks editing; it degrades save to file export.

### 8.4 Development diagnostics

A test hook is exposed only when the app runs with `?test=1` in a development build. It provides read-only access to entity count, selected ID, save status, and layout metrics. It is absent from production builds.

## 9. Testing Strategy

### 9.1 Layers

| Layer | Tool | Scope |
| --- | --- | --- |
| Domain unit | `node:test` | Transform math, defaults, validation, world serialization |
| Project unit | `node:test` | Envelope validation, version rejection, round-trip |
| State unit | `node:test` | Reducer invariants, dirty tracking, subscription stability, save state machine |
| Storage unit | `node:test` | `MemoryProjectRepository` behavior and error mapping |
| Boundary check | TypeScript compiler API script | Import rules from §4.2 |
| Browser layout | Chrome 156 over CDP | 1024 x 640 and 1440 x 900, no page scroll, panel bounds, collapse |
| Browser interaction | Chrome 156 over CDP | Selection, transform commit/revert, keyboard shortcuts, dialogs |
| Renderer smoke | Chrome 156 over CDP | Canvas present, non-blank, entity count, console errors, screenshots |
| Accessibility smoke | Manual plus CDP | Focus order, focus ring, accessible names, reduced motion |

No React component test runner is added in MVP-0. Components are covered by browser interaction tests. If component-level tests become necessary, the test runner decision is revisited with its own dependency review.

### 9.2 Test doubles

- `MemoryProjectRepository` for storage.
- A `NullRenderer` implementing `RendererPort` for UI tests that do not need WebGL.
- An injected clock for timestamps and save-state tests. Tests must not depend on wall-clock time.
- An injected ID factory for deterministic entity IDs.

### 9.3 Required test cases

| Area | Cases |
| --- | --- |
| Transform | Identity defaults; quaternion normalize; YXZ display round-trip; gimbal-lock boundary; TRS composition order |
| Validation | Duplicate IDs; empty name; unsupported type; non-finite values; zero and negative scale; malformed metadata |
| World serialization | Empty world; three primitive types; unknown fields ignored; missing field rejected; round-trip within 1e-6 |
| Project | Valid envelope; wrong format; missing project fields; newer schema; corrupt JSON; nested world failure path |
| Reducer | Delete selected clears selection; open resets editor; editor commands do not dirty; authored commands dirty once |
| Save | Success clears dirty at captured revision; edit during save stays dirty; failure keeps dirty; invalid field blocks save |
| Logs | Severity filter; search; clear keeps filters; cap drops oldest |
| Layout | 1024 x 640 and 1440 x 900 bounds; no page scroll; minimum viewport; collapse restores size |
| Shortcuts | Ctrl+S/O, W/E/R, F, Shift+F, G, F2, Delete, Esc; conflict audit recorded |

### 9.4 Acceptance trace

Every `M0-AC-*` criterion in the scaffold specification is mapped to one automated test or one recorded manual check. The implementation plan carries the mapping. A criterion with no evidence is not complete.

## 10. Performance Baseline

### 10.1 What is measured

| Metric | Method |
| --- | --- |
| Frame interval | `requestAnimationFrame` deltas sampled for 5 seconds |
| Engine frame time | Babylon scene instrumentation or `performance.now()` around render |
| Selection latency | Pointer up timestamp to Inspector update timestamp |
| Gizmo latency | Pointer move timestamp to mesh transform applied |
| Project open time | File/IDB read start to first rendered frame |
| Save time | Command dispatch to transaction completion |
| Memory | `performance.memory` where available, recorded as indicative only |

### 10.2 Scenarios

Reuse the POC-01 scene ladder: S0 empty, S3 10 primitives, S4 50 primitives, S5 100 primitives. Scenes are generated deterministically, not authored by hand.

### 10.3 Reporting

- Record p50 and p95, not a single average.
- Record hardware, OS, Chrome version, display scale, and build commit.
- Do not claim a frame-rate target. `60 fps` in a mockup is illustrative.
- If p95 frame time at 10 entities exceeds one 60 Hz frame, investigate before adding features. This is an engineering triage threshold, not a product acceptance target.
- The Product Owner sets any user-facing performance budget after the first measurement.

## 11. Browser and Platform Support

| Item | MVP-0 position |
| --- | --- |
| Primary browser | Chrome 156 desktop on Windows |
| WebGL | WebGL 2 required; WebGL 1 is not supported |
| Edge | Same Chromium engine; not claimed until tested |
| Firefox | Not supported in MVP-0; no claim |
| Safari | Not supported in MVP-0; no claim |
| Mobile | Not supported |
| Secure context | Required for `crypto.randomUUID`; `localhost` qualifies |
| Zoom | 100-200% supported while the effective viewport stays at least 1024 x 640 |
| Reduced motion | Respected for non-essential transitions |
| Offline | Supported; the app makes no network requests after load |

## 12. Build and Tooling

| Concern | Decision |
| --- | --- |
| Package manager | npm 11.19.1, lockfile version 3 |
| Node | 24.22.2 LTS (Maintenance LTS), recorded in `engines` and `.node-version` |
| Dev server | Vite 8.3.5 |
| Production build | Vite build, ES2022 target |
| Type checking | `tsc --noEmit` with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `noUnusedLocals` |
| Tests | `node --test` on compiled-free TypeScript via Node's type stripping, or a build step if type stripping is insufficient |
| Boundary check | `scripts/check-boundaries.mjs` using the TypeScript compiler API |
| Token check | `scripts/check-tokens.mjs` recomputes contrast ratios and fails below 4.5:1 for normal text |
| Browser smoke | `scripts/cdp-smoke.mjs`, Chrome launched with a remote debugging port |
| Formatting / lint | Deferred to Phase 01; TypeScript strict mode plus boundary and token checks are the MVP-0 gates |
| Notices | Generated from the lockfile at build time and committed |

`node --test` with TypeScript requires a decision at I-01: Node 24 type stripping handles erasable syntax, or tests are compiled with `tsc` into a temporary directory. The plan prefers native type stripping and falls back to compilation only if a test needs unsupported syntax.

## 13. Architecture Decision Records

Both decisions were accepted on 2026-11-06. They are binding for MVP-0 and do not accept ADR 0001 retroactively; they record the MVP-0 choices inside its modular-monolith direction.

| ADR | Title | Status | Why it is expensive to reverse |
| --- | --- | --- | --- |
| [ADR 0002](../../../docs/decisions/0002-mvp-0-technology-stack.md) | MVP-0 technology stack | **accepted** | Touches every module, the build, and the test strategy |
| [ADR 0003](../../../docs/decisions/0003-mvp-0-persistence-and-project-format.md) | MVP-0 local persistence and project file format | **accepted** | Defines durable user data and a public file contract |

A change to either decision requires a new ADR and Project Owner approval. It is not made inside an increment.

## 14. Risks

| ID | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| ARCH-01 | Renderer echo during gizmo drag causes transform jitter | Broken editing | Active-drag suppression plus commit-only persistence; covered by an interaction test |
| ARCH-02 | Store selectors allocate new objects and loop React | UI freeze | Selector rules, cached slices, and a unit test for snapshot stability |
| ARCH-03 | IndexedDB is unavailable or blocked | No local projects | File open/save fallback and a clear banner |
| ARCH-04 | Save races an edit and clears dirty incorrectly | Data loss | Revision capture and compare on completion |
| ARCH-05 | WebGL context loss leaves a blank viewport | Dead surface | Context-loss handler, fallback, and reload path |
| ARCH-06 | Babylon deep imports increase bundle size | Slow load | Subpath imports and a production build check |
| ARCH-07 | 1024 x 640 layout regresses silently | Unusable compact mode | CDP layout assertions in CI or the release checklist |

### 14.1 POC-01 residual risks carried forward (C-03)

| Risk | MVP-0 owner | MVP-0 treatment | Verification point |
| --- | --- | --- | --- |
| R-1 Euler display ambiguity at gimbal lock | Engineering (renderer/Inspector) | Quaternion source of truth; YXZ label; boundary tests near +/-90 degrees | I-06 transform tests; I-09 risk register |
| R-2 Serialization round-trip not validated | Engineering (world/project) | Automated round-trip tests in I-03 and I-07 | I-03 unit suite; I-07 save/open round-trip |
| R-3 No performance baseline | Engineering (app) | Measure S0/S3/S4/S5 in I-09 and record evidence | I-09 performance report |
| R-4 Chrome-only scope | Product Owner | Recorded as an accepted limitation; no cross-browser claim | I-09 acceptance report |
| R-5 Negative zoom radius | Engineering (renderer) | Radius clamps in the camera controller and a camera test | I-04 camera test; I-09 risk register |

Owner acceptance of C-03 does not close R-1 through R-5. Each risk is closed only when its verification point records evidence.

## 15. Traceability

| Architectural claim | Source |
| --- | --- |
| Modular monolith and component names | ADR 0001 |
| Module dependency rules | POC-01 World Editor §10.2 |
| Command-only mutation | POC-01 World Editor §10.3 |
| Custom store | POC-01 Implementation Readiness §3.2 |
| Transform policy | POC-01 World Editor §9 |
| Camera policy | POC-01 World Editor §6.7; Interaction Specification §5 |
| World schema | POC-01 World Editor §11 |
| Project envelope | ADR 0003; MVP-0 Scaffold Specification §4.5 |
| Storage model | ADR 0003; MVP-0 Scaffold Specification §7 |
| Technology stack | ADR 0002 |
| Acceptance gates | ACG-01..ACG-04; MVP-0 Scaffold Specification §11.1 |
| Phase gating | Design Readiness D-12; UI Component Inventory §14 |
| Error handling rules | Engineering Standards, Correctness |
| Performance scenarios | POC-01 World Editor §12.2 |

## 16. Approval

The Project Owner approved this architecture on 2026-11-06. It is not implementation authorization.

| Role | Decision | Date |
| --- | --- | --- |
| Product Owner | **Approved; implementation not authorized** | 2026-11-06 |
| Engineering reviewer | Reviewed for documentation consistency | 2026-11-06 |
