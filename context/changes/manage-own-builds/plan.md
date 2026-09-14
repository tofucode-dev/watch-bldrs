# Manage Own Builds Implementation Plan

## Overview

Replace the `/dashboard` stub with an authenticated author's build list showing drafts and published builds. Add `listOwnedBuilds` and `deleteBuild` to the `builds` module, migrate authoring routes to `/dashboard/builds/*`, enable editing published builds through the existing form (relaxing draft-only store/RPC filters), and wire dashboard card CTAs (Edit on all cards; View on published only). Delete lives in the edit form sticky action bar with confirmation and Storage cleanup.

This slice reuses S-04's `BuildCard`, `BuildGrid`, and keyset pagination pattern. It does not add publish-on-card, public details, likes, filters, or unpublish UI.

## Current State Analysis

The repository has working draft create/edit/publish at `/account/builds/*`, a protected `/dashboard` stub with a publish-success banner, RLS that lets authors read all own rows and delete own builds, and catalog listing components with keyset pagination. It has no owned-build list query, no delete use case or Action, no dashboard grid, and no route consolidation under `/dashboard`.

`getOwnedDraft` and `save_draft_build` filter `status = 'draft'`, so published builds 404 on the edit page and cannot be saved even though the form UI is the same. `attachMainImage` is also draft-only. Storage objects are not removed on build delete (deferred from F-01/S-02).

The Topbar nav item is labeled "Account" and `isDashboard` matches only the exact `/dashboard` path.

## Desired End State

An authenticated author opening `/dashboard` sees their drafts and published builds in a responsive grid (up to twelve per page) with keyset Previous/Next navigation on `updated_at desc, id desc`. Each card shows a Draft or Published status label, hides the like count, and has footer CTAs: Edit only for drafts; Edit and View for published (View links to `/builds/{id}`). A "+ New build" button routes to `/dashboard/builds/new`.

The edit page at `/dashboard/builds/edit/{id}` loads draft and published builds, saves changes for both, shows Publish only for drafts, and includes a Remove control in the sticky action bar that confirms then deletes the build (Storage object first, then row, idempotent). After delete, redirect to `/dashboard`.

`/account/builds/*` pages are removed. Topbar shows "Dashboard" and highlights for any `/dashboard` subroute. Account pages use `Cache-Control: private, no-store`. Integration tests cover list isolation and delete authorization for anonymous, author A, and user B.

### Key Discoveries:

- `BuildStore` has no list or delete methods (`src/modules/builds/application/ports/build-store.ts:3-8`).
- `save_draft_build` UPDATE requires `status = 'draft'` (`supabase/migrations/20260912224312_save_draft_build.sql:72-74`).
- `getOwnedDraft` store query filters draft-only (`src/modules/builds/infrastructure/supabase-build-store.ts:152`).
- `BuildCard.footerAction` is outside the detail link — correct pattern for dashboard CTAs (`src/components/ui/build-card.tsx:172-177`).
- Catalog keyset pagination is reusable with a different sort key (`src/modules/catalog/server.ts:28-33`).
- RLS `builds_delete` allows author delete at any status; Storage cleanup is app responsibility (`OPERATIONAL_SAFETY.md` §4, §10).
- Lessons: prefer keyset cursors; omit card `href` to avoid duplicate/unnamed links (`context/foundation/lessons.md`).

## What We're NOT Doing

- Publish CTA on dashboard cards (publish stays in the editor sticky bar).
- Public build details page or fixing View 404 (S-06).
- Likes, filters, search, or sorting controls on the dashboard.
- Unpublish/republish UI.
- Delete from the public details page (S-06; no details page exists).
- Redirects from removed `/account/builds/*` paths.
- Subtitle, story blurb, or author handle on cards.
- New `account` module or catalog queries for owned builds.
- Playwright E2E harness.
- Full S-09 slice documentation — published edit is absorbed here per planning decision; S-09 may shrink to details-entry edit only.

## Implementation Approach

Build backend list/delete first, then unblock published edit and migrate routes, then compose the dashboard UI. Mirror the catalog module's cursor + page resolver pattern inside `builds` rather than importing catalog infrastructure. Extend `BuildCard` minimally (`statusLabel`, `showLikeCount`) instead of forking a second card kit.

Expose list resolution from `@/modules/builds/server`. Wire delete through an Astro Action. Keep pages as thin Astro adapters.

## Critical Implementation Details

### State sequencing

Delete must attempt Storage `remove` for `main_image_path` before deleting the build row (RLS `build_images_delete` requires a parent row). If Storage remove fails, still attempt row delete and log internally — do not expose raw errors. If the row is already gone, return success (idempotent per `OPERATIONAL_SAFETY.md` §4).

