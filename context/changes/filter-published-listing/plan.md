# Filter Published Listing Implementation Plan

## Overview

Wire five AND filters (watch style, movement, dial colour, strap type, case size) onto the existing `/builds` SSR catalog without replacing S-04 keyset pagination. Filter state lives in URL search parameters with DB-aligned param names. The catalog module gains parse/validate/build helpers, extends the published-list query with `.eq()` predicates, preserves active filters in Previous/Next links, and mounts the existing F-05 `FilterControls` kit as a small client island that performs full-page navigation on change.

## Current State Analysis

F-05 delivered domain-free `FilterControls` and `FilterChip` in `src/components/ui/` with Storybook and jsdom tests. S-04 delivered `/builds` with composite keyset cursors (`before`/`after`, page size 12), published-only Supabase queries, and non-hydrated `CatalogListing` presentation. The database already stores all five filter dimensions on `public.builds`; no schema migration is required.

S-05 wiring is entirely absent: `catalogPageUrls` emits cursor-only URLs, `resolveCatalogListing` parses pagination only, the store applies no attribute filters, and `FilterControls` is not imported outside the UI kit.

### Key Discoveries:

- Filter state must be URL search parameters (`context/foundation/architecture/runtime.md:71`).
- Catalog owns filters (`context/foundation/architecture/modules.md:34-41`).
- Keyset pagination lesson: preserve filters in every pagination URL; reset cursors on filter change (`context/foundation/lessons.md:26-31`).
- S-04 deferred unrelated query params until S-05 (`context/archive/2026-09-14-show-public-builds/plan.md:184`).
- `builds/index.ts` already exports option arrays; type guards live in `domain/options.ts` but are not yet re-exported from the public module entrypoint.
- `CatalogListingState` has global `empty` and `paginated-empty` but no filtered-empty or invalid-filter variants (`src/modules/catalog/presentation/catalog-listing.tsx:7-17`).
- Testing matrix expects unit coverage for filter normalization/AND query and component coverage for URL updates (`context/foundation/architecture/testing.md:11`, `testing.md:35`).

## Desired End State

Anyone can open `/builds`, apply one or more filters, and see only published builds matching every active filter. Combined filters use AND semantics. Clearing filters restores the unfiltered published listing. Filtered empty results show distinct copy with a clear-filters path; the system does not relax filters automatically. Drafts never appear for anonymous visitors, other users, or authenticated authors browsing the public catalog.

Previous/Next pagination continues to work without client-side JavaScript. Pagination links preserve all active filter params. Changing a filter resets to the first page (cursors stripped). Invalid filter values return a safe 400 state parallel to invalid cursors. Linkable URLs use stable DB-aligned keys (`watch_style`, `movement`, `dial_colour`, `strap_type`, `case_size_mm`) and stored enum labels (e.g. `nh35`, `steel_bracelet`).

### Verification

- Unit tests cover filter parse/validate, URL build order, AND query construction, and pagination URL preservation.
- Integration tests prove AND semantics, filter + pagination combo, and published-only identity matrix with filters active.
- Component tests prove the filter toolbar updates URLs correctly (strip cursors on change, clear all → `/builds`).
- Manual check at phone (~390px) and desktop widths: filter selects, chips, Clear all, pagination with filters, filtered empty state.

## What We're NOT Doing

- Schema migrations, new indexes, or filter-specific database functions (measure query plans first per `data-model.md`).
- Search, sort controls, result counts, ranking tabs, or home Quick Filter composition (S-10).
- Public build details links on cards (S-06).
- Likes persistence or non-zero like counts (S-07).
- `FilterControls` loading/disabled forwarding or focus restoration after chip remove (deferred from F-05).
- Duplicate-"Other" chip accessible-name fix from F-05 plan-review (optional follow-up).
- E2E harness additions solely for this slice.
- Changing pagination model (offset, infinite scroll, or page numbers).

## Implementation Approach

Extend the catalog module vertically from application contracts outward:

1. Add browser-safe filter parse/validate and URL build helpers in `catalog/application/`.
2. Extend the store port, use case, and Supabase adapter to accept optional filters and chain `.eq()` before keyset boundaries.
3. Update `resolveCatalogListing` to return `{ state, filters }`, map invalid input to 400 with empty `filters`, distinguish filtered-empty from global empty, and build pagination URLs via `buildCatalogListingHref`.
4. Add a `CatalogFilterBar` client island that feeds `FilterControls` from `@/modules/builds` option arrays and navigates via `window.location.assign(buildCatalogListingHref(...))`.
5. Keep `CatalogListing` server-rendered without hydration; only the filter toolbar hydrates.

Re-export enum validators from `@/modules/builds`. Move `CASE_SIZE_MIN_MM` / `CASE_SIZE_MAX_MM` into `builds/domain/options.ts` and re-export them from the public entrypoint so catalog and the filter island import only named vocab — never `BuildForm`.

## Critical Implementation Details

### State sequencing

Apply dimension `.eq()` filters in the Supabase adapter **before** `applyAfterBoundary` / `applyBeforeBoundary`. Keyset cursor logic is unchanged; cursors are only valid within the same active filter set. Client filter changes must delete `before` and `after` from the URL before navigation.

### User experience spec

Three zero-card outcomes remain distinct: global empty (no published builds), filtered empty (active filters, zero matches), and paginated-empty (valid cursor, no rows). Invalid filter params and invalid cursors both return 400 with recovery links. The filter toolbar renders on all `/builds` states so users can adjust filters from error pages; global/filtered empty states include appropriate recovery copy (`Clear filters` → `/builds` for filtered empty; existing first-page link for paginated-empty should preserve filters when present).

## Phase 1: Filter Contract and Published Query

### Overview

Introduce the URL filter contract, validation boundary, shared href builder, and AND filter support in the catalog application and Supabase adapter.

### Changes Required:

#### 1. Builds public validation exports

**Files**: `src/modules/builds/index.ts`, `src/modules/builds/domain/options.ts`, `src/modules/builds/domain/validate-draft.ts`

**Intent**: Let the catalog module validate filter values through the supported public entrypoint without deep imports, and keep the `/builds` client island free of `BuildForm` / `astro:actions`.

**Contract**: Re-export `isWatchStyle`, `isMovement`, `isDialColour`, `isStrapType` from `./domain/options`. Move `CASE_SIZE_MIN_MM` and `CASE_SIZE_MAX_MM` from `./domain/validate-draft` into `./domain/options` (validate-draft imports them from there) and re-export those constants from `src/modules/builds/index.ts`. Catalog files and `CatalogFilterBar` import only these named vocab exports — never `BuildForm`.

#### 2. Catalog filter types, parse, and URL build

**Files**: `src/modules/catalog/application/catalog-filters.ts`, `src/modules/catalog/application/catalog-filters.test.ts`, `src/modules/catalog/application/catalog-url.ts`, `src/modules/catalog/application/catalog-url.test.ts`

**Intent**: Centralize the S-05 URL contract so server pagination links and the client filter island share one implementation.

**Contract**: `CatalogFilters` holds optional `watch_style`, `movement`, `dial_colour`, `strap_type`, and `case_size_mm` (number). `parseCatalogFilterParams(searchParams)` reads DB-aligned keys, treats absent or empty-string values as inactive, validates enums via builds guards, validates `case_size_mm` as integer 20–70, and throws `InvalidCatalogFilterError` on unknown values. `hasActiveCatalogFilters(filters)` returns whether any dimension is set. `buildCatalogListingHref(filters, pagination)` uses `URLSearchParams`, emits filter params in fixed order (`watch_style`, `movement`, `dial_colour`, `strap_type`, `case_size_mm`), omits inactive filters, appends `after` or `before` after filters, and returns `/builds` when the query string is empty.

#### 3. Invalid filter error

**File**: `src/modules/catalog/domain/errors.ts`

**Intent**: Give the server adapter a typed, safe failure for malformed filter input.

**Contract**: Add `InvalidCatalogFilterError` parallel to `InvalidCatalogCursorError`.

#### 4. Store port and use case extension

