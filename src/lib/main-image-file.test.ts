import { describe, expect, it } from "vitest";

import { MAIN_IMAGE_MAX_BYTES, buildMainImagePath, validateMainImageFile } from "@/lib/main-image-file";

function imageFile(bytes: number[], name: string, type: string): File {
  const payload = new ArrayBuffer(bytes.length);
  new Uint8Array(payload).set(bytes);
  return new File([payload], name, { type });
}

const jpegHeader = [0xff, 0xd8, 0xff, 0xdb];
const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const webpHeader = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];

describe("validateMainImageFile", () => {
  it("accepts jpeg, png, and webp fixtures", async () => {
    await expect(validateMainImageFile(imageFile(jpegHeader, "main.jpg", "image/jpeg"))).resolves.toEqual({
      ok: true,
      mime: "image/jpeg",
    });
    await expect(validateMainImageFile(imageFile(pngHeader, "main.png", "image/png"))).resolves.toEqual({
      ok: true,
      mime: "image/png",
    });
    await expect(validateMainImageFile(imageFile(webpHeader, "main.webp", "image/webp"))).resolves.toEqual({
      ok: true,
      mime: "image/webp",
    });
  });

  it("accepts a matching signature when file.type is empty", async () => {
    await expect(validateMainImageFile(imageFile(jpegHeader, "main.jpg", ""))).resolves.toEqual({
      ok: true,
      mime: "image/jpeg",
    });
  });

  it("rejects an empty file", async () => {
    await expect(validateMainImageFile(new File([], "empty.jpg", { type: "image/jpeg" }))).resolves.toEqual({
      ok: false,
      reason: "empty",
    });
  });

  it("rejects a file one byte over 5 MiB without reading the whole image as a signature", async () => {
    const oversizePayload = new ArrayBuffer(MAIN_IMAGE_MAX_BYTES + 1);
    const oversize = new File([oversizePayload], "big.jpg", { type: "image/jpeg" });

    await expect(validateMainImageFile(oversize)).resolves.toEqual({ ok: false, reason: "oversize" });
  });

  it("rejects image/jpeg declared type with PNG bytes", async () => {
    await expect(validateMainImageFile(imageFile(pngHeader, "spoof.jpg", "image/jpeg"))).resolves.toEqual({
      ok: false,
      reason: "type",
    });
  });

  it("rejects text/plain", async () => {
    await expect(validateMainImageFile(imageFile([0x68, 0x69], "note.txt", "text/plain"))).resolves.toEqual({
      ok: false,
      reason: "type",
    });
  });

  it("rejects bytes that are not a jpeg, png, or webp signature", async () => {
    await expect(validateMainImageFile(imageFile([0x00, 0x01, 0x02, 0x03], "main.bin", ""))).resolves.toEqual({
      ok: false,
      reason: "signature",
    });
  });
});

describe("buildMainImagePath", () => {
  it("returns {authorId}/{buildId}/main.{jpg|png|webp}", () => {
    expect(buildMainImagePath("author-a", "build-b", "jpg")).toBe("author-a/build-b/main.jpg");
    expect(buildMainImagePath("author-a", "build-b", "png")).toBe("author-a/build-b/main.png");
    expect(buildMainImagePath("author-a", "build-b", "webp")).toBe("author-a/build-b/main.webp");
  });

  it("rejects ids that would escape the author/build folder", () => {
    expect(() => buildMainImagePath("a/b", "build-b", "jpg")).toThrow("Invalid main image path segment");
    expect(() => buildMainImagePath("author-a", "..", "jpg")).toThrow("Invalid main image path segment");
    expect(() => buildMainImagePath("author-a", "b\\c", "png")).toThrow("Invalid main image path segment");
  });
});
