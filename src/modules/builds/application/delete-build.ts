import type { Actor } from "@/types";

import { UnauthenticatedError } from "../domain/errors";
import type { BuildStore } from "./ports/build-store";

export async function deleteBuild(actor: Actor, id: string, store: BuildStore): Promise<void> {
  if (actor.kind !== "authenticated") {
    throw new UnauthenticatedError();
  }

  await store.deleteBuild(actor.userId, id);
}
