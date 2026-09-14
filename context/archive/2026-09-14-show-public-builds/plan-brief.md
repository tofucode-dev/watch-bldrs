# Show Public Builds — Plan Brief

> Full plan: `context/changes/show-public-builds/plan.md`  
> Research: `context/changes/show-public-builds/research.md`

## What & Why

Build the first live public catalog so visitors can browse structured published watch builds without signing in while every draft remains private. This is the roadmap's north-star slice: it proves that a finished build belongs in a dedicated catalog before filters, details, likes, and home recency are layered on.

## Starting Point

The database, RLS, private image bucket, and reusable card/grid components already exist. There is no catalog module, `/builds` route, published-list query, cursor contract, public image mapping, or catalog-specific privacy test; publishing itself is still waiting in S-03.

## Desired End State

`/builds` server-renders twelve newest published builds in the existing responsive grid. Visitors navigate stable Previous/Next cursor pages without JavaScript; drafts never appear for anonymous users or authenticated authors, and missing images degrade per card without hiding valid results.

Normal empty data, invalid cursor links, and query outages have distinct safe states. Catalog cards remain non-linked until S-06 adds details, while the shared card is repaired now so its future linked form exposes one accessible destination.

## Key Decisions Made

| Decision                  | Choice                       | Why                                                                 | Source   |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------- | -------- |
| Loading model             | SSR cursor pages             | Stable across concurrent publishes and accessible without hydration | Plan     |
| Page size                 | 12 displayed, 13 fetched     | Aligns with one/two/three-column grid and bounds signing work       | Plan     |
| Ordering                  | `published_at desc, id desc` | ID resolves equal-timestamp page boundaries                         | Research |
| Details gap               | Non-linked S-04 cards        | Avoids broken links and keeps S-06 scope intact                     | Plan     |
| Shared card accessibility | Repair in S-04               | Prevents duplicate or unnamed links becoming the details contract   | Plan     |
| Query failure             | Quiet explicit error         | Meets repository error-state rules without raw technical copy       | Plan     |
| Image failure             | Per-card placeholder         | Preserves usable catalog results during partial Storage failure     | Plan     |
| Invalid cursor            | 400 recovery state           | Makes malformed navigation explicit and safely recoverable          | Plan     |
| Likes before S-07         | Display `0`                  | Satisfies the card contract without premature persistence           | Research |
| Home page                 | Leave static                 | Live home recency belongs to S-10                                   | Research |
| Catalog index             | No speculative migration     | MVP volume is small; indexes follow observed query plans            | Research |

## Scope

**In scope:**

- New read-oriented `catalog` module and explicit `CatalogBuildCard` page model
- Published-only Supabase projection with composite before/after cursor pagination
- Short-lived signed URLs with safe per-image fallback
- Anonymous/author-A/user-B unit and integration evidence
- Non-hydrated `/builds` route with success, empty, invalid, and unavailable states
- Topbar link to `/builds`
- Optional/single-link `BuildCard` accessibility repair
- Phone, desktop, Storybook, lint, test, integration, and Workers-build verification

**Out of scope:**

- Publish UI, filters, details, likes persistence, account listing, and live home recency
- Search, ranking, sorting, recommendations, comments, profiles, and favourites
- Infinite scroll, client accumulation, browser Supabase catalog reads, and a client store
- Speculative indexes, schema/RLS changes, and new E2E infrastructure
- Repairing unrelated pre-existing roadmap formatting damage

## Architecture / Approach

`/builds` parses page parameters and calls `@/modules/catalog/server`. The application layer validates opaque `(published_at,id)` cursors and owns page contracts; Supabase infrastructure applies the explicit published predicate, tuple boundary, bounded projection, ordering, and image signing. Browser-safe catalog presentation receives only mapped display models and renders existing shared cards/grid plus semantic Previous/Next links.

## Phases at a Glance

| Phase                                     | What it delivers                                                   | Key risk                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 1. Published Catalog Query Boundary       | Module contracts, keyset query, signing, and identity-matrix tests | Authenticated-author drafts leaking through an unqualified RLS read |
| 2. Accessible SSR Catalog Surface         | Repaired card, page states, `/builds`, and navigation              | Shipping broken details links or indistinguishable failures         |
| 3. Production and Responsive Verification | Full gates, responsive/privacy evidence, and stale-doc corrections | Claiming completion without local RLS or browser evidence           |

**Prerequisites:** Local Supabase must be available for integration verification. S-03 is not an implementation prerequisite; it later completes the author-driven publish-to-catalog journey.  
**Estimated effort:** Approximately 3 implementation sessions across 3 phases.

## Open Risks & Assumptions

- The current roadmap is already dirty and has malformed frontmatter plus an inconsistent S-04 prerequisite cell; this plan changes only required status fields.
- Signed URL creation with the publishable request client continues to rely on the existing publication-aware Storage policy.
- Published rows are expected to have `published_at`; the catalog still applies a non-null predicate and treats the tuple as mandatory.
- No catalog ordering index is added at MVP scale; the representative query plan is recorded for later evidence-based indexing.
- There is no E2E harness. The plan uses component tests plus live identity-matrix integration tests and explicit manual browser verification.

## Success Criteria (Summary)

- Every identity sees the same deterministic published-only catalog pages, including equal-timestamp boundaries, and no draft ever appears.
- `/builds` works without client hydration at phone and desktop widths, with accessible cursor navigation and no broken details links.
- Empty, invalid, unavailable, and degraded-image states are distinct and safe; lint, unit/component tests, Storybook, local integration tests, and the Workers build pass.
