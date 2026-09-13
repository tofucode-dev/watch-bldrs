# Filter UI components — Planning Questions

Planning checkpoint saved on 2026-09-13.

- Complexity: **MEDIUM**
- Question budget: **8**
- Status: 8 of 8 answered; plan written in `plan.md` / `plan-brief.md`
- Visual input: attached filter-bar mockup from the planning request

Recorded answers stay below each question. Unanswered items are still open.

## 1. Mockup scope

Which parts of the mockup belong in this foundation slice?

- **⭐ Recommended: Five filters, active chips, and Clear all** — Build only the reusable filtering controls; leave result count, sort, and listing tabs to listing composition. · Strength: Matches roadmap F-05 and avoids MVP ranking non-goals. · Tradeoff: The Storybook composition will intentionally show less than the full mockup.
- **Add result count and Newest sort** — Include presentational count and sort controls but still omit ranking tabs. · Strength: Produces a more complete catalog toolbar. · Tradeoff: Their ownership and behavior are not defined for F-05 and may conflict with S-04/S-05.
- **Match the entire mockup** — Include count, sort, and All Builds/Recent/Popular/Hot tabs. · Strength: Highest visual fidelity. · Tradeoff: Popular and Hot explicitly exceed current MVP scope and require behavior outside this UI kit.

**Answer:** Five filters, active chips, and Clear all.

## 2. F-04 prerequisite

How should planning account for the missing `listing-ui-components` prerequisite?

- **⭐ Recommended: Plan now, implement after F-04** — Finish an independent F-05 plan now but state that implementation starts only once F-04's shared listing contracts exist. · Strength: Preserves roadmap order and prevents duplicate listing chrome. · Tradeoff: Some final spacing/alignment details cannot be confirmed until F-04 lands.
- **Implement independently now** — Treat the filter kit as fully standalone and avoid any F-04 dependency in its API. · Strength: Fastest route to code. · Tradeoff: Raises integration and visual-alignment risk when the listing kit arrives.
- **Pause planning until F-04 lands** — Do not finalize F-05 until the prerequisite is implemented. · Strength: Plans against concrete listing components. · Tradeoff: Delays useful decisions that are already independent of F-04.

**Answer:** Plan now, implement after F-04.

## 3. Active-filter chips

What should the chip row show when a dimension is set to `All` / absent?

- **⭐ Recommended: Only actual active filters** — Render a chip only when that dimension limits results; show no chips for the fully unfiltered state. · Strength: Matches the product definition of Active Filter and keeps the row concise. · Tradeoff: The initial state differs from the mockup, which displays five `All` chips.
- **Show all five dimensions** — Always render a chip per dimension, using `All` for inactive ones. · Strength: Mirrors the mockup and makes every current state explicit. · Tradeoff: Creates visual noise and makes “active filter” semantics misleading.
- **Show active filters plus an unfiltered summary** — Use normal chips when filtering and a single `All builds` chip when none are active. · Strength: Keeps an explicit default-state indicator. · Tradeoff: Adds a special chip state with little functional value.

**Answer:** Only actual active filters.

## 4. Case-size choices

How should the case-size dropdown represent stored integer sizes from 20–70 mm?

- **⭐ Recommended: Exact integer sizes** — Offer exact `NN mm` values and treat `All` as absent. · Strength: Matches the existing database/domain contract and preserves simple equality filtering. · Tradeoff: Produces a long dropdown and may feel overly precise.
- **Common exact sizes only** — Offer a curated subset such as 36, 38, 39, 40, 41, and 42 mm. · Strength: Short, practical menu for typical watches. · Tradeoff: Builds using other valid stored sizes become impossible to select through the filter.
- **Size ranges** — Offer buckets such as `< 38 mm`, `38–40 mm`, and `> 40 mm`. · Strength: Better discovery when exact matches are sparse. · Tradeoff: Introduces range semantics not present in the current data/query contract and expands S-05.

**Answer:** Exact integer sizes.

## 5. Selection model

Can a user choose more than one value inside a single filter dimension?

- **⭐ Recommended: One value per dimension** — Each dropdown selects one value, while different dimensions combine later with AND semantics. · Strength: Matches the mockup, Radix Select, and the simplest reading of the PRD. · Tradeoff: Users cannot browse, for example, Diver OR Field in one request.
- **Multiple values per dimension** — Allow OR within a dimension and AND across dimensions. · Strength: More flexible discovery. · Tradeoff: Requires a different control, more complex chips, URL encoding, and query rules not specified by the MVP.

**Answer:** One value per dimension.

## 6. Phone layout

How should the controls behave around a 390 px viewport?

- **⭐ Recommended: Full-width controls with wrapping chips** — Stack or use a compact grid for selects and let active chips wrap naturally. · Strength: Accessible, touch-friendly, and requires no hidden interaction model. · Tradeoff: Consumes substantial vertical space above results.
- **Horizontal scrolling rows** — Keep compact desktop-sized controls and allow sideways scrolling. · Strength: Preserves the mockup's short toolbar. · Tradeoff: Discoverability and keyboard/touch navigation are weaker.
- **Filter drawer** — Replace inline phone controls with a button that opens a sheet/dialog. · Strength: Keeps the listing visible and scales well. · Tradeoff: Adds a new overlay primitive and interaction complexity beyond the current mockup.

**Answer:** Full-width controls with wrapping chips.

## 7. Component API shape

How reusable should the shared filter kit be?

- **⭐ Recommended: Small primitives plus a controlled composition** — Provide a generic filter select, removable chip, and responsive filter-controls composition driven entirely by caller data and callbacks. · Strength: Reusable by the listing and later home Quick Filters while remaining domain-free. · Tradeoff: Adds several prop contracts and more tests than one monolithic component.
- **Primitives only** — Ship select/chip styling and let every consumer arrange them. · Strength: Minimal abstraction and maximum layout freedom. · Tradeoff: S-05 and F-06 may duplicate responsive layout and clear-all behavior.
- **One watch-specific toolbar** — Hardcode the five watch filters into one component. · Strength: Small consumer API and fast Storybook fidelity. · Tradeoff: Couples `src/components/ui` to Builds/Catalog vocabulary and reduces reuse.

**Answer:** Small primitives plus a controlled composition.

## 8. Removal focus behavior

Where should keyboard focus go after removing a chip or clearing all filters?

- **⭐ Recommended: Return to the related filter control** — Chip removal focuses its corresponding select; Clear all focuses the first filter control. · Strength: Gives keyboard and assistive-technology users a predictable continuation point. · Tradeoff: Requires explicit refs/focus coordination in the composition contract.
- **Move to the next available chip/action** — Preserve position within the chip row where possible. · Strength: Efficient when removing several filters consecutively. · Tradeoff: Focus logic becomes fragile as chips disappear and reorder.
- **Leave browser-default focus behavior** — Do not coordinate focus after controls disappear. · Strength: Simplest implementation. · Tradeoff: Focus can be lost to the document body, creating a poor keyboard experience.

**Answer:** Leave browser-default focus behavior.

## Research anchors

- `context/foundation/prd.md` — FR-006 and ranking non-goals
- `context/foundation/roadmap.md` — F-05 scope, F-04 prerequisite, S-05 integration boundary
- `context/foundation/architecture/runtime.md` — URL state belongs to the later catalog integration
- `src/components/ui/options-select.tsx` — existing controlled select pattern
- `src/modules/builds/domain/options.ts` — canonical option values and display labels
- `context/foundation/design-system.md` — paper-and-ink visual source and Storybook requirement
