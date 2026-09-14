# Test Rollout — Plan Brief

> Full plan: `context/changes/test-plan-risk-grounding/plan.md`  
> Research: `context/changes/test-plan-risk-grounding/research.md`  
> Strategy: `context/foundation/test-plan.md`

## What & Why

Add the cheapest automated tests that close the remaining gaps in the test-plan risk map. Most RLS and catalog invariants are already covered by integration tests; this plan adds targeted cases for application-layer reads, unpublish→catalog, cross-user mutations, tied-timestamp pagination, cookie session chain, and workerd preview smoke — without introducing E2E or visual testing.

## Starting Point

~14 integration test files exercise Supabase RLS, catalog queries, RPC auth, and store-level publish/delete. The identity harness signs in via JS SDK (not HTTP cookies). Unit tests cover catalog cursor/filter normalization. GitHub Actions runs unit tests + build only; integration is a local merge gate.

## Desired End State

Each of the top-7 test-plan risks has at least one automated proof at the correct layer. Phase 1–3 extend integration tests using existing helpers. Phase 4 adds a small HTTP helper, optional auth-session integration test, and preview smoke script. Test-plan §6 cookbook documents patterns for future contributors.

## Key Decisions Made

| Decision | Choice | Why | Source |
|----------|--------|-----|--------|
| Test layer | Integration-first | Matches test-plan §1 cost×signal and team preference | Research |
| Edit-page HTTP 404 | Defer | Store-level `getOwnedDraft` covers auth seam; SSR harness costly | Research |
| Delete non-owner UX | Document, don't fix | Data is safe; `{ ok: true }` is intentional idempotency | Research |
| Auth session test | HTTP helper + manual preview server | Cookie chain can't be faked with SDK sign-in | Research |
| Workerd verification | Preview smoke script | Cheaper than E2E; catches env/routing failures | Research |
| CI integration | Document gate only in Phase 4 | Docker-in-CI not in scope; local `db reset` gate | Test plan |
| Phase 1 change folder | Implement under this plan | Aligns with `testing-publication-visibility-invariants` goal | Test plan §3 |

## Scope

**In scope:**

- 4–6 new/extended integration test files across phases 1–3
- HTTP session helper + auth chain test (Phase 4)
- Preview smoke script (Phase 4)
- Test-plan §6 cookbook fill-in
- README merge-gate documentation

**Out of scope:**

- E2E browser automation, Storybook tests, visual diffs
- Astro Action HTTP invocation (unless trivial with Phase 4 helper)
- Migration upgrade simulation on populated DB
- Wiring integration into GitHub Actions CI
- Changing delete idempotent response contract

## Architecture / Approach

Tests follow existing patterns: `createTestIdentities()` → service-role seed → assert via anon/authorA/userB clients → `cleanupBuild`. Application use cases called with real `createSupabaseBuildStore(client)`. Phase 4 adds `fetch`-based cookie jar against running preview server — the only departure from direct Supabase client tests.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. Publication & visibility gaps | `getOwnedDraft` integration, unpublish→catalog, inconsistent-row seed | Removing explicit catalog published filter |
| 2. Ownership mutation matrix | User B denied on draft + published via use cases | Mocking away authorization in unit tests only |
| 3. Catalog edge cases | Tied-timestamp pagination under AND filters | Keyset skip/duplicate at equal `published_at` |
| 4. Session & workerd smoke | HTTP helper, auth chain test, preview smoke script | Assuming SDK sign-in proves cookie session |

**Prerequisites:** Local Supabase running; Phase 4 additionally requires built app + preview server.  
**Estimated effort:** ~4 focused sessions (one per phase).

## Open Risks & Assumptions

- Auth session integration test may need `TEST_BASE_URL` + manual preview start in v1 — acceptable per cost×signal
- Preview smoke assertions depend on stable catalog copy/landmarks in HTML
- Tied-timestamp seed may need service-role inserts to bypass trigger timing

## Success Criteria (Summary)

- `npm run test:integration` passes after each phase on local Supabase
- No top-7 risk lacks an automated proof at the layer identified in research
- Test-plan §6 cookbook is actionable for new integration tests
- Preview smoke catches workerd SSR/routing regressions before deploy
