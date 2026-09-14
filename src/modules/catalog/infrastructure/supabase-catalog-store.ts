import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

import { CatalogUnavailableError } from "../domain/errors";
import type { CatalogStore, CatalogListedItem, ListPublishedInput } from "../application/ports/catalog-store";
import { dialColourLabel, movementLabel, strapTypeLabel, watchStyleLabel } from "./display-labels";
import { publicImageUrlForPath } from "./public-image-url";

type CatalogClient = SupabaseClient<Database>;

const CARD_SELECT =
  "id, name, main_image_path, watch_style, movement, dial_colour, strap_type, case_size_mm, published_at";

interface CatalogRow {
  id: string;
  name: string | null;
  main_image_path: string | null;
  watch_style: string | null;
  movement: string | null;
  dial_colour: string | null;
  strap_type: string | null;
  case_size_mm: number | null;
  published_at: string | null;
}

function quoteFilterValue(value: string): string {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function keysetTimestamp(publishedAt: string): string {
  const parsed = new Date(publishedAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new CatalogUnavailableError();
  }
  return parsed.toISOString();
}

function applyAfterBoundary<T extends { or: (filters: string) => T }>(
  query: T,
  boundary: { publishedAt: string; id: string },
): T {
  const publishedAt = quoteFilterValue(keysetTimestamp(boundary.publishedAt));
  const id = quoteFilterValue(boundary.id);
  return query.or(`published_at.lt.${publishedAt},and(published_at.eq.${publishedAt},id.lt.${id})`);
}

function applyBeforeBoundary<T extends { or: (filters: string) => T }>(
  query: T,
  boundary: { publishedAt: string; id: string },
): T {
  const publishedAt = quoteFilterValue(keysetTimestamp(boundary.publishedAt));
  const id = quoteFilterValue(boundary.id);
  return query.or(`published_at.gt.${publishedAt},and(published_at.eq.${publishedAt},id.gt.${id})`);
}

async function mapRowToListedItem(client: CatalogClient, row: CatalogRow): Promise<CatalogListedItem | null> {
  if (row.published_at === null) {
    return null;
  }

  const mainImageUrl = await publicImageUrlForPath(row.main_image_path, async (path, expiresIn) => {
    const { data, error } = await client.storage.from("build-images").createSignedUrl(path, expiresIn);
    if (error) {
      return null;
    }
    return data.signedUrl;
  });

  return {
    publishedAt: row.published_at,
    card: {
      id: row.id,
      name: row.name,
      mainImageUrl,
      watchStyle: watchStyleLabel(row.watch_style),
      movement: movementLabel(row.movement),
      dialColour: dialColourLabel(row.dial_colour),
      strapType: strapTypeLabel(row.strap_type),
      caseSizeMm: row.case_size_mm,
      likeCount: 0,
    },
  };
}

export function createSupabaseCatalogStore(client: CatalogClient): CatalogStore {
  return {
    async listPublished(input: ListPublishedInput) {
      const limit = input.pageSize + 1;

      let query = client.from("builds").select(CARD_SELECT).eq("status", "published").not("published_at", "is", null);

      if (input.direction === "first") {
        query = query.order("published_at", { ascending: false }).order("id", { ascending: false });
      } else if (input.direction === "after") {
        if (!input.boundary) {
          throw new CatalogUnavailableError();
        }
        query = applyAfterBoundary(query, input.boundary)
          .order("published_at", { ascending: false })
          .order("id", { ascending: false });
      } else {
        if (!input.boundary) {
          throw new CatalogUnavailableError();
        }
        query = applyBeforeBoundary(query, input.boundary)
          .order("published_at", { ascending: true })
          .order("id", { ascending: true });
      }

      const { data, error } = await query.limit(limit);
      if (error) {
        throw new CatalogUnavailableError();
      }

      const rows = data as CatalogRow[];
      const hasMore = rows.length > input.pageSize;
      const boundedRows = hasMore ? rows.slice(0, input.pageSize) : rows;
      const displayRows = input.direction === "before" ? [...boundedRows].reverse() : boundedRows;

      const mapped = await Promise.all(displayRows.map((row) => mapRowToListedItem(client, row)));
      const items = mapped.filter((item): item is CatalogListedItem => item !== null);

      return {
        items,
        hasMore,
      };
    },
  };
}
