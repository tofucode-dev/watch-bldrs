# Build Visibility and Private Main-Image Storage — Plan Brief

> Full plan: `context/changes/build-visibility-and-storage/plan.md`
> Research: `context/changes/build-visibility-and-storage/research.md`

## What & Why

WatchBldrs cannot prove a structured catalog until builds persist with author-only drafts. F-01 is that foundation: tables, RLS, and a private main-image bucket so S-02 can publish without leaking drafts through the Data API or Storage.

## Starting Point

Cookie auth against `auth.users` already works. There are no product migrations, no Storage bucket, no generated DB types, and no RLS tests. GitHub Actions does not start Supabase.

## Desired End State

A clean local `db reset` yields `builds` / `build_parts` and private `build-images`. Anonymous and user B cannot read A’s drafts or draft photos. After A publishes, they can read the row, parts, and image via signed URL. Unpublish is possible in SQL but will not be offered in the product yet.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| F-01 deliverable | Migrations + types + local integration tests; no `src/modules/builds` | Avoid empty layers; S-02 owns use cases | Plan |
| `hands_style` | Postgres enum now | Cheaper than a second migration before the north-star form | Plan |
| Vocabularies | Full enums from dictionary + dial colours; every attribute/part enum includes `other` | Stable filter keys before S-03; authors are not stuck if a value is missing | Plan |
| Dial colours | `black`, `white`, `blue`, `green`, `silver`, `other` | Dictionary had no list | Plan |
| Part prices | Integer minor units + ISO `char(3)` | Avoid JS float; OPERATIONAL_SAFETY | Plan |
| `build_likes` | Omit | Roadmap S-04 | Research |
| Images | Private `build-images`, 5 MiB, jpeg/png/webp; published SELECT + signed URLs | Draft photos stay private; no new secret | Plan |
| Unpublish in DB | Allowed in SQL; no MVP UI control | Product contract: technically possible, not exposed to the user yet | Plan / PRD |
| CI | Lint/unit/build only; `test:integration` local | No Docker-in-CI or service-role secret | Plan |
| User delete | `author_id ON DELETE CASCADE`; no Storage hook | No orphan rows; file cleanup waits for S-02 | Plan |

## Scope

**In scope:** Enums, `builds`, `build_parts`, RLS, private bucket and policies, seed file, generated types, local identity-matrix tests, doc/exception updates.

**Out of scope:** Actions, editor, catalog, likes, module folders, image magic-byte checks, CI RLS, forbidding `published → draft` in SQL.

## Architecture / Approach

One migration is the source of truth for schema, RLS, and Storage. Tests mint users A and B with the local service role, then call the Data API with the publishable key. Catalog SSR in S-02 will `createSignedUrl` after verifying `published`; F-01 only proves that policy works.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Schema, RLS, and private storage | Reset-able DB + private bucket | A weak Storage SELECT policy leaks draft photos |
| 2. Types, scripts, and docs | `database.types.ts`, local scripts, exception notes | Stale architecture docs mislead S-02 |
| 3. Local identity-matrix tests | Anon / A / B coverage | Tests using service role would fake a pass |

**Prerequisites:** Docker local Supabase (`npx supabase start`).
**Estimated effort:** ~2–3 sessions across 3 phases.

## Open Risks & Assumptions

- Hosted `db push` is a separate operator step from Worker deploy; this plan does not apply SQL in CI.
- Allowing `published → draft` in SQL means an author with the Data API and their own JWT can unpublish without a UI control. That is intended until a later slice ships the control; S-02 must not add an unpublish button.
- Local-only RLS tests can be skipped; Definition of Done still requires them before merge.

## Success Criteria (Summary)

- Draft rows and draft objects are invisible to everyone except the author.
- Published rows, parts, and main image are readable without an account.
- `npm run test:integration` passes on a fresh local reset.
