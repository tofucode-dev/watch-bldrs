<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Authoring Form Components Implementation Plan

- **Plan**: context/changes/authoring-form-components/plan.md
- **Scope**: Phase 2 of 2
- **Date**: 2026-09-12
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 2 warnings 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Findings

### F1 — PartsRow wraps cell controls in Label

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: src/components/ui/parts-row.tsx:78
- **Detail**: Each cell wraps `cell.control` in Radix `Label` with no `htmlFor`. Field, Label stories, and OptionsSelect stories all use sibling `Label`/`FieldLabel` + `htmlFor`/`id`. Wrapping a Radix `SelectTrigger` (a button) in `<label>` is a known double-toggle: click opens then immediately closes. Phase 2 stories put `OptionsSelect` in Category and Currency cells (`parts-row.stories.tsx` `CategoryCell` / `CurrencyCell`), which is the S-02 composition. Tests only prove accessible names for a native `<input />`, so the Select path is untested.
- **Fix A ⭐ Recommended**: Add `htmlFor` to `PartsRowCell` and render a sibling `Label` (keep `md:sr-only` on the label text). Do not wrap the control. Stories already pass matching `id`s on Input and OptionsSelect.
  - Strength: Matches Field/Label in this kit; removes the Radix Select double-toggle before S-02 copies the story composition.
  - Tradeoff: Cell API gains `htmlFor`; callers must keep `id` on the control in sync.
  - Confidence: HIGH — identical association pattern in `field.tsx` / `field.test.tsx`; stories already have ids.
  - Blind spot: Have not clicked Category/Currency selects in Storybook to reproduce the double-toggle in this session.
- **Fix B**: Drop `Label`; keep the visual/`sr-only` span only, and require callers to wire accessible names on the control (`htmlFor`/`aria-label`).
  - Strength: Keeps PartsRow a layout-only composite; no new cell field.
  - Tradeoff: Weakens the plan’s “accessible name from `label`” contract; tests that `getByRole` by cell label would fail unless callers label the control.
  - Confidence: MEDIUM — works, but fights the Phase 2 test contract.
  - Blind spot: S-02 might forget to label cells if the kit stops doing it.
- **Decision**: FIXED via Fix A

### F2 — Manual 2.12 is checked without written look gaps

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/authoring-form-components/plan.md:285
- **Detail**: Criterion 2.12 requires remaining look gaps vs `build-form-reference.png` to be written down, not forced. Phase 1 did this inline on 1.12 (stock Field typography, no torn-paper, `shadow-xs` only, stock Select popover). 2.12 is `[x]` with no appended list. Stories exist for the widgets, so a visual pass likely happened, but the written-drawbacks part of the criterion has no evidence.
- **Fix**: Append accepted Phase 2 gaps to 2.12 (e.g. stock Button/icon delete chrome; header is `text-muted-foreground` not mockup type; no torn-paper row panels; PhoneStacked does not lock ~390px).
- **Decision**: ACCEPTED-AS-RULE: Write accepted look gaps when checking visual criteria

### F3 — PhoneStacked story does not lock a phone viewport

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: src/components/ui/parts-row.stories.tsx:122
- **Detail**: Manual 2.9 is checked (columns on desktop, stacked on ~390px). Tests correctly refuse computed breakpoint visibility. `PhoneStacked` has no `max-w-[390px]` / `w-80` decorator (Field/Input stories wrap in `w-80`). Default Storybook canvas is desktop, so stacked labels are not the default canvas.
- **Fix**: Constrain `PhoneStacked` with `max-w-[390px]` (or a Storybook viewport) so stacked labels are visible without resizing.
- **Decision**: FIXED (w-80, matching Field/Input stories)

### F4 — Caller `style` can drop `--parts-columns`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/ui/parts-row.tsx:63
- **Detail**: `style={partsColumnsStyle(...)}` is set, then `{...props}` is spread. `className` is merged with `cn()`; `style` is not. A caller `style` wipes `--parts-columns` and the `md` grid (`repeat(var(--parts-columns), …)`) collapses. S-02 is unlikely to pass `style`, but this API uniquely depends on that variable. Same spread exists on `PartsListHeader` (line 35).
- **Fix**: Extract `style` from props and merge `{ ...partsColumnsStyle(n), ...style }`.
- **Decision**: FIXED

### F5 — OnTallPage places the sticky bar at the top of the tall container

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/ui/sticky-action-bar.stories.tsx:43
- **Detail**: `OnTallPage` puts `StickyActionBar` near the top of a `min-h-[160vh]` container. `sticky; bottom: 0` does not pin a top-of-flow element to the viewport bottom while scrolling. `WithPartsList` (flex column, bar after content) matches the export comment; Default already shows status / outline Discard / primary Save Draft.
- **Fix**: Put a tall spacer above the bar (footer-at-end), matching `WithPartsList`, so the documented positioning can be observed.
- **Decision**: FIXED
