import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "../../src/lib/database.types";
import { decodeCatalogCursor } from "../../src/modules/catalog/application/catalog-cursor";
import { listPublishedBuilds } from "../../src/modules/catalog/application/list-published-builds";
import { createSupabaseCatalogStore } from "../../src/modules/catalog/infrastructure/supabase-catalog-store";
import {
  cleanupBuild,
  clearCatalogDemoData,
  createTestIdentities,
  seedInconsistentPublishedBuild,
  type TestIdentities,
} from "./helpers/supabase-identities";

interface SeededBuild {
  id: string;
  publishedAt: string;
  authorId: string;
  status: "draft" | "published";
}

describe("catalog listing identity matrix", () => {
  let identities: TestIdentities;
  const buildIds: string[] = [];
  const seeded: SeededBuild[] = [];

  beforeAll(async () => {
    identities = await createTestIdentities();
    await clearCatalogDemoData(identities.serviceRole);

    const sharedTimestamp = "2026-09-10T12:00:00.000Z";
    const seeds = [
      { authorId: identities.authorA.id, status: "draft" as const, name: "Author A draft", publishedAt: null },
      { authorId: identities.userB.id, status: "draft" as const, name: "User B draft", publishedAt: null },
      ...Array.from({ length: 25 }, (_, index) => ({
        authorId: index % 2 === 0 ? identities.authorA.id : identities.userB.id,
        status: "published" as const,
        name: `Published ${index + 1}`,
        publishedAt:
          index < 2 ? sharedTimestamp : new Date(Date.UTC(2026, 8, 13, 12, 0, 0) - index * 3_600_000).toISOString(),
      })),
    ];

    for (const seed of seeds) {
      const { data, error } = await identities.serviceRole
        .from("builds")
        .insert({
          author_id: seed.authorId,
          status: seed.status,
          name: seed.name,
          published_at: seed.publishedAt,
          watch_style: "diver",
          movement: "nh35",
        })
        .select("id, published_at, author_id, status")
        .single();

      if (error) {
        throw new Error(`Failed to seed build: ${error.message}`);
      }

      buildIds.push(data.id);
      if (data.status === "published" && data.published_at) {
        seeded.push({
          id: data.id,
          publishedAt: data.published_at,
          authorId: data.author_id,
          status: data.status,
        });
      }
    }

    seeded.sort((left, right) => {
      const timeCompare = right.publishedAt.localeCompare(left.publishedAt);
      if (timeCompare !== 0) {
        return timeCompare;
      }
      return right.id.localeCompare(left.id);
    });
  });

  afterAll(async () => {
    for (const buildId of buildIds) {
      await cleanupBuild(identities.serviceRole, buildId);
    }
  });

  async function firstPageFor(client: SupabaseClient<Database>) {
    const store = createSupabaseCatalogStore(client);
    return listPublishedBuilds({ direction: "first", boundary: null }, store);
  }

  it("returns the same published-only ordering for anonymous, author A, and user B", async () => {
    const anonPage = await firstPageFor(identities.anon);
    const authorPage = await firstPageFor(identities.authorA.client);
    const userBPage = await firstPageFor(identities.userB.client);

    const expectedIds = seeded.map((build) => build.id);
    expect(anonPage.items.map((item) => item.id)).toEqual(expectedIds.slice(0, 12));
    expect(authorPage.items.map((item) => item.id)).toEqual(expectedIds.slice(0, 12));
    expect(userBPage.items.map((item) => item.id)).toEqual(expectedIds.slice(0, 12));

    for (const page of [anonPage, authorPage, userBPage]) {
      expect(page.items.some((item) => item.name === "Author A draft")).toBe(false);
      expect(page.items.some((item) => item.name === "User B draft")).toBe(false);
    }
  });

  it("paginates forward and backward without skipping or duplicating ids", async () => {
    const store = createSupabaseCatalogStore(identities.anon);
    const first = await listPublishedBuilds({ direction: "first", boundary: null }, store);
    expect(first.items).toHaveLength(12);
    expect(first.nextCursor).not.toBeNull();

    const nextCursor = first.nextCursor;
    if (!nextCursor) {
      throw new Error("Expected a next-page cursor");
    }

    const second = await listPublishedBuilds(
      {
        direction: "after",
        boundary: decodeCatalogCursor(nextCursor),
      },
      store,
    );
    expect(second.items).toHaveLength(12);
    expect(second.nextCursor).not.toBeNull();
    expect(second.previousCursor).not.toBeNull();

    const secondNextCursor = second.nextCursor;
    if (!secondNextCursor) {
      throw new Error("Expected a third-page cursor");
    }

    const third = await listPublishedBuilds(
      {
        direction: "after",
        boundary: decodeCatalogCursor(secondNextCursor),
      },
      store,
    );
    expect(third.items).toHaveLength(1);
    expect(third.previousCursor).not.toBeNull();

    const fromThird = third.previousCursor;
    if (!fromThird) {
      throw new Error("Expected a previous-page cursor from the third page");
    }

    const backToSecond = await listPublishedBuilds(
      {
        direction: "before",
        boundary: decodeCatalogCursor(fromThird),
      },
      store,
    );
    expect(backToSecond.items.map((item) => item.id)).toEqual(second.items.map((item) => item.id));

    const fromSecond = second.previousCursor;
    if (!fromSecond) {
      throw new Error("Expected a previous-page cursor from the second page");
    }

    const backToFirst = await listPublishedBuilds(
      {
        direction: "before",
        boundary: decodeCatalogCursor(fromSecond),
      },
      store,
    );
    expect(backToFirst.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id));

    const allIds = [...first.items, ...second.items, ...third.items].map((item) => item.id);
    expect(new Set(allIds).size).toBe(25);
  });
});

