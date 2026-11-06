# 0002. MVP-0 technology stack

- Status: accepted
- Date: 2026-11-06
- Project: simuforge
- Approval: Accepted by the Project Owner on 2026-11-06 under OD-05
- Related: [ADR 0001](0001-proposed-architecture-direction.md), [ADR 0003](0003-mvp-0-persistence-and-project-format.md)
- Supersedes: None

## Context

SimuForge is moving from a closed POC-01 into the MVP-0 Studio and World Foundation increment. [ADR 0001](0001-proposed-architecture-direction.md) records a proposed modular-monolith direction but deliberately does not select a framework, renderer, build tool, or state library. The [MVP-0 Scaffold Specification](../../projects/simuforge/scaffold/MVP_0_SCAFFOLD_SPECIFICATION.md) needs a concrete stack that can implement the Studio shell, viewport, primitives, selection, Inspector, transform editing, and local save/open without changing the validated POC-01 behavior.

POC-01 validated one specific combination of React, TypeScript, Vite, and Babylon.js. Its closure record and implementation readiness note treat that combination as the technical basis for the next increment. Replacing any part of it now would discard measured evidence for picking, camera control, gizmo behavior, transform policy, and browser smoke testing. The stack decision is therefore a reproducibility decision, not a novelty decision.

The [Dependency and License Inventory](../../projects/simuforge/scaffold/MVP_0_DEPENDENCY_AND_LICENSE_INVENTORY.md) records the package-level evidence, licenses, transitive surface, and compatibility constraints. This ADR records the architectural decision and its boundaries.

## Decision drivers

| Driver | Consequence |
| --- | --- |
| POC-01 evidence must remain valid | Keep the exact versions that POC-01 exercised |
| The viewport is the dominant surface | Use a renderer with validated picking, camera, gizmo, and right-handed scene support |
| The world model must outlive the renderer | Isolate Babylon.js behind one adapter; keep `world/` free of React, Babylon, and DOM imports |
| MVP-0 has a small state shape | Prefer a small command-only store over a general state framework |
| Reproducible builds matter more than latest releases | Pin exact direct versions and commit the lockfile |
| Browser-only, local-first delivery | Use platform APIs and a static bundle; no backend, worker, or network service |
| The dependency and license surface stays small | Nine direct packages; no UI kit, icon package, date library, or storage wrapper |
| Future increments must be able to change course | Record rejected alternatives and the conditions for revisiting them |

## Decision

MVP-0 uses the following pinned stack.

| Concern | Choice | Exact version | Role |
| --- | --- | --- | --- |
| Runtime | Node.js | **24.22.2 LTS (Krypton)** | Development, test, and build runtime |
| Package manager | npm | **11.19.1** | Lockfile v3 and reproducible installs |
| UI framework | React | **19.3.1** | Studio shell, panels, dialogs, Inspector |
| UI framework | React DOM | **19.3.1** | Browser renderer for React |
| Language | TypeScript | **6.0.3** | Strict application and domain typing |
| Build tool | Vite | **8.3.5** | Dev server, production bundle, static output |
| React plugin | `@vitejs/plugin-react` | **6.1.2** | React transform and Fast Refresh |
| 3D engine | `@babylonjs/core` | **9.32.1** | WebGL 2 viewport, camera, picking, gizmos |
| React types | `@types/react` | **19.3.0** | Type definitions |
| React DOM types | `@types/react-dom` | **19.3.0** | Type definitions |
| Node types | `@types/node` | **24.19.2** | Tooling and script types |
| Test target | Chrome | **156.0.8078.80** | Browser acceptance target |

The runtime and build packages are direct dependencies. Every other package is transitive and is controlled by the committed lockfile. No caret or tilde range is used for a direct dependency.

State management is a **custom store built on `useSyncExternalStore`**. The store exposes immutable cached snapshots, and all mutation goes through explicit commands. No third-party state library is added.

## Rationale

### Why Babylon.js is retained

Babylon.js is the only renderer POC-01 exercised for this product. The POC validated the right-handed scene, +Y up and -Z forward convention, WebGL 2 rendering, `ArcRotateCamera` input behavior, picking and selection, world-space translate and rotate gizmos, local-space scale, and quaternion-backed transforms. Those behaviors are fixed inputs to MVP-0. Keeping 9.32.1 preserves the evidence and avoids re-testing a renderer swap inside a scaffold increment.

Babylon.js remains isolated behind `RendererPort`. The `world/` module does not import Babylon.js, so a later renderer decision is a replaceable adapter rather than a domain rewrite.

