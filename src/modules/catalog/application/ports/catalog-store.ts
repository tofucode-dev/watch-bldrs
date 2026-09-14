import type { CatalogBuildCard, CatalogCursorPayload, CatalogQueryDirection } from "../catalog-types";

export interface CatalogListedItem {
  card: CatalogBuildCard;
  publishedAt: string;
}

export interface ListPublishedInput {
  direction: CatalogQueryDirection;
  boundary: CatalogCursorPayload | null;
  pageSize: number;
}

export interface ListPublishedResult {
  items: CatalogListedItem[];
  hasMore: boolean;
}

export interface CatalogStore {
  listPublished(input: ListPublishedInput): Promise<ListPublishedResult>;
}
