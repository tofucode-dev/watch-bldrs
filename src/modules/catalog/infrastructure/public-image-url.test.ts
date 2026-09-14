import { describe, expect, it, vi } from "vitest";

import { CATALOG_IMAGE_SIGNED_URL_TTL_SECONDS, publicImageUrlForPath } from "./public-image-url";

const STORAGE_PATH = "11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/main.jpg";
const SIGNED_URL = "https://example.supabase.co/storage/v1/object/sign/build-images/main.jpg?token=abc";

describe("publicImageUrlForPath", () => {
  it("skips signing for empty paths", async () => {
    const createSignedUrl = vi.fn();
    await expect(publicImageUrlForPath(null, createSignedUrl)).resolves.toBeNull();
    await expect(publicImageUrlForPath("", createSignedUrl)).resolves.toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("returns a signed URL and never the raw storage path", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue(SIGNED_URL);
    const url = await publicImageUrlForPath(STORAGE_PATH, createSignedUrl);
    expect(url).toBe(SIGNED_URL);
    expect(url).not.toBe(STORAGE_PATH);
    expect(createSignedUrl).toHaveBeenCalledWith(STORAGE_PATH, CATALOG_IMAGE_SIGNED_URL_TTL_SECONDS);
  });

  it("returns null when signing fails or throws", async () => {
    await expect(publicImageUrlForPath(STORAGE_PATH, vi.fn().mockResolvedValue(null))).resolves.toBeNull();
    await expect(
      publicImageUrlForPath(STORAGE_PATH, vi.fn().mockRejectedValue(new Error("storage"))),
    ).resolves.toBeNull();
  });

  it("returns null when signer echoes the storage path", async () => {
    await expect(publicImageUrlForPath(STORAGE_PATH, vi.fn().mockResolvedValue(STORAGE_PATH))).resolves.toBeNull();
  });
});
