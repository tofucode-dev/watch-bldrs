<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Photo Upload Component Implementation Plan

- **Plan**: context/changes/photo-upload-component/plan.md
- **Mode**: Deep
- **Date**: 2026-09-12
- **Verdict**: SOUND
- **Findings**: 0 critical, 2 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding

Grounding: 13/13 existing paths ✓, 5/5 symbols ✓, brief↔plan ✓

Existing modify/cite paths all exist (`astro.config.mjs`, `.env.example`, `README.md`, `context/foundation/deployment.md`, `src/lib/supabase.ts`, `src/lib/supabase.test.ts`, `.storybook/main.ts`, `supabase/migrations/20260910201541_build_visibility_and_storage.sql`, `tests/integration/build-image-storage.test.ts`, `src/components/ui/field.tsx`, `src/components/ui/parts-row.tsx`, `src/test/setup.ts`, `context/foundation/design-system.md`). New files (`photo-upload.tsx`, `main-image-file.ts`, `supabase-browser.ts`, `upload-main-image.ts`) are correctly absent. Symbols match: `createClient`, `@supabase/ssr` `createBrowserClient` (url+key, default `document.cookie`, `httpOnly: false`), `Field`/`FieldLabel`/`FieldError`, bucket `build-images`, `SUPABASE_KEY`. Progress section is well-formed (one `## Progress`, phase names match, success criteria mapped, no checkboxes in phase bodies). No `docs/reference/contract-surfaces.md`. Brief phases, decisions, and scope match the plan.

## Findings

### F1 — PUBLIC_* are build-time, not Worker secrets

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 2 — Client-public env fields / Migration Notes
- **Detail**: Phase 2 adds optional `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY` as `context: "client", access: "public"` and says "S-02 will need them set where the island ships." `astro:env` public client fields are inlined at `astro build`. `wrangler secret put` and `wrangler.jsonc` `secrets.required` do not reach the browser bundle — the same two-store mix-up `deployment.md` already warns about for SSR auth (`deployment.md:11-25`; `infrastructure.md` already recorded a production outage from putting keys in the wrong store). CI today only injects `SUPABASE_*` at build (`.github/workflows/ci.yml:23-25,45-47`). README still says env vars are "server-only secrets — they are never exposed to the client" (`README.md:82`); the plan updates README/`.env.example` but not `AGENTS.md:29` (schema exposes only server `SUPABASE_URL` / `SUPABASE_KEY`) and does not add a client-bundle row to the deployment secrets table. Leaving this vague means S-02 can ship a live island whose `createBrowserSupabaseClient()` is permanently `null` in production.
- **Fix A ⭐ Recommended**: Keep fields optional and CI unchanged in this slice. Expand the Phase 2 env contract and `deployment.md` "Secrets: two stores" table with a third row: `PUBLIC_SUPABASE_*` are GitHub Actions / `.env` **build-time** values (anon pair only), never `wrangler secret put`, never `secrets.required`. Update `AGENTS.md` env-schema sentence. One-line S-02 prerequisite: production upload needs those build secrets set.
  - Strength: Matches the plan's "do not change CI this slice"; teaches the injection path before an island exists; same lesson as the SSR-secrets outage.
  - Tradeoff: S-02 can still forget to add CI secrets when the island ships.
  - Confidence: HIGH — Astro public client env is inlined at build; CI and wrangler currently only know `SUPABASE_*`.
  - Blind spot: Exact Astro 7 + Cloudflare adapter substitution for optional unset public fields is not re-verified beyond current optional-server-field behavior.
- **Fix B**: Also add `PUBLIC_SUPABASE_*` to CI build `env` in this slice (same anon values as `SUPABASE_*`) so later deploys already inline them.
  - Strength: S-02 cannot ship a null browser client because the keys were never in the build.
  - Tradeoff: CI/ops work in a UI-kit slice; unused public env in the client bundle until the island exists.
  - Confidence: MEDIUM — requires GitHub secret names and confirming operators will copy the anon key, not service_role.
  - Blind spot: Whether optional client fields that are set in CI but unused by any island affect the Workers bundle size in a material way.
- **Decision**: FIXED via Fix A

### F2 — `uploadMainImage` failure and `contentType` contract is implied by tests, not specified

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 — Upload helper
- **Detail**: The helper "returns `{ path }`" on success. Test cases say validation failure skips Storage and upload error skips delete, but the TypeScript result/error shape is unstated (throw vs `{ path } | { error }`). `contentType` is named in the `upload()` options with no source — `file.type` can be empty after the plan's "if type is present and disagrees, reject" rule, and the bucket allowlist would then reject the upload. `validateMainImageFile` must be async (`File.slice().arrayBuffer()`), but the contract reads as a sync call; PhotoUpload change/drop handlers and jsdom tests need to await it. S-02 will call this helper; an unstable signature is rework.
- **Fix**: Specify `validateMainImageFile` as async; `uploadMainImage` as `Promise<{ path: string }>` that throws a small typed error on validation or Storage failure; set `contentType` from the detected signature (`image/jpeg|png|webp`), not from `file.type`.
- **Decision**: FIXED

### F3 — jsdom has no `URL.createObjectURL` mock

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1 — Component tests
- **Detail**: Selected-state tests must assert a preview `<img>`. `src/test/setup.ts` only loads `@testing-library/jest-dom/vitest`. jsdom 29 leaves `URL.createObjectURL` / `revokeObjectURL` undefined. Node 22 File.slice for magic-bytes tests is fine (`.nvmrc` 22.14.0).
- **Fix**: Polyfill `createObjectURL` / `revokeObjectURL` in `photo-upload.test.tsx` (or `src/test/setup.ts`) and still revoke on change/clear/unmount as the Critical Implementation Details require.
- **Decision**: FIXED

### F4 — PhotoUpload `error` plus `FieldError` can emit two `role="alert"` nodes

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architectural Fitness
- **Location**: Phase 1 — PhotoUpload well / Stories
- **Detail**: `FieldError` already renders `role="alert"` (`field.tsx:201-209`). PhotoUpload also exposes parent `error` as `role="alert"`. The Invalid story allows `Field` + `FieldError` "and/or" the well validation alert. Callers that do both will double-announce. Input does not wrap Field; Invalid Field stories put `FieldError` on the parent and `aria-invalid` on the control (`field.stories.tsx:46-54`).
- **Fix**: Keep well-internal validation as the only `role="alert"` inside PhotoUpload; parent `error` can set `aria-invalid` on the well and let callers render `FieldError`. Document that composition in the Invalid story.
- **Decision**: FIXED
