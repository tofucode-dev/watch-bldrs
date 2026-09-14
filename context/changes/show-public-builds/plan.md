# Show Public Builds Implementation Plan

## Overview

Add the first live public catalog at `/builds`. The page will server-render published builds only, twelve at a time, through a new read-oriented `catalog` module. Visitors will move between stable keyset-paginated pages, published image paths will become short-lived signed URLs, and drafts will remain absent for anonymous visitors, other users, and authenticated authors browsing the public surface.

This slice deliberately stops before publishing UI, filters, public details, likes persistence, and the home-page recent shelf. Because S-06 owns details, S-04 cards are temporarily non-linked. The shared `BuildCard` contract will nevertheless be repaired now so a later `href` produces one named navigation stop instead of duplicate or unnamed links.

S-04 has no technical dependency on the publish UI. The existing schema, first-publish timestamp trigger, RLS, and Storage policies support directly seeded published rows, so implementation and verification can proceed before S-03. When S-03 later lands, it completes the user-driven publish-to-catalog proving flow without changing this listing contract.

## Current State Analysis

The repository already has the persisted `builds` schema, publication-aware RLS, a private `build-images` bucket, cookie-backed server Supabase clients, and reusable listing presentation. It has no `catalog` module, `/builds` route, catalog query, cursor contract, public image mapper, page states, or catalog-specific integration tests.

The shared UI foundation is close but not ready to become the live catalog unchanged. `BuildCard` requires an `href` and creates separate media and title links. With sparse data this can create an unnamed navigation stop, and with named builds it creates two consecutive links to the same future details route. `ListingLoadMore` is a callback-driven button and cannot provide the chosen no-JavaScript SSR cursor navigation.

The public request client can carry an authenticated session. RLS therefore cannot be the only catalog filter: the current SELECT policy also lets an author read their own drafts. Every catalog query must explicitly constrain `status = 'published'` and `published_at IS NOT NULL` before mapping or signing images.

## Desired End State

Anyone can open `/builds` and see up to twelve newest published builds in the existing responsive grid. Results use deterministic `published_at desc, id desc` ordering. Previous and Next navigation uses validated opaque cursor values and remains functional without client-side JavaScript. Equal publication timestamps, insertion of newer rows between requests, exact page boundaries, and disappearance of a previously visible row do not cause offset-style duplicate/skip behavior.

The normal empty catalog, paginated-empty state, invalid-cursor state, and unexpected query-error state are distinct. A valid boundary that returns no rows must not imply the whole catalog is empty and must provide a first-page recovery link. Invalid cursors return a safe 400 state with a first-page link. Query failures return a quiet retryable error state without raw infrastructure details. A missing image or failed signing operation affects only that card and renders the existing neutral placeholder.

Catalog cards display normalized labels, `0` likes until S-07, nullable fields honestly, and no broken details link. Anonymous, author A, and user B integration tests prove the catalog never returns drafts. The page remains usable at phone and desktop widths and ships without a hydrated catalog island.

### Key Discoveries:

- The catalog module owns published list reads, while pages only parse HTTP concerns and call `@/modules/catalog/server` (`context/foundation/architecture/modules.md:34`, `context/foundation/architecture/runtime.md:48`).
- Catalog reads must explicitly select published rows and use deterministic `published_at desc, id desc` order (`context/foundation/architecture/data-model.md:80`).
- RLS currently permits `status = 'published' OR author_id = auth.uid()`, so relying on RLS alone leaks an authenticated author's draft into an unqualified catalog query (`supabase/migrations/20260910201541_build_visibility_and_storage.sql:169`).
- The private bucket permits reads only for a matching published parent build; signed URLs are display values and must never be persisted or logged (`supabase/migrations/20260910201541_build_visibility_and_storage.sql:326`, `context/foundation/architecture/security.md:53`).
- `BuildGrid` already supplies semantic one/two/three-column rendering and preserves source order (`src/components/ui/build-grid.tsx:9`).
- `BuildCard` currently requires `href`, renders two destination links, and requires a numeric like count (`src/components/ui/build-card.tsx:11`, `src/components/ui/build-card.tsx:73`, `src/components/ui/build-card.tsx:145`).
- The known duplicate/unnamed-link failure is recorded as a repository lesson and must not become the public details contract (`context/foundation/lessons.md:19`).
- The current schema has no likes table and no catalog ordering index; small MVP volume does not justify adding either speculatively (`context/foundation/architecture/data-model.md:64`, `supabase/migrations/20260910201541_build_visibility_and_storage.sql:91`).
- Vitest supports Node unit tests and jsdom component tests, while live Supabase checks use the separate integration configuration; no E2E harness exists (`vitest.config.ts:11`, `vitest.integration.config.ts:10`, `package.json:5`).
- The roadmap sequences S-03 before S-04 for the complete proving flow, but that is not a technical implementation gate: the existing database contract can seed and expose published rows directly (`context/foundation/roadmap.md:121`, `supabase/migrations/20260910201541_build_visibility_and_storage.sql:136`).

