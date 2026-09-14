import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createSupabaseBuildStore } from "@/modules/builds/infrastructure/supabase-build-store";

import { cleanupBuild, createTestIdentities, type TestIdentities } from "./helpers/supabase-identities";

describe("publish draft build identity matrix", () => {
  let identities: TestIdentities;
  const createdIds: string[] = [];

  beforeAll(async () => {
    identities = await createTestIdentities();
  });

  afterAll(async () => {
    await Promise.all(createdIds.map((id) => cleanupBuild(identities.serviceRole, id)));
  });

  async function createAuthorDraft(): Promise<string> {
    const { data, error } = await identities.authorA.client.rpc("save_draft_build", {
      p_name: null,
      p_story: null,
    });
    expect(error).toBeNull();
    if (typeof data !== "string" || data === "") {
      throw new Error("save_draft_build did not return a build id");
    }
    if (!createdIds.includes(data)) {
      createdIds.push(data);
    }
    return data;
  }

  it("publishes an owned draft with all optional fields empty", async () => {
    const buildId = await createAuthorDraft();
    const store = createSupabaseBuildStore(identities.authorA.client);

    const result = await store.publishBuild(identities.authorA.id, buildId);
    expect(result).toEqual({ id: buildId });

    const { data: row, error } = await identities.authorA.client
      .from("builds")
      .select("status, published_at")
      .eq("id", buildId)
      .single();

    expect(error).toBeNull();
    expect(row?.status).toBe("published");
    expect(row?.published_at).not.toBeNull();
  });

  it("allows anonymous and user B to read only after publication", async () => {
    const buildId = await createAuthorDraft();

    const { data: anonBefore } = await identities.anon.from("builds").select("id").eq("id", buildId).maybeSingle();
    const { data: userBBefore } = await identities.userB.client
      .from("builds")
      .select("id")
      .eq("id", buildId)
      .maybeSingle();
    expect(anonBefore).toBeNull();
    expect(userBBefore).toBeNull();

    const store = createSupabaseBuildStore(identities.authorA.client);
    await store.publishBuild(identities.authorA.id, buildId);

    const { data: anonAfter } = await identities.anon.from("builds").select("id").eq("id", buildId).maybeSingle();
    const { data: userBAfter } = await identities.userB.client
      .from("builds")
      .select("id")
      .eq("id", buildId)
      .maybeSingle();

    expect(anonAfter?.id).toBe(buildId);
    expect(userBAfter?.id).toBe(buildId);
  });

  it("treats a safe owner retry as success without changing published_at or updated_at", async () => {
    const buildId = await createAuthorDraft();
    const store = createSupabaseBuildStore(identities.authorA.client);

    const first = await store.publishBuild(identities.authorA.id, buildId);
    expect(first).toEqual({ id: buildId });

    const { data: before } = await identities.authorA.client
      .from("builds")
      .select("published_at, updated_at")
      .eq("id", buildId)
      .single();
    expect(before?.published_at).not.toBeNull();
    expect(before?.updated_at).not.toBeNull();

    const second = await store.publishBuild(identities.authorA.id, buildId);
    expect(second).toEqual({ id: buildId });

    const { data: after } = await identities.authorA.client
      .from("builds")
      .select("published_at, updated_at")
      .eq("id", buildId)
      .single();

    expect(after?.published_at).toBe(before?.published_at);
    expect(after?.updated_at).toBe(before?.updated_at);
  });

  it("handles two concurrent owner publish calls with one stable transition", async () => {
    const buildId = await createAuthorDraft();
    const store = createSupabaseBuildStore(identities.authorA.client);

    const [first, second] = await Promise.all([
      store.publishBuild(identities.authorA.id, buildId),
      store.publishBuild(identities.authorA.id, buildId),
    ]);

    expect(first).toEqual({ id: buildId });
    expect(second).toEqual({ id: buildId });

    const { data: row } = await identities.authorA.client
      .from("builds")
      .select("status, published_at")
      .eq("id", buildId)
      .single();

    expect(row?.status).toBe("published");
    expect(row?.published_at).not.toBeNull();
  });

  it("returns null for user B and missing UUID without mutation", async () => {
    const buildId = await createAuthorDraft();
    const storeForB = createSupabaseBuildStore(identities.userB.client);
    const storeForA = createSupabaseBuildStore(identities.authorA.client);

    const hijack = await storeForB.publishBuild(identities.userB.id, buildId);
    expect(hijack).toBeNull();

    const missing = await storeForA.publishBuild(identities.authorA.id, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(missing).toBeNull();

    const { data: row } = await identities.authorA.client.from("builds").select("status").eq("id", buildId).single();
    expect(row?.status).toBe("draft");
  });
});
