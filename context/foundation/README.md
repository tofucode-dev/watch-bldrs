# Foundation Docs

Cross-change living documents that span multiple changes. Each project picks which foundation docs it needs (e.g. product requirements, tech-stack, roadmap, glossary, test-stack). Foundation docs are owned by the skills that read and write them; this README describes the conventions that apply to all of them.

WatchBldrs keeps product, stack, architecture, and ops in this folder. There is no separate `docs/` tree.

## Update convention

**Edit-in-place.** Foundation docs evolve over the lifetime of the project. When something changes incrementally (a new dependency, a refined product goal, a shifted milestone), edit the existing file. Don't create dated copies.

## Archive convention

When a foundation doc is fully superseded — replaced by a new approach rather than refined — move it to `foundation/archive/YYYY-MM-DD-<doc>.md` and write the replacement at the original path. The archive folder is a historical record; nothing reads from it routinely.

## Anti-pattern

Do **not** put change-scoped docs here. Anything tied to a single change (its plan, its research, its review) belongs under `context/changes/<change-id>/`. Foundation is for what outlives any one change.

---

## Inventory

### Product and planning

| File | What it is | Canonical for |
| --- | --- | --- |
| `prd.md` | Schema-conformant product requirements | MVP scope, FRs, non-goals, access control |
| `shape-notes.md` | Structured discovery that fed the PRD | How the PRD was decided |
| `IDEA.md` | Original MVP sketch | Historical feature list only — `prd.md` wins on conflict |
| `DOMAIN_DICTIONARY.md` | Product glossary | Names of domain terms (Build, Like, Filter, …) |
| `roadmap.md` | Open milestone and vertical slices | What to build next |
| `tasks-linear.md` | Linear issue identifiers for those slices | Tracker IDs, not sequencing |

### Stack and platform

| File | What it is | Canonical for |
| --- | --- | --- |
| `tech-stack.md` | Chosen starter and stack inventory | Language, framework, runtime, CI |
| `infrastructure.md` | Platform research and deploy-target choice | Why Workers, not Pages |
| `deployment.md` | Workers cookbook | Secrets stores, rollback, first deploy |
| `health-check.md` | Point-in-time health audit | Snapshot; re-run rather than treat as current architecture |

### Architecture and operations

How the stack is used. `tech-stack.md` lists the choices; these files are the rules.

| File | Implements | Canonical for |
| --- | --- | --- |
| `architecture/modules.md` | `tech-stack.md` + `prd.md` capabilities | Module boundaries (`auth`, `builds`, `catalog`, `likes`), layers, imports |
| `architecture/runtime.md` | `tech-stack.md` + `infrastructure.md` | SSR vs islands, Actions vs endpoints, routes, state, validation |
| `architecture/security.md` | `prd.md` Access Control | RLS matrix, publication state machine, Storage, actor resolution |
| `architecture/data-model.md` | `prd.md` + `DOMAIN_DICTIONARY.md` | Tables, catalog read model, AND filters |
| `architecture/testing.md` | `tech-stack.md` (Vitest) | Unit, integration, component, E2E matrix |
| `OPERATIONAL_SAFETY.md` | Complements `AGENTS.md` and `architecture/security.md` | Migration, cache, logging, and production safety rules |

Agent entrypoint: `AGENTS.md` at the repo root. It points here.

### Conflict rule

1. **Product scope** — `prd.md`. `IDEA.md` still lists Favourites, gallery photos, search, and ranking; those are PRD non-goals.
2. **Domain wording** — `DOMAIN_DICTIONARY.md`, unless the PRD explicitly deferred the concept.
3. **How to implement** — `architecture/` and `OPERATIONAL_SAFETY.md`.
4. **How to deploy** — `deployment.md`, chosen in `infrastructure.md`.
5. **What to build this week** — `roadmap.md`, tracked in `tasks-linear.md`.
