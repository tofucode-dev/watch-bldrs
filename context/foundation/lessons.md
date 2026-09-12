# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Exclude generated Database types from ESLint

- **Context**: eslint.config.js:79
- **Problem**: `{ ignores: ["src/lib/database.types.ts"] }` is not in the plan. It is supporting work so `npm run lint` (Phase 2 success criterion) does not fail on generated types. Not product scope.
- **Rule**:
- **Applies to**:

## Write accepted look gaps when checking visual criteria

- **Context**: context/changes/authoring-form-components/plan.md:285
- **Problem**: Criterion 2.12 requires remaining look gaps vs the mockup to be written down, not forced. The checkbox was marked done with no appended list, unlike Phase 1 item 1.12. Stories can show a visual pass happened, but the written-drawbacks part of the criterion has no evidence.
- **Rule**:
- **Applies to**:
