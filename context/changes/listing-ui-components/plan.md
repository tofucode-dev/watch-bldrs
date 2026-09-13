# Listing UI Components Implementation Plan

## Overview

Create the reusable, presentation-only UI kit needed to show watch builds in listings. The kit will translate the paper-and-ink design direction into accessible React primitives, an honest build-card composition, a responsive grid, and a presentational load-more affordance without implementing the public catalog, search, filters, sorting, or pagination behavior.

## Current State Analysis

The repository already has the WatchBldrs color, typography, paper texture, spacing, and focus tokens, plus a small shared React UI library with Storybook and jsdom component tests. It does not yet have card, badge/tag, paper-label, build-card, listing-grid, or listing-loading components. There is no `catalog` module or `/builds` route, and publishing is not implemented, so this foundation must be verified with deterministic Storybook fixtures rather than live data.

The supplied listing reference is a visual source, not a scope source. Its card imagery, overlapping paper label, metadata tags, three-column desktop rhythm, and load-more treatment are relevant; its search field, filter controls, result chips, ranked tabs, author handle, excerpt, comment count, and bookmark are not supported by this change or the MVP contract.

## Desired End State

The shared UI library exposes composable listing primitives and a responsive build-card/grid composition that S-04 can consume without restyling or duplicating components. A card can render the future catalog card fields, handles every nullable display field, reserves stable image space, provides accessible details navigation, and leaves footer actions outside the link for a later like control.

The grid preserves caller-provided order and changes from one column on phones to two on medium screens and three on wide screens. A presentational load-more component exposes idle, loading, disabled, and end-of-list states but owns no request, cursor, URL, or accumulated-result state.

### Key Discoveries:

- F-04 is explicitly the shared listing kit; real public-listing composition and pagination/infinite loading belong to S-04 (`context/foundation/roadmap.md:196`, `context/foundation/roadmap.md:274`).
- Search and Hot/Best/Popular ranking are MVP non-goals, and likes must not change listing order (`context/foundation/prd.md:172`, `context/foundation/prd.md:181`, `context/foundation/prd.md:166`).
- The future `CatalogBuildCard` contract contains id, nullable name/image/attributes, and like count, but no author, excerpt, comment, or bookmark fields (`context/foundation/architecture/data-model.md:80`).
- Shared presentation primitives live in `src/components/ui`, use `cn()`, and remain independent from business module and server imports (`context/foundation/architecture/modules.md:98`, `src/lib/utils.ts:4`).
- Public catalog content is server-rendered and read-only UI must not be hydrated solely to fetch data (`context/foundation/architecture/runtime.md:26`).
- Existing global tokens already provide the cream/card/charcoal/burnt-orange palette, tonal accents, heading/body fonts, paper shadow, and dark equivalents (`src/styles/global.css:6`, `src/styles/global.css:47`, `src/styles/global.css:87`).
- Storybook discovers co-located React stories and supports the Paper/Ink theme; Vitest runs `*.test.tsx` in jsdom (`.storybook/main.ts:9`, `.storybook/preview.tsx:3`, `vitest.config.ts:21`).
- Database-valid published builds may lack a name, main image, and any or all card attributes, so fallbacks are part of the component contract rather than exceptional behavior (`context/foundation/architecture/data-model.md:22`).

## What We're NOT Doing

- Creating `src/modules/catalog`, a `/builds` route, catalog application use cases, Supabase queries, signed-image URL resolution, or page-level state.
- Implementing publish, public details, account listing, or like persistence.
- Implementing search, filter controls, active-filter chips, result counts, or AND-filter behavior.
- Adding All/Recent/Popular/Hot tabs, popularity ranking, recommendation logic, or user-selectable sorting.
- Choosing pagination, numbered pages, automatic infinite scroll, cursor encoding, or load-more data behavior; S-04 owns that decision.
- Adding author handles or profiles, story excerpts, comments, comment counts, bookmark/favourite actions, or separate save behavior.
- Adding a second navigation/footer system or composing the complete reference page.
- Adding migrations, indexes, database types, server code, browser Supabase calls, or a client state store.
- Requiring manual visual verification or pixel-regression infrastructure in this change. Story coverage and `storybook:build` are the approved automated evidence; remaining visual differences are an acknowledged risk.

## Implementation Approach

Build upward from small shared primitives into one listing composition. Add the standard shadcn Card and Badge foundations using the repository's `new-york` conventions, then layer a custom paper label and compact tonal metadata treatment over existing tokens. Compose those pieces into a controlled `BuildCard` contract that accepts display-ready values rather than database rows or catalog module types. Finish with a responsive `BuildGrid` and a presentational `ListingLoadMore` control.

