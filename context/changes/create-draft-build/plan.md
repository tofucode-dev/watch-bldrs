# Create a Private Draft Build Implementation Plan

## Overview

Let an authenticated author create and re-save a private draft (optional watch attributes, parts list, optional main photo) through the first `src/modules/builds` slice: Astro Actions, one React form island composed from the F-02/F-03 kit, and a gated `/account/builds/new` page. Publish, account list, and public catalog stay later slices.

## Current State Analysis

Persistence, RLS, and private `build-images` already landed in F-01 (`supabase/migrations/20260910201541_build_visibility_and_storage.sql`, `tests/integration/build-visibility.test.ts`, `tests/integration/build-image-storage.test.ts`). The form kit and photo well exist in `src/components/ui`; `uploadMainImage` returns `{authorId}/{buildId}/main.{ext}` and never a URL (`src/lib/upload-main-image.ts`). Cookie auth works (`src/middleware.ts` protects only `/dashboard`; sign-in POST always redirects to `/`).

There is no `src/modules/`, no `src/actions/`, no Build Form page, and no Playwright. `Actor` in `src/types.ts` is unused; pages read `Astro.locals.user`. CI already inlines `PUBLIC_SUPABASE_*` at build (`.github/workflows/ci.yml`). S-01 is still `ready` rather than `done`, but password session is enough to gate create.

### Key Discoveries:

- First product mutation must live under `src/modules/builds` with Actions registered from `src/actions/index.ts` (`context/foundation/architecture/modules.md`, `security.md`).
- `uploadMainImage` requires a `buildId` before Storage (`src/lib/upload-main-image.ts`). Save is insert (or update) → browser upload → path write, in one user click.
- `PhotoUpload` only previews a local `File` (`src/components/ui/photo-upload.tsx`). After refresh, showing the stored image needs an optional preview URL plus an author-only signed URL.
- OPERATIONAL_SAFETY §3 forbids sequential build-then-parts client calls. A `security invoker` SQL function that uses `auth.uid()` is the save path for the row + parts.
- Cross-module imports through `@/modules/<name>` and `@/modules/<name>/server` only. Create layer folders because this module will have ≥2 files per layer. Do not add empty ports “for later.”
- F-01 RLS already hides drafts from anon and user B. This slice must not add catalog reads or an unpublish Action.

## Desired End State

An authenticated user can open `/account/builds/new` from a Dashboard button, fill any subset of the form (empty draft allowed), click Save Draft, and get a private `builds` row with optional parts and optional main image. The URL becomes `/account/builds/[id]/edit` without a full navigation away from the form; a second Save updates the same draft. Discard resets unsaved UI to the last saved snapshot and does not delete. Anonymous visitors hitting `/account/*` go to sign-in (safe relative `redirect`). User B cannot load or save A’s draft. No publish control. Phone and desktop both usable.

Verification: domain/use-case unit tests, jsdom form tests, local `test:integration` for the new function’s identity matrix, lint/test/build, and a manual create/re-save/photo/privacy pass.

## What We're NOT Doing

- Publish / unpublish UI or a publish Action (S-03)
- Account list of own builds, delete, or Storage orphan cleanup on delete (S-08)
- A second editor kit; S-09 reuses this form and adds entry from account/details (this slice already re-saves the draft it just created)
- Public listing, details, filters, likes, home composition (S-04–S-07, S-10, F-04–F-06)
- Extra gallery photos; Worker file proxy; signed URLs for catalog
- Eager draft insert on GET
- `react-hook-form` / a client store (one island owns form state)
- Playwright / e2e runner
- Magic link / Google / Reddit SSO (S-01 unknown)
- Cloudflare rate limits / Turnstile for build mutations (OPERATIONAL_SAFETY §7 stays a later hardening item)
- Moving `uploadMainImage` out of `src/lib` (browser helper; infrastructure would be the wrong layer)

## Implementation Approach

Stand up `builds` as a vertical slice: domain validation → application use cases → Supabase/RPC infrastructure → grouped Actions → one hydrated form island on thin Astro pages.

Save payload (fields + parts) goes through one `security invoker` function so build and parts never diverge. The island never sends `authorId`. After a successful save, if a `File` is selected, the island calls `uploadMainImage` with `createBrowserSupabaseClient()` and then an Action that writes `main_image_path` only. Re-save uses `update` on owned **drafts** only.

