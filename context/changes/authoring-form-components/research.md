---
date: "2026-09-11T23:17:36+02:00"
researcher: Cursor Grok
git_commit: 96dfd93014bc0c8f0bc72587cf7a944d296f922a
branch: main
repository: tofucode-dev/watch-bldrs
topic: "F-02 Authoring form components — shared UI kit for the Build Form"
tags:
  [
    research,
    codebase,
    shadcn,
    forms,
    ui,
    builds,
    f-02,
  ]
status: complete
last_updated: "2026-09-11"
last_updated_by: Cursor Grok
---

# Research: F-02 — Authoring form components

**Date**: 2026-09-11T23:17:36+02:00
**Researcher**: Cursor Grok
**Git Commit**: 96dfd93014bc0c8f0bc72587cf7a944d296f922a
**Branch**: main
**Repository**: tofucode-dev/watch-bldrs

## Research Question

What already exists for form UI, and what must F-02 add to the shared UI library so S-02 can compose the Build Form (watch attributes + parts list) without inventing widgets — while leaving photo upload to F-03 and persistence/Actions to S-02?

## Summary

The shared UI library is **one shadcn primitive**: [`Button`](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/src/components/ui/button.tsx). Auth screens use a **one-off** [`FormField`](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/src/components/auth/FormField.tsx) (raw `<input>` + required icon slot), not a reusable kit. There is no `src/modules/`, no `src/actions/`, no `react-hook-form` / Zod, and no React component-test harness (Vitest is Node-only; `@testing-library/react` is not installed).

F-02 should add **domain-free** shadcn `new-york` primitives under `src/components/ui` — at minimum **Field** (label + control + error), **Input**, **Textarea**, and a **Select that accepts `{ value, label }[]`**. **Button already exists.** Enum display copy, option lists, `BuildForm`, `PartsListEditor`, photo upload, Actions, and pages are **out**. Tokens (`--input`, `--ring`, `--destructive`) already live in [`src/styles/global.css`](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/src/styles/global.css). Persistence contract (enums, length limits, price+currency pair) landed in F-01 and is ready for S-02 to map onto these widgets.

Roadmap: F-02 is `ready`, parallel with F-03 / F-04 / S-01; it unlocks S-02 and S-09 ([roadmap F-02](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/context/foundation/roadmap.md)). `tasks-linear.md` still maps the **old** slice IDs — there is no Linear issue for F-02.

## Detailed Findings

### 1. F-02 scope vs adjacent slices

| Concern | Owner | Implication for F-02 |
| --- | --- | --- |
| Domain-free form primitives in `src/components/ui` | F-02 | In scope |
| Photo-upload control and Storage attach | F-03 | Out — F-02 outcome text is explicit |
| Compose Build Form, persist draft, Actions, create page | S-02 | Out — consumes the kit |
| Publish control | S-03 | Out |
| Edit page wiring (same form) | S-09 | Out — “do not invent a second form kit” |
| Listing Cards / Labels / Badges / Tags | F-04 | Out — parallel foundation |
| Filter widgets | F-05 | Out |
| Home chrome | F-06 | Out |
| Unpublish UI | PRD Non-Goals | Out — SQL allows `published → draft`; MVP UI does not |
| `BuildForm` / `PartsListEditor` | `builds` presentation (S-02) | Out of the shared kernel |

PRD anchors: [FR-004](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/context/foundation/prd.md) (name, story, watch attributes including hands style, main photo, draft vs published; **not every field required**); [FR-005](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/context/foundation/prd.md) (parts list: category, name, optional product link, optional manual price + currency). NFR: usable on phone-sized and desktop-sized screens.

Roadmap risk line: after F-02, S-02 still has to compose the actual draft form and persist a build. Photo upload is F-03, not this foundation.

### 2. Shared UI library today is Button only

[`components.json`](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/components.json): style `new-york`, `rsc: false`, `tsx: true`, Tailwind 4 CSS-first (`src/styles/global.css`), aliases `ui` → `@/components/ui`, icon library `lucide`.

