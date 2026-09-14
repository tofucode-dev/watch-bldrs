export interface OwnedBuildCard {
  id: string;
  name: string | null;
  status: "draft" | "published";
  mainImageUrl: string | null;
  watchStyle: string | null;
  movement: string | null;
  dialColour: string | null;
  strapType: string | null;
  caseSizeMm: number | null;
  updatedAt: string;
}

export interface OwnedBuildsPage {
  items: OwnedBuildCard[];
  previousCursor: string | null;
  nextCursor: string | null;
}

export interface OwnedBuildCursorPayload {
  updatedAt: string;
  id: string;
}

export type OwnedBuildQueryDirection = "first" | "after" | "before";

export const OWNED_BUILDS_PAGE_SIZE = 12;

export type OwnedBuildsListingState =
  | {
      status: "success";
      items: OwnedBuildCard[];
      previousUrl: string | null;
      nextUrl: string | null;
    }
  | { status: "empty" }
  | { status: "paginated-empty" }
  | { status: "invalid-cursor" }
  | { status: "unavailable" }
  | { status: "unauthenticated" };
