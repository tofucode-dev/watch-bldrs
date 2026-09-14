---
change_id: show-public-builds
title: Show public builds
status: archived
created: 2026-09-14
updated: 2026-09-14
archived_at: 2026-09-14T03:01:03Z
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

- `show-public-builds` can be implemented and verified independently by seeding published rows against the existing schema. S-03 is needed only for the later user-driven publish-to-catalog proving flow; publishing remains outside this change.
- The roadmap was already dirty before planning, including malformed frontmatter and an inconsistent S-04 prerequisite cell. This planning pass changes only the S-04 status fields required by `/10x-plan`.

## Catalog query plan (Phase 1.10)

Inspected locally on 2026-09-14 via Docker CLI against the seeded demo catalog (`14` published rows, `1` draft):

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, main_image_path, watch_style, movement, dial_colour, strap_type, case_size_mm, published_at
FROM public.builds
WHERE status = 'published' AND published_at IS NOT NULL
ORDER BY published_at DESC, id DESC
LIMIT 13;
```

Representative plan:

```
Limit
  -> Sort (published_at DESC, id DESC; quicksort in memory)
    -> Seq Scan on builds
         Filter: published_at IS NOT NULL AND status = 'published'
         Rows Removed by Filter: 1
Planning Time: 0.447 ms
Execution Time: 0.209 ms
```

Indexes present on `builds`: `builds_pkey (id)`, `builds_author_id_idx (author_id)` only — no catalog ordering index.

**MVP indexing conclusion:** accept the bounded sequential scan at current catalog volume. Execution stayed sub-millisecond with all buffers served from cache on a tiny table. Do **not** add a speculative `(status, published_at DESC, id DESC)` index in S-04; revisit only if a representative production plan shows sustained latency or large-row sequential scans after real catalog growth.

## BuildCard Storybook review (Phase 2.16)

Reviewed Paper and Ink linked/unlinked BuildCard stories on 2026-09-14. No accepted visual gaps recorded.

## Catalog pagination note (Phase 2 manual)

Keyset `before`/`after` cursor URLs are intentional for SSR stability and future filter compatibility. Cursor paging does not expose "page N of M"; orientation copy improvements are deferred. Captured as a recurring rule in `context/foundation/lessons.md`.

## Phase 3 verification evidence (2026-09-14)

### Automated repository gates

| Gate | Result |
| --- | --- |
| `npm run lint` | pass |
| `npm run test` | pass (30 files, 174 tests) |
| `npm run storybook:build` | pass |
| `npm run build` (`output: "server"`, Cloudflare Workers) | pass |
| `npx supabase db reset` + `npm run test:integration` | pass (4 files, 24 tests) |

### Browser/server boundary review (3.6)

- `@/modules/catalog/index.ts` exports only types and `CatalogListing` presentation; no `server.ts`, infrastructure, `astro:env/server`, or Supabase imports.
- `/builds` route imports `resolveCatalogListing` from `@/modules/catalog/server` in the Astro frontmatter only; presentation comes from `@/modules/catalog`.
- No `@/modules/*/infrastructure` deep imports outside allowed module layers.
- Server-only env usage remains confined to `src/lib/supabase.ts` and `src/lib/config-status.ts`.

### Cross-module import review (3.7)

- No catalog/builds infrastructure deep imports in pages, components, or client bundles.
- ESLint module-boundary rule enforces `@/modules/<name>` / `@/modules/<name>/server` entrypoints.
- No circular dependency surfaced in lint, test, or build output.

### Foundation documentation (3.8)

- `context/foundation/architecture/testing.md`: catalog draft exclusion coverage now references S-04.
- `context/foundation/architecture/data-model.md`: deferred `build_likes` owner now references S-07.

### Query-plan conclusion

Unchanged from Phase 1.10: accept bounded sequential scan at MVP catalog volume; no speculative ordering index in S-04.

### Accepted visual gaps

Unchanged from Phase 2.16: none recorded.

### Manual proving subset (3.9–3.10)

Confirmed on 2026-09-14 at phone (~390px) and desktop widths: `/builds` paging forward/back preserves tuple order without duplicate or skipped IDs; empty, invalid-cursor, and unavailable states remain distinct. Seeded published builds appear after refresh; the demo draft stays absent for anonymous, author A, and user B browsing.
