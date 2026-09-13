# Filter UI Components Implementation Plan

## Overview

Add a shared, domain-free filter kit to `src/components/ui` so S-05 can attach five AND filters to the published listing and F-06 can reuse the same widgets for home Quick Filters. This slice ships a removable chip, a controlled responsive composition, and Storybook coverage. It reuses `OptionsSelect` rather than inventing a second select. URL state, catalog queries, pagination, result count, sort, and ranking tabs stay out.

**Implementation gate:** F-04 (`listing-ui-components`) is a roadmap prerequisite. Write this plan now; do not start Phase 1 until F-04’s shared listing contracts exist in `src/components/ui`. Some listing-adjacent spacing cannot be confirmed until then.

## Current State Analysis

The shared UI library already has the authoring kit: `Button`, `Field`, `OptionsSelect`, `PartsRow`, `StickyActionBar`, and `PhotoUpload`. `OptionsSelect` is a controlled `{ value, label }[]` wrapper that maps empty values through a Radix sentinel (`src/components/ui/options-select.tsx`, `src/components/ui/options-select-mapping.ts`). Authoring uses that contract with a caller-supplied `{ value: "", label: "Not set" }` option.

There is no chip, badge, tag, or filter toolbar. `src/modules/catalog/` does not exist. The public listing page does not exist. Home style tiles in `Welcome.astro` are static links, not filters. F-04 is roadmap status `ready` and is not implemented — no listing Card/Badge/Tag components.

Canonical filter dimensions live in the PRD and data model: watch style, movement, dial colour, strap type, and case size. Enum option lists and labels live in `src/modules/builds/domain/options.ts`. Case size is an optional integer 20–70 mm (`CASE_SIZE_MIN_MM` / `CASE_SIZE_MAX_MM` in `src/modules/builds/domain/validate-draft.ts`); there is no case-size option array. Hands style is not a filter. Combined filters use AND semantics, but that query rule belongs to S-05.

The design-system board assigns **Filter / dropdown** to F-05. Visual language is paper-and-ink tokens in `src/styles/global.css`. The visual target for this slice is `context/changes/filter-ui-components/filter-bar-reference.png` (the planning-request mockup; commit it before Phase 1 visual checks). That mockup also showed result count, Newest sort, and All Builds / Recent / Popular / Hot tabs — those are out of this slice. `context/foundation/design-system.png` remains the token board, not the filter-bar fidelity source.

## Desired End State

S-05 and F-06 can import from `@/components/ui` and compose:

- one labeled `OptionsSelect` per caller-defined dimension, including a caller-supplied `{ value: "", label: "All" }` option that returns the value to absent
- a removable chip for each dimension whose current value is non-empty
- a Clear all action that appears only when at least one dimension is active
- a phone-sized layout that uses full-width selects and wrapping chips, with no drawer and no horizontal scroll

Verification: component tests for chip visibility, remove/clear callbacks, and domain-free props; lint/test/build pass; a local Storybook visual check against the filter region of `filter-bar-reference.png`. The unfiltered Storybook state shows no chips (accepted difference from the mockup’s five `All` chips).

### Key Discoveries:

- F-02 already solved Radix empty-value mapping. Filter “All” is the same contract with different copy (`src/components/ui/options-select-mapping.ts`).
- Shared kernel vs module: primitives stay in `src/components/ui`; do not scaffold `src/modules/catalog` (`context/foundation/architecture/modules.md`).
- Authoring research already treated Filter Selects as a different kit that shares the same primitive — do not fork a `FilterSelect`.
- F-04 Badge/Tag (when it lands) is listing chrome, not a dismissible filter chip. `FilterChip` is F-05-owned. If F-04 has shipped Badge surface classes, reuse tokens via `cn()`; do not wrap listing Badge as the chip API.
- Case-size options for stories are fabricated locally as `"20"`…`"70"` with labels `20 mm`…`70 mm`. Do not add `CASE_SIZE_OPTIONS` to the builds domain in this slice.
- Catalog filter state belongs in URL search parameters (`context/foundation/architecture/runtime.md`). That wiring is S-05.
- Lesson: when checking visual criteria, write remaining look gaps down; do not mark the visual step done with no list (`context/foundation/lessons.md`).

## What We're NOT Doing