## Critical Implementation Details

**Atomic save.** `save_draft_build` must `INSERT` or `UPDATE` the `builds` row and replace `build_parts` in one function, deriving the author from `auth.uid()`. Do not accept `author_id` from the client. Keep `status` at `draft`; ignore any client status field. If `p_id` is set, require an owned **draft** (published rows are not found — S-09). Grant `EXECUTE` to `authenticated` only.

**Photo click path.** One Save Draft click: Action/RPC save → if `File`, `uploadMainImage` → Action `attachMainImage` (path only). Never persist `URL.createObjectURL` or a signed URL. Catch `MainImageUploadError`. If the browser client is `null` (missing `PUBLIC_SUPABASE_*`), show a safe upload error and leave the draft row saved.

**Existing photo after refresh.** Add optional `previewUrl` to `PhotoUpload` (local `File` still wins). `getOwnedDraft` issues an author-only `createSignedUrl` for display. Clearing the well and saving writes `main_image_path = null` and does **not** `Storage.delete` (orphans wait for S-08).

**Safe return-to.** Middleware may send anonymous `/account/*` users to `/auth/signin?redirect=…`. The sign-in POST may follow only a same-origin relative path that starts with `/` and does not start with `//`. Default remains `/`.

**Private responses.** Account create/edit responses use `Cache-Control: private, no-store`.

## Phase 1: Builds module, atomic save, and Actions

### Overview

Introduce `src/modules/builds`, domain validation, create/update/get/attach use cases, a `save_draft_build` migration, and `actions.builds.createDraft` / `update` / `attachMainImage` with session-derived actor. No form page yet.

### Changes Required:

#### 1. Atomic save function

**File**: `supabase/migrations/YYYYMMDDHHmmss_save_draft_build.sql` (timestamp from `npx supabase migration new`)

**Intent**: Persist a draft and its parts in one database command so a failed parts write cannot leave a half-saved build.

**Contract**: `security invoker` function, `search_path` empty, schema-qualified names. Arguments: optional `uuid` id (null = insert), typed/json payload for optional name, story, enums, `case_size_mm`, and parts `[{ category, name, product_url, price_amount_minor, currency, position }]`. Author = `auth.uid()`. On insert, `author_id` is the session user and `status` is `draft`. On update, `UPDATE … WHERE id = p_id AND author_id = auth.uid() AND status = 'draft'` then delete+insert parts for that id; zero rows → not found. Returns the build id. `REVOKE ALL` from `PUBLIC`/`anon`; `GRANT EXECUTE` to `authenticated`. Then `npm run db:types`.

#### 2. Domain validation and copy

**File**: `src/modules/builds/domain/*` (≥2 files: errors, draft input, validators, attribute/part/currency option lists)

**Intent**: Shape and invariant checks live outside Astro/Supabase so unit tests do not need a database.

**Contract**: Enforce F-01 limits: name ≤ 120, story ≤ 4000, `case_size_mm` 20–70 when set, part name ≤ 120, `product_url` ≤ 2048 and `http:`/`https:` only, price+currency both or neither, `price_amount_minor` ≥ 0 integer, `currency` in a fixed ISO-4217 allowlist (`USD`, `EUR`, `GBP`, `PLN`, `CHF`, `JPY`, `CAD`, `AUD`). Enums must match Postgres labels. Blank part rows (no category, name, url, or price) are dropped before validate; a started row needs category + name. Display labels come from `DOMAIN_DICTIONARY.md` (e.g. `nh35` → `NH35`). Empty draft (all optional fields unset, zero parts) is valid.

#### 3. Application use cases and store port

**File**: `src/modules/builds/application/*` and `application/ports/` (only because the use cases are unit-tested with a fake **and** the real RPC adapter exists)

**Intent**: Orchestrate validate → store. Actions and pages call these, not Supabase.

**Contract**: `createDraftBuild(actor, input) → { id }`; `updateDraftBuild(actor, id, input) → { id }`; `getOwnedDraft(actor, id) → draft | not found`; `attachMainImage(actor, id, path | null) → { id }` (null clears `main_image_path` without Storage.delete — Phase 3 attach surface landed with the Action). Unauthenticated → expected auth error. Store port talks in domain types, not `database.types.ts` rows. Do not set `published` / `published_at`. Fake store for Node tests; no Astro imports.

