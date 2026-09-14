import type { AstroCookies } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase";

import { parseCatalogPaginationParams } from "./application/catalog-cursor";
import { listPublishedBuilds } from "./application/list-published-builds";
import type { CatalogPage } from "./application/catalog-types";
import { createSupabaseCatalogStore } from "./infrastructure/supabase-catalog-store";

export { createSupabaseCatalogStore } from "./infrastructure/supabase-catalog-store";
export type { CatalogStore } from "./application/ports/catalog-store";
export type { CatalogBuildCard, CatalogPage } from "./application/catalog-types";
export { InvalidCatalogCursorError, CatalogUnavailableError } from "./domain/errors";

export function createCatalogStoreForRequest(request: Request, cookies: AstroCookies) {
  const client = createClient(request.headers, cookies);
  if (!client) {
    return null;
  }
  return createSupabaseCatalogStore(client as SupabaseClient<Database>);
}

export async function listPublishedBuildsForRequest(request: Request, cookies: AstroCookies): Promise<CatalogPage> {
  const store = createCatalogStoreForRequest(request, cookies);
  if (!store) {
    throw new Error("Catalog store unavailable");
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
