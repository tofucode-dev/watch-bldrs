# Photo Upload Component Implementation Plan

## Overview

Add a Main Photo well to the shared UI kit and a browser Storage helper that uploads one jpeg/png/webp file (max 5 MiB) to the private `build-images` bucket and returns `{ path }`. S-02 still creates the draft row and writes `builds.main_image_path`. Extra gallery photos stay parked.

## Current State Analysis

F-01 already locked the persistence and privacy contract: private `build-images` bucket, path-only `builds.main_image_path`, Storage RLS that hides objects until the matching build is `published`, and integration tests that prove create-row-before-upload plus author upsert (`supabase/migrations/20260910201541_build_visibility_and_storage.sql`, `tests/integration/build-image-storage.test.ts`). There is **no application upload code**, no browser Supabase client, and no photo primitive. `Input` only has stock shadcn `file:` styles.

F-02 shipped domain-free Build Form widgets in `src/components/ui` (Field, Input, OptionsSelect, PartsRow, StickyActionBar) and left the dashed MAIN PHOTO well to this slice. Visual target: `context/changes/photo-upload-component/build-form-reference.png`. Design-system board region “Photo upload well” is owned here (`context/foundation/design-system.md`).

Architecture forbids proxying image bytes through the Worker. Catalog reads and build **row** mutations go through SSR/Actions; **bytes** go browser → Supabase Storage with the user JWT (`context/foundation/architecture/runtime.md`). `SUPABASE_KEY` is already the anon/publishable key (`README.md`); the env schema currently marks it `context: "server"` only (`astro.config.mjs`).

## Desired End State

S-02 can compose:

- `PhotoUpload` from `@/components/ui` — empty dashed well, local object-URL preview after a valid File, clear back to empty, drag-and-drop and Choose image, client validation errors
- `uploadMainImage` — given a Storage client, author id, build id, File, and optional previous path, uploads to `{authorId}/{buildId}/main.{ext}` with `upsert: true`, deletes the previous key when the extension changes, returns `{ path }` (never a URL)
- `createBrowserSupabaseClient` — cookie-session browser client using the publishable URL+key, for S-02 islands to pass into the helper

Verification: Node tests for magic-bytes/size/path/replace; jsdom tests for empty/selected/error/clear/a11y; Storybook Empty/Selected/Invalid/Phone; lint/test/build pass; no live editor page.

### Key Discoveries:

- Shared kernel vs module: keep the well in `src/components/ui`; do not scaffold `src/modules/builds`. Storage I/O for this slice lives in `src/lib` so S-02 can move it into `builds` infrastructure when that module exists (`context/foundation/architecture/modules.md`).
- F-02 pattern to copy: `cn()`, `data-slot`, colocated `*.stories.tsx` titled `UI/…`, jsdom `*.test.tsx`, Node `*.test.ts` for pure helpers (`options-select-mapping.ts`).
- Storybook is local Vite (`.storybook/main.ts`), not `workerd`. Stories that import `astro:env/client` will break.
- Path CHECK only requires `{author_id}/{id}/…` (`migration` L79-85). Helper still generates `main.{ext}` to match F-01 tests and comments.
- Bucket already enforces 5 MiB and `image/jpeg|png|webp`. Client magic-bytes are still required (`OPERATIONAL_SAFETY.md` §10). Dimension cap and EXIF strip wait for a processing step.
- `lucide-react` is already a dependency; auth/UI use named icons (`TrashIcon`, `Mail`). Use `Camera` for the empty well.
- Existing `createClient` + `supabase.test.ts` mock `astro:env/server`. Do not break that path when adding browser-public env fields.

## What We're NOT Doing

