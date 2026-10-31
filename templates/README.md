# Templates

This directory is reserved for reusable project templates.

## Purpose

A template captures the parts of a project that are identical every time it is started: directory layout, tooling configuration, test setup, linting, and baseline documentation. The goal is to remove repetitive setup work and to keep new projects consistent with the standards in [`../docs/development/ENGINEERING_STANDARDS.md`](../docs/development/ENGINEERING_STANDARDS.md).

## Guidelines

- A template is created only after at least one real project has proven the setup works. Templates are extracted from working projects, not invented up front.
- Each template is self-contained in its own directory with a `README.md` describing what it contains, which project it was derived from, and how to use it.
- Templates contain configuration and structure only. They do not contain application logic, credentials, or project-specific code.
- A template that is no longer maintained is removed, not left to rot.

## Status

No templates exist yet. There is nothing to extract until a project has been built.
