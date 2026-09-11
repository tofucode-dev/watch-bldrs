# Authoring Form Components Implementation Plan

## Overview

Add the shared, domain-free Build Form widget kit to `src/components/ui` so S-02 can compose name, story, attribute selects, case size, a parts row, and sticky save/discard chrome without inventing controls. Photo upload stays F-03; persistence, Actions, and the create page stay S-02.

## Current State Analysis

The shared UI library is one shadcn `new-york` primitive: `Button` (`src/components/ui/button.tsx`). Auth uses a one-off `FormField` with a required icon slot and no `aria-invalid` / `aria-describedby`. There is no `src/modules/`, no Astro Actions, no `react-hook-form` / Zod, and Vitest is Node-only with no `*.test.tsx` files.

F-01 already locked the persistence contract (optional attributes, length limits, parts pair invariant). Enum display copy is S-02’s job. Design-system.md assigns F-02 **Field, select, parts row, and sticky save bar**; the visual target is `build-form-reference.png`. Tokens for paper, primary, input, ring, destructive, and `--sticky` already live in `src/styles/global.css`.

## Desired End State

S-02 can import from `@/components/ui` and compose:

- labeled text / number / url inputs and a textarea (story counter via `FieldDescription`)
- optional attribute Selects from `{ value, label }[]`, including a caller-supplied empty option that returns the value to unset
- a slot-based parts row (index, cells, delete) that stacks on a phone-sized viewport
- a presentational sticky action bar (status + secondary + primary slots)

Verification: component tests for label association, error/ARIA, Select unset, row slots, and bar slots; lint/test/build pass; a local visual check against the mockup for those widgets only.

### Key Discoveries:

- Shared kernel vs module: primitives stay in `src/components/ui`; do not scaffold `src/modules/builds` (`context/foundation/architecture/modules.md`).
- Auth `FormField` is a precedent, not a template — leave it in `src/components/auth/` (`src/components/auth/FormField.tsx`).
- Radix `Select.Item` historically rejects `value=""`; empty-string on the root means “show placeholder”. The options helper must map a caller empty option through a sentinel.
- `--sticky` (`#f4e7b0`) already exists and is the right token for the save bar (`src/styles/global.css`).
- Button already has variants `default` / `outline` / `ghost` and `size="icon"` — enough for Save Draft, Discard, Add Part, and row delete (`size="icon"` plus `ghost` or `outline`, not `variant="icon"`).
- Vitest 5 has no `environmentMatchGlobs`. Split `vitest.config.ts` with inline `test.projects` so `src/**/*.test.ts` stays Node (`supabase.test.ts`) and only `src/**/*.test.tsx` runs in jsdom.



## What We're NOT Doing

- Photo upload, file input, or Storage attach (F-03)
- `BuildForm` / `PartsListEditor` page, Actions, draft persistence, publish control (S-02 / S-03)
- “YOUR BUILD” preview card, tags, listing chrome (F-04 / S-02)
- Section-card page layout, nav, home patterns (F-06 / S-02)
- Enum dictionaries, currency lists, minor-unit conversion, both-or-neither price rule (S-02 / domain)
- A domain `MoneyField` in `ui/`
- `react-hook-form` / shadcn `Form`
- Migrating auth `FormField` onto the new kit
- Scaffolding `src/modules/builds`
- Playwright / E2E
- A committed `/dev` preview route
- Unpublish UI (PRD Non-Goal)



## Implementation Approach

CLI-add stock shadcn `new-york` Field, Input, Textarea, Label, and Select. Keep generated files; wrap Select with a thin `OptionsSelect` that takes `{ value, label }[]` and implements the empty-option contract. Add two custom composites in the same folder: `PartsRow` (layout + a11y labels) and `StickyActionBar` (slots, `--sticky`). Token-faithful styling: reuse existing CSS variables, add or tweak a token only when the mockup color has no mapping and the change is small. Match the mockup when it is a class/`cn()` tweak; if it needs custom illustration (torn-paper panels, dashed photo well, stamp preview), record the drawback and leave it.

