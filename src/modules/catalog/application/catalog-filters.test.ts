import { describe, expect, it } from "vitest";

import { InvalidCatalogFilterError } from "../domain/errors";
import { hasActiveCatalogFilters, parseCatalogFilterParams } from "./catalog-filters";

describe("catalog filters", () => {
  it("parses all supported filters", () => {
    expect(
      parseCatalogFilterParams(
        new URLSearchParams({
          watch_style: "diver",
          movement: "nh35",
          dial_colour: "black",
          strap_type: "steel_bracelet",
          case_size_mm: "40",
        }),
      ),
    ).toEqual({
      watch_style: "diver",
      movement: "nh35",
      dial_colour: "black",
      strap_type: "steel_bracelet",
      case_size_mm: 40,
    });
  });

  it("treats absent and empty values as inactive", () => {
    const filters = parseCatalogFilterParams(
      new URLSearchParams({ watch_style: "", movement: "", dial_colour: "", strap_type: "", case_size_mm: "" }),
    );

    expect(filters).toEqual({});
    expect(hasActiveCatalogFilters(filters)).toBe(false);
  });

  it.each([
    ["watch_style", "unknown"],
    ["movement", "unknown"],
    ["dial_colour", "unknown"],
    ["strap_type", "unknown"],
  ])("rejects an unknown %s value", (key, value) => {
    expect(() => parseCatalogFilterParams(new URLSearchParams({ [key]: value }))).toThrow(InvalidCatalogFilterError);
  });

  it.each(["19", "71", "40.5", "not-a-number"])('rejects invalid case size "%s"', (value) => {
    expect(() => parseCatalogFilterParams(new URLSearchParams({ case_size_mm: value }))).toThrow(
      InvalidCatalogFilterError,
    );
  });

  it("accepts the inclusive case-size bounds", () => {
    expect(parseCatalogFilterParams(new URLSearchParams({ case_size_mm: "20" }))).toEqual({ case_size_mm: 20 });
    expect(parseCatalogFilterParams(new URLSearchParams({ case_size_mm: "70" }))).toEqual({ case_size_mm: 70 });
  });
});