**Files**: `src/modules/catalog/application/ports/catalog-store.ts`, `src/modules/catalog/application/list-published-builds.ts`, `src/modules/catalog/application/list-published-builds.test.ts`

**Intent**: Pass validated filters through the existing published-list orchestration without changing cursor derivation rules.

**Contract**: `ListPublishedInput` and `ListPublishedBuildsInput` accept optional `filters: CatalogFilters`. `listPublishedBuilds` forwards filters to the store unchanged. Unit tests prove cursor derivation still works when filters are present.

#### 5. Supabase adapter AND filters

**Files**: `src/modules/catalog/infrastructure/supabase-catalog-store.ts`, `src/modules/catalog/infrastructure/supabase-catalog-store.test.ts`

**Intent**: Apply AND semantics at the database boundary while preserving published-only and keyset pagination behavior.

**Contract**: For each set filter field, chain `.eq(column, value)` after `status = 'published'` and before keyset boundary helpers. Adapter tests assert query construction includes combined filters, published constraint remains, and pagination slicing behavior is unchanged.

### Success Criteria:

#### Automated Verification:

- Filter parse rejects unknown enum values and out-of-range case sizes
- `buildCatalogListingHref` emits stable param order and omits empty filters
- Store adapter tests prove AND `.eq()` chaining before keyset boundaries
- `npm run test -- src/modules/catalog/application/catalog-filters.test.ts src/modules/catalog/application/catalog-url.test.ts src/modules/catalog/infrastructure/supabase-catalog-store.test.ts src/modules/catalog/application/list-published-builds.test.ts` passes
- `npm run lint` passes

#### Manual Verification:

- N/A for this phase (no UI yet)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the automated checks are sufficient before proceeding to the next phase.

---

## Phase 2: Server Adapter and Listing States

### Overview

Wire filter parsing and URL building into `resolveCatalogListing`, add filtered-empty and invalid-filter presentation states, and preserve filters in pagination links.

### Changes Required:

#### 1. Server resolver extension

**Files**: `src/modules/catalog/server.ts`, `src/modules/catalog/server.test.ts`

**Intent**: Make `/builds` the single server entrypoint for filter + pagination orchestration, and give the page validated filters without a second parse.

**Contract**: Change `resolveCatalogListing` to return `{ state: CatalogListingState, filters: CatalogFilters }`. Parse filters before pagination. On `InvalidCatalogFilterError`, return `{ state: { status: "invalid-filter" }, filters: {} }` so the toolbar can still mount. When `direction === "first"`, zero rows, and `hasActiveCatalogFilters(filters)`, return `{ state: { status: "filtered-empty", clearFiltersUrl: "/builds" }, filters }` instead of global `empty`. Replace `catalogPageUrls` with `buildCatalogListingHref(filters, …)` for Previous/Next using the same validated `filters` object as the query. The page must not re-parse `searchParams`. Delete unused `listPublishedBuildsForRequest` (zero callers; it would otherwise remain pagination-only).

#### 2. Listing presentation states

**Files**: `src/modules/catalog/presentation/catalog-listing.tsx`, `src/modules/catalog/presentation/catalog-listing.test.tsx`, `src/modules/catalog/index.ts`

**Intent**: Render distinct copy and recovery paths for filtered-empty and invalid-filter without hydrating the grid.

**Contract**: Extend `CatalogListingState` with `filtered-empty` (includes `clearFiltersUrl`) and `invalid-filter`. Filtered-empty copy states no builds match the active filters and links to `clearFiltersUrl`. Invalid-filter copy mirrors invalid-cursor tone with recovery to `/builds`. Paginated-empty recovery link uses `buildCatalogListingHref(filters)` when filters are active (pass `filters` into state or a `firstPageUrl` field). Success state unchanged aside from pagination URLs carrying filters.

#### 3. Route HTTP mapping

**File**: `src/pages/builds/index.astro`

**Intent**: Map new error states to correct HTTP status codes.

**Contract**: Destructure `{ state, filters }` from the resolver (ignore `filters` until Phase 3). Map `state.status === "invalid-filter"` and `invalid-cursor` to HTTP 400. Other states unchanged. `Cache-Control: no-store` preserved. Pass `state` into `<CatalogListing />`.

