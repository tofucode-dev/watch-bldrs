import { describe, expect, it } from "vitest";

import { safeRedirect } from "./safe-redirect";

const ORIGIN = "https://watch-bldrs.example";

describe("safeRedirect", () => {
  it("keeps a same-origin dashboard path", () => {
    expect(safeRedirect("/dashboard/builds/new", ORIGIN)).toBe("/dashboard/builds/new");
  });

  it("keeps a query string on a relative path", () => {
    expect(safeRedirect("/dashboard/builds/new?from=dash", ORIGIN)).toBe("/dashboard/builds/new?from=dash");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeRedirect("//evil.example", ORIGIN)).toBe("/");
  });

  it("rejects backslash protocol-relative shapes", () => {
    expect(safeRedirect("/\\evil.example", ORIGIN)).toBe("/");
  });

  it("rejects absolute external URLs", () => {
    expect(safeRedirect("https://evil.example", ORIGIN)).toBe("/");
  });

  it("rejects control characters and whitespace", () => {
    expect(safeRedirect("/\r\n/evil", ORIGIN)).toBe("/");
    expect(safeRedirect("/ account", ORIGIN)).toBe("/");
  });

  it("defaults empty or missing values to home", () => {
    expect(safeRedirect("", ORIGIN)).toBe("/");
    expect(safeRedirect(null, ORIGIN)).toBe("/");
  });
});
