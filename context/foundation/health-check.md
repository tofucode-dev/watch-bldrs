---
project: WatchBldrs
checked_at: 2026-09-07T13:06:00Z
health_status: critical-issues
context_type: brownfield
language_family: js
stack_assessment_available: false
checks_run:
  - lockfile
  - dependency_audit
  - outdated_deps
  - test_runner
  - ci_cd
  - configuration
audit_findings:
  critical: 0
  high: 0
  moderate: 0
  low: 0
test_runner_detected: false
ci_provider: GitHub Actions
recommended_fixes: 3
---

## Dependency Health

### Lockfile

```
Status: present (package-lock.json)
Package manager: npm
```

### Security Audit

```
Tool: npm audit --json
Summary: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW
Direct vs transitive: not distinguished (no findings)
```

No advisories. A post-scaffold audit earlier in this repo (1 CRITICAL / 14 HIGH) was already remediated by upgrading Astro 6 → 7 and applying `npm audit fix`. The tree is currently clean.

### Outdated Dependencies

```
Packages with major version gaps: 3
```

- **typescript**: 5.9.3 → 7.0.2 (2 major versions behind)
- **eslint**: 9.39.4 → 10.10.0 (1 major version behind)
- **@eslint/js**: 9.39.4 → 10.0.1 (1 major version behind)

Do not jump TypeScript 5 → 7 without a dedicated migration. ESLint 10 is a one-major bump and is optional for a one-week MVP. Several other direct packages have newer minors (`lucide-react`, `tailwindcss`, `@supabase/supabase-js`); those are not listed here.

## Test Suite

```
Test runner: not detected
Tests found: not applicable
Test execution: not attempted
```

⚠ No test runner detected. The agent cannot verify its own changes.
Recommended: Vitest (Astro's usual unit/component runner). Scaffold with `npm init vitest@latest`, add a `"test": "vitest run"` script to `package.json`, then add at least one smoke test for auth helpers in `src/lib/`.

No `vitest.config.*`, `jest.config.*`, Playwright/Cypress config, or `*.test.*` / `*.spec.*` files exist. `package.json` has no test script and no test-runner dependency.

## CI/CD

```
Provider: GitHub Actions
Configuration: .github/workflows/ci.yml
```

| Stage      | Status | Notes                                                                 |
|------------|--------|-----------------------------------------------------------------------|
| Lint       | ✓      | `npm run lint` (ESLint flat config, type-aware `strictTypeChecked`)   |
| Test       | ✗      | not configured (no local runner to invoke)                            |
| Build      | ✓      | `npm run build` with `SUPABASE_URL` / `SUPABASE_KEY` secrets          |
| Type check | ✗      | `npx astro sync` generates types; no `astro check` / `tsc --noEmit`   |
| Security   | ✗      | no `npm audit`, Dependabot, or CodeQL step                            |

Triggers: push and pull_request to `main`. Node 22 with npm cache.

## Configuration

### High severity

None.

### Medium severity

None. Formatter (`.prettierrc.json` + Prettier plugins), linter (`eslint.config.js`), TypeScript strictness (`tsconfig.json` extends `astro/tsconfigs/strict`, `"strict": true`), `.gitignore`, and `.env.example` are all present. `AGENTS.md` is already in the repo from the starter.

### Low severity

- **.editorconfig** — editors and the agent will not share a single indent/charset contract outside Prettier. Fix: add a root `.editorconfig` with `root = true`, `indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `charset = utf-8`, `trim_trailing_whitespace = true`, `insert_final_newline = true`.

## Stack Assessment Cross-Reference

No stack-assessment.md found. Run `/10x-stack-assess` for quality-gate analysis.

## Recommended Fixes

### Fix before agent work (Category A)

### 1. No test runner

**Impact**: An agent cannot prove its changes work. Auth, API routes, and helpers will be edited by guesswork until something is runnable locally.
**Severity**: high
**Effort**: moderate (15–30 min)
**Fix**:

```bash
npm init vitest@latest
```

Accept the Vitest defaults for this Vite/Astro repo. Then add to `package.json` scripts:

```json
"test": "vitest run"
```

Add one smoke test (for example `src/lib/utils.test.ts` covering `cn()`, or a unit test around `createClient` returning `null` when env is unset). After that, add `- run: npm test` to `.github/workflows/ci.yml` so CI matches the local runner.

### 2. Direct dependencies one or two majors behind

**Impact**: Agents may suggest APIs from TypeScript 7 or ESLint 10 that this tree does not have. Leaving the gap is safer than an unplanned major upgrade mid-MVP.
**Severity**: medium
**Effort**: moderate (15–30 min) to review; significant (> 1 hour) if you actually migrate TypeScript 5 → 7
**Fix**:

- Keep TypeScript on 5.x for the MVP. Do not run `npm install typescript@latest`.
- Optionally bump ESLint in a dedicated change: `npm install -D eslint@^10 @eslint/js@^10` and re-run `npm run lint`.
- For day-to-day drift, `npm outdated` then `npm update` covers compatible minors only.

### 3. Missing .editorconfig

**Impact**: Convenience only. Prettier already formats on commit; EditorConfig mainly aligns raw editor behavior.
**Severity**: low
**Effort**: quick (< 5 min)
**Fix**:

Create `.editorconfig` at the repo root:

```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

### Addressed in upcoming lessons (Category B)

### CI has no test or security stage

**Lesson**: [Sprint Zero z Agentem: infrastruktura, walking skeleton i pierwszy deploy (M1L5)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l5)
**What you'll do there**: Extend GitHub Actions (tests, audit/Dependabot, deploy) on top of the existing lint + build workflow. For now, a local test runner is what matters for agent collaboration.

### CLAUDE.md is absent (AGENTS.md already present)

**Lesson**: [Agent Onboarding: Agents.md, AI Rules i feedback loops (M1L4)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l4)
**What you'll do there**: Build instruction files with the right content. `AGENTS.md` already shipped with the starter — do not generate a `CLAUDE.md` stub now; onboarding covers that.

## Summary

Health status: critical-issues

Dependencies are in good shape: a lockfile is present, `npm audit` is clean, TypeScript is strict, and ESLint + Prettier + husky are wired locally and in CI. The blocking gap is the missing test runner — without it an agent cannot verify auth, API routes, or UI changes. Major-version drift (TypeScript 5 vs 7, ESLint 9 vs 10) should be treated as a known pin, not an urgent upgrade.

Next step: scaffold Vitest and one smoke test (Category A item 1), then proceed to agent onboarding. CI test/security stages and any extra instruction files land in later lessons.
