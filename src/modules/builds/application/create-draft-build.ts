import type { Actor } from "@/types";

import { UnauthenticatedError, UnexpectedStoreError } from "../domain/errors";
import type { DraftBuildInput } from "../domain/types";
import { validateDraftInput } from "../domain/validate-draft";
import type { BuildStore } from "./ports/build-store";

export async function createDraftBuild(
  actor: Actor,
  input: DraftBuildInput,
  store: BuildStore,
): Promise<{ id: string }> {
  if (actor.kind !== "authenticated") {
    throw new UnauthenticatedError();
  }

  const draft = validateDraftInput(input);
  const saved = await store.saveDraft({ id: null, authorId: actor.userId, draft });
  if (!saved) {
    throw new UnexpectedStoreError();
  }
  return saved;
}