Install jsdom + Testing Library in the same first increment as the primitives so Field/Select ship with tests. Route only `src/**/*.test.tsx` to jsdom via `test.projects` (Vitest 5).

## Critical Implementation Details

**Radix Select empty value.** Callers pass `{ value: "", label: "Not set" }` (copy is theirs). Extract empty-option ↔ sentinel mapping to a small pure helper in `src/components/ui/options-select-mapping.ts` (not a public API — S-02 only imports `OptionsSelect`). The helper must not emit `value=""` for a Radix `Select.Item`, must treat controlled `value=""` / `undefined` as unset, and must map the sentinel back to `onValueChange("")` so the placeholder returns. Do not require a jsdom user-event click-through of Radix Content to prove this.

**Parts row labels.** The mockup shows a desktop header row and unlabeled cells; phone-sized layouts must show a label per cell. `PartsRow` owns that switch: visible header + `sr-only` (or equivalent) cell labels on `md+`; stacked visible labels and no header on small viewports. Callers pass cell `{ label, control }` — they do not fork two markup trees.

**Vitest environments.** Do not set a single-project default of jsdom. In `vitest.config.ts` use inline `test.projects` with `extends: true`: a `node` project including `src/**/*.test.ts`, and a `jsdom` project including `src/**/*.test.tsx`. Do not create `vitest.component.config.ts`. Per-file `// @vitest-environment jsdom` is a fallback, not the glob guardrail. Leave `vitest.integration.config.ts` untouched.

## Phase 1: Primitives, tokens, and component-test harness



### Overview

Install the shadcn field kit and a jsdom Testing Library harness. Ship Input, Textarea, Field, Label, Select, and `OptionsSelect` with accessibility tests, plus only those token tweaks that are cheap.

### Changes Required:



#### 1. shadcn Field kit

**File**: `src/components/ui/{field,input,textarea,label,select}.tsx` (plus CLI-pulled deps such as `separator.tsx` if required)

**Intent**: Add the new-york primitives S-02 will compose for every labeled control except photo.

**Contract**: Install with `npx shadcn@latest add field input textarea select label` (AGENTS.md). Keep `rsc: false` / `new-york` from `components.json`. Do not add `form`, `card`, `dialog`, or `checkbox`. Import through `@/components/ui/<file>`, not a new barrel unless the CLI creates one. Use `cn()`; do not concatenate class strings.

#### 2. OptionsSelect wrapper

**File**: `src/components/ui/options-select.tsx`, `src/components/ui/options-select-mapping.ts`

**Intent**: Give S-02 a Select that takes options in and supports optional attributes (FR-004) without each caller fighting Radix’s empty-value rule.

**Contract**: Props include `options: { value: string; label: string }[]`, controlled `value` (`string | undefined`; `""` means unset), `onValueChange: (value: string) => void` (empty string when cleared), `placeholder`, `id`, `disabled`, and `aria-invalid`. Compose the generated Select primitives; do not fork a second Select visual language. Empty-option mapping lives in the internal helper (see Critical Implementation Details). Do not re-export the helper from a barrel.

#### 3. Token-faithful field chrome

**File**: `src/styles/global.css` and only the generated primitive classNames that need a small tweak

**Intent**: Make Input / Textarea / SelectTrigger look like the mockup’s paper fields using tokens we already have (or a missing token that is a one-line add).

**Contract**: Prefer `--input`, `--border`, `--ring`, `--card`, `--destructive`, `--radius`. Add a token only if the mockup uses a color with no mapping. Do not invent a second palette. Do not restyle the whole page (Barlow section titles, torn-paper cards, photo well, preview stamps are out). If a look needs more than a token or `cn()` tweak, leave stock shadcn and note the drawback in the phase’s manual verification.

#### 4. jsdom + Testing Library harness

**File**: `vitest.config.ts`, `package.json`

**Intent**: Satisfy UI-only DoD with component tests without breaking Node unit tests or the integration config.

