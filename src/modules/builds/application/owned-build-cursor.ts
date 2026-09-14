import { InvalidOwnedBuildCursorError } from "../domain/errors";
import type { OwnedBuildCursorPayload, OwnedBuildQueryDirection } from "./owned-build-types";

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
    throw new InvalidOwnedBuildCursorError();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidOwnedBuildCursorError();
  }

  return parsed.toISOString();
}

function parseCursorPayload(value: unknown): OwnedBuildCursorPayload {
  if (typeof value !== "object" || value === null) {
    throw new InvalidOwnedBuildCursorError();
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 2 || !keys.includes("updatedAt") || !keys.includes("id")) {
    throw new InvalidOwnedBuildCursorError();
  }

  const updatedAt = record.updatedAt;
  const id = record.id;

  if (typeof updatedAt !== "string" || typeof id !== "string") {
    throw new InvalidOwnedBuildCursorError();
  }

  if (!UUID_PATTERN.test(id)) {
    throw new InvalidOwnedBuildCursorError();
  }

  return { updatedAt: canonicalizeTimestamp(updatedAt), id };
}

export function encodeOwnedBuildCursor(payload: OwnedBuildCursorPayload): string {
  const json = JSON.stringify({
    updatedAt: canonicalizeTimestamp(payload.updatedAt),
    id: payload.id,
  });
  return bytesToBase64Url(new TextEncoder().encode(json));
}

export function decodeOwnedBuildCursor(encoded: string): OwnedBuildCursorPayload {
  if (encoded.trim() === "") {
    throw new InvalidOwnedBuildCursorError();
  }

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded));
    const parsed = JSON.parse(json) as unknown;
    return parseCursorPayload(parsed);
  } catch (error) {
    if (error instanceof InvalidOwnedBuildCursorError) {
      throw error;
    }
    throw new InvalidOwnedBuildCursorError();
  }
}

export interface OwnedBuildPaginationInput {
  direction: OwnedBuildQueryDirection;
  boundary: OwnedBuildCursorPayload | null;
}

export function parseOwnedBuildPaginationParams(searchParams: URLSearchParams): OwnedBuildPaginationInput {
  const before = searchParams.get("before");
  const after = searchParams.get("after");

  if (before !== null && after !== null) {
    throw new InvalidOwnedBuildCursorError("Owned build cursors cannot include both before and after");
  }

  if (after !== null) {
    return {
      direction: "after",
      boundary: decodeOwnedBuildCursor(after),
    };
  }

  if (before !== null) {
    return {
      direction: "before",
      boundary: decodeOwnedBuildCursor(before),
    };
  }

  return {
    direction: "first",
    boundary: null,
  };
}
