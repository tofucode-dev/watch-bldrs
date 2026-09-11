---
project: WatchBldrs
version: 1
status: draft
created: 2026-09-08
updated: 2026-09-11
prd_version: 1
main_goal: speed
top_blocker: time
milestone_id: proving-flow-publish-and-discover
milestone_seq: 1
milestone_status: open
---

# Roadmap: WatchBldrs

> Derived from `prd.md` (v1) + auto-researched codebase baseline + `architecture/` as the recorded target contract.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: Proving flow — publish and discover** — Status: open

- **Intent:** Deliver the primary success criterion: an enthusiast can sign in, publish a structured build, another person can filter it, and an authenticated user can like it. Sequence for speed — park anything not on that path.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** every F-NN and S-NN below is `done`.
- **Scope anchors:** FR-001–FR-010, US-01–US-07, Access Control, Non-Functional Requirements (phone and desktop; sign-in must not block a first publish).



## Vision recap

Custom-watch builds already exist on forums and Reddit, but they are hard to find and filter, and details like parts and prices are often missing. Structured attributes beat mixed threads. WatchBldrs is a dedicated place to present a finished build and to scan other people’s builds for parts, prices, and inspiration.

## North star

**S-02: user can create a draft, publish a structured build, and see it on the public listing and details page** — this is the validation milestone (the smallest end-to-end delivery that would prove the product’s core claim: a structured, filterable build record is better than a forum thread) and it sits as early as Prerequisites allow because a catalog without a real published build cannot prove anything. Speed puts this slice first among user-facing work.

> Here, **north star** means the smallest end-to-end slice whose successful delivery would prove that core claim — placed as early as Prerequisites allow because everything else only matters if this works.



## At a glance


| ID   | Change ID                    | Outcome (user can …)                                                                                                                                                     | Prerequisites | PRD refs                                                    | Status      |
| ---- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ----------------------------------------------------------- | ----------- |
| F-01 | build-visibility-and-storage | (foundation) builds and parts persist with author ownership, author-only drafts, SQL-allowed unpublish (no MVP UI), and private main-image storage                       | —             | Access Control; Success Criteria guardrails; FR-003, FR-004 | done        |
| S-01 | sign-in-and-session          | user can register, log in, and log out without extra profile fields; create, edit, and like stay gated after logout                                                      | —             | US-01, FR-001                                               | ready       |
| S-02 | publish-structured-build     | user can create a draft with watch attributes, parts list, and main photo, publish it, and see it on the public listing and details page; drafts stay hidden from others | F-01, S-01    | US-02, US-04, FR-002, FR-003, FR-004, FR-005, FR-010        | proposed    |
| S-03 | filter-published-listing     | user can filter the published listing by watch style, movement, dial colour, strap type, and case size with AND semantics                                                | S-02          | US-03, FR-002, FR-006                                       | proposed    |
| S-04 | like-published-build         | authenticated user can like and unlike a published build at most once; like count is visible                                                                             | S-01, S-02    | US-05, FR-007                                               | proposed    |
| S-05 | manage-own-builds            | authenticated user can open an account area of only their drafts and published builds, start a new draft, and edit or delete a build they own                            | S-02          | US-07, FR-003, FR-008                                       | proposed    |
| S-06 | home-recent-builds           | user landing on the home page sees recently published builds and can reach the listing, including by watch style                                                         | S-02          | US-06, FR-009                                               | proposed    |




## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.


| Stream | Theme                | Chain                             | Note                                                                                                           |
| ------ | -------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A      | Publish and discover | `F-01` → `S-02` → `S-03` → `S-06` | Speed path: persist, prove publish, then filters; home is the secondary landing on the same published catalog. |
| B      | Session and like     | `S-01` → `S-04`                   | Parallel with `F-01`; likes join Stream A at `S-02`.                                                           |
| C      | Account              | `S-05`                            | Joins Stream A at `S-02`.                                                                                      |




## Baseline