### User experience spec

Dashboard cards have no whole-card link — only explicit footer buttons. View on published cards links to `/builds/{id}` even though S-06 details do not exist yet (404 is accepted). Draft cards show Edit only. Published edit hides the Publish button and relabels "Save Draft" to "Save" or "Save changes". Delete confirmation uses the same inline confirmation pattern as publish in `build-form.tsx`, not `window.confirm`.

## Phase 1: Owned Builds List and Delete Backend

### Overview

Add the owned-build read model, keyset cursor contract, `listOwnedBuilds` and `deleteBuild` use cases, Supabase store methods, server resolver, delete Action, and integration tests.

### Changes Required:

#### 1. Owned build types and cursor contract

**Files**: `src/modules/builds/application/owned-build-types.ts`, `src/modules/builds/application/owned-build-cursor.ts`, `src/modules/builds/application/owned-build-cursor.test.ts`

**Intent**: Define the dashboard card read model and a Worker-compatible cursor parser independent of catalog code.

**Contract**: `OwnedBuildCard` includes `id`, `name`, `status` (`draft` | `published`), `mainImageUrl`, watch attribute fields, and `updatedAt`. `OwnedBuildsPage` has `items`, `previousCursor`, `nextCursor`. Cursor payload is `{ updatedAt, id }` with the same encode/decode rigor as catalog cursors. Page size is `12`. Parsing rejects malformed cursors and simultaneous `before` + `after`.

#### 2. List and delete use cases

**Files**: `src/modules/builds/application/list-owned-builds.ts`, `src/modules/builds/application/delete-build.ts`, `src/modules/builds/application/list-owned-builds.test.ts`, `src/modules/builds/application/delete-build.test.ts`

**Intent**: Orchestrate owned-list paging and idempotent delete without Astro or Supabase types in the use case layer.

**Contract**: `listOwnedBuilds(actor, input, store)` requires authenticated actor; returns empty page for zero rows. `deleteBuild(actor, id, store)` requires authenticated actor; succeeds (void) when the row is already absent or not owned — never throws not-found. Unit tests cover cursor derivation, empty/paginated-empty, and delete idempotency for missing ids.

#### 3. BuildStore port extensions

**Files**: `src/modules/builds/application/ports/build-store.ts`, `src/modules/builds/application/use-cases.test.ts`

**Intent**: Extend the port with list and delete operations.

**Contract**: Add `listOwnedBuilds(authorId, input)` returning page items + `hasMore` in query direction, and `deleteBuild(authorId, id)` returning void. Existing methods unchanged. `FakeBuildStore` (`implements BuildStore`) must gain both methods in this phase or `npm run lint` fails; keep get/save/attach draft-only until Phase 2.

#### 4. Supabase store implementation

**Files**: `src/modules/builds/infrastructure/supabase-build-store.ts`, `src/modules/builds/infrastructure/supabase-build-store.test.ts` (extend), `src/modules/builds/infrastructure/delete-build-image.ts` (new helper)

**Intent**: Query author's builds with keyset boundaries, sign images by status, and delete with Storage cleanup.

**Contract**: List selects `author_id = auth.uid()` rows without status filter; orders `updated_at desc, id desc`; fetches `limit + 1`; maps to `OwnedBuildCard`. Draft images use existing author preview signer; published use catalog's public signer pattern (import via builds infrastructure helper, not deep catalog import). Delete reads `main_image_path`, calls `storage.from('build-images').remove([path])` best-effort, then `.delete().eq('id', id).eq('author_id', authorId)`. Map errors to domain errors without raw Supabase text.

#### 5. Delete Action and server resolver

**Files**: `src/modules/builds/actions.ts`, `src/modules/builds/server.ts`

**Intent**: Expose delete to the edit form and a `resolveOwnedBuildsListing` helper for the dashboard page.

**Contract**: `builds.delete` validates UUID `id`, resolves actor, calls `deleteBuild`. Authenticated delete always returns ok — including when the row is already gone or was never owned (0-row delete). Do not throw `DraftNotFoundError` or map delete to `ActionError` `NOT_FOUND`; map only `UnauthenticatedError` and unexpected failures. `resolveOwnedBuildsListing(request, cookies, user)` returns a discriminated state: `success` with items + pagination URLs, `empty`, `paginated-empty`, `invalid-cursor`, `unavailable`, `unauthenticated`. Pagination URLs use `/dashboard?before=` / `/dashboard?after=`.

#### 6. Integration tests

**Files**: `tests/integration/owned-builds-list.test.ts`, `tests/integration/build-delete.test.ts` (or extend `build-visibility.test.ts`)

