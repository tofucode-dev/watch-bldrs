# Publish Draft Build Implementation Plan

## Overview

Let an authenticated author publish an owned draft from the existing build editor. Publication is a distinct, owner-scoped, retry-safe `draft -> published` command: it preserves the first publication timestamp, never publishes unsaved form or photo changes, and stops at making the build eligible for later catalog reads.

The slice extends the existing `builds` module, Astro Action group, React form island, and dashboard. It does not add catalog queries, public details, an account listing, unpublish, or a browser E2E harness.

## Current State Analysis

S-02 already lets an authenticated author create and update a private draft, attach one private main image, and reopen the draft in `/account/builds/[id]/edit`. Publication is intentionally absent from the store port, application use cases, grouped Actions, and sticky form actions.

The database foundation already supports the required transition. `builds.status` and `published_at` exist, an existing trigger stamps only the first publication, RLS limits mutations to the owner, and Storage visibility derives from the parent build's published state and exact object path. Publication therefore needs no schema change, file move, or signed-URL persistence.

### Key Discoveries

- `BuildStore` currently exposes only draft save/read and main-image attachment, so publication needs one new port operation and its request-bound wiring (`src/modules/builds/application/ports/build-store.ts:3`, `src/modules/builds/server.ts:17`).
- The Supabase adapter already uses owner-, ID-, and draft-scoped conditional mutations for image attachment; publication can follow that boundary pattern (`src/modules/builds/infrastructure/supabase-build-store.ts:181`).
- The first-publication trigger sets `published_at` only when it is absent and preserves it thereafter (`supabase/migrations/20260910201541_build_visibility_and_storage.sql:136`).
- Published rows are globally readable, so an idempotency fallback must also constrain `author_id`; otherwise another user's published row could be mistaken for a successful retry (`supabase/migrations/20260910201541_build_visibility_and_storage.sql:169`).
- Updating an already-published row again would still advance `updated_at`; a retry must use a read-only owner/published fallback instead of an unconditional update (`supabase/migrations/20260910201541_build_visibility_and_storage.sql:131`).
- `BuildForm` already owns draft identity, saved form/photo snapshots, mutation locking, and sticky-bar feedback, making it the narrowest publish presentation seam (`src/modules/builds/presentation/build-form.tsx:194`, `src/modules/builds/presentation/build-form.tsx:306`, `src/modules/builds/presentation/build-form.tsx:696`).
- The edit route intentionally loads drafts only. Remaining on that URL after publication would turn a refresh into a private 404 (`src/pages/account/builds/[id]/edit.astro:13`).
- The dashboard is an existing authenticated destination but does not yet understand a publication success query parameter (`src/pages/dashboard.astro:1`).
- Current HEAD remains the research baseline commit `3334a1fbfd508238d533ec53cbcd8be23be6a383`; there is no committed implementation drift.

## Desired End State

An authenticated author can save any valid draft, including one with every optional field empty, and then choose Publish from the existing sticky action bar. Publish is available only when the draft has a persisted ID and the visible form/photo state matches the last successful save. An inline confirmation communicates the consequence before the command runs.

The server accepts only the build UUID, derives the actor from the verified session, and atomically changes an owned draft to published. The same owner's retry is a safe success without another update; anonymous users, other users, and missing IDs receive the same privacy-preserving not-found/authorization behavior already used by draft commands. On success the browser navigates to `/dashboard?published=1`, where a clear confirmation is rendered.

The result is verified with application unit tests, React component tests, a focused local-Supabase identity/concurrency suite, lint, and a Cloudflare Workers production build.

## What We're NOT Doing

- Public catalog/list queries or UI (S-04 `show-public-builds`)
- Public build details, account build listing, likes, home-page shelves, or filters
- An unpublish or republish control; SQL support remains available for a later slice
- Editing a published build or expanding the draft-only editor route
- New publication prerequisites such as requiring a name, story, part, attribute, or image
- A database migration, dedicated publish RPC, service-role access, or Storage object movement
- Cache invalidation infrastructure before public catalog/details caching exists
- Rate-limiting infrastructure, new observability services, or unrelated refactors
- A Playwright/E2E harness; the proving-flow E2E remains deferred until catalog and details exist

## Implementation Approach

Add a framework-independent `publishBuild` use case to the `builds` application layer and extend `BuildStore` with one publication operation. The Supabase adapter first performs one conditional update constrained by build ID, verified author ID, and `status = 'draft'`. If no row changes, it performs a read-only lookup constrained by the same ID/author and `status = 'published'`: an owned published row is an idempotent success, while every other zero-row case remains not found.

