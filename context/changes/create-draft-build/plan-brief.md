# Create a Private Draft Build — Plan Brief

> Full plan: `context/changes/create-draft-build/plan.md`

## What & Why

An authenticated enthusiast must be able to post a structured draft (attributes, parts, optional main photo) that stays private until a later publish slice. This is S-02 of the proving flow: the first `builds` module, the first Astro Actions, and the first real Build Form.

## Starting Point

F-01 already persists drafts behind RLS and a private image bucket. F-02/F-03 shipped the form kit and `uploadMainImage`. Cookie password auth gates `/dashboard` only. There is no `src/modules/`, no Actions, and no create page. Account list (S-08) and publish (S-03) are not in this slice.

## Desired End State

From Dashboard → New build, the author fills any subset of the form, clicks Save Draft, and keeps working on that same draft at `/account/builds/[id]/edit`. Another user cannot see it. Publish is absent. Phone and desktop both work.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Re-save | Same page updates the new draft | Photo and field fixes need an id; S-08 list does not exist yet |
| Photo | One click: save row → browser upload → write path | `uploadMainImage` requires `buildId`; bytes must not go through the Worker |
| After save | Stay on the form; put id in the URL | Refresh must reload the draft without an account list |
| Required fields | Schema invariants only; empty draft OK | FR-004 must not block posting |
| Parts | Zero rows; Add part; skip blank; started row needs category+name | Matches optional parts list without fake empty rows |
| Entry | Gated `/account/builds/new` + Dashboard button | Suggested route map; Account nav stays dashboard until S-08 |
| Discard / tests | Reset UI only; unit + jsdom; no Playwright | Delete is S-08; Vitest already matches the repo |
| Atomic save | `security invoker` SQL function via `auth.uid()` | OPERATIONAL_SAFETY §3 forbids sequential build/parts client writes |

## Scope

**In scope:** `src/modules/builds`, `save_draft_build` RPC, create/update/attach Actions, Build Form island, `/account` guard + sign-in return, Dashboard CTA, optional main photo attach, author-only signed preview, identity-matrix tests for the function.

**Out of scope:** Publish/unpublish, account list, delete, catalog, likes, gallery photos, Worker file proxy, Playwright, SSO switch, rate limits.

## Architecture / Approach

```
BuildForm island
  → actions.builds.createDraft | update  → save_draft_build RPC
  → (optional File) uploadMainImage (browser, RLS)
  → actions.builds.attachMainImage
edit.astro SSR → getOwnedDraft → signed preview URL (display only)
```

Pages stay thin. Actor comes from the session, never from the form.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Module + atomic Actions | RPC, validation, create/update/attach, identity tests | Function grants or `author_id` leakage |
| 2. Gated form island | Routes, Dashboard entry, save/re-save/discard | Open redirect; user B seeing A’s draft |
| 3. Main photo | Upload sequence, previewUrl, signed read | CORS / missing `PUBLIC_SUPABASE_*`; persisting a signed URL |

**Prerequisites:** F-01–F-03 done; password session (S-01 `ready`); local Docker Supabase for Phase 1 integration tests; hosted Storage CORS already documented.
**Estimated effort:** ~2–3 sessions across 3 phases.

## Open Risks & Assumptions

- Hosted upload fails until Storage CORS includes the `workers.dev` origin and local `http://127.0.0.1:4321`, and until `PUBLIC_SUPABASE_*` build secrets are the anon pair.
- Cleared photos leave Storage orphans until S-08.
- S-01 is not archived `done`; this plan assumes the existing password session keeps working.
- Rate limiting for build mutations is deferred (OPERATIONAL_SAFETY §7).

## Success Criteria (Summary)

- Author can save an empty or filled private draft and re-save it after the URL has an id.
- Optional main photo survives refresh for the author only.
- Anonymous and user B cannot read or mutate that draft.
