# Operational Safety Rules

## Purpose

This document defines operational and security rules for WatchBldrs that complement @AGENTS.md and @context/foundation/architecture/security.md.

Contributors and coding agents must read this document before changing:

- database schema, migrations, functions, grants, or RLS;
- authentication, sessions, Actions, or API endpoints;
- caching or Cloudflare configuration;
- file uploads or Supabase Storage;
- user-generated content or external URLs;
- server-side logging, monitoring, or error handling.

These rules protect data integrity, draft confidentiality, authentication, and production behavior. They are normative unless a documented architectural decision explicitly supersedes them.

## 1. Database Migration Safety

- Never edit a migration that may already have run in another environment. Add a new forward migration instead.
- A clean local database must be reproducible entirely from committed migrations and synthetic seed data.
- Use timestamped migration names: `supabase/migrations/YYYYMMDDHHmmss_short_description.sql`.
- Keep a migration focused on one coherent schema change.
- Wrap related statements in `BEGIN`/`COMMIT` unless a statement cannot run inside a transaction (e.g. `CREATE INDEX CONCURRENTLY`).
- Define constraints, indexes, grants, RLS policies, functions, and triggers in migrations rather than through untracked dashboard changes.
- Regenerate database TypeScript types after every schema change.
- CI should fail when committed generated database types do not match the migrated schema.
- Seed files must contain synthetic data only and must be safe to run repeatedly.
- Test a full reset from an empty local database before merging a migration that changes access control or publication behavior.

## 2. PostgreSQL Function Security

- Prefer `security invoker`, which is also the PostgreSQL default.
- A `security definer` function requires explicit justification in the migration and review as privileged code.
- Every `security definer` function must set `search_path = ''` and schema-qualify all referenced relations and functions.
- Revoke default function execution from `public`, `anon`, and `authenticated` unless a function is intentionally exposed.
- Grant `EXECUTE` only to the exact roles that require the function.
- Do not accept an owner ID or user ID parameter when the function can derive the actor from `auth.uid()`.
- Validate authorization inside privileged functions before reading or mutating protected records.
- Do not use `security definer` merely to work around an incorrect RLS policy.
- Return only fields required by the caller; privileged functions must not expose internal or cross-user data.

## 3. Atomicity and Transactions

- Use a transaction or PostgreSQL function when partial completion would leave invalid state.
- Publishing a build must update all publication-dependent state atomically.
- A build and its submitted parts must not be left in mutually inconsistent states after a failed command.
- Database constraints are authoritative for uniqueness and data invariants. Application checks exist for feedback, not race-condition safety.
- Do not implement uniqueness with a read-then-insert sequence without a database uniqueness constraint.
- Do not rely on sequential client requests when the operation must succeed or fail as one unit.
- Use compensating cleanup when an external operation succeeds but the related database transaction fails.

## 4. Idempotency and Concurrent Requests

- Mutations that may be retried must be idempotent or safely detect duplicate execution.
- Like must remain correct when two requests arrive concurrently; enforce `(build_id, user_id)` uniqueness in the database.
- Unlike must succeed safely when the like is already absent.
- Publishing an already published build must not reset `published_at`, duplicate side effects, or expose inconsistent data.
- DELETE must succeed (204 or safe redirect) when the target row is already gone; do not return 404 for the author's own already-deleted build.
- Avoid read-modify-write logic for counters. Use database aggregates or atomic database operations.
- Do not assume a disabled button prevents duplicate requests.
- For destructive actions, prevent accidental double submission in the UI while preserving server-side correctness.

## 5. Cache Boundaries

