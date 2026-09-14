import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { attachMainImage } from "@/modules/builds/application/attach-main-image";
import { deleteBuild } from "@/modules/builds/application/delete-build";
import { publishBuild } from "@/modules/builds/application/publish-build";
import { updateDraftBuild } from "@/modules/builds/application/update-draft-build";
import { DraftNotFoundError } from "@/modules/builds/domain/errors";
import { createSupabaseBuildStore } from "@/modules/builds/infrastructure/supabase-build-store";
import type { Actor } from "@/types";

import { cleanupBuild, createTestIdentities, type TestIdentities } from "./helpers/supabase-identities";

describe("cross-user build mutation denial matrix", () => {
  let identities: TestIdentities;
  let draftId: string;
  let publishedId: string;
  let userBActor: Actor;

  beforeAll(async () => {
    identities = await createTestIdentities();
    userBActor = { kind: "authenticated", userId: identities.userB.id };

    const storeA = createSupabaseBuildStore(identities.authorA.client);

    const { data: draftData, error: draftError } = await identities.authorA.client.rpc("save_draft_build", {
      p_name: "Author A draft target",
      p_story: null,
    });
    expect(draftError).toBeNull();
    if (typeof draftData !== "string" || draftData === "") {
      throw new Error("save_draft_build did not return a draft id");
    }
    draftId = draftData;

    const { data: publishedData, error: publishedError } = await identities.authorA.client.rpc("save_draft_build", {
      p_name: "Author A published target",
      p_story: null,
    });
    expect(publishedError).toBeNull();
    if (typeof publishedData !== "string" || publishedData === "") {
      throw new Error("save_draft_build did not return a published target id");
    }
    publishedId = publishedData;
    await storeA.publishBuild(identities.authorA.id, publishedId);
  });

  afterAll(async () => {
    await cleanupBuild(identities.serviceRole, draftId);
    await cleanupBuild(identities.serviceRole, publishedId);
  });

  describe.each([
    { label: "draft", getId: () => draftId },
    { label: "published", getId: () => publishedId },
  ])("user B cannot mutate author A $label build", ({ getId }) => {
    it("updateDraftBuild throws DraftNotFoundError", async () => {
      const storeB = createSupabaseBuildStore(identities.userB.client);
      const targetId = getId();

      await expect(updateDraftBuild(userBActor, targetId, { name: "Hijacked" }, storeB)).rejects.toBeInstanceOf(
        DraftNotFoundError,
      );

      const { data: row } = await identities.authorA.client.from("builds").select("name").eq("id", targetId).single();
      expect(row?.name).not.toBe("Hijacked");
    });

    it("publishBuild throws DraftNotFoundError", async () => {
      const storeB = createSupabaseBuildStore(identities.userB.client);
      const targetId = getId();

      await expect(publishBuild(userBActor, targetId, storeB)).rejects.toBeInstanceOf(DraftNotFoundError);
    });

    it("deleteBuild resolves without deleting the row", async () => {
      const storeB = createSupabaseBuildStore(identities.userB.client);
      const targetId = getId();

      await expect(deleteBuild(userBActor, targetId, storeB)).resolves.toBeUndefined();

      const { data: stillThere } = await identities.authorA.client
        .from("builds")
        .select("id")
        .eq("id", targetId)
        .maybeSingle();
      expect(stillThere).not.toBeNull();
    });

    it("attachMainImage throws DraftNotFoundError with a path under user B prefix", async () => {
      const storeB = createSupabaseBuildStore(identities.userB.client);
      const targetId = getId();
      const validPathForB = `${identities.userB.id}/${targetId}/main.webp`;

      await expect(attachMainImage(userBActor, targetId, validPathForB, storeB)).rejects.toBeInstanceOf(
        DraftNotFoundError,
      );

      const { data: row } = await identities.authorA.client
        .from("builds")
        .select("main_image_path")
        .eq("id", targetId)
        .single();
      expect(row?.main_image_path).toBeNull();
    });
  });

  it("user B cannot update author A published build via save_draft_build RPC", async () => {
    const { data, error } = await identities.userB.client.rpc("save_draft_build", {
      p_id: publishedId,
      p_name: "Hijacked published",
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();

    const { data: row } = await identities.authorA.client
      .from("builds")
      .select("name, status")
      .eq("id", publishedId)
      .single();
    expect(row?.name).toBe("Author A published target");
    expect(row?.status).toBe("published");
  });
});
