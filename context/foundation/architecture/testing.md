# Testing Strategy

RLS test identities: @context/foundation/architecture/security.md. Commands and workflow: @AGENTS.md.

## Unit

- Build status transitions;
- ownership decisions;
- part price/currency invariant;
- use-case orchestration with fake ports;
- filter normalization and AND query construction.

## Integration

- migrations apply from a clean local Supabase state;
- RLS matrix for anonymous, author A, and user B;
- one-like uniqueness;
- author UPDATE `published → draft` succeeds and re-hides the row and object from anonymous and user B;
- Storage access for draft and published images;
- catalog queries never return drafts.

## Component

- editor validation and preservation of submitted values;
- list loading/empty/error/success states;
- filter controls update the URL correctly;
- like/unlike optimistic or pending behavior;
- keyboard and focus behavior.

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
