# Manage Own Builds — Plan Brief

> Full plan: `context/changes/manage-own-builds/plan.md`
> Research: `context/changes/manage-own-builds/research.md`

## What & Why

Authenticated authors need a dashboard that lists their drafts and published builds, lets them start a new draft, open the editor, view published work, and delete builds they own. This is S-08 (US-07, FR-003, FR-008) — the account area promised since S-02/S-03 deferred it.

## Starting Point

`/dashboard` is a protected stub. Create/edit live at `/account/builds/*`. The `builds` module has create, update, attach, and publish — but no list or delete. RLS already allows authors to read all own rows and delete own builds. `BuildCard` + catalog keyset pagination exist from S-04. `getOwnedDraft` and `save_draft_build` are **draft-only**, so published builds 404 on edit today despite sharing the same form UI.

## Desired End State

`/dashboard` shows the author's builds in a responsive grid with Draft/Published status, Edit (all cards), and View (published only, linking to `/builds/{id}`). "+ New build" goes to `/dashboard/builds/new`. Edit/delete live under `/dashboard/builds/edit/{id}` with delete confirmation in the sticky action bar. Published builds load in the same form and save successfully. `/account/builds/*` pages are removed. Topbar says "Dashboard".

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| View CTA | Link to `/builds/{id}` | Stable URL; 404 acceptable until S-06 | Plan |
| Edit on published | Enable before S-09 | Same form; requires relaxing draft-only store/RPC filters | Plan |
| Draft card CTAs | Edit only (no Publish on card) | Publish stays in editor sticky bar | Plan |
| Published card CTAs | Edit + View | Matches mockup minus Publish on cards | Plan |
| Card fields | Status label only; no subtitle/story/author | Reuse `BuildCard`; minimal delta | Plan |
| Likes on dashboard | Hidden (`showLikeCount={false}`) | Dashboard is not a social surface | Plan |
| Legacy `/account/*` | Remove without redirect | User preference; bookmarks break | Plan |
| Pagination | Keyset on `updated_at` + `id`, page size 12 | Matches catalog pattern and lessons | Research |
| Delete | Action on edit sticky bar + Storage cleanup | Per change notes; F-01/S-02 deferred debt | Research |
| Module ownership | `builds` module, not `catalog` | Author's list is a write-side concern | Research |

## Scope

**In scope:** `listOwnedBuilds`, `deleteBuild`, dashboard listing UI, route migration to `/dashboard/builds/*`, Topbar rename, `BuildCard` status + footer CTAs, published edit enablement (RPC + store), `actions.builds.delete`, integration tests, `runtime.md` route map update.

**Out of scope:** Publish CTA on dashboard cards, public details page (S-06), likes (S-07), unpublish UI, account-list filters, delete from details page (S-06), `/account` redirects, subtitle/story/author on cards, Playwright E2E.

## Architecture / Approach

```
/dashboard.astro
  → resolveOwnedBuildsListing (builds/server)
  → listOwnedBuilds(actor, cursor) → BuildStore
  → OwnedBuildsListing → BuildGrid + BuildCard (status, footerAction CTAs)

/dashboard/builds/edit/[id].astro
  → getOwnedBuildForForm (draft + published)
  → BuildForm + delete Action + StickyActionBar Remove
```

Pages stay thin. Actor from session. Delete removes Storage object then DB row (idempotent).

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. List + delete backend | `listOwnedBuilds`, `deleteBuild`, cursors, integration tests | Storage orphan if delete order wrong |
| 2. Published edit + routes | RPC migration, load/save published, move pages, delete UI | `save_draft_build` name vs published semantics |
| 3. Dashboard UI + nav | Grid, status, CTAs, Topbar, empty states | Card footer layout with hidden likes |
| 4. Production verification | Lint, test, build, manual phone/desktop | View 404 until S-06 |

**Prerequisites:** S-02, S-03, S-04 done; session auth working; local Supabase for integration tests.
**Estimated effort:** ~2–3 sessions across 4 phases.

## Open Risks & Assumptions

- View links 404 until S-06 ships — accepted.
- Published edit overlaps S-09; after this slice S-09 may shrink to "edit from details" only.
- Removing `/account/builds/*` breaks bookmarks from earlier flows.
- `save_draft_build` RPC name stays; behavior extends to published rows.

## Success Criteria (Summary)

- Author sees only their drafts and published builds on `/dashboard` with working pagination.
- Author can create, edit (draft and published), view-link published builds, and delete with confirmation.
- User B cannot list, edit, or delete author A's builds.
