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

## Decorative linked media must not be an unnamed navigation stop

- **Context**: src/components/ui/build-card.tsx:73
- **Problem**: A details card that puts both the media and the title in separate links to the same destination can produce an unnamed navigation stop. When the image is missing, the media `<a>` wraps an `aria-hidden` placeholder. When the build is untitled, image alt falls back to empty, so the media link has no accessible name. When the name is present, alt defaults to the same string as the title, so keyboard and AT users get two consecutive identical links. Tests that only count two `href`s will lock this in.
- **Rule**:
- **Applies to**:
