---
date: 2026-09-14T18:05:00+02:00
researcher: Composer
git_commit: 14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8
branch: main
repository: watch-bldrs
topic: "manage-own-builds"
tags: [research, codebase, builds, dashboard, catalog, supabase, astro]
status: complete
last_updated: 2026-09-14
last_updated_by: Composer
---

# Research: manage-own-builds

**Date**: 2026-09-14T18:05:00+02:00  
**Researcher**: Composer  
**Git Commit**: 14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8  
**Branch**: main  
**Repository**: watch-bldrs

## Research Question

What exists today, and what architectural, security, and presentation work is required to implement S-08 (`manage-own-builds`): an authenticated dashboard listing the author's drafts and published builds, with start-new, status-aware card CTAs, delete-with-confirmation, and route consolidation under `/dashboard`?

## Summary

S-08 is mostly greenfield on the application and presentation layers. The database and RLS already authorize an author to read all own rows (draft + published) and delete own builds; integration tests cover raw delete authorization. The `builds` module today stops at single-draft reads and four mutations (`createDraft`, `update`, `attachMainImage`, `publish`) — there is no `listOwnedBuilds` or `deleteBuild` use case, no delete Action, and no owned-build read model.

The current `/dashboard` route is a protected stub (welcome card, "New build" link, optional publish confirmation). Create/edit live under `/account/builds/*`. The public catalog stack (`BuildCard`, `BuildGrid`, keyset pagination) is the intended reuse target for the dashboard grid; `BuildCard.footerAction` is the hook for Edit/View/Publish CTAs. The card lacks status, subtitle, story, and a way to hide the like count — small extensions or a thin wrapper are needed to match the mockup.

Implementing S-08 means: adding `listOwnedBuilds` + `deleteBuild` in `builds`, replacing the dashboard stub with an owned-builds listing, moving authoring routes to `/dashboard/builds/*`, renaming Topbar "Account" → "Dashboard", wiring delete with Storage cleanup (deferred debt from F-01/S-02), and handling cross-slice gaps (View needs S-06 details page; Edit on published builds is S-09).

## Detailed Findings

### 1. Current dashboard and route map

- [`src/pages/dashboard.astro`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/pages/dashboard.astro) is a centered stub: welcome email, "New build" → `/account/builds/new`, sign-out form, and optional `?published=1` banner after publish.
- Create/edit pages exist only under `/account/builds/new` and `/account/builds/[id]/edit`; no `/dashboard/builds/*` routes.
- [`src/middleware.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/middleware.ts) protects `/dashboard` and `/account` via `pathname.startsWith`; future `/dashboard/builds/*` pages are already covered.
- [`src/components/Topbar.astro:5,11`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/components/Topbar.astro#L5-L11) — nav item label is `"Account"` (not "Account Navigation"); `isDashboard` matches exact `/dashboard` only, so subroutes won't highlight the nav item until widened to `path.startsWith("/dashboard")`.
- Foundation docs (`context/foundation/architecture/runtime.md`) still document `/account` as the account area; `change.md` proposes consolidating under `/dashboard`.

### 2. Builds module — mutations exist, list/delete missing

**BuildStore port** ([`src/modules/builds/application/ports/build-store.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/builds/application/ports/build-store.ts)) exposes only:

| Method | Purpose |
|--------|---------|
| `saveDraft` | Create/update draft |
| `getOwnedDraft` | Single draft by ID (draft-only filter) |
| `attachMainImage` | Set `main_image_path` |
| `publishBuild` | Draft → published transition |

**Server entry** ([`src/modules/builds/server.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/builds/server.ts)) wires the four use cases above. Target architecture in `modules.md` names `listOwnedBuilds` and `deleteBuild` — neither is implemented.

**`getOwnedDraft` is draft-only** — [`supabase-build-store.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/builds/infrastructure/supabase-build-store.ts) filters `.eq("status", "draft")`, so the edit page 404s for published builds (intentional until S-09).

**Actions** ([`src/modules/builds/actions.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/builds/actions.ts)) — `createDraft`, `update`, `attachMainImage`, `publish`. No `delete` Action; `security.md` recommends `actions.builds.delete`.

**Publish from UI** — fully wired in [`build-form.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/builds/presentation/build-form.tsx) sticky bar with confirmation dialog; redirects to `/dashboard?published=1`. Dashboard cards need a separate Publish CTA path (Action call or link to editor).

### 3. RLS and delete — DB ready, Storage cleanup not

From migration [`20260910201541_build_visibility_and_storage.sql`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/supabase/migrations/20260910201541_build_visibility_and_storage.sql):

| Policy | Rule |
|--------|------|
| `builds_select` | `status = 'published' OR author_id = auth.uid()` |
| `builds_delete` | `author_id = auth.uid()` (any status) |

`build_parts` cascade on build delete. Integration tests in [`tests/integration/build-visibility.test.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/tests/integration/build-visibility.test.ts) confirm author can delete own build; user B cannot.

**Storage orphan gap:** `build_images_delete` requires a matching `builds` row. Deleting the build row first leaves storage objects orphaned unless the app deletes them first. F-01 and S-02 explicitly deferred this cleanup to S-08. `OPERATIONAL_SAFETY.md` §4 requires idempotent delete (no 404 when row already gone); §10 requires cleanup behavior for deleted builds.

### 4. Reusable catalog/listing UI

| Asset | Path | Dashboard reuse |
|-------|------|-----------------|
| `BuildCard` | [`src/components/ui/build-card.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/components/ui/build-card.tsx) | Image, style ribbon, title, metadata badges; `footerAction` slot for CTAs |
| `BuildGrid` | [`src/components/ui/build-grid.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/components/ui/build-grid.tsx) | 1/2/3-column responsive grid |
| `CatalogListing` | [`src/modules/catalog/presentation/catalog-listing.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/presentation/catalog-listing.tsx) | Pagination pattern (`CatalogPagination` with Previous/Next links) |
| Catalog server | [`src/modules/catalog/server.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/server.ts) | Keyset cursor URL builder (`before`/`after`, page size 12) |
| Storybook | [`build-card.stories.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/components/ui/build-card.stories.tsx) `WithFooterAction` | Closest pattern for dashboard CTA buttons |

**Gaps vs mockup** ([`user-dashboard.png`](./user-dashboard.png)):

| Mockup element | In `BuildCard` today |
|----------------|----------------------|
| Style ribbon | Yes — `styleLabel` |
| Title | Yes — `name` |
| Subtitle "by @user · Published/Draft" | No |
| Story blurb | No |
| Spec tags | Yes — metadata badges |
| Edit + View/Publish footer CTAs | Partial — `footerAction` slot; no dual-button layout |
| Like count | Always shown — needs `showLikeCount` prop or wrapper |

Catalog cards currently have no `href` and no `footerAction`; `likeCount` is always `0` from the store.

### 5. Image URLs for owned builds

- **Draft images:** signed URLs via [`main-image-preview.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/builds/infrastructure/main-image-preview.ts) (private bucket, author-only RLS).
- **Published images:** signed URLs via catalog [`public-image-url.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/catalog/infrastructure/public-image-url.ts).
- Owned-build list mapper must branch on `status` for the correct signing path.

### 6. Pagination for dashboard

Per `change.md` and lessons learned (`context/foundation/lessons.md` — prefer keyset cursor pagination for SSR catalogs):

- Reuse catalog's keyset pattern but with a different sort key: catalog uses `(published_at DESC, id DESC)`; owned list likely needs `(updated_at DESC, id DESC)` or `(created_at DESC, id DESC)` to include drafts.
- Page size can match catalog (`CATALOG_PAGE_SIZE = 12`) or stay smaller given low expected volume.
- Extract or duplicate `CatalogPagination` with base href `/dashboard`.

### 7. Route migration and hardcoded URLs

| Current | Target (`change.md`) | Files to update |
|---------|---------------------|-----------------|
| `/dashboard` (stub) | `/dashboard` (owned list) | `src/pages/dashboard.astro` — full rewrite |
| `/account/builds/new` | `/dashboard/builds/new` | Move page; update links |
| `/account/builds/[id]/edit` | `/dashboard/builds/edit/[id]` | Move page (Astro file-based) |
| Topbar `"Account"` | `"Dashboard"` | `Topbar.astro:11` |
| `isDashboard` exact match | `path.startsWith("/dashboard")` | `Topbar.astro:5` |

**Hardcoded URL references:**

- [`dashboard.astro:28`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/pages/dashboard.astro#L28) — `/account/builds/new`
- [`build-form.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/builds/presentation/build-form.tsx) — post-publish redirect and `history.replaceState` edit URL
- [`build-form.test.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/modules/builds/presentation/build-form.test.tsx), [`safe-redirect.test.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/lib/safe-redirect.test.ts) — test fixtures

Consider redirects from old `/account/builds/*` paths for bookmarks (not specified in change notes).

### 8. Delete UX — action bar, not card

`change.md` specifies a remove button in an action bar with confirmation. This aligns with [`StickyActionBar`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/src/components/ui/sticky-action-bar.tsx) on the edit form (`build-form.tsx:810–839`), not the listing card. Roadmap also mentions delete from details when author (S-06 dependency).

## Code References

- `src/pages/dashboard.astro:1-43` — Protected stub; publish confirmation banner; "New build" link
- `src/components/Topbar.astro:5,11` — `isDashboard` exact match; nav label "Account"
- `src/middleware.ts:4,20-25` — `PROTECTED_ROUTES` for `/dashboard` and `/account`
- `src/modules/builds/application/ports/build-store.ts:3-8` — BuildStore port (no list/delete)
- `src/modules/builds/infrastructure/supabase-build-store.ts:144-153` — `getOwnedDraft` draft-only filter
- `src/modules/builds/actions.ts:66-123` — Four build Actions (no delete)
- `src/modules/builds/presentation/build-form.tsx:371-416,810-838` — Publish confirmation + sticky bar
- `src/components/ui/build-card.tsx:11-28,172-177` — Card API with `footerAction` and like count footer
- `src/modules/catalog/presentation/catalog-listing.tsx:23-54,123-139` — Pagination + card grid pattern
- `src/modules/catalog/server.ts:28-33,51-86` — Cursor URL builder and page resolver
- `supabase/migrations/20260910201541_build_visibility_and_storage.sql:169-174,190-193` — SELECT and DELETE RLS
- `tests/integration/build-visibility.test.ts:68-114` — Delete authorization integration tests
- `context/changes/manage-own-builds/change.md` — Route targets, card CTAs, delete, nav rename
- `context/changes/manage-own-builds/user-dashboard.png` — Target UI mockup

## Architecture Insights

1. **Module ownership:** Account area is route-level composition — `auth` supplies actor, `builds` owns `listOwnedBuilds` and `deleteBuild`. No new `account` module. Do not put owned-build queries in `catalog` (read-only published visibility).
2. **Thin Astro pages:** Pages parse params, resolve actor, call `@/modules/builds/server` use cases, compose view. No direct Supabase in pages.
3. **Actions for mutations:** Delete should be an Astro Action (`actions.builds.delete`) following the existing builds action pattern: validate input → `actorFromUser` → use case → safe error mapping.
4. **Reuse, don't fork:** Roadmap explicitly says reuse S-04 listing components; this is the author's list, not a second card kit.
5. **Scope split:** S-08 = list + start + delete. S-09 = edit (including published). Edit CTAs on dashboard cards can link to the existing draft-only edit route; published edit 404s until S-09.
6. **Cache headers:** Account/draft responses need `Cache-Control: private, no-store` per `OPERATIONAL_SAFETY.md` §5.
7. **Accessibility lesson:** `BuildCard` media+title duplicate links can produce unnamed navigation stops (`lessons.md`); dashboard should omit `href` and use explicit footer CTAs instead.

## Historical Context (from prior changes)

- [`context/archive/2026-09-09-build-visibility-and-storage/`](https://github.com/tofucode-dev/watch-bldrs/tree/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/archive/2026-09-09-build-visibility-and-storage) — F-01 established RLS, draft privacy, delete policy, and deferred Storage cleanup to S-08.
- [`context/archive/2026-09-13-create-draft-build/`](https://github.com/tofucode-dev/watch-bldrs/tree/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/archive/2026-09-13-create-draft-build) — S-02 explicitly deferred account list, delete, and Storage orphan cleanup. Established `/account/builds/*` routes, dashboard stub, and draft-only edit.
- [`context/archive/2026-09-14-publish-draft-build/`](https://github.com/tofucode-dev/watch-bldrs/tree/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/archive/2026-09-14-publish-draft-build) — S-03 chose `/dashboard?published=1` as temporary success destination until account list exists. Edit route intentionally 404s after publish.
- [`context/archive/2026-09-14-show-public-builds/`](https://github.com/tofucode-dev/watch-bldrs/tree/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/archive/2026-09-14-show-public-builds) — S-04 delivered catalog module with keyset pagination, `BuildCard`/`BuildGrid`, and explicit `status = 'published'` predicate. Account listing was out of scope.
- [`context/foundation/roadmap.md:323-333`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/foundation/roadmap.md#L323-L333) — S-08 scope: list + start + delete; editing is S-09; reuse S-04 components.
- [`context/foundation/prd.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/foundation/prd.md) — US-07, FR-003, FR-008: account area lists drafts + published; author-only create/edit/delete.

## Related Research

- [`context/archive/2026-09-14-show-public-builds/research.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/archive/2026-09-14-show-public-builds/research.md) — Catalog module, pagination, `BuildCard` reuse patterns
- [`context/archive/2026-09-14-publish-draft-build/research.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/archive/2026-09-14-publish-draft-build/research.md) — Publish flow, dashboard redirect rationale
- [`context/archive/2026-09-13-create-draft-build/`](https://github.com/tofucode-dev/watch-bldrs/tree/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/archive/2026-09-13-create-draft-build) — Create/edit routes, deferred S-08 scope
- [`context/changes/filter-published-listing/research.md`](https://github.com/tofucode-dev/watch-bldrs/blob/14de3983bf1eb8b39d3e00b8f6aef0644f1ef1a8/context/changes/filter-published-listing/research.md) — Catalog filter patterns (no account area overlap; keyset + URL state lessons apply)

## Open Questions

| Topic | Options | Notes |
|-------|---------|-------|
| Route consolidation | Move all to `/dashboard/builds/*` vs. only list page | `change.md` proposes full migration; foundation docs still say `/account` |
| Edit CTA on published cards | Link to draft-only edit (404 until S-09) vs. hide until S-09 | Mockup shows Edit on all cards; roadmap assigns edit to S-09 |
| View CTA target | Stub URL vs. wait for S-06 details page | No `/builds/[id]` route exists today |
| Publish from card | Inline Action with confirmation vs. link to editor | Publish Action exists; editor has full confirmation UX |
| Storage cleanup on delete | Delete object before row vs. after vs. background job | Required per F-01/S-02 debt; not in change notes |
| Legacy `/account/builds/*` | 301 redirects vs. leave broken | Bookmarks from S-02/S-03 flows |
| Card extensions | Extend `BuildCard` vs. `DashboardBuildCard` wrapper | Mockup needs subtitle, story, hidden likes |
| Delete from details | Include in S-08 vs. defer to S-06 | Roadmap mentions it; details page doesn't exist |
| Sort order for owned list | `updated_at` vs. `created_at` vs. status-grouped | Catalog uses `published_at`; drafts have no `published_at` |
| Pagination page size | Match catalog (12) vs. smaller | Change notes say reuse logic; low expected volume |