#### 4. Infrastructure adapter

**File**: `src/modules/builds/infrastructure/*`

**Intent**: Map the user-scoped Supabase client to the store port.

**Contract**: Call `save_draft_build` via `rpc` for create/update. `getOwnedDraft` selects the author’s draft by id (RLS) and maps parts ordered by `position`. `attachMainImage` updates `main_image_path` only on an owned draft. Map PostgREST/RPC failures to domain/application errors; never return raw Supabase messages. Path values must look like `{uuid}/{uuid}/main.{jpg|png|webp}` before write. Null path skips the pattern and writes `main_image_path = null` (no Storage.delete).

#### 5. Actions registry and actor

**File**: `src/actions/index.ts`, `src/modules/builds/server.ts`, Action grouping next to the server entry

**Intent**: First UI mutation boundary: validate untrusted JSON, resolve actor from `context.locals.user`, run a use case, return a safe result.

**Contract**: `export const server = { builds }` in `src/actions/index.ts` importing grouped actions from `@/modules/builds/server`. Use `defineAction` from `astro:actions` and `z` from `astro:schema` (do not add a separate Zod dependency). Actions: `createDraft`, `update`, `attachMainImage`. Handler must not read `authorId` from input. Anonymous → auth error. Expected failures: validation (field map), unauthenticated, not found (same message whether missing or not owned). No `publish` / `delete` actions.

#### 6. Identity-matrix coverage for the function

**File**: `tests/integration/save-draft-build.test.ts` (name may vary; keep under `tests/integration/`)

**Intent**: Prove the new RPC/RLS behaviour with the same three identities F-01 uses.

**Contract**: After `db reset`, author A can save a draft with parts; anon cannot execute/insert; user B cannot update A’s id; saved row stays `draft`. Reuse `tests/integration/helpers/supabase-identities.ts`. GitHub Actions still does not run this; local `npm run test:integration` is the merge gate with `db:types`.

### Success Criteria:

#### Automated Verification:

- New migration applies on a clean local reset and `npm run db:types` is committed
- Domain tests cover empty draft, length limits, case size bounds, URL scheme, price/currency pair, started vs blank part rows, enum/currency allowlists
- Use-case tests with a fake store cover unauthenticated, create, update owned draft, not-found for missing/other-user/published ids, attach path
- `src/actions/index.ts` re-exports grouped `builds` actions; handlers do not trust a client `authorId`
- `npm run test:integration` includes author A / anon / user B coverage for `save_draft_build`
- No publish/unpublish/delete Action exists
- `npm run lint` passes
- `npm run test` passes
- `npm run build` passes

#### Manual Verification:

- `npx supabase db reset` then `npm run test:integration` observed green on the local Docker stack
- A thrown RPC/validation error does not include a Supabase stack trace in the Action result shape used by the later island (inspect the mapped error object)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Gated create page and form island

### Overview

Compose the F-02 kit into one `BuildForm` island on `/account/builds/new` and `/account/builds/[id]/edit`, gate `/account`, add a Dashboard entry, wire Save/Discard without photo upload yet, and preserve values on validation errors.

### Changes Required:

#### 1. Routes, cache, and guards

**File**: `src/pages/account/builds/new.astro`, `src/pages/account/builds/[id]/edit.astro`, `src/middleware.ts`, `src/env.d.ts` if needed

**Intent**: Thin pages: parse params, require a session, load an owned draft for edit, set private cache headers, hydrate the island.

**Contract**: Middleware treats `/account` like `/dashboard` (unauthenticated → `/auth/signin` with safe `redirect`). `new.astro` does not insert a row. `edit.astro` calls `getOwnedDraft`; missing/not-owned/published → `404` (do not reveal another user’s draft). `Cache-Control: private, no-store`. Pages import use cases from `@/modules/builds/server` only. Add eslint import restrictions for `@/modules/*/infrastructure` after the entrypoints exist (AGENTS.md).

#### 2. Dashboard entry and sign-in return

**File**: `src/pages/dashboard.astro`, `src/pages/api/auth/signin.ts`, `src/pages/auth/signin.astro` / `SignInForm` as needed

