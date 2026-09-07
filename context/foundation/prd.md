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
- A visitor landing on the home page sees recently published builds and can reach the listing.

### Guardrails
- A user cannot edit or delete a build belonging to another user.
- Draft builds never appear on the home page, the public listing, in filters, or as public details for others.

## User Stories

### US-01: Register, log in, and log out

- **Given** a Visitor with no account
- **When** they register, log in, and later log out
- **Then** they become an Authenticated User for that session and return to Visitor after logout

#### Acceptance Criteria
- Registration and login do not require extra profile fields before a first publish
- After logout, create, edit, and like actions are not available until they log in again

### US-02: Create a draft and publish a build

- **Given** an Authenticated User with no published build yet
- **When** they create a build as a draft, then publish it
- **Then** the draft was visible only to them until publish; after publish the build appears on the public listing and has a public details page

#### Acceptance Criteria
- Draft does not appear on the home page, the public listing, or in filters
- After publish, the same user can still see it on their account area as published
- Another user cannot edit or delete it

### US-03: Browse published builds with filters

- **Given** a Visitor or Authenticated User on the public listing
- **When** they apply one or more filters (watch style, movement, dial colour, strap type, case size)
- **Then** they see only published builds that match every active filter

#### Acceptance Criteria
- Drafts never appear in listing results
- Combined filters use AND semantics
- Clearing filters restores the unfiltered published listing
- No matching builds shows an empty state, not another user's drafts

### US-04: View a published build's details

- **Given** a Visitor or Authenticated User who opened a published build from home, listing, or a direct link
- **When** they view the details page
- **Then** they see the main photo, name, author, story, watch attributes, parts list, and like count

#### Acceptance Criteria
- A draft's public details are not available to anyone except its author
- Optional product links and manual part prices appear when the author entered them
- The Build Author sees edit and delete actions; other people do not

### US-05: Like a published build

- **Given** an Authenticated User viewing a published build
- **When** they like it, then unlike it
- **Then** the like count increases by one, then returns to the previous count

#### Acceptance Criteria
- A Visitor cannot like without logging in
- The same user can have at most one like on a given build
- Like is the only save in this MVP — there is no separate favourite action
- Likes do not change listing or home-page order in this MVP

### US-06: See recent published builds on the home page

- **Given** a Visitor or Authenticated User opening the product
- **When** they land on the home page
- **Then** they see recently published builds and a path into the public listing (including by watch style)

#### Acceptance Criteria
- Home shows published builds only; drafts never appear
- Home does not rank by likes (no Popular, Best, Hot, or Build of the Week in this MVP)
- From home, the user can reach the listing and a published build's details

### US-07: Manage own builds from the account area

- **Given** an Authenticated User who already has at least one draft or published build
- **When** they open their account area, edit an existing build, or start a new one
- **Then** they see only their own builds and can add a new draft or change an existing one they own

#### Acceptance Criteria
- Account area lists the user's drafts and published builds
- Editing another user's build is not possible
- A new build started from the account area is created as a draft owned by that user

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
- FR-009: Anyone can open the home page and see recently published builds plus a path into the listing (including by watch style). Priority: must-have
  > Socrates: Counter-argument considered: "Home with Popular, recommended ranking, or Build of the Week is extra surface for a 1-week proving flow." Resolution: kept a home page as the landing entry; it shows recent published builds and listing entry points only. Popular, Best, Hot, Build of the Week, and similar-build recommendations stay deferred.
- FR-010: Anyone can open a published build's details and see its main photo, name, author, story, watch attributes, parts list, and like count. Priority: must-have
  > Socrates: No counter-argument; it stands as written. Gallery photos stay out (see Non-Goals).

### Likes
- FR-007: Authenticated User can like and unlike a published build; like count is visible. Like is the save — there is no separate favourite action or favourites listing in the MVP. Priority: must-have
  > Socrates: No counter-argument; it stands as written.

### Account
- FR-008: Authenticated User can open an account area showing their own published builds and drafts, and can start a new build from there. Priority: must-have
  > Socrates: No counter-argument; it stands as written.

## Non-Functional Requirements

- The product remains usable on phone-sized and desktop-sized screens.
- Creating an account does not block posting a first build: sign-in is simple and preferably passwordless (magic link or Google/Reddit SSO), with no extra profile fields required before publish.

## Business Logic

Published builds are the only ones the catalog shows; structured attributes (style, movement, dial, strap, size) decide what appears when someone filters.

The rule consumes the build's draft vs published status and the five filter attributes the author set. Its output is the public catalog: all published builds, or those that match every active filter. The user meets it on the home page (recent published builds), the listing (filter and browse), and on public details.

A like is both public appreciation and the user's only save in this MVP; unlike removes it. Likes do not change listing or home-page order in this MVP.

## Access Control

Sign-in: magic link or Google/Reddit SSO, preferably with no password. Logout is required. No extra profile fields are required before publishing a first build. Visitors can open the home page, browse published builds, and open published details without an account. Authenticated users can create and like. Only the Build Author can edit, publish, or delete their own builds. Unpublish/republish is out of the MVP. Draft builds are visible only to their author. No admin role in the MVP. Like is the save in the MVP — there is no separate favourite action.

## Non-Goals

- Search by name and Build Story — deferred; listing is filter-only in this MVP.
- Extra gallery photos — main photo only for this MVP.
- Similar/related-build recommendations — next phase, not this MVP.
- Comments, notifications, following users, private messages, forums, articles, events, and a marketplace — community extras outside the proving flow.
- Store integrations, live product prices, automatic build-cost totals, a visual watch configurator, and automatic part-compatibility checks — would replace author-entered parts/prices with a different product.
- Unpublish/republish — publish-once-or-delete is enough (FR-003 Socrates).
- A separate favourite action or favourites listing — like is the save (FR-007).
- Hot / Best / Popular / Build of the Week ranking — deferred to a later phase after the proving flow. Home in this MVP is recent published builds plus listing entry points, not a ranked or recommended shelf.
- An administration panel and manual Featured Builds — no admin role in the MVP.
- A native mobile application — this MVP is a responsive web app.

## Open Questions

(none)
