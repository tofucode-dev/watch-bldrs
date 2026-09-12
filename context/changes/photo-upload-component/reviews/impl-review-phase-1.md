<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Photo Upload Component Implementation Plan

- **Plan**: context/changes/photo-upload-component/plan.md
- **Scope**: Phase 1 of 2
- **Date**: 2026-09-12
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 2 observations

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

Phase 1 commit `e0cba8a`. Planned files all present (`main-image-file.ts`, `photo-upload.tsx` + stories/tests). Out of scope absent: `src/modules/builds`, Actions, `/dev`, `supabase-browser.ts`, `upload-main-image.ts`, `PUBLIC_SUPABASE_*` env. Automated: `npm run lint`, `npm run test` (34 passed), `npm run build` all passed in-session. Manual 1.12–1.15 checked after human confirmation; look gaps listed in `change.md`.

## Findings

### F1 — Preview object URL created in useMemo, revoked in an effect

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/ui/photo-upload.tsx:32-38
- **Detail**: `MainPhotoPreview` creates the blob URL in `useMemo` during render and revokes it in `useEffect` cleanup. That split was chosen to satisfy `react-hooks/set-state-in-effect` (the plan's "state + effect" pattern failed lint). Strict Mode remount or an aborted render can revoke a URL the `<img>` still uses, or leak a blob that never got an effect. Tests only assert revoke on unmount (`photo-upload.test.tsx` unmount case), not on file change.
- **Fix A ⭐ Recommended**: Create and revoke inside one `useEffect` keyed on `file`, storing the URL in state, and suppress `react-hooks/set-state-in-effect` on that effect with a one-line comment that blob URLs are an external resource. Add a test that swapping `file` revokes the previous blob.
  - Strength: Matches the plan's revoke-on-change/clear/unmount contract; one ownership site for the URL lifecycle.
  - Tradeoff: Reintroduces setState-in-effect, needs an eslint exception the rest of the kit does not use.
  - Confidence: HIGH — this is the documented React pattern for object URLs; lint was the only reason it was split.
  - Blind spot: Whether Storybook's Strict Mode actually breaks the Selected preview today.
- **Fix B**: Keep useMemo + effect cleanup; add a change/clear revoke test and a Strict Mode render in jsdom.
  - Strength: No lint exception; current tests already pass.
  - Tradeoff: Lifecycle still split across render and effect; Strict Mode flicker/leak remains possible.
  - Confidence: MEDIUM — jsdom may not reproduce the production Strict Mode path.
  - Blind spot: React 19 compiler discarding the useMemo.
- **Decision**: FIXED via Fix A

### F2 — `buildMainImagePath` does not reject `/` or `..` in ids

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/main-image-file.ts:81-83
- **Detail**: Path is `${authorId}/${buildId}/main.${ext}` with no check for `/`, `\\`, or `..`. PhotoUpload does not call this helper. Storage RLS still binds folder `[1]` to `auth.uid()` and `[2]` to an owned `builds.id`, so a crafted string cannot write another author's object. Phase 2 `uploadMainImage` is the first caller.
- **Fix**: In Phase 2, reject `authorId`/`buildId` that contain `/` or `\\` (or require UUID shape) before `storage.upload`.
- **Decision**: FIXED (reject `/`, `\\`, `.`, `..`, and empty segments in `buildMainImagePath` now)

### F3 — Overlapping validation has no generation token

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/ui/photo-upload.tsx:53-62
- **Detail**: `applyCandidate` is async with no in-flight generation. A slower earlier pick could finish after a later one and overwrite the well (error vs file). Header-only reads make this unlikely in practice.
- **Fix**: Increment a ref at the start of `applyCandidate` and ignore stale completions.
- **Decision**: FIXED