## What We're NOT Doing

- Implementing publish, unpublish, or delete behavior; S-03 remains the owner of the user-facing publish transition but is not required to build or test this listing.
- Adding public build details or a placeholder details route; S-06 will add `/builds/[id]`.
- Adding live home-page builds or changing the static recent shelf; S-10 owns home recency.
- Wiring watch style, movement, dial colour, strap type, or case-size filters; S-05 owns URL filters and AND semantics.
- Adding likes storage, counts, like actions, or a future-facing zero-returning likes port; S-07 owns them.
- Adding search, ranking, sorting controls, recommendations, author profiles, comments, bookmarks, or favourites.
- Adding automatic infinite scroll, accumulated client results, a React catalog store, or direct browser Supabase reads.
- Adding a speculative catalog index or schema migration. The MVP data volume is small; index work follows an observed query-plan need.
- Adding Playwright or another E2E framework solely for this slice. Unit, component, integration, production-build, and manual browser checks provide the scoped evidence.
- Repairing the roadmap's pre-existing formatting/frontmatter damage or prerequisite inconsistency as part of this plan.

## Implementation Approach

Build the read path from the inside out. A catalog application contract owns cursor validation, page shape, and the published-list use case. A Supabase adapter selects only the card projection, applies published visibility and composite keyset boundaries, fetches `limit + 1`, and maps at most twelve rows. Image signing runs in bounded parallel work after the rows have passed the published query; individual failures become `null` URLs.

Expose request composition only from `@/modules/catalog/server`. The `/builds` route validates mutually exclusive `before`/`after` inputs through that module, maps invalid input to 400, infrastructure failure to a quiet 503 state, and normal empty data to 200. A non-hydrated catalog presentation component renders the grid and semantic Previous/Next links, allowing page-state behavior to be covered in jsdom without placing Supabase logic in presentation.

Update `BuildCard` before the page adopts it. `href` becomes optional. Without it, media and title are static. With it, the card content has one accessible destination and the footer action remains outside the link. This resolves the known navigation defect and gives S-06 a safe contract later.

## Critical Implementation Details

### State sequencing

Cursor order is a pair, never a timestamp alone. An `after` request selects tuples older than `(published_at, id)` in descending order. A `before` request selects newer tuples in the reverse database order, fetches one extra row, and reverses the displayed slice back to newest-first. `before` and `after` are mutually exclusive. The query must not need to refetch the boundary row, because it may have been unpublished between requests.

### User experience spec

The catalog distinguishes three zero-card outcomes: a legitimate empty result, an invalid page link, and a temporarily unavailable query. Invalid and unavailable states both provide a first-page/retry path. Image-signing failure never turns a successful row query into a page failure. S-04 cards have no `href`, cursor navigation performs a full SSR navigation, and no loading spinner is promised for a normal document request.

### Performance constraints

The route displays twelve rows and requests thirteen to determine continuation. Select only fields used by `CatalogBuildCard`; do not load parts or full stories. Sign at most twelve non-empty image paths concurrently, keep the signed URL TTL short (matching the existing 900-second author-preview precedent is acceptable), and never log or cache signed URLs beyond their validity. Do not add an index until a representative query plan demonstrates need.

## Phase 1: Published Catalog Query Boundary

### Overview

Introduce the server-side catalog module, stable cursor contract, Supabase query/image adapter, and automated proof that every identity receives published rows only in deterministic pages.

### Changes Required:

#### 1. Catalog page and cursor contracts

**Files**: `src/modules/catalog/application/catalog-types.ts`, `src/modules/catalog/application/catalog-cursor.ts`, `src/modules/catalog/application/catalog-cursor.test.ts`