**Intent**: Prove RLS matrix for list and delete at the database boundary.

**Contract**: Author A sees own draft + published; user B and anonymous see zero rows in list query. Author A deletes own build; user B delete affects zero rows. List never returns another user's build.

### Success Criteria:

#### Automated Verification:

- Owned-build cursor and use-case unit tests pass: `npm test -- src/modules/builds/application/owned-build-cursor.test.ts src/modules/builds/application/list-owned-builds.test.ts src/modules/builds/application/delete-build.test.ts`
- Store unit tests cover list boundaries and delete Storage ordering: `npm test -- src/modules/builds/infrastructure`
- Integration tests pass: `npm run test:integration`
- Lint passes: `npm run lint`

#### Manual Verification:

- None for this phase — backend only.

**Implementation Note**: Pause for manual confirmation only if integration tests fail unexpectedly against local Supabase.

---

## Phase 2: Published Edit Enablement and Route Migration

### Overview

Allow the existing form to load and save published builds, move authoring pages to `/dashboard/builds/*`, remove `/account/builds/*`, add delete UI on the edit form, and update hardcoded URLs.

### Changes Required:

#### 1. Database migration for published saves

**File**: `supabase/migrations/YYYYMMDDHHmmss_save_owned_build.sql`, `tests/integration/save-draft-build.test.ts`

**Intent**: Let the existing RPC update published rows owned by the author.

**Contract**: Change `save_draft_build` UPDATE `WHERE` clause from `status = 'draft'` to `status IN ('draft', 'published')`. Do not change INSERT (still creates drafts). Regenerate types: `npm run db:types`. Invert `tests/integration/save-draft-build.test.ts` `"does not update a published row via save_draft_build"` so it proves the author can update a published row's name (and that status/`published_at` stay unchanged). Do not leave both the old and new assertions in the suite.

#### 2. Load and save published builds in store

**Files**: `src/modules/builds/infrastructure/supabase-build-store.ts`, `src/modules/builds/domain/types.ts`, `src/modules/builds/index.ts`, `src/modules/builds/application/use-cases.test.ts`, `src/modules/builds/presentation/build-form-types.ts`, `src/modules/builds/presentation/build-form-types.test.ts`

**Intent**: Return `status` on `OwnedDraft` (or rename to `OwnedBuild` in types while keeping export aliases) and remove draft-only filters from read, attach, and save paths.

**Contract**: `getOwnedDraft` query drops `.eq('status', 'draft')` and selects `status`. `attachMainImage` allows published rows. Mapper includes `status` in the returned object. Add `status: 'draft' | 'published'` to `OwnedDraft` and `BuildFormInitialDraft`; `ownedDraftToFormInitial` copies it through. In `FakeBuildStore`, drop `status === 'draft'` gates on `saveDraft` / `getOwnedDraft` / `attachMainImage`. Replace `"treats a published id as not found"` in `use-cases.test.ts` with published get/save/attach success (still not-found for another author's id). Keep the server export name `getOwnedDraftForForm` (loads draft and published).

#### 3. BuildForm published mode and delete UI

**Files**: `src/modules/builds/presentation/build-form.tsx`, `src/modules/builds/presentation/build-form.test.tsx`

**Intent**: Adapt editor UX for published builds and add Remove with confirmation in the sticky action bar.

**Contract**: When `initialDraft.status === 'published'`: hide Publish button; change save label from "Save Draft" to "Save changes"; keep photo upload path working. Rewrite the publish confirmation copy — it currently says "Editing and unpublishing are unavailable in this MVP" (`build-form.tsx` `statusMessage`); drop the editing claim (unpublish UI remains out of scope). Add Remove button (destructive outline) that enters confirmation state (mirror publish confirmation pattern; mutually exclusive with publish confirming). On confirm, call `actions.builds.delete({ id })` then `window.location.assign('/dashboard')`. Update post-publish `history.replaceState` URLs to `/dashboard/builds/edit/{id}`. Post-publish redirect target remains `/dashboard?published=1`.

#### 4. Route migration

**Files**: Move `src/pages/account/builds/new.astro` → `src/pages/dashboard/builds/new.astro`; move `src/pages/account/builds/[id]/edit.astro` → `src/pages/dashboard/builds/edit/[id].astro`; delete old `src/pages/account/` tree; update `src/middleware.ts` to drop `/account` from `PROTECTED_ROUTES` if no pages remain

**Intent**: Consolidate authoring under `/dashboard` per change notes.

**Contract**: New and edit pages keep `Cache-Control: private, no-store`. Edit page calls `getOwnedDraftForForm` (now loads published). No redirect pages at old paths.

#### 5. URL reference updates

**Files**: `src/pages/dashboard.astro` (interim New build link until Phase 3), `src/modules/builds/presentation/build-form.tsx`, `src/modules/builds/presentation/build-form.test.tsx`, `src/lib/safe-redirect.test.ts`, `context/foundation/architecture/runtime.md`

**Intent**: Align all hardcoded paths with `/dashboard/builds/*`.

**Contract**: Every `/account/builds` reference becomes `/dashboard/builds`. Runtime route map documents `/dashboard`, `/dashboard/builds/new`, `/dashboard/builds/edit/[id]`.

### Success Criteria:

#### Automated Verification:

- Migration applies locally: `npx supabase db reset` (or `db push` against local)
- Types committed after `npm run db:types`
- Build form tests cover published mode (no Publish, save label) and delete flow: `npm test -- src/modules/builds/presentation/build-form.test.tsx`
- Use-case tests cover published get/save: `npm test -- src/modules/builds/application/use-cases.test.ts`
- Integration test for published update passes: `npm run test:integration`
- Lint passes: `npm run lint`

#### Manual Verification:

- Author can open a published build at `/dashboard/builds/edit/{id}`, change a field, save, and see changes persist on refresh.
- Remove on edit page deletes the build and returns to dashboard.

---

## Phase 3: Dashboard Listing UI and Navigation

### Overview

Replace the dashboard stub with the owned-builds grid, extend `BuildCard` for status and hidden likes, compose `OwnedBuildsListing`, and update Topbar.

### Changes Required:

#### 1. BuildCard extensions

**Files**: `src/components/ui/build-card.tsx`, `src/components/ui/build-card.test.tsx`, `src/components/ui/build-card.stories.tsx`

**Intent**: Support dashboard status label and optional like-count hiding without subtitle/story/author fields.

**Contract**: Add optional `statusLabel?: 'Draft' | 'Published' | null` rendered near the title area, and `showLikeCount?: boolean` defaulting to `true`. When `showLikeCount` is false, omit the like-count span but keep footer layout balanced. Add stories for dashboard draft and published variants with `footerAction` CTAs. No `href` on dashboard cards.

#### 2. OwnedBuildsListing presentation

**Files**: `src/modules/builds/presentation/owned-builds-listing.tsx`, `src/modules/builds/presentation/owned-builds-listing.test.tsx`

**Intent**: Render the dashboard grid and pagination mirroring `CatalogListing`.

**Contract**: Accept `OwnedBuildsListingState`. Success state maps items to `BuildCard` with `showLikeCount={false}`, `statusLabel` from status, and `footerAction` containing: drafts → Edit link to `/dashboard/builds/edit/{id}`; published → Edit + View (`View` links to `/builds/{id}`). Reuse or extract shared Previous/Next pagination markup from catalog. Cover empty, success, paginated-empty, and invalid-cursor states in tests.

#### 3. Dashboard page

**File**: `src/pages/dashboard.astro`

**Intent**: Replace stub with the owned-builds listing.

**Contract**: Call `resolveOwnedBuildsListing`. Render page heading "My builds" (or match mockup tone), "+ New build" link to `/dashboard/builds/new`, `OwnedBuildsListing`, and preserve `?published=1` success banner when present. Set `Cache-Control: private, no-store`. No client hydration island unless delete/list requires it (prefer SSR-only).

#### 4. Topbar navigation

**File**: `src/components/Topbar.astro`

**Intent**: Rename Account to Dashboard and fix active state for subroutes.

**Contract**: `label: "Dashboard"`. `isDashboard = path.startsWith("/dashboard")`.

### Success Criteria:

#### Automated Verification:

- BuildCard tests cover status label and hidden likes: `npm test -- src/components/ui/build-card.test.tsx`
- OwnedBuildsListing tests cover CTA wiring and states: `npm test -- src/modules/builds/presentation/owned-builds-listing.test.tsx`
- Storybook build passes: `npm run storybook:build`
- Lint passes: `npm run lint`

#### Manual Verification:

- Dashboard grid matches mockup layout at phone and desktop widths (status + CTAs; accepted gaps documented per lessons).
- Draft card shows Edit only; published shows Edit + View.
- Pagination works for >12 builds.
- Topbar shows "Dashboard" active on `/dashboard` and edit subroutes.

---

## Phase 4: Production and Verification

### Overview

Final automated gates, browser/server boundary review, and manual proving-flow checks.

### Changes Required:

#### 1. Final verification pass

**Files**: none new — run full suite and record accepted visual gaps in `change.md` Notes

**Intent**: Confirm the slice is merge-ready.

**Contract**: Document any remaining mockup gaps (no subtitle/story, View 404 until S-06) in `change.md` per lessons learned.

### Success Criteria:

#### Automated Verification:

- Full unit/component tests pass: `npm test`
- Integration tests pass: `npm run test:integration`
- Lint passes: `npm run lint`
- Production build passes: `npm run build`
- No server-only imports in client bundles (manual grep or existing pattern check)

#### Manual Verification:

- Sign in → dashboard lists only own builds → New build → save draft → appears on dashboard as Draft with Edit.
- Publish from editor → redirect to dashboard with confirmation → card shows Published with Edit + View.
- Edit published build → save → persists.
- Delete from edit → confirm → removed from dashboard.
- User B cannot access author A's edit URL or delete.
- Phone and desktop layouts verified.

---

## Testing Strategy

### Unit Tests:

- Cursor encode/decode edge cases (malformed, simultaneous before/after).
- List page boundary derivation (first, after, before, empty, paginated-empty).
- Delete idempotency when row missing.
- BuildCard status and `showLikeCount` rendering.
- OwnedBuildsListing CTA hrefs by status.
- BuildForm published mode and delete confirmation.

### Integration Tests:

- Author list returns draft + published; other identities get zero rows.
- Author delete succeeds; user B delete is no-op.
- Published row update via RPC after migration.

### Manual Testing Steps:

1. Create two builds (one draft, one published) and confirm dashboard cards and CTAs.
2. Paginate with >12 builds.
3. Follow View on published — confirm `/builds/{id}` (404 acceptable).
4. Delete draft and published from edit form.
5. Confirm `/account/builds/new` returns 404.

## Performance Considerations

Low volume expected. Page size 12, select only card projection fields, sign images in bounded parallel for the displayed page only. No new database indexes at MVP volume.

## Migration Notes

- One SQL migration extends `save_draft_build` for published updates.
- Remove `/account/builds/*` pages without redirects — bookmarks break.
- Run `npm run db:types` after migration.

## References

- Research: `context/changes/manage-own-builds/research.md`
- Mockup: `context/changes/manage-own-builds/user-dashboard.png`
- Catalog pagination pattern: `src/modules/catalog/server.ts:28-86`
- Prior create flow: `context/archive/2026-09-13-create-draft-build/plan.md`
- RLS migration: `supabase/migrations/20260910201541_build_visibility_and_storage.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Owned Builds List and Delete Backend

#### Automated

- [x] 1.1 Owned-build cursor and use-case unit tests pass — 0a51eea
- [x] 1.2 Store unit tests cover list boundaries and delete Storage ordering — 0a51eea
- [x] 1.3 Integration tests pass for owned list and delete authorization — 0a51eea
- [x] 1.4 Lint passes — 0a51eea

#### Manual

- [x] 1.5 None required — backend only — 0a51eea

### Phase 2: Published Edit Enablement and Route Migration

#### Automated

- [x] 2.1 Migration applies locally and types regenerated — e0cc277
- [x] 2.2 Build form tests cover published mode and delete flow — e0cc277
- [x] 2.3 Use-case tests cover published get/save — e0cc277
- [x] 2.4 Integration test for published update passes — e0cc277
- [x] 2.5 Lint passes — e0cc277

#### Manual

- [x] 2.6 Author can edit and save a published build — e0cc277
- [x] 2.7 Remove on edit page deletes build and returns to dashboard — e0cc277

### Phase 3: Dashboard Listing UI and Navigation

#### Automated

- [x] 3.1 BuildCard tests cover status label and hidden likes
- [x] 3.2 OwnedBuildsListing tests cover CTA wiring and states
- [x] 3.3 Storybook build passes
- [x] 3.4 Lint passes

#### Manual

- [x] 3.5 Dashboard grid matches mockup at phone and desktop (accepted gaps recorded)
- [x] 3.6 Draft shows Edit only; published shows Edit + View
- [x] 3.7 Pagination works for more than twelve builds
- [x] 3.8 Topbar Dashboard active on dashboard subroutes

### Phase 4: Production and Verification

#### Automated

- [ ] 4.1 Full unit and component test suite passes
- [ ] 4.2 Integration tests pass
- [ ] 4.3 Lint passes
- [ ] 4.4 Production build passes
- [ ] 4.5 No server-only code in client bundles

#### Manual

- [ ] 4.6 End-to-end proving flow: list, create, publish, edit published, delete
- [ ] 4.7 User B cannot access or delete author A builds
- [ ] 4.8 Accepted visual gaps recorded in change.md
