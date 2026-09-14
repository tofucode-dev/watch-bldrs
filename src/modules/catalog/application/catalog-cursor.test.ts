import { describe, expect, it } from "vitest";

import { InvalidCatalogCursorError } from "../domain/errors";
import { decodeCatalogCursor, encodeCatalogCursor, parseCatalogPaginationParams } from "./catalog-cursor";

const VALID_PAYLOAD = {
  publishedAt: "2026-09-14T10:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
};

describe("catalog cursor", () => {
  it("round-trips a valid cursor payload", () => {
    const encoded = encodeCatalogCursor(VALID_PAYLOAD);
    expect(decodeCatalogCursor(encoded)).toEqual(VALID_PAYLOAD);
  });

  it("rejects malformed base64 payloads", () => {
    expect(() => decodeCatalogCursor("not-valid!!!")).toThrow(InvalidCatalogCursorError);
  });

  it("rejects partial payloads missing tuple members", () => {
    const partial = encodeCatalogCursor(VALID_PAYLOAD).slice(0, 8);
    expect(() => decodeCatalogCursor(partial)).toThrow(InvalidCatalogCursorError);
  });

  it("rejects non-uuid ids", () => {
    const encoded = btoa(JSON.stringify({ publishedAt: VALID_PAYLOAD.publishedAt, id: "not-a-uuid" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    expect(() => decodeCatalogCursor(encoded)).toThrow(InvalidCatalogCursorError);
  });

  it("rejects invalid publication timestamps", () => {
    const encoded = btoa(JSON.stringify({ publishedAt: "not-a-date", id: VALID_PAYLOAD.id }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    expect(() => decodeCatalogCursor(encoded)).toThrow(InvalidCatalogCursorError);
  });

  it("rejects extra tuple members", () => {
    const encoded = btoa(
      JSON.stringify({
        publishedAt: VALID_PAYLOAD.publishedAt,
        id: VALID_PAYLOAD.id,
        extra: "value",
      }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    expect(() => decodeCatalogCursor(encoded)).toThrow(InvalidCatalogCursorError);
  });

  it("rejects simultaneous before and after params", () => {
    const cursor = encodeCatalogCursor(VALID_PAYLOAD);
    expect(() => parseCatalogPaginationParams(new URLSearchParams({ before: cursor, after: cursor }))).toThrow(
      InvalidCatalogCursorError,
    );
  });

  it("parses mutually exclusive after and before params", () => {
    const cursor = encodeCatalogCursor(VALID_PAYLOAD);

    expect(parseCatalogPaginationParams(new URLSearchParams({ after: cursor }))).toEqual({
      direction: "after",
      boundary: VALID_PAYLOAD,
    });
    expect(parseCatalogPaginationParams(new URLSearchParams({ before: cursor }))).toEqual({
      direction: "before",
      boundary: VALID_PAYLOAD,
    });
    expect(parseCatalogPaginationParams(new URLSearchParams())).toEqual({
      direction: "first",
      boundary: null,
    });
  });
});
