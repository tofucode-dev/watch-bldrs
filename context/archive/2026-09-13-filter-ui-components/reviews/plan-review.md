<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Filter UI Components

- **Plan**: context/changes/filter-ui-components/plan.md
- **Mode**: Deep
- **Date**: 2026-09-13
- **Verdict**: SOUND
- **Findings**: 0 critical 3 warnings 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | WARNING |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding

Grounding: 8/8 paths ✓, 5/5 symbols ✓, brief↔plan ✓

## Findings

### F1 — Visual criteria point at “the mockup,” but no filter-bar image is in the change folder

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Phase 1 / Phase 2 Manual Verification; Testing Strategy
- **Detail**: planning-questions.md mentions an attached filter-bar mockup that was never committed. Visual steps said “the mockup” with no path. The only committed filter region is `context/foundation/design-system.png`.
- **Fix A ⭐ Recommended**: Name `design-system.png` FILTER/DROPDOWN as the visual source
- **Fix B**: Commit the original planning-request mockup and cite that path
- **Decision**: FIXED via Fix B — plan cites `context/changes/filter-ui-components/filter-bar-reference.png`; image still needs to be dropped at that path

### F2 — FilterControls uses SelectOption[] but OptionsSelect does not re-export that type

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architectural Fitness
- **Location**: Phase 2 FilterControls contract
- **Detail**: `SelectOption` lives in `options-select-mapping.ts` (not a public API). A second generic `SelectOption<T>` lives in the builds domain. Implementer would guess the import.
- **Fix**: Inline `{ value: string; label: string }[]` on FilterControls; do not import the mapping file or domain type
- **Decision**: FIXED

### F3 — Two “Other” chips would share the same accessible name

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 1 FilterChip contract; Phase 2 chip derivation
- **Detail**: Chip text is the option label. Several enums include `Other`. Two active Others become two buttons named `Remove Other filter`.
- **Fix A ⭐ Recommended**: Add `accessibleName` / `dimensionLabel` so remove names include the dimension
- **Fix B**: Keep label-only chips and accept colliding names
- **Decision**: SKIPPED

### F4 — Compact filter triggers are unreachable without an OptionsSelect API change

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architectural Fitness
- **Location**: Implementation Approach; Migration Notes
- **Detail**: Plan originally forbade an OptionsSelect API change, but `SelectTrigger` already has `size="sm"` while `OptionsSelect` does not pass it through.
- **Fix**: Lock default-height OptionsSelect and record a smaller trigger as a look gap
- **Decision**: FIXED differently — allow optional `size` / `className` on `OptionsSelect` when the mockup needs a compact trigger; do not fork `FilterSelect`

### F5 — Storybook Clear all will no-op unless the story resets local state

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 stories contract; Manual Testing step 5
- **Detail**: `onClearAll` must not mutate values inside `FilterControls`. Stories using `fn()` only would make Clear all appear broken.
- **Fix**: Require stories’ local state to set every dimension value to `""` in `onClearAll`
- **Decision**: FIXED
