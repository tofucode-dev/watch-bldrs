const MAIN_IMAGE_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/main\.(jpg|png|webp)$/i;

export function isMainImageStoragePath(path: string): boolean {
  return MAIN_IMAGE_PATH_PATTERN.test(path);
}

export function isOwnedMainImagePath(path: string, authorId: string, buildId: string): boolean {
  if (!isMainImageStoragePath(path)) {
    return false;
  }
  const [pathAuthorId, pathBuildId] = path.split("/");
  return pathAuthorId.toLowerCase() === authorId.toLowerCase() && pathBuildId.toLowerCase() === buildId.toLowerCase();
}
