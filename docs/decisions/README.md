# Architecture Decision Records

This directory holds Architecture Decision Records (ADRs) for decisions made in this workspace.

An ADR captures a single decision, the context that forced it, and its consequences. It is written so that someone joining the project later can understand why the system looks the way it does without reconstructing the discussion.

## When to write one

Write an ADR when a decision:

- is expensive or slow to reverse,
- affects the architecture, public interfaces, or data formats of a project,
- constrains future projects or shared tooling,
- selects, replaces, or drops a significant dependency or technology,
- deliberately accepts a known trade-off or technical debt.

Routine implementation choices do not need an ADR.

## Naming and location

```text
docs/decisions/NNNN-short-kebab-case-title.md
```

Numbers are sequential and never reused. ADRs are not deleted; a superseded decision keeps its file and records the superseding ADR.

## Structure

```markdown
# NNNN. Title

- Status: proposed | accepted | superseded by ADR-NNNN | deprecated
- Date: YYYY-MM-DD
- Project: dev-project | <project-name>

## Context

The situation, constraints, and forces that require a decision.

## Decision

What was chosen, stated in the active voice.

## Consequences

What becomes easier, what becomes harder, and what must now be maintained.
```

## Status values

- **proposed** — under discussion, not yet binding.
- **accepted** — the current decision.
- **superseded by ADR-NNNN** — replaced by a later decision.
- **deprecated** — no longer relevant, kept for history.

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-proposed-architecture-direction.md) | Proposed architecture direction for SimuForge | proposed |
| [0002](0002-mvp-0-technology-stack.md) | MVP-0 technology stack | accepted |
| [0003](0003-mvp-0-persistence-and-project-format.md) | MVP-0 local persistence and project file format | accepted |

## Guardrail

Do not record decisions that have not been validated. A technology or architecture that has only been considered belongs in a research note or an ADR with status `proposed`, never as an accepted decision. The SimuForge outline in [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) is explicitly provisional and does not constitute decisions.
