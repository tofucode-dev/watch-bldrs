---
project: watch-bldrs
researched_at: 2026-09-07
recommended_platform: Cloudflare Workers
runner_up: Netlify
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 7 + React 19
  runtime: Cloudflare Workers (workerd)
---

## Recommendation

**Deploy on Cloudflare Workers.**

WatchBldrs is already an Astro 7 SSR app (`output: "server"`, `@astrojs/cloudflare@^14.3.0`, `wrangler@^4.90.0`). That adapter targets Workers, not Pages. Interview constraints were request/response only, minimize cost, global latency, and external data (Supabase) — Workers is the only candidate that is already wired, edge-native, and free or $5/month at 10k–100k requests. Netlify is the runner-up if `workerd` CPU or Node compatibility becomes a blocker.

`context/foundation/tech-stack.md` records `deployment_target: cloudflare-workers`. Do not use `wrangler pages deploy`.

## Platform Comparison

Interview weights applied: cost first, global reach second, no existing platform familiarity, co-located platform DB not required. Persistent connections are not needed, so serverless platforms were not filtered out. All six platforms can run TypeScript; Fly/Railway/Render need a Node adapter and a container or always-on process.

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | 5 Pass |
| Vercel | Pass | Pass | Pass | Pass | Partial (MCP public beta, checked 2026-09-07) | 4 Pass, 1 Partial |
| Netlify | Partial (no first-class rollback command) | Pass | Pass | Pass | Pass (MCP GA) | 4 Pass, 1 Partial |
| Fly.io | Pass | Pass | Pass | Partial (rollback depends on retained images) | Partial | 3 Pass, 2 Partial |
| Railway | Partial (dashboard rollback) | Pass | Pass | Partial | Pass | 3 Pass, 2 Partial |
| Render | Partial (no CLI rollback) | Pass | Pass | Partial | Pass | 3 Pass, 2 Partial |

**Cloudflare Workers.** `npx wrangler deploy`, `npx wrangler rollback`, `npx wrangler tail`, and `npx wrangler secret put` cover the agent ops loop. Docs ship as `llms.txt` plus GitHub MDX. Official MCP servers exist (docs, Workers, observability — observability still marked work-in-progress). Free: 100k requests/day with a **10 ms CPU/invocation** cap. Paid Workers is **$5/month** (10M requests + 30M CPU-ms). Static assets are free. Fits global users without standing up a VM.

**Vercel.** Official `@astrojs/vercel` v11 for Astro 7; SSR is Node Functions (Fluid compute, GA), not full-app Edge. CLI is strong (`vercel deploy --prod`, `vercel rollback`, `vercel logs`). Hobby is $0 but **non-commercial only**; a product MVP needs Pro at **$20/seat**. MCP remains public beta (checked 2026-09-07). Cost weight dropped it off the shortlist.

**Netlify.** Official `@astrojs/netlify@8.2.5` (GA, Astro 7). Credit plans: Free $0 / 300 credits with a hard pause; Personal $9. MCP is GA. Deploy is `netlify deploy --prod`; rollback is `netlify api restoreSiteDeploy` or the dashboard, not a dedicated CLI command. Functions default to Ohio; custom region is Pro. Cheaper than Vercel, weaker rollback, requires swapping the Cloudflare adapter.

**Fly.io.** Real Node via `@astrojs/node` + Docker. `fly deploy`, `fly logs`, image-based rollback. No ongoing free tier for new orgs (trial is 2 VM-hours or 7 days). Always-on `shared-cpu-1x` 256 MB is about **$2–6/month**. Global means extra Machines and extra cost. Right escape hatch if Workers CPU/`workerd` fails; wrong default for a one-week, cost-first MVP that already has a Workers adapter.

**Railway.** Node container, Hobby **$5/month** usage credit, billed for always-on RAM (`$10/GB-month`). Default is one replica in one of four regions — not edge compute. No CLI rollback (dashboard; Hobby images kept 72h). MCP is GA. Fine DX, poor fit for global + cheapest.

**Render.** Node web service with `@astrojs/node`. Free instances still exist but spin down after 15 minutes (~1 minute cold start). Always-on Starter is **$7/month**. Single region, locked after create. No CLI rollback. MCP is GA. Same global/cost gap as Railway.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Won on stack fit, cost, and global edge. The repo already deploys through the Cloudflare adapter and Wrangler. External Supabase is the intended data plane, so missing first-party Postgres on Workers is not a gap. Remaining risks are the Free CPU cap, `workerd` vs Node, and Pages-vs-Workers confusion — recorded below rather than treated as disqualifiers.

