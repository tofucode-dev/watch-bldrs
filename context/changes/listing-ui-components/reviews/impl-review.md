<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Listing UI Components Implementation Plan

- **Plan**: context/changes/listing-ui-components/plan.md
- **Scope**: Phases 1–3 of 3
- **Date**: 2026-09-13
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 2 warnings 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Media details link has no accessible name (and duplicates the title link)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/ui/build-card.tsx:73
- **Detail**: The media region is always a real `<a href={href}>` in the tab order. Three outcomes are all defective: (1) missing image — the only child is an `aria-hidden` placeholder, so the link has an empty accessible name (every sparse card); (2) untitled + image — `resolveImageAlt` returns `""`, so the link wraps a decorative image and is unnamed; (3) named + image — alt defaults to `displayName`, so keyboard/AT get two consecutive links with the same name as the title `<a>` at line 146. Plan-review F4 already identified this and was SKIPPED; the tests lock in two links (`build-card.test.tsx:27–31`) and never assert that every link has an accessible name. Untitled-without-image still passes because `getByRole("link", { name: "Untitled build" })` finds the title link only.
- **Fix A ⭐ Recommended**: Keep the media `<a>` clickable for pointer users, but set `tabIndex={-1}` and `aria-hidden="true"` so the title link is the only named, keyboard-accessible details control.
  - Strength: One clear navigation stop without changing the visual design; matches the skipped plan-review Fix A.
  - Tradeoff: Keyboard users activate details through the title rather than the image.
  - Confidence: HIGH — the resulting accessible-name contract is deterministic and `photo-upload.tsx` already uses `tabIndex={-1}` for a non-tab-stop control.
  - Blind spot: The media link must remain visibly focus-neutral so it does not look keyboard-focusable.
- **Fix B**: Use one anchor that contains both media and title while keeping `footerAction` outside it.
  - Strength: Produces one semantic link and one accessible name; removes unnamed and duplicate-link cases together.
  - Tradeoff: Constrains card markup and hover/focus styling; metadata must not introduce interactive descendants.
  - Confidence: HIGH — it is the simpler accessibility tree.
  - Blind spot: Overlay `PaperLabel` would then sit inside or beside that single anchor and needs an explicit pointer-events choice.
- **Decision**: ACCEPTED-AS-RULE: Decorative linked media must not be an unnamed navigation stop

### F2 — Grid list items keyed by index, child keys discarded

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/ui/build-grid.tsx:18
- **Detail**: `BuildGrid` correctly preserves source order via `Children.toArray`, but wraps each child in `<li key={index}>`. Caller keys on `BuildCard` (the expected S-04 pattern `builds.map(b => <BuildCard key={b.id} />)`) never become the list-item identity. Insert, prepend, or filter replacement will reuse the wrong `<li>` DOM node. Child keys still exist on the inner element, so a keyed `BuildCard` will remount, and unhydrated SSR listings are low-risk today; a future hydrated like island in `footerAction` is the blast radius. Plan-review F3 Fix A (own the `<li>`) landed without forwarding keys.
- **Fix**: Key each `<li>` from the child’s key when present (`isValidElement(child) && child.key != null ? child.key : index`).
- **Decision**: FIXED

### F3 — Paper-label overlay steals clicks from the media link

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/ui/build-card.tsx:93
- **Detail**: `PaperLabel` is a non-interactive sibling, absolutely positioned over the image link. That avoids nested interactives, but clicks on the tape do not activate details. Nested-interactive tests would not catch this.
- **Fix**: Add `pointer-events-none` to the overlay `PaperLabel` className so clicks pass through to the media link.
- **Decision**: FIXED

### F4 — Grid tests locate the semantic list via data-slot instead of roles

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/ui/build-grid.test.tsx:20
- **Detail**: The grid is a real `<ul>`/`<li>`. The plan’s testing strategy says to query by role/name and use `data-slot` only when there is no semantic query. The structural test uses `container.querySelector("[data-slot='build-grid']")` / `querySelectorAll("[data-slot='build-grid-item']")` instead of `getByRole("list")` / `getAllByRole("listitem")`. A `role="presentation"` regression would still pass. Class-contract checks can keep `data-slot`.
- **Fix**: Assert list semantics with `getByRole("list")` and `getAllByRole("listitem")`; keep `data-slot` only for the class-contract test.
- **Decision**: FIXED
