import type { Actor } from "@/types";

import { UnauthenticatedError } from "../domain/errors";
import { encodeOwnedBuildCursor } from "./owned-build-cursor";
import type { OwnedBuildCursorPayload, OwnedBuildQueryDirection, OwnedBuildsPage } from "./owned-build-types";
import { OWNED_BUILDS_PAGE_SIZE } from "./owned-build-types";
import type { BuildStore } from "./ports/build-store";

export interface ListOwnedBuildsInput {
  direction: OwnedBuildQueryDirection;
  boundary: OwnedBuildCursorPayload | null;
}

export async function listOwnedBuilds(
  actor: Actor,
  input: ListOwnedBuildsInput,
  store: BuildStore,
): Promise<OwnedBuildsPage> {
  if (actor.kind !== "authenticated") {
    throw new UnauthenticatedError();
  }

  const result = await store.listOwnedBuilds(actor.userId, {
    direction: input.direction,
    boundary: input.boundary,
    pageSize: OWNED_BUILDS_PAGE_SIZE,
  });

  const items = result.items.map((item) => item.card);

  let previousCursor: string | null = null;
  let nextCursor: string | null = null;

  if (result.items.length === 0) {
    return { items, previousCursor, nextCursor };
  }

  const first = result.items[0];
  const last = result.items[result.items.length - 1];

  if (input.direction === "first" || input.direction === "after") {
    if (input.direction === "after") {
      previousCursor = encodeOwnedBuildCursor({
        updatedAt: first.updatedAt,
        id: first.card.id,
      });
    }
    if (result.hasMore) {
      nextCursor = encodeOwnedBuildCursor({
        updatedAt: last.updatedAt,
        id: last.card.id,
      });
    }
  } else {
    if (result.hasMore) {
      previousCursor = encodeOwnedBuildCursor({
        updatedAt: first.updatedAt,
        id: first.card.id,
      });
    }
    nextCursor = encodeOwnedBuildCursor({
      updatedAt: last.updatedAt,
      id: last.card.id,
    });
  }

  return {
    items,
    previousCursor,
    nextCursor,
  };
}
