<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Create a Private Draft Build

- **Plan**: context/changes/create-draft-build/plan.md
- **Scope**: Phase 1 of 3
- **Date**: 2026-09-13
- **Verdict**: APPROVED
- **Findings**: 0 critical 1 warning 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | WARNING |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Identity matrix never proves published-row protection

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: tests/integration/save-draft-build.test.ts
- **Detail**: `save_draft_build` correctly refuses non-draft rows (`UPDATE … AND status = 'draft'`, zero rows → `P0002`). Use-case tests cover that with a fake store (`use-cases.test.ts` “treats a published id as not found”). The integration matrix covers author A save, anon deny, user B deny, and “stays draft after a second save,” but never publishes a row and retries the RPC. Sibling `build-visibility.test.ts` does publish. A later migration could drop the status predicate and unit tests would still pass.
- **Fix**: After author A publishes, `rpc('save_draft_build', { p_id })` must error and leave `status`, `name`, `published_at`, and parts unchanged. Optionally assert a second save with a different parts array replaces, not appends.
  - Strength: Proves the SQL invariant with the same identities F-01 uses; fake-store coverage cannot catch a broken `WHERE`.
  - Tradeoff: One extra integration case that needs a publish path (service-role or author `UPDATE`).
  - Confidence: HIGH — sibling tests already publish and re-read rows.
  - Blind spot: None significant.
- **Decision**: FIXED

### F2 — Get/attach store ignores `authorId` (RLS-only)

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: src/modules/builds/infrastructure/supabase-build-store.ts:142,163
- **Detail**: `saveDraft` correctly omits `authorId` and lets `auth.uid()` decide. `getOwnedDraft` / `attachMainImage` take `_authorId` but filter only `id` + `status = 'draft'`. Safe with the user-scoped Action client (RLS). A service-role client using this adapter would skip ownership. The SQL function uses both RLS and an explicit `author_id` predicate.
- **Fix**: Add `.eq("author_id", authorId)` on get/attach so the adapter cannot be accidentally used with a privileged client.
- **Decision**: FIXED

### F3 — `attachMainImage` accepts `null` path in Phase 1

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/modules/builds/actions.ts:94; src/modules/builds/application/attach-main-image.ts:10
- **Detail**: Phase 1 contract is `attachMainImage(actor, id, path) → { id }` with path shape `{uuid}/{uuid}/main.{jpg|png|webp}` before write. Implementation also accepts `path: null`, skips the pattern check, and clears `main_image_path` without `Storage.delete`. That is the Phase 3 clear-and-save rule, landed early. No Phase 2 UI. Not a forbidden “NOT Doing” item.
- **Fix A ⭐ Recommended**: Keep null and note it as Phase 3 attach surface already present
  - Strength: Phase 3 island can call the Action without widening the contract again; matches the later “do not Storage.delete” rule.
  - Tradeoff: Phase 1 Action surface is slightly larger than the Phase 1 contract.
  - Confidence: HIGH — Phase 3 already specifies this behavior.
  - Blind spot: Nothing currently calls null-clear from a page.
- **Fix B**: Reject null until Phase 3
  - Strength: Keeps Phase 1 attach strictly “write a valid path.”
  - Tradeoff: Phase 3 must reopen the Action schema and use-case signature.
  - Confidence: MEDIUM — extra churn for a behavior the plan already wants.
  - Blind spot: Any test that already asserts null-clear would need reverting.
- **Decision**: FIXED via Fix A
