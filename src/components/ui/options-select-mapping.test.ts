import { describe, expect, it } from "vitest";

import {
  EMPTY_OPTION_SENTINEL,
  fromRadixValue,
  isUnsetValue,
  mapOptionsForRadix,
  radixItemValues,
  toRadixValue,
} from "@/components/ui/options-select-mapping";

describe("options-select-mapping", () => {
  it("treats empty string and undefined as unset", () => {
    expect(isUnsetValue("")).toBe(true);
    expect(isUnsetValue(undefined)).toBe(true);
    expect(isUnsetValue("automatic")).toBe(false);
  });

  it("maps unset values to undefined for Radix", () => {
    expect(toRadixValue("")).toBeUndefined();
    expect(toRadixValue(undefined)).toBeUndefined();
    expect(toRadixValue("manual")).toBe("manual");
  });

  it("maps empty options to a sentinel and never emits empty item values", () => {
    const options = [
      { value: "", label: "Not set" },
      { value: "automatic", label: "Automatic" },
    ];

    expect(mapOptionsForRadix(options)).toEqual([
      { value: EMPTY_OPTION_SENTINEL, label: "Not set" },
      { value: "automatic", label: "Automatic" },
    ]);
    expect(radixItemValues(options)).not.toContain("");
  });

  it("maps the sentinel back to an empty string", () => {
    expect(fromRadixValue(EMPTY_OPTION_SENTINEL)).toBe("");
    expect(fromRadixValue("manual")).toBe("manual");
  });
});
