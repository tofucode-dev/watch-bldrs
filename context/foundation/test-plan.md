# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-09-14

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the
   team is worried about X, and the failure would surface somewhere in
   <area>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

**Primary value layer (team preference):** integration tests that exercise
the real Supabase boundary (client and server) and Astro Actions through
the application stack. Unit tests support normalization and pure logic;
Storybook and visual layers are out of scope (see §7).

Hot-spot scope used for likelihood weighting: `src`, `tests`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|-------------------------|--------|------------|--------------------------------|
| 1 | A draft build is readable by anyone other than its author | High | High | interview Q1; PRD guardrails; hot-spot dir `src/modules` (128 commits/30d) |
| 2 | Unpublished or draft builds appear on the home page, public listing, or in filter results | High | High | interview Q1; PRD US-03, US-06; roadmap S-04, S-05 done |
| 3 | A non-author can open or succeed at editing, publishing, or deleting someone else's build | High | High | interview Q1; PRD access control; abuse/IDOR lens |
| 4 | The auth/session chain breaks — login, logout, or gated actions fail after deploy or cookie refresh | High | Medium | interview Q1; PRD US-01; hot-spot dir `src/lib` (19 commits/30d) |
| 5 | Catalog keyset pagination or AND filters return wrong page, duplicates, gaps, or ignore active filters | High | High | interview Q1, Q3; PRD FR-006; hot-spot dir `src/modules` (catalog churn) |
| 6 | A database migration breaks existing rows, RLS policies, or publication invariants | High | Medium | interview Q1; AGENTS.md migration rules; tech-stack Supabase |
| 7 | The app works locally but breaks on Cloudflare Workers — SSR routes, Actions, env-bound Supabase client, or cookie forwarding | High | Medium | user edit (Workers unfamiliar); tech-stack Workers; interview Q3 |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-------------------------|
| #1 | Anonymous and user B cannot read a draft build through any public or cross-user path | "RLS exists therefore drafts are private" | RLS matrix identities, draft SELECT policies, author-only read paths | integration (Supabase + server) | happy-path-only author read; mocking away the database |
| #2 | Home, listing, and filter queries never return draft rows for any identity except the author | "catalog query filters by mistake, not by invariant" | catalog/home query entry points, publication status filter, AND filter interaction | integration (Supabase + server) | asserting empty list without seeding drafts alongside published rows |
| #3 | User B receives a safe denial on edit, publish, and delete; only the author succeeds | "logged in implies authorized" | Action/endpoint actor resolution, ownership checks, RLS UPDATE/DELETE policies | integration (Actions + Supabase) | unit-testing validation while mocking away authorization |
| #4 | Sign-in establishes session; gated mutation succeeds; logout blocks gated mutation | "middleware unit test implies production works" | cookie/session shape, middleware order, auth endpoints, one gated mutation | integration (auth + gated action) | testing cookie parsing in isolation without a gated action |
| #5 | Page 2+ results respect every active filter, exclude drafts, and contain no duplicates or gaps | "cursor unit test implies query is correct" | keyset cursor contract, filter normalization, seeded multi-page catalog | integration + unit (normalization only) | asserting cursor encoding copied from production logic |
| #6 | Clean `db reset` applies migrations and the integration suite passes with invariants intact | "migration applied once in dev is enough" | migration order, RLS policy presence, publication constraints | integration (local Supabase harness) | manual-only migration verification without automated reset |
| #7 | Worker-shaped request path resolves env, Supabase client, and Actions the same as local SSR | "astro dev green means deploy green" | Workers adapter config, env schema, Action pipeline on server runtime | integration (server path) + deploy smoke | assuming Node-only test environment covers Worker cookie/env differences |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-------------------|---------------|------------|--------|---------------|
| 1 | Publication & visibility invariants | Drafts stay author-only and never surface in public catalog paths | #1, #2 | integration (Supabase + server) | change opened | testing-publication-visibility-invariants |
| 2 | Ownership, Actions & build lifecycle | Non-authors blocked; save/edit/publish via Actions stay author-scoped | #3, #7 | integration (Actions + Supabase) + unit | not started | — |
| 3 | Catalog cursor + AND filters | Keyset pagination and combined filters stay correct under multi-page data | #5 | integration + unit | not started | — |
| 4 | Auth session, Workers runtime & migrations | Session chain and Worker-shaped paths hold; schema changes do not break invariants | #4, #6, #7 | integration + CI gates | not started | — |

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| unit + component | Vitest | 3.x (see package.json) | Node project for `*.test.ts`; jsdom for `*.test.tsx` |
| integration | Vitest + local Supabase | see package.json | `npm run test:integration`; Docker Supabase after `db reset` |
| API mocking | minimal | — | Prefer real Supabase in integration; mock only at network edge when unavoidable |
| e2e | none yet | — | Deferred per §7; integration covers behavior invariants first |
| accessibility | none yet | — | Semantic HTML preferred; no axe gate wired |

**Stack grounding tools (current session):**
- Docs: Cloudflare docs MCP — Workers SSR and deployment patterns available; checked: 2026-09-14
- Search: web search MCP — available for tool/status discovery; not invoked during initial write; checked: 2026-09-14
- Runtime/browser: cursor-ide-browser MCP — available but not recommended for this rollout per §7; checked: 2026-09-14
- Provider/platform: GitHub, Cloudflare builds/observability, Supabase MCP — CI, deploy logs, RLS/migration inspection; checked: 2026-09-14

