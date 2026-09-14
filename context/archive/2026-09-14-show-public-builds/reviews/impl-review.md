<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Show Public Builds

- **Plan**: context/changes/show-public-builds/plan.md
- **Scope**: Phases 1–3 of 3
- **Date**: 2026-09-14
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 3 warnings 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | FAIL |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Before-page keyset slice drops the wrong row

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/modules/catalog/infrastructure/supabase-catalog-store.ts:105
- **Detail**: Plan says a `before` query fetches `limit+1` in reverse database order, then reverses the **displayed** slice. The adapter reverses all 13 rows and then `slice(0, 12)`, which on `hasMore` keeps the overflow newest row and drops the row closest to the cursor. Previous from page 3+ (25+ published builds) skips/duplicates IDs — the failure mode keyset paging exists to prevent. Adapter tests only assert `order()`; integration and the demo seed use 13–14 published rows, so `before` + `hasMore` never runs.
- **Fix**: Slice to `pageSize` while rows are still ascending, then reverse (or reverse then `slice(-pageSize)`). Add a 13-row `before` + `hasMore` adapter test and a 25-row round-trip.
  - Strength: Matches the plan’s reverse-displayed-slice contract and restores Previous correctness with a two-line change.
  - Tradeoff: Needs a larger seed in the adapter/integration tests; demo catalog currently cannot exhibit the bug.
  - Confidence: HIGH — walkthrough of 25 descending IDs shows page 3 Previous returning 14–3 instead of 13–2.
  - Blind spot: Have not hit a live 25-row catalog in the browser.
- **Decision**: FIXED

### F2 — Cursor timestamps interpolated unquoted into PostgREST `.or()`

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/modules/catalog/infrastructure/supabase-catalog-store.ts:31
- **Detail**: `applyAfterBoundary` / `applyBeforeBoundary` interpolate `publishedAt` and `id` into `.or()` strings. Parser accepts any `Date.parse` success, including comma-containing dates that can break the filter DSL. Postgres often returns `+00:00`; unquoted `+` is treated as a space in PostgREST filters, so well-formed Next/Previous links can 503 or page wrongly. `status = 'published'` and `published_at IS NOT NULL` remain separate ANDs, so this should not leak drafts.
- **Fix A ⭐ Recommended**: Canonicalize `publishedAt` with `toISOString()` when encoding and filtering, and double-quote both `.or()` values. Reject non-ISO-8601 timestamps in `decodeCatalogCursor`.
  - Strength: Closes both the `+00:00` production footgun and attacker-controlled comma injection into the filter string, without changing the cursor JSON shape.
  - Tradeoff: Existing bookmarked cursors that used a non-`Z` offset would 400 until the user returns to `/builds`.
  - Confidence: HIGH — PostgREST documents `+` as space in filters; integration inserts `Z` timestamps and would not catch this.
  - Blind spot: Have not captured a live PostgREST `published_at` wire format from this local stack.
- **Fix B**: Keep string `.or()` as-is and only tighten the timestamp regex.
  - Strength: Smaller parser-only change.
  - Tradeoff: Does not fix `+00:00` from Postgres on otherwise valid app-generated cursors.
  - Confidence: LOW — leaves the production paging footgun in place.
  - Blind spot: Same wire-format uncertainty as Fix A.
- **Decision**: FIXED via Fix A

### F3 — Demo seed prints a hardcoded password and has no local-only guard

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: scripts/seed-catalog-demo.mjs:8
- **Detail**: Supporting demo seeder (not product scope) uses a hardcoded `catalog-demo-password`, prints it to stdout, and wipes every build for that author via the service-role key. URL defaults to localhost / `supabase status`, but nothing refuses a non-loopback `SUPABASE_URL` if the env is pointed at hosted.
- **Fix**: Abort unless the API URL is loopback; stop printing the password (tell the operator the demo email and that the password is local-only, or generate one).
- **Decision**: FIXED

### F4 — Unexpected catalog errors can surface as a 500 instead of quiet 503

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/modules/catalog/server.ts:88
- **Detail**: `resolveCatalogListing` maps `InvalidCatalogCursorError` and `CatalogUnavailableError` to 400/503, then rethrows anything else. A null `data` payload after a successful PostgREST call would throw when reading `.length` / spreading, producing an Astro/Workers error page instead of the planned quiet unavailable state. Query `error` paths already map correctly.
- **Fix**: Treat missing `data` as `CatalogUnavailableError` in the adapter; map remaining unexpected errors in `resolveCatalogListing` to `{ status: "unavailable" }`.
- **Decision**: FIXED