Expose the use case as `actions.builds.publish` with UUID-only input and the existing safe Action-error mapping. In `BuildForm`, derive publish eligibility from persisted identity plus equality with the last successful form/photo snapshots. Keep Save Draft and Publish as separate stable controls, use an inline confirmation, share the existing in-flight guard, and navigate only after the Action succeeds.

No RPC is warranted because publication currently changes one row and all publication-dependent Storage visibility is derived from that row. A dedicated function would add a migration, grants, generated types, and a broader database API without improving atomicity for the current contract.

## Critical Implementation Details

### State sequencing

Photo upload and attachment are draft-only, so publication must never race or precede them. Publish is disabled until the current text/parts and photo state match their last successful snapshots; a failed upload or attach keeps the form dirty and blocks publication until the author saves successfully or discards the change.

### Idempotent classification

Do not re-run `UPDATE` for an already-published row: that would change `updated_at`. After a zero-row draft transition, only an `id + author_id + published` read may classify the request as a successful retry; missing and non-owned rows must remain indistinguishable.

### Post-publication lifecycle

The current edit loader selects drafts only. A successful command must perform a full navigation to `/dashboard?published=1`; leaving the published build at the edit URL or relying only on client state creates a refresh-to-404 trap.

## Phase 1: Publication Command and Persistence Boundary

### Overview

Introduce the owner-scoped publication contract from application use case through Supabase adapter and Astro Action, then prove authorization, first-publication, retry, and concurrency behavior against both fakes and the real local database.

### Changes Required

#### 1. Publication application use case

**Files**: `src/modules/builds/application/publish-build.ts`, `src/modules/builds/application/ports/build-store.ts`, `src/modules/builds/domain/errors.ts`

**Intent**: Add a framework-independent publish command that rejects anonymous actors before persistence and maps any non-owned, missing, or non-publishable target to the existing privacy-preserving draft-not-found behavior.

**Contract**: `publishBuild(actor: Actor, id: string, store: BuildStore): Promise<{ id: string }>` delegates to `store.publishBuild(authorId, id)`. `BuildStore.publishBuild(authorId: string, id: string)` returns `{ id }` for a first publication or owned idempotent retry and `null` otherwise. Reuse `UnauthenticatedError`, `DraftNotFoundError`, and existing unexpected-store mapping; do not add an `AlreadyPublishedError`.

#### 2. Conditional Supabase publication

**File**: `src/modules/builds/infrastructure/supabase-build-store.ts`

**Intent**: Make first publication atomic and race-safe while keeping retries true no-ops and preserving record privacy.

**Contract**: First update `builds.status` to `published` only where `id`, `author_id`, and `status = 'draft'` all match, selecting only `id`. When that changes no row, select only `id` where `id`, `author_id`, and `status = 'published'` match. Return the owned published row as idempotent success; return `null` for every other no-row result. Route Supabase failures through `mapStoreError`. Do not modify `published_at`, `updated_at`, parts, or `main_image_path` directly.

#### 3. Request-bound composition and server exports

**File**: `src/modules/builds/server.ts`

**Intent**: Make the use case available to request adapters without exposing server-only dependencies through the browser-safe entrypoint.

**Contract**: Export `publishBuild` from the server entrypoint and add it to `createBuildUseCasesForRequest` using the same request-scoped `BuildStore` as the existing draft commands. Keep imports through `@/modules/builds/server` for outside callers.

#### 4. UUID-only Astro Action

**File**: `src/modules/builds/actions.ts`

**Intent**: Expose publication as a safe UI mutation that trusts only the verified server session for identity and never accepts author or target status from the browser.

**Contract**: Add `actions.builds.publish` with input `{ id: z.uuid() }` and success `{ ok: true, id }`. Resolve the actor from `context.locals.user`, call the publication use case, and reuse the existing safe error mapping. Missing and non-owned rows map to the existing `NOT_FOUND` response; unexpected Supabase details never cross the Action boundary.

#### 5. Application unit coverage

**File**: `src/modules/builds/application/use-cases.test.ts`

**Intent**: Prove orchestration and classification independently from Supabase.

**Contract**: Extend the fake store with publication state, a stable fake publication timestamp or mutation count, and `publishBuild`. Cover anonymous rejection before the store call; owned empty-draft publication; same-owner retry success with no second mutation; missing ID; user B attempting author A's draft; and user B attempting author A's already-published build.

#### 6. Real data-boundary coverage