- Wiring filters to the live listing, URL search params, AND query construction, or pagination (S-05)
- Scaffolding `src/modules/catalog`
- Result count, Newest/sort controls, and All Builds / Recent / Popular / Hot tabs (S-04 / S-05 / parked ranking non-goals)
- Home Quick Filters page composition (F-06) — only the reusable kit they will import
- Hardcoding watch style / movement / dial / strap / size vocabularies in `src/components/ui`
- Adding `CASE_SIZE_OPTIONS` to `src/modules/builds/domain/options.ts`
- Multiple values per dimension, range buckets, or curated size subsets
- A filter drawer / sheet, or horizontally scrolling control rows
- Coordinated focus after chip removal or Clear all (browser default; accepted)
- A second Select primitive or a watch-specific `WatchFilterBar`
- Playwright / E2E
- A committed `/dev` preview route
- Inventing a second listing

## Implementation Approach

Reuse `OptionsSelect` as the filter select. Add `FilterChip` as a small presentational primitive (label + remove). Add `FilterControls` as a controlled composition: caller passes dimensions and callbacks; the kit owns layout, chip derivation, and Clear all visibility. Keep the kit domain-free the same way `PartsRow` is domain-free. If `filter-bar-reference.png` needs a compact trigger, extend `OptionsSelect` with optional `size?: "sm" | "default"` (passthrough to `SelectTrigger`) and optional `className` — do not fork a `FilterSelect`.

Stories fabricate five-dimension demo data, including exact integer case sizes 20–70. Tests stay in jsdom Testing Library next to the source. Do not user-event open Radix Select content — the empty-value contract is already proven in `options-select-mapping.test.ts`.

Token-faithful styling: reuse existing CSS variables. Match the mockup when it is a class/`cn()` tweak; if a look requires custom illustration or a second palette, record the drawback and leave it.

## Critical Implementation Details

**Implementation starts after F-04.** The API of this kit does not import listing components, but Phase 1 must not begin until F-04 has added the shared listing contracts. Use F-04 tokens and spacing where they help alignment; do not block `FilterChip` on an F-04 Badge export.

**All means absent.** Callers pass `{ value: "", label: "All" }` as the first option and may use `placeholder="All"`. Controlled `value=""` / `undefined` is unfiltered for that dimension. `FilterControls` must not invent a second sentinel.

**Compact trigger is an OptionsSelect extension, not a new primitive.** `SelectTrigger` already supports `size="sm"`. `OptionsSelect` currently hardcodes a default-height `w-full` trigger and accepts neither `size` nor `className`. When the visual target needs the smaller control, add those optional props on `OptionsSelect` and pass `size="sm"` from `FilterControls`. Leave authoring callers on the default size.

**Active chips and Clear all are derived, not a parallel state.** A chip exists only when that dimension’s value is a non-empty string. Clear all renders only when at least one chip exists. Chip remove calls `onDimensionChange(id, "")`. The composition does not move focus after remove or clear.

**Phone layout is wrapping, not overflow.** Around 390px, selects are full-width in a stack or compact grid and chips wrap. Do not introduce a sheet/drawer or a sideways-scrolling toolbar.

## Phase 1: FilterChip primitive

### Overview

Ship a domain-free removable chip with stories and jsdom tests so Phase 2 can compose active-filter chrome without inventing dismissible controls.

### Changes Required:

#### 1. FilterChip

**File**: `src/components/ui/filter-chip.tsx`

**Intent**: Show one active filter value and let the user dismiss it, without knowing watch attributes or URL state.

**Contract**: Props are `label: string`, `onRemove: () => void`, optional `disabled`. Render the label and a remove control whose accessible name includes the label (for example `Remove ${label} filter`). Use existing `Button` variants (`ghost` / `sm` or `icon`) and paper-and-ink tokens. No dimension id, no option lists, no focus restoration. `data-slot="filter-chip"` is acceptable for tests.

#### 2. FilterChip stories

**File**: `src/components/ui/filter-chip.stories.tsx`

**Intent**: Make the chip browsable in the local Storybook workshop next to other UI primitives.

**Contract**: CSF title `UI/FilterChip`, `tags: ["autodocs"]`, Paper/Ink compatible. Include at least Default and a longer-label story. Use `fn()` for `onRemove`. Do not import `@/modules/*`.

#### 3. FilterChip tests

**File**: `src/components/ui/filter-chip.test.tsx`

**Intent**: Lock the accessible remove contract and callback without testing visual polish.

**Contract**: jsdom Testing Library. Assert the label is visible, the remove control is named from the label, `onRemove` fires on activate, and `disabled` suppresses the callback. Do not assert document focus after remove.

### Success Criteria:

#### Automated Verification:

- `FilterChip` renders the caller label and a remove control whose accessible name includes that label
- Remove invokes `onRemove`; `disabled` does not
- Co-located `filter-chip.stories.tsx` exists under `UI/FilterChip` and does not import `@/modules/*`
- `FilterChip` does not hardcode watch style, movement, dial, strap, or size vocabulary
- `npm run lint` passes
- `npm run test` passes
- `npm run build` passes