Test-base profile: **meaningful** — Vitest configured, ~47 test files across unit, component, and integration (`tests/integration/`).

## 5. Quality Gates

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint + typecheck | local + CI | required | syntactic / type drift |
| unit + component (`npm test`) | local + CI | required | logic and UI behavior regressions |
| integration (`npm run test:integration`) | local (merge gate for schema/RLS) | required after §3 Phase 4 | RLS, publication, Storage, migration invariants |
| e2e on critical flows | — | planned — deferred per §7 | — |
| post-edit hook | — | not planned | — |
| visual diff | — | not planned | — |
| pre-prod smoke | after deploy | recommended after §3 Phase 4 | Worker env and session failures |

GitHub Actions currently runs unit/component tests and build; integration tests remain a local merge gate per AGENTS.md CI exception until Phase 4 wires what is feasible.

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships.

### 6.1 Adding a unit test

- TBD — see §3 Phase 2 for ownership and lifecycle patterns.

### 6.2 Adding an integration test

Prerequisites: local Supabase running (`npx supabase start`) and a fresh schema (`npx supabase db reset`).

Pattern (mixed seed + identity matrix):

1. **Harness** — `createTestIdentities()` from `tests/integration/helpers/supabase-identities.ts` yields `anon`, `authorA`, `userB`, and `serviceRole` clients. Use `serviceRole` only for seed/cleanup, never for assertions about user-visible behavior.
2. **Seed neighbors** — when testing catalog or public visibility, seed at least one **draft** alongside published rows so the test proves exclusion, not an empty catalog. See `catalog-listing.test.ts` (draft + 25 published) and `catalog-unpublish.test.ts`.
3. **Application boundary** — prefer module use cases + real stores (`getOwnedDraft`, `listPublishedBuilds` + `createSupabaseCatalogStore`) over raw SQL when the risk is authorization or query invariants. See `owned-draft-read.test.ts`.
4. **Identity matrix** — assert the same contract for `anon`, `authorA.client`, and `userB.client` when the invariant must hold for every caller. See `catalog-unpublish.test.ts`.
5. **Cleanup** — track created build ids; `afterAll` → `cleanupBuild(serviceRole, id)` for each. Catalog-heavy suites may call `clearCatalogDemoData(serviceRole)` in `beforeAll`.

Run: `npm run test:integration` (or a single file: `npm run test:integration -- owned-draft-read`).

### 6.3 Adding an e2e test

- TBD — not in current rollout scope; see §7. Re-evaluate only if integration cannot catch a Worker/browser-only failure.

### 6.4 Adding a test for a new Astro Action

Actions are gated mutations — authorization must be proven at the application seam before wiring HTTP.

**Today (use-case + real store):** `tests/integration/build-ownership-mutations.test.ts` seeds author A draft and published builds, then asserts user B gets `DraftNotFoundError` on `updateDraftBuild`, `publishBuild`, and `attachMainImage`, while `deleteBuild` resolves without deleting the row. Mirror this matrix when adding a new build mutation.

Pattern:

1. **Harness** — `createTestIdentities()`; seed targets with author A (`save_draft_build` RPC + `publishBuild` via `createSupabaseBuildStore(authorA.client)`).
2. **Actor** — `{ kind: "authenticated", userId: userB.id }` with `createSupabaseBuildStore(userB.client)`.
3. **Denial contract** — mutations throw `DraftNotFoundError`; delete is idempotent (row survives). Assert row unchanged via author A client.
4. **RPC parity** — for save paths, also assert `save_draft_build` returns an error when user B targets author A's id (draft and published).
5. **Cleanup** — `cleanupBuild(serviceRole, id)` in `afterAll`.

**Deferred (HTTP Action invocation):** Phase 4 adds `tests/integration/helpers/http-session.ts` for cookie-based sign-in. Once that harness exists, add an Action-level test that POSTs the same mutation with session cookies and expects the mapped `NOT_FOUND` / safe success contract — do not duplicate the use-case matrix at the HTTP layer until the harness ships.

Run: `npm run test:integration -- build-ownership-mutations`.

### 6.5 Adding a test for a catalog query change

- TBD — see §3 Phase 3 for keyset pagination and AND filter patterns.

### 6.6 Per-rollout-phase notes

(Optional — filled as phases complete.)

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5).

- **Storybook** — component workshop only, not a test target. Re-evaluate if Storybook becomes the sole place a behavior is defined. (Source: Phase 2 interview Q5.)
- **UI component visual/snapshot tests** — low signal for this MVP's data and authorization risks. (Source: Phase 2 interview Q5.)
- **Visual E2E** — skip pixel/layout browser automation; integration tests on Supabase + Actions carry the behavior signal. (Source: Phase 2 interview Q5.)
- **Exhaustive shadcn/ui primitive coverage** — shared primitives are thin; test behavior at module integration layer instead. (Source: Phase 2 interview Q5.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-09-14
- Stack versions last verified: 2026-09-14
- AI-native tool references last verified: 2026-09-14

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
