import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "../../src/lib/database.types";
import { listPublishedBuilds } from "../../src/modules/catalog/application/list-published-builds";
import { createSupabaseBuildStore } from "../../src/modules/builds/infrastructure/supabase-build-store";
import { createSupabaseCatalogStore } from "../../src/modules/catalog/infrastructure/supabase-catalog-store";

import { cleanupBuild, createTestIdentities, type TestIdentities } from "./helpers/supabase-identities";

describe("catalog listing after unpublish", () => {
  let identities: TestIdentities;
  let buildId: string;
  let publishedAtBeforeUnpublish: string;

  beforeAll(async () => {
    identities = await createTestIdentities();

    const { data, error } = await identities.authorA.client.rpc("save_draft_build", {
      p_name: "Catalog unpublish target",
      p_story: null,
    });
    expect(error).toBeNull();
    if (typeof data !== "string" || data === "") {
      throw new Error("save_draft_build did not return a build id");
    }
    buildId = data;

    const store = createSupabaseBuildStore(identities.authorA.client);
    await store.publishBuild(identities.authorA.id, buildId);

    const { data: row, error: rowError } = await identities.authorA.client
      .from("builds")
      .select("published_at")
      .eq("id", buildId)
      .single();
    expect(rowError).toBeNull();
    if (!row?.published_at) {
      throw new Error("Expected published_at to be set after publish");
    }
    publishedAtBeforeUnpublish = row.published_at;
  });

  afterAll(async () => {
    await cleanupBuild(identities.serviceRole, buildId);
  });

  async function firstPageIdsFor(client: SupabaseClient<Database>): Promise<string[]> {
    const store = createSupabaseCatalogStore(client);
    const page = await listPublishedBuilds({ direction: "first", boundary: null }, store);
    return page.items.map((item) => item.id);
  }

  it("includes the build for anon, author A, and user B before unpublish", async () => {
    for (const ids of [
      await firstPageIdsFor(identities.anon),
      await firstPageIdsFor(identities.authorA.client),
      await firstPageIdsFor(identities.userB.client),
    ]) {
      expect(ids).toContain(buildId);
    }
  });

  it("excludes the build for all identities after author A unpublishes", async () => {
    const { error: unpublishError } = await identities.authorA.client
      .from("builds")
      .update({ status: "draft" })
      .eq("id", buildId);
    expect(unpublishError).toBeNull();

    const { data: afterUnpublish, error: afterError } = await identities.authorA.client
      .from("builds")
      .select("published_at")
      .eq("id", buildId)
      .single();
    expect(afterError).toBeNull();
    expect(afterUnpublish?.published_at).toBe(publishedAtBeforeUnpublish);

    for (const ids of [
      await firstPageIdsFor(identities.anon),
      await firstPageIdsFor(identities.authorA.client),
      await firstPageIdsFor(identities.userB.client),
    ]) {
      expect(ids).not.toContain(buildId);
    }
  });
});