describe("catalog listing empty catalog", () => {
  let identities: TestIdentities;
  const buildIds: string[] = [];

  beforeAll(async () => {
    identities = await createTestIdentities();
    await clearCatalogDemoData(identities.serviceRole);

    const { data, error } = await identities.serviceRole
      .from("builds")
      .insert({
        author_id: identities.authorA.id,
        status: "draft",
        name: "Draft only",
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to seed draft-only build: ${error.message}`);
    }

    buildIds.push(data.id);
  });

  afterAll(async () => {
    for (const buildId of buildIds) {
      await cleanupBuild(identities.serviceRole, buildId);
    }
  });

  it("returns an empty first page when only drafts exist", async () => {
    const store = createSupabaseCatalogStore(identities.anon);
    const page = await listPublishedBuilds({ direction: "first", boundary: null }, store);
    expect(page.items).toEqual([]);
    expect(page.previousCursor).toBeNull();
    expect(page.nextCursor).toBeNull();
  });
});

describe("catalog listing inconsistent published row", () => {
  let identities: TestIdentities;
  let buildId: string;

  beforeAll(async () => {
    identities = await createTestIdentities();
    await clearCatalogDemoData(identities.serviceRole);

    buildId = seedInconsistentPublishedBuild(identities.authorA.id);
  });

  afterAll(async () => {
    await cleanupBuild(identities.serviceRole, buildId);
  });

  it("never lists a published row with null published_at for any identity", async () => {
    for (const client of [identities.anon, identities.authorA.client, identities.userB.client]) {
      const store = createSupabaseCatalogStore(client);
      const page = await listPublishedBuilds({ direction: "first", boundary: null }, store);
      expect(page.items.some((item) => item.id === buildId)).toBe(false);
    }
  });
});

describe("catalog listing unpublished build with preserved published_at", () => {
  let identities: TestIdentities;
  let buildId: string;

  beforeAll(async () => {
    identities = await createTestIdentities();

    const { data, error } = await identities.authorA.client
      .from("builds")
      .insert({ author_id: identities.authorA.id, status: "draft", name: "Unpublished with stamp" })
      .select("id")
      .single();
    if (error) {
      throw new Error(`Failed to seed build: ${error.message}`);
    }
    buildId = data.id;

    const { error: publishError } = await identities.authorA.client
      .from("builds")
      .update({ status: "published" })
      .eq("id", buildId);
    if (publishError) {
      throw new Error(`Failed to publish build: ${publishError.message}`);
    }

    const { error: unpublishError } = await identities.authorA.client
      .from("builds")
      .update({ status: "draft" })
      .eq("id", buildId);
    if (unpublishError) {
      throw new Error(`Failed to unpublish build: ${unpublishError.message}`);
    }

    const { data: row, error: rowError } = await identities.authorA.client
      .from("builds")
      .select("status, published_at")
      .eq("id", buildId)
      .single();
    if (rowError) {
      throw new Error(`Failed to verify unpublished build: ${rowError.message}`);
    }
    if (row.status !== "draft" || row.published_at === null) {
      throw new Error("Expected draft status with preserved published_at after unpublish");
    }
  });

  afterAll(async () => {
    await cleanupBuild(identities.serviceRole, buildId);
  });

  it("never lists an unpublished build even when published_at is still set", async () => {
    for (const client of [identities.anon, identities.authorA.client, identities.userB.client]) {
      const store = createSupabaseCatalogStore(client);
      const page = await listPublishedBuilds({ direction: "first", boundary: null }, store);
      expect(page.items.some((item) => item.id === buildId)).toBe(false);
    }
  });
});
