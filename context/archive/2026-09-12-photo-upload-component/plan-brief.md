# Photo Upload Component — Plan Brief

> Full plan: `context/changes/photo-upload-component/plan.md`
> Research: `context/changes/photo-upload-component/research.md`

## What & Why

F-03 ships the Main Photo well and the upload logic that can send one jpeg/png/webp (max 5 MiB) to the private `build-images` bucket and return a storage path the draft form can attach. S-02 still creates the draft and writes `builds.main_image_path`. Extra gallery photos stay parked.

## Starting Point

F-01 already has the private bucket, path CHECK, Storage RLS, and integration tests. F-02 left a hole in the Build Form on purpose. There is no photo primitive, no browser Supabase client, and no upload helper. Image bytes must not go through the Worker.

## Desired End State

Storybook shows an empty dashed well, a local preview after a valid File, and an error state. A helper `uploadMainImage` upserts `{authorId}/{buildId}/main.{ext}` under RLS and returns `{ path }` — never a URL. S-02 can compose the well and call the helper after it has a draft id.

## Key Decisions Made

| Decision            | Choice                                      | Why                                                                                         | Source   |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- | -------- |
| Slice depth         | Well + helper, no live app                  | Matches F-02 (no `/dev` route); S-02 is the first draft/Action consumer                     | Plan     |
| Byte path           | Browser `storage.upload()`                  | Architecture forbids Worker file proxy; matches F-01 tests                                  | Research |
| Validation          | Size + MIME + magic-bytes                   | Closes spoofed `file.type` without an image-processing pipeline                             | Plan     |
| Replace             | Upsert; delete old key only on ext change   | Closes jpeg→webp orphans; upload-first so a failed replace cannot delete the only copy      | Plan     |
| Preview             | Local object URL                            | Works in Storybook; catalog signed reads stay S-04/S-06                                     | Plan     |
| Clear               | Local only; no Storage.delete               | Photo is optional; S-02/S-08 own row + orphan cleanup                                       | Plan     |
| Module scaffolding  | No `src/modules/builds`                     | UI-kit slice; helper in `src/lib` until S-02 owns the module                                | Research |
| Dimensions / EXIF   | Deferred                                    | No processing step in this foundation                                                       | Plan     |

## Scope

**In scope:** `PhotoUpload` well, file validator, browser client factory, `uploadMainImage`, Storybook/jsdom/Node tests, public env aliases, CORS operator note.

**Out of scope:** Draft insert, Actions, `main_image_path` write, `/dev` page, gallery photos, Worker file proxy, signed read URLs, EXIF strip, clear-to-delete, new RLS, Playwright.

## Architecture / Approach

```
PhotoUpload (File | null)
    → validateMainImageFile (header bytes)
    → [S-02] create draft row
    → uploadMainImage → Storage.build-images  `{uid}/{buildId}/main.{ext}`
    → return { path }
    → [S-02] Action writes builds.main_image_path
```

The well never talks to Supabase. Stories never import `astro:env`. Privacy stays “row published + path equality,” not a public bucket.

## Phases at a Glance

| Phase | What it delivers                                      | Key risk                                              |
| ----- | ----------------------------------------------------- | ----------------------------------------------------- |
| 1. Photo well and file validation | Dashed well, magic-bytes, stories, jsdom tests | Visual match vs mockup; Storybook must stay Storage-free |
| 2. Browser client and upload helper | `createBrowserClient` + path-returning upload | PUBLIC_ env vs server secrets; CORS is operator-only |

**Prerequisites:** F-01 done (bucket + RLS). F-02 widgets exist for later composition, not for this slice.
**Estimated effort:** ~2 sessions across 2 phases.

## Open Risks & Assumptions

- Hosted upload will fail until Storage CORS includes `workers.dev` and `http://127.0.0.1:4321`.
- `PUBLIC_SUPABASE_*` must be the anon pair; a service-role key in those fields would leak to the browser.
- Failed `remove` after an ext-change upload leaves a private orphan until S-02/S-08.
- Live “send to storage” is proven by mocked helper tests plus existing F-01 integration tests, not by a running editor.

## Success Criteria (Summary)

- Author can pick, preview, reject, and clear one main photo in Storybook without a bucket.
- Helper returns only `{authorId}/{buildId}/main.{ext}` after RLS-shaped upload/upsert.
- S-02 can attach that path without this slice writing the build row.
