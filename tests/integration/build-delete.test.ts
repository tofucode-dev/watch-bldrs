import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createSupabaseBuildStore } from "../../src/modules/builds/infrastructure/supabase-build-store";
import { cleanupBuild, createTestIdentities, type TestIdentities } from "./helpers/supabase-identities";

describe("build delete authorization matrix", () => {
  let identities: TestIdentities;
  let buildId: string;

  beforeAll(async () => {
    identities = await createTestIdentities();

    const { data, error } = await identities.authorA.client
      .from("builds")
      .insert({ author_id: identities.authorA.id, status: "draft", name: "Delete me" })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to seed build: ${error.message}`);
    }
    buildId = data.id;
  });

  afterAll(async () => {
    await cleanupBuild(identities.serviceRole, buildId);
  });

  it("author A can delete own build through the store", async () => {
    const store = createSupabaseBuildStore(identities.authorA.client);
    await expect(store.deleteBuild(identities.authorA.id, buildId)).resolves.toBeUndefined();

    const { data } = await identities.authorA.client.from("builds").select("id").eq("id", buildId).maybeSingle();
    expect(data).toBeNull();
  });

  it("user B delete affects zero rows", async () => {
    const { data: seeded, error: seedError } = await identities.authorA.client
      .from("builds")
      .insert({ author_id: identities.authorA.id, status: "draft", name: "Protected" })
      .select("id")
      .single();
    expect(seedError).toBeNull();
    if (!seeded) {
      throw new Error("Failed to seed protected build");
    }

    const store = createSupabaseBuildStore(identities.userB.client);
    await expect(store.deleteBuild(identities.userB.id, seeded.id)).resolves.toBeUndefined();

    const { data: stillThere } = await identities.authorA.client
      .from("builds")
      .select("id")
      .eq("id", seeded.id)
      .maybeSingle();
    expect(stillThere).not.toBeNull();

    await cleanupBuild(identities.serviceRole, seeded.id);
  });

  it("deleting a missing id is idempotent", async () => {
    const store = createSupabaseBuildStore(identities.authorA.client);
    await expect(
      store.deleteBuild(identities.authorA.id, "00000000-0000-4000-8000-000000000001"),
    ).resolves.toBeUndefined();
  });
});
