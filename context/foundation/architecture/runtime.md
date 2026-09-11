# Runtime, Rendering, and Application Flow

Module layout: @context/foundation/architecture/modules.md. Operational rules: @AGENTS.md.

## Technology and Runtime

Stack versions, scripts, and dependencies: @package.json. Runtime configuration: @astro.config.mjs, @wrangler.jsonc.

### Why Cloudflare Workers instead of Pages

The application requires SSR, cookie-based authentication, Astro Actions, and server-side integration with Supabase. The current Astro Cloudflare adapter targets Cloudflare Workers for these features and no longer supports deploying its SSR output to Cloudflare Pages.

Static pages and assets can still be prerendered and served efficiently in the same Workers deployment. Use `output: "server"` globally and opt individual static routes into prerendering with `export const prerender = true`.

### Runtime constraints

Request-time code runs in Cloudflare `workerd`, not a traditional Node.js server.

- Prefer standard Web APIs.
- Check Workers compatibility before adding a server-side dependency.
- Do not assume filesystem access, a persistent process, or unrestricted Node.js APIs.
- Enable `nodejs_compat` only after confirming the dependency requires it and passes a Workers build.
- Store production secrets as Cloudflare secrets, never in `wrangler.jsonc` or source control.
- Do not use mutable global state as storage between requests.

## Rendering and Interaction Strategy

Use server rendering by default.

| Need                              | Preferred mechanism                  |
| --------------------------------- | ------------------------------------ |
| Public catalog initial data       | Astro SSR                            |
| Public build details              | Astro SSR                            |
| Account build list                | Authenticated Astro SSR              |
| Build editor interaction          | Small React island                   |
| Build mutation                    | Astro Action                         |
| Like/unlike interaction           | Small React island calling an Action |
| OAuth/auth callback               | API endpoint                         |
| Webhook or external HTTP contract | API endpoint                         |
| Fully static legal/about content  | Astro prerendering                   |

Do not hydrate read-only content. Keep filter values in the URL query string so filtered catalog states are linkable, refresh-safe, and available to SSR.

Storybook is a separate local Vite process (`npm run storybook`, port 6006) for isolated React UI-kit work. It is not an app route, not `workerd`, and not part of the Workers deploy. Config: `.storybook/`; stories: `src/components/ui/**/*.stories.tsx`; tokens: `src/styles/global.css`. Canonical viewing notes: `design-system.md`.

All catalog reads and build mutations must go through Astro SSR or Actions. Direct browser Supabase calls are forbidden except Storage upload, and only with RLS/Storage policies verified (@context/foundation/architecture/security.md).

## Suggested Route Map

Exact URLs may follow existing repository conventions, but the responsibilities should remain:

| Route                       | Responsibility                               |
| --------------------------- | -------------------------------------------- |
| `/builds` or `/`            | Public published-build catalog and filters   |
| `/builds/[id]`              | Public details for a published build         |
| `/sign-in`                  | Passwordless/OAuth sign-in entry             |
| `/account`                  | Current author's drafts and published builds |
| `/account/builds/new`       | Create/edit a draft                          |
| `/account/builds/[id]/edit` | Author-only editor                           |
| `/api/auth/*`               | Auth submission/callback/logout as required  |

Routes parse HTTP concerns and call module APIs. They must not orchestrate use cases or run Supabase queries; delegate to `@/modules/<name>/server`.

## State Ownership

| State                          | Source of truth                     |
| ------------------------------ | ----------------------------------- |
| Authentication/session         | Supabase Auth and cookies           |
| Current request actor          | `Astro.locals` for one request      |
| Build publication state        | PostgreSQL row and domain invariant |
| Catalog filters                | URL search parameters               |
| Initial page data              | Astro SSR result                    |
| Form draft while editing       | Local React/form state              |
| Like interaction pending state | Local React island                  |
| Cross-request persistence      | Supabase, never Worker globals      |

Add a client store only when ≥2 React islands on the same page must share form state. A client store is never an authorization mechanism.

## Validation and Error Model

Validate at every external boundary:

- form submissions;
- Actions;
- API endpoints;
- URL filter parameters;
- OAuth callbacks;
- Storage metadata;
- third-party responses.

Separate three error categories:

1. Input errors: malformed email, URL, price, currency, file, or filter value.
2. Expected application/domain errors: unauthenticated, forbidden, build not found, already liked, invalid publication transition.
3. Unexpected infrastructure errors: unavailable service, timeout, unknown database failure.

Return safe errors to the UI and log useful diagnostic context without tokens, passwords, cookies, secret keys, signed URLs, or private user data.
