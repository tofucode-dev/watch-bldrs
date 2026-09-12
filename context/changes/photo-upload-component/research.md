---
date: "2026-09-12T12:43:42+02:00"
researcher: Cursor Grok
git_commit: 2d024278943244d9228621587513265f8cc16731
branch: main
repository: tofucode-dev/watch-bldrs
topic: "F-03 Photo upload component — browser to BFF to Storage/DB, private until published"
tags:
  [
    research,
    codebase,
    storage,
    supabase,
    bff,
    actions,
    rls,
    ui,
    f-03,
  ]
status: complete
last_updated: "2026-09-12"
last_updated_by: Cursor Grok
---

# Research: F-03 Photo upload — browser → BFF → Storage/DB (private until published)

**Date**: 2026-09-12T12:43:42+02:00
**Researcher**: Cursor Grok
**Git Commit**: 2d024278943244d9228621587513265f8cc16731
**Branch**: main
**Repository**: tofucode-dev/watch-bldrs

## Research Question

How should WatchBldrs implement the main-photo upload flow from the browser through the Astro BFF to the rest of the stack (Postgres + Storage bucket), while keeping draft images private until the build is published?

## Summary

F-01 already landed the persistence contract. There is **no application upload code yet**. The locked privacy model is a **private** `build-images` bucket, path-only `builds.main_image_path`, and RLS that hides objects until the matching build is `published`.

The flow is **not** “proxy the file bytes through Cloudflare Workers.” Architecture carves out an explicit exception: catalog reads and build **row** mutations go through the BFF; **image bytes** go browser → Supabase Storage with the user JWT, and Storage RLS is the authorization boundary. The BFF still owns (1) creating the draft row before upload can succeed, (2) persisting the object path, and (3) minting short-lived signed **read** URLs after publication.

Recommended compose sequence:

```
S-02 Action  INSERT builds (draft, author = session)
     → F-03  browser Storage.upload('build-images', '{uid}/{buildId}/main.{ext}')
     → F-03  return path string (never a signed URL)
     → S-02 Action  UPDATE builds.main_image_path = path
     → later S-03   publish
     → later catalog SSR  createSignedUrl after status = published
```

F-03 owns the **control + upload logic + returned path**. S-02 owns creating the draft and writing the column. Extra gallery photos stay parked.

## Detailed Findings

### Recommended request flow (split BFF vs Storage)

