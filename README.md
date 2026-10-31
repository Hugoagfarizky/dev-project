# dev-project

A development workspace for building experimental software projects and SimuForge, a programmable simulation sandbox.

## About

`dev-project` is a development workspace for experimenting with, designing, and building software projects.

It is a starting point for new work rather than a single application. Each project lives in its own directory under `projects/`, keeps its own documentation and tests, and follows the shared engineering standards in `docs/development/`.

Nothing in this repository is a finished product. Work moves from requirements and architecture to an implementation plan, and only then to code.

## Current Main Project

### SimuForge — Programmable Simulation Sandbox

A browser-based platform where users can create virtual environments, build custom objects and systems, program behaviors using visual scripting and Python, and run interactive simulations.

**Build. Program. Simulate.**

SimuForge is the project this workspace is being prepared for. Implementation has not started yet.

## Repository Goals

- Develop new software projects.
- Experiment with technologies and architectures.
- Maintain reusable engineering standards.
- Document technical decisions.
- Build projects incrementally.

## Development Principles

- **Modular architecture.** Systems are split into modules with explicit boundaries and responsibilities.
- **Clear separation of concerns.** UI, domain logic, simulation, and infrastructure stay independent of each other.
- **Incremental development.** Small, reviewable steps instead of large speculative builds.
- **Automated testing.** Automated tests should run consistently in local development and, once CI is introduced, in the CI environment.
- **Documentation-driven decisions.** Important choices are written down before they become hard to reverse.
- **No unnecessary refactoring.** Code is changed when there is a reason, not for novelty.
- **Preserve working implementations.** Working code is not rewritten or discarded without an explicit decision.

## Project Status

SimuForge is currently in the **concept and technical planning** stage.

- Requirements and scope are still being defined.
- The proposed architecture is provisional and has not been validated.
- No production implementation, proof of concept, or benchmark exists.
- No performance, reliability, or completeness claims should be inferred from this repository.

## Repository Structure

```text
dev-project/
├── docs/
│   ├── architecture/   # Cross-project architecture documentation
│   ├── decisions/      # Architecture Decision Records (ADRs)
│   └── development/    # Workflow and engineering standards
├── projects/           # Future projects; each keeps its own docs/
├── templates/          # Reusable project templates
├── .github/
│   └── ISSUE_TEMPLATE/ # Issue templates for future work
├── .gitignore
├── LICENSE
└── README.md
```

Architecture documentation in `docs/architecture/` covers concerns that span projects. Project-specific architecture documentation lives inside each project, under `projects/<project-name>/docs/`.

## Documentation

| Document | Purpose |
| --- | --- |
| [`docs/development/WORKFLOW.md`](docs/development/WORKFLOW.md) | How work moves from requirements to an approved change. |
| [`docs/development/ENGINEERING_STANDARDS.md`](docs/development/ENGINEERING_STANDARDS.md) | Repository-level engineering standards. |
| [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) | Architecture documentation conventions and the provisional SimuForge outline. |
| [`docs/decisions/README.md`](docs/decisions/README.md) | How Architecture Decision Records are written. |
| [`projects/README.md`](projects/README.md) | How projects in this workspace are organized. |
| [`templates/README.md`](templates/README.md) | Purpose of the reusable project templates. |

## Working in this repository

Work follows [`docs/development/WORKFLOW.md`](docs/development/WORKFLOW.md). Changes are reviewed as a Git diff and require explicit approval before they are committed and pushed.

## License

Released under the MIT License. See [`LICENSE`](LICENSE).
