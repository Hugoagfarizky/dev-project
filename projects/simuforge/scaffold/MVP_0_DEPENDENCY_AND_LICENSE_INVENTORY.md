# SimuForge - MVP-0 Dependency and License Inventory

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 2.0 - Approved |
| Date | 2026-11-06 |
| Status | Approved through OD-05 and ADR 0002; no package has been installed |
| Owner role | Engineering Lead, SimuForge |
| Project | simuforge |
| Applies to | [MVP-0 Scaffold Specification](MVP_0_SCAFFOLD_SPECIFICATION.md) |
| Decision | [ADR 0002](../../../docs/decisions/0002-mvp-0-technology-stack.md) (accepted 2026-11-06) |
| Design baseline | `e722c03b1049b9fd34bad15c22693e9865761235` |
| Registry snapshot | npm registry queried 2026-11-05 |
| Language | English |

## 1. Decision Summary

MVP-0 defines **nine direct dependencies**: three runtime packages and six development packages. They are pinned to exact versions. All other packages in this document are transitive and are controlled by the lockfile.

| Class | Packages |
| --- | --- |
| Runtime | `react`, `react-dom`, `@babylonjs/core` |
| Development | `typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `@types/node` |

Dependency type is shown by section: every package in §4 is **direct**, and every package in §5 is **transitive**. No row mixes the two.

No package is installed by this document. No `package.json`, lockfile, `node_modules`, or build output exists in `projects/simuforge/scaffold/`. The Project Owner approved this inventory through OD-05 on 2026-11-06 and it is recorded in [ADR 0002](../../../docs/decisions/0002-mvp-0-technology-stack.md). Installation is an implementation increment that remains unauthorized until the Project Owner explicitly authorizes I-01.

The version set is the POC-01 field-tested set, not the newest available set. Every direct package is pinned exactly; no caret or tilde range is used for a direct dependency.

## 2. Selection Principles

1. **Reuse the validated POC-01 foundation.** React 19.3.1, TypeScript 6.0.3, Vite 8.3.5, and Babylon.js 9.32.1 were exercised together in POC-01. Changing them now would invalidate the evidence.
2. **No release-day upgrades.** A release published on the review date is not adopted without a separate upgrade review.
3. **No dependency without a named replacement cost.** Each rejected candidate in §7 states what would have to be written without it.
4. **Prefer platform APIs.** UUIDs come from `crypto.randomUUID()`, storage from IndexedDB and `localStorage`, date formatting from `Intl.DateTimeFormat`, and tests from `node:test`.
5. **Pin the toolchain, not only the app.** Node, npm, TypeScript, Vite, and the lockfile are part of the reproducible build.
6. **Keep the license surface small.** MIT, ISC, BSD-3-Clause, and Apache-2.0 dominate. The only MPL-2.0 packages are build-time native tooling and are not shipped in the application bundle.

## 3. Recommended Runtime Versions

| Item | Recommended | Latest on 2026-11-05 | Reason |
| --- | --- | --- | --- |
| Node.js | **24.22.2 LTS (Krypton)** | 26.13.0 (Active LTS) | POC-01 baseline; Maintenance LTS since 2026-10-20 and supported to 2028-04-30; matches Vite 8 engines; ships npm 11.19.1. Node 26.13.0 is Active LTS but is a runtime change from the POC, so it is deferred until after the scaffold baseline is green. Local machine currently has 24.21.0 and must be updated before installation. |
| npm | **11.19.1** | 11.20.0 (bundled with Node 26) | Ships with Node 24.22.2. Lockfile version 3. |
| React / React DOM | **19.3.1 / 19.3.1** | 19.3.1 | Exact match; POC-01 validated. |
| TypeScript | **6.0.3** | 7.0.2 | 7.x is the native compiler; POC-01 and `create-vite` still target 6.x. Migration is a separate task. |
| Vite | **8.3.5** | 8.3.6 (published 2026-11-05) | A patch published on the review date is not adopted without a separate review; 8.3.5 is the POC-validated minor. |
| `@vitejs/plugin-react` | **6.1.2** | 6.2.1 | Matches the POC-validated Vite 8 line; 6.2.1 is newer than the POC baseline. |
| Babylon.js | **9.32.1** | 9.34.0 | POC-01 pinned and verified 9.32.1. |
| `@types/react` | **19.3.0** | 19.3.0 | Current types for the React 19.3 line. |
| `@types/react-dom` | **19.3.0** | 19.3.0 | Current types for the React 19.3 line. |
| `@types/node` | **24.19.2** | 24.19.2 | Matches the Node 24 line. |
| Chrome (test target) | **156.0.8078.80** | 156.0.8078.80 | POC-01 target build; installed on the review machine. |

Maintenance notes from the registry snapshot:

- React 19.3.1 and React DOM 19.3.1 are the latest stable releases on the 19.x line.
- TypeScript 6.0.3 is the POC-validated 6.x pin; 7.0.2 is the native-compiler line and is a separate migration.
- Vite 8.3.5 is one patch behind 8.3.6; the 8.x line is active.
- Babylon.js 9.32.1 is behind 9.34.0; the 9.x line is active.
- No direct package carried an npm deprecation flag at the review date.
- Node 24 is Maintenance LTS, not end-of-life. Node 26 is Active LTS. The scaffold stays on the POC-validated 24.x line for its first baseline and schedules a Node 26 review afterwards.

## 4. Direct Dependencies

### 4.1 Runtime dependencies

| Package | Pinned version | Function in MVP-0 | License | Why this package | Compatibility risk |
| --- | --- | --- | --- | --- | --- |
| `react` | 19.3.1 | Panel, Inspector, Hierarchy, Hub, and Console UI; `useSyncExternalStore` for the store | MIT | Validated in POC-01; no alternative evaluated that reduces risk | Low. Requires exact match with `react-dom`. |
| `react-dom` | 19.3.1 | Browser renderer for React | MIT | Must match `react` exactly | Low. Mismatched patch versions are unsupported. |
| `@babylonjs/core` | 9.32.1 | WebGL 2 engine, scene, ArcRotateCamera, picking, gizmos, grid, selection outline | Apache-2.0 | The only 3D engine validated by POC-01 (SP-01 to SP-07) | Medium. Engine majors change behavior; upgrades require re-running the POC acceptance checks. |

`@babylonjs/core@9.32.1` declares no runtime dependencies and no peer dependencies. Subpath imports are used to keep the bundle scoped to the modules MVP-0 needs.

### 4.2 Development dependencies

| Package | Pinned version | Function in MVP-0 | License | Why this package | Compatibility risk |
| --- | --- | --- | --- | --- | --- |
| `typescript` | 6.0.3 | Type checking, `strict`, `noUncheckedIndexedAccess` | Apache-2.0 | POC-01 baseline; 7.x is a compiler migration, not a scaffold task | Low. Vite transpiles with its own pipeline; TypeScript only type-checks. |
| `vite` | 8.3.5 | Dev server, production build, asset pipeline | MIT | POC-01 baseline; Vite 8 engine range accepts Node 24 | Medium. Vite 8 uses Rolldown and native binaries; platform coverage must be verified in CI. |
| `@vitejs/plugin-react` | 6.1.2 | React JSX transform and Fast Refresh | MIT | Declares `vite: ^8.0.0`; matches the pinned Vite line | Low. Peer range is satisfied by 8.3.5. |
| `@types/react` | 19.3.0 | React type declarations | MIT | Required for TypeScript | Low. Types can lag a patch release; this is expected. |
| `@types/react-dom` | 19.3.0 | React DOM type declarations | MIT | Required for TypeScript | Low. |
| `@types/node` | 24.19.2 | Node types for Vite config, tests, and the CDP harness | MIT | Matches Node 24 LTS | Low. |

## 5. Transitive Dependencies

These packages are not imported by SimuForge code. They are resolved by the lockfile.

### 5.1 Runtime transitive

| Package | Resolved version | Required by | License | Ships in bundle |
| --- | --- | --- | --- | --- |
| `scheduler` | 0.28.0 | `react-dom` (`^0.28.0`) | MIT | Yes |

### 5.2 Build and type transitive

| Package | Resolved version | Required by | License | Ships in bundle |
| --- | --- | --- | --- | --- |
| `csstype` | 3.2.3 | `@types/react` (`^3.2.2`) | MIT | No (types only) |
| `undici-types` | 7.24.6 | `@types/node` (`>=7.24.0 <7.24.7`) | MIT | No (types only) |
| `postcss` | 8.5.32 | `vite` (`^8.5.30`) | MIT | No |
| `nanoid` | 3.3.20 | `postcss` (`^3.3.20`) | MIT | No |
| `picocolors` | 1.1.1 | `postcss` (`^1.1.1`) | ISC | No |
| `source-map-js` | 1.2.2 | `postcss` (`^1.2.2`) | BSD-3-Clause | No |
| `rolldown` | 1.2.16 | `vite` (`~1.2.14`) | MIT | No |
| `@oxc-project/types` | 0.156.0 | `rolldown` (`=0.156.0`) | MIT | No |
| `@rolldown/pluginutils` | 1.0.1 | `rolldown` (`^1.0.0`), `@vitejs/plugin-react` (`^1.0.1`) | MIT | No |
| `picomatch` | 4.0.7 | `vite` (`^4.0.7`), `tinyglobby` (`^4.0.4`) | MIT | No |
| `tinyglobby` | 0.2.17 | `vite` (`^0.2.17`) | MIT | No |
| `fdir` | 6.5.0 | `tinyglobby` (`^6.5.0`) | MIT | No |
| `lightningcss` | 1.33.0 | `vite` (`^1.33.0`) | MPL-2.0 | No (build-time native tool) |
| `detect-libc` | 2.1.2 | `lightningcss` (`^2.0.3`) | Apache-2.0 | No |
| `lightningcss-win32-x64-msvc` | 1.33.0 | `lightningcss` optional platform binary | MPL-2.0 | No |

`rolldown` and `lightningcss` also declare platform-specific optional binaries for macOS, Linux, FreeBSD, and Android. npm records all optional platform packages in the lockfile but installs only the binary that matches the current platform. The Windows x64 MSVC binary is the one used on the review machine. CI must run `npm ci` on its own platform; the lockfile already covers the supported set.

Compatibility risk for these packages is controlled by the lockfile and `npm ci`. The material residual risk is native platform coverage (DEP-01), not an API contract that SimuForge code depends on.

`rolldown` is declared as `~1.2.14`, so npm resolves the newest 1.2.x patch. At review time that is 1.2.16. The exact resolved version is recorded by the lockfile, not by the manifest.

### 5.3 Expected install size

No install was performed, so no measured size is claimed. The expected shape is: three runtime packages, six direct development packages, and roughly fifteen transitive packages plus one platform binary. A future `npm ci` must record the actual package count and install size in the increment evidence.

## 6. License Obligations

| License | Packages | Obligation | MVP-0 action |
| --- | --- | --- | --- |
| MIT | react, react-dom, scheduler, vite, plugin-react, all `@types/*`, csstype, undici-types, postcss, nanoid, rolldown, `@oxc-project/types`, `@rolldown/pluginutils`, picomatch, tinyglobby, fdir | Retain copyright notice and permission text for distributed copies | Generate `THIRD_PARTY_NOTICES.md` in the app and include it in the build |
| ISC | picocolors | Retain copyright and permission text | Covered by the notices file |
| BSD-3-Clause | source-map-js | Retain copyright, conditions, and disclaimer; do not use names for endorsement | Covered by the notices file |
| Apache-2.0 | typescript, @babylonjs/core, detect-libc | Include the license, retain `NOTICE` if present, state modified files | Covered by the notices file; no modification planned |
| MPL-2.0 | lightningcss, lightningcss-win32-x64-msvc | File-level copyleft. Distributing modified MPL files requires their source. Unmodified use requires the license notice and source availability | Build-time only, unmodified, not shipped in the app bundle. Record the version and upstream source URL in the notices file. |

No GPL, AGPL, SSPL, or unknown license is present in the approved closure.

The notices file is a build artifact requirement, not a product feature. It is produced in implementation increment I-01 and reviewed before the first release build.

## 7. Rejected and Deferred Candidates

| Candidate | Version at review | License | Decision | Reason |
| --- | --- | --- | --- | --- |
| `zustand` | 5.0.16 | MIT | Rejected | The POC-01 store shape is small and already specified with `useSyncExternalStore`. A store library adds a dependency without removing code. |
| `three` | 0.187.0 | MIT | Rejected | Documented alternative only. A second renderer would duplicate the adapter and invalidate POC-01 evidence. |
| `uuid` | 13.x | MIT | Rejected | `crypto.randomUUID()` is available in the target browser and in Node 24. |
| `immer` | 10.x | MIT | Rejected | Commands already produce new snapshots. A proxy layer obscures mutation boundaries. |
| `dexie` | 4.x | Apache-2.0 | Rejected for MVP-0 | The storage surface is one object store with one index. A small typed IndexedDB adapter is cheaper than a wrapper API. Revisit only if queries grow. |
| `idb` | 8.x | ISC | Rejected for MVP-0 | Same reason as Dexie. |
| `vitest` | 4.x | MIT | Deferred | World, project, command, and store logic are DOM-free and run on `node:test`. Adding a second test runner is not justified until React component tests exist. |
| `jsdom` | 27.x | MIT | Deferred | Not needed while component tests are absent. |
| `playwright` | 1.5x | Apache-2.0 | Deferred | The layout and keyboard checks can drive Chrome 156 over the DevTools Protocol, matching the POC-01 evidence method. Add Playwright only if cross-browser automation becomes a requirement. |
| `eslint` + `typescript-eslint` | 9.x / 8.x | MIT | Deferred | TypeScript strict mode, the import-boundary check, and review cover the MVP-0 risk. Adopt linting in Phase 01 with its own dependency review. |
| `prettier` | 3.x | MIT | Deferred | Formatting is not a correctness gate and would add a second toolchain decision. |
| UI kit (Radix, MUI, Mantine, Chakra) | Various | MIT | Rejected | The design system is custom tokens and components. A kit would conflict with the specified geometry and states. |
| Icon library | Various | Mixed | Deferred | The mockups use a local sprite with unresolved production licensing. MVP-0 uses authored SVG glyphs plus text labels. |
| `date-fns` / `dayjs` | Various | MIT | Rejected | `Intl.DateTimeFormat` covers Project Hub timestamps. |
| `classnames` / `clsx` | 2.x | MIT | Rejected | Template strings are sufficient at this scale. |

## 8. Version Policy

1. Direct dependencies are exact pins. `npm install <pkg>` without a version is forbidden in this project.
2. The lockfile is committed and is the only accepted resolution source. CI uses `npm ci`, never `npm install`.
3. Upgrades of React, React DOM, Babylon.js, Vite, plugin-react, or TypeScript require a dedicated change with test evidence.
4. A Babylon.js upgrade requires re-running the POC-01 transform, camera, and picking checks that the adapter depends on.
5. A Vite major or minor upgrade requires a fresh license and platform-binary review.
6. `npm audit` findings are triaged. A fix that requires a breaking major upgrade is escalated, not applied silently.
7. No dependency is added to satisfy a single call site when a platform API exists.

## 9. Compatibility Matrix

| Constraint | Requirement | Evidence |
| --- | --- | --- |
| Node for Vite 8.3.5 | `^20.19.0 \|\| >=22.12.0` | `npm view vite@8.3.5 engines` |
| Node for plugin-react 6.1.2 | `^20.19.0 \|\| >=22.12.0` | `npm view @vitejs/plugin-react@6.1.2 engines` |
| Node selected | 24.22.2 LTS (Maintenance LTS) | Node release index, 2026-10-27; Node release schedule, maintenance from 2026-10-20, end 2028-04-30 |
| React / React DOM | Same exact version | `react-dom` peer `react: ^19.3.1` |
| plugin-react / Vite | `vite: ^8.0.0` | Peer range satisfied by 8.3.5 |
| Babylon.js runtime | WebGL 2 | POC-01 SP-01 |
| Browser | Chrome 156 desktop on Windows | POC-01 approved scope |
| TypeScript | `>=14.17` engine; no peer constraint from Vite | Type checking is independent of the bundler |
| OS coverage | Windows x64 primary; Linux x64 for CI if added | Native optional binaries are lockfile-recorded |

## 10. Installation and Verification Plan (Not Executed)

When implementation is authorized:

```text
node --version                      # must be v24.22.2
npm --version                       # must be 11.19.1
npm ci                              # lockfile only
npm ls --all                        # verify the resolved tree
npm run typecheck                   # tsc --noEmit
npm run build                       # vite build
npm test                            # node --test
```

The increment must record:

- the resolved package count,
- the lockfile hash,
- the actual install size,
- the generated notices file,
- any `npm audit` output and its triage,
- the Chrome and OS versions used for the smoke tests.

## 11. Risks

| ID | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| DEP-01 | Vite 8/Rolldown native binary is unavailable for a contributor platform | Build fails on that platform | Lockfile covers supported platforms; document Windows x64 as primary and require CI parity |
| DEP-02 | Babylon deep imports pull unintended modules or break tree shaking | Large bundle or missing side-effect module | Use explicit subpath imports; verify with a production build and a load smoke test |
| DEP-03 | `@types/react` 19.3.0 does not exactly match React 19.3.1 | Type-level mismatch | Types are patch-independent in practice; pin and re-check on the next React patch |
| DEP-04 | MPL-2.0 notice is omitted because lightningcss is build-time only | License non-compliance | Generate notices from the lockfile; include MPL entry explicitly |
| DEP-05 | A transitive patch changes between environments | Non-reproducible build | `npm ci` plus committed lockfile; no floating installs |
| DEP-06 | Node 24.21.0 is used by mistake | Engine mismatch against the approved baseline | Add `engines` and `.nvmrc`/`.node-version` in I-01; fail fast on version check |

## 12. Traceability

| Claim | Source |
| --- | --- |
| Approved POC versions | POC-01 Implementation Readiness §3; ADR 0002 |
| React store approach | POC-01 World Editor §10.3; A-19; ADR 0002 |
| Renderer choice | POC-01 World Editor §4.2; SP-08 §3; ADR 0002 |
| Browser scope | SP-08 §3 and R-4 |
| No-dependency rule | Engineering Standards, Design |
| Lockfile and reproducibility | Engineering Standards, Language and tooling; ADR 0002 |
| License obligations | Package metadata from the npm registry, 2026-11-05 |
| Storage without a wrapper | ADR 0003 |

## 13. Approval

The Project Owner approved this inventory through OD-05 on 2026-11-06. It does not authorize installation; ADR 0002 records the decision, and I-01 remains unauthorized.

| Role | Decision | Date |
| --- | --- | --- |
| Product Owner | **Approved through OD-05** | 2026-11-06 |
| Engineering reviewer | Reviewed for documentation consistency | 2026-11-06 |
