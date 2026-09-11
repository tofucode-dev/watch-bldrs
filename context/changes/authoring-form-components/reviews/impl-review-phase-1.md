<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Authoring Form Components Implementation Plan

- **Plan**: context/changes/authoring-form-components/plan.md
- **Scope**: Phase 1 of 2
- **Date**: 2026-09-12
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 3 warnings 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — OptionsSelect jsdom test asserts placeholder, not option labels

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/ui/options-select.test.tsx:17
- **Detail**: Progress 1.5 is checked, and the test is named “renders option labels”, but it only asserts the placeholder text “Choose movement”. Closed Radix Select does not put `SelectItem` labels in the document, and the plan forbids a user-event open. Mapping tests already lock empty-option labels through to the sentinel. Criterion 1.5 still asked jsdom to prove labels render. `type="url"` passthrough is also unasserted; `type="text"` and `type="number"` are covered in `field.test.tsx`.
- **Fix**: Split the placeholder assertion from label coverage. When `value="automatic"`, assert the trigger shows “Automatic”. Keep empty-option labels in the Node mapping tests. Rename the unset case so it does not claim to render option labels.
- **Decision**: FIXED

### F2 — Unrelated Wrangler `env.local` in the Phase 1 commit

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: wrangler.jsonc:20
- **Detail**: Commit `98936fc` adds a named Wrangler environment `local` that repeats `secrets.required`. No secret values are in the file. This is not in Phase 1 Changes Required and is unrelated to the field kit. It exists so `scripts/astro-dev.mjs` (`CLOUDFLARE_ENV=local`) can satisfy Wrangler’s required-secrets check. `deployment.md` still says named environments are not MVP; an accidental `CLOUDFLARE_ENV=local` deploy can now resolve to `watch-bldrs-local` instead of failing as an unknown env.
- **Fix A ⭐ Recommended**: Keep the block for local `npm run dev` and document it as a Phase 1 addendum (supporting local Wrangler, not form-kit scope).
  - Strength: Unblocks `npm run dev` without a second infra commit; no secrets are exposed.
  - Tradeoff: Named-env deploy footgun remains; plan becomes a slightly moving target.
  - Confidence: HIGH — the block matches how `astro-dev.mjs` already sets `CLOUDFLARE_ENV`.
  - Blind spot: Have not run a deploy with `CLOUDFLARE_ENV` unset vs `local` in this review.
- **Fix B**: Revert `wrangler.jsonc` from this change and land it in a dedicated infra commit.
  - Strength: Keeps the form-kit commit strictly on primitives and tests.
  - Tradeoff: Local `npm run dev` may fail Wrangler’s required-secrets check until the infra change lands.
  - Confidence: MEDIUM — depends on whether current `astro-dev.mjs` already requires this block.
  - Blind spot: Have not reproduced `npm run dev` with the block removed.
- **Decision**: FIXED (via Fix A)

### F3 — `"use client"` leftovers violate the Astro no-Next.js-directives rule

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/ui/field.tsx:1, src/components/ui/label.tsx:1, src/components/ui/options-select.tsx:1
- **Detail**: AGENTS.md forbids Next.js directives. Existing `button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, and `separator.tsx` have no `"use client"`. Field and Label came from the shadcn CLI; OptionsSelect copied the directive. It is a no-op in Astro islands, but it is a stated repo rule and a sibling mismatch.
- **Fix**: Strip `"use client"` from the three files. “Keep generated files” in the plan means do not rewrite Field/Select APIs, not preserve Next.js leftovers.
- **Decision**: FIXED

### F4 — Storybook workshop is extra vs the plan, required by repo rules

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: .storybook/, src/components/ui/*.stories.tsx
- **Detail**: Phase 1 Changes Required did not list Storybook. The same commit added `.storybook/*`, co-located `*.stories.tsx`, scripts, eslint-plugin-storybook, and docs. AGENTS.md and `context/foundation/architecture/testing.md` now require co-located stories for `src/components/ui` and treat Storybook as a local Vite workshop, not Workers. This is not the forbidden committed `/dev` preview route. Interactive `OptionsSelect` stories (`Unset` / `Selected`) are the observable evidence for manual 1.10 / 1.11.
- **Fix**: Add a short plan addendum that Phase 1 verification uses Storybook instead of an uncommitted scratch composition.
- **Decision**: FIXED

### F5 — AGENTS.md still describes a single Vitest glob including `*.spec.*`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: AGENTS.md:173
- **Detail**: This commit updated AGENTS.md for Storybook but left “Vitest matches `src/**/*.{test,spec}.{ts,tsx}` per @vitest.config.ts”. Config now splits Node `src/**/*.test.ts` and jsdom `src/**/*.test.tsx`. No `*.spec.*` files exist, so nothing is currently skipped. `testing.md` already documents the jsdom `*.test.tsx` split.
- **Fix**: Update that AGENTS.md sentence to the two `test.projects` includes and drop `spec` unless you intend to keep it.
- **Decision**: FIXED
