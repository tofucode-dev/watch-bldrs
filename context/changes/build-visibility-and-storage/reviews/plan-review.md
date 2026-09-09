<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Build Visibility and Private Main-Image Storage

- **Plan**: `context/changes/build-visibility-and-storage/plan.md`
- **Mode**: Deep
- **Date**: 2026-09-10
- **Verdict**: REVISE
- **Findings**: 0 critical 4 warnings 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | WARNING |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding
Grounding: 11/11 paths ✓, 4/4 symbols ✓, brief↔plan ✓

Existing files the plan edits or cites all exist (`src/lib/supabase.ts`, `src/middleware.ts`, `supabase/config.toml`, `vitest.config.ts`, `package.json`, `README.md`, `deployment.md`, `data-model.md`, `security.md`, `src/types.ts`, `astro.config.mjs`). Claimed-absent paths are absent (`supabase/migrations/`, `supabase/seed.sql`, `src/modules/`, `src/actions/`, `src/lib/database.types.ts`, `tests/integration/`). Symbols match: `createServerClient`, env schema `SUPABASE_URL`/`SUPABASE_KEY` only, Vitest include `src/**/*.{test,spec}.{ts,tsx}`, `[db.seed] sql_paths = ["./seed.sql"]`. Brief phases, decisions, and scope match the plan. Progress section is well-formed (one `## Progress`, phase names match, success criteria mapped, no checkboxes in phase bodies). No `lessons.md` or `contract-surfaces.md`.

## Findings

### F1 — Phase 2 doc sync misses testing.md and related one-way-publish contracts

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Phase 2 — Architecture contract sync
- **Detail**: The plan’s core exception is SQL allowing `published → draft` while the product stays one-way. Phase 2 updates `security.md` (and data-model schema notes) but does not list `context/foundation/architecture/testing.md`, which still requires “published-to-draft transition rejection” (`testing.md:18`). After Phase 3, integration tests will assert the opposite of the testing contract. Related one-way wording also remains in `AGENTS.md:48`, `modules.md:26`, and roadmap F-01 (`roadmap.md:44,79`). Product-level “no unpublish UI” can stay; the DB/testing contradiction cannot.
- **Fix**: Expand Phase 2’s architecture-sync file list: update `testing.md` so the required check is “author UPDATE `published → draft` succeeds and re-hides the row/object” (matching Phase 3). Add a one-liner on `AGENTS.md` / `modules.md` / roadmap F-01 that the *product* remains one-way while the *database* allows the reverse until a later slice.
- **Decision**: PENDING

### F2 — OPERATIONAL_SAFETY §16 exceptions are named, not filled in

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 2 — Architecture contract sync; Desired End State
- **Detail**: Phase 2 says to “Record OPERATIONAL_SAFETY §16 exceptions” as two bullets in `security.md`: (1) no DB forbid on unpublish; (2) CI does not run RLS tests or typegen drift. §16 is an exception *process*, not a bucket: identify the exact rule, why the normal approach is unsuitable, security/integrity impact, compensating controls, whether it is temporary, and record it in a PR or architecture decision (`OPERATIONAL_SAFETY.md:201-210`). The plan does not fill those fields. It also does not edit `OPERATIONAL_SAFETY.md` §1/§15, which still say CI should fail on typegen mismatch and that RLS/Storage must be tested as three identities. Compensating control for unpublish is “S-02 Action layer,” which this slice does not ship — between F-01 merge and S-02, an author JWT can unpublish via the Data API (brief already flags this; author can already DELETE, so the integrity stake is catalog presence, not cross-user leak). Research’s F-01 success bar was “`published → draft` is rejected by the database” (`research.md:201`).
- **Fix A ⭐ Recommended**: Keep SQL unpublish (user-chosen door). Write a real §16 block in `security.md` (exact rules: publication state machine + §1/§15 CI). Compensating controls: RLS still owner-only; product/UI must not expose unpublish; S-02 Actions reject the reverse; local `test:integration` + `db:types` are merge gates (call out in AGENTS.md DoD). Mark whether each exception is temporary. Optionally add a short note under OPERATIONAL_SAFETY §15 pointing at that ADR.
  - Strength: Matches the locked plan/brief decision; unpublish is weaker than author DELETE, which RLS already allows.
  - Tradeoff: Until S-02, the Data API is the only control, which §16 says is not enough if treated as a UI check — the writeup must say that plainly.
  - Confidence: HIGH — brief already chose this; architecture docs just need the exception filled in.
  - Blind spot: Whether hosted `db push` happens before S-02 (the hole exists only after SQL is live).
