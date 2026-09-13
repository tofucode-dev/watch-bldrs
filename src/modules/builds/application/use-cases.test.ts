import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { Actor } from "@/types";

import { attachMainImage } from "./attach-main-image";
import { createDraftBuild } from "./create-draft-build";
import { getOwnedDraft } from "./get-owned-draft";
import type { BuildStore } from "./ports/build-store";
import { updateDraftBuild } from "./update-draft-build";
import { DraftNotFoundError, DraftValidationError, UnauthenticatedError } from "../domain/errors";
import type { OwnedDraft, ValidatedDraft } from "../domain/types";

type StoredDraft = OwnedDraft & { authorId: string; status: "draft" | "published" };

class FakeBuildStore implements BuildStore {
  readonly drafts = new Map<string, StoredDraft>();

  saveDraft(input: { id: string | null; authorId: string; draft: ValidatedDraft }): Promise<{ id: string } | null> {
    if (input.id === null) {
      const id = randomUUID();
      this.drafts.set(id, {
        id,
        authorId: input.authorId,
        status: "draft",
        name: input.draft.name,
        story: input.draft.story,
        watchStyle: input.draft.watchStyle,
        movement: input.draft.movement,
        dialColour: input.draft.dialColour,
        strapType: input.draft.strapType,
        handsStyle: input.draft.handsStyle,
        caseSizeMm: input.draft.caseSizeMm,
        mainImagePath: null,
        mainImageUrl: null,
        parts: input.draft.parts,
      });
      return Promise.resolve({ id });
    }

    const existing = this.drafts.get(input.id);
    if (existing?.authorId !== input.authorId || existing.status !== "draft") {
      return Promise.resolve(null);
    }

    this.drafts.set(input.id, {
      ...existing,
      name: input.draft.name,
      story: input.draft.story,
      watchStyle: input.draft.watchStyle,
      movement: input.draft.movement,
      dialColour: input.draft.dialColour,
      strapType: input.draft.strapType,
      handsStyle: input.draft.handsStyle,
      caseSizeMm: input.draft.caseSizeMm,
      parts: input.draft.parts,
    });
    return Promise.resolve({ id: input.id });
  }

  getOwnedDraft(authorId: string, id: string): Promise<OwnedDraft | null> {
    const existing = this.drafts.get(id);
    if (existing?.authorId !== authorId || existing.status !== "draft") {
      return Promise.resolve(null);
    }
    return Promise.resolve(existing);
  }

  attachMainImage(authorId: string, id: string, path: string | null): Promise<{ id: string } | null> {
    const existing = this.drafts.get(id);
    if (existing?.authorId !== authorId || existing.status !== "draft") {
      return Promise.resolve(null);
    }
    existing.mainImagePath = path;
    existing.mainImageUrl = null;
    return Promise.resolve({ id });
  }
}

const authorA: Actor = { kind: "authenticated", userId: "11111111-1111-4111-8111-111111111111" };
const userB: Actor = { kind: "authenticated", userId: "22222222-2222-4222-8222-222222222222" };
const anonymous: Actor = { kind: "anonymous" };

const ownedPath = `${authorA.userId}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/main.jpg`;

