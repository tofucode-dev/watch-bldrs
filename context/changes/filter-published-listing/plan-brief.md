# Filter Published Listing — Plan Brief

> Full plan: `context/changes/filter-published-listing/plan.md`
> Research: `context/changes/filter-published-listing/research.md`

## What & Why

Visitors must filter the public `/builds` catalog by watch style, movement, dial colour, strap type, and case size with AND semantics, without breaking the existing keyset pagination. This completes roadmap S-05 (US-03, FR-006) and wires the F-05 filter UI kit into the live listing.

## Starting Point

S-04 ships `/builds` with SSR, published-only queries, and `before`/`after` cursors. F-05 ships `FilterControls` / `FilterChip` but nothing connects them to the catalog. Pagination URLs today drop any filter params because `catalogPageUrls` only carries cursors.

## Desired End State

Users apply filters via URL-backed toolbar controls, see only matching published builds, paginate with filters preserved, and get distinct empty/error states. Filter changes reset to page 1. Invalid filter values return 400. Drafts never leak into results.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| URL param names | DB columns (`watch_style`, `movement`, `dial_colour`, `strap_type`, `case_size_mm`) | 1:1 with stored values and `.eq()` columns; stable cache keys | Research |
| URL builder | Shared `buildCatalogListingHref` via `URLSearchParams` | Replaces fragile template literals; shared by server links and client island | Research |
| Invalid filter input | 400 `invalid-filter` state | Matches existing `invalid-cursor` pattern | Research / Plan |
| Filtered empty | Separate `filtered-empty` state | PRD requires empty combined results without implying global catalog is empty | Plan |
| Enum validation | Re-export guards from `@/modules/builds` | Avoids duplicating vocab; respects module public API | Plan |
| Client hydration | `CatalogFilterBar` only (`client:load`) | Grid stays SSR; Radix selects need browser JS | Research |
| Filter change navigation | `window.location.assign` full reload | Keeps SSR as source of truth for listing data | Research |
| Schema / indexes | None in this slice | Columns exist; indexes follow observed query plans | Research |

## Scope

**In scope:** Filter parse/validate/build helpers, AND query in catalog store, pagination URL preservation, filtered-empty + invalid-filter states, `CatalogFilterBar` wiring on `/builds`, unit/component/integration tests.

**Out of scope:** Search, sort, result counts, home Quick Filters (S-10), details links (S-06), likes (S-07), filter indexes, chip a11y fix, loading/disabled toolbar.

## Architecture / Approach

Extend the catalog module vertically: `parseCatalogFilterParams` → `listPublishedBuilds({ filters })` → Supabase `.eq()` chain before keyset boundaries → `buildCatalogListingHref` for Previous/Next. A small client island renders F-05 `FilterControls` with options from `@/modules/builds` and navigates via the shared URL builder. Page composes filter bar + server-rendered `CatalogListing`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Filter contract and query | Parse, validate, URL build, AND filters in store | Filter predicates applied after wrong query stage |
| 2. Server adapter and states | Resolver wiring, filtered-empty, invalid-filter, pagination URLs | Global vs filtered empty conflated |
| 3. Toolbar and integration | Client island, page wiring, integration tests | Filter bar and listing state drift |

**Prerequisites:** F-05 (done), S-04 (done), local Supabase for integration tests.

**Estimated effort:** ~2–3 focused sessions across 3 phases.

## Open Risks & Assumptions

- Small catalog + AND filters will often yield empty results (accepted PRD risk).
- Authenticated authors still require explicit `status = 'published'` in queries.
- Integration tests need seeded builds with varied filter attributes.

## Success Criteria (Summary)

- Five filters work with AND semantics on `/builds`.
- Pagination preserves filters; filter changes reset cursors.
- Filtered empty, invalid filter, and draft exclusion behave correctly.
- Tests and build pass; manual check at phone and desktop widths.
