import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupBuild, createTestIdentities, type TestIdentities } from "./helpers/supabase-identities";

const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, 0x18, 0x00, 0x00,
  0x00, 0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00, 0x34, 0x25, 0xa4, 0x00, 0x03, 0x70,
  0x00, 0xfe, 0xfb, 0xfd, 0x50, 0x00,
]);

describe("build image storage RLS matrix", () => {
  let identities: TestIdentities;
  let buildId: string;
  let objectPath: string;

  beforeAll(async () => {
    identities = await createTestIdentities();

    const { data, error } = await identities.authorA.client
      .from("builds")
      .insert({ author_id: identities.authorA.id, status: "draft", name: "Image build" })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to seed build: ${error.message}`);
    }
    buildId = data.id;
    objectPath = `${identities.authorA.id}/${buildId}/main.webp`;
  });

  afterAll(async () => {
    await identities.serviceRole.storage.from("build-images").remove([objectPath]);
    await cleanupBuild(identities.serviceRole, buildId);
  });

  it("upload fails when the build row does not exist yet", async () => {
    const fakeBuildId = "00000000-0000-4000-8000-000000000001";
    const fakePath = `${identities.authorA.id}/${fakeBuildId}/main.webp`;
    const { error } = await identities.authorA.client.storage.from("build-images").upload(fakePath, WEBP_BYTES, {
      contentType: "image/webp",
      upsert: true,
    });
    expect(error).not.toBeNull();
  });

  it("author A can upload under their owned build path", async () => {
    const { error } = await identities.authorA.client.storage.from("build-images").upload(objectPath, WEBP_BYTES, {
      contentType: "image/webp",
      upsert: true,
    });
    expect(error).toBeNull();
  });

  it("author A cannot upload under user B prefix or B-owned build", async () => {
    const { data: bBuild, error: bBuildError } = await identities.userB.client
      .from("builds")
      .insert({ author_id: identities.userB.id, status: "draft", name: "B build" })
      .select("id")
      .single();
    expect(bBuildError).toBeNull();
    if (!bBuild) {
      throw new Error("Failed to seed B build");
    }
    const bBuildId = bBuild.id;

    const wrongPrefixPath = `${identities.userB.id}/${buildId}/main.webp`;
    const { error: wrongPrefixError } = await identities.authorA.client.storage
      .from("build-images")
      .upload(wrongPrefixPath, WEBP_BYTES, {
        contentType: "image/webp",
        upsert: true,
      });
    expect(wrongPrefixError).not.toBeNull();

    const bOwnedPath = `${identities.authorA.id}/${bBuildId}/main.webp`;
    const { error: bOwnedError } = await identities.authorA.client.storage
      .from("build-images")
      .upload(bOwnedPath, WEBP_BYTES, {
        contentType: "image/webp",
        upsert: true,
      });
    expect(bOwnedError).not.toBeNull();

    await cleanupBuild(identities.serviceRole, bBuildId);
  });

  it("anon and B cannot download draft object or list prefixes", async () => {
    const { data: anonDownload, error: anonDownloadError } = await identities.anon.storage
      .from("build-images")
      .download(objectPath);
    expect(anonDownloadError).not.toBeNull();
    expect(anonDownload).toBeNull();

    const { data: bDownload, error: bDownloadError } = await identities.userB.client.storage
      .from("build-images")
      .download(objectPath);
    expect(bDownloadError).not.toBeNull();
    expect(bDownload).toBeNull();

    const { data: anonList } = await identities.anon.storage.from("build-images").list(identities.authorA.id);
    expect(anonList).toHaveLength(0);

    const { data: bucketList } = await identities.anon.storage.from("build-images").list("");
    expect(bucketList).toHaveLength(0);

    const { data: bList } = await identities.userB.client.storage.from("build-images").list(identities.authorA.id);
    expect(bList).toHaveLength(0);

    const { data: bBucketList } = await identities.userB.client.storage.from("build-images").list("");
    expect(bBucketList).toHaveLength(0);
  });

  it("user B cannot update or delete author A object", async () => {
    const { error: updateError } = await identities.userB.client.storage
      .from("build-images")
      .upload(objectPath, WEBP_BYTES, {
        contentType: "image/webp",
        upsert: true,
      });
    expect(updateError).not.toBeNull();

    const { data: removed, error: deleteError } = await identities.userB.client.storage
      .from("build-images")
      .remove([objectPath]);
    expect(deleteError).toBeNull();
    expect(removed).toHaveLength(0);

    const { data: stillThere, error: downloadError } = await identities.authorA.client.storage
      .from("build-images")
      .download(objectPath);
    expect(downloadError).toBeNull();
    expect(stillThere).not.toBeNull();
  });

  it("rejects main_image_path that does not match author and build id", async () => {
    const { data: other, error: otherError } = await identities.authorA.client
      .from("builds")
      .insert({ author_id: identities.authorA.id, status: "draft", name: "Other image build" })
      .select("id")
      .single();
    expect(otherError).toBeNull();
    if (!other) {
      throw new Error("Failed to seed other build");
    }

    const { error: mismatchError } = await identities.authorA.client
      .from("builds")
      .update({ main_image_path: `${identities.authorA.id}/${other.id}/main.webp` })
      .eq("id", buildId);
    expect(mismatchError).not.toBeNull();

    const { error: publishError } = await identities.authorA.client
      .from("builds")
      .update({
        status: "published",
        main_image_path: `${identities.authorA.id}/${other.id}/main.webp`,
      })
      .eq("id", buildId);
    expect(publishError).not.toBeNull();

    const { error: anonDownload } = await identities.anon.storage.from("build-images").download(objectPath);
    expect(anonDownload).not.toBeNull();

    await cleanupBuild(identities.serviceRole, other.id);
  });

  it("after publish and main_image_path set, anon and B can read; unpublish revokes access", async () => {
    const { error: pathError } = await identities.authorA.client
      .from("builds")
      .update({ main_image_path: objectPath })
      .eq("id", buildId);
    expect(pathError).toBeNull();

    const { error: publishError } = await identities.authorA.client
      .from("builds")
      .update({ status: "published" })
      .eq("id", buildId);
    expect(publishError).toBeNull();

    const { data: anonSigned, error: anonSignedError } = await identities.anon.storage
      .from("build-images")
      .createSignedUrl(objectPath, 60);
    expect(anonSignedError).toBeNull();
    expect(anonSigned?.signedUrl).toMatch(/^https?:\/\//);

    const { data: bDownload, error: bDownloadError } = await identities.userB.client.storage
      .from("build-images")
      .download(objectPath);
    expect(bDownloadError).toBeNull();
    expect(bDownload).not.toBeNull();

    const { error: unpublishError } = await identities.authorA.client
      .from("builds")
      .update({ status: "draft" })
      .eq("id", buildId);
    expect(unpublishError).toBeNull();

    const { error: anonAfterUnpublish } = await identities.anon.storage
      .from("build-images")
      .createSignedUrl(objectPath, 60);
    expect(anonAfterUnpublish).not.toBeNull();

    const { error: bAfterUnpublish } = await identities.userB.client.storage.from("build-images").download(objectPath);
    expect(bAfterUnpublish).not.toBeNull();
  });
});
