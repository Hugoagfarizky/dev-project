# Engineering Standards

These are repository-level guidelines for all projects in `dev-project`. Individual projects may add stricter standards; they must not weaken these.

## Language and tooling

- **TypeScript strict mode** is required for TypeScript projects (`"strict": true`).
- **`noUncheckedIndexedAccess`** is a separate compiler option and is not enabled by `strict`. Enable it explicitly in addition to `strict`.
- Tooling configuration is committed to the repository and shared by every contributor. No hidden local settings that change builds or test results.

## Naming and structure

- Use clear, descriptive names for files, modules, types, functions, and variables. Prefer names that state intent over abbreviations.
- Follow the conventions already established in the project you are working in. Consistency within a project outweighs personal preference.
- Directories mirror the architecture: one module, one responsibility.

## Design

- **Separate concerns.** UI, domain logic, and infrastructure do not leak into each other.
- **Reusable but justified abstractions.** Abstractions are introduced when a second real use case exists or when a boundary must be enforced, not in anticipation of one.
- **No unnecessary dependencies.** Every dependency must be justified by what it replaces and the cost of maintaining it. Prefer the platform and existing project code.

## Correctness

- **Handle errors explicitly.** Do not swallow errors, and do not use empty `catch` blocks. Distinguish expected failures from defects.
- **Validate at boundaries.** Treat external input, stored data, and cross-module payloads as untrusted.
- **No unverified claims.** Never state that tests pass, that performance targets are met, or that a feature is complete unless it was verified in this repository and the result is reproducible.

## Testing

- **Automated testing** is required for behavior that can regress: domain rules, data transforms, state transitions, and public interfaces.
- Tests must be deterministic and independent of execution order, network access, and wall-clock time.
- A bug fix includes a test that fails before the fix and passes after it.

## Documentation

- Document important decisions, especially those that are costly to reverse, as ADRs (see [`../decisions/README.md`](../decisions/README.md)).
- Keep documentation next to the code it describes, and update it in the same change as the code.
- State clearly what is proposed, what is implemented, and what is verified.