- Authenticated, account-specific, draft, Action, and session-mutating responses must use `Cache-Control: private, no-store`.
- Never cache a response containing personalized data or `Set-Cookie`.
- Never apply a broad Cloudflare “Cache Everything” rule without excluding authenticated and cookie-bearing routes.
- Public catalog and details responses may be cached only when their output is independent of authentication and cookies.
- A catalog cache key must include every normalized filter and pagination parameter that changes the response.
- Do not cache validation, authorization, rate-limit, or unexpected-error responses unless explicitly designed and reviewed.
- Publishing, editing, or deleting a build must invalidate, revalidate, or safely bypass stale public catalog/details data.
- Cache signed image URLs for no longer than their validity period.
- When uncertain whether a response contains user-specific data, treat it as private and non-cacheable.

## 6. Mutation and CSRF Safety

- Never perform a state-changing operation through `GET`.
- Use `POST`, `PATCH`, `PUT`, or `DELETE` according to the operation's semantics.
- Treat every Astro Action as a publicly reachable endpoint.
- Authorize every protected Action inside its handler, even when middleware gates the route.
- Resolve the actor from the verified server-side session; never trust an actor, owner, or role supplied by the client.
- Cookie-authenticated custom endpoints must enforce same-origin requests or use an explicit CSRF defense.
- Validate `Origin` and expected host/proxy behavior before trusting an origin check in production.
- OAuth callbacks must validate the provider state/PKCE flow through the supported Supabase integration.
- Logout and other session-changing operations must use a mutation request rather than a link-triggered `GET`.
- Return safe authorization errors without revealing whether a protected record exists for another user.

## 7. Abuse Prevention and Rate Limiting

- Apply rate limits to sign-in, sign-up, magic-link requests, build mutations, likes, and upload preparation.
- Define separate rate limits for auth (sign-in, sign-up, magic-link), uploads, and likes; document thresholds in the PR when adding limits.
- Handle `429 Too Many Requests` as an expected UI state with a clear retry message.
- Do not automatically retry a rate-limited mutation in a tight loop.
- Do not reveal whether an email address is already registered through authentication messages.
- Add Cloudflare Turnstile or another Supabase-supported CAPTCHA after repeated failed sign-in attempts from the same IP or before a public launch without local-only auth.
- Do not add CAPTCHA to every product interaction without evidence; preserve the low-friction sign-in requirement.
- Use database constraints and authorization even when a request has already passed rate limiting or CAPTCHA.

## 8. User-Generated Content

- Treat build names, stories, part names, filenames, image metadata, and product URLs as untrusted input.
- Render user-authored text as escaped text.
- Do not render raw user-provided HTML without an explicit sanitization pipeline and security review.
- Apply explicit length limits in both boundary validation and database constraints.
- Normalize text only when the normalization does not change user meaning.
- Do not insert untrusted content into HTML, script, style, SQL, headers, redirects, or logs through string interpolation.
- Preserve user-entered values after recoverable form validation failures.
- Error messages must not echo secrets, raw queries, stack traces, or unsafe HTML.

## 9. External URL and SSRF Safety

- Accept only `https:` and, when explicitly required, `http:` product URLs.
- Reject credentials, control characters, unsupported schemes, and malformed URLs.
- Server code must never fetch a user-provided URL unless SSRF protections and an explicit destination allowlist are implemented.
- Do not follow arbitrary redirects from user-controlled URLs on the server.
- User-provided external links must use `rel="noopener noreferrer nofollow ugc"` when opened by the browser.
- Opening a user-provided link in a new tab requires `target="_blank"` and the safe `rel` values above.
- Do not treat URL validation as proof that the linked content is safe or trustworthy.

## 10. Image Upload Safety

- Define and enforce a maximum upload size before reading the entire body.
- Allow only explicitly supported image formats.
- Validate detected file signatures; do not trust the extension or browser-provided MIME type alone.
- Validate image dimensions to prevent decompression and memory-exhaustion attacks.
- Generate Storage object names server-side.
- Never use the original filename as an authorization boundary or final object key without sanitization.
- Scope object paths by the verified author and build, for example `USER_ID/BUILD_ID/main.ext`.
- Prevent crafted paths from overwriting another user's object.
- Keep draft images private to their author.
- Expose a published image only after the corresponding build is verifiably published.
- Store a stable object path in the database, never a temporary signed URL.
- Remove unnecessary metadata, especially location-bearing EXIF data, when the image-processing pipeline supports it.
- Define cleanup behavior for replaced images, failed submissions, abandoned drafts, and deleted builds.
- Test Storage policies using anonymous, author, and authenticated non-author identities.

