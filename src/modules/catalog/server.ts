import type { AstroCookies } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase";

import { buildCatalogListingHref } from "./application/catalog-url";
import { parseCatalogPaginationParams } from "./application/catalog-cursor";
import { hasActiveCatalogFilters, parseCatalogFilterParams } from "./application/catalog-filters";
import { listPublishedBuilds } from "./application/list-published-builds";
import { createSupabaseCatalogStore } from "./infrastructure/supabase-catalog-store";
import type { CatalogListingState } from "./presentation/catalog-listing";
import { InvalidCatalogCursorError, InvalidCatalogFilterError } from "./domain/errors";
import type { CatalogFilters } from "./application/catalog-filters";

export { createSupabaseCatalogStore } from "./infrastructure/supabase-catalog-store";
export type { CatalogStore } from "./application/ports/catalog-store";
export type { CatalogBuildCard, CatalogPage } from "./application/catalog-types";
export { InvalidCatalogCursorError, CatalogUnavailableError } from "./domain/errors";
export type { CatalogListingState } from "./presentation/catalog-listing";

export function createCatalogStoreForRequest(request: Request, cookies: AstroCookies) {
  const client = createClient(request.headers, cookies);
  if (!client) {
    return null;
  }
  return createSupabaseCatalogStore(client as SupabaseClient<Database>);
}

interface CatalogListingResolution {
  state: CatalogListingState;
  filters: CatalogFilters;
}

function catalogPageUrls(
  filters: CatalogFilters,
  page: { previousCursor: string | null; nextCursor: string | null },
): { previousUrl: string | null; nextUrl: string | null } {
  return {
    previousUrl: page.previousCursor
      ? buildCatalogListingHref(filters, { kind: "before", cursor: page.previousCursor })
      : null,
    nextUrl: page.nextCursor ? buildCatalogListingHref(filters, { kind: "after", cursor: page.nextCursor }) : null,
  };
}

export async function resolveCatalogListing(
  request: Request,
  cookies: AstroCookies,
): Promise<CatalogListingResolution> {
  const searchParams = new URL(request.url).searchParams;
  let filters: CatalogFilters;

  try {
    filters = parseCatalogFilterParams(searchParams);
  } catch (error) {
    if (error instanceof InvalidCatalogFilterError) {
      return { state: { status: "invalid-filter" }, filters: {} };
    }
    return { state: { status: "unavailable" }, filters: {} };
  }

  const store = createCatalogStoreForRequest(request, cookies);
  if (!store) {
    return { state: { status: "unavailable" }, filters };
  }

  try {
    const pagination = parseCatalogPaginationParams(searchParams);
    const page = await listPublishedBuilds(
      {
        direction: pagination.direction,
        boundary: pagination.boundary,
        filters,
      },
      store,
    );

    if (page.items.length === 0) {
      if (pagination.direction === "first") {
        if (hasActiveCatalogFilters(filters)) {
          return { state: { status: "filtered-empty", clearFiltersUrl: "/builds" }, filters };
        }
        return { state: { status: "empty" }, filters };
      }
      return {
        state: {
          status: "paginated-empty",
          firstPageUrl: buildCatalogListingHref(filters),
        },
        filters,
      };
    }

    const urls = catalogPageUrls(filters, page);
    return {
      state: {
        status: "success",
        items: page.items,
        previousUrl: urls.previousUrl,
        nextUrl: urls.nextUrl,
      },
      filters,
    };
  } catch (error) {
    if (error instanceof InvalidCatalogCursorError) {
      return {
        state: {
          status: "invalid-cursor",
          firstPageUrl: buildCatalogListingHref(filters),
        },
        filters,
      };
    }
    return { state: { status: "unavailable" }, filters };
  }
}
