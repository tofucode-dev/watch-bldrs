import type { OwnedDraft, ValidatedDraft } from "../../domain/types";

export interface BuildStore {
  saveDraft(input: { id: string | null; authorId: string; draft: ValidatedDraft }): Promise<{ id: string } | null>;
  getOwnedDraft(authorId: string, id: string): Promise<OwnedDraft | null>;
  attachMainImage(authorId: string, id: string, path: string | null): Promise<{ id: string } | null>;
}
