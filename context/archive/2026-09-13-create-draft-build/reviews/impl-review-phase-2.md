<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Create a Private Draft Build

- **Plan**: context/changes/create-draft-build/plan.md
- **Scope**: Phase 2 of 3
- **Date**: 2026-09-13
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 7 warnings 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | FAIL |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | WARNING |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Form saves through cookie HTTP endpoints instead of Astro Actions

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence
- **Location**: src/modules/builds/presentation/build-form.tsx:40
- **Detail**: Phase 2 contract is that the island calls `actions.builds.createDraft` / `update`, with jsdom tests mocking `astro:actions`. `BuildForm` instead `fetch`es `POST /api/builds/draft` and `PATCH /api/builds/:id/draft`. Those routes, `draft-mutation-http.ts`, and a `vitest` alias to `src/test/mocks/astro-actions.ts` are unplanned. Actions still exist (`src/modules/builds/actions.ts`) and wrap the same mutation helper, but the form never calls them. `scripts/astro-dev.mjs` raises the Node heap “when Actions deps optimize mid-request,” which is evidence the team hit Cloudflare Vite OOM and switched transports without a plan addendum. The new endpoints authenticate via session cookies and parse `request.json()` with no Origin/Referer check, which `OPERATIONAL_SAFETY.md` §6 requires for cookie-authenticated custom endpoints. SameSite=Lax likely blocks cross-site POST today; that is not an explicit defense. Phase 3 `attachMainImage` still lives only as an Action, so keeping HTTP for save would split transports.
- **Fix A**: Wire the island to the existing Actions and delete (or stop shipping) the `/api/builds` routes
  - Strength: Matches the Phase 2 contract, AGENTS.md “prefer Actions,” and Astro’s CSRF story; unused `astro:actions` mock becomes the real test seam.
  - Tradeoff: May re-trigger the Vite/Actions OOM that `astro-dev.mjs` already works around; jsdom tests must be rewritten.
  - Confidence: MEDIUM — production `npm run build` succeeded with Actions still in the server graph; the OOM was not reproduced in this review.
  - Blind spot: Whether `client:load` importing `astro:actions` OOMs local `npm run dev` on this machine.
- **Fix B ⭐ Recommended**: Keep the HTTP adapters, add a fail-closed Origin (fallback Referer) check, and document them as a Phase 2 addendum
  - Strength: The gated pages, create→replaceState→update path, and jsdom tests already work; heap workaround stays meaningful; same use cases still run server-side.
  - Tradeoff: Dual mutation surface (unused Actions + live HTTP); CSRF homework now; Phase 3 attach would likely stay on Actions unless also moved.
  - Confidence: HIGH — working tree already ships this path; OPERATIONAL_SAFETY §6 is explicit about custom endpoints.
  - Blind spot: Host/proxy Origin values on Cloudflare Workers (`deployment.md` / forwarded hosts) not verified here.
- **Decision**: FIXED via Fix A

### F2 — Presentation island imports infrastructure types; lint will not catch a value import

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: src/modules/builds/presentation/build-form.tsx:28
- **Detail**: `import type { DraftMutationResult } from "../infrastructure/draft-mutation-http"` is type-only today (erased, no secret leak). `draft-mutation-http.ts` value-imports `createClient`, `astro:env/server` (via `@/lib/supabase`), and use cases. `eslint.config.js` only restricts `@/modules/*/infrastructure` and **ignores** `infrastructure/**`, so a relative value import from presentation would not fail lint and would pull server env into the client graph.
- **Fix A ⭐ Recommended**: Move `DraftMutationResult` (and the form’s result contract) to `domain/` or `@/modules/builds` and drop the infrastructure import
  - Strength: Restores layer direction; pages can also import the type from the browser-safe entry.
  - Tradeoff: One extra public type; HTTP/Action adapters keep mapping into it.
  - Confidence: HIGH — `index.ts` already exists as the client barrel.
  - Blind spot: Whether Actions handlers should share that type or keep `DraftActionResult`.
- **Fix B**: Extend `no-restricted-imports` to relative `**/infrastructure/**` for presentation/pages
  - Strength: Catches the next accidental value import even if someone skips the barrel.
  - Tradeoff: Does not fix the current coupling; infrastructure files importing each other need to stay allowed.
  - Confidence: MEDIUM — ignore list currently excludes infrastructure from the rule entirely.
  - Blind spot: False positives from tests or adapters.
- **Decision**: FIXED via Fix A (import removed with F1)

