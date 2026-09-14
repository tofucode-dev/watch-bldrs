import { encodeCatalogCursor } from "./catalog-cursor";
import type { CatalogPage, CatalogQueryDirection, CatalogCursorPayload } from "./catalog-types";
import { CATALOG_PAGE_SIZE } from "./catalog-types";
import type { CatalogStore } from "./ports/catalog-store";
import type { CatalogFilters } from "./catalog-filters";

export interface ListPublishedBuildsInput {
  direction: CatalogQueryDirection;
  boundary: CatalogCursorPayload | null;
  filters?: CatalogFilters;
}

export async function listPublishedBuilds(input: ListPublishedBuildsInput, store: CatalogStore): Promise<CatalogPage> {
  const result = await store.listPublished({
    direction: input.direction,
    boundary: input.boundary,
    pageSize: CATALOG_PAGE_SIZE,
    filters: input.filters,
  });

  const items = result.items.map((item) => item.card);

  let previousCursor: string | null = null;
  let nextCursor: string | null = null;

  if (result.items.length === 0) {
    return { items, previousCursor, nextCursor };
  }

  const first = result.items[0];
  const last = result.items[result.items.length - 1];

  if (input.direction === "first" || input.direction === "after") {
    if (input.direction === "after") {
      previousCursor = encodeCatalogCursor({
        publishedAt: first.publishedAt,
        id: first.card.id,
      });
    }
    if (result.hasMore) {
      nextCursor = encodeCatalogCursor({
        publishedAt: last.publishedAt,
        id: last.card.id,
      });
    }
  } else {
    if (result.hasMore) {
      previousCursor = encodeCatalogCursor({
        publishedAt: first.publishedAt,
        id: first.card.id,
      });
    }
    nextCursor = encodeCatalogCursor({
      publishedAt: last.publishedAt,
      id: last.card.id,
    });
  }

  return {
    items,
    previousCursor,
    nextCursor,
  };
}