### Success Criteria:

#### Automated Verification:

- `server.test.ts` covers `{ state, filters }` return shape, filter preservation in pagination URLs, filtered-empty vs global empty, invalid-filter mapping with `filters: {}`
- `catalog-listing.test.tsx` covers filtered-empty copy, invalid-filter recovery, and paginated-empty link with filters
- `npm run test -- src/modules/catalog/server.test.ts src/modules/catalog/presentation/catalog-listing.test.tsx` passes
- `npm run build` passes

#### Manual Verification:

- N/A for this phase (filter UI not wired yet)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human before proceeding to Phase 3.

---

## Phase 3: Filter Toolbar, Page Wiring, and Integration Proof

### Overview

Mount `FilterControls` on `/builds`, connect client navigation to the shared URL builder, and add integration plus component tests for the full filter + pagination flow.

### Changes Required:

#### 1. Catalog filter toolbar island

**Files**: `src/modules/catalog/presentation/catalog-filter-bar.tsx`, `src/modules/catalog/presentation/catalog-filter-bar.test.tsx`, `src/modules/catalog/presentation/catalog-filter-dimensions.ts`

**Intent**: Provide the S-05 consumer for F-05 `FilterControls` without putting domain vocabulary in `src/components/ui/`.

**Contract**: `catalog-filter-dimensions.ts` maps stable dimension ids to URL param names, builds dimension option lists from named `@/modules/builds` exports (`WATCH_STYLE_OPTIONS`, `MOVEMENT_OPTIONS`, `DIAL_COLOUR_OPTIONS`, `STRAP_TYPE_OPTIONS`) plus generated case-size options from `CASE_SIZE_MIN_MM`–`CASE_SIZE_MAX_MM` with `{ value: "", label: "All" }` prepended. Do not import `BuildForm`. `CatalogFilterBar` accepts `initialFilters: CatalogFilters`, renders `FilterControls`, and on dimension change or clear all calls `window.location.assign(buildCatalogListingHref(nextFilters, { kind: "first" }))`. Clear all navigates to `/builds`. Export from `src/modules/catalog/index.ts`.

#### 2. Page composition

**File**: `src/pages/builds/index.astro`

**Intent**: SSR initial filter state into the client island while keeping the listing server-rendered.

**Contract**: Use `filters` from the Phase 2 resolver return (including `{}` on invalid-filter). Render `<CatalogFilterBar client:load initialFilters={filters} />` above `<CatalogListing state={state} />` on every `/builds` status so users can adjust filters from empty and error pages. Do not hydrate the listing grid. Do not re-parse `Astro.url.searchParams` on the page.

#### 3. Integration tests

**File**: `tests/integration/catalog-filters.test.ts` (new)

**Intent**: Prove AND semantics and filter + pagination stability against live Supabase without mutating the S-04 pagination fixture.

**Contract**: Do not change `tests/integration/catalog-listing.test.ts` seeds (all published rows are `diver`/`nh35`). Seed a separate set of published builds with varied `watch_style`, `movement`, `dial_colour`, `strap_type`, and `case_size_mm`, plus at least one draft. Assert single-filter and multi-filter AND results exclude non-matching and draft rows. Assert forward/backward pagination with active filters does not skip or duplicate rows. Assert anon, author A, and user B see identical filtered published results.

### Success Criteria:

#### Automated Verification:

- `catalog-filter-bar.test.tsx` proves dimension change strips cursors and builds correct href; clear all → `/builds`
- Filter island imports only named vocab from `@/modules/builds` (no `BuildForm`, no `astro:actions`)
- Integration tests pass: `npm run test:integration -- tests/integration/catalog-filters.test.ts`
- `npm run test`, `npm run lint`, and `npm run build` pass

#### Manual Verification:

- `/builds` filter + pagination flow verified at phone and desktop widths
- Filtered empty, invalid filter 400, and draft exclusion verified manually

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests

- `parseCatalogFilterParams`: valid enums, case size bounds, empty/absent params, invalid enum, invalid case size
- `buildCatalogListingHref`: param order, filter + cursor composition, empty → `/builds`
- Supabase adapter: AND chain, filters + after/before boundaries
- `listPublishedBuilds`: cursor derivation unchanged with filters

