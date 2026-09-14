<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Filter Published Listing

- **Plan**: context/changes/filter-published-listing/plan.md
- **Mode**: Deep
- **Date**: 2026-09-14
- **Verdict**: SOUND (after triage)
- **Findings**: 0 critical 4 warnings 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | WARNING → PASS (F1 fixed) |
| Blind Spots | WARNING → PASS (F3, F5 fixed) |
| Plan Completeness | WARNING → PASS (F2, F4 fixed) |

## Grounding

Grounding: 8/8 existing paths ✓, 6/6 symbols ✓, brief↔plan ✓

## Findings

### F1 — CatalogFilterBar importing @/modules/builds can hydrate BuildForm

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Phase 1 (builds/index.ts) + Phase 3 (CatalogFilterBar)
- **Detail**: `src/modules/builds/index.ts` re-exports `BuildForm` (`astro:actions`). The island was planned to import option arrays from that barrel. `CASE_SIZE_*` lived only in `validate-draft.ts`.
- **Fix A ⭐ Recommended**: Named vocab re-exports; move `CASE_SIZE_*` into `options.ts`; island must not import `BuildForm` / `astro:actions`.
- **Fix B**: Duplicate option lists in catalog so the island never imports `@/modules/builds`.
- **Decision**: FIXED via Fix A

### F2 — initialFilters contract split across Phase 2 and Phase 3

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Phase 2 §1 vs Phase 3 §2/§4
- **Detail**: Phase 2 allowed page parse or resolver return; Phase 3 required resolver return. Invalid-filter throws so there is no validated object.
- **Fix A ⭐ Recommended**: `resolveCatalogListing` returns `{ state, filters }` with `filters: {}` on invalid-filter; page never re-parses; drop Phase 3 item 4.
- **Fix B**: Page parses independently with try/catch → `{}`.
- **Decision**: FIXED via Fix A

### F3 — Extending catalog-listing.test.ts can make AND tests vacuous

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 3 §3 Integration tests
- **Detail**: Existing integration seeds all published rows as `diver`/`nh35`. Extending that fixture would not prove AND.
- **Fix**: New `tests/integration/catalog-filters.test.ts` with varied seeds; leave the 25-row fixture unchanged.
- **Decision**: FIXED

### F4 — Phase 3 manual success criteria do not 1:1 match Progress

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 3 Manual Verification vs Progress
- **Detail**: Six manual bullets vs two Progress items.
- **Fix**: Collapse Phase 3 Manual Verification to match Progress 3.5 / 3.6; keep six-step detail in Testing Strategy.
- **Decision**: FIXED

### F5 — Dead listPublishedBuildsForRequest stays pagination-only

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: src/modules/catalog/server.ts (unmentioned)
- **Detail**: Unused export parses pagination only; a later caller would skip AND filters.
- **Fix**: Delete unused helper in Phase 2.
- **Decision**: FIXED
