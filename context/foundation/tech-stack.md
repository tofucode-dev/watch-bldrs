---
starter_id: 10x-astro-starter
package_manager: npm
project_name: watch-bldrs
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

WatchBldrs is a small, 1-week TypeScript web app with login, PostgreSQL, and private-then-public image storage. The Astro starter already includes those pieces without payments, realtime, AI, or background jobs. The app is Astro 7 SSR (`output: "server"`) on Cloudflare Workers (`npx wrangler deploy`, never Pages), with React 19 islands only where interaction is required. CI is GitHub Actions with auto-deploy on merge to `main`.

This file is the living stack inventory. Module boundaries, RLS, schema, runtime rules, and tests live in `architecture/` — do not duplicate them here.

## Current stack

Versions: `package.json`. Runtime config: `astro.config.mjs`, `wrangler.jsonc`. Deploy: `deployment.md`. Platform choice: `infrastructure.md`.

| Layer | Choice |
| --- | --- |
| Language | TypeScript 5 |
| App framework | Astro 7, `output: "server"` |
| UI | React 19 islands, Tailwind CSS 4, shadcn/ui (`new-york`) |
| Auth / data / files | Supabase Auth, PostgreSQL, Storage (`@supabase/ssr`) |
| Runtime | Cloudflare Workers (`workerd` via `@astrojs/cloudflare`) |
| Package manager | npm |
| Tests | Vitest (Node; standalone `vitest.config.ts`) |
| CI | GitHub Actions, auto-deploy on merge to `main` |

Feature flags from the original selection still hold: auth yes; payments, realtime, AI, and background jobs no.

## Architecture map

How this stack is used. Canonical rules stay in the linked docs.

| Concern | Doc |
| --- | --- |
| Modules (`auth`, `builds`, `catalog`, `likes`), layers, imports | `architecture/modules.md` |
| SSR vs islands, Actions vs endpoints, routes, state, validation | `architecture/runtime.md` |
| RLS, publication state machine, Storage, actor resolution | `architecture/security.md` |
| Tables, catalog read model, AND filters | `architecture/data-model.md` |
| Unit, integration, component, E2E | `architecture/testing.md` |

Operational rules for agents: `AGENTS.md`. Product scope: `prd.md`. Inventory: `README.md`.