#### 2. Netlify

Closest serverless alternative with an official Astro 7 adapter, credit-based pricing that can stay near $0–9, a global CDN, and a GA MCP server. Loses because it requires an adapter swap, has no first-class rollback CLI, and origin functions are regional rather than edge-compute.

#### 3. Fly.io

Cheapest always-on Node path (~$2–6/month) and the cleanest way to leave `workerd`. Loses because it needs a Dockerfile, is not edge-native unless you pay for more regions, and adds VM operations this MVP does not need.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. **Free Workers cap CPU at 10 ms per invocation.** Astro SSR plus a Supabase Auth/DB round-trip will often exceed that. The “free” path can error or force the **$5/month Paid** plan — still cheap, but not free.
2. **`workerd` is not Node.** `@supabase/ssr`, cookies, and some Node APIs are only partially compatible. This repo already sets `nodejs_compat` because `compatibility_date` is `2026-05-08` (the flag became default only for dates ≥ 2026-08-04). Remaining gaps show up as production-only failures.
3. **Pages vs Workers confusion.** `@astrojs/cloudflare` v14 deploys to Workers. `wrangler pages deploy` is the wrong command. The tech-stack hint is `cloudflare-workers`.
4. **Workers allow 6 concurrent outbound connections per request.** One SSR page that fans out to Supabase Auth, Postgres, and Storage can hit that limit and look like flaky auth.
5. **Hard limits:** 128 MB memory, 64 MiB Worker bundle, 25 MiB / 20k files on Free static assets, 1 s startup. React 19 + `supabase-js` can pressure the bundle. Cloudflare dashboard Auto Minify can break React hydration.

### Pre-Mortem — How This Could Fail

The team treated “Cloudflare Pages” from the starter as the deploy target. CI ran `wrangler pages deploy` against an Astro 7 Workers build. Preview URLs 404’d. Someone switched to `wrangler deploy` without mapping `SUPABASE_URL` and `SUPABASE_KEY` into Workers secrets (they only existed as GitHub Actions build secrets), so production rendered empty catalog pages and login silently failed.

Once that was fixed, every listing request from Europe still waited on a single-region Supabase project. Edge compute was global; the database was not. p95 latency looked broken even though Workers were healthy. Free-tier CPU timeouts started on publish. Auto Minify in the dashboard stripped React hydration and the like button died on mobile. Six months later the team had a $5 Workers bill, a Pages/Workers identity crisis in docs, and no one trusted `wrangler rollback` because the last “fix” had been a dashboard toggle nobody recorded.

### Unknown Unknowns

- **`npm run dev` and `npm run preview` already use `workerd`** on Astro 6+ / `@astrojs/cloudflare` v13+. A parallel `wrangler dev` loop is redundant and can disagree with `astro:env`.
- **`wrangler deploy --env` is the wrong environment switch for this adapter.** Astro 6+ wants `CLOUDFLARE_ENV=<env> astro build && wrangler deploy`.
- **`wrangler deploy --temporary` needs Wrangler ≥ 4.102.0.** This repo pins `wrangler@^4.129.1`.
- **Preview URLs are opt-in** on Wrangler 4.34+. This `wrangler.jsonc` does not set `preview_urls`, so branch previews stay off until enabled.
- **Worker name is `watch-bldrs`.** First deploy publishes that name on `workers.dev`.
- **CI does not auto-deploy yet.** `.github/workflows/ci.yml` runs lint, test, and build only. The tech-stack hint `auto-deploy-on-merge` lands after the first successful manual deploy.

## Operational Story

