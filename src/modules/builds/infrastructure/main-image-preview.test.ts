import { describe, expect, it, vi } from "vitest";

import { MAIN_IMAGE_SIGNED_URL_TTL_SECONDS, previewUrlForOwnedMainImagePath } from "./main-image-preview";

const STORAGE_PATH = "11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/main.jpg";
const SIGNED_URL = "https://example.supabase.co/storage/v1/object/sign/build-images/main.jpg?token=abc";

describe("previewUrlForOwnedMainImagePath", () => {
  it("does not sign when the draft has no path", async () => {
    const createSignedUrl = vi.fn();

    await expect(previewUrlForOwnedMainImagePath(null, createSignedUrl)).resolves.toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("returns the signer URL and never treats it as the storage path", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue(SIGNED_URL);

    const previewUrl = await previewUrlForOwnedMainImagePath(STORAGE_PATH, createSignedUrl);

    expect(previewUrl).toBe(SIGNED_URL);
    expect(previewUrl).not.toBe(STORAGE_PATH);
    expect(createSignedUrl).toHaveBeenCalledWith(STORAGE_PATH, MAIN_IMAGE_SIGNED_URL_TTL_SECONDS);
  });

  it("returns null when signing fails", async () => {
    const createSignedUrl = vi.fn().mockRejectedValue(new Error("storage"));

    await expect(previewUrlForOwnedMainImagePath(STORAGE_PATH, createSignedUrl)).resolves.toBeNull();
  });
});