**Intent**: Define the explicit read model and a Worker-compatible, independently testable boundary for opaque page cursors.

**Contract**: `CatalogBuildCard` contains the documented fields: `id`, nullable `name`/`mainImageUrl`/watch attributes/case size, and numeric `likeCount`. `CatalogPage` contains ordered `items`, nullable `previousCursor`, and nullable `nextCursor`. Cursor payloads contain an ISO publication timestamp and UUID; encode with a URL-safe Web API-compatible representation. Parsing rejects malformed encoding, invalid timestamp/UUID, extra or missing tuple members, and simultaneous `before` plus `after` input with an expected `InvalidCatalogCursorError`.

#### 2. Published-list use case and store port

**Files**: `src/modules/catalog/application/list-published-builds.ts`, `src/modules/catalog/application/ports/catalog-store.ts`, `src/modules/catalog/application/list-published-builds.test.ts`

**Intent**: Keep route and infrastructure concerns outside the public-list orchestration while making cursor/page rules testable with a fake store.

**Contract**: `listPublishedBuilds(input, store)` accepts at most one decoded boundary and fixes the page size at twelve. The store contract accepts the decoded direction/boundary and page size, then returns up to twelve items in display order plus a query-direction `hasMore` signal. The use case derives public Previous/Next cursors from the request direction, `hasMore`, and the first/last displayed items. It does not know fetch-13 mechanics, Astro request objects, Supabase response shapes, cookies, or generated database types. Unit tests cover first/next/previous cursor derivation, empty and paginated-empty results, equal-timestamp boundaries, and expected error propagation.

#### 3. Public image URL mapping

**Files**: `src/modules/catalog/infrastructure/public-image-url.ts`, `src/modules/catalog/infrastructure/public-image-url.test.ts`

**Intent**: Turn verified published object paths into short-lived display URLs without coupling catalog code to the draft-only Builds helper.

**Contract**: Empty paths skip signing. Valid paths call a supplied signer with the catalog TTL. A signer error or thrown exception returns `null`. The helper never returns the object path as a URL, persists a signed URL, or exposes a raw Storage error.

#### 4. Supabase catalog adapter

**Files**: `src/modules/catalog/infrastructure/supabase-catalog-store.ts`, `src/modules/catalog/infrastructure/supabase-catalog-store.test.ts`

**Intent**: Implement the published projection, composite keyset boundaries, display mapping, and bounded image signing against the request-scoped Supabase client.

**Contract**: Select only `id`, `name`, `main_image_path`, `watch_style`, `movement`, `dial_colour`, `strap_type`, `case_size_mm`, and `published_at`. Always apply `status = 'published'` and non-null `published_at` before cursor predicates or signing. Order by `published_at` then `id`; use descending order for first/after pages and reverse-query handling for before pages. Fetch thirteen, slice to twelve in display order, and return a query-direction `hasMore` signal without a full count; public Previous/Next cursor derivation remains in the use case. Adapter tests own twelve-versus-thirteen slicing, reverse-query ordering, and `hasMore` behavior. Map database enum values to existing user-facing labels without a cross-module deep import. Set `likeCount` to `0`. Sign only the displayed page's non-empty paths in bounded parallel work. Map database failure to a stable catalog-unavailable error without raw Supabase text.

#### 5. Server-only module composition

**Files**: `src/modules/catalog/server.ts`, `src/modules/catalog/index.ts`

**Intent**: Give Astro routes one supported server entrypoint while keeping read models and presentation-safe exports out of the Worker-only surface.

**Contract**: `server.ts` composes the request-scoped client from `src/lib/supabase.ts`, the Supabase store, cursor parsing, and the list use case. It returns typed success or throws only expected invalid-cursor/catalog-unavailable errors. `index.ts` exports browser-safe catalog types/presentation only and must not import `server.ts`, `astro:env/server`, cookies, or Supabase infrastructure.

#### 6. Catalog identity-matrix integration tests

**Files**: `tests/integration/catalog-listing.test.ts`, `tests/integration/helpers/supabase-identities.ts` only if cleanup support must accept multiple ids

**Intent**: Prove the real data boundary remains public for published rows and private for drafts, including the authenticated-author counterexample that RLS alone would mishandle.

