# Testing Strategy

RLS test identities: @context/foundation/architecture/security.md. Commands and workflow: @AGENTS.md.

## Unit

- Build status transitions;
- ownership decisions;
- part price/currency invariant;
- use-case orchestration with fake ports;
- filter normalization and AND query construction.

## Integration

Run against local Docker Supabase after `npx supabase db reset`:

```bash
npm run test:integration
```

- migrations apply from a clean local Supabase state;
- RLS matrix for anonymous, author A, and user B (`tests/integration/build-visibility.test.ts`);
- author UPDATE `published → draft` succeeds and re-hides the row and object from anonymous and user B;
- Storage access for draft and published images (`tests/integration/build-image-storage.test.ts`);
- catalog queries never return drafts (covered when S-03 lands).

GitHub Actions does not run these tests. They are merge gates for schema/RLS/Storage changes alongside `npm run db:types` (@AGENTS.md Definition of Done; exception in @context/foundation/architecture/security.md#ci-verification-exception).

## Component

Vitest (`src/**/*.test.tsx`, jsdom) is the component test runner. Storybook (`npm run storybook`) is a visual workshop for `src/components/ui`; it does not replace these assertions.

- editor validation and preservation of submitted values;
- list loading/empty/error/success states;
- filter controls update the URL correctly;
- like/unlike optimistic or pending behavior;
- keyboard and focus behavior.

Do not import `@/modules/*/server`, `astro:env/server`, or other Worker-only modules in stories. Co-locate `*.stories.tsx` next to the React primitive they show.

## E2E

Cover the proving flow rather than every implementation branch:

1. sign in;
2. create a draft;
3. confirm another user cannot see or mutate it;
4. publish it;
5. find it through the catalog and filters;
6. open public details;
7. like and unlike once;
8. repeat the main flow at a phone-sized viewport.
