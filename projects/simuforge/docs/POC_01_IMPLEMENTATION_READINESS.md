# SimuForge — POC-01 Implementation Readiness

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 0.8 — Draft |
| Date | 2026-11-03 |
| Status | Research complete; technical spike in progress (SP-01 to SP-04 executed; SP-05 full automated suite executed and awaiting review; SP-06 to SP-08 pending) |
| Owner role | Technical Lead, SimuForge |
| Project | simuforge |
| Related specification | [POC-01 World Editor](POC_01_WORLD_EDITOR.md) |
| Supersedes | None |

### Changelog

| Version | Date | Summary |
| --- | --- | --- |
| 0.1 | 2026-10-31 | Resolved the implementation-blocking questions Q-01, Q-02, Q-04, Q-05, Q-09, and Q-10 at documentation level; recorded the vendor research, provisional version combination, import limit policy, environment matrix, evidence structure, and spike plan. |
| 0.2 | 2026-10-31 | Recorded the approved hybrid transform policy (world-space translate, world-space rotate, local-space scale). B-01 is resolved as a product decision. Updated SP-05, the go/no-go criteria, and the remaining blocker list. Overall status remains conditionally ready. |
| 0.3 | 2026-10-31 | Confirmed the provisional, configurable 1 MiB import limit and its below/at/above boundary tests, and designated `projects/simuforge/reports/poc-01/` as the official POC-01 evidence location. |
| 0.4 | 2026-10-31 | Recorded the approved TypeScript 6.0.3 POC decision, the unverifiable Firefox installation status, and the proposed evidence ownership model. |
| 0.5 | 2026-10-31 | Resolved B-04 as Chrome-only browser scope: Google Chrome is the only supported and tested browser for POC-01; Firefox is explicitly excluded; cross-browser compatibility is outside POC-01 scope. Removed Firefox installation from prerequisites and execution gates. |
| 0.6 | 2026-10-31 | Approved the POC-01 evidence ownership and sequential testing workflow; resolved B-06. Executed SP-01 engine initialization in Google Chrome; recorded PASS with evidence. |
| 0.7 | 2026-11-03 | Recorded the Project Owner's approval of direct-CDP `Input.dispatchMouseEvent` as an SP-05 evidence method and repaired the SP-05 harness: lazy gizmo creation now receives the world/world/local coordinate-space policy through `applyGizmoSpace()`, and input provenance distinguishes `physical_mouse`, `cdp_trusted_input`, `synthetic_input`, and `programmatic_transform`. Three proof cases (world X translation, world X rotation, local X scale after a genuine ~42° Y rotation) passed twice with fresh reloads and no false provenance. SP-05 remains BLOCKED pending the full T-01 through T-06 evidence and review; A-03 and A-04 remain unverified. |
| 0.8 | 2026-11-03 | Executed the full SP-05 suite through the approved direct-CDP runner. T-01 through T-06 passed 256/256 assertions with 14 fully trusted drags, no retries, no synthetic input, and no console errors; an independent evidence audit passed 750/750 checks. Official evidence is archived under `results/sp-05-manual/evidence/`. SP-05 remains BLOCKED pending human review; A-03 and A-04 remain unverified. |

This document is research and planning only. It contains no application code, no installed dependencies, and no test results. Statements about browser or library behavior are separated into documented behavior and assumptions that still require the technical spike.

## 1. Executive Summary

The blocking questions are resolved enough to start the technical spike. The **hybrid transform policy** has been approved: translate operates in world space, rotate operates in world space, and scale operates in the entity's local space. The stored transform remains a plain TRS transform (world position, unit quaternion rotation, local scale). This resolves B-01 as a product decision. It does not prove how Babylon.js behaves; that remains the purpose of the spike.

The policy exists because Babylon.js does not support world-space orientation for the scale gizmo, and because a world-axis non-uniform scale on a rotated entity produces shear that a position/quaternion/scale transform cannot represent. Babylon.js is treated as a renderer only. The transform policy belongs to the Editor/Transform Controller layer, the world model stores data, and the renderer adapter maps the policy onto Babylon interactions. The POC specification records this boundary in §9.7 and §9.8.

Recommended provisional combination:

| Package | Version | License |
| --- | --- | --- |
| Node.js | 24.22.2 LTS | MIT-style Node license |
| React / React DOM | 19.3.1 | MIT |
| TypeScript | 6.0.3 | Apache-2.0 |
| Vite | 8.3.5 | MIT |
| @vitejs/plugin-react | 6.1.2 | MIT |
| @babylonjs/core | 9.32.1 | Apache-2.0 |

Key points:

- TypeScript 7.0.2 is the newest stable release, but it is a new native compiler implementation. TypeScript 6.0.3 is recommended for the POC to avoid tooling churn that is unrelated to the questions the POC is trying to answer.
- Babylon.js 9.33.1 was published on 2026-10-30, less than a day before this document. Version 9.32.1 is recommended to avoid adopting a same-day patch; no 9.33 feature is needed by POC-01.
- Vite 8.3.5 and plugin-react 6.1.2 are a compatible pair; plugin-react requires Vite 8 and its optional peer dependencies do not need to be installed.
- Node 24 LTS is recommended instead of the newly promoted Node 26 LTS. Vite 8 requires Node `^20.19.0 || >=22.12.0`, which Node 24 satisfies.

### 1.1 Approved transform policy

| Transform | Coordinate space | Stored as |
| --- | --- | --- |
| Translate | World | `position` |
| Rotate | World | `rotation` quaternion |
| Scale | Local | `scale` |

Supporting rules, recorded in full in the POC specification:

- The world model keeps a TRS transform. Shear and an arbitrary affine matrix are out of scope for POC-01.
- Rotation is stored as a quaternion and is the source of truth. Euler values are Inspector display and input only.
- The Editor/Transform Controller owns the policy. The world model stores data, and the renderer adapter maps the policy to Babylon.js.
- There is no local/world toggle and no custom world-space scale implementation.
- Negative scale is explicitly unsupported. Near-zero scale is rejected by a provisional `1e-3` floor.

### 1.2 Readiness verdict

**Conditionally ready for the spike; not ready for full POC implementation.** The spike must confirm right-handed picking, gizmos, camera remapping, and quaternion behavior, plus the hybrid transform policy in practice. SP-01 to SP-04 have been executed with recorded evidence; the full SP-05 automated suite has been executed and awaits review; SP-06 to SP-08 have not been executed. No POC-01 acceptance criterion may be marked PASS without the relevant evidence.

## 2. Q-01 through Q-10 Status