What's already in place in the codebase as of `2026-09-08` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — page routing, interactive islands, and a starter component library are wired (`astro.config.mjs`, `src/components/ui`).
- **Backend / API:** present — server-rendered app with session middleware and sign-in/up/out HTTP handlers; grouped UI mutations are not introduced yet.
- **Data:** present — migrations for `builds`, `build_parts`, RLS, and private `build-images` Storage; generated types in `src/lib/database.types.ts`; integration tests under `tests/integration/`.
- **Auth:** present — cookie session, register/log in/log out, and route guards exist (currently password-based; PRD prefers magic link or Google/Reddit SSO).
- **Deploy / infra:** present — production host, deploy config, and CI deploy-on-merge are wired.
- **Observability:** partial — platform request observability is on; no application error-tracking product.
- **Architecture contract (added):** documented, not implemented — `architecture/` records module boundaries (`auth`, `builds`, `catalog`, `likes`), access rules, publication state, storage, and catalog query rules; those product modules are not in the codebase yet.



## Foundations



### F-01: Build visibility and private main-image storage

- **Outcome:** (foundation) builds and parts persist with author ownership, author-only drafts, SQL-allowed unpublish (no MVP UI control), and private main-image storage.
- **Change ID:** build-visibility-and-storage
- **PRD refs:** Access Control; Success Criteria guardrails; FR-003, FR-004
- **Unlocks:** S-02 (and therefore S-03, S-04, S-05, S-06); the draft-privacy guardrail that catalog slices must not violate
- **Prerequisites:** —
- **Parallel with:** S-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sequenced first because draft privacy and ownership cannot be bolted on after a public listing exists; this is the minimum persistence contract, not a finished data platform — S-02 still has to create, upload, and publish through a real user flow.
- **Status:** done



## Slices



### S-01: Sign in and session

- **Outcome:** user can register, log in, and log out without extra profile fields; create, edit, and like stay gated after logout.
- **Change ID:** sign-in-and-session
- **PRD refs:** US-01, FR-001
- **Prerequisites:** —
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:**
  - Keep the existing password sign-in for the proving flow, or switch now to magic link / Google / Reddit SSO as Access Control prefers? — Owner: user. Block: no.
- **Risk:** Auth already exists, so this slice stays thin on purpose; blocking it on provider choice would burn calendar time the deadline does not have.
- **Status:** ready



### S-02: Publish a structured build

- **Outcome:** user can create a draft with watch attributes, parts list, and main photo, publish it, and see it on the public listing and details page; drafts stay hidden from others.
- **Change ID:** publish-structured-build
- **PRD refs:** US-02, US-04, FR-002, FR-003, FR-004, FR-005, FR-010
- **Prerequisites:** F-01, S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** This is the north star — if structured publish plus a public record fails, filters and likes have nothing to show. Listing here is unfiltered; five-filter AND behavior waits for S-03 so this slice stays one authoring-and-appear flow. Must remain usable on phone-sized and desktop-sized screens.
- **Status:** proposed



### S-03: Filter the published listing

- **Outcome:** user can filter the published listing by watch style, movement, dial colour, strap type, and case size with AND semantics.
- **Change ID:** filter-published-listing
- **PRD refs:** US-03, FR-002, FR-006
- **Prerequisites:** S-02
- **Parallel with:** S-04, S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Empty combined results are an accepted PRD risk — handle as an empty state, do not drop filters. Drafts must never leak into results. Sequenced right after the north star because “another person can filter” is on the primary success criterion.
- **Status:** proposed



### S-04: Like a published build

- **Outcome:** authenticated user can like and unlike a published build at most once; like count is visible.
- **Change ID:** like-published-build
- **PRD refs:** US-05, FR-007
- **Prerequisites:** S-01, S-02
- **Parallel with:** S-03, S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Likes persist only in this slice (not in F-01) so engagement is not built before a public build exists. Likes must not change listing or home order. Visitors cannot like without logging in.
- **Status:** proposed



### S-05: Manage own builds

