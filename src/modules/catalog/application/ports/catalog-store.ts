import type { CatalogBuildCard, CatalogCursorPayload, CatalogQueryDirection } from "../catalog-types";
import type { CatalogFilters } from "../catalog-filters";

export interface CatalogListedItem {
  card: CatalogBuildCard;
  publishedAt: string;
}

export interface ListPublishedInput {
  direction: CatalogQueryDirection;
  boundary: CatalogCursorPayload | null;
  pageSize: number;
  filters?: CatalogFilters;
}

export interface ListPublishedResult {
  items: CatalogListedItem[];
  hasMore: boolean;
}

export interface CatalogStore {
  listPublished(input: ListPublishedInput): Promise<ListPublishedResult>;
}
