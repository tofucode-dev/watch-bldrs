import type { Actor } from "@/types";

import { DraftNotFoundError, DraftValidationError, UnauthenticatedError } from "../domain/errors";
import { isOwnedMainImagePath } from "../domain/main-image-path";
import type { BuildStore } from "./ports/build-store";

export async function attachMainImage(
  actor: Actor,
  id: string,
  path: string | null,
  store: BuildStore,
): Promise<{ id: string }> {
  if (actor.kind !== "authenticated") {
    throw new UnauthenticatedError();
  }

  if (path !== null && !isOwnedMainImagePath(path, actor.userId, id)) {
    throw new DraftValidationError({ path: "Invalid image path" });
  }

  const saved = await store.attachMainImage(actor.userId, id, path);
  if (!saved) {
    throw new DraftNotFoundError();
  }
  return saved;
}
