# Deployment

WatchBldrs deploys to **Cloudflare Workers**, not Cloudflare Pages. Never run `wrangler pages deploy` or `npx astro add cloudflare`. The Worker name is `watch-bldrs` in `wrangler.jsonc`.

Live MVP URL: `https://watch-bldrs.contact-tofucode.workers.dev`. Custom domain is optional later.

Do **not** enable Cloudflare dashboard “Workers Builds” (Git-connected) in parallel with GitHub Actions — that double-deploys.

Daily development stays on `npm run dev` (already `workerd`). Do not add a parallel `wrangler dev` loop.

## Secrets: two stores

Mixing these is the usual production-auth failure (empty catalog + silent login fail).

| Store | Secrets | Purpose |
| --- | --- | --- |
| Local (gitignored `.dev.vars` and `.env`) | `SUPABASE_URL`, `SUPABASE_KEY` | `npm run dev` / `preview` |
| GitHub Actions | `SUPABASE_URL`, `SUPABASE_KEY` | `astro build` only. Never reach the Worker |
| Cloudflare Worker runtime | `SUPABASE_URL`, `SUPABASE_KEY` | Live SSR, cookies, Auth |

Use the hosted **anon / publishable** key only. Never put `service_role` in Wrangler, GitHub Actions, client code, or source control. Never put secret values in `wrangler.jsonc` `vars`. Do not add `account_id` to git unless you explicitly want it there; CI can use `CLOUDFLARE_ACCOUNT_ID`.

`wrangler.jsonc` declares `secrets.required`: `SUPABASE_URL` and `SUPABASE_KEY`. A deploy without those Worker secrets fails instead of shipping a dead auth client.

GitHub build secrets do **not** populate Worker runtime secrets. After deploy, confirm login on the `workers.dev` URL, not only that CI went green.

## First-time setup

A human must create the Cloudflare and hosted Supabase accounts. Do not let an agent delete the Worker or the Supabase project.

1. Cloudflare account at [dash.cloudflare.com](https://dash.cloudflare.com), email verified. Workers Free is enough to start. Upgrade to **Workers Paid ($5/month)** if SSR + Supabase exceeds the **10 ms CPU / invocation** Free cap.
2. Confirm a `*.workers.dev` subdomain (Workers & Pages → Settings). First `wrangler deploy` may prompt to create it. A **523** on first hit is usually DNS; wait about one minute.
3. Hosted Supabase project (region close to the audience, e.g. Frankfurt). Local Docker Supabase is not the production data plane.
4. From the repo root (Node 22 per `.nvmrc`, local CLIs via `npx`):

```bash
npx wrangler login
npx wrangler whoami
npx supabase login
npx supabase link --project-ref <project-ref>
```

Copy **Account ID** from `whoami` for later GitHub `CLOUDFLARE_ACCOUNT_ID`. Do not run `npx wrangler init` or `npx supabase init` — both already exist in this repo.

5. Put the hosted Project URL and **anon** key into `.env` and `.dev.vars` (from `.env.example`). Never the `service_role` key.
6. Set Worker runtime secrets (values are write-only; `wrangler secret list` shows names only):

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
npx wrangler secret list
```

If `secret put` fails because the Worker does not exist yet: deploy once **without** `secrets.required`, put the secrets, restore `secrets.required`, deploy again.

7. Set GitHub Actions secrets `SUPABASE_URL` and `SUPABASE_KEY` (build only).
8. After the first live URL exists, set hosted Auth → URL Configuration:
   - Site URL = `https://watch-bldrs.<subdomain>.workers.dev` (no trailing slash)
   - Additional Redirect URLs: that origin `/**` plus `http://127.0.0.1:4321/**`
   - Email confirmations: **on** for production
9. Set `site` in `astro.config.mjs` to that origin so `@astrojs/sitemap` has a canonical URL.

Storage CORS for the `workers.dev` origin is required when browser uploads land; not for the first HTML-only deploy.

Do **not** create: a Cloudflare Pages project, D1, R2, Hyperdrive, a Cloudflare Images pipeline, or a second Git deploy integration.

## Local production-like check

```bash
npm run build
npm run preview
```

## Deploy / rollback / logs

```bash
npm run deploy
npx wrangler versions list
npx wrangler rollback
npx wrangler rollback <VERSION_ID>
npx wrangler tail
npx wrangler tail --status error --format json
```

`npm run deploy` is `astro build && wrangler deploy`. Never `wrangler pages deploy`. Never `wrangler deploy --env` with this adapter.

If Wrangler named environments are added later (not MVP):

```bash
CLOUDFLARE_ENV=<env> npx astro build && npx wrangler deploy
```

Wrong: `npx wrangler deploy --env <env>` ([withastro/astro#16040](https://github.com/withastro/astro/issues/16040)).

Useful dry-run (does not publish):

```bash
npx wrangler deploy --dry-run
```

**Rollback does not undo** Supabase migrations, Storage changes, or `wrangler secret put`. Only the last 100 Worker versions are eligible. Durable Object migrations are not used.

## Rotate a secret

Put a new value. List never shows values.

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
```

## Hosted Auth vs local Docker Auth

`supabase/config.toml` applies to `npx supabase start` only. Hosted Site URL / redirects are dashboard-only unless you use a documented config-sync flow. Setting `site_url` in git does not change production Auth.

Local Auth uses `http://127.0.0.1:4321` (Astro’s default). Leave local confirmations off if you want sign-in without mail. Production hosted Auth must keep confirmations **on**. If confirmation links still point at localhost, signup “works” locally and fails in production.

There is no `supabase/migrations/` yet. Do not invent a `db push`. When migrations exist, `npx supabase db push` (or dashboard SQL) is separate from Worker rollback.

## Smoke after first deploy

- Home renders at the printed `https://watch-bldrs.<subdomain>.workers.dev` URL.
- Sign-up / sign-in sets a session cookie and `/dashboard` stays authenticated after refresh.
- Missing runtime secrets must not silently look “up”.
- Tail CPU on the first authenticated page: `npx wrangler tail --status error --format json`.

If invocations exceed ~10 ms CPU, enable Workers Paid. Do not treat Free as a guarantee for SSR + Auth + DB.

Cache: never apply “Cache Everything” on cookie routes (`docs/OPERATIONAL_SAFETY.md` §5).

## CI

`.github/workflows/ci.yml` runs lint, test, and build on PRs and `main`. Pushes to `main` then run a `deploy` job (`needs: ci`) with `cloudflare/wrangler-action@v4`.

GitHub secrets:

- `SUPABASE_URL` / `SUPABASE_KEY` — `astro build` only. They do not become Worker runtime secrets.
- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` — deploy job only. Fork pull requests never receive these tokens because deploy is gated to `push` on `main`.

Do not publish preview URLs for this MVP (`preview_urls: false` in `wrangler.jsonc`, because Wrangler 4.129 enables them by default when the key is omitted).

## Adapter defaults this app turns off

`astro.config.mjs` sets `adapter: cloudflare({ imageService: "compile" })` and top-level `session: false`. Catalog photos stay on Supabase Storage (avoid the default Images binding quota). Auth uses cookies + `@supabase/ssr`, not Astro sessions, so SESSION KV is not provisioned.