**Contract**: Seed drafts and published rows for author A and user B, including equal `published_at` values and more than one page. Exercise the catalog adapter as anonymous, author A, and user B. Every identity receives the same published-only IDs in deterministic tuple order; author A's own draft and B's own draft are absent. Cover first/next/previous boundaries, exact twelve versus thirteen behavior, normal empty results, and safe cleanup. Do not use the service-role client as proof of catalog visibility.

### Success Criteria:

#### Automated Verification:

- Catalog cursor tests reject malformed, partial, conflicting, non-UUID, and non-date boundaries: `npm test -- src/modules/catalog/application/catalog-cursor.test.ts`
- Catalog use-case and adapter tests cover empty, twelve/thirteen, previous/next, equal-timestamp, error, display-label, zero-like, and per-image fallback behavior: `npm test -- src/modules/catalog`
- `npm run test:integration` proves anonymous, author A, and user B receive identical published-only deterministic pages and never their own drafts
- Catalog query source explicitly constrains `status = 'published'`, `published_at IS NOT NULL`, and selects no story, parts, author identity, or full rows
- Browser-safe catalog exports contain no Worker-only, Supabase-infrastructure, or deep cross-module imports
- `npm run lint` passes after the catalog query boundary lands
- `npm run test` passes after the catalog query boundary lands
- `npm run build` passes on the Cloudflare Workers target

#### Manual Verification:

- After `npx supabase db reset`, the catalog integration file passes against local Supabase and leaves no seeded build rows behind
- Inspect a representative local query plan and record it in `change.md`; accept the bounded scan for MVP scale unless evidence demonstrates an index is necessary
- Confirm server logs and test output contain no cookies, Supabase keys, raw private paths paired with signed tokens, or signed image URLs

**Implementation Note**: After Phase 1 automated checks pass, pause for human confirmation of the local integration/query-plan checks before Phase 2.

---

## Phase 2: Accessible SSR Catalog Surface

### Overview

Repair the shared card navigation contract, add a testable non-hydrated catalog presentation, expose `/builds`, and retarget primary navigation without adding details, filters, or home-page live data.

### Changes Required:

#### 1. Single-link and non-linked BuildCard contract

**Files**: `src/components/ui/build-card.tsx`, `src/components/ui/build-card.test.tsx`, `src/components/ui/build-card.stories.tsx`

**Intent**: Support honest non-interactive S-04 cards and remove the duplicate/unnamed navigation stop before S-06 enables details.

**Contract**: Make `href` optional. With no `href`, render the media, title, and metadata without anchors. With `href`, render one named link covering the non-interactive card content; keep the footer and any future action outside that link. Missing image and untitled fallbacks must never create an unnamed link. Update tests away from the two-link assertion and add linked/unlinked complete and sparse cases. Update stories to demonstrate both modes and review them in Storybook.

#### 2. Catalog listing presentation

**Files**: `src/modules/catalog/presentation/catalog-listing.tsx`, `src/modules/catalog/presentation/catalog-listing.test.tsx`, `src/modules/catalog/index.ts`

**Intent**: Centralize success, empty, quiet-error, invalid-cursor, and cursor-navigation rendering in a component that remains testable without a live Worker or browser fetch.

**Contract**: Accept a discriminated state for `success`, `empty`, `paginated-empty`, `invalid-cursor`, or `unavailable`. Success renders `BuildGrid` and non-linked `BuildCard` values in supplied order, with the first visible image eligible for eager loading and the rest lazy. Previous/Next are semantic links to route-provided URLs, not callback buttons. Empty copy does not imply an outage. A valid cursor that yields no rows renders `paginated-empty` copy rather than claiming the whole catalog is empty and provides a first-page link to `/builds`. Invalid-cursor copy explains the page link is invalid and points to `/builds`. Unavailable copy is restrained, does not expose infrastructure details, and provides a retry link. No hooks, fetch, Supabase client, Actions, filter controls, or client directive.

#### 3. Public catalog route

**File**: `src/pages/builds/index.astro`

**Intent**: Compose the server use case into a public SSR document with correct HTTP status and safe recovery for every page state.