**Contract**: Dev-deps: `jsdom`, `@testing-library/react`, `@testing-library/user-event` (and jest-dom matchers only if used). Use inline `test.projects` (`extends: true`): `node` + `include: ["src/**/*.test.ts"]`; `jsdom` + `include: ["src/**/*.test.tsx"]`. Optional `setupFiles` on the jsdom project must not make `src/lib/supabase.test.ts` depend on the DOM. Do not add a third Vitest config. Do not change `vitest.integration.config.ts`. A Radix Select user-event test is out of scope; if one is added anyway, put PointerEvent / pointer-capture / `scrollIntoView` mocks only on the jsdom project.

#### 5. Primitive component tests

**File**: `src/components/ui/field.test.tsx`, `src/components/ui/options-select.test.tsx`, `src/components/ui/options-select-mapping.test.ts` (and input/textarea coverage in those files if thinner than a dedicated file)

**Intent**: Lock label association, error display, and the unset Select contract before S-02 exists.

**Contract**: Tests assert: `FieldLabel` `htmlFor` matches control `id`; when invalid, the control has `aria-invalid` and `FieldError` is visible (`role="alert"`). Do not require `aria-describedby` — stock Field does not wire it. Node unit tests on the mapping helper: empty option ↔ sentinel, `""`/`undefined` is unset, sentinel maps back to `onValueChange("")`, item values never include `""`. jsdom `OptionsSelect` tests: option labels render; `id` / `aria-invalid` / `disabled` passthrough. Do not require choosing the empty option via user-event (manual 1.11). Input can be used as `type="text" | "number" | "url"` (passthrough). Co-locate tests. No Playwright. No tests of the price/currency domain invariant.

### Success Criteria:



#### Automated Verification:

- shadcn CLI has added Field, Input, Textarea, Label, and Select under `src/components/ui` (plus any required CLI deps)
- `OptionsSelect` mapping helper treats `""` as unset, never emits `value=""` for a Radix `Select.Item`, and maps the sentinel back to `""`
- Field error/hint composition uses `data-invalid` / `aria-invalid` and visible `FieldError` / `FieldDescription`
- `vitest.config.ts` uses `test.projects`: Node for `src/**/*.test.ts`, jsdom for `src/**/*.test.tsx`
- Component tests cover Field label association, error/ARIA, and OptionsSelect labels plus `id` / `aria-invalid` / disabled passthrough
- `src/lib/supabase.test.ts` still passes under Node as part of `npm run test`
- `npm run lint` passes
- `npm run test` passes
- `npm run build` passes



#### Manual Verification:

- Input, Textarea, and OptionsSelect look token-faithful next to `build-form-reference.png` (cream field, charcoal border, burnt-orange focus) at ~390px width
- An optional Select can start unset, take a value, and return to unset via the empty option
- Any mockup details skipped as too expensive (exact type scale, extra inner shadows, non-token colors) are listed as accepted drawbacks

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---



## Phase 2: Parts row and sticky action bar



### Overview

Add the two composites the design system assigned to F-02: a domain-free parts row that works on phone and desktop, and a presentational sticky save bar. Wire them to existing Button variants. Do not persist, discard, or total anything.

### Changes Required:



#### 1. PartsRow (+ desktop header)

**File**: `src/components/ui/parts-row.tsx`

**Intent**: Let S-02 render repeating part lines without inventing a responsive grid, while keeping category/name/url/price/currency as caller-owned controls.

**Contract**: Domain-free API: `index` (React node), `cells: { label: string; control: ReactNode }[]`, optional `action` (delete control). Optional `PartsListHeader` takes `columns: string[]` for desktop column titles — do not hardcode “Category” / “USD”. Layout: header + columns from `md` up; stacked labeled cells below that. No add/remove state, no drag-and-drop, no money pair logic. Price and currency are two cells (or two controls the caller places); the kit does not bind them.

#### 2. StickyActionBar

**File**: `src/components/ui/sticky-action-bar.tsx`

