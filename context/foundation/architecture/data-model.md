# Data Model and Catalog Queries

RLS matrix: @context/foundation/architecture/security.md. Schema migration rules: @AGENTS.md.

## Proposed Relational Model

The exact migration is implementation-specific, but the initial relational model should remain small.

### `builds`

| Column | Suggested type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `author_id` | `uuid` | References Supabase Auth user |
| `status` | enum/text constraint | `draft` or `published` |
| `name` | `text` | Nullable/optional according to final form rules |
| `story` | `text` | Optional |
| `watch_style` | enum/text | Optional, filterable |
| `movement` | enum/text | Optional, filterable |
| `dial_colour` | enum/text | Optional, filterable |
| `strap_type` | enum/text | Optional, filterable |
| `case_size_mm` | numeric/integer | Optional, filterable |
| `main_image_path` | `text` | Storage object path, not a permanent signed URL |
| `published_at` | timestamptz | Set once on publication |
| `created_at` | timestamptz | Database default |
| `updated_at` | timestamptz | Maintained on update |

Filterable attributes should use normalized values. Do not encode all structured fields only inside a free-text story or unvalidated JSON object.

### `build_parts`

| Column | Suggested type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `build_id` | `uuid` | Parent build, delete cascades |
| `category` | enum/text | Structured part category |
| `name` | `text` | Part name |
| `product_url` | `text` | Optional |
| `price_amount` | numeric | Optional manual price |
| `currency` | constrained text | Optional ISO-style currency code |
| `position` | integer | Stable author-defined order |

Enforce that price and currency are either both present or both absent. Do not calculate an automatic build total in the MVP.

### `build_likes`

| Column | Suggested type | Notes |
| --- | --- | --- |
| `build_id` | `uuid` | References build, delete cascades |
| `user_id` | `uuid` | References Auth user |
| `created_at` | timestamptz | Database default |

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