All components remain hook-free unless local rendering behavior genuinely requires a hook, accept native element props where appropriate, expose stable `data-slot` markers, and merge conditional classes with `cn()`. Stories own fictional fixtures and demonstrate variants, missing data, long content, phone layout, desktop layout, and load-more states. Component tests assert semantic contracts and state rendering rather than CSS-engine layout calculations.

## Critical Implementation Details

### User experience spec

The image and title are the card's details links; the footer is a sibling region so a future like button never becomes a nested interactive element. When the name is absent the visible and accessible title is `Untitled build`; when the image is absent the card renders a neutral placeholder inside the same fixed-aspect media frame; absent metadata produces no invented tags.

### Performance constraints

The image contract must carry explicit dimensions or a fixed aspect-ratio frame to prevent layout shift and must allow the consumer to choose eager/high-priority loading for the first visible cards while defaulting ordinary cards to lazy loading. The grid must preserve child order so a later deterministic `published_at desc, id desc` query—including the id tie-break when publish times are equal—can paginate without presentation-layer reordering.

## Phase 1: Listing Primitives

### Overview

Establish the low-level card, badge/tag, and paper-label vocabulary used by every later listing composition, while reusing the current Button rather than creating a competing control.

### Changes Required:

#### 1. Card anatomy

**File**: `src/components/ui/card.tsx`

**Intent**: Add the standard shared card shell and named anatomy required to compose image, content, and footer regions consistently.

**Contract**: Export `Card` and the minimal Card subcomponents actually used by the listing. Each accepts the corresponding native element props, merges `className` with `cn()`, exposes a stable `data-slot`, and uses existing card/border/radius/shadow tokens.

#### 2. Badge and metadata tag treatment

**File**: `src/components/ui/badge.tsx`

**Intent**: Add a compact shared badge that can render build metadata tags without hardcoding movement, case-size, strap, or other Builds vocabularies.

**Contract**: Export `Badge` and its CVA variants. Support neutral and existing-token tonal treatments needed by the reference, preserve caller-provided text, and allow polymorphic/link composition only if the standard shadcn contract already supports it without new dependencies.

#### 3. Paper label

**File**: `src/components/ui/paper-label.tsx`

**Intent**: Add the overlapping tape/paper label used for an optional watch-style eyebrow while avoiding collision with the existing semantic form `Label`.

**Contract**: Export `PaperLabel` with native span props and a small domain-free tone/rotation variant contract. It renders text supplied by the caller, is decorative unless the caller gives it semantic meaning, and uses existing primary/mustard/olive/field/pilot tokens rather than watch-style mappings.

#### 4. Primitive stories

**Files**: `src/components/ui/card.stories.tsx`, `src/components/ui/badge.stories.tsx`, `src/components/ui/paper-label.stories.tsx`, `src/components/ui/button.stories.tsx`

**Intent**: Make all new primitives and the chosen outline listing button treatment inspectable and compile-checked in the existing UI workshop.

**Contract**: Use `UI/...` titles, autodocs, repository tokens, Paper/Ink compatibility, representative tonal variants, long text, and a disabled button example. Update the Button story only; do not add a listing-specific Button variant unless composition proves the existing outline variant insufficient.

#### 5. Primitive component tests

**Files**: `src/components/ui/badge.test.tsx`, `src/components/ui/paper-label.test.tsx`

**Intent**: Protect variant, native-prop, class-merging, and semantic behavior that is specific to the custom listing treatments.

**Contract**: Use Testing Library semantic queries and `data-slot` only for structural assertions. Verify caller text, native props, custom classes, selected variants, and that `PaperLabel` does not introduce interactive behavior.

### Success Criteria:

#### Automated Verification:

- Card, Badge, and PaperLabel modules pass their focused component tests: `npm test -- src/components/ui/badge.test.tsx src/components/ui/paper-label.test.tsx`
- Shared UI lint passes after the primitive additions: `npm run lint`
- All primitive stories compile in the production Storybook bundle: `npm run storybook:build`

---

## Phase 2: Accessible Build Card Composition

### Overview

Compose the primitives into the reusable card consumed by future public, account, details-adjacent, and home surfaces without coupling the shared UI library to catalog queries or database types. `BuildCard` is an intentional F-04 shared-UI exception: it exposes the same build-specific display fields across those surfaces, while catalog queries, persistence, authorization, and server-only behavior remain outside the component.

### Changes Required:

#### 1. Build card contract and rendering

**File**: `src/components/ui/build-card.tsx`

**Intent**: Provide one canonical listing card whose required inputs match data the planned catalog can actually supply and whose optional fields remain honest when author data is sparse.