| ID | Question | Status | Outcome | Blocking? |
| --- | --- | --- | --- | --- |
| Q-01 | Technology versions and licensing | Resolved (provisional) | Version combination and license table recorded; exact versions still require lockfile verification after approval to install | No |
| Q-02 | Right-handed coordinate system | Partially resolved | Official behavior documented; picking, gizmos, and camera remapping still require empirical spike evidence | Yes, for confidence in the architecture |
| Q-03 | Selection feedback technique | Deferred, non-blocking | Per-mesh outline first; highlight layer or bounding box as fallback | No |
| Q-04 | State management | Resolved | Custom store with `useSyncExternalStore`; no state library | No |
| Q-05 | Import size limit | Resolved (provisional) | 1 MiB (1,048,576 bytes) configurable POC guardrail with pre-parse enforcement and below/at/above boundary tests; not a final product limit | No |
| Q-06 | Duplicate entity names | Deferred, non-blocking | Duplicates allowed; IDs are identity | No |
| Q-07 | Plane double-sided rendering | Deferred, non-blocking | Double-sided plane for the POC | No |
| Q-08 | Euler display order | Deferred, non-blocking | Store quaternion; display Euler in YXZ yaw-pitch-roll order | No |
| Q-09 | Browser and hardware matrix | Resolved | Primary environment captured; Chrome-only browser scope approved; cross-browser compatibility is outside POC-01 scope | No |
| Q-10 | Evidence and evaluation ownership | Resolved | `projects/simuforge/reports/poc-01/` is the official location; directory structure, artifact rules, and review ownership are defined | No |

Q-03, Q-06, Q-07, and Q-08 are not implementation blockers and remain as proposals in the POC specification. They were not part of this readiness task's research scope.

Q-02 remains partially resolved. The approved transform policy is a product decision, not evidence that Babylon.js behaves as required in right-handed mode. Picking, gizmo interaction, camera remapping, and quaternion behavior still require the spike.

## 3. Technology Version and Licensing Research

### 3.1 Selection principles

Versions were selected using these rules:

1. Prefer a stable release with enough field time to have its patch releases absorbed.
2. Prefer a combination with explicit compatibility statements, not independent "latest" versions.
3. Avoid adopting a major rewrite or a same-day release for a small POC.
4. Keep the dependency set minimal; every package must serve a POC requirement.
5. Pin exact versions and verify licenses before installation.

All recommendations are provisional. Installation and lockfile creation are not part of this task.

### 3.2 Recommended combination