**Intent**: Logged-in users can find create; hitting a gated URL while logged out returns them after password sign-in.

**Contract**: Dashboard keeps its stub copy and adds a “New build” control linking to `/account/builds/new`. Sign-in POST accepts `redirect` only when it is a relative path starting with `/` and not `//`; otherwise `/`. Hidden field or query round-trip is fine. Topbar Account can stay on `/dashboard` (S-08 owns a real account list).

#### 3. BuildForm island

**File**: `src/modules/builds/presentation/build-form.tsx` and `src/modules/builds/index.ts` (browser-safe exports: form, option lists, types — no `server`)

**Intent**: One hydrated island owns form state and calls Actions. Compose Field, Input, Textarea, OptionsSelect, PartsRow, StickyActionBar, Button — do not copy auth `FormField`.

**Contract**: Fields: name, story, watch style, movement, dial colour, strap type, hands style, case size, repeating parts (category, name, url, price, currency), Add part (starts at zero rows), Discard, Save Draft. Optional selects include `{ value: "", label: "Not set" }`. Price is a decimal string in the UI; convert to minor units in domain/application before the Action. Sticky bar: status (idle / saving / saved / error), outline Discard, primary Save Draft disabled while pending. `client:load` (or equivalent) only on this island. After successful create, `history.replaceState` to `/account/builds/[id]/edit` without losing in-memory state. Re-save calls `update` with that id. Discard restores the last successful snapshot (or the SSR initial draft / empty create). Preserve submitted values when validation returns field errors. Loading, empty (new form), success, validation, auth, and unexpected errors are all visible. No Publish button. No preview card.

#### 4. Form tests

**File**: `src/modules/builds/presentation/build-form.test.tsx`

**Intent**: Lock the client contract without Playwright.

**Contract**: jsdom tests: Save sends create when there is no id; after a create result, a second Save sends update; Discard restores snapshot; field errors render and inputs keep values; Add part appends a row; blank extra row does not have to be asserted against the network if the island strips it before the Action. Mock `astro:actions`. Do not import `@/modules/builds/server`.

### Success Criteria:

#### Automated Verification:

- `/account/builds/new` and `/account/builds/[id]/edit` exist; pages do not query Supabase directly
- Middleware redirects anonymous `/account` requests to sign-in; sign-in only follows a safe relative `redirect`
- `BuildForm` composes the shared kit (no new Field primitive, no auth `FormField`)
- jsdom tests cover create vs update, Discard snapshot, validation preserve, Add part
- Browser-safe `index.ts` does not import `astro:env/server` or `server.ts`
- `npm run lint` passes
- `npm run test` passes
- `npm run build` passes

#### Manual Verification:

- Logged-out visit to `/account/builds/new` lands on sign-in and, after login, returns to the create form
- Empty Save Draft succeeds, URL gains the id, a second Save still works
- Invalid URL / price-without-currency / case size 19 show field errors and keep values
- Form is usable at ~390px and desktop: parts stack vs columns, sticky bar reachable
- User B opening `/account/builds/{A's id}/edit` while logged in as B sees not-found, not A’s fields
- No Publish / Unpublish control is visible

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Main photo attach and draft preview

### Overview

Sequence Storage upload after save, persist `main_image_path`, preview an existing draft photo via signed URL, and cover the remaining form/photo states. Extra gallery photos stay parked.

### Changes Required:

#### 1. PhotoUpload persisted preview

**File**: `src/components/ui/photo-upload.tsx` (+ stories/tests)

**Intent**: After refresh, the well can show the stored main photo without a local `File`.

**Contract**: Optional `previewUrl?: string | null`. When `file` is set, local object-URL preview wins. When `file` is null and `previewUrl` is set, show that image with the same choose/remove controls. Remove still calls `onFileChange(null)` (parent decides whether the next save clears the path). Stories stay Storage-free (pass a static data URL or fixture). Do not fetch Storage from the well.

#### 2. Island upload then attach

**File**: `src/modules/builds/presentation/build-form.tsx`, `getOwnedDraft` mapping

**Intent**: One Save click attaches a valid file; reload shows the stored image to the author only.

