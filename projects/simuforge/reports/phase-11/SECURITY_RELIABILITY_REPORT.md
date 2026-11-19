# Phase 11 — Security & Reliability Report

**Date:** 2026-11-19  
**Phase:** 11 — Quality, Performance & Release

## 1. Worker boundaries

- Python and extension workers receive only serializable snapshots/source.
- Canonical state stays on main thread.
- Capability hardening is best-effort; documented in SECURITY_BOUNDARY.md.
- No hardened sandbox claim made.

## 2. Permission enforcement

- `read:world`, `write:components`, `run:simulation-hooks`, `emit:events` re-checked at host call sites.
- Host strips world data when `read:world` absent.
- Graph nodes require permissions; failures pause runtime.

## 3. Message validation

- Worker responses validated by `validateWorkerResponse`; invalid/stale ignored and reported.
- Extension invalid messages reported via onDiagnostic.

## 4. Timeout / crash / recovery

- Hook timeout 250 ms; startup 5 s; crashed worker terminated; runtime pauses on fatal.
- Python timeout/cancellation per ADR 0004.

## 5. Persistence

- Project JSON validated before state replacement; oversize rejected; corrupt leaves state untouched.
- Storage unavailable/quota exceeded handled with export-copy recovery.

## 6. Dependencies and licenses

- `npm run notices` generated `THIRD_PARTY_NOTICES.md` (52 packages).
- Licenses: MIT, ISC, BSD-3-Clause, Apache-2.0; MPL-2.0 build-time only.
- No CVE scan tooling added; manual review of lockfile performed; no known vulnerable packages identified in direct dependencies.

## 7. Findings

No release-blocking security findings. Residual risks documented in SECURITY_BOUNDARY.md.
