import type { AstroCookies } from "astro";
import { describe, expect, it, vi } from "vitest";

import { encodeCatalogCursor } from "./application/catalog-cursor";
import { CatalogUnavailableError, InvalidCatalogCursorError } from "./domain/errors";
import { resolveCatalogListing } from "./server";

const cookies = {} as AstroCookies;

function makeRequest(url = "https://example.com/builds"): Request {
  return new Request(url);
}

const sampleItem = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Sample build",
  mainImageUrl: null,
  watchStyle: null,
  movement: null,
  dialColour: null,
  strapType: null,
  caseSizeMm: null,
  likeCount: 0,
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("./infrastructure/supabase-catalog-store", () => ({
  createSupabaseCatalogStore: vi.fn(() => ({
    listPublished: vi.fn(),
  })),
}));

describe("resolveCatalogListing", () => {
  it("returns success with pagination URLs", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");
    const nextCursor = encodeCatalogCursor({
      publishedAt: "2026-09-14T12:00:00.000Z",
      id: sampleItem.id,
    });

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockResolvedValue({
        items: [{ publishedAt: "2026-09-14T12:00:00.000Z", card: sampleItem }],
        hasMore: true,
      }),
    });

    const result = await resolveCatalogListing(makeRequest(), cookies);

    expect(result).toEqual({
      status: "success",
      items: [sampleItem],
      previousUrl: null,
      nextUrl: `/builds?after=${nextCursor}`,
    });
  });

  it("returns empty for a first page with no rows", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    });

    const result = await resolveCatalogListing(makeRequest(), cookies);
    expect(result).toEqual({ status: "empty" });
  });

  it("returns paginated-empty for a valid cursor with no rows", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");
    const after = encodeCatalogCursor({
      publishedAt: "2026-09-14T12:00:00.000Z",
      id: sampleItem.id,
    });

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    });

    const result = await resolveCatalogListing(makeRequest(`https://example.com/builds?after=${after}`), cookies);
    expect(result).toEqual({ status: "paginated-empty" });
  });

  it("returns invalid-cursor for malformed pagination input", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockRejectedValue(new InvalidCatalogCursorError()),
    });

    const result = await resolveCatalogListing(makeRequest("https://example.com/builds?after=not-a-cursor"), cookies);
    expect(result).toEqual({ status: "invalid-cursor" });
  });

  it("returns unavailable when the catalog store cannot be created", async () => {
    const { createClient } = await import("@/lib/supabase");
    vi.mocked(createClient).mockReturnValueOnce(null);

    const result = await resolveCatalogListing(makeRequest(), cookies);
    expect(result).toEqual({ status: "unavailable" });
  });

  it("returns unavailable when the store rejects with CatalogUnavailableError", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockRejectedValue(new CatalogUnavailableError()),
    });

    const result = await resolveCatalogListing(makeRequest(), cookies);
    expect(result).toEqual({ status: "unavailable" });
  });
});