### Why React and TypeScript are used

React 19.3.1 carried the POC panel and Inspector work without desynchronizing the viewport, and `useSyncExternalStore` is a first-class React API. The MVP-0 surface is component-heavy: shell regions, docks, splitters, Hierarchy rows, Inspector fields, dialogs, the Project Hub, and the Console. React keeps those surfaces composable without a proprietary UI framework.

TypeScript 6.0.3 is the POC compiler. The repository standards require `strict`, `noUncheckedIndexedAccess`, explicit error handling, and boundary validation. The world document, project envelope, command payloads, and persistence ports all benefit from compile-time contracts. Plain JavaScript would remove the main mechanism that keeps the durable project format and the command boundary honest.

### Why Vite is used

Vite 8.3.5 is the POC build tool and matches the validated Node and plugin versions. It provides an ESM development server, React integration, production bundling, and a static output that can be served from disk or a local server. MVP-0 has no server-side rendering, routing framework, or custom bundling requirement that would justify a heavier build layer.

### Why the custom store is chosen

The MVP-0 state shape is small and explicit: a world snapshot, a selection, a transform tool, layout state, save state, and a console buffer. A command-only reducer over `useSyncExternalStore` provides the required behavior with no dependency:

- Immutable cached snapshots prevent React render loops.
- Commands are the only mutation path, so the renderer and UI cannot write state directly.
- Reducer logic is testable without a DOM.
- The store boundary is small enough to review and replace if a later increment needs more.

Zustand, Redux, and similar libraries would add API surface, middleware concepts, and a second source of truth for a state model that does not yet need them.

### Why the POC-validated versions are retained

The exact versions are part of the POC-01 evidence. Moving to a newer patch, minor, or major would require re-running the POC scenarios and updating the closure record. MVP-0 is not the place for that migration. The dependency inventory records the newer releases that exist and explicitly defers them until a separate upgrade review.

Node 24.22.2 is Maintenance LTS, supported to 2028-04-30. Node 26.13.0 is Active LTS, but changing the runtime is a separate change after the scaffold baseline is green.

## Alternatives considered

| Alternative | Assessment | Outcome |
| --- | --- | --- |
| Three.js instead of Babylon.js | Widely used, but POC-01 did not validate its picking, camera, or gizmo behavior for this application | Rejected for MVP-0; a future renderer change requires its own POC and ADR |
| Vue or Svelte instead of React | No POC evidence; would rewrite the validated panel and Inspector approach | Rejected |
| Plain JavaScript instead of TypeScript | Removes the compile-time contract for the world and project schema | Rejected |
| Webpack or Parcel instead of Vite | More configuration for no MVP-0 capability gain | Rejected |
| Zustand instead of a custom store | Adds a state library without removing the need for commands and immutable snapshots | Rejected |
| Redux Toolkit instead of a custom store | Adds actions, middleware, and devtools concepts that exceed the MVP-0 state model | Rejected |
| A UI component kit | Would duplicate the approved design tokens and geometry | Rejected |
| Vitest or Playwright | Useful later, but the MVP-0 test plan uses `node:test` for pure logic and a Chrome DevTools Protocol harness for browser behavior | Deferred |
| Tailwind or CSS-in-JS | Conflicts with the token-based design system and adds build complexity | Rejected |
| Dexie or `idb` | One object store does not justify a storage wrapper | Rejected |

## Alternatives rejected or deferred

The following are explicitly outside the MVP-0 stack and require a new ADR and Project Owner approval before adoption:

- React Compiler or a different React major.
- TypeScript 7.x and its native compiler.
- Vite 8.3.6 or later.
- Babylon.js 9.34.0 or later.
- Any state-management library.
- Any alternative renderer.
- Any UI kit, icon package, date library, UUID package, schema library, or CSS framework.
- Any test framework beyond `node:test` and the CDP harness.
- ESLint and Prettier. TypeScript strict mode, the boundary check, the token check, and review cover MVP-0; linting is deferred to Phase 01 with its own dependency review.

## Consequences

### Easier

- The POC-01 evidence remains applicable to MVP-0.
- A single lockfile reproduces the build across machines.
- The renderer can be replaced behind one adapter if a later phase requires it.
- The store and domain logic can be tested without a browser.
- The dependency and license surface stays small and reviewable.

### Harder

- The pinned set ages. Security and compatibility updates need a deliberate upgrade review rather than an automatic bump.
- Node 24 is Maintenance LTS; the team must schedule the Node 26 review.
- A custom store means the team owns snapshot caching, subscription rules, and command dispatch.
- A custom CDP harness means the team owns browser-test plumbing instead of using a ready-made framework.
- No linting in MVP-0 means review discipline carries more weight.

