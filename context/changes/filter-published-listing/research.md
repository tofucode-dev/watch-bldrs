---
date: 2026-09-14T17:40:00+02:00
researcher: Cursor Agent
git_commit: 14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8
branch: main
repository: watch-bldrs
topic: "Filter published listing (S-05): wire five AND filters to /builds without breaking keyset pagination"
tags: [research, codebase, catalog, filters, pagination, filter-controls]
status: complete
last_updated: 2026-09-14
last_updated_by: Cursor Agent
last_updated_note: "Added URL query contract section (param names, build/parse rules, examples)"
---

# Research: Filter published listing (S-05)

**Date**: 2026-09-14T17:40:00+02:00  
**Researcher**: Cursor Agent  
**Git Commit**: [`14de398`](https://github.com/tofucode-dev/watch-bldrs/commit/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8)  
**Branch**: main  
**Repository**: [tofucode-dev/watch-bldrs](https://github.com/tofucode-dev/watch-bldrs)

## Research Question

What exists today for the `filter-published-listing` change (roadmap S-05), and what must be built to let visitors filter the published `/builds` listing by watch style, movement, dial colour, strap type, and case size with AND semantics — without breaking the existing keyset pagination from S-04?

## Summary

**Prerequisites are met.** F-05 delivered domain-free `FilterControls` and `FilterChip` UI primitives. S-04 delivered the `/builds` SSR catalog with composite keyset pagination (`before`/`after` cursors, page size 12). The database already stores all five filter dimensions on `public.builds` as four nullable Postgres enums plus `case_size_mm` integer (20–70).

**S-05 is entirely wiring work.** No filter URL parsing, no AND query construction, no `FilterControls` on `/builds`, and pagination URLs drop any future filter params because [`catalogPageUrls`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/server.ts#L28-L33) only carries `before`/`after`.

The implementation path is a thin vertical extension of the existing catalog module:

1. Parse and validate filter search params at the application boundary.
2. Pass active filters through `listPublishedBuilds` → `CatalogStore.listPublished`.
3. Chain `.eq()` predicates in `supabase-catalog-store.ts` before keyset boundaries.
4. Preserve active filters in every pagination URL; reset cursors on filter change.
5. Mount `FilterControls` as a client island on `/builds` that updates the URL.

Key planning decisions still open: canonical URL param names, invalid-param handling (400 vs ignore), filtered-empty vs global-empty UX, and whether catalog imports enum validators from `@/modules/builds`.

## Detailed Findings

### Product requirements (US-03 / FR-006)

From [`context/foundation/prd.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/foundation/prd.md):

- Five filter dimensions: watch style (primary), movement, dial colour, strap type, case size.
- AND semantics across active filters.
- Drafts never appear; clearing filters restores unfiltered listing.
- Empty combined results show an empty state — do not relax filters.
- Empty combined results are an accepted PRD risk on a small catalog.

Roadmap S-05 explicitly requires reusing S-04 listing and load-more behavior rather than replacing it ([`roadmap.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/foundation/roadmap.md#L287-L297)).

### Current catalog stack (S-04 — done)

**Request flow:**

```
/builds?before|after=<cursor>
  → src/pages/builds/index.astro
  → resolveCatalogListing (catalog/server.ts)
  → parseCatalogPaginationParams (catalog-cursor.ts)
  → listPublishedBuilds (application)
  → createSupabaseCatalogStore.listPublished (infrastructure)
  → CatalogListing (presentation)
```

**Pagination model:**

| Param | Meaning |
|-------|---------|
| *(none)* | First page |
| `after=<cursor>` | Older builds (forward) |
| `before=<cursor>` | Newer builds (backward) |

- Composite keyset cursor: `{ publishedAt, id }` encoded as base64url JSON.
- Page size: 12 (`CATALOG_PAGE_SIZE`).
- `before` and `after` are mutually exclusive.
- Ordering: `published_at DESC, id DESC`.
- Fetches `pageSize + 1` rows to detect `hasMore`.

**Current query constraints** ([`supabase-catalog-store.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/infrastructure/supabase-catalog-store.ts)):

```typescript
client.from("builds")
  .select(CARD_SELECT)
  .eq("status", "published")
  .not("published_at", "is", null)
```

Filter columns are already in `CARD_SELECT` and mapped to display labels via `display-labels.ts`, but no `.eq()` filter predicates exist.

**Pagination URL gap** — [`catalogPageUrls`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/server.ts#L28-L33) builds `/builds?before=…` / `/builds?after=…` only. Active filters will be lost on page navigation until this is extended.

**Presentation** — [`catalog-listing.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/presentation/catalog-listing.tsx) handles `success`, `empty`, `paginated-empty`, `invalid-cursor`, and `unavailable` states. No `FilterControls` integration. `empty` is global-only today; S-05 likely needs a filtered-empty variant.

**Tests:**

| File | Coverage |
|------|----------|
| `catalog-cursor.test.ts` | Cursor encode/decode, param parsing |
| `list-published-builds.test.ts` | Cursor derivation per direction |
| `supabase-catalog-store.test.ts` | Published-only constraint, pagination |
| `server.test.ts` | `resolveCatalogListing` state mapping |
| `catalog-listing.test.tsx` | UI states, pagination links |
| `tests/integration/catalog-listing.test.ts` | Identity matrix (anon/author/user B), forward/backward pagination without skip/duplicate |

No filter integration tests exist yet.

### Filter UI kit (F-05 — done, unwired)

**Components** in `src/components/ui/`:

| Component | File | Role |
|-----------|------|------|
| `FilterControls` | [`filter-controls.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/components/ui/filter-controls.tsx) | Controlled toolbar: 5 labeled `OptionsSelect`s, derived chips, Clear all |
| `FilterChip` | [`filter-chip.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/components/ui/filter-chip.tsx) | Removable active-filter chip |
| `OptionsSelect` | [`options-select.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/components/ui/options-select.tsx) | Radix select with `""` = unset via sentinel mapping |

**API contract** (domain-free, caller-fed):

```typescript
type FilterDimension = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value?: string;
};

type FilterControlsProps = {
  dimensions: FilterDimension[];
  onDimensionChange: (id: string, value: string) => void;
  onClearAll: () => void;
};
```

- `""` / `undefined` = inactive ("All").
- Chips render only for non-empty values.
- Chip remove → `onDimensionChange(id, "")`.
- Clear all → `onClearAll()` (caller resets all dimensions).
- Requires client hydration (Radix Select) — same pattern as `BuildForm` (`client:load`).

**Storybook dimension IDs** (UI only, not URL contract):

| Dimension | Story `id` | Production enum source |
|-----------|------------|------------------------|
| Watch style | `style` | `WATCH_STYLE_OPTIONS` in [`options.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/builds/domain/options.ts) |
| Movement | `movement` | `MOVEMENT_OPTIONS` |
| Dial colour | `dial-colour` | `DIAL_COLOUR_OPTIONS` |
| Strap type | `strap-type` | `STRAP_TYPE_OPTIONS` |
| Case size | `case-size` | Generated integers 20–70 (`CASE_SIZE_MIN_MM` / `CASE_SIZE_MAX_MM` in `validate-draft.ts`) |

`FilterControls` is **not imported** anywhere outside `src/components/ui/` — zero production wiring.

F-05 explicitly deferred URL state, AND queries, pagination integration, loading/disabled toolbar, and focus restoration to S-05 ([`plan.md` Phase 2 contract](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/archive/2026-09-13-filter-ui-components/plan.md#L138-L144)).

### Data model and schema

**Filterable columns** on `public.builds`:

| Filter | DB column | Type | Nullable |
|--------|-----------|------|----------|
| Watch style | `watch_style` | `public.watch_style` enum | Yes |
| Movement | `movement` | `public.movement` enum | Yes |
| Dial colour | `dial_colour` | `public.dial_colour` enum | Yes |
| Strap type | `strap_type` | `public.strap_type` enum | Yes |
| Case size | `case_size_mm` | `integer` (CHECK 20–70) | Yes |

**Not filterable:** `hands_style` (stored but excluded per PRD).

**Enum stored values** (from migration `20260910201541_build_visibility_and_storage.sql`):

- `watch_style`: diver, field, dress, gmt, pilot, integrated, other
- `movement`: nh35, nh36, nh34, miyota_8215, other
- `dial_colour`: black, white, blue, green, silver, other
- `strap_type`: leather, nato, rubber, steel_bracelet, other

**Canonical app vocabulary** with type guards (`isWatchStyle`, etc.) lives in [`src/modules/builds/domain/options.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/builds/domain/options.ts). Catalog currently imports nothing from `builds`.

**Query rules** from [`data-model.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/foundation/architecture/data-model.md#L98-L107):

- Always `status = 'published'`.
- AND semantics across active filters.
- Ignore only absent URL params; do not relax on NULL DB values.
- Deterministic order: `published_at DESC, id DESC`.
- Validate and normalize URL params before querying.
- Add indexes from observed query plans, not speculation.

**RLS** (`builds_select`): published rows visible to all; drafts visible only to author. Catalog must keep explicit `status = 'published'` because authenticated authors would otherwise see their own drafts. Integration tests confirm identical published-only results for anon, author A, and user B.

**Indexes:** only `builds_author_id_idx` exists. No indexes on `status`, `published_at`, or filter columns. Ship filters without new indexes first; measure with `EXPLAIN ANALYZE` on seeded data.

### Recommended implementation touchpoints

| Layer | File | Change |
|-------|------|--------|
| Filter parsing | New `catalog/application/catalog-filters.ts` | Parse URL params, validate against enum guards, build `CatalogFilters` type |
| Port | [`catalog-store.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/application/ports/catalog-store.ts) | Add `filters` to `ListPublishedInput` |
| Use case | [`list-published-builds.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/application/list-published-builds.ts) | Pass filters to store |
| Infrastructure | [`supabase-catalog-store.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/infrastructure/supabase-catalog-store.ts) | Chain `.eq()` before keyset boundaries |
| Server adapter | [`server.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/server.ts) | Parse filters in `resolveCatalogListing`; extend `catalogPageUrls` |
| Presentation | New `catalog-filter-bar.tsx` or extend `catalog-listing.tsx` | Mount `FilterControls` client island; URL navigation on change |
| Page | [`builds/index.astro`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/pages/builds/index.astro) | Pass initial filter state from SSR |
| Tests | Unit + integration | Filter parsing, AND query, pagination + filter combo, identity matrix |

**Query pattern** (apply filters before keyset boundaries):

```typescript
let query = client.from("builds").select(CARD_SELECT)
  .eq("status", "published").not("published_at", "is", null);

if (filters.watchStyle)  query = query.eq("watch_style", filters.watchStyle);
if (filters.movement)    query = query.eq("movement", filters.movement);
if (filters.dialColour)  query = query.eq("dial_colour", filters.dialColour);
if (filters.strapType)   query = query.eq("strap_type", filters.strapType);
if (filters.caseSizeMm)  query = query.eq("case_size_mm", filters.caseSizeMm);

// then existing order + keyset pagination
```

**Pagination + filter rules** (from [`lessons.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/foundation/lessons.md#L26-L31)):

- Apply same AND filters on every request.
- Preserve filters in every `before`/`after` URL.
- Reset to first page (strip cursors) when filters change.
- Cursors reused after filter changes point at the wrong slice.

**URL update on filter change** (client island):

```
/builds?watch_style=diver&movement=nh35&case_size_mm=40
  → user changes movement
  → navigate to /builds?watch_style=diver&case_size_mm=40  (cursors stripped)
  → full SSR reload
```

`FilterControls` uses callbacks, not `<form method="GET">`. The S-05 consumer owns URL construction.

## Code References

- [`src/pages/builds/index.astro`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/pages/builds/index.astro) — SSR catalog route entry
- [`src/modules/catalog/server.ts:28-87`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/server.ts#L28-L87) — `catalogPageUrls`, `resolveCatalogListing`
- [`src/modules/catalog/application/catalog-cursor.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/application/catalog-cursor.ts) — cursor encode/decode, `parseCatalogPaginationParams`
- [`src/modules/catalog/infrastructure/supabase-catalog-store.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/infrastructure/supabase-catalog-store.ts) — published-only query, keyset pagination
- [`src/modules/catalog/presentation/catalog-listing.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/presentation/catalog-listing.tsx) — listing UI states (no filters)
- [`src/components/ui/filter-controls.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/components/ui/filter-controls.tsx) — ready but unwired filter toolbar
- [`src/modules/builds/domain/options.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/builds/domain/options.ts) — enum vocab + type guards
- [`supabase/migrations/20260910201541_build_visibility_and_storage.sql`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/supabase/migrations/20260910201541_build_visibility_and_storage.sql) — schema, enums, RLS
- [`tests/integration/catalog-listing.test.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/tests/integration/catalog-listing.test.ts) — published-only + pagination contracts

## Architecture Insights

**Module boundaries are clean.** Pages import only `@/modules/catalog` (presentation) and `@/modules/catalog/server` (SSR adapter). No deep imports from infrastructure. S-05 should extend the catalog module vertically without crossing into builds internals unless enum validators are exported through `@/modules/builds` public API.

**Filter state = URL search parameters** per [`runtime.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/foundation/architecture/runtime.md). SSR reads initial state; a small client island handles interactive filter changes. Grid/cards stay server-rendered.

**Enum reuse tension:** Validators live in `builds/domain/options.ts`; catalog has no builds dependency today. Options: (a) export validators from `@/modules/builds` public entrypoint, (b) duplicate constants in catalog domain, or (c) move shared enums to `src/lib/`. Plan should pick one.

**Client vs server rendering:**

| Piece | Rendering | Hydration |
|-------|-----------|-----------|
| `/builds` page | Astro SSR | — |
| `CatalogListing` grid | React SSR | None today |
| `FilterControls` | React + Radix | `client:load` required |
| Pagination links | Plain `<a href>` | SSR, no JS |

## Historical Context (from prior changes)

### F-05 `filter-ui-components` (archived, done)

- Delivered domain-free `FilterChip` + `FilterControls` with Storybook and jsdom tests.
- Explicitly deferred URL wiring, AND queries, pagination, result count, sort, and ranking tabs to S-05.
- "All means absent" — `""` is the only unset sentinel.
- One value per dimension; no OR within a dimension.
- Phone layout: full-width selects, wrapping chips; no drawer or horizontal scroll.
- Plan-review flagged duplicate "Other" chip a11y (two dimensions set to `other` share `Remove Other filter`) — fix was **skipped**; S-05 may revisit.
- `FilterControls` does not forward `disabled` to inner controls — loading UX deferred.

### S-04 `show-public-builds` (archived, done)

- Chose keyset `before`/`after` cursors over offset pagination or infinite scroll.
- Deferred filter query param ownership to S-05.
- `catalogPageUrls` intentionally carries only cursors until S-05 defines filter URL contract.
- Integration tests lock published-only ordering and pagination stability across 25 builds.

### Lessons learned

[`context/foundation/lessons.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/foundation/lessons.md#L26-L31) — keyset pagination + filters:

> Use composite keyset cursors with `before`/`after` links. When filters land, apply the same AND filters on every request, preserve them in every pagination URL, and reset to the first page when filters change.

## Related Research

- [`context/archive/2026-09-13-filter-ui-components/plan.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/archive/2026-09-13-filter-ui-components/plan.md) — F-05 implementation plan and S-05 boundary
- [`context/archive/2026-09-13-filter-ui-components/plan-brief.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/archive/2026-09-13-filter-ui-components/plan-brief.md) — caller-fed API summary
- [`context/archive/2026-09-13-filter-ui-components/planning-questions.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/archive/2026-09-13-filter-ui-components/planning-questions.md) — all 8 planning questions answered
- [`context/archive/2026-09-14-show-public-builds/plan.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/archive/2026-09-14-show-public-builds/plan.md) — S-04 pagination model and filter deferral

## URL Query Contract

Research follow-up: verified how catalog listing URLs are built today and defined the S-05 contract. S-04 uses string templates in `catalogPageUrls` (`/builds?before=…` / `/builds?after=…` only). S-05 must replace that with a shared builder using `URLSearchParams` so filters and cursors compose correctly.

### Param names (decided)

Use **DB column names** in the URL. Values are stored enum labels or integer strings — not display labels.

| URL param | Value type | Example |
|-----------|------------|---------|
| `watch_style` | `watch_style` enum label | `diver` |
| `movement` | `movement` enum label | `nh35` |
| `dial_colour` | `dial_colour` enum label | `black` |
| `strap_type` | `strap_type` enum label | `steel_bracelet` |
| `case_size_mm` | integer as string | `40` |
| `before` / `after` | opaque keyset cursor | base64url token |

`FilterControls` dimension ids in Storybook (`style`, `dial-colour`, `case-size`, etc.) are UI-only. S-05 needs a small **dimension id → URL param** map in the catalog layer; do not use Storybook ids as query keys.

### Presence rules

| State | URL behavior |
|-------|--------------|
| Filter inactive ("All") | **Omit** the param entirely |
| Filter active | `param=<stored_value>` |
| First page | No `before` / `after` |
| Next / Previous page | All active filters **plus** `after` or `before` |
| Filter change | **Strip** `before` and `after`; navigate to first page |
| Clear all | `/builds` (no query string) |

`before` and `after` remain mutually exclusive (existing `InvalidCatalogCursorError` → 400).

### Example URLs

```
/builds
/builds?watch_style=diver
/builds?watch_style=diver&movement=nh35&case_size_mm=40
/builds?watch_style=diver&movement=nh35&after=eyJwdWJsaXNoZWRBdCI6Li4uLCJpZCI6Li4ufQ
```

User changes movement while on page 2:

```
/builds?watch_style=diver&movement=nh35&after=<cursor>
  → /builds?watch_style=diver&movement=nh36
```

### Build path (write)

Introduce one shared helper in `catalog/application/` (e.g. `catalog-url.ts`):

```typescript
const FILTER_PARAM_ORDER = [
  "watch_style",
  "movement",
  "dial_colour",
  "strap_type",
  "case_size_mm",
] as const;

export function buildCatalogListingHref(
  filters: CatalogFilters,
  pagination: { kind: "first" } | { kind: "after"; cursor: string } | { kind: "before"; cursor: string } = { kind: "first" },
): string {
  const params = new URLSearchParams();

  for (const key of FILTER_PARAM_ORDER) {
    const value = filters[key];
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  if (pagination.kind === "after") params.set("after", pagination.cursor);
  if (pagination.kind === "before") params.set("before", pagination.cursor);

  const qs = params.toString();
  return qs ? `/builds?${qs}` : "/builds";
}
```

**Rules:**

- Use `URLSearchParams` on server (pagination links) and client (filter toolbar). Replace template literals in `catalogPageUrls`.
- Emit filter params in **fixed order** for stable URLs and cache keys (`OPERATIONAL_SAFETY.md`).
- Cursor param always comes **after** filter params.
- Never emit empty values (`?watch_style=`).

**Server pagination links** — replace `catalogPageUrls`:

```typescript
previousUrl: page.previousCursor
  ? buildCatalogListingHref(filters, { kind: "before", cursor: page.previousCursor })
  : null,
nextUrl: page.nextCursor
  ? buildCatalogListingHref(filters, { kind: "after", cursor: page.nextCursor })
  : null,
```

`filters` must come from the same validated parse that drove the query, not re-read raw from the URL.

**Client filter toolbar** — `FilterControls` fires callbacks; the catalog island owns navigation:

```typescript
function navigateWithFilters(nextFilters: CatalogFilters) {
  window.location.assign(buildCatalogListingHref(nextFilters, { kind: "first" }));
}

function onClearAll() {
  window.location.assign("/builds");
}
```

Full navigation (not `history.pushState` alone) keeps SSR as the source of truth for listing data.

### Parse path (read)

```
Astro.url.searchParams
  → parseCatalogFilterParams()      // validate enums, case_size_mm 20–70
  → parseCatalogPaginationParams()  // existing before/after logic
  → listPublishedBuilds({ filters, direction, boundary })
  → buildCatalogListingHref()       // Previous/Next links
```

URL values map 1:1 to Supabase `.eq()` calls **before** keyset boundaries:

```typescript
if (filters.watch_style)  query = query.eq("watch_style", filters.watch_style);
if (filters.movement)     query = query.eq("movement", filters.movement);
if (filters.dial_colour)  query = query.eq("dial_colour", filters.dial_colour);
if (filters.strap_type)   query = query.eq("strap_type", filters.strap_type);
if (filters.case_size_mm) query = query.eq("case_size_mm", filters.case_size_mm);
// then existing applyAfterBoundary / applyBeforeBoundary
```

### Edge cases

| Case | Behavior |
|------|----------|
| `?watch_style=` (empty string) | Treat as absent; omit from rebuilt URLs |
| `?before=…&after=…` | 400 `invalid-cursor` (existing) |
| Filter change while paginated | Drop cursors; page 1 with new filters |
| Filtered empty results | Keep filters in URL; show filtered empty state |
| Recovery "back to listing" | Unfiltered → `/builds`; filtered-empty may offer "Clear filters" → `/builds` |
| `steel_bracelet` in URL | `URLSearchParams` handles `_`; no manual encoding |
| Stale cursor after filter change | Reset on filter change prevents wrong slice |

### Invalid filter params (recommended)

Return **400** with an `invalid-filter` presentation state (parallel to existing `invalid-cursor`). Validate at the boundary before querying; do not pass unknown enum strings to PostgREST.

### Gaps to close in implementation

1. Replace `catalogPageUrls` template literals with `buildCatalogListingHref`.
2. Add `parseCatalogFilterParams` alongside `parseCatalogPaginationParams`.
3. Map `FilterControls` dimension ids to URL param names in catalog presentation.
4. Update recovery links in `catalog-listing.tsx` where filter-aware copy is needed.

## Open Questions

1. **Invalid filter param handling** — Confirm 400 `invalid-filter` vs strip-and-redirect (research recommends 400).
2. **Filtered-empty vs global-empty** — Separate UI copy/state when filters are active but yield zero results?
3. **Enum import strategy** — How does catalog access `isWatchStyle` etc. without violating module boundaries?
4. **Loading/disabled toolbar** — Does S-05 need `disabled` forwarding on `FilterControls` during URL navigation?
5. **Duplicate "Other" chip a11y** — Revisit plan-review F3 (dimension-qualified accessible names)?
6. **Filter indexes** — Add after measuring query plans, or proactively add partial index on published rows?
7. **Home Quick Filter URLs** — S-10 will link into listing with `watch_style=…` per this contract.
