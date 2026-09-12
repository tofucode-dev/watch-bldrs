# Authoring Form Components — Plan Brief

> Full plan: `context/changes/authoring-form-components/plan.md`
> Research: `context/changes/authoring-form-components/research.md`

## What & Why

S-02 must compose a Build Form (watch attributes + parts list + sticky save) without inventing widgets, and without waiting on photo upload. F-02 puts those domain-free controls in the shared UI library so create-draft and later edit (S-09) reuse one kit.

## Starting Point

The kit is `Button` plus an auth-only `FormField` (required icon, weak ARIA). No Field/Input/Select, no `src/modules/builds`, no Actions, Vitest is Node-only. Persistence and enums already landed in F-01; display copy and validation stay S-02.

## Desired End State

S-02 can assemble name, story, five optional attribute selects, case size, a repeating parts row, and sticky Discard/Save Draft from `@/components/ui`. Photo remains an empty slot for F-03. There is still no create page and no persistence from this change.

## Key Decisions Made

| Decision            | Choice                                      | Why (1 sentence)                                                                 | Source   |
| ------------------- | ------------------------------------------- | -------------------------------------------------------------------------------- | -------- |
| Kit inventory       | Primitives + slot PartsRow + StickyActionBar | Design-system.md assigned row + bar to F-02 without composing BuildForm          | Plan     |
| Money pair          | Two controls, no `MoneyField`               | Pair invariant and ISO lists are domain; kernel stays generic                    | Research |
| Select              | shadcn/Radix + `OptionsSelect` wrapper      | Matches new-york; wrapper owns `{ value, label }[]` and unset                    | Plan     |
| Unset attributes    | Caller empty option → `onValueChange("")`   | FR-004 optional fields must be clearable; Radix cannot use `Select.Item value=""` | Plan     |
| Tests               | jsdom + Testing Library, `*.test.tsx` only  | DoD wants component tests; Node unit/integration tests must stay Node            | Plan     |
| Look                | Token-faithful; cheap tweaks only           | Reuse `global.css`; skip expensive mockup chrome (photo, preview, section cards) | Plan     |
| Auth FormField      | Leave as-is                                 | Icon slot is auth-specific; out of slice                                         | Research |
| RHF / shadcn Form   | Not in F-02                                 | Primitives stay controlled `value`/`onChange` for S-02                           | Research |
| Photo / preview     | Out                                         | F-03 and F-04/S-02                                                               | Research |

## Scope

**In scope:** Field, Input, Textarea, Label, Select, `OptionsSelect`, PartsRow, StickyActionBar, simple token tweaks, jsdom component tests.

**Out of scope:** Photo upload, BuildForm page, Actions, enums, MoneyField, preview card, auth migration, `src/modules/builds`, Playwright, committed `/dev` route.

## Architecture / Approach

CLI-add shadcn `new-york` Field/Input/Textarea/Label/Select into `src/components/ui`. Wrap Select as `OptionsSelect` (options array + empty-option sentinel). Custom layout composites for PartsRow (caller cells + responsive labels) and StickyActionBar (status/secondary/primary, `--sticky`). S-02 later hydrates one editor island and maps enums onto `OptionsSelect`.

## Phases at a Glance

| Phase | What it delivers                                      | Key risk                                      |
| ----- | ----------------------------------------------------- | --------------------------------------------- |
| 1. Primitives + harness | Field kit, OptionsSelect, tokens, jsdom tests | Radix empty-value; jsdom leaking into Node tests |
| 2. Row + sticky bar     | PartsRow + StickyActionBar + tests                    | Domain leaking into cell API; mobile stack    |

**Prerequisites:** F-01 done (contract only). No runtime dependency on F-03/S-01.
**Estimated effort:** ~2 sessions across 2 phases.

## Open Risks & Assumptions

- Radix Select version from the shadcn CLI may still forbid empty item values — the wrapper sentinel is mandatory until proven otherwise.
- Sticky `position` (viewport vs form container) may need a one-line tweak in S-02 once the page exists.
- Visual match will not be pixel-perfect; section cards, photo well, and preview stamps are accepted gaps.

## Success Criteria (Summary)

- S-02 can compose every non-photo Build Form control from `@/components/ui` without copying auth `FormField`.
- Optional selects can be cleared; parts rows stack on a phone-sized screen; sticky bar is presentational.
- Component tests plus lint/test/build pass; no modules, Actions, or photo widget shipped.