**Contract**: Export `BuildCard` and its presentation-only prop types. The contract accepts a details `href`; nullable/optional name, image, style label, and metadata tags; a numeric like count; image alt/dimensions/loading hints; and an optional footer action slot. It must not import database types, `@/modules/catalog`, Astro server APIs, or Supabase.

The media and title link to the same details destination without wrapping footer actions. The card exposes a heading, a stable media aspect ratio, `Untitled build` and missing-image fallbacks, omitted absent tags, a non-interactive like-count display, and a sibling footer-action region. Icon-only caller actions remain responsible for an accessible name through their native props.

#### 2. Build card stories

**File**: `src/components/ui/build-card.stories.tsx`

**Intent**: Exercise the visual contract against realistic, deterministic fixtures without requiring a publish flow, database seed, or signed Storage URL.

**Contract**: Include complete, sparse, missing-image, untitled, no-tags, maximum-length-title, action-slot, Paper-theme, and Ink-theme-compatible examples. Fixtures may use an authorless build and like count, but must not add comments, bookmarks, profile handles, or story excerpts to the component API.

#### 3. Build card component tests

**File**: `src/components/ui/build-card.test.tsx`

**Intent**: Lock the accessible navigation and fallback behavior that downstream pages must be able to rely on.

**Contract**: Verify the linked image/title destinations, heading accessible name, meaningful or explicitly decorative image alt behavior, `Untitled build`, missing-image placeholder, omission of null tags, rendered metadata and like count, separate action-slot interaction, no nested interactive elements, custom class merging, and lazy-loading default with a caller override.

### Success Criteria:

#### Automated Verification:

- BuildCard semantics, fallbacks, metadata, action separation, and image-loading contracts pass: `npm test -- src/components/ui/build-card.test.tsx`
- BuildCard and its stories pass repository lint: `npm run lint`
- Complete and sparse BuildCard stories compile in Storybook: `npm run storybook:build`

---

## Phase 3: Responsive Grid and Load-More Affordance

### Overview

Provide the page-agnostic layout and loading affordance that S-04 can connect to server-rendered results and a later pagination decision.

### Changes Required:

#### 1. Responsive build grid

**File**: `src/components/ui/build-grid.tsx`

**Intent**: Standardize listing rhythm and responsive card density without owning data, sorting, empty/error behavior, or network state.

**Contract**: Export `BuildGrid` as a semantic `<ul>` accepting native list props. It wraps each caller-supplied direct child in a styled `<li>` and preserves that order; callers pass one card per direct child. It renders one column by default, two at the repository's medium breakpoint, and three at the wide breakpoint; merges custom classes with `cn()`; and does not clone, sort, virtualize, or fetch children.

#### 2. Presentational load-more control

**File**: `src/components/ui/listing-load-more.tsx`

**Intent**: Capture the reference's centered Load More treatment while leaving request, cursor, URL, retry, accumulation, and scroll behavior to S-04.

**Contract**: Export `ListingLoadMore` using the existing `Button`. Accept native button props except internally rendered `children` and `aria-busy`, plus display-only loading and has-more/end-state inputs. Default `type` to `"button"`, compute `effectiveDisabled = disabled || loading`, and derive `aria-busy` from `loading`; caller props cannot override those computed states. The end state replaces or suppresses the button with caller-configurable non-interactive copy. The component must not use IntersectionObserver, fetch, Supabase, Actions, or a client store.

#### 3. Grid and loading stories

**Files**: `src/components/ui/build-grid.stories.tsx`, `src/components/ui/listing-load-more.stories.tsx`

**Intent**: Compile-check the intended phone/desktop composition and every presentational loading state using fixtures.

**Contract**: Grid stories show one, two, and multiple cards; a fixed phone-width wrapper; wide three-column composition; sparse cards; and preserved source order. Load-more stories cover idle, loading, disabled, and end-of-list states. Do not add a sort selector, filter row, search box, ranked tabs, or a live request.

#### 4. Grid and loading component tests

**Files**: `src/components/ui/build-grid.test.tsx`, `src/components/ui/listing-load-more.test.tsx`

**Intent**: Verify structural responsiveness and loading-control semantics without brittle browser-layout assertions.

**Contract**: Assert `<ul>` semantics, one direct list item for each supplied child, source-order preservation, responsive grid class contract, custom class merging, button accessible name, disabled/loading/`aria-busy` behavior, click forwarding only when enabled, and end-of-list rendering.

### Success Criteria:

#### Automated Verification:

