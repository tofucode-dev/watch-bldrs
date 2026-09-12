import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MainImageUploadError, uploadMainImage } from "@/lib/upload-main-image";

function imageFile(bytes: number[], name: string, type: string): File {
  const payload = new ArrayBuffer(bytes.length);
  new Uint8Array(payload).set(bytes);
  return new File([payload], name, { type });
}

const webpHeader = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function createStorageMock() {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const remove = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn(() => ({
    upload,
    remove,
  }));

  return { from, upload, remove };
}

function createClient(storage: ReturnType<typeof createStorageMock>): SupabaseClient {
  return { storage } as unknown as SupabaseClient;
}

describe("uploadMainImage", () => {
  const authorId = "author-a";
  const buildId = "build-b";
  const webpFile = imageFile(webpHeader, "main.webp", "image/webp");
  const pngFile = imageFile(pngHeader, "main.png", "image/png");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a storage path and never a URL", async () => {
    const storage = createStorageMock();
    const client = createClient(storage);

    const result = await uploadMainImage({
      client,
      file: webpFile,
      authorId,
      buildId,
    });

    expect(result).toEqual({ path: "author-a/build-b/main.webp" });
    expect(result.path).not.toMatch(/^https?:\/\//);
    expect(storage.upload).toHaveBeenCalledWith("author-a/build-b/main.webp", webpFile, {
      contentType: "image/webp",
      upsert: true,
    });
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("throws a validation error before Storage is called", async () => {
    const storage = createStorageMock();
    const client = createClient(storage);
    const invalidFile = imageFile([0x00, 0x01], "bad.bin", "text/plain");

    await expect(
      uploadMainImage({
        client,
        file: invalidFile,
        authorId,
        buildId,
      }),
    ).rejects.toMatchObject({ name: "MainImageUploadError", code: "validation" });

    expect(storage.from).not.toHaveBeenCalled();
  });

  it("throws a validation error when ids would escape the storage folder", async () => {
    const storage = createStorageMock();
    const client = createClient(storage);

    await expect(
      uploadMainImage({
        client,
        file: webpFile,
        authorId: "a/b",
        buildId,
      }),
    ).rejects.toMatchObject({ name: "MainImageUploadError", code: "validation" });

    expect(storage.from).not.toHaveBeenCalled();
  });

  it("throws a storage error and does not delete the previous key", async () => {
    const storage = createStorageMock();
    storage.upload.mockResolvedValueOnce({ error: { message: "upload failed" } });
    const client = createClient(storage);

    await expect(
      uploadMainImage({
        client,
        file: webpFile,
        authorId,
        buildId,
        previousPath: "author-a/build-b/main.png",
      }),
    ).rejects.toMatchObject({ name: "MainImageUploadError", code: "storage" });

    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("upserts only when the previous path has the same extension", async () => {
    const storage = createStorageMock();
    const client = createClient(storage);

    await uploadMainImage({
      client,
      file: webpFile,
      authorId,
      buildId,
      previousPath: "author-a/build-b/main.webp",
    });

    expect(storage.upload).toHaveBeenCalledOnce();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("uploads the new extension before deleting the previous key", async () => {
    const storage = createStorageMock();
    const client = createClient(storage);

    await uploadMainImage({
      client,
      file: pngFile,
      authorId,
      buildId,
      previousPath: "author-a/build-b/main.webp",
    });

    expect(storage.upload).toHaveBeenCalledBefore(storage.remove);
    expect(storage.remove).toHaveBeenCalledWith(["author-a/build-b/main.webp"]);
  });

  it("returns the new path even when deleting the previous key fails", async () => {
    const storage = createStorageMock();
    storage.remove.mockResolvedValueOnce({ error: { message: "remove failed" } });
    const client = createClient(storage);

    await expect(
      uploadMainImage({
        client,
        file: pngFile,
        authorId,
        buildId,
        previousPath: "author-a/build-b/main.webp",
      }),
    ).resolves.toEqual({ path: "author-a/build-b/main.png" });
  });

  it("returns the new path even when deleting the previous key throws", async () => {
    const storage = createStorageMock();
    storage.remove.mockRejectedValueOnce(new Error("network"));
    const client = createClient(storage);

    await expect(
      uploadMainImage({
        client,
        file: pngFile,
        authorId,
        buildId,
        previousPath: "author-a/build-b/main.webp",
      }),
    ).resolves.toEqual({ path: "author-a/build-b/main.png" });
  });

  it("maps a thrown upload failure to a storage error and does not delete", async () => {
    const storage = createStorageMock();
    storage.upload.mockRejectedValueOnce(new Error("network"));
    const client = createClient(storage);

    await expect(
      uploadMainImage({
        client,
        file: webpFile,
        authorId,
        buildId,
        previousPath: "author-a/build-b/main.png",
      }),
    ).rejects.toMatchObject({ name: "MainImageUploadError", code: "storage" });

    expect(storage.remove).not.toHaveBeenCalled();
  });
});

describe("MainImageUploadError", () => {
  it("exposes validation and storage codes", () => {
    expect(new MainImageUploadError("validation").code).toBe("validation");
    expect(new MainImageUploadError("storage").code).toBe("storage");
  });
});
