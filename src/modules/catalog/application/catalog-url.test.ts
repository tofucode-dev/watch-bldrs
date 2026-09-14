import { describe, expect, it } from "vitest";

import { buildCatalogListingHref } from "./catalog-url";

describe("buildCatalogListingHref", () => {
  it("emits filters in stable order before a cursor", () => {
    expect(
      buildCatalogListingHref(
        {
          case_size_mm: 40,
          strap_type: "steel_bracelet",
          dial_colour: "black",
          movement: "nh35",
          watch_style: "diver",
        },
        { kind: "after", cursor: "older" },
      ),
    ).toBe(
      "/builds?watch_style=diver&movement=nh35&dial_colour=black&strap_type=steel_bracelet&case_size_mm=40&after=older",
    );
  });

  it("omits inactive filters and returns the first page without a query", () => {
    expect(buildCatalogListingHref({ watch_style: "", movement: undefined }, { kind: "first" })).toBe("/builds");
  });

  it("builds before links after the active filters", () => {
    expect(buildCatalogListingHref({ movement: "nh35" }, { kind: "before", cursor: "newer" })).toBe(
      "/builds?movement=nh35&before=newer",
    );
  });
});