#### Manual Verification:

- Chip looks token-faithful (cream/charcoal/primary) next to `filter-bar-reference.png` in Storybook Paper and Ink at desktop and ~390px
- Remove is reachable by keyboard
- Any `filter-bar-reference.png` chip details skipped as too expensive are listed as accepted drawbacks

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: FilterControls composition

### Overview

Compose labeled `OptionsSelect`s, derived active chips, and Clear all into a controlled, responsive toolbar. Demonstrate the five-filter mockup region in Storybook without wiring a catalog.

### Changes Required:

#### 1. FilterControls

**File**: `src/components/ui/filter-controls.tsx`

**Intent**: Give S-05 and F-06 one layout and interaction surface so they do not each invent chip rows, Clear all, and phone wrapping.

**Contract**: Controlled and domain-free. Caller passes `dimensions: { id: string; label: string; options: { value: string; label: string }[]; value?: string }[]`, `onDimensionChange: (id: string, value: string) => void`, and `onClearAll: () => void`. Do not import `SelectOption` from `options-select-mapping.ts` (not a public API) or from `src/modules/builds/domain/options.ts`. Pass the inline option objects through to `OptionsSelect`. Each dimension renders a labeled `OptionsSelect` (associate `label` with the trigger `id`; pass `size="sm"` if the visual target needs a compact trigger). Treat `""` / `undefined` as inactive. Render a `FilterChip` per active dimension using the matching option label (fall back to the raw value if the option is missing). Chip remove calls `onDimensionChange(id, "")`. Render Clear all only when at least one dimension is active; it calls `onClearAll` and does not itself mutate values. Layout: full-width stack or compact grid for selects; chips wrap. No URL, no AND logic, no result count, no sort, no listing tabs, no focus management. Optional `data-slot="filter-controls"`.

#### 2. FilterControls stories

**File**: `src/components/ui/filter-controls.stories.tsx`

**Intent**: Show the in-scope mockup region — five filters, chips, Clear all — with local state only.

**Contract**: CSF title `UI/FilterControls`. Fabricate style, movement, dial colour, strap type, and case-size options in the story file. Case-size options are exact integers 20–70 inclusive (`value` `"20"`…`"70"`, label `NN mm`) plus `{ value: "", label: "All" }` on every dimension. Include Unfiltered, OneActive, and SeveralActive. Use `useState` in `render` like `options-select.stories.tsx`. `onClearAll` must set every dimension value to `""` in that local state so Clear all returns the toolbar to Unfiltered; `fn()` alone is not enough. Do not import `@/modules/builds` or `@/modules/*/server`.

#### 3. FilterControls tests

**File**: `src/components/ui/filter-controls.test.tsx`

**Intent**: Lock chip/clear derivation and callbacks so S-05 can trust the composition.

**Contract**: jsdom Testing Library. Assert: no chips and no Clear all when every value is empty; one chip (selected label) when one dimension is set; chip remove calls `onDimensionChange` with that id and `""`; Clear all is present when any value is set and calls `onClearAll`; no watch-domain constants imported from modules. Do not open Radix Select content. Do not assert focus after remove or clear.

### Success Criteria:

#### Automated Verification:

- `FilterControls` is controlled and domain-free: dimensions, option lists, values, and callbacks come from the caller
- Each dimension uses `OptionsSelect`; All/absent is `""` through the existing mapping helper
- Chips render only for non-empty values; Clear all renders only when at least one chip exists
- Chip remove calls `onDimensionChange(id, "")`; Clear all calls `onClearAll`
- Stories fabricate five dimensions including exact 20–70 mm case sizes and do not import module domain or server entrypoints
- Component tests cover chip/clear visibility and callbacks and do not assert focus restoration
- No `src/modules/catalog`, URL wiring, listing chrome, result count, sort, or ranking tabs
- `npm run lint` passes
- `npm run test` passes
- `npm run build` passes

#### Manual Verification:

- At ~390px, selects are full-width (stack or compact grid) and chips wrap; no drawer and no sideways scroll
- At desktop width, five filters and the chip row are readable without horizontal overflow
- Unfiltered state shows no chips and no Clear all (accepted difference from the mockup)
- A dimension can go All → value → All via the empty option and via chip remove
- Visual check is filter selects / chips / Clear all only — count, sort, and ranking tabs are out; remaining look gaps vs `filter-bar-reference.png` are written down, not forced
- Storybook Paper and Ink both reviewed with `npm run storybook`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- `FilterChip` accessible name and `onRemove` / disabled
- `FilterControls` chip derivation from values, Clear all visibility, and callback shapes
- Do not re-test `options-select-mapping.ts` unless this slice changes it (it should not)

