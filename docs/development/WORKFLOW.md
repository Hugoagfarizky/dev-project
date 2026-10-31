# Development Workflow

This workflow applies to every project developed in `dev-project`. It is intentionally sequential: a step is finished before the next one starts.

## 1. Define requirements

Describe what the change must accomplish and why. State the scope, the constraints, and anything explicitly out of scope. Ambiguity is resolved here, not during implementation.

## 2. Review architecture and scope

Check how the change fits the project's existing architecture. Confirm the affected modules, the data that crosses their boundaries, and whether an ADR is required. If the change does not fit the current architecture, revise the design first.

## 3. Create an implementation plan

Break the work into small, independently reviewable increments. For each increment, list the files or modules it touches, the tests it needs, and the risks it introduces.

## 4. Implement incrementally

Implement one increment at a time. Keep changes focused on the plan, avoid unrelated refactoring, and keep the repository in a working state at every step.

## 5. Run automated tests

Run the project's test suite, type checks, and linters. A change is not ready for review while any of them fail. Report results exactly as observed — never claim a test passed without running it.

## 6. Perform manual QA

Exercise the change the way a user would: happy path, edge cases, and failure modes. Record what was checked and any behavior that remains unverified.

## 7. Review changes and Git diff

Read the complete diff before proposing a commit. Confirm it contains only intended changes, that no secrets or generated files are included, and that the documentation still matches the behavior.

## 8. Obtain explicit approval before commit and push

Present the diff and the verification results, then wait for explicit approval. Committing and pushing are separate, deliberate actions and are never performed implicitly.

## Notes

- Documentation is updated in the same increment as the code it describes.
- Decisions that are expensive to reverse are recorded as ADRs, see [`../decisions/README.md`](../decisions/README.md).
- If a step reveals a problem with an earlier step, go back and correct it rather than working around it.
