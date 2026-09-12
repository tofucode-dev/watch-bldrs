import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cleanupBuild, createTestIdentities, type TestIdentities } from "./helpers/supabase-identities";

const PARTS = [
  {
    category: "case",
    name: "SKX007 case",
    product_url: "https://example.com/case",
    price_amount_minor: 19900,
    currency: "USD",
    position: 0,
  },
];

describe("save_draft_build identity matrix", () => {
  let identities: TestIdentities;
  const createdIds: string[] = [];

  beforeAll(async () => {
    identities = await createTestIdentities();
  });

  afterAll(async () => {
    await Promise.all(createdIds.map((id) => cleanupBuild(identities.serviceRole, id)));
  });

  async function saveAuthorDraft(params: { p_id?: string; p_name: string }): Promise<string> {
    const { data, error } = await identities.authorA.client.rpc("save_draft_build", {
      p_id: params.p_id,
      p_name: params.p_name,
      p_story: "Private notes",
      p_watch_style: "diver",
      p_parts: PARTS,
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

  it("author A can save a draft with parts", async () => {
    const buildId = await saveAuthorDraft({ p_name: "Author A draft" });

    const { data: row, error: rowError } = await identities.authorA.client
      .from("builds")
      .select("id, status, name, author_id")
      .eq("id", buildId)
      .single();

    expect(rowError).toBeNull();
    expect(row?.status).toBe("draft");
    expect(row?.name).toBe("Author A draft");
    expect(row?.author_id).toBe(identities.authorA.id);

    const { data: parts, error: partsError } = await identities.authorA.client
      .from("build_parts")
      .select("name, category, position")
      .eq("build_id", buildId)
      .order("position");

    expect(partsError).toBeNull();
    expect(parts).toEqual([{ name: "SKX007 case", category: "case", position: 0 }]);
  });

  it("anonymous cannot execute save_draft_build or insert a build", async () => {
    const { data: rpcData, error: rpcError } = await identities.anon.rpc("save_draft_build", {
      p_name: "Anon draft",
    });
    expect(rpcData).toBeNull();
    expect(rpcError).not.toBeNull();

    const { error: insertError } = await identities.anon.from("builds").insert({
      author_id: identities.authorA.id,
      status: "draft",
      name: "Anon insert",
    });
    expect(insertError).not.toBeNull();
  });

  it("user B cannot update author A's draft via save_draft_build", async () => {
    const buildId = await saveAuthorDraft({ p_name: "Author A private" });

    const { data, error } = await identities.userB.client.rpc("save_draft_build", {
      p_id: buildId,
      p_name: "Hijacked",
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();

    const { data: row } = await identities.authorA.client
      .from("builds")
      .select("name, status")
      .eq("id", buildId)
      .single();
    expect(row?.name).toBe("Author A private");
    expect(row?.status).toBe("draft");
  });

  it("saved row stays draft after a second save by the author", async () => {
    const buildId = await saveAuthorDraft({ p_name: "Author A first save" });

    const updatedId = await saveAuthorDraft({ p_id: buildId, p_name: "Author A draft updated" });
    expect(updatedId).toBe(buildId);

    const { data: row } = await identities.authorA.client
      .from("builds")
      .select("status, name")
      .eq("id", buildId)
      .single();
    expect(row?.status).toBe("draft");
    expect(row?.name).toBe("Author A draft updated");
  });
});
