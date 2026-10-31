# Projects

This directory is reserved for the software projects developed in this workspace. It contains this README until a project is ready to start.

## Organization

Each project gets exactly one directory directly under `projects/`, named in `kebab-case` after the project:

```text
projects/
└── <project-name>/
    ├── README.md          # What the project is, how to run it, current status
    ├── docs/              # Project-specific architecture documentation and notes
    ├── src/               # Source code
    └── ...                # Tests, configuration, and package files as needed
```

A project directory is self-contained: it can be installed, built, and tested without depending on another project's source. Shared code is extracted only when a genuine shared need exists, and then it is documented.

## Project README

Every project's `README.md` states:

- what the project does and who it is for,
- its current status (concept, prototype, or implemented),
- how to install, run, and test it,
- which documentation in the project is authoritative.

## Relationship to workspace documentation

Projects follow the guidelines in [`../docs/development/ENGINEERING_STANDARDS.md`](../docs/development/ENGINEERING_STANDARDS.md) and the process in [`../docs/development/WORKFLOW.md`](../docs/development/WORKFLOW.md). Decisions that affect a project's architecture are recorded as ADRs in [`../docs/decisions/README.md`](../docs/decisions/README.md).

Projects may add stricter rules of their own, documented in their local `docs/` directory.

## Status

No projects exist yet. SimuForge is in the concept and technical planning stage and has not been added here.
