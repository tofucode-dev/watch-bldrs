<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Listing UI Components Implementation Plan

- **Plan**: `context/changes/listing-ui-components/plan.md`
- **Mode**: Deep
- **Date**: 2026-09-13
- **Verdict**: REVISE
- **Findings**: 1 critical, 4 warnings, 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | FAIL |

## Grounding

Grounding: 7/7 path intents ✓, 5/5 symbols ✓, brief↔plan ✓. The six absent component paths are explicitly declared additions; the existing `button.stories.tsx` path was confirmed. No existing symbol conflicts or unlisted consumers were found. The Progress section is structurally valid and complete.

## Findings

### F1 — Compilation does not verify the responsive visual contract

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — repository requirements and the automated-only preference need to be reconciled
- **Dimension**: Plan Completeness
- **Location**: What We're NOT Doing; Phases 1 and 3 verification
- **Detail**: The plan explicitly excludes manual visual verification and treats `storybook:build` as sufficient. This conflicts with `AGENTS.md:161`, which requires viewing changed primitives with `npm run storybook`, and `AGENTS.md:214`, which requires checking UI changes at phone and desktop widths. `storybook:build` proves compilation only. Paper/Ink switching occurs at runtime in `.storybook/preview.tsx`, and a narrow wrapper rendered inside a desktop viewport does not activate Tailwind viewport breakpoints such as `md:`.
- **Fix A ⭐ Recommended**: Add a small manual Progress check covering Paper/Ink and actual phone/desktop Storybook viewports.
  - Strength: Meets repository requirements with minimal scope.
  - Tradeoff: Introduces a human completion gate.
  - Confidence: HIGH — directly follows the repository workflow.
  - Blind spot: It does not provide repeatable pixel regression.
- **Fix B**: Add browser-level Storybook checks using real viewport sizes and both theme states.
  - Strength: Keeps verification automated and repeatable.
  - Tradeoff: Adds tooling and substantially more work to a small foundation slice.
  - Confidence: MEDIUM — no Storybook browser-test setup currently exists.
  - Blind spot: Visual fidelity still requires explicit assertions or snapshots.
- **Decision**: SKIPPED

### F2 — `BuildCard` crosses the documented shared-UI boundary

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — the choice sets a precedent for later catalog, account, and home components
- **Dimension**: Architectural Fitness
- **Location**: Phase 2 — Build card contract
- **Detail**: The architecture says shared components are domain-free while feature components remain inside their module (`context/foundation/architecture/modules.md:142-145`). `BuildCard` encodes watch attributes, like count, build fallbacks, and details navigation, so it is feature composition rather than a primitive. The roadmap simultaneously assigns listing cards to the shared UI library (`context/foundation/roadmap.md:196-206`), and existing components such as `PartsRow` provide precedent. The plan needs to resolve this conflict explicitly instead of presenting the placement as unquestionably compliant.
- **Fix A ⭐ Recommended**: Keep `BuildCard` in shared UI as a documented F-04 roadmap exception, restrict it to display-ready props, and record why cross-surface reuse justifies the exception.
  - Strength: Preserves the roadmap boundary and existing Storybook discovery.
  - Tradeoff: Leaves a deliberate exception to the module architecture.
  - Confidence: MEDIUM — repository documents currently point in both directions.
  - Blind spot: Future catalog-specific behavior must not migrate into the shared component.
- **Fix B**: Put `BuildCard` in a feature module and broaden Storybook discovery to cover module presentation stories.
  - Strength: Follows the feature-component architecture strictly.
  - Tradeoff: Prematurely creates or selects a module that this plan deliberately excludes.
  - Confidence: MEDIUM — `catalog` is the likely owner but does not exist yet.
  - Blind spot: Account and home reuse may then require a public presentation export.
- **Decision**: FIXED via Fix A — keep the build-specific card shared and document the F-04 exception

### F3 — `BuildGrid` leaves list-item ownership undecided

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — the public markup contract must be decided before multiple consumers depend on it
- **Dimension**: Plan Completeness
- **Location**: Phase 3 — Responsive build grid
- **Detail**: The contract promises a semantic list while accepting arbitrary caller-owned children. A `<ul>` cannot directly contain `BuildCard` elements unless the grid wraps them in `<li>`, or callers are required to supply list items. The tests currently require only vague "list semantics," so an invalid structure could satisfy the plan. Existing repository list patterns own both wrapper and item markup.
- **Fix A ⭐ Recommended**: Specify that `BuildGrid` renders `<ul>` and wraps each supplied card in a styled `<li>`.
  - Strength: Valid semantics are guaranteed for every consumer.
  - Tradeoff: The grid controls one additional markup layer.
  - Confidence: HIGH — this matches existing repository list patterns.
  - Blind spot: The contract should document whether callers may pass fragments.
- **Fix B**: Export `BuildGridItem` and require all direct children to use it.
  - Strength: Gives consumers control over item-level attributes and keys.
  - Tradeoff: Adds another component and permits misuse when callers bypass it.
  - Confidence: HIGH — it is a standard explicit composition pattern.
  - Blind spot: Runtime enforcement would still be limited.
- **Decision**: FIXED via Fix A — `BuildGrid` owns the `<ul>` and direct `<li>` wrappers

### F4 — Decorative images can create an unnamed navigation link

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — the accessible navigation structure needs an explicit choice
- **Dimension**: Blind Spots
- **Location**: Phase 2 — BuildCard navigation and tests
- **Detail**: The plan requires the image and title to link to the same destination while allowing the linked image to have decorative empty alt text. An anchor whose only content is an empty-alt image has no accessible name. Giving it meaningful alt text instead creates two consecutive links to the same destination without deciding how keyboard navigation should behave.
- **Fix A ⭐ Recommended**: Make the title the only keyboard-accessible details link; keep the clickable media link outside the tab order and decorative to assistive technology.
  - Strength: Provides one clear navigation stop without changing the visual design.
  - Tradeoff: Keyboard users activate details through the title rather than the image.
  - Confidence: HIGH — the resulting accessible-name contract is deterministic.
  - Blind spot: The media link must remain visibly focus-neutral.
- **Fix B**: Use one anchor that contains both media and title while keeping the footer action outside it.
  - Strength: Produces one semantic link and one accessible name.
  - Tradeoff: Constrains card markup and hover/focus styling.
  - Confidence: HIGH — it removes both unnamed and duplicate-link cases.
  - Blind spot: Metadata placement must not introduce interactive descendants.
- **Decision**: SKIPPED

### F5 — Load More can accidentally submit a form or expose contradictory state

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — the fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 3 — `ListingLoadMore`
- **Detail**: The component accepts native button props while internally owning loading, disabled, `aria-busy`, and label behavior. The plan does not define precedence, and it does not require `type="button"`. A Load More control placed inside a future filter form could therefore submit the form, while prop spread order could let caller props override loading semantics.
- **Fix**: Reserve internally controlled props, default to `type="button"`, and specify `effectiveDisabled = disabled || loading`, with `aria-busy` derived from loading.
- **Decision**: FIXED — reserve computed button state and default to `type="button"`

## Triage Summary

- **Fixed**: F2 (Fix A), F3 (Fix A), F5
- **Skipped**: F1, F4
- **Accepted**: None
- **Dismissed**: None
- **Verdict after fixes**: REVISE — unchanged because the skipped critical visual-verification gap remains