**Contract**: Declare `export const prerender = false`. Read only `before` and `after` from `Astro.url.searchParams`; pass validation to `@/modules/catalog/server`. Normal success/empty returns 200, invalid cursor returns 400, and catalog unavailability returns 503. Generate Previous/Next URLs from validated server results and preserve no unrelated query parameters until S-05 defines filter ownership. Render through `Layout` and the browser-safe catalog presentation. Do not query Supabase directly, import catalog infrastructure, hydrate the listing, or link cards to the absent details route. Use a conservative no-store response policy while responses contain short-lived signed URLs and middleware may refresh session cookies.

#### 4. Primary navigation

**File**: `src/components/Topbar.astro`

**Intent**: Make the dedicated catalog discoverable from desktop and mobile navigation.

**Contract**: Point Builds to `/builds` and mark it active for the catalog route family. Leave the home hero/style tiles/recent placeholder unchanged; S-10 owns the live home shelf and S-05 owns style filter URLs.

#### 5. Presentation and route-contract tests

**Files**: `src/modules/catalog/presentation/catalog-listing.test.tsx`, catalog server unit tests under `src/modules/catalog/**/*.test.ts`

**Intent**: Cover all visible states and HTTP mapping without introducing an E2E framework or testing Astro internals through brittle source snapshots.

**Contract**: Component tests assert semantic list/card output, supplied ordering, no card links in S-04, zero-like copy, sparse fallbacks, Previous/Next URLs, distinct empty/error/invalid copy, and accessible recovery links. Server composition tests cover success plus invalid/unavailable classification. A narrow route-source assertion is acceptable only for the non-negotiable `prerender = false` and absence of direct Supabase imports; prefer behavior at the extracted boundaries.

### Success Criteria:

#### Automated Verification:

- BuildCard tests prove no anchors without `href`, exactly one named content link with `href`, and footer actions outside it: `npm test -- src/components/ui/build-card.test.tsx`
- Catalog presentation tests cover success, empty, invalid-cursor, unavailable, sparse-card, deterministic order, and Previous/Next links: `npm test -- src/modules/catalog/presentation/catalog-listing.test.tsx`
- Valid out-of-range cursors and pages whose rows disappeared render the paginated-empty recovery state without claiming that the catalog is globally empty
- `/builds` explicitly disables prerendering, imports only `@/modules/catalog/server` for server work, and contains no Supabase query or client hydration
- Topbar desktop and mobile navigation resolve Builds to `/builds` and expose the active catalog state
- `npm run storybook:build` compiles the revised BuildCard linked and non-linked stories

#### Manual Verification:

- At approximately 390px, `/builds` shows one readable column, reachable cursor links, stable 4:3 media frames, and no horizontal overflow
- Empty database shows the legitimate empty state; a malformed cursor shows the 400 recovery state; simulated query failure shows the quiet 503 retry state
- A failed image signature degrades only that card to the neutral placeholder while other cards and navigation remain usable
- Paper and Ink BuildCard stories are reviewed with `npm run storybook`; any accepted visual gaps are written in `change.md`

**Implementation Note**: Phase 2 is a targeted implementation gate. After its automated checks pass, pause for an exploratory responsive, degraded-image, error-state, and Storybook review. Phase 3 owns the complete repository gates and final privacy/paging proving subset.

---

## Phase 3: Production and Responsive Verification

### Overview

Run the complete repository gates and record release evidence for the public browse slice without expanding into adjacent roadmap features.

### Changes Required:

#### 1. Verification evidence and accepted gaps

**File**: `context/changes/show-public-builds/change.md`

**Intent**: Preserve the implementation evidence and any accepted visual/performance limitations needed by later catalog slices.

**Contract**: Record the local Supabase reset/integration result, representative query-plan conclusion, phone/desktop manual results, cursor boundary results, Storybook review, and any accepted gaps. Do not convert an accepted gap into unplanned filters, details, likes, home work, or speculative indexing.

#### 2. Foundation documentation corrections

**Files**: `context/foundation/architecture/testing.md`, `context/foundation/architecture/data-model.md`

**Intent**: Correct stale slice identifiers that would otherwise misdirect later implementation work.

