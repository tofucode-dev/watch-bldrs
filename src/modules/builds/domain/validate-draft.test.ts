import { describe, expect, it } from "vitest";

import { DraftValidationError } from "./errors";
import { validateDraftInput } from "./validate-draft";

describe("validateDraftInput", () => {
  it("accepts an empty draft", () => {
    expect(validateDraftInput({})).toEqual({
      name: null,
      story: null,
      watchStyle: null,
      movement: null,
      dialColour: null,
      strapType: null,
      handsStyle: null,
      caseSizeMm: null,
      parts: [],
    });
  });

  it("rejects names longer than 120 characters", () => {
    expect(() => validateDraftInput({ name: "a".repeat(121) })).toThrow(DraftValidationError);
    try {
      validateDraftInput({ name: "a".repeat(121) });
    } catch (error) {
      expect(error).toBeInstanceOf(DraftValidationError);
      expect((error as DraftValidationError).fields.name).toMatch(/120/);
    }
  });

  it("rejects stories longer than 4000 characters", () => {
    try {
      validateDraftInput({ story: "s".repeat(4001) });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DraftValidationError);
      expect((error as DraftValidationError).fields.story).toMatch(/4000/);
    }
  });

  it("accepts case size bounds of 20 and 70 and rejects 19 and 71", () => {
    expect(validateDraftInput({ caseSizeMm: 20 }).caseSizeMm).toBe(20);
    expect(validateDraftInput({ caseSizeMm: 70 }).caseSizeMm).toBe(70);

    expect(() => validateDraftInput({ caseSizeMm: 19 })).toThrow(DraftValidationError);
    expect(() => validateDraftInput({ caseSizeMm: 71 })).toThrow(DraftValidationError);
    expect(() => validateDraftInput({ caseSizeMm: 40.5 })).toThrow(DraftValidationError);
  });

  it("accepts http and https product URLs and rejects other schemes", () => {
    const httpsPart = {
      category: "case",
      name: "SKX case",
      productUrl: "https://example.com/case",
    };
    const httpPart = {
      category: "dial",
      name: "Dial",
      productUrl: "http://example.com/dial",
    };

    expect(validateDraftInput({ parts: [httpsPart, httpPart] }).parts).toHaveLength(2);
    expect(() =>
      validateDraftInput({
        parts: [{ category: "case", name: "Case", productUrl: "ftp://example.com/case" }],
      }),
    ).toThrow(DraftValidationError);
    expect(() =>
      validateDraftInput({
        parts: [{ category: "case", name: "Case", productUrl: "javascript:alert(1)" }],
      }),
    ).toThrow(DraftValidationError);
  });

  it("requires price and currency together", () => {
    expect(() =>
      validateDraftInput({
        parts: [{ category: "case", name: "Case", priceAmountMinor: 1000 }],
      }),
    ).toThrow(DraftValidationError);

    expect(() =>
      validateDraftInput({
        parts: [{ category: "case", name: "Case", currency: "USD" }],
      }),
    ).toThrow(DraftValidationError);

    expect(
      validateDraftInput({
        parts: [{ category: "case", name: "Case", priceAmountMinor: 0, currency: "USD" }],
      }).parts[0],
    ).toMatchObject({ priceAmountMinor: 0, currency: "USD" });

    expect(() =>
      validateDraftInput({
        parts: [{ category: "case", name: "Case", priceAmountMinor: -1, currency: "USD" }],
      }),
    ).toThrow(DraftValidationError);
  });

  it("drops blank part rows and requires category plus name on started rows", () => {
    const result = validateDraftInput({
      parts: [{}, { category: "", name: "  ", productUrl: "" }, { category: "case", name: "Case" }],
    });
    expect(result.parts).toEqual([
      {
        category: "case",
        name: "Case",
        productUrl: null,
        priceAmountMinor: null,
        currency: null,
        position: 0,
      },
    ]);

    expect(() => validateDraftInput({ parts: [{ name: "Only name" }] })).toThrow(DraftValidationError);
    expect(() => validateDraftInput({ parts: [{ category: "case" }] })).toThrow(DraftValidationError);
  });

  it("rejects values outside the enum and currency allowlists", () => {
    expect(() => validateDraftInput({ watchStyle: "chrono" })).toThrow(DraftValidationError);
    expect(() => validateDraftInput({ movement: "eta2824" })).toThrow(DraftValidationError);
    expect(() =>
      validateDraftInput({
        parts: [{ category: "rotor", name: "Rotor" }],
      }),
    ).toThrow(DraftValidationError);
    expect(() =>
      validateDraftInput({
        parts: [{ category: "case", name: "Case", priceAmountMinor: 100, currency: "XYZ" }],
      }),
    ).toThrow(DraftValidationError);

    expect(
      validateDraftInput({
        watchStyle: "diver",
        movement: "nh35",
        parts: [{ category: "case", name: "Case", priceAmountMinor: 19900, currency: "PLN" }],
      }).parts[0]?.currency,
    ).toBe("PLN");
  });
});