- Creating a draft row, writing `builds.main_image_path`, or adding Astro Actions (S-02)
- A committed `/dev` harness or create-build page
- Scaffolding `src/modules/builds`
- Proxying file bytes through Cloudflare Workers
- Signed upload URLs (`createSignedUploadUrl`)
- Extra gallery photos, `storage.list()` as a gallery, or a public-bucket move
- Catalog/details signed **read** URLs (S-04 / S-06); draft signed preview URLs
- Dimension cap, decompression-bomb decode limits, or EXIF/location strip
- Storage.delete on clear; delete-build / abandoned-draft orphan cleanup (S-02 / S-08)
- New Storage RLS, bucket settings, or schema
- Playwright / E2E; new `tests/integration` cases unless a policy actually changes (it must not)
- `react-hook-form`, shadcn `Form`, migrating auth `FormField`
- Unpublish UI

## Implementation Approach

Two increments, same split as F-02 (kit first, wiring second):

1. Presentational well + shared file validation (size, MIME allowlist, magic-bytes) with Storybook and tests. No Supabase.
2. Browser client factory + `uploadMainImage` helper (RLS-backed `storage.upload`, ext-change delete), public env fields for the publishable pair, operator CORS note.

`PhotoUpload` never calls Storage. S-02 sequences: insert draft → (optional) `uploadMainImage` → Action persists the returned path.

## Critical Implementation Details

**Storybook vs `astro:env`.** `PhotoUpload`, its stories, and `src/lib/main-image-file.ts` must not import `@supabase/ssr`, `astro:env/client`, or `astro:env/server`. Only `src/lib/supabase-browser.ts` (and tests that mock it) reads client env. Storybook already aliases `@` to `src` and only loads `src/components/ui/**/*.stories.tsx`.

**Replace order.** On extension change, upload the new `main.{ext}` first, then `remove` the previous key. Deleting first can lose the only copy if the new upload fails. Same-extension replace is `upsert: true` only — do not `remove` the key you just wrote.

**Object URLs.** Preview uses `URL.createObjectURL`. Revoke the previous URL when the File changes, on clear, and on unmount. Never put that string (or a signed URL) in helper output or in a form field S-02 might persist.

**Canonical extension.** Map `image/jpeg` → `jpg`, `image/png` → `png`, `image/webp` → `webp`. Do not keep the original filename. If `file.type` is present and disagrees with the detected signature, reject. Storage `contentType` is always the detected `mime`, never `file.type`.

**Publishable key only.** `SUPABASE_KEY` is the anon key (`README.md`). Browser factory must use a client-public schema field that operators set to that same anon value. Never add a service-role key to `astro:env/client`, Storybook, or logs.

## Phase 1: Photo well and file validation

### Overview

Ship the dashed MAIN PHOTO well and a pure validator that enforces 5 MiB, jpeg/png/webp, and magic-bytes. Stories and jsdom tests cover empty, selected, invalid, clear, and phone width. No Storage, no env schema change.

### Changes Required:

#### 1. Shared file rules

**File**: `src/lib/main-image-file.ts`, `src/lib/main-image-file.test.ts`

**Intent**: One place for size, MIME, signatures, and `main.{ext}` path so the well and the later helper cannot drift.

**Contract**: Export `MAIN_IMAGE_MAX_BYTES = 5242880`, an allowlist matching the bucket (`image/jpeg`, `image/png`, `image/webp`), `validateMainImageFile(file)` as **async** (`File.slice().arrayBuffer()` on header bytes only — not the whole File), and `buildMainImagePath(authorId, buildId, ext)`. Detect JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), WEBP (`RIFF` at 0 and `WEBP` at 8). Return `Promise<{ ok: true; mime: "image/jpeg" | "image/png" | "image/webp" } | { ok: false; reason: "empty" | "oversize" | "type" | "signature" }>`. The UI turns `reason` into a short message; callers that upload use `mime` as Storage `contentType`. No `astro:env`, no Storage. Node tests: accept minimal jpeg/png/webp fixtures; reject empty, 5 MiB + 1, `image/jpeg` with PNG bytes, and `text/plain`. Await the validator in tests.

#### 2. PhotoUpload well

**File**: `src/components/ui/photo-upload.tsx`

**Intent**: Domain-free well S-02 places next to F-02 fields. It picks at most one image, previews it locally, and can clear it.