**Contract**: After create/update succeeds, if a `File` is present: `createBrowserSupabaseClient()` + `uploadMainImage` + `attachMainImage` with the returned `path` (pass `previousPath` on replace). If the user cleared the well (`file === null` and they had a path), Save calls attach/update with `null` path and skips Storage.delete. `getOwnedDraft` adds `mainImageUrl` from `createSignedUrl` only after the row is an owned draft; never write that URL to the database. If public env is missing, the draft still saves and the photo error is explicit. Hosted CORS remains an operator step (`deployment.md`); do not add a Worker proxy.

#### 3. Photo-related tests

**File**: `src/modules/builds/presentation/build-form.test.tsx`, `src/components/ui/photo-upload.test.tsx`

**Intent**: Cover sequencing without a live bucket in unit/jsdom tests.

**Contract**: Mock upload helper: successful save with a File calls upload then attach; validation/storage helper errors surface in the bar/field and do not invent a path; save with no File does not call upload. PhotoUpload tests: `previewUrl` renders when `file` is null. No new Storage RLS policies. Optional: if local Supabase is up, existing F-01 Storage tests still pass — skip if the stack is down.

### Success Criteria:

#### Automated Verification:

- `PhotoUpload` accepts optional `previewUrl`; local `File` still wins
- Form tests: File present → upload then attach; no File → no upload; helper error does not persist a path
- `getOwnedDraft` exposes a signed display URL and never stores it as `main_image_path`
- Clear-and-save writes a null path without calling Storage.delete
- `npm run lint` passes
- `npm run test` passes
- `npm run build` passes

#### Manual Verification:

- Choose a jpeg/png/webp ≤ 5 MiB, Save Draft, refresh `/account/builds/[id]/edit`: the well shows the stored image
- Replace with another allowed type (ext change) still previews after reload
- Remove + Save: well empty after reload; draft row remains
- Rejected file (too big / wrong type) never becomes `main_image_path`
- Anonymous and user B still cannot download A’s draft object (spot-check existing F-01 behaviour or the Storage tests)
- Phone and desktop: well, choose, and sticky save remain usable
- Remaining look gaps vs `build-form-reference.png` (torn paper, “YOUR BUILD” card, chalkboard stamps) are listed in `change.md`, not forced

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- Draft validators: empty OK; max lengths; case size 20–70; URL scheme; price/currency pair; blank vs started parts; enum/currency allowlists
- Use cases with fake store: auth, create, update, not-found, attach
- `uploadMainImage` remains covered by existing `src/lib/upload-main-image.test.ts` (do not weaken `MainImageUploadError` wrapping of bad path segments)

### Integration Tests:

- New `save_draft_build` identity matrix (A / anon / B) plus status stays `draft`
- Existing F-01 RLS/Storage tests still pass when the local stack is running
- No catalog-query tests (S-04)

### Component Tests:

- `BuildForm` create vs update, Discard, validation preserve, Add part, photo sequence mocks
- `PhotoUpload` `previewUrl` branch

### Manual Testing Steps:

1. Sign in, Dashboard → New build, save an empty draft, confirm URL id and sticky “saved”
2. Add attributes + one part + photo, save, refresh, confirm data and image
3. Discard after dirtying fields restores last saved
4. Open the draft URL as another user → not found
5. Repeat the happy path at ~390px width

## Performance Considerations

One island, short form, small parts list. No virtualization, no client store, no extra hydration. Signed URLs are display-only and short-lived; do not cache account responses.

## Migration Notes

One forward migration for `save_draft_build` only. Hosted `npx supabase db push` stays an operator step separate from Worker deploy (same as F-01). `npm run db:types` must be committed. No change to the publication state machine or Storage policies.

## References

