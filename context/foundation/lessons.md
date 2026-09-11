# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Exclude generated Database types from ESLint

- **Context**: eslint.config.js:79
- **Problem**: `{ ignores: ["src/lib/database.types.ts"] }` is not in the plan. It is supporting work so `npm run lint` (Phase 2 success criterion) does not fail on generated types. Not product scope.
- **Rule**:
- **Applies to**:
