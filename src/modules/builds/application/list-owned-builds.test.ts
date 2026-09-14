import { describe, expect, it } from "vitest";

import { encodeOwnedBuildCursor } from "./owned-build-cursor";
import { listOwnedBuilds } from "./list-owned-builds";
import type { BuildStore, ListOwnedBuildsInput, ListOwnedBuildsResult } from "./ports/build-store";
import { UnauthenticatedError } from "../domain/errors";
import type { OwnedBuildCard } from "./owned-build-types";

function makeCard(
  id: string,
  updatedAt: string,
  status: "draft" | "published" = "draft",
): {
  updatedAt: string;
  card: OwnedBuildCard;
} {
  return {
    updatedAt,
    card: {
      id,
      name: `Build ${id.slice(0, 4)}`,
      status,
      mainImageUrl: null,
      watchStyle: null,
      movement: null,
      dialColour: null,
      strapType: null,
      caseSizeMm: null,
      updatedAt,
    },
  };
}

class FakeOwnedBuildStore implements Pick<BuildStore, "listOwnedBuilds"> {
  lastInput: ListOwnedBuildsInput | undefined;

  constructor(private readonly pages: Record<string, { items: ListOwnedBuildsResult["items"]; hasMore: boolean }>) {}

  listOwnedBuilds(_authorId: string, input: ListOwnedBuildsInput) {
    this.lastInput = input;
    const key = `${input.direction}:${input.boundary?.id ?? "none"}`;
    if (!(key in this.pages)) {
      return Promise.resolve({ items: [], hasMore: false });
    }
    return Promise.resolve(this.pages[key]);
  }
}

const authorA = { kind: "authenticated" as const, userId: "11111111-1111-4111-8111-111111111111" };
const anonymous = { kind: "anonymous" as const };

describe("listOwnedBuilds", () => {
  const t1 = "2026-09-14T12:00:00.000Z";
  const t2 = "2026-09-14T11:00:00.000Z";
  const id1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const id2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const id3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  it("requires an authenticated actor", async () => {
    const store = new FakeOwnedBuildStore({});
    await expect(listOwnedBuilds(anonymous, { direction: "first", boundary: null }, store)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });

  it("returns empty first page without cursors", async () => {
    const store = new FakeOwnedBuildStore({
      "first:none": { items: [], hasMore: false },
    });

    const page = await listOwnedBuilds(authorA, { direction: "first", boundary: null }, store);
    expect(page.items).toEqual([]);
    expect(page.previousCursor).toBeNull();
    expect(page.nextCursor).toBeNull();
  });

  it("derives next cursor on first page when more rows exist", async () => {
    const store = new FakeOwnedBuildStore({
      "first:none": {
        items: [makeCard(id1, t1), makeCard(id2, t2)],
        hasMore: true,
      },
    });

    const page = await listOwnedBuilds(authorA, { direction: "first", boundary: null }, store);
    expect(page.previousCursor).toBeNull();
    expect(page.nextCursor).toBe(encodeOwnedBuildCursor({ updatedAt: t2, id: id2 }));
  });

  it("derives previous and next cursors for after pages", async () => {
    const boundary = { updatedAt: t2, id: id2 };
    const store = new FakeOwnedBuildStore({
      [`after:${id2}`]: {
        items: [makeCard(id3, "2026-09-14T10:00:00.000Z")],
        hasMore: false,
      },
    });

    const page = await listOwnedBuilds(authorA, { direction: "after", boundary }, store);
    expect(page.previousCursor).toBe(encodeOwnedBuildCursor({ updatedAt: "2026-09-14T10:00:00.000Z", id: id3 }));
    expect(page.nextCursor).toBeNull();
  });

  it("derives previous and next cursors for before pages", async () => {
    const boundary = { updatedAt: t2, id: id2 };
    const store = new FakeOwnedBuildStore({
      [`before:${id2}`]: {
        items: [makeCard(id1, t1)],
        hasMore: true,
      },
    });

    const page = await listOwnedBuilds(authorA, { direction: "before", boundary }, store);
    expect(page.previousCursor).toBe(encodeOwnedBuildCursor({ updatedAt: t1, id: id1 }));
    expect(page.nextCursor).toBe(encodeOwnedBuildCursor({ updatedAt: t1, id: id1 }));
  });
});