**Contract**: PhotoUpload is the **control**, like `Input` — do not wrap it in `Field` / `FieldLabel` / `FieldError` internally. Callers (stories, later S-02) compose `Field` + label + well + `FieldError`. Props: `file: File | null`, `onFileChange(file: File | null)`, optional `id`, `error` (parent/upload message: set `aria-invalid` on the well, do **not** render `role="alert"` — callers compose `FieldError`), `disabled`. Hidden `<input type="file" accept="image/jpeg,image/png,image/webp">` plus outline `Button` “Choose image”, drag-and-drop on the well, `data-slot="photo-upload"`. Empty copy from the mockup: camera icon, “ONE IMAGE ONLY”, “JPEG / PNG / WEBP”, “MAX 5 MB”, “or drag and drop”. Dashed chrome: `border-dashed` + `--border` / `--input` (only existing precedent is `Welcome.astro`, not a kit primitive). Selected: `<img>` from `URL.createObjectURL(file)` with a stable alt, plus a way to choose a different image and a Remove control. Await `validateMainImageFile` in change and drop handlers before calling `onFileChange`; on failure keep the previous `file` and show a well-internal `role="alert"` (the only `alert` inside PhotoUpload). Merge classes with `cn()`. Do not call Storage.

#### 3. Stories

**File**: `src/components/ui/photo-upload.stories.tsx`

**Intent**: Visual board for the well without a bucket.

**Contract**: Title `UI/PhotoUpload`. Stories: Empty, Selected (local `File` + object URL), Invalid (`Field` + `data-invalid` + `FieldError` for a parent/upload message; do not also pass `error` as a second live `alert` — well-internal validation is a separate story beat or shown without wrapping `FieldError`), Phone (container `w-80` / ~390px, same as `Field` decorator / `PartsRow` PhoneStacked). Use `fn()` for `onFileChange`. No Supabase imports.

#### 4. Component tests

**File**: `src/components/ui/photo-upload.test.tsx`

**Intent**: Prove pick / reject / preview / clear / a11y in jsdom.

**Contract**: Empty well: Choose image is keyboard-reachable; file input has the accept list. Valid drop or change awaits validation then calls `onFileChange` with that File. Oversize or bad type does not call `onFileChange` with that File and shows `role="alert"`. Selected + Remove calls `onFileChange(null)`. Parent `error` sets `aria-invalid` on the well and does not add a second `role="alert"`. Polyfill `URL.createObjectURL` / `revokeObjectURL` in this file (or `src/test/setup.ts`) — jsdom 29 leaves them undefined; `src/test/setup.ts` currently only loads `@testing-library/jest-dom/vitest`. Still revoke on change/clear/unmount per Critical Implementation Details. Do not assert computed drag-over colors; optional `data-` hook for drag-over is enough if used. No Playwright.

### Success Criteria:

#### Automated Verification:

- `validateMainImageFile` accepts jpeg/png/webp fixtures and rejects empty, oversize, and MIME/signature mismatch
- `buildMainImagePath` returns `{authorId}/{buildId}/main.{jpg|png|webp}`
- `PhotoUpload` empty well exposes Choose image and a hidden file input with the image accept list
- Valid File via change or drop calls `onFileChange`; invalid picks do not replace the current file
- Selected state renders a preview image; Remove calls `onFileChange(null)`
- `UI/PhotoUpload` stories exist for Empty, Selected, Invalid, and Phone
- `PhotoUpload`, its stories, and `main-image-file` import neither Supabase nor `astro:env`
- No `src/modules/builds`, no Actions, no `/dev` route, no `react-hook-form`
- `npm run lint` passes
- `npm run test` passes
- `npm run build` passes

#### Manual Verification:

- Storybook Empty well matches the mockup simply: dashed well, camera, one-image copy, Choose image, drag hint — desktop and ~390px
- Keyboard: tab to Choose image, activate the picker; Remove is reachable when a file is selected
- Drag-and-drop of a valid image shows the local preview; an invalid drop leaves empty (or previous) and shows an alert
- Remaining look gaps vs `build-form-reference.png` are written down, not forced

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Browser client and upload helper

