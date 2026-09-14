import { describe, expect, it, vi } from "vitest";

import { removeBuildImageBestEffort } from "./delete-build-image";
import { applyAfterUpdatedAtBoundary, applyBeforeUpdatedAtBoundary, quoteFilterValue } from "./owned-build-query";

describe("owned build query boundaries", () => {
  it("quotes filter values with embedded quotes", () => {
    expect(quoteFilterValue('say "hello"')).toBe('"say \\"hello\\""');
  });

  it("applies after boundary filters on updated_at and id", () => {
    const query = {
      or: vi.fn((filters: string) => ({ filters })),
    };

    const result = applyAfterUpdatedAtBoundary(query, {
      updatedAt: "2026-09-14T12:00:00.000Z",
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    expect(result.filters).toBe(
      'updated_at.lt."2026-09-14T12:00:00.000Z",and(updated_at.eq."2026-09-14T12:00:00.000Z",id.lt."aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")',
    );
  });

  it("applies before boundary filters on updated_at and id", () => {
    const query = {
      or: vi.fn((filters: string) => ({ filters })),
    };

    const result = applyBeforeUpdatedAtBoundary(query, {
      updatedAt: "2026-09-14T12:00:00.000Z",
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(result.filters).toBe(
      'updated_at.gt."2026-09-14T12:00:00.000Z",and(updated_at.eq."2026-09-14T12:00:00.000Z",id.gt."bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")',
    );
  });
});

describe("removeBuildImageBestEffort", () => {
  it("skips storage remove when path is null", async () => {
    const remove = vi.fn();
    const client = {
      storage: {
        from: vi.fn(() => ({ remove })),
      },
    };

    await removeBuildImageBestEffort(client as never, null);
    expect(remove).not.toHaveBeenCalled();
  });

  it("attempts storage remove before callers proceed to row delete", async () => {
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const client = {
      storage: {
        from: vi.fn(() => ({ remove })),
      },
    };

    await removeBuildImageBestEffort(client as never, "author/build/main.webp");
    expect(remove).toHaveBeenCalledWith(["author/build/main.webp"]);
  });

  it("swallows storage failures", async () => {
    const remove = vi.fn().mockRejectedValue(new Error("storage unavailable"));
    const client = {
      storage: {
        from: vi.fn(() => ({ remove })),
      },
    };

    await expect(removeBuildImageBestEffort(client as never, "author/build/main.webp")).resolves.toBeUndefined();
  });
});
