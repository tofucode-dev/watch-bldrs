---
project: WatchBldrs
version: 1
status: active
created: 2026-09-08
updated: 2026-09-08
roadmap_version: 1
workspace: TofuCode
team: TofuCode
team_key: TOF
linear_project: WatchBldrs
milestone_id: proving-flow-publish-and-discover
---

# Linear task mapping: WatchBldrs

> Execution backlog for `context/foundation/roadmap.md` (v1).
> Slice outcomes, PRD refs, and sequencing stay in the roadmap. This file is the Linear identifier map.
> Edit-in-place when issues are created, retargeted, or a milestone closes.

## Workspace

| Field | Value |
| --- | --- |
| Workspace | [TofuCode](https://linear.app/tofucode) |
| Team | TofuCode (`TOF`) |
| Project | [WatchBldrs](https://linear.app/tofucode/project/watchbldrs-bb30ddacc4c5) |
| Milestone | M-1: Proving flow — publish and discover (target 2026-09-13) |
| Assignee | Pawel Czubak |

Parked PRD non-goals are not Linear issues.

## Mapping rules

One Linear issue per roadmap `F-NN` / `S-NN` row. Do not split a slice into sub-issues unless the roadmap itself is updated.

| Roadmap field | Linear field |
| --- | --- |
| ID + suggested issue title | Title: `[F-01] …` / `[S-02] …` |
| Outcome, Change ID, PRD refs, prerequisites, risk, `/10x-plan` readiness | Issue description (Markdown sections) |
| Status `ready` | **Todo** |
| Status `proposed` | **Backlog** |
| Status `done` | **Done** |
| Prerequisites | `blockedBy` relations |
| Work kind | Label `Feature` (keep `Bug` / `Improvement` for later non-slice work) |
| `F-NN` vs `S-NN` | Label group **Type** |
| Owning module | Label group **Domain** |
| Roadmap stream | Label group **Stream** |
| North star (S-02) | Standalone label `north-star` |
| Open roadmap unknown | Standalone label `roadmap-question` |
| Milestone M-1 | Project milestone `M-1: Proving flow — publish and discover` |

Priority (speed path): S-02 Urgent; F-01, S-01, S-03, S-04 High; S-05, S-06 Medium.

When a Linear issue moves to **Done**, set the matching row in `roadmap.md` to `done`. Do not treat Linear as a second product spec.

## Label convention

Linear label groups render as `Type: slice`, `Domain: builds`, `Stream: account`. Apply **one Type**, **one Domain**, and **one Stream** on every proving-flow issue. Add extras only when they apply.

| Group / label | Values | Rule |
| --- | --- | --- |
| Type | `foundation`, `slice` | `F-NN` → `foundation`; `S-NN` → `slice` |
| Domain | `auth`, `builds`, `catalog`, `likes` | Owning module from `architecture/modules.md` (plural `builds`, not `build`) |
| Stream | `publish-and-discover`, `session-and-like`, `account` | Roadmap streams A / B / C |
| `north-star` | standalone | Only S-02 |
| `roadmap-question` | standalone | Issue has a non-blocking unknown still owned by a person |

Do not invent extra Type/Domain/Stream values for this milestone. Filter views by group, not by title prefix.

## Current issues

| Roadmap ID | Change ID | Linear | Status | Priority | Blocked by |
| --- | --- | --- | --- | --- | --- |
| F-01 | `build-visibility-and-storage` | [TOF-6](https://linear.app/tofucode/issue/TOF-6) | Todo | High | — |
| S-01 | `sign-in-and-session` | [TOF-5](https://linear.app/tofucode/issue/TOF-5) | Todo | High | — |
| S-02 | `publish-structured-build` | [TOF-7](https://linear.app/tofucode/issue/TOF-7) | Backlog | Urgent | TOF-6, TOF-5 |
| S-03 | `filter-published-listing` | [TOF-8](https://linear.app/tofucode/issue/TOF-8) | Backlog | High | TOF-7 |
| S-04 | `like-published-build` | [TOF-9](https://linear.app/tofucode/issue/TOF-9) | Backlog | High | TOF-5, TOF-7 |
| S-05 | `manage-own-builds` | [TOF-10](https://linear.app/tofucode/issue/TOF-10) | Backlog | Medium | TOF-7 |
| S-06 | `home-recent-builds` | [TOF-11](https://linear.app/tofucode/issue/TOF-11) | Backlog | Medium | TOF-7 |

Ready to plan in parallel: **TOF-6** (F-01) and **TOF-5** (S-01). Everything else waits on **TOF-7** (S-02), except S-04 which also waits on S-01.

### Labels applied

| Issue | Type | Domain | Stream | Extra |
| --- | --- | --- | --- | --- |
| TOF-6 F-01 | foundation | builds | publish-and-discover | — |
| TOF-5 S-01 | slice | auth | session-and-like | `roadmap-question` |
| TOF-7 S-02 | slice | builds | publish-and-discover | `north-star` |
| TOF-8 S-03 | slice | catalog | publish-and-discover | — |
| TOF-9 S-04 | slice | likes | session-and-like | — |
| TOF-10 S-05 | slice | builds | account | — |
| TOF-11 S-06 | slice | catalog | publish-and-discover | — |

All of the above also keep `Feature`.

## Streams (Linear)

Same chains as the roadmap. Canonical order is `blockedBy`, not this table.

| Stream | Theme | Label | Issues |
| --- | --- | --- | --- |
| A | Publish and discover | `publish-and-discover` | TOF-6 → TOF-7 → TOF-8 → TOF-11 |
| B | Session and like | `session-and-like` | TOF-5 → TOF-9 (joins Stream A at TOF-7) |
| C | Account | `account` | TOF-10 (joins Stream A at TOF-7) |
