# Filter UI Components — Plan Brief

> Full plan: `context/changes/filter-ui-components/plan.md`

## What & Why

Ship the F-05 filter kit: reusable controls that later attach to the published listing (S-05) and home Quick Filters (F-06). Visitors need to narrow published builds by watch style, movement, dial colour, strap type, and case size without this slice inventing a second listing or ranking UI.

## Starting Point

`OptionsSelect` already handles empty/`All` as absent. There is no chip, filter toolbar, or catalog module. F-04 listing components are still unimplemented; this plan is written now and implementation waits for that kit.

## Desired End State

S-05 can drop a controlled, domain-free toolbar onto the listing: five caller-fed selects, chips only for active dimensions, and Clear all when anything is set. Phone layouts stack or grid full-width selects and wrap chips. Storybook shows that region without count, sort, or ranking tabs.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Mockup scope | Five filters, chips, Clear all | F-05 is widgets only; count/sort/tabs belong to listing or parked ranking | Plan |
| F-04 timing | Plan now, implement after F-04 | Preserves roadmap order without blocking decisions already independent of listing cards | Plan |
| Active chips | Only dimensions that limit results | Matches Active Filter; unfiltered state stays empty | Plan |
| Case size | Exact integers 20–70 mm | Matches stored `case_size_mm` equality; no new range contract | Plan |
| Selection | One value per dimension | Matches Radix Select and the MVP reading of FR-006 | Plan |
| Phone layout | Full-width selects, wrapping chips | Touch-friendly, no hidden drawer or sideways scroll | Plan |
| API shape | Chip + controlled composition; reuse `OptionsSelect` (optional `size`/`className` if the mockup needs a compact trigger) | Domain-free reuse for listing and home; no second Select | Plan |
| Removal focus | Browser default | Explicitly skip focus restoration after chip/clear | Plan |

## Scope

**In scope:** `FilterChip`, `FilterControls`, Storybook, jsdom tests, paper-and-ink styling

**Out of scope:** URL/AND/pagination, catalog module, count/sort/tabs, hardcoded watch vocab, case-size domain list, multi-select, drawer, focus management, E2E

## Architecture / Approach

Shared kernel in `src/components/ui`. Callers pass `{ id, label, options, value }[]` and callbacks. The kit derives chips and Clear all from non-empty values and renders labeled `OptionsSelect`s. Stories fabricate 20–70 mm options; S-05 later supplies domain lists and URL state.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. FilterChip primitive | Removable chip + stories/tests | Visual mismatch with later F-04 tags |
| 2. FilterControls composition | Responsive toolbar + five-filter Storybook demo | Phone vertical space; mockup fidelity without count/sort/tabs |

**Prerequisites:** F-04 listing UI contracts exist before Phase 1 starts
**Estimated effort:** ~2 sessions across 2 phases

## Open Risks & Assumptions

- Listing-adjacent spacing cannot be confirmed until F-04 lands
- Browser-default focus after chip/clear can dump keyboard users to the document body; accepted for this slice
- Fifty-one case-size options make a long dropdown; accepted vs range semantics
- Visual target is `context/changes/filter-ui-components/filter-bar-reference.png` and must be committed before Phase 1 visual checks
- Unfiltered Storybook will not match that mockup’s five `All` chips

## Success Criteria (Summary)

- A consumer can render five labeled filters from caller data with no watch vocabulary in `ui/`
- Active chips and Clear all appear only when a dimension is set, and both clear back to All
- Phone and desktop Storybook states are usable; leftover mockup gaps are written down
