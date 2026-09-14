---
change_id: manage-own-builds
title: Manage own builds
status: implementing
created: 2026-09-14
updated: 2026-09-14
archived_at: null
---

## Notes

Use [user-dashboard.png](./user-dashboard.png) as a reference for the new dashboard. You can reuse already existing  card component just change the CTAs to Edit and View if its published or Publish if its not published.

Builds should be available under /dashboard route replacing the current one. 

New build should be moved to /dashboard/builds/new route. edit as well /dashboard/builds/edit/:id route.

There should be a remove button in a action bar. It should remove build after confirmation.

Account Navigation should be renamed to Dashboard.

YOu can use the same pagination logic as in the listing page for now. But that view is unlikely to have much items.

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->