### Integration Tests:

- None in this slice. Filter normalization, AND queries, and URL updates are S-05

### Manual Testing Steps:

1. Open `npm run storybook`, Paper theme, `UI/FilterChip` then `UI/FilterControls`
2. Unfiltered: five All selects, no chips, no Clear all
3. Set Style to Diver (or equivalent story option): one chip, Clear all appears
4. Remove the chip: that select returns to All; chip and Clear all disappear
5. Set several dimensions including a case size such as `40 mm`; chips wrap at ~390px; Clear all resets the story state
6. Repeat in Ink theme and at a phone-sized Storybook viewport
7. Write leftover gaps vs `filter-bar-reference.png` (type scale, popover chrome, missing count/sort/tabs, missing default `All` chips) into the Phase 2 visual criterion

## Performance Considerations

Fifty-one case-size options is acceptable for a Radix Select in Storybook and later catalog use. Do not virtualize the list in this slice.

## Migration Notes

No data migration. `OptionsSelect` may gain optional `size` and `className` passthrough; existing authoring callers stay on the default trigger. Consumers of the filter kit do not exist yet; S-05 and F-06 adopt it when those slices start.

## References

- Planning decisions: `context/changes/filter-ui-components/planning-questions.md`
- Visual target: `context/changes/filter-ui-components/filter-bar-reference.png`
- Design system: `context/foundation/design-system.md`
- Roadmap F-05: `context/foundation/roadmap.md`
- Runtime URL rule (out of scope): `context/foundation/architecture/runtime.md`
- Similar composition: `src/components/ui/parts-row.tsx`
- Select contract: `src/components/ui/options-select.tsx`, `src/components/ui/options-select-mapping.ts`
- Domain option source for later consumers (not this kit): `src/modules/builds/domain/options.ts`
- Tokens: `src/styles/global.css`
- Precedent plan: `context/archive/2026-09-11-authoring-form-components/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: FilterChip primitive

#### Automated

- [x] 1.1 `FilterChip` renders the caller label and a remove control whose accessible name includes that label
- [x] 1.2 Remove invokes `onRemove`; `disabled` does not
- [x] 1.3 Co-located `filter-chip.stories.tsx` exists under `UI/FilterChip` and does not import `@/modules/*`
- [x] 1.4 `FilterChip` does not hardcode watch style, movement, dial, strap, or size vocabulary
- [x] 1.5 `npm run lint` passes
- [x] 1.6 `npm run test` passes
- [x] 1.7 `npm run build` passes

#### Manual

- [x] 1.8 Chip looks token-faithful (cream/charcoal/primary) next to `filter-bar-reference.png` in Storybook Paper and Ink at desktop and ~390px
- [x] 1.9 Remove is reachable by keyboard
- [x] 1.10 Any `filter-bar-reference.png` chip details skipped as too expensive are listed as accepted drawbacks

### Phase 2: FilterControls composition

#### Automated

- [ ] 2.1 `FilterControls` is controlled and domain-free: dimensions, option lists, values, and callbacks come from the caller
- [ ] 2.2 Each dimension uses `OptionsSelect`; All/absent is `""` through the existing mapping helper
- [ ] 2.3 Chips render only for non-empty values; Clear all renders only when at least one chip exists
- [ ] 2.4 Chip remove calls `onDimensionChange(id, "")`; Clear all calls `onClearAll`
- [ ] 2.5 Stories fabricate five dimensions including exact 20–70 mm case sizes and do not import module domain or server entrypoints
- [ ] 2.6 Component tests cover chip/clear visibility and callbacks and do not assert focus restoration
- [ ] 2.7 No `src/modules/catalog`, URL wiring, listing chrome, result count, sort, or ranking tabs
- [ ] 2.8 `npm run lint` passes
- [ ] 2.9 `npm run test` passes
- [ ] 2.10 `npm run build` passes

#### Manual

- [ ] 2.11 At ~390px, selects are full-width (stack or compact grid) and chips wrap; no drawer and no sideways scroll
- [ ] 2.12 At desktop width, five filters and the chip row are readable without horizontal overflow
- [ ] 2.13 Unfiltered state shows no chips and no Clear all (accepted difference from the mockup)
- [ ] 2.14 A dimension can go All → value → All via the empty option and via chip remove
- [ ] 2.15 Visual check is filter selects / chips / Clear all only — count, sort, and ranking tabs are out; remaining look gaps vs `filter-bar-reference.png` are written down, not forced
- [ ] 2.16 Storybook Paper and Ink both reviewed with `npm run storybook`