- **Preview deploys**: Local production-like check is `npm run build && npm run preview` (`workerd`). Git-connected Workers Builds use `npx wrangler versions upload` on non-main branches and can post `*.workers.dev` preview URLs; that requires `preview_urls: true` in Wrangler (currently unset) and is **workers.dev only** (no custom domain on previews). Current GitHub Actions do not publish previews. Treat preview URLs as public unless Cloudflare Access is added. Fork PRs should not receive production secrets.
- **Secrets**: Production values live as Workers secrets (`npx wrangler secret put SUPABASE_URL`, `npx wrangler secret put SUPABASE_KEY`). Values are write-only — `wrangler secret list` returns names, not values. Rotate by putting a new value. GitHub Actions secrets `SUPABASE_URL` / `SUPABASE_KEY` are for `astro build` only and do not reach the deployed Worker. Local: `.dev.vars` (already in the README). Never log cookies, tokens, or secret values.
- **Rollback**: `npx wrangler rollback` (previous version) or `npx wrangler rollback <VERSION_ID>`. List with `npx wrangler versions list`. Typical revert is seconds. Only the last 100 versions are eligible. Rollback does **not** undo Supabase migrations, Storage uploads, or secret changes. Durable Object migrations can block rollback (not used in this MVP).
- **Approval**: A human must create the Cloudflare account, complete `wrangler login`, enable Paid Workers if the 10 ms cap hits, rotate production secrets, and own the Supabase project. After login, an agent may build, `wrangler deploy`, `wrangler tail`, and `wrangler rollback` unattended. Do not let an agent delete the Worker or the Supabase project.
- **Logs**: Read-only live stream: `npx wrangler tail` or `npx wrangler tail --status error --format json`. Cloudflare Observability is enabled in `wrangler.jsonc`. Official observability MCP exists but was still marked work-in-progress on 2026-09-07 — prefer the CLI for a reliable agent path.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Free-tier 10 ms CPU exceeded by SSR + Supabase | Devil's advocate / Research finding | H | M | Measure CPU in `wrangler tail` / observability on first publish flow; enable Paid Workers ($5/mo) if invocations exceed 10 ms |
| `workerd` incompatibility with `@supabase/ssr` or Node APIs | Devil's advocate / Unknown unknowns | M | H | Keep `nodejs_compat`; use `npm run dev` (already `workerd`) so failures show locally; do not assume Node libraries work |
| Deploying as Pages instead of Workers | Devil's advocate / Pre-mortem | M | H | Use `npm run build && npx wrangler deploy` only; never `wrangler pages deploy` |
| 6 concurrent outbound fetches per request | Devil's advocate | M | M | Sequence or batch Supabase calls in SSR loaders; avoid fan-out of Auth + DB + Storage on one tick |
| Dashboard Auto Minify breaks React hydration | Devil's advocate / Pre-mortem / Astro deploy docs | M | M | Disable Auto Minify (and Rocket Loader) on the zone; verify like/publish islands after first deploy |
| Edge Worker vs single-region Supabase latency | Pre-mortem | H | M | Place the Supabase project close to the primary audience; keep catalog queries small; do not assume edge HTML implies edge DB |
| Build secrets ≠ runtime secrets | Pre-mortem | H | H | After first deploy, `wrangler secret put` both `SUPABASE_*` keys; confirm login works on the `workers.dev` URL |
| Preview URLs off / public by default | Unknown unknowns | H | L | Enable `preview_urls` only when needed; put Access in front of previews if they show drafts |
| Worker name mismatch on first publish | Unknown unknowns | L | L | `wrangler.jsonc` `name` is already `watch-bldrs` |
| `wrangler deploy --env` misused with Astro 6+ | Unknown unknowns | M | M | Use `CLOUDFLARE_ENV=<env> npx astro build && npx wrangler deploy` if adding environments |
| Image-binding quota (adapter default `cloudflare-binding`, 5k unique transforms/mo free) | Research finding | L | L | WatchBldrs stores the main photo in Supabase Storage; avoid routing every catalog image through Cloudflare Images unless needed |

## Getting Started

This repo is already a Workers app. Do not run `wrangler init` or `npx astro add cloudflare`.

1. Log in: `npx wrangler login` (uses the project Wrangler 4.x).
2. Set runtime secrets (not GitHub Actions secrets): `npx wrangler secret put SUPABASE_URL` then `npx wrangler secret put SUPABASE_KEY`.
3. Develop with `npm run dev` — Astro 7 + this adapter already runs `workerd`. Do not add a separate `wrangler dev` as the primary loop. Production-like check: `npm run build && npm run preview`.
4. Deploy: `npm run deploy` (`astro build && wrangler deploy`). Confirm the printed `*.workers.dev` URL. Cookbook: `docs/deployment.md`. If SSR CPU exceeds 10 ms, move the Worker to the Paid plan ($5/month).

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup (current `ci.yml` is lint/test/build only)
- Production-scale architecture (multi-region, HA, DR)
