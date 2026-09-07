# Repository Guidelines

## Project Context

WatchBldrs is an Astro 7 SSR application deployed to Cloudflare Workers. It uses React 19 islands, Tailwind CSS 4, shadcn/ui, Supabase PostgreSQL/Auth/Storage, and cookie-based authentication.

Read before making material changes:

- Product requirements and MVP scope: @prd.md
- Setup and operational details: @README.md
- Deployment (Workers, secrets, rollback): @docs/deployment.md
- Foundation documentation: @context/foundation/README.md
- Security (RLS, publication, Storage, Actions, auth): @docs/architecture/security.md
- Modules (boundaries, layers, imports, layout): @docs/architecture/modules.md
- Data model (schema, catalog read models): @docs/architecture/data-model.md
- Runtime (Workers, SSR, routes, state, validation): @docs/architecture/runtime.md
- Testing (unit, integration, component, E2E): @docs/architecture/testing.md
- Operational and security rules: @docs/OPERATIONAL_SAFETY.md

The product is a structured showcase for custom watch builds. Proving flow and deferred non-goals: @prd.md.

Keep the MVP deadline and scope in mind. Do not add modules, layers, or ports beyond what @docs/architecture/modules.md requires for the current feature.

## Non-Negotiable Repository Rules

- Use full SSR through `output: "server"` in @astro.config.mjs.
- Cloudflare Workers is the deployment runtime. Do not configure Cloudflare Pages for SSR/BFF behavior.
- API routes export uppercase `GET`, `POST`, `PATCH`, `PUT`, or `DELETE` handlers and explicitly declare `export const prerender = false`.
- Supabase server values use `astro:env/server`. The existing environment schema exposes `SUPABASE_URL` and `SUPABASE_KEY` in @astro.config.mjs.
- Use the auth client in @src/lib/supabase.ts and the session middleware in @src/middleware.ts unless an intentional refactor replaces both consistently.
- Every new database table is introduced through `supabase/migrations/YYYYMMDDHHmmss_short_description.sql`.
- Enable RLS and define explicit per-operation policies for every exposed table.
- Never expose a Supabase secret/service-role key to browser code, public environment variables, logs, or source control.
- Do not use Next.js directives or Next.js-only APIs.
- Use React only when Astro cannot provide the required client-side interaction.
- Merge conditional Tailwind classes with `cn()` from @src/lib/utils.ts. Never construct class strings by concatenation.
- Use the standalone @vitest.config.ts with its Node environment. Do not use Astro `getViteConfig`; Cloudflare workerd breaks that test runner setup.
- Use English for identifiers, filenames, code comments, commits, and technical documentation.

## Product Scope and Invariants

Do not implement PRD non-goals unless the user explicitly changes scope.

The architecture must enforce:

- drafts are private to their author;
- only the author can create, edit, publish, or delete their build;
- publication is one-way for the MVP: `draft -> published`;
- only published builds appear in catalog queries and public details;
- all active catalog filters combine with AND semantics;
- a user can like a published build at most once;
- a like is the only save mechanism in the MVP;
- the primary flow works on phone-sized and desktop-sized screens.

## Incremental Adoption

Proposed target architecture for incremental adoption. Existing code does not need to move only to match these docs. Apply the structure when implementing or materially changing a feature.

1. Keep existing auth code working in @src/lib/supabase.ts, @src/middleware.ts, and current auth endpoints.
2. Implement the first new business feature under `src/modules/builds`.
3. Add `catalog` when implementing the public list/details queries.
4. Add `likes` when implementing like/unlike.
5. Move an existing file only when touching it or when it violates a server/client or module boundary.
6. Add import restrictions to lint configuration after the target module entrypoints exist.

## Architecture and Module Rules

Vertical slice by business capability; layers live inside each module.

When adding code:

1. Pick the owning module (`auth`, `builds`, `catalog`, `likes`) per @docs/architecture/modules.md.
2. Place files in the correct layer and follow the source layout in the same document.
3. Import only through `@/modules/<name>` or `@/modules/<name>/server`.
4. Enforce RLS and publication rules per @docs/architecture/security.md before merging.

Do not create layers, interfaces, or empty directories to match a diagram. Create a layer subdirectory (`domain/`, `application/ports/`, etc.) only after the module has ≥2 files in that layer.

## Astro and React Rules

- Treat `src/pages` as routing and composition, not as the business layer.
- A page may parse route parameters, resolve the actor, call a use case, redirect, set status/metadata, and compose the view.
- Pages must not orchestrate use cases or run Supabase queries; call module `application/` functions from `@/modules/<name>/server`.
- Prefer Astro components and server-rendered HTML for non-interactive content.
- Hydrate only the smallest interactive React island.
- Add a `client:*` directive only when the component requires browser execution.
- Do not turn an entire page into a React island without a concrete interaction requirement.
- Keep client state close to the component that owns it.
- Add a client store only when ≥2 React islands on the same page must share form state (@docs/architecture/runtime.md).
- Cookies and Supabase Auth are the source of truth for the session; a React store is not an authorization mechanism.

## Actions, Endpoints, and Middleware

### Astro Actions

Prefer Actions for new UI-only mutations such as build creation, editing, publishing, deletion, and like/unlike. Existing auth endpoints may remain endpoint-based.

Keep @src/actions/index.ts as a registry that imports grouped actions from module server entrypoints. Pipeline and trust rules: @docs/architecture/security.md.

Every Action must:

- validate untrusted input at the boundary;
- resolve the actor server-side;
- invoke an application use case;
- map expected failures to a safe response contract;
- avoid returning raw Supabase errors, secrets, or internal details.

