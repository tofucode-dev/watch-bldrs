---
date: "2026-09-09T23:00:00+02:00"
researcher: Cursor Grok
git_commit: b61d55f248baabb12031084a9f3d824c0e63062b
branch: main
repository: tofucode-dev/watch-bldrs
topic: "F-01 Build visibility and private main-image storage — persistence contract before publish UI"
tags:
  [
    research,
    codebase,
    supabase,
    rls,
    storage,
    builds,
    migrations,
    f-01,
  ]
status: complete
last_updated: "2026-09-09"
last_updated_by: Cursor Grok
---

# Research: F-01 — Build visibility and private main-image storage

**Date**: 2026-09-09T23:00:00+02:00
**Researcher**: Cursor Grok
**Git Commit**: b61d55f248baabb12031084a9f3d824c0e63062b
**Branch**: main
**Repository**: tofucode-dev/watch-bldrs

## Research Question

What already exists for persisting builds, and what must F-01 introduce so that drafts stay author-only, publication is one-way, parts belong to a build, and main images stay private — without building the S-02 create/upload/publish user flow?

## Summary

The product modules, schema, RLS, Storage bucket, and integration tests **do not exist yet**. Auth is cookie-backed Supabase SSR against `auth.users` only. Architecture docs already specify the persistence contract (`builds`, `build_parts`, one-way `draft → published`, private bucket + signed URLs). F-01 is that contract: migrations, grants, RLS, a private main-image bucket, generated types, and identity-matrix tests. It is **not** the authoring UI, catalog reads, likes, or Actions. Roadmap risk is explicit: S-02 still has to create, upload, and publish through a real user flow ([TOF-6](https://linear.app/tofucode/issue/TOF-6/f-01-persist-builds-with-ownership-one-way-publish-and-private-main)).

## Detailed Findings

### 1. F-01 scope vs adjacent slices

| Concern | Owner | Implication for F-01 |
| --- | --- | --- |
| Tables, RLS, one-way publish invariant, private bucket | F-01 | In scope |
| Create/edit/publish UI, image upload pipeline, public listing/details | S-02 | Out of scope — consumes the F-01 contract |
| Five AND filters | S-03 | Needs filterable columns to exist; filter UX is later |
| `build_likes` | S-04 | Roadmap: likes persist only in S-04, not F-01 |
| Account area | S-05 | Out of scope |
| Home recent shelf | S-06 | Out of scope |
| Password vs magic-link/SSO | S-01 | Parallel; F-01 uses `auth.uid()` and does not change Auth |

PRD anchors: Access Control; Success Criteria guardrails; FR-003 (own builds only); FR-004 (structured attributes + draft vs published). Guardrail: drafts never appear on home, listing, filters, or public details for others.

### 2. Codebase baseline — no product persistence

| Expected | Reality |
| --- | --- |
| `supabase/migrations/` | **Absent** |
| `src/modules/builds` | **Absent** (`src/modules/` does not exist) |
| `src/actions/index.ts` | **Absent** |
| Generated DB types | **Absent** |
| `tests/integration/` | **Absent** |
| Storage bucket | **Commented stub** in `supabase/config.toml` |
| `supabase/seed.sql` | **Absent**, but `config.toml` `[db.seed] sql_paths = ["./seed.sql"]` is enabled — `db reset` will fail until a seed file exists |

Present: `supabase/config.toml` (`project_id = "watch-bldrs"`), `supabase` CLI `^2.23.4` as a devDependency, local Docker flow in README, hosted link flow, Auth client + middleware.

README still says “No product tables or migrations are required yet — Auth uses `auth.users` only.” Deployment docs say “There is no `supabase/migrations/` yet. Do not invent a `db push`.” F-01 is the change that invalidates both sentences.

### 3. Auth is ready enough for RLS identities

Server client: `src/lib/supabase.ts` — `createServerClient` from `@supabase/ssr` with cookie `getAll`/`setAll`, gated on `SUPABASE_URL` / `SUPABASE_KEY` from `astro:env/server`. Missing env → `null`.

Middleware: `src/middleware.ts` calls `supabase.auth.getUser()` (not `getSession`) and sets `Astro.locals.user`. Only `/dashboard` is a protected prefix.

`Actor` in `src/types.ts` (`anonymous` | `authenticated` + `userId`) is **defined and unused**. Locals are typed as `User | null` in `src/env.d.ts`. Architecture wants Actor in locals; wiring is not required to prove RLS, but S-02 Actions must not trust a client-supplied `authorId`.

No service-role key is in the Astro env schema or Wrangler secrets. Browser-safe key only. Storage policies and signed-URL generation must work with the publishable key plus RLS, unless F-01/S-02 deliberately adds a **server-only** secret key.

### 4. Target schema (architecture, not code)

From `context/foundation/architecture/data-model.md`:

**`builds`**: `id`, `author_id` → Auth user, `status` (`draft` \| `published`), optional `name`/`story`/filterable attributes, `main_image_path` (object path, never a signed URL), `published_at` (set once), `created_at`/`updated_at`.

**`build_parts`**: `build_id` cascade delete, structured `category`, `name`, optional `product_url`, optional `price_amount` + `currency` (both present or both absent), `position`.

**`build_likes`**: specified in the same doc; **defer to S-04**.

**No profiles table.**

PRD FR-004 also names **hands style**. The data-model table has no `hands_style` column. Dictionary examples: Mercedes, Sword, Dauphine, Baton. It is not a catalog filter (FR-006). Treat as a planning decision: persist it in F-01 as an optional structured field, or wait and force S-02 to migrate.

Filterable attributes should be normalized values, not only free text inside `story` (data-model + OPERATIONAL_SAFETY §11). Dictionary gives example lists for watch style, movement, strap type; **dial colour has no concrete list**. Case size is millimetres (numeric). Part examples: movement, case, dial, hands, bezel, crystal, strap, bracelet.

### 5. Authorization contract (must be in SQL)

RLS matrix (`architecture/security.md`):

| Resource | Anonymous | Authenticated non-author | Author |
| --- | --- | --- | --- |
| Select published build | Allow | Allow | Allow |
| Select draft build | Deny | Deny | Allow |
| Insert/update/delete build | Deny / own / own | Deny except insert own | Allow |
| Publish | Deny | Deny | Allow once |
| Parts of published / draft | Allow / Deny | Allow / Deny | Allow |
| Mutate parts | Deny | Deny | Owned parent |

Publication state machine: `create → draft`; `draft → draft` (edit); `draft → published` (once); delete from either; **no `published → draft`**. Enforce at:

1. Domain/application (S-02)
2. **Database invariant in F-01** (trigger or controlled function) — RLS must not be assumed to compare OLD/NEW status reliably
3. RLS ownership on every mutation

OPERATIONAL_SAFETY extras that belong in the F-01 schema, not later “hardening”:

- Constraints/grants/RLS/triggers live in migrations, not the dashboard
- `published_at` must not reset on a no-op re-publish
- Price/currency both-or-neither; no auto build total
- Prefer integer minor units or validated decimals for money (data-model currently says `numeric`)
- Length limits on user text
- Timestamps UTC, DB defaults
- FK indexes; skip speculative filter indexes until S-03 query plans exist
- `security definer` only with justification, empty `search_path`, and tight EXECUTE grants
- Do not pass owner IDs into privileged functions when `auth.uid()` is available

### 6. Storage: private bucket + path, not a public CDN

Architecture + OPERATIONAL_SAFETY §10:

- Private bucket (public bucket is unsafe while drafts exist)
- Path `USER_ID/BUILD_ID/main.ext`, names generated server-side
- Author upload / replace / delete for owned builds
- Time-limited signed reads for catalog after **verifying published**
- Author-only signed reads for drafts
- Store path on `builds.main_image_path`, never a signed URL
- Upsert needs INSERT + SELECT + UPDATE on `storage.objects` ([Storage access control](https://supabase.com/docs/guides/storage/security/access-control))
- Folder helper: first path segment = `auth.uid()` ([helper functions](https://supabase.com/docs/guides/storage/schema/helper-functions))
- Second segment should be a build the actor owns — path-only checks do not prove the build row exists
- Anonymous must not `SELECT` draft objects even with a guessed UUID path
- Signed URLs for published images: either (a) SELECT policy for objects whose parent build is `published`, then `createSignedUrl` with the anon/user client, or (b) server-only secret key to sign after an application publication check. Today there is **no secret key** in env. Option (a) lets anyone who knows the path download a published file via the Storage API; listing can still be denied. Option (b) needs a new server secret and AGENTS.md “verify authorization before use”

`config.toml` global `file_size_limit = "50MiB"` is far above a main-photo budget. Bucket-level MIME + size should be tighter (jpeg/png/webp, low single-digit MiB). Magic-byte and dimension checks are upload-pipeline work (S-02), not SQL.

Bucket name is **unset**. The commented example is `[storage.buckets.images]`. Prefer creating the bucket in a migration (`storage.buckets`) so hosted and local stay in git, rather than only uncommenting local `config.toml`.

Image cleanup on replace/delete/abandoned draft is specified in OPERATIONAL_SAFETY; F-01 can define ON DELETE behavior for objects if a DB hook is practical, otherwise document it as S-02 compensating cleanup (Storage is outside Postgres transactions).

### 7. Testing gap is the F-01 delivery risk

Architecture: every exposed table needs integration tests as **anonymous, author A, user B**. Testing only application code does not prove RLS. Also: migrations apply from a clean local DB; published→draft rejected; Storage draft vs published.

Current Vitest config includes only `src/**/*.{test,spec}.{ts,tsx}` (`vitest.config.ts`). The only test is `src/lib/supabase.test.ts`, which mocks `astro:env/server` and `@supabase/ssr`. CI (`ci.yml`) runs `npm ci`, `astro sync`, lint, test, build — **no Docker, no `supabase start`, no typegen drift check**.

OPERATIONAL_SAFETY §1 / §15 want: clean reset, generated types matching schema (CI fail on mismatch), RLS/Storage tests as three identities.

F-01 therefore introduces the integration harness (`tests/integration/` per modules.md), a way to mint three identities against local Auth, and a decision on whether GitHub Actions runs `npx supabase start` (Docker on `ubuntu-latest`) or RLS tests stay a local/required pre-merge command.

### 8. Module scaffolding — optional for F-01

AGENTS.md incremental adoption: “Implement the first new business feature under `src/modules/builds`.” F-01 is foundation SQL, not that user feature. Creating empty `domain/` / `application/` folders would violate “do not create empty directories.” A thin `infrastructure` types mapping after `supabase gen types` is useful; Actions (`createDraft`, `publish`, …) belong to S-02.

Path alias `@/*` → `./src/*` already covers `@/modules/...` once the folder exists. No extra tsconfig alias is required.

### 9. Hosted vs local

Local: `npx supabase start`, API `54321`, DB `54322`, Studio `54323`, Auth confirmations off, `site_url = http://127.0.0.1:4321`. Hosted: `npx supabase db push` is separate from Worker rollback (deployment.md). F-01 must not assume `git push` applies SQL.

`config.toml` `[storage.buckets.images]` is local-only if uncommented; hosted buckets still need the SQL/API migration.

## Code References

- `context/foundation/roadmap.md` — F-01 outcome, risk, unlocks S-02; S-04 “likes persist only in this slice (not in F-01)”
- `context/foundation/prd.md` — Access Control; guardrails; FR-003, FR-004 (hands style); FR-005 parts
- `context/foundation/architecture/data-model.md` — `builds`, `build_parts`, `build_likes`; catalog read model (S-02/S-03)
- `context/foundation/architecture/security.md` — RLS matrix; publication state machine; private-bucket + signed URL strategy
- `context/foundation/architecture/modules.md` — `builds` owns the aggregate; layers after ≥2 files; `tests/integration/`
- `context/foundation/architecture/testing.md` — RLS three identities; Storage; published→draft rejection
- `context/foundation/architecture/runtime.md` — browser Supabase forbidden except Storage upload; mutations via Actions (S-02)
- `context/foundation/OPERATIONAL_SAFETY.md` — §§1–4, 8, 10–11, 15
- `context/foundation/DOMAIN_DICTIONARY.md` — attribute example values; part kinds; Main Photo
- `context/foundation/deployment.md` — no migrations yet; `db push` ≠ Worker rollback
- `context/foundation/tasks-linear.md` — F-01 = [TOF-6](https://linear.app/tofucode/issue/TOF-6)
- `src/lib/supabase.ts` — cookie SSR client, anon key only
- `src/middleware.ts` — `getUser()` → `locals.user`; `/dashboard` guard
- `src/types.ts` — unused `Actor`
- `src/env.d.ts` — `locals.user: User | null`
- `src/lib/supabase.test.ts` — mock pattern for unit tests (not RLS)
- `vitest.config.ts` — include `src/**` only
- `supabase/config.toml` — seed path, storage 50MiB, commented `images` bucket
- `astro.config.mjs` — `SUPABASE_URL` / `SUPABASE_KEY` server secrets
- `.github/workflows/ci.yml` — no Supabase CLI / Docker
- `package.json` — `"test": "vitest run"`; `supabase` CLI as devDependency

## Architecture Insights

### Persistence before UI

F-01 is sequenced first so catalog slices cannot “forget” draft privacy. The proving flow still does not exist until S-02. Success for F-01 is: from a clean `supabase db reset`, the three identities cannot violate the matrix, `published → draft` is rejected by the database, and a non-author cannot read a draft object.

### RLS is the product

UI route guards and future Actions are UX. The Data API exposes `public` (and Storage) with the same anon key the Worker uses. A missing SELECT policy on drafts is a public leak even with no listing page.

### One-way publish is a DB invariant

Postgres RLS `WITH CHECK` on UPDATE does not reliably encode “status may stay published or move draft→published, but never the reverse” without `OLD` (triggers see `OLD`/`NEW`). Prefer a `BEFORE UPDATE` trigger (or a single `publish_build()` function that is the only way to flip status). Application checks in S-02 are feedback, not the race-condition control (OPERATIONAL_SAFETY §3–4).

### Signed URLs vs public SELECT

A fully public bucket cannot host drafts. A private bucket plus signed URLs matches the docs. Catalog SSR will need a way to sign published paths without stuffing signed URLs into the database. Decide in planning whether published objects get an anon SELECT (signed URL is then a cache/CDN convenience) or stay SELECT-denied except via a privileged signer.

### First module can wait

Empty hexagonal folders would fight AGENTS.md. F-01 can land SQL + generated types + integration tests. `src/modules/builds` appears when S-02 adds a second file in a layer (or the first real use case).

### Seed file is a landmine

`[db.seed] enabled = true` + missing `./seed.sql` breaks reset. F-01 should add a synthetic-or-empty seed so the documented “clean local database from migrations + seed” loop works.

## Open Questions

These are for `/10x-plan` to settle. Recommendations below are research leanings, not locked decisions.

1. **F-01 application code** — SQL + types + integration tests only, or also a thin `src/modules/builds` read/write helper with no Actions?
   - Lean: **tests + types + migrations only**. S-02 owns use cases/Actions. Avoid empty layers.

2. **`hands_style`** — add optional column in F-01 (FR-004) or omit until S-02?
   - Lean: **add optional text/enum in F-01**. Cheaper than a second migration before the north-star form.

3. **Controlled vocabularies** — Postgres enums now vs `text` + check later vs domain constants only until S-03?
   - Lean: **Postgres enum/check for `status` and part `category` now**; filter attributes as constrained text or enums **only if** planning locks the lists. Dial colour has no list yet — do not invent a fake taxonomy in SQL.

4. **`build_likes` in this migration?**
   - Lean: **no**. Roadmap S-04 is explicit.

5. **Published image SELECT policy vs service-role signing**
   - Lean: **no new secret in F-01**. Private bucket; author CRUD under `uid/buildId/`; SELECT for author always; SELECT for `anon`/`authenticated` only when `builds.status = 'published'` and path matches `main_image_path`. S-02 still generates short-lived signed URLs and never persists them. Revisit a server secret only if signed URL creation cannot work with the publishable key.

6. **Bucket id and photo size cap**
   - Lean: bucket id `build-images`; jpeg/png/webp; **~5MiB** object cap (not 50MiB). Magic-byte/dimension checks stay S-02.

7. **Money storage** — `numeric` as in data-model vs integer minor units (OPERATIONAL_SAFETY §11)?
   - Lean: **integer minor units + ISO-4217 `char(3)`**, both null or both set. Avoid JS float.

8. **Integration tests in CI**
   - Lean: **run them**. `npx supabase start` (or `db reset`) on GitHub `ubuntu-latest` with Docker; expand Vitest include to `tests/integration/**`. Without CI, RLS regressions ship on `main`.

9. **Typegen location and CI drift**
   - Lean: committed `src/lib/database.types.ts` (or `src/modules/builds/infrastructure/database.types.ts`) plus an npm script `supabase gen types` and a CI check that the file is clean after regen.

10. **Actor in middleware in F-01?**
    - Lean: **no**. Not needed to prove RLS. S-01 or S-02 can map `locals.user` → `Actor` when the first Action resolves the actor.

11. **Author delete cascade from `auth.users`**
    - Lean: **`ON DELETE CASCADE`** on `author_id`. No product rule for deleted accounts; orphan builds would break ownership RLS.

12. **Object cleanup when a build row is deleted**
    - Lean: **document as S-02/compensating** unless a simple trigger calling Storage is already well-supported. Do not block F-01 on Storage-from-Postgres hooks.
