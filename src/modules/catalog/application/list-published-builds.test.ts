import { describe, expect, it } from "vitest";

import { encodeCatalogCursor } from "./catalog-cursor";
import { listPublishedBuilds } from "./list-published-builds";
import type { CatalogListedItem, CatalogStore, ListPublishedInput } from "./ports/catalog-store";
import { CatalogUnavailableError } from "../domain/errors";

function makeCard(id: string, publishedAt: string): CatalogListedItem {
  return {
    publishedAt,
    card: {
      id,
      name: `Build ${id.slice(0, 4)}`,
      mainImageUrl: null,
      watchStyle: null,
      movement: null,
      dialColour: null,
      strapType: null,
      caseSizeMm: null,
      likeCount: 0,
    },
  };
}

class FakeCatalogStore implements CatalogStore {
  constructor(
    private readonly pages: Record<string, { items: CatalogListedItem[]; hasMore: boolean }>,
    private readonly shouldFail = false,
  ) {}

  listPublished(input: ListPublishedInput) {
    if (this.shouldFail) {
      return Promise.reject(new CatalogUnavailableError());
    }

    const key = `${input.direction}:${input.boundary?.id ?? "none"}`;
    if (!(key in this.pages)) {
      return Promise.resolve({ items: [], hasMore: false });
    }
    return Promise.resolve(this.pages[key]);
  }
}

describe("listPublishedBuilds", () => {
  const t1 = "2026-09-14T12:00:00.000Z";
  const t2 = "2026-09-14T11:00:00.000Z";
  const id1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const id2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const id3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  it("returns empty first page without cursors", async () => {
    const store = new FakeCatalogStore({
      "first:none": { items: [], hasMore: false },
    });

    const page = await listPublishedBuilds({ direction: "first", boundary: null }, store);
    expect(page.items).toEqual([]);
    expect(page.previousCursor).toBeNull();
    expect(page.nextCursor).toBeNull();
  });

  it("derives next cursor on first page when more rows exist", async () => {
    const store = new FakeCatalogStore({
      "first:none": {
        items: [makeCard(id1, t1), makeCard(id2, t2)],
        hasMore: true,
      },
    });

    const page = await listPublishedBuilds({ direction: "first", boundary: null }, store);
    expect(page.previousCursor).toBeNull();
    expect(page.nextCursor).toBe(encodeCatalogCursor({ publishedAt: t2, id: id2 }));
  });

  it("derives previous and next cursors for after pages", async () => {
    const boundary = { publishedAt: t2, id: id2 };
    const store = new FakeCatalogStore({
      [`after:${id2}`]: {
        items: [makeCard(id3, "2026-09-14T10:00:00.000Z")],
        hasMore: false,
      },
    });

    const page = await listPublishedBuilds({ direction: "after", boundary }, store);
    expect(page.previousCursor).toBe(encodeCatalogCursor({ publishedAt: "2026-09-14T10:00:00.000Z", id: id3 }));
    expect(page.nextCursor).toBeNull();
  });

  it("derives previous and next cursors for before pages", async () => {
    const boundary = { publishedAt: t2, id: id2 };
    const store = new FakeCatalogStore({
      [`before:${id2}`]: {
        items: [makeCard(id1, t1)],
        hasMore: true,
      },
    });

    const page = await listPublishedBuilds({ direction: "before", boundary }, store);
    expect(page.previousCursor).toBe(encodeCatalogCursor({ publishedAt: t1, id: id1 }));
    expect(page.nextCursor).toBe(encodeCatalogCursor({ publishedAt: t1, id: id1 }));
  });

  it("handles equal publication timestamps at boundaries", async () => {
    const shared = "2026-09-14T12:00:00.000Z";
    const store = new FakeCatalogStore({
      "first:none": {
        items: [makeCard(id1, shared), makeCard(id2, shared)],
        hasMore: true,
      },
    });

    const page = await listPublishedBuilds({ direction: "first", boundary: null }, store);
    expect(page.nextCursor).toBe(encodeCatalogCursor({ publishedAt: shared, id: id2 }));
  });

  it("propagates store failures", async () => {
    const store = new FakeCatalogStore({}, true);
    await expect(listPublishedBuilds({ direction: "first", boundary: null }, store)).rejects.toBeInstanceOf(
      CatalogUnavailableError,
    );
  });
});
