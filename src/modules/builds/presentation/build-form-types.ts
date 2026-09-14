import type { OwnedDraft } from "../domain/types";
import type {
  CurrencyCode,
  DialColour,
  HandsStyle,
  Movement,
  PartCategory,
  StrapType,
  WatchStyle,
} from "../domain/options";

export interface BuildFormInitialPart {
  category: PartCategory;
  name: string;
  productUrl: string | null;
  priceAmountMinor: number | null;
  currency: CurrencyCode | null;
}

export interface BuildFormInitialDraft {
  id: string;
  status: "draft" | "published";
  name: string | null;
  story: string | null;
  watchStyle: WatchStyle | null;
  movement: Movement | null;
  dialColour: DialColour | null;
  strapType: StrapType | null;
  handsStyle: HandsStyle | null;
  caseSizeMm: number | null;
  mainImagePath?: string | null;
  mainImageUrl?: string | null;
  parts: BuildFormInitialPart[];
}

export function ownedDraftToFormInitial(draft: OwnedDraft): BuildFormInitialDraft {
  return {
    id: draft.id,
    status: draft.status,
    name: draft.name,
    story: draft.story,
    watchStyle: draft.watchStyle,
    movement: draft.movement,
    dialColour: draft.dialColour,
    strapType: draft.strapType,
    handsStyle: draft.handsStyle,
    caseSizeMm: draft.caseSizeMm,
    mainImagePath: draft.mainImagePath,
    mainImageUrl: draft.mainImageUrl,
    parts: draft.parts.map((part) => ({
      category: part.category,
      name: part.name,
      productUrl: part.productUrl,
      priceAmountMinor: part.priceAmountMinor,
      currency: part.currency,
    })),
  };
}
