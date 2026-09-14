# Test Rollout Implementation Plan

## Overview

Close the gaps identified in [`research.md`](./research.md) by adding the cheapest high-signal tests for each risk in [`context/foundation/test-plan.md`](../../foundation/test-plan.md). The rollout follows test-plan §3 phases 1–4: integration-first, no E2E, no Storybook/visual gates. Existing integration tests already cover most RLS and catalog invariants; this plan adds targeted cases and minimal new infrastructure where the cookie chain and workerd runtime require it.

## Current State Analysis

**Strong today**

- RLS identity matrix: `tests/integration/build-visibility.test.ts`
- Draft storage isolation: `tests/integration/build-image-storage.test.ts`
- RPC auth: `tests/integration/save-draft-build.test.ts`
- Catalog published-only + pagination: `tests/integration/catalog-listing.test.ts`
- AND filters + filtered pagination: `tests/integration/catalog-filters.test.ts`
- Store-level publish/delete denial: `publish-draft-build.test.ts`, `build-delete.test.ts`
- Unit coverage for catalog cursor, filters, URL builder, server resolution states

**Gaps (from research)**

| Gap | Risk | Phase |
|-----|------|-------|
| `getOwnedDraft` through real Supabase store | #1 | 1 |
| Unpublish → `listPublishedBuilds` excludes build | #2 | 1 |
| Inconsistent `status='published'` + `published_at IS NULL` row excluded | #2 | 1 |
| User B use-case matrix (draft + published) | #3 | 2 |
| Delete idempotent `{ ok: true }` documented/tested | #3 | 2 |
| Tied-`published_at` keyset pagination under filters | #5 | 3 |
| Signin → cookie → gated mutation → signout chain | #4 | 4 |
| Preview smoke on workerd | #7 | 4 |
| Integration in CI (subset) | #6 | 4 |
| Test-plan §6 cookbook patterns | all | per phase |