**Contract**: Change the catalog-draft-exclusion note from “when S-03 lands” to S-04. Change the deferred `build_likes` owner from the stale S-04 label to current S-07. Do not otherwise redesign the foundation documents.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes from the repository root
- `npm run test` passes from the repository root
- `npm run storybook:build` passes with the revised shared React primitive stories
- `npm run build` passes with `output: "server"` for Cloudflare Workers
- After a clean local reset, `npm run test:integration` passes including catalog identity and pagination coverage
- Browser/server boundary review finds no `@/modules/catalog/server`, Supabase infrastructure, `astro:env/server`, private paths, or secrets in client-facing imports/bundles
- Cross-module import review finds no catalog/builds infrastructure deep imports or circular dependency
- Foundation docs name S-04 for catalog exclusion coverage and S-07 for likes persistence

#### Manual Verification:

- Repeat the proving subset at phone and desktop widths: open `/builds`, navigate forward/back, and distinguish empty, invalid, and unavailable states
- Confirm a recently published seeded build becomes visible after refresh and a draft/unpublished build remains absent for every public identity
- Confirm all verification evidence, query-plan conclusion, and accepted look gaps are recorded in `change.md`

**Implementation Note**: Phase 3 closes only after the human confirms the final browser and local-Supabase evidence.

---

## Testing Strategy

### Unit Tests:

- Cursor encoding/decoding, mutually exclusive directions, malformed values, valid ISO timestamps and UUIDs.
- Composite tuple behavior for equal timestamps, after/before direction, reverse-query display order, exact page boundaries, and disappearing boundary rows.
- Application orchestration with a fake store, including empty and infrastructure-error paths.
- Database-row to read-model mapping, human-readable labels, nullable fields, constant zero likes, bounded projection, and per-image signing fallback.
- BuildCard linked/unlinked semantics and single accessible destination.

### Integration Tests:

- Anonymous, author A, and user B receive the same published-only catalog pages.
- Each authenticated identity's own drafts remain absent despite RLS allowing ownership reads.
- Deterministic first/next/previous ordering with equal timestamps and more than twelve published rows.
- Empty catalog is a normal empty page.
- Published image signing succeeds where Storage policy permits; signing failure maps safely without leaking raw errors.
- Existing visibility and Storage tests continue to pass.

### Component Tests:

- Success grid with complete and sparse cards.
- Empty, paginated-empty, invalid-cursor, and quiet unavailable states use distinct copy and recovery links.
- Previous/Next links appear only when the corresponding cursor exists.
- S-04 cards contain no details links; the shared linked story/component contract contains exactly one named link.
- Responsive class contracts stay delegated to the already-tested BuildGrid.

### Manual Testing Steps:

1. Reset local Supabase and seed at least thirteen published builds plus drafts for both test authors, including two equal publication timestamps.
2. Open `/builds` logged out; verify twelve newest public cards, no drafts, and a Next link.
3. Navigate Next then Previous; verify tuple order and no duplicated/skipped IDs.
4. Repeat while signed in as author A and user B; compare the public IDs and verify each user's own drafts remain absent.
5. Open a malformed `before`/`after` URL and a URL containing both; verify 400 copy and first-page recovery.
6. Simulate a query failure; verify restrained 503 copy and retry. Simulate one signer failure; verify only its card loses the image.
7. Verify the legitimate empty state separately from failures.
8. Repeat primary checks at approximately 390px and desktop widths.
9. Review linked and non-linked BuildCard stories in Paper and Ink themes and record accepted visual gaps.

## Performance Considerations

- Page size is fixed at twelve; a thirteenth row determines continuation without a full count.
- Composite keyset paging avoids offset churn when a newer build is published between requests.
- The projection excludes stories, parts, and author data; image signing is limited to displayed non-empty paths.
- No client hydration, accumulation store, IntersectionObserver, or browser Supabase request is added.
- Signed URLs are short-lived and responses use conservative no-store behavior. Do not cache a cookie-bearing response or a signed URL beyond its TTL.
- The only current builds index is `author_id`. At MVP scale, retain the schema and record a representative query plan; add `(status, published_at desc, id desc)` only in a later forward migration when measured evidence warrants it.

## Migration Notes

No schema, RLS, Storage, or generated database-type migration is planned. Deployment is additive application code. Rollback removes the `/builds` route/catalog module and restores the Topbar anchor; no persisted data changes. The `BuildCard` API change is backward-compatible for current callers because existing `href` values remain valid, while the link structure intentionally changes from two links to one.