- **Outcome:** authenticated user can open an account area of only their drafts and published builds, start a new draft, and edit or delete a build they own.
- **Change ID:** manage-own-builds
- **PRD refs:** US-07, FR-003, FR-008
- **Prerequisites:** S-02
- **Parallel with:** S-03, S-04, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Create-and-publish already landed in S-02; this slice is the author’s home for many builds, not a second editor. Another user must still be unable to edit or delete. After publish, the author still sees the build here as published.
- **Status:** proposed



### S-06: Home shows recent published builds

- **Outcome:** user landing on the home page sees recently published builds and can reach the listing, including by watch style.
- **Change ID:** home-recent-builds
- **PRD refs:** US-06, FR-009
- **Prerequisites:** S-02
- **Parallel with:** S-03, S-04, S-05
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Secondary success criterion — sequenced after the north star, not before it. Home is recency only; Popular / Best / Hot / Build of the Week stay parked. Drafts never appear.
- **Status:** proposed



## Backlog Handoff


| Roadmap ID | Change ID                    | Suggested issue title                                                        | Ready for `/10x-plan` | Notes                                                        |
| ---------- | ---------------------------- | ---------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------ |
| F-01       | build-visibility-and-storage | Persist builds with ownership, private main image, and SQL-allowed unpublish | yes                   | Unlocks the north star S-02                                  |
| S-01       | sign-in-and-session          | Register, log in, and log out without extra profile fields                   | yes                   | Parallel with F-01; sign-in method is a non-blocking unknown |
| S-02       | publish-structured-build     | Create a draft, publish a structured build, and show it publicly             | no                    | Needs F-01 and S-01                                          |
| S-03       | filter-published-listing     | Filter published builds with five AND filters                                | no                    | Needs S-02                                                   |
| S-04       | like-published-build         | Like and unlike a published build once                                       | no                    | Needs S-01 and S-02                                          |
| S-05       | manage-own-builds            | Account area to list, start, edit, and delete own builds                     | no                    | Needs S-02                                                   |
| S-06       | home-recent-builds           | Home page of recent published builds plus listing entry                      | no                    | Needs S-02                                                   |


This table is the clean handoff to Jira/Linear or any MCP-backed backlog. Include one row for every `F-NN` and `S-NN`. It should be compact enough to copy into issues, but it must not duplicate the detailed roadmap body.

## Open Roadmap Questions

1. **Keep existing password sign-in for the proving flow, or switch now to magic link / Google / Reddit SSO?** — Owner: user. Block: none (S-01 records this as a non-blocking unknown so planning can start).



## Parked

- **Search by name and Build Story** — Why parked: PRD §Non-Goals; listing is filter-only in this MVP.
- **Extra gallery photos** — Why parked: PRD §Non-Goals; main photo only.
- **Similar/related-build recommendations** — Why parked: PRD §Non-Goals; next phase.
- **Comments, notifications, following, private messages, forums, articles, events, and a marketplace** — Why parked: PRD §Non-Goals; community extras outside the proving flow.
- **Store integrations, live product prices, automatic build-cost totals, a visual watch configurator, and automatic part-compatibility checks** — Why parked: PRD §Non-Goals; would replace author-entered parts/prices.
- **Unpublish/republish** — Why parked: PRD §Non-Goals; publish-once-or-delete is enough (FR-003).
- **A separate favourite action or favourites listing** — Why parked: PRD §Non-Goals; like is the save (FR-007).
- **Hot / Best / Popular / Build of the Week ranking** — Why parked: PRD §Non-Goals; home is recency plus listing entry points.
- **An administration panel and manual Featured Builds** — Why parked: PRD §Non-Goals; no admin role in the MVP.
- **A native mobile application** — Why parked: PRD §Non-Goals; this MVP is a responsive web app.



## Milestone History

(No closed milestones yet.)

## Done

- **F-01: (foundation) builds and parts persist with author ownership, author-only drafts, SQL-allowed unpublish (no MVP UI control), and private main-image storage** — Archived 2026-09-11 → `context/archive/2026-09-09-build-visibility-and-storage/`. Lesson: —.