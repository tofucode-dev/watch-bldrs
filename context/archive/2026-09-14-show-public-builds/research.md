---
date: 2026-09-14T00:30:23+02:00
researcher: Codex
git_commit: 3334a1fbfd508238d533ec53cbcd8be23be6a383
branch: main
repository: watch-bldrs
topic: "show-public-builds"
tags: [research, codebase, catalog, builds, supabase, astro]
status: complete
last_updated: 2026-09-14
last_updated_by: Codex
---

# Research: show-public-builds

**Date**: 2026-09-14T00:30:23+02:00  
**Researcher**: Codex  
**Git Commit**: 3334a1fbfd508238d533ec53cbcd8be23be6a383  
**Branch**: main  
**Repository**: watch-bldrs

## Research Question

What exists today, and what architectural, security, and testing work is required to implement the `show-public-builds` slice (S-04) that lets visitors browse published builds while keeping drafts hidden?

## Summary

S-04 is the public-catalog north star in the roadmap. The repository already has the presentation foundation from F-04 (`BuildCard`, `BuildGrid`, and `ListingLoadMore`), the persisted `builds`/`build_parts` schema, and RLS policies that make published rows and images publicly readable. It does not yet have the feature itself: there is no `catalog` module, public listing route, published-build application use case, public image URL mapping, pagination/infinite-scroll decision, or catalog integration test.

The safest implementation is a thin SSR route backed by a new `catalog` server/application/infrastructure boundary. The query must explicitly constrain `status = 'published'` even though RLS also permits an authenticated author to read their own drafts. It should map rows to the documented `CatalogBuildCard` read model, order by `published_at desc, id desc`, preserve empty results, and keep filter semantics and details/likes out of S-04. The existing private Storage bucket requires short-lived signed URLs for published image paths; signed URLs must never be persisted.

The main planning decisions are pagination versus infinite/scroll loading, whether S-04 owns only `/builds` or also replaces the home-page placeholder, and how to represent `likeCount` before the deferred likes slice exists. The existing shared card also has a known accessibility issue: its media and title are duplicate links, and sparse cards can expose an unnamed media link.

## Detailed Findings

### 1. Current public surface has no live catalog