**Harness:** `tests/integration/helpers/supabase-identities.ts` signs in via `@supabase/supabase-js` directly — correct for RLS tests, not for cookie/session chain (Risk #4).

## Desired End State

After all four phases:

1. Every top-7 risk in test-plan §2 has at least one automated test that exercises the real Supabase boundary (and workerd HTTP smoke for #7).
2. Phase 1 gaps (#1, #2) are closed; no regression can remove explicit catalog `status='published'` filter without failing CI-local integration.
3. Phase 2 proves non-author denial at use-case layer for both draft and published targets.
4. Phase 3 proves keyset tie-break under AND filters with live data.
5. Phase 4 proves cookie session chain and workerd-shaped SSR paths; integration suite is documented as merge gate.
6. `context/foundation/test-plan.md` §6 cookbook subsections 6.1–6.5 contain copy-paste patterns from shipped tests.

### Key Discoveries

- Catalog must filter `status='published'` explicitly because RLS allows authors to read own drafts (`context/archive/2026-09-14-show-public-builds/plan.md:17`).
- Integration identity harness bypasses Astro cookie middleware — session tests need a separate HTTP layer (`src/lib/supabase.ts:5-24`, `src/middleware.ts:4-31`).
- Delete is intentionally idempotent at store level (`supabase-build-store.ts:377-378`) — test should document behavior, not change it without product decision.

## What We're NOT Doing

- Full E2E browser automation (test-plan §7)
- Storybook or visual snapshot tests
- Exhaustive shadcn/ui primitive coverage
- HTTP integration for edit-page 404 (deferred — requires Astro SSR test harness; store-level `getOwnedDraft` covers the authorization seam)
- Upgrade-over-populated-data migration simulation (manual pre-deploy check only)
- Fixing delete `{ ok: true }` for non-owner (document only unless product changes scope)

## Implementation Approach

Extend existing integration files where possible (same seed helpers, same cleanup). Add new files only when the scenario doesn't fit an existing describe block. Phase 4 adds a small HTTP helper and optional preview smoke script — the only new infrastructure.

---

## Phase 1: Publication & Visibility Gap Closure

### Overview

Close remaining Risk #1 and #2 gaps. Aligns with test-plan change folder `testing-publication-visibility-invariants`.

### Changes Required

#### 1. Application-layer draft read via real store

**File**: `tests/integration/owned-draft-read.test.ts` (new)

**Intent**: Prove `getOwnedDraft` + `createSupabaseBuildStore` enforce author scoping against live RLS, not just direct SQL.

**Contract**:

- Seed author A draft via `save_draft_build` RPC (pattern from `publish-draft-build.test.ts`)
- Author A: `getOwnedDraft({ kind: "authenticated", userId: authorA.id }, id, store)` returns draft
- User B: same call throws `DraftNotFoundError`
- Anonymous actor: throws `UnauthenticatedError`

#### 2. Unpublish removes build from catalog query

**File**: `tests/integration/catalog-unpublish.test.ts` (new)

**Intent**: Connect unpublish transition (RLS already tested) to catalog read path.

**Contract**:

- Seed and publish one build via author A store
- Assert `listPublishedBuilds({ direction: "first", boundary: null }, catalogStore)` includes build id for anon, authorA, userB clients
- Author A unpublishes (`status: "draft"`) via client update (pattern from `build-visibility.test.ts:165-178`)
- Assert same catalog query excludes build id for all three identities
- Assert `published_at` unchanged on row

#### 3. Inconsistent published row excluded from catalog

**File**: extend `tests/integration/catalog-listing.test.ts`

**Intent**: Guard against rows that satisfy RLS as published but fail catalog invariants.

**Contract**:

- Service-role insert: `{ status: "published", published_at: null, ... }`
- Assert `listPublishedBuilds` first page never includes that id (any identity)
- Cleanup via `cleanupBuild`

#### 4. Cookbook pattern for integration tests

**File**: `context/foundation/test-plan.md` §6.2

**Intent**: Document the mixed-seed + identity-matrix pattern so future tests don't assert empty catalogs without draft neighbors.

**Contract**: Fill §6.2 with: prerequisites (`supabase start`, `db reset`), `createTestIdentities()`, seed draft alongside published, assert exclusion, `cleanupBuild` in `afterAll`.

### Success Criteria

#### Automated Verification

- `npm run test:integration` passes with new/extended files
- `npm run test` passes (no unit regressions)
- `npm run lint` passes

#### Manual Verification

- Run `npx supabase db reset && npm run test:integration` on a clean local stack once to confirm seed helpers still work

---

## Phase 2: Ownership & Mutation Denial Matrix

### Overview

Close Risk #3 gaps at use-case + real store layer. Actions HTTP harness remains out of scope; use cases are the application authorization seam.

### Changes Required

#### 1. Cross-user mutation matrix

**File**: `tests/integration/build-ownership-mutations.test.ts` (new)

**Intent**: Single file proving user B cannot mutate author A's draft or published build through application use cases.

**Contract**:

- Seed author A **draft** and **published** build (publish via store, pattern from `publish-draft-build.test.ts`)
- User B store: `createSupabaseBuildStore(userB.client)`
- For each target (draft id, published id), assert:
  - `updateDraftBuild(userBActor, id, { name: "X" }, storeB)` → `DraftNotFoundError`
  - `publishBuild(userBActor, id, storeB)` → `DraftNotFoundError`
  - `deleteBuild(userBActor, id, storeB)` resolves; row still exists in DB
  - `attachMainImage(userBActor, id, validPathForB, storeB)` → `DraftNotFoundError` (path under user B prefix)
- Optional: user B `saveDraft` via RPC on author A published id → RPC error (mirrors draft case in `save-draft-build.test.ts`)

#### 2. Delete idempotency contract test

**File**: extend `tests/integration/build-delete.test.ts`

**Intent**: Document that non-owner delete is a silent no-op at store level — data protected, UX may show success later.

**Contract**:

- Add explicit assertion comment + test name: `"user B delete on author A published build leaves row intact"`
- User B direct `.delete()` on published build via client → 0 rows (RLS)

#### 3. Cookbook pattern for Actions (stub)

**File**: `context/foundation/test-plan.md` §6.4

**Intent**: Point to ownership matrix pattern; note Action HTTP testing deferred to Phase 4 harness.

**Contract**: §6.4 references `build-ownership-mutations.test.ts` and lists future Action invocation once HTTP helper exists.

### Success Criteria

#### Automated Verification

- `npm run test:integration` passes
- `npm run test` and `npm run lint` pass

#### Manual Verification

- None required

---

## Phase 3: Catalog Keyset & Filter Edge Cases

### Overview

Close Risk #5 tied-timestamp gap under live AND filters.

### Changes Required

#### 1. Tied-timestamp pagination under filters

**File**: extend `tests/integration/catalog-filters.test.ts`

**Intent**: Prove composite keyset `(published_at, id)` doesn't skip/duplicate when multiple filtered rows share `published_at`.

**Contract**:

- Seed ≥13 published rows matching same filter set (e.g. `watch_style: diver`, `movement: nh35`) with **identical** `published_at` timestamp but distinct ids (service-role insert or loop with same timestamp)
- Include one matching draft (already excluded by existing test)
- Forward paginate through all matching published rows; collect ids
- Backward paginate to first page
- Assert `new Set(allIds).size === expectedPublishedCount`
- Assert no draft id in collected set

#### 2. Filter preservation in pagination URLs (server unit)

**File**: extend `src/modules/catalog/server.test.ts`

**Intent**: Cheap unit guard that page-2 resolution URLs retain all active filter params.

**Contract**:

- Given request URL with 3+ active filters + valid `after` cursor
- Resolved `nextPageUrl` / `previousPageUrl` include every filter param

#### 3. Cookbook pattern for catalog queries

**File**: `context/foundation/test-plan.md` §6.5

**Intent**: Document tied-timestamp seed + forward/backward assertion pattern.

### Success Criteria

#### Automated Verification

- `npm run test:integration` passes
- `npm run test` passes (including extended `server.test.ts`)
- `npm run lint` passes

#### Manual Verification

- None required

---

## Phase 4: Session Chain, Migrations Gate & Workers Smoke

### Overview

Close Risks #4, #6, #7. Adds minimal HTTP infrastructure — the only phase that goes beyond direct Supabase client tests.

### Changes Required

#### 1. HTTP session helper

**File**: `tests/integration/helpers/http-session.ts` (new)

**Intent**: Exercise Astro auth endpoints and cookie forwarding without full E2E browser.

**Contract**:

- `signIn(baseUrl, email, password): Promise<CookieJar>` — POST `/api/auth/signin` form body, capture `Set-Cookie`
- `signOut(baseUrl, jar): Promise<void>` — POST `/api/auth/signout`
- `fetchWithCookies(baseUrl, path, jar, init?)` — forward cookies on subsequent requests
- Uses `fetch` against running dev/preview server (document required env: `TEST_BASE_URL`, default `http://127.0.0.1:4321`)

#### 2. Auth session chain integration test

**File**: `tests/integration/auth-session-chain.test.ts` (new)

**Intent**: Prove Risk #4 protection — signin establishes session; logout blocks gated path.

**Contract**:

- **Prerequisite:** test assumes server running OR uses `beforeAll` spawn of `npm run preview` (document in test file header comment if manual server required for v1)
- Unauthenticated `GET /dashboard` → 302 to `/auth/signin`
- `signIn` as author A → `GET /dashboard` → 200 (not redirect)
- Authenticated request with cookies can invoke a gated path (minimum: dashboard HTML contains user email from Topbar, OR call a builds Action if programmatic Action invocation is feasible)
- `signOut` → `GET /dashboard` → 302 again

**Decision (fixed):** v1 uses manual/CI-documented server start (`npm run preview` in separate terminal) rather than spawning workerd inside Vitest — spawning adds flakiness; document in README and test skip message when `TEST_BASE_URL` unset.

#### 3. Preview smoke script

**File**: `scripts/preview-smoke.mjs` (new)

**Intent**: Cheapest workerd runtime check for Risk #7.

**Contract**:

- Accept `BASE_URL` env (default `http://127.0.0.1:4321`)
- Assert `GET /builds` → status 200, body contains catalog marker (e.g. "published builds" or grid landmark)
- Assert `GET /dashboard` → status 302, `Location` contains `/auth/signin`
- Assert `GET /` → 302 to `/builds`
- Exit non-zero on failure
- Add `"preview:smoke": "node scripts/preview-smoke.mjs"` to `package.json`

#### 4. Integration merge gate documentation

**File**: `README.md` (integration section) and `context/foundation/test-plan.md` §5

**Intent**: Make Risk #6 local gate explicit.

**Contract**:

- Document: before merge when touching migrations/RLS: `npx supabase db reset && npm run test:integration`
- Note CI exception remains until Docker-in-CI is feasible

#### 5. Cookbook patterns

**File**: `context/foundation/test-plan.md` §6.1, §6.3

**Intent**: §6.1 points to use-case unit tests with `FakeBuildStore`; §6.3 states E2E deferred, preview smoke is the workerd check.

### Success Criteria

#### Automated Verification

- `npm run test:integration` passes (auth test skips gracefully when `TEST_BASE_URL` unset)
- `npm run test` and `npm run lint` pass
- `npm run build` succeeds
- With preview running: `npm run preview:smoke` exits 0

#### Manual Verification

- Run full chain once locally: `npx supabase db reset && npm run build && npm run preview` (terminal 1) + `TEST_BASE_URL=http://127.0.0.1:4321 npm run test:integration -- auth-session-chain` + `npm run preview:smoke`
- Confirm sign-in → dashboard → sign-out flow in browser matches automated expectations

---

## Testing Strategy

### Unit Tests

- Extend only where Phase 3 adds `server.test.ts` filter-in-URL assertions
- No new unit tests for Phases 1–2 (integration carries the signal)

### Integration Tests

| File | Risks | New/Extended |
|------|-------|--------------|
| `owned-draft-read.test.ts` | #1 | New |
| `catalog-unpublish.test.ts` | #2 | New |
| `catalog-listing.test.ts` | #2 | Extended |
| `build-ownership-mutations.test.ts` | #3 | New |
| `build-delete.test.ts` | #3 | Extended |
| `catalog-filters.test.ts` | #5 | Extended |
| `auth-session-chain.test.ts` | #4 | New |

### Manual / Smoke

- Phase 4 preview smoke script for workerd (#7)
- Post-deploy smoke remains recommended per deployment docs

## Performance Considerations

- Integration tests run serially (`fileParallelism: false`) — new files add ~seconds, not minutes
- Tied-timestamp seed in Phase 3: cap at ~20 rows to stay within 30s timeout

## Migration Notes

- No schema changes in this plan
- Phase 4 documents `db reset` + integration as migration merge gate

## References

- Research: [`context/changes/test-plan-risk-grounding/research.md`](./research.md)
- Test plan: [`context/foundation/test-plan.md`](../../foundation/test-plan.md)
- Identity harness: [`tests/integration/helpers/supabase-identities.ts`](../../../tests/integration/helpers/supabase-identities.ts)
- Catalog listing pattern: [`tests/integration/catalog-listing.test.ts`](../../../tests/integration/catalog-listing.test.ts)

## Progress

### Phase 1: Publication & Visibility Gap Closure

#### Automated

- [x] 1.1 `npm run test:integration` passes with owned-draft-read, catalog-unpublish, extended catalog-listing — e865a32
- [x] 1.2 `npm run test` passes — e865a32
- [x] 1.3 `npm run lint` passes — e865a32

#### Manual

- [x] 1.4 Clean `db reset` + full integration suite verified locally — e865a32

### Phase 2: Ownership & Mutation Denial Matrix

#### Automated

- [x] 2.1 `npm run test:integration` passes with build-ownership-mutations and extended build-delete — a20f5a5
- [x] 2.2 `npm run test` and `npm run lint` pass — a20f5a5

### Phase 3: Catalog Keyset & Filter Edge Cases

#### Automated

- [x] 3.1 `npm run test:integration` passes with extended catalog-filters tied-timestamp case — 79d9a7e
- [x] 3.2 `npm run test` passes including extended server.test.ts — 79d9a7e
- [x] 3.3 `npm run lint` passes — 79d9a7e

### Phase 4: Session Chain, Migrations Gate & Workers Smoke

#### Automated

- [x] 4.1 `tests/integration/helpers/http-session.ts` and `auth-session-chain.test.ts` added
- [x] 4.2 `scripts/preview-smoke.mjs` and `preview:smoke` script added
- [x] 4.3 `npm run test:integration`, `npm run test`, `npm run lint`, `npm run build` pass
- [x] 4.4 `npm run preview:smoke` passes against running preview

#### Manual

- [x] 4.5 Full local chain verified: preview + auth-session-chain + preview:smoke
- [x] 4.6 README and test-plan §5/§6 cookbook updates committed
