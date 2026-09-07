---
bootstrapped_at: 2026-09-07T12:38:06Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: watch-bldrs
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: watch-bldrs
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
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
```

## Why this stack

WatchBldrs is a small, 1-week JavaScript/TypeScript web app with login and a main photo. The recommended Astro + React + TypeScript starter already includes a database, auth, and file storage, which matches those needs without adding payments, realtime, AI, or background jobs. Cloudflare Pages is the starter’s default deploy target; CI is GitHub Actions with auto-deploy on merge to main. Scaffolding support is first-class rather than fully battle-tested, which is acceptable for a short solo MVP that stays on the recommended path.

## Pre-scaffold verification

| Signal             | Value                                                       | Severity | Notes                                                                                          |
| ------------------ | ----------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| npm package        | not run                                                     | —        | skipped: `cmd_template` starts with `git clone`                                                |
| GitHub repo        | przeprogramowani/10x-astro-starter last pushed 2026-08-22   | fresh    | from card.docs_url; `gh` was not on PATH, so recency used the GitHub HTTP API (`pushed_at`)    |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 31534 (18 top-level items, including `node_modules/` at 31487 files)
**Conflicts (.scaffold siblings)**: README.md
**.gitignore handling**: append-merged
**.bootstrap-scaffold cleanup**: deleted

Move log (cwd-relative):

- moved: `.github/`, `.husky/`, `.vscode/`, `node_modules/`, `public/`, `src/`, `supabase/`, `.env.example`, `.nvmrc`, `.prettierrc.json`, `astro.config.mjs`, `CLAUDE.md`, `components.json`, `eslint.config.js`, `package-lock.json`, `package.json`, `tsconfig.json`, `wrangler.jsonc`
- conflict: existing `README.md` kept; starter copy landed as `README.md.scaffold`
- dropped: none (`context/` absent from scaffold; cwd `context/` preserved)
- cloned `.git/` deleted before move-up; cwd `.git/` preserved

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 1 CRITICAL, 14 HIGH, 7 MODERATE, 3 LOW
**Direct vs transitive**: 0/1/2/0 direct of total 1/14/7/3 (npm `isDirect`; metadata.dependencies has prod/dev totals, not a separate direct count)

#### CRITICAL findings

- **tar** (transitive, range `<=7.5.20`, affects `supabase`) — node-tar PAX size override / file smuggling ([GHSA-vmf3-w455-68vh](https://github.com/advisories/GHSA-vmf3-w455-68vh)). Fix available via `npm audit fix`.

#### HIGH findings

- **astro** (direct, range `<=7.0.9`) — XSS via unescaped attribute names in spread props ([GHSA-jrpj-wcv7-9fh9](https://github.com/advisories/GHSA-jrpj-wcv7-9fh9)). Fix available.
- **brace-expansion** (transitive, range `<=1.1.17 || 3.0.0 - 5.0.8`) — DoS via exponential-time expansion ([GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp)). Fix available.
- **browserslist** (transitive, range `<=4.28.6`) — unbounded memory growth / OOM ([GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx)). Fix available.
- **devalue** (transitive, range `5.6.3 - 5.8.0`) — DoS via sparse array deserialization ([GHSA-77vg-94rm-hx3p](https://github.com/advisories/GHSA-77vg-94rm-hx3p)). Fix available.
- **fast-uri** (transitive, range `3.0.0 - 3.1.5`) — host confusion via backslash authority delimiter ([GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx)). Fix available.
- **js-yaml** (transitive, range `4.0.0 - 4.3.0`) — quadratic-complexity DoS in merge key handling ([GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68)). Fix available.
- **miniflare** (transitive, range includes `3.20250204.0 - 5.20260801.0-alpha`; affects `@cloudflare/vite-plugin`, `wrangler`) — inherited via `sharp`, `undici`, `ws`. Fix available.
- **nanoid** (transitive, range `<=3.3.17`) — non-secure generators can loop indefinitely with negative size ([GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv)). Fix available.
- **postcss** (transitive, range `<=8.5.22`) — incomplete sourceMappingURL fix, arbitrary `.map` file read ([GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp)). Fix available.
- **sharp** (transitive, range `<0.35.0`; affects `astro`, `miniflare`) — inherited libvips CVEs ([GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)). Fix available.
- **svgo** (transitive, range `4.0.0 - 4.0.1`) — `removeScripts` plugin leaves some executable scripts intact ([GHSA-2p49-hgcm-8545](https://github.com/advisories/GHSA-2p49-hgcm-8545)). Fix available.
- **undici** (transitive, range `7.0.0 - 7.28.0`; affects `miniflare`) — TLS certificate validation bypass via SOCKS5 ProxyAgent ([GHSA-vmh5-mc38-953g](https://github.com/advisories/GHSA-vmh5-mc38-953g)). Fix available.
- **vite** (transitive, range `7.0.0 - 7.3.3`) — NTLMv2 hash disclosure via UNC path handling on Windows ([GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)). Fix available.
- **ws** (transitive, range `8.0.0 - 8.20.1`; affects `@cloudflare/vite-plugin`, `miniflare`) — uninitialized memory disclosure ([GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx)). Fix available.

#### MODERATE findings

- **@astrojs/language-server** (transitive, range `2.14.0 - 2.16.10`) — via `volar-service-yaml`. Fix available.
- **@cloudflare/vite-plugin** (transitive) — via `miniflare`, `wrangler`, `ws`. Fix available.
- **supabase** (direct, range `1.1.6 - 2.98.2`) — via `tar`. Fix available.
- **volar-service-yaml** (transitive, range `<=0.0.70`; affects `@astrojs/language-server`) — via `yaml-language-server`. Fix available.
- **wrangler** (direct, range `3.108.0 - 4.101.0`; affects `@cloudflare/vite-plugin`) — via `esbuild`, `miniflare`. Fix available.
- **yaml** (transitive, range `2.0.0 - 2.8.2`; affects `yaml-language-server`) — stack overflow via deeply nested YAML collections ([GHSA-48c2-rrv3-qjmp](https://github.com/advisories/GHSA-48c2-rrv3-qjmp)). Fix available.
- **yaml-language-server** (transitive; affects `volar-service-yaml`) — via `yaml`. Fix available.

#### LOW / INFO findings

- **@babel/core** (transitive, range `<=7.29.0`) — arbitrary file read via sourceMappingURL ([GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8)). Fix available.
- **esbuild** (transitive, range `0.27.3 - 0.28.0`; affects `astro`, `wrangler`) — arbitrary file read on Windows dev server ([GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)). Fix available.
- **postcss-selector-parser** (transitive, range `7.1.0 - 7.1.2`) — DoS via uncontrolled AST recursion ([GHSA-w9m9-85wc-3x92](https://github.com/advisories/GHSA-w9m9-85wc-3x92)). Fix available.

INFO: 0

`npm audit` exit code was non-zero (vulnerabilities present). Bootstrapper did not halt and did not run `npm audit fix`.

## Remediation (2026-09-07)

Addressed the post-scaffold audit after bootstrap. `npm audit` is now **0 vulnerabilities**.

| Action | What changed |
| ------ | ------------ |
| `npm audit fix` | Patched transitive and compatible direct deps (including `tar`/`supabase`, `wrangler`, `vite`, `brace-expansion`, `undici`, `ws`, and related HIGH/MODERATE/LOW advisories). |
| Astro 6 → 7 | Remaining HIGH XSS in `astro` (`<=7.0.9`) has no 6.x patch. Upgraded `astro` to `^7.3.1`, `@astrojs/cloudflare` to `^14.3.0`, `@astrojs/react` to `^6.0.5`, `@astrojs/check` to `^0.9.10`. Removed the Vite 7 override so Astro 7 can use Vite 8. |

Verified: `npm audit` reports 0 findings; `npm run build` succeeds.

## Hints recorded but not acted on

| Hint                       | Value                |
| -------------------------- | -------------------- |
| bootstrapper_confidence    | first-class          |
| quality_override           | false                |
| path_taken                 | standard             |
| self_check_answers         | null                 |
| team_size                  | solo                 |
| deployment_target          | cloudflare-pages     |
| ci_provider                | github-actions       |
| ci_default_flow            | auto-deploy-on-merge |
| has_auth                   | true                 |
| has_payments               | false                |
| has_realtime               | false                |
| has_ai                     | false                |
| has_background_jobs        | false                |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Audit findings from this log were remediated (see **Remediation** above); re-run `npm audit` after future dependency updates.
