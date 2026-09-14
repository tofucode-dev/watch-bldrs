import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "../../src/lib/database.types";
import { decodeCatalogCursor } from "../../src/modules/catalog/application/catalog-cursor";
import { listPublishedBuilds } from "../../src/modules/catalog/application/list-published-builds";
import { createSupabaseCatalogStore } from "../../src/modules/catalog/infrastructure/supabase-catalog-store";
import { cleanupBuild, createTestIdentities, type TestIdentities } from "./helpers/supabase-identities";

type BuildInsert = Database["public"]["Tables"]["builds"]["Insert"];

describe("catalog listing filters", () => {
  let identities: TestIdentities;
  const buildIds: string[] = [];
  const matchingIds: string[] = [];
  const nonMatchingIds: string[] = [];

  beforeAll(async () => {
    identities = await createTestIdentities();

    const matchingSeeds = Array.from({ length: 13 }, (_, index) => ({
      author_id: index % 2 === 0 ? identities.authorA.id : identities.userB.id,
      status: "published" as const,
      name: `Filtered match ${index + 1}`,
      published_at: new Date(Date.UTC(2026, 8, 14, 12, 0, 0) - index * 60_000).toISOString(),
      watch_style: "diver" as const,
      movement: "nh35" as const,
      dial_colour: "black" as const,
      strap_type: "steel_bracelet" as const,
      case_size_mm: 40,
    }));
    const nonMatchingSeeds: BuildInsert[] = [
      {
        author_id: identities.authorA.id,
        status: "published",
        name: "Different style",
        published_at: "2026-09-14T10:00:00.000Z",
        watch_style: "pilot",
        movement: "nh35",
        dial_colour: "black",
        strap_type: "steel_bracelet",
        case_size_mm: 40,
      },
      {
        author_id: identities.userB.id,
        status: "published",
        name: "Different movement",
        published_at: "2026-09-14T09:00:00.000Z",
        watch_style: "diver",
        movement: "nh36",
        dial_colour: "black",
        strap_type: "steel_bracelet",
        case_size_mm: 40,
      },
      {
        author_id: identities.authorA.id,
        status: "published",
        name: "Different dial",
        published_at: "2026-09-14T08:00:00.000Z",
        watch_style: "diver",
        movement: "nh35",
        dial_colour: "blue",
        strap_type: "steel_bracelet",
        case_size_mm: 40,
      },
      {
        author_id: identities.userB.id,
        status: "published",
        name: "Different strap",
        published_at: "2026-09-14T07:00:00.000Z",
        watch_style: "diver",
        movement: "nh35",
        dial_colour: "black",
        strap_type: "leather",
        case_size_mm: 40,
      },
      {
        author_id: identities.authorA.id,
        status: "published",
        name: "Different case size",
        published_at: "2026-09-14T06:00:00.000Z",
        watch_style: "diver",
        movement: "nh35",
        dial_colour: "black",
        strap_type: "steel_bracelet",
        case_size_mm: 42,
      },
      {
        author_id: identities.userB.id,
        status: "draft",
        name: "Matching draft",
        published_at: null,
        watch_style: "diver",
        movement: "nh35",
        dial_colour: "black",
        strap_type: "steel_bracelet",
        case_size_mm: 40,
      },
    ];

    for (const seed of [...matchingSeeds, ...nonMatchingSeeds]) {
      const { data, error } = await identities.serviceRole.from("builds").insert(seed).select("id").single();
      if (error) {
        throw new Error(`Failed to seed filtered catalog build: ${error.message}`);
      }
      buildIds.push(data.id);
      if (seed.status === "published" && seed.name.startsWith("Filtered match")) {
        matchingIds.push(data.id);
      } else {
        nonMatchingIds.push(data.id);
      }
    }
  });

  afterAll(async () => {
    for (const buildId of buildIds) {
      await cleanupBuild(identities.serviceRole, buildId);
    }
  });

  async function firstPageFor(client: SupabaseClient<Database>) {
    return listPublishedBuilds(
      {
        direction: "first",
        boundary: null,
        filters: {
          watch_style: "diver",
          movement: "nh35",
          dial_colour: "black",
          strap_type: "steel_bracelet",
          case_size_mm: 40,
        },
      },
      createSupabaseCatalogStore(client),
    );
  }

  it("applies single and combined filters with published-only results", async () => {
    const store = createSupabaseCatalogStore(identities.anon);
    const stylePage = await listPublishedBuilds(
      { direction: "first", boundary: null, filters: { watch_style: "diver" } },
      store,
    );
    const combinedPage = await firstPageFor(identities.anon);

    expect(stylePage.items).toHaveLength(12);
    expect(stylePage.items.map((item) => item.id).every((id) => matchingIds.includes(id))).toBe(true);
    expect(stylePage.items.map((item) => item.id)).not.toEqual(expect.arrayContaining(nonMatchingIds));
    expect(combinedPage.items.map((item) => item.id)).toEqual(expect.arrayContaining(matchingIds.slice(0, 12)));
    expect(combinedPage.items).toHaveLength(12);
    expect(combinedPage.items.map((item) => item.id)).not.toContain(nonMatchingIds[5]);
  });

  it("paginates the filtered result forward and backward without skipping or duplicating ids", async () => {
    const first = await firstPageFor(identities.anon);
    expect(first.items).toHaveLength(12);
    expect(first.nextCursor).not.toBeNull();

    const nextCursor = first.nextCursor;
    if (!nextCursor) {
      throw new Error("Expected a next-page cursor for filtered results");
    }

    const second = await listPublishedBuilds(
      {
        direction: "after",
        boundary: decodeCatalogCursor(nextCursor),
        filters: {
          watch_style: "diver",
          movement: "nh35",
          dial_colour: "black",
          strap_type: "steel_bracelet",
          case_size_mm: 40,
        },
      },
      createSupabaseCatalogStore(identities.anon),
    );
    expect(second.items).toHaveLength(1);
    expect(second.previousCursor).not.toBeNull();

    const previousCursor = second.previousCursor;
    if (!previousCursor) {
      throw new Error("Expected a previous-page cursor for filtered results");
    }

    const backToFirst = await listPublishedBuilds(
      {
        direction: "before",
        boundary: decodeCatalogCursor(previousCursor),
        filters: {
          watch_style: "diver",
          movement: "nh35",
          dial_colour: "black",
          strap_type: "steel_bracelet",
          case_size_mm: 40,
        },
      },
      createSupabaseCatalogStore(identities.anon),
    );

    expect(backToFirst.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id));
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(matchingIds.length);
  });

  it("returns identical filtered published results for anonymous and authenticated viewers", async () => {
    const pages = await Promise.all([
      firstPageFor(identities.anon),
      firstPageFor(identities.authorA.client),
      firstPageFor(identities.userB.client),
    ]);

    expect(pages[0].items.map((item) => item.id)).toEqual(pages[1].items.map((item) => item.id));
    expect(pages[0].items.map((item) => item.id)).toEqual(pages[2].items.map((item) => item.id));
    expect(pages[0].items).toHaveLength(12);
  });
});

