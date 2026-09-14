---
date: "2026-09-14T00:57:08+02:00"
researcher: Codex
git_commit: 3334a1fbfd508238d533ec53cbcd8be23be6a383
branch: main
repository: watch-bldrs
topic: "Publish a draft build"
tags: [research, codebase, builds, publication, actions, supabase, rls, storage, testing]
status: complete
last_updated: "2026-09-14"
last_updated_by: Codex
---

# Research: Publish a draft build

**Date**: 2026-09-14T00:57:08+02:00  
**Researcher**: Codex  
**Git Commit**: 3334a1fbfd508238d533ec53cbcd8be23be6a383  
**Branch**: main  
**Repository**: watch-bldrs

## Research Question

What exists for the S-03 `publish-draft-build` slice, and what must be added so an authenticated author can publish an owned draft safely while keeping the slice separate from the public catalog?

## Summary

The S-02 draft-authoring flow is implemented end to end, but publication is intentionally absent. The current React form can create, update, and attach an image to a private draft; the `builds` module has no publish use case, store method, Action, or publish UI. The schema already has the required `status`, `published_at`, and private image policies, and existing integration tests prove direct SQL publication visibility.

S-03 should remain a thin `builds` mutation slice: add an owner-scoped `publishBuild` application use case, a conditional/atomic infrastructure mutation, an `actions.builds.publish` boundary accepting only a UUID, and a distinct author-facing publish control. Do not add catalog queries, listing UI, details, likes, or an unpublish control. The publish path must derive identity from the verified session, preserve the first `published_at`, and rely on the existing private-bucket policy to make the matching image public after the row becomes published.

## Detailed Findings

### 1. Product and roadmap contract

