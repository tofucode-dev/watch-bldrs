<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Filter UI Components

- **Plan**: context/changes/filter-ui-components/plan.md
- **Scope**: Full plan (Phase 1–2)
- **Date**: 2026-09-13
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — OptionsSelect size/className extension lacks co-located coverage

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/ui/options-select.tsx:18-19,43
- **Detail**: Phase 2 added optional `size` and `className` passthrough to `SelectTrigger`, but `options-select.test.tsx` and `options-select.stories.tsx` were not updated. Existing tests still cover only `id`, `aria-invalid`, and `disabled`.
- **Fix**: Add a test asserting `size="sm"` and `className` reach the trigger (e.g. `data-size="sm"` / merged classes). Add a `Small` story mirroring `button.stories.tsx` so the new prop is documented in Storybook.
- **Decision**: FIXED

### F2 — FilterControls stories use ephemeral fn() mocks

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/ui/filter-controls.stories.tsx:74,78
- **Detail**: `onDimensionChange` and `onClearAll` call `fn()(…)` inside handlers, creating a new mock on every interaction. This diverges from `options-select.stories.tsx`, which uses a stable `args.onValueChange` from meta `args`. Storybook Actions will not record calls reliably.
- **Fix**: Hoist `const onDimensionChange = fn()` and `const onClearAll = fn()` outside the demo (or wire through meta `args`) and invoke those stable spies inside handlers, matching the `OptionsSelect` story pattern.
- **Decision**: FIXED

### F3 — FilterControls outer div accepts disabled without forwarding

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: src/components/ui/filter-controls.tsx:16,44
- **Detail**: `FilterControlsProps extends ComponentProps<"div">`, so callers can pass `disabled` via `…props` onto the outer wrapper. That does not disable inner `OptionsSelect` or `FilterChip` controls. A consumer expecting toolbar-wide disable during loading (S-05) would get a silent no-op on the interactive children.
- **Fix A ⭐ Recommended**: Document the current behavior in a brief JSDoc on `FilterControlsProps` and defer explicit `disabled` forwarding until S-05 needs it.
  - Strength: Matches MVP scope — no consumer exists yet; avoids speculative API.
  - Tradeoff: S-05 may need a follow-up prop when wiring loading states.
  - Confidence: HIGH — plan explicitly defers catalog wiring to S-05.
  - Blind spot: S-05 loading UX not yet specified.
- **Fix B**: Add an explicit optional `disabled?: boolean` prop forwarded to every `OptionsSelect` and `FilterChip` now.
  - Strength: Ready for S-05 loading states without another kit change.
  - Tradeoff: Adds API surface not required by current acceptance criteria.
  - Confidence: MEDIUM — loading behavior in S-05 is unknown.
  - Blind spot: Whether S-05 needs whole-toolbar disable vs per-control disable.
- **Decision**: FIXED (Fix A — JSDoc documents layout-only div props)