describe("catalog tied-timestamp pagination under filters", () => {
  let identities: TestIdentities;
  const buildIds: string[] = [];
  const matchingPublishedIds: string[] = [];
  let matchingDraftId: string;

  const tiedPublishedAt = "2026-09-14T15:00:00.000Z";
  const tiedFilters = {
    watch_style: "diver" as const,
    movement: "nh35" as const,
    dial_colour: "black" as const,
    strap_type: "steel_bracelet" as const,
    case_size_mm: 40,
  };

  beforeAll(async () => {
    identities = await createTestIdentities();

    const matchingPublishedSeeds = Array.from({ length: 13 }, (_, index) => ({
      author_id: index % 2 === 0 ? identities.authorA.id : identities.userB.id,
      status: "published" as const,
      name: `Tied timestamp match ${index + 1}`,
      published_at: tiedPublishedAt,
      watch_style: tiedFilters.watch_style,
      movement: tiedFilters.movement,
      dial_colour: tiedFilters.dial_colour,
      strap_type: tiedFilters.strap_type,
      case_size_mm: tiedFilters.case_size_mm,
    }));

    const draftSeed: BuildInsert = {
      author_id: identities.authorA.id,
      status: "draft",
      name: "Tied timestamp matching draft",
      published_at: null,
      watch_style: tiedFilters.watch_style,
      movement: tiedFilters.movement,
      dial_colour: tiedFilters.dial_colour,
      strap_type: tiedFilters.strap_type,
      case_size_mm: tiedFilters.case_size_mm,
    };

    for (const seed of [...matchingPublishedSeeds, draftSeed]) {
      const { data, error } = await identities.serviceRole.from("builds").insert(seed).select("id").single();
      if (error) {
        throw new Error(`Failed to seed tied-timestamp catalog build: ${error.message}`);
      }
      buildIds.push(data.id);
      if (seed.status === "published") {
        matchingPublishedIds.push(data.id);
      } else {
        matchingDraftId = data.id;
      }
    }
  });

  afterAll(async () => {
    for (const buildId of buildIds) {
      await cleanupBuild(identities.serviceRole, buildId);
    }
  });

  it("paginates through tied published_at rows without skipping, duplicating, or leaking drafts", async () => {
    const store = createSupabaseCatalogStore(identities.anon);
    const collectedIds: string[] = [];

    const first = await listPublishedBuilds({ direction: "first", boundary: null, filters: tiedFilters }, store);
    collectedIds.push(...first.items.map((item) => item.id));
    expect(first.items).toHaveLength(12);
    expect(first.nextCursor).not.toBeNull();

    const nextCursor = first.nextCursor;
    if (!nextCursor) {
      throw new Error("Expected a next-page cursor for tied-timestamp results");
    }

    const second = await listPublishedBuilds(
      {
        direction: "after",
        boundary: decodeCatalogCursor(nextCursor),
        filters: tiedFilters,
      },
      store,
    );
    collectedIds.push(...second.items.map((item) => item.id));
    expect(second.items).toHaveLength(1);
    expect(second.previousCursor).not.toBeNull();

    const previousCursor = second.previousCursor;
    if (!previousCursor) {
      throw new Error("Expected a previous-page cursor for tied-timestamp results");
    }

    const backToFirst = await listPublishedBuilds(
      {
        direction: "before",
        boundary: decodeCatalogCursor(previousCursor),
        filters: tiedFilters,
      },
      store,
    );

    expect(backToFirst.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id));
    expect(new Set(collectedIds).size).toBe(matchingPublishedIds.length);
    expect(collectedIds).toEqual(expect.arrayContaining(matchingPublishedIds));
    expect(collectedIds).not.toContain(matchingDraftId);
  });
});
