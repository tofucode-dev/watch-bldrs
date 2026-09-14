export interface CatalogBuildCard {
  id: string;
  name: string | null;
  mainImageUrl: string | null;
  watchStyle: string | null;
  movement: string | null;
  dialColour: string | null;
  strapType: string | null;
  caseSizeMm: number | null;
  likeCount: number;
}

export interface CatalogPage {
  items: CatalogBuildCard[];
  previousCursor: string | null;
  nextCursor: string | null;
}

export interface CatalogCursorPayload {
  publishedAt: string;
  id: string;
}

export type CatalogQueryDirection = "first" | "after" | "before";

export const CATALOG_PAGE_SIZE = 12;
