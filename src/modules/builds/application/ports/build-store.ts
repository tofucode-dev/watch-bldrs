import type { OwnedDraft, ValidatedDraft } from "../../domain/types";
import type { OwnedBuildCard, OwnedBuildCursorPayload, OwnedBuildQueryDirection } from "../owned-build-types";

export interface OwnedBuildListedItem {
  card: OwnedBuildCard;
  updatedAt: string;
}

export interface ListOwnedBuildsInput {
  direction: OwnedBuildQueryDirection;
  boundary: OwnedBuildCursorPayload | null;
  pageSize: number;
}

export interface ListOwnedBuildsResult {
  items: OwnedBuildListedItem[];
  hasMore: boolean;
}

export interface BuildStore {
  saveDraft(input: { id: string | null; authorId: string; draft: ValidatedDraft }): Promise<{ id: string } | null>;
  getOwnedDraft(authorId: string, id: string): Promise<OwnedDraft | null>;
  attachMainImage(authorId: string, id: string, path: string | null): Promise<{ id: string } | null>;
  publishBuild(authorId: string, id: string): Promise<{ id: string } | null>;
  listOwnedBuilds(authorId: string, input: ListOwnedBuildsInput): Promise<ListOwnedBuildsResult>;
  deleteBuild(authorId: string, id: string): Promise<void>;
}