S-04 can be implemented and released with directly seeded or otherwise existing published rows. Until S-03 lands, do not claim the separate author-driven publish-to-catalog journey is complete; that limitation does not block the public listing itself.

## References

- Related research: `context/changes/show-public-builds/research.md`
- Product requirements: `context/foundation/prd.md`
- Roadmap S-04: `context/foundation/roadmap.md:310`
- Catalog ownership: `context/foundation/architecture/modules.md:34`
- Catalog query model: `context/foundation/architecture/data-model.md:80`
- SSR and route boundary: `context/foundation/architecture/runtime.md:26`
- RLS and signed-image rules: `context/foundation/architecture/security.md:5`
- Test matrix: `context/foundation/architecture/testing.md:13`
- Operational query/caching/logging rules: `context/foundation/OPERATIONAL_SAFETY.md:60`
- Listing UI precedent: `context/archive/2026-09-13-listing-ui-components/plan.md`
- Filter scope boundary: `context/archive/2026-09-13-filter-ui-components/plan.md`
- Visibility/Storage precedent: `context/archive/2026-09-09-build-visibility-and-storage/plan.md`
- Draft slice boundary: `context/archive/2026-09-13-create-draft-build/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Published Catalog Query Boundary

#### Automated

- [x] 1.1 Catalog cursor tests reject malformed, partial, conflicting, non-UUID, and non-date boundaries
- [x] 1.2 Catalog use-case and adapter tests cover empty, twelve/thirteen, previous/next, equal-timestamp, error, display-label, zero-like, and per-image fallback behavior
- [x] 1.3 Catalog integration tests prove anonymous, author A, and user B receive identical published-only deterministic pages and never their own drafts
- [x] 1.4 Catalog query source explicitly constrains published status and timestamp while selecting only the card projection
- [x] 1.5 Browser-safe catalog exports contain no Worker-only, Supabase-infrastructure, or deep cross-module imports
- [x] 1.6 Phase 1 repository lint passes
- [x] 1.7 Phase 1 unit and component tests pass
- [x] 1.8 Phase 1 Cloudflare Workers build passes

#### Manual

- [x] 1.9 Clean local reset and catalog integration run pass without leaving seeded rows
- [x] 1.10 Representative catalog query plan is inspected and its MVP indexing conclusion recorded
- [x] 1.11 Logs and test output contain no cookies, keys, signed URLs, or sensitive image data

### Phase 2: Accessible SSR Catalog Surface

#### Automated

- [ ] 2.1 BuildCard tests prove non-linked cards and exactly one named link with footer separation
- [ ] 2.2 Catalog presentation tests cover success, empty, invalid, unavailable, sparse, ordered, and cursor-navigation states
- [ ] 2.3 Public catalog route is SSR-only and contains no direct Supabase query or client hydration
- [ ] 2.4 Desktop and mobile Topbar navigation resolve Builds to the active catalog route
- [ ] 2.5 Revised BuildCard stories compile in the Storybook production bundle
- [ ] 2.17 Valid out-of-range and disappeared-page cursors render paginated-empty recovery without a false global-empty claim

#### Manual

- [ ] 2.10 Phone catalog has one readable column, stable media, reachable paging, and no horizontal overflow
- [ ] 2.14 Empty, malformed-cursor, query-failure, and image-signing-failure states behave distinctly and safely
- [ ] 2.16 Paper and Ink BuildCard stories are reviewed and accepted visual gaps recorded

### Phase 3: Production and Responsive Verification

#### Automated

- [ ] 3.1 Final repository lint passes
- [ ] 3.2 Final unit and component test suite passes
- [ ] 3.3 Final Storybook production build passes
- [ ] 3.4 Final Cloudflare Workers production build passes
- [ ] 3.5 Clean-reset catalog integration suite passes
- [ ] 3.6 Browser/server boundary review finds no server-only catalog code or sensitive values in client-facing imports
- [ ] 3.7 Cross-module review finds no infrastructure deep imports or circular dependency
- [ ] 3.8 Foundation docs name S-04 for catalog exclusion and S-07 for likes persistence

#### Manual

- [ ] 3.9 Final phone and desktop proving subset passes across paging and zero-card states
- [ ] 3.10 Published refresh visibility and draft exclusion are confirmed for every public identity
- [ ] 3.11 Verification evidence, query-plan conclusion, and accepted visual gaps are recorded in change.md
