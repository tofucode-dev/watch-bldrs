# Security Model

Operational rules: @AGENTS.md.

## RLS Authorization Matrix

RLS policies and grants are part of the architecture, not an implementation afterthought.

| Resource and operation | Anonymous | Authenticated non-author | Author |
| --- | --- | --- | --- |
| Select published build | Allow | Allow | Allow |
| Select draft build | Deny | Deny | Allow |
| Insert build | Deny | Own row only | Own row only |
| Update build | Deny | Deny | Allow |
| Publish build | Deny | Deny | Allow once |
| Delete build | Deny | Deny | Allow |
| Select parts of published build | Allow | Allow | Allow |
| Select parts of draft | Deny | Deny | Allow |
| Mutate parts | Deny | Deny | Allow for owned parent |
| Select likes/count | Allow | Allow | Allow |
| Insert like | Deny | Own like on published build | Own like on published build |
| Delete like | Deny | Own like only | Own like only |

Test policies with at least three identities:

- anonymous;
- author A;
- different authenticated user B.

Tests must call the data boundary as those identities. Testing only application code does not prove RLS correctness. See @docs/architecture/testing.md.

## Publication State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft: create
    Draft --> Draft: edit
    Draft --> Published: publish
    Draft --> [*]: delete
    Published --> Published: edit
    Published --> [*]: delete
```

There is no `Published -> Draft` transition in the MVP.

Enforce the state machine at multiple levels:

1. Domain/application code rejects an invalid transition.
2. The database prevents `published -> draft`, using a trigger, controlled function, or another explicit database invariant.
3. RLS verifies ownership for every mutation.

RLS alone should not be assumed to compare old and new status reliably; use an explicit database invariant for the one-way transition.

## Main Image and Storage Strategy

Draft image privacy makes a fully public bucket unsafe.

Recommended MVP approach:

1. Store all build images in a private bucket.
2. Use object paths scoped by verified author and build, for example `USER_ID/BUILD_ID/main.ext`.
3. Allow the author to upload, replace, and delete objects for their own builds.
4. Generate time-limited signed read URLs for catalog/details output after verifying that the build is published.
5. Generate author-only signed URLs for draft management.
6. Store only the object path in `builds.main_image_path`, never a temporary signed URL.

If a later implementation moves published files into a public bucket, publication and file movement must run in one transaction or use compensating rollback. If that is not achievable in the MVP, keep the private-bucket strategy above.

Image validation should include allowed media type, size limit, and safe generated object names. Never trust the original filename as an authorization boundary.

## Astro Actions and BFF Boundary

Astro on Cloudflare Workers acts as the application's BFF. The BFF is part of the same repository; it is still server-side code.

Recommended Actions: `actions.builds.createDraft`, `actions.builds.update`, `actions.builds.publish`, `actions.builds.delete`, `actions.likes.like`, `actions.likes.unlike`.

`src/actions/index.ts` is only a registry that imports grouped actions from each module's `server.ts` entrypoint. See incremental adoption in @AGENTS.md.

Every Action follows the same pipeline:

```mermaid
flowchart LR
    INPUT["Untrusted input"] --> VALIDATE["Validate shape"]
    VALIDATE --> ACTOR["Resolve actor"]
    ACTOR --> USECASE["Run use case"]
    USECASE --> RESULT["Map safe result"]
```

Actions must not trust an `authorId`, `userId`, role, build owner, or publication state supplied by the browser. Actor identity comes from the verified server-side session.

## Authentication and Request Context

@src/middleware.ts is responsible for cross-cutting request setup:

- create or expose the request-scoped Supabase client;
- verify/refresh the cookie-backed session according to the existing auth implementation;
- store a minimal current-actor representation in `Astro.locals`;
- avoid feature-specific authorization decisions.

Suggested actor contract: `@src/types.ts` (`Actor`).

Feature authorization remains in the relevant use case and database policy. UI route guards improve user experience but do not replace RLS.
