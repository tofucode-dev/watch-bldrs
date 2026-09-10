# Build Visibility and Private Main-Image Storage Implementation Plan

## Overview

F-01 lands the persistence contract for WatchBldrs: `builds` and `build_parts` with author ownership, draft-row privacy, a private main-image bucket, generated Database types, and local identity-matrix tests. It does not ship authoring UI, Actions, catalog reads, or likes. S-02 consumes this contract to create, upload, and publish.

## Current State Analysis

Auth is cookie-backed Supabase SSR (`src/lib/supabase.ts`, `src/middleware.ts`) against `auth.users` only. `supabase/config.toml` exists; `supabase/migrations/` does not. `[db.seed]` points at missing `./seed.sql`, so `db reset` fails today. There is no `src/modules/`, no `src/actions/`, no generated DB types, and Vitest only includes `src/**/*.{test,spec}.{ts,tsx}`. CI runs lint, unit tests, and build — no Docker, no `supabase start`. Architecture docs already specify the RLS matrix and private-bucket strategy; product tables and Storage policies are not implemented.

## Desired End State

From a clean `npx supabase db reset`, three identities (anonymous, author A, user B) can hit the Data API and Storage with the publishable key:

- A draft build and its parts are visible and mutable only to A.
- After A sets `status` to `published`, anonymous and B can select the build row, its parts, and the main image (via SELECT / signed URL). They still cannot mutate.
- Object paths are `{author_id}/{build_id}/main.{ext}` in private bucket `build-images`. `builds.main_image_path` stores that path, never a signed URL.
- The database **allows** `published → draft`. The MVP UI must not expose unpublish (PRD non-goal is the control, not the SQL path). `published_at` is set on first publish and is not overwritten.
- `npm run test:integration` proves the matrix locally. GitHub Actions stays lint + unit + build.

### Key Discoveries:

- No product schema or bucket exists; README and `deployment.md` still say migrations are not required (`README.md` local-stack section; `context/foundation/deployment.md`).
- `Actor` in `src/types.ts` is unused; F-01 does not wire it.
- There is no service-role key in the Astro env schema. Storage policies must work with the publishable key; tests may use the local service role **only** to mint users A and B.
- Storage upsert requires INSERT + SELECT + UPDATE on `storage.objects`.
- `vitest.config.ts` include path will not pick up `tests/integration/` until updated.

## What We're NOT Doing

- Astro Actions, build editor, catalog listing/details, home shelf, account area
- `src/modules/builds` scaffolding (empty layers forbidden; first use cases belong to S-02)
- `build_likes` (S-04)
- Profiles table
- Magic-byte / dimension image validation (S-02 upload pipeline)
- Storage object cleanup on build or user delete (document for S-02)
- Actor mapping in middleware
- Docker-in-CI or hosted RLS tests
- Typegen drift check in GitHub Actions (local regen only)
- A database trigger that forbids `published → draft`

## Implementation Approach

One timestamped migration created with `npx supabase migration new` holds enums, tables, constraints, grants, RLS, triggers for `updated_at` / first `published_at`, the private bucket row, and Storage policies. A synthetic-or-empty `supabase/seed.sql` unblocks reset. Types are generated into `src/lib/database.types.ts`. Integration tests live under `tests/integration/` and run only via `npm run test:integration` against local Docker Supabase. Docs record the product contract (SQL allows unpublish; MVP UI does not) and the CI exception (GitHub Actions does not run RLS tests or typegen).

## Critical Implementation Details

### Timing and lifecycle

Create the `builds` row before an upload. Storage INSERT must check that the second path segment is a `builds.id` owned by `auth.uid()`; a path-only `folder[1] = auth.uid()` check is not enough.

### State sequencing

When `status` becomes `published` and `published_at` is null, set `published_at = now()`. Do not clear `published_at` on unpublish and do not overwrite it on a later publish. No trigger should reject `published → draft`.

### Debug and observability

Never log signed URLs, cookies, or service-role keys. Integration tests should assert outcomes (row counts, storage download status), not print JWTs.

## Phase 1: Schema, RLS, and private storage

### Overview

Introduce the database and Storage contract on a clean local reset: enums, `builds`, `build_parts`, RLS, private `build-images`, seed file.

### Changes Required:

#### 1. Create the migration via CLI

**File**: `supabase/migrations/YYYYMMDDHHmmss_build_visibility_and_storage.sql` (name from `npx supabase migration new build_visibility_and_storage`)

**Intent**: Version the full persistence contract in git so local reset and later `db push` share one source of truth.

**Contract**: Do not hand-invent the filename. Wrap related statements in `BEGIN`/`COMMIT`. No dashboard-only policies.

#### 2. Enums and tables

**File**: same migration

**Intent**: Persist structured build attributes and ordered parts with ownership, without a likes table.

**Contract**:

Postgres enums (labels are lowercase snake_case; S-02 maps display copy). Every attribute and part enum includes `other`; `build_status` does not.

| Type | Labels |
| --- | --- |
| `build_status` | `draft`, `published` |
| `watch_style` | `diver`, `field`, `dress`, `gmt`, `pilot`, `integrated`, `other` |
| `movement` | `nh35`, `nh36`, `nh34`, `miyota_8215`, `other` |
| `dial_colour` | `black`, `white`, `blue`, `green`, `silver`, `other` |
| `strap_type` | `leather`, `nato`, `rubber`, `steel_bracelet`, `other` |
| `hands_style` | `mercedes`, `sword`, `dauphine`, `baton`, `other` |
| `part_category` | `movement`, `case`, `dial`, `hands`, `bezel`, `crystal`, `strap`, `bracelet`, `other` |

`builds`:

- `id uuid pk default gen_random_uuid()`
- `author_id uuid not null references auth.users(id) on delete cascade`
- `status build_status not null default 'draft'`
- optional `name text` (max 120), `story text` (max 4000)
- optional `watch_style`, `movement`, `dial_colour`, `strap_type`, `hands_style` (those enums)
- optional `case_size_mm integer` with a sane positive check (e.g. 20–70)
- optional `main_image_path text` (max 512; object key, not URL)
- `published_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- index on `author_id`; no speculative catalog filter indexes

`build_parts`:

- `id uuid pk default gen_random_uuid()`
- `build_id uuid not null references builds(id) on delete cascade`
- `category part_category not null`
- `name text not null` (max 120)
- optional `product_url text` (max 2048; no fetch)
- optional `price_amount_minor integer check (>= 0)`
- optional `currency char(3)` check `~ '^[A-Z]{3}$'`
- `CHECK ((price_amount_minor is null) = (currency is null))`
- `position integer not null check (>= 0)`
- unique `(build_id, position)`
- index on `build_id`

Enable RLS on both tables. `REVOKE ALL` on both tables from `public`. Grant `select/insert/update/delete` to `authenticated` and `select` to `anon` as required by the policies below. `GRANT USAGE ON TYPE` for every new enum (`build_status`, `watch_style`, `movement`, `dial_colour`, `strap_type`, `hands_style`, `part_category`) to `anon` and `authenticated`.

`updated_at` maintained by a trigger. First-publish trigger: if NEW.status is `published` and NEW.published_at is null, set `published_at = now()`. Do not block status reversals.

#### 3. RLS policies (tables)

**File**: same migration

**Intent**: Draft rows never leak through the Data API. Ownership is enforced even without UI.

**Contract** (security.md matrix, with unpublish allowed):

| Operation | Policy |
| --- | --- |
| `builds` SELECT | `status = 'published' OR author_id = auth.uid()` |
| `builds` INSERT | `author_id = auth.uid()` and `status = 'draft'` (new rows start draft) |
| `builds` UPDATE | `author_id = auth.uid()`; WITH CHECK same owner; status may be draft or published |
| `builds` DELETE | `author_id = auth.uid()` |
| `build_parts` SELECT | parent build visible under the builds SELECT rule |
| `build_parts` INSERT/UPDATE/DELETE | parent `builds.author_id = auth.uid()` |

Anonymous uses the `anon` role (no `auth.uid()`). Authenticated non-author is a different `auth.uid()`.

#### 4. Private bucket and Storage policies

**File**: same migration

**Intent**: Draft photos are not world-readable; published photos can be signed with the existing publishable key.

**Contract**:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'build-images',
  'build-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);
```

Object key: `{author_uuid}/{build_uuid}/main.{ext}` where `{author_uuid}` equals `auth.uid()` and `{build_uuid}` is a build that actor owns.

- INSERT/UPDATE/DELETE: `authenticated` only, path and parent-build ownership checks; upsert needs SELECT as well as INSERT/UPDATE.
- SELECT: owner can always read own prefix; `anon` and `authenticated` can SELECT only when a `builds` row is `published` and `main_image_path` equals `storage.objects.name` for `bucket_id = 'build-images'`.
- Do not allow listing the whole bucket for `anon`.

#### 5. Seed file

**File**: `supabase/seed.sql`

**Intent**: Unblock `db reset` (`config.toml` already enables seed and points here).

**Contract**: Synthetic data only, safe to re-run. Empty file with a comment is acceptable if no seed rows are needed for tests (tests create their own users).

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` exits 0 on the local stack
- After reset, `builds`, `build_parts`, the listed enum types, and bucket `build-images` (`public = false`) exist

#### Manual Verification:

- Studio shows RLS enabled on both tables and policies matching the matrix
- Studio shows bucket `build-images` private, 5 MiB, jpeg/png/webp

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Types, scripts, and docs

### Overview

Commit generated types, add local scripts, and update operator docs so the next clone and S-02 know the contract — including the two exceptions.

### Changes Required:

#### 1. Generated types

**File**: `src/lib/database.types.ts`

**Intent**: Give S-02 a typed Supabase schema without creating `src/modules/builds`.

**Contract**: Generated via `npx supabase gen types typescript --local`. Do not hand-edit. Add `npm run db:types` that regenerates this file.

#### 2. npm scripts and Vitest include (scripts only)

**File**: `package.json`

**Intent**: Make type regen and local RLS tests discoverable without putting them on GitHub Actions.

**Contract**: `db:types` as above. `test:integration` runs Vitest on `tests/integration/**`. Leave `"test": "vitest run"` as unit-only (`src/**`).

#### 3. Vitest config split

**File**: `vitest.config.ts` (and a second config if cleaner, e.g. `vitest.integration.config.ts`)

**Intent**: Unit tests stay mock-based and CI-safe; integration tests can use Node + live local URL/keys.

**Contract**: Default `npm test` still includes only `src/**/*.{test,spec}.{ts,tsx}`. Integration config includes `tests/integration/**/*.{test,spec}.ts`, Node environment, no `astro:env` mock required if tests construct `@supabase/supabase-js` clients from `process.env` / local defaults (`http://127.0.0.1:54321` plus keys from `npx supabase status -o env`).

#### 4. README and deployment

**File**: `README.md`, `context/foundation/deployment.md`

**Intent**: Stop saying migrations are not required. Document reset, typegen, local integration tests, and `npx supabase db push` as separate from Worker rollback.

**Contract**: Replace the “no product tables yet” sentences. Document `npm run test:integration` as required before merging F-01/RLS changes, not as a CI job.

#### 5. Architecture contract sync

**File**: `context/foundation/architecture/data-model.md`, `context/foundation/architecture/security.md`, `context/foundation/architecture/testing.md`, `context/foundation/architecture/modules.md`, `context/foundation/prd.md`, `context/foundation/roadmap.md`, `context/foundation/OPERATIONAL_SAFETY.md`, `AGENTS.md`

**Intent**: Prevent S-02 from following a stale “one-way in SQL” contract or a stale schema (missing `hands_style`, `numeric` prices). Unpublish is a product split: technically possible in the database, not offered in the MVP UI.

**Contract**:

- data-model: add `hands_style`; price as `price_amount_minor` + `currency`; list enum labels; note `build_likes` waits for S-04; record text max lengths (`name` 120, `story` 4000, `main_image_path` 512, part `name` 120, `product_url` 2048).
- Product vs SQL (already aligned in plan-review, do not revert): PRD Access Control / FR-003 / Non-Goals, roadmap F-01, `testing.md`, `AGENTS.md` invariants, `modules.md` builds ownership, and `security.md` state machine all say the database **allows** `published → draft` and the MVP UI does not expose unpublish. Keep private-bucket + signed URL + published SELECT.
- CI exception (already recorded in plan-review, do not revert): `security.md` “CI verification exception” is the OPERATIONAL_SAFETY §16 write-up for skipping typegen-drift and RLS jobs on GitHub Actions. `OPERATIONAL_SAFETY.md` §15 points at it. `AGENTS.md` Definition of Done requires local `npm run db:types` and `npm run test:integration` for schema/RLS/Storage changes. SQL unpublish is the product contract, not an exception.

### Success Criteria:

#### Automated Verification:

- `npm run db:types` produces a committed `src/lib/database.types.ts` that includes `builds` and `build_parts`
- `npm run lint` passes
- `npm run test` passes (existing unit tests only)

#### Manual Verification:

- README steps for `supabase start` → `db reset` → `db:types` are accurate when followed once
- PRD, roadmap, testing.md, AGENTS.md, modules.md, and security.md still state SQL-allowed unpublish with no MVP UI control
- security.md CI exception, OPERATIONAL_SAFETY §15, and AGENTS.md DoD still name local `test:integration` and `db:types` as merge gates

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Local identity-matrix tests

### Overview

Prove the RLS and Storage matrix with anonymous, author A, and user B against live local Supabase.

### Changes Required:

#### 1. Integration harness

**File**: `tests/integration/helpers/supabase-identities.ts` (name may vary; keep helpers next to tests)

**Intent**: Mint A and B with the local service role, then exercise the Data API as anon / A / B with the publishable key only.

**Contract**: Fail fast if local URL/keys are missing (`supabase start` not running). Service role must not be used to SELECT drafts as “proof” of privacy. Prefer `createClient` from `@supabase/supabase-js` (not the Astro cookie helper).

#### 2. Builds and parts matrix

**File**: `tests/integration/build-visibility.test.ts`

**Intent**: Lock draft privacy, ownership, and publish visibility without UI.

**Contract**: Cover at least:

- A inserts a draft; anon and B cannot SELECT it or its parts; A can
- B cannot UPDATE/DELETE A’s draft; A can
- B cannot INSERT a build with `author_id = A`
- A publishes; anon and B can SELECT the build and parts; they still cannot mutate
- A can set `published → draft` via UPDATE (allowed in SQL); after that, anon/B cannot SELECT it again
- Anonymous cannot INSERT

#### 3. Storage matrix

**File**: `tests/integration/build-image-storage.test.ts`

**Intent**: Draft objects stay private; published objects are readable with the publishable key (SELECT and/or `createSignedUrl`).

**Contract**: Cover at least:

- A uploads under `A_id/build_id/main.webp` after the build row exists
- Upload fails if the build row does not exist yet (second path segment is not an owned `builds.id`)
- A cannot upload under B’s prefix or a build B owns
- Anon and B cannot download A’s object while the build is draft
- Anon and B cannot `list()` A’s prefix or the whole `build-images` bucket
- B cannot UPDATE or DELETE A’s object
- After publish + `main_image_path` set, anon can create a signed URL or download; B can too
- Unpublish (status back to draft) removes anon/B read access to the object

