import type { AstroCookies } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase";

import { parseCatalogPaginationParams } from "./application/catalog-cursor";
import { listPublishedBuilds } from "./application/list-published-builds";
import type { CatalogPage } from "./application/catalog-types";
import { createSupabaseCatalogStore } from "./infrastructure/supabase-catalog-store";
import type { CatalogListingState } from "./presentation/catalog-listing";
import { InvalidCatalogCursorError, CatalogUnavailableError } from "./domain/errors";

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

function catalogPageUrls(page: CatalogPage): { previousUrl: string | null; nextUrl: string | null } {
  return {
    previousUrl: page.previousCursor ? `/builds?before=${page.previousCursor}` : null,
    nextUrl: page.nextCursor ? `/builds?after=${page.nextCursor}` : null,
  };
}

export async function listPublishedBuildsForRequest(request: Request, cookies: AstroCookies): Promise<CatalogPage> {
  const store = createCatalogStoreForRequest(request, cookies);
  if (!store) {
    throw new CatalogUnavailableError();
  }

  const pagination = parseCatalogPaginationParams(new URL(request.url).searchParams);
  return listPublishedBuilds(
    {
      direction: pagination.direction,
      boundary: pagination.boundary,
    },
    store,
  );
}

export async function resolveCatalogListing(request: Request, cookies: AstroCookies): Promise<CatalogListingState> {
  const store = createCatalogStoreForRequest(request, cookies);
  if (!store) {
    return { status: "unavailable" };
  }

  try {
    const pagination = parseCatalogPaginationParams(new URL(request.url).searchParams);
    const page = await listPublishedBuilds(
      {
        direction: pagination.direction,
        boundary: pagination.boundary,
      },
      store,
    );

    if (page.items.length === 0) {
      if (pagination.direction === "first") {
        return { status: "empty" };
      }
      return { status: "paginated-empty" };
    }

    const urls = catalogPageUrls(page);
    return {
      status: "success",
      items: page.items,
      previousUrl: urls.previousUrl,
      nextUrl: urls.nextUrl,
    };
  } catch (error) {
    if (error instanceof InvalidCatalogCursorError) {
      return { status: "invalid-cursor" };
    }
    return { status: "unavailable" };
  }
}
