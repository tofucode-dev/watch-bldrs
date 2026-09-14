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

  // Non-owner delete is intentionally a silent no-op at the store layer — data stays protected
  // even though a future Action may still return { ok: true } to the caller.
  it("user B delete on author A published build leaves row intact", async () => {
    const { data: seeded, error: seedError } = await identities.authorA.client.rpc("save_draft_build", {
      p_name: "Published delete target",
      p_story: null,
    });
    expect(seedError).toBeNull();
    if (typeof seeded !== "string" || seeded === "") {
      throw new Error("Failed to seed published delete target");
    }

    const authorStore = createSupabaseBuildStore(identities.authorA.client);
    await authorStore.publishBuild(identities.authorA.id, seeded);

    const userBStore = createSupabaseBuildStore(identities.userB.client);
    await expect(userBStore.deleteBuild(identities.userB.id, seeded)).resolves.toBeUndefined();

    const { data: afterStoreDelete } = await identities.authorA.client
      .from("builds")
      .select("id, status")
      .eq("id", seeded)
      .maybeSingle();
    expect(afterStoreDelete).not.toBeNull();
    expect(afterStoreDelete?.status).toBe("published");

    const { error: rlsDeleteError } = await identities.userB.client.from("builds").delete().eq("id", seeded);
    expect(rlsDeleteError).toBeNull();

    const { data: afterRlsDelete } = await identities.authorA.client
      .from("builds")
      .select("id")
      .eq("id", seeded)
      .maybeSingle();
    expect(afterRlsDelete).not.toBeNull();

    await cleanupBuild(identities.serviceRole, seeded);
  });
});
