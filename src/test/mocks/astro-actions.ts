import { vi } from "vitest";

export const actions = {
  builds: {
    createDraft: vi.fn(),
    update: vi.fn(),
    attachMainImage: vi.fn(),
  },
};
