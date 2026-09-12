<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Photo Upload Component Implementation Plan

- **Plan**: context/changes/photo-upload-component/plan.md
- **Scope**: Phase 2 of 2
- **Date**: 2026-09-12
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Grounding

Phase 2 commit `beaa11e`. Planned files present: `astro.config.mjs`, `.env.example`, `README.md`, `AGENTS.md`, `supabase-browser.ts` + test, `upload-main-image.ts` + test, `deployment.md`. Out of scope absent: `src/modules/builds`, Actions, `/dev`, draft insert, `main_image_path` writes, new migrations/RLS, Worker byte proxy. `PhotoUpload` still imports only `validateMainImageFile` (no `astro:env`, no Storage).

Automated (this review): `npm run lint` pass; `npm run test` 45 passed / 10 files; `npm run build` pass. Manual 2.11–2.12 evidenced in `deployment.md` and `AGENTS.md`. Manual 2.13 evidenced by Storybook isolation (stories/well/validator do not import `astro:env`). Manual 2.14 optional integration run was not re-executed here.

Uncommitted working-tree edits (`photo-upload.tsx`, `main-image-file.ts` + tests) are Phase 1 impl-review triage, not extra Phase 2 product scope. The path-segment guard from Phase 1 F2 lives only in that working tree, not in `beaa11e`.

## Findings

### F1 — Thrown Storage `remove` can discard the new path

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/upload-main-image.ts:46-48
- **Detail**: Plan required that a failed previous-key `remove` must not discard the new `{ path }`, with a log-safe message and no tokens. `{ error }` from a resolved `remove` is ignored and the test at `upload-main-image.test.ts:128-142` still gets `{ path }`. There is no `try/catch`: if `remove()` throws (network/SDK), the successful upload's path never reaches the caller. The same gap applies to `upload()` throws vs `{ error }` — only `{ error }` maps to `MainImageUploadError("storage")`. `src/` has no `console.*` today, so the log-safe message was also skipped.
- **Fix A ⭐ Recommended**: Wrap `remove` in try/catch; on throw or `{ error }`, still `return { path }`. Map thrown `upload` failures to `MainImageUploadError("storage")`. Skip a new logger — this repo has none.
  - Strength: Matches the replace-order contract already tested for `{ error }`; keeps the new object even if cleanup throws.
  - Tradeoff: Delete failures stay silent (no log-safe message from the plan).
  - Confidence: HIGH — supabase-js usually returns `{ error }`, but a throw is the only remaining way to lose the path.
  - Blind spot: Whether hosted `@supabase/storage-js` ever throws instead of returning `{ error }`.
- **Fix B**: try/catch plus a static `console.warn("Failed to remove previous main image")` (no path, no tokens).
  - Strength: Honors the plan's log-safe message.
  - Tradeoff: Introduces the first `console.*` in `src/`.
  - Confidence: MEDIUM — useful in the browser island later; noisy if called from tests without a mock.
  - Blind spot: No project logger/correlation-id convention to plug into.
- **Decision**: FIXED via Fix A

### F2 — Path-segment rejection is not in the Phase 2 commit

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/main-image-file.ts:81-83 (HEAD); working tree :81-91
- **Detail**: Phase 1 F2 asked Phase 2 (first caller of `buildMainImagePath`) to reject `authorId`/`buildId` containing `/`, `\\`, or `..` before `storage.upload`. Commit `beaa11e` still interpolates `${authorId}/${buildId}/main.${ext}` with no check. The working tree already has `assertStoragePathSegment` (empty / `.` / `..` / `/` / `\\`) from Phase 1 triage, but it is uncommitted. Storage RLS still binds folder `[1]` to `auth.uid()` and `[2]` to an owned `builds.id`, so this is not a cross-author overwrite.
- **Fix**: Commit the working-tree `assertStoragePathSegment` as part of this slice (it is the first caller). Keep the invariant throw in `buildMainImagePath`.
- **Decision**: FIXED (working-tree `assertStoragePathSegment` kept; not committed in this review)

### F3 — Path-segment throw is a generic `Error`, not `MainImageUploadError`

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/main-image-file.ts:87-90 (working tree); src/lib/upload-main-image.ts:35
- **Detail**: If F2's guard lands as-is, slash/`..` fails with `Error("Invalid main image path segment")`. S-02 catching only `MainImageUploadError` would treat it as unexpected. `uploadMainImage` does not wrap that throw.
- **Fix**: Keep the invariant throw in `buildMainImagePath`; in `uploadMainImage`, catch it and rethrow `MainImageUploadError("validation")`.
- **Decision**: FIXED
