import type { AstroCookies } from "astro";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase";
import type { Actor } from "@/types";

import { attachMainImage } from "./application/attach-main-image";
import { actorFromUser } from "./application/actor";
import { createDraftBuild } from "./application/create-draft-build";
import { deleteBuild } from "./application/delete-build";
import { getOwnedDraft } from "./application/get-owned-draft";
import { listOwnedBuilds } from "./application/list-owned-builds";
import { parseOwnedBuildPaginationParams } from "./application/owned-build-cursor";
import { publishBuild } from "./application/publish-build";
import { createSupabaseBuildStore } from "./infrastructure/supabase-build-store";
import { updateDraftBuild } from "./application/update-draft-build";
import type { DraftBuildInput, OwnedDraft } from "./domain/types";
import { DraftNotFoundError, InvalidOwnedBuildCursorError } from "./domain/errors";
import type { OwnedBuildsListingState } from "./application/owned-build-types";

export { builds } from "./actions";
export { actorFromUser } from "./application/actor";
export { attachMainImage } from "./application/attach-main-image";
export { createDraftBuild } from "./application/create-draft-build";
export { deleteBuild } from "./application/delete-build";
export { getOwnedDraft } from "./application/get-owned-draft";
export { listOwnedBuilds } from "./application/list-owned-builds";
export { publishBuild } from "./application/publish-build";
export { updateDraftBuild } from "./application/update-draft-build";
export { createSupabaseBuildStore } from "./infrastructure/supabase-build-store";
export type { BuildStore } from "./application/ports/build-store";
export type { DraftBuildInput, OwnedDraft } from "./domain/types";
export type { DraftActionResult, DeleteActionResult } from "./actions";
export type { OwnedBuildCard, OwnedBuildsListingState } from "./application/owned-build-types";
export { InvalidOwnedBuildCursorError } from "./domain/errors";

export function createBuildStoreForRequest(request: Request, cookies: AstroCookies) {
  const client = createClient(request.headers, cookies);
  if (!client) {
    return null;
  }
  return createSupabaseBuildStore(client as SupabaseClient<Database>);
}

export function createBuildUseCasesForRequest(request: Request, cookies: AstroCookies) {
  const store = createBuildStoreForRequest(request, cookies);
  if (!store) {
    return null;
  }
  return {
    createDraftBuild: (actor: Actor, input: DraftBuildInput) => createDraftBuild(actor, input, store),
    updateDraftBuild: (actor: Actor, id: string, input: DraftBuildInput) => updateDraftBuild(actor, id, input, store),
    getOwnedDraft: (actor: Actor, id: string) => getOwnedDraft(actor, id, store),
    attachMainImage: (actor: Actor, id: string, path: string | null) => attachMainImage(actor, id, path, store),
    publishBuild: (actor: Actor, id: string) => publishBuild(actor, id, store),
    listOwnedBuilds: (actor: Actor, input: Parameters<typeof listOwnedBuilds>[1]) =>
      listOwnedBuilds(actor, input, store),
    deleteBuild: (actor: Actor, id: string) => deleteBuild(actor, id, store),
  };
}

function ownedBuildsPageUrls(page: Awaited<ReturnType<typeof listOwnedBuilds>>): {
  previousUrl: string | null;
  nextUrl: string | null;
} {
  return {
    previousUrl: page.previousCursor ? `/dashboard?before=${page.previousCursor}` : null,
    nextUrl: page.nextCursor ? `/dashboard?after=${page.nextCursor}` : null,
  };
}

export async function resolveOwnedBuildsListing(
  request: Request,
  cookies: AstroCookies,
  user: User | null,
): Promise<OwnedBuildsListingState> {
  if (!user) {
    return { status: "unauthenticated" };
  }

  const store = createBuildStoreForRequest(request, cookies);
  if (!store) {
    return { status: "unavailable" };
  }

  try {
    const pagination = parseOwnedBuildPaginationParams(new URL(request.url).searchParams);
    const page = await listOwnedBuilds(
      actorFromUser(user),
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

    const urls = ownedBuildsPageUrls(page);
    return {
      status: "success",
      items: page.items,
      previousUrl: urls.previousUrl,
      nextUrl: urls.nextUrl,
    };
  } catch (error) {
    if (error instanceof InvalidOwnedBuildCursorError) {
      return { status: "invalid-cursor" };
    }
    return { status: "unavailable" };
  }
}

export async function getOwnedDraftForForm(
  request: Request,
  cookies: AstroCookies,
  user: User | null,
  id: string,
): Promise<OwnedDraft | null> {
  const store = createBuildStoreForRequest(request, cookies);
  if (!store || !user) {
    return null;
  }

  try {
    return await getOwnedDraft(actorFromUser(user), id, store);
  } catch (error) {
    if (error instanceof DraftNotFoundError) {
      return null;
    }
    throw error;
  }
}
