---
project: WatchBldrs
version: 1
status: draft
created: 2026-09-07
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 1
  hard_deadline: 2026-09-14
  after_hours_only: false
---

## Vision & Problem Statement

Custom-watch builds already exist on forums and Reddit, but they are hard to find and filter, and details like which parts were used and what they cost are often missing. Watch-modification enthusiasts who want to present a finished build, or scan other people’s builds for parts, prices, and inspiration, instead land in mixed threads that also include questions about building watches and finding parts.

Structured attributes beat threads. Dedicated discovery (filters and ranking) is a better way to browse builds than a general forum that mixes build showcases with Q&A. At 100x this user scale, five AND filters and no ranking would hide good builds — ranking would start to matter.

## User & Persona

**Primary persona:** Hobbyist watch-modification enthusiast — an individual who assembles or modifies watches, across many communities, not inside one organization.

They reach for WatchBldrs when they want to publish a structured record of a build (parts, prices, story) or when they want to find comparable builds without wading through Reddit/forum threads.

## Success Criteria

### Primary
- An enthusiast can register, log in, create a structured build (main photo, watch attributes, parts list with optional manual prices, story), publish it, see it on the listing page and details page; another person can filter the listing; an authenticated user can like the build.

### Secondary
- That same flow works on phone-sized screens.

### Guardrails
- A user cannot edit or delete a build belonging to another user.
- Draft builds never appear on the public listing, in filters, or as public details for others.

## User Stories

### US-01: Create a draft and publish from the account area

- **Given** an Authenticated User with no published build yet
- **When** they create a build as a draft, see it on their account area, then publish it
- **Then** the draft was visible only to them until publish; after publish the build appears on the public listing and has a public details page

#### Acceptance Criteria
- Draft does not appear on the public listing or in filters
- After publish, the same user can still see it on the account area as published
- Another user cannot edit or delete it

## Functional Requirements

### Authentication and access
- FR-001: Visitor can register, log in, and log out. Priority: must-have
  > Socrates: Counter-argument considered: "Registration that is too complicated would stop the user from posting their build." Resolution: kept; sign-in is magic link or Google/Reddit SSO, preferably with no password, and no extra profile fields before publish.
- FR-002: Visitor can browse the published-build listing and open published details without an account. Priority: must-have
  > Socrates: Counter-argument considered: "Too granular filters would cause many empty results when few builds exist; empty results are discouraging." Resolution: kept public browse; empty-result risk is addressed under FR-006 rather than by gating the catalog behind login.

### Builds
- FR-003: Authenticated User can create, edit, and delete only their own builds. Priority: must-have
  > Socrates: Counter-argument considered: "Unpublish/republish is extra surface — publish-once-or-delete is enough for MVP." Resolution: revised; unpublish/republish removed from the MVP. Draft vs published remains for first publish (FR-004).
- FR-004: Build Author can set name, story, watch attributes (including hands style), main photo, and draft vs published. Not every field is required. Priority: must-have
  > Socrates: Counter-argument considered: "Too many required fields would stop the user from adding a build, but putting everything in one bulk description would limit later filtering." Resolution: kept structured attributes; they are not all required, so the form does not block posting.
- FR-005: Build Author can add a parts list with category, name, optional product link, and optional manual price and currency. Priority: must-have
  > Socrates: Counter-argument considered: "Product links will rot and the parts list will look untrustworthy." Resolution: kept; product links stay optional so authors can omit them.

### Discovery
- FR-006: Anyone can filter published builds by watch style (primary), movement, dial colour, strap type, and case size. Priority: must-have
  > Socrates: Counter-argument considered: "AND-combining five filters will mostly show empty states on a small catalog." Resolution: kept the five filters (style first); empty combined results are an accepted risk to handle as an empty state, not by dropping filters.

### Likes
- FR-007: Authenticated User can like and unlike a published build; like count is visible. Like is the save — there is no separate favourite action or favourites listing in the MVP. Priority: must-have
  > Socrates: No counter-argument; it stands as written.

### Account
- FR-008: Authenticated User can open an account area showing their own published builds and drafts. Priority: must-have
  > Socrates: No counter-argument; it stands as written.

## Non-Functional Requirements

- The product remains usable on phone-sized and desktop-sized screens.
- Creating an account does not block posting a first build: sign-in is simple and preferably passwordless (magic link or Google/Reddit SSO), with no extra profile fields required before publish.

## Business Logic

Published builds are the only ones the catalog shows; structured attributes (style, movement, dial, strap, size) decide what appears when someone filters.

The rule consumes the build's draft vs published status and the five filter attributes the author set. Its output is the public catalog: all published builds, or those that match every active filter. The user meets it on the listing (filter and browse) and on public details.

A like is both public appreciation and the user's only save in this MVP; unlike removes it. Likes do not change listing order in this MVP.

## Access Control

Sign-in: magic link or Google/Reddit SSO, preferably with no password. Logout is required. No extra profile fields are required before publishing a first build. Visitors can browse published builds without an account. Authenticated users can create and like. Only the Build Author can edit, publish, or delete their own builds. Unpublish/republish is out of the MVP. Draft builds are visible only to their author. No admin role in the MVP. Like is the save in the MVP — there is no separate favourite action.

## Non-Goals

- Search by name and Build Story — deferred; listing is filter-only in this MVP.
- Extra gallery photos — main photo only for this MVP.
- Similar/related-build recommendations — next phase, not this MVP.
- Comments, notifications, following users, private messages, forums, articles, events, and a marketplace — community extras outside the proving flow.
- Store integrations, live product prices, automatic build-cost totals, a visual watch configurator, and automatic part-compatibility checks — would replace author-entered parts/prices with a different product.
- Unpublish/republish — publish-once-or-delete is enough (FR-003 Socrates).
- A separate favourite action or favourites listing — like is the save (FR-007).
- Hot / Best / Popular / Build of the Week ranking — deferred to a later phase after the proving flow.
- An administration panel and manual Featured Builds — no admin role in the MVP.
- A native mobile application — this MVP is a responsive web app.

## Open Questions

(none)