**File**: `tests/integration/publish-draft-build.test.ts`

**Intent**: Satisfy the repository's data-access Definition of Done by proving the adapter against real RLS, triggers, and concurrent requests using the existing local identity harness.

**Contract**: Use anonymous, author A, user B, and service-role cleanup from `tests/integration/helpers/supabase-identities.ts`. Cover publication of an owned draft with all optional fields empty; non-null `published_at`; anonymous/user B readability only after publication; safe owner retry with unchanged `published_at` and `updated_at`; two concurrent owner calls both succeeding with one stable transition; user B and missing UUID returning `null` without mutation. Do not duplicate the already-covered Storage download matrix.

### Success Criteria

#### Automated Verification

- Publication use-case unit tests pass, including anonymous, owner, non-owner, missing, and idempotent retry cases: `npm run test -- src/modules/builds/application/use-cases.test.ts`
- Focused local-Supabase publication tests pass after a clean local schema reset: `npx supabase db reset` then `npm run test:integration -- tests/integration/publish-draft-build.test.ts`
- The production source contains no service-role import, browser server-entrypoint import, or new migration for publication

#### Manual Verification

- Review the adapter query chain and confirm both first update and retry lookup constrain `id` and `author_id`, with the update additionally constrained to `draft`
- Confirm a published row's `published_at` and `updated_at` remain unchanged after a repeated publication request

**Implementation Note**: After completing this phase and all automated verification passes, pause for human confirmation of the manual checks before proceeding to Phase 2.

---

## Phase 2: Author Publish Experience

### Overview

Add a distinct, accessible publish flow to the existing authoring island, including clean-state eligibility, inline confirmation, safe pending/error recovery, responsive sticky actions, and post-publication dashboard feedback.

### Changes Required

#### 1. Astro Action test mock

**File**: `src/test/mocks/astro-actions.ts`

**Intent**: Let jsdom component tests control publication responses through the same mock surface as other build Actions.

**Contract**: Add `actions.builds.publish` as a mock function with the UUID-only call shape. Reset it in the `BuildForm` test setup.

#### 2. Clean-state publication eligibility

**File**: `src/modules/builds/presentation/build-form.tsx`

**Intent**: Prevent the public row from differing from the visible editor state and prevent publication before a new draft or photo change is fully persisted.

**Contract**: Publish is enabled only when a draft ID exists, no mutation is pending, and current form plus photo state matches the last successful snapshots. `/new` starts with Publish unavailable; a successful first Save makes it available without remounting. Any field/part/photo change disables it and surfaces “Save changes before publishing.” Failed save, upload, or attachment remains non-publishable. Discard restores eligibility when it restores the saved snapshots.

#### 3. Inline confirmation and mutation lifecycle

**File**: `src/modules/builds/presentation/build-form.tsx`

**Intent**: Make publication deliberate and safe under rapid clicks, lost responses, and recoverable failures.

**Contract**: Keep separate, stable Save Draft and Publish controls in the sticky bar. The first Publish click enters an inline confirmation state explaining that editing/unpublishing is unavailable in the current MVP; confirmation offers Cancel and Publish build. The confirmed command calls `actions.builds.publish({ id })`, shares the existing in-flight guard, disables conflicting actions while pending, and never initiates a draft save implicitly. Safe failure preserves every form value, exits or retains confirmation in a retryable state, and displays non-sensitive status text. Success performs one full navigation to `/dashboard?published=1`.

#### 4. Responsive sticky action composition

**Files**: `src/modules/builds/presentation/build-form.tsx`, `src/components/ui/sticky-action-bar.tsx`, `src/components/ui/sticky-action-bar.stories.tsx`

**Intent**: Fit Discard, Save Draft, Publish, status guidance, and confirmation actions at phone and desktop widths without creating a new shared primitive.

**Contract**: Preserve the existing `StickyActionBar` public props and use its slots to compose the three actions. Adjust only the internal action-group layout needed for wrapping or full-width phone behavior, using `cn()` for conditional classes. Add a Storybook case showing the three-action and/or confirmation composition. Preserve keyboard order, visible focus, and explicit button names.

#### 5. Dashboard publication confirmation

**File**: `src/pages/dashboard.astro`

**Intent**: Provide a refresh-safe success destination without coupling S-03 to the unimplemented catalog or account listing.

**Contract**: Read the static `published=1` query state from `Astro.url.searchParams` and render a concise semantic success message. Do not fetch the published build, add account-list behavior, or expose user-provided query content.

#### 6. Component coverage