## 11. Money and Structured Values

- Do not use JavaScript floating-point arithmetic for persisted monetary values.
- Store prices as integer minor units or validated database decimals and serialize them without precision loss.
- Require a supported currency whenever a price is present.
- Price and currency must either both be present or both be absent.
- Do not infer currency from user locale.
- Do not calculate an automatic build total in the MVP.
- Normalize filterable values through controlled vocabularies rather than accepting arbitrary variants.
- Store authoritative timestamps in UTC and generate them on the server or database.
- Treat database IDs as opaque identifiers; do not encode business meaning in them.

## 12. Query and Performance Discipline

- Avoid `select("*")` in production queries. Select only fields required by the read model.
- Every collection query must have a deterministic order and a bounded result size.
- Validate and normalize pagination and filter inputs before creating a query.
- Catalog filter state belongs in URL search parameters.
- Avoid N+1 queries. Load parts and like counts through joins, aggregates, views, or bounded parallel queries.
- Do not compute public like counts by loading every like row into the Worker.
- Add indexes for foreign keys and demonstrated filter/query patterns, guided by query plans rather than speculation.
- Include explicit image dimensions to prevent layout shifts.
- Use responsive image variants and lazy loading for images below the fold.
- Do not hydrate a component solely to fetch data that Astro can provide during SSR.
- Add caching, denormalization, or a client state library only after a Worker trace or local benchmark shows catalog SSR p95 above a threshold documented in the PR.

## 13. Logging and Observability

- Assign or propagate a request/correlation ID for server-side operations.
- Use structured logs with operation name, outcome, duration, and safe identifiers.
- Do not log complete request or response bodies by default.
- Never log passwords, magic-link tokens, cookies, access tokens, refresh tokens, secret keys, signed URLs, or private image contents.
- Avoid logging email addresses and user-authored stories unless explicitly required and redacted.
- Return stable public error codes while retaining infrastructure details only in server-side logs.
- Distinguish expected validation/authorization failures from unexpected operational failures.
- Monitor unexpected `5xx`, repeated `401/403`, rate-limit `429`, upload failures, and database constraint failures.
- Cleanup and background work must be observable, bounded, and safe to retry.
- Logging failures must not break the user's primary operation.

## 14. Dependency and Supply-Chain Discipline

- Prefer platform Web APIs or small local code over a new dependency for trivial behavior.
- Before adding a server dependency, verify compatibility with Cloudflare Workers/workerd.
- Before adding a client dependency, evaluate bundle size and whether it forces unnecessary hydration.
- Commit the package lockfile and use deterministic installs in CI.
- Do not add an abandoned or unmaintained package for security-sensitive behavior.
- Keep dependency additions scoped to the feature that requires them.
- Do not silence security advisories without documenting impact and mitigation.
- Remove dependencies that become unused after a refactor.

## 15. CI and Verification

Standard CI gate: @AGENTS.md (lint, test, build).

Additionally verify for in-scope changes:

- migrations apply from a clean local database;
- generated database types match the migrated schema (CI should fail on mismatch);
- RLS and Storage policies are tested as anonymous, author, and non-author;
- server-only modules and secrets do not enter the client bundle.

A security-sensitive change is not complete when it is tested only through the UI.

## 16. Exception Process

An exception to this document must:

1. identify the exact rule being bypassed;
2. explain why the normal approach is unsuitable;
3. document the security and data-integrity impact;
4. include compensating controls;
5. define whether the exception is temporary;
6. be recorded in the relevant pull request or architecture decision.

Convenience, time pressure, or an existing UI check is not sufficient justification for weakening database authorization or exposing server secrets.