There is no mermaid `browser → Worker → bucket` in the architecture. The closest diagrams are Actions `INPUT → VALIDATE → ACTOR → USECASE` ([security.md:81-86](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/architecture/security.md#L81-L86)) and pages/Actions → application → infrastructure ([modules.md:88-94](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/architecture/modules.md#L88-L94)).

The documented exception is Storage upload:

> All catalog reads and build mutations must go through Astro SSR or Actions. Direct browser Supabase calls are forbidden except Storage upload, and only with RLS/Storage policies verified.
> — [runtime.md:46](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/architecture/runtime.md#L46)

| Concern | Path | Why |
| --- | --- | --- |
| Create draft row | Browser → Astro Action (BFF) → Postgres `builds` | Upload INSERT requires an existing owned `builds.id` |
| Image **bytes** | Browser → Supabase Storage API (`build-images`) | Avoids turning the Worker into a 5 MiB file proxy; F-01 policies + integration tests already exercise this |
| Persist `main_image_path` | Browser → Astro Action → Postgres | Path in DB, never a signed URL; do not let the island UPDATE `builds` |
| Draft preview | Author `createSignedUrl` (or `.download`) as authenticated owner | Private bucket; author SELECT policy `build_images_select_owner` |
| Public catalog/details read | Catalog SSR → `createSignedUrl` after verifying `status = 'published'` | Anon SELECT only when path matches a published row |

**Do not** stream the file through `actions.builds.*` unless a later ADR overturns `runtime.md:46`. AGENTS.md allows API endpoints for “files,” but that is a fallback, not the locked primary path. Workers Free/Pro request bodies are large enough (100 MB) for a 5 MiB proxy; the objection is memory/CPU plus the no-service-role decision, not a hard platform cap.

If planning wants names minted strictly server-side ([OPERATIONAL_SAFETY.md:127](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/OPERATIONAL_SAFETY.md#L127)) without proxying bytes, the BFF can call [`createSignedUploadUrl`](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl) and the island PUTs to that URL. That is still browser → Storage, not browser → Worker body. Standard `storage.from().upload()` is enough for ≤ 5 MiB; TUS/resumable is documented for files that may exceed 6 MB and is overkill here ([Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)).

### Private until published (already enforced in SQL)

Bucket is private (`public = false`), 5 MiB, jpeg/png/webp only:

```253:261:supabase/migrations/20260910201541_build_visibility_and_storage.sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'build-images',
  'build-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

Permalink: [migration L253-261](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L253-L261).

Object key convention (SQL comment + CHECK on the column): `{author_id}/{build_id}/main.{ext}`. The column cannot point off that prefix ([migration L79-85](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L79-L85)). Never persist a signed URL ([security.md:53-68](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/architecture/security.md#L53-L68); [data-model.md:40](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/architecture/data-model.md#L40)).

Storage policies (no SECURITY DEFINER helper — ownership inlined via `EXISTS` on `public.builds`):

| Policy | Op | Who | Gate |
| --- | --- | --- | --- |
| `build_images_insert` | INSERT | authenticated | folder `[1]` = `auth.uid()`, folder `[2]` = owned `builds.id` |
| `build_images_update` | UPDATE | authenticated | same (needed for `upsert: true`) |
| `build_images_delete` | DELETE | authenticated | same |
| `build_images_select_owner` | SELECT | authenticated | folder `[1]` = `auth.uid()` only |
| `build_images_select_published` | SELECT | anon + authenticated | `builds.status = 'published'` **and** `main_image_path = objects.name` **and** folders match that row |

Published SELECT: [migration L326-339](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/supabase/migrations/20260910201541_build_visibility_and_storage.sql#L326-L339).

Consequence for privacy:

- Upload **before** a draft row exists **fails** (proven).
- Anon and user B cannot download or list a draft object.
- After the author sets `main_image_path` **and** `status = 'published'`, anon can `createSignedUrl` and B can `.download`.
- SQL unpublish (`published → draft`) re-hides the object. MVP UI still does not expose unpublish.

Do **not** move published files into a public bucket in this slice. F-01 locked private-bucket + signed reads; a public-bucket move would need a transactional publish+move or compensating rollback ([security.md:66](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/architecture/security.md#L66)).

Supabase docs match this model: private buckets enforce RLS on download; the two read methods are authenticated `.download` or a time-limited signed URL ([Storage buckets — private](https://supabase.com/docs/guides/storage/buckets/fundamentals)). Upsert needs INSERT + SELECT + UPDATE ([Storage access control](https://supabase.com/docs/guides/storage/security/access-control)) — F-01 already grants all three to the author.

### F-03 vs S-02 ownership

Roadmap F-03 ([roadmap.md:183-193](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/roadmap.md#L183-L193)):

- Outcome: a photo-upload component **and its upload logic** can send one main photo to private storage and **return a reference** the draft form can attach.
- Risk: this is the control and logic, **not** a finished build — S-02 still attaches the photo.

S-02 ([roadmap.md:250-260](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/roadmap.md#L250-L260)) creates the draft (attributes, parts, main photo) and keeps it private.

Practical API for planning:

1. F-03 component is domain-free UI in `src/components/ui` (same as F-02). It accepts `buildId` (and later a callback with the path).
2. Upload helper talks to Storage under RLS; returns `{ path }` not a URL.
3. S-02 (or a thin create Action F-03 may introduce only if it must demonstrate live upload) inserts the draft **first**, then hydrates the control.
4. Writing `builds.main_image_path` stays an Action / `builds` use case. The island must not PostgREST-update the row.

FR-004: main photo is **optional**. Extra gallery photos are a PRD non-goal ([prd.md:174-175](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/prd.md#L174-L175)). Do not `list()` the bucket from the browser as a gallery.

`builds` owns the **main image reference** on the aggregate; Storage I/O belongs in that module’s **infrastructure** layer when S-02 lands ([modules.md:20-28, 130-136](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/architecture/modules.md#L20-L28)). F-03 can ship a shared helper next to the UI without scaffolding the full module if S-02 is the first `src/modules/builds` consumer — that split is a planning decision, not a research gap.

### What exists in the live BFF today

**Auth-only.** Cookie SSR client in [src/lib/supabase.ts](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/src/lib/supabase.ts) (`createServerClient` + `astro:env/server`). Middleware ([src/middleware.ts](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/src/middleware.ts)) calls `auth.getUser()` and sets `Astro.locals.user`. `Actor` is defined in [src/types.ts](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/src/types.ts) and unused.

API routes: `POST /api/auth/{signin,signup,signout}` only. None touch Postgres or Storage. None declare `export const prerender = false` (doc gap vs AGENTS.md; `output: "server"` still SSR-defaults them).

**Missing vs target:** `src/actions/`, `src/modules/`, browser Supabase client, path builder, signed-URL helper, photo UI.

Direct browser upload therefore needs a **new** `@supabase/ssr` `createBrowserClient` (publishable key + cookie session), plus Storage CORS on the `workers.dev` origin ([deployment.md:63](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/deployment.md#L63)). Do not put a secret/service-role key in that client.

### UI kit (F-02 hole)

No photo/file primitive exists. `Input` has stock shadcn `file:` styles only. F-02 explicitly left Main Photo to F-03 (archive research: do not fake it with a generic `<input type="file">`).

Visual target: dashed **MAIN PHOTO** well — camera icon, “ONE IMAGE ONLY”, JPEG/PNG/WEBP, MAX 5 MB, Choose image + drag and drop (`context/foundation/design-system.md` board region “Photo upload well”; mockup `context/archive/2026-09-11-authoring-form-components/build-form-reference.png`).

Copy F-02 patterns: `cn()`, `data-slot`, slot/callback props, co-located `*.stories.tsx` (`UI/PhotoUpload`), jsdom tests for empty/selected/error/a11y, phone-width story. Keep Storage/session out of Storybook (stories stay local Vite, not `workerd`).

### Validation and cleanup

Already in the bucket/SQL: MIME allowlist, 5 MiB, generated `main.{ext}` (never the original filename as key), path CHECK, ownership on write.

Still required of the pipeline ([OPERATIONAL_SAFETY.md:121-136](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/OPERATIONAL_SAFETY.md#L121-L136); [security.md:68](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/context/foundation/architecture/security.md#L68)):

- Enforce size **before** reading the whole body.
- Magic-byte / detected signature, not only `file.type`.
- Dimension cap (decompression bomb).
- EXIF/location strip when a processing step exists.
- Replace: `upsert: true` on `main.{ext}` is policy-legal; switching jpeg→webp leaves an orphan unless the old key is deleted.
- Cleanup for failed upload, abandoned draft, and build delete is **undefined** in F-01 (no Storage trigger on row delete). F-03 should define replace-same-key; S-02/S-08 still own delete-build orphans.

### Integration tests to treat as the contract

[tests/integration/build-image-storage.test.ts](https://github.com/tofucode-dev/watch-bldrs/blob/2d024278943244d9228621587513265f8cc16731/tests/integration/build-image-storage.test.ts) already proves the matrix with real Storage `.upload({ upsert: true })`, `.download`, `.list`, and anon `createSignedUrl`. F-03 must not weaken that. GitHub Actions still does not run these tests — local `npm run test:integration` remains the merge gate for Storage-touching work.

## Code References

- `supabase/migrations/20260910201541_build_visibility_and_storage.sql:79-85` — `main_image_path` CHECK `{author_id}/{id}/…`
- `supabase/migrations/20260910201541_build_visibility_and_storage.sql:253-339` — private bucket + Storage policies
- `src/lib/database.types.ts:86` — `builds.Row.main_image_path: string | null`
- `src/lib/supabase.ts:1-24` — server cookie client only
- `src/middleware.ts:6-25` — `getUser()` → `locals.user`
- `src/types.ts:1-2` — unused `Actor`
- `tests/integration/build-image-storage.test.ts:36-52` — create-before-upload; author upsert
- `tests/integration/build-image-storage.test.ts:167-196` — publish unlocks signed URL; unpublish revokes
- `context/foundation/architecture/runtime.md:36-46` — Action mutations; Storage-upload exception
- `context/foundation/architecture/security.md:53-88` — private-bucket strategy; Action pipeline
- `context/foundation/roadmap.md:183-193` — F-03 outcome vs S-02 attach
- `src/components/ui/parts-row.tsx` — F-02 pattern to copy (no photo primitive yet)

## Architecture Insights

1. **Two hops, two stores.** Bytes never need to enter the Worker. The BFF is still mandatory for the **row** (create draft, write path, later publish) because Storage INSERT is keyed to an owned `builds.id` and the catalog must not trust a client-supplied publication flag.
2. **Privacy is publication of the row, not of the object ACL.** The object stays in the same private bucket. Public readability is `status = 'published'` plus `main_image_path` equality. That is why setting the path without publishing must not leak, and why unpublish must re-hide without moving files.
3. **Path is the reference.** Catalog `mainImageUrl` is a **read-model** field to be signed at SSR time (S-04/S-06), not something F-03 stores.
4. **Filename is not auth.** `{uid}/{buildId}/main.{ext}` is generated from session + server-created id + allowlisted extension. A malicious island that forges another user’s prefix fails RLS; still do not trust `file.name`.
5. **No service-role signer.** F-01 chose published SELECT so `createSignedUrl` works with the publishable key. Do not add a Worker secret to sign catalog images.
6. **Modules are still empty.** Incremental adoption says the first business feature lives under `src/modules/builds`. F-03 can put the well in `src/components/ui` and keep Storage helpers either (a) next to the UI as a client helper, or (b) as the first `builds` infrastructure file. (b) is cleaner for S-02 but is extra scaffolding if F-03 must stay a UI-kit slice.

## Historical Context (from prior changes)

- `context/archive/2026-09-09-build-visibility-and-storage/research.md` — locked private `build-images`, no new secret, published SELECT + signed URLs, create-row-before-upload, magic-bytes deferred to the upload pipeline (then labeled S-02; F-03 now owns that pipeline).
- `context/archive/2026-09-09-build-visibility-and-storage/plan.md` — path `{author_uuid}/{build_uuid}/main.{ext}`; upsert needs SELECT+INSERT+UPDATE; do not list the bucket for anon.
- `context/archive/2026-09-09-build-visibility-and-storage/reviews/impl-review.md` — Fix A: path CHECK + published SELECT folder binds so a published row cannot unlock another object by pointing `main_image_path` at it. S-02 must still only persist a path uploaded for **that** build.
- `context/archive/2026-09-11-authoring-form-components/research.md` — photo well is F-03; S-02 composes it next to F-02 fields; do not ship a fake file input.
- `context/archive/2026-09-11-authoring-form-components/plan.md` — “Photo upload stays F-03; persistence, Actions, and the create page stay S-02.”

## Related Research

- `context/archive/2026-09-09-build-visibility-and-storage/research.md`
- `context/archive/2026-09-11-authoring-form-components/research.md`

## Open Questions

1. **Create-before-upload vs standalone Storybook.** Live Storage upload cannot succeed without a draft row. Options: (a) F-03 control requires `buildId` and S-02 creates an empty draft on editor enter; (b) F-03 ships UI + helper only, with integration tests using a seeded row; stories use local `File` + object URL, no live bucket. (b) matches a UI-kit slice; (a) is needed the moment F-03 claims “can send one main photo to private storage” against a running app.
2. **Who writes `main_image_path` in F-03 demos?** Roadmap says return a reference. Prefer not to UPDATE `builds` from the island. If F-03 includes a `/dev` harness, that harness should call a tiny Action, not PostgREST.
3. **Browser client location.** New `createBrowserClient` in `src/lib/` (auth/storage shared) vs first `builds` infrastructure. Cookie/session wiring and CORS are required either way.
4. **Signed upload URL vs `storage.upload()`.** Default: client `upload` with constructed `main.{ext}` (matches F-01 tests). Stricter OPERATIONAL_SAFETY: BFF `createSignedUploadUrl` then PUT. Planning should pick one.
5. **Magic-bytes, dimensions, EXIF, orphan cleanup.** Bucket MIME is not a substitute. Decide F-03 minimum (client size/MIME + generated name + upsert same key) vs S-02/S-08 for delete-build compensation.
6. **Draft preview URL lifetime.** Author `createSignedUrl` for the island `<img>`; do not persist it. Catalog signing stays S-04/S-06.
7. **CORS on hosted Storage** for `https://watch-bldrs.contact-tofucode.workers.dev` and local `http://127.0.0.1:4321` — operator step, not application code, but F-03 browser upload will fail in prod without it.
