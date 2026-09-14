import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getOwnedDraft } from "@/modules/builds/application/get-owned-draft";
import { DraftNotFoundError, UnauthenticatedError } from "@/modules/builds/domain/errors";
import { createSupabaseBuildStore } from "@/modules/builds/infrastructure/supabase-build-store";
import type { Actor } from "@/types";

import { cleanupBuild, createTestIdentities, type TestIdentities } from "./helpers/supabase-identities";

describe("owned draft read via application store", () => {
  let identities: TestIdentities;
  let buildId: string;

  beforeAll(async () => {
    identities = await createTestIdentities();

    const { data, error } = await identities.authorA.client.rpc("save_draft_build", {
      p_name: "Author A draft",
      p_story: null,
    });
    expect(error).toBeNull();
    if (typeof data !== "string" || data === "") {
      throw new Error("save_draft_build did not return a build id");
    }
    buildId = data;
  });

  afterAll(async () => {
    await cleanupBuild(identities.serviceRole, buildId);
  });

  it("returns the draft for author A through getOwnedDraft and the real store", async () => {
    const actor: Actor = { kind: "authenticated", userId: identities.authorA.id };
    const store = createSupabaseBuildStore(identities.authorA.client);

    const draft = await getOwnedDraft(actor, buildId, store);

    expect(draft.id).toBe(buildId);
    expect(draft.status).toBe("draft");
    expect(draft.name).toBe("Author A draft");
  });

  it("throws DraftNotFoundError when user B requests author A draft", async () => {
    const actor: Actor = { kind: "authenticated", userId: identities.userB.id };
    const store = createSupabaseBuildStore(identities.userB.client);

    await expect(getOwnedDraft(actor, buildId, store)).rejects.toBeInstanceOf(DraftNotFoundError);
  });

  it("throws UnauthenticatedError for an anonymous actor", async () => {
    const actor: Actor = { kind: "anonymous" };
    const store = createSupabaseBuildStore(identities.anon);

    await expect(getOwnedDraft(actor, buildId, store)).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