**Intent**: Provide the mockup’s bottom chrome (status + Discard + Save Draft) without owning save behavior.

**Contract**: Slots: `status`, `secondary`, `primary` (all React nodes). Position sticky at the bottom of the viewport (or scrolling form container — pick one and document it in the file’s export comment: prefer `sticky` at the bottom of the page so S-02 can wrap the form). Background uses existing `--sticky` / `bg-sticky`. No onSave/onDiscard props; callers pass `Button` instances (`outline` for Discard, `default` for Save Draft). Disabled/pending is the Button’s problem, not the bar’s.

#### 3. Composite tests

**File**: `src/components/ui/parts-row.test.tsx`, `src/components/ui/sticky-action-bar.test.tsx`

**Intent**: Prove slots and accessible names without a real build.

**Contract**: PartsRow: index, each cell’s accessible name (from `label`), and action control are in the document; a second row is independent; both markup branches exist (desktop header / `sr-only` labels for `md+`, visible per-cell labels below `md`). Do not assert computed visibility at a breakpoint — jsdom does not apply media queries. StickyActionBar: status, secondary, and primary content render; the bar does not submit a form by itself. Optionally assert a class/token hook for `bg-sticky` if stable. Still no Playwright.

#### 4. Boundary check (no extra product surface)

**File**: (no new product files)

**Intent**: Keep F-02 a kit, not a create-draft slice.

**Contract**: No `src/modules/builds`, no `/account/builds/new`, no file input, no auth FormField rewrite, no `react-hook-form`. “Add part” remains a `Button` the caller places under the rows.

### Success Criteria:



#### Automated Verification:

- `PartsRow` renders caller-provided cells, index, and action with no hardcoded part categories, currencies, or field names
- Parts row tests assert both markup branches and a11y labels (header/`sr-only` on `md+`, visible per-cell labels below `md`); stacked vs columns look is manual 2.9
- `StickyActionBar` exposes status / secondary / primary slots and does not define save/discard handlers
- Component tests cover PartsRow slots/accessible names and StickyActionBar slots
- No `src/modules/builds`, no photo/file widget, no auth FormField migration, no `react-hook-form` dependency
- `npm run lint` passes
- `npm run test` passes
- `npm run build` passes



#### Manual Verification:

- Dummy parts rows match the mockup simply: columns on desktop, stacked on ~390px, delete action reachable by keyboard
- Sticky bar uses the yellow sticky token, shows status text, outline Discard, and primary Save Draft
- Price and currency sit as two kit controls side by side on desktop (caller layout); they stack on phone with the rest of the row
- Visual check is Field / Select / PartsRow / StickyActionBar only — photo well and “YOUR BUILD” preview are out; remaining look gaps vs the PNG are written down, not forced

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---



## Testing Strategy



### Unit Tests:

- Field: label `htmlFor`/`id`, visible `FieldError` (`role="alert"`), control `aria-invalid`
- OptionsSelect: mapping helper (Node) for empty ↔ sentinel; jsdom render for labels and ARIA passthrough; choose-empty is manual 1.11
- Input types used by the form (`text`, `number`, `url`) passthrough
- PartsRow: slots, accessible names, both markup branches, independent rows; visual stack vs columns is manual
- StickyActionBar: three slots render; no implicit submit



### Integration Tests:

- None. No schema, RLS, or Storage changes.



### Manual Testing Steps:

1. In a local, uncommitted scratch composition (do not land a `/dev` route), place Field+Input, Field+Textarea, OptionsSelect with an empty option, two PartsRows, and StickyActionBar.
2. At ~390px width: fields stack, parts cells show labels, sticky bar remains usable, primary/secondary buttons are tappable.
3. At desktop width: watch-spec style two-column FieldGroups still work (FieldGroup is stock shadcn); parts header + columns align; price and currency sit on one row as two controls.
4. Keyboard: tab through a parts row, open Select, choose empty option, activate delete and both bar actions.
5. Compare only those widgets to `context/changes/authoring-form-components/build-form-reference.png`. Skip photo well and preview card.



