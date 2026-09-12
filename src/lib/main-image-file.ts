export const MAIN_IMAGE_MAX_BYTES = 5_242_880;

export const MAIN_IMAGE_ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

export type MainImageMime = (typeof MAIN_IMAGE_ALLOWED_MIMES)[number];

export type MainImageExt = "jpg" | "png" | "webp";

export type MainImageValidationReason = "empty" | "oversize" | "type" | "signature";

export type MainImageValidationResult =
  { ok: true; mime: MainImageMime } | { ok: false; reason: MainImageValidationReason };

export const MAIN_IMAGE_EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const satisfies Record<MainImageMime, MainImageExt>;

const HEADER_BYTES = 12;

const ALLOWED_MIME_SET = new Set<string>(MAIN_IMAGE_ALLOWED_MIMES);

function isAllowedMime(value: string): value is MainImageMime {
  return ALLOWED_MIME_SET.has(value);
}

function detectMimeFromSignature(bytes: Uint8Array): MainImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function validateMainImageFile(file: File): Promise<MainImageValidationResult> {
  if (file.size === 0) {
    return { ok: false, reason: "empty" };
  }

  if (file.size > MAIN_IMAGE_MAX_BYTES) {
    return { ok: false, reason: "oversize" };
  }

  const declaredType = file.type;
  if (declaredType !== "" && !isAllowedMime(declaredType)) {
    return { ok: false, reason: "type" };
  }

  const header = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
  const mime = detectMimeFromSignature(header);
  if (mime === null) {
    return { ok: false, reason: "signature" };
  }

  if (declaredType !== "" && declaredType !== mime) {
    return { ok: false, reason: "type" };
  }

  return { ok: true, mime };
}

export function buildMainImagePath(authorId: string, buildId: string, ext: MainImageExt): string {
  return `${authorId}/${buildId}/main.${ext}`;
}
