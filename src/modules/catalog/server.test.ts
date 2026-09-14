import type { AstroCookies } from "astro";
import { describe, expect, it, vi } from "vitest";

import { encodeCatalogCursor } from "./application/catalog-cursor";
import { CatalogUnavailableError, InvalidCatalogCursorError, InvalidCatalogFilterError } from "./domain/errors";
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
      state: {
        status: "success",
        items: [sampleItem],
        previousUrl: null,
        nextUrl: `/builds?after=${nextCursor}`,
      },
      filters: {},
    });
  });

  it("preserves every active filter in next and previous URLs when paginating with an after cursor", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");
    const firstId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const lastId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const after = encodeCatalogCursor({
      publishedAt: "2026-09-14T12:00:00.000Z",
      id: firstId,
    });

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockResolvedValue({
        items: [
          { publishedAt: "2026-09-14T12:00:00.000Z", card: { ...sampleItem, id: firstId } },
          { publishedAt: "2026-09-14T11:00:00.000Z", card: { ...sampleItem, id: lastId } },
        ],
        hasMore: true,
      }),
    });

    const result = await resolveCatalogListing(
      makeRequest(
        `https://example.com/builds?watch_style=diver&movement=nh35&dial_colour=black&strap_type=steel_bracelet&case_size_mm=40&after=${after}`,
      ),
      cookies,
    );

    expect(result.state).toMatchObject({ status: "success" });
    if (result.state.status !== "success") {
      throw new Error("Expected success state");
    }

    const filterParams = [
      "watch_style=diver",
      "movement=nh35",
      "dial_colour=black",
      "strap_type=steel_bracelet",
      "case_size_mm=40",
    ];
    for (const param of filterParams) {
      expect(result.state.previousUrl).toContain(param);
      expect(result.state.nextUrl).toContain(param);
    }
  });

  it("passes filters to the store and preserves them in pagination URLs", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");
    const nextCursor = encodeCatalogCursor({
      publishedAt: "2026-09-14T12:00:00.000Z",
      id: sampleItem.id,
    });
    const listPublished = vi.fn().mockResolvedValue({
      items: [{ publishedAt: "2026-09-14T12:00:00.000Z", card: sampleItem }],
      hasMore: true,
    });

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({ listPublished });

    const result = await resolveCatalogListing(
      makeRequest("https://example.com/builds?movement=nh35&watch_style=diver"),
      cookies,
    );

    expect(listPublished).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { watch_style: "diver", movement: "nh35" },
      }),
    );
    expect(result).toEqual({
      state: {
        status: "success",
        items: [sampleItem],
        previousUrl: null,
        nextUrl: `/builds?watch_style=diver&movement=nh35&after=${nextCursor}`,
      },
      filters: { watch_style: "diver", movement: "nh35" },
    });
  });

  it("returns empty for a first page with no rows", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    });

    const result = await resolveCatalogListing(makeRequest(), cookies);
    expect(result).toEqual({ state: { status: "empty" }, filters: {} });
  });

  it("returns filtered-empty instead of global empty when active filters match no rows", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    });

    const result = await resolveCatalogListing(makeRequest("https://example.com/builds?watch_style=diver"), cookies);

    expect(result).toEqual({
      state: { status: "filtered-empty", clearFiltersUrl: "/builds" },
      filters: { watch_style: "diver" },
    });
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
    expect(result).toEqual({
      state: { status: "paginated-empty", firstPageUrl: "/builds" },
      filters: {},
    });
  });

  it("preserves active filters in paginated-empty recovery", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");
    const after = encodeCatalogCursor({
      publishedAt: "2026-09-14T12:00:00.000Z",
      id: sampleItem.id,
    });

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    });

    const result = await resolveCatalogListing(
      makeRequest(`https://example.com/builds?movement=nh35&after=${after}`),
      cookies,
    );

    expect(result).toEqual({
      state: { status: "paginated-empty", firstPageUrl: "/builds?movement=nh35" },
      filters: { movement: "nh35" },
    });
  });

  it("returns invalid-cursor for malformed pagination input", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockRejectedValue(new InvalidCatalogCursorError()),
    });

    const result = await resolveCatalogListing(makeRequest("https://example.com/builds?after=not-a-cursor"), cookies);
    expect(result).toEqual({
      state: { status: "invalid-cursor", firstPageUrl: "/builds" },
      filters: {},
    });
  });

  it("returns invalid-filter with empty filters for malformed filter input", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockRejectedValue(new InvalidCatalogFilterError()),
    });

    const result = await resolveCatalogListing(makeRequest("https://example.com/builds?watch_style=invalid"), cookies);

    expect(result).toEqual({ state: { status: "invalid-filter" }, filters: {} });
  });

  it("returns unavailable when the catalog store cannot be created", async () => {
    const { createClient } = await import("@/lib/supabase");
    vi.mocked(createClient).mockReturnValueOnce(null);

    const result = await resolveCatalogListing(makeRequest(), cookies);
    expect(result).toEqual({ state: { status: "unavailable" }, filters: {} });
  });

  it("returns unavailable when the store rejects with CatalogUnavailableError", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockRejectedValue(new CatalogUnavailableError()),
    });

    const result = await resolveCatalogListing(makeRequest(), cookies);
    expect(result).toEqual({ state: { status: "unavailable" }, filters: {} });
  });

  it("returns unavailable for unexpected store failures", async () => {
    const { createSupabaseCatalogStore } = await import("./infrastructure/supabase-catalog-store");

    vi.mocked(createSupabaseCatalogStore).mockReturnValue({
      listPublished: vi.fn().mockRejectedValue(new TypeError("Cannot read properties of null")),
    });

    const result = await resolveCatalogListing(makeRequest(), cookies);
    expect(result).toEqual({ state: { status: "unavailable" }, filters: {} });
  });
});
