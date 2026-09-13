import type { AstroCookies } from "astro";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase";
import type { Actor } from "@/types";

import { attachMainImage } from "./application/attach-main-image";
import { actorFromUser } from "./application/actor";
import { createDraftBuild } from "./application/create-draft-build";
import { getOwnedDraft } from "./application/get-owned-draft";
import { createSupabaseBuildStore } from "./infrastructure/supabase-build-store";
import { updateDraftBuild } from "./application/update-draft-build";
import type { DraftBuildInput, OwnedDraft } from "./domain/types";
import { DraftNotFoundError } from "./domain/errors";

export { builds } from "./actions";
export { actorFromUser } from "./application/actor";
export { attachMainImage } from "./application/attach-main-image";
export { createDraftBuild } from "./application/create-draft-build";
export { getOwnedDraft } from "./application/get-owned-draft";
export { updateDraftBuild } from "./application/update-draft-build";
export { createSupabaseBuildStore } from "./infrastructure/supabase-build-store";
export type { BuildStore } from "./application/ports/build-store";
export type { DraftBuildInput, OwnedDraft } from "./domain/types";
export type { DraftActionResult } from "./actions";

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
  };
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