**File**: `src/modules/builds/presentation/build-form.test.tsx`

**Intent**: Lock the user-visible publication contract and the save/photo sequencing boundary.

**Contract**: Cover accessible Publish presence; disabled state without an ID; enablement after first successful save; dirty form, part, selected photo, cleared photo, upload failure, and attachment failure blocking publication; Discard restoring eligibility; inline confirm/cancel; UUID-only Action payload; pending disabled state and rapid double-click suppression; safe failure recovery with preserved values; idempotent-success navigation; and navigation to `/dashboard?published=1`. Assert Publish never calls create/update/attach implicitly.

### Success Criteria

#### Automated Verification

- BuildForm component tests pass for eligibility, confirmation, pending, error, retry, and navigation behavior: `npm run test -- src/modules/builds/presentation/build-form.test.tsx`
- Shared sticky-action changes retain Storybook type/build compatibility: `npm run storybook:build`
- The browser-facing build form imports no `@/modules/builds/server`, `astro:env/server`, or server-only Supabase dependency

#### Manual Verification

- At phone width, status copy and Discard, Save Draft, and Publish/confirmation controls remain readable, reachable, and free of horizontal overflow
- At desktop width, sticky actions retain stable order and visible keyboard focus through confirmation, cancel, retry, and success
- A failed save or photo attachment cannot be followed by publication until the change is saved or discarded
- Successful publication lands on the dashboard confirmation and refreshing that destination does not expose the draft-only edit 404

**Implementation Note**: After completing this phase and all automated verification passes, pause for human confirmation of the manual checks before proceeding to Phase 3.

---

## Phase 3: Cross-Cutting Verification

### Overview

Run the complete repository gates and perform the final responsive/security smoke pass without expanding the feature into later roadmap slices.

### Changes Required

#### 1. Full automated gates

**Files**: affected source and test files from Phases 1-2

**Intent**: Detect regressions outside focused tests and verify the server code remains compatible with the Cloudflare Workers runtime.

**Contract**: Run the full unit/component suite, full local integration suite, lint, Storybook build, and production Workers build. Database type regeneration is not required because the selected direct-update approach adds no migration or database function; if implementation unexpectedly changes the schema, stop, revise the plan, reset locally, regenerate types, and review the expanded scope.

#### 2. Final proving-slice smoke pass

**Files**: no additional product files expected

**Intent**: Verify the completed S-03 boundary in the running application at both required viewport classes.

**Contract**: Exercise create/save, dirty-state blocking, confirmation cancel, successful publication, safe retry behavior where practicable, dashboard confirmation, and non-author denial. Confirm that no public listing/details, unpublish, or published-edit UI was introduced.

### Success Criteria

#### Automated Verification

- Full unit and component suite passes: `npm run test`
- Full local Supabase identity/Storage suite passes: `npm run test:integration`
- ESLint passes: `npm run lint`
- Static Storybook build passes: `npm run storybook:build`
- Cloudflare Workers production build passes: `npm run build`

#### Manual Verification

- An author can save an empty or populated draft, confirm Publish, and see the dashboard success message on phone and desktop widths
- Unsaved text, parts, selected/cleared photo state, and failed photo persistence all block Publish with understandable guidance
- Anonymous and non-author attempts cannot publish the draft, and the UI/API does not reveal another user's protected record state
- No unpublish, catalog, details, account-list, or published-edit surface appears as part of this slice

**Implementation Note**: After all automated gates pass, pause for final human confirmation of the manual smoke pass before marking the change implemented.

## Testing Strategy

### Unit Tests

- Use-case authentication and owner-scoped delegation
- First publication versus owned retry result classification
- Missing and non-owned records sharing privacy-preserving failure behavior
- Retry no-op semantics represented by stable fake timestamp/mutation count

### Component Tests

- New versus existing draft publication eligibility
- Deep dirty-state detection for form fields and ordered parts
- Photo selection, removal, save failure, upload failure, and attach failure
- Inline confirmation, cancellation, pending state, double-click protection, safe error recovery, and redirect
- Publish payload contains only the draft UUID and never performs an implicit save

### Integration Tests

- Real owner transition under existing RLS and trigger behavior
- Anonymous, author A, and user B identity matrix
- Empty optional data remains publishable
- Sequential retry leaves `published_at` and `updated_at` unchanged
- Concurrent duplicate requests both classify successfully while only one state transition occurs
- Existing Storage visibility suite remains the source of truth for object access after publication

### Manual Testing Steps