### Must be maintained

- The exact pins, `engines`, and lockfile.
- The import-boundary rule that keeps `world/` free of React, Babylon, and DOM dependencies.
- The renderer adapter contract.
- The command-only mutation rule.
- The dependency and license inventory and the generated third-party notices.
- This ADR whenever a direct package or major version changes.

## Compatibility requirements

| Requirement | Constraint |
| --- | --- |
| Node | 24.22.2 exactly for the baseline; `engines` must reject unsupported versions |
| npm | 11.19.1; lockfile version 3 |
| Browser | Chrome 156.0.8078.80 is the acceptance target |
| WebGL | WebGL 2 required; a clear overlay is shown when unavailable |
| TypeScript config | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `noUnusedLocals` |
| Module boundaries | `src/world/**` imports no React, Babylon.js, or DOM globals |
| Rendering | Right-handed coordinates, +Y up, -Z forward |
| Transform | Quaternion source of truth; world-space translate and rotate; local-space scale |
| Persistence | Browser APIs only; no backend, cloud, worker, or network call |
| Build output | Static bundle; no server runtime |

## Dependency and licensing implications

The stack has nine direct dependencies: three runtime (`react`, `react-dom`, `@babylonjs/core`) and six development (`typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `@types/node`).

The license surface is MIT, ISC, BSD-3-Clause, and Apache-2.0. The only MPL-2.0 packages are build-time native tooling (`lightningcss` and its Windows binary) and are not shipped in the application bundle. No GPL, AGPL, SSPL, or unknown license is present.

Obligations:

- Preserve copyright and license notices for MIT, ISC, and BSD-3-Clause packages.
- Include the Apache-2.0 license and any `NOTICE` file for TypeScript, Babylon.js, and `detect-libc`.
- Record the MPL-2.0 packages, their versions, and upstream source URLs in the notices file.
- Generate `THIRD_PARTY_NOTICES.md` from the lockfile at build time and commit it.

No package is installed by this ADR. Installation is an implementation action and remains unauthorized until the Project Owner authorizes the scaffold.

## Validation requirements

This ADR is documentation, not evidence that the stack works. The following must be demonstrated in implementation:

| Requirement | Validation point |
| --- | --- |
| Exact pins resolve and the lockfile is reproducible | I-01: `npm ci`, lockfile review |
| TypeScript strict configuration compiles | I-01: `npm run typecheck` |
| Vite builds a production bundle | I-01: `npm run build` |
| Node guard rejects an unsupported runtime | I-01: version guard test |
| Boundary check rejects a forbidden import | I-01: negative fixture |
| Notices match the lockfile | I-01: generated notices review |
| React renders the shell without console errors | I-02, I-09 |
| Babylon.js reproduces the POC camera, picking, and gizmo behavior | I-04, I-06 |
| The custom store does not loop React or allocate unstable snapshots | I-03, I-09 |
| No unapproved dependency appears in the resolved tree | I-01 and every increment review |
| Chrome 156 acceptance passes | I-09 |

A failed validation stops the increment. It is not worked around by loosening the pin, disabling a check, or adding a replacement package without a new decision.

## References

- [ADR 0001 - Proposed architecture direction for SimuForge](0001-proposed-architecture-direction.md)
- [ADR 0003 - MVP-0 local persistence and project file format](0003-mvp-0-persistence-and-project-format.md)
- [MVP-0 Dependency and License Inventory](../../projects/simuforge/scaffold/MVP_0_DEPENDENCY_AND_LICENSE_INVENTORY.md)
- [MVP-0 Architecture Proposal](../../projects/simuforge/scaffold/MVP_0_ARCHITECTURE_PROPOSAL.md)
- [MVP-0 Scaffold Specification](../../projects/simuforge/scaffold/MVP_0_SCAFFOLD_SPECIFICATION.md)
- [MVP-0 Owner Decision Request](../../projects/simuforge/scaffold/MVP_0_OWNER_DECISION_REQUEST.md)
- [POC-01 World Editor](../../projects/simuforge/docs/POC_01_WORLD_EDITOR.md)
- [POC-01 Implementation Readiness](../../projects/simuforge/docs/POC_01_IMPLEMENTATION_READINESS.md)
- [SP-08 Final Spike Decision Report](../../projects/simuforge/reports/poc-01/results/SP-08_FINAL_SPIKE_DECISION_REPORT.md)
- [How ADRs are written](README.md)
