# Publish Draft Build — Plan Brief

> Full plan: `context/changes/publish-draft-build/plan.md`  
> Research: `context/changes/publish-draft-build/research.md`

## What & Why

Add the missing S-03 author action: an authenticated author can publish an owned, saved draft so it becomes eligible for later public catalog reads. The transition must remain private before publication, preserve its first timestamp, tolerate retries, and avoid absorbing catalog or account-list work.

## Starting Point

Draft creation, editing, parts, and private main-image attachment already work through the `builds` module and `BuildForm`. The schema, RLS, publication timestamp trigger, and derived Storage visibility already exist, but there is no publish use case, store operation, Action, or UI control.

## Desired End State

An author saves a draft, chooses Publish in the sticky form actions, confirms inline, and lands on a dashboard success message. Unsaved fields or photo changes block publication. First publication is atomic; the same owner's retry succeeds without another update, while anonymous, non-owner, and missing targets remain protected.

## Key Decisions Made

| Decision            | Choice                                                               | Why                                                                                                 | Source          |
| ------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------- |
| Persistence         | Conditional direct update plus owner/published fallback              | One-row publication is already atomic; the fallback makes retries true no-ops without adding an RPC | Research / Plan |
| Retry result        | Idempotent success                                                   | Recovers from lost responses and concurrent clicks without resetting timestamps                     | Plan            |
| Unsaved changes     | Require Save first                                                   | Prevents publishing stale fields or a build whose photo has not attached                            | Plan            |
| Publish placement   | Existing `BuildForm` sticky bar                                      | Reuses draft ID, saved snapshots, mutation lock, and feedback state                                 | Plan            |
| Confirmation        | Inline confirmation                                                  | Makes the UI-irreversible action deliberate without adding a dialog primitive                       | Plan            |
| Success destination | `/dashboard?published=1`                                             | Existing authenticated route avoids refresh-to-404 on the draft-only edit URL                       | Plan            |
| Verification        | Unit, component, focused integration, lint, Storybook, Workers build | Repository rules require the real data boundary to prove RLS, triggers, and concurrency             | Research / Plan |

## Scope

**In scope:**

- `publishBuild` use case, store contract, Supabase adapter, request composition, and Astro Action
- Owner-only, draft-only transition plus same-owner idempotent retry
- Publish eligibility, inline confirmation, pending/error recovery, and redirect
- Responsive three-action sticky bar and a representative Storybook case
- Dashboard success message
- Unit, component, and local-Supabase integration coverage

**Out of scope:**

- Catalog, public details, account list, filters, likes, or home shelves
- Unpublish/republish or published-build editing UI
- New required build fields or publication validation
- Database migration/RPC, image movement, caching, rate limits, or new dependencies
- Browser E2E infrastructure

## Architecture / Approach

`BuildForm -> actions.builds.publish -> publishBuild(actor, id, store) -> BuildStore.publishBuild -> Supabase`. The common path conditionally updates one owned draft. A zero-row result triggers an owner-and-published lookup: owned published means safe retry; everything else remains not found. The existing database trigger and policies own timestamps and public visibility.

## Phases at a Glance

| Phase                                  | What it delivers                                                                            | Key risk                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1. Publication command and persistence | Application/Action/store boundary plus identity, retry, timestamp, and concurrency tests    | Accidentally classifying another user's public row as an owned retry |
| 2. Author publish experience           | Clean-state gating, inline confirmation, responsive controls, redirect, and component tests | Publishing stale form data or before photo attachment completes      |
| 3. Cross-cutting verification          | Full automated gates and responsive/security smoke pass                                     | Later-slice scope leaking into this thin publication change          |

**Prerequisites:** S-02 `create-draft-build` is complete; local Supabase must be available for the integration gate.  
**Estimated effort:** About 2–3 implementation sessions across three phases.

## Open Risks & Assumptions

- The dashboard is intentionally a temporary success destination until account listing or public details provides a stronger destination.
- Publication currently has no persisted side effects beyond the build row; if that changes, the direct update must be reconsidered as a transaction/RPC.
- The roadmap file has unrelated concurrent formatting/frontmatter edits; planning status synchronization must touch only S-03 status fields.
- Existing rate-limit guidance remains deferred because this slice does not introduce the project's rate-limiting foundation.

## Success Criteria (Summary)

- Only an authenticated owner can publish a saved draft; retries and concurrent requests preserve the first publication and update timestamps.
- Unsaved or failed-to-persist form/photo state cannot be published, and failures preserve author input for retry.
- The responsive confirmation flow lands on a refresh-safe dashboard success state and passes unit, component, integration, lint, Storybook, and Workers build gates.
