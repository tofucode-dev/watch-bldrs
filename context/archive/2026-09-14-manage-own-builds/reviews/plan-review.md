<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Manage Own Builds Implementation Plan

- **Plan**: context/changes/manage-own-builds/plan.md
- **Mode**: Deep
- **Date**: 2026-09-14
- **Verdict**: SOUND (after triage; was REVISE)
- **Findings**: 0 critical 3 warnings 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | PASS (was WARNING; F2 fixed) |
| Plan Completeness | PASS (was WARNING; F1 and F3 fixed) |

## Grounding

Grounding: 23/24 paths ✓ (`src/modules/builds/infrastructure/supabase-build-store.test.ts` does not exist — plan said "extend"; create from scratch), 8/8 symbols ✓ (`getOwnedDraft`, `save_draft_build`, `footerAction`, `DraftNotFoundError`, `ownedDraftToFormInitial`, `PROTECTED_ROUTES`, `isDashboard`, `attachMainImage`), brief↔plan ✓ (naming drift resolved in F3: keep `getOwnedDraftForForm`).

## Findings

### F1 — Existing tests still lock published rows as uneditable

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 port extension; Phase 2 published save
- **Detail**: `FakeBuildStore` in `src/modules/builds/application/use-cases.test.ts` implements `BuildStore`. Phase 1 adds `listOwnedBuilds` and `deleteBuild` to the port, so `npm run lint` (strict TypeScript) fails unless those methods are added in Phase 1. Separately, `tests/integration/save-draft-build.test.ts` (`"does not update a published row via save_draft_build"`) and the unit test `"treats a published id as not found"` still assert the old draft-only contract. Phase 2 added a new published-update test but did not name rewriting those files, so CI would fail.
- **Fix**: Phase 1 — extend `FakeBuildStore` with `listOwnedBuilds`/`deleteBuild` (keep get/save/attach draft-only until Phase 2). Phase 2 — invert `save-draft-build.test.ts` published case; drop `FakeBuildStore` `status === 'draft'` gates on get/save/attach; replace `"treats a published id as not found"` with published get/save/attach success.
- **Decision**: FIXED

### F2 — Delete Action NOT_FOUND fights idempotent delete

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 1 — Delete Action and server resolver
- **Detail**: The use case said `deleteBuild` succeeds when the row is already absent (`OPERATIONAL_SAFETY.md`: do not return 404 for the author's already-deleted build). The Action contract still mapped `DraftNotFoundError` / not-found to `ActionError` `NOT_FOUND`. Reusing `DraftNotFoundError` (message `"Draft not found"`) for published or already-gone deletes is misleading. Publish's null→`NOT_FOUND` mapping is the wrong template here.
- **Fix A ⭐ Recommended**: Use case returns success when 0 rows deleted; Action never maps delete to `NOT_FOUND`. Authenticated delete is always ok (or unexpected). User B deleting A's id is a no-op success — they cannot load the edit page anyway.
  - Strength: Matches `OPERATIONAL_SAFETY` and the plan's own idempotent contract; no new error type.
  - Tradeoff: User B calling the Action gets the same ok as a real delete (no extra signal).
  - Confidence: HIGH — safety doc is explicit; edit page already 404s for non-owners.
  - Blind spot: None significant.
- **Fix B**: Succeed for owner's already-gone row; return `NOT_FOUND` only if a row exists and `author_id ≠ actor` (or RLS hides it).
  - Strength: Distinguishes "never yours" from "already deleted."
  - Tradeoff: Extra existence check (service role or leak-sensitive probe); still not required by the proving flow.
  - Confidence: MEDIUM — easy to leak existence if the probe is wrong.
  - Blind spot: Whether a second query is worth it at MVP volume.
- **Decision**: FIXED (Fix A)

### F3 — Published form plumbing is under-specified

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 — BuildForm published mode
- **Detail**: `OwnedDraft` and `BuildFormInitialDraft` have no `status` today. The plan said `ownedDraftToFormInitial` passes status, but did not list `src/modules/builds/presentation/build-form-types.ts` (or its test). Published-mode UI cannot branch without that field. `build-form.tsx` still says "Editing and unpublishing are unavailable in this MVP" during publish confirmation — false after this slice. Brief named `getOwnedBuildForForm`; plan said `getOwnedDraftForForm`.
- **Fix**: Add `status` to `OwnedDraft` and `BuildFormInitialDraft`; list `build-form-types.ts` (+ test) in Phase 2; rewrite the publish confirmation copy; keep `getOwnedDraftForForm` as the server export name.
- **Decision**: FIXED
