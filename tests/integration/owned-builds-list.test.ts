import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { listOwnedBuilds } from "../../src/modules/builds/application/list-owned-builds";
import { UnauthenticatedError } from "../../src/modules/builds/domain/errors";
import { createSupabaseBuildStore } from "../../src/modules/builds/infrastructure/supabase-build-store";
import { cleanupBuild, createTestIdentities, type TestIdentities } from "./helpers/supabase-identities";

describe("owned builds list identity matrix", () => {
  let identities: TestIdentities;
  let authorDraftId: string;
  let authorPublishedId: string;
  let userBDraftId: string;

  beforeAll(async () => {
    identities = await createTestIdentities();

    const authorDraft = await identities.authorA.client
      .from("builds")
      .insert({ author_id: identities.authorA.id, status: "draft", name: "Author A draft" })
      .select("id")
      .single();
    if (authorDraft.error) {
      throw new Error(`Failed to seed author draft: ${authorDraft.error.message}`);
    }
    authorDraftId = authorDraft.data.id;

    const authorPublishedDraft = await identities.authorA.client
      .from("builds")
      .insert({ author_id: identities.authorA.id, status: "draft", name: "Author A published" })
      .select("id")
      .single();
    if (authorPublishedDraft.error) {
      throw new Error(`Failed to seed author published draft: ${authorPublishedDraft.error.message}`);
    }
    authorPublishedId = authorPublishedDraft.data.id;

    const { error: publishError } = await identities.authorA.client
      .from("builds")
      .update({ status: "published" })
      .eq("id", authorPublishedId);
    if (publishError) {
      throw new Error(`Failed to publish author build: ${publishError.message}`);
    }

    const userBDraft = await identities.userB.client
      .from("builds")
      .insert({ author_id: identities.userB.id, status: "draft", name: "User B draft" })
      .select("id")
      .single();
    if (userBDraft.error) {
      throw new Error(`Failed to seed user B draft: ${userBDraft.error.message}`);
    }
    userBDraftId = userBDraft.data.id;
  });

  afterAll(async () => {
    await cleanupBuild(identities.serviceRole, authorDraftId);
    await cleanupBuild(identities.serviceRole, authorPublishedId);
    await cleanupBuild(identities.serviceRole, userBDraftId);
  });

  it("author A sees own draft and published builds", async () => {
    const store = createSupabaseBuildStore(identities.authorA.client);
    const page = await listOwnedBuilds(
      { kind: "authenticated", userId: identities.authorA.id },
      { direction: "first", boundary: null },
      store,
    );

    const ids = page.items.map((item) => item.id);
    expect(ids).toContain(authorDraftId);
    expect(ids).toContain(authorPublishedId);
    expect(ids).not.toContain(userBDraftId);
  });

  it("user B list never returns author A builds", async () => {
    const store = createSupabaseBuildStore(identities.userB.client);
    const page = await listOwnedBuilds(
      { kind: "authenticated", userId: identities.userB.id },
      { direction: "first", boundary: null },
      store,
    );

    const ids = page.items.map((item) => item.id);
    expect(ids).toContain(userBDraftId);
    expect(ids).not.toContain(authorDraftId);
    expect(ids).not.toContain(authorPublishedId);
  });

  it("anonymous cannot list owned builds", async () => {
    const store = createSupabaseBuildStore(identities.anon);
    await expect(
      listOwnedBuilds({ kind: "anonymous" }, { direction: "first", boundary: null }, store),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
