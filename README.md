# WatchBldrs

A structured showcase for custom watch builds. Astro 7 SSR on Cloudflare Workers, React 19 islands, Supabase Auth/Postgres/Storage.

## Tech Stack

- [Astro](https://astro.build/) v7 — server-first rendering (`output: "server"`)
- [React](https://react.dev/) v19 — interactive islands only
- [TypeScript](https://www.typescriptlang.org/) v5
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Supabase](https://supabase.com/) — Auth, PostgreSQL, Storage
- [Cloudflare Workers](https://workers.cloudflare.com/) — SSR runtime (not Pages)

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/tofucode-dev/watch-bldrs.git
cd watch-bldrs
```

2. Install dependencies:

```bash
npm install
```

3. Set up Supabase and configure environment variables — see [Supabase Configuration](#supabase-configuration) below.

4. Create a `.dev.vars` file for local Cloudflare Worker secrets:

```bash
cp .env.example .dev.vars
```

5. Run the development server (`workerd`, not Node):

```bash
npm run dev
```

## Available Scripts

- `npm run dev` — development server (Cloudflare `workerd`)
- `npm run build` — production build
- `npm run preview` — production-like preview (`workerd`)
- `npm run deploy` — `astro build && wrangler deploy` to Cloudflare Workers
- `npm run lint` — ESLint with type-checked rules
- `npm run lint:fix` — auto-fix ESLint issues
- `npm run format` — Prettier
- `npm run test` — Vitest

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ └── assets/ # Static assets
├── public/ # Public assets
├── wrangler.jsonc # Cloudflare Workers config
├── supabase/ # Local Supabase config (already initialized)
```

## Supabase Configuration

Environment variables are declared via Astro's `astro:env` schema and are **server-only secrets** — they are never exposed to the client. Use the **anon / publishable** key only, never `service_role`.

`supabase/` already exists. Do **not** run `npx supabase init`.

### Local stack (optional, Docker required)

Requires [Docker](https://www.docker.com/) and ~7 GB RAM on first pull.

1. Copy env files:

```bash
cp .env.example .env
cp .env.example .dev.vars
```

2. Start the local stack:

```bash
npx supabase start
```

3. Copy the printed **anon** key (not `service_role`) into `.env` and `.dev.vars`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon key from CLI output>
```

4. Stop with `npx supabase stop`. Studio: `http://localhost:54323`.

Local Auth in `supabase/config.toml` uses `http://127.0.0.1:4321` and has email confirmations off. That file does not change a hosted project's Auth settings.

No product tables or migrations are required yet — Auth uses `auth.users` only.

### Hosted project (required for Workers)

Create the project in the [Supabase dashboard](https://supabase.com/dashboard), then from the repo:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
```

Put the **Project URL** and **anon public** key into `.env` and `.dev.vars`:

| Variable       | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `SUPABASE_URL` | Project URL from Supabase dashboard → Settings → API       |
| `SUPABASE_KEY` | `anon` public key from Supabase dashboard → Settings → API |

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-key>
```

Hosted Auth URL Configuration is dashboard-only (`config.toml` does not push it):

- Site URL = the live `https://watch-bldrs.<subdomain>.workers.dev` origin (no trailing slash)
- Redirect URLs: that origin `/**` plus `http://127.0.0.1:4321/**`
- Email confirmations: **on** for production

### Auth routes

| Route                 | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `/auth/signin`        | Email/password sign-in form                                             |
| `/auth/signup`        | Email/password sign-up form                                             |
| `/auth/confirm-email` | Post-signup "check your inbox" page                                     |
| `/dashboard`          | Example protected page (redirects to `/auth/signin` if unauthenticated) |

Route protection is handled in `src/middleware.ts`. Add paths to the `PROTECTED_ROUTES` array there to require authentication.

## Deployment

Full command cookbook, secret stores, rollback, and first-deploy bootstrap: [docs/deployment.md](docs/deployment.md).

This app deploys to Cloudflare **Workers**. Never `wrangler pages deploy`.

```bash
npm run deploy
```

Worker runtime secrets (`npx wrangler secret put`) are separate from GitHub Actions build secrets. Both must be the hosted `SUPABASE_URL` and **anon** `SUPABASE_KEY`.

## CI

GitHub Actions runs lint, test, and build on every push and PR to `main`. Pushes to `main` also deploy with Wrangler after CI passes. Configure repository secrets `SUPABASE_URL` and `SUPABASE_KEY` for the **build** step, plus `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` for deploy. Build secrets do not reach the Worker.

## License

MIT
