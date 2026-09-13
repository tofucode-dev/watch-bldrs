export const MAIN_IMAGE_SIGNED_URL_TTL_SECONDS = 900;

export async function previewUrlForOwnedMainImagePath(
  path: string | null,
  createSignedUrl: (path: string, expiresIn: number) => Promise<string | null>,
): Promise<string | null> {
  if (path === null || path === "") {
    return null;
  }

  try {
    return await createSignedUrl(path, MAIN_IMAGE_SIGNED_URL_TTL_SECONDS);
  } catch {
    return null;
  }
}
