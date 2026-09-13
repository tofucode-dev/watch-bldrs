# Listing UI Components — Plan Brief

> Full plan: `context/changes/listing-ui-components/plan.md`

## What & Why

Build the shared listing UI kit that later public catalog, account, detail-adjacent, and home surfaces can reuse. The work turns the established paper-and-ink design into accessible listing primitives without pulling live catalog behavior, search, filters, or ranking into this foundation.

## Starting Point

WatchBldrs already has global design tokens, a small shadcn-style UI library, Storybook, and jsdom component tests. It has no card/listing components, public catalog module, `/builds` route, or publish flow, so this change uses deterministic fixtures and stays presentation-only.

## Desired End State

The shared UI library contains tonal badges/tags, a paper label, an accessible BuildCard, a responsive one/two/three-column grid, and a presentational Load More control. Cards render nullable catalog data honestly, keep details links separate from future footer actions, and can be server-rendered without client state.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Foundation boundary | Components and layout only | Roadmap assigns live catalog and pagination behavior to S-04. |
| Card fields | Image, style label, name, metadata tags, like count | These map to the planned catalog card contract; reference-only fields do not. |
| Reference-only content | Omit author, excerpt, comments, and bookmark | There is no public profile/comment/save data, and like is the only MVP save. |
| Missing data | Honest fallbacks | Valid sparse builds remain visible without fabricated information. |
| Navigation | Linked image/title plus sibling action slot | Supports a later like button without nested interactive elements. |
| Loading affordance | Presentational Load More | Matches the design while leaving data and cursor behavior to S-04. |
| Sorting | Compatibility only; no control | Newest-first is the only current order and ranking is deferred. |
| Grid | One/two/three columns | Matches phone usability, desktop density, and the reference rhythm. |
| Verification | Automated tests and builds only | User chose no required manual visual matrix for this foundation. |

## Scope

**In scope:**

- Shared Card and Badge/tag primitives.
- Paper-style listing label using existing tokens.
- Accessible BuildCard with nullable-data fallbacks and optional footer action.
- Responsive BuildGrid preserving caller order.
- Presentational Load More idle/loading/disabled/end states.
- Co-located Storybook stories and jsdom component tests.
- Lint, full unit tests, Storybook production build, and Workers build.

**Out of scope:**

- Catalog module, route, queries, signed-image resolution, and publish flow.
- Search, filters, result chips/count, ranked tabs, and sorting controls.
- Pagination/cursor/infinite-scroll behavior and network state.
- Profiles/author handles, story excerpts, comments, bookmarks, or like persistence.
- Full listing-page chrome, navigation, and footer composition.
- Database, RLS, Storage, and generated-type changes.
- Required human visual review or screenshot regression.

## Architecture / Approach

Shared token-driven primitives in `src/components/ui` compose into a presentation-only BuildCard, which composes into a responsive BuildGrid. S-04 will later supply server-rendered published data in deterministic order and wire ListingLoadMore to its chosen pagination contract; no component in this change imports server or database code.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Listing Primitives | Card, Badge/tag, PaperLabel, and listing button treatment | Over-specializing shared primitives around one mockup. |
| 2. Build Card | Accessible composition and sparse-data behavior | Nested interactions or inventing unavailable card data. |
| 3. Grid and Load More | Responsive layout and presentational loading states | Accidentally absorbing S-04 state/data responsibilities. |

**Prerequisites:** None; live data and publishing are deliberately unnecessary for this UI foundation.

**Estimated effort:** Approximately 2–3 focused implementation sessions across three phases.

## Open Risks & Assumptions

- The external listing reference is not copied into the repository; `context/foundation/design-system.png` remains the durable in-repo visual source.
- Automated Storybook compilation proves stories render, not that they visually match the reference at every viewport.
- The future catalog contract may evolve, but keeping card inputs display-ready and nullable limits coupling.
- S-04 still must decide pagination versus infinite loading and must implement the `published_at`/`id` ordering tie-break.
- A later like control must use the action slot rather than wrapping the entire card in a link.

## Success Criteria (Summary)

- Downstream listing surfaces can compose cards, a responsive grid, and Load More without duplicating styling or importing server code.
- Complete and sparse card states remain accessible, stable, and semantically valid under component tests.
- Lint, the full test suite, Storybook production build, and Cloudflare Workers build pass.
