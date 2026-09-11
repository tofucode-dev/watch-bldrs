<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Build Visibility and Private Main-Image Storage

- **Plan**: context/changes/build-visibility-and-storage/plan.md
- **Scope**: Phases 1–3 of 3
- **Date**: 2026-09-10
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 3 warnings 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Storage ownership helper is SECURITY DEFINER without justification

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260910201541_build_visibility_and_storage.sql:259
- **Detail**: `public.storage_build_image_owned_by_actor` is `SECURITY DEFINER` with empty `search_path` and schema-qualified names, but the migration has no justification. OPERATIONAL_SAFETY §2 requires an explicit reason for every definer function and prefers invoker. The body only `EXISTS`-checks `public.builds` with `b.author_id = auth.uid()`, which the actor can already SELECT under `builds_select`. `GRANT EXECUTE … TO authenticated` also publishes it as PostgREST RPC (`database.types.ts` Functions). Boolean-only, so this is not a row leak today.
- **Fix A ⭐ Recommended**: Inline the `EXISTS` in the three storage write policies (invoker), or change the function to `SECURITY INVOKER` and drop the authenticated EXECUTE grant if policies do not need an RPC.
  - Strength: Matches OPERATIONAL_SAFETY §2; removes privileged surface and the accidental RPC.
  - Tradeoff: If Storage evaluates policies in a role that cannot SELECT `public.builds`, write uploads could fail until grants are adjusted.
  - Confidence: MEDIUM — invoker should work because authenticated already has SELECT on own builds; Storage’s execution role is not proven in this review.
  - Blind spot: Did not re-run the storage matrix after converting to invoker.
- **Fix B**: Keep DEFINER, add a one-line migration justification, and `REVOKE EXECUTE` from `authenticated` (grant only the role that evaluates `storage.objects` policies).
  - Strength: Preserves a common Supabase Storage lookup pattern if invoker cannot see `public.builds`.
  - Tradeoff: Privileged function remains; must stay boolean-only and search_path-safe.
  - Confidence: MEDIUM — current tests pass with DEFINER; we have not shown DEFINER is required.
  - Blind spot: Exact Storage policy execution role on local Supabase is unverified.
- **Decision**: FIXED via Fix A

### F2 — Published image SELECT trusts main_image_path, not the corresponding build

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260910201541_build_visibility_and_storage.sql:314
- **Detail**: Plan-flaw, implemented as specified. `build_images_select_published` allows SELECT when any published row has `main_image_path = storage.objects.name`. It does not require `(foldername)[1] = b.author_id` or `(foldername)[2] = b.id`. An author can point a published build at another object key (easy same-author: publish P with D’s draft path; D stays draft while D’s bytes become world-readable). Cross-user theft needs a victim path UUID (not listable by anon). This contradicts OPERATIONAL_SAFETY §10 (“expose a published image only after the corresponding build is verifiably published”). INSERT/UPDATE/DELETE correctly bind folder[2] to an owned `builds.id`.
- **Fix A ⭐ Recommended**: In `build_images_select_published`, also require `(storage.foldername(name))[1] = b.author_id::text` and `(storage.foldername(name))[2]::uuid = b.id`. Optionally add a `builds.main_image_path` CHECK that the path is `{author_id}/{id}/…`.
  - Strength: Enforces “corresponding build” without changing the private-bucket / signed-URL model; S-02 still stores a path, not a URL.
  - Tradeoff: Diverges from the written Phase 1 SELECT contract; needs a new forward migration if this one may already have been applied locally, plus a matrix test for the pointer case.
  - Confidence: HIGH — policy is localized; OPERATIONAL_SAFETY §10 is explicit.
  - Blind spot: Hosted `db push` has not been applied (empty hosted product schema).
- **Fix B**: Keep the plan contract; document the residual same-author pointer risk for S-02 to validate `main_image_path` on publish.
  - Strength: No schema change in F-01; S-02 already owns the upload/publish pipeline.
  - Tradeoff: Draft privacy then depends on application checks, which RLS is supposed to enforce even without UI.
  - Confidence: MEDIUM — matches the plan text, conflicts with the draft-privacy invariant.
  - Blind spot: S-02 might forget the check; any author with a published row can still unlock a known object key.
- **Decision**: FIXED via Fix A

### F3 — Identity-matrix tests omit author A DELETE and user B list()

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: tests/integration/build-visibility.test.ts:68; tests/integration/build-image-storage.test.ts:87
- **Detail**: Phase 3 said cover at least “B cannot UPDATE/DELETE A’s draft; A can” and “Anon and B cannot list() A’s prefix or the whole bucket”. `build-visibility.test.ts` asserts B update/delete return 0 rows and A can UPDATE; A DELETE is never asserted (`afterAll` uses service-role `cleanupBuild`). `build-image-storage.test.ts` asserts anon `list(authorA.id)` and anon `list("")` while draft; user B never calls `list()`. Policies for both cases exist in the migration.
- **Fix**: Add A DELETE (then re-insert or use a dedicated row) in the visibility test, and assert B `list()` on A’s prefix and `""` in the storage test.
- **Decision**: FIXED

### F4 — published_at “set once” is only partial and untested

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260910201541_build_visibility_and_storage.sql:146
- **Detail**: The first-publish trigger sets `published_at` when `status` becomes `published` and the column is null, and unpublish does not clear it — matching the plan for a status change. The trigger is `BEFORE INSERT OR UPDATE OF status`, so `UPDATE builds SET published_at = NULL` (status unchanged) can clear it. Authors have full-column UPDATE. Integration tests never select `published_at`.
- **Fix**: Extend the trigger to `UPDATE OF status, published_at` (if publishing, keep existing timestamp or set if null; never accept client nulling), and assert first publish / unpublish / second publish in the matrix.
- **Decision**: FIXED

### F5 — Unplanned eslint ignore for generated types

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: eslint.config.js:79
- **Detail**: `{ ignores: ["src/lib/database.types.ts"] }` is not in the plan. It is supporting work so `npm run lint` (Phase 2 success criterion) does not fail on generated types. Not product scope.
- **Fix**: Keep the ignore; optionally add a one-line comment that generated Database types are lint-excluded.
- **Decision**: ACCEPTED-AS-RULE: Exclude generated Database types from ESLint
