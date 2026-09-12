<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Photo Upload Component Implementation Plan

- **Plan**: context/changes/photo-upload-component/plan.md
- **Scope**: All phases (1–2 of 2)
- **Date**: 2026-09-12
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Grounding

Full sweep of the current working tree after Phase 1 review (`impl-review-phase-1.md`, all FIXED) and Phase 2 review (`impl-review-phase-2.md`, all FIXED). Commits: `e0cba8a` (p1), `beaa11e` (p2), `280573d` (epilogue). Review-triage code (object-URL effect, generation token, path-segment guard, upload/remove try/catch, `MainImageUploadError` wrap) is present in the working tree and was re-verified; it is **not** in git HEAD.

Planned files all MATCH. Out of scope absent: `src/modules/builds`, Actions, `/dev`, draft insert, `main_image_path` writes, new migrations/RLS, Worker byte proxy, signed URLs, `react-hook-form`. `PhotoUpload` still does not import Storage, `supabase-browser`, or `astro:env`.

Automated (this review): `npm run lint` pass; `npm run test` 48 passed / 10 files; `npm run build` pass. Manual Progress rows 1.12–1.15 and 2.11–2.13 have code/doc evidence from earlier human confirmation. Optional 2.14 integration run was not re-executed.

P2 F1 Fix A (silent delete failure, no `console.*`) is still in force — not re-opened.

## Findings

### F1 — Review-triage fixes are still uncommitted

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: working tree vs HEAD `280573d` (`src/lib/main-image-file.ts`, `src/lib/upload-main-image.ts`, `src/components/ui/photo-upload.tsx` and tests)
- **Detail**: HEAD still interpolates `${authorId}/${buildId}/main.${ext}` with no segment check, still splits object-URL create/revoke, and still lets a thrown `remove()` discard the new path. The working tree has `assertStoragePathSegment`, the typed `MainImageUploadError("validation")` wrap, object-URL `useEffect` ownership, the generation token, and upload/remove try/catch. A merge or reset of HEAD-only would ship the first Storage caller without those guards. RLS still prevents cross-author overwrite.
- **Fix**: Commit the working-tree review-triage files (helpers, PhotoUpload, tests, and the two `reviews/impl-review-phase-*.md` reports) before merge. Do not revert them to HEAD.
- **Decision**: PENDING

### F2 — GitHub `PUBLIC_*` secrets are documented as enough; CI never interpolates them

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: README.md:207; .github/workflows/ci.yml:23-25 and :45-47
- **Detail**: The plan kept CI unchanged this slice (fields optional; `createBrowserSupabaseClient()` returns `null` if missing). README tells operators that setting GitHub Actions secrets `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY` enables production browser uploads. Those secrets never reach `astro build` unless the workflow `env` block lists them. Fail-closed is safe; the documented enablement path is not. `deployment.md` first-time step 7 still lists only `SUPABASE_*` for GHA.
- **Fix A ⭐ Recommended**: Before S-02, add `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY` to both `npm run build` `env` blocks from `${{ secrets.PUBLIC_SUPABASE_* }}` (same anon pair).
  - Strength: Makes the README sentence true; production islands can get a non-null browser client.
  - Tradeoff: This slice’s plan said not to change CI secrets.
  - Confidence: HIGH — `astro:env` public fields are inlined at build; unused secrets do nothing.
  - Blind spot: Whether production GitHub already has those secret names.
- **Fix B**: Soften README / `deployment.md` to say setting the GitHub secret is not enough until the workflow passes them into `astro build`; leave `ci.yml` for S-02.
  - Strength: Honors “do not change CI in this slice.”
  - Tradeoff: Easy to miss when S-02 wires the island.
  - Confidence: HIGH — matches the written Phase 2 contract.
  - Blind spot: S-02 authors may copy the README and assume secrets-only is sufficient.
- **Decision**: PENDING
