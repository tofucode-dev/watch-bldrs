---
change_id: show-public-builds
title: Show public builds
status: planned
created: 2026-09-14
updated: 2026-09-14
archived_at: null
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

- `show-public-builds` can be implemented and verified independently by seeding published rows against the existing schema. S-03 is needed only for the later user-driven publish-to-catalog proving flow; publishing remains outside this change.
- The roadmap was already dirty before planning, including malformed frontmatter and an inconsistent S-04 prerequisite cell. This planning pass changes only the S-04 status fields required by `/10x-plan`.
