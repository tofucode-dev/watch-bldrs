import type { SupabaseClient } from "@supabase/supabase-js";

import { MAIN_IMAGE_EXT_BY_MIME, buildMainImagePath, validateMainImageFile } from "@/lib/main-image-file";

export class MainImageUploadError extends Error {
  readonly code: "validation" | "storage";

  constructor(code: "validation" | "storage") {
    super(code === "validation" ? "Invalid main image file" : "Failed to upload main image");
    this.name = "MainImageUploadError";
    this.code = code;
  }
}

export interface UploadMainImageParams {
  client: SupabaseClient;
  file: File;
  authorId: string;
  buildId: string;
  previousPath?: string;
}

export async function uploadMainImage({
  client,
  file,
  authorId,
  buildId,
  previousPath,
}: UploadMainImageParams): Promise<{ path: string }> {
  const validation = await validateMainImageFile(file);
  if (!validation.ok) {
    throw new MainImageUploadError("validation");
  }

  const path = buildMainImagePath(authorId, buildId, MAIN_IMAGE_EXT_BY_MIME[validation.mime]);

  const { error: uploadError } = await client.storage.from("build-images").upload(path, file, {
    contentType: validation.mime,
    upsert: true,
  });

  if (uploadError) {
    throw new MainImageUploadError("storage");
  }

  if (previousPath !== undefined && previousPath !== path) {
    await client.storage.from("build-images").remove([previousPath]);
  }

  return { path };
}
