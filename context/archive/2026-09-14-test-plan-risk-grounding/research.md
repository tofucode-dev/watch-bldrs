---
date: 2026-09-14T21:22:00+02:00
researcher: Cursor Agent
git_commit: 83299b71f28041c7a077a0fd528cf015bbadc6e5
branch: main
repository: tofucode-dev/watch-bldrs
topic: "Test plan risk map — code paths, observable protections, cheapest tests, infrastructure, edge cases"
tags: [research, codebase, test-plan, rls, catalog, auth, actions, migrations, cloudflare-workers]
status: complete
last_updated: 2026-09-14
last_updated_by: Cursor Agent
---

# Research: Test Plan Risk Map Grounding

**Date**: 2026-09-14T21:22:00+02:00  
**Researcher**: Cursor Agent  
**Git Commit**: [83299b71](https://github.com/tofucode-dev/watch-bldrs/commit/83299b71f28041c7a077a0fd528cf015bbadc6e5)  
**Branch**: main  
**Repository**: [tofucode-dev/watch-bldrs](https://github.com/tofucode-dev/watch-bldrs)

## Research Question

For each risk in [`context/foundation/test-plan.md`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/context/foundation/test-plan.md):

1. Where does the risk pass through the code?
2. What observable behavior would prove it is protected?
3. What is the cheapest useful test type?
4. What test infrastructure is required?
5. What are the edge cases and failure paths?

## Summary

| Risk | Primary code seam | Coverage today | Cheapest next test | Biggest gap |
|------|-------------------|----------------|--------------------|-------------|
| **#1** Draft readable by non-author | RLS `builds_select` + author-scoped store reads | Strong integration (`build-visibility`, storage, RPC) | Extend integration for `getOwnedDraft` via real store | HTTP 404 on edit page for user B |
| **#2** Drafts in public catalog | Explicit `status='published'` in catalog store | Strong integration (`catalog-listing`, `catalog-filters`) | Unpublish → `listPublishedBuilds` excludes row | Home redirect only has static route contract |
| **#3** Non-author edit/publish/delete | Actions → use cases → store/RPC/RLS | DB/store layer strong; Actions untested | One integration matrix: user B on author A draft + published | Delete returns `{ ok: true }` for non-owner |
| **#4** Auth/session chain breaks | Cookie SSR client → middleware → locals → Actions | Unit fragments only; integration bypasses cookies | Integration: signin POST → cookie → gated mutation → signout | Zero HTTP tests of cookie round-trip |
| **#5** Catalog pagination/filters wrong | Keyset cursor + AND filters in catalog module | Strong unit + integration; tied-timestamp gap | Add tied-`published_at` pagination to existing integration seed | No HTTP 400 end-to-end for invalid filter |
| **#6** Migration breaks invariants | Migrations + RLS + triggers | Strong post-`db reset` integration suite | Explicit draft-path regression after v2 RPC migration | No upgrade-over-populated-data test; not in CI |
| **#7** Local works, Workers breaks | Cloudflare adapter + env schema + cookie SSR | Build in CI; no workerd HTTP smoke | Preview smoke: `/builds` 200, `/dashboard` 302 | No middleware/Actions tests on workerd |

**Cross-cutting infrastructure:** Local Supabase (`npx supabase start` + `db reset`), `tests/integration/helpers/supabase-identities.ts`, `npm run test:integration`. Integration tests are a **local merge gate only** — GitHub Actions runs unit/component + build, not integration ([`.github/workflows/ci.yml`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/.github/workflows/ci.yml)).

---

## Detailed Findings

### Risk #1 — A draft build is readable by anyone other than its author

#### Where the risk passes through code

**Database (primary boundary)**

- RLS enabled on `builds` and `build_parts`: [`supabase/migrations/20260910201541_build_visibility_and_storage.sql:157-158`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L157-L158)
- `builds_select` policy: published **or** `author_id = auth.uid()`: [same file :169-174](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L169-L174)
- `build_parts_select` scoped to parent build visibility: [same file :195-207](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L195-L207)
- Storage draft read: `build_images_select_owner` (prefix = `auth.uid()`): [same file :318-324](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L318-L324)
- Storage published read: only when linked build is published: [same file :326-339](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L326-L339)

**Application read paths (author-scoped, defense in depth)**

- `getOwnedDraft` requires authenticated actor: [`src/modules/builds/application/get-owned-draft.ts:7-16`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/builds/application/get-owned-draft.ts#L7-L16)
- Store query adds `.eq("author_id", authorId)`: [`src/modules/builds/infrastructure/supabase-build-store.ts:219-227`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/builds/infrastructure/supabase-build-store.ts#L219-L227)
- Edit page returns 404 when draft not owned: [`src/pages/dashboard/builds/edit/[id].astro:13-16`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/pages/dashboard/builds/edit/%5Bid%5D.astro#L13-L16)
- RPC `save_draft_build` scopes UPDATE to `author_id = auth.uid()`: [`supabase/migrations/20260914194000_save_owned_build.sql:72-80`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/supabase/migrations/20260914194000_save_owned_build.sql#L72-L80)

**Route gate (auth only, not draft rules)**

- Middleware protects `/dashboard/*`: [`src/middleware.ts:4-26`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/middleware.ts#L4-L26)

#### Observable behavior proving protection

| Actor | Action | Expected |
|-------|--------|----------|
| Anonymous / user B | `SELECT` draft by UUID | Zero rows |
| Anonymous / user B | `SELECT build_parts` for draft | Empty |
| Anonymous / user B | Storage download/list on draft path | Denied |
| User B | `save_draft_build` on author A draft | RPC error; row unchanged |
| Author A | `SELECT` own draft | Row returned |
| After unpublish | Anonymous / user B read previously published build | Zero rows again |

#### Cheapest useful test type

**Integration (Supabase + server)** — per test plan §2. Unit tests with `FakeBuildStore` do not prove RLS.

#### Required test infrastructure

- Local Supabase: `npx supabase start` + `npx supabase db reset`
- Runner: `npm run test:integration` ([`vitest.integration.config.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/vitest.integration.config.ts))
- Identity harness: [`tests/integration/helpers/supabase-identities.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/tests/integration/helpers/supabase-identities.ts) — `anon`, `authorA`, `userB`, `serviceRole`
- Cleanup: `cleanupBuild(serviceRole, buildId)`

#### Edge cases and failure paths

| Scenario | Status | Notes |
|----------|--------|-------|
| Direct Supabase SELECT (anon/B) | Covered | `tests/integration/build-visibility.test.ts` |
| Draft parts + storage isolation | Covered | `build-visibility`, `build-image-storage` |
| Cross-user RPC update | Covered | `save-draft-build.test.ts` |
| Unpublish re-hides row | Covered | `build-visibility.test.ts` |
| `getOwnedDraft` via real Supabase store | **Gap** | Unit-only with fake store |
| HTTP 404 on edit page for user B | **Gap** | Needs SSR/HTTP integration |
| Published build with mismatched `main_image_path` | **Known edge** | Storage policy may not bind path to build ownership |

**Existing coverage:** `build-visibility.test.ts`, `build-image-storage.test.ts`, `save-draft-build.test.ts`, `owned-builds-list.test.ts`.

---

### Risk #2 — Unpublished/draft builds appear on home, listing, or filter results

#### Where the risk passes through code

- Home redirects to catalog: [`src/pages/index.astro:4`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/pages/index.astro#L4)
- Public listing page: [`src/pages/builds/index.astro:8`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/pages/builds/index.astro#L8) → `resolveCatalogListing`
- Server orchestration: [`src/modules/catalog/server.ts:47-77`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/catalog/server.ts#L47-L77)
- **Critical explicit filter** (RLS alone is insufficient for authenticated authors): [`src/modules/catalog/infrastructure/supabase-catalog-store.ts:117`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/catalog/infrastructure/supabase-catalog-store.ts#L117) — `.eq("status", "published").not("published_at", "is", null)`
- AND filters applied before pagination boundary: [same file :58-80](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/catalog/infrastructure/supabase-catalog-store.ts#L58-L80)
- Mapper drops rows with null `published_at`: [same file :84-86](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/catalog/infrastructure/supabase-catalog-store.ts#L84-L86)

**Why explicit query filter matters:** RLS `builds_select` lets authors read their own drafts. An authenticated author browsing `/builds` would see their draft if the catalog query omitted `status = 'published'` ([`context/archive/2026-09-14-show-public-builds/plan.md:17`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/context/archive/2026-09-14-show-public-builds/plan.md#L17)).

#### Observable behavior proving protection

| Scenario | Expected |
|----------|----------|
| Catalog first page (anon, authorA, userB) | Same published-only IDs; no draft names |
| Draft seeded alongside 25 published rows | Draft IDs absent for all identities |
| Draft-only DB | Empty first page |
| Draft matching all active AND filters | Still excluded |
| Paginated catalog (forward/back) | No draft leakage on any page |

#### Cheapest useful test type

**Integration (Supabase + server)** — must seed drafts **alongside** published rows (anti-pattern: empty-list assertion without mixed seed).

#### Required test infrastructure

Same as Risk #1, plus:

- `clearCatalogDemoData(serviceRole)` before catalog seeds
- Mixed seed pattern: 2 drafts + 25 published (`catalog-listing`) or filter-matching draft + published rows (`catalog-filters`)

#### Edge cases and failure paths

| Scenario | Status |
|----------|--------|
| Mixed draft + published seed, all identities | Covered — `catalog-listing.test.ts` |
| Draft matching all AND filters excluded | Covered — `catalog-filters.test.ts` |
| Author A's own draft absent from public catalog | Covered |
| Pagination with drafts present | Covered |
| `status='published'` but `published_at IS NULL` | Partially covered (query + mapper); no dedicated inconsistent-state seed |
| Unpublish → row disappears from catalog query | **Gap** (RLS re-hide covered; catalog query not re-asserted) |
| Home redirect | Static route contract only (`index.route.test.ts`) |
| Removing `.eq("status", "published")` from store | Regression risk — would leak author's draft to authenticated author |

**Existing coverage:** `catalog-listing.test.ts`, `catalog-filters.test.ts`, unit `supabase-catalog-store.test.ts`.

---

### Risk #3 — Non-author can edit, publish, or delete someone else's build

#### Where the risk passes through code

| Layer | File | Role |
|-------|------|------|
| Route gate | [`src/middleware.ts:4-26`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/middleware.ts#L4-L26) | `/dashboard/*` requires session |
| Edit page open | [`src/pages/dashboard/builds/edit/[id].astro:13-16`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/pages/dashboard/builds/edit/%5Bid%5D.astro#L13-L16) | 404 when not owned |
| Actor resolution | [`src/modules/builds/application/actor.ts:3-8`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/builds/application/actor.ts#L3-L8), [`src/modules/builds/actions.ts:76+`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/builds/actions.ts#L76) | `context.locals.user` → actor |
| Use cases | `update-draft-build.ts`, `publish-build.ts`, `delete-build.ts` | Require authenticated actor; delegate ownership to store |
| Store | [`supabase-build-store.ts:266-386`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/builds/infrastructure/supabase-build-store.ts#L266-L386) | Every mutation adds `.eq("author_id", authorId)` |
| RPC | [`save_owned_build.sql:72-80`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/supabase/migrations/20260914194000_save_owned_build.sql#L72-L80) | `auth.uid()` ownership |
| RLS UPDATE/DELETE | [`build_visibility_and_storage.sql:184-193`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L184-L193) | `author_id = auth.uid()` |

Mutations are **Astro Actions only** — no build HTTP endpoints: [`src/actions/index.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/actions/index.ts) → [`src/modules/builds/actions.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/builds/actions.ts).

#### Observable behavior proving protection

| Path | User B outcome |
|------|----------------|
| Open edit URL for author A draft | HTTP 404 |
| Action `builds.update` / `builds.publish` | `NOT_FOUND` (via `DraftNotFoundError`) |
| Action `builds.delete` | **`{ ok: true }`** even when nothing deleted (data safe; UX misleading) |
| Direct `.update()` / `.delete()` | 0 rows affected |
| RPC `save_draft_build` | Error `P0002`; row unchanged |

#### Cheapest useful test type

**Integration (Actions + Supabase)** per test plan. **Cheapest high-value today:** one integration file calling use cases + `createSupabaseBuildStore(userB.client)` for author A's draft and published builds — same pattern as existing `publish-draft-build.test.ts` and `build-delete.test.ts`.

**Next step up:** Action HTTP integration (Phase 2) — no harness exists yet.

#### Required test infrastructure

Same as Risks #1–#2, plus `createSupabaseBuildStore(client)` from builds infrastructure.

#### Edge cases and failure paths

| Scenario | Status |
|----------|--------|
| Anonymous mutation | Unit covered; middleware blocks `/dashboard` |
| User B guesses draft UUID | Integration RLS covered |
| User B guesses **published** UUID | Can SELECT (public); cannot edit/update |
| User B `save_draft_build` on A's **published** build | **Not explicitly tested** |
| User B DELETE on **published** build | **Not explicitly tested** (draft only in RLS matrix) |
| Delete idempotent `{ ok: true }` for non-owner | **Untested at Action layer** |
| `attachMainImage` denial for user B | Unit only |

**Gaps:** No Astro Action handler tests; no edit-page 404 automation; delete misleading success response.

---

### Risk #4 — Auth/session chain breaks (login, logout, gated actions)

#### Where the risk passes through code

```
signin endpoint → @supabase/ssr cookies → middleware.getUser() → Astro.locals.user → Actions/use cases
```

| Component | File | Lines |
|-----------|------|-------|
| Cookie SSR client | [`src/lib/supabase.ts:5-24`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/lib/supabase.ts#L5-L24) | `getAll`/`setAll` on `AstroCookies` |
| Middleware session | [`src/middleware.ts:4-31`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/middleware.ts#L4-L31) | `getUser()` → `locals.user`; protects `/dashboard` |
| Sign in | [`src/pages/api/auth/signin.ts:5-24`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/pages/api/auth/signin.ts#L5-L24) | `signInWithPassword` + cookie set |
| Sign out | [`src/pages/api/auth/signout.ts:4-10`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/pages/api/auth/signout.ts#L4-L10) | `signOut()` |
| Gated Actions | [`src/modules/builds/actions.ts:44-49,71-148`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/builds/actions.ts#L44-L49) | `storeFromContext` + `actorFromUser(locals.user)` |
| RLS → auth error mapping | [`src/modules/builds/infrastructure/map-store-error.ts:15-17`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/builds/infrastructure/map-store-error.ts#L15-L17) | `42501`/`PGRST301` → `UnauthenticatedError` |

Env schema: [`astro.config.mjs:27-35`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/astro.config.mjs#L27-L35). Astro sessions explicitly disabled.

#### Observable behavior proving protection

1. POST `/api/auth/signin` → session cookie set → `/dashboard` loads (not redirect)
2. Gated mutation (e.g. `builds.createDraft`) succeeds with cookie
3. POST `/api/auth/signout` → same mutation returns `UNAUTHORIZED` / dashboard redirects
4. Unauthenticated `/dashboard` → 302 to `/auth/signin?redirect=...`
5. Open redirect blocked via `safeRedirect` ([`src/lib/safe-redirect.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/lib/safe-redirect.ts))

#### Cheapest useful test type

**Integration (auth + gated action)** — per test plan. Anti-pattern: cookie-parsing unit tests without a gated mutation.

**Minimal scenario:** signin POST → capture `Set-Cookie` → authenticated request → one Action succeeds → signout → Action fails.

#### Required test infrastructure

| Piece | Status |
|-------|--------|
| Local Supabase | Required |
| `supabase-identities.ts` | Exists but **bypasses cookie chain** — direct SDK `signInWithPassword` with `persistSession: false` |
| HTTP/Astro harness | **Missing** — need running SSR (`npm run dev` or programmatic adapter) |
| E2E | Deferred per test plan §7 |

#### Edge cases and failure paths

| Failure | Coverage |
|---------|----------|
| Missing `SUPABASE_URL`/`SUPABASE_KEY` | Unit: `supabase.test.ts`; downstream untested |
| Invalid credentials on signin | **Untested** |
| Expired/invalid cookie | **Untested** at HTTP layer |
| Token refresh via `getUser()` | Implicit; **untested** |
| Anonymous Action call | Unit use-cases only; not through Actions/cookies |
| Integration false confidence | All integration tests sign in via JS SDK, not HTTP cookies |

**Core gap:** The chain is implemented but **the chain itself is untested**. Phase 4 (`test-plan.md` §3) not started.

---

### Risk #5 — Catalog keyset pagination or AND filters wrong

#### Where the risk passes through code

| Layer | File | Role |
|-------|------|------|
| Route | [`src/pages/builds/index.astro:6-16`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/pages/builds/index.astro#L6-L16) | SSR catalog page |
| Orchestration | [`src/modules/catalog/server.ts:35-116`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/catalog/server.ts#L35-L116) | Parse filters/cursors; build pagination URLs |
| Filter normalization | [`src/modules/catalog/application/catalog-filters.ts:20-69`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/catalog/application/catalog-filters.ts#L20-L69) | Enum/range validation; AND object |
| Cursor encode/decode | [`src/modules/catalog/application/catalog-cursor.ts:26-119`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/catalog/application/catalog-cursor.ts#L26-L119) | Base64url `(publishedAt, id)` tuple |
| URL builder | [`src/modules/catalog/application/catalog-url.ts:6-32`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/catalog/application/catalog-url.ts#L6-L32) | Filters preserved in pagination URLs |
| Keyset query | [`src/modules/catalog/infrastructure/supabase-catalog-store.ts:40-154`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/catalog/infrastructure/supabase-catalog-store.ts#L40-L154) | Composite `(published_at DESC, id DESC)` boundary |
| Filter UI reset | [`src/modules/catalog/presentation/catalog-filter-bar.tsx:44,52-54`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/catalog/presentation/catalog-filter-bar.tsx#L44) | Filter change → first page (strips cursors) |

Page size: [`catalog-types.ts:26`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/catalog/application/catalog-types.ts#L26) — `CATALOG_PAGE_SIZE = 12`.

#### Observable behavior proving protection

- AND filters: only rows matching all active `.eq()` filters; drafts excluded
- Pagination URLs preserve filters before cursor param
- Forward then backward over 25 rows: `new Set(allIds).size === 25` (no duplicates/gaps)
- Filter change drops stale cursor
- Invalid cursor → `invalid-cursor` + HTTP 400; bad enum → `invalid-filter` + 400
- Stale cursor with zero rows → `paginated-empty` with filter-preserving recovery link

#### Cheapest useful test type

**Extend existing integration** in `catalog-filters.test.ts` — already seeds 13 matching + 6 non-matching rows with forward/backward pagination.

**Cheapest additions:**

1. Pagination with shared `published_at` (tie-break on `id`) — currently unit-only
2. Assert page-2 URL retains all five active filters

Unit tests for normalization/cursor encoding remain valuable complements, not substitutes.

#### Required test infrastructure

- Local Supabase + `supabase-identities.ts`
- `npm run test:integration` (not in CI)
- Unit: `npm run test` for pure logic (`catalog-filters.test.ts`, `catalog-cursor.test.ts`, etc.)

#### Edge cases and failure paths

| Case | Behavior | Covered? |
|------|----------|----------|
| Both `before` and `after` in URL | `InvalidCatalogCursorError` | Unit |
| Malformed cursor | 400 | Unit + server.test |
| Unknown enum / invalid `case_size_mm` | 400 | Unit |
| Equal `published_at` at boundary | SQL tie-break on `id` | Unit only |
| Stale cursor after deletes | `paginated-empty` recovery | server.test |
| Active filters, zero matches | `filtered-empty` | server.test + integration |
| HTTP 400 end-to-end on `/builds?…` | — | **Gap** |

**Existing coverage:** Strong unit suite across catalog application + infrastructure layers; integration in `catalog-listing.test.ts` and `catalog-filters.test.ts`.

---

### Risk #6 — Migration breaks rows, RLS, or publication invariants

#### Where the risk passes through code

| Migration | Critical content |
|-----------|------------------|
| [`20260910201541_build_visibility_and_storage.sql`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/supabase/migrations/20260910201541_build_visibility_and_storage.sql) | Schema, `published_at` trigger (:136-154), RLS (:156-251), Storage policies (:253-339) |
| [`20260912224312_save_draft_build.sql`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/supabase/migrations/20260912224312_save_draft_build.sql) | RPC v1 — draft-only update |
| [`20260914194000_save_owned_build.sql`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/supabase/migrations/20260914194000_save_owned_build.sql) | RPC v2 — widens to `status IN ('draft', 'published')` |

**Publication invariants (DB-enforced):**

- `published_at` set on first publish; immutable after: trigger at `:136-154`
- RLS SELECT: published OR author: `:169-174`
- Application catalog also filters explicitly (Risk #2)

#### Observable behavior proving protection

- Clean `db reset` + integration suite passes
- Draft privacy matrix (anon/B cannot read/mutate)
- Publish/unpublish transitions; `published_at` preserved on unpublish
- RPC v2: published row editable without status/`published_at` change
- Storage draft vs published access matrix
- Catalog never returns drafts under filters

#### Cheapest useful test type

**Integration against local Supabase after `db reset`** — project standard. Cheapest new case: explicit draft-path regression in `save-draft-build.test.ts` after v2 migration (guard that v2 didn't break draft saves).

Unit tests **cannot** catch RLS/trigger regressions.

#### Required test infrastructure

- `npx supabase start` + `npx supabase db reset`
- Keys from `supabase status -o env` (parsed in `supabase-identities.ts`)
- Service role for seeding; assert via anon/authenticated clients
- After schema change: `npm run db:types`
- **Not in CI** — local merge gate per AGENTS.md

#### Edge cases and failure paths

| Case | Covered? |
|------|----------|
| Anon/user B INSERT with wrong `author_id` | Yes — `build-visibility.test.ts` |
| RPC auth matrix | Yes — `save-draft-build.test.ts` |
| Publish idempotency | Yes — `publish-draft-build.test.ts` |
| v2 published-row edit | Yes — `save-draft-build.test.ts` |
| Upgrade path v1→v2 on populated prod data | **No** |
| Migration apply in CI | **No** |
| Constraint violation on legacy rows | **No** |

---

### Risk #7 — Local works but Cloudflare Workers breaks

#### Where the risk passes through code

| Concern | File | Lines |
|---------|------|-------|
| SSR + adapter | [`astro.config.mjs:12,25`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/astro.config.mjs#L12) | `output: "server"`, `@astrojs/cloudflare` |
| Env schema | [`astro.config.mjs:27-35`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/astro.config.mjs#L27-L35) | `SUPABASE_URL`, `SUPABASE_KEY` |
| Workers deploy | [`wrangler.jsonc:4-19`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/wrangler.jsonc#L4-L19) | `nodejs_compat`; runtime secrets |
| Dev on workerd | [`package.json:6`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/package.json#L6) | `CLOUDFLARE_ENV=local astro dev` |
| Cookie SSR client | [`src/lib/supabase.ts:5-24`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/lib/supabase.ts#L5-L24) | Same path on Workers |
| SSR pages | `index.astro`, `builds/index.astro`, `dashboard.astro` | All `prerender = false` |
| Actions | [`src/modules/builds/actions.ts:44-49`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/builds/actions.ts#L44-L49) | `storeFromContext` uses request cookies |
| Auth endpoints | [`src/pages/api/auth/signin.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/pages/api/auth/signin.ts) | Same `createClient` pattern |

**Build-time vs runtime secrets:** CI injects secrets for compile; Wrangler secrets required at runtime separately ([`context/foundation/deployment.md`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/context/foundation/deployment.md)).

#### Observable behavior proving protection

- `npm run build` succeeds in CI with env vars
- Preview smoke on workerd: `/builds` → 200 + catalog HTML (not 503)
- `/dashboard` without session → 302 to signin
- Signin POST → `Set-Cookie` → subsequent authenticated request succeeds
- Missing runtime secrets → catalog 503, Actions 500 (fail visibly, not silently)

#### Cheapest useful test type

**Post-build preview smoke on workerd** — `npm run build && npm run preview` then scripted fetches:

1. `GET /builds` → 200
2. `GET /dashboard` → 302
3. Optional: signin POST + cookie jar → `/dashboard` 200

Cheaper than E2E; catches env binding, SSR routing, middleware on actual workerd. **No such test exists today.**

Complement (not substitute): post-deploy manual smoke per deployment docs.

#### Required test infrastructure

- `.dev.vars` from `.env.example`
- `SUPABASE_URL` + `SUPABASE_KEY` at build **and** runtime (Wrangler secrets)
- `npm run build && npm run preview`
- Cloudflare account for deploy verification

#### Edge cases and failure paths

| Case | Tested? |
|------|---------|
| Build secrets set, runtime secrets missing | Documented; **not automated** |
| `createClient` null on Worker | Unit only |
| Cookie not forwarded on Worker | **Not tested** |
| Middleware redirect | **No middleware tests** |
| Actions on workerd vs Node | **Not tested** |
| Free-tier CPU timeout on SSR | **Not tested** |
| `nodejs_compat` missing | Flag present; **not verified** |

**Largest hole:** Zero HTTP tests against workerd runtime.

---

## Code References

| Path | Description |
|------|-------------|
| [`supabase/migrations/20260910201541_build_visibility_and_storage.sql`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/supabase/migrations/20260910201541_build_visibility_and_storage.sql) | Core schema, RLS, Storage, `published_at` trigger |
| [`src/modules/catalog/infrastructure/supabase-catalog-store.ts:117`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/catalog/infrastructure/supabase-catalog-store.ts#L117) | Explicit published-only catalog filter |
| [`src/lib/supabase.ts:5-24`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/lib/supabase.ts#L5-L24) | Cookie-bound SSR Supabase client |
| [`src/middleware.ts:4-31`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/middleware.ts#L4-L31) | Session resolution + `/dashboard` gate |
| [`src/modules/builds/actions.ts:44-148`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/src/modules/builds/actions.ts#L44-L148) | Gated mutations via Actions |
| [`tests/integration/helpers/supabase-identities.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/tests/integration/helpers/supabase-identities.ts) | Integration identity harness |
| [`vitest.integration.config.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/vitest.integration.config.ts) | Integration test runner config |

## Architecture Insights

1. **Defense in depth for authorization:** RLS is the primary boundary; application layers add `author_id` filters and actor checks. Catalog queries must **explicitly** filter published rows because RLS allows authors to read their own drafts.

2. **Integration tests bypass the cookie chain:** `supabase-identities.ts` signs in via `@supabase/supabase-js` directly. This is correct for RLS/identity matrix tests but must not be mistaken for session-chain coverage (Risk #4).

3. **Phased rollout alignment:** Phase 1 (#1, #2) is largely implemented in integration tests. Phase 2 (#3, #7 Actions) needs Action/HTTP harness. Phase 3 (#5) needs minor integration extensions. Phase 4 (#4, #6, #7) needs cookie-chain integration + CI migration gate + preview smoke.

4. **Cost × signal holds:** Risks #1, #2, #5, #6 are best served by extending existing integration seeds. Risks #4 and #7 require new HTTP/workerd infrastructure — the expensive seam, deferred to Phase 4.

## Historical Context (from prior changes)

- [`context/archive/2026-09-14-show-public-builds/plan.md:17`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/context/archive/2026-09-14-show-public-builds/plan.md#L17) — Documented why catalog must explicitly filter published rows (RLS alone insufficient for authenticated authors).
- [`context/foundation/lessons.md`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/context/foundation/lessons.md) — Keyset cursor pagination rule applies to Risk #5; filter changes must reset to first page.
- [`context/changes/filter-published-listing/research.md`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/context/changes/filter-published-listing/research.md) — Prior catalog filter research (if present on branch).

## Related Research

- Test plan source: [`context/foundation/test-plan.md`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/context/foundation/test-plan.md)
- Security matrix: [`context/foundation/architecture/security.md`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/context/foundation/architecture/security.md)
- Testing guidelines: [`context/foundation/architecture/testing.md`](https://github.com/tofucode-dev/watch-bldrs/blob/83299b71f28041c7a077a0fd528cf015bbadc6e5/context/foundation/architecture/testing.md)
- Phase 1 change folder (planned): `testing-publication-visibility-invariants` per test plan §3

## Open Questions

1. **Action HTTP harness:** What is the minimal Astro test adapter for invoking Actions with real cookies on workerd?
2. **Delete idempotency:** Should non-owner delete return `{ ok: true }` or `NOT_FOUND`? Data is safe today; UX contract undecided.
3. **CI integration gate:** Phase 4 plans wiring integration into CI — which subset is feasible without Docker in GitHub Actions?
4. **Storage path binding:** Does `build_images_select_published` fully prevent cross-build image access via mismatched `main_image_path`?
