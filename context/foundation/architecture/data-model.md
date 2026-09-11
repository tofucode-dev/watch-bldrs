# Data Model and Catalog Queries

RLS matrix: @context/foundation/architecture/security.md. Schema migration rules: @AGENTS.md.

## Proposed Relational Model

The schema is implemented in `supabase/migrations/20260910201541_build_visibility_and_storage.sql`. Generated TypeScript types live in `src/lib/database.types.ts` (`npm run db:types`).

### Enums

Postgres enum labels (lowercase snake_case; S-02 maps display copy):

| Type | Labels |
| --- | --- |
| `build_status` | `draft`, `published` |
| `watch_style` | `diver`, `field`, `dress`, `gmt`, `pilot`, `integrated`, `other` |
| `movement` | `nh35`, `nh36`, `nh34`, `miyota_8215`, `other` |
| `dial_colour` | `black`, `white`, `blue`, `green`, `silver`, `other` |
| `strap_type` | `leather`, `nato`, `rubber`, `steel_bracelet`, `other` |
| `hands_style` | `mercedes`, `sword`, `dauphine`, `baton`, `other` |
| `part_category` | `movement`, `case`, `dial`, `hands`, `bezel`, `crystal`, `strap`, `bracelet`, `other` |

Every attribute and part enum includes `other`. `build_status` does not.

### `builds`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `author_id` | `uuid` | References Supabase Auth user |
| `status` | `build_status` | `draft` or `published` |
| `name` | `text` | Optional; max 120 chars |
| `story` | `text` | Optional; max 4000 chars |
| `watch_style` | `watch_style` | Optional, filterable |
| `movement` | `movement` | Optional, filterable |
| `dial_colour` | `dial_colour` | Optional, filterable |
| `strap_type` | `strap_type` | Optional, filterable |
| `hands_style` | `hands_style` | Optional |
| `case_size_mm` | `integer` | Optional, filterable; 20–70 when set |
| `main_image_path` | `text` | Storage object path, max 512; not a signed URL |
| `published_at` | `timestamptz` | Set once on first publish; not cleared on unpublish |
| `created_at` | `timestamptz` | Database default |
| `updated_at` | `timestamptz` | Maintained on update |

Filterable attributes use normalized enum values. Do not encode structured fields only inside free text or unvalidated JSON.

The database **allows** `published → draft` for the author. The MVP UI does not expose unpublish.

### `build_parts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `build_id` | `uuid` | Parent build, delete cascades |
| `category` | `part_category` | Structured part category |
| `name` | `text` | Part name; max 120 chars |
| `product_url` | `text` | Optional; max 2048 |
| `price_amount_minor` | `integer` | Optional manual price in minor units (≥ 0) |
| `currency` | `char(3)` | Optional ISO 4217 uppercase code |
| `position` | `integer` | Stable author-defined order (≥ 0); unique per `(build_id, position)` |

Enforce that price and currency are either both present or both absent. Do not calculate an automatic build total in the MVP.

### `build_likes`

Deferred to S-04 (`like-published-build`). Not created in F-01.

| Column | Suggested type | Notes |
| --- | --- | --- |
| `build_id` | `uuid` | References build, delete cascades |
| `user_id` | `uuid` | References Auth user |
| `created_at` | `timestamptz` | Database default |

Use a composite primary key or unique constraint on `(build_id, user_id)`.

### No profiles table by default

Do not add a profiles table merely to mirror `auth.users`. Introduce one only when the product needs profile data or behavior beyond authenticated identity.

## Catalog Query Model

Catalog reads are server-side queries returning explicit read models rather than Build mutation entities.

Define `CatalogBuildCard` in the catalog module's application layer (`src/modules/catalog/application/`). Required fields:

| Field | Type |
| --- | --- |
| `id` | `string` |
| `name` | `string \| null` |
| `mainImageUrl` | `string \| null` |
| `watchStyle` | `string \| null` |
| `movement` | `string \| null` |
| `dialColour` | `string \| null` |
| `strapType` | `string \| null` |
| `caseSizeMm` | `number \| null` |
| `likeCount` | `number` |

Query rules:

- always constrain status to `published`;
- apply each active filter with AND semantics;
- ignore only absent filters, not empty database values;
- use a deterministic order such as `published_at desc, id desc`;
- return a normal empty result rather than relaxing filters automatically;
- add indexes based on observed query plans, not speculation.

Filter state belongs in URL search parameters. Validate and normalize those parameters before creating a Supabase query.
