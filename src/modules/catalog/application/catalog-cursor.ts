import { InvalidCatalogCursorError } from "../domain/errors";
import type { CatalogCursorPayload, CatalogQueryDirection } from "./catalog-types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_TIMESTAMPTZ_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function canonicalizeTimestamp(value: string): string {
  if (!ISO_TIMESTAMPTZ_PATTERN.test(value)) {
    throw new InvalidCatalogCursorError();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidCatalogCursorError();
  }

  return parsed.toISOString();
}

function parseCursorPayload(value: unknown): CatalogCursorPayload {
  if (typeof value !== "object" || value === null) {
    throw new InvalidCatalogCursorError();
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 2 || !keys.includes("publishedAt") || !keys.includes("id")) {
    throw new InvalidCatalogCursorError();
  }

  const publishedAt = record.publishedAt;
  const id = record.id;

  if (typeof publishedAt !== "string" || typeof id !== "string") {
    throw new InvalidCatalogCursorError();
  }

  if (!UUID_PATTERN.test(id)) {
    throw new InvalidCatalogCursorError();
  }

  return { publishedAt: canonicalizeTimestamp(publishedAt), id };
}

export function encodeCatalogCursor(payload: CatalogCursorPayload): string {
  const json = JSON.stringify({
    publishedAt: canonicalizeTimestamp(payload.publishedAt),
    id: payload.id,
  });
  return bytesToBase64Url(new TextEncoder().encode(json));
}

export function decodeCatalogCursor(encoded: string): CatalogCursorPayload {
  if (encoded.trim() === "") {
    throw new InvalidCatalogCursorError();
  }

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded));
    const parsed = JSON.parse(json) as unknown;
    return parseCursorPayload(parsed);
  } catch (error) {
    if (error instanceof InvalidCatalogCursorError) {
      throw error;
    }
    throw new InvalidCatalogCursorError();
  }
}

export interface CatalogPaginationInput {
  direction: CatalogQueryDirection;
  boundary: CatalogCursorPayload | null;
}

export function parseCatalogPaginationParams(searchParams: URLSearchParams): CatalogPaginationInput {
  const before = searchParams.get("before");
  const after = searchParams.get("after");

  if (before !== null && after !== null) {
    throw new InvalidCatalogCursorError("Catalog cursors cannot include both before and after");
  }

  if (after !== null) {
    return {
      direction: "after",
      boundary: decodeCatalogCursor(after),
    };
  }

  if (before !== null) {
    return {
      direction: "before",
      boundary: decodeCatalogCursor(before),
    };
  }

  return {
    direction: "first",
    boundary: null,
  };
}