- PRD: `context/foundation/prd.md` (US-02, FR-003, FR-004, FR-005)
- Roadmap S-02: `context/foundation/roadmap.md`
- Modules / security / data model / runtime / testing: `context/foundation/architecture/`
- OPERATIONAL_SAFETY §§3, 6, 8, 9, 10, 14
- F-01 archive: `context/archive/2026-09-09-build-visibility-and-storage/`
- F-02 archive: `context/archive/2026-09-11-authoring-form-components/`
- F-03 archive: `context/archive/2026-09-12-photo-upload-component/`
- Kit: `src/components/ui/{field,input,textarea,options-select,parts-row,sticky-action-bar,photo-upload}.tsx`
- Upload: `src/lib/upload-main-image.ts`, `src/lib/supabase-browser.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Builds module, atomic save, and Actions

#### Automated

- [x] 1.1 New migration applies on a clean local reset and `npm run db:types` is committed — d582189
- [x] 1.2 Domain tests cover empty draft, length limits, case size bounds, URL scheme, price/currency pair, started vs blank part rows, enum/currency allowlists — d582189
- [x] 1.3 Use-case tests with a fake store cover unauthenticated, create, update owned draft, not-found for missing/other-user/published ids, attach path — d582189
- [x] 1.4 `src/actions/index.ts` re-exports grouped `builds` actions; handlers do not trust a client `authorId` — d582189
- [x] 1.5 `npm run test:integration` includes author A / anon / user B coverage for `save_draft_build` — d582189
- [x] 1.6 No publish/unpublish/delete Action exists — d582189
- [x] 1.7 `npm run lint` passes — d582189
- [x] 1.8 `npm run test` passes — d582189
- [x] 1.9 `npm run build` passes — d582189

#### Manual

- [x] 1.10 `npx supabase db reset` then `npm run test:integration` observed green on the local Docker stack — d582189
- [x] 1.11 A thrown RPC/validation error does not include a Supabase stack trace in the Action result shape used by the later island (inspect the mapped error object) — d582189

### Phase 2: Gated create page and form island

#### Automated

- [ ] 2.1 `/account/builds/new` and `/account/builds/[id]/edit` exist; pages do not query Supabase directly
- [ ] 2.2 Middleware redirects anonymous `/account` requests to sign-in; sign-in only follows a safe relative `redirect`
- [ ] 2.3 `BuildForm` composes the shared kit (no new Field primitive, no auth `FormField`)
- [ ] 2.4 jsdom tests cover create vs update, Discard snapshot, validation preserve, Add part
- [ ] 2.5 Browser-safe `index.ts` does not import `astro:env/server` or `server.ts`
- [ ] 2.6 `npm run lint` passes
- [ ] 2.7 `npm run test` passes
- [ ] 2.8 `npm run build` passes

#### Manual

- [ ] 2.9 Logged-out visit to `/account/builds/new` lands on sign-in and, after login, returns to the create form
- [ ] 2.10 Empty Save Draft succeeds, URL gains the id, a second Save still works
- [ ] 2.11 Invalid URL / price-without-currency / case size 19 show field errors and keep values
- [ ] 2.12 Form is usable at ~390px and desktop: parts stack vs columns, sticky bar reachable
- [ ] 2.13 User B opening `/account/builds/{A's id}/edit` while logged in as B sees not-found, not A’s fields
- [ ] 2.14 No Publish / Unpublish control is visible

### Phase 3: Main photo attach and draft preview

#### Automated

- [ ] 3.1 `PhotoUpload` accepts optional `previewUrl`; local `File` still wins
- [ ] 3.2 Form tests: File present → upload then attach; no File → no upload; helper error does not persist a path
- [ ] 3.3 `getOwnedDraft` exposes a signed display URL and never stores it as `main_image_path`
- [ ] 3.4 Clear-and-save writes a null path without calling Storage.delete
- [ ] 3.5 `npm run lint` passes
- [ ] 3.6 `npm run test` passes
- [ ] 3.7 `npm run build` passes

#### Manual

- [ ] 3.8 Choose a jpeg/png/webp ≤ 5 MiB, Save Draft, refresh `/account/builds/[id]/edit`: the well shows the stored image
- [ ] 3.9 Replace with another allowed type (ext change) still previews after reload
- [ ] 3.10 Remove + Save: well empty after reload; draft row remains
- [ ] 3.11 Rejected file (too big / wrong type) never becomes `main_image_path`
- [ ] 3.12 Anonymous and user B still cannot download A’s draft object (spot-check existing F-01 behaviour or the Storage tests)
- [ ] 3.13 Phone and desktop: well, choose, and sticky save remain usable
- [ ] 3.14 Remaining look gaps vs `build-form-reference.png` (torn paper, “YOUR BUILD” card, chalkboard stamps) are listed in `change.md`, not forced
