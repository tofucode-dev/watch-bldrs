import type { Actor } from "@/types";

import { DraftNotFoundError, UnauthenticatedError } from "../domain/errors";
import type { BuildStore } from "./ports/build-store";

export async function publishBuild(actor: Actor, id: string, store: BuildStore): Promise<{ id: string }> {
  if (actor.kind !== "authenticated") {
    throw new UnauthenticatedError();
  }

  const published = await store.publishBuild(actor.userId, id);
  if (!published) {
    throw new DraftNotFoundError();
  }
  return published;
}
