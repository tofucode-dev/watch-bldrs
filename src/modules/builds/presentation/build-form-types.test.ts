import { describe, expect, it } from "vitest";

import type { OwnedDraft } from "../domain/types";
import { ownedDraftToFormInitial } from "./build-form-types";

describe("ownedDraftToFormInitial", () => {
  it("maps a signed display URL without storing it as the image path", () => {
    const path = "11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/main.jpg";
    const previewUrl = "https://example.supabase.co/storage/v1/object/sign/build-images/main.jpg?token=abc";
    const draft: OwnedDraft = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "SKX",
      story: null,
      watchStyle: null,
      movement: null,
      dialColour: null,
      strapType: null,
      handsStyle: null,
      caseSizeMm: null,
      mainImagePath: path,
      mainImageUrl: previewUrl,
      parts: [],
    };

    const initial = ownedDraftToFormInitial(draft);

    expect(initial.mainImagePath).toBe(path);
    expect(initial.mainImageUrl).toBe(previewUrl);
    expect(initial.mainImagePath).not.toBe(initial.mainImageUrl);
  });
});
