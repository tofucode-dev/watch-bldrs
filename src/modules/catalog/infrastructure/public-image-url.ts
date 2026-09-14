export const CATALOG_IMAGE_SIGNED_URL_TTL_SECONDS = 900;

export async function publicImageUrlForPath(
  path: string | null,
  createSignedUrl: (path: string, expiresIn: number) => Promise<string | null>,
): Promise<string | null> {
  if (path === null || path === "") {
    return null;
  }

  try {
    const signedUrl = await createSignedUrl(path, CATALOG_IMAGE_SIGNED_URL_TTL_SECONDS);
    if (signedUrl === null || signedUrl === path) {
      return null;
    }
    return signedUrl;
  } catch {
    return null;
  }
}