### API endpoints

Use API endpoints for:

- auth and OAuth callbacks;
- webhooks;
- public/external HTTP contracts;
- files or custom responses;
- cases requiring explicit HTTP method, status, or header control.

An endpoint is an HTTP adapter, not the business implementation.

### Middleware

Middleware may:

- create a request-scoped Supabase client;
- resolve and verify the session;
- place request-scoped identity data in `Astro.locals`;
- implement cross-cutting redirects, logging, and correlation IDs.

Middleware must not own feature-specific business rules. `Astro.locals` exists for one request and is not persistent storage. Details: @docs/architecture/security.md.

## Supabase Data and Security Rules

RLS, publication state, Storage access, and the authorization matrix: @docs/architecture/security.md. Schema shape: @docs/architecture/data-model.md.

Every exposed table needs migrations, RLS, and integration tests with anonymous, author A, and user B identities (@docs/architecture/testing.md).

General rules:

- Version schema, constraints, indexes, functions, triggers, grants, and RLS policies in migrations.
- Regenerate database TypeScript types after schema changes.
- Use a publishable key only for browser-safe access protected by RLS.
- Keep secret/service-role access server-only; verify authorization explicitly before use.
- Validate external input before passing it into a query or mutation.
- Never log passwords, tokens, cookies, secret keys, or signed URLs.

## Validation and Error Handling

- Validate data at every external boundary: forms, Actions, endpoints, OAuth callbacks, webhooks, and third-party responses.
- Separate shape/format validation from domain-rule validation.
- Use explicit domain/application errors for expected failures.
- Never show raw Supabase messages or stack traces to users.
- Every user-facing form, list, and mutation flow must implement loading, empty, success, validation-error, authorization-error, and unexpected-error states.
- Preserve submitted form values after recoverable validation failures.

Error categories and logging rules: @docs/architecture/runtime.md.

## Styling and Responsive UI

- Use Tailwind CSS 4 and the existing design tokens.
- Use shadcn/ui's `new-york` style from @src/components/ui. Add components with `npx shadcn@latest add [name]`.
- Use `cn()` for conditional class merging.
- Build mobile-first and verify the proving flow at phone and desktop widths.
- Prefer accessible semantic HTML before adding ARIA.
- Forms require associated labels, keyboard access, visible focus, and understandable error text.

## Build, Test, and Development Commands

Run scripts from @package.json (`dev`, `build`, `preview`, `deploy`, `lint`, `lint:fix`, `format`, `test`). Environment and local Supabase: @README.md. Workers deploy cookbook: @docs/deployment.md. Node version: @.nvmrc. Pre-commit hooks: `lint-staged` config in @package.json.

## Testing Guidelines

Vitest matches `src/**/*.{test,spec}.{ts,tsx}` per @vitest.config.ts. Co-locate unit tests beside source. Full test matrix: @docs/architecture/testing.md.

When testing auth helpers, follow @src/lib/supabase.test.ts. Mock `astro:env/server` and `@supabase/ssr`; unit tests must not require a live Supabase instance.

Minimum critical scenarios before merging data-access or auth changes:

1. Session cookie works after sign-in.
2. Draft visible only to author; another user cannot read or mutate it.
3. Published build appears in catalog; filters use AND semantics and exclude drafts.
4. Like/unlike works once per user on published builds only.
5. Draft images stay private; published images are publicly readable.
6. Proving flow works at phone and desktop widths.

## Commit and Pull Request Guidelines

- Use Conventional Commits prefixes such as `feat:`, `fix:`, `refactor:`, `test:`, and `docs:`.
- Keep commits focused on one coherent change.
- Pull requests target `main`.
- Do not mix unrelated refactors into a feature or bug fix.
- Explain architectural exceptions and security-sensitive changes in the PR description.

CI gate: @.github/workflows/ci.yml (`npm ci`, `npx astro sync`, lint, test, build with `SUPABASE_URL` and `SUPABASE_KEY` secrets). Pushes to `main` also run a `deploy` job (`needs: ci`) via `cloudflare/wrangler-action@v4` using `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Pull requests do not deploy.

## Agent Workflow

Before implementation:

1. Read the relevant PRD requirements and non-goals (@prd.md).
2. Read the architecture doc for the area you are changing (listed in Project Context).
3. Identify the owning business module and target layer.
4. Inspect the module's existing public API and patterns.
5. Identify authorization, RLS, validation, and mobile UI implications.
6. Pick the owning module and layer per @docs/architecture/modules.md; do not add abstractions not required by the acceptance criteria in @prd.md.

After implementation:

1. Run the relevant typecheck/lint, tests, and production build.
2. Verify that browser code imports no server-only entrypoint.
3. Check for cross-module deep imports and circular dependencies.
4. Verify boundary validation and server-side actor resolution.
5. Verify RLS/Storage policies when data access changed.
6. Check the relevant flow at phone and desktop widths when UI changed.
7. Report tests run, remaining risks, and any deliberate architectural exception.

## Definition of Done

A change is complete when:

- it satisfies the relevant PRD acceptance criteria without adding a non-goal;
- it lives in the correct module and layer;
- it follows the allowed dependency direction;
- it does not expose server-only code or secrets to the browser;
- untrusted input is validated;
- ownership, publication visibility, RLS, and Storage access are correct;
- relevant loading, empty, and error states are implemented;
- responsive and accessible behavior is preserved;
- data-access or RLS changes include integration tests; UI-only changes include component or E2E tests per @docs/architecture/testing.md;
- lint, tests, and the Cloudflare Workers build pass;
- affected documentation and contracts are updated.