## Performance Considerations

These are presentational controls for a short form (one story textarea, five attribute selects, a small parts list). No virtualization, no client store, no extra island beyond what S-02 will hydrate later. Avoid adding `react-hook-form` or a global form store in this change.

## Migration Notes

No data migration. Auth screens stay on `FormField`. Generated shadcn files are source (commit them). Do not add `database.types.ts` to a new ESLint ignore unless lint actually fails on CLI output.

## References

- Related research: `context/changes/authoring-form-components/research.md`
- Visual target: `context/changes/authoring-form-components/build-form-reference.png`
- Design system: `context/foundation/design-system.md`
- Roadmap F-02: `context/foundation/roadmap.md`
- Similar primitive: `src/components/ui/button.tsx`
- Auth anti-template: `src/components/auth/FormField.tsx`
- Tokens: `src/styles/global.css`
- Test harness baseline: `vitest.config.ts`



## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append  `— <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.



### Phase 1: Primitives, tokens, and component-test harness



#### Automated

- [x] 1.1 shadcn CLI has added Field, Input, Textarea, Label, and Select under `src/components/ui` (plus any required CLI deps)
- [x] 1.2 `OptionsSelect` mapping helper treats `""` as unset, never emits `value=""` for a Radix `Select.Item`, and maps the sentinel back to `""`
- [x] 1.3 Field error/hint composition uses `data-invalid` / `aria-invalid` and visible `FieldError` / `FieldDescription`
- [x] 1.4 `vitest.config.ts` uses `test.projects`: Node for `src/**/*.test.ts`, jsdom for `src/**/*.test.tsx`
- [x] 1.5 Component tests cover Field label association, error/ARIA, and OptionsSelect labels plus `id` / `aria-invalid` / disabled passthrough
- [x] 1.6 `src/lib/supabase.test.ts` still passes under Node as part of `npm run test`
- [x] 1.7 `npm run lint` passes
- [x] 1.8 `npm run test` passes
- [x] 1.9 `npm run build` passes



#### Manual

- [x] 1.10 Input, Textarea, and OptionsSelect look token-faithful next to `build-form-reference.png` (cream field, charcoal border, burnt-orange focus) at ~390px width
- [x] 1.11 An optional Select can start unset, take a value, and return to unset via the empty option
- [x] 1.12 Any mockup details skipped as too expensive (exact type scale, extra inner shadows, non-token colors) are listed as accepted drawbacks — stock Field typography/spacing; no torn-paper panels; `shadow-xs` only on inputs; stock Select popover chrome; stock FieldGroup `@container` layout



### Phase 2: Parts row and sticky action bar



#### Automated

- [ ] 2.1 `PartsRow` renders caller-provided cells, index, and action with no hardcoded part categories, currencies, or field names
- [ ] 2.2 Parts row tests assert both markup branches and a11y labels (header/`sr-only` on `md+`, visible per-cell labels below `md`); stacked vs columns look is manual 2.9
- [ ] 2.3 `StickyActionBar` exposes status / secondary / primary slots and does not define save/discard handlers
- [ ] 2.4 Component tests cover PartsRow slots/accessible names and StickyActionBar slots
- [ ] 2.5 No `src/modules/builds`, no photo/file widget, no auth FormField migration, no `react-hook-form` dependency
- [ ] 2.6 `npm run lint` passes
- [ ] 2.7 `npm run test` passes
- [ ] 2.8 `npm run build` passes



#### Manual

- [ ] 2.9 Dummy parts rows match the mockup simply: columns on desktop, stacked on ~390px, delete action reachable by keyboard
- [ ] 2.10 Sticky bar uses the yellow sticky token, shows status text, outline Discard, and primary Save Draft
- [ ] 2.11 Price and currency sit as two kit controls side by side on desktop (caller layout); they stack on phone with the rest of the row
- [ ] 2.12 Visual check is Field / Select / PartsRow / StickyActionBar only — photo well and “YOUR BUILD” preview are out; remaining look gaps vs the PNG are written down, not forced