### Overview

Add a cookie-session browser Supabase client (publishable key only) and `uploadMainImage`, which uploads under RLS and returns a storage path. Document Storage CORS. Still no draft insert, no Action, no create page.

### Changes Required:

#### 1. Client-public env fields

**File**: `astro.config.mjs`, `.env.example`, `README.md`, `AGENTS.md`

**Intent**: Let the browser factory read the same anon pair operators already set, without putting a secret/service-role key in the client bundle.

**Contract**: Keep existing `SUPABASE_URL` / `SUPABASE_KEY` as server fields so `src/lib/supabase.ts` and `src/lib/supabase.test.ts` stay valid. Add optional `context: "client", access: "public"` aliases (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY`) documented as copies of the anon URL+key. `.env.example` and README say they must match `SUPABASE_`* and must never be the service-role key. Do not change CI secrets in this slice (fields are optional). `PUBLIC_SUPABASE_*` are GitHub Actions / `.env` **build-time** values — `astro:env` public client fields are inlined at `astro build`. Never `wrangler secret put` them; never add them to `wrangler.jsonc` `secrets.required` (those stores do not reach the browser bundle). Update the `AGENTS.md` env-schema sentence to name both the server pair and these optional public aliases. S-02 prerequisite: production upload needs `PUBLIC_SUPABASE_`* set as GitHub Actions build secrets (same anon pair) or `createBrowserSupabaseClient()` stays `null`. `npx astro sync` must succeed.

#### 2. Browser client factory

**File**: `src/lib/supabase-browser.ts`, `src/lib/supabase-browser.test.ts`

**Intent**: One factory S-02 islands call so they do not invent cookie-client wiring.

**Contract**: `createBrowserSupabaseClient()` uses `createBrowserClient` from `@supabase/ssr` with `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_KEY` from `astro:env/client`. Return `null` when either is missing (same posture as server `createClient`). Do not accept a service-role key parameter. Node tests mock `astro:env/client` and `@supabase/ssr` the way `supabase.test.ts` mocks the server module.

#### 3. Upload helper

**File**: `src/lib/upload-main-image.ts`, `src/lib/upload-main-image.test.ts`

**Intent**: The “upload logic returns a reference” half of the F-03 outcome. Bytes go to Storage; the return value is a path.

**Contract**: `uploadMainImage({ client, file, authorId, buildId, previousPath }): Promise<{ path: string }>`. Await `validateMainImageFile`; on `{ ok: false }` throw a small typed error (`MainImageUploadError` with `code: "validation"`). On success, `path = buildMainImagePath(...)` using the canonical ext from `mime`, then `client.storage.from("build-images").upload(path, file, { contentType: mime, upsert: true })` — `contentType` is the detected signature (`image/jpeg|png|webp`), never `file.type` (which may be empty after the “if type is present and disagrees, reject” rule). Storage failure throws `MainImageUploadError` with `code: "storage"` (no raw Supabase message). On success, if `previousPath` is set and differs from `path`, `remove([previousPath])` — failures of that delete must not discard the new `{ path }` (log-safe message only; no tokens). Never return a signed URL or object URL. Inject `client` (do not construct it inside the helper) so tests fake `upload`/`remove`. Cases: happy path returns `{ path }`; validation failure skips Storage and rejects; upload error skips delete and rejects; same-ext `previousPath` does not remove; different-ext removes after successful upload.

#### 4. Operator CORS note

**File**: `context/foundation/deployment.md`

**Intent**: Browser upload to hosted Storage fails closed without CORS; this is an operator step, not application code.

**Contract**: Expand the existing one-liner (deployment.md around the Storage CORS sentence) to name origins: the `workers.dev` site origin and local `http://127.0.0.1:4321`. In the same file, add a third row to the **Secrets: two stores** table: `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY` live in GitHub Actions / `.env` for `astro build` only (anon pair), never Worker runtime, never `wrangler secret put`, never `secrets.required`. Do not add a Cloudflare Images pipeline or a second bucket.

### Success Criteria:

#### Automated Verification:

- `createBrowserSupabaseClient` returns null when public env is missing and constructs `createBrowserClient` with the public URL+key when present
- Existing `src/lib/supabase.test.ts` still passes (server `astro:env/server` path unchanged)
- `uploadMainImage` returns `{ path }` shaped `{authorId}/{buildId}/main.{ext}` and never a URL
- Same-ext replace upserts only; ext change uploads then deletes the old key; failed upload does not delete
- Helper awaits `validateMainImageFile` before Storage; `contentType` is the detected mime; validation/storage failures throw `MainImageUploadError`
- No Actions, no draft insert, no `main_image_path` write, no new migrations or Storage policies
- `PhotoUpload` still does not import the browser client
- `npm run lint` passes
- `npm run test` passes`PUBLIC_SUPABASE`
- `npm run build` passes

#### Manual Verification:

- `deployment.md` names Storage CORS origins for `workers.dev` and `http://127.0.0.1:4321`, and documents `PUBLIC_SUPABASE_*` as GitHub Actions / `.env` build-time values (not Worker secrets)
- `AGENTS.md` env-schema sentence names the optional `PUBLIC_SUPABASE_*` aliases
- `npm run storybook` still loads `UI/PhotoUpload` without PUBLIC_ Supabase env
- Optional: if local Supabase is up, `npm run test:integration` still passes — F-01 RLS matrix is unchanged. Skip if the stack is not running; do not add new integration cases in this slice

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- `main-image-file`: signatures, size, MIME mismatch, path shape, canonical `jpg|png|webp`
- `PhotoUpload`: empty a11y, valid pick/drop, invalid pick, selected preview, clear, parent `error` sets `aria-invalid`
- `supabase-browser`: null vs constructed client; mocks only
- `upload-main-image`: validate-before-upload, path, `contentType` from detected mime, upsert options, ext-change delete ordering, validation/storage throw codes, upload failure

### Integration Tests:

- None new. Treat `tests/integration/build-image-storage.test.ts` as the frozen RLS contract. Do not weaken it.

### Manual Testing Steps:

1. `npm run storybook` → `UI/PhotoUpload`: Empty, Selected, Invalid, Phone. Paper / Ink toolbar still works.
2. At ~390px: well remains tappable; Choose image and Remove are not clipped.
3. At desktop: well sits in a right-column-sized container (~the mockup MAIN PHOTO cell) without overflowing.
4. Keyboard-only through Choose image, file chooser cancel (state unchanged), valid pick, Remove.
5. Compare to `context/changes/photo-upload-component/build-form-reference.png`. Write remaining look gaps (torn-paper page chrome, “YOUR BUILD” preview card) as accepted; do not build those here.
6. After Phase 2: confirm Storybook still runs without a bucket.

## Performance Considerations

One ≤ 5 MiB file. Read magic-bytes from a header slice, not `file.arrayBuffer()` of the whole image, before accepting. No TUS/resumable upload. No client store; S-02 will hydrate a small island later. Do not route bytes through the Worker.

## Migration Notes

No database migration. No `npm run db:types`. Operators will set `PUBLIC_SUPABASE_*` to the existing anon pair as **build-time** GitHub Actions / `.env` values before S-02 can upload from a browser; F-03 ships the schema and docs. Do not put them in Worker secrets — `wrangler secret put` does not reach the client bundle. Hosted Storage CORS remains a dashboard step.

## References

- Related research: `context/changes/photo-upload-component/research.md`
- Visual target: `context/changes/photo-upload-component/build-form-reference.png`
- Design system: `context/foundation/design-system.md`
- Roadmap F-03: `context/foundation/roadmap.md`
- F-02 pattern: `src/components/ui/parts-row.tsx`, `src/components/ui/field.tsx`
- Storage contract: `supabase/migrations/20260910201541_build_visibility_and_storage.sql`
- RLS tests: `tests/integration/build-image-storage.test.ts`
- Server client: `src/lib/supabase.ts`
- Runtime exception: `context/foundation/architecture/runtime.md`
- Image rules: `context/foundation/OPERATIONAL_SAFETY.md` §10
- Prior change: `context/archive/2026-09-11-authoring-form-components/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append  `— <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Photo well and file validation

#### Automated

- [x] 1.1 `validateMainImageFile` accepts jpeg/png/webp fixtures and rejects empty, oversize, and MIME/signature mismatch — e0cba8a
- [x] 1.2 `buildMainImagePath` returns `{authorId}/{buildId}/main.{jpg|png|webp}` — e0cba8a
- [x] 1.3 `PhotoUpload` empty well exposes Choose image and a hidden file input with the image accept list — e0cba8a
- [x] 1.4 Valid File via change or drop calls `onFileChange`; invalid picks do not replace the current file — e0cba8a
- [x] 1.5 Selected state renders a preview image; Remove calls `onFileChange(null)` — e0cba8a
- [x] 1.6 `UI/PhotoUpload` stories exist for Empty, Selected, Invalid, and Phone — e0cba8a
- [x] 1.7 `PhotoUpload`, its stories, and `main-image-file` import neither Supabase nor `astro:env` — e0cba8a
- [x] 1.8 No `src/modules/builds`, no Actions, no `/dev` route, no `react-hook-form` — e0cba8a
- [x] 1.9 `npm run lint` passes — e0cba8a
- [x] 1.10 `npm run test` passes — e0cba8a
- [x] 1.11 `npm run build` passes — e0cba8a

#### Manual

- [x] 1.12 Storybook Empty well matches the mockup simply: dashed well, camera, one-image copy, Choose image, drag hint — desktop and ~390px — e0cba8a
- [x] 1.13 Keyboard: tab to Choose image, activate the picker; Remove is reachable when a file is selected — e0cba8a
- [x] 1.14 Drag-and-drop of a valid image shows the local preview; an invalid drop leaves empty (or previous) and shows an alert — e0cba8a
- [x] 1.15 Remaining look gaps vs `build-form-reference.png` are written down, not forced — e0cba8a

### Phase 2: Browser client and upload helper

#### Automated

- [x] 2.1 `createBrowserSupabaseClient` returns null when public env is missing and constructs `createBrowserClient` with the public URL+key when present
- [x] 2.2 Existing `src/lib/supabase.test.ts` still passes (server `astro:env/server` path unchanged)
- [x] 2.3 `uploadMainImage` returns `{ path }` shaped `{authorId}/{buildId}/main.{ext}` and never a URL
- [x] 2.4 Same-ext replace upserts only; ext change uploads then deletes the old key; failed upload does not delete
- [x] 2.5 Helper awaits `validateMainImageFile` before Storage; `contentType` is the detected mime; validation/storage failures throw `MainImageUploadError`
- [x] 2.6 No Actions, no draft insert, no `main_image_path` write, no new migrations or Storage policies
- [x] 2.7 `PhotoUpload` still does not import the browser client
- [x] 2.8 `npm run lint` passes
- [x] 2.9 `npm run test` passes
- [x] 2.10 `npm run build` passes

#### Manual

- [x] 2.11 `deployment.md` names Storage CORS origins for `workers.dev` and `http://127.0.0.1:4321`, and documents `PUBLIC_SUPABASE_*` as GitHub Actions / `.env` build-time values (not Worker secrets)
- [x] 2.12 `AGENTS.md` env-schema sentence names the optional `PUBLIC_SUPABASE_*` aliases
- [x] 2.13 `npm run storybook` still loads `UI/PhotoUpload` without PUBLIC_ Supabase env
- [x] 2.14 Optional: if local Supabase is up, `npm run test:integration` still passes — F-01 RLS matrix is unchanged