| Package | Recommended | Released | Why this version | Official source |
| --- | --- | --- | --- | --- |
| Node.js | 24.22.2 LTS | 2026-10-27 | Current installed major is 24; Node 26 LTS was promoted only on 2026-10-28 | [nodejs.org releases](https://nodejs.org/en/about/previous-releases) |
| npm | 11.19.0 | Installed | Matches the local environment; no separate requirement | Local environment |
| react | 19.3.1 | 2026-10-14 | Latest patch in the stable 19.3 line | [npm](https://www.npmjs.com/package/react/v/19.3.1), [GitHub release](https://github.com/facebook/react/releases/tag/v19.3.1) |
| react-dom | 19.3.1 | 2026-10-14 | Must match `react` exactly | [npm](https://www.npmjs.com/package/react-dom/v/19.3.1) |
| @types/react | 19.3.0 | Current | Type definitions for React 19.3 | [npm](https://www.npmjs.com/package/@types/react/v/19.3.0) |
| @types/react-dom | 19.3.0 | Current | Type definitions for React DOM 19.3 | [npm](https://www.npmjs.com/package/@types/react-dom/v/19.3.0) |
| typescript | 6.0.3 | 2026-04-16 | Stable, mature tooling; avoids the TypeScript 7 native-compiler transition | [npm](https://www.npmjs.com/package/typescript/v/6.0.3), [TypeScript 6.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) |
| vite | 8.3.5 | 2026-10-21 | Stable Vite 8 patch; Node requirement satisfied | [npm](https://www.npmjs.com/package/vite/v/8.3.5), [GitHub release](https://github.com/vitejs/vite/releases/tag/v8.3.5) |
| @vitejs/plugin-react | 6.1.2 | 2026-10-05 | Requires Vite `^8.0.0`; matches Vite 8.3.5 | [npm](https://www.npmjs.com/package/@vitejs/plugin-react/v/6.1.2) |
| @types/node | 24.19.2 | Current 24.x | Matches the Node 24 runtime; do not use `@types/node@26` with Node 24 | [npm](https://www.npmjs.com/package/@types/node/v/24.19.2) |
| @babylonjs/core | 9.32.1 | 2026-10-27 | A 9.x patch with several days of field time; 9.33.1 is less than a day old and adds nothing POC-01 needs | [npm](https://www.npmjs.com/package/@babylonjs/core/v/9.32.1), [GitHub release](https://github.com/BabylonJS/Babylon.js/releases/tag/9.32.1) |

Not installed and not recommended for the POC:

| Package | Version | Why not |
| --- | --- | --- |
| three | 0.187.0 (MIT) | Documented alternative only; do not build a second renderer without an approved evaluation need |
| zustand | 5.0.16 (MIT) | Evaluated for Q-04; unnecessary for the POC state shape |
| @babylonjs/gui, loaders, materials | N/A | Out of scope; no GUI, asset import, or advanced materials in POC-01 |

### 3.3 Package notes and compatibility

#### React 19.3.1

- React DOM must be the same version as React. Mismatched patch versions are not supported.
- `useSyncExternalStore` is built into React; no `use-sync-external-store` shim is needed.
- React 19's concurrent rendering makes the cached-snapshot rule important. `getSnapshot` must return the same object until the store changes, or React will loop.
- POC uses client-only rendering; no server rendering, so `getServerSnapshot` is not required.

#### TypeScript 6.0.3 instead of 7.0.2

- TypeScript 7.0.2 (2026-08-20) is the stable release of the native compiler. TypeScript 7.1 is in beta.
- The Vite project's own scaffolding history shows churn: `create-vite@9.3.1` reverted to TypeScript 6 "for now" on 2026-10-20, then `create-vite@9.3.2` used TypeScript 7 "where possible" on 2026-10-27.
- POC-01 does not benefit from compiler speed; it benefits from predictable type checking and editor behavior while validating React and Babylon integration.
- TypeScript is build-time only. It has no runtime presence and can be upgraded independently after the POC.
- If the team standardizes on TypeScript 7, switching is low risk because Vite transpiles without `tsc`. Record the decision and rerun the model tests.

#### Vite 8.3.5 and plugin-react 6.1.2

- Vite 8 requires Node `^20.19.0 || >=22.12.0`. The installed Node 24.21.0 satisfies this; upgrading to 24.22.2 is a patch update.
- `@vitejs/plugin-react@6.1.2` declares a peer dependency on `vite ^8.0.0`.
- Its `oxc-transform-react`, `@rolldown/plugin-babel`, and `babel-plugin-react-compiler` peers are optional and are not required for the POC.
- Vite 8 is Rolldown-based. The POC uses only the dev server and a production build; it does not depend on deep plugin internals.
- Vite does not type-check. A separate `tsc --noEmit` step is required.

#### Babylon.js 9.32.1

- Babylon ships its own TypeScript declarations; no `@types` package is needed.
- Use `@babylonjs/core` ES modules with side-effect imports for tree-shaking. Do not use the UMD `babylonjs` bundle for a Vite application.
- Babylon has no peer dependencies that constrain React or Vite.
- POC-01 uses only core, not GUI, loaders, materials, or inspector packages.
- Bundle size and startup cost must be measured in the spike; no number is claimed here.

#### Node.js 24.22.2 LTS

- Node 26.13.0 became LTS on 2026-10-28, three days before this document. It is not selected for a POC that does not need it.
- Node 24 is in the LTS line, satisfies Vite, and matches the installed environment.
- Node 24 supports running erasable TypeScript directly for tests; if a test needs non-erasable syntax, compile it first. This is not a blocker.

### 3.4 Licensing

| Package | License | Verification status | Notes |
| --- | --- | --- | --- |
| Node.js | Node.js license (MIT-style) | Not audited in this task | Runtime, not distributed with the app |
| React, React DOM | MIT | Registry metadata confirmed | Keep copyright notice |
| TypeScript | Apache-2.0 | Registry metadata confirmed | Build-time only |
| Vite | MIT | Registry metadata confirmed | Build-time only |
| @vitejs/plugin-react | MIT | Registry metadata confirmed | Build-time only |
| @babylonjs/core | Apache-2.0 | Registry metadata confirmed | Apache-2.0 requires notice preservation and patent grant compliance |
| @types/react, @types/react-dom, @types/node | MIT | Registry metadata confirmed | Type definitions |
| Three.js (alternative only) | MIT | Registry metadata confirmed | Not installed |

Before installation:

1. Confirm the package names, exact versions, and declared licenses against the registry.
2. Approve the provisional version combination.

Immediately after installation, before implementation:

3. Generate a full dependency and license inventory from the lockfile.
4. Confirm there is no copyleft dependency that affects distribution.
5. Confirm Babylon optional packages are not pulled in unintentionally.
6. Preserve required `LICENSE` and `NOTICE` content for Apache-2.0 dependencies.
7. Run `npm audit` and record the result in the POC environment report.

A licensing defect that cannot be mitigated is a critical evaluation override.

### 3.5 Known limitations relevant to POC-01

| Limitation | Impact | Handling |
| --- | --- | --- |
| Babylon scale gizmo cannot use world orientation | World-space scale is not representable as TRS on a rotated entity | **Resolved by policy**: POC-01 uses local-space scale handles, with world-space translate and rotate. Babylon.js is not the policy owner |
| Babylon camera defaults rotate on plain left-drag | Conflicts with left-click selection | Remap `camera.movement.input`; spike validates removal of the plain-LMB rotate entry |
| `rotation` and `rotationQuaternion` are mutually exclusive | Silent wrong orientation if both are used | Always use `rotationQuaternion`; never assign `rotation` |
| Right-handed mode must be set before content | Changing it later leaves existing transforms misinterpreted | Set immediately after scene creation; spike verifies |
| Babylon bundle can grow quickly | Slow startup if broad imports are used | Import only required modules and measure bundle size |
| TypeScript 6 is not the newest release | No native compiler speed | Accept for POC; upgrade path documented |
| Vite 8 is Rolldown-based | Some legacy plugins may not be compatible | No legacy plugins in POC-01 |
| React 19 concurrent behavior | External store must return cached snapshots | Store contract enforces immutable cached snapshot |

### 3.6 Q-02 right-handed behavior: documented vs assumed

#### Documented behavior

| Topic | Official documentation | What it states |
| --- | --- | --- |
| Right-handed mode | [Coordinate Systems and Handedness](https://doc.babylonjs.com/features/featuresDeepDive/mesh/transforms/coordinateSystems) | Set `scene.useRightHandedSystem = true` before creating or loading content. In that mode, +X is right, +Y is up, and forward is -Z. Changing handedness is a reflection, not a rotation. |
| Picking | [Mesh Picking](https://doc.babylonjs.com/features/featuresDeepDive/mesh/interactions/picking_collisions) | `scene.pick(scene.pointerX, scene.pointerY)` casts a ray from the camera through the pointer and returns the first hit. Picking transforms the ray into mesh-local space. No handedness-specific caveat is documented. |
| Gizmos | [Gizmos](https://doc.babylonjs.com/features/featuresDeepDive/mesh/gizmo) | `GizmoManager`, `PositionGizmo`, `RotationGizmo`, and `ScaleGizmo` are supported. World orientation is enabled with `updateGizmoRotationToMatchAttachedMesh = false`. The documentation explicitly says this is **not supported on the scale gizmo**. Drag start, drag, and drag end observables are available. POC-01 therefore uses world-oriented translate and rotate gizmos and a local-oriented scale gizmo. |
| Camera | [Camera Introduction](https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction) | `ArcRotateCamera` orbits a target with `alpha`, `beta`, and `radius`; `attachControl` enables navigation. Panning defaults to Ctrl + left mouse and can be configured. |
| Camera input mapping | [Camera Movement and Input System](https://doc.babylonjs.com/features/featuresDeepDive/cameras/cameraMovementSystem) | `ArcRotateCamera` uses a declarative `inputMap`. Defaults include plain left-drag rotate, Ctrl + left-drag pan, right-drag pan, and wheel zoom. Entries can be changed with `setInteraction`, `addEntry`, or direct array edits. |
| Quaternions | [Rotation Quaternions](https://doc.babylonjs.com/features/featuresDeepDive/mesh/transforms/center_origin/rotation_quaternions) | A rotation quaternion is `(x, y, z, w)` and must be a unit vector. `rotationQuaternion` and `rotation` cannot be used together; use the quaternion consistently. |
| Rotation order | [Rotation Conventions](https://doc.babylonjs.com/features/featuresDeepDive/mesh/transforms/center_origin/rotation_conventions) | Babylon uses yaw-pitch-roll about Y, X, Z in local axes, in that order. `Quaternion.RotationYawPitchRoll(yaw, pitch, roll)` produces the same orientation. |
| World/local conversion | [Mesh Transformations](https://doc.babylonjs.com/features/featuresDeepDive/mesh/transforms) | `position`, `rotationQuaternion`, and `scaling` are local to the node. A mesh with no parent has local space aligned with world space. |
| Right-handed camera fix | [Breaking Changes](https://doc.babylonjs.com/breaking-changes) | A right-handed target-camera rotation defect was fixed in 8.10.1. Babylon 9.32.1 is well past that fix. |
| Cross-handed quaternion helper | [ConvertToRightHandedRotation](https://doc.babylonjs.com/typedoc/functions/BABYLON.ConvertToRightHandedRotation) | Babylon provides a helper that converts a left-handed quaternion to right-handed via a change of basis. This is for converting existing data, not for authoring directly in a right-handed scene. |

Because POC-01 entities are unparented, Babylon's node-local `position` and `rotationQuaternion` coincide with the world-space position and orientation stored by the editor. The adapter still treats the stored position and rotation as world-space values; the distinction only becomes observable if parenting is introduced in a later phase.

#### Assumptions that the spike must verify

| ID | Assumption | Why it is not yet proven | Spike check |
| --- | --- | --- | --- |
| A-01 | Setting `useRightHandedSystem` before content makes all POC transforms behave as +X right, +Y up, -Z forward | Documentation describes the convention but not this exact POC scene | SP-02 |
| A-02 | `scene.pick` returns the correct mesh and point in right-handed mode | Verified by SP-04: all front/side/top and 180-orbit picks returned `testCube` with plausible points; empty-space picks returned no hit | SP-04 |
| A-03 | Position and rotation gizmos can be set to world orientation without artifacts in right-handed mode | The flag is documented; handedness interaction is not explicitly discussed. The repaired harness applies it after lazy creation. The 2026-11-03 full suite passed T-01 (world X/Y/Z translation) and T-02 (world X rotation delta axis `(1, 0, 0)` after a ~41° Y rotation); visual review is still pending. | SP-05 |
| A-04 | The local-oriented scale gizmo behaves correctly on rotated entities under the approved policy, including non-uniform scale | The policy is approved. The 2026-11-03 full suite passed T-03 and T-04: scale changed `(1, 1, 1) → (1.203411, 1, 1)` along the rotated local X axis after a ~41° Y rotation, with a supplementary local Y scale near 90°; visual review is still pending and local Z scaling was not exercised. | SP-05 |
| A-05 | ArcRotateCamera orbit, pan, and zoom behave correctly in right-handed mode | Camera fix is documented for 8.10.1+, but axes and panning feel must be verified | SP-06 |
| A-06 | The default plain-left-drag camera rotate can be removed cleanly so left click is free for selection | Input map is documented; removing a default entry is not shown as an example | SP-06 |
| A-07 | A quaternion authored directly in the right-handed scene rotates +X to -Z for a positive 90° Y rotation | Quaternion math is documented, but handedness interpretation needs an empirical check | SP-07 |
| A-08 | `quaternion.toEulerAngles()` returns x=pitch, y=yaw, z=roll consistent with YXZ display | Documented convention, but round-trip behavior at gimbal lock needs measurement | SP-07 |

#### World-space scale constraint and approved policy

A non-uniform scale applied along world axes to a rotated entity produces shear. A transform composed only of position, rotation quaternion, and per-axis scale cannot represent shear. Babylon's decision not to support world orientation on the scale gizmo is consistent with that constraint.

The product decision is now approved:

- Translate is world-space.
- Rotate is world-space.
- Scale is local-space.
- The hybrid policy is owned by the Editor/Transform Controller layer, not by Babylon.js.
- The world model keeps TRS as its only transform representation.

This approval resolves the policy question. It does not prove Babylon's technical behavior, and it does not make world-space scale a supported future feature. A future world-space scale or shear capability requires a separate evaluation covering affine representation, physics, asset sharing, serialization, undo/redo, and renderer/simulation compatibility. The POC specification records that deferral in §9.8.

### 3.7 What would change the recommendation

- A critical license incompatibility in a transitive dependency.
- A right-handed picking or gizmo defect that requires a conversion layer or a different renderer.
- A startup or interaction performance problem at 100 entities that cannot be attributed to POC code.
- Tooling incompatibility with TypeScript 6 that blocks type checking (fallback: TypeScript 7.0.2).
- A regression in Babylon 9.32.1 that is fixed only in 9.33.1 (fallback: upgrade after the spike).
- Evidence that local-space scale cannot be used acceptably on rotated entities, which would force reconsidering the interaction design rather than silently enabling world-space scale.

### 3.8 Approved TypeScript decision for POC-01

The user has approved **TypeScript 6.0.3** for POC-01.

| Item | Value |
| --- | --- |
| Selected version | TypeScript 6.0.3 (npm; released 2026-04-16 per the GitHub release tag v6.0.3) |
| Status | POC-specific decision, not a permanent product-wide technology commitment |
| Scope | POC-01 only; the final product stack is still subject to POC evidence and an ADR |
| Future alternative | TypeScript 7.0.2 remains a candidate for a later, separately validated migration |
| React | 19.3.1 (unchanged) |
| Vite | 8.3.5 (unchanged) |
| Babylon.js | 9.32.1 (unchanged) |

Rationale:
- TypeScript 6 is the stable bridge release with a mature tooling ecosystem and a stable programmatic API.
- Vite performs transpilation with Oxc and relies on a separate `tsc --noEmit` step for type checking; TS 6 is the predictable choice for that step.
- TypeScript 7 is a native port with no stable programmatic API and breaking default changes; adopting it during the POC would add churn unrelated to the questions the POC is trying to answer.
- Code that compiles cleanly on TS 6 with `stableTypeOrdering` and no `ignoreDeprecations` is expected to compile identically on TS 7, so the upgrade path is preserved.

This approval resolves B-03. It does not imply TypeScript has been installed, and it does not change the provisional status of the other technology candidates.

## 4. State Management Recommendation

### 4.1 Options evaluated

1. **Custom store with `useSyncExternalStore`.** A small external store implemented in TypeScript, with immutable snapshots, a listener set, and command methods. React subscribes through the built-in hook.
2. **Dedicated state library.** A library such as Zustand 5.0.16 (MIT) that provides an external store, selectors, middleware, and developer tools.

### 4.2 Comparison

| Dimension | Custom store | Zustand |
| --- | --- | --- |
| Dependency footprint | Zero additional packages | One runtime package |
| Implementation complexity | About 80–150 lines for store, commands, and subscription | Small API, but adds library concepts and versioning |
| React integration | Built-in `useSyncExternalStore`; no provider required | `useStore` hook; no provider required |
| Update subscriptions | Manual listener set; simple at POC scale | Built-in selector subscriptions |
| Selection synchronization | Straightforward: selection is one field in editor state | Straightforward, but selector discipline is required |
| Undo/redo extensibility | Command log or snapshot stack; natural fit | Requires custom middleware or a separate package |
| Testability | Pure TypeScript store can be tested in Node with no React | Testable, but tests depend on the library API |
| World model independence | Enforced by directory boundaries; store lives outside `world/` | Same possible, but easier to accidentally couple UI and world |
| Developer tools | None by default | Devtools middleware available |
| Long-term maintainability | Owned code; migration to a library is possible later | Mature library, but adds upgrade and API-churn surface |
| Fit for POC-01 | Sufficient: world, selection, gizmo mode, grid flag, camera | More features than the POC needs |

### 4.3 Recommendation

Use a **custom store with `useSyncExternalStore`** for POC-01.

Reasons:

- The POC has a small, well-defined state shape. A library would add a dependency without solving a problem the POC has.
- The world model must remain independent of React. A custom store makes the boundary explicit: `world/` is pure data, `editor/` owns the store, `ui/` subscribes.
- Selection synchronization is a single field, not a complex derived-state problem.
- Undo/redo is out of scope, but a command log can be added later without changing the store's public contract.
- The store can be unit tested in Node without React or Babylon.

Proposed store contract:

```ts
interface AppSnapshot {
  world: World;
  editor: EditorState;
}

interface AppStore {
  getSnapshot(): AppSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: Command): void;
}
```

Rules:

- `getSnapshot()` returns a cached immutable snapshot. It must not construct a new object on every call.
- Every mutation goes through a command. UI components and the renderer adapter never assign to world fields.
- The adapter subscribes to the store separately and reconciles Babylon objects from world data.
- React components use `useSyncExternalStore(store.subscribe, store.getSnapshot)`.
- Selection changes mark the snapshot dirty but do not mutate the world.
- The store lives in `editor/`, not `world/`.

### 4.4 Undo/redo path

Undo/redo is out of scope for POC-01. If it is added later:

- Commands already carry the intent, so a command log is a natural extension.
- Snapshot-based undo is acceptable at POC scale but memory-heavy for large worlds.
- The store's public API does not need to change; undo becomes another command or a history service around the store.

### 4.5 When to revisit

Revisit the decision if any of these occur:

- State shape grows beyond world, selection, gizmo mode, grid visibility, and camera.
- Multiple panels need derived selectors with performance-sensitive updates.
- Time-travel debugging becomes a requirement.
- The custom store accumulates more than roughly 200 lines of infrastructure.

## 5. Import Validation Policy

### 5.1 Provisional POC limit

| Item | Value |
| --- | --- |
| Limit | **1,048,576 bytes (1 MiB)** |
| Scope | POC-01 JSON world import only |
| Configurable | Yes, a single constant in the importer module |
| Product status | Provisional POC-01 guardrail; **not** the final SimuForge product limit |
| Basis | Policy choice for the POC, not a measured performance result |
| Enforcement point | Before reading the file, using `File.size` |
| Boundary tests | FS-02 (below), FS-03 (exactly at), and FS-04 (above) |

A 1 MiB document is far larger than the POC's 100-entity test scene. It leaves room for metadata and formatting while keeping parse and validation work small enough that a mistake cannot easily freeze the tab.

### 5.2 Why this limit

**Security.** Imported files are untrusted. A very large or deeply nested document can consume memory or block the main thread. A pre-parse size check is a cheap first defense. A depth limit prevents recursive validators from overflowing the call stack.

**Browser memory.** The file text, the parsed JSON object, and the normalized world can coexist briefly during import. Memory use is a multiple of the file size, not equal to it. The exact multiplier depends on the browser and the document shape; the POC measures it rather than assuming a number.

**JSON parsing cost.** `JSON.parse` is implemented natively and is fast for well-formed input, but it is synchronous and runs on the main thread. Parsing a 1 MiB file is not expected to be a problem on the primary machine, but this must be measured, especially on the integrated-GPU fallback environment where CPU performance may be lower.

**Validation cost.** Validation walks every entity and every metadata node. Cost grows with entity count and nesting depth. The schema is shallow except for reserved metadata, which is why metadata needs an explicit depth and node cap.

**User feedback.** Oversized files must be rejected with a message that states the actual size, the limit, and what to do next. The app must not truncate, partially import, or silently ignore the file.

### 5.3 Enforcement order

1. Check `file.size === 0` and reject with `EMPTY_FILE`.
2. Check `file.size > MAX_IMPORT_BYTES` and reject with `FILE_TOO_LARGE` before reading.
3. Read the file as text.
4. Parse JSON; reject with `INVALID_JSON` on syntax failure.
5. Validate the document structure and schema version.
6. Validate each entity and transform.
7. Validate metadata depth and node count.
8. Build a new world object.
9. Replace the current world only after all checks pass.

A failed import leaves the current world, selection, camera, and renderer unchanged.

### 5.4 Nested data limits

| Limit | Provisional value | Reason |
| --- | --- | --- |
| Metadata depth | 8 | Prevents recursive validation blowups and unreasonable documents |
| Metadata nodes | 10,000 | Bounds validator work even when each node is shallow |
| Entity count | No separate POC cap beyond the byte limit | The byte limit already bounds entity count for the POC schema |

These are safety limits, not product limits. They must be documented in the importer and covered by tests.

### 5.5 Boundary test matrix

These tests refine POC acceptance criteria G-05 and the related import criteria. They are not additional product scope.

| ID | Input | Expected result | Current world | App state |
| --- | --- | --- | --- | --- |
| FS-01 | Empty file, 0 bytes | Rejected with `EMPTY_FILE`; message explains the file is empty | Unchanged | Usable |
| FS-02 | Small valid file well below the limit, about 1 KB, three entities | Accepted; world replaced; IDs and transforms preserved | Replaced | Usable |
| FS-03 | Valid file exactly 1,048,576 bytes | Accepted; size check uses `>` not `>=` | Replaced | Usable |
| FS-04 | Valid file 1,048,577 bytes | Rejected with `FILE_TOO_LARGE` before parse; message includes actual size and configured limit | Unchanged | Usable |
| FS-05 | Malformed JSON, truncated mid-object | Rejected with `INVALID_JSON`; no partial world | Unchanged | Usable |
| FS-06 | Excessively nested JSON, for example 100,000 nested arrays in metadata | Rejected with `METADATA_TOO_DEEP` or `INVALID_METADATA`; no stack overflow | Unchanged | Usable |
| FS-07 | Valid structure with `schemaVersion: 999` | Rejected with `UNSUPPORTED_SCHEMA_VERSION`; message names the unsupported version | Unchanged | Usable |

Additional checks during execution:

- Measure parse time and validation time for FS-03.
- Record heap before and after the import attempt.
- Confirm the UI remains responsive during FS-04 and FS-05.
- Confirm the error is visible without opening the console.

### 5.6 Provisional versus production limit

| Aspect | POC-01 | Future production |
| --- | --- | --- |
| Limit | 1 MiB | Not set by this document |
| Basis | Policy choice for a bounded test surface | Must be derived from measured parse, validation, memory, and target-device data |
| Enforcement | `File.size` before read | May require streaming, worker parsing, or progressive validation |
| Nesting | Depth 8, 10,000 metadata nodes | To be defined with the real component and metadata schema |
| UX | Error message with size and limit | Must include recovery guidance and possibly a pre-import summary |

Do not cite 1 MiB as a measured browser limit or as a product requirement. It is a POC guardrail.

## 6. Browser and Hardware Matrix

### 6.1 Tested environment (captured, not yet used for POC tests)

| Item | Value |
| --- | --- |
| Machine | Acer Nitro 5 AN515-58 (reported as Nitro AN515-58) |
| Operating system | Windows 11 Home Single Language, version 10.0.26100, 64-bit |
| CPU | Intel Core i5-12500H, 12 cores, 16 logical processors |
| RAM | 16,869,548,032 bytes (approximately 15.7 GiB usable) |
| Discrete GPU | NVIDIA GeForce RTX 3050 Laptop GPU, 4 GB, driver 32.0.16.1088 |
| Integrated GPU | Intel Iris Xe Graphics, driver 31.0.101.5081 |
| Display | 1920 × 1080 at 144 Hz |
| Node.js | 24.21.0 |
| npm | 11.19.0 |
| Chrome | 156.0.8078.76 |
| Edge | 156.0.4314.50 |
| Firefox | Not verifiably installed; winget/registry records appear stale. Not required for POC-01 (Chrome-only scope). |

This is the **primary available test machine**. It is not the minimum supported hardware. It is above the likely future minimum, so passing on it says little about low-end devices.

### 6.2 Proposed support targets (not tested)

| Dimension | Target | Status |
| --- | --- | --- |
| Supported and tested browser | Google Chrome only | Approved for POC-01 (Chrome-only scope) |
| Chrome version tested | 156.0.8078.76 (captured in §6.1) | Environment information, not a permanent minimum version requirement |
| Cross-browser compatibility | Not validated by POC-01 | Out of scope |
| Minimum viewport | 1024 × 640 application viewport | Proposed, matches POC spec |
| Display scaling | 100% and 125% | Proposed |
| Graphics API | WebGL 2.0 | Required for the POC |
| WebGL 1.0 | Babylon can fall back, but not a POC target | Not supported for POC results |
| WebGPU | Not used | Out of scope |
| Hardware acceleration | Enabled | Required |
| Proposed memory floor | 8 GB system RAM | Proposed, not validated |
| Proposed GPU class | Integrated graphics from the last approximately five years | Proposed, not validated |

The support targets are product proposals for later validation. They must not be presented as tested facts.

### 6.3 Lower-performance fallback

Use the same laptop with the **Intel Iris Xe integrated GPU** as the lower-performance fallback:

- Configure Windows Graphics settings or the browser's GPU selection to use the integrated GPU.
- Keep the same browser, viewport, scene files, and test procedure.
- Record that this is still not a minimum-hardware guarantee.

Do not use CPU-only software rendering (SwiftShader) as a performance baseline. It can be used to confirm that the app fails gracefully, but its frame rates are not representative.

### 6.4 Graphics requirements

- WebGL 2.0 is required. The POC should detect a missing context and show a clear message instead of a blank canvas.
- WebGL 1.0 fallback is not a target even though Babylon supports it. Results from WebGL 1.0 must be labeled separately.
- WebGPU is not used.
- Hardware acceleration must be enabled; browser settings that disable it invalidate performance results.
- The POC does not use post-processing, shadows, or advanced materials, so GPU feature requirements are modest.

### 6.5 Test settings

- Test at 1440 × 900 and at the 1024 × 640 minimum.
- Record browser zoom level; results at non-100% zoom are not comparable.
- Record whether the browser used the discrete GPU or the integrated GPU.
- Record display refresh rate, because frame pacing at 144 Hz differs from 60 Hz.
- Close other GPU-heavy applications during measurement.

### 6.6 Gaps and actions

| Gap | Action | Owner |
| --- | --- | --- |
| Only one physical machine is available | Use the iGPU fallback as the secondary environment; do not claim minimum hardware coverage | User/assistant |
| Cross-browser testing | Not performed in POC-01 | Out of scope (Chrome-only) |
| GPU selection is untested on this machine | Verify before performance runs; record the method | User/assistant |

## 7. Evidence and Report Structure

### 7.1 Planned directory

`projects/simuforge/reports/poc-01/` is the official POC-01 evidence location. All results, fixtures, screenshots, performance data, issues, evaluation, and recommendation go under it; no POC-01 evidence is stored under `projects/simuforge/docs/`.

```text
projects/simuforge/reports/poc-01/
├── README.md                  # Index, status, and how to read the report
├── environment.md             # OS, hardware, browser, versions, settings
├── results/
│   ├── spike.md               # SP-01 to SP-08 observations and evidence
│   └── acceptance.md          # A-01 to H-06 results
├── fixtures/                  # Import test files, including boundary cases
├── screenshots/               # Named by test ID, date, and browser
├── performance/
│   ├── measurements.csv       # Raw metrics per scene and browser
│   └── notes.md               # Scene generator, seed, method, anomalies
├── issues.md                  # Defects, severity, workaround, status
├── evaluation.md              # Weighted score and evidence references
└── recommendation.md          # Final recommendation and conditions
```

The directory already exists and has been used for SP-01 through SP-05 evidence. It remains the official POC-01 evidence location and is not created by this documentation task.

### 7.2 Artifact requirements

| Artifact | Required content |
| --- | --- |
| `environment.md` | Captured system information, browser versions, GPU selection, display settings, Node/npm, dependency lockfile hash |
| `results/spike.md` | One section per SP step: action, observation, pass/fail, evidence link, issue reference |
| `results/acceptance.md` | One row per acceptance ID with status, observation, evidence link, tester, timestamp |
| `fixtures/` | The exact files used for FS-01 to FS-07, with a short description of how each was produced |
| `screenshots/` | Full-window screenshots with visible test state; crop only if the full context is preserved elsewhere |
| `performance/measurements.csv` | Scene, browser, GPU, average FPS, minimum FPS, p95 frame time, selection latency, commit latency, heap, notes |
| `performance/notes.md` | Scene generator seed, warm-up, run duration, foreground/background state, anomalies |
| `issues.md` | ID, severity, description, reproduction, expected, actual, workaround, status |
| `evaluation.md` | Six criteria with scores and evidence references, weighted total |
| `recommendation.md` | One recommendation option, conditions, and open questions |

### 7.3 Ownership and review

| Area | Assistant | User |
| --- | --- | --- |
| Environment capture | Draft from measured system data | Confirm accuracy |
| Spike execution | Run, record observations, attach evidence | Review results and approve go/no-go |
| Acceptance tests | Execute where feasible, record results | Review evidence and sign off |
| Performance measurements | Capture and summarize | Confirm the environment and method are acceptable |
| Issue triage | Record and classify | Decide which issues block the POC |
| Evaluation score | Calculate and draft rationale | Review and approve |
| Final recommendation | Draft | Approve or change |

The user and assistant review the evidence together. The assistant does not mark tests as PASS on the user's behalf without evidence.

### 7.4 Status rules

| Status | Meaning |
| --- | --- |
| NOT RUN | No execution attempted |
| PASS | Expected result observed; evidence attached |
| FAIL | Expected result not observed; evidence attached; issue recorded |
| BLOCKED | Cannot execute because a dependency, environment, or decision is missing |

Rules:

- No PASS without an evidence artifact.
- No result is deleted or reworded after the fact. Corrections are appended with a date.
- A failed test remains visible in the report.
- Screenshots and logs are stored, not pasted only into chat.
- The evaluation score is filled only after the relevant tests have results.

### 7.5 Naming conventions

- Screenshot: `A-01_20261101_chrome_1440x900.png`
- Fixture: `fs-03_exact_limit.world.json`
- Log: `sp-05_gizmo_20261101_chrome.log`
- Issue: `POC01-001`

### 7.6 Approved evidence ownership model

This model is approved by the user for POC-01. It records the responsibilities for executing and reviewing the sequential SP-01 to SP-08 testing workflow.

| Role | Responsibility |
| --- | --- |
| User / Project Owner | Approves scope, technical decisions, execution, and final Go/No-Go |
| OpenCode / Spike Executor | Implements spike code, runs local tests, captures screenshots and logs, and records results |
| ChatGPT / Technical Reviewer | Prepares instructions, analyzes reports, checks consistency, and recommends next steps |

Notes:
- The reviewer does not operate the user's local machine and does not execute local tests directly.
- The executor records results; the owner reviews and signs off.
- Testing is sequential, SP-01 through SP-08. Each stage requires review before proceeding.
- No fixed calendar schedule is required.
- Evidence is stored in `projects/simuforge/reports/poc-01/`.
- The evidence directory already exists and has been used for SP-01 through SP-05.
- The model remains flexible and sequential; no calendar dates are assigned. Evidence gates between spikes are defined in §8.6.

### 7.7 Evidence gate sequence for SP-01 to SP-08

Evidence must exist before proceeding to the next spike, and the final Go/No-Go waits until SP-08:

1. Record `environment.md` before SP-01.
2. SP-01 evidence (console log + screenshot) before SP-02.
3. SP-02 evidence (screenshot) before SP-03.
4. SP-03 evidence (screenshot + scene log) before SP-04.
5. SP-04 evidence (picking log + screenshots) before SP-05. If picking fails, stop and record the failure.
6. SP-05 evidence (drag logs, screenshots, Inspector values, quaternion values) before SP-06.
7. SP-06 evidence (input log + screenshots) before SP-07.
8. SP-07 evidence (numeric log) before SP-08.
9. SP-08 writes `results/spike.md` with the Go/No-Go decision, issue links, and environment details.

No POC-01 acceptance criterion is marked PASS until the relevant evidence exists. The evidence directory already exists and contains SP-01 through SP-05 evidence.

## 8. Technical Spike Plan

### 8.1 Purpose and boundaries

The spike is a small, isolated validation of the risky technical assumptions in §3.6. It is not the World Editor and must not grow into it.

In scope:

- Engine initialization.
- Right-handed mode.
- One test cube.
- Picking.
- Translate, rotate, and scale gizmos.
- Transform policy checks: world-space translate, world-space rotate, local-space scale, local-space non-uniform scale on a rotated cube, Inspector consistency, and mode-switch stability.
- Camera orbit, pan, and zoom.
- Quaternion and transform conversion checks.

Out of scope:

- UI panels, Hierarchy, Inspector, toolbar.
- World model, serialization, import/export.
- Multiple entities, deletion, rename.
- Physics, scripting, Python, or any future product system.
- Visual polish.

### 8.2 Spike steps

| ID | Step | Action | Expected observation | Evidence |
| --- | --- | --- | --- | --- |
| SP-01 | Initialize the engine | Create a Vite + React + TypeScript page with a canvas; create a Babylon `Engine`; render a scene; log `engine.webGLVersion` | Engine starts, canvas clears, render loop runs, `webGLVersion` is 2; resize does not break the canvas | Console log, screenshot |
| SP-02 | Enable right-handed mode | Set `scene.useRightHandedSystem = true` immediately after scene creation and before any content; place an asymmetric marker on +X and another on -Z | +X appears right, +Y appears up, and the forward direction is -Z from the default camera view | Screenshot from a known camera pose |
| SP-03 | Create one test cube | Add a 1×1×1 cube at (0, 0.5, 0) with an unlit material; no world light entity | Cube rests on the grid plane, is visible, and has no light dependency | Screenshot, scene log |
| SP-04 | Test picking | Click the cube from front, side, and top camera positions; click empty space; log `scene.pick` results | Cube is hit with a plausible point; empty space returns no hit; results remain correct after a 180° orbit | Picking log, screenshots |
| SP-05 | Test transform gizmos | Attach translate, rotate, and scale gizmos. Drag translate and rotate handles with world orientation (`updateGizmoRotationToMatchAttachedMesh = false`). Rotate the cube 45° and 90° around Y, then drag local scale handles, including a non-uniform scale. Record Inspector values after each drag, then switch Translate → Rotate → Scale → Translate without dragging. | Translate moves along world axes; rotate turns around world axes; scale stretches along the entity's local axes on both unrotated and rotated cubes; Inspector values match the applied transform; mode switches do not change position, quaternion, or scale; quaternion length stays 1. World-space scale is not a pass criterion; if attempted, record the limitation as an observation. | Drag logs, screenshots, Inspector values, quaternion values |
| SP-06 | Test camera navigation | Orbit, pan, and zoom with the proposed input map; remove the default plain-left-drag rotate entry; verify left click does not orbit | Orbit, pan, and zoom work without inverted axes; left click is available for selection; alpha, beta, radius, and target change as expected | Input log, screenshots |
| SP-07 | Verify quaternion and transform conversion | Apply `q = (0, sin 45°, 0, cos 45°)` to +X; convert quaternion to Euler and back; test pitch near ±90° | +X maps to -Z; `toEulerAngles()` reports y = 90°; round-trip error is within tolerance; gimbal-lock display behavior is documented | Numeric log |
| SP-08 | Record observations and decide | Record versions, console errors, screenshots, timings, and issues; compare against the expected behavior | A go/no-go decision for the full POC is recorded; any unexpected behavior becomes an issue | `results/spike.md` |

### 8.3 Go/no-go criteria

Proceed to full POC implementation only if all of the following are true:

- Right-handed axes match the world convention visually.
- Picking selects the correct object and remains correct after camera movement.
- Translate and rotate gizmos produce the expected world-space transforms.
- Local-space scale behaves correctly on unrotated and rotated entities, including non-uniform scale, and the POC specification matches the approved policy.
- Gizmo and Inspector values agree, and switching gizmo modes does not change the stored transform.
- Camera orbit, pan, and zoom work, and left click can be reserved for selection without conflicting with camera input.
- Quaternion values round-trip without drift, and the +X to -Z rotation check passes.
- No unresolved console error or rendering defect blocks the next step.

If a check fails:

- Record the failure and the exact environment.
- Determine whether the cause is configuration, a Babylon limitation, or an incorrect assumption in the specification.
- Do not work around a failure silently. Update the specification or the plan through review.

### 8.4 Spike duration and artifacts

- Target duration: one working session, not a multi-day build.
- Artifacts: `results/spike.md`, screenshots for SP-02 to SP-06, numeric logs for SP-05 and SP-07, and the environment record.
- The spike code is disposable and must not be promoted to the POC without review.

### 8.5 Status

**In progress.** SP-01 executed and recorded as PASS. SP-02 executed with numeric coordinate consistency confirmed; visual verification pending user review (recorded as PARTIAL). SP-03 executed: one unlit 1×1×1 cube at (0, 0.5, 0), no light entity, material `disableLighting = true`; visual verification pending user review (recorded as PARTIAL). SP-04 executed and recorded as PASS (automated): all front/side/top and 180-orbit picks returned `testCube` with plausible points; empty-space picks returned no hit. SP-05 is BLOCKED. The harness gizmo configuration defect (lazy gizmo creation made the world-space assignments dead code) has been repaired with `applyGizmoSpace()`, and input provenance no longer reports automated CDP interaction as manual. A direct-CDP runner executed the full T-01 through T-06 suite on 2026-11-03: 256/256 assertions passed, with 14 fully trusted drags, no retries, no synthetic input, and no console errors; an independent evidence audit passed 750/750 checks. Official evidence is archived under `projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/`, with the summary in `SP-05_FULL_EXECUTION_REPORT.md`. The evidence has not been reviewed, so no SP-05 acceptance criterion has been upgraded to PASS and A-03/A-04 remain unverified. Decisions recorded 2026-11-03: `sp-05_rotate_45.png` removed from the mandatory inventory; the supplemental local Z run is accepted as T-04 step 5 evidence; the 40.8814° setup rotation is accepted as sufficient POC evidence; repeating all three handles at 90° is not required; no second full suite is required. A visual-review package (contact sheet + manifest) is available under `results/sp-05-manual/visual-review/`. SP-06 through SP-08 have not been executed. B-02 remains open.

## 9. Remaining Blockers

| ID | Blocker | Severity | Why it blocks | Resolution | Owner |
| --- | --- | --- | --- | --- | --- |
| B-01 | Scale-space transform policy — **resolved** | Resolved (was High) | Previously blocked the transform contract and acceptance test E-04 | Approved: world-space translate, world-space rotate, local-space scale. The hybrid policy is owned by the Editor/Transform Controller layer, and TRS remains the primary representation. This resolves the product decision, not Babylon's technical behavior. | User |
| B-02 | Right-handed picking, gizmos, and camera behavior are not empirically verified | High | The architecture depends on them; documentation alone is not evidence | Execute SP-01 to SP-08 | Assistant, reviewed by user |
| B-03 | TypeScript version for POC-01 | **Resolved — version approved** | Tooling compatibility could force a change | Approved: TypeScript 6.0.3 for POC-01. This is a POC-specific decision, not a permanent product-wide technology commitment. TypeScript 7.0.2 remains a future alternative subject to separate validation. | User |
| B-04 | Chrome-only browser scope for POC-01 | **Resolved — Chrome-only scope approved** | Cross-browser compatibility is outside POC-01 scope; no Firefox installation or update is required | Google Chrome 156 is the primary and only browser used for POC-01. Firefox is explicitly excluded. No Firefox installation or update is required. Cross-browser compatibility is not validated by this POC. Chrome WebGL 2 support and hardware acceleration must still be verified before relevant rendering tests. The actual Chrome version from the audit (156.0.8078.76) is recorded as environment information, not as a permanent minimum version requirement. | User |
| B-05 | The 1 MiB import limit is a provisional policy guardrail — **resolved** | Resolved (was Low) | The limit is not a measured result and may change after measurement | Approved as a provisional, configurable POC-01 guardrail; the final product limit remains deferred. Record measured parse and validation times during the POC. | User |
| B-06 | Evidence ownership and execution schedule | **Resolved — Responsibility Model Approved** | Acceptance criteria cannot be marked PASS without execution | Ownership model approved in §7.6; sequential SP-01 to SP-08 testing with review before each stage; evidence stored in `projects/simuforge/reports/poc-01/`; evidence directory authorized when SP-01 begins. | User and assistant |

B-01 is resolved as a product decision. It is not technical proof: no Babylon.js behavior has been verified. B-02 is the highest remaining technical blocker and is resolved by executing the spike. B-03 is resolved: TypeScript 6.0.3 approved for POC-01. B-04 is resolved: Chrome-only browser scope approved; Firefox is excluded and no Firefox installation or update is required. B-06 is resolved: responsibility model approved; sequential SP-01 to SP-08 testing with review before each stage. B-05 is resolved.

Audit note for B-04: Chrome 156.0.8078.76 is recorded in §6.1 as the captured environment. It is environment information, not a permanent minimum version requirement. Firefox is explicitly excluded from POC-01; no Firefox installation or update is required. Cross-browser compatibility is outside POC-01 scope. Chrome WebGL 2 support and hardware acceleration must still be verified before relevant rendering tests. No browser settings or system configuration were changed during this audit.

## 10. Implementation Readiness Recommendation

### 10.1 Verdict

**Conditionally ready.** The documentation-level blockers are resolved, the transform policy is approved, and the spike can start. Full POC implementation should wait until the spike passes and the remaining conditions are met.

### 10.2 Conditions

| ID | Condition | Status | Must be met before |
| --- | --- | --- | --- |
| C-01 | Approve local-space scale handles and amend the POC specification | **Met** — decision approved and POC specification amended to the hybrid policy | Implementing the transform system |
| C-02 | Execute the spike and record results | Open | Implementing the full workspace |
| C-03 | Confirm TypeScript 6.0.3 and the version combination | **Met** — TypeScript 6.0.3 approved for POC-01; React 19.3.1, Vite 8.3.5, Babylon 9.32.1 retained | Creating the project scaffold |
| C-04 | Cross-browser testing | Not applicable — Chrome-only scope approved; cross-browser compatibility is outside POC-01 | Not required for POC-01 |
| C-05 | Approve the 1 MiB provisional import limit and boundary tests | **Met** — approved as a provisional, configurable guardrail; below/at/above tests are defined as FS-02 to FS-04 | Implementing import |

### 10.3 What is ready

- Approved hybrid transform policy: world-space translate, world-space rotate, local-space scale.
- Approved TypeScript 6.0.3 for POC-01 (POC-specific; not a permanent product-wide commitment).
- Version and license research with sources.
- Right-handed behavior documented separately from assumptions.
- State management decision and store contract.
- Provisional 1 MiB import policy, enforcement order, and below/at/above boundary tests.
- Browser and hardware matrix with a real primary environment.
- Official evidence location: `projects/simuforge/reports/poc-01/`.
- Approved evidence ownership model and gate sequence (approved; SP-01 to SP-05 executed under it).
- Spike plan with go/no-go criteria.

### 10.4 What is not ready

- No empirical proof of right-handed picking, gizmos, or camera behavior.
- No empirical proof that the approved hybrid transform policy works as specified in Babylon.js.
- Cross-browser compatibility is outside POC-01 scope; Google Chrome is the only supported and tested browser.
- Evidence ownership is approved; execution proceeds sequentially with review before each spike.
- No scaffold, dependency lockfile, or license inventory.
- No test execution or evidence.
- No performance baseline.

### 10.5 Next step

1. Evidence ownership model approved (§7.6); SP-01 to SP-05 executed and recorded under it; evidence directory already exists.
2. Record the captured Chrome version (156.0.8078.76) as environment information; it is not a permanent minimum version requirement. Chrome WebGL 2 support and hardware acceleration must still be verified before relevant rendering tests.
3. Create the scaffold in a separate implementation task, with pinned versions and a license inventory.
4. Execute SP-01 to SP-08 and record the evidence under `projects/simuforge/reports/poc-01/`.
5. Review the spike results together and decide whether to proceed to the full POC.

No implementation starts from this document alone.
