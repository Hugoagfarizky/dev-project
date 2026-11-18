# Phase 10 — Extensibility: Validation Strategy

**Status:** PLANNING COMPLETE — PENDING PROJECT OWNER APPROVAL

## Validation matrix

| Stage | Command / Method | PASS condition |
|---|---|---|
| Node version | `node --version` | v24.22.2 |
| Static checks | `npm run check` | All stages pass |
| Unit tests | `npm test` | 0 failures; new extension tests pass |
| Type check | `npm run typecheck` | 0 errors |
| Boundary check | `npm run check:boundaries` | pass |
| Contrast check | `npm run check:tokens` | pass |
| Build | `npm run build` | pass |
| Browser regression | `npx playwright test --workers=1` | 0 failures |
| Phase 10 E2E | `npx playwright test tests/browser/phase10-extensions.spec.ts --workers=1` | 0 failures |

## Unit test coverage

- Manifest validation (valid/invalid).
- Extension registration and unregistration.
- Permission checks.
- Custom component serialization round-trip.
- Extension hook invocation (onTick, onPlay, onStop, onReset).
- Invalid extension handling.

## Integration tests

- Load/disable/unload lifecycle.
- Invalid extension warns and is disabled; Play still works.
- Extension runtime failure pauses and preserves state.
- Backward compatibility: projects without extensions open/run unchanged.

## Browser E2E (smoke)

- Install extension, use custom component, run simulation.
- Enable/disable extension.
- View diagnostics.

## Performance

- Extension tick budget; watchdog for hung extensions.
- No main-thread blocking.

## Measurable PASS/FAIL

- All new tests pass.
- No regressions (test count >= current baseline).
- `npm run check` PASS under Node 24.22.2.
- Build PASS.

## Unresolved technical questions

- D-P10-open-1: Dynamic graph node registration from extensions (may defer to v2).
- D-P10-open-2: Extension storage format (embedded vs sidecar).
- Worker protocol details (reuse Python worker pattern).
- Permission enforcement granularity.
