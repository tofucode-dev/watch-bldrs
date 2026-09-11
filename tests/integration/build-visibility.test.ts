import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupBuild, createTestIdentities, type TestIdentities } from "./helpers/supabase-identities";

describe("build visibility RLS matrix", () => {
  let identities: TestIdentities;
  let buildId: string;

  beforeAll(async () => {
    identities = await createTestIdentities();

    const { data, error } = await identities.authorA.client
      .from("builds")
      .insert({ author_id: identities.authorA.id, status: "draft", name: "Draft build" })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to seed draft build: ${error.message}`);
    }
    buildId = data.id;

    const { error: partError } = await identities.authorA.client.from("build_parts").insert({
      build_id: buildId,
      category: "case",
      name: "Case part",
      position: 0,
    });
    if (partError) {
      throw new Error(`Failed to seed build part: ${partError.message}`);
    }
  });

  afterAll(async () => {
    await cleanupBuild(identities.serviceRole, buildId);
  });

  it("author A can select their draft build and parts", async () => {
    const { data: build, error: buildError } = await identities.authorA.client
      .from("builds")
      .select("id, status")
      .eq("id", buildId)
      .maybeSingle();
    expect(buildError).toBeNull();
    expect(build?.status).toBe("draft");

    const { data: parts, error: partsError } = await identities.authorA.client
      .from("build_parts")
      .select("id")
      .eq("build_id", buildId);
    expect(partsError).toBeNull();
    expect(parts).toHaveLength(1);
  });

  it("anonymous and user B cannot select author A draft build or parts", async () => {
    const { data: anonBuild } = await identities.anon.from("builds").select("id").eq("id", buildId).maybeSingle();
    expect(anonBuild).toBeNull();

    const { data: bBuild } = await identities.userB.client.from("builds").select("id").eq("id", buildId).maybeSingle();
    expect(bBuild).toBeNull();

    const { data: anonParts } = await identities.anon.from("build_parts").select("id").eq("build_id", buildId);
    expect(anonParts).toHaveLength(0);

    const { data: bParts } = await identities.userB.client.from("build_parts").select("id").eq("build_id", buildId);
    expect(bParts).toHaveLength(0);
  });

  it("user B cannot update or delete author A draft; author A can", async () => {
    const { data: bUpdatedRows, error: bUpdateError } = await identities.userB.client
      .from("builds")
      .update({ name: "Hijacked" })
      .eq("id", buildId)
      .select("id");
    expect(bUpdateError).toBeNull();
    expect(bUpdatedRows).toHaveLength(0);

    const { data: bDeletedRows, error: bDeleteError } = await identities.userB.client
      .from("builds")
      .delete()
      .eq("id", buildId)
      .select("id");
    expect(bDeleteError).toBeNull();
    expect(bDeletedRows).toHaveLength(0);

    const { error: aUpdateError } = await identities.authorA.client
      .from("builds")
      .update({ name: "Updated draft" })
      .eq("id", buildId);
    expect(aUpdateError).toBeNull();

    const { data: disposable, error: disposableError } = await identities.authorA.client
      .from("builds")
      .insert({ author_id: identities.authorA.id, status: "draft", name: "Disposable draft" })
      .select("id")
      .single();
    expect(disposableError).toBeNull();
    if (!disposable) {
      throw new Error("Failed to seed disposable draft");
    }

    const { data: aDeletedRows, error: aDeleteError } = await identities.authorA.client
      .from("builds")
      .delete()
      .eq("id", disposable.id)
      .select("id");
    expect(aDeleteError).toBeNull();
    expect(aDeletedRows).toHaveLength(1);

    const { data: afterDelete } = await identities.authorA.client
      .from("builds")
      .select("id")
      .eq("id", disposable.id)
      .maybeSingle();
    expect(afterDelete).toBeNull();
  });

  it("user B cannot insert a build with author_id = A", async () => {
    const { error } = await identities.userB.client.from("builds").insert({
      author_id: identities.authorA.id,
      status: "draft",
      name: "Forged build",
    });
    expect(error).not.toBeNull();
  });

  it("anonymous cannot insert builds", async () => {
    const { error } = await identities.anon.from("builds").insert({
      author_id: identities.authorA.id,
      status: "draft",
      name: "Anon build",
    });
    expect(error).not.toBeNull();
  });

  it("after publish, anonymous and B can select but not mutate", async () => {
    const { error: publishError } = await identities.authorA.client
      .from("builds")
      .update({ status: "published" })
      .eq("id", buildId);
    expect(publishError).toBeNull();

    const { data: anonBuild } = await identities.anon
      .from("builds")
      .select("id, status, published_at")
      .eq("id", buildId)
      .maybeSingle();
    expect(anonBuild?.status).toBe("published");
    expect(anonBuild?.published_at).not.toBeNull();

    const { data: bBuild } = await identities.userB.client.from("builds").select("id").eq("id", buildId).maybeSingle();
    expect(bBuild).not.toBeNull();

    const { data: anonParts } = await identities.anon.from("build_parts").select("id").eq("build_id", buildId);
    expect(anonParts).toHaveLength(1);

    const { data: bUpdatedRows, error: bUpdateError } = await identities.userB.client
      .from("builds")
      .update({ name: "Mutated" })
      .eq("id", buildId)
      .select("id");
    expect(bUpdateError).toBeNull();
    expect(bUpdatedRows).toHaveLength(0);
  });

  it("author A can unpublish via SQL and anon/B lose read access again", async () => {
    const { data: beforeUnpublish, error: beforeError } = await identities.authorA.client
      .from("builds")
      .select("published_at")
      .eq("id", buildId)
      .single();
    expect(beforeError).toBeNull();
    expect(beforeUnpublish?.published_at).not.toBeNull();

    const { error: unpublishError } = await identities.authorA.client
      .from("builds")
      .update({ status: "draft" })
      .eq("id", buildId);
    expect(unpublishError).toBeNull();

    const { data: afterUnpublish } = await identities.authorA.client
      .from("builds")
      .select("id, published_at")
      .eq("id", buildId)
      .maybeSingle();
    expect(afterUnpublish?.published_at).toBe(beforeUnpublish?.published_at);

    const { data: anonBuild } = await identities.anon.from("builds").select("id").eq("id", buildId).maybeSingle();
    expect(anonBuild).toBeNull();

    const { data: bBuild } = await identities.userB.client.from("builds").select("id").eq("id", buildId).maybeSingle();
    expect(bBuild).toBeNull();
  });

  it("published_at stays set after client nulling and a second publish", async () => {
    const { data: firstStamp, error: firstStampError } = await identities.authorA.client
      .from("builds")
      .select("published_at")
      .eq("id", buildId)
      .single();
    expect(firstStampError).toBeNull();
    expect(firstStamp?.published_at).not.toBeNull();

    const { error: nullError } = await identities.authorA.client
      .from("builds")
      .update({ published_at: null })
      .eq("id", buildId);
    expect(nullError).toBeNull();

    const { data: afterNull } = await identities.authorA.client
      .from("builds")
      .select("published_at")
      .eq("id", buildId)
      .single();
    expect(afterNull?.published_at).toBe(firstStamp?.published_at);

    const { error: republishError } = await identities.authorA.client
      .from("builds")
      .update({ status: "published" })
      .eq("id", buildId);
    expect(republishError).toBeNull();

    const { data: afterSecondPublish } = await identities.authorA.client
      .from("builds")
      .select("published_at")
      .eq("id", buildId)
      .single();
    expect(afterSecondPublish?.published_at).toBe(firstStamp?.published_at);
  });
});
