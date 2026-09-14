<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Test Rollout Implementation Plan

- **Plan**: context/changes/test-plan-risk-grounding/plan.md
- **Scope**: All 4 phases (full plan review)
- **Date**: 2026-09-14
- **Verdict**: APPROVED (post-triage)
- **Findings**: 0 critical, 3 warnings, 2 observations — all FIXED

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS (post-triage) |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS (post-triage) |
| Success Criteria | PASS |

## Findings

### F1 — Phase 1.3 inconsistent-row integration test missing

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence
- **Location**: tests/integration/catalog-listing.test.ts
- **Detail**: Plan Phase 1.3 required a service-role seed of `{ status: "published", published_at: null }` and an assertion that `listPublishedBuilds` excludes that id for any identity. Implementation instead added `describe("catalog listing unpublished build with preserved published_at")` (draft + non-null `published_at`) and moved null-`published_at` defense to a unit test in `src/modules/catalog/infrastructure/supabase-catalog-store.test.ts` (`"drops rows with null published_at even when the query returns them"`). The unit test guards mapper behavior but does not exercise the live Supabase + RLS boundary the plan specified for Risk #2.
- **Fix A ⭐ Recommended**: Add the planned integration case to `catalog-listing.test.ts` (service-role insert, identity-matrix exclusion assertion, `cleanupBuild`).
  - Strength: Matches plan intent and test-plan §6.2 live-boundary pattern; closes Risk #2 at integration layer.
  - Tradeoff: One more seed row per run; duplicates partial unit coverage.
  - Confidence: HIGH — pattern exists in sibling integration files.
  - Blind spot: None significant if service-role insert matches existing helpers.
- **Fix B**: Accept unit-layer coverage and update plan §Phase 1.3 + test-plan §6.2 to document the substitution.
  - Strength: Avoids redundant test maintenance if unit + unpublish tests are deemed sufficient.
  - Tradeoff: Weaker proof against query/RLS regressions at the real DB boundary.
  - Confidence: MEDIUM — depends on product risk tolerance for inconsistent rows.
  - Blind spot: Future catalog query changes could pass unit tests while failing live RLS paths.
- **Decision**: FIXED via Fix A — added `catalog listing inconsistent published row` integration case to `catalog-listing.test.ts`

### F2 — catalog-filters tied-timestamp suite skips demo-data isolation

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: tests/integration/catalog-filters.test.ts:233
- **Detail**: The new `"catalog tied-timestamp pagination under filters"` block seeds 13 published rows and asserts exact page sizes (`12` + `1`). Unlike `catalog-listing.test.ts`, it never calls `clearCatalogDemoData()`. Residual demo seed rows matching the same filter tuple can inflate counts and cause flaky failures on machines with demo data present.
- **Fix**: Call `await clearCatalogDemoData(identities.serviceRole)` in `beforeAll` for both describe blocks in `catalog-filters.test.ts`.
  - Strength: Matches `catalog-listing.test.ts` and test-plan §6.2 step 5 guidance.
  - Tradeoff: Slightly longer setup; deletes demo fixtures local dev may rely on until re-seeded.
  - Confidence: HIGH — same helper already used in catalog-listing.
  - Blind spot: None significant.
- **Decision**: FIXED — added `clearCatalogDemoData` to both `beforeAll` hooks in `catalog-filters.test.ts`

### F3 — Draft-target save_draft_build RPC denial not tested

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: tests/integration/build-ownership-mutations.test.ts:107
- **Detail**: Use-case matrix covers draft and published targets via `describe.each`, but the RPC denial test only targets `publishedId`. test-plan §6.4 step 4 documents RPC parity for both draft and published targets (mirroring `save-draft-build.test.ts`).
- **Fix**: Add `it("user B cannot update author A draft via save_draft_build RPC", ...)` with `p_id: draftId` and expect RPC error.
- **Decision**: FIXED — added draft-target `save_draft_build` RPC denial test

### F4 — HTTP smoke/helper fetches lack timeouts

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: scripts/preview-smoke.mjs:19, tests/integration/helpers/http-session.ts:52
- **Detail**: `fetch` calls in preview smoke and the HTTP session helper have no per-request timeout. When preview is not running, failures depend on OS/network hang or Vitest's 30s hook timeout rather than a fast actionable error.
- **Fix**: Wrap shared fetch with `AbortSignal.timeout(5_000)` and throw a clear `"No server at ${baseUrl}"` message on abort.
- **Decision**: FIXED — added 5s fetch timeouts to `http-session.ts` and `preview-smoke.mjs`

### F5 — Default TEST_BASE_URL uses localhost not 127.0.0.1

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: tests/integration/helpers/http-session.ts, scripts/preview-smoke.mjs
- **Detail**: Plan specified default `http://127.0.0.1:4321`; implementation defaults to `http://localhost:4321`. Functionally equivalent on most hosts; README examples use `127.0.0.1`.
- **Fix**: Align defaults to `127.0.0.1` or document localhost as intentional in test-plan §6.3.
- **Decision**: FIXED — aligned default base URLs to `http://127.0.0.1:4321`

## Automated Verification (re-run 2026-09-14)

| Command | Result |
|---------|--------|
| `npm run test:integration` | PASS — 11 files, 55 tests; 1 file skipped (auth-session-chain without TEST_BASE_URL) |
| `npm run test` | PASS — 39 files, 266 tests |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm run preview:smoke` | PASS — against running preview at localhost:4321 |

## Manual Verification

All Progress manual checkboxes are marked complete (Phases 1.4, 4.5, 4.6). Preview server activity in terminal confirms auth chain and smoke paths were exercised locally.

## Triage Summary (2026-09-14)

- **Fixed:** F1 (Fix A), F2, F3, F4, F5
- **Skipped:** none
- **Post-triage verification:** `npm run test:integration` — 57 passed, 3 skipped
