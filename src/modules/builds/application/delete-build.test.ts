import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { deleteBuild } from "./delete-build";
import type { BuildStore } from "./ports/build-store";
import { UnauthenticatedError } from "../domain/errors";

class FakeDeleteStore implements Pick<BuildStore, "deleteBuild"> {
  deletedIds: string[] = [];

  deleteBuild(_authorId: string, id: string): Promise<void> {
    this.deletedIds.push(id);
    return Promise.resolve();
  }
}

const authorA = { kind: "authenticated" as const, userId: "11111111-1111-4111-8111-111111111111" };
const anonymous = { kind: "anonymous" as const };

describe("deleteBuild", () => {
  it("requires an authenticated actor", async () => {
    const store = new FakeDeleteStore();
    await expect(deleteBuild(anonymous, randomUUID(), store)).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(store.deletedIds).toHaveLength(0);
  });

  it("succeeds when the store resolves without error", async () => {
    const store = new FakeDeleteStore();
    const id = randomUUID();

    await expect(deleteBuild(authorA, id, store)).resolves.toBeUndefined();
    expect(store.deletedIds).toEqual([id]);
  });

  it("treats a missing id as success via idempotent store behavior", async () => {
    const store = new FakeDeleteStore();
    const id = randomUUID();

    await expect(deleteBuild(authorA, id, store)).resolves.toBeUndefined();
    expect(store.deletedIds).toEqual([id]);
  });
});
