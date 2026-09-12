import type { Actor } from "@/types";

import { DraftNotFoundError, UnauthenticatedError } from "../domain/errors";
import type { OwnedDraft } from "../domain/types";
import type { BuildStore } from "./ports/build-store";

export async function getOwnedDraft(actor: Actor, id: string, store: BuildStore): Promise<OwnedDraft> {
  if (actor.kind !== "authenticated") {
    throw new UnauthenticatedError();
  }

  const draft = await store.getOwnedDraft(actor.userId, id);
  if (!draft) {
    throw new DraftNotFoundError();
  }
  return draft;
}