1. Open a new build at phone width and verify Publish is unavailable before the first save.
2. Save an empty draft and confirm Publish becomes available without remounting.
3. Change a field and a photo independently; verify Publish is disabled until each change is saved or discarded.
4. Start Publish, cancel inline confirmation, and verify no Action ran.
5. Confirm Publish and verify only one request is accepted under rapid repeated clicks.
6. Verify success navigates to `/dashboard?published=1`, shows confirmation, and survives refresh.
7. Repeat the main interaction at desktop width and inspect keyboard order/focus visibility.
8. Verify another authenticated user cannot publish the draft and receives no ownership detail.

## Performance Considerations

Publication adds one conditional update in the common case and one owner-scoped read only for retries or other zero-row outcomes. No catalog query, object copy, client-side Supabase database call, cache, or new dependency is introduced. This is proportionate to the PRD's small scale; add an RPC only if later publication gains multi-row dependent writes or measured round-trip cost becomes material.

## Migration Notes

No migration or generated database-type change is expected. The existing `published_at` and `updated_at` triggers, owner update RLS, published read RLS, and Storage policies remain authoritative. Deployment is an application-only rollout; rollback removes the Action/UI while published rows remain valid data and retain their first publication timestamp.

## References

- Related research: `context/changes/publish-draft-build/research.md`
- Product contract: `context/foundation/prd.md` (US-02, FR-003, FR-004, Access Control, Non-Goals)
- Security contract: `context/foundation/architecture/security.md` (RLS matrix, publication state machine, Action pipeline)
- Module boundary: `context/foundation/architecture/modules.md` (`builds` authoring lifecycle)
- Operational constraints: `context/foundation/OPERATIONAL_SAFETY.md` (atomicity, idempotency, mutation safety, verification)
- Similar draft mutation: `src/modules/builds/infrastructure/supabase-build-store.ts:119`
- Publication trigger and RLS: `supabase/migrations/20260910201541_build_visibility_and_storage.sql:136`
- Existing editor state machine: `src/modules/builds/presentation/build-form.tsx:194`
- Existing three-identity harness: `tests/integration/helpers/supabase-identities.ts:87`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Publication Command and Persistence Boundary

#### Automated

- [x] 1.1 Publication use-case unit tests pass, including anonymous, owner, non-owner, missing, and idempotent retry cases — 0fccc15
- [x] 1.2 Focused local-Supabase publication tests pass after a clean local schema reset — 0fccc15
- [x] 1.3 Production source contains no service-role import, browser server-entrypoint import, or new migration for publication — 0fccc15

#### Manual

- [x] 1.4 Adapter update and retry lookup both constrain ID and author, with draft status on the update — 0fccc15
- [x] 1.5 Published and updated timestamps remain unchanged after a repeated publication request — 0fccc15

### Phase 2: Author Publish Experience

#### Automated

- [x] 2.1 BuildForm component tests pass for eligibility, confirmation, pending, error, retry, and navigation behavior — f3b5e3a
- [x] 2.2 Shared sticky-action changes retain Storybook type and build compatibility — f3b5e3a
- [x] 2.3 Browser-facing build form imports no server-only build, Astro environment, or Supabase dependency — f3b5e3a

#### Manual

- [x] 2.4 Phone layout keeps status and all publish controls readable, reachable, and free of horizontal overflow — f3b5e3a
- [x] 2.5 Desktop sticky actions retain stable order and visible keyboard focus through the full interaction — f3b5e3a
- [x] 2.6 Failed save or photo attachment blocks publication until the change is saved or discarded — f3b5e3a
- [x] 2.7 Successful publication lands on a refresh-safe dashboard confirmation — f3b5e3a

### Phase 3: Cross-Cutting Verification

#### Automated

- [x] 3.1 Full unit and component suite passes — bcef629
- [x] 3.2 Full local Supabase identity and Storage suite passes — bcef629
- [x] 3.3 ESLint passes — bcef629
- [x] 3.4 Static Storybook build passes — bcef629
- [x] 3.5 Cloudflare Workers production build passes — bcef629

#### Manual

- [x] 3.6 Author publishes an empty or populated saved draft and sees confirmation at phone and desktop widths - 3bb121b
- [x] 3.7 Every unsaved or failed-to-persist form and photo state blocks Publish with understandable guidance - 3bb121b
- [x] 3.8 Anonymous and non-author attempts cannot publish or learn protected record state - 3bb121b
- [x] 3.9 No unpublish, catalog, details, account-list, or published-edit surface was added - 3bb121b
