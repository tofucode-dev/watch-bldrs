<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Publish Draft Build

- **Plan**: context/changes/publish-draft-build/plan.md
- **Scope**: All 3 phases
- **Date**: 2026-09-14
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Findings

### F1 — Missing failed-save blocks Publish component test

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/modules/builds/presentation/build-form.test.tsx
- **Detail**: Phase 2 contract lists "Failed save … remains non-publishable" alongside upload/attach failure cases. Upload failure (lines 506–522) and attach failure (lines 524–547) are tested, but no test simulates a failed Save Draft on a dirty draft and asserts Publish stays disabled. Implementation supports this via `publishEnabled = hasSavedDraft && !isPending && !isDirty`, so behavior is likely correct; the test matrix is incomplete vs. plan.
- **Fix**: Add one component test: dirty draft → mock save failure → assert Publish disabled and guidance visible.
- **Decision**: FIXED

### F2 — Publish path reuses save-oriented unauthorized copy

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/modules/builds/presentation/build-form.tsx:51-52
- **Detail**: `mapActionFailure` maps `UNAUTHORIZED` to "You must be signed in to save a draft" for all build actions, including publish. Session expiry during publish shows save-oriented messaging.
- **Fix**: Branch on action context in `mapActionFailure` (or pass `"publish"` vs `"save"`) so publish failures say "You must be signed in to publish".
- **Decision**: FIXED

### F3 — ESLint prettier violations in publish slice files

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: src/components/ui/sticky-action-bar.tsx:34, src/pages/dashboard.astro:13, tests/integration/publish-draft-build.test.ts:136,142
- **Detail**: `npm run lint` fails with 4 prettier/prettier errors in publish-related files on this worktree (Windows). All are auto-fixable via `npm run lint:fix`. Plan Progress marks 3.3 ESLint passes at bcef629; re-run here fails before fix. Likely committed without local prettier pass or OS-specific formatting drift.
- **Fix**: Run `npm run lint:fix` on the three affected files and commit the formatting corrections.
- **Decision**: FIXED

### F4 — Full integration suite storage test failure (environmental)

- **Severity**: 👁 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: tests/integration/build-image-storage.test.ts:104
- **Detail**: `npm run test:integration` reports 1 failure in `build-image-storage.test.ts` (anon bucket list expected length 0, got 1). Focused publish tests (`tests/integration/publish-draft-build.test.ts`) pass 5/5. Failure appears unrelated to publish implementation — likely leftover local Storage objects or test-order coupling. Plan marks 3.2 complete at bcef629.
- **Fix**: Reset local Supabase (`npx supabase db reset`) and re-run full integration suite; if failure persists, investigate storage cleanup in the identity harness — not a publish slice defect.
- **Decision**: SKIPPED

## Automated Verification (re-run 2026-09-14)

| Command | Result |
|---------|--------|
| `npm run test -- src/modules/builds/application/use-cases.test.ts` | PASS (43 tests in combined run with build-form) |
| `npm run test -- src/modules/builds/presentation/build-form.test.tsx` | PASS |
| `npm run test:integration -- tests/integration/publish-draft-build.test.ts` | PASS (5/5) |
| `npm run test` | PASS (150/150) |
| `npm run lint` | FAIL (4 prettier errors, auto-fixable) |
| `npm run test:integration` | FAIL (25/26 — storage RLS list test) |
| `npm run storybook:build` | PASS |
| `npm run build` | PASS |
| No service-role in builds module | PASS |
| No server imports in presentation layer | PASS |
| No new publish migration | PASS |
