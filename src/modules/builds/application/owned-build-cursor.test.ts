import { describe, expect, it } from "vitest";

import { InvalidOwnedBuildCursorError } from "../domain/errors";
import { decodeOwnedBuildCursor, encodeOwnedBuildCursor, parseOwnedBuildPaginationParams } from "./owned-build-cursor";

const VALID_PAYLOAD = {
  updatedAt: "2026-09-14T10:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
};

describe("owned build cursor", () => {
  it("round-trips a valid cursor payload", () => {
    const encoded = encodeOwnedBuildCursor(VALID_PAYLOAD);
    expect(decodeOwnedBuildCursor(encoded)).toEqual(VALID_PAYLOAD);
  });

  it("rejects malformed base64 payloads", () => {
    expect(() => decodeOwnedBuildCursor("not-valid!!!")).toThrow(InvalidOwnedBuildCursorError);
  });

  it("rejects partial payloads missing tuple members", () => {
    const partial = encodeOwnedBuildCursor(VALID_PAYLOAD).slice(0, 8);
    expect(() => decodeOwnedBuildCursor(partial)).toThrow(InvalidOwnedBuildCursorError);
  });

  it("rejects non-uuid ids", () => {
    const encoded = btoa(JSON.stringify({ updatedAt: VALID_PAYLOAD.updatedAt, id: "not-a-uuid" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    expect(() => decodeOwnedBuildCursor(encoded)).toThrow(InvalidOwnedBuildCursorError);
  });

  it("rejects invalid updated_at timestamps", () => {
    const encoded = btoa(JSON.stringify({ updatedAt: "not-a-date", id: VALID_PAYLOAD.id }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    expect(() => decodeOwnedBuildCursor(encoded)).toThrow(InvalidOwnedBuildCursorError);
  });

  it("rejects Date.parse-valid timestamps that are not ISO-8601", () => {
    const encoded = btoa(JSON.stringify({ updatedAt: "January 1, 2020", id: VALID_PAYLOAD.id }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    expect(() => decodeOwnedBuildCursor(encoded)).toThrow(InvalidOwnedBuildCursorError);
  });

  it("canonicalizes offset timestamps to UTC ISO-8601", () => {
    const encoded = encodeOwnedBuildCursor({
      updatedAt: "2026-09-14T10:00:00+00:00",
      id: VALID_PAYLOAD.id,
    });
    expect(decodeOwnedBuildCursor(encoded)).toEqual(VALID_PAYLOAD);
  });

  it("rejects extra tuple members", () => {
    const encoded = btoa(
      JSON.stringify({
        updatedAt: VALID_PAYLOAD.updatedAt,
        id: VALID_PAYLOAD.id,
        extra: "value",
      }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    expect(() => decodeOwnedBuildCursor(encoded)).toThrow(InvalidOwnedBuildCursorError);
  });

  it("rejects simultaneous before and after params", () => {
    const cursor = encodeOwnedBuildCursor(VALID_PAYLOAD);
    expect(() => parseOwnedBuildPaginationParams(new URLSearchParams({ before: cursor, after: cursor }))).toThrow(
      InvalidOwnedBuildCursorError,
    );
  });

  it("parses mutually exclusive after and before params", () => {
    const cursor = encodeOwnedBuildCursor(VALID_PAYLOAD);

    expect(parseOwnedBuildPaginationParams(new URLSearchParams({ after: cursor }))).toEqual({
      direction: "after",
      boundary: VALID_PAYLOAD,
    });
    expect(parseOwnedBuildPaginationParams(new URLSearchParams({ before: cursor }))).toEqual({
      direction: "before",
      boundary: VALID_PAYLOAD,
    });
    expect(parseOwnedBuildPaginationParams(new URLSearchParams())).toEqual({
      direction: "first",
      boundary: null,
    });
  });
});