### Integration Tests

- New `tests/integration/catalog-filters.test.ts` with varied attribute seeds (do not mutate the S-04 25-row fixture)
- AND filter semantics on seeded published rows
- Pagination with active filters (no skip/duplicate)
- Identity matrix with filters (anon, author A, user B)

### Component Tests

- `CatalogFilterBar` URL navigation on change and clear
- `CatalogListing` filtered-empty, invalid-filter, paginated-empty with filters

### Manual Testing Steps

1. Open `/builds` unfiltered; paginate forward and back.
2. Set `watch_style=diver`; confirm URL and results.
3. Add `movement=nh35`; confirm AND narrowing.
4. Paginate with filters active; confirm URL keeps filter params.
5. Change one filter; confirm cursors removed and page resets.
6. Set filters with no matches; confirm filtered-empty and Clear filters.
7. Visit `?watch_style=invalid`; confirm 400 invalid-filter page.
8. Repeat steps 1–6 at ~390px width.

## Performance Considerations

No new indexes in this slice. The adapter still fetches `pageSize + 1` rows. Filter predicates are equality checks on low-cardinality enums and one integer column; acceptable at MVP catalog size. Keep `Cache-Control: no-store` because responses include short-lived signed URLs.

## Migration Notes

No database migration. Existing published rows with NULL filter attributes simply do not match active `.eq()` filters (correct per `data-model.md`).

## References

- Research: `context/changes/filter-published-listing/research.md` (URL Query Contract section)
- PRD: US-03, FR-006 (`context/foundation/prd.md`)
- S-04 plan: `context/archive/2026-09-14-show-public-builds/plan.md`
- F-05 plan: `context/archive/2026-09-13-filter-ui-components/plan.md`
- Keyset + filters lesson: `context/foundation/lessons.md`
- Catalog listing: `src/modules/catalog/server.ts`, `src/modules/catalog/presentation/catalog-listing.tsx`
- Filter UI kit: `src/components/ui/filter-controls.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Filter Contract and Published Query

#### Automated

- [x] 1.1 Filter parse rejects unknown enum values and out-of-range case sizes
- [x] 1.2 `buildCatalogListingHref` emits stable param order and omits empty filters
- [x] 1.3 Store adapter tests prove AND `.eq()` chaining before keyset boundaries
- [x] 1.4 `npm run test -- src/modules/catalog/application/catalog-filters.test.ts src/modules/catalog/application/catalog-url.test.ts src/modules/catalog/infrastructure/supabase-catalog-store.test.ts src/modules/catalog/application/list-published-builds.test.ts` passes
- [x] 1.5 `npm run lint` passes

### Phase 2: Server Adapter and Listing States

#### Automated

- [ ] 2.1 `server.test.ts` covers `{ state, filters }` return shape, filter preservation in pagination URLs, filtered-empty vs global empty, invalid-filter mapping with `filters: {}`
- [ ] 2.2 `catalog-listing.test.tsx` covers filtered-empty copy, invalid-filter recovery, and paginated-empty link with filters
- [ ] 2.3 `npm run test -- src/modules/catalog/server.test.ts src/modules/catalog/presentation/catalog-listing.test.tsx` passes
- [ ] 2.4 `npm run build` passes

### Phase 3: Filter Toolbar, Page Wiring, and Integration Proof

#### Automated

- [ ] 3.1 `catalog-filter-bar.test.tsx` proves dimension change strips cursors and builds correct href; clear all → `/builds`
- [ ] 3.2 Filter island imports only named vocab from `@/modules/builds` (no `BuildForm`, no `astro:actions`)
- [ ] 3.3 Integration tests pass: `npm run test:integration -- tests/integration/catalog-filters.test.ts`
- [ ] 3.4 `npm run test`, `npm run lint`, and `npm run build` pass

#### Manual

- [ ] 3.5 `/builds` filter + pagination flow verified at phone and desktop widths
- [ ] 3.6 Filtered empty, invalid filter 400, and draft exclusion verified manually