- **Fix B**: Restore the `published → draft` forbid trigger in Phase 1, invert Phase 3 tests to expect rejection, drop exception (1). Keep exception (2) for local-only CI with a proper §16 writeup.
  - Strength: Matches `security.md` today, research success criteria, `testing.md`, and OPERATIONAL_SAFETY “UI check is not sufficient.”
  - Tradeoff: Closing the SQL door now means a later migration if unpublish is wanted; contradicts the explicit “What We’re NOT Doing” item.
  - Confidence: HIGH — this is the architecture default the plan deliberately left.
  - Blind spot: Product still has no unpublish UI either way.
- **Decision**: PENDING

### F3 — Storage test matrix omits listing and non-owner object delete

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 3 — Storage matrix
- **Detail**: Phase 1’s key risk is a weak Storage SELECT/list policy leaking draft photos. Phase 3 covers upload-after-row, cross-prefix deny, draft download deny, published signed URL/download, and unpublish hiding. It does not lock: (a) anon/`B` must not `list()` the author’s prefix or the bucket; (b) `B` cannot UPDATE/DELETE A’s object; (c) upload before the build row exists must fail (Critical Implementation Details already require the parent-row check). Success criteria can pass while listing still leaks names of draft objects.
- **Fix**: Add those three cases to Phase 3’s Storage contract (and a matching Progress checkbox 3.5, or fold into the existing 3.1 title via a Phase 3 note — do not renumber after review if 3.1’s intent is only “test:integration exits 0”; prefer an extra numbered step only if you want it tracked separately). At minimum spell the cases under Phase 3 Changes Required §3 so 3.1 covers them.
- **Decision**: PENDING

### F4 — Text length caps required but unnumbered

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 — Enums and tables
- **Detail**: OPERATIONAL_SAFETY §8 requires explicit length limits in database constraints (`OPERATIONAL_SAFETY.md:105`). The plan says “length cap” for `name`, `story`, `main_image_path`, part `name`, and `product_url` with no numbers. `DOMAIN_DICTIONARY.md` and `data-model.md` also have none. Implementer has to invent CHECK/varchar limits; two agents will pick different values.
- **Fix**: Pin limits in the Phase 1 contract, e.g. `builds.name` 120, `story` 4000, `main_image_path` 512, `build_parts.name` 120, `product_url` 2048.
- **Decision**: PENDING

### F5 — `build_parts.id` has no `gen_random_uuid()` default

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 — Enums and tables
- **Detail**: `builds.id` is `uuid pk default gen_random_uuid()`; `build_parts.id` is `id uuid pk` with no default (`plan.md:98` vs `112`). `data-model.md` is silent on both. PostgREST inserts would need a client-supplied UUID unless the default is added.
- **Fix**: Give `build_parts.id` the same `default gen_random_uuid()` as `builds.id`.
- **Decision**: PENDING

### F6 — Enum `USAGE` grants unspecified

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 — RLS policies / grants
- **Detail**: Table grants are specified (`authenticated` CRUD, `anon` SELECT, no extra `public`). `GRANT USAGE ON TYPE` for the new enums is not. Without it, Data API selects of enum columns often fail for `anon`/`authenticated` even when RLS allows the row.
- **Fix**: Add `GRANT USAGE ON TYPE` for every new enum to `anon` and `authenticated` (and `REVOKE ALL` on tables from `public` before the role grants, if that is the intended recipe).
- **Decision**: PENDING

### F7 — Phase 2 manual check runs `test:integration` before tests exist

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 — Manual Verification / Progress 2.4
- **Detail**: Progress 2.4 is “README steps for `supabase start` → `db reset` → `db:types` → `test:integration` are accurate when followed once.” `test:integration` and the tests land in Phase 3. Following the README “once” at the Phase 2 pause fails.
- **Fix**: Narrow 2.4 to `start` → `reset` → `db:types`, and keep the `test:integration` README follow-through as part of 3.1/3.4.
- **Decision**: PENDING
