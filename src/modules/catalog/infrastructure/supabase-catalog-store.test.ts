import { describe, expect, it, vi } from "vitest";

import { CatalogUnavailableError } from "../domain/errors";
import { createSupabaseCatalogStore } from "./supabase-catalog-store";

interface MockRow {
  id: string;
  name: string | null;
  main_image_path: string | null;
  watch_style: string | null;
  movement: string | null;
  dial_colour: string | null;
  strap_type: string | null;
  case_size_mm: number | null;
  published_at: string;
}

function createMockClient(rows: MockRow[], queryError: Error | null = null) {
  const limit = vi.fn().mockResolvedValue({
    data: queryError ? null : rows,
    error: queryError,
  });

  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit,
  };

  const storage = {
    from: vi.fn().mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://example.test/signed" },
        error: null,
      }),
    }),
  };

  const client = {
    from: vi.fn().mockReturnValue(chain),
    storage,
  };

  return { client, chain, limit, storage };
}

describe("createSupabaseCatalogStore", () => {
  const baseRow: MockRow = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Diver",
    main_image_path: "11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/main.jpg",
    watch_style: "diver",
    movement: "nh35",
    dial_colour: "black",
    strap_type: "steel_bracelet",
    case_size_mm: 40,
    published_at: "2026-09-14T12:00:00.000Z",
  };

  it("always constrains published rows and selects only the card projection", async () => {
    const { client, chain } = createMockClient([baseRow]);
    const store = createSupabaseCatalogStore(client as never);

    await store.listPublished({ direction: "first", boundary: null, pageSize: 12 });

    expect(client.from).toHaveBeenCalledWith("builds");
    expect(chain.select).toHaveBeenCalledWith(
      "id, name, main_image_path, watch_style, movement, dial_colour, strap_type, case_size_mm, published_at",
    );
    expect(chain.eq).toHaveBeenCalledWith("status", "published");
    expect(chain.not).toHaveBeenCalledWith("published_at", "is", null);
  });

  it("chains all active filters before keyset boundaries", async () => {
    const { client, chain } = createMockClient([baseRow]);
    const store = createSupabaseCatalogStore(client as never);

    await store.listPublished({
      direction: "after",
      boundary: { publishedAt: "2026-09-14T12:00:00.000Z", id: baseRow.id },
      pageSize: 12,
      filters: {
        watch_style: "diver",
        movement: "nh35",
        dial_colour: "black",
        strap_type: "steel_bracelet",
        case_size_mm: 40,
      },
    });

    expect(chain.eq).toHaveBeenNthCalledWith(1, "status", "published");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "watch_style", "diver");
    expect(chain.eq).toHaveBeenNthCalledWith(3, "movement", "nh35");
    expect(chain.eq).toHaveBeenNthCalledWith(4, "dial_colour", "black");
    expect(chain.eq).toHaveBeenNthCalledWith(5, "strap_type", "steel_bracelet");
    expect(chain.eq).toHaveBeenNthCalledWith(6, "case_size_mm", 40);
    expect(chain.eq.mock.invocationCallOrder.at(-1)).toBeLessThan(chain.or.mock.invocationCallOrder[0]);
  });

  it("slices thirteen rows down to twelve and reports hasMore", async () => {
    const rows = Array.from({ length: 13 }, (_, index) => ({
      ...baseRow,
      id: `${index.toString().padStart(8, "0")}-0000-4000-8000-000000000000`,
      published_at: `2026-09-14T${String(12 - index).padStart(2, "0")}:00:00.000Z`,
    }));
    const { client } = createMockClient(rows);
    const store = createSupabaseCatalogStore(client as never);

    const result = await store.listPublished({ direction: "first", boundary: null, pageSize: 12 });
    expect(result.items).toHaveLength(12);
    expect(result.hasMore).toBe(true);
  });

  it("uses reverse-query ordering for before pages", async () => {
    const { client, chain } = createMockClient([baseRow]);
    const store = createSupabaseCatalogStore(client as never);

    await store.listPublished({
      direction: "before",
      boundary: { publishedAt: "2026-09-14T11:00:00+00:00", id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
      pageSize: 12,
    });

    expect(chain.order).toHaveBeenCalledWith("published_at", { ascending: true });
    expect(chain.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(chain.or).toHaveBeenCalledWith(
      'published_at.gt."2026-09-14T11:00:00.000Z",and(published_at.eq."2026-09-14T11:00:00.000Z",id.gt."bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")',
    );
  });

  it("keeps the twelve rows closest to a before cursor when hasMore", async () => {
    const rows = Array.from({ length: 13 }, (_, index) => ({
      ...baseRow,
      id: `${String(index + 1).padStart(8, "0")}-0000-4000-8000-000000000000`,
      published_at: `2026-09-14T${String(index).padStart(2, "0")}:00:00.000Z`,
    }));
    const { client } = createMockClient(rows);
    const store = createSupabaseCatalogStore(client as never);

    const result = await store.listPublished({
      direction: "before",
      boundary: { publishedAt: "2026-09-13T23:00:00.000Z", id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
      pageSize: 12,
    });

    expect(result.hasMore).toBe(true);
    expect(result.items).toHaveLength(12);
    expect(result.items[0]?.card.id).toBe(rows[11].id);
    expect(result.items[11]?.card.id).toBe(rows[0].id);
    expect(result.items.map((item) => item.card.id)).not.toContain(rows[12].id);
  });

  it("maps display labels and zero likes", async () => {
    const { client } = createMockClient([baseRow]);
    const store = createSupabaseCatalogStore(client as never);

    const result = await store.listPublished({ direction: "first", boundary: null, pageSize: 12 });
    expect(result.items[0]?.card).toMatchObject({
      watchStyle: "Diver",
      movement: "NH35",
      dialColour: "Black",
      strapType: "Steel Bracelet",
      likeCount: 0,
      mainImageUrl: "https://example.test/signed",
    });
  });

  it("falls back to null image URLs when signing fails", async () => {
    const { client, storage } = createMockClient([baseRow]);
    storage.from.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: { message: "denied" } }),
    });
    const store = createSupabaseCatalogStore(client as never);

    const result = await store.listPublished({ direction: "first", boundary: null, pageSize: 12 });
    expect(result.items[0]?.card.mainImageUrl).toBeNull();
  });

  it("maps query failures to catalog unavailable errors", async () => {
    const { client } = createMockClient([], { message: "db down" } as never);
    const store = createSupabaseCatalogStore(client as never);

    await expect(store.listPublished({ direction: "first", boundary: null, pageSize: 12 })).rejects.toBeInstanceOf(
      CatalogUnavailableError,
    );
  });
});
