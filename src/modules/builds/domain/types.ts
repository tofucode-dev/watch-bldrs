import type { CurrencyCode, DialColour, HandsStyle, Movement, PartCategory, StrapType, WatchStyle } from "./options";

export interface DraftPartInput {
  category?: string | null;
  name?: string | null;
  productUrl?: string | null;
  priceAmountMinor?: number | null;
  currency?: string | null;
}

export interface DraftBuildInput {
  name?: string | null;
  story?: string | null;
  watchStyle?: string | null;
  movement?: string | null;
  dialColour?: string | null;
  strapType?: string | null;
  handsStyle?: string | null;
  caseSizeMm?: number | null;
  parts?: DraftPartInput[];
}

export interface ValidatedPart {
  category: PartCategory;
  name: string;
  productUrl: string | null;
  priceAmountMinor: number | null;
  currency: CurrencyCode | null;
  position: number;
}

export interface ValidatedDraft {
  name: string | null;
  story: string | null;
  watchStyle: WatchStyle | null;
  movement: Movement | null;
  dialColour: DialColour | null;
  strapType: StrapType | null;
  handsStyle: HandsStyle | null;
  caseSizeMm: number | null;
  parts: ValidatedPart[];
}

export interface OwnedDraftPart {
  category: PartCategory;
  name: string;
  productUrl: string | null;
  priceAmountMinor: number | null;
  currency: CurrencyCode | null;
  position: number;
}

export interface OwnedDraft {
  id: string;
  name: string | null;
  story: string | null;
  watchStyle: WatchStyle | null;
  movement: Movement | null;
  dialColour: DialColour | null;
  strapType: StrapType | null;
  handsStyle: HandsStyle | null;
  caseSizeMm: number | null;
  mainImagePath: string | null;
  mainImageUrl: string | null;
  parts: OwnedDraftPart[];
}