describe("draft build use cases", () => {
  it("rejects unauthenticated create, update, get, and attach", async () => {
    const store = new FakeBuildStore();

    await expect(createDraftBuild(anonymous, {}, store)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(updateDraftBuild(anonymous, "missing", {}, store)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(getOwnedDraft(anonymous, "missing", store)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(attachMainImage(anonymous, "missing", ownedPath, store)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("creates a draft and returns its id", async () => {
    const store = new FakeBuildStore();
    const result = await createDraftBuild(authorA, { name: "SKX" }, store);

    expect(result.id).toEqual(expect.any(String));
    const saved = store.drafts.get(result.id);
    expect(saved?.name).toBe("SKX");
    expect(saved?.status).toBe("draft");
    expect(saved?.authorId).toBe(authorA.userId);
  });

  it("updates an owned draft", async () => {
    const store = new FakeBuildStore();
    const created = await createDraftBuild(authorA, { name: "First" }, store);

    const updated = await updateDraftBuild(authorA, created.id, { name: "Second", story: "Notes" }, store);
    expect(updated.id).toBe(created.id);
    expect(store.drafts.get(created.id)?.name).toBe("Second");
    expect(store.drafts.get(created.id)?.story).toBe("Notes");
  });

  it("treats a missing id as not found", async () => {
    const store = new FakeBuildStore();
    await expect(updateDraftBuild(authorA, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {}, store)).rejects.toBeInstanceOf(
      DraftNotFoundError,
    );
    await expect(getOwnedDraft(authorA, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", store)).rejects.toBeInstanceOf(
      DraftNotFoundError,
    );
  });

  it("treats another user's draft as not found", async () => {
    const store = new FakeBuildStore();
    const created = await createDraftBuild(authorA, { name: "Private" }, store);

    await expect(updateDraftBuild(userB, created.id, { name: "Hijack" }, store)).rejects.toBeInstanceOf(
      DraftNotFoundError,
    );
    await expect(getOwnedDraft(userB, created.id, store)).rejects.toBeInstanceOf(DraftNotFoundError);
    await expect(
      attachMainImage(userB, created.id, `${userB.userId}/${created.id}/main.jpg`, store),
    ).rejects.toBeInstanceOf(DraftNotFoundError);
  });

  it("treats a published id as not found", async () => {
    const store = new FakeBuildStore();
    const created = await createDraftBuild(authorA, { name: "Live" }, store);
    const stored = store.drafts.get(created.id);
    if (!stored) {
      throw new Error("expected seeded draft");
    }
    stored.status = "published";

    await expect(updateDraftBuild(authorA, created.id, { name: "Edit" }, store)).rejects.toBeInstanceOf(
      DraftNotFoundError,
    );
    await expect(getOwnedDraft(authorA, created.id, store)).rejects.toBeInstanceOf(DraftNotFoundError);
    await expect(
      attachMainImage(authorA, created.id, `${authorA.userId}/${created.id}/main.jpg`, store),
    ).rejects.toBeInstanceOf(DraftNotFoundError);
  });

  it("returns a signed display URL separately from the stored path", async () => {
    const store = new FakeBuildStore();
    const created = await createDraftBuild(authorA, {}, store);
    const path = `${authorA.userId}/${created.id}/main.jpg`;
    const previewUrl = "https://example.supabase.co/storage/v1/object/sign/build-images/main.jpg?token=abc";
    const stored = store.drafts.get(created.id);
    if (!stored) {
      throw new Error("expected seeded draft");
    }
    stored.mainImagePath = path;
    stored.mainImageUrl = previewUrl;

    const draft = await getOwnedDraft(authorA, created.id, store);
    expect(draft.mainImagePath).toBe(path);
    expect(draft.mainImageUrl).toBe(previewUrl);
    expect(draft.mainImagePath).not.toBe(draft.mainImageUrl);
  });

  it("clears the stored path when attach receives null", async () => {
    const store = new FakeBuildStore();
    const created = await createDraftBuild(authorA, {}, store);
    const path = `${authorA.userId}/${created.id}/main.jpg`;
    await attachMainImage(authorA, created.id, path, store);

    const cleared = await attachMainImage(authorA, created.id, null, store);
    expect(cleared.id).toBe(created.id);
    expect(store.drafts.get(created.id)?.mainImagePath).toBeNull();
  });

  it("attaches a valid owned main image path", async () => {
    const store = new FakeBuildStore();
    const created = await createDraftBuild(authorA, {}, store);
    const path = `${authorA.userId}/${created.id}/main.webp`;

    const attached = await attachMainImage(authorA, created.id, path, store);
    expect(attached.id).toBe(created.id);
    expect(store.drafts.get(created.id)?.mainImagePath).toBe(path);
  });

  it("rejects a path that is not owned by the actor and build", async () => {
    const store = new FakeBuildStore();
    const created = await createDraftBuild(authorA, {}, store);

    await expect(
      attachMainImage(authorA, created.id, `${userB.userId}/${created.id}/main.jpg`, store),
    ).rejects.toBeInstanceOf(DraftValidationError);
    expect(store.drafts.get(created.id)?.mainImagePath).toBeNull();
  });
});