- [`src/pages/index.astro:1-8`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/pages/index.astro#L1-L8) only composes `Layout` and the static `Welcome` component; there is no `/builds` route.
- [`src/components/Welcome.astro:94-153`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/components/Welcome.astro#L94-L153) renders hardcoded style tiles and “View all” anchors to `#from-the-bench`, not live catalog URLs.
- [`src/components/Welcome.astro:157-180`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/components/Welcome.astro#L157-L180) always renders the static empty logbook state; it does not call a server use case.
- [`src/components/Topbar.astro:7-10`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/components/Topbar.astro#L7-L10) still points “Builds” at the home anchor.
- `src/modules/catalog` does not exist. `src/actions/index.ts:1` registers only the `builds` Actions; catalog reads should remain SSR rather than becoming an Action.

This means the implementation is a vertical slice, not a wiring-only change: route composition, catalog application contract, Supabase query, image signing, loading/empty/error states, and tests are all absent.

### 2. Existing UI foundation is ready to consume catalog read models

- [`src/components/ui/build-card.tsx:11-28`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/components/ui/build-card.tsx#L11-L28) accepts the nullable display fields the catalog model needs (`name`, image, style, movement, dial, strap, case size) plus `likeCount` and a details `href`.
- [`src/components/ui/build-card.tsx:71-99`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/components/ui/build-card.tsx#L71-L99) reserves an `aspect-[4/3]` media frame, supports lazy loading, and renders an optional style label.
- [`src/components/ui/build-card.tsx:123-169`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/components/ui/build-card.tsx#L123-L169) omits absent metadata and keeps the footer action outside the details links.
- [`src/components/ui/build-grid.tsx:9-27`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/components/ui/build-grid.tsx#L9-L27) provides semantic `<ul>/<li>` composition with mobile-first 1/2/3-column layout and caller-order preservation.
- [`src/components/ui/listing-load-more.tsx:16-53`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/components/ui/listing-load-more.tsx#L16-L53) is presentational only. It exposes idle/loading/disabled/end states but owns no cursor, URL, fetch, or accumulated-result state.
- [`src/components/ui/filter-controls.tsx:9-20`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/components/ui/filter-controls.tsx#L9-L20) is controlled and domain-free; URL state, validation, and AND query semantics belong to the later S-05 slice.

The route can therefore render `BuildGrid` and `BuildCard` directly from server-produced `CatalogBuildCard` values without a new React page island.

### 3. Catalog contract is already documented

- [`context/foundation/architecture/data-model.md:80-107`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/architecture/data-model.md#L80-L107) defines `CatalogBuildCard` as an explicit read model: `id`, nullable name/image, watch style, movement, dial colour, strap type, case size, and numeric `likeCount`.
- The same section requires every catalog query to constrain `status = 'published'`, combine active filters with AND semantics, use deterministic `published_at desc, id desc` ordering, return a normal empty result, and validate URL filter parameters before building a query.
- [`context/foundation/architecture/runtime.md:26-62`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/architecture/runtime.md#L26-L62) requires public catalog initial data to be Astro SSR, keeps filters in URL parameters, forbids direct browser Supabase catalog reads, and suggests `/builds` (or `/`) for the listing.
- [`context/foundation/architecture/modules.md:39-66`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/architecture/modules.md#L39-L66) assigns published-list and public-details reads to `catalog`, with `server.ts` as the Worker-only entrypoint and routes limited to composition.

S-04 should implement the published-list portion of that contract. Five-filter parsing and AND behavior are explicitly owned by S-05; public details are S-06; likes and real like counts are S-07.

### 4. Publication and RLS make explicit filtering mandatory

- [`supabase/migrations/20260910201541_build_visibility_and_storage.sql:63-89`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L63-L89) stores publication state, normalized filter columns, `main_image_path`, and `published_at` on `builds`.
- [`supabase/migrations/20260910201541_build_visibility_and_storage.sql:169-174`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L169-L174) permits `status = 'published'` to everyone and also permits an author to select their own draft. A catalog query that relies on RLS without its own status predicate can leak an authenticated author’s draft into their listing.
- [`supabase/migrations/20260910201541_build_visibility_and_storage.sql:195-207`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L195-L207) applies the same publication visibility rule to parts.
- The roadmap defines S-04 as the first public proving story: [`context/foundation/roadmap.md:310-321`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/roadmap.md#L310-L321) requires browsing published builds with pagination or infinite scroll and treats drafts staying hidden as the primary risk.

The application layer should still apply the predicate even though RLS is a second line of defense. This makes the read model correct for every identity and prevents accidental inclusion when the query is reused or changed.

### 5. Published image access needs a catalog-specific mapping

- [`supabase/migrations/20260910201541_build_visibility_and_storage.sql:253-261`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L253-L261) creates a private `build-images` bucket.
- [`supabase/migrations/20260910201541_build_visibility_and_storage.sql:326-339`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L326-L339) allows public-key Storage reads only when the matching parent build is published and the stored path matches the object.
- [`src/modules/builds/infrastructure/supabase-build-store.ts:144-178`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/src/modules/builds/infrastructure/supabase-build-store.ts#L144-L178) is draft-only: it filters by author and `status = 'draft'` and signs an author preview. It cannot be reused as the public catalog store without changing its ownership semantics.
- Historical F-01 research chose a private bucket and short-lived signed URLs; paths, not signed URLs, belong in the database (`context/archive/2026-09-09-build-visibility-and-storage/research.md:131-149`).

Catalog infrastructure should map a published `main_image_path` to a short-lived signed URL after the row has passed the published query. It must handle a missing path or signing failure as a safe nullable image, without exposing raw Storage errors.

### 6. Likes are not ready, so `likeCount` needs an explicit S-04 decision

`build_likes` is deferred and no table exists yet ([`context/foundation/architecture/data-model.md:64-76`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/architecture/data-model.md#L64-L76)). The shared card requires `likeCount`, and the roadmap says details may show zero until the likes slice. S-04 should either supply `0` as a documented placeholder or keep the catalog application model ready for a count field without adding a likes migration. Adding likes persistence here would violate the roadmap’s slice boundary.

### 7. Accessibility and responsive risks are already known

- [`context/foundation/lessons.md:19-24`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/lessons.md#L19-L24) records that BuildCard’s separate media/title links can create an unnamed navigation stop for missing images or untitled builds and duplicate consecutive links for named builds.
- Existing card tests assert the current two-link behavior (`src/components/ui/build-card.test.tsx:15-32`, `:54-66`). A catalog implementation should not add another navigation layer around cards; planning should decide whether S-04 repairs this shared component or records the accepted follow-up.
- The grid is already mobile-first (one column on phones, two at `md`, three at `lg`). The catalog page should preserve this and verify the proving flow at phone and desktop widths per the repository rules.

### 8. Testing coverage is missing exactly where S-04 needs evidence

- [`context/foundation/architecture/testing.md:21-25`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/architecture/testing.md#L21-L25) calls for catalog queries to prove they never return drafts.
- Existing integration tests cover row publication visibility and revocation (`tests/integration/build-visibility.test.ts:37-66`, `:135-192`) and published-image access (`tests/integration/build-image-storage.test.ts:167-205`), but no catalog integration tests exist for published-only selection, deterministic ordering, pagination, or empty results.
- [`context/foundation/architecture/testing.md:41-52`](https://github.com/tofucode-dev/watch-bldrs/blob/3334a1fbfd508238d533ec53cbcd8be23be6a383/context/foundation/architecture/testing.md#L41-L52) expects the E2E proving flow to sign in, create a draft, confirm privacy, publish, find the build through the catalog, open details, and like/unlike it later.

At minimum, S-04 needs application/unit tests for mapping and ordering, integration coverage as anonymous/author A/user B proving drafts are absent, and component/E2E coverage for success, empty, loading/error, and responsive listing states.

## Code References

- `src/pages/index.astro:1-8` — current static home route; no catalog composition.
- `src/components/Welcome.astro:94-180` — hardcoded style links and permanent empty-state placeholder.
- `src/components/Topbar.astro:7-10` — current Builds navigation target.
- `src/components/ui/build-card.tsx:11-171` — reusable nullable listing card and known duplicate-link accessibility shape.
- `src/components/ui/build-grid.tsx:5-29` — responsive semantic grid.
- `src/components/ui/listing-load-more.tsx:9-51` — presentational load-more control.
- `src/modules/builds/infrastructure/supabase-build-store.ts:117-201` — existing draft-only store boundary.
- `src/modules/builds/application/ports/build-store.ts:3-7` — existing store port has no public-list operation.
- `supabase/migrations/20260910201541_build_visibility_and_storage.sql:63-339` — schema, RLS, and private image policies.
- `context/foundation/architecture/data-model.md:80-107` — catalog read model and query invariants.
- `context/foundation/architecture/runtime.md:26-62` — SSR and route responsibilities.
- `context/foundation/roadmap.md:310-321` — S-04 outcome and unresolved pagination choice.

## Architecture Insights

1. **Use the catalog module, not the builds mutation module.** `builds` owns authoring and draft lifecycle; `catalog` owns public read models. The public route should import only `@/modules/catalog/server` and render presentation components.
2. **Treat RLS and query predicates as separate controls.** RLS protects the database, but author-visible drafts mean the catalog query must still say `status = 'published'`.
3. **Keep read-only content SSR.** Initial catalog data, empty state, and card markup should render on the Worker. Hydrate only a future interactive control; do not create a client store for listing data.
4. **Keep pagination state at the route/application boundary.** `BuildGrid` and `ListingLoadMore` are intentionally dumb. Choose a stable URL/cursor contract before wiring them, and retain `published_at,id` as the tie-break ordering.
5. **Map database rows into explicit display models.** Do not pass generated Supabase row types or mutation entities into `BuildCard`; map nullable fields and safe image URLs at the infrastructure/application boundary.

## Historical Context (from prior changes)

- `context/archive/2026-09-13-listing-ui-components/plan.md` — F-04 deliberately stopped at shared card/grid/load-more presentation and excluded catalog routes, live queries, signed URLs, and pagination state.
- `context/archive/2026-09-13-filter-ui-components/plan.md` — F-05 deliberately stopped at controlled filter widgets; URL state, AND query construction, result counts, and pagination integration belong to S-05.
- `context/archive/2026-09-09-build-visibility-and-storage/research.md` — F-01 chose private Storage plus publication-checked signed URLs and deferred catalog reads until later slices.
- `context/archive/2026-09-13-create-draft-build/plan.md` — S-02 shipped draft authoring but no publish Action or public listing; S-04 depends on S-03 publishing.
- `context/foundation/roadmap.md:54-60` — sequencing keeps S-04 before filters, details, likes, account listing, and home recency.

## Related Research

- `context/archive/2026-09-09-build-visibility-and-storage/research.md`
- `context/archive/2026-09-11-authoring-form-components/research.md`
- `context/archive/2026-09-12-photo-upload-component/research.md`
- `context/archive/2026-09-13-listing-ui-components/plan.md`
- `context/archive/2026-09-13-filter-ui-components/plan.md`

## Open Questions

1. **Loading model:** choose numbered pagination, URL cursor pagination, or an SSR-first/infinite-scroll approach. The roadmap leaves this unresolved; the choice affects route parameters, accessibility, and how `ListingLoadMore` is wired.
2. **Route/home scope:** should S-04 introduce `/builds` and retarget Topbar only, or also replace the home page’s static “Recently published builds” placeholder? The architecture allows either `/builds` or `/`, while current home and nav are static.
3. **Publish prerequisite:** confirm the S-03 publish slice is present or sequence it before S-04. Current code has no publish Action.
4. **Image signing failure:** decide whether a failed signed URL yields a neutral placeholder (recommended) or a page-level error. The card contract already supports `imageUrl: null`.
5. **Like count placeholder:** document whether S-04 passes `0` until S-07 or introduces a count port that returns zero without a `build_likes` table.
6. **BuildCard accessibility fix:** decide whether to repair the duplicate/unnamed media link as part of S-04, before catalog adoption, or record it as a follow-up with a user-visible risk.
