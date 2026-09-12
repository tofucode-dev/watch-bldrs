<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Authoring Form Components Implementation Plan

- **Plan**: context/changes/authoring-form-components/plan.md
- **Mode**: Deep
- **Date**: 2026-09-11
- **Verdict**: SOUND
- **Findings**: 0 critical 4 warnings 1 observation (all triaged)

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding
9/9 paths ✓, 4/5 symbols ✗ (`environmentMatchGlobs` gone in Vitest 5), brief↔plan ✓

## Findings

### F1 — Vitest 5 removed `environmentMatchGlobs`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Critical Implementation Details; Phase 1 §4; Success Criteria 1.4
- **Detail**: The harness contract tells the implementer to keep `environment: "node"` and add `environmentMatchGlobs` mapping `src/**/*.test.tsx` → jsdom. This repo is on Vitest 5.0.0 (`package.json`). That option was removed in Vitest 5 (vitest#8205). `defineConfig` will not accept it; if forced through, glob routing is a no-op and RTL tests run in Node. The *intent* (Node for `supabase.test.ts`, jsdom only for `*.test.tsx`, leave `vitest.integration.config.ts` alone, no third config file) is still right.
- **Fix**: Replace `environmentMatchGlobs` with inline `test.projects` in `vitest.config.ts` (`extends: true`): a `node` project for `src/**/*.test.ts` and a `jsdom` project for `src/**/*.test.tsx`. Do not create `vitest.component.config.ts`. Per-file `// @vitest-environment jsdom` is a fallback, not the glob guardrail the plan wanted.
- **Decision**: FIXED (via plan edit — `test.projects` in `vitest.config.ts`)

### F2 — Stock Field does not wire `aria-describedby`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 §5 test contract; Success Criteria 1.3 / 1.5
- **Detail**: Phase 1 tests require FieldError text to be “exposed to the control (`aria-invalid` and described-by / accessible description)”. Stock shadcn Field (docs + registry) supports `FieldLabel htmlFor`, `data-invalid` on `Field`, `aria-invalid` on the control, and `FieldError` with `role="alert"`. It does **not** generate ids or set `aria-describedby`. The old RHF `Form` kit did; this one does not. A literal reading forces a wrapper the plan otherwise forbids, or a failing test.
- **Fix**: Rewrite the test contract to: `FieldLabel` `htmlFor` matches control `id`; control has `aria-invalid` when invalid; `FieldError` is visible (`role="alert"`). Do not require `aria-describedby` unless a later slice adds an association helper. CLI-pulled `separator.tsx` stays allowed.
- **Decision**: FIXED (via plan edit — htmlFor / aria-invalid / role=alert; no aria-describedby)

### F3 — Radix Select empty-option test is brittle in jsdom

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 1 §2 / §5; Success Criteria 1.2 / 1.5 / 1.11
- **Detail**: The empty-option sentinel is still required (`Select.Item value=""` remains illegal; empty root value means placeholder). `@radix-ui/react-select` is not in the repo yet; CLI will add a portal-based Select. The plan treats “choose empty option → `onValueChange("")` + placeholder restored” as a straightforward RTL interaction. In jsdom that typically needs `PointerEvent`, `hasPointerCapture` / `releasePointerCapture`, and `scrollIntoView` mocks, plus querying portaled content. Without that setup the implementer burns time or drops the test.
- **Fix A ⭐ Recommended**: Extract empty-option ↔ sentinel mapping to a small pure helper and unit-test it (Node is fine). Keep a thin OptionsSelect render test for labels, `id` / `aria-invalid` / disabled passthrough. If an interaction test stays, document the jsdom PointerEvent mocks in Phase 1 §4 (tsx-only `setupFiles`, not a global file that touches `supabase.test.ts`).
  - Strength: Locks the Radix contract without depending on flaky portal clicks; matches “jsdom must not leak into Node tests.”
  - Tradeoff: Does not prove the user-event path through Radix Content until S-02 or a later browser check (manual 1.11 still covers it).
  - Confidence: HIGH — this is the usual split for Radix Select in jsdom.
  - Blind spot: Helper must stay internal so callers still only pass `{ value, label }[]`.
- **Fix B**: Keep the interaction test as the source of truth; add an explicit tsx-only setup file with PointerEvent / pointer-capture / scrollIntoView polyfills and query portaled items after open.
  - Strength: Directly encodes 1.2 / 1.5 “choosing the empty option.”
  - Tradeoff: Setup is version-sensitive and often flakes across Radix upgrades.
  - Confidence: MEDIUM — doable, but this repo has no Radix Select tests to copy.
  - Blind spot: Exact mock set depends on the CLI-pinned `@radix-ui/react-select` version.
- **Decision**: FIXED (via Fix A — mapping helper unit test; no required Radix user-event)

### F4 — PartsRow `md` layout cannot be proven in jsdom

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 Success Criteria (automated 2.2); composite tests §3
- **Detail**: Automated criterion 2.2 says the layout contract is encoded: stacked labeled cells on small viewports; header + columns from `md` up. jsdom does not apply CSS media queries, so tests cannot see which branch is visible. They can assert slots, accessible names, and that both class/markup branches exist (`md:` / `max-md:` / `sr-only`). Real stacking is already manual 2.9.
- **Fix**: Change 2.2 (and the matching Progress item) to: tests assert both markup branches and a11y labels are present (header/`sr-only` on `md+`, visible per-cell labels below `md`). Move “looks stacked vs columns” solely to manual 2.9.
- **Decision**: FIXED (via plan edit — tests assert markup branches; layout look is manual 2.9)

### F5 — `icon` is a Button size, not a variant

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Key Discoveries (plan.md line 30)
- **Detail**: Key Discoveries lists Button `default` / `outline` / `ghost` / `icon` as if they were one set. In `src/components/ui/button.tsx`, `icon` is a **size** (`size-9`); variants are `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. Save Draft / Discard / Add Part still work. Row delete is `size="icon"` plus `ghost` or `outline`, not `variant="icon"`.
- **Fix**: Correct the discovery line to `variant` default/outline/ghost and `size="icon"` for row delete.
- **Decision**: FIXED (via plan edit — variant vs size wording)