- Grid and load-more component contracts pass: `npm test -- src/components/ui/build-grid.test.tsx src/components/ui/listing-load-more.test.tsx`
- The complete unit/component test suite passes: `npm test`
- Repository lint passes: `npm run lint`
- All listing stories and both themes compile in the production Storybook bundle: `npm run storybook:build`
- The Cloudflare Workers production build passes without client/server boundary regressions: `npm run build`

---

## Testing Strategy

### Unit and Component Tests:

- Test custom primitive variants and native prop forwarding where behavior differs from stock shadcn primitives.
- Query cards and controls by role and accessible name; use `data-slot` only for structural contracts that have no semantic query.
- Cover complete and sparse card data, including missing name, image, style, every metadata tag, and all metadata tags.
- Cover a 120-character name without asserting browser-specific line wrapping.
- Verify that linked card content and footer actions are siblings and no interactive element is nested inside another.
- Verify explicit image dimensions/aspect frame, lazy-loading default, and caller override.
- Verify grid source order and responsive class contract without pretending jsdom computes media-query layout.
- Verify idle, loading, disabled, and exhausted load-more states and suppress duplicate clicks through native disabled behavior.

### Integration Tests:

- None in F-04. No database, RLS, Storage, Action, route, or catalog data boundary changes.
- S-04 must later test published-only querying as anonymous, author A, and user B because build RLS also allows an author to select their own drafts.

### Automated Visual/Compilation Coverage:

- Storybook fixtures cover Paper/Ink-compatible primitives, complete/sparse cards, phone-width and desktop grids, and all load-more states.
- `npm run storybook:build` is the required automated visual-workshop compilation gate.
- No screenshot comparison or human visual-review checkpoint is required by this plan; visual fidelity beyond compiled stories remains a known limitation.

## Performance Considerations

- Keep components presentational and unhydrated when consumed by Astro read-only pages.
- Reserve stable media geometry and forward width, height, decoding, and loading attributes so S-04 can prevent layout shift and prioritize only above-the-fold images.
- Render only supplied children; do not add virtualization for the MVP's small data volume.
- Keep the grid order-agnostic. Future catalog code owns deterministic newest-first ordering and the `published_at` plus `id` pagination tie-break.
- Do not introduce dependencies beyond standard shadcn primitives already compatible with the current React/Storybook stack unless implementation demonstrates a concrete need.

## Migration Notes

No database, RLS, Storage, generated-type, environment, or deployment migration is required. Rollback is removal of the new shared components, stories, and tests plus any narrowly added primitive dependency; no persisted state is affected.

## References

- Product scope and non-goals: `context/foundation/prd.md:43`, `context/foundation/prd.md:172`
- F-04 and S-04 ownership boundary: `context/foundation/roadmap.md:196`, `context/foundation/roadmap.md:274`
- Visual system and slice ownership: `context/foundation/design-system.md:1`, `context/foundation/design-system.md:26`
- Visual board: `context/foundation/design-system.png`
- User-supplied listing reference: `C:/Users/Pawel/Desktop/WatchBuildersClub/ChatGPT Image Sep 3, 2026, 12_46_18 AM.png`
- Shared UI/module boundaries: `context/foundation/architecture/modules.md:98`
- SSR and hydration rules: `context/foundation/architecture/runtime.md:26`
- Catalog card and ordering contract for future S-04 work: `context/foundation/architecture/data-model.md:80`
- Component testing expectations: `context/foundation/architecture/testing.md:29`
- Existing visual tokens: `src/styles/global.css:6`
- Existing Button convention: `src/components/ui/button.tsx:7`
- Existing Storybook convention: `src/components/ui/parts-row.stories.tsx:81`
- Existing component-test convention: `src/components/ui/parts-row.test.tsx:1`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Listing Primitives

#### Automated

- [x] 1.1 Card, Badge, and PaperLabel modules pass their focused component tests
- [x] 1.2 Shared UI lint passes after the primitive additions
- [x] 1.3 All primitive stories compile in the production Storybook bundle

### Phase 2: Accessible Build Card Composition

#### Automated

- [ ] 2.1 BuildCard semantics, fallbacks, metadata, action separation, and image-loading contracts pass
- [ ] 2.2 BuildCard and its stories pass repository lint
- [ ] 2.3 Complete and sparse BuildCard stories compile in Storybook

### Phase 3: Responsive Grid and Load-More Affordance

#### Automated

- [ ] 3.1 Grid and load-more component contracts pass
- [ ] 3.2 The complete unit/component test suite passes
- [ ] 3.3 Repository lint passes
- [ ] 3.4 All listing stories and both themes compile in the production Storybook bundle
- [ ] 3.5 The Cloudflare Workers production build passes without client/server boundary regressions
