# SimuForge v1.0.0 — Release Checklist

## Pre-release

- [x] `npm run check` PASS
- [x] `npm test` 100% pass (362/362)
- [x] `npm run build` PASS
- [x] Playwright critical workflows 100% pass (Chrome/Edge)
- [x] Firefox compatibility matrix documented
- [x] No release-blocking security findings
- [x] Save/reopen integrity all domains verified
- [x] Performance baseline recorded
- [x] Release documentation complete
- [x] Notices generated (`THIRD_PARTY_NOTICES.md`)
- [x] Version bumped to 1.0.0

## Release

- [ ] Tag `v1.0.0` (only after final acceptance)
- [ ] Produce static build artifact (`app/dist/`)
- [ ] Produce source archive
- [ ] Publish release notes

## Rollback / recovery

- Rollback = redeploy previous tagged artifact.
- User data is local; schema remains v1; no server-side migration.
- Export/import remains the user-facing recovery path.

## Deployment

- No production deployment without separate authorization.
- COOP/COEP headers required for full Python interrupt; document for host.