- US-02 requires an authenticated user to create a private draft, publish it, and then have the same build eligible for public listing/details ([`context/foundation/prd.md:55-64`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/prd.md#L55-L64)).
- Drafts must not appear on home, listing, filters, or public details for other users; only the author may edit, publish, or delete ([`context/foundation/prd.md:61-64`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/prd.md#L61-L64), [`context/foundation/prd.md:168-170`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/prd.md#L168-L170)).
- Fields are optional, so the publish slice must not invent prerequisites such as a name, story, parts, or image. The existing validator deliberately accepts an empty draft ([`src/modules/builds/domain/validate-draft.ts:171-248`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/domain/validate-draft.ts#L171-L248)).
- Roadmap S-03 is explicitly “publish a draft they own so it is eligible for the public listing”; listing/browse is S-04, and the MVP UI still omits unpublish ([`context/foundation/roadmap.md:296-306`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/roadmap.md#L296-L306)).

### 2. Existing authoring flow and seams

- `/account/builds/new` renders the hydrated `BuildForm`; the edit route loads only an owned draft and returns a private 404 for missing, non-owned, or published IDs ([`src/pages/account/builds/new.astro:1-10`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/pages/account/builds/new.astro#L1-L10), [`src/pages/account/builds/[id]/edit.astro:6-23`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/pages/account/builds/%5Bid%5D/edit.astro#L6-L23)).
- `BuildForm` saves through `actions.builds.createDraft` or `.update`, then uploads and attaches a main image. Its sticky bar currently offers only Discard and Save Draft ([`src/modules/builds/presentation/build-form.tsx:67-138`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/presentation/build-form.tsx#L67-L138), [`src/modules/builds/presentation/build-form.tsx:306-389`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/presentation/build-form.tsx#L306-L389), [`src/modules/builds/presentation/build-form.tsx:696-708`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/presentation/build-form.tsx#L696-L708)).
- The grouped Action registry currently exposes only `createDraft`, `update`, and `attachMainImage`; the handler schema has no status/publish input ([`src/modules/builds/actions.ts:15-33`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/actions.ts#L15-L33), [`src/modules/builds/actions.ts:65-110`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/actions.ts#L65-L110)).
- Application code resolves an `Actor`, rejects anonymous calls, validates draft input, and delegates persistence to a `BuildStore` ([`src/modules/builds/application/create-draft-build.ts:8-23`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/application/create-draft-build.ts#L8-L23), [`src/modules/builds/application/actor.ts:1-8`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/application/actor.ts#L1-L8)).
- `BuildStore` has only `saveDraft`, `getOwnedDraft`, and `attachMainImage`; `server.ts` mirrors those methods. Publishing therefore needs a new port method, adapter implementation, server factory export, and public server entrypoint export ([`src/modules/builds/application/ports/build-store.ts:3-7`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/application/ports/build-store.ts#L3-L7), [`src/modules/builds/server.ts:17-46`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/server.ts#L17-L46)).

### 3. Database, publication, and storage behavior

- `builds` already stores `status`, optional structured attributes, `main_image_path`, and `published_at`; `build_parts` is linked with cascade delete ([`supabase/migrations/20260910201541_build_visibility_and_storage.sql:63-118`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L63-L118)).
- The trigger sets `published_at` on the first transition to `published` and preserves an existing timestamp ([`supabase/migrations/20260910201541_build_visibility_and_storage.sql:136-154`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L136-L154)).
- RLS exposes published rows to anonymous/authenticated readers and author-owned drafts to the author; the owner update policy currently allows any status value, so application code must restrict the publish command to an owned draft ([`supabase/migrations/20260910201541_build_visibility_and_storage.sql:169-193`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L169-L193)).
- The architecture intentionally allows SQL `published → draft` for a later feature, while the MVP UI must not expose it ([`context/foundation/architecture/security.md:32-51`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/architecture/security.md#L32-L51)). The new publish mutation should use a `status = 'draft'` predicate and must not become an unpublish surface.
- `save_draft_build` is an atomic build-and-parts RPC but only inserts drafts or updates rows that are still `draft`; it cannot be reused for publication ([`supabase/migrations/20260912224312_save_draft_build.sql:3-109`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/supabase/migrations/20260912224312_save_draft_build.sql#L3-L109)).
- Images live in a private `build-images` bucket. Paths are `{author_id}/{build_id}/main.ext`; published SELECT requires a matching published build/path, so publication needs no file move or copy ([`supabase/migrations/20260910201541_build_visibility_and_storage.sql:253-339`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L253-L339)). A null image path is valid under the current optional-field contract.

### 4. Test coverage and gaps

- Unit tests use a fake store with anonymous, author A, and user B fixtures and cover draft auth/ownership behavior, but there is no publish use-case test ([`src/modules/builds/application/use-cases.test.ts:14-82`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/application/use-cases.test.ts#L14-L82), [`src/modules/builds/application/use-cases.test.ts:86-206`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/application/use-cases.test.ts#L86-L206)).
- Existing integration tests publish by calling `.from("builds").update({ status: "published" })` directly, then verify anonymous/B visibility and non-author mutation denial ([`tests/integration/build-visibility.test.ts:135-163`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/tests/integration/build-visibility.test.ts#L135-L163)). They do not test the new Action/application boundary.
- The same suite proves SQL unpublish re-hides rows and parts while retaining `published_at`, and verifies timestamp stability after client nulling and a second publish ([`tests/integration/build-visibility.test.ts:165-228`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/tests/integration/build-visibility.test.ts#L165-L228)).
- `save_draft_build` integration coverage proves a published row cannot be edited through the draft RPC and that its name, parts, status, and timestamp remain unchanged ([`tests/integration/save-draft-build.test.ts:149-205`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/tests/integration/save-draft-build.test.ts#L149-L205)).
- Storage tests already cover published-image access and revocation after unpublish ([`tests/integration/build-image-storage.test.ts:167-205`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/tests/integration/build-image-storage.test.ts#L167-L205)). There is no E2E harness yet; the documented proving flow still expects create → privacy check → publish → catalog ([`context/foundation/architecture/testing.md:41-52`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/architecture/testing.md#L41-L52)).

## Code References

- `src/modules/builds/application/ports/build-store.ts:3-7` — persistence boundary that needs a publication method.
- `src/modules/builds/infrastructure/supabase-build-store.ts:117-201` — draft RPC/select/attach adapter; no publish mutation exists.
- `src/modules/builds/actions.ts:46-63` — safe mapping for validation, auth, not-found, and unexpected errors.
- `src/modules/builds/presentation/build-form.tsx:696-708` — current sticky action bar with no publish control.
- `supabase/migrations/20260910201541_build_visibility_and_storage.sql:136-154` — `published_at` trigger.
- `supabase/migrations/20260912224312_save_draft_build.sql:61-84` — draft-only update guard.
- `tests/integration/helpers/supabase-identities.ts:87-143` — unique three-identity setup and service-role cleanup.

## Architecture Insights

- Keep publication inside the `builds` module. `catalog` owns only public read models, so S-03 should stop at making a row eligible for those reads ([`context/foundation/architecture/modules.md:13-35`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/architecture/modules.md#L13-L35)).
- Follow the existing Action pipeline: validate the UUID, resolve the actor from the verified session, run the use case, and map expected failures to a safe result. Never accept `authorId`, status, or role from the browser ([`context/foundation/architecture/security.md:70-88`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/architecture/security.md#L70-L88)).
- Use one conditional database mutation (or an invoker RPC) constrained by `id`, `author_id = auth.uid()`, and `status = 'draft'`. This makes the transition race-safe and avoids relying on a read-then-write check. Preserve the existing trigger for `published_at`.
- Publishing must be idempotent under retries: a repeated request must not reset `published_at`, duplicate side effects, or expose inconsistent state ([`context/foundation/OPERATIONAL_SAFETY.md:43-62`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/OPERATIONAL_SAFETY.md#L43-L62)). Whether an already-published row returns a safe success or an expected domain error is a planning decision; either contract must be a no-op.
- Since Storage publication is derived from the parent row’s status and exact path, do not rewrite the image path or generate/persist a signed URL during publish.

## Historical Context (from prior changes)

- [`context/archive/2026-09-13-create-draft-build/plan-brief.md:30-35`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/archive/2026-09-13-create-draft-build/plan-brief.md#L30-L35) deliberately excluded publish/unpublish UI, catalog, and account-list work from S-02.
- [`context/archive/2026-09-13-create-draft-build/plan.md:102-106`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/archive/2026-09-13-create-draft-build/plan.md#L102-L106) records the existing Action contract and explicitly says no publish Action exists in that slice.
- [`context/changes/show-public-builds/research.md:125-131`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/changes/show-public-builds/research.md#L125-L131) identifies S-03 publishing as a prerequisite for catalog work and confirms the current code has no publish Action.
- [`context/archive/2026-09-09-build-visibility-and-storage/research.md:131-149`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/archive/2026-09-09-build-visibility-and-storage/research.md#L131-L149) establishes private Storage, stable object paths, and publication-checked image access as the persistence contract.
- The lessons register has no publication-specific rule; its relevant existing warning is to preserve safe accessible UI patterns when adding links or controls ([`context/foundation/lessons.md`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/lessons.md)).

## Related Research

- [`context/changes/show-public-builds/research.md`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/changes/show-public-builds/research.md) — public catalog prerequisite and published-only query contract.
- [`context/archive/2026-09-09-build-visibility-and-storage/research.md`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/archive/2026-09-09-build-visibility-and-storage/research.md) — schema, RLS, and private image foundation.

## Open Questions

1. Should the publish mutation be a direct conditional `UPDATE` in the adapter or a dedicated `security invoker` RPC? The current draft save uses an RPC for build/parts atomicity; publish changes one row and can likely use a single conditional update.
2. On an already-published ID, should the Action return a safe idempotent success or an expected `AlreadyPublishedError`? Both preserve timestamp and side-effect safety; the choice affects UI messaging and tests.
3. Should the current editor navigate or replace its state after publish, or should it remain on the editor with a “Published” status? The existing edit route intentionally loads drafts only, so a refresh after publish will return 404 unless the route/account composition is expanded in this slice.
4. Does S-03 include a minimal publish control in `BuildForm`, or a separate account/details control? Roadmap scope requires an author action but leaves the exact presentation seam open; catalog/details/account-list surfaces are later slices.
5. The repository has no E2E harness. Confirm whether S-03’s merge gate is unit + local Supabase integration coverage only, with the full proving E2E deferred until catalog/details routes exist.