[`src/components/ui/`](https://github.com/tofucode-dev/watch-bldrs/tree/96dfd93014bc0c8f0bc72587cf7a944d296f922a/src/components/ui):

| File | Status |
| --- | --- |
| `button.tsx` | shadcn primitive; `cva` variants + `cn()`; `@radix-ui/react-slot` `asChild` |
| `LibBadge.astro` | unused starter badge; **not** shadcn; not a form control |

Add path (documented, no npm script): `npx shadcn@latest add [name]` ([AGENTS.md](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/AGENTS.md)).

**Missing typical form primitives:** Input, Label, Textarea, Select, Combobox, Checkbox, RadioGroup, Switch, Form (react-hook-form), Field, Card, Dialog, Popover, DropdownMenu, Separator, Badge (shadcn), Table.

Direct dependencies: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`. **No** form-related Radix packages, **no** `react-hook-form`, **no** Zod as an app dependency.

[`cn()`](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/src/lib/utils.ts#L4-L6) is already the required class merger. Call sites today: `button.tsx` and auth `FormField.tsx` only.

### 3. Existing forms are auth-only and not a kit

| Form | Mechanism | Notes |
| --- | --- | --- |
| Sign-in / sign-up | React island `client:load` + `POST /api/auth/*` | Controlled state; `noValidate`; hand-rolled `validate()` |
| Sign-out | Native Astro `<form>` | Custom `<button>`, not shadcn `Button` |

Only two `client:*` sites in the repo: [`signin.astro`](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/src/pages/auth/signin.astro), [`signup.astro`](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/src/pages/auth/signup.astro). Runtime wants the **Build editor** as a small React island and mutations via **Astro Actions** — neither exists yet. AGENTS.md prefers Actions for new UI mutations; existing auth endpoints may stay endpoint-based.

Auth widgets live under `src/components/auth/` (feature), not `src/components/ui/`:

- [`FormField.tsx`](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/src/components/auth/FormField.tsx) — **required `icon` slot**, `pl-10` padding, raw `<label>`/`<input>`, error `<p>` not wired with `aria-invalid` / `aria-describedby`
- `SubmitButton` — wraps shadcn `Button` + `useFormStatus`
- `ServerError`, `PasswordToggle`

Do **not** promote auth `FormField` into the shared kit. A parts row and a 4000-char story field do not want a mandatory leading icon. Leave auth as-is in F-02.

Validation today: client regex/length only; API routes cast `form.get(...) as string` with no Zod. Server errors via `?error=` query (fields reset on remount). F-02 Field must be able to **display** error/hint text; authoritative validation is the S-02 Action boundary ([security.md Actions pipeline](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/context/foundation/architecture/security.md)).

### 4. Field inventory the kit must cover (not compose)

Postgres enums are lowercase snake_case; **S-02 maps display copy** ([data-model.md](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/context/foundation/architecture/data-model.md)). F-02 Select takes options in; it does not own dictionaries.

#### Build header (`builds`)

| Form field | DB | Required? | Widget |
| --- | --- | --- | --- |
| Name | `name` text, max 120 | No | Input text |
| Build Story | `story` text, max 4000 | No | Textarea |
| Watch Style | `watch_style` enum \| null | No | Select (options in) |
| Movement | `movement` enum \| null | No | Select |
| Dial Colour | `dial_colour` enum \| null | No | Select |
| Strap Type | `strap_type` enum \| null | No | Select |
| Hands Style | `hands_style` enum \| null | No | Select (not a catalog filter) |
| Case Size | `case_size_mm` int 20–70 when set | No | Input number |
| Main Photo | `main_image_path` | No | **F-03 file/photo** |
| Status | `build_status` default `draft` | Implicit | **Not a widget** — create stays draft (S-02); publish is S-03 |

Enum labels (stored): `watch_style` diver/field/dress/gmt/pilot/integrated/other; `movement` nh35/nh36/nh34/miyota_8215/other; `dial_colour` black/white/blue/green/silver/other; `strap_type` leather/nato/rubber/steel_bracelet/other; `hands_style` mercedes/sword/dauphine/baton/other. Every attribute enum includes `other`. `build_status` does not — do not render a status Select in F-02.

#### Parts list (`build_parts`) — repeating row

Zero parts is allowed. If a row exists: `category` + `name` + `position` required.

| Form field | DB | Required on row? | Widget |
| --- | --- | --- | --- |
| Category | `part_category` NOT NULL | Yes | Select |
| Name | `name` text, max 120 | Yes | Input text |
| Product Link | `product_url` max 2048 | No | Input url |
| Price + currency | `price_amount_minor` ≥ 0 + `char(3)` ISO | No, **both or neither** | Money pair (amount + code) |
| Position | `integer` ≥ 0, unique per build | Yes (system) | Implicit row index; drag-and-drop not specified |

SQL pair constraint: `(price_amount_minor IS NULL) = (currency IS NULL)` in [`20260910201541_build_visibility_and_storage.sql`](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/supabase/migrations/20260910201541_build_visibility_and_storage.sql). Currency is **not** an enum. Display major units; persist integer **minor units** (S-02 conversion). No automatic build total (PRD Non-Goals).

Part categories: movement, case, dial, hands, bezel, crystal, strap, bracelet, other.

Parts UX the **kit must make composable**, not implement: add/remove rows (Button exists), stacked layout on ~390px viewports, Field-level error text. The both-or-neither rule is a **domain invariant** (testing.md unit list) — Field shows errors; it does not encode the pair.

### 5. Placement: shared kernel, not `src/modules/builds`

[modules.md](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/context/foundation/architecture/modules.md):

- Shared kernel: `src/lib/`, `src/components/ui/`, `src/types.ts`
- “Shared, domain-free primitives remain in `src/components/ui`; feature components remain in their module”
- `editor` / `form` are presentation slices **inside** modules, not top-level domains
- Do not create empty layer directories

AGENTS incremental adoption: first **business feature** under `src/modules/builds` — that is S-02, not a widget dump. F-01 archive explicitly deferred `src/modules/builds` scaffolding and Actions to S-02.

F-02 imports: `@/components/ui/...` (shadcn `ui` alias). `@/modules/builds` does not exist and should not be created only to hold primitives.

Runtime state: form draft while editing = local React/form state; add a client store only if ≥2 islands share it. F-02 primitives are presentational; they are not a store.

### 6. Accessibility, tokens, and responsive bar

AGENTS.md: associated labels, keyboard access, visible focus, understandable error text; `cn()`; mobile-first; hydrate the smallest island.

Auth already uses `--input` / `--ring` / `--destructive` via Tailwind tokens in [`global.css`](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/src/styles/global.css). Button already styles `aria-invalid`. New primitives should inherit the same tokens rather than inventing a second visual language.

Practical F-02 bar: every control works with Field + `htmlFor`/`id`, keyboard, visible focus, error text, stacked on a phone-sized viewport — including a parts row of select + text + url + money pair. Loading/empty/success/authorization **flow** states belong to the S-02 page, but Field must support validation-error display and preserve values (caller-controlled).

### 7. Testing gap

[testing.md Component](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/context/foundation/architecture/testing.md): editor validation and preservation of submitted values; keyboard and focus. DoD: UI-only changes include **component or E2E** tests.

Current harness:

- [`vitest.config.ts`](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/vitest.config.ts) — `environment: "node"`; include `src/**/*.{test,spec}.{ts,tsx}`
- No `*.test.tsx`
- No `@testing-library/react`, no jsdom/happy-dom configured
- No Playwright / `tests/e2e/`
- Integration tests exist for RLS/Storage only — **not** required for F-02

F-02 component tests would be **net-new tooling** (jsdom or equivalent + Testing Library), or the plan must justify deferring editor tests to S-02 (when there is a form to preserve values in) and still satisfy DoD with a thin primitive test.

### 8. Lessons prior

[`lessons.md`](https://github.com/tofucode-dev/watch-bldrs/blob/96dfd93014bc0c8f0bc72587cf7a944d296f922a/context/foundation/lessons.md): exclude generated Database types from ESLint. Not a form-kit rule. shadcn CLI output is source, not generated-types; do not add a parallel ignore unless lint actually fails.

## Code References

- `context/foundation/roadmap.md` — F-02 outcome/risk; unlocks S-02, S-09; photo = F-03; Baseline “no shared form kit”
- `context/foundation/prd.md` — FR-004, FR-005, US-02, NFR phone/desktop, Non-Goals (gallery, unpublish UI, auto totals)
- `context/foundation/architecture/data-model.md` — enums, length limits, price/currency pair, “S-02 maps display copy”
- `context/foundation/architecture/modules.md:100,144` — shared kernel vs module presentation
- `context/foundation/architecture/runtime.md` — Build editor island; form draft state; validation categories
- `context/foundation/architecture/testing.md:29-35` — component tests for editor validation / focus
- `context/foundation/architecture/security.md` — Action validate→actor→use case (S-02 seam)
- `context/foundation/DOMAIN_DICTIONARY.md` — Build Form, attributes, Parts List, Product Link, Part Price
- `supabase/migrations/20260910201541_build_visibility_and_storage.sql` — CHECKs for name/story/case size/URL/money pair
- `src/lib/database.types.ts` — generated Insert types; all author fields optional on insert
- `src/components/ui/button.tsx` — only shadcn primitive
- `src/components/auth/FormField.tsx` — auth-specific; required icon; not the F-02 kit
- `src/pages/auth/signin.astro` / `signup.astro` — only `client:load` islands
- `components.json` — new-york, `@/components/ui`
- `src/lib/utils.ts:4-6` — `cn()`
- `src/styles/global.css` — `--input`, `--ring`, `--destructive`, radius
- `package.json` — no form libs; no Testing Library; `npx shadcn@latest add` not a script
- `vitest.config.ts:10-12` — Node environment
- `AGENTS.md` — shadcn add command; forms a11y; Actions for new UI mutations
- `context/foundation/tasks-linear.md` — stale vs current roadmap; no F-02 issue

## Architecture Insights

### Widgets now, form later

F-02 exists so S-02 does not invent Input/Select/Field while also wiring Actions and RLS. Success is: S-02 can compose name, story, five attribute selects, case size, and a parts row from `@/components/ui` without copying auth `FormField`. Success is **not** a working `/account/builds/new` page.

### Domain-free means no enum tables in `ui/`

Hardcoding `watch_style` options in `src/components/ui` would make the shared kernel know Builds. Select accepts options. Display maps and currency lists live with S-02 (or a later `builds` presentation helper). Filter Selects (F-05) are a different kit even if they share the same primitive.

### Do not scaffold `src/modules/builds` for this slice

Empty hexagonal folders fight AGENTS.md. F-01 already deferred module scaffolding. The first `builds` presentation file should appear when S-02 composes the editor island.

### Auth is a precedent, not a template

Auth proves: React island + labeled inputs + `cn()` + pending submit + error text. It also shows gaps F-02 should not copy: required icon, missing `aria-invalid`, POST endpoints instead of Actions, values lost after server error redirect.

### Photo is a hole in the form, on purpose

The Build Form includes Main Photo (FR-004, dictionary). F-02 leaves a composition slot. S-02 will place the F-03 control next to F-02 fields. Do not add a generic `<input type="file">` as a fake photo widget.

### Money is two inputs, one invariant

The kit needs amount + currency controls that can sit side by side (desktop) and stack (phone). The both-or-neither rule and minor-unit conversion are S-02/domain. A dedicated `MoneyField` in `ui/` would smuggle domain into the kernel unless it is a generic “two fields with a shared error”. Lean: two primitives + layout via `cn()` in feature code.

## Historical Context (from prior changes)

- `context/archive/2026-09-09-build-visibility-and-storage/plan.md` — F-01 is persistence only; **not** authoring UI, Actions, catalog, likes; **not** `src/modules/builds` scaffolding (first use cases belong to S-02)
- `context/archive/2026-09-09-build-visibility-and-storage/research.md` — Create/edit/publish UI and image upload → S-02 (then the north-star slice; current roadmap split S-02 create vs S-03 publish vs F-03 photo)
- `context/archive/2026-09-09-build-visibility-and-storage/impl-review.md` — residual notes point S-02 at `main_image_path` validation, not UI kit ownership
- Roadmap Baseline (2026-09-11): “There is no shared form kit, photo-upload control, listing card set, filter set, or home-page set” — still accurate for form kit after F-01
- `context/foundation/tasks-linear.md` and Linear TOF-5…TOF-11 still reflect the **pre-recomposition** roadmap (S-02 was `publish-structured-build`). F-02 `authoring-form-components` has **no** Linear issue yet

## Related Research

- `context/archive/2026-09-09-build-visibility-and-storage/research.md` — F-01 persistence contract that the form will submit into

## Open Questions

These are for `/10x-plan` to settle. Recommendations are research leanings, not locked decisions.

1. **Exact shadcn add list** — `field`, `input`, `textarea`, `select`, `label` (and maybe `separator`)? Native `<select>` vs Radix Select (touch / mobile)?
   - Lean: **CLI-add Field, Input, Textarea, Select, Label** to match new-york. Prefer the shadcn Select used by the rest of the kit unless Radix Select fails phone usability in planning.

2. **Money pair primitive?**
   - Lean: **no domain `MoneyField` in `ui/`**. Input (number/text) + Select-or-Input for currency; S-02 composes layout and the pair invariant.

3. **Repeating-row shell in `ui/`?**
   - Lean: **no**. Add/remove is Button + feature state. A generic “list of fields” in the kernel will grow Build-specific quickly.

4. **Component-test harness in F-02?**
   - Lean: **yes, thin**. Add jsdom (or happy-dom) + Testing Library so Field/Input/Select have keyboard, label association, and error-text tests. Full “preserve submitted values across Action errors” waits for S-02. Do not introduce Playwright for this foundation.

5. **Migrate auth `FormField` onto the new kit?**
   - Lean: **not in F-02**. Out of slice; S-01 could optionally adopt later.

6. **Unset Select UX** — empty option vs clear control vs `undefined`?
   - Lean: **explicit empty option** (“Not set”) because attributes are optional and must not block posting (FR-004).

7. **react-hook-form / shadcn Form?**
   - Lean: **not in F-02**. Runtime says local React/form state; S-02 can adopt a library when composing the island. Primitives should stay usable with controlled `value`/`onChange`.

8. **Linear issue for F-02?**
   - Lean: **create or remap outside this change**, or ignore `tasks-linear.md` until a backlog sync. Planning should key off roadmap F-02, not TOF-7.