### Success Criteria:

#### Automated Verification:

- `npm run test:integration` exits 0 against local Supabase after `db reset`
- `npm run test` still exits 0
- `npm run lint` still exits 0

#### Manual Verification:

- README `npm run test:integration` steps written in Phase 2 succeed after `db reset` (Phase 2 pause does not run this command)
- One pass of the matrix in Studio (optional sanity): as A’s session vs logged-out, draft row hidden from Table Editor using anon key is not required if tests passed — confirm signed URL for a published object opens in a private window, and the draft object URL does not

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- Existing `src/lib/supabase.test.ts` must keep passing (mocks; no live DB).
- No new unit tests are required for SQL policies.

### Integration Tests:

- Anonymous / author A / user B on `builds`, `build_parts`, and `storage.objects` as specified in Phase 3.
- `published → draft` succeeds for A and re-hides the row and object.

### Manual Testing Steps:

1. `npx supabase start` then `npx supabase db reset`.
2. Confirm Studio: tables, enums, private bucket, RLS on.
3. Run `npm run db:types` and `npm run test:integration`.
4. After publish in a test (or Studio as A), open a signed URL in a logged-out browser; confirm a draft object URL fails.
5. Hosted apply is **not** this plan’s CI: when ready, `npx supabase db push` separately from Worker deploy.

## Performance Considerations

No catalog query indexes in F-01. Collection reads in S-02/S-03 must add order + limit; skip speculative indexes until then.

## Migration Notes

Empty local DB: reset from committed migration + seed. Hosted project has no product tables yet — first `db push` is additive. Worker rollback does not undo SQL or Storage. No backfill.

## References

- Related research: `context/changes/build-visibility-and-storage/research.md`
- Linear: [TOF-6](https://linear.app/tofucode/issue/TOF-6)
- RLS matrix: `context/foundation/architecture/security.md`
- Schema sketch: `context/foundation/architecture/data-model.md`
- Storage policies: https://supabase.com/docs/guides/storage/security/access-control
- Bucket SQL: https://supabase.com/docs/guides/storage/quickstart

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Schema, RLS, and private storage

#### Automated

- [ ] 1.1 `npx supabase db reset` exits 0 on the local stack
- [ ] 1.2 After reset, `builds`, `build_parts`, the listed enum types, and bucket `build-images` (`public = false`) exist

#### Manual

- [ ] 1.3 Studio shows RLS enabled on both tables and policies matching the matrix
- [ ] 1.4 Studio shows bucket `build-images` private, 5 MiB, jpeg/png/webp

### Phase 2: Types, scripts, and docs

#### Automated

- [ ] 2.1 `npm run db:types` produces a committed `src/lib/database.types.ts` that includes `builds` and `build_parts`
- [ ] 2.2 `npm run lint` passes
- [ ] 2.3 `npm run test` passes (existing unit tests only)

#### Manual

- [ ] 2.4 README steps for `supabase start` → `db reset` → `db:types` are accurate when followed once
- [ ] 2.5 PRD, roadmap, testing.md, AGENTS.md, modules.md, and security.md state SQL-allowed unpublish with no MVP UI control
- [ ] 2.6 security.md CI exception, OPERATIONAL_SAFETY §15, and AGENTS.md DoD name local `test:integration` and `db:types` as merge gates

### Phase 3: Local identity-matrix tests

#### Automated

- [ ] 3.1 `npm run test:integration` exits 0 against local Supabase after `db reset`
- [ ] 3.2 `npm run test` still exits 0
- [ ] 3.3 `npm run lint` still exits 0

#### Manual

- [ ] 3.4 Confirm signed URL for a published object opens in a private window, and the draft object URL does not
- [ ] 3.5 README `npm run test:integration` steps written in Phase 2 succeed after `db reset`