### F3 — Sign-in redirect allowlist matches a too-weak plan

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/auth/signin.ts:8
- **Detail**: Implementation matches the Phase 2 contract (`startsWith("/")` and not `startsWith("//")`). That check still allows shapes such as `/\\evil.com` and control characters in a post-login `Location`. Middleware correctly `encodeURIComponent`s the pathname it sets; the attacker-controlled `redirect` query/hidden field is the gap. This is a plan-flaw finding, not an implementation miss.
- **Fix**: Resolve with `new URL(value, origin)` and require same origin, a leading `/` path, and no `\\` or control characters (apply in both `signin.ts` and `signin.astro`).
  - Strength: Closes open-redirect / header-injection classes the string prefix check misses.
  - Tradeoff: Slightly stricter than the written Phase 2 sentence; must keep `/account/builds/new` working.
  - Confidence: HIGH — same class of bug as protocol-relative `//` which the plan already tried to block.
  - Blind spot: Astro `context.redirect` encoding behavior on Workers not re-tested here.
- **Decision**: FIXED

### F4 — Double-click Save can insert two drafts

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/modules/builds/presentation/build-form.tsx:190
- **Detail**: `handleSave` always `setIsPending(true)` but does not bail on an in-flight save. Two clicks before re-render both see `draftId === null` and both `POST /api/builds/draft`. `disabled={isPending}` only helps after paint. No idempotency key on create.
- **Fix**: Guard with a ref set synchronously (`if (inFlight.current) return`) and keep `draftId` in a ref so a second click PATCHes.
- **Decision**: FIXED

### F5 — Currency-only part rows are dropped as blank

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/modules/builds/domain/validate-draft.ts:31
- **Detail**: Client `isBlankPartRow` treats a currency-only row as started and sends it. Server `isBlankPart` ignores `currency`, so that row is skipped and save returns success. The Phase 1 “price and currency both or neither” rule never runs. The user sees “Draft saved” and the currency disappears. Pairing still runs when price/name/category are present.
- **Fix**: Treat non-empty `currency` as a started part (same as price) and add a `{ currency: "USD" }` domain test expecting `DraftValidationError`.
- **Decision**: SKIPPED

### F6 — Edit 404 responses omit Cache-Control: private, no-store

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/account/builds/[id]/edit.astro:9
- **Detail**: Missing id and `getOwnedDraftForForm` null both `return new Response(null, { status: 404 })` with an empty body (no field leak). The success path sets `Cache-Control: private, no-store` at line 38. `OPERATIONAL_SAFETY.md` §5 says not to cache authorization/not-found responses unless designed. A shared cache without `Vary: Cookie` could store User B’s 404. `new.astro` always sets the header.
- **Fix**: Set `Cache-Control: private, no-store` on both 404 `Response` objects.
- **Decision**: FIXED

### F7 — Account pages deep-import presentation; Actions mock is unused

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/account/builds/new.astro:3
- **Detail**: `src/modules/builds/index.ts` already exports `BuildForm` and `BuildFormInitialDraft`. Pages import `@/modules/builds/presentation/build-form` (and types) directly, against AGENTS.md entrypoint rules. `edit.astro` correctly uses `@/modules/builds/server` for the load. `vitest.config.ts` aliases `astro:actions` to `src/test/mocks/astro-actions.ts`, but `build-form.test.tsx` stubs `fetch` and never imports that mock.
- **Fix**: Import the island from `@/modules/builds`. Drop or stop aliasing the unused Actions mock until a caller exists.
- **Decision**: FIXED

### F8 — Price conversion lives in presentation, not domain/application

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/modules/builds/presentation/form-price.ts:15
- **Detail**: Plan said convert decimal price to minor units in domain/application before the Action. Conversion happens in `formStateToDraftInput` via `parsePriceToMinorUnits`. Domain still validates integer ≥ 0. Behavior is correct; the layer is not. Invalid strings (`19.999`) become `NaN` then `null`, so a bad price can save as empty rather than a field error. `integer` overflow above 2_147_483_647 is unmapped.
- **Fix**: Keep presentation parsing but reject `NaN` / over-int as field errors; optionally move `parsePriceToMinorUnits` next to domain validators.
- **Decision**: FIXED

### F9 — PartsRow gained an unplanned `errors` prop

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/ui/parts-row.tsx:53
- **Detail**: Phase 2 said compose the existing kit, not change it. `PartsRow` now accepts `errors?: string[]` and renders them through `FieldError` so part-row validation can show under the row. Not a “NOT Doing” item; it is supporting UI for criterion 2.11.
- **Fix**: Leave it and note the kit extension in a plan addendum (or stories if the visual contract changed).
- **Decision**: SKIPPED
