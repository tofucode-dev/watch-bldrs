---
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
---

## Why this stack

WatchBldrs is a small, 1-week JavaScript/TypeScript web app with login and a main photo. The recommended Astro + React + TypeScript starter already includes a database, auth, and file storage, which matches those needs without adding payments, realtime, AI, or background jobs. Cloudflare Pages is the starter’s default deploy target; CI is GitHub Actions with auto-deploy on merge to main. Scaffolding support is first-class rather than fully battle-tested, which is acceptable for a short solo MVP that stays on the recommended path.
